// 그림이야기 - 아이 주도 흐름 (홈 → 그림 올리기 → 부모 확인 → 언어 고르기 → 이야기 보기 → 다시 그리기)
// public/shared의 공용 모듈을 브라우저에서 그대로 import한다.

import { withParticle } from "./shared/korean.js";
import { transitionStage } from "./shared/wizard.js";
import { combineStory } from "./shared/story-normalize.js";
import { demoSampleImagePath } from "./shared/demo-data.js";
import { appendChapter, clearBook, isBookFull, loadBook, loadBookLibrary, saveBook } from "./shared/book-storage.js";
import { seedBooks } from "./shared/seed-books.js";
import { MAX_CHAPTERS, OPENING_PAGES, STORY_PAGES } from "./shared/story-types.js";
import { getCharacterBox, getPageFraming } from "./shared/page-composition.js";
import { getRecurringWords, isCloseMatch, isPracticed, markPracticed } from "./shared/word-practice.js";
import { childJourneySteps, choiceIconForChoice, homeActions, icons, missionHints } from "./shared/design-copy.js";
import { buildParentRecord } from "./shared/parent-record.js";
import { buildBookCover, formatCoverDate } from "./shared/book-cover.js";

const root = document.querySelector("#app-root");

const stageLabels = {
  home: "시작",
  upload: "그림 올리기",
  review: "부모 확인",
  language: "언어 고르기",
  story: "이야기 보기",
  offline: "다시 그리기",
  shelf: "책장",
  book: "동화책",
  friends: "친구 이야기",
  relayRead: "앞 이야기"
};
const backTarget = { upload: "home", friends: "home", relayRead: "friends", review: "upload", language: "review", story: "language", book: "shelf" };
const sceneClasses = ["scene-dino", "scene-magic", "scene-sea", "scene-night"];

function browserStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** @type {any} */
const state = {
  stage: "home",
  nickname: "수민",
  age: 7,
  imageDataUrl: "",
  imageReferenceDataUrl: "",
  imageName: "",
  draftUnsaved: false,
  privacyChecked: false,
  analysis: null,
  language: "both",
  opening: null,
  choosing: false,
  choiceSelection: null, // { kind: "card", index } | { kind: "own" }
  ownText: "",
  ownByVoice: false,
  voiceError: "",
  story: null,
  pageIndex: 0,
  busy: false,
  error: "",
  demoMode: false,
  finished: false,
  book: null,
  library: [],
  shelfView: "album",
  shelfSort: "newest",
  characterCutoutDataUrl: "",
  // "cutout" = 주인공만 오려 배경에 얹기, "whole" = 그림 전체를 액자로 보여 주기
  artMode: "whole",
  pageArt: {}, // pageIndex -> { imageDataUrl, framing, textSide }
  bookIndex: 0,
  selectedSeedId: "",
  bookArtPending: {},
  bookArtErrors: {},
  // "계속 나온 단어" 발음 연습 진행 상태. en(소문자) -> { listening, attempts, feedback }.
  // 도장(book.practiced)과 달리 새로고침하면 사라진다 — 그 자리에서의 시도 표시일 뿐이다.
  wordPractice: {}
};

(function init() {
  const storage = browserStorage();
  const saved = storage ? loadBook(storage) : null;
  state.library = storage ? loadBookLibrary(storage) : [];
  if (saved) {
    state.book = saved;
    if (!state.library.some((book) => book.id === saved.id)) {
      state.library = [saved, ...state.library];
      if (storage) saveBook(storage, saved);
    }
    if (!isBookFull(saved)) {
      state.nickname = saved.nickname;
      state.age = saved.age;
      state.language = saved.language;
    }
  }
  // #parent로 바로 들어오면(새로고침 포함) 부모 화면부터 연다. 보여 줄 책이 없으면 무시한다.
  if (window.location.hash === "#parent" && state.book && state.book.chapters.length) {
    state.stage = "parent";
  }
  render();
})();

function bookFull() {
  return isBookFull(state.book);
}

function syncLibrary(storage = browserStorage()) {
  state.library = storage ? loadBookLibrary(storage) : state.book ? [state.book] : [];
}

function shelfBooks() {
  const books = [...state.library];
  if (state.book && !books.some((book) => book.id === state.book.id)) books.unshift(state.book);
  const direction = state.shelfSort === "oldest" ? 1 : -1;
  return books
    .filter((book) => book && book.chapters?.length)
    .sort((a, b) => direction * (bookDateTime(a) - bookDateTime(b)));
}

function bookDateTime(book) {
  const value = Date.parse(book.updatedAt || book.createdAt);
  return Number.isFinite(value) ? value : 0;
}

function formatBookDate(book) {
  return formatCoverDate(book.updatedAt || book.createdAt);
}

function activateBook(book) {
  state.book = book;
  state.nickname = book.nickname;
  state.age = book.age;
  state.language = book.language;
  state.bookIndex = 0;
}

function continuing() {
  return Boolean(state.book && state.book.chapters.length > 0 && !bookFull());
}
function chapterNumber() {
  return continuing() ? state.book.chapters.length + 1 : 1;
}

function go(next) {
  state.error = "";
  const wasParent = state.stage === "parent";
  state.stage = transitionStage(state.stage, next);
  if (state.stage === "parent") setParentHash(true);
  else if (wasParent) setParentHash(false);
  render();
}

/** 부모 화면에 들어가고 나갈 때 주소의 #parent를 맞춘다. 새로고침해도 부모 화면이 유지된다. */
function setParentHash(active) {
  try {
    if (active) {
      if (window.location.hash !== "#parent") window.location.hash = "parent";
    } else if (window.location.hash === "#parent") {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  } catch {
    // 주소를 못 바꿔도 화면 자체는 그대로 동작한다.
  }
}

function setError(message) {
  state.error = message || "";
  render();
}

function speak(text, locale) {
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

/* ---------------------------- 파일/그림 처리 ---------------------------- */

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("그림 파일을 읽지 못했어요."));
    reader.readAsDataURL(file);
  });
}

