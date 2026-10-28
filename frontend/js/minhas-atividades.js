// Lógica JS da página minhas-atividades.html

(function () {
    const container = document.getElementById("lista-inscricoes");
    if (!container) return;

    const usuario = Api.exigirLogin();
    if (!usuario) return;

    if (usuario.negado) {
        container.replaceChildren(
            vazio("Esta página é para alunos", "Responsáveis acompanham as inscrições pelo painel.", "/painel", "Ir para o painel")
        );
        return;
    }

    function vazio(titulo, texto, href, rotuloBotao) {
        const caixa = Api.criar("div", "vazio");
        caixa.appendChild(Api.criar("h3", "", titulo));
        caixa.appendChild(Api.criar("p", "", texto));
        if (href) {
            const link = Api.criar("a", "botao", rotuloBotao);
            link.href = href;
            caixa.appendChild(link);
        }
        return caixa;
    }

    function montarItem(inscricao) {
        const item = Api.criar("li", "lista-item");
        item.dataset.inscricaoId = inscricao.id;

        const dados = Api.criar("div");
        const titulo = Api.criar("h3");
        const link = Api.criar("a", "link-card", inscricao.atividade_nome);
        link.href = "/atividades/" + inscricao.atividade_id;
        titulo.appendChild(link);
        dados.appendChild(titulo);

        const detalhes = [inscricao.horario, inscricao.local].filter(Boolean).join(" · ");
        if (inscricao.atividade_status === "inativa") {
            dados.appendChild(Api.criar("p", "", (detalhes ? detalhes + " · " : "") + "Atividade encerrada"));
        } else if (detalhes) {
            dados.appendChild(Api.criar("p", "", detalhes));
        }
        item.appendChild(dados);

        const acoes = Api.criar("div", "lista-acoes");
        if (inscricao.status === "espera") {
            const posicao = inscricao.posicao_espera ? " · " + inscricao.posicao_espera + "º da fila" : "";
            acoes.appendChild(Api.criar("span", "badge badge-espera", "Em espera" + posicao));
        } else {
            acoes.appendChild(Api.criar("span", "badge badge-confirmada", "Confirmada"));
        }

        const botao = Api.criar("button", "botao botao-perigo btn-desistir", "Desistir");
        botao.type = "button";
        botao.addEventListener("click", function () {
            desistir(inscricao, botao);
        });
        acoes.appendChild(botao);

        item.appendChild(acoes);
        return item;
    }

    function desenhar(inscricoes) {
        if (inscricoes.length === 0) {
            container.replaceChildren(
                vazio("Você ainda não tem inscrições", "Explore o mural e escolha uma atividade para começar.", "/atividades", "Ver atividades")
            );
            return;
        }

        const ul = Api.criar("ul", "lista");
        inscricoes.forEach(function (inscricao) {
            ul.appendChild(montarItem(inscricao));
        });
        container.replaceChildren(ul);
    }

    async function carregar() {
        try {
            desenhar(await Api.chamar("/inscricoes"));
        } catch (erro) {
            if (erro.status === 401) {
                Api.exigirLogin();
                return;
            }
            Api.mostrarMensagem(erro.message, "erro");
        }
    }

    async function desistir(inscricao, botao) {
        if (!window.confirm('Desistir de "' + inscricao.atividade_nome + '"?')) return;

        Api.limparMensagem();
        Api.bloquear(botao, true, "Cancelando...");

        try {
            await Api.chamar("/inscricoes/" + inscricao.id, { method: "DELETE" });
            Api.mostrarMensagem("Inscrição cancelada.", "sucesso");
            // Recarrega: se alguém da fila foi promovido, as posições mudam
            await carregar();
        } catch (erro) {
            Api.mostrarMensagem(erro.message, "erro");
            Api.bloquear(botao, false);
        }
    }

    carregar();
})();
