/**
 * ============================================================
 *  補充課 參考解答：型別世界 vs 值世界
 * ============================================================
 *
 *  本檔在 strict + noUncheckedIndexedAccess 下編譯零錯誤，
 *  且實際執行過，輸出正確。
 *
 *  使用方式：跟你自己的版本「並排」比對，看差在哪幾個字。
 */

// ============================================================
// 共用資料
// ============================================================

interface FabricRoll {
  _id: string;
  rollNo: string;
  weightKg: number;
  zoneCode: string;
  status: 'IN_STOCK' | 'SHIPPED' | 'HOLD';
}

interface Pallet {
  palletNo: string;
  rolls: FabricRoll[];
}

const rolls: FabricRoll[] = [
  { _id: '1', rollNo: 'R001', weightKg: 25.5, zoneCode: 'A-01', status: 'IN_STOCK' },
  { _id: '2', rollNo: 'R002', weightKg: 30.0, zoneCode: 'A-01', status: 'SHIPPED' },
];

/**
 * 這個常數本來寫在 Q5 那一節，但必須移上來 —— 原因值得單獨講一次。
 *
 * 【兩個世界的另一個差異：宣告順序】
 *
 * 型別世界「沒有順序限制」。interface Pallet 裡面用到 FabricRoll，
 * 就算 FabricRoll 寫在下面也完全合法 —— 型別在編譯期一次全部解析。
 *
 * 值世界「有順序限制」。const / let 有 TDZ（暫時性死區），
 * 在宣告之前存取會拋 ReferenceError。
 *
 * 我第一版把 VALID_STATUSES 留在 Q5，
 * 但 Q2(c) 的 isPallet 在模組載入時就呼叫了 isFabricRoll（→ isRollStatus → VALID_STATUSES），
 * 結果：
 *
 *   ReferenceError: Cannot access 'VALID_STATUSES' before initialization
 *
 * tsc 零錯誤，執行才炸。（function 宣告會被提升，const 不會 —— 所以炸的是常數不是函式。）
 *
 * → 又一次「編譯過 ≠ 能跑」。而且這個 bug 的成因正好就是本堂課的主題。
 */
const VALID_STATUSES = ['IN_STOCK', 'SHIPPED', 'HOLD'] as const;

// ============================================================
// Q1 — 判斷世界
// ============================================================

/**
 * ★1  Order（interface 的名字）     → 型別世界
 * ★2  string                       → 型別世界
 * ★3  order（const 的名字）         → 值世界
 * ★4  'SO-001'                     → 值世界
 * ★5  keyof Order                  → 型別世界（keyof 只存在於型別世界）
 * ★6  ship（function 的名字）       → 值世界  ← 最多人答錯
 * ★7  <T extends Order> 裡的 T      → 型別世界
 * ★8  T[]（回傳型別位置）            → 型別世界
 * ★9  console.log(typeof order)    → 值世界（JS 的 typeof，回傳字串）
 * ★10 type O = typeof order        → 型別世界（TS 的 typeof，取值的型別）
 *
 * 【★6 為什麼是值世界】
 * ship 是函式的名字。編譯成 JS 之後它還在，你還要 ship(order) 呼叫它。
 *
 * 會答錯通常是被同一行的 <T extends Order> 干擾。
 * 注意這一行同時橫跨兩個世界，要「逐個位置」判斷：
 *
 *   function ship < T extends Order > ( x : T ) : T[] {
 *            ^^^^   ^^^^^^^^^^^^^^^^    ^   ^^^   ^^^
 *            值     型別                值  型別   型別
 */

// ============================================================
// Q2 (a) — readonly {} 的兩個問題
// ============================================================

/**
 * 原始碼：
 *   function summarize(items: readonly {}, label: string): string {
 *     return `${label}: ${items.length} 筆`;
 *   }
 *
 * 問題一：{} 在型別世界不是「空物件」
 *   它的意思是「除了 null 和 undefined 以外的任何值」：
 *     let x: {} = 42;       ✅
 *     let y: {} = 'hello';  ✅
 *     let z: {} = [1,2,3];  ✅
 *     let w: {} = null;     ❌ 只有 null / undefined 不行
 *   所以 {} 幾乎不做任何限制 —— 跟「空物件」的直覺正好相反。
 *   這是 TS 最反直覺的符號之一。
 *
 * 問題二：readonly 修飾符只能加在「陣列與 tuple 型別」前面
 *   readonly {} 本身就是語法錯誤：
 *   'readonly' type modifier is only permitted on array and tuple literal types.
 *
 * 問題三（連鎖反應）：{} 上面沒有 .length，所以 items.length 也報錯
 *
 * 【關鍵】[] 要「接在某個型別後面」才是陣列的意思：
 *   FabricRoll[]  → FabricRoll 的陣列
 *   {}            → 完全是另一個東西
 *   []            → 空 tuple（長度必須為 0）
 */

