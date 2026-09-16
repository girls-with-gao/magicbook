const form = document.querySelector("#story-form");
const imageInput = document.querySelector("#image");
const preview = document.querySelector("#preview");
const dropCopy = document.querySelector("#drop-copy");
const emptyState = document.querySelector("#empty-state");
const loading = document.querySelector("#loading");
const book = document.querySelector("#book");
const pageLabel = document.querySelector("#page-label");
const storyTitle = document.querySelector("#story-title");
const pageArtWrap = document.querySelector("#page-art-wrap");
const pageArt = document.querySelector("#page-art");
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

function setBusy(isBusy) {
  form.querySelector(".submit").disabled = isBusy;
  emptyState.hidden = true;
  loading.hidden = !isBusy;
  book.hidden = true;
}

function renderStory() {
  if (!currentStory) return;
  const pages = currentStory.pages || [];
  const totalPages = pages.length + 1;
  const isCover = currentPage === 0;
  const storyPage = pages[currentPage - 1] || { ko: "", en: "" };

  storyTitle.textContent = currentStory.title || "매직북";
  pageLabel.textContent = `${currentPage + 1} / ${totalPages}`;
  pageKo.textContent = isCover
    ? `${currentStory.title || "매직북"}\n\n이 책은 아이가 직접 그린 그림에서 시작됐어요.`
    : storyPage.ko;
  pageEn.textContent = isCover ? currentStory.summary || "" : storyPage.en;
  storyNote.textContent = currentStory.note || "";
  storyNote.hidden = !currentStory.note;
  prevPage.disabled = currentPage === 0;
  nextPage.disabled = currentPage === totalPages - 1;
  pageArtWrap.hidden = !uploadedImageDataUrl;
  pageArt.src = uploadedImageDataUrl;
  book.classList.toggle("cover-page", isCover);

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
    const payload = {
      imageDataUrl,
      childName: document.querySelector("#child-name").value.trim(),
      age: document.querySelector("#age").value,
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
  currentPage = Math.min((currentStory?.pages?.length || 0), currentPage + 1);
  renderStory();
});

toggleEnglish.addEventListener("click", () => {
  book.classList.toggle("show-english");
  toggleEnglish.textContent = book.classList.contains("show-english") ? "영어 숨기기" : "영어 보기";
});

printBook.addEventListener("click", () => {
  window.print();
});
