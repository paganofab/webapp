/**
 * DoctorModule - Genetic Counseling Session Management
 * Integrated interface for creating and managing patient sessions
 */
class DoctorModule {
  constructor(options = {}) {
    console.log("👨‍⚕️ DoctorModule constructor called with options:", options);
    this.options = options;
    this.moduleId = "doctor-module";
    this.currentSession = null;
    this.sessions = [];
    this.initialized = false;

    // Settings with default values
    this.settings = {
      apiUrl: "https://api.pedigreepro.com.br",
      frontendUrl: "https://form.pedigreepro.com.br",
    };

    // Load settings from localStorage if available
    this.loadSettings();
  }

  /**
   * Initialize the module
   */
  async initialize() {
    console.log("👨‍⚕️ DoctorModule initialize() called");
    this.initialized = true;

    // Ensure modal is hidden on initialization
    setTimeout(() => {
      const modal = document.getElementById("createSessionModal");
      if (modal) {
        modal.style.display = "none";
        console.log("🔒 Modal hidden on initialization");
      }
    }, 100);

    // Load persistent authentication
    this.loadPersistedAuth();

    // Initialize API status checking
    this.startApiStatusCheck();

    return true;
  }

  /**
   * Load persisted authentication
   */
  loadPersistedAuth() {
    const savedDoctorId = localStorage.getItem("doctorAuthId");
    if (savedDoctorId) {
      this.authenticatedDoctorId = savedDoctorId;
      console.log("👨‍⚕️ Loaded persisted auth for:", savedDoctorId);

      // Wait for DOM to be ready before initializing UI
      setTimeout(() => {
        const authSection = document.getElementById("auth-section");
        const sessionsSection = document.getElementById("sessions-section");
        const authenticatedDoctorName = document.getElementById(
          "authenticated-doctor-name"
        );

        if (authSection && sessionsSection && authenticatedDoctorName) {
          authSection.style.display = "none";
          sessionsSection.style.display = "block";
          authenticatedDoctorName.textContent = `${savedDoctorId}`;

          // Initialize DataTable and load sessions with delay for stability
          setTimeout(() => {
            this.initializeDataTable();
            this.loadSessionsToDataTable();
          }, 100);
        }
      }, 500);
    }
  }

  /**
   * Start API status checking
   */
  startApiStatusCheck() {
    // Wait for DOM to be ready before starting status checks
    setTimeout(() => {
      // Initial check
      this.updateApiStatus();

      // Periodic check every 30 seconds
      setInterval(() => {
        this.updateApiStatus();
      }, 30000);
    }, 1000);
  }

