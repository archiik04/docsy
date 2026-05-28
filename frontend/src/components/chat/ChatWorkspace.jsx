import { useEffect, useRef, useState } from 'react';
import { Send, Upload, Loader2, Plus, FileText, PlusCircle, Mic, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useAuthStore } from '../../stores/authStore';

function MessageContentStream({ text, renderMessageContent }) {
  const [displayedText, setDisplayedText] = useState('');
  
  useEffect(() => {
    const words = text.split(' ');
    let currentText = '';
    let i = 0;
    
    const interval = setInterval(() => {
      if (i < words.length) {
        currentText += (i > 0 ? ' ' : '') + words[i];
        setDisplayedText(currentText);
        i++;
      } else {
        clearInterval(interval);
      }
    }, 15); // Fast, premium word-by-word streaming
    
    return () => clearInterval(interval);
  }, [text]);
  
  return <>{renderMessageContent(displayedText)}</>;
}

export function ChatWorkspace() {
  const { user } = useAuthStore();
  const {
    documents,
    selectedDocumentIds,
    activeDocumentId,
    conversations,
    activeConversationId,
    chatInput,
    isTyping,
    isUploading,
    showPreview,
    setChatInput,
    sendMessage,
    uploadDocuments,
    setHighlightedCitation,
    togglePreview,
    newConversation
  } = useWorkspaceStore();

  const messagesEndRef = useRef(null);
  const textInputRef = useRef(null);
  const fileInputRef = useRef(null);

  const [isDragging, setIsDragging] = useState(false);
  const [streamedMessageIds, setStreamedMessageIds] = useState(new Set());

  const currentConv = conversations.find(c => c.id === activeConversationId);
  const messages = currentConv ? currentConv.messages : [];
  const hasMessages = messages.length > 0;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = (e) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || selectedDocumentIds.length === 0) return;
    sendMessage(chatInput);
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

  // Drag and drop handlers
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
      const pdfFiles = Array.from(files).filter(f => f.type === 'application/pdf');
      if (pdfFiles.length > 0) {
        uploadDocuments(pdfFiles);
      }
    }
  };

  // Basic custom markdown renderer to format text, code blocks, lists, and headers
  const renderMessageContent = (text) => {
    if (!text) return null;
    
    // Split into code blocks
    const parts = text.split(/(```[\s\S]*?```)/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        // Extract language and code
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
      
      // Inline formatting (bold, italics, inline code, list items)
      return (
        <div key={index} className="markdown-text-block">
          {part.split('\n').map((line, lineIdx) => {
            // Unordered list item
            if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
              return (
                <ul key={lineIdx} className="markdown-list">
                  <li>{formatInlineStyles(line.trim().slice(2))}</li>
                </ul>
              );
            }
            
            // Header
            if (line.trim().startsWith('### ')) {
              return <h3 key={lineIdx} className="markdown-h3">{formatInlineStyles(line.trim().slice(4))}</h3>;
            }
            if (line.trim().startsWith('## ')) {
              return <h2 key={lineIdx} className="markdown-h2">{formatInlineStyles(line.trim().slice(3))}</h2>;
            }
            
            // Standard line
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
    
    // Parse bold
    let newParts = [];
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
    
    // Parse inline code
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
    <div 
      className="chat-workspace-premium"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag & Drop Fullscreen Overlay */}
      <AnimatePresence>
        {isDragging && (
          <motion.div 
            className="drag-drop-overlay-fullscreen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Upload size={48} className="mb-4 animate-bounce text-cyan" />
            <h3 className="text-xl font-medium text-white mb-2">Drop PDF Manuscripts Here</h3>
            <p className="text-sm text-cyan/70">Docsy will ingest and index all files simultaneously.</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="workspace-header-premium" style={{ background: hasMessages ? undefined : 'transparent', borderBottom: hasMessages ? undefined : 'none' }}>
        <div className="header-left" style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }} />
        
        <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {conversations.length > 0 && (
            <button 
              type="button"
              className="pill-button-glow-sm" 
              onClick={() => newConversation()}
              title="Start a new chat thread"
            >
              <Plus size={12} />
              <span>New Chat</span>
            </button>
          )}
          
          {activeDocumentId && (
            <button 
              type="button"
              className={`pill-button ${showPreview ? 'active' : ''}`}
              style={{ 
                padding: '6px 14px', 
                fontSize: '11px', 
                height: '28px',
                background: showPreview ? 'rgba(255,255,255,0.1)' : 'rgba(10, 11, 16, 0.45)',
                borderColor: showPreview ? 'rgba(255, 255, 255, 0.22)' : 'rgba(255, 255, 255, 0.22)'
              }}
              onClick={togglePreview}
              title={showPreview ? "Hide PDF preview panel" : "Show PDF preview panel"}
            >
              <FileText size={11} />
              <span>{showPreview ? 'Hide PDF' : 'Show PDF'}</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Observatory/Chat Panel */}
      <div className="conversation-scroll-premium custom-scroll">
        {messages.length > 0 ? (
          <div className="message-stream">
            {messages.map((msg, index) => (
              <motion.div 
                key={msg.id || index} 
                className={`message-wrapper-premium ${msg.sender}`}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              >
                <div className="message-sender-tag">
                  {msg.sender === 'user' ? (user?.name || 'User') : 'Docsy'}
                </div>
                <div className="message-bubble-glass">
                  <div className="message-content">
                    {msg.sender === 'assistant' && index === messages.length - 1 && !streamedMessageIds.has(msg.id) ? (
                      <MessageContentStream
                        text={msg.text}
                        renderMessageContent={(txt) => {
                          if (txt === msg.text) {
                            setTimeout(() => {
                              setStreamedMessageIds(prev => {
                                const next = new Set(prev);
                                next.add(msg.id);
                                return next;
                              });
                            }, 50);
                          }
                          return renderMessageContent(txt);
                        }}
                      />
                    ) : (
                      renderMessageContent(msg.text)
                    )}
                  </div>
                  
                  {/* Rich citation cards section */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="citations-block-container" style={{ marginTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '10px' }}>
                      <div className="citations-section-title" style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.3)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', letterSpacing: '0.05em' }}>
                        <BookOpen size={11} />
                        <span>SOURCES RETRIEVED ({msg.citations.length})</span>
                      </div>
                      
                      <div 
                        className="citations-scroll-row custom-scroll" 
                        style={{ 
                          display: 'flex', 
                          gap: '10px', 
                          overflowX: 'auto', 
                          paddingBottom: '8px',
                          width: '100%',
                          scrollbarWidth: 'thin'
                        }}
                      >
                        {msg.citations.map((cite, citeIdx) => {
                          const matchDoc = documents.find(d => d.filename === cite.filename || d.name === cite.filename);
                          const docDisplayName = matchDoc ? matchDoc.name : (cite.filename || 'Source Document');
                          
                          return (
                            <div 
                              key={citeIdx} 
                              className="citation-preview-card"
                              onClick={() => setHighlightedCitation(cite)}
                              style={{
                                flexShrink: 0,
                                width: '220px',
                                background: 'rgba(255, 255, 255, 0.02)',
                                border: '1px solid rgba(255, 255, 255, 0.06)',
                                borderRadius: '10px',
                                padding: '8px 10px',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px',
                                textAlign: 'left'
                              }}
                              title="Click to locate cited passage in PDF preview"
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(77, 184, 200, 0.04)';
                                e.currentTarget.style.borderColor = 'rgba(77, 184, 200, 0.25)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10.5px' }}>
                                <span 
                                  style={{ 
                                    fontWeight: 600, 
                                    color: '#7dd4e0', 
                                    overflow: 'hidden', 
                                    textOverflow: 'ellipsis', 
                                    whiteSpace: 'nowrap',
                                    maxWidth: '130px'
                                  }}
                                >
                                  {docDisplayName}
                                </span>
                                <span style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '9px', fontWeight: 500 }}>
                                  Page {cite.page_number}
                                </span>
                              </div>
                              <div style={{ fontSize: '9.5px', color: 'rgba(255, 255, 255, 0.4)', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                Section: {cite.section_title || 'General'}
                              </div>
                              {cite.chunk_text && (
                                <p 
                                  style={{ 
                                    fontSize: '11px', 
                                    color: 'rgba(255, 255, 255, 0.7)', 
                                    lineHeight: '1.4',
                                    margin: '2px 0 0 0',
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'normal'
                                  }}
                                >
                                  "{cite.chunk_text}"
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        ) : null}

        {isTyping && (
          <motion.div 
            className="message-wrapper-premium assistant typing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="message-sender-tag">Docsy</div>
            <div className="message-bubble-glass typing-bubble">
              <div className="typing-loader">
                <span className="loader-dot" />
                <span className="loader-dot" />
                <span className="loader-dot" />
              </div>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat bottom panel */}
      <div className="chat-bottom-panel-premium">
        <div className="bottom-fade-overlay" />

        <div className="bottom-content-wrapper">
          <form className="chat-input-container-premium" onSubmit={handleSend}>
            <button 
              type="button" 
              className="input-attach-plus-btn" 
              onClick={handleUploadClick}
              disabled={isUploading}
              title="Upload PDF manuscripts"
            >
              {isUploading ? (
                <Loader2 size={17} className="animate-spin text-cyan" />
              ) : (
                <PlusCircle size={17} />
              )}
            </button>
            <input 
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf"
              style={{ display: 'none' }}
              onChange={handleFileInputChange}
            />

            <textarea
              ref={textInputRef}
              rows={1}
              className="chat-textarea-premium custom-scroll"
              placeholder={selectedDocumentIds.length > 0 ? `Ask about ${selectedDocumentIds.length} selected document(s)...` : "Select documents from the sidebar to query..."}
              value={chatInput}
              onChange={(e) => {
                setChatInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
              }}
              onKeyDown={handleKeyDown}
              disabled={isTyping || selectedDocumentIds.length === 0}
            />

            {/* Right actions */}
            <div className="input-right-actions-row">
              <button 
                type="button" 
                className="input-voice-btn-premium"
                title="Voice input"
                disabled={selectedDocumentIds.length === 0}
              >
                <Mic size={14} />
              </button>
              
              {isTyping ? (
                <div className="input-processing-dots-premium">
                  <span className="dot-teal-pulse" />
                  <span className="dot-teal-pulse" />
                  <span className="dot-teal-pulse" />
                </div>
              ) : (
                <button 
                  type="submit" 
                  className="chat-send-btn-circle-premium" 
                  disabled={!chatInput.trim() || selectedDocumentIds.length === 0}
                  title="Query the workspace"
                >
                  <Send size={14} />
                </button>
              )}
            </div>
          </form>

          <div className="chat-disclaimer-text">
            Docsy may occasionally misinterpret documents — verify critical information.
          </div>
        </div>
      </div>
    </div>
  );
}
