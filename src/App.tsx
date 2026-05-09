import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProductsPage from './pages/ProductsPage';
import MaintenancePage from './pages/MaintenancePage';
import ImportPage from './pages/ImportPage';

function App() {
  return (
    <Router>
      <div className="app-container">
        <Navbar />
        
        <main className="main-content">
          <header className="top-header">
            <div className="logo">PRESTASHOPFRONT</div>
            <div className="search-bar">
              <input type="text" placeholder="Rechercher (ex. : référence produit, nom du client...)" />
            </div>
            <div className="user-profile"></div>
          </header>

          <Routes>
            <Route path="/" element={<Navigate to="/products" />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/maintenance" element={<MaintenancePage />} />
            <Route path="/import" element={<ImportPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
