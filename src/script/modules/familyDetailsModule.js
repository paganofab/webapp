/**
 * FamilyDetailsModule
 * 
 * Handles all family detail view functionality including:
 * - Family member table generation and display
 * - DataTable integration with Portuguese localization
 * - Relationship mapping and proband detection
 * - Clinical data integration (molecular variations, disorders, phenotypes)
 * - Member management actions (view, edit, add)
 */

class FamilyDetailsModule {
  
  constructor(options = {}) {
    this.options = options || {};
    this.name = 'family-details';
  }

  /**
   * Generate complete family tab content with enhanced styling and columns
   * @param {Object} family - Family object with basic info
   * @param {Array} familyMembers - Array of family member objects
   * @returns {string} HTML content for family details tab
   */
  async generateFamilyTabContent(family, familyMembers) {
    // Filter out unknown members for counting (consistent with generateComprehensiveMemberRows)
    const namedMembers = familyMembers ? familyMembers.filter(member => 
      member.first_name && 
      member.first_name.trim() !== '' && 
      member.first_name.toLowerCase() !== 'unknown' &&
      member.first_name.toLowerCase() !== 'unnamed'
    ) : [];
    
    const memberCount = namedMembers.length;
    const totalMemberCount = familyMembers ? familyMembers.length : 0;
    const hiddenCount = totalMemberCount - memberCount;
    
    // Find proband from actual family members
    console.log('Looking for proband in familyMembers:', familyMembers);
    const proband = familyMembers ? familyMembers.find(member => {
      console.log('Checking member:', member.first_name, member.last_name, 'is_proband:', member.is_proband, typeof member.is_proband);
      return member.is_proband === 1 || member.is_proband === true;
    }) : null;
    console.log('Found proband:', proband);
    const probandDisplay = proband ? `${proband.first_name} ${proband.last_name}`.trim() : 'Not determined';
    
    // Generate comprehensive family member rows using pedigree import data
    let memberRows = '';
    
    if (familyMembers && familyMembers.length > 0) {
      // Get pedigree import data for this family using pedigree_id
      const pedigreeData = await this.getPedigreeImportData(family.pedigree_id);
      
      memberRows = await this.generateComprehensiveMemberRows(familyMembers, pedigreeData);
    }
    
    return `
      <div class="family-details-layout">

  <!-- LEFT: main column -->
  <div class="family-left">

    <!-- Header -->
    <header class="family-header">
      <div class="fh-left">
        <h1 class="fh-title"><i class="fa fa-users"></i> ${this.escapeHtml(family.name)}</h1>
        <ul class="fh-meta">
          <li><span class="tag tag-id">ID: ${family.id}</span></li>
          <li><span class="tag tag-status ${family.status || 'active'}">${family.status || 'active'}</span></li>
          <li><span class="tag tag-light">Created: ${new Date(family.created_date).toLocaleDateString()}</span></li>
        </ul>
      </div>
      <div class="fh-actions">
        <button class="btn btn-primary" onclick="window.pedigreeApp.editFamily('${this.escapeHtml(family.name)}')">
          Edit Family
        </button>
        <button class="btn btn-secondary" onclick="window.pedigreeApp.openPedigreeByName('${this.escapeHtml(family.name)}')">
          View Pedigree
        </button>
      </div>
    </header>

    <!-- Members -->
    <section class="family-members">
      <div class="section-bar">
        <h3 class="section-title"><i class="fa fa-users"></i> Family Members (${memberCount}${hiddenCount > 0 ? ` + ${hiddenCount} hidden` : ''})</h3>
        <button class="btn btn-primary btn-sm" onclick="window.pedigreeApp.addFamilyMember(${family.id})">
          <i class="fa fa-plus"></i> Add Member
        </button>
      </div>

      <div class="dt-wrap">
        <table id="family-members-datatable-${family.id}" class="display compact family-members-datatable">
          <thead>
            <tr>
              <th>Name</th>
              <th>Relation</th>
              <th>Gender</th>
              <th>Molecular Var.</th>
              <th>Disorder</th>
              <th>Phenotype</th>
            </tr>
          </thead>
          <tbody>
            ${memberRows || `
              <tr>
                <td colspan="6" class="text-center text-muted">
                  <div class="empty-state-small">
                    <i class="fa fa-users fa-2x"></i>
                    <p>No named family members found</p>
                    <small>Unnamed or unknown members are hidden</small>
                    <button class="btn btn-primary btn-sm" onclick="window.pedigreeApp.addFamilyMember(${family.id})">
                      <i class="fa fa-plus"></i> Add First Member
                    </button>
                  </div>
                </td>
              </tr>
            `}
          </tbody>
        </table>
      </div>
    </section>
  </div>

  <!-- RIGHT: side column (documents) -->
  <aside class="family-right">
    <div class="docs-card">
      <div class="docs-header">
        <h3 class="section-title"><i class="fa fa-file-pdf-o"></i> Family Documents</h3>
        <button class="btn btn-sm btn-secondary" onclick="window.pedigreeApp.refreshFamilyPdfs('${family.id}')" title="Refresh documents">
          <i class="fa fa-refresh"></i>
        </button>
      </div>

      <!-- A simple list instead of a viewer -->
      <div class="docs-list">
        <select id="pdf-selector-${family.id}" class="form-control pdf-selector" onchange="window.familyDetailsModule.handlePdfSelection('${family.id}', this)">
          <option value="">Choose a document...</option>
        </select>

        <!-- Optional: place where you render filenames fetched for this family -->
        <ul id="pdf-list-${family.id}" class="pdf-list">
          <!-- li items like:
          <li>
            <i class="fa fa-file-pdf-o"></i>
            <span class="pdf-name">report_2025_01.pdf</span>
            <button class="btn btn-xs" onclick="window.familyDetailsModule.onPdfSelected('${family.id}', 'path/to/report_2025_01.pdf', 'report_2025_01.pdf')">Preview</button>
            <button class="btn btn-xs" onclick="window.pedigreeApp.loadSelectedPdf('${family.id}','report_2025_01.pdf')">Open</button>
          </li>
          -->
        </ul>
      </div>

      <!-- PDF Viewer Section -->
      <div class="pdf-viewer-section" id="pdf-viewer-section-${family.id}" style="display: none; margin-top: 15px;">
        <div class="pdf-viewer-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; padding: 8px; background-color: #f8f9fa; border-radius: 4px; border: 1px solid #dee2e6;">
          <h4 class="pdf-viewer-title" style="margin: 0; font-size: 14px; color: #495057;">
            <i class="fa fa-file-pdf-o"></i> 
            <span id="pdf-viewer-filename-${family.id}">Document Preview</span>
          </h4>
          <div class="pdf-viewer-controls">
            <button class="btn btn-sm btn-primary" onclick="window.familyDetailsModule.openPdfFullscreen('${family.id}')" title="Detach viewer" style="margin-left: 5px;">
              <i class="fa fa-external-link"></i>
            </button>
            <button class="btn btn-sm btn-secondary" onclick="window.familyDetailsModule.closePdfViewer('${family.id}')" title="Close preview" style="margin-left: 5px;">
              <i class="fa fa-times"></i>
            </button>
          </div>
        </div>
        
        <div class="pdf-viewer-container" style="position: relative; background-color: #f8f9fa; border-radius: 4px; overflow: hidden;">
          <iframe 
            id="pdf-viewer-iframe-${family.id}" 
            class="pdf-viewer-iframe"
            style="width: 100%; height: 400px; border: 1px solid #ddd; border-radius: 4px; display: block;"
            frameborder="0">
          </iframe>
        </div>
        
        <div class="pdf-viewer-footer" style="margin-top: 8px; text-align: center;">
          <small class="text-muted">
            <i class="fa fa-info-circle"></i> 
            Click detach to view the document in a separate window
          </small>
        </div>
      </div>
    </div>
  </aside>

</div>

    `;
  }

