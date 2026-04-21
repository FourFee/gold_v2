//path: gold/src/pages/BarGoldList.tsx
import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Box, Paper, Typography, Table, TableHead, TableRow, TableCell, TableBody,
  Button, TextField, IconButton, TablePagination, Grid, alpha, CircularProgress,
  Skeleton, InputAdornment, Tooltip,
} from "@mui/material";
import { Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import { Edit, Save, Delete, Search as SearchIcon, TrendingUp, TrendingDown, Refresh } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import dayjs, { Dayjs } from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { Snackbar, Alert } from "@mui/material";
import { API_BASE } from "../config";
import { useNotify } from "../hooks/useNotify";
import { makeG } from "../utils/dashboardTokens";
import { BarGoldRecord } from "../types";

dayjs.extend(utc);

const MONO = '"JetBrains Mono", ui-monospace, monospace';

type BarGoldEditForm = Omit<Partial<BarGoldRecord>, 'date' | 'weightBaht' | 'weightGram' | 'amount'> & {
  date?: Dayjs | null;
  weightBaht?: number | string;
  weightGram?: number | string;
  amount?: number | string;
};

const PERIODS = [
  { value: 'day',   label: 'วัน'      },
  { value: 'week',  label: 'สัปดาห์'  },
  { value: 'month', label: 'เดือน'    },
  { value: 'all',   label: 'ทั้งหมด'  },
] as const;

const MODES = [
  { value: 'buy',  label: 'ขายออก', Icon: TrendingUp  },
  { value: 'sell', label: 'ซื้อเข้า', Icon: TrendingDown },
] as const;

export default function BarGoldList() {
  const theme = useTheme();
  const G = makeG(theme);
  const navigate = useNavigate();
  const { snackbar, notify, handleClose } = useNotify();

  const [data, setData]             = useState<BarGoldRecord[]>([]);
  const [mode, setMode]             = useState<"buy" | "sell">("buy");
  const [editIndex, setEditIndex]   = useState<number | null>(null);
  const [form, setForm]             = useState<BarGoldEditForm>({});
  const [deleting, setDeleting]     = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [page, setPage]             = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("all");
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");

  const API = `${API_BASE}/bar-gold`;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/list?sort_order=desc&period=${selectedPeriod}`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      setData(Array.isArray(json) ? json : []);
      setPage(0);
    } catch {
      notify("โหลดข้อมูลไม่สำเร็จ", "error");
    } finally {
      setLoading(false);
    }
  }, [API, selectedPeriod]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredData = useMemo(() => data.filter(item =>
    item.mode === mode && (
      new Date(item.date).toLocaleDateString("th-TH").includes(search) ||
      item.firstname.toLowerCase().includes(search.toLowerCase()) ||
      item.lastname.toLowerCase().includes(search.toLowerCase()) ||
      item.idcard.includes(search) ||
      item.phone.includes(search)
    )
  ), [data, mode, search]);

  const displayedData = filteredData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const totals = useMemo(() => filteredData.reduce((acc, item) => ({
    totalWeightBaht: acc.totalWeightBaht + (item.weightBaht || 0),
    totalWeightGram: acc.totalWeightGram + (item.weightGram || 0),
    totalAmount:     acc.totalAmount     + (item.amount     || 0),
  }), { totalWeightBaht: 0, totalWeightGram: 0, totalAmount: 0 }), [filteredData]);

  const handleDelete = (id: number) => { setPendingDeleteId(id); setConfirmOpen(true); };

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;
    setDeleting(pendingDeleteId); setConfirmOpen(false);
    try {
      await fetch(`${API}/delete/${pendingDeleteId}`, { method: "DELETE" });
      await fetchData();
    } catch { notify("ลบข้อมูลไม่สำเร็จ", "error"); }
    finally { setDeleting(null); setPendingDeleteId(null); }
  };

  const startEdit = (i: number) => {
    setEditIndex(i);
    const item = filteredData[page * rowsPerPage + i];
    setForm({ ...item, date: item.date ? dayjs(item.date) : dayjs(),
      weightBaht: String(item.weightBaht || ""),
      weightGram: String(item.weightGram || ""),
      amount:     String(item.amount     || ""),
    });
  };

  const saveEdit = async () => {
    if (editIndex === null) return;
    const id = filteredData[page * rowsPerPage + editIndex].id;
    try {
      const res = await fetch(`${API}/update/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          date:       form.date ? (form.date as Dayjs).toISOString() : null,
          weightBaht: parseFloat(String(form.weightBaht || 0)),
          weightGram: parseFloat(String(form.weightGram || 0)),
          amount:     parseFloat(String(form.amount     || 0)),
        }),
      });
      if (!res.ok) throw new Error();
      notify("บันทึกเรียบร้อย", "success");
      setEditIndex(null); fetchData();
    } catch { notify("บันทึกไม่สำเร็จ", "error"); }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const paperSx = {
    border: `1px solid ${G.border}`,
    bgcolor: G.paper,
    borderRadius: 3,
    boxShadow: '0 1px 0 rgba(27,23,19,.04),0 8px 24px -14px rgba(27,23,19,.14)',
    overflow: 'hidden',
  };

  const thSx = {
    fontSize: '0.78rem', fontWeight: 700, color: G.textMuted,
    textTransform: 'uppercase' as const, letterSpacing: '.06em',
    borderBottom: `1px solid ${G.border}`, bgcolor: G.bg, py: 1.5, px: 2,
  };

  if (loading) return (
    <Box sx={{ p: { xs: 2, md: 4 }, bgcolor: G.bg, minHeight: '100vh' }}>
      <Skeleton width={220} height={40} sx={{ mb: 1 }} />
      <Skeleton width={160} height={20} sx={{ mb: 3 }} />
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[0,1,2].map(i => <Grid item xs={12} md={4} key={i}><Skeleton variant="rectangular" height={110} sx={{ borderRadius: 3 }} /></Grid>)}
      </Grid>
      <Skeleton variant="rectangular" height={56} sx={{ borderRadius: 3, mb: 2 }} />
      <Skeleton variant="rectangular" height={380} sx={{ borderRadius: 3 }} />
    </Box>
  );

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, bgcolor: G.bg, minHeight: '100vh', maxWidth: 1560, mx: 'auto' }}>

      {/* ── Header ── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Box>
          <Typography sx={{
            fontSize: 18, fontWeight: 600, color: G.text, letterSpacing: '-.01em',
            display: 'flex', alignItems: 'center', gap: 1,
            '&::before': { content: '""', width: 4, height: 20, bgcolor: G.accent, borderRadius: 1, display: 'inline-block' },
          }}>
            รายการทองแท่ง
          </Typography>
          <Typography sx={{ color: G.textMuted, fontSize: 12.5, mt: 0.5 }}>
            จัดการธุรกรรมทองแท่งทั้งหมด · {filteredData.length} รายการ
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button size="small" startIcon={<Refresh sx={{ fontSize: 15 }} />} onClick={fetchData}
            sx={{ color: G.textSub, border: `1px solid ${G.border}`, borderRadius: '8px',
              bgcolor: G.paper, fontWeight: 500, fontSize: 13, px: 2,
              '&:hover': { bgcolor: G.bg, borderColor: G.accent, color: G.accent } }}>
            รีเฟรช
          </Button>
        </Box>
      </Box>

      {/* ── Stats Cards ── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'น้ำหนักรวม', value: totals.totalWeightBaht.toFixed(2), unit: 'บาทน้ำหนัก', color: G.accent },
          { label: 'น้ำหนัก (กรัม)', value: totals.totalWeightGram.toFixed(2), unit: 'กรัม', color: G.brass },
          { label: 'มูลค่ารวม', value: `฿${totals.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`, unit: 'บาท', color: G.success },
        ].map(c => (
          <Grid item xs={12} md={4} key={c.label}>
            <Paper sx={paperSx} elevation={0}>
              <Box sx={{ p: 2.5 }}>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: G.textMuted, textTransform: 'uppercase', letterSpacing: '.1em', mb: 1.25 }}>
                  {c.label}
                </Typography>
                <Typography sx={{ fontFamily: MONO, fontSize: 26, fontWeight: 600, color: c.color, letterSpacing: '-.015em', lineHeight: 1 }}>
                  {c.value}
                </Typography>
                <Typography sx={{ fontSize: 11.5, color: G.textMuted, mt: 0.75 }}>{c.unit}</Typography>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* ── Controls ── */}
      <Paper sx={{ ...paperSx, mb: 2 }} elevation={0}>
        <Box sx={{ p: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Period selector */}
            <Box>
              <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: G.textFaint, textTransform: 'uppercase', letterSpacing: '.1em', mb: 0.75, fontFamily: MONO }}>
                ช่วงเวลา
              </Typography>
              <Box sx={{ display: 'inline-flex', p: '3px', bgcolor: G.bg, border: `1px solid ${G.border}`, borderRadius: '10px' }}>
                {PERIODS.map(p => (
                  <Box key={p.value} component="button" onClick={() => { setSelectedPeriod(p.value); setPage(0); }}
                    sx={{ border: selectedPeriod === p.value ? `1px solid ${G.border}` : '1px solid transparent',
                      borderRadius: '7px', px: 1.5, py: 0.625, cursor: 'pointer',
                      bgcolor:    selectedPeriod === p.value ? G.paper : 'transparent',
                      color:      selectedPeriod === p.value ? G.text  : G.textMuted,
                      fontWeight: selectedPeriod === p.value ? 600 : 400,
                      fontSize: 13, fontFamily: 'inherit', transition: 'all .15s',
                      '&:hover': { color: G.text } }}>
                    {p.label}
                  </Box>
                ))}
              </Box>
            </Box>

            {/* Mode selector */}
            <Box>
              <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: G.textFaint, textTransform: 'uppercase', letterSpacing: '.1em', mb: 0.75, fontFamily: MONO }}>
                ประเภท
              </Typography>
              <Box sx={{ display: 'inline-flex', p: '3px', bgcolor: G.bg, border: `1px solid ${G.border}`, borderRadius: '10px' }}>
                {MODES.map(m => (
                  <Box key={m.value} component="button" onClick={() => { setMode(m.value); setPage(0); }}
                    sx={{ border: mode === m.value ? `1px solid ${G.border}` : '1px solid transparent',
                      borderRadius: '7px', px: 1.5, py: 0.625, cursor: 'pointer',
                      bgcolor: mode === m.value ? G.paper : 'transparent',
                      color:  mode === m.value ? (m.value === 'buy' ? G.success : G.danger) : G.textMuted,
                      fontWeight: mode === m.value ? 600 : 400,
                      fontSize: 13, fontFamily: 'inherit', transition: 'all .15s',
                      display: 'flex', alignItems: 'center', gap: 0.5,
                      '&:hover': { color: G.text } }}>
                    <m.Icon sx={{ fontSize: 14 }} />
                    {m.label}
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>

          {/* Search */}
          <TextField variant="outlined" placeholder="ค้นหา ชื่อ, เลขบัตร, เบอร์..." value={search}
            onChange={e => setSearch(e.target.value)} size="small"
            sx={{ width: { xs: '100%', sm: 320 },
              '& .MuiOutlinedInput-root': { borderRadius: '10px', bgcolor: G.bg, fontSize: 13,
                '& fieldset': { borderColor: G.border },
                '&:hover fieldset': { borderColor: G.accent },
                '&.Mui-focused fieldset': { borderColor: G.accent } } }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16, color: G.textMuted }} /></InputAdornment>,
              endAdornment: search ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearch('')} sx={{ color: G.textMuted }}>
                    <Delete sx={{ fontSize: 14 }} />
                  </IconButton>
                </InputAdornment>
              ) : null,
            }}
          />
        </Box>
      </Paper>

      {/* ── Table ── */}
      <Paper sx={{ ...paperSx, mb: 2 }} elevation={0}>
        <Box sx={{ overflowX: 'auto' }}>
          <Table sx={{ minWidth: 1100 }}>
            <TableHead>
              <TableRow>
                {['วันที่/เวลา','ชื่อ','นามสกุล','เลขบัตร','ที่อยู่','เบอร์โทร','น้ำหนัก (บาท)','น้ำหนัก (กรัม)','จำนวนเงิน','หมายเหตุ','จัดการ'].map((h, i) => (
                  <TableCell key={h} align={i >= 6 && i <= 8 ? 'right' : i === 10 ? 'center' : 'left'} sx={thSx}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {displayedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} align="center" sx={{ py: 8, color: G.textMuted }}>
                    <SearchIcon sx={{ fontSize: 40, mb: 1, opacity: .4, display: 'block', mx: 'auto' }} />
                    <Typography sx={{ fontSize: 14, color: G.textMuted }}>
                      {search ? `ไม่พบ "${search}"` : 'ยังไม่มีข้อมูล'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : displayedData.map((item, i) => (
                <TableRow key={item.id} sx={{
                  '&:hover': { bgcolor: alpha(G.accent, 0.04) },
                  '&:last-child td': { borderBottom: 0 },
                  '& td': { borderColor: G.border, px: 2, py: 1.25 },
                }}>
                  {editIndex === i ? (
                    <>
                      <TableCell>
                        <LocalizationProvider dateAdapter={AdapterDayjs}>
                          <DatePicker value={form.date as Dayjs | null}
                            onChange={v => setForm(f => ({ ...f, date: v }))}
                            slotProps={{ textField: { size: 'small', sx: { minWidth: 140 } } }} />
                        </LocalizationProvider>
                      </TableCell>
                      {['firstname','lastname','idcard','address','phone'].map(field => (
                        <TableCell key={field}>
                          <TextField size="small" name={field}
                            value={(form as Record<string,unknown>)[field] as string || ''}
                            onChange={handleChange} fullWidth />
                        </TableCell>
                      ))}
                      {(['weightBaht','weightGram','amount'] as const).map(field => (
                        <TableCell key={field}>
                          <TextField size="small" name={field} type="number"
                            value={form[field] || ''} onChange={handleChange} fullWidth />
                        </TableCell>
                      ))}
                      <TableCell>
                        <TextField size="small" name="remark"
                          value={form.remark || ''} onChange={handleChange} fullWidth />
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell>
                        <Typography sx={{ fontSize: 13, fontWeight: 600, color: G.text, fontFamily: MONO }}>
                          {dayjs.utc(item.date).local().format('DD/MM/YY')}
                        </Typography>
                        <Typography sx={{ fontSize: 11, color: G.textMuted, fontFamily: MONO }}>
                          {dayjs.utc(item.date).local().format('HH:mm')}
                        </Typography>
                      </TableCell>
                      <TableCell><Typography sx={{ fontSize: 13, color: G.text }}>{item.firstname}</Typography></TableCell>
                      <TableCell><Typography sx={{ fontSize: 13, color: G.text }}>{item.lastname}</Typography></TableCell>
                      <TableCell><Typography sx={{ fontSize: 12, color: G.textSub, fontFamily: MONO }}>{item.idcard}</Typography></TableCell>
                      <TableCell>
                        <Tooltip title={item.address} arrow>
                          <Typography sx={{ fontSize: 12, color: G.textSub, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.address}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell><Typography sx={{ fontSize: 13, color: G.textSub, fontFamily: MONO }}>{item.phone}</Typography></TableCell>
                      <TableCell align="right">
                        <Typography sx={{ fontFamily: MONO, fontSize: 13, fontWeight: 600, color: G.brass }}>
                          {item.weightBaht?.toFixed(2)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography sx={{ fontFamily: MONO, fontSize: 13, color: G.textSub }}>
                          {item.weightGram?.toFixed(2)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography sx={{ fontFamily: MONO, fontSize: 13, fontWeight: 600, color: mode === 'buy' ? G.success : G.danger }}>
                          ฿{item.amount?.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: 12, color: G.textMuted, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.remark || '—'}
                        </Typography>
                      </TableCell>
                    </>
                  )}
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 0.75, justifyContent: 'center' }}>
                      {editIndex === i ? (
                        <Tooltip title="บันทึก" arrow>
                          <IconButton size="small" onClick={saveEdit}
                            sx={{ color: G.success, bgcolor: alpha(G.success, 0.1), borderRadius: '7px',
                              '&:hover': { bgcolor: alpha(G.success, 0.18) } }}>
                            <Save sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      ) : (
                        <Tooltip title="แก้ไข" arrow>
                          <IconButton size="small" onClick={() => startEdit(i)}
                            sx={{ color: G.accent, bgcolor: alpha(G.accent, 0.1), borderRadius: '7px',
                              '&:hover': { bgcolor: alpha(G.accent, 0.18) } }}>
                            <Edit sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="ลบ" arrow>
                        <IconButton size="small" onClick={() => handleDelete(item.id)} disabled={deleting === item.id}
                          sx={{ color: G.danger, bgcolor: alpha(G.danger, 0.1), borderRadius: '7px',
                            '&:hover': { bgcolor: alpha(G.danger, 0.18) } }}>
                          {deleting === item.id
                            ? <CircularProgress size={14} sx={{ color: G.danger }} />
                            : <Delete sx={{ fontSize: 16 }} />}
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}

              {/* Totals row */}
              {displayedData.length > 0 && (
                <TableRow sx={{ bgcolor: alpha(G.accent, 0.04), '& td': { borderTop: `1px solid ${G.border}`, py: 1.5, px: 2 } }}>
                  <TableCell colSpan={6}>
                    <Typography sx={{ fontSize: 13, fontWeight: 600, color: G.textSub }}>
                      รวม {filteredData.length} รายการ
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography sx={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: G.brass }}>
                      {totals.totalWeightBaht.toFixed(2)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography sx={{ fontFamily: MONO, fontSize: 13, fontWeight: 600, color: G.textSub }}>
                      {totals.totalWeightGram.toFixed(2)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography sx={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: G.success }}>
                      ฿{totals.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </Typography>
                  </TableCell>
                  <TableCell /><TableCell />
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>

        <Box sx={{ borderTop: `1px solid ${G.border}` }}>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25, 50]}
            component="div"
            count={filteredData.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
            labelRowsPerPage="แถวต่อหน้า:"
            labelDisplayedRows={({ from, to, count }) => `${from}–${to} จาก ${count}`}
            sx={{ '& .MuiTablePagination-toolbar': { color: G.textMuted, fontSize: 12.5 } }}
          />
        </Box>
      </Paper>

      {/* ── Summary stats ── */}
      <Paper sx={paperSx} elevation={0}>
        <Box sx={{ p: 2.5, borderBottom: `1px dashed ${G.border}` }}>
          <Typography sx={{ fontSize: 14, fontWeight: 600, color: G.text }}>สรุปสถิติ</Typography>
        </Box>
        <Grid container>
          {[
            { label: 'รายการทั้งหมด', value: data.length, color: G.accent },
            { label: 'รายการที่แสดง', value: filteredData.length, color: G.success },
            { label: 'น้ำหนักเฉลี่ย (บาท)', value: filteredData.length > 0 ? (totals.totalWeightBaht / filteredData.length).toFixed(2) : '0.00', color: G.brass },
            { label: 'มูลค่าเฉลี่ย (฿)', value: filteredData.length > 0 ? (totals.totalAmount / filteredData.length).toFixed(2) : '0.00', color: G.textSub },
          ].map((s, i) => (
            <Grid item xs={6} md={3} key={s.label}>
              <Box sx={{ p: 2.5, borderRight: i < 3 ? `1px solid ${G.border}` : 0 }}>
                <Typography sx={{ fontSize: 11, color: G.textMuted, mb: 0.75, textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 600 }}>{s.label}</Typography>
                <Typography sx={{ fontFamily: MONO, fontSize: 22, fontWeight: 600, color: s.color }}>{s.value}</Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Paper>

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snackbar.severity} onClose={handleClose}>{snackbar.message}</Alert>
      </Snackbar>

      <Dialog open={confirmOpen} PaperProps={{ sx: { borderRadius: 3, bgcolor: G.paper, border: `1px solid ${G.border}` } }}>
        <DialogTitle sx={{ color: G.text, fontWeight: 600 }}>ยืนยันการลบ</DialogTitle>
        <DialogContent><Typography sx={{ color: G.textSub }}>คุณต้องการลบรายการนี้หรือไม่?</Typography></DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => setConfirmOpen(false)}
            sx={{ color: G.textSub, border: `1px solid ${G.border}`, borderRadius: '8px' }}>
            ยกเลิก
          </Button>
          <Button onClick={confirmDelete}
            sx={{ bgcolor: G.danger, color: '#fff', borderRadius: '8px',
              '&:hover': { bgcolor: alpha(G.danger, 0.85) } }}>
            ลบ
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
