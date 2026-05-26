from sentence_transformers import CrossEncoder

reranker = CrossEncoder(
    "cross-encoder/ms-marco-MiniLM-L-6-v2"
)


def rerank_chunks(query, rows):

    if not rows:
        return []

    pairs = []

    for row in rows:

        chunk_text = row[0]

        pairs.append(
            [query, chunk_text]
        )

    scores = reranker.predict(pairs)

    ranked = list(zip(rows, scores))

    ranked.sort(
        key=lambda x: x[1],
        reverse=True
    )

    return [item[0] for item in ranked]