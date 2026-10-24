"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TPL_SCHEMA_MAP = exports.STRUCTURED_TPL_NAMES = void 0;
exports.isStructuredTplName = isStructuredTplName;
exports.getTplSchema = getTplSchema;
const conversation_visual_aid_validator_1 = require("./conversation-visual-aid-validator");
exports.STRUCTURED_TPL_NAMES = [
    'TPL_ANNOUNCEMENT',
    'TPL_ARTICLE',
    'TPL_CASE_DIAGNOSTIC_FRAME',
    'TPL_COMPARATIVE_MATRIX',
    'TPL_CONVERSATIONAL_FLOW',
    'TPL_DIGITAL_FORUM_INTERFACE',
    'TPL_FORMAL_DOCUMENT',
    'TPL_INCIDENT_REPORT',
    'TPL_INSTRUCTIONAL_SCENE',
    'TPL_PROMOTIONAL_CANVAS',
    'TPL_QUANTITATIVE_CHART',
    'TPL_REPORT',
    'TPL_SEQUENTIAL_WORKFLOW',
    'TPL_STATISTICS',
];
function isStructuredTplName(template) {
    return (typeof template === 'string' &&
        exports.STRUCTURED_TPL_NAMES.includes(template));
}
function str() {
    return { type: 'string' };
}
function enumStr(values) {
    return { type: 'string', enum: values };
}
function integer(min, max) {
    const s = { type: 'integer' };
    if (min !== undefined)
        s.minimum = min;
    if (max !== undefined)
        s.maximum = max;
    return s;
}
function arr(items, min) {
    const s = { type: 'array', items };
    if (min !== undefined)
        s.minItems = min;
    return s;
}
function obj(properties, required, additionalProperties = false) {
    return {
        type: 'object',
        properties,
        required,
        additionalProperties,
    };
}
const comboBlockSchema = obj({
    title: str(),
    items: arr(obj({
        key: enumStr(['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ']),
        text: str(),
    }, ['key', 'text'])),
}, ['title', 'items']);
const metadataSchema = obj({
    unit_name: str(),
    target_concept: str(),
    item_type: str(),
    difficulty: enumStr([
        '하',
        '중',
        '상',
        '극상',
        'LOW',
        'MIDDLE',
        'HIGH',
        'SUPER',
        'INTERGRATE',
    ]),
    recommended_template: enumStr([...exports.STRUCTURED_TPL_NAMES]),
    point_value: integer(1, 3),
}, [
    'unit_name',
    'target_concept',
    'item_type',
    'difficulty',
    'recommended_template',
    'point_value',
]);
const explanationSchema = obj({
    judgment: str(),
    distractors: obj({
        '2': str(),
        '3': str(),
        '4': str(),
        '5': str(),
    }, ['2', '3', '4', '5']),
}, ['judgment', 'distractors']);
const baseRenderReady = {
    question_stem: str(),
    options_list: arr(str(), 5),
    combo_block: { ...comboBlockSchema },
};
function renderReady(extraProperties) {
    return obj({
        ...baseRenderReady,
        ...extraProperties,
    }, ['question_stem', 'options_list', 'combo_block', 'stimulus_data']);
}
const baseItem = {
    metadata: metadataSchema,
    correct_answer: integer(1, 5),
    explanation: explanationSchema,
};
function itemSchema(renderReadyProps) {
    return obj({
        ...baseItem,
        render_ready: renderReady(renderReadyProps),
    }, ['metadata', 'render_ready', 'correct_answer', 'explanation']);
}
const matrixStimulus = obj({
    headers: {
        ...arr(obj({ id: str(), label: str() }, ['id', 'label']), 1),
        description: '비교 기준이 되는 열(column) 목록. 예: ["근무 조건", "복지 혜택", "급여 수준"]',
    },
    rows: {
        ...arr(obj({
            id: { ...str(), description: '행 식별자' },
            cells: {
                ...arr(str(), 1),
                description: '각 열(header)에 대응하는 셀 값 배열',
            },
        }, ['id', 'cells']), 1),
        description: '비교 대상이 되는 행(row) 데이터. 각 행은 id와 cells(각 열의 실제 값)로 구성',
    },
    selection_chips: {
        ...arr(str()),
        description: '선택 가능한 답안 칩 목록. 문제에서 고를 수 있는 보기 항목들',
    },
}, ['headers', 'rows', 'selection_chips']);
const formalDocStimulus = obj({
    doc_type: {
        ...str(),
        description: '문서 유형 (예: "계약서", "증명서", "규정", "안내문")',
    },
    header_info: {
        ...obj({
            title: { ...str(), description: '문서 제목' },
            date: { ...str(), description: '문서 작성일' },
            author: { ...str(), description: '문서 작성자/발행처' },
        }, ['title', 'date', 'author']),
        description: '문서의 상단 정보 (제목, 날짜, 작성자)',
    },
    paragraphs: {
        ...arr(obj({
            sub_title: { ...str(), description: '문단 소제목' },
            content: { ...str(), description: '문단 본문 내용' },
        }, ['sub_title', 'content']), 1),
        description: '문서의 본문 문단 배열. 각 문단은 소제목과 내용으로 구성',
    },
    footnotes: { ...arr(str()), description: '문서 하단의 각주 목록' },
}, ['doc_type', 'header_info', 'paragraphs', 'footnotes']);
const convFlowStimulus = obj({
    participants: {
        ...arr(obj({
            id: { ...str(), description: '참여자 ID' },
            name: { ...str(), description: '참여자 이름' },
            role: {
                ...str(),
                description: '참여자 역할 (예: "사장", "직원", "고객")',
            },
            icon_key: {
                ...enumStr([...conversation_visual_aid_validator_1.CONVERSATION_ICON_KEYS]),
                description: '고정 역할 아이콘 키. 임의 아이콘명이나 URL을 사용하지 않는다.',
            },
        }, ['id', 'name', 'role', 'icon_key']), 1),
        description: '대화에 참여하는 사람들 목록',
    },
    messages: {
        ...arr(obj({
            p_id: {
                ...str(),
                description: '발화자 ID (participants의 id와 일치)',
            },
            text: { ...str(), description: '발화 내용' },
            timestamp: {
                ...str(),
                description: '발화 시점/순서 (예: "10:30", "1차")',
            },
        }, ['p_id', 'text', 'timestamp']), 1),
        description: '대화 내용을 순서대로 나열한 메시지 배열',
    },
    scene_kind: {
        ...enumStr([...conversation_visual_aid_validator_1.CONVERSATION_SCENE_KINDS]),
        description: '대화의 장소/상황 유형. 지문에 없는 장소를 추가하지 않는다.',
    },
    visual_aid: {
        ...obj({
            kind: {
                ...enumStr(['none', 'actor_flow']),
                description: 'none 또는 참여자 간 제한된 행위자 흐름',
            },
            actor_ids: {
                ...arr(str()),
                maxItems: 4,
                description: 'participants.id만 사용한 2~4명 행위자 목록',
            },
            relations: {
                ...arr(obj({
                    from_id: str(),
                    to_id: str(),
                    action_key: enumStr([...conversation_visual_aid_validator_1.CONVERSATION_ACTION_KEYS]),
                    evidence_message_indexes: arr(integer(0), 1),
                }, ['from_id', 'to_id', 'action_key', 'evidence_message_indexes'])),
                maxItems: 4,
                description: '지문의 발화로 근거를 확인할 수 있는 참여자 간 관계',
            },
        }, ['kind', 'actor_ids', 'relations']),
        description: '장식이 아닌 대화 근거 기반의 선택적 관계 시각 자료',
    },
}, ['participants', 'messages', 'scene_kind', 'visual_aid']);
const caseDiagStimulus = obj({
    case_profile: {
        ...obj({
            name: {
                ...str(),
                description: '사례 대상 이름 (예: "A씨", "㈜한국상사")',
            },
            context: { ...str(), description: '사례 대상의 배경/상황 설명' },
        }, ['name', 'context']),
        description: '사례의 대상(인물/기업) 프로필 정보. 단일 객체 또는 복수 사례를 위한 배열 가능',
    },
    narrative: {
        ...str(),
        description: '사례의 본문 스토리. 구체적인 사건, 상황, 배경을 서술형으로 작성',
    },
    check_items: {
        ...arr(obj({
            id: { ...str(), description: '체크 항목 ID' },
            label: { ...str(), description: '체크 항목 내용' },
            is_checked: {
                type: 'boolean',
                description: '해당 항목이 체크되었는지 여부',
            },
        }, ['id', 'label', 'is_checked'])),
        description: '진단/체크리스트 항목 배열. 각 항목은 체크 여부가 표시됨',
    },
}, ['case_profile', 'narrative', 'check_items']);
const seqWorkflowStimulus = obj({
    orientation: {
        type: 'string',
        enum: ['horizontal', 'vertical'],
        description: '단계 진행 방향 (가로/세로)',
    },
    steps: {
        ...arr(obj({
            idx: { ...integer(0), description: '단계 번호 (0부터 시작)' },
            label: {
                ...str(),
                description: '단계 제목/레이블 (예: 정보 수집, 대안 평가, 결정, 실행. "?"나 임의 문자 대신 실제 단계명 입력)',
            },
            desc: {
                ...str(),
                description: '단계 상세 설명 (원본 사례의 구체적 인물·사건 정보 포함. "학생 A는 OO했다"처럼 행위자와 행동을 명시. 일반론적 서술만 하지 말 것)',
            },
            is_missing: {
                type: 'boolean',
                description: '빈칸으로 제시할 단계인지 여부',
            },
        }, ['idx', 'label', 'desc', 'is_missing']), 1),
        description: '작업/과정의 각 단계를 순서대로 나열',
    },
}, ['orientation', 'steps']);
const instructionalSceneStimulus = obj({
    instructor: {
        ...obj({
            id: { ...str(), description: '강사 ID' },
            text: { ...str(), description: '강사 발화 내용' },
        }, ['id', 'text']),
        description: '수업을 진행하는 강사/교수자 정보와 발언',
    },
    canvas_content: {
        ...obj({
            type: {
                type: 'string',
                enum: ['text', 'table', 'image', 'mind_map', 'key_map'],
                description: '칠판/화면에 표시된 콘텐츠 유형',
            },
            data: { ...str(), description: '칠판/화면에 표시된 실제 내용' },
        }, ['type', 'data']),
        description: '칠판이나 화면에 제시된 수업 자료',
    },
    students: {
        ...arr(obj({
            id: { ...str(), description: '학생 ID' },
            text: { ...str(), description: '학생 발화/질문 내용' },
        }, ['id', 'text'])),
        description: '수업에 참여하는 학생들의 발언 목록',
    },
}, ['instructor', 'canvas_content', 'students']);
const forumStimulus = obj({
    forum_name: {
        ...str(),
        description: '게시판/포럼 이름 (예: "취업게시판", "노무상담")',
    },
    main_post: {
        ...obj({
            author: { ...str(), description: '게시글 작성자' },
            title: { ...str(), description: '게시글 제목' },
            content: { ...str(), description: '게시글 본문 내용' },
        }, ['author', 'title', 'content']),
        description: '포럼의 메인 게시글',
    },
    comments: {
        ...arr(obj({
            author: { ...str(), description: '댓글 작성자' },
            text: { ...str(), description: '댓글 내용' },
        }, ['author', 'text'])),
        description: '게시글에 달린 댓글 목록',
    },
}, ['forum_name', 'main_post', 'comments']);
const quantChartStimulus = obj({
    chart_type: {
        type: 'string',
        enum: ['radar', 'bar', 'line'],
        description: '차트 유형 (레이더/막대/꺾은선)',
    },
    axes: {
        ...arr(obj({
            key: { ...str(), description: '축 ID' },
            label: {
                ...str(),
                description: '축 레이블 (예: "근무환경", "급여")',
            },
            max: { ...integer(), description: '축 최댓값' },
        }, ['key', 'label', 'max']), 1),
        description: '차트의 축(axis) 정보 배열',
    },
    datasets: {
        ...arr(obj({
            label: {
                ...str(),
                description: '데이터 세트 이름 (예: "A기업", "B기업")',
            },
            values: {
                ...arr(integer()),
                description: '각 축에 대응하는 값 배열',
            },
        }, ['label', 'values']), 1),
        description: '차트에 표시되는 데이터 세트 배열',
    },
}, ['chart_type', 'axes', 'datasets']);
const promoCanvasStimulus = obj({
    slogan: {
        ...str(),
        description: '광고/홍보 문구의 슬로건 (핵심 한 줄 메시지)',
    },
    bullets: {
        ...arr(str(), 1),
        description: '홍보 내용의 핵심 포인트 불릿 목록',
    },
    visual_elements: {
        ...arr(str()),
        description: '광고에 포함된 시각적 요소 설명',
    },
    missing_part: {
        ...str(),
        description: '광고에서 의도적으로 비워둔/누락된 부분 설명',
    },
}, ['slogan', 'bullets', 'visual_elements', 'missing_part']);
const articleStimulus = obj({
    title: { ...str(), description: '기사/서사 제목' },
    body_paragraphs: {
        ...arr(str(), 1),
        description: '본문 문단 문자열 배열. 각 요소가 하나의 문단',
    },
}, ['title', 'body_paragraphs']);
const statisticsStimulus = obj({
    title: {
        ...str(),
        description: '통계 표제 (예: "2025년 산업별 취업자 수")',
    },
    source: { ...str(), description: '데이터 출처' },
    period: { ...str(), description: '조사 기간' },
    category_label: {
        ...str(),
        description: '항목 라벨 (예: "산업", "연령", "업종")',
    },
    value_label: {
        ...str(),
        description: '값 라벨 (예: "비율", "취업자 수", "매출액")',
    },
    unit: { ...str(), description: '값의 단위 (예: "%", "명", "억 원")' },
    data_entries: {
        ...arr(obj({
            category: { ...str(), description: '항목명' },
            value: { ...str(), description: '해당 항목의 값' },
            sub_entries: {
                ...arr(obj({
                    label: { ...str(), description: '하위 항목명' },
                    value: { ...str(), description: '하위 항목 값' },
                }, ['label', 'value'])),
                description: '중첩 하위 항목',
            },
        }, ['category', 'value', 'sub_entries']), 1),
        description: '데이터 항목 배열. 각 항목은 category와 value로 구성',
    },
    summary: { ...str(), description: '데이터에 대한 종합 해설/요약' },
}, [
    'title',
    'source',
    'period',
    'category_label',
    'value_label',
    'unit',
    'data_entries',
    'summary',
]);
const incidentReportStimulus = obj({
    title: { ...str(), description: '보고서 제목 (예: "화재 사고 보고서")' },
    incident_type: {
        ...str(),
        description: '사고 유형 (화재, 추락, 폭발, 누전, 붕괴 등)',
    },
    date: { ...str(), description: '발생 일시' },
    location: { ...str(), description: '발생 장소' },
    overview: { ...str(), description: '사고 개요. 무슨 일이 있었는지 요약' },
    cause: { ...str(), description: '발생 원인' },
    damage: { ...str(), description: '피해/결과 (인적, 물적 피해)' },
    response: { ...str(), description: '사고 후 대응 조치' },
    prevention: { ...str(), description: '예방 대책/재발 방지 방안' },
    timeline: {
        ...arr(obj({
            time: { ...str(), description: '시점' },
            event: { ...str(), description: '해당 시점의 사건' },
        }, ['time', 'event'])),
        description: '사고 진행 타임라인',
    },
}, [
    'title',
    'incident_type',
    'date',
    'location',
    'overview',
    'cause',
    'damage',
    'response',
    'prevention',
    'timeline',
]);
const announcementStimulus = obj({
    title: { ...str(), description: '공고/안내문 제목' },
    organizer: { ...str(), description: '주최/주관 기관' },
    schedule: {
        ...obj({
            start: { ...str(), description: '시작일' },
            end: { ...str(), description: '종료일' },
        }, ['start', 'end']),
        description: '행사/접수 일정',
    },
    location: { ...str(), description: '장소' },
    target: {
        ...str(),
        description: '대상 (예: "대졸 예정자", "경력 3년 이상")',
    },
    details: {
        ...arr(obj({
            label: {
                ...str(),
                description: '항목명 (예: "접수 방법", "제출 서류")',
            },
            content: { ...str(), description: '항목 내용' },
        }, ['label', 'content'])),
        description: '상세 안내 항목 배열',
    },
    contact: { ...str(), description: '문의처/연락처' },
}, [
    'title',
    'organizer',
    'schedule',
    'location',
    'target',
    'details',
    'contact',
]);
const reportStimulus = obj({
    title: { ...str(), description: '보고서 제목' },
    author: { ...str(), description: '작성자' },
    date: { ...str(), description: '작성일' },
    metadata: {
        ...arr(obj({
            label: {
                ...str(),
                description: '메타 정보 레이블 (예: "기업명", "생산품")',
            },
            value: { ...str(), description: '메타 정보 값' },
        }, ['label', 'value'])),
        description: '보고서 상단 메타 정보 배열',
    },
    sections: {
        ...arr(obj({
            heading: { ...str(), description: '섹션 제목' },
            content: { ...str(), description: '섹션 본문 설명' },
            table: {
                ...obj({
                    headers: { ...arr(str()), description: '표의 헤더 행' },
                    rows: {
                        ...arr(arr(str())),
                        description: '표의 데이터 행. 각 행은 헤더 순서와 일치하는 값 배열',
                    },
                }, ['headers', 'rows']),
                description: '섹션에 임베디드된 표',
            },
        }, ['heading', 'content', 'table']), 1),
        description: '보고서 본문 섹션 배열. 각 섹션은 heading, content, table로 구성',
    },
    conclusion: { ...str(), description: '보고서 결론/요약' },
}, ['title', 'author', 'date', 'metadata', 'sections', 'conclusion']);
exports.TPL_SCHEMA_MAP = {
    TPL_ANNOUNCEMENT: {
        name: 'announcement_item',
        strict: true,
        schema: itemSchema({ stimulus_data: announcementStimulus }),
    },
    TPL_ARTICLE: {
        name: 'article_item',
        strict: true,
        schema: itemSchema({ stimulus_data: articleStimulus }),
    },
    TPL_CASE_DIAGNOSTIC_FRAME: {
        name: 'case_diagnostic_frame_item',
        strict: true,
        schema: itemSchema({ stimulus_data: caseDiagStimulus }),
    },
    TPL_COMPARATIVE_MATRIX: {
        name: 'comparative_matrix_item',
        strict: true,
        schema: itemSchema({ stimulus_data: matrixStimulus }),
    },
    TPL_CONVERSATIONAL_FLOW: {
        name: 'conversational_flow_item',
        strict: true,
        schema: itemSchema({ stimulus_data: convFlowStimulus }),
    },
    TPL_DIGITAL_FORUM_INTERFACE: {
        name: 'digital_forum_interface_item',
        strict: true,
        schema: itemSchema({ stimulus_data: forumStimulus }),
    },
    TPL_FORMAL_DOCUMENT: {
        name: 'formal_document_item',
        strict: true,
        schema: itemSchema({ stimulus_data: formalDocStimulus }),
    },
    TPL_INCIDENT_REPORT: {
        name: 'incident_report_item',
        strict: true,
        schema: itemSchema({ stimulus_data: incidentReportStimulus }),
    },
    TPL_INSTRUCTIONAL_SCENE: {
        name: 'instructional_scene_item',
        strict: true,
        schema: itemSchema({ stimulus_data: instructionalSceneStimulus }),
    },
    TPL_PROMOTIONAL_CANVAS: {
        name: 'promotional_canvas_item',
        strict: true,
        schema: itemSchema({ stimulus_data: promoCanvasStimulus }),
    },
    TPL_QUANTITATIVE_CHART: {
        name: 'quantitative_chart_item',
        strict: true,
        schema: itemSchema({ stimulus_data: quantChartStimulus }),
    },
    TPL_REPORT: {
        name: 'report_item',
        strict: true,
        schema: itemSchema({ stimulus_data: reportStimulus }),
    },
    TPL_SEQUENTIAL_WORKFLOW: {
        name: 'sequential_workflow_item',
        strict: true,
        schema: itemSchema({ stimulus_data: seqWorkflowStimulus }),
    },
    TPL_STATISTICS: {
        name: 'statistics_item',
        strict: true,
        schema: itemSchema({ stimulus_data: statisticsStimulus }),
    },
};
function getTplSchema(template) {
    return exports.TPL_SCHEMA_MAP[template] ?? null;
}
