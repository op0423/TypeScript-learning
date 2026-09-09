/**
 * 第 2 章 練習題：物件的形狀
 *
 * 做法：補完每題，跑 `npm run check` 修到零錯誤。
 * 這次的題目全部取材自你 WMS 的真實結構。
 */

// ── Q1：基本建模 ──────────────────────────────
// 定義一個 interface `Bolt`（一疋布），欄位需求：
//   boltNo    字串，建立後不可修改
//   weightKg  數字
//   remark    字串，選填
// TODO:
interface Bolt {
  readonly boltNo: string;
  weightKg: number;
  remark?: string;
}

// ── Q2：巢狀 + 陣列 ───────────────────────────
// 定義 `Frame`（一台布架），欄位需求：
//   frameNo    字串，唯讀
//   stockZoneID 字串
//   bolts      Bolt 的陣列
// 然後寫一個函式 totalWeight(frame): number 回傳這台布架的總重。
// 提示：陣列的 reduce 在 TS 裡要注意初始值的型別。
// TODO:
interface Frame {
  readonly frameNo: string;
  stockZoneID: string;
  bolts: Bolt[];
}
export function totalWeight(frame:Frame): number {
  return frame.bolts.reduce((sum,blot)=>sum+blot.weightKg,0)
}

// ── Q3：選填欄位的處理 ────────────────────────
// 下面這個函式會編譯失敗，請修正它（不要把 capacity 改成必填，
// 也不要用 any 或 ! 非空斷言）。
interface StockZone {
  readonly stockZoneID: string;
  zoneName: string;
  capacity?: number;
}

export function remainingCapacity(zone: StockZone, used: number): number {
  return (zone.capacity ?? 0 )  -used;
}

// ── Q4：組合型別 ──────────────────────────────
// 已知所有 MongoDB 文件都有這三個欄位：
interface BaseDoc {
  readonly _id: string;
  createdAt: Date;
  updatedAt: Date;
}
// 請用 interface + extends 定義 `TransactionDoc`，額外欄位：
//   transactionNo string
//   operatorNo    string
//   type          只能是 'inbound' | 'outbound' | 'transfer'
// 再用 type + & 寫出等價的 `TransactionDoc2`。
// TODO:
interface TransactionDoc extends BaseDoc {
  transactionNo: string;
  operatorNo: string;
  type: "inbound" | "outbound" | "transfer";
}
type TransactionDoc2 = BaseDoc & {
  transactionNo: string;
  operatorNo: string;
  type: "inbound" | "outbound" | "transfer";
};

// ── Q5：找出 bug ──────────────────────────────
// 下面的程式碼 TS 會報錯，請說明「為什麼」並修正。
// 提示：跟「額外屬性檢查」有關。
// const zone: StockZone = {
//   stockZoneID: 'Z-A',
//   zoneName: 'A區',
//   capcity: 500,        // 注意看這個 key
// };
// 答（為什麼）：capacity拼成capcity

// ── Q6（思考題，用註解回答）────────────────────
// 你的 WMS 目前用 currentStock（當前狀態）+ stockState（歷程陣列）雙結構。
// 如果要用 TS 描述它，你會怎麼避免「currentStock 和 stockState 最後一筆
// 不一致」這種 bug？型別系統能幫上忙嗎？能到什麼程度？
// 答：也許將stockState宣告成interface stockState[] extends currentStock,並把currentStock改成interface currentStock?{}
