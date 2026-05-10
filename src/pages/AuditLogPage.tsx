// path: gold/src/pages/AuditLogPage.tsx
import { Fragment, useEffect, useState, useCallback, useMemo } from "react";
import {
  Box, Paper, Typography, Table, TableHead, TableRow, TableCell, TableBody,
  Button, IconButton, TablePagination, Skeleton, alpha,
  TextField, MenuItem, Tooltip, Snackbar, Alert,
  Collapse, InputAdornment,
} from "@mui/material";
import { Refresh, Search as SearchIcon, ExpandMore, ExpandLess, Delete as DeleteIcon } from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

import { API_BASE } from "../config";
import { useNotify } from "../hooks/useNotify";
import { makeG } from "../utils/dashboardTokens";
import { AuditLogEntry } from "../types";

dayjs.extend(utc);

const MONO = '"JetBrains Mono", ui-monospace, monospace';

const ENTITY_LABEL: Record<string, string> = {
  bar_gold: 'ทองแท่ง',
  ornament_gold: 'ทองรูปพรรณ',
  pawn: 'จำนำ',
  all_gold_transactions: 'ธุรกรรมทั้งหมด',
  wholesaler_pickup: 'หยิบจากร้านส่ง',
  wholesaler: 'ร้านส่ง',
};

const ACTION_COLOR = (action: string, G: ReturnType<typeof makeG>) => {
  if (action === 'CREATE') return G.success;
  if (action === 'DELETE') return G.danger;
  return G.accent;
};

