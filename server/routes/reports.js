const express = require("express");
const path = require("path");
const fs = require("fs");
const Handlebars = require("handlebars");
const { initDb } = require("../db");

const router = express.Router();
const db = initDb();

function ensureReportsDir() {
  const base = process.env.REPORT_DIR || path.join(__dirname, "..", "..", "data", "reports");
  if (!fs.existsSync(base)) {
    fs.mkdirSync(base, { recursive: true });
  }
  return base;
}

function safeSplit(value) {
  if (!value) return [];
  return value.split("||").filter(Boolean);
}

function unique(arr) {
  return Array.from(new Set(arr));
}

function getPersonData(pedigreeId, externalId) {
  const person = db.prepare(`
    SELECT id, external_id, f_name, l_name, gender, dob, dod, life_status, evaluated, comments, generation
    FROM pedigree_import_person
    WHERE pedigree_id = ? AND external_id = ?
  `).get(pedigreeId, String(externalId));

  if (!person) return null;

  const disorders = db.prepare(`
    SELECT d.name AS value
    FROM pedigree_import_person_disorder ipd
    JOIN pedigree_import_disorder d ON d.id = ipd.disorder_id
    WHERE ipd.person_id = ?
  `).all(person.id).map(r => r.value);

  const hpo = db.prepare(`
    SELECT h.term AS value
    FROM pedigree_import_person_hpo_term iph
    JOIN pedigree_import_hpo_term h ON h.id = iph.hpo_id
    WHERE iph.person_id = ?
  `).all(person.id).map(r => r.value);

  const genes = db.prepare(`
    SELECT g.symbol AS value
    FROM pedigree_import_person_gene ipg
    JOIN pedigree_import_gene g ON g.id = ipg.gene_id
    WHERE ipg.person_id = ?
  `).all(person.id).map(r => r.value);

  const variations = db.prepare(`
    SELECT gene, c_change, p_change, g_change, zygosity, test_method, test_classification
    FROM pedigree_import_person_molecular_variation
    WHERE import_person_id = ? AND pedigree_id = ?
    ORDER BY id DESC
  `).all(person.id, pedigreeId).map(v => ({
    gene: v.gene || "",
    c_change: v.c_change || "",
    p_change: v.p_change || "",
    g_change: v.g_change || "",
    zygosity: v.zygosity || "",
    test_method: v.test_method || "",
    test_classification: v.test_classification || ""
  }));

  return {
    id: person.id,
    external_id: person.external_id,
    name: `${person.f_name || ""} ${person.l_name || ""}`.trim(),
    gender: person.gender,
    dob: person.dob,
    dod: person.dod,
    life_status: person.life_status,
    evaluated: person.evaluated,
    comments: person.comments,
    generation: person.generation,
    disorders: unique(disorders),
    hpo_terms: unique(hpo),
    genes: unique(genes),
    molecular_variations: variations
  };
}

function getPedigreePeople(pedigreeId) {
  const rows = db.prepare(`
    SELECT
      ip.id,
      ip.external_id,
      ip.f_name,
      ip.l_name,
      ip.gender,
      ip.dob,
      ip.dod,
      ip.life_status,
      ip.evaluated,
      ip.comments,
      ip.generation,
      GROUP_CONCAT(d.name, '||') AS disorders,
      GROUP_CONCAT(h.term, '||') AS hpo_terms,
      GROUP_CONCAT(g.symbol, '||') AS genes
    FROM pedigree_import_person ip
    LEFT JOIN pedigree_import_person_disorder ipd ON ipd.person_id = ip.id
    LEFT JOIN pedigree_import_disorder d ON d.id = ipd.disorder_id
    LEFT JOIN pedigree_import_person_hpo_term iph ON iph.person_id = ip.id
    LEFT JOIN pedigree_import_hpo_term h ON h.id = iph.hpo_id
    LEFT JOIN pedigree_import_person_gene ipg ON ipg.person_id = ip.id
    LEFT JOIN pedigree_import_gene g ON g.id = ipg.gene_id
    WHERE ip.pedigree_id = ?
    GROUP BY ip.id
    ORDER BY ip.generation, ip.external_id
  `).all(pedigreeId);

  return rows.map(r => ({
    id: r.id,
    external_id: r.external_id,
    name: `${r.f_name || ""} ${r.l_name || ""}`.trim(),
    gender: r.gender,
    dob: r.dob,
    life_status: r.life_status,
    evaluated: r.evaluated,
    comments: r.comments,
    generation: r.generation,
    disorders: unique(safeSplit(r.disorders)),
    hpo_terms: unique(safeSplit(r.hpo_terms)),
    genes: unique(safeSplit(r.genes))
  }));
}

function buildReportData(pedigreeId, personExternalId) {
  const person = getPersonData(pedigreeId, personExternalId);
  if (!person) return null;

  const pedigree = db
    .prepare("SELECT id, name, created_at, updated_at FROM pedigrees WHERE id = ?")
    .get(pedigreeId);

  const people = getPedigreePeople(pedigreeId);

  return {
    pedigree: {
      id: pedigree?.id,
      name: pedigree?.name,
      created_at: pedigree?.created_at,
      updated_at: pedigree?.updated_at,
      people
    },
    patient: person
  };
}

