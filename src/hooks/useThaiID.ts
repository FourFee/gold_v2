import { useEffect } from "react";
import { API_BASE } from "../config";

export const useThaiID = (setForm: (form: any) => void) => {
  useEffect(() => {
    const interval = setInterval(() => {
      fetch(`${API_BASE}/idcard/latest`)
        .then((res) => res.json())
        .then((data) => {
          if (data?.citizen_id) {
            const nameParts = data.name_th.split(" ");
            setForm((prev: any) => ({
              ...prev,
              idcard: data.citizen_id,
              firstname: nameParts[0] || "",
              lastname: nameParts[1] || "",
              address: data.address,
            }));
          }
        })
        .catch(() => {
          console.warn("⚠️ ยังไม่มีข้อมูลบัตรใหม่");
        });
    }, 5000); // เรียกทุก 5 วินาที

    return () => clearInterval(interval);
  }, [setForm]);
};
