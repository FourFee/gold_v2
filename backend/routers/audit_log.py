# path: gold/backend/routers/audit_log.py
"""
Audit log API — ดึงประวัติการเปลี่ยนแปลงข้อมูล
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import List, Optional, Literal

from database import get_db
from models import AuditLog

router = APIRouter(tags=["Audit Log"])


class AuditLogResponse(BaseModel):
    id: int
    timestamp: datetime
    user: str
    action: str
    entity: str
    entity_id: Optional[int] = None
    changes: str = ""
    model_config = ConfigDict(from_attributes=True)


@router.get("/audit-log/list", response_model=List[AuditLogResponse])
def list_audit_log(
    entity: Optional[str] = Query(None, description="Filter by entity (bar_gold, pawn, ...)"),
    action: Optional[Literal["CREATE", "UPDATE", "DELETE"]] = Query(None),
    limit: int = Query(200, ge=1, le=1000),
    db: Session = Depends(get_db),
):
    q = db.query(AuditLog)
    if entity:
        q = q.filter(AuditLog.entity == entity)
    if action:
        q = q.filter(AuditLog.action == action)
    return q.order_by(desc(AuditLog.timestamp)).limit(limit).all()


@router.get("/audit-log/entities", response_model=List[str])
def list_entities(db: Session = Depends(get_db)):
    """รายชื่อ entity ที่เคยถูก log — สำหรับใช้ใน filter UI"""
    rows = db.query(AuditLog.entity).distinct().all()
    return sorted([r[0] for r in rows if r[0]])
