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
        chunk_text, page_number, filename, distance = row
        context_parts.append(
            f"--- Document: {filename} | Page: {page_number} ---\n{chunk_text}"
        )

    context = "\n\n".join(context_parts)

    prompt = f"""
You are a document research assistant.

Answer ONLY using the provided context.

Rules:
- If the answer exists in the context, answer clearly and accurately.
- If the answer is NOT present in the context, explicitly say:
  "The uploaded document does not contain enough information to answer this question."
- Do NOT hallucinate.
- Do NOT invent facts.
- Prefer concise answers.
- Use bullet points if appropriate.

Context:
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