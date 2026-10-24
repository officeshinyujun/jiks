"use strict";
/**
 * 공업 일반 7·10단원 부품 재고 계산과 10단원 ABC 등급 계산.
 *
 * 부품 재고(기출 2022 수능 19번, 2025 6월 8번, 수능특강 7단원): 단가·제품당 소요량·보유 재고량 표 →
 * 제품 1개 부품 비용, 재고로 만들 수 있는 최대 수량(부품별 재고 ÷ 소요량의 최솟값), 일일 생산 시 주문 시점.
 * ABC 등급(기출 2022 6월 18번): 전체 부품 가짓수 × 등급 비율, 주문 주기로 1년 주문 금액.
 * 대표 오답: 소요량을 곱하지 않음, 재고량 최솟값을 그대로 씀, 주문 주기를 곱함, 다른 등급 비율.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePartsFacts = generatePartsFacts;
exports.reorderDay = reorderDay;
exports.partsScenario = partsScenario;
exports.generateAbcFacts = generateAbcFacts;
exports.abcScenario = abcScenario;
const calculation_kit_1 = require("./calculation-kit");
const PART_PRODUCTS = [
    {
        name: '캠핑 의자',
        parts: [
            { name: '받침대 프레임', prices: [3_000, 2_500], quantities: [2] },
            { name: '받침대 천', prices: [1_000, 1_500], quantities: [1] },
            { name: '등받이 프레임', prices: [2_000, 2_500], quantities: [1] },
            { name: '팔걸이 프레임', prices: [1_500, 1_000], quantities: [2] },
        ],
    },
    {
        name: '가정용 드론',
        parts: [
            { name: '비행 몸체', prices: [1_000, 2_000], quantities: [1] },
            { name: '프로펠러', prices: [500, 400], quantities: [4] },
            { name: '바퀴', prices: [200, 300], quantities: [2] },
            { name: '배터리', prices: [3_000, 2_500], quantities: [1] },
        ],
    },
    {
        name: '원목 의자',
        parts: [
            { name: '다리', prices: [1_500, 2_000], quantities: [4] },
            { name: '좌판', prices: [3_000, 2_000], quantities: [1] },
            { name: '등받이', prices: [2_000, 2_500], quantities: [1] },
            { name: '볼트 세트', prices: [500, 300], quantities: [2] },
        ],
    },
    {
        name: '전동 킥보드',
        parts: [
            { name: '발판 프레임', prices: [5_000, 4_000], quantities: [1] },
            { name: '바퀴', prices: [1_500, 2_000], quantities: [2] },
            { name: '핸들', prices: [2_000, 3_000], quantities: [1] },
            { name: '브레이크 패드', prices: [500, 600], quantities: [2] },
        ],
    },
    {
        name: '책상용 스탠드',
        parts: [
            { name: '받침대', prices: [2_000, 1_500], quantities: [1] },
            { name: '연결 관절', prices: [800, 600], quantities: [3] },
            { name: 'LED 모듈', prices: [3_000, 2_500], quantities: [1] },
            { name: '나사', prices: [100, 200], quantities: [6] },
        ],
    },
];
function generatePartsFacts(rng) {
    const product = (0, calculation_kit_1.pick)(PART_PRODUCTS, rng);
    const maxCount = (0, calculation_kit_1.pick)([16, 20, 25, 30, 40, 50, 60, 80, 120, 150, 200, 320], rng);
    // 소요량이 2개 이상인 부품이 병목이어야 "소요량을 빼먹은" 오답이 정답과 갈린다.
    const multi = product.parts.filter((part) => Math.max(...part.quantities) >= 2);
    const bottleneck = (0, calculation_kit_1.pick)(multi, rng).name;
    const usedExtras = new Set();
    const parts = product.parts.map((part) => {
        const quantity = (0, calculation_kit_1.pick)(part.quantities, rng);
        let extra = 0;
        if (part.name !== bottleneck) {
            do {
                extra = (0, calculation_kit_1.randInt)(Math.max(3, Math.round(maxCount * 0.1)), Math.max(8, Math.round(maxCount * 0.8)), rng);
            } while (usedExtras.has(extra));
            usedExtras.add(extra);
        }
        const remainder = quantity > 1 ? (0, calculation_kit_1.randInt)(0, quantity - 1, rng) : 0;
        return { name: part.name, price: (0, calculation_kit_1.pick)(part.prices, rng), quantity, stock: (maxCount + extra) * quantity + remainder };
    });
    const daily = (0, calculation_kit_1.pick)([5, 10, 20, 50].filter((value) => maxCount / value >= 2.5 && maxCount / value <= 12), rng) ?? 10;
    const watchedPart = parts.find((part) => part.name === bottleneck) ?? parts[0];
    const reorderPoint = (0, calculation_kit_1.pick)([10, 20, 30, 50].filter((value) => value < watchedPart.stock - 2 * daily * watchedPart.quantity), rng) ?? 10;
    return {
        product: product.name,
        parts,
        bottleneck,
        maxCount,
        dailyProduction: daily,
        reorderPoint,
        watched: watchedPart.name,
    };
}
/** 생산 종료 시점 재고가 주문 기준 이하가 되는 첫날(소요량을 곱하지 않은 잘못된 계산도 같은 식) */
function reorderDay(stock, perDay, reorderPoint) {
    let day = 1;
    while (stock - day * perDay > reorderPoint)
        day += 1;
    return day;
}
function partsScenario(rng) {
    const facts = generatePartsFacts(rng);
    const unitCost = facts.parts.reduce((total, part) => total + part.price * part.quantity, 0);
    const priceSum = facts.parts.reduce((total, part) => total + part.price, 0);
    const counts = facts.parts.map((part) => ({ part, count: Math.floor(part.stock / part.quantity) }));
    const minStock = Math.min(...facts.parts.map((part) => part.stock));
    const nonBottleneck = counts.filter((entry) => entry.part.name !== facts.bottleneck);
    const secondCount = Math.min(...nonBottleneck.map((entry) => entry.count));
    const watched = facts.parts.find((part) => part.name === facts.watched) ?? facts.parts[0];
    const day = reorderDay(watched.stock, facts.dailyProduction * watched.quantity, facts.reorderPoint);
    const naiveDay = reorderDay(watched.stock, facts.dailyProduction, facts.reorderPoint);
    const countRationale = `${counts.map((entry) => `${entry.part.name} ${entry.part.stock} ÷ ${entry.part.quantity} = ${entry.count}개`).join(', ')} 중 최솟값 ${facts.maxCount}개`;
    const costRationale = `${facts.parts.map((part) => `${part.name} ${(0, calculation_kit_1.won)(part.price)} × ${part.quantity}`).join(' + ')} = ${(0, calculation_kit_1.won)(unitCost)}`;
    const dayRationale = `${(0, calculation_kit_1.josa)(watched.name, '은/는')} 하루 ${facts.dailyProduction}개 × ${watched.quantity} = ${facts.dailyProduction * watched.quantity}개씩 줄어 ${day}일째 생산 종료 시점에 ${watched.stock - day * facts.dailyProduction * watched.quantity}개가 되어 처음으로 ${facts.reorderPoint}개 이하가 된다`;
    const templates = (0, calculation_kit_1.compactTemplates)({
        unitCost: (0, calculation_kit_1.template)(`${facts.product} 1개를 만드는 데 필요한 부품 비용은 ${(0, calculation_kit_1.won)(unitCost)}이다.`, `${facts.product} 1개를 만드는 데 필요한 부품 비용은 ${(0, calculation_kit_1.won)(priceSum)}이다.`, `제품당 소요량을 곱해 더한다: ${costRationale}`),
        maxCount: (0, calculation_kit_1.template)(`현재 보유 재고량으로 만들 수 있는 ${(0, calculation_kit_1.josa)(facts.product, '은/는')} 최대 ${facts.maxCount}개이다.`, `현재 보유 재고량으로 만들 수 있는 ${(0, calculation_kit_1.josa)(facts.product, '은/는')} 최대 ${minStock !== facts.maxCount ? minStock : secondCount}개이다.`, countRationale),
        totalCost: (0, calculation_kit_1.template)(`현재 보유 재고량으로 만들 수 있는 최대 수량을 생산할 때 드는 부품 비용은 ${(0, calculation_kit_1.won)(unitCost * facts.maxCount)}이다.`, `현재 보유 재고량으로 만들 수 있는 최대 수량을 생산할 때 드는 부품 비용은 ${(0, calculation_kit_1.won)(priceSum * facts.maxCount)}이다.`, `${countRationale}, 1개당 ${(0, calculation_kit_1.won)(unitCost)}이므로 ${(0, calculation_kit_1.won)(unitCost)} × ${facts.maxCount} = ${(0, calculation_kit_1.won)(unitCost * facts.maxCount)}`),
        reorder: (0, calculation_kit_1.template)(`${(0, calculation_kit_1.josa)(watched.name, '은/는')} 생산 시작 후 ${day}일째 생산 종료 시점에 주문해야 한다.`, `${(0, calculation_kit_1.josa)(watched.name, '은/는')} 생산 시작 후 ${naiveDay !== day ? naiveDay : day + 1}일째 생산 종료 시점에 주문해야 한다.`, dayRationale),
    });
    const stemOf = (question) => `다음 ${facts.product} 생산 계획에서 ${(0, calculation_kit_1.josa)(question, '으로/로')} 옳은 것은?`;
    const numeric = [
        {
            id: 'maxCount',
            stem: stemOf('현재 보유 재고량으로 만들 수 있는 제품의 최대 수량'),
            correct: facts.maxCount,
            mistakes: [
                { value: minStock, reason: '제품당 소요량을 나누지 않고 가장 적은 재고량을 그대로 쓴 값이다' },
                { value: secondCount, reason: `병목 부품(${facts.bottleneck})을 빠뜨리고 구한 값이다` },
            ],
            step: Math.max(1, Math.round(facts.maxCount / 10)),
            min: 1,
            unit: '개',
            rationale: countRationale,
        },
        {
            id: 'unitCost',
            stem: stemOf('제품 1개를 만드는 데 필요한 부품 비용'),
            correct: unitCost,
            mistakes: [{ value: priceSum, reason: '제품당 소요량을 곱하지 않고 단가만 더한 값이다' }],
            step: 500,
            min: 500,
            unit: '원',
            rationale: costRationale,
        },
    ];
    return {
        kind: 'parts_stock',
        genre: '제품 생산 계획서',
        context: `○○기업이 ${facts.product} 생산 계획을 세우며 부품 재고를 점검하는 상황. 표와 [조건]에 없는 단가·소요량·재고량·생산량을 새로 쓰지 마십시오.`,
        otherHint: '재고·자재 관리 개념(안전 재고, 정량·정기 발주 모형, ABC 재고 관리, MRP, 구매 방식 등)을 제시문 단서와 연결',
        tables: [
            {
                title: '부품 재고 현황',
                headers: ['부품명', '단가', '제품 1개당 소요량', '보유 재고량'],
                rows: facts.parts.map((part) => [part.name, (0, calculation_kit_1.won)(part.price), `${part.quantity}개`, `${part.stock}개`]),
            },
        ],
        conditions: [
            `${(0, calculation_kit_1.josa)(facts.product, '을/를')} 매일 ${facts.dailyProduction}개씩 생산함.`,
            `부품은 생산 종료 시점의 보유 재고량이 ${facts.reorderPoint}개 이하가 되면 즉시 주문하며, 주문한 부품은 다음 생산일 생산 시작 직전에 입고됨.`,
        ],
        templates,
        numeric,
        facts,
    };
}
const ABC_PRODUCTS = [
    { name: '공기 청정기', featured: ['흡입 모터', '제어 기판'] },
    { name: '전기 자전거', featured: ['구동 모터', '배터리 팩'] },
    { name: '로봇 청소기', featured: ['라이다 센서', '구동 모터'] },
    { name: '산업용 펌프', featured: ['임펠러', '모터 축'] },
];
function generateAbcFacts(rng) {
    for (let attempt = 0; attempt < 200; attempt += 1) {
        const totalParts = (0, calculation_kit_1.pick)([40, 60, 80, 100, 120, 200], rng);
        const shareA = (0, calculation_kit_1.pick)([10, 15, 20], rng);
        const shareB = (0, calculation_kit_1.pick)([25, 30, 35], rng);
        const shares = { A: shareA, B: shareB, C: 100 - shareA - shareB };
        if (Object.values(shares).some((share) => (totalParts * share) % 100 !== 0))
            continue;
        const product = (0, calculation_kit_1.pick)(ABC_PRODUCTS, rng);
        return {
            product: product.name,
            totalParts,
            shares,
            cycles: { A: (0, calculation_kit_1.pick)([1, 2], rng), B: 3, C: (0, calculation_kit_1.pick)([4, 6], rng) },
            prices: { A: (0, calculation_kit_1.pick)([20, 30], rng), B: (0, calculation_kit_1.pick)([5, 10], rng), C: (0, calculation_kit_1.pick)([1, 2], rng) },
            featured: (0, calculation_kit_1.pick)(product.featured, rng),
            orderQuantity: (0, calculation_kit_1.pick)([50, 100, 200], rng),
        };
    }
    throw new Error('abc facts generation failed');
}
function abcScenario(rng) {
    const facts = generateAbcFacts(rng);
    const count = (grade) => (facts.totalParts * facts.shares[grade]) / 100;
    const ordersPerYear = 12 / facts.cycles.A;
    const annual = ordersPerYear * facts.orderQuantity * facts.prices.A;
    const wrongAnnual = facts.cycles.A === 1 ? 6 * facts.orderQuantity * facts.prices.A : 12 * facts.orderQuantity * facts.prices.A;
    const gradeOrder = (0, calculation_kit_1.shuffle)(['A', 'C'], rng);
    const askGrade = (0, calculation_kit_1.pick)(['B', gradeOrder[0]], rng);
    const cycleOf = facts.cycles[askGrade];
    const wrongGrade = askGrade === 'B' ? gradeOrder[0] : 'B';
    const diff = count('C') - count('A');
    const annualRationale = `${(0, calculation_kit_1.josa)(facts.featured, '은/는')} A 등급으로 주문 주기가 ${facts.cycles.A}개월이므로 1년에 ${ordersPerYear}회, 1회 ${facts.orderQuantity}개 × ${(0, calculation_kit_1.manwon)(facts.prices.A)} → ${ordersPerYear} × ${facts.orderQuantity} × ${(0, calculation_kit_1.manwon)(facts.prices.A)} = ${(0, calculation_kit_1.manwon)(annual)}`;
    const templates = (0, calculation_kit_1.compactTemplates)({
        countByCycle: (0, calculation_kit_1.template)(`주문 주기가 ${cycleOf}개월인 부품은 ${count(askGrade)}가지이다.`, `주문 주기가 ${cycleOf}개월인 부품은 ${count(wrongGrade) !== count(askGrade) ? count(wrongGrade) : facts.shares[askGrade]}가지이다.`, `주문 주기 ${cycleOf}개월은 ${askGrade} 등급이므로 전체 ${facts.totalParts}가지 × ${facts.shares[askGrade]}% = ${count(askGrade)}가지`),
        annualAmount: (0, calculation_kit_1.template)(`1년 동안 주문하는 ${facts.featured}의 총금액은 ${(0, calculation_kit_1.manwon)(annual)}이다.`, `1년 동안 주문하는 ${facts.featured}의 총금액은 ${(0, calculation_kit_1.manwon)(wrongAnnual)}이다.`, annualRationale),
        gradeGap: (0, calculation_kit_1.template)(`C 등급 부품은 A 등급 부품보다 ${diff}가지 많다.`, `C 등급 부품은 A 등급 부품보다 ${facts.shares.C - facts.shares.A !== diff ? facts.shares.C - facts.shares.A : diff + 10}가지 많다.`, `C 등급 ${facts.totalParts} × ${facts.shares.C}% = ${count('C')}가지, A 등급 ${facts.totalParts} × ${facts.shares.A}% = ${count('A')}가지 → ${diff}가지 차이`),
    });
    const numeric = [
        {
            id: 'annualAmount',
            stem: `다음 ○○기업의 재고 관리 현황에서 1년 동안 주문하는 ${facts.featured}의 총금액으로 옳은 것은?`,
            correct: annual,
            mistakes: [
                { value: wrongAnnual, reason: '주문 주기를 반영하지 않고 1년 주문 횟수를 잘못 센 값이다' },
                { value: facts.orderQuantity * facts.prices.A, reason: '1회 주문 금액이다' },
                { value: facts.cycles.A * facts.orderQuantity * facts.prices.A, reason: '주문 주기(개월)를 곱한 값이다' },
            ],
            step: facts.orderQuantity * facts.prices.A,
            min: 1,
            unit: '만 원',
            rationale: annualRationale,
        },
    ];
    return {
        kind: 'abc_inventory',
        genre: '재고 관리 현황 분석 자료',
        context: `○○기업이 ${(0, calculation_kit_1.josa)(facts.product, '을/를')} 구성하는 전체 부품을 등급으로 나누어 재고를 관리하는 상황. 표와 [조건]에 없는 비율·단가·주기·수량을 새로 쓰지 마십시오. 등급 분류 기법의 이름은 쓰지 마십시오.`,
        otherHint: '재고 관리 개념(안전 재고, 정기·정량 발주 모형, ABC 재고 관리의 등급별 관리 방식, 파레토도 등)을 제시문 단서와 연결',
        tables: [
            {
                title: '등급별 부품 현황',
                headers: ['구분', '부품 가짓수 비율', '평균 단가', '주문 주기'],
                rows: ['A', 'B', 'C'].map((grade) => [
                    `${grade} 등급`,
                    `${facts.shares[grade]}%`,
                    (0, calculation_kit_1.manwon)(facts.prices[grade]),
                    `${facts.cycles[grade]}개월`,
                ]),
            },
        ],
        conditions: [
            `${(0, calculation_kit_1.josa)(facts.product, '을/를')} 구성하는 부품은 총 ${facts.totalParts}가지이며, 모든 부품은 A, B, C 등급 중 하나에만 속함.`,
            `A 등급 부품인 ${(0, calculation_kit_1.josa)(facts.featured, '은/는')} 단가가 A 등급 평균 단가와 같고, 주문 주기마다 1회 ${facts.orderQuantity}개씩 주문함.`,
        ],
        templates,
        numeric,
        facts,
    };
}
