import express from 'express';
import { getInventarioEntradas, createInventarioEntrada } from '../controllers/inventarioController.js';

const router = express.Router();

router.get('/', getInventarioEntradas);
router.post('/', createInventarioEntrada);

export default router;
