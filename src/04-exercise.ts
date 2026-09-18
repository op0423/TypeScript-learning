/**
 * ============================================================
 *  第 4 章 練習：型別縮小 Narrowing 與型別守衛 Type Guard
 * ============================================================
 *
 *  規則：
 *  - 先自己寫，不要先問我。寫完把整份檔案貼回對話，我逐題編譯 + 實際執行檢討。
 *  - 每個 throw new Error('TODO') 換成你的實作。
 *  - 觀念題直接把答案寫在註解裡。
 *
 *  題目怎麼讀：
 *  每一題都有固定五個區塊，照順序看就好。
 *    【情境】      這個函式在真實系統裡負責什麼事
 *    【你要做的】  一句話講清楚要寫出什麼
 *    【規格】      「輸入長怎樣 → 要回傳什麼」的對照表；
 *                 表格左邊是輸入的情況，右邊是這個函式必須 return 的東西
 *    【具體例子】  直接寫成「呼叫這樣寫，結果應該等於這個值」，可以當測試用
 *    【提示】      容易卡住的地方
 *    【這題在練什麼】 對應教材哪一節，不會寫時回去翻
 *
 *  驗收方式（兩個都要做，這次請不要跳過）：
 *  1. 型別驗收：npx tsc --noEmit
 *     - 剛拿到檔案時會有「5 個 TS2578 Unused '@ts-expect-error' directive」，都在 Q6，這是正常的。
 *       那 5 個錯誤的意思是：「你的型別還沒擋住非法狀態」。Q6 做對時會自動歸零。
 *     - 全部做完應該是零錯誤。
 *  2. 執行驗收：npx tsx src/04-exercise.ts
 *     - 檔案最底下的測試會印出 ✅ / ❌ / ⬜（未作答）。
 *     - 前兩章的經驗：你沒打開驗收的題目，剛好就是錯的題目。
 *
 *  額外限制（刻意練習用）：
 *  - 全檔禁止使用 `as`（as const 除外）
 *  - Q1 禁止用 if (v) / if (!v) 這種真值判斷
 *  - Q3 型別守衛裡，一行最多一個 && 或 ||，用早退 return false 串起來
 */

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
}

function assertNever(x: never): never {
  throw new Error(`未處理的分支：${JSON.stringify(x)}`);
}

// ============================================================
// Q1 — typeof / instanceof / 真值陷阱
// ============================================================

/**
 * 【情境】
 * 倉儲報表的表格，每一格的值型別都不一樣：批號是字串、重量是數字、
 * 入庫日是 Date，沒填的欄位則是 null 或 undefined。
 * 畫面上不能直接印物件或 undefined，所以需要一個統一的「格式化成顯示文字」的函式。
 *
 * 【你要做的】
 * 實作 formatCellValue：不管收到哪一種值，都回傳一個「可以直接印在畫面上的字串」。
 *
 * 【規格】
 *   收到的輸入 v                          函式要 return 的字串
 *   ----------------------------------   ----------------------------------
 *   null                                 '-'
 *   undefined                            '-'
 *   數字，而且是 NaN                       '-'
 *   數字，其他情況                         v.toFixed(1) 的結果（固定一位小數）
 *   字串，trim() 之後是空字串               '-'
 *   字串，其他情況                         trim() 之後的字串
 *   Date，而且是無效日期                    '-'
 *   Date，其他情況                         'YYYY-MM-DD'（用 toISOString().slice(0, 10)）
 *
 * 【具體例子】（左邊這樣呼叫，右邊是必須回傳的值）
 *   formatCellValue(null)                          回傳 '-'
 *   formatCellValue(undefined)                     回傳 '-'
 *   formatCellValue(0)                             回傳 '0.0'    ← 不是 '-'，0 是有效重量
 *   formatCellValue(22.46)                         回傳 '22.5'
 *   formatCellValue(NaN)                           回傳 '-'
 *   formatCellValue('')                            回傳 '-'
 *   formatCellValue('   ')                         回傳 '-'
 *   formatCellValue('  R001 ')                     回傳 'R001'
 *   formatCellValue(new Date('2026-09-17T08:00:00Z')) 回傳 '2026-09-17'
 *   formatCellValue(new Date('abc'))               回傳 '-'
 *
 * 【提示】
 * - 「無效日期」指的是 new Date('abc') 這種解析失敗的 Date 物件。
 *   它仍然是一個 Date（instanceof Date 為 true），但 getTime() 會回傳 NaN。
 * - null 和 undefined 要一起擋掉時，有一個運算子可以一行解決（教材 4.3）。
 * - 禁止用 if (v) 判斷，因為 0 和 '' 會被誤判（教材 4.2）。
 *
 * 【這題在練什麼】
 * 教材 4.1 typeof、4.2 真值陷阱、4.3 相等縮小、4.5 instanceof。
 * 重點是：走完所有 if 之後，剩下的那一個型別 TS 會自己算出來，你不必再 as。
 */
function formatCellValue(v: string | number | Date | null | undefined): string {
  if (v === null || v === undefined) {
    return "-";
  }
  if (typeof v == "number") {
    if (Number.isNaN(v)) {
      return "-";
    }
    return v.toFixed(1);
  }
  if (typeof v == "string") {
    if (v.trim() == " ") {
      return "-";
    }
    return v;
  }
  if (!new Date(v)) {
    return "-";
  }
  return new Date(v).toISOString().slice(0, 10);
}

