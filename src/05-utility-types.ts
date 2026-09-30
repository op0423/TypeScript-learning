/**
 * ============================================================
 *  第 5 章：工具型別 Utility Types、as const、satisfies
 * ============================================================
 *
 *  使用方式：
 *  - 跟前幾章一樣：游標停在 type 名稱上（hover），看 VS Code 把它「展開」成什麼。
 *    這章的核心能力是：看到 Partial<Omit<FabricRoll, '_id'>> 能在腦中展開成真正的物件形狀。
 *  - 標了 @ts-expect-error 的行，刪掉指令看真正的錯誤訊息，看完再加回去。
 *  - 本檔在 strict + noUncheckedIndexedAccess 下編譯零錯誤。
 *  - 執行：npx tsx src/05-utility-types.ts（5.1、5.2、5.6、5.7 有「tsc 過但執行結果不對」的實測）
 *
 *  本章在整個課綱的位置：
 *    第 2 章你學會「描述」一個物件的形狀；
 *    第 3 章你學會寫「吃型別、吐型別」的泛型；
 *    這一章是把兩者合起來：從一個已經存在的型別，「推導」出其他型別。
 *    實務上你寫的型別有一大半應該是推導出來的，而不是手寫第二份。
 *
 *  本章地圖：
 *    5.0  工具型別是什麼 —— 型別世界的函式，以及 mapped type 的最小語法
 *    5.1  Partial / Required / Readonly（含 PATCH 更新的 undefined 陷阱）
 *    5.2  Pick / Omit（含 Omit 不檢查拼字、Omit 在 union 上會壞掉、多餘欄位外洩）
 *    5.3  Record（含 Record<string, V> 與 Record<聯合, V> 的天壤之別）
 *    5.4  聯合型別的工具：Exclude / Extract / NonNullable、T['欄位']
 *    5.5  從值推型別：typeof、ReturnType、Parameters、Awaited
 *    5.6  as const（含 enum 為什麼少用、includes 陷阱）
 *    5.7  satisfies —— 檢查，但不改變推論結果 ★ 本章最實用
 *    5.8  自己寫 mapped type：修飾子 ? / readonly / -? / -readonly
 *    5.9  組合拳：單一資料來源 Single Source of Truth
 *    5.10 心智模型總結
 */

// ============================================================
// 共用資料（沿用第 4 章，另外加上 Mongo 文件常見的欄位）
// ============================================================

interface FabricRoll {
  _id: string;
  rollNo: string;
  weightKg: number;
  zoneCode: string;
  status: 'IN_STOCK' | 'SHIPPED' | 'HOLD';
  remark?: string;
  createdAt: string;
}

const roll: FabricRoll = {
  _id: '1',
  rollNo: 'R001',
  weightKg: 25.5,
  zoneCode: 'A-01',
  status: 'IN_STOCK',
  createdAt: '2026-09-30T08:00:00Z',
};

// ============================================================
// 5.0 工具型別是什麼
// ============================================================

/**
 * 工具型別 = TS 內建的「泛型型別」，放在 node_modules/typescript/lib/lib.es5.d.ts。
 * 在 VS Code 對 Partial 按 F12（前往定義）就能看到原始碼，而且短得驚人：
 *
 *   type Partial<T>  = { [P in keyof T]?: T[P] };
 *   type Required<T> = { [P in keyof T]-?: T[P] };
 *   type Readonly<T> = { readonly [P in keyof T]: T[P] };
 *   type Pick<T, K extends keyof T> = { [P in K]: T[P] };
 *   type Record<K extends keyof any, T> = { [P in K]: T };
 *
 * 用第 3 章的眼光看：它們就是「參數是型別、回傳值也是型別」的函式。
 *   Partial<FabricRoll>  ≈  Partial(FabricRoll)  →  回傳一個新型別
 *
 * 上面那個 { [P in keyof T]: ... } 的寫法叫 mapped type（映射型別），拆開讀：
 *
 *   keyof T         → 第 3 章學過，T 所有欄位名組成的聯合，例如 '_id' | 'rollNo' | ...
 *   [P in 聯合]      → 對聯合裡「每一個」成員各跑一次，P 輪流是 '_id'、'rollNo'…
 *                     （很像值世界的 for...in，但是在型別世界跑）
 *   T[P]            → 第 3 章的索引存取型別，取出該欄位原本的型別
 *   ?  / readonly   → 替每個欄位加上修飾子
 *   -? / -readonly  → 把修飾子「拿掉」
 *
 * 所以 Partial 的意思就是：「把 T 的每個欄位抄一遍，型別不變，但全部加上 ?」。
 * 只要看得懂這一行，這章所有工具型別都只是它的變化。5.8 會讓你自己寫。
 */

// 自己寫一個跟 Partial 一模一樣的，證明沒有魔法
type MyPartial<T> = { [P in keyof T]?: T[P] };

const p1: MyPartial<FabricRoll> = { weightKg: 30 }; // ✅ 其他欄位都變選填了
const p2: Partial<FabricRoll> = p1; // ✅ 兩者結構完全相同，互相指派沒問題（結構型別，第 2 章）
void p2;

// ============================================================
// 5.1 Partial / Required / Readonly
// ============================================================

