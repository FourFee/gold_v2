// src/hooks/useNotify.ts
import { useState } from "react";

export function useNotify() {
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "warning" | "info";
  }>({ open: false, message: "", severity: "success" });

  const notify = (message: string, severity: "success" | "error" = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  const handleClose = () => setSnackbar(prev => ({ ...prev, open: false }));

  return { snackbar, notify, handleClose };
}