function sampleToPng(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
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

function shrinkImage(dataUrl, maxSide = 1280) {
  return new Promise((resolve) => {
    const image = new Image();
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

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

// 팀원 코드 유지 + 개선: 흰 종이 배경을 지우고, 가장 큰 덩어리(주인공)만 오려낸다.
// 그림일기의 손글씨처럼 따로 떨어진 작은 덩어리는 버린다.
function extractCharacter(dataUrl) {
  return new Promise((resolve) => {
    if (!dataUrl) {
      resolve({ dataUrl: "", mode: "whole" });
      return;
    }
    const image = new Image();
    image.onload = () => {
      const maxSide = 900;
      const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(image, 0, 0, width, height);

      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;
      const ink = new Uint8Array(width * height);

      for (let i = 0; i < width * height; i += 1) {
        const index = i * 4;
        const r = data[index];
        const g = data[index + 1];
        const b = data[index + 2];
        // 종이일수록 투명하게, 크레용 자국일수록 진하게. 딱 잘라내지 않고 서서히 흐려지게 해서
        // 가장자리에 검은 테두리가 남지 않도록 한다.
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
        const colorfulness = Math.max(r, g, b) - Math.min(r, g, b);
        const darkness = clamp01((238 - luminance) / 70);
        const colored = clamp01((colorfulness - 12) / 40);
        const strength = Math.max(darkness, colored);
        const alpha = Math.round(Math.min(data[index + 3], 255) * clamp01(strength * 1.15));
        data[index + 3] = alpha;
        if (alpha > 90) ink[i] = 1;
      }
      ctx.putImageData(imageData, 0, 0);

      const box = largestInkBox(ink, width, height);
      if (!box) {
        // 오려내기에 실패하면 그림 전체를 액자로 보여 준다.
        resolve({ dataUrl, mode: "whole" });
        return;
      }

      // 그림이 화면 대부분을 차지하거나 사방에 닿으면 "장면 그림"으로 보고 오려내지 않는다.
      const coverage = ((box.maxX - box.minX) * (box.maxY - box.minY)) / (width * height);
      const edge = Math.round(Math.min(width, height) * 0.04);
      const touched =
        (box.minX <= edge ? 1 : 0) +
        (box.minY <= edge ? 1 : 0) +
        (box.maxX >= width - edge ? 1 : 0) +
        (box.maxY >= height - edge ? 1 : 0);
      if (coverage > 0.55 || touched >= 3) {
        resolve({ dataUrl, mode: "whole" });
        return;
      }

      const padding = 18;
      const sx = Math.max(0, box.minX - padding);
      const sy = Math.max(0, box.minY - padding);
      const sw = Math.min(width - sx, box.maxX - box.minX + padding * 2);
      const sh = Math.min(height - sy, box.maxY - box.minY + padding * 2);
      const output = document.createElement("canvas");
      output.width = sw;
      output.height = sh;
      output.getContext("2d").drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);
      resolve({ dataUrl: output.toDataURL("image/png"), mode: "cutout" });
    };
    image.onerror = () => resolve({ dataUrl, mode: "whole" });
    image.src = dataUrl;
  });
}

/**
 * 이어진 그림 덩어리를 모두 찾아, 가장 큰 덩어리와 그에 맞붙은 덩어리만 감싸는 사각형을 돌려준다.
 * 손글씨 줄처럼 멀리 떨어진 작은 덩어리는 빠진다.
 */
function largestInkBox(ink, width, height) {
  const label = new Int32Array(width * height).fill(-1);
  const stack = new Int32Array(width * height);
  const blobs = [];

  for (let start = 0; start < ink.length; start += 1) {
    if (!ink[start] || label[start] !== -1) continue;
    const id = blobs.length;
    let top = 0;
    stack[top++] = start;
    label[start] = id;
    const blob = { area: 0, minX: width, minY: height, maxX: 0, maxY: 0 };

    while (top > 0) {
      const current = stack[--top];
      const x = current % width;
      const y = (current - x) / width;
      blob.area += 1;
      if (x < blob.minX) blob.minX = x;
      if (x > blob.maxX) blob.maxX = x;
      if (y < blob.minY) blob.minY = y;
      if (y > blob.maxY) blob.maxY = y;

      if (x > 0 && ink[current - 1] && label[current - 1] === -1) { label[current - 1] = id; stack[top++] = current - 1; }
      if (x < width - 1 && ink[current + 1] && label[current + 1] === -1) { label[current + 1] = id; stack[top++] = current + 1; }
      if (y > 0 && ink[current - width] && label[current - width] === -1) { label[current - width] = id; stack[top++] = current - width; }
      if (y < height - 1 && ink[current + width] && label[current + width] === -1) { label[current + width] = id; stack[top++] = current + width; }
    }
    blobs.push(blob);
  }

  if (!blobs.length) return null;

  const main = blobs.reduce((best, blob) => (blob.area > best.area ? blob : best), blobs[0]);
  const margin = Math.round(Math.min(width, height) * 0.05);
  const box = { minX: main.minX, minY: main.minY, maxX: main.maxX, maxY: main.maxY };

  // 눈·색칠처럼 주인공 근처에 있거나 충분히 큰 덩어리는 함께 감싼다.
  blobs.forEach((blob) => {
    if (blob === main) return;
    const nearby =
      blob.maxX >= main.minX - margin &&
      blob.minX <= main.maxX + margin &&
      blob.maxY >= main.minY - margin &&
      blob.minY <= main.maxY + margin;
    if (!nearby && blob.area < main.area * 0.35) return;
    box.minX = Math.min(box.minX, blob.minX);
    box.minY = Math.min(box.minY, blob.minY);
    box.maxX = Math.max(box.maxX, blob.maxX);
    box.maxY = Math.max(box.maxY, blob.maxY);
  });

  if (box.minX >= box.maxX || box.minY >= box.maxY) return null;
  return box;
}

/* ---------------------------- API 호출 ---------------------------- */

async function apiPost(path, payload) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "요청을 처리하지 못했어요.");
  return data;
}

function storyRequestBase() {
  return {
    analysis: state.analysis,
    nickname: state.nickname.trim(),
    age: state.age,
    previousChapters:
      continuing() && state.book
        ? state.book.chapters.map((chapter) => ({ titleKo: chapter.story.titleKo, summaryKo: chapter.story.summaryKo }))
        : []
  };
}

/** 현재 쪽과 다음 쪽 삽화를 만든다. 실패해도 원본 그림을 대체 삽화처럼 보여주지 않는다. */
async function ensurePageArt(index, { force = false } = {}) {
  if (!state.story && !state.opening) return;
  if (state.pageArt[index] && !force) return;
  const pages = state.story ? state.story.pages : state.opening.pages;
  const page = pages[index];
  if (!page) return;
  state.pageArt[index] = { loading: true };
  // 기다리는 동안 "그리는 중" 안내가 보이도록 먼저 한 번 그린다.
  if (index === state.pageIndex) renderStoryImageOnly();
  try {
    const data = await apiPost("/api/page-art", {
      analysis: state.analysis,
      imageDataUrl: state.imageReferenceDataUrl || state.imageDataUrl,
      visualDescription: page.visualDescription || page.en || page.ko,
      pageIndex: index
    });
    state.pageArt[index] = { imageDataUrl: data.imageDataUrl || "", framing: data.framing, textSide: data.textSide };
  } catch {
    state.pageArt[index] = { imageDataUrl: "", error: true };
  }
  renderStoryImageOnly();
}

/* ---------------------------- 렌더링 ---------------------------- */

function render() {
  root.innerHTML = `
    ${brandBarHtml()}
    ${state.stage === "home" ? heroHtml() : ""}
    <div class="studio-shell stage-${state.stage}">
      ${state.stage === "upload" && state.book ? bookBannerHtml() : ""}
      ${["home", "book", "friends", "relayRead", "shelf", "parent"].includes(state.stage) ? "" : stepperHtml()}
      <section class="studio-card">
        ${stageContentHtml()}
      </section>
      <footer class="app-footer">매직북은 아이의 그림에서 시작해 이야기를 함께 만들어요.</footer>
    </div>
  `;
  bindEvents();
  if (state.stage === "story" && !state.choosing) {
    const activePage = state.story ? state.pageIndex - OPENING_PAGES : state.pageIndex;
    ensurePageArt(state.pageIndex);
    // 다음 쪽은 한 장만 앞서 만든다(시연이 늘어지지 않도록).
    const pages = state.story ? state.story.pages : state.opening.pages;
    if (state.pageIndex + 1 < pages.length) ensurePageArt(state.pageIndex + 1);
  }
}

function renderStoryImageOnly() {
  // 이미지 비동기 로드 결과만 반영하려고 전체를 다시 그린다(간단함 우선).
  if (state.stage === "story" && !state.choosing) render();
}

/**
 * 아이 화면 어디서나 보이는 머리말. 책이 하나라도 있을 때만 "부모" 버튼을 보여 준다
 * — 보여 줄 기록이 없으면 굳이 버튼을 둘 이유가 없다. 아이 화면 버튼과 다르게
 * 작고 회색 톤으로 두어, 눈에 덜 띄고 아이가 실수로 누르기 어렵게 한다.
 */
function brandBarHtml() {
  const showParent = Boolean(state.book && state.book.chapters.length);
  const home = state.stage === "home";
  const brandImage = home
    ? `<img class="brand-full-logo" src="/assets/brand/magicbook-logo.png" alt="매직북 Magicbook" />`
    : `${iconImg("brand", "", "brand-icon")}<img class="brand-wordmark" src="/assets/brand/magicbook-wordmark.png" alt="" />`;
  return `
    <header class="brand-bar ${home ? "brand-bar-home" : ""}">
      <button type="button" class="brand-mark ${home ? "brand-mark-home" : ""}" data-action="go-home" aria-label="매직북 처음 화면으로 가기">${brandImage}</button>
      ${showParent ? `<button type="button" class="parent-entry-button" data-action="view-parent">${iconImg("parent")}부모</button>` : ""}
    </header>
  `;
}

function bookBannerHtml() {
  const book = state.book;
  return `
    <section class="book-banner">
      <div>
        <p class="eyebrow">${bookFull() ? "완성된 동화책이 있어요" : `${chapterNumber()}편 이어 그리기`}</p>
        <b>${escapeHtml(book.chapters[0]?.story.titleKo || "")} · ${book.chapters.length}/${MAX_CHAPTERS}편</b>
        <small>${
          bookFull()
            ? "새 그림은 새 책으로 시작해요. 지금 책은 책장에 보관돼요."
            : `지난 이야기: ${escapeHtml(book.chapters.at(-1)?.story.summaryKo || "")}`
        }</small>
      </div>
      <div class="book-banner-actions">
        <button type="button" data-action="view-book">${iconImg("read")}책 보기</button>
        <button type="button" data-action="new-book">${iconImg("newDrawing")}새 책 시작</button>
      </div>
    </section>
  `;
}

function stepperHtml() {
  const activeStage = state.choosing ? "choice" : state.stage === "language" ? "review" : state.stage;
  const activeStep = childJourneySteps.findIndex((step) => step.stage === activeStage);
  return `
    <p class="step-count">이야기 여행</p>
    <nav class="stepper" aria-label="이야기 만들기 진행 단계">
      ${childJourneySteps
        .map(
          (step, index) => `
        <div class="step-dot ${index <= activeStep ? "active" : ""}">
          <span>${iconImg(step.icon)}</span>
          <small>${step.label}</small>
        </div>`
        )
        .join("")}
    </nav>
  `;
}

function stageContentHtml() {
  const backBtn =
    !["home", "offline", "parent"].includes(state.stage) && !state.choosing && backTarget[state.stage]
      ? `<button class="back-button" type="button" data-action="back" data-target="${backTarget[state.stage]}">← 이전</button>`
      : "";
  const demoBadge = state.demoMode ? `<p class="demo-badge">예제 모드 · API 키 없이 실행 중인 안전한 발표 데모예요.</p>` : "";
  const errorMsg = state.error ? `<p class="error-message" role="alert">${escapeHtml(state.error)}</p>` : "";

  let body = "";
  if (state.stage === "home") body = homeHtml();
  else if (state.stage === "upload") body = uploadHtml();
  else if (state.stage === "friends") body = friendsHtml();
  else if (state.stage === "relayRead") body = relayReadHtml();
  else if (state.stage === "review") body = reviewHtml();
  else if (state.stage === "language") body = languageHtml();
  else if (state.stage === "story") body = state.choosing ? choiceHtml() : storyHtml();
  else if (state.stage === "offline") body = offlineHtml();
  else if (state.stage === "shelf") body = shelfHtml();
  else if (state.stage === "book") body = bookViewHtml();
  else if (state.stage === "parent") body = parentRecordHtml();

  return `${backBtn}${demoBadge}${errorMsg}${body}`;
}

/* -------- 시작 화면 -------- */

function homeHtml() {
  const hasBook = Boolean(state.book && state.book.chapters.length);
  const cover = hasBook ? buildBookCover(state.book) : null;
  return `
    <div class="stage-panel home-panel">
      <div class="home-heading">
        <p class="eyebrow">매직북</p>
        <h2>${hasBook ? "이야기를 이어가 볼까요?" : "오늘은 어떤 그림을 그려볼까요?"}</h2>
        <p>${hasBook ? "만들던 책을 읽거나 다음 장면을 더해보세요." : "종이에 그린 그림에서 새로운 이야기가 시작돼요."}</p>
      </div>

      <div class="home-actions">
        ${
          hasBook
            ? `<button class="home-resume" type="button" data-action="view-book">
                <span class="home-resume-art">${cover.imageDataUrl ? `<img src="${cover.imageDataUrl}" alt="" />` : iconImg("myBook")}</span>
                <span class="home-resume-copy">
                  <small>${cover.statusLabel} · ${cover.progressLabel}</small>
                  <b>${escapeHtml(cover.title)}</b>
                  <span>${escapeHtml(cover.ownerLabel)}</span>
                </span>
                <span class="home-resume-action">지금까지 읽기 <span aria-hidden="true">→</span></span>
              </button>`
            : ""
        }
        <div class="home-start-options">
          <button type="button" data-action="${hasBook ? "new-book" : "start-upload"}">
            ${iconImg("newDrawing")}<span><b>새 그림</b><small>${hasBook ? "새 이야기를 시작해요" : "그림을 올려 새 이야기를 만들어요"}</small></span><span class="home-option-arrow" aria-hidden="true">→</span>
          </button>
          <button type="button" data-action="go-friends">
            ${iconImg("friendBook")}<span><b>친구 책</b><small>앞 이야기에 내 장면을 더해요</small></span><span class="home-option-arrow" aria-hidden="true">→</span>
          </button>
        </div>
      </div>

      <p class="privacy-note home-note">그림은 이야기와 삽화를 만드는 데 사용되며, 만든 책은 이 브라우저에 보관돼요. 그림이 OpenAI와 Higgsfield에 전송돼요.</p>
    </div>
  `;
}

function heroHtml() {
  return `
    <section class="hero" id="hero-banner" aria-labelledby="hero-title">
      <div class="hero-copy">
        <p class="eyebrow">그림 → 이야기 → 다시 그림</p>
        <h1 id="hero-title">그림이 다음 이야기를<br />불러와요</h1>
        <p class="lead">종이에 그린 장면을 동화로 읽고, 아이가 고른 다음 장면을 다시 종이에 그려요.</p>
      </div>
      <figure class="hero-preview" aria-hidden="true">
        <img src="/seed-dino-1.png" alt="" />
        <figcaption>
          <b>아이가 그린 첫 장면</b>
          <span>공룡이 책을 읽는 밤</span>
        </figcaption>
      </figure>
    </section>
  `;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}

function iconImg(name, alt = "", className = "ui-icon") {
  const src = icons[name];
  if (!src) return "";
  return `<img class="${className}" src="${src}" alt="${escapeHtml(alt)}" ${alt ? "" : 'aria-hidden="true"'} />`;
}

/* -------- 1단계: 그림 올리기 -------- */

function uploadHtml() {
  const heading = continuing() ? "다음 장면을 올려요" : "그림을 올려요";
  const desc = continuing() ? "AI가 지난 이야기에 이어서 새 편을 써요." : "그림과 손글씨를 AI가 함께 읽어요.";
  return `
    <form class="stage-panel" id="upload-form">
      <div class="stage-heading">
        <p class="eyebrow">부모님과 함께 시작해요</p>
        <h2>${heading}</h2>
        <p>${desc}</p>
      </div>

      <label class="upload-box ${state.imageDataUrl ? "has-image" : ""}">
        <input type="file" id="image-input" accept="image/jpeg,image/png,image/webp" />
        ${
          state.imageDataUrl
            ? `<img src="${state.imageDataUrl}" alt="올린 그림일기 미리보기" />`
            : `<span>${iconImg("photoUpload", "", "upload-icon")}<b>그림 사진 선택</b><small>JPG, PNG, WebP · 최대 8MB</small></span>`
        }
      </label>
      ${state.imageName ? `<p class="file-name">${escapeHtml(state.imageName)}</p>` : ""}
      <button class="text-button" type="button" data-action="use-sample">사진이 없나요? 예제로 시작하기</button>

      <div class="two-fields">
        <label>
          <span>아이 별명</span>
          <input id="nickname-input" maxlength="12" value="${escapeHtml(state.nickname)}" placeholder="예: 수민" />
        </label>
        <label>
          <span>나이</span>
          <select id="age-input">
            ${[5, 6, 7, 8, 9, 10, 11, 12].map((v) => `<option value="${v}" ${v === state.age ? "selected" : ""}>${v}세</option>`).join("")}
          </select>
        </label>
      </div>

      <div class="trust-box">
        <label class="privacy-check">
          <input type="checkbox" id="privacy-input" ${state.privacyChecked ? "checked" : ""} />
          <span>개인정보가 보이지 않고, 외부 AI 처리 안내를 확인했어요.</span>
        </label>
        <p class="privacy-note">그림은 이야기 분석을 위해 OpenAI에, 삽화 생성을 위해 Higgsfield에 전송돼요. 앱 서버에는 저장하지 않으며, 만든 책은 이 브라우저에만 보관돼요.</p>
      </div>

      <button class="primary-button" type="submit" ${canSubmitUpload() ? "" : "disabled"} ${state.busy ? "disabled" : ""}>
        ${state.busy ? "그림 속 이야기를 찾고 있어요…" : "이야기 시작하기"}
      </button>
    </form>
  `;
}

function canSubmitUpload() {
  return Boolean(state.imageDataUrl && state.nickname.trim() && state.age >= 5 && state.age <= 12 && state.privacyChecked);
}

/* -------- 친구 이야기 고르기 -------- */

function friendsHtml() {
  return `
    <div class="stage-panel friend-panel">
      <div class="stage-heading">
        <span class="stage-emoji" aria-hidden="true">${iconImg("friendBook")}</span>
        <p class="eyebrow">친구 책</p>
        <h2>어떤 책을 이어 그릴까?</h2>
        <p>친구가 만든 장면을 먼저 읽고, 내 그림으로 릴레이 그림책을 이어가요.</p>
      </div>
      <p class="seed-note">안내 · 지금 보이는 이야기는 매직북 팀이 만든 예시예요.</p>
      <div class="seed-list">
        ${seedBooks
          .map(
            (seed) => `
          <article class="seed-card">
            <div class="seed-art">
              <img src="${seed.chapters[0].imagePath}" alt="${escapeHtml(seed.authorName)}의 그림" />
              <span class="seed-emoji" aria-hidden="true">${iconImg("friendBook")}</span>
            </div>
            <div class="seed-body">
              <p class="eyebrow">${escapeHtml(seed.authorName)}(${seed.authorAge}세) · ${seed.chapters.length}/${MAX_CHAPTERS}편</p>
              <h3>${escapeHtml(seed.chapters[0].story.titleKo)}</h3>
              <p class="seed-hook">${escapeHtml(seed.hook)}</p>
              <button class="primary-button" type="button" data-action="preview-friend" data-seed-id="${seed.id}">
                앞 이야기 보기 →
              </button>
              <small>남은 편: ${MAX_CHAPTERS - seed.chapters.length}편</small>
            </div>
          </article>
        `
          )
          .join("")}
      </div>
      <button class="text-button" type="button" data-action="go-home">${iconImg("home")}처음 화면으로</button>
    </div>
  `;
}

function selectedSeed() {
  return seedBooks.find((seed) => seed.id === state.selectedSeedId) || seedBooks[0];
}

function relayReadHtml() {
  const seed = selectedSeed();
  if (!seed) return "";
  const chapters = seed.chapters;
  const last = chapters.at(-1);
  return `
    <div class="stage-panel relay-panel">
      <div class="stage-heading">
        <span class="stage-emoji" aria-hidden="true">${iconImg("friendBook")}</span>
        <p class="eyebrow">${escapeHtml(withParticle(seed.authorName, "이가", "가"))} 시작한 이야기 · ${seed.authorAge}세</p>
        <h2>${escapeHtml(chapters[0].story.titleKo)}</h2>
        <p>${escapeHtml(seed.hook)}</p>
      </div>

      <div class="relay-reader">
        ${chapters
          .map(
            (chapter, index) => `
          <article class="relay-chapter">
            <img src="${chapter.imagePath}" alt="${escapeHtml(seed.authorName)}의 ${index + 1}편 그림" />
            <div>
              <p class="eyebrow">${index + 1}편 · ${escapeHtml(seed.authorName)} 그림</p>
              <h3>${escapeHtml(chapter.story.titleKo)}</h3>
              <p class="relay-pages-label">이야기 전체</p>
            </div>
            <ol class="relay-story-pages">
              ${chapter.story.pages
                .map(
                  (page) => `
                <li>
                  ${state.language !== "en" ? `<p lang="ko">${escapeHtml(page.ko)}</p>` : ""}
                  ${state.language !== "ko" ? `<p class="relay-page-en" lang="en">${escapeHtml(page.en)}</p>` : ""}
                </li>`
                )
                .join("")}
            </ol>
          </article>`
          )
          .join("")}
      </div>

      <div class="mission-card mission-sheet">
        <p class="eyebrow">다음 장면 미션</p>
        <h3>${escapeHtml(last.story.offlinePromptKo)}</h3>
        ${missionHintsHtml()}
      </div>

      <button class="primary-button" type="button" data-action="start-friend-relay" data-seed-id="${seed.id}" ${state.busy ? "disabled" : ""}>
        ${state.busy ? "이야기를 가져오는 중…" : `사진 올리기`}
      </button>
    </div>
  `;
}

/* -------- 2단계: 부모 확인 -------- */

function reviewHtml() {
  const a = state.analysis;
  if (!a) return "";
  return `
    <div class="stage-panel compact-panel trust-panel">
      <div class="stage-heading">
        <span class="stage-emoji" aria-hidden="true">${iconImg("review")}</span>
        <p class="eyebrow">AI가 이렇게 이해했어요</p>
        <h2>그림 속 이야기가 맞나요?</h2>
      </div>
      ${
        continuing() && state.book
          ? `<p class="previous-summary"><b>지난 이야기</b>${escapeHtml(state.book.chapters.at(-1)?.story.summaryKo || "")}</p>`
          : ""
      }
      <div class="review-grid">
        <label><span>등장인물</span><input id="field-characters" value="${escapeHtml(a.characters.join(", "))}" placeholder="예: 공룡, 수민이" /></label>
        <label><span>장소</span><input id="field-place" value="${escapeHtml(a.place)}" placeholder="예: 숲속" /></label>
        <label><span>사물</span><input id="field-objects" value="${escapeHtml(a.objects.join(", "))}" placeholder="예: 꽃, 나비" /></label>
        <label><span>분위기</span><input id="field-mood" value="${escapeHtml(a.mood)}" placeholder="예: 신나는 기분" /></label>
        <label class="wide-field"><span>그림일기 글 <small>(없으면 비워 두세요)</small></span><textarea id="field-diary" rows="4" placeholder="그림에 쓴 글이 있으면 여기에 보여요. 없으면 비워 두어도 괜찮아요.">${escapeHtml(a.diaryText)}</textarea></label>
      </div>
      <p class="helper-copy">${
        a.diaryText.trim() ? "손글씨를 잘못 읽은 부분만 편하게 고쳐주세요." : "글씨를 못 읽었어요. 아이에게 그림 이야기를 물어보고 한 줄만 적어주셔도 좋아요."
      }</p>
      <button class="primary-button" type="button" data-action="to-language">맞아요, 다음 →</button>
    </div>
  `;
}

function readReviewFields() {
  const characters = document.querySelector("#field-characters");
  const place = document.querySelector("#field-place");
  const objects = document.querySelector("#field-objects");
  const mood = document.querySelector("#field-mood");
  const diary = document.querySelector("#field-diary");
  if (!characters) return;
  state.analysis = {
    characters: characters.value.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 5),
    place: place.value.trim(),
    objects: objects.value.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 5),
    mood: mood.value.trim(),
    diaryText: diary.value.trim()
  };
}

