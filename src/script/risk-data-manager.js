/**
 * Risk Data Manager - Helper functions for managing person risk assessment data
 * 
 * This module provides utility functions for working with the pedigree_import_person_risk_data table.
 * It includes data validation, form helpers, and common queries.
 */

/**
 * Risk Data Field Definitions
 * Organized by category for easier form generation and validation
 */
const RISK_DATA_FIELDS = {
  demographics: {
    title: 'Demographics',
    fields: {
      birthdate: { type: 'date', label: 'Birth Date' },
      birthplace: { type: 'text', label: 'Birth Place' },
      age: { type: 'number', label: 'Age', min: 0, max: 150 },
      genero: { type: 'text', label: 'Gender (Portuguese)' },
      orientacao_sexual: { type: 'text', label: 'Sexual Orientation' },
      escolaridade: { type: 'text', label: 'Education Level' },
      profissao: { type: 'text', label: 'Profession' }
    }
  },
  
  death: {
    title: 'Death Information',
    fields: {
      is_dead: { type: 'boolean', label: 'Is Deceased' },
      date_of_death: { type: 'date', label: 'Date of Death' },
      cause_of_death: { type: 'textarea', label: 'Cause of Death' }
    }
  },
  
  ancestry: {
    title: 'Ancestry & Adoption',
    fields: {
      ancestry: { type: 'textarea', label: 'Ancestry Information' },
      adopted: { type: 'boolean', label: 'Is Adopted' },
      adopted_history: { type: 'textarea', label: 'Adoption History' },
      jewish_ancestry: { type: 'boolean', label: 'Jewish Ancestry' },
      jewish_origin: { type: 'text', label: 'Jewish Origin' },
      consanguinity: { type: 'boolean', label: 'Consanguineous Relationships' },
      consanguinity_relation: { type: 'textarea', label: 'Consanguinity Details' }
    }
  },
  
  cancer: {
    title: 'Cancer History',
    fields: {
      cancer: { type: 'boolean', label: 'Cancer History' },
      cancer_list: { type: 'textarea', label: 'Cancer Types/Details' }
    }
  },
  
  genetic_testing: {
    title: 'Genetic Testing',
    fields: {
      genetic_test: { type: 'boolean', label: 'Has Genetic Testing' },
      genetic_test_result: { type: 'textarea', label: 'Test Results' },
      genetic_test_done: { type: 'textarea', label: 'Tests Performed' },
      genetic_test_file: { type: 'text', label: 'Test File Reference' }
    }
  },
  
  reproductive_basic: {
    title: 'Basic Reproductive History',
    fields: {
      reproductive_history: { type: 'textarea', label: 'Reproductive History' },
      menarche_age: { type: 'number', label: 'Menarche Age', min: 8, max: 18 },
      pregnancies: { type: 'number', label: 'Number of Pregnancies', min: 0 },
      births_over_38wks: { type: 'number', label: 'Births Over 38 Weeks', min: 0 },
      age_first_birth: { type: 'number', label: 'Age at First Birth', min: 10, max: 60 },
      breastfeeding: { type: 'boolean', label: 'Breastfeeding History' },
      breastfeeding_months: { type: 'number', label: 'Breastfeeding Months', min: 0 },
      biopsies: { type: 'number', label: 'Number of Biopsies', min: 0 },
      hyperplasia_found: { type: 'boolean', label: 'Hyperplasia Found' }
    }
  },
  
  family_relations: {
    title: 'Family Relationships',
    fields: {
      relation_to_proband: { 
        type: 'select', 
        label: 'Relation to Proband',
        options: [
          'proband', 'father', 'mother', 'sibling', 'child', 'grandchild', 'niece',
          'paternal_grandfather', 'paternal_grandmother', 'maternal_grandfather', 'maternal_grandmother',
          'paternal_sibling', 'maternal_sibling', 'paternal_cousin', 'maternal_cousin',
          'partner', 'partner_father', 'partner_mother', 'partner_sibling',
          'partner_paternal_grandfather', 'partner_paternal_grandmother',
          'partner_maternal_grandfather', 'partner_maternal_grandmother'
        ]
      },
      is_half_sibling: { type: 'boolean', label: 'Is Half-Sibling' },
      half_sibling_side: { type: 'select', label: 'Half-Sibling Side', options: ['mother', 'father'] }
    }
  },
  
  twin_info: {
    title: 'Twin Information',
    fields: {
      isTwin: { type: 'boolean', label: 'Is Twin' },
      twin_group_id: { type: 'text', label: 'Twin Group ID' },
      twin_type: { type: 'select', label: 'Twin Type', options: ['monozygotic', 'dizygotic', 'unknown'] }
    }
  },
  
  partnership: {
    title: 'Partnership Information',
    fields: {
      partner_relationship: { type: 'select', label: 'Partner Relationship', options: ['spouse', 'partner', 'ex_spouse'] },
      genetic_condition: { type: 'boolean', label: 'Has Genetic Condition' },
      sons_count: { type: 'number', label: 'Number of Sons', min: 0 },
      daughters_count: { type: 'number', label: 'Number of Daughters', min: 0 },
      children_count_unknown: { type: 'boolean', label: 'Unknown Number of Children' }
    }
  },
  
  physical: {
    title: 'Physical Measurements',
    fields: {
      altura: { type: 'number', label: 'Height (cm)', step: 0.1, min: 50, max: 250 },
      peso: { type: 'number', label: 'Weight (kg)', step: 0.1, min: 20, max: 300 },
      bmi: { type: 'number', label: 'BMI', step: 0.1, min: 10, max: 60, readonly: true }
    }
  },
  
  alcohol: {
    title: 'Alcohol Consumption',
    fields: {
      consome_alcool: { type: 'select', label: 'Consumes Alcohol', options: ['Sim', 'Não', 'Ocasionalmente'] },
      alcohol_grams_week: { type: 'number', label: 'Alcohol Grams/Week', step: 0.1, min: 0 },
      cerveja_week: { type: 'number', label: 'Beer Glasses/Week', step: 0.1, min: 0 },
      vinho_week: { type: 'number', label: 'Wine Glasses/Week', step: 0.1, min: 0 },
      destilados_week: { type: 'number', label: 'Spirits Shots/Week', step: 0.1, min: 0 },
      outras_bebidas_week: { type: 'number', label: 'Other Drinks/Week', step: 0.1, min: 0 },
      alcohol_pattern: { type: 'select', label: 'Drinking Pattern', options: ['regular', 'weekend', 'social'] },
      alcohol_duration: { type: 'text', label: 'Pattern Duration' },
      alcohol_history: { type: 'select', label: 'Heavy Drinking History', options: ['Sim', 'Não'] }
    }
  },
  
  reproductive_detailed: {
    title: 'Detailed Reproductive History',
    fields: {
      first_menstruation_age: { type: 'number', label: 'First Menstruation Age', min: 8, max: 18 },
      total_pregnancies: { type: 'number', label: 'Total Pregnancies', min: 0 },
      had_miscarriage: { type: 'boolean', label: 'Had Miscarriage' },
      miscarriage_count: { type: 'number', label: 'Miscarriage Count', min: 0 },
      pregnancies_over_weeks: { type: 'number', label: 'Pregnancies Over X Weeks', min: 0 },
      pregnancies_over_months: { type: 'number', label: 'Pregnancies Over X Months', min: 0 },
      first_childbirth_age: { type: 'number', label: 'First Childbirth Age', min: 10, max: 60 },
      did_breastfeed: { type: 'boolean', label: 'Did Breastfeed' },
      breastfeed_months_average: { type: 'number', label: 'Average Breastfeed Months', min: 0 }
    }
  },
  
  contraceptives: {
    title: 'Oral Contraceptives',
    fields: {
      oc_use: { type: 'select', label: 'OC Use', options: ['Sim', 'Não'] },
      oc_duration_years: { type: 'number', label: 'OC Duration (Years)', step: 0.1, min: 0 },
      oc_age_start: { type: 'number', label: 'Age Started OC', min: 10, max: 60 },
      oc_current_use: { type: 'select', label: 'Currently Using OC', options: ['Sim', 'Não'] }
    }
  },
  
  hormone_therapy: {
    title: 'Hormone Replacement Therapy',
    fields: {
      mht_use: { type: 'select', label: 'HRT Use', options: ['Sim', 'Não'] },
      mht_duration_years: { type: 'number', label: 'HRT Duration (Years)', step: 0.1, min: 0 },
      mht_age_start: { type: 'number', label: 'Age Started HRT', min: 30, max: 80 },
      mht_type: { type: 'select', label: 'HRT Type', options: ['estrogen_only', 'combined', 'other', 'unknown'] }
    }
  },
  
  surgical: {
    title: 'Surgical History',
    fields: {
      tubal_ligation: { type: 'select', label: 'Tubal Ligation', options: ['Sim', 'Não'] },
      tl_age: { type: 'number', label: 'Age at Tubal Ligation', min: 18, max: 60 }
    }
  },
  
  medical_conditions: {
    title: 'Medical Conditions',
    fields: {
      endometriosis: { type: 'select', label: 'Endometriosis', options: ['Sim', 'Não', 'Suspeita'] },
      endo_age_diagnosis: { type: 'number', label: 'Age at Endometriosis Diagnosis', min: 10, max: 60 },
      endo_severity: { type: 'select', label: 'Endometriosis Severity', options: ['minimal', 'mild', 'moderate', 'severe', 'unknown'] }
    }
  },
  
  menopause: {
    title: 'Menopause',
    fields: {
      menopause_status: { type: 'select', label: 'Menopause Status', options: ['Sim', 'Não', 'Não sei'] },
      menopause_age: { type: 'number', label: 'Age at Menopause', min: 30, max: 80 },
      ovary_removal: { type: 'select', label: 'Ovary Removal', options: ['Sim', 'Não'] },
      ovary_removal_age: { type: 'number', label: 'Age at Ovary Removal', min: 18, max: 80 },
      ovary_removal_type: { type: 'select', label: 'Ovary Removal Type', options: ['left', 'right', 'both'] }
    }
  },
  
  risk_factors: {
    title: 'Risk Assessment Factors',
    fields: {
      mammographic_density: { type: 'select', label: 'Mammographic Density', options: ['A', 'B', 'C', 'D', 'unknown'] },
      smoking_status: { type: 'select', label: 'Smoking Status', options: ['never', 'former', 'current'] },
      smoking_pack_years: { type: 'number', label: 'Pack-Years of Smoking', step: 0.1, min: 0 },
      physical_activity: { type: 'select', label: 'Physical Activity', options: ['sedentary', 'moderate', 'active'] },
      lcis_diagnosis: { type: 'boolean', label: 'LCIS Diagnosis' },
      radiation_exposure: { type: 'boolean', label: 'Chest Radiation Exposure' },
      radiation_age: { type: 'number', label: 'Age at Radiation', min: 0, max: 100 }
    }
  }
};

