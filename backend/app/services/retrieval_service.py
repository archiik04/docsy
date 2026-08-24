from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.embedding_service import generate_embedding, generate_embedding_async
from app.services.reranker_service import rerank_chunks

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

@traceable(name="Retrieve Similar Chunks", run_type="retriever")
async def retrieve_similar_chunks(
    query: str,
    document_ids: list[str],
    mode: str,
    user_id: str,
    db: AsyncSession,
    limit: int = 20
):

    if mode not in {"WORKSPACE"}:
        raise ValueError("Invalid retrieval mode")

    # Use query directly without manual query expansion rules
    expanded_query = query

    # GENERATE QUERY EMBEDDING
    query_embedding = await generate_embedding_async(
        expanded_query
    )

    # HYBRID SQL RETRIEVAL
    # db_limit multiplier reduced from 20 to 5 to fetch fewer, more targeted candidates
    db_limit = limit * 5

    scope_filter = """
    d.owner_id = CAST(:user_id AS uuid)
    AND d.scope = CAST('PERSONAL' AS doc_scope)
    """

    sql_params = {
        "embedding": str(query_embedding),
        "query": expanded_query,
        "db_limit": db_limit
    }

    sql_params["user_id"] = str(user_id)
    if document_ids:
        scope_filter += """
        AND dc.document_id = ANY(:document_ids)
        """
        sql_params["document_ids"] = [
            str(doc_id)
            for doc_id in document_ids
        ]

    # Hybrid SQL search query, in two stages:
    # 1. `candidates` CTE does a pure nearest-neighbor scan
    #    (ORDER BY embedding <=> :embedding LIMIT :db_limit). This is the
    #    query shape pgvector's ivfflat index can actually use -- the old
    #    version filtered on `distance < 0.95` in a WHERE clause instead,
    #    which ivfflat cannot use (it only accelerates ORDER BY nearest-
    #    neighbor queries, not arbitrary distance range predicates), so it
    #    silently forced a full sequential scan regardless of any index.
    # 2. The outer query blends in FTS keyword_rank and re-sorts the
    #    (already small) candidate set by hybrid_score.
    sql_query = text(
        f"""
        WITH candidates AS (
            SELECT
                dc.document_id,
                dc.chunk_index,
                dc.chunk_text,
                dc.page_number,
                dc.section_title,
                dc.fts,
                d.file_path,
                d.original_filename,
                d.filename,
                dc.embedding <=> CAST(:embedding AS vector) AS distance
            FROM document_chunks dc
            JOIN documents d
                ON dc.document_id = d.id
            WHERE {scope_filter}
            ORDER BY dc.embedding <=> CAST(:embedding AS vector)
            LIMIT :db_limit
        )
        SELECT
            document_id,
            chunk_index,
            chunk_text,
            page_number,
            section_title,
            file_path,
            original_filename,
            filename,
            distance,
            ts_rank(fts, plainto_tsquery('english', :query)) AS keyword_rank,
            distance - (0.05 * COALESCE(ts_rank(fts, plainto_tsquery('english', :query)), 0.0)) AS hybrid_score
        FROM candidates
        ORDER BY hybrid_score ASC
        """
    )

    result = await db.execute(
        sql_query,
        sql_params
    )

    rows = result.fetchall()

    # CONVERT TUPLES → DICTS & FILTER BY HYBRID SCORE
    filtered_rows = []
    
    for row in rows:
        pdf_path = row[5].replace("\\", "/")
        distance = float(row[8]) if row[8] is not None else None
        keyword_rank = float(row[9]) if row[9] is not None else 0.0
        hybrid_score = float(row[10]) if row[10] is not None else 1.0
        
        filtered_rows.append({
            "document_id": row[0],
            "chunk_index": row[1],
            "chunk_text": row[2],
            "page_number": row[3],
            "section_title": row[4],
            "file_path": row[5],
            "original_filename": row[6],
            "filename": row[7],
            "pdf_url": f"http://127.0.0.1:8000/{pdf_path}",
            "distance": distance,
            "keyword_rank": keyword_rank,
            "hybrid_score": hybrid_score
        })

    # Sort in Python by the SQL hybrid score to make sure they are in order
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

    # RERANKING (Rerank top-5 only instead of all candidate chunks)
    import asyncio
    reranked_rows = await asyncio.to_thread(
        rerank_chunks,
        query=query,
        chunks=unique_rows[:5]
    )

    final_rows = reranked_rows

    # BATCH NEIGHBOR CHUNK EXPANSION (1 DB hit instead of N sequential ones)
    if final_rows:
        from collections import defaultdict
        
        clauses = []
        params = {}
        for i, row in enumerate(final_rows):
            doc_id_param = f"doc_{i}"
            start_param = f"start_{i}"
            end_param = f"end_{i}"
            
            clauses.append(
                f"(document_id = CAST(:{doc_id_param} AS uuid) AND chunk_index BETWEEN :{start_param} AND :{end_param})"
            )
            params[doc_id_param] = str(row["document_id"])
            params[start_param] = row["chunk_index"] - 1
            params[end_param] = row["chunk_index"] + 1

        where_clause = " OR ".join(clauses)
        neighbor_query = text(
            f"""
            SELECT
                document_id,
                chunk_text,
                chunk_index
            FROM document_chunks
            WHERE {where_clause}
            ORDER BY chunk_index ASC
            """
        )
        
        result = await db.execute(neighbor_query, params)
        neighbor_rows = result.fetchall()
        
        neighbors_by_doc = defaultdict(list)
        for r in neighbor_rows:
            neighbors_by_doc[r[0]].append((r[2], r[1]))  # (chunk_index, chunk_text)
            
        for row in final_rows:
            doc_id = row["document_id"]
            target_idx = row["chunk_index"]
            
            doc_chunks = neighbors_by_doc[doc_id]
            matching_chunks = [
                text for idx, text in doc_chunks
                if target_idx - 1 <= idx <= target_idx + 1
            ]
            
            if matching_chunks:
                row["expanded_chunk_text"] = "\n\n".join(matching_chunks)
            else:
                row["expanded_chunk_text"] = row["chunk_text"]
    else:
        final_rows = []

    return final_rows

