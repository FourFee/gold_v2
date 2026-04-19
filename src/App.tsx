// gold/src/App.tsx
import React from 'react';
import logo from './logo.svg';
import { Link } from "react-router-dom";

function App() {
  return (
    <div className="p-6 max-w-xl mx-auto space-y-4 text-center">
      <h1 className="text-3xl font-bold">🏠 ระบบจัดการทอง</h1>
      <div className="grid gap-3">
        <Link to="/pawn" className="block bg-yellow-100 p-3 rounded">📌 จำนำทอง</Link>
        <Link to="/bar" className="block bg-yellow-100 p-3 rounded">🪙 ซื้อขายทองแท่ง</Link>
        <Link to="/ornament" className="block bg-yellow-100 p-3 rounded">💍 ซื้อขายทองรูปพรรณ</Link>
        <Link to="/pawn-list" className="block bg-gray-200 p-3 rounded">📄 รายการจำนำทอง</Link>
        <Link to="/bar-list" className="block bg-gray-200 p-3 rounded">📄 รายการทองแท่ง</Link>
        <Link to="/ornament-list" className="block bg-gray-200 p-3 rounded">📄 รายการทองรูปพรรณ</Link>
      </div>
    </div>
  );
}

export default App;
