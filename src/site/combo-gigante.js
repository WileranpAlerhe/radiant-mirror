/* ============================================================
   PIZZARIA DO GORDO — scripts da página de produto
   Seleção de sabores com limite por grupo, cálculo do total,
   validação das escolhas obrigatórias, contador de observação
   e fluxo de finalização (mesmo destino /checkout de sempre).
   ============================================================ */

(function () {
	"use strict";

	var ppFormatoBRL = function (v) {
		return v.toLocaleString("pt-br", { style: "currency", currency: "BRL" });
	};

	function ppEvento(nome, params) {
		if (typeof window.gtag === "function") window.gtag("event", nome, params || {});
	}

	var ppGrupos = Array.prototype.slice.call(document.querySelectorAll(".pp-grupo"));
	var ppBarra = document.querySelector(".pp-barra-finalizar .pp-container");
	var ppBotao = document.querySelector(".pp-btn-finalizar");

	/* ---------- Grupos obrigatórios (pizzas e refrigerante) ---------- */

	function ppObrigatorio(grupo) {
		var titulo = grupo.querySelector("h3");
		return !!titulo && /pizza|refrigerante/i.test(titulo.textContent);
	}

	function ppSelecionados(grupo) {
		var total = 0;
		grupo.querySelectorAll(".pp-qtde input").forEach(function (i) {
			total += parseInt(i.value, 10) || 0;
		});
		return total;
	}

	/* ---------- Total do produto ---------- */

	function ppCalcularTotal() {
		var base = parseFloat(document.getElementById("ppPrecoBase").dataset.ppPreco) || 0;
		var extras = 0;

		document.querySelectorAll(".pp-opcao").forEach(function (opcao) {
			var qtde = parseInt(opcao.querySelector(".pp-qtde input").value, 10) || 0;
			var preco = parseFloat(opcao.dataset.ppPreco) || 0;
			extras += qtde * preco;
		});

		var total = base + extras;
		document.getElementById("ppTotal").textContent = ppFormatoBRL(total);
		return total;
	}

	/* ---------- Progresso das escolhas ---------- */

	var ppProgresso = document.createElement("div");
	ppProgresso.className = "pp-progresso";
	var ppTotalEl = document.getElementById("ppTotal");
	if (ppTotalEl && ppTotalEl.parentNode) {
		ppTotalEl.parentNode.insertBefore(ppProgresso, ppTotalEl.nextSibling);
	}

	function ppAtualizarProgresso() {
		var obrigatorios = ppGrupos.filter(ppObrigatorio);
		var prontos = obrigatorios.filter(function (g) { return ppSelecionados(g) > 0; }).length;
		var completo = prontos === obrigatorios.length;
		ppProgresso.textContent = completo
			? "Tudo pronto para finalizar"
			: prontos + " de " + obrigatorios.length + " escolhas feitas";
		ppProgresso.classList.toggle("is-ok", completo);
	}

	/* ---------- Contadores e limites por grupo ---------- */

	function ppAtualizarGrupo(grupo) {
		var maximo = parseInt(grupo.dataset.ppMax, 10) || 99;
		var contador = ppSelecionados(grupo);

		grupo.querySelector(".pp-grupo-contador").textContent = contador;
		grupo.classList.toggle("pp-completo", contador > 0);

		if (contador > 0) {
			grupo.classList.remove("pp-invalido");
			var aviso = grupo.querySelector(".pp-grupo-aviso");
			if (aviso) aviso.remove();
		}

		var lotado = contador >= maximo;
		grupo.querySelectorAll(".pp-btn-mais").forEach(function (btn) {
			btn.disabled = lotado;
		});
	}

	/* ---------- Rolagem automatica entre grupos (meio a meio) ---------- */

	function ppTalvezRolarProximo(grupo, opcaoClicada) {
		var maximo = parseInt(grupo.dataset.ppMax, 10) || 99;
		if (maximo < 2) return; /* so para pizzas com opcao meio a meio */

		var total = ppSelecionados(grupo);

		/* Escolheu a 1a metade: rola ate a proxima opcao para escolher a 2a */
		if (total < maximo) {
			if (total < 1 || !opcaoClicada) return;
			var opcoes = Array.prototype.slice.call(grupo.querySelectorAll(".pp-opcao"));
			var proximaOpcao = opcoes[opcoes.indexOf(opcaoClicada) + 1] || opcaoClicada;
			setTimeout(function () {
				proximaOpcao.scrollIntoView({ behavior: "smooth", block: "center" });
			}, 200);
			return;
		}

		var proximo = ppGrupos[ppGrupos.indexOf(grupo) + 1];
		if (!proximo) return;

		setTimeout(function () {
			var topo = proximo.getBoundingClientRect().top + window.pageYOffset - 12;
			window.scrollTo({ top: topo, behavior: "smooth" });
		}, 220);
	}

	/* ---------- Guarda as escolhas para nao perder ao voltar ---------- */

	var ppChave = "pg-escolhas:" + location.pathname;

	function ppSalvarEscolhas() {
		try {
			var valores = [];
			document.querySelectorAll(".pp-qtde input").forEach(function (i) {
				valores.push(parseInt(i.value, 10) || 0);
			});
			var obs = document.getElementById("ppObservacao");
			sessionStorage.setItem(ppChave, JSON.stringify({ v: valores, obs: obs ? obs.value : "" }));
		} catch (e) { /* armazenamento indisponivel */ }
	}

	function ppRestaurarEscolhas() {
		try {
			var bruto = sessionStorage.getItem(ppChave);
			if (!bruto) return;
			var dados = JSON.parse(bruto);
			var inputs = document.querySelectorAll(".pp-qtde input");
			if (dados && dados.v && dados.v.length === inputs.length) {
				inputs.forEach(function (i, n) { i.value = dados.v[n] || 0; });
			}
			var obs = document.getElementById("ppObservacao");
			if (obs && dados && dados.obs) {
				obs.value = dados.obs;
				var c = document.getElementById("ppObsContador");
				if (c) c.textContent = obs.value.length;
			}
		} catch (e) { /* rascunho invalido */ }
	}

	ppRestaurarEscolhas();

	var ppIniciou = false;

	ppGrupos.forEach(function (grupo) {
		grupo.addEventListener("click", function (e) {
			var mais = e.target.closest(".pp-btn-mais");
			var menos = e.target.closest(".pp-btn-menos");
			if (!mais && !menos) return;

			var input = e.target.closest(".pp-qtde").querySelector("input");
			var valor = parseInt(input.value, 10) || 0;

			if (mais) {
				var maximo = parseInt(grupo.dataset.ppMax, 10) || 99;
				if (ppSelecionados(grupo) >= maximo) return;
				input.value = valor + 1;
			} else if (menos && valor > 0) {
				input.value = valor - 1;
			}

			ppAtualizarGrupo(grupo);
			ppCalcularTotal();
			ppAtualizarProgresso();
			ppSalvarEscolhas();

			if (mais && !ppIniciou) {
				ppIniciou = true;
				ppEvento("begin_personalization", { item_name: ppNomeItem() });
			}

			/* Meio a meio: ao completar as metades, rola suavemente ao proximo grupo */
			if (mais) ppTalvezRolarProximo(grupo, e.target.closest(".pp-opcao"));
		});

		ppAtualizarGrupo(grupo);
	});

	function ppNomeItem() {
		var titulo = document.querySelector("h1");
		return titulo ? titulo.textContent.trim() : "Combo";
	}

	ppCalcularTotal();
	ppAtualizarProgresso();

	ppEvento("view_item", {
		currency: "BRL",
		value: parseFloat(document.getElementById("ppPrecoBase").dataset.ppPreco) || 0,
		items: [{ item_name: ppNomeItem() }]
	});

	/* ---------- Contador da observação ---------- */

	var ppObs = document.getElementById("ppObservacao");
	if (ppObs) {
		var ppObsContador = document.getElementById("ppObsContador");
		ppObs.addEventListener("input", function () {
			ppObsContador.textContent = ppObs.value.length;
			ppSalvarEscolhas();
		});
	}

	/* ---------- Validação ---------- */

	function ppValidar() {
		var faltando = ppGrupos.filter(function (g) {
			return ppObrigatorio(g) && ppSelecionados(g) === 0;
		});

		faltando.forEach(function (grupo) {
			grupo.classList.add("pp-invalido");
			if (!grupo.querySelector(".pp-grupo-aviso")) {
				var aviso = document.createElement("p");
				aviso.className = "pp-grupo-aviso";
				aviso.setAttribute("role", "alert");
				aviso.innerHTML =
					'<i class="fa-i" aria-hidden="true"><svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zm0-384c13.3 0 24 10.7 24 24V264c0 13.3-10.7 24-24 24s-24-10.7-24-24V152c0-13.3 10.7-24 24-24zM224 352a32 32 0 1 1 64 0 32 32 0 1 1 -64 0z"/></svg></i> Escolha pelo menos 1 opção para continuar.';
				grupo.querySelector(".pp-grupo-topo").insertAdjacentElement("afterend", aviso);
			}
		});

		if (faltando.length) {
			faltando[0].scrollIntoView({ behavior: "smooth", block: "start" });
			return false;
		}
		return true;
	}

	/* ---------- Destino do checkout (mesmo contrato de sempre) ---------- */

	function ppDestino() {
		var sabores = [];

		ppGrupos.forEach(function (grupo) {
			var maximo = parseInt(grupo.dataset.ppMax, 10) || 99;
			var escolhidos = [];

			grupo.querySelectorAll(".pp-opcao").forEach(function (opcao) {
				var qtde = parseInt(opcao.querySelector(".pp-qtde input").value, 10) || 0;
				if (qtde > 0) {
					var nome = opcao.querySelector(".pp-opcao-nome b");
					escolhidos.push({
						qtde: qtde,
						nome: nome ? nome.textContent.trim() : "Sabor"
					});
				}
			});

			if (!escolhidos.length) return;

			var totalGrupo = escolhidos.reduce(function (s, i) { return s + i.qtde; }, 0);
			var meioAMeio = maximo === 2 && totalGrupo === 2;

			if (meioAMeio) {
				/* Metade/metade: mostra as duas metades, mesmo se for o mesmo sabor */
				var metades = [];
				escolhidos.forEach(function (i) {
					for (var n = 0; n < i.qtde; n++) metades.push("1/2 " + i.nome);
				});
				sabores.push(metades.join(" + "));
			} else {
				escolhidos.forEach(function (i) {
					sabores.push(i.qtde + "x " + i.nome);
				});
			}
		});

		var totalTexto = document
			.getElementById("ppTotal")
			.textContent.replace(/[^0-9,]/g, "")
			.replace(",", ".");

		return (
			"/checkout?item=" + encodeURIComponent(ppNomeItem()) +
			"&total=" + encodeURIComponent(totalTexto) +
			"&sabores=" + encodeURIComponent(sabores.join(", "))
		);
	}

	var ppTextoBotao = ppBotao ? ppBotao.textContent : "";

	function ppRestaurarBotao() {
		if (!ppBotao) return;
		ppBotao.disabled = false;
		ppBotao.textContent = ppTextoBotao;
	}

	/* Ao voltar do checkout (inclusive via cache do navegador) o botao volta ao normal */
	window.addEventListener("pageshow", ppRestaurarBotao);
	window.addEventListener("popstate", ppRestaurarBotao);
	document.addEventListener("visibilitychange", function () {
		if (!document.hidden) ppRestaurarBotao();
	});

	function ppSeguir(destino) {
		if (ppBotao) {
			ppBotao.disabled = true;
			ppBotao.textContent = "ABRINDO CHECKOUT...";
		}
		/* Se a navegacao nao acontecer, libera o botao de novo */
		window.setTimeout(ppRestaurarBotao, 6000);
		location.href = destino;
	}

	/* ---------- Finalização do pedido ---------- */

	window.ppFinalizar = function () {
		if (!ppValidar()) return;

		ppEvento("add_to_cart", {
			currency: "BRL",
			value: ppCalcularTotal(),
			items: [{ item_name: ppNomeItem(), quantity: 1 }]
		});

		ppSeguir(ppDestino());
	};

	/* ---------- Agendamento (mantido como opção secundária) ---------- */

	if (ppBarra) {
		var ppBtnAgendar = document.createElement("button");
		ppBtnAgendar.type = "button";
		ppBtnAgendar.className = "pp-agendar";
		ppBtnAgendar.textContent = "Prefiro agendar a entrega";
		ppBarra.parentNode.appendChild(ppBtnAgendar);

		ppBtnAgendar.addEventListener("click", function () {
			if (!ppValidar()) return;
			var destino = ppDestino();

			if (typeof window.Swal === "undefined") {
				ppSeguir(destino);
				return;
			}

			window.Swal.fire({
				title: "Selecione o dia e a hora",
				text: "Deixe seu pedido agendado e receba na hora combinada.",
				confirmButtonText: "Agendar pedido",
				confirmButtonColor: "#1f7a45",
				showCancelButton: true,
				cancelButtonText: "Cancelar",
				input: "datetime-local"
			}).then(function (resultado) {
				if (!resultado.isConfirmed) return;
				ppEvento("add_to_cart", {
					currency: "BRL",
					value: ppCalcularTotal(),
					items: [{ item_name: ppNomeItem(), quantity: 1 }]
				});
				ppSeguir(destino);
			});
		});
	}
})();
