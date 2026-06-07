import ReactFlow, {
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useForceLayout } from '../../hooks/useForceLayout';
import MindMapNode from '../../components/mindmap/MindMapNode';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { RefreshCw, Download, Share2, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { api } from '../../lib/api';

const flattenTree = (node, parentId, nodes, edges) => {
  if (!node) return { nodes, edges };

  const id = crypto.randomUUID();
  nodes.push({
    id,
    type: node.type, // "root" | "topic" | "sub"
    data: {
      label: node.topic,
      type: node.type,
      detail: node.detail || "",
      chunkIds: node.chunk_ids || []
    },
    position: { x: 0, y: 0 }
  });

  if (parentId) {
    edges.push({
      id: `e-${parentId}-${id}`,
      source: parentId,
      target: id,
      style: {
        stroke: node.type === "sub" ? "#D3D1C7" : "#9FE1CB",
        strokeWidth: node.type === "sub" ? 1 : 1.5
      },
      markerEnd: {
        type: "arrowclosed",
        color: node.type === "sub" ? "#D3D1C7" : "#9FE1CB"
      }
    });
  }

  node.children?.forEach(child => {
    flattenTree(child, id, nodes, edges);
  });

  return { nodes, edges };
};

function Graph({ documentId }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rawTree, setRawTree] = useState(null);



  const nodeTypes = useMemo(() => ({
    root: MindMapNode,
    topic: MindMapNode,
    sub: MindMapNode
  }), []);

  useForceLayout({ nodes, edges, setNodes, strength: -350, linkDistance: 130 });

  const fetchMindMap = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post(`/api/v1/documents/${documentId}/mindmap`);
      const data = res.data || res;
      setRawTree(data);
      const { nodes: newNodes, edges: newEdges } = flattenTree(data, null, [], []);
      setNodes(newNodes);
      setEdges(newEdges);
    } catch (err) {
      console.error(err);
      setError("Failed to generate mind map. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [documentId, setNodes, setEdges]);

  const regenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      await api.delete(`/api/v1/documents/${documentId}/mindmap`);
      await fetchMindMap();
    } catch (err) {
      console.error(err);
      setError("Failed to regenerate mind map. Please try again.");
      setLoading(false);
    }
  };

  const exportJSON = () => {
    if (!rawTree) return;
    const blob = new Blob([JSON.stringify(rawTree, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "mindmap.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    fetchMindMap();
  }, [fetchMindMap]);

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          gap: '12px',
          color: '#0a101c'
        }}
      >
        <Loader2 className="animate-spin" size={24} style={{ color: '#2d8fa0' }} />
        <p style={{ fontSize: '14px', fontWeight: 500 }}>Generating mind map…</p>
      </motion.div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        gap: '16px',
        color: '#dc2626'
      }}>
        <p style={{ fontSize: '14px', fontWeight: 500 }}>{error}</p>
        <button
          onClick={fetchMindMap}
          className="pill-button"
          style={{
            padding: '8px 16px',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer'
          }}
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>

      <div 
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          zIndex: 10,
          display: 'flex',
          gap: '8px'
        }}
      >
        <button
          onClick={regenerate}
          className="pill-button"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11px',
            padding: '6px 12px',
            height: '28px'
          }}
        >
          <RefreshCw size={12} />
          <span>Regenerate</span>
        </button>

        <button
          onClick={exportJSON}
          className="pill-button"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11px',
            padding: '6px 12px',
            height: '28px'
          }}
        >
          <Download size={12} />
          <span>Export JSON</span>
        </button>

        <button
          onClick={() => alert("Coming soon")}
          className="pill-button"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11px',
            padding: '6px 12px',
            height: '28px'
          }}
        >
          <Share2 size={12} />
          <span>Share</span>
        </button>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        minZoom={0.3}
        maxZoom={2}
      >
        <Background variant="dots" gap={20} size={1} color="#E8E7E1" />
        <Controls />
        <MiniMap
          nodeColor={n => n.type === "root" ? "#534AB7" : n.type === "topic" ? "#0F6E56" : "#888780"}
          maskColor="rgba(240,239,235,0.6)"
        />
      </ReactFlow>
    </div>
  );
}

export default function MindMap({ documentId }) {
  return (
    <ReactFlowProvider>
      <Graph key={documentId} documentId={documentId} />
    </ReactFlowProvider>
  );
}
