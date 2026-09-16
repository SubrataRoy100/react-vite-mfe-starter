import React, { useState } from "react";
import { Link } from "react-router";
import RemoteErrorBoundary from "../components/RemoteErrorBoundary";
import LoadingFallback from "../components/LoadingFallback";
import { useMfeEventListener, sendMfeEvent, MFE_EVENTS } from "@mfe/shared";

// Dynamically import the federated development testing widget from remote
const RemoteMfeDevWidget = React.lazy(() => import("demoService/MfeDevWidget"));

function LandingPage() {
  const [eventsFeed, setEventsFeed] = useState([
    {
      id: "init-1",
      sender: "System Bus",
      type: "SYSTEM",
      message: "Monorepo Event Bus initialized and listening for Remote actions",
      time: new Date().toLocaleTimeString(),
    },
  ]);

  // Listen for Cross-MFE Pings from any remote micro-frontend
  useMfeEventListener(MFE_EVENTS.PING, (detail) => {
    setEventsFeed((prev) => [
      {
        id: Date.now() + Math.random(),
        sender: detail.sender || "Remote",
        type: "PING",
        message: detail.message || "Ping received",
        time: new Date(detail.timestamp || Date.now()).toLocaleTimeString(),
      },
      ...prev.slice(0, 5),
    ]);

    // Send automated pong response
    sendMfeEvent(MFE_EVENTS.PONG, {
      message: "Host received your ping successfully!",
    });
  });

  // Listen for Cross-MFE Cart & Notification events
  useMfeEventListener("mfe:cart_update", (detail) => {
    setEventsFeed((prev) => [
      {
        id: Date.now() + Math.random(),
        sender: detail.sender || "CloudStore Remote",
        type: "CART",
        message: detail.product
          ? `Added "${detail.product}" (Cart items: ${detail.count})`
          : `Cart count changed to ${detail.count}`,
        time: new Date().toLocaleTimeString(),
      },
      ...prev.slice(0, 5),
    ]);
  });

  useMfeEventListener("mfe:order_placed", (detail) => {
    setEventsFeed((prev) => [
      {
        id: Date.now() + Math.random(),
        sender: detail.sender || "CloudStore Remote",
        type: "ORDER",
        message: `Order #${detail.orderId} placed for ${detail.total}! (${detail.itemCount} items)`,
        time: new Date(detail.timestamp || Date.now()).toLocaleTimeString(),
      },
      ...prev.slice(0, 5),
    ]);
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-12">
      {/* Hero Header Area */}
      <header className="bg-white border-b border-slate-200 py-10 px-6 shadow-sm">
        <div className="max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200/60 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider mb-3">
            <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse"></span>
            Workspace Host Shell
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            Nexus Micro-Frontend Monorepo
          </h1>
          <p className="mt-3 text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
            A production-grade Vite 8 + Module Federation architecture featuring an interactive real-world
            developer gear storefront (<span className="font-semibold text-slate-800">CloudStore Pro</span>),
            cross-MFE event bus telemetry, and isolated remote micro-frontends.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              to="/demo"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
            >
              <span>🛍️</span>
              <span>Open CloudStore Pro Demo</span>
            </Link>
            <Link
              to="/demo/settings"
              className="inline-flex items-center gap-2 rounded-lg bg-white border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
            >
              <span>⚙️</span>
              <span>Store Configuration</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto p-6 mt-6 space-y-8">
        {/* Available Sub-Services Grid */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Connected Micro-Frontend Services
              </h2>
              <p className="text-xs text-slate-500">
                Independent Vite applications federated together into this Host Shell
              </p>
            </div>
            <span className="text-xs font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-medium">
              1 Remote Active
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Service Card: Real CloudStore Pro Application */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between border-t-4 border-t-blue-600">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping"
                      title="Online"
                    />
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      Live Remote
                    </span>
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    Port: 5001
                  </span>
                </div>
                <h3 className="mt-3 font-bold text-slate-900 text-lg flex items-center gap-2">
                  <span>🛍️</span>
                  <span>CloudStore Pro</span>
                </h3>
                <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                  Real e-commerce storefront with product catalog (Hardware, Cloud, Tools),
                  instant search, category tabs, currency switching, interactive cart drawer, and order checkout.
                </p>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">Cart Drawer</span>
                  <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">Event Bus Sync</span>
                  <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">Multi-Currency</span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col gap-2">
                <Link
                  to="/demo"
                  className="inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 transition-colors"
                >
                  Launch Storefront (/demo) →
                </Link>
                <Link
                  to="/demo/settings"
                  className="inline-flex w-full items-center justify-center rounded-lg bg-slate-100 px-4 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 transition-colors"
                >
                  Configure Store Settings
                </Link>
              </div>
            </div>

            {/* Architecture Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between border-t-4 border-t-emerald-600">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Architecture
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    Vite 8 + ESM
                  </span>
                </div>
                <h3 className="mt-3 font-bold text-slate-900 text-lg flex items-center gap-2">
                  <span>⚡</span>
                  <span>Zero-Config MFE Preset</span>
                </h3>
                <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                  Powered by <code>@mfe/vite-config</code>. Standardizes remote entry, shared singletons
                  (React 19, react-router 8), and CSS bundle minification fixes across all workspaces.
                </p>

                <div className="mt-4 space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600">✓</span>
                    <span>Turborepo pipeline caching</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600">✓</span>
                    <span>Dual-mode standalone & host embed</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100">
                <a
                  href="http://localhost:5001"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex w-full items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Open Standalone Remote ↗
                </a>
              </div>
            </div>

            {/* Placeholder for future growth */}
            <div className="bg-slate-100/70 rounded-xl border border-dashed border-slate-300 p-5 flex flex-col items-center justify-center text-center">
              <span className="text-2xl text-slate-400 mb-1">➕</span>
              <h4 className="font-semibold text-slate-700 text-sm">
                Add Micro-Frontend
              </h4>
              <p className="text-xs text-slate-500 mt-1 max-w-[200px]">
                Create a package in <code>packages/</code> with <code>createMfeConfig()</code> in under 10 lines.
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

                <div className="mt-3 space-y-2 max-h-72 overflow-y-auto pr-1">
                  {eventsFeed.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-4 text-center">
                      No incoming events yet. Click "Send MFE Ping" or add products to cart to test!
                    </p>
                  ) : (
                    eventsFeed.map((evt) => (
                      <div
                        key={evt.id}
                        className="text-[11px] p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 transition-all hover:bg-white hover:shadow-xs"
                      >
                        <div className="flex items-center justify-between font-mono text-slate-400 text-[10px] mb-1">
                          <span className="flex items-center gap-1.5 font-medium text-slate-600">
                            {evt.type === "ORDER" && (
                              <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold text-[9px]">ORDER</span>
                            )}
                            {evt.type === "CART" && (
                              <span className="px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 font-bold text-[9px]">CART</span>
                            )}
                            {evt.type === "PING" && (
                              <span className="px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 font-bold text-[9px]">PING</span>
                            )}
                            {evt.type === "SYSTEM" && (
                              <span className="px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 font-bold text-[9px]">SYS</span>
                            )}
                            <span>{evt.sender}</span>
                          </span>
                          <span>{evt.time}</span>
                        </div>
                        <p className="font-medium text-slate-800 leading-snug">{evt.message}</p>
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
