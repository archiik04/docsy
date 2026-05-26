import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, HelpCircle, Award, Maximize2, Minimize2 } from 'lucide-react';
import { useWorkspaceStore } from '../../stores/workspaceStore';

export function DocumentPreviewPanel({ document }) {
  const { highlightedCitation, setHighlightedCitation } = useWorkspaceStore();
  const highlightRef = useRef(null);
  
  const [isFocusMode, setIsFocusMode] = useState(false);

  // Auto scroll to highlighted citation when it changes
  useEffect(() => {
    if (highlightedCitation && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightedCitation]);

  if (!document) {
    return (
      <aside className="preview-panel-premium empty">
        <div className="empty-panel-state-premium">
          <HelpCircle size={26} className="empty-icon animate-pulse" />
          <span>Manuscript viewer is inactive. Please select a document to inspect.</span>
        </div>
      </aside>
    );
  }

  // Get cosine similarity percentage from vector distance
  const getSimilarityPercentage = (distance) => {
    if (distance === undefined || distance === null) return 'N/A';
    const similarity = 1 - distance;
    return `${(similarity * 100).toFixed(1)}%`;
  };

  return (
    <motion.aside 
      className={`preview-panel-premium ${isFocusMode ? 'focus-mode' : ''}`}
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: isFocusMode ? '75%' : 420, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 220, damping: 28 }}
    >
      {/* Header */}
      <div className="preview-header-premium">
        <div className="header-meta-left">
          <FileText size={14} className="doc-icon" />
          <span className="doc-title-text" title={document.name}>
            {document.name}
          </span>
        </div>
        
        <div className="header-meta-right">
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
            className="focus-toggle-btn"
            onClick={() => setIsFocusMode(!isFocusMode)}
            title={isFocusMode ? "Leave focus mode" : "Enter focus mode"}
          >
            {isFocusMode ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
        </div>
      </div>

      {/* Preview Content */}
      <div className="preview-content-premium custom-scroll">
        <div className="pdf-mock-premium">
          <div className="pdf-title-container">
            <h1 className="pdf-heading">
              {document.previewText.heading}
            </h1>
            <p className="pdf-subheading">
              {document.previewText.subheading}
            </p>
          </div>

          <div className="pdf-divider-glow" />

          {/* Interactive highlighted fragment focus */}
          <AnimatePresence mode="wait">
            {highlightedCitation ? (
              <motion.div 
                ref={highlightRef}
                className="chunk-card-premium highlighted animate-glow-pulse"
                key="citation"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="chunk-badge-row">
                  <Award size={13} className="award-icon" />
                  <span>ACTIVE CITED SEGMENT (Match: {getSimilarityPercentage(highlightedCitation.distance)})</span>
                </div>
                {highlightedCitation.page_number && (
                  <div className="chunk-meta-row" style={{ fontSize: '11px', opacity: 0.8, marginTop: '4px', marginBottom: '8px', color: '#06b6d4', fontWeight: 500 }}>
                    Section: {highlightedCitation.section_title || 'General'} | Page: {highlightedCitation.page_number}
                  </div>
                )}
                <p className="chunk-content-text">
                  "{highlightedCitation.chunk_text}"
                </p>
              </motion.div>
            ) : (
              <motion.div 
                className="pdf-sections-list"
                key="outline"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {document.previewText.sections.map((section, idx) => (
                  <div key={idx} className="chunk-card-premium">
                    <div className="chunk-header-title">
                      {section.title}
                    </div>
                    <p className="chunk-content-text">
                      {section.content}
                    </p>
                  </div>
                ))}
                
                {document.extracted_text && document.extracted_text.length > 1500 && (
                  <div className="outline-truncated-hint">
                    Manuscript is fully indexed. Remaining chunks will display dynamically when cited.
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="pdf-divider-glow end" />
        </div>
      </div>
    </motion.aside>
  );
}
