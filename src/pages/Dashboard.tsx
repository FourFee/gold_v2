import React, { useEffect, useState, useMemo } from "react";
import {
  Box, Grid, Typography, Card, CardContent,
  Skeleton,
  IconButton, alpha,
  Snackbar, Alert, Popover
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import dayjs, { Dayjs } from 'dayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import 'dayjs/locale/th';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import weekOfYear from 'dayjs/plugin/weekOfYear';

import ChevronLeftIcon   from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon  from '@mui/icons-material/ChevronRight';

import ArrowForwardIcon  from '@mui/icons-material/ArrowForward';
import { useNavigate }   from 'react-router-dom';

import { API_BASE, GOLD_BAHT_TO_GRAM_BAR } from "../config";

import { useNotify } from "../hooks/useNotify";
import { makeG } from "../utils/dashboardTokens";
import { fmt, fmtD } from "../utils/numberFormat";
import { SummaryData, CalcResult, ChartEntry } from "../types";
import TransactionChart from "../components/dashboard/TransactionChart";
import DetailCards from "../components/dashboard/DetailCards";

dayjs.extend(localizedFormat);
dayjs.extend(customParseFormat);
dayjs.extend(weekOfYear);
dayjs.locale('th');

type Period    = "day" | "week" | "month" | "all";
type ChartView = "area" | "line" | "bar";

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

const MONO = '"JetBrains Mono", ui-monospace, monospace';

function CardSkeleton() {
  const theme = useTheme();
  const G = makeG(theme);
  return (
    <Card sx={{ borderRadius: 3, border: `1px solid ${G.border}`, boxShadow: 'none', bgcolor: G.paper }}>
      <CardContent sx={{ p: 2.5 }}>
        <Skeleton width="45%" height={14} sx={{ mb: 1.5 }} />
        <Skeleton width="70%" height={44} sx={{ mb: 0.75 }} />
        <Skeleton width="55%" height={12} />
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const theme = useTheme();
  const G = makeG(theme);
  const { notify, snackbar, handleClose } = useNotify();
  const [period, setPeriod]               = useState<Period>("month");
  const [selectedDate, setSelectedDate]   = useState<Dayjs>(dayjs());
  const [selectedMonth, setSelectedMonth] = useState<number>(dayjs().month() + 1);
  const [selectedYear, setSelectedYear]   = useState<number>(dayjs().year());
  const [isLoading, setIsLoading]         = useState(true);
  const [pickerAnchor, setPickerAnchor]   = useState<HTMLElement | null>(null);
  const [summary, setSummary]             = useState<SummaryData | null>(null);
  const [graphData, setGraphData]         = useState<GraphData[]>([]);
  const [barGoldStock, setBarGoldStock]   = useState<{ remaining_baht: number; remaining_grams: number } | null>(null);
  const [chartView, setChartView]         = useState<ChartView>("area");

  const periodLabel = useMemo(() => {
    if (period === "all")  return "ทั้งหมด";
    if (period === "day") return `${selectedDate.format('D MMMM')} ${selectedDate.year() + 543}`;
    if (period === "week") {
      const weekStart = selectedDate.startOf('week');
      const weekEnd   = weekStart.add(6, 'day');
      return `${weekStart.format('D MMM')} – ${weekEnd.format('D MMM')} ${weekEnd.year() + 543}`;
    }
    return `${MONTHS[selectedMonth - 1]} ${selectedYear + 543}`;
  }, [period, selectedDate, selectedMonth, selectedYear]);

  const navDate = (dir: -1 | 1) => {
    if (period === "day")  { setSelectedDate(d => d.add(dir, 'day')); return; }
    if (period === "week") { setSelectedDate(d => d.add(dir * 7, 'day')); return; }
    let m = selectedMonth + dir, y = selectedYear;
    if (m > 12) { m = 1;  y += 1; }
    if (m < 1)  { m = 12; y -= 1; }
    setSelectedMonth(m); setSelectedYear(y);
  };

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const sp = new URLSearchParams({ period });
        const gp = new URLSearchParams({ period });
        if (period === "all") {
          gp.append('group_by', 'month');
        } else if (period === "day") {
          const d = selectedDate.format('YYYY-MM-DD');
          sp.append('date_str', d); gp.append('date_str', d);
        } else if (period === "week") {
          const weekStart = selectedDate.startOf('week');
          const weekEnd   = weekStart.add(6, 'day');
          sp.append('start_date', weekStart.format('YYYY-MM-DD')); sp.append('end_date', weekEnd.format('YYYY-MM-DD'));
          gp.append('start_date', weekStart.subtract(4, 'week').format('YYYY-MM-DD')); gp.append('end_date', weekEnd.format('YYYY-MM-DD'));
        } else {
          const cy = selectedYear > 2500 ? selectedYear - 543 : selectedYear;
          const mStart = dayjs().year(cy).month(selectedMonth - 1).startOf('month').format('YYYY-MM-DD');
          const mEnd   = dayjs().year(cy).month(selectedMonth - 1).endOf('month').format('YYYY-MM-DD');
          sp.append('start_date', mStart); sp.append('end_date', mEnd);
          let gm = selectedMonth - 6, gy = cy;
          while (gm <= 0) { gm += 12; gy -= 1; }
          gp.append('start_date', dayjs().year(gy).month(gm - 1).startOf('month').format('YYYY-MM-DD'));
          gp.append('end_date', mEnd); gp.append('group_by', 'month');
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
        notify("โหลดข้อมูล Dashboard ไม่สำเร็จ", "error");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [period, selectedDate, selectedMonth, selectedYear]);

  const calc = useMemo<CalcResult | null>(() => {
    if (!summary) return null;
    const rev    = (summary.redeem||0)+(summary.interest||0)+(summary.sellOut||0)+(summary.bar_sell||0)+(summary.diamondSellOut||0);
    const cost   = (summary.pawn||0)+(summary.buyIn||0)+(summary.bar_buy||0)+(summary.expenses||0)+(summary.diamondBuyIn||0);
    const profit = rev - cost;
    const margin = rev > 0 ? (profit / rev) * 100 : 0;
    const pawnProfit = (summary.redeem||0)-(summary.pawn||0)+(summary.interest||0);
    return { rev, cost, profit, margin, pawnProfit };
  }, [summary]);

  const chartData = useMemo<ChartEntry[]>(() => graphData.map(d => ({
    ...d,
    total_revenue: (d.redeem||0)+(d.interest||0)+(d.sellOut||0)+(d.bar_sell||0)+(d.diamondSellOut||0),
    total_cost:    (d.pawn||0)+(d.buyIn||0)+(d.bar_buy||0)+(d.expenses||0)+(d.diamondBuyIn||0),
    net_profit:    ((d.redeem||0)+(d.interest||0)+(d.sellOut||0)+(d.bar_sell||0)+(d.diamondSellOut||0))
                 - ((d.pawn||0)+(d.buyIn||0)+(d.bar_buy||0)+(d.expenses||0)+(d.diamondBuyIn||0)),
    bar_buy_baht:  (d.bar_buy||0) / GOLD_BAHT_TO_GRAM_BAR,
    bar_sell_baht: (d.bar_sell||0) / GOLD_BAHT_TO_GRAM_BAR,
  })), [graphData]);

  const navigate = useNavigate();
  const profitPos  = (calc?.profit  || 0) >= 0;

  const stockBaht  = barGoldStock ? barGoldStock.remaining_grams / GOLD_BAHT_TO_GRAM_BAR : 0;

  const cardSx = { borderRadius: 3, border: `1px solid ${G.border}`, boxShadow: '0 1px 0 rgba(27,23,19,.04),0 8px 24px -14px rgba(27,23,19,.14)', bgcolor: G.paper };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ bgcolor: G.bg, minHeight: '100vh', p: { xs: 2, sm: 3, md: 4 }, maxWidth: 1560, mx: 'auto' }}>

        {/* ── Section header ── */}
        <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 3 }}>
          <Box>
            <Typography sx={{ fontSize: 18, fontWeight: 600, color: G.text, letterSpacing: '-.01em', display: 'flex', alignItems: 'center', gap: 1,
              '&::before': { content: '""', width: 4, height: 20, bgcolor: G.accent, borderRadius: 1, display: 'inline-block' } }}>
              ภาพรวมธุรกิจ
            </Typography>
            <Typography sx={{ color: G.textMuted, fontSize: 12.5, mt: 0.5 }}>
              ช่วงข้อมูลสรุป · <strong style={{ color: G.textSub }}>{periodLabel}</strong>{period !== 'all' && ` · กราฟ${period === 'week' ? '5 สัปดาห์' : period === 'month' ? '6 เดือน' : '1 วัน'}ย้อนหลัง`}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
            <Box sx={{ display: 'inline-flex', p: '3px', bgcolor: G.surface, border: `1px solid ${G.border}`, borderRadius: '10px' }}>
              {([['day','วัน'],['week','สัปดาห์'],['month','เดือน'],['all','ทั้งหมด']] as [Period,string][]).map(([p, label]) => (
                <Box key={p} component="button" onClick={() => setPeriod(p)}
                  sx={{ border: period === p ? `1px solid ${G.border}` : '1px solid transparent',
                    borderRadius: '8px', px: 1.5, py: 0.75, cursor: 'pointer',
                    bgcolor: period === p ? G.paper : 'transparent',
                    color: period === p ? G.text : G.textMuted,
                    fontWeight: 500, fontSize: 13, fontFamily: 'inherit',
                    transition: 'all .15s' }}>
                  {label}
                </Box>
              ))}
            </Box>
            {period !== 'all' && (
              <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: G.paper, border: `1px solid ${G.border}`, borderRadius: '10px', p: '4px' }}>
                <IconButton size="small" onClick={() => navDate(-1)} sx={{ color: G.textSub, width: 28, height: 28, borderRadius: '7px', '&:hover': { bgcolor: G.bg } }}>
                  <ChevronLeftIcon fontSize="small" />
                </IconButton>
                <Box component="button" onClick={(e: React.MouseEvent<HTMLElement>) => setPickerAnchor(e.currentTarget)}
                  sx={{ color: G.text, fontWeight: 600, px: 1, minWidth: { xs: 100, sm: 152 }, textAlign: 'center', fontSize: { xs: 12, sm: 13 },
                    border: 'none', bgcolor: 'transparent', cursor: 'pointer', fontFamily: 'inherit',
                    borderRadius: '6px', py: '2px', '&:hover': { bgcolor: G.bg } }}>
                  {periodLabel}
                </Box>
                <Popover open={Boolean(pickerAnchor)} anchorEl={pickerAnchor}
                  onClose={() => setPickerAnchor(null)}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'center' }}
                  slotProps={{ paper: { sx: { mt: 0.5, borderRadius: 3, border: `1px solid ${G.border}`, boxShadow: '0 8px 32px rgba(0,0,0,.12)' } } }}>
                  <DateCalendar
                    views={period === 'month' ? ['year', 'month'] : ['year', 'month', 'day']}
                    openTo={period === 'month' ? 'month' : 'day'}
                    value={period === 'month'
                      ? dayjs().year(selectedYear > 2500 ? selectedYear - 543 : selectedYear).month(selectedMonth - 1)
                      : selectedDate}
                    onChange={(v) => {
                      if (!v) return;
                      if (period === 'month') { setSelectedMonth(v.month() + 1); setSelectedYear(v.year()); setPickerAnchor(null); }
                      else { setSelectedDate(v); setPickerAnchor(null); }
                    }}
                    sx={{ '& .MuiPickersDay-root.Mui-selected': { bgcolor: G.accent }, '& .MuiPickersDay-root:hover': { bgcolor: alpha(G.accent, 0.12) } }}
                  />
                </Popover>
                <IconButton size="small" onClick={() => navDate(1)} sx={{ color: G.textSub, width: 28, height: 28, borderRadius: '7px', '&:hover': { bgcolor: G.bg } }}>
                  <ChevronRightIcon fontSize="small" />
                </IconButton>
              </Box>
            )}
          </Box>
        </Box>

        {/* ── Flat KPI grid: ทองแท่ง (4) + ธุรกรรม (4) ── */}
        {(() => {
          const sellBaht  = (summary?.bar_sell || 0) / GOLD_BAHT_TO_GRAM_BAR;
          const buyBaht   = (summary?.bar_buy  || 0) / GOLD_BAHT_TO_GRAM_BAR;
          const avgSell   = summary?.avg_bar_sell_price_per_baht || 0;
          const avgBuy    = summary?.avg_bar_buy_price_per_baht  || 0;
          const barProfit = (avgSell - avgBuy) * sellBaht;
          const buyExGram = (summary?.buyIn || 0) + (summary?.exchange || 0);
          const sellGram  = summary?.sellOut || 0;

          const sectionLabelSx = {
            fontSize: 11, fontWeight: 700, color: G.textFaint,
            textTransform: 'uppercase' as const, letterSpacing: '.1em',
            fontFamily: MONO, mb: 1.5, mt: 0.5,
            display: 'flex', alignItems: 'center', gap: 1,
            '&::before': { content: '""', width: 3, height: 14, bgcolor: G.accent, borderRadius: 1 },
          };

          const StatCard = ({ label, value, color, sub }: { label: string; value: string; color: string; sub?: string }) => (
            <Card sx={cardSx}>
              <CardContent sx={{ p: { xs: 2.25, sm: 2.5 } }}>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: G.textMuted, textTransform: 'uppercase', letterSpacing: '.1em', mb: 1.25 }}>
                  {label}
                </Typography>
                <Typography sx={{ fontFamily: MONO, fontSize: { xs: 22, sm: 26 }, fontWeight: 600, color, letterSpacing: '-.015em', lineHeight: 1.1 }}>
                  {value}
                </Typography>
                {sub && (
                  <Typography sx={{ color: G.textMuted, fontSize: 12, mt: 1, lineHeight: 1.4 }}>{sub}</Typography>
                )}
              </CardContent>
            </Card>
          );

          const barCards = [
            { label: 'กำไรทองแท่ง', value: `฿${fmt(barProfit)}`, color: barProfit >= 0 ? G.success : G.danger, sub: `สเปรด ฿${fmt(avgSell - avgBuy)}/บาท` },
            { label: 'สต็อกทองแท่ง', value: `${fmtD(stockBaht)} บาท`, color: G.brass, sub: `≈ ${fmtD(barGoldStock?.remaining_grams || 0)} กรัม` },
            { label: 'ทองแท่งซื้อเข้า', value: `${fmtD(buyBaht)} บาท`, color: G.success, sub: avgBuy > 0 ? `เฉลี่ย ฿${fmt(avgBuy)}/บาท` : '—' },
            { label: 'ทองแท่งขายออก', value: `${fmtD(sellBaht)} บาท`, color: G.danger, sub: avgSell > 0 ? `เฉลี่ย ฿${fmt(avgSell)}/บาท` : '—' },
          ];
          const allCards = [
            { label: 'กำไรสุทธิ', value: `฿${fmt(calc?.profit || 0)}`, color: profitPos ? G.success : G.danger, sub: `มาร์จิน ${(calc?.margin || 0).toFixed(1)}%` },
            { label: 'ดอกเบี้ยจำนำ', value: `฿${fmt(summary?.interest || 0)}`, color: G.success, sub: `ไถ่ ฿${fmt(summary?.redeem || 0)} · จำนำ ฿${fmt(summary?.pawn || 0)}` },
            { label: 'ทองซื้อ+เปลี่ยน', value: `${fmtD(buyExGram)} ก`, color: G.accent, sub: `≈ ${fmtD(buyExGram / GOLD_BAHT_TO_GRAM_BAR)} บาท` },
            { label: 'ทองขายออก', value: `${fmtD(sellGram)} ก`, color: G.danger, sub: `≈ ${fmtD(sellGram / GOLD_BAHT_TO_GRAM_BAR)} บาท` },
          ];

          return (
            <>
              <Typography sx={sectionLabelSx}>ทองแท่ง</Typography>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                {(isLoading ? Array(4).fill(null) : barCards).map((c, i) => (
                  <Grid item xs={6} md={3} key={i}>
                    {isLoading ? <CardSkeleton /> : <StatCard {...c!} />}
                  </Grid>
                ))}
              </Grid>

              <Typography sx={sectionLabelSx}>ธุรกรรมทั้งหมด</Typography>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                {(isLoading ? Array(4).fill(null) : allCards).map((c, i) => (
                  <Grid item xs={6} md={3} key={i}>
                    {isLoading ? <CardSkeleton /> : <StatCard {...c!} />}
                  </Grid>
                ))}
              </Grid>
            </>
          );
        })()}

        {/* ── Transaction chart ── */}
        <TransactionChart
          chartData={chartData}
          chartView={chartView}
          setChartView={setChartView}
          period={period}
          isLoading={isLoading}
        />

        {/* ── Detail groups ── */}
        <DetailCards summary={summary} calc={calc} isLoading={isLoading} />

        {/* ── Quick links ── */}
        <Box sx={{ mt: 1 }}>
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: G.textFaint, textTransform: 'uppercase', letterSpacing: '.1em', mb: 1.5, fontFamily: MONO }}>
            ดูรายการทั้งหมด
          </Typography>
          <Grid container spacing={1.5}>
            {[
              { label: 'รายการจำนำ',          sub: 'Pawn list',         path: '/pawn-list',              color: G.warning },
              { label: 'รายการทองแท่ง',        sub: 'Bar gold list',     path: '/bar-list',               color: G.accent  },
              { label: 'รายการทองรูปพรรณ',    sub: 'Ornament list',     path: '/ornament-list',          color: G.brass   },
              { label: 'ธุรกรรมทองทั้งหมด',   sub: 'All transactions',  path: '/all-transactions-list',  color: G.success },
            ].map(item => (
              <Grid item xs={6} md={3} key={item.path}>
                <Box onClick={() => navigate(item.path)} sx={{
                  p: 2, borderRadius: '12px', cursor: 'pointer',
                  border: `1px solid ${G.border}`, bgcolor: G.paper,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  transition: 'all .15s',
                  '&:hover': { borderColor: item.color, bgcolor: alpha(item.color, 0.04),
                    '& .arrow': { transform: 'translateX(3px)' } },
                }}>
                  <Box>
                    <Box sx={{ width: 6, height: 6, borderRadius: '2px', bgcolor: item.color, mb: 1 }} />
                    <Typography sx={{ fontSize: 13, fontWeight: 600, color: G.text, lineHeight: 1.3 }}>{item.label}</Typography>
                    <Typography sx={{ fontSize: 11, color: G.textMuted, fontFamily: MONO, mt: 0.25 }}>{item.sub}</Typography>
                  </Box>
                  <ArrowForwardIcon className="arrow" sx={{ fontSize: 16, color: G.textMuted, transition: 'transform .15s' }} />
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>

      </Box>
      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert severity={snackbar.severity} onClose={handleClose}>{snackbar.message}</Alert>
      </Snackbar>
    </LocalizationProvider>
  );
}
