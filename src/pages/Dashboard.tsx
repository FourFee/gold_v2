import { useEffect, useState, useMemo } from "react";
import {
  Box, Grid, Typography, Card, CardContent,
  Skeleton, Chip, Stack, LinearProgress,
  IconButton, ToggleButtonGroup, ToggleButton, Divider, alpha
} from "@mui/material";
import { LineChart, BarChart } from '@mui/x-charts';
import dayjs, { Dayjs } from 'dayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import 'dayjs/locale/th';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import weekOfYear from 'dayjs/plugin/weekOfYear';

import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import MultilineChartIcon from '@mui/icons-material/MultilineChart';
import BarChartIcon from '@mui/icons-material/BarChart';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';

import { API_BASE, GOLD_BAHT_TO_GRAM_BAR, GOLD_BAHT_TO_GRAM_ORNAMENT } from "../config";

dayjs.extend(localizedFormat);
dayjs.extend(customParseFormat);
dayjs.extend(weekOfYear);
dayjs.locale('th');

// ── Design tokens ──────────────────────────────────────────────
const G = {
  brass:       '#C9A84C',
  brassLight:  'rgba(201,168,76,0.10)',
  brassBorder: 'rgba(201,168,76,0.22)',
  cream:       '#FAF8F3',
  surface:     '#FFFFFF',
  border:      '#EDE9E0',
  success:     '#16A34A',
  successBg:   'rgba(22,163,74,0.09)',
  danger:      '#DC2626',
  dangerBg:    'rgba(220,38,38,0.09)',
  text:        '#1C1A14',
  textSub:     '#6B6456',
  textMuted:   '#9D9082',
};

type Period = "day" | "week" | "month";
type ChartView = "area" | "line" | "bar";

interface SummaryData {
  sellOut: number; exchange: number; buyIn: number;
  bar_buy: number; bar_sell: number; plated_gold: number;
  total_gold_flow: number; redeem: number; interest: number;
  pawn: number; total_pawn_flow: number; expenses: number;
  gold_out: number; diamondBuyIn: number; diamondSellOut: number;
  bar_buy_amount: number; bar_sell_amount: number;
  avg_bar_buy_price_per_baht: number; avg_bar_sell_price_per_baht: number;
  avg_bar_buy_price_per_gram: number; avg_bar_sell_price_per_gram: number;
  bar_profit: number;
}

interface GraphData {
  [key: string]: string | number;
  label: string; date: string;
  redeem: number; interest: number; pawn: number;
  buyIn: number; exchange: number; sellOut: number;
  expenses: number; diamondBuyIn: number; diamondSellOut: number;
  platedGold: number; total_gold_flow: number;
  bar_buy: number; bar_sell: number; total_pawn_flow: number;
}

const API = `${API_BASE}/dashboard`;
const MONTHS = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
                'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];

const fmt  = (n: number) => n.toLocaleString('th-TH', { maximumFractionDigits: 0 });
const fmtD = (n: number) => n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ── Sub-components ─────────────────────────────────────────────
function CardSkeleton() {
  return (
    <Card sx={{ borderRadius: 3, border: `1px solid ${G.border}`, boxShadow: 'none' }}>
      <CardContent sx={{ p: 2.5 }}>
        <Skeleton width="45%" height={18} sx={{ mb: 1 }} />
        <Skeleton width="65%" height={48} sx={{ mb: 0.5 }} />
        <Skeleton width="38%" height={14} />
      </CardContent>
    </Card>
  );
}

