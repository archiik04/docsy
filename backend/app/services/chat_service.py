from openai import AsyncOpenAI

from app.core.config import settings

from app.services.retrieval_service import (
    retrieve_similar_chunks
)


client = AsyncOpenAI(
    api_key=settings.OPENROUTER_API_KEY,
    base_url="https://openrouter.ai/api/v1"
)


async def generate_title(question: str) -> str:
    try:
        response = await client.chat.completions.create(
            model="meta-llama/llama-3-8b-instruct",
            temperature=0.7,
            max_tokens=15,
            messages=[
                {
                    "role": "system",
                    "content": "You are a helpful assistant. Generate an extremely short title (maximum 4-5 words) summarizing the user query. Do not use quotes, punctuation, or markdown."
                },
                {
                    "role": "user",
                    "content": question
                }
            ]
        )
        return response.choices[0].message.content.strip().strip('"').strip("'")
    except Exception as e:
        print(f"Error generating title: {e}")
        first_line = question.split('\n')[0].strip()
        return first_line[:40] + "..." if len(first_line) > 40 else first_line


async def generate_chat_response(
    question: str,
    document_ids: list[str],
    history: list = [],
    db=None
):

    # RETRIEVE CHUNKS

    results = await retrieve_similar_chunks(
        query=question,
        document_ids=document_ids,
        db=db
    )

    # NO RESULTS

    if not results:
        title = await generate_title(question) if (not history or len(history) == 0) else None
        return (
            "The uploaded document does not contain enough information to answer this question.",
            [],
            title
        )

    # RERANK CONFIDENCE FILTER

    top_rerank_score = results[0].get(
        "rerank_score",
        0
    )

    print(f"""
TOP RERANK SCORE:
{top_rerank_score}
    """)

    # Confidence threshold

    if top_rerank_score < 1.0:
        title = await generate_title(question) if (not history or len(history) == 0) else None
        return (
            "The uploaded document does not contain enough information to answer this question.",
            results,
            title
        )

    # LIMIT FINAL CONTEXT

    results = results[:4]

    # BUILD CONTEXT

    context_parts = []

    for row in results:

        chunk_text = row.get(
            "expanded_chunk_text",
            row["chunk_text"]
        )

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

SEMANTIC DISTANCE:
{distance}

KEYWORD RANK:
{keyword_rank}

RERANK SCORE:
{rerank_score}
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

    # CONVERSATION MEMORY

    conversation_history = ""

    for message in history[-6:]:

        role = message.get(
            "role",
            "user"
        )

        content = message.get(
            "content",
            ""
        )

        conversation_history += f"""
{role.upper()}:
{content}
"""

    # STRICT GROUNDED PROMPT

    prompt = f"""
You are Docsy, a document-grounded AI assistant. Your sole purpose is to help users understand their uploaded documents — nothing more.

## Core Rules

- Answer **only** using the provided context. No outside knowledge, ever.
- You may synthesize, summarize, and explain information across multiple retrieved chunks.
- Never invent or infer facts not explicitly present in the context.
- If the context contains partial information, use it and note the limitation.
- Only say "The uploaded document does not contain enough information to answer this question." when the context has **nothing** relevant — not just incomplete information.

## Response Style

- Be direct and concise.
- Use bullet points for lists, comparisons, and multi-part answers.
- When comparing methods or concepts, clearly attribute properties to the correct subject.
- Flag uncertainty explicitly when information is partial or ambiguous.

---

CONTEXT:
{context}

CONVERSATION HISTORY:
{conversation_history}

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
                "content": (
                    "You answer questions ONLY "
                    "from retrieved document context."
                )
            },
            {
                "role": "user",
                "content": prompt
            }
        ]
    )

    title = await generate_title(question) if (not history or len(history) == 0) else None

    return (
        response.choices[0].message.content,
        results,
        title
    )