// path: gold/src/pages/AllGoldTransactionsList.tsx
import { useEffect, useState, useCallback, useMemo } from "react";
import dayjs from "dayjs";
import {
  Box, Paper, Typography, Table, TableHead, TableRow, TableCell, TableBody,
  TextField, IconButton, TablePagination, CircularProgress,
  InputAdornment, Tooltip, Button, Grid, alpha,
} from "@mui/material";
import { Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import { Edit, Save, Delete, Search as SearchIcon, Refresh } from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import { Snackbar, Alert } from "@mui/material";
import { API_BASE } from "../config";
import { useNotify } from "../hooks/useNotify";
import { makeG } from "../utils/dashboardTokens";
import { dateHaystack, buildSearchFilter } from "../utils/listFilter";
import { AllGoldTransactionRecord } from "../types";

const MONO = '"JetBrains Mono", ui-monospace, monospace';

const PERIODS = [
  { value: 'day',   label: 'วัน'      },
  { value: 'week',  label: 'สัปดาห์'  },
  { value: 'month', label: 'เดือน'    },
  { value: 'all',   label: 'ทั้งหมด'  },
] as const;

const NUM_FIELDS = [
  'redeem','interest','pawn','expenses',
  'buyIn','exchange','sellOut',
  'diamondBuyIn','diamondSellOut','platedGold',
] as const;

export default function AllGoldTransactionsList() {
  const theme = useTheme();
  const G = makeG(theme);
  const { snackbar, notify, handleClose } = useNotify();

  const [data, setData]             = useState<AllGoldTransactionRecord[]>([]);
  const [editIndex, setEditIndex]   = useState<number | null>(null);
  const [form, setForm]             = useState<Partial<AllGoldTransactionRecord>>({});
  const [deleting, setDeleting]     = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [page, setPage]             = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch]         = useState("");
  const [period, setPeriod]         = useState("all");

  const API = `${API_BASE}/all-gold-transactions`;

  const fetchData = useCallback(() => {
    fetch(`${API}/list?sort_order=desc`)
      .then(r => r.json())
      .then(json => { setData(Array.isArray(json) ? json : []); setPage(0); })
      .catch(() => notify("โหลดข้อมูลไม่สำเร็จ", "error"));
  }, [API]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const periodData = useMemo(() => period === "all" ? data : data.filter(item => {
    const start = period === "day" ? dayjs().startOf("day")
                : period === "week" ? dayjs().startOf("week")
                : dayjs().startOf("month");
    return !dayjs(item.date).isBefore(start);
  }), [data, period]);

  const filteredData = useMemo(() => {
    const matches = buildSearchFilter(search);
    return periodData.filter(item => matches([
      dateHaystack(item.date),
      String(item.redeem   || ''),
      String(item.interest || ''),
      String(item.pawn     || ''),
      String(item.buyIn    || ''),
      String(item.exchange || ''),
      String(item.sellOut  || ''),
      String(item.expenses || ''),
    ].join(' ')));
  }, [periodData, search]);

  const displayedData = filteredData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const totals = useMemo(() => data.reduce((acc, item) => {
    NUM_FIELDS.forEach(f => { acc[f] = (acc[f] || 0) + (item[f] || 0); });
    return acc;
  }, {} as Record<string, number>), [data]);

  const startEdit = (i: number) => { setEditIndex(i); setForm({ ...displayedData[i] }); };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const parsed = NUM_FIELDS.includes(name as typeof NUM_FIELDS[number])
      ? (value === "" ? "" : parseFloat(value))
      : value;
    setForm(f => ({ ...f, [name]: parsed }));
  };

  const saveEdit = async () => {
    if (editIndex === null) return;
    try {
      const res = await fetch(`${API}/update/${form.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      notify("อัปเดตสำเร็จ", "success");
      fetchData(); setEditIndex(null); setForm({});
    } catch { notify("อัปเดตไม่สำเร็จ", "error"); }
  };

  const handleDelete = (id: number) => { setPendingDeleteId(id); setConfirmOpen(true); };

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;
    setDeleting(pendingDeleteId); setConfirmOpen(false);
    try {
      await fetch(`${API}/delete/${pendingDeleteId}`, { method: "DELETE" });
      fetchData();
    } finally { setDeleting(null); setPendingDeleteId(null); }
  };

  const paperSx = {
    border: `1px solid ${G.border}`, bgcolor: G.paper, borderRadius: 3,
    boxShadow: '0 1px 0 rgba(27,23,19,.04),0 8px 24px -14px rgba(27,23,19,.14)', overflow: 'hidden',
  };
  const thSx = {
    fontSize: '0.72rem', fontWeight: 700, color: G.textMuted,
    textTransform: 'uppercase' as const, letterSpacing: '.06em',
    borderBottom: `1px solid ${G.border}`, bgcolor: G.bg, py: 1.5, px: 1.5, whiteSpace: 'nowrap' as const,
  };

  const fmt = (v: number | undefined | null) =>
    (v || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const COLS: { key: string; label: string; color?: string }[] = [
    { key: 'redeem',       label: 'ไถ่ (฿)',           color: G.success },
    { key: 'interest',     label: 'ดอก (฿)',            color: G.success },
    { key: 'pawn',         label: 'จำนำ (฿)',           color: G.danger  },
    { key: 'expenses',     label: 'ค่าใช้จ่าย (฿)',     color: G.warning },
    { key: 'buyIn',        label: 'ซื้อเข้า (g)',        color: G.accent  },
    { key: 'exchange',     label: 'เปลี่ยน (g)',         color: G.accent  },
    { key: '_buyEx',       label: 'ซื้อ+เปลี่ยน (g)',   color: G.accent  },
    { key: 'sellOut',      label: 'ขายออก (g)',          color: G.danger  },
    { key: 'diamondBuyIn', label: 'เพชรซื้อ (฿)',        color: '#9c3a2a' },
    { key: 'diamondSellOut',label: 'เพชรขาย (฿)',        color: G.success },
    { key: 'platedGold',   label: 'ทองชุบ (g)',          color: G.textSub },
  ];

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, bgcolor: G.bg, minHeight: '100vh', maxWidth: 1800, mx: 'auto' }}>

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Box>
          <Typography sx={{
            fontSize: 18, fontWeight: 600, color: G.text, letterSpacing: '-.01em',
            display: 'flex', alignItems: 'center', gap: 1,
            '&::before': { content: '""', width: 4, height: 20, bgcolor: G.accent, borderRadius: 1, display: 'inline-block' },
          }}>
            รายการธุรกรรมทองทั้งหมด
          </Typography>
          <Typography sx={{ color: G.textMuted, fontSize: 12.5, mt: 0.5 }}>
            บันทึกธุรกรรมประจำวัน · {filteredData.length} รายการ
          </Typography>
        </Box>
        <Button size="small" startIcon={<Refresh sx={{ fontSize: 15 }} />} onClick={fetchData}
          sx={{ color: G.textSub, border: `1px solid ${G.border}`, borderRadius: '8px',
            bgcolor: G.paper, fontWeight: 500, fontSize: 13, px: 2,
            '&:hover': { bgcolor: G.bg, borderColor: G.accent, color: G.accent } }}>
          รีเฟรช
        </Button>
      </Box>

      {/* Summary stat cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'รายได้รวม (ไถ่+ดอก)',   value: `฿${fmt(totals.redeem + totals.interest)}`,    color: G.success },
          { label: 'จำนำรวม',               value: `฿${fmt(totals.pawn)}`,                         color: G.danger  },
          { label: 'ทองซื้อ+เปลี่ยน',       value: `${fmt(totals.buyIn + totals.exchange)} g`,     color: G.accent  },
          { label: 'ทองขายออก',             value: `${fmt(totals.sellOut)} g`,                     color: '#9c3a2a' },
        ].map(c => (
          <Grid item xs={6} md={3} key={c.label}>
            <Paper sx={paperSx} elevation={0}>
              <Box sx={{ p: 2.25 }}>
                <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: G.textMuted, textTransform: 'uppercase', letterSpacing: '.1em', mb: 1 }}>{c.label}</Typography>
                <Typography sx={{ fontFamily: MONO, fontSize: { xs: 16, md: 20 }, fontWeight: 600, color: c.color, letterSpacing: '-.01em', lineHeight: 1 }}>{c.value}</Typography>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Controls */}
      <Paper sx={{ ...paperSx, mb: 2 }} elevation={0}>
        <Box sx={{ p: 2.5, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, gap: 2 }}>
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
          <TextField variant="outlined" placeholder="ค้นหา วันที่, ยอด..." value={search}
            onChange={e => setSearch(e.target.value)} size="small"
            sx={{ width: { xs: '100%', sm: 280 },
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
          <Table size="small" sx={{ minWidth: 1400 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={thSx}>วันที่</TableCell>
                {COLS.map(c => <TableCell key={c.key} align="right" sx={thSx}>{c.label}</TableCell>)}
                <TableCell align="center" sx={thSx}>จัดการ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {displayedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={13} align="center" sx={{ py: 8 }}>
                    <Typography sx={{ fontSize: 14, color: G.textMuted }}>ไม่มีข้อมูลธุรกรรม</Typography>
                  </TableCell>
                </TableRow>
              ) : displayedData.map((item, i) => (
                <TableRow key={item.id} sx={{
                  bgcolor: i % 2 !== 0 ? alpha(G.accent, 0.03) : 'transparent',
                  '&:hover': { bgcolor: `${alpha(G.accent, 0.08)} !important` },
                  '&:last-child td': { borderBottom: 0 },
                  '& td': { borderColor: G.border, px: 1.5, py: 1 },
                }}>
                  <TableCell sx={{ minWidth: 100 }}>
                    {editIndex === i ? (
                      <TextField size="small" name="date" type="date"
                        value={form.date ? form.date.split('T')[0] : ''} onChange={handleChange}
                        sx={{ minWidth: 130 }} />
                    ) : (
                      <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: G.text, fontFamily: MONO }}>
                        {item.date ? new Date(item.date).toLocaleDateString('th-TH', { day:'2-digit', month:'2-digit', year:'2-digit' }) : '—'}
                      </Typography>
                    )}
                  </TableCell>

                  {/* Numeric cells */}
                  {COLS.map((col, ci) => (
                    <TableCell key={col.key} align="right">
                      {col.key === '_buyEx' ? (
                        <Typography sx={{ fontFamily: MONO, fontSize: 12, color: col.color || G.textSub }}>
                          {fmt((item.buyIn || 0) + (item.exchange || 0))}
                        </Typography>
                      ) : editIndex === i ? (
                        <TextField size="small" name={col.key} type="number"
                          value={(form as Record<string,unknown>)[col.key] ?? ''}
                          onChange={handleChange} sx={{ width: 90 }} />
                      ) : (
                        <Typography sx={{ fontFamily: MONO, fontSize: 12, fontWeight: 500, color: col.color || G.textSub }}>
                          {fmt((item as unknown as Record<string,number>)[col.key])}
                        </Typography>
                      )}
                    </TableCell>
                  ))}

                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                      {editIndex === i ? (
                        <Tooltip title="บันทึก" arrow>
                          <IconButton size="small" onClick={saveEdit}
                            sx={{ color: G.success, bgcolor: alpha(G.success, 0.1), borderRadius: '7px', '&:hover': { bgcolor: alpha(G.success, 0.18) } }}>
                            <Save sx={{ fontSize: 15 }} />
                          </IconButton>
                        </Tooltip>
                      ) : (
                        <Tooltip title="แก้ไข" arrow>
                          <IconButton size="small" onClick={() => startEdit(i)}
                            sx={{ color: G.accent, bgcolor: alpha(G.accent, 0.1), borderRadius: '7px', '&:hover': { bgcolor: alpha(G.accent, 0.18) } }}>
                            <Edit sx={{ fontSize: 15 }} />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="ลบ" arrow>
                        <IconButton size="small" onClick={() => handleDelete(item.id)} disabled={deleting === item.id}
                          sx={{ color: G.danger, bgcolor: alpha(G.danger, 0.1), borderRadius: '7px', '&:hover': { bgcolor: alpha(G.danger, 0.18) } }}>
                          {deleting === item.id ? <CircularProgress size={14} sx={{ color: G.danger }} /> : <Delete sx={{ fontSize: 15 }} />}
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}

              {/* Totals row */}
              {displayedData.length > 0 && (
                <TableRow sx={{ bgcolor: alpha(G.accent, 0.04), '& td': { borderTop: `1px solid ${G.border}`, py: 1.5, px: 1.5 } }}>
                  <TableCell>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: G.textSub }}>รวม {data.length} รายการ</Typography>
                  </TableCell>
                  {COLS.map(col => (
                    <TableCell key={col.key} align="right">
                      <Typography sx={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: col.color || G.textSub }}>
                        {col.key === '_buyEx'
                          ? fmt((totals.buyIn || 0) + (totals.exchange || 0))
                          : fmt(totals[col.key])}
                      </Typography>
                    </TableCell>
                  ))}
                  <TableCell />
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>

        <Box sx={{ borderTop: `1px solid ${G.border}` }}>
          <TablePagination
            rowsPerPageOptions={[10, 25, 50, 100]}
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