  /**
   * Update API status indicator
   */
  async updateApiStatus() {
    const statusIndicator = document.getElementById("status-indicator");
    const statusText = document.getElementById("status-text");

    if (!statusIndicator || !statusText) {
      console.log("Status indicator elements not found");
      return;
    }

    // Show checking status
    statusIndicator.innerHTML = '<i class="fa fa-circle text-warning"></i>';
    statusText.textContent = "Verificando...";

    console.log("🔄 Checking API status for:", this.settings.apiUrl);

    try {
      // Create an AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // Increased timeout

      const response = await fetch(`${this.settings.apiUrl}/health`, {
        method: "GET",
        mode: "cors",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        statusIndicator.innerHTML = '<i class="fa fa-circle text-success"></i>';
        statusText.textContent = "Online";
        console.log("✅ API status: Online", data);

        // Store last successful check timestamp
        localStorage.setItem("lastApiCheck", new Date().toISOString());
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.log("❌ API status check failed:", error.message);
      statusIndicator.innerHTML = '<i class="fa fa-circle text-danger"></i>';

      // Show specific error messages
      if (error.name === "AbortError") {
        statusText.textContent = "Timeout";
        console.log("API status check timed out after 8 seconds");
      } else if (error.message.includes("CORS")) {
        statusText.textContent = "CORS Error";
      } else if (
        error.message.includes("NetworkError") ||
        error.message.includes("Failed to fetch")
      ) {
        statusText.textContent = "Network Error";
      } else if (error.message.includes("HTTP")) {
        statusText.textContent = error.message.split(":")[0]; // Show HTTP status
      } else {
        statusText.textContent = "Offline";
      }
    }
  }

  /**
   * Get module content - main entry point
   */
  getContent() {
    console.log("👨‍⚕️ DoctorModule getContent() called");
    return this.createDoctorInterface();
  }

  /**
   * Create main doctor interface with 3-column layout
   */
  createDoctorInterface() {
    console.log("�‍⚕️ Creating doctor interface...");

    return `
      <div class="doctor-module-container">
        <div class="doctor-single-layout">
          <div class="doctor-content">
            <!-- Authentication Section (shown initially or if not authenticated) -->
            <div class="auth-section" id="auth-section">
              <div class="auth-card">
                <div class="auth-header">
                  <i class="fa fa-user-md fa-3x"></i>
                  <h3>${this.t("doctor.auth.title", "Autenticação")}</h3>
                  <p>${this.t(
                    "doctor.auth.subtitle",
                    "Digite seu ID para acessar os formularios"
                  )}</p>
                </div>
                
                <div class="auth-form">
                  <div class="form-group">
                    <label for="doctor-id">${this.t(
                      "doctor.auth.doctorId",
                      "ID do Médico"
                    )}:</label>
                    <input type="text" id="doctor-id" class="form-control" placeholder="${this.t(
                      "doctor.auth.doctorIdPlaceholder",
                      "Digite seu ID de médico"
                    )}" required>
                    <small class="form-text text-muted">
                      ${this.t(
                        "doctor.auth.doctorIdHelp",
                        "ID necessário para autenticar sessões no servidor"
                      )}
                    </small>
                  </div>
                  <button type="button" class="btn btn-primary btn-lg" onclick="window.pedigreeApp?.doctorModule?.authenticate()">
                    <i class="fa fa-key"></i>
                    ${this.t("doctor.auth.authenticate", "Autenticar")}
                  </button>
                </div>
              </div>
            </div>
            
            <!-- Sessions Management Section (shown after auth) -->
            <div class="sessions-section" id="sessions-section" style="display: none;">
              <!-- Header with Create Button and Status -->
              <div class="sessions-header">
                <div class="header-left">
                  <h2>${this.t(
                    "doctor.sessions.title",
                    "Sessões de Formularios"
                  )}</h2>
                  <div class="doctor-info">
                    <span class="doctor-badge">
                      <i class="fa fa-user-md"></i>
                      <strong id="authenticated-doctor-name">ID</strong>
                    </span>
                    <button class="btn btn-outline-secondary btn-sm" onclick="window.pedigreeApp?.doctorModule?.logout()">
                      <i class="fa fa-sign-out"></i>
                      ${this.t("doctor.auth.logout", "Sair")}
                    </button>
                  </div>
                </div>
                
                <div class="header-actions">
                  <div class="api-status" id="api-status">
                    <span class="status-indicator" id="status-indicator">
                      <i class="fa fa-circle text-warning"></i>
                    </span>
                    <span id="status-text">Verificando...</span>
                  </div>
                  <button class="btn btn-success btn-lg" onclick="window.pedigreeApp?.doctorModule?.openCreateSessionModal()">
                    <i class="fa fa-plus"></i>
                    ${this.t("doctor.sessions.createNew", "Criar Nova Sessão")}
                  </button>
                </div>
              </div>
              
              <!-- Sessions DataTable -->
              <div class="sessions-table-container">
                <table id="sessions-datatable" class="display compact" style="width:100%">
                  <thead>
                    <tr>
                      <th>${this.t(
                        "doctor.table.patientName",
                        "Nome do Paciente"
                      )}</th>
                      <th>${this.t("doctor.table.email", "Email")}</th>
                      <th>${this.t("doctor.table.dob", "Data Nasc.")}</th>
                      <th>${this.t("doctor.table.created", "Criada em")}</th>
                      <th>${this.t("doctor.table.status", "Status")}</th>
                      <th>${this.t("doctor.table.actions", "Ações")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <!-- Data will be populated via DataTable -->
                  </tbody>
                </table>
              </div>
              
              <!-- Session Details Panel -->
              <div class="session-details-panel" id="session-details-panel" style="display: none; margin-top: 20px;">
                <div class="details-header">
                  <h4><i class="fa fa-file-text-o"></i> ${this.t("doctor.session.details", "Detalhes da Sessão")}</h4>
                  <button class="btn btn-sm btn-outline-secondary" onclick="window.pedigreeApp?.doctorModule?.hideSessionDetails()">
                    <i class="fa fa-times"></i>
                    ${this.t("doctor.session.close", "Fechar")}
                  </button>
                </div>
                <div class="details-content" id="details-content">
                  <!-- Session details will be loaded here -->
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Create Session Modal -->
      <div class="doctor-session-modal" id="createSessionModal" style="display: none;">
        <div class="doctor-modal-dialog modal-lg">
          <div class="doctor-modal-content">
            <div class="modal-header">
              <h5 class="modal-title">
                <i class="fa fa-plus-circle"></i>
                ${this.t("doctor.modal.title", "Criar Nova Sessão")}
              </h5>
              <button type="button" class="close" onclick="window.pedigreeApp?.doctorModule?.closeCreateSessionModal()">
                <span>&times;</span>
              </button>
            </div>
            <div class="modal-body">
              <!-- Success Message (hidden initially) -->
              <div class="success-message" id="success-message" style="display: none;">
                <div class="alert alert-success">
                  <i class="fa fa-check-circle fa-2x"></i>
                  <h4>${this.t(
                    "doctor.session.created",
                    "Sessão Criada com Sucesso!"
                  )}</h4>
                  <div class="session-details" id="session-details">
                    <!-- Session details will be populated here -->
                  </div>
                </div>
              </div>
              
              <!-- Create Form -->
              <div id="create-form-container">
                <form id="create-session-form" onsubmit="window.pedigreeApp?.doctorModule?.createSession(event)">
                  <div class="row">
                    <div class="col-md-6">
                      <div class="form-group">
                        <label for="modal-proband-name">${this.t(
                          "doctor.form.probandName",
                          "Nome do Probando"
                        )}:</label>
                        <input type="text" id="modal-proband-name" class="form-control" placeholder="${this.t(
                          "doctor.form.probandNamePlaceholder",
                          "Nome completo do paciente"
                        )}" required>
                      </div>
                    </div>
                    <div class="col-md-6">
                      <div class="form-group">
                        <label for="modal-patient-email">${this.t(
                          "doctor.form.email",
                          "Email do Paciente"
                        )}:</label>
                        <input type="email" id="modal-patient-email" class="form-control" placeholder="${this.t(
                          "doctor.form.emailPlaceholder",
                          "paciente@exemplo.com"
                        )}" required>
                      </div>
                    </div>
                  </div>
                  
                  <div class="row">
                    <div class="col-md-6">
                      <div class="form-group">
                        <label for="modal-patient-dob">${this.t(
                          "doctor.form.dob",
                          "Data de Nascimento"
                        )}:</label>
                        <input type="date" id="modal-patient-dob" class="form-control" required>
                      </div>
                    </div>
                    <div class="col-md-6">
                      <!-- Empty column for spacing -->
                    </div>
                  </div>
                  
                  <div class="form-group">
                    <label for="modal-session-notes">${this.t(
                      "doctor.form.notes",
                      "Observações da Sessão"
                    )} (${this.t("common.optional", "Opcional")}):</label>
                    <textarea id="modal-session-notes" class="form-control" rows="3" placeholder="${this.t(
                      "doctor.form.notesPlaceholder",
                      "Observações adicionais sobre esta sessão..."
                    )}"></textarea>
                  </div>
                  
                  <div class="form-actions">
                    <button type="submit" class="btn btn-primary" id="modal-create-btn">
                      <i class="fa fa-plus"></i>
                      ${this.t("doctor.form.createSession", "Criar Sessão")}
                    </button>
                    <button type="button" class="btn btn-secondary" onclick="window.pedigreeApp?.doctorModule?.clearModalForm()">
                      <i class="fa fa-eraser"></i>
                      ${this.t("doctor.form.clear", "Limpar")}
                    </button>
                    <button type="button" class="btn btn-outline-secondary" onclick="window.pedigreeApp?.doctorModule?.closeCreateSessionModal()">
                      <i class="fa fa-times"></i>
                      ${this.t("doctor.form.cancel", "Cancelar")}
                    </button>
                  </div>
                </form>
              </div>
              
              <!-- Loading Indicator -->
              <div class="loading-overlay" id="modal-loading" style="display: none;">
                <div class="loading-content">
                  <i class="fa fa-spinner fa-spin fa-2x"></i>
                  <p>${this.t(
                    "doctor.loading.creating",
                    "Criando sessão..."
                  )}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Send Email Modal -->
      <div class="doctor-session-modal" id="sendEmailModal" style="display: none;">
        <div class="doctor-modal-dialog modal-lg">
          <div class="doctor-modal-content">
            <div class="modal-header">
              <h5 class="modal-title">
                <i class="fa fa-envelope"></i>
                ${this.t("doctor.email.title", "Enviar Link por Email")}
              </h5>
              <button type="button" class="close" onclick="window.pedigreeApp?.doctorModule?.closeSendEmailModal()">
                <span>&times;</span>
              </button>
            </div>
            <div class="modal-body">
              <!-- Email Form -->
              <form id="send-email-form" onsubmit="window.pedigreeApp?.doctorModule?.sendSessionEmail(event)">
                <div class="row">
                  <div class="col-md-6">
                    <div class="form-group">
                      <label for="email-to">${this.t(
                        "doctor.email.to",
                        "Para"
                      )}:</label>
                      <input type="email" id="email-to" class="form-control" required>
                    </div>
                  </div>
                  <div class="col-md-6">
                    <div class="form-group">
                      <label for="email-patient-name">${this.t(
                        "doctor.email.patientName",
                        "Nome do Paciente"
                      )}:</label>
                      <input type="text" id="email-patient-name" class="form-control" required>
                    </div>
                  </div>
                </div>
                
                <div class="form-group">
                  <label for="email-subject">${this.t(
                    "doctor.email.subject",
                    "Assunto"
                  )}:</label>
                  <input type="text" id="email-subject" class="form-control" required>
                </div>
                
                <div class="form-group">
                  <label for="email-message">${this.t(
                    "doctor.email.message",
                    "Mensagem"
                  )}:</label>
                  <textarea id="email-message" class="form-control" rows="8" required></textarea>
                  <small class="form-text text-muted">
                    ${this.t(
                      "doctor.email.messageHelp",
                      "O link do formulário será incluído automaticamente na mensagem."
                    )}
                  </small>
                </div>
                
                <div class="form-group">
  <label for="email-link">
    ${this.t("doctor.email.link", "Link do Formulário")}:
  </label>
  <div class="input-group">
    <input 
      type="url" 
      id="email-link" 
      class="form-control" 
      readonly
    >
    <button 
      type="button" 
      class="btn btn-outline-secondary" 
      onclick="window.pedigreeApp?.doctorModule?.copyToClipboard(document.getElementById('email-link').value)"
    >
      <i class="fa fa-clipboard"></i>
    </button>
  </div>
</div>

                
                <div class="email-actions">
                  <button type="submit" class="btn btn-primary" id="send-email-btn">
                    <i class="fa fa-envelope-o"></i>
                    ${this.t(
                      "doctor.email.openClient",
                      "Abrir Cliente de Email"
                    )}
                  </button>
                  <button type="button" class="btn btn-outline-secondary" onclick="window.pedigreeApp?.doctorModule?.closeSendEmailModal()">
                    <i class="fa fa-times"></i>
                    ${this.t("doctor.email.cancel", "Cancelar")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      <!-- Send WhatsApp Modal -->
      <div class="doctor-session-modal" id="sendWhatsAppModal" style="display: none;">
        <div class="doctor-modal-dialog modal-lg">
          <div class="doctor-modal-content">
            <div class="modal-header">
              <h5 class="modal-title">
                <i class="fa fa-whatsapp"></i>
                ${this.t("doctor.whatsapp.title", "Enviar Link por WhatsApp")}
              </h5>
              <button type="button" class="close" onclick="window.pedigreeApp?.doctorModule?.closeSendWhatsAppModal()">
                <span>&times;</span>
              </button>
            </div>
            <div class="modal-body">
              <!-- WhatsApp Form -->
              <form id="send-whatsapp-form" onsubmit="window.pedigreeApp?.doctorModule?.sendSessionWhatsApp(event)">
                <div class="row">
                  <div class="col-md-6">
                    <div class="form-group">
                      <label for="whatsapp-phone">${this.t(
                        "doctor.whatsapp.phone",
                        "Número de Telefone"
                      )}:</label>
                      <input 
                        type="tel" 
                        id="whatsapp-phone" 
                        class="form-control" 
                        placeholder="(11) 99999-9999"
                        required
                      >
                      <small class="form-text text-muted">
                        ${this.t(
                          "doctor.whatsapp.phoneHelp",
                          "Digite o número com DDD, sem o +55"
                        )}
                      </small>
                    </div>
                  </div>
                  <div class="col-md-6">
                    <div class="form-group">
                      <label for="whatsapp-patient-name">${this.t(
                        "doctor.whatsapp.patientName",
                        "Nome do Paciente"
                      )}:</label>
                      <input type="text" id="whatsapp-patient-name" class="form-control" required>
                    </div>
                  </div>
                </div>
                
                <div class="form-group">
                  <label for="whatsapp-message">${this.t(
                    "doctor.whatsapp.message",
                    "Mensagem"
                  )}:</label>
                  <textarea id="whatsapp-message" class="form-control" rows="8" required></textarea>
                  <small class="form-text text-muted">
                    ${this.t(
                      "doctor.whatsapp.messageHelp",
                      "O link do formulário será incluído automaticamente na mensagem."
                    )}
                  </small>
                </div>
                
                <div class="form-group">
                  <label for="whatsapp-link">
                    ${this.t("doctor.whatsapp.link", "Link do Formulário")}:
                  </label>
                  <div class="input-group">
                    <input 
                      type="url" 
                      id="whatsapp-link" 
                      class="form-control" 
                      readonly
                    >
                    <button 
                      type="button" 
                      class="btn btn-outline-secondary" 
                      onclick="window.pedigreeApp?.doctorModule?.copyToClipboard(document.getElementById('whatsapp-link').value)"
                    >
                      <i class="fa fa-clipboard"></i>
                    </button>
                  </div>
                </div>
                
                <div class="whatsapp-actions">
                  <button type="submit" class="btn btn-success" id="send-whatsapp-btn">
                    <i class="fa fa-whatsapp"></i>
                    ${this.t(
                      "doctor.whatsapp.openWhatsApp",
                      "Abrir WhatsApp Web"
                    )}
                  </button>
                  <button type="button" class="btn btn-outline-secondary" onclick="window.pedigreeApp?.doctorModule?.closeSendWhatsAppModal()">
                    <i class="fa fa-times"></i>
                    ${this.t("doctor.whatsapp.cancel", "Cancelar")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Select a section in the navigation
   */
  selectSection(sectionId) {
    console.log("📂 Selecting section:", sectionId);

    // Update active state in navigation
    document.querySelectorAll(".nav-item").forEach((item) => {
      item.classList.remove("active");
    });
    document
      .querySelector(`[data-section="${sectionId}"]`)
      ?.classList.add("active");

    // Update content title
    const titles = {
      create: this.t("doctor.sections.create", "Criar Nova Sessão"),
      manage: this.t("doctor.sections.manage", "Gerenciar Sessões"),
      settings: this.t("doctor.sections.settings", "Configurações"),
    };

    document.getElementById("content-title").textContent =
      titles[sectionId] || titles.create;

    // Load content for this section
    this.loadSectionContent(sectionId);
  }

  /**
   * Load content for selected section
   */
  async loadSectionContent(sectionId) {
    const contentArea = document.getElementById("content-area");
    const detailsContent = document.getElementById("details-content");

    // Clear details panel
    detailsContent.innerHTML = `
      <div class="details-placeholder">
        <i class="fa fa-info-circle"></i>
        <h4>${this.t("doctor.details.placeholder.title", "Informações")}</h4>
        <p>${this.t(
          "doctor.details.placeholder.message",
          "Resultados e detalhes aparecerão aqui."
        )}</p>
      </div>
    `;

    try {
      switch (sectionId) {
        case "create":
          this.loadCreateSessionContent(contentArea);
          break;
        case "manage":
          this.loadManageSessionsContent(contentArea);
          break;
        case "settings":
          this.loadSettingsContent(contentArea);
          break;
        default:
          this.loadCreateSessionContent(contentArea);
      }
    } catch (error) {
      console.error("❌ Error loading section content:", error);
      contentArea.innerHTML = `
        <div class="content-error">
          <i class="fa fa-exclamation-triangle"></i>
          <p>Erro ao carregar conteúdo: ${error.message}</p>
        </div>
      `;
    }
  }

  /**
   * Load create session form
   */
  loadCreateSessionContent(contentArea) {
    contentArea.innerHTML = `
      <div class="session-form-container">
        <div class="auth-section" id="auth-section">
          <div class="auth-form-group">
            <label for="doctor-id">${this.t(
              "doctor.auth.doctorId",
              "ID do Médico"
            )}:</label>
            <input type="text" id="doctor-id" class="form-control" placeholder="${this.t(
              "doctor.auth.doctorIdPlaceholder",
              "Digite seu ID de médico"
            )}" required>
            <small class="form-text text-muted">
              ${this.t(
                "doctor.auth.doctorIdHelp",
                "ID necessário para autenticar sessões no servidor"
              )}
            </small>
          </div>
          <button type="button" class="btn btn-primary" onclick="window.pedigreeApp?.doctorModule?.authenticate()">
            <i class="fa fa-key"></i>
            ${this.t("doctor.auth.authenticate", "Autenticar")}
          </button>
        </div>
        
        <div class="session-form" id="session-form" style="display: none;">
          <div class="authenticated-status" id="authenticated-status">
            <!-- Will show authenticated doctor ID -->
          </div>
          
          <form id="create-session-form" onsubmit="window.pedigreeApp?.doctorModule?.createSession(event)">
            <div class="form-group">
              <label for="proband-name">${this.t(
                "doctor.form.probandName",
                "Nome do Probando"
              )}:</label>
              <input type="text" id="proband-name" class="form-control" placeholder="${this.t(
                "doctor.form.probandNamePlaceholder",
                "Nome completo do paciente"
              )}" required>
            </div>
            
            <div class="form-group">
              <label for="patient-email">${this.t(
                "doctor.form.email",
                "Email do Paciente"
              )}:</label>
              <input type="email" id="patient-email" class="form-control" placeholder="${this.t(
                "doctor.form.emailPlaceholder",
                "paciente@exemplo.com"
              )}" required>
            </div>
            
            <div class="form-group">
              <label for="patient-dob">${this.t(
                "doctor.form.dob",
                "Data de Nascimento"
              )}:</label>
              <input type="date" id="patient-dob" class="form-control" required>
            </div>
            
            <div class="form-group">
              <label for="session-notes">${this.t(
                "doctor.form.notes",
                "Observações da Sessão"
              )} (${this.t("common.optional", "Opcional")}):</label>
              <textarea id="session-notes" class="form-control" rows="3" placeholder="${this.t(
                "doctor.form.notesPlaceholder",
                "Observações adicionais sobre esta sessão..."
              )}"></textarea>
            </div>
            
            <div class="form-actions">
              <button type="submit" class="btn btn-primary" id="create-btn">
                <i class="fa fa-plus"></i>
                ${this.t("doctor.form.createSession", "Criar Sessão")}
              </button>
              <button type="button" class="btn btn-secondary" onclick="window.pedigreeApp?.doctorModule?.clearForm()">
                <i class="fa fa-eraser"></i>
                ${this.t("doctor.form.clear", "Limpar Formulário")}
              </button>
              <button type="button" class="btn btn-info" onclick="window.pedigreeApp?.doctorModule?.resetAuthentication()">
                <i class="fa fa-sign-out"></i>
                ${this.t("doctor.form.changeDoctor", "Trocar Médico")}
              </button>
            </div>
          </form>
        </div>
        
        <div class="loading-indicator" id="create-loading" style="display: none;">
          <div class="spinner">
            <i class="fa fa-spinner fa-spin"></i>
          </div>
          <p>${this.t("doctor.loading.creating", "Criando sessão...")}</p>
        </div>
      </div>
    `;
  }

  /**
   * Load manage sessions content
   */
  loadManageSessionsContent(contentArea) {
    contentArea.innerHTML = `
      <div class="manage-sessions-container">
        <div class="manage-actions">
          <button class="btn btn-primary" onclick="window.pedigreeApp?.doctorModule?.loadSessions()">
            <i class="fa fa-refresh"></i>
            ${this.t("doctor.manage.refresh", "Atualizar Sessões")}
          </button>
          <button class="btn btn-secondary" onclick="window.pedigreeApp?.doctorModule?.exportData()">
            <i class="fa fa-download"></i>
            ${this.t("doctor.manage.export", "Exportar Dados")}
          </button>
        </div>
        
        <div class="loading-indicator" id="sessions-loading" style="display: none;">
          <div class="spinner">
            <i class="fa fa-spinner fa-spin"></i>
          </div>
          <p>${this.t("doctor.loading.sessions", "Carregando sessões...")}</p>
        </div>
        
        <div class="sessions-list" id="sessions-list">
          <div class="empty-state">
            <i class="fa fa-calendar-o fa-3x"></i>
            <h4>${this.t(
              "doctor.manage.noSessions.title",
              "Nenhuma sessão"
            )}</h4>
            <p>${this.t(
              "doctor.manage.noSessions.message",
              'Clique em "Atualizar Sessões" para carregar ou crie uma nova sessão.'
            )}</p>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Load settings content
   */
  loadSettingsContent(contentArea) {
    contentArea.innerHTML = `
      <div class="settings-container">
        <form id="settings-form" onsubmit="window.pedigreeApp?.doctorModule?.saveSettings(event)">
          <div class="form-group">
            <label for="api-url">${this.t(
              "doctor.settings.apiUrl",
              "URL da API Backend"
            )}:</label>
            <input type="url" id="api-url" class="form-control" value="${
              this.settings.apiUrl
            }" required>
            <small class="form-text text-muted">
              ${this.t(
                "doctor.settings.apiUrlHelp",
                "URL do servidor de API para criação de sessões"
              )}
            </small>
          </div>
          
          <div class="form-group">
            <label for="frontend-url">${this.t(
              "doctor.settings.frontendUrl",
              "URL do Formulário do Paciente"
            )}:</label>
            <input type="url" id="frontend-url" class="form-control" value="${
              this.settings.frontendUrl
            }" required>
            <small class="form-text text-muted">
              ${this.t(
                "doctor.settings.frontendUrlHelp",
                "URL base para os formulários de pacientes"
              )}
            </small>
          </div>
          
          <div class="form-actions">
            <button type="submit" class="btn btn-primary">
              <i class="fa fa-save"></i>
              ${this.t("doctor.settings.save", "Salvar Configurações")}
            </button>
            <button type="button" class="btn btn-secondary" onclick="window.pedigreeApp?.doctorModule?.testConnection()">
              <i class="fa fa-wifi"></i>
              ${this.t("doctor.settings.testConnection", "Testar Conexão")}
            </button>
          </div>
        </form>
        
        <div id="connection-status" class="connection-status">
          <!-- Connection test results will appear here -->
        </div>
      </div>
    `;
  }

  /**
   * Load settings from localStorage
   */
  loadSettings() {
    const saved = localStorage.getItem("doctorInterfaceSettings");
    if (saved) {
      try {
        const savedSettings = JSON.parse(saved);
        this.settings = { ...this.settings, ...savedSettings };
      } catch (error) {
        console.error("Error loading settings:", error);
      }
    }
  }

  /**
   * Authenticate doctor with ID
   */
  async authenticate() {
    const doctorIdInput = document.getElementById("doctor-id");
    const doctorId = doctorIdInput.value.trim();

    if (!doctorId) {
      alert("Por favor, digite seu ID de médico.");
      return;
    }

    // Store authenticated doctor ID
    this.authenticatedDoctorId = doctorId;

    // Persist authentication
    localStorage.setItem("doctorAuthId", doctorId);

    // Show sessions section and hide auth section
    const authSection = document.getElementById("auth-section");
    const sessionsSection = document.getElementById("sessions-section");
    const authenticatedDoctorName = document.getElementById(
      "authenticated-doctor-name"
    );

    authSection.style.display = "none";
    sessionsSection.style.display = "block";
    authenticatedDoctorName.textContent = `${doctorId}`;

    // Initialize DataTable and load sessions
    // Wait a bit for DOM to stabilize
    setTimeout(() => {
      this.initializeDataTable();
      this.loadSessionsToDataTable();
    }, 100);

    console.log("✅ Doctor authenticated:", doctorId);
  }

  /**
   * Logout doctor
   */
  logout() {
    if (
      !confirm(
        "Tem certeza que deseja sair? Você precisará se autenticar novamente."
      )
    ) {
      return;
    }

    // Clear authentication
    this.authenticatedDoctorId = null;
    localStorage.removeItem("doctorAuthId");

    // Show auth section and hide sessions section
    const authSection = document.getElementById("auth-section");
    const sessionsSection = document.getElementById("sessions-section");
    const doctorIdInput = document.getElementById("doctor-id");

    authSection.style.display = "block";
    sessionsSection.style.display = "none";
    doctorIdInput.value = "";

    // Clear DataTable
    if (this.dataTable) {
      this.dataTable.destroy();
      this.dataTable = null;
    }

    console.log("👋 Doctor logged out");
  }

  /**
   * Initialize DataTable for sessions
   */
  initializeDataTable() {
    // Skip if already initialized
    if (this.dataTable) {
      return;
    }

    // Check if the table element exists
    const tableElement = document.getElementById("sessions-datatable");
    if (!tableElement) {
      console.warn("DataTable element not found, skipping initialization");
      return;
    }

    // Check if jQuery and DataTables are available (using jq since jQuery.noConflict() was called)
    const jQueryLib = window.jq || window.jQuery;
    if (!jQueryLib || typeof jQueryLib.fn.DataTable === "undefined") {
      console.warn(
        "jQuery or DataTables not available, skipping initialization"
      );
      console.log("Available jQuery references:", {
        jq: typeof window.jq,
        jQuery: typeof window.jQuery,
        $: typeof window.$,
      });
      return;
    }

    try {
      // Initialize DataTable using the correct jQuery reference
      this.dataTable = jQueryLib("#sessions-datatable").DataTable({
        order: [[3, "desc"]], // Order by creation date, newest first
        pageLength: 25,
        responsive: true,
        scrollX: true,
        autoWidth: false,
        language: {
          // Portuguese localization - inline instead of CDN
          sEmptyTable: "Nenhum registro encontrado",
          sInfo: "Mostrando de _START_ até _END_ de _TOTAL_ registros",
          sInfoEmpty: "Mostrando 0 até 0 de 0 registros",
          sInfoFiltered: "(Filtrados de _MAX_ registros)",
          sInfoPostFix: "",
          sInfoThousands: ".",
          sLengthMenu: "_MENU_ resultados por página",
          sLoadingRecords: "Carregando...",
          sProcessing: "Processando...",
          sZeroRecords: "Nenhum registro encontrado",
          sSearch: "Pesquisar",
          oPaginate: {
            sNext: "Próximo",
            sPrevious: "Anterior",
            sFirst: "Primeiro",
            sLast: "Último",
          },
          oAria: {
            sSortAscending: ": Ordenar colunas de forma ascendente",
            sSortDescending: ": Ordenar colunas de forma descendente",
          },
        },
        columns: [
          { data: "probandName", title: "Nome do Paciente", width: "25%" },
          { data: "email", title: "Email", width: "20%" },
          {
            data: "dob",
            title: "Data Nasc.",
            width: "12%",
            render: function (data) {
              return new Date(data).toLocaleDateString("pt-BR");
            },
          },
          {
            data: "createdAt",
            title: "Criada em",
            width: "12%",
            render: function (data) {
              return new Date(data).toLocaleDateString("pt-BR");
            },
          },
          {
            data: null,
            title: "Status",
            width: "13%",
            render: function (data, type, row) {
              const now = new Date();
              const isExpired = new Date(row.expiresAt) < now;
              const hasData = row.hasFormData;

              if (isExpired && !hasData) {
                return '<span class="badge badge-danger"><i class="fa fa-times-circle"></i> Expirada</span>';
              } else if (hasData) {
                return '<span class="badge badge-success"><i class="fa fa-check-circle"></i> Concluída</span>';
              } else {
                return '<span class="badge badge-warning"><i class="fa fa-clock-o"></i> Pendente</span>';
              }
            },
          },
          {
            data: null,
            title: "Ações",
            width: "18%",
            orderable: false,
            className: "text-nowrap",
            render: function (data, type, row) {
              const now = new Date();
              const isExpired = new Date(row.expiresAt) < now;
              const hasData = row.hasFormData;

              let actions = "";

              // Send Email action (always available)
              const formUrl = `${
                window.pedigreeApp?.doctorModule?.settings?.frontendUrl ||
                "https://form.pedigreepro.com.br"
              }/${row.token}`;
              actions += `<button class="btn btn-sm" onclick="window.pedigreeApp?.doctorModule?.openSendEmailModal('${row.sessionId}', '${row.probandName}', '${row.email}', '${formUrl}')" title="Enviar Email">
                <i class="fa fa-envelope-o"></i>
              </button> `;

              // Send WhatsApp action (always available)
              actions += `<button class="btn btn-sm" onclick="window.pedigreeApp?.doctorModule?.openSendWhatsAppModal('${row.sessionId}', '${row.probandName}', '${row.email}', '${formUrl}')" title="Enviar WhatsApp">
                <i class="fa fa-whatsapp"></i>
              </button> `;

              // Actions for pending sessions
              if (!isExpired && !hasData) {
                actions += `<button class="btn btn-sm" onclick="window.pedigreeApp?.doctorModule?.copySessionLink('${row.sessionId}')" title="Copiar Link">
                  <i class="fa fa-clipboard"></i>
                </button> `;
                actions += `<button class="btn btn-sm" onclick="window.pedigreeApp?.doctorModule?.openSessionForm('${row.sessionId}')" title="Abrir Formulário">
                  <i class="fa fa-external-link"></i>
                </button> `;
              }

              // Actions for completed sessions
              if (hasData) {
                // Check if session has been imported
                if (row.isImported && row.importData) {
                  // Show imported status and family link
                  actions += `<button class="btn btn-sm" disabled title="Já importado para família: ${row.importData.family_name}" style="background-color: #28a745; color: white; cursor: not-allowed;">
                    <i class="fa fa-check"></i> Importado
                  </button> `;
                } else {
                  // Show import button
                  actions += `<button class="btn btn-sm" onclick="window.pedigreeApp?.doctorModule?.importSessionToFamily('${row.sessionId}', '${row.probandName}')" title="${window.pedigreeApp?.doctorModule?.t('doctorInterface.webform.importToFamily', 'Importar para Família')}">
                    <i class="fa fa-users"></i>
                  </button> `;
                }
                
                actions += `<button class="btn btn-sm" onclick="window.pedigreeApp?.doctorModule?.viewSessionDetails('${row.sessionId}')" title="Ver Detalhes">
                  <i class="fa fa-file-text-o"></i>
                </button> `;
                actions += `<button class="btn btn-sm" onclick="window.pedigreeApp?.doctorModule?.downloadSessionFHIR('${row.sessionId}')" title="Baixar FHIR">
                  <i class="fa fa-download"></i>
                </button> `;
              }

              // Delete action (always available)
              actions += `<button class="btn btn-sm" onclick="window.pedigreeApp?.doctorModule?.deleteSessionFromTable('${row.sessionId}')" title="Excluir">
                <i class="fa fa-trash"></i>
              </button>`;

              return actions;
            },
          },
        ],
        columnDefs: [
          {
            className: "dt-center",
            targets: [1, 2, 3, 4, 5],
          },
        ],
      });

      console.log("📊 DataTable initialized successfully");
    } catch (error) {
      console.error("Error initializing DataTable:", error);
    }
  }

  /**
   * Open create session modal
   */
  openCreateSessionModal() {
    console.log("🔄 Opening create session modal...");

    // Reset modal state
    this.resetCreateSessionModal();

    // Show modal using native JavaScript
    const modal = document.getElementById("createSessionModal");
    if (modal) {
      modal.style.display = "flex";
      document.body.classList.add("modal-open");

      // Add backdrop click handler
      modal.onclick = (e) => {
        if (e.target === modal) {
          this.closeCreateSessionModal();
        }
      };

      console.log("✅ Modal opened successfully");
    } else {
      console.error("❌ Modal element not found");
    }
  }

  /**
   * Close create session modal
   */
  closeCreateSessionModal() {
    console.log("🔄 Closing create session modal...");

    const modal = document.getElementById("createSessionModal");
    if (modal) {
      modal.style.display = "none";
      document.body.classList.remove("modal-open");

      // Remove click handler
      modal.onclick = null;

      console.log("✅ Modal closed successfully");
    } else {
      console.error("❌ Modal element not found for closing");
    }
  }

  /**
   * Reset create session modal
   */
  resetCreateSessionModal() {
    // Hide success message and show form
    document.getElementById("success-message").style.display = "none";
    document.getElementById("create-form-container").style.display = "block";
    document.getElementById("modal-loading").style.display = "none";

    // Clear form
    this.clearModalForm();
  }

  /**
   * Clear modal form
   */
  clearModalForm() {
    document.getElementById("modal-proband-name").value = "";
    document.getElementById("modal-patient-email").value = "";
    document.getElementById("modal-patient-dob").value = "";
    document.getElementById("modal-session-notes").value = "";
  }

  /**
   * Open send email modal
   */
  openSendEmailModal(sessionId, patientName, patientEmail, formUrl) {
    console.log("📧 Opening send email modal for session:", sessionId);

    // Store session data for email
    this.currentEmailSession = {
      sessionId,
      patientName,
      patientEmail,
      formUrl,
    };

    // Reset email modal state
    this.resetSendEmailModal();

    // Pre-fill form fields
    document.getElementById("email-to").value = patientEmail || "";
    document.getElementById("email-patient-name").value = patientName || "";
    document.getElementById("email-link").value = formUrl || "";

    // Generate default subject and message
    const subject = `Formulário de Aconselhamento Genético - ${patientName}`;
    const message = `Olá ${patientName},

Espero que esteja bem. Conforme conversado durante a consulta, estou enviando o link para o formulário de aconselhamento genético que precisa ser preenchido.

Este formulário irá coletar informações importantes sobre seu histórico médico e familiar, que serão utilizadas para uma avaliação genética mais completa.

Por favor, clique no link abaixo para acessar o formulário:
${formUrl}

Algumas informações importantes:
• O formulário deve ser preenchido com atenção
• Em caso de dúvidas, não hesite em entrar em contato
• O link ficará disponível por tempo limitado

Agradeço pela sua colaboração e fico à disposição para esclarecimentos.

Atenciosamente,
${this.authenticatedDoctorId}`;

    document.getElementById("email-subject").value = subject;
    document.getElementById("email-message").value = message;

    // Show modal
    const modal = document.getElementById("sendEmailModal");
    if (modal) {
      modal.style.display = "flex";
      document.body.classList.add("modal-open");

      // Add backdrop click handler
      modal.onclick = (e) => {
        if (e.target === modal) {
          this.closeSendEmailModal();
        }
      };

      console.log("✅ Email modal opened successfully");
    } else {
      console.error("❌ Email modal element not found");
    }
  }

  /**
   * Close send email modal
   */
  closeSendEmailModal() {
    console.log("🔄 Closing send email modal...");

    const modal = document.getElementById("sendEmailModal");
    if (modal) {
      modal.style.display = "none";
      document.body.classList.remove("modal-open");

      // Remove click handler
      modal.onclick = null;

      // Clear session data
      this.currentEmailSession = null;

      console.log("✅ Email modal closed successfully");
    } else {
      console.error("❌ Email modal element not found for closing");
    }
  }

  /**
   * Reset send email modal
   */
  resetSendEmailModal() {
    // Just ensure form is visible (no loading/success states to manage)
    const form = document.getElementById("send-email-form");
    if (form) {
      form.style.display = "block";
    }
  }

  /**
   * Send session email
   */
  async sendSessionEmail(event) {
    event.preventDefault();

    if (!this.currentEmailSession) {
      alert("Erro: Dados da sessão não encontrados.");
      return;
    }

    // Collect email data
    const emailData = {
      to: document.getElementById("email-to").value.trim(),
      subject: document.getElementById("email-subject").value.trim(),
      message: document.getElementById("email-message").value.trim(),
      patientName: document.getElementById("email-patient-name").value.trim(),
      formUrl: document.getElementById("email-link").value.trim(),
      sessionId: this.currentEmailSession.sessionId,
    };

    // Open email client with mailto
    this.useMailtoClientWithData(emailData);

    // Show success message and close modal after a brief delay
    setTimeout(() => {
      alert(
        "Email aberto no seu cliente de email. Por favor, verifique e envie a mensagem."
      );
      this.closeSendEmailModal();
    }, 500);

    console.log("📧 Email opened in default client");
  }

  /**
   * Use mailto client with provided data
   */
  useMailtoClientWithData(emailData) {
    const mailtoUrl = `mailto:${encodeURIComponent(
      emailData.to
    )}?subject=${encodeURIComponent(
      emailData.subject
    )}&body=${encodeURIComponent(emailData.message)}`;

    // Open in default email client
    if (window.electronAPI && window.electronAPI.shell) {
      // Electron environment
      window.electronAPI.shell.openExternal(mailtoUrl);
    } else {
      // Browser environment
      window.open(mailtoUrl, "_blank");
    }

    console.log("📧 Opened email in default client");
  }

  /**
   * Open send WhatsApp modal
   */
  openSendWhatsAppModal(sessionId, patientName, patientEmail, formUrl) {
    console.log("📱 Opening send WhatsApp modal for session:", sessionId);

    // Store session data for WhatsApp
    this.currentWhatsAppSession = {
      sessionId,
      patientName,
      patientEmail,
      formUrl,
    };

    // Reset WhatsApp modal state
    this.resetSendWhatsAppModal();

    // Pre-fill form fields
    document.getElementById("whatsapp-patient-name").value = patientName || "";
    document.getElementById("whatsapp-link").value = formUrl || "";

    // Add phone number formatting
    const phoneInput = document.getElementById("whatsapp-phone");
    phoneInput.addEventListener("input", this.formatPhoneNumber.bind(this));

    // Generate default message
    const message = `Olá ${patientName || ""},

Espero que esteja bem. Conforme conversado durante a consulta, estou enviando o link para o formulário de aconselhamento genético que precisa ser preenchido.

Este formulário irá coletar informações importantes sobre seu histórico médico e familiar, que serão utilizadas para uma avaliação genética mais completa.

Por favor, clique no link abaixo para acessar o formulário:
${formUrl}

Algumas informações importantes:
• O formulário deve ser preenchido com atenção
• Em caso de dúvidas, não hesite em entrar em contato
• O link ficará disponível por tempo limitado

Agradeço pela sua colaboração e fico à disposição para esclarecimentos.

Atenciosamente,
${this.authenticatedDoctorId}`;

    document.getElementById("whatsapp-message").value = message;

    // Show modal
    const modal = document.getElementById("sendWhatsAppModal");
    if (modal) {
      modal.style.display = "flex";
      document.body.classList.add("modal-open");

      // Add backdrop click handler
      modal.onclick = (e) => {
        if (e.target === modal) {
          this.closeSendWhatsAppModal();
        }
      };

      console.log("✅ WhatsApp modal opened successfully");
    } else {
      console.error("❌ WhatsApp modal element not found");
    }
  }

  /**
   * Close send WhatsApp modal
   */
  closeSendWhatsAppModal() {
    console.log("🔄 Closing send WhatsApp modal...");

    const modal = document.getElementById("sendWhatsAppModal");
    if (modal) {
      modal.style.display = "none";
      document.body.classList.remove("modal-open");

      // Remove click handler
      modal.onclick = null;

      // Clear session data
      this.currentWhatsAppSession = null;

      console.log("✅ WhatsApp modal closed successfully");
    } else {
      console.error("❌ WhatsApp modal element not found for closing");
    }
  }

  /**
   * Reset send WhatsApp modal
   */
  resetSendWhatsAppModal() {
    // Clear phone field
    document.getElementById("whatsapp-phone").value = "";
    
    // Just ensure form is visible (no loading/success states to manage)
    const form = document.getElementById("send-whatsapp-form");
    if (form) {
      form.style.display = "block";
    }
  }

  /**
   * Send session WhatsApp
   */
  async sendSessionWhatsApp(event) {
    event.preventDefault();

    if (!this.currentWhatsAppSession) {
      alert("Erro: Dados da sessão não encontrados.");
      return;
    }

    // Collect WhatsApp data
    const whatsappData = {
      phone: document.getElementById("whatsapp-phone").value.trim(),
      message: document.getElementById("whatsapp-message").value.trim(),
      patientName: document.getElementById("whatsapp-patient-name").value.trim(),
      formUrl: document.getElementById("whatsapp-link").value.trim(),
      sessionId: this.currentWhatsAppSession.sessionId,
    };

    // Validate phone number
    if (!whatsappData.phone) {
      alert("Por favor, digite o número de telefone.");
      return;
    }

    // Clean phone number (remove non-numeric characters)
    const cleanPhone = whatsappData.phone.replace(/\D/g, "");
    
    // Validate phone format (should have 10 or 11 digits after area code)
    if (cleanPhone.length < 10 || cleanPhone.length > 11) {
      alert("Por favor, digite um número de telefone válido com DDD.");
      return;
    }

    // Open WhatsApp Web with message
    this.openWhatsAppWithMessage(cleanPhone, whatsappData.message);

    // Show success message and close modal after a brief delay
    setTimeout(() => {
      alert(
        "WhatsApp Web aberto com a mensagem. Por favor, verifique o destinatário e envie a mensagem."
      );
      this.closeSendWhatsAppModal();
    }, 500);

    console.log("📱 WhatsApp opened with message for:", cleanPhone);
  }

  /**
   * Open WhatsApp Web with message
   */
  openWhatsAppWithMessage(phone, message) {
    // Format phone number for WhatsApp (Brazil country code)
    const formattedPhone = `55${phone}`;
    
    // Encode message for URL
    const encodedMessage = encodeURIComponent(message);
    
    // Create WhatsApp Web URL
    const whatsappUrl = `https://web.whatsapp.com/send?phone=${formattedPhone}&text=${encodedMessage}`;

    // Open in default browser
    if (window.electronAPI && window.electronAPI.shell) {
      // Electron environment
      window.electronAPI.shell.openExternal(whatsappUrl);
    } else {
      // Browser environment
      window.open(whatsappUrl, "_blank");
    }

    console.log("📱 Opened WhatsApp Web with message");
  }

  /**
   * Format phone number input
   */
  formatPhoneNumber(event) {
    let value = event.target.value.replace(/\D/g, ""); // Remove all non-numeric characters
    
    if (value.length <= 11) {
      // Format as (XX) XXXXX-XXXX or (XX) XXXX-XXXX
      if (value.length >= 3) {
        value = value.replace(/^(\d{2})(\d)/, "($1) $2");
      }
      if (value.length >= 10) {
        if (value.length === 14) {
          // 11 digits: (XX) XXXXX-XXXX
          value = value.replace(/^(\(\d{2}\) \d{5})(\d{4})/, "$1-$2");
        } else {
          // 10 digits: (XX) XXXX-XXXX
          value = value.replace(/^(\(\d{2}\) \d{4})(\d{4})/, "$1-$2");
        }
      }
    }
    
    event.target.value = value;
  }

  /**
   * Create new session from modal
   */
  async createSession(event) {
    event.preventDefault();

    if (!this.authenticatedDoctorId) {
      alert("Por favor, autentique-se primeiro.");
      return;
    }

    const createBtn = document.getElementById("modal-create-btn");
    const loading = document.getElementById("modal-loading");
    const formContainer = document.getElementById("create-form-container");

    // Show loading state
    loading.style.display = "block";
    formContainer.style.display = "none";
    createBtn.disabled = true;

    // Collect form data
    const sessionData = {
      probandName: document.getElementById("modal-proband-name").value.trim(),
      email: document.getElementById("modal-patient-email").value.trim(),
      dob: document.getElementById("modal-patient-dob").value,
      notes: document.getElementById("modal-session-notes").value.trim(),
    };

    try {
      const response = await fetch(`${this.settings.apiUrl}/api/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Doctor-ID": this.authenticatedDoctorId,
        },
        body: JSON.stringify(sessionData),
      });

      if (response.ok) {
        const result = await response.json();

        // Add the form data to the result for display
        result.probandName = sessionData.probandName;
        result.email = sessionData.email;
        result.dob = sessionData.dob;
        result.notes = sessionData.notes;

        // Show success message in modal
        this.showSessionCreatedSuccess(result);

        // Refresh DataTable
        this.loadSessionsToDataTable();
      } else {
        const error = await response.text();
        throw new Error(error);
      }
    } catch (error) {
      console.error("Network error:", error);
      alert(`Erro ao criar sessão: ${error.message}`);

      // Hide loading and show form again
      loading.style.display = "none";
      formContainer.style.display = "block";
    } finally {
      createBtn.disabled = false;
    }
  }

  /**
   * Show session created success in modal
   */
  showSessionCreatedSuccess(result) {
    const successMessage = document.getElementById("success-message");
    const sessionDetails = document.getElementById("session-details");
    const loading = document.getElementById("modal-loading");

    // Hide loading
    loading.style.display = "none";

    // Build success content
    const formUrl =
      result.formUrl || `${this.settings.frontendUrl}/${result.token}`;

    sessionDetails.innerHTML = `
      <div class="session-info">
        <div class="row">
          <div class="col-md-6">
            <p><strong>ID da Sessão:</strong><br><code>${
              result.sessionId
            }</code></p>
            <p><strong>Paciente:</strong><br>${
              result.probandName || "Nome não informado"
            }</p>
            ${
              result.email
                ? `<p><strong>Email:</strong><br>${result.email}</p>`
                : ""
            }
          </div>
          <div class="col-md-6">
            <p><strong>Token:</strong><br><code>${result.token}</code></p>
            <p><strong>Expira em:</strong><br>${new Date(
              result.expiresAt
            ).toLocaleString("pt-BR")}</p>
            ${
              result.dob
                ? `<p><strong>Data de Nascimento:</strong><br>${new Date(
                    result.dob
                  ).toLocaleDateString("pt-BR")}</p>`
                : ""
            }
          </div>
        </div>
        ${
          result.notes
            ? `<div class="row"><div class="col-12"><p><strong>Observações:</strong><br>${result.notes}</p></div></div>`
            : ""
        }
      </div>
      
      <div class="patient-form-link mt-3">
        <h6><i class="fa fa-link"></i> Link do Formulário do Paciente:</h6>
        <div class="input-group mb-3">
          <input type="text" class="form-control" id="session-form-link" value="${formUrl}" readonly>
          <div class="input-group-append">
            <button class="btn btn-primary" onclick="window.pedigreeApp?.doctorModule?.copyToClipboard('${formUrl}')">
              <i class="fa fa-clipboard"></i> Copiar
            </button>
            <button type="button"class="btn btn-secondary" onclick="window.pedigreeApp?.doctorModule?.openPatientForm('${formUrl}')">
              <i class="fa fa-external-link"></i> Abrir
            </button>
          </div>
        </div>
      </div>
      
      <div class="next-actions mt-3">
        <button class="btn btn-primary" onclick="window.pedigreeApp?.doctorModule?.openSendEmailModal('${
          result.sessionId
        }', '${result.probandName || "Paciente"}', '${
      result.email || ""
    }', '${formUrl}')">
          <i class="fa fa-envelope"></i> Enviar Email
        </button>
        <button class="btn btn-success" onclick="window.pedigreeApp?.doctorModule?.openSendWhatsAppModal('${
          result.sessionId
        }', '${result.probandName || "Paciente"}', '${
      result.email || ""
    }', '${formUrl}')">
          <i class="fa fa-whatsapp"></i> Enviar WhatsApp
        </button>
        <button class="btn btn-info" onclick="window.pedigreeApp?.doctorModule?.resetCreateSessionModal()">
          <i class="fa fa-plus"></i> Criar Outra Sessão
        </button>
        <button class="btn btn-secondary" onclick="window.pedigreeApp?.doctorModule?.closeCreateSessionModal()">
          <i class="fa fa-times"></i> Fechar
        </button>
      </div>
    `;

    // Show success message
    successMessage.style.display = "block";

    console.log("✅ Session created successfully:", result.sessionId);
  }

  /**
   * Load sessions into DataTable
   */
  async loadSessionsToDataTable() {
    if (!this.authenticatedDoctorId) {
      console.warn("Cannot load sessions: not authenticated");
      return;
    }

    if (!this.dataTable) {
      console.warn("Cannot load sessions: DataTable not initialized");
      return;
    }

    console.log("🔄 Loading sessions for doctor:", this.authenticatedDoctorId);

    try {
      const response = await fetch(`${this.settings.apiUrl}/api/sessions`, {
        headers: {
          "X-Doctor-ID": this.authenticatedDoctorId,
        },
      });

      console.log("📡 Sessions API response status:", response.status);

      if (response.ok) {
        const sessions = await response.json();
        console.log("📊 Received sessions:", sessions.length);

        // Enhance sessions with submission timestamps and import status
        for (let session of sessions) {
          // Check submission timestamp if available
          if (
            session.hasFormData &&
            !session.submittedAt &&
            !session.submissionTime
          ) {
            try {
              const dataResponse = await fetch(
                `${this.settings.apiUrl}/api/sessions?action=data&sessionId=${session.sessionId}`,
                {
                  headers: {
                    "X-Doctor-ID": this.authenticatedDoctorId,
                  },
                }
              );
              if (dataResponse.ok) {
                const sessionData = await dataResponse.json();
                if (sessionData.sessionInfo?.submissionTime) {
                  session.submissionTime =
                    sessionData.sessionInfo.submissionTime;
                } else if (sessionData.rawData?.sessionInfo?.submissionTime) {
                  session.submissionTime =
                    sessionData.rawData.sessionInfo.submissionTime;
                }
              }
            } catch (e) {
              console.log(
                `Could not fetch submission time for session ${session.sessionId}:`,
                e
              );
            }
          }
          
          // Check if session has been imported to family
          if (session.hasFormData && window.electronAPI) {
            try {
              const importStatus = await window.electronAPI.checkWebformImportStatus(session.sessionId);
              session.isImported = importStatus?.isImported || false;
              session.importData = importStatus?.importData || null;
            } catch (e) {
              console.log(
                `Could not check import status for session ${session.sessionId}:`,
                e
              );
              session.isImported = false;
              session.importData = null;
            }
          } else {
            session.isImported = false;
            session.importData = null;
          }
        }

        // Clear and populate DataTable
        this.dataTable.clear().rows.add(sessions).draw();

        console.log(`📊 Loaded ${sessions.length} sessions into DataTable`);
      } else {
        const errorText = await response.text();
        console.error("Failed to load sessions:", response.status, errorText);

        // Show a user-friendly message for common errors
        if (response.status === 404) {
          console.log("📊 No sessions found, displaying empty table");
          this.dataTable.clear().draw();
        } else {
          alert(`Falha ao carregar sessões: ${response.status} - ${errorText}`);
        }
      }
    } catch (error) {
      console.error("Network error loading sessions:", error);
      alert(`Erro de conexão ao carregar sessões: ${error.message}`);
    }
  }

  /**
   * Copy session link to clipboard
   */
  async copySessionLink(sessionId) {
    try {
      // Get session data to find the token
      const sessions = this.dataTable.data().toArray();
      const session = sessions.find((s) => s.sessionId === sessionId);

      if (!session) {
        alert("Sessão não encontrada.");
        return;
      }

      const formUrl = `${this.settings.frontendUrl}/${session.token}`;
      await this.copyToClipboard(formUrl);
    } catch (error) {
      console.error("Error copying session link:", error);
      alert("Erro ao copiar link da sessão.");
    }
  }

  /**
   * Open session form in browser
   */
  openSessionForm(sessionId) {
    try {
      // Get session data to find the token
      const sessions = this.dataTable.data().toArray();
      const session = sessions.find((s) => s.sessionId === sessionId);

      if (!session) {
        alert("Sessão não encontrada.");
        return;
      }

      const formUrl = `${this.settings.frontendUrl}/${session.token}`;
      this.openPatientForm(formUrl);
    } catch (error) {
      console.error("Error opening session form:", error);
      alert("Erro ao abrir formulário da sessão.");
    }
  }

  /**
   * View session details
   */
  async viewSessionDetails(sessionId) {
    // Use the existing viewSessionData function to show session details with raw data
    await this.viewSessionData(sessionId);
  }

  /**
   * Hide session details panel
   */
  hideSessionDetails() {
    const detailsPanel = document.getElementById("session-details-panel");
    if (detailsPanel) {
      detailsPanel.style.display = "none";
    }
  }

  /**
   * Download session FHIR
   */
  async downloadSessionFHIR(sessionId) {
    try {
      const response = await fetch(
        `${this.settings.apiUrl}/api/sessions?action=fhir&sessionId=${sessionId}`,
        {
          headers: {
            "X-Doctor-ID": this.authenticatedDoctorId,
          },
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `session-${sessionId}-fhir.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        console.log("📄 FHIR downloaded for session:", sessionId);
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error("Error downloading FHIR:", error);
      alert(`Erro ao baixar FHIR: ${error.message}`);
    }
  }

  /**
   * Import session to family - create new family from webform data
   */
  async importSessionToFamily(sessionId, patientName) {
    try {
      // Check if this session has already been imported
      if (window.electronAPI && window.electronAPI.checkWebformImportStatus) {
        const statusResult = await window.electronAPI.checkWebformImportStatus(sessionId);
        
        if (statusResult.success && statusResult.isImported) {
          const message = this.t('doctorInterface.webform.alreadyImported', 'Esta sessão já foi importada para a família: {familyName}')
            .replace('{familyName}', statusResult.importData.family_name);
          alert(message);
          return;
        }
      }

      const familyName = `${patientName}-F`;
      
      // Confirm import action
      const confirmMessage = this.t('doctorInterface.webform.importConfirm', 
        'Deseja criar uma nova família a partir dos dados do formulário do paciente "{patientName}"?\n\nA família será criada com o nome "{familyName}".')
        .replace('{patientName}', patientName)
        .replace('{familyName}', familyName);
        
      if (!confirm(confirmMessage)) {
        return;
      }

      // Show loading state
      console.log("Starting webform import process...");
      
      // Note: Loading message removed for cleaner UX since we have the success modal

      // Fetch session data and FHIR from the API
      const [dataResponse, fhirResponse] = await Promise.all([
        fetch(`${this.settings.apiUrl}/api/sessions?action=data&sessionId=${sessionId}`, {
          headers: { "X-Doctor-ID": this.authenticatedDoctorId }
        }),
        fetch(`${this.settings.apiUrl}/api/sessions?action=fhir&sessionId=${sessionId}`, {
          headers: { "X-Doctor-ID": this.authenticatedDoctorId }
        })
      ]);

      if (!dataResponse.ok || !fhirResponse.ok) {
        throw new Error(this.t('doctorInterface.webform.sessionDataError', 'Erro ao buscar dados da sessão'));
      }

      const rawData = await dataResponse.json();
      const fhirData = await fhirResponse.json();

      // Get completion date from raw data or use current date
      const completionDate = rawData.sessionInfo?.submissionTime || 
                           rawData.rawData?.sessionInfo?.submissionTime ||
                           new Date().toISOString();

      // Prepare data for import
      const webformData = {
        sessionId,
        patientName,
        rawData,
        fhirData,
        completionDate
      };

      // Call IPC handler to create family and pedigree
      if (window.electronAPI && window.electronAPI.importWebformToFamily) {
        const result = await window.electronAPI.importWebformToFamily(webformData);
        
        if (result.success) {
          // Note: Loading message removal code removed since we no longer show loading message
          
          // Load import success modal if not already loaded
          if (!window.importSuccessModal) {
            console.log('📦 Loading import success modal...');
            
            // Dynamically load the modal script
            const script = document.createElement('script');
            script.src = 'src/script/components/importSuccessModal.js';
            script.onload = () => {
              console.log('✅ Import success modal loaded');
              this._showImportSuccessModal(result, sessionId, patientName);
            };
            script.onerror = () => {
              console.error('❌ Failed to load import success modal, using fallback');
              this._showFallbackSuccessMessage(result, sessionId, patientName);
            };
            document.head.appendChild(script);
          } else {
            // Modal already loaded
            this._showImportSuccessModal(result, sessionId, patientName);
          }
          
        } else {
          throw new Error(result.error || "Erro desconhecido ao importar");
        }
      } else {
        throw new Error(this.t('doctorInterface.webform.apiNotAvailable', 'API de importação não disponível'));
      }
      
    } catch (error) {
      console.error("Error importing session to family:", error);
      const errorMessage = this.t('doctorInterface.webform.importError', 'Erro ao importar formulário: {error}')
        .replace('{error}', error.message);
      
      // Show error in both alert and UI message
      alert(`❌ ${errorMessage}`);
      this.showMessage(errorMessage, "error");
    }
  }

  /**
   * Show the import success modal with family data
   */
  _showImportSuccessModal(result, sessionId, patientName) {
    console.log('🎯 Showing import success modal');
    
    // Prepare data for the modal
    const modalData = {
      familyName: result.familyName,
      familyId: result.familyId,
      pedigreeId: result.pedigreeId,
      patientName: patientName || result.patientName || 'Unknown',
      sessionId: sessionId,
      isWebformImport: true  // Flag this as a webform import
    };
    
    // Show the modal
    window.importSuccessModal.show(modalData);
    
    // Refresh the sessions table
    this.loadSessionsToDataTable();
    

  }

  /**
   * Fallback success message if modal fails to load
   */
  _showFallbackSuccessMessage(result, sessionId, patientName) {
    console.log('📄 Using fallback success message');
    
    const successMessage = `✅ Família criada com sucesso!\n\n` +
                          `📋 Nome: ${result.familyName}\n` +
                          `🆔 ID da Família: ${result.familyId}\n` +
                          `📊 ID do Pedigree: ${result.pedigreeId}\n\n` +
                          `🎯 A família está disponível no Centro de Famílias!`;
    
    alert(successMessage);
    
    // Refresh the sessions table
    this.loadSessionsToDataTable();
    
  }

  /**
   * Delete session from table
   */
  async deleteSessionFromTable(sessionId) {
    if (
      !confirm(
        "Tem certeza que deseja excluir esta sessão? Esta ação não pode ser desfeita."
      )
    ) {
      return;
    }

    try {
      // Based on interface.html, the delete endpoint uses query parameters
      const response = await fetch(
        `${this.settings.apiUrl}/api/sessions?action=delete&sessionId=${sessionId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            "X-Doctor-ID": this.authenticatedDoctorId,
          },
        }
      );

      if (response.ok) {
        // Refresh DataTable
        this.loadSessionsToDataTable();
        alert("Sessão excluída com sucesso!");
        console.log("🗑️ Session deleted:", sessionId);
      } else {
        const error = await response.text();
        throw new Error(error);
      }
    } catch (error) {
      console.error("Error deleting session:", error);
      alert(`Erro ao excluir sessão: ${error.message}`);
    }
  }

  /**
   * Display sessions in the UI
   */
  displaySessions(sessions, container) {
    if (sessions.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fa fa-calendar-o fa-3x"></i>
          <h4>${this.t(
            "doctor.sessions.noSessions",
            "Nenhuma sessão encontrada"
          )}</h4>
          <p>${this.t(
            "doctor.sessions.createFirst",
            "Crie sua primeira sessão!"
          )}</p>
          <button class="btn btn-primary" onclick="window.pedigreeApp?.doctorModule?.selectSection('create')">
            <i class="fa fa-plus"></i>
            ${this.t("doctor.sessions.createNew", "Criar Nova Sessão")}
          </button>
        </div>
      `;
      return;
    }

    const now = new Date();
    const sessionsHTML = sessions
      .map((session) => {
        const isExpired = new Date(session.expiresAt) < now;
        const hasData = session.hasFormData;

        let status = "pending";
        let statusText = this.t("doctor.session.status.pending", "Pendente");
        let statusIcon = "fa-clock-o";

        if (isExpired && !hasData) {
          status = "expired";
          statusText = this.t("doctor.session.status.expired", "Expirada");
          statusIcon = "fa-times-circle";
        } else if (hasData) {
          status = "completed";
          statusText = this.t("doctor.session.status.completed", "Concluída");
          statusIcon = "fa-check-circle";
        }

        // Format submission info
        let submissionInfo = "";
        if (hasData && session.submittedAt) {
          submissionInfo = `<p><i class="fa fa-check text-success"></i> <strong>${this.t(
            "doctor.session.submitted",
            "Enviado"
          )}:</strong> ${new Date(session.submittedAt).toLocaleString(
            "pt-BR"
          )}</p>`;
        } else if (hasData && session.submissionTime) {
          submissionInfo = `<p><i class="fa fa-check text-success"></i> <strong>${this.t(
            "doctor.session.submitted",
            "Enviado"
          )}:</strong> ${new Date(session.submissionTime).toLocaleString(
            "pt-BR"
          )}</p>`;
        } else if (hasData) {
          submissionInfo = `<p><i class="fa fa-check text-success"></i> <strong>${this.t(
            "doctor.session.dataReceived",
            "Dados recebidos"
          )}</strong></p>`;
        }

        return `
        <div class="session-item" onclick="window.pedigreeApp?.doctorModule?.selectSession('${
          session.sessionId
        }')">
          <div class="session-header">
            <div class="session-icon">
              <i class="fa ${statusIcon} status-${status}"></i>
            </div>
            <div class="session-info">
              <h5>${session.probandName} (${statusText})</h5>
              <p class="session-email">${session.email}</p>
            </div>
          </div>
          
          <div class="session-details">
            <p><strong>${this.t(
              "doctor.session.dob",
              "Data de Nascimento"
            )}:</strong> ${new Date(session.dob).toLocaleDateString(
          "pt-BR"
        )}</p>
            <p><strong>${this.t(
              "doctor.session.created",
              "Criada"
            )}:</strong> ${new Date(session.createdAt).toLocaleString(
          "pt-BR"
        )}</p>
            <p><strong>${this.t(
              "doctor.session.expires",
              "Expira"
            )}:</strong> ${new Date(session.expiresAt).toLocaleString(
          "pt-BR"
        )}</p>
            ${submissionInfo}
            ${
              session.notes
                ? `<p><strong>${this.t(
                    "doctor.session.notes",
                    "Observações"
                  )}:</strong> ${session.notes}</p>`
                : ""
            }
          </div>
          
          <div class="session-actions">
            ${
              !isExpired && !hasData
                ? `
              <button class="btn-icon" onclick="event.stopPropagation(); window.pedigreeApp?.doctorModule?.copyToClipboard('${
                this.settings.frontendUrl
              }/${session.token}')" title="${this.t(
                    "doctor.session.copyLink",
                    "Copiar Link"
                  )}">
                <i class="fa fa-clipboard"></i>
              </button>
              <button class="btn-icon" onclick="event.stopPropagation(); window.pedigreeApp?.doctorModule?.openPatientForm('${
                this.settings.frontendUrl
              }/${session.token}')" title="${this.t(
                    "doctor.session.openForm",
                    "Abrir Formulário"
                  )}">
                <i class="fa fa-external-link"></i>
              </button>
            `
                : ""
            }
            ${
              hasData
                ? `
              <button class="btn-icon" onclick="event.stopPropagation(); window.pedigreeApp?.doctorModule?.viewSessionData('${
                session.sessionId
              }')" title="${this.t("doctor.session.viewData", "Ver Dados")}">
                <i class="fa fa-file-text-o"></i>
              </button>
              <button class="btn-icon" onclick="event.stopPropagation(); window.pedigreeApp?.doctorModule?.downloadFHIR('${
                session.sessionId
              }')" title="${this.t(
                    "doctor.session.downloadFHIR",
                    "Baixar FHIR"
                  )}">
                <i class="fa fa-download"></i>
              </button>
            `
                : ""
            }
            <button class="btn-icon danger" onclick="event.stopPropagation(); window.pedigreeApp?.doctorModule?.deleteSession('${
              session.sessionId
            }')" title="${this.t("doctor.session.delete", "Excluir")}">
              <i class="fa fa-trash"></i>
            </button>
          </div>
        </div>
      `;
      })
      .join("");

    container.innerHTML = sessionsHTML;
  }

  /**
   * View session data
   */
  async viewSessionData(sessionId) {
    const detailsPanel = document.getElementById("session-details-panel");
    const detailsContent = document.getElementById("details-content");

    // Show the details panel
    detailsPanel.style.display = "block";
    
    // Show loading state
    detailsContent.innerHTML = `
      <div class="details-loading">
        <i class="fa fa-spinner fa-spin"></i>
        ${this.t("doctor.loading", "Carregando dados da sessão...")}
      </div>
    `;

    try {
      const response = await fetch(
        `${this.settings.apiUrl}/api/sessions?action=data&sessionId=${sessionId}`,
        {
          headers: {
            "X-Doctor-ID": this.authenticatedDoctorId,
          },
        }
      );

      if (response.ok) {
        const sessionData = await response.json();
        this.displaySessionData(sessionData, sessionId);
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error("Error loading session data:", error);
      detailsContent.innerHTML = `
        <div class="content-error">
          <i class="fa fa-exclamation-triangle"></i>
          <h4>${this.t(
            "doctor.session.dataError",
            "Erro ao Carregar Dados"
          )}</h4>
          <p>${error.message}</p>
        </div>
      `;
    }
  }

  /**
   * Display session data in details panel
   */
  displaySessionData(sessionData, sessionId) {
    const detailsContent = document.getElementById("details-content");

    let html = `<div class="session-data-viewer">`;

    // Header
    html += `
      <div class="session-data-header">
        <h4><i class="fa fa-file-text-o"></i> ${this.t(
          "doctor.session.dataTitle",
          "Dados da Sessão"
        )}</h4>
        <div class="header-actions">
          <button class="btn btn-sm btn-primary" onclick="window.pedigreeApp?.doctorModule?.downloadFHIR('${sessionId}')">
            <i class="fa fa-download"></i>
            ${this.t("doctor.session.downloadFHIR", "Baixar FHIR")}
          </button>
          <button class="btn btn-sm btn-secondary" onclick="window.pedigreeApp?.doctorModule?.generateRawReport('${sessionId}')">
            <i class="fa fa-file-pdf-o"></i>
            ${this.t("doctor.session.generateReport", "Gerar Relatório")}
          </button>
        </div>
      </div>
    `;

    // Session Info
    if (sessionData.sessionInfo) {
      const info = sessionData.sessionInfo;
      html += `
        <div class="data-section">
          <h5><i class="fa fa-info-circle"></i> ${this.t(
            "doctor.session.info",
            "Informações da Sessão"
          )}</h5>
          <div class="info-grid">
            ${
              info.submissionTime
                ? `<div class="info-item"><label>Enviado:</label><span>${new Date(
                    info.submissionTime
                  ).toLocaleString("pt-BR")}</span></div>`
                : ""
            }
            ${
              info.userAgent
                ? `<div class="info-item"><label>Navegador:</label><span>${info.userAgent}</span></div>`
                : ""
            }
            ${
              info.ip
                ? `<div class="info-item"><label>IP:</label><span>${info.ip}</span></div>`
                : ""
            }
            ${
              info.language
                ? `<div class="info-item"><label>Idioma:</label><span>${info.language}</span></div>`
                : ""
            }
          </div>
        </div>
      `;
    }

    // Form Data
    if (sessionData.formData) {
      html += `<div class="data-section">`;
      html += `<h5><i class="fa fa-wpforms"></i> ${this.t(
        "doctor.session.formData",
        "Dados do Formulário"
      )}</h5>`;

      const formData = sessionData.formData;

      // Patient Info
      if (formData.patientInfo) {
        html += `<h6>Informações do Paciente</h6>`;
        html += `<div class="info-grid">`;
        Object.entries(formData.patientInfo).forEach(([key, value]) => {
          if (value) {
            html += `<div class="info-item"><label>${key}:</label><span>${value}</span></div>`;
          }
        });
        html += `</div>`;
      }

      // Medical History
      if (formData.medicalHistory) {
        html += `<h6>Histórico Médico</h6>`;
        if (Array.isArray(formData.medicalHistory)) {
          html += `<ul class="medical-list">`;
          formData.medicalHistory.forEach((item) => {
            html += `<li>${item}</li>`;
          });
          html += `</ul>`;
        } else if (typeof formData.medicalHistory === "object") {
          html += `<div class="info-grid">`;
          Object.entries(formData.medicalHistory).forEach(([key, value]) => {
            if (value) {
              html += `<div class="info-item"><label>${key}:</label><span>${value}</span></div>`;
            }
          });
          html += `</div>`;
        }
      }

      // Family History
      if (formData.familyHistory) {
        html += `<h6>Histórico Familiar</h6>`;
        if (Array.isArray(formData.familyHistory)) {
          html += `<ul class="family-list">`;
          formData.familyHistory.forEach((item) => {
            html += `<li>${item}</li>`;
          });
          html += `</ul>`;
        } else if (typeof formData.familyHistory === "object") {
          html += `<div class="info-grid">`;
          Object.entries(formData.familyHistory).forEach(([key, value]) => {
            if (value) {
              html += `<div class="info-item"><label>${key}:</label><span>${value}</span></div>`;
            }
          });
          html += `</div>`;
        }
      }

      html += `</div>`;
    }

    // Raw Data (collapsed by default)
    if (sessionData.rawData) {
      html += `
        <div class="data-section">
          <h5>
            <a class="data-toggle" onclick="this.parentNode.nextElementSibling.style.display = this.parentNode.nextElementSibling.style.display === 'none' ? 'block' : 'none'">
              <i class="fa fa-code"></i> ${this.t(
                "doctor.session.rawData",
                "Dados Brutos"
              )} <i class="fa fa-chevron-down"></i>
            </a>
          </h5>
          <div class="raw-data-container" style="display: none;">
            <pre class="raw-data">${JSON.stringify(
              sessionData.rawData,
              null,
              2
            )}</pre>
          </div>
        </div>
      `;
    }

    html += `</div>`;
    detailsContent.innerHTML = html;
  }

  /**
   * Generate a human-readable PDF report from raw session data
   */
  async generateRawReport(sessionId) {
    try {
      // Disable UI by showing a loading message
      this.showMessage('Gerando relatório...', 'info', 'details-content');

      const res = await window.electronAPI.generateRawReport({ sessionId, userId: this.authenticatedDoctorId });

      if (res && res.success) {
        this.showMessage('Relatório gerado com sucesso!', 'success', 'details-content');
        // Offer to open the PDF
        const openNow = confirm('Abrir PDF do relatório agora?');
        if (openNow) {
          await window.electronAPI.familyCenter.openPdf(res.filePath);
        }
      } else {
        this.showMessage(`Erro ao gerar relatório: ${res?.error || 'unknown'}`, 'error', 'details-content');
      }
    } catch (error) {
      console.error('Error generating raw report:', error);
      this.showMessage(`Erro ao gerar relatório: ${error.message}`, 'error', 'details-content');
    }
  }

  /**
   * Generate PDF report directly from session (simplified flow)
   */
  /**
   * Download FHIR data for session
   */
  async downloadFHIR(sessionId) {
    try {
      const response = await fetch(
        `${this.settings.apiUrl}/api/sessions?action=fhir&sessionId=${sessionId}`,
        {
          headers: {
            "X-Doctor-ID": this.authenticatedDoctorId,
          },
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `session-${sessionId}-fhir.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        this.showMessage(
          "Arquivo FHIR baixado com sucesso!",
          "success",
          "details-content"
        );
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error("Error downloading FHIR:", error);
      this.showMessage(
        `Erro ao baixar FHIR: ${error.message}`,
        "error",
        "details-content"
      );
    }
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId) {
    if (
      !confirm(
        this.t(
          "doctor.session.confirmDelete",
          "Tem certeza que deseja excluir esta sessão? Esta ação não pode ser desfeita."
        )
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`${this.settings.apiUrl}/api/sessions`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "X-Doctor-ID": this.authenticatedDoctorId,
        },
        body: JSON.stringify({ sessionId: sessionId }),
      });

      if (response.ok) {
        this.showMessage(
          "Sessão excluída com sucesso!",
          "success",
          "details-content"
        );
        // Reload sessions list
        this.loadSessions();
      } else {
        const error = await response.text();
        throw new Error(error);
      }
    } catch (error) {
      console.error("Error deleting session:", error);
      this.showMessage(
        `Erro ao excluir sessão: ${error.message}`,
        "error",
        "details-content"
      );
    }
  }

  /**
   * Select a specific session from list
   */
  selectSession(sessionId) {
    // Update active state
    document.querySelectorAll(".session-item").forEach((item) => {
      item.classList.remove("active");
    });
    event.currentTarget?.classList.add("active");

    // Load session data in details panel
    this.viewSessionData(sessionId);
  }

  /**
   * Clear form
   */
  clearForm() {
    document.getElementById("proband-name").value = "";
    document.getElementById("patient-email").value = "";
    document.getElementById("patient-dob").value = "";
    document.getElementById("session-notes").value = "";

    // Clear details panel
    document.getElementById("details-content").innerHTML = `
      <div class="create-session-help">
        <i class="fa fa-info-circle fa-2x"></i>
        <h4>${this.t("doctor.session.createHelp", "Criar Nova Sessão")}</h4>
        <p>${this.t(
          "doctor.session.createHelpText",
          "Preencha os dados do paciente para criar uma nova sessão de aconselhamento genético."
        )}</p>
        <ul class="help-list">
          <li><i class="fa fa-check"></i> Nome do probando (paciente principal)</li>
          <li><i class="fa fa-check"></i> E-mail para envio do formulário</li>
          <li><i class="fa fa-check"></i> Data de nascimento</li>
          <li><i class="fa fa-check"></i> Observações (opcional)</li>
        </ul>
      </div>
    `;
  }

  /**
   * Copy text to clipboard
   */
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      // Show success message using browser alert for now
      alert("Link copiado para a área de transferência!");
    } catch (error) {
      console.error("Failed to copy:", error);
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      alert("Link copiado!");
    }
  }

  /**
   * Open patient form in browser
   */
  openPatientForm(url) {
    if (window.electronAPI && window.electronAPI.shell) {
      window.electronAPI.shell.openExternal(url);
    } else {
      window.open(url, "_blank");
    }
  }

  /**
   * Save settings
   */
  saveSettings(event) {
    event.preventDefault();

    const form = event.target;
    this.settings.apiUrl = document.getElementById("api-url").value.trim();
    this.settings.frontendUrl = document
      .getElementById("frontend-url")
      .value.trim();
    this.settings.autoRefresh = document.getElementById("auto-refresh").checked;
    this.settings.refreshInterval =
      parseInt(document.getElementById("refresh-interval").value) || 30;

    // Save to localStorage
    localStorage.setItem(
      "doctorInterfaceSettings",
      JSON.stringify(this.settings)
    );

    this.showMessage(
      "Configurações salvas com sucesso!",
      "success",
      "details-content"
    );

    // Update details panel with success message
    document.getElementById("details-content").innerHTML = `
      <div class="settings-saved">
        <i class="fa fa-check-circle fa-2x text-success"></i>
        <h4>${this.t("doctor.settings.saved", "Configurações Salvas")}</h4>
        <p>${this.t(
          "doctor.settings.savedMessage",
          "Suas configurações foram salvas com sucesso."
        )}</p>
        <div class="settings-summary">
          <div class="setting-item">
            <label>URL da API:</label>
            <span>${this.settings.apiUrl}</span>
          </div>
          <div class="setting-item">
            <label>URL do Frontend:</label>
            <span>${this.settings.frontendUrl}</span>
          </div>
          <div class="setting-item">
            <label>Atualização Automática:</label>
            <span>${this.settings.autoRefresh ? "Ativada" : "Desativada"}</span>
          </div>
          <div class="setting-item">
            <label>Intervalo:</label>
            <span>${this.settings.refreshInterval} segundos</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Test API connection
   */
  async testConnection() {
    const testBtn = document.getElementById("test-connection-btn");
    const connectionStatus = document.getElementById("connection-status");
    const detailsContent = document.getElementById("details-content");

    if (testBtn) {
      testBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Testando...';
      testBtn.disabled = true;
    }

    try {
      const response = await fetch(`${this.settings.apiUrl}/health`, {
        method: "GET",
        timeout: 10000,
      });

      if (response.ok) {
        const result = await response.json();
        const statusHtml = `
          <div class="connection-success">
            <i class="fa fa-check-circle text-success"></i>
            <span>Conectado (${result.version || "unknown"})</span>
          </div>
        `;

        if (connectionStatus) {
          connectionStatus.innerHTML = statusHtml;
        }

        detailsContent.innerHTML = `
          <div class="connection-test-success">
            <i class="fa fa-check-circle fa-2x text-success"></i>
            <h4>${this.t(
              "doctor.settings.connectionSuccess",
              "Conexão Estabelecida"
            )}</h4>
            <p>${this.t(
              "doctor.settings.connectionSuccessMessage",
              "A conexão com o servidor foi estabelecida com sucesso."
            )}</p>
            <div class="server-info">
              <div class="info-item">
                <label>URL:</label>
                <span>${this.settings.apiUrl}</span>
              </div>
              <div class="info-item">
                <label>Status:</label>
                <span class="text-success">Online</span>
              </div>
              <div class="info-item">
                <label>Versão:</label>
                <span>${result.version || "Não informada"}</span>
              </div>
              <div class="info-item">
                <label>Tempo de Resposta:</label>
                <span>${Date.now() - this.testStartTime}ms</span>
              </div>
            </div>
          </div>
        `;
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error("Connection test failed:", error);
      const statusHtml = `
        <div class="connection-error">
          <i class="fa fa-exclamation-triangle text-danger"></i>
          <span>Erro de Conexão</span>
        </div>
      `;

      if (connectionStatus) {
        connectionStatus.innerHTML = statusHtml;
      }

      detailsContent.innerHTML = `
        <div class="connection-test-error">
          <i class="fa fa-exclamation-triangle fa-2x text-danger"></i>
          <h4>${this.t(
            "doctor.settings.connectionError",
            "Erro de Conexão"
          )}</h4>
          <p class="error-message">${error.message}</p>
          <div class="troubleshooting">
            <h6>Possíveis soluções:</h6>
            <ul>
              <li>Verifique se a URL da API está correta</li>
              <li>Certifique-se de que o servidor está funcionando</li>
              <li>Verifique sua conexão com a internet</li>
              <li>Verifique se há bloqueios de firewall</li>
            </ul>
          </div>
        </div>
      `;
    } finally {
      if (testBtn) {
        testBtn.innerHTML = '<i class="fa fa-wifi"></i> Testar Conexão';
        testBtn.disabled = false;
      }
    }
  }

  /**
   * Show a message to user
   */
  showMessage(message, type = "info", containerId = null) {
    let container = null;

    if (containerId) {
      container = document.getElementById(containerId);
    }

    // If container doesn't exist or is null, use a fallback
    if (!container) {
      // Try to find the sessions section first
      container = document.getElementById("sessions-section");
      if (!container || container.style.display === "none") {
        // Fallback to document body or just show alert
        console.log(`📢 ${type.toUpperCase()}: ${message}`);
        alert(message);
        return;
      }
    }

    const messageDiv = document.createElement("div");
    messageDiv.className = `alert alert-${
      type === "error" ? "danger" : type
    } alert-dismissible fade show`;
    messageDiv.innerHTML = `
      <i class="fa fa-${
        type === "error"
          ? "exclamation-triangle"
          : type === "success"
          ? "check"
          : "info-circle"
      }"></i>
      ${message}
      <button type="button" class="btn-close" onclick="this.parentElement.remove()"></button>
    `;

    // Insert at top of container
    container.insertBefore(messageDiv, container.firstChild);

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      if (messageDiv.parentNode) {
        messageDiv.remove();
      }
    }, 5000);
  }

  /**
   * Get translation
   */
  t(key, defaultValue = key) {
    try {
      // Try to use global i18n if available
      if (window.i18n && typeof window.i18n.t === "function") {
        return window.i18n.t(key, defaultValue);
      }

      // Try to use pedigree app i18n
      if (window.pedigreeApp && window.pedigreeApp.i18n) {
        return window.pedigreeApp.i18n.t(key, defaultValue);
      }

      // Fallback to default value
      return defaultValue;
    } catch (error) {
      console.warn("Translation error for key:", key, error);
      return defaultValue;
    }
  }

  /**
   * Translation helper
   */
  t(key, fallback = key) {
    // Use global i18n if available
    if (window.i18n && typeof window.i18n.t === "function") {
      return window.i18n.t(key, fallback);
    }
    return fallback;
  }

  /**
   * Manual API status test (for debugging)
   */
  async testApiStatus() {
    console.log("🔄 Manual API status test triggered");

    // Show detailed feedback to user
    const statusText = document.getElementById("status-text");
    if (statusText) {
      statusText.textContent = "Testando...";
    }

    // Run the update with additional logging
    await this.updateApiStatus();

    // Show additional feedback in console for debugging
    console.log("📊 API Status Test Results:");
    console.log("- API URL:", this.settings.apiUrl);
    console.log("- Health endpoint:", `${this.settings.apiUrl}/health`);

    // Try a simple connectivity test
    try {
      const testResponse = await fetch(`${this.settings.apiUrl}/health`, {
        method: "HEAD", // Just check if endpoint exists
        mode: "no-cors", // Try to bypass CORS for basic connectivity
      });
      console.log("- Basic connectivity test:", testResponse.type);
    } catch (error) {
      console.log("- Basic connectivity failed:", error.message);
    }

    // Show browser alert with current status
    setTimeout(() => {
      const currentStatusText =
        document.getElementById("status-text")?.textContent || "Unknown";
      alert(
        `API Status: ${currentStatusText}\n\nCheck browser console (F12) for detailed information.`
      );
    }, 1000);
  }
}

console.log("👨‍⚕️ DoctorModule file loaded, setting window.DoctorModule...");

// Make DoctorModule globally available
window.DoctorModule = DoctorModule;

export default DoctorModule;