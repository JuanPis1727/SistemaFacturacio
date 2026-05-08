import React, { useState, useEffect, useContext } from 'react';
import { fetchAPI } from '../../services/api';
import { Plus, Edit2, Trash2, X, Save } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import './Usuarios.css';

export default function Usuarios() {
  const { user } = useContext(AuthContext);
  const [usuarios, setUsuarios] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ id: null, nombre: '', email: '', password: '', rol: 'empleado' });
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadUsuarios();
  }, []);

  const loadUsuarios = async () => {
    const res = await fetchAPI('/usuarios');
    if (res.success) {
      setUsuarios(res.data);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const method = formData.id ? 'PUT' : 'POST';
    const endpoint = formData.id ? `/usuarios/${formData.id}` : '/usuarios';
    
    const res = await fetchAPI(endpoint, method, formData);
    if (res.success) {
      setShowModal(false);
      loadUsuarios();
      setFormData({ id: null, nombre: '', email: '', password: '', rol: 'empleado' });
      window.Swal.fire({
        title: formData.id ? 'Empleado actualizado' : 'Empleado creado',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      });
    } else {
      window.Swal.fire('Error', res.message, 'error');
    }
    setLoading(false);
  };

  const abrirParaEditar = (usuario) => {
    setFormData({
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      password: '',
      rol: usuario.rol
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    const confirm = await window.Swal.fire({
      title: '¿Eliminar empleado?',
      text: "Esta acción eliminará al empleado definitivamente.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });
    
    if (!confirm.isConfirmed) return;
    
    const res = await fetchAPI(`/usuarios/${id}`, 'DELETE');
    if (res.success) {
       loadUsuarios();
       window.Swal.fire({ title: 'Eliminado', icon: 'success', timer: 1500, showConfirmButton: false });
    } else {
       window.Swal.fire('Error', res.message, 'error');
    }
  };

  const filteredUsuarios = usuarios.filter(u => 
    Object.values(u).some(val => 
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  return (
    <div className="usuarios-page">
      <div className="page-header">
        <h2 className="title" style={{ fontSize: '2rem', marginBottom: 0 }}>Personal Administrativo y Empleados</h2>
        <button className="primary-btn" onClick={() => {
          setFormData({ id: null, nombre: '', email: '', password: '', rol: 'empleado' });
          setShowModal(true);
        }}>
          <Plus size={20} /> Nuevo Empleado
        </button>
      </div>

      <div className="search-filter-container" style={{marginBottom: '1rem'}}>
        <input 
          type="text" 
          className="form-control" 
          placeholder="Buscar empleado por nombre, email, rol..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Activo</th>
              <th>Último Acceso</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsuarios.map(u => (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td>{u.nombre}</td>
                <td>{u.email}</td>
                <td><span className={`rol-badge ${u.rol.toLowerCase()}`}>{u.rol}</span></td>
                <td>{u.activo ? 'Sí' : 'No'}</td>
                <td>{u.ultimo_acceso ? new Date(u.ultimo_acceso).toLocaleString() : 'Nunca'}</td>
                <td>
                  <div className="crud-actions" style={{display: 'flex', gap: '0.5rem', justifyContent: 'center'}}>
                    <button className="icon-btn edit" onClick={() => abrirParaEditar(u)} style={{background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: 'none', padding: '5px', borderRadius: '4px', cursor: 'pointer'}}>
                      <Edit2 size={16} />
                    </button>
                    {u.activo && user?.rol !== 'empleado' && (
                      <button className="icon-btn delete" onClick={() => handleDelete(u.id)} style={{background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'none', padding: '5px', borderRadius: '4px', cursor: 'pointer'}}>
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filteredUsuarios.length === 0 && (
              <tr><td colSpan="7" style={{textAlign: 'center'}}>No se encontraron empleados</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-card">
            <div className="modal-header">
              <h3>{formData.id ? 'Editar Empleado' : 'Crear Empleado'}</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="usuarios-form">
              <div className="form-group">
                <label>Nombre:</label>
                <input className="form-control" type="text" required value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Email:</label>
                <input className="form-control" type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Contraseña:</label>
                <input className="form-control" type="password" required={!formData.id} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder={formData.id ? "Dejar en blanco para no cambiar" : ""} />
              </div>
              <div className="form-group">
                <label>Rol:</label>
                <select className="form-control" value={formData.rol} onChange={e => setFormData({...formData, rol: e.target.value})}>
                  <option value="empleado">Empleado</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <button type="submit" className="primary-btn" disabled={loading} style={{width: '100%', marginTop: '1rem'}}>
                <Save size={20} /> Guardar
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
