import { getConnection, sql } from '../config/db.js';

export const getFacturas = async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query('SELECT * FROM facturas ORDER BY id DESC');
    res.json({ success: true, data: result.recordset });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener facturas', error: error.message });
  }
};

export const getFacturaById = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getConnection();
    
    // Obtener factura
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT * FROM facturas WHERE id = @id');
      
    if (result.recordset.length === 0) return res.status(404).json({ success: false, message: 'Factura no encontrada' });
    const factura = result.recordset[0];

    // Obtener items de la factura
    const itemsResult = await pool.request()
      .input('factura_id', sql.Int, id)
      .query('SELECT * FROM factura_items WHERE factura_id = @factura_id');
      
    factura.items = itemsResult.recordset;

    res.json({ success: true, data: factura });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener factura', error: error.message });
  }
};

export const createFactura = async (req, res) => {
  try {
    const { numero, cliente_id, cliente_nombre, usuario_id, tipo_venta, estado, metodo_pago, subtotal, total, items } = req.body;
    
    const pool = await getConnection();
    const transaction = new sql.Transaction(pool);
    
    await transaction.begin();
    try {
      // 1. Crear la factura
      const requestFactura = new sql.Request(transaction);
      const resultFactura = await requestFactura
        .input('numero', sql.VarChar, numero)
        .input('cliente_id', sql.Int, cliente_id || null)
        .input('cliente_nombre', sql.VarChar, cliente_nombre || '')
        .input('usuario_id', sql.Int, usuario_id || null)
        .input('tipo_venta', sql.VarChar, tipo_venta || 'contado')
        .input('estado', sql.VarChar, estado || 'Pendiente')
        .input('metodo_pago', sql.VarChar, metodo_pago || 'efectivo')
        .input('subtotal', sql.Decimal(16,2), subtotal)
        .input('total', sql.Decimal(16,2), total)
        .query(`
          INSERT INTO facturas (numero, cliente_id, cliente_nombre, usuario_id, tipo_venta, estado, metodo_pago, subtotal, total) 
          OUTPUT INSERTED.id 
          VALUES (@numero, @cliente_id, @cliente_nombre, @usuario_id, @tipo_venta, @estado, @metodo_pago, @subtotal, @total)
        `);
      
      const facturaId = resultFactura.recordset[0].id;

      // Si es crédito, actualizar la deuda del cliente
      const isCredito = tipo_venta && (tipo_venta.toLowerCase() === 'crédito' || tipo_venta.toLowerCase() === 'credito');
      if (isCredito && cliente_id) {
        const updateClientRequest = new sql.Request(transaction);
        await updateClientRequest
          .input('cliente', sql.Int, cliente_id)
          .input('monto', sql.Decimal(16,2), total)
          .query('UPDATE clientes SET deuda_total = deuda_total + @monto WHERE id = @cliente');
      }

      // 2. Insertar los items
      if (items && items.length > 0) {
        for (const item of items) {
          const requestItem = new sql.Request(transaction);
          await requestItem
            .input('factura_id', sql.Int, facturaId)
            .input('producto_id', sql.Int, item.producto_id || null)
            .input('descripcion', sql.VarChar, item.descripcion)
            .input('cantidad', sql.Decimal(10,2), item.cantidad)
            .input('precio_unitario', sql.Decimal(14,2), item.precio_unitario)
            .input('subtotal', sql.Decimal(14,2), item.subtotal)
            .query(`
              INSERT INTO factura_items (factura_id, producto_id, descripcion, cantidad, precio_unitario, subtotal)
              VALUES (@factura_id, @producto_id, @descripcion, @cantidad, @precio_unitario, @subtotal);
            `);
        }
      }

      await transaction.commit();
      res.status(201).json({ success: true, message: 'Factura creada exitosamente', id: facturaId });

    } catch (err) {
      await transaction.rollback();
      throw err;
    }

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al crear la factura', error: error.message });
  }
};
