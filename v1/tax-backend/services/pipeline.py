from __future__ import annotations

from pathlib import Path
from typing import Dict, Any, List, Optional
import re
import json
import os

from PyPDF2 import PdfReader

# Local replica of the storage layout used in routers.ingestion.
# We deliberately avoid importing from routers.ingestion to prevent
# circular imports at startup.
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = Path(os.getenv("TAX_INFO_BOT_DATA_DIR", BASE_DIR / "data"))
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
    is_bank_statement = (
        "account summary" in lowered
        and "account number" in lowered
        and "statement" in lowered
    )
    if is_w8ben:
        doc_type = "w8ben_individual"
    elif is_bank_statement:
        doc_type = "bank_statement"
    else:
        doc_type = "unknown"

    # Short preview / summary for debugging and future UI use
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    preview_text = "\n".join(lines[:10])[:2000] if lines else ""

    w8ben_meta: Dict[str, Any] = {}
    statement_meta: Dict[str, Any] = {}
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
        # If the extracted name looks like an address line or is missing,
        # try a conservative fallback: uppercase name-like line.
        name = (w8ben_meta.get("name") or "").strip()
        bad_name = (
            not name
            or any(tok in name.lower() for tok in ["address", "street", "apt", "suite", "p.o.", "po box", "in-care-of"])
            or any(ch.isdigit() for ch in name)
        )
        if bad_name:
            for ln in lines:
                stripped = ln.strip()
                if len(stripped) < 3:
                    continue
                if any(tok in stripped.lower() for tok in ["address", "street", "apt", "suite", "p.o.", "po box", "in-care-of"]):
                    continue
                if any(ch.isdigit() for ch in stripped):
                    continue
                if stripped.upper() != stripped:
                    continue
                parts = stripped.split()
                if 1 < len(parts) <= 5:
                    w8ben_meta["name"] = stripped
                    break
    elif is_bank_statement:
        holder = ""
        period = ""
        account_number = ""

        period_match = re.search(
            r"for\s+([A-Za-z]+\s+\d{1,2},\s+\d{4}\s+to\s+[A-Za-z]+\s+\d{1,2},\s+\d{4})",
            text,
            flags=re.IGNORECASE,
        )
        if period_match:
            period = period_match.group(1).strip()

        account_match = re.search(r"account number[:\s]+([0-9 ]{6,})", text, flags=re.IGNORECASE)
        if account_match:
            account_number = account_match.group(1).strip()

        for ln in lines:
            stripped = ln.strip()
            if len(stripped) < 3:
                continue
            if not stripped.replace(" ", "").isalpha():
                continue
            if stripped.upper() != stripped:
                continue
            if "BANK" in stripped:
                continue
            if len(stripped.split()) >= 2:
                holder = stripped
                break

        if holder:
            statement_meta["account_holder"] = holder
        if period:
            statement_meta["statement_period"] = period
        if account_number:
            statement_meta["account_number"] = account_number

        transactions = _extract_statement_transactions(text)
        if transactions:
            statement_meta["transactions"] = transactions
            deposits_total = sum(tx["amount"] for tx in transactions if tx["amount"] > 0)
            withdrawals_total = sum(tx["amount"] for tx in transactions if tx["amount"] < 0)
            statement_meta["deposits_total"] = round(deposits_total, 2)
            statement_meta["withdrawals_total"] = round(withdrawals_total, 2)
            statement_meta["net_total"] = round(deposits_total + withdrawals_total, 2)

    return {
        "filename": path.name,
        "doc_type": doc_type,
        "is_w8ben": is_w8ben,
        "is_bank_statement": is_bank_statement,
        "text_length": len(text),
        "preview": preview_text,
        "w8ben": w8ben_meta or None,
        "statement": statement_meta or None,
    }


def _extract_statement_transactions(text: str) -> List[Dict[str, Any]]:
    lowered = text.lower()
    headings = {
        "deposits and other additions": "deposit",
        "withdrawals and other subtractions": "withdrawal",
        "atm and debit card subtractions": "withdrawal",
        "service fees": "fee",
    }
    heading_positions = []
    for heading, category in headings.items():
        idx = lowered.find(heading)
        while idx != -1:
            heading_positions.append((idx, heading, category))
            idx = lowered.find(heading, idx + 1)
    heading_positions.sort(key=lambda x: x[0])

    def _category_for_pos(pos: int) -> Optional[str]:
        last = None
        for idx, _, category in heading_positions:
            if idx <= pos:
                last = category
            else:
                break
        return last

    pattern = re.compile(r"(\d{2}/\d{2}/\d{2})\s+(.+?)\s+(-?\$?\d+\.\d{2})")
    results: List[Dict[str, Any]] = []
    for match in pattern.finditer(text):
        date = match.group(1)
        description = " ".join(match.group(2).split())
        amount_raw = match.group(3).replace("$", "")
        try:
            amount = float(amount_raw)
        except ValueError:
            continue

        if any(tag in description.lower() for tag in ["total", "page", "account summary"]):
            continue

        category = _category_for_pos(match.start())
        if category in ("withdrawal", "fee") and amount > 0:
            amount = -amount

        results.append(
            {
                "date": date,
                "description": description,
                "amount": amount,
                "category": category or "unknown",
            }
        )

    return results


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


