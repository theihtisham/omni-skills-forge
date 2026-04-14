---
name: llm-rag-production-architecture
category: ai-ml/rag
version: 1.0.0
difficulty: expert
tags: ["rag","retrieval-augmented","vector-database","embedding","chunking","reranking","production","hybrid-search"]
tools: ["claude-code","kilo","cline","opencode","cursor","windsurf"]
description: "RAG production architecture — chunking strategies, hybrid search, reranking, evaluation with RAGAS, hallucination prevention"
---

# LLM RAG Production Architecture — Expert

## Role
You are an AI engineer who has built and operated production RAG systems at scale. You know the chunking trade-offs, why hybrid search beats pure vector search, and how to evaluate RAG quality with RAGAS.

## Core Competencies

### Chunking Strategies — When to Use Each

```python
# 1. Fixed-size: Simple, predictable — good for uniform documents
chunks = [text[i:i+512] for i in range(0, len(text), 512)]

# 2. Semantic: Splits at topic boundaries — better for varied content
from semantic_text_splitter import TextSplitter
splitter = TextSplitter(max_chunk_size=512)
chunks = splitter.split_text(document)

# 3. Parent-document: Small chunks for retrieval, parent for context
small_chunks = split_recursive(doc, chunk_size=256)
# Store: {small_chunk_id -> parent_doc_id}
# Retrieve: match on small chunks, return parent document

# 4. Sentence-window: N sentences before/after match
def expand_context(match_sentence, all_sentences, window=2):
    idx = all_sentences.index(match_sentence)
    return all_sentences[max(0, idx-window):idx+window+1]
```

### Hybrid Search — Vector + BM25 with RRF

```python
from rank_bm25 import BM25Okapi

# Reciprocal Rank Fusion — combines vector and keyword scores
def reciprocal_rank_fusion(vector_results, bm25_results, k=60):
    scores = {}
    for rank, doc in enumerate(vector_results):
        scores[doc.id] = scores.get(doc.id, 0) + 1 / (k + rank + 1)
    for rank, doc in enumerate(bm25_results):
        scores[doc.id] = scores.get(doc.id, 0) + 1 / (k + rank + 1)
    return sorted(scores.items(), key=lambda x: x[1], reverse=True)
```

### Cross-Encoder Reranking

```python
from sentence_transformers import CrossEncoder
reranker = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')

def rerank(query: str, candidates: list[Document], top_k: int = 5):
    pairs = [(query, doc.text) for doc in candidates]
    scores = reranker.predict(pairs)
    ranked = sorted(zip(candidates, scores), key=lambda x: x[1], reverse=True)
    return [doc for doc, _ in ranked[:top_k]]
```

### RAGAS Evaluation

```python
from ragas import evaluate
from ragas.metrics import faithfulness, answer_relevancy, context_precision, context_recall

results = evaluate(
    dataset=eval_dataset,
    metrics=[faithfulness, answer_relevancy, context_precision, context_recall]
)
# Target: faithfulness > 0.85, answer_relevancy > 0.80
```

## Anti-Patterns
- Naive fixed-size chunking for varied documents — kills retrieval quality
- Pure vector search without keyword component — misses exact matches
- No reranking — top-K vector results are often not the best
- Not evaluating with RAGAS — flying blind on quality
- Ignoring hallucination risk — always cite sources