  /**
   * Generate comprehensive member rows combining family center and pedigree import data
   * @param {Array} familyMembers - Array of family member objects
   * @param {Object} pedigreeData - Pedigree import data with relationships and clinical info
   * @returns {string} HTML table rows for family members
   */
  async generateComprehensiveMemberRows(familyMembers, pedigreeData) {
    if (!familyMembers || familyMembers.length === 0) return '';
    
    console.log('generateComprehensiveMemberRows:', { familyMembers: familyMembers.length, pedigreeData });
    
    // Filter out unknown members (those without names)
    const namedMembers = familyMembers.filter(member => 
      member.first_name && 
      member.first_name.trim() !== '' && 
      member.first_name.toLowerCase() !== 'unknown' &&
      member.first_name.toLowerCase() !== 'unnamed'
    );
    
    console.log(`Filtered ${familyMembers.length} total members to ${namedMembers.length} named members`);
    
    if (namedMembers.length === 0) {
      return `
        <tr>
          <td colspan="6" class="text-center text-muted">
            <div class="empty-state-small">
              <i class="fa fa-users fa-2x"></i>
              <p>No named family members found</p>
              <small>Unnamed or unknown members are hidden</small>
            </div>
          </td>
        </tr>
      `;
    }
    
    return namedMembers.map(member => {
      console.log('Processing member:', member.first_name, member.last_name);
      
      // Find corresponding pedigree import data
      let pedigreePersonData = null;
      if (pedigreeData && pedigreeData.persons) {
        console.log('Available pedigree persons:', pedigreeData.persons.map(p => `${p.f_name} ${p.l_name}`));
        pedigreePersonData = pedigreeData.persons.find(p => 
          p.f_name === member.first_name && p.l_name === member.last_name
        );
        console.log('Found pedigree person data for', member.first_name, member.last_name, ':', pedigreePersonData);
      }
      
      // Build member name with proband indicator - make it clickable
      const probandIndicator = (member.is_proband === 1 || member.is_proband === true) ? ' <span class="badge badge-success badge-sm">Proband</span>' : '';
      const memberName = `
        <div style="font-size: 0.85rem;">
          <a href="#" onclick="window.pedigreeApp.viewMemberDetails(${member.id}); return false;" style="text-decoration: none; color: inherit;">
            <strong>${this.escapeHtml(member.first_name || '')} ${this.escapeHtml(member.last_name || '')}</strong>
          </a>${probandIndicator}
          ${member.nickname ? `<br><small class="text-muted" style="font-size: 0.75rem;">aka "${this.escapeHtml(member.nickname)}"</small>` : ''}
        </div>
      `;
      
      // Get relation to proband
      let relationToProband = 'Self';
      if (!(member.is_proband === 1 || member.is_proband === true)) {
        relationToProband = this.getRelationToProband(member, pedigreePersonData, pedigreeData);
      }
      
      // Determine gender display
      const gender = member.gender || (pedigreePersonData ? pedigreePersonData.gender : null);
      let genderBadge = 'badge-secondary';
      let genderText = 'Unknown';
      if (gender === 'male' || gender === 'M') {
        genderBadge = 'badge-primary';
        genderText = 'Male';
      } else if (gender === 'female' || gender === 'F') {
        genderBadge = 'badge-danger';
        genderText = 'Female';
      } else if (gender === 'other' || gender === 'O') {
        genderBadge = 'badge-info';
        genderText = 'Other';
      }
      
      // Get molecular variations
      let molecularVariations = '';
      if (pedigreePersonData && pedigreeData.genes) {
        const personGenes = pedigreeData.genes.filter(g => g.person_id === pedigreePersonData.id);
        if (personGenes.length > 0) {
          molecularVariations = personGenes.map(g => 
            `<span class="badge badge-info badge-sm" style="font-size: 0.7rem; margin: 1px;">${this.escapeHtml(g.symbol)}</span>`
          ).join(' ');
        } else {
          molecularVariations = '<span class="text-muted" style="font-size: 0.75rem;">None</span>';
        }
      } else {
        molecularVariations = '<span class="text-muted" style="font-size: 0.75rem;">None</span>';
      }
      
      // Get disorders
      let disorders = '';
      if (pedigreePersonData && pedigreeData.disorders) {
        const personDisorders = pedigreeData.disorders.filter(d => d.person_id === pedigreePersonData.id);
        if (personDisorders.length > 0) {
          disorders = personDisorders.map(d => 
            `<span class="badge badge-warning badge-sm" style="font-size: 0.7rem; margin: 1px;">${this.escapeHtml(d.name)}</span>`
          ).join(' ');
        } else {
          disorders = '<span class="text-muted" style="font-size: 0.75rem;">None</span>';
        }
      } else {
        disorders = '<span class="text-muted" style="font-size: 0.75rem;">None</span>';
      }
      
      // Get phenotypes (HPO terms)
      let phenotypes = '';
      if (pedigreePersonData && pedigreeData.hpo_terms) {
        const personHPOs = pedigreeData.hpo_terms.filter(h => h.person_id === pedigreePersonData.id);
        if (personHPOs.length > 0) {
          phenotypes = personHPOs.slice(0, 3).map(h => 
            `<span class="badge badge-light badge-sm" style="font-size: 0.7rem; margin: 1px;" title="${this.escapeHtml(h.name)}">${this.escapeHtml(h.hpo_id)}</span>`
          ).join(' ');
          if (personHPOs.length > 3) {
            phenotypes += `<br><small class="text-muted" style="font-size: 0.65rem;">+${personHPOs.length - 3} more</small>`;
          }
        } else {
          phenotypes = '<span class="text-muted" style="font-size: 0.75rem;">None</span>';
        }
      } else {
        phenotypes = '<span class="text-muted" style="font-size: 0.75rem;">None</span>';
      }
      
      return `
        <tr style="font-size: 0.85rem;">
          <td style="padding: 8px;">${memberName}</td>
          <td style="padding: 8px;">
            <span class="badge badge-outline-secondary badge-sm" style="font-size: 0.75rem;">${this.escapeHtml(relationToProband)}</span>
          </td>
          <td style="padding: 8px;">
            <span class="badge ${genderBadge} badge-sm" style="font-size: 0.75rem;">
              ${genderText}
            </span>
          </td>
          <td style="padding: 8px; max-width: 120px;">${molecularVariations}</td>
          <td style="padding: 8px; max-width: 120px;">${disorders}</td>
          <td style="padding: 8px; max-width: 150px;">${phenotypes}</td>
        </tr>
      `;
    }).join('');
  }

