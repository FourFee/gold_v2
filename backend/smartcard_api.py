from fastapi import FastAPI
from pydantic import BaseModel
from datetime import datetime

app = FastAPI()

class IDCard(BaseModel):
    citizen_id: str
    name_th: str
    address: str

@app.post("/api/idcard")
def receive_idcard(data: IDCard):
    print(f"[{datetime.now()}] ได้รับข้อมูลบัตร:", data)
    return {"status": "ok"}
