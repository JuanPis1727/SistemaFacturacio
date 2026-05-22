import React, { useState, useEffect } from 'react';
import { CreditCard, History, AlertCircle, Eye, XCircle, DollarSign, Calendar, Package } from 'lucide-react';
import { fetchAPI } from '../../services/api';
import './Abonos.css';

export default function Abonos() {
  const [clientes, setClientes] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [formData, setFormData] = useState({ monto: '', metodo_pago: 'Efectivo', notas: '' });
  const [loading, setLoading] = useState(false);
  const [busquedaCedula, setBusquedaCedula] = useState('');
  
  const [facturasPendientes, setFacturasPendientes] = useState([]);
  const [facturaDetalle, setFacturaDetalle] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const clientesSugeridos = busquedaCedula.trim() !== ''
    ? clientes.filter(c => 
        Object.values(c).some(val => 
          val && String(val).toLowerCase().includes(busquedaCedula.trim().toLowerCase())
        )
      )
    : [];

  useEffect(() => {
    cargarClientesConDeuda();
  }, []);

  const cargarClientesConDeuda = async () => {
    const res = await fetchAPI('/clientes');
    if (res.success) {
      const deudores = res.data.filter(c => c.deuda_total > 0);
      setClientes(deudores);
    }
  };

  const seleccionarCliente = async (cli) => {
    setClienteSeleccionado(cli);
    setBusquedaCedula('');
    
    const res = await fetchAPI('/facturas');
    if (res.success) {
      const pendientes = res.data.filter(f => f.cliente_id === cli.id && (!f.estado || f.estado.toLowerCase().startsWith('pend')));
      setFacturasPendientes(pendientes);
    }
  };

  const verDetalleFactura = async (id) => {
    const res = await fetchAPI(`/facturas/${id}`);
    if (res.success) {
      setFacturaDetalle(res.data);
      setIsModalOpen(true);
    }
  };

  const procesarAbono = async (e) => {
    e.preventDefault();
    if (!clienteSeleccionado) return;
    
    const montoNumerico = parseFloat(formData.monto);
    if (!montoNumerico || montoNumerico <= 0 || montoNumerico > clienteSeleccionado.deuda_total) return;
    
    setLoading(true);
    // Asignar al primer ID de factura pendiente, si hay, o 1 por default.
    const fId = facturasPendientes.length > 0 ? facturasPendientes[0].id : 1;

    const payload = {
      factura_id: fId,
      cliente_id: clienteSeleccionado.id,
      monto: montoNumerico,
      metodo_pago: formData.metodo_pago,
      notas: formData.notas
    };

    const res = await fetchAPI('/abonos', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (res.success) {
      window.Swal.fire({
        title: '¡Abono registrado!',
        text: `¡Abono de $${payload.monto.toLocaleString()} registrado con éxito!`,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
      const nuevaDeuda = clienteSeleccionado.deuda_total - payload.monto;
      setClienteSeleccionado({ ...clienteSeleccionado, deuda_total: nuevaDeuda });
      
      setFormData({ monto: '', metodo_pago: 'Efectivo', notas: '' });
      cargarClientesConDeuda();
      
      // Update pending facturas to simulate state if debt cleared
      if (nuevaDeuda <= 0) {
        setFacturasPendientes([]);
      }
    } else {
      window.Swal.fire('Error', res.message || "Error procesando el abono", 'error');
    }
    setLoading(false);
  };

  const montoNumerico = parseFloat(formData.monto) || 0;
  const nuevoSaldo = clienteSeleccionado ? clienteSeleccionado.deuda_total - montoNumerico : 0;
  const esMontoInvalido = montoNumerico > (clienteSeleccionado?.deuda_total || 0);

  return (
    <div className="abonos-container">
      <h2>Pago de Cuentas (Créditos y Abonos)</h2>

      <div className="deuda-header">
        <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
          <label style={{display:'block', marginBottom:'0.5rem', color:'var(--text-muted)'}}>
            Escribe nombre, cédula o cualquier dato del cliente para abonar/pagar:
          </label>
          <input 
            type="text" 
            className="form-control" 
            placeholder="Buscar por cédula, nombre, etc..." 
            value={busquedaCedula}
            onChange={(e) => { 
               setBusquedaCedula(e.target.value); 
               setClienteSeleccionado(null); 
               setFacturasPendientes([]);
            }} 
          />
          
          {clientesSugeridos.length > 0 && (
             <div style={{ position: 'absolute', top: '100%', left: 0, width: '100%', background:'#ffffff', padding:'10px', marginTop:'5px', borderRadius:'8px', zIndex: 10, border: '1px solid #cbd5e1', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
               {clientesSugeridos.map(cli => (
                  <div key={cli.id} style={{padding:'10px', cursor:'pointer', borderBottom:'1px solid #e2e8f0', color: '#0f172a', fontWeight: 'bold'}} 
                       onClick={() => seleccionarCliente(cli)}>
                     💳 C.C: {cli.cedula} - {cli.nombre} <span style={{color: '#ef4444'}}>(Debe ${Math.floor(cli.deuda_total).toLocaleString()})</span>
                  </div>
               ))}
             </div>
          )}
        </div>
        
        {clienteSeleccionado && (
          <div style={{textAlign: 'right'}}>
            <div style={{color: '#34d399', fontSize: '0.9rem'}}>✅ {clienteSeleccionado.nombre}</div>
            <div style={{color: 'var(--text-muted)', fontSize: '0.9rem'}}>Deuda Vigente:</div>
            <div className="deuda-amount">${Math.floor(clienteSeleccionado.deuda_total).toLocaleString()}</div>
          </div>
        )}
      </div>

      {clienteSeleccionado && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '2rem' }}>
           
           {/* Lado Derecho: Formulario de Abono y Vista Previa */}
           <div className="abono-form-card" style={{ margin: 0 }}>
             <h3><CreditCard style={{display:'inline', marginRight:'8px'}}/> Registrar Pago</h3>
             <form onSubmit={procesarAbono}>
               <div className="form-group">
                 <label>Cantidad a Abonar ($)</label>
                 <div style={{ position: 'relative' }}>
                    <DollarSign size={20} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input 
                      type="number" 
                      className="form-control" 
                      style={{fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981', paddingLeft: '45px'}}
                      value={formData.monto}
                      onChange={(e) => setFormData({...formData, monto: e.target.value})}
                      required 
                    />
                 </div>
               </div>

               {/* Vista Previa Integradada a lo SaaS */}
               {montoNumerico > 0 && !esMontoInvalido && (
                  <div style={{ background: 'rgba(52, 211, 153, 0.1)', border: '1px solid #34d399', padding: '15px', borderRadius: '8px', marginBottom: '1rem' }}>
                     <h4 style={{ color: '#34d399', marginTop: 0, marginBottom: '10px' }}>Vista Previa de Saldo</h4>
                     <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        <span>Deuda Actual:</span>
                        <span style={{ color: '#ef4444' }}>${Math.floor(clienteSeleccionado.deuda_total).toLocaleString()}</span>
                     </div>
                     <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        <span>Abono:</span>
                        <span style={{ color: '#34d399' }}>-${montoNumerico.toLocaleString()}</span>
                     </div>
                     <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(52, 211, 153, 0.3)', fontWeight: 'bold' }}>
                        <span>Nuevo Saldo:</span>
                        <span style={{ color: nuevoSaldo > 0 ? '#f59e0b' : '#10b981' }}>${Math.floor(nuevoSaldo).toLocaleString()}</span>
                     </div>
                  </div>
               )}

               {esMontoInvalido && (
                 <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', padding: '12px', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem', display: 'flex', gap: '8px', alignItems: 'center' }}>
                   <AlertCircle size={20} />
                   El monto supera la deuda total de este cliente.
                 </div>
               )}

               <div className="form-group">
                 <label>Método de Pago</label>
                 <select 
                   className="form-control"
                   value={formData.metodo_pago}
                   onChange={(e) => setFormData({...formData, metodo_pago: e.target.value})}
                 >
                   <option>Efectivo</option>
                   <option>Transferencia / Nequi</option>
                   <option>Tarjeta</option>
                 </select>
               </div>
               <div className="form-group">
                 <label>Nota / Comprobante (Opcional)</label>
                 <input 
                   type="text" 
                   className="form-control" 
                   placeholder="Ej. Transferencia Bancolombia #12934"
                   value={formData.notas}
                   onChange={(e) => setFormData({...formData, notas: e.target.value})}
                 />
               </div>

               <button type="submit" className="primary-btn" style={{width: '100%', marginTop:'1rem', background: '#10b981'}} disabled={loading || esMontoInvalido || montoNumerico <= 0}>
                 Confirmar Abono
               </button>
             </form>
           </div>

           {/* Lado Izquierdo: Facturas Pendientes (Para el detalle de crédito) */}
            <div className="abono-form-card" style={{ margin: 0, background: '#ffffff', border: '1px solid #e2e8f0' }}>
               <h3 style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginBottom: '15px' }}>
                 <History style={{display:'inline', marginRight:'8px'}}/> Facturas Pendientes ({facturasPendientes.length})
               </h3>
               
               {facturasPendientes.length === 0 ? (
                  <p style={{color: 'var(--text-muted)'}}>No hay facturas vinculadas físicamente, pero tiene un saldo adeudado previo de ${clienteSeleccionado.deuda_total.toLocaleString()}.</p>
               ) : (
                  <div style={{ maxHeight: '420px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                    <table className="crud-table" style={{ width: '100%', margin: 0, borderCollapse: 'collapse' }}>
                      <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1 }}>
                        <tr>
                          <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', fontSize: '0.85rem' }}>Factura</th>
                          <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', fontSize: '0.85rem' }}>Fecha</th>
                          <th style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #e2e8f0', fontSize: '0.85rem' }}>Monto</th>
                          <th style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #e2e8f0', fontSize: '0.85rem' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {facturasPendientes.map(fp => (
                          <tr key={fp.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '10px', fontFamily: 'monospace', fontSize: '0.9rem', color: '#334155', fontWeight: 'bold' }}>#{fp.numero}</td>
                            <td style={{ padding: '10px', fontSize: '0.85rem', color: '#64748b' }}>{new Date(fp.fecha).toLocaleDateString()}</td>
                            <td style={{ padding: '10px', textAlign: 'right', fontSize: '0.9rem', color: '#ef4444', fontWeight: 'bold' }}>${fp.total.toLocaleString()}</td>
                            <td style={{ padding: '10px', textAlign: 'center' }}>
                              <button className="primary-btn" style={{ padding: '4px 10px', fontSize: '0.75rem', background: '#eff6ff', color: '#3b82f6', border: '1px solid #dbeafe', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }} onClick={() => verDetalleFactura(fp.id)} title="Ver Items">
                                <Eye size={14} /> Ver
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
               )}
            </div>
        </div>
      )}

      {/* Modal Detalle de Factura de Crédito */}
      {isModalOpen && facturaDetalle && (
        <div className="modal-overlay">
          <div className="modal-content invoice-modal" style={{ maxWidth: '600px' }}>
            <div className="no-print" style={{display: 'flex', justifyContent: 'space-between', marginBottom:'1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom:'1rem'}}>
               <h2 style={{color: '#0f172a', margin: 0}}>Detalle Factura #{facturaDetalle.numero}</h2>
               <button className="close-btn" style={{color: '#ef4444', border: 'none', background: 'transparent', cursor: 'pointer'}} onClick={() => setIsModalOpen(false)}><XCircle size={28} /></button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem', background: 'rgba(59, 130, 246, 0.1)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
               <div>
                  <span style={{color: 'var(--text-muted)', fontSize: '0.85rem'}}>Cliente:</span>
                  <div style={{fontWeight: 'bold'}}>{facturaDetalle.cliente_nombre}</div>
               </div>
               <div>
                  <span style={{color: 'var(--text-muted)', fontSize: '0.85rem'}}>Fecha Venta:</span>
                  <div style={{display:'flex', alignItems:'center', gap:'5px'}}>
                     <Calendar size={14}/> {new Date(facturaDetalle.fecha).toLocaleDateString()}
                  </div>
               </div>
               <div>
                  <span style={{color: 'var(--text-muted)', fontSize: '0.85rem'}}>Estado:</span>
                  <div><span className={`badge ${facturaDetalle.estado?.toLowerCase().startsWith('pag') ? 'pagado' : 'pendiente'}`}>{facturaDetalle.estado || 'Pendiente / A Crédito'}</span></div>
               </div>
               <div>
                  <span style={{color: 'var(--text-muted)', fontSize: '0.85rem'}}>Total Originario:</span>
                  <div style={{fontWeight: 'bold', color: '#10b981'}}>${facturaDetalle.total.toLocaleString()}</div>
               </div>
            </div>

            <h3 style={{display:'flex', alignItems:'center', gap:'8px', fontSize: '1.2rem', color: '#0f172a'}}><Package size={18}/> Productos Comprados</h3>
            <table className="crud-table" style={{ width: '100%', marginBottom: '2rem' }}>
              <thead>
                <tr>
                  <th style={{padding: '8px', textAlign: 'left', borderBottom: '1px solid #e2e8f0'}}>Item</th>
                  <th style={{padding: '8px', textAlign: 'center', borderBottom: '1px solid #e2e8f0'}}>Cant</th>
                  <th style={{padding: '8px', textAlign: 'right', borderBottom: '1px solid #e2e8f0'}}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {facturaDetalle.items?.map((it, idx) => (
                  <tr key={idx}>
                    <td style={{padding: '8px', color: '#334155'}}>{it.descripcion}</td>
                    <td style={{padding: '8px', textAlign: 'center', color: '#334155'}}>{it.cantidad}</td>
                    <td style={{padding: '8px', textAlign: 'right', color: '#334155'}}>${it.subtotal.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>

          </div>
        </div>
      )}

      {clientes.length === 0 && (
        <div style={{padding: '3rem', textAlign: 'center', color: 'var(--text-muted)'}}>
          <History size={40} style={{marginBottom:'1rem', opacity: 0.5}}/>
          <p>Ningún cliente tiene deudas activas actualmente. 🎉</p>
        </div>
      )}

    </div>
  );
}