// ============================================================
// Q2 — 可辨識聯合 + 窮舉檢查（針織機台事件）
// ============================================================

type StopReason = "NEEDLE_BREAK" | "YARN_OUT" | "MAINTENANCE";

interface RunEvent {
  type: "RUN";
  machineNo: string;
  rpm: number;
}
interface StopEvent {
  type: "STOP";
  machineNo: string;
  reason: StopReason;
}
interface DoffEvent {
  type: "ROLL_DOFF";
  machineNo: string;
  rollNo: string;
  weightKg: number;
}
interface AlarmEvent {
  type: "ALARM";
  machineNo: string;
  level: "WARN" | "CRITICAL";
  message: string;
}

type MachineEvent = RunEvent | StopEvent | DoffEvent | AlarmEvent;

/**
 * 【情境】
 * 針織機台會回傳四種事件：運轉中、停機、落布（把織好的布卷取下）、警報。
 * 現場的看板要把每一筆事件轉成一行中文訊息。
 *
 * 【你要做的】(a)
 * 實作 eventSummary：收一筆事件，回傳一行字串。
 * 規定要用 switch (e.type) 寫，而且 default 分支必須是 return assertNever(e)。
 *
 * 【規格】
 *   事件的 type          要 return 的字串格式
 *   ------------------  ------------------------------------------------
 *   'RUN'               `${machineNo} 運轉中 ${rpm} rpm`
 *   'STOP'              `${machineNo} 停機：${原因的中文}`
 *                       原因對照：NEEDLE_BREAK 是斷針、YARN_OUT 是缺紗、MAINTENANCE 是保養
 *   'ROLL_DOFF'         `${machineNo} 落布 ${rollNo} ${weightKg} kg`
 *   'ALARM'             level 是 'WARN' 時     `${machineNo} ⚠️ ${message}`
 *                       level 是 'CRITICAL' 時 `${machineNo} 🚨 ${message}`
 *
 * 【具體例子】
 *   eventSummary({ type: 'RUN', machineNo: 'K-01', rpm: 850 })
 *     回傳 'K-01 運轉中 850 rpm'
 *   eventSummary({ type: 'STOP', machineNo: 'K-02', reason: 'YARN_OUT' })
 *     回傳 'K-02 停機：缺紗'
 *   eventSummary({ type: 'ROLL_DOFF', machineNo: 'K-01', rollNo: 'R101', weightKg: 22.4 })
 *     回傳 'K-01 落布 R101 22.4 kg'
 *   eventSummary({ type: 'ALARM', machineNo: 'K-02', level: 'WARN', message: '溫度偏高' })
 *     回傳 'K-02 ⚠️ 溫度偏高'
 *   eventSummary({ type: 'ALARM', machineNo: 'K-03', level: 'CRITICAL', message: '馬達過載' })
 *     回傳 'K-03 🚨 馬達過載'
 *
 * 【提示】
 * - 停機原因的中文對照有兩種寫法：巢狀 if / 三元運算子，或第 2 章的 Record<StopReason, string>。
 *   兩種都能過測試，但請想一件事：未來 StopReason 多一個 'POWER_OFF' 時，
 *   哪一種寫法會讓 TS 當場報錯提醒你補中文？選那一種。
 * - 每個 case 裡面 TS 已經把 e 縮小成單一種事件了，可以直接讀該事件專屬的欄位。
 *
 * 【這題在練什麼】
 * 教材 4.7 可辨識聯合 + assertNever 窮舉檢查。
 */
function eventSummary(e: MachineEvent): string {
 switch (e.type) {
   case "RUN":
     return `${e.machineNo} 運轉中 ${e.rpm} rpm`;
   case "ROLL_DOFF":
     return `${e.machineNo} 落布 ${e.rollNo} ${e.weightKg} kg`;
   case "ALARM":
     return e.level === "WARN"
       ? `${e.machineNo} ⚠️ ${e.message}`
       : `${e.machineNo} 🚨 ${e.message}`;
   case "STOP":
     return `${e.machineNo} 停機：${e.reason === "NEEDLE_BREAK" ? "斷針" : e.reason === "YARN_OUT" ? "缺紗" : e.reason === "MAINTENANCE" ? "保養" : "不明原因"}`;
   default:
     return "狀況不明";
 }

}

/**
 * 【你要做的】(b)
 * 實作 totalDoffWeight：收一整串事件（裡面四種事件混在一起），
 * 只把 type 是 'ROLL_DOFF' 的那些事件的 weightKg 加起來，回傳總和（number）。
 *
 * 【規格】
 *   輸入                                    要 return 的值
 *   -------------------------------------  ------------------------------
 *   空陣列 []                               0
 *   有落布事件 22.4、0、19.6，其他事件若干     42（22.4 + 0 + 19.6，浮點數誤差測試會幫你四捨五入）
 *   完全沒有落布事件                          0
 *
 * 【具體例子】
 *   totalDoffWeight([]) 回傳 0
 *   totalDoffWeight([{ type: 'RUN', machineNo: 'K-01', rpm: 850 }]) 回傳 0
 *
 * 【提示】
 * - 請用 filter + reduce 寫。reduce 記得給初始值 0（第 2 章補強觀念那一條）。
 * - 寫完 filter 那一行之後，把游標停在 filter 的結果上，記下 TS 推論出來的型別是什麼，
 *   寫在下面這行註解裡（這是這題真正想讓你看到的東西）：
 *
 *   filter 之後的型別是：
 *
 * 【這題在練什麼】
 * 教材 4.9 最後一段：TS 5.5 之後，箭頭函式如果是在判斷辨識欄位，
 * 會自動被推論成型別守衛，所以 filter 的結果不需要你手寫 `as` 或 `is`。
 */
