/**
 * ============================================================
 *  第 4 章 參考解答：型別縮小 Narrowing 與型別守衛 Type Guard
 * ============================================================
 *
 *  - 本檔在 strict + noUncheckedIndexedAccess 下編譯零錯誤，41 個測試全過。
 *  - 執行：npx tsx src/04-exercise-answer.ts
 *  - 每題的解答下面都有【為什麼這樣寫】，以及跟你交出來的版本的差異對照。
 *  - 解答不是唯一寫法，重點在判斷依據。
 */

// ============================================================
// 共用資料
// ============================================================

type RollStatus = 'IN_STOCK' | 'SHIPPED' | 'HOLD';

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

function formatCellValue(v: string | number | Date | null | undefined): string {
  // null 和 undefined 一次擋掉。這是整個 TS 生態唯一推薦的寬鬆相等用法
  if (v == null) return '-';

  if (typeof v === 'number') {
    // 只排除 NaN，0 必須留下來（0 kg 是有效的秤重結果）
    return Number.isNaN(v) ? '-' : v.toFixed(1);
  }

  if (typeof v === 'string') {
    const t = v.trim();
    return t === '' ? '-' : t; // ← 回傳 t，不是 v
  }

  // 走到這裡 TS 已經知道 v 是 Date（前面三條路都 return 了）
  // 無效日期（new Date('abc')）仍然是 Date 物件，要靠 getTime() 是不是 NaN 判斷
  return Number.isNaN(v.getTime()) ? '-' : v.toISOString().slice(0, 10);
}

/**
 * 【為什麼這樣寫】
 * - 用早退（每個分支直接 return）而不是巢狀 if，讓每條路徑只處理一種型別。
 * - 走完三個 if 之後，TS 自己算出剩下只剩 Date，不需要 instanceof、更不需要 as。
 *   把游標停在最後一行的 v 上可以確認。
 *
 * 【跟你的版本的差異】
 * 1. 你算了 const t = v.trim() 但 return 的是 v，所以 trim 沒生效。
 *    這類「算了卻沒用」的錯誤，編譯器抓不到（t 有被用在 if 裡，不算未使用變數），
 *    只有跑測試會現形。
 * 2. 最後一行你寫 new Date(v)。那時 v 已經是 Date 了，再包一層雖然能跑，
 *    但多一次物件建立，也讓讀的人以為 v 可能不是 Date。
 * 3. typeof v == 'number' 請寫 ===。除了 != null 之外，一律用嚴格相等。
 */

// ============================================================
// Q2 — 可辨識聯合 + 窮舉檢查
// ============================================================

type StopReason = 'NEEDLE_BREAK' | 'YARN_OUT' | 'MAINTENANCE';

interface RunEvent { type: 'RUN'; machineNo: string; rpm: number }
interface StopEvent { type: 'STOP'; machineNo: string; reason: StopReason }
interface DoffEvent { type: 'ROLL_DOFF'; machineNo: string; rollNo: string; weightKg: number }
interface AlarmEvent { type: 'ALARM'; machineNo: string; level: 'WARN' | 'CRITICAL'; message: string }

type MachineEvent = RunEvent | StopEvent | DoffEvent | AlarmEvent;

// 停機原因對照表。用 Record<StopReason, string> 的關鍵好處：
// StopReason 未來多一個值時，這個物件會立刻紅字說少了那個 key。
const STOP_REASON_LABEL: Record<StopReason, string> = {
  NEEDLE_BREAK: '斷針',
  YARN_OUT: '缺紗',
  MAINTENANCE: '保養',
};

function eventSummary(e: MachineEvent): string {
  switch (e.type) {
    case 'RUN':
      return `${e.machineNo} 運轉中 ${e.rpm} rpm`;
    case 'STOP':
      return `${e.machineNo} 停機：${STOP_REASON_LABEL[e.reason]}`;
    case 'ROLL_DOFF':
      return `${e.machineNo} 落布 ${e.rollNo} ${e.weightKg} kg`;
    case 'ALARM':
      return `${e.machineNo} ${e.level === 'WARN' ? '⚠️' : '🚨'} ${e.message}`;
    default:
      // 四種都處理完了，這裡 e: never
      return assertNever(e);
  }
}

