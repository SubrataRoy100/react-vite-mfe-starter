import React from "react";
import { Link } from "react-router";
import MfeDevWidget from "../components/MfeDevWidget";

function DemoLandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-6">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Module Dashboard Header */}
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span className="bg-indigo-50 text-indigo-600 text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">
              Remote Module Active
            </span>
            <h2 className="text-xl font-bold text-slate-900 mt-1">
              Demo Service Dashboard
            </h2>
            <p className="text-xs text-slate-400">
              Monitoring real-time micro-frontend performance statistics.
            </p>
          </div>

          {/* Main Action Link: Settings Page */}
          <Link
            to="settings"
            className="inline-flex items-center justify-center rounded-lg bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-xs font-semibold text-white transition-colors shadow-sm gap-1.5"
          >
            <svg
              xmlns="http://w3.org"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-3.5 h-3.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.43l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            Module Settings
          </Link>
        </div>

        {/* Dashboard Operational Grid */}
        <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Analytics Stat 1 */}
          <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Hydration Speed
            </p>
            <p className="text-2xl font-bold text-slate-900 mt-1">124ms</p>
            <span className="text-[10px] text-emerald-600 font-medium bg-emerald-50 px-1.5 py-0.5 rounded">
              Optimal
            </span>
          </div>

          {/* Analytics Stat 2 */}
          <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Vite Memory Load
            </p>
            <p className="text-2xl font-bold text-slate-900 mt-1">42.8 MB</p>
            <span className="text-[10px] text-indigo-600 font-medium bg-indigo-50 px-1.5 py-0.5 rounded">
              Isolated
            </span>
          </div>

          {/* Analytics Stat 3 */}
          <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Share Scope Status
            </p>
            <p className="text-2xl font-bold text-slate-900 mt-1">3/3 Loaded</p>
            <span className="text-[10px] text-amber-600 font-medium bg-amber-50 px-1.5 py-0.5 rounded">
              Synchronized
            </span>
          </div>
        </div>
        
        {/* Development Testing Feature Area */}
        <div className="px-6 pb-6">
          <MfeDevWidget title="Demo Service Standalone Testing Feature" />
        </div>

        {/* Mock Informational Footer Block */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <span>
            Target Path Context:{" "}
            <code className="bg-white border border-slate-200 px-1 py-0.5 rounded font-mono text-[10px]">
              /demo/*
            </code>
          </span>
          <span>Runtime: React 18+</span>
        </div>
      </div>
    </div>
  );
}

export default DemoLandingPage;
