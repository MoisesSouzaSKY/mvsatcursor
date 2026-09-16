import React, { useState } from 'react';
import { EmailAuthProvider, getAuth, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import './PainelControlePage.css';
import { recordSelfPasswordChange } from '../../admin/adminControlService';
import { loadTenantSession, saveTenantSession } from '../../shared/saas/session';

function strength(password: string) {
  return [password.length >= 8, /[A-Z]/.test(password), /\d/.test(password), /[^A-Za-z0-9]/.test(password)].filter(Boolean).length;
}

export default function MinhaContaPage() {
  const user = getAuth().currentUser;
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');
    if (!user?.email) return setError('Sessão de usuário não encontrada.');
    if (next.length < 8) return setError('A nova senha deve ter no mínimo 8 caracteres.');
    if (next !== confirm) return setError('A confirmação da nova senha não confere.');
    try {
      setSaving(true);
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, current));
      await updatePassword(user, next);
      await recordSelfPasswordChange();
      const session = loadTenantSession();
      if (session) saveTenantSession({ ...session, mustChangePassword: false });
      setCurrent('');
      setNext('');
      setConfirm('');
      setMessage('Sua senha foi alterada com segurança.');
    } catch {
      setError('Não foi possível alterar a senha. Confirme a senha atual e tente novamente.');
    } finally { setSaving(false); }
  };

  return <section className="control-panel account-page">
    <header className="control-hero"><div><div className="eyebrow">MINHA CONTA</div><h1>Segurança</h1><p>Altere sua própria senha. A senha atual nunca é exibida nem armazenada pelo MV SAT.</p></div></header>
    <form className="control-card account-security-card" onSubmit={submit}>
      <h2>Alterar minha senha</h2>
      <p className="account-email">{user?.email || 'Usuário autenticado'}</p>
      {error && <div className="modal-error">{error}</div>}
      {message && <div className="control-success">{message}</div>}
      <label>Senha atual *<div className="password-field"><input required type={show ? 'text' : 'password'} value={current} onChange={(event) => setCurrent(event.target.value)} autoComplete="current-password" /><button type="button" onClick={() => setShow((value) => !value)} aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}>{show ? '◉' : '◌'}</button></div></label>
      <label>Nova senha *<div className="password-field"><input required minLength={8} type={show ? 'text' : 'password'} value={next} onChange={(event) => setNext(event.target.value)} autoComplete="new-password" /><button type="button" onClick={() => setShow((value) => !value)}>{show ? '◉' : '◌'}</button></div></label>
      {next && <small className="password-strength">Força: {['fraca', 'básica', 'boa', 'forte', 'muito forte'][strength(next)]}</small>}
      <label>Confirmar nova senha *<input required minLength={8} type={show ? 'text' : 'password'} value={confirm} onChange={(event) => setConfirm(event.target.value)} autoComplete="new-password" /></label>
      <div className="modal-footer"><button className="primary-button" disabled={saving}>{saving ? 'Alterando...' : 'Alterar minha senha'}</button></div>
    </form>
  </section>;
}
