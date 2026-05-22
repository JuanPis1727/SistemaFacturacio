import React, { useState, useEffect } from 'react';
import { Eye, Printer, XCircle } from 'lucide-react';
import { fetchAPI } from '../../services/api';

export default function Historial() {
  const [facturas, setFacturas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [facturaSeleccionada, setFacturaSeleccionada] = useState(null);
  
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, fechaInicio, fechaFin]);

  useEffect(() => {
    cargarFacturas();
  }, []);

  const cargarFacturas = async () => {
    setLoading(true);
    const res = await fetchAPI('/facturas');
    if (res.success) {
      // Orden LIFO (más recientes primero)
      const sortedData = res.data.sort((a, b) => new Date(b.fecha) - new Date(a.fecha) || b.id - a.id);
      setFacturas(sortedData);
    }
    setLoading(false);
  };

  const abrirFactura = async (id) => {
    const res = await fetchAPI(`/facturas/${id}`);
    if (res.success) {
      setFacturaSeleccionada(res.data);
    } else {
      alert("Error al obtener los detalles de la factura");
    }
  };

  const facturasFiltradas = facturas.filter(f => {
    if (!fechaInicio && !fechaFin) return true;
    const fDate = new Date(f.fecha);
    
    if (fechaInicio) {
      const start = new Date(fechaInicio);
      // Ajuste de zona horaria básico manejando GMT
      start.setMinutes(start.getMinutes() + start.getTimezoneOffset());
      start.setHours(0, 0, 0, 0);
      if (fDate < start) return false;
    }
    if (fechaFin) {
      const end = new Date(fechaFin);
      end.setMinutes(end.getMinutes() + end.getTimezoneOffset());
      end.setHours(23, 59, 59, 999);
      if (fDate > end) return false;
    }
    
    // Global filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const match = (f.numero && String(f.numero).toLowerCase().includes(term)) ||
                    (f.id && String(f.id).includes(term)) ||
                    (f.cliente_nombre && String(f.cliente_nombre).toLowerCase().includes(term)) ||
                    (f.total && String(f.total).includes(term)) ||
                    (f.estado && String(f.estado).toLowerCase().includes(term));
      if (!match) return false;
    }

    return true;
  });

  // Paginación
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = facturasFiltradas.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(facturasFiltradas.length / itemsPerPage);

  const nextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const prevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  return (
    <div className="crud-container">
      <div className="crud-header" style={{ alignItems: 'flex-end' }}>
        <div>
           <h2>Historial de Ventas</h2>
           <p style={{color: 'var(--text-muted)'}}>Revisa e imprime facturas pasadas.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', background: 'rgba(0,0,0,0.2)', padding:'10px', borderRadius:'8px', flexWrap: 'wrap' }}>
           <div>
             <label style={{display:'block', fontSize:'0.8rem', color:'var(--text-muted)'}}>Buscar:</label>
             <input type="text" className="form-control" placeholder="Número, cliente..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
           </div>
           <div>
             <label style={{display:'block', fontSize:'0.8rem', color:'var(--text-muted)'}}>Desde:</label>
             <input type="date" className="form-control" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
           </div>
           <div>
             <label style={{display:'block', fontSize:'0.8rem', color:'var(--text-muted)'}}>Hasta:</label>
             <input type="date" className="form-control" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
           </div>
           { (fechaInicio || fechaFin || searchTerm) && (
              <button className="btn-cancel" style={{alignSelf: 'flex-end', height: '38px', background: 'rgba(255,255,255,0.1)', color: 'white'}} onClick={() => {setFechaInicio(''); setFechaFin(''); setSearchTerm('');}}>
                 Limpiar
              </button>
           )}
        </div>
      </div>

      <div className="crud-table-container no-print">
        <table className="crud-table">
          <thead>
            <tr>
              <th>Número</th>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Monto Total</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.map(f => (
              <tr key={f.id}>
                <td style={{fontFamily: 'monospace'}}>{f.numero || f.id}</td>
                <td>{new Date(f.fecha).toLocaleString()}</td>
                <td>{f.cliente_nombre || 'Consumidor Final'}</td>
                <td style={{fontWeight: 'bold', color: '#10b981'}}>${f.total.toLocaleString()}</td>
                <td>
                  <span className={`badge ${f.estado.toLowerCase().startsWith('pag') ? 'pagado' : 'pendiente'}`}>
                    {f.estado}
                  </span>
                </td>
                <td>
                  <div className="crud-actions" style={{display: 'flex', gap: '10px'}}>
                    <button className="primary-btn" style={{ padding: '6px 16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }} title="Ver e Imprimir" onClick={() => abrirFactura(f.id)}>
                       <Eye size={16} /> Ver
                    </button>
                    <button className="primary-btn" style={{ padding: '6px 16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white' }} title="Imprimir Directo" onClick={() => { abrirFactura(f.id).then(() => setTimeout(() => window.print(), 500)) }}>
                       <Printer size={16} /> Print
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {facturasFiltradas.length === 0 && !loading && (
               <tr><td colSpan="6" style={{textAlign:'center', padding: '2rem'}}>No hay facturas en este rango de fechas o búsqueda.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1rem', marginBottom: '2rem' }}>
          <button onClick={prevPage} disabled={currentPage === 1} className="primary-btn" style={{ background: currentPage === 1 ? '#ccc' : '#3b82f6', color: 'white', padding: '8px 16px' }}>
            &laquo; Anterior
          </button>
          <span style={{ fontWeight: 'bold' }}>Página {currentPage} de {totalPages}</span>
          <button onClick={nextPage} disabled={currentPage === totalPages} className="primary-btn" style={{ background: currentPage === totalPages ? '#ccc' : '#3b82f6', color: 'white', padding: '8px 16px' }}>
            Siguiente &raquo;
          </button>
        </div>
      )}

      {facturaSeleccionada && (
        <div className="modal-overlay">
          <div className="modal-content invoice-modal">
            <div className="no-print" style={{display: 'flex', justifyContent: 'space-between', marginBottom:'1.5rem'}}>
               <h2 style={{color: '#10b981', margin: 0}}>Detalle de Factura</h2>
               <button className="close-btn" onClick={() => setFacturaSeleccionada(null)}><XCircle size={24} /></button>
            </div>
            
            <div className="invoice-actions no-print" style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', justifyContent:'center' }}>
              <button onClick={() => window.print()} className="primary-btn" style={{ background: '#3b82f6', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Printer size={18} /> Imprimir Ticket Termico
              </button>
            </div>
            
            {/* Ticket Térmico Nativo */}
            <div id="print-area" className="print-area" style={{ background: '#fff', color: '#000', padding: '10px', borderRadius: '8px', width: '270px', margin: '0 auto', fontSize: '11px', fontFamily: 'monospace' }}>
              <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                <h3 style={{ margin: 0, fontSize: '15px' }}>TICKET DE VENTA</h3>
                <p style={{ margin: 0 }}>Nº {facturaSeleccionada.numero}</p>
                <p style={{ margin: 0 }}>----------------------------</p>
                <p style={{ margin: 0 }}>Fecha: {new Date(facturaSeleccionada.fecha).toLocaleString()}</p>
                {facturaSeleccionada.cliente_nombre && (
                   <p style={{ margin: 0 }}>Cliente: {facturaSeleccionada.cliente_nombre}</p>
                 )}
                <p style={{ margin: 0 }}>Tipo: {(facturaSeleccionada.tipo_venta || '').toUpperCase()}</p>
              </div>
              <p style={{ margin: '8px 0', borderBottom: '1px dashed #000' }}></p>
              
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '11px' }}>
                <thead>
                  <tr>
                    <th style={{ paddingBottom: '5px', width: '12%' }}>Cant</th>
                    <th style={{ paddingBottom: '5px', width: '43%' }}>Desc</th>
                    <th style={{ paddingBottom: '5px', width: '22%', textAlign: 'right' }}>V.Unit</th>
                    <th style={{ paddingBottom: '5px', width: '23%', textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {facturaSeleccionada.items && facturaSeleccionada.items.map((it, idx) => (
                    <tr key={idx}>
                      <td style={{ paddingTop: '5px', verticalAlign: 'top' }}>{it.cantidad}</td>
                      <td style={{ paddingTop: '5px', verticalAlign: 'top', wordBreak: 'break-word' }}>{it.descripcion}</td>
                      <td style={{ paddingTop: '5px', verticalAlign: 'top', textAlign: 'right' }}>${Math.round(it.precio_unitario || 0).toLocaleString()}</td>
                      <td style={{ paddingTop: '5px', verticalAlign: 'top', textAlign: 'right' }}>${Math.round(it.subtotal).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <p style={{ margin: '8px 0', borderBottom: '1px dashed #000' }}></p>
              <div style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '14px' }}>
                TOTAL: ${facturaSeleccionada.total.toLocaleString()}
              </div>
              
              {facturaSeleccionada.metodo_pago && (
                 <div style={{ textAlign: 'right', fontSize: '12px', marginTop:'5px' }}>
                   Metodo: {facturaSeleccionada.metodo_pago.toUpperCase()}
                 </div>
              )}
              
              <div style={{ textAlign: 'center', marginTop: '20px' }}>
                <p style={{ margin: 0 }}>------------------------</p>
                <p style={{ margin: 0 }}>¡Gracias por su compra!</p>
              </div>
            </div>
            
          </div>
        </div>
      )}

    </div>
  );
}
