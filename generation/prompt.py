# app/generation/prompt.py

from typing import List, Dict


def build_prompt(query: str, chunks: List[Dict]) -> str:
    """
    Builds the exact text we send to the LLM.

    This is the most important security boundary in the whole system.
    The prompt instructs the LLM to:

    1. ONLY use the provided context (no hallucinating from training data)
    2. ALWAYS cite sources (filename + page number)
    3. Admit when the answer isn't in the documents

    Rule 3 is crucial. A compliance assistant that says "I don't know"
    is infinitely better than one that confidently gives a wrong answer
    that leads to a legal violation.
    """
    # Format each chunk as a labelled source block
    context_parts = []
    for i, chunk in enumerate(chunks, start=1):
        context_parts.append(
            f"[Source {i} | File: {chunk['filename']} | Page: {chunk['page_number']}]\n"
            f"{chunk['text']}"
        )

    context = "\n\n" + ("\n\n" + "─" * 60 + "\n\n").join(context_parts)

    return f"""You are a compliance assistant for an enterprise organization.
Your job is to answer employee questions strictly based on the company documents provided below.

STRICT RULES YOU MUST FOLLOW:
1. Answer ONLY using information from the CONTEXT section below
2. ALWAYS cite your source: state the filename and page number
3. If the answer cannot be found in the context, respond exactly: 
   "This information was not found in the provided company documents."
4. Do NOT add information from your general knowledge
5. Do NOT speculate or make assumptions
6. Keep answers professional, clear, and concise

CONTEXT:
{context}

EMPLOYEE QUESTION: {query}

YOUR ANSWER (include citations):"""