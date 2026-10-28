// Lógica JS da página atividade.html

(function () {
    const painel = document.querySelector(".detalhes-grid");
    const botao = document.getElementById("btn-inscrever");
    if (!painel || !botao) return;

    const atividadeId = painel.dataset.atividadeId;
    const campoVagas = document.getElementById("atividade-vagas");
    const rotuloVagas = document.querySelector(".vagas-rotulo");
    const usuario = Api.getUsuario();
    const logado = !!(Api.getToken() && usuario);

    // Só alunos se inscrevem. Responsável só vê a página sem o botão.
    if (logado && usuario.papel === "responsavel") {
        botao.hidden = true;
    }

    function textoBotao(vagasRestantes) {
        return vagasRestantes <= 0 ? "Entrar na lista de espera" : "Inscrever-me";
    }

    // Atualiza o número de vagas na tela com os dados mais recentes da API ´-´
    async function atualizarVagas() {
        try {
            const atividade = await Api.chamar("/atividades/" + atividadeId);
            if (campoVagas) campoVagas.textContent = atividade.vagas_restantes;
            if (rotuloVagas) {
                rotuloVagas.textContent = "vagas disponíveis de " + atividade.vagas;
            }
            if (!botao.disabled) botao.textContent = textoBotao(atividade.vagas_restantes);

            if (atividade.status === "inativa") {
                botao.disabled = true;
                botao.textContent = "Inscrições encerradas";
            }
        } catch (erro) {
       
        }
    }

    botao.addEventListener("click", async function () {
        Api.limparMensagem();

        // Visitante: manda para o login e volta para página depois
        if (!logado) {
            window.location.href =
                "/login?next=" + encodeURIComponent(window.location.pathname);
            return;
        }

        Api.bloquear(botao, true, "Enviando...");

        try {
            const inscricao = await Api.chamar("/atividades/" + atividadeId + "/inscricoes", {
                method: "POST",
            });

            Api.mostrarMensagem(inscricao.mensagem, "sucesso");
            botao.textContent =
                inscricao.status === "confirmada" ? "Inscrição confirmada" : "Na lista de espera";
            botao.disabled = true;
            botao.dataset.textoOriginal = botao.textContent;
            atualizarVagas();
        } catch (erro) {
            Api.mostrarMensagem(erro.message, "erro");
            Api.bloquear(botao, false);

            // Já inscrito / atividade encerrada: não adianta clicar de novo ://
            if (erro.status === 409) botao.disabled = true;
            if (erro.status === 401) Api.exigirLogin();
        }
    });

    atualizarVagas();
})();
