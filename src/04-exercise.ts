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

/**
 * 報表儲存格格式化。規格：
 *   null / undefined        → '-'
 *   number：NaN             → '-'；其他 → 小數點一位（toFixed(1)），0 要顯示 '0.0'
 *   string：trim 後是空字串  → '-'；其他 → trim 後的字串
 *   Date：無效日期           → '-'；其他 → 'YYYY-MM-DD'（用 toISOString().slice(0, 10)）
 *
 * 提示：無效日期 new Date('abc') 的 getTime() 是 NaN
 */
function formatCellValue(v: string | number | Date | null | undefined): string {
  throw new Error('TODO');
}

// ============================================================
// Q2 — 可辨識聯合 + 窮舉檢查（針織機台事件）
// ============================================================

type StopReason = 'NEEDLE_BREAK' | 'YARN_OUT' | 'MAINTENANCE';

interface RunEvent { type: 'RUN'; machineNo: string; rpm: number }
interface StopEvent { type: 'STOP'; machineNo: string; reason: StopReason }
interface DoffEvent { type: 'ROLL_DOFF'; machineNo: string; rollNo: string; weightKg: number }
interface AlarmEvent { type: 'ALARM'; machineNo: string; level: 'WARN' | 'CRITICAL'; message: string }

type MachineEvent = RunEvent | StopEvent | DoffEvent | AlarmEvent;

/**
 * (a) 事件摘要，必須用 switch + default: return assertNever(e)
 *   RUN       → 'K-01 運轉中 850 rpm'
 *   STOP      → 'K-01 停機：斷針'   （NEEDLE_BREAK 斷針 / YARN_OUT 缺紗 / MAINTENANCE 保養）
 *   ROLL_DOFF → 'K-01 落布 R101 22.4 kg'
 *   ALARM     → WARN: 'K-01 ⚠️ 溫度偏高'   CRITICAL: 'K-01 🚨 馬達過載'
 *
 * 提示：停機原因的中文對照，想想第 2 章的 Record<K, V>，
 *      想想如果未來 StopReason 多一個值，哪種寫法會讓 TS 提醒你。
 */
function eventSummary(e: MachineEvent): string {
  throw new Error('TODO');
}

/**
 * (b) 加總所有落布事件的重量。
 *     events 裡混著各種事件，只算 ROLL_DOFF。
 *     挑戰：用 filter + reduce 寫，並 hover filter 的結果，看 TS 推論成什麼型別。
 */
function totalDoffWeight(events: readonly MachineEvent[]): number {
  throw new Error('TODO');
}

/**
 * (c) 觀察題：在 MachineEvent 的聯合裡暫時加入
 *       | { type: 'SPEED_CHANGE'; machineNo: string; fromRpm: number; toRpm: number }
 *     然後執行 npx tsc --noEmit。
 *
 *     1. 哪幾行報錯？錯誤訊息是什麼？（貼上關鍵的那一句）
 *     2. totalDoffWeight 有報錯嗎？為什麼有 / 沒有？
 *     3. 如果 (a) 你沒寫 default: assertNever，會發生什麼事？（編譯期 + 執行期各一句）
 *
 *     記錄完把 SPEED_CHANGE 刪掉。
 *
 *   你的答案：
 *   1.
 *   2.
 *   3.
 */

// ============================================================
// Q3 — 自訂型別守衛（紗線批次，從 API 收到 unknown）
// ============================================================

type YarnType = 'COTTON' | 'POLYESTER' | 'NYLON';

interface YarnLot {
  lotNo: string;
  yarnType: YarnType;
  weightKg: number;           // 必須是有限數字（NaN、Infinity 不算）
  supplierNo: string | null;  // 可以是 null，但這個 key「必須存在」
  remark?: string;            // 選填：可以不存在；存在的話必須是 string
}

/**
 * (a) 寫出誠實的型別守衛。
 *     規則：一個條件一行，早退 return false，最後 return true。
 */
function isYarnLot(x: unknown): x is YarnLot {
  throw new Error('TODO');
}