function totalDoffWeight(events: readonly MachineEvent[]): number {
  throw new Error("TODO");
}

/**
 * 【你要做的】(c) 這題不用寫程式，是「動手做實驗然後回答」。
 *
 * 步驟：
 *   1. 把上面 MachineEvent 的定義暫時改成（多一個成員）：
 *        type MachineEvent = RunEvent | StopEvent | DoffEvent | AlarmEvent
 *          | { type: 'SPEED_CHANGE'; machineNo: string; fromRpm: number; toRpm: number };
 *   2. 執行 npx tsc --noEmit，把出現的錯誤看完。
 *   3. 回答下面三個問題（答案寫在註解裡）。
 *   4. 答完把 SPEED_CHANGE 那段刪掉，讓型別恢復原狀。
 *
 * 問題：
 *   1. 哪幾行報錯？錯誤訊息的關鍵那一句是什麼？（把訊息貼上來）
 *   2. totalDoffWeight 有沒有跟著報錯？為什麼有／為什麼沒有？
 *   3. 假設 (a) 你沒有寫 default: return assertNever(e)，
 *      那麼加了 SPEED_CHANGE 之後：編譯時會怎樣？執行時遇到 SPEED_CHANGE 事件又會怎樣？
 *
 * 【這題在練什麼】
 * 體驗「窮舉檢查是替未來的自己埋的編譯期陷阱」——
 * 資料型別長大時，TS 會主動帶你去看每一個需要補的地方。
 *
 *   你的答案：
 *   1.
 *   2.
 *   3.
 */

// ============================================================
// Q3 — 自訂型別守衛（紗線批次，從 API 收到 unknown）
// ============================================================

type YarnType = "COTTON" | "POLYESTER" | "NYLON";

interface YarnLot {
  lotNo: string;
  yarnType: YarnType;
  weightKg: number; // 必須是有限數字（NaN、Infinity 不算）
  supplierNo: string | null; // 可以是 null，但這個 key「必須存在」
  remark?: string; // 選填：可以不存在；存在的話必須是 string
}

/**
 * 【情境】
 * 前端呼叫後端 API 拿紗線批次資料。JSON.parse 出來的東西型別是 unknown，
 * 後端可能改欄位、可能回傳壞資料，所以在用它之前必須先「驗證形狀」。
 *
 * 【你要做的】(a)
 * 實作 isYarnLot：收一個什麼都有可能的 unknown，
 * 回傳 true 代表「它真的是一個合法的 YarnLot」，false 代表不是。
 * 注意回傳型別寫的是 `x is YarnLot`（型別謂詞），所以 TS 會無條件相信你的判斷結果，
 * 你漏檢查哪個欄位，後面用到那個欄位的程式就會在執行期爆掉。
 *
 * 【規格】每個欄位的合法條件
 *   欄位          合法的條件
 *   -----------  --------------------------------------------------------
 *   （整體）       必須是物件；null 不算、陣列不算
 *   lotNo        key 必須存在，值必須是 string
 *   yarnType     key 必須存在，值必須剛好是 'COTTON'、'POLYESTER'、'NYLON' 其中之一
 *   weightKg     key 必須存在，值必須是 number，而且必須是有限數字（NaN、Infinity 都不合法）
 *   supplierNo   key 必須存在，值可以是 string 或 null，其他都不合法
 *   remark       key 可以不存在；如果存在，值必須是 string（undefined 也算沒填，可接受）
 *   全部通過      回傳 true
 *
 * 【具體例子】
 *   isYarnLot({ lotNo: 'Y-001', yarnType: 'COTTON', weightKg: 50, supplierNo: 'S-12', remark: '急件' })
 *     回傳 true
 *   isYarnLot({ lotNo: 'Y-002', yarnType: 'NYLON', weightKg: 0, supplierNo: 'S-01' })
 *     回傳 true   ← 沒有 remark 是合法的，weightKg 是 0 也合法
 *   isYarnLot({ lotNo: 'Y-001', yarnType: 'COTTON', weightKg: 50, supplierNo: null })
 *     回傳 true   ← supplierNo 是 null 合法
 *   isYarnLot({ lotNo: 'Y-003', yarnType: 'COTTON', weightKg: 10 })
 *     回傳 false  ← 完全沒有 supplierNo 這個 key，不合法
 *   isYarnLot({ ...合法資料, remark: 123 })        回傳 false
 *   isYarnLot({ ...合法資料, yarnType: 'WOOL' })   回傳 false
 *   isYarnLot({ ...合法資料, weightKg: '50' })     回傳 false
 *   isYarnLot({ ...合法資料, weightKg: NaN })      回傳 false
 *   isYarnLot(null)                               回傳 false
 *   isYarnLot([合法資料])                          回傳 false
 *   isYarnLot({ yarnType: 'COTTON' })             回傳 false
 *
 * 【提示】
 * - 寫法規定：一個條件一行，不合格就 return false（早退），全部通過最後 return true。
 *   一行最多一個 && 或 ||。這是為了避免你前兩章踩過的運算子優先權 bug。
 * - 「key 存在」和「值的型別對」是兩件事：
 *     'supplierNo' in x   → 檢查 key 在不在
 *     typeof x.lotNo      → 檢查值是什麼
 *   supplierNo 的值可以是 null，所以不能只靠 typeof 判斷（typeof null 是 'object'）。
 * - 有限數字用 Number.isFinite() 判斷。
 * - x 是 unknown，要先證明它是物件才能讀屬性，順序不能顛倒（教材 4.4B）。
 *
 * 【這題在練什麼】
 * 教材 4.9 自訂型別守衛，以及 4.4 的 in 運算子。
 * 你第 3 章的 isFabricRoll 因為運算子優先權讓壞資料通過了，這題就是那題的重寫版。
 */