  /**
   * Get relationships for a person from pedigree data
   * @param {number} personId - Person ID in pedigree data
   * @param {Object} pedigreeData - Complete pedigree data
   * @returns {Object} Object with arrays of parents, children, and partners
   */
  getPersonRelationships(personId, pedigreeData) {
    const relationships = {
      parents: [],
      children: [],
      partners: []
    };
    
    if (!pedigreeData.partnerships) return relationships;
    
    // Find partnerships where this person is involved
    const personPartnerships = pedigreeData.partnerships.filter(p => 
      p.partners && p.partners.some(partner => partner.person_id === personId)
    );
    
    for (const partnership of personPartnerships) {
      // Get partners (excluding self)
      const partnerPersons = partnership.partners
        .filter(p => p.person_id !== personId)
        .map(p => {
          const person = pedigreeData.persons.find(person => person.id === p.person_id);
          return person ? `${person.f_name} ${person.l_name}`.trim() : 'Unknown';
        });
      relationships.partners.push(...partnerPersons);
      
      // Get children of this partnership
      if (partnership.children) {
        const childrenNames = partnership.children.map(childId => {
          const child = pedigreeData.persons.find(p => p.id === childId);
          return child ? `${child.f_name} ${child.l_name}`.trim() : 'Unknown';
        });
        relationships.children.push(...childrenNames);
      }
    }
    
    // Find parents (partnerships where this person is a child)
    const parentPartnerships = pedigreeData.partnerships.filter(p =>
      p.children && p.children.includes(personId)
    );
    
    for (const parentPartnership of parentPartnerships) {
      const parentNames = parentPartnership.partners.map(p => {
        const parent = pedigreeData.persons.find(person => person.id === p.person_id);
        return parent ? `${parent.f_name} ${parent.l_name}`.trim() : 'Unknown';
      });
      relationships.parents.push(...parentNames);
    }
    
    return relationships;
  }

