// path: src/pages/BarGoldExchangeHistory.tsx

import React, { useState, useEffect } from 'react';
import { 
    Container, Typography, Table, TableBody, TableCell, TableContainer, 
    TableHead, TableRow, Paper, Alert, CircularProgress, 
    IconButton, TextField,Box 
} from '@mui/material';
import { Edit, Save, Delete } from '@mui/icons-material';
import { API_BASE } from "../config";
import dayjs from 'dayjs';
import { useNotify } from "../hooks/useNotify";
import { Snackbar, Alert as MuiAlert } from "@mui/material";


// 🚨 แก้ไข URL API ให้ถูกต้องตามที่เราเคยสรุปไว้
// ✅ แทนด้วยบรรทัดนี้แทน (ใช้ API_BASE จาก config แล้ว)
const API_ENDPOINT = `${API_BASE}/bar-gold-exchange`;

interface ExchangeData {
    id: number;
    date: string;
    firstname: string; // 👈 เพิ่ม firstname
    lastname: string;  // 👈 เพิ่ม lastname
    weightBaht: number;
    weightGram: number;
}

export default function BarGoldExchangeHistory() {
    const [deleting, setDeleting] = useState<number | null>(null); // เก็บ id ที่กำลังลบ

    const [history, setHistory] = useState<ExchangeData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // 🌟 State สำหรับการแก้ไข
    const [editId, setEditId] = useState<number | null>(null); // ID ของรายการที่กำลังแก้ไข
    const [form, setForm] = useState<ExchangeData | Partial<ExchangeData>>({}); // Data ที่กำลังแก้ไข

    const { snackbar, notify, handleClose } = useNotify();

    // 📌 Function to fetch data from the backend
    const fetchHistory = async () => {
        setLoading(true);
        setError(null);
        try {
            // 🚨 ใช้ /history สำหรับดึงรายการทั้งหมด
            const response = await fetch(`${API_ENDPOINT}-history`);
            if (!response.ok) {
                throw new Error('Failed to fetch exchange history');
            }
            const data: ExchangeData[] = await response.json();
            setHistory(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unknown error occurred");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, []);

    // 📌 Start editing
    const startEdit = (row: ExchangeData) => {
        setEditId(row.id);
        // Copy data to form, format date for date input
        setForm({ 
            ...row,
            date: row.date ? row.date.split('T')[0] : '' 
        }); 
    };

    // 📌 Handle form changes
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        
        const isNumeric = name === "weightBaht" || name === "weightGram";
        const newValue = isNumeric ? (value === "" ? "" : parseFloat(value)) : value;
        
        setForm(prevForm => ({
            ...prevForm,
            [name]: newValue,
        }));
    };

    // 📌 Save edited row
    const saveEdit = async () => {
        if (!editId) return;

        // เตรียมข้อมูลสำหรับส่ง, ต้องแปลงวันที่กลับไปเป็น ISO string (ถ้ามีการแก้ไขวันที่)
        const itemToUpdate = {
            ...form,
            date: form.date ? dayjs(form.date as string).toISOString() : 
            history.find(h => h.id === editId)?.date || new Date().toISOString(),
            weightBaht: form.weightBaht || 0,
            weightGram: form.weightGram || 0,
        };

        try {
            const response = await fetch(`${API_ENDPOINT}/update/${editId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(itemToUpdate),
            });

            if (response.ok) {
                notify("บันทึกข้อมูลสำเร็จ", "success"); // ✅ แทน alert("✅ บันทึกข้อมูลสำเร็จ!")
                fetchHistory(); // ดึงข้อมูลใหม่
                setEditId(null); // ออกจากโหมดแก้ไข
                setForm({});
            } else {
                const errorData = await response.json();
                throw new Error(errorData.detail || "Failed to update data");
            }
        } catch (err) {
            console.error("Error updating data:", err);
            notify("ไม่สามารถอัปเดตข้อมูลได้", "error"); // ✅ แทน alert(`❌ เกิดข้อผิดพลาดในการอัปเดตข้อมูล: ${(err as Error).message}`)          
        }
    };

    // 📌 Delete a row
    const handleDelete = async (id: number) => {
        if (!window.confirm("คุณต้องการลบรายการแลกเปลี่ยนทองแท่งนี้หรือไม่?")) return;
        setDeleting(id);
        try {
            await fetch(`${API_ENDPOINT}/delete/${id}`, { method: "DELETE" }); // ✅ ใช้ API_ENDPOINT
            await fetchHistory(); // ✅ ใช้ fetchHistory
        } finally {
            setDeleting(null);
        }
    };

    return (
        <Container maxWidth="lg" sx={{ mt: 4 }}>
            {loading ? (
                <CircularProgress />
            ) : error ? (
                <Alert severity="error">Error loading data: {error}</Alert>
            ) : history.length === 0 ? (
                <Alert severity="info">ไม่พบรายการแลกเปลี่ยนทองแท่ง</Alert>
            ) : (
                <>
                <Typography variant="h4" gutterBottom>
                    รายการแลกเปลี่ยนทองแท่งเป็นรูปพรรณ
                </Typography>
                <TableContainer component={Paper}>
                    <Table sx={{ minWidth: 700 }} aria-label="exchange history table">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold' }}>รหัส</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', width: 150 }}>วันที่/เวลา</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>ชื่อลูกค้า</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 'bold' }}>น้ำหนัก (บาท)</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 'bold' }}>น้ำหนัก (กรัม)</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', width: 120 }}>จัดการ</TableCell> {/* เพิ่มคอลัมน์จัดการ */}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {history.map((row) => {
                                const isEditing = editId === row.id;
                                const dateObj = new Date(row.date);
                                const formattedDate = dateObj.toLocaleDateString('th-TH', { 
                                    year: 'numeric', 
                                    month: '2-digit', 
                                    day: '2-digit' 
                                });
                                const formattedTime = dateObj.toLocaleTimeString('th-TH', { 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                });

                                return (
                                    <TableRow key={row.id} hover>
                                        {/* 1. รหัส */}
                                        <TableCell>{row.id}</TableCell> 
                                        
                                        {/* 2. วันที่/เวลา */}
                                        <TableCell>
                                            {isEditing ? (
                                                <TextField
                                                    name="date"
                                                    type="datetime-local" // 👈 เปลี่ยนเป็น datetime-local
                                                    // 🚨 ต้อง Format ค่าให้เป็นรูปแบบ 'YYYY-MM-DDTHH:mm' ก่อนใส่ใน input
                                                    value={form.date ? new Date(form.date).toISOString().slice(0, 16) : ''} 
                                                    onChange={handleChange}
                                                    size="small"
                                                    InputLabelProps={{ shrink: true }}
                                                    sx={{ width: 160 }} // ปรับความกว้างเพื่อให้แสดงผลได้ครบ
                                                />
                                            ) : (
                                                `${formattedDate} ${formattedTime}`
                                            )}
                                        </TableCell>
                                        {/* 3. ชื่อลูกค้า */}
                                        <TableCell>
                                            {isEditing ? (
                                                // ✅ แยกเป็น 2 fields ให้ตรงกับ state firstname/lastname
                                                <Box sx={{ display: 'flex', gap: 1 }}>
                                                    <TextField
                                                        name="firstname"
                                                        label="ชื่อ"
                                                        value={form.firstname || ""}
                                                        onChange={handleChange}
                                                        size="small"
                                                        sx={{ width: 100 }}
                                                    />
                                                    <TextField
                                                        name="lastname"
                                                        label="นามสกุล"
                                                        value={form.lastname || ""}
                                                        onChange={handleChange}
                                                        size="small"
                                                        sx={{ width: 100 }}
                                                    />
                                                </Box>
                                            ) : (
                                                <Typography>{`${row.firstname} ${row.lastname}`.trim()}</Typography>
                                            )}
                                        </TableCell>
                                        
                                        {/* 4. น้ำหนัก (บาท) */}
                                        <TableCell align="right">
                                            {isEditing ? (
                                                <TextField
                                                    name="weightBaht"
                                                    type="number"
                                                    value={form.weightBaht}
                                                    onChange={handleChange}
                                                    size="small"
                                                    sx={{ width: 100 }}
                                                />
                                            ) : (
                                                <Typography color="error" fontWeight="bold">
                                                    -{row.weightBaht.toFixed(2)}
                                                </Typography>
                                            )}
                                        </TableCell> 
                                        
                                        {/* 5. น้ำหนัก (กรัม) */}
                                        <TableCell align="right">
                                            {isEditing ? (
                                                <TextField
                                                    name="weightGram"
                                                    type="number"
                                                    value={form.weightGram}
                                                    onChange={handleChange}
                                                    size="small"
                                                    sx={{ width: 100 }}
                                                />
                                            ) : (
                                                <Typography>
                                                    -{row.weightGram.toFixed(2)}
                                                </Typography>
                                            )}
                                        </TableCell>
                                        
                                        {/* 6. ปุ่มจัดการ (Action Buttons) */}
                                        <TableCell>
                                            {isEditing ? (
                                                <IconButton color="success" onClick={saveEdit} size="small"><Save /></IconButton>
                                            ) : (
                                                <IconButton color="primary" onClick={() => startEdit(row)} size="small"><Edit /></IconButton>
                                            )}
                                            <IconButton 
                                                color="error" 
                                                onClick={() => handleDelete(row.id)} 
                                                size="small"
                                                disabled={deleting === row.id}
                                            >
                                                {deleting === row.id 
                                                    ? <CircularProgress size={20} color="error" /> 
                                                    : <Delete />
                                                }
                                            </IconButton>
                                        </TableCell>

                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
                </>
            )}
            <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={handleClose}
                    anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
                    <Alert severity={snackbar.severity} onClose={handleClose}>
                      {snackbar.message}
                    </Alert>
            </Snackbar>
        </Container>
    );
}