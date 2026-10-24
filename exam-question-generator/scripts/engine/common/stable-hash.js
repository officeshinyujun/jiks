"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stableHash = stableHash;
/** FNV-1a 32비트 해시(16진 8자리). 결정론적 ID·지문용. */
function stableHash(value) {
    let hash = 0x811c9dc5;
    for (let index = 0; index < value.length; index += 1) {
        hash = Math.imul(hash ^ value.charCodeAt(index), 0x01000193);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
}
