import { GoogleGenAI } from '@google/genai';
require('dotenv').config();

async function test() {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const models = ['text-embedding-004', 'text-embedding-004', 'text-embedding-004', 'gemini-embedding-001', 'embedding-001', 'models/text-embedding-004'];
    for (const m of models) {
        try {
            const res = await ai.models.embedContent({
                model: m,
                contents: 'test',
            });
            console.log(`SUCCESS ${m}`);
            break;
        } catch (err: any) {
            console.log(`FAIL ${m}:`, err.message);
        }
    }
}
test();
