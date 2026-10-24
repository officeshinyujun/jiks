"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GENERATIVE_STIMULUS_SHAPES = exports.GENERATIVE_RESPONSE_MODES = exports.GENERATIVE_VALIDATOR_VERSION = exports.GENERATIVE_PROMPT_VERSION = exports.GENERATIVE_SPEC_VERSION = void 0;
exports.GENERATIVE_SPEC_VERSION = 'generative-spec-v1';
exports.GENERATIVE_PROMPT_VERSION = 'generative-prompt-v1';
exports.GENERATIVE_VALIDATOR_VERSION = 'generative-validator-v1';
/** 실제 기출 응답 형식. sequence(순서 배열)는 0.3% 미만이라 생성하지 않는다. */
exports.GENERATIVE_RESPONSE_MODES = [
    'truth_combination',
    'statement',
    'short_label',
    'pair_table',
];
/** 그림을 뺀, 텍스트로 생성 가능한 제시문 블록 구성. */
exports.GENERATIVE_STIMULUS_SHAPES = [
    'text',
    'table+text',
    'table',
    'dialogue',
    'dialogue+text',
];
