import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * SINCRONIZAÇÃO EM NUVEM (cross-device) via Supabase.
 *
 * As credenciais (URL + anon key) vêm de variáveis de ambiente Vite OU
 * podem ser preenchidas pelo usuário na tela de Configurações (e salvas no
 * localStorage). Isso permite o sistema funcionar mesmo sem variáveis de
 * build — basta o usuário criar um projeto Supabase grátis (em ~2min) e
 * colar URL + anon key em Configurações → Sincronização.
 *
 * Tabela esperada no Supabase (rodar uma única vez no SQL editor):
 *
 *   create table if not exists workspaces (
 *     id          uuid primary key default gen_random_uuid(),
 *     code        text unique not null,
 *     data        jsonb not null,
 *     updated_at  timestamptz not null default now()
 *   );
 *   alter table workspaces enable row level security;
 *   create policy "open r/w by code" on workspaces
 *     for all using (true) with check (true);
 *
 * Segurança: o RLS aberto + código secreto de 12 caracteres no `code`
 * deixa a tabela acessível apenas para quem conhece o código (suficiente
 * para uso pessoal/single-tenant). Para multi-tenant real, troque por auth.
 */

interface SupaCreds {
  url: string;
  anonKey: string;
}

const LS_CREDS = "tirzenix-supabase-creds";
const LS_WORKSPACE = "tirzenix-workspace-code";

export function getStoredCreds(): SupaCreds | null {
  // 1) env vars do build
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL as string | undefined;
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (envUrl && envKey) return { url: envUrl, anonKey: envKey };
  // 2) salvas pelo usuário
  try {
    const raw = localStorage.getItem(LS_CREDS);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.url && parsed?.anonKey) return parsed as SupaCreds;
  } catch {
    /* noop */
  }
  return null;
}

export function setStoredCreds(creds: SupaCreds | null) {
  if (!creds) {
    localStorage.removeItem(LS_CREDS);
    return;
  }
  localStorage.setItem(LS_CREDS, JSON.stringify(creds));
}

export function getWorkspaceCode(): string {
  let code = localStorage.getItem(LS_WORKSPACE);
  if (!code) {
    code = generateCode();
    localStorage.setItem(LS_WORKSPACE, code);
  }
  return code;
}

export function setWorkspaceCode(code: string) {
  const clean = code.trim().toUpperCase();
  if (clean) localStorage.setItem(LS_WORKSPACE, clean);
}

function generateCode(): string {
  // 12 chars sem confusão (sem 0/O/1/I)
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 12; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

let _client: SupabaseClient | null = null;
let _clientCreds = "";

export function getClient(): SupabaseClient | null {
  const creds = getStoredCreds();
  if (!creds) return null;
  const key = `${creds.url}|${creds.anonKey}`;
  if (_client && key === _clientCreds) return _client;
  _client = createClient(creds.url, creds.anonKey, {
    auth: { persistSession: false },
  });
  _clientCreds = key;
  return _client;
}

export interface RemoteRow {
  code: string;
  data: any;
  updated_at: string;
}

export async function pullFromCloud(): Promise<
  | { ok: true; data: any | null; updatedAt: string | null }
  | { ok: false; error: string }
> {
  const client = getClient();
  if (!client) return { ok: false, error: "Sem credenciais Supabase" };
  const code = getWorkspaceCode();
  const { data, error } = await client
    .from("workspaces")
    .select("data, updated_at")
    .eq("code", code)
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: true, data: null, updatedAt: null };
  return { ok: true, data: data.data, updatedAt: data.updated_at };
}

export async function pushToCloud(payload: any): Promise<
  { ok: true; updatedAt: string } | { ok: false; error: string }
> {
  const client = getClient();
  if (!client) return { ok: false, error: "Sem credenciais Supabase" };
  const code = getWorkspaceCode();
  const now = new Date().toISOString();
  const { data, error } = await client
    .from("workspaces")
    .upsert(
      { code, data: payload, updated_at: now },
      { onConflict: "code" }
    )
    .select("updated_at")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  return { ok: true, updatedAt: data?.updated_at || now };
}

export function isCloudEnabled(): boolean {
  return !!getStoredCreds();
}
