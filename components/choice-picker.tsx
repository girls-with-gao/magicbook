"use client";

import { useEffect, useState } from "react";
import { VoiceInput, isSpeechRecognitionSupported } from "@/components/voice-input";
import type { ChildChoice, LanguageMode, StoryOpening } from "@/lib/story-types";

type Selection = { kind: "card"; index: number } | { kind: "own" } | null;

/**
 * 이야기 중간 갈림길. 아이는 그림 카드를 누르거나 말로 다음 장면을 정한다.
 * 음성 인식은 틀릴 수 있어서, 들은 말을 읽어주고 확인받은 뒤에만 넘어간다.
 */
export function ChoicePicker({
  opening,
  language,
  nickname,
  busy,
  speak,
  onChoose
}: {
  opening: StoryOpening;
  language: LanguageMode;
  nickname: string;
  busy: boolean;
  speak: (text: string, locale: "ko-KR" | "en-US") => void;
  onChoose: (choice: ChildChoice) => void;
}) {
  const [selection, setSelection] = useState<Selection>(null);
  const [ownText, setOwnText] = useState("");
  const [ownByVoice, setOwnByVoice] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const [typing, setTyping] = useState(false);

  useEffect(() => setVoiceSupported(isSpeechRecognitionSupported()), []);

  function askAgain() {
    if (language === "en") speak(opening.questionEn || opening.questionKo, "en-US");
    else speak(opening.questionKo, "ko-KR");
  }

  function pickCard(index: number) {
    setSelection({ kind: "card", index });
    const card = opening.choices[index];
    if (language === "en") speak(card.en, "en-US");
    else speak(card.ko, "ko-KR");
  }

  function onVoice(text: string) {
    setVoiceError("");
    setOwnText(text);
    setOwnByVoice(true);
    setTyping(false);
    setSelection({ kind: "own" });
    speak(`${text}. 이렇게 말했어요. 맞아요?`, "ko-KR");
  }

  function onTyped(text: string) {
    setOwnText(text);
    setOwnByVoice(false);
    setSelection(text.trim() ? { kind: "own" } : null);
  }

  function confirm() {
    if (!selection) return;
    if (selection.kind === "card") {
      const card = opening.choices[selection.index];
      onChoose({ ko: card.ko, en: card.en, byVoice: false });
      return;
    }
    const text = ownText.trim();
    if (text) onChoose({ ko: text, en: "", byVoice: ownByVoice });
  }

  const ownSelected = selection?.kind === "own" && ownText.trim();

  return (
    <div className="choice-panel">
      <div className="stage-heading">
        <span className="stage-emoji" aria-hidden="true">🤔</span>
        <p className="eyebrow">이제 {nickname}의 차례! 다음 장면을 정해요</p>
        <h2>{language === "en" ? opening.questionEn || opening.questionKo : opening.questionKo}</h2>
        {language === "both" && opening.questionEn ? <p className="english-line">{opening.questionEn}</p> : null}
        <button className="listen-question" type="button" onClick={askAgain}>🔊 질문 다시 듣기</button>
      </div>

      <div className="choice-cards" role="radiogroup" aria-label="다음 장면 고르기">
        {opening.choices.map((card, index) => {
          const selected = selection?.kind === "card" && selection.index === index;
          return (
            <button
              key={`${card.ko}-${index}`}
              type="button"
              role="radio"
              aria-checked={selected}
              className={`choice-card ${selected ? "selected" : ""}`}
              onClick={() => pickCard(index)}
            >
              <span className="choice-emoji" aria-hidden="true">{card.emoji}</span>
              {language !== "en" ? <b>{card.ko}</b> : null}
              {language !== "ko" ? <small>{card.en}</small> : null}
            </button>
          );
        })}

        <div className={`choice-card own-card ${selection?.kind === "own" ? "selected" : ""}`}>
          <span className="choice-emoji" aria-hidden="true">💡</span>
          <b>내 생각이 있어요</b>
          {voiceSupported ? (
            <VoiceInput label="🎤 말로 하기" listeningLabel="듣고 있어요…" onResult={onVoice} onError={setVoiceError} />
          ) : null}
          <button className="text-button" type="button" onClick={() => setTyping((value) => !value)}>
            {voiceSupported ? "부모님이 대신 적기" : "✏️ 부모님이 적어주기"}
          </button>
        </div>
      </div>

      {voiceError ? <p className="voice-error" role="alert">{voiceError}</p> : null}

      {typing ? (
        <label className="own-typing">
          <span>아이가 말한 생각을 그대로 적어주세요</span>
          <input
            value={ownText}
            maxLength={60}
            placeholder="예: 조개를 집에 데려가기"
            onChange={(event) => onTyped(event.target.value)}
          />
        </label>
      ) : null}

      {ownSelected && ownByVoice ? (
        <div className="voice-confirm" role="status">
          <p>
            <small>이렇게 들었어요</small>
            <b>“{ownText}”</b>
          </p>
          <div>
            <VoiceInput label="🔁 다시 말하기" listeningLabel="듣고 있어요…" onResult={onVoice} onError={setVoiceError} />
            <button type="button" className="text-button" onClick={() => setTyping(true)}>틀렸으면 고쳐 적기</button>
          </div>
        </div>
      ) : null}

      <button className="primary-button" type="button" onClick={confirm} disabled={!selection || busy}>
        {busy ? "고른 장면으로 이야기를 이어 쓰는 중…" : selection ? "이걸로 할래! →" : "하나를 골라주세요"}
      </button>
    </div>
  );
}
