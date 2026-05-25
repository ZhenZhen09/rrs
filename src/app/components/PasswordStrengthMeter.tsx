import React from 'react';
import { motion } from 'framer-motion';

interface Props {
  score: number; // 0 to 3
}

export function PasswordStrengthMeter({ score }: Props) {
  const getWidth = () => {
    return `${((score / 3) * 100).toFixed(2)}%`;
  };

  const getColor = () => {
    if (score === 1) return 'bg-rose-500';
    if (score === 2) return 'bg-amber-500';
    if (score === 3) return 'bg-emerald-500';
    return 'bg-slate-200';
  };

  return (
    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden my-3">
      <motion.div 
        className={`h-full ${getColor()}`}
        initial={{ width: 0 }}
        animate={{ width: getWidth() }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
      />
    </div>
  );
}
