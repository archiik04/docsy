// Client-side engine for the /demo workspace.
// Everything here runs in the browser so the demo works even when the backend is asleep:
// sample documents, text extraction (incl. real PDF text via pdf.js), keyword retrieval
// with citations, and a mind-map builder.

const DOCS_KEY = 'docsy-demo-documents';
const CONVS_KEY = 'docsy-demo-conversations';
const SEEDED_KEY = 'docsy-demo-seeded-v2';
const WHITEBOARD_PREFIX = 'docsy-demo-whiteboard-';

/* ------------------------------------------------------------------ */
/* Sample documents                                                    */
/* ------------------------------------------------------------------ */

const SAMPLE_OVERVIEW = `## Overview
Docsy is an AI research workspace that lets you chat with your own documents. You upload PDFs, scanned pages, Word files, images and plain text, and Docsy answers questions grounded in that content, with clickable citations that point back to the exact page and passage used.

## Ingestion and OCR
When a file is uploaded, Docsy detects whether each PDF page has a digital text layer. Digital pages are parsed directly with pdfplumber, while scanned pages and images are rasterised and sent through Tesseract OCR. Word documents are read paragraph by paragraph. The extracted text is cleaned to remove headers, footers, hyphenation artefacts and repeated whitespace before indexing.

## Chunking strategy
Cleaned text is split into overlapping semantic chunks that respect paragraph and heading boundaries. Each chunk keeps metadata such as the source file, page number and section title, so every answer can be traced back to its origin. Overlap between neighbouring chunks prevents important sentences from being cut in half.

## Embeddings and storage
Every chunk is converted into a dense vector with a sentence-transformer embedding model and stored in PostgreSQL using the pgvector extension. Keeping vectors next to the relational data means documents, users, permissions and embeddings live in one database with transactional guarantees.

## Hybrid retrieval
Questions are answered with hybrid search. A dense vector search finds passages with similar meaning, while a full-text keyword search catches exact names, codes and acronyms that embeddings can miss. The two ranked lists are merged with reciprocal rank fusion so that passages that score well on both signals rise to the top.

## Reranking
The fused candidates are re-scored by a cross-encoder reranker that reads the question and passage together. This second stage is slower but far more precise, and it is what produces the match percentage shown on each citation card.

## Answer generation and citations
The best passages are sent to a large language model together with the recent conversation history. The model is instructed to answer only from the supplied context and to admit when the documents do not contain the answer. Each response lists its sources, and clicking a source opens the document viewer on the cited page with the passage highlighted.

## Mind maps and whiteboard
For any processed document Docsy can generate an interactive mind map that organises the main topics and subtopics as a force-directed graph. A per-document whiteboard lets researchers sketch diagrams and notes next to their sources; it autosaves and can be exported as an image.

## Security and privacy
Accounts use hashed passwords and signed JWT access tokens. Every document is scoped to its owner, and an optional shared knowledge base is managed by administrators. Sensitive actions such as uploads, deletions and logins are written to an audit log, and API endpoints are rate limited.

## Evaluation
Retrieval quality is measured with an offline evaluation set of questions and expected source passages. Metrics such as recall at k and mean reciprocal rank are tracked whenever the chunking, embedding or reranking configuration changes, so regressions are caught before deployment.`;

const SAMPLE_INTERVIEWS = `## Study goal
We interviewed twelve graduate students and analysts to understand how they work with large collections of papers, reports and scanned archives, and where existing tools slow them down.

## Pain point: finding the passage again
Almost every participant described remembering that a fact was in some paper but losing time hunting for the exact page. Several kept spreadsheets of quotes and page numbers by hand. Citations that jump straight to the source passage were the most requested feature.

## Pain point: scanned material
Participants working with archives and handwritten notes said most tools ignore scanned PDFs entirely. Reliable OCR, and the ability to read the extracted text side by side with the original image, was seen as essential rather than a nice extra.

## Pain point: trust in AI answers
Participants were sceptical of chatbots that produce confident answers without sources. They said they would only trust an assistant that shows where every claim comes from and clearly says when the documents do not contain an answer.

## Workflow: synthesis and note taking
Researchers often move from reading to synthesis by sketching concept maps or diagrams. Many used a separate whiteboard app and copied quotes across manually. Keeping visual notes attached to each document was described as a significant time saver.

## Recommendations
Prioritise grounded answers with page-level citations, first-class OCR for scanned files, and lightweight visual tools such as mind maps and a whiteboard that live next to the source document. Keep the interface calm and focused so long reading sessions are comfortable.`;

