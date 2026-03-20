type LandmarkLike = {
  x: number;
  y: number;
};

const LEFT_EYE = {
  horizontal: [33, 133] as const,
  verticalPairs: [
    [159, 145],
    [160, 144],
    [158, 153],
  ] as const,
};

const RIGHT_EYE = {
  horizontal: [362, 263] as const,
  verticalPairs: [
    [386, 374],
    [387, 373],
    [385, 380],
  ] as const,
};

function distance(a: LandmarkLike, b: LandmarkLike) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function calculateSingleEyeAspectRatio(
  landmarks: LandmarkLike[],
  eye: typeof LEFT_EYE | typeof RIGHT_EYE,
) {
  const [outer, inner] = eye.horizontal;
  const horizontalDistance = distance(landmarks[outer], landmarks[inner]);

  if (horizontalDistance === 0) {
    return null;
  }

  const verticalDistances = eye.verticalPairs.map(([top, bottom]) =>
    distance(landmarks[top], landmarks[bottom]),
  );

  return average(verticalDistances) / horizontalDistance;
}

export function calculateEyeAspectRatio(landmarks: LandmarkLike[]) {
  const left = calculateSingleEyeAspectRatio(landmarks, LEFT_EYE);
  const right = calculateSingleEyeAspectRatio(landmarks, RIGHT_EYE);

  if (left === null || right === null) {
    return null;
  }

  return (left + right) / 2;
}

export function computeBlinkRate(blinksInWindow: number, observedWindowMs: number) {
  if (observedWindowMs <= 0) {
    return 0;
  }

  return (blinksInWindow * 60_000) / observedWindowMs;
}
