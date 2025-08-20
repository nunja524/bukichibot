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
  // --- Sub Weapons ---
  ["スプボ", "スプラッシュボム"],
  ["おにぎり", "スプラッシュボム"],
  ["スプボム", "スプラッシュボム"],
  ["三角", "スプラッシュボム"],
  ["三角ボム", "スプラッシュボム"],

  ["キューバン", "キューバンボム"],
  ["吸盤", "キューバンボム"],
  ["キューボム", "キューバンボム"],
  ["デブ", "キューバンボム"],

  ["クイボ", "クイックボム"],
  ["水風船", "クイックボム"],

  ["リンクラ", "スプリンクラー"],
  ["スプリン", "スプリンクラー"],
  ["プリン", "スプリンクラー"],
  ["噴水", "スプリンクラー"],

  ["シールド", "スプラッシュシールド"],
  ["スプシ", "スプラッシュシールド"],

  ["タンサン", "タンサンボム"],
  ["炭酸", "タンサンボム"],

  ["カーリング", "カーリングボム"],
  ["カーボム", "カーリングボム"],
  ["カリボ", "カーリングボム"],
  ["カリボム", "カーリングボム"],

  ["ロボム", "ロボットボム"],
  ["ロボボム", "ロボットボム"],
  ["ロボボ", "ロボットボム"],
  ["コケコ", "ロボットボム"],

  ["ビーコン", "ジャンプビーコン"],
  ["ベーコン", "ジャンプビーコン"],

  ["ポイセン", "ポイントセンサー"],
  ["センサー", "ポイントセンサー"],

  ["トラ", "トラップ"],
  ["罠", "トラップ"],
  ["地雷", "トラップ"],

  ["ポイズン", "ポイズンミスト"],
  ["ポイミ", "ポイズンミスト"],
  ["ポイミス", "ポイズンミスト"],
  ["ミスト", "ポイズンミスト"],
  ["毒霧", "ポイズンミスト"],
  ["毒", "ポイズンミスト"],
  ["霧", "ポイズンミスト"],

  ["マーカー", "ラインマーカー"],
  ["ライマ", "ラインマーカー"],
  ["LM", "ラインマーカー"],

  ["トピ", "トーピード"],
  ["魚雷", "トーピード"],
  ["醤油差し", "トーピード"],

  // --- Specials ---
  ["ウルショ", "ウルトラショット"],
  ["スパショ", "ウルトラショット"],
  ["ウルショット", "ウルトラショット"],
  ["アニキ", "ウルトラショット"],

  ["バリア", "グレートバリア"],
  ["グレバリ", "グレートバリア"],
  ["グレバ", "グレートバリア"],
  ["ドーム", "グレートバリア"],
  ["ドームシールド", "グレートバリア"],

  ["ショクワン", "ショクワンダー"],
  ["触腕", "ショクワンダー"],
  ["忍者", "ショクワンダー"],
  ["スパイダーマン", "ショクワンダー"],

  ["マルミサ", "マルチミサイル"],
  ["ミサイル", "マルチミサイル"],
  ["マルミ", "マルチミサイル"],

  ["雨", "アメフラシ"],
  ["アメ", "アメフラシ"],
  ["飴", "アメフラシ"],
  ["コウモリ", "アメフラシ"],

  ["玉", "ナイスダマ"],
  ["元気玉", "ナイスダマ"],
  ["ナダマ", "ナイスダマ"],
  ["善玉", "ナイスダマ"],

  ["ソナー", "ホップソナー"],
  ["ホプソナ", "ホップソナー"],
  ["ポップソナー", "ホップソナー"],
  ["アイスクリーム", "ホップソナー"],

  ["キューイン", "キューインキ"],
  ["吸引", "キューインキ"],
  ["掃除機", "キューインキ"],
  ["ダイソン", "キューインキ"],
  ["金平糖", "キューインキ"],
  ["ダウニー", "キューインキ"],

  ["メガホン", "メガホンレーザー5.1ch"],
  ["レーザー", "メガホンレーザー5.1ch"],

  ["ジェッパ", "ジェットパック"],
  ["ガンダム", "ジェットパック"],

  ["ウルハン", "ウルトラハンコ"],
  ["ハンコ", "ウルトラハンコ"],
  ["判子", "ウルトラハンコ"],
  ["ウンコ", "ウルトラハンコ"],

  ["カニ", "カニタンク"],
  ["タンク", "カニタンク"],
  ["カニタン", "カニタンク"],

  ["サメ", "サメライド"],
  ["サメライ", "サメライド"],
  ["鮫", "サメライド"],
  ["デモォ", "サメライド"],

  ["トリトル", "トリプルトルネード"],
  ["トルネ", "トリプルトルネード"],
  ["トルネード", "トリプルトルネード"],
  ["トリネード", "トリプルトルネード"],
  ["トリネ", "トリプルトルネード"],

  ["エナスタ", "エナジースタンド"],
  ["エナドリ", "エナジースタンド"],
  ["ドリンク", "エナジースタンド"],
  ["エナカス", "エナジースタンド"],

  ["デコイ", "デコイチラシ"],
  ["チラシ", "デコイチラシ"],
  ["デコチラ", "デコイチラシ"],
  ["デコチ", "デコイチラシ"],

  ["テイオウ", "テイオウイカ"],
  ["帝王", "テイオウイカ"],
  ["ダイオウ", "テイオウイカ"],
  ["大王", "テイオウイカ"],
  ["テイオー", "テイオウイカ"],
  ["テイオウタコ", "テイオウイカ"],

  ["チャクチ", "ウルトラチャクチ"],
  ["ウルチャク", "ウルトラチャクチ"],
  ["着地", "ウルトラチャクチ"],
  ["ウルチャ", "ウルトラチャクチ"],
  ["ウンチ", "ウルトラチャクチ"],

  ["スミナガ", "スミナガシート"],
  ["スミナガシ", "スミナガシート"],
  ["スミ", "スミナガシート"],
  ["墨", "スミナガシート"],
  ["墨流し", "スミナガシート"],
  ["住永", "スミナガシート"],

  // --- Weapon Types ---
  ["シュー", "シューター"],
  ["銃", "シューター"],
  ["ロラ", "ローラー"],
  ["チャー", "チャージャー"],
  ["スナイパー", "チャージャー"],
  ["バケツ", "スロッシャー"],
  ["スロ", "スロッシャー"],
  ["バケ", "スロッシャー"],
  ["スピ", "スピナー"],
  ["マニュ", "マニューバー"],
  ["スライド", "マニューバー"],
  ["傘", "シェルター"],
  ["ブラ", "ブラスター"],
  ["筆", "フデ"],
  ["弓", "ストリンガー"],
  ["剣", "ワイパー"], // 例
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
