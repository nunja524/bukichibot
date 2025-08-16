import { ndnDice } from "../commands/utils/dice.mjs";
import weapons from "../data/weapons.json" assert { type: "json" };
import main from "../data/main.json" assert { type: "json" };
import subli from "../data/subli.json" assert { type: "json" };
import speli from "../data/speli.json" assert { type: "json" };
import wepli from "../data/wepli.json" assert { type: "json" };
import stali from "../data/stali.json" assert { type: "json" };

const norm = (s) => (typeof s === "string" ? s.normalize("NFKC").trim() : "");
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function formatResult(title, w, count = null) {
  const head = count ? `**${title}（${count}件中ランダム）**` : `**${title}**`;
  return (
    `${head}\n` +
    `武器名: ${w.name}\n` +
    `武器種: ${w.type}\n` +
    `サブ: ${w.sub}\n` +
    `スペシャル: ${w.special}\n` +
    `レンジ: ${w.range ?? "未設定"}`
  );
}

const ALIASES = new Map([
  // sub
  ["スプボ", "スプラッシュボム"],
  ["キューバン", "キューバンボム"],
  ["クイボ", "クイックボム"],
  ["シールド", "スプラッシュシールド"],
  // special
  ["ウルショ", "ウルトラショット"],
  ["ウルハン", "ウルトラハンコ"],
  ["ウルチャク", "ウルトラチャクチ"],
  ["メガホン", "メガホンレーザー5.1ch"],
  ["テイオウ", "テイオウイカ"],
  // type 例: ["ザップ", "シューター"],
]);

const VOCAB = (() => {
  const types = new Set();
  const subs = new Set();
  const specials = new Set();
  const ranges = new Set();
  for (const w of weapons) {
    if (w.type) types.add(norm(w.type));
    if (w.sub) subs.add(norm(w.sub));
    if (w.special) specials.add(norm(w.special));
    if (w.range) ranges.add(norm(w.range));
  }
  return { types, subs, specials, ranges };
})();

function classifyKeyword(raw) {
  const cand = norm(ALIASES.get(norm(raw)) || raw);
  if (VOCAB.specials.has(cand)) return { field: "special", value: cand };
  if (VOCAB.subs.has(cand))     return { field: "sub",     value: cand };
  if (VOCAB.types.has(cand))    return { field: "type",    value: cand };
  if (VOCAB.ranges.has(cand))   return { field: "range",   value: cand };
  return null;
}

function pickRandomByField(field, value) {
  const filtered = weapons.filter((w) => norm(w[field]) === norm(value));
  if (!filtered.length) return { item: null, count: 0 };
  const item = pick(filtered);
  return { item, count: filtered.length };
}

const ruleli = [{rule:"ガチエリア"},{rule:"ナワバリ"},{rule:"ガチアサリ"},{rule:"ガチヤグラ"},{rule:"ガチホコ"}];
const ruleli3 = [{rule3:"ガチホコ"},{rule3:"ガチヤグラ"},{rule3:"ガチエリア"}];
const ruleli4 = [{rule4:"ナワバリ"},{rule4:"ガチホコ"},{rule4:"ガチエリア"},{rule4:"ガチヤグラ"}];

function formatMainCandidates(item) {
  const candidates = [
    { name: item.name,  sub: item.sub1,  special: item.special1 },
    { name: item.name2, sub: item.sub2,  special: item.special2 },
    { name: item.name3, sub: item.sub3,  special: item.special3 },
  ].filter(c => c.name && c.name !== "-");

  if (!candidates.length) return "候補がありません。";

  const parts = candidates.map(c =>
    `武器名: ${c.name}\n` +
    `武器種: ${item.type}\n` +
    `サブ: ${c.sub}\n` +
    `スペシャル: ${c.special}`
  );
  return parts.join("\nもしくは\n");
}

export default async (message) => {
  if (message.author.bot) return;
  const text = norm(message.content);
  if (!text) return;

  /* ========= 1) まずは個別コマンド ========= */

  // 全体ランダム
  if (text === "ブキチ杯") {
    const item = pick(weapons);
    await message.reply(formatResult("疑似ブキチ杯結果", item));
    return;
  }

  // メインガチャ
  if (text === "メインガチャ") {
    const randomMain = pick(main);
    const body = formatMainCandidates(randomMain);
    await message.reply(`**疑似ブキチ杯(メイン)結果**\n${body}`);
    return;
  }

  // 単発ガチャ群
  if (text === "サブガチャ") {
    const randomSub = pick(subli);
    await message.reply(`**疑似ブキチ杯(サブ)結果**\n**${randomSub.sub}**`);
    return;
  }

  if (text === "スペシャルガチャ") {
    const randomSpe = pick(speli);
    await message.reply(`**疑似ブキチ杯(スペシャル)結果**\n**${randomSpe.special}**`);
    return;
  }

  if (text === "武器種ガチャ") {
    const randomWep = pick(wepli);
    await message.reply(`**疑似ブキチ杯(武器種)結果**\n**${randomWep.type}**`);
    return;
  }

  if (text === "ステージガチャ") {
    const randomSta = pick(stali);
    await message.reply(`**疑似ブキチ杯(ステージ)結果**\n**${randomSta.stage}**`);
    return;
  }

  if (text === "ルールガチャ") {
    const randomRule = pick(ruleli);
    await message.reply(`**疑似ブキチ杯(ルール)結果**\n**${randomRule.rule}**`);
    return;
  }

  if (text === "ルールガチャ3") {
    const randomRule3 = pick(ruleli3);
    await message.reply(`**疑似ブキチ杯(ルール)結果**\n**${randomRule3.rule3}**`);
    return;
  }

  if (text === "ルールガチャ4") {
    const randomRule4 = pick(ruleli4);
    await message.reply(`**疑似ブキチ杯(ルール)結果**\n**${randomRule4.rule4}**`);
    return;
  }

  if (text === "ダメライドガチャ") {
    await message.reply(`:rage:`);
    return;
  }

  if (/^\d+d\d+$/.test(text)) {
    await message.reply(ndnDice(text));
    return;
  }

  /* ========= 2) ここから汎用「〈キーワード〉ガチャ」 =========
     例: シューターガチャ / スプボガチャ / キューインキガチャ / 長距離チャージャーガチャ 等
  */
  const m = text.match(/^(.*)ガチャ$/);
  if (!m) return;

  const keyword = norm(m[1]);
  const cls = classifyKeyword(keyword);
  if (!cls) {
    await message.reply(`「${keyword}」に該当するカテゴリ（type/sub/special/range）が見つかりませんでした。`);
    return;
  }

  const { item, count } = pickRandomByField(cls.field, cls.value);
  if (!item) {
    await message.reply(`${cls.value} に一致する武器が見つかりません。`);
    return;
  }

  await message.reply(formatResult(`疑似ブキチ杯(${keyword})`, item, count));
};
