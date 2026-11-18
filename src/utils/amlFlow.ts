// ขั้นตอนแบบ ปปง.1-05-2 ที่ใช้ร่วมกันระหว่างหน้าทองแท่งและทองรูปพรรณ
import dayjs from "dayjs";
import { API_BASE } from "../config";
import { AML_SHOP, AML_THRESHOLD } from "./amlConfig";
import type { AmlIdType, AmlReportInput } from "./amlReport";
import type { StrReportInput } from "./strReport";
import { beDateToIso, openPdfBlob, type StrReason } from "./amlShared";

// pdf-lib ใหญ่ — โหลดเฉพาะตอนสร้าง PDF (หน้าอื่นไม่ต้องโหลด)
const pdfAml = () => import("./amlReport");
const pdfStr = () => import("./strReport");

/** report = เงินสด ต้องรายงาน, exempt_transfer = โอน/เช็ค, exempt_other = ไม่ต้องส่ง ปปง. (เช่น ร้านซื้อเอง) */
export type AmlStatus = "report" | "exempt_transfer" | "exempt_other";
export type AmlEntity = "bar_gold" | "ornament_gold";

/** ข้อมูลเพิ่มเติมที่กรอกในแผง ปปง. */
export interface AmlExtra {
  status: AmlStatus;
  exemptReason: string;
  idType: AmlIdType;
  idTypeOther: string;
  nationality: string;
  occupation: string;
  idIssuedBy: string;
  idIssueDate: string;       // YYYY-MM-DD
  idExpiryDate: string;      // YYYY-MM-DD
  idExpiryLifetime: boolean; // บัตรตลอดชีพ (อ่านจากบัตร)
  beneficiary: string;
  purpose: string;
}

export const AML_EXTRA_INITIAL: AmlExtra = {
  status: "report", exemptReason: "", idType: "citizen", idTypeOther: "", nationality: "ไทย", occupation: "",
  idIssuedBy: "", idIssueDate: "", idExpiryDate: "", idExpiryLifetime: false, beneficiary: "", purpose: "",
};

export const isOverAmlThreshold = (amount: number) => !isNaN(amount) && amount >= AML_THRESHOLD;

/** ข้อมูล ปปง. ที่ backend เก็บ (แนบมากับรายการทองตอนบันทึก หรือจาก /aml/list) */
export interface AmlRecord {
  id: number;
  entity: AmlEntity;
  entity_id: number;
  status: AmlStatus;
  reason: string;
  year_be: number | null;
  month: number | null;
  seq: number | null;
  data: AmlSnapshot;
  created_at: string | null;
}

/** AmlReportInput ในรูป JSON (ไม่รวมข้อมูลร้าน — ใช้ค่าปัจจุบันจาก amlConfig ตอนพิมพ์) */
export type AmlSnapshot = Omit<AmlReportInput, "shop" | "date" | "reportDate" | "idIssueDate" | "idExpiryDate"> & {
  date: string;
  reportDate: string;
  idIssueDate: string | null;
  idExpiryDate: string | null;
};

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);
const fromIso = (s: string | null | undefined) => (s && dayjs(s).isValid() ? dayjs(s).toDate() : null);

export function toSnapshot(input: AmlReportInput): AmlSnapshot {
  const { shop, date, reportDate, idIssueDate, idExpiryDate, ...rest } = input;
  return {
    ...rest,
    date: date.toISOString(),
    reportDate: (reportDate ?? new Date()).toISOString(),
    idIssueDate: iso(idIssueDate),
    idExpiryDate: iso(idExpiryDate),
  };
}

export function fromSnapshot(s: AmlSnapshot, seq: number | null): AmlReportInput {
  return {
    ...s,
    shop: AML_SHOP,
    date: fromIso(s.date) ?? new Date(),
    reportDate: fromIso(s.reportDate) ?? new Date(),
    idIssueDate: fromIso(s.idIssueDate),
    idExpiryDate: fromIso(s.idExpiryDate),
    sequenceNo: seq != null ? seqText(seq) : "",
  };
}

export const seqText = (n: number) => String(n).padStart(6, "0");

