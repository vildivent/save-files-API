import type { NextFunction, Request, Response } from "express";

const filesPayloadExists = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.files) {
    console.log("Отсутствуют файлы");
    return res
      .status(400)
      .json({ status: "error", message: "Отсутствуют файлы" });
  }

  next();
};

export default filesPayloadExists;
