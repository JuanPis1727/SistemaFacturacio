-- Script para actualizar el trigger trg_entrada_inventario para soportar multiusuario (negocio_id)
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_entrada_inventario')
BEGIN
    EXEC('
    ALTER TRIGGER trg_entrada_inventario
    ON inventario_entradas
    INSTEAD OF INSERT
    AS
    BEGIN
      DECLARE @prod_id INT, @cant INT, @stock_antes INT;
      SELECT @prod_id = producto_id, @cant = cantidad FROM inserted;
      SELECT @stock_antes = ISNULL(stock, 0) FROM productos WHERE id = @prod_id;
      
      INSERT INTO inventario_entradas (producto_id, usuario_id, cantidad, stock_antes, stock_despues, precio_costo, proveedor, notas, negocio_id)
      SELECT i.producto_id, i.usuario_id, i.cantidad, @stock_antes, @stock_antes + i.cantidad, i.precio_costo, i.proveedor, i.notas, COALESCE(i.negocio_id, p.negocio_id, 1)
      FROM inserted i
      LEFT JOIN productos p ON p.id = i.producto_id;
      
      UPDATE productos SET stock = @stock_antes + @cant WHERE id = @prod_id;
    END
    ');
    PRINT 'Trigger trg_entrada_inventario actualizado exitosamente para soportar negocio_id.';
END
ELSE
    PRINT 'El trigger trg_entrada_inventario no existe.';
GO
