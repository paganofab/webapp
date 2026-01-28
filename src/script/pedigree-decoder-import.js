/**
 * Pedigree Decoder and Import System
 * 
 * This module handles:
 * 1. Decoding pedigree graph JSON from the pedigrees table
 * 2. Converting it to normalized person records
 * 3. Importing data into the new pedigree_import_* tables
 * 
 * Based on PEDIGREE_IMPORT_FUNCTION.md specification
 */

/**
 * Map pedigree gender values to database format
 * @param {string} gender - Original gender value from pedigree
 * @returns {string|null} - Mapped gender ('M', 'F', 'O') or null
 */
function mapGender(gender) {
  if (!gender) return null;
  
  const g = gender.toString().toLowerCase();
  switch (g) {
    case 'm':
    case 'male':
    case '1':
      return 'M';
    case 'f':
    case 'female':
    case '2':
      return 'F';
    case 'o':
    case 'other':
    case 'unknown':
    case 'u':
    case '0':
      return 'O';
    default:
      console.warn(`⚠️ Unknown gender value: "${gender}", mapping to 'O'`);
      return 'O';
  }
}

/**
 * Decode a pedigree graph (with hubs/child hubs) into per-person records.
 * Input: the whole JSON object (with keys: GG, ranks, order, positions)
 * Output: Array of person objects, one per real person (non-hub).
 */
function decodePedigreeToPersons(graph) {
  const nodes = graph.GG || [];
  const ranks = graph.ranks || [];

  const byId = new Map(nodes.map(n => [n.id, n]));
  const isRelHub = (n) => !!n.hub && !!n.rel;
  const isChildHub = (n) => !!n.chhub;
  const isPerson  = (n) => !isRelHub(n) && !isChildHub(n);

  // Build edge maps
  const outMap = new Map();
  const inMap  = new Map();
  for (const n of nodes) {
    const outs = (n.outedges || []).map(e => e.to);
    outMap.set(n.id, outs);
    for (const to of outs) {
      if (!inMap.has(to)) inMap.set(to, []);
      inMap.get(to).push(n.id);
    }
    if (!inMap.has(n.id)) inMap.set(n.id, []);
    if (!outMap.has(n.id)) outMap.set(n.id, []);
  }
  const getOut = (id) => outMap.get(id) || [];
  const getIn  = (id) => inMap.get(id)  || [];

  // relationship hub partners & child hubs
  const relHubPartners = new Map();
  const relHubChildHubs = new Map();
  for (const n of nodes) {
    if (isRelHub(n)) {
      const partners = new Set(getIn(n.id).filter(pid => isPerson(byId.get(pid))));
      const childHubs = new Set(getOut(n.id).filter(cid => isChildHub(byId.get(cid))));
      relHubPartners.set(n.id, partners);
      relHubChildHubs.set(n.id, childHubs);
    }
  }

  // child hub children
  const childHubChildren = new Map();
  for (const n of nodes) {
    if (isChildHub(n)) {
      const kids = new Set(getOut(n.id).filter(kid => isPerson(byId.get(kid))));
      childHubChildren.set(n.id, kids);
    }
  }

  function parentPersonsOfChildHub(chId) {
    const rels = getIn(chId).filter(rid => isRelHub(byId.get(rid)));
    const parents = new Set();
    for (const rid of rels) for (const p of (relHubPartners.get(rid) || [])) parents.add(p);
    return parents;
  }
  const relHubsOfPerson  = (pid) => getOut(pid).filter(rid => isRelHub(byId.get(rid)));
  const childHubsOfPerson= (pid) => getIn(pid).filter(chid => isChildHub(byId.get(chid)));

  const persons = [];
  for (const n of nodes) {
    if (!isPerson(n)) continue;
    const id = n.id;
    const generation = Number.isFinite(ranks[id]) ? ranks[id] : null;

    // partners
    const partners = new Set();
    for (const rid of relHubsOfPerson(id)) {
      for (const p of (relHubPartners.get(rid) || [])) if (p !== id) partners.add(p);
    }

    // children
    const children = new Set();
    for (const rid of relHubsOfPerson(id)) {
      for (const ch of (relHubChildHubs.get(rid) || [])) {
        for (const kid of (childHubChildren.get(ch) || [])) children.add(kid);
      }
    }

    // parents
    const parents = new Set();
    for (const ch of childHubsOfPerson(id)) {
      for (const p of parentPersonsOfChildHub(ch)) parents.add(p);
    }

    // siblings (share the same child hub)
    const siblings = new Set();
    for (const ch of childHubsOfPerson(id)) {
      for (const sib of (childHubChildren.get(ch) || [])) if (sib !== id) siblings.add(sib);
    }

    persons.push({
      id,
      generation,
      partners: [...partners],
      parents:  [...parents],
      children: [...children],
      siblings: [...siblings],
      hasSiblings: siblings.size > 0,
      positionX: Array.isArray(graph.positions) ? (graph.positions[id] ?? null) : null,
      ...n.prop
    });
  }

  return persons;
}

