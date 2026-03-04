"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const genai_1 = require("@google/genai");
require('dotenv').config();
async function test() {
    const ai = new genai_1.GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const models = ['text-embedding-004', 'text-embedding-004', 'text-embedding-004', 'gemini-embedding-001', 'embedding-001', 'models/text-embedding-004'];
    for (const m of models) {
        try {
            const res = await ai.models.embedContent({
                model: m,
                contents: 'test',
            });
            console.log(`SUCCESS ${m}`);
            break;
        }
        catch (err) {
            console.log(`FAIL ${m}:`, err.message);
        }
    }
}
test();
//# sourceMappingURL=test_embed.js.map