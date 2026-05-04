import { getConnection, sql } from '../config/db.js';
import crypto from 'crypto';

export const getProveedores = async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query('SELECT * FROM proveedores ORDER BY nombre ASC');
    res.json({ success: true, data: result.recordset });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener proveedores', error: error.message });
  }
};

export const createProveedor = async (req, res) => {
  try {
    const { nombre, nit, telefono, email, direccion } = req.body;
    const pool = await getConnection();
    const id = crypto.randomUUID();

    // Validar si existe Nit
    const checkNit = await pool.request().input('nit', sql.VarChar, nit).query('SELECT id FROM proveedores WHERE nit = @nit');
    if (checkNit.recordset.length > 0) {
        return res.status(400).json({ success: false, message: 'El NIT ya se encuentra registrado en otro proveedor.' });
    }

    await pool.request()
      .input('id', sql.VarChar, id)
      .input('nombre', sql.VarChar, nombre)
      .input('nit', sql.VarChar, nit)
      .input('telefono', sql.VarChar, telefono || null)
      .input('email', sql.VarChar, email || null)
      .input('direccion', sql.VarChar, direccion || null)
      .query(`
        INSERT INTO proveedores (id, nombre, nit, telefono, email, direccion)
        VALUES (@id, @nombre, @nit, @telefono, @email, @direccion)
      `);
      
    res.status(201).json({ success: true, message: 'Proveedor creado exitosamente', id });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al crear proveedor', error: error.message });
  }
};

export const updateProveedor = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, nit, telefono, email, direccion } = req.body;
    const pool = await getConnection();

    // Validar si existe Nit de otro proveedor
    const checkNit = await pool.request()
        .input('nit', sql.VarChar, nit)
        .input('id', sql.VarChar, id)
        .query('SELECT id FROM proveedores WHERE nit = @nit AND id != @id');

    if (checkNit.recordset.length > 0) {
        return res.status(400).json({ success: false, message: 'El NIT ya se encuentra registrado en otro proveedor.' });
    }

    const result = await pool.request()
      .input('id', sql.VarChar, id)
      .input('nombre', sql.VarChar, nombre)
      .input('nit', sql.VarChar, nit)
      .input('telefono', sql.VarChar, telefono || null)
      .input('email', sql.VarChar, email || null)
      .input('direccion', sql.VarChar, direccion || null)
      .query(`
        UPDATE proveedores 
        SET nombre = @nombre, nit = @nit, telefono = @telefono, 
            email = @email, direccion = @direccion
        WHERE id = @id
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ success: false, message: 'Proveedor no encontrado' });
    }

    res.json({ success: true, message: 'Proveedor actualizado exitosamente' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al actualizar proveedor', error: error.message });
  }
};

export const deleteProveedor = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getConnection();
    
    // Asegurarnos de que la columna permite NULL (por si la BD fue creada con NOT NULL)
    try {
      await pool.request().query('ALTER TABLE facturas_cierre ALTER COLUMN proveedor_id VARCHAR(36) NULL');
    } catch (e) {
      console.log('Nota: proveedor_id ya permite NULL o hubo error al alterar la tabla', e.message);
    }

    // Desvincular de cierres pasados para no romper el historial ni la base de datos
    await pool.request()
        .input('id', sql.VarChar, id)
        .query('UPDATE facturas_cierre SET proveedor_id = NULL WHERE proveedor_id = @id');

    const result = await pool.request()
      .input('id', sql.VarChar, id)
      .query('DELETE FROM proveedores WHERE id = @id');

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ success: false, message: 'Proveedor no encontrado' });
    }

    res.json({ success: true, message: 'Proveedor eliminado exitosamente' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al eliminar proveedor', error: error.message });
  }
};
