/**
 * ============================================================
 *  補充課：型別世界 vs 值世界
 *  （第 3 章與第 4 章之間的橋）
 * ============================================================
 *
 *  為什麼要補這堂：
 *  你在 Q5 寫了這兩行，兩個都是同一個根因 ——
 *
 *      roll: readonly []                 // 以為是「readonly 陣列」
 *      Result<roll, MoveRollError>       // 把參數名當型別用
 *
 *  這不是泛型沒學好。是 TS 有「兩套平行的命名空間」這件事還沒被講透。
 *  講透之後，第 4 章的 narrowing 會順很多，
 *  因為 narrowing 整章都在處理「值的形狀如何影響型別」。
 *
 *  本檔在 strict 下編譯零錯誤。標了 @ts-expect-error 的行，
 *  刪掉指令看真正的錯誤訊息。
 */

// ============================================================
// 1. 核心概念：TS 是兩套語言疊在一起
// ============================================================

/**
 * TypeScript = JavaScript（值世界）+ 一套獨立的型別語言（型別世界）
 *
 *   值世界   → 編譯後「保留」，變成真正的 JS，執行期存在
 *   型別世界 → 編譯後「完全消失」，執行期一點痕跡都沒有
 *
 * 這兩個世界有各自的：
 *   - 命名空間（所以可以同名而不衝突）
 *   - 語法（同一個符號在兩邊意思不同）
 *   - 運算子（keyof、extends、? : 在型別世界有完全不同的意義）
 *
 * 第 1 章講過「型別在執行期完全消失」，
 * 當時是在講「TS 擋的是自己寫錯，不是髒資料」。
 * 這堂課要講的是同一件事的另一面：
 *   既然是兩個世界，你就必須隨時知道「我現在寫的這個字，在哪一邊」。
 */

// ============================================================
// 2. 怎麼判斷自己在哪個世界：看「位置」，不是看「名字」
// ============================================================

/**
 * 【型別世界】的位置（編譯後消失）
 *   - 冒號 : 後面            const x: ★
 *   - interface / type 裡面   type A = ★
 *   - 泛型角括號 <> 裡面      Array<★>、function f<★>()
 *   - extends 約束後面        <T extends ★>
 *   - as 後面                 x as ★
 *   - 函式回傳型別位置        function f(): ★
 *   - satisfies 後面
 *
 * 【值世界】的位置（編譯後保留）
 *   - const / let / var 宣告的名字
 *   - function 的名字、參數的名字
 *   - 等號 = 右邊的運算式
 *   - 函式呼叫的引數 f(★)
 *   - 物件字面量、陣列字面量的內容
 *
 * 判斷口訣：
 *   「這個東西編譯成 JS 之後還在嗎？」
 *   在 → 值世界。不在 → 型別世界。
 */

// ============================================================
// 3. 實際看一次「消失」
// ============================================================

interface Zone {
  code: string;
  capacity: number;
}

type ZoneCode = Zone['code'];

const zoneA: Zone = { code: 'A-01', capacity: 100 };

function describeZone(z: Zone): string {
  return `${z.code} (${z.capacity})`;
}

console.log(describeZone(zoneA));

/**
 * 上面這五個宣告，編譯成 JS 之後只剩下兩個：
 *
 *   const zoneA = { code: 'A-01', capacity: 100 };
 *   function describeZone(z) {
 *     return `${z.code} (${z.capacity})`;
 *   }
 *   console.log(describeZone(zoneA));
 *
 * interface Zone → 不見了
 * type ZoneCode  → 不見了
 * : Zone、: string → 不見了
 *
 * 這就是為什麼你不能在執行期問「這個物件是不是 Zone」——
 * Zone 在執行期根本不存在，沒有東西可以問。
 */

// ============================================================
// 4. 同名不衝突：你 Q3 的 key: k 為什麼能編譯
// ============================================================

type user = { name: string }; // 型別世界的 user
const user = { name: 'xin-chang' }; // 值世界的 user（完全不衝突）

