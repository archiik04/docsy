import uuid
import re
from app.core.config import settings
from app.services.retrieval_service import retrieve_similar_chunks

def sanitize_llm_output(text: str) -> str:
    """Sanitize LLM output to prevent HTML/JS injection while keeping markdown styling."""
    if not text:
        return text
    # Strip script tags
    text = re.sub(r'<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>', '', text, flags=re.IGNORECASE)
    # Strip inline javascript handler attributes
    text = re.sub(r'\bon[a-z]+\s*=\s*(["\'])(.*?)\1', '', text, flags=re.IGNORECASE)
    # Strip javascript: links
    text = re.sub(r'href\s*=\s*(["\'])\s*javascript:(.*?)\1', '', text, flags=re.IGNORECASE)
    return text

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
groq_active = False

# Select key and base URL dynamically based on Groq API key presence
if getattr(settings, "GROQ_API_KEY", None):
    api_key = settings.GROQ_API_KEY
    base_url = "https://api.groq.com/openai/v1"
    groq_active = True
    print("[LLM] Initializing Groq client engine")
else:
    api_key = settings.OPENROUTER_API_KEY
    base_url = "https://openrouter.ai/api/v1"
    print("[LLM] Initializing OpenRouter client engine")

# Wrap AsyncOpenAI with LangSmith wrapper if LANGCHAIN_API_KEY is configured
if settings.LANGCHAIN_API_KEY:
    try:
        from langsmith import wrappers
        from openai import AsyncOpenAI as StandardAsyncOpenAI
        client = wrappers.wrap_openai(StandardAsyncOpenAI(
            api_key=api_key,
            base_url=base_url
        ))
        print("[TRACING] Initialized LangSmith wrapped AsyncOpenAI client")
    except Exception as e:
        print(f"[TRACING] Failed to wrap OpenAI client with LangSmith: {e}")

# Fallback to standard OpenAI if LangSmith wrapping failed or isn't configured
if not client:
    from openai import AsyncOpenAI as StandardAsyncOpenAI
    client = StandardAsyncOpenAI(
        api_key=api_key,
        base_url=base_url
    )


@traceable(name="Generate Title", run_type="llm")
async def generate_title(question: str) -> str:
    try:
        response = await client.chat.completions.create(
            model="llama-3.1-8b-instant" if groq_active else "meta-llama/llama-3.1-8b-instruct",
            temperature=0.7,
            max_tokens=15,
            messages=[
                {
                    "role": "system",
                    "content": "Generate a short title (4-5 words max) for this query. No quotes or punctuation."
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

    # RETRIEVE CHUNKS WITH REDIS CACHING
    from app.services.cache_service import generate_cache_key, get_cached_retrieval, set_cached_retrieval
    
    cache_key = generate_cache_key(user_id, mode, question, document_ids)
    results = get_cached_retrieval(cache_key)
    
    if results is None:
        results = await retrieve_similar_chunks(
            query=question,
            document_ids=document_ids,
            mode=mode,
            user_id=user_id,
            db=db,
            limit=10
        )
        if results:
            set_cached_retrieval(cache_key, results)

    # NO RESULTS
    if not results:
        title = await generate_title(question) if (not history or len(history) == 0) else None
        return (
            "No relevant information found.",
            [],
            title
        )

    # RERANK CONFIDENCE FILTER
    top_rerank_score = results[0].get("rerank_score", 0)

    if len(results) == 0 or top_rerank_score < -15.0:
        title = await generate_title(question) if (not history or len(history) == 0) else None
        return (
            "No relevant information found.",
            [],
            title
        )

    # LIMIT FINAL CONTEXT TO 2 CHUNKS (OPTIMIZED FROM 4)
    results = results[:2]

    # BUILD CONTEXT (SLIM FORMAT)
    context_parts = []

    for row in results:
        chunk_text = row.get("expanded_chunk_text", row["chunk_text"])
        page_number = row["page_number"]
        section_title = row["section_title"]
        filename = row["filename"]

        context_parts.append(f"{filename} | p{page_number} | {section_title}\n{chunk_text}")

    context = "\n\n".join(context_parts)

    # CONVERSATION MEMORY
    conversation_history = ""
    for message in history[-6:]:
        role = message.get("role", "user").upper()
        content = message.get("content", "")
        conversation_history += f"{role}:\n{content}\n"

    # COMPRESSED SYSTEM PROMPT (OPTIMIZED)
    prompt = f"""You are Docsy, a document assistant. Answer ONLY from the context below. Never invent facts or use outside knowledge. Match the user's language and script style.

CONTEXT:
{context}

CONVERSATION HISTORY:
{conversation_history}

QUESTION:
{question}

ANSWER:"""

    # Start title generation task concurrently if it's the first message
    title_task = None
    if not history or len(history) == 0:
        import asyncio
        title_task = asyncio.create_task(generate_title(question))

    # GENERATE RESPONSE WITH STABLE MODEL
    response = await client.chat.completions.create(
        model="llama-3.1-8b-instant" if groq_active else "meta-llama/llama-3.1-8b-instruct",
        temperature=0,
        messages=[
            {
                "role": "system",
                "content": "You are a helpful assistant answering questions from provided document context."
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

    sanitized_content = sanitize_llm_output(response.choices[0].message.content)
    return (
        sanitized_content,
        results,
        title
    )