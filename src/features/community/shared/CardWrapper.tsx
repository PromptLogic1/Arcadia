'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import type { CardWrapperProps } from '../types/types';

export const CardWrapper = memo<CardWrapperProps>(
  ({ children, onClick, className = '', hoverAccentColor = 'cyan' }) => {
    const hoverColors = {
      cyan: 'hover:border-cyan-500/50',
      fuchsia: 'hover:border-fuchsia-500/50',
      lime: 'hover:border-lime-500/50',
    } as const;

    return (
      <motion.div layout transition={{ duration: 0.2 }}>
        <Card
          className={`w-full cursor-pointer border-gray-700/50 bg-gray-800/90 transition-colors duration-200 ${hoverColors[hoverAccentColor]} ${className} `}
          onClick={onClick}
        >
          {children}
        </Card>
      </motion.div>
    );
  }
);

CardWrapper.displayName = 'CardWrapper';