function isYarnLot(x: unknown): x is YarnLot {
  throw new Error("TODO");
}

/**
 * 【你要做的】(b)
 * 實作 pickValidLots：收一個「什麼都有可能」的陣列，把其中合法的 YarnLot 挑出來回傳。
 * 不合法的直接丟掉，不要丟錯誤。
 *
 * 【規格】
 *   輸入                                          要 return 的值
 *   -------------------------------------------  --------------------------------
 *   [合法A, null, 壞資料, 合法B]                    [合法A, 合法B]（保持原順序）
 *   []                                            []
 *
 * 【具體例子】
 *   pickValidLots([lotA, null, { lotNo: 'X' }, lotB]) 回傳 [lotA, lotB]
 *
 * 【提示】
 * - 回傳型別必須真的是 YarnLot[]，而且不准用 as。
 *   如果你寫對了，一行就夠，而且 TS 會自己把型別從 unknown[] 變成 YarnLot[]。
 * - 想不出來就回去看教材 4.9 的 isDefined 那一段，看它怎麼跟 filter 搭配。
 *
 * 【這題在練什麼】
 * 型別守衛傳進 filter 時，TS 會用謂詞幫整個陣列換型別。
 */
function pickValidLots(items: readonly unknown[]): YarnLot[] {
  throw new Error("TODO");
}

// ============================================================
// Q4 — 斷言函式（解析 API 回應）
// ============================================================

/**
 * 【情境】
 * Q3 是「壞資料就跳過」，這一題相反：API 回來的資料只要有一筆壞的，
 * 整包就不能信，必須整個中止並回報是第幾筆壞掉，方便去找後端。
 *
 * 【你要做的】(a)
 * 實作 assertYarnLot：收一個 unknown 和它在陣列裡的索引 index（從 0 開始）。
 *   - 如果它是合法的 YarnLot：什麼都不做（不用 return 任何東西）
 *   - 如果不合法：throw new Error(`第 ${index + 1} 筆資料格式錯誤`)
 *     注意訊息裡的編號是給人看的，所以是 index + 1，第 0 筆要顯示成「第 1 筆」。
 *
 * 【具體例子】
 *   assertYarnLot(合法資料, 0)        什麼事都不發生
 *   assertYarnLot({ lotNo: 'X' }, 1)  丟出 Error，message 是 '第 2 筆資料格式錯誤'
 *
 * 【提示】
 * - 回傳型別寫的是 `asserts x is YarnLot`，意思是「這個函式跑完之後，x 就是 YarnLot」。
 *   呼叫端不需要寫 if，呼叫完下一行開始 x 就被縮小了。
 * - 判斷邏輯不用重寫，直接用 Q3 的 isYarnLot。
 *
 * 【這題在練什麼】
 * 教材 4.10 斷言函式。
 */
function assertYarnLot(x: unknown, index: number): asserts x is YarnLot {
  throw new Error("TODO");
}

