from sentence_transformers import CrossEncoder

# Load once globally
reranker = CrossEncoder(
    "BAAI/bge-reranker-base"
)


def rerank_chunks(query: str, rows):

    """
    rows format:
    (
        chunk_text,
        page_number,
        section_title,
        filename,
        distance,
        keyword_rank
    )
    """

    if not rows:
        return []

    # Prepare query-document pairs
    pairs = [
        [query, row[0]]
        for row in rows
    ]

    # Get reranker scores
    scores = reranker.predict(pairs)

    reranked = []

    for row, score in zip(rows, scores):

        reranked.append({
            "row": row,
            "rerank_score": float(score)
        })

    # Sort descending
    reranked.sort(
        key=lambda x: x["rerank_score"],
        reverse=True
    )

    # Return only rows
    final_rows = [
        item["row"]
        for item in reranked
    ]

    return final_rows