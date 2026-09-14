/**
 * ============================================================
 *  第 3 章 參考解答：泛型 Generics
 * ============================================================
 *
 *  使用方式：
 *  - 不要只讀，把每題跟你自己寫的版本「並排」比對，差在哪一個字。
 *  - 標了 @ts-expect-error 的行，刪掉指令看看真正的錯誤訊息。
 *  - 本檔在 strict + noUncheckedIndexedAccess 下編譯零錯誤。
 *
 *  註：參考解答不是「唯一正解」。Q3 的路線選擇、Q5 的 code 命名
 *      都有設計空間，重點是理由講得通。
 */

// ============================================================
// 共用資料
// ============================================================

interface FabricRoll {
  _id: string;
  rollNo: string;
  weightKg: number;
  zoneCode: string;
  status: 'IN_STOCK' | 'SHIPPED' | 'HOLD';
}

interface Machine {
  _id: string;
  machineNo: string;
  efficiency: number;
  area: string;
}

const rolls: FabricRoll[] = [
  { _id: '1', rollNo: 'R001', weightKg: 25.5, zoneCode: 'A-01', status: 'IN_STOCK' },
  { _id: '2', rollNo: 'R002', weightKg: 30.0, zoneCode: 'A-01', status: 'SHIPPED' },
  { _id: '3', rollNo: 'R003', weightKg: 18.2, zoneCode: 'B-03', status: 'IN_STOCK' },
];

const machines: Machine[] = [
  { _id: 'm1', machineNo: 'K-01', efficiency: 92.5, area: '針織一廠' },
  { _id: 'm2', machineNo: 'K-02', efficiency: 88.0, area: '針織二廠' },
  { _id: 'm3', machineNo: 'K-03', efficiency: 95.1, area: '針織二廠' },
];

// ============================================================
// Q1 — last<T>
// ============================================================

function last<T>(arr: readonly T[]): T | undefined {
  return arr[arr.length - 1];
}

/**
 * 【關鍵一】參數為什麼要 readonly T[]
 *
 *   T[]           = 「我保留改動你的陣列的權利」（含 push/pop/sort/splice）
 *   readonly T[]  = 「我只會讀，不會改」
 *
 * 所以 readonly number[] 不能傳給 number[] 參數（TS4104），
 * 但一般 number[] 可以傳給 readonly number[] 參數 —— 承諾更嚴的可以接更寬的。
 *
 * 實務意義：在 service 層，參數加 readonly 等於用型別寫下
 * 「這個函式沒有副作用」，呼叫端讀簽名就知道，不必進去看實作。
 *
 * 【關鍵二】回傳為什麼是 T | undefined
 * 空陣列時 arr[-1] 是 undefined。這跟第 1 章 Array.find 是同一個道理：
 * 「可能找不到」必須寫進型別，不能靠呼叫端記得。
 *
 * 【補充】ES2022 之後也可以寫成 arr.at(-1)，回傳型別同樣是 T | undefined。
 */
function lastAlt<T>(arr: readonly T[]): T | undefined {
  return arr.at(-1);
}

const lastRoll = last(rolls);
console.log(lastRoll?.rollNo);

// @ts-expect-error 回傳值可能不存在，不能直接摸屬性
console.log(last(rolls).rollNo);

const frozen: readonly number[] = [1, 2, 3] as const;
const lastNum: number | undefined = last(frozen); // ✅ readonly 陣列也收
console.log(lastNum, lastAlt(rolls)?.rollNo);

// ============================================================
// Q2 — pluck
// ============================================================

function pluck<T, K extends keyof T>(items: readonly T[], key: K): T[K][] {
  return items.map((item) => item[key]);
}

/**
 * 【最常見的錯誤】把簽名寫成教材 3.4 的 getField：
 *
 *   function pluck<T, K extends keyof T>(obj: T, key: K): T[K]   // ❌ 物件進、單值出
 *
 * 這個版本「單獨編譯」不會報錯（它本身是合法函式），
 * 但一傳陣列進去就爆，錯誤訊息是：
 *
 *   Argument of type '"rollNo"' is not assignable to
 *   parameter of type 'keyof FabricRoll[]'
 *
 * 為什麼？T 被推論成 FabricRoll[]（陣列本身），
 * 於是 keyof T 取的是「陣列的 key」= 'length' | 'push' | 'map' | ...
 * 而不是 'rollNo' | 'weightKg'。
 *
 * → keyof T 永遠是「T 這個型別本身有什麼 key」。
 *   想取元素的 key，T 就必須綁定「元素」，所以參數要寫 readonly T[]。
 *
 * 【回傳型別】T[K][] 讀作「T[K] 的陣列」。
 * 不是 T[K]（單值）、不是 T[] （整個元素的陣列）、更不是 unknown[]。
 */

