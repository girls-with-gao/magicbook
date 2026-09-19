function hasFinalConsonant(value: string) {
  const lastCharacter = value.trim().at(-1);
  if (!lastCharacter) return false;
  const code = lastCharacter.charCodeAt(0);
  const isHangulSyllable = code >= 0xac00 && code <= 0xd7a3;
  return isHangulSyllable && (code - 0xac00) % 28 !== 0;
}

/** 이름 뒤에 받침에 맞는 조사를 붙인다. 예: withParticle("수민", "이가", "가") → "수민이가" */
export function withParticle(name: string, afterFinal: string, afterVowel: string) {
  const trimmed = name.trim() || "아이";
  return `${trimmed}${hasFinalConsonant(trimmed) ? afterFinal : afterVowel}`;
}
