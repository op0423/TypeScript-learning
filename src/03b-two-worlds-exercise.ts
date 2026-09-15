/**
 * ============================================================
 *  補充課 練習：型別世界 vs 值世界
 * ============================================================
 *
 *  這是一堂短課的練習，份量比正式章節小很多，30 分鐘內應該寫得完。
 *  重點不是寫出多複雜的東西，是「每次下筆前知道自己在哪個世界」。
 *
 *  一樣：寫完整份貼回來，我逐題檢討。
 */

// ============================================================
// 共用資料
// ============================================================

interface FabricRoll {
  _id: string;
  rollNo: string;
  weightKg: number;
  zoneCode: string;
  status: "IN_STOCK" | "SHIPPED" | "HOLD";
}

const rolls: FabricRoll[] = [
  {
    _id: "1",
    rollNo: "R001",
    weightKg: 25.5,
    zoneCode: "A-01",
    status: "IN_STOCK",
  },
  {
    _id: "2",
    rollNo: "R002",
    weightKg: 30.0,
    zoneCode: "A-01",
    status: "SHIPPED",
  },
];

// ============================================================
// Q1 — 判斷世界（不用寫程式，填在註解裡）
// ============================================================
/**
 * 下面每一個標了 ★N 的位置，寫下它屬於「值世界」還是「型別世界」。
 * 判斷方法：編譯成 JS 之後它還在嗎？
 *
 *   interface Order {          // ★1  Order 這個名字
 *     orderNo: string;         // ★2  string
 *   }
 *
 *   const order: Order = {     // ★3  order 這個名字
 *     orderNo: 'SO-001',       // ★4  'SO-001' 這個值
 *   };
 *
 *   type Keys = keyof Order;   // ★5  keyof Order
 *
 *   function ship<T extends Order>(x: T): T[] {   // ★6  ship
 *     return [x];                                 // ★7  <T extends Order> 裡的 T
 *   }                                             // ★8  T[] （回傳型別位置）
 *
 *   console.log(typeof order); // ★9  這個 typeof
 *   type O = typeof order;     // ★10 這個 typeof
 */

// ---- 你的答案 ----
// ★1:型別世界
// ★2:型別世界
// ★3:值世界
// ★4:值世界
// ★5:型別世界
// ★6:型別世界
// ★7:型別世界
// ★8:型別世界
// ★9:值世界
// ★10:型別世界

// ============================================================
// Q2 — 修錯（三段都有跨世界的錯誤）
// ============================================================
/**
 * 每一段都指出「錯在哪個跨世界問題」，並寫出修正版。
 * 提示：三段錯的方式都不一樣。
 *
 * ------------------------------------------------------------
 * (a)
 *   function summarize(items: readonly {}, label: string): string {
 *     return `${label}: ${items.length} 筆`;
 *   }
 *
 * ------------------------------------------------------------
 * (b)
 *   const DEFAULT_ZONE = 'A-01';
 *
 *   function assignZone(roll: FabricRoll, zone: DEFAULT_ZONE): FabricRoll {
 *     return { ...roll, zoneCode: zone };
 *   }
 *
 * ------------------------------------------------------------
 * (c)
 *   interface Pallet {
 *     palletNo: string;
 *     rolls: FabricRoll[];
 *   }
 *
 *   function handle(input: unknown): string {
 *     if (input instanceof Pallet) {
 *       return input.palletNo;
 *     }
 *     return '未知';
 *   }
 */

// ---- 你的答案 ----
// (a) 問題： readonly {} 在型態世界這樣寫是讀空物件而已
//     修正：function summarize(items: readonly FabricRoll{}, label: string): string {
//            return `${label}: ${items.length} 筆`;
//           }
//
// (b) 問題：roll: FabricRoll會讀取的是這個物件的method(pop、length、push....)
//     修正：function assignZone(roll: FabricRoll{}, zone: DEFAULT_ZONE): FabricRoll {
//            return { ...roll, zoneCode: zone };
//          }
// (c) 問題：interface在編譯期會直接消失
//     修正：
          //  function isPallet(x: unknown): x is Pallet {
          //  return (
          //    typeof x === 'object' && //
          //    x !== null && // typeof null === 'object'，
          //    'palletNo' in x &&
          //    typeof (x as Pallet).palletNo === 'string'&&
          //      typeof (x as Pallet).rolls === FabricRoll[];
          //    );
          // }

// ============================================================
// Q3 — 用 typeof 消除重複維護
// ============================================================
/**
 * 下面有一份設定物件，還有一份「手寫的 interface」。
 * 兩份要人工同步，遲早會不一致。
 *
 * 請：
 *   (a) 刪掉手寫的 interface，改用 typeof 產生型別
 *   (b) 寫一個函式 printConfig，參數型別用你產生的那個型別
 *   (c) 在註解裡回答：這樣做的代價是什麼？
 *       （提示：型別跟著值走 —— 那如果有人不小心改了 dbConfig 的某個值呢？）
 */

