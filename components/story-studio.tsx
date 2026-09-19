"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { ChoicePicker } from "@/components/choice-picker";
import { FriendPicker } from "@/components/friend-picker";
import { StoryBookView } from "@/components/story-book";
import { appendChapter, clearBook, isBookFull, loadBook, saveBook } from "@/lib/book-storage";
import { demoSampleImagePath } from "@/lib/demo-data";
import { combineStory } from "@/lib/story-normalize";
import type { SeedBook } from "@/lib/seed-books";
import { withParticle } from "@/lib/korean";
import {
  MAX_CHAPTERS,
  OPENING_PAGES,
  STORY_PAGES,
  type BilingualStory,
  type ChildChoice,
  type DrawingAnalysis,
  type LanguageMode,
  type StoryBook,
  type StoryEnding,
  type StoryOpening
} from "@/lib/story-types";
import { transitionStage, type WizardStage } from "@/lib/wizard";

const stageOrder: WizardStage[] = ["upload", "review", "language", "story", "offline"];
const stageLabels: Record<WizardStage, string> = {
  upload: "그림 올리기",
  review: "부모 확인",
  language: "언어 고르기",
  story: "이야기 보기",
  offline: "다시 그리기",
  book: "동화책",
  friends: "친구 이야기"
};

function browserStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** 브라우저 보관 용량을 아끼려고 긴 변 1280px JPEG로 줄인다. */
function shrinkImage(dataUrl: string, maxSide = 1280) {
  return new Promise<string>((resolve) => {
    const image = new window.Image();
    image.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(image.naturalWidth * scale);
      canvas.height = Math.round(image.naturalHeight * scale);
      const context = canvas.getContext("2d");
      if (!context) {
        resolve(dataUrl);
        return;
      }
      context.fillStyle = "#fff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };
    image.onerror = () => resolve(dataUrl);
    image.src = dataUrl;
  });
}

function readFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("그림 파일을 읽지 못했어요."));
    reader.readAsDataURL(file);
  });
}