/* -------- 3단계: 언어 고르기 -------- */

function languageHtml() {
  const options = [
    { value: "ko", mark: "가", title: "한국어로 읽기", desc: "한국어 이야기와 단어" },
    { value: "en", mark: "A", title: "Read in English", desc: "Easy English story and words" },
    { value: "both", mark: "가/A", title: "한국어 + English", desc: "같은 이야기를 두 언어로" }
  ];
  return `
    <div class="stage-panel compact-panel">
      <div class="stage-heading">
        <span class="stage-emoji" aria-hidden="true">${iconImg("read")}</span>
        <p class="eyebrow">편한 언어로 이해하고 배우는 언어로 다시 만나요</p>
        <h2>어떻게 읽을까요?</h2>
      </div>
      <div class="language-options">
        ${options
          .map(
            (opt) => `
          <button type="button" class="${state.language === opt.value ? "selected" : ""}" data-action="set-language" data-value="${opt.value}">
            <span class="language-mark">${escapeHtml(opt.mark)}</span><b>${opt.title}</b><small>${opt.desc}</small>
          </button>`
          )
          .join("")}
      </div>
      <button class="primary-button" type="button" data-action="generate-story" ${state.busy ? "disabled" : ""}>
        ${state.busy ? "이야기의 시작을 만드는 중이에요…" : continuing() ? `${chapterNumber()}편 이어서 만들기 →` : "내 그림 이야기 만들기 →"}
      </button>
    </div>
  `;
}

