from fastapi import APIRouter, UploadFile, File, BackgroundTasks
from typing import List
import time

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
