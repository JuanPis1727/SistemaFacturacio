import React, { useState, useEffect, useContext } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { fetchAPI } from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import './Productos.css';

export default function Productos() {
  const { user } = useContext(AuthContext);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ nombre: '', codigo: '', tipo: 'producto', descripcion: '', precio_costo: 0, precio_venta: 0, stock: 0, stock_minimo: 0 });
  const [editId, setEditId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    cargarProductos();
  }, []);

  const cargarProductos = async () => {
    setLoading(true);
    const res = await fetchAPI('/productos');
    if (res.success) setProductos(res.data);
    setLoading(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const isEdit = editId !== null;
    const url = isEdit ? `/productos/${editId}` : '/productos';
    const res = await fetchAPI(url, {
      method: isEdit ? 'PUT' : 'POST',
      body: JSON.stringify(formData)
    });
    
    if (res.success) {
      cerrarModal();
      cargarProductos();
      window.Swal.fire({ title: '¡Guardado!', text: 'El producto se guardó correctamente.', icon: 'success', timer: 1500, showConfirmButton: false });
    } else {
      window.Swal.fire('Error', res.message || 'Error al guardar el producto', 'error');
    }
  };

  const handleDelete = async (id) => {
    const confirm = await window.Swal.fire({
      title: '¿Eliminar producto?',
      text: "Esta acción no se puede deshacer.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });
    
    if (!confirm.isConfirmed) return;
    
    const res = await fetchAPI(`/productos/${id}`, { method: 'DELETE' });
    if (res.success) {
       cargarProductos();
       window.Swal.fire({ title: 'Eliminado', icon: 'success', timer: 1500, showConfirmButton: false });
    } else {
       window.Swal.fire('Error', res.message, 'error');
    }
  };

  const abrirParaEditar = (prod) => {
    setFormData({ 
      nombre: prod.nombre, 
      codigo: prod.codigo, 
      tipo: prod.tipo || 'producto',
      descripcion: prod.descripcion || '',
      precio_costo: prod.precio_costo,
      precio_venta: prod.precio_venta,
      stock: prod.stock,
      stock_minimo: prod.stock_minimo
    });
    setEditId(prod.id);
    setIsModalOpen(true);
  };

  const cerrarModal = () => {
    setIsModalOpen(false);
    setEditId(null);
    setEditId(null);
    setFormData({ nombre: '', codigo: '', tipo: 'producto', descripcion: '', precio_costo: 0, precio_venta: 0, stock: 0, stock_minimo: 0 });
  };

  const filteredProductos = productos.filter(p => {
    const term = searchTerm.toLowerCase();
    return (
      (p.nombre && p.nombre.toLowerCase().includes(term)) ||
      (p.codigo && String(p.codigo).toLowerCase().includes(term))
    );
  });

  return (
    <div className="crud-container">
      <div className="crud-header">
        <h2>Inventario</h2>
        <button className="primary-btn" onClick={() => setIsModalOpen(true)}>
           <Plus size={18} style={{marginRight: '8px'}} /> Agregar Producto
        </button>
      </div>

      <div className="search-filter-container" style={{marginBottom: '1rem', padding: '0 1rem'}}>
        <input 
          type="text" 
          className="form-control" 
          placeholder="Buscar producto por código, nombre, tipo..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="crud-table-container">
        <table className="crud-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Nombre</th>
              <th>Stock</th>
              <th>Precio Venta</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredProductos.map(p => (
              <tr key={p.id}>
                <td style={{fontFamily: 'monospace'}}>{p.codigo}</td>
                <td>{p.nombre}</td>
                <td>
                  <span className={`badge ${p.stock <= p.stock_minimo ? 'pendiente' : 'pagado'}`}>
                    {p.stock}
                  </span>
                </td>
                <td>${p.precio_venta.toLocaleString()}</td>
                <td>
                  <div className="crud-actions">
                    <button className="icon-btn edit" onClick={() => abrirParaEditar(p)}><Edit2 size={16} /></button>
                    {user?.rol !== 'empleado' && (
                      <button className="icon-btn delete" onClick={() => handleDelete(p.id)}><Trash2 size={16} /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filteredProductos.length === 0 && !loading && (
               <tr><td colSpan="5" style={{textAlign:'center', padding: '2rem'}}>No se encontraron productos.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>{editId ? 'Editar Producto' : 'Nuevo Producto'}</h3>
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label>Código de Barras</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={formData.codigo}
                  onChange={(e) => setFormData({...formData, codigo: e.target.value})}
                  required autoFocus
                />
              </div>
              <div className="form-group">
                <label>Nombre del Producto</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={formData.nombre}
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Tipo</label>
                <select className="form-control" value={formData.tipo} onChange={(e) => setFormData({...formData, tipo: e.target.value})}>
                  <option value="producto">Producto (Físico)</option>
                  <option value="servicio">Servicio (Intangible)</option>
                </select>
              </div>
              <div className="form-group">
                <label>Descripción</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={formData.descripcion}
                  onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Precio de Costo</label>
                <input 
                  type="number" step="0.01" min="0"
                  className="form-control" 
                  value={formData.precio_costo}
                  onChange={(e) => {
                    const costo = Number(e.target.value);
                    setFormData({
                       ...formData, 
                       precio_costo: costo, 
                       precio_venta: costo > 0 ? Math.ceil(costo / 0.80) : formData.precio_venta
                    });
                  }}
                  required
                />
              </div>
              <div className="form-group">
                <label>Precio de Venta</label>
                <input 
                  type="number" step="0.01" min="0"
                  className="form-control" 
                  value={formData.precio_venta}
                  onChange={(e) => setFormData({...formData, precio_venta: Number(e.target.value)})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Stock Disponible Físico</label>
                <input 
                  type="number" min="0"
                  className="form-control" 
                  value={formData.stock || 0}
                  onChange={(e) => setFormData({...formData, stock: Number(e.target.value)})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Stock Mínimo</label>
                <input 
                  type="number" min="0"
                  className="form-control" 
                  value={formData.stock_minimo}
                  onChange={(e) => setFormData({...formData, stock_minimo: Number(e.target.value)})}
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={cerrarModal}>Cancelar</button>
                <button type="submit" className="primary-btn">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