const u1: user = user; // 冒號後 = 型別世界的 user；等號右 = 值世界的 user
console.log(u1.name);

/**
 * 你 Q3 寫的：
 *
 *   function groupBy<T extends Record<k, string>, k extends string>(arr: T[], key: k)
 *                                                                        ^^^^^^^^
 *                                            值世界的 key ────────────────┘   └─── 型別世界的 k
 *
 * 這能編譯，因為兩邊在不同命名空間。
 * 但這也正是它危險的地方：TS 不會警告你，全靠你自己記得誰是誰。
 *
 * → 慣例（型別參數用大寫 T/K/V/E/R）不只是美觀，
 *   它的實際功能是「讓你一眼看出這個識別字屬於哪個世界」。
 */

// ============================================================
// 5. 從值世界到型別世界的橋：typeof
// ============================================================

/**
 * ⚠️ TS 的 typeof 和 JS 的 typeof 是「兩個不同的東西」，只是長得一樣。
 *
 *   出現在【值世界】→ JS 的 typeof，回傳 'string' / 'number' / 'object' ...
 *   出現在【型別世界】→ TS 的 typeof，把一個「值」的型別撈出來
 *
 * 判斷方法還是看位置。
 */

const dbConfig = {
  host: 'localhost',
  port: 27017,
  dbName: 'wms',
};

// 值世界的 typeof（JS）：這是一個「運算式」，會執行，回傳字串
console.log(typeof dbConfig); // 印出 'object'

// 型別世界的 typeof（TS）：這是一個「型別運算」，編譯後消失
type DbConfig = typeof dbConfig;
// → { host: string; port: number; dbName: string }

const anotherConfig: DbConfig = {
  host: '192.168.1.10',
  port: 27017,
  dbName: 'wms_test',
};
console.log(anotherConfig);

/**
 * 【實務價值】
 * 你的 WMS 常有一份「設定物件」或「常數表」已經寫在值世界了。
 * 與其再手寫一份 interface（兩份要同步維護、遲早不一致），
 * 不如用 typeof 讓型別「跟著值走」。
 *
 * 這是少數「值 → 型別」的方向，也是唯一的正式橋樑。
 */

// ============================================================
// 6. typeof + as const：把值世界的資訊完整帶進型別世界
// ============================================================

const ZONE_CODES = ['A-01', 'A-02', 'B-03'] as const;
//                                            ^^^^^^^^ 沒有它，型別會被 widen 成 string[]

type ZoneCodeUnion = (typeof ZONE_CODES)[number];
// → 'A-01' | 'A-02' | 'B-03'

/**
 * 拆解 (typeof ZONE_CODES)[number]：
 *   typeof ZONE_CODES        → readonly ['A-01', 'A-02', 'B-03']   （值 → 型別）
 *   [number]                 → 索引存取：取「用 number 索引會拿到什麼」
 *                            → 'A-01' | 'A-02' | 'B-03'            （union）
 *
 * 注意 [number] 這個寫法：它在型別世界，number 是型別不是數字。
 * 在值世界寫 arr[number] 是語法錯誤。同樣的中括號，兩個世界兩種意思。
 */

function isValidZone(code: ZoneCodeUnion): boolean {
  return ZONE_CODES.includes(code);
}
console.log(isValidZone('A-01'));

// @ts-expect-error 'C-99' 不在那三個字面量裡
isValidZone('C-99');

/**
 * 【為什麼這招重要】
 * 一份資料（ZONE_CODES）同時服務兩個世界：
 *   執行期 → 可以 .includes()、.map()、丟給前端當下拉選單
 *   編譯期 → 型別自動是那三個字串的 union
 * 新增一個儲位代碼，只改一個地方，兩邊同時更新。
 *
 * 第 5 章會正式講 as const，這裡先感受它「跨世界」的作用。
 */

// ============================================================
// 7. 反方向沒有橋：型別世界 → 值世界
// ============================================================

interface FabricRoll {
  _id: string;
  rollNo: string;
  weightKg: number;
}

declare const maybeRoll: unknown;

