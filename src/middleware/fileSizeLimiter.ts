import type { NextFunction, Request, Response } from "express";

const MB = 10; // 5 MB
const FILE_SIZE_LIMIT = MB * 1024 * 1024;

const fileSizeLimiter = (req: Request, res: Response, next: NextFunction) => {
  const files = req.files;

  const filesOverLimit: string[] = [];

  Object.keys(files!).forEach((key) => {
    const file = files![key];
    if (!(file instanceof Array)) {
      if (file.size > FILE_SIZE_LIMIT) {
        filesOverLimit.push(key);
      }
    }
  });

  if (filesOverLimit.length) {
    const message =
      `Ошибка загрузки! Размер файла ${filesOverLimit.toString()} превосходит ${MB} MB`.replace(
        /(,)/g,
        ", "
      );

    return res.status(413).json({ status: "error", message });
  }

  next();
};

export default fileSizeLimiter;
