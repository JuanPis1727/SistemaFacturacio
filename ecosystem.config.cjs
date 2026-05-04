module.exports = {
  apps: [
    {
      name: "facturacion-backend",
      script: "./backend/server.js",
      instances: "max", // Escala a todos los cores disponibles
      exec_mode: "cluster",
      env: {
        NODE_ENV: "development",
        PORT: 4000
      },
      env_production: {
        NODE_ENV: "production",
        SERVE_FRONTEND: "true",
        PORT: 80
      }
    }
  ]
};
