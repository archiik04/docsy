import { create } from 'zustand';
import { api } from '../lib/api';

export const useWorkspaceStore = create((set, get) => ({
  documents: [],
  selectedDocumentIds: [], // Multiple selected PDFs for querying
  activeDocumentId: null, // Single active PDF for visual previewing
  conversations: [], // Flat list of conversations: [ { id, title, messages: [] } ]
  activeConversationId: null,
  chatInput: '',
  isTyping: false,
  isUploading: false,
  uploadProgress: 0,
  highlightedCitation: null,
  showPreview: false,
  error: null,

  setChatInput: (chatInput) => set({ chatInput }),
  
  setHighlightedCitation: (highlightedCitation) => {
    set({ highlightedCitation });
    if (highlightedCitation) {
      // Find the document corresponding to the citation's filename
      const state = get();
      const targetDoc = state.documents.find(
        (d) => d.filename === highlightedCitation.filename || d.name === highlightedCitation.filename
      );
      if (targetDoc) {
        set({ activeDocumentId: targetDoc.id, showPreview: true });
      } else {
        set({ showPreview: true });
      }
    }
  },
  
  togglePreview: () => set((state) => ({ showPreview: !state.showPreview })),
  setShowPreview: (showPreview) => set({ showPreview }),

  resetStore: () => {
    set({
      documents: [],
      selectedDocumentIds: [],
      activeDocumentId: null,
      conversations: [],
      activeConversationId: null,
      chatInput: '',
      isTyping: false,
      isUploading: false,
      uploadProgress: 0,
      highlightedCitation: null,
      showPreview: false,
      error: null,
    });
  },

  fetchDocuments: async () => {
    set({ error: null });
    try {
      const docs = await api.get('/api/v1/documents');
      
      // Map properties to match frontend expectation
      const mappedDocs = docs.map(doc => ({
        id: doc.id,
        name: doc.original_filename,
        filename: doc.filename, // Unique backend filename for citation mapping
        size: doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} KB` : 'Unknown',
        uploadedAt: doc.created_at ? new Date(doc.created_at).toLocaleDateString() : 'Just now',
        extracted_text: doc.extracted_text || '',
        previewText: {
          heading: doc.original_filename.toUpperCase(),
          subheading: 'Ingested PDF Manuscript',
          sections: doc.extracted_text
            ? [
                {
                  title: 'EXTRACTED MANUSCRIPT FRAGMENT',
                  content: doc.extracted_text.slice(0, 1500) + (doc.extracted_text.length > 1500 ? '...' : ''),
                }
              ]
            : [
                {
                  title: 'MANUSCRIPT OVERVIEW',
                  content: 'No text extracted or document is empty.',
                }
              ]
        }
      }));

      set({ documents: mappedDocs });

      // Automatically select all documents for querying on first load if nothing was selected
      set((state) => {
        if (state.selectedDocumentIds.length === 0 && mappedDocs.length > 0) {
          return { selectedDocumentIds: mappedDocs.map(d => d.id) };
        }
        return {};
      });

      // Ensure at least one conversation exists
      if (get().conversations.length === 0) {
        get().newConversation();
      }

    } catch (err) {
      console.error('Failed to fetch documents:', err);
      set({ error: 'Failed to load documents' });
    }
  },

  toggleDocumentSelection: (docId) => {
    set((state) => {
      const isSelected = state.selectedDocumentIds.includes(docId);
      const nextSelected = isSelected
        ? state.selectedDocumentIds.filter((id) => id !== docId)
        : [...state.selectedDocumentIds, docId];
      return { selectedDocumentIds: nextSelected };
    });
  },

  selectAllDocuments: () => {
    const state = get();
    set({ selectedDocumentIds: state.documents.map((d) => d.id) });
  },

  clearAllSelection: () => {
    set({ selectedDocumentIds: [] });
  },

  selectDocument: (docId) => {
    const state = get();
    const doc = state.documents.find(d => d.id === docId);
    if (!doc) return;
    set({ activeDocumentId: docId, highlightedCitation: null, showPreview: true });
  },

  selectConversation: (convId) => set({ activeConversationId: convId, highlightedCitation: null }),

  newConversation: () => {
    const nextIndex = get().conversations.length + 1;
    const newConv = {
      id: `conv-${Date.now()}`,
      title: `Discussion Thread ${nextIndex}`,
      messages: [],
    };

    set((state) => ({
      conversations: [newConv, ...state.conversations],
      activeConversationId: newConv.id,
      chatInput: '',
      highlightedCitation: null,
    }));
  },

  deleteDocument: async (docId) => {
    try {
      await api.delete(`/api/v1/documents/${docId}`);
      
      set((state) => {
        const nextDocs = state.documents.filter(d => d.id !== docId);
        const nextSelected = state.selectedDocumentIds.filter(id => id !== docId);
        
        let nextActiveId = state.activeDocumentId;
        if (state.activeDocumentId === docId) {
          nextActiveId = nextDocs.length > 0 ? nextDocs[0].id : null;
        }

        return {
          documents: nextDocs,
          selectedDocumentIds: nextSelected,
          activeDocumentId: nextActiveId,
          highlightedCitation: null,
        };
      });
    } catch (err) {
      console.error('Failed to delete document:', err);
    }
  },

  uploadDocuments: async (files) => {
    if (!files || files.length === 0) return;
    
    set({ isUploading: true, uploadProgress: 0 });
    const totalFiles = files.length;
    let completedCount = 0;

    const uploadedDocIds = [];

    for (const file of Array.from(files)) {
      // Prevent duplicate uploads if a file with same name and size is already uploaded
      const isDuplicate = get().documents.some(
        (d) => d.name === file.name && d.size === `${(file.size / 1024).toFixed(1)} KB`
      );
      if (isDuplicate) {
        console.log(`Skipping duplicate file: ${file.name}`);
        completedCount++;
        set({ uploadProgress: Math.round((completedCount / totalFiles) * 100) });
        continue;
      }

      try {
        const formData = new FormData();
        formData.append('file', file);

        const result = await api.post('/api/v1/documents/upload', formData);
        if (result.document_id) {
          uploadedDocIds.push(result.document_id);
        }
      } catch (err) {
        console.error(`Upload failed for ${file.name}:`, err);
      } finally {
        completedCount++;
        set({ uploadProgress: Math.round((completedCount / totalFiles) * 100) });
      }
    }

    try {
      // Refresh document registry
      await get().fetchDocuments();

      if (uploadedDocIds.length > 0) {
        // Auto-select the newly uploaded documents
        set((state) => {
          const nextSelected = [...new Set([...state.selectedDocumentIds, ...uploadedDocIds])];
          return {
            selectedDocumentIds: nextSelected,
            activeDocumentId: uploadedDocIds[uploadedDocIds.length - 1], // Open preview of last uploaded doc
          };
        });
      }
    } catch (err) {
      console.error('Failed updating workspace after upload:', err);
    } finally {
      setTimeout(() => {
        set({ isUploading: false, uploadProgress: 0 });
      }, 500);
    }
  },

  sendMessage: async (text) => {
    const input = text || get().chatInput;
    if (!input.trim()) return;

    let activeConvId = get().activeConversationId;
    
    // Auto-create conversation if none active
    if (!activeConvId) {
      const nextIndex = get().conversations.length + 1;
      activeConvId = `conv-${Date.now()}`;
      const newConv = {
        id: activeConvId,
        title: input.slice(0, 30) + (input.length > 30 ? '...' : ''),
        messages: [],
      };
      set((state) => ({
        conversations: [newConv, ...state.conversations],
        activeConversationId: activeConvId,
      }));
    }

    const selectedDocumentIds = get().selectedDocumentIds;

    const userMessage = {
      id: `msg-${Date.now()}-user`,
      sender: 'user',
      text: input,
    };

    // Append user message
    set((state) => {
      const updatedConvs = state.conversations.map((c) => {
        if (c.id === activeConvId) {
          const updatedTitle = c.messages.length === 0 ? (input.slice(0, 30) + (input.length > 30 ? '...' : '')) : c.title;
          return { ...c, title: updatedTitle, messages: [...c.messages, userMessage] };
        }
        return c;
      });

      return {
        conversations: updatedConvs,
        chatInput: '',
        isTyping: true,
      };
    });

    try {
      const response = await api.post('/api/v1/chat/ask', {
        question: input,
        document_ids: selectedDocumentIds,
      });

      const botMessage = {
        id: `msg-${Date.now()}-assistant`,
        sender: 'assistant',
        text: response.answer,
        citations: response.citations || [],
      };

      set((state) => {
        const updatedConvs = state.conversations.map((c) => {
          if (c.id === activeConvId) {
            return { ...c, messages: [...c.messages, botMessage] };
          }
          return c;
        });

        return {
          conversations: updatedConvs,
          isTyping: false,
        };
      });
    } catch (err) {
      console.error('Chat error:', err);
      const errorMessage = {
        id: `msg-${Date.now()}-error`,
        sender: 'assistant',
        text: 'Error connecting to RAG engine. Please check API status.',
        citations: [],
      };

      set((state) => {
        const updatedConvs = state.conversations.map((c) => {
          if (c.id === activeConvId) {
            return { ...c, messages: [...c.messages, errorMessage] };
          }
          return c;
        });

        return {
          conversations: updatedConvs,
          isTyping: false,
        };
      });
    }
  },
}));