function summarize(items: readonly FabricRoll[], label: string): string {
  return `${label}: ${items.length} 筆`;
}

// 想更通用就用泛型（第 3 章）
function summarizeGeneric<T>(items: readonly T[], label: string): string {
  return `${label}: ${items.length} 筆`;
}

console.log(summarize(rolls, '庫存'));
console.log(summarizeGeneric([1, 2, 3], '數字'));

// ============================================================
// Q2 (b) — 值被用在型別位置（TS2749）
// ============================================================

const DEFAULT_ZONE = 'A-01';

/**
 * 原始碼：
 *   function assignZone(roll: FabricRoll, zone: DEFAULT_ZONE): FabricRoll
 *                                               ^^^^^^^^^^^^
 * 問題：冒號後面是【型別世界】，但 DEFAULT_ZONE 是 const，屬於【值世界】。
 *
 *   TS2749: 'DEFAULT_ZONE' refers to a value, but is being used as a type here.
 *           Did you mean 'typeof DEFAULT_ZONE'?
 *
 * ⚠️ 這跟第 3 章 Q5 的 Result<roll, MoveRollError> 是「同一個錯」。
 *    錯誤訊息本身就在提示那座橋：typeof。
 *
 * 注意 roll: FabricRoll 本身完全正確，不是問題所在。
 */

// 修正一：意圖是「這個參數只能傳 'A-01'」
function assignDefaultZone(
  roll: FabricRoll,
  zone: typeof DEFAULT_ZONE, // 型別是字面量 'A-01'，因為 DEFAULT_ZONE 是 const
): FabricRoll {
  return { ...roll, zoneCode: zone };
}

// @ts-expect-error 只接受 'A-01'
assignDefaultZone(rolls[0]!, 'B-03');

// 修正二：意圖是「任何儲位代碼都能傳」（比較可能是真實需求）
function assignZone(roll: FabricRoll, zone: string): FabricRoll {
  return { ...roll, zoneCode: zone };
}

console.log(assignZone(rolls[0]!, 'C-05').zoneCode);

/**
 * 【為什麼 typeof DEFAULT_ZONE 是 'A-01' 而不是 string】
 * DEFAULT_ZONE 用 const 宣告，值不會再變，所以 TS 推論成字面量型別（第 1 章 widening）。
 * 若寫成 let DEFAULT_ZONE = 'A-01'，typeof 就會是 string。
 */

// ============================================================
// Q2 (c) — interface 不能 instanceof
// ============================================================

/**
 * 原始碼：
 *   if (input instanceof Pallet) { ... }
 *
 * 問題：instanceof 是【值世界】的運算子，右邊必須是一個「執行期存在的建構函式」。
 *      interface 編譯後完全消失，執行期沒有 Pallet 這個東西可以比對。
 *
 *   TS2693: 'Pallet' only refers to a type, but is being used as a value here.
 *
 * 【常見的二次錯誤】修正時很容易再犯一次跨世界錯誤：
 *
 *   typeof (x as Pallet).rolls === FabricRoll[]    // ❌
 *                                 ^^^^^^^^^^^^^
 *   === 是值世界的運算子，右邊必須是值。FabricRoll[] 是型別，執行期不存在。
 *   而且 JS 的 typeof 只會回傳七個字串之一：
 *     'string' 'number' 'boolean' 'object' 'function' 'undefined' 'symbol'
 *   它永遠不可能回傳 FabricRoll[]。
 *
 *   檢查陣列要用值世界的工具：Array.isArray(...)
 */

function isPallet(x: unknown): x is Pallet {
  if (typeof x !== 'object' || x === null) return false;
  const o = x as Record<string, unknown>;
  if (typeof o.palletNo !== 'string') return false;
  if (!Array.isArray(o.rolls)) return false; // ← 值世界的工具
  return o.rolls.every(isFabricRoll); // 想更嚴格：逐個元素驗
}