const makeDoc = (id, name, text, subheading) => ({
  id,
  name,
  filename: name,
  size: `${(text.length / 1024).toFixed(1)} KB`,
  uploadedAt: new Date().toLocaleDateString(),
  processing_status: 'completed',
  extracted_text: text,
  isSample: true,
  previewText: {
    heading: name.toUpperCase(),
    subheading,
    sections: [{ title: 'DOCUMENT CONTENT PREVIEW', content: text.slice(0, 1500) }],
  },
});

export const getSampleDocuments = () => [
  makeDoc('demo-sample-overview', 'Docsy Technical Overview.md', SAMPLE_OVERVIEW, 'Sample document'),
  makeDoc('demo-sample-interviews', 'User Research Field Notes.md', SAMPLE_INTERVIEWS, 'Sample document'),
];

export const getSampleConversation = () => ({
  id: 'conv-demo-welcome',
  title: 'Welcome to the demo',
  mode: 'workspace',
  messages: [
    {
      id: 'msg-demo-welcome',
      sender: 'assistant',
      text:
        "Welcome to the **Docsy demo**. Two sample documents are already loaded and attached to this chat.\n\nTry asking:\n- How does hybrid retrieval work?\n- What did researchers say about scanned material?\n- Summarize the key insights\n\nYou can also upload your own `.pdf`, `.txt` or `.md` file. In the demo everything runs in your browser, so nothing is sent to a server.",
      citations: [],
    },
  ],
});

/* ------------------------------------------------------------------ */
/* Persistence                                                         */
/* ------------------------------------------------------------------ */

const safeGet = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeSet = (key, value) => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err) {
    console.warn('Demo storage write failed:', err);
    return false;
  }
};

export const loadDemoState = () => {
  let docs;
  let convs;
  try {
    docs = JSON.parse(safeGet(DOCS_KEY) || '[]');
    convs = JSON.parse(safeGet(CONVS_KEY) || '[]');
  } catch {
    docs = [];
    convs = [];
  }

  // First visit (or legacy demo data from before samples existed): seed sample content.
  if (!safeGet(SEEDED_KEY)) {
    const samples = getSampleDocuments();
    const existingIds = new Set(docs.map((d) => d.id));
    docs = [...samples.filter((s) => !existingIds.has(s.id)), ...docs];
    if (!convs.some((c) => c.id === 'conv-demo-welcome')) {
      convs = [getSampleConversation(), ...convs];
    }
    saveDemoDocs(docs);
    saveDemoConvs(convs);
    safeSet(SEEDED_KEY, '1');
  }

  return { docs, convs };
};

export const resetDemoState = () => {
  try {
    localStorage.removeItem(DOCS_KEY);
    localStorage.removeItem(CONVS_KEY);
    localStorage.removeItem(SEEDED_KEY);
    Object.keys(localStorage)
      .filter((k) => k.startsWith(WHITEBOARD_PREFIX))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore
  }
};

// Blob URLs are only valid for the current page session, so never persist them.
export const saveDemoDocs = (docs) => {
  const serialisable = docs.map((doc) => {
    const copy = { ...doc };
    delete copy.fileUrl;
    return copy;
  });
  safeSet(DOCS_KEY, JSON.stringify(serialisable));
};

