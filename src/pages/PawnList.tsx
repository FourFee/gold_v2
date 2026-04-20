// src/pages/PawnList.tsx

import { useEffect, useState, useCallback } from "react";
import dayjs from "dayjs";
import {
  Box, Paper, Typography, Table, TableHead, TableRow, TableCell, TableBody,
  Button, Chip, IconButton, TextField, TablePagination, CircularProgress,
  ToggleButton, ToggleButtonGroup
} from "@mui/material";
import { Delete, Edit, Save } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../config";
import { useNotify } from "../hooks/useNotify";
import { Snackbar, Alert } from "@mui/material";
import { Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";

export default function PawnList() {
  const [data, setData] = useState<any[]>([]);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [form, setForm] = useState<any>({});
  const navigate = useNavigate();
  const API = `${API_BASE}/pawn`;
  const { snackbar, notify, handleClose } = useNotify();

  const [deleting, setDeleting] = useState<number | null>(null); // เก็บ id ที่กำลังลบ

  // Pagination states
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10); // Default rows per page

  // Wrap fetchData in useCallback to prevent re-creation on every render
  const fetchData = useCallback(() => {
    fetch(`${API}/list?sort_order=desc`)      .then((res) => res.json())
      .then((json) => {
        console.log("📦 pawn list data:", json);
        setData(Array.isArray(json) ? json : []);
        setPage(0); // Reset page to 0 when data changes
      })
      .catch(() => notify("❌ โหลดข้อมูลไม่สำเร็จ", "error"));
  }, [API]); // Dependencies for useCallback

  useEffect(() => {
    fetchData();
  }, [fetchData]); // Dependency for useEffect: fetchData function

  const [search, setSearch] = useState<string>("");
  const [period, setPeriod] = useState("all");

  const periodData = period === "all" ? data : data.filter(item => {
    const start = period === "day"   ? dayjs().startOf("day")
                : period === "week"  ? dayjs().startOf("week")
                : dayjs().startOf("month");
    return !dayjs(item.date).isBefore(start);
  });

  // Filtered data based on search input
  const filteredData = periodData.filter(
    (item) =>
      (item.date ? new Date(item.date).toLocaleDateString("th-TH").replace(/[\s]/g, '-') : '').includes(search.replace(/\s/g, '-')) ||
      item.firstname.toLowerCase().includes(search.toLowerCase()) ||
      item.lastname.toLowerCase().includes(search.toLowerCase()) ||
      item.idcard.includes(search) ||
      item.phone.includes(search)
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
      notify("✅ แก้ไขเรียบร้อย", "success");
      setEditIndex(null); // Exit edit mode
      fetchData(); // Re-fetch data to reflect changes and ensure consistency
    } else {
      notify("❌ แก้ไขไม่สำเร็จ", "error");
    }
  };

  const getStatusChip = (status: string | null) => {
    const stat = status || "DONE";
    return <Chip label={stat} size="small" />;
  };

  // Pagination handlers
  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0); // Reset to first page when rows per page changes
  };

  return (
    <Box maxWidth="xl" mx="auto" mt={4}>
      <Paper elevation={4} sx={{ width: "100%", overflowX: "auto", p: 4, borderRadius: 3 }}>
        <Typography variant="h5" gutterBottom color="primary" fontWeight={600}>
          📄 รายการจำนำทอง
        </Typography>

        <Box mb={2} display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
          <ToggleButtonGroup value={period} exclusive onChange={(_, v) => v && setPeriod(v)} size="small">
            <ToggleButton value="day">วัน</ToggleButton>
            <ToggleButton value="week">สัปดาห์</ToggleButton>
            <ToggleButton value="month">เดือน</ToggleButton>
            <ToggleButton value="all">ทั้งหมด</ToggleButton>
          </ToggleButtonGroup>
          <TextField
            variant="outlined"
            placeholder="ค้นหา วันที่, ชื่อ, เลขบัตร, เบอร์โทรศัพท์..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ width: 300 }}
          />
          <Button variant="contained" color="primary" onClick={() => navigate("/pawn")}>
            ➕ เพิ่มรายการจำนำ
          </Button>
        </Box>

        <Table sx={{ minWidth: 1600 }}>
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
              <TableCell>เบอร์</TableCell>
              <TableCell>น้ำหนัก</TableCell>
              <TableCell>จำนวนเงิน</TableCell>
              <TableCell>หมายเหตุ</TableCell>
              <TableCell>สถานะ</TableCell>
              <TableCell>จัดการ</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {displayedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} align="center">
                  ไม่พบข้อมูล
                </TableCell>
              </TableRow>
            ) : (
              displayedData.map((row, i) => (
                <TableRow key={row.id}>
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
                      row.date ? new Date(row.date).toLocaleDateString("th-TH") : '-'
                    )}
                  </TableCell>

                  {editIndex === i ? (
                    <>
                      <TableCell><TextField variant="standard" name="firstname" value={form.firstname || ""} onChange={handleChange} /></TableCell>
                      <TableCell><TextField variant="standard" name="lastname" value={form.lastname || ""} onChange={handleChange} /></TableCell>
                      <TableCell><TextField variant="standard" name="idcard" value={form.idcard || ""} onChange={handleChange} /></TableCell>
                      <TableCell><TextField variant="standard" name="address" value={form.address || ""} onChange={handleChange} /></TableCell>
                      <TableCell><TextField variant="standard" name="phone" value={form.phone || ""} onChange={handleChange} /></TableCell>
                      <TableCell><TextField variant="standard" name="weight" value={form.weight || ""} onChange={handleChange} type="number" /></TableCell>
                      <TableCell><TextField variant="standard" name="amount" value={form.amount || ""} onChange={handleChange} type="number" /></TableCell>
                      <TableCell><TextField variant="standard" name="remark" value={form.remark || ""} onChange={handleChange} /></TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell>{row.firstname}</TableCell>
                      <TableCell>{row.lastname}</TableCell>
                      <TableCell>{row.idcard}</TableCell>
                      <TableCell>{row.address}</TableCell>
                      <TableCell>{row.phone}</TableCell>
                      <TableCell>{row.weight}</TableCell>
                      <TableCell>{row.amount}</TableCell>
                      <TableCell>{row.remark}</TableCell>
                    </>
                  )}

                  <TableCell>{getStatusChip(row.status)}</TableCell>
                  <TableCell>
                    {editIndex === i ? (
                      <IconButton color="success" onClick={saveEdit}><Save /></IconButton>
                    ) : (
                      <IconButton color="primary" onClick={() => startEdit(i)}><Edit /></IconButton>
                    )}
                    <IconButton 
                      color="error" 
                      onClick={() => handleDelete(row.id)}
                      disabled={deleting === row.id}
                    >
                      {deleting === row.id ? <CircularProgress size={20} color="error" /> : <Delete />}
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