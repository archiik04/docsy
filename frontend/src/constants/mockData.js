export const INITIAL_DOCUMENTS = [
  {
    id: 'doc-1',
    name: 'archi_kanungo.pdf',
    size: '184 KB',
    uploadedAt: 'May 24, 2026',
    previewText: {
      heading: 'ARCHI KANUNGO',
      subheading: 'Education & Technical Portfolio',
      sections: [
        {
          title: 'GLOBAL YOUTH ADVISOR AT GOOGLE',
          content:
            'Consulted on product strategies for Gen Z demographics, interface usability, and AI integration across productivity tools.',
        },
        {
          title: 'EMAILBRAIN (Tauri + React Project)',
          content:
            'Designed and integrated a React + Tauri desktop interface featuring calendar/task automation, tone profiling, and AI agent orchestration for productivity in email management.',
        },
        {
          title: 'NOTIFLOW (Hackathon Project)',
          content:
            'Developed an AI-powered business operations assistant that converts unstructured inputs into structured workflows for SMBs. Built automated agent systems to interpret natural language inputs.',
        },
        {
          title: 'LORE (AI Search Engine)',
          content:
            'Built a full-stack AI search engine inspired by Perplexity, integrating LLMs and Tavily Search API to deliver real-time, cited answers.',
        },
        {
          title: 'SNIP.GO (URL Shortener)',
          content:
            'Developed a high-performance URL shortener using Go (Gin) and Redis, achieving sub-50ms response times for instant link generation with analytics support.',
        },
      ],
    },
  },
  {
    id: 'doc-2',
    name: 'docsy_architecture.pdf',
    size: '1.2 MB',
    uploadedAt: 'May 23, 2026',
    previewText: {
      heading: 'DOCSY SYSTEM ARCHITECTURE',
      subheading: 'Robust RAG pipeline & Database layer',
      sections: [
        {
          title: 'INGESTION WORKFLOW',
          content:
            'Documents are uploaded as PDFs, parsed using fitz/PyMuPDF, chunked recursively (1000 character chunks, 200 overlap), embedded using SentenceTransformer (all-MiniLM-L6-v2), and stored in PostgreSQL with pgvector.',
        },
        {
          title: 'RETRIEVAL PIPELINE',
          content:
            'Vector similarity search using cosine distance (<=> operator) against the pgvector column. Retrieves 50 nearest neighbors, filters duplicates in Python, and passes the top 5 unique chunks to the LLM.',
        },
        {
          title: 'LLM REASONING LAYER',
          content:
            'Uses Meta Llama-3-8b-instruct served through OpenRouter. Encourages grounded inferences based on context-provided metadata, outputting citations dynamically mapped to original files.',
        },
      ],
    },
  },
];

export const INITIAL_CONVERSATIONS = [
  {
    id: 'conv-1',
    title: "Researching Archi's projects",
    docId: 'doc-1',
    messages: [
      { id: 'msg-1', sender: 'user', text: "What projects has Archi built?" },
      {
        id: 'msg-2',
        sender: 'assistant',
        text:
          'Based on the uploaded document [archi_kanungo.pdf], Archi Kanungo has built several notable AI and high-performance projects:\n\n1. **EmailBrain** [1]: A desktop application featuring task automation and AI agent orchestration for email productivity.\n2. **NotiFlow** [2]: An AI assistant that converts unstructured inputs into structured business workflows.\n3. **Lore** [3]: A full-stack AI search engine inspired by Perplexity.\n4. **Snip.go** [4]: A Go and Redis based high-performance URL shortener.\n\nHe has also served as a Global Youth Advisor at Google [5] consulting on AI product strategies.',
        citations: [
          {
            id: 1,
            section: 'EMAILBRAIN (Tauri + React Project)',
            text:
              'Designed and integrated a React + Tauri desktop interface featuring calendar/task automation, tone profiling, and AI agent orchestration for productivity in email management.',
          },
          {
            id: 2,
            section: 'NOTIFLOW (Hackathon Project)',
            text:
              'Developed an AI-powered business operations assistant that converts unstructured inputs into structured workflows for SMBs. Built automated agent systems to interpret natural language inputs.',
          },
          {
            id: 3,
            section: 'LORE (AI Search Engine)',
            text:
              'Built a full-stack AI search engine inspired by Perplexity, integrating LLMs and Tavily Search API to deliver real-time, cited answers.',
          },
          {
            id: 4,
            section: 'SNIP.GO (URL Shortener)',
            text:
              'Developed a high-performance URL shortener using Go (Gin) and Redis, achieving sub-50ms response times for instant link generation with analytics support.',
          },
          {
            id: 5,
            section: 'GLOBAL YOUTH ADVISOR AT GOOGLE',
            text:
              'Consulted on product strategies for Gen Z demographics, interface usability, and AI integration across productivity tools.',
          },
        ],
      },
    ],
  },
];

