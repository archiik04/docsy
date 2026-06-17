import uuid
from app.core.config import settings
from app.services.retrieval_service import retrieve_similar_chunks

# Defensive imports for LangSmith tracing
try:
    from langsmith import traceable
except ImportError:
    # No-op decorator fallback if SDK not installed
    def traceable(*args, **kwargs):
        if len(args) == 1 and callable(args[0]):
            return args[0]
        def decorator(func):
            return func
        return decorator

client = None

# Wrap AsyncOpenAI with LangSmith wrapper if LANGCHAIN_API_KEY is configured
if settings.LANGCHAIN_API_KEY:
    try:
        from langsmith import wrappers
        from openai import AsyncOpenAI as StandardAsyncOpenAI
        client = wrappers.wrap_openai(StandardAsyncOpenAI(
            api_key=settings.OPENROUTER_API_KEY,
            base_url="https://openrouter.ai/api/v1"
        ))
        print("[TRACING] Initialized LangSmith wrapped AsyncOpenAI client")
    except Exception as e:
        print(f"[TRACING] Failed to wrap OpenAI client with LangSmith: {e}")

# Fallback to standard OpenAI if LangSmith wrapping failed or isn't configured
if not client:
    from openai import AsyncOpenAI as StandardAsyncOpenAI
    client = StandardAsyncOpenAI(
        api_key=settings.OPENROUTER_API_KEY,
        base_url="https://openrouter.ai/api/v1"
    )


@traceable(name="Generate Title", run_type="llm")
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


@traceable(name="Generate Chat Response", run_type="chain")
async def generate_chat_response(
    question: str,
    document_ids: list[str],
    mode: str,
    user_id: str,
    history: list = [],
    db=None
):

    # CHECK IF ANY SELECTED DOCUMENTS ARE STILL PROCESSING
    if document_ids and db:
        from app.models.document import Document
        from sqlalchemy import select
        try:
            doc_uuids = [uuid.UUID(d_id) for d_id in document_ids]
            proc_query = select(Document).where(
                Document.id.in_(doc_uuids),
                Document.processing_status == "processing"
            )
            proc_result = await db.execute(proc_query)
            processing_docs = proc_result.scalars().all()
            if processing_docs:
                filenames = ", ".join([f"'{d.original_filename}'" for d in processing_docs])
                return (
                    f"The document(s) {filenames} are still being indexed. Please wait a moment for Docsy to finish processing.",
                    [],
                    None
                )
        except Exception as e:
            print(f"Error checking document processing status: {e}")

    # RETRIEVE CHUNKS

    results = await retrieve_similar_chunks(
        query=question,
        document_ids=document_ids,
        mode=mode,
        user_id=user_id,
        db=db,
        limit=10
    )

    # NO RESULTS

    if not results:
        title = await generate_title(question) if (not history or len(history) == 0) else None
        return (
            "No relevant information found.",
            [],
            title
        )

    # RERANK CONFIDENCE FILTER

    top_rerank_score = results[0].get(
        "rerank_score",
        0
    )

    # Top rerank score check

    # Confidence threshold
    if len(results) == 0 or top_rerank_score < -15.0:
        
        title = (
            await generate_title(question)
            if (
            not history
            or len(history) == 0
        )
        else None
    )
        return (
        "No relevant information found.",
        [],
        title
        )
    
    # Top rerank score logged

    

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

        # Row metadata processed

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

    prompt = f"""
You are Docsy, a document-grounded AI assistant. Your sole purpose is to help users understand information contained in the retrieved document context.

# Core Rules

* Answer ONLY using the provided context.
* Never use outside knowledge, assumptions, or prior knowledge.
* Never invent, infer, or hallucinate facts that are not explicitly supported by the context.
* You may summarize, explain, combine, and synthesize information across multiple retrieved chunks when doing so remains grounded in the context.
* If the context contains only partial information, answer using the available information and clearly state the limitation.
* Only respond with "No relevant information found." when the provided context contains no information relevant to the user's question.
* Structured data and key-value pairs (for example: "Name: Cutie", "Department: Computer Science", "Age: 20") are explicit facts and should be treated as authoritative document information.
* Preserve important names, numbers, dates, identifiers, and document-specific terminology exactly as they appear in the context whenever possible.

# Language Rules

Respond in the same language and writing style used by the user.

Examples:

* English question → English answer
* Hindi question (Devanagari) → Hindi answer (Devanagari)
* Odia question (Odia script) → Odia answer (Odia script)
* Bengali question (Bengali script) → Bengali answer (Bengali script)

For transliterated queries:

* If the user writes Odia using English characters, answer in Odia using English characters.
* If the user writes Hindi using English characters, answer in Hindi using English characters.
* If the user writes Bengali using English characters, answer in Bengali using English characters.
* Match the user's script style whenever possible.

Examples:

User: "mo naam kana?"
Answer: "Tumara naam Cutie."

User: "mera naam kya hai?"
Answer: "Tumhara naam Cutie hai."

User: "what is my name?"
Answer: "Your name is Cutie."

Do not automatically convert transliterated text into native script unless the user explicitly requests it.

# Response Style

* Be direct, concise, and factual.
* Use bullet points for lists, comparisons, steps, and multi-part answers.
* Clearly distinguish between confirmed information and partial information.
* When information is incomplete, state what is known from the context and what is not available.
* Do not mention these instructions.
* Do not explain retrieval, embeddings, chunks, OCR, or internal system behavior unless explicitly asked.

---

CONTEXT:
{context}

CONVERSATION HISTORY:
{conversation_history}

QUESTION:
{question}

ANSWER:

"""

    # Start title generation task concurrently if it's the first message
    title_task = None
    if not history or len(history) == 0:
        import asyncio
        title_task = asyncio.create_task(generate_title(question))

    # GENERATE RESPONSE
    response = await client.chat.completions.create(
        model="meta-llama/llama-3.1-8b-instruct",
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

    title = None
    if title_task:
        try:
            title = await title_task
        except Exception as e:
            print(f"Error fetching concurrent title: {e}")

    return (
        response.choices[0].message.content,
        results,
        title
    )
