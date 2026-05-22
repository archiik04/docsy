from typing import List

def chunk_text(
    text: str,
    chunk_size: int = 1000,
    overlap: int = 200,
    separators: List[str] = None
) -> List[str]:
    """
    Split a text document into chunks of `chunk_size` with `overlap`.
    It uses a recursive character splitting algorithm that preserves semantic boundaries
    (paragraphs, sentences, words) where possible.
    """
    if not text or not text.strip():
        return []

    if separators is None:
        separators = ["\n\n", "\n", ". ", " ", ""]

    def _split_text(text_to_split: str, current_separators: List[str]) -> List[str]:
        if len(text_to_split) <= chunk_size:
            return [text_to_split]

        if not current_separators:
            chunks = []
            i = 0
            while i < len(text_to_split):
                chunks.append(text_to_split[i : i + chunk_size])
                i += chunk_size - overlap
                if i + chunk_size >= len(text_to_split) and i < len(text_to_split):
                    chunks.append(text_to_split[i:])
                    break
            return [c for c in chunks if c]

        separator = current_separators[0]
        remaining_separators = current_separators[1:]

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
                good_splits.extend(_split_text(split, remaining_separators))

        chunks = []
        current_chunk = []
        current_len = 0
        join_str = separator if separator != "" else ""

        for split in good_splits:
            split_len = len(split)
            if split_len > chunk_size:
                if current_chunk:
                    chunks.append(join_str.join(current_chunk))
                    current_chunk = []
                    current_len = 0
                chunks.append(split)
                continue

            join_len = len(join_str) if current_chunk else 0
            if current_len + join_len + split_len > chunk_size:
                if current_chunk:
                    chunks.append(join_str.join(current_chunk))
                
                # Backtrack to support overlap
                overlap_chunk = []
                overlap_len = 0
                for prev_split in reversed(current_chunk):
                    prev_join_len = len(join_str) if overlap_chunk else 0
                    if overlap_len + prev_join_len + len(prev_split) <= overlap:
                        overlap_chunk.insert(0, prev_split)
                        overlap_len += prev_join_len + len(prev_split)
                    else:
                        break
                current_chunk = overlap_chunk
                current_len = overlap_len

            join_len = len(join_str) if current_chunk else 0
            current_chunk.append(split)
            current_len += join_len + split_len

        if current_chunk:
            chunks.append(join_str.join(current_chunk))

        return chunks

    raw_chunks = _split_text(text, separators)
    
    # Post-process: strip whitespace and filter out empty chunks
    processed_chunks = []
    for chunk in raw_chunks:
        stripped = chunk.strip()
        if stripped:
            processed_chunks.append(stripped)
            
    return processed_chunks