// path: gold/src/components/PeriodNavigator.tsx
/**
 * Period toggle (วัน/สัปดาห์/เดือน/ทั้งหมด) + date navigator แบบเดียวกับ Dashboard
 *
 * ใช้คู่กับ filterByPeriod() เพื่อกรอง record ตาม anchor date + period
 */
import { Box, Typography, IconButton, alpha } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import dayjs, { Dayjs } from "dayjs";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { makeG } from "../utils/dashboardTokens";

const MONO = '"JetBrains Mono", ui-monospace, monospace';
const MONTHS_TH = [
  'มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
  'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม',
];
const MONTHS_TH_SHORT = [
  'ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.',
  'ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.',
];

export type Period = "day" | "week" | "month" | "all";

const PERIODS: { value: Period; label: string }[] = [
  { value: 'day',   label: 'วัน'      },
  { value: 'week',  label: 'สัปดาห์'  },
  { value: 'month', label: 'เดือน'    },
  { value: 'all',   label: 'ทั้งหมด'  },
];

interface Props {
  period: Period;
  onPeriodChange: (p: Period) => void;
  selectedDate: Dayjs;
  onDateChange: (d: Dayjs) => void;
}

export function formatPeriodLabel(period: Period, d: Dayjs): string {
  if (period === "all") return "ทั้งหมด";
  if (period === "day") return `${d.date()} ${MONTHS_TH[d.month()]} ${d.year() + 543}`;
  if (period === "week") {
    const ws = d.startOf('week');
    const we = ws.add(6, 'day');
    if (ws.month() === we.month()) {
      return `${ws.date()} – ${we.date()} ${MONTHS_TH_SHORT[we.month()]} ${we.year() + 543}`;
    }
    return `${ws.date()} ${MONTHS_TH_SHORT[ws.month()]} – ${we.date()} ${MONTHS_TH_SHORT[we.month()]} ${we.year() + 543}`;
  }
  return `${MONTHS_TH[d.month()]} ${d.year() + 543}`;
}

/**
 * กรอง record ตาม period + anchor date
 * @param itemDate ISO string ของ record
 * @param period day | week | month | all
 * @param anchor วันที่ที่ผู้ใช้เลือก (ใช้เป็นจุดอ้างอิงสำหรับ week/month)
 */
export function isInPeriod(itemDate: string, period: Period, anchor: Dayjs): boolean {
  if (period === "all") return true;
  const d = dayjs(itemDate);
  if (!d.isValid()) return false;
  if (period === "day")   return d.isSame(anchor, 'day');
  if (period === "month") return d.isSame(anchor, 'month');
  // week
  const ws = anchor.startOf('week');
  const we = ws.add(7, 'day'); // exclusive end
  return (d.isSame(ws) || d.isAfter(ws)) && d.isBefore(we);
}

export default function PeriodNavigator({ period, onPeriodChange, selectedDate, onDateChange }: Props) {
  const theme = useTheme();
  const G = makeG(theme);

  const navDate = (dir: -1 | 1) => {
    if (period === "day")   { onDateChange(selectedDate.add(dir, 'day')); return; }
    if (period === "week")  { onDateChange(selectedDate.add(dir * 7, 'day')); return; }
    if (period === "month") { onDateChange(selectedDate.add(dir, 'month')); return; }
  };

  const label = formatPeriodLabel(period, selectedDate);
  const showNav = period !== "all";

  return (
    <Box>
      <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: G.textFaint, textTransform: 'uppercase', letterSpacing: '.1em', mb: 0.75, fontFamily: MONO }}>
        ช่วงเวลา
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Period toggle */}
        <Box sx={{ display: 'inline-flex', p: '3px', bgcolor: G.bg, border: `1px solid ${G.border}`, borderRadius: '10px' }}>
          {PERIODS.map(p => (
            <Box key={p.value} component="button" onClick={() => onPeriodChange(p.value)}
              sx={{
                border: period === p.value ? `1px solid ${G.border}` : '1px solid transparent',
                borderRadius: '7px', px: 1.5, py: 0.625, cursor: 'pointer',
                bgcolor:    period === p.value ? G.paper : 'transparent',
                color:      period === p.value ? G.text  : G.textMuted,
                fontWeight: period === p.value ? 600 : 400,
                fontSize: 13, fontFamily: 'inherit', transition: 'all .15s',
                '&:hover': { color: G.text },
              }}>
              {p.label}
            </Box>
          ))}
        </Box>

        {/* Date navigator */}
        {showNav && (
          <Box sx={{
            display: 'inline-flex', alignItems: 'center', gap: 0.5,
            bgcolor: G.bg, border: `1px solid ${G.border}`, borderRadius: '10px', p: '2px',
          }}>
            <IconButton size="small" onClick={() => navDate(-1)}
              sx={{ borderRadius: '7px', color: G.textSub,
                '&:hover': { bgcolor: alpha(G.accent, 0.1), color: G.accent } }}>
              <ChevronLeftIcon sx={{ fontSize: 18 }} />
            </IconButton>
            <Typography sx={{ minWidth: 140, textAlign: 'center', fontSize: 13, fontWeight: 600, color: G.text, px: 0.5 }}>
              {label}
            </Typography>
            <IconButton size="small" onClick={() => navDate(1)}
              sx={{ borderRadius: '7px', color: G.textSub,
                '&:hover': { bgcolor: alpha(G.accent, 0.1), color: G.accent } }}>
              <ChevronRightIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>
        )}
      </Box>
    </Box>
  );
}
