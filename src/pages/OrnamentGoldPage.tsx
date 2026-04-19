// path: gold/src/pages/OrnamentGoldPage.tsx

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, TextField, Typography, Paper, Button, Stack, Grid, ToggleButton, ToggleButtonGroup
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { API_BASE } from "../config";
import { Snackbar, Alert } from "@mui/material";
import { useNotify } from "../hooks/useNotify";

export default function OrnamentGoldPage() {
  const theme = useTheme();
  const [form, setForm] = useState({
    date: new Date().toISOString(),
    firstname: "",
    lastname: "",
    idcard: "",
    address: "",
    phone: "",
    weight: "",
    amount: "",
    remark: ""
  });
  const { snackbar, notify, handleClose } = useNotify();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"buy" | "sell">("sell");

  const handleModeChange = (_: any, newMode: "buy" | "sell") => {
    if (newMode !== null) setMode(newMode);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    try {
      const response = await fetch(`${API_BASE}/ornament-gold/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, mode, amount: parseFloat(form.amount) }),
      });

      if (!response.ok) throw new Error("❌ บันทึกไม่สำเร็จ");
      notify("✅ บันทึกเรียบร้อย", "success");
      navigate("/ornament-list");
    } catch (err) {
      notify((err as Error).message, "error");
    }
  };

  const handleReadCard = async () => {
    try {
      const res = await fetch("/api/idcard/latest");
      const data = await res.json();

      if (!data?.citizen_id) {
        notify("❌ ไม่พบข้อมูลบัตร", "error");
        return;
      }

      const [fname, lname = ""] = data.name_th.split(" ");
      setForm(prev => ({
        ...prev,
        idcard: data.citizen_id,
        firstname: fname,
        lastname: lname,
        address: data.address,
      }));
    } catch (err) {
      console.error("❌ ดึงข้อมูลบัตรล้มเหลว:", err);
      notify("❌ ดึงข้อมูลบัตรล้มเหลว", "error");
    }
  };

  const handleClearForm = () => {
    setForm({
      date: new Date().toISOString(),
      firstname: "",
      lastname: "",
      idcard: "",
      address: "",
      phone: "",
      weight: "",
      amount: "",
      remark: ""
    });
  };

  return (
    <Paper
      elevation={4}
      sx={{
        p: 3,
        borderRadius: 3,
        maxWidth: 800,
        mx: "auto",
        bgcolor: theme.palette.background.paper,
      }}
    >
      <Typography variant="h5" color="primary" fontWeight={600} gutterBottom>
        💍 ซื้อขายทองรูปพรรณ
      </Typography>

      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Box display="flex" justifyContent="center" mb={2}>
            <ToggleButtonGroup value={mode} exclusive onChange={handleModeChange} color="primary">
              <ToggleButton value="buy">🛒 ขายออก</ToggleButton>
              <ToggleButton value="sell">💰 ซื้อเข้า</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <Stack direction="row" spacing={2} justifyContent="center" mb={2}>
            <Button variant="outlined" color="secondary" onClick={handleReadCard}>
              📥 อ่านบัตรประชาชน
            </Button>
            <Button variant="outlined" color="warning" onClick={handleClearForm}>
              🧹 เคลียร์ฟอร์ม
            </Button>
          </Stack>
        </Grid>

        <Grid item xs={12}><TextField fullWidth label="วันที่" name="date" value={new Date().toLocaleString()} disabled /></Grid>
        <Grid item xs={12} md={6}><TextField fullWidth label="ชื่อ" name="firstname" value={form.firstname} onChange={handleChange} /></Grid>
        <Grid item xs={12} md={6}><TextField fullWidth label="นามสกุล" name="lastname" value={form.lastname} onChange={handleChange} /></Grid>
        <Grid item xs={12} md={6}><TextField fullWidth label="เลขบัตรประชาชน" name="idcard" value={form.idcard} onChange={handleChange} /></Grid>
        <Grid item xs={12} md={6}><TextField fullWidth label="เบอร์โทรศัพท์" name="phone" value={form.phone} onChange={handleChange} /></Grid>
        <Grid item xs={12}><TextField fullWidth label="ที่อยู่" name="address" value={form.address} onChange={handleChange} /></Grid>
        <Grid item xs={12}><TextField fullWidth label="น้ำหนักทอง (กรัม)" name="weight" value={form.weight} onChange={handleChange} /></Grid>
        <Grid item xs={12}><TextField fullWidth label="จำนวนเงิน (บาท)" name="amount" value={form.amount} onChange={handleChange} /></Grid>
        <Grid item xs={12}><TextField fullWidth multiline rows={2} label="หมายเหตุ" name="remark" value={form.remark} onChange={handleChange} /></Grid>

        <Grid item xs={12}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="flex-end">
            <Button variant="contained" color="primary" onClick={handleSubmit}>💾 บันทึกข้อมูล</Button>
            <Button variant="outlined" onClick={() => navigate("/")}>⬅️ ย้อนกลับ</Button>
          </Stack>
        </Grid>
      </Grid>
      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={handleClose}
                      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
                      <Alert severity={snackbar.severity} onClose={handleClose}>
                        {snackbar.message}
                      </Alert>
      </Snackbar>
    </Paper>
  );
}
