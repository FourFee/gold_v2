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
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

import { API_BASE } from "../config";
import { makeG } from "../utils/dashboardTokens";
import { SearchHit, SearchResults } from "../types";

dayjs.extend(utc);

const MONO = '"JetBrains Mono", ui-monospace, monospace';

const ENTITY_LABEL: Record<SearchHit['entity'], string> = {
  bar_gold: 'ทองแท่ง',
  ornament_gold: 'ทองรูปพรรณ',
  pawn: 'จำนำ',
  wholesaler: 'ร้านส่ง',
  wholesaler_pickup: 'หยิบทอง',
};

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
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);

  // debounced fetch
  useEffect(() => {
    if (!q.trim()) {
      setResults(null);
      setOpen(false);
      return;
    }
    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(q.trim())}`);
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
  }, [q]);

  const handleClick = useCallback((hit: SearchHit) => {
    setOpen(false);
    setQ("");
    setResults(null);
    // นำทาง พร้อมส่ง q ทาง URL — หน้า list ที่รองรับจะ pre-fill ได้
    navigate(`${hit.route}?q=${encodeURIComponent(hit.query)}`);
  }, [navigate]);

  const handleClear = () => {
    setQ("");
    setResults(null);
    setOpen(false);
  };

  return (
    <ClickAwayListener onClickAway={() => setOpen(false)}>
      <Box ref={anchorRef} sx={{ position: 'relative', width: { xs: 180, sm: 280, md: 360 } }}>
        <TextField
          size="small"
          fullWidth
          placeholder="ค้นหา ชื่อ, เบอร์, ร้าน..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => { if (results) setOpen(true); }}
          sx={{
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
                {loading
                  ? <CircularProgress size={14} sx={{ color: G.textMuted }} />
                  : <SearchIcon sx={{ fontSize: 16, color: G.textMuted }} />}
              </InputAdornment>
            ),
            endAdornment: q ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={handleClear} sx={{ color: G.textMuted }}>
                  <CloseIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
        />

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
                  ไม่พบผลลัพธ์สำหรับ "{q}"
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
