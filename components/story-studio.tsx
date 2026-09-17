"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import type { BilingualStory, DrawingAnalysis, LanguageMode } from "@/lib/story-types";
import { transitionStage, type WizardStage } from "@/lib/wizard";

const stageOrder: WizardStage[] = ["upload", "review", "language", "story", "offline"];
const stageLabels: Record<WizardStage, string> = {
  upload: "그림 올리기",
  review: "부모 확인",
  language: "언어 고르기",
  story: "이야기 보기",
  offline: "다시 그리기"
};

function readFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("그림 파일을 읽지 못했어요."));
    reader.readAsDataURL(file);
  });
}

function sampleToPng() {
  return new Promise<string>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("예제 그림을 준비하지 못했어요."));
        return;
      }
      context.drawImage(image, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    image.onerror = () => reject(new Error("예제 그림을 불러오지 못했어요."));
    image.src = "/sample-drawing.svg";
  });
}

function splitList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 5);
}

export function StoryStudio() {
  const [stage, setStage] = useState<WizardStage>("upload");
  const [nickname, setNickname] = useState("수민");
  const [age, setAge] = useState(7);
  const [imageDataUrl, setImageDataUrl] = useState("");
  const [imageName, setImageName] = useState("");
  const [privacyChecked, setPrivacyChecked] = useState(false);
  const [analysis, setAnalysis] = useState<DrawingAnalysis | null>(null);
  const [language, setLanguage] = useState<LanguageMode>("both");
  const [story, setStory] = useState<BilingualStory | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [demoMode, setDemoMode] = useState(false);
  const [finished, setFinished] = useState(false);

  const activeStep = stageOrder.indexOf(stage);
  const currentPage = story?.pages[pageIndex];
  const progressLabel = `${activeStep + 1} / ${stageOrder.length}`;

  const canSubmitUpload = useMemo(
    () => Boolean(imageDataUrl && nickname.trim() && age >= 5 && age <= 12 && privacyChecked),
    [age, imageDataUrl, nickname, privacyChecked]
  );

  function go(next: WizardStage) {
    setError("");
    setStage((current) => transitionStage(current, next));
  }

  async function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      setError("그림 파일은 8MB 이하로 올려주세요.");
      return;
    }
    try {
      setImageDataUrl(await readFile(file));
      setImageName(file.name);
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "그림을 읽지 못했어요.");
    }
  }

  async function useSample() {
    try {
      setImageDataUrl(await sampleToPng());
      setImageName("바닷가_그림일기_예제.png");
      setPrivacyChecked(true);
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "예제를 불러오지 못했어요.");
    }
  }

  async function analyzeDrawing(event: FormEvent) {
    event.preventDefault();
    if (!canSubmitUpload) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ imageDataUrl, nickname: nickname.trim(), age })
      });
      const data = (await response.json()) as {
        analysis?: DrawingAnalysis;
        demoMode?: boolean;
        error?: string;
      };
      if (!response.ok || !data.analysis) throw new Error(data.error || "그림을 읽지 못했어요.");
      setAnalysis(data.analysis);
      setDemoMode(Boolean(data.demoMode));
      go("review");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "그림을 읽지 못했어요.");
    } finally {
      setBusy(false);
    }
  }

  async function generateStory() {
    if (!analysis) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/story", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ analysis, nickname: nickname.trim(), age })
      });
      const data = (await response.json()) as {
        story?: BilingualStory;
        demoMode?: boolean;
        error?: string;
      };
      if (!response.ok || !data.story) throw new Error(data.error || "이야기를 만들지 못했어요.");
      setStory(data.story);
      setPageIndex(0);
      setDemoMode((current) => current || Boolean(data.demoMode));
      go("story");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "이야기를 만들지 못했어요.");
    } finally {
      setBusy(false);
    }
  }

  function updateAnalysis<Key extends keyof DrawingAnalysis>(key: Key, value: DrawingAnalysis[Key]) {
    setAnalysis((current) => (current ? { ...current, [key]: value } : current));
  }

  function speak(text: string, locale: "ko-KR" | "en-US") {
    if (!("speechSynthesis" in window)) {
      setError("이 브라우저는 문장 듣기를 지원하지 않아요.");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = locale;
    utterance.rate = 0.85;
    window.speechSynthesis.speak(utterance);
  }

  const backTarget: Partial<Record<WizardStage, WizardStage>> = {
    review: "upload",
    language: "review",
    story: "language"
  };

  return (
    <div className={`studio-shell stage-${stage}`}>
      <header className="brand-bar">
        <div className="brand-mark" aria-hidden="true">✎</div>
        <div>
          <p className="brand-kicker">DrawTale</p>
          <h1>그림이야기</h1>
        </div>
        <div className="step-count" aria-label={`전체 5단계 중 ${activeStep + 1}단계`}>
          {progressLabel}
        </div>
      </header>

      {stage === "upload" ? (
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow">그림일기 → 한국어·영어 동화</p>
            <h2 id="hero-title">아이 그림이<br />동화가 되는 순간</h2>
            <p className="hero-lead">그림일기를 올리면 AI가 아이의 상상을 4페이지 동화와 쉬운 영어 이야기로 열어줘요.</p>
          </div>
          <div className="hero-preview" aria-hidden="true">
            <div className="paper paper-one" />
            <div className="paper paper-two" />
            <div className="paper paper-three">
              <span />
              <strong>Once upon a time</strong>
            </div>
          </div>
        </section>
      ) : null}

      <nav className="stepper" aria-label="이야기 만들기 진행 단계">
        {stageOrder.map((item, index) => (
          <div className={`step-dot ${index <= activeStep ? "active" : ""}`} key={item}>
            <span>{index + 1}</span>
            <small>{stageLabels[item]}</small>
          </div>
        ))}
      </nav>

      <section className="studio-card">
        {stage !== "upload" && stage !== "offline" && backTarget[stage] ? (
          <button className="back-button" type="button" onClick={() => go(backTarget[stage] as WizardStage)}>
            ← 이전
          </button>
        ) : null}

        {demoMode ? <p className="demo-badge">✦ API 키 없이 실행 중인 안전한 발표 데모예요.</p> : null}
        {error ? <p className="error-message" role="alert">{error}</p> : null}

        {stage === "upload" ? (
          <form className="stage-panel" onSubmit={analyzeDrawing}>
            <div className="stage-heading">
              <p className="eyebrow">부모님과 함께 시작해요</p>
              <h2>오늘의 그림일기를 올려주세요</h2>
              <p>그림과 손글씨를 AI가 함께 읽어요.</p>
            </div>

            <label className={`upload-box ${imageDataUrl ? "has-image" : ""}`}>
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onFileChange} />
              {imageDataUrl ? (
                <Image src={imageDataUrl} alt="올린 그림일기 미리보기" fill sizes="(max-width: 720px) 92vw, 560px" unoptimized />
              ) : (
                <span><b>📷 그림일기 사진 선택</b><small>JPG, PNG, WebP · 최대 8MB</small></span>
              )}
            </label>
            {imageName ? <p className="file-name">{imageName}</p> : null}
            <button className="text-button" type="button" onClick={useSample}>사진이 없나요? 예제로 시작하기</button>

            <div className="two-fields">
              <label>
                <span>아이 별명</span>
                <input value={nickname} maxLength={12} onChange={(event) => setNickname(event.target.value)} placeholder="예: 수민" />
              </label>
              <label>
                <span>나이</span>
                <select value={age} onChange={(event) => setAge(Number(event.target.value))}>
                  {[5, 6, 7, 8, 9, 10, 11, 12].map((value) => <option value={value} key={value}>{value}세</option>)}
                </select>
              </label>
            </div>

            <div className="trust-box">
            <label className="privacy-check">
              <input type="checkbox" checked={privacyChecked} onChange={(event) => setPrivacyChecked(event.target.checked)} />
              <span>얼굴·학교명·주소·연락처가 보이지 않는 그림인지 확인했어요.</span>
            </label>
            <p className="privacy-note">사진과 이야기는 저장하지 않고, 현재 이야기를 만드는 데만 사용해요.</p>
            </div>

            <button className="primary-button" type="submit" disabled={!canSubmitUpload || busy}>
              {busy ? "그림 속 이야기를 찾고 있어요…" : "이야기 시작하기 →"}
            </button>
          </form>
        ) : null}

        {stage === "review" && analysis ? (
          <div className="stage-panel compact-panel trust-panel">
            <div className="stage-heading">
              <span className="stage-emoji" aria-hidden="true">🔎</span>
              <p className="eyebrow">AI가 이렇게 이해했어요</p>
              <h2>이야기를 만들기 전에<br />부모님이 한 번 확인해주세요.</h2>
            </div>
            <div className="review-grid">
              <label><span>등장인물</span><input value={analysis.characters.join(", ")} onChange={(event) => updateAnalysis("characters", splitList(event.target.value))} /></label>
              <label><span>장소</span><input value={analysis.place} onChange={(event) => updateAnalysis("place", event.target.value)} /></label>
              <label><span>사물</span><input value={analysis.objects.join(", ")} onChange={(event) => updateAnalysis("objects", splitList(event.target.value))} /></label>
              <label><span>분위기</span><input value={analysis.mood} onChange={(event) => updateAnalysis("mood", event.target.value)} /></label>
              <label className="wide-field"><span>그림일기 글</span><textarea rows={4} value={analysis.diaryText} onChange={(event) => updateAnalysis("diaryText", event.target.value)} /></label>
            </div>
            <p className="helper-copy">손글씨를 잘못 읽은 부분만 편하게 고쳐주세요.</p>
            <button className="primary-button" type="button" onClick={() => go("language")}>맞아요, 다음 →</button>
          </div>
        ) : null}

        {stage === "language" ? (
          <div className="stage-panel compact-panel">
            <div className="stage-heading">
              <span className="stage-emoji" aria-hidden="true">🌏</span>
              <p className="eyebrow">편한 언어로 이해하고 배우는 언어로 다시 만나요</p>
              <h2>어떻게 읽어볼까요?</h2>
            </div>
            <div className="language-options">
              <button className={language === "ko" ? "selected" : ""} type="button" onClick={() => setLanguage("ko")}><span>🇰🇷</span><b>한국어로 읽기</b><small>한국어 이야기와 단어</small></button>
              <button className={language === "en" ? "selected" : ""} type="button" onClick={() => setLanguage("en")}><span>🇺🇸</span><b>Read in English</b><small>Easy English story and words</small></button>
              <button className={language === "both" ? "selected" : ""} type="button" onClick={() => setLanguage("both")}><span>🌈</span><b>한국어 + English</b><small>같은 이야기를 두 언어로</small></button>
            </div>
            <button className="primary-button" type="button" onClick={generateStory} disabled={busy}>
              {busy ? "4페이지 이야기를 만드는 중이에요…" : "내 그림 이야기 만들기 →"}
            </button>
          </div>
        ) : null}

        {stage === "story" && story && currentPage ? (
          <div className="story-stage">
            <div className="story-topline">
              <div><p className="eyebrow">내 그림이 살아나는 이야기</p><h2>{language === "en" ? story.titleEn : story.titleKo}</h2></div>
              <strong>{pageIndex + 1} / {story.pages.length}</strong>
            </div>
            <div className="story-body">
            <div className="story-image">
              <Image
                src={imageDataUrl}
                alt="아이가 올린 원본 그림일기"
                fill
                sizes="(max-width: 720px) 92vw, 680px"
                unoptimized
                style={{ objectFit: "cover", objectPosition: `${currentPage.focus.x}% ${currentPage.focus.y}%` }}
              />
              <span className="original-badge">원본 그림 그대로</span>
            </div>
            <div className="story-copy">
              {language !== "en" ? <p className="korean-line">{currentPage.ko}</p> : null}
              {language !== "ko" ? <p className="english-line">{currentPage.en}</p> : null}
              <div className="listen-row">
                {language !== "en" ? <button type="button" onClick={() => speak(currentPage.ko, "ko-KR")}>🔊 한국어 듣기</button> : null}
                {language !== "ko" ? <button type="button" onClick={() => speak(currentPage.en, "en-US")}>🔊 English</button> : null}
              </div>
              <div className="word-row">
                {currentPage.words.map((word) => <span key={`${word.ko}-${word.en}`}>{word.ko} · {word.en}</span>)}
              </div>
            </div>
            </div>
            <div className="story-nav">
              <button type="button" disabled={pageIndex === 0} onClick={() => setPageIndex((index) => Math.max(0, index - 1))}>← 이전 장</button>
              {pageIndex < story.pages.length - 1 ? (
                <button className="primary-inline" type="button" onClick={() => setPageIndex((index) => Math.min(story.pages.length - 1, index + 1))}>다음 장 →</button>
              ) : (
                <button className="primary-inline" type="button" onClick={() => go("offline")}>나의 다음 이야기 →</button>
              )}
            </div>
          </div>
        ) : null}

        {stage === "offline" && story ? (
          <div className="stage-panel offline-panel">
            <span className="stage-emoji" aria-hidden="true">🎨</span>
            <p className="eyebrow">이제 {nickname}의 차례예요</p>
            <h2>화면을 끌 시간이에요.</h2>
            <div className="offline-question">
              {language !== "en" ? <p>{story.offlinePromptKo}</p> : null}
              {language !== "ko" ? <p className="english-line">{story.offlinePromptEn}</p> : null}
            </div>
            <div className="paper-prompt"><span>✏️</span><b>다음 장면을 종이에 그려보세요</b></div>
            <button className="primary-button" type="button" onClick={() => setFinished(true)}>오늘은 여기까지 ✓</button>
            {finished ? <p className="finish-message" role="status">잘했어요! 이제 종이와 색연필을 준비해볼까요?</p> : null}
          </div>
        ) : null}
      </section>

      <footer>그림이야기는 아이를 화면에 더 오래 머물게 하지 않아요.</footer>
    </div>
  );
}