const rollNos: string[] = pluck(rolls, 'rollNo');
const weights: number[] = pluck(rolls, 'weightKg');
const statuses: ('IN_STOCK' | 'SHIPPED' | 'HOLD')[] = pluck(rolls, 'status');
const areas: string[] = pluck(machines, 'area');
console.log(rollNos, weights, statuses, areas);

// @ts-expect-error 'weight' 不是 FabricRoll 的欄位
pluck(rolls, 'weight');

// @ts-expect-error weightKg 是 number，不能塞進 string[]
const wrongType: string[] = pluck(rolls, 'weightKg');
console.log(wrongType);

// ============================================================
// Q3 — groupBy（路線 A：編譯期擋掉非字串欄位）
// ============================================================

/**
 * 【取捨說明】
 *
 * 選擇：路線 A。
 *
 * 理由：分組 key 若不是字串，JS 會偷偷呼叫 toString()。
 *       物件全部變成 "[object Object]" 擠進同一組、
 *       25.5 和 "25.5" 變成同一組、undefined 變成 "undefined" 一組。
 *       這類 bug 不會拋錯、不會有紅字，只會在報表上給出安靜的錯答案 ——
 *       正是第 2 章 Q3（運算子優先權）那一類「型別檢查過了但結果錯」的 bug。
 *       既然編譯期擋得掉，就不要留到執行期用肉眼抓。
 *
 * 代價：永遠無法按數字欄位分組，即使那是合理需求
 *       （例如按年份、按批號、按機台編號分組）。
 *       真的需要時只能在呼叫端先自己轉字串，或另外提供 loose 版本。
 *
 * 反之若選路線 B：彈性最大，任何欄位都能分組，
 *       代價是型別系統完全幫不上忙，
 *       「這個欄位適不適合當分組依據」變成人工審查項目。
 */
function groupBy<K extends string, T extends Record<K, string>>(
  items: readonly T[],
  key: K,
): Record<string, T[]> {
  const result: Record<string, T[]> = {};
  for (const item of items) {
    const groupKey = item[key];
    result[groupKey] ??= []; // ← ?? 系列對 '' 安全；用 ||= 會把空字串 key 誤判
    result[groupKey].push(item);
  }
  return result;
}

/**
 * 【為什麼不用 reduce】
 * reduce 版本需要 {} as Record<string, T[]> 這個型別斷言，
 * 因為空物件 {} 當下還不是那個型別。
 * 改用 for...of + 事先宣告好型別的 const，斷言就消失了。
 *
 *   泛型不強迫你寫 functional style。哪種寫法能讓型別自然成立，就用哪種。
 *
 * 【型別參數順序】
 * <K extends string, T extends Record<K, string>>
 * 這裡 T 的約束引用了 K。型別參數列表「可以前向引用」，
 * 所以寫成 <T extends Record<K, string>, K extends string> 也合法。
 * 但把被依賴的 K 放前面，讀起來順序比較自然。
 *
 * 【命名慣例】型別參數用大寫單字母：T(Type) K(Key) V(Value) E(Error) R(Return)。
 * 寫成小寫 k 能編譯（型別與值是兩套命名空間），但可讀性差，別養成習慣。
 *
 * 【narrowing 的細節】
 * result[groupKey].push(...) 在 noUncheckedIndexedAccess 下沒報
 * 「possibly undefined」，是因為 TS 4.7+ 對「索引鍵是 const 變數」的
 * 元素存取支援流程分析。把 const groupKey 改成 let 就會報錯 ——
 * 值得親手試一次，這示範了 narrowing 的成立條件有多脆弱（第 4 章主題）。
 */

const byZone = groupBy(rolls, 'zoneCode');
console.log(byZone['A-01']?.length, byZone['B-03']?.length);

const byArea = groupBy(machines, 'area');
console.log(Object.keys(byArea));

// @ts-expect-error weightKg 是 number，不是字串欄位 → 路線 A 擋下來
groupBy(rolls, 'weightKg');

