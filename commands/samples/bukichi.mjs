import { SlashCommandBuilder } from "discord.js";
import { pickRandomWeaponByFreeQuery } from "../../lib/weapons.mjs"; // ← パスはあなたの構成に合わせて

export const data = new SlashCommandBuilder()
  .setName("bukichi")
  .setDescription("ランダムでブキを返信するよ！スペース入れると条件付きブキチ杯ができるよ！")
  .addStringOption(option =>
    option
      .setName("q") // ← オプション名は英数字小文字のみ
      .setDescription("例: サメライド シューター")
      .setRequired(false)
  );

export async function execute(interaction) {
  const q = interaction.options.getString("q") || "";
  const { item, count } = await pickRandomWeaponByFreeQuery(q);

  if (!item) {
    await interaction.reply({
      content: "条件に合う武器が見つかりませんでした。",
      ephemeral: true
    });
    return;
  }

  await interaction.reply({
    content:
      `**疑似ブキチ杯結果（${count}件中ランダム）**\n` +
      `武器名: ${item.name}\n` +
      `武器種: ${item.type}\n` +
      `サブ: ${item.sub}\n` +
      `スペシャル: ${item.special}`,
    ephemeral: true
  });
}
