from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import DateTime
from datetime import datetime, timezone
from typing import Literal, Optional

class PawnCreate(BaseModel):
    date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    firstname: str
    lastname: str
    idcard: str
    address: str
    phone: str
    weight: float
    amount: float
    remark: str

class BarGoldCreate(BaseModel):
    date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    firstname: str
    lastname: Optional[str] = ""
    idcard: Optional[str] = ""
    address: Optional[str] = ""
    phone: Optional[str] = ""
    weightBaht: float
    weightGram: float
    amount: float
    remark: Optional[str] = ""
    mode: Literal["buy", "sell"]

class OrnamentGoldCreate(BaseModel):
    date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    firstname: str
    lastname: Optional[str] = ""
    idcard: Optional[str] = ""
    address: Optional[str] = ""
    phone: Optional[str] = ""
    weight: float
    amount: float
    remark: Optional[str] = ""
    mode: Literal["buy", "sell"]

class AmlIn(BaseModel):
    """ข้อมูลแบบ ปปง. ที่ส่งมาพร้อมการบันทึกรายการ (เฉพาะยอดตั้งแต่ 2 ล้าน)"""
    status: Literal["report", "exempt_transfer", "exempt_other"]
    reason: str = ""
    data: dict = Field(default_factory=dict)

class AmlStrIn(BaseModel):
    """แบบ ปปง.1-05-10 ธุรกรรมที่มีเหตุอันควรสงสัย"""
    entity: Literal["bar_gold", "ornament_gold"]
    entity_id: int
    data: dict = Field(default_factory=dict)

class BarGoldCreateWithAml(BarGoldCreate):
    aml: Optional[AmlIn] = None

class OrnamentGoldCreateWithAml(OrnamentGoldCreate):
    aml: Optional[AmlIn] = None

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