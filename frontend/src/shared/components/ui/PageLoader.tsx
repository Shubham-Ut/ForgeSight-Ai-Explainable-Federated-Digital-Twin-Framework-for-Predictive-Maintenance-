import React from 'react';
import { Zap } from 'lucide-react';

export function PageLoader() {
  return (
    <div className="fixed inset-0 bg-bg-base flex items-center justify-center z-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-9 h-9 bg-accent rounded-xl flex items-center justify-center">
          <Zap size={18} className="text-white" strokeWidth={2.5} />
        </div>
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-accent/30 animate-skeleton"
              style={{ animationDelay: `${i * 200}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
