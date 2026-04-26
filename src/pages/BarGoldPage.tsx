import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { validateThaiId } from "../utils/validateThaiId";
import CustomerForm from "../components/CustomerForm";
import { makeG } from "../utils/dashboardTokens";

const MONO = '"JetBrains Mono", ui-monospace, monospace';

const MODES = [
  { value: 'buy',  label: 'ขายออก', sub: 'ร้านขายให้ลูกค้า', Icon: TrendingUpIcon  },
  { value: 'sell', label: 'ซื้อเข้า', sub: 'ลูกค้าขายให้ร้าน', Icon: TrendingDownIcon },
] as const;

const BAR_INITIAL = {
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
    if (!form.firstname || !form.idcard) { notify("กรุณากรอกชื่อและเลขบัตร", "error"); return null; }
    if (form.idcard && !validateThaiId(form.idcard.replace(/\D/g, ""))) { notify("เลขบัตรประชาชนไม่ถูกต้อง", "error"); return null; }
    if (isNaN(wb) || wb <= 0) { notify("น้ำหนักต้องมากกว่า 0", "error"); return null; }
    if (isNaN(a)  || a  <= 0) { notify("จำนวนเงินต้องมากกว่า 0", "error"); return null; }
    return { wb, a };
  };

  const saveToServer = async (wb: number, a: number) => {
    const res = await fetch(`${API_BASE}/bar-gold/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, mode, weightBaht: wb, weightGram: parseFloat(form.weightGram), amount: a }),
    });
    if (!res.ok) throw new Error("บันทึกไม่สำเร็จ");
  };

  const handleSave = async () => {
    const v = validate(); if (!v) return;
    try {
      await saveToServer(v.wb, v.a);
      notify("บันทึกเรียบร้อย", "success");
      clearForm();
      navigate("/bar-list");
    } catch (err) { notify((err as Error).message, "error"); }
  };

  const handleSaveAndPrint = async () => {
    const v = validate(); if (!v) return;
    try {
      await saveToServer(v.wb, v.a);
      notify("บันทึกเรียบร้อย", "success");
      print({ type: "bar", firstname: form.firstname, lastname: form.lastname, idcard: form.idcard, phone: form.phone, address: form.address, weight: parseFloat(form.weightGram) || 0, amount: v.a, goldType: mode === "buy" ? "ขายออก (ร้านขายให้ลูกค้า)" : "ซื้อเข้า (ลูกค้าขายให้ร้าน)", remark: form.remark });
      clearForm();
      navigate("/bar-list");
    } catch (err) { notify((err as Error).message, "error"); }
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

  const handleClear = () => setForm({ firstname: "", lastname: "", idcard: "", address: "", phone: "", weightBaht: "", weightGram: "", amount: "", remark: "" });

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

        {/* Mode selector */}
        <Box sx={{ mb: 3 }}>
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

        <Grid container spacing={2.5}>
          <CustomerForm values={form} onChange={handleChange} onReadCard={handleReadCard} onClear={handleClear} />
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
            <TextField fullWidth label="จำนวนเงิน (บาท)" name="amount" value={form.amount}
              onChange={handleChange} type="number" inputProps={{ min: 0 }} sx={inputSx} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth multiline rows={2} label="หมายเหตุ" name="remark"
              value={form.remark} onChange={handleChange} sx={inputSx} />
          </Grid>
          <Grid item xs={12}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} justifyContent="flex-end">
              <Button variant="outlined" onClick={() => navigate("/")}
                sx={{ borderRadius: '10px', borderColor: G.border, color: G.textSub, minHeight: 44,
                  '&:hover': { borderColor: G.accent, color: G.accent } }}>
                ย้อนกลับ
              </Button>
              <Button startIcon={<PrintIcon />} variant="outlined"
                onClick={() => print({ type: "bar", firstname: form.firstname, lastname: form.lastname, idcard: form.idcard, phone: form.phone, address: form.address, weight: parseFloat(form.weightGram) || 0, amount: parseFloat(form.amount) || 0, goldType: mode === "buy" ? "ขายออก" : "ซื้อเข้า", remark: form.remark })}
                sx={{ borderRadius: '10px', borderColor: G.border, color: G.textSub, minHeight: 44,
                  '&:hover': { borderColor: G.accent, color: G.accent } }}>
                พิมพ์ใบเสร็จ
              </Button>
              <Button variant="outlined" onClick={handleSave}
                sx={{ borderRadius: '10px', borderColor: G.accent, color: G.accent, minHeight: 44, fontWeight: 600,
                  '&:hover': { bgcolor: alpha(G.accent, 0.08) } }}>
                บันทึก
              </Button>
              <Button variant="contained" onClick={handleSaveAndPrint}
                sx={{ borderRadius: '10px', bgcolor: G.accent, minHeight: 44, fontWeight: 600,
                  '&:hover': { bgcolor: alpha(G.accent, 0.85) } }}>
                บันทึก + พิมพ์
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </Paper>
      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={handleClose} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert severity={snackbar.severity} onClose={handleClose}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
