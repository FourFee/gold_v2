import { useMemo } from "react";
import { Grid, TextField, Button, Stack } from "@mui/material";
import { validateThaiId } from "../utils/validateThaiId";

export interface CustomerFields {
  firstname: string;
  lastname: string;
  idcard: string;
  address: string;
  phone: string;
}

interface Props {
  values: CustomerFields;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onReadCard: () => void;
  onClear: () => void;
}

export default function CustomerForm({ values, onChange, onReadCard, onClear }: Props) {
  const idcardError = useMemo(() => {
    const clean = values.idcard.replace(/\D/g, "");
    if (clean.length === 13 && !validateThaiId(clean)) return "เลขบัตรประชาชนไม่ถูกต้อง";
    return "";
  }, [values.idcard]);

  return (
    <>
      <Grid item xs={12}>
        <Stack direction="row" spacing={2} justifyContent="center">
          <Button variant="outlined" color="secondary" onClick={onReadCard}>
            📥 อ่านบัตรประชาชน
          </Button>
          <Button variant="outlined" color="warning" onClick={onClear}>
            🧹 เคลียร์ฟอร์ม
          </Button>
        </Stack>
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField fullWidth label="ชื่อ" name="firstname" value={values.firstname} onChange={onChange} />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField fullWidth label="นามสกุล" name="lastname" value={values.lastname} onChange={onChange} />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth label="เลขบัตรประชาชน" name="idcard" value={values.idcard} onChange={onChange}
          error={!!idcardError} helperText={idcardError || " "}
          inputProps={{ maxLength: 13 }}
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField fullWidth label="เบอร์โทรศัพท์" name="phone" value={values.phone} onChange={onChange} />
      </Grid>
      <Grid item xs={12}>
        <TextField fullWidth label="ที่อยู่" name="address" value={values.address} onChange={onChange} />
      </Grid>
    </>
  );
}
