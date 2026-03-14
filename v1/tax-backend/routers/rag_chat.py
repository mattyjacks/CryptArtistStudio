from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

class ChatRequest(BaseModel):
    query: str
    batch_id: str = None

@router.post("/")
async def chat_with_documents(request: ChatRequest):
    """
    Conversational AI for the user to query their batch of documents.
    Uses Retrieval-Augmented Generation (RAG) against the vector database.
    """
    # Simulated RAG Pipeline response
    # In reality, this queries pgvector and sends the context to the LLM
    query_lower = request.query.lower()
    
    if "unlinked w-8ben" in query_lower:
        response_text = "I found 3 unlinked W-8BEN forms in your batch. Two belong to 'John Doe' and one to 'Jane Smith'. Would you like me to cross-reference these with your PayPal exports?"
    elif "profits tax" in query_lower or "new hampshire" in query_lower:
        response_text = "Based on the New Hampshire rules engine, your LLC has $45,000 in gross receipts. The Business Enterprise Tax (BET) threshold is $250k, so no BET is owed, but I've drafted the BPT schedule for you."
    else:
        response_text = f"I've searched your documents for '{request.query}'. I see 42 related transactions."
        
    return {
        "reply": response_text
    }
