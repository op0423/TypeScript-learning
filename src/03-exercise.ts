/**
 * ============================================================
 *  第 3 章 練習：泛型 Generics
 * ============================================================
 *
 *  規則：
 *  - 先自己寫，不要先問我。寫完把整份檔案貼回對話，我逐題檢討。
 *  - 每題下方有「驗收測試」區塊，預設是註解掉的。
 *    寫完該題後把註解拿掉，跑 `npx tsc --noEmit` 檢查。
 *
 *  關於 @ts-expect-error 的用法（這次練習的重點工具）：
 *    這是「我預期下一行會編譯錯誤」的斷言。
 *      - 下一行真的錯 → 錯誤被吃掉，tsc 通過 ✅
 *      - 下一行沒錯   → @ts-expect-error 自己報錯
 *        （TS2578: Unused '@ts-expect-error' directive）
 *    所以它可以同時測「該過的要過」和「該擋的要擋」。
 *    如果你的實作太鬆（例如用了 any），這些行會反過來告訴你。
 *
 *  難度遞增，Q4 / Q5 / Q6 刻意比較硬。
 */

// ============================================================
// 共用資料（直接用，不要改）
// ============================================================

interface FabricRoll {
  _id: string;
  rollNo: string;
  weightKg: number;
  zoneCode: string;
  status: "IN_STOCK" | "SHIPPED" | "HOLD";
}

interface Machine {
  _id: string;
  machineNo: string;
  efficiency: number;
  area: string;
}

const rolls: FabricRoll[] = [
  {
    _id: "1",
    rollNo: "R001",
    weightKg: 25.5,
    zoneCode: "A-01",
    status: "IN_STOCK",
  },
  {
    _id: "2",
    rollNo: "R002",
    weightKg: 30.0,
    zoneCode: "A-01",
    status: "SHIPPED",
  },
  {
    _id: "3",
    rollNo: "R003",
    weightKg: 18.2,
    zoneCode: "B-03",
    status: "IN_STOCK",
  },
];

const machines: Machine[] = [
  { _id: "m1", machineNo: "K-01", efficiency: 92.5, area: "針織一廠" },
  { _id: "m2", machineNo: "K-02", efficiency: 88.0, area: "針織一廠" },
  { _id: "m3", machineNo: "K-03", efficiency: 95.1, area: "針織二廠" },
];

// ============================================================
// Q1 — last<T>
// ============================================================
/**
 * 寫一個泛型函式 last，回傳陣列的最後一個元素。
 *
 * 要求：
 *   (a) 參數要能接受 readonly 陣列（想想為什麼函式應該宣告「我不會改你的陣列」）
 *   (b) 回傳型別自己想清楚 —— 回憶第 1 章 Array.find 的教訓：空陣列會怎樣？
 */

// ---- 你的答案 ----
function last<T>(arr: readonly T[]): T | undefined {
  return arr[arr.length - 1];
}

// ---- 驗收測試（寫完拿掉註解）----
/*
const lastRoll = last(rolls);
console.log(lastRoll?.rollNo);

// @ts-expect-error 回傳值可能不存在，不能直接摸屬性
console.log(last(rolls).rollNo);

const frozen: readonly number[] = [1, 2, 3] as const;
const lastNum: number | undefined = last(frozen);
console.log(lastNum);
*/

// ============================================================
// Q2 — pluck
// ============================================================
/**
 * 從物件陣列取出某個欄位，組成新陣列。
 *
 * 要求：
 *   (a) key 打錯字時「編譯期」就報錯
 *   (b) 回傳型別要精確：
 *         pluck(rolls, 'rollNo')   → string[]
 *         pluck(rolls, 'weightKg') → number[]
 *         pluck(rolls, 'status')   → ('IN_STOCK' | 'SHIPPED' | 'HOLD')[]
 *       不可以是 unknown[]、any[] 或 (string | number)[]
 */

// ---- 你的答案 ----
function pluck<T, K extends keyof T>(object: T, key: K): T[K] {
  return object[key];
}

// ---- 驗收測試（寫完拿掉註解）----
/*
const rollNos: string[] = pluck(rolls, 'rollNo');
const weights: number[] = pluck(rolls, 'weightKg');
const statuses: ('IN_STOCK' | 'SHIPPED' | 'HOLD')[] = pluck(rolls, 'status');
const areas: string[] = pluck(machines, 'area');
console.log(rollNos, weights, statuses, areas);

// @ts-expect-error 'weight' 不是 FabricRoll 的欄位
pluck(rolls, 'weight');

// @ts-expect-error weightKg 是 number，不能塞進 string[]
const wrongType: string[] = pluck(rolls, 'weightKg');
*/

