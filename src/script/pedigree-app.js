/**
 * PedigreePro Main Application
 * Handles the new 3-column layout and module navigation
 */

import TabManager from './tab-manager.js';
import FamilyDetailsModule from './modules/familyDetailsModule.js';

class PedigreeApp {
  constructor() {
    this.isElectron = window.electronAPI ? true : false;
    this.currentPedigree = null;
    this.actionDebounce = new Map(); // For debouncing rapid clicks
    this.currentLicense = this.getCurrentLicense();
    
    // Initialize family details module
    this.familyDetailsModule = new FamilyDetailsModule();
    window.familyDetailsModule = this.familyDetailsModule; // Make available globally for onclick handlers
    
    console.log('Initializing PedigreeApp, isElectron:', this.isElectron);
    console.log('License info:', this.currentLicense);
    
    // Initialize i18n system - check if available
    this.initializeI18n().then(() => {
      console.log('🌍 i18n system ready, continuing initialization...');
      this.completeInitialization();
    });
  }
  
  completeInitialization() {
    // Store user email in database
    this.storeUserEmailFromLicense();
    
    // Listen for language changes
    document.addEventListener('language:changed', (event) => {
      console.log('🌍 Language changed to:', event.detail.language);
      this.updateNavigationLabels();
      this.updateCurrentModuleContent();
      this.updateBreadcrumb(this.currentModule); // Update breadcrumb with new language
    });
    
    // Listen for i18n ready event
    document.addEventListener('i18n:ready', (event) => {
      console.log('🌍 i18n system is fully ready, updating UI...');
      this.updateNavigationLabels();
      
      // Load dashboard as default module if no module is currently loaded
      if (!this.currentModule) {
        console.log('Loading dashboard as default module...');
        this.switchModule('dashboard');
      }
      
      // Now it's safe to load the dashboard with proper translations
      this.loadDashboardData();
      
      // Force refresh the dashboard if it's currently shown
      if (!this.currentModule || this.currentModule === 'dashboard') {
        this.forceUpdateCurrentModule();
      }
      
    });
    // Add loading state for better UX
    this.setupLoadingStates();
    
    this.setupEventListeners();
    
    // IMMEDIATE FIX: Load dashboard immediately without waiting for i18n
    // This ensures content loads even if i18n events don't fire properly
    console.log('Loading dashboard immediately as fallback...');
    setTimeout(() => {
      if (!this.currentModule) {
        console.log('No module loaded yet, forcing dashboard load...');
        this.switchModule('dashboard');
        this.loadDashboardData();
      }
    }, 500); // Give some time for proper initialization
    
    this.updateCurrentPedigreeDisplay();
    this.updateLicenseDisplay();
  }

  // Add this method to your PedigreeApp class
translateStaticElements() {
  const elements = document.querySelectorAll('[data-i18n]');
  elements.forEach(element => {
    const key = element.getAttribute('data-i18n');
    const fallbackText = element.textContent;
    element.textContent = this.t(key, fallbackText);
  });
}

// Replace the initializeI18n method around line 73
async initializeI18n() {
  console.log('Starting i18n initialization...');
  
  // Wait for window.i18n to be available with retries
  let retries = 0;
  const maxRetries = 50; // 5 seconds max wait
  
  while (retries < maxRetries) {
    if (typeof window.i18n !== 'undefined' && window.i18n.setLanguage && typeof window.i18n.setLanguage === 'function') {
      this.i18n = window.i18n;
      console.log('🌍 Using global i18n system:', this.i18n);
      console.log('setLanguage method:', typeof this.i18n.setLanguage);
      console.log('Current language:', this.i18n.getCurrentLanguage());

    // Add this line after i18n is ready:
      this.translateStaticElements();
      return; // Success!
    }
    
    console.log(`Waiting for i18n system... (attempt ${retries + 1}/${maxRetries})`);
    await new Promise(resolve => setTimeout(resolve, 100)); // Wait 100ms
    retries++;
  }
  
  console.error('Global i18n system not found after waiting!');
  // Fallback - create a simple i18n stub with parameter substitution support
  this.i18n = {
    t: (key, fallback = key, variables = {}) => {
      let result = fallback;
      if (variables && typeof variables === 'object') {
        Object.keys(variables).forEach(variable => {
          const placeholder = `{${variable}}`;
          result = result.replace(new RegExp(placeholder, 'g'), variables[variable]);
        });
      }
      return result;
    },
    getCurrentLanguage: () => 'pt-BR',
    setLanguage: () => false,
    getAvailableLanguages: () => ({ 'pt-BR': 'Português (Brasil)' })
  };
}

// Replace the t() method around line 108
t(key, fallback = key, variables = {}) {
  if (this.i18n && this.i18n.t) {
    return this.i18n.t(key, fallback, variables);
  }
  
  // Fallback with manual variable substitution
  let result = fallback;
  if (variables && typeof variables === 'object') {
    Object.keys(variables).forEach(variable => {
      const placeholder = `{${variable}}`;
      result = result.replace(new RegExp(placeholder, 'g'), variables[variable]);
    });
  }
  
  return result;
}

// Add translation with interpolation method
ti(key, fallback = key, params = {}) {
  if (this.i18n && this.i18n.ti) {
    return this.i18n.ti(key, fallback, params);
  }
  
  // Fallback with manual parameter substitution
  let result = fallback;
  if (params && typeof params === 'object') {
    Object.keys(params).forEach(paramKey => {
      const placeholder = `{{${paramKey}}}`;
      result = result.replace(new RegExp(placeholder, 'g'), params[paramKey]);
    });
  }
  
  return result;
}

  getCurrentLicense() {
    try {
      const licenseData = localStorage.getItem('pedigree_license');
      return licenseData ? JSON.parse(licenseData) : null;
    } catch (error) {
      console.error('Error parsing license data:', error);
      return null;
    }
  }

  async storeUserEmailFromLicense() {
    try {
      const license = this.getCurrentLicense();
      
      if (license && license.email && this.isElectron) {
        console.log('📧 Storing user email:', license.email);
        
        const result = await window.electronAPI?.storeUserEmail?.(license.email);
        
        if (result && result.success) {
          console.log('✅ User email stored successfully in database');
        } else {
          console.error('❌ Failed to store user email:', result?.error);
        }
      } else {
        console.log('📧 No email found in license data or not in Electron environment');
      }
    } catch (error) {
      console.error('❌ Error storing user email from license:', error);
    }
  }

  updateLicenseDisplay() {
    if (!this.currentLicense) return;

    // Add license info to the UI if needed
    const licenseInfo = document.createElement('div');
    licenseInfo.className = 'license-info';
    licenseInfo.innerHTML = `
      <div class="license-tier">${this.currentLicense.tier === 'free' ? 'Free Plan' : 'Professional Plan'}</div>
      ${this.currentLicense.max_families !== -1 ? 
        `<div class="license-limit">Max ${this.currentLicense.max_families} families</div>` : 
        '<div class="license-limit">Unlimited families</div>'
      }
    `;
    
    // Add to sidebar if space available
    const sidebar = document.querySelector('.sidebar');
    if (sidebar && !sidebar.querySelector('.license-info')) {
      sidebar.appendChild(licenseInfo);
    }
  }

  async checkFamilyLimit(showWarning = true) {
    if (!this.currentLicense) {
      if (showWarning) {
        this.showNotification('No valid license found', 'error');
      }
      return false;
    }

    if (this.currentLicense.max_families === -1) {
      return true; // Unlimited
    }

    let currentCount = 0;
    if (this.isElectron && window.electronAPI) {
      currentCount = await window.electronAPI.getFamilyCount();
    } else {
      // For web version, count from localStorage or other storage
      const pedigrees = this.loadPedigreesFromStorage();
      currentCount = pedigrees.length;
    }

    if (currentCount >= this.currentLicense.max_families) {
      if (showWarning) {
        this.showLimitReachedDialog();
      }
      return false;
    }

    return true;
  }