/** เลขที่แบบย่อสำหรับแสดงผล เช่น 2569/11-000001 */
export const amlRefText = (r: Pick<AmlRecord, "year_be" | "month" | "seq">) =>
  r.seq != null ? `${r.year_be}/${String(r.month).padStart(2, "0")}-${seqText(r.seq)}` : "";

interface BuildParams {
  mode: "buy" | "sell";
  date: Date;
  goods: "ทองคำแท่ง" | "ทองรูปพรรณ";
  customer: { firstname: string; lastname: string; idcard: string; address: string; phone: string };
  weight: number;
  weightUnit: "baht" | "gram";
  amount: number;
  extra: AmlExtra;
}

export function buildAmlInput(p: BuildParams): AmlReportInput {
  const toDate = (s: string) => (s && dayjs(s).isValid() ? dayjs(s).toDate() : null);
  const e = p.extra;
  return {
    shop: AML_SHOP,
    mode: p.mode,
    date: p.date,
    reportDate: new Date(),
    firstname: p.customer.firstname, lastname: p.customer.lastname,
    nationality: e.nationality, address: p.customer.address, phone: p.customer.phone, occupation: e.occupation,
    idType: e.idType, idTypeOther: e.idTypeOther, idNumber: p.customer.idcard,
    idIssuedBy: e.idIssuedBy, idIssueDate: toDate(e.idIssueDate),
    idExpiryDate: toDate(e.idExpiryDate), idExpiryLifetime: e.idExpiryLifetime,
    weightBaht: p.weight, weightUnit: p.weightUnit,
    amount: p.amount,
    beneficiary: e.beneficiary,
    purpose: e.purpose.trim() || `${p.mode === "buy" ? "ซื้อ" : "ขาย"}${p.goods}`,
  };
}

/** ตรวจข้อมูลที่จำเป็น — คืนข้อความผิดพลาด หรือ null ถ้าผ่าน */
export function validateAml(extra: AmlExtra, idcard: string): string | null {
  if (extra.status === "exempt_other" && !extra.exemptReason.trim()) return "กรุณาระบุเหตุผลที่ไม่ต้องส่ง ปปง.";
  if (extra.status !== "report") return null;
  if (!idcard.trim()) return `เงินสดตั้งแต่ ${AML_THRESHOLD.toLocaleString()} บาท ต้องกรอกเลขบัตรประชาชน/หนังสือเดินทาง`;
  if (!extra.nationality.trim()) return "กรุณากรอกสัญชาติ (ใช้ในแบบ ปปง.)";
  if (extra.idType === "other" && !extra.idTypeOther.trim()) return "กรุณาระบุชนิดหลักฐาน";
  return null;
}

/** ข้อมูลที่ส่งไปกับการบันทึก */
export function amlPayload(extra: AmlExtra, input: AmlReportInput) {
  return {
    status: extra.status,
    reason: extra.status === "exempt_other" ? extra.exemptReason.trim() : "",
    data: toSnapshot(input),
  };
}

/** ค่าจากเครื่องอ่านบัตร (/idcard/latest) → แผง ปปง. */
export function amlFromCard(
  card: { issuer?: string; issue_date?: string; expire_date?: string },
  prev: AmlExtra,
): AmlExtra {
  const lifetime = card.expire_date === "99999999";
  return {
    ...prev,
    idType: "citizen",
    nationality: "ไทย",
    idIssuedBy: card.issuer || prev.idIssuedBy,
    idIssueDate: beDateToIso(card.issue_date) || prev.idIssueDate,
    idExpiryDate: lifetime ? "" : beDateToIso(card.expire_date) || prev.idExpiryDate,
    idExpiryLifetime: lifetime,
  };
}

/** เปิด PDF ตัวอย่าง (ยังไม่มีเลขลำดับ) */
export async function previewAmlPdf(input: AmlReportInput) {
  const { makeAmlReportBlob, amlFileName } = await pdfAml();
  openPdfBlob(await makeAmlReportBlob({ ...input, sequenceNo: "" }), amlFileName(input.date));
}

