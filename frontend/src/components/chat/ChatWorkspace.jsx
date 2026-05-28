import { useEffect, useRef, useState } from 'react';
import { Send, Upload, Loader2, Plus, FileText, PlusCircle, Mic, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useAuthStore } from '../../stores/authStore';
import { DocumentPreviewPanel } from '../document/DocumentPreviewPanel';
import { API_BASE_URL } from '../../constants/api';

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
    highlightedCitation,
    setHighlightedCitation,
    togglePreview,
    newConversation
  } = useWorkspaceStore();

  const messagesEndRef = useRef(null);
  const textInputRef = useRef(null);
  const fileInputRef = useRef(null);

  const [isDragging, setIsDragging] = useState(false);
  const [streamedMessageIds, setStreamedMessageIds] = useState(new Set());

  const selectedDoc = documents.find((doc) => doc.id === activeDocumentId) || null;
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

      {/* Drag Overlay */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            className="drag-drop-overlay-fullscreen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Upload size={48} className="mb-4 animate-bounce text-cyan" />
            <h3 className="text-xl font-medium text-white mb-2">
              Drop PDF Manuscripts Here
            </h3>
            <p className="text-sm text-cyan/70">
              Docsy will ingest and index all files simultaneously.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LEFT CHAT AREA */}
      <div className="chat-main-column">

        {/* Header */}
        <header
          className="workspace-header-premium"
          style={{
            background: hasMessages ? undefined : 'transparent',
            borderBottom: hasMessages ? undefined : 'none'
          }}
        >
          <div
            className="header-left"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              minWidth: 0
            }}
          />

          <div
            className="header-right"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            {conversations.length > 0 && (
              <button
                type="button"
                className="pill-button-glow-sm"
                onClick={() => newConversation()}
              >
                <Plus size={12} />
                <span>New Chat</span>
              </button>
            )}

            <button
              type="button"
              className={`pill-button ${showPreview ? 'active' : ''}`}
              style={{
                padding: '6px 14px',
                fontSize: '11px',
                height: '28px'
              }}
              onClick={togglePreview}
            >
              <FileText size={11} />
              <span>
                {showPreview ? 'Hide PDF' : 'Show PDF'}
              </span>
            </button>
          </div>
        </header>

        {/* Messages */}
        <div className="conversation-scroll-premium custom-scroll">

          {messages.length > 0 ? (
            <div className="message-stream">

              {messages.map((msg, index) => (

                <motion.div
                  key={msg.id || index}
                  className={`message-wrapper-premium ${msg.sender}`}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                >

                  <div className="message-sender-tag">
                    {msg.sender === 'user'
                      ? (user?.name || 'User')
                      : 'Docsy'}
                  </div>

                  <div className="message-bubble-glass">

                    <div className="message-content">
                      {renderMessageContent(msg.text)}
                    </div>

                    {/* CITATIONS */}
                    {msg.citations && msg.citations.length > 0 && (

                      <div
                        className="citations-block-container"
                        style={{
                          marginTop: '12px',
                          borderTop:
                            '1px solid rgba(255,255,255,0.05)',
                          paddingTop: '10px'
                        }}
                      >

                        <div
                          className="citations-scroll-row custom-scroll"
                          style={{
                            display: 'flex',
                            gap: '10px',
                            overflowX: 'auto'
                          }}
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
                                onClick={() =>
                                  setHighlightedCitation({
                                    ...cite,
                                    pdf_url: `${API_BASE_URL}/uploads/${cite.filename}`
                                  })
                                }
                              >
                                <div className="citation-header">
                                  <span className="citation-filename" title={cite.filename}>
                                    {cite.filename}
                                  </span>
                                  <span className="citation-page">
                                    Page {cite.page_number}
                                  </span>
                                </div>
                                <p>
                                  {cite.chunk_text}
                                </p>
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

          <div ref={messagesEndRef} />

        </div>

        {/* Bottom Input */}
        <div className="chat-bottom-panel-premium">

          <div className="bottom-content-wrapper">

            <form
              className="chat-input-container-premium"
              onSubmit={handleSend}
            >

              <button
                type="button"
                className="input-attach-plus-btn"
                onClick={handleUploadClick}
              >
                <PlusCircle size={17} />
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
                value={chatInput}
                onChange={(e) => {
                  setChatInput(e.target.value);
                }}
                onKeyDown={handleKeyDown}
              />

              <button
                type="submit"
                className="chat-send-btn-circle-premium"
              >
                <Send size={14} />
              </button>

            </form>

          </div>

        </div>

      </div>

      {/* RIGHT PDF PREVIEW PANEL */}
      <AnimatePresence>
        {showPreview && (
          <DocumentPreviewPanel
            document={selectedDoc || (highlightedCitation ? {
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