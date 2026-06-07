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
  Settings,
  Database,
  Plus,
  Trash2
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

  const pillStyle = {
    padding: '6px 12px',
    background: 'rgba(255, 255, 255, 0.45)',
    border: '1px solid rgba(10, 16, 28, 0.08)',
    borderRadius: '12px',
    fontSize: '9.5px',
    color: '#0a101c',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)',
    cursor: 'default',
    fontFamily: 'var(--font-sans)',
    fontWeight: 500
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
          <div className="workspace-preview-container" style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0.15) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.55)',
            boxShadow: '0 30px 100px rgba(10, 16, 28, 0.12), 0 0 80px rgba(100, 210, 225, 0.04)',
            maxWidth: '1180px',
            width: '100%'
          }}>
            <div className="mockup-workspace" style={{
              background: 'url(/docsy_hero.png) no-repeat center center',
              backgroundSize: 'cover',
              border: '1px solid rgba(255, 255, 255, 0.45)',
              boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.5)',
              display: 'flex',
              height: '400px'
            }}>
              {/* Mini Sidebar */}
              <aside className="sidebar" style={{
                width: '200px',
                minWidth: '200px',
                background: 'rgba(255, 255, 255, 0.32)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderRight: '1.5px solid rgba(255, 255, 255, 0.55)',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                boxSizing: 'border-box'
              }}>
                <div style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderBottom: '1px solid rgba(10, 16, 28, 0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 800, color: '#000000' }}>Docsy</span>
                  <div className="sidebar-new-chat-btn" style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '5px',
                    background: 'rgba(100, 210, 225, 0.18)',
                    border: '1px solid rgba(100, 210, 225, 0.45)',
                    color: '#2d8fa0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'default'
                  }}>
                    <Plus size={9} style={{ strokeWidth: 3 }} />
                  </div>
                </div>

                {/* Mode tabs selector (Workspace vs Knowledge Base) */}
                <div className="sidebar-mode-selector" style={{ display: 'flex', gap: '3px', padding: '2px', borderRadius: '6px', margin: '6px 12px 4px 12px', background: 'rgba(10, 16, 28, 0.02)', width: 'auto', boxSizing: 'border-box' }}>
                  <div className="mode-tab-btn active" style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '3px',
                    padding: '4px 0',
                    fontSize: '8.5px',
                    fontWeight: 850,
                    color: '#2d8fa0',
                    background: 'rgba(255, 255, 255, 0.65)',
                    border: '1px solid rgba(100, 210, 225, 0.35)',
                    borderRadius: '4px'
                  }}>
                    <Compass size={9} style={{ strokeWidth: 2.5 }} />
                    <span>Workspace</span>
                  </div>
                  <div className="mode-tab-btn" style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '3px',
                    padding: '4px 0',
                    fontSize: '8.5px',
                    fontWeight: 800,
                    color: 'rgba(10, 16, 28, 0.75)'
                  }}>
                    <Database size={9} style={{ opacity: 0.8 }} />
                    <span style={{ whiteSpace: 'nowrap' }}>Knowledge Base</span>
                  </div>
                </div>

                {/* Search */}
                <div className="sidebar-search-container" style={{
                  margin: '4px 12px',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  background: 'rgba(255, 255, 255, 0.35)',
                  border: '1px solid rgba(10, 16, 28, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  width: 'auto',
                  boxSizing: 'border-box'
                }}>
                  <Search size={9} className="sidebar-search-icon" style={{ strokeWidth: 3, color: 'rgba(10, 16, 28, 0.6)' }} />
                  <span className="sidebar-search-input" style={{ fontSize: '8.5px', fontWeight: 800, color: 'rgba(10, 16, 28, 0.6)' }}>Search threads...</span>
                </div>

                {/* Active Discussions List */}
                <div className="sidebar-threads-scroll" style={{ flexGrow: 1, padding: '4px 12px', display: 'flex', flexDirection: 'column', gap: '3px', marginRight: '0px' }}>
                  <div className="convo-thread-item active" style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '4px 6px',
                    borderRadius: '6px',
                    background: 'rgba(255, 255, 255, 0.65)',
                    border: '1px solid rgba(100, 210, 225, 0.45)',
                    cursor: 'default'
                  }}>
                    <span className="thread-title-text" style={{ fontSize: '8.5px', fontWeight: 850, color: '#2d8fa0' }}>General Relativity</span>
                    <button className="thread-delete-btn" style={{ opacity: 1, padding: '1px', background: 'transparent', border: 'none', color: 'rgba(10, 16, 28, 0.6)' }}>
                      <Trash2 size={9} style={{ strokeWidth: 2.5 }} />
                    </button>
                  </div>
                </div>

                {/* Footer profile */}
                <div className="sidebar-footer-premium" style={{
                  padding: '8px 12px',
                  borderTop: '1px solid rgba(10, 16, 28, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'rgba(255, 255, 255, 0.2)',
                  width: '100%',
                  boxSizing: 'border-box'
                }}>
                  <div className="user-profile" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div className="rail-avatar-glow" style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: 'rgba(45, 143, 160, 0.18)',
                      border: '1px solid rgba(45, 143, 160, 0.45)',
                      color: '#2d8fa0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '9px',
                      fontWeight: 900
                    }}>
                      A
                    </div>
                    <div className="user-info" style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
                      <span className="user-name" style={{ fontSize: '9.5px', fontWeight: 850, color: '#000000' }}>Admin</span>
                      <span className="user-email" style={{ fontSize: '7.5px', fontWeight: 750, color: 'rgba(10, 16, 28, 0.65)' }}>admin@gmail.com</span>
                    </div>
                  </div>
                  <LogOut size={10} style={{ color: 'rgba(10, 16, 28, 0.65)', strokeWidth: 2.5 }} />
                </div>
              </aside>

              {/* Chat Workspace Area */}
              <div className="chat-workspace" style={{
                flexGrow: 1,
                display: 'flex',
                flexDirection: 'column',
                background: 'transparent',
                height: '100%',
                boxSizing: 'border-box',
                borderRight: '1.5px solid rgba(255, 255, 255, 0.55)'
              }}>
                <header style={{
                  padding: '0 12px',
                  display: 'flex',
                  alignItems: 'center',
                  height: '38px',
                  background: 'transparent',
                  borderBottom: '1px solid rgba(10, 16, 28, 0.06)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Menu size={12} style={{ color: '#000000', strokeWidth: 2.5 }} />
                    <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
                      <span style={{ fontSize: '10.5px', fontWeight: 850, color: '#000000' }}>
                        Workspace <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontWeight: 500 }}>Mode</span>
                      </span>
                      <span style={{ fontSize: '8px', fontWeight: 750, color: 'rgba(10, 16, 28, 0.65)' }}>Searching personal documents</span>
                    </div>
                  </div>
                </header>

                {/* Conversation Stream */}
                <div className="conversation-scroll" style={{ flexGrow: 1, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
                  
                  {/* User Query */}
                  <div className="message-wrapper user" style={{ alignSelf: 'flex-end', maxWidth: '80%' }}>
                    <div className="message-bubble" style={{
                      background: '#ffffff',
                      border: '1px solid rgba(10, 16, 28, 0.12)',
                      padding: '6px 10px',
                      borderRadius: '8px',
                      borderBottomRightRadius: '2px',
                      fontSize: '10px',
                      fontWeight: 750,
                      color: '#000000',
                      lineHeight: '1.35',
                      boxShadow: '0 2px 6px rgba(10, 16, 28, 0.04)'
                    }}>
                      How does general relativity describe gravity?
                    </div>
                  </div>

                  {/* AI Response Card */}
                  <div className="message-wrapper assistant" style={{ alignSelf: 'flex-start', maxWidth: '90%' }}>
                    <span className="message-sender" style={{ fontSize: '8px', fontWeight: 900, color: '#2d8fa0', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '2px' }}>Docsy Engine</span>
                    <div className="message-bubble" style={{
                      background: 'rgba(255, 255, 255, 0.5)',
                      border: '1px solid rgba(100, 210, 225, 0.35)',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      borderBottomLeftRadius: '2px',
                      fontSize: '10px',
                      fontWeight: 750,
                      color: '#0a101c',
                      lineHeight: '1.4',
                      boxShadow: '0 2px 8px rgba(10, 16, 28, 0.01)'
                    }}>
                      Based on <strong style={{ color: '#000000', fontWeight: 850 }}>relativity.pdf</strong>, Einstein's equations describe gravity as a geometric property of space and time. 
                      <span style={{
                        display: 'block',
                        margin: '6px 0',
                        borderLeft: '2px solid #2d8fa0',
                        paddingLeft: '8px',
                        fontStyle: 'italic',
                        fontWeight: 750,
                        color: '#000000'
                      }}>
                        "Mass and energy curve spacetime, which dictates the paths that objects follow."
                      </span>
                      This means matter tells spacetime how to curve, and spacetime tells matter how to move.
                      
                      {/* Floating citations badge */}
                      <div style={{ display: 'flex', gap: '6px', marginTop: '6px', borderTop: '1px solid rgba(10, 16, 28, 0.08)', paddingTop: '4px' }}>
                        <span style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                          fontSize: '8px',
                          fontWeight: 850,
                          color: '#2d8fa0',
                          background: 'rgba(100, 210, 225, 0.15)',
                          border: '1px solid rgba(100, 210, 225, 0.35)',
                          padding: '2px 4px',
                          borderRadius: '4px',
                          cursor: 'default'
                        }}>
                          <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: '#2d8fa0' }} />
                          relativity.pdf: L144-152
                        </span>
                        <span style={{
                          fontSize: '8px',
                          fontWeight: 800,
                          color: 'rgba(10, 16, 28, 0.75)',
                          background: 'rgba(255, 255, 255, 0.65)',
                          border: '1px solid rgba(10, 16, 28, 0.1)',
                          padding: '2px 4px',
                          borderRadius: '4px'
                        }}>
                          98.4% Confidence
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Processing Status Activity */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 6px',
                    borderRadius: '5px',
                    background: 'rgba(255, 255, 255, 0.35)',
                    border: '1px solid rgba(10, 16, 28, 0.06)',
                    width: 'fit-content',
                    marginLeft: '2px'
                  }}>
                    <Cpu size={10} className="animate-pulse" style={{ color: '#2d8fa0', strokeWidth: 2.5 }} />
                    <span style={{ fontSize: '8.5px', fontWeight: 800, color: 'rgba(10, 16, 28, 0.65)' }}>
                      Synthesizing cross-document memory...
                    </span>
                  </div>

                </div>

                {/* Attached Files Chips Row */}
                <div className="attached-files-row" style={{ display: 'flex', gap: '4px', padding: '2px 12px 0 12px', flexWrap: 'wrap' }}>
                  <div className="attached-file-chip" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                    background: 'rgba(255, 255, 255, 0.55)',
                    border: '1px solid rgba(45, 143, 160, 0.45)',
                    borderRadius: '6px',
                    padding: '2px 5px',
                    fontSize: '8px',
                    fontWeight: 800
                  }}>
                    <FileText size={9} style={{ color: '#2d8fa0', strokeWidth: 2.5 }} />
                    <span className="chip-name" style={{ color: '#000000', fontWeight: 800 }}>relativity.pdf</span>
                    <span style={{ fontSize: '7px', color: '#2d8fa0', background: 'rgba(100, 210, 225, 0.15)', padding: '0 2px', borderRadius: '2px', fontWeight: '900', marginLeft: '1px' }}>ACTIVE</span>
                  </div>

                  <div className="attached-file-chip" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                    background: 'rgba(255, 255, 255, 0.25)',
                    border: '1px solid rgba(255, 255, 255, 0.5)',
                    borderRadius: '6px',
                    padding: '2px 5px',
                    fontSize: '8px',
                    fontWeight: 750
                  }}>
                    <FileText size={9} style={{ opacity: 0.65, color: '#000000', strokeWidth: 2.5 }} />
                    <span className="chip-name" style={{ color: 'rgba(10, 16, 28, 0.75)', fontWeight: 800 }}>quantum_mech...</span>
                    <span className="status-pulse-sync" style={{ fontSize: '7px', color: '#d97706', display: 'flex', alignItems: 'center', gap: '1.5px', fontWeight: '900', marginLeft: '1px' }}>
                      <span style={{ width: '2.5px', height: '2.5px', borderRadius: '50%', background: '#d97706', display: 'inline-block' }} />
                      SYNCING
                    </span>
                  </div>
                </div>

                {/* Bottom Input Area */}
                <div style={{ padding: '8px 12px', borderTop: '1px solid rgba(10, 16, 28, 0.06)' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'rgba(255, 255, 255, 0.45)',
                    border: '1px solid rgba(255, 255, 255, 0.65)',
                    borderRadius: '6px',
                    padding: '4px 10px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexGrow: 1 }}>
                      <div style={{
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        background: 'rgba(100, 210, 225, 0.15)',
                        border: '1px solid rgba(100, 210, 225, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#2d8fa0'
                      }}>
                        <Plus size={8} style={{ strokeWidth: 3 }} />
                      </div>
                      <div style={{ fontSize: '9.5px', color: 'rgba(10, 16, 28, 0.7)', fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', fontWeight: 750 }}>
                        <span>Ask a question about your files...</span>
                        <span className="blinking-cursor" style={{ marginLeft: '2px', display: 'inline-block', width: '1.5px', height: '9px', background: '#2d8fa0' }} />
                      </div>
                    </div>
                    <Send size={10} style={{ color: '#2d8fa0', opacity: 0.9, strokeWidth: 2.5 }} />
                  </div>
                </div>
              </div>

              {/* PDF Preview panel (Right) */}
              <div className="preview-panel" style={{
                width: '240px',
                minWidth: '240px',
                background: 'rgba(255, 255, 255, 0.32)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderLeft: '1.5px solid rgba(255, 255, 255, 0.55)',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                boxSizing: 'border-box'
              }}>
                <header className="preview-header" style={{ padding: '0 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(10, 16, 28, 0.06)', height: '38px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <FileText size={10} style={{ color: '#d97706', strokeWidth: 2.5 }} />
                    <span style={{ fontSize: '9.5px', fontWeight: 850, color: '#000000' }}>relativity.pdf</span>
                  </div>
                  <span style={{
                    fontSize: '8px',
                    color: 'rgba(10, 16, 28, 0.75)',
                    fontWeight: 800,
                    background: 'rgba(255, 255, 255, 0.55)',
                    border: '1px solid rgba(10, 16, 28, 0.1)',
                    padding: '2px 4px',
                    borderRadius: '3px'
                  }}>Page 14</span>
                </header>

                <div className="preview-content" style={{ flexGrow: 1, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto', boxSizing: 'border-box' }}>
                  <div className="pdf-mock" style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    
                    {/* Simulated Text Lines */}
                    <div style={{ width: '100%', height: '3px', background: 'rgba(10, 16, 28, 0.12)', borderRadius: '1px' }} />
                    <div style={{ width: '92%', height: '3px', background: 'rgba(10, 16, 28, 0.12)', borderRadius: '1px' }} />
                    
                    {/* Highlighted Cited Paragraph */}
                    <div className="pdf-citation-highlight-container" style={{ position: 'relative', margin: '4px 0', padding: '4px 6px', background: 'rgba(45, 143, 160, 0.08)', borderLeft: '2px solid #2d8fa0', borderRadius: '2px' }}>
                      <div className="scanning-laser-line" style={{ background: 'linear-gradient(90deg, transparent, rgba(45, 143, 160, 0.8), transparent)', boxShadow: '0 0 4px rgba(45, 143, 160, 0.5)' }} />
                      <p style={{ margin: 0, fontSize: '8.5px', color: '#0a101c', fontWeight: 750, lineHeight: '1.3' }}>
                        ...Einstein's field equations formulate gravity geometrically. <mark style={{ background: 'transparent', color: '#097a8e', padding: '0', fontWeight: 850 }}>Mass and energy curve spacetime, and this geometric curvature dictates the paths</mark> that free-falling objects follow.
                      </p>
                      <div style={{ marginTop: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '7.5px', color: '#2d8fa0', fontWeight: 850 }}>COORDS: [x=144, y=320]</span>
                        <span style={{ fontSize: '7.5px', fontWeight: 750, color: 'rgba(10, 16, 28, 0.5)' }}>Lines 144-152</span>
                      </div>
                    </div>

                    <div style={{ width: '94%', height: '3px', background: 'rgba(10, 16, 28, 0.12)', borderRadius: '1px' }} />
                    <div style={{ width: '88%', height: '3px', background: 'rgba(10, 16, 28, 0.12)', borderRadius: '1px' }} />
                    <div style={{ width: '92%', height: '3px', background: 'rgba(10, 16, 28, 0.12)', borderRadius: '1px', marginBottom: '4px' }} />

                    {/* Floating PDF metadata overlay card */}
                    <div style={{
                      padding: '6px 8px',
                      background: 'rgba(255, 255, 255, 0.65)',
                      border: '1px solid rgba(10, 16, 28, 0.1)',
                      borderRadius: '6px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                      boxShadow: '0 2px 8px rgba(10, 16, 28, 0.02)'
                    }}>
                      <span style={{ fontSize: '7.5px', color: 'rgba(10, 16, 28, 0.5)', fontWeight: 850, textTransform: 'uppercase', letterSpacing: '0.01em' }}>INDEX METADATA</span>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', color: 'rgba(10, 16, 28, 0.7)', fontWeight: 750 }}>
                        <span>Vector Space:</span>
                        <span style={{ color: '#2d8fa0', fontWeight: 850 }}>1536-dim</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', color: 'rgba(10, 16, 28, 0.7)', fontWeight: 750 }}>
                        <span>Chunk ID:</span>
                        <span style={{ color: '#d97706', fontWeight: 850 }}>chunk_14a_77</span>
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
