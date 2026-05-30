import type { ReactNode } from 'react';
import { Text, type TextStyle } from 'react-native';

const URL_RE = /(?:https?:\/\/|www\.)[^\s<>")\]]+/gi;
const TRAILING_PUNCT_RE = /[.,!?;:)\]"']+$/;

type LinkifiedTextProps = {
  text: string;
  style?: TextStyle;
  linkStyle?: TextStyle;
  onLinkPress: (url: string) => void;
};

export function LinkifiedText({ text, style, linkStyle, onLinkPress }: LinkifiedTextProps) {
  if (!text) return null;

  const parts: ReactNode[] = [];
  let lastIndex = 0;
  URL_RE.lastIndex = 0;
  let i = 0;
  let match: RegExpExecArray | null;

  while ((match = URL_RE.exec(text)) !== null) {
    const start = match.index;
    let matched = match[0];
    const trailing = matched.match(TRAILING_PUNCT_RE);
    if (trailing) {
      matched = matched.slice(0, matched.length - trailing[0].length);
    }

    if (start > lastIndex) {
      parts.push(text.slice(lastIndex, start));
    }

    const href = matched.startsWith('http') ? matched : `https://${matched}`;
    parts.push(
      <Text
        key={`lk-${i++}`}
        style={linkStyle}
        onPress={() => onLinkPress(href)}
        suppressHighlighting={false}
      >
        {matched}
      </Text>,
    );

    lastIndex = start + matched.length;
    if (trailing) {
      parts.push(trailing[0]);
      lastIndex += trailing[0].length;
    }
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return <Text style={style}>{parts}</Text>;
}
