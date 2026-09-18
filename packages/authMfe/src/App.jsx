import React from "react";
import { Route, Routes } from "react-router";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<div>Hello from Authentication page</div>} />
    </Routes>
  );
}
