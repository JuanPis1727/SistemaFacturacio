import { getConnection, sql } from '../config/db.js';

export const procesarDevolucion = async (req, res) => {
  try {
    const { producto_id, cantidad, descripcion, usuario_id } = req.body;
    const negocio_id = req.usuario.negocio_id || 1;
    
    if (!producto_id || !cantidad || cantidad <= 0) {
      return res.status(400).json({ success: false, message: 'Producto y cantidad válidos son requeridos.' });
    }

    const pool = await getConnection();
    
    // 1. Obtener datos del producto
    const prodResult = await pool.request()
      .input('producto_id', sql.Int, producto_id)
      .input('negocio_id', sql.Int, negocio_id)
      .query('SELECT * FROM productos WHERE id = @producto_id AND negocio_id = @negocio_id');
      
    if (prodResult.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Producto no encontrado.' });
    }
    
    const producto = prodResult.recordset[0];
    const precioVenta = Number(producto.precio_venta);
    const totalDevolucion = -(precioVenta * cantidad); // Valor negativo para restar ingresos

    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    
    try {
      // NOTA: No insertamos en inventario_entradas porque la base de datos ya tiene un trigger
      // en la tabla factura_items que al insertar una cantidad negativa (-cantidad) 
      // automáticamente suma esa cantidad al stock. Hacerlo en ambas tablas duplicaba la devolución.

      // 3. Crear factura negativa para restar del Dashboard
      const reqFactura = new sql.Request(transaction);
      const resFactura = await reqFactura
        .input('numero', sql.VarChar, `DEV-${Date.now()}`)
        .input('cliente_nombre', sql.VarChar, 'Cliente (Devolución)')
        .input('usuario_id', sql.Int, usuario_id || null)
        .input('tipo_venta', sql.VarChar, 'contado') // Para que afecte ingresos al contado
        .input('estado', sql.VarChar, 'Pagada')
        .input('metodo_pago', sql.VarChar, 'efectivo')
        .input('subtotal', sql.Decimal(16,2), totalDevolucion)
        .input('total', sql.Decimal(16,2), totalDevolucion)
        .input('negocio_id', sql.Int, negocio_id)
        .query(`
          INSERT INTO facturas (numero, cliente_nombre, usuario_id, tipo_venta, estado, metodo_pago, subtotal, total, negocio_id) 
          OUTPUT INSERTED.id 
          VALUES (@numero, @cliente_nombre, @usuario_id, @tipo_venta, @estado, @metodo_pago, @subtotal, @total, @negocio_id)
        `);
        
      const facturaId = resFactura.recordset[0].id;

      // 4. Insertar item de factura negativo
      const reqItem = new sql.Request(transaction);
      await reqItem
        .input('factura_id', sql.Int, facturaId)
        .input('producto_id', sql.Int, producto_id)
        .input('descripcion', sql.VarChar, `Devolución: ${producto.nombre}`)
        .input('cantidad', sql.Decimal(10,2), -cantidad)
        .input('precio_unitario', sql.Decimal(14,2), precioVenta)
        .input('subtotal', sql.Decimal(14,2), totalDevolucion)
        .query(`
          INSERT INTO factura_items (factura_id, producto_id, descripcion, cantidad, precio_unitario, subtotal)
          VALUES (@factura_id, @producto_id, @descripcion, @cantidad, @precio_unitario, @subtotal);
        `);

      await transaction.commit();
      res.status(201).json({ success: true, message: 'Devolución procesada correctamente. Stock y ventas ajustados.' });

    } catch (err) {
      await transaction.rollback();
      throw err;
    }

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al procesar devolución', error: error.message });
  }
};
