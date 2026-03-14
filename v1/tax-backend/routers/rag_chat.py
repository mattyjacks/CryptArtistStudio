from pathlib import Path
from typing import List, Optional
import json
import os
import re

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from PyPDF2 import PdfReader

from .ingestion import BATCH_DIR

router = APIRouter()


class RAGRetrieveRequest(BaseModel):
    query: str
    batch_id: str
    top_k: int = 5


class RAGChunk(BaseModel):
    file: str
    score: float
    text: str


class RAGRetrieveResponse(BaseModel):
    batch_id: str
    query: str
    chunks: List[RAGChunk]


WORD_RE = re.compile(r"[A-Za-z0-9]+")


def _extract_text_from_pdf(path: Path) -> str:
    try:
        reader = PdfReader(str(path))
        texts: List[str] = []
        for page in reader.pages:
            txt = page.extract_text() or ""
            if txt.strip():
                texts.append(txt)
        return "\n\n".join(texts)
    except Exception:
        return ""


def _extract_text(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix == ".pdf":
        return _extract_text_from_pdf(path)
    if suffix in {".txt", ".md"}:
        try:
            return path.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            return ""
    # For images or other formats we currently have no extractor.
    return ""


def _chunk_text(text: str, max_chars: int = 800) -> List[str]:
    if not text.strip():
        return []
    chunks: List[str] = []
    start = 0
    length = len(text)
    while start < length:
        end = min(start + max_chars, length)
        # try to split on paragraph / sentence boundary
        split_at = text.rfind("\n\n", start, end)
        if split_at == -1:
            split_at = text.rfind(".", start, end)
        if split_at == -1 or split_at <= start + 200:
            split_at = end
        chunk = text[start:split_at].strip()
        if chunk:
            chunks.append(chunk)
        start = split_at
    return chunks


def _score_chunk(query: str, chunk: str) -> float:
    q_words = set(w.lower() for w in WORD_RE.findall(query))
    if not q_words:
        return 0.0
    c_words = [w.lower() for w in WORD_RE.findall(chunk)]
    overlap = sum(1 for w in c_words if w in q_words)
    return overlap / max(len(c_words), 1)


@router.post("/retrieve", response_model=RAGRetrieveResponse)
async def retrieve_context(request: RAGRetrieveRequest):
    """
    Lightweight RAG retrieval:

    - Loads the uploaded files for the given batch from local storage
    - Extracts text (PDF + .txt/.md)
    - Chunks it into small passages
    - Ranks passages by simple lexical overlap with the query
    - Returns the top_k chunks for the frontend to feed into the LLM
    """
    if not request.batch_id:
        raise HTTPException(status_code=400, detail="batch_id is required for retrieval.")

    index_path = BATCH_DIR / request.batch_id / "index.json"
    if not index_path.exists():
        raise HTTPException(status_code=404, detail=f"No batch metadata found for {request.batch_id}")

    with index_path.open("r", encoding="utf-8") as f:
        index = json.load(f)

    candidates: List[RAGChunk] = []
    for file_rec in index.get("files", []):
        rel_path = file_rec.get("path")
        if not rel_path:
            continue
        path = Path(rel_path)
        if not path.exists():
            continue

        text = _extract_text(path)
        for chunk in _chunk_text(text):
            score = _score_chunk(request.query, chunk)
            if score <= 0:
                continue
            candidates.append(
                RAGChunk(
                    file=path.name,
                    score=score,
                    text=chunk[:2000],  # safety cap
                )
            )

    # sort by score and keep top_k
    candidates.sort(key=lambda c: c.score, reverse=True)
    top = candidates[: max(1, request.top_k)]

    return RAGRetrieveResponse(batch_id=request.batch_id, query=request.query, chunks=top)
