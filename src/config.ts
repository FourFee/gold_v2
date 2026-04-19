// src/config.ts
export const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8000";

// 1 บาทน้ำหนัก = กี่กรัม (แยกตามประเภท)
export const GOLD_BAHT_TO_GRAM_BAR = 15.244;     // ทองแท่ง
export const GOLD_BAHT_TO_GRAM_ORNAMENT = 15.2;  // ทองรูปพรรณ