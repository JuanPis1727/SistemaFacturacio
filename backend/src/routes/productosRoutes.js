import express from 'express';
import { getProductos, getProductoById, createProducto, updateProducto, anularProducto } from '../controllers/productosController.js';

const router = express.Router();

router.get('/', getProductos);
router.get('/:id', getProductoById);
router.post('/', createProducto);
router.put('/:id', updateProducto);
router.delete('/:id', anularProducto);

export default router;
