import express from 'express';
import { getConfiguracion, updateConfiguracion } from '../controllers/configuracionController.js';

const router = express.Router();

router.get('/', getConfiguracion);
router.put('/:id', updateConfiguracion);

export default router;