function renderTemplate(templateContent, data) {
  const compiled = Handlebars.compile(templateContent);
  return compiled(data);
}

router.get("/templates", (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT id, template_id, name, description, language, created_at, updated_at
      FROM report_templates
      WHERE user_id = ? OR is_system = 1
      ORDER BY created_at DESC
    `).all(req.user.id);
    return res.json({ success: true, templates: rows });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/templates/:id", (req, res) => {
  try {
    const id = req.params.id;
    const row = db.prepare(`
      SELECT id, template_id, name, description, language, content, created_at, updated_at
      FROM report_templates
      WHERE (id = ? OR template_id = ?) AND (user_id = ? OR is_system = 1)
    `).get(id, id, req.user.id);
    if (!row) return res.status(404).json({ success: false, error: "Template not found" });
    return res.json({ success: true, template: row });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/templates", (req, res) => {
  try {
    const { name, description, content, language = "pt-BR" } = req.body || {};
    if (!name || !content) {
      return res.status(400).json({ success: false, error: "name and content required" });
    }
    const templateId = `tpl_${Date.now()}`;
    db.prepare(`
      INSERT INTO report_templates (template_id, name, description, content, user_id, language)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(templateId, name, description || "", content, req.user.id, language);
    return res.json({ success: true, template_id: templateId });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.put("/templates/:id", (req, res) => {
  try {
    const { name, description, content, language = "pt-BR" } = req.body || {};
    const id = req.params.id;
    const template = db.prepare(`
      SELECT id FROM report_templates WHERE (id = ? OR template_id = ?) AND user_id = ?
    `).get(id, id, req.user.id);
    if (!template) return res.status(404).json({ success: false, error: "Template not found" });

    db.prepare(`
      UPDATE report_templates
      SET name = ?, description = ?, content = ?, language = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? OR template_id = ?
    `).run(name, description || "", content, language, id, id);
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.delete("/templates/:id", (req, res) => {
  try {
    const id = req.params.id;
    const template = db.prepare(`
      SELECT id FROM report_templates WHERE (id = ? OR template_id = ?) AND user_id = ?
    `).get(id, id, req.user.id);
    if (!template) return res.status(404).json({ success: false, error: "Template not found" });
    db.prepare("DELETE FROM report_templates WHERE id = ?").run(template.id);
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/preview", (req, res) => {
  try {
    const { templateId, content, pedigreeId, personExternalId } = req.body || {};
    const data = buildReportData(pedigreeId, personExternalId);
    if (!data) return res.status(404).json({ success: false, error: "Person not found" });

    let templateContent = content;
    if (!templateContent && templateId) {
      const row = db.prepare(`
        SELECT content FROM report_templates WHERE (id = ? OR template_id = ?) AND (user_id = ? OR is_system = 1)
      `).get(templateId, templateId, req.user.id);
      templateContent = row?.content || "";
    }

    if (!templateContent) {
      return res.status(400).json({ success: false, error: "Template content required" });
    }

    const html = renderTemplate(templateContent, data);
    return res.json({ success: true, html });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/generate", async (req, res) => {
  try {
    const { templateId, content, pedigreeId, personExternalId, format = "html" } = req.body || {};
    const data = buildReportData(pedigreeId, personExternalId);
    if (!data) return res.status(404).json({ success: false, error: "Person not found" });

    let templateContent = content;
    if (!templateContent && templateId) {
      const row = db.prepare(`
        SELECT content FROM report_templates WHERE (id = ? OR template_id = ?) AND (user_id = ? OR is_system = 1)
      `).get(templateId, templateId, req.user.id);
      templateContent = row?.content || "";
    }

    if (!templateContent) {
      return res.status(400).json({ success: false, error: "Template content required" });
    }

    const html = renderTemplate(templateContent, data);
    let filePath = null;

    if (format === "pdf") {
      const puppeteer = require("puppeteer");
      const reportsDir = ensureReportsDir();
      const safeName = `report_${pedigreeId}_${personExternalId}_${Date.now()}.pdf`;
      filePath = path.join(reportsDir, safeName);

      const browser = await puppeteer.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0" });
      await page.pdf({ path: filePath, format: "A4", printBackground: true });
      await browser.close();
    }

    const reportId = `rpt_${Date.now()}`;
    db.prepare(`
      INSERT INTO generated_reports (
        report_id, template_id, pedigree_id, person_external_id, title, content, status, format,
        metadata, file_path, user_id, generated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      reportId,
      templateId || "",
      pedigreeId,
      String(personExternalId),
      `Report ${reportId}`,
      html,
      "completed",
      format,
      JSON.stringify({}),
      filePath,
      req.user.id,
      req.user.email || ""
    );

    return res.json({ success: true, report_id: reportId, html, filePath });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/:reportId/pdf", (req, res) => {
  try {
    const reportId = req.params.reportId;
    const row = db.prepare(`
      SELECT file_path FROM generated_reports WHERE report_id = ? AND user_id = ?
    `).get(reportId, req.user.id);
    if (!row || !row.file_path || !fs.existsSync(row.file_path)) {
      return res.status(404).json({ error: "Report not found" });
    }
    res.setHeader("Content-Type", "application/pdf");
    return fs.createReadStream(row.file_path).pipe(res);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
