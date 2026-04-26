import { useState, useContext } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import {
  Box, CssBaseline, Drawer, Toolbar, AppBar,
  Typography, IconButton, alpha,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import MenuIcon from "@mui/icons-material/Menu";
import { Brightness4, Brightness7 } from "@mui/icons-material";
import HandshakeOutlinedIcon    from "@mui/icons-material/HandshakeOutlined";
import ViewListOutlinedIcon     from "@mui/icons-material/ViewListOutlined";
import DiamondOutlinedIcon      from "@mui/icons-material/DiamondOutlined";
import ReceiptLongOutlinedIcon  from "@mui/icons-material/ReceiptLongOutlined";
import SwapHorizOutlinedIcon    from "@mui/icons-material/SwapHorizOutlined";
import DashboardOutlinedIcon    from "@mui/icons-material/DashboardOutlined";
import FormatListBulletedIcon   from "@mui/icons-material/FormatListBulleted";
import HistoryIcon              from "@mui/icons-material/History";
import { ColorModeContext } from "../layout/ThemeContext";
import { makeG } from "../utils/dashboardTokens";

const drawerWidth = 260;
const MONO  = '"JetBrains Mono", ui-monospace, monospace';
const SERIF = '"Fraunces", serif';

const NAV = [
  {
    section: 'หน้าหลัก',
    items: [
      { label: 'Dashboard',    path: '/',                       Icon: DashboardOutlinedIcon   },
    ],
  },
  {
    section: 'บันทึกรายการ',
    items: [
      { label: 'ทองแท่ง',           path: '/bar',                     Icon: ViewListOutlinedIcon    },
      { label: 'ทองรูปพรรณ',       path: '/ornament',                Icon: DiamondOutlinedIcon     },
      { label: 'ธุรกรรมทองทั้งหมด', path: '/all-transactions-create', Icon: ReceiptLongOutlinedIcon },
      { label: 'จำนำทอง',           path: '/pawn',                    Icon: HandshakeOutlinedIcon   },
      { label: 'แลกเปลี่ยนทองแท่ง', path: '/bar-gold-exchange',       Icon: SwapHorizOutlinedIcon   },
    ],
  },
  {
    section: 'รายการ',
    items: [
      { label: 'รายการทองแท่ง',       path: '/bar-list',                Icon: FormatListBulletedIcon  },
      { label: 'รายการทองรูปพรรณ',   path: '/ornament-list',           Icon: FormatListBulletedIcon  },
      { label: 'รายการธุรกรรม',       path: '/all-transactions-list',   Icon: FormatListBulletedIcon  },
      { label: 'รายการจำนำ',          path: '/pawn-list',               Icon: FormatListBulletedIcon  },
      { label: 'ประวัติแลกเปลี่ยน',  path: '/bar-gold-exchange-history', Icon: HistoryIcon            },
    ],
  },
];

function NavItem({ label, path, Icon, active, G }: {
  label: string; path: string; active: boolean;
  Icon: React.ElementType; G: ReturnType<typeof makeG>;
}) {
  return (
    <Box component={Link} to={path}
      sx={{
        display: 'flex', alignItems: 'center', gap: 1.25,
        px: 2, py: 0.875, mx: 1, borderRadius: '9px',
        textDecoration: 'none', transition: 'all .15s',
        bgcolor: active ? alpha(G.accent, 0.1) : 'transparent',
        color:   active ? G.accent : G.textSub,
        borderLeft: active ? `3px solid ${G.accent}` : '3px solid transparent',
        fontWeight: active ? 600 : 400,
        '&:hover': { bgcolor: alpha(G.accent, 0.07), color: G.accent },
      }}>
      <Icon sx={{ fontSize: 17, flexShrink: 0 }} />
      <Typography sx={{ fontSize: 13.5, fontWeight: 'inherit', color: 'inherit', lineHeight: 1 }}>
        {label}
      </Typography>
    </Box>
  );
}

function SectionLabel({ label, G }: { label: string; G: ReturnType<typeof makeG> }) {
  return (
    <Typography sx={{
      fontSize: 10, fontWeight: 700, color: G.textFaint,
      textTransform: 'uppercase', letterSpacing: '.12em',
      fontFamily: MONO, px: 3, pt: 2.5, pb: 0.75,
    }}>
      {label}
    </Typography>
  );
}

export default function MainLayout() {
  const theme = useTheme();
  const G = makeG(theme);
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const colorMode = useContext(ColorModeContext);

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: G.paper }}>
      {/* Brand */}
      <Box sx={{ px: 3, py: 2.5, borderBottom: `1px solid ${G.border}` }}>
        <Typography sx={{
          fontFamily: SERIF, fontSize: 18, fontWeight: 600,
          color: G.accent, letterSpacing: '-.01em', lineHeight: 1.1,
        }}>
          ห้างทอง
        </Typography>
        <Typography sx={{ fontSize: 11, color: G.textMuted, fontFamily: MONO, mt: 0.25 }}>
          Gold Management System
        </Typography>
      </Box>

      {/* Nav */}
      <Box sx={{ flex: 1, overflowY: 'auto', py: 1 }}>
        {NAV.map(group => (
          <Box key={group.section}>
            <SectionLabel label={group.section} G={G} />
            {group.items.map(item => (
              <NavItem
                key={item.path}
                label={item.label}
                path={item.path}
                Icon={item.Icon}
                active={item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path)}
                G={G}
              />
            ))}
          </Box>
        ))}
      </Box>

      {/* Footer */}
      <Box sx={{ px: 3, py: 2, borderTop: `1px solid ${G.border}` }}>
        <Typography sx={{ fontSize: 10.5, color: G.textFaint, fontFamily: MONO }}>
          v1.0 · {new Date().getFullYear()}
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />

      {/* AppBar */}
      <AppBar position="fixed" elevation={0} sx={{
        bgcolor: G.paper,
        borderBottom: `1px solid ${G.border}`,
        color: G.text,
        width: { md: `calc(100% - ${drawerWidth}px)` },
        ml: { md: `${drawerWidth}px` },
        zIndex: theme.zIndex.drawer + 1,
      }}>
        <Toolbar sx={{ justifyContent: 'space-between', minHeight: '56px !important', px: { xs: 2, md: 3 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <IconButton edge="start" onClick={() => setMobileOpen(o => !o)}
              sx={{ color: G.textSub, display: { md: 'none' } }}>
              <MenuIcon />
            </IconButton>
            <Typography sx={{ fontFamily: SERIF, fontSize: 17, fontWeight: 600, color: G.accent, display: { xs: 'block', md: 'none' } }}>
              ห้างทอง
            </Typography>
          </Box>
          <IconButton onClick={colorMode.toggleColorMode}
            sx={{ color: G.textSub, bgcolor: G.bg, border: `1px solid ${G.border}`, borderRadius: '8px', p: '6px',
              '&:hover': { borderColor: G.accent, color: G.accent } }}>
            {colorMode?.mode === "dark" ? <Brightness7 sx={{ fontSize: 18 }} /> : <Brightness4 sx={{ fontSize: 18 }} />}
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Sidebar — mobile */}
      <Drawer variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box', border: 'none' } }}>
        {drawer}
      </Drawer>

      {/* Sidebar — desktop permanent */}
      <Drawer variant="permanent"
        sx={{ display: { xs: 'none', md: 'block' }, width: drawerWidth, flexShrink: 0,
          '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box', border: 'none',
            borderRight: `1px solid ${G.border}` } }}>
        {drawer}
      </Drawer>

      {/* Main */}
      <Box component="main" sx={{ flexGrow: 1, minHeight: '100vh', bgcolor: G.bg,
        minWidth: 0, overflowX: 'hidden',
        width: { xs: '100%', md: `calc(100% - ${drawerWidth}px)` } }}>
        <Toolbar sx={{ minHeight: '56px !important' }} />
        <Outlet />
      </Box>
    </Box>
  );
}
