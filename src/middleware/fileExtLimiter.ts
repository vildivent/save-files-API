import path from "path";
import type { NextFunction, Request, Response } from "express";

const fileExtLimiter = (allowedExtArray: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const files = req.files;

    const fileExtentions: string[] = [];

    Object.keys(files!).forEach((key) => {
      const file = files![key];
      if (!(file instanceof Array)) {
        fileExtentions.push(path.extname(file.name));
      }
    });

    const allowed = fileExtentions.every((ext) =>
      allowedExtArray.includes(ext.toLowerCase())
    );

    if (!allowed) {
      const message =
        `Ошибка загрузки. Допускаются только файлы с расширениями: ${allowedExtArray.toString()}.`.replace(
          /(,)/g,
          ", "
        );

      return res.status(422).json({ status: "error", message });
    }

    next();
  };
};

export default fileExtLimiter;
