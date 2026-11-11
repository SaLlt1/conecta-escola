// Rotas de autenticação: POST /auth/registrar, POST /auth/login
import { Router } from "express";
import * as authController from "../controllers/auth.controller";
import { limitarLogin } from "../middlewares/limite-login.middleware";

const router = Router();

router.post("/registrar", authController.registrar);
router.post("/login", limitarLogin, authController.login);

export default router;
