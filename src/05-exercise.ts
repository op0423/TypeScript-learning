/**
 * ============================================================
 *  第 5 章 練習：工具型別 Utility Types、as const、satisfies
 * ============================================================
 *
 *  規則：
 *  - 先自己寫，不要先問我。寫完把整份檔案貼回對話，我逐題編譯 + 實際執行檢討。
 *  - 每個 throw new Error('TODO') 換成你的實作；每個標了 TODO 的型別換成你的型別。
 *  - 觀念題直接把答案寫在註解裡。
 *
 *  題目怎麼讀：
 *  每一題都有固定的區塊，照順序看就好。
 *    【情境】      這個函式 / 型別在真實系統裡負責什麼事
 *    【你要做的】  一句話講清楚要寫出什麼
 *    【規格】      「輸入長怎樣 → 要回傳什麼」的對照表；
 *                 表格左邊是輸入的情況，右邊是這個函式必須 return 的東西
 *    【具體例子】  直接寫成「呼叫這樣寫，結果應該等於這個值」，可以當測試用
 *    【提示】      容易卡住的地方
 *    【這題在練什麼】 對應教材哪一節，不會寫時回去翻
 *
 *  這一章有很多題是「寫型別」而不是「寫函式」，所以驗收分成兩種：
 *
 *  1. 型別驗收：npx tsc --noEmit
 *     - 剛拿到檔案時會有 22 個錯誤（14 個 TS2344 + 8 個 TS2578），全部來自各題的「型別驗收」區塊，這是正常的。
 *       分成兩種錯誤代碼：
 *         TS2344  出現在 Expect<Equal<你的型別, 正確答案>> 那種行
 *                 → 意思是「你的型別跟規格不一樣」（下面「驗收工具」有說明）
 *         TS2578  Unused '@ts-expect-error' directive
 *                 → 意思是「這一行應該要報錯，但你的型別沒擋住」（跟第 4 章 Q6 一樣）
 *     - 全部做對應該是零錯誤。型別題的評分者就是編譯器本身。
 *  2. 執行驗收：npx tsx src/05-exercise.ts
 *     - 檔案最底下的測試會印出 ✅ / ❌ / ⬜（未作答）。
 *     - 第 2 章的教訓：tsc 零錯誤 ≠ 程式正確。第 4 章的教訓：錯誤訊息的全形 / 半形、空格要一字不差。
 *       這兩個都要跑。
 *
 *  額外限制（刻意練習用）：
 *  - 全檔禁止使用 `as`（as const 除外），禁止使用 any。
 *  - 「型別題」禁止手抄欄位：規格裡的答案形狀是讓你「驗收」用的，
 *    你必須用工具型別 / typeof / 索引存取從既有的型別或值「推導」出來。
 *    手抄一份雖然也能讓 tsc 歸零，但那等於沒寫（檢討時會算錯）。
 *  - 題目提供的「既有程式碼」（interface、常數、給定的函式）除非題目要你改，否則不要動。
 */

// ============================================================
// 驗收工具（不要改）
// ============================================================

/**
 * Equal<A, B>：A 和 B 完全相同時是 true，否則是 false。
 * Expect<T>：T 必須是 true，不是的話報 TS2344。
 *
 * 所以 type _x = Expect<Equal<你的型別, 正確答案>>;
 *   你的型別對了 → 零錯誤
 *   你的型別錯了 → TS2344 Type 'false' does not satisfy the constraint 'true'
 *
 * 原理用到本課程沒教的技巧（條件型別 + 泛型函式比較），不用看懂，會用就好。
 * 這是 TS 社群寫「型別的單元測試」的標準做法（type-challenges 題庫也是用這個）。
 *
 * 錯的時候怎麼找原因：把游標停在「你的型別」的名字上，
 * 看 VS Code 展開的形狀，跟 Equal 右邊的正確答案逐欄比對。
 */
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;
type Expect<T extends true> = T;

// ============================================================
// 共用資料
// ============================================================

type RollStatus = "IN_STOCK" | "SHIPPED" | "HOLD";

interface FabricRoll {
  _id: string;
  rollNo: string;
  weightKg: number;
  zoneCode: string;
  status: RollStatus;
  remark?: string;
  createdAt: string;
}

// ============================================================
// Q1 — Partial：布卷的 PATCH 更新
// ============================================================

/**
 * 【情境】
 * 倉管在平板上修改布卷資料，前端只送「有改的欄位」到後端 PATCH /rolls/:id。
 * 但不是每個欄位都能改：
 *   _id、createdAt   資料庫產生的，任何人都不能改
 *   rollNo           布卷號已經印在標籤上貼在布卷上了，改了會對不起來，也不能改
 *   其他欄位          weightKg（重新秤重）、zoneCode（搬移）、status、remark 可以改
 *
 * 【你要做的】(a) 寫型別
 * 把下面的 `type RollPatch = unknown;` 換成正確的型別。
 *
 * 【規格】RollPatch 展開之後必須長這樣（這是驗收用的答案，不准照抄，要用工具型別推導）：
 *   {
 *     weightKg?: number;
 *     zoneCode?: string;
 *     status?: RollStatus;
 *     remark?: string;
 *   }
 *
 * 【提示】
 * - 兩步：先「留下能改的欄位」（或「拿掉不能改的欄位」），再「全部變選填」。
 *   兩個工具型別可以巢狀：外層 < 內層 < FabricRoll, ... > >。
 * - 用 Pick 或 Omit 都能過驗收。想一下：FabricRoll 以後多了一個 machineNo（哪台機台織的，
 *   也不該被改），哪一種寫法會「自動」讓它變成可以改？那一種就是比較危險的寫法。
 *   把你的選擇和理由寫在這裡：
 *
 *   我選：用pick選取能更改的欄位候用Partiale將這幾個改成選填
 *   理由：因為如果用了omit,那之後FabricRoll多了欄位則omit也會跟著多出來
 *
 * 【這題在練什麼】教材 5.1 Partial、5.2 Pick / Omit 怎麼選。
 */
type RollPatch = Partial<
  Pick<FabricRoll, "weightKg" | "zoneCode" | "status" | "remark">
>; // TODO(Q1a)

// ---- Q1 型別驗收（不要改）----
type _q1a = Expect<
  Equal<
    RollPatch,
    {
      weightKg?: number;
      zoneCode?: string;
      status?: RollStatus;
      remark?: string;
    }
  >
>;
// @ts-expect-error _id 不能改
const q1bad1: RollPatch = { _id: "X" };
// @ts-expect-error rollNo 不能改
const q1bad2: RollPatch = { rollNo: "R999" };
// @ts-expect-error status 只能是三種之一
const q1bad3: RollPatch = { status: "LOST" };
void [q1bad1, q1bad2, q1bad3];

