import express from 'express';
import { getUsuarios, createUsuario, updateUsuario, anularUsuario, loginUsuario, registroNegocio } from '../controllers/usuariosController.js';
import { verificarToken, verificarAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Rutas Públicas
router.post('/login', loginUsuario);
router.post('/registro-negocio', registroNegocio);

// Rutas Privadas (Solo Admin)
router.get('/', verificarToken, verificarAdmin, getUsuarios);
router.post('/', verificarToken, verificarAdmin, createUsuario);
router.put('/:id', verificarToken, verificarAdmin, updateUsuario);
router.delete('/:id', verificarToken, verificarAdmin, anularUsuario);

export default router;
