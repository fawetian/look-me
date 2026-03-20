export type PermissionState = 'idle' | 'requesting' | 'granted' | 'denied';
export type CameraState = 'idle' | 'starting' | 'ready' | 'error';
export type FaceState = 'searching' | 'detected' | 'not_found';
export type AlertState = 'normal' | 'low' | 'cooldown';
export type MonitorErrorCode =
  | 'permission_denied'
  | 'camera_unavailable'
  | 'model_load_failed'
  | 'unknown';

export interface MonitorMetrics {
  blinkCountWindow: number;
  blinkRatePerMinute: number;
  averageEar: number | null;
  lastBlinkAt: number | null;
  alertCount: number;
  cooldownRemainingMs: number;
  observedWindowMs: number;
}

export interface MonitorError {
  code: MonitorErrorCode;
  message: string;
}

export interface MonitorSnapshot {
  permissionState: PermissionState;
  cameraState: CameraState;
  faceState: FaceState;
  alertState: AlertState;
  isMonitoring: boolean;
  error: MonitorError | null;
  metrics: MonitorMetrics;
}
