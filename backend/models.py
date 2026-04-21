from sqlalchemy import Column, Integer, String, Float, Enum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import DateTime
from datetime import datetime, timezone


Base = declarative_base()

class Pawn(Base):
    __tablename__ = "pawn"
    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    firstname = Column(String)
    lastname = Column(String)
    idcard = Column(String)
    address = Column(String)
    phone = Column(String)
    weight = Column(Float)
    amount = Column(Float)
    remark = Column(String)

class BarGold(Base):
    __tablename__ = "bar_gold"
    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    firstname = Column(String)
    lastname = Column(String)
    idcard = Column(String)
    address = Column(String)
    phone = Column(String)
    weightBaht = Column(Float)
    weightGram = Column(Float)
    amount = Column(Float)
    remark = Column(String)
    mode = Column(String(50), nullable=False) 
    @property
    def customerName(self):
        # รวมชื่อและนามสกุล โดยตัดช่องว่างออกถ้าไม่มีชื่อหรือนามสกุล
        full_name = f"{self.firstname or ''} {self.lastname or ''}".strip()
        return full_name

class OrnamentGold(Base):
    __tablename__ = "ornament_gold"
    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    firstname = Column(String)
    lastname = Column(String)
    idcard = Column(String)
    address = Column(String)
    phone = Column(String)
    weight = Column(Float)
    amount = Column(Float)
    remark = Column(String)
    mode = Column(String)

class AllGoldTransaction(Base):
    __tablename__ = "all_gold_transactions"
    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    redeem = Column(Float, default=0.0)
    interest = Column(Float, default=0.0)
    pawn = Column(Float, default=0.0)
    buyIn = Column(Float, default=0.0)
    exchange = Column(Float, default=0.0)
    sellOut = Column(Float, default=0.0)
    expenses = Column(Float, default=0.0)  # ✅ เพิ่มช่อง ค่าใช้จ่าย
    total_buy_in_exchange = Column(Float, default=0.0)
    diamondBuyIn = Column(Float, default=0.0)   # ✅ เปลี่ยนจาก diamond_buy_in เป็น diamondBuyIn
    diamondSellOut = Column(Float, default=0.0) # ✅ เปลี่ยนจาก diamond_sell_out เป็น diamondSellOut
    platedGold = Column(Float, default=0.0)     # ✅ เปลี่ยนจาก plated_gold เป็น platedGold
    