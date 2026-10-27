// Rotas de categorias: GET /categorias
import { Router } from "express";
import * as categoriasController from "../controllers/categorias.controller";

const router = Router();

router.get("/", categoriasController.listar);

export default router;