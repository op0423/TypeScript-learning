/**
 * 第 1 章 練習題
 *
 * 做法：把每題的 TODO 補完，然後跑 `npm run check`。
 * 目標是「一個型別錯誤都沒有」。改完貼給我看，我幫你檢討。
 */

// ── Q1 ────────────────────────────────────────
// 下面是你平常會寫的 JS。請幫它加上參數與回傳值的型別註記。
// 提示：weightPerRoll 是數字，rollCount 是數字，回傳總重（數字）
export function totalWeight(weightPerRoll:number, rollCount:number): number {
  return weightPerRoll * rollCount;
}

// ── Q2 ────────────────────────────────────────
// 這個函式可能找不到東西。請用 union 型別正確描述回傳值，
// 不要用 any，也不要漏掉「找不到」的情況。
export function findMachine(machines:number[], no:number):number | undefined {
  return machines.find((m) => m === no);
}
export function findMachine1(machines:number[], no:number):number | null{
  return machines.find((m) => m === no)??null;
}

// ── Q3 ────────────────────────────────────────
// 定義一個 union 型別 WarehouseZone，只允許 'A' | 'B' | 'C' | 'D'，
// 然後寫一個函式 zoneName(zone) 回傳中文名稱（A區/B區/C區/D區）。
// 要求：switch 要寫完整，讓 TS 不會抱怨「沒有回傳值」。
// TODO: 在這裡寫
type WarehouseZone="A" | "B" | "C" | "D"
export function zoneName(zone:WarehouseZone):string{
  switch(zone){
    case "A": return "A區"
    case "B": return "B區"
    case "C": return "C區"
    case "D": return "D區"
  }
}

// ── Q4 ────────────────────────────────────────
// 下面這行故意用了 any。請改成 unknown，並補上必要的檢查，
// 讓 console.log 印出 kg 的數值而不報錯。

const payload: unknown = JSON.parse('{"kg": 42}');
if( payload !==null && typeof payload === "object" && "kg" in payload && typeof payload.kg==="number"){
  console.log("kg=",payload.kg)
}else{
  console.error("payload 格式錯誤")
}



// ── Q5（思考題，用註解回答即可）────────────────
// 為什麼 `const x = 'A'` 推論出的型別是 'A' 而不是 string？
// 這件事在 Q3 的 union 型別上會造成什麼影響？
// 答：因為const 是屬於無法重新賦值的型態,如果今天改成let x ="A"那推論出的型態就會是string,在Q3若是輸入ABCD以外的input則會跳型態錯誤
