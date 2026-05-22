def chunk_text(
    text: str,
    chunk_size: int = 1000,
    overlap: int = 200
):

    print("CHUNKER RECEIVED TEXT LENGTH:", len(text))

    if not text:
        return []

    chunks = []

    start = 0

    while start < len(text):

        end = start + chunk_size

        chunk = text[start:end]

        print("CREATING CHUNK")

        chunks.append(chunk)

        start = start + (chunk_size - overlap)

    print("FINAL CHUNK COUNT:", len(chunks))

    return chunks