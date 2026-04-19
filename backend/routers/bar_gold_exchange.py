# path: gold/backend/routers/bar_gold_exchange.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, ConfigDict, field_validator
from sqlalchemy import desc 
from database import get_db
from models import BarGold 
from datetime import datetime
from typing import List, Optional

# 1. กำหนด APIRouter โดยไม่มี Prefix
router = APIRouter(
    tags=["Bar Gold Exchange"]
)

# --- Schemas (นำมาจากคำตอบก่อนหน้า) ---

# Pydantic Schema สำหรับการรับข้อมูลใหม่ (POST)
class BarGoldExchangeCreate(BaseModel):
    customerName: str
    weightBaht: float
    weightGram: float

    @field_validator('customerName', mode='before')
    def split_name(cls, value):
        if not value or ' ' not in value.strip():
            raise ValueError("customerName must contain both first name and last name separated by a space.")
        return value

# Pydantic Schema สำหรับการอัปเดต (PUT/PATCH)
class BarGoldExchangeUpdate(BaseModel):
    date: Optional[datetime] = None
    customerName: Optional[str] = None
    weightBaht: Optional[float] = None
    weightGram: Optional[float] = None

# Pydantic Schema สำหรับการส่งข้อมูลประวัติกลับ (GET/Response)
class BarGoldExchangeResponse(BaseModel):
    id: int
    date: datetime
    firstname: str
    lastname: str
    weightBaht: float
    weightGram: float
    mode: str 
    
    model_config = ConfigDict(from_attributes=True)

# -------------------------------------------------------------------
# A. Endpoint สำหรับบันทึกธุรกรรมใหม่ (POST /bar-gold-exchange)
# -------------------------------------------------------------------
@router.post("/bar-gold-exchange", response_model=BarGoldExchangeResponse)
def create_bar_gold_exchange(data: BarGoldExchangeCreate, db: Session = Depends(get_db)):
    """บันทึกธุรกรรมทองแท่งแลกเป็นทองรูปพรรณ (ลด Stock)"""
    
    if data.weightBaht < 5:
        raise HTTPException(status_code=400, detail="น้ำหนักทองแท่งต้องไม่ต่ำกว่า 5 บาท")

    name_parts = data.customerName.split()
    
    new_exchange = BarGold(
        date=datetime.utcnow(),
        firstname=name_parts[0],
        lastname=name_parts[1] if len(name_parts) > 1 else "",
        weightBaht=data.weightBaht,
        weightGram=data.weightGram,
        remark="แลกเปลี่ยนเป็นทองรูปพรรณ",
        mode="exchange_to_ornament" 
    )
    
    db.add(new_exchange)
    db.commit()
    db.refresh(new_exchange)
    
    return new_exchange


# -------------------------------------------------------------------
# B. Endpoint สำหรับดึงประวัติ (GET /bar-gold-exchange-history) 👈 ตามที่คุณต้องการ
# -------------------------------------------------------------------
@router.get("/bar-gold-exchange-history", response_model=List[BarGoldExchangeResponse])
def get_exchange_history(db: Session = Depends(get_db)):
    """ดึงรายการธุรกรรมทองแท่งที่มี mode เป็น 'exchange_to_ornament' เท่านั้น"""
    
    history = db.query(BarGold).filter(
        BarGold.mode == "exchange_to_ornament"
    ).order_by(desc(BarGold.date)).all()
    
    return history


# -------------------------------------------------------------------
# C. Endpoint สำหรับอัปเดตรายการ (PUT /bar-gold-exchange/update/{item_id})
# -------------------------------------------------------------------
@router.put("/bar-gold-exchange/update/{item_id}", response_model=BarGoldExchangeResponse)
def update_exchange_item(
    item_id: int, 
    data: BarGoldExchangeUpdate, 
    db: Session = Depends(get_db)
):
    """อัปเดตข้อมูลรายการแลกเปลี่ยนทองแท่งตาม ID"""
    db_item = db.query(BarGold).filter(BarGold.id == item_id).first()
    
    if db_item is None:
        raise HTTPException(status_code=404, detail=f"Item with ID {item_id} not found")

    update_data = data.model_dump(exclude_unset=True)
    
    if 'customerName' in update_data and update_data['customerName'] is not None:
        name_parts = update_data.pop('customerName').split()
        db_item.firstname = name_parts[0]
        db_item.lastname = name_parts[1] if len(name_parts) > 1 else ""
    
    for key, value in update_data.items():
        setattr(db_item, key, value)
    
    if db_item.mode != "exchange_to_ornament":
        db_item.mode = "exchange_to_ornament"

    db.commit()
    db.refresh(db_item)
    return db_item


# -------------------------------------------------------------------
# D. Endpoint สำหรับลบรายการ (DELETE /bar-gold-exchange/delete/{item_id})
# -------------------------------------------------------------------
@router.delete("/bar-gold-exchange/delete/{item_id}")
def delete_exchange_item(item_id: int, db: Session = Depends(get_db)):
    """ลบรายการแลกเปลี่ยนทองแท่งตาม ID"""
    db_item = db.query(BarGold).filter(BarGold.id == item_id).first()
    
    if db_item is None:
        raise HTTPException(status_code=404, detail=f"Item with ID {item_id} not found")
        
    db.delete(db_item)
    db.commit()
    
    return {"message": f"Bar Gold Exchange record with ID {item_id} deleted successfully"}