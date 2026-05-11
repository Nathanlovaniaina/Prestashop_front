import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProductsPage from './pages/ProductsPage';
import MaintenancePage from './pages/MaintenancePage';
import ImportPage from './pages/ImportPage';
import LoginPage from './pages/LoginPage';
import { LoginService } from './services/LoginService';

/**
 * Composant pour protéger les routes d'administration
 */
const ProtectedRoute = () => {
  if (!LoginService.isAuthenticated()) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
};

const AdminLayout = () => {
  return (
    <div className="app-container">
      <Navbar />
      <main className="main-content">
        <header className="top-header">
          <div className="logo">PRESTASHOPFRONT</div>
          <div className="search-bar">
            <input type="text" placeholder="Rechercher (ex. : référence produit, nom du client...)" />
          </div>
          <div className="user-profile" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button 
              onClick={() => {
                LoginService.logout();
                window.location.href = '/';
              }}
              style={{
                background: 'none',
                border: '1px solid #444',
                color: '#fff',
                padding: '4px 8px',
                borderRadius: '3px',
                fontSize: '11px',
                cursor: 'pointer'
              }}
            >
              Déconnexion
            </button>
          </div>
        </header>
        <div style={{ padding: '0 30px 30px' }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Login Page as Root */}
        <Route path="/" element={<LoginPage />} />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AdminLayout />}>
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/maintenance" element={<MaintenancePage />} />
            <Route path="/import" element={<ImportPage />} />
            <Route path="/admin" element={<Navigate to="/products" replace />} />
          </Route>
        </Route>

        {/* Fallback to root (login) */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
