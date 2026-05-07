# path: gold/backend/routers/wholesaler.py
"""
ร้านส่ง (Wholesaler) — master data + การหยิบทอง (Pickup)

เก็บข้อมูลร้านส่งและบันทึกแต่ละครั้งที่นำทองแท่งไปแลกทองรูปพรรณ
จ่ายเฉพาะค่ากำเหน็จ ไม่ได้ซื้อขายเงินสด
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, asc, func
from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Literal

from database import get_db
from models import Wholesaler, WholesalerPickup

BKK_TZ = timezone(timedelta(hours=7))

router = APIRouter(tags=["Wholesaler"])


# ───────────────── Schemas ─────────────────

class WholesalerCreate(BaseModel):
    name: str
    phone: Optional[str] = ""
    address: Optional[str] = ""
    note: Optional[str] = ""
    active: bool = True


class WholesalerResponse(BaseModel):
    id: int
    name: str
    phone: str = ""
    address: str = ""
    note: str = ""
    active: bool = True
    model_config = ConfigDict(from_attributes=True)


class WholesalerPickupCreate(BaseModel):
    wholesaler_id: int
    pickup_date: Optional[datetime] = None
    weight_baht: float = Field(gt=0)
    weight_gram: float = 0.0
    bar_used_baht: float = 0.0
    making_fee: float = 0.0
    remark: Optional[str] = ""


class WholesalerPickupUpdate(BaseModel):
    wholesaler_id: Optional[int] = None
    pickup_date: Optional[datetime] = None
    weight_baht: Optional[float] = None
    weight_gram: Optional[float] = None
    bar_used_baht: Optional[float] = None
    making_fee: Optional[float] = None
    remark: Optional[str] = None


class WholesalerPickupResponse(BaseModel):
    id: int
    wholesaler_id: int
    wholesaler_name: str
    pickup_date: datetime
    weight_baht: float
    weight_gram: float
    bar_used_baht: float
    making_fee: float
    remark: str = ""
    model_config = ConfigDict(from_attributes=True)


class WholesalerSummaryItem(BaseModel):
    wholesaler_id: int
    wholesaler_name: str
    count: int
    weight_baht_sum: float
    bar_used_baht_sum: float
    making_fee_sum: float
    last_pickup_date: Optional[datetime] = None


# ───────────────── Helpers ─────────────────

def _period_start(period: str) -> Optional[datetime]:
    """คืน UTC naive datetime เป็นจุดเริ่มต้นของช่วง โดยอิงเวลา Bangkok"""
    now_bkk = datetime.now(BKK_TZ)
    if period == "day":
        start_bkk = now_bkk.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "week":
        start_bkk = (now_bkk - timedelta(days=now_bkk.weekday())).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
    elif period == "month":
        start_bkk = now_bkk.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    elif period == "all":
        return None
    else:
        raise HTTPException(status_code=400, detail="period ต้องเป็น day/week/month/all")
    return start_bkk.astimezone(timezone.utc).replace(tzinfo=None)


def _to_response(p: WholesalerPickup) -> dict:
    return {
        "id": p.id,
        "wholesaler_id": p.wholesaler_id,
        "wholesaler_name": p.wholesaler.name if p.wholesaler else "",
        "pickup_date": p.pickup_date,
        "weight_baht": p.weight_baht,
        "weight_gram": p.weight_gram or 0.0,
        "bar_used_baht": p.bar_used_baht or 0.0,
        "making_fee": p.making_fee or 0.0,
        "remark": p.remark or "",
    }


# ───────────────── Wholesaler CRUD ─────────────────

@router.post("/wholesalers/create", response_model=WholesalerResponse)
def create_wholesaler(data: WholesalerCreate, db: Session = Depends(get_db)):
    if not data.name.strip():
        raise HTTPException(status_code=400, detail="ต้องระบุชื่อร้าน")
    obj = Wholesaler(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/wholesalers/list", response_model=List[WholesalerResponse])
def list_wholesalers(
    active_only: bool = Query(True),
    db: Session = Depends(get_db),
):
    q = db.query(Wholesaler)
    if active_only:
        q = q.filter(Wholesaler.active == True)  # noqa: E712
    return q.order_by(asc(Wholesaler.name)).all()


@router.put("/wholesalers/update/{id}", response_model=WholesalerResponse)
def update_wholesaler(id: int, data: WholesalerCreate, db: Session = Depends(get_db)):
    obj = db.query(Wholesaler).filter(Wholesaler.id == id).first()
    if obj is None:
        raise HTTPException(status_code=404, detail="ไม่พบร้านส่ง")
    for k, v in data.model_dump().items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/wholesalers/delete/{id}")
def delete_wholesaler(id: int, db: Session = Depends(get_db)):
    obj = db.query(Wholesaler).filter(Wholesaler.id == id).first()
    if obj is None:
        raise HTTPException(status_code=404, detail="ไม่พบร้านส่ง")
    has_pickups = db.query(WholesalerPickup).filter(
        WholesalerPickup.wholesaler_id == id
    ).first() is not None
    if has_pickups:
        # ไม่ลบจริง — ปิดการใช้งานแทน เพื่อไม่ให้ข้อมูลประวัติเสีย
        obj.active = False
        db.commit()
        return {"status": "deactivated", "reason": "มีประวัติการหยิบทองอยู่"}
    db.delete(obj)
    db.commit()
    return {"status": "deleted"}


# ───────────────── Pickup CRUD ─────────────────

@router.post("/wholesaler-pickup/create", response_model=WholesalerPickupResponse)
def create_pickup(data: WholesalerPickupCreate, db: Session = Depends(get_db)):
    ws = db.query(Wholesaler).filter(Wholesaler.id == data.wholesaler_id).first()
    if ws is None:
        raise HTTPException(status_code=404, detail="ไม่พบร้านส่ง")
    payload = data.model_dump()
    if payload.get("pickup_date") is None:
        payload["pickup_date"] = datetime.now(timezone.utc)
    obj = WholesalerPickup(**payload)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return _to_response(obj)


@router.get("/wholesaler-pickup/list", response_model=List[WholesalerPickupResponse])
def list_pickups(
    period: Literal["day", "week", "month", "all"] = Query("month"),
    wholesaler_id: Optional[int] = Query(None),
    sort_order: Literal["asc", "desc"] = Query("desc"),
    db: Session = Depends(get_db),
):
    q = db.query(WholesalerPickup).options(joinedload(WholesalerPickup.wholesaler))
    start = _period_start(period)
    if start is not None:
        q = q.filter(WholesalerPickup.pickup_date >= start)
    if wholesaler_id is not None:
        q = q.filter(WholesalerPickup.wholesaler_id == wholesaler_id)
    order = desc if sort_order == "desc" else asc
    rows = q.order_by(order(WholesalerPickup.pickup_date)).all()
    return [_to_response(r) for r in rows]


@router.put("/wholesaler-pickup/update/{id}", response_model=WholesalerPickupResponse)
def update_pickup(id: int, data: WholesalerPickupUpdate, db: Session = Depends(get_db)):
    obj = db.query(WholesalerPickup).filter(WholesalerPickup.id == id).first()
    if obj is None:
        raise HTTPException(status_code=404, detail="ไม่พบรายการ")
    update = data.model_dump(exclude_unset=True)
    for k, v in update.items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return _to_response(obj)


@router.delete("/wholesaler-pickup/delete/{id}")
def delete_pickup(id: int, db: Session = Depends(get_db)):
    obj = db.query(WholesalerPickup).filter(WholesalerPickup.id == id).first()
    if obj is None:
        raise HTTPException(status_code=404, detail="ไม่พบรายการ")
    db.delete(obj)
    db.commit()
    return {"status": "deleted"}


# ───────────────── Summary ─────────────────

@router.get("/wholesaler-pickup/summary", response_model=List[WholesalerSummaryItem])
def summary_by_wholesaler(
    period: Literal["day", "week", "month", "all"] = Query("month"),
    db: Session = Depends(get_db),
):
    """สรุปต่อร้าน สำหรับแสดงตาราง pivot รายร้านในหน้ารายการ"""
    q = (
        db.query(
            WholesalerPickup.wholesaler_id,
            Wholesaler.name,
            func.count(WholesalerPickup.id).label("count"),
            func.coalesce(func.sum(WholesalerPickup.weight_baht), 0.0).label("weight_baht_sum"),
            func.coalesce(func.sum(WholesalerPickup.bar_used_baht), 0.0).label("bar_used_baht_sum"),
            func.coalesce(func.sum(WholesalerPickup.making_fee), 0.0).label("making_fee_sum"),
            func.max(WholesalerPickup.pickup_date).label("last_pickup_date"),
        )
        .join(Wholesaler, Wholesaler.id == WholesalerPickup.wholesaler_id)
    )
    start = _period_start(period)
    if start is not None:
        q = q.filter(WholesalerPickup.pickup_date >= start)
    rows = (
        q.group_by(WholesalerPickup.wholesaler_id, Wholesaler.name)
        .order_by(desc("weight_baht_sum"))
        .all()
    )
    return [
        WholesalerSummaryItem(
            wholesaler_id=r.wholesaler_id,
            wholesaler_name=r.name,
            count=r.count,
            weight_baht_sum=float(r.weight_baht_sum or 0),
            bar_used_baht_sum=float(r.bar_used_baht_sum or 0),
            making_fee_sum=float(r.making_fee_sum or 0),
            last_pickup_date=r.last_pickup_date,
        )
        for r in rows
    ]
