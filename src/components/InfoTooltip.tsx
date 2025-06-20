import React from 'react';
import { Info } from 'lucide-react';

interface InfoTooltipProps {
  text: string;
  className?: string;
}

/**
 * Small reusable component that shows an information icon which reveals a tooltip on hover.
 * Uses purely CSS (Tailwind) + the <title> attribute for accessibility.
 */
export default function InfoTooltip({ text, className = '' }: InfoTooltipProps) {
  return (
    <div className={`relative flex items-center group ${className}`} aria-label={text} role="tooltip">
      <Info className="w-4 h-4 text-gray-400 cursor-help" />
      {/* Tooltip bubble */}
      <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-1 w-max max-w-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20">
        <div className="rounded px-3 py-2 text-xs leading-tight text-white bg-gray-900 shadow-lg">
          {text}
        </div>
      </div>
    </div>
  );
} 