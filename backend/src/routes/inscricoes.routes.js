// Rotas de inscrições: POST /atividades/:id/inscricoes, DELETE /inscricoes/:id, GET /inscricoes, GET /atividades/:id/inscritos
const express = require("express");
const router = express.Router();
const inscricoesController = require("../controllers/inscricoes.controller");
const { autenticar } = require("../middlewares/auth.middleware");

router.get("/", autenticar, inscricoesController.minhasInscricoes);
router.delete("/:id", autenticar, inscricoesController.desistir);

module.exports = router;
