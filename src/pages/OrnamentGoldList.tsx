// src/pages/OrnamentGoldList.tsx
import { useEffect, useState, useCallback, useMemo } from "react";
import dayjs from "dayjs";
import {
  Box, Paper, Typography, Table, TableHead, TableRow, TableCell, TableBody,
  TextField, IconButton, TablePagination, CircularProgress, Skeleton,
  InputAdornment, Tooltip, Button, Grid, alpha,
} from "@mui/material";
import { Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import { Delete, Edit, Save, Search as SearchIcon, TrendingUp, TrendingDown, Refresh } from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import { Snackbar, Alert } from "@mui/material";
import { API_BASE } from "../config";
import { useNotify } from "../hooks/useNotify";
import { makeG } from "../utils/dashboardTokens";
import { OrnamentGoldRecord } from "../types";

const MONO = '"JetBrains Mono", ui-monospace, monospace';

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

export default function OrnamentGoldList() {
  const theme = useTheme();
  const G = makeG(theme);
  const { snackbar, notify, handleClose } = useNotify();

  const [data, setData]             = useState<OrnamentGoldRecord[]>([]);
  const [mode, setMode]             = useState<"buy" | "sell">("buy");
  const [editIndex, setEditIndex]   = useState<number | null>(null);
  const [form, setForm]             = useState<Partial<OrnamentGoldRecord>>({});
  const [isLoading, setIsLoading]   = useState(true);
  const [deleting, setDeleting]     = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [page, setPage]             = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch]         = useState("");
  const [period, setPeriod]         = useState("all");

  const API = `${API_BASE}/ornament-gold`;

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res  = await fetch(`${API}/list?sort_order=desc`);
      const json = await res.json();
      setData(Array.isArray(json) ? json : []);
      setPage(0);
    } catch { notify("โหลดข้อมูลไม่สำเร็จ", "error"); }
    finally   { setIsLoading(false); }
  }, [API]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const periodData = useMemo(() => period === "all" ? data : data.filter(item => {
    const start = period === "day" ? dayjs().startOf("day")
                : period === "week" ? dayjs().startOf("week")
                : dayjs().startOf("month");
    return !dayjs(item.date).isBefore(start);
  }), [data, period]);

  const filteredData = useMemo(() => periodData.filter(item =>
    item.mode === mode && (
      (item.date ? new Date(item.date).toLocaleDateString("th-TH") : '').includes(search) ||
      item.firstname.toLowerCase().includes(search.toLowerCase()) ||
      item.lastname.toLowerCase().includes(search.toLowerCase()) ||
      item.idcard.includes(search) ||
      item.phone.includes(search)
    )
  ), [periodData, mode, search]);

  const displayedData = filteredData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const totals = useMemo(() => filteredData.reduce((acc, item) => ({
    totalWeight: acc.totalWeight + (Number(item.weight) || 0),
    totalAmount: acc.totalAmount + (Number(item.amount) || 0),
  }), { totalWeight: 0, totalAmount: 0 }), [filteredData]);

  const handleDelete = (id: number) => { setPendingDeleteId(id); setConfirmOpen(true); };

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;
    setDeleting(pendingDeleteId); setConfirmOpen(false);
    try {
      await fetch(`${API}/delete/${pendingDeleteId}`, { method: "DELETE" });
      await fetchData();
    } finally { setDeleting(null); setPendingDeleteId(null); }
  };

  const startEdit = (i: number) => {
    setEditIndex(i);
    const item = filteredData[page * rowsPerPage + i];
    setForm({ ...item, date: item.date ? new Date(item.date).toISOString().split('T')[0] : '' });
  };

  const saveEdit = async () => {
    if (editIndex === null) return;
    const id = filteredData[page * rowsPerPage + editIndex].id;
    const res = await fetch(`${API}/update/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    });
    if (res.ok) { notify("บันทึกเรียบร้อย", "success"); setEditIndex(null); fetchData(); }
    else        { notify("บันทึกไม่สำเร็จ", "error"); }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const paperSx = {
    border: `1px solid ${G.border}`, bgcolor: G.paper, borderRadius: 3,
    boxShadow: '0 1px 0 rgba(27,23,19,.04),0 8px 24px -14px rgba(27,23,19,.14)', overflow: 'hidden',
  };
  const thSx = {
    fontSize: '0.78rem', fontWeight: 700, color: G.textMuted,
    textTransform: 'uppercase' as const, letterSpacing: '.06em',
    borderBottom: `1px solid ${G.border}`, bgcolor: G.bg, py: 1.5, px: 2,
  };

  if (isLoading) return (
    <Box sx={{ p: { xs: 2, md: 4 }, bgcolor: G.bg, minHeight: '100vh' }}>
      <Skeleton width={200} height={40} sx={{ mb: 1 }} />
      <Skeleton width={150} height={20} sx={{ mb: 3 }} />
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[0,1].map(i => <Grid item xs={12} md={6} key={i}><Skeleton variant="rectangular" height={110} sx={{ borderRadius: 3 }} /></Grid>)}
      </Grid>
      <Skeleton variant="rectangular" height={56} sx={{ borderRadius: 3, mb: 2 }} />
      <Skeleton variant="rectangular" height={380} sx={{ borderRadius: 3 }} />
    </Box>
  );

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, bgcolor: G.bg, minHeight: '100vh', maxWidth: 1560, mx: 'auto' }}>

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Box>
          <Typography sx={{
            fontSize: 18, fontWeight: 600, color: G.text, letterSpacing: '-.01em',
            display: 'flex', alignItems: 'center', gap: 1,
            '&::before': { content: '""', width: 4, height: 20, bgcolor: G.accent, borderRadius: 1, display: 'inline-block' },
          }}>
            รายการทองรูปพรรณ
          </Typography>
          <Typography sx={{ color: G.textMuted, fontSize: 12.5, mt: 0.5 }}>
            จัดการธุรกรรมทองรูปพรรณทั้งหมด · {filteredData.length} รายการ
          </Typography>
        </Box>
        <Button size="small" startIcon={<Refresh sx={{ fontSize: 15 }} />} onClick={fetchData}
          sx={{ color: G.textSub, border: `1px solid ${G.border}`, borderRadius: '8px',
            bgcolor: G.paper, fontWeight: 500, fontSize: 13, px: 2,
            '&:hover': { bgcolor: G.bg, borderColor: G.accent, color: G.accent } }}>
          รีเฟรช
        </Button>
      </Box>

      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'น้ำหนักรวม', value: totals.totalWeight.toFixed(2), unit: 'กรัม', color: G.brass },
          { label: 'มูลค่ารวม',  value: `฿${totals.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`, unit: 'บาท', color: G.success },
        ].map(c => (
          <Grid item xs={12} md={6} key={c.label}>
            <Paper sx={paperSx} elevation={0}>
              <Box sx={{ p: 2.5 }}>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: G.textMuted, textTransform: 'uppercase', letterSpacing: '.1em', mb: 1.25 }}>{c.label}</Typography>
                <Typography sx={{ fontFamily: MONO, fontSize: 26, fontWeight: 600, color: c.color, letterSpacing: '-.015em', lineHeight: 1 }}>{c.value}</Typography>
                <Typography sx={{ fontSize: 11.5, color: G.textMuted, mt: 0.75 }}>{c.unit}</Typography>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Controls */}
      <Paper sx={{ ...paperSx, mb: 2 }} elevation={0}>
        <Box sx={{ p: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <Box>
              <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: G.textFaint, textTransform: 'uppercase', letterSpacing: '.1em', mb: 0.75, fontFamily: MONO }}>ช่วงเวลา</Typography>
              <Box sx={{ display: 'inline-flex', p: '3px', bgcolor: G.bg, border: `1px solid ${G.border}`, borderRadius: '10px' }}>
                {PERIODS.map(p => (
                  <Box key={p.value} component="button" onClick={() => { setPeriod(p.value); setPage(0); }}
                    sx={{ border: period === p.value ? `1px solid ${G.border}` : '1px solid transparent',
                      borderRadius: '7px', px: 1.5, py: 0.625, cursor: 'pointer',
                      bgcolor:    period === p.value ? G.paper : 'transparent',
                      color:      period === p.value ? G.text  : G.textMuted,
                      fontWeight: period === p.value ? 600 : 400,
                      fontSize: 13, fontFamily: 'inherit', transition: 'all .15s',
                      '&:hover': { color: G.text } }}>
                    {p.label}
                  </Box>
                ))}
              </Box>
            </Box>
            <Box>
              <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: G.textFaint, textTransform: 'uppercase', letterSpacing: '.1em', mb: 0.75, fontFamily: MONO }}>ประเภท</Typography>
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
          <TextField variant="outlined" placeholder="ค้นหา ชื่อ, เลขบัตร, เบอร์..." value={search}
            onChange={e => setSearch(e.target.value)} size="small"
            sx={{ width: { xs: '100%', sm: 300 },
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

      {/* Table */}
      <Paper sx={{ ...paperSx, mb: 2 }} elevation={0}>
        <Box sx={{ overflowX: 'auto' }}>
          <Table sx={{ minWidth: 900 }}>
            <TableHead>
              <TableRow>
                {['วันที่','ชื่อ','นามสกุล','เลขบัตร','ที่อยู่','เบอร์โทร','น้ำหนัก (กรัม)','จำนวนเงิน','หมายเหตุ','จัดการ'].map((h, i) => (
                  <TableCell key={h} align={i >= 6 && i <= 7 ? 'right' : i === 9 ? 'center' : 'left'} sx={thSx}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {displayedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 8, color: G.textMuted }}>
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
                  <TableCell>
                    {editIndex === i ? (
                      <TextField size="small" name="date" type="date" value={form.date || ''} onChange={handleChange} sx={{ minWidth: 140 }} />
                    ) : (
                      <Box>
                        <Typography sx={{ fontSize: 13, fontWeight: 600, color: G.text, fontFamily: MONO }}>
                          {item.date ? new Date(item.date).toLocaleDateString("th-TH", { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—'}
                        </Typography>
                      </Box>
                    )}
                  </TableCell>
                  {editIndex === i ? (
                    <>
                      {['firstname','lastname','idcard','address','phone'].map(field => (
                        <TableCell key={field}>
                          <TextField size="small" name={field}
                            value={(form as Record<string,unknown>)[field] as string || ''} onChange={handleChange} fullWidth />
                        </TableCell>
                      ))}
                      <TableCell>
                        <TextField size="small" name="weight" type="number" value={form.weight || ''} onChange={handleChange} fullWidth />
                      </TableCell>
                      <TableCell>
                        <TextField size="small" name="amount" type="number" value={form.amount || ''} onChange={handleChange} fullWidth />
                      </TableCell>
                      <TableCell>
                        <TextField size="small" name="remark" value={form.remark || ''} onChange={handleChange} fullWidth />
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell><Typography sx={{ fontSize: 13, color: G.text }}>{item.firstname}</Typography></TableCell>
                      <TableCell><Typography sx={{ fontSize: 13, color: G.text }}>{item.lastname}</Typography></TableCell>
                      <TableCell><Typography sx={{ fontSize: 12, color: G.textSub, fontFamily: MONO }}>{item.idcard}</Typography></TableCell>
                      <TableCell>
                        <Tooltip title={item.address} arrow>
                          <Typography sx={{ fontSize: 12, color: G.textSub, maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.address}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell><Typography sx={{ fontSize: 12, color: G.textSub, fontFamily: MONO }}>{item.phone}</Typography></TableCell>
                      <TableCell align="right">
                        <Typography sx={{ fontFamily: MONO, fontSize: 13, fontWeight: 600, color: G.brass }}>{Number(item.weight).toFixed(2)}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography sx={{ fontFamily: MONO, fontSize: 13, fontWeight: 600, color: mode === 'buy' ? G.success : G.danger }}>
                          ฿{Number(item.amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: 12, color: G.textMuted, maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
                            sx={{ color: G.success, bgcolor: alpha(G.success, 0.1), borderRadius: '7px', '&:hover': { bgcolor: alpha(G.success, 0.18) } }}>
                            <Save sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      ) : (
                        <Tooltip title="แก้ไข" arrow>
                          <IconButton size="small" onClick={() => startEdit(i)}
                            sx={{ color: G.accent, bgcolor: alpha(G.accent, 0.1), borderRadius: '7px', '&:hover': { bgcolor: alpha(G.accent, 0.18) } }}>
                            <Edit sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="ลบ" arrow>
                        <IconButton size="small" onClick={() => handleDelete(item.id)} disabled={deleting === item.id}
                          sx={{ color: G.danger, bgcolor: alpha(G.danger, 0.1), borderRadius: '7px', '&:hover': { bgcolor: alpha(G.danger, 0.18) } }}>
                          {deleting === item.id ? <CircularProgress size={14} sx={{ color: G.danger }} /> : <Delete sx={{ fontSize: 16 }} />}
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
              {displayedData.length > 0 && (
                <TableRow sx={{ bgcolor: alpha(G.accent, 0.04), '& td': { borderTop: `1px solid ${G.border}`, py: 1.5, px: 2 } }}>
                  <TableCell colSpan={6}>
                    <Typography sx={{ fontSize: 13, fontWeight: 600, color: G.textSub }}>รวม {filteredData.length} รายการ</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography sx={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: G.brass }}>{totals.totalWeight.toFixed(2)}</Typography>
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
            rowsPerPageOptions={[5, 10, 25]}
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

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snackbar.severity} onClose={handleClose}>{snackbar.message}</Alert>
      </Snackbar>

      <Dialog open={confirmOpen} PaperProps={{ sx: { borderRadius: 3, bgcolor: G.paper, border: `1px solid ${G.border}` } }}>
        <DialogTitle sx={{ color: G.text, fontWeight: 600 }}>ยืนยันการลบ</DialogTitle>
        <DialogContent><Typography sx={{ color: G.textSub }}>คุณต้องการลบรายการนี้หรือไม่?</Typography></DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => setConfirmOpen(false)}
            sx={{ color: G.textSub, border: `1px solid ${G.border}`, borderRadius: '8px' }}>ยกเลิก</Button>
          <Button onClick={confirmDelete}
            sx={{ bgcolor: G.danger, color: '#fff', borderRadius: '8px', '&:hover': { bgcolor: alpha(G.danger, 0.85) } }}>ลบ</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
