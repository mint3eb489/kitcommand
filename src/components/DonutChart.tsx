/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';

interface ChartSegment {
  value: number; // percentage (0-100)
  color: string;
}

export interface DonutChartProps {
  segments?: ChartSegment[];
  total?: number;
  neubau?: number;
  bestand?: number;
  klein?: number;
}

export const DonutChart: React.FC<DonutChartProps> = ({ 
  segments, 
  total,
  neubau,
  bestand,
  klein,
}) => {
  const radius = 58;
  const circumference = 2 * Math.PI * radius; // ~364.424

  // Determine effective segments and total
  const hasNamedProps = neubau !== undefined || bestand !== undefined || klein !== undefined;
  const n = Math.max(0, Number(neubau) || 0);
  const b = Math.max(0, Number(bestand) || 0);
  const k = Math.max(0, Number(klein) || 0);
  const sumCount = n + b + k;

  let effectiveSegments: ChartSegment[] = [];
  if (Array.isArray(segments) && segments.length > 0) {
    effectiveSegments = segments;
  } else if (hasNamedProps && sumCount > 0) {
    effectiveSegments = [
      { value: (n / sumCount) * 100, color: '#3b82f6' }, // blue-500: Neubau
      { value: (b / sumCount) * 100, color: '#6366f1' }, // indigo-500: Bestand
      { value: (k / sumCount) * 100, color: '#f59e0b' }, // amber-500: Kleinauftrag
    ];
  }

  const effectiveTotal = typeof total === 'number' 
    ? total 
    : (hasNamedProps ? sumCount : 0);

  if (effectiveTotal === 0 || effectiveSegments.length === 0) {
    return (
      <div className="relative w-36 h-36 flex items-center justify-center select-none">
        <svg className="w-full h-full transform -rotate-90 p-1">
          <circle
            cx="72"
            cy="72"
            r={radius}
            className="stroke-slate-200 dark:stroke-zinc-800 fill-transparent"
            strokeWidth="8"
            strokeDasharray="4 4"
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-slate-300 dark:text-zinc-650 leading-none">0</span>
          <span className="text-[8px] font-black text-slate-400 dark:text-zinc-550 uppercase tracking-widest mt-1">
            Gesamt
          </span>
        </div>
      </div>
    );
  }

  // Filter out zero-value segments to avoid rendering tiny artifacts
  const activeSegments = (effectiveSegments || []).filter((seg) => seg && typeof seg.value === 'number' && seg.value > 0);

  // Calculate cumulative offsets
  let accumulatedPercent = 0;

  return (
    <div className="relative w-36 h-36 flex items-center justify-center select-none group/chart">
      {/* Subtle background glow matching the chart's general active state */}
      <div className="absolute inset-0 bg-blue-500/5 dark:bg-blue-400/5 rounded-full blur-xl opacity-0 group-hover/chart:opacity-100 transition-opacity duration-300 pointer-events-none" />

      <svg className="w-full h-full transform -rotate-90 p-1 filter drop-shadow-xs">
        {/* Underlay base track for a high-end physical structure feeling */}
        <circle
          cx="72"
          cy="72"
          r={radius}
          className="stroke-slate-100/80 dark:stroke-zinc-800/60 fill-transparent"
          strokeWidth="8"
        />

        {activeSegments.map((seg, idx) => {
          const segPercentage = seg.value;
          const segLength = (segPercentage / 100) * circumference;
          const dashOffset = -(accumulatedPercent / 100) * circumference;
          accumulatedPercent += segPercentage;

          return (
            <motion.circle
              key={`${seg.color}-${idx}`}
              cx="72"
              cy="72"
              r={radius}
              fill="transparent"
              stroke={seg.color}
              strokeWidth="8"
              strokeDasharray={`${segLength} ${circumference}`}
              strokeLinecap={activeSegments.length === 1 ? 'round' : 'butt'}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: dashOffset }}
              transition={{ duration: 1.2, ease: 'easeOut', delay: idx * 0.1 }}
              className="transition-all duration-300 hover:stroke-[10px] cursor-help"
              style={{ originX: '72px', originY: '72px' }}
            />
          );
        })}
      </svg>

      {/* Central Information Readout */}
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-2xl font-black text-slate-800 dark:text-zinc-150 tracking-tight leading-none">
          {effectiveTotal}
        </span>
        <span className="text-[8px] font-extrabold text-slate-400 dark:text-zinc-550 uppercase tracking-widest mt-1">
          {effectiveTotal === 1 ? 'Auftrag' : 'Aufträge'}
        </span>
      </div>
    </div>
  );
};