/* -------- 4단계: 이야기 보기 -------- */

function currentComposition(index) {
  const cached = state.pageArt[index];
  const { framing, textSide } = cached && cached.framing ? cached : getPageFraming(index);
  return { framing, textSide, ...getCharacterBox(framing, textSide) };
}

function storybookSceneHtml(page, index) {
  const art = state.pageArt[index];
  const imageDataUrl = art && art.imageDataUrl ? art.imageDataUrl : "";
  const drawing = Boolean(art && art.loading);
  const artFailed = Boolean(art && art.error);
  const composition = currentComposition(index);
  const scene = sceneClasses[index % sceneClasses.length];
  return `
    <div class="book-page ${scene} ${imageDataUrl ? "has-generated-art" : ""} ${drawing ? "is-generating-art" : ""}">
      <div class="storybook-scene framing-${composition.framing} ${drawing ? "is-generating" : ""} ${artFailed ? "has-art-error" : ""}">
        ${drawing ? `
          <div class="art-loading-screen" role="status" aria-live="polite">
            <span class="art-spinner" aria-hidden="true"></span>
            <p>그림 속 주인공을 살려<br />이야기 장면을 그리고 있어요</p>
          </div>
        ` : `
          ${imageDataUrl ? `<img id="generated-page-art" src="${imageDataUrl}" alt="아이 그림을 바탕으로 만든 동화책 삽화" />` : ""}
          ${!imageDataUrl ? `<div class="art-error-state" role="status">
            <p>${artFailed ? "이 페이지 삽화를 만들지 못했어요." : "페이지 삽화를 준비하고 있어요."}</p>
            ${artFailed ? `<button type="button" data-action="retry-page-art" data-index="${index}">다시 만들기</button>` : ""}
          </div>` : ""}
        `}
      </div>
      ${drawing ? "" : `<div class="page-copy">
        ${state.language !== "en" ? `<p class="korean-line">${escapeHtml(page.ko)}</p>` : ""}
        ${state.language !== "ko" ? `<p class="english-line">${escapeHtml(page.en)}</p>` : ""}
      </div>`}
      ${imageDataUrl && !drawing ? `<button class="text-button illustration-regenerate" type="button" data-action="regenerate-page-art" data-index="${index}">삽화 다시 만들기</button>` : ""}
    </div>
  `;
}

function storyHtml() {
  const storyPages = state.story ? state.story.pages : state.opening ? state.opening.pages : [];
  const currentPage = storyPages[state.pageIndex];
  const artPending = Boolean(state.pageArt[state.pageIndex]?.loading);
  const allArtSettled = storyPages.every((_, index) => state.pageArt[index] && !state.pageArt[index].loading);
  const storyTitle = state.story || state.opening;
  if (!storyTitle || !currentPage) return "";

  const listenButtons = `
    <div class="listen-row">
      ${state.language !== "en" ? `<button class="listen-button listen-button-ko" type="button" data-action="listen-ko" aria-label="한국어 이야기 듣기"><span class="listen-button-icon">${iconImg("listen")}</span><span>한국어 듣기</span></button>` : ""}
      ${state.language !== "ko" ? `<button class="listen-button listen-button-en" type="button" data-action="listen-en" aria-label="영어 이야기 듣기"><span class="listen-button-icon">${iconImg("listen")}</span><span>영어 듣기</span></button>` : ""}
    </div>
  `;
  const wordRow = `
    <div class="word-row">
      ${(currentPage.words || []).map((w) => `<span>${escapeHtml(w.ko)} · ${escapeHtml(w.en)}</span>`).join("")}
    </div>
  `;

  let navHtml = "";
  if (state.pageIndex < storyPages.length - 1) {
    navHtml = `<button class="primary-inline" type="button" data-action="story-next">다음 장 →</button>`;
  } else if (!state.story) {
    navHtml = `<button class="primary-inline" type="button" data-action="start-choosing">다음은 ${escapeHtml(state.nickname)}의 차례 →</button>`;
  } else {
    navHtml = `<button class="primary-inline" type="button" data-action="finish-chapter" ${state.busy || !allArtSettled ? "disabled" : ""}>${
      state.busy ? "책에 담는 중…" : !allArtSettled ? "삽화를 준비하고 있어요…" : "책에 담고 다음으로 →"
    }</button>`;
  }

  return `
    <div class="story-stage">
      <div class="story-topline">
        <div>
          <p class="eyebrow">${chapterNumber() > 1 ? `${chapterNumber()}편 · 이어지는 이야기` : "내 그림이 살아나는 이야기"}</p>
          <h2>${escapeHtml(state.language === "en" ? storyTitle.titleEn : storyTitle.titleKo)}</h2>
        </div>
        <strong>${state.pageIndex + 1} / ${STORY_PAGES}</strong>
      </div>
      ${storybookSceneHtml(currentPage, state.pageIndex)}
      ${artPending ? "" : `<div class="story-copy">
        ${
          state.story && state.story.choice && state.pageIndex === OPENING_PAGES
            ? `<span class="choice-badge">${state.story.choice.byVoice ? "말로" : "골라서"} ${escapeHtml(state.nickname)}의 선택 · ${escapeHtml(state.story.choice.ko)}</span>`
            : ""
        }
        ${listenButtons}
        ${wordRow}
      </div>`}
      <div class="story-nav">
        <button type="button" data-action="story-prev" ${state.pageIndex === 0 ? "disabled" : ""}>← 이전 장</button>
        ${navHtml}
      </div>
    </div>
  `;
}

/* -------- 갈림길 -------- */

function choiceHtml() {
  const opening = state.opening;
  if (!opening) return "";
  const question = state.language === "en" ? opening.questionEn || opening.questionKo : opening.questionKo;
  const englishLine = state.language === "both" && opening.questionEn ? `<p class="english-line">${escapeHtml(opening.questionEn)}</p>` : "";
  const ownSelected = state.choiceSelection && state.choiceSelection.kind === "own" && state.ownText.trim();

  return `
    <button class="back-button" type="button" data-action="stop-choosing" ${state.busy ? "disabled" : ""}>← 이야기 다시 보기</button>
    <div class="choice-panel">
      <div class="stage-heading">
        <p class="eyebrow">${escapeHtml(state.nickname)}의 다음 장면</p>
        <h2>${escapeHtml(question)}</h2>
        ${englishLine}
        <button class="listen-question" type="button" data-action="ask-again">${iconImg("listen")}질문 다시 듣기</button>
      </div>

      <p class="choice-instruction">마음에 드는 장면을 골라보세요</p>
      <div class="choice-cards" role="radiogroup" aria-label="다음 장면 고르기">
        ${opening.choices
          .map((card, index) => {
            const selected = state.choiceSelection && state.choiceSelection.kind === "card" && state.choiceSelection.index === index;
            const actionIcon = choiceIconForChoice(card);
            return `
            <button type="button" role="radio" aria-checked="${selected}" class="choice-card ${selected ? "selected" : ""}" data-action="pick-card" data-index="${index}">
              <span class="choice-emoji" aria-hidden="true">${iconImg(actionIcon)}</span>
              <span class="choice-labels">
                ${state.language !== "en" ? `<b>${escapeHtml(card.ko)}</b>` : ""}
                ${state.language !== "ko" ? `<small>${escapeHtml(card.en)}</small>` : ""}
              </span>
              <span class="choice-check" aria-hidden="true">${selected ? "✓" : ""}</span>
            </button>`;
          })
          .join("")}

        <div class="choice-card own-card ${state.choiceSelection && state.choiceSelection.kind === "own" ? "selected" : ""}">
          <span class="choice-emoji" aria-hidden="true">${iconImg("speak")}</span>
          <b>내 생각이 있어요</b>
          <label class="own-input">
            <span>부모님이 대신 적기</span>
            <input id="own-text-input" maxlength="60" placeholder="예: 조개를 집에 데려가기" value="${escapeHtml(state.ownText)}" />
          </label>
          ${
            voiceSupported()
              ? `<button type="button" class="voice-button ${state.voiceListening ? "listening" : ""}" data-action="voice-start">${
                  state.voiceListening ? "듣고 있어요…" : `${iconImg("speak")}말로 하기`
                }</button>`
              : ""
          }
        </div>
      </div>

      ${state.voiceError ? `<p class="voice-error" role="alert">${escapeHtml(state.voiceError)}</p>` : ""}

      <button class="primary-button choice-confirm" type="button" data-action="confirm-choice" ${!state.choiceSelection || state.busy ? "disabled" : ""}>
        ${state.busy ? "이야기를 이어 쓰고 있어요…" : state.choiceSelection ? "이 장면으로 이어가기" : "장면을 하나 골라주세요"}
      </button>
    </div>
  `;
}