  /**
   * Get relation to proband for a family member
   * @param {Object} member - Family member object
   * @param {Object} pedigreePersonData - Corresponding pedigree person data
   * @param {Object} pedigreeData - Complete pedigree data
   * @returns {string} Relationship to proband (e.g., 'Parent', 'Sibling', 'Uncle', etc.)
   */
  getRelationToProband(member, pedigreePersonData, pedigreeData) {
    if (!pedigreePersonData || !pedigreeData) {
      return 'Unknown';
    }
    
    // Find the proband in pedigree data
    const proband = pedigreeData.persons?.find(p => p.proband === 1 || p.proband === true);
    if (!proband) {
      return 'Unknown';
    }
    
    // If this is the proband
    if (pedigreePersonData.id === proband.id) {
      return 'Self';
    }
    
    // Get relationships for this person
    const relationships = this.getPersonRelationships(pedigreePersonData.id, pedigreeData);
    const probandName = `${proband.f_name} ${proband.l_name}`.trim();
    
    // Check direct relationships
    if (relationships.parents.includes(probandName)) {
      return 'Child';
    }
    if (relationships.children.includes(probandName)) {
      return 'Parent';
    }
    if (relationships.partners.includes(probandName)) {
      return 'Partner';
    }
    
    // Check for sibling relationship (same parents)
    const probandRelationships = this.getPersonRelationships(proband.id, pedigreeData);
    const commonParents = relationships.parents.filter(parent => 
      probandRelationships.parents.includes(parent)
    );
    
    if (commonParents.length > 0) {
      if (commonParents.length === probandRelationships.parents.length && 
          commonParents.length === relationships.parents.length) {
        return 'Sibling';
      } else {
        return 'Half-sibling';
      }
    }
    
    // Check for grandparent/grandchild relationships
    // If person's children include proband's parents
    const probandParentNames = probandRelationships.parents;
    if (probandParentNames.some(parent => relationships.children.includes(parent))) {
      return 'Grandparent';
    }
    
    // If person's parents include proband's children
    const probandChildrenNames = probandRelationships.children;
    if (probandChildrenNames.some(child => relationships.parents.includes(child))) {
      return 'Grandchild';
    }
    
    // Check for aunt/uncle relationship (proband's parent's siblings)
    for (const probandParent of probandParentNames) {
      const parentPerson = pedigreeData.persons?.find(p => `${p.f_name} ${p.l_name}`.trim() === probandParent);
      if (parentPerson) {
        const parentRelationships = this.getPersonRelationships(parentPerson.id, pedigreeData);
        const parentSiblings = parentRelationships.parents.filter(gp => 
          relationships.parents.includes(gp)
        );
        if (parentSiblings.length > 0) {
          return member.gender === 'male' || member.gender === 'M' ? 'Uncle' : 
                 member.gender === 'female' || member.gender === 'F' ? 'Aunt' : 'Aunt/Uncle';
        }
      }
    }
    
    // Check for cousin relationship (children of proband's aunts/uncles)
    // This is a simplified cousin check - could be extended for more complex relationships
    for (const probandParent of probandParentNames) {
      const parentPerson = pedigreeData.persons?.find(p => `${p.f_name} ${p.l_name}`.trim() === probandParent);
      if (parentPerson) {
        const parentRelationships = this.getPersonRelationships(parentPerson.id, pedigreeData);
        // Find parent's siblings
        const parentSiblings = pedigreeData.persons?.filter(p => {
          const siblingRels = this.getPersonRelationships(p.id, pedigreeData);
          return siblingRels.parents.some(gp => parentRelationships.parents.includes(gp)) && p.id !== parentPerson.id;
        });
        
        // Check if this person is a child of any parent's sibling
        for (const sibling of parentSiblings || []) {
          const siblingRels = this.getPersonRelationships(sibling.id, pedigreeData);
          const siblingName = `${sibling.f_name} ${sibling.l_name}`.trim();
          if (relationships.parents.includes(siblingName)) {
            return 'Cousin';
          }
        }
      }
    }
    
    return 'Related';
  }

