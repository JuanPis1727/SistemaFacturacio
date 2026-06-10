import { getConnection, sql } from '../config/db.js';

export const getInventarioEntradas = async (req, res) => {
  try {
    const negocio_id = req.usuario.negocio_id || 1;
    const pool = await getConnection();
    const result = await pool.request()
      .input('negocio_id', sql.Int, negocio_id)
      .query(`
        SELECT e.*, p.nombre as producto_nombre 
        FROM inventario_entradas e
        LEFT JOIN productos p ON p.id = e.producto_id
        WHERE e.negocio_id = @negocio_id AND p.negocio_id = @negocio_id
        ORDER BY e.id DESC
      `);
    res.json({ success: true, data: result.recordset });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener entradas', error: error.message });
  }
};

export const createInventarioEntrada = async (req, res) => {
  try {
    const { producto_id, usuario_id, cantidad, precio_costo, proveedor, notas } = req.body;
    const negocio_id = req.usuario.negocio_id || 1;
    
    // Importante: La tabla 'inventario_entradas' tiene un TRIGGER 'trg_entrada_inventario' 
    // que se encarga de actualizar el stock del producto automáticamente usando INSTEAD OF INSERT.
    // Solo necesitamos enviar el INSERT básico y SQL Server hará el resto por detrás.

    const pool = await getConnection();

    // Validar primero que el producto pertenece al negocio
    const checkProduct = await pool.request()
      .input('producto_id', sql.Int, producto_id)
      .input('negocio_id', sql.Int, negocio_id)
      .query('SELECT id FROM productos WHERE id = @producto_id AND negocio_id = @negocio_id');

    if (checkProduct.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Producto no encontrado en su negocio.' });
    }

    const result = await pool.request()
      .input('producto_id', sql.Int, producto_id)
      .input('usuario_id', sql.Int, usuario_id || null)
      .input('cantidad', sql.Int, cantidad)
      .input('precio_costo', sql.Decimal(14,2), precio_costo || 0)
      .input('proveedor', sql.VarChar, proveedor || '')
      .input('notas', sql.VarChar, notas || '')
      .input('negocio_id', sql.Int, negocio_id)
      .query(`
        INSERT INTO inventario_entradas (producto_id, usuario_id, cantidad, precio_costo, proveedor, notas, negocio_id)
        VALUES (@producto_id, @usuario_id, @cantidad, @precio_costo, @proveedor, @notes_or_similar_placeholder_name_let_us_be_exact_and_use_notas, @negocio_id);
      `.replace('@notes_or_similar_placeholder_name_let_us_be_exact_and_use_notas', '@notas'));

    // Actualizar el precio de costo y venta del producto para que apliquen las nuevas tarifas
    if (req.body.precio_venta !== undefined) {
      await pool.request()
        .input('producto_id', sql.Int, producto_id)
        .input('negocio_id', sql.Int, negocio_id)
        .input('precio_costo', sql.Decimal(14,2), precio_costo || 0)
        .input('precio_venta', sql.Decimal(14,2), req.body.precio_venta)
        .query(`
          UPDATE productos 
          SET precio_costo = @precio_costo, 
              precio_venta = @precio_venta 
          WHERE id = @producto_id AND negocio_id = @negocio_id;
        `);
    }
      
    res.status(201).json({ success: true, message: 'Entrada de inventario registrada. Stock actualizado.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al registrar entrada', error: error.message });
  }
};
