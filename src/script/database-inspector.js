/**
 * Database Inspector for Pedigree Import Tables
 * 
 * Simple utility to inspect the pedigree import tables that were created
 */

const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');

function inspectPedigreeImportTables() {
  // Get the same database path as main.js
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'pedigree.db');
  
  console.log('Inspecting database at:', dbPath);
  
  const db = new Database(dbPath, { readonly: true });
  
  // Get all table names that start with 'pedigree_import_'
  const tables = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name LIKE 'pedigree_import_%'
    ORDER BY name
  `).all();
  
  console.log('\n📋 Pedigree Import Tables Created:');
  console.log('=====================================');
  
  tables.forEach((table, index) => {
    console.log(`${index + 1}. ${table.name}`);
    
    // Get column info for each table
    const columns = db.prepare(`PRAGMA table_info(${table.name})`).all();
    console.log('   Columns:');
    columns.forEach(col => {
      const pk = col.pk ? ' (PRIMARY KEY)' : '';
      const notnull = col.notnull && !col.pk ? ' NOT NULL' : '';
      console.log(`     - ${col.name}: ${col.type}${pk}${notnull}`);
    });
    
    // Get row count
    const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
    console.log(`   Rows: ${count.count}`);
    console.log('');
  });
  
  // Get all indexes for pedigree import tables
  const indexes = db.prepare(`
    SELECT name, tbl_name FROM sqlite_master 
    WHERE type='index' AND tbl_name LIKE 'pedigree_import_%'
    ORDER BY tbl_name, name
  `).all();
  
  console.log('📊 Pedigree Import Indexes Created:');
  console.log('=====================================');
  
  indexes.forEach(idx => {
    console.log(`${idx.name} on ${idx.tbl_name}`);
  });
  
  db.close();
  console.log('\n✅ Database inspection complete!');
  
  return {
    tables: tables.length,
    indexes: indexes.length
  };
}

module.exports = {
  inspectPedigreeImportTables
};
