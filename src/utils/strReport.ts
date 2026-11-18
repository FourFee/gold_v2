// สร้างแบบ ปปง.1-05-10 (รายงานการทำธุรกรรมที่มีเหตุอันควรสงสัย) โดยเติมข้อมูลลงบนไฟล์ฟอร์มต้นฉบับ
import { PDFDocument } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import {
  Filler, FONT_URL, STR_TEMPLATE_URL, THAI_MONTHS,
  bahtText, fmtMoney, loadAsset, pad2, parseThaiAddress, toBuddhistYear,
  type AmlIdType, type AmlShopInfo, type BuildOptions,
} from "./amlReport";

import type { StrReason } from "./amlShared";
export { STR_REASONS, type StrReason } from "./amlShared";

export interface StrReportInput {
  shop: AmlShopInfo;
  date: Date;                 // วันที่ทำธุรกรรม
  reportDate?: Date;
  sequenceNo?: string;
  sheetCount?: number;

  firstname: string;
  lastname: string;
  nationality: string;
  address: string;
  phone: string;
  occupation: string;

  idType: AmlIdType;
  idTypeOther?: string;
  idNumber: string;
  idIssuedBy?: string;
  idIssueDate?: Date | null;
  idExpiryDate?: Date | null;
  idExpiryLifetime?: boolean;

  amount: number;             // มูลค่าธุรกรรม (บาท)
  beneficiary?: string;
  purpose: string;

  reasons: StrReason[];
  reasonOther?: string;
  facts: string;              // ข้อเท็จจริงเกี่ยวกับเหตุอันควรสงสัย
}

/* ───────────── พิกัดบนฟอร์ม (pt, y จากขอบบน) ───────────── */

const NUM_TOP = 54.8, NUM_H = 11.8, NUM_W = 9.4;
const FORM_CODE_BOXES = [219.9, 228.8];
const OPERATOR_BOXES = [243.6, 253.6, 263.5, 273.4, 283.2, 293.1, 303.0, 312.9, 322.8, 332.7, 342.5, 352.5, 362.4, 371.2];
const BRANCH_BOXES = [386.1, 395.0, 403.9, 412.9, 421.8];
const YEAR_BOXES = [439.5, 448.5, 457.4, 466.2];
const MONTH_BOXES = [481.1, 490.0];
const SEQ_BOXES = [504.8, 514.7, 524.6, 534.5, 544.4, 554.3];

const ID_TYPE_GLYPH: Record<AmlIdType, { x: number; top: number }> = {
  citizen:  { x: 136.9, top: 303.8 },
  passport: { x: 339.7, top: 303.8 },
  alien:    { x: 392.3, top: 303.8 },
  other:    { x: 43.6,  top: 317.1 },
};
const ID_BOXES = [169.1, 180.5, 192.1, 203.6, 214.6, 226.0, 237.6, 249.1, 260.6, 272.1, 283.6, 295.2, 306.8];

// ส่วนที่ 4 (หน้า 2): ช่องติ๊กตัวอักษรขนาด 9pt
const REASON_GLYPH: Record<StrReason, { x: number; top: number }> = {
  complex:     { x: 43.6,  top: 109.8 },
  predicate:   { x: 354.1, top: 109.8 },
  evade:       { x: 43.6,  top: 123.2 },
  large:       { x: 354.1, top: 123.2 },
  no_economic: { x: 43.6,  top: 136.1 },
  other:       { x: 354.1, top: 136.1 },
};
const FACT_LINES = [183.1, 195.0, 206.8, 218.7, 230.2, 242.1, 254.0, 265.9, 277.4, 289.3, 301.2, 313.1];

