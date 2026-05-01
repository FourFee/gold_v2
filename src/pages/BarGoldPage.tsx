import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { Box, TextField, Typography, Paper, Button, Stack, Grid, alpha } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { API_BASE, GOLD_BAHT_TO_GRAM_BAR } from "../config";
import { Snackbar, Alert } from "@mui/material";
import { useNotify } from "../hooks/useNotify";
import { usePersistedForm } from "../hooks/usePersistedForm";
import { usePrint } from "../components/ReceiptPrint";
import PrintIcon from "@mui/icons-material/Print";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";

import CustomerForm from "../components/CustomerForm";
import { makeG } from "../utils/dashboardTokens";

const MONO = '"JetBrains Mono", ui-monospace, monospace';

const MODES = [
  { value: 'buy',  label: 'ขายออก', sub: 'ร้านขายให้ลูกค้า', Icon: TrendingUpIcon  },
  { value: 'sell', label: 'ซื้อเข้า', sub: 'ลูกค้าขายให้ร้าน', Icon: TrendingDownIcon },
] as const;

const BAR_INITIAL = {
  date: "",
  firstname: "", lastname: "", idcard: "", address: "", phone: "",
  weightBaht: "", weightGram: "", amount: "", remark: "",
};

export default function BarGoldPage() {
  const theme = useTheme();
  const G = makeG(theme);
  const [form, setForm, clearForm] = usePersistedForm("bar", BAR_INITIAL);
  const { snackbar, notify, handleClose } = useNotify();
  const { print } = usePrint();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"buy" | "sell">("buy");
  const [saving, setSaving] = useState(false);
  const [dateEdited, setDateEdited] = useState(false);

  useEffect(() => { setForm(prev => ({ ...prev, date: "" })); }, []);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value,
      weightGram: name === "weightBaht" ? (parseFloat(value) * GOLD_BAHT_TO_GRAM_BAR).toFixed(2) : prev.weightGram,
    }));
  };

  const validate = () => {
    const wb = parseFloat(form.weightBaht);
    const a  = parseFloat(form.amount);
    if (!form.firstname) { notify("กรุณากรอกชื่อ", "error"); return null; }
    if (isNaN(wb) || wb <= 0) { notify("น้ำหนักต้องมากกว่า 0", "error"); return null; }
    if (isNaN(a)  || a  <= 0) { notify("จำนวนเงินต้องมากกว่า 0", "error"); return null; }
    return { wb, a };
  };

  const saveToServer = async (wb: number, a: number) => {
    const wg = parseFloat(form.weightGram);
    const payload = {
      ...form,
      mode,
      weightBaht: wb,
      weightGram: isNaN(wg) ? wb * 15.244 : wg,
      amount: a,
      date: (() => { const now = dayjs(); if (!dateEdited) return now.toISOString(); const d = dayjs(form.date); return d.isValid() ? d.hour(now.hour()).minute(now.minute()).second(now.second()).toISOString() : now.toISOString(); })(),
    };
    const res = await fetch(`${API_BASE}/bar-gold/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const detail = await res.json().catch(() => ({}));
      throw new Error(detail?.detail ? String(detail.detail) : `บันทึกไม่สำเร็จ (${res.status})`);
    }
  };

  const handleSave = async () => {
    const v = validate(); if (!v) return;
    setSaving(true);
    try {
      await saveToServer(v.wb, v.a);
      notify("บันทึกเรียบร้อย", "success");
      clearForm();
      navigate("/bar-list");
    } catch (err) { notify((err as Error).message, "error"); }
    finally { setSaving(false); }
  };

  const handleSaveAndPrint = async () => {
    const v = validate(); if (!v) return;
    setSaving(true);
    try {
      await saveToServer(v.wb, v.a);
      notify("บันทึกเรียบร้อย", "success");
      print({ type: "bar", firstname: form.firstname, lastname: form.lastname, idcard: form.idcard, phone: form.phone, address: form.address, weight: parseFloat(form.weightGram) || 0, amount: v.a, goldType: mode === "buy" ? "ขายออก (ร้านขายให้ลูกค้า)" : "ซื้อเข้า (ลูกค้าขายให้ร้าน)", remark: form.remark });
      clearForm();
      navigate("/bar-list");
    } catch (err) { notify((err as Error).message, "error"); }
    finally { setSaving(false); }
  };

  const handleReadCard = async () => {
    try {
      const res = await fetch("/api/idcard/latest");
      const data = await res.json();
      if (!data?.citizen_id) { notify("ไม่พบข้อมูลบัตร", "error"); return; }
      const [fname, lname = ""] = data.name_th.split(" ");
      setForm(prev => ({ ...prev, idcard: data.citizen_id, firstname: fname, lastname: lname, address: data.address }));
    } catch { notify("ดึงข้อมูลบัตรล้มเหลว", "error"); }
  };

  const handleClear = () => { clearForm(); setDateEdited(false); };

  const inputSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: '10px',
      '& fieldset': { borderColor: G.border },
      '&:hover fieldset': { borderColor: G.accent },
      '&.Mui-focused fieldset': { borderColor: G.accent },
    },
    '& .MuiInputLabel-root.Mui-focused': { color: G.accent },
  };

  return (
    <Box sx={{ bgcolor: G.bg, minHeight: '100vh', p: { xs: 1.5, sm: 3, md: 4 } }}>
      <Paper elevation={0} sx={{
        p: { xs: 2.5, sm: 3.5 }, borderRadius: 3, maxWidth: 820, mx: 'auto',
        bgcolor: G.paper, border: `1px solid ${G.border}`,
        boxShadow: '0 1px 0 rgba(27,23,19,.04),0 8px 24px -14px rgba(27,23,19,.14)',
      }}>
        {/* Header */}
        <Box sx={{ mb: 3, pb: 2.5, borderBottom: `1px solid ${G.border}` }}>
          <Typography sx={{
            fontSize: 18, fontWeight: 600, color: G.text, letterSpacing: '-.01em',
            display: 'flex', alignItems: 'center', gap: 1,
            '&::before': { content: '""', width: 4, height: 20, bgcolor: G.accent, borderRadius: 1, display: 'inline-block' },
          }}>
            ซื้อขายทองแท่ง
          </Typography>
          <Typography sx={{ color: G.textMuted, fontSize: 12.5, mt: 0.5, fontFamily: MONO }}>
            {new Date().toLocaleString("th-TH", { dateStyle: 'full', timeStyle: 'short' })}
          </Typography>
        </Box>

        {/* Mode selector + Date row */}
        <Box sx={{ mb: 3, display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <Box sx={{ flex: '1 1 260px' }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: G.textFaint, textTransform: 'uppercase', letterSpacing: '.1em', mb: 1, fontFamily: MONO }}>
              ประเภทธุรกรรม
            </Typography>
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
              {MODES.map(m => (
                <Box key={m.value} component="button" onClick={() => setMode(m.value)}
                  sx={{
                    flex: { xs: '1 1 calc(50% - 6px)', sm: 'none' },
                    minWidth: 140, border: `2px solid ${mode === m.value ? (m.value === 'buy' ? G.success : G.danger) : G.border}`,
                    borderRadius: '12px', p: '10px 16px', cursor: 'pointer',
                    bgcolor: mode === m.value ? (m.value === 'buy' ? alpha(G.success, 0.08) : alpha(G.danger, 0.08)) : G.bg,
                    color:   mode === m.value ? (m.value === 'buy' ? G.success : G.danger) : G.textMuted,
                    fontFamily: 'inherit', transition: 'all .15s',
                    display: 'flex', alignItems: 'center', gap: 1,
                  }}>
                  <m.Icon sx={{ fontSize: 18 }} />
                  <Box sx={{ textAlign: 'left' }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'inherit', lineHeight: 1.2 }}>{m.label}</Typography>
                    <Typography sx={{ fontSize: 11, color: G.textMuted, lineHeight: 1.2 }}>{m.sub}</Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
          <Box sx={{ flex: '0 0 auto', minWidth: 190 }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: G.textFaint, textTransform: 'uppercase', letterSpacing: '.1em', mb: 1, fontFamily: MONO }}>
              วันที่ทำรายการ
            </Typography>
            <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="th">
              <DatePicker
                value={form.date && dayjs(form.date).isValid() ? dayjs(form.date) : null}
                onChange={(v) => { setForm(prev => ({ ...prev, date: v?.isValid() ? v.format('YYYY-MM-DD') : "" })); setDateEdited(!!v?.isValid()); }}
                slotProps={{ textField: { fullWidth: true, placeholder: 'ใช้เวลาปัจจุบัน', sx: inputSx } }}
              />
            </LocalizationProvider>
          </Box>
        </Box>

        <Grid container spacing={2.5}>
          {/* ── ข้อมูลลูกค้า ── */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: G.textFaint, textTransform: 'uppercase', letterSpacing: '.1em', fontFamily: MONO, flexShrink: 0 }}>
                ข้อมูลลูกค้า
              </Typography>
              <Box sx={{ flex: 1, height: '1px', bgcolor: G.border }} />
            </Box>
          </Grid>
          <CustomerForm values={form} onChange={handleChange} onReadCard={handleReadCard} onClear={handleClear} inputSx={inputSx}
            actionButtons={
              <Grid item xs={12}>
                <Stack direction="row" spacing={1.5}>
                  <Button variant="outlined" onClick={handleReadCard}
                    sx={{ borderRadius: '10px', borderColor: G.border, color: G.textSub, minHeight: 44,
                      '&:hover': { borderColor: G.accent, color: G.accent } }}>
                    📥 อ่านบัตรประชาชน
                  </Button>
                  <Button variant="outlined" onClick={handleClear}
                    sx={{ borderRadius: '10px', borderColor: G.border, color: G.textSub, minHeight: 44,
                      '&:hover': { borderColor: G.danger, color: G.danger } }}>
                    🧹 เคลียร์ฟอร์ม
                  </Button>
                </Stack>
              </Grid>
            }
          />
          {/* ── รายละเอียดทอง ── */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.5 }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: G.textFaint, textTransform: 'uppercase', letterSpacing: '.1em', fontFamily: MONO, flexShrink: 0 }}>
                รายละเอียดทอง
              </Typography>
              <Box sx={{ flex: 1, height: '1px', bgcolor: G.border }} />
            </Box>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="น้ำหนักทอง (บาทน้ำหนัก)" name="weightBaht" value={form.weightBaht}
              onChange={handleChange} type="number" inputProps={{ min: 0 }} sx={inputSx} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="น้ำหนัก (กรัม) — คำนวณอัตโนมัติ" value={form.weightGram}
              disabled sx={inputSx}
              InputProps={{ sx: { fontFamily: MONO, bgcolor: alpha(G.accent, 0.04) } }} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth
              label="จำนวนเงิน (บาท)"
              name="amount" value={form.amount}
              onChange={handleChange} type="number" inputProps={{ min: 0 }}
              sx={inputSx}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth multiline rows={2} label="หมายเหตุ" name="remark"
              value={form.remark} onChange={handleChange} sx={inputSx} />
          </Grid>
          <Grid item xs={12}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} justifyContent="flex-end">
              <Button variant="outlined" onClick={handleSave} disabled={saving}
                sx={{ borderRadius: '10px', borderColor: G.accent, color: G.accent, minHeight: 44, fontWeight: 600,
                  '&:hover': { bgcolor: alpha(G.accent, 0.08) } }}>
                {saving ? "กำลังบันทึก..." : "บันทึก"}
              </Button>
              <Button startIcon={<PrintIcon />} variant="outlined"
                onClick={() => print({ type: "bar", firstname: form.firstname, lastname: form.lastname, idcard: form.idcard, phone: form.phone, address: form.address, weight: parseFloat(form.weightGram) || 0, amount: parseFloat(form.amount) || 0, goldType: mode === "buy" ? "ขายออก" : "ซื้อเข้า", remark: form.remark })}
                sx={{ borderRadius: '10px', borderColor: G.border, color: G.textSub, minHeight: 44,
                  '&:hover': { borderColor: G.accent, color: G.accent } }}>
                พิมพ์ใบเสร็จ
              </Button>
              <Button variant="contained" onClick={handleSaveAndPrint} disabled={saving}
                sx={{ borderRadius: '10px', bgcolor: G.accent, minHeight: 44, fontWeight: 600,
                  '&:hover': { bgcolor: alpha(G.accent, 0.85) } }}>
                {saving ? "กำลังบันทึก..." : "บันทึก + พิมพ์"}
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </Paper>
      <Snackbar open={snackbar.open} autoHideDuration={snackbar.severity === 'error' ? 6000 : 3000} onClose={handleClose} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert severity={snackbar.severity} onClose={handleClose}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
