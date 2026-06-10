import { getConnection, sql } from '../config/db.js';

export const getClientes = async (req, res) => {
  try {
    const negocio_id = req.usuario.negocio_id || 1;
    const pool = await getConnection();
    const result = await pool.request()
      .input('negocio_id', sql.Int, negocio_id)
      .query('SELECT * FROM clientes WHERE negocio_id = @negocio_id AND activo = 1 ORDER BY id DESC');
    res.json({ success: true, data: result.recordset });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener clientes', error: error.message });
  }
};

export const getClienteById = async (req, res) => {
  try {
    const { id } = req.params;
    const negocio_id = req.usuario.negocio_id || 1;
    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('negocio_id', sql.Int, negocio_id)
      .query('SELECT * FROM clientes WHERE id = @id AND negocio_id = @negocio_id AND activo = 1');
      
    if (result.recordset.length === 0) return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
    res.json({ success: true, data: result.recordset[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener cliente', error: error.message });
  }
};

export const createCliente = async (req, res) => {
  try {
    const { nombre, cedula, email, telefono, direccion, deuda_inicial } = req.body;
    const negocio_id = req.usuario.negocio_id || 1;
    const pool = await getConnection();
    const result = await pool.request()
      .input('nombre', sql.VarChar, nombre)
      .input('cedula', sql.VarChar, cedula)
      .input('email', sql.VarChar, email)
      .input('telefono', sql.VarChar, telefono)
      .input('direccion', sql.VarChar, direccion)
      .input('deuda_total', sql.Decimal(15,2), deuda_inicial || 0)
      .input('negocio_id', sql.Int, negocio_id)
      .query(`
        INSERT INTO clientes (nombre, cedula, email, telefono, direccion, deuda_total, negocio_id) 
        OUTPUT INSERTED.id 
        VALUES (@nombre, @cedula, @email, @telefono, @direccion, @deuda_total, @negocio_id)
      `);
    res.status(201).json({ success: true, message: 'Cliente creado', id: result.recordset[0].id });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al crear cliente', error: error.message });
  }
};

export const updateCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, cedula, email, telefono, direccion } = req.body;
    const negocio_id = req.usuario.negocio_id || 1;
    const pool = await getConnection();
    await pool.request()
      .input('id', sql.Int, id)
      .input('negocio_id', sql.Int, negocio_id)
      .input('nombre', sql.VarChar, nombre)
      .input('cedula', sql.VarChar, cedula)
      .input('email', sql.VarChar, email)
      .input('telefono', sql.VarChar, telefono)
      .input('direccion', sql.VarChar, direccion)
      .query(`
        UPDATE clientes 
        SET nombre = @nombre, cedula = @cedula, email = @email, 
            telefono = @telefono, direccion = @direccion
        WHERE id = @id AND negocio_id = @negocio_id
      `);
    res.json({ success: true, message: 'Cliente actualizado' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al actualizar', error: error.message });
  }
};

export const anularCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const negocio_id = req.usuario.negocio_id || 1;
    const pool = await getConnection();
    
    // Permitir NULL si no estaba habilitado
    try { await pool.request().query('ALTER TABLE facturas ALTER COLUMN cliente_id INT NULL'); } catch(e){}
    try { await pool.request().query('ALTER TABLE abonos ALTER COLUMN cliente_id INT NULL'); } catch(e){}

    // Desvincular de facturas y abonos para no corromper el historial
    await pool.request()
      .input('id', sql.Int, id)
      .input('negocio_id', sql.Int, negocio_id)
      .query('UPDATE facturas SET cliente_id = NULL WHERE cliente_id = @id AND negocio_id = @negocio_id');
    await pool.request()
      .input('id', sql.Int, id)
      .input('negocio_id', sql.Int, negocio_id)
      .query('UPDATE abonos SET cliente_id = NULL WHERE cliente_id = @id AND negocio_id = @negocio_id');

    await pool.request()
      .input('id', sql.Int, id)
      .input('negocio_id', sql.Int, negocio_id)
      .query('DELETE FROM clientes WHERE id = @id AND negocio_id = @negocio_id');
      
    res.json({ success: true, message: 'Cliente eliminado' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al anular cliente', error: error.message });
  }
};
