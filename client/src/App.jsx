import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import SplashScreen from './components/SplashScreen.jsx';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import BusinessDashboard from './pages/BusinessDashboard.jsx';
import BusinessRegister from './pages/BusinessRegister.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import AdminCommand from './pages/AdminCommand.jsx';
import ExploreMap from './components/ExploreMap.jsx';

function Protected({ children, admin = false }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (admin && user.role !== 'admin') return <Navigate to="/explore" replace />;
  return children;
}

export default function App() {
  return (
    <>
      <SplashScreen />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/explore" element={<ExploreMap />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Protected><BusinessDashboard /></Protected>} />
        <Route path="/daftar-usaha" element={<Protected><BusinessRegister /></Protected>} />
        <Route path="/admin" element={<Protected admin><AdminDashboard /></Protected>} />
        <Route path="/admin/peta" element={<Protected admin><AdminCommand /></Protected>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
