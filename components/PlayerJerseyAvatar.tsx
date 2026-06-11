import React from 'react';
import Svg, { Path, Text as SvgText } from 'react-native-svg';
import { getTeamColors } from '../src/data/teamColors';

interface PlayerJerseyAvatarProps {
  teamCode: string;
  jerseyNumber: number;
  width?: number;
  height?: number;
}

const JERSEY_BODY =
  'M 21 11 L 8 13 L 3 23 L 3 28 L 11 32 L 11 64 Q 11 70 16 70 L 48 70 Q 53 70 53 64 L 53 32 L 61 28 L 61 23 L 56 13 L 43 11 Q 37 17 36 21 Q 27 17 21 11 Z';

const COLLAR =
  'M 21 11 Q 27 17 36 21 Q 37 17 43 11 L 40 8 Q 36 3 32 5 Q 28 3 24 8 Z';

const COLLAR_LINE =
  'M 21 11 Q 27 17 36 21 Q 37 17 43 11';

function resolveAccent(primary: string, secondary: string): string {
  const r = parseInt(primary.slice(1, 3), 16);
  const g = parseInt(primary.slice(3, 5), 16);
  const b = parseInt(primary.slice(5, 7), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.70 ? secondary : primary;
}

export const PlayerJerseyAvatar = React.memo(function PlayerJerseyAvatar({
  teamCode,
  jerseyNumber,
  width = 52,
  height = 58,
}: PlayerJerseyAvatarProps) {
  const { primary, secondary } = getTeamColors(teamCode);
  const accent = resolveAccent(primary, secondary);

  const fontSize = jerseyNumber >= 10 ? 20 : 26;

  return (
    <Svg width={width} height={height} viewBox="0 0 64 72">
      <Path
        d={JERSEY_BODY}
        fill={primary}
        fillOpacity={0.12}
        stroke={accent}
        strokeWidth={1.7}
        strokeLinejoin="round"
      />

      <Path
        d={COLLAR}
        fill={secondary}
        fillOpacity={0.24}
        stroke={accent}
        strokeOpacity={0.45}
        strokeWidth={1}
        strokeLinejoin="round"
      />

      <Path
        d={COLLAR_LINE}
        fill="none"
        stroke={accent}
        strokeOpacity={0.85}
        strokeWidth={1.35}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <SvgText
        x="32"
        y="52"
        textAnchor="middle"
        fill={accent}
        fontSize={fontSize}
        fontWeight="bold"
      >
        {jerseyNumber}
      </SvgText>
    </Svg>
  );
});