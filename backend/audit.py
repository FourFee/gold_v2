# path: gold/backend/audit.py
"""
Audit log via SQLAlchemy event listeners.

ดักทุก INSERT/UPDATE/DELETE ของ entity ที่กำหนด แล้วเขียน log อัตโนมัติ
โดยไม่ต้องแก้ router แต่ละตัว

ใช้ Session.event แทน mapper.event เพราะต้องเขียน log entry ใหม่
ในการ flush เดียวกัน — mapper events จะมีปัญหา re-entrant flush
"""
import json
from datetime import datetime, timezone
from sqlalchemy import event, inspect
from sqlalchemy.orm import Session

from models import (
    AuditLog,
    BarGold,
    OrnamentGold,
    Pawn,
    AllGoldTransaction,
    WholesalerPickup,
    Wholesaler,
)

# Entity ที่จะ track — map class → ชื่อ entity ใน log
TRACKED = {
    BarGold:              "bar_gold",
    OrnamentGold:         "ornament_gold",
    Pawn:                 "pawn",
    AllGoldTransaction:   "all_gold_transactions",
    WholesalerPickup:     "wholesaler_pickup",
    Wholesaler:           "wholesaler",
}


def _serialize(obj) -> dict:
    """แปลง SQLAlchemy object เป็น dict (skip _sa_instance_state)"""
    result = {}
    for col in inspect(obj).mapper.column_attrs:
        val = getattr(obj, col.key, None)
        if isinstance(val, datetime):
            val = val.isoformat()
        result[col.key] = val
    return result


def _changes_dict(obj) -> dict:
    """หา field ที่เปลี่ยนใน UPDATE — คืน {field: {before, after}}"""
    changes = {}
    state = inspect(obj)
    for attr in state.mapper.column_attrs:
        hist = state.attrs[attr.key].history
        if hist.has_changes():
            before = hist.deleted[0] if hist.deleted else None
            after = hist.added[0] if hist.added else None
            if isinstance(before, datetime):
                before = before.isoformat()
            if isinstance(after, datetime):
                after = after.isoformat()
            changes[attr.key] = {"before": before, "after": after}
    return changes


def install_listeners():
    """ติดตั้ง event listeners — เรียกครั้งเดียวตอน startup"""

    @event.listens_for(Session, "before_flush")
    def before_flush(session, _flush_context, _instances):
        # เก็บ pending audit entries ใน session info
        pending = []

        # CREATE
        for obj in session.new:
            entity_name = TRACKED.get(type(obj))
            if entity_name is None:
                continue
            pending.append({
                "action": "CREATE",
                "entity": entity_name,
                "entity_id": None,  # id ยังไม่มีก่อน flush — fill ทีหลัง
                "obj_ref": obj,
                "changes": json.dumps({"after": _serialize(obj)}, ensure_ascii=False, default=str),
            })

        # UPDATE
        for obj in session.dirty:
            entity_name = TRACKED.get(type(obj))
            if entity_name is None:
                continue
            if not session.is_modified(obj, include_collections=False):
                continue
            diff = _changes_dict(obj)
            if not diff:
                continue
            pending.append({
                "action": "UPDATE",
                "entity": entity_name,
                "entity_id": getattr(obj, "id", None),
                "obj_ref": None,
                "changes": json.dumps(diff, ensure_ascii=False, default=str),
            })

        # DELETE
        for obj in session.deleted:
            entity_name = TRACKED.get(type(obj))
            if entity_name is None:
                continue
            pending.append({
                "action": "DELETE",
                "entity": entity_name,
                "entity_id": getattr(obj, "id", None),
                "obj_ref": None,
                "changes": json.dumps({"before": _serialize(obj)}, ensure_ascii=False, default=str),
            })

        if pending:
            session.info.setdefault("_audit_pending", []).extend(pending)

    @event.listens_for(Session, "after_flush")
    def after_flush(session, _flush_context):
        # หลัง flush แล้ว obj.id จะถูกเซ็ต — เพิ่ม audit log ที่ปรับ entity_id ให้ถูกแล้ว
        pending = session.info.pop("_audit_pending", [])
        if not pending:
            return
        for entry in pending:
            if entry["action"] == "CREATE" and entry["obj_ref"] is not None:
                entry["entity_id"] = getattr(entry["obj_ref"], "id", None)
            session.add(AuditLog(
                timestamp=datetime.now(timezone.utc),
                user="system",
                action=entry["action"],
                entity=entry["entity"],
                entity_id=entry["entity_id"],
                changes=entry["changes"],
            ))
