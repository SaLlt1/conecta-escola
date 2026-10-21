require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Rotas
app.use("/auth", require("./routes/auth.routes"));
app.use("/categorias", require("./routes/categorias.routes"));
app.use("/atividades", require("./routes/atividades.routes"));
app.use("/inscricoes", require("./routes/inscricoes.routes"));
// interesses.routes já define os caminhos completos (/meus-interesses e
// /interesses/agregados), por isso é montado na raiz.
app.use("/", require("./routes/interesses.routes"));

// Rota de teste
app.get("/", (req, res) => {
  res.json({ mensagem: "API do Mural de Atividades funcionando!" });
});

// 404 para rotas não encontradas
app.use((req, res) => {
  res.status(404).json({ erro: "Rota não encontrada." });
});

// Tratamento de erro genérico (evita vazar detalhes internos para o cliente)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ erro: "Erro interno do servidor." });
});


const PORTA = process.env.PORT || 3000;
app.listen(PORTA, () => {
  console.log(`Servidor rodando em http://localhost:${PORTA}`);
});