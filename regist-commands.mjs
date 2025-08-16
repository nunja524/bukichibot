import fs from "fs";
import path from "path";
import { REST, Routes } from "discord.js";

/**
 * commands ディレクトリ配下の .mjs を収集して
 * SlashCommand を登録する（GUILD_ID があればギルド、なければグローバル）
 */
export default async function registerCommands() {
  const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } = process.env;

  if (!DISCORD_TOKEN || !CLIENT_ID) {
    console.error("❌ 環境変数が不足しています: DISCORD_TOKEN / CLIENT_ID");
    return;
  }

  // --- commands 配下から .mjs を集める（直下・サブフォルダ両対応） ---
  const foldersPath = path.join(process.cwd(), "commands");
  if (!fs.existsSync(foldersPath)) {
    console.warn("⚠️ commands ディレクトリが見つかりません。");
    return;
  }

  /** 指定パス配下の .mjs をすべて列挙（1階層のみ探索） */
  function collectCommandFiles(dir) {
    const files = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        const sub = path.join(dir, entry.name);
        for (const f of fs.readdirSync(sub)) {
          if (f.endsWith(".mjs")) files.push(path.join(sub, f));
        }
      } else if (entry.isFile() && entry.name.endsWith(".mjs")) {
        files.push(path.join(dir, entry.name));
      }
    }
    return files;
  }

  const commandFiles = collectCommandFiles(foldersPath);

  const commands = [];
  for (const filePath of commandFiles) {
    try {
      const mod = await import(filePath);
      if (mod?.data?.toJSON) {
        commands.push(mod.data.toJSON());
      } else {
        console.warn(`⚠️ コマンド定義が不正: ${filePath} （data.toJSON がありません）`);
      }
    } catch (e) {
      console.error(`❌ コマンド読み込みエラー: ${filePath}`, e);
    }
  }

  if (!commands.length) {
    console.warn("⚠️ 登録対象のコマンドがありません。");
    return;
  }

  const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);

  try {
    console.log(`[INIT] ${commands.length} 個のスラッシュコマンドを更新します…`);

    if (GUILD_ID) {
      await rest.put(
        Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
        { body: commands }
      );
      console.log(`[INIT] ギルド(${GUILD_ID})に ${commands.length} 個のコマンドを更新しました（即時反映）。`);
    } else {
      await rest.put(
        Routes.applicationCommands(CLIENT_ID),
        { body: commands }
      );
      console.log(`[INIT] グローバルに ${commands.length} 個のコマンドを更新しました（反映まで最大1時間程度）。`);
    }
  } catch (error) {
    console.error("❌ スラッシュコマンド登録エラー:", error);
  }
}
