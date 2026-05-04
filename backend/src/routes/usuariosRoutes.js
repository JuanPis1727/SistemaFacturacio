import express from 'express';
import { getUsuarios, createUsuario, updateUsuario, anularUsuario, loginUsuario } from '../controllers/usuariosController.js';
import { verificarToken, verificarAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Ruta Pública
router.post('/login', loginUsuario);

// Rutas Privadas (Solo Admin)
router.get('/', verificarToken, verificarAdmin, getUsuarios);
router.post('/', verificarToken, verificarAdmin, createUsuario);
router.put('/:id', verificarToken, verificarAdmin, updateUsuario);
router.delete('/:id', verificarToken, verificarAdmin, anularUsuario);

export default router;
