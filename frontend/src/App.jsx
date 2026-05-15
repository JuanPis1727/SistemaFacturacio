import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext } from './context/AuthContext';
import Login from './pages/Login/Login';
import MainLayout from './layouts/MainLayout';
import POS from './pages/POS/POS';
import Dashboard from './pages/Dashboard/Dashboard';
import Productos from './pages/Productos/Productos';
import Clientes from './pages/Clientes/Clientes';
import Historial from './pages/Historial/Historial';
import Inventario from './pages/Inventario/Inventario';
import Abonos from './pages/Abonos/Abonos';
import Usuarios from './pages/Usuarios/Usuarios';
import Proveedores from './pages/Proveedores/Proveedores';
import CierresDia from './pages/CierresDia/CierresDia';

const AdminRoute = ({ children }) => {
  const { user } = useContext(AuthContext);
  if (user?.rol?.toLowerCase() !== 'admin') {
    return <Navigate to="/pos" />;
  }
  return children;
};

function App() {
  const { user, loading } = useContext(AuthContext);

  if (loading) return null;

  const isAdmin = user?.rol?.toLowerCase() === 'admin';

  return (
    <Router>
      <div className="app-background">
        <div className="blobs">
          <div className="blob blob-1"></div>
          <div className="blob blob-2"></div>
          <div className="blob blob-3"></div>
        </div>
        <main className="main-content">
          <Routes>
            <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
            
            {/* Rutas Privadas envueltas en el Layout con Sidebar */}
            <Route element={user ? <MainLayout /> : <Navigate to="/login" />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/pos" element={<POS />} />
              <Route path="/productos" element={<Productos />} />
              <Route path="/clientes" element={<Clientes />} />
              
              <Route path="/inventario" element={<Inventario />} />
              <Route path="/abonos" element={<Abonos />} />
              <Route path="/usuarios" element={<AdminRoute><Usuarios /></AdminRoute>} />
              <Route path="/proveedores" element={<AdminRoute><Proveedores /></AdminRoute>} />
              <Route path="/cierres-dia" element={<CierresDia />} />
              
              <Route path="/historial" element={<Historial />} />
            </Route>

          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
