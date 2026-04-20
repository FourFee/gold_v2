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
    period: str = Query("all", description="Filter by period: day, week, month, all"),
    sort_order: str = Query("desc", description="Sort order: asc or desc"),
    db: Session = Depends(get_db)
):
    query = db.query(BarGold)
    today = datetime.today()

    if period == "day":
        start_date = today.replace(hour=0, minute=0, second=0, microsecond=0)
        query = query.filter(BarGold.date >= start_date)
    elif period == "week":
        start_date = (today - timedelta(days=today.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
        query = query.filter(BarGold.date >= start_date)
    elif period == "month":
        start_date = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        query = query.filter(BarGold.date >= start_date)
    elif period == "all":
        pass  # ไม่กรอง ดึงทั้งหมด
    else:
        raise HTTPException(status_code=400, detail="Invalid period. Must be 'day', 'week', 'month', or 'all'.")

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
