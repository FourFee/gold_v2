// path: gold/src/layout/MainLayout.tsx
import React, { useState, useContext } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Link as RouterLink } from 'react-router-dom';

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
  alpha,
  styled
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { Brightness4, Brightness7 } from "@mui/icons-material";
import { ColorModeContext } from "../layout/ThemeContext";

// Import icons
import DashboardIcon from '@mui/icons-material/Dashboard';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import DiamondIcon from '@mui/icons-material/Diamond';
import HistoryIcon from '@mui/icons-material/History';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import ListAltIcon from '@mui/icons-material/ListAlt';
import ReceiptIcon from '@mui/icons-material/Receipt';
import InventoryIcon from '@mui/icons-material/Inventory';
import BarChartIcon from '@mui/icons-material/BarChart';

const drawerWidth = 280;

// สร้าง styled component สำหรับ ListItemButton
const StyledListItemButton = styled(ListItemButton)(({ theme }) => ({
  borderRadius: 12,
  margin: '6px 12px',
  padding: '12px 16px',
  transition: 'all 0.2s ease-in-out',
  '&:hover': {
    backgroundColor: alpha(theme.palette.primary.main, 0.1),
    transform: 'translateX(4px)',
  },
  '&.active': {
    backgroundColor: alpha(theme.palette.primary.main, 0.15),
    borderLeft: `4px solid ${theme.palette.primary.main}`,
  }
}));

// เมนูหลัก
const mainMenuItems = [
  { 
    text: "📌 จำนำทอง", 
    icon: <AccountBalanceIcon sx={{ color: '#748ffc' }} />, 
    path: "/pawn" 
  },
  { 
    text: "🪙 ทองแท่ง", 
    icon: <AccountBalanceIcon sx={{ color: '#ffd43b' }} />, 
    path: "/bar" 
  },
  { 
    text: "💍 ทองรูปพรรณ", 
    icon: <DiamondIcon sx={{ color: '#cc5de8' }} />, 
    path: "/ornament" 
  },
  { 
    text: "📊 ธุรกรรมทองทั้งหมด", 
    icon: <HistoryIcon sx={{ color: '#51cf66' }} />, 
    path: "/all-transactions-create" 
  },
  { 
    text: "🔄 แลกเปลี่ยนทองแท่ง", 
    icon: <SwapHorizIcon sx={{ color: '#ff922b' }} />, 
    path: "/bar-gold-exchange" 
  },
];

// เมนูรายการ
const listMenuItems = [
  { 
    text: "รายการจำนำทอง", 
    icon: <ListAltIcon sx={{ color: '#748ffc' }} />, 
    path: "/pawn-list" 
  },
  { 
    text: "รายการทองแท่ง", 
    icon: <BarChartIcon sx={{ color: '#ffd43b' }} />, 
    path: "/bar-list" 
  },
  { 
    text: "รายการทองรูปพรรณ", 
    icon: <ReceiptIcon sx={{ color: '#cc5de8' }} />, 
    path: "/ornament-list" 
  },
  { 
    text: "รายการธุรกรรมทองทั้งหมด", 
    icon: <InventoryIcon sx={{ color: '#51cf66' }} />, 
    path: "/all-transactions-list" 
  },
  { 
    text: "ประวัติการแลกเปลี่ยนทองแท่ง", 
    icon: <SwapHorizIcon sx={{ color: '#ff922b' }} />, 
    path: "/bar-gold-exchange-history" 
  },
];