function voiceSupported() {
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

/* -------- 5단계: 다시 그리기 -------- */

function offlineHtml() {
  const story = state.story;
  if (!story) return "";
  const full = bookFull();
  return `
    <div class="stage-panel offline-panel">
      <div class="offline-question">
        <p class="eyebrow">이제 ${escapeHtml(state.nickname)}의 차례예요</p>
        <h2>${state.language !== "en" ? escapeHtml(story.offlinePromptKo) : "Draw the next scene on paper."}</h2>
        ${state.language !== "ko" ? `<p class="english-line">${escapeHtml(story.offlinePromptEn)}</p>` : ""}
        ${missionHintsHtml(true)}
      </div>
      ${
        state.book && state.book.origin
          ? `<p class="coauthor-line">${
              full
                ? `${escapeHtml(state.book.origin.authorName)}의 이야기를 ${escapeHtml(withParticle(state.nickname, "이가", "가"))} 완성했어요!`
                : `${escapeHtml(state.book.origin.authorName)}의 이야기를 ${escapeHtml(withParticle(state.nickname, "이가", "가"))} 이어 갔어요!`
            }</p>`
          : ""
      }
      ${
        state.book && !full
          ? `
        <div class="paper-prompt">
          <b>다음은 ${state.book.chapters.length + 1}편이에요</b>
          <small>${state.book.chapters.length}/${MAX_CHAPTERS}편 저장됨 · 책은 이 기기에 보관돼요</small>
        </div>
        <div class="offline-actions">
          <button class="primary-button" type="button" data-action="continue-book">${iconImg("photoUpload")}그림 사진 올리기</button>
          <div class="offline-utility-actions">
            <button class="secondary-button" type="button" data-action="view-book">${iconImg("read")}책 보기</button>
            <button class="secondary-button" type="button" data-action="go-shelf">${iconImg("myBook")}책장</button>
            <button class="secondary-button" type="button" data-action="view-parent">${iconImg("parent")}부모 기록</button>
            <button class="secondary-button" type="button" data-action="finish-today">${iconImg("finishToday")}오늘은 여기까지</button>
          </div>
        </div>`
          : `
        <div class="completed-book-showcase">
          ${state.book ? bookCoverHtml(state.book, "complete") : ""}
          <div>
            <p class="eyebrow">완성된 책</p>
            <h3>${MAX_CHAPTERS}편짜리 동화책이 완성됐어요!</h3>
            <p>책장에 보관해두고, 다시 읽거나 인쇄할 수 있어요.</p>
          </div>
        </div>
        <div class="offline-actions">
          <button class="primary-button" type="button" data-action="view-book">${iconImg("read")}완성된 책 보기</button>
          <div class="offline-utility-actions">
            <button class="secondary-button" type="button" data-action="go-shelf">${iconImg("myBook")}책장</button>
            <button class="secondary-button" type="button" data-action="view-parent">${iconImg("parent")}부모 기록</button>
            <button class="secondary-button" type="button" data-action="finish-today">${iconImg("finishToday")}오늘은 여기까지</button>
          </div>
        </div>`
      }
      ${state.finished ? `<p class="finish-message" role="status">잘했어요! 이제 종이와 색연필을 준비해볼까요?</p>` : ""}
    </div>
  `;
}

function missionHintsHtml(compact = false) {
  if (compact) {
    return `<ul class="mission-hints offline-hints">${missionHints.map((hint) => `<li>${escapeHtml(hint)}</li>`).join("")}</ul>`;
  }
  const hintIcons = ["newDrawing", "friendBook", "photoUpload"];
  return `<div class="mission-hints" aria-label="그림 힌트">
    ${missionHints
      .map(
        (hint, index) => `<span>
          ${iconImg(hintIcons[index] || "paperMission", "", "mission-hint-icon")}
          <b>${escapeHtml(hint)}</b>
        </span>`
      )
      .join("")}
  </div>`;
}

/* -------- 책장 -------- */

function shelfControlsHtml() {
  return `
    <div class="shelf-controls" aria-label="책장 보기 방식">
      <div class="segmented-control" role="group" aria-label="보기 방식">
        <button type="button" data-action="set-shelf-view" data-view="album" aria-pressed="${state.shelfView === "album"}">앨범형</button>
        <button type="button" data-action="set-shelf-view" data-view="list" aria-pressed="${state.shelfView === "list"}">목록형</button>
      </div>
      <div class="segmented-control" role="group" aria-label="정렬">
        <button type="button" data-action="set-shelf-sort" data-sort="newest" aria-pressed="${state.shelfSort === "newest"}">최신순</button>
        <button type="button" data-action="set-shelf-sort" data-sort="oldest" aria-pressed="${state.shelfSort === "oldest"}">오래된순</button>
      </div>
    </div>
  `;
}

function shelfLibraryHtml(books) {
  return `
    <div class="shelf-library shelf-library-${state.shelfView}">
      ${books.map((book) => shelfLibraryCardHtml(book)).join("")}
    </div>
  `;
}

function bookCoverHtml(book, className = "") {
  const cover = buildBookCover(book);
  return `
    <figure class="shelf-cover ${className}">
      <div class="shelf-cover-art">
        ${cover.imageDataUrl ? `<img src="${cover.imageDataUrl}" alt="" />` : ""}
      </div>
      <figcaption>
        <span>${escapeHtml(cover.statusLabel)} · ${escapeHtml(cover.progressLabel)}</span>
        <b>${escapeHtml(cover.title)}</b>
        <small>${escapeHtml(cover.dateLabel)} · ${escapeHtml(cover.ownerLabel)}</small>
      </figcaption>
    </figure>
  `;
}

function shelfLibraryCardHtml(book) {
  const cover = buildBookCover(book);
  const last = book.chapters.at(-1);
  const selected = state.book?.id === book.id;
  const label = `${cover.title}, ${cover.dateLabel}, ${cover.progressLabel}, ${cover.statusLabel}`;
  return `
    <button class="shelf-library-card ${selected ? "selected" : ""}" type="button" data-action="select-book" data-book-id="${escapeHtml(book.id)}" aria-pressed="${selected}" aria-label="${escapeHtml(label)}">
      ${bookCoverHtml(book, "mini")}
      <span>
        <b>${escapeHtml(cover.title)}</b>
        <small>${escapeHtml(cover.dateLabel)} · ${escapeHtml(cover.progressLabel)} · ${escapeHtml(cover.statusLabel)}</small>
        ${state.shelfView === "list" ? `<em>${escapeHtml(last.story.summaryKo)}</em>` : ""}
      </span>
    </button>
  `;
}

function shelfBookDetailHtml(book) {
  const cover = buildBookCover(book);
  const last = book.chapters.at(-1);
  const complete = isBookFull(book);
  const places = uniqueValues(book.chapters.map((chapter) => chapter.analysis.place));
  const recurring = getRecurringWords(book);
  return `
    <article class="shelf-book-card">
      ${bookCoverHtml(book, "feature")}
      <div>
        <p class="progress-label">${escapeHtml(cover.statusLabel)} · ${escapeHtml(cover.progressLabel)} · ${escapeHtml(cover.dateLabel)}</p>
        <h3>${escapeHtml(last.story.summaryKo)}</h3>
        <p class="shelf-question">${escapeHtml(last.story.offlinePromptKo)}</p>
        ${
          book.origin
            ? `<p class="coauthor-line">${escapeHtml(withParticle(book.origin.authorName, "이가", "가"))} 시작한 이야기를 이어 그리고 있어요.</p>`
            : ""
        }
        <div class="shelf-detail-actions">
          <button class="primary-button" type="button" data-action="view-book">${iconImg("read")}${complete ? "완성 책 읽기" : "지금까지 읽기"}</button>
          ${complete ? "" : `<button class="secondary-button" type="button" data-action="continue-book">${iconImg("newDrawing")}다음 장면 그리기</button>`}
        </div>
      </div>
    </article>

    <div class="world-strip">
      ${
        places.length
          ? `<div><b>다녀온 곳</b><span>${escapeHtml(places.join(" → "))}</span></div>`
          : ""
      }
      ${
        recurring.length
          ? `<div><b>계속 나온 단어</b><span>${recurring.map((word) => `${escapeHtml(word.en)}(${escapeHtml(word.ko)})`).join(", ")}</span></div>`
          : ""
      }
    </div>

    <div class="shelf-actions">
      <div class="quiet-actions">
        <button class="text-button" type="button" data-action="view-parent">${iconImg("parent")}부모 기록</button>
        <button class="text-button" type="button" data-action="go-home">${iconImg("home")}처음 화면</button>
      </div>
    </div>
  `;
}

function shelfHtml() {
  const books = shelfBooks();
  if (!books.length) {
    return `
      <div class="stage-panel shelf-panel">
      <div class="stage-heading">
          <span class="stage-emoji" aria-hidden="true">${iconImg("myBook")}</span>
          <p class="eyebrow">책장</p>
          <h2>아직 만든 책이 없어요</h2>
          <p>새 그림으로 시작하거나 친구가 시작한 이야기를 이어 그려보세요.</p>
        </div>
        <div class="shelf-actions">
          <button class="primary-button" type="button" data-action="start-upload">${iconImg("newDrawing")}내 그림으로 시작하기</button>
          <div class="quiet-actions">
            <button class="text-button" type="button" data-action="go-friends">친구 책 보기</button>
          </div>
        </div>
      </div>
    `;
  }

  const selectedBook = state.book && state.book.chapters?.length ? state.book : books[0];
  if (!state.book || !state.book.chapters?.length) activateBook(selectedBook);
  return `
    <div class="stage-panel shelf-panel">
      <div class="stage-heading">
        <span class="stage-emoji" aria-hidden="true">${iconImg("myBook")}</span>
        <p class="eyebrow">책장</p>
        <h2>${escapeHtml(state.nickname || selectedBook.nickname)}의 그림책 앨범</h2>
        <p>${books.length}권 · 날짜순으로 다시 볼 수 있어요</p>
      </div>

      ${shelfControlsHtml()}
      ${shelfLibraryHtml(books)}
      ${shelfBookDetailHtml(selectedBook)}
    </div>
  `;
}

/* -------- 부모 기록 -------- */

/**
 * 아이 화면과 분리된 부모용 기록.
 * 새로 만드는 데이터는 없고, 이미 저장된 편별 분위기·선택·단어를 모아서 보여 준다.
 */
function parentRecordHtml() {
  const book = state.book;
  if (!book || !book.chapters.length) return "";
  const record = buildParentRecord(book);
  const words = uniqueWords(book);
  const name = escapeHtml(book.nickname);

  return `
    <div class="parent-record">
      <div class="book-toolbar-wizard">
        <strong>${iconImg("parent")}부모 기록</strong>
        <div>
          <button type="button" data-action="view-book">${iconImg("read")}아이 화면(동화책) 보기</button>
          <button type="button" data-action="print-book">${iconImg("print")}인쇄·PDF 저장</button>
        </div>
      </div>

      <div class="stage-heading">
        <p class="eyebrow">오늘 ${name}의 기록</p>
        <h2>선택과 표현을 남겨두었어요</h2>
        <p>${escapeHtml(record.disclaimer)}</p>
      </div>

      <section class="record-observation" aria-label="오늘의 관찰">
        <span>오늘의 관찰</span>
        <p>${escapeHtml(record.observation)}</p>
      </section>

      <section class="record-question">
        <span>오늘 물어볼 말</span>
        <p>“${escapeHtml(record.followUpQuestion)}”</p>
      </section>

      <section class="record-cards" aria-label="오늘의 핵심 기록">
        ${record.statCards
          .map(
            (card) => `<article class="record-card">
          <b>${escapeHtml(card.value)}</b>
          <small>${escapeHtml(card.label)}</small>
        </article>`
          )
          .join("")}
      </section>

      ${
        record.focusItems.length
          ? `<section class="record-block">
        <h3>관심이 머문 것</h3>
        <p class="record-places">${record.focusItems.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</p>
      </section>`
          : ""
      }

      ${
        record.atmosphere.length
          ? `<section class="record-block">
        <h3>이야기 분위기</h3>
        <ol class="mood-flow">${record.atmosphere.map((mood) => `<li>${escapeHtml(mood)}</li>`).join("")}</ol>
      </section>`
          : ""
      }

      ${
        words.length || (book.practiced && book.practiced.length)
          ? `<section class="record-block">
        <h3>말과 단어</h3>
        ${
          words.length
            ? `<ul class="word-cards compact">${words.slice(0, 6).map((w) => `<li><b>${escapeHtml(w.en)}</b><span>${escapeHtml(w.ko)}</span></li>`).join("")}</ul>`
            : ""
        }
        ${
          book.practiced && book.practiced.length
            ? `<p class="record-practiced">오늘 말해본 단어 ${book.practiced.length}개 — ${escapeHtml(book.practiced.join(", "))}</p>`
            : ""
        }
      </section>`
          : ""
      }

      <section class="record-block">
        <h3>편마다 남긴 기록</h3>
        <ul class="record-list">
          ${record.episodes
            .map(
              (episode) => `<li>
                <p class="record-title">${episode.number}편 · ${escapeHtml(episode.title)}</p>
                ${episode.choice ? `<p class="record-choice">${episode.choice.byVoice ? "말로" : "골라서"} “${escapeHtml(episode.choice.ko)}”</p>` : ""}
                ${episode.note ? `<p class="record-note">${escapeHtml(episode.note)}</p>` : ""}
                ${episode.mood ? `<p class="record-mood">이야기 분위기: ${escapeHtml(episode.mood)}</p>` : ""}
              </li>`
            )
            .join("")}
        </ul>
      </section>

      <p class="record-privacy">이 기록은 이 기기에만 저장돼요. 서버로 보내지 않아요.</p>
    </div>
  `;
}

/* -------- 동화책 보기 -------- */

function uniqueWords(book) {
  const seen = new Set();
  const words = [];
  book.chapters.forEach((chapter) =>
    chapter.story.pages.forEach((page) =>
      (page.words || []).forEach((word) => {
        const key = word.en.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        words.push(word);
      })
    )
  );
  return words;
}
function uniqueValues(values) {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))];
}

