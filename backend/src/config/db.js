import sql from 'mssql';
import dotenv from 'dotenv';
dotenv.config();

const dbSettings = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT, 10) || 1433,
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true' || process.env.NODE_ENV === 'production', // true for Azure
    trustServerCertificate: process.env.DB_ENCRYPT !== 'true' && process.env.NODE_ENV !== 'production', // Local dev
  },
};

let poolPromise;

export async function getConnection() {
  try {
    if (!poolPromise) {
      poolPromise = new sql.ConnectionPool(dbSettings).connect();
    }
    return await poolPromise;
  } catch (error) {
    console.error('Error conectando a la base de datos:', error);
    poolPromise = null;
    throw error;
  }
}

export { sql };