/**
 * 【為什麼這樣寫】
 * - default 寫 assertNever(e)，是替「未來的自己」埋的編譯期陷阱。
 *   聯合多一個成員時，那個成員無法指派給 never，這一行立刻紅字。
 * - STOP_REASON_LABEL 用 Record 而不是三元鏈，理由同上：
 *   多一個停機原因時，是「物件少了一個 key」這種當場報錯，而不是安靜地回傳「不明原因」。
 *
 * 【跟你的版本的差異】
 * 你寫 default: return '狀況不明'，測試一樣全過，但那是把編譯期的保護換成了執行期的沉默。
 * 加上 SPEED_CHANGE 之後：
 *   你的版本   → tsc 零錯誤，執行時看板出現「狀況不明」，沒人知道漏了什麼
 *   assertNever → tsc 直接指著這一行說 SPEED_CHANGE 沒處理
 * 三元鏈裡的 '不明原因' 同理，而且它是死碼（reason 只有三種值，永遠走不到）。
 */

function totalDoffWeight(events: readonly MachineEvent[]): number {
  const doffs = events.filter((e) => e.type === 'ROLL_DOFF');
  // hover doffs：DoffEvent[]
  // TS 5.5 把 (e) => e.type === 'ROLL_DOFF' 自動推論成型別守衛 e is DoffEvent，
  // 所以陣列型別跟著換掉，下一行才讀得到 weightKg。
  return doffs.reduce((sum, e) => sum + e.weightKg, 0); // reduce 一定要給初始值 0
}

/**
 * 【Q2(b) 填空的答案】
 *   filter 之後的型別是：DoffEvent[]
 *
 * 怎麼看：游標要停在 `.filter(...)` 這整段運算式上（或停在接住它的變數上），
 * 不是停在 callback 的參數 item 上。停在 item 上看到的是「進入 callback 時的型別」，
 * 那當然還是 MachineEvent。
 *
 * 驗證方法（故意寫一個錯誤讓 TS 把型別講出來）：
 *   const probe: null = doffs;
 *   → Type 'DoffEvent[]' is not assignable to type 'null'
 * 這招對任何「我想知道 TS 到底推成什麼」的情況都好用。
 */

/**
 * 【Q2(c) 觀察題的答案】
 *
 * 1. 報錯的是所有寫了 assertNever 的地方，本檔是 eventSummary 和 Q5(c) 的 dispatchEvent。
 *    訊息：
 *      error TS2345: Argument of type '{ type: "SPEED_CHANGE"; machineNo: string;
 *      fromRpm: number; toRpm: number; }' is not assignable to parameter of type 'never'.
 *    白話：你送進 assertNever 的東西不是 never，代表還有分支沒處理。
 *
 * 2. totalDoffWeight 不會報錯。它只挑 ROLL_DOFF，其他事件有幾種跟它無關；
 *    filter 的推論結果仍然是 DoffEvent[]。
 *    這是可辨識聯合的好處之一：加成員時，只有「必須窮舉」的地方會被點名，
 *    只關心特定成員的程式碼不受影響。
 *
 * 3. 沒寫 assertNever 的話：
 *    編譯期：完全沒有錯誤，TS 不會提醒任何事。
 *    執行期：遇到 SPEED_CHANGE 會走進 default，安靜地回傳那個 fallback 字串。
 *            看板上出現一則沒有意義的訊息，而且沒有任何人會知道是哪裡漏了。
 */

// ============================================================
// Q3 — 自訂型別守衛
// ============================================================

type YarnType = 'COTTON' | 'POLYESTER' | 'NYLON';

interface YarnLot {
  lotNo: string;
  yarnType: YarnType;
  weightKg: number;
  supplierNo: string | null;
  remark?: string;
}

const YARN_TYPES: readonly string[] = ['COTTON', 'POLYESTER', 'NYLON'];

// 常用的小工具：證明「是一般物件」（不是 null、不是陣列）
function isRecord(x: unknown): x is Record<string, unknown> {
  if (typeof x !== 'object') return false;
  if (x === null) return false;
  if (Array.isArray(x)) return false;
  return true;
}

function isYarnLot(x: unknown): x is YarnLot {
  if (!isRecord(x)) return false;

  if (typeof x.lotNo !== 'string') return false;

  if (typeof x.yarnType !== 'string') return false;
  if (!YARN_TYPES.includes(x.yarnType)) return false;

  if (typeof x.weightKg !== 'number') return false;
  if (!Number.isFinite(x.weightKg)) return false; // 同時擋掉 NaN 和 Infinity

  if (x.supplierNo !== null && typeof x.supplierNo !== 'string') return false;

  // remark 是選填：沒有這個 key、或值是 undefined，都算沒填，可以接受；
  // 一旦有值，就必須是 string。
  if ('remark' in x && x.remark !== undefined && typeof x.remark !== 'string') return false;

  return true;
}

