from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.embedding_service import generate_embedding


async def retrieve_similar_chunks(
    query: str,
    document_id: str,
    db: AsyncSession,
    limit: int = 8
):

    # Prevent empty document queries
    if not document_id:
        return []

    # Generate embedding for user query
    query_embedding = generate_embedding(query)

    # PGVector similarity search
    sql_query = text(
        """
        SELECT
            dc.chunk_text,
            d.original_filename,
            dc.embedding <=> CAST(:embedding AS vector) AS distance
        FROM document_chunks dc
        JOIN documents d
            ON dc.document_id = d.id
        WHERE dc.document_id = CAST(:document_id AS uuid)
        ORDER BY distance ASC
        LIMIT :db_limit
        """
    )

    # Retrieve extra rows for deduplication
    db_limit = limit * 20

    result = await db.execute(
        sql_query,
        {
            "embedding": str(query_embedding),
            "document_id": str(document_id),
            "db_limit": db_limit
        }
    )

    rows = result.fetchall()

    # DEBUG LOGS
    print("\n===== RETRIEVAL DEBUG =====\n")

    if not rows:
        print("NO ROWS RETURNED FROM VECTOR SEARCH")

    for row in rows:

        print(f"FILE: {row[1]}")
        print(f"DISTANCE: {row[2]}")
        print(row[0][:400])

        print("\n-----------------\n")

    # TEMPORARY:
    # keep all rows until we tune thresholding properly
    filtered_rows = rows

    # Remove duplicate chunks
    seen_texts = set()
    unique_rows = []

    for row in filtered_rows:

        chunk_text = row[0]
        normalized = chunk_text.strip()

        if normalized not in seen_texts:

            seen_texts.add(normalized)
            unique_rows.append(row)

            if len(unique_rows) == limit:
                break

    print(f"\nFINAL UNIQUE CHUNKS RETURNED: {len(unique_rows)}\n")

    return unique_rows