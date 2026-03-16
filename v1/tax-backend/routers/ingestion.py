from fastapi import APIRouter, UploadFile, File, BackgroundTasks, Query, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import json
import time
from pathlib import Path
import os

from services.tax_rules import apply_tax_rules
from services.pipeline import analyze_document, mark_file_ready

router = APIRouter()

# ---------------------------------------------------------------------------
# Local storage config (per-user, file-based)
# ---------------------------------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = Path(os.getenv("TAX_COPILOT_DATA_DIR", BASE_DIR / "data"))
BATCH_DIR = DATA_DIR / "batches"

DATA_DIR.mkdir(parents=True, exist_ok=True)
BATCH_DIR.mkdir(parents=True, exist_ok=True)


def process_document_task(batch_id: str, filename: str) -> None:
    """
    Background pipeline for a single uploaded document.

    Today this is intentionally lightweight:
    - Reads the saved file from the batch folder
    - Runs the heuristic analysis pipeline
    - Writes a small <filename>.analysis.json blob next to the file

    This keeps all work local to the user's machine and creates a
    clear place to plug in real OCR/LLM/vector logic later.
    """
    batch_path = BATCH_DIR / batch_id
    path = batch_path / filename
    if not path.exists():
        return

    meta = analyze_document(path)
    out_path = batch_path / f"{filename}.analysis.json"
    try:
        with out_path.open("w", encoding="utf-8") as f:
            json.dump(meta, f, indent=2)
        # Flip the per-file status flag so the dashboard can reflect completion.
        mark_file_ready(batch_id, filename)
    except Exception:
        # Best-effort: pipeline failures should not crash the server
        print(f"[pipeline] Failed to write analysis for {path}")

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

        # Queue the document analysis pipeline
        background_tasks.add_task(process_document_task, batch_id, safe_name)

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
                status = rec.get("status", "processing")
                date = time.strftime("%Y-%m-%d", time.localtime(index.get("created_at", time.time())))

                # Try to enrich this neutral row with any metadata the
                # pipeline has produced for the file (e.g. W‑8BEN details).
                analysis_path = BATCH_DIR / index["batch_id"] / f"{name}.analysis.json"
                vendor_label = name
                entity = "Individual"
                method = "Unknown"
                rules_label = "Pending extraction"
                linked = "Pending"

                if analysis_path.exists():
                    try:
                        with analysis_path.open("r", encoding="utf-8") as af:
                            meta = json.load(af)
                        if meta.get("doc_type") == "w8ben_individual":
                            w8 = meta.get("w8ben") or {}
                            holder = w8.get("name") or name
                            vendor_label = f"W‑8BEN — {holder}"
                            rules_label = "Form W‑8BEN parsed"
                            linked = "Self"
                    except Exception:
                        pass

                transactions.append(
                    {
                        "id": i,
                        "date": date,
                        "vendor": vendor_label,
                        "entity": entity,
                        "amount": 0.0,
                        "method": method,
                        "linkedW8": linked,
                        "rules": rules_label,
                        "verified": False,
                        "status": status,
                        "filename": name,
                    }
                )

    return {"batch_id": batch_id, "transactions": transactions}


def _safe_filename(name: str) -> bool:
    """Ensure filename has no path components (no traversal)."""
    if not name or ".." in name or "/" in name or "\\" in name:
        return False
    return Path(name).name == name


@router.delete("/batch/{batch_id}/files/{filename}")
async def delete_batch_file(batch_id: str, filename: str):
    """
    Remove a single file from a batch: deletes the file and its analysis JSON,
    and updates index.json. Use the exact filename returned in the dashboard.
    """
    if not _safe_filename(filename):
        raise HTTPException(status_code=400, detail="Invalid filename")
    batch_path = BATCH_DIR / batch_id
    index_path = batch_path / "index.json"
    if not batch_path.exists() or not index_path.exists():
        raise HTTPException(status_code=404, detail="Batch not found")

    file_path = batch_path / filename
    if not file_path.is_file():
        raise HTTPException(status_code=404, detail="File not found in batch")

    analysis_path = batch_path / f"{filename}.analysis.json"
    try:
        file_path.unlink()
    except OSError as e:
        raise HTTPException(status_code=500, detail=f"Could not delete file: {e}")
    if analysis_path.exists():
        try:
            analysis_path.unlink()
        except OSError:
            pass

    with index_path.open("r", encoding="utf-8") as f:
        index = json.load(f)
    files = index.get("files", [])
    new_files = [r for r in files if r.get("filename") != filename]
    if len(new_files) == len(files):
        raise HTTPException(status_code=404, detail="File not found in batch index")
    index["files"] = new_files
    index["file_count"] = len(new_files)
    with index_path.open("w", encoding="utf-8") as f:
        json.dump(index, f, indent=2)

    return {"message": f"Deleted {filename}", "batch_id": batch_id, "files_remaining": len(new_files)}


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
