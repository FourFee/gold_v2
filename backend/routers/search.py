# path: gold/backend/routers/search.py
"""
Global search across all transactional tables.

รับ 2 พารามิเตอร์อิสระ:
  - q     : ข้อความ (ชื่อ / เบอร์ / เลขบัตร / หมายเหตุ)
  - date  : วันที่ YYYY-MM-DD (ตีความเป็นเวลา Bangkok)

ระบุพารามิเตอร์ใดก็ได้หรือทั้งคู่ — ถ้าทั้งคู่จะ AND กัน
(แสดงรายการของวันนั้น ที่ match ข้อความด้วย)
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, or_, and_, true
from pydantic import BaseModel
from datetime import datetime, date as date_type, timedelta, timezone
from typing import List, Optional, Tuple

from database import get_db
from models import BarGold, OrnamentGold, Pawn, Wholesaler, WholesalerPickup

router = APIRouter(tags=["Search"])

BKK_TZ = timezone(timedelta(hours=7))


class SearchHit(BaseModel):
    entity: str
    id: int
    title: str
    subtitle: Optional[str] = ""
    date: Optional[datetime] = None
    route: str
    query: str  # text ที่จะ pre-fill ใน list page (ไม่รวม date)


class SearchResults(BaseModel):
    bar_gold: List[SearchHit] = []
    ornament_gold: List[SearchHit] = []
    pawn: List[SearchHit] = []
    wholesaler: List[SearchHit] = []
    wholesaler_pickup: List[SearchHit] = []
    total: int = 0


def _name_filter(model, q: str):
    pattern = f"%{q}%"
    return or_(
        model.firstname.ilike(pattern),
        model.lastname.ilike(pattern),
        model.idcard.ilike(pattern),
        model.phone.ilike(pattern),
        model.remark.ilike(pattern),
    )


def _date_range_utc(d: date_type) -> Tuple[datetime, datetime]:
    """แปลง date (Bangkok) เป็นช่วง [start, end) ใน UTC naive"""
    start_bkk = datetime(d.year, d.month, d.day, 0, 0, 0, tzinfo=BKK_TZ)
    end_bkk = start_bkk + timedelta(days=1)
    return (
        start_bkk.astimezone(timezone.utc).replace(tzinfo=None),
        end_bkk.astimezone(timezone.utc).replace(tzinfo=None),
    )


def _combined_filter(text_clause, date_col, parsed_date: Optional[date_type]):
    """รวม text และ date filter — ใส่อันไหนก็ได้, ทั้งคู่ก็ได้ (AND)"""
    clauses = []
    if text_clause is not None:
        clauses.append(text_clause)
    if parsed_date is not None and date_col is not None:
        s, e = _date_range_utc(parsed_date)
        clauses.append(and_(date_col >= s, date_col < e))
    if not clauses:
        return true()
    return and_(*clauses)


@router.get("/search", response_model=SearchResults)
def global_search(
    q: Optional[str] = Query(None, description="คำค้นหา (ชื่อ/เบอร์/หมายเหตุ)"),
    date: Optional[str] = Query(None, description="กรองวันที่ YYYY-MM-DD (Bangkok)"),
    per_entity: int = Query(5, ge=1, le=20),
    db: Session = Depends(get_db),
):
    q = (q or "").strip()
    parsed_date: Optional[date_type] = None
    if date:
        try:
            parsed_date = datetime.strptime(date, "%Y-%m-%d").date()
        except ValueError:
            parsed_date = None

    # ต้องมีอย่างน้อยหนึ่งอย่าง — ไม่งั้นจะ list ทุกอย่าง (ไม่ใช่จุดประสงค์)
    if not q and parsed_date is None:
        return SearchResults()

    out = SearchResults()

    # --- ตารางลูกค้า: bar_gold / ornament_gold / pawn ---
    for model, attr_name, list_field, formatter, route, target in [
        (BarGold,      "bar_gold",      "out.bar_gold",
            lambda r: f"น้ำหนัก {r.weightBaht:.2f} บาท · ฿{r.amount:,.0f}",
            "/bar-list", "bar_gold"),
        (OrnamentGold, "ornament_gold", "out.ornament_gold",
            lambda r: f"น้ำหนัก {r.weight:.2f} ก. · ฿{r.amount:,.0f}",
            "/ornament-list", "ornament_gold"),
        (Pawn,         "pawn",          "out.pawn",
            lambda r: f"น้ำหนัก {r.weight:.2f} ก. · ฿{r.amount:,.0f}",
            "/pawn-list", "pawn"),
    ]:
        text_clause = _name_filter(model, q) if q else None
        rows = (
            db.query(model)
            .filter(_combined_filter(text_clause, model.date, parsed_date))
            .order_by(desc(model.date))
            .limit(per_entity)
            .all()
        )
        hits = [
            SearchHit(
                entity=target,
                id=r.id,
                title=f"{r.firstname or ''} {r.lastname or ''}".strip() or "—",
                subtitle=formatter(r),
                date=r.date,
                route=route,
                query=q,
            )
            for r in rows
        ]
        if target == "bar_gold":
            out.bar_gold = hits
        elif target == "ornament_gold":
            out.ornament_gold = hits
        elif target == "pawn":
            out.pawn = hits

    # --- Wholesaler (master) — ค้นเฉพาะ text ไม่มี date ---
    if q:
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

    # --- Wholesaler pickup ---
    text_clause = None
    if q:
        pattern = f"%{q}%"
        text_clause = or_(
            WholesalerPickup.remark.ilike(pattern),
            Wholesaler.name.ilike(pattern),
        )
    pickup_rows = (
        db.query(WholesalerPickup)
        .options(joinedload(WholesalerPickup.wholesaler))
        .join(Wholesaler, Wholesaler.id == WholesalerPickup.wholesaler_id)
        .filter(_combined_filter(text_clause, WholesalerPickup.pickup_date, parsed_date))
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
