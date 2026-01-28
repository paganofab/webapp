const express = require("express");
const cors = require("cors");
const { initDb } = require("./db");
const { requireAuth } = require("./auth");
const authRoutes = require("./routes/auth");
const pedigreeRoutes = require("./routes/pedigrees");
const settingsRoutes = require("./routes/settings");
const reportsRoutes = require("./routes/reports");

const app = express();
const PORT = process.env.PORT || 8080;

initDb();

app.use(cors());
app.use(express.json({ limit: "25mb" }));

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRoutes);
app.use("/api/pedigrees", requireAuth, pedigreeRoutes);
app.use("/api/settings", requireAuth, settingsRoutes);
app.use("/api/reports", requireAuth, reportsRoutes);

app.listen(PORT, () => {
  console.log(`Pedigree API listening on :${PORT}`);
});
