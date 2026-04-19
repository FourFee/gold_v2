// src/pages/OrnamentGoldList.tsx

import { useEffect, useState, useCallback } from "react";
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
  IconButton,
  TextField,
  TablePagination,
  CircularProgress  // Import TablePagination
} from "@mui/material";
import { Delete, Edit, Save } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../config";
import { useNotify } from "../hooks/useNotify";
import { Snackbar, Alert } from "@mui/material";
import { Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";


export default function OrnamentGoldList() {
  const [data, setData] = useState<any[]>([]);
  const [mode, setMode] = useState<"buy" | "sell">("sell");
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [form, setForm] = useState<any>({});
  const navigate = useNavigate();
  const API = `${API_BASE}/ornament-gold`;

  const [deleting, setDeleting] = useState<number | null>(null); // เก็บ id ที่กำลังลบ

  // Pagination states
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10); // Default rows per page

  const { snackbar, notify, handleClose } = useNotify();
  // Wrap fetchData in useCallback to prevent re-creation on every render
  const fetchData = useCallback(() => {
    // แก้ไขตรงนี้: เพิ่ม ?sort_order=desc เพื่อเรียงลำดับจากล่าสุด
    fetch(`${API}/list?sort_order=desc`)
      .then((res) => res.json())
      .then((json) => {
        console.log("📦 ornament gold list data:", json);
        setData(Array.isArray(json) ? json : []);
        setPage(0); // Reset page to 0 when data changes
      })
      .catch(() => notify("❌ โหลดข้อมูลไม่สำเร็จ", "error"));
  }, [API]); // Dependencies for useCallback

  useEffect(() => {
    fetchData();
  }, [fetchData]); // Dependency for useEffect: fetchData function

  const [search, setSearch] = useState<string>("");

  const filteredData = data.filter(
    (item) =>
      item.mode === mode &&
      (
        (item.date ? new Date(item.date).toLocaleDateString("th-TH").replace(/[\s]/g, '-') : '').includes(search.replace(/\s/g, '-')) ||
        item.firstname.toLowerCase().includes(search.toLowerCase()) ||
        item.lastname.toLowerCase().includes(search.toLowerCase()) ||
        item.idcard.includes(search) ||
        item.phone.includes(search)
      )
  );

  // Calculate displayed data for the current page
  const displayedData = filteredData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  const handleDelete = (id: number) => {
  setPendingDeleteId(id);
  setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;
    setDeleting(pendingDeleteId);
    setConfirmOpen(false);
    try {
      await fetch(`${API}/delete/${pendingDeleteId}`, { method: "DELETE" });
      await fetchData();
    } finally {
      setDeleting(null);
      setPendingDeleteId(null);
    }
  };

  const startEdit = (index: number) => {
    setEditIndex(index);
    // Calculate the actual index in the filteredData array based on current page
    const actualFilteredIndex = page * rowsPerPage + index;
    const itemToEdit = filteredData[actualFilteredIndex];
    setForm({
      ...itemToEdit,
      date: itemToEdit.date ? new Date(itemToEdit.date).toISOString().split('T')[0] : ''
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleModeChange = (_: any, newMode: "buy" | "sell") => {
    if (newMode !== null) setMode(newMode);
  };

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0); // Reset to first page when rows per page changes
  };

  const saveEdit = async () => {
    if (editIndex === null) return;
    // Calculate the actual index in the filteredData array to get the correct ID
    const actualFilteredIndex = page * rowsPerPage + editIndex;
    const id = filteredData[actualFilteredIndex].id;

    const res = await fetch(`${API}/update/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      notify("✅ บันทึกเรียบร้อย", "success");
      setEditIndex(null); // Exit edit mode
      fetchData(); // Re-fetch data to reflect changes and ensure consistency
    } else {
      notify("❌ ไม่สามารถบันทึกได้", "error");
    }
  };

  return (
    <Box maxWidth="xl" mx="auto" mt={4}>
      <Paper elevation={4} sx={{ width: "100%", overflowX: "auto", p: 4, borderRadius: 3 }}>
        <Typography variant="h5" gutterBottom color="primary" fontWeight={600}>
          💍 รายการทองรูปพรรณ ({mode === "buy" ? "ขายออก" : "ซื้อเข้า"})
        </Typography>

        <Box display="flex" justifyContent="space-between" mb={2}>
          <ToggleButtonGroup
            value={mode}
            exclusive
            onChange={handleModeChange}
            color="primary"
          >
            <ToggleButton value="buy">🛒 ขายออก</ToggleButton>
            <ToggleButton value="sell">💰 ซื้อเข้า</ToggleButton>
          </ToggleButtonGroup>

          <TextField
            variant="outlined"
            placeholder="ค้นหา วันที่, ชื่อ, เลขบัตร, เบอร์โทรศัพท์..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ width: 300 }}
          />
        </Box>

        <Table sx={{ minWidth: 1200 }}>
          <TableHead sx={(theme) => ({
            bgcolor: theme.palette.mode === "dark" ? "#2c2c2c" : "#f0f0f0",
            "& th": {
              color: theme.palette.mode === "dark" ? "#fff" : "#000",
              fontWeight: "bold",
            },
          })}>
            <TableRow>
              <TableCell>วันที่</TableCell>
              <TableCell>ชื่อ</TableCell>
              <TableCell>นามสกุล</TableCell>
              <TableCell>เลขบัตร</TableCell>
              <TableCell>ที่อยู่</TableCell>
              <TableCell>เบอร์โทรศัพท์</TableCell>
              <TableCell>น้ำหนัก (กรัม)</TableCell>
              <TableCell>จำนวนเงิน</TableCell>
              <TableCell>หมายเหตุ</TableCell>
              <TableCell>จัดการ</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {displayedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} align="center">
                  ไม่พบข้อมูล
                </TableCell>
              </TableRow>
            ) : (
              displayedData.map((item, i) => (
                <TableRow key={item.id}>
                  <TableCell>
                    {editIndex === i ? (
                      <TextField
                        name="date"
                        type="date"
                        value={form.date || ''}
                        onChange={handleChange}
                        fullWidth
                      />
                    ) : (
                      item.date ? new Date(item.date).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" }) : '-'
                    )}
                  </TableCell>

                  {editIndex === i ? (
                    <>
                      <TableCell><TextField variant="standard" name="firstname" value={form.firstname || ''} onChange={handleChange} /></TableCell>
                      <TableCell><TextField variant="standard" name="lastname" value={form.lastname || ''} onChange={handleChange} /></TableCell>
                      <TableCell><TextField variant="standard" name="idcard" value={form.idcard || ''} onChange={handleChange} /></TableCell>
                      <TableCell><TextField variant="standard" name="address" value={form.address || ''} onChange={handleChange} /></TableCell>
                      <TableCell><TextField variant="standard" name="phone" value={form.phone || ''} onChange={handleChange} /></TableCell>
                      <TableCell><TextField variant="standard" name="weight" value={form.weight || ''} onChange={handleChange} type="number" /></TableCell>
                      <TableCell><TextField variant="standard" name="amount" value={form.amount || ''} onChange={handleChange} type="number" /></TableCell>
                      <TableCell><TextField variant="standard" name="remark" value={form.remark || ''} onChange={handleChange} /></TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell>{item.firstname}</TableCell>
                      <TableCell>{item.lastname}</TableCell>
                      <TableCell>{item.idcard}</TableCell>
                      <TableCell>{item.address}</TableCell>
                      <TableCell>{item.phone}</TableCell>
                      <TableCell>{item.weight}</TableCell>
                      <TableCell>{item.amount}</TableCell>
                      <TableCell>{item.remark}</TableCell>
                    </>
                  )}

                  <TableCell>
                    {editIndex === i ? (
                      <IconButton color="success" onClick={saveEdit}><Save /></IconButton>
                    ) : (
                      <IconButton color="primary" onClick={() => startEdit(i)}><Edit /></IconButton>
                    )}
                    <IconButton 
                      color="error" 
                      onClick={() => handleDelete(item.id)}
                      disabled={deleting === item.id}
                    >
                      {deleting === item.id ? <CircularProgress size={20} color="error" /> : <Delete />}
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Table Pagination */}
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredData.length} // Total number of rows after filtering
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="จำนวนแถวต่อหน้า:"
          labelDisplayedRows={({ from, to, count }) =>
            `แสดง ${from}-${to} จาก ${count !== -1 ? count : `มากกว่า ${to}`}`
          }
        />

        <Box mt={4} textAlign="right">
          <Button variant="outlined" color="info" onClick={() => navigate("/")}>
            ⬅️ กลับหน้าแรก
          </Button>
        </Box>
      </Paper>
      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={handleClose}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
          <Alert severity={snackbar.severity} onClose={handleClose}>
            {snackbar.message}
          </Alert>
      </Snackbar>
      <Dialog open={confirmOpen}>
        <DialogTitle>ยืนยันการลบ</DialogTitle>
        <DialogContent>คุณต้องการลบรายการนี้หรือไม่?</DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>ยกเลิก</Button>
          <Button color="error" onClick={confirmDelete}>ลบ</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}