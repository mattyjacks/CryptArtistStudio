from fastapi import APIRouter, UploadFile, File, BackgroundTasks, Query
from pydantic import BaseModel
from typing import List, Optional
import json
import time
from pathlib import Path
import os

from services.ai_linking import link_w8ben_to_payout
from services.tax_rules import apply_tax_rules

router = APIRouter()

# ---------------------------------------------------------------------------
# Local storage config (per-user, file-based)
# ---------------------------------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = Path(os.getenv("TAX_COPILOT_DATA_DIR", BASE_DIR / "data"))
BATCH_DIR = DATA_DIR / "batches"

DATA_DIR.mkdir(parents=True, exist_ok=True)
BATCH_DIR.mkdir(parents=True, exist_ok=True)

def process_document_task(filename: str):
    # Simulated OCR and LLM Extraction delay
    time.sleep(2)
    print(f"[{filename}] OCR Extracted tables. Identified as Bank Statement.")
    # In a real app, this calls AWS Textract or LangChain here
    pass

@router.post("/batch")
async def upload_batch(background_tasks: BackgroundTasks, files: List[UploadFile] = File(...)):
    """
    Receives 50+ documents from the frontend.
    Returns immediately while processing them asynchronously.

    All files and basic metadata are stored on the local filesystem
    under the per-user data directory (no external database required).
    """
    if not files:
        return {"message": "No files uploaded", "batch_id": None, "files": []}

    created_at = time.time()
    batch_id = f"batch_{int(created_at)}"
    batch_path = BATCH_DIR / batch_id
    batch_path.mkdir(parents=True, exist_ok=True)

    file_records = []

    for file in files:
        # Read content into memory once
        content = await file.read()
        file_size = len(content)

        # Persist original upload to local disk
        safe_name = Path(file.filename).name  # strip any path components
        dest_path = batch_path / safe_name
        with dest_path.open("wb") as f:
            f.write(content)

        # Queue the heavy OCR extraction (simulated)
        background_tasks.add_task(process_document_task, safe_name)

        file_records.append(
            {
                "filename": safe_name,
                "status": "processing",
                "size": file_size,
                "path": str(dest_path),
            }
        )

    # Persist lightweight batch index so other endpoints / future DB can use it
    index = {
        "batch_id": batch_id,
        "created_at": created_at,
        "file_count": len(file_records),
        "files": file_records,
    }
    index_path = batch_path / "index.json"
    with index_path.open("w", encoding="utf-8") as f:
        json.dump(index, f, indent=2)

    return {
        "message": f"Successfully queued {len(files)} documents for AI extraction.",
        "batch_id": batch_id,
        "files": file_records,
    }


@router.get("/dashboard")
async def get_dashboard(batch_id: Optional[str] = Query(None)):
    """
    Returns extracted transaction data for the given batch.

    Today this uses locally stored batch metadata plus the deterministic
    linking/tax rules helpers. In production this would query a database.
    """
    transactions = []

    if batch_id:
        index_path = BATCH_DIR / batch_id / "index.json"
        if index_path.exists():
            with index_path.open("r", encoding="utf-8") as f:
                index = json.load(f)

            for i, rec in enumerate(index.get("files", []), start=1):
                name = rec["filename"]
                # Simple synthetic amount based on file size for now
                amount = float(max(rec.get("size", 0) // 1000, 1))
                method = "Crypto (USDC)" if i % 2 == 0 else "PayPal"
                date = time.strftime("%Y-%m-%d", time.localtime(index.get("created_at", time.time())))

                link = link_w8ben_to_payout(name, method, amount)
                transactions.append(
                    {
                        "id": i,
                        "date": date,
                        "vendor": name,
                        "entity": "Individual",
                        "amount": amount,
                        "method": method,
                        "linkedW8": link["w8ben_document_id"] if link["status"] == "linked" else "Missing",
                        "rules": "Pending",
                        "verified": link.get("requires_blockchain_audit", False),
                    }
                )

    # Fallback demo data if no batch or missing metadata
    if not transactions:
        raw_extractions = [
            {"name": "Cloud Services LLC", "entity": "C-Corp", "amount": 1500.00, "method": "Crypto (USDC)", "date": "2023-11-15"},
            {"name": "John Doe", "entity": "Individual", "amount": 450.00, "method": "PayPal", "date": "2023-11-18"},
            {"name": "Jane Smith", "entity": "Individual", "amount": 2200.00, "method": "Xoom", "date": "2023-11-22"},
            {"name": "Crypto Dev DAO", "entity": "LLC", "amount": 5000.00, "method": "Crypto (ETH)", "date": "2023-12-01"},
        ]

        for i, ext in enumerate(raw_extractions, 1):
            link = link_w8ben_to_payout(ext["name"], ext["method"], ext["amount"])
            transactions.append(
                {
                    "id": i,
                    "date": ext["date"],
                    "vendor": ext["name"],
                    "entity": ext["entity"],
                    "amount": ext["amount"],
                    "method": ext["method"],
                    "linkedW8": link["w8ben_document_id"] if link["status"] == "linked" else "Missing",
                    "rules": "Pending",
                    "verified": link.get("requires_blockchain_audit", False),
                }
            )

    return {"batch_id": batch_id, "transactions": transactions}


class TaxRulesRequest(BaseModel):
    entity_type: str = "Individual"
    gross_receipts: float = 0
    region: str = "new hampshire"


@router.post("/apply-rules")
async def apply_rules(request: TaxRulesRequest):
    """
    Applies the deterministic tax rules engine for a given entity and region.
    """
    report = apply_tax_rules(
        {"entity_type": request.entity_type, "gross_receipts": request.gross_receipts},
        request.region,
    )
    return report
