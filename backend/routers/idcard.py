from fastapi import APIRouter
from pydantic import BaseModel
from fastapi.responses import JSONResponse
from datetime import datetime, timezone, timedelta

router = APIRouter()

CARD_TTL_SECONDS = 60

class IDCardData(BaseModel):
    citizen_id: str
    name_th: str
    address: str

latest_card_data: IDCardData | None = None
latest_card_time: datetime | None = None

@router.post("/idcard")
def receive_idcard(data: IDCardData):
    global latest_card_data, latest_card_time
    latest_card_data = data
    latest_card_time = datetime.now(timezone.utc)
    return {"status": "ok"}

@router.get("/idcard/latest")
def get_latest_idcard():
    global latest_card_data, latest_card_time
    if latest_card_data and latest_card_time:
        if datetime.now(timezone.utc) - latest_card_time < timedelta(seconds=CARD_TTL_SECONDS):
            return latest_card_data
        latest_card_data = None
        latest_card_time = None
    return {"detail": "No card data available."}

@router.post("/idcard/clear")
def clear_idcard():
    global latest_card_data, latest_card_time
    latest_card_data = None
    latest_card_time = None
    return JSONResponse(content={"message": "cleared"})
