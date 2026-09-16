import React, { useState } from "react";
import { Link } from "react-router";
import RemoteErrorBoundary from "../components/RemoteErrorBoundary";
import LoadingFallback from "../components/LoadingFallback";
import { useMfeEventListener, sendMfeEvent, MFE_EVENTS } from "@mfe/shared";

// Dynamically import the federated development testing widget from remote
const RemoteMfeDevWidget = React.lazy(() => import("demoService/MfeDevWidget"));

function LandingPage() {
  const [eventsFeed, setEventsFeed] = useState([]);

  // Listen for Cross-MFE Pings from any remote micro-frontend
  useMfeEventListener(MFE_EVENTS.PING, (detail) => {
    setEventsFeed((prev) => [
      {
        id: Date.now(),
        sender: detail.sender,
        message: detail.message,
        time: new Date(detail.timestamp).toLocaleTimeString(),
      },
      ...prev.slice(0, 4), // keep last 5 events
    ]);

    // Send automated pong response
    sendMfeEvent(MFE_EVENTS.PONG, {
      message: "Host received your ping successfully!",
    });
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-12">
      {/* Hero Header Area */}
      <header className="bg-white border-b border-slate-200 py-8 px-6 shadow-sm">
        <div className="max-w-6xl mx-auto text-center">
          <span className="bg-blue-50 text-blue-600 text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider">
            Workspace Shell
          </span>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Micro-Frontend Monorepo Hub
          </h2>
          <p className="mt-2 text-sm text-slate-500 max-w-xl mx-auto">
            A production-ready orchestration platform managing independent,
            isolated applications over Vite Module Federation.
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto p-6 mt-6 space-y-8">
        {/* Available Sub-Services Grid */}
        <section>
          <h3 className="text-lg font-semibold text-slate-700 mb-4">
            Available Sub-Services
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Service Card: Demo Application */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span
                    className="flex h-2 w-2 rounded-full bg-emerald-500"
                    title="Online"
                  />
                  <span className="text-xs font-mono text-slate-400">
                    Port: 5001
                  </span>
                </div>
                <h4 className="mt-2 font-bold text-slate-900 text-lg">
                  Demo Service Module
                </h4>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                  Full sub-app with internal routing, settings view, and
                  isolated business domain components.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100">
                <Link
                  to="/demo"
                  className="inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 transition-colors"
                >
                  Launch Application (/demo) →
                </Link>
              </div>
            </div>

            {/* Placeholder for future growth */}
            <div className="bg-slate-100 rounded-xl border border-dashed border-slate-300 p-5 flex flex-col items-center justify-center text-center opacity-70">
              <span className="text-2xl text-slate-400">+</span>
              <h4 className="font-semibold text-slate-600 text-sm mt-1">
                Add New Remote
              </h4>
              <p className="text-xs text-slate-400 mt-1 max-w-[200px]">
                Create a new package in <code>packages/</code> and register in <code>vite.config.js</code>.
              </p>
            </div>
          </div>
        </section>

        {/* Live MFE Development Testing Playground */}
        <section className="space-y-4">
          <div className="border-t border-slate-200 pt-6 flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <span>⚡</span>
                <span>Development Testing Feature: Federated Widget & Event Bus</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Verifies cross-MFE component federation, event dispatching, and error isolation live.
              </p>
            </div>
            <span className="text-xs font-mono bg-slate-200/70 text-slate-600 px-2.5 py-1 rounded">
              Status: Live Testing Harness
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Embedded Federated Remote Widget */}
            <div className="lg:col-span-2">
              <RemoteErrorBoundary remoteName="Federated Dev Widget">
                <React.Suspense fallback={<LoadingFallback message="Loading federated widget from remote..." />}>
                  <RemoteMfeDevWidget title="Remote Widget Federated into Host Shell" />
                </React.Suspense>
              </RemoteErrorBoundary>
            </div>

            {/* Host Event Monitor Feed */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                    Host Event Feed
                  </h4>
                  <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-mono">
                    CustomEvents
                  </span>
                </div>

                <div className="mt-3 space-y-2">
                  {eventsFeed.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-4 text-center">
                      No incoming events yet. Click "Send MFE Ping" in the widget to test!
                    </p>
                  ) : (
                    eventsFeed.map((evt) => (
                      <div
                        key={evt.id}
                        className="text-[11px] p-2 rounded bg-slate-50 border border-slate-100"
                      >
                        <div className="flex justify-between font-mono text-slate-400 text-[10px]">
                          <span>{evt.sender}</span>
                          <span>{evt.time}</span>
                        </div>
                        <p className="font-medium text-slate-700 mt-0.5">{evt.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
                Automatic PONG responses are dispatched back to the remote sender.
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default LandingPage;
