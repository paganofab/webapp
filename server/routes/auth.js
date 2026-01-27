const express = require("express");
const { initDb } = require("../db");
const { signToken, signShortToken, hashPassword, verifyPassword } = require("../auth");

const router = express.Router();
const db = initDb();

router.post("/register", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "email and password required" });
  }

  const existing = db
    .prepare("SELECT id FROM users WHERE email = ?")
    .get(email);
  if (existing) {
    return res.status(409).json({ error: "Email already registered" });
  }

  const passwordHash = await hashPassword(password);
  const result = db
    .prepare("INSERT INTO users (email, password_hash) VALUES (?, ?)")
    .run(email, passwordHash);

  const user = { id: result.lastInsertRowid, email };
  const token = signToken(user);
  return res.json({ token, user });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "email and password required" });
  }

  const user = db
    .prepare("SELECT id, email, password_hash FROM users WHERE email = ?")
    .get(email);
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = signToken(user);
  return res.json({ token, user: { id: user.id, email: user.email } });
});

// Server-to-server: issue short-lived token for a known user id
router.post("/issue", async (req, res) => {
  const { userId, secret } = req.body || {};
  const expected = process.env.EDITOR_ISSUE_SECRET;

  if (!expected) {
    return res.status(500).json({ error: "EDITOR_ISSUE_SECRET not configured" });
  }
  if (!secret || secret !== expected) {
    return res.status(401).json({ error: "Invalid issue secret" });
  }
  if (!userId) {
    return res.status(400).json({ error: "userId required" });
  }

  const user = db
    .prepare("SELECT id, email FROM users WHERE id = ?")
    .get(userId);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const token = signShortToken(user);
  return res.json({ token, user: { id: user.id, email: user.email } });
});

// Simple token validation for clients
router.get("/me", (req, res) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : null;
    if (!token) {
      return res.status(401).json({ error: "Missing auth token" });
    }
    const jwt = require("jsonwebtoken");
    const payload = jwt.verify(token, process.env.JWT_SECRET || "dev-secret-change-me");
    return res.json({ user: { id: payload.sub, email: payload.email } });
  } catch (err) {
    return res.status(401).json({ error: "Invalid auth token" });
  }
});

module.exports = router;
