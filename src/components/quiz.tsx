'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import { ArrowRight, ArrowLeft, Trophy, ArrowUpRight, X, Check, ShieldCheck, Flag, House, CircleHelp, Users, LoaderCircle, RotateCw, ChevronRight, Sparkles, CheckCircle2, Circle, Target, Medal } from 'lucide-react';
import { nextStep, startGame, submitAnswer } from '@/app/actions';
import { BRAND, ROUNDS } from '@/lib/config';
import type { ActionResult, GameView, Ranking } from '@/lib/types';

type Screen = 'home' | 'alias' | 'game' | 'ranking';
const format = (value: number) => new Intl.NumberFormat('es-ES').format(value);
function Ball({ size = 24 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="12" cy="12" r="9.5"/><path d="m12 7 4.8 3.5-1.8 5.6H9l-1.8-5.6L12 7ZM12 7V2.5m4.8 8 4.3-1.4M15 16.1l2.7 3.8M9 16.1l-2.7 3.8m.9-9.4L3 9.1"/></svg>;
}
function RoundIcon({ round, size = 24 }: { round: number; size?: number }) {
  return round === 1 ? <House size={size}/> : round === 2 ? <Ball size={size}/> : round === 3 ? <ShieldCheck size={size}/> : <Flag size={size}/>;
}

export default function Quiz() {
  const [screen, setScreen] = useState<Screen>('home');
  const [game, setGame] = useState<GameView | null>(null);
  const [ready, setReady] = useState(false);
  const [sessionError, setSessionError] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [alias, setAlias] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [ranking, setRanking] = useState<Ranking | null>(null);
  const [rankingError, setRankingError] = useState('');
  const [rankingLoading, setRankingLoading] = useState(false);
  const rules = useRef<HTMLDialogElement>(null);
  const focusHeading = useCallback((node: HTMLHeadingElement | null) => {
    node?.focus({ preventScroll: true });
  }, []);

  const loadSession = useCallback(async () => {
    setSessionError('');
    try {
      const response = await fetch('/api/session', { cache: 'no-store' });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setGame(data.game);
      if (data.game) setScreen('game');
      setReady(true);
    } catch { setSessionError('No hemos podido recuperar tu partida. Comprueba tu conexión.'); }
  }, []);
  useEffect(() => { void loadSession(); }, [loadSession]);

  const loadRanking = useCallback(async () => {
    setRankingLoading(true);
    try {
      const response = await fetch('/api/leaderboard', { cache: 'no-store' });
      if (!response.ok) throw new Error();
      setRanking(await response.json()); setRankingError('');
    } catch { setRankingError('No se ha podido actualizar la clasificación.'); }
    finally { setRankingLoading(false); }
  }, []);
  useEffect(() => {
    if (screen !== 'ranking' && !(screen === 'game' && game?.stage === 'result')) return;
    void loadRanking();
    const interval = setInterval(() => { if (!document.hidden) void loadRanking(); }, 15000);
    return () => clearInterval(interval);
  }, [screen, game?.stage, loadRanking]);

  useEffect(() => {
    setSelected(null); setError('');
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [screen, game?.revision]);

  async function run(action: () => Promise<ActionResult>) {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setError('');
    try {
      const result = await action();
      if (!result.ok) { setError(result.error); return; }
      setGame(result.game); setScreen('game');
    } catch { setError('No hay conexión. Vuelve a intentarlo para guardar tu respuesta.'); }
    finally { busyRef.current = false; setBusy(false); }
  }
  function go(screen: Screen) { if (!busy) setScreen(screen); }
  const activeRound = ROUNDS[(game?.round ?? 1) - 1];
  const inGame = screen === 'game' && game && game.stage !== 'result';

  return <MotionConfig reducedMotion="user">
    <div className="app-shell">
      <a className="skip-link" href="#main">Saltar al contenido</a>
      <header className={`header${inGame ? ' playing' : ''}`}>
        <button className="brand" aria-label="Cosnor, ir al inicio" onClick={() => go('home')} disabled={busy}>
          <Image src="/cosnor-logo.webp" alt="" width={57} height={40} priority/><span><strong>cosnor<span className="brand-dot">.</span></strong><small>{BRAND.subtitle}</small></span>
        </button>
        <span className="header-divider"/><span className="header-title">EL RETO</span>
        <nav aria-label="Navegación principal">
          {inGame && <span className="header-score"><Sparkles size={15}/>{format(game.score)} <small>pts</small></span>}
          <button className={`nav-link ${screen === 'ranking' ? 'active' : ''}`} onClick={() => go('ranking')} disabled={busy}><Trophy size={17}/><span>Clasificación</span><ArrowUpRight size={14}/></button>
          <button className="help-button" onClick={() => rules.current?.showModal()} aria-label="Cómo se juega"><CircleHelp size={21}/></button>
        </nav>
      </header>

      <main id="main" className={screen === 'home' ? 'home-main' : 'play-main'}>
        <AnimatePresence mode="wait" initial={false}>
          {screen === 'home' && <motion.div key="home" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: .22 }}>
            <section className="hero">
              <div className="hero-copy">
                <div className="edition"><span className="live-dot"/> COSNOR × DÉPOR <span className="edition-rule"/> UN RETO MUY NUESTRO</div>
                <h1>Aquí se juega<br/>con <span className="history-word">historia<svg viewBox="0 0 420 22" preserveAspectRatio="none" aria-hidden="true"><path d="M4 14C105 1 270 3 412 12M60 20C172 9 290 10 373 15"/></svg></span><span className="plum-dot">.</span></h1>
                <p className="hero-description">Lo que nos une, lo que nos protege y lo que nos hace vibrar. ¿Cuánto sabes de Cosnor y del Dépor?</p>
                <div className="hero-facts"><span><CircleHelp size={17}/><b>24</b> preguntas</span><i/><span><Flag size={17}/><b>4</b> rondas</span><i/><span>A tu ritmo</span></div>
                <button className="button primary hero-cta" disabled={!ready} onClick={() => go(game ? 'game' : 'alias')}>{!ready ? <><LoaderCircle className="spin" size={18}/>Preparando el reto</> : <>{game ? game.stage === 'result' ? 'Ver mi resultado' : 'Continuar mi partida' : 'Acepto el reto'}<ArrowRight size={21}/></>}</button>
                {sessionError && <div className="error-message" role="alert">{sessionError}<button onClick={() => void loadSession()} className="text-button">Reintentar</button></div>}
                <p className="cta-caption"><ShieldCheck size={14}/>Solo necesitas un alias y ganas de jugar.</p>
              </div>
              <div className="hero-art" aria-hidden="true">
                <div className="art-topline"><span>EL RETO COSNOR</span><span>EDICIÓN BLANQUIAZUL ↗</span></div>
                <div className="pitch"><div className="pitch-outline"><div className="half-line"/><div className="center-circle"/><div className="goal top"/><div className="goal bottom"/></div></div>
                <div className="art-ring ring-one"/><div className="art-ring ring-two"/>
                <div className="floating-label"><span className="tiny-star">✳</span> Lo nuestro tiene historia.</div>
                <div className="hero-ticket"><div className="ticket-top"><span>TU PASE AL RETO</span><ArrowUpRight size={20}/></div><div className="ticket-title">¿JUGAMOS<span>?</span></div><div className="ticket-mid"><span>COSNOR<br/><b>× DÉPOR</b></span><Ball size={61}/></div><div className="ticket-perforation"/><div className="ticket-bottom"><div><b>24</b><small>PREGUNTAS</small></div><div><b>04</b><small>RONDAS</small></div><div className="barcode"/></div></div>
                <div className="trophy-sticker"><Trophy size={35} strokeWidth={1.6}/><span>JUEGA.<br/>SUMA.<br/>SUPÉRATE.</span></div>
                <div className="art-bottomline"><span>UNA HISTORIA COMPARTIDA.</span><span>MUCHO POR DEMOSTRAR.</span></div>
              </div>
            </section>
            <section className="rounds-section" aria-labelledby="rounds-title">
              <div className="section-heading"><div><span className="eyebrow">EL RECORRIDO</span><h2 id="rounds-title">Cuatro rondas. Todo por jugar.</h2></div><span className="section-note">Cada acierto suma <b>100 puntos</b><ArrowUpRight size={18}/></span></div>
              <div className="round-grid">{ROUNDS.map(round => <div className="round-card" key={round.number}><div className="round-card-top"><span className="round-icon"><RoundIcon round={round.number}/></span><span className="round-number">0{round.number}</span></div><h3>{round.title}</h3><p>{round.short}</p><span className="round-bottom">6 preguntas<ChevronRight size={16}/></span></div>)}</div>
            </section>
          </motion.div>}

          {screen === 'alias' && <motion.section className="center-stage" key="alias" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <button className="back-link" onClick={() => go('home')} disabled={busy}><ArrowLeft size={16}/>Volver al inicio</button>
            <div className="form-card"><span className="large-icon"><Users size={30}/></span><p className="eyebrow">ANTES DEL PITIDO INICIAL</p><h1 ref={focusHeading} tabIndex={-1}>¿Cómo te llamamos?</h1><p>Elige el alias con el que quieres aparecer en la clasificación. El reto empieza contigo.</p>
              <form onSubmit={event => { event.preventDefault(); void run(() => startGame(alias)); }}>
                <label htmlFor="alias">Tu alias</label><input id="alias" name="alias" placeholder="Ej. Coruñés90" value={alias} onChange={e => setAlias(e.target.value)} minLength={2} maxLength={20} required autoComplete="nickname" disabled={busy} aria-describedby="alias-hint"/>
                <small id="alias-hint">Entre 2 y 20 caracteres. Tu alias será público.</small>
                <div className="mini-rules"><span><Check size={16}/>100 puntos por acierto</span><span><Check size={16}/>Sin penalización por fallar</span><span><Check size={16}/>Sin cuenta atrás</span></div>
                {error && <p className="error-message" role="alert">{error}</p>}
                <button className="button primary full-width" type="submit" disabled={busy || alias.trim().length < 2}>{busy ? <LoaderCircle className="spin" size={19}/> : <>Entrar al campo<ArrowRight size={20}/></>}</button>
              </form><p className="small-note">Guardamos tu partida en este navegador para que puedas continuar si sales.</p>
            </div>
          </motion.section>}

          {screen === 'game' && game && game.stage !== 'result' && <motion.section key="game" className="game-layout" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <aside className="game-sidebar"><span className="eyebrow">TU RECORRIDO</span><h2>Vamos, {game.alias}<span className="plum-dot">.</span></h2><p>Cada pregunta cuenta.<br/>Cada acierto suma.</p><ol className="round-stepper">{ROUNDS.map(round => <li key={round.number} className={round.number === game.round ? 'current' : round.number < game.round ? 'complete' : ''}><span className="step-icon">{round.number < game.round ? <Check size={19}/> : <RoundIcon round={round.number} size={19}/>}</span><div><small>RONDA 0{round.number}</small><strong>{round.title}</strong></div>{round.number === game.round && <span className="step-dot"/>}</li>)}</ol><div className="sidebar-score"><Sparkles size={21}/><span><b>{format(game.score)}</b> puntos<small>De 2.400 posibles</small></span></div><p className="save-note"><ShieldCheck size={14}/>Tu progreso se guarda automáticamente.</p></aside>
            <div className="question-area">
              <div className="game-progress-label"><span>RONDA 0{game.round} / 04</span><span>{game.index + (game.stage === 'feedback' ? 1 : 0)} de {game.total} respondidas</span></div><div className="progress-track" role="progressbar" aria-label="Preguntas respondidas" aria-valuenow={game.index + (game.stage === 'feedback' ? 1 : 0)} aria-valuemin={0} aria-valuemax={game.total}><motion.div animate={{ width: `${(game.index + (game.stage === 'feedback' ? 1 : 0)) / game.total * 100}%` }} transition={{ duration: .4 }}/></div>
              <AnimatePresence mode="wait" initial={false}>
                {game.stage === 'intro' ? <motion.div className="round-intro" key={`intro-${game.round}`} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}><div className="intro-art"><span className="intro-number">0{game.round}</span><span className="intro-icon"><RoundIcon round={game.round} size={65}/></span><span className="intro-star">✳</span></div><span className="eyebrow">{activeRound.label}</span><h1 ref={focusHeading} tabIndex={-1}>{activeRound.title}</h1><p>{activeRound.description}</p><div className="intro-stats"><span>6 preguntas</span><Circle size={4} fill="currentColor"/><span>600 puntos en juego</span></div>{error && <p className="error-message" role="alert">{error}</p>}<button className="button primary" disabled={busy} onClick={() => void run(() => nextStep(game.revision))}>{busy ? <LoaderCircle className="spin" size={19}/> : <>Empezar ronda {game.round}<ArrowRight size={20}/></>}</button></motion.div> : <motion.div className="question-card" key={`question-${game.index}`} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: .2 }}>
                  <div className="question-meta"><span className="question-tag"><RoundIcon round={game.round} size={15}/>{activeRound.title}</span><span className="question-value">+100 pts</span></div><p className="eyebrow question-number">PREGUNTA {String(game.index + 1).padStart(2, '0')} <span>/ {game.total}</span></p><h1 ref={focusHeading} tabIndex={-1}>{game.question?.text}</h1>
                  <div className="answers" role="group" aria-label="Opciones de respuesta">{game.question?.options.map((option, index) => {
                    const feedback = game.feedback;
                    const correct = feedback?.correct === option.id;
                    const wrong = !!feedback && feedback.selected === option.id && !correct;
                    const chosen = selected === option.id;
                    return <button key={option.id} className={`answer ${chosen && !feedback ? 'selected' : ''} ${correct ? 'correct' : ''} ${wrong ? 'wrong' : ''}`} disabled={busy || !!feedback} aria-pressed={feedback ? feedback.selected === option.id : chosen} onClick={() => setSelected(option.id)}><span className="answer-letter">{String.fromCharCode(65 + index)}</span><span>{option.text}</span>{correct ? <CheckCircle2 size={22}/> : wrong ? <X size={22}/> : <span className="answer-radio">{chosen && <span/>}</span>}{correct && <span className="sr-only">Respuesta correcta</span>}{wrong && <span className="sr-only">Tu respuesta, incorrecta</span>}</button>;
                  })}</div>
                  {game.feedback && <motion.div className={`feedback ${game.feedback.isCorrect ? 'success' : 'miss'}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} role="status"><span className="feedback-icon">{game.feedback.isCorrect ? <Check size={23}/> : <Target size={23}/>}</span><div><strong>{game.feedback.isCorrect ? '¡Esa era! 100 puntos más.' : 'Esta se nos ha escapado.'}</strong><p>{game.feedback.isCorrect ? 'Seguimos sumando historia.' : 'La respuesta correcta está marcada en verde. ¡Seguimos!'}</p></div></motion.div>}
                  {error && <p className="error-message" role="alert">{error}</p>}
                  <div className="question-actions"><span>{game.feedback ? `${game.correctCount} ${game.correctCount === 1 ? 'acierto' : 'aciertos'} hasta ahora` : 'Elige una respuesta y confírmala.'}</span><button className="button primary" disabled={busy || (!game.feedback && !selected)} onClick={() => game.feedback ? void run(() => nextStep(game.revision)) : selected && game.question && void run(() => submitAnswer(game.revision, game.question!.id, selected))}>{busy ? <LoaderCircle className="spin" size={18}/> : <>{game.feedback ? game.index === game.total - 1 ? 'Ver mi resultado' : (game.index + 1) % 6 === 0 ? 'Siguiente ronda' : 'Siguiente pregunta' : 'Confirmar respuesta'}<ArrowRight size={19}/></>}</button></div>
                </motion.div>}
              </AnimatePresence>
            </div>
          </motion.section>}

          {screen === 'game' && game?.stage === 'result' && <motion.section key="result" className="result-layout" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}><div className="result-card"><div className="result-trophy"><Trophy size={51}/><span className="trophy-spark one">✳</span><span className="trophy-spark two">✧</span></div><p className="eyebrow">RETO COMPLETADO</p><h1 ref={focusHeading} tabIndex={-1}>{game.correctCount >= 18 ? '¡Tienes mucha historia!' : game.correctCount >= 10 ? '¡Bien jugado!' : '¡Gracias por darlo todo!'}</h1><p>{game.alias}, ya formas parte de este reto.</p><div className="final-score"><motion.strong initial={{ scale: .85 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}>{format(game.score)}</motion.strong><span>PUNTOS DE 2.400</span></div><div className="result-metrics"><span><CheckCircle2 size={20}/><b>{game.correctCount} / {game.total}</b><small>Aciertos</small></span><span><Medal size={20}/><b>{ranking?.own ? `#${ranking.own.rank}` : '—'}</b><small>Tu posición</small></span></div><button className="button primary full-width" onClick={() => go('ranking')}>Ver la clasificación<Trophy size={19}/></button><p className="small-note">Tu resultado ya está guardado. ¡Gracias por jugar!</p></div><div className="result-side"><span className="eyebrow">LA HISTORIA LA HACEMOS JUNTOS</span><h2>La mejor parte <br/>es compartir <br/><span>equipo.</span></h2><p>Cosnor, el Dépor y tú.<br/>Una pasión que nos une más allá del juego.</p><div className="result-pitch"><Ball size={72}/><span>COSNOR × DÉPOR</span></div><button className="text-button" onClick={() => go('home')}>Volver al inicio<ArrowUpRight size={17}/></button>{rankingError && <p className="error-message" role="alert">{rankingError}<button className="text-button" onClick={() => void loadRanking()}>Reintentar</button></p>}</div></motion.section>}

          {screen === 'ranking' && <motion.section key="ranking" className="ranking-layout" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}><button className="back-link" onClick={() => go(game ? 'game' : 'home')}><ArrowLeft size={16}/>{game ? 'Volver a mi partida' : 'Volver al inicio'}</button><div className="ranking-heading"><div><span className="eyebrow">EL MARCADOR DE LOS NUESTROS</span><h1 ref={focusHeading} tabIndex={-1}>Aquí está el equipo.</h1><p>Cada acierto cuenta. ¿Dónde está tu nombre?</p></div><span className="ranking-trophy"><Trophy size={39}/></span></div><div className="ranking-bar"><span><Users size={17}/>{ranking ? `${ranking.total} ${ranking.total === 1 ? 'participante' : 'participantes'}` : 'Cargando participantes…'}</span><button className="text-button" onClick={() => void loadRanking()} disabled={rankingLoading}><RotateCw size={15} className={rankingLoading ? 'spin' : ''}/>Actualizar</button></div>{rankingError && <p className="error-message" role="alert">{rankingError}<button className="text-button" onClick={() => void loadRanking()}>Reintentar</button></p>}
            {!ranking && !rankingError ? <div className="empty-ranking" role="status"><LoaderCircle className="spin" size={30}/><p>Preparando el marcador…</p></div> : ranking?.entries.length === 0 ? <div className="empty-ranking"><Flag size={43}/><h2>El primer puesto está esperando.</h2><p>Completa las cuatro rondas y estrena la clasificación.</p><button className="button primary" disabled={!ready} onClick={() => go(game ? 'game' : 'alias')}>{game ? 'Continuar mi partida' : 'Acepto el reto'}<ArrowRight size={19}/></button></div> : ranking && <><div className="ranking-table-wrap"><table className="ranking-table"><caption className="sr-only">Clasificación general del reto Cosnor</caption><thead><tr><th scope="col">POSICIÓN</th><th scope="col">PARTICIPANTE</th><th scope="col">PUNTOS</th></tr></thead><tbody>{ranking.entries.map(entry => <tr key={entry.publicId} className={entry.publicId === game?.publicId ? 'own-row' : ''}><td><span className={`rank-number rank-${entry.rank}`}>{entry.rank <= 3 ? <Medal size={17}/> : null}{entry.rank}</span></td><td><span className="avatar">{entry.alias.slice(0, 1).toUpperCase()}</span><strong>{entry.alias}</strong>{entry.publicId === game?.publicId && <span className="you-tag">TÚ</span>}</td><td>{format(entry.score)} <small>pts</small></td></tr>)}</tbody></table></div>{ranking.own && !ranking.entries.some(e => e.publicId === ranking.own!.publicId) && <div className="own-summary"><span>#{ranking.own.rank} · {ranking.own.alias} <b>TÚ</b></span><strong>{format(ranking.own.score)} pts</strong></div>}<div className="ranking-footnote"><span><ShieldCheck size={15}/>Resultados guardados al completar el reto.</span><span>Iguales puntos, misma posición.</span></div></>}
          </motion.section>}
        </AnimatePresence>
      </main>

      <footer className="footer">
        <span><b>cosnor.</b> Personas a tu servicio.</span>
        <button onClick={() => rules.current?.showModal()}>Cómo se juega<ArrowUpRight size={13}/></button>
        <p className="footer-credit">Desarrollado por el equipo de desarrollo de{' '}
          <a href="https://www.blancoyenbata.com" target="_blank" rel="noopener noreferrer">www.blancoyenbata.com<span className="sr-only"> (se abre en una pestaña nueva)</span><ArrowUpRight size={13} aria-hidden="true"/></a>
        </p>
      </footer>
      <dialog ref={rules} className="rules-dialog" onClick={event => { if (event.target === event.currentTarget) rules.current?.close(); }} aria-labelledby="rules-title"><div className="rules-content"><button className="close-dialog" aria-label="Cerrar reglas" onClick={() => rules.current?.close()}><X size={22}/></button><span className="large-icon"><Flag size={27}/></span><p className="eyebrow">LAS REGLAS DEL JUEGO</p><h2 id="rules-title">Un reto. Cero complicaciones.</h2><ol className="rules-list"><li><span>01</span><div><strong>Elige tu alias</strong><p>Será el nombre público que aparecerá en el marcador.</p></div></li><li><span>02</span><div><strong>Juega las cuatro rondas</strong><p>24 preguntas, cuatro opciones y una respuesta correcta. Sin límite de tiempo.</p></div></li><li><span>03</span><div><strong>Suma puntos</strong><p>100 por acierto. Fallar no resta. Confirma tu respuesta para pasar a la siguiente.</p></div></li><li><span>04</span><div><strong>Encuentra tu puesto</strong><p>Al terminar guardamos tu resultado. Los empates comparten posición.</p></div></li></ol><p className="small-note">Este navegador conserva una partida durante 30 días. El alias no verifica la identidad del participante.</p><button className="button primary full-width" onClick={() => rules.current?.close()}>¡Entendido!<Check size={18}/></button></div></dialog>
    </div>
  </MotionConfig>;
}