// ------------------------------------------------------------
// Q3 對照組：路線 B（允許任何欄位，實作裡轉字串）
// ------------------------------------------------------------

function groupByLoose<T, K extends keyof T>(
  items: readonly T[],
  key: K,
): Record<string, T[]> {
  const result: Record<string, T[]> = {};
  for (const item of items) {
    const groupKey = String(item[key]); // ← 代價就在這一行：型別資訊被沖掉
    result[groupKey] ??= [];
    result[groupKey].push(item);
  }
  return result;
}

// 路線 B 什麼都收，好壞都收
const byWeight = groupByLoose(rolls, 'weightKg'); // 能跑，key 變成 '25.5' 這種字串
console.log(Object.keys(byWeight));
/**
 * 實測輸出：[ '30', '25.5', '18.2' ] —— 順序跟原陣列不一樣！
 *
 * 因為 JS 物件的 key 排序規則是：「整數樣式的 key」永遠排在最前面且由小到大，
 * 其餘字串 key 才照插入順序。30 是整數樣式，25.5 和 18.2 不是，於是 30 被提前。
 *
 * → 這就是路線 B 的隱藏代價：不只型別資訊沒了，
 *   連「分組結果的順序」都會隨資料內容而變，而且沒有任何警告。
 */

// ============================================================
// Q4 — sumBy
// ============================================================

// 寫法一（推薦）：約束 T 本身 —— 「T 必須是一個『K 欄位是 number』的物件」
function sumBy<K extends string, T extends Record<K, number>>(
  items: readonly T[],
  key: K,
): number {
  return items.reduce((total, item) => total + item[key], 0);
}

/**
 * 【為什麼直覺寫法會卡住】
 *
 *   function sumBy<T, K extends keyof T>(items: T[], key: K): number {
 *     return items.reduce((total, item) => total + item[key], 0);
 *                                                  ^^^^^^^^^
 *     // ❌ TS2365: Operator '+' cannot be applied to types 'number' and 'T[K]'
 *   }
 *
 * K extends keyof T 只保證「K 是 T 的某個欄位」，
 * 完全沒說那個欄位是 number。TS 不讓你加。
 *
 * 【解法的方向】把「是數字」這件事寫進約束裡。
 * Record<K, number> 的意思就是「有一個叫 K 的欄位，型別是 number」。
 * 剩下的欄位不管 —— 結構型別（第 2 章），只要求形狀的一部分對得上。
 *
 * 這跟 Q3 是同一招：Q3 要字串就 Record<K, string>，Q4 要數字就 Record<K, number>。
 *
 * 【怎麼口頭解釋這個簽名】（面試會問）
 * 「我約束的是 T 本身：T 必須有一個型別為 number、名字叫 K 的欄位。
 *   不是約束 T[K]，是反過來用 T 的形狀去反推 K 能是什麼。」
 *
 * 【reduce 的初始值】
 * 這裡的 0 不能省。省略初始值時累加器會被推論成元素型別（第 2 章補強觀念），
 * 而且空陣列會直接 throw TypeError。
 */

// 寫法二（對照用，不建議）：用條件型別約束 T[K]
function sumByConditional<T, K extends keyof T>(
  items: readonly T[],
  key: T[K] extends number ? K : never,
): number {
  // ⚠️ 誠實說明：這個寫法在「實作端」無法避免斷言。
  //    TS 有辦法在呼叫端擋住非數字欄位，卻無法在函式體內推出 item[key] 是 number。
  //    因為題目禁止 as，所以正式答案採用寫法一。
  return items.reduce<number>((total, item) => total + (item[key] as number), 0);
}
console.log(typeof sumByConditional);

const totalWeight: number = sumBy(rolls, 'weightKg');
const totalEff: number = sumBy(machines, 'efficiency');
console.log(totalWeight.toFixed(1), totalEff.toFixed(1));

// @ts-expect-error rollNo 是 string，不能加總
sumBy(rolls, 'rollNo');

// @ts-expect-error status 是字串聯合，不能加總
sumBy(rolls, 'status');

// @ts-expect-error 欄位根本不存在
sumBy(rolls, 'weight');

// ============================================================
// Q5 — Result<T, E> 實戰
// ============================================================

type Result<T, E = string> = { ok: true; value: T } | { ok: false; error: E };

