/**
 * 第 2 章：物件的形狀 —— interface / type、選填、唯讀
 *
 * 執行： npx tsx src/02-objects.ts
 * 檢查： npm run check
 *
 * 這章開始用你 WMS 的真實資料結構當例子。
 */

// ─────────────────────────────────────────────
// 1. 兩種宣告方式：interface 與 type
// ─────────────────────────────────────────────

// 寫法 A：interface（沒有等號，像在「定義一個東西」）
interface Employee {
  employeeNo: string;
  name: string;
  role: 'admin' | 'teamLeader' | 'officeStaff' | 'operator';
}

// 寫法 B：type alias（有等號，像在「幫一個型別取名字」）
type Employee2 = {
  employeeNo: string;
  name: string;
  role: 'admin' | 'teamLeader' | 'officeStaff' | 'operator';
};

// 這兩個在描述物件時 99% 情況完全等價，可以互相賦值。
const e1: Employee = { employeeNo: 'A001', name: '王小明', role: 'operator' };
const e2: Employee2 = e1;   // ✅ TS 看的是「形狀」，不是「名字」

// 👉 這就是結構型別系統 (structural typing)：
//    只要形狀對得上就相容，不需要 implements、不需要繼承關係。
//    這跟 Java/C# 的「名義型別系統」完全不同，是 TS 最重要的特性之一。

// ─────────────────────────────────────────────
// 2. 選填 ? 與唯讀 readonly
// ─────────────────────────────────────────────

interface StockZone {
  readonly stockZoneID: string;   // 唯讀：建立後不能改
  zoneName: string;
  capacity?: number;              // 選填：可能沒有這個欄位
  note?: string;
}

const zoneA: StockZone = { stockZoneID: 'Z-A', zoneName: 'A區' };  // capacity 沒給，OK
// zoneA.stockZoneID = 'Z-B';   // ❌ Cannot assign to 'stockZoneID' because it is a read-only property

// ⚠️ 選填欄位的型別其實是 union：capacity 是 `number | undefined`
function describeZone(zone: StockZone): string {
  // console.log(zone.capacity.toFixed(0));   // ❌ 'zone.capacity' is possibly 'undefined'
  const cap = zone.capacity ?? 0;             // ✅ 必須先處理 undefined
  return `${zone.zoneName}（容量 ${cap}）`;
}

// 👉 readonly 只在編譯期有效，執行期還是可以改。它防的是「你不小心寫錯」，
//    不是「別人惡意改」。這跟第 1 章「型別在執行期消失」是同一件事。

// ─────────────────────────────────────────────
// 3. 巢狀物件與陣列 —— 對應你的 currentStock / stockState
// ─────────────────────────────────────────────

type StockStateName = 'weighed' | 'framed' | 'inStock' | 'dispatched';

interface StockSnapshot {
  state: StockStateName;
  stockZoneID: string;
  operatorNo: string;
  at: Date;
}

interface KnitWarpRecord {
  readonly _id: string;
  lotNo: string;
  boltCount: number;
  currentStock: StockSnapshot;      // 巢狀物件：目前狀態指標
  stockState: StockSnapshot[];      // 物件陣列：append-only 歷程
  remark?: string;
}

// 巢狀存取時，TS 會一路檢查到底
function latestZone(record: KnitWarpRecord): string {
  return record.currentStock.stockZoneID;
  // record.currentStock.stockZonID   // ❌ 打錯字立刻被抓（這就是 TS 最實用的地方）
}

// ─────────────────────────────────────────────
// 4. 函式型別的兩種寫法
// ─────────────────────────────────────────────

interface StockRepo {
  // 方法簡寫
  findByLot(lotNo: string): KnitWarpRecord | undefined;
  // 屬性 + 箭頭函式型別（意思相同，但這種寫法在 strict 模式下檢查更嚴格）
  countInZone: (zoneID: string) => number;
}

// 也可以單獨把函式型別取名，很適合 callback
type OnStateChange = (record: KnitWarpRecord, next: StockStateName) => void;

const logChange: OnStateChange = (record, next) => {
  // 注意：這裡的 record 和 next 不用標型別，TS 從 OnStateChange 推論出來了
  console.log(`[${record.lotNo}] ${record.currentStock.state} → ${next}`);
};

// ─────────────────────────────────────────────
// 5. 動態 key：index signature 與 Record
// ─────────────────────────────────────────────

// 當 key 不固定時（例如「每個儲區的疋數統計」）
interface ZoneCount {
  [zoneID: string]: number;
}