/**
 * 【你要做的】(b)
 * 實作 parseYarnLotsResponse：收後端整包回應（型別是 unknown），
 * 成功時回傳 YarnLot[]，任何一種不對的情況都 throw Error。
 *
 * 後端「正常」會回這兩種形狀之一，但因為型別是 unknown，你不能假設它一定是這樣：
 *   成功：{ ok: true,  data: [ 一堆 YarnLot ] }
 *   失敗：{ ok: false, message: '權限不足' }
 *
 * 【規格】請「依照這個順序」檢查，順序會影響測試結果
 *   情況                                          要做的事
 *   -------------------------------------------  --------------------------------------------
 *   1. body 不是物件（包含 null、包含陣列）           throw new Error('回應格式錯誤')
 *   2. body.ok === false                          throw new Error(`API 錯誤：${message}`)
 *                                                  message 不是字串（或沒有這個 key）時，用 '未知錯誤'
 *   3. body.ok 既不是 true 也不是 false             throw new Error('回應格式錯誤')
 *   4. body.data 不是陣列                           throw new Error('data 不是陣列')
 *   5. data 裡任何一筆不合法                          由 assertYarnLot 丟出「第 N 筆資料格式錯誤」
 *                                                  （只要有一筆壞，整包都不要，不做過濾）
 *   6. 全部合法                                     return 這些資料，型別是 YarnLot[]
 *
 * 【具體例子】
 *   parseYarnLotsResponse({ ok: true, data: [合法資料] })
 *     回傳長度 1 的陣列
 *   parseYarnLotsResponse({ ok: true, data: [] })
 *     回傳 []
 *   parseYarnLotsResponse(null)
 *     丟出 Error，message 是 '回應格式錯誤'
 *   parseYarnLotsResponse([合法資料])
 *     丟出 Error，message 是 '回應格式錯誤'   ← 陣列不算合法回應
 *   parseYarnLotsResponse({ ok: false, message: '權限不足' })
 *     丟出 Error，message 是 'API 錯誤：權限不足'
 *   parseYarnLotsResponse({ ok: false })
 *     丟出 Error，message 是 'API 錯誤：未知錯誤'
 *   parseYarnLotsResponse({ ok: 'true', data: [] })
 *     丟出 Error，message 是 '回應格式錯誤'   ← 字串 'true' 不是 true
 *   parseYarnLotsResponse({ ok: true, data: 合法資料 })
 *     丟出 Error，message 是 'data 不是陣列'  ← data 是單一物件不是陣列
 *   parseYarnLotsResponse({ ok: true, data: [合法資料, 壞資料] })
 *     丟出 Error，message 是 '第 2 筆資料格式錯誤'
 *
 * 【提示】
 * - body 是 unknown，每一層都要先證明才能往下讀（教材 4.4B 的四段式）。
 * - 陣列判斷用 Array.isArray。
 * - 這裡有個值得注意的地方：就算你對陣列的「每一個元素」都做了 assertYarnLot，
 *   陣列「本身」的型別也不會跟著變成 YarnLot[]。hover 看看，然後想辦法回傳正確型別。
 *
 * 【這題在練什麼】
 * 教材 4.10 斷言函式的實際用法，也是第 9 章 Express 驗證 req.body 的預習。
 */
function parseYarnLotsResponse(body: unknown): YarnLot[] {
  throw new Error("TODO");
}

/**
 * 【你要做的】(c) 觀念題，寫一句話就好。
 *
 * 同樣是驗證資料，Q3(b) 用型別守衛（回傳 true / false，壞的就跳過），
 * Q4(b) 用斷言函式（壞的就丟錯誤中止）。
 * 請說明：實務上你怎麼決定一個驗證要寫成哪一種？判斷的依據是什麼？
 *
 *   你的答案：
 */

// ============================================================
// Q5 — 觀念題：tsc 零錯誤（或只有一個預期錯誤），但有問題
// ============================================================

/**
 * 這一區四小題都不用改程式（除非題目要你修），是「讀程式碼 + 回答問題」。
 * 四段程式都不會被執行到（後面用 void 擋住），所以你可以放心改來改去做實驗。
 * 想實際跑跑看的話，自己在檔案最下面加幾行呼叫，測完刪掉。
 * 答案直接寫在每一段下面的註解裡。
 */

// ---------- (a) ----------
function watchMachine(machineNo: string | null) {
  if (machineNo === null) return;
  // @ts-expect-error 刪掉這行指令，讀錯誤訊息
  setInterval(() => console.log(machineNo.toUpperCase()), 1000);
  machineNo = null;
}
void watchMachine;
/**
 * 【怎麼做】
 * 把上面那行 // @ts-expect-error 刪掉（或註解掉），存檔，看 VS Code 或 tsc 報什麼錯。
 * 看完再把它加回去，讓檔案維持零錯誤。
 *
 * 【要回答的】
 * 1. 錯誤訊息是什麼？（錯誤代碼 + 訊息）
 * 2. 上面明明已經用 if 排除了 null，為什麼箭頭函式裡面的 machineNo 又被當成可能是 null？
 * 3. 只要把最後一行 machineNo = null 刪掉，錯誤就消失了。為什麼那一行會影響到它上面那一行？
 *
 * 【這題在練什麼】教材 4.8 (2) 閉包裡的縮小。
 *
 *   你的答案：
 *   1.
 *   2.
 *   3.
 */

// ---------- (b) ----------
interface Machine {
  machineNo: string;
  currentLot: YarnLot | null;
}

function consumeYarn(m: Machine, kg: number): void {
  if (m.currentLot === null) return;
  const left = m.currentLot.weightKg - kg;
  if (left <= 0) {
    m.currentLot = null; // 紗用完，下架
  } else {
    m.currentLot = { ...m.currentLot, weightKg: left };
  }
}

function runShift(m: Machine): string {
  if (m.currentLot === null) return "未上紗";
  consumeYarn(m, 30);
  return `批號 ${m.currentLot.lotNo} 剩 ${m.currentLot.weightKg} kg`;
}
void runShift;
/**
 * 【背景】
 * consumeYarn 會把機台上的紗扣掉 kg 公斤，扣完歸零時就把 currentLot 設成 null（下架）。
 * runShift 先確認機台上有紗，再扣 30 公斤，然後印出剩餘量。
 * 這段程式 tsc 完全零錯誤。
 *
 * 【要回答的】
 * 1. 傳什麼樣的 m 進去，runShift 會在執行期丟 TypeError？（寫出具體的物件內容）
 * 2. TS 為什麼沒有報錯？（講出它在 consumeYarn(m, 30) 那行之後，對 m.currentLot 的假設是什麼，
 *    以及 TS 為什麼要做這個假設）
 * 3. 給兩種修法：
 *    (i)  只改 runShift 內部的寫法
 *    (ii) 改 consumeYarn 的「設計」，讓這種 bug 從根本上不可能發生
 *         （提示：第 2、3 章關於 readonly 和回傳新物件的原則）
 *
 * 【這題在練什麼】教材 4.8 (3) TS 故意放過的洞。
 *
 *   你的答案：
 *   1.
 *   2.
 *   3.
 */

