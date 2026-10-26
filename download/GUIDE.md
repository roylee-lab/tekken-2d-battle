# TEKKEN 2D BATTLE 개발·배포 가이드

이 문서는 코드를 받은 사람이 **직접 실행하고, 배포하고, 고치고, 캐릭터를 추가**할 수 있도록 정리한 안내서입니다.
코드는 MIT 라이선스로 공개되어 있어 누구나 자유롭게 수정·배포할 수 있습니다 (`LICENSE` 참고).

---

## 1. 준비물

| 도구 | 용도 | 비고 |
|---|---|---|
| Python 3 | `build.py`로 `index.html` 만들기 | 3.8 이상 |
| Node.js 18 이상 | 밸런스 시뮬레이션·테스트, 로컬 서버 | 선택 (게임만 고칠 거면 없어도 됨) |
| 코드 편집기 | VS Code 추천 | |
| GitHub 계정 + Vercel 계정 | 인터넷에 배포 | 둘 다 무료 |

---

## 2. 폴더 구조

```
index.html        ← 실제로 배포되는 완성본 (build.py가 만듦, 직접 고치지 않기)
shell.html        ← HTML/CSS 틀 (메뉴 창, 터치 버튼, 게시판 창 등)
build.py          ← src/*.js + shell.html + vendor/peerjs.min.js → index.html, download/ 생성
src/              ← 게임 코드 (파일 이름의 번호 순서대로 합쳐짐)
  00_core.js        화면 크기·상수·난수 등 기본 유틸
  01_data.js        ★ 캐릭터·스킬 설명·밸런스 수치(BAL)·판정 크기(HITBOX)
  10_sim.js         ★ 게임 규칙: 이동, 공격 판정, 데미지, 스킬 효과(SK), 보스
  11_ai.js          CPU 인공지능 (난이도 DIFF, 스킬 사용 조건 AI_SKILL, LUNATIC 전용 로직)
  20_fighter_gfx.js 캐릭터 그리기 (포즈, 옷, 머리 모양, 소품)
  21_stages.js      스테이지 배경
  22_render.js      화면 그리기 (이펙트, 체력바, 스킬 칸, 투사체)
  30_audio.js       효과음·BGM (Web Audio로 실시간 합성)
  40_input.js       키보드·터치 입력
  49_rtc.js         WebRTC 접속 정보 교환
  50_net.js         온라인 대전 (호스트가 계산하고 상태를 보냄)
  55_account.js     로그인·친구·대전 신청 화면
  56_board.js       게시판 (캐릭터 추가 요청) + 코드/가이드 다운로드
  60_app.js         화면 전환(타이틀·선택·대전·도감)·메인 루프
api/
  game.js           서버 API: 회원가입/로그인/친구/대전 신청/게시판 (Vercel 함수)
  rtc.js            서버 API: 온라인 대전 접속 정보 교환
vendor/peerjs.min.js  온라인 대전 라이브러리 (MIT)
tools/            밸런스·버그 검사 도구 (Node.js)
tests/            자동 테스트, 로컬 서버
docs/GUIDE.md     이 문서
download/         build.py가 만드는 다운로드 파일 (소스 zip, 가이드)
```

**원칙: `src/`나 `shell.html`을 고친 뒤에는 꼭 `python build.py`를 실행해서 `index.html`을 다시 만들어야 합니다.**

---

## 3. 내 컴퓨터에서 실행하기

### 게임만 해 보기
```bash
python build.py
```
만들어진 `index.html`을 브라우저로 열면 CPU 대전·도감은 바로 됩니다.
(파일로 열면 로그인·친구·게시판·온라인 대전은 서버가 없어서 동작하지 않습니다.)

### 서버 기능까지 테스트하기 (가짜 DB 사용)
```bash
node tests/local-server.mjs
```
그다음 브라우저로 `http://127.0.0.1:8925/` 에 접속합니다. 실제 DB 대신 메모리 속 임시 저장소를 쓰기 때문에,
서버를 끄면 계정과 게시글이 사라집니다.

---

## 4. 인터넷에 배포하기 (GitHub + Vercel, 무료)

1. **GitHub에 올리기**
   - GitHub에서 새 저장소를 만들고 이 폴더의 파일을 전부 올립니다
     (웹에서 "Add file → Upload files"로 끌어다 놓거나, `git push`).
