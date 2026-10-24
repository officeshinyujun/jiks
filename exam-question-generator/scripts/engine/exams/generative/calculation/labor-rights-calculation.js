"use strict";
/**
 * 성공적인 직업생활 16단원(근로관계와 법 2) 기한·야간 근로 계산.
 *
 * 해고 사례(기출 2024 수능 8번, 2023 9월 13번): 부당 해고 구제 신청은 해고일부터 3개월 이내 지방노동위원회
 * (상시 5명 이상 사업장), 해고 예고는 30일 전(미예고 시 30일분 이상 통상임금), 해고 사유·시기는 서면 통지
 * (문자 메시지는 서면 통지가 아님, 5명 이상), 계속 근로 1년 이상이면 퇴직금.
 * 야간 근로(기출 2023 수능 9번): 오후 10시~다음 날 오전 6시, 휴게 시간 제외, 5명 이상 사업장은
 * 통상임금의 50% 가산. 대표 오답: 휴게 시간 미차감, 근무 시간 전체를 야간으로 셈, 가산분을 100%로 봄.
 * 날짜는 기한 경계에서 2주 이상 떨어뜨려 기간 계산 방식(초일 불산입 등)에 따라 답이 갈리지 않게 한다.
 * 해고 예고 수당 사례는 해고 당일 통보로만 만든다: 일부 예고(예: 7일 전)는 "부족한 일수분만 지급" 해석과
 * 다툼이 생겨 블라인드 검토에서 반복 반려되었다. 예고를 지킨 사례는 30일 넘게 앞서 통보한다.
 * 규칙 출처: unit-guides/success_16.json, success_15.json
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateDismissalFacts = generateDismissalFacts;
exports.dismissalScenario = dismissalScenario;
exports.generateNightWorkFacts = generateNightWorkFacts;
exports.nightWorkDerived = nightWorkDerived;
exports.nightWorkScenario = nightWorkScenario;
const calculation_kit_1 = require("./calculation-kit");
const WORKPLACES = ['△△물류(주)', '○○정밀(주)', '△△식품(주)', '○○전자(주)', '△△마트', '○○호텔', '△△카페', '○○인쇄소'];
function generateDismissalFacts(rng) {
    const size = rng() < 0.25 ? (0, calculation_kit_1.pick)([3, 4], rng) : (0, calculation_kit_1.pick)([8, 12, 30, 120], rng);
    const dismissed = { year: 2026, month: (0, calculation_kit_1.randInt)(3, 8, rng), day: (0, calculation_kit_1.randInt)(1, 28, rng) };
    const tenureMonths = (0, calculation_kit_1.pick)([8, 10, 14, 20, 30], rng);
    const noticeGap = (0, calculation_kit_1.pick)([0, 0, 35, 40, 45], rng);
    // 상담일은 3개월 경계에서 2주 이상 떨어뜨린다(1~2개월 뒤 또는 4~5개월 뒤).
    const consulted = rng() < 0.55
        ? (0, calculation_kit_1.addDays)((0, calculation_kit_1.addMonths)(dismissed, (0, calculation_kit_1.pick)([1, 2], rng)), (0, calculation_kit_1.randInt)(0, 10, rng))
        : (0, calculation_kit_1.addDays)((0, calculation_kit_1.addMonths)(dismissed, (0, calculation_kit_1.pick)([3, 4], rng)), (0, calculation_kit_1.randInt)(15, 25, rng));
    return {
        workplace: (0, calculation_kit_1.pick)(WORKPLACES, rng),
        size,
        hired: (0, calculation_kit_1.addMonths)(dismissed, -tenureMonths),
        noticed: (0, calculation_kit_1.addDays)(dismissed, -noticeGap),
        dismissed,
        consulted,
        textMessage: rng() < 0.5,
    };
}
function dismissalScenario(rng) {
    const facts = generateDismissalFacts(rng);
    const small = facts.size < 5;
    const deadline = (0, calculation_kit_1.addMonths)(facts.dismissed, 3);
    const withinRemedy = (0, calculation_kit_1.daysBetween)(facts.consulted, deadline) > 0;
    const canApply = !small && withinRemedy;
    const noticeGap = (0, calculation_kit_1.daysBetween)(facts.noticed, facts.dismissed);
    const noticePay = noticeGap < 30;
    const tenureDays = (0, calculation_kit_1.daysBetween)(facts.hired, facts.dismissed);
    const severance = tenureDays >= 365;
    const remedyReason = small
        ? `상시 근로자 ${facts.size}명으로 5명 미만 사업장이므로 부당 해고 구제 신청 규정이 적용되지 않는다`
        : withinRemedy
            ? `해고일(${(0, calculation_kit_1.formatDate)(facts.dismissed)})부터 3개월 이내(${(0, calculation_kit_1.formatDate)(deadline)} 전)이므로 지방노동위원회에 구제 신청을 할 수 있다`
            : `해고일(${(0, calculation_kit_1.formatDate)(facts.dismissed)})부터 3개월이 지났으므로 지방노동위원회에 구제 신청을 할 수 없다`;
    const templates = (0, calculation_kit_1.compactTemplates)({
        remedy: (0, calculation_kit_1.template)(`A 씨는 상담일 현재 지방노동위원회에 부당 해고 구제 신청을 할 수 ${canApply ? '있다' : '없다'}.`, `A 씨는 상담일 현재 지방노동위원회에 부당 해고 구제 신청을 할 수 ${canApply ? '없다' : '있다'}.`, remedyReason),
        noticePay: noticePay
            ? (0, calculation_kit_1.template)('A 씨는 해고 예고 수당으로 30일분 이상의 통상임금을 받을 수 있다.', 'A 씨는 해고 사유와 해고일을 통보받았으므로 해고 예고 수당을 받을 수 없다.', '해고 당일에 통보하여 30일 전 예고를 하지 않았으므로 30일분 이상의 통상임금을 지급해야 한다(5명 미만 사업장에도 적용)')
            : (0, calculation_kit_1.template)('A 씨는 해고 30일 전에 예고를 받았으므로 해고 예고 수당을 받을 수 없다.', 'A 씨는 해고 예고 수당으로 30일분 이상의 통상임금을 받을 수 있다.', `해고 ${noticeGap}일 전에 예고하여 30일 전 예고 의무를 지켰으므로 해고 예고 수당 대상이 아니다`),
        writtenNotice: !small && facts.textMessage
            ? (0, calculation_kit_1.template)('A 씨에 대한 해고는 해고 사유와 시기를 서면으로 통지하지 않았으므로 효력이 없다.', 'A 씨는 해고 사유와 해고일을 미리 통보받았으므로 해고 통지 절차에는 문제가 없다.', '상시 5명 이상 사업장의 해고는 사유와 시기를 서면으로 통지해야 효력이 있으며, 휴대 전화 문자 메시지는 서면 통지로 인정되지 않는다')
            : undefined,
        severance: severance
            ? (0, calculation_kit_1.template)('A 씨는 계속 근로 기간이 1년 이상이므로 퇴직금을 받을 수 있다.', 'A 씨는 해고되었으므로 퇴직금을 받을 수 없다.', `${(0, calculation_kit_1.formatDate)(facts.hired)}부터 ${(0, calculation_kit_1.formatDate)(facts.dismissed)}까지 계속 근로 1년 이상, 1주 40시간 근무이므로 퇴직금 지급 대상이다(해고 여부와 무관)`)
            : (0, calculation_kit_1.template)('A 씨는 계속 근로 기간이 1년 미만이므로 퇴직금을 받을 수 없다.', 'A 씨는 해고되었으므로 30일분 평균임금의 퇴직금을 받을 수 있다.', `${(0, calculation_kit_1.formatDate)(facts.hired)}부터 ${(0, calculation_kit_1.formatDate)(facts.dismissed)}까지 계속 근로 기간이 1년 미만이므로 퇴직금 지급 의무가 없다`),
    });
    return {
        kind: 'dismissal_remedy',
        genre: '노무 상담 기록',
        context: 'A 씨가 해고를 당한 뒤 노무 상담을 받는 상황(상담 기록, 상담사와의 대화 소개 등). 표에 없는 날짜·인원·통보 방식을 새로 쓰지 마십시오.',
        otherHint: '근로자 권익 보호 개념(부당 해고 구제 절차의 기관 순서, 해고 무효 확인 소송, 임금 체불 진정, 부당 노동 행위와의 구분 등)',
        tables: [
            {
                title: 'A 씨 노무 상담 기록',
                headers: ['구분', '내용'],
                rows: [
                    ['사업장', `${facts.workplace}(상시 근로자 ${facts.size}명)`],
                    ['근로 조건', `${(0, calculation_kit_1.formatDate)(facts.hired)} 입사, 주 5일 1일 8시간 근무하는 정규직`],
                    ['해고 통보', `${(0, calculation_kit_1.formatDate)(facts.noticed)}${noticeGap === 0 ? '(해고 당일)' : ''}에 ${facts.textMessage ? '휴대 전화 문자 메시지로' : '서면으로'} 해고 사유와 해고일을 통보받음`],
                    ['해고일', (0, calculation_kit_1.formatDate)(facts.dismissed)],
                    ['상담일', (0, calculation_kit_1.formatDate)(facts.consulted)],
                ],
            },
        ],
        // 검토에서 해석이 갈렸던 판단 기준을 기출 단서 조건처럼 고정한다.
        conditions: [
            'A 씨에게는 해고 예고의 예외 사유가 없으며, 단체 협약은 고려하지 않는다.',
            ...(facts.textMessage ? ['휴대 전화 문자 메시지는 해고의 서면 통지로 보지 않는다.'] : []),
        ],
        templates,
        numeric: [],
        facts,
    };
}
const NIGHT_START = 22 * 60;
const NIGHT_END = 30 * 60;
function generateNightWorkFacts(rng) {
    for (let attempt = 0; attempt < 200; attempt += 1) {
        const workHours = (0, calculation_kit_1.pick)([6, 8, 8], rng);
        const breakMinutes = workHours >= 8 ? 60 : 30;
        const startMinutes = (0, calculation_kit_1.pick)([18, 19, 20, 21, 22, 23], rng) * 60;
        const breakStart = startMinutes + (workHours >= 8 ? 4 : 3) * 60;
        const facts = {
            workplace: (0, calculation_kit_1.pick)(WORKPLACES, rng),
            size: rng() < 0.3 ? (0, calculation_kit_1.pick)([2, 4], rng) : (0, calculation_kit_1.pick)([6, 10, 30], rng),
            wage: (0, calculation_kit_1.pick)([10_000, 11_000, 12_000, 13_000, 15_000], rng),
            startMinutes,
            workHours,
            breakMinutes,
            breakStart,
        };
        const derived = nightWorkDerived(facts);
        if (derived.nightHours !== derived.nightHoursWithBreak && derived.nightHours !== workHours)
            return facts;
    }
    throw new Error('night work facts generation failed');
}
function overlap(from, to) {
    return Math.max(0, Math.min(to, NIGHT_END) - Math.max(from, NIGHT_START));
}
function nightWorkDerived(facts) {
    const end = facts.startMinutes + facts.workHours * 60 + facts.breakMinutes;
    const breakEnd = facts.breakStart + facts.breakMinutes;
    const nightMinutes = overlap(facts.startMinutes, facts.breakStart) + overlap(breakEnd, end);
    const small = facts.size < 5;
    const nightHours = nightMinutes / 60;
    const premium = small ? 0 : nightHours * facts.wage * 0.5;
    return {
        end,
        breakEnd,
        nightHours,
        nightHoursWithBreak: overlap(facts.startMinutes, end) / 60,
        small,
        premium,
        dailyPay: facts.workHours * facts.wage + premium,
    };
}
function nightWorkScenario(rng) {
    const facts = generateNightWorkFacts(rng);
    const d = nightWorkDerived(facts);
    const halfPremium = d.nightHours * facts.wage * 0.5;
    const hoursRationale = `야간 근로는 오후 10시~다음 날 오전 6시의 근로이고 휴게 시간(${(0, calculation_kit_1.clock)(facts.breakStart)}~${(0, calculation_kit_1.clock)(d.breakEnd)})은 근로 시간이 아니므로 ${(0, calculation_kit_1.num)(d.nightHours)}시간`;
    const premiumRationale = d.small
        ? '상시 근로자 5명 미만 사업장에는 야간 근로 가산 수당 규정이 적용되지 않는다'
        : `${hoursRationale}, 가산 수당 = ${(0, calculation_kit_1.num)(d.nightHours)}시간 × ${(0, calculation_kit_1.won)(facts.wage)} × 50% = ${(0, calculation_kit_1.won)(d.premium)}`;
    const templates = (0, calculation_kit_1.compactTemplates)({
        nightHours: (0, calculation_kit_1.template)(`A 씨의 1일 야간 근로 시간은 ${(0, calculation_kit_1.num)(d.nightHours)}시간이다.`, `A 씨의 1일 야간 근로 시간은 ${(0, calculation_kit_1.num)(d.nightHoursWithBreak)}시간이다.`, hoursRationale),
        premium: d.small
            ? (0, calculation_kit_1.template)('상시 근로자 수가 5명 미만이므로 A 씨는 야간 근로 가산 수당을 받을 수 없다.', `A 씨는 하루 근무하면 야간 근로 가산 수당으로 ${(0, calculation_kit_1.won)(halfPremium)}을 받는다.`, premiumRationale)
            : (0, calculation_kit_1.template)(`A 씨는 하루 근무하면 야간 근로 가산 수당으로 ${(0, calculation_kit_1.won)(d.premium)}을 받는다.`, `A 씨는 하루 근무하면 야간 근로 가산 수당으로 ${(0, calculation_kit_1.won)(d.nightHours * facts.wage)}을 받는다.`, premiumRationale),
        dailyPay: (0, calculation_kit_1.template)(`A 씨의 1일 임금은 야간 근로 가산 수당을 포함하여 ${(0, calculation_kit_1.won)(d.dailyPay)}이다.`, `A 씨의 1일 임금은 야간 근로 가산 수당을 포함하여 ${(0, calculation_kit_1.won)(d.small ? d.dailyPay + halfPremium : d.dailyPay + (facts.breakMinutes / 60) * facts.wage)}이다.`, `${facts.workHours}시간 × ${(0, calculation_kit_1.won)(facts.wage)} = ${(0, calculation_kit_1.won)(facts.workHours * facts.wage)}${d.small ? '(5명 미만 사업장은 가산 수당 없음)' : ` + 가산 수당 ${(0, calculation_kit_1.won)(d.premium)}`} = ${(0, calculation_kit_1.won)(d.dailyPay)} (휴게 시간은 임금 계산에서 제외)`),
    });
    return {
        kind: 'night_work',
        genre: '근로 계약 상담 사례',
        context: 'A 씨가 야간 근무를 하며 임금이 맞게 지급되는지 상담하거나 친구와 이야기하는 상황. 표에 없는 시각·시급·인원을 새로 쓰지 마십시오.',
        otherHint: '근로 기준법 개념(5명 미만 사업장 적용 제외 범위, 휴게 시간 부여 원칙, 대기 시간의 근로 시간 인정, 임금 체불 구제, 위약 예정 금지 등)',
        tables: [
            {
                title: 'A 씨 근로 계약 내용',
                headers: ['구분', '내용'],
                rows: [
                    ['사업장(상시 근로자 수)', `${facts.workplace}(${facts.size}명)`],
                    ['근로 시간', `${(0, calculation_kit_1.clock)(facts.startMinutes)}~${(0, calculation_kit_1.clock)(d.end)} (휴게 시간 ${(0, calculation_kit_1.clock)(facts.breakStart)}~${(0, calculation_kit_1.clock)(d.breakEnd)})`],
                    ['근무일', '매주 월~금요일'],
                    ['임금', `시간당 ${(0, calculation_kit_1.won)(facts.wage)}`],
                ],
            },
        ],
        conditions: ['A 씨는 18세 이상이며, 근로 시간 외 연장·휴일 근로는 하지 않는다.'],
        templates,
        numeric: [],
        facts,
    };
}
