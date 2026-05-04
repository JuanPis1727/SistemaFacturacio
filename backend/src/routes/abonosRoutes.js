import express from 'express';
import { getAbonosByFactura, createAbono, getAllAbonos } from '../controllers/abonosController.js';

const router = express.Router();

router.get('/', getAllAbonos);
router.get('/factura/:factura_id', getAbonosByFactura);
router.post('/', createAbono);

export default router;
