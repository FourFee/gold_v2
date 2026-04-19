// gold/src/index.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import MainLayout from "./pages/MainLayout";
import ErrorBoundary from "./components/ErrorBoundary"; // ✅ เพิ่มตรงนี้

import PawnPage from "./pages/PawnPage";
import BarGoldPage from "./pages/BarGoldPage";
import OrnamentGoldPage from "./pages/OrnamentGoldPage";
import PawnList from "./pages/PawnList";
import BarGoldList from "./pages/BarGoldList";
import OrnamentGoldList from "./pages/OrnamentGoldList";
import Dashboard from "./pages/Dashboard"; 
import AllGoldTransactionsList from './pages/AllGoldTransactionsList';
import AllGoldTransactionsPage from './pages/AllGoldTransactionsPage';
import BarGoldExchange from "./pages/BarGoldExchange";
import BarGoldExchangeHistory from "./pages/BarGoldExchangeHistory";

import ThemeContextProvider from "./layout/ThemeContext";

const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode>
    <ErrorBoundary>  {/* ✅ เพิ่มตรงนี้ */}
      <ThemeContextProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<MainLayout />}>
              <Route index element={<Dashboard />} />   
              <Route path="pawn" element={<PawnPage />} />
              <Route path="bar" element={<BarGoldPage />} />
              <Route path="ornament" element={<OrnamentGoldPage />} />
              <Route path="all-transactions-create" element={<AllGoldTransactionsPage />} />
              <Route path="pawn-list" element={<PawnList />} />
              <Route path="bar-list" element={<BarGoldList />} />
              <Route path="ornament-list" element={<OrnamentGoldList />} />
              <Route path="all-transactions-list" element={<AllGoldTransactionsList />} />
              <Route path="/bar-gold-exchange" element={<BarGoldExchange />} /> 
              <Route path="/bar-gold-exchange-history" element={<BarGoldExchangeHistory />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ThemeContextProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