export default function MainLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const colorMode = useContext(ColorModeContext);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const drawer = (
    <Box sx={{ width: drawerWidth, height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Toolbar />
      <Divider />
      
      {/* เมนูหน้าแรก (Dashboard) */}
      <Box sx={{ px: 2, py: 2 }}>
        <ListItemButton 
          component={RouterLink}
          to="/"
          sx={{ 
            background: 'linear-gradient(135deg, #D4AF37 0%, #B8860B 100%)',
            color: 'white',
            margin: '12px 0',
            '&:hover': {
              background: 'linear-gradient(135deg, #B8860B 0%, #D4AF37 100%)',
              transform: 'translateX(4px)',
            }
          }}
          className={location.pathname === "/" ? "active" : ""}
        >
          <ListItemIcon>
            <DashboardIcon sx={{ color: 'white' }} />
          </ListItemIcon>
          <ListItemText 
            primary="หน้าแรก" 
            primaryTypographyProps={{ 
              fontWeight: 600,
              fontSize: '1rem'
            }}
          />
        </ListItemButton>
      </Box>

      {/* Section: ธุรกรรมหลัก */}
      <Box sx={{ px: 2, py: 1 }}>
        <Typography variant="caption" color="text.secondary" fontWeight={600}>
          ธุรกรรมหลัก
        </Typography>
      </Box>
      
      <List sx={{ flex: 1, overflow: 'auto' }}>
        {mainMenuItems.map((item) => (
          <ListItem key={item.path} disablePadding sx={{ display: 'block' }}>
              <ListItemButton
                component={RouterLink}
                to={item.path}
                className={location.pathname === item.path ? "active" : ""}
              >
              <ListItemIcon>
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.text}
                primaryTypographyProps={{ 
                  fontSize: '0.95rem'
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Divider sx={{ my: 2 }} />

      {/* Section: รายการทั้งหมด */}
      <Box sx={{ px: 2, py: 1 }}>
        <Typography variant="caption" color="text.secondary" fontWeight={600}>
          รายการทั้งหมด
        </Typography>
      </Box>
      
      <List sx={{ flex: 1, overflow: 'auto' }}>
        {listMenuItems.map((item) => (
          <ListItem key={item.path} disablePadding sx={{ display: 'block' }}>
              <ListItemButton
                component={RouterLink}
                to={item.path}
                className={location.pathname === item.path ? "active" : ""}
              >
              <ListItemIcon>
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.text}
                primaryTypographyProps={{ 
                  fontSize: '0.95rem'
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      {/* Footer */}
      <Box sx={{ 
        p: 2, 
        mt: 'auto',
        backgroundColor: alpha('#D4AF37', 0.05),
        borderTop: `1px solid ${alpha('#D4AF37', 0.1)}`
      }}>
        <Typography variant="caption" color="text.secondary" align="center">
          ห้างทองจินดา
        </Typography>
        <Typography variant="caption" color="text.secondary" align="center" display="block">
          v1.0.0
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: '100vh' }}>
      <CssBaseline />
      
      {/* AppBar */}
      <AppBar 
        position="fixed" 
        sx={{ 
          zIndex: (theme) => theme.zIndex.drawer + 1,
          backgroundColor: '#D4AF37',
          boxShadow: '0 4px 20px rgba(212, 175, 55, 0.3)'
        }}
      >
        <Toolbar sx={{ 
          justifyContent: "space-between",
          minHeight: 64
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton 
              color="inherit" 
              edge="start" 
              onClick={handleDrawerToggle}
              sx={{ 
                mr: 2,
                display: { sm: 'none' } 
              }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" noWrap sx={{ fontWeight: 700 }}>
              🪙 ระบบจัดการทอง
            </Typography>
          </Box>
          
          <IconButton 
            onClick={colorMode?.toggleColorMode} 
            color="inherit"
            sx={{
              backgroundColor: alpha('#000', 0.1),
              '&:hover': {
                backgroundColor: alpha('#000', 0.2),
              }
            }}
          >
            {colorMode?.mode === "dark" ? <Brightness7 /> : <Brightness4 />}
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Drawer สำหรับมือถือ */}
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
              borderRight: `1px solid ${alpha('#D4AF37', 0.1)}`
            },
          }}
        >
          {drawer}
        </Drawer>
        
        {/* Drawer สำหรับ desktop */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
              borderRight: `1px solid ${alpha('#D4AF37', 0.1)}`
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          backgroundColor: (theme) => 
            theme.palette.mode === 'light' 
              ? '#f8f9fa' 
              : theme.palette.background.default,
          minHeight: '100vh'
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}