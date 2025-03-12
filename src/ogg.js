import axios from "axios";
import ffmpeg from "fluent-ffmpeg";
import installer from "@ffmpeg-installer/ffmpeg";
import { createWriteStream } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { removeFile } from "./utils.js";

const _dirname = dirname(fileURLToPath(import.meta.url));

class OggConverter {
    constructor() {
        ffmpeg.setFfmpegPath(installer.path);
    }

    toMp3(input, output) {
        const outputPath = resolve(dirname(input), `${output}.mp3`);

        return new Promise((resolve, reject) => {
            ffmpeg(input)
                .inputOption("-t 30")
                .output(outputPath)
                .on("end", () => resolve(outputPath))
                .on("error", (err) => reject(err))
                .run();
        }).finally(() => {
            removeFile(input); // ✅ Теперь удаление файла происходит в любом случае
        });
    }

    async create(url, filename) {
        try {
            const oggPath = resolve(_dirname, "../voices/", `${filename}.ogg`);
            const response = await axios({
                method: "get",
                url,
                responseType: "stream",
            });

            return new Promise((resolve, reject) => {
                const stream = createWriteStream(oggPath);
                response.data.pipe(stream);
                stream.on("finish", () => resolve(oggPath));
                stream.on("error", (err) => reject(err)); // ✅ Теперь ошибки записи файла тоже обрабатываются
            });
        } catch (e) {
            console.log("I have error with method CREATE", e.message);
            throw e; // ✅ Добавляем выброс ошибки, чтобы она передавалась выше
        }
    }
}

export const ogg = new OggConverter();
