import jwt from 'jsonwebtoken';

export const verificarToken = (req, res, next) => {
  const token = req.headers['authorization'];

  if (!token) {
    return res.status(403).json({ success: false, message: 'Acceso Denegado: Permisos Insuficientes o No Autorizado' });
  }

  try {
    const decodificado = jwt.verify(token.split(" ")[1], process.env.JWT_SECRET || 'secret');
    req.usuario = decodificado;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Sesión Inválida o Expirada' });
  }
};

export const verificarAdmin = (req, res, next) => {
  if (req.usuario && req.usuario.rol && req.usuario.rol.toLowerCase() === 'admin') {
    next();
  } else {
    return res.status(403).json({ success: false, message: 'Acceso Denegado: Requiere permisos de Administrador' });
  }
};
