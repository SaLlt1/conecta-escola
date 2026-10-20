// Rotas de categorias: GET /categorias
const express = require("express");
const router = express.Router();
const categoriasController = require("../controllers/categorias.controller");

router.get("/", categoriasController.listar);

module.exports = router;