// @ts-expect-error 'FabricRoll' only refers to a type, but is being used as a value
console.log(maybeRoll instanceof FabricRoll);

/**
 * interface 在執行期不存在，所以：
 *   ❌ 不能 instanceof
 *   ❌ 不能當函式引數傳進去
 *   ❌ 不能 Object.keys(SomeInterface)
 *   ❌ 不能在 if 裡判斷「x 是不是 FabricRoll」
 *
 * 想在執行期檢查形狀，只能「自己用值世界的程式碼寫一次」：
 */
function isFabricRoll(x: unknown): x is FabricRoll {
  return (
    typeof x === 'object' && // ← 這裡是 JS 的 typeof（值世界）
    x !== null && // typeof null === 'object'，第 1 章的坑
    'rollNo' in x &&
    typeof (x as FabricRoll).rollNo === 'string'
  );
}

console.log(isFabricRoll({ _id: '1', rollNo: 'R001', weightKg: 25 }));
console.log(isFabricRoll('not a roll'));

/**
 * 那個 `x is FabricRoll` 回傳型別叫「型別謂詞 type predicate」，
 * 意思是「如果我回傳 true，請把 x 當成 FabricRoll」。
 * 這是第 4 章的主題，這裡先知道它的存在意義：
 *
 *   它是你「手動搭建」的橋 —— TS 沒辦法自動檢查執行期的形狀，
 *   所以你寫一段值世界的檢查邏輯，然後告訴型別世界「相信我」。
 *
 * ⚠️ TS 不會驗證你寫得對不對。上面那個函式只檢查了 rollNo，
 *   沒檢查 weightKg，但 TS 照樣相信。型別謂詞是承諾，不是證明。
 *
 * 【接到你的實務】
 * 這正是 zod 這類函式庫存在的理由：
 * 從外部進來的資料（req.body、API 回應、MongoDB 查詢結果）
 * 型別標註完全擋不住髒資料，必須在值世界真的檢查一次。
 * 第 10 章會做這件事。
 */

// ============================================================
// 8. 少數「同時活在兩個世界」的東西
// ============================================================

/**
 * class 是特例：一個 class 宣告同時建立了「一個值」和「一個型別」。
 */
class StockZone {
  constructor(
    public code: string,
    public capacity: number,
  ) {}

  isFull(used: number): boolean {
    return used >= this.capacity;
  }
}

const zoneValue = new StockZone('A-01', 100); // ← 值世界：class 是建構函式
let zoneType: StockZone; // ← 型別世界：class 名稱當型別用
zoneType = zoneValue;
console.log(zoneType.isFull(120));

// 因為它在值世界存在，所以 instanceof 可以用（對比第 7 節的 interface）
console.log(zoneValue instanceof StockZone); // true

/**
 * 同時存在兩個世界的還有：
 *   - enum（但建議少用，第 5 章會講為什麼；as const 物件通常更好）
 *   - namespace（舊時代產物，現代專案不用）
 *
 * 其他都只活在單一世界：
 *   只在型別世界：interface、type、泛型參數 <T>
 *   只在值世界：  const、let、function、物件字面量
 */

// ============================================================
// 9. 同一個符號，兩個世界，不同意思（重點對照表）
// ============================================================

/**
 * | 符號       | 值世界的意思                | 型別世界的意思                    |
 * |-----------|---------------------------|---------------------------------|
 * | []        | 空陣列（一個值）              | 空 tuple（長度必須為 0 的陣列型別） |
 * | {}        | 空物件（一個值）              | 「非 null/undefined 的任何值」     |
 * | typeof    | JS 運算子，回傳字串           | 取出某個值的型別                   |
 * | extends   | class 繼承                  | 泛型約束 / 條件型別                |
 * | in        | 'k' in obj，檢查屬性存在      | mapped type 的迭代               |
 * | ?:        | 三元運算子                   | 條件型別（第 5 章之後）             |
 * | [number]  | 語法錯誤                     | 索引存取，取陣列元素型別            |
 * | \|        | 位元 OR                     | union 型別                       |
 * | &         | 位元 AND                    | intersection 型別（第 2 章）       |
 */

