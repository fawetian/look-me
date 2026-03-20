import { useEffect, useState, type RefObject } from 'react';

import { MONITOR_CONFIG } from '../constants';
import { calculateEyeAspectRatio, computeBlinkRate } from '../lib/blink';
import { createFaceLandmarker } from '../lib/faceLandmarker';
import type {
  AlertState,
  FaceState,
  MonitorError,
  MonitorErrorCode,
  MonitorSnapshot,
} from '../types';

function createInitialSnapshot(): MonitorSnapshot {
  return {
    permissionState: 'idle',
    cameraState: 'idle',
    faceState: 'searching',
    alertState: 'normal',
    isMonitoring: false,
    error: null,
    metrics: {
      blinkCountWindow: 0,
      blinkRatePerMinute: 0,
      averageEar: null,
      lastBlinkAt: null,
      alertCount: 0,
      cooldownRemainingMs: 0,
      observedWindowMs: 0,
    },
  };
}

function createMonitorError(code: MonitorErrorCode, message: string): MonitorError {
  return { code, message };
}

function normaliseError(error: unknown) {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError') {
      return createMonitorError(
        'permission_denied',
        'Camera access was denied. Allow webcam access to keep monitoring blink frequency.',
      );
    }

    if (error.name === 'NotFoundError' || error.name === 'NotReadableError') {
      return createMonitorError(
        'camera_unavailable',
        'No usable camera was found, or it is already in use by another app.',
      );
    }
  }

  if (error instanceof Error && error.message.startsWith('MODEL_LOAD_FAILED')) {
    return createMonitorError(
      'model_load_failed',
      'Blink detection could not start because the face model failed to load.',
    );
  }

  return createMonitorError(
    'unknown',
    'The monitor could not start. Try refreshing the page and granting camera access again.',
  );
}

