const express = require("express");
const path = require("path");
const fs = require("fs");
const { initDb } = require("../db");
const { performBackgroundPedigreeProcessing } = require("../pedigreeProcessing");
const { processPedigreeFromDatabaseById } = require("../../src/script/pedigree-decoder-import");

const router = express.Router();
const db = initDb();

function ensurePdfsDir() {
  const pdfDir = process.env.PDF_DIR || path.join(__dirname, "..", "..", "data", "pdfs");
  if (!fs.existsSync(pdfDir)) {
    fs.mkdirSync(pdfDir, { recursive: true });
  }
  return pdfDir;
}

router.get("/", (req, res) => {
  try {
    const rows = db
      .prepare(
        "SELECT id, name, created_at, updated_at FROM pedigrees WHERE user_id = ? ORDER BY updated_at DESC"
      )
      .all(req.user.id);
    return res.json({ success: true, pedigrees: rows });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/claim-legacy", (req, res) => {
  try {
    const result = db
      .prepare("UPDATE pedigrees SET user_id = ? WHERE user_id IS NULL")
      .run(req.user.id);
    return res.json({ success: true, claimed: result.changes });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/by-name/:name", (req, res) => {
  try {
    const row = db
      .prepare(
        "SELECT * FROM pedigrees WHERE name = ? AND user_id = ? ORDER BY updated_at DESC LIMIT 1"
      )
      .get(req.params.name, req.user.id);

    if (!row) {
      return res.status(404).json({ success: false, error: "Pedigree not found" });
    }

    return res.json({
      success: true,
      data: row.data,
      metadata: {
        id: row.id,
        name: row.name,
        created_at: row.created_at,
        updated_at: row.updated_at,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/:id", (req, res) => {
  try {
    const pedigreeId = Number(req.params.id);
    if (!pedigreeId) {
      return res.status(400).json({ success: false, error: "Invalid pedigree id" });
    }

    const row = db
      .prepare("SELECT * FROM pedigrees WHERE id = ? AND user_id = ?")
      .get(pedigreeId, req.user.id);

    if (!row) {
      return res.status(404).json({ success: false, error: "Pedigree not found" });
    }

    return res.json({
      success: true,
      data: row.data,
      metadata: {
        id: row.id,
        name: row.name,
        created_at: row.created_at,
        updated_at: row.updated_at,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const {
      name,
      data,
      saveAs = false,
      currentPedigreeName = null,
      isUpdatingExisting = false,
    } = req.body || {};

    if (!name || !data) {
      return res.status(400).json({ success: false, error: "name and data required" });
    }

    const dataString = typeof data === "string" ? data : JSON.stringify(data);

    const existingPedigree = db
      .prepare("SELECT id, created_at FROM pedigrees WHERE name = ? AND user_id = ?")
      .get(name, req.user.id);

    const isNewPedigree = !existingPedigree || saveAs;
    const isLegitimateUpdate =
      isUpdatingExisting === true || (currentPedigreeName === name && !saveAs);
    const shouldValidateName = saveAs || (existingPedigree && !isLegitimateUpdate);

    if (shouldValidateName && existingPedigree) {
      return res.status(409).json({
        success: false,
        error: `A pedigree named "${name}" already exists. Please choose a different name.`,
        code: "NAME_EXISTS",
        nameExists: true,
        existingId: existingPedigree.id,
        name,
      });
    }

    let pedigreeResult;
    if (existingPedigree) {
      const updateStmt = db.prepare(`
        UPDATE pedigrees 
        SET data = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE name = ? AND user_id = ?
      `);
      updateStmt.run(dataString, name, req.user.id);

      pedigreeResult = {
        success: true,
        id: existingPedigree.id,
        isUpdate: true,
        created_at: existingPedigree.created_at,
      };
    } else {
      const insertStmt = db.prepare(`
        INSERT INTO pedigrees (name, data, user_id, created_at, updated_at) 
        VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `);
      const result = insertStmt.run(name, dataString, req.user.id);

      pedigreeResult = {
        success: true,
        id: result.lastInsertRowid,
        isUpdate: false,
      };
    }

    setImmediate(() => {
      performBackgroundPedigreeProcessing(db, name, data, pedigreeResult.id);
    });

    return res.json(pedigreeResult);
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.delete("/by-name/:name", (req, res) => {
  try {
    const transaction = db.transaction(() => {
      const pedigree = db
        .prepare("SELECT id FROM pedigrees WHERE name = ? AND user_id = ?")
        .get(req.params.name, req.user.id);

      if (!pedigree) {
        throw new Error(`Pedigree "${req.params.name}" not found`);
      }

      const deleteFamiliesStmt = db.prepare(
        "DELETE FROM families WHERE pedigree_id = ?"
      );
      const familiesResult = deleteFamiliesStmt.run(pedigree.id);

      const deletePedigreeStmt = db.prepare(
        "DELETE FROM pedigrees WHERE id = ? AND user_id = ?"
      );
      const pedigreeResult = deletePedigreeStmt.run(pedigree.id, req.user.id);

      return {
        pedigreesDeleted: pedigreeResult.changes,
        familiesDeleted: familiesResult.changes,
        pedigreeId: pedigree.id,
      };
    });

    const result = transaction();
    return res.json({
      success: true,
      deleted: result.pedigreesDeleted > 0,
      details: result,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/:id/pdfs", (req, res) => {
  try {
    const pedigreeId = Number(req.params.id);
    const { fileName, pdfBase64 } = req.body || {};
    if (!pdfBase64 || !fileName) {
      return res.status(400).json({ error: "fileName and pdfBase64 required" });
    }

    const pedigree = db
      .prepare("SELECT id FROM pedigrees WHERE id = ? AND user_id = ?")
      .get(pedigreeId, req.user.id);
    if (!pedigree) {
      return res.status(404).json({ error: "Pedigree not found" });
    }

    const pdfDir = ensurePdfsDir();
    const safeName = fileName.replace(/[^a-zA-Z0-9_.-]/g, "-");
    const filePath = path.join(pdfDir, safeName);

    const buffer = Buffer.from(pdfBase64, "base64");
    fs.writeFileSync(filePath, buffer);

    const insertPdfStmt = db.prepare(`
      INSERT INTO pedigree_pdfs (family_id, pedigree_id, file_name, file_path, created_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    const result = insertPdfStmt.run(pedigreeId, pedigreeId, safeName, filePath);

    return res.json({
      success: true,
      pdfId: result.lastInsertRowid,
      fileName: safeName,
      filePath,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get("/:id/pdfs", (req, res) => {
  try {
    const pedigreeId = Number(req.params.id);
    const pedigree = db
      .prepare("SELECT id FROM pedigrees WHERE id = ? AND user_id = ?")
      .get(pedigreeId, req.user.id);
    if (!pedigree) {
      return res.status(404).json({ error: "Pedigree not found" });
    }

    const rows = db
      .prepare("SELECT * FROM pedigree_pdfs WHERE pedigree_id = ? ORDER BY created_at DESC")
      .all(pedigreeId);
    return res.json({ success: true, pdfs: rows });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/pdfs/:pdfId", (req, res) => {
  try {
    const pdfId = Number(req.params.pdfId);
    const row = db.prepare(`
      SELECT p.* FROM pedigree_pdfs p
      JOIN pedigrees ped ON ped.id = p.pedigree_id
      WHERE p.id = ? AND ped.user_id = ?
    `).get(pdfId, req.user.id);

    if (!row || !row.file_path || !fs.existsSync(row.file_path)) {
      return res.status(404).json({ error: "PDF not found" });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${row.file_name}"`);
    return fs.createReadStream(row.file_path).pipe(res);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post("/:id/variations", (req, res) => {
  try {
    const pedigreeId = Number(req.params.id);
    const { personId, variationData } = req.body || {};
    if (!pedigreeId || personId === undefined || !variationData) {
      return res.status(400).json({ error: "pedigreeId, personId, variationData required" });
    }

    const pedigree = db
      .prepare("SELECT id FROM pedigrees WHERE id = ? AND user_id = ?")
      .get(pedigreeId, req.user.id);
    if (!pedigree) {
      return res.status(404).json({ error: "Pedigree not found" });
    }

    const personIdStr = String(personId);
    const candidates = new Set([personIdStr]);
    if (!personIdStr.includes(".")) {
      candidates.add(`${personIdStr}.0`);
    }
    if (personIdStr.endsWith(".0")) {
      candidates.add(personIdStr.replace(/\.0$/, ""));
    }
    const candidateList = Array.from(candidates);

    const importPersonLookup = db.prepare(
      `SELECT id FROM pedigree_import_person
       WHERE pedigree_id = ?
         AND external_id IN (${candidateList.map(() => "?").join(",")})`
    );

    let importPerson = importPersonLookup.get(pedigreeId, ...candidateList);

    if (!importPerson) {
      // Attempt on-demand import if background processing hasn't created import persons yet
      processPedigreeFromDatabaseById(db, pedigreeId);
      importPerson = importPersonLookup.get(pedigreeId, ...candidateList);
    }

    if (!importPerson) {
      return res.status(400).json({ error: "Import person not found for node id" });
    }

    const insertStmt = db.prepare(`
      INSERT INTO pedigree_import_person_molecular_variation (
        pedigree_id, import_person_id, external_person_id, gene, transcript, exon_intron, exon_intron_position,
        g_change, c_change, p_change, zygosity, test_method, test_classification,
        clinvar_classification, var_id, rs, comments
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insertStmt.run(
      pedigreeId,
      importPerson.id,
      String(personId),
      variationData.gene || "",
      variationData.transcript || "",
      variationData.exon_intron || "",
      variationData.exon_intron_position || "",
      variationData.g_change || "",
      variationData.c_change || "",
      variationData.p_change || "",
      variationData.zygosity || "",
      variationData.test_method || "",
      variationData.test_classification || "",
      variationData.clinvar_classification || "",
      variationData.var_id || "",
      variationData.rs || "",
      variationData.comments || ""
    );

    return res.json({ success: true, id: result.lastInsertRowid });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/:id/variations", (req, res) => {
  try {
    const pedigreeId = Number(req.params.id);
    const personId = Number(req.query.personId);
    if (!pedigreeId || Number.isNaN(personId)) {
      return res.status(400).json({ error: "pedigreeId and personId required" });
    }

    const pedigree = db
      .prepare("SELECT id FROM pedigrees WHERE id = ? AND user_id = ?")
      .get(pedigreeId, req.user.id);
    if (!pedigree) {
      return res.status(404).json({ error: "Pedigree not found" });
    }

    const personIdStr = String(personId);
    const candidates = new Set([personIdStr]);
    if (!personIdStr.includes(".")) {
      candidates.add(`${personIdStr}.0`);
    }
    if (personIdStr.endsWith(".0")) {
      candidates.add(personIdStr.replace(/\.0$/, ""));
    }
    const candidateList = Array.from(candidates);

    const importPerson = db.prepare(
      `SELECT id FROM pedigree_import_person
       WHERE pedigree_id = ?
         AND external_id IN (${candidateList.map(() => "?").join(",")})`
    ).get(pedigreeId, ...candidateList);

    if (!importPerson) {
      return res.json({ success: true, variations: [] });
    }

    const rows = db.prepare(`
      SELECT *, external_person_id AS person_id
      FROM pedigree_import_person_molecular_variation
      WHERE pedigree_id = ? AND import_person_id = ?
      ORDER BY id DESC
    `).all(pedigreeId, importPerson.id);

    return res.json({ success: true, variations: rows });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/:id/variations-all", (req, res) => {
  try {
    const pedigreeId = Number(req.params.id);
    const pedigree = db
      .prepare("SELECT id FROM pedigrees WHERE id = ? AND user_id = ?")
      .get(pedigreeId, req.user.id);
    if (!pedigree) {
      return res.status(404).json({ error: "Pedigree not found" });
    }

    const rows = db.prepare(`
      SELECT id, external_person_id AS person_id, gene, transcript, exon_intron, exon_intron_position,
             g_change, c_change, p_change, zygosity, test_method, test_classification,
             clinvar_classification, var_id, rs, comments
      FROM pedigree_import_person_molecular_variation
      WHERE pedigree_id = ?
      ORDER BY person_id
    `).all(pedigreeId);

    return res.json({ success: true, variations: rows });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/:id/people", (req, res) => {
  try {
    const pedigreeId = Number(req.params.id);
    const pedigree = db
      .prepare("SELECT id FROM pedigrees WHERE id = ? AND user_id = ?")
      .get(pedigreeId, req.user.id);
    if (!pedigree) {
      return res.status(404).json({ error: "Pedigree not found" });
    }

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
        ip.position_x,
        GROUP_CONCAT(DISTINCT d.name) AS disorders,
        GROUP_CONCAT(DISTINCT h.term) AS hpo_terms,
        GROUP_CONCAT(DISTINCT g.symbol) AS genes,
        GROUP_CONCAT(DISTINCT
          TRIM(
            COALESCE(mv.gene, '') ||
            CASE WHEN mv.c_change IS NOT NULL AND mv.c_change <> '' THEN ' ' || mv.c_change ELSE '' END ||
            CASE WHEN mv.p_change IS NOT NULL AND mv.p_change <> '' THEN ' ' || mv.p_change ELSE '' END ||
            CASE WHEN mv.g_change IS NOT NULL AND mv.g_change <> '' THEN ' ' || mv.g_change ELSE '' END
          )
        ) AS molecular_variations
      FROM pedigree_import_person ip
      LEFT JOIN pedigree_import_person_disorder ipd ON ipd.person_id = ip.id
      LEFT JOIN pedigree_import_disorder d ON d.id = ipd.disorder_id
      LEFT JOIN pedigree_import_person_hpo_term iph ON iph.person_id = ip.id
      LEFT JOIN pedigree_import_hpo_term h ON h.id = iph.hpo_id
      LEFT JOIN pedigree_import_person_gene ipg ON ipg.person_id = ip.id
      LEFT JOIN pedigree_import_gene g ON g.id = ipg.gene_id
      LEFT JOIN pedigree_import_person_molecular_variation mv
        ON mv.import_person_id = ip.id AND mv.pedigree_id = ip.pedigree_id
      WHERE ip.pedigree_id = ?
      GROUP BY ip.id
      ORDER BY ip.generation, ip.external_id
    `).all(pedigreeId);

    return res.json({ success: true, people: rows });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.delete("/variations/:variationId", (req, res) => {
  try {
    const variationId = Number(req.params.variationId);
    if (!variationId) {
      return res.status(400).json({ error: "variationId required" });
    }

    // Ensure ownership via pedigree join
    const row = db.prepare(`
      SELECT v.id FROM pedigree_import_person_molecular_variation v
      JOIN pedigrees p ON p.id = v.pedigree_id
      WHERE v.id = ? AND p.user_id = ?
    `).get(variationId, req.user.id);

    if (!row) {
      return res.status(404).json({ error: "Variation not found" });
    }

    const result = db
      .prepare("DELETE FROM pedigree_import_person_molecular_variation WHERE id = ?")
      .run(variationId);

    return res.json({ success: result.changes > 0 });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/webform/:familyId", (req, res) => {
  try {
    const familyId = Number(req.params.familyId);
    const row = db.prepare(`
      SELECT w.* FROM webform_data w
      JOIN families f ON f.id = w.family_id
      JOIN pedigrees p ON p.id = f.pedigree_id
      WHERE w.family_id = ? AND p.user_id = ?
      ORDER BY w.imported_date DESC
      LIMIT 1
    `).get(familyId, req.user.id);

    if (!row) {
      return res.status(404).json({ success: false, error: "No webform data found" });
    }

    return res.json({
      success: true,
      fhirData: row.fhir_data,
      rawData: row.raw_data,
      sessionId: row.session_id,
      completionDate: row.completion_date,
      importedDate: row.imported_date,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
