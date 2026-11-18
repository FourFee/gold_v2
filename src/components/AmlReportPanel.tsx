import { Alert, Box, Button, Grid, TextField, ToggleButton, ToggleButtonGroup, Typography, alpha } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import { makeG } from "../utils/dashboardTokens";
import { AML_THRESHOLD } from "../utils/amlConfig";
import AmlIdentityFields from "./AmlIdentityFields";
import type { AmlExtra, AmlStatus } from "../utils/amlFlow";

const MONO = '"JetBrains Mono", ui-monospace, monospace';

const STATUSES: { value: AmlStatus; label: string }[] = [
  { value: "report", label: "เงินสด · ส่ง ปปง." },
  { value: "exempt_transfer", label: "โอน/เช็ค · ไม่ต้องส่ง" },
  { value: "exempt_other", label: "ไม่ต้องส่ง ปปง." },
];

interface Props {
  value: AmlExtra;
  onChange: (v: AmlExtra) => void;
  mode: "buy" | "sell";
  goods: "ทองคำแท่ง" | "ทองรูปพรรณ";
  amount: number;
  onPreview: () => void;
  previewing: boolean;
  inputSx?: object;
}

export default function AmlReportPanel({ value, onChange, mode, goods, amount, onPreview, previewing, inputSx }: Props) {
  const theme = useTheme();
  const G = makeG(theme);
  const set = (patch: Partial<AmlExtra>) => onChange({ ...value, ...patch });
  const text = (key: keyof AmlExtra) => (e: React.ChangeEvent<HTMLInputElement>) =>
    set({ [key]: e.target.value } as Partial<AmlExtra>);

  return (
    <Box sx={{ border: `1px solid ${G.border}`, borderRadius: '12px', p: 2, bgcolor: alpha(G.accent, 0.03) }}>
      <Typography sx={{ fontSize: 11, fontWeight: 700, color: G.textFaint, textTransform: 'uppercase', letterSpacing: '.1em', mb: 1, fontFamily: MONO }}>
        รายงาน ปปง. 1-05-2 · ยอด {amount.toLocaleString()} บาท (≥ {AML_THRESHOLD.toLocaleString()})
      </Typography>

      <ToggleButtonGroup exclusive size="small" value={value.status}
        onChange={(_, v: AmlStatus | null) => v && set({ status: v })}
        sx={{ flexWrap: 'wrap', '& .MuiToggleButton-root': { borderRadius: '8px !important', px: 1.5, fontSize: 13 } }}>
        {STATUSES.map((s) => <ToggleButton key={s.value} value={s.value}>{s.label}</ToggleButton>)}
      </ToggleButtonGroup>

      {value.status === "exempt_transfer" && (
        <Alert severity="info" sx={{ mt: 1.5 }}>
          ชำระด้วยการโอนหรือเช็ค ไม่ต้องทำแบบรายงานเงินสดนี้ (ฟอร์มนับเฉพาะธนบัตรและเหรียญกษาปณ์) ระบบจะบันทึกไว้ว่าไม่ต้องส่ง
        </Alert>
      )}

      {value.status === "exempt_other" && (
        <Box sx={{ mt: 1.5 }}>
          <TextField fullWidth label="เหตุผลที่ไม่ต้องส่ง ปปง." value={value.exemptReason} onChange={text("exemptReason")}
            placeholder="เช่น ร้านซื้อเอง" InputLabelProps={{ shrink: true }} sx={inputSx} />
        </Box>
      )}

      {value.status === "report" && (
        <>
          <Alert severity="warning" sx={{ mt: 1.5, mb: 2 }}>
            ต้องกรอก <b>เลขบัตรประชาชน/เลขหนังสือเดินทาง</b> ในช่อง "เลขบัตร" ด้านบน
            เมื่อกดบันทึก ระบบจะออกเลขลำดับของเดือนและเปิด PDF ให้
          </Alert>
          <Grid container spacing={2}>
            <AmlIdentityFields value={value} onChange={onChange} inputSx={inputSx}
              purposePlaceholder={`${mode === "buy" ? "ซื้อ" : "ขาย"}${goods}`} />
            <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button startIcon={<PictureAsPdfIcon />} variant="outlined" onClick={onPreview} disabled={previewing}
                sx={{ borderRadius: '10px', borderColor: G.accent, color: G.accent, minHeight: 44, fontWeight: 600,
                  '&:hover': { bgcolor: alpha(G.accent, 0.08) } }}>
                {previewing ? "กำลังสร้าง..." : "ดูตัวอย่าง PDF (ยังไม่มีเลขลำดับ)"}
              </Button>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
}
