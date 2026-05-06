import { NextFunction, Request, Response } from "express";
import { getAuth } from "firebase-admin/auth";

export const verifyToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const header = req.headers.authorization;
    const token = header && header.startsWith("Bearer ") ? header.slice(7) : undefined;
    const queryToken = typeof req.query.token === "string" ? (req.query.token as string) : undefined;
    const idToken = token || queryToken;

    if (!idToken) {
      return res.status(401).json({ status: "error", message: "Missing token" });
    }

    const decoded = await getAuth().verifyIdToken(idToken);
    (req as any).uid = decoded.uid;
    return next();
  } catch (error: any) {
    return res.status(401).json({ status: "error", message: error.message || "Unauthorized" });
  }
};
