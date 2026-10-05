"use client";

import { FormEvent, useState } from "react";
import { Leaf, LoaderCircle, LockKeyhole, Mail } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";

export function LoginScreen({ supabase }: { supabase: SupabaseClient }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) setError("E-mail ou senha inválidos.");
    setLoading(false);
  }

  return (
    <main className="login-shell">
      <section className="login-card">
        <span className="login-mark"><Leaf size={31} /></span>
        <p className="eyebrow">ACESSO RESTRITO</p>
        <h1>Agrícola Marasca</h1>
        <p className="login-intro">Entre para acessar o painel de vendas e rentabilidade.</p>
        <form onSubmit={handleSubmit}>
          <label><span>E-mail</span><div><Mail size={18} /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" /></div></label>
          <label><span>Senha</span><div><LockKeyhole size={18} /><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" /></div></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary-button login-button" disabled={loading}>{loading ? <LoaderCircle className="spin" size={18} /> : <LockKeyhole size={18} />} Entrar</button>
        </form>
        <small>Sua sessão ficará salva neste dispositivo. Dados protegidos por autenticação e políticas de acesso.</small>
      </section>
    </main>
  );
}
