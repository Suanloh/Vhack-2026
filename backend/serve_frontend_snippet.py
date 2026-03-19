from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path

app = FastAPI()

FRONTEND_DIR = Path(__file__).resolve().parent / "frontend_dist"

# Mount assets if frontend build exists
if FRONTEND_DIR.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")

# Optional: if you want explicit SPA fallback instead of html=True behavior:
# @app.get("/{full_path:path}")
# async def spa_fallback(full_path: str):
#     index = FRONTEND_DIR / "index.html"
#     if index.exists():
#         return FileResponse(index)
#     return {"detail": "Frontend not built"}