/**
 * Import decoded pedigree data into the database tables
 * @param {Database} db - better-sqlite3 database instance
 * @param {Object} graph - Original pedigree graph data
 * @param {Array} decodedPersons - Array of person objects from decoder
 * @param {string} sessionName - Import session name
 * @param {string} sourceInfo - Source description
 * @param {number} pedigreeId - ID of the pedigree from pedigrees table
 * @returns {Object} Import results
 */
function importPedigreeData(db, graph, decodedPersons, sessionName, sourceInfo, pedigreeId) {
  console.log(`Starting pedigree import: ${sessionName}`);
  
  const tx = db.transaction(() => {
    // 1. Create import session
    const sessionId = Date.now(); // Simple ID generation
    const insertSession = db.prepare(`
      INSERT INTO pedigree_import_sessions 
      (id, session_name, source_file, graph_data, total_persons, total_partnerships, status)
      VALUES (?, ?, ?, ?, ?, ?, 'active')
    `);
    
    const nodes = graph.GG || [];
    const partnerships = nodes.filter(n => !!n.hub && !!n.rel).length;
    
    insertSession.run(
      sessionId,
      sessionName,
      sourceInfo,
      JSON.stringify(graph),
      decodedPersons.length,
      partnerships
    );

    // 2. Import persons
    const insertPerson = db.prepare(`
      INSERT INTO pedigree_import_person
      (pedigree_id, external_id, f_name, l_name, gender, dob, dod, life_status, evaluated, 
       childless_status, carrier_status, comments, generation, position_x)
      VALUES (@pedigree_id, @external_id, @f_name, @l_name, @gender, @dob, @dod, @life_status, 
              @evaluated, @childless_status, @carrier_status, @comments, @generation, @position_x)
      ON CONFLICT(pedigree_id, external_id) DO UPDATE SET
        f_name=excluded.f_name, l_name=excluded.l_name,
        gender=excluded.gender, dob=excluded.dob, dod=excluded.dod, life_status=excluded.life_status,
        evaluated=excluded.evaluated, childless_status=excluded.childless_status,
        carrier_status=excluded.carrier_status, comments=excluded.comments,
        generation=excluded.generation, position_x=excluded.position_x
      RETURNING id
    `);

    const getPersonId = db.prepare(`
      SELECT id FROM pedigree_import_person WHERE pedigree_id = ? AND external_id = ?
    `);

    const linkSessionPerson = db.prepare(`
      INSERT INTO pedigree_import_session_person (session_id, person_id)
      VALUES (?, ?) ON CONFLICT DO NOTHING
    `);

    // Map from original person IDs to database IDs
    const personIdMap = new Map();

    for (const p of decodedPersons) {
      insertPerson.run({
        pedigree_id: pedigreeId, // Link person to pedigree family
        external_id: p.id, // Original person ID within the pedigree graph
        f_name: p.fName || p.firstName || null,
        l_name: p.lName || p.lastName || null,
        gender: mapGender(p.gender),
        dob: p.dob || p.birthDate || null,
        dod: p.dod || p.deathDate || null,
        life_status: p.lifeStatus || (p.isAlive === false ? 'deceased' : 'alive'),
        evaluated: p.evaluated ? 1 : 0,
        childless_status: p.childlessStatus || null,
        carrier_status: p.carrierStatus || null,
        comments: p.comments || p.notes || null,
        generation: Number.isFinite(p.generation) ? p.generation : null,
        position_x: Number.isFinite(p.positionX) ? p.positionX : null
      });
      
      // Get the actual database ID after insert/update
      const personRecord = getPersonId.get(pedigreeId, p.id);
      if (personRecord) {
        const personDbId = personRecord.id;
        personIdMap.set(p.id, personDbId);
        linkSessionPerson.run(sessionId, personDbId);
      }
    }

    // 3. Import partnerships and relationships
    const byId = new Map(nodes.map(n => [n.id, n]));
    const isRelHub  = (n) => !!n?.hub && !!n?.rel;
    const isChildHub= (n) => !!n?.chhub;
    const isPerson  = (n) => n && !isRelHub(n) && !isChildHub(n);

    const outMap = new Map();
    const inMap  = new Map();
    for (const n of nodes) {
      const outs = (n.outedges || []).map(e => e.to);
      outMap.set(n.id, outs);
      for (const to of outs) {
        if (!inMap.has(to)) inMap.set(to, []);
        inMap.get(to).push(n.id);
      }
      if (!inMap.has(n.id)) inMap.set(n.id, []);
      if (!outMap.has(n.id)) outMap.set(n.id, []);
    }
    const getOut = (id) => outMap.get(id) || [];
    const getIn  = (id) => inMap.get(id)  || [];

    const insertPartnership = db.prepare(`
      INSERT INTO pedigree_import_partnership (id, pedigree_id, notes, consanguinity, is_broken, prop_json)
      VALUES (@id, @pedigree_id, @notes, @consanguinity, @is_broken, @prop_json)
      ON CONFLICT(id) DO UPDATE SET
        pedigree_id=excluded.pedigree_id,
        notes=excluded.notes,
        consanguinity=excluded.consanguinity,
        is_broken=excluded.is_broken,
        prop_json=excluded.prop_json
    `);
    
    const insertPartner = db.prepare(`
      INSERT INTO pedigree_import_partnership_partner (partnership_id, person_id)
      VALUES (?, ?) ON CONFLICT DO NOTHING
    `);
    
    const insertChild = db.prepare(`
      INSERT INTO pedigree_import_partnership_child (partnership_id, child_id)
      VALUES (?, ?) ON CONFLICT DO NOTHING
    `);

    const linkSessionPartnership = db.prepare(`
      INSERT INTO pedigree_import_session_partnership (session_id, partnership_id)
      VALUES (?, ?) ON CONFLICT DO NOTHING
    `);

    for (const n of nodes) {
      if (!isRelHub(n)) continue;
      const relId = n.id;
      const prop = n.prop || {};

      // Map known props; keep raw JSON too
      const payload = {
        id: relId,
        pedigree_id: pedigreeId,  // Link partnership to pedigree family
        notes: null,                                  
        consanguinity: prop.consangr ?? null,         
        is_broken: prop.broken ? 1 : 0,               
        prop_json: JSON.stringify(prop)               
      };
      insertPartnership.run(payload);
      linkSessionPartnership.run(sessionId, relId);

      // partners = incoming persons
      const partners = (getIn(relId) || []).filter(pid => isPerson(byId.get(pid)));
      for (const pid of partners) {
        const dbId = personIdMap.get(pid);
        if (dbId) insertPartner.run(relId, dbId);
      }

      // child hubs = outgoing chhubs from rel hub
      const childHubs = (getOut(relId) || []).filter(cid => isChildHub(byId.get(cid)));
      for (const ch of childHubs) {
        const kids = (getOut(ch) || []).filter(kid => isPerson(byId.get(kid)));
        for (const kid of kids) {
          const dbId = personIdMap.get(kid);
          if (dbId) insertChild.run(relId, dbId);
        }
      }
    }

    // 4. Import clinical annotations
    const upsertLookup = (table, column, value) => {
      const ins = db.prepare(`INSERT INTO ${table} (${column}) VALUES (?) ON CONFLICT(${column}) DO NOTHING`);
      ins.run(value);
      const sel = db.prepare(`SELECT id FROM ${table} WHERE ${column} = ?`);
      return sel.get(value).id;
    };

    const linkDis = db.prepare(`INSERT OR IGNORE INTO pedigree_import_person_disorder (person_id, disorder_id) VALUES (?, ?)`);
    const linkHpo = db.prepare(`INSERT OR IGNORE INTO pedigree_import_person_hpo_term (person_id, hpo_id) VALUES (?, ?)`);
    const linkGene= db.prepare(`INSERT OR IGNORE INTO pedigree_import_person_gene (person_id, gene_id, role) VALUES (?, ?, ?)`);

    for (const p of decodedPersons) {
      const dbId = personIdMap.get(p.id);
      if (!dbId) continue;
      
      for (const d of (p.disorders || []))  { 
        const id = upsertLookup('pedigree_import_disorder','name', d);  
        linkDis.run(dbId, id); 
      }
      for (const t of (p.hpoTerms || []))   { 
        const id = upsertLookup('pedigree_import_hpo_term','term', t); 
        linkHpo.run(dbId, id); 
      }
      for (const g of (p.candidateGenes || [])) {
        const id = upsertLookup('pedigree_import_gene','symbol', g);
        linkGene.run(dbId, id, 'candidate');
      }
    }

    console.log(`✅ Import completed: ${decodedPersons.length} persons, ${partnerships} partnerships`);
    
    return {
      sessionId,
      personsImported: decodedPersons.length,
      partnershipsImported: partnerships
    };
  });

  return tx();
}

