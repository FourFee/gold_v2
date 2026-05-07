// path: gold/src/pages/WholesalerPickupList.tsx
import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Box, Paper, Typography, Table, TableHead, TableRow, TableCell, TableBody,
  Button, TextField, IconButton, TablePagination, Grid, alpha, CircularProgress,
  Skeleton, InputAdornment, Tooltip, MenuItem,
  Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, Alert,
} from "@mui/material";
import { Delete, Search as SearchIcon, Refresh, Add } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

import { API_BASE } from "../config";
import { useNotify } from "../hooks/useNotify";
import { makeG } from "../utils/dashboardTokens";
import { Wholesaler, WholesalerPickupRecord, WholesalerSummaryItem } from "../types";

dayjs.extend(utc);

const MONO = '"JetBrains Mono", ui-monospace, monospace';

const PERIODS = [
  { value: 'day',   label: 'วันนี้'    },
  { value: 'week',  label: 'สัปดาห์นี้' },
  { value: 'month', label: 'เดือนนี้'  },
  { value: 'all',   label: 'ทั้งหมด'   },
] as const;

type Period = typeof PERIODS[number]['value'];

export default function WholesalerPickupList() {
  const theme = useTheme();
  const G = makeG(theme);
  const navigate = useNavigate();
  const { snackbar, notify, handleClose } = useNotify();

  const [period, setPeriod]                 = useState<Period>("month");
  const [filterWsId, setFilterWsId]         = useState<number | "all">("all");
  const [data, setData]                     = useState<WholesalerPickupRecord[]>([]);
  const [summary, setSummary]               = useState<WholesalerSummaryItem[]>([]);
  const [wholesalers, setWholesalers]       = useState<Wholesaler[]>([]);
  const [search, setSearch]                 = useState("");
  const [loading, setLoading]               = useState(true);
  const [page, setPage]                     = useState(0);
  const [rowsPerPage, setRowsPerPage]       = useState(10);
  const [deleting, setDeleting]             = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen]       = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const wsParam = filterWsId === "all" ? "" : `&wholesaler_id=${filterWsId}`;
      const [listRes, sumRes, wsRes] = await Promise.all([
        fetch(`${API_BASE}/wholesaler-pickup/list?period=${period}${wsParam}&sort_order=desc`),
        fetch(`${API_BASE}/wholesaler-pickup/summary?period=${period}`),
        fetch(`${API_BASE}/wholesalers/list?active_only=false`),
      ]);
      if (!listRes.ok || !sumRes.ok || !wsRes.ok) throw new Error();
      setData(await listRes.json());
      setSummary(await sumRes.json());
      setWholesalers(await wsRes.json());
      setPage(0);
    } catch {
      notify("โหลดข้อมูลไม่สำเร็จ", "error");
    } finally {
      setLoading(false);
    }
  }, [period, filterWsId, notify]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const filteredData = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter(item => {
      const hay = [
        item.wholesaler_name,
        item.remark,
        dayjs.utc(item.pickup_date).local().format('DD/MM/YYYY'),
      ].join(' | ').toLowerCase();
      return hay.includes(q);
    });
  }, [data, search]);

  const displayedData = filteredData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const totals = useMemo(() => filteredData.reduce((acc, it) => ({
    weight: acc.weight + (it.weight_baht || 0),
    bar:    acc.bar    + (it.bar_used_baht || 0),
    fee:    acc.fee    + (it.making_fee || 0),
  }), { weight: 0, bar: 0, fee: 0 }), [filteredData]);

  const handleDelete = (id: number) => { setPendingDeleteId(id); setConfirmOpen(true); };

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;
    setDeleting(pendingDeleteId); setConfirmOpen(false);
    try {
      const res = await fetch(`${API_BASE}/wholesaler-pickup/delete/${pendingDeleteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      notify("ลบเรียบร้อย", "success");
      await fetchAll();
    } catch {
      notify("ลบไม่สำเร็จ", "error");
    } finally {
      setDeleting(null); setPendingDeleteId(null);
    }
  };

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

  const periodLabel = PERIODS.find(p => p.value === period)?.label || "";

  if (loading) return (
    <Box sx={{ p: { xs: 2, md: 4 }, bgcolor: G.bg, minHeight: '100vh' }}>
      <Skeleton width={260} height={40} sx={{ mb: 1 }} />
      <Skeleton width={180} height={20} sx={{ mb: 3 }} />
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
            หยิบทองจากร้านส่ง
          </Typography>
          <Typography sx={{ color: G.textMuted, fontSize: 12.5, mt: 0.5 }}>
            สรุปและรายการแลกเปลี่ยนกับร้านส่ง · {periodLabel}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button size="small" startIcon={<Add sx={{ fontSize: 15 }} />}
            onClick={() => navigate('/wholesaler-pickup')}
            sx={{ color: '#fff', bgcolor: G.accent, borderRadius: '8px',
              fontWeight: 600, fontSize: 13, px: 2,
              '&:hover': { bgcolor: alpha(G.accent, 0.85) } }}>
            เพิ่มรายการ
          </Button>
          <Button size="small" startIcon={<Refresh sx={{ fontSize: 15 }} />} onClick={fetchAll}
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
          { label: `น้ำหนักทองที่หยิบ (${periodLabel})`, value: totals.weight.toFixed(2), unit: 'บาทน้ำหนัก', color: G.accent },
          { label: 'ทองแท่งที่ใช้แลก',                value: totals.bar.toFixed(2),    unit: 'บาทน้ำหนัก', color: G.brass },
          { label: 'ค่ากำเหน็จรวม',                  value: `฿${totals.fee.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`, unit: 'บาท', color: G.success },
        ].map(c => (
          <Grid item xs={12} md={4} key={c.label}>
            <Paper sx={paperSx} elevation={0}>
              <Box sx={{ p: 2.5 }}>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: G.textMuted, textTransform: 'uppercase', letterSpacing: '.1em', mb: 1.25 }}>
                  {c.label}
                </Typography>
                <Typography sx={{ fontFamily: MONO, fontSize: { xs: 20, md: 26 }, fontWeight: 600, color: c.color, letterSpacing: '-.015em', lineHeight: 1 }}>
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
        <Box sx={{ p: 2.5, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, gap: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <Box>
              <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: G.textFaint, textTransform: 'uppercase', letterSpacing: '.1em', mb: 0.75, fontFamily: MONO }}>
                ช่วงเวลา
              </Typography>
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

            <Box sx={{ minWidth: 200 }}>
              <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: G.textFaint, textTransform: 'uppercase', letterSpacing: '.1em', mb: 0.75, fontFamily: MONO }}>
                ร้านส่ง
              </Typography>
              <TextField select size="small" fullWidth
                value={filterWsId}
                onChange={(e) => {
                  const v = e.target.value;
                  setFilterWsId(v === "all" ? "all" : Number(v));
                  setPage(0);
                }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', bgcolor: G.bg, fontSize: 13,
                    '& fieldset': { borderColor: G.border },
                    '&:hover fieldset': { borderColor: G.accent },
                    '&.Mui-focused fieldset': { borderColor: G.accent } } }}>
                <MenuItem value="all">ทั้งหมด</MenuItem>
                {wholesalers.map(w => (
                  <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>
                ))}
              </TextField>
            </Box>
          </Box>

          <TextField variant="outlined" placeholder="ค้นหา ร้าน, หมายเหตุ..." value={search}
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

      {/* ── Summary per shop ── */}
      <Paper sx={{ ...paperSx, mb: 2 }} elevation={0}>
        <Box sx={{ p: 2.5, borderBottom: `1px solid ${G.border}` }}>
          <Typography sx={{ fontSize: 14, fontWeight: 600, color: G.text }}>
            สรุปต่อร้าน · {periodLabel}
          </Typography>
        </Box>
        <Box sx={{ overflowX: 'auto' }}>
          <Table sx={{ minWidth: 720 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={thSx}>ร้านส่ง</TableCell>
                <TableCell sx={thSx} align="right">จำนวนครั้ง</TableCell>
                <TableCell sx={thSx} align="right">น้ำหนักหยิบรวม (บาท)</TableCell>
                <TableCell sx={thSx} align="right">ทองแท่งใช้แลก (บาท)</TableCell>
                <TableCell sx={thSx} align="right">ค่ากำเหน็จรวม</TableCell>
                <TableCell sx={thSx}>ครั้งล่าสุด</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {summary.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6, color: G.textMuted, fontSize: 13 }}>
                    ยังไม่มีรายการในช่วงเวลานี้
                  </TableCell>
                </TableRow>
              ) : summary.map((s, i) => (
                <TableRow key={s.wholesaler_id} sx={{
                  bgcolor: i % 2 !== 0 ? alpha(G.accent, 0.03) : 'transparent',
                  '&:hover': { bgcolor: `${alpha(G.accent, 0.08)} !important` },
                  '& td': { borderColor: G.border, px: 2, py: 1.25 },
                }}>
                  <TableCell>
                    <Typography sx={{ fontSize: 13, fontWeight: 600, color: G.text }}>
                      {s.wholesaler_name}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography sx={{ fontFamily: MONO, fontSize: 13, color: G.textSub }}>{s.count}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography sx={{ fontFamily: MONO, fontSize: 13, fontWeight: 600, color: G.brass }}>
                      {s.weight_baht_sum.toFixed(2)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography sx={{ fontFamily: MONO, fontSize: 13, color: G.textSub }}>
                      {s.bar_used_baht_sum.toFixed(2)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography sx={{ fontFamily: MONO, fontSize: 13, fontWeight: 600, color: G.success }}>
                      ฿{s.making_fee_sum.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ fontSize: 12, color: G.textMuted, fontFamily: MONO }}>
                      {s.last_pickup_date ? dayjs.utc(s.last_pickup_date).local().format('DD/MM/YY HH:mm') : '—'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </Paper>

      {/* ── Detail table ── */}
      <Paper sx={{ ...paperSx, mb: 2 }} elevation={0}>
        <Box sx={{ p: 2.5, borderBottom: `1px solid ${G.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography sx={{ fontSize: 14, fontWeight: 600, color: G.text }}>
            รายการทั้งหมด ({filteredData.length})
          </Typography>
        </Box>
        <Box sx={{ overflowX: 'auto' }}>
          <Table sx={{ minWidth: 760 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={thSx}>วันที่</TableCell>
                <TableCell sx={thSx}>ร้านส่ง</TableCell>
                <TableCell sx={thSx} align="right">น้ำหนักหยิบ (บาท)</TableCell>
                <TableCell sx={{ ...thSx, display: { xs: 'none', md: 'table-cell' } }} align="right">เทียบกรัม</TableCell>
                <TableCell sx={{ ...thSx, display: { xs: 'none', md: 'table-cell' } }} align="right">ทองแท่งใช้แลก (บาท)</TableCell>
                <TableCell sx={thSx} align="right">ค่ากำเหน็จ</TableCell>
                <TableCell sx={{ ...thSx, display: { xs: 'none', md: 'table-cell' } }}>หมายเหตุ</TableCell>
                <TableCell sx={thSx} align="center">จัดการ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {displayedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 8, color: G.textMuted }}>
                    <SearchIcon sx={{ fontSize: 40, mb: 1, opacity: .4, display: 'block', mx: 'auto' }} />
                    <Typography sx={{ fontSize: 14, color: G.textMuted }}>
                      {search ? `ไม่พบ "${search}"` : 'ยังไม่มีข้อมูล'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : displayedData.map((item, i) => (
                <TableRow key={item.id} sx={{
                  bgcolor: i % 2 !== 0 ? alpha(G.accent, 0.03) : 'transparent',
                  '&:hover': { bgcolor: `${alpha(G.accent, 0.08)} !important` },
                  '& td': { borderColor: G.border, px: 2, py: 1.25 },
                }}>
                  <TableCell>
                    <Typography sx={{ fontSize: 13, fontWeight: 600, color: G.text, fontFamily: MONO }}>
                      {dayjs.utc(item.pickup_date).local().format('DD/MM/YY')}
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: G.textMuted, fontFamily: MONO }}>
                      {dayjs.utc(item.pickup_date).local().format('HH:mm')}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ fontSize: 13, color: G.text, fontWeight: 500 }}>
                      {item.wholesaler_name}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography sx={{ fontFamily: MONO, fontSize: 13, fontWeight: 600, color: G.brass }}>
                      {item.weight_baht.toFixed(2)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right" sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                    <Typography sx={{ fontFamily: MONO, fontSize: 13, color: G.textSub }}>
                      {item.weight_gram.toFixed(2)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right" sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                    <Typography sx={{ fontFamily: MONO, fontSize: 13, color: G.textSub }}>
                      {item.bar_used_baht.toFixed(2)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography sx={{ fontFamily: MONO, fontSize: 13, fontWeight: 600, color: G.success }}>
                      ฿{item.making_fee.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                    <Tooltip title={item.remark || ''} arrow>
                      <Typography sx={{ fontSize: 12, color: G.textMuted, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.remark || '—'}
                      </Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="ลบ" arrow>
                      <IconButton size="small" onClick={() => handleDelete(item.id)} disabled={deleting === item.id}
                        sx={{ color: G.danger, bgcolor: alpha(G.danger, 0.1), borderRadius: '7px',
                          '&:hover': { bgcolor: alpha(G.danger, 0.18) } }}>
                        {deleting === item.id
                          ? <CircularProgress size={14} sx={{ color: G.danger }} />
                          : <Delete sx={{ fontSize: 16 }} />}
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}

              {displayedData.length > 0 && (
                <TableRow sx={{ bgcolor: alpha(G.accent, 0.04), '& td': { borderTop: `1px solid ${G.border}`, py: 1.5, px: 2 } }}>
                  <TableCell colSpan={2}>
                    <Typography sx={{ fontSize: 13, fontWeight: 600, color: G.textSub }}>
                      รวม {filteredData.length} รายการ
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography sx={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: G.brass }}>
                      {totals.weight.toFixed(2)}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }} />
                  <TableCell align="right" sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                    <Typography sx={{ fontFamily: MONO, fontSize: 13, fontWeight: 600, color: G.textSub }}>
                      {totals.bar.toFixed(2)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography sx={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: G.success }}>
                      ฿{totals.fee.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }} />
                  <TableCell />
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