  showLimitReachedDialog() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal license-limit-modal">
      <div class="modal-header">
        <h3>${this.t('licenseLimit.title', 'Family Limit Reached')}</h3>
      </div>
      <div class="modal-body">
        ${this.currentLicense.tier === 'free' ? `
          <div class="upgrade-info">
          <p>${this.ti('licenseLimit.limitReached', 'You have reached the limit of {{max_families}} families for your {{tier}} plan.', { max_families: this.currentLicense.max_families, tier: this.currentLicense.tier })}</p>
            <p><strong>${this.t('licenseLimit.upgradeTitle', 'Upgrade to Professional')}</strong> ${this.t('licenseLimit.upgradeDescription', 'for unlimited families and more!')}</p>
            <ul>
              <li>${this.t('licenseLimit.features.unlimitedFamilies', 'Unlimited families')}</li>
              <li>${this.t('licenseLimit.features.advancedAnalysis', 'Advanced genetic analysis')}</li>
              <li>${this.t('licenseLimit.features.customReports', 'Custom reports')}</li>
              <li>${this.t('licenseLimit.features.prioritySupport', 'Priority support')}</li>
            </ul>
          </div>
        ` : ''}
        </div>
        <div class="modal-footer">
          <div class="modal-buttons">
            ${this.currentLicense.tier === 'free' ? 
              `<button class="btn-primary" onclick="window.pedigreeApp.handleUpgradeButtonClick(this)">${this.t('licenseLimit.upgradeNow', 'Upgrade Now')}</button>` : 
              `<button class="btn-primary" onclick="window.pedigreeApp.handleLimitModalClose(this)">${this.t('licenseLimit.contactSupport', 'Contact Support')}</button>`
            }
          <button class="btn-secondary" onclick="window.pedigreeApp.handleLimitModalClose(this)">${this.t('licenseLimit.ok', 'OK')}</button>
        </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (modal.parentNode) {
        modal.remove();
      }
    }, 1000000);
  }

  // Handle license limit modal close - redirect user to dashboard
  handleLimitModalClose(buttonElement) {
    console.log('🚫 License limit modal closed, redirecting to dashboard...');
    
    // Remove the modal
    const modal = buttonElement.closest('.modal-overlay');
    if (modal) {
      modal.remove();
    }
    
    // Redirect user to dashboard to provide a clear next step
    if (this.currentModule !== 'dashboard') {
      console.log('🏠 Redirecting to dashboard after license limit');
      this.switchModule('dashboard');
    }
    
    // Show a brief notification to inform the user
    this.showNotification(
      this.t('licenseLimit.redirectNotification', 'Returned to dashboard due to family limit.'), 
      'info'
    );
  }

  // Handle upgrade button click - open upgrade URL and redirect to dashboard
  handleUpgradeButtonClick(buttonElement) {
    console.log('💰 Upgrade button clicked, opening upgrade URL...');
    
    // Remove the modal first
    const modal = buttonElement.closest('.modal-overlay');
    if (modal) {
      modal.remove();
    }
    
    // Open upgrade URL in new tab/window
    window.open('https://paypal.com', '_blank');
    
    // Redirect user to dashboard to provide a clear next step
    if (this.currentModule !== 'dashboard') {
      console.log('🏠 Redirecting to dashboard after upgrade button click');
      this.switchModule('dashboard');
    }
    
    // Show a notification explaining what happened
    this.showNotification(
      this.t('licenseLimit.upgradeNotification', 'Upgrade page opened. Return here after upgrading to create more families.'), 
      'info'
    );
  }

  loadPedigreesFromStorage() {
    // Fallback for web version
    try {
      const stored = localStorage.getItem('pedigrees');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading pedigrees from storage:', error);
      return [];
    }
  }

  setupLoadingStates() {
    // Add loading state management
    this.loading = {
      isLoading: false,
      setLoading: (loading) => {
        this.loading.isLoading = loading;
        const buttons = document.querySelectorAll('[data-action], [data-module]');
        buttons.forEach(btn => {
          if (loading) {
            btn.style.opacity = '0.6';
            btn.style.pointerEvents = 'none';
          } else {
            btn.style.opacity = '';  // Remove inline style to use CSS
            btn.style.pointerEvents = '';  // Remove inline style to use CSS
          }
        });
      }
    };
  }

  // Hide loading states and show dashboard content
  hideLoadingStates() {
    console.log('🎯 Hiding loading states and showing dashboard content...');
    
    try {
      // Use the loading state management system
      if (this.loading && this.loading.setLoading) {
        this.loading.setLoading(false);
      }

      // Check if we're currently on the dashboard module
      if (this.currentModule === 'dashboard') {
        console.log('🎯 Currently on dashboard, ensuring content is properly loaded...');
        
        // Check for the recent pedigrees loading element specifically
        const recentPedigreesContainer = document.getElementById('recent-pedigrees');
        if (recentPedigreesContainer) {
          const loadingElement = recentPedigreesContainer.querySelector('.loading');
          if (loadingElement) {
            console.log('🎯 Found loading element in recent pedigrees, will be replaced by displayRecentPedigrees()');
            // The displayRecentPedigrees method will replace this loading element
          }
        }
      }

      // Also check for main content loading (for initial load)
      const mainContent = document.getElementById('main-content');
      if (mainContent) {
        const mainLoadingElement = mainContent.querySelector('.loading');
        if (mainLoadingElement && !mainLoadingElement.closest('#recent-pedigrees')) {
          console.log('🎯 Found main loading element, checking if i18n is ready...');
          
          // Only load dashboard template if i18n is ready with translations
          if (window.ModuleTemplates && window.i18n && window.i18n.translations && Object.keys(window.i18n.translations).length > 0) {
            console.log('🎯 i18n ready, loading dashboard with translations...');
            mainContent.innerHTML = window.ModuleTemplates.getDashboardTemplate();
            
            // Load the recent pedigrees after template is loaded
            setTimeout(() => {
              this.loadRecentPedigreesInDashboard();
            }, 100);
          } else {
            console.log('🎯 i18n not ready yet, keeping loading state until i18n:ready event...');
            // Keep the loading state - will be handled by i18n:ready event
          }
        }
      }
      
      console.log('🎯 Loading states hidden successfully');
    } catch (error) {
      console.error('🎯 Error hiding loading states:', error);
    }
  }

  // Debounce function to prevent rapid clicks
  debounce(func, delay, key) {
    if (this.actionDebounce.has(key)) {
      console.log('Action debounced:', key);
      return Promise.resolve();
    }
    
    this.actionDebounce.set(key, true);
    setTimeout(() => {
      this.actionDebounce.delete(key);
    }, delay);
    
    return func();
  }

  init() {
    console.log('PedigreePro app initializing...');
    this.setupEventListeners();
    this.setupHamburgerMenu();
    this.setupModuleNavigation();
    this.setupTabNavigation();
    
    // Initialize navigation labels with current language
    this.updateNavigationLabels();
    
    // Switch to dashboard first to load the template, then load data
    this.switchModule('dashboard');
    this.loadDashboardData();
    this.updateCurrentPedigreeDisplay();
    
    // Debug: Log all buttons with data-action attributes
    setTimeout(() => {
      const actionButtons = document.querySelectorAll('[data-action]');
      console.log('Found', actionButtons.length, 'buttons with data-action attributes:');
      actionButtons.forEach(btn => {
        console.log('  -', btn.outerHTML);
      });
      
      // Check for problematic buttons
      const problemButtons = document.querySelectorAll('button[id*="new-pedigree"], button[id*="btn"]');
      if (problemButtons.length > 0) {
        console.log('Found potentially problematic buttons:');
        problemButtons.forEach(btn => {
          console.log('  - PROBLEM:', btn.outerHTML);
          // Try to fix them by adding the correct data attribute
          if (btn.textContent.includes('New Pedigree') && !btn.dataset.action) {
            console.log('  - FIXING: Adding data-action="new-pedigree"');
            btn.dataset.action = 'new-pedigree';
          }
        });
      }
    }, 1000);
    
    console.log('PedigreePro app initialized');
  }

  // Update navigation labels when language changes
  updateNavigationLabels() {
    console.log('🌍 Updating navigation labels...');
    
    const navigationMap = {
      'dashboard': 'navigation.dashboard',
      'pedigree-editor': 'navigation.pedigreeEditor',
      'family-center': 'navigation.familyCenter',
      'genetic-analysis': 'navigation.geneticAnalysis',
      'risk-assessment': 'navigation.riskAssessment',
      'research': 'navigation.research',
      'reports': 'navigation.reports',
      'doctor-interface': 'navigation.doctorInterface',
      'data-management': 'navigation.dataManagement',
      'settings': 'settings.title'
    };

    Object.entries(navigationMap).forEach(([module, translationKey]) => {
      const navItem = document.querySelector(`[data-module="${module}"] span:last-child`);
      if (navItem) {
        navItem.textContent = this.i18n.t(translationKey);
      }
    });
  }

  // Update current module content when language changes
  updateCurrentModuleContent() {
    if (this.currentModule) {
      console.log('🌍 Refreshing current module content:', this.currentModule);
      this.switchModule(this.currentModule);
    }
  }

  // Force update current module with new language
  forceUpdateCurrentModule() {
    if (this.currentModule) {
      console.log('🌍 Force updating module with new language:', this.currentModule);
      
      // Special handling for Family Center DataTables
      if (this.currentModule === 'family-center' && this.familiesDataTable) {
        // Update DataTable language without full reload for better UX
        this.updateFamiliesDataTableLanguage();
        return;
      }
      
      // Temporarily clear current module to force full reload
      const moduleToReload = this.currentModule;
      this.currentModule = null;
      
      // Switch to the module again to force template regeneration
      this.switchModule(moduleToReload);
      
      // If it's the settings module, setup the language selector again
      if (moduleToReload === 'settings') {
        setTimeout(() => {
          this.setupLanguageSelector();
        }, 100);
      }
    }
  }

  // Refresh a specific module (useful for login/logout scenarios)
  refreshModule(moduleId) {
    console.log('🔄 Refreshing module:', moduleId);
    
    if (this.currentModule === moduleId) {
      // If the module is currently active, switch to it again to refresh
      this.switchModule(moduleId);
    }
  }

  // Setup language selector in settings
  setupLanguageSelector() {
    console.log('Setting up language selector...');
    
    const languageSelector = document.getElementById('language-selector');
    if (languageSelector) {
      // Set current language as selected
      languageSelector.value = this.i18n.getCurrentLanguage();
      
      // Listen for language changes
      languageSelector.addEventListener('change', async (event) => {
        const newLanguage = event.target.value;
        console.log('🌍 Language selector changed to:', newLanguage);
        console.log('this.i18n is:', this.i18n);
        console.log('this.i18n.setLanguage is:', this.i18n?.setLanguage);
        console.log('window.i18n is:', window.i18n);
        console.log('window.i18n.setLanguage is:', window.i18n?.setLanguage);
        
        // Try loading i18n module directly
        try {
          console.log('🔄 Loading i18n module directly...');
          const i18nModule = await import('./i18n.js');
          const i18n = i18nModule.default;
          console.log('Loaded i18n:', i18n);
          console.log('� i18n.setLanguage:', typeof i18n.setLanguage);
          
          if (i18n && typeof i18n.setLanguage === 'function') {
            if (i18n.setLanguage(newLanguage)) {
              console.log('Language changed successfully to:', newLanguage);
              
              // Update this.i18n reference
              this.i18n = i18n;
              window.i18n = i18n; // Also update global
              
              // Update navigation labels immediately
              this.updateNavigationLabels();
              
              // Force regenerate current module content with new language
              setTimeout(() => {
                this.forceUpdateCurrentModule();
              }, 100);
              
              // Fire custom event for other components
              document.dispatchEvent(new CustomEvent('language:changed', {
                detail: { language: newLanguage }
              }));
              
            } else {
              console.error('Failed to change language with imported i18n');
            }
          } else {
            console.error('Imported i18n not valid or setLanguage not a function');
          }
        } catch (error) {
          console.error('Failed to import i18n module:', error);
        }
      });
      
      console.log('Language selector setup complete');
    } else {
      console.error('Language selector element not found');
    }
  }

  // Setup PDF settings controls in settings module
  async setupPdfSettings() {
    console.log('Setting up PDF settings...');
    
    // Load current PDF settings from IPC
    const pdfSettings = await this.loadPdfSettings();
    
    // Set up all PDF setting controls
    this.initializePdfControls(pdfSettings);
    
    // Set up event listeners for PDF settings
    this.setupPdfEventListeners();
    
    console.log('PDF settings setup complete');
  }

  // Load PDF settings from IPC with defaults
  async loadPdfSettings() {
    const defaultSettings = {
      pageSize: 'A4',
      layout: 'landscape',
      legendPosition: 'TopRight',
      compression: false,
      privacyLevel: 'all',
      autoSave: true
    };
    
    try {
      if (window.electronAPI && window.electronAPI.getPdfSettings) {
        const result = await window.electronAPI.getPdfSettings();
        if (result && result.success) {
          return result.settings;
        }
      }
    } catch (error) {
      console.error('Error loading PDF settings:', error);
    }
    
    return defaultSettings;
  }

  // Save PDF settings via IPC
  async savePdfSettings(settings) {
    try {
      if (window.electronAPI && window.electronAPI.savePdfSettings) {
        const result = await window.electronAPI.savePdfSettings(settings);
        if (result && result.success) {
          console.log('PDF settings saved:', settings);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Error saving PDF settings:', error);
      return false;
    }
  }

  // Initialize PDF controls with current settings
  initializePdfControls(settings) {
    // Page size
    const pageSizeSelect = document.getElementById('pdf-page-size');
    if (pageSizeSelect) {
      pageSizeSelect.value = settings.pageSize;
    }
    
    // Layout (radio buttons)
    const layoutRadios = document.querySelectorAll('input[name="pdf-layout"]');
    layoutRadios.forEach(radio => {
      radio.checked = radio.value === settings.layout;
    });
    
    // Legend position
    const legendSelect = document.getElementById('pdf-legend-position');
    if (legendSelect) {
      legendSelect.value = settings.legendPosition;
    }
    
    // Compression toggle
    const compressionToggle = document.getElementById('pdf-compression');
    if (compressionToggle) {
      compressionToggle.checked = settings.compression;
    }
    
    // Privacy level
    const privacySelect = document.getElementById('pdf-privacy-level');
    if (privacySelect) {
      privacySelect.value = settings.privacyLevel;
    }
    
    // Auto-save toggle
    const autoSaveToggle = document.getElementById('pdf-auto-save');
    if (autoSaveToggle) {
      autoSaveToggle.checked = settings.autoSave;
    }
    
    // Watermark settings
    const watermarkEnabled = document.getElementById('pdf-watermark-enabled');
    if (watermarkEnabled) {
      watermarkEnabled.checked = settings.watermarkEnabled || false;
    }
    
    const watermarkText = document.getElementById('pdf-watermark-text');
    if (watermarkText) {
      watermarkText.value = settings.watermarkText || 'CONFIDENTIAL';
    }
    
    const watermarkOpacity = document.getElementById('pdf-watermark-opacity');
    if (watermarkOpacity) {
      watermarkOpacity.value = settings.watermarkOpacity || 30;
      // Update the displayed value
      const rangeValue = document.querySelector('.range-value');
      if (rangeValue) {
        rangeValue.textContent = `${watermarkOpacity.value}%`;
      }
    }
    
    const watermarkPosition = document.getElementById('pdf-watermark-position');
    if (watermarkPosition) {
      watermarkPosition.value = settings.watermarkPosition || 'center';
    }
    
    const watermarkSize = document.getElementById('pdf-watermark-size');
    if (watermarkSize) {
      watermarkSize.value = settings.watermarkSize || 'medium';
    }
    
    // Show/hide watermark options based on enabled state
    this.toggleWatermarkOptions(settings.watermarkEnabled || false);
  }

  // Setup event listeners for PDF settings
  setupPdfEventListeners() {
    // Save button
    const saveBtn = document.getElementById('pdf-settings-save');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.handlePdfSettingsSave());
    }
    
    // Reset button
    const resetBtn = document.getElementById('pdf-settings-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => this.handlePdfSettingsReset());
    }
    
    // Test generation button
    const testBtn = document.getElementById('pdf-test-generation');
    if (testBtn) {
      testBtn.addEventListener('click', () => this.handlePdfTestGeneration());
    }
    
    // Live preview on change (optional)
    const allInputs = document.querySelectorAll('#pdf-page-size, input[name="pdf-layout"], #pdf-legend-position, #pdf-compression, #pdf-privacy-level, #pdf-auto-save, #pdf-watermark-enabled, #pdf-watermark-text, #pdf-watermark-opacity, #pdf-watermark-position, #pdf-watermark-size');
    allInputs.forEach(input => {
      input.addEventListener('change', () => this.showPdfSettingsPreview());
    });
    
    // Watermark enable/disable toggle
    const watermarkEnabled = document.getElementById('pdf-watermark-enabled');
    if (watermarkEnabled) {
      watermarkEnabled.addEventListener('change', (e) => {
        this.toggleWatermarkOptions(e.target.checked);
      });
    }
    
    // Watermark opacity range display
    const watermarkOpacity = document.getElementById('pdf-watermark-opacity');
    if (watermarkOpacity) {
      watermarkOpacity.addEventListener('input', (e) => {
        const rangeValue = document.querySelector('.range-value');
        if (rangeValue) {
          rangeValue.textContent = `${e.target.value}%`;
        }
      });
    }
  }

  // Handle save PDF settings
  async handlePdfSettingsSave() {
    const settings = this.collectPdfSettings();
    
    if (await this.savePdfSettings(settings)) {
      this.showToast('PDF settings saved successfully!', 'success');
    } else {
      this.showToast('Failed to save PDF settings', 'error');
    }
  }

  // Handle reset PDF settings
  async handlePdfSettingsReset() {
    if (confirm('Reset all PDF settings to defaults?')) {
      // Load and save default settings
      const defaultSettings = {
        pageSize: 'A4',
        layout: 'landscape',
        legendPosition: 'TopRight',
        compression: false,
        privacyLevel: 'all',
        autoSave: true,
        watermarkEnabled: false,
        watermarkText: 'CONFIDENTIAL',
        watermarkOpacity: 30,
        watermarkPosition: 'center',
        watermarkSize: 'medium'
      };
      
      await this.savePdfSettings(defaultSettings);
      this.initializePdfControls(defaultSettings);
      
      this.showToast('PDF settings reset to defaults', 'info');
    }
  }

  // Handle test PDF generation
  async handlePdfTestGeneration() {
    const settings = this.collectPdfSettings();
    const testBtn = document.getElementById('pdf-test-generation');
    
    if (testBtn) {
      testBtn.disabled = true;
      testBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Generating...';
    }
    
    try {
      // This would trigger a test PDF generation with current settings
      // For now, just show a preview of what would be generated
      this.showToast(`Test PDF would be generated with: ${settings.pageSize}, ${settings.layout}, ${settings.legendPosition}`, 'info');
      
      // In a real implementation, you would call the PDF generation API here
      // await this.generateTestPdf(settings);
      
    } catch (error) {
      console.error('Test PDF generation failed:', error);
      this.showToast('Test PDF generation failed', 'error');
    } finally {
      if (testBtn) {
        testBtn.disabled = false;
        testBtn.innerHTML = '<i class="fa fa-file-pdf"></i> Test PDF Generation';
      }
    }
  }

  // Collect current PDF settings from form
  collectPdfSettings() {
    const pageSizeSelect = document.getElementById('pdf-page-size');
    const layoutRadio = document.querySelector('input[name="pdf-layout"]:checked');
    const legendSelect = document.getElementById('pdf-legend-position');
    const compressionToggle = document.getElementById('pdf-compression');
    const privacySelect = document.getElementById('pdf-privacy-level');
    const autoSaveToggle = document.getElementById('pdf-auto-save');
    const watermarkEnabled = document.getElementById('pdf-watermark-enabled');
    const watermarkText = document.getElementById('pdf-watermark-text');
    const watermarkOpacity = document.getElementById('pdf-watermark-opacity');
    const watermarkPosition = document.getElementById('pdf-watermark-position');
    const watermarkSize = document.getElementById('pdf-watermark-size');
    
    return {
      pageSize: pageSizeSelect?.value || 'A4',
      layout: layoutRadio?.value || 'landscape',
      legendPosition: legendSelect?.value || 'TopRight',
      compression: compressionToggle?.checked || false,
      privacyLevel: privacySelect?.value || 'all',
      autoSave: autoSaveToggle?.checked || true,
      watermarkEnabled: watermarkEnabled?.checked || false,
      watermarkText: watermarkText?.value || 'CONFIDENTIAL',
      watermarkOpacity: parseInt(watermarkOpacity?.value || 30),
      watermarkPosition: watermarkPosition?.value || 'center',
      watermarkSize: watermarkSize?.value || 'medium'
    };
  }

  // Toggle watermark options visibility
  toggleWatermarkOptions(enabled) {
    const watermarkOptions = document.querySelectorAll('.watermark-options');
    watermarkOptions.forEach(option => {
      if (enabled) {
        option.style.display = 'flex';
        option.classList.add('show');
      } else {
        option.style.display = 'none';
        option.classList.remove('show');
      }
    });
  }

  // Show live preview of settings changes
  showPdfSettingsPreview() {
    const settings = this.collectPdfSettings();
    
    // Optional: Show a preview of what the PDF would look like
    console.log('PDF settings preview:', settings);
  }

  // ===== DOCTOR INFORMATION MANAGEMENT =====

  // Setup doctor information form
  async setupDoctorInfo() {
    console.log('Setting up doctor information form...');
    
    try {
      // Check if doctor form elements exist
      const saveButton = document.getElementById('doctor-info-save');
      if (!saveButton) {
        console.warn('Doctor form save button not found in DOM');
        return;
      }
      
      // Load existing doctor information
      await this.loadDoctorInfo();
      
      // Setup event listeners
      this.setupDoctorEventListeners();
      
      console.log('Doctor information setup complete');
    } catch (error) {
      console.error('Error setting up doctor information:', error);
      this.showDoctorMessage('Erro ao carregar informações do médico', 'error');
    }
  }

  // Load doctor information from database
  async loadDoctorInfo() {
    try {
      if (!window.electronAPI?.doctorInfo?.getDoctorInfo) {
        console.warn('Doctor info API not available');
        return;
      }

      const result = await window.electronAPI.doctorInfo.getDoctorInfo();
      
      if (result.success && result.doctorInfo) {
        this.populateDoctorForm(result.doctorInfo);
        console.log('Doctor information loaded successfully');
      } else {
        console.log('No existing doctor information found');
      }
    } catch (error) {
      console.error('Error loading doctor info:', error);
      this.showDoctorMessage('Erro ao carregar informações do médico', 'error');
    }
  }

  // Populate form with doctor information
  populateDoctorForm(doctorInfo) {
    const fields = {
      'doctor-full-name': doctorInfo.full_name,
      'doctor-professional-title': doctorInfo.professional_title,
      'doctor-academic-titles': doctorInfo.academic_titles,
      'doctor-crm-number': doctorInfo.crm_number,
      'doctor-crm-state': doctorInfo.crm_state,
      'doctor-specialty': doctorInfo.specialty,
      'doctor-subspecialty': doctorInfo.subspecialty,
      'doctor-clinic-name': doctorInfo.clinic_name,
      'doctor-clinic-address': doctorInfo.clinic_address,
      'doctor-clinic-city': doctorInfo.clinic_city,
      'doctor-clinic-state': doctorInfo.clinic_state,
      'doctor-clinic-postal-code': doctorInfo.clinic_postal_code,
      'doctor-clinic-phone': doctorInfo.clinic_phone,
      'doctor-clinic-email': doctorInfo.clinic_email,
      'doctor-personal-email': doctorInfo.personal_email,
      'doctor-website': doctorInfo.website,
      'doctor-linkedin': doctorInfo.linkedin,
      'doctor-consultation-hours': doctorInfo.consultation_hours
    };

    // Populate form fields
    Object.keys(fields).forEach(fieldId => {
      const field = document.getElementById(fieldId);
      if (field && fields[fieldId]) {
        field.value = fields[fieldId];
      }
    });
  }

  // Setup event listeners for doctor form
  setupDoctorEventListeners() {
    // Save button
    const saveBtn = document.getElementById('doctor-info-save');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.saveDoctorInfo());
    }

    // Clear button
    const clearBtn = document.getElementById('doctor-info-clear');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clearDoctorForm());
    }

    // Variables preview button
    const previewBtn = document.getElementById('doctor-variables-preview');
    if (previewBtn) {
      previewBtn.addEventListener('click', () => this.showDoctorVariablesPreview());
    }

    // Input validation
    this.setupDoctorFormValidation();
  }

  // Setup form validation
  setupDoctorFormValidation() {
    // CRM number validation (numbers only)
    const crmNumberField = document.getElementById('doctor-crm-number');
    if (crmNumberField) {
      crmNumberField.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '');
      });
    }

    // Postal code formatting
    const postalCodeField = document.getElementById('doctor-clinic-postal-code');
    if (postalCodeField) {
      postalCodeField.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length <= 8) {
          if (value.length > 5) {
            value = value.substring(0, 5) + '-' + value.substring(5);
          }
          e.target.value = value;
        }
      });
    }

    // Phone formatting
    const phoneField = document.getElementById('doctor-clinic-phone');
    if (phoneField) {
      phoneField.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length <= 11) {
          if (value.length > 6) {
            if (value.length === 11) {
              value = value.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
            } else {
              value = value.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
            }
          } else if (value.length > 2) {
            value = value.replace(/(\d{2})(\d+)/, '($1) $2');
          }
          e.target.value = value;
        }
      });
    }
  }

  // Save doctor information
  async saveDoctorInfo() {
    try {
      // Validate required fields
      if (!this.validateDoctorForm()) {
        return;
      }

      // Show loading state
      const saveBtn = document.getElementById('doctor-info-save');
      const originalContent = saveBtn.innerHTML;
      saveBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Salvando...';
      saveBtn.disabled = true;

      // Collect form data
      const doctorData = this.collectDoctorFormData();
      
      // Save via API
      const result = await window.electronAPI.doctorInfo.saveDoctorInfo(doctorData);
      
      if (result.success) {
        this.showDoctorMessage('Informações do médico salvas com sucesso!', 'success');
        
        // Update report module variables if it's loaded
        if (window.pedigreeApp?.reportModule) {
          window.pedigreeApp.reportModule.refreshDoctorVariables?.();
        }
      } else {
        this.showDoctorMessage(result.error || 'Erro ao salvar informações', 'error');
      }
      
      // Restore button state
      saveBtn.innerHTML = originalContent;
      saveBtn.disabled = false;
      
    } catch (error) {
      console.error('Error saving doctor info:', error);
      this.showDoctorMessage('Erro ao salvar informações do médico', 'error');
      
      // Restore button state
      const saveBtn = document.getElementById('doctor-info-save');
      saveBtn.innerHTML = '<i class="fa fa-save"></i> Salvar Informações do Médico';
      saveBtn.disabled = false;
    }
  }

  // Validate doctor form
  validateDoctorForm() {
    const fullNameField = document.getElementById('doctor-full-name');
    const crmNumberField = document.getElementById('doctor-crm-number');
    const crmStateField = document.getElementById('doctor-crm-state');

    if (!fullNameField) {
      this.showDoctorMessage('Formulário não encontrado. Por favor, recarregue a página.', 'error');
      return false;
    }

    const fullName = fullNameField.value.trim();
    const crmNumber = crmNumberField ? crmNumberField.value.trim() : '';
    const crmState = crmStateField ? crmStateField.value : '';

    if (!fullName) {
      this.showDoctorMessage('Nome completo é obrigatório', 'error');
      fullNameField.focus();
      return false;
    }

    if (crmNumber && !/^\d+$/.test(crmNumber)) {
      this.showDoctorMessage('Número do CRM deve conter apenas números', 'error');
      if (crmNumberField) crmNumberField.focus();
      return false;
    }

    if (crmNumber && !crmState) {
      this.showDoctorMessage('Estado do CRM é obrigatório quando número do CRM é informado', 'error');
      if (crmStateField) crmStateField.focus();
      return false;
    }

    return true;
  }

  // Collect form data
  collectDoctorFormData() {
    // Helper function to safely get field value
    const getFieldValue = (fieldId, defaultValue = '') => {
      const field = document.getElementById(fieldId);
      return field ? field.value.trim() : defaultValue;
    };

    return {
      full_name: getFieldValue('doctor-full-name'),
      professional_title: getFieldValue('doctor-professional-title', 'Dra.'),
      academic_titles: getFieldValue('doctor-academic-titles'),
      crm_number: getFieldValue('doctor-crm-number'),
      crm_state: getFieldValue('doctor-crm-state'),
      specialty: getFieldValue('doctor-specialty'),
      subspecialty: getFieldValue('doctor-subspecialty'),
      clinic_name: getFieldValue('doctor-clinic-name'),
      clinic_address: getFieldValue('doctor-clinic-address'),
      clinic_city: getFieldValue('doctor-clinic-city'),
      clinic_state: getFieldValue('doctor-clinic-state'),
      clinic_postal_code: getFieldValue('doctor-clinic-postal-code'),
      clinic_phone: getFieldValue('doctor-clinic-phone'),
      clinic_email: getFieldValue('doctor-clinic-email'),
      personal_email: getFieldValue('doctor-personal-email'),
      website: getFieldValue('doctor-website'),
      linkedin: getFieldValue('doctor-linkedin'),
      consultation_hours: getFieldValue('doctor-consultation-hours'),
      certifications: [], // Can be extended later
      languages_spoken: ['Português'] // Default, can be extended later
    };
  }

  // Clear form
  clearDoctorForm() {
    if (confirm('Tem certeza que deseja limpar todas as informações do formulário?')) {
      const saveButton = document.getElementById('doctor-info-save');
      const form = saveButton ? saveButton.closest('.settings-section') : null;
      
      if (form) {
        const inputs = form.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
          if (input.type === 'select-one') {
            input.selectedIndex = 0;
          } else {
            input.value = '';
          }
        });
        
        // Reset professional title to default
        const titleField = document.getElementById('doctor-professional-title');
        if (titleField) {
          titleField.value = 'Dra.';
        }
      } else {
        this.showDoctorMessage('Formulário não encontrado', 'error');
      }
    }
  }

  // Show doctor variables preview
  async showDoctorVariablesPreview() {
    try {
      const result = await window.electronAPI.doctorInfo.getDoctorVariables();
      
      if (!result.success) {
        this.showDoctorMessage('Erro ao carregar variáveis', 'error');
        return;
      }

      // Create modal
      const modal = document.createElement('div');
      modal.className = 'doctor-variables-modal';
      modal.innerHTML = `
        <div class="modal-content">
          <div class="modal-header">
            <h3><i class="fa fa-code"></i> Variáveis Disponíveis para Relatórios</h3>
            <button class="modal-close">&times;</button>
          </div>
          <div class="modal-body">
            <p>As seguintes variáveis podem ser usadas em modelos de relatórios:</p>
            <ul class="variables-list">
              ${Object.entries(result.variables).map(([key, value]) => `
                <li>
                  <span class="variable-name">{{${key}}}</span>
                  <span class="variable-description">${this.getVariableDescription(key)}</span>
                  <span class="variable-value">${value}</span>
                </li>
              `).join('')}
            </ul>
          </div>
        </div>
      `;

      // Add event listeners
      modal.querySelector('.modal-close').addEventListener('click', () => {
        modal.remove();
      });
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.remove();
        }
      });

      document.body.appendChild(modal);
      
    } catch (error) {
      console.error('Error showing variables preview:', error);
      this.showDoctorMessage('Erro ao mostrar variáveis', 'error');
    }
  }

  // Get variable description in Portuguese
  getVariableDescription(variableName) {
    const descriptions = {
      doctorName: 'Nome do médico',
      doctorTitle: 'Título profissional',
      doctorCRM: 'CRM formatado',
      doctorSpecialty: 'Especialidade médica',
      clinicName: 'Nome da clínica',
      clinicAddress: 'Endereço completo da clínica',
      clinicPhone: 'Telefone da clínica',
      clinicEmail: 'E-mail da clínica',
      fullDoctorName: 'Nome completo com título',
      doctorSignature: 'Assinatura formatada completa',
      consultationHours: 'Horários de consulta'
    };
    return descriptions[variableName] || 'Variável personalizada';
  }

  // Show doctor form message
  showDoctorMessage(message, type = 'info') {
    // Remove existing messages
    const existingMessages = document.querySelectorAll('.doctor-info-message');
    existingMessages.forEach(msg => msg.remove());

    // Create new message
    const messageDiv = document.createElement('div');
    messageDiv.className = `doctor-info-message ${type}`;
    const icon = type === 'success' ? 'check-circle' : 
                 type === 'error' ? 'exclamation-triangle' : 'info-circle';
    messageDiv.innerHTML = `<i class="fa fa-${icon}"></i>${message}`;

    // Insert at the beginning of the doctor section
    const saveButton = document.getElementById('doctor-info-save');
    let doctorSection = null;
    
    if (saveButton) {
      // Find the closest settings section that contains the save button
      doctorSection = saveButton.closest('.settings-section');
    }
    
    if (doctorSection) {
      doctorSection.insertBefore(messageDiv, doctorSection.firstChild);
      
      // Auto-remove after 5 seconds
      setTimeout(() => {
        if (messageDiv.parentNode) {
          messageDiv.remove();
        }
      }, 5000);
    } else {
      // Fallback: show alert if we can't find the section
      console.warn('Doctor section not found, showing alert');
      alert(message);
    }
  }

  // Show toast notification
  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;
    
    const icon = type === 'success' ? 'check-circle' : 
                 type === 'error' ? 'exclamation-triangle' :
                 type === 'warning' ? 'exclamation-triangle' : 'info-circle';
    
    toast.innerHTML = `
      <i class="fa fa-${icon}"></i>
      ${message}
    `;
    
    document.body.appendChild(toast);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 3000);
  }

  // Get current PDF settings (public method for other modules)
  async getCurrentPdfSettings() {
    return await this.loadPdfSettings();
  }

  // Helper function to format PubMed date to dd/mm/yyyy
  formatPubDate(pubdate) {
    if (!pubdate) return 'Unknown date';
    
    try {
      // PubMed dates can come in various formats: "2024/01/15", "2024 Jan 15", "2024", etc.
      let date;
      
      if (pubdate.includes('/')) {
        // Handle "YYYY/MM/DD" format
        const parts = pubdate.split('/');
        if (parts.length >= 3) {
          date = new Date(parts[0], parts[1] - 1, parts[2]);
        } else if (parts.length === 2) {
          date = new Date(parts[0], parts[1] - 1, 1);
        } else {
          date = new Date(parts[0], 0, 1);
        }
      } else if (pubdate.includes(' ')) {
        // Handle "YYYY Mon DD" format
        date = new Date(pubdate);
      } else {
        // Handle just year "YYYY"
        date = new Date(pubdate, 0, 1);
      }
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return pubdate; // Return original if parsing fails
      }
      
      // Format as dd/mm/yyyy
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      
      return `${day}/${month}/${year}`;
    } catch (error) {
      console.error('Error formatting date:', pubdate, error);
      return pubdate; // Return original if any error occurs
    }
  }

  setupEventListeners() {
    console.log('Setting up enhanced event listeners');
    
    // Enhanced click handling with immediate response and debouncing
    document.addEventListener('click', (e) => {
      console.log('Click detected on:', e.target);
      console.log('Target dataset:', e.target.dataset);
      console.log('Target type:', e.target.type);
      console.log('Target classes:', e.target.className);
      
      // Skip handling if this is a tab-related click (let TabManager handle it) - CHECK THIS FIRST!
      if (e.target.closest('.tab-close') || e.target.closest('.tab')) {
        console.log('� Allowing tab-related click to pass through to TabManager');
        return;
      }
      
      // Skip handling if this is inside data management module - let module handle its own events
      if (e.target.closest('.data-management-module')) {
        console.log('� Allowing data management module click to pass through');
        return;
      }
      
      // Skip handling if this is a form submission button WITHOUT data attributes - let forms handle submit naturally
      if (e.target.type === 'submit' && !e.target.dataset.action && !e.target.dataset.module) {
        console.log('� Skipping form submission element without data attributes');
        return;
      }
      
      // Find the closest element with data attributes
      const target = e.target.closest('[data-action], [data-module]');
      
      // Immediate visual feedback for better UX
      if (target) {
        target.style.transform = 'scale(0.98)';
        target.style.transition = 'transform 0.1s ease';
        setTimeout(() => {
          target.style.transform = '';
          target.style.transition = '';  // Clean up transition as well
        }, 150);
      }
      
      const action = e.target.dataset.action || target?.dataset.action;
      const module = e.target.dataset.module || target?.dataset.module;
      
      if (action) {
        console.log('Action found:', action);
        e.preventDefault();
        e.stopPropagation();
        
        // Debounce rapid clicks but execute immediately on first click
        this.debounce(() => this.handleAction(action, e.target), 300, `action-${action}`);
      }
      
      if (module) {
        console.log('Module found:', module);
        e.preventDefault();
        e.stopPropagation();
        
        // Debounce rapid clicks but execute immediately on first click
        this.debounce(() => this.switchModule(module), 200, `module-${module}`);
      }
    });

    // Enhanced specific event listeners
    this.setupSpecificEventListeners();
  }

  setupSpecificEventListeners() {
    // Search functionality
    const searchBtn = document.getElementById('search-btn');
    if (searchBtn) {
      searchBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.debounce(() => this.showSearchDialog(), 200, 'search');
      });
    }

    // Template selection functionality
    document.addEventListener('click', (e) => {
      console.log('🎯 Document click detected, target:', e.target);
      const templateCard = e.target.closest('.template-card');
      console.log('🎯 Template card found:', templateCard);
      if (templateCard) {
        e.preventDefault();
        e.stopPropagation();
        
        const templateId = templateCard.dataset.template;
        console.log('🎯 Template selected:', templateId);
        
        // Add visual feedback
        templateCard.style.transform = 'scale(0.95)';
        setTimeout(() => {
          templateCard.style.transform = '';
        }, 150);
        
        this.debounce(() => this.handleTemplateSelection(templateId), 300, `template-${templateId}`);
      }
    });

    // Settings functionality
    // Settings button is now handled by the general document click handler
    // since it has data-module="settings" attribute
  }

  setupHamburgerMenu() {
    const hamburger = document.getElementById('hamburger');
    const menu = document.getElementById('hamburger-menu');

    if (hamburger && menu) {
      hamburger.addEventListener('click', (e) => {
        e.stopPropagation();
        menu.classList.toggle('open');
      });

      // Close menu when clicking outside
      document.addEventListener('click', (e) => {
        if (!menu.contains(e.target) && !hamburger.contains(e.target)) {
          menu.classList.remove('open');
        }
      });
    }
  }

  setupTabNavigation() {
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('tab-btn')) {
        e.preventDefault();
        const tabName = e.target.dataset.tab;
        this.switchTab(tabName, e.target.closest('.data-management-content'));
      }
    });
  }

  setupModuleNavigation() {
    const moduleNav = document.getElementById('module-nav');
    if (moduleNav) {
      moduleNav.addEventListener('click', (e) => {
        e.preventDefault();
        const moduleLink = e.target.closest('.item');
        if (moduleLink) {
          const module = moduleLink.dataset.module;
          if (module) {
            this.switchModule(module);
          }
        }
      });
    }
  }

  setupTabNavigation() {
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('tab-btn')) {
        e.preventDefault();
        const tabName = e.target.dataset.tab;
        this.switchTab(tabName, e.target.closest('.data-management-content'));
      }
    });
  }

  switchTab(tabName, container) {
    if (!container) return;
    
    // Update tab buttons
    container.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    container.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Update tab content
    container.querySelectorAll('.tab-pane').forEach(pane => {
      pane.classList.remove('active');
    });
    container.querySelector(`#${tabName}-tab`).classList.add('active');
  }

  updateBreadcrumb(module) {
    const currentModuleName = document.getElementById('current-module-name');
    if (!currentModuleName) return;
    
    // Module name mapping using i18n keys (same as navigation)
    const moduleI18nKeys = {
      'dashboard': 'navigation.dashboard',
      'pedigree-editor': 'navigation.pedigreeEditor',
      'family-center': 'navigation.familyCenter',
      'genetic-analysis': 'navigation.geneticAnalysis',
      'risk-assessment': 'navigation.riskAssessment',
      'research': 'navigation.research',
      'reports': 'navigation.reports',
      'doctor-interface': 'navigation.doctorInterface',
      'data-management': 'navigation.dataManagement',
      'settings': 'settings.title'
    };
    
    const i18nKey = moduleI18nKeys[module];
    const displayName = i18nKey ? i18n.t(i18nKey) : module;
    currentModuleName.textContent = displayName;
    
    console.log(`📍 Updated breadcrumb to: ${displayName} (i18n: ${i18nKey})`);
  }

  switchModule(module) {
    console.log(`🔄 Switching to module: ${module} (current: ${this.currentModule})`);
    
    if (this.currentModule === module) {
      console.log(`Already on module ${module}, skipping switch`);
      return;
    }

    // Update breadcrumb in header
    this.updateBreadcrumb(module);

    // Persist Family Center tabs BEFORE switching away from it
    if (this.currentModule === 'family-center' && this.familyCenterTabManager) {
      console.log('💾 Persisting Family Center tabs before switching modules...');
      console.log(`💾 Using TabManager instance: ${this.familyCenterTabManager.instanceId}`);
      console.log(`💾 TabManager has ${this.familyCenterTabManager.tabs.size} tabs`);
      this.familyCenterTabManager.persist();
    }

    // Update navigation
    document.querySelectorAll('.sidebar .item').forEach(item => {
      item.classList.remove('active');
    });
    const moduleButton = document.querySelector(`[data-module="${module}"]`);
    if (moduleButton) {
      moduleButton.classList.add('active');
    } else {
      console.warn(`Module button not found for: ${module}`);
    }

    // Update content using templates
    const mainContent = document.getElementById('main-content');
    console.log(`📋 Loading template for module: ${module}`);
    
    // Clear any existing module-specific attributes
    mainContent.removeAttribute('data-module');
    
    switch (module) {
      case 'dashboard':
        if (window.ModuleTemplates) {
          console.log('Loading dashboard template...');
          mainContent.innerHTML = window.ModuleTemplates.getDashboardTemplate();
        } else {
          console.error('ModuleTemplates not available for dashboard');
        }
        break;
      case 'pedigree-editor':
        if (window.ModuleTemplates) {
          mainContent.innerHTML = window.ModuleTemplates.getPedigreeEditorTemplate();
        }
        break;
      case 'family-center':
        if (window.ModuleTemplates) {
          mainContent.innerHTML = window.ModuleTemplates.getFamilyCenterTemplate();
          mainContent.setAttribute('data-module', 'family-center');
        } else {
          console.error('ModuleTemplates not available for family center');
          mainContent.innerHTML = '<div class="error">Family Center template not available</div>';
        }
        break;
      case 'genetic-analysis':
        if (window.ModuleTemplates) {
          mainContent.innerHTML = window.ModuleTemplates.getGeneticAnalysisTemplate();
        }
        break;
      case 'risk-assessment':
        if (window.ModuleTemplates) {
          mainContent.innerHTML = window.ModuleTemplates.getRiskAssessmentTemplate();
        }
        break;
      case 'reports':
        if (window.ModuleTemplates) {
          // Initialize the reports module first
          console.log('📄 Checking for ReportModule...', typeof window.ReportModule, window.ReportModule);
          if (window.ReportModule) {
            console.log('✅ ReportModule found, creating instance...');
            const reportModule = new window.ReportModule(this);
            // Use the module's own content instead of the template
            mainContent.innerHTML = reportModule.getContent();
            // Initialize after content is loaded
            setTimeout(() => {
              reportModule.initialize();
              // Store reference for later use
              this.reportModule = reportModule;
            }, 50);
          } else {
            // Fallback to template if module not available
            console.warn('ReportModule not loaded, using template fallback');
            mainContent.innerHTML = window.ModuleTemplates.getReportsTemplate();
          }
        }
        break;
      case 'doctor-interface':
        if (window.ModuleTemplates) {
          // Initialize the doctor module first
          console.log('👨‍⚕️ Checking for DoctorModule...', typeof window.DoctorModule, window.DoctorModule);
          if (window.DoctorModule) {
            console.log('✅ DoctorModule found, creating instance...');
            const doctorModule = new window.DoctorModule(this);
            // Use the module's own content instead of the template
            mainContent.innerHTML = doctorModule.getContent();
            // Initialize after content is loaded
            setTimeout(() => {
              doctorModule.initialize();
              // Store reference for later use
              this.doctorModule = doctorModule;
            }, 50);
          } else {
            // Fallback to template if module not available
            console.warn('DoctorModule not loaded, using template fallback');
            mainContent.innerHTML = window.ModuleTemplates.getDoctorInterfaceTemplate();
            // Legacy setup for iframe-based interface
            this.setupDoctorInterface();
          }
        } else {
          console.error('ModuleTemplates not available for doctor interface');
        }
        break;
      case 'data-management':
        if (window.ModuleTemplates) {
          // Initialize the data management module first
          if (window.DataManagementModule) {
            const dataManagementModule = new window.DataManagementModule(this);
            // Use the module's own content instead of the template
            mainContent.innerHTML = dataManagementModule.getContent();
            // Initialize after content is loaded
            setTimeout(() => {
              dataManagementModule.init();
              // Store reference for later use
              this.dataManagementModule = dataManagementModule;
            }, 50);
          } else {
            // Fallback to template if module not available
            mainContent.innerHTML = window.ModuleTemplates.getDataManagementTemplate();
            console.warn('DataManagementModule not loaded, using template fallback');
          }
        }
        break;
      case 'settings':
        if (window.ModuleTemplates) {
          console.log('Loading settings template...');
          mainContent.innerHTML = window.ModuleTemplates.getSettingsTemplate();
          // Setup language selector after template loads
          this.setupLanguageSelector();
          // Setup PDF settings after template loads
          this.setupPdfSettings();
          // Setup doctor information after template loads
          this.setupDoctorInfo();
        } else {
          console.error('ModuleTemplates not available for settings');
        }
        break;
    }

    // Update right panel (now disabled but kept for compatibility)
    this.updateRightPanel(module);

    this.currentModule = module;
    console.log(`Module switched to: ${module}`);
    
    // Load module-specific data
    console.log(`📋 Loading data for module: ${module}`);
    this.loadModuleData(module);
  }

  updateRightPanel(module) {
    // Right panel has been removed from the layout - this method is now disabled
    console.log(`Note: Right panel removed from layout, no panel update needed for module: ${module}`);
    return;
  }

