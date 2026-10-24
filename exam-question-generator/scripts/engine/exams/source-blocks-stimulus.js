"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SOURCE_BLOCKS_TPL = void 0;
exports.isSourceBlocksTpl = isSourceBlocksTpl;
exports.buildSourceBlocksStimulus = buildSourceBlocksStimulus;
exports.sanitizeSourceBlocksStimulus = sanitizeSourceBlocksStimulus;
exports.isSourceBlocksStimulusData = isSourceBlocksStimulusData;
/**
 * reference-pdf-v3 원문 블록을 그대로 보여 주는 렌더 전용 템플릿.
 * LLM 생성 경로(STRUCTURED_TPL_NAMES, JSON 스키마 enum)에는 절대 넣지 않는다.
 * 계약: artifacts/reference-corpus-v3/SOURCE_BLOCKS_CONTRACT.md
 */
exports.SOURCE_BLOCKS_TPL = 'TPL_SOURCE_BLOCKS';
const FIGURE_TOKEN_PATTERN = /\[그림\s*(F\d+)\]/gu;
// 그림 id는 객체 키로 쓰이므로 `__proto__` 같은 값이 들어오지 않게 제한한다.
const FIGURE_ID_PATTERN = /^[A-Za-z][A-Za-z0-9_-]{0,31}$/u;
function isSourceBlocksTpl(template) {
    return template === exports.SOURCE_BLOCKS_TPL;
}
/**
 * v3 source_payload(stimulusBlocks/figures/choiceTable) → TPL_SOURCE_BLOCKS stimulus_data.
 * stimulusBlocks가 없거나 계약을 만족하지 못하면 null (기존 문자열 어댑터 경로 유지).
 */
function buildSourceBlocksStimulus(payload) {
    if (!isRecord(payload))
        return null;
    const rawBlocks = payload.stimulusBlocks;
    if (!Array.isArray(rawBlocks) || rawBlocks.length === 0)
        return null;
    const figures = {};
    if (Array.isArray(payload.figures)) {
        for (const figure of payload.figures) {
            if (!isRecord(figure) || !isFigureId(figure.id))
                return null;
            figures[figure.id] = {
                src: httpsUrl(figure.url),
                alt: typeof figure.description === 'string' ? figure.description : '',
                kind: typeof figure.kind === 'string' ? figure.kind : '',
            };
        }
    }
    const blocks = rawBlocks.map((block) => {
        if (!isRecord(block))
            return null;
        switch (block.type) {
            case 'text':
                return { type: 'text', text: block.text };
            case 'table':
                return {
                    type: 'table',
                    title: block.title ?? null,
                    headers: block.headers ?? [],
                    rows: block.rows,
                    caption: block.caption ?? null,
                };
            case 'dialogue':
                return {
                    type: 'dialogue',
                    lines: Array.isArray(block.lines)
                        ? block.lines.map((line) => isRecord(line) ? { speaker: line.speaker, text: line.text } : null)
                        : block.lines,
                };
            case 'figure':
                return { type: 'figure', figure_id: block.figureId };
            default:
                return null;
        }
    });
    // figure 블록도 [그림 Fk] 토큰도 가리키지 않는 그림은 제시문 끝에 붙인다.
    const referenced = new Set();
    for (const block of blocks) {
        if (!isRecord(block))
            continue;
        if (block.type === 'figure' && typeof block.figure_id === 'string') {
            referenced.add(block.figure_id);
        }
        for (const match of JSON.stringify(block).matchAll(FIGURE_TOKEN_PATTERN)) {
            referenced.add(match[1]);
        }
    }
    // 그림 선지(`① [그림 F2]`)·<보기> 속 그림은 그 자리에서 렌더링되므로 제시문 끝에 중복으로 붙이지 않는다.
    for (const text of [payload.choices, payload.viewItems]) {
        for (const match of JSON.stringify(text ?? []).matchAll(FIGURE_TOKEN_PATTERN)) {
            referenced.add(match[1]);
        }
    }
    // 해설에서만 가리키는 그림(예: 정답 화면)은 제시문에 노출하면 답이 새므로 figures에서도 뺀다.
    const explanationOnly = new Set();
    for (const text of [payload.explanation, payload.generatedExplanation]) {
        for (const match of JSON.stringify(text ?? '').matchAll(FIGURE_TOKEN_PATTERN)) {
            if (!referenced.has(match[1]))
                explanationOnly.add(match[1]);
        }
    }
    for (const id of explanationOnly)
        delete figures[id];
    for (const id of Object.keys(figures)) {
        if (!referenced.has(id))
            blocks.push({ type: 'figure', figure_id: id });
    }
    const choiceTable = sanitizeChoiceTable(payload.choiceTable);
    return sanitizeSourceBlocksStimulus({
        blocks,
        figures,
        choice_table: choiceTable === undefined ? null : choiceTable,
    });
}
/**
 * 엄격한 검증 + 정리. 알려진 키만 복사하고, 하나라도 계약을 어기면 null.
 * 모든 값은 문자열이어야 하며 그림 src는 https URL 또는 null이다.
 */
