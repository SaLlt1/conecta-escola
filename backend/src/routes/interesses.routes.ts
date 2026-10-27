import { Router } from "express";
import * as interessesController from "../controllers/interesses.controller";
import { autenticar, somenteResponsavel } from "../middlewares/auth.middleware";

const router = Router();

// PUT /meus-interesses — qualquer usuário autenticado define os próprios interesses.
router.put("/meus-interesses", autenticar, interessesController.atualizarMeusInteresses);

// GET /interesses/agregados — só o responsável (decisão institucional).
router.get("/interesses/agregados", autenticar, somenteResponsavel, interessesController.agregados);

export default router;