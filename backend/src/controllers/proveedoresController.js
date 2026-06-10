import { getConnection, sql } from '../config/db.js';
import crypto from 'crypto';

export const getProveedores = async (req, res) => {
  try {
    const negocio_id = req.usuario.negocio_id || 1;
    const pool = await getConnection();
    const result = await pool.request()
      .input('negocio_id', sql.Int, negocio_id)
      .query('SELECT * FROM proveedores WHERE negocio_id = @negocio_id ORDER BY nombre ASC');
    res.json({ success: true, data: result.recordset });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener proveedores', error: error.message });
  }
};

export const createProveedor = async (req, res) => {
  try {
    const { nombre, nit, telefono, email, direccion } = req.body;
    const negocio_id = req.usuario.negocio_id || 1;
    const pool = await getConnection();
    const id = crypto.randomUUID();

    // Validar si existe Nit dentro de este negocio
    const checkNit = await pool.request()
        .input('nit', sql.VarChar, nit)
        .input('negocio_id', sql.Int, negocio_id)
        .query('SELECT id FROM proveedores WHERE nit = @nit AND negocio_id = @negocio_id');
    if (checkNit.recordset.length > 0) {
        return res.status(400).json({ success: false, message: 'El NIT ya se encuentra registrado en otro proveedor de este negocio.' });
    }

    await pool.request()
      .input('id', sql.VarChar, id)
      .input('nombre', sql.VarChar, nombre)
      .input('nit', sql.VarChar, nit)
      .input('telefono', sql.VarChar, telefono || null)
      .input('email', sql.VarChar, email || null)
      .input('direccion', sql.VarChar, direccion || null)
      .input('negocio_id', sql.Int, negocio_id)
      .query(`
        INSERT INTO proveedores (id, nombre, nit, telefono, email, direccion, negocio_id)
        VALUES (@id, @nombre, @nit, @telefono, @email, @direccion, @negocio_id)
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
    const negocio_id = req.usuario.negocio_id || 1;
    const pool = await getConnection();

    // Validar si existe Nit de otro proveedor en este negocio
    const checkNit = await pool.request()
        .input('nit', sql.VarChar, nit)
        .input('id', sql.VarChar, id)
        .input('negocio_id', sql.Int, negocio_id)
        .query('SELECT id FROM proveedores WHERE nit = @nit AND id != @id AND negocio_id = @negocio_id');

    if (checkNit.recordset.length > 0) {
        return res.status(400).json({ success: false, message: 'El NIT ya se encuentra registrado en otro proveedor de este negocio.' });
    }

    const result = await pool.request()
      .input('id', sql.VarChar, id)
      .input('negocio_id', sql.Int, negocio_id)
      .input('nombre', sql.VarChar, nombre)
      .input('nit', sql.VarChar, nit)
      .input('telefono', sql.VarChar, telefono || null)
      .input('email', sql.VarChar, email || null)
      .input('direccion', sql.VarChar, direccion || null)
      .query(`
        UPDATE proveedores 
        SET nombre = @nombre, nit = @nit, telefono = @telefono, 
            email = @email, direccion = @direccion
        WHERE id = @id AND negocio_id = @negocio_id
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
    const negocio_id = req.usuario.negocio_id || 1;
    const pool = await getConnection();
    
    // Asegurarnos de que la columna permite NULL (por si la BD fue creada con NOT NULL)
    try {
      await pool.request().query('ALTER TABLE facturas_cierre ALTER COLUMN proveedor_id VARCHAR(36) NULL');
    } catch (e) {
      console.log('Nota: proveedor_id ya permite NULL o hubo error al alterar la tabla', e.message);
    }

    // Validar primero que el proveedor pertenece a este negocio
    const checkResult = await pool.request()
      .input('id', sql.VarChar, id)
      .input('negocio_id', sql.Int, negocio_id)
      .query('SELECT id FROM proveedores WHERE id = @id AND negocio_id = @negocio_id');
      
    if (checkResult.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Proveedor no encontrado en su negocio.' });
    }

    // Desvincular de cierres pasados para no romper el historial ni la base de datos
    await pool.request()
        .input('id', sql.VarChar, id)
        .query('UPDATE facturas_cierre SET proveedor_id = NULL WHERE proveedor_id = @id');

    const result = await pool.request()
      .input('id', sql.VarChar, id)
      .input('negocio_id', sql.Int, negocio_id)
      .query('DELETE FROM proveedores WHERE id = @id AND negocio_id = @negocio_id');

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ success: false, message: 'Proveedor no encontrado' });
    }

    res.json({ success: true, message: 'Proveedor eliminado exitosamente' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al eliminar proveedor', error: error.message });
  }
};
