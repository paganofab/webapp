// Temporarily simplified for debugging
// import BaseModule from './baseModule';
// import i18n from '../i18n';

/**
 * Enhanced ReportModule with template support and Brazilian Portuguese localization
 * Handles family health reports, genetic counseling letters, and medical referrals
 */
class ReportModule {
  
  constructor(options = {}) {
    console.log('📄 ReportModule constructor called with options:', options);
    // super(options);
    this.options = options;
    this.moduleId = 'report-module';
    this.reports = [];
    this.currentReport = null;
    this.currentTemplate = null; // Store currently loaded template
    this.templates = new Map();
    this.templateEngine = null;
    this.initialized = false;
    
    // Initialize template system
    try {
      console.log('📄 Initializing template system...');
      this.initializeTemplateSystem();
      console.log('✅ Template system initialized');
    } catch (error) {
      console.error('❌ Error initializing template system:', error);
    }
  }

  /**
   * Escape HTML entities to prevent XSS attacks
   */
  escapeHtml(text) {
    if (!text) return '';
    if (typeof text !== 'string') {
      text = String(text);
    }
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  /**
   * Initialize the module
   */
  async initialize() {
    console.log('📄 ReportModule initialize() called');
    this.initialized = true;
    return true;
  }
  
  /**
   * Get module content
   */
  getContent() {
    console.log('📄 ReportModule getContent() called');
    return this.createReportsInterface();
  }
  
  /**
   * Create the main reports interface
   */
  createReportsInterface() {
    console.log('📄 Creating reports interface...');
    return `
      <div class="reports-module-container">
        <div class="reports-main-layout">
          <!-- Left Column: Categories -->
          <div class="reports-sidebar">
            <div class="sidebar-header">
              <h3>${this.t('reports.categories.title', 'Categorias')}</h3>
            </div>
            <div class="categories-list">
              <div class="category-item active" data-category="letters" onclick="window.pedigreeApp?.reportModule?.selectCategory('letters')">
                <div class="category-icon">
                  <i class="fa fa-envelope-o"></i>
                </div>
                <div class="category-info">
                  <h4>${this.t('reports.categories.letters', 'Cartas')}</h4>
                  <p>${this.t('reports.categories.lettersDesc', 'Encaminhamentos médicos')}</p>
                </div>
              </div>
              
              <div class="category-item" data-category="reports" onclick="window.pedigreeApp?.reportModule?.selectCategory('reports')">
                <div class="category-icon">
                  <i class="fa fa-file-text-o"></i>
                </div>
                <div class="category-info">
                  <h4>${this.t('reports.categories.reports', 'Relatórios')}</h4>
                  <p>${this.t('reports.categories.reportsDesc', 'Relatórios detalhados')}</p>
                </div>
              </div>
              
              <div class="category-item" data-category="summaries" onclick="window.pedigreeApp?.reportModule?.selectCategory('summaries')">
                <div class="category-icon">
                  <i class="fa fa-list-alt"></i>
                </div>
                <div class="category-info">
                  <h4>${this.t('reports.categories.summaries', 'Resumos')}</h4>
                  <p>${this.t('reports.categories.summariesDesc', 'Resumos familiares')}</p>
                </div>
              </div>
              
              <div class="category-item" data-category="education" onclick="window.pedigreeApp?.reportModule?.selectCategory('education')">
                <div class="category-icon">
                  <i class="fa fa-graduation-cap"></i>
                </div>
                <div class="category-info">
                  <h4>${this.t('reports.categories.education', 'Educativo')}</h4>
                  <p>${this.t('reports.categories.educationDesc', 'Material educativo')}</p>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Middle Column: Templates List -->
          <div class="templates-panel">
            <div class="panel-header">
              <h3 id="templates-title">${this.t('reports.templates.letters', 'Modelos de Cartas')}</h3>
              <button class="btn btn-primary btn-sm" onclick="window.pedigreeApp?.reportModule?.createNewTemplate()">
                <i class="fa fa-plus"></i>
               
              </button>
            </div>
            <div class="templates-list" id="templates-list">
              <!-- Templates will be dynamically loaded here -->
            </div>
          </div>
          
          <!-- Right Column: Template Editor -->
          <div class="editor-panel">
            <div class="panel-header">
              <h3 id="editor-title">${this.t('reports.editor.title', 'Editor de Modelo')}</h3>
              <div class="editor-actions">
                <button class="btn btn-secondary btn-sm" onclick="window.pedigreeApp?.reportModule?.previewTemplate()" id="preview-btn" disabled>
                  <i class="fa fa-eye"></i>
                  ${this.t('reports.editor.preview', 'Visualizar')}
                </button>
                <button class="btn btn-success btn-sm" onclick="window.pedigreeApp?.reportModule?.saveTemplate()" id="save-btn" disabled>
                  <i class="fa fa-save"></i>
                  ${this.t('reports.editor.save', 'Salvar')}
                </button>
              </div>
            </div>
            <div class="editor-content" id="editor-content">
              <div class="editor-placeholder">
                <i class="fa fa-edit"></i>
                <h4>${this.t('reports.editor.placeholder.title', 'Selecione um modelo')}</h4>
                <p>${this.t('reports.editor.placeholder.message', 'Escolha um modelo na lista ou crie um novo para começar a editar.')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  /**
   * Select a category and load its templates
   */
  selectCategory(categoryId) {
    console.log('Selecting category:', categoryId);
    
    // Update active state
    document.querySelectorAll('.category-item').forEach(item => {
      item.classList.remove('active');
    });
    document.querySelector(`[data-category="${categoryId}"]`).classList.add('active');
    
    // Update templates title
    const titles = {
      letters: this.t('reports.templates.letters', 'Modelos de Cartas'),
      reports: this.t('reports.templates.reports', 'Modelos de Relatórios'),
      summaries: this.t('reports.templates.summaries', 'Modelos de Resumos'),
      education: this.t('reports.templates.education', 'Material Educativo')
    };
    
    document.getElementById('templates-title').textContent = titles[categoryId] || titles.letters;
    
    // Load templates for this category
    this.loadTemplatesForCategory(categoryId);
    
    // Clear editor
    this.clearEditor();
  }
  
  /**
   * Load templates for selected category
   */
  /**
   * Load templates for the selected category from database
   */
  async loadTemplatesForCategory(categoryId) {
    console.log('Loading templates for category:', categoryId);
    
    try {
      // Show loading state
      const templatesList = document.getElementById('templates-list');
      templatesList.innerHTML = `
        <div class="template-loading">
          <i class="fa fa-spinner"></i>
          Carregando modelos...
        </div>
      `;
      
      // Get templates from database
      const result = await window.electronAPI.reportTemplates.getTemplates(categoryId);
      
      if (result.success) {
        this.displayTemplates(result.templates, categoryId);
      } else {
        console.error('Error loading templates:', result.error);
        templatesList.innerHTML = `
          <div class="template-error">
            <i class="fa fa-exclamation-triangle"></i>
            <p>Erro ao carregar modelos: ${result.error}</p>
          </div>
        `;
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      document.getElementById('templates-list').innerHTML = `
        <div class="template-error">
          <i class="fa fa-exclamation-triangle"></i>
          <p>Erro ao conectar com o banco de dados</p>
        </div>
      `;
    }
  }
  
  /**
   * Display templates in the UI
   */
  displayTemplates(templates, categoryId) {
    const templatesList = document.getElementById('templates-list');
    
    if (templates.length === 0) {
      templatesList.innerHTML = `
        <div class="template-placeholder" style="text-align: center; padding: 40px; color: #7f8c8d;">
          <i class="fa fa-file-o" style="font-size: 48px; margin-bottom: 15px;"></i>
          <p>Nenhum modelo encontrado nesta categoria.</p>
          <button class="btn btn-primary btn-sm" onclick="window.pedigreeApp?.reportModule?.createNewTemplate()">
            Criar Novo Modelo
          </button>
        </div>
      `;
      return;
    }
    
    let templatesHTML = '';
    templates.forEach(template => {
      const statusBadge = template.status === 'active' ? 'active' : 'draft';
      const statusText = template.status === 'active' ? 'Ativo' : 'Rascunho';
      const isSystem = template.is_system ? ' (Sistema)' : '';
      const lastModified = new Date(template.updated_at).toLocaleDateString('pt-BR');
      const iconClass = template.icon && template.icon.startsWith('fa-') ? template.icon : `fa-${template.icon || 'file-text-o'}`;
      
      templatesHTML += `
        <div class="template-item" onclick="window.pedigreeApp?.reportModule?.loadTemplate('${template.template_id}')">
          <div class="template-icon">
            <i class="fa ${iconClass}"></i>
          </div>
          <div class="template-info">
            <h4>${template.name}${isSystem}</h4>
            <p>${template.description || 'Sem descrição'}</p>
            <div class="template-meta">
              <span class="template-date">${lastModified}</span>
              <span class="template-badge ${statusBadge}">${statusText}</span>
            </div>
          </div>
          ${!template.is_system ? `
          <div class="template-actions">
            <button class="btn-icon" onclick="event.stopPropagation(); window.pedigreeApp?.reportModule?.editTemplate('${template.template_id}')" title="Editar">
              <i class="fa fa-edit"></i>
            </button>
            <button class="btn-icon" onclick="event.stopPropagation(); window.pedigreeApp?.reportModule?.duplicateTemplate('${template.template_id}')" title="Duplicar">
              <i class="fa fa-copy"></i>
            </button>
            <button class="btn-icon danger" onclick="event.stopPropagation(); window.pedigreeApp?.reportModule?.deleteTemplate('${template.template_id}')" title="Excluir">
              <i class="fa fa-trash"></i>
            </button>
          </div>
          ` : ''}
        </div>
      `;
    });
    
    templatesList.innerHTML = templatesHTML;
  }

  /**
   * Get templates for category - now loads from database
   */
  async getTemplatesForCategory(categoryId) {
    try {
      const result = await window.electronAPI.reportTemplates.getTemplates(categoryId);
      return result.success ? result.templates : [];
    } catch (error) {
      console.error('Error getting templates for category:', error);
      return [];
    }
  }
  
  /**
   * Load a template into the editor from database
   */
  async loadTemplate(templateId) {
    console.log('Loading template:', templateId);
    
    try {
      // Update active template state
      document.querySelectorAll('.template-item').forEach(item => {
        item.classList.remove('active');
      });
      if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
      }
      
      // Show loading state
      const editorContent = document.getElementById('editor-content');
      editorContent.innerHTML = `
        <div class="template-loading">
          <i class="fa fa-spinner"></i>
          Carregando modelo...
        </div>
      `;
      
      // Get template content from database
      const result = await window.electronAPI.reportTemplates.getTemplateContent(templateId);
      
      if (result.success && result.template) {
        this.currentTemplate = result.template;
        this.displayTemplateEditor(result.template);
        
        // Enable editor buttons
        document.getElementById('preview-btn').disabled = false;
        document.getElementById('save-btn').disabled = false;
      } else {
        console.error('Error loading template content:', result.error);
        editorContent.innerHTML = `
          <div class="template-error">
            <i class="fa fa-exclamation-triangle"></i>
            <p>Erro ao carregar modelo: ${result.error}</p>
          </div>
        `;
      }
    } catch (error) {
      console.error('Error loading template:', error);
      document.getElementById('editor-content').innerHTML = `
        <div class="template-error">
          <i class="fa fa-exclamation-triangle"></i>
          <p>Erro ao conectar com o banco de dados</p>
        </div>
      `;
    }
  }
  
  /**
   * Display template editor with loaded content and real doctor data
   */
  async displayTemplateEditor(template) {
    const editorContent = document.getElementById('editor-content');
    
    // Get current doctor information for variable buttons
    let doctorVariables = {};
    try {
      const doctorResult = await window.electronAPI.doctorInfo.getDoctorVariables();
      if (doctorResult.success) {
        doctorVariables = doctorResult.variables;
      }
    } catch (error) {
      console.error('Error getting doctor variables:', error);
    }
    
    editorContent.innerHTML = `
      <div class="template-editor">
        <div class="template-info-form">
          <div class="form-group">
            <label>Nome do Modelo:</label>
            <input type="text" id="template-name" class="form-control" value="${template.name}" ${template.is_system ? 'readonly' : ''}>
          </div>
          <div class="form-group">
            <label>Descrição:</label>
            <input type="text" id="template-description" class="form-control" value="${template.description || ''}" ${template.is_system ? 'readonly' : ''}>
          </div>
        </div>
        
        <!-- Family and Patient Selection -->
        <div class="patient-selection-form">
          <h5><i class="fa fa-users"></i> Seleção de Família e Paciente</h5>
          <div class="selection-row">
            <div class="form-group">
              <label>Família:</label>
              <select id="family-select" class="form-control" onchange="window.pedigreeApp?.reportModule?.onFamilyChange(this.value)">
                <option value="">Selecione uma família...</option>
              </select>
            </div>
            <div class="form-group">
              <label>Paciente:</label>
              <select id="patient-select" class="form-control" onchange="window.pedigreeApp?.reportModule?.onPatientChange(this.value)" disabled>
                <option value="">Primeiro selecione uma família</option>
              </select>
            </div>
          </div>
          <div id="patient-info" class="patient-info-display" style="display: none;">
            <!-- Patient information will be displayed here -->
          </div>
        </div>
        
        <div class="editor-toolbar-compact">
          <button class="btn btn-primary btn-sm" onclick="window.pedigreeApp?.reportModule?.showVariablesModal()" id="show-variables-btn">
            <i class="fa fa-tags"></i> Inserir Variáveis
          </button>
        </div>
        
        <textarea class="template-textarea" id="template-content" placeholder="Digite o conteúdo do modelo aqui..." ${template.is_system ? 'readonly' : ''}>${template.content}</textarea>
        
        <div class="editor-footer">
          ${doctorVariables.doctorName ? '' : '<div class="alert alert-info mt-2"><strong>Dica:</strong> Configure as informações do médico nas Configurações para personalizar os modelos automaticamente.</div>'}
        </div>
      </div>
    `;
    
    // Load families for selection
    await this.loadFamiliesForSelection();
  }
  
  /**
   * Get button text for variable with real doctor data
   */
  getVariableButtonText(variable, doctorVariables = {}) {
    const variableNames = {
      'patientName': 'Nome do Paciente',
      'patientAge': 'Idade do Paciente',
      'doctorName': doctorVariables.doctorName || 'Nome do Médico',
      'doctorCRM': doctorVariables.doctorCRM || 'CRM',
      'doctorSpecialty': doctorVariables.doctorSpecialty || 'Especialidade',
      'date': 'Data',
      'familyHistory': 'Histórico Familiar',
      'clinicName': doctorVariables.clinicName || 'Nome da Clínica',
      'clinicAddress': 'Endereço da Clínica',
      'clinicPhone': doctorVariables.clinicPhone || 'Telefone',
      'clinicEmail': doctorVariables.clinicEmail || 'Email da Clínica',
      'consultationDate': 'Data da Consulta',
      'consultationHours': 'Horário de Atendimento',
      'referralReason': 'Motivo do Encaminhamento'
    };
    return variableNames[variable] || variable.charAt(0).toUpperCase() + variable.slice(1);
  }
  
  /**
   * Get icon for variable
   */
  getVariableIcon(variable) {
    const icons = {
      'patientName': 'fa-user',
      'patientAge': 'fa-birthday-cake',
      'doctorName': 'fa-user-md',
      'doctorCRM': 'fa-id-card',
      'doctorSpecialty': 'fa-stethoscope',
      'date': 'fa-calendar',
      'familyHistory': 'fa-users',
      'clinicName': 'fa-hospital-o',
      'clinicAddress': 'fa-map-marker',
      'clinicPhone': 'fa-phone',
      'clinicEmail': 'fa-envelope',
      'consultationDate': 'fa-calendar-check-o',
      'consultationHours': 'fa-clock-o',
      'referralReason': 'fa-file-text'
    };
    return icons[variable] || 'fa-tag';
  }
  
  /**
   * Get sample template content
   */
  /**
   * Clear the editor
   */
  clearEditor() {
    const editorContent = document.getElementById('editor-content');
    editorContent.innerHTML = `
      <div class="editor-placeholder">
        <i class="fa fa-edit"></i>
        <h4>${this.t('reports.editor.placeholder.title', 'Selecione um modelo')}</h4>
        <p>${this.t('reports.editor.placeholder.message', 'Escolha um modelo na lista ou crie um novo para começar a editar.')}</p>
      </div>
    `;
    
    // Disable editor buttons
    document.getElementById('preview-btn').disabled = true;
    document.getElementById('save-btn').disabled = true;
    
    // Clear current template
    this.currentTemplate = null;
  }
  
  /**
   * Create a new template
   */
  createNewTemplate() {
    console.log('Creating new template');
    this.clearEditor();
    
    // Enable editor buttons
    document.getElementById('preview-btn').disabled = false;
    document.getElementById('save-btn').disabled = false;
    
    // Load empty template into editor
    const editorContent = document.getElementById('editor-content');
    editorContent.innerHTML = `
      <div class="template-editor">
        <div class="template-info-form">
          <div class="form-group">
            <label>Nome do Modelo:</label>
            <input type="text" id="template-name" class="form-control" placeholder="Digite o nome do modelo...">
          </div>
          <div class="form-group">
            <label>Descrição:</label>
            <input type="text" id="template-description" class="form-control" placeholder="Breve descrição do modelo...">
          </div>
        </div>
        <div class="editor-toolbar">
          <button class="btn btn-sm" onclick="window.pedigreeApp?.reportModule?.insertVariable('patientName')">
            <i class="fa fa-user"></i> Nome do Paciente
          </button>
          <button class="btn btn-sm" onclick="window.pedigreeApp?.reportModule?.insertVariable('doctorName')">
            <i class="fa fa-user-md"></i> Nome do Médico
          </button>
          <button class="btn btn-sm" onclick="window.pedigreeApp?.reportModule?.insertVariable('doctorCRM')">
            <i class="fa fa-id-card"></i> CRM
          </button>
          <button class="btn btn-sm" onclick="window.pedigreeApp?.reportModule?.insertVariable('clinicName')">
            <i class="fa fa-hospital-o"></i> Nome da Clínica
          </button>
          <button class="btn btn-sm" onclick="window.pedigreeApp?.reportModule?.insertVariable('clinicAddress')">
            <i class="fa fa-map-marker"></i> Endereço da Clínica
          </button>
          <button class="btn btn-sm" onclick="window.pedigreeApp?.reportModule?.insertVariable('clinicPhone')">
            <i class="fa fa-phone"></i> Telefone
          </button>
          <button class="btn btn-sm" onclick="window.pedigreeApp?.reportModule?.insertVariable('date')">
            <i class="fa fa-calendar"></i> Data
          </button>
          <button class="btn btn-sm" onclick="window.pedigreeApp?.reportModule?.insertVariable('familyHistory')">
            <i class="fa fa-users"></i> Histórico Familiar
          </button>
        </div>
        <textarea class="template-textarea" id="template-content" placeholder="Digite o conteúdo do modelo aqui..."></textarea>
      </div>
    `;
  }
  
  /**
   * Insert variable into template
   */
  insertVariable(variableName) {
    const textarea = document.getElementById('template-content');
    if (textarea) {
      const cursorPos = textarea.selectionStart;
      const textBefore = textarea.value.substring(0, cursorPos);
      const textAfter = textarea.value.substring(cursorPos);
      const variable = `{{${variableName}}}`;
      
      textarea.value = textBefore + variable + textAfter;
      textarea.selectionStart = textarea.selectionEnd = cursorPos + variable.length;
      textarea.focus();
    }
  }
  
  /**
   * Preview template with real data
   */
  async previewTemplate() {
    console.log('Previewing template');
    const content = document.getElementById('template-content')?.value || '';
    
    if (!content.trim()) {
      alert('Por favor, adicione conteúdo ao modelo antes de visualizar.');
      return;
    }
    
    // Get sample data for preview
    const sampleData = await this.getSampleDataForPreview();
    
    // Process template with sample data
    const processedContent = await this.processTemplateContent(content, sampleData);
    
    // Create preview modal
    const modal = document.createElement('div');
    modal.className = 'template-preview-modal';
    modal.innerHTML = `
      <div class="modal-backdrop" onclick="this.parentElement.remove()"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h3>Visualização do Modelo</h3>
          <button class="modal-close" onclick="this.closest('.template-preview-modal').remove()">×</button>
        </div>
        <div class="modal-body">
          <div class="preview-content">${processedContent.replace(/\n/g, '<br>')}</div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="this.closest('.template-preview-modal').remove()">Fechar</button>
          <button class="btn btn-primary" onclick="window.pedigreeApp?.reportModule?.generateReport()">Gerar Relatório</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
  }

  /**
   * Get sample data for template preview
   */
  async getSampleDataForPreview() {
    let doctorData = {};
    
    try {
      const result = await window.electronAPI.doctorInfo.getDoctorVariables();
      if (result.success) {
        doctorData = result.variables;
      }
    } catch (error) {
      console.error('Error getting doctor data for preview:', error);
    }
    
    return {
      // Patient data (sample)
      patientName: 'João da Silva',
      patientAge: '35 anos',
      
      // Doctor data (real from database)
      doctorName: doctorData.doctorName || 'Dr. [Nome do Médico]',
      doctorCRM: doctorData.doctorCRM || 'CRM [Número]/[Estado]',
      doctorSpecialty: doctorData.doctorSpecialty || '[Especialidade]',
      
      // Clinic data (real from database)
      clinicName: doctorData.clinicName || '[Nome da Clínica]',
      clinicAddress: doctorData.clinicAddress || '[Endereço da Clínica]',
      clinicPhone: doctorData.clinicPhone || '[Telefone da Clínica]',
      clinicEmail: doctorData.clinicEmail || '[Email da Clínica]',
      
      // General data
      date: new Date().toLocaleDateString('pt-BR'),
      consultationDate: new Date().toLocaleDateString('pt-BR'),
      consultationHours: doctorData.consultationHours || '[Horários de Atendimento]',
      
      // Sample family data
      familyHistory: 'Histórico familiar positivo para diabetes (avó materna e tio materno) e hipertensão (pai e avô paterno).',
      referralReason: 'Avaliação genética para síndrome de predisposição ao câncer.'
    };
  }

  /**
   * Process template content with variable substitution
   */
  async processTemplateContent(content, data) {
    let processedContent = content;
    
    // Simple variable replacement {{variable}}
    Object.keys(data).forEach(key => {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      processedContent = processedContent.replace(regex, data[key] || `[${key}]`);
    });
    
    // Handle any remaining unmatched variables
    processedContent = processedContent.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
      return `[${varName.trim()}]`;
    });
    
