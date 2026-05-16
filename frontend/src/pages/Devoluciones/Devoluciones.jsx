import React, { useState, useEffect, useContext } from 'react';
import { ArrowLeftRight, Search } from 'lucide-react';
import { fetchAPI } from '../../services/api';
import { AuthContext } from '../../context/AuthContext';

export default function Devoluciones() {
  const { user } = useContext(AuthContext);
  const [searchTerm, setSearchTerm] = useState('');
  const [productos, setProductos] = useState([]);
  const [sugerencias, setSugerencias] = useState([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  
  const [cantidad, setCantidad] = useState(1);
  const [descripcion, setDescripcion] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    cargarProductos();
  }, []);

  const cargarProductos = async () => {
    const res = await fetchAPI('/productos');
    if (res.success) {
      setProductos(res.data);
    }
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchTerm(val);
    if (val.trim() !== '') {
      const filtered = productos.filter(p => 
        (p.nombre && p.nombre.toLowerCase().includes(val.toLowerCase())) ||
        (p.codigo && String(p.codigo).toLowerCase().includes(val.toLowerCase()))
      ).slice(0, 10);
      setSugerencias(filtered);
    } else {
      setSugerencias([]);
    }
  };

  const seleccionarProducto = (prod) => {
    setProductoSeleccionado(prod);
    setSearchTerm('');
    setSugerencias([]);
    setCantidad(1);
  };

  const procesarDevolucion = async (e) => {
    e.preventDefault();
    if (!productoSeleccionado) return window.Swal.fire('Error', 'Seleccione un producto primero', 'error');
    if (cantidad <= 0) return window.Swal.fire('Error', 'La cantidad debe ser mayor a 0', 'error');

    const confirm = await window.Swal.fire({
      title: '¿Confirmar Devolución?',
      text: `Se retornarán ${cantidad} de "${productoSeleccionado.nombre}" al inventario y se descontará del ingreso de hoy.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, procesar',
      cancelButtonText: 'Cancelar'
    });

    if (!confirm.isConfirmed) return;

    setLoading(true);
    const res = await fetchAPI('/devoluciones', {
      method: 'POST',
      body: JSON.stringify({
        producto_id: productoSeleccionado.id,
        cantidad: cantidad,
        descripcion: descripcion || `Devolución de cliente`,
        usuario_id: user?.id
      })
    });
    setLoading(false);

    if (res.success) {
      window.Swal.fire('¡Éxito!', res.message, 'success');
      setProductoSeleccionado(null);
      setCantidad(1);
      setDescripcion('');
      cargarProductos();
    } else {
      window.Swal.fire('Error', res.message, 'error');
    }
  };

  return (
    <div className="crud-container fade-in">
      <div className="crud-header">
        <h2>Módulo de Devoluciones</h2>
        <p style={{color: 'var(--text-muted)'}}>Registra ingresos de mercancía devuelta por clientes y resta el valor de ventas.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) minmax(300px, 1fr)', gap: '2rem' }}>
        
        {/* Buscador */}
        <div className="card shadow-sm" style={{ padding: '2rem', background: 'white', borderRadius: '12px' }}>
          <h3 style={{ marginTop: 0, marginBottom: '1rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Search size={20} /> Buscar Producto a Devolver
          </h3>
          <div style={{ position: 'relative' }}>
            <input 
              type="text" 
              className="form-control" 
              placeholder="Código de barras o nombre..." 
              value={searchTerm}
              onChange={handleSearchChange}
            />
            {sugerencias.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', zIndex: 10, maxHeight: '250px', overflowY: 'auto', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                {sugerencias.map(p => (
                  <div key={p.id} onClick={() => seleccionarProducto(p)} style={{ padding: '10px 15px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}>
                    <strong>{p.nombre}</strong> <span style={{ color: '#64748b', fontSize: '0.9em' }}>({p.codigo})</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginTop: '2rem', padding: '1rem', background: '#eff6ff', borderRadius: '8px', border: '1px dashed #bfdbfe' }}>
             <p style={{ fontSize: '0.9rem', color: '#1d4ed8', margin: 0 }}>
               <strong>Nota:</strong> Al procesar una devolución, el inventario aumentará y se creará una transacción negativa que automáticamente disminuirá el "Ingreso Hoy" en el Dashboard.
             </p>
          </div>
        </div>

        {/* Formulario Devolucion */}
        <div className="card shadow-sm" style={{ padding: '2rem', background: 'white', borderRadius: '12px' }}>
          <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ArrowLeftRight size={20} /> Detalle de la Devolución
          </h3>

          {!productoSeleccionado ? (
            <div style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem 0' }}>
              Busque y seleccione un producto en el panel izquierdo.
            </div>
          ) : (
            <form onSubmit={procesarDevolucion}>
              <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#334155' }}>{productoSeleccionado.nombre}</h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#64748b' }}>
                  <span>Código: {productoSeleccionado.codigo || 'N/A'}</span>
                  <span>Stock Actual: <strong>{productoSeleccionado.stock}</strong></span>
                </div>
                <div style={{ marginTop: '5px', fontSize: '0.9rem', color: '#64748b' }}>
                  Precio Venta (Se descontará): <strong style={{ color: '#ef4444' }}>${Number(productoSeleccionado.precio_venta).toLocaleString()}</strong>
                </div>
              </div>

              <div className="form-group">
                <label>Cantidad a Devolver ({productoSeleccionado.por_peso ? 'Kg' : 'Unidades'})</label>
                <input 
                  type="number" 
                  className="form-control" 
                  value={cantidad}
                  onChange={(e) => setCantidad(e.target.value)}
                  min="0.01"
                  step={productoSeleccionado.por_peso ? "0.01" : "1"}
                  required
                />
              </div>

              <div className="form-group">
                <label>Motivo o Descripción (Opcional)</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Ej: Producto dañado, cambio de idea..."
                />
              </div>
              
              <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
                   A descontar: <span style={{ color: '#ef4444' }}>${(cantidad * productoSeleccionado.precio_venta).toLocaleString()}</span>
                </div>
                <button type="submit" className="primary-btn" disabled={loading} style={{ background: '#ef4444' }}>
                  {loading ? 'Procesando...' : 'Aplicar Devolución'}
                </button>
              </div>
            </form>
          )}
        </div>

      </div>
    </div>
  );
}
