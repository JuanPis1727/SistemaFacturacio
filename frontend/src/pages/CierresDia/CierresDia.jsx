import React, { useState, useEffect, useContext } from 'react';
import { Calendar, Save, Trash2, Plus, Search, ChevronDown, ChevronUp, FileText, TrendingDown, TrendingUp, Eye, Printer, XCircle } from 'lucide-react';
import { fetchAPI } from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import './CierresDia.css';

export default function CierresDia() {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('cierre_actual');
  
  // Tab 1: Cierre Actual (Persistencia Local)
  const [proveedores, setProveedores] = useState([]);
  const [facturas, setFacturas] = useState(() => {
    const saved = localStorage.getItem('cierresDia_facturas');
    return saved ? JSON.parse(saved) : [];
  });
  const [ajustes, setAjustes] = useState(() => {
    const saved = localStorage.getItem('cierresDia_ajustes');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [nuevaFactura, setNuevaFactura] = useState({ proveedor_nombre: '', valor: '', descripcion: '' });
  const [nuevoAjuste, setNuevoAjuste] = useState({ tipo: 'resta', valor: '', descripcion: '' });
  
  // Tab 2: Historial
  const [historial, setHistorial] = useState([]);
  const [filtroMes, setFiltroMes] = useState('');
  const [filtroProveedor, setFiltroProveedor] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  
  // Modal de PDF/Impresión
  const [viewInvoice, setViewInvoice] = useState(null);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    cargarProveedores();
    cargarHistorial();
  }, []);

  // Persistir en LocalStorage
  useEffect(() => {
    localStorage.setItem('cierresDia_facturas', JSON.stringify(facturas));
  }, [facturas]);

  useEffect(() => {
    localStorage.setItem('cierresDia_ajustes', JSON.stringify(ajustes));
  }, [ajustes]);

  const cargarProveedores = async () => {
    const res = await fetchAPI('/proveedores');
    if (res.success) setProveedores(res.data);
  };

  const cargarHistorial = async () => {
    const res = await fetchAPI('/cierres-dia');
    if (res.success) setHistorial(res.data);
  };

  // Lógicas Cierre Actual
  const agregarFactura = () => {
    if (!nuevaFactura.proveedor_nombre || !nuevaFactura.valor) {
      return window.Swal.fire('Atención', 'Ingrese proveedor y valor', 'warning');
    }
    const prov = proveedores.find(p => p.nombre.toLowerCase() === nuevaFactura.proveedor_nombre.toLowerCase());
    const provId = prov ? prov.id : 'N/A';
    
    setFacturas([...facturas, { ...nuevaFactura, proveedor_id: provId, valor: Number(nuevaFactura.valor), id_temp: Date.now() }]);
    setNuevaFactura({ proveedor_nombre: '', valor: '', descripcion: '' });
  };

  const eliminarFactura = (id_temp) => {
    setFacturas(facturas.filter(f => f.id_temp !== id_temp));
  };

  const agregarAjuste = () => {
    if (!nuevoAjuste.valor) {
      return window.Swal.fire('Atención', 'Ingrese el valor del ajuste', 'warning');
    }
    setAjustes([...ajustes, { ...nuevoAjuste, valor: Number(nuevoAjuste.valor), id_temp: Date.now() }]);
    setNuevoAjuste({ tipo: 'resta', valor: '', descripcion: '' });
  };

  const eliminarAjuste = (id_temp) => {
    setAjustes(ajustes.filter(a => a.id_temp !== id_temp));
  };

  const totalFacturas = facturas.reduce((acc, curr) => acc + curr.valor, 0);
  const totalAjustes = ajustes.reduce((acc, curr) => curr.tipo === 'suma' ? acc + curr.valor : acc - curr.valor, 0);
  const totalFinal = totalFacturas + totalAjustes;

  const limpiarCierre = async () => {
    const confirm = await window.Swal.fire({
      title: '¿Limpiar cierre?',
      text: "¿Desea limpiar todos los datos del cierre actual?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonText: 'Cancelar',
      confirmButtonText: 'Sí, limpiar'
    });
    if(confirm.isConfirmed){
      setFacturas([]);
      setAjustes([]);
      localStorage.removeItem('cierresDia_facturas');
      localStorage.removeItem('cierresDia_ajustes');
    }
  };

  const guardarCierre = async () => {
    if (facturas.length === 0) {
      return window.Swal.fire('Atención', 'No hay facturas para cerrar.', 'warning');
    }
    
    const confirm = await window.Swal.fire({
      title: '¿Guardar Cierre Día?',
      text: `¿Guardar cierre día por $${totalFinal.toLocaleString()}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3b82f6',
      cancelButtonText: 'Cancelar',
      confirmButtonText: 'Sí, guardar'
    });
    
    if (!confirm.isConfirmed) return;

    setLoading(true);
    const payload = {
      facturas,
      ajustes,
      total_facturas: totalFacturas,
      total_ajustes: totalAjustes,
      total_final: totalFinal,
      usuario_id: user?.id,
      usuario_nombre: user?.nombre,
      usuario_rol: user?.rol
    };

    const res = await fetchAPI('/cierres-dia', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (res.success) {
      window.Swal.fire({ title: '¡Guardado!', text: 'Cierre del día guardado con éxito', icon: 'success', timer: 1500, showConfirmButton: false });
      setFacturas([]);
      setAjustes([]);
      localStorage.removeItem('cierresDia_facturas');
      localStorage.removeItem('cierresDia_ajustes');
      cargarHistorial();
      setActiveTab('historial');
    } else {
      window.Swal.fire('Error', res.message || 'Error al guardar cierre', 'error');
    }
    setLoading(false);
  };

  const meses = [
    { num: '01', nombre: 'Enero' }, { num: '02', nombre: 'Febrero' }, { num: '03', nombre: 'Marzo' },
    { num: '04', nombre: 'Abril' }, { num: '05', nombre: 'Mayo' }, { num: '06', nombre: 'Junio' },
    { num: '07', nombre: 'Julio' }, { num: '08', nombre: 'Agosto' }, { num: '09', nombre: 'Septiembre' },
    { num: '10', nombre: 'Octubre' }, { num: '11', nombre: 'Noviembre' }, { num: '12', nombre: 'Diciembre' }
  ];

  const filtrarHistorial = () => {
    let filtrado = [...historial];
    if (filtroMes) {
      filtrado = filtrado.filter(c => c.fecha.split('-')[1] === filtroMes);
    }
    if (filtroProveedor) {
      filtrado = filtrado.filter(c => c.facturas.some(f => f.proveedor_id === filtroProveedor));
    }
    return filtrado;
  };

  const cierresFiltrados = filtrarHistorial();
  
  const calcularTotalFiltrado = () => {
    if (!filtroProveedor && !filtroMes) return null;
    let sumaFacturas = 0;
    cierresFiltrados.forEach(cierre => {
      cierre.facturas.forEach(f => {
        if (!filtroProveedor || f.proveedor_id === filtroProveedor) {
          sumaFacturas += Number(f.valor);
        }
      });
    });
    return sumaFacturas;
  };
  const totalFiltrado = calcularTotalFiltrado();

  return (
    <div className="cierres-dia-container fade-in">
      
      <div className="tabs-header no-print">
        <button className={`tab-btn ${activeTab === 'cierre_actual' ? 'active' : ''}`} onClick={() => setActiveTab('cierre_actual')}>
          Cierre Actual
        </button>
        <button className={`tab-btn ${activeTab === 'historial' ? 'active' : ''}`} onClick={() => setActiveTab('historial')}>
          Consultas e Historial
        </button>
      </div>

      {activeTab === 'cierre_actual' && (
        <div className="tab-content" style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) minmax(300px, 1fr)', gap: '1.5rem' }}>
          
          <div className="ingreso-seccion">
             {/* Facturas */}
             <div className="card shadow-sm" style={{ padding: '1.5rem', marginBottom: '1.5rem', background: 'white', borderRadius: '12px' }}>
                <h3 style={{ marginTop: 0, marginBottom: '1rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText size={20} /> Agregar Factura Proveedor
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <input 
                    list="proveedores-list" 
                    className="form-control" 
                    placeholder="Escriba o seleccione un Proveedor..." 
                    value={nuevaFactura.proveedor_nombre} 
                    onChange={(e) => setNuevaFactura({...nuevaFactura, proveedor_nombre: e.target.value})} 
                  />
                  <datalist id="proveedores-list">
                    {proveedores.map(p => <option key={p.id} value={p.nombre} />)}
                  </datalist>
                  <input type="number" className="form-control" placeholder="Valor ($)" value={nuevaFactura.valor || ''} onChange={(e) => setNuevaFactura({...nuevaFactura, valor: e.target.value})} />
                  <input type="text" className="form-control" placeholder="Descripción (Opcional)" value={nuevaFactura.descripcion} onChange={(e) => setNuevaFactura({...nuevaFactura, descripcion: e.target.value})} />
                  <button className="secondary-btn" onClick={agregarFactura} style={{ width: '100%' }}><Plus size={18}/> Agregar a Cierre</button>
                </div>
             </div>
             
             {/* Ajustes */}
             <div className="card shadow-sm" style={{ padding: '1.5rem', background: 'white', borderRadius: '12px' }}>
                <h3 style={{ marginTop: 0, marginBottom: '1rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                   Ajustes al Cierre
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <select className="form-control" value={nuevoAjuste.tipo} onChange={(e) => setNuevoAjuste({...nuevoAjuste, tipo: e.target.value})}>
                    <option value="resta">Restar (Ej: Devolución)</option>
                    <option value="suma">Sumar (Ej: Gasto extra)</option>
                  </select>
                  <input type="number" className="form-control" placeholder="Valor ($)" value={nuevoAjuste.valor || ''} onChange={(e) => setNuevoAjuste({...nuevoAjuste, valor: e.target.value})} />
                  <input type="text" className="form-control" placeholder="Descripción (Opcional)" value={nuevoAjuste.descripcion} onChange={(e) => setNuevoAjuste({...nuevoAjuste, descripcion: e.target.value})} />
                  <button className="secondary-btn" onClick={agregarAjuste} style={{ width: '100%' }}><Plus size={18}/> Agregar Ajuste</button>
                </div>
             </div>
          </div>

          <div className="resumen-seccion card shadow-sm" style={{ padding: '2rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
              <h2 style={{ color: '#0f172a', margin: '0 0 1.5rem 0', textAlign: 'center' }}>Resumen del Cierre</h2>
              
              <div className="tabla-mini" style={{ marginBottom: '1.5rem', maxHeight: '200px', overflowY: 'auto' }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#64748b' }}>Facturas Agregadas</h4>
                {facturas.length === 0 ? <p style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Ninguna factura agregada.</p> : (
                  facturas.map(f => (
                    <div key={f.id_temp} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #cbd5e1', fontSize: '0.9rem' }}>
                       <div><strong>{f.proveedor_nombre}</strong> <span style={{ color: '#64748b' }}>{f.descripcion}</span></div>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                         <span style={{ color: '#ef4444' }}>${f.valor.toLocaleString()}</span>
                         <Trash2 size={16} color="#ef4444" style={{ cursor: 'pointer' }} onClick={() => eliminarFactura(f.id_temp)}/>
                       </div>
                    </div>
                  ))
                )}
              </div>

              <div className="tabla-mini" style={{ marginBottom: '1.5rem', maxHeight: '150px', overflowY: 'auto' }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#64748b' }}>Ajustes</h4>
                {ajustes.length === 0 ? <p style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Ningun ajuste.</p> : (
                  ajustes.map(a => (
                    <div key={a.id_temp} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #cbd5e1', fontSize: '0.9rem' }}>
                       <div style={{display:'flex', alignItems: 'center', gap: '5px'}}>
                         {a.tipo === 'suma' ? <TrendingUp size={14} color="#10b981"/> : <TrendingDown size={14} color="#ef4444"/>}
                         <span style={{ color: '#64748b' }}>{a.descripcion || 'Sin descripción'}</span>
                       </div>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                         <span style={{ color: a.tipo === 'suma' ? '#10b981' : '#ef4444' }}>
                           {a.tipo === 'suma' ? '+' : '-'}${a.valor.toLocaleString()}
                         </span>
                         <Trash2 size={16} color="#ef4444" style={{ cursor: 'pointer' }} onClick={() => eliminarAjuste(a.id_temp)}/>
                       </div>
                    </div>
                  ))
                )}
              </div>

              <div style={{ marginTop: 'auto', background: 'white', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                   <span style={{ color: '#64748b' }}>Total Facturas:</span>
                   <strong>${totalFacturas.toLocaleString()}</strong>
                 </div>
                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                   <span style={{ color: '#64748b' }}>Total Ajustes:</span>
                   <strong style={{ color: totalAjustes < 0 ? '#10b981' : '#ef4444' }}>
                     {totalAjustes > 0 ? '+' : ''}${totalAjustes.toLocaleString()}
                   </strong>
                 </div>
                 <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '12px', borderTop: '2px solid #e2e8f0', fontSize: '1.2rem' }}>
                   <span style={{ color: '#0f172a', fontWeight: 'bold' }}>Total Cierre Día:</span>
                   <strong style={{ color: '#0f172a' }}>${totalFinal.toLocaleString()}</strong>
                 </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '1.5rem' }}>
                 <button className="secondary-btn" onClick={limpiarCierre} style={{ padding: '1rem', background: '#f8fafc', color: '#ef4444', border: '1px solid #fecaca', flex: 1 }}>Limpiar</button>
                 <button className="primary-btn" onClick={guardarCierre} disabled={loading} style={{ padding: '1rem', flex: 2 }}>
                    <Save size={20} style={{marginRight: '8px'}} /> {loading ? 'Guardando...' : 'Guardar Cierre Día'}
                 </button>
              </div>
          </div>
        </div>
      )}

      {activeTab === 'historial' && (
        <div className="tab-content fade-in no-print">
           <div className="filtros-card card shadow-sm" style={{ padding: '1.5rem', background: 'white', borderRadius: '12px', marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
             <div style={{ flex: 1, minWidth: '200px' }}>
               <label style={{ display: 'block', marginBottom: '5px', color: '#64748b', fontSize: '0.9rem' }}>Filtro por Mes</label>
               <select className="form-control" value={filtroMes} onChange={(e) => setFiltroMes(e.target.value)}>
                 <option value="">Todos los meses</option>
                 {meses.map(m => <option key={m.num} value={m.num}>{m.nombre}</option>)}
               </select>
             </div>
             
             <div style={{ flex: 1, minWidth: '200px' }}>
               <label style={{ display: 'block', marginBottom: '5px', color: '#64748b', fontSize: '0.9rem' }}>Filtro por Proveedor</label>
               <select className="form-control" value={filtroProveedor} onChange={(e) => setFiltroProveedor(e.target.value)}>
                 <option value="">Todos los proveedores</option>
                 {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
               </select>
             </div>

             {(filtroMes || filtroProveedor) && (
               <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '1rem', borderRadius: '8px', marginLeft: 'auto', minWidth: '250px' }}>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#1d4ed8' }}>Cálculo Inteligente:</p>
                  <strong style={{ fontSize: '1.2rem', color: '#1e40af' }}>Total: ${totalFiltrado?.toLocaleString() || 0}</strong>
               </div>
             )}
           </div>

           <div className="historial-lista">
             {cierresFiltrados.length === 0 ? (
               <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>No hay cierres guardados que coincidan.</div>
             ) : (
               cierresFiltrados.map(cierre => (
                 <div key={cierre.id} className="cierre-expandible card shadow-sm" style={{ background: 'white', borderRadius: '12px', marginBottom: '1rem', overflow: 'hidden' }}>
                    <div 
                      className="cierre-resumen" 
                      onClick={() => setExpandedId(expandedId === cierre.id ? null : cierre.id)}
                      style={{ padding: '1.5rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: expandedId === cierre.id ? '#f8fafc' : 'white', transition: 'background 0.2s' }}
                    >
                      <div>
                        <h4 style={{ margin: '0 0 5px 0', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Calendar size={18} /> Cierre del {new Date(cierre.fecha).toLocaleDateString()}
                        </h4>
                        <span style={{ fontSize: '0.9rem', color: '#64748b', display: 'block', marginBottom: '5px' }}>
                          Guardado por: <strong>{cierre.usuario_nombre || 'Desconocido'}</strong> ({cierre.usuario_rol || 'Sistema'})
                        </span>
                        <span style={{ fontSize: '0.9rem', color: '#64748b' }}>
                          {cierre.facturas?.length || 0} Facturas | Total final: <strong style={{ color: '#059669' }}>${Number(cierre.total_final).toLocaleString()}</strong>
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                         <button 
                            onClick={(e) => { e.stopPropagation(); setViewInvoice(cierre); }}
                            className="secondary-btn" 
                            style={{ padding: '8px', display: 'flex', alignItems: 'center', gap: '5px', borderRadius: '8px' }}
                            title="Ver e Imprimir Detalle"
                         >
                           <Eye size={18} color="#3b82f6" /> Ver
                         </button>
                         <div style={{ color: '#94a3b8' }}>
                           {expandedId === cierre.id ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                         </div>
                      </div>
                    </div>
                    
                    {expandedId === cierre.id && (
                      <div className="cierre-detalles" style={{ padding: '1.5rem', borderTop: '1px solid #e2e8f0', background: '#ffffff', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                         <div>
                            <h5 style={{ margin: '0 0 10px 0', color: '#334155', borderBottom: '1px solid #f1f5f9', paddingBottom: '5px' }}>Desglose de Facturas</h5>
                            {cierre.facturas?.map(f => (
                              <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', padding: '4px 0', color: '#475569' }}>
                                <span>{f.proveedor_nombre} - {f.descripcion}</span>
                                <strong>${Number(f.valor).toLocaleString()}</strong>
                              </div>
                            ))}
                            <div style={{ textAlign: 'right', marginTop: '10px', fontWeight: 'bold' }}>
                               Subtotal Facturas: ${Number(cierre.total_facturas).toLocaleString()}
                            </div>
                         </div>
                         
                         <div>
                            <h5 style={{ margin: '0 0 10px 0', color: '#334155', borderBottom: '1px solid #f1f5f9', paddingBottom: '5px' }}>Desglose de Ajustes</h5>
                            {cierre.ajustes?.length === 0 ? <p style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Sin ajustes</p> : cierre.ajustes?.map(a => (
                              <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', padding: '4px 0', color: '#475569' }}>
                                <span>{a.descripcion || a.tipo}</span>
                                <strong style={{ color: a.tipo === 'suma' ? '#10b981' : '#ef4444' }}>
                                  {a.tipo === 'suma' ? '+' : '-'}${Number(a.valor).toLocaleString()}
                                </strong>
                              </div>
                            ))}
                            <div style={{ textAlign: 'right', marginTop: '10px', fontWeight: 'bold' }}>
                               Subtotal Ajustes: <span style={{ color: Number(cierre.total_ajustes) < 0 ? '#10b981' : '#ef4444' }}>${Number(cierre.total_ajustes).toLocaleString()}</span>
                            </div>
                         </div>
                      </div>
                    )}
                 </div>
               ))
             )}
           </div>
        </div>
      )}

      {/* MODAL: VISTA DE FACTURA/PDF PARA IMPRIMIR */}
      {viewInvoice && (
        <div className="modal-overlay">
          <div className="modal-content glass-card" style={{ maxWidth: '600px' }}>
            <div className="modal-header no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>Detalle de Cierre</h2>
              <button className="close-btn" onClick={() => setViewInvoice(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444' }}><XCircle size={28} /></button>
            </div>
            
            <div className="invoice-actions no-print" style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '1rem', marginTop: '1rem' }}>
               <button className="primary-btn" onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#3b82f6' }}>
                  <Printer size={18} /> Imprimir / PDF
               </button>
            </div>

            <div className="print-area" style={{ background: '#fff', color: '#000', padding: '20px', borderRadius: '8px', fontFamily: 'monospace', fontSize: '14px' }}>
               <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                 <h2 style={{ margin: '0 0 5px 0' }}>REPORTE DE CIERRE DE DÍA</h2>
                 <p style={{ margin: '0' }}>---------------------------------</p>
                 <p style={{ margin: '5px 0' }}>Fecha: {new Date(viewInvoice.fecha).toLocaleDateString()}</p>
                 <p style={{ margin: '5px 0' }}>Usuario: {viewInvoice.usuario_nombre || 'Desconocido'} ({viewInvoice.usuario_rol || 'N/A'})</p>
                 <p style={{ margin: '0' }}>---------------------------------</p>
               </div>

               <h3 style={{ borderBottom: '1px dashed #000', paddingBottom: '5px', marginTop: '20px' }}>FACTURAS DE PROVEEDORES</h3>
               <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', marginBottom: '15px' }}>
                 <thead>
                   <tr>
                     <th style={{ paddingBottom: '5px' }}>Proveedor / Detalle</th>
                     <th style={{ paddingBottom: '5px', textAlign: 'right' }}>Valor</th>
                   </tr>
                 </thead>
                 <tbody>
                   {viewInvoice.facturas?.length === 0 ? <tr><td colSpan="2" style={{textAlign:'center'}}>Sin facturas</td></tr> : null}
                   {viewInvoice.facturas?.map(f => (
                     <tr key={f.id}>
                       <td style={{ paddingTop: '5px' }}>{f.proveedor_nombre} <br/><small>{f.descripcion}</small></td>
                       <td style={{ paddingTop: '5px', textAlign: 'right' }}>${Number(f.valor).toLocaleString()}</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
               <div style={{ textAlign: 'right', fontWeight: 'bold' }}>
                  Total Facturas: ${Number(viewInvoice.total_facturas).toLocaleString()}
               </div>

               <h3 style={{ borderBottom: '1px dashed #000', paddingBottom: '5px', marginTop: '20px' }}>AJUSTES AL CIERRE</h3>
               <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', marginBottom: '15px' }}>
                 <thead>
                   <tr>
                     <th style={{ paddingBottom: '5px' }}>Descripción</th>
                     <th style={{ paddingBottom: '5px', textAlign: 'right' }}>Valor</th>
                   </tr>
                 </thead>
                 <tbody>
                   {viewInvoice.ajustes?.length === 0 ? <tr><td colSpan="2" style={{textAlign:'center'}}>Sin ajustes</td></tr> : null}
                   {viewInvoice.ajustes?.map(a => (
                     <tr key={a.id}>
                       <td style={{ paddingTop: '5px' }}>{a.descripcion || a.tipo}</td>
                       <td style={{ paddingTop: '5px', textAlign: 'right' }}>
                         {a.tipo === 'suma' ? '+' : '-'}${Number(a.valor).toLocaleString()}
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
               <div style={{ textAlign: 'right', fontWeight: 'bold' }}>
                  Total Ajustes: ${Number(viewInvoice.total_ajustes).toLocaleString()}
               </div>

               <div style={{ marginTop: '30px', borderTop: '2px solid #000', paddingTop: '10px', textAlign: 'right', fontSize: '18px', fontWeight: 'bold' }}>
                  TOTAL CIERRE DÍA: ${Number(viewInvoice.total_final).toLocaleString()}
               </div>

               <div style={{ textAlign: 'center', marginTop: '40px', fontSize: '12px' }}>
                 <p>---------------------------------</p>
                 <p>Documento de control interno</p>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
