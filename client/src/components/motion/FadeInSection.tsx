import React from 'react';
import { motion } from 'framer-motion';

interface FadeInSectionProps {
  eyebrow?: string;
  title?: string;
  description?: string;
  align?: 'left' | 'center';
  className?: string;
  children?: React.ReactNode;
}

export const FadeInSection: React.FC<FadeInSectionProps> = ({
  eyebrow,
  title,
  description,
  align = 'center',
  className = '',
  children,
}) => {
  const isCenter = align === 'center';

  return (
    <div className={`space-y-6 ${className}`}>
      {(eyebrow || title || description) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className={`max-w-3xl ${isCenter ? 'mx-auto text-center' : 'text-left'}`}
        >
          {eyebrow && (
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200/80 mb-3">
              {eyebrow}
            </span>
          )}
          {title && (
            <div className="relative inline-block w-full">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-extrabold text-charcoal-900 tracking-tight leading-tight">
                {title}
              </h2>
              {/* Decorative underline */}
              <motion.div
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
                className={`h-1 w-20 bg-gradient-to-r from-emerald-500 to-lime rounded-full mt-3 ${
                  isCenter ? 'mx-auto' : ''
                }`}
                style={{ originX: isCenter ? 0.5 : 0 }}
              />
            </div>
          )}
          {description && (
            <p className="text-sm sm:text-base text-charcoal-600 leading-relaxed mt-4 max-w-2xl mx-auto">
              {description}
            </p>
          )}
        </motion.div>
      )}

      {children && <div>{children}</div>}
    </div>
  );
};
