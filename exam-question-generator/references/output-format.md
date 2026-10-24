# exam.json 형식

```jsonc
{
  "title": "성공적인 직업생활 15~17단원 (AI 출제 HIGH)",
  "subject": "success",            // success | kongil
  "difficulty": "HIGH",
  "unitRange": [15, 17],
  "requestedCount": 5,
  "engine": "exam-skill-engine-v1",
  "questions": [
    {
      "orderIndex": 1,
      "unitNumber": 15,
      "targetConcept": "연차 유급휴가",
      "points": 3,
      "recommendedTemplate": "TPL_SOURCE_BLOCKS",
      "questionStem": "다음 … 옳은 것만을 <보기>에서 있는 대로 고른 것은?",
      "stimulusData": {
        "blocks": [
          { "type": "text", "text": "…" },
          { "type": "table", "title": "근로 계약 내용", "headers": [["구분", "내용"]], "rows": [["…", "…"]] },
          { "type": "dialogue", "lines": [{ "speaker": "A 씨", "text": "…" }] }
        ],
        "figures": {},
        "choice_table": null          // 짝짓기형이면 { headers, rows }
      },
      "optionsList": ["① ㄱ", "② ㄷ", "③ ㄱ, ㄴ", "④ ㄴ, ㄷ", "⑤ ㄱ, ㄴ, ㄷ"],
      "comboBlock": { "title": "<보기>", "items": [{ "key": "ㄱ", "text": "…" }] },
      "correctAnswer": 4,
      "explanation": {
        "judgment": "[출제 의도] …\n[해설] …\n[오답 피하기] …\n[계산 근거] …",
        "conceptHighlightV2": {
          "stimulusClues": [{ "quote": "제시문 그대로 인용", "why": "가리키는 개념" }],
          "optionAnalysis": [{ "optionKey": "ㄱ", "verdict": "O", "reasoning": "…" }],
          "solvingFlow": [{ "step": 1, "action": "…" }],
          "takeaway": "…"
        }
      },
      "fingerprint": "…"
    }
  ],
  "answerKey": [{ "orderIndex": 1, "correctAnswer": 4 }]
}
```

- `optionAnalysis.verdict`는 진술이 옳으면 O, 옳지 않으면 X(정답 표시가 아님). 일반형은 `optionNum`(1~5), <보기>형은 `optionKey`(ㄱ~ㄹ).
- `stimulusData`는 GAP 앱 시험지·PDF 렌더러가 그대로 읽는 TPL_SOURCE_BLOCKS 형식이다.
