"use client";

import { useEffect, useRef, useState } from "react";

type RecognitionResultEvent = {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
};

type Recognition = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: RecognitionResultEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  abort: () => void;
};

type RecognitionConstructor = new () => Recognition;

export function isSpeechRecognitionSupported() {
  return Boolean(recognitionConstructor());
}

function recognitionConstructor(): RecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const scope = window as unknown as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
}

const errorMessages: Record<string, string> = {
  "not-allowed": "마이크를 쓸 수 없어요. 브라우저에서 마이크를 허용해주세요.",
  "service-not-allowed": "마이크를 쓸 수 없어요. 브라우저에서 마이크를 허용해주세요.",
  "no-speech": "잘 안 들렸어요. 버튼을 누르고 또박또박 말해볼까요?",
  "audio-capture": "마이크를 찾지 못했어요.",
  network: "인터넷이 불안정해서 듣지 못했어요."
};

/**
 * 짧은 대답을 말로 받는 버튼. 브라우저가 음성 인식을 지원하지 않으면 아무것도 그리지 않는다.
 * 인식 결과는 틀릴 수 있으므로, 부모 화면에서 꼭 읽어주고 확인받는 흐름과 함께 쓴다.
 */
export function VoiceInput({
  label = "🎤 말하기",
  listeningLabel = "듣고 있어요… 말해보세요",
  onResult,
  onError,
  className = ""
}: {
  label?: string;
  listeningLabel?: string;
  onResult: (text: string) => void;
  onError?: (message: string) => void;
  className?: string;
}) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<Recognition | null>(null);

  useEffect(() => {
    setSupported(Boolean(recognitionConstructor()));
    return () => recognitionRef.current?.abort();
  }, []);

  if (!supported) return null;

  function start() {
    const Constructor = recognitionConstructor();
    if (!Constructor || listening) return;
    window.speechSynthesis?.cancel();
    const recognition = new Constructor();
    recognition.lang = "ko-KR";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim() ?? "";
      if (transcript) onResult(transcript);
      else onError?.(errorMessages["no-speech"]);
    };
    recognition.onerror = (event) => {
      if (event.error === "aborted") return;
      onError?.(errorMessages[event.error] ?? "잘 듣지 못했어요. 다시 해볼까요?");
    };
    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }

  function stop() {
    recognitionRef.current?.abort();
    setListening(false);
  }

  return (
    <button
      type="button"
      className={`voice-button ${listening ? "listening" : ""} ${className}`}
      onClick={listening ? stop : start}
      aria-pressed={listening}
    >
      {listening ? listeningLabel : label}
    </button>
  );
}
