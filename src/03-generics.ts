/**
 * ============================================================
 *  第 3 章：泛型 Generics
 *  教材檔 — 跟著跑一遍，改改看，觀察 IDE 的 hover 提示
 * ============================================================
 *
 *  使用方式：
 *    1. 把游標移到每個變數上，看 TS 推論出來的型別是什麼
 *    2. 把標了 @ts-expect-error 的那行「刪掉註解」，看真正的錯誤訊息
 *       （反過來說：如果你把某行改成不會出錯，@ts-expect-error 自己會報錯，
 *        這是 TS 內建的「我預期這裡會錯」斷言，很好用）
 *    3. 執行 `npx tsc --noEmit` 應該零錯誤
 */

// ============================================================
// 共用資料模型（沿用 WMS 的語彙，比較有感）
// ============================================================

interface FabricRoll {
  _id: string;
  rollNo: string;
  weightKg: number;
  zoneCode: string;
  status: 'IN_STOCK' | 'SHIPPED' | 'HOLD';
}

const rolls: FabricRoll[] = [
  { _id: '1', rollNo: 'R001', weightKg: 25.5, zoneCode: 'A-01', status: 'IN_STOCK' },
  { _id: '2', rollNo: 'R002', weightKg: 30.0, zoneCode: 'A-01', status: 'SHIPPED' },
  { _id: '3', rollNo: 'R003', weightKg: 18.2, zoneCode: 'B-03', status: 'IN_STOCK' },
];

// ============================================================
// 3.1 先看問題：為什麼需要泛型
// ============================================================

/**
 * 版本 A：型別寫死。
 * 正確、安全，但只服務一種型別。
 * 換成 Order[] 要複製一份，換成 string[] 又一份 → 型別層級的複製貼上。
 */
function firstRoll(arr: FabricRoll[]): FabricRoll | undefined {
  return arr[0];
}

/**
 * 版本 B：用 any 想「一次搞定」。
 *
 * 關鍵理解：any 的問題不只是「不安全」，
 * 而是「參數」跟「回傳值」之間的關聯被切斷了。
 * TS 明明知道你傳進去的是 FabricRoll[]，卻在出口把這個資訊丟掉。
 */
function firstAny(arr: any[]): any {
  return arr[0];
}

const rollAny = firstAny(rolls);
console.log(rollAny.weightKgg); // ← 打錯字，編譯完全不管，執行期才 undefined

/**
 * 版本 C：泛型。把那條被切斷的線接回來。
 *
 *   function first < T >  ( arr: T[] ) : T | undefined
 *                ↑ 型別參數      ↑ 值參數
 *
 * 一句話定義：泛型是「型別層級的參數」。
 * 值參數在「呼叫時」接收值；型別參數在「呼叫時」接收型別。
 */
function first<T>(arr: T[]): T | undefined {
  return arr[0];
}

const r1 = first(rolls); // r1: FabricRoll | undefined  ✅
const r2 = first(['A', 'B']); // r2: string | undefined      ✅
const r3 = first([1, 2, 3]); // r3: number | undefined      ✅

// @ts-expect-error 型別被完整保留，所以打錯字當場被抓
console.log(r1?.weightKgg);

console.log(firstRoll(rolls), r1, r2, r3);

// ============================================================
// 3.2 型別參數的推論
// ============================================================

// 絕大多數時候不用手寫 <T>，TS 會從實際引數反推
first(rolls); // T 被推論成 FabricRoll
first<FabricRoll>(rolls); // 顯式指定，結果一樣（多打字，通常不必）

/**
 * 什麼時候需要手動指定？
 * 情況一：沒有引數可以拿來推
 */
function createEmpty<T>(): T[] {
  return [];
}

const emptyUnknown = createEmpty(); // unknown[]   ← 推不出來
const emptyRolls = createEmpty<FabricRoll>(); // FabricRoll[] ✅

/**
 * 情況二：推論結果太寬（widening，第 1 章講過的 const/let 字面量問題）
 */
function wrap<T>(value: T): { value: T } {
  return { value };
}

const w1 = wrap('IN'); // { value: string }        ← 被 widen 了
const w2 = wrap<'IN' | 'OUT'>('IN'); // { value: 'IN' | 'OUT' }  ✅

console.log(emptyUnknown, emptyRolls, w1, w2);

// ============================================================
// 3.3 泛型約束 extends
// ============================================================

/**
 * 裸的 T 幾乎什麼都不能做，因為 TS 必須假設 T「可能是任何型別」。
 *
 * function logLengthBad<T>(x: T): T {
 *   console.log(x.length);   // ❌ TS2339: Property 'length' does not exist on type 'T'
 *   return x;
 * }
 */

