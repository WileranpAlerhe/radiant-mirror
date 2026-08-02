import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import QRCode from "qrcode";

import "@/site/checkout.css";
import { createPixPayment, getPixPaymentStatus } from "@/lib/streetpays.functions";
import { trackEvent } from "@/lib/analytics";

type Search = { item?: string; total?: number; sabores?: string };

const OFERTAS = [
  {
    id: "acai",
    nome: "2 Copos Açaí 300ml",
    de: "R$27,90",
    preco: 1890,
    precoLabel: "R$18,90",
    img: "/assets/img/oferta-acai.png",
    nota: "2 Copos Açaí 300ml apenas R$18,90",
  },
  {
    id: "morango",
    nome: "3 Morango do Amor",
    de: "R$14,90",
    preco: 990,
    precoLabel: "R$9,90",
    img: "/assets/img/oferta-morango.png",
    nota: "3 Morangos do Amor apenas R$9,90",
  },
];

const ESTADOS = [
  ["AC", "Acre"], ["AL", "Alagoas"], ["AP", "Amapá"], ["AM", "Amazonas"], ["BA", "Bahia"],
  ["CE", "Ceará"], ["DF", "Distrito Federal"], ["ES", "Espírito Santo"], ["GO", "Goiás"],
  ["MA", "Maranhão"], ["MT", "Mato Grosso"], ["MS", "Mato Grosso do Sul"], ["MG", "Minas Gerais"],
  ["PA", "Pará"], ["PB", "Paraíba"], ["PR", "Paraná"], ["PE", "Pernambuco"], ["PI", "Piauí"],
  ["RJ", "Rio de Janeiro"], ["RN", "Rio Grande do Norte"], ["RS", "Rio Grande do Sul"],
  ["RO", "Rondônia"], ["RR", "Roraima"], ["SC", "Santa Catarina"], ["SP", "São Paulo"],
  ["SE", "Sergipe"], ["TO", "Tocantins"],
] as const;

const brl = (cents: number) =>
  (cents / 100).toLocaleString("pt-br", { style: "currency", currency: "BRL" });

const maskPhone = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d{0,4})(\d{0,4})/, (_, a, b, c) => [a && `(${a}`, a.length === 2 ? ") " : "", b, c && `-${c}`].join("")).trim();
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
};

const maskCpf = (v: string) =>
  v.replace(/\D/g, "").slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");

const maskCep = (v: string) => v.replace(/\D/g, "").slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2");

function Footer() {
  return (
    <footer className="ck-footer">
      <p style={{ margin: 0 }}>Formas de pagamento</p>
      <div className="ck-pix-logo-row">
        <img className="ck-pix-img" src="/assets/img/pix-logo-full.png" alt="Pix" />
      </div>

      <p style={{ margin: 0 }}>© 2026 PIZZARIA DO GORDO</p>
      <div className="ck-seguro">
        <i className="fa-i" aria-hidden="true"><svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><path d="M256 0c4.6 0 9.2 1 13.4 2.9L457.7 82.8c22 9.3 38.4 31 38.3 57.2c-.5 99.2-41.3 280.7-213.6 363.2c-16.7 8-36.1 8-52.8 0C57.3 420.7 16.5 239.2 16 140c-.1-26.2 16.3-47.9 38.3-57.2L242.7 2.9C246.8 1 251.4 0 256 0zm0 66.8V444.8C394 378 431.1 230.1 432 141.4L256 66.8l0 0z"/></svg></i> Ambiente seguro
      </div>
    </footer>
  );
}

