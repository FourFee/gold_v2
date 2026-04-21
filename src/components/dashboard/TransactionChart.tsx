import { useTheme } from "@mui/material/styles";
import { Box, Paper, Skeleton, Typography } from "@mui/material";
import { LineChart, BarChart } from "@mui/x-charts";
import ShowChartIcon      from "@mui/icons-material/ShowChart";
import MultilineChartIcon from "@mui/icons-material/MultilineChart";
import BarChartIcon       from "@mui/icons-material/BarChart";
import { makeG } from "../../utils/dashboardTokens";
import { fmt, fmtD } from "../../utils/numberFormat";
import { ChartEntry } from "../../types";

type ChartView = "area" | "line" | "bar";
type Period    = "day" | "week" | "month";

interface Props {
  chartData:    ChartEntry[];
  chartView:    ChartView;
  setChartView: (v: ChartView) => void;
  period:       Period;
  isLoading:    boolean;
}

const MONO = '"JetBrains Mono", ui-monospace, monospace';

export default function TransactionChart({ chartData, chartView, setChartView, period, isLoading }: Props) {
  const theme = useTheme();
  const G = makeG(theme);

  const formatTick = (v: string) =>
    period === "month"
      ? new Date(v).toLocaleDateString("th-TH", { month: "short", year: "2-digit" })
      : new Date(v).toLocaleDateString("th-TH", { day: "numeric", month: "short" });

  const chartTypes: [ChartView, React.ReactNode, string][] = [
    ["area", <MultilineChartIcon fontSize="small" />, "Area"],
    ["line", <ShowChartIcon      fontSize="small" />, "Line"],
    ["bar",  <BarChartIcon       fontSize="small" />, "Bar"],
  ];

  const chartSx = { "& .MuiChartsAxis-tickLabel": { fontSize: "0.72rem", fill: G.textMuted, fontFamily: MONO } };

  return (
    <Paper sx={{
      border: `1px solid ${G.border}`,
      bgcolor: G.paper,
      borderRadius: 3,
      boxShadow: '0 1px 0 rgba(27,23,19,.04),0 8px 24px -14px rgba(27,23,19,.14)',
      overflow: 'hidden',
      mb: 2,
    }} elevation={0}>
      <Box sx={{ p: { xs: 2.5, md: 3 } }}>
        {/* Header */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2, flexWrap: "wrap", gap: 1 }}>
          <Box>
            <Typography sx={{ fontSize: 16, fontWeight: 600, color: G.text, letterSpacing: '-.01em', display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box component="span" sx={{ display: 'inline-flex', mr: 0.5 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={G.accent} strokeWidth="1.8">
                  <path d="M3 17l6-6 4 4 8-10" /><polyline points="15,5 21,5 21,11" />
                </svg>
              </Box>
              แนวโน้มธุรกรรมทอง
              <Box component="span" sx={{ color: G.textMuted, fontSize: 12.5, fontWeight: 500, fontFamily: MONO }}>· Gold flow</Box>
            </Typography>
            <Typography sx={{ color: G.textMuted, fontSize: 12, mt: 0.5 }}>
              ทองรูปพรรณ (กรัม) + ทองแท่ง (บาทน้ำหนัก) — สลับชนิดและ series ได้
            </Typography>
          </Box>

          {/* Chart type switcher */}
          <Box sx={{ display: 'inline-flex', border: `1px solid ${G.border}`, borderRadius: '10px', bgcolor: G.bg, p: '3px' }}>
            {chartTypes.map(([v, icon, title]) => (
              <Box key={v} component="button" title={title} onClick={() => setChartView(v)}
                sx={{ border: chartView === v ? `1px solid ${G.border}` : '1px solid transparent',
                  borderRadius: '8px', p: '7px 9px', cursor: 'pointer',
                  bgcolor: chartView === v ? G.paper : 'transparent',
                  color:   chartView === v ? G.text   : G.textMuted,
                  display: 'flex', alignItems: 'center', transition: 'all .15s',
                  fontFamily: 'inherit',
                  '&:hover': { color: G.text } }}>
                {icon}
              </Box>
            ))}
          </Box>
        </Box>

        {/* Chart body */}
        {isLoading ? (
          <Skeleton variant="rectangular" height={320} sx={{ borderRadius: 2 }} />
        ) : chartData.length === 0 ? (
          <Box sx={{ height: 320, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Typography sx={{ color: G.textMuted }}>ไม่มีข้อมูลในช่วงเวลานี้</Typography>
          </Box>
        ) : chartView === "bar" ? (
          <BarChart
            dataset={chartData} height={320}
            xAxis={[{ scaleType: "band", dataKey: "date", valueFormatter: formatTick }]}
            series={[
              { dataKey: "total_revenue", label: "รายได้",    color: G.success, valueFormatter: (v) => `฿${fmt(v as number || 0)}` },
              { dataKey: "total_cost",    label: "ต้นทุน",    color: G.danger,  valueFormatter: (v) => `฿${fmt(v as number || 0)}` },
              { dataKey: "net_profit",    label: "กำไรสุทธิ", color: G.accent,  valueFormatter: (v) => `฿${fmt(v as number || 0)}` },
            ]}
            sx={chartSx}
          />
        ) : (
          <LineChart
            dataset={chartData} height={320}
            xAxis={[{ scaleType: "band", dataKey: "date", valueFormatter: formatTick }]}
            series={[
              { dataKey: "buyIn",         label: "ทองซื้อเข้า",        color: G.success, area: chartView === "area", showMark: false, curve: "monotoneX", valueFormatter: (v) => `${fmt(v || 0)} กรัม` },
              { dataKey: "sellOut",       label: "ทองขายออก",          color: G.danger,  area: chartView === "area", showMark: false, curve: "monotoneX", valueFormatter: (v) => `${fmt(v || 0)} กรัม` },
              { dataKey: "bar_buy_baht",  label: "แท่งซื้อเข้า (บาท)", color: G.accent,  area: false, showMark: false, curve: "monotoneX", valueFormatter: (v) => `${fmtD(v || 0)} บาท` },
              { dataKey: "bar_sell_baht", label: "แท่งขายออก (บาท)",   color: "#9c3a2a", area: false, showMark: false, curve: "monotoneX", valueFormatter: (v) => `${fmtD(v || 0)} บาท` },
            ]}
            sx={chartSx}
          />
        )}
      </Box>
    </Paper>
  );
}
