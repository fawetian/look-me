import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

import type { BlinkHistoryPoint } from '../types';

interface BlinkChartProps {
  data: BlinkHistoryPoint[];
}

function formatTime(timestamp: number) {
  // timestamp is from performance.now(), convert to absolute time
  const absoluteTime = Date.now() - performance.now() + timestamp;
  const date = new Date(absoluteTime);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export function BlinkChart({ data }: BlinkChartProps) {
  const chartData = data.map((point) => ({
    time: formatTime(point.timestamp),
    blinks10s: point.blinks10s,
    blinkRate: Number(point.blinkRatePerMinute.toFixed(1)),
  }));

  if (chartData.length === 0) {
    return (
      <div className="chart-empty">
        <p>Collecting data for the chart...</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart
        data={chartData}
        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
        <XAxis
          dataKey="time"
          stroke="#888"
          tick={{ fontSize: 10 }}
          interval="preserveStartEnd"
        />
        <YAxis
          yAxisId="left"
          stroke="#4ade80"
          tick={{ fontSize: 10 }}
          domain={[0, 'auto']}
          label={{
            value: 'Blinks/10s',
            angle: -90,
            position: 'insideLeft',
            fill: '#4ade80',
            fontSize: 10,
          }}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          stroke="#60a5fa"
          tick={{ fontSize: 10 }}
          domain={[0, 'auto']}
          label={{
            value: 'Blinks/min',
            angle: 90,
            position: 'insideRight',
            fill: '#60a5fa',
            fontSize: 10,
          }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1a1a1a',
            border: '1px solid #333',
            borderRadius: '8px',
          }}
          labelStyle={{ color: '#888' }}
        />
        <Legend />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="blinks10s"
          stroke="#4ade80"
          strokeWidth={2}
          dot={false}
          name="Blinks in 10s"
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="blinkRate"
          stroke="#60a5fa"
          strokeWidth={2}
          dot={false}
          name="Blinks/min"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
