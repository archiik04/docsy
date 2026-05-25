from openai import AsyncOpenAI

from app.core.config import settings

from app.services.retrieval_service import (
    retrieve_similar_chunks
)


client = AsyncOpenAI(
    api_key=settings.OPENROUTER_API_KEY,
    base_url="https://openrouter.ai/api/v1"
)


async def generate_chat_response(
    question: str,
    document_id: str,
    db
):

    results = await retrieve_similar_chunks(
        query=question,
        document_id=document_id,
        db=db
    )

    context_parts = []
    for row in results:
        chunk_text, filename, distance = row
        context_parts.append(f"--- Document: {filename} ---\n{chunk_text}")

    context = "\n\n".join(context_parts)

    prompt = f"""
You are Docsy, an AI document research assistant.

Answer ONLY using the provided context.

Rules:
- Never hallucinate
- Never use outside knowledge
- If answer is unavailable, say so
- Cite relevant information
- Be concise and grounded

Retrieved Context:
{context}

Question:
{question}
"""

    response = await client.chat.completions.create(

        model="meta-llama/llama-3-8b-instruct",

        messages=[
            {
                "role": "system",
                "content": "You answer questions about uploaded documents."
            },
            {
                "role": "user",
                "content": prompt
            }
        ]
    )

    return response.choices[0].message.content, results