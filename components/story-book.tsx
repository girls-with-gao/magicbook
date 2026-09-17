"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { MAX_CHAPTERS, type StoryBook as Book, type StoryWord } from "@/lib/story-types";

type Spread =
  | { kind: "cover" }
  | { kind: "page"; chapter: number; page: number }
  | { kind: "words" }
  | { kind: "parent" };

function uniqueWords(book: Book) {
  const seen = new Set<string>();
  const words: StoryWord[] = [];
  book.chapters.forEach((chapter) =>
    chapter.story.pages.forEach((page) =>
      page.words.forEach((word) => {
        const key = word.en.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        words.push(word);
      })
    )
  );
  return words;
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export function StoryBookView({
  book,
  onContinue,
  onNewBook
}: {
  book: Book;
  onContinue: () => void;
  onNewBook: () => void;
}) {
  const [index, setIndex] = useState(0);
  const language = book.language;
  const first = book.chapters[0];
  const last = book.chapters.at(-1);
  const complete = book.chapters.length >= MAX_CHAPTERS;

  const spreads = useMemo<Spread[]>(
    () => [
      { kind: "cover" },
      ...book.chapters.flatMap((chapter, chapterIndex) =>
        chapter.story.pages.map((_, page) => ({ kind: "page" as const, chapter: chapterIndex, page }))
      ),
      { kind: "words" },
      { kind: "parent" }
    ],
    [book.chapters]
  );
  const words = useMemo(() => uniqueWords(book), [book]);
  const characters = unique(book.chapters.flatMap((chapter) => chapter.analysis.characters));
  const places = unique(book.chapters.map((chapter) => chapter.analysis.place));

  if (!first || !last) return null;

  function renderSpread(spread: Spread) {
    if (spread.kind === "cover") {
      return (
        <div className="book-cover">
          <div className="book-cover-art">
            <Image src={first.imageDataUrl} alt="첫 번째 그림" fill sizes="(max-width: 720px) 92vw, 520px" unoptimized />
          </div>
          <p className="eyebrow">{complete ? "완성된 동화책" : `만들고 있는 동화책 · ${book.chapters.length}편`}</p>
          <h2>{language === "en" ? first.story.titleEn : first.story.titleKo}</h2>
          {language === "both" ? <p className="english-line">{first.story.titleEn}</p> : null}
          <p className="book-author">지은이 · {book.nickname}</p>
        </div>
      );
    }

    if (spread.kind === "page") {
      const chapter = book.chapters[spread.chapter];
      const page = chapter.story.pages[spread.page];
      return (
        <div className="book-page-spread">
          <div className="story-image">
            <Image
              src={chapter.imageDataUrl}
              alt={`${spread.chapter + 1}편 그림`}
              fill
              sizes="(max-width: 720px) 92vw, 560px"
              unoptimized
              style={{ objectFit: "cover", objectPosition: `${page.focus.x}% ${page.focus.y}%` }}
            />
            <span className="original-badge">
              {spread.chapter + 1}편 · {language === "en" ? chapter.story.titleEn : chapter.story.titleKo}
            </span>
          </div>
          <div className="story-copy">
            {language !== "en" ? <p className="korean-line">{page.ko}</p> : null}
            {language !== "ko" ? <p className="english-line">{page.en}</p> : null}
          </div>
        </div>
      );
    }

    if (spread.kind === "words") {
      return (
        <div className="book-extra">
          <p className="eyebrow">이 책에서 만난 영어 단어</p>
          <h2>단어 카드 {words.length}장</h2>
          <ul className="word-cards">
            {words.map((word) => (
              <li key={`${word.ko}-${word.en}`}>
                <b>{word.en}</b>
                <span>{word.ko}</span>
              </li>
            ))}
          </ul>
        </div>
      );
    }

    return (
      <div className="book-extra parent-summary">
        <p className="eyebrow">부모님께 드리는 한 장 요약</p>
        <h2>{book.nickname}의 상상 기록</h2>
        <dl>
          <div><dt>등장인물</dt><dd>{characters.join(", ")}</dd></div>
          <div><dt>상상한 장소</dt><dd>{places.join(" → ")}</dd></div>
          <div>
            <dt>이야기 흐름</dt>
            <dd>
              <ol>
                {book.chapters.map((chapter, chapterIndex) => (
                  <li key={chapterIndex}><b>{chapter.story.titleKo}</b> — {chapter.story.summaryKo}</li>
                ))}
              </ol>
            </dd>
          </div>
          {book.chapters.some((chapter) => chapter.story.choice) ? (
            <div>
              <dt>{book.nickname}이(가) 정한 장면</dt>
              <dd>
                <ul className="choice-list">
                  {book.chapters.map((chapter, chapterIndex) =>
                    chapter.story.choice ? (
                      <li key={chapterIndex}>
                        {chapterIndex + 1}편 · {chapter.story.choice.byVoice ? "🎤 말로" : "👆 골라서"} “{chapter.story.choice.ko}”
                      </li>
                    ) : null
                  )}
                </ul>
              </dd>
            </div>
          ) : null}
          <div><dt>새로 만난 영어 단어</dt><dd>{words.map((word) => word.en).join(", ")}</dd></div>
          <div><dt>함께 나눌 질문</dt><dd>{last?.story.offlinePromptKo}</dd></div>
        </dl>
      </div>
    );
  }

  return (
    <div className="book-stage">
      <div className="book-toolbar">
        <strong>{index + 1} / {spreads.length}</strong>
        <div>
          <button type="button" onClick={() => window.print()}>🖨️ 인쇄·PDF 저장</button>
          <button type="button" onClick={onNewBook}>새 책 시작</button>
        </div>
      </div>

      <div className="book-spreads">
        {spreads.map((spread, spreadIndex) => (
          <section
            className={`book-spread ${spreadIndex === index ? "current" : ""}`}
            key={spreadIndex}
            aria-hidden={spreadIndex !== index}
          >
            {renderSpread(spread)}
          </section>
        ))}
      </div>

      <div className="story-nav">
        <button type="button" disabled={index === 0} onClick={() => setIndex((value) => Math.max(0, value - 1))}>← 이전</button>
        {index < spreads.length - 1 ? (
          <button className="primary-inline" type="button" onClick={() => setIndex((value) => Math.min(spreads.length - 1, value + 1))}>다음 →</button>
        ) : !complete ? (
          <button className="primary-inline" type="button" onClick={onContinue}>{book.chapters.length + 1}편 이어 그리기 →</button>
        ) : (
          <button className="primary-inline" type="button" onClick={() => setIndex(0)}>처음부터 다시 읽기</button>
        )}
      </div>
    </div>
  );
}