// ── Main component ─────────────────────────────────────────────
export default function Dashboard() {
  const [period, setPeriod]               = useState<Period>("month");
  const [selectedDate, setSelectedDate]   = useState<Dayjs>(dayjs());
  const [selectedMonth, setSelectedMonth] = useState<number>(dayjs().month() + 1);
  const [selectedYear, setSelectedYear]   = useState<number>(dayjs().year());
  const [isLoading, setIsLoading]         = useState(true);
  const [summary, setSummary]             = useState<SummaryData | null>(null);
  const [graphData, setGraphData]         = useState<GraphData[]>([]);
  const [barGoldStock, setBarGoldStock]   = useState<{ remaining_baht: number; remaining_grams: number } | null>(null);
  const [chartView, setChartView]         = useState<ChartView>("area");

  // Period display label
  const periodLabel = useMemo(() => {
    if (period === "day") {
      return `${selectedDate.format('D MMMM')} ${selectedDate.year() + 543}`;
    }
    if (period === "week") {
      const sat = selectedDate.subtract(selectedDate.day(), 'day');
      return `${sat.format('D MMM')} – ${selectedDate.format('D MMM')} ${selectedDate.year() + 543}`;
    }
    return `${MONTHS[selectedMonth - 1]} ${selectedYear + 543}`;
  }, [period, selectedDate, selectedMonth, selectedYear]);

  // Navigate date backward/forward
  const navigate = (dir: -1 | 1) => {
    if (period === "day")  { setSelectedDate(d => d.add(dir, 'day')); return; }
    if (period === "week") { setSelectedDate(d => d.add(dir * 7, 'day')); return; }
    let m = selectedMonth + dir, y = selectedYear;
    if (m > 12) { m = 1;  y += 1; }
    if (m < 1)  { m = 12; y -= 1; }
    setSelectedMonth(m);
    setSelectedYear(y);
  };

  // Fetch data
  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const sp = new URLSearchParams({ period });
        const gp = new URLSearchParams({ period });

        if (period === "day") {
          const d = selectedDate.format('YYYY-MM-DD');
          sp.append('date_str', d);
          gp.append('date_str', d);
        } else if (period === "week") {
          const sat = selectedDate.subtract(selectedDate.day(), 'day');
          const end = selectedDate.format('YYYY-MM-DD');
          sp.append('start_date', sat.format('YYYY-MM-DD'));
          sp.append('end_date', end);
          gp.append('start_date', sat.subtract(4, 'week').format('YYYY-MM-DD'));
          gp.append('end_date', end);
        } else {
          const cy = selectedYear > 2500 ? selectedYear - 543 : selectedYear;
          const mStart = dayjs().year(cy).month(selectedMonth - 1).startOf('month').format('YYYY-MM-DD');
          const mEnd   = dayjs().year(cy).month(selectedMonth - 1).endOf('month').format('YYYY-MM-DD');
          sp.append('start_date', mStart);
          sp.append('end_date', mEnd);
          let gm = selectedMonth - 6, gy = cy;
          while (gm <= 0) { gm += 12; gy -= 1; }
          gp.append('start_date', dayjs().year(gy).month(gm - 1).startOf('month').format('YYYY-MM-DD'));
          gp.append('end_date', mEnd);
          gp.append('group_by', 'month');
        }

        const [sr, gr, br] = await Promise.all([
          fetch(`${API}/summary?${sp}`),
          fetch(`${API}/all-transactions-graph?${gp}`),
          fetch(`${API}/bar-gold-stock`),
        ]);
        if (!sr.ok || !gr.ok || !br.ok) throw new Error();
        setSummary(await sr.json());
        setGraphData(await gr.json());
        setBarGoldStock(await br.json());
      } catch {
        alert("โหลดข้อมูล Dashboard ไม่สำเร็จ");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [period, selectedDate, selectedMonth, selectedYear]);

  // Derived calculations
  const calc = useMemo(() => {
    if (!summary) return null;
    const rev    = (summary.redeem||0)+(summary.interest||0)+(summary.sellOut||0)+(summary.bar_sell||0)+(summary.diamondSellOut||0);
    const cost   = (summary.pawn||0)+(summary.buyIn||0)+(summary.bar_buy||0)+(summary.expenses||0)+(summary.diamondBuyIn||0);
    const profit = rev - cost;
    const margin = rev > 0 ? (profit / rev) * 100 : 0;
    const pawnProfit = (summary.redeem||0)-(summary.pawn||0)+(summary.interest||0);
    return { rev, cost, profit, margin, pawnProfit };
  }, [summary]);

  // Processed chart data
  const chartData = useMemo(() => graphData.map(d => ({
    ...d,
    total_revenue: (d.redeem||0)+(d.interest||0)+(d.sellOut||0)+(d.bar_sell||0)+(d.diamondSellOut||0),
    total_cost:    (d.pawn||0)+(d.buyIn||0)+(d.bar_buy||0)+(d.expenses||0)+(d.diamondBuyIn||0),
    net_profit:    ((d.redeem||0)+(d.interest||0)+(d.sellOut||0)+(d.bar_sell||0)+(d.diamondSellOut||0))
                 - ((d.pawn||0)+(d.buyIn||0)+(d.bar_buy||0)+(d.expenses||0)+(d.diamondBuyIn||0)),
    bar_buy_baht:  (d.bar_buy||0) / GOLD_BAHT_TO_GRAM_BAR,
    bar_sell_baht: (d.bar_sell||0) / GOLD_BAHT_TO_GRAM_BAR,
  })), [graphData]);

  const formatTick = (v: string) => period === 'month' ? dayjs(v).format('MMM YY') : dayjs(v).format('D MMM');
  const hour = dayjs().hour();
  const greeting = hour < 12 ? 'สวัสดีตอนเช้า' : hour < 17 ? 'สวัสดีตอนบ่าย' : 'สวัสดีตอนเย็น';
  const profitColor = calc && calc.profit >= 0 ? G.success : G.danger;
  const stockBaht = barGoldStock ? barGoldStock.remaining_grams / GOLD_BAHT_TO_GRAM_BAR : 0;

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ bgcolor: G.cream, minHeight: '100vh', p: { xs: 2, sm: 3, md: 4 } }}>

        {/* ── Header ── */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4, flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: G.text, letterSpacing: '-0.3px' }}>
              ภาพรวมธุรกิจ
            </Typography>
            <Typography variant="body2" sx={{ color: G.textMuted, mt: 0.25 }}>
              ช่วงข้อมูลสรุป · {periodLabel} · กราฟ {period === 'week' ? '5 สัปดาห์' : period === 'month' ? '6 เดือน' : '1 วัน'}ย้อนหลัง
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            {/* Period toggle */}
            <ToggleButtonGroup value={period} exclusive onChange={(_, v) => v && setPeriod(v)} size="small"
              sx={{
                bgcolor: G.surface, border: `1px solid ${G.border}`, borderRadius: 2,
                '& .MuiToggleButton-root': {
                  border: 'none', borderRadius: '8px !important',
                  px: 2.5, py: 0.875, color: G.textSub, fontWeight: 500, fontSize: '0.8rem',
                  '&.Mui-selected': { bgcolor: G.brass, color: '#fff', '&:hover': { bgcolor: '#B8960C' } }
                }
              }}>
              <ToggleButton value="day">วัน</ToggleButton>
              <ToggleButton value="week">สัปดาห์</ToggleButton>
              <ToggleButton value="month">เดือน</ToggleButton>
            </ToggleButtonGroup>

            {/* Date navigator */}
            <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: G.surface, border: `1px solid ${G.border}`, borderRadius: 2, px: 0.5 }}>
              <IconButton size="small" onClick={() => navigate(-1)} sx={{ color: G.textSub }}>
                <ChevronLeftIcon fontSize="small" />
              </IconButton>
              <Typography variant="body2" sx={{ color: G.text, fontWeight: 600, px: 1, minWidth: 148, textAlign: 'center' }}>
                {periodLabel}
              </Typography>
              <IconButton size="small" onClick={() => navigate(1)} sx={{ color: G.textSub }}>
                <ChevronRightIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        </Box>

        {/* ── Hero card ── */}
        {isLoading ? (
          <Skeleton variant="rectangular" height={158} sx={{ borderRadius: 3, mb: 3 }} />
        ) : (
          <Card sx={{
            borderRadius: 3, mb: 3, overflow: 'hidden',
            background: 'linear-gradient(135deg, #1C1A14 0%, #2D2A1F 60%, #3A3120 100%)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.20)',
            border: `1px solid rgba(201,168,76,0.18)`
          }}>
            <CardContent sx={{ p: { xs: 3, md: 4 } }}>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.45)', mb: 1.25 }}>
                {greeting} · วัน{dayjs().format('dddd')}ที่ {dayjs().format('D')} {dayjs().format('MMMM')} {dayjs().year() + 543}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5, flexWrap: 'wrap', mb: 0.75 }}>
                <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.65)' }}>
                  กำไรขั้นต้น{period === 'month' ? 'เดือนนี้' : period === 'week' ? 'สัปดาห์นี้' : 'วันนี้'}
                </Typography>
                <Typography sx={{ color: G.brass, fontWeight: 800, fontSize: '2rem', letterSpacing: '-1px', fontStyle: 'italic' }}>
                  ฿ {fmt(calc?.profit || 0)}
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', mb: 2.5 }}>
                มาร์จิน {calc?.margin.toFixed(1) || '0.0'}%
              </Typography>
              <Stack direction="row" spacing={4}>
                {[
                  { label: 'ต้นทุน', val: `฿${fmt(calc?.cost || 0)}` },
                  { label: 'รายได้', val: `฿${fmt(calc?.rev || 0)}` },
                ].map(x => (
                  <Box key={x.label}>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.38)' }}>{x.label}</Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.82)', fontWeight: 600 }}>{x.val}</Typography>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        )}

        {/* ── Live gold price strip ── */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.25 }}>
            <FiberManualRecordIcon sx={{
              fontSize: 9, color: G.success,
              '@keyframes pulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.35 } },
              animation: 'pulse 2s infinite'
            }} />
            <Typography variant="body2" sx={{ fontWeight: 600, color: G.textSub }}>LIVE · ราคาทอง</Typography>
            <Typography variant="caption" sx={{ color: G.textMuted, ml: 'auto' }}>
              อัปเดต {dayjs().format('HH:mm:ss น.')}
            </Typography>
          </Box>
          <Grid container spacing={1.5}>
            {isLoading ? Array(4).fill(0).map((_, i) => (
              <Grid item xs={6} md={3} key={i}><CardSkeleton /></Grid>
            )) : [
              { label: 'แท่ง · รับซื้อ',      value: summary?.avg_bar_buy_price_per_baht  || 0, up: true  },
              { label: 'แท่ง · ขายออก',       value: summary?.avg_bar_sell_price_per_baht || 0, up: true  },
              { label: 'รูปพรรณ · รับซื้อ',   value: (summary?.avg_bar_buy_price_per_gram  || 0) * GOLD_BAHT_TO_GRAM_ORNAMENT, up: false },
              { label: 'รูปพรรณ · ขายออก',    value: (summary?.avg_bar_sell_price_per_gram || 0) * GOLD_BAHT_TO_GRAM_ORNAMENT, up: false },
            ].map(p => (
              <Grid item xs={6} md={3} key={p.label}>
                <Card sx={{ borderRadius: 2.5, border: `1px solid ${G.border}`, boxShadow: 'none', bgcolor: G.surface }}>
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Typography variant="caption" sx={{ color: G.textMuted }}>{p.label}</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: G.text, my: 0.25 }}>
                      ฿{fmt(p.value)}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {p.up
                        ? <TrendingUpIcon   sx={{ fontSize: 13, color: G.success }} />
                        : <TrendingDownIcon sx={{ fontSize: 13, color: G.danger  }} />
                      }
                      <Typography variant="caption" sx={{ color: p.up ? G.success : G.danger }}>ราคาเฉลี่ย</Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* ── KPI cards ── */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {isLoading ? Array(3).fill(0).map((_, i) => (
            <Grid item xs={12} md={4} key={i}><CardSkeleton /></Grid>
          )) : <>
            {/* กำไรสุทธิ */}
            <Grid item xs={12} md={4}>
              <Card sx={{ borderRadius: 3, border: `1px solid ${G.border}`, boxShadow: 'none', height: '100%' }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                    <Typography variant="body2" sx={{ color: G.textSub, fontWeight: 500 }}>ยอดกำไรสุทธิ</Typography>
                    <Chip label={`มาร์จิน ${calc?.margin.toFixed(1) || '0.0'}%`} size="small"
                      sx={{ bgcolor: calc && calc.profit >= 0 ? G.successBg : G.dangerBg, color: profitColor, fontWeight: 600, fontSize: '0.7rem', height: 22 }} />
                  </Box>
                  <Typography sx={{ fontWeight: 700, fontSize: '1.75rem', color: profitColor, letterSpacing: '-0.5px', mb: 0.5 }}>
                    ฿ {fmt(calc?.profit || 0)}
                  </Typography>
                  <Typography variant="caption" sx={{ color: G.textMuted }}>
                    รายได้รวม ฿{fmt(calc?.rev || 0)} · ต้นทุน ฿{fmt(calc?.cost || 0)}
                  </Typography>
                  <LinearProgress variant="determinate" value={Math.min(100, Math.max(0, calc?.margin || 0))}
                    sx={{ mt: 2, height: 4, borderRadius: 2, bgcolor: alpha(profitColor, 0.15),
                      '& .MuiLinearProgress-bar': { bgcolor: profitColor, borderRadius: 2 } }} />
                </CardContent>
              </Card>
            </Grid>

            {/* สต็อกทองแท่ง */}
            <Grid item xs={12} md={4}>
              <Card sx={{ borderRadius: 3, border: `1px solid ${G.border}`, boxShadow: 'none', height: '100%' }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                    <Typography variant="body2" sx={{ color: G.textSub, fontWeight: 500 }}>ทองในสต็อก (ทองแท่ง)</Typography>
                    <Chip label={stockBaht > 0 ? "มีสต็อก" : "ไม่มีสต็อก"} size="small"
                      sx={{ bgcolor: stockBaht > 0 ? G.successBg : G.dangerBg, color: stockBaht > 0 ? G.success : G.danger, fontWeight: 600, fontSize: '0.7rem', height: 22 }} />
                  </Box>
                  <Typography sx={{ fontWeight: 700, fontSize: '1.75rem', color: G.brass, letterSpacing: '-0.5px', mb: 0.5 }}>
                    {fmtD(stockBaht)} บาท
                  </Typography>
                  <Typography variant="caption" sx={{ color: G.textMuted }}>
                    ≈ {fmtD(barGoldStock?.remaining_grams || 0)} กรัม · มูลค่า ฿{fmt(stockBaht * (summary?.avg_bar_sell_price_per_baht || 0))}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, mt: 1.5 }}>
                    <Typography variant="caption" sx={{ color: G.success }}>
                      เข้า +{fmtD((summary?.bar_buy||0)/GOLD_BAHT_TO_GRAM_BAR)} บาท
                    </Typography>
                    <Typography variant="caption" sx={{ color: G.danger }}>
                      ออก -{fmtD((summary?.bar_sell||0)/GOLD_BAHT_TO_GRAM_BAR)} บาท
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* กำไรจำนำ */}
            <Grid item xs={12} md={4}>
              <Card sx={{ borderRadius: 3, border: `1px solid ${G.border}`, boxShadow: 'none', height: '100%' }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                    <Typography variant="body2" sx={{ color: G.textSub, fontWeight: 500 }}>กำไรจำนำ</Typography>
                    <Chip label={calc && calc.pawnProfit >= 0 ? "กำไร" : "ขาดทุน"} size="small"
                      sx={{ bgcolor: calc && calc.pawnProfit >= 0 ? G.successBg : G.dangerBg,
                            color: calc && calc.pawnProfit >= 0 ? G.success : G.danger, fontWeight: 600, fontSize: '0.7rem', height: 22 }} />
                  </Box>
                  <Typography sx={{ fontWeight: 700, fontSize: '1.75rem', letterSpacing: '-0.5px', mb: 0.5,
                    color: calc && calc.pawnProfit >= 0 ? G.success : G.danger }}>
                    ฿ {fmt(calc?.pawnProfit || 0)}
                  </Typography>
                  <Typography variant="caption" sx={{ color: G.textMuted }}>
                    ดอก ฿{fmt(summary?.interest||0)} · ไถ่ ฿{fmt(summary?.redeem||0)} · จำนำ ฿{fmt(summary?.pawn||0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </>}
        </Grid>

        {/* ── Chart ── */}
        <Card sx={{ borderRadius: 3, border: `1px solid ${G.border}`, boxShadow: 'none', mb: 3 }}>
          <CardContent sx={{ p: { xs: 2, md: 3 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2.5, flexWrap: 'wrap', gap: 1 }}>
              <Box>
                <Typography variant="body1" sx={{ fontWeight: 600, color: G.text }}>
                  แนวโน้มธุรกรรมทอง · Gold flow
                </Typography>
                <Typography variant="caption" sx={{ color: G.textMuted }}>
                  ทองรูปพรรณ (กรัม) + ทองแท่ง (บาทน้ำหนัก) — สลับชนิดและ series ได้
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 0.75 }}>
                {([
                  ['area', <MultilineChartIcon fontSize="small" />],
                  ['line', <ShowChartIcon      fontSize="small" />],
                  ['bar',  <BarChartIcon       fontSize="small" />],
                ] as [ChartView, React.ReactNode][]).map(([v, icon]) => (
                  <IconButton key={v} size="small" onClick={() => setChartView(v)}
                    sx={{ borderRadius: 1.5, border: `1px solid ${G.border}`, width: 34, height: 34,
                      bgcolor: chartView === v ? G.brass : 'transparent',
                      color:   chartView === v ? '#fff'  : G.textSub,
                      '&:hover': { bgcolor: chartView === v ? '#B8960C' : G.brassLight }
                    }}>
                    {icon}
                  </IconButton>
                ))}
              </Box>
            </Box>

            {isLoading ? (
              <Skeleton variant="rectangular" height={320} sx={{ borderRadius: 2 }} />
            ) : chartData.length === 0 ? (
              <Box sx={{ height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="body2" sx={{ color: G.textMuted }}>ไม่มีข้อมูลในช่วงเวลานี้</Typography>
              </Box>
            ) : chartView === 'bar' ? (
              <BarChart
                dataset={chartData}
                height={320}
                xAxis={[{ scaleType: 'band', dataKey: 'date', valueFormatter: formatTick }]}
                series={[
                  { dataKey: 'total_revenue', label: 'รายได้',   color: G.success, valueFormatter: (v) => `฿${fmt(v as number || 0)}` },
                  { dataKey: 'total_cost',    label: 'ต้นทุน',   color: G.danger,  valueFormatter: (v) => `฿${fmt(v as number || 0)}` },
                  { dataKey: 'net_profit',    label: 'กำไรสุทธิ', color: G.brass,  valueFormatter: (v) => `฿${fmt(v as number || 0)}` },
                ]}
                sx={{ '& .MuiChartsAxis-tickLabel': { fontSize: '0.72rem', fill: G.textMuted } }}
              />
            ) : (
              <LineChart
                dataset={chartData}
                height={320}
                xAxis={[{ scaleType: 'band', dataKey: 'date', valueFormatter: formatTick }]}
                series={[
                  { dataKey: 'buyIn',         label: 'ทองซื้อเข้า',      color: G.success, area: chartView==='area', showMark: false, curve: 'monotoneX', valueFormatter: (v) => `${fmt(v||0)} กรัม` },
                  { dataKey: 'sellOut',       label: 'ทองขายออก',        color: G.danger,  area: chartView==='area', showMark: false, curve: 'monotoneX', valueFormatter: (v) => `${fmt(v||0)} กรัม` },
                  { dataKey: 'bar_buy_baht',  label: 'แท่งซื้อเข้า (บาท)', color: '#3B82F6', area: false, showMark: false, curve: 'monotoneX', valueFormatter: (v) => `${fmtD(v||0)} บาท` },
                  { dataKey: 'bar_sell_baht', label: 'แท่งขายออก (บาท)', color: G.brass,   area: false, showMark: false, curve: 'monotoneX', valueFormatter: (v) => `${fmtD(v||0)} บาท` },
                ]}
                sx={{ '& .MuiChartsAxis-tickLabel': { fontSize: '0.72rem', fill: G.textMuted } }}
              />
            )}
          </CardContent>
        </Card>

        {/* ── Detail rows ── */}
        <Grid container spacing={2}>
          {/* ทองรูปพรรณ */}
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 3, border: `1px solid ${G.border}`, boxShadow: 'none', height: '100%' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: G.text, mb: 2 }}>ทองรูปพรรณ</Typography>
                {isLoading ? <Skeleton height={100} /> : (
                  <Stack divider={<Divider sx={{ borderColor: G.border }} />} spacing={1.25}>
                    {[
                      { label: 'ซื้อเข้า',   gram: summary?.buyIn    || 0, rate: GOLD_BAHT_TO_GRAM_ORNAMENT, color: G.success },
                      { label: 'ขายออก',     gram: summary?.sellOut  || 0, rate: GOLD_BAHT_TO_GRAM_ORNAMENT, color: G.danger  },
                      { label: 'เปลี่ยนทอง', gram: summary?.exchange || 0, rate: GOLD_BAHT_TO_GRAM_ORNAMENT, color: G.brass   },
                      { label: 'ทองชุบ',     gram: summary?.plated_gold || 0, rate: GOLD_BAHT_TO_GRAM_ORNAMENT, color: G.textSub },
                    ].map(r => (
                      <Box key={r.label} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.25 }}>
                        <Typography variant="body2" sx={{ color: G.textSub }}>{r.label}</Typography>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: r.color }}>{fmtD(r.gram)} กรัม</Typography>
                          <Typography variant="caption" sx={{ color: G.textMuted }}>{fmtD(r.gram / r.rate)} บาทน้ำหนัก</Typography>
                        </Box>
                      </Box>
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* ทองแท่ง + จำนำ */}
          <Grid item xs={12} md={6}>
            <Stack spacing={2} sx={{ height: '100%' }}>
              {/* ทองแท่ง */}
              <Card sx={{ borderRadius: 3, border: `1px solid ${G.border}`, boxShadow: 'none' }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: G.text, mb: 2 }}>ทองแท่ง</Typography>
                  {isLoading ? <Skeleton height={80} /> : (
                    <Stack divider={<Divider sx={{ borderColor: G.border }} />} spacing={1.25}>
                      {[
                        { label: 'ซื้อเข้า', baht: (summary?.bar_buy||0)/GOLD_BAHT_TO_GRAM_BAR, gram: summary?.bar_buy||0,  money: summary?.bar_buy_amount||0,  color: G.success },
                        { label: 'ขายออก',   baht: (summary?.bar_sell||0)/GOLD_BAHT_TO_GRAM_BAR, gram: summary?.bar_sell||0, money: summary?.bar_sell_amount||0, color: G.danger  },
                      ].map(r => (
                        <Box key={r.label} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.25 }}>
                          <Typography variant="body2" sx={{ color: G.textSub }}>{r.label}</Typography>
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: r.color }}>{fmtD(r.baht)} บาทน้ำหนัก</Typography>
                            <Typography variant="caption" sx={{ color: G.textMuted }}>{fmtD(r.gram)} กรัม · ฿{fmt(r.money)}</Typography>
                          </Box>
                        </Box>
                      ))}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.25 }}>
                        <Typography variant="body2" sx={{ color: G.textSub }}>กำไร</Typography>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: (summary?.bar_profit||0) >= 0 ? G.success : G.danger }}>
                            ฿{fmt(summary?.bar_profit||0)}
                          </Typography>
                          <Typography variant="caption" sx={{ color: G.textMuted }}>
                            {summary?.bar_buy_amount && summary.bar_buy_amount > 0 ? `${(((summary?.bar_profit||0)/summary.bar_buy_amount)*100).toFixed(1)}%` : '-'}
                          </Typography>
                        </Box>
                      </Box>
                    </Stack>
                  )}
                </CardContent>
              </Card>

              {/* จำนำ */}
              <Card sx={{ borderRadius: 3, border: `1px solid ${G.border}`, boxShadow: 'none', flex: 1 }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: G.text, mb: 2 }}>จำนำ</Typography>
                  {isLoading ? <Skeleton height={80} /> : (
                    <Grid container spacing={1}>
                      {[
                        { label: 'รับจำนำ',       value: summary?.pawn     || 0, color: G.danger  },
                        { label: 'ไถ่ถอน',         value: summary?.redeem   || 0, color: G.success },
                        { label: 'ดอกเบี้ย',       value: summary?.interest || 0, color: G.brass   },
                        { label: 'ค่าใช้จ่าย',     value: summary?.expenses || 0, color: G.textSub },
                        { label: 'กำไรจำนำสุทธิ', value: calc?.pawnProfit  || 0, color: calc && calc.pawnProfit >= 0 ? G.success : G.danger },
                      ].map(p => (
                        <Grid item xs={6} key={p.label}>
                          <Box sx={{ p: 1.25, borderRadius: 2, bgcolor: G.cream }}>
                            <Typography variant="caption" sx={{ color: G.textMuted, display: 'block' }}>{p.label}</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: p.color }}>฿{fmt(p.value)}</Typography>
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                  )}
                </CardContent>
              </Card>
            </Stack>
          </Grid>
        </Grid>

      </Box>
    </LocalizationProvider>
  );
}
