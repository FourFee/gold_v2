import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, TextField, Typography, Paper, Button, Stack, alpha } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Snackbar, Alert } from '@mui/material';
import { API_BASE, GOLD_BAHT_TO_GRAM_BAR } from "../config";
import { useNotify } from "../hooks/useNotify";
import { makeG } from "../utils/dashboardTokens";

const MONO = '"JetBrains Mono", ui-monospace, monospace';

export default function BarGoldExchange() {
  const theme = useTheme();
  const G = makeG(theme);
  const navigate = useNavigate();
  const { snackbar, notify, handleClose } = useNotify();

  const [customerName, setCustomerName] = useState('');
  const [weightBaht, setWeightBaht]     = useState('');
  const [loading, setLoading]           = useState(false);

  const weightGram = () => {
    const v = parseFloat(weightBaht);
    return !isNaN(v) ? (v * GOLD_BAHT_TO_GRAM_BAR).toFixed(2) : '0.00';
  };

  const handleSubmit = async () => {
    const baht = parseFloat(weightBaht);
    if (!customerName.trim()) { notify("กรุณากรอกชื่อลูกค้า", "error"); return; }
    if (isNaN(baht) || baht < 5) { notify("น้ำหนักต้องไม่น้อยกว่า 5 บาท", "error"); return; }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/bar-gold-exchange`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerName, weightBaht: baht, weightGram: parseFloat(weightGram()) }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || "บันทึกไม่สำเร็จ"); }
      notify("บันทึกการแลกเปลี่ยนสำเร็จ", "success");
      setTimeout(() => navigate("/"), 800);
    } catch (err) { notify((err as Error).message, "error"); }
    finally { setLoading(false); }
  };

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
        p: { xs: 2.5, sm: 3.5 }, borderRadius: 3, maxWidth: 560, mx: 'auto',
        bgcolor: G.paper, border: `1px solid ${G.border}`,
        boxShadow: '0 1px 0 rgba(27,23,19,.04),0 8px 24px -14px rgba(27,23,19,.14)',
      }}>
        <Box sx={{ mb: 3, pb: 2.5, borderBottom: `1px solid ${G.border}` }}>
          <Typography sx={{
            fontSize: 18, fontWeight: 600, color: G.text, letterSpacing: '-.01em',
            display: 'flex', alignItems: 'center', gap: 1,
            '&::before': { content: '""', width: 4, height: 20, bgcolor: G.accent, borderRadius: 1, display: 'inline-block' },
          }}>
            แลกเปลี่ยนทองแท่ง
          </Typography>
          <Typography sx={{ color: G.textMuted, fontSize: 12.5, mt: 0.5, fontFamily: MONO }}>
            {new Date().toLocaleString("th-TH", { dateStyle: 'full', timeStyle: 'short' })}
          </Typography>
          <Typography sx={{ color: G.textMuted, fontSize: 12, mt: 0.5 }}>
            ลดสต็อกทองแท่ง — ขั้นต่ำ 5 บาท
          </Typography>
        </Box>

        <Stack spacing={2.5}>
          <TextField fullWidth label="ชื่อลูกค้า" value={customerName}
            onChange={e => setCustomerName(e.target.value)} sx={inputSx} />

          <TextField fullWidth label="น้ำหนักทองแท่งที่นำมาแลก (บาท)" type="number"
            inputProps={{ step: "0.01", min: "5" }}
            value={weightBaht} onChange={e => setWeightBaht(e.target.value)}
            helperText="ขั้นต่ำ 5 บาท" sx={inputSx} />

          <Box sx={{ p: 2, borderRadius: 2, bgcolor: alpha(G.accent, 0.06), border: `1px solid ${alpha(G.accent, 0.2)}` }}>
            <Typography sx={{ fontSize: 13, color: G.textSub }}>น้ำหนักเทียบกรัม</Typography>
            <Typography sx={{ fontSize: 22, fontWeight: 700, color: G.accent, fontFamily: MONO }}>
              {weightGram()} <Typography component="span" sx={{ fontSize: 13, color: G.textMuted }}>กรัม</Typography>
            </Typography>
          </Box>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} justifyContent="flex-end">
            <Button variant="outlined" onClick={() => navigate("/")}
              sx={{ borderRadius: '10px', borderColor: G.border, color: G.textSub, minHeight: 44,
                '&:hover': { borderColor: G.accent, color: G.accent } }}>
              ย้อนกลับ
            </Button>
            <Button variant="contained" onClick={handleSubmit} disabled={loading}
              sx={{ borderRadius: '10px', bgcolor: G.accent, minHeight: 44, fontWeight: 600,
                '&:hover': { bgcolor: alpha(G.accent, 0.85) } }}>
              {loading ? "กำลังบันทึก..." : "ยืนยันการแลกเปลี่ยน"}
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert severity={snackbar.severity} onClose={handleClose}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
