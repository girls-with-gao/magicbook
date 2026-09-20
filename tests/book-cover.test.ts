import { describe, expect, it } from "vitest";
import { buildBookCover } from "../public/shared/book-cover.js";
import type { StoryBook } from "../public/shared/story-types.js";

const book: StoryBook = {
  id: "book-1",
  nickname: "수민",
  age: 7,
  language: "both",
  createdAt: "2026-09-18T10:00:00.000Z",
  updatedAt: "2026-09-20T12:00:00.000Z",
  chapters: [
    {
      imageDataUrl: "data:image/png;base64,AAAA",
      analysis: {
        characters: ["수민", "조개"],
        place: "바닷가",
        objects: ["조개"],
        mood: "궁금한 분위기",
        diaryText: "조개를 찾았다."
      },
      story: {
        titleKo: "수민이와 조개의 비밀",
        titleEn: "The Secret Shell",
        pages: [],
        offlinePromptKo: "다음 장면을 그려볼까요?",
        offlinePromptEn: "Draw the next scene.",
        summaryKo: "수민이는 조개를 만났다."
      }
    }
  ]
};

describe("book cover", () => {
  it("builds a cover from stored book data without AI calls", () => {
    expect(buildBookCover(book)).toEqual({
      title: "수민이와 조개의 비밀",
      imageDataUrl: "data:image/png;base64,AAAA",
      dateLabel: "2026. 9. 20.",
      progressLabel: "1/4편",
      statusLabel: "진행 중",
      ownerLabel: "수민의 그림책"
    });
  });

  it("marks full books as completed", () => {
    const complete = {
      ...book,
      chapters: [book.chapters[0], book.chapters[0], book.chapters[0], book.chapters[0]]
    };

    expect(buildBookCover(complete).statusLabel).toBe("완성");
    expect(buildBookCover(complete).progressLabel).toBe("4/4편");
  });

  it("uses the latest chapter drawing as the album cover while keeping the book title", () => {
    const secondChapter = {
      ...book.chapters[0],
      imageDataUrl: "data:image/png;base64,BBBB",
      story: { ...book.chapters[0].story, titleKo: "이어진 두 번째 이야기" }
    };
    const multiChapterBook = { ...book, chapters: [book.chapters[0], secondChapter] };

    expect(buildBookCover(multiChapterBook).imageDataUrl).toBe("data:image/png;base64,BBBB");
    expect(buildBookCover(multiChapterBook).title).toBe("수민이와 조개의 비밀");
  });
});
