from sqlalchemy import text

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.embedding_service import generate_embedding


async def retrieve_similar_chunks(
    query: str,
    db: AsyncSession,
    limit: int = 5
):

    query_embedding = generate_embedding(query)

    sql_query = text(
        """
        SELECT
            dc.chunk_text,
            d.original_filename,
            dc.embedding <=> CAST(:embedding AS vector) AS distance
        FROM document_chunks dc
        JOIN documents d ON dc.document_id = d.id
        ORDER BY distance
        LIMIT :db_limit
        """
    )

    # Retrieve more chunks from DB to handle duplicate uploads/documents
    db_limit = limit * 10

    result = await db.execute(
        sql_query,
        {
            "embedding": str(query_embedding),
            "db_limit": db_limit
        }
    )

    rows = result.fetchall()

    seen_texts = set()
    unique_rows = []
    for row in rows:
        chunk_text = row[0]
        normalized = chunk_text.strip()
        if normalized not in seen_texts:
            seen_texts.add(normalized)
            unique_rows.append(row)
            if len(unique_rows) == limit:
                break

    return unique_rows