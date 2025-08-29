import React, { useState } from 'react';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { initFirebase } from '../../config/database.config';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await initFirebase();
      const auth = getAuth();
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      setError(err?.message || 'Falha ao entrar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f3f4f6' }}>
      <form onSubmit={handleLogin} style={{ background: 'white', padding: 24, borderRadius: 12, width: 360, boxShadow: '0 10px 25px rgba(0,0,0,0.08)' }}>
        <h2 style={{ margin: 0, marginBottom: 12 }}>Entrar</h2>
        <p style={{ marginTop: 0, marginBottom: 16, color: '#6b7280' }}>Use suas credenciais para acessar</p>
        {error && (
          <div style={{ background: '#fee2e2', color: '#991b1b', padding: '8px 10px', borderRadius: 8, marginBottom: 12 }}>{error}</div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#374151', marginBottom: 6 }}>E-mail</label>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" required placeholder="email@exemplo.com" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#374151', marginBottom: 6 }}>Senha</label>
            <input value={password} onChange={e => setPassword(e.target.value)} type="password" required placeholder="Sua senha" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb' }} />
          </div>
          <button disabled={loading} type="submit" style={{ marginTop: 8, background: '#111827', color: 'white', border: 'none', borderRadius: 8, padding: '10px 12px', cursor: 'pointer' }}>{loading ? 'Entrando...' : 'Entrar'}</button>
        </div>
      </form>
    </div>
  );
}