/** เปิด PDF ของรายการที่บันทึกแล้ว (มีเลขลำดับ) */
export async function openAmlRecordPdf(rec: AmlRecord) {
  const input = fromSnapshot(rec.data, rec.seq);
  const { makeAmlReportBlob, amlFileName } = await pdfAml();
  openPdfBlob(await makeAmlReportBlob(input), amlFileName(input.date));
}

/* ───────────── แบบ ปปง.1-05-10 ธุรกรรมที่มีเหตุอันควรสงสัย ───────────── */

/** รายการทองที่บันทึกแล้ว (จากหน้ารายการ) ในรูปที่ใช้ทำรายงาน */
export interface AmlTxInfo {
  entity: AmlEntity;
  id: number;
  date: string;          // จาก DB (UTC)
  mode: "buy" | "sell";
  firstname: string;
  lastname: string;
  idcard: string;
  address: string;
  phone: string;
  weight: number;
  amount: number;
}

export const ENTITY_GOODS: Record<AmlEntity, { goods: "ทองคำแท่ง" | "ทองรูปพรรณ"; unit: string }> = {
  bar_gold: { goods: "ทองคำแท่ง", unit: "บาท" },
  ornament_gold: { goods: "ทองรูปพรรณ", unit: "กรัม" },
};

export type StrSnapshot = Omit<StrReportInput, "shop" | "date" | "reportDate" | "idIssueDate" | "idExpiryDate"> & {
  date: string;
  reportDate: string;
  idIssueDate: string | null;
  idExpiryDate: string | null;
};

export interface StrRecord {
  id: number;
  entity: AmlEntity;
  entity_id: number;
  year_be: number;
  month: number;
  seq: number;
  data: StrSnapshot;
  created_at: string | null;
}

/** วันที่จาก DB (UTC ไม่มี timezone) → Date */
export const dbDate = (s: string) => {
  const d = dayjs(/[zZ]|[+-]\d\d:?\d\d$/.test(s) ? s : `${s}Z`);
  return d.isValid() ? d.toDate() : new Date();
};

/** ค่าเริ่มต้นของช่องหลักฐานใน STR: ใช้ข้อมูลจากแบบ 1-05-2 (ถ้ามี) */
export function extraFromAmlSnapshot(s: AmlSnapshot | undefined | null): AmlExtra {
  if (!s) return AML_EXTRA_INITIAL;
  const ymd = (v: string | null) => (v && dayjs(v).isValid() ? dayjs(v).format("YYYY-MM-DD") : "");
  return {
    ...AML_EXTRA_INITIAL,
    idType: s.idType, idTypeOther: s.idTypeOther ?? "", nationality: s.nationality, occupation: s.occupation,
    idIssuedBy: s.idIssuedBy ?? "", idIssueDate: ymd(s.idIssueDate), idExpiryDate: ymd(s.idExpiryDate),
    idExpiryLifetime: !!s.idExpiryLifetime, beneficiary: s.beneficiary ?? "", purpose: s.purpose,
  };
}

/** ข้อความตั้งต้นในช่องข้อเท็จจริง — สรุปรายการให้ พนักงานเขียนเหตุผลต่อ */
export function strFactsTemplate(tx: AmlTxInfo): string {
  const { goods, unit } = ENTITY_GOODS[tx.entity];
  const d = dbDate(tx.date);
  const when = `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear() + 543}`;
  const action = tx.mode === "buy" ? `ซื้อ${goods}จากร้าน` : `ขาย${goods}ให้ร้าน`;
  return `เมื่อวันที่ ${when} ลูกค้า${action} น้ำหนัก ${Number(tx.weight)} ${unit} มูลค่า ${Number(tx.amount).toLocaleString()} บาท\n`;
}

