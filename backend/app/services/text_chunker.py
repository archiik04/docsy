import re
from typing import List


def clean_text(text: str) -> str:

    # Remove excessive newlines
    text = re.sub(r"\n{3,}", "\n\n", text)

    # Remove multiple spaces/tabs
    text = re.sub(r"[ \t]+", " ", text)

    # Remove weird unicode artifacts
    text = text.replace("\x00", " ")

    # Fix broken sentence spacing
    text = re.sub(r"\s+\.", ".", text)

    return text.strip()


def chunk_text(
    text: str,
    chunk_size: int = 800,
    overlap: int = 200,
    separators: List[str] = None
) -> List[str]:

    """
    Recursive semantic chunking for RAG pipelines.
    Preserves paragraph/sentence structure where possible.
    """

    if not text or not text.strip():
        return []

    text = clean_text(text)

    # Semantic splitting priority
    if separators is None:

        separators = [
            "\n# ",
            "\n## ",
            "\n\n",
            "\n",
            ". ",
            "? ",
            "! ",
            "; ",
            " ",
            ""
        ]

    def _split_text(
        text_to_split: str,
        current_separators: List[str]
    ) -> List[str]:

        # Base case
        if len(text_to_split) <= chunk_size:
            return [text_to_split]

        # Final fallback
        if not current_separators:

            chunks = []

            i = 0

            while i < len(text_to_split):

                chunks.append(
                    text_to_split[i:i + chunk_size]
                )

                i += chunk_size - overlap

                if (
                    i + chunk_size >= len(text_to_split)
                    and i < len(text_to_split)
                ):
                    chunks.append(text_to_split[i:])
                    break

            return [c for c in chunks if c]

        separator = current_separators[0]

        remaining_separators = current_separators[1:]

        # Split text
        if separator == "":
            splits = list(text_to_split)
        else:
            splits = text_to_split.split(separator)

        good_splits = []

        for split in splits:

            if not split:
                continue

            if len(split) <= chunk_size:

                good_splits.append(split)

            else:

                # Recursive deeper splitting
                good_splits.extend(
                    _split_text(
                        split,
                        remaining_separators
                    )
                )

        chunks = []

        current_chunk = []

        current_len = 0

        join_str = separator if separator != "" else ""

        for split in good_splits:

            split_len = len(split)

            # Huge split fallback
            if split_len > chunk_size:

                if current_chunk:

                    chunks.append(
                        join_str.join(current_chunk)
                    )

                    current_chunk = []

                    current_len = 0

                chunks.append(split)

                continue

            join_len = len(join_str) if current_chunk else 0

            # Exceeds chunk size
            if current_len + join_len + split_len > chunk_size:

                if current_chunk:

                    chunks.append(
                        join_str.join(current_chunk)
                    )

                # OVERLAP BACKTRACKING
                overlap_chunk = []

                overlap_len = 0

                for prev_split in reversed(current_chunk):

                    prev_join_len = (
                        len(join_str)
                        if overlap_chunk
                        else 0
                    )

                    if (
                        overlap_len
                        + prev_join_len
                        + len(prev_split)
                        <= overlap
                    ):

                        overlap_chunk.insert(
                            0,
                            prev_split
                        )

                        overlap_len += (
                            prev_join_len
                            + len(prev_split)
                        )

                    else:
                        break

                current_chunk = overlap_chunk

                current_len = overlap_len

            join_len = len(join_str) if current_chunk else 0

            current_chunk.append(split)

            current_len += join_len + split_len

        # Add remaining chunk
        if current_chunk:

            chunks.append(
                join_str.join(current_chunk)
            )

        return chunks

    # Generate raw chunks
    raw_chunks = _split_text(
        text,
        separators
    )

    # Post-processing
    processed_chunks = []

    for chunk in raw_chunks:

        stripped = chunk.strip()

        # Ignore tiny noisy chunks
        MIN_CHUNK_LENGTH = 20

        if stripped:
            
            if len(stripped) < MIN_CHUNK_LENGTH:
                
                if any(
                    keyword.lower() in stripped.lower()
                    for keyword in [
                        "name",
                        "university",
                        "department",
                        "email",
                        "phone"
                    ]
                ):
                    processed_chunks.append(stripped)
                else:
                    processed_chunks.append(stripped)

            # Preserve semantic titles/headings
            title_match = re.match(
                r"^(EXAMPLE-\d+|Definition|Short Questions|Algorithm)",
                stripped,
                re.IGNORECASE
            )

            if title_match:

                stripped = (
                    f"{title_match.group(0)}\n\n{stripped}"
                )

            processed_chunks.append(stripped)

    return processed_chunks