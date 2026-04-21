#path: gold/backend/routers/bar_gold.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from models import OrnamentGold
from schemas import OrnamentGoldCreate
from sqlalchemy import desc, asc

router = APIRouter()

# ✅ สร้างข้อมูลทองรูปพรรณ
@router.post("/ornament-gold/create")
def create_ornament_gold(data: OrnamentGoldCreate, db: Session = Depends(get_db)):
    obj = OrnamentGold(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

# ✅ อ่านข้อมูลทั้งหมด
@router.get("/ornament-gold/list")
def get_ornament_gold_transactions(
    # ... (อาจมี period หรือพารามิเตอร์อื่นๆ ที่มีอยู่แล้ว)
    sort_order: str = Query("desc", description="Sort order: asc or desc"), # <--- เพิ่มบรรทัดนี้
    db: Session = Depends(get_db)
):
    query = db.query(OrnamentGold) # <--- ตรวจสอบให้แน่ใจว่าเป็น Model ของทองรูปพรรณ (OrnamentGold)

    # ... (โค้ดการกรองอื่นๆ ถ้ามี)

    # ✅ เพิ่มส่วนการเรียงลำดับตามวันที่ (date)
    if sort_order == "desc":
        query = query.order_by(desc(OrnamentGold.date)) # <--- เรียงลำดับจากล่าสุด
    elif sort_order == "asc":
        query = query.order_by(asc(OrnamentGold.date)) # <--- เรียงลำดับจากเก่าสุด
    else:
        # ไม่จำเป็นต้องยกเว้นข้อผิดพลาดถ้าคุณมั่นใจว่าจะส่งแค่ 'desc'
        # แต่ถ้าอยากให้แข็งแรง ก็สามารถเพิ่มได้
        raise HTTPException(status_code=400, detail="Invalid sort_order. Must be 'asc' or 'desc'.")

    transactions = query.all()
    return transactions

# ✅ อัปเดตข้อมูล
@router.put("/ornament-gold/update/{id}")
def update_ornament_gold(id: int, data: OrnamentGoldCreate, db: Session = Depends(get_db)):
    obj = db.query(OrnamentGold).filter(OrnamentGold.id == id).first()
    if obj is None:
        raise HTTPException(status_code=404, detail="ไม่พบข้อมูล")
    for key, value in data.model_dump().items():
        setattr(obj, key, value)
    db.commit()
    return {"status": "updated"}

# ✅ ลบข้อมูล
@router.delete("/ornament-gold/delete/{id}")
def delete_ornament_gold(id: int, db: Session = Depends(get_db)):
    obj = db.query(OrnamentGold).filter(OrnamentGold.id == id).first()
    if obj is None:
        raise HTTPException(status_code=404, detail="ไม่พบข้อมูล")
    db.delete(obj)
    db.commit()
    return {"status": "deleted"}