/**
 * 【為什麼這樣寫】
 * - 一個條件一行、不合格就 return false。這個結構有三個好處：
 *   漏檢查哪個欄位一眼看得出來、不會有運算子優先權問題、可以在任一行下中斷點。
 * - 為什麼不用 'lotNo' in x 先檢查 key？
 *   因為 isRecord 之後 x 的型別是 Record<string, unknown>，讀不存在的 key 會得到 undefined，
 *   而 typeof undefined 是 'undefined'，不等於 'string'，一樣會被擋掉。
 *   所以「key 存在」的檢查被「值的型別對不對」包含了，不需要寫兩次。
 * - 唯一的例外是 supplierNo，因為它的合法值包含 null。
 *   不過 null 也不會因為 key 不存在而出現（不存在時是 undefined），所以這行也夠用。
 * - remark 則相反：它「可以不存在」，所以必須先問 'remark' in x，否則會把沒填的情況也擋掉。
 *
 * 【跟你的版本的差異】
 * 你的結構和邏輯這次都對了（三個 !== 用 && 串、早退、擋掉 null 和陣列），
 * 唯一的問題是 remark 那一條整個沒寫，所以 remark: 123 通過了。
 * 另外 Number.isNaN(x.weightKg) || !Number.isFinite(x.weightKg) 前半是多餘的，
 * Number.isFinite(NaN) 本來就是 false。
 */

function pickValidLots(items: readonly unknown[]): YarnLot[] {
  return items.filter(isYarnLot);
}

/**
 * 【為什麼一行就夠】
 * isYarnLot 的回傳型別是 x is YarnLot，把它直接交給 filter，
 * TS 會選中 filter 的「型別守衛版本」：filter<S extends T>(p: (v: T) => v is S): S[]
 * 於是整個陣列的型別從 unknown[] 換成 YarnLot[]，完全不需要 as。
 */

// ============================================================
// Q4 — 斷言函式
// ============================================================

function assertYarnLot(x: unknown, index: number): asserts x is YarnLot {
  if (!isYarnLot(x)) {
    throw new Error(`第 ${index + 1} 筆資料格式錯誤`);
  }
}

function parseYarnLotsResponse(body: unknown): YarnLot[] {
  // 1. 先證明 body 是一般物件
  if (!isRecord(body)) throw new Error('回應格式錯誤');

  // 2. 明確失敗的回應
  if (body.ok === false) {
    const message = typeof body.message === 'string' ? body.message : '未知錯誤';
    throw new Error(`API 錯誤：${message}`);
  }

  // 3. ok 既不是 true 也不是 false（含根本沒有 ok 這個 key）
  //    注意這裡比的是布林 true，不是字串 'true'
  if (body.ok !== true) throw new Error('回應格式錯誤');

  // 4. data 必須是陣列
  if (!Array.isArray(body.data)) throw new Error('data 不是陣列');

  // 5. 逐筆斷言。注意：對每個元素斷言，不會讓 body.data 這個陣列本身變成 YarnLot[]，
  //    所以要自己準備一個正確型別的陣列把通過的元素裝進去。
  const lots: YarnLot[] = [];
  body.data.forEach((item: unknown, i: number) => {
    assertYarnLot(item, i); // 不合法就直接往外丟，整包不要
    lots.push(item); // 這一行 item 已經是 YarnLot
  });

  return lots;
}

/**
 * 【為什麼這樣寫】
 * - 用連續的早退，而不是 if / else if 鏈。早退的好處是每個 if 之後 body 的型別都更窄一點，
 *   而 else if 會讓縮小結果停留在各自的分支裡，後面反而還要重新檢查一次
 *   （你的版本最後又寫了一次 'data' in body && Array.isArray(body.data) 就是這個原因）。
 * - isRecord 之後 body 是 Record<string, unknown>，
 *   所以 body.ok、body.data、body.message 都可以直接讀，不需要先寫 'ok' in body。
 * - message 一定要檢查型別。規格說「不是 string 時用未知錯誤」，
 *   只檢查 key 在不在的話，{ ok: false, message: 123 } 會印出「API 錯誤：123」。
 *
 * 【跟你的版本的差異】
 * 骨架完全正確（output 陣列、forEach、assertYarnLot、push），卡在兩個地方：
 * 1. body.ok !== 'true' 比的是字串。正常回應 { ok: true } 會被判成格式錯誤，
 *    而真正該擋的 { ok: 'true' } 反而通過。這一個字元造成 5 個測試失敗。
 * 2. 錯誤訊息 'API錯誤: ' 少了空白、冒號是半形。規格給的字串要一字不差，
 *    實務上這種訊息常被監控系統或前端拿去比對。
 * 另外 { data: [...] } 這種完全沒有 ok 的回應，你的版本會當成正常資料回傳。
 * 用 body.ok !== true 就自然擋掉了（undefined !== true）。
 */

