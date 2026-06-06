import jwt from "jsonwebtoken";
import { readData } from "./store.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

export function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: "12h" });
}

export function requireAdmin(req, res, next) {
  const header = req.headers.authorization || "";
  const [type, token] = header.split(" ");
  if (type !== "Bearer" || !token) return res.status(401).json({ error: "AUTH_REQUIRED" });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const data = readData();
    const user = data.adminUsers.find((item) => item.id === payload.sub);
    if (!user) return res.status(401).json({ error: "INVALID_TOKEN" });
    req.admin = { id: user.id, email: user.email, name: user.name };
    next();
  } catch {
    return res.status(401).json({ error: "INVALID_TOKEN" });
  }
}
