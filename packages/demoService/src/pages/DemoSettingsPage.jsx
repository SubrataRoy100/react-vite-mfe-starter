import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router";
import { useStore } from "../context/StoreContext";
import Button from "@subrataroy100/mfe-shared/components/Button";

export default function DemoSettingsPage() {
  const {
    currency,
    setCurrency,
    showOutOfStock,
    setShowOutOfStock,
    totalCartCount,
    clearCart,
  } = useStore();

  const [savedNotice, setSavedNotice] = useState(false);
  const saveTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  function handleSave() {
    setSavedNotice(true);
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      setSavedNotice(false);
      saveTimerRef.current = null;
    }, 2000);
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-6">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Top Header Section */}
        <div className="p-6 border-b border-slate-100 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight">
                CloudStore Preferences & Configuration
              </h2>
              <span className="text-[10px] bg-blue-500/20 text-blue-300 font-semibold px-2 py-0.5 rounded-full border border-blue-400/30">
                Remote Settings
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Configure storefront parameters, currency conversion, and test cross-MFE reset flows.
            </p>
          </div>

          {/* Main Return Navigation Link */}
          <Link
            to=".."
            relative="path"
            className="inline-flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 px-3.5 py-1.5 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors shadow-sm gap-1"
          >
            ← Back to Store
          </Link>
        </div>

        {/* Settings Body */}
        <div className="p-6 space-y-6">
          {savedNotice && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-semibold flex items-center gap-2">
              <span>✓</span> Preferences updated successfully!
            </div>
          )}

          {/* Section 1: Store Currency & Localization */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>🌐</span> Currency & Localization
            </h3>
            <p className="text-xs text-slate-500">
              Select your preferred currency. Changes take effect immediately across all product cards and cart calculations.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { code: "USD", name: "US Dollar ($)", symbol: "$" },
                { code: "EUR", name: "Euro (€)", symbol: "€" },
                { code: "GBP", name: "British Pound (£)", symbol: "£" },
              ].map((cur) => (
                <button
                  key={cur.code}
                  type="button"
                  onClick={() => {
                    setCurrency(cur.code);
                    handleSave();
                  }}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    currency === cur.code
                      ? "border-blue-600 bg-blue-50/50 text-blue-900 shadow-xs"
                      : "border-slate-200 hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <div className="text-sm font-bold">{cur.symbol} {cur.code}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{cur.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Section 2: Catalog Display Preferences */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>📦</span> Catalog Display & Inventory
            </h3>
            <label className="flex items-center gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
              <input
                type="checkbox"
                checked={showOutOfStock}
                onChange={(e) => {
                  setShowOutOfStock(e.target.checked);
                  handleSave();
                }}
                className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
              />
              <div>
                <span className="text-xs font-semibold text-slate-800 block">
                  Display Out-of-Stock Items
                </span>
                <span className="text-[11px] text-slate-400 block">
                  When disabled, items with 0 stock are hidden from the store catalog.
                </span>
              </div>
            </label>
          </div>

          {/* Section 3: Cart Management & Cross-MFE Data Reset */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>🛒</span> Cart & Session Management
            </h3>
            <p className="text-xs text-slate-500">
              Current cart holds <strong>{totalCartCount}</strong> items. Clearing will update the Host Header badge in real time via the event bus.
            </p>
            <div className="flex items-center gap-3">
              <Button
                variant="danger"
                onClick={() => clearCart()}
                disabled={totalCartCount === 0}
              >
                Clear Cart Items
              </Button>
            </div>
          </div>

          {/* Section 4: Module Federation Runtime Diagnostics */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>⚡</span> Federation Network Metadata
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-slate-400 block text-[10px] font-semibold uppercase">
                  Service Name & Port
                </span>
                <span className="font-mono font-bold text-slate-800">
                  demoService (Port 5001)
                </span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-slate-400 block text-[10px] font-semibold uppercase">
                  Federation Entry Point
                </span>
                <span className="font-mono font-bold text-slate-800">
                  /remoteEntry.js
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
