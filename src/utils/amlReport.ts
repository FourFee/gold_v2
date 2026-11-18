// สร้างแบบ ปปง.1-05-2 (รายงานธุรกรรมที่ใช้เงินสด) โดยเติมข้อมูลลงบนไฟล์ฟอร์มต้นฉบับ
// ต้องติดตั้ง: npm i pdf-lib @pdf-lib/fontkit
import {
  PDFDocument, PDFFont, PDFName, PDFPage, PDFHexString, rgb,
  pushGraphicsState, popGraphicsState, setFillingColor,
  beginText, endText, setFontAndSize, setTextMatrix, showText,
} from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

/* ───────────── ชนิดข้อมูล ───────────── */

export type AmlIdType = "citizen" | "passport" | "alien" | "other";

export interface AmlShopInfo {
  name: string;          // ชื่อผู้ประกอบอาชีพ
  phone: string;
  operatorCode: string;  // รหัสผู้ประกอบอาชีพ ตามที่ ปปง. กำหนด (ช่อง 14 หลัก) ว่างได้
  branchCode: string;    // รหัสสาขา 5 หลัก ว่างได้
}

export interface AmlReportInput {
  shop: AmlShopInfo;
  /** "buy" = ร้านขายออกให้ลูกค้า, "sell" = ร้านซื้อเข้าจากลูกค้า (ตรงกับ mode ในแอป) */
  mode: "buy" | "sell";
  date: Date;                 // วันที่ทำธุรกรรม
  reportDate?: Date;          // วันที่รายงาน (ค่าเริ่มต้น = วันนี้)
  sequenceNo?: string;        // ลำดับที่ของธุรกรรม (6 หลัก) ว่างได้
  sheetCount?: number;        // รวมเอกสารจำนวนทั้งสิ้น (ค่าเริ่มต้น 1)

  firstname: string;
  lastname: string;
  nationality: string;
  address: string;
  phone: string;
  occupation: string;

  idType: AmlIdType;
  idTypeOther?: string;       // ใช้เมื่อ idType = "other"
  idNumber: string;
  idIssuedBy?: string;
  idIssueDate?: Date | null;
  idExpiryDate?: Date | null;
  idExpiryLifetime?: boolean; // บัตรตลอดชีพ → เขียน "ตลอดชีพ" แทนวันหมดอายุ

  weightBaht: number;         // น้ำหนักทอง (บาทน้ำหนัก)
  amount: number;             // จำนวนเงินสด (บาท)
  beneficiary?: string;       // ผู้รับประโยชน์ (ถ้ามี)
  purpose: string;            // วัตถุประสงค์
}

/* ───────────── ค่าคงที่ของฟอร์ม (หน่วย pt, แกน y วัดจากขอบบน) ───────────── */

const PAGE_H = 792;
const TEXT_COLOR = rgb(0.05, 0.1, 0.45); // น้ำเงินเข้ม ให้แยกออกจากตัวพิมพ์ของฟอร์ม

// เลื่อนเส้นฐานของตัวอักษรให้อยู่เหนือเส้นประ (bottom = ขอบล่างของบรรทัดในฟอร์ม)
const baseline = (bottom: number) => bottom - 3.2;

const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

// ช่องสี่เหลี่ยม (glyph ☐) ของแต่ละหลักฐานในข้อ 1.5 : x0, top, ขนาด
const ID_TYPE_BOX: Record<AmlIdType, { x: number; top: number }> = {
  citizen:  { x: 136.9, top: 282.6 },
  passport: { x: 339.7, top: 282.6 },
  alien:    { x: 392.3, top: 282.6 },
  other:    { x: 43.6,  top: 296.0 },
};

// ช่องเลขที่หลักฐาน 13 ช่อง (ข้อ 1.5)
const ID_BOXES = [169.1, 180.5, 192.1, 203.6, 214.6, 226.0, 237.6, 249.1, 260.6, 272.1, 283.6, 295.2, 306.8]
  .map((x0) => ({ x0, w: 11.5, top: 296.4, h: 9 }));

