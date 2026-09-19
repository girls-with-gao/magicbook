// 이야기 구조에서 쓰는 상수와 JSDoc 타입 정의. 브라우저와 server.js가 함께 import한다.

/**
 * @typedef {"ko"|"en"|"both"} LanguageMode
 *
 * @typedef {Object} DrawingAnalysis
 * @property {string[]} characters
 * @property {string} place
 * @property {string[]} objects
 * @property {string} mood
 * @property {string} diaryText
 *
 * @typedef {Object} StoryWord
 * @property {string} ko
 * @property {string} en
 *
 * @typedef {Object} StoryPage
 * @property {string} ko
 * @property {string} en
 * @property {StoryWord[]} words
 * @property {{x:number,y:number}} focus
 *
 * @typedef {Object} StoryChoice
 * @property {string} emoji
 * @property {string} ko
 * @property {string} en
 *
 * @typedef {Object} ChildChoice
 * @property {string} ko
 * @property {string} en
 * @property {boolean} byVoice
 *
 * @typedef {Object} StoryOpening
 * @property {string} titleKo
 * @property {string} titleEn
 * @property {StoryPage[]} pages
 * @property {string} questionKo
 * @property {string} questionEn
 * @property {StoryChoice[]} choices
 *
 * @typedef {Object} StoryEnding
 * @property {StoryPage[]} pages
 * @property {string} offlinePromptKo
 * @property {string} offlinePromptEn
 * @property {string} summaryKo
 *
 * @typedef {Object} BilingualStory
 * @property {string} titleKo
 * @property {string} titleEn
 * @property {StoryPage[]} pages
 * @property {string} offlinePromptKo
 * @property {string} offlinePromptEn
 * @property {string} summaryKo
 * @property {ChildChoice} [choice]
 *
 * @typedef {Object} PreviousChapter
 * @property {string} titleKo
 * @property {string} summaryKo
 *
 * @typedef {Object} StoryChapter
 * @property {string} imageDataUrl
 * @property {DrawingAnalysis} analysis
 * @property {BilingualStory} story
 * @property {string} [author]
 *
 * @typedef {Object} BookOrigin
 * @property {"friend"} type
 * @property {string} seedId
 * @property {string} authorName
 *
 * @typedef {Object} StoryBook
 * @property {string} id
 * @property {string} nickname
 * @property {number} age
 * @property {LanguageMode} language
 * @property {StoryChapter[]} chapters
 * @property {string} createdAt
 * @property {BookOrigin} [origin]
 *
 * @typedef {Object} StoryRequest
 * @property {string} nickname
 * @property {number} age
 * @property {DrawingAnalysis} analysis
 * @property {PreviousChapter[]} [previousChapters]
 *
 * @typedef {StoryRequest & {opening: StoryOpening, choice: ChildChoice}} EndingRequest
 */

export const OPENING_PAGES = 2;
export const STORY_PAGES = 4;
export const CHOICE_COUNT = 3;
export const MAX_CHAPTERS = 4;
