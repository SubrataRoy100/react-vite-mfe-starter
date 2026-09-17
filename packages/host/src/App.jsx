import React from "react";
import { Route, Routes } from "react-router";
import LoadingFallback from "./components/LoadingFallback";

import Navbar from "./components/Navbar";
import RetriableRemote from "./components/RetriableRemote";

const LandingPage = React.lazy(() => import("./pages/LandingPage"));

function App() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <div className="flex-1">
        <Routes>
          {/* Main host home landing route */}
          <Route
            path="/"
            element={
              <React.Suspense fallback={<LoadingFallback message="Loading Host Shell..." />}>
                <LandingPage />
              </React.Suspense>
            }
          />

          {/* Wildcard allows the remote service to handle its own inner pages */}
          <Route
            path="/demo/*"
            element={
              <RetriableRemote
                loader={() => import("demoService/App")}
                remoteName="Demo Service Module"
                fallbackMessage="Streaming Demo Service Micro-Frontend..."
              />
            }
          />
        </Routes>
      </div>
    </div>
  );
}

export default App;
