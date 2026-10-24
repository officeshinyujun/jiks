"use strict";
/**
 * 성공적인 직업생활 17단원(고용 서비스와 사회 제도) 구직급여 소정급여일수·수급 판정.
 *
 * 기출(2023 6월 15번, 2023 수능 14번, 2024 수능 15번): 이직 당시 나이(50세 경계)와 피보험 기간(1·3·5·10년 경계)으로
 * 소정급여일수 표 대입. 45세·13년(240일)과 55세·9년(240일)처럼 다른 조건이 같은 일수가 되는 함정,
 * 조기 재취업 수당(소정급여일수를 2분의 1 이상 남기고 재취업), 자발적 이직의 수급 제한.
 * 규칙 출처: unit-guides/success_17.json (소정급여일수, 취업촉진 수당, 수급 자격 제한)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.insuredBracket = insuredBracket;
exports.prescribedBenefitDays = prescribedBenefitDays;
exports.generateBenefitFacts = generateBenefitFacts;
exports.benefitScenario = benefitScenario;
const calculation_kit_1 = require("./calculation-kit");
/** 피보험 기간 구간: 1년 미만, 1~3년, 3~5년, 5~10년, 10년 이상 */
const UNDER_50_DAYS = [120, 150, 180, 210, 240];
const OVER_50_DAYS = [120, 180, 210, 240, 270];
function insuredBracket(months) {
    if (months < 12)
        return 0;
    if (months < 36)
        return 1;
    if (months < 60)
        return 2;
    if (months < 120)
        return 3;
    return 4;
}
/** 이직 당시 50세 이상(또는 장애인)은 높은 일수 표를 쓴다. 장애인 여부는 자료에서 제외한다. */
function prescribedBenefitDays(age, insuredMonths) {
    return (age >= 50 ? OVER_50_DAYS : UNDER_50_DAYS)[insuredBracket(insuredMonths)];
}
const PERIODS = [8, 20, 30, 44, 54, 66, 89, 100, 130, 156];
const YOUNG_AGES = [28, 34, 41, 45, 48];
const OLD_AGES = [51, 52, 55, 58];
const INVOLUNTARY = ['경영 악화에 따른 권고사직', '계약 기간 만료', '회사 폐업'];
const VOLUNTARY = ['개인 사정으로 자진 퇴사', '창업 준비를 위한 사직'];
function periodLabel(months) {
    const years = Math.floor(months / 12);
    const rest = months % 12;
    if (years === 0)
        return `${rest}개월`;
    return rest === 0 ? `${years}년` : `${years}년 ${rest}개월`;
}
function generateBenefitFacts(rng) {
    const wantSame = rng() < 0.45;
    for (let attempt = 0; attempt < 300; attempt += 1) {
        const a = {
            label: 'A 씨',
            age: (0, calculation_kit_1.pick)(rng() < 0.6 ? YOUNG_AGES : OLD_AGES, rng),
            months: (0, calculation_kit_1.pick)(PERIODS, rng),
            reason: (0, calculation_kit_1.pick)(INVOLUNTARY, rng),
            voluntary: false,
        };
        const bVoluntary = rng() < 0.35;
        const b = {
            label: 'B 씨',
            age: (0, calculation_kit_1.pick)(a.age >= 50 ? YOUNG_AGES : OLD_AGES, rng),
            months: (0, calculation_kit_1.pick)(PERIODS, rng),
            reason: (0, calculation_kit_1.pick)(bVoluntary ? VOLUNTARY : INVOLUNTARY, rng),
            voluntary: bVoluntary,
        };
        const daysA = prescribedBenefitDays(a.age, a.months);
        const daysB = prescribedBenefitDays(b.age, b.months);
        if (!bVoluntary && (daysA === daysB) !== wantSame)
            continue;
        // A 씨 재취업: 받은 일수가 소정급여일수 절반에서 20일 이상 떨어지게
        let aReceivedDays;
        if (rng() < 0.6) {
            const candidates = [30, 45, 60, 75, 90, 120, 150, 180, 200].filter((days) => days < daysA - 15 && Math.abs(days - daysA / 2) >= 20);
            if (candidates.length > 0)
                aReceivedDays = (0, calculation_kit_1.pick)(candidates, rng);
        }
        return { a, b, ...(aReceivedDays === undefined ? {} : { aReceivedDays }) };
    }
    throw new Error('benefit facts generation failed');
}
function benefitScenario(rng) {
    const facts = generateBenefitFacts(rng);
    const { a, b } = facts;
    const daysA = prescribedBenefitDays(a.age, a.months);
    const daysB = prescribedBenefitDays(b.age, b.months);
    const otherColumnA = prescribedBenefitDays(a.age >= 50 ? 40 : 55, a.months);
    const bracketNames = ['1년 미만', '1년 이상 3년 미만', '3년 이상 5년 미만', '5년 이상 10년 미만', '10년 이상'];
    const daysRationale = (person, days) => `${person.label}는 이직 당시 만 ${person.age}세(${person.age >= 50 ? '50세 이상' : '50세 미만'}), 피보험 기간 ${periodLabel(person.months)}(${bracketNames[insuredBracket(person.months)]})이므로 ${days}일`;
    const wrongA = otherColumnA !== daysA
        ? otherColumnA
        : UNDER_50_DAYS[Math.min(4, insuredBracket(a.months) + 1)] === daysA
            ? daysA - 30
            : UNDER_50_DAYS[Math.min(4, insuredBracket(a.months) + 1)];
    const relation = (left, right) => left === right
        ? 'A 씨와 B 씨의 구직급여 소정급여일수는 같다.'
        : `B 씨의 구직급여 소정급여일수는 A 씨보다 ${Math.abs(right - left)}일 ${right > left ? '많다' : '적다'}.`;
    const early = facts.aReceivedDays === undefined
        ? undefined
        : (() => {
            const received = facts.aReceivedDays;
            const eligible = daysA - received >= daysA / 2;
            return (0, calculation_kit_1.template)(`A 씨는 조기 재취업 수당을 받을 수 ${eligible ? '있다' : '없다'}.`, `A 씨는 조기 재취업 수당을 받을 수 ${eligible ? '없다' : '있다'}.`, `${daysRationale(a, daysA)}. ${received}일분을 받고 재취업하여 ${daysA - received}일이 남았으므로 소정급여일수의 2분의 1(${daysA / 2}일) ${eligible ? '이상을 남겨 지급 대상이다' : '이상을 남기지 못해 지급 대상이 아니다'}`);
        })();
    const templates = (0, calculation_kit_1.compactTemplates)({
        daysA: (0, calculation_kit_1.template)(`A 씨의 구직급여 소정급여일수는 ${daysA}일이다.`, `A 씨의 구직급여 소정급여일수는 ${wrongA}일이다.`, daysRationale(a, daysA)),
        compare: b.voluntary
            ? undefined
            : (0, calculation_kit_1.template)(relation(daysA, daysB), daysA === daysB
                ? `B 씨의 구직급여 소정급여일수는 A 씨보다 30일 ${b.age >= 50 ? '많다' : '적다'}.`
                : 'A 씨와 B 씨의 구직급여 소정급여일수는 같다.', `${daysRationale(a, daysA)}, ${daysRationale(b, daysB)}`),
        voluntary: b.voluntary
            ? (0, calculation_kit_1.template)('B 씨는 자발적으로 이직하였으므로 구직급여를 받을 수 없다.', `B 씨는 피보험 기간이 ${periodLabel(b.months)}이므로 ${daysB}일 동안 구직급여를 받을 수 있다.`, `B 씨의 이직 사유(${b.reason})는 정당한 이직 사유가 없는 자발적 이직이므로 수급 자격이 제한된다`)
            : (0, calculation_kit_1.template)(`B 씨의 구직급여 소정급여일수는 ${daysB}일이다.`, `B 씨의 구직급여 소정급여일수는 ${prescribedBenefitDays(b.age >= 50 ? 40 : 55, b.months) !== daysB ? prescribedBenefitDays(b.age >= 50 ? 40 : 55, b.months) : daysB + 30}일이다.`, daysRationale(b, daysB)),
        early,
    });
    // "실업 인정"은 수급 자격이 인정된 사람에게만 쓴다. 자발적 이직자에게 쓰면 "구직급여를 받을 수 없다"는 진술과 모순된다.
    const situation = (person, received) => received !== undefined
        ? `급여 ${received}일분을 받은 뒤 12개월 이상 근로 계약으로 재취업함`
        : person.voluntary
            ? '고용24에 구직 등록을 하고 고용센터에 수급 자격 인정을 신청함'
            : '수급 자격을 인정받아 실업 인정을 받으며 구직 활동 중';
    return {
        kind: 'job_seeking_benefit',
        genre: '고용 센터 상담 사례',
        context: '고용 센터 상담사가 이직한 두 사람의 상황을 정리하거나 두 사람이 상담하는 상황. 표에 없는 나이·기간·사유·날짜를 새로 쓰지 마십시오. 두 사람 모두 고용보험에 가입한 근로자였고 장애인에 해당하지 않는다는 점은 써도 됩니다. 표의 "이직 후 상황"과 다르게 두 사람이 모두 실업 인정이나 수급 자격을 받았다고 쓰지 마십시오.',
        otherHint: '고용보험 개념(구직급여 신청 기관과 절차, 연장급여·상병급여·취업촉진 수당의 종류, 실업급여 보험료 부담, 수급 기한 등)',
        tables: [
            {
                title: '상담 대상자 현황',
                headers: ['구분', '이직 당시 나이', '피보험 기간', '이직 사유', '이직 후 상황'],
                rows: [a, b].map((person) => [
                    person.label,
                    `만 ${person.age}세`,
                    periodLabel(person.months),
                    person.reason,
                    situation(person, person === a ? facts.aReceivedDays : undefined),
                ]),
            },
            // 소정급여일수 기준표: 검토 모델이 옛 기준표로 판정해 맞는 문항을 "정답 없음"으로 반려하던 문제를 막고,
            // 학생도 표를 대입하는 기출 계산형으로 풀게 한다.
            {
                title: '구직급여 소정급여일수(단위: 일)',
                headers: ['피보험 기간', '1년 미만', '1년 이상 3년 미만', '3년 이상 5년 미만', '5년 이상 10년 미만', '10년 이상'],
                rows: [
                    ['50세 미만', ...UNDER_50_DAYS.map(String)],
                    ['50세 이상', ...OVER_50_DAYS.map(String)],
                ],
            },
        ],
        conditions: [
            'A 씨와 B 씨는 이직 전 18개월 동안 피보험 단위기간이 합산하여 180일 이상이며, 장애인에 해당하지 않는다.',
            '두 사람의 이직 사유 외에 수급 자격에 영향을 주는 다른 사정은 없다.',
        ],
        templates,
        numeric: [],
        facts: { ...facts, daysA, daysB },
    };
}