// 更常用的簡寫（Record 是內建工具型別，第 5 章細講）
type ZoneCount2 = Record<string, number>;

// key 也可以限定範圍 —— 這樣就變成「每個 zone 都必須有」
type ZoneCountStrict = Record<'A' | 'B' | 'C' | 'D', number>;

const counts: ZoneCount = { A: 12, B: 30 };
// const strict: ZoneCountStrict = { A: 1, B: 2 };  // ❌ 少了 C、D

// ⚠️ 陷阱：index signature 查不到 key 時，TS 仍然說型別是 number（不是 undefined）
//    tsconfig 開了 noUncheckedIndexedAccess 才會正確變成 number | undefined。
//    你的 tsconfig 已經幫你開好了。
const maybe = counts['Z'];   // 型別：number | undefined

// ─────────────────────────────────────────────
// 6. 組合型別：extends 與 &
// ─────────────────────────────────────────────

interface BaseDoc {
  readonly _id: string;
  createdAt: Date;
  updatedAt: Date;
}

// interface 用 extends 繼承
interface TransactionDoc extends BaseDoc {
  transactionNo: string;
  operatorNo: string;
  type: 'inbound' | 'outbound' | 'transfer';
}

// type 用 & 交集（intersection），效果類似
type TransactionDoc2 = BaseDoc & {
  transactionNo: string;
  operatorNo: string;
  type: 'inbound' | 'outbound' | 'transfer';
};

// 差別：extends 若欄位衝突會「立刻報錯」，& 會默默算出交集（可能變成 never）
type Weird = { kg: number } & { kg: string };
// const w: Weird = { kg: 1 };   // ❌ kg 的型別是 number & string = never，永遠塞不進去

// ─────────────────────────────────────────────
// 7. 額外屬性檢查 (excess property check) —— 新手必踩
// ─────────────────────────────────────────────

// const bad: StockZone = {
//   stockZoneID: 'Z-A',
//   zoneName: 'A區',
//   colour: 'red',          // ❌ Object literal may only specify known properties
// };

// 但同樣的東西「先存成變數再賦值」卻會過：
const raw = { stockZoneID: 'Z-A', zoneName: 'A區', colour: 'red' };
const ok: StockZone = raw;   // ✅ 竟然合法！

// 👉 為什麼？TS 只對「直接寫出來的物件字面量」做額外屬性檢查，
//    因為那通常代表你打錯字（colour vs color）。變數則假設你知道自己在做什麼。
//    知道這個規則，之後遇到「明明一樣為什麼一個過一個不過」就不會抓狂。

// ─────────────────────────────────────────────
// 8. interface 還是 type？實務決策
// ─────────────────────────────────────────────

// interface 獨有：宣告合併 (declaration merging) —— 同名會自動合併
interface Window2 { title: string; }
interface Window2 { version: number; }
const w2: Window2 = { title: 'WMS', version: 3.4 };   // 兩個都要有

// type 獨有：可以是任何型別，不只物件
type ID = string | number;                 // union
type Pair = [string, number];              // tuple
type Getter = () => KnitWarpRecord;        // 函式

// 👉 實務原則（照這個做就不會錯）：
//    - 描述「物件 / class 的形狀」，尤其是會被別人 extends 的 → interface
//    - 需要 union、tuple、條件型別、工具型別組合 → type
//    - 團隊已經有慣例 → 跟著團隊
//    真的沒共識時，統一用 type 也完全沒問題。

// ─────────────────────────────────────────────
// 執行區
// ─────────────────────────────────────────────
const record: KnitWarpRecord = {
  _id: '65f0a1',
  lotNo: 'LOT-0007',
  boltCount: 12,
  currentStock: { state: 'inStock', stockZoneID: 'Z-A', operatorNo: 'A001', at: new Date() },
  stockState: [
    { state: 'weighed', stockZoneID: '-', operatorNo: 'A001', at: new Date() },
    { state: 'framed', stockZoneID: '-', operatorNo: 'A002', at: new Date() },
    { state: 'inStock', stockZoneID: 'Z-A', operatorNo: 'A001', at: new Date() },
  ],
};

console.log('員工:', e1.name, '/', e2.role);
console.log('儲區:', describeZone(zoneA), describeZone({ ...zoneA, capacity: 500 }));
console.log('目前儲區:', latestZone(record));
console.log('歷程筆數:', record.stockState.length);
console.log('儲區統計:', counts, '| 查無:', maybe);
console.log('視窗:', w2.title, w2.version, '| 額外屬性:', ok.zoneName);
logChange(record, 'dispatched');
