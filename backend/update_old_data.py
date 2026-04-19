# path: update_old_data.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import AllGoldTransaction, Base  # ตรวจสอบว่า models.py อยู่ใน path เดียวกันหรือนำเข้าได้ถูกต้อง

# กำหนด URL ของฐานข้อมูลของคุณ
# ตรวจสอบให้แน่ใจว่าตรงกับที่ใช้ใน database.py ของ FastAPI
DATABASE_URL = "sqlite:///./gold_data.db" # ตัวอย่างสำหรับ SQLite ถ้าใช้ PostgreSQL ให้เปลี่ยนเป็น "postgresql://user:password@host:port/dbname"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def update_expenses_for_old_data():
    db = SessionLocal()
    try:
        # ดึงข้อมูล AllGoldTransaction ทั้งหมดที่ expenses เป็น NULL หรือไม่มีค่า (NaN)
        # SQLAlchemy จะแปลง None เป็น NULL ใน SQL
        # เราอัปเดตเฉพาะรายการที่ expenses เป็น NULL
        transactions_to_update = db.query(AllGoldTransaction).filter(AllGoldTransaction.expenses == None).all()

        if not transactions_to_update:
            print("ไม่พบข้อมูลเก่าในคอลัมน์ 'expenses' ที่เป็น NULL หรือไม่มีค่าที่ต้องอัปเดต")
            return

        print(f"พบ {len(transactions_to_update)} รายการที่ 'expenses' เป็น NULL จะทำการอัปเดตเป็น 0.0")

        for transaction in transactions_to_update:
            if transaction.expenses is None:
                transaction.expenses = 0.0 # กำหนดค่า expenses ให้เป็น 0.0

            # ถ้าต้องการอัปเดต diamondBuyIn และ diamondSellOut ที่เป็น NULL ด้วย
            if transaction.diamondBuyIn is None:
                transaction.diamondBuyIn = 0.0
            if transaction.diamondSellOut is None:
                transaction.diamondSellOut = 0.0

            # นอกจากนี้ ให้คำนวณ total_buy_in_exchange ใหม่ด้วย
            # เพื่อให้มั่นใจว่าค่านี้ถูกต้องสำหรับข้อมูลเก่าเช่นกัน
            transaction.total_buy_in_exchange = (transaction.buyIn or 0.0) + (transaction.exchange or 0.0)


        db.commit() # ยืนยันการเปลี่ยนแปลง
        print("อัปเดตข้อมูลเก่าในคอลัมน์ 'expenses', 'diamondBuyIn', 'diamondSellOut' และ 'total_buy_in_exchange' เสร็จสมบูรณ์แล้ว!")

    except Exception as e:
        db.rollback() # ยกเลิกการเปลี่ยนแปลงหากมีข้อผิดพลาด
        print(f"เกิดข้อผิดพลาด: {e}")
    finally:
        db.close() # ปิด session

if __name__ == "__main__":
    # สร้างตารางทั้งหมด (ถ้ายังไม่มี)
    # ควรทำในขั้นตอนการ setup แอปพลิเคชันครั้งแรก
    # Base.metadata.create_all(bind=engine)
    
    update_expenses_for_old_data()