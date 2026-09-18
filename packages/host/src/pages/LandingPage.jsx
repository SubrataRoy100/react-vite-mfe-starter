import React, { useState } from "react";
import { sendMfeEvent, MFE_EVENTS } from "@subrataroy100/mfe-shared";
import { useMfeEventListener } from "@subrataroy100/mfe-shared/adapters";

function LandingPage() {
  const [eventsFeed, setEventsFeed] = useState([]);

  // Listen for Cross-MFE Pings from any active micro-frontends
  useMfeEventListener(MFE_EVENTS.PING, (detail) => {
    setEventsFeed((prev) => [
      {
        id: Date.now(),
        sender: detail.sender,
        message: detail.message,
        time: new Date(detail.timestamp).toLocaleTimeString(),
      },
      ...prev.slice(0, 4),
    ]);

    sendMfeEvent(MFE_EVENTS.PONG, {
      message: "Host received your ping successfully!",
    });
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-12">
      {/* Hero Header Area */}
      <header className="bg-white border-b border-slate-200 py-8 px-6 shadow-sm">
        <div className="max-w-6xl mx-auto text-center">
          <span className="bg-emerald-50 text-emerald-700 text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider">
            Clean Starter Environment
          </span>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Micro-Frontend Monorepo Hub
          </h2>
          <p className="mt-2 text-sm text-slate-500 max-w-xl mx-auto">
            Your host orchestration container is running and healthy. You are now
            ready to build and connect your own micro-frontend applications.
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto p-6 mt-6 space-y-8">
        {/* Next Steps Guide */}
        <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <span>🚀</span>
            <span>How to Connect Your First Micro-Frontend</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Follow these 3 simple steps to register a new remote service:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="rounded-lg bg-slate-50 p-4 border border-slate-100">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Step 1</span>
              <h4 className="font-semibold text-sm text-slate-800 mt-1">Create Package</h4>
              <p className="text-xs text-slate-500 mt-1 font-mono bg-white p-2 rounded border border-slate-200">
                mkdir packages/myApp<br />
                cd packages/myApp<br />
                pnpm init
              </p>
            </div>

            <div className="rounded-lg bg-slate-50 p-4 border border-slate-100">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Step 2</span>
              <h4 className="font-semibold text-sm text-slate-800 mt-1">Add to Manifest</h4>
              <p className="text-xs text-slate-500 mt-1 font-mono bg-white p-2 rounded border border-slate-200">
                // remotes.manifest.json<br />
                "myApp": &#123;<br />
                &nbsp;&nbsp;"port": 5002,<br />
                &nbsp;&nbsp;"path": "/myapp"<br />
                &#125;
              </p>
            </div>

            <div className="rounded-lg bg-slate-50 p-4 border border-slate-100">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Step 3</span>
              <h4 className="font-semibold text-sm text-slate-800 mt-1">Mount Route</h4>
              <p className="text-xs text-slate-500 mt-1 font-mono bg-white p-2 rounded border border-slate-200">
                // host/src/App.jsx<br />
                &lt;Route path="/myapp/*"<br />
                &nbsp;&nbsp;element=&#123;&lt;MyApp /&gt;&#125; /&gt;
              </p>
            </div>
          </div>
        </section>

        {/* Host Event Monitor Feed */}
        <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h4 className="font-bold text-slate-800 text-sm">
                Cross-MFE Event Monitor (Active)
              </h4>
              <p className="text-xs text-slate-400">
                Listening for standard window CustomEvents from any connected micro-frontends.
              </p>
            </div>
            <span className="text-[10px] bg-emerald-100 text-emerald-700 font-mono px-2 py-0.5 rounded font-semibold">
              Event Bus Ready
            </span>
          </div>

          <div className="mt-4">
            {eventsFeed.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-6 text-center">
                No events received yet. When your remotes dispatch CustomEvents via @subrataroy100/mfe-shared, they will appear here in real time.
              </p>
            ) : (
              <div className="space-y-2">
                {eventsFeed.map((evt) => (
                  <div key={evt.id} className="text-xs p-3 rounded bg-slate-50 border border-slate-100 flex justify-between">
                    <div>
                      <span className="font-mono text-blue-600 font-semibold">{evt.sender}</span>: {evt.message}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">{evt.time}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default LandingPage;
