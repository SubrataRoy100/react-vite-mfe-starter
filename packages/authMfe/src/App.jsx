import "./index.css";
import React from "react";
import { Route, Routes } from "react-router";

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <div className="p-6 rounded-xl bg-blue-50 border border-blue-200 text-blue-950">
            <h2 className="text-xl font-bold mb-2">🔐 Authentication Micro-Frontend</h2>
            <p className="text-blue-700">Hello from Authentication page (styled with Tailwind CSS)</p>
          </div>
        }
      />
    </Routes>
  );
}
