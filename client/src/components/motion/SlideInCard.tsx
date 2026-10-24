import React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';

interface SlideInCardProps extends HTMLMotionProps<'div'> {
  delay?: number;
  className?: string;
  hoverEffect?: boolean;
  children: React.ReactNode;
}

export const SlideInCard: React.FC<SlideInCardProps> = ({
  delay = 0,
  className = '',
  hoverEffect = true,
  children,
  ...props
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={hoverEffect ? { y: -5, transition: { duration: 0.2, ease: 'easeOut' } } : undefined}
      className={`transition-shadow ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
};
