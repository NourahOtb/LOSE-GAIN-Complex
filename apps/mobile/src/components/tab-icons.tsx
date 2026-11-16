import Svg, { Circle, Path, Rect } from 'react-native-svg';

type P = { color: string; size?: number };
const base = (size = 22) => ({ width: size, height: size, viewBox: '0 0 24 24', fill: 'none', strokeWidth: 1.7 });

export const HomeIcon = ({ color, size }: P) => (
  <Svg {...base(size)} stroke={color}><Path d="M3 11l9-7 9 7v9H3z" /></Svg>
);
export const KidsIcon = ({ color, size }: P) => (
  <Svg {...base(size)} stroke={color}>
    <Circle cx="9" cy="8" r="3" />
    <Circle cx="17" cy="9" r="2.5" />
    <Path d="M3 20c0-4 3-6 6-6s6 2 6 6M15 20c0-3 1.5-5 4-5" />
  </Svg>
);
export const PlusIcon = ({ color, size }: P) => (
  <Svg {...base(size)} stroke={color}><Path d="M12 5v14M5 12h14" /></Svg>
);
export const InboxIcon = ({ color, size }: P) => (
  <Svg {...base(size)} stroke={color}><Path d="M4 6h16v12H4zM4 7l8 6 8-6" /></Svg>
);
export const CalendarIcon = ({ color, size }: P) => (
  <Svg {...base(size)} stroke={color}><Rect x="4" y="5" width="16" height="15" /><Path d="M4 10h16M9 3v4M15 3v4" /></Svg>
);
export const ChatIcon = ({ color, size }: P) => (
  <Svg {...base(size)} stroke={color}><Path d="M4 5h16v11H9l-5 4z" /></Svg>
);
export const PersonIcon = ({ color, size }: P) => (
  <Svg {...base(size)} stroke={color}><Circle cx="12" cy="8" r="4" /><Path d="M5 21c1-4 4-6 7-6s6 2 7 6" /></Svg>
);
export const AlertIcon = ({ color, size }: P) => (
  <Svg {...base(size)} stroke={color} strokeWidth={2.2}><Path d="M12 3l9 16H3z" /><Path d="M12 10v4M12 17v.5" /></Svg>
);