/**
 * 【你要做的】(b)
 * 實作 applyPatch：把 patch 套用到 roll 上，回傳「套用後的新布卷」。
 *
 * 【規格】
 *   情況                                          要做的事
 *   -------------------------------------------  ---------------------------------------------
 *   patch 裡某個欄位「不存在」                       保留 roll 原本的值
 *   patch 裡某個欄位「存在但值是 undefined」          一樣保留 roll 原本的值（視為沒改）
 *   patch 裡某個欄位有值（包含 0 和 ''）              用 patch 的值
 *   patch.weightKg 有值而且小於 0                    throw new Error('重量不可為負數')
 *   任何情況                                       不可以修改傳進來的 roll，必須回傳一個新物件
 *
 * 補充規則：remark 要「清空」時，前端會送空字串 ''，不是送 undefined。
 *   所以 { remark: '' } → remark 變成 ''；{ remark: undefined } → remark 保持原樣。
 *
 * 【具體例子】（R001 是 weightKg 25.5、zoneCode 'A-01'、status 'IN_STOCK'、沒有 remark 的布卷）
 *   applyPatch(R001, { zoneCode: 'B-03' })       回傳 R001 的內容，只有 zoneCode 變成 'B-03'
 *   applyPatch(R001, { weightKg: undefined })    回傳的 weightKg 是 25.5   ← 不是 undefined
 *   applyPatch(R001, { weightKg: 0 })            回傳的 weightKg 是 0      ← 0 是有效重量
 *   applyPatch(R001, {})                         內容跟 R001 一樣，但不是同一個物件（!== R001）
 *   applyPatch(R001, { weightKg: -1 })           丟出 Error，message 是 '重量不可為負數'
 *   applyPatch(有remark瑕疵的布卷, { remark: undefined })  remark 仍然是 '瑕疵'
 *   applyPatch(有remark瑕疵的布卷, { remark: '' })         remark 變成 ''
 *
 * 【提示】
 * - 最直覺的寫法 return { ...roll, ...patch } 會 tsc 零錯誤，但會掛在第 2 個例子。
 *   原因在教材 5.1 陷阱 1，這正是 (c) 要你回答的。
 * - 「保留原值」要用哪個運算子？第 1 章 ?? / || / ?: 的比較，只有一個對 0 和 '' 都安全。
 * - roll 參數型別是 Readonly<FabricRoll>，你如果想直接改它（roll.weightKg = ...），TS 會擋你。
 *
 * 【這題在練什麼】教材 5.1 Partial 陷阱 1，以及第 1 章的 ??。
 */
function applyPatch(roll: Readonly<FabricRoll>, patch: RollPatch): FabricRoll {
  return {
    ...roll,
    weightKg: patch.weightKg ?? patch.weightKg,
    zoneCode: patch.zoneCode ?? patch.zoneCode,
    status: patch.status ?? patch.status,
    remark: patch.remark ?? patch.remark,
  };
}

/**
 * 【你要做的】(c) 觀念題
 *
 * 1. 如果 (b) 寫成 return { ...roll, ...patch }，
 *    (i)  哪個具體例子會失敗？回傳的結果是什麼？
 *    (ii) 為什麼 tsc 不報錯？（講出 TS 推論展開結果時，對選填欄位做了什麼假設）
 * 2. tsconfig 裡哪一個選項打開之後，{ weightKg: undefined } 這個 patch 在「傳進來那一刻」就會紅字？
 *    打開它有什麼代價？
 *
 *   你的答案：
 *   1. (i)applyPatch(roll, { weightKg: undefined ),會在執行後某一地方跳TypeError
 *      (ii)因為會把選填欄位當成可能是不存在,並不會考慮存在但值是undefined
 *   2.在 tsconfig 開 "exactOptionalPropertyTypes": true,會影響整個專案，很多第三方型別會跟著報錯，所以不是每個團隊都開。
 */

// ============================================================
// Q2 — Pick / Omit：紗線批次的 DTO
// ============================================================

type YarnType = "COTTON" | "POLYESTER" | "NYLON";

interface YarnLot {
  _id: string;
  lotNo: string;
  yarnType: YarnType;
  weightKg: number;
  supplierNo: string | null;
  unitCost: number; // 進貨單價（元 / kg），商業機密，只有採購看得到
  createdAt: string;
  updatedAt: string;
}

/**
 * 【情境】
 * 同一份紗線批次資料，要在三個地方用：
 *   資料庫文件         YarnLot（上面，全部欄位）
 *   採購「新增批次」     前端送出的表單。_id、createdAt、updatedAt 是後端產生的，前端不會送
 *   現場平板「查批次」    織布現場的人要看批號、紗種、重量、供應商，但絕對不能看到 unitCost
 *
 * 【你要做的】(a) 寫三個型別
 *
 *   (a-1) StrictOmit<T, K>：功能跟 Omit 一樣，但 K 打錯字（T 沒有這個欄位）時要報錯。
 *         現在的佔位寫法 `K extends PropertyKey` 就是內建 Omit 的約束（PropertyKey = string | number | symbol），
 *         改它的約束就對了。
 *   (a-2) CreateYarnLotInput：採購新增時的表單型別。必須用你的 StrictOmit 寫。
 *   (a-3) YarnLotPublic：現場平板看到的型別。
 *
 * 【規格】展開之後必須長這樣（驗收用，不准照抄）：
 *   CreateYarnLotInput = { lotNo: string; yarnType: YarnType; weightKg: number;
 *                          supplierNo: string | null; unitCost: number }
 *   YarnLotPublic      = { lotNo: string; yarnType: YarnType; weightKg: number;
 *                          supplierNo: string | null }
 *
 * 【提示】
 * - (a-3) 用 Pick 和用 StrictOmit<YarnLot, '_id' | 'unitCost' | ...> 都能過驗收，但只有一種是對的。
 *   想想看：半年後有人在 YarnLot 加了 supplierPrice（供應商報價，一樣是機密），
 *   兩種寫法各會發生什麼事？答案寫在 (c)。
 *
 * 【這題在練什麼】教材 5.2 Pick / Omit、Omit 不檢查拼字、StrictOmit。
 */
type StrictOmit<T, K extends keyof T> = Omit<T, K>; // TODO(Q2a-1)
type CreateYarnLotInput = StrictOmit<
  YarnLot,
  "_id" | "createdAt" | "updatedAt"
>; // TODO(Q2a-2)
type YarnLotPublic = Pick<
  YarnLot,
  "lotNo" | "yarnType" | "weightKg" | "supplierNo"
>; // TODO(Q2a-3)

// ---- Q2 型別驗收（不要改）----
type _q2a2 = Expect<
  Equal<
    CreateYarnLotInput,
    {
      lotNo: string;
      yarnType: YarnType;
      weightKg: number;
      supplierNo: string | null;
      unitCost: number;
    }
  >
>;
type _q2a3 = Expect<
  Equal<
    YarnLotPublic,
    {
      lotNo: string;
      yarnType: YarnType;
      weightKg: number;
      supplierNo: string | null;
    }
  >
