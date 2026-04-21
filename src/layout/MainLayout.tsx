import React, { useState, useContext } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Link as RouterLink } from 'react-router-dom';
import { useTheme } from "@mui/material/styles";

import {
  Box,
  CssBaseline,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  AppBar,
  Typography,
  IconButton,
  Divider,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { Brightness4, Brightness7 } from "@mui/icons-material";
import { ColorModeContext } from "../layout/ThemeContext";

import DashboardIcon   from '@mui/icons-material/Dashboard';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import DiamondIcon     from '@mui/icons-material/Diamond';
import HistoryIcon     from '@mui/icons-material/History';
import SwapHorizIcon   from '@mui/icons-material/SwapHoriz';
import ListAltIcon     from '@mui/icons-material/ListAlt';
import ReceiptIcon     from '@mui/icons-material/Receipt';
import InventoryIcon   from '@mui/icons-material/Inventory';
import BarChartIcon    from '@mui/icons-material/BarChart';

import { makeG } from "../utils/dashboardTokens";

const drawerWidth = 264;
const SERIF = '"Fraunces", serif';
const MONO  = '"JetBrains Mono", ui-monospace, monospace';

const mainMenuItems = [
  { text: "หน้าแรก",              icon: <DashboardIcon />,       path: "/" },
  { text: "จำนำทอง",             icon: <AccountBalanceIcon />,   path: "/pawn" },
  { text: "ทองแท่ง",             icon: <AccountBalanceIcon />,   path: "/bar" },
  { text: "ทองรูปพรรณ",          icon: <DiamondIcon />,          path: "/ornament" },
  { text: "ธุรกรรมทองทั้งหมด",   icon: <HistoryIcon />,          path: "/all-transactions-create" },
  { text: "แลกเปลี่ยนทองแท่ง",   icon: <SwapHorizIcon />,        path: "/bar-gold-exchange" },
];

const listMenuItems = [
  { text: "รายการจำนำทอง",               icon: <ListAltIcon />,    path: "/pawn-list" },
  { text: "รายการทองแท่ง",               icon: <BarChartIcon />,   path: "/bar-list" },
  { text: "รายการทองรูปพรรณ",            icon: <ReceiptIcon />,    path: "/ornament-list" },
  { text: "รายการธุรกรรมทั้งหมด",        icon: <InventoryIcon />,  path: "/all-transactions-list" },
  { text: "ประวัติแลกเปลี่ยนทองแท่ง",   icon: <SwapHorizIcon />,  path: "/bar-gold-exchange-history" },
];

function SectionLabel({ label, G }: { label: string; G: ReturnType<typeof makeG> }) {
  return (
    <Typography sx={{
      px: 2.5, pt: 2.5, pb: 0.75,
      fontSize: 10.5, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase',
      color: G.textFaint, fontFamily: MONO,
    }}>
      {label}
    </Typography>
  );
}

function NavItem({ item, active, G }: {
  item: { text: string; icon: React.ReactNode; path: string };
  active: boolean;
  G: ReturnType<typeof makeG>;
}) {
  return (
    <ListItem disablePadding sx={{ px: 1.5, py: 0.25 }}>
      <ListItemButton
        component={RouterLink}
        to={item.path}
        sx={{
          borderRadius: '10px',
          px: 1.5, py: 1,
          bgcolor:     active ? G.accent3 : 'transparent',
          borderLeft:  active ? `3px solid ${G.accent}` : '3px solid transparent',
          color:       active ? G.accent  : G.textSub,
          transition: 'all .15s',
          '& .MuiListItemIcon-root': {
            color: active ? G.accent : G.textMuted,
            minWidth: 36,
          },
          '&:hover': {
            bgcolor: G.accent3,
            color:   G.accent,
            '& .MuiListItemIcon-root': { color: G.accent },
          },
        }}
      >
        <ListItemIcon sx={{ '& svg': { fontSize: 18 } }}>
          {item.icon}
        </ListItemIcon>
        <ListItemText
          primary={item.text}
          primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: active ? 600 : 400 }}
        />
      </ListItemButton>
    </ListItem>
  );
}

