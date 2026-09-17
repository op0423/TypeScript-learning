/**
 * ============================================================
 *  第 4 章：型別縮小 Narrowing 與型別守衛 Type Guard
 * ============================================================
 *
 *  使用方式：
 *  - 每一節都請把游標停在變數上（hover），看 VS Code 顯示的型別「在不同行變成什麼」。
 *    這章的核心能力就是：看得出同一個變數在第 N 行是什麼型別、為什麼。
 *  - 標了 @ts-expect-error 的行，刪掉指令看真正的錯誤訊息。
 *  - 本檔在 strict + noUncheckedIndexedAccess 下編譯零錯誤。
 *  - 執行：npx tsx src/04-narrowing.ts（4.8、4.9 有「tsc 過但執行爆掉」的實測）
 *
 *  本章地圖：
 *    4.0  narrowing 是什麼 —— 以及它為什麼「只能」用值世界的運算子
 *    4.1  typeof
 *    4.2  真值縮小 truthiness（第 1 章 ?? 問題的型別版本）
 *    4.3  相等縮小 === / != null
 *    4.4  in 運算子（含選填屬性陷阱）
 *    4.5  instanceof（含 interface 為什麼不行）
 *    4.6  Array.isArray
 *    4.7  可辨識聯合 Discriminated Union ★ 本章最重要
 *    4.8  控制流分析：早退、重新指派、閉包、以及 TS 故意放過的洞
 *    4.9  自訂型別守衛 x is T —— TS 無條件相信你
 *    4.10 斷言函式 asserts
 *    4.11 as 不是 narrowing
 *    4.12 心智模型總結
 */

// ============================================================
// 共用資料（沿用第 3 章的布卷）
// ============================================================

type RollStatus = 'IN_STOCK' | 'SHIPPED' | 'HOLD';

interface FabricRoll {
  _id: string;
  rollNo: string;
  weightKg: number;
  zoneCode: string;
  status: RollStatus;
}

const rolls: FabricRoll[] = [
  { _id: '1', rollNo: 'R001', weightKg: 25.5, zoneCode: 'A-01', status: 'IN_STOCK' },
  { _id: '2', rollNo: 'R002', weightKg: 30.0, zoneCode: 'A-01', status: 'SHIPPED' },
  { _id: '3', rollNo: 'R003', weightKg: 0, zoneCode: 'B-03', status: 'HOLD' },
];

// ============================================================
// 4.0 narrowing 是什麼
// ============================================================

/**
 * 一個變數有兩種型別：
 *
 *   宣告型別 declared type  —— 你寫在冒號後面的，整個作用域都不變
 *   縮小型別 narrowed type  —— TS 在「某一行」根據前面的 if / return / switch 算出來的
 *
 * TS 會沿著程式碼的每條執行路徑走一遍（控制流分析 control flow analysis），
 * 每遇到一個「檢查」，就把該路徑上的型別收窄。
 *
 * 【接續 03b：為什麼 narrowing 只能用值世界的東西】
 *
 * 你在 03b 寫過 `typeof x.rolls === FabricRoll[]`，那是型別世界的東西跑到值世界。
 * narrowing 的本質是：
 *
 *   1. 你寫一段「執行期真的會跑」的 JS 檢查（typeof、===、in、instanceof…）
 *   2. TS 看懂這段 JS，推論出「通過這個檢查的值，型別一定是 X」
 *
 * 所以能拿來 narrow 的，只有「執行期查得到的資訊」。
 * FabricRoll 這個 interface 編譯後就消失了，執行期根本沒有它，
 * 因此永遠不可能存在 `if (x is FabricRoll)` 這種內建語法 ——
 * 你必須自己用一個個欄位檢查去「證明」它（這就是 4.9 的自訂型別守衛）。
 */

function demoDeclaredVsNarrowed(input: string | number | null): string {
  // 這一行 input: string | number | null
  if (input === null) {
    return '-';
    // 這個分支裡 input: null
  }
  // 早退之後，這一行 input: string | number（null 被剔除了）

  if (typeof input === 'number') {
    return input.toFixed(1); // input: number
  }

  return input.trim(); // input: string —— 前面兩條路都 return 了，只剩 string
}

console.log('4.0', demoDeclaredVsNarrowed(null), demoDeclaredVsNarrowed(3), demoDeclaredVsNarrowed(' A-01 '));

// ============================================================
// 4.1 typeof 守衛
// ============================================================

