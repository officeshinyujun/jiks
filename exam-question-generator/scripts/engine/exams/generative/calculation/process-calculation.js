"use strict";
/**
 * 공업 일반 7단원(제품 개발 및 생산 관리) 선행 작업표 계산.
 *
 * 기출 구조: 작업 A~E의 선행 작업·작업 시간 표 + [조건] → 완제품 1개 최소 소요 시간(가장 긴 경로),
 * 작업 시간을 절반으로 줄인 공정 개선 후 단축 시간, 근무 시간(240분 등) 동안 생산 개수.
 * 대표 오답: 한 경로만 더함, 모든 작업 시간을 더함, 줄인 시간을 그대로 총시간 단축으로 봄, 개선 전 값.
 * 규칙 출처: unit-guides/kongil_07.json (퍼트: 선행 작업이 모두 끝나야 다음 작업 시작, 가장 긴 경로)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PROCESS_PRODUCTS = void 0;
exports.scheduleProcess = scheduleProcess;
exports.processPaths = processPaths;
exports.generateProcessFacts = generateProcessFacts;
exports.processScenario = processScenario;
const calculation_kit_1 = require("./calculation-kit");
const TASK_IDS = ['A', 'B', 'C', 'D', 'E'];
const STRUCTURES = [
    {
        preds: { A: [], B: ['A'], C: [], D: ['B', 'C'], E: ['D'] },
        describe: ([p1, p2]) => ({ A: `${p1} 가공`, B: `${p1} 조립`, C: `${p2} 가공`, D: `${p1}·${p2} 결합`, E: '검사 및 포장' }),
    },
    {
        preds: { A: [], B: ['A'], C: ['A'], D: ['B', 'C'], E: ['B', 'D'] },
        describe: ([p1, p2]) => ({ A: '원자재 절단', B: `${p1} 조립`, C: `${p2} 조립`, D: `${p1}·${p2} 결합`, E: '최종 조립 및 포장' }),
    },
    {
        preds: { A: [], B: [], C: ['A', 'B'], D: ['A', 'B'], E: ['C', 'D'] },
        describe: ([p1, p2, p3]) => ({ A: `${p1} 가공`, B: `${p2} 가공`, C: `${p1}·${p2} 결합`, D: `${p3} 조립`, E: '최종 조립 및 검사' }),
    },
    {
        preds: { A: [], B: [], C: ['A'], D: ['B'], E: ['C', 'D'] },
        describe: ([p1, p2]) => ({ A: `${p1} 가공`, B: `${p2} 가공`, C: `${p1} 조립`, D: `${p2} 조립`, E: '최종 결합 및 검사' }),
    },
];
exports.PROCESS_PRODUCTS = [
    { name: '캠핑 의자', parts: ['받침대 프레임', '등받이', '팔걸이'] },
    { name: '가정용 드론', parts: ['몸체', '프로펠러', '배터리 모듈'] },
    { name: '블루투스 스피커', parts: ['외장 케이스', '스피커 유닛', '회로 기판'] },
    { name: '전동 킥보드', parts: ['발판 프레임', '핸들', '바퀴'] },
    { name: '원목 책상', parts: ['상판', '다리', '서랍'] },
    { name: '공기 청정기', parts: ['본체 케이스', '필터 모듈', '송풍 모터'] },
];
/** 선행 작업이 모두 끝난 시각에 시작하는 가장 이른 일정(작업 E가 마지막 작업) */
function scheduleProcess(preds, minutes) {
    const start = {};
    const finish = {};
    for (const id of TASK_IDS) {
        start[id] = Math.max(0, ...preds[id].map((pred) => finish[pred]));
        finish[id] = start[id] + minutes[id];
    }
    const critical = ['E'];
    let current = 'E';
    while (preds[current].length > 0) {
        const previous = [...preds[current]].sort((left, right) => finish[right] - finish[left])[0];
        critical.unshift(previous);
        current = previous;
    }
    return { start, finish, total: finish.E, critical };
}
/** 시작 작업에서 E까지의 모든 경로와 그 시간 합 */
function processPaths(preds, minutes) {
    const walk = (id) => preds[id].length === 0 ? [[id]] : preds[id].flatMap((pred) => walk(pred).map((path) => [...path, id]));
    return walk('E').map((path) => ({ path, sum: path.reduce((total, id) => total + minutes[id], 0) }));
}
function generateProcessFacts(rng) {
    const structureIndex = Math.floor(rng() * STRUCTURES.length);
    const structure = STRUCTURES[structureIndex];
    // 기출처럼 개선 전후로 가장 긴 경로가 바뀌는(단축 시간 ≠ 줄인 시간) 함정을 자주 만든다.
    const wantTrap = rng() < 0.6;
    let fallback;
    for (let attempt = 0; attempt < 400; attempt += 1) {
        const minutes = Object.fromEntries(TASK_IDS.map((id) => [id, (0, calculation_kit_1.randInt)(3, 15, rng)]));
        const longest = Math.max(...Object.values(minutes));
        const holders = TASK_IDS.filter((id) => minutes[id] === longest);
        if (holders.length !== 1 || longest % 2 !== 0 || longest < 8)
            continue;
        const improved = holders[0];
        const before = scheduleProcess(structure.preds, minutes);
        if (!before.critical.includes(improved))
            continue;
        const sums = new Set(processPaths(structure.preds, minutes).map((path) => path.sum));
        if (sums.size < 2)
            continue;
        const after = scheduleProcess(structure.preds, { ...minutes, [improved]: longest / 2 });
        const facts = {
            product: (0, calculation_kit_1.pick)(exports.PROCESS_PRODUCTS, rng).name,
            structureIndex,
            minutes,
            improved,
            startClock: (0, calculation_kit_1.pick)([9 * 60, 13 * 60], rng),
            workMinutes: (0, calculation_kit_1.pick)([240, 240, 480], rng),
        };
        const trap = before.total - after.total !== longest / 2;
        if (trap === wantTrap)
            return facts;
        fallback ??= facts;
    }
    if (fallback === undefined)
        throw new Error('process facts generation failed');
    return fallback;
}
function processScenario(rng) {
    const facts = generateProcessFacts(rng);
    const structure = STRUCTURES[facts.structureIndex];
    const parts = exports.PROCESS_PRODUCTS.find((product) => product.name === facts.product)?.parts ?? ['부품', '부품', '부품'];
    const labels = structure.describe(parts);
    const x = facts.improved;
    const half = facts.minutes[x] / 2;
    const improvedMinutes = { ...facts.minutes, [x]: half };
    const before = scheduleProcess(structure.preds, facts.minutes);
    const after = scheduleProcess(structure.preds, improvedMinutes);
    const beforeSums = processPaths(structure.preds, facts.minutes);
    const afterSums = processPaths(structure.preds, improvedMinutes);
    const allBefore = TASK_IDS.reduce((total, id) => total + facts.minutes[id], 0);
    const allAfter = allBefore - half;
    const reduction = before.total - after.total;
    const countAfter = Math.floor(facts.workMinutes / after.total);
    const countBefore = Math.floor(facts.workMinutes / before.total);
    const hours = facts.workMinutes / 60;
    const timeline = (schedule) => `${TASK_IDS.map((id) => `${id} ${schedule.start[id]}~${schedule.finish[id]}분`).join(', ')} → ${schedule.total}분(경로 ${schedule.critical.join('→')})`;
    const rationale = [
        `공정 개선 전: ${timeline(before)}`,
        `공정 개선 후(작업 ${x} ${facts.minutes[x]}분 → ${half}분): ${timeline(after)}`,
        `단축 시간 ${before.total} - ${after.total} = ${reduction}분, ${facts.workMinutes}분 ÷ ${after.total}분 → 최대 ${countAfter}개`,
    ].join(' / ');
    const otherBefore = beforeSums.filter((entry) => entry.sum !== before.total);
    const wrongLead = otherBefore.length > 0 ? (0, calculation_kit_1.pick)(otherBefore, rng).sum : allBefore;
    const joinTask = TASK_IDS.find((id) => structure.preds[id].length >= 2) ?? 'D';
    const joinPreds = structure.preds[joinTask];
    const naiveStart = Math.min(...joinPreds.map((pred) => before.finish[pred]));
    const templates = (0, calculation_kit_1.compactTemplates)({
        leadBefore: (0, calculation_kit_1.template)(`공정 개선 전 완제품 1개가 생산될 때까지 걸리는 최소 시간은 ${before.total}분이다.`, `공정 개선 전 완제품 1개가 생산될 때까지 걸리는 최소 시간은 ${wrongLead}분이다.`, `선행 작업이 모두 끝나야 다음 작업을 시작하므로 가장 긴 경로가 소요 시간이다. ${timeline(before)}`),
        reduction: (0, calculation_kit_1.template)(`공정 개선 후 완제품 1개 생산에 걸리는 시간은 개선 전보다 ${reduction}분 줄어든다.`, `공정 개선 후 완제품 1개 생산에 걸리는 시간은 개선 전보다 ${reduction === half ? facts.minutes[x] : half}분 줄어든다.`, `개선 전 ${before.total}분, 개선 후 ${timeline(after)}이므로 ${reduction}분 줄어든다${reduction === half ? '' : `(작업 ${x}에서 줄인 ${half}분이 그대로 단축되지 않는다)`}`),
        output: (0, calculation_kit_1.template)(`공정 개선 후 전체 작업 시간 ${hours}시간 동안 생산할 수 있는 완제품은 최대 ${countAfter}개이다.`, `공정 개선 후 전체 작업 시간 ${hours}시간 동안 생산할 수 있는 완제품은 최대 ${countBefore !== countAfter ? countBefore : Math.floor(facts.workMinutes / allAfter)}개이다.`, `완제품 1개에 ${after.total}분이 걸리고 다음 완제품은 앞 완제품 생산 직후 시작하므로 ${facts.workMinutes}분 ÷ ${after.total}분 → ${countAfter}개`),
        joinStart: (0, calculation_kit_1.template)(`공정 개선 전 작업 ${joinTask}는 작업 시작 ${before.start[joinTask]}분 후에 시작할 수 있다.`, `공정 개선 전 작업 ${joinTask}는 작업 시작 ${naiveStart}분 후에 시작할 수 있다.`, `작업 ${joinTask}는 선행 작업 ${(0, calculation_kit_1.josa)(joinPreds.join(', '), '이/가')} 모두 끝나야 시작하므로 ${joinPreds.map((pred) => `${pred} ${before.finish[pred]}분`).join(', ')} 중 늦은 ${before.start[joinTask]}분에 시작한다`),
    });
    const stemOf = (question) => `다음 ${facts.product} 생산 계획을 [조건]에 따라 수행할 경우 ${(0, calculation_kit_1.josa)(question, '으로/로')} 옳은 것은? (단, 주어진 [조건] 외의 것은 고려하지 않는다.)`;
    const pathLabel = (path) => path.join('→');
    const numeric = [
        {
            id: 'leadAfter',
            stem: stemOf('공정 개선 후 첫 번째 완제품이 생산될 때까지 걸리는 최소 시간'),
            correct: after.total,
            mistakes: [
                { value: before.total, reason: '공정 개선 전의 소요 시간이다' },
                { value: allAfter, reason: '병렬로 진행되는 작업까지 모든 작업 시간을 더한 값이다' },
                { value: before.total - half, reason: `작업 ${x}에서 줄인 ${half}분을 그대로 총시간에서 뺀 값이다` },
                ...afterSums
                    .filter((entry) => entry.sum !== after.total)
                    .map((entry) => ({ value: entry.sum, reason: `${pathLabel(entry.path)} 경로만 더한 값이다` })),
            ],
            step: 1,
            min: 1,
            unit: '분',
            rationale,
        },
        {
            id: 'reduction',
            stem: stemOf('공정 개선 전에 비해 공정 개선 후 완제품 1개 생산 시간이 줄어드는 시간'),
            correct: reduction,
            mistakes: [
                { value: half, reason: `작업 ${x}에서 줄인 시간을 그대로 총시간 단축으로 본 값이다` },
                { value: facts.minutes[x], reason: `작업 ${x}의 개선 전 작업 시간이다` },
                { value: after.total, reason: '공정 개선 후 완제품 1개 소요 시간이다' },
            ],
            step: 1,
            min: 1,
            unit: '분',
            rationale,
        },
        {
            id: 'outputAfter',
            stem: stemOf('공정 개선 후 전체 작업 시간 동안 생산할 수 있는 완제품의 최대 개수'),
            correct: countAfter,
            mistakes: [
                { value: countBefore, reason: '공정 개선 전 소요 시간으로 나눈 값이다' },
                { value: Math.floor(facts.workMinutes / allAfter), reason: '모든 작업 시간을 더한 값으로 나눈 값이다' },
                { value: Math.floor(facts.workMinutes / (before.total - half)), reason: '줄인 시간을 그대로 뺀 소요 시간으로 나눈 값이다' },
            ],
            step: 1,
            min: 1,
            unit: '개',
            rationale,
        },
    ];
    return {
        kind: 'critical_path',
        genre: '제품 생산 계획서',
        context: `○○기업이 ${facts.product}의 생산 공정을 분석하고 개선 계획을 세우는 상황(생산 계획 보고서·견학 보고서 등). 표와 [조건]에 없는 작업 시간·작업자 수·시각을 새로 쓰지 마십시오.`,
        otherHint: '생산 관리 개념(생산 합리화 3S, 공정의 종류, 공정 관리 기능, 품질·재고 관리 기법 등)을 제시문 단서와 연결',
        tables: [
            {
                title: `${facts.product} 생산 공정`,
                headers: ['작업명', '작업 내용', '선행 작업', '작업 시간'],
                rows: TASK_IDS.map((id) => [
                    `작업 ${id}`,
                    labels[id],
                    structure.preds[id].length === 0 ? '없음' : `작업 ${structure.preds[id].join(', ')}`,
                    `${facts.minutes[id]}분`,
                ]),
            },
        ],
        conditions: [
            '작업 A~E의 모든 작업을 거쳐야 완제품 1개가 생산됨.',
            '선행 작업이 모두 끝나야 그 작업을 시작할 수 있으며, 선행 작업이 없는 작업은 동시에 시작함.',
            '각 작업에는 작업자 1명이 배치되고, 작업 간 이동 시간은 고려하지 않음.',
            `공정 개선: 작업 시간이 가장 긴 작업 ${x}에 작업자 1명을 추가 배치하여 작업 ${x}의 작업 시간을 절반으로 줄임.`,
            `전체 작업 시간은 ${(0, calculation_kit_1.clock)(facts.startClock)}~${(0, calculation_kit_1.clock)(facts.startClock + facts.workMinutes)}(${hours}시간)이며, 다음 완제품의 작업은 앞 완제품이 생산된 직후 시작함.`,
        ],
        templates,
        numeric,
        facts,
    };
}
