// path: gold/src/components/GlobalSearch.tsx
/**
 * Global search bar — ใส่ใน AppBar
 * พิมพ์แล้ว debounce 300ms → ยิง /search → แสดง dropdown ผลลัพธ์
 * คลิกผลลัพธ์ → navigate ไปหน้ารายการที่ตรงกัน พร้อม pre-fill search
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, TextField, InputAdornment, IconButton, Paper, Typography,
  CircularProgress, Popper, ClickAwayListener, alpha,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import { useTheme } from "@mui/material/styles";
import dayjs, { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";

import { API_BASE } from "../config";
import { makeG } from "../utils/dashboardTokens";
import { SearchHit, SearchResults } from "../types";

dayjs.extend(utc);

const MONO = '"JetBrains Mono", ui-monospace, monospace';

const SECTION_ORDER: { key: keyof SearchResults; label: string }[] = [
  { key: 'bar_gold',          label: 'ทองแท่ง' },
  { key: 'ornament_gold',     label: 'ทองรูปพรรณ' },
  { key: 'pawn',              label: 'จำนำ' },
  { key: 'wholesaler',        label: 'ร้านส่ง' },
  { key: 'wholesaler_pickup', label: 'หยิบทองจากร้านส่ง' },
];

export default function GlobalSearch() {
  const theme = useTheme();
  const G = makeG(theme);
  const navigate = useNavigate();

  const [q, setQ] = useState("");
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);

  // debounced fetch — ยิงเมื่อมี q หรือ date อย่างน้อยหนึ่งอย่าง
  useEffect(() => {
    const hasQ = q.trim().length > 0;
    const hasDate = selectedDate !== null && selectedDate.isValid();
    if (!hasQ && !hasDate) {
      setResults(null);
      setOpen(false);
      return;
    }
    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (hasQ) params.set("q", q.trim());
        if (hasDate) params.set("date", selectedDate!.format("YYYY-MM-DD"));
        const res = await fetch(`${API_BASE}/search?${params.toString()}`);
        if (res.ok) {
          setResults(await res.json());
          setOpen(true);
        }
      } catch {
        setResults(null);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [q, selectedDate]);

  const handleClick = useCallback((hit: SearchHit) => {
    setOpen(false);
    setQ("");
    setSelectedDate(null);
    setResults(null);
    // นำทาง พร้อมส่ง q ทาง URL — หน้า list ที่รองรับจะ pre-fill ได้
    const params = new URLSearchParams();
    if (hit.query) params.set("q", hit.query);
    navigate(`${hit.route}?${params.toString()}`);
  }, [navigate]);

  const handleClear = () => {
    setQ("");
    setSelectedDate(null);
    setResults(null);
    setOpen(false);
  };

  const inputBoxSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: '10px', bgcolor: G.bg, fontSize: 13,
      '& fieldset': { borderColor: G.border },
      '&:hover fieldset': { borderColor: G.accent },
      '&.Mui-focused fieldset': { borderColor: G.accent },
    },
  };

  return (
    <ClickAwayListener onClickAway={() => setOpen(false)}>
      <Box ref={anchorRef} sx={{ position: 'relative', display: 'flex', gap: 1,
        width: { xs: 240, sm: 380, md: 480 } }}>
        {/* ช่องค้นหาข้อความ */}
        <TextField
          size="small"
          placeholder="ค้นหา ชื่อ, เบอร์, ร้าน..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => { if (results) setOpen(true); }}
          sx={{ ...inputBoxSx, flex: 1 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                {loading
                  ? <CircularProgress size={14} sx={{ color: G.textMuted }} />
                  : <SearchIcon sx={{ fontSize: 16, color: G.textMuted }} />}
              </InputAdornment>
            ),
            endAdornment: (q || selectedDate) ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={handleClear} sx={{ color: G.textMuted }}>
                  <CloseIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
        />
        {/* ช่องเลือกวันที่ */}
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="th">
          <DatePicker
            value={selectedDate}
            onChange={setSelectedDate}
            slotProps={{
              textField: {
                size: 'small',
                placeholder: 'วันที่',
                sx: { ...inputBoxSx, width: { xs: 110, sm: 150 } },
                onFocus: () => { if (results) setOpen(true); },
              },
            }}
          />
        </LocalizationProvider>

        <Popper
          open={open && !!results}
          anchorEl={anchorRef.current}
          placement="bottom-start"
          style={{ zIndex: 1500, width: anchorRef.current?.offsetWidth }}
        >
          <Paper sx={{
            mt: 1, borderRadius: 3, border: `1px solid ${G.border}`,
            bgcolor: G.paper, maxHeight: 480, overflow: 'auto',
            boxShadow: '0 10px 40px -10px rgba(0,0,0,.25)',
          }}>
            {results && results.total === 0 ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography sx={{ fontSize: 13, color: G.textMuted }}>
                  ไม่พบผลลัพธ์{q ? ` สำหรับ "${q}"` : ''}{selectedDate ? ` ในวันที่ ${selectedDate.format('DD/MM/YYYY')}` : ''}
                </Typography>
              </Box>
            ) : (
              <>
                {results && SECTION_ORDER.map(({ key, label }) => {
                  const hits = results[key] as SearchHit[];
                  if (!hits || hits.length === 0) return null;
                  return (
                    <Box key={key}>
                      <Box sx={{
                        px: 2, py: 1, bgcolor: G.bg, borderBottom: `1px solid ${G.border}`,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}>
                        <Typography sx={{
                          fontSize: 10.5, fontWeight: 700, color: G.textMuted,
                          textTransform: 'uppercase', letterSpacing: '.1em', fontFamily: MONO,
                        }}>
                          {label}
                        </Typography>
                        <Typography sx={{ fontSize: 11, color: G.textFaint, fontFamily: MONO }}>
                          {hits.length}
                        </Typography>
                      </Box>
                      {hits.map((hit) => (
                        <Box
                          key={`${hit.entity}-${hit.id}`}
                          onClick={() => handleClick(hit)}
                          sx={{
                            px: 2, py: 1.25, cursor: 'pointer',
                            borderBottom: `1px solid ${G.border}`,
                            transition: 'background-color .12s',
                            '&:hover': { bgcolor: alpha(G.accent, 0.08) },
                            '&:last-child': { borderBottom: 0 },
                          }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                            <Typography sx={{ fontSize: 13, fontWeight: 600, color: G.text }}>
                              {hit.title}
                            </Typography>
                            {hit.date && (
                              <Typography sx={{ fontSize: 11, color: G.textMuted, fontFamily: MONO, flexShrink: 0 }}>
                                {dayjs.utc(hit.date).local().format('DD/MM/YY')}
                              </Typography>
                            )}
                          </Box>
                          {hit.subtitle && (
                            <Typography sx={{ fontSize: 11.5, color: G.textMuted, mt: 0.25 }}>
                              {hit.subtitle}
                            </Typography>
                          )}
                        </Box>
                      ))}
                    </Box>
                  );
                })}
                <Box sx={{ p: 1.25, textAlign: 'center', borderTop: `1px solid ${G.border}`, bgcolor: G.bg }}>
                  <Typography sx={{ fontSize: 10.5, color: G.textFaint, fontFamily: MONO, letterSpacing: '.1em' }}>
                    {results?.total} ผลลัพธ์ทั้งหมด
                  </Typography>
                </Box>
              </>
            )}
          </Paper>
        </Popper>
      </Box>
    </ClickAwayListener>
  );
}

// hook ช่วย: list page อ่าน ?q= จาก URL แล้ว pre-fill search
export function useSearchParam(defaultValue: string = ""): string {
  const [val, setVal] = useState(() => {
    if (typeof window === "undefined") return defaultValue;
    const params = new URLSearchParams(window.location.search);
    return params.get("q") || defaultValue;
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const newVal = params.get("q") || defaultValue;
    setVal(newVal);
  }, [defaultValue]);

  return val;
}
