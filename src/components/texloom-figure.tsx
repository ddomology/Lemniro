'use client';

import {useCallback, useEffect, useId, useRef, useState} from 'react';
import type {LemniroFigureReference, LemniroFigureRuntime} from 'texloom/lemniro';

type Status = 'poster' | 'loading' | 'ready' | 'error';

/** The note supplies a validated reference, never executable markup or code.
 * Runtime SVG is produced only by the shared Texloom adapter after preparation. */
export function TexloomFigure({figure, publicBasePath}: {
  figure: LemniroFigureReference;
  publicBasePath: string;
}) {
  const reactId = useId();
  const instanceId = `lemniro-${reactId.replace(/[^a-zA-Z0-9_-]/g, character => `_${character.charCodeAt(0).toString(16)}_`)}`;
  const captionId = `${instanceId}-caption`, descriptionId = `${instanceId}-description`;
  const seekId = `${instanceId}-seek`, speedId = `${instanceId}-speed`;
  const container = useRef<HTMLElement>(null);
  const runtime = useRef<LemniroFigureRuntime | null>(null);
  const request = useRef<AbortController | null>(null);
  const generation = useRef(0), animationFrame = useRef<number | null>(null);
  const mounted = useRef(false), playingRef = useRef(false), visible = useRef(false);
  const near = useRef(false), reducedRef = useRef(false), timeRef = useRef(0), speedRef = useRef(1);
  const [enhanced, setEnhanced] = useState(false);
  const [status, setStatus] = useState<Status>('poster');
  const [svg, setSvg] = useState('');
  const [time, setTime] = useState(0), [speed, setSpeed] = useState(1);
  const [playing, setPlaying] = useState(false), [reduced, setReduced] = useState(false);
  const poster = `${publicBasePath.replace(/\/$/, '')}/${figure.posterPath}`;

  const pause = useCallback(() => {
    playingRef.current = false;
    if (animationFrame.current !== null) cancelAnimationFrame(animationFrame.current);
    animationFrame.current = null;
    if (mounted.current) setPlaying(false);
  }, []);

  const showError = useCallback(() => {
    pause();
    runtime.current?.dispose(); runtime.current = null;
    if (mounted.current) {setSvg(''); setStatus('error');}
  }, [pause]);

  const renderAt = useCallback((seconds: number) => {
    if (!runtime.current || runtime.current.state !== 'ready') return false;
    const value = Math.max(0, Math.min(figure.duration, seconds));
    try {
      const markup = runtime.current.render(value);
      timeRef.current = value;
      setSvg(markup); setTime(value);
      return true;
    } catch {showError(); return false;}
  }, [figure.duration, showError]);

  const prepare = useCallback(async () => {
    if (!mounted.current) return;
    const token = ++generation.current;
    pause(); request.current?.abort(); runtime.current?.dispose(); runtime.current = null;
    const controller = new AbortController(); request.current = controller;
    setStatus('loading'); setSvg('');
    try {
      // The substantial rendering code is deferred along with its resources.
      const {prepareLemniroFigure} = await import('texloom/lemniro');
      if (!mounted.current || token !== generation.current || controller.signal.aborted) return;
      const prepared = await prepareLemniroFigure(figure, {
        baseUrl: new URL(publicBasePath, window.location.origin),
        signal: controller.signal, instanceId,
      });
      if (!mounted.current || token !== generation.current || controller.signal.aborted) {
        prepared.dispose(); return;
      }
      runtime.current = prepared;
      if (renderAt(timeRef.current)) setStatus('ready');
    } catch {
      if (mounted.current && token === generation.current && !controller.signal.aborted) showError();
    }
  }, [figure, instanceId, pause, publicBasePath, renderAt, showError]);

  useEffect(() => {
    mounted.current = true; setEnhanced(true);
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedRef.current = media.matches; setReduced(media.matches);
    let requested = false;
    const loadNearby = () => {
      if (requested || request.current || runtime.current || !near.current || reducedRef.current || document.hidden) return;
      requested = true; void prepare();
    };
    const onMotion = () => {
      reducedRef.current = media.matches; setReduced(media.matches); pause();
      // A preference change may prepare a static frame, but never resumes play.
      if (!media.matches) loadNearby();
    };
    const onVisibility = () => {if (document.hidden) pause(); else loadNearby();};
    media.addEventListener('change', onMotion);
    document.addEventListener('visibilitychange', onVisibility);
    let lazyObserver: IntersectionObserver | undefined;
    let visibilityObserver: IntersectionObserver | undefined;
    if ('IntersectionObserver' in window && container.current) {
      lazyObserver = new IntersectionObserver(entries => {
        near.current = entries.some(entry => entry.isIntersecting); loadNearby();
      }, {rootMargin: '240px 0px'});
      visibilityObserver = new IntersectionObserver(entries => {
        visible.current = entries.some(entry => entry.isIntersecting);
        if (!visible.current) pause();
      });
      lazyObserver.observe(container.current); visibilityObserver.observe(container.current);
    } else {
      near.current = true; visible.current = true; loadNearby();
    }
    return () => {
      mounted.current = false; generation.current++; playingRef.current = false;
      if (animationFrame.current !== null) cancelAnimationFrame(animationFrame.current);
      animationFrame.current = null;
      lazyObserver?.disconnect(); visibilityObserver?.disconnect();
      media.removeEventListener('change', onMotion);
      document.removeEventListener('visibilitychange', onVisibility);
      request.current?.abort(); request.current = null;
      runtime.current?.dispose(); runtime.current = null;
    };
  }, [pause, prepare]);

  const togglePlayback = () => {
    if (playingRef.current) {pause(); return;}
    if (!runtime.current || status !== 'ready' || !visible.current || document.hidden) return;
    const start = timeRef.current >= figure.duration ? 0 : timeRef.current;
    if (!renderAt(start)) return;
    const wall = performance.now(), rate = speedRef.current;
    playingRef.current = true; setPlaying(true);
    const tick = (now: number) => {
      if (!playingRef.current || !mounted.current) return;
      if (document.hidden || !visible.current) {pause(); return;}
      const next = Math.min(figure.duration, start + (now - wall) / 1000 * rate);
      if (!renderAt(next) || next >= figure.duration) {pause(); return;}
      animationFrame.current = requestAnimationFrame(tick);
    };
    animationFrame.current = requestAnimationFrame(tick);
  };

  return <figure ref={container} className="texloom-figure" aria-labelledby={captionId}
    data-figure-id={figure.id} data-state={status} data-playing={playing} data-time={time.toFixed(3)}>
    <div className="texloom-stage" style={{aspectRatio: `${figure.width} / ${figure.height}`}}
      aria-busy={status === 'loading'}>
      {/* A real image and caption are rendered by the server, including with JS disabled. */}
      <img className={svg ? 'texloom-poster texloom-poster-covered' : 'texloom-poster'}
        src={poster} alt={figure.description} width={figure.width} height={figure.height}
        loading="lazy" decoding="async" aria-hidden={svg ? true : undefined} />
      {svg && <div className="texloom-render" role="img" aria-label={figure.description}
        dangerouslySetInnerHTML={{__html: svg}} />}
      {status === 'loading' && <span className="texloom-loading" aria-hidden="true">Loading figure…</span>}
    </div>
    <figcaption id={captionId} className="texloom-caption">
      <span className="texloom-caption-title">{figure.title}</span>
      <span id={descriptionId} className="texloom-caption-description">{figure.description}</span>
    </figcaption>
    {enhanced ? <div className="texloom-interaction">
      {status === 'ready' ? <div className="texloom-controls" role="group" aria-label={`${figure.title} playback`}>
        <button type="button" className="texloom-play" onClick={togglePlayback} aria-pressed={playing}>
          <span aria-hidden="true">{playing ? 'Ⅱ' : '▶'}</span>{playing ? 'Pause' : 'Play'}
        </button>
        <button type="button" className="texloom-reset" onClick={() => {pause(); renderAt(0);}}>Reset</button>
        <div className="texloom-seek"><label htmlFor={seekId} className="sr-only">{figure.title} time</label>
          <input id={seekId} type="range" min={0} max={figure.duration} step={0.01} value={time}
            aria-valuetext={`${time.toFixed(1)} of ${figure.duration} seconds`}
            onChange={event => {pause(); renderAt(Number(event.currentTarget.value));}} />
        </div>
        <output className="texloom-clock" htmlFor={seekId}>{time.toFixed(1)} / {figure.duration.toFixed(1)} s</output>
        <div className="texloom-speed"><label htmlFor={speedId} className="sr-only">{figure.title} playback speed</label>
          <select id={speedId} value={speed} onChange={event => {
            pause(); const value = Number(event.currentTarget.value); speedRef.current = value; setSpeed(value);
          }}>{[0.5, 1, 1.5, 2].map(value => <option key={value} value={value}>{value}×</option>)}</select>
        </div>
      </div> : <div className="texloom-load-row">
        <button type="button" disabled={status === 'loading'} onClick={() => void prepare()}>
          {status === 'error' ? 'Retry figure' : status === 'loading' ? 'Loading…' : 'Load interactive figure'}
        </button>
        <span>{status === 'error' ? 'The static preview is still available.' : 'Explore at your own pace.'}</span>
      </div>}
      <p className="texloom-status" role="status" aria-live="polite">
        {status === 'error' ? 'This figure could not load. You can try again.'
          : status === 'loading' ? 'Loading the interactive figure.'
          : reduced ? 'Reduced motion is on. Playback begins only when you press Play.'
          : status === 'ready' ? 'Use Play or move the time slider to explore.' : 'A static preview is shown.'}
      </p>
    </div> : <p className="texloom-static-note">Static preview. Interactive controls are available with JavaScript.</p>}
  </figure>;
}
