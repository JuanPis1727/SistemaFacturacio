import React, { useState, useEffect } from 'react';
import { fetchAPI } from '../../services/api';
import './CierresDia.css';

const CierresDia = () => {
  const [cierres, setCierres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCierre, setSelectedCierre] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [efectivoManual, setEfectivoManual] = useState('');
  const [notas, setNotas] = useState('');
  const [fechaFiltro, setFechaFiltro] = useState('');

  // Cargar historial de cierres
  useEffect(() => {
    cargarCierres();
  }, []);

  const cargarCierres = async () => {
    try {
      setLoading(true);
      // CAMBIADO: Usar /api/cierres en lugar de /cierres-dia
      const res = await fetchAPI('/cierres');
      console.log('Respuesta del servidor:', res);
      
      if (res.success) {
        setCierres(res.data);
      } else {
        setError(res.message || 'Error al cargar los cierres');
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleCierre = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      const cierreData = {
        usuario_id: 1, // ID del usuario actual (deberías obtenerlo del contexto/auth)
        efectivo_manual: parseFloat(efectivoManual),
        notas: notas || 'Cierre de caja'
      };
      
      // CAMBIADO: Usar /api/cierres en lugar de /cierres-dia para POST
      const res = await fetchAPI('/cierres', {
        method: 'POST',
        body: JSON.stringify(cierreData)
      });
      
      if (res.success) {
        alert('Cierre registrado exitosamente');
        setEfectivoManual('');
        setNotas('');
        setShowModal(false);
        cargarCierres(); // Recargar la lista
      } else {
        alert(res.message || 'Error al registrar cierre');
      }
    } catch (err) {
      console.error('Error:', err);
      alert('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const verDetalle = (cierre) => {
    setSelectedCierre(cierre);
  };

  const cerrarModal = () => {
    setSelectedCierre(null);
  };

  if (loading && cierres.length === 0) {
    return <div className="loading">Cargando cierres...</div>;
  }

  return (
    <div className="cierres-dia-container">
      <div className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <h1>Historial de Cierres</h1>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <label style={{ fontWeight: 'bold' }}>Filtrar por fecha:</label>
          <input 
            type="date" 
            value={fechaFiltro}
            onChange={(e) => setFechaFiltro(e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
          {fechaFiltro && (
            <button className="btn-secondary" onClick={() => setFechaFiltro('')}>Limpiar</button>
          )}
          <button 
            className="btn-primary"
            onClick={() => setShowModal(true)}
          >
            Nuevo Cierre
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="cierres-table">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Fecha</th>
              <th>Total Facturación</th>
              <th>Efectivo Manual</th>
              <th>Facturas</th>
              <th>Notas</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cierres.filter(cierre => {
              if (!fechaFiltro) return true;
              const cierreDate = new Date(cierre.creado_en || cierre.fecha);
              // Format to YYYY-MM-DD
              const formattedDate = cierreDate.getFullYear() + '-' + String(cierreDate.getMonth() + 1).padStart(2, '0') + '-' + String(cierreDate.getDate()).padStart(2, '0');
              return formattedDate === fechaFiltro;
            }).map((cierre) => (
              <tr key={cierre.id}>
                <td>{cierre.id}</td>
                <td>{new Date(cierre.creado_en || cierre.fecha).toLocaleString()}</td>
                <td>${cierre.total_facturacion?.toLocaleString() || 0}</td>
                <td>${cierre.efectivo_manual?.toLocaleString() || 0}</td>
                <td>{cierre.facturas_procesadas || 0}</td>
                <td>{cierre.notas || '-'}</td>
                <td>
                  <button 
                    className="btn-detail"
                    onClick={() => verDetalle(cierre)}
                  >
                    Ver Detalle
                  </button>
                </td>
              </tr>
            ))}
            {cierres.length > 0 && cierres.filter(cierre => {
              if (!fechaFiltro) return true;
              const cierreDate = new Date(cierre.creado_en || cierre.fecha);
              const formattedDate = cierreDate.getFullYear() + '-' + String(cierreDate.getMonth() + 1).padStart(2, '0') + '-' + String(cierreDate.getDate()).padStart(2, '0');
              return formattedDate === fechaFiltro;
            }).length === 0 && (
              <tr><td colSpan="7" style={{textAlign: 'center', padding: '1rem'}}>No hay cierres para esta fecha.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal para nuevo cierre */}
      {showModal && (
        <div className="modal">
          <div className="modal-content">
            <h2>Registrar Nuevo Cierre</h2>
            <form onSubmit={handleCierre}>
              <div className="form-group">
                <label>Efectivo Manual:</label>
                <input
                  type="number"
                  value={efectivoManual}
                  onChange={(e) => setEfectivoManual(e.target.value)}
                  required
                  placeholder="0"
                />
              </div>
              <div className="form-group">
                <label>Notas (opcional):</label>
                <textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  rows="3"
                />
              </div>
              <div className="modal-buttons">
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Procesando...' : 'Registrar Cierre'}
                </button>
                <button 
                  type="button" 
                  className="btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de detalle */}
      {selectedCierre && (
        <div className="modal">
          <div className="modal-content">
            <h2>Detalle del Cierre #{selectedCierre.id}</h2>
            <div className="detalle-info">
              <p><strong>Fecha:</strong> {new Date(selectedCierre.fecha).toLocaleString()}</p>
              <p><strong>Total Facturación:</strong> ${selectedCierre.total_facturacion?.toLocaleString() || 0}</p>
              <p><strong>Efectivo Manual:</strong> ${selectedCierre.efectivo_manual?.toLocaleString() || 0}</p>
              <p><strong>Diferencia:</strong> ${selectedCierre.diferencia?.toLocaleString() || 0}</p>
              <p><strong>Facturas Procesadas:</strong> {selectedCierre.facturas_procesadas || 0}</p>
              <p><strong>Notas:</strong> {selectedCierre.notas || 'Sin notas'}</p>
              <p><strong>Creado:</strong> {new Date(selectedCierre.creado_en).toLocaleString()}</p>
            </div>
            <button className="btn-secondary" onClick={cerrarModal}>
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CierresDia;
