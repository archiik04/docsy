import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  MessageSquare, 
  Plus, 
  Search, 
  Send, 
  UploadCloud, 
  LogOut, 
  Menu, 
  X, 
  ChevronRight, 
  Clock, 
  Settings, 
  BookOpen, 
  User, 
  ExternalLink, 
  Lock, 
  Mail, 
  ArrowLeft,
  Loader2,
  FileDown,
  Info
} from 'lucide-react';

// Pre-populated Mock Data
const INITIAL_DOCUMENTS = [
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
          content: 'Consulted on product strategies for Gen Z demographics, interface usability, and AI integration across productivity tools.'
        },
        {
          title: 'EMAILBRAIN (Tauri + React Project)',
          content: 'Designed and integrated a React + Tauri desktop interface featuring calendar/task automation, tone profiling, and AI agent orchestration for productivity in email management.'
        },
        {
          title: 'NOTIFLOW (Hackathon Project)',
          content: 'Developed an AI-powered business operations assistant that converts unstructured inputs into structured workflows for SMBs. Built automated agent systems to interpret natural language inputs.'
        },
        {
          title: 'LORE (AI Search Engine)',
          content: 'Built a full-stack AI search engine inspired by Perplexity, integrating LLMs and Tavily Search API to deliver real-time, cited answers.'
        },
        {
          title: 'SNIP.GO (URL Shortener)',
          content: 'Developed a high-performance URL shortener using Go (Gin) and Redis, achieving sub-50ms response times for instant link generation with analytics support.'
        }
      ]
    }
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
          content: 'Documents are uploaded as PDFs, parsed using fitz/PyMuPDF, chunked recursively (1000 character chunks, 200 overlap), embedded using SentenceTransformer (all-MiniLM-L6-v2), and stored in PostgreSQL with pgvector.'
        },
        {
          title: 'RETRIEVAL PIPELINE',
          content: 'Vector similarity search using cosine distance (<=> operator) against the pgvector column. Retrieves 50 nearest neighbors, filters duplicates in Python, and passes the top 5 unique chunks to the LLM.'
        },
        {
          title: 'LLM REASONING LAYER',
          content: 'Uses Meta Llama-3-8b-instruct served through OpenRouter. Encourages grounded inferences based on context-provided metadata, outputting citations dynamically mapped to original files.'
        }
      ]
    }
  }
];

const INITIAL_CONVERSATIONS = [
  {
    id: 'conv-1',
    title: 'Researching Archi\'s projects',
    docId: 'doc-1',
    messages: [
      {
        id: 'msg-1',
        sender: 'user',
        text: 'What projects has Archi built?'
      },
      {
        id: 'msg-2',
        sender: 'assistant',
        text: 'Based on the uploaded document [archi_kanungo.pdf], Archi Kanungo has built several notable AI and high-performance projects:\n\n1. **EmailBrain** [1]: A desktop application featuring task automation and AI agent orchestration for email productivity.\n2. **NotiFlow** [2]: An AI assistant that converts unstructured inputs into structured business workflows.\n3. **Lore** [3]: A full-stack AI search engine inspired by Perplexity.\n4. **Snip.go** [4]: A Go and Redis based high-performance URL shortener.\n\nHe has also served as a Global Youth Advisor at Google [5] consulting on AI product strategies.',
        citations: [
          { id: 1, section: 'EMAILBRAIN (Tauri + React Project)', text: 'Designed and integrated a React + Tauri desktop interface featuring calendar/task automation, tone profiling, and AI agent orchestration for productivity in email management.' },
          { id: 2, section: 'NOTIFLOW (Hackathon Project)', text: 'Developed an AI-powered business operations assistant that converts unstructured inputs into structured workflows for SMBs. Built automated agent systems to interpret natural language inputs.' },
          { id: 3, section: 'LORE (AI Search Engine)', text: 'Built a full-stack AI search engine inspired by Perplexity, integrating LLMs and Tavily Search API to deliver real-time, cited answers.' },
          { id: 4, section: 'SNIP.GO (URL Shortener)', text: 'Developed a high-performance URL shortener using Go (Gin) and Redis, achieving sub-50ms response times for instant link generation with analytics support.' },
          { id: 5, section: 'GLOBAL YOUTH ADVISOR AT GOOGLE', text: 'Consulted on product strategies for Gen Z demographics, interface usability, and AI integration across productivity tools.' }
        ]
      }
    ]
  }
];