/**
 * 【Partial<T>：所有欄位變選填】
 * 最典型的用途：PATCH 更新 API。前端只送「有改的欄位」。
 *
 * 但要注意，更新時通常「不是每個欄位都能改」：_id、createdAt 不該被改。
 * 所以實務上很少單獨用 Partial<FabricRoll>，而是先 Omit 再 Partial（5.2 會講 Omit）：
 */
type RollUpdate = Partial<Omit<FabricRoll, '_id' | 'createdAt'>>;
// hover RollUpdate 看展開結果：
// { rollNo?: string; weightKg?: number; zoneCode?: string; status?: ...; remark?: string }

const u1: RollUpdate = { zoneCode: 'B-03' }; // ✅
const u2: RollUpdate = {}; // ✅ 空物件也合法（全部選填）
// @ts-expect-error _id 已經被 Omit 掉了，excess property check 擋下（第 2 章）
const u3: RollUpdate = { _id: '999' };
void [u1, u2, u3];

/**
 * 【陷阱 1：Partial + 展開運算子 = 型別說謊】★ 本節重點
 *
 * 第 1 章講過：選填 `weightKg?: number` 其實允許 `number | undefined`。
 * 所以 { weightKg: undefined } 是一個合法的 RollUpdate。
 * 這在「前端表單沒填的欄位送 undefined 過來」時非常常見。
 *
 * 那把它展開蓋到原資料上會怎樣？
 */
function applyUpdateBad(r: FabricRoll, patch: RollUpdate): FabricRoll {
  return { ...r, ...patch }; // tsc 零錯誤
}

const afterBad = applyUpdateBad(roll, { weightKg: undefined });
console.log('5.1 陷阱 型別說是 number，實際是：', afterBad.weightKg); // undefined ！！
// 型別寫 FabricRoll（weightKg: number），執行期卻是 undefined。
// 之後某一頁 afterBad.weightKg.toFixed(1) 就會丟 TypeError —— 又是第 4 章 as 那種「延後爆炸」。

/**
 * 為什麼 TS 放行？
 * TS 計算 { ...r, ...patch } 的型別時，把選填欄位當成「可能不存在」，
 * 不存在就沿用左邊 r 的值，所以推論結果是 weightKg: number。
 * 它沒有考慮「存在，但值是 undefined」這第三種情況。
 * 這是 TS 為了實用性刻意做的取捨（跟第 4 章 4.8 那個洞一樣，是「故意放過」的）。
 *
 * 兩種修法：
 *   (1) 寫程式時自己擋：undefined 的欄位不要蓋過去（下面 applyUpdateGood）
 *   (2) 在 tsconfig 開 "exactOptionalPropertyTypes": true
 *       開了之後 `weightKg?: number` 就只能「不存在」或「是 number」，
 *       { weightKg: undefined } 會直接紅字。
 *       缺點：影響整個專案，很多第三方型別會跟著報錯，所以不是每個團隊都開。
 *       本練習專案沒開，所以你必須用 (1) 的心態寫程式。
 */
function applyUpdateGood(r: FabricRoll, patch: RollUpdate): FabricRoll {
  return {
    ...r,
    rollNo: patch.rollNo ?? r.rollNo,
    weightKg: patch.weightKg ?? r.weightKg, // ?? 對 0 是安全的（第 1 章），weightKg: 0 會被保留
    zoneCode: patch.zoneCode ?? r.zoneCode,
    status: patch.status ?? r.status,
    remark: patch.remark ?? r.remark,
  };
}
console.log('5.1 修正後：', applyUpdateGood(roll, { weightKg: undefined }).weightKg); // 25.5
console.log('5.1 0 要保留：', applyUpdateGood(roll, { weightKg: 0 }).weightKg); // 0

/**
 * 【陷阱 2：Partial 是「淺」的】
 * Partial 只把「第一層」欄位變選填，巢狀物件裡面的欄位不受影響。
 */
interface MachineSpec {
  maxRpm: number;
  gauge: number; // 針距
}
interface Machine {
  machineNo: string;
  spec: MachineSpec;
}

// @ts-expect-error spec 本身變選填了，但一旦給了 spec，它裡面的 maxRpm、gauge 仍然都必填
const mPatch: Partial<Machine> = { spec: { maxRpm: 1000 } };
void mPatch;
/**
 * 網路上會看到有人寫 DeepPartial 解決這件事。但請先想清楚：
 * 如果你用 DeepPartial + { ...m, ...patch }，
 * 展開運算子也是淺的，spec 會被「整個換掉」，gauge 就不見了。
 * 型別的深淺必須跟你的「合併邏輯」的深淺一致，否則型別又在說謊。
 * Mongo 的 $set: { 'spec.maxRpm': 1000 } 才是真正的「深層更新」。
 */

/**
 * 【Required<T>：所有欄位變必填（-?）】
 * 典型用途：「使用者可以只給部分設定，函式內部補上預設值，之後就保證全部都有」。
 */
interface ReportOptions {
  pageSize?: number;
  sortBy?: 'rollNo' | 'weightKg';
  includeShipped?: boolean;
}

const DEFAULT_OPTIONS: Required<ReportOptions> = {
  pageSize: 20,
  sortBy: 'rollNo',
  includeShipped: false,
};

