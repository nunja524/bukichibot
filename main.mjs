// main.mjs（Web Service 版：Expressで /health を公開 + コマンド再帰ロード + 直接実行）
import fs from "fs";
import path from "path";
import express from "express";
import { Client, Collection, Events, GatewayIntentBits, ActivityType } from "discord.js";
import registerCommands from "./regist-commands.mjs";

// ---- Web サーバ（Render: Web Service 用）----
const app = express();
const PORT = process.env.PORT || 3000;

// health エンドポイント（GAS から叩く先）
app.get("/health", (_req, res) => res.status(200).send("ok"));
// 任意：トップページ（動作確認用）
app.get("/", (_req, res) => res.status(200).send("Discord bot is running."));
app.listen(PORT, () => console.log(`HTTP server listening on :${PORT}`));

// ---- Discord Bot ----
const { DISCORD_TOKEN } = process.env;
if (!DISCORD_TOKEN) {
  console.error("❌ ENV DISCORD_TOKEN が未設定です。Render の Environment に設定してください。");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,          // スラッシュコマンド
    GatewayIntentBits.GuildMessages,   // メッセージ反応
    GatewayIntentBits.MessageContent,  // メッセージ本文（Developer PortalでON）
  ],
});

// ===== コマンドを再帰的に読み込み、client.commands に登録 =====
client.commands = new Collection();

function collectCommandFiles(dir) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...collectCommandFiles(p));
    else if (ent.isFile() && ent.name.endsWith(".mjs")) out.push(p);
  }
  return out;
}

const commandsRoot = path.join(process.cwd(), "commands");
if (fs.existsSync(commandsRoot)) {
  const files = collectCommandFiles(commandsRoot);
  for (const file of files) {
    try {
      const mod = await import(file);
      if (mod?.data?.name && typeof mod.execute === "function") {
        client.commands.set(mod.data.name, mod);
      } else {
        console.warn(`⚠️ コマンド定義が不正: ${path.relative(process.cwd(), file)}（data/execute を確認）`);
      }
    } catch (e) {
      console.error(`❌ コマンド読み込みエラー: ${path.relative(process.cwd(), file)}`, e);
    }
  }
  console.log(`✅ ロードしたコマンド: ${[...client.commands.keys()].join(", ") || "(なし)"}`);
} else {
  console.warn("⚠️ commands ディレクトリが見つかりません。");
}

// ===== handlers を読み込み（messageCreate など任意で）=====
const handlers = new Map();
const handlersDir = path.join(process.cwd(), "handlers");
if (fs.existsSync(handlersDir)) {
  const files = fs.readdirSync(handlersDir).filter(f => f.endsWith(".mjs"));
  for (const file of files) {
    try {
      const filePath = path.join(handlersDir, file);
      const mod = await import(filePath);
      handlers.set(file.replace(/\.mjs$/, ""), mod);
    } catch (e) {
      console.error(`❌ ハンドラ読み込みエラー: ${file}`, e);
    }
  }
}

// ==== イベント ====

// スラッシュコマンドは main.mjs で直接ディスパッチ
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const cmd = client.commands.get(interaction.commandName);
  if (!cmd) {
    // 未ロードの場合は無言でもいいが、原因追跡のためログ
    console.warn(`⚠️ 未ロードのコマンドが呼ばれました: ${interaction.commandName}`);
    // 応答超過エラー回避のため一応返す（静かにしたいならコメントアウト）
    try { await interaction.reply({ content: `「${interaction.commandName}」コマンドは見つかりませんでした。`, ephemeral: true }); } catch {}
    return;
  }

  try {
    await cmd.execute(interaction);
  } catch (e) {
    console.error(`❌ /${interaction.commandName} 実行エラー:`, e);
    const msg = "コマンド実行中にエラーが起きました。";
    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ content: msg, ephemeral: true });
      } else {
        await interaction.reply({ content: msg, ephemeral: true });
      }
    } catch {}
  }
});

// 旧来のメッセージ反応は必要に応じてハンドラに委譲
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  if (message.author.id === client.user?.id) return;
  const h = handlers.get("messageCreate");
  if (h?.default) {
    try { await h.default(message, client); }
    catch (e) { console.error("❌ messageCreate 実行エラー:", e); }
  }
});

client.once(Events.ClientReady, async () => {
  try { await client.user.setActivity("🔫疑似ブキチ杯 稼働中", { type: ActivityType.Custom }); } catch {}
  console.log(`✅ ${client.user.tag} がログインしました。`);
  // スラコマ登録（グローバル or ギルド：regist-commands.mjs の実装に依存）
  try { await registerCommands(); }
  catch (e) { console.error("❌ コマンド登録エラー:", e); }
});

// エラー拾ってログに出す（任意：管理チャンネル通知などへ拡張可）
process.on("unhandledRejection", (err) => console.error("UnhandledRejection:", err));
process.on("uncaughtException", (err) => console.error("UncaughtException:", err));

client.login(DISCORD_TOKEN).catch((e) => {
  console.error("❌ Discord ログイン失敗:", e);
  process.exit(1);
});
