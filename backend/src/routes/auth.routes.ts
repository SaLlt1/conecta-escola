// Rotas de autenticação: POST /auth/registrar, POST /auth/login
import { Router } from "express";
import * as authController from "../controllers/auth.controller";

const router = Router();

router.post("/registrar", authController.registrar);
router.post("/login", authController.login);

export default router;