export const FALLBACK_RESPONSES = {
  'doc-1': {
    projects: {
      text:
        'According to [archi_kanungo.pdf], Archi Kanungo has built several AI projects:\n\n- **EmailBrain** [1]: Tauri + React automation interface.\n- **NotiFlow** [2]: AI assistant converting unstructured inputs to workflows.\n- **Lore** [3]: AI-native Perplexity-like search engine.\n- **Snip.go** [4]: URL shortener achieving sub-50ms redirection.',
      citations: [
        {
          id: 1,
          section: 'EMAILBRAIN (Tauri + React Project)',
          text:
            'Designed and integrated a React + Tauri desktop interface featuring calendar/task automation, tone profiling, and AI agent orchestration for productivity in email management.',
        },
        {
          id: 2,
          section: 'NOTIFLOW (Hackathon Project)',
          text:
            'Developed an AI-powered business operations assistant that converts unstructured inputs into structured workflows for SMBs. Built automated agent systems to interpret natural language inputs.',
        },
        {
          id: 3,
          section: 'LORE (AI Search Engine)',
          text:
            'Built a full-stack AI search engine inspired by Perplexity, integrating LLMs and Tavily Search API to deliver real-time, cited answers.',
        },
        {
          id: 4,
          section: 'SNIP.GO (URL Shortener)',
          text:
            'Developed a high-performance URL shortener using Go (Gin) and Redis, achieving sub-50ms response times for instant link generation with analytics support.',
        },
      ],
    },
    default: {
      text:
        'From [archi_kanungo.pdf], Archi is currently a computer science student [1] with experience serving as a Global Youth Advisor at Google [2], and has placed Top 15 in the OpenAI Hackathon [3].',
      citations: [
        {
          id: 1,
          section: 'EDUCATION',
          text:
            'Jul 2023 - Jul 2027: Bachelor of Technology (CSE) at Kalinga Institute of Industrial Technology, Bhubaneswar. CGPA -8.01',
        },
        {
          id: 2,
          section: 'GLOBAL YOUTH ADVISOR AT GOOGLE',
          text:
            'Consulted on product strategies for Gen Z demographics, interface usability, and AI integration across productivity tools.',
        },
        {
          id: 3,
          section: 'AWARDS & ACHIEVEMENTS',
          text:
            'Top 15 (Finalist) : OpenAI - NxtWave - IndiaAI Hackathon 2026',
        },
      ],
    },
  },
  'doc-2': {
    retrieval: {
      text:
        'The **Docsy Retrieval Pipeline** [1] joins the chunks and documents tables to fetch original filenames, queries 50 chunks, and applies Python deduplication to feed the top 5 unique chunks to the LLM. This prevents duplicate uploads from clogging the context.',
      citations: [
        {
          id: 1,
          section: 'RETRIEVAL PIPELINE',
          text:
            'Vector similarity search using cosine distance (<=> operator) against the pgvector column. Retrieves 50 nearest neighbors, filters duplicates in Python, and passes the top 5 unique chunks to the LLM.',
        },
      ],
    },
    default: {
      text:
        'Docsy uses a multi-tier pipeline:\n1. **Ingestion** [1]: PDFs are parsed using fitz/PyMuPDF, recursively chunked, and stored in pgvector.\n2. **Retrieval** [2]: Cosine similarity matching fetches unique, non-duplicate chunks.\n3. **Reasoning** [3]: LLM prompt generates citations directly from document sources.',
      citations: [
        {
          id: 1,
          section: 'INGESTION WORKFLOW',
          text:
            'Documents are uploaded as PDFs, parsed using fitz/PyMuPDF, chunked recursively (1000 character chunks, 200 overlap), embedded using SentenceTransformer (all-MiniLM-L6-v2), and stored in PostgreSQL with pgvector.',
        },
        {
          id: 2,
          section: 'RETRIEVAL PIPELINE',
          text:
            'Vector similarity search using cosine distance (<=> operator) against the pgvector column. Retrieves 50 nearest neighbors, filters duplicates in Python, and passes the top 5 unique chunks to the LLM.',
        },
        {
          id: 3,
          section: 'LLM REASONING LAYER',
          text:
            'Uses Meta Llama-3-8b-instruct served through OpenRouter. Encourages grounded inferences based on context-provided metadata, outputting citations dynamically mapped to original files.',
        },
      ],
    },
  },
};