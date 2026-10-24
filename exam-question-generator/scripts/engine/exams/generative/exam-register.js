"use strict";
/**
 * 평가원(모의평가·수능) 문체·표기 보정.
 *
 * 기출 540문항(reference-pdf-v3 moi) 대비 AI 출제분에서 측정된 차이:
 *  - 서술문 과거형: 기출 "하였다" 187 : "했다" 21, "되었다" 37 : "됐다" 0, "하여" 302 : "해서" 9 (AI는 반대)
 *  - 인용: 용어·명칭은 ‘ ’(488회), 발화 인용은 “ ”(18회), 곧은따옴표 0회 / 법률명 ｢ ｣
 *  - 날짜 "2023년 1월 1일"(89회) vs 점 표기 17회 / 금액 "36,000원"·"60만 원", "3만 6천 원" 0회
 *  - 인물 "A 씨"(383회) vs "A씨"(14회)
 * 대화 발화는 구어(해요체·합니다체)를 그대로 두고 표기만 맞춘다.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeExamRegister = normalizeExamRegister;
exports.normalizeExamNotation = normalizeExamNotation;
const PAST_CONTRACTIONS = [
    [/했(?=다|고|으며|지만|는데|으나|던|으므로|기에|기 때문|을|음|으니)/gu, '하였'],
    [/됐(?=다|고|으며|지만|는데|으나|던|으므로|기에|기 때문|을|음|으니)/gu, '되었'],
    [/봤(?=다|고|으며|지만|는데|으나|던|으므로|을|음)/gu, '보았'],
    [/줬(?=다|고|으며|지만|는데|으나|던|으므로|을|음)/gu, '주었'],
    // "취업해서", "위해서" → "취업하여", "위하여" ("해서는 안 된다"·"해서도"는 그대로)
    [/(?<=[가-힣])해서(?![는도야])/gu, '하여'],
];
/** 서술문(제시문 글, <보기>·선지, 해설)에 쓰는 문어체 보정 + 표기 보정 */
function normalizeExamRegister(value) {
    let result = value;
    for (const [pattern, replacement] of PAST_CONTRACTIONS)
        result = result.replace(pattern, replacement);
    return normalizeExamNotation(result);
}
/** 모든 문자열(대화 발화·표 칸·발문 포함)에 쓰는 표기 보정 */
function normalizeExamNotation(value) {
    return value
        // 따옴표: 직접 인용 “ ”, 용어 인용 ‘ ’
        .replace(/"([^"\n]{1,200})"/gu, '“$1”')
        .replace(/(?<![A-Za-z])'([^'\n]{1,80})'(?![A-Za-z])/gu, '‘$1’')
        // 날짜: 2024.12.10. → 2024년 12월 10일
        .replace(/(\d{4})\.\s?(\d{1,2})\.\s?(\d{1,2})\.?(?!\d)/gu, (_, y, m, d) => `${y}년 ${Number(m)}월 ${Number(d)}일`)
        .replace(/(\d{1,2})월(\d{1,2})일/gu, '$1월 $2일')
        // 금액: 3만 6천 원 → 36,000원, 8천 원 → 8,000원
        .replace(/(\d+)만\s?(\d)천\s?원/gu, (_, man, cheon) => won(Number(man) * 10_000 + Number(cheon) * 1_000))
        .replace(/(?<![\d만])(\d)천\s?원/gu, (_, cheon) => won(Number(cheon) * 1_000))
        // 인물: A씨 → A 씨 (한글 이름은 "아저씨" 같은 낱말과 구별할 수 없어 건드리지 않는다)
        .replace(/(?<![A-Za-z])([A-Z]|[○△□◇])씨(?=$|[\s,.·은는이가를의에와과도만께])/gu, '$1 씨');
}
function won(value) {
    return `${value.toLocaleString('ko-KR')}원`;
}
