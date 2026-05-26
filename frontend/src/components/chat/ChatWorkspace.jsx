import React, { useEffect, useRef, useState } from 'react';
import { Menu, Send, Sparkles, MessageSquare, Info, Upload, Loader2, Plus, FileText, PlusCircle, Mic } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkspaceStore } from '../../stores/workspaceStore';

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

export function ChatWorkspace({ onMenuToggle }) {
  const {
    documents,
    activeDocumentId,
    conversationsByDoc,
    activeConversationId,
    chatInput,
    isTyping,
    isUploading,
    showPreview,
    setChatInput,
    sendMessage,
    uploadDocument,
    selectDocument,
    setHighlightedCitation,
    togglePreview,
    newConversation
  } = useWorkspaceStore();

  const messagesEndRef = useRef(null);
  const textInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const pickerRef = useRef(null);

  const [isDragging, setIsDragging] = useState(false);
  const [showDocPicker, setShowDocPicker] = useState(false);
  const [streamedMessageIds, setStreamedMessageIds] = useState(new Set());

  const activeDoc = documents.find(d => d.id === activeDocumentId);
  const activeConvs = activeDocumentId ? (conversationsByDoc[activeDocumentId] || []) : [];
  const currentConv = activeConvs.find(c => c.id === activeConversationId);
  const messages = currentConv ? currentConv.messages : [];
  const hasMessages = activeDocumentId && messages.length > 0;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Click outside listener to close document picker
  useEffect(() => {
    function handleClickOutside(event) {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setShowDocPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSend = (e) => {
    if (e) e.preventDefault();
    if (!chatInput.trim()) return;
    sendMessage(chatInput);
    if (textInputRef.current) {
      textInputRef.current.style.height = 'auto';
    }
    setShowDocPicker(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestionClick = (promptText) => {
    setChatInput(promptText);
    setTimeout(() => {
      if (textInputRef.current) {
        textInputRef.current.focus();
        textInputRef.current.style.height = 'auto';
        textInputRef.current.style.height = `${Math.min(textInputRef.current.scrollHeight, 160)}px`;
      }
    }, 50);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadDocument(file);
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
    const file = e.dataTransfer.files?.[0];
    if (file && file.type === 'application/pdf') {
      uploadDocument(file);
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
    // Basic regex replace for bold (**bold**) and code (`code`)
    const boldRegex = /\*\*(.*?)\*\*/g;
    const codeRegex = /`(.*?)`/g;
    
    let parts = [{ text: line, isStyled: false }];
    
    // Parse bold
    let boldMatch;
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
            <h3 className="text-xl font-medium text-white mb-2">Drop PDF Manuscript Here</h3>
            <p className="text-sm text-cyan/70">Docsy will ingest and index the document instantly.</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="workspace-header-premium" style={{ background: hasMessages ? undefined : 'transparent', borderBottom: hasMessages ? undefined : 'none' }}>
        <div className="header-left">
          <button className="menu-toggle-btn" onClick={onMenuToggle} title="Toggle navigation">
            <Menu size={16} />
          </button>
          {hasMessages && activeDoc && (
            <div className="doc-pill-glow">
              <span className="dot-glow" />
              <span className="doc-name-text">{activeDoc.name}</span>
            </div>
          )}
        </div>
        <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {activeDocumentId && (
            <>
              <button 
                type="button"
                className="pill-button-glow-sm" 
                onClick={() => newConversation()}
                title="Start a new chat thread for this document"
              >
                <Plus size={12} />
                <span>New Chat</span>
              </button>
              
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
            </>
          )}
        </div>
      </header>

      {/* Main Observatory/Chat Panel */}
      {hasMessages ? (
        /* Dialogue stream view */
        <div className="conversation-scroll-premium custom-scroll">
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
                  {msg.sender === 'user' ? 'Researcher' : 'Archive Memory'}
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
                  
                  {/* Clickable Grounded Citation Badges */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="citations-tray">
                      {msg.citations.map((cite, cIdx) => (
                        <div 
                          key={cIdx} 
                          className="citation-badge-premium"
                          onClick={() => setHighlightedCitation(cite)}
                          title={`Section: ${cite.section_title || 'General'} | Page: ${cite.page_number} (Score: ${cite.distance?.toFixed(4) || 'N/A'})`}
                        >
                          <Info size={10} className="info-icon" />
                          <span>Source [{cIdx + 1}]</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {isTyping && (
            <motion.div 
              className="message-wrapper-premium assistant typing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="message-sender-tag">Archive Memory</div>
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
      ) : (
        /* Centered input onboarding view */
        <div className="observatory-onboarding-container">
          <motion.div 
            className="welcome-logo-badge-premium"
            animate={{ scale: [1, 1.03, 1] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <Sparkles size={32} className="logo-badge-icon text-cyan" style={{ filter: 'drop-shadow(0 0 12px rgba(77, 184, 200, 0.4))' }} />
          </motion.div>
          
          <h1 className="observatory-title">Docsy Research Observatory</h1>
          <p className="observatory-subtitle">
            Query your documents with hybrid semantic intelligence. Ingest a PDF manuscript or select an archive file to explore.
          </p>

          <div className="centered-query-bar-wrapper" ref={pickerRef}>
            <div className="floating-glass-query-input">
              <button 
                type="button"
                className="query-upload-btn"
                onClick={handleUploadClick}
                disabled={isUploading}
                title="Upload PDF Manuscript"
              >
                {isUploading ? <Loader2 size={16} className="animate-spin text-cyan" /> : <Plus size={16} />}
              </button>
              
              <input 
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                style={{ display: 'none' }}
                onChange={handleFileInputChange}
              />

              <input 
                type="text"
                placeholder={activeDoc ? `Ask about "${activeDoc.name}"...` : "Select a document or type to search..."}
                className="chat-textarea-premium"
                style={{ padding: '4px 0', border: 'none', background: 'none', outline: 'none', color: '#fff', flex: 1 }}
                value={chatInput}
                onChange={(e) => {
                  setChatInput(e.target.value);
                  setShowDocPicker(true);
                }}
                onFocus={() => setShowDocPicker(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (activeDocumentId) {
                      handleSend();
                    } else {
                      // Try to pick the first matching document automatically
                      const matches = documents.filter(d => d.name.toLowerCase().includes(chatInput.toLowerCase()));
                      if (matches.length > 0) {
                        selectDocument(matches[0].id);
                        setTimeout(() => sendMessage(chatInput), 50);
                      } else {
                        alert("Please select or upload a document first.");
                      }
                    }
                  }
                }}
              />

              <span className="keyboard-shortcut-hint">Enter</span>

              {isTyping ? (
                <div className="input-processing-dots-premium">
                  <span className="dot-teal-pulse" /><span className="dot-teal-pulse" /><span className="dot-teal-pulse" />
                </div>
              ) : (
                <button 
                  type="button" 
                  className="chat-send-btn-circle-premium" 
                  onClick={() => {
                    if (activeDocumentId) {
                      handleSend();
                    } else {
                      setShowDocPicker(true);
                    }
                  }}
                  disabled={!chatInput.trim()}
                >
                  <Send size={14} />
                </button>
              )}
            </div>

            {/* Document selection Dropdown */}
            <AnimatePresence>
              {showDocPicker && !activeDocumentId && documents.length > 0 && (
                <motion.div 
                  className="query-doc-picker-dropdown custom-scroll"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                >
                  <div style={{ padding: '6px 12px', fontSize: '10px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em' }}>
                    Select a document to query
                  </div>
                  {documents
                    .filter(d => d.name.toLowerCase().includes(chatInput.toLowerCase()))
                    .map(doc => (
                      <button
                        key={doc.id}
                        type="button"
                        className="query-doc-picker-item"
                        onClick={() => {
                          selectDocument(doc.id);
                          setShowDocPicker(false);
                          // Auto trigger message if input exists
                          if (chatInput.trim()) {
                            setTimeout(() => sendMessage(chatInput), 50);
                          }
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <FileText size={13} className="text-cyan" />
                          <span style={{ fontSize: '12.5px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '280px' }}>
                            {doc.name}
                          </span>
                        </div>
                        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>{doc.size}</span>
                      </button>
                    ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Onboarding Suggestion Chips */}
          <div className="suggestion-chips-row" style={{ marginTop: '24px', maxWidth: '550px' }}>
            <div className="suggestion-chip-pill" onClick={() => handleSuggestionClick('Summarize key concepts')}>
              Summarize key concepts
            </div>
            <div className="suggestion-chip-pill" onClick={() => handleSuggestionClick('What are the core findings?')}>
              What are the core findings?
            </div>
            <div className="suggestion-chip-pill" onClick={() => handleSuggestionClick('Extract methodology')}>
              Extract methodology
            </div>
          </div>
        </div>
      )}

      {/* Chat bottom panel (only rendered when there is active chat dialogue) */}
      {hasMessages && (
        <div className="chat-bottom-panel-premium">
          {/* BOTTOM FADE OVERLAY */}
          <div className="bottom-fade-overlay" />

          {/* z-index: 1 CONTENT WRAPPER */}
          <div className="bottom-content-wrapper">
            <form className="chat-input-container-premium" onSubmit={handleSend}>
              {/* PlusCircle left icon */}
              <button 
                type="button" 
                className="input-attach-plus-btn" 
                onClick={handleUploadClick}
                disabled={isUploading}
                title="Upload PDF manuscript"
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
                accept=".pdf"
                style={{ display: 'none' }}
                onChange={handleFileInputChange}
              />

              <textarea
                ref={textInputRef}
                rows={1}
                className="chat-textarea-premium custom-scroll"
                placeholder="Conversing with memory systems..."
                value={chatInput}
                onChange={(e) => {
                  setChatInput(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
                }}
                onKeyDown={handleKeyDown}
                disabled={isTyping}
              />

              {/* Right actions */}
              <div className="input-right-actions-row">
                <button 
                  type="button" 
                  className="input-voice-btn-premium"
                  title="Voice input"
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
                    disabled={!chatInput.trim()}
                    title="Query the archive"
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
      )}
    </div>
  );
}
