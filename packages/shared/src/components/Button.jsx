import React from "react";

/**
 * Reusable Button primitive shared across the host shell and every remote
 * micro-frontend, so button styling only has to live and be maintained once.
 */
export function Button({
  children,
  onClick,
  variant = "primary",
  type = "button",
  className = "",
  ...props
}) {
  const baseStyles =
    "inline-flex items-center justify-center rounded-lg px-4 py-2 text-xs font-semibold transition shadow-sm active:scale-95 disabled:opacity-50";

  const variants = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white",
    secondary: "bg-slate-200 hover:bg-slate-300 text-slate-700",
    danger: "bg-rose-600 hover:bg-rose-700 text-white",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      className={`${baseStyles} ${variants[variant] || variants.primary} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;
