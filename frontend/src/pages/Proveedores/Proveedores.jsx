import React, { useState, useEffect, useContext } from 'react';
import { Truck, Search, Plus, Edit2, Trash2, X, MapPin, Mail, Phone, Hash } from 'lucide-react';
import { fetchAPI } from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import './Proveedores.css';

export default function Proveedores() {
  const { user } = useContext(AuthContext);
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({
    nombre: '',
    nit: '',
    telefono: '',
    email: '',
    direccion: ''
  });

  useEffect(() => {
    cargarProveedores();
  }, []);

  const cargarProveedores = async () => {
    setLoading(true);
    const res = await fetchAPI('/proveedores');
    if (res.success) {
      setProveedores(res.data);
    }
    setLoading(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const abrirModal = (prov = null) => {
    if (prov) {
      setFormData({
        nombre: prov.nombre,
        nit: prov.nit,
        telefono: prov.telefono || '',
        email: prov.email || '',
        direccion: prov.direccion || ''
      });
      setEditingId(prov.id);
    } else {
      setFormData({ nombre: '', nit: '', telefono: '', email: '', direccion: '' });
      setEditingId(null);
    }
    setShowModal(true);
  };

  const cerrarModal = () => {
    setShowModal(false);
    setEditingId(null);
  };

  const guardarProveedor = async (e) => {
    e.preventDefault();
    if (!formData.nombre || !formData.nit) {
      window.Swal.fire('Atención', 'El Nombre y NIT son obligatorios.', 'warning');
      return;
    }
    
    setLoading(true);
    const method = editingId ? 'PUT' : 'POST';
    const endpoint = editingId ? `/proveedores/${editingId}` : '/proveedores';
    
    const res = await fetchAPI(endpoint, {
      method,
      body: JSON.stringify(formData)
    });
    
    if (res.success) {
      cerrarModal();
      cargarProveedores();
      window.Swal.fire({ title: '¡Guardado!', text: 'Proveedor guardado correctamente.', icon: 'success', timer: 1500, showConfirmButton: false });
    } else {
      window.Swal.fire('Error', res.message || "Error al guardar proveedor.", 'error');
    }
    setLoading(false);
  };

  const eliminarProveedor = async (id) => {
    const confirm = await window.Swal.fire({
      title: '¿Eliminar proveedor?',
      text: "Esta acción no se puede deshacer.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });
    
    if (!confirm.isConfirmed) return;
    
    setLoading(true);
    const res = await fetchAPI(`/proveedores/${id}`, { method: 'DELETE' });
    if (res.success) {
      cargarProveedores();
      window.Swal.fire({ title: 'Eliminado', icon: 'success', timer: 1500, showConfirmButton: false });
    } else {
      window.Swal.fire('Error', res.message || "Error al eliminar proveedor.", 'error');
    }
    setLoading(false);
  };

  const filteredProveedores = proveedores.filter(p => 
    Object.values(p).some(val => 
      val && String(val).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  return (
    <div className="proveedores-container fade-in">
      <div className="page-header" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>Directorio de Proveedores</h2>
          <p style={{ color: 'var(--text-muted)' }}>Gestiona los datos de contacto y facturación de proveedores.</p>
        </div>
        <button className="primary-btn" onClick={() => abrirModal()}>
          <Plus size={20} style={{ marginRight: '8px' }} />
          Nuevo Proveedor
        </button>
      </div>

      <div className="card shadow-sm" style={{ padding: '1.5rem', background: 'white', borderRadius: '12px' }}>
        <div className="search-bar" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', background: '#f8fafc', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <Search size={20} color="#94a3b8" />
          <input 
            type="text" 
            placeholder="Buscar por Todos los atributos..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ border: 'none', background: 'transparent', width: '100%', padding: '0.5rem', outline: 'none', fontSize: '1rem' }}
          />
        </div>

        <div className="table-responsive">
          <table className="crud-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '1rem', textAlign: 'left', color: '#64748b' }}>Nombre Fiscal</th>
                <th style={{ padding: '1rem', textAlign: 'left', color: '#64748b' }}>NIT</th>
                <th style={{ padding: '1rem', textAlign: 'left', color: '#64748b' }}>Contacto</th>
                <th style={{ padding: '1rem', textAlign: 'right', color: '#64748b' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading && proveedores.length === 0 ? (
                <tr><td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>Cargando...</td></tr>
              ) : filteredProveedores.length === 0 ? (
                <tr><td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>No se encontraron proveedores.</td></tr>
              ) : (
                filteredProveedores.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }}>
                    <td style={{ padding: '1rem', fontWeight: 'bold', color: '#0f172a' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ background: '#eff6ff', padding: '8px', borderRadius: '8px', color: '#3b82f6' }}>
                          <Truck size={18} />
                        </div>
                        {p.nombre}
                      </div>
                    </td>
                    <td style={{ padding: '1rem', color: '#475569' }}>{p.nit}</td>
                    <td style={{ padding: '1rem', color: '#475569' }}>
                      <div style={{ fontSize: '0.85rem' }}>
                        {p.telefono && <div><Phone size={12} style={{marginRight: '4px'}}/>{p.telefono}</div>}
                        {p.email && <div><Mail size={12} style={{marginRight: '4px'}}/>{p.email}</div>}
                      </div>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                         <button className="action-btn edit" onClick={() => abrirModal(p)} title="Editar" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '6px', borderRadius: '6px', cursor: 'pointer', color: '#3b82f6' }}>
                            <Edit2 size={16} />
                         </button>
                         {user?.rol !== 'empleado' && (
                           <button className="action-btn delete" onClick={() => eliminarProveedor(p.id)} title="Eliminar" style={{ background: '#fef2f2', border: '1px solid #fee2e2', padding: '6px', borderRadius: '6px', cursor: 'pointer', color: '#ef4444' }}>
                              <Trash2 size={16} />
                           </button>
                         )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div className="modal-content scale-in" style={{ background: 'white', padding: '2rem', borderRadius: '12px', width: '90%', maxWidth: '500px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>{editingId ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h3>
              <button onClick={cerrarModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={guardarProveedor} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#334155' }}>Nombre o Razón Social *</label>
                <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0 10px' }}>
                  <Truck size={18} color="#94a3b8" />
                  <input type="text" name="nombre" value={formData.nombre} onChange={handleInputChange} required style={{ border: 'none', background: 'transparent', padding: '10px', width: '100%', outline: 'none' }} placeholder="Ej: Distribuidora XYZ" />
                </div>
              </div>

              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#334155' }}>NIT / Documento *</label>
                <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0 10px' }}>
                  <Hash size={18} color="#94a3b8" />
                  <input type="text" name="nit" value={formData.nit} onChange={handleInputChange} required style={{ border: 'none', background: 'transparent', padding: '10px', width: '100%', outline: 'none' }} placeholder="Ej: 900.123.456-7" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#334155' }}>Teléfono</label>
                  <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0 10px' }}>
                    <Phone size={18} color="#94a3b8" />
                    <input type="text" name="telefono" value={formData.telefono} onChange={handleInputChange} style={{ border: 'none', background: 'transparent', padding: '10px', width: '100%', outline: 'none' }} placeholder="Ej: 3001234567" />
                  </div>
                </div>

                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#334155' }}>Email</label>
                  <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0 10px' }}>
                    <Mail size={18} color="#94a3b8" />
                    <input type="email" name="email" value={formData.email} onChange={handleInputChange} style={{ border: 'none', background: 'transparent', padding: '10px', width: '100%', outline: 'none' }} placeholder="contacto@empresa.com" />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#334155' }}>Dirección</label>
                <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0 10px' }}>
                  <MapPin size={18} color="#94a3b8" />
                  <input type="text" name="direccion" value={formData.direccion} onChange={handleInputChange} style={{ border: 'none', background: 'transparent', padding: '10px', width: '100%', outline: 'none' }} placeholder="Ej: Calle 123 #45-67" />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={cerrarModal} style={{ padding: '0.75rem 1.5rem', background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, color: '#64748b' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={loading} style={{ padding: '0.75rem 1.5rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.5)' }}>
                  {loading ? 'Guardando...' : 'Guardar Proveedor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