function resolveOptions(opts: ReportOptions): Required<ReportOptions> {
  return {
    pageSize: opts.pageSize ?? DEFAULT_OPTIONS.pageSize,
    sortBy: opts.sortBy ?? DEFAULT_OPTIONS.sortBy,
    includeShipped: opts.includeShipped ?? DEFAULT_OPTIONS.includeShipped,
  };
}
const resolved = resolveOptions({ pageSize: 50 });
resolved.sortBy; // hover：'rollNo' | 'weightKg'，不再有 | undefined，後面的程式不用再防禦
// 同一個理由，這裡一樣不用 { ...DEFAULT_OPTIONS, ...opts }：opts.includeShipped 可能是 undefined（陷阱 1）

/**
 * 【Readonly<T>：所有欄位變唯讀】
 * 第 2 章學過在 interface 裡逐欄寫 readonly；Readonly<T> 是一次全加。
 * 最常用在函式參數：「我保證不改你傳進來的東西」（第 4 章 Q5(b) 的修法）。
 *
 * 一樣是淺的，而且一樣只在編譯期有效。
 * Object.freeze 會在執行期真的凍結，它的回傳型別就是 Readonly<T>（hover 看看）。
 */
function describeRoll(r: Readonly<FabricRoll>): string {
  // @ts-expect-error 唯讀，不能改
  r.weightKg = 0;
  return r.rollNo;
}
void describeRoll;

const frozen = Object.freeze({ ...roll }); // hover：Readonly<{ ... }>
void frozen;

/**
 * 陣列的唯讀有三種寫法，意思相同：
 *   readonly FabricRoll[]      ← 最常見
 *   ReadonlyArray<FabricRoll>
 *   Readonly<FabricRoll[]>
 * 注意它只是「陣列本身」唯讀（不能 push / 不能 arr[0] = ...），
 * 陣列「裡面的物件」欄位還是可以改。要兩層都唯讀：readonly Readonly<FabricRoll>[]
 */

// ============================================================
// 5.2 Pick / Omit
// ============================================================

/**
 * 【從一個 Model 推出多個 DTO】
 * DTO（Data Transfer Object）= 在不同層之間傳遞時用的「資料形狀」。
 * 同一個布卷，在不同場合長得不一樣：
 *
 *   資料庫文件（完整）         FabricRoll
 *   前端「新增」時送的          沒有 _id、沒有 createdAt（後端產生）
 *   列表頁只需要的欄位          rollNo、weightKg、status
 *
 * 手寫三份 interface 的問題：FabricRoll 加一個欄位，另外兩份要記得改；忘了改，TS 不會提醒你。
 * 用推導的：改一處，全部跟著變。
 */
type CreateRollInput = Omit<FabricRoll, '_id' | 'createdAt'>;
type RollListItem = Pick<FabricRoll, 'rollNo' | 'weightKg' | 'status'>;
// hover 兩個看展開結果

/**
 * 【Pick 和 Omit 怎麼選】
 * 看「你想表達的語意」是哪一邊：
 *   Pick：「只要這幾個」→ 白名單。FabricRoll 以後多了欄位，Pick 的結果不會變。
 *   Omit：「除了這幾個都要」→ 黑名單。FabricRoll 以後多了欄位，Omit 的結果會自動多出來。
 *
 * 以「新增表單」來說：Model 多了欄位，表單通常也要多一格 → Omit 比較合理。
 * 以「列表頁」來說：Model 多了欄位，列表不一定要顯示 → Pick 比較合理。
 * 以「API 回應」來說：Model 多了一個 passwordHash，你絕對不希望它自動出現 → 用 Pick（白名單）。
 */

/**
 * 【陷阱 1：Omit 不檢查 key 的拼字】
 * 看 5.0 列的原始碼：Pick<T, K extends keyof T> 有約束，K 必須是 T 真的有的欄位。
 * 但 Omit 的定義是：
 *   type Omit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>;
 * keyof any 就是 string | number | symbol，所以 K 可以是任何字串，打錯字不會報錯。
 */
// @ts-expect-error Pick 會檢查：'rollNoo' 不是 FabricRoll 的欄位
type PickTypo = Pick<FabricRoll, 'rollNoo'>;
type OmitTypo = Omit<FabricRoll, 'createAt'>; // ← 零錯誤！少了 d，createdAt 根本沒被移除

/**
 * 解法：自己包一個有約束的版本。這是第 3 章「泛型約束」最實用的一個應用。
 */
type StrictOmit<T, K extends keyof T> = Omit<T, K>;
// @ts-expect-error 現在拼錯會報錯了
type OmitTypo2 = StrictOmit<FabricRoll, 'createAt'>;

/**
 * 為什麼 TS 官方不直接把 Omit 做成有約束的？
 * 因為有人會對「泛型 T」做 Omit，那時 TS 還不知道 T 有哪些 key，約束會卡住合理的寫法。
 * 你寫業務程式時，對象幾乎都是具體型別，用 StrictOmit 就對了。
 */

/**
 * 【陷阱 2：Omit 用在 union 上，會把 union 壓扁】
 * 沿用第 4 章的機台事件。
 */
type MachineEvent =
  | { type: 'RUN'; machineNo: string; rpm: number }
  | { type: 'STOP'; machineNo: string; reason: 'NEEDLE_BREAK' | 'YARN_OUT' | 'MAINTENANCE' }
  | { type: 'ROLL_DOFF'; machineNo: string; rollNo: string; weightKg: number }
  | { type: 'ALARM'; machineNo: string; level: 'WARN' | 'CRITICAL'; message: string };

