# 영수증 OCR 자동화

이미지 또는 PDF 영수증을 OCR로 읽어서 **날짜_시간_결제처_비용_사용자작성란** 형식으로 파일명을 바꿔 로컬에 저장하는 도구입니다.

- **OCR**: [OCR.space](https://ocr.space/) 무료 API 사용 (한국어 지원)
- **파일명 예**: `251013_144100_롯데건설_7000_주차비`

## 필요한 것

- Python 3.9+
- **Gemini API 키** ([여기서 발급](https://aistudio.google.com/app/apikey)) - 영수증 이미지 분석에 사용 (OCR + 정보 추출)

## 로컬에서 실행하기

### 1. 저장소 클론 (또는 이 폴더에서 진행)

```bash
cd "영수증 자동화"
```

### 2. 가상환경 만들기 (권장)

```bash
python -m venv venv
venv\Scripts\activate   # Windows
# source venv/bin/activate  # Mac/Linux
```

### 3. 패키지 설치

```bash
pip install -r requirements.txt
```

### 4. API 키 설정 (필수)

프로젝트 폴더에 `.env` 파일을 만들고 API 키를 설정합니다:

```env
GEMINI_API_KEY=여기에_본인_GEMINI_API_KEY
RECEIPT_OUTPUT_DIR=output
```

- **GEMINI_API_KEY**: [Google AI Studio](https://aistudio.google.com/app/apikey)에서 무료로 발급

### 5. 서버 실행

```bash
python app.py
```

브라우저에서 **http://127.0.0.1:5000** 으로 접속합니다.

## 사용 방법

1. **파일 선택**: 이미지( PNG, JPG 등 ) 또는 PDF를 끌어다 놓거나 선택해서 여러 장 올립니다.
2. **OCR 실행**: "OCR 실행 및 입력하기"를 누르면 업로드된 파일마다 OCR이 돌아가고, 날짜·시간·결제처·금액이 자동으로 채워집니다.
3. **슬라이드 입력**: 왼쪽에 영수증 이미지, 오른쪽에 날짜/시간/결제처/비용/**사용자 작성란**을 확인·수정합니다. "다음"으로 넘기며 모든 영수증을 입력합니다.
4. **리스트 확인**: "리스트 보기"로 저장될 파일명 목록을 확인합니다.
5. **한 번에 저장**: "한 번에 저장"을 누르면 프로젝트 폴더 안 **output** 폴더에 새 파일명으로 복사됩니다.

저장 위치를 바꾸려면 `.env`에서 `RECEIPT_OUTPUT_DIR`에 원하는 폴더 경로를 지정하면 됩니다.

## 폴더 구조

```
영수증 자동화/
├── app.py           # Flask 서버
├── config.py        # API 키, 출력 폴더 설정
├── ocr_service.py   # OCR.space API 호출
├── receipt_parser.py # 영수증 텍스트에서 날짜/시간/가맹점/금액 추출
├── requirements.txt
├── static/
│   ├── index.html
│   ├── style.css
│   └── app.js
├── uploads/         # 업로드 임시 저장 (자동 생성)
└── output/          # 최종 저장 폴더 (자동 생성)
```

## GitHub에 올리기

1. GitHub에서 새 저장소(Repository)를 만듭니다.
2. 프로젝트 폴더에서:

```bash
git init
git add .
git commit -m "영수증 OCR 자동화 초기 버전"
git branch -M main
git remote add origin https://github.com/본인아이디/저장소이름.git
git push -u origin main
```

3. API 키는 공개하지 않으려면 `.env`를 사용하고, `.env`는 `.gitignore`에 포함되어 있으므로 커밋되지 않습니다. 다른 PC에서 클론 후 `.env.example`을 복사해 `.env`로 만들고 키를 넣으면 됩니다.

## 라이선스

MIT
