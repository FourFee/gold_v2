// หน้าต่างทำแบบ ปปง.1-05-10 รายงานธุรกรรมที่มีเหตุอันควรสงสัย (ใช้ในหน้ารายการทองแท่ง/ทองรูปพรรณ)
import { useEffect, useState } from "react";
import {
  Alert, Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControlLabel, Grid, TextField, Typography, alpha,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import { makeG } from "../utils/dashboardTokens";
import AmlIdentityFields from "./AmlIdentityFields";
import {
  ENTITY_GOODS, amlRefText, buildStrInput, createStr, dbDate, openStrRecordPdf, previewStrPdf,
  strFactsTemplate, type AmlExtra, type AmlTxInfo, type StrRecord,
} from "../utils/amlFlow";
import { STR_REASONS, type StrReason } from "../utils/amlShared";

interface Props {
  open: boolean;
  onClose: () => void;
  tx: AmlTxInfo | null;
  existing: StrRecord[];          // รายงานที่เคยทำแล้วของรายการนี้
  initialExtra: AmlExtra;         // ค่าตั้งต้นของช่องหลักฐาน (จากแบบ 1-05-2 หรือจากเครื่องอ่านบัตร)
  onCreated: (rec: StrRecord) => void;
  notify: (msg: string, severity: "success" | "error" | "info" | "warning") => void;
}

export default function StrReportDialog({ open, onClose, tx, existing, initialExtra, onCreated, notify }: Props) {
  const theme = useTheme();
  const G = makeG(theme);
  const [extra, setExtra] = useState<AmlExtra>(initialExtra);
  const [reasons, setReasons] = useState<StrReason[]>([]);
  const [reasonOther, setReasonOther] = useState("");
  const [facts, setFacts] = useState("");
  const [busy, setBusy] = useState(false);

  // เปิดใหม่ทุกครั้งเริ่มฟอร์มใหม่
  useEffect(() => {
    if (!open || !tx) return;
    setExtra(initialExtra);
    setReasons([]);
    setReasonOther("");
    setFacts(strFactsTemplate(tx));
  }, [open, tx]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!tx) return null;
  const { goods } = ENTITY_GOODS[tx.entity];

  const toggleReason = (r: StrReason) =>
    setReasons((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));

  const validate = (): string | null => {
    if (!tx.idcard.trim()) return "รายการนี้ไม่มีเลขบัตร — แก้ไขรายการให้มีเลขบัตร/หนังสือเดินทางก่อน";
    if (!extra.nationality.trim()) return "กรุณากรอกสัญชาติ";
    if (extra.idType === "other" && !extra.idTypeOther.trim()) return "กรุณาระบุชนิดหลักฐาน";
    if (reasons.length === 0) return "กรุณาเลือกเหตุอันควรสงสัยอย่างน้อย 1 ข้อ";
    if (reasons.includes("other") && !reasonOther.trim()) return "กรุณาระบุเหตุอื่น ๆ";
    if (facts.trim().length < 20) return "กรุณาเขียนข้อเท็จจริงเกี่ยวกับเหตุอันควรสงสัยให้ละเอียด";
    return null;
  };

  const input = () => buildStrInput(tx, extra, reasons, reasonOther.trim(), facts);

  const handlePreview = async () => {
    const err = validate(); if (err) { notify(err, "error"); return; }
    setBusy(true);
    try {
      if (!(await previewStrPdf(input()))) {
        notify("ข้อเท็จจริงยาวเกินช่องในฟอร์ม — ย่อให้สั้นลง หรือพิมพ์ส่วนที่เกินแนบในกระดาษ A4", "warning");
      }
    }
    catch (e) { notify((e as Error).message, "error"); }
    finally { setBusy(false); }
  };

  const handleCreate = async () => {
    const err = validate(); if (err) { notify(err, "error"); return; }
    setBusy(true);
    try {
      const rec = await createStr(tx.entity, tx.id, input());
      onCreated(rec);
      onClose();
      try {
        const fit = await openStrRecordPdf(rec);
        if (fit) notify(`บันทึกรายงานแล้ว เลขที่ ${amlRefText(rec)}`, "success");
        else notify(`บันทึกแล้ว เลขที่ ${amlRefText(rec)} — ข้อเท็จจริงยาวเกินช่อง ส่วนที่เกินให้พิมพ์แนบในกระดาษ A4 และแก้จำนวนแผ่น`, "warning");
      }
      catch (e) { notify(`บันทึกแล้ว (เลขที่ ${amlRefText(rec)}) แต่เปิด PDF ไม่สำเร็จ: ${(e as Error).message}`, "error"); }
    } catch (e) { notify((e as Error).message, "error"); }
    finally { setBusy(false); }
  };

  const reprint = async (rec: StrRecord) => {
    setBusy(true);
    try { await openStrRecordPdf(rec); }
    catch (e) { notify((e as Error).message, "error"); }
    finally { setBusy(false); }
  };

  const d = dbDate(tx.date);

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="md" fullWidth
      PaperProps={{ sx: { borderRadius: 3, bgcolor: G.paper, border: `1px solid ${G.border}` } }}>
      <DialogTitle sx={{ color: G.text, fontWeight: 600, pb: 1 }}>
        รายงานธุรกรรมที่มีเหตุอันควรสงสัย (ปปง.1-05-10)
        <Typography sx={{ fontSize: 12.5, color: G.textMuted, mt: 0.5 }}>
          {tx.firstname} {tx.lastname} · {tx.mode === "buy" ? "ขายออก" : "ซื้อเข้า"}{goods} · {Number(tx.amount).toLocaleString()} บาท
          · {d.toLocaleDateString("th-TH")}
        </Typography>
      </DialogTitle>
      <DialogContent dividers sx={{ borderColor: G.border }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          <b>ห้ามแจ้งหรือบอกใบ้ให้ลูกค้าทราบ</b>ว่ามีการรายงาน และอย่าพิมพ์ฟอร์มนี้ต่อหน้าลูกค้า
          รายงานได้ทุกยอดเงิน ไม่ต้องถึง 2 ล้าน
        </Alert>

        {existing.length > 0 && (
          <Box sx={{ mb: 2, p: 1.5, borderRadius: '10px', border: `1px solid ${G.border}`, bgcolor: alpha(G.accent, 0.04) }}>
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: G.text, mb: 1 }}>รายงานที่ทำไปแล้วของรายการนี้</Typography>
            {existing.map((r) => (
              <Box key={r.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
                <Typography sx={{ fontSize: 13, color: G.textSub, fontFamily: '"JetBrains Mono", ui-monospace, monospace' }}>
                  เลขที่ {amlRefText(r)}
                </Typography>
                <Button size="small" startIcon={<PictureAsPdfIcon sx={{ fontSize: 15 }} />} onClick={() => reprint(r)} disabled={busy}>
                  พิมพ์ซ้ำ
                </Button>
              </Box>
            ))}
            <Typography sx={{ fontSize: 12, color: G.textMuted }}>กรอกด้านล่างถ้าต้องการทำรายงานฉบับใหม่</Typography>
          </Box>
        )}

        <Typography sx={{ fontSize: 13, fontWeight: 700, color: G.text, mb: 1 }}>ส่วนที่ 4 เหตุอันควรสงสัย</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, columnGap: 2, mb: 1 }}>
          {STR_REASONS.map((r) => (
            <FormControlLabel key={r.value} sx={{ alignItems: 'flex-start', m: 0, '& .MuiTypography-root': { fontSize: 13, pt: 1 } }}
              control={<Checkbox checked={reasons.includes(r.value)} onChange={() => toggleReason(r.value)} />}
              label={r.label} />
          ))}
        </Box>
        {reasons.includes("other") && (
          <TextField fullWidth size="small" label="ระบุเหตุอื่น ๆ" value={reasonOther}
            onChange={(e) => setReasonOther(e.target.value)} sx={{ mb: 2 }} />
        )}
        <TextField fullWidth multiline minRows={5} label="ข้อเท็จจริงเกี่ยวกับเหตุอันควรสงสัย"
          helperText="เขียนสิ่งที่เห็นหรือได้ยินจริง เช่น พฤติกรรม คำพูด ที่มาของเงิน การแบ่งชำระ"
          value={facts} onChange={(e) => setFacts(e.target.value)} sx={{ mb: 3 }} />

        <Typography sx={{ fontSize: 13, fontWeight: 700, color: G.text, mb: 1 }}>ข้อมูลหลักฐานของผู้ทำธุรกรรม</Typography>
        <Grid container spacing={2}>
          <AmlIdentityFields value={extra} onChange={setExtra}
            purposePlaceholder={`${tx.mode === "buy" ? "ซื้อ" : "ขาย"}${goods}`} />
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, gap: 1, flexWrap: 'wrap' }}>
        <Button onClick={onClose} disabled={busy}
          sx={{ color: G.textSub, border: `1px solid ${G.border}`, borderRadius: '8px' }}>
          ปิด
        </Button>
        <Button startIcon={<PictureAsPdfIcon />} onClick={handlePreview} disabled={busy}
          sx={{ color: G.accent, border: `1px solid ${G.accent}`, borderRadius: '8px' }}>
          ดูตัวอย่าง
        </Button>
        <Button onClick={handleCreate} disabled={busy}
          sx={{ bgcolor: G.danger, color: '#fff', borderRadius: '8px', '&:hover': { bgcolor: alpha(G.danger, 0.85) } }}>
          {busy ? "กำลังทำ..." : "บันทึกและออกเลข"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
