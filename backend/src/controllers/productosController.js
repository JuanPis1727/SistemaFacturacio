import { getConnection, sql } from '../config/db.js';

export const getProductos = async (req, res) => {
  try {
    const negocio_id = req.usuario.negocio_id || 1;
    const pool = await getConnection();
    const result = await pool.request()
      .input('negocio_id', sql.Int, negocio_id)
      .query('SELECT * FROM productos WHERE negocio_id = @negocio_id AND activo = 1 ORDER BY id DESC');
    res.json({ success: true, data: result.recordset });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener productos', error: error.message });
  }
};

export const getProductoById = async (req, res) => {
  try {
    const { id } = req.params;
    const negocio_id = req.usuario.negocio_id || 1;
    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('negocio_id', sql.Int, negocio_id)
      .query('SELECT * FROM productos WHERE id = @id AND negocio_id = @negocio_id AND activo = 1');
      
    if (result.recordset.length === 0) return res.status(404).json({ success: false, message: 'Producto no encontrado' });
    res.json({ success: true, data: result.recordset[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener producto', error: error.message });
  }
};

export const createProducto = async (req, res) => {
  try {
    const { nombre, codigo, tipo, descripcion, precio_costo, precio_venta, stock, stock_minimo, por_peso } = req.body;
    const negocio_id = req.usuario.negocio_id || 1;
    const pool = await getConnection();

    if (codigo) {
      const checkResult = await pool.request()
        .input('codigo', sql.VarChar, codigo)
        .input('negocio_id', sql.Int, negocio_id)
        .query('SELECT id FROM productos WHERE codigo = @codigo AND negocio_id = @negocio_id');
      if (checkResult.recordset.length > 0) {
        return res.status(400).json({ success: false, message: 'El código de barras ya existe en otro producto de este negocio.' });
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
      .input('por_peso', sql.Decimal(1,0), por_peso || 0)
      .input('negocio_id', sql.Int, negocio_id)
      .query(`
        INSERT INTO productos (nombre, codigo, tipo, descripcion, precio_costo, precio_venta, stock, stock_minimo, por_peso, negocio_id) 
        OUTPUT INSERTED.id 
        VALUES (@nombre, @codigo, @tipo, @descripcion, @precio_costo, @precio_venta, @stock, @stock_minimo, @por_peso, @negocio_id)
      `);
    res.status(201).json({ success: true, message: 'Producto creado', id: result.recordset[0].id });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al crear producto', error: error.message });
  }
};

export const updateProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, codigo, tipo, descripcion, precio_costo, precio_venta, stock, stock_minimo, por_peso } = req.body;
    const negocio_id = req.usuario.negocio_id || 1;
    const pool = await getConnection();

    if (codigo) {
      const checkResult = await pool.request()
        .input('codigo', sql.VarChar, codigo)
        .input('id', sql.Int, id)
        .input('negocio_id', sql.Int, negocio_id)
        .query('SELECT id FROM productos WHERE codigo = @codigo AND id != @id AND negocio_id = @negocio_id');
      if (checkResult.recordset.length > 0) {
        return res.status(400).json({ success: false, message: 'El código de barras ya existe en otro producto de este negocio.' });
      }
    }

    await pool.request()
      .input('id', sql.Int, id)
      .input('negocio_id', sql.Int, negocio_id)
      .input('nombre', sql.VarChar, nombre)
      .input('codigo', sql.VarChar, codigo || null)
      .input('tipo', sql.VarChar, tipo || 'producto')
      .input('descripcion', sql.VarChar, descripcion || '')
      .input('precio_costo', sql.Decimal(14,2), precio_costo || 0)
      .input('precio_venta', sql.Decimal(14,2), precio_venta || 0)
      .input('stock_minimo', sql.Int, stock_minimo || 0)
      .input('stock', sql.Int, stock || 0)
      .input('por_peso', sql.Decimal(1,0), por_peso || 0)
      .query(`
        UPDATE productos 
        SET nombre = @nombre, codigo = @codigo, tipo = @tipo, descripcion = @descripcion, 
            precio_costo = @precio_costo, precio_venta = @precio_venta, stock = @stock, stock_minimo = @stock_minimo, por_peso = @por_peso
        WHERE id = @id AND negocio_id = @negocio_id
      `);
    res.json({ success: true, message: 'Producto actualizado' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al actualizar producto', error: error.message });
  }
};

export const anularProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const negocio_id = req.usuario.negocio_id || 1;
    const pool = await getConnection();
    
    // Permitir NULL si no estaba habilitado
    try { await pool.request().query('ALTER TABLE factura_items ALTER COLUMN producto_id INT NULL'); } catch(e){}

    // Desvincular de items de factura para no corromper el historial (garantizar que pertenezca al negocio mediante join o validación)
    const checkResult = await pool.request()
      .input('id', sql.Int, id)
      .input('negocio_id', sql.Int, negocio_id)
      .query('SELECT id FROM productos WHERE id = @id AND negocio_id = @negocio_id');
      
    if (checkResult.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Producto no encontrado en su negocio.' });
    }

    await pool.request().input('id', sql.Int, id).query('UPDATE factura_items SET producto_id = NULL WHERE producto_id = @id');

    await pool.request()
      .input('id', sql.Int, id)
      .input('negocio_id', sql.Int, negocio_id)
      .query('DELETE FROM productos WHERE id = @id AND negocio_id = @negocio_id');
      
    res.json({ success: true, message: 'Producto eliminado' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al anular producto', error: error.message });
  }
};
