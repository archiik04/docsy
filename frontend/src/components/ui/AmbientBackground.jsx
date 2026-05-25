import React, { useMemo } from 'react';

export function AmbientBackground() {
  const stars = useMemo(() => {
    const starCount = 100;
    const items = [];
    for (let i = 0; i < starCount; i++) {
      const top = Math.random() * 100;
      const left = Math.random() * 100;
      const size = Math.random() * 1.5 + 0.5; // 0.5px to 2px
      const duration = Math.random() * 4 + 4; // 4s to 8s twinkle pulse duration
      const delay = Math.random() * -8; // staggered delay
      const initialOpacity = Math.random() * 0.4 + 0.3; // 0.3 to 0.7
      items.push({ id: i, top, left, size, duration, delay, initialOpacity });
    }
    return items;
  }, []);

  return (
    <div className="ambient-bg">
      <div className="nebula-glow" />
      <div className="star-field">
        {stars.map((star) => (
          <div
            key={star.id}
            className="star"
            style={{
              top: `${star.top}%`,
              left: `${star.left}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              animationDuration: `${star.duration}s`,
              animationDelay: `${star.delay}s`,
              opacity: star.initialOpacity,
            }}
          />
        ))}
      </div>
    </div>
  );
}
