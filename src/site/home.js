/* ============================================================
   PIZZARIA DO GORDO — home
   Status de funcionamento real, navegação por seções,
   barra fixa de pedido e eventos de analytics (GA4).
   ============================================================ */
(function () {
  "use strict";

  var raiz = document.querySelector(".sg-root");
  if (!raiz) return;

  function evento(nome, params) {
    if (typeof window.gtag === "function") window.gtag("event", nome, params || {});
  }

  /* ---------- Status: loja sempre aberta ---------- */
  var status = document.getElementById("sgStatus");
  var aviso = document.getElementById("sgAviso");
  if (status) {
    status.classList.add("sg-status-aberto");
    status.classList.remove("sg-status-fechado");
    var texto = status.querySelector(".sg-status-texto");
    if (texto) texto.textContent = "Aberto agora";
    if (aviso) {
      aviso.textContent =
        "Estamos recebendo pedidos agora. Entrega estimada em 25 a 45 minutos após a confirmação do pagamento.";
    }
  }


  /* ---------- Navegação suave e categoria ativa ---------- */
  var links = Array.prototype.slice.call(document.querySelectorAll(".sg-nav-inner a"));
  var secoes = links
    .map(function (a) { return document.querySelector(a.getAttribute("href")); })
    .filter(Boolean);

  links.forEach(function (a) {
    a.addEventListener("click", function (e) {
      var alvo = document.querySelector(a.getAttribute("href"));
      if (!alvo) return;
      e.preventDefault();
      alvo.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  document.querySelectorAll('.sg-topbar-cta, .sg-btn-principal').forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      var alvo = document.getElementById("combos");
      if (!alvo) return;
      e.preventDefault();
      alvo.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  if (secoes.length && "IntersectionObserver" in window) {
    var observador = new IntersectionObserver(
      function (entradas) {
        entradas.forEach(function (entrada) {
          if (!entrada.isIntersecting) return;
          links.forEach(function (a) {
            a.classList.toggle("ativo", a.getAttribute("href") === "#" + entrada.target.id);
          });
        });
      },
      { rootMargin: "-40% 0px -55% 0px" }
    );
    secoes.forEach(function (s) { observador.observe(s); });
  }

  /* ---------- Barra fixa de pedido ---------- */
  var barra = document.getElementById("sgBarra");
  var combos = document.getElementById("combos");
  if (barra && combos && "IntersectionObserver" in window) {
    var obsBarra = new IntersectionObserver(
      function (entradas) {
        entradas.forEach(function (entrada) {
          barra.classList.toggle("is-visivel", !entrada.isIntersecting || entrada.boundingClientRect.top < 0);
        });
      },
      { threshold: 0 }
    );
    obsBarra.observe(combos);
  }

  /* ---------- Analytics: lista e clique em produto ---------- */
  var cartoes = Array.prototype.slice.call(document.querySelectorAll("[data-sg-item]"));

  evento("view_item_list", {
    item_list_name: "Combos",
    items: cartoes
      .filter(function (c) { return c.classList.contains("sg-card") || c.classList.contains("sg-destaque"); })
      .map(function (c) {
        return { item_name: c.dataset.sgItem, price: parseFloat(c.dataset.sgPreco) };
      })
  });

  cartoes.forEach(function (c) {
    c.addEventListener("click", function () {
      evento("select_item", {
        item_list_name: c.classList.contains("sg-destaque") ? "Oferta destaque" : "Combos",
        items: [{ item_name: c.dataset.sgItem, price: parseFloat(c.dataset.sgPreco) }]
      });
    });
  });
})();