// ---------- (c) ----------
function isCriticalAlarm(e: MachineEvent): e is AlarmEvent {
  return e.type === "ALARM" && e.level === "CRITICAL";
}

function dispatchEvent(e: MachineEvent): string {
  if (isCriticalAlarm(e)) {
    return `通知主管：${e.machineNo} ${e.message}`;
  }
  switch (e.type) {
    case "RUN":
      return "忽略";
    case "STOP":
      return `記錄停機 ${e.reason}`;
    case "ROLL_DOFF":
      return `入庫 ${e.rollNo}`;
    default:
      return assertNever(e);
  }
}
void dispatchEvent;
/**
 * 【背景】
 * dispatchEvent 想做的事是：嚴重警報通知主管，其他事件各自處理。
 * 這段程式 tsc 也是零錯誤。
 *
 * 【要回答的】
 * 1. 傳一個「WARN 等級的警報」進去，也就是
 *      dispatchEvent({ type: 'ALARM', machineNo: 'K-01', level: 'WARN', message: '溫度偏高' })
 *    會發生什麼事？（會回傳什麼？還是會爆掉？爆的話錯誤訊息是什麼？）
 * 2. switch 裡面明明沒有寫 case 'ALARM'，為什麼 default 分支的 assertNever(e) 不會紅字？
 *    （關鍵在 isCriticalAlarm 的謂詞對「false 的那一邊」做了什麼承諾）
 * 3. 怎麼修？改 isCriticalAlarm 或改 dispatchEvent 都可以，但要說明你選的理由。
 *
 * 【這題在練什麼】教材 4.9「false 分支也會說謊」。
 *
 *   你的答案：
 *   1.
 *   2.
 *   3.
 */

// ---------- (d) ----------
async function fetchLots(): Promise<YarnLot[]> {
  const res = await fetch("/api/yarn-lots");
  const lots = (await res.json()) as YarnLot[]; // ← 題目本身用了 as，不算你違規
  return lots;
}
void fetchLots;
/**
 * 【要回答的】
 * 1. `as YarnLot[]` 這行沒有做任何檢查，只是叫 TS 閉嘴。
 *    這會讓 bug 從「資料進來的地方」被延後到「真正用到某個欄位的地方」才爆。
 *    請用你自己工作上的例子講一次：後端改了什麼、前端會在哪一頁的哪一行才發現。
 * 2. 用這份練習已經寫好的函式，把 fetchLots 改寫成安全版本，程式碼寫在下面的註解外面或裡面都行。
 *
 * 【這題在練什麼】教材 4.11 as 不是縮小。
 *
 *   你的答案：
 *   1.
 *   2.
 */

// ============================================================
// Q6 — 設計題：讓非法狀態無法被表示（掃描槍掃布卷條碼）
// ============================================================

/**
 * 【情境】
 * 倉管拿掃描槍掃布卷條碼，系統回傳掃描結果。結果只有三種：
 *   成功         掃到了，附上布卷資料
 *   可重試失敗    網路逾時或伺服器忙碌，過幾秒可以再試
 *   不可重試失敗  找不到這個布卷、或條碼破損，再掃幾次都沒用，要人工處理
 *
 * 現在系統裡的型別是這樣寫的（爛設計）：
 *
 *   interface ScanResultBad {
 *     success: boolean;
 *     roll?: FabricRoll;
 *     errorCode?: string;
 *     retryAfterSec?: number;
 *   }
 *
 * 它的問題是：允許「成功但沒有 roll」「失敗卻帶著 roll」「不可重試卻有重試秒數」
 * 這些現實中不存在的組合，所以每個用到它的地方都得自己防禦，而 TS 幫不上忙。
 *
 * 【你要做的】(a)
 * 把下面的 `type ScanResult = unknown;` 換成你設計的可辨識聯合型別。
 * 可以拆成多個 interface / type 再組起來。
 *
 * 【必須滿足的條件】
 *   狀態          辨識欄位 status   必須有的欄位                              不可以有的欄位
 *   -----------  ---------------  ---------------------------------------  ----------------------
 *   成功          'OK'             roll: FabricRoll                          errorCode、retryAfterSec
 *   可重試失敗     'RETRYABLE'      errorCode: 'TIMEOUT' | 'SERVER_BUSY'      roll
 *                                  retryAfterSec: number
 *   不可重試失敗   'FATAL'          errorCode: 'NOT_FOUND' | 'BARCODE_DAMAGED'  roll、retryAfterSec
 *
 * 辨識欄位的名字固定叫 status，值固定是這三個字串，不要自己改名（測試會對不上）。
 *
 * 【怎麼知道自己寫對了】
 * 檔案下方「Q6 型別驗收」有 5 行，每一行都是一個「不應該被允許的組合」，
 * 上面都掛了 @ts-expect-error（意思是「這一行預期要報錯」）。
 *   - 你的型別如果擋不住那些非法組合 → 那行不會報錯 → TS 反過來抱怨
 *     「TS2578 Unused '@ts-expect-error' directive」（沒用到的指令）
 *   - 你的型別擋住了 → 5 個 TS2578 全部消失，tsc 歸零
 * 也就是說，這題的評分者就是編譯器本身。
 */
