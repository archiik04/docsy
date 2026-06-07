import { useEffect, useRef } from 'react';
import { useReactFlow } from 'reactflow';
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide
} from 'd3-force';

export function useForceLayout({ nodes, edges, strength = -300, linkDistance = 110, setNodes: parentSetNodes }) {
  const { setNodes: storeSetNodes, fitView } = useReactFlow();
  const setNodes = parentSetNodes || storeSetNodes;
  const simRef = useRef(null);
  
  // Use refs for functions to prevent effect clean-ups if their identities change during updates
  const setNodesRef = useRef(setNodes);
  const fitViewRef = useRef(fitView);

  useEffect(() => {
    setNodesRef.current = setNodes;
  }, [setNodes]);

  useEffect(() => {
    fitViewRef.current = fitView;
  }, [fitView]);

  // Compute stable unique keys based on element IDs to track graph identity
  const nodesKey = nodes.map(n => n.id).sort().join(',');
  const edgesKey = edges.map(e => e.id).sort().join(',');

  const addLog = (msg) => {
    window.mindMapDebugLogs = window.mindMapDebugLogs || [];
    window.mindMapDebugLogs.push(`${new Date().toLocaleTimeString()}: ${msg}`);
    if (window.mindMapDebugLogs.length > 20) window.mindMapDebugLogs.shift();
    console.log(msg);
  };

  useEffect(() => {
    addLog(`Hook called. nodes: ${nodes.length}, edges: ${edges.length}`);
    
    // Wait until both nodes are loaded and, if there are multiple nodes, that edges have also loaded
    if (!nodes.length) {
      addLog("Skipping: nodes array is empty");
      return;
    }
    if (nodes.length > 1 && !edges.length) {
      addLog("Skipping: waiting for edges to load");
      return;
    }

    addLog(`Starting D3 simulation. nodesKey: ${nodesKey}`);

    // Initial random spread around center (500, 300)
    const simNodes = nodes.map(n => ({
      ...n,
      x: 500 + (Math.random() - 0.5) * 200,
      y: 300 + (Math.random() - 0.5) * 200
    }));

    const simEdges = edges.map(e => ({ ...e }));

    try {
      if (simRef.current) {
        addLog("Stopping previous simulation");
        simRef.current.stop();
      }

      simRef.current = forceSimulation(simNodes)
        .force(
          'link',
          forceLink(simEdges)
            .id(d => d.id)
            .distance(linkDistance)
            .strength(0.8)
        )
        .force('charge', forceManyBody().strength(strength))
        .force('center', forceCenter(500, 300))
        .force('collide', forceCollide().radius(55))
        .on('tick', () => {
          setNodesRef.current(
            simNodes.map(n => ({
              ...n,
              position: { x: n.x, y: n.y }
            }))
          );
        })
        .on('end', () => {
          addLog("Simulation ended, fitting view");
          setTimeout(() => {
            if (fitViewRef.current) {
              fitViewRef.current({ padding: 0.25, duration: 200 });
            }
          }, 100);
        });
    } catch (err) {
      addLog(`Error during simulation setup: ${err.message}`);
      console.error("[useForceLayout] Error during simulation setup:", err);
    }

    return () => {
      if (simRef.current) {
        addLog("Clean-up: stopping simulation");
        simRef.current.stop();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodesKey, edgesKey, strength, linkDistance]);
}