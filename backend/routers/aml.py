# path: gold/backend/routers/aml.py
# แบบรายงาน ปปง.1-05-2 — ออกเลขลำดับรายเดือน + เก็บข้อมูลไว้พิมพ์ซ้ำ
import json
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models import AmlReport, AmlStrReport, BarGold, OrnamentGold
from schemas import AmlIn, AmlStrIn

BKK_TZ = timezone(timedelta(hours=7))
ENTITIES = {"bar_gold", "ornament_gold"}

router = APIRouter()


def _to_dict(rec: AmlReport) -> dict:
    try:
        data = json.loads(rec.data or "{}")
    except ValueError:
        data = {}
    return {
        "id": rec.id,
        "entity": rec.entity,
        "entity_id": rec.entity_id,
        "status": rec.status,
        "reason": rec.reason or "",
        "year_be": rec.year_be,
        "month": rec.month,
        "seq": rec.seq,
        "data": data,
        "created_at": rec.created_at.isoformat() if rec.created_at else None,
    }


def create_aml_record(db: Session, entity: str, entity_id: int, tx_date: datetime, aml: AmlIn) -> AmlReport:
    """สร้างแถว aml_reports ใน transaction เดียวกับรายการทอง (ผู้เรียกต้อง commit เอง)

    status = report → ออกเลขถัดไปของเดือน (ปี/เดือนตามวันที่ทำธุรกรรม เวลาไทย)
    """
    if tx_date.tzinfo is None:
        tx_date = tx_date.replace(tzinfo=timezone.utc)  # DB เก็บเป็น UTC
    local = tx_date.astimezone(BKK_TZ)
    year_be, month, seq = local.year + 543, local.month, None

    if aml.status == "report":
        last = (
            db.query(func.max(AmlReport.seq))
            .filter(AmlReport.year_be == year_be, AmlReport.month == month)
            .scalar()
        )
        seq = (last or 0) + 1

    rec = AmlReport(
        entity=entity,
        entity_id=entity_id,
        status=aml.status,
        reason=aml.reason.strip(),
        year_be=year_be,
        month=month,
        seq=seq,
        data=json.dumps(aml.data, ensure_ascii=False, default=str),
    )
    db.add(rec)
    return rec


def row_with_aml(obj, rec: AmlReport | None) -> dict:
    """แปลงรายการทอง (SQLAlchemy) เป็น dict พร้อมแนบข้อมูล ปปง."""
    out = {c.name: getattr(obj, c.name) for c in obj.__table__.columns}
    out["aml"] = _to_dict(rec) if rec is not None else None
    return out


def _str_to_dict(rec: AmlStrReport) -> dict:
    try:
        data = json.loads(rec.data or "{}")
    except ValueError:
        data = {}
    return {
        "id": rec.id,
        "entity": rec.entity,
        "entity_id": rec.entity_id,
        "year_be": rec.year_be,
        "month": rec.month,
        "seq": rec.seq,
        "data": data,
        "created_at": rec.created_at.isoformat() if rec.created_at else None,
    }


@router.post("/aml/str/create")
def create_str(body: AmlStrIn, db: Session = Depends(get_db)):
    """ออกเลขแบบ ปปง.1-05-10 ของรายการทองที่บันทึกแล้ว (ยื่นได้หลายฉบับต่อรายการ)"""
    model = BarGold if body.entity == "bar_gold" else OrnamentGold
    tx = db.query(model).filter(model.id == body.entity_id).first()
    if tx is None:
        raise HTTPException(status_code=404, detail="ไม่พบรายการที่จะรายงาน")
    tx_date = tx.date or datetime.now(timezone.utc)
    if tx_date.tzinfo is None:
        tx_date = tx_date.replace(tzinfo=timezone.utc)
    local = tx_date.astimezone(BKK_TZ)
    year_be, month = local.year + 543, local.month
    last = (
        db.query(func.max(AmlStrReport.seq))
        .filter(AmlStrReport.year_be == year_be, AmlStrReport.month == month)
        .scalar()
    )
    rec = AmlStrReport(
        entity=body.entity,
        entity_id=body.entity_id,
        year_be=year_be,
        month=month,
        seq=(last or 0) + 1,
        data=json.dumps(body.data, ensure_ascii=False, default=str),
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return _str_to_dict(rec)


@router.get("/aml/str/list")
def list_str(entity: str = Query(..., description="bar_gold หรือ ornament_gold"), db: Session = Depends(get_db)):
    if entity not in ENTITIES:
        raise HTTPException(status_code=400, detail="entity ไม่ถูกต้อง")
    rows = db.query(AmlStrReport).filter(AmlStrReport.entity == entity).order_by(AmlStrReport.id).all()
    return [_str_to_dict(r) for r in rows]


@router.get("/aml/list")
def list_aml(entity: str = Query(..., description="bar_gold หรือ ornament_gold"), db: Session = Depends(get_db)):
    if entity not in ENTITIES:
        raise HTTPException(status_code=400, detail="entity ไม่ถูกต้อง")
    rows = db.query(AmlReport).filter(AmlReport.entity == entity).all()
    return [_to_dict(r) for r in rows]
