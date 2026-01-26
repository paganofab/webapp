const path = require("path");

const { processPedigreeFromDatabase } = require(path.join(
  __dirname,
  "..",
  "src",
  "script",
  "pedigree-decoder-import"
));

async function processPedigreeImport(db, pedigreeName) {
  try {
    if (!processPedigreeFromDatabase) {
      return {
        success: false,
        error: "Import module not loaded",
        pedigreeName,
      };
    }

    const result = processPedigreeFromDatabase(db, pedigreeName);
    return result;
  } catch (error) {
    return {
      success: false,
      error: error.message,
      pedigreeName,
    };
  }
}

async function performBackgroundPedigreeProcessing(db, name, data, pedigreeId) {
  try {
    const pedigreeData = typeof data === "string" ? JSON.parse(data) : data;
    await decodePedigreeToFamilyCenter(db, pedigreeData, name, pedigreeId);
  } catch (decodeError) {
    // Keep background processing non-blocking
  }

  try {
    await processPedigreeImport(db, name);
  } catch (importError) {
    // Keep background processing non-blocking
  }
}

async function decodePedigreeToFamilyCenter(db, pedigreeData, pedigreeName, pedigreeId) {
  const people = [];
  const relationships = [];

  if (pedigreeData.GG && Array.isArray(pedigreeData.GG)) {
    for (const node of pedigreeData.GG) {
      if (
        node.prop &&
        (node.prop.fName || node.prop.gender) &&
        !node.hub &&
        !node.chhub &&
        !node.rel
      ) {
        people.push(node);
      }

      if (node.outedges && Array.isArray(node.outedges)) {
        for (const edge of node.outedges) {
          relationships.push({
            from: node.id,
            to: edge.to,
            type: node.rel ? "partnership" : "parent-child",
          });
        }
      }
    }
  }

  const deleteMembersStmt = db.prepare(
    "DELETE FROM family_members WHERE pedigree_id = ?"
  );
  deleteMembersStmt.run(pedigreeId);

  const deleteConditionsStmt = db.prepare(`
    DELETE FROM medical_conditions 
    WHERE family_member_id IN (SELECT id FROM family_members WHERE pedigree_id = ?)
  `);
  deleteConditionsStmt.run(pedigreeId);

  const deleteRelationshipsStmt = db.prepare(
    "DELETE FROM family_relationships WHERE pedigree_id = ?"
  );
  deleteRelationshipsStmt.run(pedigreeId);

  const deleteTestsStmt = db.prepare(`
    DELETE FROM genetic_tests 
    WHERE family_member_id IN (SELECT id FROM family_members WHERE pedigree_id = ?)
  `);
  deleteTestsStmt.run(pedigreeId);

  let familyId = null;
  try {
    const findFamilyStmt = db.prepare(
      "SELECT id FROM families WHERE pedigree_id = ?"
    );
    const existingFamily = findFamilyStmt.get(pedigreeId);

    if (existingFamily) {
      familyId = existingFamily.id;
      const updateFamilyStmt = db.prepare(`
        UPDATE families SET 
          name = ?,
          last_updated = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      updateFamilyStmt.run(pedigreeName, familyId);
    } else {
      const insertFamilyStmt = db.prepare(`
        INSERT INTO families (
          name, pedigree_id, proband_name, status, created_date, last_updated
        ) VALUES (?, ?, ?, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `);

      const familyResult = insertFamilyStmt.run(
        pedigreeName,
        pedigreeId,
        "TBD - will update after proband detection"
      );
      familyId = familyResult.lastInsertRowid;
    }
  } catch (familyError) {
    // Continue without family linking if there's an error
  }

  const memberIdMap = new Map();
  let probandFound = false;
  let probandName = null;

  for (const person of people) {
    const memberData = extractEnhancedPersonData(person, pedigreeId, familyId);

    if (memberData.is_proband) {
      probandFound = true;
      probandName = `${memberData.first_name} ${memberData.last_name}`.trim();
    }

    const insertMemberStmt = db.prepare(`
      INSERT INTO family_members (
        pedigree_id, family_id, first_name, last_name, birth_date, birth_year, death_year,
        gender, status, relationship, is_proband, generation, position, notes, ethnicity, external_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let birthDate = null;
    if (memberData.birth_year) {
      birthDate = `${memberData.birth_year}-01-01`;
    }

    let fullNotes = "";
    if (memberData.is_proband) fullNotes += "[PROBAND] ";
    if (memberData.death_year) fullNotes += `[DEATH_YEAR:${memberData.death_year}] `;
    if (memberData.ethnicity) fullNotes += `[ETHNICITY:${memberData.ethnicity}] `;
    if (memberData.birth_year) fullNotes += `[BIRTH_YEAR:${memberData.birth_year}] `;
    if (memberData.notes) fullNotes += memberData.notes;

    const result = insertMemberStmt.run(
      memberData.pedigree_id,
      memberData.family_id,
      memberData.first_name,
      memberData.last_name,
      birthDate,
      memberData.birth_year,
      memberData.death_year,
      memberData.gender,
      memberData.status,
      memberData.relationship,
      memberData.is_proband,
      memberData.generation,
      memberData.position,
      fullNotes.trim(),
      memberData.ethnicity,
      memberData.external_id
    );

    const memberId = result.lastInsertRowid;
    memberIdMap.set(person.id, memberId);

    const conditions = extractConditionsFromPedigreeNode(person, memberId);
    for (const condition of conditions) {
      const insertConditionStmt = db.prepare(`
        INSERT INTO medical_conditions (
          family_member_id, condition_name, condition_type, onset_age, 
          severity, status, notes, external_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      insertConditionStmt.run(
        condition.family_member_id,
        condition.condition_name,
        condition.condition_type,
        condition.onset_age,
        condition.severity,
        condition.status,
        condition.notes,
        condition.external_id
      );
    }
  }

  if (!probandFound && people.length > 0) {
    const firstPersonId = memberIdMap.get(people[0].id);
    if (firstPersonId) {
      const updateStmt = db.prepare(
        'UPDATE family_members SET notes = CASE WHEN notes IS NULL OR notes = "" THEN "[PROBAND]" ELSE "[PROBAND] " || notes END WHERE id = ?'
      );
      updateStmt.run(firstPersonId);

      probandFound = true;
      const firstPersonData = extractEnhancedPersonData(
        people[0],
        pedigreeId,
        familyId
      );
      probandName = `${firstPersonData.first_name} ${firstPersonData.last_name}`.trim();
    }
  }

  const processedRelationships = extractEnhancedRelationships(
    relationships,
    pedigreeId,
    memberIdMap,
    people
  );
  for (const relationship of processedRelationships) {
    try {
      const insertRelStmt = db.prepare(`
        INSERT INTO family_relationships (
          pedigree_id, member1_id, member2_id, relationship_type, notes
        ) VALUES (?, ?, ?, ?, ?)
      `);

      insertRelStmt.run(
        relationship.pedigree_id,
        relationship.member1_id,
        relationship.member2_id,
        relationship.relationship_type,
        relationship.notes
      );
    } catch (relError) {
      // Ignore and continue
    }
  }

  if (familyId && probandName) {
    try {
      const updateProbandStmt = db.prepare(
        "UPDATE families SET proband_name = ? WHERE id = ?"
      );
      updateProbandStmt.run(probandName, familyId);
    } catch (updateError) {
      // Ignore and continue
    }
  }

  return {
    familyId: familyId,
    memberCount: people.length,
    relationshipCount: processedRelationships.length,
    probandFound: probandFound,
  };
}

function extractEnhancedPersonData(person, pedigreeId, familyId) {
  const prop = person.prop || {};

  const firstName = prop.fName || prop.firstName || "Unknown";
  const lastName = prop.lName || prop.lastName || "";

  let gender = "other";
  switch (prop.gender) {
    case "M":
    case "male":
      gender = "male";
      break;
    case "F":
    case "female":
      gender = "female";
      break;
    case "O":
    case "other":
    case "unknown":
    default:
      gender = "other";
      break;
  }

  const birthYear = prop.dob
    ? new Date(prop.dob).getFullYear()
    : prop.birthYear
    ? parseInt(prop.birthYear, 10)
    : null;
  const deathYear = prop.dod
    ? new Date(prop.dod).getFullYear()
    : prop.deathYear
    ? parseInt(prop.deathYear, 10)
    : null;

  let status = "alive";
  if (prop.lifeStatus === "deceased" || deathYear || prop.deceased === true) {
    status = "deceased";
  } else if (prop.lifeStatus === "unborn" || prop.unborn === true) {
    status = "unborn";
  } else if (prop.lifeStatus === "aborted") {
    status = "aborted";
  } else if (prop.lifeStatus === "miscarriage") {
    status = "miscarriage";
  }

  const isProband =
    prop.proband === true ||
    prop.isProband === true ||
    prop.probandArrow === true ||
    person.id === 0;

  let relationship = "family_member";
  if (isProband) {
    relationship = "proband";
  } else if (prop.relationship) {
    relationship = prop.relationship;
  }

  const generation = person.generation || prop.generation || 1;
  const position = person.position || prop.position || 1;

  let notes = "";
  if (isProband) notes += "Proband. ";
  if (prop.comments) notes += prop.comments + ". ";
  if (prop.notes) notes += prop.notes + ". ";
  if (prop.adopted === true) notes += "Adopted. ";
  if (prop.consanguineous === true) notes += "Consanguineous relationship. ";
  if (prop.infertile === true) notes += "Infertile. ";
  if (prop.carrierStatus) notes += `Carrier status: ${prop.carrierStatus}. `;

  const ethnicity = prop.ethnicity || prop.race || null;

  return {
    pedigree_id: pedigreeId,
    family_id: familyId,
    first_name: firstName,
    last_name: lastName,
    birth_year: birthYear,
    death_year: deathYear,
    gender: gender,
    status: status,
    relationship: relationship,
    is_proband: isProband ? 1 : 0,
    generation: generation,
    position: position,
    notes: notes.trim(),
    ethnicity: ethnicity,
    external_id: person.id,
  };
}

function extractConditionsFromPedigreeNode(person, memberId) {
  const conditions = [];
  const prop = person.prop || {};

  if (prop.disorders && Array.isArray(prop.disorders)) {
    for (const disorder of prop.disorders) {
      let conditionName;
      let conditionType;
      let status;
      let notes;

      if (typeof disorder === "string") {
        conditionName = disorder;
        conditionType = "disorder";
        status = "affected";
        notes = "String format disorder";
      } else if (typeof disorder === "object" && disorder !== null) {
        conditionName =
          disorder.disorder ||
          disorder.name ||
          disorder.condition ||
          "Unknown object disorder";
        conditionType = disorder.type || "disorder";
        status = disorder.affected === false ? "unaffected" : "affected";
        notes = disorder.details || disorder.notes || "Object format disorder";
      } else {
        conditionName = String(disorder) || "Unknown disorder type";
        conditionType = "disorder";
        status = "affected";
        notes = "Fallback format disorder";
      }

      conditions.push({
        family_member_id: memberId,
        condition_name: conditionName,
        condition_type: conditionType,
        onset_age:
          typeof disorder === "object"
            ? disorder.onset_age || disorder.onsetAge || null
            : null,
        severity: typeof disorder === "object" ? disorder.severity || null : null,
        status: status,
        notes: notes,
        external_id: typeof disorder === "object" ? disorder.id || null : null,
      });
    }
  }

  if (prop.phenotypes && Array.isArray(prop.phenotypes)) {
    for (const phenotype of prop.phenotypes) {
      conditions.push({
        family_member_id: memberId,
        condition_name: phenotype.label || phenotype.name || "Phenotype",
        condition_type: "phenotype",
        onset_age: null,
        severity: null,
        status: "observed",
        notes: phenotype.notes || "",
        external_id: phenotype.id || null,
      });
    }
  }

  if (prop.hpoTerms && Array.isArray(prop.hpoTerms)) {
    for (const hpo of prop.hpoTerms) {
      conditions.push({
        family_member_id: memberId,
        condition_name: hpo.label || hpo.term || "HPO Term",
        condition_type: "hpo_term",
        onset_age: null,
        severity: null,
        status: hpo.observed === false ? "not_observed" : "observed",
        notes: `HPO: ${hpo.id || ""}. ${hpo.notes || ""}`.trim(),
        external_id: hpo.id || null,
      });
    }
  }

  if (prop.cancers && Array.isArray(prop.cancers)) {
    for (const cancer of prop.cancers) {
      conditions.push({
        family_member_id: memberId,
        condition_name: cancer.type || cancer.name || "Cancer",
        condition_type: "cancer",
        onset_age: cancer.onset_age || cancer.ageAtDiagnosis || null,
        severity: cancer.stage || null,
        status: "affected",
        notes: cancer.notes || cancer.details || "",
        external_id: cancer.id || null,
      });
    }
  }

  return conditions;
}

function extractEnhancedRelationships(
  relationships,
  pedigreeId,
  memberIdMap,
  people
) {
  const processedRelationships = [];

  for (const rel of relationships) {
    const fromMemberId = memberIdMap.get(rel.from);
    const toMemberId = memberIdMap.get(rel.to);

    if (fromMemberId && toMemberId) {
      let relationshipType = "related";

      if (rel.type === "parent-child") {
        relationshipType = "parent-child";
      } else if (rel.type === "partnership") {
        relationshipType = "spouse";
      } else {
        const fromPerson = people.find((p) => p.id === rel.from);
        const toPerson = people.find((p) => p.id === rel.to);

        if (fromPerson && toPerson) {
          const fromGen = fromPerson.generation || fromPerson.prop?.generation || 1;
          const toGen = toPerson.generation || toPerson.prop?.generation || 1;

          if (Math.abs(fromGen - toGen) === 1) {
            relationshipType = "parent-child";
          } else if (fromGen === toGen) {
            relationshipType = "sibling";
          }
        }
      }

      processedRelationships.push({
        pedigree_id: pedigreeId,
        member1_id: fromMemberId,
        member2_id: toMemberId,
        relationship_type: relationshipType,
        notes: rel.notes || "",
      });
    }
  }

  return processedRelationships;
}

module.exports = {
  performBackgroundPedigreeProcessing,
};
