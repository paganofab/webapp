/**
 * Data Management Module
 * Handles backup, restore, import/export functionality
 */

class DataManagementModule {
  constructor(app) {
    this.app = app;
    // Use the global i18n system that's already set up by the main app
    this.i18n = window.i18n || app?.i18n || this.getFallbackI18n();
    this.isVisible = false;
  }

  /**
   * Translation helper with proper i18n integration
   */
  t(key, fallback) {
    try {
      // Try to use the real i18n system first
      if (this.i18n && typeof this.i18n.t === 'function') {
        return this.i18n.t(key, fallback);
      }
      // Fall back to our fallback system
      return this.getFallbackI18n().t(key, fallback);
    } catch (error) {
      console.warn(`Translation error for key "${key}":`, error);
      return fallback || key;
    }
  }

  /**
   * Get the module content HTML
   */
  getContent() {
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
<!-- Storage Information -->
<div class="management-section storage-section">
  <div class="section-header">
    <h3 data-i18n="dataManagement.storage.title">Storage Information</h3>
  </div>

  <ul class="storage-list" id="storage-stats">
    <li>
      <span data-i18n="dataManagement.storage.totalFamilies">Total Families:</span>
      <strong id="total-families-count">-</strong>
    </li>
    <li>
      <span data-i18n="dataManagement.storage.totalMembers">Total Members:</span>
      <strong id="total-members-count">-</strong>
    </li>
    <li>
      <span data-i18n="dataManagement.storage.totalPedigrees">Total Pedigrees:</span>
      <strong id="total-pedigrees-count">-</strong>
    </li>
    <li>
      <span data-i18n="dataManagement.storage.dbSize">Database Size:</span>
      <strong id="db-size">-</strong>
    </li>
    <li>
      <span data-i18n="dataManagement.storage.lastBackup">Last Backup:</span>
      <strong id="last-backup-date">-</strong>
    </li>
  </ul>

  <div class="storage-actions">
    <button class="btn-secondary" id="refresh-stats-btn" data-i18n="dataManagement.storage.refresh">
      Refresh Statistics
    </button>
  </div>
</div>


        <!-- Status Messages -->
        <div class="status-messages" id="status-messages"></div>
      </div>
    `;
  }

  /**
   * Initialize the module
   */
  async init() {
    console.log('🔧 Initializing Data Management module...');
    
    // Initialize i18n if not already done
    await this.initializeI18n();
    
    this.setupEventListeners();
    await this.loadStorageStats();
    
    // Apply translations to DOM elements with data-i18n attributes
    this.updateTranslations();
    
    console.log('✅ Data Management module initialized');
  }

  /**
   * Initialize i18n system
   */
  async initializeI18n() {
    try {
      // Use the global i18n system that should already be initialized by the main app
      if (window.i18n) {
        console.log('🌍 Using global i18n system for DataManagement...');
        this.i18n = window.i18n;
      } else {
        console.log('🌍 No global i18n found, using fallback system...');
        this.i18n = this.getFallbackI18n();
      }
      
      // Listen for language change events
      if (typeof document !== 'undefined') {
        document.addEventListener('language:changed', (event) => {
          console.log('🌍 Language changed in DataManagement, updating translations...');
          this.updateTranslations();
        });
      }
    } catch (error) {
      console.warn('⚠️ I18n initialization failed, using fallback:', error);
      this.i18n = this.getFallbackI18n();
    }
  }

  /**
   * Update translations for all elements with data-i18n attributes
   */
  updateTranslations() {
    try {
      // Find all elements with data-i18n attributes in our module
      const moduleContainer = document.querySelector('.data-management-module');
      if (!moduleContainer) return;

      const elementsToTranslate = moduleContainer.querySelectorAll('[data-i18n]');
      elementsToTranslate.forEach(element => {
        const translationKey = element.getAttribute('data-i18n');
        if (translationKey) {
          const translatedText = this.t(translationKey, element.textContent);
          element.textContent = translatedText;
        }
      });

      console.log(`🌍 Updated ${elementsToTranslate.length} translations in DataManagement module`);
    } catch (error) {
      console.warn('⚠️ Translation update failed:', error);
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Create backup button
    const createBackupBtn = document.getElementById('create-backup-btn');
    if (createBackupBtn) {
      createBackupBtn.addEventListener('click', () => {
        this.createBackup();
      });
    }

    // Restore button
    const restoreBtn = document.getElementById('restore-backup-btn');
    console.log('🔍 Looking for restore button with ID "restore-backup-btn"');
    console.log('🔍 Restore button element:', restoreBtn);
    console.log('🔍 Current DOM content:', document.getElementById('module-container')?.innerHTML?.substring(0, 500));
    if (restoreBtn) {
      console.log('✅ Restore button found, adding click listener');
      restoreBtn.addEventListener('click', (e) => {
        console.log('🔄 Restore button clicked', e.target);
        e.preventDefault();
        e.stopPropagation();
        this.restoreBackup();
      });
    } else {
      console.warn('⚠️ Restore button not found');
    }

    // Storage management buttons
    const refreshStatsBtn = document.getElementById('refresh-stats-btn');
    if (refreshStatsBtn) {
      refreshStatsBtn.addEventListener('click', () => {
        this.loadStorageStats();
      });
    }

    const cleanupBtn = document.getElementById('cleanup-btn');
    if (cleanupBtn) {
      cleanupBtn.addEventListener('click', () => {
        this.cleanupDatabase();
      });
    }
  }

  /**
   * Handle backup type selection change
   */
  handleBackupTypeChange(type) {
    const customOptions = document.getElementById('custom-backup-options');
    if (customOptions) {
      if (type === 'custom') {
        customOptions.classList.remove('hidden');
      } else {
        customOptions.classList.add('hidden');
      }
    }
  }

  /**
   * Setup file upload functionality
   */
  setupFileUpload() {
    const fileArea = document.getElementById('backup-file-area');
    const fileInput = document.getElementById('backup-file-input');

    if (fileArea && fileInput) {
      // Click to browse
      fileArea.addEventListener('click', () => {
        fileInput.click();
      });

      // File selection
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          this.handleBackupFileSelection(file);
        }
      });

      // Drag and drop
      fileArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        fileArea.classList.add('drag-over');
      });

      fileArea.addEventListener('dragleave', () => {
        fileArea.classList.remove('drag-over');
      });

      fileArea.addEventListener('drop', (e) => {
        e.preventDefault();
        fileArea.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
          this.handleBackupFileSelection(files[0]);
        }
      });
    }
  }

  /**
   * Create backup based on selected options
   */
  async createBackup() {
    try {
      const progressBar = document.getElementById('backup-progress');
      const progressFill = document.getElementById('backup-progress-fill');
      const progressText = document.getElementById('backup-progress-text');

      // Show progress
      progressBar.classList.remove('hidden');
      this.updateProgress(progressFill, progressText, 10, this.i18n.t('dataManagement.backup.starting', 'Starting backup...'));

      // Use IPC to create SQLite dump backup
      if (window.electronAPI && window.electronAPI.invoke) {
        this.updateProgress(progressFill, progressText, 50, this.i18n.t('dataManagement.backup.creating', 'Creating SQL dump...'));
        
        const result = await window.electronAPI.invoke('create-backup');
        
        if (result.success) {
          this.updateProgress(progressFill, progressText, 100, this.i18n.t('dataManagement.backup.complete', 'Backup completed!'));
          
          // Hide progress after delay
          setTimeout(() => {
            progressBar.classList.add('hidden');
          }, 2000);

          // Update last backup date
          localStorage.setItem('last-backup-date', new Date().toISOString());
          this.loadStorageStats();

          this.showMessage('success', this.i18n.t('dataManagement.backup.success', 'Backup created successfully!'));
        } else {
          throw new Error(result.message || 'Backup failed');
        }
      } else {
        throw new Error('Electron API not available');
      }

    } catch (error) {
      console.error('Backup creation error:', error);
      this.showMessage('error', this.i18n.t('dataManagement.backup.error', 'Error creating backup: ') + error.message);
      
      // Hide progress
      const progressBar = document.getElementById('backup-progress');
      if (progressBar) progressBar.classList.add('hidden');
    }
  }

  /**
   * Get backup include options based on type
   */
  getBackupIncludes(type) {
    switch (type) {
      case 'full':
        return {
          families: true,
          members: true,
          pedigrees: true,
          analyses: true,
          risks: true
        };
      case 'families':
        return {
          families: true,
          members: true,
          pedigrees: false,
          analyses: false,
          risks: false
        };
      case 'pedigrees':
        return {
          families: false,
          members: false,
          pedigrees: true,
          analyses: false,
          risks: false
        };
      case 'custom':
        return {
          families: document.getElementById('backup-families')?.checked || false,
          members: document.getElementById('backup-members')?.checked || false,
          pedigrees: document.getElementById('backup-pedigrees')?.checked || false,
          analyses: document.getElementById('backup-analyses')?.checked || false,
          risks: document.getElementById('backup-risks')?.checked || false
        };
      default:
        return {
          families: true,
          members: true,
          pedigrees: true,
          analyses: true,
          risks: true
        };
    }
  }

  /**
   * Collect backup data from database
   */
  async collectBackupData(includes, progressCallback) {
    const backupData = {
      metadata: {
        version: "1.0",
        created_at: new Date().toISOString(),
        app_version: "1.1.5",
        backup_type: includes,
        created_by: "PedigreePro Data Management"
      }
    };

    let progress = 20;

    try {
      // Collect families
      if (includes.families) {
        progressCallback(progress, this.i18n.t('dataManagement.backup.collectingFamilies', 'Collecting families...'));
        backupData.families = await window.electronAPI.invoke('get-all-families');
        progress += 15;
      }

      // Collect family members
      if (includes.members) {
        progressCallback(progress, this.i18n.t('dataManagement.backup.collectingMembers', 'Collecting family members...'));
        backupData.members = await window.electronAPI.invoke('get-all-family-members');
        progress += 15;
      }

      // Collect pedigrees
      if (includes.pedigrees) {
        progressCallback(progress, this.i18n.t('dataManagement.backup.collectingPedigrees', 'Collecting pedigrees...'));
        backupData.pedigrees = await window.electronAPI.invoke('get-all-pedigrees');
        progress += 15;
      }

      // Collect family analyses
      if (includes.analyses) {
        progressCallback(progress, this.i18n.t('dataManagement.backup.collectingAnalyses', 'Collecting analyses...'));
        backupData.analyses = await window.electronAPI.invoke('get-all-family-analyses');
        progress += 15;
      }

      // Collect risk assessments
      if (includes.risks) {
        progressCallback(progress, this.i18n.t('dataManagement.backup.collectingRisks', 'Collecting risk assessments...'));
        backupData.risks = await window.electronAPI.invoke('get-all-risk-assessments');
        progress += 10;
      }

      // Update metadata with counts
      backupData.metadata.total_families = backupData.families?.length || 0;
      backupData.metadata.total_members = backupData.members?.length || 0;
      backupData.metadata.total_pedigrees = backupData.pedigrees?.length || 0;
      backupData.metadata.total_analyses = backupData.analyses?.length || 0;
      backupData.metadata.total_risks = backupData.risks?.length || 0;

      return backupData;

    } catch (error) {
      console.error('Error collecting backup data:', error);
      throw new Error(`Failed to collect data: ${error.message}`);
    }
  }

  /**
   * Handle backup file selection for restore
   */
  async handleBackupFileSelection(file) {
    if (!file.name.endsWith('.json')) {
      this.showMessage('error', this.i18n.t('dataManagement.restore.invalidFile', 'Please select a valid JSON backup file.'));
      return;
    }

    try {
      const text = await file.text();
      const backupData = JSON.parse(text);

      // Validate backup format
      if (!this.validateBackupFile(backupData)) {
        this.showMessage('error', this.i18n.t('dataManagement.restore.invalidFormat', 'Invalid backup file format.'));
        return;
      }

      // Store backup data for restoration
      this.selectedBackupData = backupData;

      // Show preview
      this.showBackupPreview(backupData);

    } catch (error) {
      console.error('Error reading backup file:', error);
      this.showMessage('error', this.i18n.t('dataManagement.restore.readError', 'Error reading backup file: ') + error.message);
    }
  }

  /**
   * Validate backup file format
   */
  validateBackupFile(data) {
    return (
      data &&
      data.metadata &&
      data.metadata.version &&
      (data.families || data.members || data.pedigrees || data.analyses || data.risks)
    );
  }

  /**
   * Show backup preview
   */
  showBackupPreview(backupData) {
    const preview = document.getElementById('restore-preview');
    const backupInfo = document.getElementById('backup-info');

    if (preview && backupInfo) {
      const metadata = backupData.metadata;
      
      backupInfo.innerHTML = `
        <div class="backup-details">
          <div class="detail-item">
            <strong>${this.i18n.t('dataManagement.restore.version', 'Version')}:</strong> ${metadata.version || 'Unknown'}
          </div>
          <div class="detail-item">
            <strong>${this.i18n.t('dataManagement.restore.created', 'Created')}:</strong> ${new Date(metadata.created_at).toLocaleString()}
          </div>
          <div class="detail-item">
            <strong>${this.i18n.t('dataManagement.restore.appVersion', 'App Version')}:</strong> ${metadata.app_version || 'Unknown'}
          </div>
          <div class="detail-item">
            <strong>${this.i18n.t('dataManagement.restore.families', 'Families')}:</strong> ${metadata.total_families || 0}
          </div>
          <div class="detail-item">
            <strong>${this.i18n.t('dataManagement.restore.members', 'Members')}:</strong> ${metadata.total_members || 0}
          </div>
          <div class="detail-item">
            <strong>${this.i18n.t('dataManagement.restore.pedigrees', 'Pedigrees')}:</strong> ${metadata.total_pedigrees || 0}
          </div>
        </div>
      `;

      preview.classList.remove('hidden');
    }
  }

  /**
   * Restore backup data
   */
  async restoreBackup() {
    console.log('🔄 restoreBackup method called');
    try {
      const progressBar = document.getElementById('restore-progress');
      const progressFill = document.getElementById('restore-progress-fill');
      const progressText = document.getElementById('restore-progress-text');

      // Show progress
      progressBar.classList.remove('hidden');
      this.updateProgress(progressFill, progressText, 10, this.i18n.t('dataManagement.restore.starting', 'Starting restore...'));

      // Use IPC to restore from SQLite dump backup
      if (window.electronAPI && window.electronAPI.invoke) {
        this.updateProgress(progressFill, progressText, 50, this.i18n.t('dataManagement.restore.restoring', 'Restoring from backup...'));
        
        const result = await window.electronAPI.invoke('restore-backup');
        
        if (result.success) {
          this.updateProgress(progressFill, progressText, 100, this.i18n.t('dataManagement.restore.complete', 'Restore completed!'));
          
          // Hide progress after delay
          setTimeout(() => {
            progressBar.classList.add('hidden');
          }, 2000);

          this.showMessage('success', this.i18n.t('dataManagement.restore.success', 'Data restored successfully!'));
          this.loadStorageStats();

          // Reinitialize database connection after restore
          if (window.electronAPI.invoke) {
            await window.electronAPI.invoke('reinitialize-database');
          }
        } else {
          throw new Error(result.message || 'Restore failed');
        }
      } else {
        throw new Error('Electron API not available');
      }

    } catch (error) {
      console.error('Restore error:', error);
      this.showMessage('error', this.i18n.t('dataManagement.restore.error', 'Error restoring data: ') + error.message);
      
      const progressBar = document.getElementById('restore-progress');
      if (progressBar) progressBar.classList.add('hidden');
    }
  }

  /**
   * Perform the actual restore operation
   */
  async performRestore(backupData, mode, progressCallback) {
    let progress = 10;
    
    progressCallback(progress, this.i18n.t('dataManagement.restore.preparing', 'Preparing restore...'));

    // Clear existing data if replace mode
    if (mode === 'replace') {
      progressCallback(20, this.i18n.t('dataManagement.restore.clearing', 'Clearing existing data...'));
      await window.electronAPI.invoke('clear-all-data');
      progress = 30;
    }

    // Restore families
    if (backupData.families && backupData.families.length > 0) {
      progressCallback(progress, this.i18n.t('dataManagement.restore.restoringFamilies', 'Restoring families...'));
      await window.electronAPI.invoke('restore-families', backupData.families, mode);
      progress += 20;
    }

    // Restore members
    if (backupData.members && backupData.members.length > 0) {
      progressCallback(progress, this.i18n.t('dataManagement.restore.restoringMembers', 'Restoring family members...'));
      await window.electronAPI.invoke('restore-members', backupData.members, mode);
      progress += 20;
    }

    // Restore pedigrees
    if (backupData.pedigrees && backupData.pedigrees.length > 0) {
      progressCallback(progress, this.i18n.t('dataManagement.restore.restoringPedigrees', 'Restoring pedigrees...'));
      await window.electronAPI.invoke('restore-pedigrees', backupData.pedigrees, mode);
      progress += 20;
    }

    // Restore analyses
    if (backupData.analyses && backupData.analyses.length > 0) {
      progressCallback(progress, this.i18n.t('dataManagement.restore.restoringAnalyses', 'Restoring analyses...'));
      await window.electronAPI.invoke('restore-analyses', backupData.analyses, mode);
      progress += 10;
    }

    // Restore risk assessments
    if (backupData.risks && backupData.risks.length > 0) {
      progressCallback(progress, this.i18n.t('dataManagement.restore.restoringRisks', 'Restoring risk assessments...'));
      await window.electronAPI.invoke('restore-risks', backupData.risks, mode);
      progress += 10;
    }
  }

  /**
   * Cancel restore operation
   */
  cancelRestore() {
    const preview = document.getElementById('restore-preview');
    if (preview) {
      preview.classList.add('hidden');
    }
    
    this.selectedBackupData = null;
    
    // Reset file input
    const fileInput = document.getElementById('backup-file-input');
    if (fileInput) {
      fileInput.value = '';
    }
  }

  /**
   * Export data in specified format
   */
  async exportData(format) {
    try {
      this.showMessage('info', this.i18n.t('dataManagement.export.preparing', 'Preparing export...'));

      const result = await window.electronAPI.invoke('export-data', format);
      
      if (result.success) {
        this.showMessage('success', this.i18n.t('dataManagement.export.success', 'Data exported successfully!'));
      } else {
        this.showMessage('error', result.message || this.i18n.t('dataManagement.export.error', 'Export failed'));
      }

    } catch (error) {
      console.error('Export error:', error);
      this.showMessage('error', this.i18n.t('dataManagement.export.error', 'Export error: ') + error.message);
    }
  }

  /**
   * Load storage statistics
   */
  async loadStorageStats() {
    try {
      const stats = await window.electronAPI.invoke('get-storage-stats');
      
      document.getElementById('total-families-count').textContent = stats.totalFamilies || '0';
      document.getElementById('total-members-count').textContent = stats.totalMembers || '0';
      document.getElementById('total-pedigrees-count').textContent = stats.totalPedigrees || '0';
      document.getElementById('db-size').textContent = stats.dbSize || 'Unknown';
      
      const lastBackup = localStorage.getItem('last-backup-date');
      document.getElementById('last-backup-date').textContent = lastBackup 
        ? new Date(lastBackup).toLocaleDateString()
        : this.i18n.t('dataManagement.storage.never', 'Never');

    } catch (error) {
      console.error('Error loading storage stats:', error);
    }
  }

  /**
   * Clean up database
   */
  async cleanupDatabase() {
    const confirmed = confirm(this.i18n.t('dataManagement.storage.confirmCleanup', 'This will remove orphaned records and optimize the database. Continue?'));
    if (!confirmed) return;

    try {
      this.showMessage('info', this.i18n.t('dataManagement.storage.cleaning', 'Cleaning up database...'));
      
      const result = await window.electronAPI.invoke('cleanup-database');
      
      if (result.success) {
        this.showMessage('success', this.i18n.t('dataManagement.storage.cleanupSuccess', 'Database cleaned up successfully!'));
        this.loadStorageStats();
      } else {
        this.showMessage('error', result.message || this.i18n.t('dataManagement.storage.cleanupError', 'Cleanup failed'));
      }

    } catch (error) {
      console.error('Cleanup error:', error);
      this.showMessage('error', this.i18n.t('dataManagement.storage.cleanupError', 'Cleanup error: ') + error.message);
    }
  }

  /**
   * Update progress bar
   */
  updateProgress(progressFill, progressText, percentage, text) {
    if (progressFill) {
      progressFill.style.width = percentage + '%';
    }
    if (progressText) {
      progressText.textContent = text;
    }
  }

  /**
   * Show status message
   */
  showMessage(type, message) {
    const messagesContainer = document.getElementById('status-messages');
    if (!messagesContainer) return;

    const messageEl = document.createElement('div');
    messageEl.className = `status-message ${type}`;
    messageEl.textContent = message;

    messagesContainer.appendChild(messageEl);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      messageEl.remove();
    }, 5000);
  }

  /**
   * Show the module
   */
  show() {
    this.isVisible = true;
    this.init();
  }

  /**
   * Hide the module
   */
  hide() {
    this.isVisible = false;
  }
}

// Make available globally
window.DataManagementModule = DataManagementModule;

export default DataManagementModule;
