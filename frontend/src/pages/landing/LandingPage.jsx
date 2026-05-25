import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  LogOut,
  Menu,
  Send,
  Cpu,
  PlusCircle,
  Compass,
  Search,
  Bookmark,
  Settings
} from 'lucide-react';
import { Logo } from '../../components/ui/Logo';

export function LandingPage() {
  const navigate = useNavigate();
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });
  const [openFaqIndex, setOpenFaqIndex] = useState(null);

  const handleMouseMove = (e) => {
    const { clientX, clientY } = e;
    const x = (clientX - window.innerWidth / 2) / 60;
    const y = (clientY - window.innerHeight / 2) / 60;
    setMouseOffset({ x, y });
  };

  return (
    <div className="landing-container" onMouseMove={handleMouseMove}>
      <div className="hero-bg-wrapper" />

      {/* Thin, Premium Navbar */}
      <nav className="navbar">
        <Logo onClick={() => navigate('/')} />
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
          <button className="pill-button" onClick={() => navigate('/login')}>
            Start Researching
          </button>
        </div>
      </nav>

      {/* Structured Split Hero Layout */}
      <section className="hero-section-split" id="home">
        {/* Left Side: Editorial Typography & CTAs */}
        <div className="hero-text-side">
          <h1 className="hero-title animate-fade-in" style={{ marginBottom: '20px' }}>
            Search beyond <br />
            <span className="title-serif">Keywords</span>
          </h1>

          <div className="hero-ctas animate-fade-in" style={{ animationDelay: '0.1s', marginBottom: '20px' }}>
            <button
              className="pill-button-glow"
              onClick={() => navigate('/signup')}
            >
              Start Researching
            </button>
          </div>
        </div>

        {/* Right Side: Unified Perspective Product Mockup */}
        <div className="hero-preview-side animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <div className="workspace-preview-container">
            <div className="mockup-workspace">
              {/* Mini Sidebar */}
              <aside className="sidebar" style={{ width: '200px', minWidth: '200px', borderRight: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <div className="sidebar-header" style={{ padding: '16px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'rgba(255, 95, 86, 0.7)' }} />
                      <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'rgba(255, 189, 46, 0.7)' }} />
                      <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'rgba(39, 201, 63, 0.7)' }} />
                    </div>
                    <Logo style={{ fontSize: '14px', marginLeft: '4px' }} />
                  </div>
                </div>

                {/* Fake Command Search */}
                <div style={{ padding: '4px 14px 10px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0, 0, 0, 0.2)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '6px 12px', fontSize: '10.5px', color: 'rgba(255,255,255,0.35)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Search size={11} style={{ opacity: 0.6, color: '#64d2e1' }} />
                      <span>Search archive...</span>
                    </div>
                    <span style={{ fontSize: '8px', opacity: 0.6, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', padding: '1px 4px', borderRadius: '4px' }}>⌘K</span>
                  </div>
                </div>

                {/* Fake Navigation Tabs */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '6px 14px' }}>
                  <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.3)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', paddingLeft: '6px', marginBottom: '2px' }}>Navigation</span>
                  <div style={{ fontSize: '11px', color: '#64d2e1', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(45, 143, 160, 0.12)', border: '1px solid rgba(45, 143, 160, 0.2)', padding: '6px 12px', borderRadius: '6px', fontWeight: '500' }}>
                    <Compass size={13} style={{ color: '#64d2e1' }} /> Workspace
                  </div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px' }}>
                    <Bookmark size={13} style={{ opacity: 0.7 }} /> Saved Insights
                  </div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px' }}>
                    <Settings size={13} style={{ opacity: 0.7 }} /> Settings
                  </div>
                </div>

                <div className="sidebar-menu-wrapper" style={{ padding: '6px 14px' }}>
                  <div className="sidebar-section">
                    <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.3)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', paddingLeft: '6px', marginBottom: '4px' }}>Ingested Archive</span>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <div className="doc-list-item active" style={{ padding: '8px 12px', borderRadius: '6px', background: 'rgba(77, 184, 200, 0.12)', border: '1px solid rgba(77, 184, 200, 0.2)' }}>
                        <div className="doc-item-left" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <FileText size={12} style={{ flexShrink: 0, color: '#64d2e1' }} />
                          <span className="doc-name" style={{ fontSize: '11px', color: '#ffffff', fontWeight: '500' }}>relativity.pdf</span>
                        </div>
                        <span style={{ fontSize: '8px', color: '#64d2e1', background: 'rgba(100, 210, 225, 0.15)', padding: '1px 4px', borderRadius: '3px', fontWeight: '600' }}>ACTIVE</span>
                      </div>
                      
                      <div className="doc-list-item" style={{ padding: '8px 12px', borderRadius: '6px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)' }}>
                        <div className="doc-item-left" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <FileText size={12} style={{ flexShrink: 0, opacity: 0.5 }} />
                          <span className="doc-name" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>quantum_mechanics.pdf</span>
                        </div>
                        <span className="status-pulse-sync" style={{ fontSize: '8px', color: '#ffd075', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#ffd075', display: 'inline-block' }} />
                          SYNCING
                        </span>
                      </div>

                      <div className="doc-list-item" style={{ padding: '8px 12px', borderRadius: '6px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', opacity: 0.7 }}>
                        <div className="doc-item-left" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <FileText size={12} style={{ flexShrink: 0, opacity: 0.4 }} />
                          <span className="doc-name" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>neural_networks.pdf</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="sidebar-footer" style={{ padding: '12px 14px', borderTop: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="user-profile" style={{ gap: '8px', display: 'flex', alignItems: 'center' }}>
                    <div className="user-avatar" style={{ width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', background: 'rgba(45, 143, 160, 0.2)', border: '1px solid rgba(45, 143, 160, 0.4)', color: '#64d2e1', fontWeight: '600' }}>U</div>
                    <div className="user-info" style={{ display: 'flex', flexDirection: 'column' }}>
                      <span className="user-name" style={{ fontSize: '11px', fontWeight: '500', color: '#ffffff' }}>User</span>
                      <span className="user-email" style={{ fontSize: '8.5px', color: 'rgba(255,255,255,0.35)', display: 'block' }}>user@gmail.com</span>
                    </div>
                  </div>
                  <LogOut size={12} style={{ opacity: 0.5, cursor: 'pointer' }} />
                </div>
              </aside>

              {/* Chat Workspace Area */}
              <div className="chat-workspace" style={{
                flexGrow: 1,
                display: 'flex',
                flexDirection: 'column',
                background: 'linear-gradient(to bottom, rgba(10, 11, 16, 0.78) 0%, rgba(10, 11, 16, 0.90) 100%)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                borderRight: '1px solid rgba(255, 255, 255, 0.06)'
              }}>
                <header className="workspace-header" style={{ padding: '0 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'rgba(10, 11, 16, 0.4)', height: '44px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Menu size={13} style={{ opacity: 0.6 }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(45, 143, 160, 0.08)', border: '1px solid rgba(45, 143, 160, 0.2)', padding: '3px 8px', borderRadius: '4px', fontSize: '10px', color: '#64d2e1' }}>
                      <span className="status-dot-pulse" style={{ display: 'inline-block', width: '5px', height: '5px', borderRadius: '50%', background: '#64d2e1' }} />
                      Memory Sync Active
                    </div>
                  </div>
                  <span style={{ fontSize: '10px', color: '#64d2e1', letterSpacing: '0.05em', fontWeight: '600' }}>MEM INDEX READY</span>
                </header>

                {/* Conversation Stream */}
                <div className="conversation-scroll" style={{ flexGrow: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto' }}>
                  
                  {/* User Query */}
                  <div className="message-wrapper user" style={{ alignSelf: 'flex-end', maxWidth: '85%' }}>
                    <span className="message-sender" style={{ fontSize: '8px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', textAlign: 'right', marginBottom: '4px' }}>User Query</span>
                    <div className="message-bubble" style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '10px 12px', borderRadius: '10px', borderBottomRightRadius: '2px', fontSize: '11px', color: '#ffffff', lineHeight: '1.4' }}>
                      How does general relativity describe gravity?
                    </div>
                  </div>

                  {/* AI Response Card */}
                  <div className="message-wrapper assistant" style={{ alignSelf: 'flex-start', maxWidth: '90%' }}>
                    <span className="message-sender" style={{ fontSize: '8px', color: '#64d2e1', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>Docsy Engine</span>
                    <div className="message-bubble" style={{ background: 'rgba(10, 15, 30, 0.5)', border: '1px solid rgba(57, 160, 175, 0.2)', padding: '12px 14px', borderRadius: '10px', borderBottomLeftRadius: '2px', fontSize: '11px', color: 'rgba(255,255,255,0.85)', lineHeight: '1.5', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
                      Based on <strong style={{ color: '#ffffff' }}>relativity.pdf</strong>, Einstein's equations of general relativity describe gravity not as an attractive force, but as a geometric property of space and time. 
                      <span style={{ display: 'block', margin: '8px 0', borderLeft: '2px solid rgba(100, 210, 225, 0.3)', paddingLeft: '8px', fontStyle: 'italic', color: 'rgba(255,255,255,0.6)' }}>
                        "Mass and energy curve spacetime, and this geometric curvature dictates the paths that free-falling objects follow."
                      </span>
                      This means that matter tells spacetime how to curve, and curved spacetime tells matter how to move.
                      
                      {/* Floating citations badge */}
                      <div style={{ display: 'flex', gap: '6px', marginTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '8px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '9px', color: '#64d2e1', background: 'rgba(100, 210, 225, 0.1)', border: '1px solid rgba(100, 210, 225, 0.25)', padding: '2px 6px', borderRadius: '4px', cursor: 'default' }}>
                          <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#64d2e1' }} />
                          relativity.pdf: L144-152
                        </span>
                        <span style={{ fontSize: '9px', color: 'rgba(255, 255, 255, 0.4)', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)', padding: '2px 6px', borderRadius: '4px' }}>
                          98.4% Confidence
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Processing Status Activity */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 6px', borderRadius: '6px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', width: 'fit-content' }}>
                    <Cpu size={12} className="animate-pulse" style={{ color: '#64d2e1' }} />
                    <span style={{ fontSize: '9.5px', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono)' }}>
                      Synthesizing cross-document memory...
                    </span>
                  </div>

                </div>

                {/* Bottom Input Area */}
                <div style={{ padding: '12px', background: 'rgba(10, 11, 16, 0.4)', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                  <div className="input-glow-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0, 0, 0, 0.2)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '6px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexGrow: 1 }}>
                      <PlusCircle size={13} style={{ color: '#64d2e1', cursor: 'pointer' }} />
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center' }}>
                        <span>Search cross-document references...</span>
                        <span className="blinking-cursor" style={{ marginLeft: '1px', display: 'inline-block', width: '1.5px', height: '12px', background: '#64d2e1' }} />
                      </div>
                    </div>
                    <Send size={11} style={{ color: '#64d2e1', opacity: 0.7 }} />
                  </div>
                </div>
              </div>

              {/* PDF Preview panel (Right) */}
              <div className="preview-panel" style={{
                width: '240px',
                minWidth: '240px',
                background: 'linear-gradient(to bottom, rgba(14, 16, 24, 0.85) 0%, rgba(14, 16, 24, 0.95) 100%)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                display: 'flex',
                flexDirection: 'column',
                height: '100%'
              }}>
                <header className="preview-header" style={{ padding: '0 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'rgba(10, 11, 16, 0.4)', height: '44px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FileText size={12} style={{ color: '#ffd075' }} />
                    <span style={{ fontSize: '10.5px', fontWeight: '500', color: '#ffffff' }}>relativity.pdf</span>
                  </div>
                  <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.05)', padding: '2px 5px', borderRadius: '3px' }}>Page 14</span>
                </header>

                <div className="preview-content" style={{ flexGrow: 1, padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>
                  <div className="pdf-mock" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    
                    {/* Simulated Text Lines */}
                    <div style={{ width: '100%', height: '5px', background: 'rgba(255,255,255,0.1)', borderRadius: '1px' }} />
                    <div style={{ width: '92%', height: '5px', background: 'rgba(255,255,255,0.1)', borderRadius: '1px' }} />
                    <div style={{ width: '96%', height: '5px', background: 'rgba(255,255,255,0.1)', borderRadius: '1px' }} />
                    
                    {/* Highlighted Cited Paragraph */}
                    <div className="pdf-citation-highlight-container" style={{ position: 'relative', margin: '8px 0', padding: '6px', background: 'rgba(100, 210, 225, 0.05)', borderLeft: '2.5px solid #64d2e1', borderRadius: '2px' }}>
                      <div className="scanning-laser-line" />
                      <p style={{ margin: 0, fontSize: '9.5px', color: '#ffffff', lineHeight: '1.4' }}>
                        ...Einstein's field equations formulate gravity geometrically. <mark style={{ background: 'rgba(100, 210, 225, 0.2)', color: '#64d2e1', padding: '0 2px', borderRadius: '1px' }}>Mass and energy curve spacetime, and this geometric curvature dictates the paths</mark> that free-falling objects follow. Therefore, what we feel as gravity is...
                      </p>
                      <div style={{ marginTop: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '7.5px', color: '#64d2e1', fontWeight: '600' }}>COORDS: [x=144, y=320]</span>
                        <span style={{ fontSize: '7.5px', color: 'rgba(255,255,255,0.4)' }}>Lines 144-152</span>
                      </div>
                    </div>

                    <div style={{ width: '94%', height: '5px', background: 'rgba(255,255,255,0.1)', borderRadius: '1px' }} />
                    <div style={{ width: '88%', height: '5px', background: 'rgba(255,255,255,0.1)', borderRadius: '1px' }} />
                    <div style={{ width: '92%', height: '5px', background: 'rgba(255,255,255,0.1)', borderRadius: '1px' }} />
                    <div style={{ width: '90%', height: '5px', background: 'rgba(255,255,255,0.1)', borderRadius: '1px' }} />
                    <div style={{ width: '70%', height: '5px', background: 'rgba(255,255,255,0.1)', borderRadius: '1px', marginBottom: '8px' }} />

                    {/* Floating PDF metadata overlay card */}
                    <div style={{ padding: '8px', background: 'rgba(0, 0, 0, 0.4)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.3)', fontWeight: '600', textTransform: 'uppercase' }}>Index Metadata</span>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8.5px', color: 'rgba(255,255,255,0.6)' }}>
                        <span>Vector Space:</span>
                        <span style={{ color: '#64d2e1' }}>1536-dim</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8.5px', color: 'rgba(255,255,255,0.6)' }}>
                        <span>Chunk ID:</span>
                        <span style={{ color: '#ffd075' }}>chunk_14a_77</span>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* Minimal Footer */}
      <footer className="landing-footer-minimal">
        <div className="footer-left">
          <Logo style={{ color: '#ddd0b8', fontSize: '15px' }} />
          <span className="footer-divider">|</span>
          <span className="footer-copyright">© 2026 Docsy. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
