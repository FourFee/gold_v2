import React from "react";
import { useNavigate } from "react-router-dom";
import { Box, TextField, Typography, Paper, Button, Stack, Grid, alpha } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { API_BASE } from "../config";
import { Snackbar, Alert } from "@mui/material";
import { useNotify } from "../hooks/useNotify";
import { usePersistedForm } from "../hooks/usePersistedForm";
import { usePrint } from "../components/ReceiptPrint";
import PrintIcon from "@mui/icons-material/Print";
import { validateThaiId } from "../utils/validateThaiId";
import CustomerForm from "../components/CustomerForm";
import { makeG } from "../utils/dashboardTokens";

const PAWN_INITIAL = {
  firstname: "", lastname: "", idcard: "", address: "", phone: "",
  weight: "", amount: "", remark: "",
};

const MONO = '"JetBrains Mono", ui-monospace, monospace';

export default function PawnPage() {
  const theme = useTheme();
  const G = makeG(theme);
  const [form, setForm, clearForm] = usePersistedForm("pawn", PAWN_INITIAL);
  const { snackbar, notify, handleClose } = useNotify();
  const { print } = usePrint();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const validate = () => {
    const w = parseFloat(form.weight);
    const a = parseFloat(form.amount);
    if (!form.firstname || !form.idcard) { notify("กรุณากรอกชื่อและเลขบัตร", "error"); return null; }
    if (form.idcard && !validateThaiId(form.idcard.replace(/\D/g, ""))) { notify("เลขบัตรประชาชนไม่ถูกต้อง", "error"); return null; }
    if (isNaN(w) || w <= 0) { notify("น้ำหนักต้องมากกว่า 0", "error"); return null; }
    if (isNaN(a) || a <= 0) { notify("จำนวนเงินต้องมากกว่า 0", "error"); return null; }
    return { w, a };
  };

  const saveToServer = async (w: number, a: number) => {
    const res = await fetch(`${API_BASE}/pawn/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, weight: w, amount: a, date: new Date().toISOString() }),
    });
    if (!res.ok) throw new Error("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
  };

  const handleSave = async () => {
    const v = validate(); if (!v) return;
    try {
      await saveToServer(v.w, v.a);
      notify("บันทึกข้อมูลเรียบร้อย", "success");
      clearForm();
      navigate("/pawn-list");
    } catch (error) { notify((error as Error).message, "error"); }
  };

  const handleSaveAndPrint = async () => {
    const v = validate(); if (!v) return;
    try {
      await saveToServer(v.w, v.a);
      notify("บันทึกข้อมูลเรียบร้อย", "success");
      print({ type: "pawn", firstname: form.firstname, lastname: form.lastname, idcard: form.idcard, phone: form.phone, address: form.address, weight: v.w, amount: v.a, remark: form.remark });
      clearForm();
      navigate("/pawn-list");
    } catch (error) { notify((error as Error).message, "error"); }
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
            ฟอร์มจำนำทอง
          </Typography>
          <Typography sx={{ color: G.textMuted, fontSize: 12.5, mt: 0.5, fontFamily: MONO }}>
            {new Date().toLocaleString("th-TH", { dateStyle: 'full', timeStyle: 'short' })}
          </Typography>
        </Box>

        <Grid container spacing={2.5}>
          <CustomerForm values={form} onChange={handleChange} onReadCard={handleReadCard} onClear={handleClear} />
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="น้ำหนักทอง (กรัม)" name="weight" value={form.weight}
              onChange={handleChange} type="number" inputProps={{ min: 0 }} sx={inputSx} />
          </Grid>
          <Grid item xs={12} sm={6}>
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
                onClick={() => print({ type: "pawn", firstname: form.firstname, lastname: form.lastname, idcard: form.idcard, phone: form.phone, address: form.address, weight: parseFloat(form.weight) || 0, amount: parseFloat(form.amount) || 0, remark: form.remark })}
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
