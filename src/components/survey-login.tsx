'use client';
import { useActionState, useState } from 'react';
import { loginSurvey } from '@/app/encuesta/actions';
export default function SurveyLogin() {
  const [state, action, pending] = useActionState(loginSurvey, { error: '' });
  const [username, setUsername] = useState('');
  return <form action={action} className="survey-login"><label htmlFor="username">Usuario</label><input id="username" name="username" autoComplete="username" maxLength={100} required value={username} onChange={event => setUsername(event.target.value)} /><label htmlFor="password">Contraseña</label><input id="password" name="password" type="password" autoComplete="current-password" maxLength={256} required />{state.error && <p className="survey-error" role="alert">{state.error}</p>}<button className="survey-primary" disabled={pending}>{pending ? 'Entrando…' : 'Entrar al panel'}</button></form>;
}