/**
 * typeof 在執行期只可能回傳 8 種字串：
 *   'string' 'number' 'bigint' 'boolean' 'symbol' 'undefined' 'object' 'function'
 *
 * 三個歷史包袱（面試也很愛考）：
 *   typeof null        === 'object'   ← 第 1 章講過，JS 最有名的 bug
 *   typeof []          === 'object'   ← 陣列也是 object
 *   typeof NaN         === 'number'   ← NaN 是 number
 *
 * TS 完全知道這些包袱，會照實反映在型別上。
 */

function describeTypeof(x: string[] | Date | null | number) {
  if (typeof x === 'object') {
    // hover x：string[] | Date | null  ← null 也跑進來了！
    if (x === null) return 'null';
    // 這裡 x: string[] | Date，還要再分（見 4.6）
    return Array.isArray(x) ? `陣列 ${x.length} 筆` : `日期 ${x.toISOString().slice(0, 10)}`;
  }
  // 這裡 x: number
  return Number.isNaN(x) ? 'NaN（型別仍是 number）' : `數字 ${x}`;
}

/**
 * 下面這個函式「故意不呼叫」。
 * 第 3 章解答檔你看過：@ts-expect-error 只吃掉型別錯誤，程式碼照樣會執行。
 * 如果呼叫 typeofPitfall(null)，x.length 會真的在執行期丟 TypeError。
 */
function typeofPitfall(x: string[] | Date | null) {
  if (typeof x === 'object') {
    // @ts-expect-error 'x' is possibly 'null' —— typeof 'object' 擋不掉 null
    return x.length;
  }
  return 0;
}
void typeofPitfall;

console.log('4.1', describeTypeof(null), describeTypeof(['a']), describeTypeof(NaN));

// ============================================================
// 4.2 真值縮小 truthiness
// ============================================================

/**
 * `if (x)` 會剔除所有 falsy 值：false、0、-0、0n、''、NaN、null、undefined
 *
 * 關鍵觀察：型別系統「沒辦法」表示「不是 0 的 number」，
 * 所以 TS 只能剔除 null 和 undefined，number 在兩個分支都還是 number。
 *
 * → 型別完全正確，但 0 會跑到 else 分支 —— 這正是第 1 章 Q2 的 bug。
 */

function weightLabelBad(weightKg: number | undefined): string {
  if (weightKg) {
    return `${weightKg} kg`; // weightKg: number
  }
  // hover weightKg：number | undefined ← 注意 number 還在，TS 在暗示「0 可能跑來這裡」
  return '未秤重';
}

function weightLabelGood(weightKg: number | undefined): string {
  if (weightKg !== undefined) {
    return `${weightKg} kg`;
  }
  return '未秤重'; // weightKg: undefined，乾淨
}

console.log('4.2 bad :', weightLabelBad(0)); //  未秤重 ← 錯！R003 明明秤過是 0 kg
console.log('4.2 good:', weightLabelGood(0)); // 0 kg

/**
 * 什麼時候 truthiness 是安全的？
 *   - 型別裡根本沒有 number / string / boolean 這些「有 falsy 值」的成員時
 *     例：FabricRoll | undefined、Date | null —— 物件永遠 truthy，放心用
 *   - 型別有 string 且你「刻意」要把 '' 當成沒填時（例如表單輸入）
 *
 * 判斷口訣：hover 一下 else 分支，如果還看得到 number / string，就想想 0 和 ''。
 */

// ============================================================
// 4.3 相等縮小 === 與 != null
// ============================================================

function equalityDemo(status: RollStatus, zone: string | null | undefined) {
  if (status === 'SHIPPED') {
    // status: 'SHIPPED'
  } else {
    // status: 'IN_STOCK' | 'HOLD' ←  字面量聯合被「減掉」一個成員
  }

  /**
   * 整個 TS 生態裡，`== null` / `!= null` 幾乎是唯一被推薦的寬鬆相等用法：
   * 它剛好同時命中 null 和 undefined，且不會誤傷 0 / '' / false。
   * （很多 ESLint 設定的 eqeqeq 規則會開 { null: 'ignore' } 就是為了它）
   */
  if (zone != null) {
    return zone.toUpperCase(); // zone: string
  }
  return status;
}

console.log('4.3', equalityDemo('HOLD', 'b-03'), equalityDemo('HOLD', undefined));

// ============================================================
// 4.4 in 運算子
// ============================================================