>;
// @ts-expect-error createAt 少了 d，StrictOmit 必須抓到
type _q2typo = StrictOmit<YarnLot, "createAt">;

/**
 * 【你要做的】(b)
 * 實作 toPublic：把一筆完整的 YarnLot 轉成現場平板要看的 YarnLotPublic。
 * 這個函式的回傳值會直接被 res.json() 送到平板上。
 *
 * 【規格】
 *   輸入                  要 return 的值
 *   -------------------  ----------------------------------------------------------
 *   一筆完整的 YarnLot    一個新物件，「只有」lotNo、yarnType、weightKg、supplierNo 四個欄位
 *                        不能多出任何欄位（尤其是 unitCost）
 *
 * 【具體例子】
 *   toPublic({ _id: '1', lotNo: 'Y-001', yarnType: 'COTTON', weightKg: 50, supplierNo: 'S-12',
 *              unitCost: 86.5, createdAt: '...', updatedAt: '...' })
 *     回傳 { lotNo: 'Y-001', yarnType: 'COTTON', weightKg: 50, supplierNo: 'S-12' }
 *
 * 【提示】
 * - return lot; 這一行會 tsc 零錯誤，但會掛掉測試。為什麼零錯誤？這是 (c) 的第 1 題。
 *
 * 【這題在練什麼】教材 5.2 陷阱 3：Pick 只管型別，不會真的把欄位拿掉。
 */
function toPublic(lot: YarnLot): YarnLotPublic {
  return {
    lotNo: lot.lotNo,
    yarnType: lot.yarnType,
    weightKg: lot.weightKg,
    supplierNo: lot.supplierNo,
  };
}

/**
 * 【你要做的】(c) 觀念題
 *
 * 1. (b) 如果寫成 return lot;，為什麼 tsc 零錯誤？（用第 2 章「結構型別」的觀念解釋）
 *    同樣是多了欄位，為什麼 const x: YarnLotPublic = { lotNo: ..., ..., unitCost: 1 } 這樣直接寫會報錯？
 * 2. (a-3) 用 Pick 和用 StrictOmit 的差別：YarnLot 加了 supplierPrice 之後，兩種寫法各會怎樣？
 *    所以「對外公開的型別」應該用哪一種？
 *
 *   你的答案：
 *   1.因為YarnLot的欄位比YarnLotPublic多,而TS的結構型別系統針對多欄位物件指派給欄位較少的物件,多餘的欄位會被TS當作是正常的而不是undefined
 *   2.如果加了supplierPric之後,StrictOmit因為是排除指定元素,
 *    所以會一併回傳supplierPric回來,Pick則是指定元素,所以並不會回傳supplierPric回來因為當初並未指定該元素
 *    所以對外公開的型別應用pick
 */

// ============================================================
// Q3 — as const + Record：機台狀態的單一資料來源
// ============================================================

/**
 * 【情境】
 * 機台看板要顯示每台機台的狀態燈號。狀態只有四種，而且以後很可能會增加（例如「換紗中」）。
 * 目標是：以後新增狀態時「只改一個地方」，其他該補的地方 TS 會自己紅字提醒你。
 *
 * 下面這個陣列就是唯一的資料來源（題目給的，不要改）：
 */
const MACHINE_STATES = ["RUNNING", "IDLE", "DOWN", "MAINTENANCE"] as const;

/**
 * 【你要做的】(a) 寫型別
 * 把 `type MachineState = string;` 換成「從 MACHINE_STATES 推導出來的」聯合型別。
 * （這裡先放 string 而不是 unknown，是為了讓下面的 Record 在你寫之前也能編譯。）
 *
 * 【規格】展開後必須是 'RUNNING' | 'IDLE' | 'DOWN' | 'MAINTENANCE'（不准手抄這四個字串）
 *
 * 【這題在練什麼】教材 5.6「從值推出聯合型別」。
 */
type MachineState = (typeof MACHINE_STATES)[number]; // TODO(Q3a)

/**
 * 【你要做的】(b) 填對照表
 * 把 STATE_META 的內容填完。型別註記 Record<MachineState, StateMeta> 已經幫你寫好了，不要改。
 *
 * 【規格】
 *   狀態           label    color
 *   ------------  -------  --------
 *   RUNNING       運轉      green
 *   IDLE          待機      gray
 *   DOWN          故障      red
 *   MAINTENANCE   保養      amber
 *
 * 【提示】
 * - 做完 (a) 之後，STATE_META 會立刻紅字，錯誤訊息會「列出你漏了哪些 key」。先看完那個訊息再填。
 *   那個紅字就是這一題想讓你看到的東西：Record<聯合, V> 的窮舉檢查。
 */
interface StateMeta {
  label: string;
  color: "green" | "gray" | "red" | "amber";
}

const STATE_META: Record<MachineState, StateMeta> = {
  RUNNING: { label: "運轉", color: "green" },
  IDLE: { label: "待機", color: "gray" },
  DOWN: { label: "故障", color: "red" },
  MAINTENANCE: { label: "保養", color: "amber" },
  // TODO(Q3b)
};

/**
 * 【你要做的】(c)
 * 實作 stateBadge：收一個狀態，回傳看板上顯示的文字。
 *
 * 【規格】格式是 `${label}（${color}）`，括號是全形
 *
 * 【具體例子】
 *   stateBadge('RUNNING')      回傳 '運轉（green）'
 *   stateBadge('DOWN')         回傳 '故障（red）'
 *
 * 【提示】
 * - 在你做 (a) 之前，STATE_META[s] 的型別會是 StateMeta | undefined（因為 key 是 string，
 *   而專案開了 noUncheckedIndexedAccess）。做完 (a) 之後再 hover 一次，| undefined 會不見。
 *   請寫「做完 (a) 之後」的版本，不需要處理 undefined。
 */
function stateBadge(s: MachineState): string {
  const label = STATE_META[s];
  return `${label.label} (${label.color})`;
}

/**
 * 【你要做的】(d)
 * 實作 isMachineState：機台 PLC 回傳的狀態是 unknown，判斷它是不是合法的 MachineState。
 *
 * 【規格】
 *   輸入 x                           要 return 的值
 *   -------------------------------  ------------
 *   'RUNNING' / 'IDLE' / 'DOWN' / 'MAINTENANCE'   true
 *   其他字串（包含小寫 'idle'）          false
 *   不是字串（null、數字、物件…）         false
 *
 * 【提示】
 * - 限制：不准手寫四個字串一個一個比對，必須用 MACHINE_STATES 判斷（單一資料來源）。
 *   這樣以後新增狀態時，這個函式完全不用改。
 * - 你第一個想到的寫法 MACHINE_STATES.includes(x) 會紅字，錯誤訊息很值得讀。
 *   教材 5.6 列了三種不用 as 的解法，選一種。
 * - 回傳型別是型別謂詞 x is MachineState（第 4 章 4.9）。
 *
 * 【這題在練什麼】教材 5.6 readonly tuple 的 includes 陷阱，以及第 4 章型別守衛。
 */
