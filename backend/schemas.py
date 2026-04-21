from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import DateTime
from datetime import datetime, timezone
from typing import Literal

class PawnCreate(BaseModel):
    date: datetime  
    firstname: str
    lastname: str
    idcard: str
    address: str
    phone: str
    weight: float
    amount: float
    remark: str

class BarGoldCreate(BaseModel):
    date: datetime  
    firstname: str
    lastname: str
    idcard: str
    address: str
    phone: str
    weightBaht: float
    weightGram: float
    amount: float
    remark: str
    mode: Literal["buy", "sell"]

class OrnamentGoldCreate(BaseModel):
    date: datetime  
    firstname: str
    lastname: str
    idcard: str
    address: str
    phone: str
    weight: float
    amount: float
    remark: str
    mode: Literal["buy", "sell"]

# 📌 แก้ไข: ลบ id ออกจาก AllGoldTransactionsCreate
class AllGoldTransactionsCreate(BaseModel):
    date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))  # เรียก utcnow() ใหม่ทุกครั้งที่สร้าง record
    redeem: float = 0.0
    interest: float = 0.0
    pawn: float = 0.0
    buyIn: float = 0.0
    exchange: float = 0.0
    sellOut: float = 0.0
    expenses: float = 0.0
    diamondBuyIn: float = 0.0
    diamondSellOut: float = 0.0
    platedGold: float = 0.0

# 📌 เพิ่ม: AllGoldTransactionsResponse สำหรับข้อมูลที่ส่งกลับมาจาก API
class AllGoldTransactionsResponse(AllGoldTransactionsCreate):
    id: int # id จะถูกสร้างโดย DB และส่งกลับมาใน Response
    total_buy_in_exchange: float = 0.0  # ✅ เพิ่ม total_buy_in_exchange ใน Response schema
    model_config = ConfigDict(from_attributes=True) # สำหรับ Pydantic v2.0+