export function buildStrInput(tx: AmlTxInfo, extra: AmlExtra, reasons: StrReason[], reasonOther: string, facts: string): StrReportInput {
  const toDate = (s: string) => (s && dayjs(s).isValid() ? dayjs(s).toDate() : null);
  const { goods } = ENTITY_GOODS[tx.entity];
  return {
    shop: AML_SHOP,
    date: dbDate(tx.date),
    reportDate: new Date(),
    firstname: tx.firstname, lastname: tx.lastname, nationality: extra.nationality,
    address: tx.address, phone: tx.phone, occupation: extra.occupation,
    idType: extra.idType, idTypeOther: extra.idTypeOther, idNumber: tx.idcard,
    idIssuedBy: extra.idIssuedBy, idIssueDate: toDate(extra.idIssueDate),
    idExpiryDate: toDate(extra.idExpiryDate), idExpiryLifetime: extra.idExpiryLifetime,
    amount: Number(tx.amount) || 0,
    beneficiary: extra.beneficiary,
    purpose: extra.purpose.trim() || `${tx.mode === "buy" ? "ซื้อ" : "ขาย"}${goods}`,
    reasons, reasonOther, facts,
  };
}

function toStrSnapshot(input: StrReportInput): StrSnapshot {
  const { shop, date, reportDate, idIssueDate, idExpiryDate, ...rest } = input;
  return {
    ...rest,
    date: date.toISOString(),
    reportDate: (reportDate ?? new Date()).toISOString(),
    idIssueDate: iso(idIssueDate),
    idExpiryDate: iso(idExpiryDate),
  };
}

function fromStrSnapshot(s: StrSnapshot, seq: number): StrReportInput {
  return {
    ...s,
    shop: AML_SHOP,
    date: fromIso(s.date) ?? new Date(),
    reportDate: fromIso(s.reportDate) ?? new Date(),
    idIssueDate: fromIso(s.idIssueDate),
    idExpiryDate: fromIso(s.idExpiryDate),
    sequenceNo: seqText(seq),
  };
}

async function openStr(input: StrReportInput): Promise<boolean> {
  const { makeStrReportBlob, strFileName } = await pdfStr();
  const { blob, factsFit } = await makeStrReportBlob(input);
  openPdfBlob(blob, strFileName(input.date));
  return factsFit;
}

/** เปิด PDF ตัวอย่าง (ยังไม่มีเลข) — คืน false ถ้าข้อเท็จจริงยาวเกินช่อง */
export const previewStrPdf = (input: StrReportInput) => openStr({ ...input, sequenceNo: "" });

export const openStrRecordPdf = (rec: StrRecord) => openStr(fromStrSnapshot(rec.data, rec.seq));

/** บันทึกรายงาน (backend ออกเลขของเดือน) */
export async function createStr(entity: AmlEntity, entityId: number, input: StrReportInput): Promise<StrRecord> {
  const res = await fetch(`${API_BASE}/aml/str/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entity, entity_id: entityId, data: toStrSnapshot(input) }),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail?.detail ? String(detail.detail) : `บันทึกรายงานไม่สำเร็จ (${res.status})`);
  }
  return res.json();
}

/** โหลดรายงาน STR ของทุกรายการในหมวด → map ตาม entity_id (รายการละหลายฉบับได้) */
export async function fetchStrMap(entity: AmlEntity): Promise<Map<number, StrRecord[]>> {
  const res = await fetch(`${API_BASE}/aml/str/list?entity=${entity}`);
  if (!res.ok) throw new Error(`โหลดรายงานธุรกรรมน่าสงสัยไม่สำเร็จ (${res.status})`);
  const rows: StrRecord[] = await res.json();
  const map = new Map<number, StrRecord[]>();
  for (const r of rows) map.set(r.entity_id, [...(map.get(r.entity_id) ?? []), r]);
  return map;
}

/** โหลดข้อมูล ปปง. ของทุกรายการในหมวด → map ตาม entity_id */
export async function fetchAmlMap(entity: AmlEntity): Promise<Map<number, AmlRecord>> {
  const res = await fetch(`${API_BASE}/aml/list?entity=${entity}`);
  if (!res.ok) throw new Error(`โหลดข้อมูล ปปง. ไม่สำเร็จ (${res.status})`);
  const rows: AmlRecord[] = await res.json();
  return new Map(rows.map((r) => [r.entity_id, r]));
}