/**
 * 【Q4(c) 的答案】
 *
 * 判斷依據是：壞資料出現時，這個流程還要不要繼續。
 *   還要繼續 → 型別守衛（回傳 true/false，呼叫端自己決定跳過還是收集）
 *     例：報表列表，一百筆裡壞一筆，其他 99 筆照樣要顯示
 *   不能繼續 → 斷言函式（直接 throw，中止整個流程）
 *     例：出貨單，少一筆就整張單子都是錯的；或 API 入口驗證 req.body，錯就回 400
 *
 * 你的答案講「能不能容忍小單位錯誤」，方向是對的，
 * 換成「這一筆壞掉會不會污染整個結果」會更準確。
 */

// ============================================================
// Q5 — 觀念題
// ============================================================

// ---------- (a) 閉包裡的縮小 ----------

/**
 * 1. 錯誤訊息：
 *      error TS18048: 'machineNo' is possibly 'undefined'.
 *      （這題的變數是 string | null，所以實際上是 TS18047 'machineNo' is possibly 'null'）
 *
 * 2. 為什麼 if 排除了 null，箭頭函式裡還是可能 null：
 *    setInterval 的 callback 不是當場執行的，它會在未來某個時間點才跑。
 *    TS 沒辦法知道「未來那個時間點」變數是什麼值，只知道「這個變數後面還會被改」。
 *    既然最後一行把它指派成 null，callback 執行時讀到 null 是完全可能的。
 *
 * 3. 刪掉最後一行錯誤就消失的原因：
 *    TS 5.4 起的規則是「變數在閉包建立之後沒有再被指派，縮小結果才保留進閉包」。
 *    沒有那行指派，這個變數從 if 之後就永遠是 string，callback 裡自然安全。
 *    也就是說，是那行指派讓縮小作廢，不是 TS 新增了什麼檢查。
 *
 * 你的答案 1、2 正確，3 這次也改對了。
 */

function watchMachineFixed(machineNo: string | null) {
  if (machineNo === null) return;
  const no = machineNo; // const 不可能被重新指派，縮小結果永遠有效
  setInterval(() => console.log(no.toUpperCase()), 1000);
  machineNo = null; // 就算後面還是改了 machineNo，也影響不到 no
}
void watchMachineFixed;

// ---------- (b) 屬性縮小的洞 ----------

interface Machine {
  machineNo: string;
  currentLot: YarnLot | null;
}

/**
 * 1. 會爆掉的輸入：currentLot.weightKg 小於等於 30 的機台，例如
 *      { machineNo: 'K-01', currentLot: { lotNo: 'Y-1', yarnType: 'COTTON', weightKg: 20, supplierNo: null } }
 *    consumeYarn(m, 30) 把它扣成負數 → 走進 m.currentLot = null →
 *    回到 runShift 讀 m.currentLot.lotNo → TypeError: Cannot read properties of null
 *
 * 2. TS 為什麼沒報錯：
 *    TS 對「函式呼叫會不會改掉我剛剛縮小過的物件屬性」採取樂觀假設，假設不會改。
 *    因為如果每次呼叫函式都要重設縮小結果，程式根本寫不下去
 *    （每個 console.log 後面都得重新檢查一次 null）。這是刻意的取捨，不是 bug。
 *
 * 3. 兩種修法見下面的程式碼。
 */

// ❌ 原本的設計：就地改動別人的物件
function consumeYarnMutating(m: Machine, kg: number): void {
  if (m.currentLot === null) return;
  const left = m.currentLot.weightKg - kg;
  if (left <= 0) m.currentLot = null;
  else m.currentLot = { ...m.currentLot, weightKg: left };
}

// 修法 (i)：只改 runShift —— 縮小完先存成 const，之後只用那個 const
function runShiftFixA(m: Machine): string {
  const lot = m.currentLot;
  if (lot === null) return '未上紗';
  consumeYarnMutating(m, 30);
  // 注意這裡一律用 lot，不要再碰 m.currentLot
  return `批號 ${lot.lotNo} 剩 ${lot.weightKg} kg`;
}

