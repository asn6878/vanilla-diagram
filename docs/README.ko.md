<p align="center">
  <img src="brand/banner.svg" width="800" alt="목재 V와 나무망치 I 아래 Oswald 굵은 글씨로 쓴 Vanilla Infographics">
</p>
<p align="center">바닐라 JavaScript로 움직이는 인포그래픽을 만드는 에이전트 스킬</p>
<p align="center">Codex · Claude Code · Canvas 2D · 런타임 의존성 없음</p>
<p align="center"><a href="https://github.com/asn6878/vanilla-infographics/releases/tag/v0.0.1"><img src="https://img.shields.io/badge/release-0.0.1-79573D" alt="Release 0.0.1"></a> <a href="../LICENSE"><img src="https://img.shields.io/badge/license-MIT-687E69" alt="MIT license"></a></p>
<p align="center"><a href="#시작하기">시작하기</a> · <a href="../SKILL.md">스킬 문서</a> · <a href="../README.md">English</a></p>

과정, 비교, 시간에 따른 변화를 설명하면 에이전트가 수정 가능한 인포그래픽을 만듭니다. 배속 조절, 일시정지, 역재생, 재생 위치 이동으로 원하는 순간을 살펴볼 수 있습니다.

### 자연어로 원하는 디자인 만들기

레이아웃, 그림 스타일, 색상, 문구, 움직임을 원하는 대로 설명하면 됩니다. 방사형 흐름, 분기형 다이어그램, 세로 타임라인처럼 구성을 지정하고, 후속 요청으로 계속 다듬을 수 있습니다. 에이전트가 요청에 맞춰 그림 코드를 작성하며, 주변 HTML과 CSS도 수정할 수 있습니다. 아래 예제는 시작점으로 참고하면 됩니다.

## 예제

같은 도구로 그린 두 가지 설명입니다. 왼쪽은 배송 과정, 오른쪽은 수식으로 계산한 성장 비교입니다.

![배송 과정과 선형·지수 성장 비교](media/examples.gif)

개별 GIF: [배송 과정](media/parcel-route.gif) · [성장 비교](media/growth-curves.gif). 코드는 [examples/scenes/](../examples/scenes/)에 있습니다.

## 재생 조작

배속을 바꾸고, 멈춘 뒤 재생 위치를 앞뒤로 옮기거나 역재생할 수 있습니다.

<p align="center"><img src="media/controls.gif" width="680" alt="마우스 커서로 배속 변경, 일시정지, 타임라인 앞뒤 드래그, 역재생을 조작하는 모습"></p>

## 시작하기

레포를 복제한 뒤 사용할 에이전트의 스킬을 설치합니다. 도우미 스크립트에는 Node.js 22 이상이 필요합니다.

```bash
git clone https://github.com/asn6878/vanilla-infographics.git
cd vanilla-infographics

# 하나를 고르거나 --agent all로 둘 다 설치합니다.
node scripts/install.mjs --agent codex
node scripts/install.mjs --agent claude
```

| 에이전트 공식 문서 | 개인 설치 경로 | 프로젝트 설치 경로 | 호출 |
| --- | --- | --- | --- |
| [Codex](https://learn.chatgpt.com/docs/build-skills) | `~/.agents/skills/vanilla-diagram` | `.agents/skills/vanilla-diagram` | `$vanilla-diagram` |
| [Claude Code](https://code.claude.com/docs/en/skills) | `~/.claude/skills/vanilla-diagram` | `.claude/skills/vanilla-diagram` | `/vanilla-diagram` |

프로젝트에 설치하려면 `--project /프로젝트/경로`를 추가합니다. 스킬과 필요한 파일을 함께 복사하며, 이미 설치되어 있으면 `--force`로 교체할 수 있습니다.

표의 에이전트 링크는 공식 사용법 문서입니다. 위 명령으로 설치한 뒤 에이전트에서 스킬을 호출하면 됩니다. 목록에 나타나지 않으면 에이전트를 재시작하세요. 포함된 설치 스크립트는 `npm install` 없이 실행할 수 있습니다.

<details>
<summary>Skills CLI로 설치하기</summary>

[Skills CLI](https://github.com/vercel-labs/skills)로도 설치할 수 있습니다.

```bash
npx skills add asn6878/vanilla-infographics --skill vanilla-diagram --agent codex --global
npx skills add asn6878/vanilla-infographics --skill vanilla-diagram --agent claude-code --global
```

현재 프로젝트에 설치하려면 `--global`을 빼면 됩니다. 이 방식은 스킬 외에 저장소의 문서와 예제도 함께 복사합니다.

</details>

파일로 설치하려면 [0.0.1 스킬 ZIP](https://github.com/asn6878/vanilla-infographics/releases/download/v0.0.1/vanilla-diagram-skill-v0.0.1.zip)을 내려받아 `vanilla-diagram` 폴더를 에이전트의 스킬 경로에 풀면 됩니다.

요청 예시:

```text
vanilla-diagram으로 애플리케이션이 캐시나 데이터베이스에서 데이터를 읽는 과정을 설명해줘.
애플리케이션을 중앙에 놓고 캐시와 데이터베이스를 두 갈래로 배치해줘.
어두운 배경에 청록색과 호박색을 쓰고, 문구는 짧게 해줘.
캐시 적중과 실패를 각각 보여주고, 휴대폰에서는 세로로 배치해줘.
```

이어서 "글씨를 키우고, 상자는 원으로 바꾸고, 캐시 실패 구간은 천천히 보여줘"처럼 수정할 수 있습니다.

설치 없이 포함된 예제부터 열어봐도 됩니다.

```bash
npm run dev
# http://localhost:4310/examples/
```

결과물은 HTML, CSS, ES 모듈입니다. `scene.js`에서 그림의 내용을 수정하고, 공통 도구가 재생 컨트롤·크기 변경·테마·모션 감소 설정을 처리합니다. 자세한 내용은 [디자인 기준](../references/design.md)과 [API 문서](../references/api.md)에 있습니다.

## 기술 구성

바닐라 JavaScript · HTML · CSS · Canvas 2D. 로컬 도구는 Node.js로 실행합니다. Playwright와 FFmpeg는 README의 GIF를 녹화할 때만 사용합니다.

GIF를 다시 만들려면 `npm install`, `npx playwright install chromium`을 실행하고 FFmpeg를 설치한 뒤 `npm run capture`를 실행합니다.
재생 조작 GIF만 녹화하려면 `npm run capture -- --controls-only`를 실행합니다.

## 라이선스

[MIT](../LICENSE). 포함된 Oswald 폰트에는 [SIL Open Font License](brand/fonts/OFL.txt)가 적용됩니다.
