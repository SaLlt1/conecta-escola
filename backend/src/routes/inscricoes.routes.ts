// Rotas de inscrições: GET /inscricoes, DELETE /inscricoes/:id
// (POST /atividades/:id/inscricoes e GET /atividades/:id/inscritos ficam em atividades.routes.ts)
import { Router } from "express";
import * as inscricoesController from "../controllers/inscricoes.controller";
import { autenticar } from "../middlewares/auth.middleware";

const router = Router();

router.get("/", autenticar, inscricoesController.minhasInscricoes);
router.delete("/:id", autenticar, inscricoesController.desistir);

export default router;