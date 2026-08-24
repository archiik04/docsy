# backend/app/services/mindmap_service.py
import json
import re
from openai import AsyncOpenAI
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.models.document import Document
from app.models.document_chunk import DocumentChunk

from app.services.chat_service import client, groq_active


def strip_fences(raw: str) -> str:
    """Remove ```json ... ``` markdown fences if LLM wraps response in them."""
    raw = raw.strip()
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)
    return raw.strip()


async def call_llm(messages: list, temperature: float = 0.3) -> str:
    response = await client.chat.completions.create(
        model="openai/gpt-oss-20b" if groq_active else "meta-llama/llama-3.1-8b-instruct",
        temperature=temperature,
        max_tokens=2000,
        messages=messages
    )
    return response.choices[0].message.content.strip()


async def generate_mindmap(document_id: str, db: AsyncSession) -> dict:

    # 1. fetch top 12 chunks ordered by chunk_index
    result = await db.execute(
        select(DocumentChunk)
        .where(DocumentChunk.document_id == document_id)
        .order_by(DocumentChunk.chunk_index)
        .limit(12)
    )
    chunks = result.scalars().all()

    if not chunks:
        raise ValueError("No chunks found for this document")

    combined = "\n\n".join([c.chunk_text for c in chunks])

    prompt = f"""You are a document analysis assistant.
Analyze the document below and extract a hierarchical topic tree.
Respond ONLY with valid JSON. No markdown fences, no explanation, no preamble.

Use this exact shape:
{{
  "topic": "Root document title",
  "type": "root",
  "children": [
    {{
      "topic": "Main concept label",
      "type": "topic",
      "chunk_ids": [],
      "detail": "One sentence description of this concept.",
      "children": [
        {{
          "topic": "Subtopic label",
          "type": "sub",
          "chunk_ids": [],
          "detail": "One sentence description.",
          "children": []
        }}
      ]
    }}
  ]
}}

Document:
{combined}"""

    messages = [
        {
            "role": "system",
            "content": "You are a JSON-only response assistant. Never wrap output in markdown. Return raw JSON only."
        },
        {
            "role": "user",
            "content": prompt
        }
    ]

    # 2. first attempt
    raw = await call_llm(messages, temperature=0.3)
    raw = strip_fences(raw)

    # 3. retry once if JSON parse fails
    try:
        mindmap_json = json.loads(raw)
    except json.JSONDecodeError:
        print(f"[mindmap] First parse failed, retrying. Raw was:\n{raw[:300]}")
        messages.append({"role": "assistant", "content": raw})
        messages.append({
            "role": "user",
            "content": "Your response was not valid JSON. Return ONLY the raw JSON object, nothing else. No markdown, no explanation."
        })
        raw2 = await call_llm(messages, temperature=0.1)
        raw2 = strip_fences(raw2)
        mindmap_json = json.loads(raw2)  # let this raise naturally if still broken

    # 4. save to documents table
    #    (mindmap_data column added via DBeaver — no alembic needed)
    doc_result = await db.execute(
        select(Document).where(Document.id == document_id)
    )
    doc = doc_result.scalar_one_or_none()

    if doc:
        doc.mindmap_data = mindmap_json
        db.add(doc)
        await db.commit()
        await db.refresh(doc)

    print(f"[mindmap] Generated successfully for document {document_id}")
    return mindmap_json