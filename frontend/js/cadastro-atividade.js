// Lógica JS da página cadastro-atividade.html

(function () {
    const form = document.getElementById("form-atividade");
    if (!form) return;

    const usuario = Api.exigirLogin();
    if (!usuario) return;

    if (usuario.negado) {
        form.querySelectorAll("input, select, textarea, button").forEach(function (campo) {
            campo.disabled = true;
        });
        Api.mostrarMensagem("Apenas responsáveis podem cadastrar e editar atividades.", "erro");
        return;
    }

    const atividadeId = form.dataset.atividadeId;
    const editando = !!atividadeId;

    form.addEventListener("submit", async function (evento) {
        evento.preventDefault();
        Api.limparMensagem();

        const campos = new FormData(form);
        const texto = function (nome) {
            const valor = campos.get(nome);
            return typeof valor === "string" ? valor.trim() : "";
        };

        const vagas = Number(texto("vagas"));
        const categoriaId = Number(texto("categoria_id"));

        // Mesmas regras da API, para avisar antes de enviar :U
        if (!texto("nome")) {
            Api.mostrarMensagem("Informe o nome da atividade.", "erro");
            return;
        }
        if (!Number.isInteger(categoriaId) || categoriaId <= 0) {
            Api.mostrarMensagem("Selecione uma categoria.", "erro");
            return;
        }
        if (!Number.isInteger(vagas) || vagas <= 0) {
            Api.mostrarMensagem("O número de vagas deve ser um inteiro maior que zero.", "erro");
            return;
        }

        const corpo = {
            nome: texto("nome"),
            descricao: texto("descricao"),
            categoria_id: categoriaId,
            vagas: vagas,
            local: texto("local"),
            horario: texto("horario"),
        };
        // O campo de status só existe na edição
        if (editando && campos.get("status")) corpo.status = campos.get("status");

        const botao = form.querySelector('button[type="submit"]');
        Api.bloquear(botao, true, "Salvando...");

        try {
            await Api.chamar(editando ? "/atividades/" + atividadeId : "/atividades", {
                method: editando ? "PUT" : "POST",
                body: corpo,
            });

            Api.mostrarMensagem(
                editando ? "Atividade atualizada! Voltando ao painel..." : "Atividade cadastrada! Voltando ao painel...",
                "sucesso"
            );
            setTimeout(function () {
                window.location.href = "/painel";
            }, 900);
        } catch (erro) {
            Api.mostrarMensagem(erro.message, "erro");
            Api.bloquear(botao, false);
            if (erro.status === 401) Api.exigirLogin();
        }
    });
})();
