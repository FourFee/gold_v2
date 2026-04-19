//path: gold/src/pages/BarGoldList.tsx
import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Box,
  Paper,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  ToggleButton,
  ToggleButtonGroup,
  TextField,
  IconButton,
  TablePagination,
  Grid,
  Card,
  CardContent,
  alpha,
  CircularProgress,
  InputAdornment,
  Chip,
  Tooltip,
} from "@mui/material";
import { 
  Edit, 
  Save, 
  Delete, 
  Search as SearchIcon, 
  TrendingUp,
  TrendingDown,
  AttachMoney,
  Scale,
  Calculate,
  ArrowBack,
  Refresh
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import dayjs, { Dayjs } from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { API_BASE } from "../config";
import { useNotify } from "../hooks/useNotify";
import { Snackbar, Alert } from "@mui/material";

dayjs.extend(utc);

// สีธีมสำหรับแอปพลิเคชัน
const THEME_COLORS = {
  primary: '#D4AF37', // ทอง
  secondary: '#2A2A2A',
  success: '#4CAF50',
  error: '#F44336',
  warning: '#FF9800',
  info: '#2196F3',
  background: '#F8F9FA',
  cardBackground: '#FFFFFF',
  textPrimary: '#1A1A1A',
  textSecondary: '#666666'
};

export default function BarGoldList() {
  const [data, setData] = useState<any[]>([]);
  const [mode, setMode] = useState<"buy" | "sell">("sell");
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [form, setForm] = useState<any>({});
  const navigate = useNavigate();
  
  const { snackbar, notify, handleClose } = useNotify();

  const API = `${API_BASE}/bar-gold`;

  const [deleting, setDeleting] = useState<number | null>(null);

  // Pagination states
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // State for period
  const [selectedPeriod, setSelectedPeriod] = useState<string>("month");

 

  // Loading state
  const [loading, setLoading] = useState(true);
 

  // Wrap fetchData in useCallback to prevent re-creation on every render
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API}/list?period=${selectedPeriod}&sort_order=desc`);
      if (!response.ok) throw new Error('Failed to fetch data');
      const json = await response.json();
      console.log("📦 bar-gold list data:", json);
      setData(Array.isArray(json) ? json : []);
      setPage(0);
      
    } catch (error) {
      console.error("❌ โหลดข้อมูลไม่สำเร็จ:", error);
      notify("❌ โหลดข้อมูลไม่สำเร็จ", "error");
    } finally {
      setLoading(false);
    }
  }, [API, selectedPeriod]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter data based on mode and search term
  const [search, setSearch] = useState<string>("");

  const filteredData = data.filter(
    (item) =>
      item.mode === mode &&
      (
        new Date(item.date).toLocaleDateString("th-TH").replace(/[\s]/g, '-').includes(search.replace(/\s/g, '-')) ||
        item.firstname.toLowerCase().includes(search.toLowerCase()) ||
        item.lastname.toLowerCase().includes(search.toLowerCase()) ||
        item.idcard.includes(search) ||
        item.phone.includes(search)
      )
  );

  // Calculate displayed data for the current page
  const displayedData = filteredData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  // Recalculate totals whenever 'filteredData' changes
  const totals = useMemo(() => {
  return filteredData.reduce((acc, item) => ({
    totalWeightBaht: acc.totalWeightBaht + (item.weightBaht || 0),
    totalWeightGram: acc.totalWeightGram + (item.weightGram || 0),
    totalAmount: acc.totalAmount + (item.amount || 0),
  }), { totalWeightBaht: 0, totalWeightGram: 0, totalAmount: 0 });
}, [filteredData]);

  const handleDelete = async (id: number) => {
    if (!window.confirm("คุณแน่ใจว่าต้องการลบรายการนี้?")) return;
    setDeleting(id);
    try {
      await fetch(`${API}/delete/${id}`, { method: "DELETE" });
      await fetchData();
    } catch (error) {
      console.error("❌ ลบข้อมูลไม่สำเร็จ:", error);
      notify("❌ ลบข้อมูลไม่สำเร็จ", "error");
    } finally {
      setDeleting(null);
    }
  };

  const handleModeChange = (_: any, newMode: "buy" | "sell") => {
    if (newMode !== null) {
      setMode(newMode);
      setPage(0);
    }
  };

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const startEdit = (index: number) => {
    setEditIndex(index);
    const actualFilteredIndex = page * rowsPerPage + index;
    const itemToEdit = filteredData[actualFilteredIndex];
    setForm({
      ...itemToEdit,
      date: itemToEdit.date ? dayjs(itemToEdit.date) : dayjs(),
      weightBaht: String(itemToEdit.weightBaht || ""),
      weightGram: String(itemToEdit.weightGram || ""),
      amount: String(itemToEdit.amount || ""),
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const saveEdit = async () => {
    if (editIndex === null) return;
    const actualFilteredIndex = page * rowsPerPage + editIndex;
    const id = filteredData[actualFilteredIndex].id;

    const dataToSend = {
      ...form,
      date: form.date ? (form.date as Dayjs).toISOString() : null,
      weightBaht: parseFloat(form.weightBaht || "0"),
      weightGram: parseFloat(form.weightGram || "0"),
      amount: parseFloat(form.amount || "0"),
    };

    try {
      const res = await fetch(`${API}/update/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToSend),
      });

      if (res.ok) {
        notify("✅ บันทึกเรียบร้อย", "success");
        setEditIndex(null);
        fetchData();
      } else {
        throw new Error('บันทึกไม่สำเร็จ');
      }
    } catch (error) {
      console.error("❌ บันทึกไม่สำเร็จ:", error);
      notify("❌ บันทึกไม่สำเร็จ", "error");
    }
  };

  return (
  <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>

    {loading ? (
      // ✅ แสดง loading ข้างใน ไม่ขัด MainLayout
      <Box display="flex" justifyContent="center" alignItems="center" mt={4}>
        <CircularProgress />
      </Box>
    ) : (
      <>
        {/* Header Section */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 2,
            mb: 3 
          }}>
            <Box>
              <Typography variant="h4" component="h1" gutterBottom fontWeight={700} sx={{ 
                color: THEME_COLORS.textPrimary,
                display: 'flex',
                alignItems: 'center',
                gap: 2
              }}>
                <Box sx={{
                  width: 8,
                  height: 40,
                  backgroundColor: THEME_COLORS.primary,
                  borderRadius: 1
                }} />
                🪙 รายการทองแท่ง
              </Typography>
              <Typography variant="subtitle1" sx={{ color: THEME_COLORS.textSecondary, ml: 3 }}>
                จัดการข้อมูลธุรกรรมทองแท่งทั้งหมด
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={() => fetchData()}
                sx={{
                  borderRadius: 2,
                  borderColor: THEME_COLORS.primary,
                  color: THEME_COLORS.primary,
                  '&:hover': {
                    backgroundColor: alpha(THEME_COLORS.primary, 0.1),
                    borderColor: THEME_COLORS.primary,
                  }
                }}
              >
                รีเฟรช
              </Button>
              <Button
                variant="contained"
                startIcon={<ArrowBack />}
                onClick={() => navigate("/")}
                sx={{
                  borderRadius: 2,
                  backgroundColor: THEME_COLORS.secondary,
                  '&:hover': {
                    backgroundColor: alpha(THEME_COLORS.secondary, 0.9),
                  }
                }}
              >
                กลับหน้าแรก
              </Button>
            </Box>
          </Box>

          {/* Mode Selector */}
          <Box sx={{ 
            mb: 4,
            p: 2,
            backgroundColor: 'white',
            borderRadius: 3,
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
          }}>
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 3 
            }}>
              <Box>
                <Typography variant="h6" fontWeight={600} sx={{ mb: 1, color: THEME_COLORS.textPrimary }}>
                  เลือกประเภทธุรกรรม
                </Typography>
                <ToggleButtonGroup
                  value={selectedPeriod}
                  exclusive
                  onChange={(_, v) => v && setSelectedPeriod(v)}
                  size="small"
                >
                  <ToggleButton value="day">รายวัน</ToggleButton>
                  <ToggleButton value="week">รายสัปดาห์</ToggleButton>
                  <ToggleButton value="month">รายเดือน</ToggleButton>
                </ToggleButtonGroup>
                <ToggleButtonGroup
                  value={mode}
                  exclusive
                  onChange={handleModeChange}
                  sx={{
                    '& .MuiToggleButton-root': {
                      border: '2px solid transparent',
                      borderRadius: 2,
                      px: 3,
                      py: 1,
                      fontWeight: 600,
                      '&.Mui-selected': {
                        backgroundColor: mode === 'buy' ? THEME_COLORS.success : THEME_COLORS.error,
                        color: 'white',
                        boxShadow: `0 4px 12px ${alpha(mode === 'buy' ? THEME_COLORS.success : THEME_COLORS.error, 0.3)}`,
                        '&:hover': {
                          backgroundColor: mode === 'buy' ? alpha(THEME_COLORS.success, 0.9) : alpha(THEME_COLORS.error, 0.9),
                        }
                      }
                    }
                  }}
                >
                  <ToggleButton value="buy">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <TrendingUp fontSize="small" />
                      <span>🛒 ขายออก</span>
                    </Box>
                  </ToggleButton>
                  <ToggleButton value="sell">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <TrendingDown fontSize="small" />
                      <span>💰 ซื้อเข้า</span>
                    </Box>
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>

              {/* Search Box */}
              <TextField
                variant="outlined"
                placeholder="ค้นหา วันที่, ชื่อ, เลขบัตร, เบอร์โทรศัพท์..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                sx={{ 
                  width: { xs: '100%', sm: 400 },
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    backgroundColor: 'white',
                  }
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: search && (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setSearch('')}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
            </Box>
          </Box>
        </Box>

      {/* Stats Cards */}
      
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={4}>
            <Card sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)',
              transition: 'all 0.3s ease-in-out',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 12px 40px rgba(102, 126, 234, 0.4)',
              }
            }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box sx={{
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    borderRadius: 2,
                    p: 1,
                    mr: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Scale sx={{ fontSize: 28 }} />
                  </Box>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    น้ำหนักรวม (บาท)
                  </Typography>
                </Box>
                <Typography variant="h3" fontWeight={700}>
                  {totals.totalWeightBaht.toFixed(2)}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8, mt: 0.5 }}>
                  บาททอง
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card sx={{
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              color: 'white',
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(240, 147, 251, 0.3)',
              transition: 'all 0.3s ease-in-out',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 12px 40px rgba(240, 147, 251, 0.4)',
              }
            }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box sx={{
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    borderRadius: 2,
                    p: 1,
                    mr: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Calculate sx={{ fontSize: 28 }} />
                  </Box>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    น้ำหนักรวม (กรัม)
                  </Typography>
                </Box>
                <Typography variant="h3" fontWeight={700}>
                  {totals.totalWeightGram.toFixed(2)}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8, mt: 0.5 }}>
                  กรัม
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card sx={{
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              color: 'white',
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(79, 172, 254, 0.3)',
              transition: 'all 0.3s ease-in-out',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 12px 40px rgba(79, 172, 254, 0.4)',
              }
            }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box sx={{
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    borderRadius: 2,
                    p: 1,
                    mr: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <AttachMoney sx={{ fontSize: 28 }} />
                  </Box>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    มูลค่ารวม
                  </Typography>
                </Box>
                <Typography variant="h3" fontWeight={700}>
                  {totals.totalAmount.toFixed(2)}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8, mt: 0.5 }}>
                  บาท
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      

      {/* Data Table */}
        <Paper sx={{ 
          width: '100%', 
          overflow: 'hidden',
          borderRadius: 3,
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          border: `1px solid ${alpha(THEME_COLORS.primary, 0.1)}`,
          mb: 3
        }}>
          {loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" height={400}>
              <CircularProgress sx={{ color: THEME_COLORS.primary }} />
            </Box>
          ) : (
            <>
              <Table sx={{ minWidth: 1200 }}>
                <TableHead>
                  <TableRow sx={{
                    backgroundColor: alpha(THEME_COLORS.primary, 0.05),
                    '& th': {
                      color: THEME_COLORS.textPrimary,
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      borderBottom: `2px solid ${alpha(THEME_COLORS.primary, 0.2)}`,
                      py: 2
                    }
                  }}>
                    <TableCell>วันที่/เวลา</TableCell>
                    <TableCell>ชื่อ</TableCell>
                    <TableCell>นามสกุล</TableCell>
                    <TableCell>เลขบัตร</TableCell>
                    <TableCell>ที่อยู่</TableCell>
                    <TableCell>เบอร์โทรศัพท์</TableCell>
                    <TableCell align="right">น้ำหนัก (บาท)</TableCell>
                    <TableCell align="right">น้ำหนัก (กรัม)</TableCell>
                    <TableCell align="right">จำนวนเงิน</TableCell>
                    <TableCell>หมายเหตุ</TableCell>
                    <TableCell align="center">จัดการ</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {displayedData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} align="center" sx={{ py: 6 }}>
                        <Box sx={{ 
                          display: 'flex', 
                          flexDirection: 'column', 
                          alignItems: 'center',
                          color: THEME_COLORS.textSecondary
                        }}>
                          <SearchIcon sx={{ fontSize: 60, mb: 2, opacity: 0.5 }} />
                          <Typography variant="h6" gutterBottom>
                            ไม่พบข้อมูล
                          </Typography>
                          <Typography variant="body2">
                            {search ? `ไม่พบข้อมูลที่ตรงกับ "${search}"` : "ยังไม่มีข้อมูลในระบบ"}
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ) : (
                    displayedData.map((item, i) => (
                      <TableRow 
                        key={item.id}
                        sx={{ 
                          '&:hover': { 
                            backgroundColor: alpha(THEME_COLORS.primary, 0.03),
                            transition: 'background-color 0.2s ease-in-out'
                          },
                          '&:last-child td': {
                            borderBottom: 'none'
                          }
                        }}
                      >
                        {editIndex === i ? (
                          <>
                            <TableCell>
                              <LocalizationProvider dateAdapter={AdapterDayjs}>
                                <DatePicker
                                  label="วันที่"
                                  value={form.date as Dayjs | null}
                                  onChange={(newValue) => {
                                    setForm((prevForm: any) => ({
                                      ...prevForm,
                                      date: newValue
                                    }));
                                  }}
                                  slotProps={{
                                    textField: { 
                                      variant: "outlined", 
                                      fullWidth: true,
                                      size: "small",
                                      sx: { minWidth: 150 }
                                    }
                                  }}
                                />
                              </LocalizationProvider>
                            </TableCell>
                            {["firstname", "lastname", "idcard", "address", "phone"].map((field) => (
                              <TableCell key={field}>
                                <TextField
                                  variant="outlined"
                                  name={field}
                                  value={form[field] || ""}
                                  onChange={handleChange}
                                  size="small"
                                  fullWidth
                                />
                              </TableCell>
                            ))}
                            <TableCell>
                              <TextField 
                                variant="outlined" 
                                name="weightBaht" 
                                value={form.weightBaht || ""} 
                                onChange={handleChange} 
                                type="number"
                                size="small"
                                fullWidth
                              />
                            </TableCell>
                            <TableCell>
                              <TextField 
                                variant="outlined" 
                                name="weightGram" 
                                value={form.weightGram || ""} 
                                onChange={handleChange} 
                                type="number"
                                size="small"
                                fullWidth
                              />
                            </TableCell>
                            <TableCell>
                              <TextField 
                                variant="outlined" 
                                name="amount" 
                                value={form.amount || ""} 
                                onChange={handleChange} 
                                type="number"
                                size="small"
                                fullWidth
                              />
                            </TableCell>
                            <TableCell>
                              <TextField 
                                variant="outlined" 
                                name="remark" 
                                value={form.remark || ""} 
                                onChange={handleChange}
                                size="small"
                                fullWidth
                              />
                            </TableCell>
                          </>
                        ) : (
                          <>
                            <TableCell>
                              <Box>
                                <Typography variant="body2" fontWeight={600}>
                                  {dayjs.utc(item.date).local().format('DD/MM/YYYY')}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {dayjs.utc(item.date).local().format('HH:mm:ss')}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight={500}>
                                {item.firstname}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight={500}>
                                {item.lastname}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontFamily="monospace">
                                {item.idcard}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Tooltip title={item.address} arrow>
                                <Typography variant="body2" sx={{
                                  maxWidth: 150,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}>
                                  {item.address}
                                </Typography>
                              </Tooltip>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {item.phone}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Chip 
                                label={item.weightBaht?.toFixed(2)}
                                size="small"
                                sx={{ 
                                  backgroundColor: alpha(THEME_COLORS.primary, 0.1),
                                  color: THEME_COLORS.primary,
                                  fontWeight: 600
                                }}
                              />
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" fontWeight={600}>
                                {item.weightGram?.toFixed(2)}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" fontWeight={600} color={THEME_COLORS.success}>
                                {item.amount?.toFixed(2)}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{
                                maxWidth: 150,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                {item.remark || '-'}
                              </Typography>
                            </TableCell>
                          </>
                        )}

                        <TableCell align="center">
                          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                            {editIndex === i ? (
                              <Tooltip title="บันทึก" arrow>
                                <IconButton 
                                  color="success" 
                                  onClick={saveEdit}
                                  sx={{
                                    backgroundColor: alpha(THEME_COLORS.success, 0.1),
                                    '&:hover': {
                                      backgroundColor: alpha(THEME_COLORS.success, 0.2),
                                    }
                                  }}
                                >
                                  <Save />
                                </IconButton>
                              </Tooltip>
                            ) : (
                              <Tooltip title="แก้ไข" arrow>
                                <IconButton 
                                  color="primary" 
                                  onClick={() => startEdit(i)}
                                  sx={{
                                    backgroundColor: alpha(THEME_COLORS.primary, 0.1),
                                    '&:hover': {
                                      backgroundColor: alpha(THEME_COLORS.primary, 0.2),
                                    }
                                  }}
                                >
                                  <Edit />
                                </IconButton>
                              </Tooltip>
                            )}
                            <Tooltip title="ลบ" arrow>
                              <IconButton 
                                color="error" 
                                onClick={() => handleDelete(item.id)}
                                disabled={deleting === item.id}
                                sx={{
                                  backgroundColor: alpha(THEME_COLORS.error, 0.1),
                                  '&:hover': {
                                    backgroundColor: alpha(THEME_COLORS.error, 0.2),
                                  }
                                }}
                              >
                                {deleting === item.id 
                                  ? <CircularProgress size={20} color="error" /> 
                                  : <Delete />
                                }
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                  
                  {/* Totals Row */}
                  <TableRow sx={{ 
                    backgroundColor: alpha(THEME_COLORS.primary, 0.05),
                    '& td': {
                      fontWeight: 700,
                      fontSize: '1rem',
                      py: 2,
                      borderTop: `2px solid ${alpha(THEME_COLORS.primary, 0.2)}`
                    }
                  }}>
                    <TableCell colSpan={6}>
                      <Typography variant="body1" fontWeight={700}>
                        รวมทั้งหมด ({filteredData.length} รายการ)
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body1" fontWeight={700} color={THEME_COLORS.primary}>
                        {totals.totalWeightBaht.toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body1" fontWeight={700} color={THEME_COLORS.primary}>
                        {totals.totalWeightGram.toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body1" fontWeight={700} color={THEME_COLORS.success}>
                        {totals.totalAmount.toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </>
          )}

          {/* Table Pagination */}
          <Box sx={{ 
            borderTop: `1px solid ${alpha(THEME_COLORS.primary, 0.1)}`,
            backgroundColor: alpha(THEME_COLORS.primary, 0.02)
          }}>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25, 50]}
              component="div"
              count={filteredData.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              labelRowsPerPage="จำนวนแถวต่อหน้า:"
              labelDisplayedRows={({ from, to, count }) =>
                `แสดง ${from}-${to} จาก ${count !== -1 ? count : `มากกว่า ${to}`}`
              }
              sx={{
                '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                  fontWeight: 500
                }
              }}
            />
          </Box>
        </Paper>
      
      {/* Summary */}
        <Box sx={{ 
          p: 3, 
          backgroundColor: 'white', 
          borderRadius: 3,
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          border: `1px solid ${alpha(THEME_COLORS.primary, 0.1)}`
        }}>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 2, color: THEME_COLORS.textPrimary }}>
            📊 สรุปสถิติ
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ 
                p: 2, 
                backgroundColor: alpha(THEME_COLORS.primary, 0.05),
                borderRadius: 2,
                borderLeft: `4px solid ${THEME_COLORS.primary}`
              }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  จำนวนรายการทั้งหมด
                </Typography>
                <Typography variant="h5" fontWeight={700}>
                  {data.length}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ 
                p: 2, 
                backgroundColor: alpha(THEME_COLORS.success, 0.05),
                borderRadius: 2,
                borderLeft: `4px solid ${THEME_COLORS.success}`
              }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  รายการที่แสดง
                </Typography>
                <Typography variant="h5" fontWeight={700}>
                  {filteredData.length}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ 
                p: 2, 
                backgroundColor: alpha(THEME_COLORS.info, 0.05),
                borderRadius: 2,
                borderLeft: `4px solid ${THEME_COLORS.info}`
              }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  น้ำหนักเฉลี่ย (บาท)
                </Typography>
                <Typography variant="h5" fontWeight={700}>
                  {filteredData.length > 0 ? (totals.totalWeightBaht / filteredData.length).toFixed(2) : '0.00'}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ 
                p: 2, 
                backgroundColor: alpha(THEME_COLORS.warning, 0.05),
                borderRadius: 2,
                borderLeft: `4px solid ${THEME_COLORS.warning}`
              }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  มูลค่าเฉลี่ย
                </Typography>
                <Typography variant="h5" fontWeight={700}>
                  {filteredData.length > 0 ? (totals.totalAmount / filteredData.length).toFixed(2) : '0.00'}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Box>
        </>  
    )}     {/* ✅ ปิด ternary */}
    <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={handleClose}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
          <Alert severity={snackbar.severity} onClose={handleClose}>
            {snackbar.message}
          </Alert>
    </Snackbar>
    </Box>
  );
}