// 示範 [] 和 {} 的差別
const emptyArrValue: number[] = []; // 值世界：這個 [] 是空陣列
type EmptyTuple = []; // 型別世界：這個 [] 是「長度必須為 0」

const t1: EmptyTuple = [];
// @ts-expect-error 空 tuple 不接受任何元素
const t2: EmptyTuple = [1];

console.log(emptyArrValue, t1, t2);

// ============================================================
// 10. 解剖你 Q5 的兩個錯誤
// ============================================================

/**
 * 【錯誤一】
 *
 *   function moveRoll(roll: readonly [], ...)
 *                           ^^^^^^^^^^^
 *   冒號後面 = 型別世界。這裡的 [] 不是「陣列」，是「空 tuple」。
 *   所以這個參數只接受 []（真的空陣列），傳 rolls 進去會報錯。
 *
 *   你想寫的是：readonly FabricRoll[]
 *   注意 T[] 這個寫法：中括號要「接在某個型別後面」才是陣列的意思。
 */
function correctSignature(items: readonly FabricRoll[]): number {
  return items.length;
}
console.log(correctSignature([]));

/**
 * 【錯誤二】
 *
 *   function moveRoll(roll: readonly [], ...): Result<roll, MoveRollError>
 *                                                      ^^^^
 *   角括號裡 = 型別世界。roll 是「參數名」，屬於值世界。
 *
 *   error TS2749: 'roll' refers to a value, but is being used as a type here.
 *                 Did you mean 'typeof roll'?
 *
 *   TS 的錯誤訊息已經直接告訴你答案了 —— 它在提示你用那座橋。
 *   不過這個情境下你要的不是 typeof roll（那會是「陣列」的型別），
 *   而是直接寫元素型別：Result<FabricRoll, MoveRollError>
 */

type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

declare function correctReturn(
  items: readonly FabricRoll[],
  rollNo: string,
): Result<FabricRoll, string>;

console.log(typeof correctReturn);

/**
 * 【延伸：什麼時候真的該用 typeof 參數名】
 * 當你想說「回傳值跟參數同型別」時，正解是用泛型（第 3 章），不是 typeof：
 *
 *   function identity<T>(x: T): T          // ✅
 *   function identity(x: unknown): typeof x // ❌ 這樣寫沒有意義
 *
 * typeof 的主場是「對已存在的具名值取型別」，例如 typeof dbConfig。
 */

// ============================================================
// 11. 一個實務上會遇到的細節：import type
// ============================================================

/**
 * 因為型別編譯後會消失，只被當型別用的 import 也應該一起消失：
 *
 *   import type { FabricRoll } from './models';   // 編譯後這行完全不見
 *   import { connectDb } from './db';             // 編譯後保留
 *
 * 不寫 type 通常也能跑（編譯器會自己判斷），
 * 但在 Vite / esbuild 這類「逐檔轉譯、不做跨檔分析」的工具鏈下，
 * 沒標 type 可能導致它保留一個其實不存在的 import，執行期報錯。
 *
 * 你用 Vite，所以養成習慣：只當型別用的 import 就加上 type。
 * 第 6 章（tsconfig 與模組）會再談 verbatimModuleSyntax 這個選項。
 */

// ============================================================
// 12. 心智檢查清單
// ============================================================

/**
 * 寫 TS 卡住時，問自己這三個問題：
 *
 * 1. 我現在寫的這個位置，是型別世界還是值世界？
 *    → 看它編譯成 JS 之後還在不在。
 *
 * 2. 我想用的這個識別字，活在哪個世界？
 *    → interface/type 只在型別世界；const/參數名 只在值世界；class 兩邊都有。
 *
 * 3. 如果跨世界了，橋在哪？
 *    → 值 → 型別：typeof（唯一正式橋樑）
 *    → 型別 → 值：沒有橋。只能自己在值世界寫一段檢查邏輯（型別謂詞 / zod）。
 *
 * 這三個問題能解掉你目前 90% 的「我以為這樣寫應該可以」。
 */

export {};
