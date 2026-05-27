from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.embedding_service import generate_embedding
from app.services.reranker_service import rerank_chunks


async def retrieve_similar_chunks(
    query: str,
    document_id: str,
    db: AsyncSession,
    limit: int = 20
):

    # Prevent empty queries
    if not document_id:
        return []
    
    # QUERY EXPANSION

    expanded_query = query

    if "examples" in query.lower():
        expanded_query += (
            " EXAMPLE example sample illustration"
        )

    if "workflow" in query.lower():
        expanded_query += (
            " steps process algorithm iterations"
        )

    if "limitations" in query.lower():
        expanded_query += (
            " drawbacks disadvantages problems"
        )

    if "definition" in query.lower():
        expanded_query += (
            " meaning explanation"
        )

    print(f"""
=========================
ORIGINAL QUERY:
{query}

EXPANDED QUERY:
{expanded_query}
=========================
    """)

    # Generate embedding
    query_embedding = generate_embedding(
        expanded_query
    )

    # HYBRID SQL RETRIEVAL

    sql_query = text(
        """
        SELECT
            dc.chunk_text,
            dc.page_number,
            dc.section_title,
            d.original_filename,

            dc.embedding <=> CAST(:embedding AS vector)
                AS distance,

            ts_rank(
                dc.fts,
                plainto_tsquery('english', :query)
            ) AS keyword_rank

        FROM document_chunks dc

        JOIN documents d
            ON dc.document_id = d.id

        WHERE dc.document_id = CAST(:document_id AS uuid)

        ORDER BY
            keyword_rank DESC NULLS LAST,
            distance ASC

        LIMIT :db_limit
        """
    )

    # Retrieve more candidates
    db_limit = limit * 20

    result = await db.execute(
        sql_query,
        {
            "embedding": str(query_embedding),
            "document_id": str(document_id),
            "query": expanded_query,
            "db_limit": db_limit
        }
    )

    rows = result.fetchall()

    # TUPLES -> DICTS

    formatted_rows = []

    for row in rows:

        formatted_rows.append({
            "chunk_text": row[0],
            "page_number": row[1],
            "section_title": row[2],
            "filename": row[3],

            "distance": (
                float(row[4])
                if row[4] is not None
                else None
            ),

            "keyword_rank": (
                float(row[5])
                if row[5] is not None
                else 0.0
            )
        })

    rows = formatted_rows

    # DEBUG LOGGING

    print("\n===== HYBRID RETRIEVAL DEBUG =====\n")

    if not rows:
        print("NO ROWS RETURNED")

    for row in rows:

        print(f"""
FILE: {row['filename']}
PAGE: {row['page_number']}
SECTION: {row['section_title']}

SEMANTIC DISTANCE:
{row['distance']}

KEYWORD RANK:
{row['keyword_rank']}

CHUNK:
{row['chunk_text'][:400]}
        """)

        print("\n-------------------------\n")

    # HYBRID FILTERING

    filtered_rows = []

    query_words = expanded_query.lower().split()

    for row in rows:

        chunk_text = row["chunk_text"]

        distance = row["distance"]

        # Keyword overlap
        keyword_matches = sum(
            1
            for word in query_words
            if word in chunk_text.lower()
        )

        # Hybrid score
        score = distance - (
            keyword_matches * 0.05
        )

        # Broader threshold
        if score < 0.75:

            row["hybrid_score"] = score

            filtered_rows.append(row)

    # Sort by score
    filtered_rows.sort(
        key=lambda x: x["hybrid_score"]
    )

    # REMOVE DUPLICATES

    seen_texts = set()

    unique_rows = []

    for row in filtered_rows:

        normalized = (
            row["chunk_text"]
            .strip()
            .lower()
        )

        if normalized not in seen_texts:

            seen_texts.add(normalized)

            unique_rows.append(row)

        if len(unique_rows) >= limit:
            break

    print(f"""
FINAL UNIQUE CHUNKS:
{len(unique_rows)}
    """)

    # RERANKING

    reranked_rows = rerank_chunks(
        query=query,
        chunks=unique_rows
    )

    # Final top chunks
    final_rows = reranked_rows[:5]

    print("\n===== RERANKED RESULTS =====\n")

    for row in final_rows:

        print(f"""
FILE: {row['filename']}
PAGE: {row['page_number']}
SECTION: {row['section_title']}

RERANK SCORE:
{row['rerank_score']}

TOP CHUNK:
{row['chunk_text'][:300]}
        """)

        print("\n=========================\n")

    return final_rows