# path: gold/backend/routers/search.py
"""
Global search across all transactional tables.

ค้นหาด้วย keyword เดียวจะวิ่งไปดูทุกตาราง — ลูกค้า, ร้านส่ง, ธุรกรรม
จัดผลลัพธ์เป็นกลุ่มแยกตาม entity และจำกัดจำนวนต่อกลุ่มไม่ให้ผลล้น
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, or_
from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional

from database import get_db
from models import BarGold, OrnamentGold, Pawn, Wholesaler, WholesalerPickup

router = APIRouter(tags=["Search"])


class SearchHit(BaseModel):
    entity: str                   # bar_gold | ornament_gold | pawn | wholesaler | wholesaler_pickup
    id: int
    title: str                    # ชื่อหลักที่จะแสดง
    subtitle: Optional[str] = ""  # บรรทัดที่สอง — ปกติเป็นวันที่ + จำนวนเงิน
    date: Optional[datetime] = None
    route: str                    # path frontend ที่จะ navigate ไป
    query: str                    # ค่า search ที่จะ pre-fill ในหน้าปลายทาง


class SearchResults(BaseModel):
    bar_gold: List[SearchHit] = []
    ornament_gold: List[SearchHit] = []
    pawn: List[SearchHit] = []
    wholesaler: List[SearchHit] = []
    wholesaler_pickup: List[SearchHit] = []
    total: int = 0


def _name_filter(model, q: str):
    """สร้าง filter สำหรับตาราง customer-based (firstname/lastname/idcard/phone/remark)"""
    pattern = f"%{q}%"
    return or_(
        model.firstname.ilike(pattern),
        model.lastname.ilike(pattern),
        model.idcard.ilike(pattern),
        model.phone.ilike(pattern),
        model.remark.ilike(pattern),
    )


@router.get("/search", response_model=SearchResults)
def global_search(
    q: str = Query(..., min_length=1, description="คำค้นหา"),
    per_entity: int = Query(5, ge=1, le=20),
    db: Session = Depends(get_db),
):
    q = q.strip()
    if not q:
        return SearchResults()

    out = SearchResults()

    # Bar gold
    rows = (
        db.query(BarGold)
        .filter(_name_filter(BarGold, q))
        .order_by(desc(BarGold.date))
        .limit(per_entity)
        .all()
    )
    out.bar_gold = [
        SearchHit(
            entity="bar_gold",
            id=r.id,
            title=f"{r.firstname or ''} {r.lastname or ''}".strip() or "—",
            subtitle=f"น้ำหนัก {r.weightBaht:.2f} บาท · ฿{r.amount:,.0f}",
            date=r.date,
            route="/bar-list",
            query=q,
        )
        for r in rows
    ]

    # Ornament gold
    rows = (
        db.query(OrnamentGold)
        .filter(_name_filter(OrnamentGold, q))
        .order_by(desc(OrnamentGold.date))
        .limit(per_entity)
        .all()
    )
    out.ornament_gold = [
        SearchHit(
            entity="ornament_gold",
            id=r.id,
            title=f"{r.firstname or ''} {r.lastname or ''}".strip() or "—",
            subtitle=f"น้ำหนัก {r.weight:.2f} ก. · ฿{r.amount:,.0f}",
            date=r.date,
            route="/ornament-list",
            query=q,
        )
        for r in rows
    ]

    # Pawn
    rows = (
        db.query(Pawn)
        .filter(_name_filter(Pawn, q))
        .order_by(desc(Pawn.date))
        .limit(per_entity)
        .all()
    )
    out.pawn = [
        SearchHit(
            entity="pawn",
            id=r.id,
            title=f"{r.firstname or ''} {r.lastname or ''}".strip() or "—",
            subtitle=f"น้ำหนัก {r.weight:.2f} ก. · ฿{r.amount:,.0f}",
            date=r.date,
            route="/pawn-list",
            query=q,
        )
        for r in rows
    ]

    # Wholesaler (master)
    pattern = f"%{q}%"
    rows = (
        db.query(Wholesaler)
        .filter(or_(
            Wholesaler.name.ilike(pattern),
            Wholesaler.phone.ilike(pattern),
            Wholesaler.address.ilike(pattern),
        ))
        .limit(per_entity)
        .all()
    )
    out.wholesaler = [
        SearchHit(
            entity="wholesaler",
            id=r.id,
            title=r.name,
            subtitle=r.phone or r.address or "",
            date=None,
            route="/wholesaler-pickup-list",
            query=q,
        )
        for r in rows
    ]

    # Wholesaler pickup (joined with wholesaler name)
    pickup_rows = (
        db.query(WholesalerPickup)
        .options(joinedload(WholesalerPickup.wholesaler))
        .filter(or_(
            WholesalerPickup.remark.ilike(pattern),
            Wholesaler.name.ilike(pattern),
        ))
        .join(Wholesaler, Wholesaler.id == WholesalerPickup.wholesaler_id)
        .order_by(desc(WholesalerPickup.pickup_date))
        .limit(per_entity)
        .all()
    )
    out.wholesaler_pickup = [
        SearchHit(
            entity="wholesaler_pickup",
            id=r.id,
            title=r.wholesaler.name if r.wholesaler else "—",
            subtitle=f"หยิบ {r.weight_baht:.2f} บาท · กำเหน็จ ฿{r.making_fee:,.0f}",
            date=r.pickup_date,
            route="/wholesaler-pickup-list",
            query=q,
        )
        for r in pickup_rows
    ]

    out.total = (
        len(out.bar_gold) + len(out.ornament_gold) + len(out.pawn)
        + len(out.wholesaler) + len(out.wholesaler_pickup)
    )
    return out