function isMachineState(x: unknown): x is MachineState {
  if (typeof x !== "string") return false;
  if (x === null) return false;
  if (!Object.hasOwn(MACHINE_STATES, x)) return false;
  return true;
}

/**
 * 【你要做的】(e)
 * 實作 countStates：統計每種狀態有幾台機台。
 *
 * 【規格】
 *   - 回傳的物件必須「四個狀態都有」，沒有機台的狀態是 0（看板上要顯示 0 台）
 *   - 輸入空陣列時，回傳四個 0
 *
 * 【具體例子】
 *   countStates([
 *     { machineNo: 'K-01', state: 'RUNNING' },
 *     { machineNo: 'K-02', state: 'DOWN' },
 *     { machineNo: 'K-03', state: 'RUNNING' },
 *   ])
 *     回傳 { RUNNING: 2, IDLE: 0, DOWN: 1, MAINTENANCE: 0 }
 *
 * 【提示】
 * - 回傳型別是 Record<MachineState, number>，所以初始物件如果寫成 {}，TS 會報錯（缺 key）。
 *   不准用 as 硬轉。最簡單的做法是初始物件把四個 key 都寫出來，每個都是 0。
 *   這樣寫的好處是：以後 MACHINE_STATES 多一個狀態，這裡會紅字提醒你補。
 * - 累加時 result[m.state] 的型別是 number，不會有 | undefined，想想為什麼（對比 Record<string, number>）。
 *
 * 【這題在練什麼】教材 5.3 Record<聯合, V> 的兩個保證：窮舉 + 讀取不會是 undefined。
 */
function countStates(
  machines: readonly { machineNo: string; state: MachineState }[],
): Record<MachineState, number> {
  const result: Record<MachineState, number> = {
    RUNNING: 0,
    IDLE: 0,
    DOWN: 0,
    MAINTENANCE: 0,
  };
  for (const i of machines) {
    if (Object.hasOwn(result, i.state)) {
      result[i.state] += 1;
    }
  }
  return result;
}

// ---- Q3 型別驗收（不要改）----
type _q3a = Expect<
  Equal<MachineState, "RUNNING" | "IDLE" | "DOWN" | "MAINTENANCE">
>;
// @ts-expect-error STATE_META 沒有 BROKEN 這個狀態
void STATE_META.BROKEN;

// ============================================================
// Q4 — satisfies：機台設定檔
// ============================================================

/**
 * 【情境】
 * 每台針織機的規格寫死在程式裡（題目給的）。現在的寫法用了型別註記 : Record<string, MachineSpec>，
 * 結果 MachineNo 被推成 string，任何字串都能當機台編號，打錯 'K-99' 也不會報錯。
 */
interface MachineSpec {
  maxRpm: number;
  gauge: 18 | 24 | 28; // 針距（每英吋針數）
  zone: "A" | "B";
}

/**
 * 【你要做的】(a)
 * 只改下面 MACHINES「宣告那一行的型別寫法」（冒號後面或物件結尾），物件的內容一個字都不要改，
 * 讓以下兩件事同時成立：
 *   1. MachineNo 變成 'K-01' | 'K-02' | 'K-03'
 *   2. 仍然會檢查每個機台的規格形狀（例如 gauge 填 20、zone 填 'C' 要報錯）
 *
 * 【怎麼知道自己寫對了】
 *   下面「Q4 型別驗收」零錯誤，而且你做 (c) 的實驗時 gauge: 20 會紅字。
 *
 * 【這題在練什麼】教材 5.7 satisfies。
 */
const MACHINES: Record<string, MachineSpec> = {
  "K-01": { maxRpm: 900, gauge: 28, zone: "A" },
  "K-02": { maxRpm: 850, gauge: 24, zone: "A" },
  "K-03": { maxRpm: 780, gauge: 18, zone: "B" },
};

type MachineNo = keyof typeof MACHINES; // 這行不要改，它會隨著你 (a) 的寫法自動變

// ---- Q4 型別驗收（不要改）----
type _q4a = Expect<Equal<MachineNo, "K-01" | "K-02" | "K-03">>;
// @ts-expect-error 沒有 K-99 這台
const q4bad: MachineNo = "K-99";
void q4bad;

/**
 * 【你要做的】(b)
 * 實作 targetRpm：生產排程會用「負載率」決定機台實際要跑的轉速。
 *
 * 【規格】
 *   情況                              要做的事
 *   --------------------------------  -----------------------------------------
 *   loadRate < 0 或 loadRate > 1       throw new Error('負載率需介於 0 到 1')
 *   其他                               return Math.round(該機台 maxRpm × loadRate)
 *
 * 【具體例子】
 *   targetRpm('K-01', 0.8)     回傳 720
 *   targetRpm('K-03', 1)       回傳 780
 *   targetRpm('K-02', 0.333)   回傳 283      （850 × 0.333 = 283.05，四捨五入）
 *   targetRpm('K-01', 0)       回傳 0        ← 0 是合法的負載率（停機排程）
 *   targetRpm('K-01', 1.2)     丟出 Error，message 是 '負載率需介於 0 到 1'
 *
 * 【提示】
 * - 請先做完 (a) 再寫這題。做完 (a) 之後 MACHINES[no] 的型別不會有 | undefined，
 *   你不需要寫任何「找不到機台」的防禦。如果你發現自己在寫 if (!spec)，代表 (a) 還沒做對。
 * - 注意「一行最多一個 ||」的老規則，範圍檢查拆成兩個 if 也可以。
 */
function targetRpm(no: MachineNo, loadRate: number): number {
  throw new Error("TODO");
}

/**
 * 【你要做的】(c)
 * 實作 machinesInZone：列出某個區域的所有機台編號，回傳型別是 MachineNo[]。
 *
 * 【具體例子】
 *   machinesInZone('A')   回傳 ['K-01', 'K-02']
 *   machinesInZone('B')   回傳 ['K-03']
 *
 * 【提示】
 * - 直覺寫法 Object.keys(MACHINES).filter(...) 會紅字：Object.keys 回傳的是 string[]，
 *   不是 MachineNo[]。原因在教材 5.7 最後一段。
 * - 不准用 as。回想第 4 章：有一種函式可以讓 filter 把陣列的型別「換掉」。
 *   先寫一個 isMachineNo(k: string): k is MachineNo，判斷 k 是不是 MACHINES 自己的 key
 *   （用 Object.hasOwn，不要用 in —— 'toString' in MACHINES 會是 true，想想為什麼）。
 * - 可以分兩次 filter：一次換型別，一次挑區域。
 *
 * 【這題在練什麼】教材 5.7 Object.keys 為什麼是 string[]，以及第 4 章型別守衛 + filter。
 */
function machinesInZone(zone: MachineSpec["zone"]): MachineNo[] {
  throw new Error("TODO");
}