  /**
   * Initialize DataTable for family members with Portuguese localization
   * @param {number} familyId - Family ID for table identification
   */
  initializeFamilyMembersDataTable(familyId) {
    const tableId = `family-members-datatable-${familyId}`;
    const tableElement = document.getElementById(tableId);
    
    if (!tableElement) {
      console.warn(`Family members DataTable element ${tableId} not found`);
      return;
    }

    // Check if jQuery and DataTables are available
    const jQueryLib = window.jq || window.jQuery;
    if (!jQueryLib || typeof jQueryLib.fn.DataTable === "undefined") {
      console.warn("jQuery or DataTables not available for family members table");
      return;
    }

    try {
      // Destroy existing DataTable if it exists
      if (jQueryLib.fn.DataTable.isDataTable(`#${tableId}`)) {
        jQueryLib(`#${tableId}`).DataTable().destroy();
      }

      // Only initialize if table has data rows (not just empty state)
      const hasData = tableElement.querySelector('tbody tr:not(.empty-state-small)');
      if (!hasData) {
        console.log(`Table ${tableId} has no data, skipping DataTable initialization`);
        return;
      }

      // Initialize DataTable
      const dataTable = jQueryLib(`#${tableId}`).DataTable({
        pageLength: 25,
        responsive: true,
        //scrollX: true,
        autoWidth: false,
        order: [[0, "asc"]], // Order by name
        language: {
          sEmptyTable: "Nenhum membro da família encontrado",
          sInfo: "Mostrando de _START_ até _END_ de _TOTAL_ membros",
          sInfoEmpty: "Mostrando 0 até 0 de 0 membros",
          sInfoFiltered: "(Filtrados de _MAX_ membros)",
          sLengthMenu: "_MENU_ membros por página",
          sLoadingRecords: "Carregando...",
          sProcessing: "Processando...",
          sZeroRecords: "Nenhum membro encontrado",
          sSearch: "Pesquisar membros",
          oPaginate: {
            sNext: "Próximo",
            sPrevious: "Anterior",
            sFirst: "Primeiro",
            sLast: "Último",
          }
        },
        columnDefs: [
          { 
            targets: [0], // Name column
            className: "text-left",
            width: "20%"
          },
          { 
            targets: [1], // Relation column  
            className: "text-center",
            width: "12%"
          },
          { 
            targets: [2], // Gender column
            className: "text-center",
            width: "10%"
          },
          { 
            targets: [3], // Molecular Variations column
            className: "text-center",
            width: "15%",
            orderable: false
          },
          { 
            targets: [4], // Disorder column
            className: "text-center", 
            width: "15%",
            orderable: false
          },
          { 
            targets: [5], // Phenotype column
            className: "text-center",
            width: "18%",
            orderable: false
          }
        ]
      });

      console.log(`Family members DataTable initialized for family ${familyId}`);
      
      // Initialize PDF viewer with auto-selection of last PDF
      this.initializeFamilyDetails(familyId);
      
    } catch (error) {
      console.error('Error initializing family members DataTable:', error);
    }
  }