/**
 * Validate risk data before saving
 * @param {Object} riskData - The risk data to validate
 * @returns {Object} - { valid: boolean, errors: string[] }
 */
function validateRiskData(riskData) {
  const errors = [];
  
  // Required fields
  if (!riskData.pedigree_id) {
    errors.push('Pedigree ID is required');
  }
  if (!riskData.person_id) {
    errors.push('Person ID is required');
  }
  
  // Age validation
  if (riskData.age && (riskData.age < 0 || riskData.age > 150)) {
    errors.push('Age must be between 0 and 150');
  }
  
  // Height/Weight validation
  if (riskData.altura && (riskData.altura < 50 || riskData.altura > 250)) {
    errors.push('Height must be between 50 and 250 cm');
  }
  if (riskData.peso && (riskData.peso < 20 || riskData.peso > 300)) {
    errors.push('Weight must be between 20 and 300 kg');
  }
  
  // Calculate BMI if height and weight are provided
  if (riskData.altura && riskData.peso) {
    const heightM = riskData.altura / 100;
    const bmi = riskData.peso / (heightM * heightM);
    riskData.bmi = Math.round(bmi * 10) / 10; // Round to 1 decimal
  }
  
  // Date validations
  if (riskData.birthdate && riskData.date_of_death) {
    if (new Date(riskData.birthdate) >= new Date(riskData.date_of_death)) {
      errors.push('Date of death must be after birth date');
    }
  }
  
  // Logical validations
  if (riskData.is_dead && !riskData.date_of_death && !riskData.cause_of_death) {
    errors.push('If deceased, either date of death or cause of death should be provided');
  }
  
  if (riskData.had_miscarriage && (!riskData.miscarriage_count || riskData.miscarriage_count <= 0)) {
    errors.push('If had miscarriage, miscarriage count should be greater than 0');
  }
  
  return {
    valid: errors.length === 0,
    errors: errors
  };
}