export default function MainLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location  = useLocation();
  const colorMode = useContext(ColorModeContext);
  const theme     = useTheme();
  const G         = makeG(theme);

  const drawer = (
    <Box sx={{
      width: drawerWidth, height: '100vh',
      display: 'flex', flexDirection: 'column',
      bgcolor: G.paper,
    }}>
      {/* Brand */}
      <Box sx={{ px: 2.5, pt: 3, pb: 2, borderBottom: `1px solid ${G.border}` }}>
        <Typography sx={{ fontFamily: SERIF, fontWeight: 600, fontSize: 22, color: G.text, lineHeight: 1 }}>
          ห้างทอง
        </Typography>
        <Typography sx={{ fontFamily: MONO, fontSize: 10.5, color: G.textMuted, mt: 0.5, letterSpacing: '.08em' }}>
          GOLD MANAGEMENT · v1.0
        </Typography>
      </Box>

      {/* Main nav */}
      <SectionLabel label="ธุรกรรมหลัก" G={G} />
      <List disablePadding>
        {mainMenuItems.map(item => (
          <NavItem key={item.path} item={item} active={location.pathname === item.path} G={G} />
        ))}
      </List>

      <Divider sx={{ mx: 2.5, my: 1.5, borderColor: G.border }} />

      {/* List nav */}
      <SectionLabel label="รายการทั้งหมด" G={G} />
      <List disablePadding sx={{ flex: 1, overflow: 'auto' }}>
        {listMenuItems.map(item => (
          <NavItem key={item.path} item={item} active={location.pathname === item.path} G={G} />
        ))}
      </List>

      {/* Footer */}
      <Box sx={{ px: 2.5, py: 2, borderTop: `1px solid ${G.border}` }}>
        <Typography sx={{ fontSize: 11, color: G.textFaint, fontFamily: MONO }}>
          © 2567 ห้างทองจินดา
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: '100vh', bgcolor: G.bg }}>
      <CssBaseline />

      {/* AppBar */}
      <AppBar position="fixed" elevation={0}
        sx={{
          zIndex: (t) => t.zIndex.drawer + 1,
          bgcolor: G.paper,
          borderBottom: `1px solid ${G.border}`,
          color: G.text,
        }}
      >
        <Toolbar sx={{ justifyContent: "space-between", minHeight: 56 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <IconButton color="inherit" edge="start" onClick={() => setMobileOpen(v => !v)}
              sx={{ display: { sm: 'none' } }}>
              <MenuIcon />
            </IconButton>
            <Typography sx={{ fontFamily: SERIF, fontWeight: 600, fontSize: 18, color: G.text }}>
              ห้างทอง
            </Typography>
            <Box sx={{
              display: { xs: 'none', md: 'flex' }, alignItems: 'center',
              px: 1.25, py: 0.3, borderRadius: '999px',
              bgcolor: G.accent3, color: G.accent,
              fontSize: 11, fontWeight: 600, letterSpacing: '.06em', fontFamily: MONO,
            }}>
              ระบบจัดการทอง
            </Box>
          </Box>

          <IconButton onClick={colorMode?.toggleColorMode}
            sx={{ color: G.textMuted, '&:hover': { color: G.text } }}>
            {colorMode?.mode === "dark" ? <Brightness7 fontSize="small" /> : <Brightness4 fontSize="small" />}
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Mobile drawer */}
      <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
        <Drawer variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { width: drawerWidth, bgcolor: G.paper, borderRight: `1px solid ${G.border}` },
          }}>
          {drawer}
        </Drawer>

        {/* Desktop drawer */}
        <Drawer variant="permanent" open
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { width: drawerWidth, bgcolor: G.paper, borderRight: `1px solid ${G.border}` },
          }}>
          {drawer}
        </Drawer>
      </Box>

      {/* Main content */}
      <Box component="main" sx={{
        flexGrow: 1,
        p: { xs: 2, md: 3 },
        width: { sm: `calc(100% - ${drawerWidth}px)` },
        bgcolor: G.bg,
        minHeight: '100vh',
      }}>
        <Toolbar sx={{ minHeight: '56px !important' }} />
        <Outlet />
      </Box>
    </Box>
  );
}
