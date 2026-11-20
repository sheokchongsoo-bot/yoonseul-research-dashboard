# 식단 & 영양 대시보드

2026년 11월 12일–20일 식단 기록을 모아 놓은 정적 대시보드입니다. 일자별 열량·단백질 추이, 탄단지 평균 비율, 끼니별 기록과 영양 코칭 메모를 한 화면에서 봅니다.

- **사이트**: https://sheokchongsoo-bot.github.io/diet-dashboard/
- **구성**: `index.html` · `style.css` · `app.js` · `data.json`
- **스택**: 정적 HTML + CSS + 바닐라 JS. 빌드 도구, 프레임워크, 외부 CDN, 서버, 데이터베이스 없음.

## 갱신 방법

기록은 `data.json` 한 파일에만 있습니다. 평균 열량·평균 단백질·달성 일수·탄단지 비율·권장 구간 대비 막대는 **화면에서 계산**하므로, 숫자를 손으로 맞출 필요가 없습니다.

1. `days` 배열 끝에 하루를 추가합니다.
2. `site.updated`를 오늘 날짜(`YYYY-MM-DD`)로 바꿉니다.
3. 커밋 후 `main`에 푸시하면 GitHub Pages가 바로 다시 서빙합니다.

```json
{
  "date": "2026-11-21",
  "dow": "토",
  "kcal": 1610,
  "carb": 210,
  "protein": 78,
  "fat": 42,
  "recorded": true,
  "complete": true,
  "status": "3식 완료",
  "meals": [
    {
      "slot": "아침",
      "time": "06:10",
      "menu": "잡곡밥 1팩, 사골곰탕 1봉, 사과 1개",
      "kcal": 470,
      "carb": 96,
      "protein": 12,
      "fat": 4.5,
      "note": "가볍게 시작. 단백질은 점심에서 보강."
    }
  ],
  "advice": "하루 총평 한두 문장."
}
```

- `complete: false` — 하루 중 일부 끼니만 남긴 날. 평균에서 빠지고 차트에서 점선·속 빈 막대로 표시됩니다.
- `recorded: false` — 기록이 아예 없는 날. `kcal`을 0으로 두면 `무기록`으로 표시됩니다.
- `meals[].empty: true` — 기록이 없는 끼니. `"menu": "기록 대기"`로 두면 흐리게 보입니다.

## 주요 필드

| 키 | 형식 | 설명 |
| --- | --- | --- |
| `site.updated` | `YYYY-MM-DD` | 상단 갱신일 |
| `targets.kcalMin` / `kcalMax` | number | 권장 열량 구간 (기본 2,000–2,200) |
| `targets.proteinMin` / `proteinMax` | number | 단백질 목표 구간 (기본 70–80) |
| `targets.macro` | object | 탄·단·지 권장 비율 `[하한, 상한]` |
| `days[]` | object[] | 하루 기록 |
| `days[].meals[]` | object[] | `slot` · `time` · `menu` · `kcal` · `carb` · `protein` · `fat` · `note` |
| `days[].advice` | string | 그날의 총평 |

## 집계 기준

- 평균은 **3식 완전 기록일**만으로 계산합니다. 부분 기록일은 평균을 왜곡하므로 그래프에서 구분합니다.
- 탄단지 비율은 탄수화물·단백질 4 kcal/g, 지방 9 kcal/g으로 환산한 비율입니다.
- 열량·영양소는 사진을 보고 추정한 값이라 ±10% 오차가 있을 수 있습니다.

## 수록 원칙

- 이름·연락처·주소·소속·병원·검사·질병 관련 정보는 넣지 않습니다. 표기는 `Dr. S`와 일반 식사명만 사용합니다.
- 외부 요청이나 라이브러리를 쓰지 않으므로 오프라인에서도 열립니다(`file://` 제외 — `data.json`을 읽으려면 로컬 서버가 필요).

## 파일 구조

```
.
├── index.html   화면 골격
├── style.css    라이트/다크 테마
├── app.js       집계 + SVG 차트 + 타임라인 렌더
└── data.json    식단 기록 (유일한 데이터 원본)
```
