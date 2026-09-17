const form = document.querySelector("#story-form");
const imageInput = document.querySelector("#image");
const preview = document.querySelector("#preview");
const dropCopy = document.querySelector("#drop-copy");
const emptyState = document.querySelector("#empty-state");
const loading = document.querySelector("#loading");
const book = document.querySelector("#book");
const pageLabel = document.querySelector("#page-label");
const storyTitle = document.querySelector("#story-title");
const bookPage = document.querySelector("#book-page");
const storybookScene = document.querySelector("#storybook-scene");
const generatedPageArt = document.querySelector("#generated-page-art");
const pageArt = document.querySelector("#page-art");
const moodBadge = document.querySelector("#mood-badge");
const characterLine = document.querySelector("#character-line");
const pageKo = document.querySelector("#page-ko");
const pageEn = document.querySelector("#page-en");
const storyNote = document.querySelector("#story-note");
const promptList = document.querySelector("#prompt-list");
const wordList = document.querySelector("#word-list");
const prevPage = document.querySelector("#prev-page");
const nextPage = document.querySelector("#next-page");
const toggleEnglish = document.querySelector("#toggle-english");
const printBook = document.querySelector("#print-book");

let currentStory = null;
let currentPage = 0;
let uploadedImageDataUrl = "";
let characterCutoutDataUrl = "";
let characterIdentity = "";
let characterName = "";

const moods = ["짜잔!", "와!", "?", "좋아!", "다음?"];
const sceneClasses = ["scene-dino", "scene-magic", "scene-sea", "scene-night"];

function getSelected(group) {
  return document.querySelector(`[data-name="${group}"] .selected`)?.dataset.value;
}

function bindChoiceButtons(selector) {
  document.querySelectorAll(selector).forEach((button) => {
    button.addEventListener("click", () => {
      const group = button.parentElement;
      group.querySelectorAll("button").forEach((item) => item.classList.remove("selected"));
      button.classList.add("selected");
    });
  });
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve("");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function extractCharacter(dataUrl) {
  return new Promise((resolve) => {
    if (!dataUrl) {
      resolve("");
      return;
    }

    const image = new Image();
    image.onload = () => {
      const maxSide = 900;
      const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      let minX = canvas.width;
      let minY = canvas.height;
      let maxX = 0;
      let maxY = 0;

      for (let y = 0; y < canvas.height; y += 1) {
        for (let x = 0; x < canvas.width; x += 1) {
          const index = (y * canvas.width + x) * 4;
          const r = data[index];
          const g = data[index + 1];
          const b = data[index + 2];
          const isPaper = r > 218 && g > 218 && b > 205 && Math.abs(r - g) < 28 && Math.abs(g - b) < 36;
          if (isPaper) {
            data[index + 3] = 0;
          } else if (data[index + 3] > 20) {
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          }
        }
      }

      ctx.putImageData(imageData, 0, 0);

      if (minX >= maxX || minY >= maxY) {
        resolve(dataUrl);
        return;
      }

      const padding = 18;
      const sx = Math.max(0, minX - padding);
      const sy = Math.max(0, minY - padding);
      const sw = Math.min(canvas.width - sx, maxX - minX + padding * 2);
      const sh = Math.min(canvas.height - sy, maxY - minY + padding * 2);
      const output = document.createElement("canvas");
      output.width = sw;
      output.height = sh;
      output.getContext("2d").drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);
      resolve(output.toDataURL("image/png"));
    };
    image.onerror = () => resolve(dataUrl);
    image.src = dataUrl;
  });
}

function setBusy(isBusy) {
  form.querySelector(".submit").disabled = isBusy;
  emptyState.hidden = true;
  loading.hidden = !isBusy;
  book.hidden = true;
  if (isBusy) {
    loading.querySelector("p").textContent = "동화 글과 그림책 삽화를 만들고 있어요. 최대 1분 정도 걸릴 수 있어요...";
  }
}

