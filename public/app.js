// 그림이야기 - 5단계 아이 주도 흐름 (그림 올리기 → 부모 확인 → 언어 고르기 → 이야기 보기 → 다시 그리기)
// public/shared의 공용 모듈을 브라우저에서 그대로 import한다.

import { withParticle } from "./shared/korean.js";
import { transitionStage } from "./shared/wizard.js";
import { combineStory } from "./shared/story-normalize.js";
import { demoSampleImagePath } from "./shared/demo-data.js";
import { appendChapter, clearBook, isBookFull, loadBook, saveBook } from "./shared/book-storage.js";
import { seedBooks } from "./shared/seed-books.js";
import { MAX_CHAPTERS, OPENING_PAGES, STORY_PAGES } from "./shared/story-types.js";
import { getCharacterBox, getPageFraming } from "./shared/page-composition.js";
import { getRecurringWords, isCloseMatch, isPracticed, markPracticed } from "./shared/word-practice.js";

const root = document.querySelector("#app-root");

const stageOrder = ["upload", "review", "language", "story", "offline"];
const stageLabels = {
  upload: "그림 올리기",
  review: "부모 확인",
  language: "언어 고르기",
  story: "이야기 보기",
  offline: "다시 그리기",
  book: "동화책",
  friends: "친구 이야기"
};
const backTarget = { review: "upload", language: "review", story: "language" };
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
  stage: "upload",
  nickname: "수민",
  age: 7,
  imageDataUrl: "",
  imageName: "",
  privacyChecked: false,
  analysis: null,
  language: "both",
  opening: null,
  choosing: false,
  choiceSelection: null, // { kind: "card", index } | { kind: "own" }
  ownText: "",
  ownByVoice: false,
  voiceError: "",
  typing: false,
  story: null,
  pageIndex: 0,
  busy: false,
  error: "",
  demoMode: false,
  finished: false,
  book: null,
  characterCutoutDataUrl: "",
  // "cutout" = 주인공만 오려 배경에 얹기, "whole" = 그림 전체를 액자로 보여 주기
  artMode: "whole",
  pageArt: {}, // pageIndex -> { imageDataUrl, framing, textSide }
  bookIndex: 0,
  // "계속 나온 단어" 발음 연습 진행 상태. en(소문자) -> { listening, attempts, feedback }.
  // 도장(book.practiced)과 달리 새로고침하면 사라진다 — 그 자리에서의 시도 표시일 뿐이다.
  wordPractice: {}
};

