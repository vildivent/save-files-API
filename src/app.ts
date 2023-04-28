import express from "express";
import cors from "cors";
import fileUpload from "express-fileupload";
import path from "path";
import fs from "fs";
import { load } from "ts-dotenv";
import type { Request, Response } from "express";
import filesPayloadExists from "./middleware/filesPayloadExists";
import fileExtLimiter from "./middleware/fileExtLimiter";
import fileSizeLimiter from "./middleware/fileSizeLimiter";
import { promisify } from "util";
import sizeOf from "image-size";
const sizeOfAsync = promisify(sizeOf);

const env = load({
  PASSWORD: String,
  PORT: Number,
});

const PORT = env.PORT;
const password = env.PASSWORD;
const FILES_EXT = [".png", ".jpg", ".jpeg", ".webp"];
const allowedOrigins = [
  "https://skyarhyz.ru",
  /\.skyarhyz\.ru/,
  /\.vercel\.app/,
  "https://sky-arkhiz.vercel.app",
];

const options: cors.CorsOptions = {
  origin: "*",
  preflightContinue: true,
};

const app = express();
app.use(cors(options));
app.use(express.json());

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get(`/:project/:id`, (req, res) => {
  const filepath = path.join(
    __dirname,
    "files",
    req.params.project,
    req.params.id
  );

  if (fs.existsSync(filepath)) return res.sendFile(filepath);

  res.status(404).send("Ошибка: файл не найден!");
});

app.delete(`/:project/:id`, cors(options), (req, res) => {
  if (req.query.pass !== password)
    return res.status(401).send("Доступ запрещён!");

  const filepath = path.join(
    __dirname,
    "files",
    req.params.project,
    req.params.id
  );

  if (fs.existsSync(filepath)) {
    fs.rmSync(filepath);
    return res.status(200).send("Файл удалён!");
  }

  res.status(404).send("Ошибка: файл не найден!");
});

type savedFile = {
  name: string;
  type: string;
  width: number;
  height: number;
  aspectRatio: number;
  size: string;
};

app.post(
  `/:project`,
  cors(options),
  fileUpload({ createParentPath: true }),
  filesPayloadExists,
  fileExtLimiter(FILES_EXT),
  fileSizeLimiter,
  async (req: Request, res: Response) => {
    const files = req.files;
    const savedFiles: savedFile[] = [];

    for (const key of Object.keys(files!)) {
      const file = files![key];

      if (!(file instanceof Array)) {
        const date = new Date();
        const filename =
          key.split(".")[0] +
          "_" +
          date.toISOString().match(/[0-9]/g)!.join("") +
          path.extname(file.name).toLowerCase();
        const filepath = path.join(
          __dirname,
          "files",
          req.params.project,
          filename
        );

        await file.mv(filepath);

        try {
          const dimensions = await sizeOfAsync(filepath);
          if (
            !dimensions ||
            !dimensions.width ||
            !dimensions.height ||
            !dimensions.type
          )
            throw new Error("Can't get dimensions.");

          savedFiles.push({
            name: filename,
            type: dimensions.type,
            height: dimensions.height,
            width: dimensions.width,
            aspectRatio: dimensions.width / dimensions.height,
            size: `${String(file.size / 1024 / 1024)} MB`,
          });

          console.log(`File ${filename} saved successfully!`);
        } catch (error) {
          console.log(error);
          fs.rmSync(filepath);
          return res.status(400).json({
            status: "error",
            message:
              "Ошибка загрузки! Не удалось прочитать файл. Возможно, он повреждён - попробуйте загрузить другой файл.",
          });
        }
      }
    }

    return res.json({
      status: "success",
      message: `Сохранены файлы ${savedFiles
        .map((file) => file.name)
        .toString()}`.replace(/(,)/g, ", "),
      files: savedFiles,
    });
  }
);

app.listen(PORT, () =>
  console.log(`Application is running at http://localhost:${PORT}`)
);
