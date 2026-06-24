import logging
import time
from functools import lru_cache
from typing import Tuple
from sentence_transformers import SentenceTransformer
import torch

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
        model = SentenceTransformer("intfloat/multilingual-e5-small")
        
        # Quantize to FP16 if GPU/CUDA is available
        if torch.cuda.is_available():
            model.to("cuda")
            model.half()
            logger.info("✓ Model quantized to FP16 on GPU (CUDA)")
        else:
            logger.info("✓ Model loaded on CPU (FP32)")
            
        _embedding_model = model
        elapsed = time.time() - start
        logger.info(f"✓ Embedding model loaded successfully in {elapsed:.2f}s")
    return _embedding_model

@lru_cache(maxsize=1000)
def get_embedding_cached(text: str) -> Tuple[float, ...]:
    """Cached embedding lookup"""
    model = get_embedding_model()
    prefixed_text = f"query: {text}"
    embedding = model.encode(prefixed_text)
    # Convert numpy array to tuple to make it hashable for LRU cache
    if hasattr(embedding, "tolist"):
        return tuple(embedding.tolist())
    return tuple(embedding)

def generate_embedding(text: str):
    """
    Generate embedding for text (query).
    """
    try:
        cached = get_embedding_cached(text)
        return list(cached)
    except Exception as e:
        logger.warning(f"Embedding cache lookup failed: {e}")
        
    model = get_embedding_model()
    prefixed_text = f"query: {text}"
    embedding = model.encode(prefixed_text)
    if hasattr(embedding, "tolist"):
        return embedding.tolist()
    return list(embedding)

async def generate_embedding_async(text: str):
    """
    Generate embedding for text (query) asynchronously.
    """
    import asyncio
    try:
        cached = get_embedding_cached(text)
        return list(cached)
    except Exception as e:
        logger.warning(f"Embedding cache lookup failed: {e}")
        
    model = get_embedding_model()
    prefixed_text = f"query: {text}"
    embedding = await asyncio.to_thread(model.encode, prefixed_text)
    if hasattr(embedding, "tolist"):
        return embedding.tolist()
    return list(embedding)

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
    if hasattr(embeddings, "tolist"):
        return embeddings.tolist()
    return [e.tolist() if hasattr(e, "tolist") else list(e) for e in embeddings]