console.log(isPallet({ palletNo: 'P-01', rolls: [rolls[0]] })); // true
console.log(isPallet({ palletNo: 'P-01', rolls: 'not array' })); // false
console.log(isPallet(null)); // false

// ============================================================
// Q3 — 用 typeof 消除重複維護
// ============================================================

const dbConfig = {
  host: 'localhost',
  port: 27017,
  dbName: 'wms',
  retryWrites: true,
};

// (a) 手寫的 interface DbConfigManual 已刪除，改成：
type DbConfig = typeof dbConfig;
// → { host: string; port: number; dbName: string; retryWrites: boolean }

// (b) 參數型別用產生出來的那個型別
function printConfig(config: DbConfig): void {
  console.log(
    `mongodb://${config.host}:${config.port}/${config.dbName}` +
      ` (retryWrites=${config.retryWrites})`,
  );
}

printConfig(dbConfig);

// 形狀對得上就收（第 2 章結構型別）——這就是「傳參數」而非「抓外層變數」的價值
const testConfig = { host: 'test.local', port: 27017, dbName: 'wms_test', retryWrites: false };
printConfig(testConfig);

// @ts-expect-error 少了欄位
printConfig({ host: 'x', port: 1 });

/**
 * (c)【代價】型別跟著值走 —— 改值不會報錯，型別會「靜靜地」跟著變
 *
 * 常見誤解：以為改值會報錯。恰恰相反，不報錯才是代價。
 *
 *   const dbConfig = { port: 27017 };   // DbConfig.port 是 number
 *   // 三個月後有人改成：
 *   const dbConfig = { port: '27017' }; // DbConfig.port「自動」變成 string
 *                                       // printConfig 參數型別自動跟著變
 *                                       // 所有呼叫端自動接受字串
 *                                       // 零錯誤、零警告
 *
 * typeof 的本質是「值是唯一的真相來源」。值變了型別就跟著變，
 * 於是沒有任何東西在「規定」型別 —— 規格消失了。
 *
 * | | 手寫 interface | typeof |
 * |---|---|---|
 * | 真相來源 | 型別（規格優先） | 值（實作優先） |
 * | 改值不符規格 | 報錯 ✅ | 靜靜跟著變 ⚠️ |
 * | 維護成本 | 兩份要同步 | 一份 |
 * | 適合 | 對外契約、API schema | 內部設定、常數表 |
 *
 * 【兩全其美：satisfies（TS 4.9+，第 5 章會講）】
 * 「檢查它符合規格，但型別仍用推論出來的精確版本」：
 */

interface DbConfigShape {
  host: string;
  port: number;
  dbName: string;
  retryWrites: boolean;
}

const checkedConfig = {
  host: 'localhost',
  port: 27017,
  dbName: 'wms',
  retryWrites: true,
} satisfies DbConfigShape;

console.log(checkedConfig.host);

/**
 * 【順帶一提的 widening】
 * retryWrites: true 被推論成 boolean，不是字面量 true。
 * 因為物件字面量的屬性是可變的（第 1 章 widening）。
 * 想保留 true 要加 as const。
 */
const frozenConfig = { retryWrites: true } as const;
// frozenConfig.retryWrites 的型別是 true，不是 boolean
console.log(frozenConfig.retryWrites);

// ============================================================
// Q4 — as const + 索引存取
// ============================================================

const ROLL_STATUSES = ['IN_STOCK', 'SHIPPED', 'HOLD', 'SCRAPPED'] as const;
//                                                                ^^^^^^^^
//                                     沒有它，型別會被 widen 成 string[]

type RollStatus = (typeof ROLL_STATUSES)[number];
// → 'IN_STOCK' | 'SHIPPED' | 'HOLD' | 'SCRAPPED'

function isFinalStatus(status: RollStatus): boolean {
  return status === 'SHIPPED' || status === 'SCRAPPED';
}

