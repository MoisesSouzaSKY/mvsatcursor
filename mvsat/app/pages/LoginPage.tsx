import React, { useState, useEffect } from 'react';
import { createUserWithEmailAndPassword, getAuth, sendEmailVerification, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { initFirebase } from '../../config/database.config';
import { useNavigate } from 'react-router-dom';
import { bootstrapTenantSessionFromUser, provisionTenantForNewUser } from '../../shared/saas/usuario';
// (Firestore writes ficam centralizadas em provisionTenantForNewUser)

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showReset, setShowReset] = useState(false);
  const [resetStep, setResetStep] = useState<'request' | 'confirm'>('request');
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [signupSuccess, setSignupSuccess] = useState<string | null>(null);
  const [signup, setSignup] = useState({
    nome: '',
    cpf: '',
    telefone: '',
    email: '',
    senha: '',
    confirmarSenha: '',
  });

  // Evitar redirect automático aqui: o App faz o bootstrap do tenant.

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      await initFirebase();
      const auth = getAuth();
      const cred = await signInWithEmailAndPassword(auth, email, password);
      // Garante que o estado emailVerified foi atualizado após clicar no link
      try {
        await cred.user.reload();
      } catch {}
      if (cred.user.emailVerified === false) {
        try {
          await sendEmailVerification(cred.user);
        } catch {}
        await signOut(auth);
        throw new Error('Confirme seu e-mail para acessar. Enviamos (ou reenviamos) um link de confirmação.');
      }
      // Bootstrap tenant imediatamente para dar erro amigável (e não entrar "meio logado")
      await bootstrapTenantSessionFromUser(cred.user);
      navigate('/clientes', { replace: true });
    } catch (err: any) {
      const message = formatAuthError(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const onlyDigits = (v: string) => String(v || '').replace(/\D/g, '');

  const formatAuthError = (err: any): string => {
    const code = String(err?.code || '');
    if (code === 'auth/email-already-in-use') return 'Este e-mail já está em uso. Tente entrar ou use outro e-mail.';
    if (code === 'auth/invalid-email') return 'E-mail inválido.';
    if (code === 'auth/weak-password') return 'Senha fraca. Use ao menos 6 caracteres.';
    if (code === 'auth/operation-not-allowed') return 'Cadastro por e-mail/senha está desativado no Firebase (habilite em Authentication → Método de login).';
    if (code === 'auth/network-request-failed') return 'Falha de conexão. Verifique sua internet e tente novamente.';
    if (code === 'auth/too-many-requests') return 'Muitas tentativas. Aguarde um pouco e tente novamente.';
    if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') return 'E-mail ou senha incorretos.';
    if (code === 'auth/user-not-found') return 'Usuário não encontrado.';
    if (code === 'auth/user-disabled') return 'Usuário desativado.';
    const msg = typeof err?.message === 'string' ? err.message : 'Erro ao autenticar.';
    return msg || 'Erro ao autenticar.';
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSignupError(null);
    setSignupSuccess(null);
    setSignupLoading(true);
    try {
      const nome = signup.nome.trim();
      const cpf = onlyDigits(signup.cpf);
      const telefone = signup.telefone.trim();
      const emailCad = signup.email.trim();
      const senhaCad = signup.senha;
      const confirmar = signup.confirmarSenha;

      if (!nome) throw new Error('Informe seu nome.');
      if (cpf.length !== 11) throw new Error('CPF inválido. Informe 11 dígitos.');
      if (!emailCad) throw new Error('Informe seu e-mail.');
      if (senhaCad.length < 6) throw new Error('A senha deve ter ao menos 6 caracteres.');
      if (senhaCad !== confirmar) throw new Error('As senhas não coincidem.');

      await initFirebase();
      const auth = getAuth();
      const cred = await createUserWithEmailAndPassword(auth, emailCad, senhaCad);

      await provisionTenantForNewUser(cred.user, {
        nome,
        cpf,
        telefone: telefone || '',
      });

      try {
        await sendEmailVerification(cred.user);
      } catch {}

      await signOut(auth);

      setShowSignup(false);
      setSignup({
        nome: '',
        cpf: '',
        telefone: '',
        email: '',
        senha: '',
        confirmarSenha: '',
      });

      const msg = 'Conta criada! Enviamos um e-mail de confirmação. Confirme e depois faça login.';
      setSignupSuccess(msg);
      setSuccess(msg);
      setEmail(emailCad);
      setPassword('');
    } catch (err: any) {
      const msg = formatAuthError(err);
      setSignupError(msg);
      setError(msg);
    } finally {
      setSignupLoading(false);
    }
  };

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setResetLoading(true);
    try {
      const targetEmail = resetEmail || email;
      if (!targetEmail) {
        setError('Informe um e-mail para recuperar a senha.');
        return;
      }
      const res = await fetch('http://localhost:5050/auth/request-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Falha ao solicitar código');
      setSuccess('Código enviado. Verifique seu e-mail.');
      setResetStep('confirm');
    } catch (err: any) {
      setError(err?.message || 'Falha ao solicitar código');
    } finally {
      setResetLoading(false);
    }
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (newPassword.length < 6) {
      setError('A nova senha deve ter ao menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    setResetLoading(true);
    try {
      const targetEmail = resetEmail || email;
      const res = await fetch('http://localhost:5050/auth/confirm-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, code: resetCode, newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Falha ao redefinir senha');
      setSuccess('Senha atualizada com sucesso. Você já pode entrar.');
      setShowReset(false);
      setResetStep('request');
      setResetCode('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err?.message || 'Falha ao redefinir senha');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'url(/background.jpg) center 25%/cover no-repeat fixed', padding: 16 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.35)' }} />
      <div style={{ position: 'relative', width: '100%', maxWidth: 380 }}>
        <form onSubmit={handleLogin} style={{ background: 'white', padding: 24, borderRadius: 16, width: '100%', boxShadow: '0 12px 30px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700 }}>MV</div>
          </div>
          <h2 style={{ margin: 0, marginBottom: 8, textAlign: 'center' }}>Entrar</h2>
          <p style={{ marginTop: 0, marginBottom: 16, color: '#6b7280', textAlign: 'center' }}>Use suas credenciais para acessar</p>

          {error && (
            <div style={{ background: '#fee2e2', color: '#991b1b', padding: '10px 12px', borderRadius: 10, marginBottom: 12, border: '1px solid #fecaca' }}>{error}</div>
          )}
          {success && (
            <div style={{ background: '#ecfdf5', color: '#065f46', padding: '10px 12px', borderRadius: 10, marginBottom: 12, border: '1px solid #a7f3d0' }}>{success}</div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#374151', marginBottom: 6 }}>E-mail</label>
              <input 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                type="email" 
                required 
                placeholder="email@exemplo.com" 
                autoComplete="email"
                autoFocus
                style={{ 
                  width: '100%', 
                  padding: '12px 14px', 
                  borderRadius: 10, 
                  border: '1px solid #e5e7eb', 
                  outline: 'none',
                  fontSize: '14px',
                  backgroundColor: 'white'
                }} 
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#374151', marginBottom: 6 }}>Senha</label>
              <input 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                type="password" 
                required 
                placeholder="Sua senha" 
                autoComplete="current-password"
                style={{ 
                  width: '100%', 
                  padding: '12px 14px', 
                  borderRadius: 10, 
                  border: '1px solid #e5e7eb', 
                  outline: 'none',
                  fontSize: '14px',
                  backgroundColor: 'white'
                }} 
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button disabled={loading} type="submit" style={{ marginTop: 8, background: '#111827', color: 'white', border: 'none', borderRadius: 10, padding: '12px 14px', cursor: 'pointer', width: '100%' }}>{loading ? 'Entrando...' : 'Entrar'}</button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 4 }}>
              <button type="button" onClick={() => { setShowReset(true); setSuccess(null); setError(null); setResetEmail(email); }} style={{ background: 'transparent', color: '#111827', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 6 }}>Esqueci minha senha</button>
            </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 2 }}>
            <button
              type="button"
              onClick={() => {
                setShowSignup(true);
                setSuccess(null);
                setError(null);
                setSignupError(null);
                setSignupSuccess(null);
                setSignup((s) => ({ ...s, email }));
              }}
              style={{ background: 'transparent', color: '#111827', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 6 }}
            >
              Criar conta
            </button>
          </div>
          </div>
        </form>

        {showReset && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div style={{ background: 'white', width: '100%', maxWidth: 420, borderRadius: 14, boxShadow: '0 20px 40px rgba(0,0,0,0.2)', padding: 20 }}>
              <h3 style={{ marginTop: 0, marginBottom: 8 }}>Redefinir senha</h3>
              {resetStep === 'request' && (
                <>
                  <p style={{ marginTop: 0, color: '#6b7280' }}>Informe seu e-mail para receber o código de verificação.</p>
                  <form onSubmit={handleRequestCode}>
                    <label style={{ display: 'block', fontSize: 12, color: '#374151', marginBottom: 6 }}>E-mail</label>
                    <input value={resetEmail} onChange={e => setResetEmail(e.target.value)} type="email" required placeholder="email@exemplo.com" style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid #e5e7eb', outline: 'none' }} />
                    <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
                      <button type="button" onClick={() => setShowReset(false)} style={{ background: '#e5e7eb', color: '#111827', border: 'none', borderRadius: 10, padding: '10px 12px', cursor: 'pointer' }}>Cancelar</button>
                      <button type="submit" disabled={resetLoading} style={{ background: '#111827', color: 'white', border: 'none', borderRadius: 10, padding: '10px 12px', cursor: 'pointer' }}>{resetLoading ? 'Enviando...' : 'Enviar código'}</button>
                    </div>
                  </form>
                </>
              )}

              {resetStep === 'confirm' && (
                <>
                  <p style={{ marginTop: 0, color: '#6b7280' }}>Digite o código recebido e sua nova senha.</p>
                  <form onSubmit={handleConfirmReset}>
                    <label style={{ display: 'block', fontSize: 12, color: '#374151', marginBottom: 6 }}>Código</label>
                    <input value={resetCode} onChange={e => setResetCode(e.target.value)} inputMode="numeric" required placeholder="000000" style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid #e5e7eb', outline: 'none', letterSpacing: 4 }} />
                    <label style={{ display: 'block', fontSize: 12, color: '#374151', marginBottom: 6, marginTop: 10 }}>Nova senha</label>
                    <input value={newPassword} onChange={e => setNewPassword(e.target.value)} type="password" required placeholder="••••••••" style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid #e5e7eb', outline: 'none' }} />
                    <label style={{ display: 'block', fontSize: 12, color: '#374151', marginBottom: 6, marginTop: 10 }}>Confirmar senha</label>
                    <input value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} type="password" required placeholder="••••••••" style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid #e5e7eb', outline: 'none' }} />
                    <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'space-between' }}>
                      <button type="button" onClick={() => setResetStep('request')} style={{ background: '#e5e7eb', color: '#111827', border: 'none', borderRadius: 10, padding: '10px 12px', cursor: 'pointer' }}>Voltar</button>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button type="button" onClick={() => setShowReset(false)} style={{ background: '#e5e7eb', color: '#111827', border: 'none', borderRadius: 10, padding: '10px 12px', cursor: 'pointer' }}>Cancelar</button>
                        <button type="submit" disabled={resetLoading} style={{ background: '#111827', color: 'white', border: 'none', borderRadius: 10, padding: '10px 12px', cursor: 'pointer' }}>{resetLoading ? 'Salvando...' : 'Alterar senha'}</button>
                      </div>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        )}

        {showSignup && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div style={{ background: 'white', width: '100%', maxWidth: 460, borderRadius: 14, boxShadow: '0 20px 40px rgba(0,0,0,0.2)', padding: 20 }}>
              <h3 style={{ marginTop: 0, marginBottom: 8 }}>Criar conta</h3>
              <p style={{ marginTop: 0, color: '#6b7280' }}>Você receberá um e-mail para confirmar o cadastro.</p>
              {signupError && (
                <div style={{ background: '#fee2e2', color: '#991b1b', padding: '10px 12px', borderRadius: 10, marginBottom: 12, border: '1px solid #fecaca' }}>{signupError}</div>
              )}
              {signupSuccess && (
                <div style={{ background: '#ecfdf5', color: '#065f46', padding: '10px 12px', borderRadius: 10, marginBottom: 12, border: '1px solid #a7f3d0' }}>{signupSuccess}</div>
              )}
              <form onSubmit={handleSignup}>
                <label style={{ display: 'block', fontSize: 12, color: '#374151', marginBottom: 6 }}>Nome</label>
                <input
                  value={signup.nome}
                  onChange={(e) => setSignup((s) => ({ ...s, nome: e.target.value }))}
                  type="text"
                  required
                  placeholder="Seu nome completo"
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid #e5e7eb', outline: 'none', marginBottom: 10 }}
                />

                <label style={{ display: 'block', fontSize: 12, color: '#374151', marginBottom: 6 }}>CPF</label>
                <input
                  value={signup.cpf}
                  onChange={(e) => setSignup((s) => ({ ...s, cpf: e.target.value }))}
                  inputMode="numeric"
                  required
                  placeholder="Somente números"
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid #e5e7eb', outline: 'none', marginBottom: 10 }}
                />

                <label style={{ display: 'block', fontSize: 12, color: '#374151', marginBottom: 6 }}>Telefone</label>
                <input
                  value={signup.telefone}
                  onChange={(e) => setSignup((s) => ({ ...s, telefone: e.target.value }))}
                  type="tel"
                  placeholder="(xx) xxxxx-xxxx"
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid #e5e7eb', outline: 'none', marginBottom: 10 }}
                />

                <label style={{ display: 'block', fontSize: 12, color: '#374151', marginBottom: 6 }}>E-mail</label>
                <input
                  value={signup.email}
                  onChange={(e) => setSignup((s) => ({ ...s, email: e.target.value }))}
                  type="email"
                  required
                  placeholder="email@exemplo.com"
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid #e5e7eb', outline: 'none', marginBottom: 10 }}
                />

                <label style={{ display: 'block', fontSize: 12, color: '#374151', marginBottom: 6 }}>Senha</label>
                <input
                  value={signup.senha}
                  onChange={(e) => setSignup((s) => ({ ...s, senha: e.target.value }))}
                  type="password"
                  required
                  placeholder="••••••••"
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid #e5e7eb', outline: 'none', marginBottom: 10 }}
                />

                <label style={{ display: 'block', fontSize: 12, color: '#374151', marginBottom: 6 }}>Confirmar senha</label>
                <input
                  value={signup.confirmarSenha}
                  onChange={(e) => setSignup((s) => ({ ...s, confirmarSenha: e.target.value }))}
                  type="password"
                  required
                  placeholder="••••••••"
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid #e5e7eb', outline: 'none' }}
                />

                <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSignup(false);
                      setSignupError(null);
                      setSignupSuccess(null);
                    }}
                    style={{ background: '#e5e7eb', color: '#111827', border: 'none', borderRadius: 10, padding: '10px 12px', cursor: 'pointer' }}
                  >
                    Cancelar
                  </button>
                  <button type="submit" disabled={signupLoading} style={{ background: '#111827', color: 'white', border: 'none', borderRadius: 10, padding: '10px 12px', cursor: 'pointer' }}>
                    {signupLoading ? 'Criando...' : 'Criar conta'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}



