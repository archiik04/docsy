import React, { useEffect, useState } from 'react';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { Sidebar } from '../../components/sidebar/Sidebar';
import { ChatWorkspace } from '../../components/chat/ChatWorkspace';
import { AmbientBackground } from '../../components/ui/AmbientBackground';

export function WorkspacePage() {
  const { fetchDocuments } = useWorkspaceStore();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Fetch documents for the user on mount
  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  return (
    <div className="dashboard-container-premium">
      <AmbientBackground />
      <Sidebar 
        isCollapsed={isSidebarCollapsed} 
        setIsCollapsed={setIsSidebarCollapsed} 
      />
      
      <ChatWorkspace />
    </div>
  );
}

