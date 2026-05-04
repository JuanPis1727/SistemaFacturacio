import express from 'express';
import { saveCierreDia, getHistorialCierres } from '../controllers/cierresDiaController.js';

const router = express.Router();

router.get('/', getHistorialCierres);
router.post('/', saveCierreDia);

export default router;
