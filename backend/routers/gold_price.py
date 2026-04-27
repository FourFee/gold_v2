from fastapi import APIRouter, HTTPException
import httpx

router = APIRouter(prefix="/gold-price", tags=["gold-price"])

_EXTERNAL = "https://api.chnwt.dev/thai-gold-api/latest"
_last: dict = {"data": None}  # เก็บไว้เฉพาะสำหรับ fallback ถ้า external ล่ม


@router.get("/live")
async def get_live_gold_price():
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            r = await client.get(_EXTERNAL)
            r.raise_for_status()
            data = r.json()["response"]
        _last["data"] = data
        return data
    except Exception:
        if _last["data"]:
            return _last["data"]
        raise HTTPException(status_code=503, detail="ไม่สามารถดึงราคาทองได้")
