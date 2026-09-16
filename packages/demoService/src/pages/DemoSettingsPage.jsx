import React from "react";
import { Link } from "react-router";
import { Button } from "@mfe/shared";

function DemoSettingsPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-6">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Top Header Section */}
        <div className="p-6 border-b border-slate-100 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight">
              Demo Service Settings
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Manage local configurations and core parameters.
            </p>
          </div>

          {/* Main Return Navigation Link */}
          <Link
            to=".."
            relative="path"
            className="inline-flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors shadow-sm"
          >
            ← Back to Overview
          </Link>
        </div>

        {/* Settings Form Placeholder Body */}
        <div className="p-6 space-y-6">
          {/* Section 1: Endpoint Config */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-900">
              Module Network Parameters
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Target Base URL
                </label>
                <input
                  type="text"
                  disabled
                  value="http://localhost:5001"
                  className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-500 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Share Scope Mode
                </label>
                <input
                  type="text"
                  disabled
                  value="Singleton Premium"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-500 cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Section 2: Toggles */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-900">
              Development Environment Options
            </h3>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div>
                <p className="text-xs font-medium text-slate-800">
                  Verbose Runtime Logging
                </p>
                <p className="text-[11px] text-slate-400">
                  Stream micro-frontend orchestration logs directly to the
                  console.
                </p>
              </div>
              <div className="h-5 w-9 bg-blue-600 rounded-full p-0.5 cursor-pointer flex justify-end items-center">
                <div className="h-4 w-4 bg-white rounded-full shadow-sm" />
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div>
                <p className="text-xs font-medium text-slate-800">
                  Strict Serialization Check
                </p>
                <p className="text-[11px] text-slate-400">
                  Force error validation pipelines during hydration sequences.
                </p>
              </div>
              <div className="h-5 w-9 bg-slate-200 rounded-full p-0.5 cursor-pointer flex justify-start items-center">
                <div className="h-4 w-4 bg-white rounded-full shadow-sm" />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Area */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <Button
            type="button"
            variant="primary"
            onClick={() => alert("Demo settings saved successfully!")}
          >
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}

export default DemoSettingsPage;
