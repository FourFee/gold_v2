// ช่องข้อมูลผู้ทำธุรกรรมที่ใช้ร่วมกันในแบบ ปปง.1-05-2 และ 1-05-10
import { Grid, MenuItem, TextField } from "@mui/material";
import type { AmlIdType } from "../utils/amlReport";
import type { AmlExtra } from "../utils/amlFlow";

const ID_TYPES: { value: AmlIdType; label: string }[] = [
  { value: "citizen", label: "บัตรประจำตัวประชาชน" },
  { value: "passport", label: "หนังสือเดินทาง" },
  { value: "alien", label: "ใบสำคัญประจำตัวคนต่างด้าว" },
  { value: "other", label: "อื่น ๆ (ระบุ)" },
];

interface Props {
  value: AmlExtra;
  onChange: (v: AmlExtra) => void;
  purposePlaceholder: string;
  inputSx?: object;
}

export default function AmlIdentityFields({ value, onChange, purposePlaceholder, inputSx }: Props) {
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
    <>
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
          onChange={(e) => set({ idExpiryDate: e.target.value, idExpiryLifetime: false })}
          helperText={value.idExpiryLifetime ? "บัตรตลอดชีพ" : undefined}
          InputLabelProps={{ shrink: true }} sx={inputSx} />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField fullWidth label="ผู้รับประโยชน์ (ถ้ามี)" value={value.beneficiary} onChange={text("beneficiary")} sx={inputSx} />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField fullWidth label="วัตถุประสงค์" value={value.purpose} onChange={text("purpose")} sx={inputSx}
          placeholder={purposePlaceholder} InputLabelProps={{ shrink: true }} />
      </Grid>
    </>
  );
}
