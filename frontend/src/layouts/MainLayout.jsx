import React, { useContext, useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Box, Users, CreditCard, LogOut, PackagePlus, Calculator, PiggyBank, UserCog, Settings, Menu, X, Truck, FileText, ArrowLeftRight } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { fetchAPI } from '../services/api';
import './MainLayout.css';

export default function MainLayout() {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [configuracion, setConfiguracion] = useState(null);

  useEffect(() => {
    const fetchConfig = async () => {
      const res = await fetchAPI('/configuracion');
      if (res.success && res.data) {
        setConfiguracion(res.data);
      }
    };
    fetchConfig();
  }, []);

  const isAdmin = user?.rol?.toLowerCase() === 'admin';

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/': return 'Dashboard Analítico';
      case '/pos': return 'Punto de Venta (POS)';
      case '/productos': return 'Catálogo de Productos';
      case '/inventario': return 'Entradas y Stock';
      case '/clientes': return 'Gestión de Clientes';
      case '/abonos': return 'Créditos';
      case '/historial': return 'Historial de Ventas';
      case '/cierres': return 'Venta del Día';
      case '/proveedores': return 'Gestión de Proveedores';
      case '/cierres-dia': return 'Cierre del Día';
      case '/usuarios': return 'Gestión de Personal';
      case '/devoluciones': return 'Módulo de Devoluciones';
      default: return 'JIZFact';
    }
  };

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <div className="layout-container">
      {/* Mobile Header (Hamburger Menu) */}
      <div className="mobile-header">
        <div className="sidebar-logo" style={{letterSpacing: '2px', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '8px'}}>
          JIZFact
        </div>
        <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-logo desktop-only" style={{letterSpacing: '2px', fontWeight: '900', fontSize: '1.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'}}>
          JIZFact
        </div>
        
        <nav className="nav-menu">
          <NavLink to="/" onClick={closeMobileMenu} className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </NavLink>
          
          <NavLink to="/pos" onClick={closeMobileMenu} className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
            <ShoppingCart size={20} />
            <span>Punto de Venta</span>
          </NavLink>

          <NavLink to="/productos" onClick={closeMobileMenu} className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
            <Box size={20} />
            <span>Catálogo</span>
          </NavLink>

          <NavLink to="/inventario" onClick={closeMobileMenu} className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
            <PackagePlus size={20} />
            <span>Ingreso Almacén</span>
          </NavLink>

          <NavLink to="/clientes" onClick={closeMobileMenu} className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
            <Users size={20} />
            <span>Gestión Clientes</span>
          </NavLink>

          <NavLink to="/abonos" onClick={closeMobileMenu} className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
            <PiggyBank size={20} />
            <span>Créditos</span>
          </NavLink>

          <NavLink to="/historial" onClick={closeMobileMenu} className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
            <CreditCard size={20} />
            <span>Historial Ventas</span>
          </NavLink>

          <NavLink to="/cierres-dia" onClick={closeMobileMenu} className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
            <FileText size={20} />
            <span>Cierre del Día</span>
          </NavLink>

          <NavLink to="/devoluciones" onClick={closeMobileMenu} className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
            <ArrowLeftRight size={20} />
            <span>Devoluciones</span>
          </NavLink>

          {isAdmin && (
            <>
              <div className="nav-divider" />
              <NavLink to="/proveedores" onClick={closeMobileMenu} className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
                <Truck size={20} />
                <span>Proveedores</span>
              </NavLink>

              <NavLink to="/usuarios" onClick={closeMobileMenu} className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
                <UserCog size={20} />
                <span>Usuarios</span>
              </NavLink>
            </>
          )}
        </nav>

      </aside>

      {/* Main Content */}
      <main className="main-content-area" onClick={() => isMobileMenuOpen && closeMobileMenu()}>
        <header className="topbar">
          <h1 className="page-title">{getPageTitle()}</h1>
          <div className="user-profile">
            <div className="avatar" style={{color: 'white'}}>
              {user?.nombre?.charAt(0).toUpperCase()}
            </div>
            <div className="user-info" style={{display: 'flex', flexDirection: 'column'}}>
              <span style={{fontWeight: 600, color: '#1e293b'}}>{user?.nombre}</span>
              <span style={{fontSize: '0.8rem', color: '#64748b', textTransform: 'capitalize'}}>{user?.rol}</span>
            </div>
            <button className="logout-btn-top" onClick={logout} title="Cerrar Sesión">
              <LogOut size={20} />
              <span className="logout-text">Salir</span>
            </button>
          </div>
        </header>

        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
