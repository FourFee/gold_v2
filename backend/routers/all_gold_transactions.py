# path: gold/backend/routers/all_gold_transactions.py

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from models import AllGoldTransaction # 📌 นำเข้า AllGoldTransaction model
from schemas import AllGoldTransactionsCreate, AllGoldTransactionsResponse # 📌 นำเข้า schemas ใหม่
from datetime import datetime
from typing import Optional # อาจจะยังใช้ในส่วนอื่น

router = APIRouter()

# 📌 Endpoint สำหรับสร้างรายการสรุปยอดใหม่
@router.post("/all-gold-transactions/create", response_model=AllGoldTransactionsResponse)
def create_all_gold_transaction(transaction: AllGoldTransactionsCreate, db: Session = Depends(get_db)):
    # ไม่ต้องตรวจสอบ transaction.date is None แล้ว เพราะใน Schema กำหนดให้เป็น required

    # ✅ จุดที่ 1: คำนวณ total_buy_in_exchange ก่อนสร้าง Object
    total_buy_in_exchange_value = (transaction.buyIn or 0.0) + (transaction.exchange or 0.0)

    # ✅ แก้ไขการสร้าง db_transaction เพื่อรวมค่าที่คำนวณได้
    db_transaction = AllGoldTransaction(
        date=transaction.date,
        redeem=transaction.redeem,
        interest=transaction.interest,
        pawn=transaction.pawn,
        buyIn=transaction.buyIn,
        exchange=transaction.exchange,
        sellOut=transaction.sellOut,
        expenses=transaction.expenses,
        total_buy_in_exchange=total_buy_in_exchange_value, # ✅ กำหนดค่าให้คอลัมน์ใหม่
        diamondBuyIn=transaction.diamondBuyIn,   # ✅ ตรวจสอบว่าเป็น camelCase
        diamondSellOut=transaction.diamondSellOut, # ✅ ตรวจสอบว่าเป็น camelCase
        platedGold=transaction.platedGold,     # ✅ ตรวจสอบว่าเป็น camelCase
    )

    db.add(db_transaction)
    db.commit()
    db.refresh(db_transaction)
    return db_transaction

# 📌 Endpoint สำหรับดึงรายการสรุปยอดทั้งหมด
@router.get("/all-gold-transactions/list", response_model=list[AllGoldTransactionsResponse])
def get_all_gold_transactions(db: Session = Depends(get_db)):
    # ดึงข้อมูลจากตาราง AllGoldTransaction และเรียงตามวันที่ล่าสุด
    transactions = db.query(AllGoldTransaction).order_by(AllGoldTransaction.date.desc()).all()

    # ✅ เพิ่มการจัดการค่า None สำหรับคอลัมน์ใหม่ก่อนส่งกลับ
    # การทำแบบนี้จะช่วยให้มั่นใจว่าค่าที่เป็น None ใน DB จะถูกเปลี่ยนเป็น 0.0
    # ก่อนที่จะถูก Pydantic schema แปลงเป็น Response
    processed_transactions = []
    for t in transactions:
        t.diamondBuyIn = t.diamondBuyIn or 0.0
        t.diamondSellOut = t.diamondSellOut or 0.0
        t.platedGold = t.platedGold or 0.0
        processed_transactions.append(t)
    
    return processed_transactions

@router.get("/all-gold-transactions/{transaction_id}", response_model=AllGoldTransactionsResponse)
def get_gold_transaction(transaction_id: int, db: Session = Depends(get_db)):
    db_transaction = db.query(AllGoldTransaction).filter(
        AllGoldTransaction.id == transaction_id
    ).first()
    if db_transaction is None:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    db_transaction.diamondBuyIn = db_transaction.diamondBuyIn or 0.0
    db_transaction.diamondSellOut = db_transaction.diamondSellOut or 0.0
    db_transaction.platedGold = db_transaction.platedGold or 0.0
    return db_transaction

# 📌 Endpoint สำหรับอัปเดตรายการสรุปยอด (ถ้าคุณต้องการ)
@router.put("/all-gold-transactions/update/{transaction_id}", response_model=AllGoldTransactionsResponse)
def update_all_gold_transaction(transaction_id: int, transaction: AllGoldTransactionsCreate, db: Session = Depends(get_db)):
    db_transaction = db.query(AllGoldTransaction).filter(AllGoldTransaction.id == transaction_id).first()
    if db_transaction is None:
        raise HTTPException(status_code=404, detail="Transaction not found")

    # อัปเดตเฉพาะ field ที่มีการส่งมา
    for key, value in transaction.model_dump(exclude_unset=True).items():
        setattr(db_transaction, key, value)
    
    # ✅ จุดที่ 2: คำนวณ total_buy_in_exchange ใหม่เสมอเมื่อมีการอัปเดต buyIn หรือ exchange
    db_transaction.total_buy_in_exchange = (db_transaction.buyIn or 0.0) + (db_transaction.exchange or 0.0)

    db.commit()
    db.refresh(db_transaction)
    return db_transaction

# 📌 Endpoint สำหรับลบรายการสรุปยอด (ถ้าคุณต้องการ)
@router.delete("/all-gold-transactions/delete/{transaction_id}", status_code=204)
def delete_all_gold_transaction(transaction_id: int, db: Session = Depends(get_db)):
    db_transaction = db.query(AllGoldTransaction).filter(AllGoldTransaction.id == transaction_id).first()
    if db_transaction is None:
        raise HTTPException(status_code=404, detail="Transaction not found")

    db.delete(db_transaction)
    db.commit()
    return {"ok": True} # ควร return Empty response สำหรับ status 204