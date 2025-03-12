import OpenAI from "openai";
import { createReadStream } from "fs";

const openai = new OpenAI({
    apiKey: "ТВОЙ_OPENAI_KEY",
});

async function test() {
    try {
        const response = await openai.audio.transcriptions.create({
            file: createReadStream("путь_к_твоему_mp3"),
            model: "whisper-1",
        });
        console.log(response.text);
    } catch (e) {
        console.error("Ошибка OpenAI:", e.message);
        if (e.response) console.error("Ответ OpenAI:", e.response.data);
    }
}

test();
