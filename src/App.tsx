import { useRef } from 'react';

import { APP_COPY, MONITOR_CONFIG } from './constants';
import { BlinkChart } from './components/BlinkChart';
import { useBlinkMonitor } from './hooks/useBlinkMonitor';
import type { AlertState, FaceState } from './types';

function formatRate(value: number) {
  return `${value.toFixed(1)} / min`;
}

function formatObservedWindow(observedWindowMs: number) {
  return `${Math.max(1, Math.round(observedWindowMs / 1000))}s`;
}

function formatCooldown(ms: number) {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) {
    return `${seconds}s`;
  }

  return `${minutes}m ${seconds}s`;
}

function formatLastBlink(lastBlinkAt: number | null) {
  if (lastBlinkAt === null) {
    return 'No blink captured yet';
  }

  const secondsAgo = Math.max(0, Math.round((performance.now() - lastBlinkAt) / 1000));

  if (secondsAgo < 1) {
    return 'Blink captured just now';
  }

  return `Last blink ${secondsAgo}s ago`;
}

function getFaceLabel(faceState: FaceState) {
  switch (faceState) {
    case 'detected':
      return 'Face detected';
    case 'not_found':
      return 'Face missing';
    default:
      return 'Searching for face';
  }
}

function getAlertCopy(alertState: AlertState, cooldownRemainingMs: number) {
  switch (alertState) {
    case 'low':
      return {
        title: 'Blink rate is running low',
        body: 'Pause for a second, blink deliberately a few times, and reset your eyes before dryness builds up.',
      };
    case 'cooldown':
      return {
        title: 'Cooling down after the last reminder',
        body: `Tracking quietly for another ${formatCooldown(cooldownRemainingMs)} before the next reminder can fire.`,
      };
    default:
      return {
        title: 'Monitoring for steady blinking',
        body: 'Keep the preview framed around your eyes. The app watches the last minute and nudges when the rate stays too low.',
      };
  }
}

export default function App() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const monitor = useBlinkMonitor(videoRef);
  const alertCopy = getAlertCopy(monitor.alertState, monitor.metrics.cooldownRemainingMs);
  const statusLabel = monitor.error
    ? 'Camera issue'
    : monitor.isMonitoring
      ? 'Detection active'
      : 'Starting';

  return (
    <main className="shell" data-alert={monitor.alertState}>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">{APP_COPY.eyebrow}</p>
          <h1>{APP_COPY.title}</h1>
          <p className="summary">{APP_COPY.summary}</p>
          <p className="privacy-note">{APP_COPY.privacy}</p>
        </div>

        <div className="alert-panel">
          <div className="alert-chip">
            <span className="alert-chip__dot" />
            <span>{getFaceLabel(monitor.faceState)}</span>
          </div>
          <h2>{alertCopy.title}</h2>
          <p>{alertCopy.body}</p>
          <dl className="config-grid">
            <div>
              <dt>Window</dt>
              <dd>{MONITOR_CONFIG.blinkWindowMs / 1000}s</dd>
            </div>
            <div>
              <dt>Alert threshold</dt>
              <dd>{MONITOR_CONFIG.alertThresholdPerMinute} blinks/min</dd>
            </div>
            <div>
              <dt>Warm-up</dt>
              <dd>{MONITOR_CONFIG.alertWarmupMs / 1000}s</dd>
            </div>
            <div>
              <dt>Cooldown</dt>
              <dd>{MONITOR_CONFIG.alertCooldownMs / 1000}s</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="workspace">
        <article className="preview-card">
          <div className="preview-card__header">
            <div>
              <p className="section-label">Camera preview</p>
              <h3>Live blink tracking</h3>
            </div>
            <span className={`status-pill status-pill--${monitor.alertState}`}>
              {statusLabel}
            </span>
          </div>

          <div className="preview-frame">
            <video ref={videoRef} autoPlay muted playsInline />
            <div className="preview-overlay">
              <div className="preview-overlay__badge">{getFaceLabel(monitor.faceState)}</div>
              <p>{formatLastBlink(monitor.metrics.lastBlinkAt)}</p>
            </div>
          </div>

          {monitor.error ? (
            <div className="error-banner" role="alert">
              <strong>Camera setup needs attention.</strong>
              <p>{monitor.error.message}</p>
              <button type="button" onClick={monitor.retry}>
                Try again
              </button>
            </div>
          ) : null}
        </article>

        <article className="metrics-card">
          <p className="section-label">Live metrics</p>
          <div className="metric-grid">
            <div className="metric-block">
              <span>Recent blink rate</span>
              <strong>{formatRate(monitor.metrics.blinkRatePerMinute)}</strong>
            </div>
            <div className="metric-block">
              <span>Blinks in 10s</span>
              <strong>{monitor.metrics.blinkCount10s}</strong>
            </div>
            <div className="metric-block">
              <span>Blinks in window</span>
              <strong>{monitor.metrics.blinkCountWindow}</strong>
            </div>
            <div className="metric-block">
              <span>Observation window</span>
              <strong>{formatObservedWindow(monitor.metrics.observedWindowMs)}</strong>
            </div>
            <div className="metric-block">
              <span>Reminder count</span>
              <strong>{monitor.metrics.alertCount}</strong>
            </div>
          </div>

          <div className="secondary-grid">
            <div>
              <p className="section-label">Eye aspect ratio</p>
              <strong className="secondary-value">
                {monitor.metrics.averageEar === null
                  ? 'Waiting for face'
                  : monitor.metrics.averageEar.toFixed(3)}
              </strong>
            </div>
            <div>
              <p className="section-label">Reminder cooldown</p>
              <strong className="secondary-value">
                {monitor.metrics.cooldownRemainingMs > 0
                  ? formatCooldown(monitor.metrics.cooldownRemainingMs)
                  : 'Ready'}
              </strong>
            </div>
          </div>

          <div className="chart-container">
            <p className="section-label">Blink history (last 10 min)</p>
            <BlinkChart data={monitor.metrics.blinkHistory} />
          </div>
        </article>
      </section>
    </main>
  );
}
