'use client';

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

export default function JoinQR() {
  const [url, setUrl] = useState('');

  useEffect(() => {
    try {
      const target = new URL(process.env.NEXT_PUBLIC_APP_URL || window.location.origin);
      if (!['https:', 'http:'].includes(target.protocol)) return;
      if (['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)) return;
      setUrl(`${target.origin}/`);
    } catch { /* An invalid deployment URL must not produce an unusable QR. */ }
  }, []);

  return <aside className="join-qr" aria-labelledby="join-qr-title">
    <span className="eyebrow">TU MÓVIL, TU PARTIDA</span>
    <h2 id="join-qr-title">Escanea y participa desde tu móvil</h2>
    {url ? <>
      <QRCodeSVG value={url} size={320} level="M" marginSize={4} title="QR para abrir el reto Cosnor" />
      <a href={url}>{url.replace(/^https?:\/\//, '').replace(/\/$/, '')}</a>
      <p>Abre la cámara, escanea el código y elige tu alias.</p>
    </> : <p>Abre la dirección pública del reto para mostrar el código de participación.</p>}
  </aside>;
}
