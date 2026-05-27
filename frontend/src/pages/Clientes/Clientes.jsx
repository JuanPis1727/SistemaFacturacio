import React, { useState, useEffect, useContext } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { fetchAPI } from '../../services/api';
import { AuthContext } from '../../context/AuthContext';

// Reutilizamos el estilo de Productos.css para el CRUD
export default function Clientes() {
  const { user } = useContext(AuthContext);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ nombre: '', cedula: '', email: '', telefono: '', direccion: '', deuda_inicial: '' });
  const [editId, setEditId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    cargarClientes();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const cargarClientes = async () => {
    setLoading(true);
    const res = await fetchAPI('/clientes');
    if (res.success) setClientes(res.data);
    setLoading(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const isEdit = editId !== null;
    const url = isEdit ? `/clientes/${editId}` : '/clientes';
    
    const payload = {
      ...formData,
      deuda_inicial: Number(formData.deuda_inicial) || 0
    };

    const res = await fetchAPI(url, {
      method: isEdit ? 'PUT' : 'POST',
      body: JSON.stringify(payload)
    });
    
    if (res.success) {
      cerrarModal();
      cargarClientes();
      window.Swal.fire({ title: '¡Guardado!', text: 'El cliente se guardó correctamente.', icon: 'success', timer: 1500, showConfirmButton: false });
    } else {
      window.Swal.fire('Error', res.message || 'Error al guardar', 'error');
    }
  };

  const handleDelete = async (id) => {
    const confirm = await window.Swal.fire({
      title: '¿Eliminar cliente?',
      text: "Esta acción no se puede deshacer.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });
    
    if (!confirm.isConfirmed) return;
    
    const res = await fetchAPI(`/clientes/${id}`, { method: 'DELETE' });
    if (res.success) {
       cargarClientes();
       window.Swal.fire({ title: 'Eliminado', icon: 'success', timer: 1500, showConfirmButton: false });
    } else {
       window.Swal.fire('Error', res.message, 'error');
    }
  };

  const abrirParaEditar = (cliente) => {
    setFormData({ 
      nombre: cliente.nombre, 
      cedula: cliente.cedula || '', 
      email: cliente.email || '', 
      telefono: cliente.telefono || '', 
      direccion: cliente.direccion || '',
      deuda_inicial: 0
    });
    setEditId(cliente.id);
    setIsModalOpen(true);
  };

  const cerrarModal = () => {
    setIsModalOpen(false);
    setEditId(null);
    setFormData({ nombre: '', cedula: '', email: '', telefono: '', direccion: '', deuda_inicial: '' });
  };

  const filteredClientes = clientes.filter(c => 
    Object.values(c).some(val => 
      val && String(val).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  // Paginación
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredClientes.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredClientes.length / itemsPerPage);

  const nextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const prevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  return (
    <div className="crud-container">
      <div className="crud-header">
        <h2>Gestión de Clientes</h2>
        <button className="primary-btn" onClick={() => setIsModalOpen(true)}>
           <Plus size={18} style={{marginRight: '8px'}} /> Agregar Cliente
        </button>
      </div>

      <div className="search-filter-container" style={{marginBottom: '1rem', padding: '0 1rem'}}>
        <input 
          type="text" 
          className="form-control" 
          placeholder="Buscar cliente por nombre, cédula, teléfono, email..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="crud-table-container">
        <table className="crud-table">
          <thead>
            <tr>
              <th>Cédula/NIT</th>
              <th>Nombre</th>
              <th>Teléfono</th>
              <th>Deuda Pendiente</th>
              {user?.rol !== 'empleado' && <th>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {currentItems.map(c => (
              <tr key={c.id}>
                <td style={{fontFamily: 'monospace'}}>{c.cedula || '---'}</td>
                <td style={{fontWeight: 500}}>{c.nombre}</td>
                <td>{c.telefono || '---'}</td>
                <td>
                  <span className={`badge ${c.deuda_total > 0 ? 'pendiente' : 'pagado'}`}>
                    ${c.deuda_total.toLocaleString()}
                  </span>
                </td>
                {user?.rol !== 'empleado' && (
                  <td>
                    <div className="crud-actions">
                      <button className="icon-btn edit" onClick={() => abrirParaEditar(c)}><Edit2 size={16} /></button>
                      <button className="icon-btn delete" onClick={() => handleDelete(c.id)}><Trash2 size={16} /></button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {filteredClientes.length === 0 && !loading && (
               <tr><td colSpan="5" style={{textAlign:'center', padding: '2rem'}}>No se encontraron clientes.</td></tr>
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

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>{editId ? 'Editar Cliente' : 'Nuevo Cliente'}</h3>
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label>Documento / Cédula</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={formData.cedula}
                  onChange={(e) => setFormData({...formData, cedula: e.target.value})}
                  required autoFocus
                />
              </div>
              <div className="form-group">
                <label>Nombre Completo</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={formData.nombre}
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Teléfono</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={formData.telefono}
                  onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Correo Electrónico</label>
                <input 
                  type="email" 
                  className="form-control" 
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Dirección</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={formData.direccion}
                  onChange={(e) => setFormData({...formData, direccion: e.target.value})}
                />
              </div>
              
              {!editId && (
                <div className="form-group" style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                  <label style={{ color: '#0f172a', fontWeight: 'bold' }}>Deuda Activa Previa (Librera física) - Opcional</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    min="0"
                    placeholder="$0"
                    style={{ fontWeight: 'bold', color: '#ef4444' }}
                    value={formData.deuda_inicial}
                    onChange={(e) => setFormData({...formData, deuda_inicial: e.target.value === '' ? '' : Number(e.target.value)})}
                  />
                  <small style={{ color: '#64748b', fontSize: '0.8rem' }}>Digita el saldo deudor actual si el cliente ya te debe dinero.</small>
                </div>
              )}

              <div className="modal-actions" style={{ marginTop: '1rem' }}>
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
