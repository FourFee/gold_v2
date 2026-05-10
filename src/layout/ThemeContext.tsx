import React, { createContext, useState, useMemo } from "react";
import { createTheme, ThemeProvider } from "@mui/material/styles";

export const ColorModeContext = createContext({
  toggleColorMode: () => {},
  mode: "dark" as "light" | "dark"
});

export default function ThemeContextProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "dark";
    const saved = localStorage.getItem("themeMode");
    return saved === "light" || saved === "dark" ? saved : "dark";
  });

  const colorMode = useMemo(() => ({
    toggleColorMode: () => {
      setMode((prevMode) => {
        const next = prevMode === "light" ? "dark" : "light";
        try { localStorage.setItem("themeMode", next); } catch {}
        return next;
      });
    },
    mode
  }), [mode]);

  const theme = useMemo(() =>
    createTheme({
      palette: { mode },
      components: {
        // ซ่อนลูกศร spinner ของ input type=number ในทุก MUI TextField
        MuiTextField: {
          styleOverrides: {
            root: {
              '& input[type=number]::-webkit-outer-spin-button': {
                WebkitAppearance: 'none',
                margin: 0,
              },
              '& input[type=number]::-webkit-inner-spin-button': {
                WebkitAppearance: 'none',
                margin: 0,
              },
              '& input[type=number]': {
                MozAppearance: 'textfield',
              },
            },
          },
        },
      },
    }), [mode]);

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}