export async function buildStrReportPdf(input: StrReportInput, opts: BuildOptions): Promise<{ bytes: Uint8Array; factsFit: boolean }> {
  const pdf = await PDFDocument.load(opts.templateBytes);
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(opts.fontBytes, { subset: false });
  const fk = (fontkit as any).create(
    opts.fontBytes instanceof Uint8Array ? opts.fontBytes : new Uint8Array(opts.fontBytes),
  );
  const f = new Filler(pdf.getPage(0), font, fk);
  const f2 = new Filler(pdf.getPage(1), font, fk);

  const tx = input.date;
  const rd = input.reportDate ?? new Date();
  const s = input.shop;

  /* ── เลขที่รายงาน ── */
  f.boxes("10", FORM_CODE_BOXES, NUM_W, NUM_TOP, NUM_H);
  f.boxes(s.operatorCode || "", OPERATOR_BOXES, NUM_W, NUM_TOP, NUM_H);
  f.boxes(s.branchCode || "", BRANCH_BOXES, NUM_W, NUM_TOP, NUM_H);
  f.boxes(String(toBuddhistYear(tx)), YEAR_BOXES, NUM_W, NUM_TOP, NUM_H);
  f.boxes(pad2(tx.getMonth() + 1), MONTH_BOXES, NUM_W, NUM_TOP, NUM_H);
  f.boxes(input.sequenceNo ?? "", SEQ_BOXES, NUM_W, NUM_TOP, NUM_H);

  /* ── หัวฟอร์ม ── */
  f.text(s.name, 96, 363, 110.9);
  f.text(s.phone, 389, 578, 110.9);
  f.check(44.1, 125.0, 6.4, 8.9);                         // รายงานฉบับหลัก
  f.text(String(input.sheetCount ?? 2), 468, 512, 137.9); // ฟอร์มนี้มี 2 หน้า

  /* ── ส่วนที่ 1 ผู้ทำธุรกรรม ── */
  f.text(input.firstname, 114, 195, 177.2);
  f.text(input.lastname, 327, 423, 177.2);
  f.text(input.nationality, 445, 574, 177.2);
  f.checkGlyph(43.6, 179.5);                              // ทำธุรกรรมด้วยตนเอง

  const addr = parseThaiAddress(input.address);
  if (addr) {
    f.text(addr.house, 70, 239, 217.5);
    f.text(addr.tambon, 254, 319, 217.5);
    f.text(addr.amphoe, 338, 403, 217.5);
    f.text(addr.province, 421, 486, 217.5);
    f.text(addr.postal, 523, 575, 217.5);
  } else {
    f.text(input.address, 70, 239, 217.5, 9, 5.5);
  }
  f.text("ไทย", 65, 205, 231.6);
  f.text(input.phone, 244, 353, 231.6);

  if (input.occupation.trim()) f.text(input.occupation, 74, 257, 245.6);
  else f.checkGlyph(181.9, 262.7);                        // ไม่มีข้อมูลในข้อ 1.3
  f.checkGlyph(508.3, 290.4);                             // ไม่มีข้อมูลในข้อ 1.4

  const g = ID_TYPE_GLYPH[input.idType];
  f.checkGlyph(g.x, g.top);
  if (input.idType === "other") f.text(input.idTypeOther, 94, 146, 328.1);
  f.boxes(input.idNumber, ID_BOXES, 11.5, 318.0, 9, 9.5);
  f.text(input.idIssuedBy, 72, 181, 342.5);
  if (input.idIssueDate) {
    const d = input.idIssueDate;
    f.text(pad2(d.getDate()), 193, 209, 342.5);
    f.text(pad2(d.getMonth() + 1), 212, 230, 342.5);
    f.text(String(toBuddhistYear(d)), 231, 256, 342.5);
  }
  if (input.idExpiryLifetime) {
    f.text("ตลอดชีพ", 293, 356, 342.5);
  } else if (input.idExpiryDate) {
    const d = input.idExpiryDate;
    f.text(pad2(d.getDate()), 293, 309, 342.5);
    f.text(pad2(d.getMonth() + 1), 312, 330, 342.5);
    f.text(String(toBuddhistYear(d)), 331, 356, 342.5);
  }

  /* ── ส่วนที่ 3 ข้อเท็จจริงเกี่ยวกับการทำธุรกรรม ── */
  f.text(String(tx.getDate()), 392, 437, 564.4);
  f.text(THAI_MONTHS[tx.getMonth()], 455, 515, 564.4);
  f.text(String(toBuddhistYear(tx)), 528, 570, 564.4);
  f.check(44.7, 597.0, 5.0, 6.2);                         // 3.1 ข้อ 2 การค้าอัญมณี/ทองคำ
  f.text(fmtMoney(input.amount), 112, 227, 662.4);
  // ฟอร์มพิมพ์คำว่า "บาท)" ต่อท้ายไว้แล้ว — จำนวนเต็มบาทจึงตัด "บาทถ้วน" ออก
  const words = bahtText(input.amount);
  f.text(words.endsWith("บาทถ้วน") ? words.slice(0, -"บาทถ้วน".length) : words, 292, 550, 662.4, 9.5, 6);
  f.text(input.beneficiary, 162, 423, 689.0);
  f.text(input.purpose, 139, 423, 702.0);

  /* ── ส่วนที่ 4 เหตุอันควรสงสัย (หน้า 2) ── */
  for (const r of input.reasons) {
    const b = REASON_GLYPH[r];
    f2.checkGlyph9(b.x, b.top);
  }
  if (input.reasons.includes("other")) f2.text(input.reasonOther, 383, 569, 146.2);
  const factsFit = f2.paragraph(input.facts.trim(), 44, 568, FACT_LINES, 9.5, 7.5);

  /* ── ส่วนที่ 5 วันที่รายงาน ── */
  f2.textRight(`${rd.getDate()} ${THAI_MONTHS[rd.getMonth()]} ${toBuddhistYear(rd)}`, 578, 352.0, 9.5);

  return { bytes: await pdf.save(), factsFit };
}

/** สร้างไฟล์ PDF แบบ ปปง.1-05-10 */
export async function makeStrReportBlob(input: StrReportInput): Promise<{ blob: Blob; factsFit: boolean }> {
  const { bytes, factsFit } = await buildStrReportPdf(input, {
    templateBytes: await loadAsset(STR_TEMPLATE_URL),
    fontBytes: await loadAsset(FONT_URL),
  });
  return { blob: new Blob([new Uint8Array(bytes)], { type: "application/pdf" }), factsFit };
}

export function strFileName(d: Date) {
  return `ปปง-1-05-10_${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}.pdf`;
}
