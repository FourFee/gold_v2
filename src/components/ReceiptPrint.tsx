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
  weightUnit?: string;
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
  pawn: "ใบรับจำนำ",
  bar: "ใบซื้อขายทองแท่ง",
  ornament: "ใบซื้อขายทองรูปพรรณ",
  redeem: "ใบไถ่จำนำ",
};

function buildReceiptHtml(data: ReceiptData): string {
  const shopName = data.shopName || "ห้างทองจินดา";
  const dateStr = data.date ? dayjs(data.date).format("DD/MM/YYYY HH:mm") : dayjs().format("DD/MM/YYYY HH:mm");
  const typeLabel = TYPE_LABEL[data.type] || "ใบเสร็จ";
  const fullName = [data.firstname, data.lastname].filter(Boolean).join(" ") || "-";
  const fmt = (n?: number) => n != null ? n.toLocaleString("th-TH", { minimumFractionDigits: 2 }) : "-";

  const rows: [string, string][] = [];

  if (data.weight) rows.push(["น้ำหนัก", `${fmt(data.weight)} ${data.weightUnit || "บาท"}`]);
  if (data.pricePerGram) rows.push(["ราคา/กรัม", `${fmt(data.pricePerGram)} บาท`]);
  if (data.goldType) rows.push(["ประเภททอง", data.goldType]);
  if (data.purity) rows.push(["ความบริสุทธิ์", data.purity]);
  if (data.amount) rows.push(["ยอดรวม", `${fmt(data.amount)} บาท`]);
  if (data.interest) rows.push(["ดอกเบี้ย/เดือน", `${fmt(data.interest)} บาท`]);
  if (data.dueDate) rows.push(["วันครบกำหนด", data.dueDate]);
  if (data.remark) rows.push(["หมายเหตุ", data.remark]);

  const rowsHtml = rows.map(([label, val]) => `
    <tr>
      <td style="padding:1.5mm 0;color:#333">${label}</td>
      <td style="padding:1.5mm 0;text-align:right;font-weight:600">${val}</td>
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
    font-size: 13px;
    color: #111;
    margin: 0; padding: 0;
  }
  .center { text-align: center; }
  .line   { border-top: 1px dashed #666; margin: 3mm 0; }
  .shop   { font-size: 18px; font-weight: 700; margin-bottom: 0.5mm; color: #111; }
  .type   { font-size: 16px; font-weight: 700; margin: 1.5mm 0; }
  table   { width: 100%; border-collapse: collapse; font-size: 13px; }
  .sign   { margin-top: 6mm; display: flex; justify-content: space-between; }
  .sign-box { text-align: center; width: 45%; }
  .sign-line { border-top: 1px solid #333; margin-top: 9mm; font-size: 12px; padding-top: 1.5mm; }
  .footer { text-align: center; font-size: 11px; color: #444; margin-top: 4mm; }
  .logo-container { text-align: center; margin-bottom: 2mm; }
  .logo-container svg { width: 50%; height: auto; }
</style>
</head>
<body>
  <div class="logo-container">
    <svg viewBox="0 0 100 100" style="width:50%; height:auto;" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="47" fill="#8B0000" stroke="#D4AF37" stroke-width="2.5"/>
      <circle cx="50" cy="50" r="42" fill="none" stroke="#D4AF37" stroke-width="1" stroke-dasharray="2 1.5"/>
      <circle cx="50" cy="50" r="39" fill="none" stroke="#D4AF37" stroke-width="1"/>
      <text x="50" y="24" fill="#D4AF37" font-size="7.5" font-weight="bold" font-family="'Sarabun', 'Tahoma', sans-serif" text-anchor="middle">ห้างทองจินดา</text>
      <text x="50" y="58" fill="#FFD700" font-size="28" font-weight="bold" font-family="'Times New Roman', serif" text-anchor="middle" letter-spacing="1">JD</text>
      <text x="50" y="72" fill="#D4AF37" font-size="5.5" font-weight="bold" font-family="'Sarabun', 'Tahoma', sans-serif" text-anchor="middle">JINDA GOLD STORE</text>
      <text x="50" y="82" fill="#D4AF37" font-size="5" font-family="'Sarabun', 'Tahoma', sans-serif" text-anchor="middle">EST. พ.ศ. ๒๕๓๐</text>
    </svg>
  </div>
  <div class="center">
    <div class="shop">${shopName}</div>
    <div style="font-size:12px;color:#444">ห้างทองจินดา · โทร 038-222299</div>
  </div>
  <div class="line"></div>
  <div class="center">
    <div class="type">${typeLabel}</div>
    <div style="font-size:12px;color:#333">วันที่: ${dateStr}</div>
    ${data.receiptNo ? `<div style="font-size:12px;color:#333">เลขที่: ${data.receiptNo}</div>` : ""}
  </div>
  <div class="line"></div>

  <table>
    <tr>
      <td style="padding:1.5mm 0;color:#333">ชื่อ-นามสกุล</td>
      <td style="padding:1.5mm 0;text-align:right;font-weight:600">${fullName}</td>
    </tr>
    ${data.idcard ? `<tr><td style="padding:1.5mm 0;color:#333">เลขบัตร</td><td style="padding:1.5mm 0;text-align:right">${data.idcard}</td></tr>` : ""}
    ${data.phone ? `<tr><td style="padding:1.5mm 0;color:#333">โทร</td><td style="padding:1.5mm 0;text-align:right">${data.phone}</td></tr>` : ""}
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
