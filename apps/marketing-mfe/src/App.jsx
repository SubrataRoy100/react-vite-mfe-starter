import "./index.css";
import React from "react";
import { Routes, Route } from "react-router";

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <div className="p-6 rounded-xl bg-linear-to-r from-indigo-50 to-purple-50 border border-indigo-200 text-indigo-950">
            <h2 className="text-xl font-bold mb-2">
              🚀 Marketing Micro-Frontend
            </h2>
            <p className="text-indigo-700">
              Hello from Landing page (styled with Tailwind CSS v4)
            </p>
          </div>
        }
      />
    </Routes>
  );
}