// 想做一個「還沒指定機台的事件」：把 machineNo 拿掉
type EventWithoutMachineBad = Omit<MachineEvent, 'machineNo'>;
// hover 看看：{ type: 'RUN' | 'STOP' | 'ROLL_DOFF' | 'ALARM' }
// rpm、reason、rollNo… 全部不見了！可辨識聯合被壓成一個物件。

/**
 * 為什麼？keyof (A | B) 只會得到 A 和 B「共同」有的 key（第 4 章：union 只能讀共同欄位）。
 * MachineEvent 四個成員共同的 key 只有 type 和 machineNo，Omit 掉 machineNo 就只剩 type。
 *
 * 解法：讓 Omit「對 union 的每個成員分別做一次」：
 */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
type EventWithoutMachine = DistributiveOmit<MachineEvent, 'machineNo'>;
// hover：四個成員都在，各自只少了 machineNo ✅
/**
 * T extends unknown ? X : never 叫「條件型別」，這裡只要知道一件事就好：
 * 當 T 是聯合型別時，它會把 A | B | C 拆開，對每個成員各算一次 X，再用 | 接回去。
 * （PropertyKey 是 TS 內建的 string | number | symbol）
 * 記住結論：對可辨識聯合做 Omit / Pick 時，要用分配版本。
 */
const ev: EventWithoutMachine = { type: 'RUN', rpm: 850 }; // ✅
void ev;

/**
 * 【陷阱 3：Pick 只管型別，不會真的把欄位拿掉】★ 很多資料外洩就是這樣發生的
 *
 * 型別在執行期完全消失（第 1 章）。RollListItem 只是在編譯期說「我只看這三個欄位」，
 * 但結構型別系統允許「多餘欄位的物件」指派給「欄位比較少的型別」（第 2 章）。
 */
function toListItemBad(r: FabricRoll): RollListItem {
  return r; // tsc 零錯誤：FabricRoll 的欄位是 RollListItem 的超集，結構相容
}
console.log('5.2 陷阱3 bad :', JSON.stringify(toListItemBad(roll)));
// {"_id":"1","rollNo":"R001",...,"createdAt":"..."} ← 全部欄位都送出去了

function toListItemGood(r: FabricRoll): RollListItem {
  return { rollNo: r.rollNo, weightKg: r.weightKg, status: r.status }; // 明確挑出來
}
console.log('5.2 陷阱3 good:', JSON.stringify(toListItemGood(roll)));
/**
 * 實務教訓：Express 回應裡 res.json(user) 型別寫的是 PublicUser = Pick<User, ...>，
 * 但你直接把 Mongoose 撈出來的 user 丟進去，passwordHash 就一起出去了。
 * 型別只擋「你少給」，不擋「你多給」。多給的部分要靠執行期程式碼（或第 10 章的 zod）真的去掉。
 */

// ============================================================
// 5.3 Record
// ============================================================

/**
 * Record<K, V> = { [P in K]: V }
 * 「key 的型別是 K，每個值的型別是 V」的物件。第 2 章已經用過，這裡講清楚兩種用法的差別。
 */

// 【用法 A：K 是 string —— 開放的字典】
const stockByZone: Record<string, number> = { 'A-01': 12, 'B-03': 4 };
const z = stockByZone['C-99']; // hover：number | undefined（因為開了 noUncheckedIndexedAccess）
console.log('5.3 不存在的 key：', z); // undefined
// 任何字串都能當 key，TS 不知道哪些 key 真的存在，所以讀取時要防 undefined。

// 【用法 B：K 是字面量聯合 —— 封閉的對照表】
type RollStatus = FabricRoll['status']; // 'IN_STOCK' | 'SHIPPED' | 'HOLD'（5.4 會講這個寫法）

const STATUS_LABEL: Record<RollStatus, string> = {
  IN_STOCK: '在庫',
  SHIPPED: '已出貨',
  HOLD: '保留',
};
const label = STATUS_LABEL[roll.status]; // hover：string（沒有 | undefined！）
void label;

/**
 * 用法 B 有兩個保證，這就是第 4 章 Q2 提示你用 Record 取代巢狀 if 的原因：
 *   1. 窮舉：少寫一個 key 會報錯。RollStatus 以後多了 'SCRAPPED'，這裡會當場紅字提醒你補中文。
 *   2. 讀取安全：key 只能是 RollStatus，而且保證每個都有值，所以不會有 | undefined。
 */
// @ts-expect-error 少了 HOLD
const labelMissing: Record<RollStatus, string> = { IN_STOCK: '在庫', SHIPPED: '已出貨' };
void labelMissing;

/**
 * 【用法 C：Partial<Record<K, V>> —— 封閉的 key，但不一定每個都有】
 * 例如「每個狀態的布卷數量」，某個狀態可能根本沒有布卷，你也不想硬塞 0。
 */
function groupByStatus(rolls: readonly FabricRoll[]): Partial<Record<RollStatus, FabricRoll[]>> {
  const result: Partial<Record<RollStatus, FabricRoll[]>> = {};
  for (const r of rolls) {
    const bucket = result[r.status]; // FabricRoll[] | undefined
    if (bucket === undefined) {
      result[r.status] = [r];
    } else {
      bucket.push(r);
    }
  }
  return result;
}
console.log('5.3 groupBy', Object.keys(groupByStatus([roll])));

