# Look-Me

Look-Me is a local browser app that monitors blink frequency through the webcam and raises a visual reminder when the recent blink rate stays too low.

## Stack

- Vite
- React
- TypeScript
- MediaPipe Face Landmarker

## Scripts

```bash
npm install
npm run dev
```

To produce a production build:

```bash
npm run build
```

## Current behavior

- Requests webcam permission in the browser
- Tracks one face in real time
- Estimates eye openness from facial landmarks
- Counts blinks in a 60-second sliding window
- Raises a visual reminder when the estimated blink rate drops below 5 blinks per minute
- Keeps all video processing local to the browser