export const saveDemoConvs = (convs) => {
  safeSet(CONVS_KEY, JSON.stringify(convs));
};

export const loadDemoWhiteboard = (docId) => {
  try {
    const raw = safeGet(WHITEBOARD_PREFIX + docId);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const saveDemoWhiteboard = (docId, canvasData) =>
  safeSet(WHITEBOARD_PREFIX + docId, JSON.stringify(canvasData));

/* ------------------------------------------------------------------ */
/* Text extraction                                                     */
/* ------------------------------------------------------------------ */

const TEXT_EXTENSIONS = /\.(txt|md|markdown|csv|json|html?|css|js|ts|py)$/i;

const readAsText = (file) =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result || '');
    reader.onerror = () => resolve('');
    reader.readAsText(file);
  });

const extractPdf = async (file) => {
  const pdfjs = await import('pdfjs-dist');
  const { default: workerUrl } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data }).promise;
  const pages = [];
  const maxPages = Math.min(pdf.numPages, 150);
  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    let text = '';
    let lastY = null;
    for (const item of content.items) {
      if (!('str' in item)) continue;
      const y = item.transform?.[5];
      if (lastY !== null && y !== undefined && Math.abs(y - lastY) > 2) {
        // New line; a large vertical jump is treated as a paragraph break.
        text += Math.abs(y - lastY) > (item.height || 10) * 1.8 ? '\n\n' : '\n';
      } else if (text && !text.endsWith(' ') && item.str && !item.str.startsWith(' ')) {
        text += ' ';
      }
      text += item.str;
      if (item.hasEOL) text += '\n';
      lastY = y ?? lastY;
    }
    pages.push({ page: i, text: text.replace(/[ \t]+/g, ' ').trim() });
  }
  return pages;
};

/**
 * Returns { text, pages, note } for an uploaded file.
 * `pages` is an array of { page, text } so citations can reference real page numbers.
 */
export const extractFileText = async (file) => {
  const name = file.name || 'file';
  try {
    if (/\.pdf$/i.test(name) || file.type === 'application/pdf') {
      const pages = await extractPdf(file);
      const text = pages.map((p) => p.text).join('\n\n');
      if (text.trim().length > 20) {
        return { text, pages };
      }
      return {
        text: `No selectable text was found in "${name}". It looks like a scanned PDF. In the full version of Docsy, scanned pages are processed with Tesseract OCR on the server; sign up to try it.`,
        pages: null,
        note: 'scanned',
      };
    }
    if (TEXT_EXTENSIONS.test(name) || file.type.startsWith('text/')) {
      return { text: await readAsText(file), pages: null };
    }
  } catch (err) {
    console.error('Demo extraction failed:', err);
    return {
      text: `Docsy could not read "${name}" in the browser demo (${err.message}). Try a different PDF or a .txt / .md file.`,
      pages: null,
      note: 'error',
    };
  }

  const kind = /\.(png|jpe?g|gif|webp)$/i.test(name) ? 'Images' : 'Word documents';
  return {
    text: `${kind} need server-side processing (OCR / document parsing), which isn't available in the browser demo. Sign up to upload "${name}" to the full Docsy workspace, or try a PDF, .txt or .md file here.`,
    pages: null,
    note: 'unsupported',
  };
};

/* ------------------------------------------------------------------ */
/* Retrieval                                                           */
/* ------------------------------------------------------------------ */

const STOPWORDS = new Set(
  `a about above after again against all am an and any are as at be because been before being below between both but by can could did do does doing down during each few for from further had has have having he her here hers herself him himself his how i if in into is it its itself just let me more most my myself no nor not now of off on once only or other our ours ourselves out over own same she should so some such than that the their theirs them themselves then there these they this those through to too under until up very was we were what when where which while who whom why will with would you your yours yourself yourselves also may might must shall within without across via per using use used uploaded upload file files document documents doc docs my tell please explain show give describe me what's whats does do`
    .split(/\s+/)
);

