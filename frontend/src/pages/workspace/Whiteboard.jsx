// frontend/src/pages/workspace/Whiteboard.jsx
import { useState, useRef, useEffect, useCallback } from 'react';
import { Excalidraw, exportToBlob, serializeAsJSON } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';
import { Save, Download, Trash2, Loader2 } from 'lucide-react';
import api from '../../api';

export default function Whiteboard({ documentId }) {
  const excalidrawAPI = useRef(null);
  const autosaveTimer = useRef(null);

  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialData, setInitialData] = useState(null);

  // Load canvas on mount
  useEffect(() => {
    setLoading(true);
    api.get(`/api/v1/documents/${documentId}/whiteboard`)
      .then(res => {
        const canvas = res.canvas_data || (res.data ? res.data.canvas_data : null);
        if (canvas) {
          setInitialData({
            elements: canvas.elements || [],
            appState: {
              ...(canvas.appState || {}),
              viewBackgroundColor: '#f8f7f4',
              collaborators: [] // REQUIRED: strip live collab state or Excalidraw throws
            },
            files: canvas.files || {}
          });
        } else {
          setInitialData({
            elements: [],
            appState: { viewBackgroundColor: '#f8f7f4' }
          });
        }
      })
      .catch((err) => {
        console.error('Failed to load whiteboard:', err);
        setInitialData({
          elements: [],
          appState: { viewBackgroundColor: '#f8f7f4' }
        });
      })
      .finally(() => setLoading(false));

    return () => {
      if (autosaveTimer.current) {
        clearTimeout(autosaveTimer.current);
      }
    };
  }, [documentId]);

  // Save canvas
  const saveCanvas = useCallback(async () => {
    if (!excalidrawAPI.current) return;
    setSaving(true);
    try {
      const elements = excalidrawAPI.current.getSceneElements();
      const appState = excalidrawAPI.current.getAppState();
      const files = excalidrawAPI.current.getFiles();
      const serialized = serializeAsJSON(elements, appState, files, 'local');

      await api.post(`/api/v1/documents/${documentId}/whiteboard`, {
        canvas_data: JSON.parse(serialized)
      });

      setLastSaved(new Date());
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  }, [documentId]);

  // Handle changes and debounce autosave
  const handleChange = useCallback(() => {
    if (autosaveTimer.current) {
      clearTimeout(autosaveTimer.current);
    }
    autosaveTimer.current = setTimeout(() => {
      saveCanvas();
    }, 30000); // 30 seconds debounce
  }, [saveCanvas]);

  // Export PNG
  const exportPNG = useCallback(async () => {
    if (!excalidrawAPI.current) return;
    try {
      const blob = await exportToBlob({
        elements: excalidrawAPI.current.getSceneElements(),
        appState: excalidrawAPI.current.getAppState(),
        files: excalidrawAPI.current.getFiles(),
        mimeType: 'image/png',
        quality: 1
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `whiteboard-${documentId}.png`;
      a.click();
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);
    } catch (err) {
      console.error('Export failed:', err);
    }
  }, [documentId]);

  // Clear Canvas
  const clearCanvas = useCallback(() => {
    if (!excalidrawAPI.current) return;
    if (window.confirm('Clear the entire whiteboard?')) {
      excalidrawAPI.current.updateScene({ elements: [] });
    }
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, color: '#0a101c' }}>
        <Loader2 size={24} className="animate-spin" style={{ color: '#2d8fa0' }} />
        <span style={{ fontSize: 14, fontWeight: 500 }}>Loading whiteboard…</span>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#f8f7f4' }}>
      
      {/* Top Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 16px',
        borderBottom: '1px solid rgba(10, 16, 28, 0.08)',
        background: '#ffffff',
        zIndex: 5
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={saveCanvas}
            disabled={saving}
            className="pill-button"
            style={{
              padding: '6px 12px',
              fontSize: '11px',
              fontWeight: 650,
              height: '28px',
              border: '1px solid rgba(10, 16, 28, 0.15)',
              opacity: saving ? 0.7 : 1,
              cursor: saving ? 'not-allowed' : 'pointer'
            }}
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
            <span>{saving ? 'Saving…' : 'Save'}</span>
          </button>

          <button
            onClick={exportPNG}
            className="pill-button"
            style={{
              padding: '6px 12px',
              fontSize: '11px',
              fontWeight: 650,
              height: '28px',
              border: '1px solid rgba(10, 16, 28, 0.15)',
            }}
          >
            <Download size={12} />
            <span>Export PNG</span>
          </button>


          <button
            onClick={clearCanvas}
            className="pill-button"
            style={{
              padding: '6px 12px',
              fontSize: '11px',
              fontWeight: 650,
              height: '28px',
              border: '1px solid rgba(220, 38, 38, 0.3)',
              color: '#DC2626',
              background: 'rgba(254, 242, 242, 0.4)'
            }}
          >
            <Trash2 size={12} />
            <span>Clear</span>
          </button>
        </div>

        {lastSaved && (
          <span style={{ fontSize: '11px', color: 'rgba(10, 16, 28, 0.45)', fontWeight: 500 }}>
            Saved {lastSaved.toLocaleTimeString()}
          </span>
        )}
      </div>


      {/* Canvas Area */}
      <div style={{ flex: 1, position: 'relative' }}>
        <Excalidraw
          excalidrawAPI={(api) => {
            excalidrawAPI.current = api;
          }}
          initialData={initialData}
          onChange={handleChange}
          UIOptions={{
            canvasActions: {
              saveToActiveFile: false,
              export: false
            }
          }}
        />
      </div>
    </div>
  );
}
