import express from 'express';
import { getCierresCaja, createCierreCaja } from '../controllers/cierresController.js';

const router = express.Router();

router.get('/', getCierresCaja);
router.post('/', createCierreCaja);

export default router;
