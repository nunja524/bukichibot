import fs from "fs";
import path from "path";
import {
  Client, Collection, Events, GatewayIntentBits, ActivityType
} from "discord.js";
import CommandsRegister from "./regist-commands.mjs";

const PORT = process.env.PORT || 3000;

// Health（RenderのHealth Check Pathは /health に）
app.get("/health", (_req, res) => res.status(200).send("ok"));
app.listen(PORT, () => console.log(`HTTP health server on :${PORT}`));

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,            // スラッシュコマンド
    GatewayIntentBits.GuildMessages,     // 通常メッセージ
    GatewayIntentBits.MessageContent,    // メッセージ本文（Developer PortalでON）
    GatewayIntentBits.GuildVoiceStates   // 使わないなら削ってOK
  ],
});

client.commands = new Collection();

// ==== commands の動的読み込み（mjsのみ）====
const categoryFoldersPath = path.join(process.cwd(), "commands");
if (fs.existsSync(categoryFoldersPath)) {
  const commandFiles = fs.readdirSync(categoryFoldersPath).filter(f => f.endsWith(".mjs"));
  for (const file of commandFiles) {
    const filePath = path.join(categoryFoldersPath, file);
    const module = await import(filePath);
    if (module?.data?.name) client.commands.set(module.data.name, module);
  }
}

// ==== handlers の動的読み込み（mjsのみ）====
const handlers = new Map();
const handlersPath = path.join(process.cwd(), "handlers");
if (fs.existsSync(handlersPath)) {
  const handlerFiles = fs.readdirSync(handlersPath).filter(f => f.endsWith(".mjs"));
  for (const file of handlerFiles) {
    const filePath = path.join(handlersPath, file);
    const module = await import(filePath);
    handlers.set(file.replace(/\.mjs$/, ""), module);
  }
}

// イベント登録（存在チェック付き）
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
  await client.user.setActivity("🔫疑似ブキチ杯🔫稼働中", { type: ActivityType.Custom });
  console.log(`${client.user.tag} がログインしました！`);
  await CommandsRegister(); // スラコマ登録
});

client.login(process.env.DISCORD_TOKEN);
