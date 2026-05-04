import express from 'express';
import { getClientes, getClienteById, createCliente, updateCliente, anularCliente } from '../controllers/clientesController.js';

const router = express.Router();

router.get('/', getClientes);
router.get('/:id', getClienteById);
router.post('/', createCliente);
router.put('/:id', updateCliente);
router.delete('/:id', anularCliente);

export default router;