    return processedContent;
  }

  /**
   * Generate a final report from template
   */
  async generateReport() {
    if (!this.currentTemplate) {
      alert('Nenhum modelo selecionado para gerar relatório.');
      return;
    }
    
    try {
      const content = document.getElementById('template-content')?.value || '';
      const templateName = document.getElementById('template-name')?.value || 'Relatório';
      
      // Get real data for report generation
      const reportData = await this.getReportData();
      
      // Process template content
      const processedContent = await this.processTemplateContent(content, reportData);
      
      // Save generated report to database
      const reportResult = await this.saveGeneratedReport({
        templateId: this.currentTemplate.template_id,
        templateName: templateName,
        content: processedContent,
        variables: reportData
      });
      
      if (reportResult.success) {
        alert('Relatório gerado e salvo com sucesso!');
        // Close any preview modal
        const modal = document.querySelector('.template-preview-modal');
        if (modal) modal.remove();
      } else {
        alert('Erro ao salvar relatório: ' + reportResult.error);
      }
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Erro ao gerar relatório. Verifique sua conexão.');
    }
  }

  /**
   * Get real data for report generation (can be enhanced to include patient data)
   */
  async getReportData() {
    let doctorData = {};
    
    try {
      const result = await window.electronAPI.doctorInfo.getDoctorVariables();
      if (result.success) {
        doctorData = result.variables;
      }
    } catch (error) {
      console.error('Error getting doctor data for report:', error);
    }
    
    return {
      // Patient data (would come from pedigree/patient selection)
      patientName: 'João da Silva', // TODO: Get from selected patient
      patientAge: '35 anos', // TODO: Calculate from patient data
      
      // Doctor data (real from database)
      doctorName: doctorData.doctorName || 'Nome do Médico',
      doctorCRM: doctorData.doctorCRM || 'CRM',
      doctorSpecialty: doctorData.doctorSpecialty || 'Especialidade',
      doctorTitle: doctorData.doctorTitle || 'Dr.',
      fullDoctorName: doctorData.fullDoctorName || 'Dr. Nome do Médico',
      doctorSignature: doctorData.doctorSignature || 'Dr. Nome do Médico\nCRM\nEspecialidade',
      
      // Clinic data (real from database)
      clinicName: doctorData.clinicName || 'Nome da Clínica',
      clinicAddress: doctorData.clinicAddress || 'Endereço da Clínica',
      clinicPhone: doctorData.clinicPhone || 'Telefone da Clínica',
      clinicEmail: doctorData.clinicEmail || 'Email da Clínica',
      doctorEmail: doctorData.doctorEmail || doctorData.clinicEmail || 'Email do Médico',
      
      // General data
      date: new Date().toLocaleDateString('pt-BR'),
      consultationDate: new Date().toLocaleDateString('pt-BR'),
      consultationHours: doctorData.consultationHours || 'Horários de Atendimento',
      
      // Family data (would come from pedigree analysis)
      familyHistory: 'Histórico familiar será obtido do heredograma selecionado.',
      referralReason: 'Motivo do encaminhamento será especificado pelo usuário.'
    };
  }

  /**
   * Save generated report to database
   */
  async saveGeneratedReport(reportData) {
    try {
      const result = await window.electronAPI.reportTemplates.saveGeneratedReport({
        template_id: reportData.templateId,
        name: `${reportData.templateName} - ${new Date().toLocaleDateString('pt-BR')}`,
        content: reportData.content,
        variables: JSON.stringify(reportData.variables),
        status: 'generated',
        generated_by: 'user'
      });
      
      return result;
    } catch (error) {
      console.error('Error saving generated report:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Save template
   */
  /**
   * Save template to database
   */
  async saveTemplate() {
    console.log('Saving template');
    
    try {
      const name = document.getElementById('template-name')?.value;
      const description = document.getElementById('template-description')?.value;
      const content = document.getElementById('template-content')?.value;
      
      if (!name || !content) {
        alert('Por favor, preencha o nome e o conteúdo do modelo antes de salvar.');
        return;
      }
      
      // Get current category from the active category item
      const activeCategory = document.querySelector('.category-item.active');
      const category = activeCategory ? activeCategory.getAttribute('data-category') : 'letters';
      
      const templateData = {
        templateId: this.currentTemplate?.template_id || null,
        name: name.trim(),
        description: description ? description.trim() : '',
        content: content.trim(),
        category: category,
        status: 'active',
        createdBy: 'user'
      };
      
      // Show saving state
      const saveBtn = document.getElementById('save-btn');
      const originalText = saveBtn.innerHTML;
      saveBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Salvando...';
      saveBtn.disabled = true;
      
      // Save to database
      const result = await window.electronAPI.reportTemplates.saveTemplate(templateData);
      
      if (result.success) {
        alert('Modelo salvo com sucesso!');
        
        // Update current template
        if (this.currentTemplate) {
          this.currentTemplate.template_id = result.templateId;
          this.currentTemplate.name = name;
          this.currentTemplate.description = description;
        }
        
        // Refresh the templates list to show the saved template
        this.loadTemplatesForCategory(category);
      } else {
        console.error('Error saving template:', result.error);
        alert('Erro ao salvar modelo: ' + result.error);
      }
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Erro ao salvar modelo. Verifique sua conexão.');
    } finally {
      // Restore save button
      const saveBtn = document.getElementById('save-btn');
      saveBtn.innerHTML = '<i class="fa fa-save"></i> Salvar';
      saveBtn.disabled = false;
    }
  }
  
  /**
   * Edit existing template
   */
  async editTemplate(templateId) {
    console.log('Editing template:', templateId);
    await this.loadTemplate(templateId);
  }
  
  /**
   * Duplicate template
   */
  async duplicateTemplate(templateId) {
    console.log('Duplicating template:', templateId);
    
    try {
      // Get the original template
      const result = await window.electronAPI.reportTemplates.getTemplateContent(templateId);
      
      if (result.success && result.template) {
        const original = result.template;
        
        // Create new template data with modified name
        const duplicatedTemplate = {
          templateId: null, // Let it generate a new ID
          name: `${original.name} (Cópia)`,
          description: `Cópia de: ${original.description || original.name}`,
          content: original.content,
          category: original.category,
          status: 'draft',
          createdBy: 'user'
        };
        
        // Save the duplicated template
        const saveResult = await window.electronAPI.reportTemplates.saveTemplate(duplicatedTemplate);
        
        if (saveResult.success) {
          alert('Modelo duplicado com sucesso!');
          // Refresh the templates list
          this.loadTemplatesForCategory(original.category);
        } else {
          alert('Erro ao duplicar modelo: ' + saveResult.error);
        }
      } else {
        alert('Erro ao carregar modelo para duplicação');
      }
    } catch (error) {
      console.error('Error duplicating template:', error);
      alert('Erro ao duplicar modelo. Verifique sua conexão.');
    }
  }
  
  /**
   * Delete template
   */
  /**
   * Delete template from database
   */
  async deleteTemplate(templateId) {
    if (!confirm('Tem certeza que deseja excluir este modelo? Esta ação não pode ser desfeita.')) {
      return;
    }
    
    try {
      console.log('Deleting template:', templateId);
      
      // Delete from database
      const result = await window.electronAPI.reportTemplates.deleteTemplate(templateId);
      
      if (result.success) {
        alert('Modelo excluído com sucesso!');
        
        // Clear editor if this template was being edited
        if (this.currentTemplate && this.currentTemplate.template_id === templateId) {
          this.clearEditor();
          this.currentTemplate = null;
        }
        
        // Refresh the templates list
        const activeCategory = document.querySelector('.category-item.active');
        const category = activeCategory ? activeCategory.getAttribute('data-category') : 'letters';
        this.loadTemplatesForCategory(category);
      } else {
        console.error('Error deleting template:', result.error);
        alert('Erro ao excluir modelo: ' + result.error);
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Erro ao excluir modelo. Verifique sua conexão.');
    }
  }
  
  /**
   * Translation helper
   */
  t(key, fallback = key) {
    // Use global i18n if available
    if (window.i18n && typeof window.i18n.t === 'function') {
      return window.i18n.t(key, fallback);
    }
    return fallback;
  }
  
  /**
   * Initialize template system with Handlebars and i18n integration
   */
  async initializeTemplateSystem() {
    try {
      // Try to load Handlebars
      console.log('📄 Loading Handlebars...');
      const Handlebars = await this.loadHandlebars();
      this.templateEngine = Handlebars;
      
      // Register i18n helper for templates only if registerHelper is available
      if (this.templateEngine && typeof this.templateEngine.registerHelper === 'function') {
        console.log('📄 Registering Handlebars helpers...');
        
        this.templateEngine.registerHelper('t', (key, options) => {
          return this.t(key, key);
        });
        
        // Register Brazilian date formatting helper
        this.templateEngine.registerHelper('dateFormat', (date, format = 'pt-BR') => {
          if (!date) return '';
          return new Date(date).toLocaleDateString(format);
        });
        
        // Register conditional helpers
        this.templateEngine.registerHelper('ifEquals', function(arg1, arg2, options) {
          return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
        });
        
        // Register Brazilian currency helper
        this.templateEngine.registerHelper('currency', (value) => {
          if (!value) return 'R$ 0,00';
          return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
          }).format(value);
        });
        
        console.log('✅ Handlebars helpers registered successfully');
      } else {
        console.warn('⚠️ Handlebars registerHelper not available, using fallback');
      }
      
      console.log('✅ Template system initialized with Brazilian localization');
      
    } catch (error) {
      console.error('❌ Failed to initialize template system:', error);
      // Fallback to simple string replacement
      this.templateEngine = this.createFallbackTemplateEngine();
      console.log('✅ Using fallback template engine');
    }
  }
  
  /**
   * Load Handlebars dynamically for Electron compatibility
   */
  async loadHandlebars() {
    try {
      // Try to load from node_modules
      if (typeof require !== 'undefined') {
        return require('handlebars');
      }
      
      // Fallback for web environments
      if (typeof window !== 'undefined' && window.Handlebars) {
        return window.Handlebars;
      }
      
      throw new Error('Handlebars not available');
    } catch (error) {
      console.warn('Handlebars not available, using fallback template engine');
      return this.createFallbackTemplateEngine();
    }
  }
  
  /**
   * Create fallback template engine for environments without Handlebars
   */
  createFallbackTemplateEngine() {
    return {
      compile: (template) => {
        return (data) => {
          let result = template;
          
          // Simple variable replacement {{variable}}
          result = result.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
            const keys = key.trim().split('.');
            let value = data;
            
            for (const k of keys) {
              if (value && typeof value === 'object' && k in value) {
                value = value[k];
              } else {
                return match; // Return original if not found
              }
            }
            
            return value || '';
          });
          
          // Simple i18n replacement {{t 'key'}}
          result = result.replace(/\{\{t\s+['"]([^'"]+)['"]\}\}/g, (match, key) => {
            return i18n.t(key, key);
          });
          
          return result;
        };
      },
      registerHelper: () => {} // No-op for compatibility
    };
  }
  
  /**
   * Get module title with i18n support
   */
  getModuleTitle() {
    return i18n.t('modules.reports.title', 'Relatórios e Cartas Médicas');
  }
  
  /**
   * Setup event handlers with i18n support
   */
  setupEventHandlers() {
    super.setupEventHandlers();
    
    // Add header actions with Brazilian Portuguese labels
    this.addHeaderAction(
      i18n.t('reports.actions.newReport', 'Novo Relatório'), 
      'fa-plus', 
      this.createNewReport.bind(this)
    );
    this.addHeaderAction(
      i18n.t('reports.actions.exportPDF', 'Exportar PDF'), 
      'fa-file-pdf-o', 
      this.exportToPDF.bind(this)
    );
    this.addHeaderAction(
      i18n.t('reports.actions.manageTemplates', 'Gerenciar Modelos'), 
      'fa-cogs', 
      this.manageTemplates.bind(this)
    );
  }
  
  /**
   * Called when module is shown
   */
  onShow() {
    super.onShow();
    this.loadReportsList();
  }
  
  /**
   * Load list of available reports
   */
  loadReportsList() {
    this.clearContent();
    
    if (!this.isBackendAvailable()) {
      this.showError('Database not available. Reports require database connection.');
      return;
    }
    
    this.showLoading('Loading reports...');
    
    // Simulate loading reports from database
    setTimeout(() => {
      this.clearContent();
      this.displayReportsList();
    }, 500);
  }
  
  /**
   * Display the reports list interface
   */
  displayReportsList() {
    const reportsSection = new Element('div', {'class': 'reports-section'});
    
    // Reports grid
    const reportsGrid = new Element('div', {'class': 'reports-grid'});
    
    // Brazilian medical report types with i18n support
    const reportTypes = [
      {
        id: 'genetic-referral-letter',
        title: i18n.t('reports.types.geneticReferral.title', 'Carta de Encaminhamento Genético'),
        description: i18n.t('reports.types.geneticReferral.description', 'Carta formal para encaminhamento a geneticista com histórico familiar'),
        icon: 'fa-envelope-o',
        color: '#3498db',
        category: 'letters'
      },
      {
        id: 'genetic-counseling-report',
        title: i18n.t('reports.types.counselingReport.title', 'Relatório de Aconselhamento Genético'),
        description: i18n.t('reports.types.counselingReport.description', 'Relatório detalhado da consulta de aconselhamento genético'),
        icon: 'fa-file-text-o',
        color: '#2ecc71',
        category: 'reports'
      },
      {
        id: 'family-history-summary',
        title: i18n.t('reports.types.familyHistory.title', 'Resumo do Histórico Familiar'),
        description: i18n.t('reports.types.familyHistory.description', 'Sumário executivo do histórico médico familiar'),
        icon: 'fa-users',
        color: '#9b59b6',
        category: 'summaries'
      },
      {
        id: 'risk-assessment-letter',
        title: i18n.t('reports.types.riskAssessment.title', 'Carta de Avaliação de Risco'),
        description: i18n.t('reports.types.riskAssessment.description', 'Avaliação de riscos genéticos para paciente e família'),
        icon: 'fa-exclamation-triangle',
        color: '#e74c3c',
        category: 'assessments'
      },
      {
        id: 'patient-education-material',
        title: i18n.t('reports.types.patientEducation.title', 'Material Educativo'),
        description: i18n.t('reports.types.patientEducation.description', 'Material informativo personalizado para o paciente'),
        icon: 'fa-graduation-cap',
        color: '#f39c12',
        category: 'education'
      },
      {
        id: 'pedigree-chart-report',
        title: i18n.t('reports.types.pedigreeChart.title', 'Heredograma Comentado'),
        description: i18n.t('reports.types.pedigreeChart.description', 'Heredograma com anotações médicas e análise genética'),
        icon: 'fa-sitemap',
        color: '#1abc9c',
        category: 'charts'
      }
    ];
    
    reportTypes.forEach(reportType => {
      const reportCard = this.createReportCard(reportType);
      reportsGrid.insert(reportCard);
    });
    
    reportsSection.insert(new Element('h2').update(i18n.t('reports.availableReports', 'Relatórios Disponíveis')));
    reportsSection.insert(reportsGrid);
    
    // Recent reports section
    const recentSection = new Element('div', {'class': 'recent-reports-section'});
    recentSection.insert(new Element('h2').update(i18n.t('reports.recentReports', 'Relatórios Recentes')));
    recentSection.insert(this.createRecentReportsList());
    
    this.contentElement.insert(reportsSection);
    this.contentElement.insert(recentSection);
  }
  
  /**
   * Create a report type card
   */
  createReportCard(reportType) {
    const card = new Element('div', {
      'class': 'report-card',
      'data-report-type': reportType.id
    });
    
    const cardHeader = new Element('div', {'class': 'report-card-header'});
    cardHeader.setStyle({backgroundColor: reportType.color});
    
    const icon = new Element('i', {'class': 'fa ' + reportType.icon + ' fa-2x'});
    cardHeader.insert(icon);
    
    const cardBody = new Element('div', {'class': 'report-card-body'});
    cardBody.insert(new Element('h3').update(reportType.title));
    cardBody.insert(new Element('p').update(reportType.description));
    
    const cardActions = new Element('div', {'class': 'report-card-actions'});
    const generateBtn = new Element('button', {
      'class': 'btn btn-primary'
    });
    generateBtn.insert('Generate Report');
    generateBtn.observe('click', () => this.generateReport(reportType.id));
    
    cardActions.insert(generateBtn);
    cardBody.insert(cardActions);
    
    card.insert(cardHeader);
    card.insert(cardBody);
    
    return card;
  }
  
  /**
   * Create recent reports list
   */
  createRecentReportsList() {
    const recentList = new Element('div', {'class': 'recent-reports-list'});
    
    // Sample recent reports (would come from database)
    const recentReports = [
      {
        id: 1,
        title: 'Smith Family Health Summary',
        type: 'family-summary',
        createdAt: '2025-01-20',
        status: 'completed'
      },
      {
        id: 2,
        title: 'Johnson Genetic Risk Analysis',
        type: 'genetic-risk',
        createdAt: '2025-01-18',
        status: 'completed'
      },
      {
        id: 3,
        title: 'Brown Family Pedigree',
        type: 'pedigree-chart',
        createdAt: '2025-01-15',
        status: 'completed'
      }
    ];
    
    if (recentReports.length === 0) {
      recentList.insert(new Element('p', {'class': 'no-reports'})
        .update('No recent reports. Generate your first report above.'));
    } else {
      const table = new Element('table', {'class': 'reports-table table table-striped'});
      
      // Table header
      const thead = new Element('thead');
      const headerRow = new Element('tr');
      ['Report Title', 'Type', 'Created', 'Status', 'Actions'].forEach(header => {
        headerRow.insert(new Element('th').update(header));
      });
      thead.insert(headerRow);
      table.insert(thead);
      
      // Table body
      const tbody = new Element('tbody');
      recentReports.forEach(report => {
        const row = new Element('tr');
        row.insert(new Element('td').update(report.title));
        row.insert(new Element('td').update(this.getReportTypeName(report.type)));
        row.insert(new Element('td').update(report.createdAt));
        row.insert(new Element('td').update(
          new Element('span', {'class': 'status-badge status-' + report.status})
            .update(report.status)
        ));
        
        // Actions
        const actionsCell = new Element('td');
        const viewBtn = new Element('button', {'class': 'btn btn-sm btn-outline-primary'});
        viewBtn.insert('View');
        viewBtn.observe('click', () => this.viewReport(report.id));
        actionsCell.insert(viewBtn);
        row.insert(actionsCell);
        
        tbody.insert(row);
      });
      table.insert(tbody);
      
      recentList.insert(table);
    }
    
    return recentList;
  }
  
  /**
   * Get human-readable report type name
   */
  getReportTypeName(reportType) {
    const typeNames = {
      'family-summary': 'Family Summary',
      'genetic-risk': 'Genetic Risk',
      'pedigree-chart': 'Pedigree Chart',
      'carrier-analysis': 'Carrier Analysis'
    };
    return typeNames[reportType] || reportType;
  }
  
  /**
   * Generate a new report
   */
  generateReport(reportType) {
    console.log('Generating report:', reportType);
    
    this.clearContent();
    this.showLoading('Generating ' + this.getReportTypeName(reportType) + '...');
    
    // Simulate report generation
    setTimeout(() => {
      this.displayReportContent(reportType);
    }, 2000);
  }
  
  /**
   * Display generated report content
   */
  displayReportContent(reportType) {
    this.clearContent();
    
    const reportContainer = new Element('div', {'class': 'report-content'});
    
    // Report header
    const reportHeader = new Element('div', {'class': 'report-header'});
    reportHeader.insert(new Element('h2').update(this.getReportTypeName(reportType)));
    reportHeader.insert(new Element('p', {'class': 'report-date'})
      .update('Generated on ' + new Date().toLocaleDateString()));
    
    // Report body (sample content based on type)
    const reportBody = new Element('div', {'class': 'report-body'});
    
    switch (reportType) {
      case 'family-summary':
        this.generateFamilySummaryContent(reportBody);
        break;
      case 'genetic-risk':
        this.generateGeneticRiskContent(reportBody);
        break;
      case 'pedigree-chart':
        this.generatePedigreeChartContent(reportBody);
        break;
      case 'carrier-analysis':
        this.generateCarrierAnalysisContent(reportBody);
        break;
      default:
        reportBody.insert(new Element('p').update('Report content would appear here.'));
    }
    
    // Report actions
    const reportActions = new Element('div', {'class': 'report-actions'});
    const backBtn = new Element('button', {'class': 'btn btn-secondary'});
    backBtn.insert('Back to Reports');
    backBtn.observe('click', () => this.loadReportsList());
    
    const saveBtn = new Element('button', {'class': 'btn btn-primary'});
    saveBtn.insert('Save Report');
    saveBtn.observe('click', () => this.saveReport(reportType));
    
    reportActions.insert(backBtn);
    reportActions.insert(saveBtn);
    
    reportContainer.insert(reportHeader);
    reportContainer.insert(reportBody);
    reportContainer.insert(reportActions);
    
    this.contentElement.insert(reportContainer);
  }
  
  /**
   * Generate family summary content
   */
  generateFamilySummaryContent(container) {
    const summary = new Element('div', {'class': 'family-summary'});
    
    summary.insert(new Element('h3').update('Family Health Overview'));
    summary.insert(new Element('p').update('This family shows patterns of cardiovascular disease and diabetes across multiple generations.'));
    
    const statsGrid = new Element('div', {'class': 'stats-grid'});
    
    const stats = [
      { label: 'Total Family Members', value: '24', icon: 'fa-users' },
      { label: 'Conditions Identified', value: '8', icon: 'fa-heartbeat' },
      { label: 'Risk Factors', value: '12', icon: 'fa-exclamation-triangle' },
      { label: 'Genetic Carriers', value: '3', icon: 'fa-dna' }
    ];
    
    stats.forEach(stat => {
      const statCard = new Element('div', {'class': 'stat-card'});
      statCard.insert(new Element('i', {'class': 'fa ' + stat.icon}));
      statCard.insert(new Element('h4').update(stat.value));
      statCard.insert(new Element('p').update(stat.label));
      statsGrid.insert(statCard);
    });
    
    summary.insert(statsGrid);
    container.insert(summary);
  }
  
  /**
   * Generate genetic risk content
   */
  generateGeneticRiskContent(container) {
    const riskAnalysis = new Element('div', {'class': 'risk-analysis'});
    
    riskAnalysis.insert(new Element('h3').update('Genetic Risk Assessment'));
    
    const riskTable = new Element('table', {'class': 'table table-striped'});
    riskTable.insert(new Element('thead').insert(
      new Element('tr').insert([
        new Element('th').update('Condition'),
        new Element('th').update('Risk Level'),
        new Element('th').update('Inheritance Pattern'),
        new Element('th').update('Recommendations')
      ])
    ));
    
    const tbody = new Element('tbody');
    const risks = [
      { condition: 'Type 2 Diabetes', risk: 'High', pattern: 'Multifactorial', recommendation: 'Regular screening' },
      { condition: 'Hypertension', risk: 'Moderate', pattern: 'Multifactorial', recommendation: 'Lifestyle modification' },
      { condition: 'Breast Cancer', risk: 'Low', pattern: 'Complex', recommendation: 'Standard screening' }
    ];
    
    risks.forEach(risk => {
      const row = new Element('tr');
      row.insert(new Element('td').update(risk.condition));
      row.insert(new Element('td').insert(
        new Element('span', {'class': 'risk-badge risk-' + risk.risk.toLowerCase()})
          .update(risk.risk)
      ));
      row.insert(new Element('td').update(risk.pattern));
      row.insert(new Element('td').update(risk.recommendation));
      tbody.insert(row);
    });
    
    riskTable.insert(tbody);
    riskAnalysis.insert(riskTable);
    container.insert(riskAnalysis);
  }
  
  /**
   * Generate pedigree chart content
   */
  generatePedigreeChartContent(container) {
    const chartSection = new Element('div', {'class': 'pedigree-chart-section'});
    
    chartSection.insert(new Element('h3').update('Family Pedigree Chart'));
    chartSection.insert(new Element('p').update('Interactive pedigree chart would be embedded here, showing the complete family tree with medical annotations.'));
    
    const placeholder = new Element('div', {'class': 'chart-placeholder'});
    placeholder.insert(new Element('div', {'class': 'large-icon', 'style': 'font-size: 80px; text-align: center;'}).update('🌳'));
    placeholder.insert(new Element('p').update('Pedigree chart visualization'));
    
    chartSection.insert(placeholder);
    container.insert(chartSection);
  }
  
  /**
   * Generate carrier analysis content
   */
  generateCarrierAnalysisContent(container) {
    const carrierSection = new Element('div', {'class': 'carrier-analysis'});
    
    carrierSection.insert(new Element('h3').update('Genetic Carrier Analysis'));
    carrierSection.insert(new Element('p').update('Analysis of potential genetic carriers based on family history and inheritance patterns.'));
    
    const carrierList = new Element('ul', {'class': 'carrier-list'});
    const carriers = [
      'Individual III-2: Potential carrier for sickle cell trait',
      'Individual II-4: Likely carrier for cystic fibrosis',
      'Individual IV-1: Possible carrier for Huntington\'s disease'
    ];
    
    carriers.forEach(carrier => {
      carrierList.insert(new Element('li').update(carrier));
    });
    
    carrierSection.insert(carrierList);
    container.insert(carrierSection);
  }
  
  /**
   * Create new report
   */
  createNewReport() {
    console.log('Creating new report');
    this.loadReportsList();
  }
  
  /**
   * Export report to PDF
   */
  exportToPDF() {
    console.log('Exporting to PDF');
    // Would integrate with PDF generation library
    alert('PDF export functionality would be implemented here');
  }
  
  /**
   * View existing report
   */
  viewReport(reportId) {
    console.log('Viewing report:', reportId);
    // Would load report from database
  }
  
  /**
   * Save current report
   */
  saveReport(reportType) {
    console.log('Saving report:', reportType);
    // Would save to database
    alert(i18n.t('reports.messages.saved', 'Relatório salvo com sucesso!'));
  }
  
  /**
   * Manage templates interface
   */
  manageTemplates() {
    this.clearContent();
    
    const templateContainer = new Element('div', {'class': 'template-management'});
    
    // Header
    const header = new Element('div', {'class': 'template-header'});
    header.insert(new Element('h2').update(i18n.t('reports.templates.title', 'Gerenciamento de Modelos')));
    header.insert(new Element('p').update(i18n.t('reports.templates.description', 
      'Crie e edite modelos de relatórios e cartas médicas personalizados')));
    
    // Template categories
    const categoryTabs = new Element('div', {'class': 'template-categories'});
    const categories = [
      { id: 'letters', name: i18n.t('reports.categories.letters', 'Cartas'), icon: 'fa-envelope-o' },
      { id: 'reports', name: i18n.t('reports.categories.reports', 'Relatórios'), icon: 'fa-file-text-o' },
      { id: 'summaries', name: i18n.t('reports.categories.summaries', 'Resumos'), icon: 'fa-list-alt' },
      { id: 'education', name: i18n.t('reports.categories.education', 'Educativo'), icon: 'fa-graduation-cap' }
    ];
    
    categories.forEach(category => {
      const tab = new Element('button', {
        'class': 'category-tab',
        'data-category': category.id
      });
      tab.insert(new Element('i', {'class': 'fa ' + category.icon}));
      tab.insert(' ' + category.name);
      tab.observe('click', () => this.showTemplatesForCategory(category.id));
      categoryTabs.insert(tab);
    });
    
    templateContainer.insert(header);
    templateContainer.insert(categoryTabs);
    templateContainer.insert(new Element('div', {'class': 'template-content', 'id': 'template-content'}));
    
    this.contentElement.insert(templateContainer);
    
    // Show default category
    this.showTemplatesForCategory('letters');
  }
  
  /**
   * Show templates for specific category
   */
  showTemplatesForCategory(categoryId) {
    const contentArea = document.getElementById('template-content');
    if (!contentArea) return;
    
    contentArea.innerHTML = '';
    
    // Get predefined Brazilian templates for this category
    const templates = this.getBrazilianTemplatesForCategory(categoryId);
    
    const templateGrid = new Element('div', {'class': 'template-grid'});
    
    templates.forEach(template => {
      const templateCard = this.createTemplateCard(template);
      templateGrid.insert(templateCard);
    });
    
    // Add "Create New Template" card
    const newTemplateCard = this.createNewTemplateCard(categoryId);
    templateGrid.insert(newTemplateCard);
    
    contentArea.appendChild(templateGrid);
  }
  
  /**
   * Get predefined Brazilian medical templates
   */
  getBrazilianTemplatesForCategory(categoryId) {
    const templates = {
      letters: [
        {
          id: 'genetic-referral-letter',
          name: i18n.t('reports.templates.geneticReferral', 'Carta de Encaminhamento Genético'),
          description: i18n.t('reports.templates.geneticReferralDesc', 'Encaminhamento para consulta especializada'),
          template: this.getGeneticReferralTemplate()
        },
        {
          id: 'risk-assessment-letter',
          name: i18n.t('reports.templates.riskLetter', 'Carta de Avaliação de Risco'),
          description: i18n.t('reports.templates.riskLetterDesc', 'Comunicado de riscos genéticos'),
          template: this.getRiskAssessmentTemplate()
        }
      ],
      reports: [
        {
          id: 'counseling-report',
          name: i18n.t('reports.templates.counselingReport', 'Relatório de Aconselhamento'),
          description: i18n.t('reports.templates.counselingReportDesc', 'Relatório completo da consulta'),
          template: this.getCounselingReportTemplate()
        }
      ],
      summaries: [
        {
          id: 'family-summary',
          name: i18n.t('reports.templates.familySummary', 'Resumo Familiar'),
          description: i18n.t('reports.templates.familySummaryDesc', 'Sumário do histórico familiar'),
          template: this.getFamilySummaryTemplate()
        }
      ],
      education: [
        {
          id: 'patient-education',
          name: i18n.t('reports.templates.patientEducation', 'Material Educativo'),
          description: i18n.t('reports.templates.patientEducationDesc', 'Informações para o paciente'),
          template: this.getPatientEducationTemplate()
        }
      ]
    };
    
    return templates[categoryId] || [];
  }
  
  /**
   * Brazilian genetic referral letter template
   */
  getGeneticReferralTemplate() {
    return `
{{t 'reports.templates.letterHead'}}

{{t 'letters.date'}}: {{dateFormat consultation.date}}

{{t 'letters.greeting'}} Dr(a). {{doctor.name}},

{{t 'letters.referral.intro'}} {{patient.name}}, {{patient.age}} anos, {{t 'letters.referral.fromFamily'}} {{family.name}}.

{{t 'letters.referral.reasonTitle'}}:
{{consultation.reason}}

{{t 'letters.referral.familyHistoryTitle'}}:
{{#each family.conditions}}
• {{this.condition}} - {{t 'letters.affects'}} {{this.affectedCount}} {{t 'letters.familyMembers'}} {{t 'letters.across'}} {{this.generations}} {{t 'letters.generations'}}
{{/each}}

{{#if family.consanguinity}}
{{t 'letters.referral.consanguinity'}}: {{family.consanguinityDetails}}
{{/if}}

{{t 'letters.referral.recommendation'}}

{{t 'letters.closing'}},

{{counselor.name}}
{{counselor.title}}
{{counselor.credentials}}
{{counselor.contact}}
    `.trim();
  }
  
  /**
   * Brazilian risk assessment letter template
   */
  getRiskAssessmentTemplate() {
    return `
{{t 'reports.templates.letterHead'}}

{{t 'letters.date'}}: {{dateFormat assessment.date}}

{{t 'letters.greeting'}} {{patient.name}},

{{t 'letters.risk.intro'}}

{{t 'letters.risk.conditionsTitle'}}:
{{#each riskAssessment.conditions}}
• {{this.name}}: {{t 'letters.risk.level'}} {{this.riskLevel}} ({{this.percentage}}%)
  {{t 'letters.risk.reasoning'}}: {{this.reasoning}}
{{/each}}

{{t 'letters.risk.recommendationsTitle'}}:
{{#each recommendations}}
• {{this.text}}
{{/each}}

{{#if followUp.required}}
{{t 'letters.risk.followUp'}}: {{followUp.schedule}}
{{/if}}

{{t 'letters.risk.questions'}}

{{t 'letters.closing'}},

{{counselor.name}}
{{counselor.credentials}}
    `.trim();
  }
  
  /**
   * Create template card for management interface
   */
  createTemplateCard(template) {
    const card = new Element('div', {'class': 'template-card'});
    
    const header = new Element('div', {'class': 'template-card-header'});
    header.insert(new Element('h4').update(template.name));
    header.insert(new Element('p').update(template.description));
    
    const actions = new Element('div', {'class': 'template-card-actions'});
    
    const editBtn = new Element('button', {'class': 'btn btn-primary'});
    editBtn.insert(i18n.t('buttons.edit', 'Editar'));
    editBtn.observe('click', () => this.editTemplate(template));
    
    const previewBtn = new Element('button', {'class': 'btn btn-secondary'});
    previewBtn.insert(i18n.t('buttons.preview', 'Visualizar'));
    previewBtn.observe('click', () => this.previewTemplate(template));
    
    actions.insert(editBtn);
    actions.insert(previewBtn);
    
    card.insert(header);
    card.insert(actions);
    
    return card;
  }
  
  /**
   * Create "New Template" card
   */
  createNewTemplateCard(categoryId) {
    const card = new Element('div', {'class': 'template-card new-template-card'});
    
    const content = new Element('div', {'class': 'new-template-content'});
    content.insert(new Element('i', {'class': 'fa fa-plus fa-3x'}));
    content.insert(new Element('h4').update(i18n.t('reports.templates.createNew', 'Criar Novo Modelo')));
    
    card.insert(content);
    card.observe('click', () => this.createNewTemplateForCategory(categoryId));
    
    return card;
  }
  
  /**
   * Edit template
   */
  editTemplate(template) {
    console.log('Editing template:', template.name);
    alert(i18n.t('reports.messages.editTemplate', 'Editor de modelo será implementado aqui'));
  }
  
  /**
   * Preview template
   */
  previewTemplate(template) {
    console.log('Previewing template:', template.name);
    alert(i18n.t('reports.messages.previewTemplate', 'Visualização do modelo será implementada aqui'));
  }
  
  /**
   * Create new template for management interface (legacy)
   */
  createNewTemplateForCategory(categoryId) {
    console.log('Creating new template for category:', categoryId);
    // Get current active category
    const activeCategory = document.querySelector('.category-item.active');
    const category = activeCategory ? activeCategory.getAttribute('data-category') : categoryId || 'letters';
    
    // Switch to the proper category if needed
    if (category !== categoryId && categoryId) {
      this.selectCategory(categoryId);
    }
    
    // Call the main createNewTemplate method that opens the editor
    this.createNewTemplate();
  }

  /**
   * Refresh doctor variables (called when doctor info is updated)
   */
  async refreshDoctorVariables() {
    console.log('🔄 Refreshing doctor variables in report templates...');
    
    try {
      // Update variable buttons with current doctor info
      await this.updateDoctorVariableButtons();
      
      // If a template is currently loaded, refresh its variable buttons
      const editorToolbar = document.querySelector('.editor-toolbar');
      if (editorToolbar && this.currentTemplate) {
        this.updateTemplateEditorVariables();
      }
      
      console.log('✅ Doctor variables refreshed successfully');
    } catch (error) {
      console.error('❌ Error refreshing doctor variables:', error);
    }
  }

  /**
   * Update doctor variable buttons with current data
   */
  async updateDoctorVariableButtons() {
    try {
      const result = await window.electronAPI.doctorInfo.getDoctorVariables();
      
      if (result.success) {
        // Update button text to show actual values
        const doctorNameBtn = document.querySelector('button[onclick*="doctorName"]');
        const doctorCRMBtn = document.querySelector('button[onclick*="doctorCRM"]');
        const clinicNameBtn = document.querySelector('button[onclick*="clinicName"]');
        
        if (doctorNameBtn) {
          doctorNameBtn.innerHTML = `<i class="fa fa-user-md"></i> ${result.variables.doctorName}`;
        }
        if (doctorCRMBtn) {
          doctorCRMBtn.innerHTML = `<i class="fa fa-id-card"></i> ${result.variables.doctorCRM}`;
        }
        if (clinicNameBtn) {
          clinicNameBtn.innerHTML = `<i class="fa fa-hospital-o"></i> ${result.variables.clinicName}`;
        }
      }
    } catch (error) {
      console.error('Error updating doctor variable buttons:', error);
    }
  }

  /**
   * Update template editor with current doctor variables
   */
  updateTemplateEditorVariables() {
    if (!this.currentTemplate) return;
    
    // Re-display the template editor with updated variables
    this.displayTemplateEditor(this.currentTemplate);
  }

  /**
   * Load families for selection dropdown
   */
  async loadFamiliesForSelection() {
    try {
      const familySelect = document.getElementById('family-select');
      if (!familySelect) return;
      
      console.log('🔍 Loading families for selection...');
      const result = await window.electronAPI.reportTemplates.getFamiliesForReports();
      
      if (result.success && result.families) {
        // Clear existing options except the first one
        while (familySelect.children.length > 1) {
          familySelect.removeChild(familySelect.lastChild);
        }
        
        // Add family options
        result.families.forEach(family => {
          const option = document.createElement('option');
          option.value = family.id;
          option.textContent = family.name;
          familySelect.appendChild(option);
        });
        
        console.log(`✅ Loaded ${result.families.length} families for selection`);
      } else {
        console.warn('⚠️ No families found or error loading families:', result.error);
      }
    } catch (error) {
      console.error('❌ Error loading families for selection:', error);
    }
  }

  /**
   * Handle family selection change
   */
  async onFamilyChange(pedigreeId) {
    const patientSelect = document.getElementById('patient-select');
    const patientInfo = document.getElementById('patient-info');
    
    // Reset patient selection
    patientSelect.innerHTML = '<option value="">Carregando pacientes...</option>';
    patientSelect.disabled = true;
    patientInfo.style.display = 'none';
    
    if (!pedigreeId) {
      patientSelect.innerHTML = '<option value="">Primeiro selecione uma família</option>';
      return;
    }
    
    try {
      console.log('👥 Loading patients for family:', pedigreeId);
      const result = await window.electronAPI.reportTemplates.getFamilyPatientsForReports(parseInt(pedigreeId));
      
      if (result.success && result.patients) {
        // Clear loading option
        patientSelect.innerHTML = '<option value="">Selecione um paciente...</option>';
        
        // Add patient options
        result.patients.forEach(patient => {
          const option = document.createElement('option');
          option.value = patient.id;
          option.textContent = patient.displayName;
          patientSelect.appendChild(option);
        });
        
        patientSelect.disabled = false;
        console.log(`✅ Loaded ${result.patients.length} patients for family ${pedigreeId}`);
      } else {
        patientSelect.innerHTML = '<option value="">Nenhum paciente encontrado</option>';
        console.warn('⚠️ No patients found for family:', pedigreeId, result.error);
      }
    } catch (error) {
      console.error('❌ Error loading patients for family:', error);
      patientSelect.innerHTML = '<option value="">Erro ao carregar pacientes</option>';
    }
  }

  /**
   * Handle patient selection change
   */
  async onPatientChange(patientId) {
    const patientInfo = document.getElementById('patient-info');
    
    if (!patientId) {
      patientInfo.style.display = 'none';
      this.selectedPatient = null;
      return;
    }
    
    try {
      console.log('👤 Loading patient details for ID:', patientId);
      const result = await window.electronAPI.reportTemplates.getPatientDetailsForReports(parseInt(patientId));
      
      if (result.success && result.patient) {
        this.selectedPatient = result.patient;
        this.displayPatientInfo(result.patient);
        console.log(`✅ Loaded patient details for ${result.patient.fullName}`);
      } else {
        console.error('❌ Error loading patient details:', result.error);
        patientInfo.innerHTML = '<div class="alert alert-danger">Erro ao carregar dados do paciente</div>';
        patientInfo.style.display = 'block';
      }
    } catch (error) {
      console.error('❌ Error loading patient details:', error);
      patientInfo.innerHTML = '<div class="alert alert-danger">Erro ao conectar com o banco de dados</div>';
      patientInfo.style.display = 'block';
    }
  }

  /**
   * Display patient information
   */
  displayPatientInfo(patient) {
    const patientInfo = document.getElementById('patient-info');
    
    patientInfo.innerHTML = `
      <div class="patient-details">
        <h6><i class="fa fa-user"></i> Informações do Paciente</h6>
        <div class="patient-details-grid">
          <div class="patient-detail">
            <strong>Nome:</strong> ${patient.fullName}${patient.isProband ? ' (Probando)' : ''}
          </div>
          <div class="patient-detail">
            <strong>Gênero:</strong> ${patient.genderDisplay}
          </div>
          <div class="patient-detail">
            <strong>Idade:</strong> ${patient.ageDisplay}
          </div>
          <div class="patient-detail">
            <strong>Data de Nascimento:</strong> ${patient.birthDateDisplay}
          </div>
          ${patient.lifeStatus === 'deceased' ? `
          <div class="patient-detail">
            <strong>Status:</strong> <span class="status-deceased">Falecido</span>
          </div>
          ` : ''}
        </div>
      </div>
    `;
    
    patientInfo.style.display = 'block';
  }

  /**
   * Show variables modal
   */
  async showVariablesModal() {
    // Get current doctor information
    let doctorVariables = {};
    try {
      const doctorResult = await window.electronAPI.doctorInfo.getDoctorVariables();
      if (doctorResult.success) {
        doctorVariables = doctorResult.variables;
      }
    } catch (error) {
      console.error('Error getting doctor variables:', error);
    }
    
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'variables-modal';
    modal.innerHTML = `
      <div class="modal-backdrop" onclick="this.parentElement.remove()"></div>
      <div class="modal-content variables-modal-content">
        <div class="modal-header">
          <h3><i class="fa fa-tags"></i> Variáveis Disponíveis</h3>
          <button class="modal-close" onclick="this.closest('.variables-modal').remove()">×</button>
        </div>
        <div class="modal-body">
          <div class="variables-sections">
            
            <div class="variables-section">
              <h5><i class="fa fa-user-md"></i> Dados do Médico</h5>
              <div class="variables-grid">
                <button class="variable-btn" onclick="window.pedigreeApp?.reportModule?.insertVariableFromModal('doctorName')">
                  <div class="var-info">
                    <span class="var-name">{{doctorName}}</span>
                    <span class="var-value">${doctorVariables.doctorName || 'Não configurado'}</span>
                  </div>
                </button>
                <button class="variable-btn" onclick="window.pedigreeApp?.reportModule?.insertVariableFromModal('doctorCRM')">
                  <div class="var-info">
                    <span class="var-name">{{doctorCRM}}</span>
                    <span class="var-value">${doctorVariables.doctorCRM || 'Não configurado'}</span>
                  </div>
                </button>
                <button class="variable-btn" onclick="window.pedigreeApp?.reportModule?.insertVariableFromModal('doctorSpecialty')">
                  <div class="var-info">
                    <span class="var-name">{{doctorSpecialty}}</span>
                    <span class="var-value">${doctorVariables.doctorSpecialty || 'Não configurado'}</span>
                  </div>
                </button>
                <button class="variable-btn" onclick="window.pedigreeApp?.reportModule?.insertVariableFromModal('doctorSignature')">
                  <div class="var-info">
                    <span class="var-name">{{doctorSignature}}</span>
                    <span class="var-value">Assinatura completa</span>
                  </div>
                </button>
              </div>
            </div>

            <div class="variables-section">
              <h5><i class="fa fa-hospital-o"></i> Dados da Clínica</h5>
              <div class="variables-grid">
                <button class="variable-btn" onclick="window.pedigreeApp?.reportModule?.insertVariableFromModal('clinicName')">
                  <div class="var-info">
                    <span class="var-name">{{clinicName}}</span>
                    <span class="var-value">${doctorVariables.clinicName || 'Não configurado'}</span>
                  </div>
                </button>
                <button class="variable-btn" onclick="window.pedigreeApp?.reportModule?.insertVariableFromModal('clinicAddress')">
                  <div class="var-info">
                    <span class="var-name">{{clinicAddress}}</span>
                    <span class="var-value">Endereço completo</span>
                  </div>
                </button>
                <button class="variable-btn" onclick="window.pedigreeApp?.reportModule?.insertVariableFromModal('clinicPhone')">
                  <div class="var-info">
                    <span class="var-name">{{clinicPhone}}</span>
                    <span class="var-value">${doctorVariables.clinicPhone || 'Não configurado'}</span>
                  </div>
                </button>
                <button class="variable-btn" onclick="window.pedigreeApp?.reportModule?.insertVariableFromModal('clinicEmail')">
                  <div class="var-info">
                    <span class="var-name">{{clinicEmail}}</span>
                    <span class="var-value">${doctorVariables.clinicEmail || 'Não configurado'}</span>
                  </div>
                </button>
              </div>
            </div>

            <div class="variables-section">
              <h5><i class="fa fa-user"></i> Dados do Paciente</h5>
              <div class="variables-grid">
                <button class="variable-btn" onclick="window.pedigreeApp?.reportModule?.insertVariableFromModal('patientName')">
                  <div class="var-info">
                    <span class="var-name">{{patientName}}</span>
                    <span class="var-value">${this.selectedPatient ? this.selectedPatient.fullName : 'Selecione um paciente'}</span>
                  </div>
                </button>
                <button class="variable-btn" onclick="window.pedigreeApp?.reportModule?.insertVariableFromModal('patientAge')">
                  <div class="var-info">
                    <span class="var-name">{{patientAge}}</span>
                    <span class="var-value">${this.selectedPatient ? this.selectedPatient.ageDisplay : 'Selecione um paciente'}</span>
                  </div>
                </button>
                <button class="variable-btn" onclick="window.pedigreeApp?.reportModule?.insertVariableFromModal('patientGender')">
                  <div class="var-info">
                    <span class="var-name">{{patientGender}}</span>
                    <span class="var-value">${this.selectedPatient ? this.selectedPatient.genderDisplay : 'Selecione um paciente'}</span>
                  </div>
                </button>
                <button class="variable-btn" onclick="window.pedigreeApp?.reportModule?.insertVariableFromModal('patientBirthDate')">
                  <div class="var-info">
                    <span class="var-name">{{patientBirthDate}}</span>
                    <span class="var-value">${this.selectedPatient ? this.selectedPatient.birthDateDisplay : 'Selecione um paciente'}</span>
                  </div>
                </button>
              </div>
            </div>

            <div class="variables-section">
              <h5><i class="fa fa-calendar"></i> Informações Gerais</h5>
              <div class="variables-grid">
                <button class="variable-btn" onclick="window.pedigreeApp?.reportModule?.insertVariableFromModal('date')">
                  <div class="var-info">
                    <span class="var-name">{{date}}</span>
                    <span class="var-value">${new Date().toLocaleDateString('pt-BR')}</span>
                  </div>
                </button>
                <button class="variable-btn" onclick="window.pedigreeApp?.reportModule?.insertVariableFromModal('consultationDate')">
                  <div class="var-info">
                    <span class="var-name">{{consultationDate}}</span>
                    <span class="var-value">Data da consulta</span>
                  </div>
                </button>
                <button class="variable-btn" onclick="window.pedigreeApp?.reportModule?.insertVariableFromModal('consultationHours')">
                  <div class="var-info">
                    <span class="var-name">{{consultationHours}}</span>
                    <span class="var-value">${doctorVariables.consultationHours || 'Não configurado'}</span>
                  </div>
                </button>
                <button class="variable-btn" onclick="window.pedigreeApp?.reportModule?.insertVariableFromModal('familyHistory')">
                  <div class="var-info">
                    <span class="var-name">{{familyHistory}}</span>
                    <span class="var-value">Histórico familiar do heredograma</span>
                  </div>
                </button>
              </div>
            </div>

          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="this.closest('.variables-modal').remove()">Fechar</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
  }

  /**
   * Preview template with current variable values
   */
  async previewTemplate() {
    const templateContent = document.getElementById('template-content')?.value;
    
    if (!templateContent || templateContent.trim() === '') {
      alert('Por favor, insira conteúdo no modelo antes de visualizar.');
      return;
    }
    
    // Check if Handlebars is available
    if (typeof Handlebars === 'undefined') {
      console.error('❌ Handlebars is not loaded! Cannot compile template.');
      alert('Erro: Handlebars não foi carregado. Verifique se a biblioteca está incluída.');
      return;
    }
    
    try {
      console.log('🔍 Generating template preview...');
      console.log('✅ Handlebars is available:', typeof Handlebars);
      
      // Get current doctor information
      let doctorVariables = {};
      try {
        const doctorResult = await window.electronAPI.doctorInfo.getDoctorVariables();
        if (doctorResult.success) {
          doctorVariables = doctorResult.variables;
        }
      } catch (error) {
        console.warn('Could not get doctor variables for preview:', error);
      }
      
      // Get current patient information if selected
      let patientVariables = {};
      if (this.selectedPatient) {
        patientVariables = {
          patientName: this.selectedPatient.fullName,
          patientAge: this.selectedPatient.ageDisplay,
          patientGender: this.selectedPatient.genderDisplay,
          patientBirthDate: this.selectedPatient.birthDateDisplay
        };
      }
      
      // Prepare all variables for preview
      const previewVariables = {
        // Doctor variables
        doctorName: doctorVariables.doctorName || '[Nome do médico não configurado]',
        doctorCRM: doctorVariables.doctorCRM || '[CRM não configurado]',
        doctorSpecialty: doctorVariables.doctorSpecialty || '[Especialidade não configurada]',
        doctorSignature: this.getDoctorSignature(doctorVariables),
        
        // Clinic variables
        clinicName: doctorVariables.clinicName || '[Nome da clínica não configurado]',
        clinicAddress: this.getClinicAddress(doctorVariables),
        clinicPhone: doctorVariables.clinicPhone || '[Telefone não configurado]',
        clinicEmail: doctorVariables.clinicEmail || '[Email não configurado]',
        
        // Patient variables (with fallback if no patient selected)
        patientName: patientVariables.patientName || '[Selecione um paciente]',
        patientAge: patientVariables.patientAge || '[Idade do paciente]',
        patientGender: patientVariables.patientGender || '[Gênero do paciente]',
        patientBirthDate: patientVariables.patientBirthDate || '[Data de nascimento]',
        
        // General variables
        date: new Date().toLocaleDateString('pt-BR'),
        consultationDate: '[Data da consulta]',
        consultationHours: doctorVariables.consultationHours || '[Horário de atendimento]',
        familyHistory: '[Histórico familiar do heredograma selecionado]'
      };
      
      console.log('🔍 Preview variables:', previewVariables);
      
      // Compile template with Handlebars
      const template = Handlebars.compile(templateContent);
      const previewHtml = template(previewVariables);
      
      console.log('✅ Template compiled successfully');
      
      // Show preview modal
      this.showPreviewModal(previewHtml, previewVariables);
      
      console.log('✅ Template preview generated successfully');
      
    } catch (error) {
      console.error('❌ Error generating template preview:', error);
      alert('Erro ao gerar visualização: ' + error.message);
    }
  }

  /**
   * Get formatted doctor signature
   */
  getDoctorSignature(doctorVariables) {
    if (!doctorVariables.doctorName && !doctorVariables.doctorCRM) {
      return '[Assinatura do médico]';
    }
    
    const parts = [];
    if (doctorVariables.doctorName) parts.push(doctorVariables.doctorName);
    if (doctorVariables.doctorCRM) parts.push(doctorVariables.doctorCRM);
    if (doctorVariables.doctorSpecialty) parts.push(doctorVariables.doctorSpecialty);
    
    return parts.join(' - ');
  }

  /**
   * Get formatted clinic address
   */
  getClinicAddress(doctorVariables) {
    const addressParts = [];
    
    if (doctorVariables.clinicAddress) addressParts.push(doctorVariables.clinicAddress);
    if (doctorVariables.clinicCity) addressParts.push(doctorVariables.clinicCity);
    if (doctorVariables.clinicState) addressParts.push(doctorVariables.clinicState);
    if (doctorVariables.clinicPostalCode) addressParts.push(`CEP: ${doctorVariables.clinicPostalCode}`);
    
    return addressParts.length > 0 ? addressParts.join(', ') : '[Endereço da clínica não configurado]';
  }

  /**
   * Show preview modal with rendered template
   */
  showPreviewModal(previewHtml, variables) {
    const modal = document.createElement('div');
    modal.className = 'preview-modal';
    modal.innerHTML = `
      <div class="modal-backdrop" onclick="this.parentElement.remove()"></div>
      <div class="modal-content preview-modal-content">
        <div class="modal-header">
          <h3><i class="fa fa-eye"></i> Visualização do Modelo</h3>
          <div class="preview-controls">
            <button class="btn btn-sm btn-secondary" onclick="window.pedigreeApp?.reportModule?.togglePreviewMode(this)" id="preview-mode-toggle">
              <i class="fa fa-code"></i> Ver Variáveis
            </button>
            <button class="modal-close" onclick="this.closest('.preview-modal').remove()">×</button>
          </div>
        </div>
        <div class="modal-body">
          <div class="preview-content" id="preview-content">
            <div class="preview-rendered" id="preview-rendered">
              ${previewHtml}
            </div>
            <div class="preview-variables" id="preview-variables" style="display: none;">
              <h5><i class="fa fa-list"></i> Variáveis Utilizadas:</h5>
              <div class="variables-list">
                ${this.generateVariablesDebugInfo(variables)}
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary" onclick="window.pedigreeApp?.reportModule?.generatePDF()">
            <i class="fa fa-file-pdf-o"></i> Gerar PDF
          </button>
          <button class="btn btn-secondary" onclick="this.closest('.preview-modal').remove()">
            Fechar
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
  }

  /**
   * Generate debug info for variables
   */
  generateVariablesDebugInfo(variables) {
    return Object.entries(variables).map(([key, value]) => `
      <div class="variable-debug-item">
        <span class="var-key">{{${key}}}</span>
        <span class="var-arrow">→</span>
        <span class="var-value">${this.escapeHtml(value)}</span>
      </div>
    `).join('');
  }

  /**
   * Toggle preview mode between rendered and variables view
   */
  togglePreviewMode(button) {
    const renderedDiv = document.getElementById('preview-rendered');
    const variablesDiv = document.getElementById('preview-variables');
    const icon = button.querySelector('i');
    const text = button.childNodes[button.childNodes.length - 1];
    
    if (renderedDiv.style.display === 'none') {
      // Switch to rendered view
      renderedDiv.style.display = 'block';
      variablesDiv.style.display = 'none';
      icon.className = 'fa fa-code';
      text.textContent = ' Ver Variáveis';
    } else {
      // Switch to variables view
      renderedDiv.style.display = 'none';
      variablesDiv.style.display = 'block';
      icon.className = 'fa fa-eye';
      text.textContent = ' Ver Resultado';
    }
  }

  /**
   * Generate PDF from current template (placeholder for future implementation)
   */
  generatePDF() {
    alert('Funcionalidade de geração de PDF será implementada em breve!');
    console.log('📄 PDF generation requested');
    // TODO: Implement PDF generation using something like puppeteer or similar
  }

  /**
   * Insert variable from modal and close modal
   */
  insertVariableFromModal(variableName) {
    this.insertVariable(variableName);
    const modal = document.querySelector('.variables-modal');
    if (modal) modal.remove();
  }
}

console.log('📄 ReportModule file loaded, setting window.ReportModule...');

// Make ReportModule globally available
window.ReportModule = ReportModule;

console.log('✅ window.ReportModule set:', typeof window.ReportModule);

export default ReportModule;
