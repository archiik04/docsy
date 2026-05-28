import React, { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { Sidebar } from '../../components/sidebar/Sidebar';
import { ChatWorkspace } from '../../components/chat/ChatWorkspace';
import { DocumentPreviewPanel } from '../../components/document/DocumentPreviewPanel';
import { AmbientBackground } from '../../components/ui/AmbientBackground';

export function WorkspacePage() {
  const { fetchDocuments, activeDocumentId, documents, showPreview } = useWorkspaceStore();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Fetch documents for the user on mount
  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Find the selected document object for preview
  const selectedDoc = documents.find((doc) => doc.id === activeDocumentId) || null;

  return (
    <div className="dashboard-container-premium">
      <AmbientBackground />
      <Sidebar 
        isCollapsed={isSidebarCollapsed} 
        setIsCollapsed={setIsSidebarCollapsed} 
      />
      
      <ChatWorkspace />
      
      <AnimatePresence>
        {showPreview && selectedDoc && (
          <DocumentPreviewPanel 
            document={selectedDoc} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
