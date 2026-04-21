import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TextField, Typography, Paper, Button, Stack, Grid } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { API_BASE } from "../config";
import { Snackbar, Alert } from "@mui/material";
import { useNotify } from "../hooks/useNotify";
import { usePrint } from "../components/ReceiptPrint";
import PrintIcon from "@mui/icons-material/Print";
import { validateThaiId } from "../utils/validateThaiId";
import CustomerForm from "../components/CustomerForm";

export default function PawnPage() {
  const theme = useTheme();
  const [form, setForm] = useState({
    firstname: "", lastname: "", idcard: "", address: "", phone: "",
    weight: "", amount: "", remark: "",
  });
  const { snackbar, notify, handleClose } = useNotify();
  const { print } = usePrint();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    const w = parseFloat(form.weight);
    const a = parseFloat(form.amount);
    if (!form.firstname || !form.idcard) { notify("กรุณากรอกชื่อและเลขบัตร", "error"); return; }
    if (form.idcard && !validateThaiId(form.idcard.replace(/\D/g, ""))) { notify("เลขบัตรประชาชนไม่ถูกต้อง", "error"); return; }
    if (isNaN(w) || w <= 0) { notify("น้ำหนักต้องมากกว่า 0", "error"); return; }
    if (isNaN(a) || a <= 0) { notify("จำนวนเงินต้องมากกว่า 0", "error"); return; }
    try {
      const res = await fetch(`${API_BASE}/pawn/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, weight: w, amount: a, date: new Date().toISOString() }),
      });
      if (!res.ok) throw new Error("❌ เกิดข้อผิดพลาดในการบันทึกข้อมูล");
      notify("✅ บันทึกข้อมูลเรียบร้อย", "success");
      print({ type: "pawn", firstname: form.firstname, lastname: form.lastname, idcard: form.idcard, phone: form.phone, address: form.address, weight: w, amount: a, remark: form.remark });
      navigate("/pawn-list");
    } catch (error) {
      notify((error as Error).message, "error");
    }
  };

  const handleReadCard = async () => {
    try {
      const res = await fetch("/api/idcard/latest");
      const data = await res.json();
      if (!data?.citizen_id) { notify("❌ ไม่พบข้อมูลบัตร", "error"); return; }
      const [fname, lname = ""] = data.name_th.split(" ");
      setForm(prev => ({ ...prev, idcard: data.citizen_id, firstname: fname, lastname: lname, address: data.address }));
    } catch {
      notify("❌ ดึงข้อมูลบัตรล้มเหลว", "error");
    }
  };

  const handleClear = () => setForm({ firstname: "", lastname: "", idcard: "", address: "", phone: "", weight: "", amount: "", remark: "" });

  return (
    <Paper elevation={4} sx={{ p: 3, borderRadius: 3, maxWidth: 800, mx: "auto", bgcolor: theme.palette.background.paper }}>
      <Typography variant="h5" gutterBottom color="primary" fontWeight={600}>
        📌 ฟอร์มจำนำทอง
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <TextField fullWidth label="วันที่จำนำ" value={new Date().toLocaleString("th-TH")} disabled />
        </Grid>
        <CustomerForm values={form} onChange={handleChange} onReadCard={handleReadCard} onClear={handleClear} />
        <Grid item xs={12} md={6}>
          <TextField fullWidth label="น้ำหนักทอง (กรัม)" name="weight" value={form.weight} onChange={handleChange} type="number" inputProps={{ min: 0 }} />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth label="จำนวนเงิน (บาท)" name="amount" value={form.amount} onChange={handleChange} type="number" inputProps={{ min: 0 }} />
        </Grid>
        <Grid item xs={12}>
          <TextField fullWidth multiline rows={2} label="หมายเหตุ" name="remark" value={form.remark} onChange={handleChange} />
        </Grid>
        <Grid item xs={12}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="flex-end">
            <Button variant="contained" color="primary" onClick={handleSubmit}>💾 บันทึก + พิมพ์</Button>
            <Button variant="outlined" startIcon={<PrintIcon />}
              onClick={() => print({ type: "pawn", firstname: form.firstname, lastname: form.lastname, idcard: form.idcard, phone: form.phone, address: form.address, weight: parseFloat(form.weight) || 0, amount: parseFloat(form.amount) || 0, remark: form.remark })}>
              พิมพ์ใบเสร็จ
            </Button>
            <Button variant="outlined" onClick={() => navigate("/")}>⬅️ ย้อนกลับ</Button>
          </Stack>
        </Grid>
      </Grid>
      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={handleClose} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert severity={snackbar.severity} onClose={handleClose}>{snackbar.message}</Alert>
      </Snackbar>
    </Paper>
  );
}
