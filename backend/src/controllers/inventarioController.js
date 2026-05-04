import { getConnection, sql } from '../config/db.js';

export const getInventarioEntradas = async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query(`
      SELECT e.*, p.nombre as producto_nombre 
      FROM inventario_entradas e
      LEFT JOIN productos p ON p.id = e.producto_id
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
    
    // Importante: La tabla 'inventario_entradas' tiene un TRIGGER 'trg_entrada_inventario' 
    // que se encarga de actualizar el stock del producto automáticamente usando INSTEAD OF INSERT.
    // Solo necesitamos enviar el INSERT básico y SQL Server hará el resto por detrás.

    const pool = await getConnection();
    const result = await pool.request()
      .input('producto_id', sql.Int, producto_id)
      .input('usuario_id', sql.Int, usuario_id || null)
      .input('cantidad', sql.Int, cantidad)
      .input('precio_costo', sql.Decimal(14,2), precio_costo || 0)
      .input('proveedor', sql.VarChar, proveedor || '')
      .input('notas', sql.VarChar, notas || '')
      .query(`
        INSERT INTO inventario_entradas (producto_id, usuario_id, cantidad, precio_costo, proveedor, notas)
        VALUES (@producto_id, @usuario_id, @cantidad, @precio_costo, @proveedor, @notas);
      `);

    // Actualizar el precio de costo y venta del producto para que apliquen las nuevas tarifas
    if (req.body.precio_venta !== undefined) {
      await pool.request()
        .input('producto_id', sql.Int, producto_id)
        .input('precio_costo', sql.Decimal(14,2), precio_costo || 0)
        .input('precio_venta', sql.Decimal(14,2), req.body.precio_venta)
        .query(`
          UPDATE productos 
          SET precio_costo = @precio_costo, 
              precio_venta = @precio_venta 
          WHERE id = @producto_id;
        `);
    }
      
    res.status(201).json({ success: true, message: 'Entrada de inventario registrada. Stock actualizado.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al registrar entrada', error: error.message });
  }
};
