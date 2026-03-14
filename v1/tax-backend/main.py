import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import ingestion, rag_chat, blockchain

# Initialization
app = FastAPI(
    title="Tax Copilot Intelligence Engine",
    description="Backend API for AI Document Processing, OCR, Vector Linking, and Blockchain Verification.",
    version="1.0.0"
)

# CORS setup to allow the Tauri frontend (localhost:1420) to communicate with us
origins = [
    "http://localhost:1420",
    "http://127.0.0.1:1420",
    "tauri://localhost",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount logical routers
app.include_router(ingestion.router, prefix="/api/v1/ingestion", tags=["Ingestion & OCR"])
app.include_router(rag_chat.router, prefix="/api/v1/rag", tags=["Conversational AI"])
app.include_router(blockchain.router, prefix="/api/v1/blockchain", tags=["Audit Trails"])

@app.get("/health")
def health_check():
    return {"status": "ok", "message": "Tax Copilot Engine is running natively."}

if __name__ == "__main__":
    import uvicorn
    # The frontend runs on 1420, we will run the backend on 8080
    uvicorn.run("main:app", host="127.0.0.1", port=8080, reload=True)