2. **Vercel 연결**
   - vercel.com 에 GitHub 계정으로 로그인 → **Add New → Project** → 방금 만든 저장소 선택 → **Deploy**.
   - 빌드 설정은 건드리지 않아도 됩니다. `index.html`은 그대로 웹페이지로, `api/` 폴더는 서버 함수로 자동 인식됩니다.
3. **DB 연결 (로그인·친구·게시판·온라인 대전용)**
   - Vercel 프로젝트 → **Storage** → **Upstash for Redis** (Marketplace) 추가 → 프로젝트에 연결.
   - 연결하면 `KV_REST_API_URL`, `KV_REST_API_TOKEN` 환경변수가 자동으로 생깁니다. 다시 배포(Redeploy)하면 끝.
   - 이 키들은 **절대 코드에 직접 쓰지 마세요.** 환경변수로만 넣어야 합니다.
4. **(선택) TURN 중계 서버**
   - 모바일 데이터·학교 와이파이처럼 직접 연결이 막힌 곳끼리 온라인 대전을 하려면 TURN이 필요합니다.
   - Vercel 환경변수 `WEBRTC_ICE_SERVERS`에 ICE 서버 배열(JSON)을 넣거나,
     Cloudflare를 쓰면 `CF_TURN_KEY_ID`, `CF_TURN_API_TOKEN`을 넣습니다.
5. 이후에는 GitHub에 새 파일을 올릴 때마다 Vercel이 **자동으로 다시 배포**합니다.

### 무료 한도 주의
- Upstash 무료 플랜은 한 달 명령 수에 한도가 있습니다. 친구 목록 확인 주기(`55_account.js`의 `setInterval`)를
  너무 짧게 바꾸면 한도를 빨리 씁니다.

---

## 5. 유지·보수 작업 순서

1. `src/`의 코드를 고칩니다.
2. `python build.py` 로 `index.html`과 `download/`를 다시 만듭니다.
3. 테스트를 돌립니다.
   ```bash
   node tests/regression.mjs      # 방향 전환 등 기본 규칙
   node tools/fuzz.js 2           # 무작위 대전으로 오류·무한 경직·맵 이탈 등 버그 탐지 ("문제 없음"이 나와야 함)
   ```
4. 온라인 대전 규칙(시뮬레이션)을 바꿨다면 `src/50_net.js`의 `NET_VER` 숫자를 1 올립니다.
   버전이 다른 사람끼리는 "게임 버전이 달라요" 안내가 나오고 연결되지 않습니다 (서로 다른 규칙으로 계산하는 것 방지).
5. GitHub에 올리면 자동 배포됩니다.

### 자주 고치는 곳
| 하고 싶은 것 | 고칠 곳 |
|---|---|
| 체력·데미지·지속 시간 등 숫자 | `src/01_data.js`의 `BAL` |
| 스킬 이름·설명 문구 | `src/01_data.js`의 `CHARS[번호].s1~s4`, `passive` |
| 스킬 효과 동작 | `src/10_sim.js`의 `SK[번호]` |
| 쿨타임 (모든 캐릭터 공통) | `src/01_data.js`의 `SLOT_CD`, `SLOT_CD_START` |
| CPU가 스킬을 쓰는 조건 | `src/11_ai.js`의 `AI_SKILL[번호]` |
| CPU 난이도 | `src/11_ai.js`의 `DIFF` |
| 캐릭터 외형 | `src/01_data.js`의 `look` (+ 새 옷·소품은 `src/20_fighter_gfx.js`) |
| 승리 대사 | `src/60_app.js`의 `WIN_QUOTES` |

---

## 6. 새 캐릭터 추가하기 (단계별)

예시로 번호 `18`, 이름 `김철수`인 캐릭터를 추가한다고 하겠습니다. (현재 0~16은 일반 캐릭터, 11은 히든 Tirón, 17은 히든 보스 흑요 — 보스를 이기면 Q W E R T Y 6스킬 캐릭터로 사용 가능)

### ① 밸런스 수치 — `src/01_data.js`의 `BAL`
```js
18: { hp: 210, stunT: 60, dashDmg: 15 },
```
스킬에서 쓸 숫자를 여기에 모아 두면 나중에 밸런스 조정이 쉽습니다.