/**
 * 【拆解 (typeof ROLL_STATUSES)[number]】
 *   ROLL_STATUSES          值世界的陣列
 *   as const               鎖住字面量，並讓它變成 readonly tuple
 *   typeof ROLL_STATUSES   過橋 → readonly ['IN_STOCK','SHIPPED','HOLD','SCRAPPED']
 *   [number]               型別世界的索引存取：「用 number 索引會拿到什麼」→ union
 *
 * ⚠️ 括號不可少。寫成 typeof (ROLL_STATUSES[number]) 是語法錯誤，
 *    因為 ROLL_STATUSES[number] 在值世界不成立（number 是型別不是數字）。
 *
 * 【這題的價值】一份宣告同時服務兩個世界：
 *   執行期 → .map() 給前端做下拉選單
 *   編譯期 → 型別剛好是那四個字串
 *   新增一個狀態只改一個地方，兩邊同時更新。
 *
 * 這個思路跟 zod 是同一個（見 Q6c）。
 */

console.log(isFinalStatus('SHIPPED')); // true
console.log(isFinalStatus('IN_STOCK')); // false

// @ts-expect-error 不在清單裡
isFinalStatus('LOST');

// 值世界也要能用
console.log(ROLL_STATUSES.map((s) => s.toLowerCase()));

// ============================================================
// Q5 — 型別謂詞
// ============================================================

// VALID_STATUSES 宣告在檔案開頭（原因見那裡的 TDZ 說明）

function isRollStatus(v: unknown): v is FabricRoll['status'] {
  return typeof v === 'string' && (VALID_STATUSES as readonly string[]).includes(v);
}

function isFabricRoll(x: unknown): x is FabricRoll {
  // 步驟一：先擋掉非物件與 null（第 1 章：typeof null === 'object'）
  if (typeof x !== 'object' || x === null) return false;

  // 步驟二：斷言一次成 Record<string, unknown>，後面就不必每個欄位都寫 as
  const o = x as Record<string, unknown>;

  // 步驟三：一條一條擋，絕不寫成一長串 && / ||
  if (typeof o._id !== 'string') return false;
  if (typeof o.rollNo !== 'string') return false;
  if (typeof o.weightKg !== 'number') return false;
  if (typeof o.zoneCode !== 'string') return false;
  if (!isRollStatus(o.status)) return false;

  return true;
}

/**
 * 【為什麼用 early return 而不是一個大運算式】
 *
 * 常見寫法會變成這樣：
 *
 *   return (
 *     ( A && B && C && ... && x.status == 'IN_STOCK' )
 *     || x.status == 'HOLD'
 *     || x.status == 'SHIPPED'
 *   );
 *
 * 意圖是「所有欄位都對 且 status 是三者之一」，
 * 實際寫成的是「(全部檢查 且 status是IN_STOCK) 或 status是HOLD 或 status是SHIPPED」。
 * 後兩個 || 完全繞過前面所有檢查，實測結果：
 *
 *   isFabricRoll({ status: 'HOLD' })  → true   ❌ 只有一個欄位就通過
 *   isFabricRoll(null)                → 💥 TypeError（走到 null.status）
 *
 * 而 tsc 零錯誤 —— 運算子優先權是邏輯問題，型別系統管不著。
 * （同一個坑：第 2 章 Q3 的 zone.capacity ?? -used）
 *
 * 習慣性對策：條件超過三個就不要寫成一個運算式，改成逐條 early return。
 * 這跟第 3 章 Q5 moveRoll 的 guard clause 是同一個模式。
 *
 * ------------------------------------------------------------
 * (d)【TS 有驗證你這個函式檢查對了嗎？】
 *
 *     完全沒有。
 *
 * 你寫 `x is FabricRoll`，TS 就無條件相信。
 * 如果你的檢查漏了 weightKg，TS 照樣讓下游去 .toFixed(2)。
 *
 *   → 型別謂詞是「承諾」，不是「證明」。
 *
 * 而且蓋歪的橋比沒有橋更危險：下游會「完全信任」它，
 * 反而失去警覺。這跟第 3 章 Q6(a) 的 toArray<number>('字串') 是同一件事 ——
 * 你授權 TS 撒謊，它就撒謊。
 *
 * 這正是實務上用 zod 而不是手寫型別謂詞的理由：
 * schema 產生的檢查與型別「同源」，不會不一致。
 */

const fromApi: unknown = {
  _id: '9',
  rollNo: 'R009',
  weightKg: 20,
  zoneCode: 'C-01',
  status: 'IN_STOCK',
};

if (isFabricRoll(fromApi)) {
  console.log(fromApi.rollNo, fromApi.weightKg.toFixed(2)); // ✅ 這裡有完整型別
}