/**
 * 【你要做的】(d) 動手做實驗然後回答
 *
 * 步驟：
 *   1. 把 K-02 的 gauge: 24 暫時改成 gauge: 20。
 *   2. 依序把 MACHINES 的寫法換成下面三種，每換一種就跑一次 npx tsc --noEmit，記下結果：
 *        (i)   const MACHINES: Record<string, MachineSpec> = { ... };   （原本的）
 *        (ii)  const MACHINES = { ... } as const;
 *        (iii) 你在 (a) 寫的版本
 *   3. 回答下面的問題，然後把 gauge 改回 24、MACHINES 改回 (iii)。
 *
 * 問題：
 *   1. 三種寫法，哪幾種抓到 gauge: 20 這個錯誤？
 *   2. 三種寫法，哪幾種讓 _q4a 通過？
 *   3. 用一句話總結：型別註記、as const、satisfies 各自「負責」什麼？
 *
 *   你的答案：
 *   1.
 *   2.
 *   3.
 */

// ============================================================
// Q5 — 從既有程式碼推型別（全部是型別題）
// ============================================================

/**
 * 【情境】
 * 你接手一個專案，裡面有一個機台事件聯合型別，和一個「沒有寫回傳型別」的報表 API 函式（都是題目給的）。
 * 你要在其他檔案用到它們的各個部分，但原作者沒有把那些型別 export 出來。
 * 手抄一份很危險（原作者改了你不會知道），所以全部要「推導」。
 */
type StopReason = "NEEDLE_BREAK" | "YARN_OUT" | "MAINTENANCE";

type MachineEvent =
  | { type: "RUN"; machineNo: string; rpm: number }
  | { type: "STOP"; machineNo: string; reason: StopReason }
  | { type: "ROLL_DOFF"; machineNo: string; rollNo: string; weightKg: number }
  | {
      type: "ALARM";
      machineNo: string;
      level: "WARN" | "CRITICAL";
      message: string;
    };

async function fetchDowntimeReport(
  machineNo: string,
  range: { from: string; to: string },
  opts?: { includeMaintenance: boolean },
) {
  const stops: { reason: StopReason; minutes: number; at: string }[] = [];
  if (opts?.includeMaintenance === true) {
    stops.push({ reason: "MAINTENANCE", minutes: 60, at: range.from });
  }
  return {
    machineNo,
    range,
    totalMinutes: stops.reduce((sum, s) => sum + s.minutes, 0),
    stops,
  };
}
void fetchDowntimeReport;

/**
 * 【你要做的】(a)～(g) 寫七個型別
 * 每一個都只能用：工具型別、typeof、索引存取 T['k'] / T[number] / T[0]、以及前面已經推出來的型別。
 * 不准出現任何手寫的欄位名稱或 { ... } 物件型別。
 *
 * 【規格】
 *   型別名稱          意思                                          驗收的答案（展開後）
 *   ---------------  --------------------------------------------  ------------------------------------------
 *   (a) EventType     所有事件的 type 值                              'RUN' | 'STOP' | 'ROLL_DOFF' | 'ALARM'
 *   (b) AlarmEvent    只有警報事件                                    { type: 'ALARM'; machineNo; level; message }
 *   (c) ProductionEvent  「不是」停機、也「不是」警報的事件               RUN 和 ROLL_DOFF 兩種成員的聯合
 *   (d) DowntimeReport   fetchDowntimeReport 回傳的報表（不是 Promise）  { machineNo; range; totalMinutes; stops }
 *   (e) DateRange        fetchDowntimeReport 第 2 個參數的型別          { from: string; to: string }
 *   (f) DowntimeStop     報表 stops 陣列裡「一筆」的型別                 { reason: StopReason; minutes; at }
 *   (g) ReportOptions    fetchDowntimeReport 第 3 個參數的型別，        { includeMaintenance: boolean }
 *                        但是不要 | undefined
 *
 * 【提示】
 * - (b)(c)：Extract / Exclude 的第二個參數可以寫成「形狀」，例如 { type: 'ALARM' }。
 *   (c) 要一次排除兩種，想想 type 欄位可以寫成聯合。
 * - (d)：要剝兩層 —— 先取函式的回傳型別（是 Promise<...>），再把 Promise 剝掉。
 *   記得 ReturnType 的角括號裡要放「型別」，函式本身是值（教材 5.5 最後一段）。
 * - (e)(g)：Parameters 回傳的是 tuple，用數字索引取第幾個。從 0 開始算。
 * - (g)：選填參數 opts? 取出來會自動帶 | undefined，用哪個工具去掉？
 * - (f)：先取 stops 欄位（是陣列型別），再取陣列元素的型別（03b 的 [number]）。
 *
 * 【這題在練什麼】教材 5.4、5.5 全部。
 */
type EventType = unknown; // TODO(Q5a)
type AlarmEvent = unknown; // TODO(Q5b)
type ProductionEvent = unknown; // TODO(Q5c)
type DowntimeReport = unknown; // TODO(Q5d)
type DateRange = unknown; // TODO(Q5e)
type DowntimeStop = unknown; // TODO(Q5f)
type ReportOptions = unknown; // TODO(Q5g)

// ---- Q5 型別驗收（不要改）----
type _q5a = Expect<Equal<EventType, "RUN" | "STOP" | "ROLL_DOFF" | "ALARM">>;
type _q5b = Expect<
  Equal<
    AlarmEvent,
    {
      type: "ALARM";
      machineNo: string;
      level: "WARN" | "CRITICAL";
      message: string;
    }
  >
>;
type _q5c = Expect<
  Equal<
    ProductionEvent,
    | { type: "RUN"; machineNo: string; rpm: number }
    | { type: "ROLL_DOFF"; machineNo: string; rollNo: string; weightKg: number }
  >
>;
type _q5d = Expect<
  Equal<
    DowntimeReport,
    {
      machineNo: string;
      range: { from: string; to: string };
      totalMinutes: number;
      stops: { reason: StopReason; minutes: number; at: string }[];
    }
  >
>;
type _q5e = Expect<Equal<DateRange, { from: string; to: string }>>;
type _q5f = Expect<
  Equal<DowntimeStop, { reason: StopReason; minutes: number; at: string }>
>;
type _q5g = Expect<Equal<ReportOptions, { includeMaintenance: boolean }>>;

/**
 * 【你要做的】(h)
 * 實作 longestStop：找出報表裡停機時間最長的那一筆。
 *
 * 【規格】
 *   情況                          要 return 的值
 *   ---------------------------  -----------------------------------
 *   stops 是空陣列                  undefined
 *   有多筆                         minutes 最大的那一筆
 *   最大值有好幾筆一樣               取「最前面」的那一筆
 *
 * 【具體例子】
 *   stops = [ {YARN_OUT, 30, '08:00'}, {NEEDLE_BREAK, 45, '10:00'}, {MAINTENANCE, 45, '13:00'} ]
 *   longestStop(報表) 回傳 { reason: 'NEEDLE_BREAK', minutes: 45, at: '10:00' }   ← 45 同分取前面
 *
 * 【提示】
 * - 回傳型別 DowntimeStop | undefined 是題目定好的。stops[0] 在 noUncheckedIndexedAccess 下
 *   本來就是 DowntimeStop | undefined，好好利用它。
 * - 用 reduce 或 for...of 都可以。「同分取前面」只跟你用 > 還是 >= 有關。
 */
