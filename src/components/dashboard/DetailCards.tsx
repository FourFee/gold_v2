import { useTheme } from "@mui/material/styles";
import { Box, Grid, Paper, Skeleton, Typography } from "@mui/material";
import { makeG } from "../../utils/dashboardTokens";
import { fmt, fmtD } from "../../utils/numberFormat";
import { SummaryData, CalcResult } from "../../types";
import { GOLD_BAHT_TO_GRAM_BAR, GOLD_BAHT_TO_GRAM_ORNAMENT } from "../../config";

interface Props {
  summary:   SummaryData | null;
  calc:      CalcResult  | null;
  isLoading: boolean;
}

const MONO = '"JetBrains Mono", ui-monospace, monospace';

function GroupHead({ title, tag, hint, borderTop, G }: {
  title: string; tag: string; hint?: string; borderTop?: boolean;
  G: ReturnType<typeof makeG>;
}) {
  return (
    <Box sx={{ px: 2.5, py: 2,
      borderTop:    borderTop ? `1px solid ${G.border}` : undefined,
      borderBottom: `1px dashed ${G.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <Typography sx={{ fontSize: 15, fontWeight: 600, color: G.text, display: 'flex', alignItems: 'center', gap: 1.25 }}>
        {title}
        <Box component="span" sx={{
          fontSize: 10.5, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase',
          px: 1, py: 0.25, borderRadius: '999px',
          bgcolor: 'rgba(35,72,122,0.12)', color: '#23487a' }}>
          {tag}
        </Box>
      </Typography>
      {hint && <Typography sx={{ color: G.textMuted, fontSize: 12 }}>{hint}</Typography>}
    </Box>
  );
}

function MetricCell({ label, color, primary, primaryUnit, sub, subVal, sub2, sub2Val, G }: {
  label: string; color: string; primary: string; primaryUnit?: string;
  sub?: string; subVal?: string; sub2?: string; sub2Val?: string;
  G: ReturnType<typeof makeG>;
}) {
  return (
    <Box sx={{ p: 2.5, borderRight: `1px solid ${G.border}`, '&:last-child': { borderRight: 0 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.25 }}>
        <Box sx={{ width: 8, height: 8, borderRadius: '2px', bgcolor: color, flexShrink: 0 }} />
        <Typography sx={{ fontSize: 12, fontWeight: 600, color: G.textSub }}>{label}</Typography>
      </Box>
      <Typography sx={{ fontFamily: MONO, fontSize: 20, fontWeight: 600, color: G.text, letterSpacing: '-.01em' }}>
        {primary}
        {primaryUnit && (
          <Box component="span" sx={{ fontSize: 11, color: G.textMuted, ml: 0.5, fontWeight: 500, letterSpacing: '.05em', textTransform: 'uppercase' }}>
            {primaryUnit}
          </Box>
        )}
      </Typography>
      {(sub || sub2) && (
        <Box sx={{ mt: 0.75, color: G.textMuted, fontSize: 11.5 }}>
          {sub && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
              <span>{sub}</span>
              {subVal && <strong style={{ color: G.textSub, fontFamily: MONO }}>{subVal}</strong>}
            </Box>
          )}
          {sub2 && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mt: 0.25 }}>
              <span>{sub2}</span>
              {sub2Val && <strong style={{ color: G.textSub, fontFamily: MONO }}>{sub2Val}</strong>}
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}

export default function DetailCards({ summary, calc, isLoading }: Props) {
  const theme = useTheme();
  const G = makeG(theme);

  const paperSx = {
    border: `1px solid ${G.border}`,
    bgcolor: G.paper,
    borderRadius: 3,
    boxShadow: '0 1px 0 rgba(27,23,19,.04),0 8px 24px -14px rgba(27,23,19,.14)',
    overflow: 'hidden',
    mb: 2,
  } as const;

  if (isLoading) return (
    <Box>
      <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 3, mb: 2 }} />
      <Skeleton variant="rectangular" height={130} sx={{ borderRadius: 3 }} />
    </Box>
  );

  const orn = {
    buyIn:   summary?.buyIn      || 0,
    sellOut: summary?.sellOut    || 0,
    exch:    summary?.exchange   || 0,
    plated:  summary?.plated_gold|| 0,
  };
  const bar = {
    buy:      (summary?.bar_buy  || 0) / GOLD_BAHT_TO_GRAM_BAR,
    sell:     (summary?.bar_sell || 0) / GOLD_BAHT_TO_GRAM_BAR,
    buyGram:  summary?.bar_buy   || 0,
    sellGram: summary?.bar_sell  || 0,
    buyAmt:   summary?.bar_buy_amount  || 0,
    sellAmt:  summary?.bar_sell_amount || 0,
    profit:   summary?.bar_profit      || 0,
    totalGram:(summary?.bar_buy || 0) + (summary?.bar_sell || 0),
  };

  return (
    <>
      {/* ── ทองรูปพรรณ + ทองแท่ง ── */}
      <Paper sx={paperSx} elevation={0}>
        <GroupHead G={G} title="ทองรูปพรรณ" tag="สรุปธุรกรรม (กรัม & บาทน้ำหนัก)"
          hint={`อัตราแลก 1 บาท = ${GOLD_BAHT_TO_GRAM_ORNAMENT} g`} />
        <Grid container sx={{ '& > *': { borderBottom: `1px solid ${G.border}` } }}>
          {([
            { label: 'ทองซื้อเข้า',  color: G.success, gram: orn.buyIn   },
            { label: 'ทองขายออก',   color: G.danger,  gram: orn.sellOut  },
            { label: 'เปลี่ยนทอง', color: G.warning,  gram: orn.exch    },
            { label: 'ทองชุบ',      color: '#20c997',  gram: orn.plated  },
          ] as const).map(m => (
            <Grid item xs={6} md={3} key={m.label}>
              <MetricCell G={G} label={m.label} color={m.color}
                primary={fmtD(m.gram)} primaryUnit="g"
                sub="น้ำหนักบาท" subVal={`${fmtD(m.gram / GOLD_BAHT_TO_GRAM_ORNAMENT)} บาท`} />
            </Grid>
          ))}
        </Grid>

        <GroupHead G={G} title="ทองแท่ง" tag="สรุปธุรกรรม (บาทน้ำหนัก & มูลค่า)"
          hint={`อัตราแลก 1 บาท = ${GOLD_BAHT_TO_GRAM_BAR} g`} borderTop />
        <Grid container>
          <Grid item xs={6} md={3}>
            <MetricCell G={G} label="ทองแท่งซื้อเข้า" color={G.accent}
              primary={fmtD(bar.buy)} primaryUnit="บาท"
              sub="น้ำหนัก (กรัม)" subVal={`${fmtD(bar.buyGram)} g`}
              sub2="มูลค่าเงิน" sub2Val={`฿${fmt(bar.buyAmt)}`} />
          </Grid>
          <Grid item xs={6} md={3}>
            <MetricCell G={G} label="ทองแท่งขายออก" color="#9c3a2a"
              primary={fmtD(bar.sell)} primaryUnit="บาท"
              sub="น้ำหนัก (กรัม)" subVal={`${fmtD(bar.sellGram)} g`}
              sub2="มูลค่าเงิน" sub2Val={`฿${fmt(bar.sellAmt)}`} />
          </Grid>
          <Grid item xs={6} md={3}>
            <MetricCell G={G} label="กำไรทองแท่ง" color={bar.profit >= 0 ? G.success : G.danger}
              primary={`${bar.profit >= 0 ? '+' : ''}฿${fmt(bar.profit)}`}
              sub="มาร์จิน" subVal={bar.buyAmt > 0 ? `${((bar.profit / bar.buyAmt) * 100).toFixed(1)}%` : '-'} />
          </Grid>
          <Grid item xs={6} md={3}>
            <MetricCell G={G} label="ยอดรวมทั้งหมด" color={G.textMuted}
              primary={fmtD(bar.totalGram)} primaryUnit="g"
              sub="รูปพรรณ + แท่ง"
              subVal={`${fmtD((orn.buyIn + orn.sellOut + bar.buyGram + bar.sellGram) / GOLD_BAHT_TO_GRAM_BAR)} บาท`} />
          </Grid>
        </Grid>
      </Paper>

      {/* ── จำนำ ── */}
      <Paper sx={paperSx} elevation={0}>
        <GroupHead G={G} title="สรุปธุรกรรมจำนำ" tag="จำนำ" />
        <Grid container>
          {([
            { label: 'เช็ค',              color: '#748ffc', val: summary?.pawn     || 0 },
            { label: 'ดอก',               color: '#63e6be', val: summary?.interest || 0 },
            { label: 'จำนำ',              color: '#ffa94d', val: summary?.redeem   || 0 },
            { label: 'ยอดรวม (เช็ค−จำนำ)', color: '#ff6b6b', val: (summary?.pawn||0)-(summary?.redeem||0) },
            { label: 'ค่าใช้จ่าย',       color: '#fcc419', val: summary?.expenses || 0 },
          ] as const).map(m => (
            <Grid item xs={6} md key={m.label}>
              <Box sx={{ p: 2, borderRight: `1px solid ${G.border}`, '&:last-child': { borderRight: 0 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.25 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '2px', bgcolor: m.color }} />
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: G.textSub }}>{m.label}</Typography>
                </Box>
                <Typography sx={{ fontFamily: MONO, fontSize: 19, fontWeight: 600, color: G.text }}>
                  ฿{fmt(m.val)}
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.75, color: G.textMuted, fontSize: 11.5 }}>
                  <span>สุทธิ</span>
                  <strong style={{ color: m.val > 0 ? G.success : m.val < 0 ? G.danger : G.textMuted, fontFamily: MONO }}>
                    {m.val > 0 ? 'กำไร' : m.val < 0 ? 'ขาดทุน' : '-'}
                  </strong>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Paper>
    </>
  );
}
