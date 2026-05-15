const fs = require('fs');
const path = './server.js';

let content = fs.readFileSync(path, 'utf8');

// Verificar si ya existe configuración de CORS
if (!content.includes('cors({')) {
    // Reemplazar la configuración de CORS existente
    content = content.replace(
        'app.use(cors());',
        `app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true
}));`
    );
    fs.writeFileSync(path, content);
    console.log('✅ CORS configurado correctamente');
} else {
    console.log('⚠️ CORS ya está configurado');
}
