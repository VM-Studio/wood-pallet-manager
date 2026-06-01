"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseId = void 0;
/** Parsea un param de ruta Express (string | string[]) a number */
const parseId = (param) => parseInt(Array.isArray(param) ? param[0] : param, 10);
exports.parseId = parseId;