/**
 * `'key' in obj` 在執行期檢查「物件上有沒有這個屬性（含原型鏈）」。
 * TS 用它做兩件事：
 *   (A) 在聯合型別裡挑出「宣告了這個 key」的成員
 *   (B) 對 unknown 物件，證明它「有這個 key」（值型別仍是 unknown）
 */

// (A) 在聯合中挑成員
interface KnittingMachine { machineNo: string; needleCount: number }
interface DyeingMachine { machineNo: string; tankCapacityL: number }

function machineSpec(m: KnittingMachine | DyeingMachine): string {
  if ('needleCount' in m) {
    return `針數 ${m.needleCount}`; // m: KnittingMachine
  }
  return `缸容量 ${m.tankCapacityL} L`; // m: DyeingMachine
}

console.log('4.4A', machineSpec({ machineNo: 'K-01', needleCount: 2880 }));

// (B) 搭配 unknown —— 第 1 章 unknown 四段式的延續
function readRollNo(x: unknown): string | undefined {
  if (typeof x === 'object' && x !== null && 'rollNo' in x) {
    // hover x：object & Record<"rollNo", unknown>
    // x.rollNo 可以讀了，但型別是 unknown —— in 只證明「有」，沒證明「是什麼」
    if (typeof x.rollNo === 'string') {
      return x.rollNo; // 屬性本身也能被 narrow
    }
  }
  return undefined;
}

console.log('4.4B', readRollNo({ rollNo: 'R001' }), readRollNo({ rollNo: 1 }), readRollNo(null));

/**
 * 【陷阱：選填屬性讓 in 的 else 分支縮不下去】
 */
interface ManualEntry { source: 'MANUAL'; operatorNo: string; note?: string }
interface ScannerEntry { source: 'SCANNER'; deviceId: string }

function inWithOptional(e: ManualEntry | ScannerEntry) {
  if ('note' in e) {
    // e: ManualEntry  ← 有 note 的一定是 ManualEntry，合理
  } else {
    // hover e：ManualEntry | ScannerEntry  ← ManualEntry 沒剔除！
    // 因為 note 是選填，一個 ManualEntry「可能沒有 note」，所以兩者都可能跑到這裡
  }
  // 結論：用 in 判斷時，挑「必填」的 key。更好的做法是直接用 source 判斷（4.7）
}
inWithOptional({ source: 'SCANNER', deviceId: 'D1' });

// ============================================================
// 4.5 instanceof
// ============================================================

/**
 * `x instanceof C` 在執行期檢查原型鏈，所以 C 必須是「執行期存在的值」：
 *   ✅ class、內建建構子（Error、Date、Map、Array…）
 *   ❌ interface、type —— 03b 講過，它們編譯後消失
 */

class StockShortageError extends Error {
  constructor(public readonly rollNo: string, public readonly shortKg: number) {
    super(`布卷 ${rollNo} 庫存不足 ${shortKg} kg`);
    this.name = 'StockShortageError';
  }
}

function handleError(e: unknown): string {
  // strict 模式下 catch (e) 的 e 是 unknown（useUnknownInCatchVariables）
  // 因為 JS 可以 throw 任何東西：throw 'oops'、throw 42、throw null 都合法
  if (e instanceof StockShortageError) {
    return `[業務錯誤] ${e.rollNo} 缺 ${e.shortKg} kg`; // e: StockShortageError
  }
  if (e instanceof Error) {
    return `[系統錯誤] ${e.message}`; // e: Error
  }
  return `[未知] ${String(e)}`; // e: unknown
}

try {
  throw new StockShortageError('R001', 4.5);
} catch (e) {
  console.log('4.5', handleError(e));
}
console.log('4.5', handleError('字串也能被 throw'));

/**
 * 【注意順序】子類別要先檢查。如果先寫 e instanceof Error，
 * StockShortageError 也會被它攔走，後面的分支永遠跑不到。
 * TS 不會警告你這件事 —— 型別對，邏輯錯。
 *
 * 【為什麼第 9 章 Express 錯誤處理會大量用到這個】
 * 自訂錯誤 class + instanceof，是 middleware 裡把錯誤轉成 HTTP status 的標準寫法。
 */

// ============================================================
// 4.6 Array.isArray
// ============================================================

function normalizeRollNos(input: string | string[]): string[] {
  if (Array.isArray(input)) {
    return [...input]; // input: string[]
  }
  return [input]; // input: string
}

