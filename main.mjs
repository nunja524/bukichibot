// main.mjs（Background Worker向け / HTTP不要）
import fs from "fs";
import path from "path";
import { Client, Collection, Events, GatewayIntentBits, ActivityType } from "discord.js";
import CommandsRegister from "./regist-commands.mjs";

const { DISCORD_TOKEN } = process.env;
if (!DISCORD_TOKEN) {
  console.error("❌ ENV DISCORD_TOKEN が未設定です。Render の Environment に設定してください。");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.commands = new Collection();

// ==== commands の動的読み込み（直下 *.mjs とサブフォルダ両対応なら regist-commands.mjs 側でOK）====
const commandsDir = path.join(process.cwd(), "commands");
if (fs.existsSync(commandsDir)) {
  const files = fs.readdirSync(commandsDir).filter(f => f.endsWith(".mjs"));
  for (const file of files) {
    const filePath = path.join(commandsDir, file);
    const mod = await import(filePath);
    if (mod?.data?.name) client.commands.set(mod.data.name, mod);
  }
}

// ==== handlers 読み込み ====
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

client.login(DISCORD_TOKEN).catch((e) => {
  console.error("❌ Discord ログイン失敗:", e);
  process.exit(1);
});