/**
 * 用 extends 限縮 T 的範圍。
 *
 * ⚠️ 這裡的 extends 不是 class 的「繼承」，
 *    讀作「T 必須可以指派給右邊這個型別」。
 */
function logLength<T extends { length: number }>(x: T): T {
  console.log(x.length);
  return x;
}

logLength('胚布'); // ✅ string 有 length
logLength([1, 2, 3]); // ✅ array 有 length
logLength({ length: 10, foo: 1 }); // ✅ 結構型別，形狀對得上就好（第 2 章）

// @ts-expect-error number 沒有 length
logLength(42);

/**
 * 為什麼不直接把參數型別寫成 { length: number } 就好？
 * → 因為那會「吃掉」實際傳進來的型別。
 */
function badKeepType(x: { length: number }) {
  return x;
}
const bad1 = badKeepType('胚布'); // bad1: { length: number } ← string 的方法全不見了

const good1 = logLength('胚布'); // good1: string            ← 完整保留 ✅
console.log(good1.toUpperCase()); // 所以這行才寫得出來

// @ts-expect-error bad1 已經不是 string 了
console.log(bad1.toUpperCase());

/**
 * 心智模型：
 *   約束  → 限制「可以傳什麼進來」
 *   泛型  → 保留「傳進來的到底是什麼」
 * 兩件事同時存在，才是泛型真正的價值。
 */

// ============================================================
// 3.4 keyof 與索引存取型別（實務上最常用的搭配）
// ============================================================

type RollKey = keyof FabricRoll; // '_id' | 'rollNo' | 'weightKg' | 'zoneCode' | 'status'
type Weight = FabricRoll['weightKg']; // number
type RollStatus = FabricRoll['status']; // 'IN_STOCK' | 'SHIPPED' | 'HOLD'

const k: RollKey = 'rollNo';
const kg: Weight = 25.5;
const st: RollStatus = 'IN_STOCK';
console.log("123123123",k, kg, st);

/**
 * 組起來 → 型別安全的「取欄位」工具。
 *
 * 兩個型別參數的意義：
 *   T 綁定物件、K 綁定 key
 *   K extends keyof T 把兩者鎖在一起
 */
function getField<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const roll: FabricRoll = {
  _id: '1',
  rollNo: 'R001',
  weightKg: 25.5,
  zoneCode: 'A-01',
  status: 'IN_STOCK',
};

const no = getField(roll, 'rollNo'); // no: string  ✅
const weight = getField(roll, 'weightKg'); // weight: number ✅（不是 string | number）
console.log(no.padStart(6, '0'), weight.toFixed(1));

// @ts-expect-error 'weight' 不是 FabricRoll 的欄位，打錯字當場被抓
getField(roll, 'weight');

/**
 * 對照組：不用泛型的話只能寫成這樣
 *
 *   function getFieldBad(obj: object, key: string): unknown
 *
 * → 回傳 unknown，每次用都要 narrowing；而且 key 打錯不會報錯。
 */

// ============================================================
// 3.5 泛型 interface / type
// ============================================================

/** 你的 Express API 統一回傳格式 */
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}

type RollListResponse = ApiResponse<FabricRoll[]>;
type RollDetailResponse = ApiResponse<FabricRoll>;

const listRes: RollListResponse = {
  success: true,
  data: rolls,
  timestamp: new Date().toISOString(),
};

const detailRes: RollDetailResponse = {
  success: true,
  data: roll,
  timestamp: new Date().toISOString(),
};

console.log(listRes.data.length, detailRes.data.rollNo);

/** 分頁也是同一招 */
interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

type RollPage = Paginated<FabricRoll>;

const page: RollPage = { items: rolls, total: 3, page: 1, pageSize: 20 };
console.log(page.items[0]?.rollNo); // noUncheckedIndexedAccess 下要用 ?.

/** 預設型別參數（跟函式的預設參數同一個概念） */
interface LooseResponse<T = unknown> {
  success: boolean;
  data: T;
}

const loose: LooseResponse = { success: true, data: 'anything' }; // T = unknown
console.log(loose);

// ============================================================
// 3.6 泛型 × 可辨識聯合：讓非法狀態無法被表示
// ============================================================

/**
 * 上面的 ApiResponse<T> 其實有設計瑕疵：
 * success: false 的時候 data 應該不存在，但型別上還是逼你給。
 *
 * 用「泛型 + 可辨識聯合」修掉。
 * （narrowing 的機制第 4 章正式講，這裡先看形狀）
 */
type Result<T, E = string> = { ok: true; value: T } | { ok: false; error: E };

