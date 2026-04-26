import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Box, TextField, Typography, Paper, Button, Stack, Grid, alpha } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { Snackbar, Alert } from "@mui/material";
import { API_BASE } from "../config";
import { useNotify } from "../hooks/useNotify";
import { makeG } from "../utils/dashboardTokens";

const MONO = '"JetBrains Mono", ui-monospace, monospace';

const FIELDS: { name: string; label: string; unit: string }[] = [
  { name: "redeem",       label: "ไถ่จำนำ",       unit: "บาท" },
  { name: "interest",     label: "ดอกเบี้ย",       unit: "บาท" },
  { name: "pawn",         label: "จำนำ",           unit: "บาท" },
  { name: "sellOut",      label: "ขายออก",         unit: "กรัม" },
  { name: "buyIn",        label: "ซื้อเข้า",       unit: "กรัม" },
  { name: "exchange",     label: "เปลี่ยน",        unit: "กรัม" },
  { name: "expenses",     label: "ค่าใช้จ่าย",    unit: "บาท" },
  { name: "diamondBuyIn", label: "ซื้อเข้าเพชร",  unit: "บาท" },
  { name: "diamondSellOut",label:"ขายออกเพชร",    unit: "บาท" },
  { name: "platedGold",   label: "ทองชุบ",         unit: "กรัม" },
];

const EMPTY = {
  date: "", redeem: "", interest: "", pawn: "", buyIn: "",
  exchange: "", sellOut: "", expenses: "0", diamondBuyIn: "0",
  diamondSellOut: "0", platedGold: "0",
};

export default function AllGoldTransactionsPage() {
  const theme = useTheme();
  const G = makeG(theme);
  const navigate = useNavigate();
  const { id } = useParams();
  const { snackbar, notify, handleClose } = useNotify();

  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState<number | null>(null);

  useEffect(() => {
    if (!id) return;
    setEditId(parseInt(id));
    fetch(`${API_BASE}/all-gold-transactions/${id}`)
      .then(r => r.json())
      .then(data => setForm({
        date: data.date?.split('T')[0] ?? "",
        redeem:        String(data.redeem        ?? ""),
        interest:      String(data.interest      ?? ""),
        pawn:          String(data.pawn          ?? ""),
        buyIn:         String(data.buyIn         ?? ""),
        exchange:      String(data.exchange      ?? ""),
        sellOut:       String(data.sellOut       ?? ""),
        expenses:      String(data.expenses      ?? 0),
        diamondBuyIn:  String(data.diamondBuyIn  ?? 0),
        diamondSellOut:String(data.diamondSellOut ?? 0),
        platedGold:    String(data.platedGold    ?? 0),
      }))
      .catch(() => notify("ไม่สามารถโหลดข้อมูลได้", "error"));
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async () => {
    const payload = {
      date:           form.date,
      redeem:         parseFloat(form.redeem        || "0"),
      interest:       parseFloat(form.interest      || "0"),
      pawn:           parseFloat(form.pawn          || "0"),
      buyIn:          parseFloat(form.buyIn         || "0"),
      exchange:       parseFloat(form.exchange      || "0"),
      sellOut:        parseFloat(form.sellOut       || "0"),
      expenses:       parseFloat(form.expenses      || "0"),
      diamondBuyIn:   parseFloat(form.diamondBuyIn  || "0"),
      diamondSellOut: parseFloat(form.diamondSellOut|| "0"),
      platedGold:     parseFloat(form.platedGold    || "0"),
    };
    try {
      const url = editId
        ? `${API_BASE}/all-gold-transactions/update/${editId}`
        : `${API_BASE}/all-gold-transactions/create`;
      const res = await fetch(url, {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || "บันทึกไม่สำเร็จ"); }
      notify("บันทึกข้อมูลสำเร็จ", "success");
      setTimeout(() => navigate("/all-transactions-list"), 800);
    } catch (err) { notify((err as Error).message, "error"); }
  };

  const totalBuyInExchange = (parseFloat(form.buyIn || "0") + parseFloat(form.exchange || "0")).toFixed(2);

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
        <Box sx={{ mb: 3, pb: 2.5, borderBottom: `1px solid ${G.border}` }}>
          <Typography sx={{
            fontSize: 18, fontWeight: 600, color: G.text, letterSpacing: '-.01em',
            display: 'flex', alignItems: 'center', gap: 1,
            '&::before': { content: '""', width: 4, height: 20, bgcolor: G.accent, borderRadius: 1, display: 'inline-block' },
          }}>
            {editId ? "แก้ไข" : "บันทึก"}รายการธุรกรรมทอง
          </Typography>
          <Typography sx={{ color: G.textMuted, fontSize: 12.5, mt: 0.5, fontFamily: MONO }}>
            {new Date().toLocaleString("th-TH", { dateStyle: 'full', timeStyle: 'short' })}
          </Typography>
        </Box>

        <Grid container spacing={2.5}>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="วันที่" name="date" type="date"
              value={form.date} onChange={handleChange}
              InputLabelProps={{ shrink: true }} sx={inputSx} />
          </Grid>

          {FIELDS.map(f => (
            <Grid item xs={12} sm={6} key={f.name}>
              <TextField fullWidth label={`${f.label} (${f.unit})`} name={f.name}
                value={(form as any)[f.name]} onChange={handleChange}
                type="number" inputProps={{ min: 0 }} sx={inputSx} />
            </Grid>
          ))}

          <Grid item xs={12}>
            <Box sx={{ p: 2, borderRadius: 2, bgcolor: alpha(G.accent, 0.06), border: `1px solid ${alpha(G.accent, 0.2)}` }}>
              <Typography sx={{ fontSize: 13, color: G.textSub }}>ผลรวม ซื้อเข้า + เปลี่ยน</Typography>
              <Typography sx={{ fontSize: 20, fontWeight: 700, color: G.accent, fontFamily: MONO }}>
                {totalBuyInExchange} <Typography component="span" sx={{ fontSize: 13, color: G.textMuted }}>กรัม</Typography>
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} justifyContent="flex-end">
              <Button variant="outlined" onClick={() => navigate("/all-transactions-list")}
                sx={{ borderRadius: '10px', borderColor: G.border, color: G.textSub, minHeight: 44,
                  '&:hover': { borderColor: G.accent, color: G.accent } }}>
                ย้อนกลับ
              </Button>
              <Button variant="contained" onClick={handleSubmit}
                sx={{ borderRadius: '10px', bgcolor: G.accent, minHeight: 44, fontWeight: 600,
                  '&:hover': { bgcolor: alpha(G.accent, 0.85) } }}>
                {editId ? "อัปเดต" : "บันทึก"}
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert severity={snackbar.severity} onClose={handleClose}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
