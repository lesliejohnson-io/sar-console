import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Review } from './routes/Review';
import './styles/tokens.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/review" element={<Review />} />
        <Route path="*" element={<Navigate to="/review" replace />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
