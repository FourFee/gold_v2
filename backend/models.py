from sqlalchemy import Column, Integer, String, Float, Enum, ForeignKey, Boolean, UniqueConstraint
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
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


class Wholesaler(Base):
    __tablename__ = "wholesalers"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    phone = Column(String, default="")
    address = Column(String, default="")
    note = Column(String, default="")
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    pickups = relationship("WholesalerPickup", back_populates="wholesaler")


class WholesalerPickup(Base):
    __tablename__ = "wholesaler_pickups"
    id = Column(Integer, primary_key=True, index=True)
    wholesaler_id = Column(Integer, ForeignKey("wholesalers.id"), nullable=False, index=True)
    pickup_date = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    weight_baht = Column(Float, nullable=False)
    weight_gram = Column(Float, default=0.0)
    bar_used_baht = Column(Float, default=0.0)
    making_fee = Column(Float, default=0.0)
    remark = Column(String, default="")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    wholesaler = relationship("Wholesaler", back_populates="pickups")


class AmlReport(Base):
    """แบบรายงาน ปปง.1-05-2 (ธุรกรรมเงินสดตั้งแต่ 2 ล้าน) ของรายการทองแท่ง/ทองรูปพรรณ

    status: report = ส่งรายงาน (มีเลขลำดับ), exempt_transfer = โอน/เช็ค, exempt_other = ไม่ต้องส่ง (เช่น ร้านซื้อเอง)
    seq รันใหม่ทุกเดือน (ปี พ.ศ. + เดือน ของวันที่ทำธุรกรรม ตามเวลาไทย) ใช้ร่วมกันทั้งทองแท่งและทองรูปพรรณ
    """
    __tablename__ = "aml_reports"
    __table_args__ = (UniqueConstraint("year_be", "month", "seq", name="uq_aml_seq"),)
    id = Column(Integer, primary_key=True, index=True)
    entity = Column(String, nullable=False, index=True)      # bar_gold / ornament_gold
    entity_id = Column(Integer, nullable=False, index=True)
    status = Column(String, nullable=False)
    reason = Column(String, default="")
    year_be = Column(Integer, nullable=True)
    month = Column(Integer, nullable=True)
    seq = Column(Integer, nullable=True)
    data = Column(String, default="{}")                      # JSON snapshot ข้อมูลที่ใช้พิมพ์ฟอร์ม
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class AmlStrReport(Base):
    """แบบรายงาน ปปง.1-05-10 (ธุรกรรมที่มีเหตุอันควรสงสัย) — ไม่จำกัดยอดเงิน

    seq รันใหม่ทุกเดือน (ปี/เดือนของวันที่ทำธุรกรรม ตามเวลาไทย) แยกจากเลขของแบบ 1-05-2
    """
    __tablename__ = "aml_str_reports"
    __table_args__ = (UniqueConstraint("year_be", "month", "seq", name="uq_aml_str_seq"),)
    id = Column(Integer, primary_key=True, index=True)
    entity = Column(String, nullable=False, index=True)      # bar_gold / ornament_gold
    entity_id = Column(Integer, nullable=False, index=True)
    year_be = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)
    seq = Column(Integer, nullable=False)
    data = Column(String, default="{}")                      # JSON snapshot ข้อมูลที่ใช้พิมพ์ฟอร์ม
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class AuditLog(Base):
    __tablename__ = "audit_log"
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    user = Column(String, default="system")
    action = Column(String, nullable=False)        # CREATE / UPDATE / DELETE
    entity = Column(String, nullable=False, index=True)
    entity_id = Column(Integer, index=True, nullable=True)
    changes = Column(String, default="")           # JSON string: {"before": {...}, "after": {...}}

