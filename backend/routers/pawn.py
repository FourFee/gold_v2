from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc
from database import get_db
from models import Pawn
from schemas import PawnCreate

router = APIRouter(prefix="/pawn")

@router.post("/create")
def create_pawn(data: PawnCreate, db: Session = Depends(get_db)):
    obj = Pawn(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

@router.get("/list")
def get_all(
    sort_order: str = Query("desc"),
    db: Session = Depends(get_db)
):
    query = db.query(Pawn)
    query = query.order_by(desc(Pawn.date) if sort_order == "desc" else asc(Pawn.date))
    return query.all()

@router.put("/update/{id}")
def update_pawn(id: int, data: PawnCreate, db: Session = Depends(get_db)):
    pawn = db.query(Pawn).filter(Pawn.id == id).first()
    if pawn is None:
        raise HTTPException(status_code=404, detail="Not found")
    for key, value in data.model_dump().items():
        setattr(pawn, key, value)
    db.commit()
    return {"status": "updated"}

@router.delete("/delete/{id}")
def delete_pawn(id: int, db: Session = Depends(get_db)):
    pawn = db.query(Pawn).filter(Pawn.id == id).first()
    if pawn is None:
        raise HTTPException(status_code=404, detail="ไม่พบรายการจำนำ")
    db.delete(pawn)
    db.commit()
    return {"status": "deleted"}
