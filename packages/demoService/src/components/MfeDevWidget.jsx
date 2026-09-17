import React, { useState } from "react";
import { sendMfeEvent, MFE_EVENTS } from "@mfe/shared";
import { useMfeEventListener } from "@mfe/shared/adapters";

/**
 * MfeDevWidget
 * An interactive development testing component demonstrating:
 * 1. Runtime environment awareness (Host Shell vs Standalone).
 * 2. Cross-MFE event messaging (Ping / Pong).
 * 3. Fault-injection to verify isolated ErrorBoundary resilience.
 */
export default function MfeDevWidget({ title = "MFE Dev Testing & Diagnostics" }) {
  const isHost = typeof window !== "undefined" && Boolean(window.__IS_HOST__);
  const [pingCount, setPingCount] = useState(0);
  const [lastMessage, setLastMessage] = useState(null);
  const [shouldCrash, setShouldCrash] = useState(false);

  // Listen for responses or notifications from other MFEs (ignore self-broadcasts)
  useMfeEventListener(MFE_EVENTS.PONG, (detail) => {
    if (detail?.sender === "MfeDevWidget") return;
    setLastMessage(`Received PONG from ${detail?.sender || "Host"} at ${new Date(detail?.timestamp || Date.now()).toLocaleTimeString()}`);
  });

  useMfeEventListener(MFE_EVENTS.PING, (detail) => {
    if (detail?.sender === "MfeDevWidget") return;
    setLastMessage(`Received PING from ${detail?.sender || "External"} (${detail?.count || 1})`);
  });

  // Intentional crash simulator for testing ErrorBoundary
  if (shouldCrash) {
    throw new Error("Simulated Micro-Frontend Crash! The ErrorBoundary caught this successfully.");
  }

  const handleSendPing = () => {
    const nextCount = pingCount + 1;
    setPingCount(nextCount);
    sendMfeEvent(MFE_EVENTS.PING, {
      message: "Hello from MfeDevWidget!",
      count: nextCount,
      sender: "MfeDevWidget",
    });
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 pb-3">
        <div>
          <h4 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
            <span>🧪</span>
            <span>{title}</span>
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Federated component for testing runtime isolation & cross-app events.
          </p>
        </div>

        {/* Runtime Context Badge */}
        <div>
          {isHost ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
              Embedded in Host Shell
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
              <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
              Standalone Mode (Port 5001)
            </span>
          )}
        </div>
      </div>

      {/* Diagnostics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
          <span className="text-slate-400 font-mono block uppercase text-[10px]">Active Origin</span>
          <span className="font-semibold text-slate-700 font-mono break-all">
            {typeof window !== "undefined" ? window.location.origin : "SSR"}
          </span>
        </div>
        <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
          <span className="text-slate-400 font-mono block uppercase text-[10px]">Pings Dispatched</span>
          <span className="font-bold text-slate-800 text-sm">{pingCount}</span>
        </div>
      </div>

      {lastMessage && (
        <div className="text-[11px] bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg p-2.5 flex items-center gap-2">
          <span>📡</span>
          <span>{lastMessage}</span>
        </div>
      )}

      {/* Actions */}
      <div className="pt-2 flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={handleSendPing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 transition"
        >
          <span>📨</span>
          <span>Send MFE Ping</span>
        </button>

        <button
          type="button"
          onClick={() => setShouldCrash(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 active:scale-95 transition"
          title="Throws an error inside this component to verify the host ErrorBoundary stays intact"
        >
          <span>💥</span>
          <span>Simulate Crash (Test ErrorBoundary)</span>
        </button>
      </div>
    </div>
  );
}
