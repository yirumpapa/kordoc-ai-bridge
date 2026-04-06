# HWP AI Bridge (kordoc 기반)

HWP/HWPX/PDF 문서를 AI가 이해하기 쉬운 형태로 변환하고,
AI로 편집한 결과를 다시 HWPX로 복원하는 도구입니다.

CLI와 웹 UI(드래그앤드롭)를 함께 제공합니다.

## 설치

```bash
npm install
```

## 빠른 시작 (웹 UI)

```bash
npm start
```

브라우저에서 `http://localhost:3030` 접속 후:
1. HWP/HWPX/PDF 업로드 -> AI 문서 변환
2. 변환된 Markdown을 AI와 편집
3. 편집본을 HWPX로 다운로드

## 빠른 시작 (CLI)

### 1) 문서 추출

```bash
npm run extract -- ./sample.hwp -o ./output --template guarded --pages 1-3,5 --remove-header-footer
```

생성 파일:
- `output/sample.ai.md`
- `output/sample.structured.json`

### 2) 복원

```bash
npm run restore -- ./output/sample.ai.md -o ./output/sample.restored.hwpx --strict-template
```

또는 JSON의 `markdown` 필드로 복원:

```bash
npm run restore -- ./output/sample.structured.json -o ./output/sample.restored.hwpx
```

## AI 템플릿 규칙

`--template guarded` 모드에서는 `.ai.md` 안에 아래 마커가 생성됩니다.

- `<!-- AI_BRIDGE_EDITABLE_START -->`
- `<!-- AI_BRIDGE_EDITABLE_END -->`

복원 시에는 마커 안쪽 본문만 추출하여 HWPX로 변환합니다.
`--strict-template`를 사용하면 마커가 없을 때 복원을 막아 실수 편집을 방지합니다.

## 명령어 요약

```bash
node src/index.js --help
node src/index.js extract --help
node src/index.js restore --help
node src/index.js serve --help
```

## 참고
- `kordoc`의 역변환은 현재 `Markdown -> HWPX` 기준입니다.
- 원본이 HWP여도 복원 결과는 HWPX로 저장하는 것을 권장합니다.
