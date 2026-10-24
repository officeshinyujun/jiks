"use strict";
/**
 * 성공적인 직업생활 15·16단원(근로관계와 법) 계산형 <보기>를 서버가 결정론적으로 만든다.
 *
 * 실제 기출 계산 문항은 "근로 계약 사례 표 → <보기>의 계산 진술 참/거짓" 구조다.
 * LLM은 법정 계산을 자주 틀리므로 수치·참거짓은 여기서 확정하고, LLM은 배경 서술과 나머지 보기만 쓴다.
 *
 * 규칙 출처: unit-guides/success_15.json, success_16.json keyFacts (교과서·기출 해설 확인치)
 *  - 휴게: 근로 4시간 → 30분 이상, 8시간 → 1시간 이상(근로 도중)
 *  - 주휴 수당 = 1일 소정 근로 시간 × 시급, 1주 소정 15시간 이상, 5명 미만 사업장에도 적용
 *  - 연장 가산(통상임금 50%): 1일 8시간·1주 40시간 초과분, 5명 미만 사업장은 미적용
 *  - 연차: 1년 미만 → 1개월 개근 시 1일 / 1년간 80% 이상 출근 → 15일, 5명 미만 사업장 미적용
 *  - 퇴직금: 계속 근로 1년 미만이면 지급 의무 없음
 * 연도별 최저임금처럼 확인되지 않은 수치는 쓰지 않는다(시급은 자료에 직접 제시).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.requiredBreakMinutes = requiredBreakMinutes;
exports.generateLaborFacts = generateLaborFacts;
exports.laborDerived = laborDerived;
exports.laborTable = laborTable;
exports.laborStatementTemplates = laborStatementTemplates;
exports.laborScenario = laborScenario;
exports.buildLaborCalculationPlan = buildLaborCalculationPlan;
const calculation_kit_1 = require("./calculation-kit");
const WAGES = [10_000, 11_000, 12_000, 12_500, 15_000, 20_000];
const SMALL_SIZES = [3, 4];
const LARGE_SIZES = [8, 12, 30, 150];
const START_TIMES = [8 * 60, 8 * 60 + 30, 9 * 60, 10 * 60];
const WORKPLACES = ['△△음식점', '○○편의점', '△△물류(주)', '○○정밀(주)', '△△식품(주)', '○○카페', '△△서점', '○○문구'];
/** 근로 시간에 맞는 최소 법정 휴게: 4시간 이상 30분, 8시간 이상 1시간 */
function requiredBreakMinutes(workHours) {
    if (workHours >= 8)
        return 60;
    if (workHours >= 4)
        return 30;
    return 0;
}
function generateLaborFacts(rng) {
    const small = rng() < 0.45;
    const dailyWorkHours = (0, calculation_kit_1.pick)([4, 5, 6, 7, 8, 8], rng);
    const contractMonths = (0, calculation_kit_1.pick)([3, 4, 6, 6, 8, 18, 24], rng);
    return {
        workerLabel: 'A 씨',
        workplaceLabel: (0, calculation_kit_1.pick)(WORKPLACES, rng),
        workplaceSize: (0, calculation_kit_1.pick)(small ? SMALL_SIZES : LARGE_SIZES, rng),
        startMinutes: (0, calculation_kit_1.pick)(START_TIMES, rng),
        dailyWorkHours,
        breakMinutes: requiredBreakMinutes(dailyWorkHours),
        hourlyWage: (0, calculation_kit_1.pick)(WAGES, rng),
        contractStart: { year: 2026, month: (0, calculation_kit_1.pick)([1, 2, 3, 4], rng), day: (0, calculation_kit_1.pick)([1, 2, 5], rng) },
        contractMonths,
    };
}
function laborDerived(facts) {
    const weeklyHours = facts.dailyWorkHours * 5;
    const holidayEligible = weeklyHours >= 15;
    const weeklyHolidayPay = holidayEligible ? facts.dailyWorkHours * facts.hourlyWage : 0;
    const isSmall = facts.workplaceSize < 5;
    return {
        weeklyHours,
        weeklyBasePay: weeklyHours * facts.hourlyWage,
        weeklyHolidayPay,
        weeklyPayWithHoliday: weeklyHours * facts.hourlyWage + weeklyHolidayPay,
        overtimeHourlyPay: isSmall ? facts.hourlyWage : facts.hourlyWage * 1.5,
        isSmall,
        underOneYear: facts.contractMonths < 12,
    };
}
/** 학생이 직접 계산해야 하도록 시각·휴게 시간대로 제시하는 근로 계약 표 */
function laborTable(facts) {
    const breakStart = facts.startMinutes + Math.min(4, Math.floor(facts.dailyWorkHours / 2) || 4) * 60;
    const end = facts.startMinutes + facts.dailyWorkHours * 60 + facts.breakMinutes;
    const rows = [
        ['사업장(상시 근로자 수)', `${facts.workplaceLabel}(${facts.workplaceSize}명)`],
        ['근로 계약 기간', `${formatDate(facts.contractStart)}부터 ${formatDate(endDate(facts.contractStart, facts.contractMonths))}까지`],
        [
            '소정 근로 시간',
            facts.breakMinutes === 0
                ? `${(0, calculation_kit_1.clock)(facts.startMinutes)}~${(0, calculation_kit_1.clock)(end)}`
                : `${(0, calculation_kit_1.clock)(facts.startMinutes)}~${(0, calculation_kit_1.clock)(end)} (휴게 시간 ${(0, calculation_kit_1.clock)(breakStart)}~${(0, calculation_kit_1.clock)(breakStart + facts.breakMinutes)})`,
        ],
        ['근무일 / 주휴일', '매주 월~금요일 / 매주 일요일'],
        ['임금', `시간당 ${won(facts.hourlyWage)}`],
    ];
    return { title: '근로 계약 내용', headers: ['구분', '내용'], rows };
}
/** 각 템플릿은 참·거짓 문장을 모두 만든다. 거짓 문장은 기출의 대표 오류(휴게 미차감, 주휴 누락 등)를 쓴다. */
function laborStatementTemplates(facts) {
    const d = laborDerived(facts);
    const w = facts.workerLabel;
    const breakHours = facts.breakMinutes / 60;
    const dailyLabel = `1일 ${facts.dailyWorkHours}시간${facts.breakMinutes > 0 ? `(휴게 ${breakLabel(facts.breakMinutes)} 제외)` : ''}`;
    const templates = {};
    if (facts.breakMinutes > 0) {
        templates.weeklyHours = {
            trueText: `${w}의 1주 소정 근로 시간은 ${num(d.weeklyHours)}시간이다.`,
            falseText: `${w}의 1주 소정 근로 시간은 ${num(d.weeklyHours + breakHours * 5)}시간이다.`,
            rationale: `${dailyLabel} × 주 5일 = ${num(d.weeklyHours)}시간 (휴게 시간은 근로 시간이 아니다)`,
        };
    }
    templates.weeklyPay = {
        trueText: `${w}가 1주를 개근하면 주휴 수당을 포함하여 ${won(d.weeklyPayWithHoliday)}을 받는다.`,
        falseText: `${w}가 1주를 개근하면 주휴 수당을 포함하여 ${won(d.weeklyBasePay)}을 받는다.`,
        rationale: `${num(d.weeklyHours)}시간 × ${won(facts.hourlyWage)} = ${won(d.weeklyBasePay)}, 주휴 수당 ${facts.dailyWorkHours}시간 × ${won(facts.hourlyWage)} = ${won(d.weeklyHolidayPay)} → 합계 ${won(d.weeklyPayWithHoliday)}`,
    };
    templates.holidayPay = d.isSmall
        ? {
            trueText: `상시 근로자 수가 5명 미만이어도 ${w}는 1주를 개근하면 ${won(d.weeklyHolidayPay)}의 주휴 수당을 받을 수 있다.`,
            falseText: `상시 근로자 수가 5명 미만이므로 ${w}는 주휴 수당을 받을 수 없다.`,
            rationale: `주휴일(유급 휴일)은 5명 미만 사업장에도 적용되며, 1주 소정 근로 ${num(d.weeklyHours)}시간(15시간 이상)이므로 1일 소정 근로 ${facts.dailyWorkHours}시간 × ${won(facts.hourlyWage)} = ${won(d.weeklyHolidayPay)}`,
        }
        : {
            trueText: `${w}가 1주를 개근하면 받는 주휴 수당은 ${won(d.weeklyHolidayPay)}이다.`,
            falseText: `${w}가 1주를 개근하면 받는 주휴 수당은 ${won(facts.dailyWorkHours === 8 ? d.weeklyHolidayPay * 1.5 : 8 * facts.hourlyWage)}이다.`,
            rationale: `주휴 수당 = 1일 소정 근로 시간(${facts.dailyWorkHours}시간) × 시급(${won(facts.hourlyWage)}) = ${won(d.weeklyHolidayPay)}`,
        };
    templates.overtime = {
        trueText: `${w}가 어느 날 1일 8시간을 넘겨 1시간 연장 근로를 하면 그 1시간에 대해 ${won(d.overtimeHourlyPay)}을 받는다.`,
        falseText: `${w}가 어느 날 1일 8시간을 넘겨 1시간 연장 근로를 하면 그 1시간에 대해 ${won(d.isSmall ? facts.hourlyWage * 1.5 : facts.hourlyWage)}을 받는다.`,
        rationale: d.isSmall
            ? `상시 근로자 5명 미만 사업장은 연장 근로 가산 수당 규정이 적용되지 않아 시급 ${won(facts.hourlyWage)}만 받는다`
            : `상시 근로자 5명 이상 사업장은 연장 근로에 통상임금의 50%를 가산하므로 ${won(facts.hourlyWage)} × 1.5 = ${won(d.overtimeHourlyPay)}`,
    };
    templates.annualLeave = d.isSmall
        ? {
            trueText: `상시 근로자 수가 5명 미만이므로 ${w}에게는 연차 유급 휴가 규정이 적용되지 않는다.`,
            falseText: `${w}가 1개월 동안 개근하면 1일의 연차 유급 휴가가 발생한다.`,
            rationale: '연차 유급 휴가 규정은 상시 근로자 5명 미만 사업장에 적용되지 않는다',
        }
        : d.underOneYear
            ? {
                trueText: `${w}가 계약 기간 중 1개월 개근할 때마다 1일의 연차 유급 휴가가 발생한다.`,
                falseText: `${w}는 계약 기간 동안 개근하면 15일의 연차 유급 휴가를 받을 수 있다.`,
                rationale: `계속 근로 1년 미만(계약 ${facts.contractMonths}개월)이므로 1개월 개근 시 1일씩 발생한다(15일은 1년간 80% 이상 출근한 경우)`,
            }
            : {
                trueText: `${w}가 입사 후 1년간 80% 이상 출근하면 15일의 연차 유급 휴가가 발생한다.`,
                falseText: `${w}가 입사 후 1년간 80% 이상 출근해도 연차 유급 휴가는 1개월 개근 시 1일씩만 발생한다.`,
                rationale: '1년간 80% 이상 출근하면 15일의 연차 유급 휴가가 발생한다',
            };
    templates.severance = d.underOneYear
        ? {
            trueText: `${w}는 계약 기간을 마치고 퇴사하더라도 퇴직금을 받을 수 없다.`,
            falseText: `${w}는 계약 기간을 마치고 퇴사하면 퇴직금을 받을 수 있다.`,
            rationale: `계속 근로 기간이 ${facts.contractMonths}개월로 1년 미만이므로 퇴직금 지급 의무가 없다`,
        }
        : {
            trueText: `${w}가 계약 기간을 마치고 퇴사하면 퇴직금을 받을 수 있다.`,
            falseText: `${w}는 기간제 근로자이므로 계약 기간을 마치고 퇴사해도 퇴직금을 받을 수 없다.`,
            rationale: `계속 근로 ${facts.contractMonths}개월(1년 이상), 1주 소정 근로 15시간 이상이므로 30일분 평균임금 × 근속 연수의 퇴직금을 받는다`,
        };
    return templates;
}
function laborScenario(rng) {
    const facts = generateLaborFacts(rng);
    return {
        kind: 'labor',
        genre: '근로 계약 사례 조사 보고서',
        context: '이 근로 계약이 등장하는 배경(수행 평가 조사 보고서, 노무 상담 등)과 인물 상황을 쓰고, 표와 다른 수치(시급·시간·인원·기간)를 쓰지 마십시오.',
        otherHint: '이 사례로 판단할 수 있는 근로 기준법 개념(5명 미만 사업장 적용 제외 범위, 근로 계약서 교부, 휴게 시간 부여 원칙, 해고 예고 등)',
        tables: [laborTable(facts)],
        conditions: [],
        templates: laborStatementTemplates(facts),
        numeric: [],
        facts,
    };
}
/**
 * 보기형 명세(키별 참/거짓 고정)에 계산 진술 1~2개를 배정한다.
 * 참 보기 하나·거짓 보기 하나에 넣어 학생이 계산으로 둘을 가려야 하게 한다.
 */
function buildLaborCalculationPlan(rng, viewKeys, trueKeys) {
    const scenario = laborScenario(rng);
    const plan = (0, calculation_kit_1.scenarioToPlan)(scenario, 'statements', rng, {
        viewKeys,
        trueViewKeys: trueKeys,
        answerIndex: 1,
        polarity: 'positive',
    });
    if (plan === undefined)
        throw new Error('labor scenario must yield statements');
    return { ...plan, facts: scenario.facts };
}
function endDate(start, months) {
    const date = new Date(Date.UTC(start.year, start.month - 1 + months, start.day));
    date.setUTCDate(date.getUTCDate() - 1);
    return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}
function formatDate(date) {
    return `${date.year}년 ${date.month}월 ${date.day}일`;
}
function breakLabel(minutes) {
    return minutes >= 60 ? `${minutes / 60}시간` : `${minutes}분`;
}
function num(value) {
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
function won(value) {
    return `${Math.round(value).toLocaleString('ko-KR')}원`;
}
