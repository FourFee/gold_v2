import { Theme } from "@mui/material/styles";

export function makeG(theme: Theme) {
  const dark = theme.palette.mode === "dark";
  return {
    // Backgrounds
    bg:        dark ? "#0f0d0a" : "#f6efe1",
    paper:     dark ? "#14110d" : "#fbf6ea",
    surface:   dark ? "#1a1610" : "#fbf6ea",

    // Borders
    border:    dark ? "#2a241c" : "#e4d8bd",
    borderStr: dark ? "#3b3326" : "#d6c49d",

    // Text
    text:      dark ? "#f4ecd7" : "#1b1713",
    textSub:   dark ? "#d9cfb6" : "#3a332a",
    textMuted: dark ? "#958a72" : "#756a59",
    textFaint: dark ? "#5e5644" : "#a79b83",

    // Accent (navy blue — replaces brass as main accent)
    accent:    dark ? "#7aa7dc" : "#23487a",
    accent2:   dark ? "#a4c3e8" : "#3a6dad",
    accent3:   dark ? "#1a324f" : "#b4cbe8",

    // Semantic
    success:   dark ? "#7bc69a" : "#4b6b3a",
    successBg: dark ? "rgba(123,198,154,0.12)" : "rgba(75,107,58,0.10)",
    danger:    dark ? "#e26a6a" : "#a03025",
    dangerBg:  dark ? "rgba(226,106,106,0.12)" : "rgba(160,48,37,0.10)",
    warning:   dark ? "#e3b74a" : "#9d7a1a",
    warningBg: dark ? "rgba(227,183,74,0.12)"  : "rgba(157,122,26,0.10)",

    // Gold/brass (kept for gold-price and gold-specific accents)
    brass:      "#C9A84C",
    brassLight: "rgba(201,168,76,0.10)",
    brassBorder:"rgba(201,168,76,0.22)",

    // Legacy alias
    cream: dark ? "#0f0d0a" : "#f6efe1",
  };
}

export type GTokens = ReturnType<typeof makeG>;