// ช่องเลขที่รายงานด้านบน
const FORM_CODE_BOXES = [219.6, 228.4]; // แบบรายงาน 2 ช่อง
const OPERATOR_BOXES = [243.2, 253.2, 263.0, 272.9, 282.8, 292.7, 302.6, 312.4, 322.3, 332.2, 342.1, 351.9, 361.8, 370.7]; // 14 ช่อง
const BRANCH_BOXES = [385.6, 394.4, 403.4, 412.2, 421.1];
const YEAR_BOXES = [438.9, 447.8, 456.7, 465.6];
const MONTH_BOXES = [480.4, 489.3];
const SEQ_BOXES = [504.1, 514.0, 523.9, 533.8, 543.6, 553.5];
const NUM_BOX_TOP = 48.5;
const NUM_BOX_H = 14.4;
const NUM_BOX_W = 9;

/* ───────────── ตัวช่วย ───────────── */

export function toBuddhistYear(d: Date) {
  return d.getFullYear() + 543;
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/** วันที่จากชิปบัตรประชาชน "YYYYMMDD" (พ.ศ.) → "YYYY-MM-DD" (ค.ศ.) ถ้าไม่ถูกต้องคืน "" */
export function beDateToIso(s: string | undefined | null): string {
  const m = /^(\d{4})(\d{2})(\d{2})$/.exec((s ?? "").trim());
  if (!m) return "";
  const y = Number(m[1]) - 543, mo = Number(m[2]), d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || y < 1900) return "";
  return `${y}-${m[2]}-${m[3]}`;
}