function findRoll(rollNo: string): Result<FabricRoll> {
  const found = rolls.find((r) => r.rollNo === rollNo);
  return found ? { ok: true, value: found } : { ok: false, error: `找不到布卷 ${rollNo}` };
}

const res = findRoll('R001');
if (res.ok) {
  console.log(res.value.weightKg); // ✅ 這裡 TS 知道一定有 value
} else {
  console.log(res.error); // ✅ 這裡一定有 error，而且沒有 value 可以誤用
}

// @ts-expect-error 在 union 上直接摸 value，TS 擋下來
console.log(res.value);

/**
 * 這個 Result<T, E> 在你的 Express controller 很好用：
 *   service 層回傳 Result → controller 只負責翻成 HTTP status
 * 錯誤處理就不會散落在一堆 try/catch 裡。
 */

// ============================================================
// 3.7 泛型類別（對應你的 Mongoose repository）
// ============================================================

interface HasId {
  _id: string;
}

/** 型別參數宣告在「類別名稱後面」，整個類別內部都能用 */
class InMemoryRepository<T extends HasId> {
  private items: T[] = [];

  add(item: T): void {
    this.items.push(item);
  }

  findById(id: string): T | undefined {
    return this.items.find((i) => i._id === id);
  }

  /** Partial<T> = 把 T 所有欄位變選填（內建工具型別，第 5 章主題） */
  updateById(id: string, patch: Partial<T>): T | undefined {
    const item = this.findById(id);
    if (!item) return undefined;
    Object.assign(item, patch);
    return item;
  }

  all(): readonly T[] {
    return this.items;
  }
}

const rollRepo = new InMemoryRepository<FabricRoll>();
rolls.forEach((r) => rollRepo.add(r));

console.log(rollRepo.findById('1')?.weightKg); // ✅ 型別完整
rollRepo.updateById('1', { zoneCode: 'C-05' }); // ✅ patch 欄位也受檢查

// @ts-expect-error patch 裡的欄位名稱錯了
rollRepo.updateById('1', { zoneCod: 'C-05' });

// ============================================================
// 3.8 三個一定要知道的坑
// ============================================================

/**
 * 坑 1：泛型不是 any 的高級寫法
 *
 * function process<T>(input: T): T {
 *   return input.trim();   // ❌ T 可能是 number，沒有 trim
 * }
 *
 * 如果你發現「加了泛型結果什麼都不能做」，
 * 代表你要的其實是「約束」，或者你根本不需要泛型。
 */

/**
 * 坑 2：型別參數只出現一次 = 不需要泛型
 *
 * 這是判斷「該不該用泛型」最實用的規則：
 * 泛型的作用是「連結兩個以上的位置」（參數↔回傳值、參數↔參數）。
 * 只出現一次的話，它沒有連結任何東西，只是裝飾。
 */

// ❌ 無意義的泛型：T 只出現在參數，沒有連結任何東西
function logItBad<T>(x: T): void {
  console.log(x);
}

// ✅ 等價、而且更誠實
function logItGood(x: unknown): void {
  console.log(x);
}

logItBad(1);
logItGood(1);

/**
 * 坑 3：.tsx 檔案裡的箭頭函式泛型會被當成 JSX
 * 你是 React + Vite，這個一定會遇到。
 *
 *   const f = <T>(arr: T[]) => arr[0];              // ❌ .tsx 裡 <T> 被解析成 JSX 標籤
 *   const f = <T,>(arr: T[]) => arr[0];             // ✅ 加一個逗號
 *   const f = <T extends unknown>(arr: T[]) => ...  // ✅ 或加約束
 *   function f<T>(arr: T[]) { return arr[0]; }      // ✅ 或改用 function 宣告
 *
 * 注意：在 .ts 檔（就是現在這個檔）不會有這個問題，
 *      所以你在教材裡試不出來，但 .tsx 一定會踩到。
 */

// ============================================================
// 3.9 心智模型總結
// ============================================================

/**
 * | 概念        | 語法                  | 白話                          |
 * |------------|----------------------|------------------------------|
 * | 型別參數    | <T>                  | 呼叫時才決定的型別「洞」        |
 * | 約束        | <T extends X>        | T 必須至少長得像 X            |
 * | key 約束    | <K extends keyof T>  | K 只能是 T 真的有的欄位名      |
 * | 索引存取    | T[K]                 | 取出該欄位的值型別             |
 * | 預設參數    | <T = unknown>        | 沒指定時用這個                |
 * | 該不該用    | 型別參數出現 >= 2 次   | 少於 2 次就不要用             |
 */

export {};