  // Family member management methods
  addFamilyMember(familyId) {
    console.log('Add family member for family ID:', familyId);
    // TODO: Implement add family member functionality
    alert('Add Family Member functionality will be implemented soon!');
  }

  async viewMemberDetails(memberId) {
    console.log('View member details for member ID:', memberId);
    
    try {
      // Get member details from the database
      const member = await window.electronAPI.invoke('family-center-get-member-details', memberId);
      
      if (member.success && member.data) {
        // Show member details in a modal or dedicated view
        this.showMemberDetailsModal(member.data);
      } else {
        console.error('Failed to load member details:', member.error);
        alert('Failed to load member details');
      }
    } catch (error) {
      console.error('Error viewing member details:', error);
      alert('Error loading member details');
    }
  }

  editMember(memberId) {
    console.log('Edit member for member ID:', memberId);
    // TODO: Implement edit member functionality
    alert('Edit Member functionality will be implemented soon!');
  }

  showMemberDetailsModal(member) {
    // TODO: Implement member details modal
    alert(`Viewing details for: ${member.first_name} ${member.last_name}`);
  }

  /**
   * Get pedigree import data for a family
   * @param {number} pedigreeId - Pedigree ID to fetch data for
   * @returns {Object} Pedigree import data with persons, partnerships, disorders, genes, etc.
   */
  async getPedigreeImportData(pedigreeId) {
    if (!pedigreeId) return null;
    
    try {
      const result = await window.electronAPI.invoke('get-pedigree-import-data', pedigreeId);
      return result.success ? result.data : null;
    } catch (error) {
      console.error('Error fetching pedigree import data:', error);
      return null;
    }
  }

  /**
   * Escape HTML characters to prevent XSS
   * @param {string} text - Text to escape
   * @returns {string} HTML-escaped text
   */
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Truncate filename for display purposes
   * @param {string} filename - Original filename
   * @param {number} maxLength - Maximum length (default: 30)
   * @returns {string} Truncated filename with extension preserved
   */
  truncateFilename(filename, maxLength = 30) {
    if (!filename || filename.length <= maxLength) {
      return filename;
    }

    // Get file extension
    const lastDotIndex = filename.lastIndexOf('.');
    const extension = lastDotIndex > 0 ? filename.substring(lastDotIndex) : '';
    const nameWithoutExt = lastDotIndex > 0 ? filename.substring(0, lastDotIndex) : filename;

    // Calculate how much space we have for the name part
    const extensionLength = extension.length;
    const availableLength = maxLength - extensionLength - 3; // 3 for "..."

    if (availableLength <= 0) {
      // If extension is too long, just truncate the whole thing
      return filename.substring(0, maxLength - 3) + '...';
    }

    // Truncate the name part and add extension
    const truncatedName = nameWithoutExt.substring(0, availableLength);
    return truncatedName + '...' + extension;
  }

