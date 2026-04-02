export const MONITOR_CONFIG = {
  cameraConstraints: {
    audio: false,
    video: {
      facingMode: 'user',
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
  },
  frameIntervalMs: 80,
  uiCommitIntervalMs: 200,
  blinkWindowMs: 60_000,
  alertThresholdPerMinute: 5,
  alertWarmupMs: 20_000,
  alertCooldownMs: 60_000,
  faceLostGraceMs: 1_200,
  blinkClosedThreshold: 0.215,
  blinkOpenThreshold: 0.255,
  minBlinkDurationMs: 45,
  maxBlinkDurationMs: 420,
  minBlinkGapMs: 120,
  historyWindowMs: 600_000,
  historySampleIntervalMs: 10_000,
} as const;

export const APP_COPY = {
  eyebrow: 'Local-only blink monitor',
  title: 'Look-Me',
  summary:
    'Watch blink frequency in real time, then nudge the user when their recent blink rate drops too low.',
  privacy:
    'Video stays in the browser. Frames are processed in memory and are never uploaded or stored.',
} as const;
