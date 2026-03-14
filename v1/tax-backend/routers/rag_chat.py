import os

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv
import httpx

router = APIRouter()

load_dotenv()


class ChatRequest(BaseModel):
    query: str
    batch_id: str | None = None


OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_DEFAULT_MODEL = os.getenv("OPENROUTER_MODEL", "openai/gpt-5-mini")


async def call_llm(query: str, batch_id: str | None) -> str:
    api_key = os.getenv("OPENROUTER_API_KEY") or os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="No LLM API key configured. Set OPENROUTER_API_KEY or OPENAI_API_KEY in your environment.",
        )

    system_prompt = (
        "You are the Tax Copilot Engine inside CryptArtist Studio. "
        "You answer accounting and tax questions about a user's uploaded financial documents. "
        "Right now you do NOT have direct access to the raw documents or a vector database; "
        "you only see the user's question and an opaque batch ID. "
        "Always respond with clean, well-structured formatting using short paragraphs and bullet lists "
        "so the UI can display your answer clearly. "
        "Give practical, high-level guidance and example reasoning, but do not invent exact numbers "
        "that are not present in the question."
    )

    user_prompt = query
    if batch_id:
        user_prompt = f"[Batch ID: {batch_id}]\n\n{query}"

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://mattyjacks.com",
        "X-Title": "CryptArtist Studio — Tax Copilot",
    }

    payload = {
        "model": OPENROUTER_DEFAULT_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    }

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(OPENROUTER_API_URL, headers=headers, json=payload)
        resp.raise_for_status()
        data = resp.json()
        # OpenRouter returns OpenAI-compatible shape
        return data["choices"][0]["message"]["content"]
    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=502,
            detail=f"LLM request failed with status {e.response.status_code}: {e.response.text}",
        )
    except Exception as e:  # pragma: no cover - safeguard
        raise HTTPException(status_code=500, detail=f"Unexpected LLM error: {e}")


@router.post("")
async def chat_with_documents(request: ChatRequest):
    """
    Conversational AI for the user to query their batch of documents.
    This uses a real LLM via OpenRouter/OpenAI instead of a hard-coded stub.
    """
    reply = await call_llm(request.query, request.batch_id)
    return {"reply": reply}
