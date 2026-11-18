// ส่วนเล็ก ๆ ของแบบ ปปง. ที่ไม่ต้องใช้ pdf-lib — แยกไว้ให้หน้าเว็บโหลด pdf-lib เฉพาะตอนสร้าง PDF

/** วันที่จากชิปบัตรประชาชน "YYYYMMDD" (พ.ศ.) → "YYYY-MM-DD" (ค.ศ.) ถ้าไม่ถูกต้องคืน "" */
export function beDateToIso(s: string | undefined | null): string {
  const m = /^(\d{4})(\d{2})(\d{2})$/.exec((s ?? "").trim());
  if (!m) return "";
  const y = Number(m[1]) - 543, mo = Number(m[2]), d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || y < 1900) return "";
  return `${y}-${m[2]}-${m[3]}`;
}

/** เปิด PDF ในแท็บใหม่ ถ้าป๊อปอัปถูกบล็อกจะดาวน์โหลดแทน */
export function openPdfBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");
  if (!win) {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** เหตุอันควรสงสัย (แบบ ปปง.1-05-10 ส่วนที่ 4) */
export type StrReason = "complex" | "predicate" | "evade" | "large" | "no_economic" | "other";

export const STR_REASONS: { value: StrReason; label: string }[] = [
  { value: "complex", label: "ธุรกรรมที่มีความซับซ้อนผิดไปจากการทำธุรกรรมในลักษณะเดียวกันที่ทำกันอยู่ตามปกติ" },
  { value: "predicate", label: "ธุรกรรมที่เกี่ยวข้องหรืออาจเกี่ยวข้องกับการกระทำความผิดมูลฐาน" },
  { value: "evade", label: "ธุรกรรมที่มีเหตุอันควรเชื่อได้ว่ากระทำขึ้นเพื่อหลีกเลี่ยงมิให้ต้องตกอยู่ภายใต้บังคับแห่งกฎหมาย" },
  { value: "large", label: "ธุรกรรมที่มีขนาดใหญ่ผิดปรกติ" },
  { value: "no_economic", label: "ธุรกรรมที่ขาดความเป็นไปได้ในเชิงเศรษฐกิจ" },
  { value: "other", label: "อื่น ๆ (ระบุ)" },
];