(function init() {
  const storage = browserStorage();
  const saved = storage ? loadBook(storage) : null;
  if (saved) {
    state.book = saved;
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

/** 보고 있는 쪽만 삽화를 만든다. 실패하면 조용히 빈 값으로 남아 오려낸 주인공만 보인다. */
async function ensurePageArt(index) {
  if (!state.story && !state.opening) return;
  if (state.pageArt[index]) return;
  const pages = state.story ? state.story.pages : state.opening.pages;
  const page = pages[index];
  if (!page) return;
  const titleKo = state.story ? state.story.titleKo : state.opening.titleKo;
  state.pageArt[index] = { loading: true };
  // 기다리는 동안 "그리는 중" 안내가 보이도록 먼저 한 번 그린다.
  if (index === state.pageIndex) renderStoryImageOnly();
  try {
    const data = await apiPost("/api/page-art", {
      nickname: state.nickname.trim(),
      analysis: state.analysis,
      page,
      pageIndex: index,
      titleKo
    });
    state.pageArt[index] = { imageDataUrl: data.imageDataUrl || "", framing: data.framing, textSide: data.textSide };
  } catch {
    state.pageArt[index] = { imageDataUrl: "" };
  }
  renderStoryImageOnly();
}

/* ---------------------------- 렌더링 ---------------------------- */

function render() {
  root.innerHTML = `
    ${brandBarHtml()}
    ${state.stage === "upload" && !state.book ? heroHtml() : ""}
    <div class="studio-shell stage-${state.stage}">
      ${state.stage === "upload" && state.book ? bookBannerHtml() : ""}
      ${["book", "friends", "parent"].includes(state.stage) ? "" : stepperHtml()}
      <section class="studio-card">
        ${stageContentHtml()}
      </section>
      <footer class="app-footer">그림이야기는 아이를 화면에 더 오래 머물게 하지 않아요.</footer>
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
  return `
    <header class="brand-bar">
      <span class="brand-mark">📖 그림이야기</span>
      ${showParent ? `<button type="button" class="parent-entry-button" data-action="view-parent">👩‍👧 부모</button>` : ""}
    </header>
  `;
}

function heroHtml() {
  return `
    <section class="hero" id="hero-banner" aria-labelledby="hero-title">
      <div class="hero-copy">
        <p class="eyebrow">그림일기 → 한국어·영어 동화</p>
        <h1 id="hero-title">아이 그림이<br />동화가 되는 순간</h1>
        <p class="lead">그림일기를 올리면 AI가 아이의 상상을 4페이지 동화와 쉬운 영어 이야기로 열어줘요.</p>
      </div>
      <div class="hero-preview" aria-hidden="true">
        <div class="paper paper-one"></div>
        <div class="paper paper-two"></div>
        <div class="paper paper-three">
          <span></span>
          <strong>Once upon a time</strong>
        </div>
      </div>
    </section>
  `;
}

function bookBannerHtml() {
  const book = state.book;
  return `
    <section class="book-banner">
      <div>
        <p class="eyebrow">${bookFull() ? "완성된 동화책이 있어요" : `${chapterNumber()}편 이어 그리기`}</p>
        <b>📖 ${escapeHtml(book.chapters[0]?.story.titleKo || "")} · ${book.chapters.length}/${MAX_CHAPTERS}편</b>
        <small>${
          bookFull()
            ? "새 그림을 올리면 새 책이 시작돼요. 지금 책은 먼저 인쇄해두세요."
            : `지난 이야기: ${escapeHtml(book.chapters.at(-1)?.story.summaryKo || "")}`
        }</small>
      </div>
      <div class="book-banner-actions">
        <button type="button" data-action="view-book">책 보기</button>
        <button type="button" data-action="new-book">새 책 시작</button>
      </div>
    </section>
  `;
}

function stepperHtml() {
  const activeStep = stageOrder.indexOf(state.stage);
  return `
    <p class="step-count">${activeStep + 1} / ${stageOrder.length}</p>
    <nav class="stepper" aria-label="이야기 만들기 진행 단계">
      ${stageOrder
        .map(
          (item, index) => `
        <div class="step-dot ${index <= activeStep ? "active" : ""}">
          <span>${index + 1}</span>
          <small>${stageLabels[item]}</small>
        </div>`
        )
        .join("")}
    </nav>
  `;
}

function stageContentHtml() {
  const backBtn =
    !["upload", "offline", "parent"].includes(state.stage) && !state.choosing && backTarget[state.stage]
      ? `<button class="back-button" type="button" data-action="back" data-target="${backTarget[state.stage]}">← 이전</button>`
      : "";
  const demoBadge = state.demoMode ? `<p class="demo-badge">✦ API 키 없이 실행 중인 안전한 발표 데모예요.</p>` : "";
  const errorMsg = state.error ? `<p class="error-message" role="alert">${escapeHtml(state.error)}</p>` : "";

  let body = "";
  if (state.stage === "upload") body = uploadHtml();
  else if (state.stage === "friends") body = friendsHtml();
  else if (state.stage === "review") body = reviewHtml();
  else if (state.stage === "language") body = languageHtml();
  else if (state.stage === "story") body = state.choosing ? choiceHtml() : storyHtml();
  else if (state.stage === "offline") body = offlineHtml();
  else if (state.stage === "book") body = bookViewHtml();
  else if (state.stage === "parent") body = parentRecordHtml();

  return `${backBtn}${demoBadge}${errorMsg}${body}`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}

/* -------- 1단계: 그림 올리기 -------- */

function uploadHtml() {
  const heading = continuing() ? "다음 장면 그림을 올려주세요" : "오늘의 그림일기를 올려주세요";
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
            : `<span><b>📷 그림일기 사진 선택</b><small>JPG, PNG, WebP · 최대 8MB</small></span>`
        }
      </label>
      ${state.imageName ? `<p class="file-name">${escapeHtml(state.imageName)}</p>` : ""}
      <button class="text-button" type="button" data-action="use-sample">사진이 없나요? 예제로 시작하기</button>
      ${
        !state.book
          ? `<button class="friend-entry" type="button" data-action="go-friends">
              <span aria-hidden="true">🤝</span>
              <b>친구가 쓰다 만 이야기, 내가 완성해볼까?</b>
              <small>친구 이야기를 읽고 다음 장면을 그리면 함께 지은 책이 돼요</small>
            </button>`
          : ""
      }

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
          <span>얼굴·학교명·주소·연락처가 보이지 않는 그림인지 확인했어요.</span>
        </label>
        <p class="privacy-note">서버에는 저장하지 않아요. 만든 책은 이 기기 브라우저에만 보관되고 언제든 지울 수 있어요.</p>
      </div>

      <button class="primary-button" type="submit" ${canSubmitUpload() ? "" : "disabled"} ${state.busy ? "disabled" : ""}>
        ${state.busy ? "그림 속 이야기를 찾고 있어요…" : "이야기 시작하기 →"}
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
        <span class="stage-emoji" aria-hidden="true">🤝</span>
        <p class="eyebrow">친구가 쓰다 만 이야기</p>
        <h2>내가 이어서 완성해볼까?</h2>
        <p>친구가 남긴 이야기를 읽고, 다음 장면을 그려서 함께 책을 완성해요.</p>
      </div>
      <p class="seed-note">🛈 지금 보이는 이야기는 그림이야기 팀이 만든 예시예요.</p>
      <div class="seed-list">
        ${seedBooks
          .map(
            (seed) => `
          <article class="seed-card">
            <div class="seed-art">
              <img src="${seed.chapters[0].imagePath}" alt="${escapeHtml(seed.authorName)}의 그림" />
              <span class="seed-emoji" aria-hidden="true">${seed.emoji}</span>
            </div>
            <div class="seed-body">
              <p class="eyebrow">${escapeHtml(seed.authorName)}(${seed.authorAge}세)가 ${seed.chapters.length}편까지 썼어요</p>
              <h3>${escapeHtml(seed.chapters[0].story.titleKo)}</h3>
              <p class="seed-hook">${escapeHtml(seed.hook)}</p>
              <details>
                <summary>지금까지의 이야기 읽기</summary>
                <ol>
                  ${seed.chapters
                    .map((chapter) => `<li><b>${escapeHtml(chapter.story.titleKo)}</b><span>${escapeHtml(chapter.story.summaryKo)}</span></li>`)
                    .join("")}
                </ol>
              </details>
              <button class="primary-button" type="button" data-action="pick-friend" data-seed-id="${seed.id}" ${state.busy ? "disabled" : ""}>
                ${state.busy ? "이야기를 가져오는 중…" : `내가 ${seed.chapters.length + 1}편 그릴래 →`}
              </button>
              <small>남은 편: ${MAX_CHAPTERS - seed.chapters.length}편</small>
            </div>
          </article>
        `
          )
          .join("")}
      </div>
      <button class="text-button" type="button" data-action="back-to-upload">내 그림으로 새 이야기 시작하기</button>
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
        <span class="stage-emoji" aria-hidden="true">🔎</span>
        <p class="eyebrow">AI가 이렇게 이해했어요</p>
        <h2>이야기를 만들기 전에<br />부모님이 한 번 확인해주세요.</h2>
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
    { value: "ko", emoji: "🇰🇷", title: "한국어로 읽기", desc: "한국어 이야기와 단어" },
    { value: "en", emoji: "🇺🇸", title: "Read in English", desc: "Easy English story and words" },
    { value: "both", emoji: "🌈", title: "한국어 + English", desc: "같은 이야기를 두 언어로" }
  ];
  return `
    <div class="stage-panel compact-panel">
      <div class="stage-heading">
        <span class="stage-emoji" aria-hidden="true">🌏</span>
        <p class="eyebrow">편한 언어로 이해하고 배우는 언어로 다시 만나요</p>
        <h2>어떻게 읽어볼까요?</h2>
      </div>
      <div class="language-options">
        ${options
          .map(
            (opt) => `
          <button type="button" class="${state.language === opt.value ? "selected" : ""}" data-action="set-language" data-value="${opt.value}">
            <span>${opt.emoji}</span><b>${opt.title}</b><small>${opt.desc}</small>
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
  const composition = currentComposition(index);
  const scene = sceneClasses[index % sceneClasses.length];
  const tilt = [-3, 2, -1, 3][index % 4];
  return `
    <div class="book-page ${scene} ${imageDataUrl ? "has-generated-art" : ""} art-mode-${state.artMode}">
      <div class="storybook-scene framing-${composition.framing} text-${composition.textSide}">
        ${imageDataUrl ? `<img id="generated-page-art" src="${imageDataUrl}" alt="생성된 동화책 삽화" />` : ""}
        <div class="scene-sky"></div>
        <div class="scene-sun"></div>
        <div class="scene-cloud cloud-one"></div>
        <div class="scene-cloud cloud-two"></div>
        <div class="scene-prop prop-one"></div>
        <div class="scene-prop prop-two"></div>
        <div class="character-ground" aria-hidden="true"></div>
        ${
          state.artMode === "whole"
            ? `<img class="framed-drawing" src="${state.imageDataUrl}" alt="아이가 그린 그림" style="--character-tilt:${tilt}deg;" />`
            : state.characterCutoutDataUrl
              ? `<img id="page-art" src="${state.characterCutoutDataUrl}" alt="아이 그림에서 추출한 주인공" style="--character-left:${composition.left};--character-bottom:${composition.bottom};--character-width:${composition.width};--character-height:${composition.height};--character-tilt:${tilt}deg;" />`
              : ""
        }
        <div class="scene-foreground" aria-hidden="true"></div>
        ${drawing ? `<p class="art-loading" role="status"><span class="art-spinner" aria-hidden="true"></span>배경을 그리는 중이에요…</p>` : ""}
        <div class="page-copy">
          ${state.language !== "en" ? `<p class="korean-line">${escapeHtml(page.ko)}</p>` : ""}
          ${state.language !== "ko" ? `<p class="english-line">${escapeHtml(page.en)}</p>` : ""}
        </div>
      </div>
    </div>
  `;
}

function storyHtml() {
  const storyPages = state.story ? state.story.pages : state.opening ? state.opening.pages : [];
  const currentPage = storyPages[state.pageIndex];
  const storyTitle = state.story || state.opening;
  if (!storyTitle || !currentPage) return "";

  const listenButtons = `
    <div class="listen-row">
      ${state.language !== "en" ? `<button type="button" data-action="listen-ko">🔊 한국어 듣기</button>` : ""}
      ${state.language !== "ko" ? `<button type="button" data-action="listen-en">🔊 English</button>` : ""}
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
    navHtml = `<button class="primary-inline" type="button" data-action="finish-chapter" ${state.busy ? "disabled" : ""}>${
      state.busy ? "책에 담는 중…" : "책에 담고 다음으로 →"
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
      <div class="story-copy" style="position:relative;">
        ${
          state.story && state.story.choice && state.pageIndex === OPENING_PAGES
            ? `<span class="choice-badge">${state.story.choice.byVoice ? "🎤" : "👆"} ${escapeHtml(state.nickname)}의 선택 · ${escapeHtml(state.story.choice.ko)}</span>`
            : ""
        }
        ${listenButtons}
        ${wordRow}
      </div>
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
        <span class="stage-emoji" aria-hidden="true">🤔</span>
        <p class="eyebrow">이제 ${escapeHtml(state.nickname)}의 차례! 다음 장면을 정해요</p>
        <h2>${escapeHtml(question)}</h2>
        ${englishLine}
        <button class="listen-question" type="button" data-action="ask-again">🔊 질문 다시 듣기</button>
      </div>

      <div class="choice-cards" role="radiogroup" aria-label="다음 장면 고르기">
        ${opening.choices
          .map((card, index) => {
            const selected = state.choiceSelection && state.choiceSelection.kind === "card" && state.choiceSelection.index === index;
            return `
            <button type="button" role="radio" aria-checked="${selected}" class="choice-card ${selected ? "selected" : ""}" data-action="pick-card" data-index="${index}">
              <span class="choice-emoji" aria-hidden="true">${card.emoji}</span>
              ${state.language !== "en" ? `<b>${escapeHtml(card.ko)}</b>` : ""}
              ${state.language !== "ko" ? `<small>${escapeHtml(card.en)}</small>` : ""}
            </button>`;
          })
          .join("")}

        <div class="choice-card own-card ${state.choiceSelection && state.choiceSelection.kind === "own" ? "selected" : ""}">
          <span class="choice-emoji" aria-hidden="true">💡</span>
          <b>내 생각이 있어요</b>
          ${
            voiceSupported()
              ? `<button type="button" class="voice-button ${state.voiceListening ? "listening" : ""}" data-action="voice-start">${
                  state.voiceListening ? "듣고 있어요…" : "🎤 말로 하기"
                }</button>`
              : ""
          }
          <button class="text-button" type="button" data-action="toggle-typing">${voiceSupported() ? "부모님이 대신 적기" : "✏️ 부모님이 적어주기"}</button>
        </div>
      </div>

      ${state.voiceError ? `<p class="voice-error" role="alert">${escapeHtml(state.voiceError)}</p>` : ""}

      ${
        state.typing
          ? `<label class="own-typing">
              <span>아이가 말한 생각을 그대로 적어주세요</span>
              <input id="own-text-input" maxlength="60" placeholder="예: 조개를 집에 데려가기" value="${escapeHtml(state.ownText)}" />
            </label>`
          : ""
      }

      ${
        ownSelected && state.ownByVoice
          ? `<div class="voice-confirm" role="status">
              <p><small>이렇게 들었어요</small><b>"${escapeHtml(state.ownText)}"</b></p>
              <div>
                ${
                  voiceSupported()
                    ? `<button type="button" class="voice-button" data-action="voice-start">🔁 다시 말하기</button>`
                    : ""
                }
                <button type="button" class="text-button" data-action="edit-own">틀렸으면 고쳐 적기</button>
              </div>
            </div>`
          : ""
      }

      <button class="primary-button" type="button" data-action="confirm-choice" ${!state.choiceSelection || state.busy ? "disabled" : ""}>
        ${state.busy ? "고른 장면으로 이야기를 이어 쓰는 중…" : state.choiceSelection ? "이걸로 할래! →" : "하나를 골라주세요"}
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
      <span class="stage-emoji" aria-hidden="true">🎨</span>
      <p class="eyebrow">이제 ${escapeHtml(state.nickname)}의 차례예요</p>
      <h2>화면을 끌 시간이에요.</h2>
      <div class="offline-question">
        ${state.language !== "en" ? `<p>${escapeHtml(story.offlinePromptKo)}</p>` : ""}
        ${state.language !== "ko" ? `<p class="english-line">${escapeHtml(story.offlinePromptEn)}</p>` : ""}
      </div>
      ${
        state.book && state.book.origin
          ? `<p class="coauthor-line">${
              full
                ? `${escapeHtml(state.book.origin.authorName)}의 이야기를 ${escapeHtml(withParticle(state.nickname, "이가", "가"))} 완성했어요! 🎉`
                : `${escapeHtml(state.book.origin.authorName)}의 이야기를 ${escapeHtml(withParticle(state.nickname, "이가", "가"))} 이어 갔어요!`
            }</p>`
          : ""
      }
      ${
        state.book && !full
          ? `
        <div class="paper-prompt">
          <span>✏️</span>
          <b>다 그렸으면 사진을 올려 ${state.book.chapters.length + 1}편을 이어가요</b>
          <small>지금까지 ${state.book.chapters.length}/${MAX_CHAPTERS}편 · 책은 이 기기에 보관돼요</small>
        </div>
        <div class="offline-actions">
          <button class="primary-button" type="button" data-action="continue-book">다음 장면 그림 올리기 →</button>
          <button class="secondary-button" type="button" data-action="view-book">지금까지 만든 책 보기</button>
          <button class="secondary-button" type="button" data-action="view-parent">👩‍👧 부모 기록 보기</button>
          <button class="text-button" type="button" data-action="finish-today">오늘은 여기까지 ✓</button>
        </div>`
          : `
        <div class="paper-prompt"><span>🎉</span><b>${MAX_CHAPTERS}편짜리 동화책이 완성됐어요!</b></div>
        <div class="offline-actions">
          <button class="primary-button" type="button" data-action="view-book">완성된 책 보기 📖</button>
          <button class="secondary-button" type="button" data-action="view-parent">👩‍👧 부모 기록 보기</button>
          <button class="text-button" type="button" data-action="finish-today">오늘은 여기까지 ✓</button>
        </div>`
      }
      ${state.finished ? `<p class="finish-message" role="status">잘했어요! 이제 종이와 색연필을 준비해볼까요?</p>` : ""}
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
  const chapters = book.chapters;
  const words = uniqueWords(book);
  const places = uniqueValues(chapters.map((c) => c.analysis.place));
  const moods = chapters.map((c) => c.analysis.mood).filter(Boolean);
  const voiceCount = chapters.filter((c) => c.story.choice && c.story.choice.byVoice).length;
  const last = chapters.at(-1);
  const name = escapeHtml(book.nickname);

  return `
    <div class="parent-record">
      <div class="book-toolbar-wizard">
        <strong>👩‍👧 부모 기록</strong>
        <div>
          <button type="button" data-action="view-book">아이 화면(동화책) 보기</button>
          <button type="button" data-action="print-book">🖨️ 인쇄·PDF 저장</button>
        </div>
      </div>

      <div class="stage-heading">
        <p class="eyebrow">오늘 ${name}의 창작 기록</p>
        <h2>${name}의 상상은 이렇게 움직였어요</h2>
      </div>

      <div class="record-cards">
        <div class="record-card"><b>${chapters.length}편</b><small>함께 만든 이야기</small></div>
        <div class="record-card"><b>${chapters.filter((c) => c.story.choice).length}번</b><small>아이가 직접 고른 장면</small></div>
        <div class="record-card"><b>${voiceCount}번</b><small>말로 들려준 생각</small></div>
        <div class="record-card"><b>${words.length}개</b><small>새로 만난 영어 단어</small></div>
      </div>

      ${
        moods.length
          ? `<section class="record-block">
        <h3>오늘의 감정 흐름</h3>
        <ol class="mood-flow">${moods.map((mood) => `<li>${escapeHtml(mood)}</li>`).join("")}</ol>
      </section>`
          : ""
      }

      <section class="record-block">
        <h3>편마다 남긴 기록</h3>
        <ul class="record-list">
          ${chapters
            .map((chapter, index) => {
              const choice = chapter.story.choice;
              return `<li>
                <p class="record-title">${index + 1}편 · ${escapeHtml(chapter.story.titleKo)}</p>
                ${choice ? `<p class="record-choice">${choice.byVoice ? "🎤 말로" : "👆 골라서"} “${escapeHtml(choice.ko)}”</p>` : ""}
                ${chapter.story.parentNoteKo ? `<p class="record-note">${escapeHtml(chapter.story.parentNoteKo)}</p>` : ""}
              </li>`;
            })
            .join("")}
        </ul>
      </section>

      ${
        places.length
          ? `<section class="record-block">
        <h3>상상이 다녀온 곳</h3>
        <p class="record-places">${escapeHtml(places.join("  →  "))}</p>
      </section>`
          : ""
      }

      ${
        words.length
          ? `<section class="record-block">
        <h3>새로 만난 영어 단어</h3>
        <ul class="word-cards">${words.map((w) => `<li><b>${escapeHtml(w.en)}</b><span>${escapeHtml(w.ko)}</span></li>`).join("")}</ul>
      </section>`
          : ""
      }

      ${
        book.practiced && book.practiced.length
          ? `<section class="record-block">
        <h3>오늘 말해본 단어</h3>
        <p class="record-practiced">오늘 말해본 단어 ${book.practiced.length}개 — ${escapeHtml(book.practiced.join(", "))}</p>
      </section>`
          : ""
      }

      <section class="record-block record-question">
        <h3>오늘 함께 나눌 질문</h3>
        <p>${escapeHtml(last.story.offlinePromptKo)}</p>
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
          practice.listening ? "듣고 있어요…" : "🎤 따라 말하기"
        }</button>`
      : "";
  let feedback = "";
  if (practice.feedback === "success") feedback = `<p class="practice-feedback success">잘했어요!</p>`;
  else if (practice.feedback === "retry") feedback = `<p class="practice-feedback retry">한 번 더 해볼까?</p>`;
  else if (practice.feedback === "done") feedback = `<p class="practice-feedback done">다음에 또 해보자</p>`;

  return `
    <li class="recurring-word-card">
      ${practiced ? `<span class="practice-stamp" aria-hidden="true">⭐</span>` : ""}
      <b>${escapeHtml(word.en)}</b>
      <span>${escapeHtml(word.ko)}</span>
      <div class="recurring-word-actions">
        <button type="button" data-action="word-listen" data-word="${escapeHtml(word.en)}">🔊 듣기</button>
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
        if (storage) saveBook(storage, state.book);
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
        ${book.origin ? `<p class="book-origin-note">🤝 친구 이야기를 이어서 함께 지었어요</p>` : ""}
      </div>`;
  } else if (spread.kind === "page") {
    const chapter = book.chapters[spread.chapter];
    const page = chapter.story.pages[spread.page];
    content = `
      <div class="book-page-spread" style="display:grid;gap:18px;">
        <div class="story-image" style="position:relative;height:clamp(220px,40vh,340px);overflow:hidden;border-radius:22px;">
          <img src="${chapter.imageDataUrl}" alt="${spread.chapter + 1}편 그림" style="width:100%;height:100%;object-fit:cover;object-position:${page.focus.x}% ${page.focus.y}%;" />
          <span class="original-badge">${spread.chapter + 1}편${chapter.author ? ` · ${escapeHtml(withParticle(chapter.author, "이", ""))} 씀` : ""} · ${escapeHtml(
      book.language === "en" ? chapter.story.titleEn : chapter.story.titleKo
    )}</span>
        </div>
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
                  .map((c, i) => (c.story.choice ? `<li>${i + 1}편 · ${c.story.choice.byVoice ? "🎤 말로" : "👆 골라서"} "${escapeHtml(c.story.choice.ko)}"</li>` : ""))
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
    navRight = `<button class="primary-inline" type="button" data-action="continue-book">${book.chapters.length + 1}편 이어 그리기 →</button>`;
  } else {
    navRight = `<button class="primary-inline" type="button" data-action="book-restart">처음부터 다시 읽기</button>`;
  }

  return `
    <div class="book-stage">
      <div class="book-toolbar-wizard">
        <strong>${index + 1} / ${spreads.length}</strong>
        <div>
          <button type="button" data-action="print-book">🖨️ 인쇄·PDF 저장</button>
          <button type="button" data-action="new-book">새 책 시작</button>
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
    state.imageName = file.name;
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
    state.imageName = `그림일기_예제_${chapterNumber()}편.png`;
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
  state.typing = false;
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
  const next = appendChapter(
    state.book,
    { imageDataUrl: storedImage, analysis: state.analysis, story: state.story },
    { nickname: state.nickname.trim(), age: state.age, language: state.language }
  );
  state.book = next;
  const storage = browserStorage();
  const result = storage ? saveBook(storage, next) : { ok: false, message: "이 브라우저에서는 책을 보관할 수 없어요." };
  state.busy = false;
  go("offline");
  if (!result.ok) setError(result.message);
}

function resetDrawing() {
  state.imageDataUrl = "";
  state.imageName = "";
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
    resetDrawing();
    state.stage = "upload";
    state.busy = false;
    render();
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
  if (state.book && !window.confirm("지금 책을 지우고 새 책을 시작할까요? 필요하면 먼저 인쇄·PDF로 저장해주세요.")) return;
  const storage = browserStorage();
  if (storage) clearBook(storage);
  state.book = null;
  resetDrawing();
  state.error = "";
  state.stage = "upload";
  render();
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
      state.typing = false;
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
    case "use-sample":
      useSample();
      break;
    case "go-friends":
      go("friends");
      break;
    case "back-to-upload":
      go("upload");
      break;
    case "pick-friend": {
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
    case "toggle-typing":
      state.typing = !state.typing;
      render();
      break;
    case "edit-own":
      state.typing = true;
      render();
      break;
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
