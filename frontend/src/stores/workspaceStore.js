import { create } from 'zustand';
import { api } from '../lib/api';

export const useWorkspaceStore = create((set, get) => ({
  documents: [],
  activeDocumentId: null,
  conversationsByDoc: {}, // { [docId]: [ { id, title, messages: [] } ] }
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
      set({ showPreview: true });
    }
  },
  togglePreview: () => set((state) => ({ showPreview: !state.showPreview })),
  setShowPreview: (showPreview) => set({ showPreview }),

  resetStore: () => {
    set({
      documents: [],
      activeDocumentId: null,
      conversationsByDoc: {},
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
    } catch (err) {
      console.error('Failed to fetch documents:', err);
      set({ error: 'Failed to load documents' });
    }
  },

  selectDocument: (docId) => {
    const state = get();
    const doc = state.documents.find(d => d.id === docId);
    if (!doc) return;

    set({ activeDocumentId: docId, highlightedCitation: null });

    // Initialize or select conversation for this document
    const docConvs = state.conversationsByDoc[docId] || [];
    if (docConvs.length > 0) {
      set({ activeConversationId: docConvs[0].id });
    } else {
      get().newConversation(docId);
    }
  },

  selectConversation: (convId) => set({ activeConversationId: convId, highlightedCitation: null }),

  newConversation: (docId = null) => {
    const targetDocId = docId || get().activeDocumentId;
    if (!targetDocId) return;

    const doc = get().documents.find(d => d.id === targetDocId);
    const docName = doc ? doc.name : 'Manuscript';

    const newConv = {
      id: `conv-${Date.now()}`,
      title: `Discussion: ${docName}`,
      docId: targetDocId,
      messages: [],
    };

    set((state) => {
      const updatedConvs = { ...state.conversationsByDoc };
      updatedConvs[targetDocId] = [newConv, ...(updatedConvs[targetDocId] || [])];
      return {
        conversationsByDoc: updatedConvs,
        activeConversationId: newConv.id,
        chatInput: '',
        highlightedCitation: null,
      };
    });
  },

  deleteDocument: async (docId) => {
    try {
      await api.delete(`/api/v1/documents/${docId}`);
      
      set((state) => {
        const updatedConvs = { ...state.conversationsByDoc };
        delete updatedConvs[docId];

        const nextDocs = state.documents.filter(d => d.id !== docId);
        let nextActiveId = state.activeDocumentId;
        let nextActiveConvId = state.activeConversationId;

        if (state.activeDocumentId === docId) {
          if (nextDocs.length > 0) {
            nextActiveId = nextDocs[0].id;
            const docConvs = updatedConvs[nextActiveId] || [];
            nextActiveConvId = docConvs.length > 0 ? docConvs[0].id : null;
          } else {
            nextActiveId = null;
            nextActiveConvId = null;
          }
        }

        return {
          documents: nextDocs,
          activeDocumentId: nextActiveId,
          activeConversationId: nextActiveConvId,
          conversationsByDoc: updatedConvs,
          highlightedCitation: null,
        };
      });

      // If there's a new active doc without conversations, initialize one
      const activeId = get().activeDocumentId;
      if (activeId && (!get().conversationsByDoc[activeId] || get().conversationsByDoc[activeId].length === 0)) {
        get().newConversation(activeId);
      }
    } catch (err) {
      console.error('Failed to delete document:', err);
    }
  },

  uploadDocument: async (file) => {
    set({ isUploading: true, uploadProgress: 0 });

    // Progress simulation
    const interval = setInterval(() => {
      set((state) => {
        if (state.uploadProgress >= 90) {
          clearInterval(interval);
          return {};
        }
        return { uploadProgress: state.uploadProgress + 15 };
      });
    }, 100);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const result = await api.post('/api/v1/documents/upload', formData);
      clearInterval(interval);
      set({ uploadProgress: 100 });

      // Refresh doc list
      await get().fetchDocuments();

      // Select new document
      const newDocId = result.document_id;
      if (newDocId) {
        get().selectDocument(newDocId);
      }

      setTimeout(() => {
        set({ isUploading: false, uploadProgress: 0 });
      }, 500);
    } catch (err) {
      clearInterval(interval);
      set({ isUploading: false, uploadProgress: 0 });
      console.error('Upload failed:', err);
      alert('Upload failed: ' + (err.message || 'Check connection'));
    }
  },

  sendMessage: async (text) => {
    const input = text || get().chatInput;
    if (!input.trim()) return;

    const activeDocId = get().activeDocumentId;
    const activeConvId = get().activeConversationId;
    if (!activeDocId || !activeConvId) return;

    const userMessage = {
      id: `msg-${Date.now()}-user`,
      sender: 'user',
      text: input,
    };

    // Add user message to state
    set((state) => {
      const docConvs = state.conversationsByDoc[activeDocId] || [];
      const updatedConvs = docConvs.map((c) => {
        if (c.id === activeConvId) {
          return { ...c, messages: [...c.messages, userMessage] };
        }
        return c;
      });

      return {
        conversationsByDoc: {
          ...state.conversationsByDoc,
          [activeDocId]: updatedConvs,
        },
        chatInput: '',
        isTyping: true,
      };
    });

    try {
      const response = await api.post('/api/v1/chat/ask', {
        question: input,
        document_id: activeDocId,
      });

      const botMessage = {
        id: `msg-${Date.now()}-assistant`,
        sender: 'assistant',
        text: response.answer,
        citations: response.citations || [],
      };

      set((state) => {
        const docConvs = state.conversationsByDoc[activeDocId] || [];
        const updatedConvs = docConvs.map((c) => {
          if (c.id === activeConvId) {
            return { ...c, messages: [...c.messages, botMessage] };
          }
          return c;
        });

        return {
          conversationsByDoc: {
            ...state.conversationsByDoc,
            [activeDocId]: updatedConvs,
          },
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
        const docConvs = state.conversationsByDoc[activeDocId] || [];
        const updatedConvs = docConvs.map((c) => {
          if (c.id === activeConvId) {
            return { ...c, messages: [...c.messages, errorMessage] };
          }
          return c;
        });

        return {
          conversationsByDoc: {
            ...state.conversationsByDoc,
            [activeDocId]: updatedConvs,
          },
          isTyping: false,
        };
      });
    }
  },
}));