/**
 * Generate HTML form for risk data entry
 * @param {Object} existingData - Existing risk data (for editing)
 * @param {string[]} categories - Categories to include (default: all)
 * @returns {string} - HTML form
 */
function generateRiskDataForm(existingData = {}, categories = null) {
  const categoriesToShow = categories || Object.keys(RISK_DATA_FIELDS);
  let html = '<form id="risk-data-form" class="risk-data-form">';
  
  categoriesToShow.forEach(categoryKey => {
    const category = RISK_DATA_FIELDS[categoryKey];
    if (!category) return;
    
    html += `<fieldset class="risk-category">`;
    html += `<legend>${category.title}</legend>`;
    html += `<div class="risk-fields-grid">`;
    
    Object.entries(category.fields).forEach(([fieldKey, fieldDef]) => {
      const value = existingData[fieldKey] || '';
      const fieldId = `risk-${fieldKey}`;
      
      html += `<div class="risk-field">`;
      html += `<label for="${fieldId}">${fieldDef.label}</label>`;
      
      switch (fieldDef.type) {
        case 'boolean':
          html += `
            <div class="boolean-field">
              <label><input type="radio" name="${fieldKey}" value="1" ${value === 1 ? 'checked' : ''}> Yes</label>
              <label><input type="radio" name="${fieldKey}" value="0" ${value === 0 ? 'checked' : ''}> No</label>
              <label><input type="radio" name="${fieldKey}" value="" ${value === '' || value === null ? 'checked' : ''}> Unknown</label>
            </div>`;
          break;
          
        case 'select':
          html += `<select name="${fieldKey}" id="${fieldId}">`;
          html += `<option value="">Select...</option>`;
          fieldDef.options.forEach(option => {
            html += `<option value="${option}" ${value === option ? 'selected' : ''}>${option}</option>`;
          });
          html += `</select>`;
          break;
          
        case 'textarea':
          html += `<textarea name="${fieldKey}" id="${fieldId}" rows="3">${value}</textarea>`;
          break;
          
        case 'date':
          html += `<input type="date" name="${fieldKey}" id="${fieldId}" value="${value}">`;
          break;
          
        case 'number':
          const attrs = [];
          if (fieldDef.min !== undefined) attrs.push(`min="${fieldDef.min}"`);
          if (fieldDef.max !== undefined) attrs.push(`max="${fieldDef.max}"`);
          if (fieldDef.step !== undefined) attrs.push(`step="${fieldDef.step}"`);
          if (fieldDef.readonly) attrs.push(`readonly`);
          
          html += `<input type="number" name="${fieldKey}" id="${fieldId}" value="${value}" ${attrs.join(' ')}>`;
          break;
          
        default: // text
          html += `<input type="text" name="${fieldKey}" id="${fieldId}" value="${value}">`;
      }
      
      html += `</div>`;
    });
    
    html += `</div></fieldset>`;
  });
  
  html += `
    <div class="form-actions">
      <button type="submit" class="btn btn-primary">Save Risk Data</button>
      <button type="button" class="btn btn-secondary" onclick="clearRiskForm()">Clear Form</button>
    </div>
  </form>`;
  
  return html;
}