const stem = (w) => {
  if (w.length > 5 && w.endsWith('ing')) return w.slice(0, -3);
  if (w.length > 4 && w.endsWith('ies')) return `${w.slice(0, -3)}y`;
  if (w.length > 4 && w.endsWith('es')) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
  if (w.length > 5 && w.endsWith('ed')) return w.slice(0, -2);
  return w;
};

const tokenize = (text) =>
  (text.toLowerCase().match(/[a-z0-9][a-z0-9-]*/g) || [])
    .filter((w) => w.length > 1 && !STOPWORDS.has(w))
    .map(stem);

const splitSentences = (text) =>
  text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"'(])/)
    .map((s) => s.trim())
    .filter(Boolean);

/** Splits a document into chunks with { text, section, page, docName, docId, order }. */
const chunkDocument = (doc) => {
  const pageList = doc.pages?.length ? doc.pages : [{ page: 1, text: doc.extracted_text || '' }];
  const chunks = [];
  let section = '';
  let order = 0;

  pageList.forEach(({ page, text }) => {
    const blocks = (text || '').split(/\n\s*\n+/);
    blocks.forEach((block) => {
      const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
      const body = [];
      lines.forEach((line) => {
        const heading = line.match(/^#{1,6}\s+(.*)$/);
        if (heading) {
          section = heading[1].trim();
        } else {
          body.push(line);
        }
      });
      const content = body.join(' ').replace(/\s+/g, ' ').trim();
      if (content.length < 25) return;

      // Keep chunks a readable size: break very long blocks on sentence boundaries.
      const sentences = splitSentences(content);
      let buf = '';
      const flush = () => {
        if (buf.trim().length >= 25) {
          chunks.push({ text: buf.trim(), section, page, docName: doc.name, docId: doc.id, order: order++ });
        }
        buf = '';
      };
      sentences.forEach((s) => {
        if ((buf + ' ' + s).length > 700 && buf) flush();
        buf = buf ? `${buf} ${s}` : s;
      });
      flush();
    });
  });
  return chunks;
};

const scoreChunks = (chunks, queryTerms) => {
  const N = chunks.length || 1;
  const df = new Map();
  const chunkTokens = chunks.map((c) => {
    const toks = tokenize(`${c.section} ${c.text}`);
    new Set(toks).forEach((t) => df.set(t, (df.get(t) || 0) + 1));
    return toks;
  });
  const avgLen = chunkTokens.reduce((a, t) => a + t.length, 0) / N || 1;
  const k1 = 1.2;
  const b = 0.75;

  return chunks.map((chunk, i) => {
    const toks = chunkTokens[i];
    const tf = new Map();
    toks.forEach((t) => tf.set(t, (tf.get(t) || 0) + 1));
    const sectionToks = new Set(tokenize(chunk.section));
    let score = 0;
    let matched = 0;
    queryTerms.forEach((q) => {
      const f = tf.get(q) || 0;
      if (!f) return;
      matched++;
      const idf = Math.log(1 + (N - (df.get(q) || 0) + 0.5) / ((df.get(q) || 0) + 0.5));
      score += (idf * (f * (k1 + 1))) / (f + k1 * (1 - b + (b * toks.length) / avgLen));
      if (sectionToks.has(q)) score += idf * 0.6; // heading matches are strong signals
    });
    // Reward chunks that cover more of the distinct query terms.
    if (queryTerms.length > 1) score *= 0.6 + 0.4 * (matched / queryTerms.length);
    return { ...chunk, score, matched };
  });
};

const topTerms = (text, n = 6) => {
  const counts = new Map();
  (text.toLowerCase().match(/[a-z][a-z-]{3,}/g) || [])
    .filter((w) => !STOPWORDS.has(w))
    .forEach((w) => counts.set(w, (counts.get(w) || 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([w]) => w);
};

const toCitation = (chunk, maxScore) => ({
  filename: chunk.docName,
  original_filename: chunk.docName,
  document_id: chunk.docId,
  page_number: chunk.page,
  section_title: chunk.section || 'Document segment',
  chunk_text: chunk.text,
  // UI maps rerank_score in [-10, 10] to a 0-100% "Match" badge.
  rerank_score: maxScore > 0 ? Math.max(-10, Math.min(10, (chunk.score / maxScore) * 9)) : 0,
});

const bestSentences = (text, queryTerms, max = 2) => {
  const sentences = splitSentences(text);
  if (sentences.length <= max) return sentences.join(' ');
  const scored = sentences.map((s, idx) => {
    const toks = new Set(tokenize(s));
    const hits = queryTerms.filter((q) => toks.has(q)).length;
    return { s, idx, hits };
  });
  const picked = [...scored].sort((a, b) => b.hits - a.hits || a.idx - b.idx).slice(0, max);
  return picked.sort((a, b) => a.idx - b.idx).map((p) => p.s).join(' ');
};

const SUMMARY_RE = /\b(summar\w*|overview|tl;?dr|key (insight|finding|point|takeaway|metric)s?|insights?|takeaways?|main points?|notes?|outline|structured)\b/i;
const COMPARE_RE = /\b(compare|comparison|differ\w*|versus|vs\.?|contrast|methodolog\w*)\b/i;

const titleCase = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * Answers a question from the given documents entirely on the client.
 * Returns { answer, citations, title }.
 */
export const answerFromDocuments = (question, docs) => {
  if (!docs.length) {
    return {
      title: 'No documents',
      answer:
        "There are no documents in this demo workspace yet. Upload a `.pdf`, `.txt` or `.md` file with the **+** button, then ask me about it.",
      citations: [],
    };
  }

  const allChunks = docs.flatMap(chunkDocument);
  if (!allChunks.length) {
    const doc = docs[0];
    return {
      title: 'Nothing to search',
      answer: `I couldn't find readable text in **${doc.name}**.\n\n${doc.extracted_text || ''}`.trim(),
      citations: [],
    };
  }

  const queryTerms = [...new Set(tokenize(question))];
  const scored = scoreChunks(allChunks, queryTerms);
  const isSummary = SUMMARY_RE.test(question);
  const isCompare = COMPARE_RE.test(question) && docs.length > 1;

  // Summaries: one key sentence from each section, in document order.
  if (isSummary || (!queryTerms.length && !isCompare)) {
    const lines = [];
    const citations = [];
    docs.forEach((doc) => {
      const docChunks = scored.filter((c) => c.docId === doc.id);
      const seen = new Set();
      const picks = docChunks.filter((c) => {
        const key = c.section || `p${c.page}-${c.order}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }).slice(0, 7);
      if (!picks.length) return;
      lines.push(`### ${doc.name.replace(/\.[^.]+$/, '')}`);
      picks.forEach((c) => {
        const lead = splitSentences(c.text)[0];
        lines.push(c.section ? `- **${c.section}:** ${lead}` : `- ${lead}`);
      });
      lines.push('');
      citations.push(...picks.slice(0, 3).map((c) => toCitation({ ...c, score: 1 }, 1)));
    });
    return {
      title: docs.length === 1 ? `Summary: ${docs[0].name.replace(/\.[^.]+$/, '')}` : 'Summary of documents',
      answer: `Here are the key points from ${docs.length === 1 ? 'your document' : `your ${docs.length} documents`}:\n\n${lines.join('\n').trim()}`,
      citations,
    };
  }

  // Comparisons: best passage per document side by side.
  if (isCompare) {
    const lines = ['Here is how your documents compare on this question:', ''];
    const citations = [];
    const maxScore = Math.max(...scored.map((c) => c.score), 0);
    docs.forEach((doc) => {
      const docChunks = scored.filter((c) => c.docId === doc.id).sort((a, b) => b.score - a.score);
      const best = docChunks[0];
      if (!best) return;
      lines.push(`### ${doc.name.replace(/\.[^.]+$/, '')}`);
      lines.push(bestSentences(best.text, queryTerms, 2));
      lines.push('');
      citations.push(toCitation(best, maxScore || 1));
    });
    return { title: 'Document comparison', answer: lines.join('\n').trim(), citations };
  }

  const ranked = scored.filter((c) => c.score > 0).sort((a, b) => b.score - a.score);

  if (!ranked.length) {
    const suggestions = topTerms(docs.map((d) => d.extracted_text).join(' '), 5);
    return {
      title: 'No direct match',
      answer: `I searched ${docs.length === 1 ? `**${docs[0].name}**` : `your ${docs.length} documents`} but couldn't find anything matching "${question}".${
        suggestions.length ? `\n\nTry asking about **${suggestions.join('**, **')}**, or ask me to summarize the document.` : ''
      }`,
      citations: [],
    };
  }

  const maxScore = ranked[0].score;
  const top = ranked.filter((c) => c.score >= maxScore * 0.35).slice(0, 3);
  const [best, ...rest] = top;

  const lines = [];
  lines.push(bestSentences(best.text, queryTerms, 3));
  if (rest.length) {
    lines.push('');
    lines.push('**Related passages:**');
    rest.forEach((c) => {
      const label = c.section ? `**${c.section}** — ` : '';
      lines.push(`- ${label}${bestSentences(c.text, queryTerms, 1)}`);
    });
  }

  const title = best.section
    ? titleCase(best.section).slice(0, 40)
    : titleCase(question.replace(/[?!.]+$/, '')).slice(0, 40);

  return {
    title,
    answer: lines.join('\n'),
    citations: top.map((c) => toCitation(c, maxScore)),
  };
};

/* ------------------------------------------------------------------ */
/* Mind map                                                            */
/* ------------------------------------------------------------------ */

const shortLabel = (s, words = 4) => {
  const w = s.replace(/[^\w\s-]/g, '').split(/\s+/).filter(Boolean);
  return w.slice(0, words).join(' ') + (w.length > words ? '…' : '');
};

/** Builds a { topic, type, detail, children } tree compatible with the MindMap view. */
export const buildDemoMindMap = (doc) => {
  const chunks = chunkDocument(doc);
  const rootLabel = (doc.name || 'Document').replace(/\.[^.]+$/, '');

  // Group chunks by section; fall back to paragraphs when there are no headings.
  const groups = new Map();
  chunks.forEach((c) => {
    const key = c.section || '';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(c);
  });

  let topics;
  if (groups.size > 1 || (groups.size === 1 && !groups.has(''))) {
    topics = [...groups.entries()].filter(([k]) => k).map(([section, cs]) => ({ section, text: cs.map((c) => c.text).join(' ') }));
  } else {
    topics = chunks.slice(0, 8).map((c) => {
      const terms = topTerms(c.text, 2);
      return { section: terms.length ? titleCase(terms.join(' & ')) : shortLabel(c.text), text: c.text };
    });
  }

  const allText = chunks.map((c) => c.text).join(' ');
  const globalTerms = new Set(topTerms(allText, 8));

  return {
    topic: shortLabel(rootLabel, 4),
    type: 'root',
    detail: splitSentences(allText)[0] || '',
    children: topics.slice(0, 8).map(({ section, text }) => {
      const sentences = splitSentences(text);
      const labelWords = new Set(section.toLowerCase().split(/\W+/));
      const terms = topTerms(text, 10)
        .filter((t) => !globalTerms.has(t) && !labelWords.has(t))
        .slice(0, 3);
      return {
        topic: shortLabel(section, 4),
        type: 'topic',
        detail: sentences[0] || '',
        children: terms.map((term) => ({
          topic: titleCase(term),
          type: 'sub',
          detail: sentences.find((s) => s.toLowerCase().includes(term)) || '',
        })),
      };
    }),
  };
};