export function useBlinkMonitor(videoRef: RefObject<HTMLVideoElement | null>) {
  const [sessionKey, setSessionKey] = useState(0);
  const [snapshot, setSnapshot] = useState<MonitorSnapshot>(createInitialSnapshot);

  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | null = null;
    let landmarker: Awaited<ReturnType<typeof createFaceLandmarker>> | null = null;
    let frameId = 0;
    let lastProcessedAt = 0;
    let lastUiCommitAt = 0;
    let closedStartedAt: number | null = null;
    let lastBlinkAt: number | null = null;
    let lastAlertAt: number | null = null;
    let alertCount = 0;
    let averageEar: number | null = null;
    let faceState: FaceState = 'searching';
    let alertState: AlertState = 'normal';
    let blinkTimestamps: number[] = [];
    let lastFaceSeenAt: number | null = null;
    const startedAt = performance.now();

    setSnapshot({
      ...createInitialSnapshot(),
      permissionState: 'requesting',
      cameraState: 'starting',
    });

    const cleanup = async () => {
      cancelAnimationFrame(frameId);

      if (landmarker) {
        landmarker.close();
        landmarker = null;
      }

      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      const video = videoRef.current;

      if (video) {
        video.pause();
        video.srcObject = null;
      }
    };

    const commit = (now: number, force = false) => {
      if (!force && now - lastUiCommitAt < MONITOR_CONFIG.uiCommitIntervalMs) {
        return;
      }

      lastUiCommitAt = now;

      const observedWindowMs = Math.min(now - startedAt, MONITOR_CONFIG.blinkWindowMs);
      const blinkCountWindow = blinkTimestamps.length;
      const blinkRatePerMinute = computeBlinkRate(blinkCountWindow, observedWindowMs);
      const cooldownRemainingMs =
        lastAlertAt === null
          ? 0
          : Math.max(0, MONITOR_CONFIG.alertCooldownMs - (now - lastAlertAt));

      const warmupComplete = now - startedAt >= MONITOR_CONFIG.alertWarmupMs;
      const faceDetected = faceState === 'detected';
      const lowRate = warmupComplete && faceDetected && blinkRatePerMinute < MONITOR_CONFIG.alertThresholdPerMinute;

      if (lowRate && (lastAlertAt === null || cooldownRemainingMs === 0)) {
        lastAlertAt = now;
        alertCount += 1;
      }

      const nextCooldownRemainingMs =
        lastAlertAt === null
          ? 0
          : Math.max(0, MONITOR_CONFIG.alertCooldownMs - (now - lastAlertAt));

      if (lowRate) {
        alertState = 'low';
      } else if (nextCooldownRemainingMs > 0) {
        alertState = 'cooldown';
      } else {
        alertState = 'normal';
      }

      setSnapshot({
        permissionState: 'granted',
        cameraState: 'ready',
        faceState,
        alertState,
        isMonitoring: true,
        error: null,
        metrics: {
          blinkCountWindow,
          blinkRatePerMinute,
          averageEar,
          lastBlinkAt,
          alertCount,
          cooldownRemainingMs: nextCooldownRemainingMs,
          observedWindowMs,
        },
      });
    };

    const pruneBlinkWindow = (now: number) => {
      blinkTimestamps = blinkTimestamps.filter((timestamp) => now - timestamp <= MONITOR_CONFIG.blinkWindowMs);
    };

    const boot = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw createMonitorError(
            'camera_unavailable',
            'This browser cannot access webcams through getUserMedia.',
          );
        }

        stream = await navigator.mediaDevices.getUserMedia(MONITOR_CONFIG.cameraConstraints);

        if (cancelled) {
          await cleanup();
          return;
        }

        const video = videoRef.current;

        if (!video) {
          return;
        }

        video.srcObject = stream;

        await new Promise<void>((resolve, reject) => {
          const onLoadedMetadata = () => {
            video.removeEventListener('error', onError);
            resolve();
          };

          const onError = () => {
            video.removeEventListener('loadedmetadata', onLoadedMetadata);
            reject(new Error('VIDEO_METADATA_FAILED'));
          };

          video.addEventListener('loadedmetadata', onLoadedMetadata, { once: true });
          video.addEventListener('error', onError, { once: true });
        });

        await video.play();

        if (cancelled) {
          await cleanup();
          return;
        }

        landmarker = await createFaceLandmarker().catch(() => {
          throw new Error('MODEL_LOAD_FAILED');
        });

        const detect = () => {
          if (cancelled) {
            return;
          }

          const currentLandmarker = landmarker;

          if (!currentLandmarker) {
            return;
          }

          frameId = requestAnimationFrame(detect);

          const now = performance.now();
          pruneBlinkWindow(now);

          if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
            commit(now);
            return;
          }

          if (now - lastProcessedAt < MONITOR_CONFIG.frameIntervalMs) {
            commit(now);
            return;
          }

          lastProcessedAt = now;

          const result = currentLandmarker.detectForVideo(video, now);
          const landmarks = result.faceLandmarks[0];

          if (!landmarks) {
            if (lastFaceSeenAt === null || now - lastFaceSeenAt > MONITOR_CONFIG.faceLostGraceMs) {
              faceState = 'not_found';
              averageEar = null;
            }

            commit(now, true);
            return;
          }

          lastFaceSeenAt = now;
          faceState = 'detected';

          const ear = calculateEyeAspectRatio(landmarks);
          averageEar = ear;

          if (ear !== null) {
            if (closedStartedAt === null && ear <= MONITOR_CONFIG.blinkClosedThreshold) {
              closedStartedAt = now;
            } else if (closedStartedAt !== null && ear >= MONITOR_CONFIG.blinkOpenThreshold) {
              const closedDuration = now - closedStartedAt;
              const enoughGap =
                lastBlinkAt === null || now - lastBlinkAt >= MONITOR_CONFIG.minBlinkGapMs;

              if (
                enoughGap &&
                closedDuration >= MONITOR_CONFIG.minBlinkDurationMs &&
                closedDuration <= MONITOR_CONFIG.maxBlinkDurationMs
              ) {
                blinkTimestamps.push(now);
                lastBlinkAt = now;
              }

              closedStartedAt = null;
            } else if (
              closedStartedAt !== null &&
              now - closedStartedAt > MONITOR_CONFIG.maxBlinkDurationMs
            ) {
              closedStartedAt = null;
            }
          }

          commit(now, true);
        };

        detect();
      } catch (error) {
        if (cancelled) {
          return;
        }

        const monitorError =
          typeof error === 'object' && error !== null && 'code' in error && 'message' in error
            ? (error as MonitorError)
            : normaliseError(error);

        setSnapshot({
          ...createInitialSnapshot(),
          permissionState: monitorError.code === 'permission_denied' ? 'denied' : 'idle',
          cameraState: 'error',
          error: monitorError,
        });
      }
    };

    void boot();

    return () => {
      cancelled = true;
      void cleanup();
    };
  }, [sessionKey, videoRef]);

  return {
    ...snapshot,
    retry: () => setSessionKey((current) => current + 1),
  };
}