function longestStop(report: DowntimeReport): DowntimeStop | undefined {
  throw new Error("TODO");
}

// ============================================================
// Q6 — 自己寫 mapped type：收紗表單
// ============================================================

/**
 * 【情境】
 * 倉庫收紗時，倉管在平板表單上輸入：批號、重量、筒數（一批紗有幾個紗筒）、備註。
 * 這是第 7 章 React 表單的預習：HTML 的 <input> 不管你輸入什麼，拿到的值「永遠是字串」。
 * 所以同一份資料在表單裡要有三種形狀：
 *
 *   最後要送出的資料    ReceiveInput（題目給的，下面）
 *   表單輸入框的值      每個欄位都是 string，而且每個欄位都「一定有」（選填的 remark 也有，沒填就是 ''）
 *   驗證錯誤訊息        每個欄位「可能」有一個錯誤字串
 */
interface ReceiveInput {
  lotNo: string;
  weightKg: number;
  cones: number; // 筒數，必須是正整數
  remark?: string;
}

/**
 * 【你要做的】(a) 寫兩個泛型 mapped type
 *
 *   FormValues<T>：T 的每一個欄位都變成 string，而且全部變必填（選填的也變必填）
 *   FormErrors<T>：T 的每一個欄位都變成 string，而且全部變選填
 *
 * 【規格】展開後必須是（驗收用）：
 *   FormValues<ReceiveInput> = { lotNo: string; weightKg: string; cones: string; remark: string }
 *   FormErrors<ReceiveInput> = { lotNo?: string; weightKg?: string; cones?: string; remark?: string }
 *
 * 【提示】
 * - 語法骨架：{ [K in keyof T]: ... }。值的位置不用 T[K]，直接寫 string。
 * - 「變必填」和「變選填」用的修飾子在教材 5.0 和 5.8 各出現過一次。
 * - 這兩個要寫成「泛型」，不是只針對 ReceiveInput 寫死。之後任何表單都能套用。
 *
 * 【這題在練什麼】教材 5.8 自己寫 mapped type。
 */
type FormValues<T> = unknown; // TODO(Q6a)
type FormErrors<T> = unknown; // TODO(Q6a)

// ---- Q6 型別驗收（不要改）----
type _q6a1 = Expect<
  Equal<
    FormValues<ReceiveInput>,
    { lotNo: string; weightKg: string; cones: string; remark: string }
  >
>;
type _q6a2 = Expect<
  Equal<
    FormErrors<ReceiveInput>,
    { lotNo?: string; weightKg?: string; cones?: string; remark?: string }
  >
>;
// @ts-expect-error remark 在表單裡是必填（沒填是 ''，不是不存在）
const q6bad1: FormValues<ReceiveInput> = {
  lotNo: "Y-1",
  weightKg: "1",
  cones: "2",
};
// @ts-expect-error 錯誤訊息的 key 必須是真的欄位名
const q6bad2: FormErrors<ReceiveInput> = { lotNoo: "必填" };
void [q6bad1, q6bad2];

/**
 * 【你要做的】(b)
 * 實作 parseReceiveForm：把表單的字串值驗證並轉換成 ReceiveInput。
 * 回傳一個可辨識聯合（第 4 章 Q6 的做法）：成功帶資料，失敗帶「所有」錯誤。
 *
 * 【規格】每個欄位的規則（先 trim 再判斷）
 *   欄位        情況                                     錯誤訊息（寫進 errors 對應的欄位）
 *   ---------  ---------------------------------------  -------------------------------
 *   lotNo      trim 後是空字串                             '必填'
 *   weightKg   trim 後是空字串                             '必填'
 *              轉成數字後不是有限數字，或 <= 0                '重量需為正數'
 *   cones      trim 後是空字串                             '必填'
 *              轉成數字後不是整數，或 <= 0                    '筒數需為正整數'
 *   remark     不會有錯誤；trim 後是空字串就「不要有 remark 這個 key」，否則放 trim 後的字串
 *
 *   全部欄位都沒錯   return { ok: true, data: 轉換後的 ReceiveInput }
 *                  lotNo 放 trim 後的字串，weightKg / cones 放數字
 *   任何欄位有錯     return { ok: false, errors: 所有有錯的欄位 }
 *                  注意是「所有」：不要遇到第一個錯就 return，三個欄位都要檢查完
 *
 * 【具體例子】
 *   parseReceiveForm({ lotNo: ' Y-001 ', weightKg: '50.5', cones: '12', remark: '' })
 *     回傳 { ok: true, data: { lotNo: 'Y-001', weightKg: 50.5, cones: 12 } }     ← 沒有 remark key
 *   parseReceiveForm({ lotNo: 'Y-002', weightKg: '20', cones: '4', remark: ' 急件 ' })
 *     回傳 { ok: true, data: { lotNo: 'Y-002', weightKg: 20, cones: 4, remark: '急件' } }
 *   parseReceiveForm({ lotNo: '', weightKg: 'abc', cones: '2.5', remark: '' })
 *     回傳 { ok: false, errors: { lotNo: '必填', weightKg: '重量需為正數', cones: '筒數需為正整數' } }
 *   parseReceiveForm({ lotNo: 'Y-003', weightKg: '  ', cones: '0', remark: '' })
 *     回傳 { ok: false, errors: { weightKg: '必填', cones: '筒數需為正整數' } }
 *
 * 【提示】
 * - 陷阱：Number('') 和 Number('   ') 都是 0，不是 NaN。所以「空字串」一定要先檢查，
 *   否則 weightKg 空白會得到「重量需為正數」而不是「必填」。這是第 1 章 falsy 問題的親戚。
 * - 有限數字：Number.isFinite()；整數：Number.isInteger()。
 * - errors 的型別是 FormErrors<ReceiveInput>，所以可以先宣告一個空的 {}，再一格一格填。
 *   最後用「errors 有沒有任何 key」決定成功或失敗：Object.keys(errors).length。
 * - 「沒有 remark 這個 key」和「remark: undefined」在測試裡是兩回事（測試會用 'remark' in data 檢查）。
 *   第一個例子要讓 data 裡完全沒有 remark。
 *
 * 【這題在練什麼】教材 5.8 mapped type 的實際用途 + 第 4 章可辨識聯合 + 第 1 章 falsy。
 */
type ParseResult =
  | { ok: true; data: ReceiveInput }
  | { ok: false; errors: FormErrors<ReceiveInput> };

function parseReceiveForm(values: FormValues<ReceiveInput>): ParseResult {
  throw new Error("TODO");
}

// ============================================================
// Q7 — 觀念題：tsc 零錯誤（或只有預期的錯誤），但有問題
// ============================================================