/**
 * 錯誤型別：可辨識聯合（discriminated union）
 *
 * 三個成立條件：
 *   1. 每個成員都有同名欄位（code）
 *   2. 該欄位是「字面量型別」，不是 string
 *   3. 每個成員的值都不同
 *
 * 判別欄位命名用 code / kind / type / tag。
 * 不要叫 message —— message 的慣例語意是「給人看的訊息」，
 * 拿它當判別欄位會讓讀的人預期拿到一句話、實際拿到一個常數。
 *
 * 注意每個成員帶的欄位不同：只有 SAME_ZONE 需要 zoneCode，
 * 因為只有那種失敗才需要告訴呼叫端「你現在就在這一格」。
 * 這就是「讓非法狀態無法被表示」在錯誤處理上的應用 ——
 * 在 ROLL_NOT_FOUND 分支裡摸 zoneCode 會編譯錯誤。
 */
type MoveRollError =
  | { code: 'ROLL_NOT_FOUND'; rollNo: string }
  | { code: 'ALREADY_SHIPPED'; rollNo: string; currentZone: string }
  | { code: 'SAME_ZONE'; rollNo: string; zoneCode: string };

function moveRoll(
  items: readonly FabricRoll[],
  rollNo: string,
  toZoneCode: string,
): Result<FabricRoll, MoveRollError> {
  // 規則 1：找不到 —— 一定要放第一個，後面每條都依賴 found 存在
  const found = items.find((r) => r.rollNo === rollNo);
  if (!found) {
    return { ok: false, error: { code: 'ROLL_NOT_FOUND', rollNo } };
  }
  // ↑ 過了這行，found 已從 FabricRoll | undefined 縮成 FabricRoll（narrowing 逐條累積）

  // 規則 2：已出貨不可移動
  if (found.status === 'SHIPPED') {
    return {
      ok: false,
      error: { code: 'ALREADY_SHIPPED', rollNo, currentZone: found.zoneCode },
    };
  }

  // 規則 3：目標儲位與現在相同
  if (found.zoneCode === toZoneCode) {
    return {
      ok: false,
      error: { code: 'SAME_ZONE', rollNo, zoneCode: found.zoneCode },
    };
  }

  // 全部通過 → 造「新物件」，不動原本的元素
  const moved: FabricRoll = { ...found, zoneCode: toZoneCode };
  return { ok: true, value: moved };
}

/**
 * 【三個結構重點】
 *
 * 1. guard clause（每條規則各自 early return），不要寫成巢狀 if/else。
 *    讀起來是「不合法的先擋掉，活著走到最後的一定合法」。
 *
 * 2. 陣列當參數傳進來（items），不要在函式裡抓外層的 rolls。
 *    抓外層 = 依賴全域狀態 = 不能重複使用、不能單元測試。
 *
 * 3. { ...found, zoneCode: toZoneCode } 產生新物件。
 *    直接寫 found.zoneCode = toZoneCode 會改到原陣列裡的元素：
 *      - 副作用藏在函式裡，呼叫端從簽名看不出來
 *      - 別處持有同一個物件參考，值在腳下被換掉
 *      - React 的 reference 沒變 → 畫面不重繪
 */

// ------------------------------------------------------------
// 讓編譯器幫你守住不可變性（進階，但值得做）
// ------------------------------------------------------------

interface StrictFabricRoll {
  readonly _id: string;
  readonly rollNo: string;
  readonly weightKg: number;
  readonly zoneCode: string;
  readonly status: 'IN_STOCK' | 'SHIPPED' | 'HOLD';
}

// ⚠️ 注意這裡是 { ...rolls[0]! } 而不是 rolls[0]!
//    原因見下方那行 @ts-expect-error 的說明 —— 這是我第一版寫錯的地方。
const strictRoll: StrictFabricRoll = { ...rolls[0]! };

// @ts-expect-error readonly 欄位不能指派 —— 就地改動變成編譯期錯誤，不必靠記憶力
strictRoll.zoneCode = 'C-05';

/**
 * 【非常重要的陷阱：@ts-expect-error 只吃掉「型別錯誤」，程式碼照樣執行】
 *
 * 上面那行被 @ts-expect-error 標住，tsc 不報錯，
 * 但編譯出來的 JS 裡 strictRoll.zoneCode = 'C-05' 這行「真的會跑」。
 *
 * 第一版我寫成 const strictRoll = rolls[0]!（同一個物件參考），
 * 結果這行就把 rolls[0].zoneCode 從 'A-01' 改成了 'C-05'，
 * 導致後面 handleMove('R001', 'A-01') 本該回 SAME_ZONE，卻走了成功路徑。
 *
 * 編譯零錯誤、執行結果錯 —— 正是第 2 章 Q3 那一類 bug 的翻版。
 * 這也再次證明：readonly 是編譯期的東西，執行期一點保護都沒有。
 */

