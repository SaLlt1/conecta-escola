// Lógica JS da página painel-responsavel.html

(function () {
    const caixaMensagem = document.getElementById("mensagem");
    if (!caixaMensagem) return;

    // O bloco "Minhas atividades" vem logo depois da caixa de mensagem
    const bloco = caixaMensagem.nextElementSibling;
    const statAtividades = document.getElementById("stat-atividades");
    const statInscritos = document.getElementById("stat-inscritos");
    const statEspera = document.getElementById("stat-espera");
    const resumoCard = document.querySelector(".hero-card h2");

    const usuario = Api.exigirLogin();
    if (!usuario) return;

    if (usuario.negado) {
        Api.mostrarMensagem("O painel é exclusivo para responsáveis por atividades.", "erro");
        if (bloco) bloco.hidden = true;
        return;
    }

    function celula(conteudo) {
        const td = Api.criar("td");
        if (typeof conteudo === "string") td.textContent = conteudo;
        else td.appendChild(conteudo);
        return td;
    }

    function link(texto, href) {
        const a = Api.criar("a", "link-card", texto);
        a.href = href;
        return a;
    }

    // ---------- Lista de inscritos de uma atividade (linha expansível) ----------

    function montarInscritos(inscritos) {
        if (inscritos.length === 0) {
            return Api.criar("p", "", "Ninguém se inscreveu ainda.");
        }

        const ul = Api.criar("ul", "lista");
        inscritos.forEach(function (inscrito) {
            const li = Api.criar("li", "lista-item");
            const dados = Api.criar("div");
            dados.appendChild(Api.criar("h3", "", inscrito.nome));
            if (inscrito.turma) dados.appendChild(Api.criar("p", "", "Turma " + inscrito.turma));
            li.appendChild(dados);

            if (inscrito.status === "espera") {
                const posicao = inscrito.posicao_espera ? " · " + inscrito.posicao_espera + "º da fila" : "";
                li.appendChild(Api.criar("span", "badge badge-espera", "Em espera" + posicao));
            } else {
                li.appendChild(Api.criar("span", "badge badge-confirmada", "Confirmada"));
            }
            ul.appendChild(li);
        });
        return ul;
    }

    function alternarInscritos(linha, atividade, inscritos, botao) {
        const existente = linha.nextElementSibling;
        if (existente && existente.classList.contains("linha-inscritos")) {
            existente.remove();
            botao.textContent = "Inscritos";
            return;
        }

        const detalhe = Api.criar("tr", "linha-inscritos");
        const td = Api.criar("td");
        td.colSpan = 5;
        td.appendChild(montarInscritos(inscritos));
        detalhe.appendChild(td);
        linha.after(detalhe);
        botao.textContent = "Ocultar";
    }

    // ---------- Tabela ----------

    function montarLinha(item) {
        const a = item.atividade;
        const linha = Api.criar("tr");

        const nome = Api.criar("strong", "", a.nome);
        linha.appendChild(celula(nome));
        linha.appendChild(celula(a.categoria_nome || "—"));
        linha.appendChild(celula(item.confirmados + " / " + a.vagas + (item.espera ? " (+" + item.espera + " em espera)" : "")));

        const status = a.status === "inativa" ? "inativa" : "ativa";
        linha.appendChild(celula(Api.criar("span", "badge badge-" + status, status === "inativa" ? "Inativa" : "Ativa")));

        const acoes = Api.criar("div");
        acoes.appendChild(link("Editar", "/atividades/" + a.id + "/editar"));
        acoes.appendChild(document.createTextNode(" · "));
        acoes.appendChild(link("Ver", "/atividades/" + a.id));
        acoes.appendChild(document.createTextNode(" · "));

        const botao = Api.criar("button", "link-card", "Inscritos");
        botao.type = "button";
        botao.style.background = "none";
        botao.style.border = "none";
        botao.style.cursor = "pointer";
        botao.style.font = "inherit";
        botao.addEventListener("click", function () {
            alternarInscritos(linha, a, item.inscritos, botao);
        });
        acoes.appendChild(botao);

        linha.appendChild(celula(acoes));
        return linha;
    }

    function desenharTabela(itens) {
        if (!bloco) return;

        // Mantém o título "Minhas atividades" e troca o resto do conteúdo
        const titulo = bloco.querySelector("h2");
        bloco.replaceChildren(titulo || Api.criar("h2", "", "Minhas atividades"));

        if (itens.length === 0) {
            const vazio = Api.criar("div", "vazio");
            vazio.appendChild(Api.criar("h3", "", "Nenhuma atividade cadastrada"));
            vazio.appendChild(Api.criar("p", "", "Crie a primeira atividade para que os alunos possam se inscrever."));
            const botao = Api.criar("a", "botao", "Cadastrar atividade");
            botao.href = "/atividades/nova";
            vazio.appendChild(botao);
            bloco.appendChild(vazio);
            return;
        }

        const tabela = Api.criar("table");
        tabela.id = "tabela-atividades";

        const cabecalho = Api.criar("tr");
        ["Atividade", "Categoria", "Vagas", "Status", ""].forEach(function (rotulo) {
            cabecalho.appendChild(Api.criar("th", "", rotulo));
        });
        tabela.appendChild(Api.criar("thead")).appendChild(cabecalho);

        const corpo = Api.criar("tbody");
        itens.forEach(function (item) {
            corpo.appendChild(montarLinha(item));
        });
        tabela.appendChild(corpo);

        const envoltorio = Api.criar("div", "tabela-wrap");
        envoltorio.appendChild(tabela);
        bloco.appendChild(envoltorio);
    }

    function atualizarResumo(itens) {
        const totalInscritos = itens.reduce(function (soma, i) { return soma + i.confirmados; }, 0);
        const totalEspera = itens.reduce(function (soma, i) { return soma + i.espera; }, 0);

        if (statAtividades) statAtividades.textContent = itens.length;
        if (statInscritos) statInscritos.textContent = totalInscritos;
        if (statEspera) statEspera.textContent = totalEspera;
        if (resumoCard) {
            resumoCard.textContent = itens.length + (itens.length === 1 ? " atividade" : " atividades");
        }
    }

    // ---------- Carregamento ----------

    async function carregar() {
        try {
            const todas = await Api.chamar("/atividades");
            const minhas = todas.filter(function (a) {
                return a.responsavel_id === usuario.id;
            });

            // Um pedido de inscritos por atividade (só o responsável dono consegue ver)
            const itens = await Promise.all(
                minhas.map(async function (atividade) {
                    const inscritos = await Api.chamar("/atividades/" + atividade.id + "/inscritos");
                    return {
                        atividade: atividade,
                        inscritos: inscritos,
                        confirmados: inscritos.filter(function (i) { return i.status === "confirmada"; }).length,
                        espera: inscritos.filter(function (i) { return i.status === "espera"; }).length,
                    };
                })
            );

            atualizarResumo(itens);
            desenharTabela(itens);
        } catch (erro) {
            if (erro.status === 401) {
                Api.exigirLogin();
                return;
            }
            Api.mostrarMensagem(erro.message, "erro");
        }
    }

    carregar();
})();
