import { useCallback } from "react";
import dayjs from "dayjs";
import { API_BASE } from "../config";

export interface ReceiptData {
  type: "pawn" | "bar" | "ornament" | "redeem";
  shopName?: string;
  receiptNo?: string;
  date?: string;
  // ลูกค้า
  firstname?: string;
  lastname?: string;
  idcard?: string;
  phone?: string;
  address?: string;
  // รายการ
  weight?: number;
  amount?: number;
  pricePerGram?: number;
  goldType?: string;
  purity?: string;
  remark?: string;
  // จำนำ
  interest?: number;
  dueDate?: string;
}

const TYPE_LABEL: Record<string, string> = {
  pawn:     "ใบรับจำนำ",
  bar:      "ใบซื้อขายทองแท่ง",
  ornament: "ใบซื้อขายทองรูปพรรณ",
  redeem:   "ใบไถ่จำนำ",
};

function buildReceiptHtml(data: ReceiptData): string {
  const shopName  = data.shopName  || "ห้างทองจินดา";
  const dateStr   = data.date ? dayjs(data.date).format("DD/MM/YYYY HH:mm") : dayjs().format("DD/MM/YYYY HH:mm");
  const typeLabel = TYPE_LABEL[data.type] || "ใบเสร็จ";
  const fullName  = [data.firstname, data.lastname].filter(Boolean).join(" ") || "-";
  const fmt = (n?: number) => n != null ? n.toLocaleString("th-TH", { minimumFractionDigits: 2 }) : "-";

  const rows: [string, string][] = [];

  if (data.weight)       rows.push(["น้ำหนัก",     `${fmt(data.weight)} กรัม`]);
  if (data.pricePerGram) rows.push(["ราคา/กรัม",   `${fmt(data.pricePerGram)} บาท`]);
  if (data.goldType)     rows.push(["ประเภททอง",   data.goldType]);
  if (data.purity)       rows.push(["ความบริสุทธิ์", data.purity]);
  if (data.amount)       rows.push(["ยอดรวม",      `${fmt(data.amount)} บาท`]);
  if (data.interest)     rows.push(["ดอกเบี้ย/เดือน", `${fmt(data.interest)} บาท`]);
  if (data.dueDate)      rows.push(["วันครบกำหนด", data.dueDate]);
  if (data.remark)       rows.push(["หมายเหตุ",    data.remark]);

  const rowsHtml = rows.map(([label, val]) => `
    <tr>
      <td style="padding:1mm 0;color:#555">${label}</td>
      <td style="padding:1mm 0;text-align:right;font-weight:600">${val}</td>
    </tr>`).join("");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  @page { size: 80mm auto; margin: 3mm 4mm; }
  * { box-sizing: border-box; }
  body {
    width: 72mm;
    font-family: 'Sarabun', 'Tahoma', sans-serif;
    font-size: 11px;
    color: #111;
    margin: 0; padding: 0;
  }
  .center { text-align: center; }
  .line   { border-top: 1px dashed #999; margin: 2mm 0; }
  .shop   { font-size: 15px; font-weight: 700; margin-bottom: 0.5mm; }
  .type   { font-size: 12px; font-weight: 600; margin: 1mm 0; }
  table   { width: 100%; border-collapse: collapse; }
  .sign   { margin-top: 5mm; display: flex; justify-content: space-between; }
  .sign-box { text-align: center; width: 45%; }
  .sign-line { border-top: 1px solid #333; margin-top: 6mm; font-size: 10px; padding-top: 1mm; }
  .footer { text-align: center; font-size: 9px; color: #888; margin-top: 3mm; }
</style>
</head>
<body>
  <div class="center">
    <div class="shop">${shopName}</div>
    <div style="font-size:9px;color:#666">ห้างทองจินดา · โทร 0x-xxxx-xxxx</div>
  </div>
  <div class="line"></div>
  <div class="center">
    <div class="type">${typeLabel}</div>
    <div style="font-size:9px;color:#555">วันที่: ${dateStr}</div>
    ${data.receiptNo ? `<div style="font-size:9px;color:#555">เลขที่: ${data.receiptNo}</div>` : ""}
  </div>
  <div class="line"></div>

  <table>
    <tr>
      <td style="color:#555">ชื่อ-นามสกุล</td>
      <td style="text-align:right;font-weight:600">${fullName}</td>
    </tr>
    ${data.idcard ? `<tr><td style="color:#555">เลขบัตร</td><td style="text-align:right">${data.idcard}</td></tr>` : ""}
    ${data.phone  ? `<tr><td style="color:#555">โทร</td><td style="text-align:right">${data.phone}</td></tr>` : ""}
  </table>

  <div class="line"></div>

  <table>${rowsHtml}</table>

  <div class="line"></div>

  <div class="sign">
    <div class="sign-box">
      <div class="sign-line">ลายเซ็นพนักงาน</div>
    </div>
    <div class="sign-box">
      <div class="sign-line">ลายเซ็นลูกค้า</div>
    </div>
  </div>

  <div class="footer">
    ขอบคุณที่ใช้บริการ · ${shopName}
  </div>
</body>
</html>`;
}

function browserPrint(data: ReceiptData) {
  const html = buildReceiptHtml(data);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank", "width=400,height=600");
  if (!win) { alert("กรุณาอนุญาต popup เพื่อพิมพ์ใบเสร็จ"); URL.revokeObjectURL(url); return; }
  win.focus();
  setTimeout(() => { win.print(); win.close(); URL.revokeObjectURL(url); }, 600);
}

export function usePrint() {
  const print = useCallback(async (data: ReceiptData) => {
    try {
      const checkRes = await fetch(`${API_BASE}/print/check`, { signal: AbortSignal.timeout(3000) });
      const { online } = await checkRes.json();
      if (online) {
        await fetch(`${API_BASE}/print/receipt`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        return;
      }
    } catch {
      // printer not reachable — fall through to browser print
    }
    browserPrint(data);
  }, []);

  return { print };
}
