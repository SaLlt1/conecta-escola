// Lógica JS da página mural.html

(function () {
    const lista = document.getElementById("lista-atividades");
    const estadoVazio = document.getElementById("estado-vazio");
    const form = document.getElementById("form-filtros");
    if (!lista) return;

    const CORES = ["azul", "bege", "marrom-claro", "marrom"];

    function montarCard(atividade, indice) {
        const card = Api.criar("article", "cor");
        card.appendChild(Api.criar("div", "amostra " + CORES[indice % CORES.length]));

        const info = Api.criar("div", "info");

        const etiquetas = Api.criar("div");
        etiquetas.appendChild(Api.criar("span", "badge", atividade.categoria_nome || "Atividade"));
        if (atividade.compativel) {
            etiquetas.appendChild(document.createTextNode(" "));
            etiquetas.appendChild(Api.criar("span", "badge badge-confirmada", "Combina com você"));
        }
        info.appendChild(etiquetas);

        info.appendChild(Api.criar("h3", "", atividade.nome));
        info.appendChild(Api.criar("p", "", atividade.descricao || "Sem descrição."));

        const meta = Api.criar("ul", "meta-lista");
        if (atividade.local) {
            const li = Api.criar("li");
            li.appendChild(Api.criar("strong", "", "Local: "));
            li.appendChild(document.createTextNode(atividade.local));
            meta.appendChild(li);
        }
        if (atividade.horario) {
            const li = Api.criar("li");
            li.appendChild(Api.criar("strong", "", "Horário: "));
            li.appendChild(document.createTextNode(atividade.horario));
            meta.appendChild(li);
        }

        const restantes = atividade.vagas_restantes;
        const liVagas = Api.criar("li");
        liVagas.appendChild(Api.criar("strong", "", "Vagas: "));
        liVagas.appendChild(document.createTextNode(restantes + " de " + atividade.vagas + " "));
        if (restantes <= 0) {
            liVagas.appendChild(Api.criar("span", "badge badge-lotada", "Lotada · lista de espera"));
        }
        meta.appendChild(liVagas);
        info.appendChild(meta);

        const rodape = Api.criar("div", "meta");
        const link = Api.criar("a", "link-card", "Ver detalhes →");
        link.href = "/atividades/" + atividade.id;
        rodape.appendChild(link);
        info.appendChild(rodape);

        card.appendChild(info);
        return card;
    }

    function desenhar(atividades) {
        lista.replaceChildren();
        atividades.forEach(function (atividade, i) {
            lista.appendChild(montarCard(atividade, i));
        });
        if (estadoVazio) estadoVazio.hidden = atividades.length > 0;
    }

    async function carregar() {
        const params = new URLSearchParams(window.location.search);
        const categoria = params.get("categoria");
        const busca = (params.get("busca") || "").trim().toLowerCase();

        try {
            let caminho = "/atividades";
            if (categoria) caminho += "?categoria_id=" + encodeURIComponent(categoria);

            let atividades = await Api.chamar(caminho);

            // A API não filtra por nome; o filtro de busca é feito aqui
            if (busca) {
                atividades = atividades.filter(function (a) {
                    return a.nome.toLowerCase().includes(busca);
                });
            }

            desenhar(atividades);
        } catch (erro) {
            // Mantém a lista que o servidor já renderizou e só avisa do problema
            Api.mostrarMensagem(
                "Não foi possível atualizar o mural agora. " + erro.message,
                "erro"
            );
        }
    }

    // Trocar a categoria filtra na hora, sem precisar clicar em "Filtrar"
    if (form) {
        const select = form.querySelector("#categoria");
        if (select) select.addEventListener("change", function () { form.submit(); });
    }

    carregar();
})();
