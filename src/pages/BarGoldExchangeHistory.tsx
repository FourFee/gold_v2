// path: src/pages/BarGoldExchangeHistory.tsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody,
  TextField, IconButton, TablePagination, CircularProgress, Skeleton,
  InputAdornment, Tooltip, Button, Grid, alpha,
} from '@mui/material';
import { Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { Edit, Save, Delete, Search as SearchIcon, Refresh } from '@mui/icons-material';
import { Snackbar, Alert } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import dayjs from 'dayjs';
import { API_BASE } from '../config';
import { useNotify } from '../hooks/useNotify';
import { makeG } from '../utils/dashboardTokens';
import { dateHaystack, buildSearchFilter } from '../utils/listFilter';

const MONO = '"JetBrains Mono", ui-monospace, monospace';
const API_ENDPOINT = `${API_BASE}/bar-gold-exchange`;

interface ExchangeData {
  id: number;
  date: string;
  firstname: string;
  lastname: string;
  weightBaht: number;
  weightGram: number;
}

export default function BarGoldExchangeHistory() {
  const theme = useTheme();
  const G = makeG(theme);
  const { snackbar, notify, handleClose } = useNotify();

  const [history, setHistory]         = useState<ExchangeData[]>([]);
  const [loading, setLoading]         = useState(true);
  const [editId, setEditId]           = useState<number | null>(null);
  const [form, setForm]               = useState<Partial<ExchangeData>>({});
  const [deleting, setDeleting]       = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  // ── Search & Pagination ──────────────────────────────────────────
  const [search, setSearch]           = useState('');
  const [page, setPage]               = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // ── Fetch ────────────────────────────────────────────────────────
  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_ENDPOINT}-history`);
      if (!res.ok) throw new Error();
      const data: ExchangeData[] = await res.json();
      setHistory(data);
      setPage(0);
    } catch {
      notify('โหลดข้อมูลไม่สำเร็จ', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  // ── Search filter ────────────────────────────────────────────────
  const filteredData = useMemo(() => {
    const matches = buildSearchFilter(search);
    return history.filter(item =>
      matches([
        dateHaystack(item.date),
        item.firstname,
        item.lastname,
        `${item.firstname} ${item.lastname}`,
        String(item.weightBaht),
        String(item.weightGram),
      ].filter(Boolean).join(' '))
    );
  }, [history, search]);

  const displayedData = filteredData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  // ── Totals ───────────────────────────────────────────────────────
  const totals = useMemo(() => filteredData.reduce((acc, item) => ({
    totalBaht: acc.totalBaht + (item.weightBaht || 0),
    totalGram: acc.totalGram + (item.weightGram || 0),
  }), { totalBaht: 0, totalGram: 0 }), [filteredData]);

  // ── Edit ─────────────────────────────────────────────────────────
  const startEdit = (row: ExchangeData) => {
    setEditId(row.id);
    setForm({ ...row, date: row.date ? dayjs(row.date).format('YYYY-MM-DDTHH:mm') : '' });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const isNumeric = name === 'weightBaht' || name === 'weightGram';
    setForm(f => ({ ...f, [name]: isNumeric ? (value === '' ? '' : parseFloat(value)) : value }));
  };

  const saveEdit = async () => {
    if (!editId) return;
    const payload = {
      ...form,
      date: form.date ? dayjs(form.date as string).toISOString()
                      : history.find(h => h.id === editId)?.date || new Date().toISOString(),
      weightBaht: form.weightBaht || 0,
      weightGram: form.weightGram || 0,
    };
    try {
      const res = await fetch(`${API_ENDPOINT}/update/${editId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      notify('บันทึกข้อมูลสำเร็จ', 'success');
      setEditId(null);
      setForm({});
      fetchHistory();
    } catch {
      notify('ไม่สามารถอัปเดตข้อมูลได้', 'error');
    }
  };

  // ── Delete ───────────────────────────────────────────────────────
  const handleDelete = (id: number) => { setPendingDeleteId(id); setConfirmOpen(true); };

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;
    setDeleting(pendingDeleteId);
    setConfirmOpen(false);
    try {
      await fetch(`${API_ENDPOINT}/delete/${pendingDeleteId}`, { method: 'DELETE' });
      await fetchHistory();
    } finally {
      setDeleting(null);
      setPendingDeleteId(null);
    }
  };

  // ── Styles ───────────────────────────────────────────────────────
  const paperSx = {
    border: `1px solid ${G.border}`, bgcolor: G.paper, borderRadius: 3,
    boxShadow: '0 1px 0 rgba(27,23,19,.04),0 8px 24px -14px rgba(27,23,19,.14)', overflow: 'hidden',
  };
  const thSx = {
    fontSize: '0.78rem', fontWeight: 700, color: G.textMuted,
    textTransform: 'uppercase' as const, letterSpacing: '.06em',
    borderBottom: `1px solid ${G.border}`, bgcolor: G.bg, py: 1.5, px: 2,
  };

  // ── Loading skeleton ─────────────────────────────────────────────
  if (loading) return (
    <Box sx={{ p: { xs: 2, md: 4 }, bgcolor: G.bg, minHeight: '100vh' }}>
      <Skeleton width={260} height={40} sx={{ mb: 1 }} />
      <Skeleton width={180} height={20} sx={{ mb: 3 }} />
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[0, 1].map(i => (
          <Grid item xs={12} md={6} key={i}>
            <Skeleton variant="rectangular" height={110} sx={{ borderRadius: 3 }} />
          </Grid>
        ))}
      </Grid>
      <Skeleton variant="rectangular" height={56} sx={{ borderRadius: 3, mb: 2 }} />
      <Skeleton variant="rectangular" height={380} sx={{ borderRadius: 3 }} />
    </Box>
  );

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, bgcolor: G.bg, minHeight: '100vh', maxWidth: 1200, mx: 'auto' }}>

      {/* ── Header ── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Box>
          <Typography sx={{
            fontSize: 18, fontWeight: 600, color: G.text, letterSpacing: '-.01em',
            display: 'flex', alignItems: 'center', gap: 1,
            '&::before': { content: '""', width: 4, height: 20, bgcolor: G.accent, borderRadius: 1, display: 'inline-block' },
          }}>
            ประวัติแลกเปลี่ยนทองแท่ง
          </Typography>
          <Typography sx={{ color: G.textMuted, fontSize: 12.5, mt: 0.5 }}>
            รายการทองแท่งที่แลกเป็นทองรูปพรรณ · {filteredData.length} รายการ
          </Typography>
        </Box>
        <Button size="small" startIcon={<Refresh sx={{ fontSize: 15 }} />} onClick={fetchHistory}
          sx={{
            color: G.textSub, border: `1px solid ${G.border}`, borderRadius: '8px',
            bgcolor: G.paper, fontWeight: 500, fontSize: 13, px: 2,
            '&:hover': { bgcolor: G.bg, borderColor: G.accent, color: G.accent },
          }}>
          รีเฟรช
        </Button>
      </Box>

      {/* ── Stats ── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'น้ำหนักรวม (บาท)', value: totals.totalBaht.toFixed(2), unit: 'บาทน้ำหนัก', color: G.brass },
          { label: 'น้ำหนักรวม (กรัม)', value: totals.totalGram.toFixed(3), unit: 'กรัม', color: G.accent },
        ].map(c => (
          <Grid item xs={12} md={6} key={c.label}>
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

      {/* ── Search bar ── */}
      <Paper sx={{ ...paperSx, mb: 2 }} elevation={0}>
        <Box sx={{ p: 2.5, display: 'flex', justifyContent: 'flex-end' }}>
          <TextField
            variant="outlined"
            placeholder="ค้นหา ชื่อ, วันที่, น้ำหนัก..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            size="small"
            sx={{
              width: { xs: '100%', sm: 300 },
              '& .MuiOutlinedInput-root': {
                borderRadius: '10px', bgcolor: G.bg, fontSize: 13,
                '& fieldset': { borderColor: G.border },
                '&:hover fieldset': { borderColor: G.accent },
                '&.Mui-focused fieldset': { borderColor: G.accent },
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 16, color: G.textMuted }} />
                </InputAdornment>
              ),
              endAdornment: search ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => { setSearch(''); setPage(0); }} sx={{ color: G.textMuted }}>
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
          <Table sx={{ minWidth: 600 }}>
            <TableHead>
              <TableRow>
                {[
                  { label: 'วันที่/เวลา' },
                  { label: 'ชื่อลูกค้า' },
                  { label: 'น้ำหนัก (บาท)', right: true },
                  { label: 'น้ำหนัก (กรัม)', right: true },
                  { label: 'จัดการ', center: true },
                ].map(h => (
                  <TableCell key={h.label}
                    align={h.right ? 'right' : h.center ? 'center' : 'left'}
                    sx={thSx}>
                    {h.label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {displayedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 8, color: G.textMuted }}>
                    <SearchIcon sx={{ fontSize: 40, mb: 1, opacity: .4, display: 'block', mx: 'auto' }} />
                    <Typography sx={{ fontSize: 14, color: G.textMuted }}>
                      {search ? `ไม่พบ "${search}"` : 'ยังไม่มีข้อมูล'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : displayedData.map((row, i) => {
                const isEditing = editId === row.id;
                return (
                  <TableRow key={row.id} sx={{
                    bgcolor: i % 2 !== 0 ? alpha(G.accent, 0.03) : 'transparent',
                    '&:hover': { bgcolor: `${alpha(G.accent, 0.08)} !important` },
                    '&:last-child td': { borderBottom: 0 },
                    '& td': { borderColor: G.border, px: 2, py: 1.25 },
                  }}>

                    {/* วันที่ */}
                    <TableCell>
                      {isEditing ? (
                        <TextField name="date" type="datetime-local" value={form.date || ''}
                          onChange={handleChange} size="small" sx={{ width: 190 }}
                          InputLabelProps={{ shrink: true }} />
                      ) : (
                        <Box>
                          <Typography sx={{ fontSize: 13, fontWeight: 600, color: G.text, fontFamily: MONO }}>
                            {dayjs(row.date).format('DD/MM/YY')}
                          </Typography>
                          <Typography sx={{ fontSize: 11, color: G.textMuted, fontFamily: MONO }}>
                            {dayjs(row.date).format('HH:mm')}
                          </Typography>
                        </Box>
                      )}
                    </TableCell>

                    {/* ชื่อลูกค้า */}
                    <TableCell>
                      {isEditing ? (
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <TextField name="firstname" label="ชื่อ" value={form.firstname || ''} onChange={handleChange} size="small" sx={{ width: 110 }} />
                          <TextField name="lastname" label="นามสกุล" value={form.lastname || ''} onChange={handleChange} size="small" sx={{ width: 110 }} />
                        </Box>
                      ) : (
                        <Typography sx={{ fontSize: 13, color: G.text }}>
                          {`${row.firstname} ${row.lastname}`.trim() || '—'}
                        </Typography>
                      )}
                    </TableCell>

                    {/* น้ำหนัก (บาท) */}
                    <TableCell align="right">
                      {isEditing ? (
                        <TextField name="weightBaht" type="number" value={form.weightBaht ?? ''} onChange={handleChange} size="small" sx={{ width: 100 }} />
                      ) : (
                        <Typography sx={{ fontFamily: MONO, fontSize: 13, fontWeight: 600, color: G.danger }}>
                          -{row.weightBaht.toFixed(2)}
                        </Typography>
                      )}
                    </TableCell>

                    {/* น้ำหนัก (กรัม) */}
                    <TableCell align="right">
                      {isEditing ? (
                        <TextField name="weightGram" type="number" value={form.weightGram ?? ''} onChange={handleChange} size="small" sx={{ width: 100 }} />
                      ) : (
                        <Typography sx={{ fontFamily: MONO, fontSize: 13, color: G.textSub }}>
                          -{row.weightGram.toFixed(3)}
                        </Typography>
                      )}
                    </TableCell>

                    {/* จัดการ */}
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 0.75, justifyContent: 'center' }}>
                        {isEditing ? (
                          <Tooltip title="บันทึก" arrow>
                            <IconButton size="small" onClick={saveEdit}
                              sx={{ color: G.success, bgcolor: alpha(G.success, 0.1), borderRadius: '7px', '&:hover': { bgcolor: alpha(G.success, 0.18) } }}>
                              <Save sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                        ) : (
                          <Tooltip title="แก้ไข" arrow>
                            <IconButton size="small" onClick={() => startEdit(row)}
                              sx={{ color: G.accent, bgcolor: alpha(G.accent, 0.1), borderRadius: '7px', '&:hover': { bgcolor: alpha(G.accent, 0.18) } }}>
                              <Edit sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="ลบ" arrow>
                          <IconButton size="small" onClick={() => handleDelete(row.id)} disabled={deleting === row.id}
                            sx={{ color: G.danger, bgcolor: alpha(G.danger, 0.1), borderRadius: '7px', '&:hover': { bgcolor: alpha(G.danger, 0.18) } }}>
                            {deleting === row.id
                              ? <CircularProgress size={14} sx={{ color: G.danger }} />
                              : <Delete sx={{ fontSize: 16 }} />}
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}

              {/* Summary row */}
              {displayedData.length > 0 && (
                <TableRow sx={{ bgcolor: alpha(G.accent, 0.04), '& td': { borderTop: `1px solid ${G.border}`, py: 1.5, px: 2 } }}>
                  <TableCell colSpan={2}>
                    <Typography sx={{ fontSize: 13, fontWeight: 600, color: G.textSub }}>
                      รวม {filteredData.length} รายการ
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography sx={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: G.danger }}>
                      -{totals.totalBaht.toFixed(2)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography sx={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: G.textSub }}>
                      -{totals.totalGram.toFixed(3)}
                    </Typography>
                  </TableCell>
                  <TableCell />
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>

        {/* ── Pagination ── */}
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

      {/* ── Snackbar ── */}
      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snackbar.severity} onClose={handleClose}>{snackbar.message}</Alert>
      </Snackbar>

      {/* ── Confirm Delete Dialog ── */}
      <Dialog open={confirmOpen} PaperProps={{ sx: { borderRadius: 3, bgcolor: G.paper, border: `1px solid ${G.border}` } }}>
        <DialogTitle sx={{ color: G.text, fontWeight: 600 }}>ยืนยันการลบ</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: G.textSub }}>คุณต้องการลบรายการนี้หรือไม่?</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => setConfirmOpen(false)}
            sx={{ color: G.textSub, border: `1px solid ${G.border}`, borderRadius: '8px' }}>
            ยกเลิก
          </Button>
          <Button onClick={confirmDelete}
            sx={{ bgcolor: G.danger, color: '#fff', borderRadius: '8px', '&:hover': { bgcolor: alpha(G.danger, 0.85) } }}>
            ลบ
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
