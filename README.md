# TEKKEN 2D BATTLE — GLOBAL CHAMPIONSHIP EDITION

브라우저에서 바로 즐기는 2D 격투 게임. 설치 없이 `index.html` 하나로 동작합니다.

## 특징
- 13명의 캐릭터 (히든 캐릭터 Tirón 포함), 나라별 스테이지 13개
- 3판 2선승, 99초 타이머, 콤보·히트스톱·아나운서 음성
- 나라별 오리지널 칩튠 BGM (Web Audio로 실시간 합성)
- CPU 대전 (난이도 3단계), 캐릭터 도감, 승리 기록
- 온라인 대전: 방 코드 / 같은 와이파이 자동 매칭 (WebRTC, PeerJS)
- 로그인(닉네임+비밀번호) · 친구 추가 · 친구에게 대전 신청
- 모바일 터치 조작 지원

## 조작
| 동작 | 키 |
|---|---|
| 이동 / 점프 / 가드 | ← → / ↑ / ↓ (가드 시 피해 70% 경감) |
| 펀치 / 킥 | S / D |
| 스킬 | Q (5초) · W (10초) · E (30초) · R (60초) |
| 결정 / 뒤로·일시정지 | Space·Enter / Esc |
| 히든 캐릭터 · 도감 · BGM | 선택 화면에서 K · C · M |

## 폴더 구조
```
index.html        ← 배포되는 완성본 (build.py로 생성)
shell.html        ← HTML/CSS 틀
src/              ← 게임 코드 (번호 순서대로 합쳐짐)
  00_core.js      기본 상수·유틸
  01_data.js      캐릭터·스킬·밸런스 수치(BAL)  ← 밸런스 패치는 여기
  10_sim.js       게임 규칙·데미지·스킬 로직
  11_ai.js        CPU 인공지능
  20_fighter_gfx.js  캐릭터 그래픽
  21_stages.js    스테이지 배경
  22_render.js    이펙트·HUD
  30_audio.js     효과음·BGM
  40_input.js     키보드·터치 입력
  50_net.js       온라인 대전
  60_app.js       화면 전환·메인 루프
  55_account.js   로그인·친구·대전 신청 화면
api/game.js           ← 서버 API (Vercel 함수): 회원가입/로그인/친구/접속 상태/대전 신청
package.json          ← api 폴더를 ES 모듈로 실행하기 위한 설정 (의존성 없음)
vendor/peerjs.min.js  ← 온라인 대전 라이브러리 (MIT)
tools/balance.js      ← AI끼리 대전시켜 승률을 계산하는 도구
```

## 수정 후 배포
```bash
python build.py     # src/ 수정 → index.html 다시 만들기
git add . && git commit -m "업데이트" && git push   # Vercel이 자동 재배포
```

## 승률 계산
```bash
node tools/balance.js 4 "" matrix
```

## 서버 (로그인 · 친구)
- Vercel 프로젝트에 **Upstash Redis**(Vercel Marketplace)를 연결하면 `KV_REST_API_URL`, `KV_REST_API_TOKEN` 환경변수가 자동으로 생기고 `api/game.js`가 이를 사용합니다.
- 비밀번호는 scrypt로 해시해서 저장하고, 로그인 시도는 횟수 제한이 걸려 있습니다.
- 접속 상태는 게임이 몇 초마다 서버에 신호를 보내서 표시합니다. 실제 대전 연결은 PeerJS(WebRTC)로 기기끼리 직접 합니다.
