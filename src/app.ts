import express from "express";
import cors from "cors";
import fileUpload from "express-fileupload";
import path from "path";
import fs from "fs";
import type { Request, Response } from "express";
import filesPayloadExists from "./middleware/filesPayloadExists";
import fileExtLimiter from "./middleware/fileExtLimiter";
import fileSizeLimiter from "./middleware/fileSizeLimiter";
import { promisify } from "util";
const sizeOf = promisify(require("image-size"));

const PORT = 3100;
const projectName = "skyarhyz";
const FILES_EXT = [".png", ".jpg", ".jpeg", ".webp"];
const allowedOrigins = [
  "https://skyarhyz.ru",
  /\.skyarhyz\.ru/,
  /\.vercel\.app/,
  "https://sky-arkhiz.vercel.app",
];

const options: cors.CorsOptions = {
  origin: allowedOrigins,
  preflightContinue: true,
};

const app = express();
app.use(cors(options));
app.use(express.json());

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get(`/${projectName}/:id`, (req, res) => {
  const filepath = path.join(__dirname, "files", projectName, req.params.id);

  if (fs.existsSync(filepath)) return res.sendFile(filepath);

  res.status(404).send("Error: file not found");
});

app.delete(`/${projectName}/:id`, cors(options), (req, res) => {
  const filepath = path.join(__dirname, "files", projectName, req.params.id);

  if (fs.existsSync(filepath)) {
    fs.rmSync(filepath);
    return res.status(200).send("Файл удалён!");
  }

  res.status(404).send("Error: file not found");
});

app.post(
  `/upload/${projectName}`,
  cors(options),
  fileUpload({ createParentPath: true }),
  filesPayloadExists,
  fileExtLimiter(FILES_EXT),
  fileSizeLimiter,
  async (req: Request, res: Response) => {
    const files = req.files;
    const savedFiles: string[] = [];
    const aspectRatio: number[] = [];

    for (const key of Object.keys(files!)) {
      const file = files![key];

      if (!(file instanceof Array)) {
        const date = new Date();
        const filename =
          key.split(".")[0] +
          "_" +
          date.toISOString().match(/[0-9]/g)!.join("") +
          path.extname(file.name).toLowerCase();
        const filepath = path.join(__dirname, "files", projectName, filename);

        await file.mv(filepath);
        savedFiles.push(filename);

        try {
          const dimensions = await sizeOf(filepath);

          aspectRatio.push(dimensions.width / dimensions.height);
          console.log(
            `File seved with params: {name:${filename}, width:${dimensions.width}, height:${dimensions.height}}`
          );
        } catch (error) {
          console.log(error);
          fs.rmSync(filepath);
          return res.status(400).json({
            status: "error",
            message:
              "Ошибка загрузки! Файл повреждён, попробуйте изменить его представление цвета на RGB, или попробуйте загрузить другой файл.",
          });
        }
      }
    }

    return res.json({
      status: "success",
      message: `Сохранены файлы ${savedFiles.toString()}`.replace(/(,)/g, ", "),
      filenames: savedFiles,
      aspectRatio,
    });
  }
);

app.listen(PORT, () =>
  console.log(`Application is running at http://localhost:${PORT}`)
);
