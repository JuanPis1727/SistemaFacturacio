import { getConnection, sql } from '../config/db.js';

export const getClientes = async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query('SELECT * FROM clientes WHERE activo = 1 ORDER BY id DESC');
    res.json({ success: true, data: result.recordset });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener clientes', error: error.message });
  }
};

export const getClienteById = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT * FROM clientes WHERE id = @id AND activo = 1');
      
    if (result.recordset.length === 0) return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
    res.json({ success: true, data: result.recordset[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener cliente', error: error.message });
  }
};

export const createCliente = async (req, res) => {
  try {
    const { nombre, cedula, email, telefono, direccion, deuda_inicial } = req.body;
    const pool = await getConnection();
    const result = await pool.request()
      .input('nombre', sql.VarChar, nombre)
      .input('cedula', sql.VarChar, cedula)
      .input('email', sql.VarChar, email)
      .input('telefono', sql.VarChar, telefono)
      .input('direccion', sql.VarChar, direccion)
      .input('deuda_total', sql.Decimal(15,2), deuda_inicial || 0)
      .query(`
        INSERT INTO clientes (nombre, cedula, email, telefono, direccion, deuda_total) 
        OUTPUT INSERTED.id 
        VALUES (@nombre, @cedula, @email, @telefono, @direccion, @deuda_total)
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
    const pool = await getConnection();
    await pool.request()
      .input('id', sql.Int, id)
      .input('nombre', sql.VarChar, nombre)
      .input('cedula', sql.VarChar, cedula)
      .input('email', sql.VarChar, email)
      .input('telefono', sql.VarChar, telefono)
      .input('direccion', sql.VarChar, direccion)
      .query(`
        UPDATE clientes 
        SET nombre = @nombre, cedula = @cedula, email = @email, 
            telefono = @telefono, direccion = @direccion
        WHERE id = @id
      `);
    res.json({ success: true, message: 'Cliente actualizado' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al actualizar', error: error.message });
  }
};

export const anularCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getConnection();
    
    // Permitir NULL si no estaba habilitado
    try { await pool.request().query('ALTER TABLE facturas ALTER COLUMN cliente_id INT NULL'); } catch(e){}
    try { await pool.request().query('ALTER TABLE abonos ALTER COLUMN cliente_id INT NULL'); } catch(e){}

    // Desvincular de facturas y abonos para no corromper el historial
    await pool.request().input('id', sql.Int, id).query('UPDATE facturas SET cliente_id = NULL WHERE cliente_id = @id');
    await pool.request().input('id', sql.Int, id).query('UPDATE abonos SET cliente_id = NULL WHERE cliente_id = @id');

    await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM clientes WHERE id = @id');
      
    res.json({ success: true, message: 'Cliente eliminado' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al anular cliente', error: error.message });
  }
};
