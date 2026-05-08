import React, { useState, useEffect } from 'react';
import { fetchAPI } from '../../services/api';
import { Save, Store } from 'lucide-react';
import './Configuracion.css';

export default function Configuracion() {
  const [formData, setFormData] = useState({
    id: 1,
    nombre_empresa: '',
    nit_empresa: '',
    telefono_empresa: '',
    email_empresa: '',
    direccion_empresa: '',
    logo_url: '',
    iva_porcentaje: 19.00,
    prefijo_factura: '',
    consecutivo_actual: 1000,
    color_primario: '#3b82f6',
    footer_factura: '',
    pais_codigo_tel: '+57'
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    const res = await fetchAPI('/configuracion');
    if (res.success && res.data) {
      setFormData(res.data);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Asumimos que id = 1 siempre para la config principal
    const res = await fetchAPI(`/configuracion/${formData.id || 1}`, 'PUT', formData);
    if (res.success) {
      alert('Configuración guardada exitosamente');
    } else {
      alert(res.message);
    }
    setLoading(false);
  };

  return (
    <div className="config-page">
      <div className="page-header">
        <h2 className="title" style={{ fontSize: '2rem', marginBottom: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Store size={32} /> Configuración de la Empresa
        </h2>
      </div>

      <div className="config-container glass-card" style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'left' }}>
        <form onSubmit={handleSubmit} className="config-form">
          <div className="form-grid">
            <div className="form-group">
              <label>Nombre de la Empresa / Local:</label>
              <input className="form-control" type="text" required value={formData.nombre_empresa} onChange={e => setFormData({...formData, nombre_empresa: e.target.value})} />
            </div>
            
            <div className="form-group">
              <label>NIT / RUT / Documento:</label>
              <input className="form-control" type="text" value={formData.nit_empresa || ''} onChange={e => setFormData({...formData, nit_empresa: e.target.value})} />
            </div>

            <div className="form-group">
              <label>Teléfono:</label>
              <input className="form-control" type="text" value={formData.telefono_empresa || ''} onChange={e => setFormData({...formData, telefono_empresa: e.target.value})} />
            </div>

            <div className="form-group">
              <label>Email de Contacto:</label>
              <input className="form-control" type="email" value={formData.email_empresa || ''} onChange={e => setFormData({...formData, email_empresa: e.target.value})} />
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label>Dirección:</label>
              <input className="form-control" type="text" value={formData.direccion_empresa || ''} onChange={e => setFormData({...formData, direccion_empresa: e.target.value})} />
            </div>

            <div className="form-group">
              <label>Prefijo de Factura (ej: FAC-):</label>
              <input className="form-control" type="text" value={formData.prefijo_factura || ''} onChange={e => setFormData({...formData, prefijo_factura: e.target.value})} />
            </div>
            
            <div className="form-group">
              <label>Consecutivo Actual (Siguiente factura):</label>
              <input className="form-control" type="number" value={formData.consecutivo_actual} onChange={e => setFormData({...formData, consecutivo_actual: e.target.value === '' ? '' : Number(e.target.value)})} />
            </div>

            <div className="form-group">
              <label>IVA por defecto (%):</label>
              <input className="form-control" type="number" step="0.01" value={formData.iva_porcentaje} onChange={e => setFormData({...formData, iva_porcentaje: e.target.value === '' ? '' : Number(e.target.value)})} />
            </div>

            <div className="form-group">
              <label>País Código Tel (ej: +57):</label>
              <input className="form-control" type="text" value={formData.pais_codigo_tel || ''} onChange={e => setFormData({...formData, pais_codigo_tel: e.target.value})} />
            </div>

            <div className="form-group">
              <label>URL Logo (Imágenes web):</label>
              <input className="form-control" type="text" value={formData.logo_url || ''} onChange={e => setFormData({...formData, logo_url: e.target.value})} />
            </div>

            <div className="form-group">
              <label>Color Principal Hexadecimal:</label>
              <div style={{display: 'flex', gap: '10px'}}>
                 <input className="form-control" type="color" style={{width: '60px', padding: '5px'}} value={formData.color_primario || '#3b82f6'} onChange={e => setFormData({...formData, color_primario: e.target.value})} />
                 <input className="form-control" type="text" value={formData.color_primario || ''} onChange={e => setFormData({...formData, color_primario: e.target.value})} />
              </div>
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label>Texto en el Pie de Factura (Términos / Gracias):</label>
              <input className="form-control" type="text" value={formData.footer_factura || ''} onChange={e => setFormData({...formData, footer_factura: e.target.value})} />
            </div>
          </div>

          <div style={{ marginTop: '2rem', textAlign: 'right' }}>
            <button type="submit" className="primary-btn" disabled={loading}>
              <Save size={20} /> Guardar Configuración
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
