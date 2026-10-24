"use strict";
/**
 * 공업 일반 8·11단원 품질 계산: 6시그마(PPM) 판정과 파레토 누적 비율·불량률.
 *
 * 6시그마(기출 2025 수능 11번, 2025 6월 8번, 2024 9월 19·20번): 목표 100만 개당 3.4개 → N백만 개면 3.4 × N개,
 * 불량률(PPM) = 불량품 수 ÷ 생산량 × 1,000,000. 대표 오답: 3.4를 생산량과 무관하게 적용, 6.8을 7로 올림,
 * 불량품 수를 그대로 PPM으로 읽음.
 * 파레토(기출 2024 9월 20번): 큰 항목부터 왼쪽, 누적 비율 = 해당 항목까지 합 ÷ 총 불량 수 × 100.
 * 대표 오답: 표에 적힌 순서대로 더함, 한 항목만 셈.
 * 규칙 출처: unit-guides/kongil_08.json, kongil_11.json
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.sixSigmaAllowance = sixSigmaAllowance;
exports.ppm = ppm;
exports.generateLotFacts = generateLotFacts;
exports.sixSigmaLotScenario = sixSigmaLotScenario;
exports.generateProductQualityFacts = generateProductQualityFacts;
exports.sixSigmaProductScenario = sixSigmaProductScenario;
exports.sixSigmaScenario = sixSigmaScenario;
exports.generateParetoFacts = generateParetoFacts;
exports.paretoScenario = paretoScenario;
const calculation_kit_1 = require("./calculation-kit");
const SIX_SIGMA_PPM = 3.4;
const MILLION = 1_000_000;
/** N백만 개 생산 시 6시그마 목표를 만족하는 최대 불량품 수 */
function sixSigmaAllowance(production) {
    return Math.floor((0, calculation_kit_1.round2)((SIX_SIGMA_PPM * production) / MILLION) + 1e-9);
}
function ppm(defects, production) {
    return (0, calculation_kit_1.round2)((defects / production) * MILLION);
}
function manGae(value) {
    return value % 10_000 === 0 ? `${(0, calculation_kit_1.num)(value / 10_000)}만 개` : `${value.toLocaleString('ko-KR')}개`;
}
const LOT_SIZES = [250_000, 300_000, 350_000, 400_000, 500_000, 600_000, 650_000, 750_000];
function generateLotFacts(rng) {
    for (let attempt = 0; attempt < 500; attempt += 1) {
        const millions = (0, calculation_kit_1.pick)([2, 2, 3, 4, 4], rng);
        const count = (0, calculation_kit_1.pick)([3, 4], rng);
        const sizes = Array.from({ length: count - 1 }, () => (0, calculation_kit_1.pick)(LOT_SIZES, rng));
        const last = millions * MILLION - sizes.reduce((total, size) => total + size, 0);
        if (last < 200_000 || last > 1_200_000 || last % 50_000 !== 0)
            continue;
        const lots = [...sizes, last].map((size) => ({ size, defects: (0, calculation_kit_1.randInt)(1, 12, rng) }));
        const total = lots.reduce((sum, lot) => sum + lot.defects, 0);
        if (total <= sixSigmaAllowance(millions * MILLION) + 3)
            continue;
        // 로트 하나는 목표 달성 여부가 경계에서 멀어야 판정이 분명하다.
        if (lots.some((lot) => Math.abs(ppm(lot.defects, lot.size) - SIX_SIGMA_PPM) < 0.3))
            continue;
        return { product: (0, calculation_kit_1.pick)(['정밀 볼트', '자동차 센서', '스마트폰 커넥터', '의료용 주사기', '반도체 칩'], rng), lots };
    }
    throw new Error('lot facts generation failed');
}
function sixSigmaLotScenario(rng) {
    const facts = generateLotFacts(rng);
    const production = facts.lots.reduce((sum, lot) => sum + lot.size, 0);
    const defects = facts.lots.reduce((sum, lot) => sum + lot.defects, 0);
    const millions = production / MILLION;
    const allowance = sixSigmaAllowance(production);
    const reduction = defects - allowance;
    const rounded = Math.round(SIX_SIGMA_PPM * millions);
    const lotIndex = (0, calculation_kit_1.randInt)(0, facts.lots.length - 1, rng);
    const lot = facts.lots[lotIndex];
    const lotPpm = ppm(lot.defects, lot.size);
    const lotAchieved = lotPpm <= SIX_SIGMA_PPM;
    const totalRationale = `총 생산량 ${facts.lots.map((entry) => manGae(entry.size)).join(' + ')} = ${manGae(production)}, 불량품 ${facts.lots.map((entry) => entry.defects).join(' + ')} = ${defects}개. 6시그마 목표는 100만 개당 3.4개이므로 ${(0, calculation_kit_1.num)(millions)}백만 개에 허용되는 불량품은 3.4 × ${(0, calculation_kit_1.num)(millions)} = ${(0, calculation_kit_1.num)(SIX_SIGMA_PPM * millions)}개, 즉 최대 ${allowance}개`;
    const templates = (0, calculation_kit_1.compactTemplates)({
        reduction: (0, calculation_kit_1.template)(`1개월 생산품 전체가 6시그마 목표치를 달성하려면 불량품을 최소 ${reduction}개 줄여야 한다.`, `1개월 생산품 전체가 6시그마 목표치를 달성하려면 불량품을 최소 ${rounded !== allowance ? defects - rounded : defects - 3}개 줄여야 한다.`, `${totalRationale} → ${defects} - ${allowance} = ${reduction}개`),
        allowance: millions === 1
            ? undefined
            : (0, calculation_kit_1.template)(`1개월 생산량 기준으로 6시그마 목표치를 만족하는 불량품 수는 최대 ${allowance}개이다.`, `1개월 생산량 기준으로 6시그마 목표치를 만족하는 불량품 수는 최대 ${rounded !== allowance ? rounded : 3}개이다.`, totalRationale),
        totalPpm: (0, calculation_kit_1.template)(`1개월 생산품 전체의 불량률은 ${(0, calculation_kit_1.num)(ppm(defects, production))} PPM이다.`, `1개월 생산품 전체의 불량률은 ${defects} PPM이다.`, `${defects}개 ÷ ${manGae(production)} × 1,000,000 = ${(0, calculation_kit_1.num)(ppm(defects, production))} PPM`),
        lot: (0, calculation_kit_1.template)(`로트 ${lotIndex + 1}의 불량률은 6시그마 목표치를 ${lotAchieved ? '달성하였다' : '달성하지 못하였다'}.`, `로트 ${lotIndex + 1}의 불량률은 6시그마 목표치를 ${lotAchieved ? '달성하지 못하였다' : '달성하였다'}.`, `로트 ${lotIndex + 1}: ${lot.defects}개 ÷ ${manGae(lot.size)} × 1,000,000 = ${(0, calculation_kit_1.num)(lotPpm)} PPM으로 3.4 PPM ${lotAchieved ? '이하' : '초과'}`),
    });
    const numeric = [
        {
            id: 'reduction',
            stem: `다음 ○○기업의 1개월 품질 검사 결과에서 1개월 생산품 전체가 6시그마 목표치를 달성하기 위해 줄여야 하는 불량품의 최소 개수로 옳은 것은?`,
            correct: reduction,
            mistakes: [
                { value: defects - 3, reason: '허용 불량품 3.4개를 생산량과 관계없이 적용한 값이다' },
                { value: defects - rounded, reason: `허용 불량품 ${(0, calculation_kit_1.num)(SIX_SIGMA_PPM * millions)}개를 반올림하여 ${rounded}개로 본 값이다` },
                { value: defects, reason: '전체 불량품 수이다' },
            ],
            step: 1,
            min: 1,
            unit: '개',
            rationale: `${totalRationale} → ${defects} - ${allowance} = ${reduction}개`,
        },
    ];
    return {
        kind: 'six_sigma',
        genre: '품질 관리 분석 현황 보고서',
        context: `○○기업이 ${(0, calculation_kit_1.josa)(facts.product, '을/를')} 로트 단위로 생산하고 1개월 동안의 품질 검사 결과를 분석하는 상황. 표와 [조건]에 없는 생산량·불량품 수를 새로 쓰지 마십시오.`,
        otherHint: '품질 관리 개념(6시그마 추진 단계 DMAIC, 데밍 사이클, 관리도, 로트 생산 방식, 전수·샘플링 검사 등)을 제시문 단서와 연결',
        tables: [
            {
                title: '1개월 생산품의 품질 검사 결과',
                headers: ['로트 번호', '로트당 제품(개)', '불량품(개)'],
                rows: facts.lots.map((entry, index) => [String(index + 1), entry.size.toLocaleString('ko-KR'), String(entry.defects)]),
            },
        ],
        conditions: ['불량률(PPM)은 제품 100만 개당 불량품 수이다.'],
        templates,
        numeric,
        facts,
    };
}
const PRODUCT_SETS = [
    ['TV', '세탁기', '냉장고'],
    ['볼트', '너트', '와셔'],
    ['구동 모터', '제어 기판', '배터리 팩'],
];
function generateProductQualityFacts(rng) {
    for (let attempt = 0; attempt < 300; attempt += 1) {
        const names = (0, calculation_kit_1.pick)(PRODUCT_SETS, rng);
        const rows = names.map((name) => ({
            name,
            millions: (0, calculation_kit_1.pick)([1, 2, 3, 4, 5], rng),
            beforePpm: (0, calculation_kit_1.pick)([20, 30, 40, 50, 60], rng),
            afterPpm: (0, calculation_kit_1.pick)([2, 3, 5, 6, 7], rng),
        }));
        const achieved = rows.filter((row) => row.afterPpm <= SIX_SIGMA_PPM).length;
        if (achieved === 0 || achieved === rows.length)
            continue;
        if (rows.filter((row) => row.millions > 1).length < 2)
            continue;
        return { rows };
    }
    throw new Error('product quality facts generation failed');
}
function sixSigmaProductScenario(rng) {
    const facts = generateProductQualityFacts(rng);
    const rows = facts.rows.map((row) => ({
        ...row,
        before: row.beforePpm * row.millions,
        after: row.afterPpm * row.millions,
    }));
    const scaled = (0, calculation_kit_1.shuffle)(rows.filter((row) => row.millions > 1), rng);
    const focus = scaled[0];
    const judged = (0, calculation_kit_1.pick)(rows, rng);
    const judgedAchieved = judged.afterPpm <= SIX_SIGMA_PPM;
    const achievedCount = rows.filter((row) => row.afterPpm <= SIX_SIGMA_PPM).length;
    const naiveCount = rows.filter((row) => row.after <= SIX_SIGMA_PPM).length;
    const rowRationale = (row, stage) => `${row.name}: ${stage === 'before' ? row.before : row.after}개 ÷ ${row.millions}백만 개 = ${stage === 'before' ? row.beforePpm : row.afterPpm} PPM`;
    const templates = (0, calculation_kit_1.compactTemplates)({
        beforePpm: (0, calculation_kit_1.template)(`혁신 활동 전 ${focus.name}의 불량률은 ${focus.beforePpm} PPM이다.`, `혁신 활동 전 ${focus.name}의 불량률은 ${focus.before} PPM이다.`, `불량률(PPM) = 불량품 수 ÷ 생산량 × 1,000,000. ${rowRationale(focus, 'before')}`),
        judged: (0, calculation_kit_1.template)(`혁신 활동 후 ${(0, calculation_kit_1.josa)(judged.name, '은/는')} 6시그마 목표치를 ${judgedAchieved ? '달성하였다' : '달성하지 못하였다'}.`, `혁신 활동 후 ${(0, calculation_kit_1.josa)(judged.name, '은/는')} 6시그마 목표치를 ${judgedAchieved ? '달성하지 못하였다' : '달성하였다'}.`, `${rowRationale(judged, 'after')}이므로 6시그마 목표(3.4 PPM) ${judgedAchieved ? '이하' : '초과'}`),
        achievedCount: (0, calculation_kit_1.template)(`혁신 활동 후 6시그마 목표치를 달성한 제품은 ${achievedCount}개이다.`, `혁신 활동 후 6시그마 목표치를 달성한 제품은 ${naiveCount !== achievedCount ? naiveCount : achievedCount + 1}개이다.`, `${rows.map((row) => rowRationale(row, 'after')).join(', ')} → 3.4 PPM 이하는 ${achievedCount}개`),
        improvement: (0, calculation_kit_1.template)(`혁신 활동으로 ${focus.name}의 불량률은 ${focus.beforePpm - focus.afterPpm} PPM 낮아졌다.`, `혁신 활동으로 ${focus.name}의 불량률은 ${focus.before - focus.after} PPM 낮아졌다.`, `${rowRationale(focus, 'before')}, ${rowRationale(focus, 'after')} → ${focus.beforePpm - focus.afterPpm} PPM 감소`),
    });
    const numeric = [
        {
            id: 'beforePpm',
            stem: `다음 ○○기업의 품질 혁신 활동 결과에서 혁신 활동 전 ${focus.name}의 불량률로 옳은 것은?`,
            correct: focus.beforePpm,
            mistakes: [
                { value: focus.before, reason: '불량품 수를 생산량으로 나누지 않고 그대로 PPM으로 읽은 값이다' },
                { value: focus.afterPpm, reason: '혁신 활동 후의 불량률이다' },
            ],
            step: 10,
            min: 5,
            unit: ' PPM',
            rationale: rowRationale(focus, 'before'),
        },
    ];
    return {
        kind: 'six_sigma',
        genre: '경영 혁신 활동 보고서',
        context: '○○기업이 제품별 불량률을 줄이기 위해 품질 혁신 활동을 하고 그 전후 결과를 정리한 보고서. 표와 [조건]에 없는 생산량·불량품 수를 새로 쓰지 마십시오.',
        otherHint: '생산 혁신·품질 관리 개념(6시그마 추진 단계 DMAIC, 데밍 사이클, 린 생산, 3정 5S, 자동 창고 시스템 등)을 제시문 단서와 연결',
        tables: [
            {
                title: '제품별 품질 혁신 활동 결과',
                headers: ['구분', '생산량', '혁신 활동 전 불량품 수', '혁신 활동 후 불량품 수'],
                rows: rows.map((row) => [row.name, `${row.millions * 100}만 개`, `${row.before}개`, `${row.after}개`]),
            },
        ],
        conditions: ['불량률(PPM)은 제품 100만 개당 불량품 수이다.'],
        templates,
        numeric,
        facts,
    };
}
function sixSigmaScenario(rng) {
    return rng() < 0.5 ? sixSigmaLotScenario(rng) : sixSigmaProductScenario(rng);
}
const PARETO_DOMAINS = [
    { product: '플라스틱 사출 성형품', items: ['기포', '치수 불량', '변형', '긁힘'] },
    { product: '전자 회로 기판', items: ['납땜 불량', '부품 누락', '단락', '오염'] },
    { product: '자동차 도장 부품', items: ['흐름', '기포', '색상 불량', '이물질'] },
    { product: '가전제품 조립품', items: ['조립 불량', '자재 불량', '외관 불량', '기능 불량'] },
];
const PARETO_SHARES = [
    [50, 20, 15, 10, 5],
    [40, 30, 15, 10, 5],
    [35, 25, 20, 12, 8],
    [45, 25, 15, 10, 5],
    [40, 24, 16, 12, 8],
    [36, 24, 20, 12, 8],
];
function generateParetoFacts(rng) {
    for (let attempt = 0; attempt < 300; attempt += 1) {
        const domain = (0, calculation_kit_1.pick)(PARETO_DOMAINS, rng);
        const shares = (0, calculation_kit_1.pick)(PARETO_SHARES, rng);
        const total = (0, calculation_kit_1.pick)([50, 100, 150, 200, 250, 300, 400], rng);
        if (shares.some((share) => (total * share) % 100 !== 0))
            continue;
        const production = (0, calculation_kit_1.pick)([10_000, 20_000, 25_000, 40_000, 50_000], rng);
        const rate = (total / production) * 100;
        if ((0, calculation_kit_1.round2)(rate) !== rate || rate > 4)
            continue;
        const names = (0, calculation_kit_1.shuffle)(domain.items, rng);
        const ranked = [...names.map((name, index) => ({ name, share: shares[index] })), { name: '기타', share: shares[4] }]
            .map((entry) => ({ ...entry, count: (total * entry.share) / 100 }));
        // 기출처럼 표에는 크기순이 아닌 순서로 적어 "적힌 순서대로 더하는" 실수를 가른다.
        const listed = [...(0, calculation_kit_1.shuffle)(names, rng), '기타'];
        if (listed[0] === ranked[0].name && listed[1] === ranked[1].name)
            continue;
        return { product: domain.product, production, ranked, listed };
    }
    throw new Error('pareto facts generation failed');
}
function paretoScenario(rng) {
    const facts = generateParetoFacts(rng);
    const total = facts.ranked.reduce((sum, entry) => sum + entry.count, 0);
    const byName = new Map(facts.ranked.map((entry) => [entry.name, entry]));
    const [first, second, third] = facts.ranked;
    const top2 = first.share + second.share;
    const listedTop2 = (byName.get(facts.listed[0])?.share ?? 0) + (byName.get(facts.listed[1])?.share ?? 0);
    const rate = (0, calculation_kit_1.round2)((total / facts.production) * 100);
    const topRate = (0, calculation_kit_1.round2)((first.count / facts.production) * 100);
    const rankRationale = `불량품 총 ${total}개, 큰 순서: ${facts.ranked.map((entry) => `${entry.name} ${entry.count}개(${entry.share}%)`).join(', ')}`;
    const wrongLeft = facts.listed[0] !== first.name ? facts.listed[0] : second.name;
    const templates = (0, calculation_kit_1.compactTemplates)({
        top2: (0, calculation_kit_1.template)(`불량품 수 기준 상위 2개 항목의 누적 비율은 ${top2}%이다.`, `불량품 수 기준 상위 2개 항목의 누적 비율은 ${listedTop2 !== top2 ? listedTop2 : first.share + third.share}%이다.`, `${rankRationale} → (${first.count} + ${second.count}) ÷ ${total} × 100 = ${top2}%`),
        leftBar: (0, calculation_kit_1.template)(`불량 항목별 불량품 수를 파레토도로 나타내면 가장 왼쪽 막대는 '${first.name}'이다.`, `불량 항목별 불량품 수를 파레토도로 나타내면 가장 왼쪽 막대는 '${wrongLeft}'이다.`, `파레토도는 불량 수가 큰 항목부터 왼쪽에 놓으므로 가장 많은 항목인 ${first.name}(${first.count}개)의 막대가 맨 왼쪽에 온다`),
        rate: (0, calculation_kit_1.template)(`이 기간 생산품의 불량률은 ${(0, calculation_kit_1.num)(rate)}%이다.`, `이 기간 생산품의 불량률은 ${(0, calculation_kit_1.num)(topRate)}%이다.`, `불량률 = 불량품 수 ÷ 생산량 × 100 = ${total} ÷ ${facts.production.toLocaleString('ko-KR')} × 100 = ${(0, calculation_kit_1.num)(rate)}%`),
        ppm: (0, calculation_kit_1.template)(`이 기간 생산품의 불량률을 PPM으로 나타내면 ${(0, calculation_kit_1.num)(rate * 10_000)} PPM이다.`, `이 기간 생산품의 불량률을 PPM으로 나타내면 ${(0, calculation_kit_1.num)(rate * 1_000)} PPM이다.`, `${total} ÷ ${facts.production.toLocaleString('ko-KR')} × 1,000,000 = ${(0, calculation_kit_1.num)(rate * 10_000)} PPM`),
    });
    const numeric = [
        {
            id: 'top2',
            stem: `다음 ${facts.product} 불량 분석 자료에서 불량품 수 기준 상위 2개 항목의 누적 비율로 옳은 것은?`,
            correct: top2,
            mistakes: [
                { value: listedTop2, reason: '표에 적힌 순서대로 앞의 두 항목을 더한 값이다' },
                { value: first.share, reason: '가장 많은 항목 하나의 비율이다' },
                { value: first.share + second.share + third.share, reason: '상위 3개 항목의 누적 비율이다' },
                { value: 100 - top2, reason: '나머지 항목의 비율이다' },
            ],
            step: 5,
            min: 5,
            unit: '%',
            rationale: `${rankRationale} → (${first.count} + ${second.count}) ÷ ${total} × 100 = ${top2}%`,
        },
        {
            id: 'rate',
            stem: `다음 ${facts.product} 불량 분석 자료에서 이 기간 생산품의 불량률로 옳은 것은?`,
            correct: rate,
            mistakes: [
                { value: topRate, reason: '가장 많은 불량 항목만으로 구한 값이다' },
                { value: (0, calculation_kit_1.round2)(rate * 10), reason: '생산량을 한 자리 적게 나눈 값이다' },
            ],
            step: rate >= 1 ? 0.5 : 0.1,
            min: 0.1,
            unit: '%',
            rationale: `불량률 = ${total} ÷ ${facts.production.toLocaleString('ko-KR')} × 100 = ${(0, calculation_kit_1.num)(rate)}%`,
        },
    ];
    return {
        kind: 'pareto_defect',
        genre: '품질 관리 분석 보고서',
        context: `○○기업이 ${facts.product} 불량 원인을 항목별로 집계해 개선 우선순위를 정하려는 상황. 표와 [조건]에 없는 불량품 수·생산량을 새로 쓰지 마십시오. 품질 관리 도구의 이름은 제시문에 쓰지 마십시오.`,
        otherHint: '품질 관리 도구·기법(파레토도, 특성 요인도, 체크 시트, 관리도, SQC, 3정 5S, 데밍 사이클 등)을 제시문 단서와 연결',
        tables: [
            {
                title: '불량 항목별 불량품 수',
                headers: ['불량 항목', '불량품 수(개)'],
                rows: facts.listed.map((name) => [name, String(byName.get(name)?.count ?? 0)]),
            },
        ],
        conditions: [`이 기간의 생산량은 ${facts.production.toLocaleString('ko-KR')}개이다.`],
        templates,
        numeric,
        facts,
    };
}
