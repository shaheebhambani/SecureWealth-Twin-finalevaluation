
import os

from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from google import genai
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"), override=True)

router = APIRouter(prefix="/api/ai", tags=["AI Chat"])

api_key = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=api_key) if api_key else None

SYSTEM_INSTRUCTION = """
You are Twin AI, the financial intelligence assistant inside SecureWealth Twin.

Help users with:
- Budgeting and saving money
- Spending habits and financial planning
- Understanding transactions and fraud warning signs
- Explaining financial concepts in simple language

Be friendly, practical, concise, and specific.
Ask follow-up questions when essential information is missing.
Never invent a user's balance, transactions, income, or personal financial data.
Do not claim to have accessed a bank account unless real account data is supplied.
Do not guarantee investment returns or claim to be a licensed financial adviser.
For suspicious payments, recommend independently verifying the recipient
and using official bank or cybercrime reporting channels when appropriate.
"""

class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    history: list[dict[str, str]] = Field(default_factory=list, max_length=20)


class ChatResponse(BaseModel):
    response: str
    provider: str = "Gemini"


@router.get("/health")
def ai_health():
    return {
        "configured": client is not None,
        "provider": "Gemini",
    }


@router.post("/chat", response_model=ChatResponse)
def chat_with_gemini(request: ChatRequest):
    if client is None:
        raise HTTPException(
            status_code=503,
            detail="Gemini is not configured. Set GEMINI_API_KEY in the backend .env file.",
        )

    message = request.message.strip()
    if not message:
        raise HTTPException(status_code=422, detail="Message cannot be empty.")

    # Include a limited conversation history for contextual replies.
    conversation = []

    for item in request.history[-10:]:
        role = item.get("role", "")
        content = item.get("content", "").strip()

        if role in ("user", "assistant") and content:
            conversation.append(f"{role.capitalize()}: {content[:2000]}")

    conversation.append(f"User: {message}")

    prompt = (
        SYSTEM_INSTRUCTION
        + "\n\nConversation:\n"
        + "\n".join(conversation)
        + "\n\nTwin AI:"
    )

    try:
        result = client.models.generate_content(
            model="gemini-3.8-flash",
            contents=prompt,
        )

        answer = (result.text or "").strip()

        if not answer:
            raise HTTPException(
                status_code=502,
                detail="Gemini returned an empty response. Please try again.",
            )

        return ChatResponse(response=answer)

    except HTTPException:
        raise
    except Exception as error:
        # Log the technical error on the backend, not the API key.
        print(f"Gemini request failed: {type(error).__name__}: {error}")
        raise HTTPException(
            status_code=502,
            detail="Twin AI could not generate a response. Check the backend logs and Gemini API configuration.",
        )