// Replace the createDashboardPanel method around line 1147
createDashboardPanel() {
  // Update panel title and add refresh button to header
  const panelTitle = document.getElementById('panel-title');
  const panelSubtitle = document.getElementById('panel-subtitle');
  const panelHeader = document.querySelector('.panel-header');
  
  if (panelTitle) panelTitle.textContent = 'Papers';
  if (panelSubtitle) panelSubtitle.textContent = 'Recent Genetics Research';
  
  // Add refresh button to panel header
  if (panelHeader) {
    // Remove existing refresh button if any
    const existingRefreshBtn = panelHeader.querySelector('#refresh-papers-header');
    if (existingRefreshBtn) existingRefreshBtn.remove();
    
    // Create new refresh button
    const refreshBtn = document.createElement('button');
    refreshBtn.id = 'refresh-papers-header';
    refreshBtn.className = 'panel-refresh-btn';
    refreshBtn.title = 'Refresh articles from PubMed';
    refreshBtn.innerHTML = '<span class="refresh-icon">⟳</span>';
    refreshBtn.addEventListener('click', () => this.refreshPapers());
    
    panelHeader.appendChild(refreshBtn);
  }
  
  const panelContent = document.getElementById('panel-content');
  panelContent.innerHTML = `
    <div id="recent-papers" class="recent-papers-full">
      <div class="loading">${this.t('research.loading', 'Loading articles...')}</div>
    </div>
  `;
  
  // Load recent papers
  this.loadRecentPapers();
}
  createPedigreeEditorPanel() {
    const panelContent = document.getElementById('panel-content');
    panelContent.innerHTML = `
      <div class="panel-actions active">
        <div class="action-section">
          <h4>${this.i18n.t('pedigree.quickActions')}</h4>
          <button class="action-btn" data-action="launch-editor">
            <i class="fas fa-plus"></i>
            <span>${this.i18n.t('pedigree.newPedigree')}</span>
          </button>
          <button class="action-btn" data-action="refresh-pedigrees">
            <i class="fas fa-refresh"></i>
            <span>${this.i18n.t('buttons.refresh')}</span>
          </button>
        </div>
        
        <div class="action-section">
          <h4>${this.i18n.t('pedigree.filters')}</h4>
          <button class="action-btn filter-btn" data-filter="all">
            <span>${this.i18n.t('pedigree.showAll')}</span>
          </button>
          <button class="action-btn filter-btn" data-filter="recent">
            <span>${this.i18n.t('pedigree.showRecent')}</span>
          </button>
        </div>
      </div>
    `;
    
    // Initialize pedigree management
    this.initializePedigreeManagement();
  }

  createFamilyCenterPanel() {
    const panelContent = document.getElementById('panel-content');
    panelContent.innerHTML = `
      <div class="panel-actions active">

      </div>
    `;
    
    // Load families from database
    this.loadFamilyList();
  }

  /**
   * Load the list of families for the right panel
   */
  async loadFamilyList() {
    const container = document.getElementById('family-list-container');
    if (!container) return;

    try {
      if (window.electronAPI && window.electronAPI.familyCenter && window.electronAPI.familyCenter.getAllFamilies) {
        const families = await window.electronAPI.familyCenter.getAllFamilies();
        
        if (families && families.length > 0) {
          container.innerHTML = families.map(family => `
            <div class="family-item" data-family-id="${family.id}" onclick="window.pedigreeApp.loadFamilyData(${family.id})">
              <div class="family-name">${family.name || 'Unnamed Family'}</div>
              <div class="family-info">
                <span class="member-count">${family.member_count || 0} members</span>
                <span class="created-date">${family.created_at ? new Date(family.created_at).toLocaleDateString() : ''}</span>
              </div>
            </div>
          `).join('');
        } else {
          container.innerHTML = `
            <div class="empty-state">
              <p>No families found</p>
              <button class="btn btn-small" onclick="document.getElementById('fc-create-family').click()">Create First Family</button>
            </div>
          `;
        }
      } else {
        container.innerHTML = '<div class="error">Database not available</div>';
      }
    } catch (error) {
      console.error('Error loading family list:', error);
      container.innerHTML = '<div class="error">Error loading families</div>';
    }
  }

  /**
   * Load family data in the main content area
   */
  async loadFamilyData(familyId) {
    const mainContent = document.getElementById('fc-main-content');
    if (!mainContent) return;

    try {
      mainContent.innerHTML = '<div class="loading">Loading family data...</div>';
      
      if (window.electronAPI && window.electronAPI.familyCenter && window.electronAPI.familyCenter.getFamily) {
        // Get family basic data
        const familyData = await window.electronAPI.familyCenter.getFamily(familyId);
        // Get family members
        const members = await window.electronAPI.familyCenter.getFamilyMembers(familyId);
        
        if (familyData) {
          // Use the two-column layout method
          this.displayFamilyDetails(familyData, members);
        } else {
          mainContent.innerHTML = '<div class="error">Family not found</div>';
        }
      } else {
        mainContent.innerHTML = '<div class="error">Database not available</div>';
      }
    } catch (error) {
      console.error('Error loading family data:', error);
      mainContent.innerHTML = '<div class="error">Error loading family data</div>';
    }
  }

  /**
   * Edit family data
   */
  editFamily(familyId) {
    console.log('Edit family:', familyId);
    // TODO: Implement family editing functionality
    alert('Family editing functionality coming soon!');
  }

  /**
   * Generate pedigree from family data
   */
  generatePedigree(familyId) {
    console.log('Generate pedigree for family:', familyId);
    // TODO: Implement pedigree generation from family data
    alert('Pedigree generation functionality coming soon!');
  }

  /**
   * Export family data
   */
  exportFamily(familyId) {
    console.log('Export family:', familyId);
    // TODO: Implement family export functionality
    alert('Family export functionality coming soon!');
  }

  /**
   * Initialize pedigree management functionality
   */
  initializePedigreeManagement() {
    // Set up search functionality
    const searchInput = document.getElementById('pedigree-search');
    if (searchInput) {
      let searchTimeout;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          this.filterPedigrees(e.target.value);
        }, 300);
      });
    }

    // Set up filter buttons
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        // Remove active class from all filter buttons
        filterButtons.forEach(btn => btn.classList.remove('active'));
        // Add active class to clicked button
        e.target.classList.add('active');
        
        const filter = e.target.dataset.filter;
        this.applyPedigreeFilter(filter);
      });
    });

    // Load pedigrees
    this.loadPedigreeList();
  }

  /**
   * Load the list of all pedigrees
   */
  async loadPedigreeList() {
    const tableBody = document.getElementById('pedigree-table-body');
    const pedigreeTable = document.getElementById('pedigree-table');
    const loadingElement = document.getElementById('pedigree-loading');
    const emptyElement = document.getElementById('pedigree-empty');
    const countElement = document.getElementById('pedigree-count');

    if (!tableBody) return;

    // Show loading state
    this.showPedigreeLoadingState(true);

    try {
      if (window.electronAPI && window.electronAPI.listPedigrees) {
        const result = await window.electronAPI.listPedigrees();
        const pedigrees = result.success ? result.pedigrees : [];

        // Store for filtering
        this.allPedigrees = pedigrees || [];
        this.filteredPedigrees = [...this.allPedigrees];

        this.renderPedigreeTable(this.filteredPedigrees);
        this.updatePedigreeCount(this.filteredPedigrees.length);
        
      } else {
        throw new Error('Database not available');
      }
    } catch (error) {
      console.error('Error loading pedigrees:', error);
      tableBody.innerHTML = `
        <tr>
          <td colspan="4" class="error-cell">
            <i class="fas fa-exclamation-triangle"></i>
            ${this.i18n.t('errors.errorLoadingPedigree')}
          </td>
        </tr>
      `;
      pedigreeTable.style.display = 'table';
    }

    this.showPedigreeLoadingState(false);
  }

  /**
   * Render the pedigree table with the given pedigrees
   */
  renderPedigreeTable(pedigrees) {
    const tableBody = document.getElementById('pedigree-table-body');
    const pedigreeTable = document.getElementById('pedigree-table');
    const emptyElement = document.getElementById('pedigree-empty');

    if (!pedigrees || pedigrees.length === 0) {
      pedigreeTable.style.display = 'none';
      emptyElement.style.display = 'block';
      return;
    }

    emptyElement.style.display = 'none';
    pedigreeTable.style.display = 'table';

    tableBody.innerHTML = pedigrees.map(pedigree => {
      const createdDate = pedigree.created_at ? 
        new Date(pedigree.created_at).toLocaleDateString() : 
        this.i18n.t('labels.unknown');
      
      const modifiedDate = pedigree.updated_at ? 
        new Date(pedigree.updated_at).toLocaleDateString() : 
        createdDate;

      return `
        <tr class="pedigree-row" data-name="${pedigree.name}">
          <td class="name-cell">
            <strong>${pedigree.name}</strong>
          </td>
          <td class="date-cell">${createdDate}</td>
          <td class="date-cell">${modifiedDate}</td>
          <td class="actions-cell">
            <button class="pedigree-action-btn open-btn" 
                    onclick="window.pedigreeApp.openPedigreeInEditor('${pedigree.name}')"
                    title="${this.i18n.t('labels.openEditor')}"
                    aria-label="${this.i18n.t('labels.openEditor')}">
              <i class="fas fa-edit"></i>
            </button>
            <button class="pedigree-action-btn view-btn" 
                    onclick="window.pedigreeApp.viewPedigreeFamily('${pedigree.name}')"
                    title="${this.i18n.t('labels.viewFamily')}"
                    aria-label="${this.i18n.t('labels.viewFamily')}">
              <i class="fas fa-users"></i>
            </button>
            <button class="pedigree-action-btn delete-btn" 
                    onclick="window.pedigreeApp.deletePedigree('${pedigree.name}')"
                    title="${this.i18n.t('buttons.delete')}"
                    aria-label="${this.i18n.t('buttons.delete')}">
              <i class="fas fa-trash"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  /**
   * Filter pedigrees based on search term
   */
  filterPedigrees(searchTerm) {
    if (!this.allPedigrees) return;

    const term = searchTerm.toLowerCase().trim();
    this.filteredPedigrees = this.allPedigrees.filter(pedigree => 
      pedigree.name.toLowerCase().includes(term)
    );

    this.renderPedigreeTable(this.filteredPedigrees);
    this.updatePedigreeCount(this.filteredPedigrees.length);
  }

  /**
   * Apply filter to pedigrees
   */
  applyPedigreeFilter(filter) {
    if (!this.allPedigrees) return;

    switch (filter) {
      case 'recent':
        // Show pedigrees modified in the last 30 days
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        this.filteredPedigrees = this.allPedigrees.filter(pedigree => {
          const modifiedDate = new Date(pedigree.updated_at || pedigree.created_at);
          return modifiedDate >= thirtyDaysAgo;
        });
        break;
      case 'all':
      default:
        this.filteredPedigrees = [...this.allPedigrees];
        break;
    }

    // Apply current search term if any
    const searchInput = document.getElementById('pedigree-search');
    if (searchInput && searchInput.value.trim()) {
      this.filterPedigrees(searchInput.value);
    } else {
      this.renderPedigreeTable(this.filteredPedigrees);
      this.updatePedigreeCount(this.filteredPedigrees.length);
    }
  }

  /**
   * Update pedigree count display
   */
  updatePedigreeCount(count) {
    const countElement = document.getElementById('pedigree-count');
    if (countElement) {
      countElement.textContent = `${count} ${this.i18n.t('labels.pedigreeCount')}`;
    }
  }

  /**
   * Show/hide loading state
   */
  showPedigreeLoadingState(show) {
    const loadingElement = document.getElementById('pedigree-loading');
    const pedigreeTable = document.getElementById('pedigree-table');
    const emptyElement = document.getElementById('pedigree-empty');

    if (show) {
      if (loadingElement) loadingElement.style.display = 'block';
      if (pedigreeTable) pedigreeTable.style.display = 'none';
      if (emptyElement) emptyElement.style.display = 'none';
    } else {
      if (loadingElement) loadingElement.style.display = 'none';
    }
  }

  /**
   * Open pedigree in the editor
   */
  async openPedigreeInEditor(pedigreeName) {
    try {
      if (window.electronAPI && window.electronAPI.launchPedigreeEditor) {
        console.log('Opening pedigree in editor:', pedigreeName);
        const result = await window.electronAPI.launchPedigreeEditor(pedigreeName);
        
        if (result && result.success) {
          console.log('Pedigree editor launched successfully');
        } else {
          console.error('Failed to launch pedigree editor:', result?.error);
          alert(this.i18n.t('errors.errorLoadingPedigree') + ': ' + (result?.error || 'Unknown error'));
        }
      } else {
        alert('Editor not available');
      }
    } catch (error) {
      console.error('Error opening pedigree in editor:', error);
      alert(this.i18n.t('errors.errorLoadingPedigree') + ': ' + error.message);
    }
  }

  /**
   * View pedigree family (placeholder for future implementation)
   */
  viewPedigreeFamily(pedigreeName) {
    console.log('View family for pedigree:', pedigreeName);
    // TODO: Implement family view functionality
    // For now, switch to family center module
    this.switchModule('family-center');
  }

  /**
   * Delete a pedigree
   */
  async deletePedigree(pedigreeName) {
    if (!confirm(this.i18n.t('dialog.confirmDeletePedigree'))) {
      return;
    }

    try {
      if (window.electronAPI && window.electronAPI.deletePedigree) {
        const result = await window.electronAPI.deletePedigree(pedigreeName);
        
        if (result && result.success) {
          console.log('Pedigree deleted successfully:', pedigreeName);
          // Refresh the pedigree list
          this.loadPedigreeList();
          // Show success message (you could implement a toast notification)
          alert(this.i18n.t('dialog.pedigreeDeleted'));
        } else {
          throw new Error(result?.error || 'Unknown error');
        }
      } else {
        throw new Error('Database not available');
      }
    } catch (error) {
      console.error('Error deleting pedigree:', error);
      alert(this.i18n.t('dialog.errorDeletingPedigree') + ': ' + error.message);
    }
  }

  /**
   * Refresh pedigree list
   */
  refreshPedigrees() {
    this.loadPedigreeList();
  }

  loadDashboardStats() {
    // Load pedigree count
    if (window.electronAPI && window.electronAPI.listPedigrees) {
      window.electronAPI.listPedigrees().then(pedigrees => {
        const totalPedigreesEl = document.getElementById('total-pedigrees');
        if (totalPedigreesEl) {
          totalPedigreesEl.textContent = pedigrees.length;
        }
      }).catch(error => {
        console.error('Failed to load pedigree count:', error);
      });
    }
    
    // Load family count
    if (window.electronAPI && window.electronAPI.familyCenter && window.electronAPI.familyCenter.getAllFamilies) {
      window.electronAPI.familyCenter.getAllFamilies().then(families => {
        const totalFamiliesEl = document.getElementById('total-families');
        if (totalFamiliesEl) {
          totalFamiliesEl.textContent = families.length;
        }
      }).catch(error => {
        console.error('Failed to load family count:', error);
      });
    }
  }

  // Load recent genetics papers for dashboard
  async loadRecentPapers() {
    const recentPapersEl = document.getElementById('recent-papers');
    if (!recentPapersEl) return;
    
    try {
      if (window.electronAPI && window.electronAPI.pubmed) {
        const papers = await window.electronAPI.pubmed.getRecentGeneticsPapers();
        
        if (papers.length === 0) {
          recentPapersEl.innerHTML = `<p class="no-results">${this.t('research.noResults', 'No recent papers found')}</p>`;
          return;
        }
        
        recentPapersEl.innerHTML = papers.map(paper => `
          <div class="paper-item">
            <h5><a href="#" onclick="window.electronAPI.openExternal('${paper.url}')">${paper.title.length > 80 ? paper.title.substring(0, 80) + '...' : paper.title}</a></h5>
            <p class="paper-meta">
              <span class="journal">${paper.journal.length > 40 ? paper.journal.substring(0, 40) + '...' : paper.journal}</span> | 
              <span class="date">${this.formatPubDate(paper.pubdate)}</span>
            </p>
            <p class="authors">${paper.authors ? paper.authors.slice(0, 3).join(', ') + (paper.authors.length > 3 ? ' et al.' : '') : 'No authors listed'}</p>
          </div>
        `).join('');
      } else {
        recentPapersEl.innerHTML = `<p class="error">PubMed integration not available</p>`;
      }
    } catch (error) {
      console.error('Failed to load recent papers:', error);
      recentPapersEl.innerHTML = `<p class="error">Failed to load recent papers</p>`;
    }
  }

  // Refresh papers cache
  async refreshPapers() {
    const refreshBtn = document.getElementById('refresh-papers-header');
    const recentPapersEl = document.getElementById('recent-papers');
    
    if (refreshBtn) {
      refreshBtn.disabled = true;
      refreshBtn.innerHTML = '<span class="refresh-icon spinning">⟳</span>';
    }
    
    if (recentPapersEl) {
      recentPapersEl.innerHTML = `<div class="loading">Fetching fresh articles from PubMed...</div>`;
    }
    
    try {
      if (window.electronAPI && window.electronAPI.pubmed) {
        const papers = await window.electronAPI.pubmed.getRecentGeneticsPapers({ forceRefresh: true });
        
        if (papers.length === 0) {
          recentPapersEl.innerHTML = `<p class="no-results">${this.t('research.noResults', 'No recent papers found')}</p>`;
        } else {
          recentPapersEl.innerHTML = papers.map(paper => `
            <div class="paper-item">
              <h5><a href="#" onclick="window.electronAPI.openExternal('${paper.url}')">${paper.title.length > 80 ? paper.title.substring(0, 80) + '...' : paper.title}</a></h5>
              <p class="paper-meta">
                <span class="journal">${paper.journal.length > 40 ? paper.journal.substring(0, 40) + '...' : paper.journal}</span> | 
                <span class="date">${this.formatPubDate(paper.pubdate)}</span>
                ${paper.doiUrl ? ` | <a href="#" onclick="window.electronAPI.openExternal('${paper.doiUrl}')" class="doi-link">DOI</a>` : ''}
              </p>
              <p class="authors">${paper.authors ? paper.authors.slice(0, 3).join(', ') + (paper.authors.length > 3 ? ' et al.' : '') : 'No authors listed'}</p>
            </div>
          `).join('');
        }
      }
    } catch (error) {
      console.error('Failed to refresh papers:', error);
      if (recentPapersEl) {
        recentPapersEl.innerHTML = `<p class="error">Failed to refresh papers</p>`;
      }
    } finally {
      if (refreshBtn) {
        refreshBtn.disabled = false;
        refreshBtn.innerHTML = '<span class="refresh-icon">⟳</span>';
      }
    }
  }

  // Load recent genetics papers for research module
  async loadResearchPapers() {
    const recentPapersEl = document.getElementById('research-recent-papers');
    if (!recentPapersEl) return;
    
    try {
      if (window.electronAPI && window.electronAPI.pubmed) {
        const papers = await window.electronAPI.pubmed.getRecentGeneticsPapers({ max: 10 });
        this.displayPapers(papers, recentPapersEl);
      } else {
        recentPapersEl.innerHTML = `<p class="error">PubMed integration not available</p>`;
      }
    } catch (error) {
      console.error('Failed to load research papers:', error);
      recentPapersEl.innerHTML = `<p class="error">Failed to load recent papers</p>`;
    }
  }

  // Set up event listeners for research panel
  setupResearchEventListeners() {
    const searchBtn = document.getElementById('research-search-btn');
    const searchInput = document.getElementById('research-search');
    
    if (searchBtn) {
      searchBtn.addEventListener('click', () => this.performResearchSearch());
    }
    
    if (searchInput) {
      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.performResearchSearch();
        }
      });
    }
  }

  // Perform research search
  async performResearchSearch() {
    const searchInput = document.getElementById('research-search');
    const resultsContainer = document.getElementById('research-search-results');
    const resultsTitle = document.getElementById('search-results-title');
    const maxResults = document.getElementById('max-results');
    const sortBy = document.getElementById('sort-by');
    
    if (!searchInput || !resultsContainer) return;
    
    const query = searchInput.value.trim();
    if (!query) return;
    
    resultsContainer.innerHTML = `<div class="loading">${this.t('research.loading', 'Loading articles...')}</div>`;
    resultsTitle.style.display = 'block';
    
    try {
      if (window.electronAPI && window.electronAPI.pubmed) {
        const papers = await window.electronAPI.pubmed.searchPapers(query, {
          max: parseInt(maxResults.value) || 50,
          sort: sortBy.value || 'most+recent'
        });
        
        this.displayPapers(papers, resultsContainer);
      } else {
        resultsContainer.innerHTML = `<p class="error">PubMed integration not available</p>`;
      }
    } catch (error) {
      console.error('Failed to search papers:', error);
      resultsContainer.innerHTML = `<p class="error">Failed to search papers</p>`;
    }
  }

  // Display papers in a container
  displayPapers(papers, container) {
    if (papers.length === 0) {
      container.innerHTML = `<p class="no-results">${this.t('research.noResults', 'No papers found')}</p>`;
      return;
    }
    
    container.innerHTML = papers.map(paper => `
      <div class="paper-item">
        <h5 class="paper-title">
          <a href="#" onclick="window.electronAPI.openExternal('${paper.url}')" class="paper-link">
            ${paper.title.length > 80 ? paper.title.substring(0, 80) + '...' : paper.title}
          </a>
        </h5>
        <p class="paper-meta">
          <span class="journal">${paper.journal.length > 40 ? paper.journal.substring(0, 40) + '...' : paper.journal}</span> | 
          <span class="date">${this.formatPubDate(paper.pubdate)}</span> |
          <span class="pmid">PMID: ${paper.pmid}</span>
        </p>
        ${paper.authors ? `<p class="authors">${paper.authors.slice(0, 3).join(', ')}${paper.authors.length > 3 ? ' et al.' : ''}</p>` : ''}
      </div>
    `).join('');
  }

  createGeneticAnalysisPanel() {
    const panelContent = document.getElementById('panel-content');
    panelContent.innerHTML = `
      <div class="panel-actions active">
        <div class="action-section">
          <h4>Analysis Tools</h4>
          <button class="action-btn" data-action="inheritance-analysis">
            <span class="icon">🧬</span>
            <span>Inheritance Analysis</span>
          </button>
          <button class="action-btn" data-action="carrier-analysis">
            <span class="icon">🔬</span>
            <span>Carrier Analysis</span>
          </button>
        </div>
        
        <div class="action-section">
          <h4>Risk Calculation</h4>
          <button class="action-btn" data-action="calculate-risk">
            <span class="icon">📊</span>
            <span>Calculate Risk</span>
          </button>
          <button class="action-btn" data-action="bayesian-analysis">
            <span class="icon">📈</span>
            <span>Bayesian Analysis</span>
          </button>
        </div>
      </div>
    `;
  }

  createRiskAssessmentPanel() {
    const panelContent = document.getElementById('panel-content');
    panelContent.innerHTML = `
      <div class="panel-actions active">
        <div class="action-section">
          <h4>Assessment Types</h4>
          <button class="action-btn" data-action="cancer-risk">
            <span class="icon">🎗️</span>
            <span>Cancer Risk</span>
          </button>
          <button class="action-btn" data-action="cardiac-risk">
            <span class="icon">❤️</span>
            <span>Cardiac Risk</span>
          </button>
          <button class="action-btn" data-action="genetic-risk">
            <span class="icon">🧬</span>
            <span>Genetic Risk</span>
          </button>
        </div>
        
        <div class="action-section">
          <h4>Tools</h4>
          <button class="action-btn" data-action="risk-calculator">
            <span class="icon">🧮</span>
            <span>Risk Calculator</span>
          </button>
          <button class="action-btn" data-action="guidelines">
            <span class="icon">📋</span>
            <span>Guidelines</span>
          </button>
        </div>
      </div>
    `;
  }

  createResearchPanel() {
    const panelContent = document.getElementById('panel-content');
    panelContent.innerHTML = `
      <div class="panel-actions active">
        <div class="action-section">
          <h4>${this.t('research.searchPapers', 'Search Research Papers')}</h4>
          <div class="search-container">
            <input type="text" id="research-search" placeholder="${this.t('research.searchPlaceholder', 'Enter search terms (e.g. genetic diabetes)')}" class="search-input">
            <button id="research-search-btn" class="btn btn-primary">${this.t('research.searchButton', 'Search')}</button>
          </div>
          
          <div class="search-filters">
            <label for="max-results">${this.t('research.maxResults', 'Max Results')}:</label>
            <select id="max-results">
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
            
            <label for="sort-by">${this.t('research.sortBy', 'Sort By')}:</label>
            <select id="sort-by">
              <option value="most+recent">${this.t('research.date', 'Date')}</option>
              <option value="relevance">${this.t('research.relevance', 'Relevance')}</option>
            </select>
          </div>
        </div>

        <div class="action-section">
          <h4>${this.t('research.recentPapers', 'Recent Genetics Papers')}</h4>
          <div id="research-recent-papers" class="papers-list">
            <div class="loading">${this.t('research.loading', 'Loading articles...')}</div>
          </div>
        </div>

        <div class="action-section">
          <h4 id="search-results-title" style="display: none;">${this.t('research.searchResults', 'Search Results')}</h4>
          <div id="research-search-results" class="papers-list"></div>
        </div>
      </div>
    `;
    
    // Load recent papers
    this.loadResearchPapers();
    
    // Set up event listeners
    this.setupResearchEventListeners();
  }

  createReportsPanel() {
    const panelContent = document.getElementById('panel-content');
    panelContent.innerHTML = `
      <div class="panel-actions active">
        <div class="action-section">
          <h4>Generate Reports</h4>
          <button class="action-btn" data-action="pedigree-report">
            <span class="icon">📊</span>
            <span>Pedigree Report</span>
          </button>
          <button class="action-btn" data-action="genetic-report">
            <span class="icon">🧬</span>
            <span>Genetic Report</span>
          </button>
          <button class="action-btn" data-action="risk-report">
            <span class="icon">⚠️</span>
            <span>Risk Report</span>
          </button>
        </div>
        
        <div class="action-section">
          <h4>Export Options</h4>
          <button class="action-btn" data-action="export-pdf">
            <span class="icon">📄</span>
            <span>Export as PDF</span>
          </button>
          <button class="action-btn" data-action="export-word">
            <span class="icon">📝</span>
            <span>Export as Word</span>
          </button>
        </div>
      </div>
    `;
  }

  createDataManagementPanel() {
    const panelContent = document.getElementById('panel-content');
    panelContent.innerHTML = `
<div class="data-management-info">
  <div class="info-section">
    <h4 data-i18n="dataManagement.title">Data Management</h4>
    <p class="info-description" data-i18n="dataManagement.subtitle">
      Backup, restore, and manage your family data
    </p>
    <p class="info-details">
      <span data-i18n="dataManagement.info.description">
        Use the main panel to create backups of your family data, restore from previous backups, 
        and view storage information. All data is stored securely using SQLite database format.
      </span>
    </p>
  </div>
   
  <div class="info-section">
    <h5 data-i18n="dataManagement.info.usage">How to Use</h5>
    <ol class="usage-list">
      <li data-i18n="dataManagement.info.step1">
        Click "Create Backup" to generate a complete backup file
      </li>
      <li data-i18n="dataManagement.info.step2">
        Use "Load Backup" to restore data from a backup file
      </li>
      <li data-i18n="dataManagement.info.step3">
        Monitor storage statistics in the information panel
      </li>
    </ol>
  </div>
  
  <div class="info-section safety-notice">
    <div class="notice-header">
      <span class="notice-icon">⚠️</span>
      <h5 data-i18n="dataManagement.info.important">Important</h5>
    </div>
    <p class="notice-text" data-i18n="dataManagement.info.warning">
      Always create regular backups of your data. Restore operations will replace existing data.
    </p>
  </div>
</div>
    `;
    
    // Trigger translation update for the newly inserted content
    this.translateStaticElements();
  }

  createSettingsPanel() {
    const panelContent = document.getElementById('panel-content');
    panelContent.innerHTML = `
      <div class="panel-actions active">
        <div class="action-section">
          <h4>Language</h4>
          <button class="action-btn" data-action="change-language">
            <span class="icon">🌍</span>
            <span>Change Language</span>
          </button>
        </div>
        
        <div class="action-section">
          <h4>PDF Settings</h4>
          <button class="action-btn" data-action="pdf-settings">
            <span class="icon">📄</span>
            <span>PDF Configuration</span>
          </button>
        </div>
        
        <div class="action-section">
          <h4>Application</h4>
          <button class="action-btn" data-action="clear-cache">
            <span class="icon">🗑️</span>
            <span>Clear Cache</span>
          </button>
          <button class="action-btn" data-action="reset-settings">
            <span class="icon">🔄</span>
            <span>Reset Settings</span>
          </button>
        </div>
        
        <div class="action-section">
          <h4>About</h4>
          <button class="action-btn" data-action="about">
            <span class="icon">ℹ️</span>
            <span>About PedigreePro</span>
          </button>
        </div>
      </div>
    `;
  }

  async loadModuleData(module) {
    console.log(`📋 Loading module data for: ${module}`);
    
    // Handle Family Center container visibility
    const familyCenterMainContainer = document.getElementById('family-center-container');
    console.log('🔍 familyCenterMainContainer found:', !!familyCenterMainContainer);
    if (familyCenterMainContainer) {
      if (module === 'family-center') {
        // Show Family Center container when switching to Family Center
        familyCenterMainContainer.classList.remove('hidden');
      } else {
        // Hide Family Center container when switching to other modules
        familyCenterMainContainer.classList.add('hidden');
      }
    }
    
    switch (module) {
      case 'dashboard':
        console.log('📊 Loading dashboard data...');
        await this.loadDashboardData();
        break;
      case 'family-center':
        console.log('🏠 Loading Family Center...');
        await this.loadFamilyCenter();
        break;
      case 'data-management':
        console.log('💾 Loading Data Management module...');
        if (window.DataManagementModule) {
          // The module should already be initialized from switchToModule
          console.log('✅ Data Management module available');
        } else {
          console.warn('⚠️ DataManagementModule not loaded yet');
        }
        break;
      // Add other module data loading as needed
    }
    
    console.log(`✅ Module data loaded for: ${module}`);
  }

  async loadFamilyCenter() {
    try {
      console.log('🏠 Loading Family Center functionality...');
      
      // Initialize the Family Center UI functionality using existing patterns
      this.initializeFamilyCenterUI();
      
      console.log('✅ Family Center loaded and initialized');
      
    } catch (error) {
      console.error('❌ Error loading Family Center:', error);
      
      // Show error message in the main content area
      const mainContent = document.getElementById('main-content');
      if (mainContent) {
        mainContent.innerHTML = `
          <div class="error-container">
            <h2>🏠 Family Center</h2>
            <p class="error-message">Failed to load Family Center: ${error.message}</p>
            <p>Please try refreshing the page.</p>
            <button onclick="location.reload()" class="btn btn-primary">Reload App</button>
          </div>
        `;
      }
    }
  }

  initializeFamilyCenterUI() {
    console.log('🏠 Initializing Family Center UI with tabs...');
    
    const initTabSystem = () => {
      // Initialize the tab system
      const tabsContainer = document.querySelector('.tabs-shell');
      if (tabsContainer) {
        console.log('✅ Found tabs container...');
        
        // Find the list and panels elements within the tabs container
        const listEl = tabsContainer.querySelector('.tabs-list');
        const panelsEl = tabsContainer.querySelector('.tabs-panels');
        
        if (listEl && panelsEl) {
          // Always try to restore state first, since DOM gets recreated on module switch
          if (!this.familyCenterTabManager) {
            console.log('✅ Creating new TabManager...');
            // Initialize TabManager with imported class
            this.familyCenterTabManager = new TabManager({ 
              listEl, 
              panelsEl, 
              storageKey: 'pedigreepro:familycenter:tabs' 
            });
            console.log(`✅ TabManager initialized with ID: ${this.familyCenterTabManager.instanceId}`);
            
            // FIRST: Set up event listener for tab restoration  
            console.log('🔄 Adding tabs-restore-requested event listener to listEl...');
            listEl.addEventListener('tabs-restore-requested', async (event) => {
              console.log('🔄 Handling tab restoration event...');
              const { tabs, activeId } = event.detail;
              console.log('🔄 Tabs to restore:', tabs);
              console.log('🔄 Target activeId:', activeId);
              
              // Recreate each tab properly
              for (const tabData of tabs) {
                console.log('🔄 Recreating tab:', tabData);
                await this.recreateTab(tabData);
              }
              
              // Complete restoration by activating the correct tab
              console.log('🔄 Completing restoration...');
              this.familyCenterTabManager.completeRestoration(activeId);
            });
            console.log('🔄 Event listener added successfully');
            
            // THEN: Try to restore persisted tabs from storage
            console.log('🔄 Attempting to restore tab state...');
            const restored = this.familyCenterTabManager.restore();
            
            // If restoration failed or no tabs were restored, ensure welcome tab exists
            if (!restored) {
              console.log('🏠 No tabs restored, opening welcome tab...');
              this.openFamilyCenterWelcomeTab();
            }
          } else {
            console.log('✅ Updating TabManager DOM references for new module load...');
            console.log(`✅ Reusing TabManager instance: ${this.familyCenterTabManager.instanceId}`);
            // Update the DOM element references and reinitialize event listeners
            this.familyCenterTabManager.updateDOMReferences(listEl, panelsEl);
          }
          
          // FIRST: Set up event listener for tab restoration
          console.log('🔄 Adding tabs-restore-requested event listener to listEl...');
          listEl.addEventListener('tabs-restore-requested', async (event) => {
            console.log('🔄 Handling tab restoration event...');
            const { tabs, activeId } = event.detail;
            console.log('🔄 Tabs to restore:', tabs);
            console.log('🔄 Target activeId:', activeId);
            
            // Recreate each tab properly
            for (const tabData of tabs) {
              console.log('🔄 Recreating tab:', tabData);
              await this.recreateTab(tabData);
            }
            
            // Complete restoration by activating the correct tab
            console.log('🔄 Completing restoration...');
            this.familyCenterTabManager.completeRestoration(activeId);
          });
          console.log('🔄 Event listener added successfully');
          
          // THEN: Try to restore persisted tabs from storage
          console.log('🔄 Attempting to restore tab state...');
          const restored = this.familyCenterTabManager.restore();
          
          // If restoration failed or no tabs were restored, ensure welcome tab exists
          if (!restored) {
            console.log('🏠 No tabs restored, opening welcome tab...');
            this.openFamilyCenterWelcomeTab();
          }
        } else {
          console.error('❌ Required tab elements not found:', { listEl, panelsEl });
        }
      } else {
        console.error('❌ No tabs container found in Family Center template');
      }
    };
    
    // Start initialization (with retry mechanism)
    initTabSystem();
    
    // Setup legacy event listeners for header buttons
    const createFamilyBtn = document.getElementById('fc-create-family');
    const importFamilyBtn = document.getElementById('fc-import-family');
    
    if (createFamilyBtn) {
      createFamilyBtn.addEventListener('click', () => this.handleCreateFamily());
    }
    
    if (importFamilyBtn) {
      importFamilyBtn.addEventListener('click', () => this.handleImportFamily());
    }
    
    console.log('✅ Family Center UI initialized');
  }

  /**
   * Recreate a tab from stored metadata
   */
  async recreateTab(tabData) {
    const { id, title, isClosable, metadata } = tabData;
    
    console.log(`🔄 Recreating tab: ${title} (${id}) with metadata:`, metadata);
    
    if (id === 'welcome') {
      // Recreate welcome tab
      console.log('🔄 Recreating welcome tab...');
      this.openFamilyCenterWelcomeTab();
    } else if (id.startsWith('family-')) {
      // Recreate family tab
      if (metadata && metadata.familyName) {
        console.log(`🔄 Recreating family tab for: ${metadata.familyName}`);
        await this.openFamilyTab(metadata.familyName);
      } else {
        console.warn('Cannot recreate family tab without familyName in metadata');
      }
    } else if (id.startsWith('member-editor-')) {
      // Recreate member editor tab
      if (metadata && metadata.memberId) {
        console.log(`🔄 Recreating member editor tab for member: ${metadata.memberId}`);
        const member = await this.getMemberById(metadata.memberId);
        if (member) {
          this.openMemberEditorTab(member);
        }
      } else {
        console.warn('Cannot recreate member editor tab without memberId in metadata');
      }
    } else {
      console.warn('Unknown tab type for restoration:', id);
    }
  }

  /**
   * Get member by ID (helper for tab restoration)
   */
  async getMemberById(memberId) {
    try {
      return await window.electronAPI.invoke('family-center-get-family-member', memberId);
    } catch (error) {
      console.error('Error getting member by ID:', error);
      return null;
    }
  }

  openFamilyCenterWelcomeTab() {
    if (!this.familyCenterTabManager) return;
    
const welcomeContent = `
  <div class="welcome-content">
             <div class="recent-families">
      <h3>${this.t('familyCenter.recentFamilies', 'Recent Families')}</h3>
      <div class="families-table-container">
        <div id="families-table-content">
          <p>${this.t('common.loading', 'Loading families...')}</p>
        </div>
      </div>
    </div>
  </div>
`;

    this.familyCenterTabManager.openTab({
      id: 'welcome',
      title: this.t('familyCenter.homeTab', 'Families'),
      isClosable: false,  // Make welcome tab non-closable
      metadata: { type: 'welcome' }, // Add metadata for restoration
      render: (panelEl) => {
        panelEl.innerHTML = welcomeContent;
      }
    });
    
    // Load families table
    this.loadFamiliesTable();
  }

  /**
   * Count the number of members in a pedigree by parsing its data
   */
  countPedigreeMembers(pedigreeData) {
    try {
      if (!pedigreeData) return 0;
      
      // Parse the data if it's a string
      const data = typeof pedigreeData === 'string' ? JSON.parse(pedigreeData) : pedigreeData;
      
      // Count people in the GG array (excluding hubs and relationship nodes)
      if (data.GG && Array.isArray(data.GG)) {
        return data.GG.filter(node => {
          // Only count nodes that represent actual people (not hubs or relationship nodes)
          return node.prop && 
                 (node.prop.fName || node.prop.gender) && 
                 !node.hub && 
                 !node.chhub && 
                 !node.rel;
        }).length;
      }
      
      return 0;
    } catch (error) {
      console.error('Error counting pedigree members:', error);
      return 0;
    }
  }

  async loadFamiliesTable() {
    try {
      const tableContainer = document.getElementById('families-table-content');
      if (!tableContainer) return;
      
      // Get families from database
      if (window.electronAPI && window.electronAPI.familyCenter && window.electronAPI.familyCenter.getAllFamilies) {
        const recentFamilies = await window.electronAPI.familyCenter.getAllFamilies();
        console.log('🏠 Welcome Tab - Families data:', recentFamilies);
        
        if (recentFamilies && recentFamilies.length > 0) {
          console.log('📋 Welcome Tab - All families:', recentFamilies);
          
          // Create table structure with unique ID for DataTables
          tableContainer.innerHTML = `
            <table id="families-datatable" class="display compact" style="width:100%">
              <thead>
                <tr>
                  <th>${this.t('familyCenter.tableColumns.familyName', 'Family Name')}</th>
                  <th>${this.t('labels.created', 'Created')}</th>
                  <th>${this.t('labels.updated', 'Last Updated')}</th>
                  <th>${this.t('familyCenter.members', 'Members')}</th>
                  <th>${this.t('labels.actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                <!-- Data will be populated by DataTables -->
              </tbody>
            </table>
          `;
          
          // Initialize DataTables with family data
          this.initializeFamiliesDataTable(recentFamilies);
          
        } else {
          tableContainer.innerHTML = `
            <div class="empty-state">
              <div class="empty-state-icon">👨‍👩‍👧‍👦</div>
              <div class="empty-state-message">No families found</div>
              <div class="empty-state-description">Create your first family to get started</div>
            </div>
          `;
        }
      } else {
        tableContainer.innerHTML = '<p class="error">Database not available.</p>';
      }
    } catch (error) {
      console.error('Error loading families table:', error);
      const tableContainer = document.getElementById('families-table-content');
      if (tableContainer) {
        tableContainer.innerHTML = '<p class="error">Error loading families.</p>';
      }
    }
  }

  /**
   * Initialize DataTables for families table
   */
  initializeFamiliesDataTable(familiesData) {
    // Prepare data for DataTables format
    const tableData = familiesData.map(family => {
      const memberCount = family.member_count || 0;
      const createdDate = new Date(family.created_date || family.created_at).toLocaleDateString();
      const updatedDate = new Date(family.last_updated || family.updated_at).toLocaleDateString();
      
      // Create action buttons HTML
      const actionsHtml = `
          <button class="btn btn-sm" onclick="window.pedigreeApp?.openFamilyTab('${this.escapeHtml(family.name)}')" title="${this.t('familyCenter.viewFamily', 'View Family')}">
            <i class="fa fa-eye"></i>
          </button>
          <button class="btn btn-sm" onclick="window.pedigreeApp?.openPedigreeByName('${this.escapeHtml(family.name)}')" title="${this.t('familyCenter.openPedigree', 'Open Pedigree')}">
            <i class="fa fa-sitemap"></i>
          </button>
          <button class="btn btn-sm" onclick="window.pedigreeApp?.deletePedigree('${this.escapeHtml(family.name)}')" title="${this.t('buttons.delete', 'Delete Family')}">
            <i class="fa fa-trash"></i>
          </button>
      `;

      // Create family name with icon
      const familyNameHtml = `
        <div class="family-name">
          <strong>${this.escapeHtml(family.name)}</strong>
        </div>
      `;

      const memberCountHtml = `<span class="badge">${memberCount} ${this.t('familyCenter.memberCount', memberCount === 1 ? 'member' : 'members')}</span>`;

      return [
        familyNameHtml,
        createdDate,
        updatedDate,
        memberCountHtml,
        actionsHtml
      ];
    });

    // Initialize DataTables using jq (our jQuery noConflict reference)
    if (typeof jq !== 'undefined') {
      const table = jq('#families-datatable').DataTable({
        data: tableData,
        pageLength: 10,
        lengthMenu: [[10, 25, 50, -1], [10, 25, 50, "All"]],
        order: [[2, 'desc']], // Sort by "Last Updated" column by default
        language: {
          search: this.t('common.search', 'Search:'),
          lengthMenu: this.t('dataTable.lengthMenu', 'Show _MENU_ entries'),
          info: this.t('dataTable.info', 'Showing _START_ to _END_ of _TOTAL_ families'),
          infoEmpty: this.t('dataTable.infoEmpty', 'Showing 0 to 0 of 0 families'),
          infoFiltered: this.t('dataTable.infoFiltered', '(filtered from _MAX_ total families)'),
          paginate: {
            first: this.t('dataTable.first', 'First'),
            last: this.t('dataTable.last', 'Last'),
            next: this.t('dataTable.next', 'Next'),
            previous: this.t('dataTable.previous', 'Previous')
          },
          emptyTable: this.t('dataTable.emptyTable', 'No families available'),
          zeroRecords: this.t('dataTable.zeroRecords', 'No matching families found')
        },
        columnDefs: [
          {
            className: 'dt-center',
            targets: [1,2,3,4]
          },
          {
            targets: [4], // Actions column
            orderable: false,
            searchable: false
          },
          {
            targets: [3], // Members column
            orderable: true,
            type: 'num-fmt' // For proper numeric sorting
          }
        ],
        responsive: true,
        dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>>' +
             '<"row"<"col-sm-12"tr>>' +
             '<"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>',
        drawCallback: function(settings) {
          // Re-apply any tooltips or other UI enhancements after table redraw
          console.log('DataTable redrawn');
        }
      });

      // Store reference for potential future use
      this.familiesDataTable = table;
      
      console.log('✅ DataTables initialized for families table');
    } else {
      console.error('❌ jQuery not available for DataTables initialization');
      // Fallback to basic table if jQuery/DataTables not available
      this.loadFamiliesTableBasic(familiesData);
    }
  }

  /**
   * Fallback method to load basic table without DataTables
   */
  loadFamiliesTableBasic(familiesData) {
    const tableContainer = document.getElementById('families-table-content');
    if (!tableContainer) return;

    const tableRows = familiesData.map((family) => {
      const memberCount = family.member_count || 0;
      const createdDate = new Date(family.created_date || family.created_at).toLocaleDateString();
      const updatedDate = new Date(family.last_updated || family.updated_at).toLocaleDateString();
      
      return `
        <tr>
          <td>
            <div class="family-name">
              <strong>${this.escapeHtml(family.name)}</strong>
            </div>
          </td>
          <td>${createdDate}</td>
          <td>${updatedDate}</td>
          <td>
            <span class="badge">${memberCount} ${this.t('familyCenter.memberCount', memberCount === 1 ? 'member' : 'members')}</span>
          </td>
          <td>
            <div class="table-actions">
              <button class="btn btn-sm btn-primary" onclick="window.pedigreeApp?.openFamilyTab('${this.escapeHtml(family.name)}')" title="${this.t('familyCenter.viewFamily', 'View Family')}">
                <i class="fa fa-eye"></i>
              </button>
              <button class="btn btn-sm btn-secondary" onclick="window.pedigreeApp?.openPedigreeByName('${this.escapeHtml(family.name)}')" title="${this.t('familyCenter.openPedigree', 'Open Pedigree')}">
                <i class="fa fa-sitemap"></i>
              </button>
              <button class="btn btn-sm btn-danger" onclick="window.pedigreeApp?.deletePedigree('${this.escapeHtml(family.name)}')" title="${this.t('buttons.delete', 'Delete Family')}">
                <i class="fa fa-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    });
    
    const tableHtml = `
      <table class="table table-striped families-table">
        <thead>
          <tr>
            <th>${this.t('familyCenter.tableColumns.familyName', 'Family Name')}</th>
            <th>${this.t('labels.created', 'Created')}</th>
            <th>${this.t('labels.updated', 'Last Updated')}</th>
            <th>${this.t('familyCenter.members', 'Members')}</th>
            <th>${this.t('labels.actions', 'Actions')}</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows.join('')}
        </tbody>
      </table>
    `;
    
    tableContainer.innerHTML = tableHtml;
  }

  /**
   * Refresh the families DataTable
   */
  async refreshFamiliesTable() {
    // Destroy existing DataTable if it exists
    if (this.familiesDataTable && typeof jq !== 'undefined') {
      this.familiesDataTable.destroy();
      this.familiesDataTable = null;
    }
    
    // Reload the table
    await this.loadFamiliesTable();
  }

  /**
   * Update DataTable language when language changes
   */
  updateFamiliesDataTableLanguage() {
    if (this.familiesDataTable && typeof jq !== 'undefined') {
      // Update language settings
      const languageSettings = {
        search: this.t('common.search', 'Search:'),
        lengthMenu: this.t('dataTable.lengthMenu', 'Show _MENU_ entries'),
        info: this.t('dataTable.info', 'Showing _START_ to _END_ of _TOTAL_ families'),
        infoEmpty: this.t('dataTable.infoEmpty', 'Showing 0 to 0 of 0 families'),
        infoFiltered: this.t('dataTable.infoFiltered', '(filtered from _MAX_ total families)'),
        paginate: {
          first: this.t('dataTable.first', 'First'),
          last: this.t('dataTable.last', 'Last'),
          next: this.t('dataTable.next', 'Next'),
          previous: this.t('dataTable.previous', 'Previous')
        },
        emptyTable: this.t('dataTable.emptyTable', 'No families available'),
        zeroRecords: this.t('dataTable.zeroRecords', 'No matching families found')
      };
      
      // Update the language settings
      this.familiesDataTable.settings()[0].oLanguage = languageSettings;
      
      // Redraw the table to apply language changes
      this.familiesDataTable.draw();
      
      // Also update the table headers
      const table = document.getElementById('families-datatable');
      if (table) {
        const headers = table.querySelectorAll('th');
        if (headers.length >= 5) {
          headers[0].textContent = this.t('familyCenter.tableColumns.familyName', 'Family Name');
          headers[1].textContent = this.t('labels.created', 'Created');
          headers[2].textContent = this.t('labels.updated', 'Last Updated');
          headers[3].textContent = this.t('familyCenter.members', 'Members');
          headers[4].textContent = this.t('labels.actions', 'Actions');
        }
      }
    }
  }

  /**
   * Add a new row to the families DataTable
   */
  addFamilyToDataTable(familyData) {
    if (this.familiesDataTable && typeof jq !== 'undefined') {
      const memberCount = familyData.member_count || 0;
      const createdDate = new Date(familyData.created_date || familyData.created_at).toLocaleDateString();
      const updatedDate = new Date(familyData.last_updated || familyData.updated_at).toLocaleDateString();
      
      const actionsHtml = `
        <div class="table-actions">
          <button class="btn btn-sm btn-primary" onclick="window.pedigreeApp?.openFamilyTab('${this.escapeHtml(familyData.name)}')" title="${this.t('familyCenter.viewFamily', 'View Family')}">
            <i class="fa fa-eye"></i>
          </button>
          <button class="btn btn-sm btn-secondary" onclick="window.pedigreeApp?.openPedigreeByName('${this.escapeHtml(familyData.name)}')" title="${this.t('familyCenter.openPedigree', 'Open Pedigree')}">
            <i class="fa fa-sitemap"></i>
          </button>
          <button class="btn btn-sm btn-danger" onclick="window.pedigreeApp?.deletePedigree('${this.escapeHtml(familyData.name)}')" title="${this.t('buttons.delete', 'Delete Family')}">
            <i class="fa fa-trash"></i>
          </button>
        </div>
      `;

      const familyNameHtml = `
        <div class="family-name">
          <i class="fa fa-users"></i>
          <strong>${this.escapeHtml(familyData.name)}</strong>
        </div>
      `;

      const memberCountHtml = `<span class="badge">${memberCount} ${this.t('familyCenter.memberCount', memberCount === 1 ? 'member' : 'members')}</span>`;

      const rowData = [
        familyNameHtml,
        createdDate,
        updatedDate,
        memberCountHtml,
        actionsHtml
      ];

      this.familiesDataTable.row.add(rowData).draw();
    }
  }

  /**
   * Remove a family from the DataTable
   */
  removeFamilyFromDataTable(familyName) {
    if (this.familiesDataTable && typeof jq !== 'undefined') {
      // Find and remove the row containing the family name
      this.familiesDataTable.rows().every(function(rowIdx, tableLoop, rowLoop) {
        const data = this.data();
        if (data[0].includes(familyName)) {
          this.remove();
          return false; // Break the loop
        }
      });
      
      this.familiesDataTable.draw();
    }
  }

  async openFamilyTab(familyName) {
    if (!this.familyCenterTabManager) return;
    
    try {
      // Get family data first
      const families = await window.electronAPI.familyCenter.getAllFamilies();
      const family = families.find(f => f.name === familyName);
      
      if (!family) {
        console.error('Family not found:', familyName);
        return;
      }
      
      // Get family members
      const familyMembers = await window.electronAPI.familyCenter.getFamilyMembers(family.id);
      console.log('🏠 Family Members for', familyName, ':', familyMembers);
      
      // Create or switch to family tab
      const tabId = `family-${family.id}`;
      
      // Check if tab already exists using Map.has()
      if (this.familyCenterTabManager.tabs.has(tabId)) {
        this.familyCenterTabManager.activateTab(tabId);
      } else {
        // Create new tab
        this.familyCenterTabManager.openTab({
          id: tabId,
          title: `${familyName}`,
          isClosable: true, // Fix: Ensure family tabs are closable
          metadata: { type: 'family', familyName }, // Add metadata for restoration
          render: async (panelEl) => {
            const familyContent = await this.familyDetailsModule.generateFamilyTabContent(family, familyMembers);
            panelEl.innerHTML = familyContent;
            
            // Load content and setup after content is rendered
            setTimeout(async () => {
              try {
                // Initialize DataTable for family members
                this.familyDetailsModule.initializeFamilyMembersDataTable(family.id);
                
                // Auto-load latest analysis
                console.log('Auto-loading latest analysis for family pedigree_id:', family.pedigree_id || family.id);
                await this.autoLoadLatestAnalysis(family.pedigree_id || family.id);
                
                // Load family PDFs
                console.log('Loading PDFs for family id:', family.id);
                await this.loadFamilyPdfs(family.id);
              } catch (error) {
                console.error('Error auto-loading family content:', error);
                // Show placeholder if auto-load fails
                const analysisContent = document.getElementById(`analysis-content-${family.pedigree_id || family.id}`);
                if (analysisContent) {
                  analysisContent.innerHTML = this.getAnalysisPlaceholder();
                }
              }
            }, 100); // Small delay to ensure DOM is ready
          }
        });
      }
    } catch (error) {
      console.error('Error opening family tab:', error);
    }
  }

  editFamily(familyName) {
    // Launch pedigree editor
    if (window.electronAPI && window.electronAPI.launchPedigreeEditor) {
      window.electronAPI.launchPedigreeEditor(familyName);
    }
  }

  viewFamilyPedigree(familyName) {
    // For now, same as edit
    this.editFamily(familyName);
  }

  async viewFamilyInCenter(familyName) {
    // Switch to family center module
    await this.switchModule('family-center');
    
    // Wait a moment for the module to load, then open the specific family tab
    setTimeout(async () => {
      await this.openFamilyTab(familyName);
    }, 500);
  }

  /**
   * Initialize DataTable for family members
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
        scrollX: true,
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
          },
          { 
            targets: [6], // Actions column
            className: "text-center",
            width: "10%",
            orderable: false 
          }
        ]
      });

      console.log(`Family members DataTable initialized for family ${familyId}`);
      
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
      const member = await window.electronAPI.invoke('family-center-get-family-member', memberId);
      
      if (!member) {
        alert('Member not found');
        return;
      }

      // Show comprehensive member editor in right panel
      this.showMemberEditor(member);
    } catch (error) {
      console.error('Error viewing member details:', error);
      alert('Failed to load member details');
    }
  }

  editMember(memberId) {
    console.log('Edit member for member ID:', memberId);
    // TODO: Implement edit member functionality
    alert('Edit Member functionality will be implemented soon!');
  }

  exportFamily(familyId) {
    console.log('Export family for family ID:', familyId);
    // TODO: Implement export family functionality
    alert('Export Family functionality will be implemented soon!');
  }

  // PDF management methods
  async loadFamilyPdfs(familyId) {
    console.log('🔍 loadFamilyPdfs called with familyId:', familyId);
    try {
      const pdfsTableBody = document.getElementById(`family-pdfs-${familyId}`);
      console.log('📋 Found PDF table body:', pdfsTableBody ? 'Yes' : 'No');
      if (!pdfsTableBody) {
        console.warn('❌ PDF table body not found for family ID:', familyId);
        return;
      }
      
      // Get PDFs for this family
      console.log('🌐 Calling electronAPI.familyCenter.getFamilyPdfs...');
      const result = await window.electronAPI.familyCenter.getFamilyPdfs(familyId);
      console.log('📊 PDF result:', result);
      
      if (result.success && result.pdfs && result.pdfs.length > 0) {
        console.log('✅ Found', result.pdfs.length, 'PDF files for family', familyId);
        const pdfsRows = result.pdfs.map(pdf => {
          const createdDate = new Date(pdf.created_at).toLocaleDateString();
          const createdTime = new Date(pdf.created_at).toLocaleTimeString();
          
          // Format file size if available
          let fileSizeDisplay = 'Unknown';
          if (pdf.file_size) {
            if (pdf.file_size < 1024) {
              fileSizeDisplay = `${pdf.file_size} B`;
            } else if (pdf.file_size < 1024 * 1024) {
              fileSizeDisplay = `${(pdf.file_size / 1024).toFixed(1)} KB`;
            } else {
              fileSizeDisplay = `${(pdf.file_size / (1024 * 1024)).toFixed(1)} MB`;
            }
          }
          
          // Truncate long file names for display
          const displayFileName = pdf.file_name.length > 30 
            ? pdf.file_name.substring(0, 10) + '...' 
            : pdf.file_name;
          
          return `
            <tr>
              <td>
                <span title="${this.escapeHtml(pdf.file_name)}">${this.escapeHtml(displayFileName)}</span>
              </td>
              <td>
                ${pdf.pedigree_name ? `<strong>${this.escapeHtml(pdf.pedigree_name)}</strong>` : '<span class="text-muted">Unknown</span>'}
              </td>
              <td>
                ${createdDate}
              </td>
              <td>
                ${createdTime}
              </td>
              <td>
                <div class="btn-group" role="group">
                  <button class="btn btn-sm btn-outline-primary" 
                          onclick="window.pedigreeApp.openPdf('${pdf.file_path.replace(/\\/g, '\\\\')}')" 
                          title="Open PDF">
                    <i class="fa fa-eye"></i> View
                  </button>
                  <button class="btn btn-sm btn-outline-secondary" 
                          onclick="window.pedigreeApp.downloadPdf('${pdf.file_path.replace(/\\/g, '\\\\')}', '${pdf.file_name}')" 
                          title="Download PDF">
                    <i class="fa fa-download"></i>
                  </button>
                </div>
              </td>
            </tr>
          `;
        }).join('');
        
        pdfsTableBody.innerHTML = pdfsRows;
        console.log('✅ PDF table updated with', result.pdfs.length, 'rows');
      } else {
        console.log('❌ No PDFs found or result not successful for family', familyId);
        console.log('Result details:', { success: result.success, pdfsLength: result.pdfs?.length, hasResult: !!result });
        pdfsTableBody.innerHTML = `
          <tr>
            <td colspan="6" class="text-center text-muted">
              <div class="empty-state-small">
                <i class="fa fa-file-pdf fa-2x"></i>
                <p>No PDF files found for this family</p>
                <small>PDF files are automatically generated when you save pedigrees</small>
              </div>
            </td>
          </tr>
        `;
      }
    } catch (error) {
      console.error('Error loading family PDFs:', error);
      const pdfsTableBody = document.getElementById(`family-pdfs-${familyId}`);
      if (pdfsTableBody) {
        pdfsTableBody.innerHTML = `
          <tr>
            <td colspan="6" class="text-center text-danger">
              <i class="fa fa-exclamation-triangle"></i>
              <p>Error loading PDF files: ${error.message}</p>
            </td>
          </tr>
        `;
      }
    }
  }

  async openPdf(filePath) {
    try {
      const result = await window.electronAPI.familyCenter.openPdf(filePath);
      if (!result.success) {
        alert(`Error opening PDF: ${result.error}`);
      }
    } catch (error) {
      console.error('Error opening PDF:', error);
      alert(`Error opening PDF: ${error.message}`);
    }
  }

  async downloadPdf(filePath, fileName) {
    try {
      // Request the main process to show a save dialog and copy the file
      const result = await window.electronAPI.familyCenter.downloadPdf(filePath, fileName);
      if (result.success) {
        // Show success message
        const toast = document.createElement('div');
        toast.className = 'toast-notification success';
        toast.innerHTML = `
          <i class="fa fa-check-circle"></i>
          PDF downloaded successfully to ${result.savedPath}
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
      } else {
        alert(`Error downloading PDF: ${result.error}`);
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert(`Error downloading PDF: ${error.message}`);
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  async loadFamiliesList() {
    try {
      const familyList = document.getElementById('fc-family-list');
      if (!familyList) return;
      
      familyList.innerHTML = '<div class="loading">Loading families...</div>';
      
      // Use the existing Electron API to get families
      if (window.electronAPI && window.electronAPI.familyCenter) {
        const families = await window.electronAPI.familyCenter.getAllFamilies();
        this.displayFamiliesList(families);
      } else {
        // For web mode, show empty state
        familyList.innerHTML = `
          <div class="empty-state">
            <p>No families found. Create a new family to get started.</p>
          </div>
        `;
      }
      
    } catch (error) {
      console.error('Error loading families:', error);
      const familyList = document.getElementById('fc-family-list');
      if (familyList) {
        familyList.innerHTML = '<div class="error">Error loading families</div>';
      }
    }
  }

  displayFamiliesList(families) {
    const familyList = document.getElementById('fc-family-list');
    if (!familyList) return;
    
    if (!families || families.length === 0) {
      familyList.innerHTML = `
        <div class="empty-state">
          <p>No families found. Create a new family to get started.</p>
        </div>
      `;
      return;
    }
    
    const familiesHTML = families.map(family => `
      <div class="list-item family-item" data-family-id="${family.id}">
        <div class="item-content">
          <div class="item-title">${family.name}</div>
          <div class="item-subtitle">
            <span class="member-count">${family.member_count || 0} members</span>
            <span class="created-date">${new Date(family.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    `).join('');
    
    familyList.innerHTML = familiesHTML;
    
    // Add click handlers for family items
    familyList.querySelectorAll('.family-item').forEach(item => {
      item.addEventListener('click', () => {
        const familyId = item.dataset.familyId;
        this.selectFamily(familyId);
      });
    });
  }

  handleCreateFamily() {
    console.log('Redirecting to pedigree creation...');
    // Redirect to pedigree creation since families start with pedigrees
    this.showNewPedigreeDialog();
  }

  setupCreateFamilyModal() {
    const modal = document.getElementById('fc-create-family-modal');
    const form = document.getElementById('fc-create-family-form');
    const submitBtn = document.getElementById('fc-submit-family');
    const cancelBtn = document.getElementById('fc-cancel-family');
    const closeBtn = document.getElementById('fc-modal-close');
    
    // Remove existing listeners to prevent duplicates
    if (this.modalListeners) {
      this.modalListeners.forEach(listener => listener.remove());
    }
    this.modalListeners = [];
    
    // Form submission
    if (form) {
      const submitHandler = async (e) => {
        e.preventDefault();
        await this.submitCreateFamilyForm();
      };
      form.addEventListener('submit', submitHandler);
      this.modalListeners.push({
        remove: () => form.removeEventListener('submit', submitHandler)
      });
    }
    
    // Cancel button
    if (cancelBtn) {
      const cancelHandler = () => this.closeCreateFamilyModal();
      cancelBtn.addEventListener('click', cancelHandler);
      this.modalListeners.push({
        remove: () => cancelBtn.removeEventListener('click', cancelHandler)
      });
    }
    
    // Close button
    if (closeBtn) {
      const closeHandler = () => this.closeCreateFamilyModal();
      closeBtn.addEventListener('click', closeHandler);
      this.modalListeners.push({
        remove: () => closeBtn.removeEventListener('click', closeHandler)
      });
    }
    
    // Escape key to close
    const escapeHandler = (e) => {
      if (e.key === 'Escape') {
        this.closeCreateFamilyModal();
      }
    };
    document.addEventListener('keydown', escapeHandler);
    this.modalListeners.push({
      remove: () => document.removeEventListener('keydown', escapeHandler)
    });
    
    // Click outside to close
    if (modal) {
      const outsideClickHandler = (e) => {
        if (e.target === modal) {
          this.closeCreateFamilyModal();
        }
      };
      modal.addEventListener('click', outsideClickHandler);
      this.modalListeners.push({
        remove: () => modal.removeEventListener('click', outsideClickHandler)
      });
    }
  }

  closeCreateFamilyModal() {
    const modal = document.getElementById('fc-create-family-modal');
    if (modal) {
      modal.classList.remove('show');
      setTimeout(() => {
        modal.style.display = 'none';
        // Reset form
        const form = document.getElementById('fc-create-family-form');
        if (form) {
          form.reset();
          this.clearFormMessages();
        }
        // Clean up listeners
        if (this.modalListeners) {
          this.modalListeners.forEach(listener => listener.remove());
          this.modalListeners = [];
        }
      }, 300);
    }
  }

  clearFormMessages() {
    const modal = document.getElementById('fc-create-family-modal');
    if (modal) {
      const errorMessages = modal.querySelectorAll('.form-error, .form-success');
      errorMessages.forEach(msg => msg.remove());
      
      // Reset form group states
      const formGroups = modal.querySelectorAll('.form-group');
      formGroups.forEach(group => {
        group.classList.remove('has-error', 'has-success');
      });
    }
  }

  setupCreateFamilyForm() {
    // This method is deprecated - modal setup is handled in setupCreateFamilyModal()
    console.warn('setupCreateFamilyForm is deprecated, using modal approach');
  }

  async submitCreateFamilyForm() {
    const form = document.getElementById('fc-create-family-form');
    const submitBtn = document.getElementById('fc-submit-family');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoading = submitBtn.querySelector('.btn-loading');
    
    if (!form) return;
    
    // Clear previous messages
    this.clearFormMessages();
    
    // Get form data
    const formData = new FormData(form);
    const familyData = {
      name: formData.get('name')?.trim(),
      proband_name: formData.get('proband_name')?.trim() || null,
      doctor_notes: formData.get('doctor_notes')?.trim() || null,
      status: formData.get('status') || 'active'
    };
    
    // Validate required fields
    if (!familyData.name) {
      this.showModalFormError('Family name is required', 'family-name');
      return;
    }
    
    if (familyData.name.length < 2) {
      this.showModalFormError('Family name must be at least 2 characters long', 'family-name');
      return;
    }
    
    // Show loading state
    submitBtn.disabled = true;
    btnText.style.display = 'none';
    btnLoading.style.display = 'inline';
    
    try {
      // Create family using Electron API
      if (window.electronAPI && window.electronAPI.familyCenter) {
        const result = await window.electronAPI.familyCenter.createFamily(familyData);
        
        if (result) {
          console.log('✅ Family created successfully:', result);
          this.showModalFormSuccess(`Family "${familyData.name}" created successfully!`);
          
          // Refresh the family list
          await this.loadFamiliesList();
          
          // Close modal after a brief delay
          setTimeout(() => {
            this.closeCreateFamilyModal();
          }, 1500);
        } else {
          throw new Error('Failed to create family');
        }
      } else {
        throw new Error('Family Center API not available');
      }
      
    } catch (error) {
      console.error('❌ Error creating family:', error);
      let errorMessage = 'Failed to create family';
      
      if (error.message.includes('UNIQUE constraint failed')) {
        errorMessage = 'A family with this name already exists';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      this.showModalFormError(errorMessage);
      
      // Reset button state
      submitBtn.disabled = false;
      btnText.style.display = 'inline';
      btnLoading.style.display = 'none';
    }
  }

  showModalFormError(message, fieldId = null) {
    // Remove any existing error messages
    this.clearFormMessages();
    
    // Add error class to specific field if provided
    if (fieldId) {
      const field = document.getElementById(fieldId);
      const formGroup = field?.closest('.form-group');
      if (formGroup) {
        formGroup.classList.add('has-error');
        
        // Add error message below field
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `⚠️ ${message}`;
        field.parentNode.appendChild(errorDiv);
        
        // Focus on the field
        field.focus();
        return;
      }
    }
    
    // Add general error message at top of form
    const form = document.getElementById('fc-create-family-form');
    if (form) {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'form-error';
      errorDiv.innerHTML = `
        <div class="alert alert-error">
          ⚠️
          <strong>Error:</strong> ${message}
        </div>
      `;
      form.insertBefore(errorDiv, form.firstChild);
    }
  }

  showModalFormSuccess(message) {
    // Remove any existing messages
    this.clearFormMessages();
    
    // Add success message at top of form
    const form = document.getElementById('fc-create-family-form');
    if (form) {
      const successDiv = document.createElement('div');
      successDiv.className = 'form-success';
      successDiv.innerHTML = `
        <div class="alert alert-success">
          ✅
          <strong>Success:</strong> ${message}
        </div>
      `;
      form.insertBefore(successDiv, form.firstChild);
    }
  }

  handleImportFamily() {
    console.log('Import family functionality removed - families are created through pedigrees');
    // Import functionality removed - families start with pedigree creation
    this.showInfo('Import functionality has been streamlined. Create a new family by starting with a pedigree.');
  }

  handleFamilySearch(searchTerm) {
    console.log('Searching families:', searchTerm);
    // TODO: Implement family search filtering
  }

  async selectFamily(familyId) {
    console.log('Selected family:', familyId);
    const mainContent = document.getElementById('fc-main-content');
    if (!mainContent) return;
    
    try {
      // Show loading state
      mainContent.innerHTML = `
        <div class="loading-container">
          <div class="loading">Loading family details...</div>
        </div>
      `;
      
      // Get family data from backend
      const family = await window.electronAPI.familyCenter.getFamily(familyId);
      const members = await window.electronAPI.familyCenter.getFamilyMembers(familyId);
      
      if (family) {
        this.currentFamilyId = familyId;
        this.displayFamilyDetails(family, members);
      } else {
        throw new Error('Family not found');
      }
      
    } catch (error) {
      console.error('Error loading family details:', error);
      mainContent.innerHTML = `
        <div class="error-container">
          <h2>Error Loading Family</h2>
          <p>Failed to load family details: ${error.message}</p>
          <button class="btn btn-secondary" onclick="window.location.reload()">Retry</button>
        </div>
      `;
    }
  }

  renderFamilyMembers(members) {
    return members.map(member => `
      <div class="member-card">
        <div class="member-header">
          <div class="member-info">
            <h4>${member.first_name} ${member.last_name}</h4>
            <div class="member-details">
              <span class="gender">${member.gender || 'Unknown'}</span>
              <span class="age">${member.birth_date ? this.calculateAge(member.birth_date) : 'Unknown age'}</span>
              <span class="status status-${member.affected_status || 'unknown'}">${member.affected_status || 'Unknown'}</span>
            </div>
          </div>
          <div class="member-actions">
            <button class="btn-icon" onclick="pedigreeApp.editFamilyMember(${member.id})" title="Edit">
              <i class="fa fa-edit"></i>
            </button>
            <button class="btn-icon" onclick="pedigreeApp.viewMemberDetails(${member.id})" title="View Details">
              <i class="fa fa-eye"></i>
            </button>
            <button class="btn-icon danger" onclick="pedigreeApp.deleteFamilyMember(${member.id})" title="Delete">
              <i class="fa fa-trash"></i>
            </button>
          </div>
        </div>
        <div class="member-additional-info">
          ${(member.is_proband === 1 || member.is_proband === true) ? '<span class="badge proband">Proband</span>' : ''}
          ${(member.is_adopted === 1 || member.is_adopted === true) ? '<span class="badge adopted">Adopted</span>' : ''}
          ${member.birth_date ? `<span class="birth-date">Born: ${new Date(member.birth_date).toLocaleDateString()}</span>` : ''}
        </div>
      </div>
    `).join('');
  }

  renderEmptyMembers() {
    return `
      <div class="empty-members">
        <div class="empty-icon">
          <i class="fa fa-users"></i>
        </div>
        <h4>No Family Members</h4>
        <p>Start building your family tree by adding the first family member.</p>
        <button class="btn btn-primary" onclick="pedigreeApp.addFamilyMember(${this.currentFamilyId})">
          <i class="fa fa-plus"></i> Add First Member
        </button>
      </div>
    `;
  }

  calculateAge(birthDate) {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return `${age} years`;
  }






  /**
   * Open PDF in system default application
   */
  async openPdfInSystem(filePath) {
    try {
      if (window.electronAPI && window.electronAPI.openPdf) {
        await window.electronAPI.openPdf(filePath);
      }
    } catch (error) {
      console.error('Error opening PDF in system:', error);
    }
  }

  // Action methods for family management
  editFamily(familyId) {
    console.log('Edit family:', familyId);
    // TODO: Show edit family modal
    alert('Edit family functionality will be implemented');
  }

  addFamilyMember(familyId) {
    console.log('Add member to family:', familyId);
    // TODO: Show add member modal
    alert('Add family member functionality will be implemented');
  }

  viewPedigree(familyId) {
    console.log('View pedigree for family:', familyId);
    // TODO: Navigate to pedigree editor with family data
    alert('View pedigree functionality will be implemented');
  }

  linkToPedigree(familyId) {
    console.log('Link family to pedigree:', familyId);
    // TODO: Show pedigree selection dialog
    alert('Link to pedigree functionality will be implemented');
  }

  editFamilyMember(memberId) {
    console.log('Edit family member:', memberId);
    // TODO: Show edit member modal
    alert('Edit family member functionality will be implemented');
  }

  async viewMemberDetails(memberId) {
    console.log('View member details:', memberId);
    
    try {
      // Get member details from the database
      const member = await window.electronAPI.invoke('family-center-get-family-member', memberId);
      
      if (!member) {
        alert('Member not found');
        return;
      }

      // Open member editor in a new tab
      this.openMemberEditorTab(member);
    } catch (error) {
      console.error('Error viewing member details:', error);
      alert('Failed to load member details');
    }
  }

  deleteFamilyMember(memberId) {
    console.log('Delete family member:', memberId);
    // TODO: Show confirmation dialog and delete
    if (confirm('Are you sure you want to delete this family member?')) {
      alert('Delete family member functionality will be implemented');
    }
  }

  async loadDashboardData() {
    console.log('📊 Loading dashboard data...');
    
    try {
      // Load recent pedigrees
      if (this.isElectron) {
        console.log('🖥️ Running in Electron, loading pedigrees from database...');
        const result = await window.electronAPI.listPedigrees();
        console.log('📋 Pedigrees loaded:', result);
        
        if (result.success) {
          console.log(`✅ Found ${result.pedigrees.length} pedigrees`);
          console.log('📊 Pedigrees data:', result.pedigrees.map(p => ({ name: p.name, created_at: p.created_at, updated_at: p.updated_at })));
          this.displayRecentPedigrees(result.pedigrees);
          this.updateStatistics(result.pedigrees);
        } else {
          console.error('❌ Failed to load pedigrees:', result.error);
          this.displayRecentPedigrees([]);
          this.updateStatistics([]);
        }
      } else {
        console.log('🌐 Running in web mode, using fallback data...');
        // Fallback for web version
        this.displayRecentPedigrees([]);
        this.updateStatistics([]);
      }
      
      // Hide loading state
      this.hideLoadingStates();
      console.log('✅ Dashboard data loading completed');
      
    } catch (error) {
      console.error('💥 Error loading dashboard data:', error);
      this.hideLoadingStates();
      this.displayRecentPedigrees([]);
      this.updateStatistics([]);
    }
  }

  // Load recent pedigrees specifically for dashboard
  async loadRecentPedigreesInDashboard() {
    console.log('📋 Loading recent pedigrees for dashboard...');
    
    try {
      const recentPedigreesContainer = document.getElementById('recent-pedigrees');
      if (!recentPedigreesContainer) {
        console.log('📋 Recent pedigrees container not found, skipping...');
        return;
      }

      if (this.isElectron && window.electronAPI && window.electronAPI.listPedigrees) {
        console.log('🖥️ Loading pedigrees from Electron API...');
        const result = await window.electronAPI.listPedigrees();
        console.log('📋 Pedigrees result:', result);
        
        if (result.success) {
          console.log(`✅ Found ${result.pedigrees.length} pedigrees for dashboard`);
          this.displayRecentPedigrees(result.pedigrees);
        } else {
          console.error('❌ Failed to load pedigrees for dashboard:', result.error);
          this.displayRecentPedigrees([]);
        }
      } else {
        console.log('🌐 No Electron API available, showing empty state...');
        this.displayRecentPedigrees([]);
      }
    } catch (error) {
      console.error('💥 Error loading recent pedigrees for dashboard:', error);
      this.displayRecentPedigrees([]);
    }
  }

  displayRecentPedigrees(pedigrees) {
    const container = document.getElementById('recent-pedigrees');
    if (!container) return;

    if (pedigrees.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📊</div>
          <div class="empty-state-message">${this.i18n.t('dashboard.noPedigrees')}</div>
          <div class="empty-state-description">${this.i18n.t('dashboard.noPedigreesDescription')}</div>
        </div>
      `;
      return;
    }

    const recentPedigrees = pedigrees.slice(0, 5);
    container.innerHTML = recentPedigrees.map(pedigree => `
      <div class="list-item" data-pedigree="${pedigree.name}">
        <div class="list-item-content">
          <div class="list-item-title">${pedigree.name}</div>
          <div class="list-item-subtitle">
            ${this.i18n.t('common.updated')}: ${new Date(pedigree.updated_at).toLocaleDateString()}
          </div>
        </div>
        <div class="list-item-actions">
          <button type="button" class="list-item-action" data-action="open-pedigree" data-pedigree="${pedigree.name}">
           ${this.i18n.t('common.open')}
          </button>
          <button type="button" class="list-item-action" data-action="view-family" data-pedigree="${pedigree.name}">
           ${this.i18n.t('dashboard.viewFamily', 'View Family')}
          </button>
        </div>
      </div>
    `).join('');
  }

  updateStatistics(pedigrees) {
    const totalPedigreesEl = document.getElementById('total-pedigrees');
    const totalMembersEl = document.getElementById('total-family-members');

    if (totalPedigreesEl) {
      totalPedigreesEl.textContent = pedigrees.length;
    }

    // For now, we'll show 0 for family members
    // This could be enhanced to actually count family members across all pedigrees
    if (totalMembersEl) {
      totalMembersEl.textContent = '0';
    }
  }

  async loadPedigreesList() {
    try {
      if (this.isElectron) {
        const result = await window.electronAPI.listPedigrees();
        if (result.success) {
          this.displayPedigreesList(result.pedigrees);
        }
      }
    } catch (error) {
      console.error('Error loading pedigrees list:', error);
    }
  }

  displayPedigreesList(pedigrees) {
    const container = document.getElementById('pedigrees-list');
    if (!container) return;

    if (pedigrees.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📊</div>
          <div class="empty-state-message">No pedigrees found</div>
          <div class="empty-state-description">Create a new pedigree to get started</div>
          <button class="btn primary" data-action="new-pedigree">Create New Pedigree</button>
        </div>
      `;
      return;
    }

    container.innerHTML = pedigrees.map(pedigree => `
      <div class="list-item">
        <div class="list-item-content">
          <div class="list-item-title">${pedigree.name}</div>
          <div class="list-item-subtitle">
            Created: ${new Date(pedigree.created_at).toLocaleDateString()} • 
            Updated: ${new Date(pedigree.updated_at).toLocaleDateString()}
          </div>
        </div>
        <div class="list-item-actions">
          <button type="button" class="list-item-action" data-action="open-pedigree" data-pedigree="${pedigree.name}">
            Open
          </button>
          <button type="button" class="list-item-action" data-action="export-pedigree" data-pedigree="${pedigree.name}">
            Export
          </button>
          <button class="list-item-action danger" data-action="delete-pedigree" data-pedigree="${pedigree.name}">
            Delete
          </button>
        </div>
      </div>
    `).join('');
  }

  async loadFamilyMembers() {
    // This would load family members for the current pedigree
    // For now, we'll show a placeholder
    const container = document.getElementById('family-members-list');
    if (container) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">👥</div>
          <div class="empty-state-message">No family members found</div>
          <div class="empty-state-description">Add family members to start building your pedigree</div>
          <button class="btn primary" data-action="add-family-member">Add Family Member</button>
        </div>
      `;
    }
  }

  updateCurrentPedigreeDisplay() {
    const nameEl = document.getElementById('current-pedigree-name');
    if (nameEl) {
      nameEl.textContent = this.currentPedigree || 'No pedigree loaded';
    }
  }

  async handleAction(action, element) {
    console.log('🎯 Handling action:', action);
    console.log('Element:', element);

    try {
      // Get contextual data from the element
      const pedigreeName = element?.dataset?.pedigree;
      
      switch (action) {
        case 'new-pedigree':
          await this.createNewPedigree();
          break;
        
        case 'open-pedigree':
          if (pedigreeName) {
            // Set as current pedigree and launch directly
            this.currentPedigree = pedigreeName;
            this.updateCurrentPedigreeDisplay();
            await this.launchPedigreeEditor();
          } else {
            await this.openPedigree();
          }
          break;
        
        case 'save':
          await this.savePedigree();
          break;
        
        case 'save-as':
          await this.savePedigreeAs();
          break;
        
        case 'import':
          await this.importData();
          break;
        
        case 'export':
          await this.exportData();
          break;
        
        case 'export-pedigree':
          if (pedigreeName) {
            await this.exportSpecificPedigree(pedigreeName);
          }
          break;
        
        case 'delete-pedigree':
          if (pedigreeName) {
            await this.deleteSpecificPedigree(pedigreeName);
          }
          break;
        
        case 'launch-editor':
          await this.launchPedigreeEditor();
          break;

        case 'launch-editor-direct':
          await this.launchPedigreeEditorDirect();
          break;
        
        case 'refresh-pedigrees':
          this.refreshPedigrees();
          break;
        
        case 'preferences':
          this.showPreferences();
          break;
        
        case 'about':
          this.showAbout();
          break;
        
        case 'quit':
          await this.quitApplication();
          break;
        
        case 'view-family':
          if (pedigreeName) {
            await this.viewFamilyInCenter(pedigreeName);
          }
          break;
        
        default:
          console.log('Unhandled action:', action);
      }
    } catch (error) {
      console.error('Error handling action:', action, error);
      this.showError('An error occurred while performing the action.');
    }
  }

  async createNewPedigree() {
    console.log('📊 Creating new pedigree...');
    
    // Check license limits before allowing creation
    const canCreate = await this.checkFamilyLimit();
    if (!canCreate) {
      return; // License limit dialog already shown
    }
    
    // Show modal to get pedigree name
    this.showNewPedigreeDialog();
  }

  showNewPedigreeDialog() {
    const modal = this.createModal(this.t('pedigree.create.title', 'Create New Pedigree'), `
      <div class="form-group">
        <label for="pedigree-name">${this.t('pedigree.create.nameLabel', 'Pedigree Name')}:</label>
        <input type="text" id="pedigree-name" placeholder="${this.t('pedigree.create.namePlaceholder', 'Enter a name for the new pedigree...')}" autofocus>
      </div>
      <div class="form-group">
        <small class="form-hint">${this.t('pedigree.create.nameHint', 'Choose a descriptive name for your pedigree (e.g., "Smith Family History")')}</small>
      </div>
    `, [
      { text: this.t('common.cancel', 'Cancel'), action: 'close' },
      { text: this.t('pedigree.create.button', 'Create Pedigree'), action: 'create-new-pedigree', primary: true }
    ]);

    // Handle the create action
    modal.querySelector('#create-new-pedigree').addEventListener('click', async () => {
      const nameInput = modal.querySelector('#pedigree-name');
      const name = nameInput.value.trim();
      
      if (!name) {
        nameInput.focus();
        nameInput.style.borderColor = '#dc2626';
        return;
      }

      this.closeModal();
      await this.performCreateNewPedigree(name);
    });

    // Handle Enter key
    modal.querySelector('#pedigree-name').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        modal.querySelector('#create-new-pedigree').click();
      }
    });
  }

  async performCreateNewPedigree(name) {
    console.log('🚀 Starting performCreateNewPedigree with name:', name);
    
    if (this.isElectron) {
      try {
        // Create a proper empty pedigree structure with required properties for the editor
        const emptyPedigreeData = {
          "GG": [],
          "ranks": [],
          "order": [],
          "positions": []
        };
        
        console.log('💾 Calling electronAPI.savePedigree...');
        const result = await window.electronAPI.savePedigree(name, JSON.stringify(emptyPedigreeData));
        console.log('💾 Save result:', result);
        
        if (result.success) {
          console.log('✅ Pedigree saved successfully, updating current pedigree...');
          this.currentPedigree = name;
          this.updateCurrentPedigreeDisplay();
          
          console.log('🔄 Loading dashboard data...');
          // Wait for dashboard refresh to complete before showing success message
          await this.loadDashboardData();
          console.log('✅ Dashboard data loaded successfully');
          
          console.log('📢 Showing success notification...');
          this.showSuccess(`New pedigree "${name}" created successfully!`);
          
          // Ask user if they want to launch the editor
          console.log('⏰ Setting timeout to show dialog...');
          setTimeout(() => {
            console.log('📝 Showing new pedigree created dialog...');
            this.showNewPedigreeCreatedDialog(name);
          }, 1000); // Give time for success message to show
          
        } else {
          console.error('❌ Failed to save pedigree:', result.error);
          this.showError('Failed to create pedigree: ' + result.error);
        }
      } catch (error) {
        console.error('💥 Error in performCreateNewPedigree:', error);
        this.showError('Error creating pedigree: ' + error.message);
      }
    } else {
      console.log('🌐 Not in Electron mode, cannot create pedigree');
    }
  }

  showNewPedigreeCreatedDialog(name) {
    console.log('📝 showNewPedigreeCreatedDialog called with name:', name);
    
    const modal = this.createModal(this.t('pedigree.created.title', 'Pedigree Created'), `
      <div class="form-group">
        <p>${this.t('pedigree.created.successMessage', 'The pedigree "<strong>{name}</strong>" has been created successfully!', { name: name })}</p>
        <p>${this.t('pedigree.created.openQuestion', 'Would you like to open it in the pedigree editor now?')}</p>
      </div>
    `, [
      { text: this.t('common.notNow', 'Not Now'), action: 'close' },
      { text: this.t('pedigree.created.openInEditor', 'Open in Editor'), action: 'launch-editor-for-new', primary: true }
    ]);

    console.log('📝 Modal created, setting up event handler...');
    // Handle launch editor - use setTimeout to ensure the modal is fully rendered
    setTimeout(() => {
      const launchButton = document.getElementById('launch-editor-for-new');
      if (launchButton) {
        console.log('📝 Launch editor button found, adding click handler');
        launchButton.addEventListener('click', () => {
          console.log('📝 Launch editor button clicked');
          this.closeModal();
          setTimeout(() => {
            console.log('📝 Launching pedigree editor...');
            this.launchPedigreeEditor();
          }, 300);
        });
      } else {
        console.error('❌ Launch editor button not found in modal');
        console.log('📝 Available elements with IDs:', Array.from(document.querySelectorAll('[id]')).map(el => el.id));
      }
    }, 100);
  }

  async loadSpecificPedigree(pedigreeName) {
    console.log('📂 Loading specific pedigree:', pedigreeName);
    
    this.currentPedigree = pedigreeName;
    this.updateCurrentPedigreeDisplay();
    
    // Switch to pedigree editor module
    this.switchModule('pedigree-editor');
    
    // Show dialog asking if user wants to launch the editor
    this.showLaunchEditorDialog(pedigreeName);
  }

// Replace the showLaunchEditorDialog method around line 3276
showLaunchEditorDialog(pedigreeName) {
  this.createModal(
    this.t('pedigree.editor.openDialog.title', 'Open Pedigree Editor'),
    `
      <div class="form-group">
        <p>${this.ti('pedigree.editor.openDialog.body', `Would you like to open "<strong>${pedigreeName}</strong>" in the pedigree editor?`, { pedigreeName: pedigreeName })}</p>
      </div>
    `,
    [
      { text: this.t('common.notNow', 'Not Now'), action: 'close' },
      { text: this.t('pedigree.editor.launchEditor', 'Launch Editor'), action: 'launch-editor-now', primary: true }
    ]
  );

  // Handle launch editor
  document.getElementById('launch-editor-now').addEventListener('click', () => {
    this.closeModal();
    setTimeout(() => this.launchPedigreeEditor(), 300);
  });
}

  async exportSpecificPedigree(pedigreeName) {
    if (this.isElectron) {
      try {
        const result = await window.electronAPI.exportPedigree(pedigreeName, 'json', '{}');
        if (result.success) {
          this.showSuccess('Pedigree exported successfully!');
        } else if (result.error !== 'Export cancelled') {
          this.showError('Export failed: ' + result.error);
        }
      } catch (error) {
        this.showError('Error exporting pedigree: ' + error.message);
      }
    }
  }

  async deleteSpecificPedigree(pedigreeName) {
    this.showDeleteConfirmDialog(pedigreeName);
  }

  showDeleteConfirmDialog(pedigreeName) {
    this.createModal('Delete Pedigree', `
      <div class="form-group">
        <p>Are you sure you want to delete the pedigree "<strong>${pedigreeName}</strong>"?</p>
        <p><strong>This action cannot be undone.</strong></p>
      </div>
    `, [
      { text: 'Cancel', action: 'close' },
      { text: 'Delete Pedigree', action: 'confirm-delete', primary: true }
    ]);

    // Handle delete confirmation
    document.getElementById('confirm-delete').addEventListener('click', async () => {
      this.closeModal();
      await this.performDeletePedigree(pedigreeName);
    });
  }

  /**
   * Delete a pedigree with confirmation (used by Family Center table)
   */
  async deletePedigree(pedigreeName) {
    if (!pedigreeName) return;
    
    const confirmed = confirm(`Are you sure you want to delete the pedigree "${pedigreeName}"? This action cannot be undone.`);
    if (confirmed) {
      await this.performDeletePedigree(pedigreeName);
      // Reload the families table to reflect changes
      this.loadFamiliesTable();
    }
  }

  async performDeletePedigree(pedigreeName) {
    if (this.isElectron) {
      try {
        const result = await window.electronAPI.deletePedigree(pedigreeName);
        if (result.success && result.deleted) {
          this.showSuccess('Pedigree deleted successfully!');
          
          // If this was the current pedigree, clear it
          if (this.currentPedigree === pedigreeName) {
            this.currentPedigree = null;
            this.updateCurrentPedigreeDisplay();
          }
          
          // Remove from DataTable if it's active
          this.removeFamilyFromDataTable(pedigreeName);
          
          // Refresh the data
          this.loadDashboardData();
          if (this.currentModule === 'data-management') {
            this.loadPedigreesList();
          }
          if (this.currentModule === 'family-center') {
            // Refresh families table if we're in family center
            this.refreshFamiliesTable();
          }
        } else {
          this.showError('Failed to delete pedigree.');
        }
      } catch (error) {
        this.showError('Error deleting pedigree: ' + error.message);
      }
    }
  }

  async openPedigree() {
    // Show pedigree selection dialog
    if (this.isElectron) {
      try {
        const result = await window.electronAPI.listPedigrees();
        if (result.success && result.pedigrees.length > 0) {
          this.showPedigreeSelectionDialog(result.pedigrees);
        } else {
          this.showError('No pedigrees found.');
        }
      } catch (error) {
        this.showError('Error loading pedigrees: ' + error.message);
      }
    }
  }

  /**
   * Open a specific pedigree by name (used by Family Center)
   */
  async openPedigreeByName(pedigreeName) {
    console.log('📂 Opening pedigree by name:', pedigreeName);
    
    if (this.isElectron) {
      try {
        // Set as current pedigree and launch editor
        this.currentPedigree = pedigreeName;
        this.updateCurrentPedigreeDisplay();
        
        console.log('Calling electronAPI.launchPedigreeEditor with:', pedigreeName);
        const result = await window.electronAPI.launchPedigreeEditor(pedigreeName);
        
        if (result.success) {
          this.showSuccess(`Pedigree editor launched for "${pedigreeName}"`);
        } else {
          this.showError(result.message || 'Failed to launch pedigree editor');
        }
      } catch (error) {
        console.error('Error launching pedigree editor:', error);
        this.showError('Error launching pedigree editor: ' + error.message);
      }
    }
  }

  async launchPedigreeEditor() {

    if (this.isElectron) {
      try {
        // If no pedigree is selected, ask user what to do
        if (!this.currentPedigree) {
          this.showNoPedigreeDialog();
          return;
        }
        
        const result = await window.electronAPI.launchPedigreeEditor(this.currentPedigree);
        
        if (result.success) {
          this.showSuccess(this.t('pedigree.editor.launchSuccess', 'Pedigree editor launched successfully!'));
        } else {
          console.error('❌ Failed to launch pedigree editor:', result.error);
          this.showError('Failed to launch pedigree editor: ' + result.error);
        }
      } catch (error) {
        console.error('❌ Error launching pedigree editor:', error);
        this.showError('Error launching pedigree editor: ' + error.message);
      }
    } else {
      console.warn('Not in Electron environment');
      this.showError('Pedigree editor is only available in the desktop version.');
    }
  }

  // Launch pedigree editor directly without pedigree requirements  
  async handleTemplateSelection(templateId) {
    console.log('🎯 Handling template selection:', templateId);
    
    if (!this.isElectron) {
      this.showError('Template selection is only available in the desktop version.');
      return;
    }

    try {
      // Launch the pedigree editor with template parameter
      console.log('🎯 Calling launchPedigreeEditor with template:', templateId);
      const result = await window.electronAPI.launchPedigreeEditor(null, templateId);
      
      if (result.success) {
        this.showSuccess('Pedigree editor launched with template!');
      } else {
        console.error('❌ Failed to launch pedigree editor:', result.error);
        this.showError('Failed to launch pedigree editor: ' + result.error);
      }
    } catch (error) {
      console.error('❌ Error launching pedigree editor:', error);
      this.showError('Error launching pedigree editor: ' + error.message);
    }
  }

  async launchPedigreeEditorDirect() {
    if (this.isElectron) {
      try {
        console.log('🚀 Launching pedigree editor directly (no pedigree required)');
        const result = await window.electronAPI.launchPedigreeEditor(null);
        
        if (result.success) {
          this.showSuccess(this.t('pedigree.editor.launchSuccess', 'Pedigree editor launched successfully!'));
        } else {
          console.error('❌ Failed to launch pedigree editor:', result.error);
          this.showError('Failed to launch pedigree editor: ' + result.error);
        }
      } catch (error) {
        console.error('❌ Error launching pedigree editor:', error);
        this.showError('Error launching pedigree editor: ' + error.message);
      }
    } else {
      console.warn('Not in Electron environment');
      this.showError('Pedigree editor is only available in the desktop version.');
    }
  }

  showNoPedigreeDialog() {
    this.createModal('No Pedigree Selected', `
      <div class="form-group">
        <p>No pedigree is currently selected. Would you like to create a new pedigree first?</p>
      </div>
    `, [
      { text: 'Launch Editor Anyway', action: 'launch-without-pedigree' },
      { text: 'Create New Pedigree', action: 'create-new-first', primary: true }
    ]);

    // Handle create new pedigree first
    document.getElementById('create-new-first').addEventListener('click', () => {
      this.closeModal();
      this.createNewPedigree(); // This will auto-launch the editor
    });

    // Handle launch without pedigree
    document.getElementById('launch-without-pedigree').addEventListener('click', async () => {
      this.closeModal();
      try {
        const result = await window.electronAPI.launchPedigreeEditor(null);
        if (result.success) {
          this.showSuccess('Pedigree editor launched successfully!');
        } else {
          this.showError('Failed to launch pedigree editor: ' + result.error);
        }
      } catch (error) {
        this.showError('Error launching pedigree editor: ' + error.message);
      }
    });
  }

  async savePedigree() {
    if (!this.currentPedigree) {
      this.showError('No pedigree is currently loaded.');
      return;
    }

    // This would save the current pedigree data
    this.showSuccess('Pedigree saved successfully!');
  }

  async savePedigreeAs() {
    const name = prompt('Enter a new name for the pedigree:');
    if (!name) return;

    // This would save the current pedigree with a new name
    this.currentPedigree = name;
    this.updateCurrentPedigreeDisplay();
    this.showSuccess('Pedigree saved as ' + name + '!');
  }

  async importData() {
    if (this.isElectron) {
      try {
        const result = await window.electronAPI.importPedigree();
        if (result.success) {
          this.showSuccess(result.message || 'Data imported successfully!');
          this.loadDashboardData(); // Refresh the dashboard to show the new pedigree
          
          // Optionally set the imported pedigree as current
          if (result.pedigreeName) {
            this.currentPedigree = result.pedigreeName;
            this.updateCurrentPedigreeDisplay();
          }
        } else if (result.error !== 'Import cancelled') {
          this.showError('Import failed: ' + result.error);
        }
      } catch (error) {
        this.showError('Error importing data: ' + error.message);
      }
    }
  }

  async exportData() {
    if (!this.currentPedigree) {
      this.showError('No pedigree is currently loaded.');
      return;
    }

    if (this.isElectron) {
      try {
        const result = await window.electronAPI.exportPedigree(this.currentPedigree, 'json', '{}');
        if (result.success) {
          this.showSuccess('Data exported successfully!');
        } else if (result.error !== 'Export cancelled') {
          this.showError('Export failed: ' + result.error);
        }
      } catch (error) {
        this.showError('Error exporting data: ' + error.message);
      }
    }
  }

  showPedigreeSelectionDialog(pedigrees) {
    const modal = this.createModal('Select Pedigree', `
      <div class="form-group">
        <label>Choose a pedigree to open:</label>
        <select id="pedigree-select" size="8" style="height: 200px;">
          ${pedigrees.map(p => `<option value="${p.name}">${p.name} (${new Date(p.updated_at).toLocaleDateString()})</option>`).join('')}
        </select>
      </div>
    `, [
      { text: 'Cancel', action: 'close' },
      { text: 'Open', action: 'open-selected-pedigree', primary: true }
    ]);

    modal.querySelector('#open-selected-pedigree').addEventListener('click', async () => {
      const select = modal.querySelector('#pedigree-select');
      const selectedPedigree = select.value;
      if (selectedPedigree) {
        this.currentPedigree = selectedPedigree;
        this.updateCurrentPedigreeDisplay();
        this.closeModal();
        this.showSuccess('Opened pedigree: ' + selectedPedigree);
      }
    });
  }

  showSearchDialog() {
    this.createModal('Search', `
      <div class="form-group">
        <label>Search term:</label>
        <input type="text" id="search-input" placeholder="Enter search term...">
      </div>
      <div class="form-group">
        <label>Search in:</label>
        <select id="search-scope">
          <option value="all">All data</option>
          <option value="pedigrees">Pedigree names</option>
          <option value="family-members">Family members</option>
          <option value="conditions">Medical conditions</option>
        </select>
      </div>
    `, [
      { text: 'Cancel', action: 'close' },
      { text: 'Search', action: 'perform-search', primary: true }
    ]);
  }

  showSettingsDialog() {
    this.createModal('Settings', `
      <div class="form-group">
        <label>Application Theme:</label>
        <select id="theme-select">
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="auto">Auto</option>
        </select>
      </div>
      <div class="form-group">
        <label>Default Export Format:</label>
        <select id="export-format">
          <option value="json">JSON</option>
          <option value="ped">PED</option>
          <option value="pdf">PDF</option>
        </select>
      </div>
      <div class="form-group">
        <label>
          <input type="checkbox" id="auto-save"> Enable auto-save
        </label>
      </div>
    `, [
      { text: 'Cancel', action: 'close' },
      { text: 'Save Settings', action: 'save-settings', primary: true }
    ]);
  }

  showPreferences() {
    this.showSettingsDialog();
  }

  showAbout() {
    this.createModal('About PedigreePro', `
      <div style="text-align: center;">
        <img src="src/assets/open-pedigree-icon.png" alt="PedigreePro" style="width: 64px; height: 64px; margin-bottom: 16px;">
        <h3>PedigreePro® Desktop Edition</h3>
        <p>Professional Pedigree Management Software</p>
        <p>Version 1.0.0</p>
        <p>© 2025 PedigreePro. All rights reserved.</p>
        <p style="margin-top: 20px; font-size: 14px; color: var(--muted);">
          Built with Electron and modern web technologies.
        </p>
      </div>
    `, [
      { text: 'Close', action: 'close', primary: true }
    ]);
  }

  async quitApplication() {
    if (this.isElectron && window.electronAPI.quit) {
      await window.electronAPI.quit();
    } else {
      window.close();
    }
  }

  createModal(title, content, buttons = []) {
    const modalContainer = document.getElementById('modal-container');
    modalContainer.style.display = 'block';
    
    modalContainer.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">${title}</h3>
          <button class="modal-close" id="modal-close">×</button>
        </div>
        <div class="modal-body">
          ${content}
        </div>
        <div class="modal-footer">
          ${buttons.map(btn => `
            <button class="btn ${btn.primary ? 'primary' : ''}" id="${btn.action}">
              ${btn.text}
            </button>
          `).join('')}
        </div>
      </div>
    `;

    // Add event listeners
    modalContainer.querySelector('#modal-close').addEventListener('click', () => this.closeModal());
    modalContainer.querySelector('.modal-backdrop').addEventListener('click', () => this.closeModal());
    
    buttons.forEach(btn => {
      if (btn.action === 'close') {
        modalContainer.querySelector('#' + btn.action).addEventListener('click', () => this.closeModal());
      }
    });

    return modalContainer.querySelector('.modal');
  }

  closeModal() {
    const modalContainer = document.getElementById('modal-container');
    modalContainer.style.display = 'none';
    modalContainer.innerHTML = '';
  }

  showSuccess(message) {
    this.showNotification(message, 'success');
  }

  showError(message) {
    this.showNotification(message, 'error');
  }

  showNotification(message, type = 'info') {
    console.log('📢 showNotification called:', { message, type });
    
    // Create a simple notification
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
      position: fixed;
      top: 70px;
      right: 20px;
      background: ${type === 'error' ? '#dc2626' : type === 'success' ? '#059669' : '#3b82f6'};
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      z-index: 2000;
      max-width: 300px;
      animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;

    console.log('📢 Appending notification to body:', notification);
    document.body.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      console.log('📢 Starting notification fadeout...');
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => {
        if (notification.parentNode) {
          console.log('📢 Removing notification from DOM');
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 5000);

    // Add CSS for animations if not already added
    if (!document.getElementById('notification-styles')) {
      const style = document.createElement('style');
      style.id = 'notification-styles';
      style.textContent = `
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }
  }

  /**
   * Open member editor in a new tab
   */
  openMemberEditorTab(member) {
    const tabId = `member-editor-${member.id}`;
    const tabTitle = `Edit: ${member.first_name || 'Unknown'} ${member.last_name || ''}`;

    // Check if tab manager exists (Family Center context)
    if (this.familyCenterTabManager) {
      this.familyCenterTabManager.openTab({
        id: tabId,
        title: tabTitle,
        isClosable: true, // Fix: Ensure member editor tabs are closable
        metadata: { type: 'member-editor', memberId: member.id }, // Add metadata for restoration
        render: (panelEl) => {
          panelEl.innerHTML = this.renderMemberEditorForm(member);
          this.setupMemberEditorHandlers(member, panelEl);
        }
      });
    } else {
      // Fallback: If no tab manager available, fall back to right panel
      console.warn('No tab manager available, falling back to right panel');
      this.showMemberEditor(member);
    }
  }

  /**
   * Show comprehensive member editor in right panel
   */
  showMemberEditor(member) {
    const rightPanel = document.getElementById('right-panel');
    const panelTitle = document.getElementById('panel-title');
    const panelSubtitle = document.getElementById('panel-subtitle');
    const panelContent = document.getElementById('panel-content');

    // Update panel header
    panelTitle.textContent = 'Member Editor';
    panelSubtitle.textContent = `${member.first_name} ${member.last_name || ''}`;

    // Create comprehensive member editor form
    panelContent.innerHTML = this.renderMemberEditorForm(member);

    // Setup form handlers
    this.setupMemberEditorHandlers(member);
  }

  /**
   * Render comprehensive member editor form
   */
  renderMemberEditorForm(member) {
    console.log('🔍 renderMemberEditorForm - member data:', member);
    console.log('🔍 renderMemberEditorForm - is_proband value:', member.is_proband, typeof member.is_proband);
    console.log('🔍 renderMemberEditorForm - proband check result:', (member.is_proband === 1 || member.is_proband === true));
    
    return `
      <div class="member-editor-container">
        <form id="member-editor-form" class="member-editor-form">
          
          <!-- Basic Information Section -->
          <div class="form-section">
            <h3 class="section-title">
              <i class="fa fa-user"></i>
              Basic Information
            </h3>
            <div class="form-grid">
              <div class="form-group">
                <label for="first_name">First Name *</label>
                <input type="text" id="first_name" name="first_name" value="${this.escapeHtml(member.first_name || '')}" required>
              </div>
              <div class="form-group">
                <label for="last_name">Last Name</label>
                <input type="text" id="last_name" name="last_name" value="${this.escapeHtml(member.last_name || '')}">
              </div>
              <div class="form-group">
                <label for="gender">Gender</label>
                <select id="gender" name="gender">
                  <option value="">Select Gender</option>
                  <option value="male" ${member.gender === 'male' ? 'selected' : ''}>Male</option>
                  <option value="female" ${member.gender === 'female' ? 'selected' : ''}>Female</option>
                  <option value="other" ${member.gender === 'other' ? 'selected' : ''}>Other</option>
                </select>
              </div>
              <div class="form-group">
                <label for="birth_date">Birth Date</label>
                <input type="date" id="birth_date" name="birth_date" value="${member.birth_date || ''}">
              </div>
              <div class="form-group">
                <label for="status">Status</label>
                <select id="status" name="status">
                  <option value="alive" ${member.status === 'alive' ? 'selected' : ''}>Alive</option>
                  <option value="deceased" ${member.status === 'deceased' ? 'selected' : ''}>Deceased</option>
                  <option value="unknown" ${member.status === 'unknown' ? 'selected' : ''}>Unknown</option>
                </select>
              </div>
              <div class="form-group">
                <label for="relationship">Relationship</label>
                <input type="text" id="relationship" name="relationship" value="${this.escapeHtml(member.relationship || '')}" placeholder="e.g., father, mother, child">
              </div>
              <div class="form-group">
                <label for="generation">Generation</label>
                <input type="text" id="generation" name="generation" value="${this.escapeHtml(member.generation || '')}" placeholder="e.g., I, II, III">
              </div>
              <div class="form-group">
                <label for="position">Position</label>
                <input type="number" id="position" name="position" value="${member.position || ''}" min="1" placeholder="Position in generation">
              </div>
            </div>
          </div>

          ${(() => {
            console.log('🔍 Contact section debug - member.is_proband:', member.is_proband, typeof member.is_proband);
            console.log('🔍 Contact section debug - check result:', (member.is_proband === 1 || member.is_proband === true));
            return (member.is_proband === 1 || member.is_proband === true);
          })() ? `
          <!-- Additional Information (Proband Only) -->
          <div class="form-section">
            <h3 class="section-title">
              <i class="fa fa-info-circle"></i>
              Additional Information (Proband Only)
            </h3>
            <div class="form-grid">
              <div class="form-group full-width">
                <p style="color: #666; font-style: italic;">
                  As the proband (index case), additional contact and medical information 
                  would typically be collected here. This section is displayed only for probands.
                </p>
              </div>
            </div>
          </div>
          ` : ''}

          <!-- Family Status -->
          <div class="form-section">
            <h3 class="section-title">
              <i class="fa fa-family"></i>
              Family Status
            </h3>
            <div class="form-grid">
              <div class="form-group">
                <label class="checkbox-label">
                  <input type="checkbox" id="is_proband" name="is_proband" ${(member.is_proband === 1 || member.is_proband === true) ? 'checked' : ''}>
                  <span>Is proband (index case)</span>
                </label>
              </div>
            </div>
          </div>

          <!-- Notes -->
          <div class="form-section">
            <h3 class="section-title">
              <i class="fa fa-notes-medical"></i>
              Clinical Notes
            </h3>
            <div class="form-group full-width">
              <label for="notes">Notes</label>
              <textarea id="notes" name="notes" rows="4" placeholder="Enter clinical notes, observations, or additional information...">${this.escapeHtml(member.notes || '')}</textarea>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" onclick="window.pedigreeApp.closeMemberEditor('${member.id}')">
              <i class="fa fa-times"></i> Cancel
            </button>
            <button type="submit" class="btn btn-primary">
              <i class="fa fa-save"></i> Save Changes
            </button>
            <button type="button" class="btn btn-info" onclick="window.pedigreeApp.showMedicalConditions(${member.id})">
              <i class="fa fa-stethoscope"></i> Medical Conditions
            </button>
          </div>

        </form>
      </div>
    `;
  }

  /**
   * Setup member editor form handlers
   */
  setupMemberEditorHandlers(member, containerEl = document) {
    console.log('🔧 Setting up member editor handlers for member:', member.id);
    const form = containerEl.querySelector('#member-editor-form');
    console.log('🔧 Found form element:', form);
    
    if (!form) {
      console.error('❌ Form #member-editor-form not found!');
      return;
    }

    // Note: Removed is_alive, death_date, and death_date_estimated references
    // since these fields were removed from the form to match database schema

    // Handle form submission
    console.log('🔧 Adding form submit listener...');
    form.addEventListener('submit', async (e) => {
      console.log('🔄 Form submit event triggered!');
      e.preventDefault();
      console.log('🔄 Form submitted, calling saveMemberData...');
      await this.saveMemberData(member.id, form);
    });
    console.log('✅ Form submit listener added successfully');
  }

  /**
   * Save member data to database
   */
  async saveMemberData(memberId, form) {
    console.log('💾 saveMemberData called with memberId:', memberId);
    try {
      const formData = new FormData(form);
      console.log('📋 FormData entries:');
      for (let [key, value] of formData.entries()) {
        console.log(`  ${key}: ${value}`);
      }
      const memberData = {
        id: memberId,
        first_name: formData.get('first_name'),
        last_name: formData.get('last_name'),
        birth_date: formData.get('birth_date'),
        gender: formData.get('gender'),
        status: formData.get('status') || 'alive',
        relationship: formData.get('relationship'),
        generation: formData.get('generation'),
        position: formData.get('position') ? parseInt(formData.get('position')) : null,
        is_proband: formData.has('is_proband') ? 1 : 0, // Convert to integer for SQLite
        notes: formData.get('notes')
      };

      console.log('📤 Sending memberData:', memberData);

      // Save to database
      const result = await window.electronAPI.invoke('family-center-update-family-member', memberData);
      console.log('✅ Backend response:', result);
      
      if (result) {
        this.showNotification('Member updated successfully!', 'success');
        
        // Update tab title if in tab context
        if (this.familyCenterTabManager) {
          const tabId = `member-editor-${memberId}`;
          const newTitle = `Edit: ${memberData.first_name || 'Unknown'} ${memberData.last_name || ''}`;
          this.familyCenterTabManager.updateTabTitle(tabId, newTitle);
        }
        
        // Refresh the family center view if needed
        this.refreshFamilyView();
      } else {
        throw new Error('Failed to save member data');
      }
    } catch (error) {
      console.error('Error saving member data:', error);
      this.showNotification('Failed to save member data', 'error');
    }
  }

  /**
   * Close member editor (either tab or right panel)
   */
  closeMemberEditor(memberId = null) {
    if (memberId && this.familyCenterTabManager) {
      // Close the specific tab
      const tabId = `member-editor-${memberId}`;
      this.familyCenterTabManager.closeTab(tabId);
    } else {
      // Fall back to closing right panel editor
      const panelTitle = document.getElementById('panel-title');
      const panelSubtitle = document.getElementById('panel-subtitle');
      const panelContent = document.getElementById('panel-content');

      if (panelTitle && panelSubtitle && panelContent) {
        panelTitle.textContent = 'Quick Actions';
        panelSubtitle.textContent = 'Family Center';
        panelContent.innerHTML = '<div class="loading">Select a family member to view details...</div>';
      }
    }
  }

  /**
   * Show medical conditions for a member
   */
  showMedicalConditions(memberId) {
    // TODO: Implement medical conditions editor
    this.showNotification('Medical conditions editor coming soon!', 'info');
  }

  /**
   * Refresh family view after updates
   */
  refreshFamilyView() {
    // TODO: Implement family view refresh
    console.log('Refreshing family view...');
  }

  /**
   * Format gender for display
   */
  formatGender(gender) {
    const genderMap = {
      'male': 'Male',
      'female': 'Female',
      'other': 'Other'
    };
    return genderMap[gender] || 'Unknown';
  }

  /**
   * Get pedigree import data by pedigree ID
   */
  async getPedigreeImportData(pedigreeId) {
    if (!pedigreeId) return null;
    
    try {
      // Get the import session for this pedigree
      const session = await window.electronAPI.pedigreeImport.getSessionById(pedigreeId);
      if (!session) return null;
      
      // Get persons from the import data
      const persons = await window.electronAPI.pedigreeImport.getPersons(session.id);
      const partnerships = await window.electronAPI.pedigreeImport.getPartnerships(session.id);
      const disorders = await window.electronAPI.pedigreeImport.getDisorders(session.id);
      const genes = await window.electronAPI.pedigreeImport.getGenes(session.id);
      
      return {
        session,
        persons,
        partnerships, 
        disorders,
        genes
      };
    } catch (error) {
      console.error('Error getting pedigree import data:', error);
      return null;
    }
  }

  /**
   * Generate comprehensive member rows combining family center and pedigree import data
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
          <td colspan="7" class="text-center text-muted">
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
      
      // Build member name with proband indicator
      const probandIndicator = (member.is_proband === 1 || member.is_proband === true) ? ' <span class="badge badge-success badge-sm">Proband</span>' : '';
      const memberName = `
        <div style="font-size: 0.85rem;">
          <strong>${this.escapeHtml(member.first_name || '')} ${this.escapeHtml(member.last_name || '')}</strong>${probandIndicator}
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
          <td style="padding: 8px;">
            <div class="member-actions">
              <button class="btn btn-sm btn-outline-primary" onclick="window.pedigreeApp.viewMemberDetails(${member.id})" title="View Details" style="font-size: 0.75rem; padding: 2px 6px;">
                <i class="fa fa-eye"></i>
              </button>
              <button class="btn btn-sm btn-outline-secondary" onclick="window.pedigreeApp.editMember(${member.id})" title="Edit" style="font-size: 0.75rem; padding: 2px 6px;">
                <i class="fa fa-edit"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  /**
   * Get relationships for a person from pedigree data
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
   * Analyze family structure for the given family/pedigree
   */
  async analyzeFamilyStructure(familyId) {
    try {
      const analyzeBtn = document.querySelector('.analyze-family-btn');
      const exportBtn = document.querySelector('.export-analysis-btn');
      const contentDiv = document.getElementById(`analysis-content-${familyId}`);
      
      // Check for cached analysis first
      if (contentDiv) {
        contentDiv.innerHTML = `<div class="analysis-loading"><div class="loading-spinner"></div><p>${this.t('familyAnalysis.checkingCache', 'Checking for cached analysis...')}</p></div>`;
      }
      
      const cachedResult = await window.electronAPI.invoke('family-analysis-get-latest', familyId);
      
      if (cachedResult.success && cachedResult.analysis) {
        console.log('✅ Using cached analysis from:', cachedResult.analysis.createdAt);
        
        // Generate report from cached data
        const analysisReport = this.generateAnalysisReport(cachedResult.analysis.data, [], null);
        
        if (contentDiv) {
          contentDiv.innerHTML = analysisReport;
        }
        
        if (exportBtn) {
          exportBtn.style.display = 'inline-block';
        }
        
        // Show cache info
        this.showSuccess(this.t('familyAnalysis.cacheLoaded', 'Loaded cached analysis from ') + new Date(cachedResult.analysis.createdAt).toLocaleString());
        return;
      }
      
      // No cache found, generate new analysis
      if (analyzeBtn) {
        analyzeBtn.innerHTML = `<i class="fa fa-spinner fa-spin"></i> ${this.t('familyAnalysis.analyzing', 'Analyzing...')}`;
        analyzeBtn.disabled = true;
      }

      if (contentDiv) {
        contentDiv.innerHTML = `<div class="analysis-loading"><div class="loading-spinner"></div><p>${this.t('familyAnalysis.generatingReport', 'Generating comprehensive family analysis...')}</p></div>`;
      }

      // Get all family members for this family/pedigree
      const familyMembers = await window.electronAPI.invoke('family-center-get-family-members', familyId);
      
      // Get pedigree import data if available
      const pedigreeData = await this.getPedigreeImportData(familyId);
      
      // Get analysis queries from database
      const analysisQueries = {
        basicInfo: await window.electronAPI.invoke('family-analysis-basic-info', familyId),
        generationalBreakdown: await window.electronAPI.invoke('family-analysis-generational-breakdown', familyId),
        relationshipMapping: await window.electronAPI.invoke('family-analysis-relationship-mapping', familyId),
        partnershipPatterns: await window.electronAPI.invoke('family-analysis-partnership-patterns', familyId),
        siblingGroups: await window.electronAPI.invoke('family-analysis-sibling-groups', familyId),
        halfSiblings: await window.electronAPI.invoke('family-analysis-half-siblings', familyId),
        stepRelationships: await window.electronAPI.invoke('family-analysis-step-relationships', familyId),
        adoptedMembers: await window.electronAPI.invoke('family-analysis-adopted-members', familyId),
        deceasedMembers: await window.electronAPI.invoke('family-analysis-deceased-members', familyId),
        ageDistribution: await window.electronAPI.invoke('family-analysis-age-distribution', familyId),
        geographicDistribution: await window.electronAPI.invoke('family-analysis-geographic-distribution', familyId),
        probandContext: await window.electronAPI.invoke('family-analysis-proband-context', familyId),
        familyStructure: await window.electronAPI.invoke('family-analysis-family-structure', familyId),
        complexRelationships: await window.electronAPI.invoke('family-analysis-complex-relationships', familyId),
        medicalHistory: await window.electronAPI.invoke('family-analysis-medical-history', familyId),
        clinicalSummary: await window.electronAPI.invoke('family-analysis-clinical-summary', familyId),
        geneticMarkers: await window.electronAPI.invoke('family-analysis-genetic-markers', familyId),
        hpoTerms: await window.electronAPI.invoke('family-analysis-hpo-terms', familyId),
        medicalProfile: await window.electronAPI.invoke('family-analysis-medical-profile', familyId)
      };

      // Generate comprehensive analysis report
      const analysisReport = this.generateAnalysisReport(analysisQueries, familyMembers, pedigreeData);
      
      if (contentDiv) {
        contentDiv.innerHTML = analysisReport;
      }

      // Save analysis to history
      const analysisStats = this.extractAnalysisStats(analysisQueries, familyMembers);
      const saveResult = await window.electronAPI.invoke('family-analysis-save-history', {
        familyId: familyId,
        pedigreeId: familyId, // Assuming familyId maps to pedigreeId
        analysisResults: analysisQueries,
        summary: this.generateAnalysisSummary(analysisStats),
        totalMembers: analysisStats.totalMembers,
        totalGenerations: analysisStats.totalGenerations,
        totalPartnerships: analysisStats.totalPartnerships,
        probandCount: analysisStats.probandCount,
        medicalConditionsCount: analysisStats.medicalConditionsCount
      });
      
      if (saveResult.success) {
        console.log('✅ Analysis saved to history with ID:', saveResult.analysisId);
      }

      if (analyzeBtn) {
        analyzeBtn.innerHTML = `<i class="fa fa-refresh"></i> ${this.t('familyAnalysis.reanalyzeButton', 'Re-analyze Family')}`;
        analyzeBtn.disabled = false;
      }

      if (exportBtn) {
        exportBtn.style.display = 'inline-block';
      }

      this.showSuccess(this.t('familyAnalysis.analysisComplete', 'Family analysis completed successfully!'));
      
    } catch (error) {
      console.error('Error analyzing family structure:', error);
      this.showError(this.t('familyAnalysis.analysisError', 'Error analyzing family structure: ') + error.message);
      
      const analyzeBtn = document.querySelector('.analyze-family-btn');
      if (analyzeBtn) {
        analyzeBtn.innerHTML = `<i class="fa fa-refresh"></i> ${this.t('familyAnalysis.analyzeButton', 'Analyze Family Structure')}`;
        analyzeBtn.disabled = false;
      }
    }
  }

  /**
   * Generate comprehensive analysis report HTML
   */
  generateAnalysisReport(queries, familyMembers, pedigreeData) {
    let reportHtml = '<div class="analysis-report">';
    
    // Header with summary stats
    const totalMembers = familyMembers?.length || 0;
    const probandCount = familyMembers?.filter(m => m.is_proband === 1 || m.is_proband === true).length || 0;
    const generationCount = queries.generationalBreakdown?.length || 0;
    
    reportHtml += `
      <div class="analysis-summary">
        <div class="summary-cards">
          <div class="summary-card">
            <div class="card-icon"><i class="fa fa-users"></i></div>
            <div class="card-content">
              <div class="card-number">${totalMembers}</div>
              <div class="card-label">${this.t('familyAnalysis.totalMembers', 'Total Members')}</div>
            </div>
          </div>
          <div class="summary-card">
            <div class="card-icon"><i class="fa fa-user-circle"></i></div>
            <div class="card-content">
              <div class="card-number">${probandCount}</div>
              <div class="card-label">${this.t('familyAnalysis.probands', 'Proband(s)')}</div>
            </div>
          </div>
          <div class="summary-card">
            <div class="card-icon"><i class="fa fa-sitemap"></i></div>
            <div class="card-content">
              <div class="card-number">${generationCount}</div>
              <div class="card-label">${this.t('familyAnalysis.generations', 'Generations')}</div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Basic Family Information
    if (queries.basicInfo && queries.basicInfo.length > 0) {
      reportHtml += `
        <div class="analysis-section">
          <h4><i class="fa fa-info-circle"></i> ${this.t('familyAnalysis.basicInfo', 'Basic Family Information')}</h4>
          <div class="info-grid">
            ${queries.basicInfo.map(info => `
              <div class="info-item">
                <strong>${info.label}:</strong> ${info.value}
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // Generational Breakdown
    if (queries.generationalBreakdown && queries.generationalBreakdown.length > 0) {
      reportHtml += `
        <div class="analysis-section">
          <h4><i class="fa fa-layer-group"></i> ${this.t('familyAnalysis.generationalStructure', 'Generational Structure')}</h4>
          <div class="generation-breakdown">
            ${queries.generationalBreakdown.map(gen => `
              <div class="generation-item">
                <div class="generation-header">
                  <span class="generation-label">${this.t('familyAnalysis.generation', 'Generation')} ${gen.generation || this.t('common.unknown', 'Unknown')}</span>
                  <span class="member-count">${gen.member_count || 0} ${this.t('familyAnalysis.members', 'members')}</span>
                </div>
                ${gen.members ? `
                  <div class="generation-members">
                    ${gen.members.split(',').map(member => `<span class="member-badge">${member.trim()}</span>`).join('')}
                  </div>
                ` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // Relationship Mapping
    if (queries.relationshipMapping && queries.relationshipMapping.length > 0) {
      reportHtml += `
        <div class="analysis-section">
          <h4><i class="fa fa-project-diagram"></i> Relationship Mapping</h4>
          <div class="relationship-grid">
            ${queries.relationshipMapping.map(rel => `
              <div class="relationship-item">
                <div class="relationship-type">${rel.relationship_type || 'Unknown'}</div>
                <div class="relationship-details">${rel.details || ''}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // Partnership Patterns
    if (queries.partnershipPatterns && queries.partnershipPatterns.length > 0) {
      reportHtml += `
        <div class="analysis-section">
          <h4><i class="fa fa-heart"></i> Partnership Patterns</h4>
          <div class="partnership-list">
            ${queries.partnershipPatterns.map(partnership => `
              <div class="partnership-item">
                <div class="partnership-info">
                  <strong>${partnership.partnership_description || 'Partnership'}</strong>
                  ${partnership.children_count ? `<span class="children-count">${partnership.children_count} children</span>` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // Clinical Summary
    if (queries.clinicalSummary && queries.clinicalSummary.length > 0) {
      reportHtml += `
        <div class="analysis-section">
          <h4><i class="fa fa-stethoscope"></i> Clinical Summary</h4>
          <div class="clinical-summary">
            ${queries.clinicalSummary.map(clinical => `
              <div class="clinical-item">
                <div class="clinical-category">${clinical.category || 'General'}</div>
                <div class="clinical-details">${clinical.summary || clinical.details || ''}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // Genetic Markers
    if (queries.geneticMarkers && queries.geneticMarkers.length > 0) {
      reportHtml += `
        <div class="analysis-section">
          <h4><i class="fa fa-dna"></i> ${this.t('familyAnalysis.geneticMarkers', 'Genetic Markers')}</h4>
          <div class="genetic-markers">
            ${queries.geneticMarkers.map(marker => `
              <div class="genetic-marker-item">
                <div class="gene-symbol">${marker.gene_symbol}</div>
                <div class="gene-details">
                  <span class="gene-role">${marker.gene_role || this.t('familyAnalysis.unknownRole', 'Unknown role')}</span>
                  <span class="person-count">${marker.person_count} ${marker.person_count !== 1 ? this.t('familyAnalysis.individuals', 'individuals') : this.t('familyAnalysis.individual', 'individual')}</span>
                </div>
                <div class="affected-persons">${marker.affected_persons}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // HPO Terms (Phenotype Analysis)
    if (queries.hpoTerms && queries.hpoTerms.length > 0) {
      reportHtml += `
        <div class="analysis-section">
          <h4><i class="fa fa-search-plus"></i> ${this.t('familyAnalysis.phenotypeAnalysis', 'Phenotype Analysis (HPO Terms)')}</h4>
          <div class="hpo-terms">
            ${queries.hpoTerms.map(hpo => `
              <div class="hpo-term-item">
                <div class="hpo-term">${hpo.hpo_term}</div>
                <div class="hpo-details">
                  <span class="frequency-category">${this.t('familyAnalysis.' + hpo.frequency_category.toLowerCase().replace(/\s+/g, ''), hpo.frequency_category)}</span>
                  <span class="person-count">${hpo.person_count} ${hpo.person_count !== 1 ? this.t('familyAnalysis.individuals', 'individuals') : this.t('familyAnalysis.individual', 'individual')}</span>
                </div>
                <div class="affected-persons">${hpo.affected_persons}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // Comprehensive Medical Profile
    if (queries.medicalProfile && queries.medicalProfile.length > 0) {
      reportHtml += `
        <div class="analysis-section">
          <h4><i class="fa fa-user-md"></i> ${this.t('familyAnalysis.individualProfiles', 'Individual Medical Profiles')}</h4>
          <div class="medical-profiles">
            <div class="table-responsive">
              <table class="table table-sm medical-profile-table">
                <thead>
                  <tr>
                    <th>${this.t('familyAnalysis.medicalProfileTable.name', 'Name')}</th>
                    <th>${this.t('familyAnalysis.medicalProfileTable.generation', 'Generation')}</th>
                    <th>${this.t('familyAnalysis.medicalProfileTable.gender', 'Gender')}</th>
                    <th>${this.t('familyAnalysis.medicalProfileTable.status', 'Status')}</th>
                    <th>${this.t('familyAnalysis.medicalProfileTable.disorders', 'Disorders')}</th>
                    <th>${this.t('familyAnalysis.medicalProfileTable.geneticMarkers', 'Genetic Markers')}</th>
                    <th>${this.t('familyAnalysis.medicalProfileTable.hpoTerms', 'HPO Terms')}</th>
                  </tr>
                </thead>
                <tbody>
                  ${queries.medicalProfile.map(profile => `
                    <tr>
                      <td>${profile.person_name}</td>
                      <td>${profile.generation || this.t('familyAnalysis.medicalProfileTable.notAvailable', 'N/A')}</td>
                      <td>${profile.gender || this.t('familyAnalysis.medicalProfileTable.notAvailable', 'N/A')}</td>
                      <td>${profile.carrier_status || this.t('familyAnalysis.medicalProfileTable.unknown', 'Unknown')}</td>
                      <td><small>${profile.disorders !== 'None' ? profile.disorders : '<em>' + this.t('familyAnalysis.medicalProfileTable.noneRecorded', 'None recorded') + '</em>'}</small></td>
                      <td><small>${profile.genetic_markers !== 'None' ? profile.genetic_markers : '<em>' + this.t('familyAnalysis.medicalProfileTable.noneRecorded', 'None recorded') + '</em>'}</small></td>
                      <td><small>${profile.hpo_terms !== 'None' ? profile.hpo_terms : '<em>' + this.t('familyAnalysis.medicalProfileTable.noneRecorded', 'None recorded') + '</em>'}</small></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    }

    // Professional Narrative
    reportHtml += `
      <div class="analysis-section">
        <h4><i class="fa fa-file-medical-alt"></i> Professional Family Narrative</h4>
        <div class="narrative-content">
          <p>This ${totalMembers}-member family spans ${generationCount} generation${generationCount !== 1 ? 's' : ''} with ${probandCount} identified proband${probandCount !== 1 ? 's' : ''}. 
          The family structure demonstrates ${queries.partnershipPatterns?.length || 0} documented partnership${queries.partnershipPatterns?.length !== 1 ? 's' : ''} 
          and includes ${queries.siblingGroups?.length || 0} sibling group${queries.siblingGroups?.length !== 1 ? 's' : ''}.</p>
          
          ${queries.complexRelationships && queries.complexRelationships.length > 0 ? `
            <p><strong>Complex Relationships:</strong> The family includes complex relationship patterns including 
            ${queries.complexRelationships.map(rel => rel.relationship_type).join(', ')}.</p>
          ` : ''}
          
          ${queries.medicalHistory && queries.medicalHistory.length > 0 ? `
            <p><strong>Medical Considerations:</strong> Family medical history indicates 
            ${queries.medicalHistory.length} documented medical condition${queries.medicalHistory.length !== 1 ? 's' : ''} 
            across multiple generations.</p>
          ` : ''}
          
          <p><strong>Clinical Recommendation:</strong> This comprehensive family analysis provides detailed relationship 
          mapping and generational structure suitable for genetic counseling and clinical documentation purposes.</p>
        </div>
      </div>
    `;

    reportHtml += '</div>';
    return reportHtml;
  }

  /**
   * Export family analysis report
   */
  async exportFamilyAnalysis(familyId) {
    try {
      const contentDiv = document.getElementById(`analysis-content-${familyId}`);
      if (!contentDiv || !contentDiv.querySelector('.analysis-report')) {
        this.showError(this.t('familyAnalysis.noReportError', 'No analysis report available to export. Please run the analysis first.'));
        return;
      }

      const analysisHtml = contentDiv.innerHTML;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      
      // Create export modal
      this.createModal(this.t('familyAnalysis.exportTitle', 'Export Family Analysis'), `
        <div class="form-group">
          <label for="export-format">${this.t('familyAnalysis.exportFormat', 'Export Format')}:</label>
          <select id="export-format" class="form-control">
            <option value="pdf">${this.t('familyAnalysis.pdfReport', 'PDF Report')}</option>
            <option value="html">${this.t('familyAnalysis.htmlDocument', 'HTML Document')}</option>
          </select>
        </div>
        <div class="form-group">
          <label for="export-filename">${this.t('familyAnalysis.filename', 'Filename')}:</label>
          <input type="text" id="export-filename" class="form-control" value="family-analysis-${timestamp}" />
        </div>
      `, [
        { text: this.t('common.cancel', 'Cancel'), action: 'close' },
        { text: this.t('common.export', 'Export'), action: 'export-analysis', primary: true }
      ]);

      // Handle export
      document.getElementById('export-analysis').addEventListener('click', async () => {
        const format = document.getElementById('export-format').value;
        const filename = document.getElementById('export-filename').value;
        
        this.closeModal();
        
        if (this.isElectron) {
          try {
            const result = await window.electronAPI.invoke('export-family-analysis', {
              familyId,
              format,
              filename,
              content: analysisHtml
            });
            
            if (result.success) {
              this.showSuccess(this.t('familyAnalysis.exportSuccess', 'Analysis exported successfully as ') + `${filename}.${format}`);
            } else {
              this.showError(this.t('familyAnalysis.exportFailed', 'Export failed: ') + result.error);
            }
          } catch (error) {
            this.showError(this.t('familyAnalysis.exportError', 'Error exporting analysis: ') + error.message);
          }
        }
      });

    } catch (error) {
      console.error('Error exporting family analysis:', error);
      this.showError(this.t('familyAnalysis.exportError', 'Error exporting family analysis: ') + error.message);
    }
  }

  /**
   * Extract key statistics from analysis results
   */
  extractAnalysisStats(analysisQueries, familyMembers) {
    const totalMembers = familyMembers?.length || 0;
    const totalGenerations = analysisQueries.generationalBreakdown?.length || 0;
    const totalPartnerships = analysisQueries.partnershipPatterns?.length || 0;
    const probandCount = analysisQueries.basicInfo?.find(item => item.label.includes('Proband'))?.value || 0;
    const medicalConditionsCount = analysisQueries.medicalHistory?.length || 0;
    
    return {
      totalMembers,
      totalGenerations,
      totalPartnerships,
      probandCount,
      medicalConditionsCount
    };
  }

  /**
   * Generate a brief text summary of the analysis
   */
  generateAnalysisSummary(stats) {
    return `Family analysis: ${stats.totalMembers} members across ${stats.totalGenerations} generations, ${stats.totalPartnerships} partnerships documented. ${stats.probandCount} proband(s) identified. ${stats.medicalConditionsCount} medical conditions recorded.`;
  }

  /**
   * Show analysis history for a family
   */
  async showAnalysisHistory(familyId) {
    try {
      const result = await window.electronAPI.invoke('family-analysis-get-history', familyId, 20);
      
      if (result.success && result.history.length > 0) {
        let historyHtml = `
          <div class="analysis-history">
            <h4><i class="fa fa-history"></i> ${this.t('familyAnalysis.analysisHistory', 'Analysis History')}</h4>
            <div class="history-list">
        `;
        
        result.history.forEach((entry, index) => {
          const createdDate = new Date(entry.createdAt).toLocaleString();
          const isActive = entry.isActive ? '<span class="badge badge-success">Active</span>' : '<span class="badge badge-secondary">Archived</span>';
          
          historyHtml += `
            <div class="history-item ${entry.isActive ? 'active' : ''}">
              <div class="history-header">
                <div class="history-date">${createdDate} ${isActive}</div>
                <div class="history-actions">
                  <button class="btn btn-sm btn-outline-primary" onclick="window.pedigreeApp.loadAnalysisFromHistory(${familyId}, ${entry.id})">
                    <i class="fa fa-eye"></i> View
                  </button>
                  ${!entry.isActive ? `<button class="btn btn-sm btn-outline-danger" onclick="window.pedigreeApp.deleteAnalysisHistory(${entry.id})"><i class="fa fa-trash"></i></button>` : ''}
                </div>
              </div>
              <div class="history-summary">${entry.summary}</div>
              <div class="history-stats">
                <small>${entry.stats.totalMembers} members • ${entry.stats.totalGenerations} generations • ${entry.stats.totalPartnerships} partnerships</small>
              </div>
            </div>
          `;
        });
        
        historyHtml += '</div></div>';
        
        // Show in a modal or side panel
        this.createModal(this.t('familyAnalysis.historyTitle', 'Family Analysis History'), historyHtml, [
          { text: this.t('common.close', 'Close'), action: 'close' }
        ]);
        
      } else {
        this.showInfo(this.t('familyAnalysis.noHistory', 'No analysis history found for this family.'));
      }
      
    } catch (error) {
      console.error('Error showing analysis history:', error);
      this.showError(this.t('familyAnalysis.historyError', 'Error loading analysis history: ') + error.message);
    }
  }

  /**
   * Load a specific analysis from history
   */
  async loadAnalysisFromHistory(familyId, analysisId) {
    try {
      // This would require a new IPC handler to get specific analysis by ID
      // For now, we'll just close the modal and suggest re-running analysis
      this.closeModal();
      this.showInfo(this.t('familyAnalysis.loadFromHistory', 'Loading historical analysis... (Feature coming soon)'));
    } catch (error) {
      console.error('Error loading analysis from history:', error);
    }
  }

  /**
   * Delete an analysis from history
   */
  async deleteAnalysisHistory(analysisId) {
    try {
      const confirmed = confirm(this.t('familyAnalysis.confirmDeleteHistory', 'Are you sure you want to delete this analysis from history?'));
      
      if (confirmed) {
        const result = await window.electronAPI.invoke('family-analysis-delete-history', analysisId);
        
        if (result.success) {
          this.showSuccess(this.t('familyAnalysis.historyDeleted', 'Analysis deleted from history'));
          // Refresh the history view
          this.closeModal();
        } else {
          this.showError(result.message || this.t('familyAnalysis.deleteError', 'Failed to delete analysis'));
        }
      }
    } catch (error) {
      console.error('Error deleting analysis history:', error);
      this.showError(this.t('familyAnalysis.deleteError', 'Error deleting analysis: ') + error.message);
    }
  }

  /**
   * Invalidate cached analysis for a family
   */
  async invalidateAnalysisCache(familyId) {
    try {
      const result = await window.electronAPI.invoke('family-analysis-invalidate-cache', familyId);
      
      if (result.success) {
        this.showSuccess(this.t('familyAnalysis.cacheInvalidated', 'Analysis cache invalidated. Next analysis will be fresh.'));
      } else {
        this.showError(result.message || this.t('familyAnalysis.invalidateError', 'Failed to invalidate cache'));
      }
    } catch (error) {
      console.error('Error invalidating analysis cache:', error);
      this.showError(this.t('familyAnalysis.invalidateError', 'Error invalidating cache: ') + error.message);
    }
  }

  /**
   * Auto-load the latest analysis when opening a family tab
   */
  async autoLoadLatestAnalysis(familyId) {
    try {
      console.log('🔍 Auto-loading latest analysis for family:', familyId);
      
      const contentDiv = document.getElementById(`analysis-content-${familyId}`);
      if (!contentDiv) {
        console.log('❌ Analysis content div not found');
        return;
      }

      // Check for cached analysis
      const cachedResult = await window.electronAPI.invoke('family-analysis-get-latest', familyId);
      
      if (cachedResult.success && cachedResult.analysis) {
        console.log('✅ Found cached analysis from:', cachedResult.analysis.createdAt);
        
        // Get family members to calculate correct counts
        const familyMembersResult = await window.electronAPI.invoke('get-family-members-by-pedigree', familyId);
        const familyMembers = familyMembersResult.success ? familyMembersResult.members : [];
        
        console.log('📊 Family members for counts:', familyMembers.length);
        
        // Generate report from cached data with proper member counts
        const analysisReport = this.generateAnalysisReport(cachedResult.analysis.data, familyMembers, null);
        
        contentDiv.innerHTML = analysisReport;
        
        // Show export button
        const exportBtn = document.querySelector('.export-analysis-btn');
        if (exportBtn) {
          exportBtn.style.display = 'inline-block';
        }
        
        console.log('✅ Auto-loaded cached analysis with correct member counts');
      } else {
        console.log('ℹ️ No cached analysis found, showing placeholder');
        contentDiv.innerHTML = this.getAnalysisPlaceholder();
      }
      
    } catch (error) {
      console.error('Error auto-loading latest analysis:', error);
      const contentDiv = document.getElementById(`analysis-content-${familyId}`);
      if (contentDiv) {
        contentDiv.innerHTML = this.getAnalysisPlaceholder();
      }
    }
  }

  /**
   * Get the analysis placeholder HTML
   */
  getAnalysisPlaceholder() {
    return `
      <div class="analysis-placeholder">
        <div class="placeholder-icon"><i class="fa fa-chart-line"></i></div>
        <div class="placeholder-text">
          <p>${this.t('familyAnalysis.instructions', 'Click "Analyze Family Structure" to generate comprehensive family analysis including:')}</p>
          <ul>
            <li>${this.t('familyAnalysis.feature1', 'Generational breakdown with relationship mapping')}</li>
            <li>${this.t('familyAnalysis.feature2', 'Partnership patterns and complex relationships')}</li>
            <li>${this.t('familyAnalysis.feature3', 'Half-sibling and step-relationship detection')}</li>
            <li>${this.t('familyAnalysis.feature4', 'Proband-centric family organization')}</li>
            <li>${this.t('familyAnalysis.feature5', 'Professional family narrative summary')}</li>
            <li>${this.t('familyAnalysis.feature6', 'Export options for clinical reports')}</li>
          </ul>
          <div class="cache-info">
            <p><small><i class="fa fa-info-circle"></i> ${this.t('familyAnalysis.cacheInfo', 'Analysis results are cached for 30 days to improve performance. Use the refresh button to force a new analysis.')}</small></p>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Load family PDFs and populate the selector
   */
  async loadFamilyPdfs(familyId) {
    try {
      console.log('🔍 Loading PDFs for family:', familyId);
      
      const pdfSelector = document.getElementById(`pdf-selector-${familyId}`);
      if (!pdfSelector) {
        console.log('❌ PDF selector not found for family:', familyId);
        return;
      }

      // Get family PDFs
      const result = await window.electronAPI.familyCenter.getFamilyPdfs(familyId);
      console.log('📊 PDF result:', result);
      
      if (result.success && result.pdfs && result.pdfs.length > 0) {
        console.log('✅ Found', result.pdfs.length, 'PDF(s)');
        
        // Clear existing options (except the first placeholder)
        pdfSelector.innerHTML = `<option value="">${this.t('familyPdfs.selectDocument', 'Select a document...')}</option>`;
        
        // Sort PDFs by creation date (newest first)
        const sortedPdfs = result.pdfs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        console.log('📄 Sorted PDFs:', sortedPdfs.map(p => ({ name: p.file_name, date: p.created_at })));
        
        // Add PDF options
        sortedPdfs.forEach((pdf, index) => {
          const option = document.createElement('option');
          option.value = pdf.file_path;
          option.textContent = `${pdf.file_name} (${new Date(pdf.created_at).toLocaleDateString()})`;
          if (index === 0) {
            option.textContent += ` - ${this.t('familyPdfs.latest', 'Latest')}`;
          }
          pdfSelector.appendChild(option);
        });
        
        // Auto-select and load the latest PDF
        if (sortedPdfs.length > 0) {
          pdfSelector.value = sortedPdfs[0].file_path;
          await this.loadSelectedPdf(familyId, sortedPdfs[0].file_path);
        }
        
      } else {
        console.log('ℹ️ No PDFs found for family, result:', result);
        pdfSelector.innerHTML = `<option value="">${this.t('familyPdfs.noDocuments', 'No documents available')}</option>`;
        this.showPdfPlaceholder(familyId, 'no-documents');
      }
      
    } catch (error) {
      console.error('❌ Error loading family PDFs:', error);
      this.showPdfPlaceholder(familyId, 'error');
    }
  }

  /**
   * Load selected PDF in the viewer
   */
  async loadSelectedPdf(familyId, pdfPath) {
    try {
      const pdfViewer = document.getElementById(`pdf-viewer-container-${familyId}`);
      if (!pdfViewer) {
        console.log('❌ PDF viewer container not found for family:', familyId);
        return;
      }

      if (!pdfPath) {
        this.showPdfPlaceholder(familyId, 'select');
        return;
      }

      console.log('🔍 Loading PDF:', pdfPath);
      
      // Show loading state
      pdfViewer.innerHTML = `
        <div class="pdf-loading">
          <i class="fa fa-spinner fa-spin fa-2x text-primary"></i>
          <p class="text-muted">${this.t('familyPdfs.loading', 'Loading document...')}</p>
        </div>
      `;

      // Create PDF embed
      pdfViewer.innerHTML = `
        <div class="pdf-embed-container">
          <object data="file://${pdfPath}#toolbar=1&navpanes=0&scrollbar=1" type="application/pdf" width="100%" >
            <embed src="file://${pdfPath}#toolbar=1&navpanes=0&scrollbar=1" type="application/pdf" width="100%" >
              <div class="pdf-fallback">
                <p>${this.t('familyPdfs.cannotDisplay', 'Cannot display PDF in browser.')}</p>
                <button class="btn btn-primary" onclick="window.electronAPI.invoke('open-external', '${pdfPath}')">
                  <i class="fa fa-external-link"></i>
                  ${this.t('familyPdfs.openExternal', 'Open in External Viewer')}
                </button>
              </div>
            </embed>
          </object>
        </div>
      `;
      
    } catch (error) {
      console.error('Error loading PDF:', error);
      this.showPdfPlaceholder(familyId, 'error');
    }
  }

  /**
   * Show PDF viewer placeholder
   */
  showPdfPlaceholder(familyId, type = 'select') {
    const pdfViewer = document.getElementById(`pdf-viewer-container-${familyId}`);
    if (!pdfViewer) return;

    let icon = 'fa-file-pdf-o';
    let message = this.t('familyPdfs.selectToView', 'Select a document to view');

    switch (type) {
      case 'no-documents':
        icon = 'fa-file-o';
        message = this.t('familyPdfs.noDocumentsMessage', 'No pedigree documents have been created for this family yet.');
        break;
      case 'error':
        icon = 'fa-exclamation-triangle';
        message = this.t('familyPdfs.errorMessage', 'Error loading documents. Please try again.');
        break;
      case 'loading':
        icon = 'fa-spinner fa-spin';
        message = this.t('familyPdfs.loading', 'Loading document...');
        break;
    }

    pdfViewer.innerHTML = `
      <div class="pdf-viewer-placeholder">
        <i class="fa ${icon} fa-3x text-muted"></i>
        <p class="text-muted">${message}</p>
      </div>
    `;
  }

  /**
   * Refresh family PDFs
   */
  async refreshFamilyPdfs(familyId) {
    console.log('🔄 Refreshing PDFs for family:', familyId);
    await this.loadFamilyPdfs(familyId);
  }

  /**
   * Setup doctor interface functionality
   */
  setupDoctorInterface() {
    console.log('Setting up Doctor Interface module...');
    
    // Setup refresh button
    const refreshBtn = document.getElementById('refresh-doctor-interface');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        const iframe = document.getElementById('doctor-interface-iframe');
        if (iframe) {
          iframe.src = iframe.src; // Refresh iframe
        }
      });
    }
    
    // Setup open in new tab button
    const openNewTabBtn = document.getElementById('open-doctor-interface-new-tab');
    if (openNewTabBtn) {
      openNewTabBtn.addEventListener('click', () => {
        window.open('doctor-interface.html', '_blank');
      });
    }
    
    // Auto-resize iframe based on content (if possible)
    const iframe = document.getElementById('doctor-interface-iframe');
    if (iframe) {
      iframe.addEventListener('load', () => {
        try {
          // Try to access iframe content (might be blocked by CORS)
          const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
          if (iframeDoc) {
            // Adjust height based on content
            const contentHeight = iframeDoc.body.scrollHeight;
            iframe.style.height = Math.max(contentHeight, 600) + 'px';
          }
        } catch (e) {
          // CORS restriction - keep default height
          console.log('Cannot access iframe content due to CORS policy');
        }
      });
    }
    
    console.log('Doctor Interface setup complete');
  }

}

// Initialize the app when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.pedigreeApp = new PedigreeApp();
});
