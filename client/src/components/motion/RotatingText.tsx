import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface RotatingTextProps {
  phrases?: string[];
  intervalMs?: number;
  className?: string;
}

const DEFAULT_PHRASES = [
  'Rescue Food.',
  'Reduce Waste.',
  'Restore Hope.',
  'Feed Communities.',
];

export const RotatingText: React.FC<RotatingTextProps> = ({
  phrases = DEFAULT_PHRASES,
  intervalMs = 2800,
  className = '',
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % phrases.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [phrases.length, intervalMs]);

  return (
    <span className={`inline-block relative overflow-hidden align-baseline h-[1.3em] ${className}`}>
      <AnimatePresence mode="wait">
        <motion.span
          key={currentIndex}
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: '0%', opacity: 1 }}
          exit={{ y: '-100%', opacity: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="inline-block whitespace-nowrap text-emerald-600 font-extrabold"
        >
          {phrases[currentIndex]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
};
