import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { LaunchSummary } from './routes/LaunchSummary';
import { Live } from './routes/Live';
import { Overview } from './routes/Overview';
import { Review } from './routes/Review';
import './styles/tokens.css';

/*
 * One real URL per screen, so the demo can be linked to at any point in the
 * story and a reload lands where it left off. `vercel.json` rewrites every
 * path to this file, which is what keeps `/review/launch` and `/live` from
 * 404ing on the static host.
 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/overview" element={<Overview />} />
        <Route path="/review" element={<Review />} />
        <Route path="/review/launch" element={<LaunchSummary />} />
        <Route path="/live" element={<Live />} />
        <Route path="*" element={<Navigate to="/overview" replace />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
