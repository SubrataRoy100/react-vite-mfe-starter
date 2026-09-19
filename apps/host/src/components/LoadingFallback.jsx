import React from "react";

/**
 * Animated skeleton placeholder rendered while dynamic MFE chunks are streaming.
 */
export default function LoadingFallback({ message = "Streaming Remote Micro-Frontend..." }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm my-4 animate-pulse">
      <div className="flex items-center space-x-4">
        <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 font-mono text-sm font-bold">
          ⚡
        </div>
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-slate-200 rounded w-1/3" />
          <div className="h-3 bg-slate-100 rounded w-1/2" />
        </div>
      </div>
      <div className="mt-6 space-y-3">
        <div className="h-3 bg-slate-100 rounded" />
        <div className="h-3 bg-slate-100 rounded w-5/6" />
        <div className="h-3 bg-slate-100 rounded w-2/3" />
      </div>
      <p className="mt-4 text-xs font-mono text-slate-400 flex items-center gap-2">
        <span className="inline-block h-2 w-2 rounded-full bg-blue-500 animate-ping" />
        {message}
      </p>
    </div>
  );
}
