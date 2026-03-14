# Implementation Plan: Tax Copilot

**Goal Description:** 
Integrate the new AI-powered Tax Document Platform (named "Tax Copilot") as a fully-featured program within the existing CryptArtist Studio `v1` suite. 

This implementation **specifically guarantees the following feature set**:
1. **Batch Uploading**: Supports dragging and dropping 50+ documents at once, using background queues so the UI doesn't freeze.
2. **AI Data Extraction & 90% Automation**: Uses LLMs and OCR to read bank statements, categorize transactions, and extract W-8BEN form data automatically.
3. **Intelligent Linking**: Uses a Vector Store to cross-reference extracted names and automatically link W-8BENs to Paypal, Xoom, Remitly, or crypto transactions.
4. **Blockchain Audit Trails**: Automatically queries Web3 RPCs (for Ethereum/Solana) to cryptographically verify crypto payouts matching the uploaded records.
5. **Conversational AI**: Includes an integrated chat where users can type natural language queries (e.g., "Show me unlinked W-8BEN payments") to validate and adjust the data via RAG.
6. **Multi-Entity & Regional Compliance**: The Rules Engine supports Individuals, LLCs, C-Corps, etc., with specific logical tax checks for both **New Hampshire, USA** (BPT/BET) and **Cavite, Philippines** (BIR).

To handle the heavy data processing, OCR, vector embeddings, and blockchain verification required for these features, we will create an accompanying Python FastAPI backend within a new `tax-backend` folder.

## Proposed Changes

### 1. Frontend: App & Routing

We will register the new tool in the existing CryptArtist Studio launcher.

#### [MODIFY] src/components/SuiteLauncher.tsx
- Add a new entry to the `programs` array for "Tax Copilot" (`code: "Tax"`, `emoji: "📊"`, `tags: ["tax", "finance", "ai"]`).
- This will make it appear on the main dashboard alongside Media Mogul and VibeCodeWorker.

#### [MODIFY] src/App.tsx
- import `TaxCopilot` and add the `<Route path="/tax-copilot" element={<TaxCopilot />} />`.
- Update the `routeTitles` mapping to handle `/tax-copilot`.

---

### 2. Frontend: UI Components

We will create a new directory for the tool: `src/programs/tax-copilot/`.

#### [NEW] src/programs/tax-copilot/TaxCopilot.tsx
- The main wrapper layout with sidebar navigation (Tabs: Upload, Dashboard, Verification, Chat).

#### [NEW] src/programs/tax-copilot/TaxBatchUpload.tsx
- A drag-and-drop zone using standard HTML5 file APIs to accept 50+ PDFs/Images and send them to the Python backend in chunks.

#### [NEW] src/programs/tax-copilot/TaxDashboard.tsx
- A data table view showing extracted transactions, categorized by tax rules (NH/Cavite), and entity type.

#### [NEW] src/programs/tax-copilot/TaxChat.tsx
- A conversational interface utilizing the backend's RAG (Retrieval-Augmented Generation) system to chat with uploaded documents.

---

### 3. Backend: Python Intelligence Engine

We will create a separate backend server to handle the intense processing (OCR, vector DB, blockchain) that is too heavy for the Tauri frontend.

#### [NEW] tax-backend/main.py
- Initialize a `FastAPI` application with CORS configured to accept requests from the Tauri frontend (`localhost:1420`).

#### [NEW] tax-backend/requirements.txt
- Include dependencies: `fastapi`, `uvicorn`, `langchain`, `psycopg2-binary` (PostgreSQL), `sqlalchemy`, `web3` (for blockchain verification), and `python-multipart`.

#### [NEW] tax-backend/routers/ingestion.py
- API endpoints to receive batch uploads of 50+ PDFs/images.
- Asynchronous task queuing (using background tasks) to trigger OCR extraction of tables and forms.

#### [NEW] tax-backend/services/ai_linking.py
- The core intelligence logic. When OCR extracts a transaction mentioning a name, this service queries the Vector Database to find and link the corresponding W-8BEN and payment method (PayPal, Xoom, etc.).

#### [NEW] tax-backend/services/tax_rules.py
- The deterministic rules engine. It takes the output from the AI and applies entity-specific routing (Individual, LLC, C-Corp) and regional compliance logic (New Hampshire BPT/BET vs Cavite BIR rules) to prepare the 90% completed output.

#### [NEW] tax-backend/routers/rag_chat.py
- API endpoints connecting the user's conversational query to the Vector Database and formatting the response via an LLM, allowing them to ask questions about the batch data.

#### [NEW] tax-backend/routers/blockchain.py
- API endpoint to query a given wallet address and TxHash (via Web3/Alchemy) to verify crypto payments mathematically, ensuring a transparent on-chain audit trail.

---

## Verification Plan

### Automated / Backend Verification
- Use `pytest` in the `tax-backend` directory to write tests for:
  - Document ingestion endpoint returns `200 OK`.
  - The mock OCR extraction returns valid JSON containing a categorized transaction.
- Create a `test_blockchain.py` to ensure Web3 node connection and pure data parsing logic.

### Manual Verification
1. **Frontend Launch**: Run `npm run dev` in `v1`. Verify that "Tax Copilot" appears on the SuiteLauncher home screen and clicking it navigates to the new UI.
2. **Backend Connection**: Run `uvicorn main:app --reload` in `tax-backend`.
3. **Upload Flow**: Open "Tax Copilot", drag a dummy PDF into the upload zone, and verify the network tab shows a successful POST request to the Python backend.
4. **Chat Validation**: Ask the chat interface "What is my total business profits tax?" and manually verify it hits the backend RAG endpoint and streams back a response.
