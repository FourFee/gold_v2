from fastapi import APIRouter
from pydantic import BaseModel
from fastapi.responses import JSONResponse


router = APIRouter()

class IDCardData(BaseModel):
    citizen_id: str
    name_th: str
    address: str

# ตัวแปรเก็บข้อมูลล่าสุดแบบ in-memory
latest_card_data = None

@router.post("/idcard")
def receive_idcard(data: IDCardData):
    global latest_card_data
    latest_card_data = data
    print("✅ ได้รับข้อมูลบัตร:", data)
    return {"status": "ok"}

@router.get("/idcard/latest")
def get_latest_idcard():
    if latest_card_data:
        return latest_card_data
    return {"detail": "No card data available."}

@router.post("/idcard/clear")
def clear_idcard():
    global latest_card_data
    latest_card_data = None
    return JSONResponse(content={"message": "cleared"})
