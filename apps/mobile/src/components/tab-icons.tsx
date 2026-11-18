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
export const SunIcon = ({ color, size }: P) => (
  <Svg {...base(size)} stroke={color}>
    <Circle cx="12" cy="12" r="4" />
    <Path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Svg>
);
export const MoonIcon = ({ color, size }: P) => (
  <Svg {...base(size)} stroke={color}><Path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" /></Svg>
);
export const PhoneIcon = ({ color, size }: P) => (
  <Svg {...base(size)} stroke={color}><Rect x="7" y="2.5" width="10" height="19" rx="2" /><Path d="M11 18.5h2" /></Svg>
);
export const GearIcon = ({ color, size }: P) => (
  <Svg {...base(size)} stroke={color}>
    <Circle cx="12" cy="12" r="3" />
    <Path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </Svg>
);
export const CheckIcon = ({ color, size }: P) => (
  <Svg {...base(size)} stroke={color}><Path d="M5 12.5l4.5 4.5L19 7.5" /></Svg>
);
export const PinIcon = ({ color, size }: P) => (
  <Svg {...base(size)} stroke={color}><Path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" /><Circle cx="12" cy="9.5" r="2.5" /></Svg>
);
export const InfoIcon = ({ color, size }: P) => (
  <Svg {...base(size)} stroke={color}><Circle cx="12" cy="12" r="9" /><Path d="M12 11v6M12 7.5v.5" /></Svg>
);
