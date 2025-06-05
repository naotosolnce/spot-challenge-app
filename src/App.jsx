// src/App.jsx
import React from "react";
import Auth from "./Auth";
import Map from "./Map";

export default function App() {
  return (
    <div className="flex flex-col h-screen">
      <div className="flex-none">
        <Auth />
      </div>
      <div className="flex-1">
        <Map />
      </div>
    </div>
  );
}