function renderStory() {
  if (!currentStory) return;
  const pages = currentStory.pages || [];
  const totalPages = pages.length;
  const storyPage = pages[currentPage] || { ko: "", en: "" };
  const characterLabel = [characterName, characterIdentity].filter(Boolean).join(" · ") || "아이 그림 주인공";
  const scene = sceneClasses[currentPage % sceneClasses.length];

  storyTitle.textContent = currentStory.title || "매직북";
  pageLabel.textContent = `${currentPage + 1} / ${totalPages}`;
  pageKo.textContent = storyPage.ko;
  pageEn.textContent = storyPage.en;
  characterLine.textContent = `아이 그림 기반 생성 · ${characterLabel}`;
  storyNote.textContent = currentStory.note || "";
  storyNote.hidden = !currentStory.note;
  prevPage.disabled = currentPage === 0;
  nextPage.disabled = currentPage === totalPages - 1;
  generatedPageArt.src = storyPage.imageDataUrl || "";
  bookPage.classList.toggle("has-generated-art", Boolean(storyPage.imageDataUrl));
  storybookScene.hidden = !characterCutoutDataUrl;
  pageArt.src = characterCutoutDataUrl;
  pageArt.style.setProperty("--character-tilt", `${[-4, 3, -1, 5, -3][currentPage % 5]}deg`);
  pageArt.style.setProperty("--character-scale", `${[1.06, 0.98, 1.02, 0.96, 1.04][currentPage % 5]}`);
  moodBadge.textContent = moods[currentPage % moods.length];
  moodBadge.hidden = !uploadedImageDataUrl;
  bookPage.classList.remove(...sceneClasses);
  bookPage.classList.add(scene);

  promptList.innerHTML = "";
  (currentStory.prompts || []).forEach((prompt) => {
    const item = document.createElement("li");
    item.textContent = prompt;
    promptList.append(item);
  });

  wordList.innerHTML = "";
  (currentStory.englishWords || []).forEach((entry) => {
    const item = document.createElement("span");
    item.className = "word";
    item.textContent = `${entry.word} · ${entry.meaning}`;
    wordList.append(item);
  });
}

imageInput.addEventListener("change", async () => {
  const file = imageInput.files?.[0];
  if (!file) return;
  const dataUrl = await fileToDataUrl(file);
  preview.src = dataUrl;
  preview.style.display = "block";
  dropCopy.style.display = "none";
});

bindChoiceButtons(".chip");
bindChoiceButtons(".segment");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setBusy(true);

  try {
    const imageDataUrl = await fileToDataUrl(imageInput.files?.[0]);
    uploadedImageDataUrl = imageDataUrl;
    characterCutoutDataUrl = await extractCharacter(imageDataUrl);
    characterIdentity = document.querySelector("#character-identity").value.trim();
    characterName = document.querySelector("#character-name").value.trim();
    const payload = {
      imageDataUrl,
      childName: document.querySelector("#child-name").value.trim(),
      age: document.querySelector("#age").value,
      characterIdentity,
      characterName,
      characterDetails: document.querySelector("#character-details").value.trim(),
      diaryText: document.querySelector("#diary-text").value.trim(),
      theme: getSelected("theme"),
      mode: getSelected("mode")
    };

    const response = await fetch("/api/generate-story", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "이야기를 만들지 못했어요.");

    currentStory = data.story;
    currentPage = 0;
    loading.hidden = true;
    book.hidden = false;
    renderStory();
  } catch (error) {
    loading.hidden = true;
    emptyState.hidden = false;
    emptyState.innerHTML = `<p>${error.message}</p>`;
  } finally {
    form.querySelector(".submit").disabled = false;
  }
});

prevPage.addEventListener("click", () => {
  currentPage = Math.max(0, currentPage - 1);
  renderStory();
});

nextPage.addEventListener("click", () => {
  currentPage = Math.min((currentStory?.pages?.length || 1) - 1, currentPage + 1);
  renderStory();
});

toggleEnglish.addEventListener("click", () => {
  book.classList.toggle("show-english");
  toggleEnglish.textContent = book.classList.contains("show-english") ? "영어 숨기기" : "영어 보기";
});

printBook.addEventListener("click", () => {
  window.print();
});