/**
 * 這一區三小題都不用改程式，是「讀程式碼 + 做實驗 + 回答問題」。
 * 三段程式都不會被執行到（用 void 擋住），可以放心改來改去。
 * 想實際跑跑看的話，自己在檔案最下面加幾行呼叫，測完刪掉。
 */

// ---------- (a) ----------
type DraftEventBad = Omit<MachineEvent, "machineNo">;

function describeDraft(d: DraftEventBad): string {
  if (d.type === "RUN") {
    // @ts-expect-error 刪掉這行指令，讀錯誤訊息
    return `轉速 ${d.rpm}`;
  }
  return d.type;
}
void describeDraft;
/**
 * 【背景】
 * 想做「還沒指定機台的事件草稿」，所以把 machineNo Omit 掉。
 * 但是在 if (d.type === 'RUN') 裡面讀 d.rpm 卻紅字。
 *
 * 【要回答的】
 * 1. 錯誤訊息是什麼？（錯誤代碼 + 訊息）
 * 2. 把游標停在 DraftEventBad 上，它展開成什麼？為什麼 rpm、reason 這些欄位都不見了？
 *    （提示：keyof 一個聯合型別，得到的是什麼 key）
 * 3. 為什麼 if (d.type === 'RUN') 沒辦法把 d 縮小成 RUN 事件？（第 4 章可辨識聯合的前提是什麼）
 * 4. 寫出修正後的 DraftEvent 型別（教材 5.2 陷阱 2）。
 *
 *   你的答案：
 *   1.
 *   2.
 *   3.
 *   4.
 */

// ---------- (b) ----------
interface KnitMachine {
  machineNo: string;
  spec: { maxRpm: number; gauge: number };
}

function previewSlowDown(m: Readonly<KnitMachine>): number {
  m.spec.maxRpm = Math.round(m.spec.maxRpm * 0.8); // 零錯誤
  return m.spec.maxRpm;
}
void previewSlowDown;
/**
 * 【背景】
 * previewSlowDown 只是想「預覽」降速 20% 後的轉速給使用者看，參數也宣告成 Readonly 了，
 * 作者以為這樣就保證不會改到傳進來的機台。
 *
 * 【要回答的】
 * 1. 呼叫 previewSlowDown(k01) 兩次，第二次回傳的數字跟第一次一樣嗎？k01.spec.maxRpm 最後變成多少？
 *    （k01 的 maxRpm 一開始是 900，可以自己在檔案最下面寫幾行跑跑看）
 * 2. 參數明明是 Readonly，為什麼 m.spec.maxRpm = ... 沒有紅字？（試試看 m.machineNo = 'X' 會不會紅字）
 * 3. 給兩種修法：
 *    (i)  只改函式內部：根本不需要修改任何東西就能算出預覽值
 *    (ii) 只改參數型別：讓 m.spec.maxRpm = ... 這一行紅字（寫出型別）
 *
 *   你的答案：
 *   1.
 *   2.
 *   3. (i)
 *      (ii)
 */

// ---------- (c) ----------
enum ShiftEnum {
  A = "A",
  B = "B",
  C = "C",
}

function shiftLabel(s: ShiftEnum): string {
  return `${s} 班`;
}

// 班別是從 API 回來的字串
// @ts-expect-error 刪掉這行指令，讀錯誤訊息
shiftLabel("B");
void shiftLabel;
/**
 * 【要回答的】
 * 1. 錯誤訊息是什麼？明明 ShiftEnum.B 的值就是字串 'B'，為什麼傳 'B' 不行？
 *    （這跟 TS 其他地方的「結構型別」規則有什麼不同）
 * 2. 動手做：執行 npx tsc（不加 --noEmit，會輸出到 dist/），打開 dist/05-exercise.js，
 *    搜尋 ShiftEnum，把它被編譯成的 JS 貼上來。
 *    再搜尋 interface ReceiveInput 或 type FormValues，它們在 JS 裡長怎樣？
 *    這個對比說明了 enum 違反了 TS 的哪一條基本原則？（看完可以把 dist 資料夾刪掉）
 * 3. 用教材 5.6 的做法改寫：寫出 SHIFT_CODES 常數、Shift 型別、以及 isShift 型別守衛，
 *    讓「API 回來的字串」可以安全地變成 Shift。
 *
 *   你的答案：
 *   1.
 *   2.
 *   3.
 */

// ============================================================
// 執行驗收（不要改）
// ============================================================

const results = { pass: 0, fail: 0, todo: 0 };

function isTodo(e: unknown): boolean {
  return e instanceof Error && e.message === "TODO";
}

/** 把物件的 key 排序後再轉 JSON，所以你回傳的物件 key 順序不影響比對 */
function stable(v: unknown): string | undefined {
  return JSON.stringify(v, (_key, val: unknown) => {
    if (val !== null && typeof val === "object" && !Array.isArray(val)) {
      return Object.fromEntries(
        Object.entries(val).sort(([a], [b]) => a.localeCompare(b)),
      );
    }
    return val;
  });
}

function check(label: string, run: () => unknown, expected: unknown): void {
  try {
    const actual = run();
    if (stable(actual) === stable(expected)) {
      results.pass++;
      console.log(`✅ ${label}`);
    } else {
      results.fail++;
      console.log(
        `❌ ${label}\n     預期 ${stable(expected)}\n     實際 ${stable(actual)}`,
      );
    }
  } catch (e) {
    if (isTodo(e)) {
      results.todo++;
      console.log(`⬜ ${label}`);
      return;
    }
    results.fail++;
    console.log(
      `❌ ${label}\n     丟出例外：${e instanceof Error ? e.message : String(e)}`,
    );
  }
}

function checkThrows(
  label: string,
  run: () => unknown,
  expectedMessage: string,
): void {
  try {
    const actual = run();
    results.fail++;
    console.log(
      `❌ ${label}\n     預期丟出「${expectedMessage}」，實際回傳 ${stable(actual)}`,
    );
  } catch (e) {
    if (isTodo(e)) {
      results.todo++;
      console.log(`⬜ ${label}`);
      return;
    }
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === expectedMessage) {
      results.pass++;
      console.log(`✅ ${label}`);
    } else {
      results.fail++;
      console.log(
        `❌ ${label}\n     預期訊息「${expectedMessage}」\n     實際訊息「${msg}」`,
      );
    }
  }
}