type ScanResult = unknown;

/**
 * 【你要做的】(b)
 * 實作 scanMessage：收一個掃描結果，回傳要顯示給倉管看的訊息。
 * 一樣建議用 switch (r.status) + default: return assertNever(r)。
 *
 * 【規格】
 *   status         要 return 的字串格式
 *   ------------  --------------------------------------------
 *   'OK'           `✅ ${roll.rollNo} @ ${roll.zoneCode}`
 *   'RETRYABLE'    `🔁 ${errorCode}，${retryAfterSec} 秒後重試`
 *   'FATAL'        `⛔ ${errorCode}，請人工處理`
 *
 * 【具體例子】
 *   scanMessage({ status: 'OK', roll: 布卷R001位於A-01 })
 *     回傳 '✅ R001 @ A-01'
 *   scanMessage({ status: 'RETRYABLE', errorCode: 'TIMEOUT', retryAfterSec: 5 })
 *     回傳 '🔁 TIMEOUT，5 秒後重試'
 *   scanMessage({ status: 'FATAL', errorCode: 'NOT_FOUND' })
 *     回傳 '⛔ NOT_FOUND，請人工處理'
 *   注意字串裡的逗號是全形「，」。
 *
 * 【這題在練什麼】
 * 第 2 章「讓非法狀態無法被表示」+ 教材 4.7 可辨識聯合。
 * 設計對了之後你會發現 (b) 特別好寫：每個分支要用的欄位一定存在，不必寫任何防禦。
 */
function scanMessage(r: ScanResult): string {
  throw new Error("TODO");
}

// ---- Q6 型別驗收（不要改）：這 5 行都應該「是錯誤」，你的型別擋住了，@ts-expect-error 才不會報 TS2578 ----
const sampleRoll: FabricRoll = {
  _id: "1",
  rollNo: "R001",
  weightKg: 25.5,
  zoneCode: "A-01",
  status: "IN_STOCK",
};

// @ts-expect-error 成功卻帶 errorCode
const bad1: ScanResult = {
  status: "OK",
  roll: sampleRoll,
  errorCode: "TIMEOUT",
};
// @ts-expect-error 成功卻沒有 roll
const bad2: ScanResult = { status: "OK" };
// @ts-expect-error 可重試卻沒給秒數
const bad3: ScanResult = { status: "RETRYABLE", errorCode: "TIMEOUT" };
// @ts-expect-error FATAL 不能用可重試的錯誤碼
const bad4: ScanResult = { status: "FATAL", errorCode: "TIMEOUT" };
// @ts-expect-error FATAL 不能帶 retryAfterSec
const bad5: ScanResult = {
  status: "FATAL",
  errorCode: "NOT_FOUND",
  retryAfterSec: 5,
};
void [bad1, bad2, bad3, bad4, bad5];

// ============================================================
// 執行驗收（不要改）
// ============================================================

const results = { pass: 0, fail: 0, todo: 0 };

function isTodo(e: unknown): boolean {
  return e instanceof Error && e.message === "TODO";
}