/* -------- 계속 나온 단어로 발음해보기 -------- */

/**
 * 책 안에서 반복해서 나온 단어를 큰 카드로 보여 준다. 듣기·따라 말하기만 있고
 * 점수·정확도는 계산하지 않는다 — "말해봤다"는 사실만 도장으로 남긴다.
 */
function recurringWordsHtml(recurring) {
  return `
    <section class="recurring-words">
      <h3>우리 책에 계속 나온 단어</h3>
      <ul class="recurring-word-list">
        ${recurring.map((word) => recurringWordCardHtml(word)).join("")}
      </ul>
    </section>
  `;
}

function recurringWordCardHtml(word) {
  const key = word.en.trim().toLowerCase();
  const practiced = isPracticed(state.book, word.en);
  const practice = state.wordPractice[key] || {};
  const micButton =
    voiceSupported() && practice.feedback !== "done"
      ? `<button type="button" class="voice-button ${practice.listening ? "listening" : ""}" data-action="word-repeat" data-word="${escapeHtml(word.en)}">${
          practice.listening ? "듣고 있어요…" : `${iconImg("speak")}따라 말하기`
        }</button>`
      : "";
  let feedback = "";
  if (practice.feedback === "success") feedback = `<p class="practice-feedback success">잘했어요!</p>`;
  else if (practice.feedback === "retry") feedback = `<p class="practice-feedback retry">한 번 더 해볼까?</p>`;
  else if (practice.feedback === "done") feedback = `<p class="practice-feedback done">다음에 또 해보자</p>`;

  return `
    <li class="recurring-word-card">
      ${practiced ? `<span class="practice-stamp" aria-hidden="true">${iconImg("stamp")}</span>` : ""}
      <b>${escapeHtml(word.en)}</b>
      <span>${escapeHtml(word.ko)}</span>
      <div class="recurring-word-actions">
        <button type="button" data-action="word-listen" data-word="${escapeHtml(word.en)}">${iconImg("listen")}듣기</button>
        ${micButton}
      </div>
      ${feedback}
    </li>
  `;
}

let wordRecognitionRef = null;
/** 영어 단어 하나를 따라 말해 보게 하고, 느슨하게 비교해서 도장을 남긴다. 점수는 매기지 않는다. */
function startWordRepeat(enWord) {
  const Constructor = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Constructor) return;
  const key = enWord.trim().toLowerCase();
  const current = state.wordPractice[key] || { attempts: 0 };
  if (current.listening) return;

  window.speechSynthesis?.cancel();
  const recognition = new Constructor();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event) => {
    const transcript = event.results[0]?.[0]?.transcript?.trim() ?? "";
    const before = state.wordPractice[key] || { attempts: 0 };
    if (transcript && isCloseMatch(enWord, transcript)) {
      state.wordPractice[key] = { attempts: before.attempts, listening: false, feedback: "success" };
      if (state.book) {
        state.book = markPracticed(state.book, enWord);
        const storage = browserStorage();
        if (storage) {
          saveBook(storage, state.book);
          syncLibrary(storage);
        }
      }
    } else {
      const attempts = before.attempts + 1;
      // 두 번 실패하면 "다음에 또 해보자"로 넘어가고 더 권하지 않는다.
      state.wordPractice[key] = { attempts, listening: false, feedback: attempts >= 2 ? "done" : "retry" };
    }
    render();
  };
  recognition.onerror = (event) => {
    if (event.error === "aborted") return;
    const before = state.wordPractice[key] || { attempts: 0 };
    state.wordPractice[key] = { ...before, listening: false };
    render();
  };
  recognition.onend = () => {
    wordRecognitionRef = null;
    const before = state.wordPractice[key];
    if (before && before.listening) {
      state.wordPractice[key] = { ...before, listening: false };
      render();
    }
  };

  wordRecognitionRef = recognition;
  state.wordPractice[key] = { ...current, listening: true, feedback: "" };
  render();
  recognition.start();
}

function bookSpreads(book) {
  const spreads = [{ kind: "cover" }];
  book.chapters.forEach((chapter, chapterIndex) => {
    chapter.story.pages.forEach((_, page) => spreads.push({ kind: "page", chapter: chapterIndex, page }));
  });
  spreads.push({ kind: "words" }, { kind: "parent" });
  return spreads;
}

