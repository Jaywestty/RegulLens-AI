# app/generation/llm.py

from groq import Groq
from app.config import settings

_client = Groq(api_key=settings.groq_api_key)


def generate_answer(prompt: str) -> str:
    """
    Sends the prompt to Groq and returns the LLM's response.

    Model: llama-3.1-8b-instant
    - Free on Groq's API
    - "instant" = Groq's specialized hardware makes it very fast
    - 8B parameters = good quality for document Q&A

    temperature=0.1:
    Think of temperature as how "creative" vs "precise" the model is.
    0.0 = always picks the most predictable word (robotic but consistent)
    1.0 = creative, varied, sometimes random
    0.1 = almost fully precise with tiny variation (ideal for factual Q&A)

    max_tokens=1024:
    Limits the response length. Compliance answers should be concise,
    not essays. 1024 tokens ≈ 750 words — more than enough.
    """
    response = _client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a precise enterprise compliance assistant. "
                    "Answer only from provided document context. "
                    "Always cite your sources."
                ),
            },
            {"role": "user", "content": prompt},
        ],
        temperature=0.1,
        max_tokens=1024,
    )
    return response.choices[0].message.content