import React, { useState } from "react";
import { Link } from "react-router";
import { sendMfeEvent, MFE_EVENTS } from "@subrataroy100/mfe-shared";
import { useMfeEventListener } from "@subrataroy100/mfe-shared/adapters";
import { remoteRoutes } from "../remotesRegistry.jsx";

function LandingPage() {
  const [eventsFeed, setEventsFeed] = useState([]);

  // Listen for Cross-MFE Pings from any active micro-frontends
  useMfeEventListener(MFE_EVENTS.PING, (detail) => {
    setEventsFeed((prev) => [
      {
        id: Date.now() + Math.random(),
        sender: detail?.sender || "remote",
        message: detail?.message || "Ping received",
        time: new Date().toLocaleTimeString(),
        type: "incoming",
      },
      ...prev.slice(0, 5),
    ]);

    sendMfeEvent(MFE_EVENTS.PONG, {
      sender: "host",
      message: "Host received your ping successfully!",
      timestamp: Date.now(),
    });
  });

  useMfeEventListener(MFE_EVENTS.PONG, (detail) => {
    setEventsFeed((prev) => [
      {
        id: Date.now() + Math.random(),
        sender: detail?.sender || "remote",
        message: detail?.message || "Pong reply received",
        time: new Date().toLocaleTimeString(),
        type: "reply",
      },
      ...prev.slice(0, 5),
    ]);
  });

  const handleSendPing = () => {
    sendMfeEvent(MFE_EVENTS.PING, {
      sender: "host",
      message: "Ping dispatched from Host Shell dashboard!",
      timestamp: Date.now(),
    });

    setEventsFeed((prev) => [
      {
        id: Date.now() + Math.random(),
        sender: "host",
        message: "Ping dispatched to all micro-frontends",
        time: new Date().toLocaleTimeString(),
        type: "outgoing",
      },
      ...prev.slice(0, 5),
    ]);
  };

  const getRemoteIcon = (name) => {
    if (name.includes("auth")) return "🔐";
    if (name.includes("market") || name.includes("landing")) return "🚀";
    if (name.includes("learn") || name.includes("class")) return "📚";
    return "🧩";
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-16">
      {/* Hero Header */}
      <header className="bg-white border-b border-slate-200 py-10 px-6 shadow-sm">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="bg-indigo-50 text-indigo-700 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider border border-indigo-100">
              Module Federation 2.0
            </span>
            <span className="bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider border border-emerald-100">
              Vite 8 &bull; React 19
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            Micro-Frontend Monorepo Hub
          </h1>
          <p className="mt-3 text-base text-slate-500 max-w-2xl mx-auto">
            Primary host orchestration shell. Micro-frontends are decoupled, independently
            deployable, and mounted dynamically via zero-touch manifests.
          </p>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto p-6 mt-6 space-y-8">
        {/* Connected Micro-Frontends Section */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <span>📦</span>
                <span>Active Micro-Frontends</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Discovered dynamically from <code>remotes.manifest.json</code> and loaded via <code>@module-federation/vite</code>.
              </p>
            </div>
            <span className="self-start sm:self-auto text-xs bg-slate-100 text-slate-700 font-mono px-3 py-1 rounded-lg font-semibold">
              {remoteRoutes.length} Remotes Connected
            </span>
          </div>

          {remoteRoutes.length === 0 ? (
            <div className="mt-6 text-center py-10 px-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
              <div className="text-3xl mb-2">🚀</div>
              <h3 className="font-semibold text-slate-800 text-sm">No Micro-Frontends Active</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Your workspace is currently in clean starter mode. Scaffold your first federated remote with the CLI command below:
              </p>
              <pre className="mt-3 inline-block font-mono text-xs bg-white px-3.5 py-2 rounded-lg border border-slate-200 text-indigo-700">
                pnpm mfe:create myApp --path /myapp
              </pre>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
              {remoteRoutes.map((remote) => {
                const cleanPath = remote.urlPath || remote.path.replace(/\/\*$/, "");
                const displayRoute = remote.path === "/" ? "/" : remote.path;
                return (
                  <div
                    key={remote.key || `${remote.name}-${remote.path}`}
                    className="rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/50 p-5 hover:border-indigo-300 hover:shadow-md transition duration-200 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="text-2xl">{getRemoteIcon(remote.name)}</span>
                          <div>
                            <h3 className="font-bold text-slate-900 text-base">{remote.name}</h3>
                            <span className="text-[11px] text-slate-500 font-mono">
                              Port {remote.port || "Auto"}
                            </span>
                          </div>
                        </div>
                        <span className="text-[11px] bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-medium capitalize">
                          {remote.framework || "react"}
                        </span>
                      </div>

                      <div className="mt-4 flex items-center gap-2">
                        <span className="text-xs text-slate-400 font-medium">Host Route:</span>
                        <code className="text-xs font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                          {displayRoute}
                        </code>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                      <Link
                        to={cleanPath || "/"}
                        className="inline-flex items-center gap-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
                      >
                        <span>Open in Host</span>
                        <span>&rarr;</span>
                      </Link>
                      {remote.port && (
                        <a
                          href={`http://localhost:${remote.port}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-medium text-slate-500 hover:text-slate-800 transition"
                        >
                          Standalone (: {remote.port}) &nearr;
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Developer CLI Guide */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>⚡</span>
            <span>Developer-First Monorepo Tooling</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Build, connect, and verify new micro-frontends with one-line commands:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
              <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">1-Step Scaffolder</span>
              <h3 className="font-semibold text-sm text-slate-800 mt-1">Create Remote</h3>
              <p className="text-xs text-slate-500 mt-1 mb-3">
                Scaffolds package, sets Module Federation 2.0 & Tailwind v4, assigns port, and mounts route.
              </p>
              <pre className="text-[11px] text-slate-800 font-mono bg-white p-2.5 rounded-lg border border-slate-200 overflow-x-auto">
                pnpm mfe:create &lt;name&gt; --path /&lt;route&gt;
              </pre>
            </div>

            <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
              <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">Targeted DX</span>
              <h3 className="font-semibold text-sm text-slate-800 mt-1">Run Specific Remote</h3>
              <p className="text-xs text-slate-500 mt-1 mb-3">
                Boots only the host and your chosen remote for lightweight, instant startup.
              </p>
              <pre className="text-[11px] text-slate-800 font-mono bg-white p-2.5 rounded-lg border border-slate-200 overflow-x-auto">
                pnpm dev:only marketingMfe
              </pre>
            </div>

            <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
              <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">Port Hygiene</span>
              <h3 className="font-semibold text-sm text-slate-800 mt-1">Port Guard</h3>
              <p className="text-xs text-slate-500 mt-1 mb-3">
                Kills ghost background Node processes holding dev or preview ports.
              </p>
              <pre className="text-[11px] text-slate-800 font-mono bg-white p-2.5 rounded-lg border border-slate-200 overflow-x-auto">
                pnpm clean:ports
              </pre>
            </div>
          </div>
        </section>

        {/* Cross-MFE Event Monitor Feed */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>📡</span>
                <span>Cross-MFE Event Bus Monitor</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Decoupled standard browser CustomEvents via <code>@subrataroy100/mfe-shared</code>.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSendPing}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-sm transition"
              >
                Send Host Ping
              </button>
              <span className="text-[11px] bg-emerald-100 text-emerald-800 font-mono px-2.5 py-1 rounded-md font-semibold">
                Bus Active
              </span>
            </div>
          </div>

          <div className="mt-4">
            {eventsFeed.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-8 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                No events received yet. Click &quot;Send Host Ping&quot; or trigger events inside embedded remotes to view live cross-MFE messages.
              </p>
            ) : (
              <div className="space-y-2">
                {eventsFeed.map((evt) => (
                  <div
                    key={evt.id}
                    className="text-xs p-3 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-mono px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          evt.sender === "host"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {evt.sender}
                      </span>
                      <span className="text-slate-700">{evt.message}</span>
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