/**
 * 怎麼選：
 *   key 是「使用者資料」（區域代碼、批號）→ Record<string, V>，讀的時候防 undefined
 *   key 是「程式裡固定的一組選項」（狀態、班別）→ Record<聯合, V>，享受窮舉檢查
 *   固定選項、但不保證每個都有 → Partial<Record<聯合, V>>
 */

// ============================================================
// 5.4 聯合型別的工具：Exclude / Extract / NonNullable
// ============================================================

/**
 * 5.1～5.3 的工具作用在「物件的欄位」上，這一節的工具作用在「聯合的成員」上。
 *
 *   Exclude<U, X>    從聯合 U 裡，剔除「可以指派給 X」的成員
 *   Extract<U, X>    從聯合 U 裡，留下「可以指派給 X」的成員
 *   NonNullable<T>   剔除 null 和 undefined
 */
type ActiveStatus = Exclude<RollStatus, 'SHIPPED'>; // 'IN_STOCK' | 'HOLD'
type NullableZone = string | null | undefined;
type Zone = NonNullable<NullableZone>; // string

// 用在可辨識聯合上特別好用：X 可以寫成「形狀」，用辨識欄位去挑
type AlarmEvent = Extract<MachineEvent, { type: 'ALARM' }>;
// hover：{ type: 'ALARM'; machineNo: string; level: ...; message: string }
type NonAlarmEvent = Exclude<MachineEvent, { type: 'ALARM' }>;
// hover：其餘三種

// 【T['欄位']：索引存取型別，第 3 章學過，這裡是它最常見的用途】
type EventType = MachineEvent['type']; // 'RUN' | 'STOP' | 'ROLL_DOFF' | 'ALARM'
type StopReason = Extract<MachineEvent, { type: 'STOP' }>['reason']; // 組合起來用

/**
 * 第 4 章你手寫了 interface AlarmEvent 再組成 MachineEvent；
 * 這裡是反過來：先有整個聯合，再用 Extract 取出其中一個。兩種方向都常見：
 *   各成員會被單獨拿來當參數型別 → 先寫成員，再組聯合（第 4 章的做法）
 *   聯合是從別處來的（API 定義、第三方套件）→ 用 Extract 取成員
 */

// ============================================================
// 5.5 從值推型別：typeof、ReturnType、Parameters、Awaited
// ============================================================

/**
 * 03b 補充課講過：typeof 出現在「型別位置」時，意思是「把這個值的型別拿過來」。
 * 搭配函式相關的工具型別，可以從已經寫好的函式推出型別，不必再手寫一份。
 */
async function fetchShiftSummary(date: string, shift: 'A' | 'B' | 'C') {
  // 沒寫回傳型別，讓 TS 推論
  return {
    date,
    shift,
    totalKg: 1234.5,
    machines: [{ machineNo: 'K-01', outputKg: 410.2 }],
  };
}

type FetchFn = typeof fetchShiftSummary; // (date: string, shift: 'A'|'B'|'C') => Promise<{...}>
type FetchReturn = ReturnType<typeof fetchShiftSummary>; // Promise<{ date: string; ... }>
type ShiftSummary = Awaited<ReturnType<typeof fetchShiftSummary>>; // { date: string; ... } ← 剝掉 Promise
type FetchParams = Parameters<typeof fetchShiftSummary>; // [date: string, shift: 'A' | 'B' | 'C']
type ShiftCode = Parameters<typeof fetchShiftSummary>[1]; // 'A' | 'B' | 'C'（tuple 取第 1 個）
type MachineOutput = ShiftSummary['machines'][number]; // 陣列元素的型別（03b 的 [number]）

/**
 * 【什麼時候用】
 * ✅ 第三方套件的函式回傳了一個複雜物件，但套件沒有 export 那個型別
 *    （例如某個 SDK 的 createClient() 回傳值，你想把 client 當參數傳給別的函式）
 * ✅ 你自己的函式推論結果就是「真相」，不想再手寫一份會跟它脫節的 interface
 *
 * 【什麼時候不要用】
 * ❌ 對外公開的 API 函式：它的回傳型別是「合約」，應該明確寫出來。
 *    如果合約是從實作推出來的，改實作時就會不知不覺改了合約，呼叫端全部跟著變。
 *    第 1 章的原則仍然成立：函式的參數與回傳值要標註。ReturnType 是給「使用端」用的。
 *
 * 【注意】typeof 後面只能接「值」，不能接型別；ReturnType 後面只能接「函式型別」，不能接函式本身。
 *   ReturnType<fetchShiftSummary>          ❌ fetchShiftSummary 是值（03b 的兩個世界）
 *   ReturnType<typeof fetchShiftSummary>   ✅
 */

// ============================================================
// 5.6 as const
// ============================================================

/**
 * 第 1 章的 widening：
 *   const a = 'IN_STOCK';          → 'IN_STOCK'（const 變數不會被改，推成字面量）
 *   let b = 'IN_STOCK';            → string
 *   const o = { s: 'IN_STOCK' };   → { s: string }  ← 物件的屬性可以被改，所以放寬
 *   const arr = ['A', 'B'];        → string[]
 *
 * as const 對「整個字面量」下一個指令：「不要放寬，我寫什麼就是什麼」。它做三件事：
 *   1. 所有字串 / 數字都保留字面量型別
 *   2. 所有物件屬性都變 readonly
 *   3. 陣列變成 readonly tuple（長度和每個位置的型別都固定）
 *
 * 注意：as const 是本課程唯一允許的 as。它跟 `as FabricRoll` 本質不同：
 *   as FabricRoll 是「叫 TS 相信我」，可能說謊；
 *   as const 只是「推論得更精確」，不可能說謊（它不改變值，只是讓型別更窄、更貼近值）。
 */
