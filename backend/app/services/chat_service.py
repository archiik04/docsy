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
        section_title = row[2]
        filename = row[3]
        distance = row[4]
        keyword_rank = row[5]

        print(f"""
              FILE: {filename}
              SECTION: {section_title}
              PAGE: {page_number}
              SEMANTIC DISTANCE: {distance}
              KEYWORD RANK: {keyword_rank}
        """)
        
        context_parts.append(
            f"""
            Document: {filename}
            Section: {section_title}
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
- Answer ONLY from retrieved context.
- NEVER use outside knowledge.
- If exact answer is not found in context, say:
  "The uploaded document does not contain enough information to answer this question."
- Do not infer missing information.
- Do not generate generic textbook knowledge.
- Cite only retrieved information.

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