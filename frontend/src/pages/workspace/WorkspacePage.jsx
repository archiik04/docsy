import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Compass, 
  Database, 
  Search, 
  Plus, 
  Trash2, 
  Send, 
  PlusCircle, 
  X, 
  FileText, 
  Loader2, 
  LogOut,
  HelpCircle,
  Menu,
  Eye
} from 'lucide-react';

import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useAuthStore } from '../../stores/authStore';
import { AmbientBackground } from '../../components/ui/AmbientBackground';
import { Logo } from '../../components/ui/Logo';
import { API_BASE_URL } from '../../constants/api';
import MindMap from './MindMap';
import Whiteboard from './Whiteboard';


export function WorkspacePage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const {
    documents,
    selectedDocumentIds,
    activeDocumentId,
    conversations,
    activeConversationId,
    chatInput,
    isTyping,
    isUploading,
    uploadProgress,
    uploadStatus,
    uploadScope,
    highlightedCitation,
    showPreview,
    error,
    setChatInput,
    sendMessage,
    uploadDocuments,
    setHighlightedCitation,
    newConversation,
    selectConversation,
    deleteConversation,
    toggleDocumentSelection,
    deleteDocument,
    switchMode,
    resetStore,
    fetchDocuments,
    selectDocument
  } = useWorkspaceStore();

  const [mode, setMode] = useState('workspace'); // workspace, knowledge_base
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('docsy-sidebar-collapsed');
    return saved !== null ? JSON.parse(saved) : false;
  });
  const [previewTab, setPreviewTab] = useState('view'); // view, ocr
  const [view, setView] = useState('chat'); // chat, document, mindmap, whiteboard

  const messagesEndRef = useRef(null);
  const textInputRef = useRef(null);
  const fileInputRef = useRef(null);

  // Reset view back to chat when active document changes
  useEffect(() => {
    setView('chat');
  }, [activeDocumentId]);

  // Fetch documents and set initial conversation on mount
  useEffect(() => {
    const scope = mode === 'knowledge_base' ? 'KNOWLEDGE_BASE' : 'PERSONAL';
    fetchDocuments(scope);
  }, [fetchDocuments, mode]);

  // Scroll to bottom on new messages
  const currentConv = conversations.find(c => c.id === activeConversationId);
  const messages = currentConv ? currentConv.messages : [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleLogout = () => {
    logout();
    resetStore();
    navigate('/');
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('docsy-sidebar-collapsed', JSON.stringify(next));
      return next;
    });
  };

  const handleModeChange = (newMode) => {
    setMode(newMode);
    switchMode(newMode);

    if (textInputRef.current) {
      textInputRef.current.style.height = 'auto';
    }
  };

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!chatInput.trim()) return;

    await sendMessage(chatInput, mode);

    if (textInputRef.current) {
      textInputRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const scope = mode === 'knowledge_base' ? 'KNOWLEDGE_BASE' : 'PERSONAL';
      uploadDocuments(files, scope);
    }
    e.target.value = '';
  };

  const handleSuggestedPrompt = (promptText) => {
    setChatInput(promptText);
    setTimeout(() => {
      handleSend();
    }, 50);
  };

  const cleanFilename = (filename) => {
    if (!filename) return '';
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[-_]?/i;
    return filename.replace(uuidRegex, '');
  };

  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      if (mode === 'knowledge_base' && user?.role !== 'admin') return;
      const scope = mode === 'knowledge_base' ? 'KNOWLEDGE_BASE' : 'PERSONAL';
      uploadDocuments(files, scope);
    }
  };

  const handleTextareaChange = (e) => {
    setChatInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 180)}px`;
  };

  const filteredConvs = conversations.filter(conv => 
    (conv.mode === mode || (!conv.mode && mode === 'workspace')) &&
    conv.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const attachedDocs = documents.filter(d => selectedDocumentIds.includes(d.id));
  const activeDoc = documents.find((doc) => doc.id === activeDocumentId) || null;

  // Basic custom markdown renderer to format text, code blocks, lists, and headers
  const renderMessageContent = (text) => {
    if (!text) return null;
    const parts = text.split(/(```[\s\S]*?```)/g);

    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const codeLines = part.slice(3, -3).trim().split('\n');
        let language = 'code';
        let code = part.slice(3, -3).trim();

        if (codeLines[0] && codeLines[0].length < 15 && !codeLines[0].includes(' ') && !codeLines[0].includes('\n')) {
          language = codeLines[0];
          code = codeLines.slice(1).join('\n');
        }

        return (
          <div key={index} className="markdown-code-block">
            <div className="code-block-header">{language.toUpperCase()}</div>
            <pre className="code-block-pre">
              <code>{code}</code>
            </pre>
          </div>
        );
      }

      return (
        <div key={index} className="markdown-text-block">
          {part.split('\n').map((line, lineIdx) => {
            if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
              return (
                <ul key={lineIdx} className="markdown-list">
                  <li>{formatInlineStyles(line.trim().slice(2))}</li>
                </ul>
              );
            }
            if (line.trim().startsWith('### ')) {
              return <h3 key={lineIdx} className="markdown-h3">{formatInlineStyles(line.trim().slice(4))}</h3>;
            }
            if (line.trim().startsWith('## ')) {
              return <h2 key={lineIdx} className="markdown-h2">{formatInlineStyles(line.trim().slice(3))}</h2>;
            }
            return line.trim() ? (
              <p key={lineIdx} className="markdown-p">
                {formatInlineStyles(line)}
              </p>
            ) : <div key={lineIdx} className="markdown-spacing" />;
          })}
        </div>
      );
    });
  };

  const formatInlineStyles = (line) => {
    let parts = [{ text: line, isStyled: false }];
    let newParts = [];

    // Bold parsing
    for (const part of parts) {
      if (part.isStyled) {
        newParts.push(part);
        continue;
      }

      let lastIndex = 0;
      let matchFound = false;
      const regex = /\*\*(.*?)\*\*/g;
      let match;
      while ((match = regex.exec(part.text)) !== null) {
        matchFound = true;
        if (match.index > lastIndex) {
          newParts.push({ text: part.text.substring(lastIndex, match.index), isStyled: false });
        }
        newParts.push({ text: match[1], isStyled: true, style: 'bold' });
        lastIndex = regex.lastIndex;
      }

      if (matchFound) {
        if (lastIndex < part.text.length) {
          newParts.push({ text: part.text.substring(lastIndex), isStyled: false });
        }
      } else {
        newParts.push(part);
      }
    }
    parts = newParts;

    // Inline code parsing
    newParts = [];
    for (const part of parts) {
      if (part.isStyled) {
        newParts.push(part);
        continue;
      }

      let lastIndex = 0;
      let matchFound = false;
      const regex = /`(.*?)`/g;
      let match;
      while ((match = regex.exec(part.text)) !== null) {
        matchFound = true;
        if (match.index > lastIndex) {
          newParts.push({ text: part.text.substring(lastIndex, match.index), isStyled: false });
        }
        newParts.push({ text: match[1], isStyled: true, style: 'code' });
        lastIndex = regex.lastIndex;
      }

      if (matchFound) {
        if (lastIndex < part.text.length) {
          newParts.push({ text: part.text.substring(lastIndex), isStyled: false });
        }
      } else {
        newParts.push(part);
      }
    }

    return newParts.map((part, idx) => {
      if (part.isStyled) {
        if (part.style === 'bold') return <strong key={idx} className="bold-text">{part.text}</strong>;
        if (part.style === 'code') return <code key={idx} className="inline-code-text">{part.text}</code>;
      }
      return part.text;
    });
  };

  return (
    <div className="dashboard-container-premium">
      <AmbientBackground />

      {/* 1. COMBINED SIDEBAR (280px) */}
      {!sidebarCollapsed && (
        <aside className="convo-sidebar-premium">
          
          {/* Header Logo + New Chat */}
          <div className="sidebar-header-row">
            <Logo onClick={() => navigate('/')} />
            <button 
              type="button" 
              className="sidebar-new-chat-btn" 
              onClick={() => newConversation(mode)}
              title="Start new thread"
            >
              <Plus size={14} />
            </button>
          </div>

          {/* Mode Selector (Workspace vs KB) inside sidebar */}
          <div className="sidebar-mode-selector">
            <button 
              type="button" 
              className={`mode-tab-btn ${mode === 'workspace' ? 'active' : ''}`}
              onClick={() => handleModeChange('workspace')}
              title="Workspace Mode (Attached Context)"
            >
              <Compass size={14} />
              <span>Workspace</span>
            </button>
            <button 
              type="button" 
              className={`mode-tab-btn ${mode === 'knowledge_base' ? 'active' : ''}`}
              onClick={() => handleModeChange('knowledge_base')}
              title="Knowledge Base Mode (Shared Archive)"
            >
              <Database size={14} />
              <span>Knowledge Base</span>
            </button>
          </div>

          {/* Search threads */}
          <div className="sidebar-search-container">
            <Search size={14} className="sidebar-search-icon" />
            <input 
              type="text" 
              placeholder="Search threads..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="sidebar-search-input"
            />
          </div>

          {/* Threads list */}
          <div className="sidebar-heading-text" style={{ fontSize: '11px', fontWeight: 650, color: 'rgba(10, 16, 28, 0.45)', textTransform: 'uppercase', letterSpacing: '0.05em', paddingLeft: '8px', marginTop: '8px', marginBottom: '-8px' }}>
            Recent Chats
          </div>
          <div className="sidebar-threads-scroll custom-scroll">
            {filteredConvs.map((conv) => (
              <div
                key={conv.id}
                className={`convo-thread-item ${activeConversationId === conv.id ? 'active' : ''}`}
                onClick={() => selectConversation(conv.id)}
              >
                <span className="thread-title-text" title={conv.title}>
                  {conv.title}
                </span>
                <button
                  type="button"
                  className="thread-delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete thread "${conv.title}"?`)) {
                      deleteConversation(conv.id);
                    }
                  }}
                  title="Delete thread"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            {filteredConvs.length === 0 && (
              <span style={{ fontSize: '11px', color: 'rgba(10, 16, 28, 0.45)', textAlign: 'center', marginTop: '12px' }}>
                No discussions found
              </span>
            )}
          </div>


          {/* Profile and Logout Footer inside sidebar */}
          <div 
            className="sidebar-footer-premium" 
            style={{ 
              marginTop: 'auto', 
              borderTop: '1px solid rgba(10, 16, 28, 0.08)', 
              paddingTop: '12px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              width: '100%',
              boxSizing: 'border-box'
            }}
          >
            <div className="user-profile" style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
              <div className="rail-avatar-glow" style={{ width: '28px', height: '28px', fontSize: '11px', flexShrink: 0 }}>
                {user?.name ? user.name.charAt(0).toUpperCase() : ''}
              </div>
              <div className="user-info" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <span className="user-name" style={{ fontSize: '12px', fontWeight: '600', color: '#0a101c', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user?.name || ''}
                </span>
                <span className="user-email" style={{ fontSize: '9.5px', color: 'rgba(10, 16, 28, 0.55)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user?.email || ''}
                </span>
              </div>
            </div>
          <button 
            type="button"
            className="logout-btn-premium" 
            onClick={handleLogout} 
            title="Sign Out"
            style={{ 
              padding: '6px', 
              borderRadius: '6px', 
              background: 'transparent', 
              border: 'none', 
              color: 'rgba(10, 16, 28, 0.5)', 
              cursor: 'pointer', 
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#ff6b6b'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(10, 16, 28, 0.5)'}
          >
            <LogOut size={13} />
          </button>
        </div>
      </aside>
      )}

      {/* 2. MAIN CHAT AREA */}
      <main className="chat-main-area-premium">
        
        {/* Transparent Header */}
        <header className="workspace-header-premium" style={{ background: 'transparent', borderBottom: 'none', display: 'flex', alignItems: 'center', padding: '0 20px', height: '64px' }}>
          <div className="header-left" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              className="sidebar-toggle-btn-premium"
              onClick={toggleSidebar}
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              style={{
                background: 'transparent',
                border: 'none',
                borderRadius: '8px',
                color: '#0a101c',
                padding: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
                boxShadow: 'none',
                flexShrink: 0
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                e.currentTarget.style.color = '#2d8fa0';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#0a101c';
              }}
            >
              <Menu size={16} />
            </button>
            <div>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#0a101c', display: 'block' }}>
                {activeDoc ? `${cleanFilename(activeDoc.name)} — ${view === 'chat' ? 'Chat' : (view === 'document' ? 'Document' : (view === 'mindmap' ? 'Mind map' : 'Whiteboard'))}` : (mode === 'workspace' ? 'Workspace Mode' : 'Knowledge Base Mode')}
              </span>
              <span style={{ fontSize: '10px', color: 'rgba(10, 16, 28, 0.5)', fontWeight: 400 }}>
                {activeDoc ? 'Attached context file' : (mode === 'workspace' ? 'Searching personal documents' : 'Searching shared organizational knowledge')}
              </span>
            </div>
          </div>

          {/* View switcher tabs */}
          {activeDoc && (
            <div style={{ display: 'flex', gap: '8px', background: 'rgba(10, 16, 28, 0.04)', padding: '3px', borderRadius: '8px', marginRight: '16px' }}>
              <button
                type="button"
                onClick={() => {
                  setView('chat');
                  useWorkspaceStore.setState({ showPreview: false });
                }}
                style={{
                  background: view === 'chat' ? '#ffffff' : 'transparent',
                  border: 'none',
                  color: '#0a101c',
                  fontSize: '11px',
                  fontWeight: 650,
                  padding: '4px 10px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  boxShadow: view === 'chat' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.2s',
                  outline: 'none'
                }}
              >
                Chat
              </button>
              <button
                type="button"
                onClick={() => {
                  setView('document');
                  useWorkspaceStore.setState({ showPreview: true });
                }}
                style={{
                  background: view === 'document' ? '#ffffff' : 'transparent',
                  border: 'none',
                  color: '#0a101c',
                  fontSize: '11px',
                  fontWeight: 650,
                  padding: '4px 10px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  boxShadow: view === 'document' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.2s',
                  outline: 'none'
                }}
              >
                Document
              </button>
              {activeDoc.processing_status === 'completed' && (
                <button
                  type="button"
                  onClick={() => {
                    setView('mindmap');
                    useWorkspaceStore.setState({ showPreview: false });
                  }}
                  style={{
                    background: view === 'mindmap' ? '#ffffff' : 'transparent',
                    border: 'none',
                    color: '#0a101c',
                    fontSize: '11px',
                    fontWeight: 650,
                    padding: '4px 10px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    boxShadow: view === 'mindmap' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                    transition: 'all 0.2s',
                    outline: 'none'
                  }}
                >
                  Mind map
                </button>
              )}
              {activeDoc.processing_status === 'completed' && (
                <button
                  type="button"
                  onClick={() => {
                    setView('whiteboard');
                    useWorkspaceStore.setState({ showPreview: false });
                  }}
                  style={{
                    background: view === 'whiteboard' ? '#ffffff' : 'transparent',
                    border: 'none',
                    color: '#0a101c',
                    fontSize: '11px',
                    fontWeight: 650,
                    padding: '4px 10px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    boxShadow: view === 'whiteboard' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                    transition: 'all 0.2s',
                    outline: 'none'
                  }}
                >
                  Whiteboard
                </button>
              )}

            </div>
          )}
        </header>

        {view === 'chat' && (
          <>
            <div className="chat-main-area-scroll custom-scroll">
          <div className="chat-width-limiter" style={{ maxWidth: '900px', margin: '0 auto' }}>
            
            {messages.length > 0 ? (
              <div className="message-stream" style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
                {messages.map((msg, index) => (
                  <motion.div
                    key={msg.id || index}
                    className={`message-wrapper-premium ${msg.sender}`}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                      width: '100%'
                    }}
                  >
                    {/* Sender name above bubble */}
                    <div 
                      className={`message-sender-tag ${msg.sender}`}
                      style={{
                        fontSize: '9.5px',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        color: msg.sender === 'user' ? 'rgba(10, 16, 28, 0.5)' : '#2d8fa0',
                        marginBottom: '6px',
                        textAlign: msg.sender === 'user' ? 'right' : 'left',
                        width: '100%',
                        paddingRight: msg.sender === 'user' ? '8px' : '0',
                        paddingLeft: msg.sender === 'assistant' ? '8px' : '0',
                      }}
                    >
                      {msg.sender === 'user' 
                        ? (user?.name || user?.full_name || 'User') 
                        : 'Docsy'}
                    </div>

                    {/* Chat Bubble Glass Card */}
                    <div 
                      className="message-bubble-glass"
                      style={{
                        background: msg.sender === 'user' ? 'rgba(255, 255, 255, 0.18)' : 'rgba(255, 255, 255, 0.12)',
                        border: msg.sender === 'user' 
                          ? '1px solid rgba(255, 255, 255, 0.35)' 
                          : '1px solid rgba(255, 255, 255, 0.25)',
                        color: '#0a101c',
                        padding: '16px 20px',
                        borderRadius: '20px',
                        borderBottomRightRadius: msg.sender === 'user' ? '4px' : '20px',
                        borderBottomLeftRadius: msg.sender === 'assistant' ? '4px' : '20px',
                        maxWidth: '720px',
                        width: 'auto',
                        boxShadow: '0 8px 32px rgba(10, 16, 28, 0.03)',
                        fontSize: '13.5px',
                        lineHeight: '1.7',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                        boxSizing: 'border-box'
                      }}
                    >
                      <div className="message-content">
                        {renderMessageContent(msg.text)}
                      </div>
                    </div>

                    {/* GROUNDED SOURCES CHIPS (Positioned below the bubble) */}
                    {msg.citations && msg.citations.length > 0 && (
                      <div
                        className="citations-block-container"
                        style={{
                          marginTop: '8px',
                          width: '100%',
                          maxWidth: '720px',
                          boxSizing: 'border-box',
                          padding: '0 4px'
                        }}
                      >
                        <span style={{ fontSize: '10px', color: 'rgba(10, 16, 28, 0.45)', fontWeight: 650, display: 'block', marginBottom: '6px', letterSpacing: '0.04em' }}>
                          SOURCES
                        </span>
                        
                        <div
                          className="citations-scroll-row custom-scroll"
                          style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}
                        >
                          {msg.citations.map((cite, citeIdx) => {
                            const isActive = highlightedCitation &&
                              highlightedCitation.filename === cite.filename &&
                              highlightedCitation.page_number === cite.page_number &&
                              highlightedCitation.chunk_text === cite.chunk_text;

                            return (
                              <div
                                key={citeIdx}
                                className={`citation-preview-card ${isActive ? 'active' : ''}`}
                                style={{
                                  padding: '10px 14px',
                                  background: isActive ? 'rgba(100, 210, 225, 0.18)' : 'rgba(255, 255, 255, 0.45)',
                                  border: isActive ? '1px solid #2d8fa0' : '1px solid rgba(10, 16, 28, 0.08)',
                                  borderRadius: '12px',
                                  fontSize: '11px',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease',
                                  width: '200px',
                                  minWidth: '200px',
                                  maxWidth: '220px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '3px',
                                  boxSizing: 'border-box'
                                }}
                                onClick={() => {
                                  setHighlightedCitation({
                                    ...cite,
                                    pdf_url: `${API_BASE_URL}/uploads/${cite.filename}`
                                  });
                                  useWorkspaceStore.setState({ showPreview: true });
                                }}
                              >
                                <span 
                                  style={{ 
                                    fontWeight: 650, 
                                    color: isActive ? '#2d8fa0' : '#0a101c',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    display: 'block'
                                  }}
                                  title={cite.original_filename || cleanFilename(cite.filename)}
                                >
                                  📄 {cite.original_filename || cleanFilename(cite.filename)}
                                </span>
                                <span style={{ color: isActive ? 'rgba(45, 143, 160, 0.8)' : 'rgba(10, 16, 28, 0.55)', fontSize: '10px', fontWeight: 500 }}>
                                  Page {cite.page_number}
                                </span>
                                {cite.chunk_text && (
                                  <span 
                                    style={{ 
                                      color: 'rgba(10, 16, 28, 0.6)', 
                                      fontSize: '9.5px', 
                                      lineHeight: '1.3',
                                      marginTop: '4px',
                                      fontStyle: 'italic',
                                      display: '-webkit-box',
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: 'vertical',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis'
                                    }}
                                    title={cite.chunk_text}
                                  >
                                    "{cite.chunk_text}"
                                  </span>
                                )}
                                {cite.rerank_score !== undefined && cite.rerank_score !== null && (
                                  <span style={{ fontSize: '9px', color: '#2d8fa0', background: 'rgba(100, 210, 225, 0.15)', padding: '2px 4px', borderRadius: '4px', alignSelf: 'flex-start', marginTop: '2px', fontWeight: 600 }}>
                                    {(() => {
                                      const clamped = Math.max(-10, Math.min(10, cite.rerank_score));
                                      const score = Math.round(((clamped + 10) / 20) * 100);
                                      return `Match: ${score}%`;
                                    })()}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
                
                {isTyping && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(10,16,28,0.5)', fontSize: '11px', paddingLeft: '8px' }}>
                    <Loader2 size={12} className="animate-spin text-cyan" style={{ color: '#2d8fa0' }} />
                    <span>Docsy is analyzing context...</span>
                  </div>
                )}
              </div>
            ) : (
              /* EMPTY CHAT HERO WELCOME STATE */
              <div className="empty-chat-welcome-hd" style={{ marginTop: '12vh' }}>
                <h1 className="empty-chat-title" style={{ fontFamily: 'var(--font-sans)', letterSpacing: '-1.5px', fontWeight: 400, fontSize: '32px' }}>
                  {mode === 'workspace' ? 'Workspace' : 'Knowledge Base'}
                </h1>
                <p className="empty-chat-subtitle" style={{ fontSize: '15px', color: 'rgba(10, 16, 28, 0.65)', maxWidth: '540px', lineHeight: '1.6', marginBottom: '32px' }}>
                  {mode === 'workspace' 
                    ? 'Upload private files, scanned PDFs, handwritten notes, and images for contextual analysis.'
                    : 'Search across company policies, handbooks, reports, research papers, and shared documents.'}
                </p>

                <div className="empty-chat-pills-row">
                  {mode === 'workspace' ? (
                    <>
                      <button 
                        type="button" 
                        className="empty-chat-pill"
                        onClick={() => handleSuggestedPrompt("Summarize the key experiments and findings in my uploaded PDF")}
                      >
                        Summarize a PDF
                      </button>
                      <button 
                        type="button" 
                        className="empty-chat-pill"
                        onClick={() => handleSuggestedPrompt("Extract the core metrics and takeaways from my files")}
                      >
                        Extract key insights
                      </button>
                      <button 
                        type="button" 
                        className="empty-chat-pill"
                        onClick={() => handleSuggestedPrompt("Run OCR and explain the contents of my scanned image")}
                      >
                        Analyze an image
                      </button>
                      <button 
                        type="button" 
                        className="empty-chat-pill"
                        onClick={() => handleSuggestedPrompt("Compare the methodologies across my uploaded context files")}
                      >
                        Compare documents
                      </button>
                      <button 
                        type="button" 
                        className="empty-chat-pill"
                        onClick={() => handleSuggestedPrompt("Synthesize the text from my files and generate structured notes")}
                      >
                        Generate notes
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        type="button" 
                        className="empty-chat-pill"
                        onClick={() => handleSuggestedPrompt("What is the company policy on remote work and flexible hours?")}
                      >
                        Company Policies
                      </button>
                      <button 
                        type="button" 
                        className="empty-chat-pill"
                        onClick={() => handleSuggestedPrompt("Show me the onboarding checklist for new engineers")}
                      >
                        Onboarding Guide
                      </button>
                      <button 
                        type="button" 
                        className="empty-chat-pill"
                        onClick={() => handleSuggestedPrompt("How do I submit an expense report for travel reimbursement?")}
                      >
                        Expense Reporting
                      </button>
                      <button 
                        type="button" 
                        className="empty-chat-pill"
                        onClick={() => handleSuggestedPrompt("Summarize the health insurance benefits and dental coverage")}
                      >
                        HR Benefits
                      </button>
                      <button 
                        type="button" 
                        className="empty-chat-pill"
                        onClick={() => handleSuggestedPrompt("What are the password security and data protection guidelines?")}
                      >
                        Security Guidelines
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* FLOATING COMPOSER BASE */}
        <div 
          style={{
            position: 'absolute',
            bottom: '24px',
            left: 0,
            right: 0,
            zIndex: 20,
            pointerEvents: 'none'
          }}
        >
          {/* List attached file chips directly above composer */}
          {mode === 'workspace' && attachedDocs.length > 0 && (
            <div className="attached-files-row" style={{ pointerEvents: 'auto', padding: '0 16px' }}>
              {attachedDocs.map((doc) => (
                <div key={doc.id} className="attached-file-chip">
                  <FileText size={11} style={{ color: '#2d8fa0' }} />
                  <span className="chip-name" style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {cleanFilename(doc.name)}
                  </span>
                  <button 
                    type="button" 
                    className="chip-remove-btn"
                    onClick={() => toggleDocumentSelection(doc.id)}
                    title="Remove from thread context"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upload Progress Loader */}
          {error && (
            <div
              style={{
                width: '100%',
                maxWidth: '760px',
                margin: '0 auto 8px auto',
                background: 'rgba(255, 245, 245, 0.85)',
                border: '1px solid rgba(220, 38, 38, 0.22)',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '11.5px',
                color: '#991b1b',
                pointerEvents: 'auto',
                boxSizing: 'border-box'
              }}
            >
              {error}
            </div>
          )}

          {/* Upload Progress Loader */}
          {isUploading && (
            (mode === 'workspace' && uploadScope === 'PERSONAL') ||
            (mode === 'knowledge_base' && uploadScope === 'KNOWLEDGE_BASE')
          ) && (
            <div 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                width: '100%',
                maxWidth: '760px',
                margin: '0 auto 8px auto',
                background: 'rgba(255, 255, 255, 0.6)',
                border: '1px solid rgba(10, 16, 28, 0.08)',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '11.5px',
                color: '#0a101c',
                pointerEvents: 'auto',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.04)'
              }}
            >
              <Loader2 size={12} className="animate-spin" style={{ color: '#2d8fa0' }} />
              <span style={{ fontWeight: 550 }}>{uploadStatus || `Uploading & indexing context: ${uploadProgress}%`}</span>
            </div>
          )}

          {/* Form Composer */}
          <div 
            style={{ 
              width: '100%', 
              maxWidth: '760px', 
              margin: '0 auto', 
              padding: '0 16px', 
              boxSizing: 'border-box',
              pointerEvents: 'auto'
            }}
          >

            <form 
              className={`chat-input-container-premium ${isDragging ? 'dragging' : ''}`} 
              onSubmit={handleSend}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              style={{
                border: isDragging ? '1px solid #2d8fa0' : '1px solid rgba(255, 255, 255, 0.4)',
                boxShadow: isDragging ? '0 16px 48px rgba(10, 16, 28, 0.08), 0 0 15px rgba(100, 210, 225, 0.25)' : '0 16px 48px rgba(10, 16, 28, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.5)'
              }}
            >
              
              {/* Attachment Button */}
              {((mode === 'workspace') || (mode === 'knowledge_base' && user?.role === 'admin')) && (
                <button
                  type="button"
                  className="input-attach-plus-btn"
                  onClick={handleUploadClick}
                  title="Attach PDF context"
                >
                  <PlusCircle size={17} />
                </button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.txt,.docx,.png,.jpg,.jpeg"
                style={{ display: 'none' }}
                onChange={handleFileInputChange}
              />

              {/* Multiline textarea composer */}
              <textarea
                ref={textInputRef}
                rows={1}
                className="chat-textarea-premium custom-scroll"
                placeholder={mode === 'workspace' ? "Ask a question about your files..." : "Search the shared knowledge base..."}
                value={chatInput}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
              />

              {/* Send Button */}
              <button
                type="submit"
                className="chat-send-btn-circle-premium"
                disabled={!chatInput.trim()}
              >
                <Send size={14} />
              </button>
            </form>
          </div>
        </div>
      </>
    )}

        {view === 'mindmap' && activeDoc && (
          <div style={{ flex: 1, width: '100%', height: 'calc(100% - 64px)', position: 'relative' }}>
            <MindMap documentId={activeDoc.id} />
          </div>
        )}

        {view === 'whiteboard' && activeDoc && (
          <div style={{ flex: 1, width: '100%', height: 'calc(100% - 64px)', position: 'relative' }}>
            <Whiteboard key={activeDoc.id} documentId={activeDoc.id} />
          </div>
        )}

      </main>

      {/* 3. FULL PAGE GLASS PREVIEW MODAL */}
      <AnimatePresence>
        {showPreview && (
          <div 
            className="pdf-modal-overlay" 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              zIndex: 1000,
              background: 'rgba(10, 16, 28, 0.45)',
              backdropFilter: 'blur(12px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxSizing: 'border-box',
              padding: '24px',
              pointerEvents: 'auto'
            }}
            onClick={() => { useWorkspaceStore.setState({ showPreview: false, highlightedCitation: null }); setView('chat'); }}
          >
            <motion.div 
              className="pdf-modal-card-premium"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              style={{
                width: '100%',
                maxWidth: '1000px',
                height: '85vh',
                background: 'rgba(255, 255, 255, 0.75)',
                backdropFilter: 'blur(24px)',
                border: '1px solid rgba(255, 255, 255, 0.45)',
                borderRadius: '24px',
                boxShadow: '0 20px 60px rgba(10, 16, 28, 0.15)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                position: 'relative'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 24px',
                  borderBottom: '1px solid rgba(10, 16, 28, 0.08)',
                  background: 'rgba(255, 255, 255, 0.3)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FileText size={16} style={{ color: '#2d8fa0' }} />
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#0a101c' }}>
                    {highlightedCitation?.original_filename || (highlightedCitation?.filename ? cleanFilename(highlightedCitation.filename) : (activeDoc?.name || 'Document Viewer'))}
                  </span>
                </div>
                
                {/* Modal View Tabs */}
                <div style={{ display: 'flex', gap: '8px', background: 'rgba(10, 16, 28, 0.04)', padding: '3px', borderRadius: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setPreviewTab('view')}
                    style={{
                      background: previewTab === 'view' ? '#ffffff' : 'transparent',
                      border: 'none',
                      color: '#0a101c',
                      fontSize: '11px',
                      fontWeight: 650,
                      padding: '4px 10px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      boxShadow: previewTab === 'view' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                      transition: 'all 0.2s',
                      outline: 'none'
                    }}
                  >
                    Document File
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewTab('ocr')}
                    style={{
                      background: previewTab === 'ocr' ? '#ffffff' : 'transparent',
                      border: 'none',
                      color: '#0a101c',
                      fontSize: '11px',
                      fontWeight: 650,
                      padding: '4px 10px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      boxShadow: previewTab === 'ocr' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                      transition: 'all 0.2s',
                      outline: 'none'
                    }}
                  >
                    OCR / Extracted Text
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {highlightedCitation && (
                    <span style={{ fontSize: '12px', background: 'rgba(100, 210, 225, 0.15)', color: '#2d8fa0', padding: '4px 10px', borderRadius: '6px', fontWeight: 600 }}>
                      Page {highlightedCitation.page_number}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => { useWorkspaceStore.setState({ showPreview: false, highlightedCitation: null }); setView('chat'); }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'rgba(10, 16, 28, 0.5)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '4px',
                      borderRadius: '50%',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#ff6b6b'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(10, 16, 28, 0.5)'}
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
 
              {/* PDF Content Area */}
              <div style={{ flex: 1, padding: '20px', background: 'rgba(255, 255, 255, 0.15)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {previewTab === 'ocr' ? (
                  <div style={{
                    flex: 1,
                    background: 'rgba(255, 255, 255, 0.8)',
                    borderRadius: '14px',
                    padding: '24px',
                    overflowY: 'auto',
                    border: '1px solid rgba(10,16,28,0.08)',
                    fontSize: '13px',
                    lineHeight: '1.6',
                    fontFamily: 'Inter, monospace',
                    color: '#0a101c',
                    whiteSpace: 'pre-wrap',
                    textAlign: 'left'
                  }}>
                    {highlightedCitation?.chunk_text ? (
                      <div>
                        <div style={{ fontWeight: 600, color: '#2d8fa0', marginBottom: '8px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Matched Citation Text Segment:
                        </div>
                        <div style={{ borderLeft: '3px solid #2d8fa0', paddingLeft: '12px', fontStyle: 'italic', marginBottom: '20px', color: '#1e293b' }}>
                          "{highlightedCitation.chunk_text}"
                        </div>
                      </div>
                    ) : null}
                    
                    <div style={{ fontWeight: 600, color: '#0a101c', marginBottom: '8px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Full Extracted Document Text:
                    </div>
                    {activeDoc?.extracted_text || highlightedCitation?.extracted_text || (activeDoc?.processing_status === 'processing' ? "Document is currently being processed by Tesseract OCR and indexed. Please wait..." : "No text extracted from this document or it is currently being processed.")}
                  </div>
                ) : (
                  (highlightedCitation?.pdf_url || activeDoc?.filename) ? (
                    (() => {
                      const fileUrl = highlightedCitation?.pdf_url || (activeDoc?.filename ? `${API_BASE_URL}/uploads/${activeDoc.filename}` : '');
                      const isImage = fileUrl.match(/\.(png|jpg|jpeg|gif|webp)$/i);
                      const isDocx = fileUrl.match(/\.docx$/i);
                      
                      if (isImage) {
                        return (
                          <div style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '14px',
                            background: '#0a0f1d',
                            overflow: 'auto',
                            padding: '16px'
                          }}>
                            <img
                              src={fileUrl}
                              alt="Document Preview"
                              style={{
                                maxWidth: '100%',
                                maxHeight: '100%',
                                objectFit: 'contain',
                                borderRadius: '8px',
                                boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
                              }}
                            />
                          </div>
                        );
                      }
                      
                      if (isDocx) {
                        return (
                          <div style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '14px',
                            background: 'rgba(255, 255, 255, 0.4)',
                            border: '1px solid rgba(10, 16, 28, 0.08)',
                            padding: '32px',
                            textAlign: 'center',
                            boxSizing: 'border-box'
                          }}>
                            <FileText size={48} style={{ color: '#2d8fa0', marginBottom: '16px' }} />
                            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0a101c', marginBottom: '8px' }}>
                              Word Document (.docx)
                            </h3>
                            <p style={{ fontSize: '13px', color: 'rgba(10, 16, 28, 0.65)', maxWidth: '360px', lineHeight: '1.5', marginBottom: '24px' }}>
                              Word documents cannot be previewed directly in the browser panel. You can read the extracted text in the <strong>OCR / Extracted Text</strong> tab above, or click below to download the original file.
                            </p>
                            <a
                              href={fileUrl}
                              download
                              style={{
                                background: '#2d8fa0',
                                color: '#ffffff',
                                padding: '10px 24px',
                                borderRadius: '10px',
                                fontSize: '13px',
                                fontWeight: 600,
                                textDecoration: 'none',
                                transition: 'all 0.2s',
                                boxShadow: '0 4px 12px rgba(45, 143, 160, 0.25)'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = '#237380'}
                              onMouseLeave={(e) => e.currentTarget.style.background = '#2d8fa0'}
                            >
                              Download File
                            </a>
                          </div>
                        );
                      }
                      
                      return (
                        <iframe
                          key={fileUrl}
                          src={highlightedCitation?.pdf_url ? fileUrl : `${fileUrl}#page=1`}
                          title="PDF Viewer"
                          width="100%"
                          height="100%"
                          style={{
                            border: 'none',
                            borderRadius: '14px',
                            background: '#ffffff',
                            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)'
                          }}
                        />
                      );
                    })()
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(10, 16, 28, 0.5)' }}>
                      <HelpCircle size={32} style={{ marginBottom: '12px', color: 'rgba(10, 16, 28, 0.3)' }} />
                      <span>No document file loaded.</span>
                    </div>
                  )
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
