from __future__ import annotations

from pathlib import Path
from typing import Dict, Any, List
import json
import os

from PyPDF2 import PdfReader

# Local replica of the storage layout used in routers.ingestion.
# We deliberately avoid importing from routers.ingestion to prevent
# circular imports at startup.
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = Path(os.getenv("TAX_COPILOT_DATA_DIR", BASE_DIR / "data"))
BATCH_DIR = DATA_DIR / "batches"


def _extract_text(path: Path) -> str:
    """
    Lightweight text extractor used by the ingestion pipeline.
    Currently supports PDFs; other types return empty string.
    """
    suffix = path.suffix.lower()
    if suffix == ".pdf":
        try:
            reader = PdfReader(str(path))
            pieces = []
            for page in reader.pages:
                txt = page.extract_text() or ""
                if txt.strip():
                    pieces.append(txt)
            return "\n\n".join(pieces)
        except Exception:
            return ""
    return ""


def analyze_document(path: Path) -> Dict[str, Any]:
    """
    Very early-stage analysis pipeline.

    - Extracts raw text (for now, from PDFs only)
    - Performs cheap heuristics to classify obvious W‑8BEN forms
    - Produces a small metadata blob per file that can later be
      enriched with real OCR/LLM extraction and vector embeddings.
    """
    text = _extract_text(path)
    lowered = text.lower()

    is_w8ben = "form w-8ben" in lowered
    doc_type = "w8ben_individual" if is_w8ben else "unknown"

    # Short preview / summary for debugging and future UI use
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    preview_text = "\n".join(lines[:10])[:2000] if lines else ""

    w8ben_meta: Dict[str, Any] = {}
    if is_w8ben:
        # Very lightweight heuristics based on common W‑8BEN layouts.
        # This is intentionally conservative: we prefer empty/None
        # over hallucinating incorrect tax data.
        for i, ln in enumerate(lines):
            l = ln.lower()
            if "name of individual" in l and "beneficial owner" in l:
                # Expect the actual name either after a colon or on the next line.
                parts = ln.split(":", 1)
                if len(parts) == 2 and parts[1].strip():
                    w8ben_meta["name"] = parts[1].strip()
                elif i + 1 < len(lines):
                    w8ben_meta["name"] = lines[i + 1].strip()
            if "country of citizenship" in l and "country of citizenship" not in w8ben_meta.get("source", ""):
                parts = ln.split(":", 1)
                if len(parts) == 2 and parts[1].strip():
                    w8ben_meta["country_citizenship"] = parts[1].strip()
                elif i + 1 < len(lines):
                    w8ben_meta["country_citizenship"] = lines[i + 1].strip()
            if "resident of" in l and "treaty" in l:
                # e.g. "I certify that the beneficial owner is a resident of <Country> within the meaning of the income tax treaty..."
                try:
                    after = ln.lower().split("resident of", 1)[1]
                    # crude extraction up to "within" or end of line
                    stop_tokens = ["within", "under", "for purposes"]
                    stop_idx = min(
                        (after.find(tok) for tok in stop_tokens if tok in after),
                        default=-1,
                    )
                    country = after[:stop_idx].strip(" .,:;") if stop_idx > 0 else after.strip(" .,:;")
                    if country:
                        w8ben_meta["treaty_country"] = country
                except Exception:
                    pass

    return {
        "filename": path.name,
        "doc_type": doc_type,
        "is_w8ben": is_w8ben,
        "text_length": len(text),
        "preview": preview_text,
        "w8ben": w8ben_meta or None,
    }


def mark_file_ready(batch_id: str, filename: str) -> None:
    """
    Helper to mark a single file as 'ready' inside the batch index.json.
    """
    index_path = BATCH_DIR / batch_id / "index.json"
    if not index_path.exists():
        return

    try:
        raw = index_path.read_text(encoding="utf-8")
        index = json.loads(raw)
        files: List[Dict[str, Any]] = index.get("files", [])
        changed = False
        for rec in files:
            if rec.get("filename") == filename:
                if rec.get("status") != "ready":
                    rec["status"] = "ready"
                    changed = True
                break
        if changed:
            index["files"] = files
            index_path.write_text(json.dumps(index, indent=2), encoding="utf-8")
    except Exception:
        print(f"[pipeline] Failed to update status for {batch_id}/{filename}")