console.log(isFabricRoll(null)); // false（不會炸）
console.log(isFabricRoll({ rollNo: 'R001' })); // false（欄位不齊）
console.log(isFabricRoll({ ...rolls[0], status: 'FLYING' })); // false（status 不合法）
console.log(isFabricRoll({ status: 'HOLD' })); // false（這個是重點）

// ============================================================
// Q6 — 觀念題
// ============================================================

/**
 * ------------------------------------------------------------
 * (a) 為什麼 class 可以 instanceof，interface 不行？
 * ------------------------------------------------------------
 * interface 只活在型別世界，編譯後完全消失，
 * 執行期沒有任何東西叫 Pallet，instanceof 沒有對象可以比對。
 *
 * class 宣告則「同時」建立一個值（建構函式）和一個型別。
 * 編譯後那個建構函式還在，所以 instanceof 有東西可比。
 *
 *   class StockZone {}
 *   const z = new StockZone();   // ← 值世界：class 是建構函式
 *   let t: StockZone;            // ← 型別世界：class 名稱當型別
 *   z instanceof StockZone;      // ✅ 因為它在值世界存在
 *
 * 同時活在兩個世界的還有 enum（建議少用）和 namespace（舊時代產物）。
 *
 * ------------------------------------------------------------
 * (b) as FabricRoll 遇上髒資料，TS 什麼時候發現？
 * ------------------------------------------------------------
 *     永遠不會發現。
 *
 * 關鍵在那個 as：
 *   const roll = await Roll.findById(id) as FabricRoll;
 *                                        ^^ 型別斷言
 *
 * as 的意思是「我保證這是 FabricRoll，別檢查了」。
 * 不是 TS「沒能力檢查」，是你「叫它不要檢查」。
 *
 * 而且 TS 在執行期根本不存在，所以連「執行期才發現」都不對 ——
 * 發現的是 JS 引擎，在 '25.5'.toFixed(2) 這行丟出
 *   TypeError: roll.weightKg.toFixed is not a function
 *
 * 同樣的道理：Mongoose 的 schema 只在「寫入時」驗證，
 * 讀出來的資料形狀取決於 DB 裡實際存了什麼（可能是舊版 schema 寫進去的）。
 *
 * ------------------------------------------------------------
 * (c) zod 補的是哪一個世界的洞？
 * ------------------------------------------------------------
 *     值世界。
 *
 * 邏輯鏈：
 *   1. 型別世界編譯後消失，對執行期資料零約束
 *   2. 外部資料（req.body、API 回應、DB 查詢結果）在執行期才進來
 *   3. 所以型別標註對它們「本質上」無能為力 —— 這不是缺陷，是設計
 *   4. 要檢查，只能在值世界寫「真的會執行」的程式碼
 *   5. zod 就是那段程式碼，跟 Q5 手寫的型別謂詞是同一類東西，只是更完整
 *
 * zod 的精妙處在於它「同時服務兩個世界」：
 *
 *   const RollSchema = z.object({ rollNo: z.string(), weightKg: z.number() });
 *   RollSchema.parse(req.body);              // 值世界：真的執行檢查，不合法就 throw
 *   type Roll = z.infer<typeof RollSchema>;  // 型別世界：型別自動推出來
 *
 * 一份宣告、兩個世界共用 —— 跟 Q4 的 as const + typeof + [number] 完全同源。
 * 而且因為檢查和型別來自同一個 schema，不可能像手寫型別謂詞那樣「不一致」。
 * 第 10 章會實作。
 */

// ============================================================
// 本堂回顧
// ============================================================

/**
 * 1. 判斷世界的唯一口訣：「編譯成 JS 之後它還在嗎？」
 * 2. 同一行程式碼可以橫跨兩個世界，要逐個位置判斷
 * 3. 兩個世界有獨立命名空間，可以同名（所以慣例命名很重要）
 * 4. 值 → 型別：typeof（唯一正式橋樑）
 * 5. 型別 → 值：沒有橋。只能自己在值世界寫檢查（型別謂詞 / zod）
 * 6. 符號在兩個世界意思不同：[] {} typeof extends in ?: | &
 * 7. as 和型別謂詞都是「承諾」，TS 不驗證 —— 承諾錯了它會照樣相信
 * 8. typeof 讓型別跟著值走，代價是「值變型別跟著變，沒有規格可言」
 */

export {};
