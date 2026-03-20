declare module '@mediapipe/tasks-vision' {
  export interface NormalizedLandmark {
    x: number;
    y: number;
    z: number;
  }

  export interface FaceLandmarkerResult {
    faceLandmarks: NormalizedLandmark[][];
  }

  export interface FaceLandmarkerOptions {
    baseOptions: {
      delegate?: 'GPU' | 'CPU';
      modelAssetPath: string;
    };
    runningMode: 'VIDEO';
    numFaces?: number;
    outputFaceBlendshapes?: boolean;
    minFaceDetectionConfidence?: number;
    minFacePresenceConfidence?: number;
    minTrackingConfidence?: number;
  }

  export class FilesetResolver {
    static forVisionTasks(wasmRoot: string): Promise<unknown>;
  }

  export class FaceLandmarker {
    static createFromOptions(
      vision: unknown,
      options: FaceLandmarkerOptions,
    ): Promise<FaceLandmarker>;

    detectForVideo(video: HTMLVideoElement, timestampMs: number): FaceLandmarkerResult;
    close(): void;
  }
}
