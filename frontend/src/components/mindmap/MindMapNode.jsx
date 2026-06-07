import React, { useState } from 'react';
import { Handle, Position } from 'reactflow';

export default function MindMapNode({ data }) {
  const [isHovered, setIsHovered] = useState(false);

  // Styles for each node type
  let typeStyles = {};
  if (data.type === 'root') {
    typeStyles = {
      width: '120px',
      border: '2px solid #534AB7',
      background: '#EEEDFE',
      color: '#3C3489',
      fontSize: '13px',
      fontWeight: 500
    };
  } else if (data.type === 'topic') {
    typeStyles = {
      width: '110px',
      border: '1.5px solid #0F6E56',
      background: '#E1F5EE',
      color: '#085041',
      fontSize: '12px'
    };
  } else if (data.type === 'sub') {
    typeStyles = {
      width: '95px',
      border: '1px solid #888780',
      background: '#F1EFE8',
      color: '#444441',
      fontSize: '11px'
    };
  }

  const baseStyle = {
    borderRadius: '999px',
    padding: '6px 14px',
    textAlign: 'center',
    cursor: 'pointer',
    position: 'relative',
    userSelect: 'none',
    boxSizing: 'border-box',
    ...typeStyles
  };

  const tooltipStyle = {
    position: 'absolute',
    bottom: '100%',
    left: '50%',
    transform: 'translateX(-50%) translateY(-8px)',
    background: '#ffffff',
    border: '0.5px solid #E8E7E1',
    borderRadius: '8px',
    padding: '8px 12px',
    fontSize: '11px',
    minWidth: '160px',
    zIndex: 999,
    pointerEvents: 'none',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    textAlign: 'left',
    color: '#0a101c',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  };

  const chunkCount = data.chunkIds ? data.chunkIds.length : 0;

  return (
    <div
      style={baseStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Target handle on the left */}
      <Handle
        type="target"
        position={Position.Left}
        style={{ opacity: 0 }}
      />

      {/* Node label */}
      <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {data.label}
      </span>

      {/* Hover tooltip */}
      {isHovered && (
        <div style={tooltipStyle}>
          <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#000000' }}>
            {data.label}
          </div>
          {data.detail && (
            <div style={{ color: '#444441', marginTop: '2px' }}>
              {data.detail}
            </div>
          )}
          <div style={{ color: '#888780', fontSize: '9.5px', marginTop: '2px' }}>
            {chunkCount} chunks sourced
          </div>
        </div>
      )}

      {/* Source handle on the right */}
      <Handle
        type="source"
        position={Position.Right}
        style={{ opacity: 0 }}
      />
    </div>
  );
}
