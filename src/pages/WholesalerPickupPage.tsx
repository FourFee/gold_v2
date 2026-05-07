// path: gold/src/pages/WholesalerPickupPage.tsx
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import {
  Box, TextField, Typography, Paper, Button, Stack, Grid, alpha,
  Autocomplete, Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions,
} from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { useTheme } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";

import { API_BASE, GOLD_BAHT_TO_GRAM_ORNAMENT } from "../config";
import { useNotify } from "../hooks/useNotify";
import { usePersistedForm } from "../hooks/usePersistedForm";
import { makeG } from "../utils/dashboardTokens";
import { Wholesaler } from "../types";

const MONO = '"JetBrains Mono", ui-monospace, monospace';

const INITIAL = {
  wholesaler_id: null as number | null,
  pickup_date: "",
  weight_baht: "",
  weight_gram: "",
  bar_used_baht: "",
  making_fee: "",
  remark: "",
};

export default function WholesalerPickupPage() {
  const theme = useTheme();
  const G = makeG(theme);
  const navigate = useNavigate();
  const { snackbar, notify, handleClose } = useNotify();

  const [form, setForm, clearForm] = usePersistedForm("wholesaler-pickup", INITIAL);
  const [wholesalers, setWholesalers] = useState<Wholesaler[]>([]);
  const [saving, setSaving] = useState(false);
  const [dateEdited, setDateEdited] = useState(false);

  // Add-wholesaler dialog
  const [addOpen, setAddOpen] = useState(false);
  const [newWsName, setNewWsName] = useState("");
  const [savingWs, setSavingWs] = useState(false);

  const fetchWholesalers = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/wholesalers/list`);
      if (!res.ok) throw new Error();
      setWholesalers(await res.json());
    } catch {
      notify("โหลดรายชื่อร้านส่งไม่สำเร็จ", "error");
    }
  }, [notify]);

  useEffect(() => { fetchWholesalers(); }, [fetchWholesalers]);

  // reset persisted date once on mount so it always defaults to "now"
  useEffect(() => { setForm(prev => ({ ...prev, pickup_date: "" })); }, []); // eslint-disable-line

  const selectedWs = wholesalers.find(w => w.id === form.wholesaler_id) || null;

  const handleWeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    const grams = parseFloat(v) * GOLD_BAHT_TO_GRAM_ORNAMENT;
    setForm(prev => ({
      ...prev,
      weight_baht: v,
      weight_gram: isNaN(grams) ? "" : grams.toFixed(2),
      // ถ้ายังไม่กรอกน้ำหนักทองแท่งที่ใช้แลก ให้ default เท่ากับน้ำหนักที่หยิบ
      bar_used_baht: prev.bar_used_baht === "" ? v : prev.bar_used_baht,
    }));
  };

  const handleField = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    if (!form.wholesaler_id) { notify("กรุณาเลือกร้านส่ง", "error"); return null; }
    const wb = parseFloat(form.weight_baht);
    if (isNaN(wb) || wb <= 0) { notify("น้ำหนักทองที่หยิบต้องมากกว่า 0", "error"); return null; }
    return { wb };
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const now = dayjs();
      const dateIso = (() => {
        if (!dateEdited) return now.toISOString();
        const d = dayjs(form.pickup_date);
        return d.isValid()
          ? d.hour(now.hour()).minute(now.minute()).second(now.second()).toISOString()
          : now.toISOString();
      })();

      const wb = parseFloat(form.weight_baht);
      const wg = parseFloat(form.weight_gram);
      const payload = {
        wholesaler_id: form.wholesaler_id,
        pickup_date: dateIso,
        weight_baht: wb,
        weight_gram: isNaN(wg) ? wb * GOLD_BAHT_TO_GRAM_ORNAMENT : wg,
        bar_used_baht: parseFloat(form.bar_used_baht) || wb,
        making_fee: parseFloat(form.making_fee) || 0,
        remark: form.remark,
      };

      const res = await fetch(`${API_BASE}/wholesaler-pickup/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        throw new Error(detail?.detail ? String(detail.detail) : `บันทึกไม่สำเร็จ (${res.status})`);
      }
      notify("บันทึกเรียบร้อย", "success");
      clearForm();
      navigate("/wholesaler-pickup-list");
    } catch (err) {
      notify((err as Error).message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleClear = () => { clearForm(); setDateEdited(false); };

  const handleAddWholesaler = async () => {
    const name = newWsName.trim();
    if (!name) { notify("ต้องระบุชื่อร้าน", "error"); return; }
    setSavingWs(true);
    try {
      const res = await fetch(`${API_BASE}/wholesalers/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, active: true }),
      });
      if (!res.ok) throw new Error();
      const created: Wholesaler = await res.json();
      setWholesalers(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setForm(prev => ({ ...prev, wholesaler_id: created.id }));
      setNewWsName("");
      setAddOpen(false);
      notify("เพิ่มร้านส่งเรียบร้อย", "success");
    } catch {
      notify("เพิ่มร้านไม่สำเร็จ", "error");
    } finally {
      setSavingWs(false);
    }
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

  const labelSx = {
    fontSize: 11, fontWeight: 700, color: G.textFaint, textTransform: 'uppercase' as const,
    letterSpacing: '.1em', mb: 1, fontFamily: MONO,
  };

  return (
    <Box sx={{ bgcolor: G.bg, minHeight: '100vh', p: { xs: 1.5, sm: 3, md: 4 } }}>
      <Paper elevation={0} sx={{
        p: { xs: 2.5, sm: 3.5 }, borderRadius: 3, maxWidth: 720, mx: 'auto',
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
            หยิบทองจากร้านส่ง
          </Typography>
          <Typography sx={{ color: G.textMuted, fontSize: 12.5, mt: 0.5, fontFamily: MONO }}>
            {new Date().toLocaleString("th-TH", { dateStyle: 'full', timeStyle: 'short' })}
          </Typography>
          <Typography sx={{ color: G.textMuted, fontSize: 12, mt: 0.5 }}>
            นำทองแท่งไปแลกทองรูปพรรณ จ่ายค่ากำเหน็จให้ร้านส่ง
          </Typography>
        </Box>

        <Grid container spacing={2.5}>
          {/* ร้านส่ง + วันที่ */}
          <Grid item xs={12} sm={8}>
            <Typography sx={labelSx}>ร้านส่ง</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Autocomplete
                fullWidth
                options={wholesalers}
                getOptionLabel={(o) => o.name}
                value={selectedWs}
                onChange={(_, v) => setForm(prev => ({ ...prev, wholesaler_id: v ? v.id : null }))}
                renderInput={(params) => <TextField {...params} placeholder="ค้นหาหรือเลือกร้าน" sx={inputSx} />}
                isOptionEqualToValue={(o, v) => o.id === v.id}
              />
              <Button onClick={() => setAddOpen(true)} variant="outlined"
                sx={{ borderRadius: '10px', borderColor: G.border, color: G.textSub, minWidth: 44, px: 1.5,
                  '&:hover': { borderColor: G.accent, color: G.accent } }}>
                <AddIcon sx={{ fontSize: 18 }} />
              </Button>
            </Box>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography sx={labelSx}>วันที่</Typography>
            <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="th">
              <DatePicker
                value={form.pickup_date && dayjs(form.pickup_date).isValid() ? dayjs(form.pickup_date) : null}
                onChange={(v) => {
                  setForm(prev => ({ ...prev, pickup_date: v?.isValid() ? v.format('YYYY-MM-DD') : "" }));
                  setDateEdited(!!v?.isValid());
                }}
                slotProps={{ textField: { fullWidth: true, placeholder: 'วันนี้', sx: inputSx } }}
              />
            </LocalizationProvider>
          </Grid>

          {/* Section: น้ำหนัก */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.5 }}>
              <Typography sx={{ ...labelSx, mb: 0, flexShrink: 0 }}>น้ำหนัก</Typography>
              <Box sx={{ flex: 1, height: '1px', bgcolor: G.border }} />
            </Box>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="น้ำหนักทองที่หยิบ (บาท)" name="weight_baht"
              value={form.weight_baht} onChange={handleWeightChange}
              type="number" inputProps={{ step: "0.01", min: 0 }} sx={inputSx} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="เทียบกรัม — คำนวณอัตโนมัติ" value={form.weight_gram}
              disabled sx={inputSx}
              InputProps={{ sx: { fontFamily: MONO, bgcolor: alpha(G.accent, 0.04) } }} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="น้ำหนักทองแท่งที่ใช้แลก (บาท)" name="bar_used_baht"
              value={form.bar_used_baht} onChange={handleField}
              type="number" inputProps={{ step: "0.01", min: 0 }} sx={inputSx}
              helperText="default = เท่ากับน้ำหนักที่หยิบ" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="ค่ากำเหน็จ (บาท)" name="making_fee"
              value={form.making_fee} onChange={handleField}
              type="number" inputProps={{ step: "1", min: 0 }} sx={inputSx} />
          </Grid>

          <Grid item xs={12}>
            <TextField fullWidth multiline rows={2} label="หมายเหตุ" name="remark"
              value={form.remark} onChange={handleField} sx={inputSx} />
          </Grid>

          <Grid item xs={12}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} justifyContent="flex-end">
              <Button variant="outlined" onClick={handleClear}
                sx={{ borderRadius: '10px', borderColor: G.border, color: G.textSub, minHeight: 44,
                  '&:hover': { borderColor: G.danger, color: G.danger } }}>
                เคลียร์ฟอร์ม
              </Button>
              <Button variant="contained" onClick={handleSave} disabled={saving}
                sx={{ borderRadius: '10px', bgcolor: G.accent, minHeight: 44, fontWeight: 600,
                  '&:hover': { bgcolor: alpha(G.accent, 0.85) } }}>
                {saving ? "กำลังบันทึก..." : "บันทึก"}
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      {/* Add wholesaler dialog */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)}
        PaperProps={{ sx: { borderRadius: 3, bgcolor: G.paper, border: `1px solid ${G.border}`, minWidth: { xs: 280, sm: 380 } } }}>
        <DialogTitle sx={{ color: G.text, fontWeight: 600 }}>เพิ่มร้านส่งใหม่</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="ชื่อร้าน" value={newWsName}
            onChange={e => setNewWsName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAddWholesaler(); }}
            sx={{ ...inputSx, mt: 1 }} autoFocus />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => setAddOpen(false)}
            sx={{ color: G.textSub, border: `1px solid ${G.border}`, borderRadius: '8px' }}>
            ยกเลิก
          </Button>
          <Button onClick={handleAddWholesaler} disabled={savingWs}
            sx={{ bgcolor: G.accent, color: '#fff', borderRadius: '8px',
              '&:hover': { bgcolor: alpha(G.accent, 0.85) } }}>
            {savingWs ? "กำลังบันทึก..." : "เพิ่ม"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open}
        autoHideDuration={snackbar.severity === 'error' ? 6000 : 3000}
        onClose={handleClose} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert severity={snackbar.severity} onClose={handleClose}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