/**
 * Process a pedigree from the pedigrees table and import it into the new schema
 * @param {Database} db - better-sqlite3 database instance  
 * @param {string} pedigreeName - Name of the pedigree to process
 * @returns {Object} Processing results
 */
function processPedigreeFromDatabase(db, pedigreeName) {
  try {
    console.log(`Processing pedigree: ${pedigreeName}`);
    
    // 1. Get pedigree data from pedigrees table
    const getPedigree = db.prepare('SELECT * FROM pedigrees WHERE name = ?');
    const pedigreeRecord = getPedigree.get(pedigreeName);
    
    if (!pedigreeRecord) {
      throw new Error(`Pedigree "${pedigreeName}" not found`);
    }
    
    // 2. Parse the JSON data
    let graph;
    try {
      graph = JSON.parse(pedigreeRecord.data);
    } catch (parseError) {
      throw new Error(`Invalid JSON data in pedigree "${pedigreeName}": ${parseError.message}`);
    }
    
    // 3. Decode the graph to persons
    const decodedPersons = decodePedigreeToPersons(graph);
    console.log(`Decoded ${decodedPersons.length} persons from pedigree graph`);
    
    // 4. Import into new tables
    const sessionName = `${pedigreeName}_import_${Date.now()}`;
    const result = importPedigreeData(db, graph, decodedPersons, sessionName, pedigreeName, pedigreeRecord.id);
    
    return {
      success: true,
      pedigreeName,
      pedigreeId: pedigreeRecord.id,
      sessionId: result.sessionId,
      personsImported: result.personsImported,
      partnershipsImported: result.partnershipsImported,
      message: `Successfully imported pedigree "${pedigreeName}" into import tables`
    };
    
  } catch (error) {
    console.error(`Error processing pedigree "${pedigreeName}":`, error);
    return {
      success: false,
      pedigreeName,
      error: error.message,
      message: `Failed to import pedigree "${pedigreeName}": ${error.message}`
    };
  }
}

