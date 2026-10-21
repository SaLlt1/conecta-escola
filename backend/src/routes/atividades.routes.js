const express = require("express");
const router = express.Router();
const atividadesController = require("../controllers/atividades.controller");
const inscricoesController = require("../controllers/inscricoes.controller");
const {
  autenticar,
  autenticarOpcional,
  somenteResponsavel,
  somenteAluno,
} = require("../middlewares/auth.middleware");

// Mural é público, mas usa o token (se houver) para ordenar por afinidade.
router.get("/", autenticarOpcional, atividadesController.listar);
router.get("/:id", autenticarOpcional, atividadesController.detalhes);

router.post("/", autenticar, somenteResponsavel, atividadesController.criar);
router.put("/:id", autenticar, somenteResponsavel, atividadesController.atualizar);

router.get("/:id/inscritos", autenticar, somenteResponsavel, atividadesController.inscritos);
router.post("/:id/inscricoes", autenticar, somenteAluno, inscricoesController.inscrever);

module.exports = router;