function CheckoutPage() {
  const search = Route.useSearch();
  const criarPix = useServerFn(createPixPayment);
  const consultarPix = useServerFn(getPixPaymentStatus);

  const itemNome = search.item || "Combo Pizzaria do Gordo";
  const itemPreco = Math.round((search.total ?? 22.9) * 100);

  const [etapa, setEtapa] = useState(1);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [ofertas, setOfertas] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [falha, setFalha] = useState("");

  const [f, setF] = useState({
    telefone: "", nome: "", cpf: "",
    cep: "", endereco: "", numero: "", bairro: "", semNumero: false,
    complemento: "", cidade: "", estado: "", pais: "BR",
  });

  const set = (k: keyof typeof f, v: string | boolean) => setF((p) => ({ ...p, [k]: v }));

  /* ---- Recupera o que o lead já preencheu (voltar sem perder nada) ---- */
  const RASCUNHO = "pg-checkout-rascunho";
  const [restaurado, setRestaurado] = useState(false);

  useEffect(() => {
    try {
      const bruto = window.localStorage.getItem(RASCUNHO);
      if (bruto) {
        const d = JSON.parse(bruto) as { f?: typeof f; etapa?: number; ofertas?: string[] };
        if (d.f) setF((p) => ({ ...p, ...d.f }));
        if (d.etapa) setEtapa(d.etapa);
        if (Array.isArray(d.ofertas)) setOfertas(d.ofertas);
      }
    } catch {
      /* ignora rascunho inválido */
    }
    setRestaurado(true);
  }, []);

  useEffect(() => {
    if (!restaurado) return;
    try {
      window.localStorage.setItem(RASCUNHO, JSON.stringify({ f, etapa, ofertas }));
    } catch {
      /* armazenamento indisponível */
    }
  }, [f, etapa, ofertas, restaurado]);

  const cepCompleto = f.cep.replace(/\D/g, "").length === 8;




  const itens = useMemo(
    () => [
      { name: itemNome, price: itemPreco, quantity: 1 },
      ...OFERTAS.filter((o) => ofertas.includes(o.id)).map((o) => ({
        name: o.nome,
        price: o.preco,
        quantity: 1,
      })),
    ],
    [itemNome, itemPreco, ofertas],
  );

  const total = itens.reduce((s, i) => s + i.price * i.quantity, 0);

  const [pix, setPix] = useState<{ id: string; copypaste: string; amount: number; createdAt: string } | null>(null);
  const [qr, setQr] = useState("");
  const [statusPix, setStatusPix] = useState("PENDING");
  const [copiado, setCopiado] = useState(false);
  const topo = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pix?.copypaste) return;
    QRCode.toDataURL(pix.copypaste, { margin: 1, width: 440 }).then(setQr).catch(console.error);
  }, [pix?.copypaste]);

  useEffect(() => {
    if (!pix?.id || statusPix === "PAID") return;
    const t = window.setInterval(async () => {
      try {
        const r = await consultarPix({ data: { id: pix.id } });
        if (r.status) {
          if (r.status === "PAID" && statusPix !== "PAID") {
            trackEvent("purchase", {
              currency: "BRL",
              value: pix.amount / 100,
              transaction_id: pix.id,
            });
          }
          setStatusPix(r.status);
        }
      } catch (err) {
        console.error(err);
      }
    }, 8000);
    return () => window.clearInterval(t);
  }, [pix?.id, statusPix, consultarPix]);

  async function buscarCep(valor: string) {
    const digitos = valor.replace(/\D/g, "");
    if (digitos.length !== 8) return;
    try {
      const r = await fetch(`https://viacep.com.br/ws/${digitos}/json/`);
      const d = await r.json();
      if (d.erro) return;
      setF((p) => ({
        ...p,
        endereco: d.logradouro || p.endereco,
        bairro: d.bairro || p.bairro,
        cidade: d.localidade || p.cidade,
        estado: d.uf || p.estado,
      }));
    } catch (err) {
      console.error(err);
    }
  }

  function irParaEntrega() {
    const e: Record<string, string> = {};
    if (f.nome.trim().split(" ").length < 2) e.nome = "Informe o nome completo";
    if (f.cpf.replace(/\D/g, "").length !== 11) e.cpf = "Informe o CPF";
    if (f.telefone.replace(/\D/g, "").length < 10) e.telefone = "Informe o telefone";

    setErros(e);
    if (Object.keys(e).length) return;
    setEtapa(2);
    trackEvent("begin_checkout", {
      currency: "BRL",
      value: total / 100,
      items: itens.map((i) => ({ item_name: i.name, price: i.price / 100, quantity: i.quantity })),
    });
    topo.current?.scrollIntoView({ behavior: "smooth" });
  }

  function irParaPagamento() {
    const e: Record<string, string> = {};
    if (f.cep.replace(/\D/g, "").length !== 8) e.cep = "Informe o CEP";
    if (!f.endereco.trim()) e.endereco = "Informe o endereço";
    if (!f.semNumero && !f.numero.trim()) e.numero = "Informe o número";
    if (!f.bairro.trim()) e.bairro = "Informe o bairro";
    if (!f.cidade.trim()) e.cidade = "Informe a cidade";
    if (!f.estado) e.estado = "Informe o estado";
    setErros(e);
    if (Object.keys(e).length) return;
    setEtapa(3);
    trackEvent("add_shipping_info", { currency: "BRL", value: total / 100, shipping_tier: "Gratis" });
    topo.current?.scrollIntoView({ behavior: "smooth" });
  }

  async function comprar() {
    setEnviando(true);
    setFalha("");
    try {
      const r = await criarPix({
        data: {
          description: itemNome,
          items: itens,
          payer: {
            name: f.nome,
            taxId: f.cpf,
            email: `cliente${f.cpf.replace(/\D/g, "")}@pizzariadogordo.com`,
            phone: f.telefone,
          },
          delivery: {
            fee: 0,
            address: {
              country: "BR",
              state: f.estado,
              city: f.cidade,
              district: f.bairro,
              street: f.endereco,
              number: f.semNumero ? "S/N" : f.numero,
              complement: f.complemento,
              zipCode: f.cep,
            },
          },
        },
      });
      setPix(r);
      setStatusPix(r.status || "PENDING");
      trackEvent("add_payment_info", {
        currency: "BRL",
        value: (r.amount ?? total) / 100,
        payment_type: "PIX",
        transaction_id: r.id,
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error(err);
      setFalha("Não foi possível gerar o Pix agora. Tente novamente em instantes.");
    } finally {
      setEnviando(false);
    }
  }

  const vencimento = pix
    ? new Date(new Date(pix.createdAt).getTime() + 30 * 60000).toLocaleString("pt-br", {
        day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
      })
    : "";

  if (pix) {
    const primeiroNome = f.nome.trim().split(" ")[0] || "cliente";
    return (
      <div className="ck-page">
        <div className="ck-wrap ck-pix-final">
          <div className="ck-pix-logo-row" style={{ display: "flex", justifyContent: "center", marginTop: 20 }}>
            <span className="ck-pix-mark" />
          </div>
          <h2>Falta pouco, {primeiroNome}!</h2>
          <p>
            Você optou por pagar via PIX. Para finalizar sua compra, é necessário que você pague-o
            antes da data de vencimento.
          </p>
          <div className="ck-qr-card">
            <h3>Escaneie o QR CODE ou copie o código</h3>
            {qr ? <img src={qr} alt="QR Code do pagamento Pix" /> : null}
            <div className="ck-copy-code">{pix.copypaste}</div>
            <button
              type="button"
              className="ck-btn-copy"
              onClick={() => {
                navigator.clipboard?.writeText(pix.copypaste);
                setCopiado(true);
                window.setTimeout(() => setCopiado(false), 2000);
              }}
            >
              {copiado ? "Código copiado!" : "Copiar código"}
            </button>
            <p className="ck-pix-info">
              <span>Vencimento:</span> {vencimento}
              <br />
              <span>Valor:</span> {brl(pix.amount)}
            </p>
            <p className={`ck-status${statusPix === "PAID" ? " is-paid" : ""}`}>
              {statusPix === "PAID"
                ? "Pagamento confirmado! Seu pedido já está sendo preparado."
                : "Aguardando confirmação do pagamento..."}
            </p>
            <div className="ck-pix-passos">
              Abra o app do seu banco e entre no ambiente Pix;
              <br />
              Escolha Pagar com QR Code e aponte a câmera para o código ou cole o número
              identificador da transação;
              <br />
              Confirme as informações e finalize sua compra.
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="ck-page">
      <div className="ck-topbar" ref={topo}>
        <button
          type="button"
          className="ck-topbar-back"
          onClick={() => {
            if (etapa > 1) {
              setEtapa((p) => p - 1);
              return;
            }
            if (window.history.length > 1) window.history.back();
            else window.location.assign("/");
          }}
        >
          <i className="fa-i" aria-hidden="true"><svg viewBox="0 0 320 512" xmlns="http://www.w3.org/2000/svg"><path d="M9.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l192 192c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L77.3 256 246.6 86.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-192 192z"/></svg></i> Voltar
        </button>
        FINALIZE SEU PEDIDO!
      </div>
      <div className="ck-wrap">
        <div className="ck-card">
          <div className="ck-cart-head">
            <div>
              <h2>Seu carrinho</h2>
              <p>Informações da sua compra</p>
            </div>
            <div className="ck-cart-right">
              <span className="ck-cart-total">{brl(total)}</span>
              <span className="ck-badge-qtd">{itens.length}</span>
            </div>
          </div>
          <div className="ck-cart-body">
            {itens.map((i) => (
              <div className="ck-cart-line" key={i.name}>
                <span>
                  {i.quantity}x {i.name}
                </span>
                <strong>{brl(i.price * i.quantity)}</strong>
              </div>
            ))}
            {search.sabores ? (
              <div className="ck-cart-line">
                <span>Sabores: {search.sabores}</span>
              </div>
            ) : null}
            <div className="ck-cart-line">
              <span>Entrega</span>
              <strong>Grátis</strong>
            </div>
          </div>
        </div>

        <div className="ck-card ck-steps">
          <span className={`ck-step-dot${etapa > 1 ? " is-done" : " is-active"}`}>
            {etapa > 1 ? <i className="fa-i" aria-hidden="true"><svg viewBox="0 0 448 512" xmlns="http://www.w3.org/2000/svg"><path d="M438.6 105.4c12.5 12.5 12.5 32.8 0 45.3l-256 256c-12.5 12.5-32.8 12.5-45.3 0l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0L160 338.7 393.4 105.4c12.5-12.5 32.8-12.5 45.3 0z"/></svg></i> : "1"}
          </span>
          {etapa === 1 ? <span className="ck-step-label">Identificação</span> : null}
          <span className="ck-step-line" />
          <span className={`ck-step-dot${etapa > 2 ? " is-done" : etapa === 2 ? " is-active" : ""}`}>
            {etapa > 2 ? <i className="fa-i" aria-hidden="true"><svg viewBox="0 0 448 512" xmlns="http://www.w3.org/2000/svg"><path d="M438.6 105.4c12.5 12.5 12.5 32.8 0 45.3l-256 256c-12.5 12.5-32.8 12.5-45.3 0l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0L160 338.7 393.4 105.4c12.5-12.5 32.8-12.5 45.3 0z"/></svg></i> : "2"}
          </span>
          {etapa === 2 ? <span className="ck-step-label">Entrega</span> : null}
          <span className="ck-step-line" />
          <span className={`ck-step-dot${etapa === 3 ? " is-active" : ""}`}>3</span>
          {etapa === 3 ? <span className="ck-step-label">Pagamento</span> : null}
        </div>

        {etapa === 1 ? (
          <section className="ck-section">
            <div className="ck-section-title">
              <span className="ck-step-dot is-active">1</span>
              <h3>IDENTIFICAÇÃO</h3>
            </div>
            <Campo label="Nome completo" erro={erros.nome}>
              <input
                autoComplete="name"
                placeholder="Seu nome completo"
                value={f.nome}
                onChange={(e) => set("nome", e.target.value)}
              />
            </Campo>
            <Campo label="CPF" erro={erros.cpf}>
              <input
                inputMode="numeric"
                placeholder="000.000.000-00"
                value={f.cpf}
                onChange={(e) => set("cpf", maskCpf(e.target.value))}
              />
            </Campo>
            <Campo label="Telefone" erro={erros.telefone}>
              <input
                inputMode="tel"
                autoComplete="tel"
                placeholder="(00) 00000-0000"
                value={f.telefone}
                onChange={(e) => set("telefone", maskPhone(e.target.value))}
              />
            </Campo>

            <button type="button" className="ck-btn" onClick={irParaEntrega}>
              IR PARA A ENTREGA
            </button>
          </section>
        ) : null}

        {etapa === 2 ? (
          <section className="ck-section">
            <div className="ck-section-title">
              <span className="ck-step-dot is-active">2</span>
              <h3>ENTREGA</h3>
            </div>
            <Campo label="CEP" erro={erros.cep}>
              <input
                inputMode="numeric"
                autoComplete="postal-code"
                placeholder="12345-000"
                value={f.cep}
                onChange={(e) => {
                  const v = maskCep(e.target.value);
                  set("cep", v);
                  buscarCep(v);
                }}
              />
            </Campo>
            {!cepCompleto ? (
              <p className="ck-hint">Digite seu CEP para preenchermos o endereço automaticamente.</p>
            ) : null}
            {cepCompleto ? (
              <>
            <Campo label="Endereço" erro={erros.endereco}>
              <input
                autoComplete="address-line1"
                placeholder="Rua, avenida ou praça"
                value={f.endereco}
                onChange={(e) => set("endereco", e.target.value)}
              />
            </Campo>
            <div className="ck-row">
              <Campo label="Número" erro={erros.numero}>
                <input
                  placeholder="Nº"
                  disabled={f.semNumero}
                  value={f.numero}
                  onChange={(e) => set("numero", e.target.value)}
                />
              </Campo>
              <Campo label="Bairro" erro={erros.bairro}>
                <input
                  placeholder="Seu bairro"
                  value={f.bairro}
                  onChange={(e) => set("bairro", e.target.value)}
                />
              </Campo>
            </div>
            <label className="ck-check">
              <input
                type="checkbox"
                checked={f.semNumero}
                onChange={(e) => set("semNumero", e.target.checked)}
              />
              S/N
            </label>
            <Campo label="Complemento">
              <input
                id="complemento"
                placeholder="Apartamento e bloco"
                value={f.complemento}
                onChange={(e) => set("complemento", e.target.value)}
              />
            </Campo>
            <Campo label="Cidade" erro={erros.cidade}>
              <input
                autoComplete="address-level2"
                placeholder="Sua cidade"
                value={f.cidade}
                onChange={(e) => set("cidade", e.target.value)}
              />
            </Campo>
            <Campo label="Estado" erro={erros.estado}>
              <select value={f.estado} onChange={(e) => set("estado", e.target.value)}>
                <option value="">Selecione o estado</option>
                {ESTADOS.map(([uf, nome]) => (
                  <option key={uf} value={uf}>
                    {nome}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo label="País">
              <select value="BR" disabled onChange={() => undefined}>
                <option value="BR">Brasil</option>
              </select>
            </Campo>

            <p className="ck-frete-title">Escolha o melhor frete para você</p>
            <div className="ck-frete">
              <span className="ck-radio">
                <span />
              </span>
              <div>
                <strong>Entrega Rápida</strong>
                <small>20-25 minutos úteis</small>
              </div>
              <span className="ck-frete-preco">Grátis</span>
            </div>
            <p className="ck-frete-obs">
              A previsão de entrega pode variar de acordo com a região e facilidade de acesso ao seu
              endereço
            </p>
            <button type="button" className="ck-btn" onClick={irParaPagamento}>
              IR PARA O PAGAMENTO
            </button>
              </>
            ) : null}
          </section>
        ) : null}

        {etapa === 3 ? (
          <section className="ck-section">
            <div className="ck-section-title">
              <span className="ck-step-dot is-active">3</span>
              <h3>PAGAMENTO</h3>
            </div>
            <div className="ck-pix-box">
              <div className="ck-pix-head">
                <span className="ck-radio">
                  <span />
                </span>
                <span className="ck-pix-mark" />
                <span className="ck-pix-logo">PIX</span>
              </div>
              <p className="ck-pix-text">
                Os pagamentos efetuados via Pix não podem ser parcelados. Seu produto será reservado
                e enviado somente após a confirmação do pagamento.
              </p>
              <div className="ck-lembre">
                <strong>Lembre-se:</strong>
                <ul>
                  <li>Ao gerar o código atente para a data de expiração;</li>
                  <li>O pagamento leva alguns minutos para ser processado;</li>
                </ul>
              </div>
              <p className="ck-valor">
                Valor no Pix: <strong>{brl(total)}</strong>
              </p>
              <p className="ck-ofertas-title">
                Temos <em>{OFERTAS.length} ofertas disponíveis</em> para você:
              </p>

              {OFERTAS.map((o) => {
                const on = ofertas.includes(o.id);
                return (
                  <div key={o.id} className={`ck-oferta${on ? " is-on" : ""}`}>
                    <img src={o.img} alt={o.nome} />
                    <h4>{o.nome}</h4>
                    <span className="ck-oferta-de">{o.de}</span>
                    <span className="ck-oferta-por">{o.precoLabel}</span>
                    <button
                      type="button"
                      className="ck-btn-oferta"
                      onClick={() =>
                        setOfertas((p) => (on ? p.filter((i) => i !== o.id) : [...p, o.id]))
                      }
                    >
                      <span className="ck-box">{on ? "✓" : ""}</span>
                      {on ? "OFERTA ADICIONADA" : "PEGAR OFERTA"}
                    </button>
                    <p className="ck-oferta-nota">{o.nota}</p>
                  </div>
                );
              })}

              {falha ? <div className="ck-alert">{falha}</div> : null}
              <button
                type="button"
                className="ck-btn"
                disabled={enviando}
                onClick={comprar}
                style={{ flexDirection: "column", gap: "2px" }}
              >
                {enviando ? (
                  "GERANDO PIX..."
                ) : (
                  <>
                    Confirmar pedido e gerar PIX
                    <span style={{ fontSize: "0.9em", opacity: 0.95 }}>{brl(total)}</span>
                  </>
                )}
              </button>
              <p className="ck-nota-final">
                Após confirmar o pedido, o código Pix será gerado para pagamento.
              </p>
            </div>
          </section>
        ) : null}
      </div>
      <Footer />
    </div>
  );
}

function Campo({
  label,
  erro,
  children,
}: {
  label: string;
  erro?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`ck-field${erro ? " ck-invalid" : ""}`}>
      <label>{label}</label>
      {children}
      {erro ? (
        <span className="ck-error">
          <i className="fa-i" aria-hidden="true"><svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zm0-384c13.3 0 24 10.7 24 24V264c0 13.3-10.7 24-24 24s-24-10.7-24-24V152c0-13.3 10.7-24 24-24zM224 352a32 32 0 1 1 64 0 32 32 0 1 1 -64 0z"/></svg></i> {erro}
        </span>
      ) : null}
    </div>
  );
}

export const Route = createFileRoute("/checkout")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    item: typeof search.item === "string" ? search.item : undefined,
    total: search.total != null && !Number.isNaN(Number(search.total)) ? Number(search.total) : undefined,
    sabores: typeof search.sabores === "string" ? search.sabores : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Finalize seu pedido — Pizzaria do Gordo" },
      {
        name: "description",
        content: "Conclua seu pedido da Pizzaria do Gordo com pagamento via Pix e entrega grátis.",
      },
      { property: "og:title", content: "Finalize seu pedido — Pizzaria do Gordo" },
      { property: "og:description", content: "Pagamento via Pix rápido e seguro. Entrega grátis." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CheckoutPage,
});
