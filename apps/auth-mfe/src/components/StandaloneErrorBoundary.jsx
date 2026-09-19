import React from "react";

/**
 * Lightweight ErrorBoundary component for standalone mode.
 * Catches unhandled runtime exceptions inside authMfe and renders
 * a graceful fallback UI with a reset button, preventing blank screens.
 */
export default class StandaloneErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[StandaloneErrorBoundary] Caught error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[200px] rounded-xl border border-rose-200 bg-rose-50/80 p-6 text-slate-800 shadow-sm my-6 max-w-2xl mx-auto">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div className="flex-1">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-base font-bold text-rose-900">
                  Authentication Service Exception Caught
                </h3>
                <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded bg-rose-100 text-rose-700 font-semibold">
                  Standalone Error Boundary
                </span>
              </div>

              <p className="mt-1 text-xs text-rose-700 leading-relaxed">
                An uncaught runtime exception occurred inside the remote
                service. In standalone development mode, this boundary prevents
                full page collapse.
              </p>

              {this.state.error?.message && (
                <div className="mt-3 p-2.5 rounded-lg bg-white/90 border border-rose-200 font-mono text-xs text-rose-800 overflow-x-auto">
                  {this.state.error.message}
                </div>
              )}

              <div className="mt-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={this.handleReset}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition active:scale-95 cursor-pointer"
                >
                  <span>🔄</span>
                  <span>Reset Remote App</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
