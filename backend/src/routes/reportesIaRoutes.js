import express from 'express';
import { consultarReporteIa, exportarExcel } from '../controllers/reportesIaController.js';

const router = express.Router();

router.post('/chat', consultarReporteIa);
router.post('/exportar-excel', exportarExcel);

export default router;
