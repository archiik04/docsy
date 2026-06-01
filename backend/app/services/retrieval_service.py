from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.embedding_service import generate_embedding
from app.services.reranker_service import rerank_chunks

# NEIGHBOR CHUNK FETCHER

async def fetch_neighbor_chunks(
    document_id,
    chunk_index,
    db
):

    sql_query = text(
        """
        SELECT
            chunk_text,
            chunk_index

        FROM document_chunks

        WHERE document_id = CAST(:document_id AS uuid)

        AND chunk_index BETWEEN :start_idx AND :end_idx

        ORDER BY chunk_index ASC
        """
    )

    result = await db.execute(
        sql_query,
        {
            "document_id": str(document_id),
            "start_idx": chunk_index - 1,
            "end_idx": chunk_index + 1
        }
    )

    rows = result.fetchall()

    return rows

# MAIN RETRIEVAL FUNCTION

async def retrieve_similar_chunks(
    query: str,
    document_ids: list[str],
    db: AsyncSession,
    limit: int = 20
):

    # Prevent empty queries
    if not document_ids:
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

    # GENERATE QUERY EMBEDDING

    query_embedding = generate_embedding(
        expanded_query
    )

    # HYBRID SQL RETRIEVAL

    sql_query = text(
        """
        SELECT
            dc.document_id,
            dc.chunk_index,
            dc.chunk_text,
            dc.page_number,
            dc.section_title,
            d.file_path,
            d.original_filename,
            d.filename,

            dc.embedding <=> CAST(:embedding AS vector)
                AS distance,

            ts_rank(
                dc.fts,
                plainto_tsquery('english', :query)
            ) AS keyword_rank

        FROM document_chunks dc

        JOIN documents d
            ON dc.document_id = d.id

        WHERE dc.document_id = ANY(:document_ids)

        ORDER BY
            keyword_rank DESC NULLS LAST,
            distance ASC

        LIMIT :db_limit
        """
    )

    # Retrieve more candidates initially
    db_limit = limit * 20

    result = await db.execute(
        sql_query,
        {
            "embedding": str(query_embedding),

            "document_ids": [
                str(doc_id)
                for doc_id in document_ids
            ],

            "query": expanded_query,

            "db_limit": db_limit
        }
    )

    rows = result.fetchall()

    # CONVERT TUPLES → DICTS
    formatted_rows = []
    
    for row in rows:
        
        pdf_path = row[5].replace("\\", "/")
        
        formatted_rows.append({
            
            "document_id": row[0],
            
            "chunk_index": row[1],
            
            "chunk_text": row[2],
            
            "page_number": row[3],
            
            "section_title": row[4],
            
            "file_path": row[5],
            
            "original_filename": row[6],
            
            "filename": row[7],
            
            "pdf_url": f"http://127.0.0.1:8000/{pdf_path}",
            
            "distance": float(row[8]) if row[8] is not None else None,
            
            "keyword_rank": float(row[9]) if row[9] is not None else 0.0
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

        # Keyword overlap bonus
        keyword_matches = sum(
            1
            for word in query_words
            if word in chunk_text.lower()
        )

        # Lower score is better
        score = distance - (
            keyword_matches * 0.05
        )

        # Broader threshold
        if score < 0.75:

            row["hybrid_score"] = score

            filtered_rows.append(row)

    # SORT HYBRID SCORE

    filtered_rows.sort(
        key=lambda x: x["hybrid_score"]
    )

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

    final_rows = reranked_rows[:5]

    # NEIGHBOR CHUNK EXPANSION

    expanded_rows = []

    for row in final_rows:

        neighbor_rows = await fetch_neighbor_chunks(
            document_id=row["document_id"],
            chunk_index=row["chunk_index"],
            db=db
        )

        merged_text = "\n\n".join(
            neighbor[0]
            for neighbor in neighbor_rows
        )

        row["expanded_chunk_text"] = merged_text

        expanded_rows.append(row)

    final_rows = expanded_rows

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

        print("\n===== EXPANDED CHUNK =====\n")

        print(row["expanded_chunk_text"][:1000])

        print("\n==========================\n")

    return final_rows