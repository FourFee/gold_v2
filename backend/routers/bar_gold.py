#path: gold/backend/routers/bar_gold.py
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc
from database import SessionLocal, get_db
from models import BarGold
from schemas import BarGoldCreate
from datetime import datetime, timedelta

router = APIRouter()

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ✅ Create
@router.post("/bar-gold/create")
def create_bar_gold(data: BarGoldCreate, db: Session = Depends(get_db)):
    obj = BarGold(**data.dict())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

# ✅ Read All (แก้ไขส่วนการคำนวณ start_date)
@router.get("/bar-gold/list")
def get_bar_gold_transactions(
    period: str = Query("month", description="Filter by period: day, week, month"),
    sort_order: str = Query("desc", description="Sort order: asc or desc"),
    db: Session = Depends(get_db)
):
    query = db.query(BarGold)
    today = datetime.today()

    # 1. การกรองตาม Period (ปรับแก้ส่วนนี้)
    if period == "day":
        # ดึงข้อมูล 7 วันย้อนหลัง โดยเริ่มจาก 00:00:00 ของ 6 วันที่แล้ว
        start_date = (today - timedelta(days=6)).replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "week":
        # ดึงข้อมูล 4 สัปดาห์ย้อนหลัง โดยเริ่มจากวันจันทร์ของ 3 สัปดาห์ที่แล้ว เวลา 00:00:00
        start_of_current_week = today - timedelta(days=today.weekday())
        start_date = (start_of_current_week - timedelta(weeks=3)).replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "month":
        # ดึงข้อมูล 6 เดือนย้อนหลัง โดยเริ่มจาก 00:00:00 ของวันแรกของเดือนที่ 6 ย้อนหลัง
        start_of_current_month = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        temp_date = start_of_current_month
        for _ in range(5): # ย้อนหลัง 5 เดือน เพื่อให้ครอบคลุม 6 เดือน (เดือนปัจจุบัน + 5 เดือนก่อนหน้า)
            if temp_date.month == 1:
                temp_date = temp_date.replace(year=temp_date.year - 1, month=12)
            else:
                temp_date = temp_date.replace(month=temp_date.month - 1)
        start_date = temp_date.replace(hour=0, minute=0, second=0, microsecond=0) # ให้มั่นใจว่าเป็น 00:00:00
    else:
        raise HTTPException(status_code=400, detail="Invalid period. Must be 'day', 'week', or 'month'.")

    # ใช้ .date() ในการเปรียบเทียบถ้า BarGold.date เป็นเพียงวันที่ (Date type)
    # แต่ถ้าเป็น DateTime type ให้เปรียบเทียบกับ datetime object
    query = query.filter(BarGold.date >= start_date)

    # 2. การเรียงลำดับ (ไม่ต้องเปลี่ยน)
    if sort_order == "desc":
        query = query.order_by(desc(BarGold.date))
    elif sort_order == "asc":
        query = query.order_by(asc(BarGold.date))
    else:
        raise HTTPException(status_code=400, detail="Invalid sort_order. Must be 'asc' or 'desc'.")

    transactions = query.all()
    return transactions

# ✅ Update
@router.put("/bar-gold/update/{id}")
def update_bar_gold(id: int, data: BarGoldCreate, db: Session = Depends(get_db)):
    bar_gold = db.query(BarGold).filter(BarGold.id == id).first()
    if bar_gold is None:
        raise HTTPException(status_code=404, detail="Not found")
    for key, value in data.dict().items():
        setattr(bar_gold, key, value)
    db.commit()
    return {"status": "updated"}

# ✅ Delete
@router.delete("/bar-gold/delete/{id}")
def delete_bar_gold(id: int, db: Session = Depends(get_db)):
    bar_gold = db.query(BarGold).filter(BarGold.id == id).first()
    if bar_gold is None:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(bar_gold)
    db.commit()
    return {"status": "deleted"}
