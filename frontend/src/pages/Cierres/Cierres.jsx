import React, { useState, useEffect } from 'react';
import { Calculator, Save, Calendar, Search } from 'lucide-react';
import { fetchAPI } from '../../services/api';
import './Cierres.css';

export default function Cierres() {
  const [loading, setLoading] = useState(false);
  const [fechaCierre, setFechaCierre] = useState(() => new Date().toLocaleDateString('en-CA'));
  const [facturasTodas, setFacturasTodas] = useState([]);
  const [abonosTodos, setAbonosTodos] = useState([]);
  const [cierresHistorial, setCierresHistorial] = useState([]);
  const [filtroFecha, setFiltroFecha] = useState('');
  
  useEffect(() => {
    cargarDatosGenerales();
  }, []);

  const cargarDatosGenerales = async () => {
    setLoading(true);
    const [resFacturas, resAbonos, resCierres] = await Promise.all([
      fetchAPI('/facturas'),
      fetchAPI('/abonos'),
      fetchAPI('/cierres')
    ]);
    if (resFacturas.success) setFacturasTodas(resFacturas.data);
    if (resAbonos.success) setAbonosTodos(resAbonos.data);
    if (resCierres.success) setCierresHistorial(resCierres.data);
    setLoading(false);
  };

  const facturasFiltradas = facturasTodas.filter(f => {
    const localDate = new Date(f.fecha).toLocaleDateString('en-CA');
    return localDate === fechaCierre && 
           f.estado !== 'Anulada' && 
           f.estado !== 'Pendiente' &&
           f.tipo_venta?.toLowerCase() !== 'crédito' &&
           f.tipo_venta?.toLowerCase() !== 'credito';
  });

  const abonosFiltrados = abonosTodos.filter(a => {
    const localDate = new Date(a.fecha_abono || a.fecha || new Date()).toLocaleDateString('en-CA');
    return localDate === fechaCierre;
  });

  const totalFacturasContado = facturasFiltradas.reduce((acc, f) => acc + (Number(f.total) || 0), 0);
  const totalAbonos = abonosFiltrados.reduce((acc, a) => acc + (Number(a.monto) || 0), 0);
  const totalCalculado = totalFacturasContado + totalAbonos;

  const procesarCierre = async () => {
    if (!window.confirm(`¿Seguro que deseas guardar el cierre de caja para el día ${fechaCierre} por el valor total de $${totalCalculado.toLocaleString()}?`)) return;
    
    setLoading(true);
    const payload = {
      usuario_id: 1, // Obtener del Context si se necesita
      efectivo_manual: totalCalculado, // Lo enviamos igual al sistema para evitar "descuadres", el backend lo procesará exacto
      notas: 'Cierre Total del Día',
      fecha: fechaCierre // YYYY-MM-DD local seleccionado
    };

    const res = await fetchAPI('/cierres', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (res.success) {
      alert("Cierre del día guardado exitosamente.");
      cargarDatosGenerales(); // Recargar historial
    } else {
      alert(res.message || "Error al guardar el cierre.");
    }
    setLoading(false);
  };

  // Filtrar historial por fecha si el usuario ingresó una
  const cierresFiltrados = cierresHistorial.filter(c => {
    if (!filtroFecha) return true;
    const fechaCierre = new Date(c.fecha).toISOString().split('T')[0];
    return fechaCierre === filtroFecha;
  });

  return (
    <div className="cierre-container">
      <h2>Cierres de Caja y Resumen Diario</h2>

      <div className="cierre-cards" style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2fr', gap: '2rem' }}>
        
        {/* Lado Sistema (Guardar cierre de Hoy) */}
        <div className="cierre-card" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', boxShadow: 'none' }}>
          <h3 className="cierre-title" style={{ color: '#0f172a', fontWeight: 'bold' }}>
            <Calculator size={20} style={{display:'inline', marginRight:'8px'}}/> Total Vendido Hoy
          </h3>
          
          <div className="stat" style={{ borderBottom: '1px solid #e2e8f0', color: '#334155' }}>
            <span>Facturas de Contado Pagadas:</span>
            <strong>{facturasFiltradas.length} (${totalFacturasContado.toLocaleString()})</strong>
          </div>
          <div className="stat" style={{ borderBottom: '1px solid #e2e8f0', color: '#334155' }}>
            <span>Abonos / Pagos de Créditos:</span>
            <strong>{abonosFiltrados.length} (${totalAbonos.toLocaleString()})</strong>
          </div>
          <div className="stat" style={{ borderBottom: '1px solid #e2e8f0', color: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Fecha del Cierre:</span>
            <input 
              type="date" 
              className="form-control" 
              style={{ width: 'auto', padding: '4px 8px', fontSize: '0.9rem' }}
              value={fechaCierre}
              onChange={(e) => setFechaCierre(e.target.value)}
            />
          </div>

          <div style={{marginTop: '2rem'}}>
            <p style={{textAlign: 'center', color: 'var(--text-muted)', marginBottom: '5px', fontSize: '0.9rem'}}>Dinero Físico/Efectivo hoy:</p>
            <div className="big-total" style={{ color: '#059669', fontSize: '3rem', margin: '0' }}>
              ${totalCalculado.toLocaleString()}
            </div>
          </div>

          <button 
            className="primary-btn cierre-btn" 
            style={{
              padding: '1.2rem', 
              marginTop: 'auto', 
              fontSize: '1.2rem', 
              fontWeight: 'bold',
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)', 
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              width: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)',
              transition: 'transform 0.2s, background 0.3s'
            }}
            onClick={procesarCierre}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
            disabled={loading || totalCalculado === 0}
          >
            <Save size={20} style={{marginRight: '8px'}} />
            Guardar Cierre del Día
          </button>
        </div>


        {/* Historial de Cierres Diarios */}
        <div className="cierre-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: 'none', display: 'flex', flexDirection: 'column' }}>
           <h3 className="cierre-title" style={{ color: '#0f172a', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <span>Historial de Cierres Guardados</span>
             
             {/* Filtro por fecha */}
             <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', color: '#64748b' }}>
               <Calendar size={18} />
               Filtrar por fecha: 
               <input 
                 type="date" 
                 className="form-control" 
                 style={{ padding: '6px 12px', fontSize: '0.9rem', width: 'auto' }}
                 value={filtroFecha}
                 onChange={(e) => setFiltroFecha(e.target.value)}
               />
               {filtroFecha && (
                 <button className="primary-btn" style={{ background: '#ef4444', padding: '6px 10px' }} onClick={() => setFiltroFecha('')}>Limpiar</button>
               )}
             </div>
           </h3>

           <div className="crud-table-container" style={{ marginTop: '1rem', flex: 1, overflowY: 'auto' }}>
             <table className="crud-table" style={{ width: '100%' }}>
               <thead>
                 <tr>
                   <th style={{ background: '#f8fafc', color: '#334155' }}>ID</th>
                   <th style={{ background: '#f8fafc', color: '#334155' }}>Fecha y Hora</th>
                   <th style={{ background: '#f8fafc', color: '#334155', textAlign: 'center' }}>N° Facturas</th>
                   <th style={{ background: '#f8fafc', color: '#334155', textAlign: 'right' }}>Total Sumado</th>
                 </tr>
               </thead>
               <tbody>
                 {cierresFiltrados.length === 0 ? (
                   <tr>
                     <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                       {filtroFecha ? 'No se encontró ningún cierre guardado en esa fecha.' : 'Aún no hay ningún cierre registrado en el historial.'}
                     </td>
                   </tr>
                 ) : (
                   cierresFiltrados.map(c => (
                     <tr key={c.id}>
                       <td style={{ color: '#64748b', fontWeight: 'bold' }}>#{c.id}</td>
                       <td>{new Date(c.fecha).toLocaleString()}</td>
                       <td style={{ textAlign: 'center' }}>{c.facturas_procesadas}</td>
                       <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#059669' }}>
                         ${Number(c.total_facturacion).toLocaleString()}
                       </td>
                     </tr>
                   ))
                 )}
               </tbody>
             </table>
           </div>

        </div>

      </div>
    </div>
  );
}
