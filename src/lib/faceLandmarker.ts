import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

const TASKS_VISION_VERSION = '0.10.33';
const TASKS_WASM_ROOT = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${TASKS_VISION_VERSION}/wasm`;
const FACE_LANDMARKER_MODEL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

async function createWithDelegate(delegate: 'GPU' | 'CPU') {
  const vision = await FilesetResolver.forVisionTasks(TASKS_WASM_ROOT);

  return FaceLandmarker.createFromOptions(vision, {
    baseOptions: {
      delegate,
      modelAssetPath: FACE_LANDMARKER_MODEL,
    },
    runningMode: 'VIDEO',
    numFaces: 1,
    outputFaceBlendshapes: false,
    minFaceDetectionConfidence: 0.5,
    minFacePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });
}

export async function createFaceLandmarker() {
  try {
    return await createWithDelegate('GPU');
  } catch {
    return createWithDelegate('CPU');
  }
}