/**
 * Process a pedigree from the pedigrees table by ID and import it into the new schema
 * @param {Database} db - better-sqlite3 database instance
 * @param {number} pedigreeId - ID of the pedigree to process
 * @returns {Object} Processing results
 */
function processPedigreeFromDatabaseById(db, pedigreeId) {
  try {
    console.log(`Processing pedigree by id: ${pedigreeId}`);

    const getPedigree = db.prepare('SELECT * FROM pedigrees WHERE id = ?');
    const pedigreeRecord = getPedigree.get(pedigreeId);

    if (!pedigreeRecord) {
      throw new Error(`Pedigree "${pedigreeId}" not found`);
    }

    let graph;
    try {
      graph = JSON.parse(pedigreeRecord.data);
    } catch (parseError) {
      throw new Error(`Invalid JSON data in pedigree "${pedigreeId}": ${parseError.message}`);
    }

    const decodedPersons = decodePedigreeToPersons(graph);
    console.log(`Decoded ${decodedPersons.length} persons from pedigree graph`);

    const sessionName = `${pedigreeRecord.name}_import_${Date.now()}`;
    const result = importPedigreeData(db, graph, decodedPersons, sessionName, pedigreeRecord.name, pedigreeRecord.id);

    return {
      success: true,
      pedigreeName: pedigreeRecord.name,
      pedigreeId: pedigreeRecord.id,
      sessionId: result.sessionId,
      personsImported: result.personsImported,
      partnershipsImported: result.partnershipsImported,
      message: `Successfully imported pedigree "${pedigreeRecord.name}" into import tables`
    };
  } catch (error) {
    console.error(`Error processing pedigree "${pedigreeId}":`, error);
    return {
      success: false,
      pedigreeId,
      error: error.message,
      message: `Failed to import pedigree "${pedigreeId}": ${error.message}`
    };
  }
}

/**
 * Get import session statistics
 * @param {Database} db - better-sqlite3 database instance
 * @param {number} sessionId - Session ID to get stats for
 * @returns {Object} Session statistics
 */
function getImportSessionStats(db, sessionId) {
  const sessionInfo = db.prepare('SELECT * FROM pedigree_import_sessions WHERE id = ?').get(sessionId);
  
  if (!sessionInfo) {
    return null;
  }
  
  const personCount = db.prepare('SELECT COUNT(*) as count FROM pedigree_import_session_person WHERE session_id = ?').get(sessionId);
  const partnershipCount = db.prepare('SELECT COUNT(*) as count FROM pedigree_import_session_partnership WHERE session_id = ?').get(sessionId);
  
  return {
    sessionId,
    sessionName: sessionInfo.session_name,
    sourceFile: sessionInfo.source_file,
    importDate: sessionInfo.import_date,
    status: sessionInfo.status,
    totalPersons: personCount.count,
    totalPartnerships: partnershipCount.count
  };
}

module.exports = {
  decodePedigreeToPersons,
  importPedigreeData,
  processPedigreeFromDatabase,
  processPedigreeFromDatabaseById,
  getImportSessionStats
};