  /**
   * Load and display a PDF in the viewer
   * @param {string} familyId - Family ID
   * @param {string} pdfPath - Path to the PDF file
   * @param {string} filename - Display filename
   */
  loadPdfInViewer(familyId, pdfPath, filename) {
    console.log('Loading PDF in viewer:', { familyId, pdfPath, filename });
    
    const viewerSection = document.getElementById(`pdf-viewer-section-${familyId}`);
    const iframe = document.getElementById(`pdf-viewer-iframe-${familyId}`);
    const filenameSpan = document.getElementById(`pdf-viewer-filename-${familyId}`);
    
    if (viewerSection && iframe && filenameSpan) {
      // Update filename display with truncated version
      const truncatedFilename = this.truncateFilename(filename || 'Document Preview', 25);
      filenameSpan.textContent = truncatedFilename;
      filenameSpan.title = filename || 'Document Preview'; // Show full filename on hover
      
      // Set iframe source to the PDF
      iframe.src = pdfPath;
      
      // Show the viewer section
      viewerSection.style.display = 'block';
      
      // Scroll to viewer
      viewerSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      console.error('PDF viewer elements not found for family:', familyId);
    }
  }

  /**
   * Close the PDF viewer
   * @param {string} familyId - Family ID
   */
  closePdfViewer(familyId) {
    console.log('Closing PDF viewer for family:', familyId);
    
    const viewerSection = document.getElementById(`pdf-viewer-section-${familyId}`);
    const iframe = document.getElementById(`pdf-viewer-iframe-${familyId}`);
    
    if (viewerSection && iframe) {
      // Hide the viewer section
      viewerSection.style.display = 'none';
      
      // Clear iframe source to stop loading
      iframe.src = '';
    }
  }

