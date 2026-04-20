// File: src/pages/PawnPage.tsx

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  TextField, Typography, Paper, Button, Stack, Grid
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { API_BASE } from "../config";
import { Snackbar, Alert } from "@mui/material";
import { useNotify } from "../hooks/useNotify";
import { usePrint } from "../components/ReceiptPrint";
import PrintIcon from "@mui/icons-material/Print";

export default function PawnPage() {
  const theme = useTheme();
  const [form, setForm] = useState({
    date: "",
    firstname: "",
    lastname: "",
    idcard: "",
    address: "",
    phone: "",
    weight: "",
    amount: "",
    remark: "",
  });

  const { snackbar, notify, handleClose } = useNotify();
  const { print } = usePrint();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    try {
      const fixedForm = {
        ...form,
        weight: parseFloat(form.weight),
        amount: parseFloat(form.amount),
        date: new Date().toISOString(),
      };

      const response = await fetch(`${API_BASE}/pawn/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fixedForm),
      });

      if (!response.ok) throw new Error("❌ เกิดข้อผิดพลาดในการบันทึกข้อมูล");
      notify("✅ บันทึกข้อมูลเรียบร้อย", "success");
      print({
        type: "pawn",
        firstname: form.firstname,
        lastname:  form.lastname,
        idcard:    form.idcard,
        phone:     form.phone,
        address:   form.address,
        weight:    parseFloat(form.weight),
        amount:    parseFloat(form.amount),
        remark:    form.remark,
      });
      navigate("/pawn-list");
    } catch (error) {
      notify((error as Error).message, "error");
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
      date: "",
      firstname: "",
      lastname: "",
      idcard: "",
      address: "",
      phone: "",
      weight: "",
      amount: "",
      remark: "",
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
      <Typography variant="h5" gutterBottom color="primary" fontWeight={600}>
        📌 ฟอร์มจำนำทอง
      </Typography>

      <Stack direction="row" spacing={2} justifyContent="center" mb={2}>
        <Button variant="outlined" color="secondary" onClick={handleReadCard}>
          📥 อ่านบัตรประชาชน
        </Button>
        <Button variant="outlined" color="warning" onClick={handleClearForm}>
          🧹 เคลียร์ฟอร์ม
        </Button>
      </Stack>

      <Grid container spacing={2}>
        <Grid item xs={12}><TextField fullWidth label="วันที่จำนำ" name="date" value={new Date().toLocaleString()} disabled /></Grid>
        <Grid item xs={12} md={6}><TextField fullWidth label="ชื่อ" name="firstname" value={form.firstname} onChange={handleChange} /></Grid>
        <Grid item xs={12} md={6}><TextField fullWidth label="นามสกุล" name="lastname" value={form.lastname} onChange={handleChange} /></Grid>
        <Grid item xs={12} md={6}><TextField fullWidth label="เลขบัตรประชาชน" name="idcard" value={form.idcard} onChange={handleChange} /></Grid>
        <Grid item xs={12} md={6}><TextField fullWidth label="เบอร์โทรศัพท์" name="phone" value={form.phone} onChange={handleChange} /></Grid>
        <Grid item xs={12}><TextField fullWidth label="ที่อยู่" name="address" value={form.address} onChange={handleChange} /></Grid>
        <Grid item xs={12} md={6}><TextField fullWidth label="น้ำหนักทอง (กรัม)" name="weight" value={form.weight} onChange={handleChange} /></Grid>
        <Grid item xs={12} md={6}><TextField fullWidth label="จำนวนเงิน (บาท)" name="amount" value={form.amount} onChange={handleChange} /></Grid>
        <Grid item xs={12}><TextField fullWidth multiline rows={2} label="หมายเหตุ" name="remark" value={form.remark} onChange={handleChange} /></Grid>

        <Grid item xs={12}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="flex-end">
            <Button variant="contained" color="primary" onClick={handleSubmit}>💾 บันทึก + พิมพ์</Button>
            <Button variant="outlined" startIcon={<PrintIcon />} onClick={() => print({ type: "pawn", firstname: form.firstname, lastname: form.lastname, idcard: form.idcard, phone: form.phone, address: form.address, weight: parseFloat(form.weight)||0, amount: parseFloat(form.amount)||0, remark: form.remark })}>
              พิมพ์ใบเสร็จ
            </Button>
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
