/**
 * 第 2 章 練習題 — 參考解答與檢討
 *
 * 執行： npx tsx src/02-exercise-answer.ts
 */

// ── Q1 ⚠️ 兩個小錯 ─────────────────────────────
// 你的：boltNo 少了 readonly；remark 打成 remork
interface Bolt {
  readonly boltNo: string;   // ← 題目要求「建立後不可修改」
  weightKg: number;
  remark?: string;           // ← 拼字
}
// 👉 remork 這個錯 TS 抓不到 —— 因為選填欄位「沒有就沒有」，
//    你只是定義了一個沒人用的欄位。這正是 Q5 想讓你體會的事。

// ── Q2 ⚠️ interface 正確，但 totalWeight 沒寫 ────
interface Frame {
  readonly frameNo: string;
  stockZoneID: string;
  bolts: Bolt[];
}

// 寫法 A：reduce —— 注意初始值 0 決定了累加器的型別
export function totalWeight(frame: Frame): number {
  return frame.bolts.reduce((sum, bolt) => sum + bolt.weightKg, 0);
}
// 若省略初始值 0，TS 會把累加器推論成 Bolt，sum + bolt.weightKg 就爆了。
// 這就是題目提示「注意初始值的型別」的意思。

// 寫法 B：看得懂比較重要時，for-of 也完全可以
export function totalWeight2(frame: Frame): number {
  let sum = 0;
  for (const bolt of frame.bolts) sum += bolt.weightKg;
  return sum;
}

// ── Q3 ❌ 型別過了，但算錯 ──────────────────────
interface StockZone {
  readonly stockZoneID: string;
  zoneName: string;
  capacity?: number;
}

// 你的：return zone.capacity ?? -used;
//   ?? 的優先權讓它變成 zone.capacity ?? (-used)
//   → capacity 有值時直接回傳 capacity，根本沒減掉 used
export function remainingCapacity_yours(zone: StockZone, used: number): number {
  return zone.capacity ?? -used;
}

// 正解：先把 undefined 處理掉，再做運算 —— 括號位置是關鍵
export function remainingCapacity(zone: StockZone, used: number): number {
  return (zone.capacity ?? 0) - used;
}

// ── Q4 ✅ 完全正確 ─────────────────────────────
interface BaseDoc {
  readonly _id: string;
  createdAt: Date;
  updatedAt: Date;
}

interface TransactionDoc extends BaseDoc {
  transactionNo: string;
  operatorNo: string;
  type: 'inbound' | 'outbound' | 'transfer';
}

type TransactionDoc2 = BaseDoc & {
  transactionNo: string;
  operatorNo: string;
  type: 'inbound' | 'outbound' | 'transfer';
};

// ── Q5 ⚠️ 答對現象，沒答到機制 ───────────────────
// 為什麼會報錯：物件字面量直接賦值給有型別的變數時，TS 會做
// 「額外屬性檢查 (excess property check)」—— 出現型別上沒有的 key 就報錯，
// 因為那幾乎都是打錯字。capcity 不在 StockZone 上，所以被擋。
// 修正：
export const zone: StockZone = {
  stockZoneID: 'Z-A',
  zoneName: 'A區',
  capacity: 500,
};

// ── Q6 型別系統能幫到哪裡 ───────────────────────
// 結論：型別系統「不能」保證 currentStock === stockState 最後一筆，
//       因為那是執行期的值相等，不是編譯期的形狀。
//       但可以用設計讓這個 bug「不可能發生」。

type StockStateName = 'weighed' | 'framed' | 'inStock' | 'dispatched';

interface StockSnapshot {
  state: StockStateName;
  stockZoneID: string;
  operatorNo: string;
  at: Date;
}

// 做法 A（最推薦）：不要存兩份 —— currentStock 從歷程推導出來
// 技巧：歷程用「新的在前」的非空 tuple，index 0 就是當前狀態，
//       TS 保證它一定存在（不會是 undefined）。
interface KnitWarpRecordA {
  readonly _id: string;
  lotNo: string;
  readonly history: readonly [StockSnapshot, ...StockSnapshot[]];
}

export function currentStock(record: KnitWarpRecordA): StockSnapshot {
  return record.history[0];   // ✅ 不需要 ! 也不需要判斷 undefined
}

// 只能透過這個函式推進狀態 → 兩者永遠不可能不一致
export function pushState(
  record: KnitWarpRecordA,
  next: StockSnapshot,
): KnitWarpRecordA {
  return { ...record, history: [next, ...record.history] };
}

// 做法 B：真的必須存兩份時（你的 MongoDB 查詢效能考量），
//         把 currentStock 標成 readonly，並且「只准」透過一個函式同時更新兩者。
interface KnitWarpRecordB {
  readonly _id: string;
  lotNo: string;
  readonly currentStock: StockSnapshot;    // readonly：外部無法單獨改
  readonly stockState: readonly StockSnapshot[];
}

export function transition(
  record: KnitWarpRecordB,
  next: StockSnapshot,
): KnitWarpRecordB {
  return {
    ...record,
    currentStock: next,                       // 兩者一起改，沒有第二條路徑
    stockState: [...record.stockState, next],
  };
}
// 👉 型別系統做的事：用 readonly 把「單獨改一邊」變成編譯錯誤，
//    逼所有寫入都走同一個函式。不變式(invariant)由那一個函式保證。
//    這叫「讓非法狀態無法被表示 (make illegal states unrepresentable)」。

// ── 執行區 ────────────────────────────────────
const frame: Frame = {
  frameNo: 'F-01',
  stockZoneID: 'Z-A',
  bolts: [
    { boltNo: 'B1', weightKg: 25.5 },
    { boltNo: 'B2', weightKg: 24.0 },
    { boltNo: 'B3', weightKg: 26.2, remark: '邊有色差' },
  ],
};

const z1: StockZone = { stockZoneID: 'Z-A', zoneName: 'A區', capacity: 500 };
const z2: StockZone = { stockZoneID: 'Z-B', zoneName: 'B區' };

let recA: KnitWarpRecordA = {
  _id: '1',
  lotNo: 'LOT-0007',
  history: [{ state: 'weighed', stockZoneID: '-', operatorNo: 'A001', at: new Date() }],
};
recA = pushState(recA, { state: 'framed', stockZoneID: '-', operatorNo: 'A002', at: new Date() });
recA = pushState(recA, { state: 'inStock', stockZoneID: 'Z-A', operatorNo: 'A001', at: new Date() });

console.log('Q2 布架總重:', totalWeight(frame), '/', totalWeight2(frame));
console.log('Q3 有容量(500)已用120 → 你的:', remainingCapacity_yours(z1, 120), '| 正解:', remainingCapacity(z1, 120));
console.log('Q3 無容量已用120      → 你的:', remainingCapacity_yours(z2, 120), '| 正解:', remainingCapacity(z2, 120));
console.log('Q5 儲區:', zone.zoneName, zone.capacity);
console.log('Q6 當前狀態:', currentStock(recA).state, '| 歷程筆數:', recA.history.length);