/**
 * (b) 用 isYarnLot 從混雜資料中挑出合法的批次。
 *     回傳型別必須是 YarnLot[]，不准用 as。
 */
function pickValidLots(items: readonly unknown[]): YarnLot[] {
  throw new Error('TODO');
}

// ============================================================
// Q4 — 斷言函式（解析 API 回應）
// ============================================================

/**
 * (a) 斷言函式：不合法時 throw new Error(`第 ${index + 1} 筆資料格式錯誤`)
 */
function assertYarnLot(x: unknown, index: number): asserts x is YarnLot {
  throw new Error('TODO');
}

/**
 * (b) 解析後端回應。body 可能長這樣（但它是 unknown，什麼都有可能）：
 *       { ok: true,  data: [ ...YarnLot ] }
 *       { ok: false, message: '權限不足' }
 *
 *     規格（依序檢查）：
 *       body 不是物件（含 null、陣列）       → throw Error('回應格式錯誤')
 *       ok === false                        → throw Error(`API 錯誤：${message}`)
 *                                              message 不是 string 時用 '未知錯誤'
 *       ok 不是 true 也不是 false            → throw Error('回應格式錯誤')
 *       ok === true 但 data 不是陣列          → throw Error('data 不是陣列')
 *       data 任一筆不合法                     → 由 assertYarnLot 丟出（全有全無，不過濾）
 *       全部合法                             → 回傳 YarnLot[]
 *
 *     提示：對陣列的「每一個元素」做斷言，陣列本身的型別會變嗎？hover 看看。
 */
function parseYarnLotsResponse(body: unknown): YarnLot[] {
  throw new Error('TODO');
}

/**
 * (c) 一句話：Q3(b) 用型別守衛、Q4(b) 用斷言函式，選擇的依據是什麼？
 *
 *   你的答案：
 */

// ============================================================
// Q5 — 觀念題：tsc 零錯誤（或只有一個預期錯誤），但有問題
// ============================================================

/**
 * 以下函式都「不會被呼叫」，請讀程式碼回答。
 * 可以自己寫小測試去跑，但答案要寫在註解裡。
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
 * 1. 錯誤訊息是什麼？
 * 2. 為什麼 if 已經排除 null，箭頭函式裡還是被當成可能 null？
 * 3. 只把最後一行 machineNo = null 刪掉，錯誤就消失了，為什麼？
 *
 *   你的答案：
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
  if (m.currentLot === null) return '未上紗';
  consumeYarn(m, 30);
  return `批號 ${m.currentLot.lotNo} 剩 ${m.currentLot.weightKg} kg`;
}
void runShift;
/**
 * 1. 什麼樣的輸入會讓 runShift 在執行期爆掉？
 * 2. TS 為什麼沒有報錯？
 * 3. 給兩種修法：一種只改 runShift，一種從 consumeYarn 的「設計」改（提示：第 2、3 章的原則）
 *
 *   你的答案：
 */

// ---------- (c) ----------
function isCriticalAlarm(e: MachineEvent): e is AlarmEvent {
  return e.type === 'ALARM' && e.level === 'CRITICAL';
}

function dispatchEvent(e: MachineEvent): string {
  if (isCriticalAlarm(e)) {
    return `通知主管：${e.machineNo} ${e.message}`;
  }
  switch (e.type) {
    case 'RUN':
      return '忽略';
    case 'STOP':
      return `記錄停機 ${e.reason}`;
    case 'ROLL_DOFF':
      return `入庫 ${e.rollNo}`;
    default:
      return assertNever(e);
  }
}
void dispatchEvent;
/**
 * 1. dispatchEvent({ type: 'ALARM', machineNo: 'K-01', level: 'WARN', message: '溫度偏高' }) 會發生什麼事？
 * 2. switch 明明沒寫 case 'ALARM'，為什麼 assertNever(e) 沒有紅字？
 * 3. 怎麼修？（修 isCriticalAlarm 或修 dispatchEvent 都可以，說明理由）
 *
 *   你的答案：
 */

