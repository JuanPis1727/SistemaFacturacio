import React, { useState, useEffect } from 'react';
import { DollarSign, FileText, CheckCircle, Clock } from 'lucide-react';
import { fetchAPI } from '../../services/api';
import './Dashboard.css';

export default function Dashboard() {
  const [facturas, setFacturas] = useState([]);
  const [abonos, setAbonos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarFacturas();
  }, []);

  const cargarFacturas = async () => {
    setLoading(true);
    const resFacturas = await fetchAPI('/facturas');
    if (resFacturas.success) {
      setFacturas(resFacturas.data || []);
    }
    const resAbonos = await fetchAPI('/abonos');
    if (resAbonos.success) {
      setAbonos(resAbonos.data || []);
    }
    setLoading(false);
  };

  const isToday = (dateString) => {
    if (!dateString) return false;
    const d = new Date(dateString);
    const today = new Date();
    return d.getDate() === today.getDate() &&
           d.getMonth() === today.getMonth() &&
           d.getFullYear() === today.getFullYear();
  };

  const facturasHoy = facturas.filter(f => isToday(f.fecha));
  const abonosHoy = abonos.filter(a => isToday(a.fecha_abono || a.fecha));

  const ingresosContado = facturasHoy
    .filter(f => f.estado?.toLowerCase() !== 'anulada' && f.estado?.toLowerCase() !== 'pendiente' && f.tipo_venta?.toLowerCase() !== 'crédito' && f.tipo_venta?.toLowerCase() !== 'credito')
    .reduce((acc, f) => acc + (Number(f.total) || 0), 0);

  const ingresosAbonos = abonosHoy.reduce((acc, a) => acc + (Number(a.monto) || 0), 0);
  const ingresosTotales = ingresosContado + ingresosAbonos;

  const ingresosPendientes = facturasHoy.filter(f => f.estado?.toLowerCase() === 'pendiente' || f.tipo_venta?.toLowerCase() === 'crédito').reduce((acc, f) => acc + (Number(f.total) || 0), 0);
  const facturasExitosas = facturasHoy.filter(f => f.estado?.toLowerCase().startsWith('pagad')).length + abonosHoy.length;

  return (
    <div className="dashboard-container">
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{background: 'linear-gradient(135deg, #10b981, #059669)'}}>
            <DollarSign size={28} />
          </div>
          <div className="stat-info">
            <h3>Ingresos (Hoy)</h3>
            <p>${ingresosTotales.toLocaleString()}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{background: 'linear-gradient(135deg, #f59e0b, #d97706)'}}>
            <Clock size={28} />
          </div>
          <div className="stat-info">
            <h3>Pendiente (Hoy)</h3>
            <p>${ingresosPendientes.toLocaleString()}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{background: 'linear-gradient(135deg, #3b82f6, #2563eb)'}}>
            <FileText size={28} />
          </div>
          <div className="stat-info">
            <h3>Facturas (Hoy)</h3>
            <p>{facturasHoy.length}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)'}}>
            <CheckCircle size={28} />
          </div>
          <div className="stat-info">
            <h3>Completadas (Hoy)</h3>
            <p>{facturasExitosas}</p>
          </div>
        </div>
      </div>

      <div className="recent-activity">
        <h2>Últimas Ventas ({loading ? 'Cargando...' : 'Actualizado'})</h2>
        <table className="activity-table">
          <thead>
            <tr>
              <th>Número</th>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Total</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {facturas.slice(0, 5).map(factura => (
              <tr key={factura.id}>
                <td style={{fontFamily: 'monospace'}}>{factura.numero}</td>
                <td>{new Date(factura.fecha).toLocaleDateString()}</td>
                <td>{factura.cliente_nombre || 'Cliente Final'}</td>
                <td style={{fontWeight: 'bold'}}>${factura.total.toLocaleString()}</td>
                <td>
                  <span className={`badge ${factura.estado.toLowerCase()}`}>
                    {factura.estado}
                  </span>
                </td>
              </tr>
            ))}
            {facturas.length === 0 && !loading && (
              <tr>
                <td colSpan="5" style={{textAlign: 'center', padding: '2rem'}}>No hay ventas registradas aún.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
