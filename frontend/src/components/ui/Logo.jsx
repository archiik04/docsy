import React from 'react';

export function Logo({ onClick, style }) {
  return (
    <div
      className="logo brand-glow"
      onClick={onClick}
      style={style}
    >
      <span>Docsy</span>
    </div>
  );
}
