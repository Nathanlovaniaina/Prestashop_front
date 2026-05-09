import { NavLink } from 'react-router-dom';
import { 
  ShoppingBag, 
  Users, 
  Package, 
  BarChart2, 
  Settings, 
  Database,
  FileUp
} from 'lucide-react';

const Navbar = () => {
  return (
    <nav className="sidebar">
      <div className="sidebar-header" style={{padding: '20px', borderBottom: '1px solid #4a4e55'}}>
        <span className="logo" style={{color: 'white', fontWeight: 'bold'}}>PS Admin</span>
      </div>

      <div className="sidebar-menu">
        <div className="sidebar-category">Menu</div>
        
        <NavLink 
          to="/products" 
          className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
        >
          <Package className="icon" size={16} />
          <span>Catalogue</span>
        </NavLink>

        <NavLink 
          to="/orders" 
          className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
        >
          <ShoppingBag className="icon" size={16} />
          <span>Commandes</span>
        </NavLink>

        <NavLink 
          to="/customers" 
          className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
        >
          <Users className="icon" size={16} />
          <span>Clients</span>
        </NavLink>

        <NavLink 
          to="/stats" 
          className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
        >
          <BarChart2 className="icon" size={16} />
          <span>Statistiques</span>
        </NavLink>

        <div className="sidebar-category">Outils</div>

        <NavLink 
          to="/import" 
          className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
        >
          <FileUp className="icon" size={16} />
          <span>Import CSV</span>
        </NavLink>

        <NavLink 
          to="/maintenance" 
          className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
        >
          <Database className="icon" size={16} />
          <span>Maintenance</span>
        </NavLink>

        <NavLink 
          to="/settings" 
          className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
        >
          <Settings className="icon" size={16} />
          <span>Paramètres</span>
        </NavLink>
      </div>
    </nav>
  );
};

export default Navbar;
