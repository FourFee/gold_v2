import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { Box, TextField, Typography, Paper, Button, Stack, Grid, alpha, Tooltip, IconButton } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
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
import { useGoldPrice } from "../hooks/useGoldPrice";

const MONO = '"JetBrains Mono", ui-monospace, monospace';

const MODES = [
  { value: 'buy',  label: 'ขายออก', sub: 'ร้านขายให้ลูกค้า', Icon: TrendingUpIcon  },
  { value: 'sell', label: 'ซื้อเข้า', sub: 'ลูกค้าขายให้ร้าน', Icon: TrendingDownIcon },
] as const;

const BAR_INITIAL = {
  date: dayjs().format('YYYY-MM-DD'),
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
  const { price, loading: priceLoading, error: priceError, refetch, barBuy, barSell } = useGoldPrice();

  // auto-fill amount เมื่อ weight หรือ mode เปลี่ยน
  useEffect(() => {
    if (!price || !form.weightBaht) return;
    const wb = parseFloat(form.weightBaht);
    if (isNaN(wb) || wb <= 0) return;
    const pricePerBaht = mode === "buy" ? barSell(price) : barBuy(price);
    setForm(prev => ({ ...prev, amount: (wb * pricePerBaht).toFixed(2) }));
  }, [form.weightBaht, mode, price]);

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
      body: JSON.stringify({ ...form, mode, weightBaht: wb, weightGram: parseFloat(form.weightGram), amount: a, date: dayjs(form.date).toISOString() }),
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

  const handleClear = () => clearForm();

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

        {/* Live gold price banner */}
        <Box sx={{ mb: 2.5, p: 1.5, borderRadius: '10px', border: `1px solid ${alpha(G.accent, 0.25)}`,
          bgcolor: alpha(G.accent, 0.04), display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: priceError ? G.danger : G.success,
              animation: priceLoading ? undefined : 'pulse 2s infinite',
              '@keyframes pulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: .4 } } }} />
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: G.textMuted, textTransform: 'uppercase', letterSpacing: '.1em', fontFamily: MONO }}>
              {priceError ? 'ไม่สามารถดึงราคาได้' : priceLoading ? 'กำลังโหลดราคา...' : `ราคาทอง · ${price?.update_time ?? ''}`}
            </Typography>
          </Box>
          {price && (
            <Box sx={{ display: 'flex', gap: 2.5, flex: 1, flexWrap: 'wrap' }}>
              <Box>
                <Typography sx={{ fontSize: 10, color: G.textMuted }}>แท่ง · รับซื้อ</Typography>
                <Typography sx={{ fontFamily: MONO, fontWeight: 700, fontSize: 15, color: G.success }}>
                  ฿{price.price.gold_bar.buy}
                </Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: 10, color: G.textMuted }}>แท่ง · ขายออก</Typography>
                <Typography sx={{ fontFamily: MONO, fontWeight: 700, fontSize: 15, color: G.danger }}>
                  ฿{price.price.gold_bar.sell}
                </Typography>
              </Box>
            </Box>
          )}
          <Tooltip title="รีเฟรชราคา">
            <IconButton size="small" onClick={refetch} disabled={priceLoading}
              sx={{ color: G.textMuted, '&:hover': { color: G.accent } }}>
              <RefreshIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
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
            <TextField fullWidth name="date" type="date"
              value={form.date} onChange={handleChange}
              InputLabelProps={{ shrink: true }} sx={inputSx} />
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
            <TextField fullWidth label="จำนวนเงิน (บาท)" name="amount" value={form.amount}
              onChange={handleChange} type="number" inputProps={{ min: 0 }} sx={inputSx} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth multiline rows={2} label="หมายเหตุ" name="remark"
              value={form.remark} onChange={handleChange} sx={inputSx} />
          </Grid>
          <Grid item xs={12}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} justifyContent="flex-end">
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