// ---------- (d) ----------
async function fetchLots(): Promise<YarnLot[]> {
  const res = await fetch('/api/yarn-lots');
  const lots = (await res.json()) as YarnLot[]; // ← 題目本身用了 as，不算你違規
  return lots;
}
void fetchLots;
/**
 * 1. 這行 as 讓什麼樣的 bug 從「進入點」被延後到「使用點」？舉一個你工作上會遇到的例子。
 * 2. 用這份練習寫好的函式，把它改寫成安全版本（寫在下面）。
 *
 *   你的答案：
 */

// ============================================================
// Q6 — 設計題：讓非法狀態無法被表示（掃描槍掃布卷條碼）
// ============================================================

/**
 * 現有的爛設計：
 *
 *   interface ScanResultBad {
 *     success: boolean;
 *     roll?: FabricRoll;
 *     errorCode?: string;
 *     retryAfterSec?: number;
 *   }
 *
 * 需求：
 *   - 成功：一定有 roll，不能有 errorCode、retryAfterSec
 *   - 可重試失敗：errorCode 只能是 'TIMEOUT' | 'SERVER_BUSY'，一定有 retryAfterSec
 *   - 不可重試失敗：errorCode 只能是 'NOT_FOUND' | 'BARCODE_DAMAGED'，不能有 retryAfterSec
 *   - 辨識欄位固定叫 status，值為 'OK' | 'RETRYABLE' | 'FATAL'
 *
 * (a) 把下面的 unknown 換成你設計的型別（可以拆成多個 interface / type）
 */
type ScanResult = unknown;

/**
 * (b) 訊息格式：
 *   OK        → '✅ R001 @ A-01'
 *   RETRYABLE → '🔁 TIMEOUT，5 秒後重試'
 *   FATAL     → '⛔ NOT_FOUND，請人工處理'
 */
function scanMessage(r: ScanResult): string {
  throw new Error('TODO');
}

// ---- Q6 型別驗收（不要改）：這 5 行都應該「是錯誤」，你的型別擋住了，@ts-expect-error 才不會報 TS2578 ----
const sampleRoll: FabricRoll = { _id: '1', rollNo: 'R001', weightKg: 25.5, zoneCode: 'A-01', status: 'IN_STOCK' };

// @ts-expect-error 成功卻帶 errorCode
const bad1: ScanResult = { status: 'OK', roll: sampleRoll, errorCode: 'TIMEOUT' };
// @ts-expect-error 成功卻沒有 roll
const bad2: ScanResult = { status: 'OK' };
// @ts-expect-error 可重試卻沒給秒數
const bad3: ScanResult = { status: 'RETRYABLE', errorCode: 'TIMEOUT' };
// @ts-expect-error FATAL 不能用可重試的錯誤碼
const bad4: ScanResult = { status: 'FATAL', errorCode: 'TIMEOUT' };
// @ts-expect-error FATAL 不能帶 retryAfterSec
const bad5: ScanResult = { status: 'FATAL', errorCode: 'NOT_FOUND', retryAfterSec: 5 };
void [bad1, bad2, bad3, bad4, bad5];

// ============================================================
// 執行驗收（不要改）
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
// 下面三個物件在你完成 (a) 之前型別是 unknown，完成之後必須仍然「零錯誤」
const scanOk: ScanResult = { status: 'OK', roll: sampleRoll };
const scanRetry: ScanResult = { status: 'RETRYABLE', errorCode: 'TIMEOUT', retryAfterSec: 5 };
const scanFatal: ScanResult = { status: 'FATAL', errorCode: 'NOT_FOUND' };
check('Q6b OK', () => scanMessage(scanOk), '✅ R001 @ A-01');
check('Q6b RETRYABLE', () => scanMessage(scanRetry), '🔁 TIMEOUT，5 秒後重試');
check('Q6b FATAL', () => scanMessage(scanFatal), '⛔ NOT_FOUND，請人工處理');

console.log(`\n結果：✅ ${results.pass}　❌ ${results.fail}　⬜ ${results.todo}`);

export {};