console.log('4.6', normalizeRollNos('R001'), normalizeRollNos(['R001', 'R002']));

/**
 * 【陷阱：Array.isArray 遇到 readonly 陣列會失靈】
 *
 * 這是我在驗證本章教材時實際撞到的：把參數改成 string | readonly string[]，
 * 本來以為照寫就好，結果 tsc 報錯。實測結果：
 *
 *   input: string | readonly string[]
 *   if (Array.isArray(input)) → input: any[]                   ← 型別資訊直接變 any！
 *   else                      → input: string | readonly string[]  ← 完全沒縮小
 *
 * 原因在標準函式庫的宣告：isArray(arg: any): arg is any[]
 * readonly string[] 不是 any[] 的子型別（readonly 陣列少了 push 等方法），
 * TS 沒辦法用 any[] 把它乾淨地切出來。這是 TypeScript 存在多年的已知問題。
 *
 * 解法：反過來檢查「非陣列」那一邊
 */
function normalizeReadonly(input: string | readonly string[]): string[] {
  if (typeof input === 'string') {
    return [input]; // input: string
  }
  return [...input]; // input: readonly string[] ✅ 型別完整保留
}

// 如果把上面改回 Array.isArray，就會看到：
function normalizeReadonlyBroken(input: string | readonly string[]): string[] {
  if (Array.isArray(input)) {
    return [...input]; // hover input：any[] —— 回傳 any[] 也不會報錯，型別安全默默消失
  }
  // @ts-expect-error Type 'string | readonly string[]' is not assignable to type 'string'
  return [input];
}
void normalizeReadonlyBroken;

console.log('4.6 readonly', normalizeReadonly(['R003'] as const));

/**
 * 實務場景：Express 的 req.query.rollNo 可能是 string、string[]、或 undefined
 *（?rollNo=R001 vs ?rollNo=R001&rollNo=R002），第 9 章會再遇到。
 * 而你第 3 章學到「參數加 readonly 表示沒有副作用」—— 兩個好習慣碰在一起就會踩到這個坑。
 */

// ============================================================
// 4.7 可辨識聯合 Discriminated Union ★
// ============================================================

/**
 * 你在第 3 章 Q5 已經用過 Result<T, E> 的錯誤碼聯合，這一節把它講完整。
 *
 * 可辨識聯合的三個條件：
 *   1. 每個成員都有同一個欄位（辨識欄位 discriminant，常叫 kind / type / status）
 *   2. 這個欄位的型別是「字面量」（'IN'，不是 string）
 *   3. 各成員的值互不重複
 *
 * 符合這三點，只要檢查辨識欄位，TS 就能把整個物件縮到單一成員。
 */

type StockMovement =
  | { kind: 'INBOUND'; rollNo: string; qtyKg: number; supplierNo: string }
  | { kind: 'OUTBOUND'; rollNo: string; qtyKg: number; orderNo: string }
  | { kind: 'TRANSFER'; rollNo: string; fromZone: string; toZone: string }
  | { kind: 'ADJUST'; rollNo: string; deltaKg: number; reason: string };

/**
 * never 窮舉檢查（第 1 章用 const _never 寫過，這裡抽成共用函式）
 * 回傳型別 never 表示「這個函式不會正常結束」。
 */
function assertNever(x: never): never {
  throw new Error(`未處理的分支：${JSON.stringify(x)}`);
}

function describeMovement(m: StockMovement): string {
  switch (m.kind) {
    case 'INBOUND':
      return `入庫 ${m.rollNo} +${m.qtyKg} kg（供應商 ${m.supplierNo}）`;
    case 'OUTBOUND':
      return `出庫 ${m.rollNo} -${m.qtyKg} kg（訂單 ${m.orderNo}）`;
    case 'TRANSFER':
      // @ts-expect-error TRANSFER 沒有 qtyKg —— 縮小後只看得到自己的欄位
      m.qtyKg;
      return `移庫 ${m.rollNo} ${m.fromZone} → ${m.toZone}`;
    case 'ADJUST':
      return `盤點調整 ${m.rollNo} ${m.deltaKg >= 0 ? '+' : ''}${m.deltaKg} kg（${m.reason}）`;
    default:
      // 四個 case 都處理了，這裡 m: never
      // 如果未來有人在 StockMovement 加一個 'SCRAP'，這行會立刻紅字：
      //   Argument of type '{ kind: "SCRAP"; ... }' is not assignable to parameter of type 'never'
      return assertNever(m);
  }
}

