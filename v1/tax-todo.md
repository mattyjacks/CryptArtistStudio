## Tax Copilot – Remaining Work vs `tax.md`

This file tracks what is **still left to implement or harden** from `tax.md`. Items marked ✅ are mostly done; items without are TODO or need major upgrades.

---

### 1. Batch Uploading & Ingestion

- ✅ Basic drag‑and‑drop upload UI (`TaxBatchUpload`) and FastAPI `/api/v1/ingestion/batch` endpoint.
- Store uploads in a robust local structure (per‑batch folders with clear naming, optional max size / count limits).
- Add real **background queue / progress tracking** (e.g. task IDs, status polling) so the UI can show “processing” vs “done”.
- Plug in real **OCR / extraction pipeline** (Textract / Tesseract / other) instead of the current simulated `process_document_task`.

### 2. AI Data Extraction & 90% Automation

- Replace synthetic dashboard rows with **real parsed transactions** from OCR/LLM output:
  - Bank statements → dates, payees, amounts, methods.
  - W‑8BEN forms → names, treaty country, TINs, withholding rates.
- Design a simple local persistence layer (JSON or SQLite) to cache structured results per `batch_id`.
- Implement a “90% automated” flow:
  - Mark which fields are AI‑inferred vs. user‑confirmed.
  - Allow inline edits in the dashboard that write back to the structured store.

### 3. Intelligent Linking (Vector Store)

- Introduce a real **vector database** (pgvector, Qdrant, FAISS, etc.) for:
  - Embeddings of W‑8BEN holders, transaction descriptions, counterparties.
  - Name + method matching between forms and payouts (PayPal, Xoom, Remitly, crypto).
- Wire `services/ai_linking.py` to:
  - Populate / query the vector store instead of using stubbed logic.
  - Expose clear linking confidence scores and reasons (for the UI).
- Extend the RAG retriever `/api/v1/rag/retrieve` to use the vector store instead of pure lexical overlap.

### 4. Blockchain Audit Trails

- Implement real **Web3 RPC integration** in `routers/blockchain.py`:
  - Use provider URLs (Alchemy, Infura, direct RPC) for Ethereum / Solana.
  - Fetch transaction details, amounts, timestamps, and recipients.
- Map on‑chain events to **uploaded transactions**:
  - Identify which payouts are “verified on‑chain”.
  - Surface any mismatches (amount, date, address) in the dashboard.
- Add proper error handling, rate limiting, and configurable RPC endpoints.

### 5. Conversational AI / RAG Chat

- ✅ Working RAG pipeline using:
  - Local file storage per batch (`data/batches/<batch_id>`).
  - Text extraction for PDFs / text files.
  - `/api/v1/rag/retrieve` to return relevant chunks.
  - Frontend prompt builder + OpenRouter/OpenAI via user‑supplied keys.
- Tighten grounding:
  - Include **structured transaction data** and W‑8BEN metadata (from the extraction layer), not just raw text chunks.
  - Make it easy to inspect “which sources were used” for each answer in the UI.
- Add targeted chat shortcuts, e.g. buttons:
  - “Show unlinked W‑8BEN payments”
  - “Summarize NH BPT/BET exposure for this batch”

### 6. Multi‑Entity & Regional Rules Engine

- Extend `services/tax_rules.py` beyond demo logic:
  - Full rules for Individuals, LLCs, C‑Corps, etc.
  - New Hampshire BPT/BET and Cavite BIR logic wired to **real gross receipts and entity data** from the extraction layer.
- Surface rules engine results more deeply in `TaxDashboard`:
  - Show which rules fired per transaction.
  - Provide a concise “filing checklist” view for the batch.

### 7. Backend Architecture & Testing

- Add **pytest** suites for:
  - `ingestion` (upload, index writing, local storage layout).
  - `rag_chat` retrieval ranking.
  - `tax_rules` correctness for representative NH/Cavite cases.
  - `blockchain` parsing logic with fixture JSON from real RPCs.
- Document how to run the backend (`python -m venv`, `pip install -r requirements.txt`, `python main.py`) and expected health checks.

### 8. UX Polish for Tax Copilot

- ✅ Tabs for Upload / Dashboard / Verification / RAG Chat; API online/offline indicator; active batch pill in header.
- Add **empty‑state** and error messaging for each tab:
  - No batch yet, backend offline, missing API keys, etc.
- Provide a small in‑app “Getting Started” guide or tooltip sequence aligned with `tax.md` (upload → dashboard → RAG chat → verification).

