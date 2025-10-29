export const getLineStart = (text: string, pos: number): number => {
  if (pos > text.length) pos = text.length;
  if (pos === text.length && pos > 0) {
    if (text[pos - 1] === "\n" && pos > 1) {
      pos = pos - 1;
    }
  }
  for (let i = pos - 1; i >= 0; i--) {
    if (text[i] === "\n") return i + 1;
  }
  return 0;
};

export const getLineEnd = (text: string, pos: number): number => {
  for (let i = pos; i < text.length; i++) {
    if (text[i] === "\n") return i;
  }
  return text.length;
};
