import React, { useState } from "react";
import { Link } from "react-router";
import { useStore } from "../context/StoreContext";
import { CATEGORIES } from "../data/products";
import ProductCard from "../components/ProductCard";
import CartDrawer from "../components/CartDrawer";
import MfeDevWidget from "../components/MfeDevWidget";

export default function DemoLandingPage() {
  const {
    products,
    totalCartCount,
    setIsCartOpen,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    currency,
    setCurrency,
    showOutOfStock,
    toastMessage,
  } = useStore();

  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);

  // Filter products by search query, category, and out-of-stock toggle
  const filteredProducts = products.filter((product) => {
    const matchesCategory =
      selectedCategory === "All" || product.category === selectedCategory;
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStock = showOutOfStock || product.stock > 0;
    return matchesCategory && matchesSearch && matchesStock;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-20">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 border border-slate-700 animate-bounce">
          <span>✨</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Cart Drawer Slide-Over */}
      <CartDrawer />

      {/* Store Header & Action Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl p-2 rounded-xl bg-blue-50 border border-blue-100">
              ⚡
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-tight text-slate-900">
                  CloudStore Pro
                </h1>
                <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Live Remote MFE
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Autonomous micro-frontend for developer gear & cloud infrastructure.
              </p>
            </div>
          </div>

          {/* Quick Header Actions: Currency Switcher, Settings, Cart Button */}
          <div className="flex items-center gap-3">
            {/* Currency Selector */}
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Change Currency"
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
            </select>

            {/* Store Settings Link */}
            <Link
              to="settings"
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors"
            >
              ⚙️ Preferences
            </Link>

            {/* Cart Trigger Button */}
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="relative inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg shadow-sm hover:shadow transition-all"
            >
              <span>🛒 Cart</span>
              <span className="bg-white text-blue-700 rounded-full px-1.5 py-0.2 text-[11px] font-black">
                {totalCartCount}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Storefront Container */}
      <main className="max-w-6xl mx-auto px-6 pt-8 space-y-6">
        {/* Hero Banner */}
        <section className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Interactive Micro-Frontend Showcase
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Gear Up for Cloud-Native Engineering
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Every card below is rendered autonomously by <code>demoService</code>. Adding items to cart broadcasts real-time events to the Host Shell over the Cross-MFE Event Bus!
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs font-medium">
            <span className="bg-white/10 px-3 py-1.5 rounded-lg border border-white/10">
              🚀 React 19 Sub-App
            </span>
            <span className="bg-white/10 px-3 py-1.5 rounded-lg border border-white/10">
              ⚡ Module Federation
            </span>
            <span className="bg-white/10 px-3 py-1.5 rounded-lg border border-white/10">
              🔄 Cross-MFE Events
            </span>
          </div>
        </section>

        {/* Filter & Search Bar */}
        <section className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  selectedCategory === cat
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-72">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 text-xs">
              🔍
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search hardware, cloud..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-800"
            />
          </div>
        </section>

        {/* Product Catalog Grid */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-700">
              Showing {filteredProducts.length} Products
            </h3>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="text-xs text-blue-600 hover:underline font-semibold"
              >
                Clear search "{searchQuery}"
              </button>
            )}
          </div>

          {filteredProducts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
              <span className="text-4xl">🔎</span>
              <h4 className="text-base font-bold text-slate-800">No products found</h4>
              <p className="text-xs text-slate-400">
                Try changing your search terms or selecting a different category.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </section>

        {/* Floating/Collapsible MFE Diagnostics Toolbar */}
        <section className="border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-sm mt-10">
          <button
            type="button"
            onClick={() => setIsDiagnosticsOpen((prev) => !prev)}
            className="w-full px-6 py-3.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between transition-colors"
          >
            <div className="flex items-center gap-2">
              <span>🛠️</span>
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                MFE Testing & Diagnostics Drawer
              </span>
              <span className="text-[10px] bg-indigo-100 text-indigo-700 font-semibold px-2 py-0.5 rounded-full">
                Developer Utility
              </span>
            </div>
            <span className="text-xs font-bold text-slate-400">
              {isDiagnosticsOpen ? "▲ Collapse" : "▼ Expand"}
            </span>
          </button>

          {isDiagnosticsOpen && (
            <div className="p-6 border-t border-slate-200">
              <MfeDevWidget title="CloudStore Remote MFE Diagnostics" />
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
