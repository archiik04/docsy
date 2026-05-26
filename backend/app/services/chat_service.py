from openai import AsyncOpenAI

from app.core.config import settings

from app.services.retrieval_service import (
    retrieve_similar_chunks
)
from app.services.reranker_service import rerank_chunks


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

    results = rerank_chunks(question, results)
    results = results[:4]

    context_parts = []
    for row in results:
        chunk_text = row[0]
        page_number = row[1]
        filename = row[2]
        distance = row[3]
        keyword_rank = row[4]

        print(f"""
              FILE: {filename}
              PAGE: {page_number}
              SEMANTIC DISTANCE: {distance}
              KEYWORD RANK: {keyword_rank}
        """)
        
        context_parts.append(
            f"""
            Document: {filename}
            Page: {page_number}
            
            Content:
            {chunk_text}
            """
        )

    context = "\n\n".join(context_parts)

    prompt = f"""
You are Docsy, an AI research assistant.

Answer ONLY using the provided context.

Rules:
- If answer exists in context, explain clearly.
- Summarize naturally instead of copying raw text.
- If context is insufficient, say:
  "The uploaded document does not contain enough information to answer this question."
- Never invent information.
- Keep answers structured and concise.

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