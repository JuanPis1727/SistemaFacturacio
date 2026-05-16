import express from 'express';
import { procesarDevolucion } from '../controllers/devolucionesController.js';

const router = express.Router();

router.post('/', procesarDevolucion);

export default router;
