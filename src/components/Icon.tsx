import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { C } from '@/lib/theme';

export type IconName = 'back' | 'plus' | 'gear' | 'search' | 'pin' | 'bubble' | 'more' | 'close' | 'heart' | 'chev' | 'undo' | 'qr' | 'camera' | 'send' | 'thumb';

/** MOSHCHAT's own thumbs-up: a capsule thumb on a rounded fist. */
export function Thumb({ size = 22, fill = C.white, stroke = C.ink, sw = 2 }: { size?: number; fill?: string; stroke?: string; sw?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={7.4} y={2.3} width={5.2} height={10.5} rx={2.6} fill={fill} stroke={stroke} strokeWidth={sw} transform="rotate(-14 10 7.5)" />
      <Rect x={4} y={9.6} width={15.5} height={11.2} rx={3.6} fill={fill} stroke={stroke} strokeWidth={sw} />
      <Path d="M13.4 13.4h6.1M13.4 17h6.1" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
    </Svg>
  );
}

export function Icon({ name, size = 22, color = C.ink }: { name: IconName; size?: number; color?: string }) {
  const p = { stroke: color, strokeWidth: 2.2, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'back' && <Path d="M15 5l-7 7 7 7" {...p} />}
      {name === 'plus' && <Path d="M12 5v14M5 12h14" {...p} />}
      {name === 'close' && <Path d="M6 6l12 12M18 6L6 18" {...p} />}
      {name === 'chev' && <Path d="M5 9l7 7 7-7" {...p} />}
      {name === 'search' && <><Circle cx={10.5} cy={10.5} r={6.5} {...p} /><Path d="M15.5 15.5L21 21" {...p} /></>}
      {name === 'pin' && <><Path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11z" {...p} /><Circle cx={12} cy={10} r={2.4} fill={color} /></>}
      {name === 'bubble' && <Path d="M12 3.5c5 0 9 3.4 9 7.6s-4 7.6-9 7.6c-1 0-2-.1-2.9-.4L4.5 20l1.2-3.6C4 15 3 13.1 3 11.1 3 6.9 7 3.5 12 3.5z" {...p} />}
      {name === 'more' && <><Circle cx={5} cy={12} r={1.6} fill={color} /><Circle cx={12} cy={12} r={1.6} fill={color} /><Circle cx={19} cy={12} r={1.6} fill={color} /></>}
      {name === 'heart' && <Path d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 7.9 3.6 4.5 7 4.5c2.1 0 3.6 1.2 5 3 1.4-1.8 2.9-3 5-3 3.4 0 5.6 3.4 4.3 6.8-1.8 4.6-9.3 9.2-9.3 9.2z" {...p} />}
      {name === 'undo' && <Path d="M9 7H5v-4M5.5 7A8 8 0 1 1 4 12" {...p} />}
      {name === 'qr' && <><Rect x={3} y={3} width={7} height={7} rx={1} {...p} /><Rect x={14} y={3} width={7} height={7} rx={1} {...p} /><Rect x={3} y={14} width={7} height={7} rx={1} {...p} /><Path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3" {...p} /></>}
      {name === 'camera' && <><Rect x={3} y={6} width={18} height={14} rx={3} {...p} /><Circle cx={12} cy={13} r={3.5} {...p} /><Path d="M8 6l1.5-2.5h5L16 6" {...p} /></>}
      {name === 'send' && <Path d="M4 12l16-8-6 16-2.5-6.5L4 12z" {...p} />}
      {name === 'gear' && <><Path d="M19.15 10.51 L21.47 10.42 L21.47 13.58 L19.15 13.49 L18.11 16.00 L19.81 17.58 L17.58 19.81 L16.00 18.11 L13.49 19.15 L13.58 21.47 L10.42 21.47 L10.51 19.15 L8.00 18.11 L6.42 19.81 L4.19 17.58 L5.89 16.00 L4.85 13.49 L2.53 13.58 L2.53 10.42 L4.85 10.51 L5.89 8.00 L4.19 6.42 L6.42 4.19 L8.00 5.89 L10.51 4.85 L10.42 2.53 L13.58 2.53 L13.49 4.85 L16.00 5.89 L17.58 4.19 L19.81 6.42 L18.11 8.00Z" {...p} strokeWidth={2} /><Circle cx={12} cy={12} r={3.1} {...p} strokeWidth={2} /></>}
      {name === 'thumb' && <Path d="M7 10v11H3V10h4zm2 11h8.3a2 2 0 0 0 2-1.6l1.6-7.2A2 2 0 0 0 19 10h-5.2l.8-4.2a1.7 1.7 0 0 0-1.7-2L9 10v11z" {...p} />}
    </Svg>
  );
}