export default function App() {
  const [view, setView] = useState('landing'); // 'landing', 'auth', 'dashboard'
  const [authMode, setAuthMode] = useState('login'); // 'login', 'signup'
  
  // Auth Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  
  // Dynamic User Profile state
  const [currentUser, setCurrentUser] = useState({
    name: 'User Account',
    email: 'researcher@docsy.ai'
  });

  // Auth validation error message
  const [authError, setAuthError] = useState('');
  
  // Dashboard State
  const [documents, setDocuments] = useState(INITIAL_DOCUMENTS);
  const [selectedDocId, setSelectedDocId] = useState('doc-1');
  const [conversations, setConversations] = useState(INITIAL_CONVERSATIONS);
  const [selectedConvId, setSelectedConvId] = useState('conv-1');
  
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Immersive Highlight states
  const [highlightedText, setHighlightedText] = useState('');
  const [highlightedSection, setHighlightedSection] = useState('');
  
  // File upload simulation
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const messagesEndRef = useRef(null);

  // Auto-login from existing token on mount
  useEffect(() => {
    const fetchMe = async () => {
      const token = localStorage.getItem('docsy_token');
      if (token) {
        try {
          const meRes = await fetch('http://127.0.0.1:8000/api/v1/auth/me', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (meRes.ok) {
            const meData = await meRes.json();
            setCurrentUser({
              name: meData.full_name || 'User Account',
              email: meData.email || 'researcher@docsy.ai'
            });
            navigateTo('dashboard');
          }
        } catch (err) {
          console.log("Auto-login failed:", err);
        }
      }
    };
    fetchMe();
  }, []);

  // Handle Authentication submit (Backend Integration with Fallback)
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    
    let displayName = name.trim();
    let displayEmail = email.trim();
    let isBackendActive = false;
    
    try {
      const checkRes = await fetch('http://127.0.0.1:8000/');
      if (checkRes.ok) {
        isBackendActive = true;
      }
    } catch (err) {
      console.log("Backend server is offline, enabling demo mode fallback.");
    }
    
    if (isBackendActive) {
      try {
        if (authMode === 'signup') {
          const regRes = await fetch('http://127.0.0.1:8000/api/v1/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: displayEmail,
              full_name: displayName || 'User Account',
              password: password
            })
          });
          
          if (!regRes.ok) {
            const errData = await regRes.json();
            setAuthError(errData.detail || "Registration failed. Try again.");
            return;
          }
        }
        
        // Login attempt
        const logRes = await fetch('http://127.0.0.1:8000/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: displayEmail,
            password: password
          })
        });
        
        if (!logRes.ok) {
          const errData = await logRes.json();
          setAuthError(errData.detail || "Invalid email or password.");
          return;
        } else {
          const logData = await logRes.json();
          localStorage.setItem('docsy_token', logData.access_token);
          
          // Fetch profile details
          const meRes = await fetch('http://127.0.0.1:8000/api/v1/auth/me', {
            headers: { 'Authorization': `Bearer ${logData.access_token}` }
          });
          
          if (meRes.ok) {
            const meData = await meRes.json();
            displayName = meData.full_name;
            displayEmail = meData.email;
          }
        }
      } catch (err) {
        console.error("Auth transaction failed:", err);
        setAuthError("An error occurred during authentication.");
        return;
      }
    }
    
    // Formatting email name if displayName is blank (derived name logic)
    if (!displayName && displayEmail) {
      const emailPrefix = displayEmail.split('@')[0];
      displayName = emailPrefix
        .split(/[\._\-]/)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
    }
    
    if (!displayName) {
      displayName = 'User Account';
    }
    
    setCurrentUser({
      name: displayName,
      email: displayEmail || 'researcher@docsy.ai'
    });
    
    navigateTo('dashboard');
  };

  // Handle Logout
  const handleLogout = () => {
    localStorage.removeItem('docsy_token');
    setEmail('');
    setPassword('');
    setName('');
    setCurrentUser({
      name: 'User Account',
      email: 'researcher@docsy.ai'
    });
    navigateTo('landing');
  };

  // Select active document and handle conversation context switching
  const handleSelectDocument = (docId) => {
    setSelectedDocId(docId);
    setHighlightedSection('');
    setHighlightedText('');
    
    // Find if there's an existing conversation for this document
    const existingConv = conversations.find(c => c.docId === docId);
    if (existingConv) {
      setSelectedConvId(existingConv.id);
    } else {
      // Create a new conversation tied to this document
      const newConvId = `conv-${Date.now()}`;
      const docName = documents.find(d => d.id === docId)?.name || 'New Document';
      const newConv = {
        id: newConvId,
        title: `Research Discussion`,
        docId: docId,
        messages: []
      };
      setConversations(prev => [newConv, ...prev]);
      setSelectedConvId(newConvId);
    }
  };

  // Auto-scroll chat to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (view === 'dashboard') {
      scrollToBottom();
    }
  }, [conversations, view]);

  // Navigate & Reset highlights
  const navigateTo = (newView) => {
    setView(newView);
    setHighlightedText('');
    setHighlightedSection('');
    setAuthError('');
  };

  // Drag and Drop simulation
  const handleFileUpload = (e) => {
    e.preventDefault();
    setIsUploading(true);
    setUploadProgress(0);

    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            const newDoc = {
              id: `doc-${Date.now()}`,
              name: e.target.files?.[0]?.name || 'new_research_paper.pdf',
              size: '412 KB',
              uploadedAt: 'Just now',
              previewText: {
                heading: e.target.files?.[0]?.name.toUpperCase() || 'RESEARCH PAPER',
                subheading: 'Newly Ingested Text Document',
                sections: [
                  {
                    title: 'INGESTED ABSTRACT',
                    content: 'This document was successfully processed by Docsy\'s chunking algorithm. All paragraphs are split semantically, indexed with embeddings, and ready for vector queries.'
                  }
                ]
              }
            };
            setDocuments(prevDocs => [newDoc, ...prevDocs]);
            setIsUploading(false);
            
            // Automatically select active document and create a new conversation context
            setSelectedDocId(newDoc.id);
            setHighlightedSection('');
            setHighlightedText('');
            
            const newConvId = `conv-${Date.now()}`;
            const newConv = {
              id: newConvId,
              title: `Research: ${newDoc.name}`,
              docId: newDoc.id,
              messages: []
            };
            setConversations(prev => [newConv, ...prev]);
            setSelectedConvId(newConvId);
          }, 600);
          return 100;
        }
        return prev + 25;
      });
    }, 150);
  };

  // Simulate file dragover
  const handleDragOver = (e) => {
    e.preventDefault();
  };

  // Create new conversation
  const handleNewConversation = () => {
    const newConvId = `conv-${Date.now()}`;
    const docName = documents.find(d => d.id === selectedDocId)?.name || 'Workspace';
    const newConv = {
      id: newConvId,
      title: `Discussion: ${docName}`,
      docId: selectedDocId,
      messages: []
    };
    setConversations([newConv, ...conversations]);
    setSelectedConvId(newConvId);
  };

  // Send message function (Live Backend Connection with fallback)
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!chatInput.trim()) return;

    const userQuery = chatInput;
    setChatInput('');

    // Append User Message
    const updatedMessages = [
      ...currentConversation.messages,
      { id: `msg-${Date.now()}-user`, sender: 'user', text: userQuery }
    ];

    setConversations(prevConvs => 
      prevConvs.map(c => c.id === selectedConvId ? { ...c, messages: updatedMessages } : c)
    );

    setIsTyping(true);

    try {
      // 1. Attempt to fetch from real local backend (POST request with document_id scoped context)
      const response = await fetch(`http://127.0.0.1:8000/api/v1/chat/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          question: userQuery,
          document_id: selectedDocId
        })
      });
      if (response.ok) {
        const data = await response.json();
        setIsTyping(false);
        
        // Append backend response
        const nextMessages = [
          ...updatedMessages,
          {
            id: `msg-${Date.now()}-assistant`,
            sender: 'assistant',
            text: data.answer,
            citations: selectedDoc?.previewText?.sections.map((sec, idx) => ({
              id: idx + 1,
              section: sec.title,
              text: sec.content
            })) || []
          }
        ];

        setConversations(prevConvs => 
          prevConvs.map(c => c.id === selectedConvId ? { ...c, messages: nextMessages } : c)
        );
        return;
      }
    } catch (err) {
      console.log("FastAPI backend is offline. Using client simulation...", err);
    }

    // 2. Simulated response fallback
    setTimeout(() => {
      setIsTyping(false);
      let responseText = `I have researched your question across the document context. `;
      let citations = [];

      const queryLower = userQuery.toLowerCase();
      if (selectedDocId === 'doc-1') {
        if (queryLower.includes('project') || queryLower.includes('build') || queryLower.includes('archi')) {
          responseText = `According to [archi_kanungo.pdf], Archi Kanungo has built several AI projects: \n\n- **EmailBrain** [1]: Tauri + React automation interface.\n- **NotiFlow** [2]: AI assistant converting unstructured inputs to workflows.\n- **Lore** [3]: AI-native Perplexity-like search engine.\n- **Snip.go** [4]: URL shortener achieving sub-50ms redirection.`;
          citations = [
            { id: 1, section: 'EMAILBRAIN (Tauri + React Project)', text: 'Designed and integrated a React + Tauri desktop interface featuring calendar/task automation, tone profiling, and AI agent orchestration for productivity in email management.' },
            { id: 2, section: 'NOTIFLOW (Hackathon Project)', text: 'Developed an AI-powered business operations assistant that converts unstructured inputs into structured workflows for SMBs. Built automated agent systems to interpret natural language inputs.' },
            { id: 3, section: 'LORE (AI Search Engine)', text: 'Built a full-stack AI search engine inspired by Perplexity, integrating LLMs and Tavily Search API to deliver real-time, cited answers.' },
            { id: 4, section: 'SNIP.GO (URL Shortener)', text: 'Developed a high-performance URL shortener using Go (Gin) and Redis, achieving sub-50ms response times for instant link generation with analytics support.' }
          ];
        } else {
          responseText = `From [archi_kanungo.pdf], Archi is currently a computer science student [1] with experience serving as a Global Youth Advisor at Google [2], and has placed Top 15 in the OpenAI Hackathon [3].`;
          citations = [
            { id: 1, section: 'EDUCATION', text: 'Jul 2023 - Jul 2027: Bachelor of Technology (CSE) at Kalinga Institute of Industrial Technology, Bhubaneswar. CGPA -8.01' },
            { id: 2, section: 'GLOBAL YOUTH ADVISOR AT GOOGLE', text: 'Consulted on product strategies for Gen Z demographics, interface usability, and AI integration across productivity tools.' },
            { id: 3, section: 'AWARDS & ACHIEVEMENTS', text: 'Top 15 (Finalist) : OpenAI - NxtWave - IndiaAI Hackathon 2026' }
          ];
        }
      } else if (selectedDocId === 'doc-2') {
        if (queryLower.includes('retrieval') || queryLower.includes('search') || queryLower.includes('limit')) {
          responseText = `The **Docsy Retrieval Pipeline** [1] joins the chunks and documents tables to fetch original filenames, queries 50 chunks, and applies Python deduplication to feed the top 5 unique chunks to the LLM. This prevents duplicate uploads from clogging the context.`;
          citations = [
            { id: 1, section: 'RETRIEVAL PIPELINE', text: 'Vector similarity search using cosine distance (<=> operator) against the pgvector column. Retrieves 50 nearest neighbors, filters duplicates in Python, and passes the top 5 unique chunks to the LLM.' }
          ];
        } else {
          responseText = `Docsy uses a multi-tier pipeline:\n1. **Ingestion** [1]: PDFs are parsed using fitz/PyMuPDF, recursively chunked, and stored in pgvector.\n2. **Retrieval** [2]: Cosm similarity matching fetches unique, non-duplicate chunks.\n3. **Reasoning** [3]: LLM prompt generates citations directly from document sources.`;
          citations = [
            { id: 1, section: 'INGESTION WORKFLOW', text: 'Documents are uploaded as PDFs, parsed using fitz/PyMuPDF, chunked recursively (1000 character chunks, 200 overlap), embedded using SentenceTransformer (all-MiniLM-L6-v2), and stored in PostgreSQL with pgvector.' },
            { id: 2, section: 'RETRIEVAL PIPELINE', text: 'Vector similarity search using cosine distance (<=> operator) against the pgvector column. Retrieves 50 nearest neighbors, filters duplicates in Python, and passes the top 5 unique chunks to the LLM.' },
            { id: 3, section: 'LLM REASONING LAYER', text: 'Uses Meta Llama-3-8b-instruct served through OpenRouter. Encourages grounded inferences based on context-provided metadata, outputting citations dynamically mapped to original files.' }
          ];
        }
      } else {
        responseText = `This newly uploaded file is active. Ask questions and they will be answered from the parsed chunks!`;
      }

      const nextMessages = [
        ...updatedMessages,
        { id: `msg-${Date.now()}-assistant`, sender: 'assistant', text: responseText, citations }
      ];

      setConversations(prevConvs => 
        prevConvs.map(c => c.id === selectedConvId ? { ...c, messages: nextMessages } : c)
      );
    }, 1200);
  };

  // Handle Citation click (Interactive Preview panel link!)
  const handleCitationClick = (citation) => {
    setHighlightedSection(citation.section);
    setHighlightedText(citation.text);
  };

  // Find active data objects
  const currentConversation = conversations.find(c => c.id === selectedConvId) || conversations[0];
  const selectedDoc = documents.find(d => d.id === selectedDocId) || documents[0];

  return (
    <div className="landing-container">
      {/* Background ambient lighting */}
      <div className="ambient-bg" />

      {/* 1. LANDING PAGE VIEW */}
      {view === 'landing' && (
        <>
          <nav className="navbar">
            <div className="logo" onClick={() => navigateTo('landing')}>
              <span>Docsy</span>
            </div>
            <ul className="nav-links">
              <li><a href="#home" className="active">Home</a></li>
              <li><a href="#product">Product</a></li>
              <li><a href="#about">About</a></li>
              <li><a href="#blog">Blog</a></li>
              <li><a href="#contact">Contact</a></li>
            </ul>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
              <button className="pill-button" onClick={() => { setAuthMode('login'); navigateTo('auth'); }}>
                Start Researching
              </button>
            </div>
          </nav>

          {/* Floating interactive tags popping up from around the person writing in the field */}
          <div className="floating-feature-tag floating-tag-1">Isolated Memory</div>
          <div className="floating-feature-tag floating-tag-2">Starlight Space</div>
          <div className="floating-feature-tag floating-tag-3">Cited Grounding</div>
          <div className="floating-feature-tag floating-tag-4">Scoped Retrieval</div>
          <div className="floating-feature-tag floating-tag-5">Instant Indexing</div>

          <section className="hero-section">
            <h1 className="hero-title">
              Where thoughts touch <br />
              <span className="title-serif">the infinite.</span>
            </h1>
            <p className="hero-subtitle">
              A calm, cinematic workspace for your document research. Let your questions float into starlight and receive grounded, cited answers.
            </p>
            <div className="hero-ctas">
              <button className="pill-button-glow" onClick={() => { setAuthMode('signup'); navigateTo('auth'); }}>
                Start Researching
              </button>
            </div>
          </section>

          <footer className="footer-nav">
            <div>© 2026 Docsy Inc. All rights reserved.</div>
            <div style={{ display: 'flex', gap: '24px' }}>
              <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Privacy</a>
              <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Terms</a>
            </div>
          </footer>
        </>
      )}

      {/* 2. AUTHENTICATION VIEW */}
      {view === 'auth' && (
        <div className="auth-container">
          <div className="back-home" onClick={() => navigateTo('landing')}>
            <ArrowLeft size={16} /> Back to home
          </div>
          <div className="auth-card glass-panel">
            <div className="auth-header">
              <div className="logo dashboard-logo" onClick={() => navigateTo('landing')} style={{ cursor: 'pointer', justifyContent: 'center' }}>
                <span>Docsy</span>
              </div>
              <h2 className="auth-title">
                {authMode === 'login' ? (
                  <>Welcome <span className="title-serif">back</span></>
                ) : (
                  <>Create your <span className="title-serif">account</span></>
                )}
              </h2>
              <p className="auth-subtitle">
                {authMode === 'login' ? 'Enter your details to log in' : 'Start your editorial research journey'}
              </p>
            </div>
            
            {authError && (
              <div className="auth-error-alert">
                <Info size={14} />
                <span>{authError}</span>
              </div>
            )}
            
            <form className="auth-form" onSubmit={handleAuthSubmit}>
              {authMode === 'signup' && (
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Enter your name" 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    required 
                  />
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input 
                  type="email" 
                  className="form-input" 
                  placeholder="name@domain.com" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  required 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input 
                  type="password" 
                  className="form-input" 
                  placeholder="••••••••" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  required 
                />
              </div>
              
              <button type="submit" className="auth-submit-btn">
                {authMode === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
            </form>

            <div className="auth-switch">
               {authMode === 'login' ? (
                 <>
                   Don't have an account? 
                   <span className="auth-switch-link" onClick={() => { setAuthMode('signup'); setAuthError(''); }}>Sign up</span>
                 </>
               ) : (
                 <>
                   Already have an account? 
                   <span className="auth-switch-link" onClick={() => { setAuthMode('login'); setAuthError(''); }}>Sign in</span>
                 </>
               )}
            </div>
          </div>
        </div>
      )}

      {/* 3. MAIN WORKSPACE DASHBOARD */}
      {view === 'dashboard' && (
        <div className="dashboard-container">
          
          {/* Sidebar */}
          <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
            <div className="sidebar-header">
              <div className="logo dashboard-logo" onClick={() => navigateTo('landing')} style={{ cursor: 'pointer' }}>
                <span>Docsy</span>
              </div>
              <button 
                className="logout-btn" 
                onClick={() => setSidebarOpen(false)}
                style={{ display: sidebarOpen ? 'block' : 'none' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="sidebar-menu-wrapper">
              {/* Document upload block */}
              <div className="sidebar-section">
                <label className="sidebar-section-title">Documents</label>
                
                {/* File Upload component */}
                <label className="upload-area">
                  <UploadCloud size={24} className="text-secondary" style={{ opacity: 0.7 }} />
                  <div className="upload-title">Drop PDF or browse</div>
                  <div className="upload-subtitle">Max size 10MB</div>
                  <input 
                    type="file" 
                    accept=".pdf" 
                    style={{ display: 'none' }} 
                    onChange={handleFileUpload} 
                    disabled={isUploading}
                  />
                </label>

                {isUploading && (
                  <div style={{ padding: '8px', fontSize: '12px', color: 'var(--accent-purple)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Uploading... {uploadProgress}%</span>
                  </div>
                )}

                {/* List of uploaded documents */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '12px' }}>
                  {documents.map((doc) => (
                    <div 
                      key={doc.id} 
                      className={`doc-list-item ${selectedDocId === doc.id ? 'active' : ''}`}
                      onClick={() => handleSelectDocument(doc.id)}
                    >
                      <FileText size={14} />
                      <span className="doc-name">{doc.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Conversations List */}
              <div className="sidebar-section">
                <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="sidebar-section-title">Chats</label>
                  <button 
                    onClick={handleNewConversation}
                    style={{ background: 'transparent', border: 'none', color: 'var(--accent-purple)', cursor: 'pointer', padding: '2px' }}
                  >
                    <Plus size={14} />
                  </button>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {conversations.map((conv) => (
                    <div 
                      key={conv.id} 
                      className={`chat-list-item ${selectedConvId === conv.id ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedConvId(conv.id);
                        if (conv.docId) {
                          setSelectedDocId(conv.docId);
                          setHighlightedSection('');
                          setHighlightedText('');
                        }
                      }}
                    >
                      <MessageSquare size={14} />
                      <span className="doc-name">{conv.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="sidebar-footer">
              <div className="user-profile">
                <div className="user-avatar">
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="user-info">
                  <span className="user-name">{currentUser.name}</span>
                  <span className="user-email">{currentUser.email}</span>
                </div>
              </div>
              <button className="logout-btn" onClick={handleLogout}>
                <LogOut size={16} />
              </button>
            </div>
          </aside>

          {/* Central Workspace */}
          <main className="chat-workspace">
            {/* Header */}
            <div className="workspace-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
                  <Menu size={20} />
                </button>
                <div className="header-title" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13.5px', fontWeight: '500', color: '#fff' }}>
                    <MessageSquare size={14} className="text-secondary" />
                    <span>{currentConversation?.title}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', paddingLeft: '20px' }}>
                    Researching: <span style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>{selectedDoc?.name || 'No document selected'}</span>
                  </div>
                </div>
              </div>

              <div className="header-actions">
                <button className="secondary-button" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={handleNewConversation}>
                  <Plus size={13} /> New Chat
                </button>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="chat-messages">
              {currentConversation?.messages.length === 0 ? (
                <div className="welcome-screen">
                  <h2 className="welcome-title">
                    Query your <span className="serif">research context</span>
                  </h2>
                  <p className="welcome-subtitle">
                    Ask questions about <span style={{ color: '#fff', fontWeight: '600' }}>{selectedDoc?.name || 'the active document'}</span>. Results are retrieved using vector similarity and cited directly from source text.
                  </p>
                  
                  <div className="welcome-suggestions">
                    <div className="suggestion-card" onClick={() => { setChatInput('What projects has Archi built?'); }}>
                      <div className="suggestion-title">List projects</div>
                      <div className="suggestion-desc">Find all software and hackathon projects inside the resume.</div>
                    </div>
                    <div className="suggestion-card" onClick={() => { setChatInput('How does the retrieval pipeline work?'); }}>
                      <div className="suggestion-title">Research architecture</div>
                      <div className="suggestion-desc">Analyze how the ingestion and vector matching works.</div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {currentConversation?.messages.map((msg) => (
                    <div key={msg.id} className={`message-card ${msg.sender}`}>
                      <div className="avatar-wrapper">
                        {msg.sender === 'user' ? <User size={14} /> : <div style={{ fontSize: '10px', fontWeight: 'bold', letterSpacing: '0.5px' }}>AI</div>}
                      </div>
                      <div className="message-content-wrapper">
                        <div className="message-bubble">
                          {msg.text.split('\n').map((line, i) => (
                            <p key={i} style={{ marginBottom: line ? '10px' : '0' }}>{line}</p>
                          ))}
                        </div>
                        {msg.sender === 'assistant' && msg.citations && msg.citations.length > 0 && (
                          <div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '500' }}>
                              CITATIONS (Click to highlight in document)
                            </div>
                            <div className="citations-list">
                              {msg.citations.map((cit) => (
                                <button 
                                  key={cit.id} 
                                  className="citation-tag"
                                  onClick={() => handleCitationClick(cit)}
                                >
                                  [{cit.id}] {cit.section}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {isTyping && (
                    <div className="message-card assistant">
                      <div className="avatar-wrapper">
                        <div style={{ fontSize: '10px', fontWeight: 'bold', letterSpacing: '0.5px' }} className="animate-pulse">AI</div>
                      </div>
                      <div className="message-content-wrapper">
                        <div className="message-bubble" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Loader2 size={16} className="animate-spin text-secondary" style={{ color: 'var(--accent-purple)' }} />
                          <span style={{ color: 'var(--text-secondary)' }}>Synthesizing chunks...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Chat Input */}
            <div className="chat-input-container">
              <form onSubmit={handleSendMessage} className="chat-input-wrapper">
                <input 
                  type="text"
                  className="chat-textarea"
                  placeholder={`Ask anything about ${selectedDoc?.name || 'uploaded document'}...`}
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                />
                <button type="button" className="chat-action-btn">
                  <Clock size={16} />
                </button>
                <button type="submit" className="chat-send-btn">
                  <Send size={14} />
                </button>
              </form>
              <div className="chat-disclaimer">
                Docsy matches queries using pgvector search and meta-llama LLM.
              </div>
            </div>
          </main>

          {/* Right-side Document Preview Panel */}
          <aside key={selectedDocId} className="preview-panel" style={{ animation: 'fade-in 0.4s ease-out' }}>
            <div className="preview-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={16} className="text-secondary" />
                <span style={{ fontSize: '13px', fontWeight: '600' }}>{selectedDoc?.name}</span>
              </div>
              <a href="#" className="logout-btn">
                <ExternalLink size={14} />
              </a>
            </div>

            <div className="preview-content">
              <div className="pdf-mock">
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '20px', fontWeight: '700', letterSpacing: '-0.5px', color: '#fff' }}>
                    {selectedDoc?.previewText.heading}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    {selectedDoc?.previewText.subheading}
                  </div>
                </div>

                <div className="pdf-line"></div>
                <div className="pdf-line medium"></div>
                
                {/* Dynamically render sections with citation highlights */}
                {selectedDoc?.previewText.sections.map((section, idx) => {
                  const isHighlighted = highlightedSection === section.title;
                  return (
                    <div 
                      key={idx} 
                      style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '8px', 
                        marginTop: '12px',
                        padding: isHighlighted ? '12px' : '4px',
                        borderRadius: '8px',
                        background: isHighlighted ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                        border: isHighlighted ? '1px solid rgba(255, 255, 255, 0.20)' : '1px solid transparent',
                        transition: 'var(--transition-bounce)'
                      }}
                    >
                      <div style={{ 
                        fontSize: '11px', 
                        fontWeight: '700', 
                        color: isHighlighted ? '#ffffff' : 'var(--text-muted)',
                        letterSpacing: '0.5px' 
                      }}>
                        {section.title}
                      </div>
                      <div style={{ 
                        fontSize: '12px', 
                        color: isHighlighted ? '#fff' : 'var(--text-secondary)', 
                        lineHeight: '1.5' 
                      }}>
                        {section.content}
                      </div>
                    </div>
                  );
                })}
                
                <div className="pdf-line short"></div>
                <div className="pdf-line"></div>
              </div>

              {highlightedText && (
                <div className="pdf-highlight" style={{ animation: 'fade-in 0.3s ease-out' }}>
                  <div style={{ fontWeight: '600', fontSize: '11px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Info size={12} /> CITED FRAGMENT:
                  </div>
                  "{highlightedText}"
                </div>
              )}
            </div>
          </aside>

        </div>
      )}
    </div>
  );
}
