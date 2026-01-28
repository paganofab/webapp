const express = require("express");
const { initDb } = require("../db");

const router = express.Router();
const db = initDb();

const PDF_SETTINGS_KEY = "pdf_settings";

const DEFAULT_PDF_SETTINGS = {
  privacyLevel: "all",
  pageSize: "A4",
  layout: "landscape",
  legendPosition: "TopRight",
  watermarkEnabled: false,
  watermarkText: "CONFIDENTIAL",
  watermarkOpacity: 30,
  watermarkPosition: "diagonal",
  watermarkSize: "medium",
};

router.get("/pdf", (req, res) => {
  try {
    const row = db
      .prepare("SELECT value FROM user_settings WHERE user_id = ? AND key = ?")
      .get(req.user.id, PDF_SETTINGS_KEY);

    if (!row || !row.value) {
      return res.json({ success: true, settings: DEFAULT_PDF_SETTINGS });
    }

    let settings = DEFAULT_PDF_SETTINGS;
    try {
      settings = { ...DEFAULT_PDF_SETTINGS, ...JSON.parse(row.value) };
    } catch {
      // fall back to defaults if stored JSON is invalid
    }

    return res.json({ success: true, settings });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/pdf", (req, res) => {
  try {
    const settings = req.body && req.body.settings ? req.body.settings : null;
    if (!settings || typeof settings !== "object") {
      return res.status(400).json({ success: false, error: "settings required" });
    }

    const value = JSON.stringify(settings);
    db.prepare(`
      INSERT INTO user_settings (user_id, key, value, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id, key) DO UPDATE SET
        value = excluded.value,
        updated_at = CURRENT_TIMESTAMP
    `).run(req.user.id, PDF_SETTINGS_KEY, value);

    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
