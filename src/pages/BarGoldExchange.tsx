// path: src/pages/BarGoldExchange.tsx

import React, { useState } from 'react';
import { Box, Button, TextField, Typography, Container, Alert, CircularProgress } from '@mui/material';
import { API_BASE, GOLD_BAHT_TO_GRAM_BAR } from "../config";
// 📌 เปลี่ยน URL API ตาม Backend ของคุณ
const API = `${API_BASE}/bar-gold-exchange`;

export default function BarGoldExchange() {
    const [customerName, setCustomerName] = useState('');
    const [weightBaht, setWeightBaht] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const calculateWeightGram = (baht: string) => {
    const bahtValue = parseFloat(baht);
    return !isNaN(bahtValue) ? (bahtValue * GOLD_BAHT_TO_GRAM_BAR).toFixed(2) : '0.00';
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setMessage('');
        setLoading(true);

        const baht = parseFloat(weightBaht);
        // ตรวจสอบน้ำหนักทองแท่งที่นำมาแลก ต้องเป็น 5 บาทขึ้นไป
        if (isNaN(baht) || baht < 5) { 
            setMessage('Error: กรุณากรอกน้ำหนักตั้งแต่ 5 บาทขึ้นไปเท่านั้น');
            setLoading(false);
            return;
        }

        const exchangeData = {
            customerName,
            weightBaht: baht,
            weightGram: parseFloat(calculateWeightGram(weightBaht)),
        };

        try {
            const response = await fetch(`${API_BASE}/bar-gold-exchange`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(exchangeData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to record exchange transaction');
            }

            setMessage('บันทึกการแลกเปลี่ยนและสั่งพิมพ์ใบเสร็จสำเร็จ!');
            // รีเซ็ตฟอร์ม
            setCustomerName('');
            setWeightBaht('');

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error("Error:", errorMessage);
            setMessage(`Error: เกิดข้อผิดพลาดในการบันทึกข้อมูล: ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    };

    const isButtonDisabled = loading || parseFloat(weightBaht || '0') < 5 || customerName.trim() === '';

    return (
        <Container maxWidth="sm">
            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 4, p: 3, border: '1px solid #0056b3', borderRadius: '8px', bgcolor: '#f0f8ff' }}>
                <Typography variant="h5" gutterBottom color="primary">
                    นำทองแท่งแลกทองรูปพรรณ
                </Typography>
                <Typography variant="subtitle1" gutterBottom color="text.secondary" sx={{ mb: 3 }}>
                    (ธุรกรรมนี้จะลด Stock ทองแท่ง 5 บาทขึ้นไป)
                </Typography>
                
                {message && (
                    <Alert severity={message.includes('Error') ? 'error' : 'success'} sx={{ mb: 2 }}>
                        {message}
                    </Alert>
                )}

                <TextField
                    fullWidth
                    label="ชื่อลูกค้า"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    margin="normal"
                    required
                />

                <TextField
                    fullWidth
                    label="น้ำหนักทองแท่งที่นำมาแลก (บาท)"
                    type="number"
                    inputProps={{ step: "0.01", min: "5" }} // กำหนด min เป็น 5
                    value={weightBaht}
                    onChange={(e) => setWeightBaht(e.target.value)}
                    margin="normal"
                    required
                    helperText="กรุณากรอกน้ำหนักตั้งแต่ 5 บาทขึ้นไปเท่านั้น"
                />
                
                <Typography variant="body1" sx={{ mt: 2, fontWeight: 'bold' }}>
                    น้ำหนัก (กรัม): {calculateWeightGram(weightBaht)} กรัม
                </Typography>

                <Button 
                    type="submit" 
                    variant="contained" 
                    color="primary" 
                    sx={{ mt: 3 }} 
                    disabled={isButtonDisabled}
                    startIcon={loading && <CircularProgress size={20} color="inherit" />}
                >
                    {loading ? 'กำลังบันทึก...' : 'ยืนยันการแลกเปลี่ยนและพิมพ์ใบเสร็จ'}
                </Button>
            </Box>
        </Container>
    );
}