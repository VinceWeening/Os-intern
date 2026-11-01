'use client';
import { useEffect, useState } from 'react';

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export function InstallApp() {
  const [prompt, setPrompt] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  useEffect(() => {
    setInstalled(window.matchMedia('(display-mode: standalone)').matches);
    const offer = (event: Event) => { event.preventDefault(); setPrompt(event as InstallEvent); };
    const done = () => { setInstalled(true); setPrompt(null); };
    window.addEventListener('beforeinstallprompt', offer);
    window.addEventListener('appinstalled', done);
    return () => { window.removeEventListener('beforeinstallprompt', offer); window.removeEventListener('appinstalled', done); };
  }, []);
  return <section className="panel install-panel"><span className="eyebrow">OP JE BEGINSCHERM</span><h2>Je werkplek, als app.</h2>
    <p>{installed ? 'Je gebruikt OS Werkplek al in een eigen appvenster.' : 'Open OS Werkplek direct vanaf je beginscherm, in een eigen venster zonder adresbalk.'}</p>
    {!installed && prompt ? <button className="button secondary" onClick={async () => { await prompt.prompt(); setPrompt(null); }}>App installeren <span>↗</span></button> : null}
    {!installed ? <p className="form-help">iPhone of iPad: open in Safari → Delen → Zet op beginscherm. Op desktop: gebruik het installatiepictogram in Edge of Chrome.</p> : null}
  </section>;
}
