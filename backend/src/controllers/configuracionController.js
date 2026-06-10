import { getConnection, sql } from '../config/db.js';

export const getConfiguracion = async (req, res) => {
  try {
    const negocio_id = req.usuario.negocio_id || 1;
    const pool = await getConnection();
    const result = await pool.request()
      .input('negocio_id', sql.Int, negocio_id)
      .query('SELECT TOP 1 * FROM configuracion WHERE negocio_id = @negocio_id ORDER BY id ASC');
    if (result.recordset.length === 0) return res.status(404).json({ success: false, message: 'Configuración no encontrada' });
    res.json({ success: true, data: result.recordset[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener configuración', error: error.message });
  }
};

export const updateConfiguracion = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      nombre_empresa, nit_empresa, telefono_empresa, email_empresa, 
      direccion_empresa, iva_porcentaje, prefijo_factura, color_primario 
    } = req.body;
    const negocio_id = req.usuario.negocio_id || 1;
    
    const pool = await getConnection();
    await pool.request()
      .input('id', sql.Int, id)
      .input('negocio_id', sql.Int, negocio_id)
      .input('nombre_empresa', sql.VarChar, nombre_empresa)
      .input('nit_empresa', sql.VarChar, nit_empresa || '')
      .input('telefono_empresa', sql.VarChar, telefono_empresa || '')
      .input('email_empresa', sql.VarChar, email_empresa || '')
      .input('direccion_empresa', sql.VarChar, direccion_empresa || '')
      .input('iva_porcentaje', sql.Decimal(5,2), iva_porcentaje || 19.00)
      .input('prefijo_factura', sql.VarChar, prefijo_factura || '')
      .input('color_primario', sql.VarChar, color_primario || '#3b82f6')
      .query(`
        UPDATE configuracion 
        SET nombre_empresa = @nombre_empresa, nit_empresa = @nit_empresa, 
            telefono_empresa = @telefono_empresa, email_empresa = @email_empresa, 
            direccion_empresa = @direccion_empresa, iva_porcentaje = @iva_porcentaje, 
            prefijo_factura = @prefijo_factura, color_primario = @color_primario, 
            actualizado_en = GETDATE()
        WHERE id = @id AND negocio_id = @negocio_id
      `);
      
    res.json({ success: true, message: 'Configuración actualizada' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al actualizar', error: error.message });
  }
};
