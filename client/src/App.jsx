import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Spin from './pages/Spin';
import Members from './pages/Members';
import History from './pages/History';
import Rounds from './pages/Rounds';
import Settings from './pages/Settings';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="spin" element={<Spin />} />
        <Route path="members" element={<Members />} />
        <Route path="history" element={<History />} />
        <Route path="rounds" element={<Rounds />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