function sampleToPng(src: string) {
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
    image.src = src;
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
  const [opening, setOpening] = useState<StoryOpening | null>(null);
  const [choosing, setChoosing] = useState(false);
  const [story, setStory] = useState<BilingualStory | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [demoMode, setDemoMode] = useState(false);
  const [finished, setFinished] = useState(false);
  const [book, setBook] = useState<StoryBook | null>(null);

  useEffect(() => {
    const storage = browserStorage();
    const saved = storage ? loadBook(storage) : null;
    if (!saved) return;
    setBook(saved);
    if (!isBookFull(saved)) {
      setNickname(saved.nickname);
      setAge(saved.age);
      setLanguage(saved.language);
    }
  }, []);

  const bookFull = isBookFull(book);
  const continuing = Boolean(book && book.chapters.length > 0 && !bookFull);
  const chapterNumber = continuing && book ? book.chapters.length + 1 : 1;

  const activeStep = stageOrder.indexOf(stage);
  const storyPages = story?.pages ?? opening?.pages ?? [];
  const currentPage = storyPages[pageIndex];
  const storyTitle = story ?? opening;
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
      setImageDataUrl(await sampleToPng(demoSampleImagePath(chapterNumber)));
      setImageName(`그림일기_예제_${chapterNumber}편.png`);
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
        body: JSON.stringify({ imageDataUrl, nickname: nickname.trim(), age, chapter: chapterNumber })
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

  function storyRequestBase() {
    return {
      analysis,
      nickname: nickname.trim(),
      age,
      previousChapters:
        continuing && book
          ? book.chapters.map((chapter) => ({ titleKo: chapter.story.titleKo, summaryKo: chapter.story.summaryKo }))
          : []
    };
  }

  function startChoosing() {
    if (!opening) return;
    setChoosing(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (language === "en") speak(opening.questionEn || opening.questionKo, "en-US");
    else speak(opening.questionKo, "ko-KR");
  }

  async function chooseNext(choice: ChildChoice) {
    if (!opening) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/story", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phase: "ending", ...storyRequestBase(), opening, choice })
      });
      const data = (await response.json()) as {
        ending?: StoryEnding;
        demoMode?: boolean;
        error?: string;
      };
      if (!response.ok || !data.ending) throw new Error(data.error || "이야기를 이어 쓰지 못했어요.");
      setStory(combineStory(opening, data.ending, choice));
      setDemoMode((current) => current || Boolean(data.demoMode));
      setChoosing(false);
      setPageIndex(OPENING_PAGES);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "이야기를 이어 쓰지 못했어요. 다시 골라볼까요?");
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
        body: JSON.stringify({ phase: "opening", ...storyRequestBase() })
      });
      const data = (await response.json()) as {
        opening?: StoryOpening;
        demoMode?: boolean;
        error?: string;
      };
      if (!response.ok || !data.opening) throw new Error(data.error || "이야기를 만들지 못했어요.");
      setOpening(data.opening);
      setStory(null);
      setChoosing(false);
      setPageIndex(0);
      setDemoMode((current) => current || Boolean(data.demoMode));
      go("story");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "이야기를 만들지 못했어요.");
    } finally {
      setBusy(false);
    }
  }

  async function finishChapter() {
    if (!analysis || !story) return;
    setBusy(true);
    const storedImage = await shrinkImage(imageDataUrl);
    const next = appendChapter(
      book,
      { imageDataUrl: storedImage, analysis, story },
      { nickname: nickname.trim(), age, language }
    );
    setBook(next);
    const storage = browserStorage();
    const result = storage ? saveBook(storage, next) : { ok: false as const, message: "이 브라우저에서는 책을 보관할 수 없어요." };
    setBusy(false);
    go("offline");
    if (!result.ok) setError(result.message);
  }

  function resetDrawing() {
    setImageDataUrl("");
    setImageName("");
    setPrivacyChecked(false);
    setAnalysis(null);
    setOpening(null);
    setChoosing(false);
    setStory(null);
    setPageIndex(0);
    setFinished(false);
  }

  async function startFriendBook(seed: SeedBook) {
    setBusy(true);
    setError("");
    try {
      const chapters = await Promise.all(
        seed.chapters.map(async (chapter) => ({
          imageDataUrl: await shrinkImage(await sampleToPng(chapter.imagePath)),
          analysis: chapter.analysis,
          story: chapter.story,
          author: seed.authorName
        }))
      );
      const friendBook: StoryBook = {
        id: `book-${Date.now()}`,
        nickname: nickname.trim() || "아이",
        age,
        language,
        chapters,
        createdAt: new Date().toISOString(),
        origin: { type: "friend", seedId: seed.id, authorName: seed.authorName }
      };
      const storage = browserStorage();
      const result = storage ? saveBook(storage, friendBook) : { ok: true as const };
      setBook(friendBook);
      resetDrawing();
      setStage("upload");
      if (!result.ok) setError(result.message);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "친구 이야기를 가져오지 못했어요.");
    } finally {
      setBusy(false);
    }
  }

  function continueBook() {
    resetDrawing();
    go("upload");
  }

  function startNewBook() {
    if (book && !window.confirm("지금 책을 지우고 새 책을 시작할까요? 필요하면 먼저 인쇄·PDF로 저장해주세요.")) return;
    const storage = browserStorage();
    if (storage) clearBook(storage);
    setBook(null);
    resetDrawing();
    setError("");
    setStage("upload");
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
        <div
          className="step-count"
          aria-label={
            stage === "book" ? "동화책 보기" : stage === "friends" ? "친구 이야기 고르기" : `전체 5단계 중 ${activeStep + 1}단계`
          }
        >
          {stage === "book" ? "📖" : stage === "friends" ? "🤝" : progressLabel}
        </div>
      </header>

      {stage === "upload" && book ? (
        <section className="book-banner">
          <div>
            <p className="eyebrow">{bookFull ? "완성된 동화책이 있어요" : `${chapterNumber}편 이어 그리기`}</p>
            <b>📖 {book.chapters[0]?.story.titleKo} · {book.chapters.length}/{MAX_CHAPTERS}편</b>
            <small>
              {bookFull
                ? "새 그림을 올리면 새 책이 시작돼요. 지금 책은 먼저 인쇄해두세요."
                : `지난 이야기: ${book.chapters.at(-1)?.story.summaryKo}`}
            </small>
          </div>
          <div className="book-banner-actions">
            <button type="button" onClick={() => go("book")}>책 보기</button>
            <button type="button" onClick={startNewBook}>새 책 시작</button>
          </div>
        </section>
      ) : null}

      {stage === "upload" && !book ? (
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

      {stage !== "book" && stage !== "friends" ? (
      <nav className="stepper" aria-label="이야기 만들기 진행 단계">
        {stageOrder.map((item, index) => (
          <div className={`step-dot ${index <= activeStep ? "active" : ""}`} key={item}>
            <span>{index + 1}</span>
            <small>{stageLabels[item]}</small>
          </div>
        ))}
      </nav>
      ) : null}

      <section className="studio-card">
        {stage !== "upload" && stage !== "offline" && !choosing && backTarget[stage] ? (
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
              <h2>{continuing ? "다음 장면 그림을 올려주세요" : "오늘의 그림일기를 올려주세요"}</h2>
              <p>{continuing ? "AI가 지난 이야기에 이어서 새 편을 써요." : "그림과 손글씨를 AI가 함께 읽어요."}</p>
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
            {!book ? (
              <button className="friend-entry" type="button" onClick={() => go("friends")}>
                <span aria-hidden="true">🤝</span>
                <b>친구가 쓰다 만 이야기, 내가 완성해볼까?</b>
                <small>친구 이야기를 읽고 다음 장면을 그리면 함께 지은 책이 돼요</small>
              </button>
            ) : null}

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
            <p className="privacy-note">서버에는 저장하지 않아요. 만든 책은 이 기기 브라우저에만 보관되고 언제든 지울 수 있어요.</p>
            </div>

            <button className="primary-button" type="submit" disabled={!canSubmitUpload || busy}>
              {busy ? "그림 속 이야기를 찾고 있어요…" : "이야기 시작하기 →"}
            </button>
          </form>
        ) : null}

        {stage === "friends" ? (
          <FriendPicker busy={busy} onPick={startFriendBook} onBack={() => go("upload")} />
        ) : null}

        {stage === "review" && analysis ? (
          <div className="stage-panel compact-panel trust-panel">
            <div className="stage-heading">
              <span className="stage-emoji" aria-hidden="true">🔎</span>
              <p className="eyebrow">AI가 이렇게 이해했어요</p>
              <h2>이야기를 만들기 전에<br />부모님이 한 번 확인해주세요.</h2>
            </div>
            {continuing && book ? (
              <p className="previous-summary"><b>지난 이야기</b>{book.chapters.at(-1)?.story.summaryKo}</p>
            ) : null}
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
              {busy
                ? "이야기의 시작을 만드는 중이에요…"
                : continuing
                  ? `${chapterNumber}편 이어서 만들기 →`
                  : "내 그림 이야기 만들기 →"}
            </button>
          </div>
        ) : null}

        {stage === "story" && opening && choosing ? (
          <>
            <button className="back-button" type="button" onClick={() => setChoosing(false)} disabled={busy}>
              ← 이야기 다시 보기
            </button>
            <ChoicePicker
              opening={opening}
              language={language}
              nickname={nickname}
              busy={busy}
              speak={speak}
              onChoose={chooseNext}
            />
          </>
        ) : null}

        {stage === "story" && storyTitle && currentPage && !choosing ? (
          <div className="story-stage">
            <div className="story-topline">
              <div><p className="eyebrow">{chapterNumber > 1 ? `${chapterNumber}편 · 이어지는 이야기` : "내 그림이 살아나는 이야기"}</p><h2>{language === "en" ? storyTitle.titleEn : storyTitle.titleKo}</h2></div>
              <strong>{pageIndex + 1} / {STORY_PAGES}</strong>
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
              {story?.choice && pageIndex === OPENING_PAGES ? (
                <span className="choice-badge">{story.choice.byVoice ? "🎤" : "👆"} {nickname}의 선택 · {story.choice.ko}</span>
              ) : null}
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
              {pageIndex < storyPages.length - 1 ? (
                <button className="primary-inline" type="button" onClick={() => setPageIndex((index) => Math.min(storyPages.length - 1, index + 1))}>다음 장 →</button>
              ) : !story ? (
                <button className="primary-inline" type="button" onClick={startChoosing}>다음은 {nickname}의 차례 →</button>
              ) : (
                <button className="primary-inline" type="button" onClick={finishChapter} disabled={busy}>
                  {busy ? "책에 담는 중…" : "책에 담고 다음으로 →"}
                </button>
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
            {book?.origin ? (
              <p className="coauthor-line">
                {bookFull
                  ? `${book.origin.authorName}의 이야기를 ${withParticle(nickname, "이가", "가")} 완성했어요! 🎉`
                  : `${book.origin.authorName}의 이야기를 ${withParticle(nickname, "이가", "가")} 이어 갔어요!`}
              </p>
            ) : null}
            {book && !bookFull ? (
              <>
                <div className="paper-prompt">
                  <span>✏️</span>
                  <b>다 그렸으면 사진을 올려 {book.chapters.length + 1}편을 이어가요</b>
                  <small>지금까지 {book.chapters.length}/{MAX_CHAPTERS}편 · 책은 이 기기에 보관돼요</small>
                </div>
                <div className="offline-actions">
                  <button className="primary-button" type="button" onClick={continueBook}>다음 장면 그림 올리기 →</button>
                  <button className="secondary-button" type="button" onClick={() => go("book")}>지금까지 만든 책 보기</button>
                  <button className="text-button" type="button" onClick={() => setFinished(true)}>오늘은 여기까지 ✓</button>
                </div>
              </>
            ) : (
              <>
                <div className="paper-prompt"><span>🎉</span><b>{MAX_CHAPTERS}편짜리 동화책이 완성됐어요!</b></div>
                <div className="offline-actions">
                  <button className="primary-button" type="button" onClick={() => go("book")}>완성된 책 보기 📖</button>
                  <button className="text-button" type="button" onClick={() => setFinished(true)}>오늘은 여기까지 ✓</button>
                </div>
              </>
            )}
            {finished ? <p className="finish-message" role="status">잘했어요! 이제 종이와 색연필을 준비해볼까요?</p> : null}
          </div>
        ) : null}

        {stage === "book" && book ? (
          <StoryBookView book={book} onContinue={continueBook} onNewBook={startNewBook} />
        ) : null}
      </section>

      <footer>그림이야기는 아이를 화면에 더 오래 머물게 하지 않아요.</footer>
    </div>
  );
}