// ============================================================
// Q3 — groupBy
// ============================================================
/**
 * 依某個欄位把物件陣列分組。
 * const rolls: FabricRoll[] = [
  { _id: '1', rollNo: 'R001', weightKg: 25.5, zoneCode: 'A-01', status: 'IN_STOCK' },
  { _id: '2', rollNo: 'R002', weightKg: 30.0, zoneCode: 'A-01', status: 'SHIPPED' },
  { _id: '3', rollNo: 'R003', weightKg: 18.2, zoneCode: 'B-03', status: 'IN_STOCK' },
];
 *
 *   groupBy(rolls, 'zoneCode')
 *   → { 'A-01': [R001, R002], 'B-03': [R003] } =>Record
 *
 * 回傳型別請用 Record<string, T[]>。
 *
 * 【思考題，答案寫在註解裡】
 *   zoneCode 是 string，沒問題。但如果有人傳 'weightKg' 進來會怎樣？
 *   物件的 key 只能是 string / number / symbol，
 *   而 T[K] 有可能是 boolean、物件、甚至 undefined。
 *
 *   你有兩條路：
 *     路線 A：用約束把「值不是字串的欄位」直接擋在編譯期 
 *     路線 B：允許傳入，但在實作裡把值轉成 string
 *
 *   兩種都是合法設計。選一條做，並在註解裡寫下：
 *     - 你選了哪條
 *     - 理由是什麼
 *     - 另一條路的代價是什麼
 *   （這題我要看的是你的取捨說明，不只是能跑）
 */

// ---- 你的答案 ----
// 用路線A,我選擇在編譯期檔住的原因是系統會自動做檢查,會比人工檢查多一點保障,選擇路線B的話系統不會自己擱置,也許會直接把number轉換成string,那就不會正確判斷
function groupBy<T extends Record<k, string>, k extends string>(
  arr: T[],
  key: k,
): Record<string, T[]> {
  return arr.reduce(
    (acc, item) => {
      const keyName = item[key];
      if (!acc[keyName]) {
        acc[keyName] = [];
      }
      acc[keyName].push(item);
      return acc;
    },
    {} as Record<string, T[]>,
  );
}

// ---- 驗收測試（寫完拿掉註解）----
// /*
const byZone = groupBy(rolls, "zoneCode");
// console.log(byZone)
console.log(byZone["A-01"]?.length); // 2
console.log(byZone["B-03"]?.length); // 1

const byArea = groupBy(machines, "area");
console.log(Object.keys(byArea)); // ['針織一廠', '針織二廠']

// 如果你走路線 A，下面這行應該報錯，請把註解打開：
// // @ts-expect-error weightKg 不是字串欄位
// groupBy(rolls, 'weightKg');
// */

// ============================================================
// Q4 — sumBy
// ============================================================
/**
 * 加總物件陣列中某個「數字欄位」。
 *
 *   sumBy(rolls, 'weightKg')      // 73.7
 *   sumBy(machines, 'efficiency') // 275.6
 *   sumBy(rolls, 'rollNo')        // ❌ 必須「編譯錯誤」，不是執行期才發現
 *
 * 這題是本章最容易卡住的地方。
 * 直接寫 <T, K extends keyof T> 的話，reduce 那行會報錯，
 * 因為 TS 只知道 T[K] 是「T 的某個欄位」，不知道它是 number。
 *
 * 提示：想清楚「約束該加在哪一邊」。
 *       你有兩種主流寫法，一種約束 T[K]，一種反過來約束 T 本身。
 *       兩種都可以，寫出你能自己解釋的那種。
 *
 * 額外要求：不准用 as / any 硬轉。用型別繞過檢查就失去這題的意義了。
 */

// ---- 你的答案 ----
// 約束T[K]本身要是number,string則直接擋掉
function sumBy<T extends Record<K, number>, K extends string>(
  arr: T[],
  key: K,
): number {
  return arr.reduce((total, item) => total + item[key], 0);
}

// ---- 驗收測試（寫完拿掉註解）----

const totalWeight: number = sumBy(rolls, "weightKg");
const totalEff: number = sumBy(machines, "efficiency");
console.log(totalWeight.toFixed(1), totalEff.toFixed(1));

// @ts-expect-error rollNo 是 string，不能加總
sumBy(rolls, "rollNo");

// @ts-expect-error status 是字串聯合，不能加總
sumBy(rolls, "status");

// @ts-expect-error 欄位根本不存在
sumBy(rolls, "weight");
// */

