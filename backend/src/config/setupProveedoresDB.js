import { getConnection } from './db.js';

const setupDB = async () => {
  try {
    const pool = await getConnection();
    
    console.log("Creando tabla proveedores...");
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='proveedores' and xtype='U')
      CREATE TABLE proveedores (
          id          VARCHAR(36)  PRIMARY KEY,
          nombre      VARCHAR(255) NOT NULL,
          nit         VARCHAR(50)  NOT NULL UNIQUE,
          telefono    VARCHAR(50),
          email       VARCHAR(255),
          direccion   VARCHAR(500)
      );
    `);

    console.log("Creando tabla cierres_dia...");
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='cierres_dia' and xtype='U')
      CREATE TABLE cierres_dia (
          id              VARCHAR(36)    PRIMARY KEY,
          fecha           DATE           NOT NULL,
          total_facturas  DECIMAL(15, 2) NOT NULL DEFAULT 0,
          total_ajustes   DECIMAL(15, 2) NOT NULL DEFAULT 0,
          total_final     DECIMAL(15, 2) NOT NULL DEFAULT 0
      );
    `);

    console.log("Creando tabla facturas_cierre...");
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='facturas_cierre' and xtype='U')
      CREATE TABLE facturas_cierre (
          id                VARCHAR(36)    PRIMARY KEY,
          cierre_id         VARCHAR(36)    NOT NULL,
          proveedor_id      VARCHAR(36)    NOT NULL,
          proveedor_nombre  VARCHAR(255)   NOT NULL,
          valor             DECIMAL(15, 2) NOT NULL,
          descripcion       VARCHAR(500),
          CONSTRAINT fk_factura_cierre
              FOREIGN KEY (cierre_id)    REFERENCES cierres_dia(id) ON DELETE CASCADE,
          CONSTRAINT fk_factura_proveedor
              FOREIGN KEY (proveedor_id) REFERENCES proveedores(id)
      );
    `);

    console.log("Creando tabla ajustes_cierre...");
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ajustes_cierre' and xtype='U')
      CREATE TABLE ajustes_cierre (
          id          VARCHAR(36)    PRIMARY KEY,
          cierre_id   VARCHAR(36)    NOT NULL,
          tipo        VARCHAR(10)    NOT NULL CHECK (tipo IN ('suma', 'resta')),
          valor       DECIMAL(15, 2) NOT NULL,
          descripcion VARCHAR(500),
          CONSTRAINT fk_ajuste_cierre
              FOREIGN KEY (cierre_id) REFERENCES cierres_dia(id) ON DELETE CASCADE
      );
    `);

    console.log("Creando índices de búsqueda frecuente...");
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='idx_cierres_fecha' AND object_id = OBJECT_ID('cierres_dia'))
      CREATE INDEX idx_cierres_fecha ON cierres_dia(fecha);
      
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='idx_facturas_cierre_id' AND object_id = OBJECT_ID('facturas_cierre'))
      CREATE INDEX idx_facturas_cierre_id ON facturas_cierre(cierre_id);
      
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='idx_facturas_proveedor' AND object_id = OBJECT_ID('facturas_cierre'))
      CREATE INDEX idx_facturas_proveedor ON facturas_cierre(proveedor_id);
      
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='idx_ajustes_cierre_id' AND object_id = OBJECT_ID('ajustes_cierre'))
      CREATE INDEX idx_ajustes_cierre_id ON ajustes_cierre(cierre_id);
    `);

    console.log("Base de datos configurada exitosamente.");
    process.exit(0);
  } catch (error) {
    console.error("Error configurando la base de datos:", error);
    process.exit(1);
  }
};

setupDB();