const dbConfig = {
  host: "localhost",
  port: 27017,
  dbName: "wms",
  retryWrites: true,
};

// 手寫版（請刪掉，改用 typeof）
interface DbConfigManual {
  host: string;
  port: number;
  dbName: string;
  retryWrites: boolean;
}

// ---- 你的答案 ----
 type newDbConfigManual = typeof dbConfig;
  function printConfig(config: newDbConfigManual):void{
    console.log(config)
  };
// 這樣寫的代價大概是若有人更改了某一欄位的值,且不符合我們規定的型態,那會報錯(型態錯誤)
// ============================================================
// Q4 — as const + 索引存取
// ============================================================
/**
 * 下面這個常數陣列同時要服務兩個世界：
 *   執行期 → 前端下拉選單要用它 .map()
 *   編譯期 → 型別要剛好是那四個字串的 union
 *
 * 請：
 *   (a) 讓 ROLL_STATUSES 的型別不要被 widen 成 string[]
 *   (b) 從它產生一個型別 RollStatus = 'IN_STOCK' | 'SHIPPED' | 'HOLD' | 'SCRAPPED'
 *       （不准手寫那四個字串，必須從陣列推出來）
 *   (c) 寫一個函式 isFinalStatus(status: RollStatus): boolean
 *       規則：SHIPPED 和 SCRAPPED 算「最終狀態」
 *   (d) 驗證：傳一個不在清單裡的字串進去要編譯錯誤
 */

// const ROLL_STATUSES = ["IN_STOCK", "SHIPPED", "HOLD", "SCRAPPED"];

// ---- 你的答案 ----
const ROLL_STATUSES = ["IN_STOCK", "SHIPPED", "HOLD", "SCRAPPED"] as const;
type RollStatus = (typeof ROLL_STATUSES)[number];
function isFinalStatus(status: RollStatus): boolean {
  return status === "SHIPPED" || status === "SCRAPPED";
}

// ---- 驗收測試（寫完拿掉註解）----
/*
console.log(isFinalStatus('SHIPPED'));   // true
console.log(isFinalStatus('IN_STOCK'));  // false

// @ts-expect-error 不在清單裡
isFinalStatus('LOST');

// 值世界也要能用
console.log(ROLL_STATUSES.map(s => s.toLowerCase()));
*/

// ============================================================
// Q5 — 自己搭一座「型別世界 → 值世界」的橋
// ============================================================
/**
 * 情境：你的 Express 收到 req.body，型別是 unknown（因為外部資料不可信）。
 * 請寫一個型別謂詞 isFabricRoll，在執行期檢查形狀。
 *
 * 要求：
 *   (a) 回傳型別用 `x is FabricRoll`
 *   (b) 檢查要完整：五個欄位都要驗，status 要驗是不是那三個值之一
 *   (c) 注意第 1 章的坑：typeof null === 'object'
 *   (d) 在註解裡回答：
 *       TS 有驗證你這個函式「真的檢查對了」嗎？如果沒有，代表什麼？
 *
 * 提示：narrowing 的細節第 4 章才正式講，這題只要能跑就好，
 *       重點是體會「這座橋必須自己蓋」。
 */

// ---- 你的答案 ----

// ---- 驗收測試（寫完拿掉註解）----
/*
const fromApi: unknown = { _id: '9', rollNo: 'R009', weightKg: 20, zoneCode: 'C-01', status: 'IN_STOCK' };

if (isFabricRoll(fromApi)) {
  console.log(fromApi.rollNo);   // ✅ 這裡應該有型別提示
}

console.log(isFabricRoll(null));                    // false
console.log(isFabricRoll({ rollNo: 'R001' }));      // false（欄位不齊）
console.log(isFabricRoll({ ...rolls[0], status: 'FLYING' }));  // false（status 不合法）
*/

// ============================================================
// Q6 — 觀念題（寫在註解裡）
// ============================================================
/**
 * (a) 為什麼 class 可以 instanceof，interface 不行？
 *     用「兩個世界」的說法解釋。
 *
 * (b) 你在 WMS 用 Mongoose。假設你這樣寫：
 *
 *       const roll = await Roll.findById(id) as FabricRoll;
 *       console.log(roll.weightKg.toFixed(2));
 *
 *     如果資料庫裡那筆資料的 weightKg 存成了字串 "25.5"，
 *     TypeScript 會在什麼時候發現？為什麼？
 *
 * (c) 承 (b)：所以 zod 這類「執行期驗證」函式庫為什麼存在？
 *     它補的是哪一個世界的洞？
 */

// ---- 你的答案 ----
// (a)因為interface在型態世界是存在的但在編譯期間就會消失,而class是兩個世界都有
// (b)
// (c)

export {};