// 想改？只能造新的。這就是 readonly 的目的：把規則交給編譯器執行
const strictMoved: StrictFabricRoll = { ...strictRoll, zoneCode: 'C-05' };
console.log(strictMoved.zoneCode);

// ------------------------------------------------------------
// 呼叫端：示範成功 / 失敗兩條路徑
// ------------------------------------------------------------

function handleMove(rollNo: string, toZoneCode: string): string {
  const result = moveRoll(rolls, rollNo, toZoneCode);

  // 成功路徑
  if (result.ok) {
    // ✅ 這裡 TS 知道一定有 value，而且沒有 error 可以誤用
    return `布卷 ${result.value.rollNo} 已移至 ${result.value.zoneCode}`;
  }

  // 失敗路徑：用 code 分辨是哪一種失敗
  const e = result.error;
  switch (e.code) {
    case 'ROLL_NOT_FOUND':
      // ✅ 這個分支只有 rollNo 可用
      return `找不到布卷 ${e.rollNo}`;

    case 'ALREADY_SHIPPED':
      // ✅ 這個分支多了 currentZone
      return `布卷 ${e.rollNo}（位於 ${e.currentZone}）已出貨，不可移動`;

    case 'SAME_ZONE':
      return `布卷 ${e.rollNo} 已經在 ${e.zoneCode}，無需移動`;

    default: {
      // never 窮舉檢查（第 1 章）：
      // 上面每個 case 都處理完後，e 在這裡會被 narrow 成 never。
      // 未來新增一種 code 卻忘了更新這個 switch → 這一行當場編譯錯誤。
      const _never: never = e;
      throw new Error(`未處理的錯誤類型: ${JSON.stringify(_never)}`);
    }
  }
}

console.log(handleMove('R003', 'C-05')); // 成功
console.log(handleMove('R999', 'C-05')); // ROLL_NOT_FOUND
console.log(handleMove('R002', 'C-05')); // ALREADY_SHIPPED
console.log(handleMove('R001', 'A-01')); // SAME_ZONE

// 原陣列沒有被改動 —— 驗證 (b)
console.log(rolls.find((r) => r.rollNo === 'R003')?.zoneCode); // 仍然是 'B-03'

/**
 * 【對應到你的 Express controller】
 *
 *   const result = moveRoll(await Roll.find(), rollNo, toZoneCode);
 *   if (result.ok) return res.json(result.value);
 *   switch (result.error.code) {
 *     case 'ROLL_NOT_FOUND':  return res.status(404).json({ ... });
 *     case 'ALREADY_SHIPPED': return res.status(409).json({ ... });
 *     case 'SAME_ZONE':       return res.status(400).json({ ... });
 *   }
 *
 * 三種錯誤對應三個不同的 HTTP status —— 錯誤型別若只是 string，
 * 這種區分就做不到。這是「為什麼不能用 string」最實際的答案。
 *
 * 分層原則：service 層不決定「怎麼回應」，只誠實說出「失敗的種類」。
 * 同一個 moveRoll 換到前端呼叫，switch 裡就變成跳提示框 / 反白欄位 / 導頁。
 *
 * 【技術錯誤 vs 業務規則錯誤】
 *   DB 斷線、網路逾時  → 非預期，用 try/catch，回 500
 *   已出貨不可移動     → 完全預期，用 Result 回傳，強迫呼叫端處理
 * Result 模式解決的是後者。用 throw 的話呼叫端可以假裝沒看到；
 * 用 Result 的話不檢查 res.ok 就摸不到 res.value。
 */

// ============================================================
// Q6 — 觀念題
// ============================================================