const movements: StockMovement[] = [
  { kind: 'INBOUND', rollNo: 'R004', qtyKg: 28, supplierNo: 'S-12' },
  { kind: 'TRANSFER', rollNo: 'R001', fromZone: 'A-01', toZone: 'C-05' },
  { kind: 'ADJUST', rollNo: 'R003', deltaKg: -0.4, reason: '盤點差異' },
];
movements.forEach((m) => console.log('4.7', describeMovement(m)));

/**
 * 【同一件事的 if 寫法：早退 guard clause】
 * 不需要處理全部分支時，用 if 比 switch 直觀；辨識欄位的檢查一樣會縮小。
 */
function movementQty(m: StockMovement): number {
  if (m.kind === 'TRANSFER') return 0;
  // 這裡 m: INBOUND | OUTBOUND | ADJUST
  if (m.kind === 'ADJUST') return m.deltaKg;
  // 這裡 m: INBOUND | OUTBOUND，兩者都有 qtyKg，可以直接讀
  return m.kind === 'INBOUND' ? m.qtyKg : -m.qtyKg;
}
console.log('4.7 qty', movements.map(movementQty));

/**
 * 【解構後也能縮小】（TS 4.6+）
 * 只要解構出來的是 const，檢查 kind 仍然會連動縮小整個 m。
 */
function destructured(m: StockMovement) {
  const { kind } = m;
  if (kind === 'OUTBOUND') {
    return m.orderNo; // m: OUTBOUND
  }
  return null;
}
destructured(movements[0]!);

/**
 * 【陷阱：辨識欄位被 widening 成 string】—— 第 1 章 let/const 推論的續集
 */
const looseMovement = { kind: 'INBOUND', rollNo: 'R005', qtyKg: 10, supplierNo: 'S-01' };
// hover looseMovement.kind：string（物件的屬性是可變的，所以被放寬）

// @ts-expect-error Type 'string' is not assignable to type '"INBOUND" | "OUTBOUND" | ...'
describeMovement(looseMovement);

// 解法 1：宣告時就標註型別（最推薦，同時享有 excess property check）
const typedMovement: StockMovement = { kind: 'INBOUND', rollNo: 'R005', qtyKg: 10, supplierNo: 'S-01' };
describeMovement(typedMovement);
// 解法 2：as const（第 5 章會細講）
const constMovement = { kind: 'INBOUND', rollNo: 'R005', qtyKg: 10, supplierNo: 'S-01' } as const;
describeMovement(constMovement);

/**
 * 【為什麼可辨識聯合比「一堆選填欄位」好】—— 第 2 章「讓非法狀態無法被表示」
 *
 *   interface MovementBad {
 *     kind: string;
 *     qtyKg?: number; supplierNo?: string; orderNo?: string;
 *     fromZone?: string; toZone?: string; deltaKg?: number; reason?: string;
 *   }
 *
 * MovementBad 允許「入庫但沒有 supplierNo」「移庫卻有 orderNo」這種不存在的組合，
 * 每個用到它的地方都得寫 `if (m.supplierNo)` 防禦，而且 TS 幫不了你。
 * 可辨識聯合把「哪種異動有哪些欄位」寫進型別，檢查一次 kind，後面全部免費。
 */

// ============================================================
// 4.8 控制流分析的邊界
// ============================================================

/**
 * (1) 重新指派會「重設」縮小結果，回到宣告型別再重新推
 */
function reassign() {
  let target: FabricRoll | undefined = rolls.find((r) => r.status === 'HOLD');
  if (target) {
    target.rollNo; // target: FabricRoll
    target = rolls.find((r) => r.zoneCode === 'Z-99');
    // hover target：FabricRoll | undefined —— 重新指派後又變寬了
  }
}
reassign();

/**
 * (2) 閉包 closure（callback）裡的縮小
 *
 * TS 5.4 起：參數或 let 變數，只要「建立閉包之後沒有再被指派」，縮小會保留進閉包。
 * 反之，只要後面有任何一行指派它，閉包裡就回到宣告型別 ——
 * 因為 callback 可能在指派之後才執行（setTimeout、事件監聽、Promise.then）。
 */
function closureOk(rollNo: string | undefined) {
  if (rollNo === undefined) return;
  setTimeout(() => console.log('4.8 closure', rollNo.toUpperCase()), 0); // ✅ rollNo: string
}
closureOk('r001');