### ② 캐릭터 정보 — `src/01_data.js`의 `CHARS` 배열 **맨 뒤**에 추가
```js
{
  name: '김철수', en: 'KIM CHEOLSU', color: '#1e88e5', country: 'KR', stage: 'seoul',
  desc: ['한 줄 소개', '두 번째 줄'],
  s1: { name: 'Q 스킬 이름', info: (b) => `${b.stunT / 60}초 기절` },
  s2: { name: 'W 스킬 이름', info: (b) => '설명' },
  s3: { name: 'E 스킬 이름', info: (b) => '설명' },
  s4: { name: 'R 스킬 이름', info: (b) => '설명' },
  passive: { name: '패시브 이름', desc: (b) => '설명' },
  look: {
    H: 1.0, b: build({ torsoW: 14, waistW: 12, thigh: 5, shin: 4.4, arm: 4, fore: 3.6 }), skin: '#f0c8a0',
    hair: { style: 'short', color: '#222' }, top: '#1e88e5', topStyle: 'tee', pants: '#263238', shoes: '#fff', acc: {},
  },
},
```
- `H`는 키 배율, `build({...})`는 체형 (팔다리 굵기 등), `leg`를 넣으면 다리 길이 배율.
- `hair.style`: short, spiky, buzz, crew, slick, bowl, topknot, messy, shaggy, parted, bald
- `topStyle`: tee, hoodie, track, tank, gi, jacket, coat, robe, hackerHood, dragon
- 번호는 배열 순서와 같아야 합니다 (CHARS의 19번째 = 18번).

### ③ 선택 화면에 넣기 — `src/01_data.js`
```js
const SELECT_ORDER = [0, 1, ..., 16, 18];
```
칸이 8개씩 2줄이므로 17명 이상이면 `SEL_COLS`나 선택 화면 배치(`60_app.js`의 `selTiles`)도 확인하세요.

### ④ 스킬 효과 — `src/10_sim.js`의 `const SK = { ... }` 안에 추가
```js
18: [
  (G, F, O) => {            // Q: F = 나, O = 상대
    if (!inFront(F, O, 30)) return true;               // 빗나가도 쿨타임은 돌게 하려면 true
    const res = applyDamage(G, F, O, 10, 'CHEOLSU_Q');
    if (res === 'hit') stunTarget(G, O, BAL[18].stunT);
    return true;                                        // false를 돌려주면 사용 안 한 것으로 처리 (쿨타임 X)
  },
  (G, F, O) => { addMod(F, 'cs_w', 'atk', 1.2, 300); return true; },   // 5초간 공격력 +20%
  (G, F, O) => { spawnProj(G, F, 'tooth', 8, 60, 6); return true; },     // 투사체 (그림은 22_render.js의 drawProjectile)
  (G, F, O) => { heal(G, F, 30); return true; },
],
```
자주 쓰는 함수:
| 함수 | 하는 일 |
|---|---|
| `applyDamage(G, 공격자, 피격자, 피해, '종류', {fixed:true})` | 피해 주기 (`fixed`면 가드 무시). 결과: 'hit' / 'block' / 'immune' 등 |
| `stunTarget(G, 대상, 프레임)` | 기절 (60프레임 = 1초) |
| `addMod(F, 'id', 'atk'·'def'·'spd'·'aspd'·'range'·'all', 배율, 프레임)` | 능력치 버프/디버프 |
| `heal(G, F, 양)` | 회복 |
| `spawnProj(G, F, '종류', 속도, 수명, 반지름)` | 투사체 발사 (`PROJ_HIT`에 맞았을 때 처리 추가) |
| `note(G, '문구', '#색', 프레임)` | 화면 위 알림 |
| `ev(G, 'sfx', '소리')`, `ev(G, 'shake', 세기, 길이)` | 효과음, 화면 흔들림 |

패시브처럼 매 프레임 확인하는 효과는 `stepFighter` 안에 `if (F.c === 18) { ... }` 형태로 넣습니다.
새 상태 변수(예: `F.myT`)를 만들면 `makeFighter`에 기본값을 넣고, 라운드 종료 초기화 목록(`endCheck`)에도 넣어 주세요.

### ⑤ CPU가 스킬 쓰는 조건 — `src/11_ai.js`의 `AI_SKILL`
```js
18: [(F, O, d) => d < 90, (F, O, d) => true, (F, O, d) => d > 100, (F, O, d) => F.hp < F.maxHp * 0.5],
```
`d`는 상대와의 거리(픽셀).