function sanitizeSourceBlocksStimulus(value) {
    if (!isRecord(value))
        return null;
    if (!isRecord(value.figures))
        return null;
    const figures = {};
    for (const [id, figure] of Object.entries(value.figures)) {
        if (!isFigureId(id) || !isRecord(figure))
            return null;
        if (typeof figure.alt !== 'string' || typeof figure.kind !== 'string') {
            return null;
        }
        if (figure.src !== null && httpsUrl(figure.src) === null)
            return null;
        figures[id] = {
            src: figure.src === null ? null : figure.src,
            alt: figure.alt,
            kind: figure.kind,
        };
    }
    if (!Array.isArray(value.blocks) || value.blocks.length === 0)
        return null;
    const blocks = [];
    for (const block of value.blocks) {
        const sanitized = sanitizeBlock(block, figures);
        if (sanitized === null)
            return null;
        blocks.push(sanitized);
    }
    const choiceTable = value.choice_table === undefined || value.choice_table === null
        ? null
        : sanitizeChoiceTable(value.choice_table);
    if (choiceTable === undefined)
        return null;
    return { blocks, figures, choice_table: choiceTable };
}
function isSourceBlocksStimulusData(value) {
    return sanitizeSourceBlocksStimulus(value) !== null;
}
function sanitizeBlock(block, figures) {
    if (!isRecord(block))
        return null;
    switch (block.type) {
        case 'text':
            return nonEmptyString(block.text) ? { type: 'text', text: block.text } : null;
        case 'table': {
            const headers = stringMatrix(block.headers);
            const rows = stringMatrix(block.rows);
            if (headers === null ||
                rows === null ||
                rows.length === 0 ||
                !optionalString(block.title) ||
                !optionalString(block.caption)) {
                return null;
            }
            return {
                type: 'table',
                title: block.title ?? null,
                headers,
                rows,
                caption: block.caption ?? null,
            };
        }
        case 'dialogue': {
            if (!Array.isArray(block.lines) || block.lines.length === 0)
                return null;
            const lines = [];
            for (const line of block.lines) {
                if (!isRecord(line) ||
                    typeof line.speaker !== 'string' ||
                    !nonEmptyString(line.text)) {
                    return null;
                }
                lines.push({ speaker: line.speaker, text: line.text });
            }
            return { type: 'dialogue', lines };
        }
        case 'figure':
            return typeof block.figure_id === 'string' &&
                Object.prototype.hasOwnProperty.call(figures, block.figure_id)
                ? { type: 'figure', figure_id: block.figure_id }
                : null;
        default:
            return null;
    }
}
/** undefined = 형식 오류, null은 호출 측에서 따로 처리한다. */
function sanitizeChoiceTable(value) {
    if (value === undefined || value === null)
        return null;
    if (!isRecord(value))
        return undefined;
    const headers = stringArray(value.headers);
    const rows = stringMatrix(value.rows);
    if (headers === null ||
        headers.length === 0 ||
        rows === null ||
        rows.length !== 5 ||
        rows.some((row) => row.length !== headers.length)) {
        return undefined;
    }
    return { headers, rows };
}
function isFigureId(value) {
    return typeof value === 'string' && FIGURE_ID_PATTERN.test(value);
}
function httpsUrl(value) {
    if (typeof value !== 'string' || value.trim() !== value || value === '') {
        return null;
    }
    try {
        return new URL(value).protocol === 'https:' ? value : null;
    }
    catch {
        return null;
    }
}
function stringArray(value) {
    return Array.isArray(value) && value.every((cell) => typeof cell === 'string')
        ? [...value]
        : null;
}
function stringMatrix(value) {
    if (!Array.isArray(value))
        return null;
    const rows = [];
    for (const row of value) {
        const cells = stringArray(row);
        if (cells === null || cells.length === 0)
            return null;
        rows.push(cells);
    }
    return rows;
}
function optionalString(value) {
    return value === undefined || value === null || typeof value === 'string';
}
function nonEmptyString(value) {
    return typeof value === 'string' && value.trim() !== '';
}
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