/** แปลงตัวเลขเป็นคำอ่านไทย เช่น 2500000 → สองล้านห้าแสนบาทถ้วน */
export function bahtText(value: number): string {
  const digits = ["ศูนย์", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
  const places = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน"];

  const readBlock = (s: string): string => {
    let out = "";
    const len = s.length;
    for (let i = 0; i < len; i++) {
      const d = Number(s[i]);
      const pos = len - i - 1;
      if (d === 0) continue;
      if (pos === 1) {
        out += (d === 1 ? "" : d === 2 ? "ยี่" : digits[d]) + places[pos];
      } else if (pos === 0 && d === 1 && len > 1) {
        out += "เอ็ด"; // เช่น 11 → สิบเอ็ด, 101 → หนึ่งร้อยเอ็ด
      } else {
        out += digits[d] + places[pos];
      }
    }
    return out;
  };

  const readInt = (s: string): string => {
    s = s.replace(/^0+(?=\d)/, "");
    if (s === "0") return digits[0];
    // แบ่งทีละ 6 หลักตามหลักล้าน
    const chunks: string[] = [];
    while (s.length > 6) {
      chunks.unshift(s.slice(-6));
      s = s.slice(0, -6);
    }
    chunks.unshift(s);
    return chunks
      .map((c, i) => {
        const txt = readBlock(c);
        if (!txt) return i < chunks.length - 1 ? "ล้าน" : "";
        return txt + (i < chunks.length - 1 ? "ล้าน" : "");
      })
      .join("");
  };

  if (!isFinite(value)) return "";
  const neg = value < 0;
  const fixed = Math.abs(value).toFixed(2);
  const [intPart, satang] = fixed.split(".");
  let text = readInt(intPart) + "บาท";
  text += satang === "00" ? "ถ้วน" : readInt(satang) + "สตางค์";
  return (neg ? "ลบ" : "") + text;
}

const fmtMoney = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtWeight = (n: number) => `${Number(n.toFixed(4))} บาท`;

/** แยกที่อยู่ไทยแบบบัตรประชาชนเป็นส่วน ๆ ถ้าแยกไม่ได้จะคืน null */
export function parseThaiAddress(addr: string) {
  const text = (addr || "").replace(/\s+/g, " ").trim();
  if (!text) return null;

  const postal = text.match(/(?:^|\s)(\d{5})(?:\s|$)/)?.[1] ?? "";
  const tambon = text.match(/(?:ตำบล|แขวง|ต\.)\s*([^\s]+)/)?.[1] ?? "";
  const amphoe = text.match(/(?:อำเภอ|เขต|อ\.)\s*([^\s]+)/)?.[1] ?? "";
  let province = text.match(/(?:จังหวัด|จ\.)\s*([^\s]+)/)?.[1] ?? "";
  if (!province && /กรุงเทพ/.test(text)) province = "กรุงเทพมหานคร";

  if (!tambon || !amphoe) return null;

  const cut = text.search(/(?:ตำบล|แขวง|ต\.)\s*[^\s]+/);
  const house = (cut > 0 ? text.slice(0, cut) : text).trim();
  return { house, tambon, amphoe, province, postal };
}

/* ───────────── ตัวเติมข้อมูล ───────────── */

/**
 * วาดข้อความไทยทีละ glyph พร้อมตำแหน่งจาก GPOS ของฟอนต์
 * (pdf-lib วาดข้อความโดยไม่ใช้ GPOS ทำให้สระบน + วรรณยุกต์ เช่น "ที่" "ปี้" ผิดตำแหน่งหรือหาย)
 */
class ThaiText {
  private fontKey?: PDFName;
  constructor(private page: PDFPage, private font: PDFFont, private fk: any) {}

  private shape(text: string) {
    const run = this.fk.layout(text);
    const hex: string = (this.font.encodeText(text) as unknown as { value: string }).value; // รหัส glyph 4 หลักฐานสิบหก ต่อ 1 glyph
    const codes = hex.match(/.{4}/g) ?? [];
    if (codes.length !== run.glyphs.length) return null;
    return { run, codes };
  }

  width(text: string, size: number): number {
    const sh = this.shape(text);
    if (!sh) return this.font.widthOfTextAtSize(text, size);
    const total = sh.run.positions.reduce((a: number, p: any) => a + p.xAdvance, 0);
    return (total * size) / this.fk.unitsPerEm;
  }

  draw(text: string, x: number, y: number, size: number, color = TEXT_COLOR) {
    const sh = this.shape(text);
    if (!sh) {
      this.page.drawText(text, { x, y, size, font: this.font, color });
      return;
    }
    // ลงทะเบียนฟอนต์ในหน้า (ครั้งเดียวต่อหน้า)
    this.fontKey ??= this.page.node.newFontDictionary(this.font.name, this.font.ref);
    const fontKey = this.fontKey;
    const k = size / this.fk.unitsPerEm;
    const ops = [pushGraphicsState(), setFillingColor(color), beginText(), setFontAndSize(fontKey, size)];
    let pen = x;
    sh.run.positions.forEach((pos: any, i: number) => {
      ops.push(
        setTextMatrix(1, 0, 0, 1, pen + pos.xOffset * k, y + pos.yOffset * k),
        showText(PDFHexString.of(sh.codes[i])),
      );
      pen += pos.xAdvance * k;
    });
    ops.push(endText(), popGraphicsState());
    this.page.pushOperators(...ops);
  }
}

class Filler {
  private t: ThaiText;
  constructor(private page: PDFPage, font: PDFFont, fk: any) {
    this.t = new ThaiText(page, font, fk);
  }

  /** เขียนข้อความในช่องประ [x0, x1] บนบรรทัดที่ขอบล่าง = bottom (ย่อขนาดอัตโนมัติถ้ายาวเกิน) */
  text(value: string | undefined | null, x0: number, x1: number, bottom: number, size = 9.5, minSize = 6) {
    const s = (value ?? "").toString().trim();
    if (!s) return;
    const maxW = x1 - x0 - 2;
    let fs = size;
    while (fs > minSize && this.t.width(s, fs) > maxW) fs -= 0.25;
    this.t.draw(s, x0 + 1, PAGE_H - baseline(bottom), fs);
  }

  /** เขียนชิดขวา */
  textRight(value: string, xRight: number, bottom: number, size = 9.5) {
    const s = value.trim();
    if (!s) return;
    this.t.draw(s, xRight - this.t.width(s, size), PAGE_H - baseline(bottom), size);
  }

  /** เครื่องหมายถูกในช่องสี่เหลี่ยมที่เห็นจริง (x, top = มุมซ้ายบนของเส้นกรอบ, w/h = ขนาดกรอบ) */
  check(x: number, top: number, w = 7.3, h = 7.3) {
    const p1 = { x: x + w * 0.18, y: PAGE_H - (top + h * 0.55) };
    const p2 = { x: x + w * 0.42, y: PAGE_H - (top + h * 0.9) };
    const p3 = { x: x + w * 1.05, y: PAGE_H - (top - h * 0.12) };
    const opt = { thickness: 1.1, color: TEXT_COLOR };
    this.page.drawLine({ start: p1, end: p2, ...opt });
    this.page.drawLine({ start: p2, end: p3, ...opt });
  }

  /** ช่องติ๊กแบบตัวอักษร ☐ ในฟอร์ม (x0, top = มุมกรอบตัวอักษร): กรอบที่เห็นจริงขยับเข้ามา 0.8 / 0.7 */
  checkGlyph(x0: number, top: number) {
    this.check(x0 + 0.8, top + 0.7, 7.2, 7.2);
  }

  /** ใส่ตัวอักษรทีละตัวกลางช่อง */
  boxes(value: string, xs: number[], w: number, top: number, h: number, size = 10) {
    const chars = Array.from(value.replace(/\s+/g, ""));
    chars.slice(0, xs.length).forEach((ch, i) => {
      const cw = this.t.width(ch, size);
      this.t.draw(ch, xs[i] + (w - cw) / 2, PAGE_H - (top + h - 3.2), size);
    });
  }
}

export interface BuildOptions {
  templateBytes: ArrayBuffer | Uint8Array;
  fontBytes: ArrayBuffer | Uint8Array;
}

export async function buildAmlReportPdf(input: AmlReportInput, opts: BuildOptions): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(opts.templateBytes);
  pdf.registerFontkit(fontkit);
  // ต้องใช้ subset:false — ถ้า subset ตัวอักษรกลุ่มสระ/วรรณยุกต์ที่ฟอนต์สลับรูปให้ (เช่น uni0E48.small) จะหายไป
  const font = await pdf.embedFont(opts.fontBytes, { subset: false });
  const page = pdf.getPage(0);
  const fk = (fontkit as any).create(
    opts.fontBytes instanceof Uint8Array ? opts.fontBytes : new Uint8Array(opts.fontBytes),
  );
  const f = new Filler(page, font, fk);

  const txDate = input.date;
  const reportDate = input.reportDate ?? new Date();
  const s = input.shop;

  /* ── เลขที่รายงาน ── */
  f.boxes("02", FORM_CODE_BOXES, NUM_BOX_W, NUM_BOX_TOP, NUM_BOX_H);
  f.boxes(s.operatorCode || "", OPERATOR_BOXES, NUM_BOX_W, NUM_BOX_TOP, NUM_BOX_H);
  f.boxes(s.branchCode || "", BRANCH_BOXES, NUM_BOX_W, NUM_BOX_TOP, NUM_BOX_H);
  f.boxes(String(toBuddhistYear(txDate)), YEAR_BOXES, NUM_BOX_W, NUM_BOX_TOP, NUM_BOX_H);
  f.boxes(pad2(txDate.getMonth() + 1), MONTH_BOXES, NUM_BOX_W, NUM_BOX_TOP, NUM_BOX_H);
  f.boxes(input.sequenceNo ?? "", SEQ_BOXES, NUM_BOX_W, NUM_BOX_TOP, NUM_BOX_H);

  /* ── หัวฟอร์ม ── */
  f.text(s.name, 96, 363, 94.7);
  f.text(s.phone, 389, 574, 94.7);
  f.check(43.3, 110.5);                                   // รายงานฉบับหลัก
  f.text(String(input.sheetCount ?? 1), 468, 512, 120.9);

  /* ── ส่วนที่ 1 ผู้ทำธุรกรรม ── */
  f.text(input.firstname, 114, 213, 157.8);
  f.text(input.lastname, 347, 438, 157.8);
  f.text(input.nationality, 458, 575, 157.8);
  f.checkGlyph(43.6, 160.2);                              // ทำธุรกรรมด้วยตนเอง

  const parsed = parseThaiAddress(input.address);
  if (parsed) {
    f.text(parsed.house, 68, 232, 197.7);
    f.text(parsed.tambon, 247, 330, 197.7);
    f.text(parsed.amphoe, 349, 427, 197.7);
    f.text(parsed.province, 445, 503, 197.7);
    f.text(parsed.postal, 538, 574, 197.7);
  } else {
    f.text(input.address, 68, 232, 197.7, 9, 5.5);
  }
  f.text("ไทย", 65, 167, 211.1);
  f.text(input.phone, 205, 344, 211.1);

  if (input.occupation.trim()) {
    f.text(input.occupation, 74, 257, 224.0);
  } else {
    f.checkGlyph(181.9, 241.6);                            // ไม่มีข้อมูลในข้อ 1.3
  }
  f.checkGlyph(507.6, 269.3);                              // ไม่มีข้อมูลในข้อ 1.4

  /* ── ข้อ 1.5 หลักฐาน ── */
  const box = ID_TYPE_BOX[input.idType];
  f.checkGlyph(box.x, box.top);
  if (input.idType === "other") f.text(input.idTypeOther, 94, 146, 306.5);
  f.boxes(input.idNumber, ID_BOXES.map((b) => b.x0), 11.5, ID_BOXES[0].top, 9, 9.5);
  f.text(input.idIssuedBy, 72, 180, 320.9);
  if (input.idIssueDate) {
    const d = input.idIssueDate;
    f.text(pad2(d.getDate()), 193, 209, 320.9);
    f.text(pad2(d.getMonth() + 1), 212, 230, 320.9);
    f.text(String(toBuddhistYear(d)), 231, 256, 320.9);
  }
  if (input.idExpiryLifetime) {
    f.text("ตลอดชีพ", 293, 356, 320.9);
  } else if (input.idExpiryDate) {
    const d = input.idExpiryDate;
    f.text(pad2(d.getDate()), 293, 309, 320.9);
    f.text(pad2(d.getMonth() + 1), 312, 330, 320.9);
    f.text(String(toBuddhistYear(d)), 331, 356, 320.9);
  }

  /* ── ส่วนที่ 3 ข้อเท็จจริงเกี่ยวกับธุรกรรม ── */
  f.text(String(txDate.getDate()), 389, 435, 549.3);
  f.text(THAI_MONTHS[txDate.getMonth()], 453, 513, 549.3);
  f.text(String(toBuddhistYear(txDate)), 529, 573, 549.3);

  // แถว "ทองคำแท่ง ทองรูปพรรณ"
  // มุมมองของฟอร์มคือฝั่งผู้ประกอบอาชีพ: ร้านซื้อเข้า → ช่อง "ซื้อ", ร้านขายออก → ช่อง "ขาย"
  const ROW_BOTTOM = 618.0;
  if (input.mode === "sell") {
    // ซื้อเข้า
    f.check(42.5, 608.0);
    f.text(fmtWeight(input.weightBaht), 192, 251, ROW_BOTTOM, 9, 6);
    f.text(fmtMoney(input.amount), 251, 315, ROW_BOTTOM, 9, 6);
  } else {
    // ขายออก
    f.check(314.9, 608.0);
    f.text(fmtWeight(input.weightBaht), 458, 525, ROW_BOTTOM, 9, 6);
    f.text(fmtMoney(input.amount), 525, 580, ROW_BOTTOM, 9, 6);
  }

  f.text(fmtMoney(input.amount), 196, 575, 677.5);        // รวม (บาท)
  f.text(bahtText(input.amount), 196, 575, 692.2, 10, 6); // จำนวนเงินรวมเป็นตัวอักษร
  f.text(input.beneficiary, 162, 395, 706.7);
  f.text(input.purpose, 139, 396, 719.6);

  /* ── ส่วนที่ 4 วันที่รายงาน (เหนือคำว่า "วัน/เดือน/ปี ที่รายงาน") ── */
  const rd = `${reportDate.getDate()} ${THAI_MONTHS[reportDate.getMonth()]} ${toBuddhistYear(reportDate)}`;
  f.textRight(rd, 572, 741, 9.5);

  return pdf.save();
}