### ⑥ 판정 크기 측정 — `HITBOX`
주먹·발 판정은 실제로 그려지는 그림 크기를 그대로 씁니다. 외형(`look`)을 바꾸거나 캐릭터를 추가하면 다시 측정합니다.
```bash
python build.py /tmp/g.html
npm i -g playwright && npx playwright install chromium   # 처음 한 번
NODE_PATH=$(npm root -g) node tools/hitbox.cjs /tmp/g.html
```
출력된 `const HITBOX = [...]` 표로 `src/01_data.js`의 같은 부분을 바꿉니다.

### ⑦ 나머지
- 승리 대사: `src/60_app.js`의 `WIN_QUOTES[18]`
- 도구 이름표: `tools/balance.js`, `tools/rush.js`의 `NAMES` 배열과 `IDS` 기본값에 18 추가
- 빌드 → 테스트 → 밸런스 확인 → 배포

---

## 7. 밸런스 맞추기

```bash
node tools/balance.js 4 "" matrix      # AI끼리 모든 조합을 붙여 승률·상성표 출력
ONLY=18 node tools/balance.js 4        # 특정 캐릭터가 들어간 조합만 빠르게
node tools/duel.js 18 0 8              # 1:1로 붙여 기술별 피해량 분석
HPONLY=1 node tools/tune.js 6 3 fresh  # 체력만 자동 조정 (결과: tools/ov_final.json)
node tools/rush.js 2 rush,ai4          # LUNATIC이 "맞으면서 들이대는" 플레이에 얼마나 강한지 확인
```
- 전체 승률이 대략 40~60% 안에 들어오면 괜찮은 편입니다.
- `tools/tune.js`의 `HP_FIX`, `HP_MIN`으로 특정 캐릭터 체력을 고정할 수 있습니다.

---

## 8. 서버 API 요약 (`api/game.js`)

모든 요청은 `POST /api/game`, 본문은 JSON `{ "a": "동작이름", ...값, "token": "로그인 토큰" }`.

| 동작 | 설명 | 로그인 |
|---|---|---|
| register / login / logout | 회원가입·로그인 (비밀번호는 scrypt 해시로만 저장) | — |
| poll | 접속 표시 + 친구·요청·초대 받기 | 필요 |
| friendAdd / friendRespond / friendRemove | 친구 관리 | 필요 |
| invite / inviteCancel / inviteRespond | 친구에게 대전 신청 | 필요 |
| boardList | 게시판 글 목록 (`page`) | — |
| boardPost | 캐릭터 추가 요청 글쓰기 (양식 검사, 10분에 5개 제한) | 필요 |
| boardDelete | 내 글 삭제 | 필요 |
| bossClear | 최종 보스(흑요) 격파 보상 등록: 칭호 '김천고의 CEO' + 흑요 사용 | 필요 |

게시판 양식은 **캐릭터 이름 + 패시브/Q/W/E/R 각각 (이름 1~20자, 설명 5~200자)** 이며,
서버(`api/game.js`의 `parsePost`)와 화면(`src/56_board.js`의 `BOARD_LIM`) 양쪽에서 검사합니다. 바꿀 때는 두 곳을 같이 고치세요.

---

## 9. 온라인 대전 구조 (참고)

- 방장(호스트)이 게임을 계산하고, 참가자는 입력만 보내고 화면 상태를 받습니다 (`50_net.js`).
- 접속 정보 교환은 `/api/rtc` → 실패하면 PeerJS 공용 서버로 자동 전환.
- 실제 게임 데이터는 서버를 거치지 않고 기기끼리 직접(WebRTC) 주고받습니다.

---

## 10. 문제 해결

| 증상 | 확인할 것 |
|---|---|
| 고쳤는데 게임에 반영이 안 됨 | `python build.py`를 실행했는지, 브라우저 새로고침(Ctrl+F5) |
| "서버 DB가 아직 연결되지 않았어요" | Vercel에 Upstash Redis 연결 + 재배포 |
| "게임 버전이 달라요" | 두 사람 모두 새로고침 (`NET_VER`가 다름) |
| 온라인 대전이 특정 네트워크에서만 안 됨 | TURN 서버 설정 (4장) |
| 화면이 멈춤 | 브라우저 개발자 도구(F12) → Console의 빨간 오류 확인, `node tools/fuzz.js` 실행 |

즐거운 개발 되세요! 🎮
