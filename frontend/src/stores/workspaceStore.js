import { create } from 'zustand';
import { api } from '../lib/api';

const saveDemoDocs = (docs) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('docsy-demo-documents', JSON.stringify(docs));
  }
};

const saveDemoConvs = (convs) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('docsy-demo-conversations', JSON.stringify(convs));
  }
};

const getUploadedFileText = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    if (file.name.endsWith('.txt') || file.name.endsWith('.md') || file.name.endsWith('.js') || file.name.endsWith('.css') || file.name.endsWith('.html') || file.name.endsWith('.json')) {
      reader.onload = (e) => {
        resolve(e.target.result || '');
      };
      reader.readAsText(file);
    } else {
      resolve(`Docsy Demo PDF: ${file.name}\n\nThis is a client-side simulated index for your PDF file "${file.name}".\n\nIn the production version of Docsy, the PDF is processed on our Python server using Tesseract OCR (for scanned pages) or pdfplumber (for digital text). The document is then split into semantic chunks, vectorized using OpenAI embeddings, and stored in a PostgreSQL database with pgvector.\n\nSince this is the client-side demo, we have generated this mock index. You can try uploading a plain text (.txt) file to test custom keyword-matching and RAG citations using your own text content!`);
    }
  });
};

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
  uploadStatus: '',
  uploadScope: null,
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

  switchMode: (mode) => {
    get().stopPollingDocuments();
    const conversations = get().conversations || [];
    const modeConversations = conversations.filter(
      (conversation) => conversation.mode === mode || (!conversation.mode && mode === 'workspace')
    );

    if (modeConversations.length > 0) {
      set({
        activeConversationId: modeConversations[0].id,
        chatInput: '',
        selectedDocumentIds: [],
        activeDocumentId: null,
        highlightedCitation: null,
        showPreview: false,
      });
      return;
    }

    set({
      activeConversationId: null,
      chatInput: '',
      selectedDocumentIds: [],
      activeDocumentId: null,
      highlightedCitation: null,
      showPreview: false,
    });
  },

  resetStore: () => {
    get().stopPollingDocuments();
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
      uploadStatus: '',
      uploadScope: null,
      highlightedCitation: null,
      showPreview: false,
      error: null,
    });
  },

  pollTimer: null,

  startPollingDocuments: (scope = 'PERSONAL') => {
    if (get().pollTimer) return;
    const timer = setInterval(async () => {
      try {
        const docs = await api.get(`/api/v1/documents?scope=${scope}`);
        const mappedDocs = docs.map(doc => ({
          id: doc.id,
          name: doc.original_filename,
          filename: doc.filename,
          size: doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} KB` : 'Unknown',
          uploadedAt: doc.created_at ? new Date(doc.created_at).toLocaleDateString() : 'Just now',
          extracted_text: doc.extracted_text || '',
          processing_status: doc.processing_status || 'completed',
          previewText: {
            heading: doc.original_filename.toUpperCase(),
            subheading: scope === 'KNOWLEDGE_BASE' ? 'Shared Archive Document' : 'Ingested PDF Manuscript',
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
                    content: doc.processing_status === 'processing'
                      ? 'Document is currently being processed by Tesseract OCR and indexed. Please wait...'
                      : doc.processing_status === 'failed'
                        ? 'Error: OCR processing failed for this document.'
                        : 'No text extracted or document is empty.',
                  }
                ]
          }
        }));

        set({ documents: mappedDocs });

        const hasProcessing = mappedDocs.some(d => d.processing_status === 'processing');
        if (!hasProcessing) {
          get().stopPollingDocuments();
        }
      } catch (err) {
        console.error('Error polling documents:', err);
      }
    }, 3000);
    set({ pollTimer: timer });
  },

  stopPollingDocuments: () => {
    if (get().pollTimer) {
      clearInterval(get().pollTimer);
      set({ pollTimer: null });
    }
  },

  fetchDocuments: async (scope = 'PERSONAL') => {
    if (get().isDemo) {
      return;
    }
    set({ error: null });
    try {
      const docs = await api.get(`/api/v1/documents?scope=${scope}`);
      
      // Map properties to match frontend expectation
      const mappedDocs = docs.map(doc => ({
        id: doc.id,
        name: doc.original_filename,
        filename: doc.filename, // Unique backend filename for citation mapping
        size: doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} KB` : 'Unknown',
        uploadedAt: doc.created_at ? new Date(doc.created_at).toLocaleDateString() : 'Just now',
        extracted_text: doc.extracted_text || '',
        processing_status: doc.processing_status || 'completed',
        previewText: {
          heading: doc.original_filename.toUpperCase(),
          subheading: scope === 'KNOWLEDGE_BASE' ? 'Shared Archive Document' : 'Ingested PDF Manuscript',
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
                  content: doc.processing_status === 'processing'
                    ? 'Document is currently being processed by Tesseract OCR and indexed. Please wait...'
                    : doc.processing_status === 'failed'
                      ? 'Error: OCR processing failed for this document.'
                      : 'No text extracted or document is empty.',
                }
              ]
        }
      }));

      set({ documents: mappedDocs });

      // If any document is still processing, start polling
      const hasProcessing = mappedDocs.some(d => d.processing_status === 'processing');
      if (hasProcessing) {
        get().startPollingDocuments(scope);
      } else {
        get().stopPollingDocuments();
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
    const doc = state.documents.find((d) => d.id === docId);
    if (!doc) return;
    set({ activeDocumentId: docId, highlightedCitation: null, showPreview: true });
  },

  selectConversation: (convId) => set({ activeConversationId: convId, highlightedCitation: null }),

  newConversation: (mode = 'workspace') => {
    const newConv = {
      id: `conv-${Date.now()}`,
      title: 'New Chat',
      messages: [],
      mode: mode,
    };

    set((state) => {
      const nextConvs = [newConv, ...state.conversations];
      if (state.isDemo) {
        saveDemoConvs(nextConvs);
      }
      return {
        conversations: nextConvs,
        activeConversationId: newConv.id,
        chatInput: '',
        highlightedCitation: null,
        selectedDocumentIds: [],
      };
    });
  },

  deleteConversation: (convId) => {
    set((state) => {
      const deletedConv = state.conversations.find(c => c.id === convId);
      const deletedConvMode = deletedConv?.mode || 'workspace';

      const nextConvs = state.conversations.filter(c => c.id !== convId);
      let nextActiveId = state.activeConversationId;

      if (state.activeConversationId === convId) {
        const remainingSameModeConvs = nextConvs.filter(
          c => (c.mode === deletedConvMode || (!c.mode && deletedConvMode === 'workspace'))
        );
        nextActiveId = remainingSameModeConvs.length > 0 ? remainingSameModeConvs[0].id : null;
      }

      if (state.isDemo) {
        saveDemoConvs(nextConvs);
      }

      return {
        conversations: nextConvs,
        activeConversationId: nextActiveId,
        highlightedCitation: null,
      };
    });
  },

  deleteDocument: async (docId) => {
    if (get().isDemo) {
      set((state) => {
        const nextDocs = state.documents.filter(d => d.id !== docId);
        const nextSelected = state.selectedDocumentIds.filter(id => id !== docId);
        
        let nextActiveId = state.activeDocumentId;
        if (state.activeDocumentId === docId) {
          nextActiveId = nextDocs.length > 0 ? nextDocs[0].id : null;
        }

        saveDemoDocs(nextDocs);

        return {
          documents: nextDocs,
          selectedDocumentIds: nextSelected,
          activeDocumentId: nextActiveId,
          highlightedCitation: null,
        };
      });
      return;
    }
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

  uploadDocuments: async (files, scope = 'PERSONAL') => {
    if (!files || files.length === 0) return;
    const normalizedScope = scope === 'KNOWLEDGE_BASE' ? 'KNOWLEDGE_BASE' : 'PERSONAL';

    if (get().isDemo) {
      set({ 
        isUploading: true, 
        uploadProgress: 0, 
        uploadStatus: 'Preparing files for upload...', 
        uploadScope: normalizedScope, 
        error: null 
      });
      
      // Simulate progress
      for (let p = 10; p <= 100; p += 20) {
        await new Promise(r => setTimeout(r, 200));
        set({ 
          uploadProgress: p,
          uploadStatus: p === 100 ? 'Running OCR & Indexing...' : `Uploading ${files[0].name}: ${p}%`
        });
      }
      await new Promise(r => setTimeout(r, 500));
      
      const file = files[0];
      const fileText = await getUploadedFileText(file);
      
      const newDocId = `doc-${Date.now()}`;
      const newDoc = {
        id: newDocId,
        name: file.name,
        filename: file.name,
        size: file.size ? `${(file.size / 1024).toFixed(1)} KB` : 'Unknown',
        uploadedAt: new Date().toLocaleDateString(),
        processing_status: 'completed',
        extracted_text: fileText,
        previewText: {
          heading: file.name.toUpperCase(),
          subheading: 'Demo Uploaded Document',
          sections: [
            {
              title: 'DEMO DOCUMENT CONTENT PREVIEW',
              content: fileText.slice(0, 1500) + (fileText.length > 1500 ? '...' : '')
            }
          ]
        }
      };
      
      set((state) => {
        const nextDocs = [...state.documents, newDoc];
        saveDemoDocs(nextDocs);
        return {
          documents: nextDocs,
          selectedDocumentIds: [...state.selectedDocumentIds, newDocId],
          activeDocumentId: newDocId,
          isUploading: false,
          uploadProgress: 0,
          uploadStatus: ''
        };
      });
      return;
    }
    
    set({ 
      isUploading: true, 
      uploadProgress: 0, 
      uploadStatus: 'Preparing files for upload...', 
      uploadScope: normalizedScope, 
      error: null 
    });
    
    const totalFiles = files.length;
    const uploadedDocIds = [];
    const failedUploads = [];

    const fileList = Array.from(files);
    for (let i = 0; i < totalFiles; i++) {
      const file = fileList[i];
      const baseProgress = (i / totalFiles) * 100;
      
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('scope', normalizedScope);

        // Update status for starting upload
        set({ 
          uploadStatus: `Uploading ${file.name} (${i + 1}/${totalFiles}): 0%`,
          uploadProgress: Math.round(baseProgress)
        });

        const result = await api.upload('/api/v1/documents/upload', formData, (percent) => {
          const fileContribution = (percent * 0.7) / totalFiles;
          const currentTotalProgress = baseProgress + fileContribution;
          
          set({ 
            uploadProgress: Math.round(currentTotalProgress),
            uploadStatus: `Uploading ${file.name} (${i + 1}/${totalFiles}): ${percent}%`
          });
          
          if (percent === 100) {
            set({ 
              uploadStatus: `Running OCR & Indexing ${file.name} (${i + 1}/${totalFiles})...`
            });
          }
        });

        if (result.document_id) {
          uploadedDocIds.push(result.document_id);
        }
      } catch (err) {
        console.error(`Upload failed for ${file.name}:`, err);
        failedUploads.push(`${file.name}: ${err.message}`);
      } finally {
        const nextProgress = ((i + 1) / totalFiles) * 100;
        set({ uploadProgress: Math.round(nextProgress) });
      }
    }

    try {
      // Refresh document registry
      await get().fetchDocuments(normalizedScope);

      if (uploadedDocIds.length > 0 && normalizedScope === 'PERSONAL') {
        // Auto-select the newly uploaded documents (append to current selection)
        set((state) => {
          const currentSelected = state.selectedDocumentIds || [];
          const nextSelected = Array.from(new Set([...currentSelected, ...uploadedDocIds]));
          return {
            selectedDocumentIds: nextSelected,
            activeDocumentId: uploadedDocIds[uploadedDocIds.length - 1], // Open preview of last uploaded doc
          };
        });
      } else if (normalizedScope === 'KNOWLEDGE_BASE') {
        set({
          selectedDocumentIds: [],
          activeDocumentId: null,
        });
      }

      if (failedUploads.length > 0) {
        set({
          error: `Upload failed: ${failedUploads.join(', ')}`,
        });
      } else {
        set({ uploadStatus: 'All files uploaded & indexed successfully!' });
      }
    } catch (err) {
      console.error('Failed updating workspace after upload:', err);
      set({ error: `Failed updating workspace after upload: ${err.message}` });
    } finally {
      setTimeout(() => {
        set({ isUploading: false, uploadProgress: 0, uploadScope: null, uploadStatus: '' });
      }, 1000);
    }
  },

  sendMessage: async (text, mode = 'workspace') => {
    const input = text || get().chatInput;
    if (!input.trim()) return;
    const normalizedMode = mode === 'knowledge_base' || mode === 'KNOWLEDGE_BASE'
      ? 'KNOWLEDGE_BASE'
      : 'WORKSPACE';
    const conversationMode = normalizedMode === 'KNOWLEDGE_BASE'
      ? 'knowledge_base'
      : 'workspace';

    let activeConvId = get().activeConversationId;
    const currentConv = get().conversations.find((c) => c.id === activeConvId);
    
    // Auto-create conversation if none active for this mode
    if (!activeConvId || (currentConv && currentConv.mode !== conversationMode)) {
      activeConvId = `conv-${Date.now()}`;
      const newConv = {
        id: activeConvId,
        title: 'New Chat',
        messages: [],
        mode: conversationMode,
      };
      set((state) => ({
        conversations: [newConv, ...state.conversations],
        activeConversationId: activeConvId,
      }));
    }

    const selectedDocumentIds = normalizedMode === 'WORKSPACE'
      ? get().selectedDocumentIds
      : [];

    // Construct previous conversation history for context-awareness (excluding the current user question)
    const conversationsList = get().conversations || [];
    const targetConv = conversationsList.find((c) => c.id === activeConvId);
    const prevMessages = targetConv ? targetConv.messages : [];
    const history = prevMessages
      .map((m) => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text,
      }))
      .slice(-6);

    const userMessage = {
      id: `msg-${Date.now()}-user`,
      sender: 'user',
      text: input,
    };

    // Append user message
    set((state) => {
      const updatedConvs = state.conversations.map((c) => {
        if (c.id === activeConvId) {
          return { ...c, messages: [...c.messages, userMessage] };
        }
        return c;
      });

      return {
        conversations: updatedConvs,
        chatInput: '',
        isTyping: true,
      };
    });

    if (get().isDemo) {
      // Simulate typing delay
      await new Promise(r => setTimeout(r, 1000));
      
      const query = input.toLowerCase();
      const selectedDocs = get().documents.filter(d => get().selectedDocumentIds.includes(d.id));
      
      let answer = '';
      let citations = [];
      let title = 'Demo Thread';
      
      if (selectedDocs.length === 0) {
        answer = "I'm Docsy.\n\nYou don't have any documents selected. Please upload a file (e.g., a `.txt` file) or select one from the sidebar to ask questions about its content!";
        title = 'Select a Document';
      } else {
        // Collect all paragraph chunks from selected documents
        const chunks = [];
        selectedDocs.forEach(doc => {
          const docChunks = doc.extracted_text.split(/\n\n+/);
          docChunks.forEach((text, chunkIdx) => {
            if (text.trim().length > 10) {
              chunks.push({
                text: text.trim(),
                filename: doc.name,
                docId: doc.id,
                chunkIdx
              });
            }
          });
        });
        
        // Find best match by keyword overlap
        const words = query.split(/\W+/).filter(w => w.length > 2);
        let bestChunk = null;
        let maxScore = 0;
        
        chunks.forEach(chunk => {
          let score = 0;
          const chunkTextLower = chunk.text.toLowerCase();
          words.forEach(word => {
            if (chunkTextLower.includes(word)) {
              score += 1;
            }
          });
          if (score > maxScore) {
            maxScore = score;
            bestChunk = chunk;
          }
        });
        
        if (maxScore > 0) {
          answer = `Based on your selected document **${bestChunk.filename}**:\n\n${bestChunk.text}`;
          citations = [
            {
              filename: bestChunk.filename,
              page_number: 1,
              section_title: 'Document Segment',
              chunk_text: bestChunk.text,
              distance: 0.05
            }
          ];
          
          // Generate a title based on matching keywords or chunk snippet
          const snippet = bestChunk.text.split(/[.!?]/)[0];
          title = snippet.length > 25 ? snippet.slice(0, 25) + '...' : snippet;
        } else {
          // Extract a few unique keywords from the document to help guide the user
          const docWords = selectedDocs[0].extracted_text
            .toLowerCase()
            .split(/\W+/)
            .filter(w => w.length > 4 && !['about', 'their', 'there', 'which', 'document', 'content'].includes(w))
            .slice(0, 5);
          
          const uniqueDocWords = Array.from(new Set(docWords));
          const suggestions = uniqueDocWords.length > 0
            ? ` Try asking about terms like **${uniqueDocWords.join(', ')}**!`
            : '';
            
          answer = `I scanned your selected document **${selectedDocs[0].name}** but couldn't find a strong match for "${input}".${suggestions}`;
          title = 'No direct match';
        }
      }
      
      const botMessage = {
        id: `msg-${Date.now()}-assistant`,
        sender: 'assistant',
        text: answer,
        citations: citations,
      };

      set((state) => {
        const updatedConvs = state.conversations.map((c) => {
          if (c.id === activeConvId) {
            const nextTitle = (c.title === 'New Chat' || c.messages.length <= 2) ? title : c.title;
            return { ...c, title: nextTitle, messages: [...c.messages, botMessage] };
          }
          return c;
        });

        saveDemoConvs(updatedConvs);

        return {
          conversations: updatedConvs,
          isTyping: false,
        };
      });
      return;
    }

    try {
      const response = await api.post('/api/v1/chat/ask', {
        question: input,
        mode: normalizedMode,
        document_ids: selectedDocumentIds,
        history: history,
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
            const nextTitle = (response.title && (c.title === 'New Chat' || c.messages.length <= 2)) ? response.title : c.title;
            return { ...c, title: nextTitle, messages: [...c.messages, botMessage] };
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
