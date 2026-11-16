import Svg, { Circle, Line } from 'react-native-svg';

import { usePalette } from '@/lib/theme';

/** A swimming pace clock: 12 ticks, one hand pointing at the class minute. */
export function PaceClock({ size = 70, minutes = 0 }: { size?: number; minutes?: number }) {
  const p = usePalette();
  const r = size / 2;
  const angle = ((minutes % 60) / 60) * 2 * Math.PI;
  const hx = r + Math.sin(angle) * (r - 12);
  const hy = r - Math.cos(angle) * (r - 12);
  return (
    <Svg width={size} height={size}>
      <Circle cx={r} cy={r} r={r - 1.5} fill={p.surface} stroke={p.ink} strokeWidth={2} />
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i / 12) * 2 * Math.PI;
        const long = i % 3 === 0;
        return (
          <Line
            key={i}
            x1={r + Math.sin(a) * (r - 4)}
            y1={r - Math.cos(a) * (r - 4)}
            x2={r + Math.sin(a) * (r - (long ? 10 : 7))}
            y2={r - Math.cos(a) * (r - (long ? 10 : 7))}
            stroke={p.ink}
            strokeWidth={long ? 2 : 1}
          />
        );
      })}
      <Line x1={r} y1={r} x2={hx} y2={hy} stroke={p.bjj} strokeWidth={2.2} strokeLinecap="round" />
      <Circle cx={r} cy={r} r={4} fill={p.ink} />
    </Svg>
  );
}
