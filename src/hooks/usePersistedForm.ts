import { useState, useEffect, useCallback } from "react";

/**
 * Hook ที่บันทึก form state ลง localStorage อัตโนมัติ
 * ป้องกันข้อมูลหายตอนเผลอ refresh / กด back
 *
 * @param key  คีย์ใน localStorage (ควรไม่ซ้ำกับ form อื่น)
 * @param initial  ค่าเริ่มต้นของ form
 *
 * @returns [state, setState, clear]
 *  - state: ค่าปัจจุบัน
 *  - setState: setter (เหมือน useState)
 *  - clear: ลบทั้ง state และ localStorage entry
 */
export function usePersistedForm<T extends object>(
  key: string,
  initial: T
): readonly [T, React.Dispatch<React.SetStateAction<T>>, () => void] {
  const storageKey = `form:${key}`;

  const [state, setState] = useState<T>(() => {
    if (typeof window === "undefined") return initial;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return { ...initial, ...JSON.parse(saved) } as T;
    } catch {
      // ignore corrupted JSON
    }
    return initial;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      // ignore quota errors
    }
  }, [storageKey, state]);

  const clear = useCallback(() => {
    setState(initial);
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
  }, [storageKey, initial]);

  return [state, setState, clear] as const;
}
