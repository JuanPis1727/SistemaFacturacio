import express from 'express';
import { getFacturas, getFacturaById, createFactura } from '../controllers/facturasController.js';

const router = express.Router();

router.get('/', getFacturas);
router.get('/:id', getFacturaById);
router.post('/', createFactura);

export default router;
