"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.json = void 0;
/**
 * json is a middleware creator that returns an HttpHandler function that
 * returns json with the provided `statusCode`.
 */
const json = (statusCode = 200) => (req) => __awaiter(void 0, void 0, void 0, function* () {
    return {
        statusCode,
        json: req.json
    };
});
exports.json = json;
//# sourceMappingURL=json.js.map