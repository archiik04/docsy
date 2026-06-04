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
        _embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
        elapsed = time.time() - start
        logger.info(f"✓ Embedding model loaded successfully in {elapsed:.2f}s")
    return _embedding_model

def generate_embedding(text: str):
    """
    Generate embedding for text.
    """
    model = get_embedding_model()
    embedding = model.encode(text)
    return embedding.tolist()

def generate_embeddings_batch(texts: list[str]) -> list[list[float]]:
    """
    Generate embeddings for a list of texts in batch.
    """
    if not texts:
        return []
    model = get_embedding_model()
    embeddings = model.encode(texts)
    return embeddings.tolist()