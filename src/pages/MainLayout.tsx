import React, { useState, useContext, useEffect } from "react";
import { Outlet, Link, useNavigate } from "react-router-dom";
import {
  Box, CssBaseline, Drawer, List, ListItem, ListItemButton, ListItemText,
  Toolbar, AppBar, Typography, IconButton, Divider
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { Brightness4, Brightness7 } from "@mui/icons-material";
import { ColorModeContext } from "../layout/ThemeContext";

const drawerWidth = 240;

export default function MainLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  
  const colorMode = useContext(ColorModeContext);
  
  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const drawer = (
    <Box sx={{ width: drawerWidth }}>
      <Toolbar />
      <Divider />
      <List>
        <ListItem disablePadding><ListItemButton component={Link} to="/"><ListItemText primary="หน้าแรก" /></ListItemButton></ListItem>
        <ListItem disablePadding><ListItemButton component={Link} to="/pawn"><ListItemText primary="📌 จำนำทอง" /></ListItemButton></ListItem>
        <ListItem disablePadding><ListItemButton component={Link} to="/bar"><ListItemText primary="🪙 ทองแท่ง" /></ListItemButton></ListItem>
        <ListItem disablePadding><ListItemButton component={Link} to="/ornament"><ListItemText primary="💍 ทองรูปพรรณ" /></ListItemButton></ListItem>
        <ListItem disablePadding><ListItemButton component={Link} to="/all-transactions-create"><ListItemText primary="💍 ธุรกรรมทองทั้งหมด" /></ListItemButton></ListItem>
        <ListItem disablePadding><ListItemButton component={Link} to="/bar-gold-exchange"><ListItemText primary="🪙 แลกเปลี่ยนทองแท่ง" /></ListItemButton></ListItem    >
        <ListItem disablePadding><ListItemButton component={Link} to="/pawn-list"><ListItemText primary="📄 รายการจำนำทอง" /></ListItemButton></ListItem>
        <ListItem disablePadding><ListItemButton component={Link} to="/bar-list"><ListItemText primary="📄 รายการทองแท่ง" /></ListItemButton></ListItem>
        <ListItem disablePadding><ListItemButton component={Link} to="/ornament-list"><ListItemText primary="📄 รายการทองรูปพรรณ" /></ListItemButton></ListItem>
        <ListItem disablePadding><ListItemButton component={Link} to="/all-transactions-list"><ListItemText primary="📄 รายการธุรกรรมทองทั้งหมด" /></ListItemButton></ListItem>
        <ListItem disablePadding><ListItemButton component={Link} to="/bar-gold-exchange-history"><ListItemText primary="📄 ประวัติการแลกเปลี่ยนทองแท่ง" /></ListItemButton></ListItem>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />
      <AppBar position="fixed">
        <Toolbar sx={{ justifyContent: "space-between" }}>
          <IconButton color="inherit" edge="start" onClick={handleDrawerToggle}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap>ระบบจัดการทอง</Typography>
          <IconButton onClick={colorMode.toggleColorMode} color="inherit">
            {colorMode?.mode === "dark" ? <Brightness7 /> : <Brightness4 />}
          </IconButton>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          '& .MuiDrawer-paper': { width: drawerWidth },
        }}
      >
        {drawer}
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}
