// src/App.jsx
import React from 'react';
import Auth from './Auth';
import Map from './Map';

function App() {
  console.log('✅ App loaded');
  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
      <Auth />   {/* ここでログインUIを表示 */}
      <Map />    {/* Map があっても Auth が常に上に表示される */}
    </div>
  );
}

export default App;
