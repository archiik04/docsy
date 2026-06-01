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
  LogOut
} from 'lucide-react';

import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useAuthStore } from '../../stores/authStore';
import { DocumentPreviewPanel } from '../../components/document/DocumentPreviewPanel';
import { AmbientBackground } from '../../components/ui/AmbientBackground';
import { Logo } from '../../components/ui/Logo';
import { API_BASE_URL } from '../../constants/api';

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
    highlightedCitation,
    showPreview,
    setChatInput,
    sendMessage,
    uploadDocuments,
    setHighlightedCitation,
    togglePreview,
    newConversation,
    selectConversation,
    deleteConversation,
    toggleDocumentSelection,
    resetStore,
    fetchDocuments
  } = useWorkspaceStore();

  const [mode, setMode] = useState('workspace'); // workspace, kb
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef(null);
  const textInputRef = useRef(null);
  const fileInputRef = useRef(null);

  // Fetch documents and set initial conversation on mount
  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

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

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!chatInput.trim()) return;

    // In Workspace mode, require at least one attached document context.
    if (mode === 'workspace' && selectedDocumentIds.length === 0) {
      alert('Please upload or attach at least one document context chip to analyze in Workspace mode.');
      return;
    }

    const previousSelectedIds = [...selectedDocumentIds];

    if (mode === 'kb') {
      const allDocIds = documents.map(d => d.id);
      if (allDocIds.length > 0) {
        useWorkspaceStore.setState({ selectedDocumentIds: allDocIds });
      }
    }

    await sendMessage(chatInput);

    if (mode === 'kb') {
      useWorkspaceStore.setState({ selectedDocumentIds: previousSelectedIds });
    }

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
      uploadDocuments(files);
    }
  };

  const handleSuggestedPrompt = (promptText) => {
    setChatInput(promptText);
    setTimeout(() => {
      handleSend();
    }, 50);
  };

  const filteredConvs = conversations.filter(conv => 
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
      <aside className="convo-sidebar-premium">
        
        {/* Header Logo + New Chat */}
        <div className="sidebar-header-row">
          <Logo onClick={() => navigate('/')} />
          <button 
            type="button" 
            className="sidebar-new-chat-btn" 
            onClick={() => newConversation()}
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
            onClick={() => setMode('workspace')}
            title="Workspace Mode (Attached Context)"
          >
            <Compass size={14} />
            <span>Workspace</span>
          </button>
          <button 
            type="button" 
            className={`mode-tab-btn ${mode === 'kb' ? 'active' : ''}`}
            onClick={() => setMode('kb')}
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
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="user-info" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <span className="user-name" style={{ fontSize: '12px', fontWeight: '600', color: '#0a101c', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.name || 'Researcher'}
              </span>
              <span className="user-email" style={{ fontSize: '9.5px', color: 'rgba(10, 16, 28, 0.55)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.email || 'researcher@docsy.ai'}
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

      {/* 2. MAIN CHAT AREA */}
      <main className="chat-main-area-premium">
        
        {/* Transparent Header */}
        <header className="workspace-header-premium" style={{ background: 'transparent', borderBottom: 'none' }}>
          <div>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#0a101c', display: 'block' }}>
              {mode === 'workspace' ? 'Workspace' : 'Knowledge Base'} <span className="title-serif" style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontWeight: 300 }}>Mode</span>
            </span>
            <span style={{ fontSize: '10px', color: 'rgba(10, 16, 28, 0.5)', fontWeight: 400 }}>
              {mode === 'workspace' 
                ? 'Grounded research on context papers' 
                : 'Searching shared index archive'}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className={`pill-button ${showPreview ? 'active' : ''}`}
              style={{ padding: '6px 14px', fontSize: '11px', height: '28px' }}
              onClick={togglePreview}
            >
              <FileText size={11} />
              <span>{showPreview ? 'Hide PDF' : 'Show PDF'}</span>
            </button>
          </div>
        </header>

        {/* Conversation Stream Scroll */}
        <div className="chat-main-area-scroll custom-scroll">
          <div className="chat-width-limiter">
            
            {messages.length > 0 ? (
              <div className="message-stream" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
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
                        background: 'rgba(10, 16, 28, 0.75)',
                        border: msg.sender === 'user' 
                          ? '1px solid rgba(100, 210, 225, 0.2)' 
                          : '1px solid rgba(255, 255, 255, 0.08)',
                        color: '#ffffff',
                        padding: msg.sender === 'user' ? '12px 18px' : '22px 26px',
                        borderRadius: '16px',
                        borderBottomRightRadius: msg.sender === 'user' ? '4px' : '16px',
                        borderBottomLeftRadius: msg.sender === 'assistant' ? '4px' : '16px',
                        maxWidth: msg.sender === 'user' ? '70%' : '100%',
                        width: msg.sender === 'assistant' ? '100%' : 'auto',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                        fontSize: '13.5px',
                        lineHeight: '1.7',
                        boxSizing: 'border-box'
                      }}
                    >
                      <div className="message-content">
                        {renderMessageContent(msg.text)}
                      </div>

                      {/* GROUNDED SOURCES CHIPS */}
                      {msg.citations && msg.citations.length > 0 && (
                        <div
                          className="citations-block-container"
                          style={{
                            marginTop: '16px',
                            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                            paddingTop: '12px'
                          }}
                        >
                          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontWeight: 650, display: 'block', marginBottom: '8px', letterSpacing: '0.04em' }}>
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
                                    padding: '8px 12px',
                                    background: isActive ? 'rgba(100, 210, 225, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                                    border: isActive ? '1px solid #64d2e1' : '1px solid rgba(255, 255, 255, 0.06)',
                                    borderRadius: '8px',
                                    fontSize: '11px',
                                    color: isActive ? '#64d2e1' : 'rgba(255,255,255,0.8)',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                    transition: 'all 0.2s ease'
                                  }}
                                  onClick={() =>
                                    setHighlightedCitation({
                                      ...cite,
                                      pdf_url: `${API_BASE_URL}/uploads/${cite.filename}`
                                    })
                                  }
                                >
                                  {cite.filename} • Page {cite.page_number}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
                
                {isTyping && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.4)', fontSize: '11px', paddingLeft: '8px' }}>
                    <Loader2 size={12} className="animate-spin text-cyan" />
                    <span>Docsy is analyzing context...</span>
                  </div>
                )}
              </div>
            ) : (
              /* EMPTY CHAT HERO WELCOME STATE */
              <div className="empty-chat-welcome-hd">
                <h1 className="empty-chat-title" style={{ fontFamily: 'var(--font-sans)', letterSpacing: '-1.5px', fontWeight: 400 }}>
                  What would you like to <span className="title-serif" style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontWeight: 300 }}>analyze</span>?
                </h1>
                <p className="empty-chat-subtitle">
                  Upload PDFs, scanned documents, images, or ask questions about your files.
                </p>

                <div className="empty-chat-pills-row">
                  <button 
                    type="button" 
                    className="empty-chat-pill"
                    onClick={() => handleSuggestedPrompt("Summarize the key experiments and findings in relativity.pdf")}
                  >
                    Summarize a PDF
                  </button>
                  <button 
                    type="button" 
                    className="empty-chat-pill"
                    onClick={() => handleSuggestedPrompt("Extract the core metrics and takeaways from this file")}
                  >
                    Extract key insights
                  </button>
                  <button 
                    type="button" 
                    className="empty-chat-pill"
                    onClick={() => handleSuggestedPrompt("Run OCR and explain the contents of this image")}
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
                    onClick={() => handleSuggestedPrompt("Synthesize the text and generate neat structured notes")}
                  >
                    Generate notes
                  </button>
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
            <div className="attached-files-row" style={{ pointerEvents: 'auto' }}>
              {attachedDocs.map((doc) => (
                <div key={doc.id} className="attached-file-chip">
                  <FileText size={11} style={{ color: '#64d2e1' }} />
                  <span className="chip-name" style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {doc.name}
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
          {isUploading && (
            <div 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                width: '100%',
                maxWidth: '760px',
                margin: '0 auto 8px auto',
                background: 'rgba(10, 16, 28, 0.85)',
                border: '1px solid rgba(100, 210, 225, 0.25)',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '11px',
                color: '#ffffff',
                pointerEvents: 'auto'
              }}
            >
              <Loader2 size={12} className="animate-spin" style={{ color: '#64d2e1' }} />
              <span>Uploading & indexing context: {uploadProgress}%</span>
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
            <form className="chat-input-container-premium" onSubmit={handleSend}>
              
              {/* Attachment Button */}
              <button
                type="button"
                className="input-attach-plus-btn"
                onClick={handleUploadClick}
                title="Attach PDF context"
              >
                <PlusCircle size={17} />
              </button>

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
                placeholder={mode === 'workspace' ? "Ask a question about your files..." : "Query shared knowledge archive..."}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
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

      </main>

      {/* 3. SLIDE-OVER PDF VIEW PANEL */}
      <AnimatePresence>
        {showPreview && (
          <DocumentPreviewPanel
            document={activeDoc || (highlightedCitation ? {
              name: highlightedCitation.filename,
              filename: highlightedCitation.filename,
              previewText: {
                heading: highlightedCitation.filename,
                subheading: "Interactive citation mirroring"
              }
            } : null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