/* ───────────── ฝั่งเบราว์เซอร์: โหลดไฟล์ + เปิด/ดาวน์โหลด ───────────── */

const ASSET_BASE = process.env.PUBLIC_URL || "";
const TEMPLATE_URL = `${ASSET_BASE}/forms/amlo-1-05-2.pdf`;
const FONT_URL = `${ASSET_BASE}/fonts/Sarabun-Regular.ttf`;

const cache: { template?: ArrayBuffer; font?: ArrayBuffer } = {};

async function loadAsset(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`โหลดไฟล์ ${url} ไม่สำเร็จ (${res.status})`);
  return res.arrayBuffer();
}

/** สร้างไฟล์ PDF (ยังไม่เปิด) — ใช้สร้างก่อนบันทึก เพื่อให้ถ้าสร้างไม่สำเร็จจะได้หยุดก่อนบันทึกซ้ำ */
export async function makeAmlReportBlob(input: AmlReportInput): Promise<Blob> {
  cache.template ??= await loadAsset(TEMPLATE_URL);
  cache.font ??= await loadAsset(FONT_URL);
  const bytes = await buildAmlReportPdf(input, {
    // สำเนาใหม่ทุกครั้ง เพราะ pdf-lib อาจใช้ buffer เดิมต่อ
    templateBytes: cache.template.slice(0),
    fontBytes: cache.font.slice(0),
  });
  return new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
}

export function amlFileName(d: Date) {
  return `ปปง-1-05-2_${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}.pdf`;
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

export async function generateAmlReport(input: AmlReportInput): Promise<void> {
  openPdfBlob(await makeAmlReportBlob(input), amlFileName(input.date));
}