// ============================================================
// Q5 — Result<T, E> 實戰
// ============================================================
/**
 * 用教材 3.6 的 Result<T, E> 模式，寫一個 moveRoll 函式：把布卷移到新儲位。
 *
 * 規則：
 *   - 找不到該 rollNo            → 失敗，訊息要包含布卷編號
 *   - 布卷 status 是 'SHIPPED'   → 失敗（已出貨不可移動）
 *   - 目標儲位跟現在同一格        → 失敗（無效操作）
 *   - 其他                       → 成功，回傳移動後的布卷
 *
 * 要求：
 *   (a) 錯誤型別 E 不准用 string。設計一個「可辨識」的錯誤物件，
 *       至少要有一個 code 欄位（用字面量聯合，不是 string），
 *       讓呼叫端能用 switch 分辨是哪一種失敗。
 *   (b) 不要改動原本的 rolls 陣列元素（回傳新物件）。
 *       想想 readonly 跟不可變性 —— 第 2 章的主題在這裡會回來。
 *   (c) 寫出呼叫端程式碼，示範成功 / 失敗兩條路徑，
 *       失敗那條要用 switch 分別處理每一種 code。
 *
 * 加分：在 switch 的 default 加上第 1 章學的 never 窮舉檢查。
 */

// ---- 你的答案（含 Result 型別、錯誤型別、moveRoll、呼叫端）----
// const rolls: FabricRoll[] = [
//   {
//     _id: "1",
//     rollNo: "R001",
//     weightKg: 25.5,
//     zoneCode: "A-01",
//     status: "IN_STOCK",
//   },
//   {
//     _id: "2",
//     rollNo: "R002",
//     weightKg: 30.0,
//     zoneCode: "A-01",
//     status: "SHIPPED",
//   },
//   {
//     _id: "3",
//     rollNo: "R003",
//     weightKg: 18.2,
//     zoneCode: "B-03",
//     status: "IN_STOCK",
//   },
// ];

type MoveRollError =
  | { message: "ROLLNO_NOT_FOUND"; rollNo: string }
  | { message: "ALREADY_SHIPPED"; rollNo: string }
  | { message: "ALREADY_IN_ZONE"; rollNo: string; zoneCode: string };

type Result<T, E = string> = { ok: true; value: T } | { ok: false; error: E };

function moveRoll(
  roll: readonly [],
  rollNo: string,
  toLocation: string,
): Result<FabricRoll, MoveRollError> {
  const found = rolls.find((r) => r.rollNo === rollNo);
  if (!found) {
    return { ok: false, error: { message: "ROLLNO_NOT_FOUND", rollNo } };
  }
  if (found.status == "SHIPPED") {
    return { ok: false, error: { message: "ALREADY_SHIPPED", rollNo } };
  }
  if (found.zoneCode === toLocation) {
    return {
      ok: false,
      error: { message: "ALREADY_IN_ZONE", rollNo, zoneCode: found.zoneCode },
    };
  }
  found.zoneCode = toLocation;
  return { ok: true, value: found };
}

// ============================================================
// Q6 — 觀念題（答案直接寫在下方註解裡）
// ============================================================
/**
 * 下面三段程式碼各有一個「泛型使用上的問題」。
 * 針對每一段回答：
 *   1. 問題是什麼（要講到「為什麼」，不是只說「不好」）
 *   2. 修正後的版本
 *
 * ------------------------------------------------------------
 * (a)
 *   function toArray<T>(value: any): T[] {
 *     return [value];
 *   }
 *
 *   // 呼叫端
 *   const nums = toArray<number>('這是字串');   // 這行會發生什麼事？
 *
 * ------------------------------------------------------------
 * (b)
 *   function pick<T>(obj: T, keys: string[]): any {
 *     const result: any = {};
 *     keys.forEach(k => { result[k] = (obj as any)[k]; });
 *     return result;
 *   }
 *
 *   提示：這題不只一個問題，至少有三個地方讓型別資訊漏光了。
 *        修正版會需要用到 Pick<T, K>（第 5 章的工具型別，
 *        可以先當作「從 T 挑出 K 這些欄位組成新型別」）。
 *
 * ------------------------------------------------------------
 * (c)
 *   function formatWeight<T extends number>(weight: T): string {
 *     return `${weight.toFixed(2)} kg`;
 *   }
 *
 *   提示：這段程式碼「可以編譯、可以執行、結果正確」。
 *        問題不在正確性，在別的地方。回想坑 2。
 */

// ---- 你的答案 ----
// (a) 問題：未處理undefined的情況
//     修正：function toArray<T>(value: any): T[] | undefined {
//            return [value];
//             }
//
// (b) 問題：
//     修正：
//
// (c) 問題：僅需要直接宣告即可,這樣繞沒有意義
//     修正： function formatWeight(weight: number): string {
//  return `${weight.toFixed(2)} kg`;
// }

export {};
