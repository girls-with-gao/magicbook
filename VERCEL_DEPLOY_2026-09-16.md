# 그림이야기 Vercel 배포 안내

배포는 내 컴퓨터에서만 보이던 웹앱에 인터넷 주소를 붙이는 작업이다.

## 1. 배포 전 확인

```bash
npm install
npm test
npm run build
```

모두 오류 없이 끝나야 한다.

## 2. Vercel에서 저장소 가져오기

1. <https://vercel.com> 접속
2. GitHub 계정으로 로그인
3. 오른쪽 위 **Add New…** → **Project** 누르기
4. `girls-with-gao/magicbook` 저장소 찾기
5. 저장소 오른쪽의 **Import** 누르기
6. Framework Preset이 **Next.js**로 자동 표시되는지 확인

## 3. AI 비밀 출입증 넣기

Vercel 배포 화면의 **Environment Variables** 영역에서 다음을 추가한다.

- Name: `OPENAI_API_KEY`
- Value: 본인의 OpenAI API 키

키를 GitHub 파일이나 채팅방에 붙여넣지 않는다. API 키가 없으면 이 단계를 건너뛰어도 되며, 발표용 예제 모드로 작동한다.

## 4. 배포하기

1. **Deploy** 버튼 누르기
2. 빌드가 끝날 때까지 기다리기
3. `Congratulations!` 화면에서 **Continue to Dashboard** 누르기
4. 생성된 `https://...vercel.app` 주소를 열기

## 5. 휴대폰에서 확인

- 첫 화면이 가로로 넘치지 않는지
- `예제로 시작하기`를 누르면 그림 미리보기가 나오는지
- 그림 → 부모 확인 → 언어 선택 → 4페이지 이야기 → 종이 그림 화면까지 진행되는지
- 한국어, English, 한국어 + English 선택이 각각 작동하는지
- 문장 듣기 버튼이 작동하는지
- 에러가 난 경우 입력한 내용이 사라지지 않는지

## 6. 원티드 제출

정상 작동을 확인한 Vercel 주소를 원티드 과제의 **서비스 링크**에 넣는다.

심사 기간인 2026년 9월 21일부터 10월 17일까지 주소가 계속 열리는지 확인한다.
