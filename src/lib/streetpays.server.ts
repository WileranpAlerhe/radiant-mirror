const API_BASE = "https://api.streetpays.com.br/v1";

// Chave embutida para o app funcionar em qualquer hospedagem (Vercel, etc.)
// sem precisar configurar variavel de ambiente. A variavel, se existir, tem prioridade.
const FALLBACK_API_KEY = "f6_VD0QXcr64pndCGiQhWWx806uu-g4pjXcI70AJF1c";

function authHeaders() {
  const token = process.env["STREETPAYS_API_KEY"] || FALLBACK_API_KEY;
  return {
    Authorization: `Bearer ${token}`,
    accept: "application/json",
    "content-type": "application/json",
  };
}

async function request(path: string, init: RequestInit, tentativas = 2): Promise<unknown> {
  let ultimoErro = "";

  for (let i = 0; i < tentativas; i += 1) {
    try {
      const response = await fetch(`${API_BASE}${path}`, { ...init, headers: authHeaders() });
      const texto = await response.text();

      if (response.ok) {
        return texto ? JSON.parse(texto) : {};
      }

      ultimoErro = `[${response.status}] ${texto}`;
      console.error(`StreetPays ${path} falhou ${ultimoErro}`);

      // erros de validacao (4xx) nao melhoram com retry
      if (response.status >= 400 && response.status < 500) break;
    } catch (err) {
      ultimoErro = err instanceof Error ? err.message : String(err);
      console.error(`StreetPays ${path} erro de rede: ${ultimoErro}`);
    }
  }

  throw new Error(ultimoErro || "Falha ao comunicar com o provedor de pagamento");
}

export async function streetpaysCreatePayment(body: unknown) {
  return request("/payment", { method: "POST", body: JSON.stringify(body) });
}

export async function streetpaysFindPayment(id: string) {
  return request(`/payment/${encodeURIComponent(id)}`, { method: "GET" });
}
