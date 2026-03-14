from fastapi import APIRouter, UploadFile, File, BackgroundTasks, Query
from pydantic import BaseModel
from typing import List, Optional
import time

from services.ai_linking import link_w8ben_to_payout
from services.tax_rules import apply_tax_rules

router = APIRouter()

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
    """
    file_records = []
    
    for file in files:
        # Save file to secure storage (simulated here)
        content = await file.read()
        file_size = len(content)
        
        # Queue the heavy OCR extraction
        background_tasks.add_task(process_document_task, file.filename)
        
        file_records.append({
            "filename": file.filename,
            "status": "processing",
            "size": file_size
        })
        
    return {
        "message": f"Successfully queued {len(files)} documents for AI extraction.",
        "batch_id": "batch_" + str(int(time.time())),
        "files": file_records
    }


@router.get("/dashboard")
async def get_dashboard(batch_id: Optional[str] = Query(None)):
    """
    Returns extracted transaction data for the given batch.
    In production this queries the DB; here we return AI-linked mock data.
    """
    raw_extractions = [
        {"name": "Cloud Services LLC", "entity": "C-Corp", "amount": 1500.00, "method": "Crypto (USDC)", "date": "2023-11-15"},
        {"name": "John Doe", "entity": "Individual", "amount": 450.00, "method": "PayPal", "date": "2023-11-18"},
        {"name": "Jane Smith", "entity": "Individual", "amount": 2200.00, "method": "Xoom", "date": "2023-11-22"},
        {"name": "Crypto Dev DAO", "entity": "LLC", "amount": 5000.00, "method": "Crypto (ETH)", "date": "2023-12-01"},
    ]

    transactions = []
    for i, ext in enumerate(raw_extractions, 1):
        link = link_w8ben_to_payout(ext["name"], ext["method"], ext["amount"])
        transactions.append({
            "id": i,
            "date": ext["date"],
            "vendor": ext["name"],
            "entity": ext["entity"],
            "amount": ext["amount"],
            "method": ext["method"],
            "linkedW8": link["w8ben_document_id"] if link["status"] == "linked" else "Missing",
            "rules": "Pending",
            "verified": link.get("requires_blockchain_audit", False),
        })

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
