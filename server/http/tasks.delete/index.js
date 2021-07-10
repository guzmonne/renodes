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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = __importDefault(require("@architect/functions"));
const withError_1 = require("../../shared/middleware/withError");
const tasks_1 = require("../../shared/repositories/tasks");
const handler = (req) => __awaiter(void 0, void 0, void 0, function* () {
    yield tasks_1.repository.delete(req.pathParameters.id);
    return;
});
exports.handler = functions_1.default.http.async(withError_1.withError(handler));
//# sourceMappingURL=index.js.map