from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from routers import pawn, bar_gold, ornament_gold, dashboard, idcard, all_gold_transactions, bar_gold_exchange, print_receipt, gold_price, wholesaler, audit_log, search
from database import create_db
from audit import install_listeners
import os

app = FastAPI()

create_db()
install_listeners()

_prod_origin = os.environ.get("FRONTEND_URL", "http://178.128.80.147")
_dev_origins  = ["http://localhost:3000", "http://localhost:5173"]
_allowed = list({_prod_origin} | set(_dev_origins))

# ✅ CORS ก่อน
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Content-Type", "Authorization"],
)

# ✅ API Routes ทั้งหมดก่อน
app.include_router(pawn.router)
app.include_router(bar_gold.router)
app.include_router(ornament_gold.router)
app.include_router(dashboard.router)
app.include_router(idcard.router)
app.include_router(all_gold_transactions.router)
app.include_router(bar_gold_exchange.router)
app.include_router(print_receipt.router)
app.include_router(gold_price.router)
app.include_router(wholesaler.router)
app.include_router(audit_log.router)
app.include_router(search.router)

# ✅ Static files ไว้ท้ายสุดเสมอ
frontend_path = "/var/www/html/frontend"
if os.path.isdir(frontend_path):
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")