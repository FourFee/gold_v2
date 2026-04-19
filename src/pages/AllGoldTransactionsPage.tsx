// path: gold/src/pages/AllGoldTransactionsPage.tsx

import React, { useState, useEffect } from "react"; // ✅ เพิ่ม useEffect
import { useNavigate, useParams } from "react-router-dom"; // ✅ เพิ่ม useParams
import {
  Box, TextField, Typography, Paper, Button, Stack, Grid,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";

import { API_BASE } from "../config";
import { useNotify } from "../hooks/useNotify";
import { Snackbar, Alert } from "@mui/material";

export default function AllGoldTransactionsPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { id } = useParams(); // ✅ ใช้ useParams เพื่อดึง ID จาก URL

  // 📌 State for simplified form data
  const [form, setForm] = useState({
    date: "",
    redeem: "",
    interest: "",
    pawn: "",
    buyIn: "",
    exchange: "",
    sellOut: "",
    expenses: "0",
    diamondBuyIn: "0",
    diamondSellOut: "0",
    platedGold: "0",
  });

  // 📌 State สำหรับเก็บ ID ของรายการที่กำลังแก้ไข
  const [editId, setEditId] = useState<number | null>(null);

  // 📌 API Endpoints
  const API = `${API_BASE}/all-gold-transactions`; // URL พื้นฐาน
  const { snackbar, notify, handleClose } = useNotify();

  // ✅ useEffect สำหรับโหลดข้อมูลเมื่อเข้าสู่โหมดแก้ไข
  useEffect(() => {
    if (id) { // ถ้ามี ID ใน URL แสดงว่าเป็นการแก้ไข
      setEditId(parseInt(id)); // เก็บ ID ไว้ใน state
      const fetchTransaction = async () => {
        try {
          const response = await fetch(`${API_BASE}/all-gold-transactions/${id}`);        // GET detail
 // สมมติว่ามี endpoint /detail/{id}
          if (response.ok) {
            const data = await response.json();
            // ✅ ตั้งค่า form ด้วยข้อมูลที่ดึงมา
            // ใช้ data.propertyName || "" เพื่อป้องกันค่า null/undefined และแปลงตัวเลขเป็น string
            setForm({
              date: data.date.split('T')[0], // แปลง datetime string เป็น YYYY-MM-DD สำหรับ type="date"
              redeem: String(data.redeem || ""),
              interest: String(data.interest || ""),
              pawn: String(data.pawn || ""),
              buyIn: String(data.buyIn || ""),
              exchange: String(data.exchange || ""),
              sellOut: String(data.sellOut || ""),
              expenses: String(data.expenses || ""),
              diamondBuyIn: String(data.diamondBuyIn || ""),
              diamondSellOut: String(data.diamondSellOut || ""),
              platedGold: String(data.platedGold || ""),
              // ไม่ต้องใส่ total_buy_in_exchange หรือ id ใน form เพราะมันถูกคำนวณ/ส่งผ่าน URL
            });
          } else {
            notify("ไม่สามารถโหลดรายละเอียดรายการได้", "error");
          }
        } catch (err) {
          console.error("Error submitting form:", err);
          // ✅ เปลี่ยนจาก alert(`❌ เกิดข้อผิดพลาด...`)
          notify(`เกิดข้อผิดพลาด: ${(err as Error).message}`, "error");
        }
      };
      fetchTransaction();
    }
  }, [id]); // ให้ useEffect ทำงานเมื่อ id ใน URL เปลี่ยนไป

  const totalBuyInExchange = (parseFloat(form.buyIn || "0") + parseFloat(form.exchange || "0")).toFixed(2);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prevForm) => ({
      ...prevForm,
      [name]: value,
    }));
  };

  // 📌 Handler for form submission
  const handleSubmit = async () => {
    try {
      // ✅ สร้าง Payload ที่จะส่งไป Backend (ไม่มี id และ total_buy_in_exchange)
      const payloadData = {
        date: form.date, // Backend ต้องการ date เป็น string YYYY-MM-DDTHH:MM:SS
        redeem: parseFloat(form.redeem || "0"),
        interest: parseFloat(form.interest || "0"),
        pawn: parseFloat(form.pawn || "0"),
        buyIn: parseFloat(form.buyIn || "0"),
        exchange: parseFloat(form.exchange || "0"),
        sellOut: parseFloat(form.sellOut || "0"),
        expenses: parseFloat(form.expenses || "0"),
        diamondBuyIn: parseFloat(form.diamondBuyIn || "0"),
        diamondSellOut: parseFloat(form.diamondSellOut || "0"),
        platedGold: parseFloat(form.platedGold || "0"),
      };

      let response;
      if (editId) { // ✅ ถ้ามี editId (โหมดแก้ไข) ให้ทำ PUT request
        response = await fetch(`${API_BASE}/all-gold-transactions/update/${editId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payloadData),
        });
      } else { // ✅ ถ้าไม่มี editId (โหมดสร้างใหม่) ให้ทำ POST request
        response = await fetch(`${API_BASE}/all-gold-transactions/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payloadData),
        });
      }

      if (response.ok) {
        notify("บันทึกข้อมูลสำเร็จ", "success"); // ✅ แทน alert("✅ บันทึกข้อมูลสำเร็จ!")
        setForm({
          date: "", redeem: "", interest: "", pawn: "", buyIn: "",
          exchange: "", sellOut: "", expenses: "0", diamondBuyIn: "0",
          diamondSellOut: "0", platedGold: "0",
        });
        setEditId(null);
        setTimeout(() => navigate("/all-transactions-list"), 1000); // ✅ แทน navigate(...)
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to save data");
      }
      } catch (err) {
        console.error("Error submitting form:", err);
        notify(`เกิดข้อผิดพลาด: ${(err as Error).message}`, "error"); // ✅ แทน alert(`❌ ...`)
      }
  };

  return (
    <Box maxWidth="md" mx="auto" mt={4}>
      <Paper elevation={4} sx={{ p: 4, borderRadius: 3 }}>
        <Typography variant="h5" gutterBottom color="primary" fontWeight={600}>
          📝 {editId ? "แก้ไข" : "บันทึก"} รายการธุรกรรมทองทั้งหมด
        </Typography>

        <Grid container spacing={3}>
          {/* ... (Your existing TextField components for date, redeem, interest, etc.) ... */}
          {/* Date Field */}
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="วันที่"
              name="date"
              type="date"
              value={form.date}
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="ไถ่ (บาท)"
              name="redeem"
              value={form.redeem}
              onChange={handleChange}
              type="number"
              inputProps={{ min: "0" }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="ดอก (บาท)"
              name="interest"
              value={form.interest}
              onChange={handleChange}
              type="number"
              inputProps={{ min: "0" }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="จำนำ (บาท)"
              name="pawn"
              value={form.pawn}
              onChange={handleChange}
              type="number"
              inputProps={{ min: "0" }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="ค่าใช้จ่าย (บาท)"
              name="expenses"
              value={form.expenses}
              onChange={handleChange}
              type="number"
              inputProps={{ min: "0" }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="ซื้อเข้า (กรัม)"
              name="buyIn"
              value={form.buyIn}
              onChange={handleChange}
              type="number"
              inputProps={{ min: "0" }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="เปลี่ยน (กรัม)"
              name="exchange"
              value={form.exchange}
              onChange={handleChange}
              type="number"
              inputProps={{ min: "0" }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="ขายออก (กรัม)"
              name="sellOut"
              value={form.sellOut}
              onChange={handleChange}
              type="number"
              inputProps={{ min: "0" }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="ซื้อเข้าเพชร (บาท)"
              name="diamondBuyIn"
              value={form.diamondBuyIn}
              onChange={handleChange}
              type="number"
              inputProps={{ min: "0" }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="ขายออกเพชร (บาท)"
              name="diamondSellOut"
              value={form.diamondSellOut}
              onChange={handleChange}
              type="number"
              inputProps={{ min: "0" }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="ทองชุบ (กรัม)"
              name="platedGold"
              value={form.platedGold}
              onChange={handleChange}
              type="number"
              inputProps={{ min: "0" }}
            />
          </Grid>

          <Grid item xs={12}>
            <Typography variant="h6" mt={2} fontWeight={600}>
              ผลรวม ซื้อเข้า + เปลี่ยน: <span style={{ color: theme.palette.primary.main }}>{totalBuyInExchange} กรัม</span>
            </Typography>
          </Grid>

          {/* Action Buttons */}
          <Grid item xs={12}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="flex-end">
              <Button variant="contained" color="primary" onClick={handleSubmit}>
                {editId ? "อัปเดตข้อมูล" : "บันทึกข้อมูล"}
              </Button>
              <Button variant="outlined" color="info" onClick={() => navigate("/")}>
                กลับหน้าแรก
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </Paper>
      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert severity={snackbar.severity} onClose={handleClose}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}