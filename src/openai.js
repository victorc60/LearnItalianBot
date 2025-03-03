import OpenAI from "openai";
import config from "config";
import { createReadStream } from "fs";

class OpenAIWrapper {
    constructor() {
        this.openai = new OpenAI({
            apiKey: config.get("OPENAI_KEY"),  // Убедись, что ты правильно передаешь API ключ
        });
    }

    async transcription(filepath) {
        try {
            console.log("📤 Отправляем файл на расшифровку:", filepath);
            
            // Передача токена в заголовке для аутентификации
            const response = await this.openai.audio.transcriptions.create({
                file: createReadStream(filepath),
                model: "whisper-1", // Используем правильный метод
            });

            console.log("✅ Успешный ответ от OpenAI:", response);
            return response.text;
        } catch (e) {
            console.error("❌ Ошибка транскрипции:", e.message);
            return null;
        }
    }
}

export const openai = new OpenAIWrapper();
