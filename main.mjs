// main.mjs（Web Service 版：Expressで /health を公開）
import fs from "fs";
import path from "path";
import express from "express";
import { Client, Collection, Events, GatewayIntentBits, ActivityType } from "discord.js";
import CommandsRegister from "./regist-commands.mjs";

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

client.commands = new Collection();

// ==== commands（直下 *.mjs だけ読む簡易ローダー／サブフォルダは regist-commands 側で解決）====
const commandsDir = path.join(process.cwd(), "commands");
if (fs.existsSync(commandsDir)) {
  const files = fs.readdirSync(commandsDir).filter(f => f.endsWith(".mjs"));
  for (const file of files) {
    const filePath = path.join(commandsDir, file);
    const mod = await import(filePath);
    if (mod?.data?.name) client.commands.set(mod.data.name, mod);
  }
}

// ==== handlers ====
const handlers = new Map();
const handlersDir = path.join(process.cwd(), "handlers");
if (fs.existsSync(handlersDir)) {
  const files = fs.readdirSync(handlersDir).filter(f => f.endsWith(".mjs"));
  for (const file of files) {
    const filePath = path.join(handlersDir, file);
    const mod = await import(filePath);
    handlers.set(file.replace(/\.mjs$/, ""), mod);
  }
}

// ==== イベント ====
client.on(Events.InteractionCreate, async (interaction) => {
  const h = handlers.get("interactionCreate");
  if (h?.default) await h.default(interaction, client);
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  if (message.author.id === client.user?.id) return;
  const h = handlers.get("messageCreate");
  if (h?.default) await h.default(message, client);
});

client.once(Events.ClientReady, async () => {
  try { await client.user.setActivity("🔫疑似ブキチ杯 稼働中", { type: ActivityType.Custom }); } catch {}
  console.log(`✅ ${client.user.tag} がログインしました。`);
  try { await CommandsRegister(); } catch (e) { console.error("❌ コマンド登録エラー:", e); }
});

// エラー拾ってログに出す（任意：管理チャンネル通知にしてもOK）
process.on("unhandledRejection", (err) => console.error("UnhandledRejection:", err));
process.on("uncaughtException", (err) => console.error("UncaughtException:", err));

client.login(DISCORD_TOKEN).catch((e) => {
  console.error("❌ Discord ログイン失敗:", e);
  process.exit(1);
});
