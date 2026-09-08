/**
 * 第 1 章 練習題 — 參考解答與檢討
 *
 * 執行： npx tsx src/01-exercise-answer.ts
 */

// ── Q1 ✅ 完全正確 ─────────────────────────────
export function totalWeight(weightPerRoll: number, rollCount: number): number {
  return weightPerRoll * rollCount;
}

// ── Q2 ⚠️ 型別對，但有執行期 bug ────────────────

// 你的寫法：三元判斷 find 的結果是不是 truthy
export function findMachine_yours(machines: number[], no: number): number | null {
  return machines.find((m) => m === no) ? no : null;
}
// 問題：找到的值是 0 時，0 是 falsy → 回傳 null（但 0 明明存在！）

// 寫法 A：最推薦 —— find 本來就回傳 T | undefined，直接照實描述
export function findMachine(machines: number[], no: number): number | undefined {
  return machines.find((m) => m === no);
}

// 寫法 B：如果團隊規定一定要用 null，用 ?? 而不是 ?:
export function findMachineOrNull(machines: number[], no: number): number | null {
  return machines.find((m) => m === no) ?? null;
}
// ?? (nullish coalescing) 只在左邊是 null / undefined 時才取右邊，
// 0、''、false 都會原樣通過 —— 這是 ?: 和 || 做不到的。

// ── Q3 ✅ 完全正確 ─────────────────────────────
type WarehouseZone = 'A' | 'B' | 'C' | 'D';

export function zoneName(zone: WarehouseZone): string {
  switch (zone) {
    case 'A': return 'A區';
    case 'B': return 'B區';
    case 'C': return 'C區';
    case 'D': return 'D區';
  }
}
// 進階：加上 default + never，未來新增 'E' 時編譯期就會提醒你來補 case
export function zoneNameExhaustive(zone: WarehouseZone): string {
  switch (zone) {
    case 'A': return 'A區';
    case 'B': return 'B區';
    case 'C': return 'C區';
    case 'D': return 'D區';
    default: {
      const _never: never = zone;   // 若 union 新增成員，這行會編譯失敗
      return _never;
    }
  }
}

// ── Q4 ❌ 這題沒做 —— 這是本章最重要的一題 ────────
const payload: unknown = JSON.parse('{"kg": 42}');

// 錯誤示範：payload.kg  → 'payload' is of type 'unknown'
// 正確做法：在使用前先「縮小型別 (narrowing)」
if (
  typeof payload === 'object' &&
  payload !== null &&
  'kg' in payload &&
  typeof payload.kg === 'number'
) {
  console.log('kg =', payload.kg);   // 到這裡 TS 已經知道 payload.kg 是 number
} else {
  console.error('payload 格式不符預期');
}

// ── 執行區 ────────────────────────────────────
console.log('Q1 總重:', totalWeight(25.5, 4));
console.log('Q2 你的寫法，找 0 →', findMachine_yours([0, 1, 2], 0), '（應該是 0，卻是 null）');
console.log('Q2 寫法 A，找 0 →', findMachine([0, 1, 2], 0));
console.log('Q2 寫法 B，找 0 →', findMachineOrNull([0, 1, 2], 0));
console.log('Q3 儲位:', zoneName('C'), zoneNameExhaustive('D'));