const o1 = { status: 'IN_STOCK', maxRpm: 900 }; // { status: string; maxRpm: number }
const o2 = { status: 'IN_STOCK', maxRpm: 900 } as const; // { readonly status: 'IN_STOCK'; readonly maxRpm: 900 }
void [o1, o2];

/**
 * 【最重要的用途：從「值」推出聯合型別】
 * 03b 已經預告過。很多時候你同時需要：
 *   - 一個執行期的陣列（拿來畫下拉選單、驗證 API 資料）
 *   - 一個型別（拿來標註參數）
 * 兩份分開寫就會脫節。用 as const，值是唯一來源，型別從它推出來。
 */
const SHIFTS = ['A', 'B', 'C'] as const; // readonly ['A', 'B', 'C']
type Shift = (typeof SHIFTS)[number]; // 'A' | 'B' | 'C'
// 讀法：typeof SHIFTS 拿到 tuple 型別 → [number] 取「任意數字索引位置」的型別 → 所有元素的聯合

const ZONE_MAP = {
  A: 'A 區（胚布）',
  B: 'B 區（成品）',
  Q: '品檢區',
} as const;
type ZoneKey = keyof typeof ZONE_MAP; // 'A' | 'B' | 'Q'
type ZoneName = (typeof ZONE_MAP)[keyof typeof ZONE_MAP]; // 'A 區（胚布）' | 'B 區（成品）' | '品檢區'

/**
 * 【陷阱：readonly tuple 的 includes】
 * 你一定會想這樣驗證外部資料：
 */
function isShiftBad(x: string): boolean {
  // @ts-expect-error 刪掉看錯誤：Argument of type 'string' is not assignable to parameter of type '"A" | "B" | "C"'
  return SHIFTS.includes(x);
}
void isShiftBad;
/**
 * 為什麼？SHIFTS 的型別是 readonly ['A','B','C']，它的 includes 參數型別是元素型別 'A'|'B'|'C'。
 * 但你就是因為「不知道 x 是不是 'A'|'B'|'C'」才要檢查啊 —— 這是 TS 內建型別一個有名的不便。
 *
 * 不用 as 的三種解法：
 */
// 解法 1：用 some + ===，=== 兩邊型別有交集就允許比較
function isShift1(x: string): x is Shift {
  return SHIFTS.some((s) => s === x);
}
// 解法 2：先「放寬」成 readonly string[] 再 includes。
//   用型別註記（不是 as）：把窄的指派給寬的，這是安全的方向，TS 允許
const SHIFT_LIST: readonly string[] = SHIFTS;
function isShift2(x: string): x is Shift {
  return SHIFT_LIST.includes(x);
}
// 解法 3：如果資料是物件形式（像 ZONE_MAP），用 in 或 Object.hasOwn
function isZoneKey(x: string): x is ZoneKey {
  return Object.hasOwn(ZONE_MAP, x);
}
console.log('5.6 includes', isShift1('B'), isShift2('D'), isZoneKey('Q'));

/**
 * 【enum 為什麼少用】
 * TS 有 enum 語法，你會在很多舊專案看到：
 */
enum RollStatusEnum {
  IN_STOCK = 'IN_STOCK',
  SHIPPED = 'SHIPPED',
}
function shipEnum(s: RollStatusEnum): string {
  return s;
}
shipEnum(RollStatusEnum.IN_STOCK); // ✅
// @ts-expect-error 就算字串一模一樣，也不能直接傳字面量
shipEnum('IN_STOCK');
/**
 * 問題：
 * 1. 字串 enum 是「名義型別」—— 跟 TS 其他地方的結構型別規則不一樣。
 *    API 回來的 'IN_STOCK' 字串、Mongo 撈出來的值，都不能直接當 RollStatusEnum 用，要轉換或 as。
 * 2. enum 不只是型別，它會在執行期產生一個真的物件（編譯後是一段 IIFE），
 *    也就是說它違反了「型別在執行期完全消失」這個 TS 的基本原則。
 * 3. Node.js 22.6+ 可以直接執行 .ts（只做 type stripping，把型別擦掉），
 *    但 enum 擦不掉，所以不支援。TS 5.8 也為此新增了 erasableSyntaxOnly 選項來禁止 enum。
 *
 * 替代方案：as const 陣列（像 SHIFTS）或 as const 物件（像 ZONE_MAP）+ 推導出的聯合型別。
 * 你需要的三件事都有了：執行期可列舉、型別安全、可以直接傳字面量。
 */

// ============================================================
// 5.7 satisfies ★
// ============================================================

/**
 * 設定檔、對照表這類「寫死在程式裡的物件」，你通常同時想要兩件事：
 *   (甲) 檢查：每個值的形狀都對（不能打錯欄位、不能填錯型別）
 *   (乙) 精確：保留我實際寫的 key，讓 keyof 可以推出 'K-01' | 'K-02'，而不是 string
 *
 * 看三種寫法各自做到哪個：
 */
interface MachineConf {
  maxRpm: number;
  zone: 'A' | 'B';
}