/**
 * 修法 (i) 的侷限：lot 是扣款「之前」的資料，所以剩餘量印出來是舊的。
 * 它解決了「會爆掉」，沒解決「顯示錯誤的數字」。
 * 根本原因還是 consumeYarn 偷偷改了別人的物件，所以才有 (ii)。
 */

// 修法 (ii)：改設計 —— 參數 readonly、算出新物件回傳，不碰呼叫端的資料
function consumeYarnPure(m: Readonly<Machine>, kg: number): Machine {
  if (m.currentLot === null) return { ...m };
  const left = m.currentLot.weightKg - kg;
  if (left <= 0) return { ...m, currentLot: null };
  return { ...m, currentLot: { ...m.currentLot, weightKg: left } };
}

function runShiftFixB(m: Readonly<Machine>): string {
  if (m.currentLot === null) return '未上紗';
  const next = consumeYarnPure(m, 30); // m 保證沒被動過
  if (next.currentLot === null) return `批號 ${m.currentLot.lotNo} 已用完下架`;
  return `批號 ${next.currentLot.lotNo} 剩 ${next.currentLot.weightKg} kg`;
}

/**
 * 【跟你的版本的差異】
 * (i) 你寫了 const lot = m.currentLot 並檢查 lot，但最後一行讀的還是 m.currentLot，
 *     所以沒修到（TS 那時就報了兩個 TS18047 給你看）。
 *     縮小 lot 不會連帶縮小 m.currentLot，它們在 TS 眼中是兩個獨立的東西。
 * (ii) 你把簽章改成 Readonly<Machine> 並回傳 Machine，方向完全正確，
 *     但函式主體原封不動貼上，那兩行指派在 Readonly 之下會直接紅字。
 *     改成回傳新物件（上面的 consumeYarnPure）才算完成。
 *     順帶一提，Readonly<Machine> 是「淺層」的：它擋得住 m.currentLot = null，
 *     但擋不住 m.currentLot.weightKg = 0。要全部擋住得用 DeepReadonly 或把內層也標 readonly。
 */

// ---------- (c) false 分支也會說謊 ----------

/**
 * 1. 傳 WARN 等級的警報進去會丟出 Error：
 *      未處理的分支：{"type":"ALARM","machineNo":"K-01","level":"WARN","message":"溫度偏高"}
 *    也就是 assertNever 被觸發。一則普通的溫度警報讓整個事件處理流程當掉。
 *
 * 2. 為什麼 assertNever 沒紅字：
 *    謂詞 e is AlarmEvent 同時做了兩個承諾 ——
 *      回傳 true  → 是 AlarmEvent
 *      回傳 false → 不是 AlarmEvent  ← 這個承諾是假的，WARN 警報也回傳 false
 *    TS 相信第二個承諾，在 else 分支把 AlarmEvent 整個剔除，
 *    switch 處理完剩下三種，e 就變成 never，assertNever 當然不會紅字。
 *
 * 3. 修法見下面。核心原則：謂詞只描述「型別」，業務條件（等級、數量、狀態）另外判斷。
 */

// ✅ 謂詞只回答「是不是 AlarmEvent」這個型別問題，不摻入 level
function isAlarm(e: MachineEvent): e is AlarmEvent {
  return e.type === 'ALARM';
}

function dispatchEventFixed(e: MachineEvent): string {
  if (isAlarm(e) && e.level === 'CRITICAL') {
    return `通知主管：${e.machineNo} ${e.message}`;
  }
  // 這裡 e 仍然是完整的 MachineEvent（複合條件不會剔除 AlarmEvent），
  // 所以 switch 必須把 ALARM 也處理掉，assertNever 才會通過。
  switch (e.type) {
    case 'RUN':
      return '忽略';
    case 'STOP':
      return `記錄停機 ${e.reason}`;
    case 'ROLL_DOFF':
      return `入庫 ${e.rollNo}`;
    case 'ALARM':
      return `記錄警報 ${e.message}`; // 走到這裡的一定是 WARN
    default:
      return assertNever(e);
  }
}

/**
 * 為什麼選這個修法：它修掉的是「謊言」本身。
 * 如果只在 dispatchEvent 補 case 'ALARM'，isCriticalAlarm 這個會說謊的謂詞還留在程式裡，
 * 下次有人拿去別的地方用，同樣的 bug 會再出現一次。
 *
 * 你的答案 1、2 正確，3 選的也是這個方向。
 */

// ---------- (d) as 不是縮小 ----------

