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
    document_ids: list[str],
    db
):

    # RETRIEVE CHUNKS
    results = await retrieve_similar_chunks(
        query=question,
        document_ids=document_ids,
        db=db
    )

    # NO RESULTS
    if not results:
        return (
            "The uploaded document does not contain enough information to answer this question.",
            []
        )

    # CONFIDENCE FILTERING
    top_chunk = results[0]["chunk_text"].lower()

    question_words = question.lower().split()

    matches = sum(
        1 for word in question_words
        if word in top_chunk
    )

    print(f"\nQUESTION WORD MATCHES: {matches}\n")

    broad_query_words = [
    "examples",
    "summary",
    "summarize",
    "workflow",
    "discussed",
    "topics"
    ]
    
    is_broad_query = any(
        word in question.lower()
        for word in broad_query_words
        )
    if matches < 2 and not is_broad_query:
        return (
        "The uploaded document does not contain enough information to answer this question.",
        results
    )

    # LIMIT FINAL CONTEXT
    results = results[:4]

    # BUILD CONTEXT
    context_parts = []

    for row in results:

        chunk_text = row["chunk_text"]
        page_number = row["page_number"]
        section_title = row["section_title"]
        filename = row["filename"]
        distance = row["distance"]
        keyword_rank = row["keyword_rank"]
        rerank_score = row.get("rerank_score")

        print(f"""
FILE: {filename}
SECTION: {section_title}
PAGE: {page_number}
SEMANTIC DISTANCE: {distance}
KEYWORD RANK: {keyword_rank}
RERANK SCORE: {rerank_score}
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

    # STRICT GROUNDED PROMPT
    prompt = f"""
You are Docsy, a document-grounded AI assistant.

STRICT RULES:
1. Answer ONLY from the provided context.
2. NEVER use outside knowledge.
3. NEVER infer missing facts.
4. NEVER guess.
5. If answer is not explicitly present, say exactly:
"The uploaded document does not contain enough information to answer this question."
6. Keep answers concise and grounded.
7. Every statement must be supported by retrieved text.

CONTEXT:
{context}

QUESTION:
{question}

ANSWER:
"""

    # GENERATE RESPONSE
    response = await client.chat.completions.create(

        model="meta-llama/llama-3-8b-instruct",

        temperature=0,

        messages=[
            {
                "role": "system",
                "content": "You answer questions ONLY from retrieved document context."
            },
            {
                "role": "user",
                "content": prompt
            }
        ]
    )

    return response.choices[0].message.content, results