/**
 * ------------------------------------------------------------
 * (a) function toArray<T>(value: any): T[] { return [value]; }
 * ------------------------------------------------------------
 * 問題：value 標成 any，T 和參數之間的關聯被切斷。
 *      數一下 T 出現幾次 —— 只有回傳值那一次。
 *      坑 2：型別參數只出現一次 = 它沒有連結任何東西 = 不需要泛型。
 *
 * 後果比「沒用」更嚴重，因為 T 沒有東西可推論，
 * 呼叫端可以任意指定，而 TS 會照單全收：
 *
 *   const nums = toArray<number>('這是字串');   // nums 的型別是 number[]
 *   nums[0].toFixed(2);                        // ✅ 編譯通過
 *                                              // 💥 執行期爆炸：字串沒有 toFixed
 *
 * → TS 對你撒了謊，而且是你自己授權它撒的。
 *   這比不寫型別更危險：不寫型別你會保持警覺，寫了錯的型別你會放心地信任它。
 */
function toArray<T>(value: T): T[] {
  return [value];
}
// T 從參數推論出來，呼叫端沒有說謊的餘地
const strs = toArray('這是字串'); // string[]
// @ts-expect-error 不能硬指定成 number
const liar = toArray<number>('這是字串');
console.log(strs, liar);

/**
 * ------------------------------------------------------------
 * (b) function pick<T>(obj: T, keys: string[]): any
 * ------------------------------------------------------------
 * 三個地方漏掉型別資訊：
 *   1. obj: T —— T 沒有約束，TS 不知道它是不是物件
 *   2. keys: string[] —— 跟 T 完全沒有關聯，所以 key 打錯字不會報錯
 *   3. ): any —— 回傳值放棄一切，呼叫端拿到的東西什麼都能做，打錯字也不會被抓
 *
 * 修正：用 K extends keyof T 把 keys 和 T 鎖在一起，
 *      回傳 Pick<T, K>（第 5 章的內建工具型別，「從 T 挑出 K 這些欄位」）。
 */
function pick<T extends object, K extends keyof T>(
  obj: T,
  keys: readonly K[],
): Pick<T, K> {
  // 這個 as 可以接受：TS 對「逐步組出一個物件」的推論能力有限。
  // 重點是「簽名誠實」，內部的建構過程需要一點斷言是務實的妥協。
  const result = {} as Pick<T, K>;
  for (const k of keys) {
    result[k] = obj[k];
  }
  return result;
}

const roll0 = rolls[0]!;
const brief = pick(roll0, ['rollNo', 'weightKg']); // { rollNo: string; weightKg: number }
console.log(brief.rollNo, brief.weightKg);

// @ts-expect-error 'zoneCode' 沒被挑進來，結果型別裡就沒有這個欄位
console.log(brief.zoneCode);

// @ts-expect-error key 打錯字，編譯期就抓到
pick(roll0, ['rollNoo']);

/**
 * ------------------------------------------------------------
 * (c) function formatWeight<T extends number>(weight: T): string
 * ------------------------------------------------------------
 * 問題：泛型完全多餘。T 只出現一次（參數），回傳值是固定的 string，
 *      沒有任何東西需要「被連結」。同樣是坑 2。
 *
 * 而且不只是多餘 —— 它還有害：
 *   formatWeight(25.5) 會把 T 推論成字面量型別 25.5，而不是 number。
 *   這個資訊在函式內完全沒被用到（回傳 string），
 *   純粹浪費推論成本、讓 IDE 的 hover 提示變難讀。
 *
 * 判斷準則：型別參數出現 < 2 次就拿掉。
 */
function formatWeight(weight: number): string {
  return `${weight.toFixed(2)} kg`;
}
console.log(formatWeight(25.5));

// ============================================================
// 本章回顧
// ============================================================

/**
 * 1. 泛型 = 型別層級的參數，用來「連結兩個以上的位置」
 * 2. 出現 < 2 次就不要用泛型（坑 2，Q6 的 a 和 c 都是這個）
 * 3. 約束限制「能傳什麼」，泛型保留「傳進來的是什麼」—— 兩者同時存在才有價值
 * 4. keyof T 取的是「T 本身的 key」；想取元素的 key，T 要綁定元素（Q2 的教訓）
 * 5. 約束要寫進「你實作時真正需要的性質」：
 *      要當 key → Record<K, string>
 *      要加總   → Record<K, number>
 * 6. readonly 參數 = 用型別宣告「我沒有副作用」
 * 7. 可辨識聯合 = 共同欄位 + 字面量型別 + 值互不重複
 * 8. Result<T, E> 把業務規則失敗變成「正常回傳值」，強迫呼叫端面對
 * 9. never 窮舉檢查 = 替未來的自己預先埋下的編譯期陷阱
 */

export {};
