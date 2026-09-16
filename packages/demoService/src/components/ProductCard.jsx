import React, { useState } from "react";
import { useStore } from "../context/StoreContext";

export default function ProductCard({ product }) {
  const { addToCart, formatPrice } = useStore();
  const [justAdded, setJustAdded] = useState(false);

  function handleAdd() {
    addToCart(product);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1200);
  }

  const isOutOfStock = product.stock <= 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between group">
      <div>
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
            {product.category}
          </span>
          {product.badge && (
            <span className="text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
              {product.badge}
            </span>
          )}
        </div>

        {/* Product Visual Icon & Title */}
        <div className="flex items-start gap-3 my-2">
          <span className="text-3xl p-2.5 rounded-xl bg-slate-50 border border-slate-100 group-hover:scale-110 transition-transform">
            {product.icon}
          </span>
          <div>
            <h3 className="font-bold text-slate-900 text-base leading-snug group-hover:text-blue-600 transition-colors">
              {product.name}
            </h3>
            {/* Rating Stars */}
            <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
              <span className="text-amber-400">★</span>
              <span className="font-semibold text-slate-700">{product.rating}</span>
              <span className="text-slate-400">({product.reviews} reviews)</span>
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-500 mt-2.5 line-clamp-2 leading-relaxed">
          {product.description}
        </p>
      </div>

      {/* Pricing & Cart Action */}
      <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
        <div>
          <span className="text-xs text-slate-400 block font-medium">Price</span>
          <span className="text-lg font-extrabold text-slate-900">
            {formatPrice(product.price)}
          </span>
        </div>

        <button
          type="button"
          onClick={handleAdd}
          disabled={isOutOfStock}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 flex items-center gap-1.5 shadow-sm ${
            isOutOfStock
              ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
              : justAdded
              ? "bg-emerald-600 text-white scale-95"
              : "bg-blue-600 hover:bg-blue-700 text-white hover:shadow"
          }`}
        >
          {justAdded ? (
            <>
              <span>✓</span> Added
            </>
          ) : isOutOfStock ? (
            "Out of Stock"
          ) : (
            <>
              <span>+</span> Add to Cart
            </>
          )}
        </button>
      </div>
    </div>
  );
}