// 寫法 1：型別註記 → 有 (甲)，沒有 (乙)
const CONF_1: Record<string, MachineConf> = {
  'K-01': { maxRpm: 900, zone: 'A' },
  'K-02': { maxRpm: 850, zone: 'B' },
};
type No1 = keyof typeof CONF_1; // string ← 你寫的 key 資訊全部丟了
const c1 = CONF_1['K-01']; // MachineConf | undefined ← 明明寫死了還要防 undefined
const c1typo = CONF_1['K-99']; // 零錯誤，執行期 undefined

// 寫法 2：as const → 有 (乙)，沒有 (甲)
const CONF_2 = {
  'K-01': { maxRpm: 900, zone: 'A' },
  'K-02': { maxRpm: 850, zone: 'C' }, // ← zone 填錯了，沒人發現！as const 不檢查任何東西
} as const;
type No2 = keyof typeof CONF_2; // 'K-01' | 'K-02' ✅

// 寫法 3：satisfies → 兩個都有
const CONF_3 = {
  'K-01': { maxRpm: 900, zone: 'A' },
  'K-02': { maxRpm: 850, zone: 'B' },
} satisfies Record<string, MachineConf>;
type No3 = keyof typeof CONF_3; // 'K-01' | 'K-02' ✅
const c3 = CONF_3['K-01']; // { maxRpm: number; zone: 'A' } ✅ 沒有 | undefined
// @ts-expect-error K-99 不存在，當場報錯
const c3typo = CONF_3['K-99'];

// 同樣的內容，zone 填錯時 satisfies 會報錯（取消下面的註解看看）：
// const CONF_BAD = { 'K-01': { maxRpm: 900, zone: 'C' } } satisfies Record<string, MachineConf>;

/**
 * satisfies 的意思：「檢查這個值符合那個型別，但變數的型別仍然用推論出來的（更精確的）那個」。
 *   : Type          → 變數的型別「變成」Type（精確資訊丟掉）
 *   satisfies Type  → 變數的型別「保持」推論結果，只是順便被 Type 檢查
 *
 * 【寫法 4：as const satisfies —— 最完整】
 * 想要字面量 + readonly + 檢查，順序是 as const 在前、satisfies 在後：
 */
const CONF_4 = {
  'K-01': { maxRpm: 900, zone: 'A' },
  'K-02': { maxRpm: 850, zone: 'B' },
} as const satisfies Record<string, MachineConf>;
// CONF_4['K-01'].maxRpm 的型別是 900（字面量），而且整個物件唯讀
void CONF_4;

/**
 * 【什麼時候用哪個】
 *   | 寫法                 | 檢查形狀 | 保留精確 key/值 | 典型場景                              |
 *   |---------------------|---------|---------------|--------------------------------------|
 *   | : Type              | ✅      | ❌            | 函式參數、會被重新指派的變數              |
 *   | as const            | ❌      | ✅            | 單純的選項清單（SHIFTS）                 |
 *   | satisfies Type      | ✅      | ✅            | 設定檔、對照表                          |
 *   | as const satisfies  | ✅      | ✅ + 唯讀      | 設定檔 + 想拿值當字面量型別用              |
 */

/**
 * 【順便解決一個疑問：Object.keys 為什麼回傳 string[]】
 */
const ks = Object.keys(CONF_3); // hover：string[]，不是 ('K-01' | 'K-02')[]
console.log('5.7 Object.keys', ks);
/**
 * 因為結構型別（第 2 章）：型別是 { a: number } 的變數，實際上可以裝著 { a: 1, b: 2 }
 * （多餘欄位只有在「物件字面量直接指派」時才會被擋）。
 * 所以 TS 不敢保證 Object.keys 只會拿到型別上寫的那些 key。
 * 這是正確的設計，不是 bug。需要精確 key 時，自己準備 as const 的 key 陣列（5.9 的做法）。
 */

// ============================================================
// 5.8 自己寫 mapped type
// ============================================================

/**
 * 回到 5.0 的語法：{ [K in keyof T]: ... }
 * 除了照抄 T[K]，你可以把值的型別換成任何東西。以下是實務上最常自己寫的幾個。
 */

// (1) 表單錯誤訊息：每個欄位「可能」有一個錯誤字串
type FormErrors<T> = { [K in keyof T]?: string };
const errs: FormErrors<CreateRollInput> = { weightKg: '重量必須大於 0' };
// @ts-expect-error 欄位名打錯會被抓到（因為 key 是從 T 推的，不是 string）
errs.weigthKg = 'x';

// (2) 表單的「是否被碰過」：每個欄位都有，值是 boolean
type Touched<T> = { [K in keyof T]-?: boolean }; // -? 讓 remark 這種選填欄位也變必填
const touched: Touched<CreateRollInput> = {
  rollNo: false,
  weightKg: true,
  zoneCode: false,
  status: false,
  remark: false, // 拿掉這行會報錯，因為 -? 把 remark 也變成必填
};
void touched;

// (3) 移除唯讀：Readonly 的反操作
type Mutable<T> = { -readonly [K in keyof T]: T[K] };
type FrozenConf = typeof CONF_4; // 全部 readonly
type EditableConf = Mutable<FrozenConf>; // 第一層的 readonly 被拿掉（一樣是淺的）

// (4) 把每個欄位變成可 null（例如 Excel 匯入時，每一格都可能是空的）
type Nullable<T> = { [K in keyof T]: T[K] | null };
type RollImportRow = Nullable<Pick<FabricRoll, 'rollNo' | 'weightKg' | 'zoneCode'>>;
// hover：{ rollNo: string | null; weightKg: number | null; zoneCode: string | null }

