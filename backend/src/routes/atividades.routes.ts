import { Router } from "express";
import * as atividadesController from "../controllers/atividades.controller";
import * as inscricoesController from "../controllers/inscricoes.controller";
import {
  autenticar,
  autenticarOpcional,
  somenteResponsavel,
  somenteAluno,
} from "../middlewares/auth.middleware";

const router = Router();

// Mural é público, mas usa o token (se houver) para ordenar por afinidade.
router.get("/", autenticarOpcional, atividadesController.listar);
router.get("/:id", autenticarOpcional, atividadesController.detalhes);

router.post("/", autenticar, somenteResponsavel, atividadesController.criar);
router.put("/:id", autenticar, somenteResponsavel, atividadesController.atualizar);

router.get("/:id/inscritos", autenticar, somenteResponsavel, atividadesController.inscritos);
router.post("/:id/inscricoes", autenticar, somenteAluno, inscricoesController.inscrever);

export default router;