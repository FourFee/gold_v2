// path: gold/src/pages/AllGoldTransactionsList.tsx

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
  TextField,
  IconButton,
  TablePagination, // 🌟 Import TablePagination
  CircularProgress // 🌟 Import CircularProgress
} from "@mui/material";
import { Edit, Save, Delete } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../config";
// ต้องเพิ่มที่บนสุด
import { useNotify } from "../hooks/useNotify";
import { Snackbar, Alert } from "@mui/material";


export default function AllGoldTransactionsList() {
  const [data, setData] = useState<any[]>([]);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [form, setForm] = useState<any>({}); // State to hold data being edited
  const navigate = useNavigate();

  // 📌 API Endpoint for All Gold Transactions
  const API = `${API_BASE}/all-gold-transactions`;

  const [deleting, setDeleting] = useState<number | null>(null); // เก็บ id ที่กำลังลบ

  // 🌟🌟🌟 เพิ่ม State สำหรับ Pagination 🌟🌟🌟
  const [page, setPage] = useState(0); // เลขหน้าปัจจุบัน (เริ่มต้นที่ 0)
  const [rowsPerPage, setRowsPerPage] = useState(10); // จำนวนรายการต่อหน้า (ค่าเริ่มต้น 10)

  const { snackbar, notify, handleClose } = useNotify();
  
  // 📌 Function to fetch data from the backend
  const fetchData = useCallback(() => {
  fetch(`${API}/list?sort_order=desc`)
    .then((res) => res.json())
    .then((json) => {
      console.log("📦 All gold transactions list data:", json);
      setData(Array.isArray(json) ? json : []);
    })
    .catch((err) => {
      console.error("❌ Failed to load data:", err);
      notify("ไม่สามารถโหลดรายละเอียดรายการได้", "error");
    });
}, [API]);

useEffect(() => {
  fetchData();
}, [fetchData]);
  // 1. เพิ่ม state
  const [search, setSearch] = useState<string>("");

  // 2. เพิ่ม filteredData (แทรกก่อน displayedData)
  const filteredData = data.filter((item) =>
    (item.date ? new Date(item.date).toLocaleDateString("th-TH") : "").includes(search) ||
    String(item.redeem || "").includes(search) ||
    String(item.buyIn || "").includes(search) ||
    String(item.sellOut || "").includes(search)
  );

  // 3. เปลี่ยน displayedData ให้ slice จาก filteredData แทน data
  const displayedData = filteredData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  // 🌟🌟🌟 Handler สำหรับเปลี่ยนหน้า 🌟🌟🌟
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  // 🌟🌟🌟 Handler สำหรับเปลี่ยนจำนวนรายการต่อหน้า 🌟🌟🌟
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0); // กลับไปหน้าแรกเมื่อเปลี่ยนจำนวนรายการต่อหน้า
  };

  // 📌 Start editing a row
  const startEdit = (index: number) => {
    setEditIndex(index);
    setForm({ ...displayedData[index] });
  };

  // 📌 Handle changes in the editable text fields
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // For numeric fields, ensure value is a number or empty string
    const newValue = (name === "redeem" || name === "interest" || name === "pawn" ||
                      name === "buyIn" || name === "exchange" || name === "sellOut"||
                      name === "expenses" || name === "diamondBuyIn" || name === "diamondSellOut" 
                      || name === "platedGold") // 🌟 เพิ่มช่องเก็บ ทองชุบ
                      ? (value === "" ? "" : parseFloat(value))
                      : value;
    setForm((prevForm: any) => ({
      ...prevForm,
      [name]: newValue,
    }));
  };

  // 📌 Save edited row
  const saveEdit = async () => {
    if (editIndex === null) return; // Should not happen if startEdit was called

    const itemToUpdate = form;
    try {
      const response = await fetch(`${API}/update/${itemToUpdate.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(itemToUpdate),
      });

      if (response.ok) {
        notify("✅ อัปเดตข้อมูลสำเร็จ!", "success");
        fetchData(); // Re-fetch data to show the updated list
        setEditIndex(null); // Exit edit mode
        setForm({}); // Clear form state
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to update data");
      }
    } catch (err) {
      console.error("Error updating data:", err);
      notify("ไม่สามารถโหลดรายละเอียดรายการได้", "error");
    }
  };

  // 📌 Delete a row
  const handleDelete = async (id: number) => {
    if (!window.confirm("คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้?")) return;
    setDeleting(id);
    try {
      await fetch(`${API}/delete/${id}`, { method: "DELETE" });
      await fetchData();
    } finally {
      setDeleting(null);
    }
  };

  // ✅ ส่วนการคำนวณผลรวมทั้งหมด
  const totals = data.reduce(
    (acc, item) => {
      acc.redeem += parseFloat(item.redeem || "0");
      acc.interest += parseFloat(item.interest || "0");
      acc.pawn += parseFloat(item.pawn || "0");
      acc.buyIn += parseFloat(item.buyIn || "0");
      acc.exchange += parseFloat(item.exchange || "0");
      acc.sellOut += parseFloat(item.sellOut || "0");
      acc.expenses += parseFloat(item.expenses || "0");
      acc.diamondBuyIn += parseFloat(item.diamondBuyIn || "0");
      acc.diamondSellOut += parseFloat(item.diamondSellOut || "0");
      acc.platedGold += parseFloat(item.platedGold || "0"); // 🌟 รวมทองชุบ
      return acc;
    },
    { redeem: 0, interest: 0, pawn: 0, buyIn: 0, exchange: 0, sellOut: 0, expenses: 0, diamondBuyIn: 0, diamondSellOut: 0 , platedGold: 0 } // 🌟 รวมทองชุบ
  ); 

  return (
    <Box maxWidth="xl" mx="auto" mt={4}>
      <Paper elevation={4} sx={{ p: 4, borderRadius: 3 }}>
        <Typography variant="h5" gutterBottom color="primary" fontWeight={600} mb={3}>
          📊 รายการธุรกรรมทองทั้งหมด
        </Typography>
        <Box mb={2} display="flex" justifyContent="space-between">
          <TextField
            variant="outlined"
            placeholder="ค้นหา วันที่, ยอดไถ่, ซื้อเข้า, ขายออก..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ width: 300 }}
          />
          <Button variant="contained" color="primary" 
            onClick={() => navigate("/all-transactions-create")}>
            ➕ เพิ่มรายการ
          </Button>
        </Box>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ "& > th": { fontWeight: "bold", fontSize: "0.95rem" } }}>
              <TableCell>วันที่</TableCell>
              <TableCell>ไถ่ (บาท)</TableCell>
              <TableCell>ดอก (บาท)</TableCell>
              <TableCell>จำนำ (บาท)</TableCell>
              <TableCell>ค่าใช้จ่าย (บาท)</TableCell>
              <TableCell>ซื้อเข้า (กรัม)</TableCell>
              <TableCell>เปลี่ยน (กรัม)</TableCell>
              <TableCell>ผลรวม ซื้อเข้า + เปลี่ยน (กรัม)</TableCell>
              <TableCell>ขายออก (กรัม)</TableCell>
              <TableCell>ซื้อเข้าเพชร (บาท)</TableCell>
              <TableCell>ขายออกเพชร (บาท)</TableCell>
              <TableCell>ทองชุบ (กรัม)</TableCell> {/* 🌟 เพิ่มคอลัมน์ ทองชุบ */}
              <TableCell>จัดการ</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {/* 🌟🌟🌟 เปลี่ยนมาใช้ displayedData 🌟🌟🌟 */}
            {displayedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={13} align="center">
                  ไม่มีข้อมูลธุรกรรมทอง
                </TableCell>
              </TableRow>
            ) : (
              displayedData.map((item, i) => (
                <TableRow key={item.id}>
                  {/* Date field */}
                  <TableCell>
                    {editIndex === i ? (
                      <TextField
                        name="date"
                        type="date"
                        value={form.date ? form.date.split('T')[0] : ''} // Format date for input type="date"
                        onChange={handleChange}
                        size="small"
                        InputLabelProps={{ shrink: true }}
                      />
                    ) : (
                      // Display date in DD/MM/YYYY format
                      item.date ? new Date(item.date).toLocaleDateString('th-TH') : ''
                    )}
                  </TableCell>

                  {/* Redeem field */}
                  <TableCell>
                    {editIndex === i ? (
                      <TextField
                        name="redeem"
                        type="number"
                        value={form.redeem}
                        onChange={handleChange}
                        size="small"
                        sx={{ width: 100 }}
                      />
                    ) : (
                      item.redeem
                    )}
                  </TableCell>

                  {/* Interest field */}
                  <TableCell>
                    {editIndex === i ? (
                      <TextField
                        name="interest"
                        type="number"
                        value={form.interest}
                        onChange={handleChange}
                        size="small"
                        sx={{ width: 100 }}
                      />
                    ) : (
                      item.interest
                    )}
                  </TableCell>

                  {/* Pawn field */}
                  <TableCell>
                    {editIndex === i ? (
                      <TextField
                        name="pawn"
                        type="number"
                        value={form.pawn}
                        onChange={handleChange}
                        size="small"
                        sx={{ width: 100 }}
                      />
                    ) : (
                      item.pawn
                    )}
                  </TableCell>

                  {/* ✅ Expenses field */}
                  <TableCell>
                    {editIndex === i ? (
                      <TextField
                        name="expenses"
                        type="number"
                        value={form.expenses}
                        onChange={handleChange}
                        size="small"
                        sx={{ width: 100 }}
                      />
                    ) : (
                      item.expenses?.toFixed(2)
                    )}
                  </TableCell>

                  {/* Buy In field */}
                  <TableCell>
                    {editIndex === i ? (
                      <TextField
                        name="buyIn"
                        type="number"
                        value={form.buyIn}
                        onChange={handleChange}
                        size="small"
                        sx={{ width: 100 }}
                      />
                    ) : (
                      item.buyIn
                    )}
                  </TableCell>

                  {/* Exchange field */}
                  <TableCell>
                    {editIndex === i ? (
                      <TextField
                        name="exchange"
                        type="number"
                        value={form.exchange}
                        onChange={handleChange}
                        size="small"
                        sx={{ width: 100 }}
                      />
                    ) : (
                      item.exchange
                    )}
                  </TableCell>

                  {/* ✅ total_buy_in_exchange field (อ่านอย่างเดียว) */}
                  <TableCell>
                    {(item.buyIn + item.exchange || 0).toFixed(2)}
                  </TableCell>

                  {/* Sell Out field */}
                  <TableCell>
                    {editIndex === i ? (
                      <TextField
                        name="sellOut"
                        type="number"
                        value={form.sellOut}
                        onChange={handleChange}
                        size="small"
                        sx={{ width: 100 }}
                      />
                    ) : (
                      item.sellOut
                    )}
                  </TableCell>

                  {/* ✅ New TableCell for Diamond Buy-In */}
                  <TableCell>
                    {editIndex === i ? (
                      <TextField
                        name="diamondBuyIn"
                        type="number"
                        value={form.diamondBuyIn}
                        onChange={handleChange}
                        size="small"
                        sx={{ width: 100 }}
                      />
                    ) : (
                      (item.diamondBuyIn || 0).toFixed(2) // Display with 2 decimal places
                    )}
                  </TableCell>

                  {/* ✅ New TableCell for Diamond Sell-Out */}
                  <TableCell>
                    {editIndex === i ? (
                      <TextField
                        name="diamondSellOut"
                        type="number"
                        value={form.diamondSellOut}
                        onChange={handleChange}
                        size="small"
                        sx={{ width: 100 }}
                      />
                    ) : (
                      (item.diamondSellOut || 0).toFixed(2) // Display with 2 decimal places
                    )}
                  </TableCell>

                  <TableCell>
                    {editIndex === i ? (
                      <TextField
                        name="platedGold"
                        type="number"
                        value={form.platedGold}
                        onChange={handleChange}
                        size="small"
                        sx={{ width: 100 }}
                      />
                    ) : (
                      (item.platedGold || 0).toFixed(2) // Display with 2 decimal places
                    )}
                  </TableCell>

                  {/* Action Buttons */}
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
            {/* ✅ ส่วนแสดงผลรวมทั้งหมดที่ท้ายตาราง */}
            <TableRow sx={{ "& > th": { fontWeight: "bold", fontSize: "1rem" } }}>
                <TableCell>รวม</TableCell>
                <TableCell>{totals.redeem.toFixed(2)}</TableCell>
                <TableCell>{totals.interest.toFixed(2)}</TableCell>
                <TableCell>{totals.pawn.toFixed(2)}</TableCell>
                <TableCell>{totals.expenses.toFixed(2)}</TableCell>
                <TableCell>{totals.buyIn.toFixed(2)}</TableCell>
                <TableCell>{totals.exchange.toFixed(2)}</TableCell>
                <TableCell>{(totals.buyIn + totals.exchange).toFixed(2)}</TableCell> {/* Total BuyIn + Exchange */}
                <TableCell>{totals.sellOut.toFixed(2)}</TableCell>
                <TableCell>{totals.diamondBuyIn.toFixed(2)}</TableCell> {/* แสดงผลรวม diamondBuyIn */}
                <TableCell>{totals.diamondSellOut.toFixed(2)}</TableCell> {/* แสดงผลรวม diamondSellOut */}
                <TableCell>{totals.platedGold.toFixed(2)}</TableCell> {/* 🌟 แสดงผลรวมทองชุบ */}
                <TableCell></TableCell> {/* ช่องว่างสำหรับคอลัมน์จัดการ */}
            </TableRow>
            </TableBody>
          </Table>

        {/* 🌟🌟🌟 เพิ่ม TablePagination Component 🌟🌟🌟 */}
        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]} // ตัวเลือกจำนวนรายการต่อหน้า
          component="div"
          count={filteredData.length} // เดิมเป็น data.length
          rowsPerPage={rowsPerPage} // จำนวนรายการต่อหน้าปัจจุบัน
          page={page} // หน้าปัจจุบัน
          onPageChange={handleChangePage} // Handler เมื่อเปลี่ยนหน้า
          onRowsPerPageChange={handleChangeRowsPerPage} // Handler เมื่อเปลี่ยนจำนวนรายการต่อหน้า
          labelRowsPerPage="รายการต่อหน้า:" // ข้อความกำกับ
          labelDisplayedRows={({ from, to, count }) =>
            `แสดง ${from}-${to} จาก ${count !== -1 ? count : `มากกว่า ${to}`}`
          } // รูปแบบข้อความแสดงหน้า
          

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
    </Box>
  );
}