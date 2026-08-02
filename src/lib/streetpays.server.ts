const API_BASE = "https://api.streetpays.com.br/v1";

// Chave embutida para o app funcionar em qualquer hospedagem (Vercel, etc.)
// sem precisar configurar variavel de ambiente. A variavel, se existir, tem prioridade.
const FALLBACK_API_KEY = "f6_VD0QXcr64pndCGiQhWWx806uu-g4pjXcI70AJF1c";

function authHeaders() {
  const token = process.env.STREETPAYS_API_KEY || FALLBACK_API_KEY;
  if (!token) throw new Error("STREETPAYS_API_KEY não configurada");
  return {
    Authorization: `Bearer ${token}`,
    accept: "application/json",
    "content-type": "application/json",
  };
}

export async function streetpaysCreatePayment(body: unknown) {
  const response = await fetch(`${API_BASE}/payment`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`StreetPays create payment failed [${response.status}]: ${errorBody}`);
    throw new Error(`StreetPays [${response.status}]: ${errorBody}`);
  }

  return response.json();
}

export async function streetpaysFindPayment(id: string) {
  const response = await fetch(`${API_BASE}/payment/${encodeURIComponent(id)}`, {
    method: "GET",
    headers: authHeaders(),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`StreetPays find payment failed [${response.status}]: ${errorBody}`);
    throw new Error(`StreetPays [${response.status}]: ${errorBody}`);
  }

  return response.json();
}