  /**
   * Detach PDF viewer to a separate window
   * @param {string} familyId - Family ID
   */
  openPdfFullscreen(familyId) {
    console.log('Detaching PDF viewer for family:', familyId);
    
    const iframe = document.getElementById(`pdf-viewer-iframe-${familyId}`);
    const filenameSpan = document.getElementById(`pdf-viewer-filename-${familyId}`);
    
    if (iframe && iframe.src) {
      const filename = filenameSpan ? filenameSpan.textContent : 'Document';
      const fullFilename = filenameSpan ? filenameSpan.title || filename : 'Document';
      
      // Create a detached window with the PDF viewer
      const detachedWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes,toolbar=no,menubar=no,location=no,status=no');
      
      if (detachedWindow) {
        detachedWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>${this.escapeHtml(fullFilename)} - Detached Viewer</title>
            <style>
              body { 
                margin: 0; 
                padding: 10px; 
                font-family: Arial, sans-serif; 
                background-color: #f8f9fa;
              }
              .header { 
                display: flex; 
                justify-content: space-between; 
                align-items: center; 
                margin-bottom: 10px; 
                padding: 10px; 
                background-color: #ffffff; 
                border-radius: 4px; 
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
              }
              .title { 
                margin: 0; 
                font-size: 16px; 
                color: #495057;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                max-width: 600px;
              }
              .close-btn {
                background: #dc3545;
                color: white;
                border: none;
                padding: 5px 10px;
                border-radius: 3px;
                cursor: pointer;
                font-size: 12px;
                flex-shrink: 0;
                margin-left: 10px;
              }
              .close-btn:hover {
                background: #c82333;
              }
              iframe { 
                width: 100%; 
                height: calc(100vh - 80px); 
                border: 1px solid #ddd; 
                border-radius: 4px; 
                background: white;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h3 class="title" title="${this.escapeHtml(fullFilename)}">📄 ${this.escapeHtml(filename)}</h3>
              <button class="close-btn" onclick="window.close()">✕ Close</button>
            </div>
            <iframe src="${iframe.src}" frameborder="0"></iframe>
          </body>
          </html>
        `);
        detachedWindow.document.close();
        
        // Focus the new window
        detachedWindow.focus();
      }
    } else {
      console.error('No PDF loaded in viewer for family:', familyId);
      alert('No document is currently loaded in the viewer.');
    }
  }

  /**
   * Handle PDF selection from dropdown or list
   * @param {string} familyId - Family ID
   * @param {string} pdfPath - Path to the selected PDF
   * @param {string} filename - Filename to display
   */
  onPdfSelected(familyId, pdfPath, filename) {
    console.log('PDF selected:', { familyId, pdfPath, filename });
    
    if (pdfPath && pdfPath.trim() !== '') {
      this.loadPdfInViewer(familyId, pdfPath, filename);
    } else {
      this.closePdfViewer(familyId);
    }
  }

  /**
   * Handle PDF selection from dropdown
   * @param {string} familyId - Family ID
   * @param {HTMLSelectElement} selectElement - The select element
   */
  handlePdfSelection(familyId, selectElement) {
    const selectedValue = selectElement.value;
    const selectedOption = selectElement.options[selectElement.selectedIndex];
    
    // Get full filename from data attribute, fallback to displayed text
    const fullFilename = selectedOption.getAttribute('data-full-filename') || selectedOption.text;
    
    console.log('Dropdown PDF selection:', { familyId, selectedValue, fullFilename });
    
    if (selectedValue && selectedValue !== '') {
      this.onPdfSelected(familyId, selectedValue, fullFilename);
    } else {
      this.closePdfViewer(familyId);
    }
  }

  /**
   * Populate PDF selector with available documents
   * @param {string} familyId - Family ID  
   * @param {Array} pdfFiles - Array of PDF file objects {path, filename}
   * @param {boolean} autoSelectLast - Whether to auto-select the last PDF
   */
  populatePdfSelector(familyId, pdfFiles = [], autoSelectLast = true) {
    const selector = document.getElementById(`pdf-selector-${familyId}`);
    
    if (selector) {
      // Clear existing options except the first one
      while (selector.children.length > 1) {
        selector.removeChild(selector.lastChild);
      }
      
      // Add PDF files as options
      pdfFiles.forEach(pdf => {
        const option = document.createElement('option');
        option.value = pdf.path;
        // Store the full filename in a data attribute and display truncated version
        option.setAttribute('data-full-filename', pdf.filename);
        option.textContent = this.truncateFilename(pdf.filename, 35); // Slightly longer for dropdown
        selector.appendChild(option);
      });
      
      // Auto-select the last PDF if available and autoSelectLast is true
      if (autoSelectLast && pdfFiles.length > 0) {
        const lastPdf = pdfFiles[pdfFiles.length - 1];
        selector.value = lastPdf.path;
        
        // Trigger the preview for the auto-selected PDF using full filename
        this.onPdfSelected(familyId, lastPdf.path, lastPdf.filename);
      }
      
      console.log(`Populated PDF selector for family ${familyId} with ${pdfFiles.length} files, auto-selected: ${autoSelectLast}`);
    }
  }

  /**
   * Initialize family detail tab with auto-selection of last PDF
   * @param {string} familyId - Family ID
   */
  async initializeFamilyDetails(familyId) {
    console.log('Initializing family details for family:', familyId);
    
    try {
      // This method should be called after the family detail tab is loaded
      // It will fetch available PDFs and auto-select the last one
      
      // For now, we'll check if there are any options already in the selector
      // and auto-select the last one if available
      setTimeout(() => {
        const selector = document.getElementById(`pdf-selector-${familyId}`);
        if (selector && selector.options.length > 1) {
          // Select the last option (excluding the placeholder)
          const lastOption = selector.options[selector.options.length - 1];
          selector.value = lastOption.value;
          
          // Trigger the preview using the selection handler (which handles full filename)
          this.handlePdfSelection(familyId, selector);
          
          console.log('Auto-selected last PDF:', lastOption.getAttribute('data-full-filename') || lastOption.textContent);
        }
      }, 100); // Small delay to ensure DOM is ready
      
    } catch (error) {
      console.error('Error initializing family details:', error);
    }
  }
}

export default FamilyDetailsModule;