/**
 * 看到這裡你會發現：
 *   Partial = 加 ?         Required = 加 -?
 *   Readonly = 加 readonly  Mutable = 加 -readonly
 *   Record = 所有 key 都給同一個值型別
 * 全部都是 mapped type 的一行變化。內建工具型別沒有你要的，就自己寫一個，別手抄。
 */

// ============================================================
// 5.9 組合拳：單一資料來源 Single Source of Truth
// ============================================================

/**
 * 把這章全部串起來，用你熟悉的 WMS 情境示範「一個源頭，推出所有東西」。
 *
 *   YARN_TYPES (as const 陣列)          ← 唯一手寫的地方之一
 *     └→ YarnType（聯合型別）
 *          └→ YARN_META（satisfies Record<YarnType, ...>，漏了會報錯）
 *   YarnLotDoc（interface）              ← 唯一手寫的地方之二
 *     ├→ CreateYarnLotInput = StrictOmit<...>
 *     ├→ UpdateYarnLotInput = Partial<StrictOmit<...>>
 *     └→ YarnLotListItem    = Pick<...>
 *
 * 之後要新增一種紗 'WOOL'：只改 YARN_TYPES 一行 → YARN_META 當場紅字 → 補上 → 完成。
 * 要新增一個欄位：只改 YarnLotDoc → 所有 DTO 自動跟上，哪些 DTO 不該有它就自己決定用 Pick 還是 Omit。
 */
const YARN_TYPES = ['COTTON', 'POLYESTER', 'NYLON'] as const;
type YarnType = (typeof YARN_TYPES)[number];

const YARN_META = {
  COTTON: { label: '棉', shrinkRate: 0.05 },
  POLYESTER: { label: '聚酯', shrinkRate: 0.01 },
  NYLON: { label: '尼龍', shrinkRate: 0.02 },
} satisfies Record<YarnType, { label: string; shrinkRate: number }>;

interface YarnLotDoc {
  _id: string;
  lotNo: string;
  yarnType: YarnType;
  weightKg: number;
  supplierNo: string | null;
  createdAt: string;
  updatedAt: string;
}

type ServerFields = '_id' | 'createdAt' | 'updatedAt';
type CreateYarnLotInput = StrictOmit<YarnLotDoc, ServerFields>;
type UpdateYarnLotInput = Partial<StrictOmit<YarnLotDoc, ServerFields | 'lotNo'>>; // 批號建立後不能改
type YarnLotListItem = Pick<YarnLotDoc, 'lotNo' | 'yarnType' | 'weightKg'>;

// 下拉選單：執行期資料也從同一個源頭來，順序、數量永遠跟型別一致
const yarnOptions = YARN_TYPES.map((t) => ({ value: t, label: YARN_META[t].label }));
console.log('5.9 下拉選單', yarnOptions);

// ============================================================
// 5.10 心智模型總結
// ============================================================

/**
 * | 工具                    | 作用對象   | 一句話                                  | 最常見的坑                                   |
 * |------------------------|-----------|----------------------------------------|---------------------------------------------|
 * | Partial<T>             | 物件欄位   | 全部加 ?                                | 允許 { x: undefined }，展開後蓋掉原值；只有一層  |
 * | Required<T>            | 物件欄位   | 全部加 -?                               | 只有一層                                     |
 * | Readonly<T>            | 物件欄位   | 全部加 readonly                         | 只有一層、只在編譯期                           |
 * | Pick<T, K>             | 物件欄位   | 白名單                                  | 只管型別，不會真的拿掉多餘欄位（資料外洩）         |
 * | Omit<T, K>             | 物件欄位   | 黑名單                                  | 不檢查拼字 → StrictOmit；union 會被壓扁 → 分配版 |
 * | Record<K, V>           | 整個物件   | K 聯合 → 封閉對照表；K string → 開放字典   | string 版讀取要防 undefined                   |
 * | Exclude / Extract      | 聯合成員   | 剔除 / 留下能指派給 X 的成員               | X 可以寫成 { type: 'ALARM' } 形狀              |
 * | NonNullable<T>         | 聯合成員   | 剔除 null、undefined                     |                                             |
 * | T['k'] / T[number]     | 型別取值   | 取欄位型別 / 取陣列元素型別                |                                             |
 * | ReturnType / Parameters| 函式型別   | 取回傳 / 參數 tuple                       | 要 typeof fn，不能直接放函式                    |
 * | Awaited<T>             | Promise   | 剝掉 Promise                            |                                             |
 * | as const               | 值 → 型別  | 不放寬、唯讀、tuple                        | includes 參數被卡窄；不做任何檢查                |
 * | satisfies T            | 值 → 型別  | 檢查但保留推論結果                         | 想要唯讀要寫 as const satisfies                |
 *
 * 三條原則：
 *   1. 型別盡量推導，不要手抄第二份。手抄的型別會跟源頭脫節，而 TS 不會提醒你。
 *   2. 工具型別只改變「編譯期的描述」，不會改變執行期的值。
 *      Pick 不會刪欄位、Partial 不會擋 undefined、Readonly 不會凍結 —— 該做的執行期處理還是要做。
 *   3. 寫死的設定 / 對照表：satisfies；從值推聯合：as const；固定選項的對照表：Record<聯合, V>。
 */

export {};