function closureBroken(rollNo: string | undefined) {
  if (rollNo === undefined) return;
  // @ts-expect-error 'rollNo' is possibly 'undefined' —— 因為下面那行指派
  setTimeout(() => console.log(rollNo.toUpperCase()), 0);
  rollNo = undefined; // ← 這行讓閉包裡的縮小失效
}
void closureBroken;

// 修法：先存成 const。const 不可能被重新指派，縮小永遠有效
function closureFixed(rollNo: string | undefined) {
  if (rollNo === undefined) return;
  const no = rollNo;
  setTimeout(() => console.log('4.8 fixed', no.toUpperCase()), 0);
  rollNo = undefined;
}
closureFixed('r002');

/**
 * (3) ⚠️ TS 故意放過的洞：物件屬性的縮小，在「呼叫函式之後」仍然保留
 *
 * 理論上任何函式呼叫都可能改掉物件屬性，如果 TS 每次呼叫都重設縮小，
 * 程式會寫不下去（每個 console.log 後面都要重新檢查）。
 * 所以 TS 選擇「樂觀假設函式不會改它」—— 這是刻意的取捨，不是 bug。
 *
 * 代價：下面這段 tsc 零錯誤，執行期直接爆掉。
 */
interface Zone {
  zoneCode: string;
  currentRoll: FabricRoll | null;
}

function releaseZone(zone: Zone): void {
  zone.currentRoll = null; // 就地改動（第 3 章 Q5 你也踩過的那種 mutation）
}

function shipFromZone(zone: Zone): string {
  if (zone.currentRoll !== null) {
    releaseZone(zone);
    // hover zone.currentRoll：FabricRoll ← TS 以為還在，但它已經是 null 了
    return zone.currentRoll.rollNo; // 💥 執行期 TypeError
  }
  return '空儲位';
}

try {
  console.log(shipFromZone({ zoneCode: 'A-01', currentRoll: rolls[0]! }));
} catch (e) {
  console.log('4.8 洞 實測：', handleError(e));
}

/**
 * 防禦方式（兩個一起用最穩）：
 *   a. 縮小完「先取出存成 const」再呼叫其他函式：const roll = zone.currentRoll;
 *   b. 從源頭避免就地改動 —— readonly 參數 + 回傳新物件（第 2、3 章的原則）
 *      releaseZone(zone: Readonly<Zone>): Zone 就不可能寫出 zone.currentRoll = null
 */

// ============================================================
// 4.9 自訂型別守衛 x is T
// ============================================================

/**
 * 語法：function isX(value: 某型別): value is X { return 布林運算; }
 *
 * 回傳型別寫 `value is X` 叫做型別謂詞 type predicate。意思是：
 *   回傳 true  → 呼叫端的 if 分支，value 縮成 X
 *   回傳 false → else 分支，value「剔除」X
 *
 * ⚠️ 最重要的一句話：TS 不會檢查你的函式內容是否真的證明了 X。
 *    你寫 `return true` 它也照單全收。型別守衛 = 你對編譯器的承諾，寫錯就是說謊。
 *
 * 第 3 章 Q5 你的 isFabricRoll 因為運算子優先權，
 * 讓 { status: 'IN_STOCK' } 通過了檢查 —— 那就是一個「說謊的型別守衛」，
 * 而它騙到的不是 TS，是所有呼叫它、以為拿到完整布卷的程式碼。
 */

// ❌ 說謊的守衛：tsc 零錯誤
function isFabricRollLiar(x: unknown): x is FabricRoll {
  return typeof x === 'object' && x !== null && 'rollNo' in x;
  // 只證明了「有 rollNo」，卻承諾「是完整 FabricRoll」
}

const fromApi: unknown = JSON.parse('{"rollNo":"R009"}');
if (isFabricRollLiar(fromApi)) {
  try {
    console.log(fromApi.weightKg.toFixed(1)); // fromApi: FabricRoll，但 weightKg 是 undefined
  } catch (e) {
    console.log('4.9 說謊的守衛 實測：', handleError(e));
  }
}

/**
 * ✅ 誠實的守衛：一個條件一行、早退
 *
 * 刻意不寫成一長串 && ||：
 *   - 每行只證明一件事，漏掉哪個欄位一眼看得出來
 *   - 不會有運算子優先權問題（你在第 2 章 Q3、第 3 章 Q5 都栽在長布林式）
 *   - 除錯時可以在任一行下中斷點
 */
