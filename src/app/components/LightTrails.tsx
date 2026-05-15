import React from 'react';
import { motion } from 'framer-motion';

export const LightTrails = () => {
  const trails = [
    { id: 1, d: "M-100 100 Q 150 50 400 100 T 900 150", duration: 8, delay: 0 },
    { id: 2, d: "M-100 200 Q 200 250 500 200 T 1000 150", duration: 12, delay: 2 },
    { id: 3, d: "M-100 300 Q 100 350 400 300 T 800 250", duration: 10, delay: 5 },
    { id: 4, d: "M-100 400 Q 300 350 600 400 T 1100 450", duration: 15, delay: 1 },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
      <svg className="w-full h-full" viewBox="0 0 1000 500" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="trailGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="white" stopOpacity="0" />
            <stop offset="50%" stopColor="white" stopOpacity="0.6" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
        </defs>
        {trails.map((trail) => (
          <motion.path
            key={trail.id}
            d={trail.d}
            stroke="url(#trailGradient)"
            strokeWidth="1.5"
            fill="transparent"
            initial={{ pathLength: 0.2, pathOffset: -0.2 }}
            animate={{ pathOffset: 1.2 }}
            transition={{
              duration: trail.duration,
              repeat: Infinity,
              delay: trail.delay,
              ease: "linear",
            }}
          />
        ))}
      </svg>
    </div>
  );
};