/**
 * 1. as YarnLot[] 沒有做任何檢查，只是叫 TS 閉嘴。
 *    後端把 weightKg 從 number 改成字串 '25.50'（例如改用 Decimal 存），
 *    API 這一層完全沒有異狀，資料一路流到報表頁，
 *    直到某行寫了 roll.weightKg.toFixed(1) 才丟 TypeError: toFixed is not a function。
 *    錯誤出現在報表頁，真正的原因在 API 回應，中間隔了好幾個檔案。
 *    欄位改名（rollNo → roll_no）更麻煩：畫面只顯示 undefined，連錯誤都不丟。
 *
 * 2. 安全版本見下面。原則：外部資料一律先當成 unknown，在「進入點」驗證一次。
 */

async function fetchLotsSafe(): Promise<YarnLot[]> {
  const res = await fetch('/api/yarn-lots');
  const body: unknown = await res.json(); // 明確標成 unknown，擋掉 any 的傳染
  return parseYarnLotsResponse(body); // 格式不對就在這裡丟錯，訊息還會說是第幾筆
}
void fetchLotsSafe;

// ============================================================
// Q6 — 設計題：讓非法狀態無法被表示
// ============================================================

/**
 * 三種狀態各自是一個獨立的形狀，用 | 串起來。
 * 每個成員只宣告「自己這個狀態真正會有的欄位」，
 * 於是「成功卻帶 errorCode」「FATAL 卻有重試秒數」這些組合在型別層面就不存在。
 */
interface ScanOk {
  status: 'OK';
  roll: FabricRoll;
}

interface ScanRetryable {
  status: 'RETRYABLE';
  errorCode: 'TIMEOUT' | 'SERVER_BUSY';
  retryAfterSec: number;
}

interface ScanFatal {
  status: 'FATAL';
  errorCode: 'NOT_FOUND' | 'BARCODE_DAMAGED';
}

type ScanResult = ScanOk | ScanRetryable | ScanFatal;

function scanMessage(r: ScanResult): string {
  switch (r.status) {
    case 'OK':
      // 這個分支裡 roll 保證存在，不需要任何防禦
      return `✅ ${r.roll.rollNo} @ ${r.roll.zoneCode}`;
    case 'RETRYABLE':
      return `🔁 ${r.errorCode}，${r.retryAfterSec} 秒後重試`;
    case 'FATAL':
      return `⛔ ${r.errorCode}，請人工處理`;
    default:
      return assertNever(r);
  }
}

/**
 * 【為什麼拆成三個 interface 再組起來】
 * 直接寫成一個 type 的三個 inline 物件也完全正確（你的寫法），兩者等價。
 * 拆開的好處是：單一狀態可以被單獨引用，例如
 *   function handleFatal(r: ScanFatal) { ... }
 *   function retryLater(r: ScanRetryable) { ... }
 * 專案大起來之後這很常見，所以實務上偏好拆開。
 *
 * 【跟你的版本的差異】
 * 型別設計完全正確，五個非法狀態全部擋住（我單獨驗證過）。
 * 只有 (b) 的 OK 分支寫成 `✅ ${r.roll}`，把整個物件塞進模板字串變成 [object Object]，
 * 要取 r.roll.rollNo 和 r.roll.zoneCode。
 *
 * 另外建議用 switch + assertNever 而不是兩個 if 再 return。
 * 你的 if 版本現在是對的，但如果以後多一個狀態（例如 'PARTIAL'），
 * if 版本會默默把它當成 OK 分支處理，switch + assertNever 會當場報錯。
 */

// ---- 型別驗收：這 5 行都應該報錯，所以 @ts-expect-error 不會是「沒用到」 ----
// 每一行都加了 prettier-ignore，避免 Prettier 把物件折成多行導致指令蓋不到錯誤那一行
const sampleRoll: FabricRoll = { _id: '1', rollNo: 'R001', weightKg: 25.5, zoneCode: 'A-01', status: 'IN_STOCK' };

// prettier-ignore
// @ts-expect-error 成功卻帶 errorCode
const bad1: ScanResult = { status: 'OK', roll: sampleRoll, errorCode: 'TIMEOUT' };
// prettier-ignore
// @ts-expect-error 成功卻沒有 roll
const bad2: ScanResult = { status: 'OK' };
// prettier-ignore
// @ts-expect-error 可重試卻沒給秒數
const bad3: ScanResult = { status: 'RETRYABLE', errorCode: 'TIMEOUT' };
// prettier-ignore
// @ts-expect-error FATAL 不能用可重試的錯誤碼
const bad4: ScanResult = { status: 'FATAL', errorCode: 'TIMEOUT' };
// prettier-ignore
// @ts-expect-error FATAL 不能帶 retryAfterSec
const bad5: ScanResult = { status: 'FATAL', errorCode: 'NOT_FOUND', retryAfterSec: 5 };
void [bad1, bad2, bad3, bad4, bad5];