const ROLL_STATUSES: readonly string[] = ['IN_STOCK', 'SHIPPED', 'HOLD'];

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

function isFabricRoll(x: unknown): x is FabricRoll {
  if (!isRecord(x)) return false;
  if (typeof x._id !== 'string') return false;
  if (typeof x.rollNo !== 'string') return false;
  if (typeof x.weightKg !== 'number' || !Number.isFinite(x.weightKg)) return false; // 擋 NaN / Infinity
  if (typeof x.zoneCode !== 'string') return false;
  if (typeof x.status !== 'string' || !ROLL_STATUSES.includes(x.status)) return false;
  return true;
}

console.log(
  '4.9 誠實的守衛',
  isFabricRoll(rolls[0]),                         // true
  isFabricRoll({ status: 'IN_STOCK' }),           // false ← 第 3 章那個 bug 的輸入
  isFabricRoll({ ...rolls[0], weightKg: NaN }),   // false
  isFabricRoll({ ...rolls[0], status: 'LOST' }),  // false
);

/**
 * 【陷阱：false 分支也會說謊】
 * 謂詞寫 `x is string`，但函式對某些 string 回傳 false，
 * 那 else 分支就會錯誤地剔除 string。
 */
function isNonEmptyString(x: unknown): x is string {
  return typeof x === 'string' && x.length > 0;
}

function lotLabel(lot: string | number): string {
  if (isNonEmptyString(lot)) {
    return `批號 ${lot}`;
  }
  // hover lot：number ← TS 認為這裡只剩 number
  // 但 lot = '' 時會跑來這裡，型別說 number，實際是 ''
  return `機台批次 #${lot.toFixed(0)}`; // 傳 '' 進來會爆
}
try {
  console.log(lotLabel(''));
} catch (e) {
  console.log('4.9 false 分支說謊 實測：', handleError(e));
}
/**
 * 修法：謂詞只描述「型別」，額外的業務條件（非空、大於 0）不要塞進型別守衛，
 * 改成先 narrow 型別，再另外判斷業務條件。
 */

/**
 * 【泛型型別守衛】—— 第 3 章泛型的應用
 */
function isDefined<T>(x: T | null | undefined): x is T {
  return x != null;
}
const maybeRolls = [rolls[0], undefined, rolls[1], null];
const definedRolls = maybeRolls.filter(isDefined); // FabricRoll[]
console.log('4.9 isDefined', definedRolls.length);

/**
 * 【TS 5.5+：自動推論型別謂詞】
 * 箭頭函式如果「true 代表是 T、false 代表一定不是 T」，TS 會自動推出謂詞：
 */
const inStock = rolls.map((r) => (r.status === 'IN_STOCK' ? r : undefined)).filter((r) => r !== undefined);
// hover inStock：FabricRoll[] ✅ 不用寫 isDefined 了

const weights = [25.5, 0, undefined];
const nonZero = weights.filter((w) => !!w);
// hover nonZero：(number | undefined)[] ← 沒有推論！
// 為什麼？因為 !!w 回傳 false 時，w 可能是 0（一個 number），
// 如果推成 w is number，false 分支就會錯誤剔除 number —— 正是上面「false 分支說謊」。
// TS 5.5 的推論很聰明地拒絕了。filter(Boolean) 也是同理，不會推論。
console.log('4.9 推論', inStock.length, nonZero);
// 執行結果 nonZero = [ 25.5 ] —— 0 kg 那筆也被濾掉了，這又是 4.2 的真值 bug。
// 想要「去掉 undefined 但保留 0」，請寫 filter((w) => w !== undefined)。

// ============================================================
// 4.10 斷言函式 asserts
// ============================================================

/**
 * 型別守衛：回傳 boolean，你自己寫 if
 * 斷言函式：不通過就 throw，通過的話「後面整段」都縮小，不需要 if
 *
 * 兩種寫法：
 *   asserts x is T      → 之後 x: T
 *   asserts condition   → 之後 condition 為真（等同 if (!condition) throw）
 */

