/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';

interface AnimatedBarChartIconProps {
  isActive?: boolean;
  className?: string;
}

export const AnimatedBarChartIcon: React.FC<AnimatedBarChartIconProps> = ({
  isActive = false,
  className = 'w-3.5 h-3.5',
}) => {
  if (!isActive) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`${className} hover:scale-110 transition-transform`}
      >
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    );
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Balken 1 (links) */}
      <motion.line
        x1="6"
        y1="20"
        x2="6"
        initial={{ y2: 14 }}
        animate={{ y2: [14, 7, 16, 9, 14] }}
        transition={{
          duration: 2.2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      {/* Balken 2 (Mitte) */}
      <motion.line
        x1="12"
        y1="20"
        x2="12"
        initial={{ y2: 4 }}
        animate={{ y2: [4, 15, 6, 12, 4] }}
        transition={{
          duration: 2.7,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 0.2,
        }}
      />
      {/* Balken 3 (rechts) */}
      <motion.line
        x1="18"
        y1="20"
        x2="18"
        initial={{ y2: 10 }}
        animate={{ y2: [10, 5, 14, 7, 10] }}
        transition={{
          duration: 1.9,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 0.4,
        }}
      />
    </svg>
  );
};
