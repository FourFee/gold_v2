// src/components/ErrorBoundary.tsx
import { Component, ReactNode } from "react";
import { Box, Typography, Button } from "@mui/material";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("❌ ErrorBoundary caught:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box textAlign="center" mt={8}>
          <Typography variant="h4" color="error" gutterBottom>
            ❌ เกิดข้อผิดพลาด
          </Typography>
          <Typography variant="body1" color="text.secondary" mb={3}>
            กรุณารีเฟรชหน้าใหม่อีกครั้ง
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={() => window.location.reload()}
          >
            🔄 รีเฟรชหน้า
          </Button>
        </Box>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
export type { Props, State }; // ✅ เพิ่มบรรทัดนี้