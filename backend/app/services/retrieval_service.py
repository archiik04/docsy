from sqlalchemy import text

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.embedding_service import generate_embedding


async def retrieve_similar_chunks(
    query: str,
    db: AsyncSession,
    limit: int = 3
):

    query_embedding = generate_embedding(query)

    sql_query = text(
        """
        SELECT
            chunk_text,
            embedding <=> CAST(:embedding AS vector) AS distance
        FROM document_chunks
        ORDER BY distance
        LIMIT :limit
        """
    )

    result = await db.execute(
        sql_query,
        {
            "embedding": str(query_embedding),
            "limit": limit
        }
    )

    return result.fetchall()