/** 책의 한 장(표지·본문·단어 카드·부모 요약)을 그린다. 인쇄를 위해 모든 장을 미리 만들어 둔다. */
function spreadContentHtml(book, spread, { first, last, complete, words, characters, places }) {
  let content = "";
  if (spread.kind === "cover") {
    content = `
      <div class="book-cover">
        <div class="book-cover-art"><img src="${first.imageDataUrl}" alt="첫 번째 그림" /></div>
        <p class="eyebrow">${complete ? "완성된 동화책" : `만들고 있는 동화책 · ${book.chapters.length}편`}</p>
        <h2>${escapeHtml(book.language === "en" ? first.story.titleEn : first.story.titleKo)}</h2>
        ${book.language === "both" ? `<p class="english-line">${escapeHtml(first.story.titleEn)}</p>` : ""}
        <p class="book-author">지은이 · ${book.origin ? `${escapeHtml(book.origin.authorName)} + ${escapeHtml(book.nickname)}` : escapeHtml(book.nickname)}</p>
        ${book.origin ? `<p class="book-origin-note">친구 이야기를 이어서 함께 지었어요</p>` : ""}
      </div>`;
  } else if (spread.kind === "page") {
    const chapter = book.chapters[spread.chapter];
    const page = chapter.story.pages[spread.page];
    const artKey = `${spread.chapter}:${spread.page}`;
    const seedIllustration = Boolean(book.origin && spread.chapter === 0 && chapter.author);
    content = `
      <div class="book-page-spread" style="display:grid;gap:18px;">
        <div class="story-image" style="position:relative;height:clamp(320px,68vh,760px);overflow:hidden;border-radius:22px;background:#fffdf6;">
          ${page.imageDataUrl
            ? `<img src="${page.imageDataUrl}" alt="${spread.chapter + 1}편 동화 삽화" style="width:100%;height:100%;object-fit:contain;" />`
            : seedIllustration
              ? `<img src="${chapter.imageDataUrl}" alt="친구가 그린 ${spread.chapter + 1}편 그림" style="width:100%;height:100%;object-fit:contain;" />`
              : `<div class="book-art-missing">
                  <p>${state.bookArtPending[artKey] ? "이 페이지 삽화를 다시 만들고 있어요…" : state.bookArtErrors[artKey] || "이전 저장본에는 이 페이지의 삽화가 저장되지 않았어요."}</p>
                  ${!state.bookArtPending[artKey] ? `<button type="button" data-action="generate-saved-page-art" data-chapter="${spread.chapter}" data-page="${spread.page}">이 페이지 삽화 만들기</button>` : ""}
                </div>`}
          <span class="original-badge">${spread.chapter + 1}편${chapter.author ? ` · ${escapeHtml(withParticle(chapter.author, "이", ""))} 씀` : ""} · ${escapeHtml(
      book.language === "en" ? chapter.story.titleEn : chapter.story.titleKo
    )}</span>
        </div>
        ${page.imageDataUrl && !seedIllustration ? `<button class="text-button illustration-regenerate" type="button" data-action="generate-saved-page-art" data-chapter="${spread.chapter}" data-page="${spread.page}" ${state.bookArtPending[artKey] ? "disabled" : ""}>${state.bookArtPending[artKey] ? "삽화 다시 만드는 중…" : "삽화 다시 만들기"}</button>` : ""}
        <div class="story-copy">
          ${book.language !== "en" ? `<p class="korean-line">${escapeHtml(page.ko)}</p>` : ""}
          ${book.language !== "ko" ? `<p class="english-line">${escapeHtml(page.en)}</p>` : ""}
        </div>
      </div>`;
  } else if (spread.kind === "words") {
    const recurring = getRecurringWords(book);
    const recurringKeys = new Set(recurring.map((w) => w.en.toLowerCase()));
    const otherWords = words.filter((w) => !recurringKeys.has(w.en.toLowerCase()));
    content = `
      <div class="book-extra word-spread">
        <p class="eyebrow">이 책에서 만난 영어 단어</p>
        <h2>단어 카드 ${words.length}장</h2>
        ${recurring.length ? recurringWordsHtml(recurring) : ""}
        ${
          otherWords.length
            ? `<h3 class="word-section-title">이번에 만난 단어</h3>
        <ul class="word-cards">
          ${otherWords.map((w) => `<li><b>${escapeHtml(w.en)}</b><span>${escapeHtml(w.ko)}</span></li>`).join("")}
        </ul>`
            : ""
        }
      </div>`;
  } else {
    content = `
      <div class="book-extra parent-summary">
        <p class="eyebrow">부모님께 드리는 한 장 요약</p>
        <h2>${escapeHtml(book.nickname)}의 상상 기록</h2>
        <dl>
          <div><dt>등장인물</dt><dd>${escapeHtml(characters.join(", "))}</dd></div>
          <div><dt>상상한 장소</dt><dd>${escapeHtml(places.join(" → "))}</dd></div>
          ${
            book.origin
              ? `<div><dt>함께 지은 친구</dt><dd>${escapeHtml(withParticle(book.origin.authorName, "이가", "가"))} 시작한 이야기를 ${escapeHtml(
                  withParticle(book.nickname, "이가", "가")
                )} 이어서 완성했어요.</dd></div>`
              : ""
          }
          <div><dt>이야기 흐름</dt><dd><ol>${book.chapters
            .map((c) => `<li><b>${escapeHtml(c.story.titleKo)}</b> — ${escapeHtml(c.story.summaryKo)}</li>`)
            .join("")}</ol></dd></div>
          ${
            book.chapters.some((c) => c.story.choice)
              ? `<div><dt>${escapeHtml(withParticle(book.nickname, "이가", "가"))} 정한 장면</dt><dd><ul class="choice-list">${book.chapters
                  .map((c, i) => (c.story.choice ? `<li>${i + 1}편 · ${c.story.choice.byVoice ? "말로" : "골라서"} "${escapeHtml(c.story.choice.ko)}"</li>` : ""))
                  .join("")}</ul></dd></div>`
              : ""
          }
          <div><dt>새로 만난 영어 단어</dt><dd>${escapeHtml(words.map((w) => w.en).join(", "))}</dd></div>
          <div><dt>함께 나눌 질문</dt><dd>${escapeHtml(last.story.offlinePromptKo)}</dd></div>
        </dl>
      </div>`;
  }

  return content;
}

function bookViewHtml() {
  const book = state.book;
  if (!book) return "";
  const first = book.chapters[0];
  const last = book.chapters.at(-1);
  if (!first || !last) return "";
  const complete = book.chapters.length >= MAX_CHAPTERS;
  const spreads = bookSpreads(book);
  const index = Math.min(state.bookIndex, spreads.length - 1);
  const spread = spreads[index];
  const words = uniqueWords(book);
  const characters = uniqueValues(book.chapters.flatMap((c) => c.analysis.characters));
  const places = uniqueValues(book.chapters.map((c) => c.analysis.place));

  const spreadsHtml = spreads
    .map((item, itemIndex) => `<section class="book-spread ${itemIndex === index ? "current" : ""}">${spreadContentHtml(book, item, { first, last, complete, words, characters, places })}</section>`)
    .join("");
  let navRight = "";
  if (index < spreads.length - 1) {
    navRight = `<button class="primary-inline" type="button" data-action="book-next">다음 →</button>`;
  } else if (!complete) {
    navRight = `<button class="primary-inline" type="button" data-action="continue-book">${iconImg("newDrawing")}${book.chapters.length + 1}편 이어 그리기 →</button>`;
  } else {
    navRight = `<button class="primary-inline" type="button" data-action="book-restart">처음부터 다시 읽기</button>`;
  }

  return `
    <div class="book-stage">
      <div class="book-toolbar-wizard">
        <strong>${index + 1} / ${spreads.length}</strong>
        <div>
          <button type="button" data-action="go-shelf">${iconImg("myBook")}책장</button>
          <button type="button" data-action="print-book">${iconImg("print")}인쇄·PDF 저장</button>
          <button type="button" data-action="new-book">${iconImg("newDrawing")}새 책 시작</button>
        </div>
      </div>
      <div class="book-spreads">${spreadsHtml}</div>
      <div class="story-nav">
        <button type="button" data-action="book-prev" ${index === 0 ? "disabled" : ""}>← 이전</button>
        ${navRight}
      </div>
    </div>
  `;
}

/* ---------------------------- 이벤트 바인딩 ---------------------------- */

function bindEvents() {
  const uploadForm = document.querySelector("#upload-form");
  if (uploadForm) uploadForm.addEventListener("submit", onAnalyzeSubmit);

  const imageInput = document.querySelector("#image-input");
  if (imageInput) imageInput.addEventListener("change", onFileChange);

  const nicknameInput = document.querySelector("#nickname-input");
  if (nicknameInput) nicknameInput.addEventListener("input", (e) => (state.nickname = e.target.value));

  const ageInput = document.querySelector("#age-input");
  if (ageInput) ageInput.addEventListener("change", (e) => (state.age = Number(e.target.value)));

  const privacyInput = document.querySelector("#privacy-input");
  if (privacyInput)
    privacyInput.addEventListener("change", (e) => {
      state.privacyChecked = e.target.checked;
      render();
    });

  const ownTextInput = document.querySelector("#own-text-input");
  if (ownTextInput)
    ownTextInput.addEventListener("input", (e) => {
      state.ownText = e.target.value;
      state.ownByVoice = false;
      state.choiceSelection = e.target.value.trim() ? { kind: "own" } : null;
    });

  root.querySelectorAll("[data-action]").forEach((el) => {
    el.addEventListener("click", onAction);
  });
}

async function onFileChange(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (file.size > 8 * 1024 * 1024) {
    setError("그림 파일은 8MB 이하로 올려주세요.");
    return;
  }
  try {
    state.imageDataUrl = await readFile(file);
    state.imageReferenceDataUrl = await shrinkImage(state.imageDataUrl, 1280);
    state.imageName = file.name;
    state.draftUnsaved = true;
    state.error = "";
  } catch (caught) {
    setError(caught.message || "그림을 읽지 못했어요.");
    return;
  }
  render();
}

async function useSample() {
  try {
    state.imageDataUrl = await sampleToPng(demoSampleImagePath(chapterNumber()));
    state.imageReferenceDataUrl = await shrinkImage(state.imageDataUrl, 1280);
    state.imageName = `그림일기_예제_${chapterNumber()}편.png`;
    state.draftUnsaved = true;
    state.privacyChecked = true;
    state.error = "";
  } catch (caught) {
    setError(caught.message || "예제를 불러오지 못했어요.");
    return;
  }
  render();
}

async function onAnalyzeSubmit(event) {
  event.preventDefault();
  if (!canSubmitUpload()) return;
  state.busy = true;
  state.error = "";
  render();
  try {
    const data = await apiPost("/api/analyze", {
      imageDataUrl: state.imageDataUrl,
      nickname: state.nickname.trim(),
      age: state.age,
      chapter: chapterNumber()
    });
    state.analysis = data.analysis;
    state.demoMode = Boolean(data.demoMode);
    state.busy = false;
    go("review");
  } catch (caught) {
    state.busy = false;
    setError(caught.message || "그림을 읽지 못했어요.");
  }
}

async function generateStory() {
  if (!state.analysis) return;
  state.busy = true;
  state.error = "";
  render();
  try {
    const data = await apiPost("/api/story", { phase: "opening", ...storyRequestBase() });
    state.opening = data.opening;
    state.story = null;
    state.choosing = false;
    state.pageIndex = 0;
    state.pageArt = {};
    state.demoMode = state.demoMode || Boolean(data.demoMode);
    state.busy = false;
    // 이야기가 시작되면 아이 그림에서 주인공을 오려 둔다.
    const cutout = await extractCharacter(state.imageDataUrl);
    state.characterCutoutDataUrl = cutout.dataUrl;
    state.artMode = cutout.mode;
    go("story");
  } catch (caught) {
    state.busy = false;
    setError(caught.message || "이야기를 만들지 못했어요.");
  }
}

function startChoosing() {
  if (!state.opening) return;
  state.choosing = true;
  state.choiceSelection = null;
  state.ownText = "";
  state.ownByVoice = false;
  state.voiceError = "";
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (state.language === "en") speak(state.opening.questionEn || state.opening.questionKo, "en-US");
  else speak(state.opening.questionKo, "ko-KR");
}

async function chooseNext(choice) {
  if (!state.opening) return;
  state.busy = true;
  state.error = "";
  render();
  try {
    const data = await apiPost("/api/story", { phase: "ending", ...storyRequestBase(), opening: state.opening, choice });
    state.story = combineStory(state.opening, data.ending, choice);
    state.demoMode = state.demoMode || Boolean(data.demoMode);
    state.choosing = false;
    state.pageIndex = OPENING_PAGES;
    state.busy = false;
    render();
  } catch (caught) {
    state.busy = false;
    setError(caught.message || "이야기를 이어 쓰지 못했어요. 다시 골라볼까요?");
  }
}