function check(label: string, run: () => unknown, expected: unknown): void {
  try {
    const actual = run();
    if (JSON.stringify(actual) === JSON.stringify(expected)) {
      results.pass++;
      console.log(`✅ ${label}`);
    } else {
      results.fail++;
      console.log(
        `❌ ${label}\n     預期 ${JSON.stringify(expected)}\n     實際 ${JSON.stringify(actual)}`,
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
      `❌ ${label}\n     預期丟出「${expectedMessage}」，實際回傳 ${JSON.stringify(actual)}`,
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
check("Q1 null", () => formatCellValue(null), "-");
check("Q1 undefined", () => formatCellValue(undefined), "-");
check("Q1 數字 0", () => formatCellValue(0), "0.0");
check("Q1 數字 22.46", () => formatCellValue(22.46), "22.5");
check("Q1 NaN", () => formatCellValue(NaN), "-");
check("Q1 空字串", () => formatCellValue(""), "-");
check("Q1 全空白", () => formatCellValue("   "), "-");
check("Q1 字串 trim", () => formatCellValue("  R001 "), "R001");
check(
  "Q1 日期",
  () => formatCellValue(new Date("2026-09-17T08:00:00Z")),
  "2026-09-17",
);
check("Q1 無效日期", () => formatCellValue(new Date("abc")), "-");

console.log("\n===== Q2 =====");
const events: MachineEvent[] = [
  { type: "RUN", machineNo: "K-01", rpm: 850 },
  { type: "ROLL_DOFF", machineNo: "K-01", rollNo: "R101", weightKg: 22.4 },
  { type: "STOP", machineNo: "K-02", reason: "YARN_OUT" },
  { type: "ALARM", machineNo: "K-02", level: "WARN", message: "溫度偏高" },
  { type: "ROLL_DOFF", machineNo: "K-03", rollNo: "R102", weightKg: 0 },
  { type: "ALARM", machineNo: "K-03", level: "CRITICAL", message: "馬達過載" },
  { type: "ROLL_DOFF", machineNo: "K-03", rollNo: "R103", weightKg: 19.6 },
];
check("Q2a RUN", () => eventSummary(events[0]!), "K-01 運轉中 850 rpm");
check(
  "Q2a ROLL_DOFF",
  () => eventSummary(events[1]!),
  "K-01 落布 R101 22.4 kg",
);
check("Q2a STOP", () => eventSummary(events[2]!), "K-02 停機：缺紗");
check("Q2a ALARM WARN", () => eventSummary(events[3]!), "K-02 ⚠️ 溫度偏高");
check("Q2a ALARM CRITICAL", () => eventSummary(events[5]!), "K-03 🚨 馬達過載");
check("Q2b 加總", () => Math.round(totalDoffWeight(events) * 10) / 10, 42);
check("Q2b 空陣列", () => totalDoffWeight([]), 0);

console.log("\n===== Q3 =====");
const goodLot = {
  lotNo: "Y-001",
  yarnType: "COTTON",
  weightKg: 50,
  supplierNo: "S-12",
  remark: "急件",
};
check("Q3a 完整合法", () => isYarnLot(goodLot), true);
check(
  "Q3a 沒有 remark",
  () =>
    isYarnLot({
      lotNo: "Y-002",
      yarnType: "NYLON",
      weightKg: 0,
      supplierNo: "S-01",
    }),
  true,
);
check(
  "Q3a supplierNo 為 null",
  () => isYarnLot({ ...goodLot, supplierNo: null }),
  true,
);
check(
  "Q3a 缺 supplierNo 這個 key",
  () => isYarnLot({ lotNo: "Y-003", yarnType: "COTTON", weightKg: 10 }),
  false,
);
check("Q3a remark 是數字", () => isYarnLot({ ...goodLot, remark: 123 }), false);
check(
  "Q3a yarnType 不在範圍",
  () => isYarnLot({ ...goodLot, yarnType: "WOOL" }),
  false,
);
check(
  "Q3a weightKg 是字串",
  () => isYarnLot({ ...goodLot, weightKg: "50" }),
  false,
);
check(
  "Q3a weightKg 是 NaN",
  () => isYarnLot({ ...goodLot, weightKg: NaN }),
  false,
);
check("Q3a null", () => isYarnLot(null), false);
check("Q3a 陣列", () => isYarnLot([goodLot]), false);
check("Q3a 只有 yarnType", () => isYarnLot({ yarnType: "COTTON" }), false);
check(
  "Q3b 挑出合法批次",
  () =>
    pickValidLots([
      goodLot,
      null,
      { ...goodLot, lotNo: "Y-009", weightKg: Infinity },
      { ...goodLot, lotNo: "Y-010" },
    ]).map((l) => l.lotNo),
  ["Y-001", "Y-010"],
);

console.log("\n===== Q4 =====");
check(
  "Q4b 正常回應",
  () => parseYarnLotsResponse({ ok: true, data: [goodLot] }).length,
  1,
);
check("Q4b 空資料", () => parseYarnLotsResponse({ ok: true, data: [] }), []);
checkThrows(
  "Q4b body 是 null",
  () => parseYarnLotsResponse(null),
  "回應格式錯誤",
);
checkThrows(
  "Q4b body 是陣列",
  () => parseYarnLotsResponse([goodLot]),
  "回應格式錯誤",
);
checkThrows(
  "Q4b ok:false",
  () => parseYarnLotsResponse({ ok: false, message: "權限不足" }),
  "API 錯誤：權限不足",
);
checkThrows(
  "Q4b ok:false 沒 message",
  () => parseYarnLotsResponse({ ok: false }),
  "API 錯誤：未知錯誤",
);
checkThrows(
  "Q4b ok 是字串 true",
  () => parseYarnLotsResponse({ ok: "true", data: [] }),
  "回應格式錯誤",
);
checkThrows(
  "Q4b data 不是陣列",
  () => parseYarnLotsResponse({ ok: true, data: goodLot }),
  "data 不是陣列",
);
checkThrows(
  "Q4b 第 2 筆壞掉",
  () =>
    parseYarnLotsResponse({
      ok: true,
      data: [goodLot, { ...goodLot, yarnType: "WOOL" }],
    }),
  "第 2 筆資料格式錯誤",
);

console.log("\n===== Q6 =====");
// 下面三個物件在你完成 (a) 之前型別是 unknown，完成之後必須仍然「零錯誤」
const scanOk: ScanResult = { status: "OK", roll: sampleRoll };
const scanRetry: ScanResult = {
  status: "RETRYABLE",
  errorCode: "TIMEOUT",
  retryAfterSec: 5,
};
const scanFatal: ScanResult = { status: "FATAL", errorCode: "NOT_FOUND" };
check("Q6b OK", () => scanMessage(scanOk), "✅ R001 @ A-01");
check("Q6b RETRYABLE", () => scanMessage(scanRetry), "🔁 TIMEOUT，5 秒後重試");
check("Q6b FATAL", () => scanMessage(scanFatal), "⛔ NOT_FOUND，請人工處理");

console.log(
  `\n結果：✅ ${results.pass}　❌ ${results.fail}　⬜ ${results.todo}`,
);

export {};
