# 윤슬 · Research & Tech Dashboard

교통계획 연구, AI 실무 팁과 1일 1스킬, 라이딩과 가죽공작 노트를 한 화면에 모은 정적 대시보드입니다.

- **사이트**: https://sheokchongsoo-bot.github.io/yoonseul-research-dashboard/
- **구성**: `index.html` · `assets/style.css` · `assets/app.js` · `data.json`
- **스택**: 정적 HTML + CSS + 바닐라 JS. 빌드 도구, 프레임워크, 외부 CDN, 서버, 데이터베이스 없음.

## 갱신 방법

아카이브 항목은 `data.json` 한 파일에만 있습니다. 페이지는 이 파일을 읽어 그리므로, JSON을 고치고 커밋·푸시하면 그대로 반영됩니다.

1. `data.json`의 `ai.items` 배열 **맨 앞**에 새 항목을 추가합니다.
2. `site.updated`를 오늘 날짜(`YYYY-MM-DD`)로 바꿉니다.
3. 커밋 후 `main` 브랜치에 푸시합니다. GitHub Pages가 즉시 다시 서빙합니다.

```json
{
  "id": "ep06",
  "series": "AI 실무 카드뉴스",
  "ep": "EP.06",
  "date": "2026-11-17",
  "tags": ["클로드", "문서"],
  "title": "결론형 한 줄 제목",
  "summary": "두세 문장 요약.",
  "steps": [
    { "label": "단계 이름", "text": "설명 한 줄.", "prompt": "복사해 쓸 프롬프트." }
  ],
  "note": "주의사항 한 줄."
}
```

`steps[].prompt`는 카드에서 복사 버튼이 붙습니다. `tags`는 상단 필터 칩으로 자동 생성됩니다.

## 주요 필드

| 키 | 형식 | 설명 |
| --- | --- | --- |
| `site.title` | string | 페이지 제목 |
| `site.updated` | `YYYY-MM-DD` | 상단·푸터 갱신일 |
| `ai.items[]` | object[] | 카드뉴스·스킬 한 건 |
| `ai.items[].steps[]` | object[] | `label` · `text` · `prompt` |
| `transport.featured[]` | object[] | 대표 저장소 |
| `transport.tools[]` | object[] | 도구 목록 |
| `hobby.riding.facts[]` | object[] | 코스 기준표 (`k` · `v`) |
| `hobby.craft.blocks[]` | object[] | 작업 노트 묶음 (`h` · `items[]`) |

## 수록 원칙

- 공개된 정보, 공개해도 문제가 없는 작업 노트만 담습니다.
- 실명·연락처·주소·개인 일정·건강·금융 정보는 넣지 않습니다.
- 외부 링크는 각 서비스의 공식 페이지를 가리킵니다. 링크 내용은 시간이 지나면 바뀔 수 있습니다.
- 페이지는 `data.json`을 `cache: 'no-store'`로 읽습니다. 갱신 직후 새로고침하면 최신 항목이 보입니다.

## 파일 구조

```
.
├── index.html    # 마크업 (섹션 골격만)
├── style.css     # 라이트/다크 토큰, 반응형 레이아웃
├── app.js        # data.json → DOM, 테마 전환, 필터, 복사
├── data.json     # 모든 콘텐츠
└── README.md
```

경로를 한 단계로 둔 이유는 웹 편집기에서 파일을 올려도 위치가 어긋나지 않게 하기 위해서입니다. 폴더로 나눠도 되지만 그때는 `index.html`의 `style.css` · `app.js` 경로를 함께 고쳐야 합니다.

## 배포

GitHub Pages가 `main` 브랜치 루트를 그대로 서빙합니다(`Settings → Pages → Deploy from a branch`). 빌드 단계가 없어 푸시 직후 1~2분 안에 반영됩니다. `_`로 시작하는 파일이 없어 Jekyll 처리도 그대로 통과합니다.

## 라이선스

코드는 MIT. `data.json`의 글과 링크 큐레이션은 작성자에게 있습니다.
