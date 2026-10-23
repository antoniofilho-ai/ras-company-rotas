import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AdminPage } from './pages/AdminPage.jsx';
import { VisitorPage } from './pages/VisitorPage.jsx';
import { DestinationListPage } from './pages/DestinationListPage.jsx';
import { HomePage } from './pages/HomePage.jsx';
import { PublicHomePage } from './pages/PublicHomePage.jsx';

const PUBLIC_STATIC = import.meta.env.VITE_PUBLIC_STATIC === 'true';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={PUBLIC_STATIC ? <PublicHomePage /> : <HomePage />} />
        {!PUBLIC_STATIC && <Route path="/admin" element={<AdminPage />} />}
        <Route path="/v/:slug" element={<DestinationListPage />} />
        <Route path="/v/:slug/local/:destinoId" element={<VisitorPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
