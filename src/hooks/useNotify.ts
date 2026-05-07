// src/hooks/useNotify.ts
import { useState, useCallback } from "react";

export function useNotify() {
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "warning" | "info";
  }>({ open: false, message: "", severity: "success" });

  const notify = useCallback((message: string, severity: "success" | "error" = "success") => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const handleClose = useCallback(() => {
    setSnackbar(prev => ({ ...prev, open: false }));
  }, []);

  return { snackbar, notify, handleClose };
}