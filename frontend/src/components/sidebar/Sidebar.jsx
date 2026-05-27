import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  MessageSquare, 
  Plus, 
  UploadCloud, 
  LogOut, 
  ChevronLeft, 
  ChevronRight, 
  Trash2, 
  Search, 
  Compass, 
  Bookmark, 
  Settings, 
  Loader2, 
  User,
  Square,
  CheckSquare
} from 'lucide-react';
import { Logo } from '../ui/Logo';
import { useAuthStore } from '../../stores/authStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';

export function Sidebar({ isCollapsed, setIsCollapsed }) {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const {
    documents,
    selectedDocumentIds,
    activeDocumentId,
    conversations,
    activeConversationId,
    isUploading,
    uploadProgress,
    selectDocument,
    deleteDocument,
    uploadDocuments,
    selectConversation,
    newConversation,
    toggleDocumentSelection,
    selectAllDocuments,
    clearAllSelection,
    resetStore
  } = useWorkspaceStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('workspace'); // workspace, insights, settings

  const activeConvs = conversations || [];

  // Filter documents and chats based on query
  const filteredDocs = documents.filter(doc => 
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const filteredConvs = activeConvs.filter(conv => 
    conv.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleFileUpload = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      uploadDocuments(files);
    }
  };

  const handleLogout = () => {
    logout();
    resetStore();
    navigate('/');
  };

  return (
    <motion.aside 
      className={`sidebar-premium ${isCollapsed ? 'collapsed' : ''}`}
      animate={{ width: isCollapsed ? 68 : 250 }}
      transition={{ type: 'spring', stiffness: 220, damping: 26 }}
    >
      {/* Header / Logo */}
      <div className="sidebar-header">
        {!isCollapsed ? (
          <Logo onClick={() => navigate('/')} style={{ cursor: 'pointer' }} />
        ) : (
          <div className="logo-icon-compact" onClick={() => navigate('/')}>
            D
          </div>
        )}
        <button 
          className="collapse-toggle-btn"
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Command Palette Style Search */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div 
            className="search-palette-wrapper"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="search-input-container">
              <Search size={14} className="search-icon" />
              <input 
                type="text" 
                placeholder="Search archive..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              <span className="search-shortcut">⌘K</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation Groups */}
      <div className="sidebar-menu-wrapper custom-scroll">
        <div className="sidebar-section">
          <label className="sidebar-section-title">
            {!isCollapsed ? "Navigation" : "Nav"}
          </label>
          <div className="nav-links-group">
            <button 
              className={`nav-link-item ${activeTab === 'workspace' ? 'active' : ''}`}
              onClick={() => setActiveTab('workspace')}
            >
              <Compass size={16} />
              {!isCollapsed && <span>Workspace</span>}
            </button>
            <button 
              className={`nav-link-item ${activeTab === 'insights' ? 'active' : ''}`}
              onClick={() => setActiveTab('insights')}
            >
              <Bookmark size={16} />
              {!isCollapsed && <span>Saved Insights</span>}
            </button>
            <button 
              className={`nav-link-item ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              <Settings size={16} />
              {!isCollapsed && <span>Settings</span>}
            </button>
          </div>
        </div>

        {activeTab === 'workspace' && (
          <>
            {/* Documents Section */}
            <div className="sidebar-section">
              <label className="sidebar-section-title">
                {!isCollapsed ? "Ingested Archive" : "Docs"}
              </label>

              {/* Upload area */}
              <label className={`upload-area-neumorphic ${isCollapsed ? 'compact' : ''}`}>
                <UploadCloud size={18} className="upload-icon" />
                {!isCollapsed && (
                  <div className="upload-info">
                    <span className="upload-title">Ingest PDFs</span>
                    <span className="upload-subtitle">Max 10MB each</span>
                  </div>
                )}
                <input
                  type="file"
                  multiple
                  accept=".pdf"
                  style={{ display: 'none' }}
                  onChange={handleFileUpload}
                  disabled={isUploading}
                />
              </label>

              {isUploading && (
                <div className="upload-progress-card">
                  <Loader2 size={12} className="animate-spin text-cyan" />
                  {!isCollapsed && (
                    <span className="progress-text">Indexing {uploadProgress}%</span>
                  )}
                </div>
              )}

              {/* Bulk actions toolbar */}
              {!isCollapsed && documents.length > 0 && (
                <div className="bulk-selection-toolbar" style={{ display: 'flex', gap: '8px', padding: '0 6px', marginTop: '2px', marginBottom: '4px', fontSize: '10.5px' }}>
                  <button 
                    type="button" 
                    onClick={selectAllDocuments}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#64d2e1',
                      cursor: 'pointer',
                      fontWeight: 600,
                      padding: '2px 0',
                      transition: 'opacity 0.2s',
                    }}
                    className="hover:opacity-80"
                  >
                    Select All
                  </button>
                  <span style={{ color: 'rgba(255,255,255,0.15)' }}>|</span>
                  <button 
                    type="button" 
                    onClick={clearAllSelection}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'rgba(255,255,255,0.4)',
                      cursor: 'pointer',
                      fontWeight: 600,
                      padding: '2px 0',
                      transition: 'color 0.2s',
                    }}
                    className="hover:text-white"
                  >
                    Clear All
                  </button>
                </div>
              )}

              {/* Document List */}
              <div className="doc-list-container">
                {filteredDocs.map((doc) => {
                  const isSelected = selectedDocumentIds.includes(doc.id);
                  const isActivePreview = activeDocumentId === doc.id;
                  
                  return (
                    <div
                      key={doc.id}
                      className={`doc-list-item-glow ${isActivePreview ? 'active' : ''} ${isSelected ? 'selected-query' : ''}`}
                      style={{
                        borderColor: isSelected ? 'rgba(77, 184, 200, 0.25)' : undefined,
                        background: isSelected ? 'rgba(77, 184, 200, 0.03)' : undefined,
                      }}
                      title={doc.name}
                    >
                      <div className="doc-item-left" style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%', overflow: 'hidden' }}>
                        {/* Custom Checkbox Toggle for Querying */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleDocumentSelection(doc.id);
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '2px',
                            color: isSelected ? '#64d2e1' : 'rgba(255, 255, 255, 0.25)',
                            transition: 'color 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                          title={isSelected ? "Deselect from querying" : "Select for querying"}
                        >
                          {isSelected ? (
                            <CheckSquare size={15} />
                          ) : (
                            <Square size={15} />
                          )}
                        </button>

                        {/* Interactive Area to Open Preview Panel */}
                        <div 
                          className="doc-info-clickable-area"
                          onClick={() => selectDocument(doc.id)}
                          style={{ 
                            flex: 1, 
                            display: 'flex', 
                            gap: '6px', 
                            alignItems: 'center', 
                            minWidth: 0, 
                            cursor: 'pointer',
                            height: '100%' 
                          }}
                          title="Click to preview content"
                        >
                          <div className="doc-icon-wrapper" style={{ flexShrink: 0 }}>
                            <FileText size={13} className="doc-icon" />
                          </div>
                          {!isCollapsed && (
                            <div className="doc-info" style={{ minWidth: 0, display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                              <span className="doc-name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: isSelected ? 500 : 400 }}>
                                {doc.name}
                              </span>
                              <span className="doc-size">{doc.size}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      {!isCollapsed && (
                        <button
                          className="doc-delete-btn"
                          style={{ flexShrink: 0, marginLeft: '4px' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Remove ${doc.name} from your archive?`)) {
                              deleteDocument(doc.id);
                            }
                          }}
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  );
                })}
                {filteredDocs.length === 0 && !isCollapsed && (
                  <div className="empty-section-text">No manuscripts</div>
                )}
              </div>
            </div>

            {/* Discussions Section */}
            <div className="sidebar-section">
              <div className="section-header-row">
                <label className="sidebar-section-title">
                  {!isCollapsed ? "Discussions" : "Chats"}
                </label>
                {!isCollapsed && (
                  <button 
                    className="new-chat-btn"
                    onClick={() => newConversation()}
                    title="New discussion thread"
                  >
                    <Plus size={13} />
                  </button>
                )}
              </div>

              <div className="chat-list-container">
                {filteredConvs.map((conv) => (
                  <div
                    key={conv.id}
                    className={`chat-list-item-glow ${activeConversationId === conv.id ? 'active' : ''}`}
                    onClick={() => selectConversation(conv.id)}
                    title={conv.title}
                  >
                    <div className="doc-item-left">
                      <div className="doc-icon-wrapper">
                        <MessageSquare size={12} className="chat-icon" />
                      </div>
                      {!isCollapsed && <span className="doc-name">{conv.title}</span>}
                    </div>
                  </div>
                ))}
                {filteredConvs.length === 0 && !isCollapsed && (
                  <div className="empty-section-text">No active threads</div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* User Profile Section */}
      <div className="sidebar-footer-premium">
        <div className="user-profile">
          <div className="user-avatar-glow">
            {user?.name ? user.name.charAt(0).toUpperCase() : <User size={12} />}
          </div>
          {!isCollapsed && (
            <div className="user-info">
              <span className="user-name">{user?.name || 'Researcher'}</span>
              <span className="user-email">{user?.email || 'researcher@docsy.ai'}</span>
            </div>
          )}
        </div>
        {!isCollapsed && (
          <button className="logout-btn-premium" onClick={handleLogout} title="Sign Out">
            <LogOut size={14} />
          </button>
        )}
      </div>
    </motion.aside>
  );
}
