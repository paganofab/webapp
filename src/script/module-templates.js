class ModuleTemplates {
  // Pedigree Templates (from pedigree-editor)
  static getPedigreeTemplates() {
    const i18n = this.getI18n();
    
    return [
      {
        'id': 'proband',
        'description': i18n.t('templates.proband', 'Proband'),
        'longDescription': i18n.t('templates.descriptions.proband', 'Single individual for basic pedigree studies'),
        'data': {'GG':[{'id':0,'prop':{'gender':'U'}}],'ranks':[3],'order':[[],[],[],[0]],'positions':[5]}
      },
      {
        'id': 'probandWithParents',
        'description': i18n.t('templates.probandWithParents', 'Proband with parents'),
        'longDescription': i18n.t('templates.descriptions.probandWithParents', 'Proband with mother and father relationship'),
        'data': {'GG':[{'id':0,'prop':{'gender':'U'}},{'id':1,'chhub':true,'prop':{},'outedges':[{'to':0}]},{'id':2,'rel':true,'hub':true,'prop':{},'outedges':[{'to':1}]},{'id':3,'prop':{'gender':'F'},'outedges':[{'to':2}]},{'id':4,'prop':{'gender':'M'},'outedges':[{'to':2}]}],'ranks':[3,2,1,1,1],'order':[[],[4,2,3],[1],[0]],'positions':[5,5,5,17,-7]}
      },
      {
        'id': 'twoGenerations',
        'description': i18n.t('templates.twoGenerations', 'Proband with two generations of ancestors'),
        'longDescription': i18n.t('templates.descriptions.twoGenerations', 'Proband with parents and grandparents (13 individuals)'),
        'data': {'GG':[{'id':0,'prop':{'gender':'U'}},{'id':1,'chhub':true,'prop':{},'outedges':[{'to':0}]},{'id':2,'rel':true,'hub':true,'prop':{},'outedges':[{'to':1}]},{'id':3,'prop':{'gender':'F'},'outedges':[{'to':2}]},{'id':4,'prop':{'gender':'M'},'outedges':[{'to':2}]},{'id':5,'chhub':true,'prop':{},'outedges':[{'to':4}]},{'id':6,'rel':true,'hub':true,'prop':{},'outedges':[{'to':5}]},{'id':7,'prop':{'gender':'F'},'outedges':[{'to':6}]},{'id':8,'prop':{'gender':'M'},'outedges':[{'to':6}]},{'id':9,'chhub':true,'prop':{},'outedges':[{'to':3}]},{'id':10,'rel':true,'hub':true,'prop':{},'outedges':[{'to':9}]},{'id':11,'prop':{'gender':'F'},'outedges':[{'to':10}]},{'id':12,'prop':{'gender':'M'},'outedges':[{'to':10}]}],'ranks':[5,4,3,3,3,2,1,1,1,2,1,1,1],'order':[[],[8,6,7,12,10,11],[5,9],[4,2,3],[1],[0]],'positions':[15,15,15,37,-7,-7,-7,5,-19,37,37,49,25]}
      },
      {
        'id': 'consanguineous',
        'description': i18n.t('templates.consanguineousMarriage', 'Consanguineous marriage - cousins'),
        'longDescription': i18n.t('templates.descriptions.consanguineous', 'Marriage between cousins with full ancestry (17 individuals)'),
        'data': {'GG':[{'id':0,'prop':{'gender':'U'}},{'id':1,'chhub':true,'prop':{},'outedges':[{'to':0}]},{'id':2,'rel':true,'hub':true,'prop':{},'outedges':[{'to':1}]},{'id':3,'prop':{'gender':'F'},'outedges':[{'to':2}]},{'id':4,'prop':{'gender':'M'},'outedges':[{'to':2}]},{'id':5,'chhub':true,'prop':{},'outedges':[{'to':4}]},{'id':6,'rel':true,'hub':true,'prop':{},'outedges':[{'to':5}]},{'id':7,'prop':{'gender':'U'},'outedges':[{'to':6}]},{'id':8,'prop':{'gender':'U'},'outedges':[{'to':6}]},{'id':9,'chhub':true,'prop':{},'outedges':[{'to':3}]},{'id':10,'rel':true,'hub':true,'prop':{},'outedges':[{'to':9}]},{'id':11,'prop':{'gender':'U'},'outedges':[{'to':10}]},{'id':12,'prop':{'gender':'U'},'outedges':[{'to':10}]},{'id':13,'chhub':true,'prop':{},'outedges':[{'to':7},{'to':12}]},{'id':14,'rel':true,'hub':true,'prop':{},'outedges':[{'to':13}]},{'id':15,'prop':{'gender':'F'},'outedges':[{'to':14}]},{'id':16,'prop':{'gender':'M'},'outedges':[{'to':14}]}],'ranks':[7,6,5,5,5,4,3,3,3,4,3,3,3,2,1,1,1],'order':[[],[16,14,15],[13],[8,6,7,12,10,11],[5,9],[4,2,3],[1],[0]],'positions':[39,39,39,61,17,17,17,29,5,61,61,73,49,39,39,51,27]}
      }
    ];
  }

  // Get i18n instance or fallback
  static getI18n() {
    if (
      window.i18n &&
      window.i18n.translations &&
      Object.keys(window.i18n.translations).length > 0
    ) {
      return window.i18n;
    }

    console.warn("i18n not ready or translations not loaded, using fallback");

    // Fallback i18n
    return {
      t: (key, fallback = key) => {
        // Simple fallback that returns the key or a basic English text
        const fallbacks = {
          "dashboard.title": "Dashboard",
          "dashboard.createNew": "New Pedigree",
          "dashboard.recentPedigrees": "Recent Pedigrees",
          "dashboard.viewAll": "View All",
          "dashboard.loadingPedigrees": "Loading recent pedigrees...",
          "dashboard.quickActions": "Quick Actions",
          "dashboard.createNewDescription":
            "Creates a new pedigree and opens the editor",
          "dashboard.openExisting": "Open Existing",
          "dashboard.openExistingDescription": "Load an existing pedigree",
          "dashboard.importData": "Import Data",
          "dashboard.importDataDescription":
            "Import pedigree from external file",
          "dashboard.launchEditor": "Launch Editor",
          "dashboard.launchEditorDescription":
            "Open the pedigree drawing interface directly",
          "settings.title": "Settings",
          "settings.general": "General",
          "settings.language": "Language",
          "settings.languageDescription": "Select your preferred language",
          "settings.appearance": "Appearance",
          "settings.advanced": "Advanced",
          "familyCenter.tabsLabel": "Family Tabs",
          "familyCenter.emptyState.icon": "Family",
          "familyCenter.emptyState.title": "Select a family to view details",
          "familyCenter.emptyState.description":
            "Choose a family from the right panel to view and edit family data, or create a new family to get started.",
          "tabs.title": "Tabs",
          "pedigree.selectTemplate": "Select a Pedigree Template",
          "pedigree.templateDescription": "Choose from predefined pedigree structures to get started quickly",
          "pedigree.template.proband": "Proband",
          "pedigree.template.probandDesc": "Single individual of interest",
          "pedigree.template.probandWithParents": "Proband with Parents",
          "pedigree.template.probandWithParentsDesc": "Three-person nuclear family",
          "pedigree.template.twoGenerations": "Two Generations",
          "pedigree.template.twoGenerationsDesc": "Proband with parents and grandparents",
          "pedigree.template.consanguineous": "Consanguineous Marriage",
          "pedigree.template.consanguineousDesc": "Complex family with cousin marriage",
          "pedigree.template.blank": "Blank Pedigree",
          "pedigree.template.blankDesc": "Start with an empty canvas",
          "pedigree.template.launchSuccess": "Pedigree editor launched with template!"
        };
        const result = fallbacks[key] || fallback || key;
        if (result === key) {
          console.warn(`Missing translation for key: ${key}`);
        }
        return result;
      },
    };
  }

  static getDashboardTemplate() {
    const i18n = this.getI18n();
    return `
      <div class="content-header">
        <h1>${i18n.t("dashboard.title")}</h1>
        <button class="quick-action btn btn-primary" data-action="new-pedigree">
            <i class="fa fa-plus"></i>
            ${i18n.t("dashboard.createNew")}
            </button>
      </div>
      
      <div class="dashboard-grid">
        <div class="dashboard-card">
          <div class="card-header">
            <h3>${i18n.t("dashboard.recentPedigrees")}</h3>
            <a href="#" data-module="data-management">${i18n.t(
              "dashboard.viewAll"
            )}</a>
          </div>
          <div class="card-content" id="recent-pedigrees">
            <div class="loading">${i18n.t("dashboard.loadingPedigrees")}</div>
          </div>
        </div>
        
        <div class="dashboard-card">
          <div class="card-header">
            <h3>${i18n.t("dashboard.quickActions")}</h3>
          </div>
          <div class="card-content quick-actions">
            <button class="quick-action" data-action="new-pedigree">
              
              <div>
                <div class="text">${i18n.t("dashboard.createNew")}</div>
                <div class="description">${i18n.t(
                  "dashboard.createNewDescription"
                )}</div>
              </div>
            </button>
            <button class="quick-action" data-action="open-pedigree">
             
              <div>
                <div class="text">${i18n.t("dashboard.openExisting")}</div>
                <div class="description">${i18n.t(
                  "dashboard.openExistingDescription"
                )}</div>
              </div>
            </button>
            <button type="button" class="quick-action" data-action="import">
             
              <div>
                <div class="text">${i18n.t("dashboard.importData")}</div>
                <div class="description">${i18n.t(
                  "dashboard.importDataDescription"
                )}</div>
              </div>
            </button>
            <button type="button" class="quick-action" data-action="launch-editor-direct">
             
              <div>
                <div class="text">${i18n.t("dashboard.launchEditor")}</div>
                <div class="description">${i18n.t(
                  "dashboard.launchEditorDescription"
                )}</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  static getPedigreeEditorTemplate() {
    const i18n = this.getI18n();

    return `
    <div class="content-header">
      <h1>${i18n.t("navigation.pedigreeEditor")}</h1>
      <div class="header-actions">
        <button class="btn btn-primary" data-action="launch-editor-direct">
          <i class="fa fa-plus"></i>
          ${i18n.t("pedigree.newPedigree")}
        </button>
      </div>
    </div>
    
    <div class="pedigree-management">
      <!-- Template Selection Section -->
      <div class="template-selection-section">
        <div class="section-header">
          <h3>${i18n.t("pedigree.selectTemplate", "Select a Pedigree Template")}</h3>
          <p class="section-description">${i18n.t("pedigree.templateDescription", "Choose from predefined pedigree structures to get started quickly")}</p>
        </div>
        
        <div class="template-grid">
          <div class="template-card" data-template="proband">
            <div class="template-preview">
              <svg viewBox="-30 182 180 180" width="120" height="120" xmlns="http://www.w3.org/2000/svg">
                <rect fill="#808080" ry="0" rx="0" height="62.23" width="62.23" y="240.89" x="28.89" transform="matrix(0.7071,0.7071,-0.7071,0.7071,209.91,41.48)" opacity="0.3"></rect>
                <rect stroke="#595959" fill="#ffffff" ry="0" rx="0" height="62.23" width="62.23" y="240.89" x="28.89" transform="matrix(0.7637,0.7637,-0.7637,0.7637,221.90,18.46)" stroke-width="5"></rect>
                <path fill="#595959" d="M9.18,25.33L0.87,33.64L3.87,36.64L12.18,28.33L14.43,30.57L17.16,20.38L6.96,23.11L9.18,25.33Z" transform="matrix(1,0,0,1,2.89,291.11)"></path>
              </svg>
            </div>
            <div class="template-info">
              <h4>${i18n.t("pedigree.template.proband", "Proband")}</h4>
              <p>${i18n.t("pedigree.template.probandDesc", "Single individual of interest")}</p>
            </div>
          </div>

          <div class="template-card" data-template="probandWithParents">
            <div class="template-preview">
              <svg viewBox="-174 -362 468 452" width="120" height="120" xmlns="http://www.w3.org/2000/svg">
                <path stroke="#303058" d="M60,-272L60,-144L60,0" stroke-width="1.25" fill="none"></path>
                <path stroke="#303058" d="M-84,-272L60,-272L204,-272" stroke-width="1.25" fill="none"></path>
                <rect fill="#ffffff" stroke="#595959" ry="0" rx="0" height="62.23" width="62.23" y="-31.11" x="28.89" transform="matrix(0.7637,0.7637,-0.7637,0.7637,14.18,-45.82)" stroke-width="5"></rect>
                <path fill="#595959" d="M9.18,25.33L0.87,33.64L3.87,36.64L12.18,28.33L14.43,30.57L17.16,20.38L6.96,23.11L9.18,25.33Z" transform="matrix(1,0,0,1,2.89,19.11)"></path>
                <circle fill="#ffffff" stroke="#595959" r="40" cy="-272" cx="204"></circle>
                <rect fill="#ffffff" stroke="#595959" ry="0" rx="0" height="80" width="80" y="-312" x="-124"></rect>
              </svg>
            </div>
            <div class="template-info">
              <h4>${i18n.t("pedigree.template.probandWithParents", "Proband with Parents")}</h4>
              <p>${i18n.t("pedigree.template.probandWithParentsDesc", "Three-person nuclear family")}</p>
            </div>
          </div>

          <div class="template-card" data-template="twoGenerations">
            <div class="template-preview">
              <svg viewBox="-318 -362 996 724" width="120" height="120" xmlns="http://www.w3.org/2000/svg">
                <path stroke="#303058" d="M444,-272L444,0M180,0L180,272M-84,-272L-84,0" stroke-width="1.25" fill="none"></path>
                <path stroke="#303058" d="M-228,-272L444,-272M-84,0L444,0M180,128L180,272" stroke-width="1.25" fill="none"></path>
                <rect fill="#ffffff" stroke="#595959" ry="0" rx="0" height="62.23" width="62.23" y="240.89" x="28.89" transform="matrix(0.7637,0.7637,-0.7637,0.7637,341.90,18.46)" stroke-width="5"></rect>
                <path fill="#595959" d="M9.18,25.33L0.87,33.64L3.87,36.64L12.18,28.33L14.43,30.57L17.16,20.38L6.96,23.11L9.18,25.33Z" transform="matrix(1,0,0,1,122.89,291.11)"></path>
                <circle fill="#ffffff" stroke="#595959" r="40" cy="0" cx="204"></circle>
                <rect fill="#ffffff" stroke="#595959" ry="0" rx="0" height="80" width="80" y="-40" x="-124"></rect>
              </svg>
            </div>
            <div class="template-info">
              <h4>${i18n.t("pedigree.template.twoGenerations", "Two Generations")}</h4>
              <p>${i18n.t("pedigree.template.twoGenerationsDesc", "Proband with parents and grandparents")}</p>
            </div>
          </div>

          <div class="template-card" data-template="consanguineous">
            <div class="template-preview">
              <svg viewBox="-30 -90 996 996" width="120" height="120" xmlns="http://www.w3.org/2000/svg">
                <path stroke="#303058" d="M468,0L468,816M348,160L588,160M324,0L612,0" stroke-width="1.25" fill="none"></path>
                <path stroke="#402058" d="M206.5,541.5L729.5,541.5M201.5,546.5L734.5,546.5" stroke-width="1.25" fill="none"></path>
                <rect fill="#ffffff" stroke="#595959" ry="0" rx="0" height="62.23" width="62.23" y="192.89" x="28.89" transform="matrix(0.7637,0.7637,-0.7637,0.7637,593.24,599.12)" stroke-width="5"></rect>
                <path fill="#595959" d="M9.18,25.33L0.87,33.64L3.87,36.64L12.18,28.33L14.43,30.57L17.16,20.38L6.96,23.11L9.18,25.33Z" transform="matrix(1,0,0,1,410.89,835.11)"></path>
                <circle fill="#666666" stroke="#888888" r="3.25" cy="160" cx="468"></circle>
              </svg>
            </div>
            <div class="template-info">
              <h4>${i18n.t("pedigree.template.consanguineous", "Consanguineous Marriage")}</h4>
              <p>${i18n.t("pedigree.template.consanguineousDesc", "Complex family with cousin marriage")}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="pedigree-table-container">
        <div id="pedigree-loading" class="loading-state" style="display: none;">
          <i class="fa fa-spinner fa-spin"></i>
          ${i18n.t("dialog.loadingPedigrees")}
        </div>
        
        <div id="pedigree-empty" class="empty-state" style="display: none;">
          <i class="fas fa-folder-open"></i>
          <p>${i18n.t("labels.noPedigrees")}</p>
          <button class="btn btn-primary" data-action="launch-editor-direct">
            ${i18n.t("pedigree.createFirst")}
          </button>
        </div>

      </div>
    </div>
  `;
  }

  // Reusable Tab Shell Template
  static getTabShellTemplate({
    titleKey = "tabs.title",
    titleFallback = "Tabs",
  } = {}) {
    const i18n = this.getI18n();
    return `
      <div class="tabs-shell">
        <div class="tabs-header" role="tablist" aria-label="${i18n.t(
          titleKey,
          titleFallback
        )}">
          <div class="tabs-scroll">
            <div class="tabs-list" id="tabs-list"></div>
          </div>
          <div class="tabs-actions">
            <button class="tabs-scroll-left" aria-label="Scroll left">◀</button>
            <button class="tabs-scroll-right" aria-label="Scroll right">▶</button>
          </div>
        </div>
        <div class="tabs-panels" id="tabs-panels"></div>
      </div>
    `;
  }

  static getFamilyCenterTemplate() {
    const i18n = this.getI18n();
    return `
      <!-- Family Center with tabs as main container -->
      ${this.getTabShellTemplate({
        titleKey: "familyCenter.tabsLabel",
        titleFallback: "Family Tabs",
      })}

      <!-- Create Family Modal -->
      <div id="fc-create-family-modal" class="modal-overlay" style="display: none;">
        <div class="modal-container">
          <div class="modal-header">
            <h2>${i18n.t(
              "familyCenter.createNewFamily",
              "Create New Family"
            )}</h2>
            <button class="modal-close" id="fc-modal-close" aria-label="Close">&times;</button>
          </div>
          
          <div class="modal-body">
            <form id="fc-create-family-form" class="modal-form">
              <div class="form-row">
                <div class="form-group">
                  <label for="family-name">${i18n.t(
                    "familyCenter.familyName",
                    "Family Name"
                  )} <span class="required">*</span></label>
                  <input type="text" id="family-name" name="name" class="form-control" required 
                         placeholder="${i18n.t(
                           "familyCenter.familyNamePlaceholder",
                           "Enter family name (e.g., Smith Family)"
                         )}" maxlength="100">
                  <small class="form-text">${i18n.t(
                    "familyCenter.familyNameHelp",
                    "A descriptive name to identify this family"
                  )}</small>
                </div>
              </div>
              
              <div class="form-row">
                <div class="form-group">
                  <label for="proband-name">${i18n.t(
                    "familyCenter.probandName",
                    "Proband Name"
                  )}</label>
                  <input type="text" id="proband-name" name="proband_name" class="form-control" 
                         placeholder="${i18n.t(
                           "familyCenter.probandNamePlaceholder",
                           "Enter proband name (optional)"
                         )}" maxlength="100">
                  <small class="form-text">${i18n.t(
                    "familyCenter.probandNameHelp",
                    "The main individual of interest in this family study"
                  )}</small>
                </div>
              </div>
              
              <div class="form-row">
                <div class="form-group">
                  <label for="doctor-notes">${i18n.t(
                    "familyCenter.doctorNotes",
                    "Doctor Notes"
                  )}</label>
                  <textarea id="doctor-notes" name="doctor_notes" class="form-control" 
                            placeholder="${i18n.t(
                              "familyCenter.doctorNotesPlaceholder",
                              "Enter any medical notes or observations (optional)"
                            )}" 
                            rows="4" maxlength="1000"></textarea>
                  <small class="form-text">${i18n.t(
                    "familyCenter.doctorNotesHelp",
                    "Medical history, genetic conditions, or other relevant notes"
                  )}</small>
                </div>
              </div>
              
              <div class="form-row">
                <div class="form-group">
                  <label for="family-status">${i18n.t(
                    "familyCenter.status",
                    "Status"
                  )}</label>
                  <select id="family-status" name="status" class="form-control">
                    <option value="active">${i18n.t(
                      "familyCenter.statusActive",
                      "Active"
                    )}</option>
                    <option value="archived">${i18n.t(
                      "familyCenter.statusArchived",
                      "Archived"
                    )}</option>
                    <option value="under-review">${i18n.t(
                      "familyCenter.statusUnderReview",
                      "Under Review"
                    )}</option>
                  </select>
                </div>
              </div>
            </form>
          </div>
          
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" id="fc-cancel-family">${i18n.t(
              "common.cancel",
              "Cancel"
            )}</button>
            <button type="submit" form="fc-create-family-form" class="btn btn-primary" id="fc-submit-family">
              <span class="btn-text">${i18n.t(
                "familyCenter.createFamily",
                "Create Family"
              )}</span>
              <span class="btn-loading" style="display: none;">${i18n.t(
                "familyCenter.creating",
                "Creating..."
              )}</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  static getReportsTemplate() {
    const i18n = this.getI18n();
    return `
      <div class="reports-module">
        <div class="reports-container" id="reports-container">
          <!-- Reports content will be dynamically loaded here -->
          <div class="reports-loading">
            <i class="fa fa-spinner fa-spin"></i>
            <p>${i18n.t('reports.loading', 'Loading Reports Module...')}</p>
          </div>
        </div>
      </div>
    `;
  }

  static getDoctorInterfaceTemplate() {
    const i18n = this.getI18n();
    return `
      <div class="doctor-interface-module">
        <div class="doctor-module-container" id="doctor-module-container">
          <!-- Doctor interface content will be dynamically loaded here -->
          <div class="doctor-loading">
            <i class="fa fa-spinner fa-spin"></i>
            <p>${i18n.t('doctorInterface.loading', 'Loading Doctor Interface...')}</p>
          </div>
        </div>
      </div>
    `;
  }

  static getDataManagementTemplate() {
    return `
      <div class="data-management-module">
        <div class="module-header">
          <h2 data-i18n="dataManagement.title">Data Management</h2>
          <p class="module-subtitle" data-i18n="dataManagement.subtitle">Backup, restore, and manage your family data</p>
        </div>

        <div class="data-management-content">
          <!-- Backup Section -->
          <div class="management-section backup-section">
            <div class="section-header">
              <h3 data-i18n="dataManagement.backup.title">Create Backup</h3>
              <p data-i18n="dataManagement.backup.description">Create a complete SQL backup of all your family data</p>
            </div>
            
            <div class="backup-options">
              <div class="backup-actions">
                <button class="btn-primary" id="create-backup-btn">
                  <i class="icon-download"></i>
                  <span data-i18n="dataManagement.backup.button">Create Backup</span>
                </button>
                <div class="backup-progress hidden" id="backup-progress">
                  <div class="progress-bar">
                    <div class="progress-fill" id="backup-progress-fill"></div>
                  </div>
                  <span class="progress-text" id="backup-progress-text" data-i18n="dataManagement.backup.creating">Creating backup...</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Restore Section -->
          <div class="management-section restore-section">
            <div class="section-header">
              <h3 data-i18n="dataManagement.restore.title">Restore from Backup</h3>
              <p data-i18n="dataManagement.restore.description">Restore your data from a previously created backup file</p>
            </div>

            <div class="restore-options">
              <div class="restore-actions">
                <button class="btn-primary" id="restore-backup-btn">
                  <i class="icon-upload"></i>
                  <span data-i18n="dataManagement.restore.button">Load Backup</span>
                </button>
              </div>

              <div class="restore-progress hidden" id="restore-progress">
                <div class="progress-bar">
                  <div class="progress-fill" id="restore-progress-fill"></div>
                </div>
                <span class="progress-text" id="restore-progress-text" data-i18n="dataManagement.restore.restoring">Restoring data...</span>
              </div>
            </div>
          </div>

                <div class="restore-actions">
                  <button class="btn-primary" id="restore-backup-btn">
                    <i class="icon-upload"></i>
                    <span data-i18n="dataManagement.restore.start">Restore Data</span>
                  </button>
                  <button class="btn-secondary" id="cancel-restore-btn" data-i18n="common.cancel">Cancel</button>
                </div>

                <div class="restore-progress hidden" id="restore-progress">
                  <div class="progress-bar">
                    <div class="progress-fill" id="restore-progress-fill"></div>
                  </div>
                  <span class="progress-text" id="restore-progress-text" data-i18n="dataManagement.restore.restoring">Restoring data...</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Storage Information -->
          <div class="management-section storage-section">
            <div class="section-header">
              <h3 data-i18n="dataManagement.storage.title">Storage Information</h3>
            </div>
            
            <div class="storage-stats" id="storage-stats">
              <div class="stat-item">
                <span class="stat-label" data-i18n="dataManagement.storage.totalFamilies">Total Families:</span>
                <span class="stat-value" id="total-families-count">-</span>
              </div>
              <div class="stat-item">
                <span class="stat-label" data-i18n="dataManagement.storage.totalMembers">Total Members:</span>
                <span class="stat-value" id="total-members-count">-</span>
              </div>
              <div class="stat-item">
                <span class="stat-label" data-i18n="dataManagement.storage.totalPedigrees">Total Pedigrees:</span>
                <span class="stat-value" id="total-pedigrees-count">-</span>
              </div>
              <div class="stat-item">
                <span class="stat-label" data-i18n="dataManagement.storage.dbSize">Database Size:</span>
                <span class="stat-value" id="db-size">-</span>
              </div>
              <div class="stat-item">
                <span class="stat-label" data-i18n="dataManagement.storage.lastBackup">Last Backup:</span>
                <span class="stat-value" id="last-backup-date">-</span>
              </div>
            </div>

            <div class="storage-actions">
              <button class="btn-secondary" id="refresh-stats-btn" data-i18n="dataManagement.storage.refresh">Refresh Statistics</button>
              <button class="btn-warning" id="cleanup-btn" data-i18n="dataManagement.storage.cleanup">Clean Up Database</button>
            </div>
          </div>
        </div>

        <!-- Status Messages -->
        <div class="status-messages" id="status-messages"></div>
      </div>
    `;
  }

  static getSettingsTemplate() {
    const i18n = this.getI18n();
    return `
      <div class="content-header">
        <h1>${i18n.t("settings.title")}</h1>
      </div>
      
      <div class="settings-container">
        <div class="settings-section">
          <h3>${i18n.t("settings.general")}</h3>
          
          <div class="setting-item">
            <div class="setting-info">
              <h4>${i18n.t("settings.language")}</h4>
              <p>${i18n.t("settings.languageDescription")}</p>
            </div>
            <div class="setting-control">
                            <select id="language-selector" class="setting-select">
                <option value="pt-BR" selected>Português (Brasil)</option>
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
                <option value="it">Italiano</option>
              </select>
            </div>
          </div>
          
        </div>
        
        <div class="settings-section">
          <h3><i class="fa fa-file-pdf text-danger"></i> PDF Export Settings</h3>
          <p>Configure how pedigree PDFs are generated and saved.</p>
          
          <div class="setting-item">
            <div class="setting-info">
              <h4>Page Size</h4>
              <p>Select the paper size for PDF generation</p>
            </div>
            <div class="setting-control">
              <select id="pdf-page-size" class="setting-select">
                <optgroup label="ISO A Series">
                  <option value="A0">A0 (841 × 1189 mm)</option>
                  <option value="A1">A1 (594 × 841 mm)</option>
                  <option value="A2">A2 (420 × 594 mm)</option>
                  <option value="A3">A3 (297 × 420 mm)</option>
                  <option value="A4" selected>A4 (210 × 297 mm)</option>
                  <option value="A5">A5 (148 × 210 mm)</option>
                </optgroup>
                <optgroup label="US Sizes">
                  <option value="LETTER">Letter (8.5 × 11 in)</option>
                  <option value="LEGAL">Legal (8.5 × 14 in)</option>
                  <option value="TABLOID">Tabloid (11 × 17 in)</option>
                  <option value="EXECUTIVE">Executive (7.25 × 10.5 in)</option>
                </optgroup>
                <optgroup label="Other Sizes">
                  <option value="B4">B4 (250 × 353 mm)</option>
                  <option value="B5">B5 (176 × 250 mm)</option>
                </optgroup>
              </select>
            </div>
          </div>
          
          <div class="setting-item">
            <div class="setting-info">
              <h4>Page Orientation</h4>
              <p>Choose how the pedigree is oriented on the page</p>
            </div>
            <div class="setting-control">
              <div class="radio-group">
                <label class="radio-option">
                  <input type="radio" name="pdf-layout" value="landscape" checked>
                  <span class="radio-indicator"></span>
                  <div class="radio-content">
                    <strong>Landscape</strong>
                    <small>Wider format, better for large pedigrees</small>
                  </div>
                </label>
                <label class="radio-option">
                  <input type="radio" name="pdf-layout" value="portrait">
                  <span class="radio-indicator"></span>
                  <div class="radio-content">
                    <strong>Portrait</strong>
                    <small>Taller format, better for documents</small>
                  </div>
                </label>
              </div>
            </div>
          </div>
          
          <div class="setting-item">
            <div class="setting-info">
              <h4>Legend Position</h4>
              <p>Where to place the legend on the PDF</p>
            </div>
            <div class="setting-control">
              <select id="pdf-legend-position" class="setting-select">
                <option value="TopLeft">Top Left</option>
                <option value="TopRight" selected>Top Right</option>
                <option value="BottomLeft">Bottom Left</option>
                <option value="BottomRight">Bottom Right</option>
              </select>
            </div>
          </div>
          
          <div class="setting-item">
            <div class="setting-info">
              <h4>File Compression</h4>
              <p>Enable compression to reduce PDF file size</p>
            </div>
            <div class="setting-control">
              <label class="switch">
                <input type="checkbox" id="pdf-compression">
                <span class="slider"></span>
              </label>
              <small class="setting-note">Smaller files, may slightly reduce quality</small>
            </div>
          </div>
          
          <div class="setting-item">
            <div class="setting-info">
              <h4>Privacy Level</h4>
              <p>Control what information is included in PDFs</p>
            </div>
            <div class="setting-control">
              <select id="pdf-privacy-level" class="setting-select">
                <option value="all" selected>All Information</option>
                <option value="limited">Limited (No sensitive data)</option>
                <option value="basic">Basic (Structure only)</option>
              </select>
            </div>
          </div>
          
          <div class="setting-item">
            <div class="setting-info">
              <h4>Watermark</h4>
              <p>Add a watermark to your PDF documents</p>
            </div>
            <div class="setting-control">
              <label class="switch">
                <input type="checkbox" id="pdf-watermark-enabled">
                <span class="slider"></span>
              </label>
              <small class="setting-note">Enable watermark overlay</small>
            </div>
          </div>
          
          <div class="setting-item watermark-options" style="display: none;">
            <div class="setting-info">
              <h4>Watermark Text</h4>
              <p>Text to display as watermark</p>
            </div>
            <div class="setting-control">
              <input type="text" id="pdf-watermark-text" class="setting-input" placeholder="Enter watermark text" value="CONFIDENTIAL">
            </div>
          </div>
          
          <div class="setting-item watermark-options" style="display: none;">
            <div class="setting-info">
              <h4>Watermark Opacity</h4>
              <p>Transparency level (0-100%)</p>
            </div>
            <div class="setting-control">
              <input type="range" id="pdf-watermark-opacity" class="setting-range" min="10" max="100" value="30">
              <span class="range-value">30%</span>
            </div>
          </div>
          
          <div class="setting-item watermark-options" style="display: none;">
            <div class="setting-info">
              <h4>Watermark Position</h4>
              <p>Where to place the watermark on the page</p>
            </div>
            <div class="setting-control">
              <select id="pdf-watermark-position" class="setting-select">
                <option value="center" selected>Center</option>
                <option value="diagonal">Diagonal</option>
                <option value="top-left">Top Left</option>
                <option value="top-right">Top Right</option>
                <option value="bottom-left">Bottom Left</option>
                <option value="bottom-right">Bottom Right</option>
              </select>
            </div>
          </div>
          
          <div class="setting-item watermark-options" style="display: none;">
            <div class="setting-info">
              <h4>Watermark Size</h4>
              <p>Text size for the watermark</p>
            </div>
            <div class="setting-control">
              <select id="pdf-watermark-size" class="setting-select">
                <option value="small">Small (24pt)</option>
                <option value="medium" selected>Medium (36pt)</option>
                <option value="large">Large (48pt)</option>
                <option value="extra-large">Extra Large (72pt)</option>
              </select>
            </div>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <h4>Auto-save PDFs</h4>
              <p>Automatically generate PDF when saving pedigrees</p>
            </div>
            <div class="setting-control">
              <label class="switch">
                <input type="checkbox" id="pdf-auto-save" checked>
                <span class="slider"></span>
              </label>
              <small class="setting-note">PDF snapshots saved to Family Center</small>
            </div>
          </div>
          
          <div class="setting-actions">
            <button id="pdf-settings-save" class="btn btn-primary">
              <i class="fa fa-save"></i> Save PDF Settings
            </button>
            <button id="pdf-settings-reset" class="btn btn-outline-secondary">
              <i class="fa fa-undo"></i> Reset to Defaults
            </button>
            <button id="pdf-test-generation" class="btn btn-outline-info">
              <i class="fa fa-file-pdf"></i> Test PDF Generation
            </button>
          </div>
        </div>
        
        <div class="settings-section">
          <h3><i class="fa fa-user-md text-primary"></i> ${i18n.t("doctor.title")}</h3>
          <p>${i18n.t("doctor.subtitle")}</p>
          
          <!-- Personal Information -->
          <div class="subsection">
            <h4>${i18n.t("doctor.personalInfo")}</h4>
            
            <div class="setting-item">
              <div class="setting-info">
                <h4>${i18n.t("doctor.fullName")} *</h4>
                <p>Nome completo do médico responsável</p>
              </div>
              <div class="setting-control">
                <input type="text" id="doctor-full-name" class="setting-input" 
                       placeholder="${i18n.t("doctor.placeholders.fullName")}" required>
              </div>
            </div>
            
            <div class="setting-item">
              <div class="setting-info">
                <h4>${i18n.t("doctor.professionalTitle")}</h4>
                <p>Título profissional (Dr., Dra., Prof., etc.)</p>
              </div>
              <div class="setting-control">
                <input type="text" id="doctor-professional-title" class="setting-input" 
                       placeholder="${i18n.t("doctor.placeholders.professionalTitle")}" value="Dra.">
              </div>
            </div>
            
            <div class="setting-item">
              <div class="setting-info">
                <h4>${i18n.t("doctor.academicTitles")}</h4>
                <p>Títulos acadêmicos e especialidades</p>
              </div>
              <div class="setting-control">
                <textarea id="doctor-academic-titles" class="setting-textarea" rows="2"
                          placeholder="${i18n.t("doctor.placeholders.academicTitles")}"></textarea>
              </div>
            </div>
          </div>
          
          <!-- Professional Information -->
          <div class="subsection">
            <h4>${i18n.t("doctor.professionalInfo")}</h4>
            
            <div class="setting-row">
              <div class="setting-item half-width">
                <div class="setting-info">
                  <h4>${i18n.t("doctor.crmNumber")} *</h4>
                  <p>${i18n.t("doctor.help.crmNumber")}</p>
                </div>
                <div class="setting-control">
                  <input type="text" id="doctor-crm-number" class="setting-input" 
                         placeholder="${i18n.t("doctor.placeholders.crmNumber")}" pattern="[0-9]+">
                </div>
              </div>
              
              <div class="setting-item half-width">
                <div class="setting-info">
                  <h4>${i18n.t("doctor.crmState")} *</h4>
                  <p>${i18n.t("doctor.help.crmState")}</p>
                </div>
                <div class="setting-control">
                  <select id="doctor-crm-state" class="setting-select">
                    <option value="">Selecione...</option>
                    <option value="AC">AC - Acre</option>
                    <option value="AL">AL - Alagoas</option>
                    <option value="AP">AP - Amapá</option>
                    <option value="AM">AM - Amazonas</option>
                    <option value="BA">BA - Bahia</option>
                    <option value="CE">CE - Ceará</option>
                    <option value="DF">DF - Distrito Federal</option>
                    <option value="ES">ES - Espírito Santo</option>
                    <option value="GO">GO - Goiás</option>
                    <option value="MA">MA - Maranhão</option>
                    <option value="MT">MT - Mato Grosso</option>
                    <option value="MS">MS - Mato Grosso do Sul</option>
                    <option value="MG">MG - Minas Gerais</option>
                    <option value="PA">PA - Pará</option>
                    <option value="PB">PB - Paraíba</option>
                    <option value="PR">PR - Paraná</option>
                    <option value="PE">PE - Pernambuco</option>
                    <option value="PI">PI - Piauí</option>
                    <option value="RJ">RJ - Rio de Janeiro</option>
                    <option value="RN">RN - Rio Grande do Norte</option>
                    <option value="RS">RS - Rio Grande do Sul</option>
                    <option value="RO">RO - Rondônia</option>
                    <option value="RR">RR - Roraima</option>
                    <option value="SC">SC - Santa Catarina</option>
                    <option value="SP">SP - São Paulo</option>
                    <option value="SE">SE - Sergipe</option>
                    <option value="TO">TO - Tocantins</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div class="setting-row">
              <div class="setting-item half-width">
                <div class="setting-info">
                  <h4>${i18n.t("doctor.specialty")}</h4>
                  <p>Especialidade principal</p>
                </div>
                <div class="setting-control">
                  <input type="text" id="doctor-specialty" class="setting-input" 
                         placeholder="${i18n.t("doctor.placeholders.specialty")}">
                </div>
              </div>
              
              <div class="setting-item half-width">
                <div class="setting-info">
                  <h4>${i18n.t("doctor.subspecialty")}</h4>
                  <p>Subespecialidade ou área de foco</p>
                </div>
                <div class="setting-control">
                  <input type="text" id="doctor-subspecialty" class="setting-input" 
                         placeholder="${i18n.t("doctor.placeholders.subspecialty")}">
                </div>
              </div>
            </div>
          </div>
          
          <!-- Clinic Information -->
          <div class="subsection">
            <h4>${i18n.t("doctor.clinicInfo")}</h4>
            
            <div class="setting-item">
              <div class="setting-info">
                <h4>${i18n.t("doctor.clinicName")}</h4>
                <p>Nome da clínica ou consultório</p>
              </div>
              <div class="setting-control">
                <input type="text" id="doctor-clinic-name" class="setting-input" 
                       placeholder="${i18n.t("doctor.placeholders.clinicName")}">
              </div>
            </div>
            
            <div class="setting-item">
              <div class="setting-info">
                <h4>${i18n.t("doctor.clinicAddress")}</h4>
                <p>Endereço completo da clínica</p>
              </div>
              <div class="setting-control">
                <input type="text" id="doctor-clinic-address" class="setting-input" 
                       placeholder="${i18n.t("doctor.placeholders.clinicAddress")}">
              </div>
            </div>
            
            <div class="setting-row">
              <div class="setting-item half-width">
                <div class="setting-info">
                  <h4>${i18n.t("doctor.clinicCity")}</h4>
                </div>
                <div class="setting-control">
                  <input type="text" id="doctor-clinic-city" class="setting-input" 
                         placeholder="${i18n.t("doctor.placeholders.clinicCity")}">
                </div>
              </div>
              
              <div class="setting-item quarter-width">
                <div class="setting-info">
                  <h4>${i18n.t("doctor.clinicState")}</h4>
                </div>
                <div class="setting-control">
                  <select id="doctor-clinic-state" class="setting-select">
                    <option value="">UF</option>
                    <option value="SP">SP</option>
                    <option value="RJ">RJ</option>
                    <option value="MG">MG</option>
                    <option value="RS">RS</option>
                    <option value="SC">SC</option>
                    <option value="PR">PR</option>
                    <option value="BA">BA</option>
                    <option value="GO">GO</option>
                    <option value="PE">PE</option>
                    <option value="CE">CE</option>
                    <!-- Add more states as needed -->
                  </select>
                </div>
              </div>
              
              <div class="setting-item quarter-width">
                <div class="setting-info">
                  <h4>${i18n.t("doctor.clinicPostalCode")}</h4>
                </div>
                <div class="setting-control">
                  <input type="text" id="doctor-clinic-postal-code" class="setting-input" 
                         placeholder="${i18n.t("doctor.placeholders.clinicPostalCode")}" 
                         pattern="[0-9]{5}-?[0-9]{3}">
                </div>
              </div>
            </div>
          </div>
          
          <!-- Contact Information -->
          <div class="subsection">
            <h4>${i18n.t("doctor.contactInfo")}</h4>
            
            <div class="setting-row">
              <div class="setting-item half-width">
                <div class="setting-info">
                  <h4>${i18n.t("doctor.clinicPhone")}</h4>
                  <p>Telefone principal da clínica</p>
                </div>
                <div class="setting-control">
                  <input type="tel" id="doctor-clinic-phone" class="setting-input" 
                         placeholder="${i18n.t("doctor.placeholders.clinicPhone")}">
                </div>
              </div>
              
              <div class="setting-item half-width">
                <div class="setting-info">
                  <h4>${i18n.t("doctor.clinicEmail")}</h4>
                  <p>E-mail oficial da clínica</p>
                </div>
                <div class="setting-control">
                  <input type="email" id="doctor-clinic-email" class="setting-input" 
                         placeholder="${i18n.t("doctor.placeholders.clinicEmail")}">
                </div>
              </div>
            </div>
            
            <div class="setting-row">
              <div class="setting-item half-width">
                <div class="setting-info">
                  <h4>${i18n.t("doctor.personalEmail")}</h4>
                  <p>E-mail pessoal (opcional)</p>
                </div>
                <div class="setting-control">
                  <input type="email" id="doctor-personal-email" class="setting-input" 
                         placeholder="${i18n.t("doctor.placeholders.personalEmail")}">
                </div>
              </div>
              
              <div class="setting-item half-width">
                <div class="setting-info">
                  <h4>${i18n.t("doctor.website")}</h4>
                  <p>Site profissional ou da clínica</p>
                </div>
                <div class="setting-control">
                  <input type="url" id="doctor-website" class="setting-input" 
                         placeholder="${i18n.t("doctor.placeholders.website")}">
                </div>
              </div>
            </div>
          </div>
          
          <!-- Additional Information -->
          <div class="subsection">
            <h4>${i18n.t("doctor.additionalInfo")}</h4>
            
            <div class="setting-item">
              <div class="setting-info">
                <h4>${i18n.t("doctor.consultationHours")}</h4>
                <p>Horários de funcionamento da clínica</p>
              </div>
              <div class="setting-control">
                <textarea id="doctor-consultation-hours" class="setting-textarea" rows="2"
                          placeholder="${i18n.t("doctor.placeholders.consultationHours")}"></textarea>
              </div>
            </div>
          </div>
          
          <div class="setting-actions">
            <button id="doctor-info-save" class="btn btn-primary">
              <i class="fa fa-save"></i> ${i18n.t("buttons.save")} Informações do Médico
            </button>
            <button id="doctor-info-clear" class="btn btn-outline-secondary">
              <i class="fa fa-refresh"></i> Limpar Formulário
            </button>
            <button id="doctor-variables-preview" class="btn btn-outline-info">
              <i class="fa fa-eye"></i> Visualizar Variáveis
            </button>
          </div>
        </div>
        
        <div class="settings-section">
          <h3>${i18n.t("settings.appearance")}</h3>
          <p>Appearance settings will be available in a future update.</p>
        </div>
        
        <div class="settings-section">
          <h3>${i18n.t("settings.advanced")}</h3>
          <p>Advanced settings will be available in a future update.</p>
        </div>
      </div>
    `;
  }
}

// Make it available globally
window.ModuleTemplates = ModuleTemplates;