async function finishChapter() {
  if (!state.analysis || !state.story) return;
  state.busy = true;
  render();
  const storedImage = await shrinkImage(state.imageDataUrl);
  const storyWithPageArt = {
    ...state.story,
    pages: await Promise.all(state.story.pages.map(async (page, index) => {
      const generatedImage = state.pageArt[index]?.imageDataUrl;
      return generatedImage ? { ...page, imageDataUrl: await shrinkImage(generatedImage, 768) } : page;
    }))
  };
  const next = appendChapter(
    state.book,
    { imageDataUrl: storedImage, analysis: state.analysis, story: storyWithPageArt },
    { nickname: state.nickname.trim(), age: state.age, language: state.language }
  );
  state.book = next;
  const storage = browserStorage();
  const result = storage ? saveBook(storage, next) : { ok: false, message: "이 브라우저에서는 책을 보관할 수 없어요." };
  if (result.ok) syncLibrary(storage);
  if (result.ok) state.draftUnsaved = false;
  state.busy = false;
  go("offline");
  if (!result.ok) setError(result.message);
}

async function generateSavedPageArt(chapterIndex, pageIndex) {
  const chapter = state.book?.chapters?.[chapterIndex];
  const page = chapter?.story.pages?.[pageIndex];
  if (!chapter || !page) return;
  const key = `${chapterIndex}:${pageIndex}`;
  if (state.bookArtPending[key]) return;
  state.bookArtPending[key] = true;
  delete state.bookArtErrors[key];
  render();
  try {
    const data = await apiPost("/api/page-art", {
      analysis: chapter.analysis,
      imageDataUrl: chapter.imageDataUrl,
      visualDescription: page.visualDescription || page.en || page.ko,
      pageIndex
    });
    const imageDataUrl = await shrinkImage(data.imageDataUrl, 768);
    const chapters = state.book.chapters.map((item, index) => {
      if (index !== chapterIndex) return item;
      return {
        ...item,
        story: {
          ...item.story,
          pages: item.story.pages.map((currentPage, index) => index === pageIndex ? { ...currentPage, imageDataUrl } : currentPage)
        }
      };
    });
    state.book = { ...state.book, chapters };
    const storage = browserStorage();
    const result = storage ? saveBook(storage, state.book) : { ok: false, message: "이 브라우저에서는 책을 보관할 수 없어요." };
    if (result.ok) syncLibrary(storage);
    else state.bookArtErrors[key] = result.message;
  } catch {
    state.bookArtErrors[key] = "삽화를 만들지 못했어요. 잠시 후 다시 시도해 주세요.";
  } finally {
    delete state.bookArtPending[key];
    render();
  }
}

function resetDrawing() {
  state.imageDataUrl = "";
  state.imageReferenceDataUrl = "";
  state.imageName = "";
  state.draftUnsaved = false;
  state.privacyChecked = false;
  state.analysis = null;
  state.opening = null;
  state.choosing = false;
  state.story = null;
  state.pageIndex = 0;
  state.finished = false;
  state.characterCutoutDataUrl = "";
  state.artMode = "whole";
  state.pageArt = {};
}

async function startFriendBook(seed) {
  state.busy = true;
  state.error = "";
  render();
  try {
    const chapters = await Promise.all(
      seed.chapters.map(async (chapter) => ({
        imageDataUrl: await shrinkImage(await sampleToPng(chapter.imagePath)),
        analysis: chapter.analysis,
        story: chapter.story,
        author: seed.authorName
      }))
    );
    const friendBook = {
      id: `book-${Date.now()}`,
      nickname: state.nickname.trim() || "아이",
      age: state.age,
      language: state.language,
      chapters,
      createdAt: new Date().toISOString(),
      origin: { type: "friend", seedId: seed.id, authorName: seed.authorName }
    };
    const storage = browserStorage();
    const result = storage ? saveBook(storage, friendBook) : { ok: true };
    state.book = friendBook;
    if (result.ok) syncLibrary(storage);
    resetDrawing();
    state.busy = false;
    go("upload");
    if (!result.ok) setError(result.message);
  } catch (caught) {
    state.busy = false;
    setError(caught.message || "친구 이야기를 가져오지 못했어요.");
  }
}

function continueBook() {
  resetDrawing();
  state.bookIndex = 0;
  go("upload");
}

function startNewBook() {
  if (state.draftUnsaved && !window.confirm("아직 책장에 저장하지 않은 그림이나 이야기가 있어요. 저장하지 않고 새 그림을 시작할까요?")) return;
  const storage = browserStorage();
  if (storage) clearBook(storage);
  state.book = null;
  resetDrawing();
  state.error = "";
  go("upload");
}

let recognitionRef = null;
function startVoice() {
  const Constructor = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Constructor || state.voiceListening) return;
  window.speechSynthesis?.cancel();
  const recognition = new Constructor();
  recognition.lang = "ko-KR";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.onresult = (event) => {
    const transcript = event.results[0]?.[0]?.transcript?.trim() ?? "";
    if (transcript) {
      state.voiceError = "";
      state.ownText = transcript;
      state.ownByVoice = true;
      state.choiceSelection = { kind: "own" };
      render();
      speak(`${transcript}. 이렇게 말했어요. 맞아요?`, "ko-KR");
    } else {
      state.voiceError = "잘 안 들렸어요. 버튼을 누르고 또박또박 말해볼까요?";
      render();
    }
  };
  const errorMessages = {
    "not-allowed": "마이크를 쓸 수 없어요. 브라우저에서 마이크를 허용해주세요.",
    "service-not-allowed": "마이크를 쓸 수 없어요. 브라우저에서 마이크를 허용해주세요.",
    "no-speech": "잘 안 들렸어요. 버튼을 누르고 또박또박 말해볼까요?",
    "audio-capture": "마이크를 찾지 못했어요.",
    network: "인터넷이 불안정해서 듣지 못했어요."
  };
  recognition.onerror = (event) => {
    if (event.error === "aborted") return;
    state.voiceError = errorMessages[event.error] || "잘 듣지 못했어요. 다시 해볼까요?";
    render();
  };
  recognition.onend = () => {
    state.voiceListening = false;
    recognitionRef = null;
    render();
  };
  recognitionRef = recognition;
  state.voiceListening = true;
  render();
  recognition.start();
}

function onAction(event) {
  const el = event.currentTarget;
  const action = el.dataset.action;

  switch (action) {
    case "go-home":
      go("home");
      break;
    case "start-upload":
      go("upload");
      break;
    case "go-shelf":
      state.bookIndex = 0;
      syncLibrary();
      go("shelf");
      break;
    case "set-shelf-view":
      state.shelfView = el.dataset.view === "list" ? "list" : "album";
      render();
      break;
    case "set-shelf-sort":
      state.shelfSort = el.dataset.sort === "oldest" ? "oldest" : "newest";
      render();
      break;
    case "select-book": {
      const book = shelfBooks().find((item) => item.id === el.dataset.bookId);
      if (book) {
        activateBook(book);
        render();
      }
      break;
    }
    case "use-sample":
      useSample();
      break;
    case "go-friends":
      go("friends");
      break;
    case "preview-friend": {
      state.selectedSeedId = el.dataset.seedId || "";
      go("relayRead");
      break;
    }
    case "start-friend-relay": {
      const seed = seedBooks.find((s) => s.id === el.dataset.seedId);
      if (seed) startFriendBook(seed);
      break;
    }
    case "back":
      go(el.dataset.target);
      break;
    case "to-language":
      readReviewFields();
      go("language");
      break;
    case "set-language":
      state.language = el.dataset.value;
      render();
      break;
    case "generate-story":
      generateStory();
      break;
    case "retry-page-art": {
      const index = Number(el.dataset.index);
      delete state.pageArt[index];
      ensurePageArt(index);
      render();
      break;
    }
    case "regenerate-page-art":
      ensurePageArt(Number(el.dataset.index), { force: true });
      break;
    case "generate-saved-page-art":
      generateSavedPageArt(Number(el.dataset.chapter), Number(el.dataset.page));
      break;
    case "start-choosing":
      startChoosing();
      break;
    case "stop-choosing":
      state.choosing = false;
      render();
      break;
    case "ask-again":
      if (state.language === "en") speak(state.opening.questionEn || state.opening.questionKo, "en-US");
      else speak(state.opening.questionKo, "ko-KR");
      break;
    case "pick-card": {
      const index = Number(el.dataset.index);
      state.choiceSelection = { kind: "card", index };
      const card = state.opening.choices[index];
      render();
      if (state.language === "en") speak(card.en, "en-US");
      else speak(card.ko, "ko-KR");
      break;
    }
    case "voice-start":
      startVoice();
      break;
    case "confirm-choice": {
      if (!state.choiceSelection) break;
      if (state.choiceSelection.kind === "card") {
        const card = state.opening.choices[state.choiceSelection.index];
        chooseNext({ ko: card.ko, en: card.en, byVoice: false });
      } else {
        const text = state.ownText.trim();
        if (text) chooseNext({ ko: text, en: "", byVoice: state.ownByVoice });
      }
      break;
    }
    case "listen-ko": {
      const page = (state.story ? state.story.pages : state.opening.pages)[state.pageIndex];
      speak(page.ko, "ko-KR");
      break;
    }
    case "listen-en": {
      const page = (state.story ? state.story.pages : state.opening.pages)[state.pageIndex];
      speak(page.en, "en-US");
      break;
    }
    case "story-prev":
      state.pageIndex = Math.max(0, state.pageIndex - 1);
      render();
      break;
    case "story-next": {
      const pages = state.story ? state.story.pages : state.opening.pages;
      state.pageIndex = Math.min(pages.length - 1, state.pageIndex + 1);
      render();
      break;
    }
    case "finish-chapter":
      finishChapter();
      break;
    case "continue-book":
      continueBook();
      break;
    case "view-book":
      state.bookIndex = 0;
      go("book");
      break;
    case "view-parent":
      go("parent");
      break;
    case "finish-today":
      state.finished = true;
      render();
      break;
    case "new-book":
      startNewBook();
      break;
    case "book-prev":
      state.bookIndex = Math.max(0, state.bookIndex - 1);
      render();
      break;
    case "book-next":
      state.bookIndex += 1;
      render();
      break;
    case "book-restart":
      state.bookIndex = 0;
      render();
      break;
    case "print-book":
      window.print();
      break;
    case "word-listen":
      speak(el.dataset.word, "en-US");
      break;
    case "word-repeat":
      startWordRepeat(el.dataset.word);
      break;
    default:
      break;
  }
}
