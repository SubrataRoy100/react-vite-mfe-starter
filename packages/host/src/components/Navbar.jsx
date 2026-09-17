import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router";
import { MFE_EVENTS } from "@subrataroy100/mfe-shared";
import { useMfeEventListener } from "@subrataroy100/mfe-shared/adapters";

export default function Navbar() {
  const location = useLocation();
  const [cartCount, setCartCount] = useState(0);
  const [lastNotification, setLastNotification] = useState(null);
  const notificationTimerRef = useRef(null);

  // Clear timer on unmount
  useEffect(() => {
    return () => {
      if (notificationTimerRef.current) {
        clearTimeout(notificationTimerRef.current);
      }
    };
  }, []);

  // Cross-MFE Event Listeners: Host tracks remote store updates in real-time
  useMfeEventListener(MFE_EVENTS.CART_UPDATE, (detail) => {
    if (typeof detail.count === "number") {
      setCartCount(detail.count);
    }
  });

  useMfeEventListener(MFE_EVENTS.NOTIFICATION, (detail) => {
    if (detail.message) {
      setLastNotification(detail.message);
      if (notificationTimerRef.current) {
        clearTimeout(notificationTimerRef.current);
      }
      notificationTimerRef.current = setTimeout(() => {
        setLastNotification(null);
        notificationTimerRef.current = null;
      }, 3500);
    }
  });

  const isHome = location.pathname === "/";
  const isSettings =
    location.pathname === "/demo/settings" ||
    location.pathname.startsWith("/demo/settings/");
  const isDemo = location.pathname.startsWith("/demo") && !isSettings;

  return (
    <header className="bg-slate-900 text-white sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand and primary navigation */}
          <div className="flex items-center space-x-8">
            <Link to="/" className="flex items-center gap-2.5 font-extrabold text-lg text-white hover:text-blue-400 transition-colors">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 font-black text-white shadow-sm shadow-blue-500/50">
                ⬡
              </span>
              <span className="tracking-tight">Nexus<span className="text-blue-400">Hub</span></span>
            </Link>

            <nav className="hidden md:flex space-x-1">
              <Link
                to="/"
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isHome
                    ? "bg-slate-800 text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                Monorepo Hub
              </Link>
              <Link
                to="/demo"
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  isDemo
                    ? "bg-blue-600 text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <span>🛍️</span>
                <span>CloudStore Pro</span>
              </Link>
              <Link
                to="/demo/settings"
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isSettings
                    ? "bg-blue-600 text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                Settings
              </Link>
            </nav>
          </div>

          {/* Right side widgets: Host status & Cross-MFE Cart Badge */}
          <div className="flex items-center space-x-4">
            <div className="hidden sm:flex items-center gap-2 text-xs bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-700/60 font-mono">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-slate-300">Host: 5000</span>
              <span className="text-slate-500">|</span>
              <span className="text-blue-300">Demo Remote: 5001</span>
            </div>

            {/* Cross-MFE Synchronized Cart Link */}
            <Link
              to="/demo"
              title="View CloudStore Cart"
              className="relative inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-all shadow-sm"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>
              <span className="hidden sm:inline">Store Cart</span>
              <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold bg-amber-400 text-slate-900 rounded-full shadow-inner">
                {cartCount}
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* Global cross-MFE notification banner toast */}
      {lastNotification && (
        <div className="bg-emerald-600 text-white text-xs px-4 py-1.5 flex items-center justify-between transition-all duration-300">
          <div className="max-w-7xl mx-auto w-full flex items-center gap-2">
            <span className="font-semibold uppercase tracking-wider text-[10px] bg-emerald-700/70 px-1.5 py-0.5 rounded">
              Cross-MFE Event
            </span>
            <span>{lastNotification}</span>
          </div>
          <button
            onClick={() => setLastNotification(null)}
            className="text-white hover:text-emerald-100 font-bold ml-2 text-xs"
          >
            ✕
          </button>
        </div>
      )}
    </header>
  );
}