console.log("\n===== Q1 =====");
const R001: FabricRoll = {
  _id: "1",
  rollNo: "R001",
  weightKg: 25.5,
  zoneCode: "A-01",
  status: "IN_STOCK",
  createdAt: "2026-09-30T08:00:00Z",
};
const R002: FabricRoll = { ...R001, _id: "2", rollNo: "R002", remark: "瑕疵" };
check("Q1b 改區域", () => applyPatch(R001, { zoneCode: "B-03" }), {
  ...R001,
  zoneCode: "B-03",
});
check(
  "Q1b weightKg: undefined 要忽略",
  () => applyPatch(R001, { weightKg: undefined }).weightKg,
  25.5,
);
check(
  "Q1b weightKg: 0 要保留",
  () => applyPatch(R001, { weightKg: 0 }).weightKg,
  0,
);
check("Q1b 空 patch 內容不變", () => applyPatch(R001, {}), R001);
check("Q1b 回傳新物件", () => applyPatch(R001, {}) !== R001, true);
check(
  "Q1b 不可修改原物件",
  () => {
    const before = JSON.stringify(R001);
    applyPatch(R001, { status: "HOLD", weightKg: 1 });
    return JSON.stringify(R001) === before;
  },
  true,
);
check(
  "Q1b remark: undefined 不清掉",
  () => applyPatch(R002, { remark: undefined }).remark,
  "瑕疵",
);
check(
  "Q1b remark: '' 要清空",
  () => applyPatch(R002, { remark: "" }).remark,
  "",
);
checkThrows(
  "Q1b 負重量",
  () => applyPatch(R001, { weightKg: -1 }),
  "重量不可為負數",
);

console.log("\n===== Q2 =====");
const lotY001: YarnLot = {
  _id: "1",
  lotNo: "Y-001",
  yarnType: "COTTON",
  weightKg: 50,
  supplierNo: "S-12",
  unitCost: 86.5,
  createdAt: "2026-09-30T08:00:00Z",
  updatedAt: "2026-09-30T08:00:00Z",
};
check("Q2b 只有四個欄位", () => toPublic(lotY001), {
  lotNo: "Y-001",
  yarnType: "COTTON",
  weightKg: 50,
  supplierNo: "S-12",
});
check(
  "Q2b 沒有 unitCost",
  () => String(stable(toPublic(lotY001))).includes("unitCost"),
  false,
);
check(
  "Q2b supplierNo 為 null",
  () => toPublic({ ...lotY001, supplierNo: null }),
  {
    lotNo: "Y-001",
    yarnType: "COTTON",
    weightKg: 50,
    supplierNo: null,
  },
);

console.log("\n===== Q3 =====");
check("Q3c RUNNING", () => stateBadge("RUNNING"), "運轉（green）");
check("Q3c IDLE", () => stateBadge("IDLE"), "待機（gray）");
check("Q3c DOWN", () => stateBadge("DOWN"), "故障（red）");
check("Q3c MAINTENANCE", () => stateBadge("MAINTENANCE"), "保養（amber）");
check("Q3d IDLE", () => isMachineState("IDLE"), true);
check("Q3d MAINTENANCE", () => isMachineState("MAINTENANCE"), true);
check("Q3d 小寫 idle", () => isMachineState("idle"), false);
check("Q3d null", () => isMachineState(null), false);
check("Q3d 數字", () => isMachineState(3), false);
check(
  "Q3e 統計",
  () =>
    countStates([
      { machineNo: "K-01", state: "RUNNING" },
      { machineNo: "K-02", state: "DOWN" },
      { machineNo: "K-03", state: "RUNNING" },
    ]),
  { RUNNING: 2, IDLE: 0, DOWN: 1, MAINTENANCE: 0 },
);
check("Q3e 空陣列四個 0", () => countStates([]), {
  RUNNING: 0,
  IDLE: 0,
  DOWN: 0,
  MAINTENANCE: 0,
});

console.log("\n===== Q4 =====");
check("Q4b K-01 0.8", () => targetRpm("K-01", 0.8), 720);
check("Q4b K-03 1", () => targetRpm("K-03", 1), 780);
check("Q4b K-02 0.333", () => targetRpm("K-02", 0.333), 283);
check("Q4b 負載率 0", () => targetRpm("K-01", 0), 0);
checkThrows(
  "Q4b 負載率 1.2",
  () => targetRpm("K-01", 1.2),
  "負載率需介於 0 到 1",
);
checkThrows(
  "Q4b 負載率 -0.1",
  () => targetRpm("K-01", -0.1),
  "負載率需介於 0 到 1",
);
check("Q4c A 區", () => machinesInZone("A"), ["K-01", "K-02"]);
check("Q4c B 區", () => machinesInZone("B"), ["K-03"]);

console.log("\n===== Q5 =====");
const report = {
  machineNo: "K-01",
  range: { from: "2026-09-30", to: "2026-09-30" },
  totalMinutes: 120,
  stops: [
    { reason: "YARN_OUT" as const, minutes: 30, at: "08:00" },
    { reason: "NEEDLE_BREAK" as const, minutes: 45, at: "10:00" },
    { reason: "MAINTENANCE" as const, minutes: 45, at: "13:00" },
  ],
};
check("Q5h 最長（同分取前面）", () => longestStop(report), {
  reason: "NEEDLE_BREAK",
  minutes: 45,
  at: "10:00",
});
check("Q5h 空陣列", () => longestStop({ ...report, stops: [] }), undefined);

console.log("\n===== Q6 =====");
check(
  "Q6b 成功、remark 空白",
  () =>
    parseReceiveForm({
      lotNo: " Y-001 ",
      weightKg: "50.5",
      cones: "12",
      remark: "",
    }),
  {
    ok: true,
    data: { lotNo: "Y-001", weightKg: 50.5, cones: 12 },
  },
);
check(
  "Q6b remark 空白時不能有 remark key",
  () => {
    const r = parseReceiveForm({
      lotNo: "Y-001",
      weightKg: "50.5",
      cones: "12",
      remark: "   ",
    });
    return r.ok ? "remark" in r.data : "ok 是 false";
  },
  false,
);
check(
  "Q6b 成功、有 remark",
  () =>
    parseReceiveForm({
      lotNo: "Y-002",
      weightKg: "20",
      cones: "4",
      remark: " 急件 ",
    }),
  {
    ok: true,
    data: { lotNo: "Y-002", weightKg: 20, cones: 4, remark: "急件" },
  },
);
check(
  "Q6b 三個欄位都錯",
  () =>
    parseReceiveForm({ lotNo: "", weightKg: "abc", cones: "2.5", remark: "" }),
  {
    ok: false,
    errors: {
      lotNo: "必填",
      weightKg: "重量需為正數",
      cones: "筒數需為正整數",
    },
  },
);
check(
  "Q6b 空白重量是必填",
  () =>
    parseReceiveForm({
      lotNo: "Y-003",
      weightKg: "  ",
      cones: "0",
      remark: "",
    }),
  {
    ok: false,
    errors: { weightKg: "必填", cones: "筒數需為正整數" },
  },
);
check(
  "Q6b 重量 0、筒數空白",
  () =>
    parseReceiveForm({ lotNo: "Y-004", weightKg: "0", cones: "", remark: "" }),
  {
    ok: false,
    errors: { weightKg: "重量需為正數", cones: "必填" },
  },
);

console.log(
  `\n結果：✅ ${results.pass}　❌ ${results.fail}　⬜ ${results.todo}`,
);

export {};
