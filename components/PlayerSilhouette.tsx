import Svg, { Circle, Path } from 'react-native-svg';

interface PlayerSilhouetteProps {
  width?: number;
  height?: number;
  stroke?: string;
}

/**
 * Simple head-and-shoulders outline silhouette.
 * No fill — outline only, suitable as a placeholder when no player photo exists.
 */
export function PlayerSilhouette({
  width = 52,
  height = 72,
  stroke = '#384E62',
}: PlayerSilhouetteProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 52 72">
      {/* Head */}
      <Circle
        cx="26"
        cy="17"
        r="13"
        fill="none"
        stroke={stroke}
        strokeWidth="2.2"
      />
      {/* Shoulder arc — narrows toward neck, fans out to card width */}
      <Path
        d="M2 72 C2 50 14 40 26 38 C38 40 50 50 50 72"
        fill="none"
        stroke={stroke}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </Svg>
  );
}
