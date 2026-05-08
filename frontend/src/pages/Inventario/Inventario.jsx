import React, { useState, useEffect, useRef } from 'react';
import { Search, PackagePlus, AlertCircle } from 'lucide-react';
import { fetchAPI } from '../../services/api';
import './Inventario.css';

export default function Inventario() {
  const [busqueda, setBusqueda] = useState('');
  const [productosBusqueda, setProductosBusqueda] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [ingresoData, setIngresoData] = useState({ cantidad: 1, costo_unitario: 0 });
  
  const searchInputRef = useRef(null);

  // Mantener foco en el input para la pistola de barras
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  const buscarProductos = async (termino) => {
    if (!termino.trim()) {
      setProductosBusqueda([]);
      return;
    }

    const res = await fetchAPI('/productos');
    if (res.success) {
      const terminoLower = termino.toLowerCase();
      const filtrados = res.data.filter(p => {
        return Object.values(p).some(val => 
          val && String(val).toLowerCase().includes(terminoLower)
        );
      });
      setProductosBusqueda(filtrados);
    }
  };

  const handleKeyDown = (e) => {
    // Si la pistola de barras dispara el Enter
    if (e.key === 'Enter') {
      e.preventDefault();
      buscarProductos(busqueda);
    }
  };

  const abrirIngreso = (producto) => {
    setSelectedProduct(producto);
    const costo = producto.precio_costo || '';
    const ventaActual = producto.precio_venta || (costo > 0 ? Math.ceil(costo / 0.80) : '');
    setIngresoData({ cantidad: '', costo_unitario: costo, precio_venta: ventaActual });
    setIsModalOpen(true);
  };

  const confirmarIngreso = async (e) => {
    e.preventDefault();
    
    // Llamar a /api/inventario para que sume el stock
    const payload = {
      producto_id: selectedProduct.id,
      cantidad: Number(ingresoData.cantidad) || 0,
      precio_costo: Number(ingresoData.costo_unitario) || 0,
      precio_venta: Number(ingresoData.precio_venta) || 0,
      proveedor: '',
      notas: 'Ingreso manual por interfaz de inventario'
    };

    const res = await fetchAPI('/inventario', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (res.success) {
      window.Swal.fire({
        title: '¡Entrada registrada!',
        text: 'Nuevo stock sumado exitosamente.',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
      setIsModalOpen(false);
      setBusqueda('');
      setProductosBusqueda([]);
      searchInputRef.current?.focus(); // Devolver foco a escáner
    } else {
      window.Swal.fire('Error', res.message || 'Error al registrar entrada de inventario', 'error');
    }
  };

  return (
    <div className="inventario-container">
      <h2>Entradas de Inventario</h2>
      
      <div className="search-bar-container">
        <Search size={28} color="var(--text-muted)" />
        <input 
          ref={searchInputRef}
          type="text"
          className="search-input"
          placeholder="Escanea el código de barras, escribe el nombre, o los últimos 4 dígitos..."
          value={busqueda}
          onChange={(e) => {
            setBusqueda(e.target.value);
            // Búsqueda en tiempo real si el usuario escribe
            if (e.target.value.length > 2) buscarProductos(e.target.value);
            if (e.target.value === '') setProductosBusqueda([]);
          }}
          onKeyDown={handleKeyDown}
        />
        <button className="primary-btn" onClick={() => buscarProductos(busqueda)}>
          Buscar
        </button>
      </div>

      <div className="results-grid">
        {productosBusqueda.length === 0 && busqueda.length > 0 && (
           <div style={{color: 'var(--text-muted)', paddingTop: '2rem'}}>
             No se encontraron productos compatibles.
           </div>
        )}

        {productosBusqueda.map(p => {
          let stockClass = p.stock > (p.stock_minimo * 2) ? 'high' : 
                          (p.stock > p.stock_minimo ? 'low' : 'danger');

          return (
            <div className="product-card" key={p.id}>
              <div className="product-header">
                <div>
                  <span className="product-code">{p.codigo || '---'}</span>
                  <h3 className="product-title">{p.nombre}</h3>
                </div>
                <div style={{textAlign: 'right'}}>
                  <span className="stat-label">Stock Actual</span><br/>
                  <span className={`stock-badge ${stockClass}`}>{p.stock}</span>
                </div>
              </div>

              <div className="product-stats">
                <div className="stat-item">
                  <span className="stat-label">Costo</span>
                  <span className="stat-value" style={{color: '#f87171'}}>${Number(p.precio_costo || 0).toLocaleString()}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Venta</span>
                  <span className="stat-value" style={{color: '#34d399'}}>${Number(p.precio_venta || 0).toLocaleString()}</span>
                </div>
              </div>

              <button className="btn-ingreso" onClick={() => abrirIngreso(p)}>
                <PackagePlus size={20} /> Entró nueva mercancía
              </button>
            </div>
          );
        })}
      </div>

      {isModalOpen && selectedProduct && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Ingreso de Stock: {selectedProduct.nombre}</h3>
            <p style={{color: 'var(--text-muted)', marginBottom: '1.5rem'}}>
              Stock Actual: <strong style={{color: 'white'}}>{selectedProduct.stock}</strong> unidades. <br/>
              Las ingresadas se sumarán automáticamente.
            </p>

            <form onSubmit={confirmarIngreso}>
              <div className="form-group">
                <label>¿Cuántas unidades nuevas llegaron?</label>
                <input 
                  type="number" 
                  min="1"
                  className="form-control" 
                  value={ingresoData.cantidad}
                  onChange={(e) => setIngresoData({...ingresoData, cantidad: e.target.value === '' ? '' : Number(e.target.value)})}
                  required 
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>Costo de compra (por unidad) de este lote</label>
                <input 
                  type="number" 
                  min="0"
                  step="0.01"
                  className="form-control" 
                  value={ingresoData.costo_unitario}
                  onChange={(e) => {
                    const costo = e.target.value === '' ? '' : Number(e.target.value);
                    const nuevoPrecioVenta = costo !== '' && costo > 0 ? Math.ceil(costo / 0.80) : ingresoData.precio_venta;
                    setIngresoData({...ingresoData, costo_unitario: costo, precio_venta: nuevoPrecioVenta});
                  }}
                  required 
                />
              </div>
              <div className="form-group">
                <label>Precio de Venta al Público (Sugerido al 20% | Editable)</label>
                <input 
                  type="number" 
                  min="0"
                  step="0.01"
                  className="form-control" 
                  style={{color: '#10b981', fontWeight: 'bold'}}
                  value={ingresoData.precio_venta}
                  onChange={(e) => setIngresoData({...ingresoData, precio_venta: e.target.value === '' ? '' : Number(e.target.value)})}
                  required 
                />
              </div>
              
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className="primary-btn" style={{background: '#10b981'}}>Confirmar Ingreso y Sumar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
