import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { FileText, HelpCircle, X } from 'lucide-react';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { API_BASE_URL } from '../../constants/api';

export function DocumentPreviewPanel({ document }) {
  const {
    highlightedCitation,
    setHighlightedCitation,
    setShowPreview
  } = useWorkspaceStore();

  const highlightRef = useRef(null);

  // Auto scroll when citation changes
  useEffect(() => {
    if (highlightedCitation && highlightRef.current) {
      highlightRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [highlightedCitation]);

  // Empty state
  if (!document) {
    return (
      <aside className="preview-panel-premium empty">
        <div className="empty-panel-state-premium">
          <HelpCircle
            size={26}
            className="empty-icon animate-pulse"
          />
          <span>
            Manuscript viewer is inactive.
            Please select a document to inspect.
          </span>
        </div>
      </aside>
    );
  }

  // Calculate PDF URL: prioritize highlighted citation, then current active document
  const pdfUrl =
    highlightedCitation?.pdf_url ||
    (document?.filename
      ? `${API_BASE_URL}/uploads/${document.filename}`
      : null);

  // Active page
  const activePage = highlightedCitation?.page_number || 1;

  return (
    <motion.aside
      className="preview-panel-premium"
      initial={{
        opacity: 0,
        x: 50
      }}
      animate={{
        opacity: 1,
        x: 0
      }}
      exit={{
        opacity: 0,
        x: 50
      }}
      transition={{
        duration: 0.25,
        ease: 'easeOut'
      }}
    >
      {/* HEADER */}
      <div className="preview-header-premium">
        <div className="header-meta-left">
          <FileText
            size={14}
            className="doc-icon"
          />
          <span
            className="doc-title-text"
            title={document.name}
          >
            {document.name}
          </span>
        </div>

        <div className="header-meta-right" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {highlightedCitation && (
            <button
              className="clear-focus-btn"
              onClick={() => setHighlightedCitation(null)}
              title="Clear highlighted segment focus"
            >
              Clear focus
            </button>
          )}
          <button
            onClick={() => setShowPreview(false)}
            title="Close Preview Panel"
            style={{ 
              padding: '4px', 
              border: 'none', 
              background: 'none', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center',
              borderRadius: '4px',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
          >
            <X size={16} style={{ color: 'rgba(255, 255, 255, 0.5)' }} />
          </button>
        </div>
      </div>

      {/* CONTENT */}
      <div className="preview-content-premium custom-scroll">
        <div className="pdf-mock-premium">
          {/* ACTIVE CITATION CARD */}
          {highlightedCitation && (
            <div
              ref={highlightRef}
              style={{
                marginBottom: '18px',
                padding: '14px',
                borderRadius: '16px',
                border: '1px solid rgba(0, 255, 255, 0.25)',
                background: 'rgba(10, 16, 28, 0.65)',
                backdropFilter: 'blur(12px)',
                boxShadow: '0 0 20px rgba(0, 255, 255, 0.12)',
                transition: 'all 0.3s ease'
              }}
            >
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  color: 'rgba(0, 255, 255, 0.75)',
                  marginBottom: '8px',
                  textTransform: 'uppercase'
                }}
              >
              </div>
              
              
            </div>
          )}

          {/* PDF IFRAME OR DOCX PREVIEW */}
          {pdfUrl ? (
            pdfUrl.match(/\.docx$/i) ? (
              <div
                style={{
                  width: '100%',
                  height: '76vh',
                  borderRadius: '18px',
                  overflow: 'hidden',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '24px',
                  textAlign: 'center',
                  boxSizing: 'border-box'
                }}
              >
                <FileText size={48} style={{ color: '#2d8fa0', marginBottom: '16px' }} />
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#ffffff', marginBottom: '8px' }}>
                  Word Document (.docx)
                </h3>
                <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', maxWidth: '280px', lineHeight: '1.5', marginBottom: '24px' }}>
                  This file type cannot be previewed directly in the browser panel. You can download the file to view its formatting, or read its extracted text in the chat window.
                </p>
                <a
                  href={pdfUrl}
                  download
                  style={{
                    background: '#2d8fa0',
                    color: '#ffffff',
                    padding: '10px 20px',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontWeight: 650,
                    textDecoration: 'none',
                    transition: 'all 0.2s',
                    boxShadow: '0 4px 12px rgba(45, 143, 160, 0.25)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#237380'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#2d8fa0'}
                >
                  Download Document
                </a>
              </div>
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '76vh',
                  borderRadius: '18px',
                  overflow: 'hidden',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  background: '#0a0f1d'
                }}
              >
                <iframe
                  key={pdfUrl} // re-mount iframe only when switching different files
                  src={`${pdfUrl}#page=${activePage}`}
                  title="PDF Viewer"
                  width="100%"
                  height="100%"
                  style={{
                    border: 'none',
                    background: '#111'
                  }}
                />
              </div>
            )
          ) : (
            <div className="empty-panel-state-premium">
              <HelpCircle size={26} className="empty-icon animate-pulse" />
              <span>No PDF file found for this document.</span>
            </div>
          )}
        </div>
      </div>
    </motion.aside>
  );
}