export default function AuditLogPage() {
  const theme = useTheme();
  const G = makeG(theme);
  const { snackbar, notify, handleClose } = useNotify();

  const [data, setData]                 = useState<AuditLogEntry[]>([]);
  const [entities, setEntities]         = useState<string[]>([]);
  const [filterEntity, setFilterEntity] = useState<string>("all");
  const [filterAction, setFilterAction] = useState<string>("all");
  const [search, setSearch]             = useState("");
  const [page, setPage]                 = useState(0);
  const [rowsPerPage, setRowsPerPage]   = useState(25);
  const [loading, setLoading]           = useState(true);
  const [expanded, setExpanded]         = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const ep = filterEntity === 'all' ? '' : `&entity=${filterEntity}`;
      const ap = filterAction === 'all' ? '' : `&action=${filterAction}`;
      const [listRes, entRes] = await Promise.all([
        fetch(`${API_BASE}/audit-log/list?limit=500${ep}${ap}`),
        fetch(`${API_BASE}/audit-log/entities`),
      ]);
      if (!listRes.ok || !entRes.ok) throw new Error();
      setData(await listRes.json());
      setEntities(await entRes.json());
      setPage(0);
    } catch {
      notify("โหลด audit log ไม่สำเร็จ", "error");
    } finally {
      setLoading(false);
    }
  }, [filterEntity, filterAction, notify]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter(r => {
      const hay = [r.entity, r.action, String(r.entity_id), r.user, r.changes].join(' | ').toLowerCase();
      return hay.includes(q);
    });
  }, [data, search]);

  const displayed = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const paperSx = {
    border: `1px solid ${G.border}`, bgcolor: G.paper, borderRadius: 3,
    boxShadow: '0 1px 0 rgba(27,23,19,.04),0 8px 24px -14px rgba(27,23,19,.14)', overflow: 'hidden',
  };
  const thSx = {
    fontSize: '0.75rem', fontWeight: 700, color: G.textMuted,
    textTransform: 'uppercase' as const, letterSpacing: '.06em',
    borderBottom: `1px solid ${G.border}`, bgcolor: G.bg, py: 1.5, px: 2,
  };

  const formatChanges = (raw: string) => {
    try { return JSON.stringify(JSON.parse(raw), null, 2); }
    catch { return raw; }
  };

  if (loading && data.length === 0) return (
    <Box sx={{ p: { xs: 2, md: 4 }, bgcolor: G.bg, minHeight: '100vh' }}>
      <Skeleton width={240} height={40} sx={{ mb: 1 }} />
      <Skeleton width={180} height={20} sx={{ mb: 3 }} />
      <Skeleton variant="rectangular" height={56} sx={{ borderRadius: 3, mb: 2 }} />
      <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 3 }} />
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
            ประวัติการเปลี่ยนแปลง
          </Typography>
          <Typography sx={{ color: G.textMuted, fontSize: 12.5, mt: 0.5 }}>
            Audit log · {filtered.length} รายการ
          </Typography>
        </Box>
        <Button size="small" startIcon={<Refresh sx={{ fontSize: 15 }} />} onClick={fetchData}
          sx={{ color: G.textSub, border: `1px solid ${G.border}`, borderRadius: '8px',
            bgcolor: G.paper, fontWeight: 500, fontSize: 13, px: 2,
            '&:hover': { bgcolor: G.bg, borderColor: G.accent, color: G.accent } }}>
          รีเฟรช
        </Button>
      </Box>

      {/* Filters */}
      <Paper sx={{ ...paperSx, mb: 2 }} elevation={0}>
        <Box sx={{ p: 2.5, display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'flex-end' }}>
          <Box sx={{ minWidth: 180 }}>
            <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: G.textFaint, textTransform: 'uppercase', letterSpacing: '.1em', mb: 0.75, fontFamily: MONO }}>ตาราง</Typography>
            <TextField select size="small" fullWidth value={filterEntity} onChange={e => setFilterEntity(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', bgcolor: G.bg, fontSize: 13 } }}>
              <MenuItem value="all">ทั้งหมด</MenuItem>
              {entities.map(e => (
                <MenuItem key={e} value={e}>{ENTITY_LABEL[e] || e}</MenuItem>
              ))}
            </TextField>
          </Box>
          <Box sx={{ minWidth: 160 }}>
            <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: G.textFaint, textTransform: 'uppercase', letterSpacing: '.1em', mb: 0.75, fontFamily: MONO }}>การกระทำ</Typography>
            <TextField select size="small" fullWidth value={filterAction} onChange={e => setFilterAction(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', bgcolor: G.bg, fontSize: 13 } }}>
              <MenuItem value="all">ทั้งหมด</MenuItem>
              <MenuItem value="CREATE">สร้าง</MenuItem>
              <MenuItem value="UPDATE">แก้ไข</MenuItem>
              <MenuItem value="DELETE">ลบ</MenuItem>
            </TextField>
          </Box>
          <TextField placeholder="ค้นหา..." value={search} onChange={e => setSearch(e.target.value)} size="small"
            sx={{ flex: 1, minWidth: 200,
              '& .MuiOutlinedInput-root': { borderRadius: '10px', bgcolor: G.bg, fontSize: 13 } }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16, color: G.textMuted }} /></InputAdornment>,
              endAdornment: search ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearch('')} sx={{ color: G.textMuted }}>
                    <DeleteIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </InputAdornment>
              ) : null,
            }}
          />
        </Box>
      </Paper>

      {/* Table */}
      <Paper sx={paperSx} elevation={0}>
        <Box sx={{ overflowX: 'auto' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={thSx}>เวลา</TableCell>
                <TableCell sx={thSx}>ตาราง</TableCell>
                <TableCell sx={thSx}>การกระทำ</TableCell>
                <TableCell sx={thSx} align="right">ID</TableCell>
                <TableCell sx={thSx}>ผู้ทำ</TableCell>
                <TableCell sx={thSx} align="center">รายละเอียด</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {displayed.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 8, color: G.textMuted, fontSize: 13 }}>
                    {search ? `ไม่พบ "${search}"` : 'ยังไม่มีข้อมูล'}
                  </TableCell>
                </TableRow>
              ) : displayed.map((r, i) => (
                <Fragment key={r.id}>
                  <TableRow sx={{
                    bgcolor: i % 2 !== 0 ? alpha(G.accent, 0.03) : 'transparent',
                    '&:hover': { bgcolor: `${alpha(G.accent, 0.08)} !important` },
                    '& td': { borderColor: G.border, px: 2, py: 1.25 },
                  }}>
                    <TableCell>
                      <Typography sx={{ fontSize: 12.5, color: G.text, fontFamily: MONO }}>
                        {dayjs.utc(r.timestamp).local().format('DD/MM/YY')}
                      </Typography>
                      <Typography sx={{ fontSize: 11, color: G.textMuted, fontFamily: MONO }}>
                        {dayjs.utc(r.timestamp).local().format('HH:mm:ss')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: 13, color: G.text }}>
                        {ENTITY_LABEL[r.entity] || r.entity}
                      </Typography>
                      <Typography sx={{ fontSize: 11, color: G.textMuted, fontFamily: MONO }}>
                        {r.entity}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{
                        display: 'inline-block', px: 1, py: 0.25, borderRadius: '6px',
                        bgcolor: alpha(ACTION_COLOR(r.action, G), 0.12),
                        color: ACTION_COLOR(r.action, G),
                        fontSize: 11, fontWeight: 700, fontFamily: MONO, letterSpacing: '.05em',
                      }}>
                        {r.action}
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Typography sx={{ fontFamily: MONO, fontSize: 12, color: G.textSub }}>
                        {r.entity_id ?? '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: 12, color: G.textSub, fontFamily: MONO }}>{r.user}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title={expanded === r.id ? 'ปิด' : 'ดู changes'} arrow>
                        <IconButton size="small" onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                          sx={{ color: G.textSub }}>
                          {expanded === r.id ? <ExpandLess sx={{ fontSize: 18 }} /> : <ExpandMore sx={{ fontSize: 18 }} />}
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={6} sx={{ p: 0, border: 0 }}>
                      <Collapse in={expanded === r.id} timeout="auto" unmountOnExit>
                        <Box sx={{ p: 2.5, bgcolor: alpha(G.accent, 0.04), borderTop: `1px solid ${G.border}` }}>
                          <Typography sx={{ fontSize: 11, fontWeight: 700, color: G.textMuted, textTransform: 'uppercase', letterSpacing: '.1em', mb: 1 }}>
                            Changes
                          </Typography>
                          <Box component="pre" sx={{
                            fontFamily: MONO, fontSize: 11.5, color: G.textSub,
                            bgcolor: G.paper, p: 2, borderRadius: 2, border: `1px solid ${G.border}`,
                            overflow: 'auto', m: 0, maxHeight: 320,
                          }}>
                            {formatChanges(r.changes)}
                          </Box>
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </Box>
        <Box sx={{ borderTop: `1px solid ${G.border}` }}>
          <TablePagination
            rowsPerPageOptions={[10, 25, 50, 100]}
            component="div"
            count={filtered.length}
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
    </Box>
  );
}
