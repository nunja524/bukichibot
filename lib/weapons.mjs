import { readFile } from "fs/promises";
import path from "path";

let cache = null;

async function loadAllWeapons() {
  if (cache) return cache;
  const file = path.join(process.cwd(), "data", "weapons.json");
  const raw = await readFile(file, "utf8");
  cache = JSON.parse(raw);
  return cache;
}

function norm(s) {
  if (typeof s !== "string") return "";
  return s.normalize("NFKC").trim(); // 全角半角ゆらぎ・前後空白を吸収
}

/** weapons.json から動的に語彙を収集（型・サブ・スペシャル） */
async function buildVocab() {
  const all = await loadAllWeapons();
  const types = new Set();
  const subs = new Set();
  const specials = new Set();
  for (const w of all) {
    if (w.type) types.add(norm(w.type));
    if (w.sub) subs.add(norm(w.sub));
    if (w.special) specials.add(norm(w.special));
  }
  return { types, subs, specials };
}

/** よくある略称・別名の補正（必要に応じて追記OK） */
function applyAliases(token) {
  const t = norm(token);
  const ALIASES = new Map([
    // special系
    ["チャクチ", "ウルトラチャクチ"],
    ["ウルハン", "ウルトラハンコ"], // 例：もし俗称があるなら
    // sub系
    ["シールド", "スプラッシュシールド"],
    ["ボムピ", "クイックボム・ピッチャー"], // 例
  ]);
  return ALIASES.get(t) || t;
}

/**
 * 自由入力qを自動分類して条件オブジェクトにする
 * - カテゴリ内は OR（例：special=キューインキ or トリプルトルネード）
 * - カテゴリ間は AND（例：type=ローラー AND special=キューインキ）
 * - どの集合にも属さない語は name 部分一致に回す
 */
export async function parseFreeQuery(q) {
  const { types, subs, specials } = await buildVocab();
  const cond = { types: [], subs: [], specials: [], nameParts: [] };

  if (!q) return cond;

  // 空白/カンマ/全角スペースで分割
  const tokens = q.split(/[\s,、　]+/).map(applyAliases).map(norm).filter(Boolean);

  for (const tok of tokens) {
    if (specials.has(tok)) { cond.specials.push(tok); continue; }
    if (subs.has(tok))     { cond.subs.push(tok);     continue; }
    if (types.has(tok))    { cond.types.push(tok);    continue; }
    // どれにもヒットしなければ名前部分一致
    cond.nameParts.push(tok);
  }
  return cond;
}

function matchByCond(w, cond) {
  const n = (s) => norm(s);

  if (cond.types?.length && !cond.types.includes(n(w.type))) return false;
  if (cond.subs?.length && !cond.subs.includes(n(w.sub))) return false;
  if (cond.specials?.length && !cond.specials.includes(n(w.special))) return false;

  if (cond.nameParts?.length) {
    const name = n(w.name);
    // namePartsはAND（全語を含む）にする。ORにしたいなら `.some` に変更
    const ok = cond.nameParts.every(part => name.includes(part));
    if (!ok) return false;
  }
  return true;
}

export async function pickRandomWeaponByFreeQuery(q) {
  const all = await loadAllWeapons();
  const cond = await parseFreeQuery(q);
  const candidates = all.filter(w => matchByCond(w, cond));
  if (!candidates.length) return { item: null, count: 0, cond };
  const item = candidates[Math.floor(Math.random() * candidates.length)];
  return { item, count: candidates.length, cond };
}
