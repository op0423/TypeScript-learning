/**
 * 第 1 章：型別註記 (Type Annotation) 與型別推論 (Type Inference)
 *
 * 執行方式： npm run run:01
 * 型別檢查： npm run check
 */

// ─────────────────────────────────────────────
// 1. 你原本的 JS：變數沒有型別，什麼都能塞
// ─────────────────────────────────────────────
// let count = 0;
// count = "hello";   // JS 完全允許，直到執行期才爆炸

// TS 的做法：宣告時就把型別釘死
let count: number = 0;
count = 10;
// count = "hello";   // ❌ 打開這行看錯誤：Type 'string' is not assignable to type 'number'

// ─────────────────────────────────────────────
// 2. 基本型別（記這 7 個就夠日常 90%）
// ─────────────────────────────────────────────
const productName: string = '32支精梳棉';
const weightKg: number = 25.5;
const isFinished: boolean = false;
const tags: string[] = ['胚布', '待驗'];          // 陣列：型別 + []
const matrix: number[][] = [[1, 2], [3, 4]];      // 二維陣列
const nothing: null = null;
const notSet: undefined = undefined;

// Tuple：固定長度、每個位置型別不同（JS 沒有的概念）
const rackPosition: [string, number] = ['A區', 3];

// ─────────────────────────────────────────────
// 3. 型別推論：其實大部分你「不用寫」型別
// ─────────────────────────────────────────────
// 這是 TS 新手最大的誤解 —— 不是每個變數都要手動標註。
let machineNo = 'K-07';   // TS 自動推論成 string，滑鼠移上去會看到
// machineNo = 5;        // ❌ 一樣會擋，因為推論出來的型別是 string

const LOT_PREFIX = 'LOT-';  // const 推論成「字面量型別」 'LOT-'，不是 string

// 👉 實務原則：
//    - 有初始值的區域變數 → 不要標註，讓 TS 推論
//    - 函式的「參數」與「回傳值」 → 一定要標註（這是型別的邊界）
//    - 物件的形狀 → 用 interface / type 定義（第 2 章）

// ─────────────────────────────────────────────
// 4. 函式：輸入輸出的硬宣告（你記得的那件事）
// ─────────────────────────────────────────────
function calcNetWeight(gross: number, tare: number): number {
  return gross - tare;
}

// 箭頭函式同理
const formatLotNo = (seq: number): string => `${LOT_PREFIX}${String(seq).padStart(4, '0')}`;

// 沒有回傳值 → void
function logLot(lotNo: string): void {
  console.log('[LOT]', lotNo);
}

// 選填參數用 ?，預設值會自動推論型別
function greet(name: string, title?: string): string {
  return title ? `${title} ${name}` : name;
}

// ─────────────────────────────────────────────
// 5. any vs unknown —— 學 TS 最重要的分水嶺
// ─────────────────────────────────────────────
// any = 「關掉型別檢查」，等於寫回 JS。能不用就不用。
const rawAny: any = JSON.parse('{"kg": 25}');
console.log(rawAny.kg.toFixed(2));      // TS 不檢查，執行期才可能爆
try {
  console.log(rawAny.foo.bar.baz);      // TS 完全不擋 → 執行期才 TypeError
} catch (err) {
  console.log('💥 any 讓這個錯誤逃過編譯檢查:', (err as Error).message);
}

// unknown = 「我不知道是什麼，但你用之前必須先確認」
const rawUnknown: unknown = JSON.parse('{"kg": 25}');
// console.log(rawUnknown.kg);          // ❌ 'rawUnknown' is of type 'unknown'

// 用「型別縮小 (narrowing)」把 unknown 變成可用的型別
if (typeof rawUnknown === 'object' && rawUnknown !== null && 'kg' in rawUnknown) {
  console.log('kg =', (rawUnknown as { kg: number }).kg);
}

// 👉 實務原則：外部進來的資料（API 回應、JSON.parse、第三方套件）用 unknown，
//    在邊界做一次驗證，往內就是乾淨的型別。

// ─────────────────────────────────────────────
// 6. Union 型別：JS 常見的「多種可能」
// ─────────────────────────────────────────────
type LotStatus = 'pending' | 'inspecting' | 'passed' | 'rejected';

function statusLabel(status: LotStatus): string {
  // TS 會依 status 的值自動縮小型別
  switch (status) {
    case 'pending':    return '待處理';
    case 'inspecting': return '驗布中';
    case 'passed':     return '合格';
    case 'rejected':   return '不合格';
  }
}

// 可為空的值，用 union 明確表達（別再用 any）
function findLot(lotNo: string): string | null {
  return lotNo.startsWith('LOT-') ? lotNo : null;
}

// ─────────────────────────────────────────────
// 執行區
// ─────────────────────────────────────────────
console.log('淨重:', calcNetWeight(weightKg, 1.2));
console.log('批號:', formatLotNo(7));
logLot(formatLotNo(7));
console.log('打招呼:', greet('Xin-chang', '工程師'));
console.log('狀態:', statusLabel('inspecting'));
console.log('查找:', findLot('LOT-0007'), findLot('XXX'));
console.log('品名:', productName, '| 完工:', isFinished, '| 標籤:', tags, '| 儲位:', rackPosition, '| 機台:', machineNo, '| 矩陣:', matrix, nothing, notSet);
