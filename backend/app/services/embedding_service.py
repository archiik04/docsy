import logging
import time
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)
_embedding_model = None

def get_embedding_model():
    """
    Get or initialize SentenceTransformer embedding model singleton.
    """
    global _embedding_model
    if _embedding_model is None:
        logger.info("Initializing SentenceTransformer embedding model (warm-loading)...")
        start = time.time()
        _embedding_model = SentenceTransformer("intfloat/multilingual-e5-small")
        elapsed = time.time() - start
        logger.info(f"✓ Embedding model loaded successfully in {elapsed:.2f}s")
    return _embedding_model

def generate_embedding(text: str):
    """
    Generate embedding for text (query).
    """
    model = get_embedding_model()
    # E5 models expect "query: " prefix for queries
    prefixed_text = f"query: {text}"
    embedding = model.encode(prefixed_text)
    return embedding.tolist()

def generate_embeddings_batch(texts: list[str]) -> list[list[float]]:
    """
    Generate embeddings for a list of texts (passages) in batch.
    """
    if not texts:
        return []
    model = get_embedding_model()
    # E5 models expect "passage: " prefix for passages
    prefixed_texts = [f"passage: {t}" for t in texts]
    embeddings = model.encode(prefixed_texts)
    return embeddings.tolist()