function assertFabricRoll(x: unknown): asserts x is FabricRoll {
  if (!isFabricRoll(x)) {
    throw new Error(`不是合法的布卷資料：${JSON.stringify(x)}`);
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function shipRoll(body: unknown): string {
  assertFabricRoll(body);
  // 這裡開始 body: FabricRoll
  assert(body.status === 'IN_STOCK', `${body.rollNo} 狀態為 ${body.status}，不可出貨`);
  // 這裡開始 body.status: 'IN_STOCK'（condition 形式也會縮小）
  return `${body.rollNo} 出貨成功`;
}

for (const input of [rolls[0], rolls[1], { rollNo: 'X' }]) {
  try {
    console.log('4.10', shipRoll(input));
  } catch (e) {
    console.log('4.10', handleError(e));
  }
}

/**
 * 【陷阱：斷言函式不能用「沒標型別的 const 箭頭函式」】
 */
const assertStringArrow = (x: unknown): asserts x is string => {
  if (typeof x !== 'string') throw new Error('not string');
};
function useArrow(x: unknown) {
  // @ts-expect-error TS2775: Assertions require every name in the call target to be declared with an explicit type annotation.
  assertStringArrow(x);
}
void useArrow;
/**
 * 原因：斷言會影響控制流分析，TS 必須在「分析控制流的當下」就確定這是斷言函式，
 * 不能等型別推論完才知道。const 變數的型別靠推論 → 太晚了。
 *
 * 解法：
 *   ✅ 用 function 宣告（上面 assertFabricRoll 的寫法）
 *   ✅ 或變數本身明確標型別：
 *        const assertString: (x: unknown) => asserts x is string = (x) => { ... };
 */

/**
 * 型別守衛 vs 斷言函式，怎麼選？
 *   不合法時「還要走另一條正常流程」→ 型別守衛（例如過濾掉壞資料繼續跑）
 *   不合法時「整個操作就該中止」    → 斷言函式（例如 API 入口驗證 body，錯就回 400）
 */

// ============================================================
// 4.11 as 不是 narrowing
// ============================================================

/**
 * `x as FabricRoll` 叫型別斷言 type assertion。它「不做任何檢查」，
 * 只是叫 TS 閉嘴、相信你。和 narrowing 的差別：
 *
 *   narrowing：你寫了執行期檢查，TS 根據「證據」縮小
 *   as       ：沒有證據，TS 根據「你的口頭保證」改型別
 */
const rawBody: unknown = JSON.parse('{"rollNo":"R010"}');
const asRoll = rawBody as FabricRoll; // 零錯誤、零檢查
console.log('4.11 as', typeof asRoll.weightKg); // undefined，型別卻說 number

/**
 * 實務原則：
 *   - 外部資料（API 回應、req.body、JSON.parse、localStorage）一律 unknown + 守衛/斷言
 *   - as 只留給「你比 TS 知道更多、且有其他保證」的場合，例如 DOM：
 *       document.getElementById('app') as HTMLDivElement
 *   - 第 10 章的 zod 就是「自動幫你產生誠實型別守衛」的工具，
 *     等你手寫過 isFabricRoll，就會知道 zod 在替你省什麼
 */

// ============================================================
// 4.12 心智模型總結
// ============================================================

/**
 * | 手段                 | 能縮小什麼                    | 最常見的坑                                  |
 * |---------------------|------------------------------|--------------------------------------------|
 * | typeof              | 原始型別、object、function     | typeof null === 'object'、陣列也是 object    |
 * | if (x) 真值          | 剔除 null / undefined         | 0、''、false 也被當成沒有                    |
 * | === / != null       | 字面量、null + undefined      | 幾乎沒有，!= null 是最安全的空值檢查          |
 * | in                  | 聯合成員、unknown 物件的 key   | 選填屬性的 else 分支縮不下去                  |
 * | instanceof          | class、Error、Date            | interface 不能用；子類別要先檢查              |
 * | Array.isArray       | 陣列 vs 非陣列                | readonly 陣列會變 any[]，改用 typeof 反向判斷  |
 * | 辨識欄位 kind        | 整個可辨識聯合                 | 辨識欄位被 widening 成 string                |
 * | x is T 型別守衛      | 你承諾的任何型別               | TS 不驗證內容；false 分支一樣會說謊            |
 * | asserts x is T      | 呼叫之後的整段程式碼            | const 箭頭函式要明確標型別（TS2775）          |
 * | as                  | 不是縮小，是跳過檢查            | 外部資料用 as = 把 bug 延後到執行期           |
 *
 * 三條原則：
 *   1. narrowing 只能靠執行期檢查；型別世界的東西不能拿來 if
 *   2. 能用可辨識聯合就不要用一堆選填欄位；switch + assertNever 替未來埋陷阱
 *   3. 型別守衛是承諾，不是檢查 —— 一個條件一行、早退，並且實際跑測試
 */

export {};