// ============================================================
// 驗收（跟練習檔相同）
// ============================================================

const results = { pass: 0, fail: 0, todo: 0 };

function isTodo(e: unknown): boolean {
  return e instanceof Error && e.message === 'TODO';
}

function check(label: string, run: () => unknown, expected: unknown): void {
  try {
    const actual = run();
    if (JSON.stringify(actual) === JSON.stringify(expected)) {
      results.pass++;
      console.log(`✅ ${label}`);
    } else {
      results.fail++;
      console.log(`❌ ${label}\n     預期 ${JSON.stringify(expected)}\n     實際 ${JSON.stringify(actual)}`);
    }
  } catch (e) {
    if (isTodo(e)) {
      results.todo++;
      console.log(`⬜ ${label}`);
      return;
    }
    results.fail++;
    console.log(`❌ ${label}\n     丟出例外：${e instanceof Error ? e.message : String(e)}`);
  }
}

function checkThrows(label: string, run: () => unknown, expectedMessage: string): void {
  try {
    const actual = run();
    results.fail++;
    console.log(`❌ ${label}\n     預期丟出「${expectedMessage}」，實際回傳 ${JSON.stringify(actual)}`);
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
      console.log(`❌ ${label}\n     預期訊息「${expectedMessage}」\n     實際訊息「${msg}」`);
    }
  }
}

console.log('\n===== Q1 =====');
check('Q1 null', () => formatCellValue(null), '-');
check('Q1 undefined', () => formatCellValue(undefined), '-');
check('Q1 數字 0', () => formatCellValue(0), '0.0');
check('Q1 數字 22.46', () => formatCellValue(22.46), '22.5');
check('Q1 NaN', () => formatCellValue(NaN), '-');
check('Q1 空字串', () => formatCellValue(''), '-');
check('Q1 全空白', () => formatCellValue('   '), '-');
check('Q1 字串 trim', () => formatCellValue('  R001 '), 'R001');
check('Q1 日期', () => formatCellValue(new Date('2026-09-17T08:00:00Z')), '2026-09-17');
check('Q1 無效日期', () => formatCellValue(new Date('abc')), '-');

console.log('\n===== Q2 =====');
const events: MachineEvent[] = [
  { type: 'RUN', machineNo: 'K-01', rpm: 850 },
  { type: 'ROLL_DOFF', machineNo: 'K-01', rollNo: 'R101', weightKg: 22.4 },
  { type: 'STOP', machineNo: 'K-02', reason: 'YARN_OUT' },
  { type: 'ALARM', machineNo: 'K-02', level: 'WARN', message: '溫度偏高' },
  { type: 'ROLL_DOFF', machineNo: 'K-03', rollNo: 'R102', weightKg: 0 },
  { type: 'ALARM', machineNo: 'K-03', level: 'CRITICAL', message: '馬達過載' },
  { type: 'ROLL_DOFF', machineNo: 'K-03', rollNo: 'R103', weightKg: 19.6 },
];
check('Q2a RUN', () => eventSummary(events[0]!), 'K-01 運轉中 850 rpm');
check('Q2a ROLL_DOFF', () => eventSummary(events[1]!), 'K-01 落布 R101 22.4 kg');
check('Q2a STOP', () => eventSummary(events[2]!), 'K-02 停機：缺紗');
check('Q2a ALARM WARN', () => eventSummary(events[3]!), 'K-02 ⚠️ 溫度偏高');
check('Q2a ALARM CRITICAL', () => eventSummary(events[5]!), 'K-03 🚨 馬達過載');
check('Q2b 加總', () => Math.round(totalDoffWeight(events) * 10) / 10, 42);
check('Q2b 空陣列', () => totalDoffWeight([]), 0);

