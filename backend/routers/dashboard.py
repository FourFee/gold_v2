# path: gold/backend/routers/dashboard.py

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from database import get_db
from models import BarGold, AllGoldTransaction
from datetime import datetime, timedelta
from collections import defaultdict
from typing import Optional

router = APIRouter()

def get_period_label(date: datetime, period: str):
    if period == "day":
        return date.strftime("%d/%m")
    elif period == "week":
        start_of_week = date - timedelta(days=(date.weekday() + 2) % 7)
        end_of_week = start_of_week + timedelta(days=6)
        return f"{start_of_week.strftime('%d/%m')} - {end_of_week.strftime('%d/%m')}"
    else: # month
        return date.strftime("%b %Y")

def get_sortable_period_key(date: datetime, period: str):
    if period == "day":
        return date.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "week":
        return (date - timedelta(days=(date.weekday() + 2) % 7)).replace(hour=0, minute=0, second=0, microsecond=0)
    else: # month
        return date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

@router.get("/dashboard/summary")
def get_summary(
    period: str = Query("month"), 
    # สำหรับวัน
    specific_date: Optional[str] = Query(None),
    # สำหรับสัปดาห์
    week_start: Optional[str] = Query(None),
    week_end: Optional[str] = Query(None),
    # สำหรับเดือน
    month: Optional[int] = Query(None),
    year: Optional[int] = Query(None),
    # พารามิเตอร์ใหม่จาก frontend
    date_str: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    # 🔴 ปัญหา: ถ้าไม่มีพารามิเตอร์ที่ตรงกับเงื่อนไขใดๆ จะเกิด error
    # 🔴 ต้องเพิ่มเงื่อนไข default
    
    # ถ้า period=all ไม่กรองวันที่ ดึงข้อมูลทั้งหมด
    if period == "all":
        all_transactions_period = db.query(AllGoldTransaction).all()
        bar_transactions_period = db.query(BarGold).all()

        sell_out_total        = sum(t.sellOut or 0.0 for t in all_transactions_period)
        exchange_total        = sum(t.exchange or 0.0 for t in all_transactions_period)
        buy_in_total          = sum(t.buyIn or 0.0 for t in all_transactions_period)
        expenses_total        = sum(t.expenses or 0.0 for t in all_transactions_period)
        diamond_buy_in_total  = sum(t.diamondBuyIn or 0.0 for t in all_transactions_period)
        diamond_sell_out_total= sum(t.diamondSellOut or 0.0 for t in all_transactions_period)
        plated_gold_total     = sum(t.platedGold or 0.0 for t in all_transactions_period)
        redeem_total          = sum(t.redeem or 0.0 for t in all_transactions_period)
        interest_total        = sum(t.interest or 0.0 for t in all_transactions_period)
        pawn_total            = sum(t.pawn or 0.0 for t in all_transactions_period)

        bar_buy_transactions  = [t for t in bar_transactions_period if t.mode == "sell"]
        bar_sell_transactions = [t for t in bar_transactions_period if t.mode == "buy"]
        bar_buy_total_weight  = sum(t.weightBaht or 0.0 for t in bar_buy_transactions) * 15.24
        bar_sell_total_weight = sum(t.weightBaht or 0.0 for t in bar_sell_transactions) * 15.24
        bar_buy_amount        = sum(t.amount or 0.0 for t in bar_buy_transactions)
        bar_sell_amount       = sum(t.amount or 0.0 for t in bar_sell_transactions)
        total_bar_buy_baht    = sum(t.weightBaht or 0.0 for t in bar_buy_transactions)
        total_bar_sell_baht   = sum(t.weightBaht or 0.0 for t in bar_sell_transactions)

        return {
            "sellOut": sell_out_total, "exchange": exchange_total, "buyIn": buy_in_total,
            "bar_buy": bar_buy_total_weight, "bar_sell": bar_sell_total_weight,
            "plated_gold": plated_gold_total,
            "total_gold_flow": (buy_in_total + bar_buy_total_weight) - (sell_out_total + bar_sell_total_weight),
            "redeem": redeem_total, "interest": interest_total, "pawn": pawn_total,
            "total_pawn_flow": redeem_total - pawn_total, "expenses": expenses_total,
            "gold_out": exchange_total + sell_out_total,
            "diamondBuyIn": diamond_buy_in_total, "diamondSellOut": diamond_sell_out_total,
            "bar_buy_amount": bar_buy_amount, "bar_sell_amount": bar_sell_amount,
            "avg_bar_buy_price_per_baht":  bar_buy_amount / total_bar_buy_baht if total_bar_buy_baht > 0 else 0.0,
            "avg_bar_sell_price_per_baht": bar_sell_amount / total_bar_sell_baht if total_bar_sell_baht > 0 else 0.0,
            "avg_bar_buy_price_per_gram":  bar_buy_amount / bar_buy_total_weight if bar_buy_total_weight > 0 else 0.0,
            "avg_bar_sell_price_per_gram": bar_sell_amount / bar_sell_total_weight if bar_sell_total_weight > 0 else 0.0,
            "bar_profit": bar_sell_amount - bar_buy_amount,
        }

    # จัดลำดับความสำคัญของพารามิเตอร์
    # 1. ถ้ามี start_date และ end_date จาก frontend (priority สูงสุด)
    if start_date and end_date:
        start_date_obj = datetime.strptime(start_date, '%Y-%m-%d')
        end_date_obj = datetime.strptime(end_date, '%Y-%m-%d').replace(hour=23, minute=59, second=59)
    
    # 2. ถ้ามีพารามิเตอร์เฉพาะเจาะจงตาม period
    elif period == "day" and (specific_date or date_str):
        date_to_use = specific_date if specific_date else date_str
        start_date_obj = datetime.strptime(date_to_use, '%Y-%m-%d')
        end_date_obj = start_date_obj.replace(hour=23, minute=59, second=59)
    
    elif period == "week" and week_start and week_end:
        start_date_obj = datetime.strptime(week_start, '%Y-%m-%d')
        end_date_obj = datetime.strptime(week_end, '%Y-%m-%d').replace(hour=23, minute=59, second=59)
    
    elif period == "month" and month and year:
        start_date_obj = datetime(year, month, 1)
        if month == 12:
            end_date_obj = datetime(year + 1, 1, 1) - timedelta(seconds=1)
        else:
            end_date_obj = datetime(year, month + 1, 1) - timedelta(seconds=1)
    
    # 3. ถ้ามีแค่ date_str อย่างเดียว (จาก frontend)
    elif date_str:
        selected_date = datetime.strptime(date_str, '%Y-%m-%d')
        
        if period == "day":
            start_date_obj = selected_date.replace(hour=0, minute=0, second=0, microsecond=0)
            end_date_obj = selected_date.replace(hour=23, minute=59, second=59, microsecond=999999)
        elif period == "week":
            # คำนวณสัปดาห์เริ่มจากวันจันทร์
            start_date_obj = selected_date - timedelta(days=(selected_date.weekday() + 2) % 7)
            start_date_obj = start_date_obj.replace(hour=0, minute=0, second=0, microsecond=0)
            end_date_obj = start_date_obj + timedelta(days=6, hours=23, minutes=59, seconds=59, microseconds=999999)
        else:  # month
            start_date_obj = selected_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            next_month = start_date_obj.replace(month=start_date_obj.month+1, day=1) if start_date_obj.month < 12 else start_date_obj.replace(year=start_date_obj.year+1, month=1, day=1)
            end_date_obj = next_month - timedelta(microseconds=1)
    
    # 4. ถ้าไม่มีพารามิเตอร์ใดๆเลย (default)
    else:
        today = datetime.today()
        if period == "day":
            start_date_obj = today.replace(hour=0, minute=0, second=0, microsecond=0)
            end_date_obj = today.replace(hour=23, minute=59, second=59, microsecond=999999)
        elif period == "week":
            start_date_obj = today - timedelta(days=(today.weekday() + 2) % 7)
            start_date_obj = start_date_obj.replace(hour=0, minute=0, second=0, microsecond=0)
            end_date_obj = start_date_obj + timedelta(days=6, hours=23, minutes=59, seconds=59, microseconds=999999)
        else:  # month
            start_date_obj = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            next_month = start_date_obj.replace(month=start_date_obj.month+1, day=1) if start_date_obj.month < 12 else start_date_obj.replace(year=start_date_obj.year+1, month=1, day=1)
            end_date_obj = next_month - timedelta(microseconds=1)

    # ✅ ตอนนี้ได้ start_date_obj และ end_date_obj แล้ว
    
    # ดึงข้อมูลในช่วงวันที่ที่กำหนด
    all_transactions_period = db.query(AllGoldTransaction).filter(
        AllGoldTransaction.date >= start_date_obj,
        AllGoldTransaction.date <= end_date_obj
    ).all()
    
    bar_transactions_period = db.query(BarGold).filter(
        BarGold.date >= start_date_obj,
        BarGold.date <= end_date_obj
    ).all()
    
    # ✅ แก้ไข: เพิ่มการคำนวณ diamondBuyIn และ diamondSellOut
    sell_out_total = sum(t.sellOut or 0.0 for t in all_transactions_period)
    exchange_total = sum(t.exchange or 0.0 for t in all_transactions_period)
    buy_in_total = sum(t.buyIn or 0.0 for t in all_transactions_period)
    expenses_total = sum(t.expenses or 0.0 for t in all_transactions_period)
    diamond_buy_in_total = sum(t.diamondBuyIn or 0.0 for t in all_transactions_period)
    diamond_sell_out_total = sum(t.diamondSellOut or 0.0 for t in all_transactions_period)
    
    # 📌 คำนวณยอดทองแท่งเป็นน้ำหนัก (รวมราคาด้วย)
    bar_buy_transactions = [t for t in bar_transactions_period if t.mode == "sell"]
    bar_sell_transactions = [t for t in bar_transactions_period if t.mode == "buy"]
    
    bar_buy_total_weight = sum(t.weightBaht or 0.0 for t in bar_buy_transactions) * 15.24
    bar_sell_total_weight = sum(t.weightBaht or 0.0 for t in bar_sell_transactions) * 15.24
    
    # ✅ แก้ไข: ใช้ฟิลด์ amount แทน (จำนวนเงินบาท)
    bar_buy_amount = sum(t.amount or 0.0 for t in bar_buy_transactions)  # ทองแท่งซื้อเข้า
    bar_sell_amount = sum(t.amount or 0.0 for t in bar_sell_transactions)  # ทองแท่งขายออก
    
    # ✅ แก้ไข: คำนวณราคาเฉลี่ยต่อบาทน้ำหนัก
    total_bar_buy_baht = sum(t.weightBaht or 0.0 for t in bar_buy_transactions)
    total_bar_sell_baht = sum(t.weightBaht or 0.0 for t in bar_sell_transactions)
    
    avg_bar_buy_price_per_baht = bar_buy_amount / total_bar_buy_baht if total_bar_buy_baht > 0 else 0.0
    avg_bar_sell_price_per_baht = bar_sell_amount / total_bar_sell_baht if total_bar_sell_baht > 0 else 0.0
    
    # ✅ แก้ไข: คำนวณราคาเฉลี่ยต่อกรัม
    avg_bar_buy_price_per_gram = bar_buy_amount / bar_buy_total_weight if bar_buy_total_weight > 0 else 0.0
    avg_bar_sell_price_per_gram = bar_sell_amount / bar_sell_total_weight if bar_sell_total_weight > 0 else 0.0
    
    plated_gold_total = sum(t.platedGold or 0.0 for t in all_transactions_period)

    total_gold_flow = (buy_in_total + bar_buy_total_weight) - (sell_out_total + bar_sell_total_weight)
    gold_out = exchange_total + sell_out_total 

    redeem_total = sum(t.redeem or 0.0 for t in all_transactions_period)
    interest_total = sum(t.interest or 0.0 for t in all_transactions_period)
    pawn_total = sum(t.pawn or 0.0 for t in all_transactions_period)
    total_pawn_flow = redeem_total - pawn_total

    return {
        "sellOut": sell_out_total,
        "exchange": exchange_total,
        "buyIn": buy_in_total,
        "bar_buy": bar_buy_total_weight,
        "bar_sell": bar_sell_total_weight,
        "plated_gold": plated_gold_total,
        "total_gold_flow": total_gold_flow,
        "redeem": redeem_total,
        "interest": interest_total,
        "pawn": pawn_total,
        "total_pawn_flow": total_pawn_flow,
        "expenses": expenses_total,
        "gold_out": gold_out,
        "diamondBuyIn": diamond_buy_in_total,
        "diamondSellOut": diamond_sell_out_total,
        
        # ✅ เพิ่ม: ข้อมูลราคาทองแท่ง
        "bar_buy_amount": bar_buy_amount,  # จำนวนเงินทองแท่งซื้อเข้า (บาท)
        "bar_sell_amount": bar_sell_amount,  # จำนวนเงินทองแท่งขายออก (บาท)
        "avg_bar_buy_price_per_baht": avg_bar_buy_price_per_baht,  # ราคาเฉลี่ยต่อบาทน้ำหนัก (ซื้อเข้า)
        "avg_bar_sell_price_per_baht": avg_bar_sell_price_per_baht,  # ราคาเฉลี่ยต่อบาทน้ำหนัก (ขายออก)
        "avg_bar_buy_price_per_gram": avg_bar_buy_price_per_gram,  # ราคาเฉลี่ยต่อกรัม (ซื้อเข้า)
        "avg_bar_sell_price_per_gram": avg_bar_sell_price_per_gram,  # ราคาเฉลี่ยต่อกรัม (ขายออก)
        "bar_profit": bar_sell_amount - bar_buy_amount,  # กำไรทองแท่ง
    }


@router.get("/dashboard/all-transactions-graph")
def get_all_transactions_graph_data(
    period: str = Query("month"), 
    date_str: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    # period=all — ดึงทุกข้อมูล group by month ไม่กรองวันที่
    if period == "all":
        transactions  = db.query(AllGoldTransaction).order_by(AllGoldTransaction.date).all()
        bar_transactions = db.query(BarGold).order_by(BarGold.date).all()
        agg = defaultdict(lambda: {"redeem":0.0,"interest":0.0,"pawn":0.0,"buyIn":0.0,
            "exchange":0.0,"sellOut":0.0,"expenses":0.0,"diamondBuyIn":0.0,
            "diamondSellOut":0.0,"platedGold":0.0,"bar_buy":0.0,"bar_sell":0.0,
            "gold_out":0.0,"total_gold_flow":0.0,"total_pawn_flow":0.0})
        for t in transactions:
            k = t.date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            agg[k]["redeem"]       += t.redeem or 0.0
            agg[k]["interest"]     += t.interest or 0.0
            agg[k]["pawn"]         += t.pawn or 0.0
            agg[k]["buyIn"]        += t.buyIn or 0.0
            agg[k]["exchange"]     += t.exchange or 0.0
            agg[k]["sellOut"]      += t.sellOut or 0.0
            agg[k]["expenses"]     += t.expenses or 0.0
            agg[k]["diamondBuyIn"] += t.diamondBuyIn or 0.0
            agg[k]["diamondSellOut"]+= t.diamondSellOut or 0.0
            agg[k]["platedGold"]   += t.platedGold or 0.0
            agg[k]["gold_out"]     += (t.sellOut or 0.0) + (t.exchange or 0.0)
        for b in bar_transactions:
            k = b.date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            if b.mode == "sell": agg[k]["bar_buy"]  += (b.weightBaht or 0.0) * 15.24
            elif b.mode == "buy": agg[k]["bar_sell"] += (b.weightBaht or 0.0) * 15.24
        for k in agg:
            agg[k]["total_pawn_flow"] = agg[k]["redeem"] - agg[k]["pawn"]
            agg[k]["total_gold_flow"] = (agg[k]["buyIn"] + agg[k]["bar_buy"]) - (agg[k]["sellOut"] + agg[k]["bar_sell"])
        result = []
        for k in sorted(agg.keys()):
            result.append({"label": k.strftime("%b %Y"), "date": k.isoformat(), **agg[k]})
        return result

    # ✅ แก้ไข: จัดการกับพารามิเตอร์ต่างๆ

    # 1. ถ้ามี start_date และ end_date จาก frontend
    if start_date and end_date:
        start_date_for_query = datetime.strptime(start_date, '%Y-%m-%d')
        end_date_for_query = datetime.strptime(end_date, '%Y-%m-%d')
        selected_date = end_date_for_query
    # 2. ถ้ามีแค่ date_str
    elif date_str:
        selected_date = datetime.strptime(date_str, '%Y-%m-%d')
    # 3. Default
    else:
        selected_date = datetime.today().replace(hour=0, minute=0, second=0, microsecond=0)
    
    # ถ้าไม่มี start_date, end_date ต้องคำนวณตาม period
    if not (start_date and end_date):
        if period == "day":
            # 30 วันย้อนหลัง
            num_periods = 30
            start_date_for_query = selected_date - timedelta(days=num_periods - 1)
        elif period == "week":
            # 3 เดือนย้อนหลัง (ประมาณ 12 สัปดาห์)
            num_periods = 12
            start_of_selected_week = selected_date - timedelta(days=(selected_date.weekday() + 2) % 7)
            start_date_for_query = start_of_selected_week - timedelta(weeks=num_periods - 1)
        else:  # month
            # 12 เดือนย้อนหลัง
            num_periods = 12
            start_of_selected_month = selected_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            target_year = start_of_selected_month.year
            target_month = start_of_selected_month.month - (num_periods - 1)
            while target_month <= 0:
                target_month += 12
                target_year -= 1
            start_date_for_query = datetime(target_year, target_month, 1)
        
        end_date_for_query = selected_date
    

    # ดึงข้อมูลในช่วงวันที่ที่กำหนด
    transactions = db.query(AllGoldTransaction).filter(
        AllGoldTransaction.date >= start_date_for_query,
        AllGoldTransaction.date <= end_date_for_query
    ).order_by(AllGoldTransaction.date).all()
    
    bar_transactions = db.query(BarGold).filter(
        BarGold.date >= start_date_for_query,
        BarGold.date <= end_date_for_query
    ).order_by(BarGold.date).all()
    
    # ใช้ defaultdict สำหรับรวมข้อมูล
    raw_aggregated_data = defaultdict(lambda: {
        "gold_out": 0.0,
        "redeem": 0.0,
        "interest": 0.0,
        "pawn": 0.0,
        "buyIn": 0.0,
        "exchange": 0.0,
        "sellOut": 0.0,
        "expenses": 0.0,
        "diamondBuyIn": 0.0,
        "diamondSellOut": 0.0,
        "platedGold": 0.0,
        "bar_buy": 0.0,
        "bar_sell": 0.0,
        "total_gold_flow": 0.0,
        "total_pawn_flow": 0.0,
    })

    # รวมข้อมูลจาก AllGoldTransaction
    for t in transactions:
        key = get_sortable_period_key(t.date, period)
        
        raw_aggregated_data[key]["gold_out"] += (t.sellOut or 0.0) + (t.exchange or 0.0)
        raw_aggregated_data[key]["redeem"] += (t.redeem or 0.0)
        raw_aggregated_data[key]["interest"] += (t.interest or 0.0)
        raw_aggregated_data[key]["pawn"] += (t.pawn or 0.0)
        raw_aggregated_data[key]["buyIn"] += (t.buyIn or 0.0)
        raw_aggregated_data[key]["exchange"] += (t.exchange or 0.0)
        raw_aggregated_data[key]["sellOut"] += (t.sellOut or 0.0)
        raw_aggregated_data[key]["expenses"] += (t.expenses or 0.0)
        raw_aggregated_data[key]["diamondBuyIn"] += (t.diamondBuyIn or 0.0)
        raw_aggregated_data[key]["diamondSellOut"] += (t.diamondSellOut or 0.0)
        raw_aggregated_data[key]["platedGold"] += (t.platedGold or 0.0)

    # รวมข้อมูลจาก BarGold
    for b in bar_transactions:
        key = get_sortable_period_key(b.date, period)
        if b.mode == "sell":  # ซื้อเข้า (ลูกค้าขายให้ร้าน)
            raw_aggregated_data[key]["bar_buy"] += (b.weightBaht or 0.0) * 15.24
        elif b.mode == "buy":  # ขายออก (ร้านขายให้ลูกค้า)
            raw_aggregated_data[key]["bar_sell"] += (b.weightBaht or 0.0) * 15.24

    # คำนวณ total_pawn_flow และ total_gold_flow
    for key in raw_aggregated_data:
        data = raw_aggregated_data[key]
        data["total_pawn_flow"] = (data["redeem"] or 0.0) - (data["pawn"] or 0.0)
        data["total_gold_flow"] = (
            (data["buyIn"] or 0.0) +
            (data["bar_buy"] or 0.0)
        ) - (
            (data["sellOut"] or 0.0) +
            (data["bar_sell"] or 0.0)
        )

    # ถ้าไม่ได้ระบุ start_date และ end_date ให้สร้าง expected_period_keys ตาม num_periods
    if not (start_date and end_date):
        # สร้างวันที่ที่คาดหวัง
        expected_period_keys = []
        current_period_iter = start_date_for_query
        
        for _ in range(num_periods):
            key = get_sortable_period_key(current_period_iter, period)
            expected_period_keys.append(key)
            
            if period == "day":
                current_period_iter += timedelta(days=1)
            elif period == "week":
                current_period_iter += timedelta(weeks=1)
            else: # month
                if current_period_iter.month == 12:
                    current_period_iter = current_period_iter.replace(year=current_period_iter.year + 1, month=1, day=1)
                else:
                    current_period_iter = current_period_iter.replace(month=current_period_iter.month + 1, day=1)
    else:
        # ถ้าระบุ start_date และ end_date ให้สร้างช่วงวันที่ตาม period
        expected_period_keys = []
        current_period_iter = start_date_for_query
        
        while current_period_iter <= end_date_for_query:
            key = get_sortable_period_key(current_period_iter, period)
            # ตรวจสอบว่า key นี้ยังไม่มีใน expected_period_keys (ป้องกันซ้ำ)
            if key not in [k for k in expected_period_keys]:
                expected_period_keys.append(key)
            
            if period == "day":
                current_period_iter += timedelta(days=1)
            elif period == "week":
                current_period_iter += timedelta(weeks=1)
            else: # month
                if current_period_iter.month == 12:
                    current_period_iter = current_period_iter.replace(year=current_period_iter.year + 1, month=1, day=1)
                else:
                    current_period_iter = current_period_iter.replace(month=current_period_iter.month + 1, day=1)

    # สร้างข้อมูลสุดท้าย
    final_all_transactions_graph_data = []
    for expected_key in expected_period_keys:
        label = get_period_label(expected_key, period)
        data_point = raw_aggregated_data.get(expected_key, {
            "gold_out": 0.0,
            "redeem": 0.0,
            "interest": 0.0,
            "pawn": 0.0,
            "buyIn": 0.0,
            "exchange": 0.0,
            "sellOut": 0.0,
            "expenses": 0.0,
            "diamondBuyIn": 0.0,
            "diamondSellOut": 0.0,
            "platedGold": 0.0,
            "total_gold_flow": 0.0,
            "bar_buy": 0.0,
            "bar_sell": 0.0,
            "total_pawn_flow": 0.0,
        })
        final_all_transactions_graph_data.append({
            "label": label,
            "date": expected_key.strftime('%Y-%m-%d'),
            **data_point
        })

    return final_all_transactions_graph_data

@router.get("/dashboard/bar-gold-stock")
def get_bar_gold_stock(db: Session = Depends(get_db)):
    """Calculates and returns the total remaining stock of bar gold in grams."""
    total_buy_weight = db.query(func.sum(BarGold.weightBaht)).filter(
        and_(BarGold.mode == "buy", BarGold.weightBaht >= 5)
    ).scalar() or 0.0
    total_sell_weight = db.query(func.sum(BarGold.weightBaht)).filter(
        and_(BarGold.mode == "sell", BarGold.weightBaht >= 5)
    ).scalar() or 0.0
    # 3. ยอดแลกเป็นรูปพรรณ (Bar Gold Exchange) (ลด Stock)
    exchange_weight = db.query(func.sum(BarGold.weightBaht)).filter(
        and_(BarGold.mode == "exchange_to_ornament", BarGold.weightBaht >= 5)
    ).scalar() or 0.0

    remaining_baht = total_sell_weight - total_buy_weight - exchange_weight
    remaining_grams = remaining_baht * 15.24

    if remaining_baht < 4:
        remaining_baht = 0.0
        remaining_grams = 0.0

    return {
        "remaining_baht": remaining_baht,
        "remaining_grams": remaining_grams,
    }