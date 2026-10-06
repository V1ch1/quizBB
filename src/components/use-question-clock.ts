'use client';

import { useEffect, useRef, useState } from 'react';
import type { GameView } from '@/lib/types';
import { QUESTION_SECONDS } from '@/lib/config';

export function useQuestionClock(game: GameView | null, onExpire: () => void) {
  const [remaining, setRemaining] = useState(QUESTION_SECONDS);
  const handler = useRef(onExpire);
  useEffect(() => { handler.current = onExpire; }, [onExpire]);

  useEffect(() => {
    if (game?.stage !== 'question' || !game.questionDeadline) {
      setRemaining(QUESTION_SECONDS);
      return;
    }
    // Use the server's clock as the baseline, not the user's wall clock.
    const duration = Math.max(0, game.questionDeadline - game.serverNow);
    const monotonicStart = performance.now();
    const wallStart = Date.now();
    let nextAttempt = 0;
    const tick = () => {
      // Wall-clock elapsed also catches sleep on platforms that pause performance.now().
      const elapsed = Math.max(performance.now() - monotonicStart, Date.now() - wallStart);
      const ms = Math.max(0, duration - elapsed);
      setRemaining(Math.min(QUESTION_SECONDS, Math.ceil(ms / 1000)));
      if (ms === 0 && performance.now() >= nextAttempt) {
        nextAttempt = performance.now() + 3000;
        handler.current();
      }
    };
    tick();
    const interval = setInterval(tick, 200);
    document.addEventListener('visibilitychange', tick);
    window.addEventListener('online', tick);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', tick);
      window.removeEventListener('online', tick);
    };
  }, [game?.stage, game?.questionDeadline, game?.serverNow]);
  return remaining;
}
