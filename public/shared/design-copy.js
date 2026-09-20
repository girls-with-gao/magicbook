export const homeActions = {
  newDrawing: "새 그림",
  friendBook: "친구 책",
  myBook: "내 책"
};

export const icons = {
  brand: "/assets/icons/icon-final-home.png",
  home: "/assets/icons/icon-final-home.png",
  newDrawing: "/assets/icons/icon-final-new-drawing.png",
  myBook: "/assets/icons/icon-final-bookshelf.png",
  friendBook: "/assets/icons/icon-final-friend-book.png",
  photoUpload: "/assets/icons/icon-final-photo-upload.png",
  parent: "/assets/icons/icon-final-parent-record.png",
  review: "/assets/icons/icon-final-review.png",
  read: "/assets/icons/icon-final-read-book.png",
  choice: "/assets/icons/icon-final-choice.png",
  paperMission: "/assets/icons/icon-final-paper-mission.png",
  listen: "/assets/icons/icon-final-listen.png",
  speak: "/assets/icons/icon-final-speak.png",
  stamp: "/assets/icons/icon-final-stamp.png",
  print: "/assets/icons/icon-final-print.png",
  finishToday: "/assets/icons/icon-final-finish-today.png",
  actionListen: "/assets/icons/choice-actions/action-listen.png",
  actionSpeak: "/assets/icons/choice-actions/action-speak.png",
  actionHello: "/assets/icons/choice-actions/action-hello.png",
  actionFriend: "/assets/icons/choice-actions/action-friend.png",
  actionSing: "/assets/icons/choice-actions/action-sing.png",
  actionSingTogether: "/assets/icons/choice-actions/action-sing-together.png",
  actionLookAround: "/assets/icons/choice-actions/action-look-around.png",
  actionIntroduce: "/assets/icons/choice-actions/action-introduce.png",
  actionDance: "/assets/icons/choice-actions/action-dance.png",
  actionGift: "/assets/icons/choice-actions/action-gift.png",
  actionHug: "/assets/icons/choice-actions/action-hug.png",
  actionFollow: "/assets/icons/choice-actions/action-follow.png",
  actionSearch: "/assets/icons/choice-actions/action-search.png",
  actionHelp: "/assets/icons/choice-actions/action-help.png",
  actionCheer: "/assets/icons/choice-actions/action-cheer.png",
  actionShare: "/assets/icons/choice-actions/action-share.png",
  actionTogether: "/assets/icons/choice-actions/action-together.png",
  actionSleep: "/assets/icons/choice-actions/action-sleep.png",
  actionHide: "/assets/icons/choice-actions/action-hide.png",
  actionThanks: "/assets/icons/choice-actions/action-thanks.png",
  actionOpen: "/assets/icons/choice-actions/action-open.png",
  actionShine: "/assets/icons/choice-actions/action-shine.png",
  actionBuild: "/assets/icons/choice-actions/action-build.png",
  actionReturn: "/assets/icons/choice-actions/action-return.png"
};