/**
 * Extract risk data from form
 * @param {HTMLFormElement} form - The form element
 * @returns {Object} - Risk data object
 */
function extractRiskDataFromForm(form) {
  const formData = new FormData(form);
  const riskData = {};
  
  for (const [key, value] of formData.entries()) {
    if (value === '' || value === 'null') {
      riskData[key] = null;
    } else if (value === '0' || value === '1') {
      // Boolean fields as integers
      riskData[key] = parseInt(value);
    } else if (!isNaN(value) && value !== '') {
      // Numeric fields
      riskData[key] = parseFloat(value);
    } else {
      // Text fields
      riskData[key] = value;
    }
  }
  
  return riskData;
}

/**
 * Generate CSS for the risk data form
 * @returns {string} - CSS styles
 */
function generateRiskDataCSS() {
  return `
    .risk-data-form {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    
    .risk-category {
      margin-bottom: 30px;
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 20px;
    }
    
    .risk-category legend {
      font-weight: bold;
      color: #333;
      padding: 0 10px;
      font-size: 1.1em;
    }
    
    .risk-fields-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 15px;
      margin-top: 15px;
    }
    
    .risk-field {
      display: flex;
      flex-direction: column;
    }
    
    .risk-field label {
      font-weight: 500;
      margin-bottom: 5px;
      color: #555;
    }
    
    .risk-field input,
    .risk-field select,
    .risk-field textarea {
      padding: 8px;
      border: 1px solid #ccc;
      border-radius: 4px;
      font-size: 14px;
    }
    
    .risk-field input:focus,
    .risk-field select:focus,
    .risk-field textarea:focus {
      outline: none;
      border-color: #007bff;
      box-shadow: 0 0 5px rgba(0, 123, 255, 0.3);
    }
    
    .boolean-field {
      display: flex;
      gap: 15px;
      flex-wrap: wrap;
    }
    
    .boolean-field label {
      display: flex;
      align-items: center;
      gap: 5px;
      font-weight: normal;
      margin-bottom: 0;
    }
    
    .form-actions {
      margin-top: 30px;
      text-align: center;
      padding: 20px;
      border-top: 1px solid #eee;
    }
    
    .form-actions .btn {
      margin: 0 10px;
      padding: 10px 20px;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 16px;
    }
    
    .btn-primary {
      background-color: #007bff;
      color: white;
    }
    
    .btn-secondary {
      background-color: #6c757d;
      color: white;
    }
    
    .btn:hover {
      opacity: 0.9;
    }
    
    @media (max-width: 768px) {
      .risk-fields-grid {
        grid-template-columns: 1fr;
      }
      
      .boolean-field {
        flex-direction: column;
        gap: 8px;
      }
    }
  `;
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    RISK_DATA_FIELDS,
    validateRiskData,
    generateRiskDataForm,
    extractRiskDataFromForm,
    generateRiskDataCSS
  };
}
