import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  MessageSquare, 
  Plus, 
  UploadCloud, 
  LogOut, 
  Menu, 
  Send, 
  Info, 
  Award 
} from 'lucide-react';
import { Logo } from '../../components/ui/Logo';
import { AmbientBackground } from '../../components/ui/AmbientBackground';

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="landing-container">
      <AmbientBackground />
      
      {/* Thin, Premium Navbar */}
      <nav className="navbar">
        <Logo onClick={() => navigate('/')} />
        <ul className="nav-links">
          <li><a href="#home" className="active">Home</a></li>
        </ul>
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
          <button className="pill-button" onClick={() => navigate('/login')}>
            Start Researching
          </button>
        </div>
      </nav>

      {/* Structured Split Hero Layout */}
      <section className="hero-section-split">
        {/* Left Side: Editorial Typography & CTAs */}
        <div className="hero-text-side">
          <h1 className="hero-title animate-fade-in" style={{ marginBottom: '20px' }}>
            Search beyond <br />
            <span className="title-serif">Keywords</span>
          </h1>
          
          <div className="hero-ctas animate-fade-in" style={{ animationDelay: '0.1s', marginBottom: '28px' }}>
            <button
              className="pill-button-glow"
              onClick={() => navigate('/signup')}
            >
              Start Researching
            </button>
          </div>

          {/* Intentionally arranged pills - margin adjusted to prevent overlap */}
          <div className="hero-pills-row animate-fade-in" style={{ animationDelay: '0.2s', marginTop: '28px' }}>
            <span className="hero-pill"><span className="dot" /> Isolated Memory</span>
            <span className="hero-pill"><span className="dot" /> Scoped Retrieval</span>
            <span className="hero-pill"><span className="dot" /> Cited Grounding</span>
            <span className="hero-pill"><span className="dot" /> Instant Indexing</span>
          </div>
        </div>

        {/* Right Side: Floating Perspective Product Mockup */}
        <div className="hero-preview-side animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <div className="workspace-preview-container">
            {/* Floating Tags anchored directly inside the mockup boundary */}
            <div className="floating-tag-orbit floating-tag-top-left">
              <span>Starlight Space</span>
            </div>
            <div className="floating-tag-orbit floating-tag-bottom-right">
              <span>Infinite Archive</span>
            </div>

            <div className="mockup-workspace">
              {/* Mini Sidebar */}
              <aside className="sidebar">
                <div className="sidebar-header">
                  <Logo style={{ fontSize: '10px' }} />
                </div>
                <div className="sidebar-menu-wrapper">
                  <div className="sidebar-section">
                    <label className="sidebar-section-title">Ingested Archive</label>
                    <div className="upload-area">
                      <UploadCloud size={13} style={{ opacity: 0.6 }} />
                      <div className="upload-title">Drop PDF or browse</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                      <div className="doc-list-item active">
                        <div className="doc-item-left">
                          <FileText size={10} style={{ flexShrink: 0 }} />
                          <span className="doc-name">relativity.pdf</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="sidebar-section">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                      <label className="sidebar-section-title">Discussions</label>
                      <Plus size={9} style={{ opacity: 0.6 }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div className="chat-list-item active">
                        <div className="doc-item-left">
                          <MessageSquare size={10} style={{ flexShrink: 0 }} />
                          <span className="doc-name">Time dilation query</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="sidebar-footer">
                  <div className="user-profile">
                    <div className="user-avatar">R</div>
                    <div className="user-info">
                      <span className="user-name">Researcher</span>
                    </div>
                  </div>
                  <LogOut size={10} style={{ opacity: 0.6 }} />
                </div>
              </aside>
              
              {/* Mini Chat Workspace */}
              <div className="chat-workspace">
                <header className="workspace-header">
                  <div className="header-meta">
                    <Menu size={11} style={{ opacity: 0.6, cursor: 'pointer' }} />
                    <div className="doc-pill">
                      <span style={{ display: 'inline-block', width: '4px', height: '4px', borderRadius: '50%', background: 'rgba(255,255,255,0.7)' }} />
                      relativity.pdf
                    </div>
                  </div>
                </header>
                <div className="conversation-scroll custom-scroll">
                  <div className="message-wrapper user">
                    <div className="message-sender">Researcher</div>
                    <div className="message-bubble">
                      What is time dilation?
                    </div>
                  </div>
                  <div className="message-wrapper assistant">
                    <div className="message-sender">Archive Memory</div>
                    <div className="message-bubble">
                      Time dilation is a special relativity phenomenon where clocks slow down in motion.
                      <div className="citation-container">
                        <div className="citation-badge">
                          <Info size={8} style={{ flexShrink: 0 }} />
                          <span>Source fragment [1]</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="chat-input-container">
                  <div className="input-glow-wrapper">
                    <span style={{ fontSize: '9px', color: 'var(--text-muted)', flexGrow: 1 }}>Ask the archive...</span>
                    <button className="chat-submit-btn" disabled style={{ width: '18px', height: '18px', borderRadius: '4px' }}>
                      <Send size={8} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Mini Preview Panel */}
              <aside className="preview-panel">
                <div className="preview-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden' }}>
                    <FileText size={10} style={{ flexShrink: 0 }} />
                    <span className="doc-name" style={{ fontWeight: '600' }}>relativity.pdf</span>
                  </div>
                </div>
                <div className="preview-content custom-scroll">
                  <div className="pdf-mock">
                    <div className="chunk-card highlighted">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '8px', fontWeight: '600', marginBottom: '4px', color: '#ffffff' }}>
                        <Award size={9} style={{ color: '#ffffff' }} />
                        <span>ACTIVE CITED SEGMENT (Match: 94.2%)</span>
                      </div>
                      <div style={{ fontSize: '8.5px', lineHeight: '1.3' }}>
                        "...moving clocks run slower relative to..."
                      </div>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div>© 2026 Docsy Inc. All rights reserved.</div>
        <div style={{ display: 'flex', gap: '24px' }}>
          <a href="#privacy">Privacy</a>
          <a href="#terms">Terms</a>
        </div>
      </footer>
    </div>
  );
}
