"use strict";
/**
 * 공업 일반 14단원(사고와 산업 안전) 중대 재해 판정과 재해율 계산.
 *
 * 중대 재해(산업안전보건법): 사망자 1명 이상, 3개월 이상 요양 부상자 동시 2명 이상,
 * 부상자·직업성 질병자 동시 10명 이상. 기출 함정은 경계 근처(1명 6개월, 2명 2개월, 9명).
 * 재해율 = 연간 재해자 수 ÷ 연평균 근로자 수 × 100. 대표 오답: 사고 건수로 나눔.
 * 하인리히 법칙 중상해 : 경상해 : 무상해 = 1 : 29 : 300.
 * 규칙 출처: unit-guides/kongil_14.json
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSeriousAccident = isSeriousAccident;
exports.seriousReason = seriousReason;
exports.generateAccidentFacts = generateAccidentFacts;
exports.accidentScenario = accidentScenario;
const calculation_kit_1 = require("./calculation-kit");
const ACCIDENT_KINDS = [
    { id: 'death', deaths: 1, injured: 0, care: '', careMonths: 0, causes: ['추락', '감전'] },
    { id: 'deathWithInjury', deaths: 1, injured: 2, care: '2주', careMonths: 0.5, causes: ['화재', '폭발'] },
    { id: 'twoLong', deaths: 0, injured: 2, care: '4개월', careMonths: 4, causes: ['끼임', '부딪힘', '추락'] },
    { id: 'threeLong', deaths: 0, injured: 3, care: '5개월', careMonths: 5, causes: ['붕괴', '부딪힘'] },
    { id: 'mass', deaths: 0, injured: 12, care: '1주', careMonths: 0.25, causes: ['유해 물질 누출', '화재'] },
    // 경계 함정: 중대 재해가 아니다.
    { id: 'oneLong', deaths: 0, injured: 1, care: '6개월', careMonths: 6, causes: ['끼임', '넘어짐', '절단'] },
    { id: 'twoShort', deaths: 0, injured: 2, care: '2개월', careMonths: 2, causes: ['넘어짐', '부딪힘', '끼임'] },
    { id: 'nineShort', deaths: 0, injured: 9, care: '2주', careMonths: 0.5, causes: ['유해 물질 누출', '가스 흡입'] },
];
function isSeriousAccident(kind) {
    if (kind.deaths >= 1)
        return true;
    if (kind.injured >= 2 && kind.careMonths >= 3)
        return true;
    return kind.injured >= 10;
}
function seriousReason(kind) {
    if (kind.deaths >= 1)
        return '사망자가 1명 이상 발생했으므로 중대 재해이다';
    if (kind.injured >= 2 && kind.careMonths >= 3)
        return '3개월 이상 요양이 필요한 부상자가 동시에 2명 이상 발생했으므로 중대 재해이다';
    if (kind.injured >= 10)
        return '부상자가 동시에 10명 이상 발생했으므로 중대 재해이다';
    if (kind.careMonths >= 3)
        return '3개월 이상 요양이 필요한 부상자가 1명뿐이므로 중대 재해가 아니다';
    if (kind.injured >= 2)
        return '부상자가 2명 이상이지만 요양 기간이 3개월 미만이고 10명 미만이므로 중대 재해가 아니다';
    return '중대 재해 기준에 해당하지 않는다';
}
function generateAccidentFacts(rng) {
    for (let attempt = 0; attempt < 300; attempt += 1) {
        const kinds = (0, calculation_kit_1.shuffle)(ACCIDENT_KINDS, rng).slice(0, 4);
        const serious = kinds.filter(isSeriousAccident).length;
        if (serious === 0 || serious === 4)
            continue;
        if (kinds.filter((kind) => kind.id === 'mass' || kind.id === 'nineShort').length > 1)
            continue;
        const months = (0, calculation_kit_1.shuffle)([2, 3, 4, 5, 6, 7, 8, 9, 10, 11], rng).slice(0, 4).sort((a, b) => a - b);
        const workers = (0, calculation_kit_1.pick)([200, 250, 400, 500, 1_000], rng);
        return {
            workers,
            events: kinds.map((kind, index) => ({ kind, month: months[index], cause: (0, calculation_kit_1.pick)(kind.causes, rng) })),
            heinrichScale: (0, calculation_kit_1.randInt)(2, 4, rng),
        };
    }
    throw new Error('accident facts generation failed');
}
function damage(kind) {
    const parts = [];
    if (kind.deaths > 0)
        parts.push(`사망 ${kind.deaths}명`);
    if (kind.injured > 0)
        parts.push(`부상 ${kind.injured}명(${kind.injured > 1 ? '각각 ' : ''}${kind.care} 요양)`);
    return parts.join(', ');
}
function accidentScenario(rng) {
    const facts = generateAccidentFacts(rng);
    const victims = facts.events.reduce((sum, event) => sum + event.kind.deaths + event.kind.injured, 0);
    const rate = (0, calculation_kit_1.round2)((victims / facts.workers) * 100);
    const eventRate = (0, calculation_kit_1.round2)((facts.events.length / facts.workers) * 100);
    const seriousCount = facts.events.filter((event) => isSeriousAccident(event.kind)).length;
    // 경계 함정을 중대 재해로 잘못 센 값
    const naiveCount = facts.events.filter((event) => isSeriousAccident(event.kind) || ['oneLong', 'twoShort', 'nineShort'].includes(event.kind.id)).length;
    const traps = facts.events
        .map((event, index) => ({ event, index }))
        .filter(({ event }) => ['oneLong', 'twoShort', 'nineShort'].includes(event.kind.id));
    const judged = traps.length > 0 && rng() < 0.7 ? (0, calculation_kit_1.pick)(traps, rng) : (0, calculation_kit_1.pick)(facts.events.map((event, index) => ({ event, index })), rng);
    const judgedSerious = isSeriousAccident(judged.event.kind);
    const seriousRationale = facts.events
        .map((event, index) => `사고 ${index + 1}: ${seriousReason(event.kind)}`)
        .join(' / ');
    const rateRationale = `재해자 수 = ${facts.events.map((event) => event.kind.deaths + event.kind.injured).join(' + ')} = ${victims}명, 재해율 = ${victims} ÷ ${facts.workers} × 100 = ${(0, calculation_kit_1.num)(rate)}%`;
    const k = facts.heinrichScale;
    const templates = (0, calculation_kit_1.compactTemplates)({
        seriousCount: (0, calculation_kit_1.template)(`올해 발생한 사고 중 중대 재해에 해당하는 사고는 ${seriousCount}건이다.`, `올해 발생한 사고 중 중대 재해에 해당하는 사고는 ${naiveCount !== seriousCount ? naiveCount : seriousCount + 1}건이다.`, seriousRationale),
        judged: (0, calculation_kit_1.template)(`${(0, calculation_kit_1.josa)(`사고 ${judged.index + 1}`, '은/는')} 중대 재해에 ${judgedSerious ? '해당한다' : '해당하지 않는다'}.`, `${(0, calculation_kit_1.josa)(`사고 ${judged.index + 1}`, '은/는')} 중대 재해에 ${judgedSerious ? '해당하지 않는다' : '해당한다'}.`, `사고 ${judged.index + 1}: ${seriousReason(judged.event.kind)}`),
        rate: (0, calculation_kit_1.template)(`올해 이 공장의 재해율은 ${(0, calculation_kit_1.num)(rate)}%이다.`, `올해 이 공장의 재해율은 ${(0, calculation_kit_1.num)(eventRate !== rate ? eventRate : (0, calculation_kit_1.round2)(rate * 2))}%이다.`, rateRationale),
        heinrich: (0, calculation_kit_1.template)(`하인리히의 법칙에 따르면 경상해 사고가 ${29 * k}건 발생할 때 무상해 사고는 약 ${300 * k}건 발생한다.`, `하인리히의 법칙에 따르면 경상해 사고가 ${29 * k}건 발생할 때 무상해 사고는 약 300건 발생한다.`, `중상해 : 경상해 : 무상해 = 1 : 29 : 300이므로 경상해 ${29 * k}건이면 무상해는 300 × ${k} = ${300 * k}건`),
    });
    const numeric = [
        {
            id: 'rate',
            stem: '다음 ○○공장의 사고 발생 현황에서 올해 이 공장의 재해율로 옳은 것은?',
            correct: rate,
            mistakes: [
                { value: eventRate, reason: '재해자 수가 아니라 사고 건수로 구한 값이다' },
                {
                    value: (0, calculation_kit_1.round2)((facts.events.reduce((sum, event) => sum + event.kind.injured, 0) / facts.workers) * 100),
                    reason: '사망자를 재해자에서 뺀 값이다',
                },
            ],
            step: rate >= 2 ? 0.5 : 0.1,
            min: 0.1,
            unit: '%',
            rationale: rateRationale,
        },
        {
            id: 'seriousCount',
            stem: '다음 ○○공장의 사고 발생 현황에서 중대 재해에 해당하는 사고의 수로 옳은 것은?',
            correct: seriousCount,
            mistakes: [{ value: naiveCount, reason: '요양 기간이나 동시 부상자 수 기준에 못 미치는 사고까지 센 값이다' }],
            step: 1,
            min: 0,
            unit: '건',
            rationale: seriousRationale,
        },
    ];
    return {
        kind: 'industrial_accident',
        genre: '안전 관리 보고서',
        context: '○○공장의 안전 관리 담당자가 올해 사고 현황을 정리하고 재발 방지 대책을 세우는 상황. 표와 [조건]에 없는 사고·인원·기간을 새로 쓰지 마십시오.',
        otherHint: '산업 안전 개념(하인리히·버드 이론, 사고 예방 5단계, 직접·간접 원인, 안전 관리 조직, 안전 보건 표지 등)을 제시문 단서와 연결',
        tables: [
            {
                title: '올해 사고 발생 현황',
                headers: ['구분', '발생 시기', '사고 유형', '피해 현황'],
                rows: facts.events.map((event, index) => [`사고 ${index + 1}`, `${event.month}월`, event.cause, damage(event.kind)]),
            },
        ],
        conditions: [
            `○○공장의 연평균 근로자 수는 ${facts.workers.toLocaleString('ko-KR')}명이며, 표의 사고 외에 올해 발생한 재해는 없음.`,
            '각 사고의 사망자·부상자는 같은 사고로 동시에 발생하였고, 요양 기간은 의사 소견에 따른 기간임.',
        ],
        templates,
        numeric,
        facts,
    };
}
