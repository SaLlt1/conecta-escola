const express = require("express");
const router = express.Router();
const interessesController = require("../controllers/interesses.controller");
const { autenticar, somenteResponsavel } = require("../middlewares/auth.middleware");

// PUT /meus-interesses — qualquer usuário autenticado define os próprios interesses.
router.put("/meus-interesses", autenticar, interessesController.atualizarMeusInteresses);

// GET /interesses/agregados — só o responsável (decisão institucional).
router.get("/interesses/agregados", autenticar, somenteResponsavel, interessesController.agregados);

module.exports = router;
