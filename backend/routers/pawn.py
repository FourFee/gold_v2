from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import SessionLocal
from models import Pawn
from schemas import PawnCreate

router = APIRouter(prefix="/pawn")  # ✅ เพิ่มตรงนี้

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/create")
def create_pawn(data: PawnCreate, db: Session = Depends(get_db)):
    obj = Pawn(**data.dict())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

@router.get("/list")
def get_all(db: Session = Depends(get_db)):
    return db.query(Pawn).all()

@router.put("/update/{id}")
def update_pawn(id: int, data: PawnCreate, db: Session = Depends(get_db)):
    pawn = db.query(Pawn).filter(Pawn.id == id).first()
    if pawn is None:
        raise HTTPException(status_code=404, detail="Not found")
    for key, value in data.dict().items():
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
