# path: gold/backend/routers/bar_gold_exchange_report.py

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import BarGold
from typing import List, Optional
from pydantic import BaseModel
from sqlalchemy import desc # ใช้สำหรับเรียงลำดับ
from datetime import datetime

router = APIRouter()

# 📌 Pydantic Schema สำหรับข้อมูลที่ส่งกลับ
# (ควรใช้ Schema เดียวกับ Bar Gold Transaction ทั่วไป แต่กรองแค่ mode exchange)
class BarGoldExchangeRecord(BaseModel):
    id: int
    date: datetime
    customerName: str
    weightBaht: float
    weightGram: float
    # mode ไม่จำเป็นต้องแสดง แต่ถ้ามีไว้ก็ดี
    
    class Config:
        orm_mode = True

@router.get("/bar-gold-exchange/history", response_model=List[BarGoldExchangeRecord])
def get_exchange_history(db: Session = Depends(get_db)):
    """ดึงรายการธุรกรรมทองแท่งที่มี mode เป็น 'exchange_to_ornament' เท่านั้น"""
    
    # 📌 กรองเฉพาะรายการที่มี mode เป็น 'exchange_to_ornament'
    history = db.query(BarGold).filter(
        BarGold.mode == "exchange_to_ornament"
    ).order_by(desc(BarGold.date)).all() # เรียงตามวันที่ล่าสุดก่อน
    
    return history