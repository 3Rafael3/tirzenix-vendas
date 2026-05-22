/**
 * SINCRONIZAÇÃO via GitHub Gist (cross-device sem servidor próprio).
 *
 * Como funciona:
 *  - O usuário cria um Personal Access Token (PAT) no GitHub com o escopo `gist`
 *  - O sistema usa esse token para criar um gist PRIVADO contendo o JSON completo
 *  - Atualizações futuras editam o mesmo gist (1 só "arquivo de backup")
 *  - Para acessar de outro aparelho: o usuário cola o mesmo PAT e o sistema
 *    auto-descobre o gist pesquisando por nome de arquivo
 *
 * Segurança:
 *  - O PAT é guardado APENAS no localStorage do dispositivo (nunca enviado pra
 *    servidor nosso — só pro GitHub)
 *  - O gist é privado (não aparece em buscas, só com link direto)
 */

const LS_TOKEN = "tirzenix-gh-pat";
const LS_GIST_ID = "tirzenix-gh-gist-id";

const FILENAME = "tirzenix-backup.json";
const DESCRIPTION =
  "Tirzenix · backup automático (https://3rafael3.github.io/tirzenix-vendas/)";

export function getToken(): string {
  const envToken = (import.meta as any).env?.VITE_GH_TOKEN as string | undefined;
  if (envToken) return envToken;
  return localStorage.getItem(LS_TOKEN) || "";
}

export function setToken(token: string | null) {
  if (!token) {
    localStorage.removeItem(LS_TOKEN);
    return;
  }
  localStorage.setItem(LS_TOKEN, token.trim());
}

export function getGistId(): string {
  return localStorage.getItem(LS_GIST_ID) || "";
}

export function setGistId(id: string | null) {
  if (!id) {
    localStorage.removeItem(LS_GIST_ID);
    return;
  }
  localStorage.setItem(LS_GIST_ID, id.trim());
}

export function isGistEnabled(): boolean {
  return !!getToken();
}

interface GhUser {
  login: string;
  avatar_url: string;
  name?: string;
}

function authHeaders() {
  const token = getToken();
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

export async function getUser(): Promise<GhUser | null> {
  const token = getToken();
  if (!token) return null;
  try {
    const r = await fetch("https://api.github.com/user", { headers: authHeaders() });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

/** Procura nos gists do usuário um que tenha o arquivo de backup do Tirzenix. */
export async function findGist(): Promise<string | null> {
  const token = getToken();
  if (!token) return null;
  try {
    let page = 1;
    while (page <= 5) {
      const r = await fetch(
        `https://api.github.com/gists?per_page=100&page=${page}`,
        { headers: authHeaders() }
      );
      if (!r.ok) return null;
      const arr: any[] = await r.json();
      for (const g of arr) {
        if (g?.files && g.files[FILENAME]) return g.id as string;
      }
      if (arr.length < 100) break;
      page += 1;
    }
    return null;
  } catch {
    return null;
  }
}

export async function pullFromGist(): Promise<
  | { ok: true; data: any; updatedAt: string }
  | { ok: false; error: string }
> {
  const token = getToken();
  if (!token) return { ok: false, error: "Sem token. Cole seu PAT primeiro." };

  let id = getGistId();
  if (!id) {
    const found = await findGist();
    if (found) {
      id = found;
      setGistId(found);
    }
  }
  if (!id) {
    return {
      ok: false,
      error: "Nenhum backup encontrado na sua conta. Faça um push primeiro.",
    };
  }

  try {
    const r = await fetch(`https://api.github.com/gists/${id}`, { headers: authHeaders() });
    if (!r.ok) return { ok: false, error: `HTTP ${r.status} ao buscar gist` };
    const gist = await r.json();
    const file = gist.files?.[FILENAME];
    if (!file) return { ok: false, error: "Arquivo de backup não está no gist" };

    let content: string = file.content || "";
    if (file.truncated && file.raw_url) {
      const rr = await fetch(file.raw_url);
      content = await rr.text();
    }
    const data = JSON.parse(content);
    return { ok: true, data, updatedAt: gist.updated_at };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Erro ao baixar" };
  }
}

export async function pushToGist(payload: any): Promise<
  { ok: true; gistId: string; updatedAt: string } | { ok: false; error: string }
> {
  const token = getToken();
  if (!token) return { ok: false, error: "Sem token. Cole seu PAT primeiro." };

  const body = {
    files: {
      [FILENAME]: {
        content: JSON.stringify(payload, null, 2),
      },
    },
  };

  let id = getGistId();
  if (!id) {
    // procura existente antes de criar
    const found = await findGist();
    if (found) {
      id = found;
      setGistId(found);
    }
  }

  try {
    if (id) {
      // PATCH gist existente
      const r = await fetch(`https://api.github.com/gists/${id}`, {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) return { ok: false, error: `HTTP ${r.status} ao atualizar` };
      const data = await r.json();
      return { ok: true, gistId: data.id, updatedAt: data.updated_at };
    }
    // Cria novo gist privado
    const r = await fetch(`https://api.github.com/gists`, {
      method: "POST",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({
        description: DESCRIPTION,
        public: false,
        ...body,
      }),
    });
    if (!r.ok) return { ok: false, error: `HTTP ${r.status} ao criar gist` };
    const data = await r.json();
    setGistId(data.id);
    return { ok: true, gistId: data.id, updatedAt: data.updated_at };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Erro ao enviar" };
  }
}