const choiceIconRules = [
  { icon: "actionGift", pattern: /(선물|gift|present)/i },
  { icon: "actionDance", pattern: /(춤|댄스|dance)/i },
  { icon: "actionSingTogether", pattern: /(같이 노래|함께 노래|sing together)/i },
  { icon: "actionSing", pattern: /(노래|불러|sing|song)/i },
  { icon: "actionListen", pattern: /(듣|소리|listen|sound|hear)/i },
  { icon: "actionFriend", pattern: /(친구|친해|friends?|friendship)/i },
  { icon: "actionIntroduce", pattern: /(소개|introduce)/i },
  { icon: "actionHello", pattern: /(인사|안녕|작별|hello|bye|goodbye)/i },
  { icon: "actionSleep", pattern: /(잠|자기|잠들|쉬|sleep|rest|nap)/i },
  { icon: "actionShare", pattern: /(나눠|나누|쿠키|간식|share|cookies?|snack)/i },
  { icon: "actionThanks", pattern: /(고마|감사|thank)/i },
  { icon: "actionHide", pattern: /(숨바꼭질|숨|hide|seek)/i },
  { icon: "actionCheer", pattern: /(응원|격려|cheer)/i },
  { icon: "actionHug", pattern: /(안아|위로|달래|hug|comfort)/i },
  { icon: "actionHelp", pattern: /(도와|구해|고쳐|help|save|fix)/i },
  { icon: "actionLookAround", pattern: /(구경|둘러|마을|look around|village)/i },
  { icon: "actionSearch", pattern: /(찾|숨어|자세히|살펴|관찰|search|find|look for|look closely|closely|examine|watch)/i },
  { icon: "actionOpen", pattern: /(열|문|상자|조개를 열|open)/i },
  { icon: "actionShine", pattern: /(빛내|밝|반짝|마법|등불|shine|light|magic)/i },
  { icon: "actionBuild", pattern: /(만들|짓|쌓|다리|build|make)/i },
  { icon: "actionReturn", pattern: /(돌아|집|다시 만나|return|home|come back)/i },
  { icon: "actionFollow", pattern: /(따라|길|발자국|follow|path|trail)/i },
  { icon: "actionTogether", pattern: /(같이|함께|떠나|모험|together|with|go)/i },
  { icon: "actionSpeak", pattern: /(말|묻|물어|이야기|speak|talk|ask)/i }
];

export const choiceIconKeyValues = [
  "gift",
  "dance",
  "singTogether",
  "sing",
  "listen",
  "friend",
  "introduce",
  "hello",
  "sleep",
  "share",
  "thanks",
  "hide",
  "cheer",
  "hug",
  "help",
  "lookAround",
  "search",
  "open",
  "shine",
  "build",
  "return",
  "follow",
  "together",
  "speak",
  "generic"
];

export const choiceIconKeyOptions = choiceIconKeyValues.join(" | ");

const choiceIconByKey = {
  gift: "actionGift",
  dance: "actionDance",
  singTogether: "actionSingTogether",
  sing: "actionSing",
  listen: "actionListen",
  friend: "actionFriend",
  introduce: "actionIntroduce",
  hello: "actionHello",
  sleep: "actionSleep",
  share: "actionShare",
  thanks: "actionThanks",
  hide: "actionHide",
  cheer: "actionCheer",
  hug: "actionHug",
  help: "actionHelp",
  lookAround: "actionLookAround",
  search: "actionSearch",
  open: "actionOpen",
  shine: "actionShine",
  build: "actionBuild",
  return: "actionReturn",
  follow: "actionFollow",
  together: "actionTogether",
  speak: "actionSpeak",
  generic: "choice"
};

export function cleanChoiceIconKey(value, fallback = "generic") {
  return choiceIconKeyValues.includes(value) ? value : fallback;
}

export function choiceIconForText(value) {
  const text = String(value || "");
  return choiceIconRules.find((rule) => rule.pattern.test(text))?.icon || "choice";
}

export function choiceIconForChoice(choice) {
  if (choice && typeof choice === "object" && typeof choice.iconKey === "string") {
    return choiceIconByKey[cleanChoiceIconKey(choice.iconKey)];
  }
  return choiceIconForText(`${choice?.ko || ""} ${choice?.en || ""}`);
}

export const childJourneySteps = [
  { stage: "upload", icon: "newDrawing", label: "그림" },
  { stage: "review", icon: "review", label: "확인" },
  { stage: "story", icon: "read", label: "읽기" },
  { stage: "choice", icon: "choice", label: "고르기" },
  { stage: "offline", icon: "paperMission", label: "다시 그리기" }
];

export const missionHints = [
  "주인공을 크게 그려요.",
  "새 친구나 장소를 하나 넣어도 좋아요.",
  "다 그리면 사진을 올려요."
];
