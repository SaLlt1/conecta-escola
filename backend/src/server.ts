const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Rotas
app.use("/categorias", require("./routes/categorias.routes"));

// Rota de teste
app.get("/", (req, res) => {
  res.json({ mensagem: "API do Mural de Atividades funcionando!" });
});

const PORTA = 3000;
app.listen(PORTA, () => {
  console.log(`Servidor rodando em http://localhost:${PORTA}`);
});
