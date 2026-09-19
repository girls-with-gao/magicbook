"use client";

import { MAX_CHAPTERS } from "@/lib/story-types";
import { seedBooks, type SeedBook } from "@/lib/seed-books";

/**
 * 친구가 쓰다 만 이야기 고르기. 여기 있는 이야기는 팀이 만든 예시이고,
 * 화면에서도 그렇게 밝힌다. 실제 아이들의 글이 오가지는 않는다.
 */
export function FriendPicker({
  busy,
  onPick,
  onBack
}: {
  busy: boolean;
  onPick: (seed: SeedBook) => void;
  onBack: () => void;
}) {
  return (
    <div className="stage-panel friend-panel">
      <div className="stage-heading">
        <span className="stage-emoji" aria-hidden="true">🤝</span>
        <p className="eyebrow">친구가 쓰다 만 이야기</p>
        <h2>내가 이어서 완성해볼까?</h2>
        <p>친구가 남긴 이야기를 읽고, 다음 장면을 그려서 함께 책을 완성해요.</p>
      </div>

      <p className="seed-note">🛈 지금 보이는 이야기는 그림이야기 팀이 만든 예시예요.</p>

      <div className="seed-list">
        {seedBooks.map((seed) => (
          <article className="seed-card" key={seed.id}>
            <div className="seed-art">
              {/* 예시 그림은 정적 파일이라 next/image 최적화가 필요 없다. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={seed.chapters[0].imagePath} alt={`${seed.authorName}의 그림`} />
              <span className="seed-emoji" aria-hidden="true">{seed.emoji}</span>
            </div>
            <div className="seed-body">
              <p className="eyebrow">{seed.authorName}({seed.authorAge}세)가 {seed.chapters.length}편까지 썼어요</p>
              <h3>{seed.chapters[0].story.titleKo}</h3>
              <p className="seed-hook">{seed.hook}</p>
              <details>
                <summary>지금까지의 이야기 읽기</summary>
                <ol>
                  {seed.chapters.map((chapter, index) => (
                    <li key={index}>
                      <b>{chapter.story.titleKo}</b>
                      <span>{chapter.story.summaryKo}</span>
                    </li>
                  ))}
                </ol>
              </details>
              <button className="primary-button" type="button" disabled={busy} onClick={() => onPick(seed)}>
                {busy ? "이야기를 가져오는 중…" : `내가 ${seed.chapters.length + 1}편 그릴래 →`}
              </button>
              <small>남은 편: {MAX_CHAPTERS - seed.chapters.length}편</small>
            </div>
          </article>
        ))}
      </div>

      <button className="text-button" type="button" onClick={onBack}>내 그림으로 새 이야기 시작하기</button>
    </div>
  );
}
