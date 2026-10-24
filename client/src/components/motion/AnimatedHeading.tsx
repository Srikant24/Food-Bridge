import React from 'react';
import { motion } from 'framer-motion';

interface AnimatedHeadingProps {
  lines: Array<{
    text: string;
    highlight?: string;
  }>;
  className?: string;
  delay?: number;
}

export const AnimatedHeading: React.FC<AnimatedHeadingProps> = ({
  lines,
  className = '',
  delay = 0.1,
}) => {
  return (
    <h1 className={`font-display font-extrabold tracking-tight ${className}`}>
      {lines.map((lineObj, idx) => (
        <div key={idx} className="overflow-hidden leading-[1.12] pb-1">
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: '0%', opacity: 1 }}
            transition={{
              duration: 0.65,
              ease: [0.16, 1, 0.3, 1],
              delay: delay + idx * 0.12,
            }}
            className="inline-block"
          >
            <span>{lineObj.text} </span>
            {lineObj.highlight && (
              <span className="text-gradient-lime font-black">
                {lineObj.highlight}
              </span>
            )}
          </motion.div>
        </div>
      ))}
    </h1>
  );
};
