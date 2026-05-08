import { getConnection, sql } from '../config/db.js';

export const getProductos = async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query('SELECT * FROM productos WHERE activo = 1 ORDER BY id DESC');
    res.json({ success: true, data: result.recordset });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener productos', error: error.message });
  }
};

export const getProductoById = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT * FROM productos WHERE id = @id AND activo = 1');
      
    if (result.recordset.length === 0) return res.status(404).json({ success: false, message: 'Producto no encontrado' });
    res.json({ success: true, data: result.recordset[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener producto', error: error.message });
  }
};

export const createProducto = async (req, res) => {
  try {
    const { nombre, codigo, tipo, descripcion, precio_costo, precio_venta, stock, stock_minimo } = req.body;
    const pool = await getConnection();

    if (codigo) {
      const checkResult = await pool.request()
        .input('codigo', sql.VarChar, codigo)
        .query('SELECT id FROM productos WHERE codigo = @codigo');
      if (checkResult.recordset.length > 0) {
        return res.status(400).json({ success: false, message: 'El código de barras ya existe en otro producto.' });
      }
    }

    const result = await pool.request()
      .input('nombre', sql.VarChar, nombre)
      .input('codigo', sql.VarChar, codigo || null)
      .input('tipo', sql.VarChar, tipo || 'producto')
      .input('descripcion', sql.VarChar, descripcion || '')
      .input('precio_costo', sql.Decimal(14,2), precio_costo || 0)
      .input('precio_venta', sql.Decimal(14,2), precio_venta || 0)
      .input('stock', sql.Int, stock || 0)
      .input('stock_minimo', sql.Int, stock_minimo || 0)
      .query(`
        INSERT INTO productos (nombre, codigo, tipo, descripcion, precio_costo, precio_venta, stock, stock_minimo) 
        OUTPUT INSERTED.id 
        VALUES (@nombre, @codigo, @tipo, @descripcion, @precio_costo, @precio_venta, @stock, @stock_minimo)
      `);
    res.status(201).json({ success: true, message: 'Producto creado', id: result.recordset[0].id });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al crear producto', error: error.message });
  }
};

export const updateProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, codigo, tipo, descripcion, precio_costo, precio_venta, stock, stock_minimo } = req.body;
    const pool = await getConnection();

    if (codigo) {
      const checkResult = await pool.request()
        .input('codigo', sql.VarChar, codigo)
        .input('id', sql.Int, id)
        .query('SELECT id FROM productos WHERE codigo = @codigo AND id != @id');
      if (checkResult.recordset.length > 0) {
        return res.status(400).json({ success: false, message: 'El código de barras ya existe en otro producto.' });
      }
    }

    await pool.request()
      .input('id', sql.Int, id)
      .input('nombre', sql.VarChar, nombre)
      .input('codigo', sql.VarChar, codigo || null)
      .input('tipo', sql.VarChar, tipo || 'producto')
      .input('descripcion', sql.VarChar, descripcion || '')
      .input('precio_costo', sql.Decimal(14,2), precio_costo || 0)
      .input('precio_venta', sql.Decimal(14,2), precio_venta || 0)
      .input('stock_minimo', sql.Int, stock_minimo || 0)
      .input('stock', sql.Int, stock || 0)
      .query(`
        UPDATE productos 
        SET nombre = @nombre, codigo = @codigo, tipo = @tipo, descripcion = @descripcion, 
            precio_costo = @precio_costo, precio_venta = @precio_venta, stock = @stock, stock_minimo = @stock_minimo
        WHERE id = @id
      `);
    res.json({ success: true, message: 'Producto actualizado' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al actualizar producto', error: error.message });
  }
};

export const anularProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getConnection();
    
    // Permitir NULL si no estaba habilitado
    try { await pool.request().query('ALTER TABLE factura_items ALTER COLUMN producto_id INT NULL'); } catch(e){}

    // Desvincular de items de factura para no corromper el historial
    await pool.request().input('id', sql.Int, id).query('UPDATE factura_items SET producto_id = NULL WHERE producto_id = @id');

    await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM productos WHERE id = @id');
      
    res.json({ success: true, message: 'Producto eliminado' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al anular producto', error: error.message });
  }
};
