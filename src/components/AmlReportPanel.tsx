import { Alert, Box, Button, FormControlLabel, Grid, MenuItem, Switch, TextField, Typography, alpha } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import { makeG } from "../utils/dashboardTokens";
import { AML_THRESHOLD } from "../utils/amlConfig";
import type { AmlIdType } from "../utils/amlReport";

const MONO = '"JetBrains Mono", ui-monospace, monospace';

export interface AmlExtra {
  cash: boolean;          // ชำระด้วยเงินสดหรือไม่ (โอน/เช็คไม่ต้องรายงานแบบนี้)
  idType: AmlIdType;
  idTypeOther: string;
  nationality: string;
  occupation: string;
  idIssuedBy: string;
  idIssueDate: string;    // YYYY-MM-DD
  idExpiryDate: string;   // YYYY-MM-DD
  beneficiary: string;
  purpose: string;
  sequenceNo: string;
}

export const AML_EXTRA_INITIAL: AmlExtra = {
  cash: true, idType: "citizen", idTypeOther: "", nationality: "ไทย", occupation: "",
  idIssuedBy: "", idIssueDate: "", idExpiryDate: "", beneficiary: "", purpose: "", sequenceNo: "",
};

const ID_TYPES: { value: AmlIdType; label: string }[] = [
  { value: "citizen", label: "บัตรประจำตัวประชาชน" },
  { value: "passport", label: "หนังสือเดินทาง" },
  { value: "alien", label: "ใบสำคัญประจำตัวคนต่างด้าว" },
  { value: "other", label: "อื่น ๆ (ระบุ)" },
];

interface Props {
  value: AmlExtra;
  onChange: (v: AmlExtra) => void;
  mode: "buy" | "sell";
  amount: number;
  onGenerate: () => void;
  generating: boolean;
  inputSx: object;
}

export default function AmlReportPanel({ value, onChange, mode, amount, onGenerate, generating, inputSx }: Props) {
  const theme = useTheme();
  const G = makeG(theme);
  const set = (patch: Partial<AmlExtra>) => onChange({ ...value, ...patch });
  const text = (key: keyof AmlExtra) => (e: React.ChangeEvent<HTMLInputElement>) =>
    set({ [key]: e.target.value } as Partial<AmlExtra>);

  const onNationality = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nationality = e.target.value;
    const foreign = nationality.trim() !== "" && nationality.trim() !== "ไทย";
    // คนต่างชาติที่ยังเลือกบัตรประชาชนอยู่ → เปลี่ยนเป็นหนังสือเดินทางให้
    set({ nationality, idType: foreign && value.idType === "citizen" ? "passport" : value.idType });
  };

  return (
    <Box sx={{ border: `1px solid ${G.border}`, borderRadius: '12px', p: 2, bgcolor: alpha(G.accent, 0.03) }}>
      <Typography sx={{ fontSize: 11, fontWeight: 700, color: G.textFaint, textTransform: 'uppercase', letterSpacing: '.1em', mb: 1, fontFamily: MONO }}>
        รายงาน ปปง. 1-05-2 · ธุรกรรมเงินสด ≥ {AML_THRESHOLD.toLocaleString()} บาท
      </Typography>

      <FormControlLabel
        control={<Switch checked={value.cash} onChange={(e) => set({ cash: e.target.checked })} />}
        label={`ยอด ${amount.toLocaleString()} บาท ชำระด้วยเงินสด`}
      />

      {!value.cash ? (
        <Alert severity="info" sx={{ mt: 1 }}>
          ชำระด้วยการโอนหรือเช็ค ไม่ต้องทำแบบรายงานเงินสดนี้ (ฟอร์มนับเฉพาะธนบัตรและเหรียญกษาปณ์)
        </Alert>
      ) : (
        <>
          <Alert severity="warning" sx={{ mt: 1, mb: 2 }}>
            ต้องกรอก <b>เลขบัตรประชาชน/เลขหนังสือเดินทาง</b> ในช่อง "เลขบัตร" ด้านบน
            และระบบจะสร้าง PDF ให้อัตโนมัติเมื่อกดบันทึก
          </Alert>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField select fullWidth label="ชนิดหลักฐาน" value={value.idType} sx={inputSx}
                onChange={(e) => set({ idType: e.target.value as AmlIdType })}>
                {ID_TYPES.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              {value.idType === "other"
                ? <TextField fullWidth label="ระบุชนิดหลักฐาน" value={value.idTypeOther} onChange={text("idTypeOther")} sx={inputSx} />
                : <TextField fullWidth label="สัญชาติ" value={value.nationality} onChange={onNationality} sx={inputSx} />}
            </Grid>
            {value.idType === "other" && (
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="สัญชาติ" value={value.nationality} onChange={onNationality} sx={inputSx} />
              </Grid>
            )}
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="อาชีพ (ถ้าลูกค้าไม่แจ้ง เว้นว่าง)" value={value.occupation} onChange={text("occupation")} sx={inputSx} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="ออกให้โดย" value={value.idIssuedBy} onChange={text("idIssuedBy")} sx={inputSx} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth type="date" label="วันออกบัตร" value={value.idIssueDate}
                onChange={text("idIssueDate")} InputLabelProps={{ shrink: true }} sx={inputSx} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth type="date" label="วันหมดอายุ" value={value.idExpiryDate}
                onChange={text("idExpiryDate")} InputLabelProps={{ shrink: true }} sx={inputSx} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="ผู้รับประโยชน์ (ถ้ามี)" value={value.beneficiary} onChange={text("beneficiary")} sx={inputSx} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="วัตถุประสงค์" value={value.purpose} onChange={text("purpose")} sx={inputSx}
                placeholder={mode === "buy" ? "ซื้อทองคำแท่ง" : "ขายทองคำแท่ง"} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="ลำดับที่ของธุรกรรม (6 หลัก ถ้ามี)" value={value.sequenceNo}
                onChange={(e) => set({ sequenceNo: e.target.value.replace(/\D/g, "").slice(0, 6) })} sx={inputSx} />
            </Grid>
            <Grid item xs={12} sm={6} sx={{ display: 'flex', alignItems: 'center', justifyContent: { sm: 'flex-end' } }}>
              <Button startIcon={<PictureAsPdfIcon />} variant="outlined" onClick={onGenerate} disabled={generating}
                sx={{ borderRadius: '10px', borderColor: G.accent, color: G.accent, minHeight: 44, fontWeight: 600,
                  '&:hover': { bgcolor: alpha(G.accent, 0.08) } }}>
                {generating ? "กำลังสร้าง..." : "สร้างแบบ ปปง.1-05-2 (PDF)"}
              </Button>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
}