console.log('\n===== Q3 =====');
const goodLot = { lotNo: 'Y-001', yarnType: 'COTTON', weightKg: 50, supplierNo: 'S-12', remark: '急件' };
check('Q3a 完整合法', () => isYarnLot(goodLot), true);
check('Q3a 沒有 remark', () => isYarnLot({ lotNo: 'Y-002', yarnType: 'NYLON', weightKg: 0, supplierNo: 'S-01' }), true);
check('Q3a supplierNo 為 null', () => isYarnLot({ ...goodLot, supplierNo: null }), true);
check('Q3a 缺 supplierNo 這個 key', () => isYarnLot({ lotNo: 'Y-003', yarnType: 'COTTON', weightKg: 10 }), false);
check('Q3a remark 是數字', () => isYarnLot({ ...goodLot, remark: 123 }), false);
check('Q3a yarnType 不在範圍', () => isYarnLot({ ...goodLot, yarnType: 'WOOL' }), false);
check('Q3a weightKg 是字串', () => isYarnLot({ ...goodLot, weightKg: '50' }), false);
check('Q3a weightKg 是 NaN', () => isYarnLot({ ...goodLot, weightKg: NaN }), false);
check('Q3a null', () => isYarnLot(null), false);
check('Q3a 陣列', () => isYarnLot([goodLot]), false);
check('Q3a 只有 yarnType', () => isYarnLot({ yarnType: 'COTTON' }), false);
check(
  'Q3b 挑出合法批次',
  () => pickValidLots([goodLot, null, { ...goodLot, lotNo: 'Y-009', weightKg: Infinity }, { ...goodLot, lotNo: 'Y-010' }]).map((l) => l.lotNo),
  ['Y-001', 'Y-010'],
);

console.log('\n===== Q4 =====');
check('Q4b 正常回應', () => parseYarnLotsResponse({ ok: true, data: [goodLot] }).length, 1);
check('Q4b 空資料', () => parseYarnLotsResponse({ ok: true, data: [] }), []);
checkThrows('Q4b body 是 null', () => parseYarnLotsResponse(null), '回應格式錯誤');
checkThrows('Q4b body 是陣列', () => parseYarnLotsResponse([goodLot]), '回應格式錯誤');
checkThrows('Q4b ok:false', () => parseYarnLotsResponse({ ok: false, message: '權限不足' }), 'API 錯誤：權限不足');
checkThrows('Q4b ok:false 沒 message', () => parseYarnLotsResponse({ ok: false }), 'API 錯誤：未知錯誤');
checkThrows('Q4b ok 是字串 true', () => parseYarnLotsResponse({ ok: 'true', data: [] }), '回應格式錯誤');
checkThrows('Q4b data 不是陣列', () => parseYarnLotsResponse({ ok: true, data: goodLot }), 'data 不是陣列');
checkThrows(
  'Q4b 第 2 筆壞掉',
  () => parseYarnLotsResponse({ ok: true, data: [goodLot, { ...goodLot, yarnType: 'WOOL' }] }),
  '第 2 筆資料格式錯誤',
);

console.log('\n===== Q6 =====');
const scanOk: ScanResult = { status: 'OK', roll: sampleRoll };
const scanRetry: ScanResult = { status: 'RETRYABLE', errorCode: 'TIMEOUT', retryAfterSec: 5 };
const scanFatal: ScanResult = { status: 'FATAL', errorCode: 'NOT_FOUND' };
check('Q6b OK', () => scanMessage(scanOk), '✅ R001 @ A-01');
check('Q6b RETRYABLE', () => scanMessage(scanRetry), '🔁 TIMEOUT，5 秒後重試');
check('Q6b FATAL', () => scanMessage(scanFatal), '⛔ NOT_FOUND，請人工處理');

console.log(`\n結果：✅ ${results.pass}　❌ ${results.fail}　⬜ ${results.todo}`);

// ============================================================
// 這一章的重點回顧
// ============================================================

/**
 * 1. narrowing 只能靠執行期查得到的資訊（typeof / === / in / instanceof / Array.isArray）。
 *    型別世界的東西編譯後就消失了，不能拿來 if。
 *
 * 2. 真值判斷 if (x) 會連 0 和 '' 一起擋掉。型別上 number 在 else 分支還在，
 *    就是 TS 在暗示你「0 可能跑來這裡」。擋空值請寫 != null 或 !== undefined。
 *
 * 3. 一行只放一個布林運算子。「x 是 A/B/C 之一」用 ===+||，
 *    「x 不是 A/B/C 任何一個」用 !==+&&（否定會把 || 換成 &&）。
 *
 * 4. 型別守衛 x is T 是承諾，不是檢查。TS 不驗證內容，
 *    而且 false 分支也會被當成承諾（業務條件不要塞進謂詞）。
 *
 * 5. 可辨識聯合 + switch + assertNever：
 *    讓非法狀態無法被表示，並在型別長大時自動點名所有需要補的地方。
 *
 * 6. 外部資料（API、JSON.parse、req.body、localStorage）一律當成 unknown，
 *    在進入點驗證一次。as 不是縮小，它只是把 bug 延後到使用點。
 *    第 10 章的 zod 就是自動產生這些守衛的工具。
 */

export {};
