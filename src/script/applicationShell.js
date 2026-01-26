import PedigreeEditor from './pedigree';
import ReportModule from './modules/reportModule';
import FamilyDetailsModule from './modules/familyDetailsModule';
import RiskAssessmentModule from './modules/riskAssessmentModule';
import DataManagementModule from './modules/dataManagementModule';
import i18n from './i18n';

/**
 * ApplicationShell manages the main application interface and module navigation
 * It provides a unified interface for all application modules while keeping
 * the existing pedigree editor functionality intact.
 */
class ApplicationShell {
  
  constructor(options = {}) {
    this.options = options;
    this.backend = options.backend;
    this.currentModule = null;
    this.modules = {};
    this.initialized = false;
  }
  
  /**
   * Initialize the application shell
   */
  initialize() {
    if (this.initialized) return;
    
    this.createMainInterface();
    this.initializeModules();
    this.setupNavigation();
    
    // Load the default module (Family Center)
    this.loadModule('family-center');
    
    this.initialized = true;
    console.log('ApplicationShell initialized successfully');
  }
  
  /**
   * Create the main application interface
   */
  createMainInterface() {
    // Clear existing body content
    $('body').update('');
    
    // Create main application structure
    const appContainer = new Element('div', {'id': 'app-container', 'class': 'app-container'});
    const navigationBar = new Element('div', {'id': 'navigation-bar', 'class': 'navigation-bar'});
    const moduleContainer = new Element('div', {'id': 'module-container', 'class': 'module-container'});
    
    // Build navigation
    this.buildNavigation(navigationBar);
    
    // Assemble the interface
    appContainer.insert(navigationBar);
    appContainer.insert(moduleContainer);
    $('body').insert(appContainer);
    
    console.log('Main interface created');
  }
  
  /**
   * Build the main navigation bar
   */
  buildNavigation(navigationBar) {
    // Application title/logo
    const titleSection = new Element('div', {'class': 'nav-title-section'});
    titleSection.insert(new Element('a', {'class': 'nav-title'})
      .insert(new Element('i', {'class': 'fa fa-dna'}))
      .insert(' PedigreePro'));
    
    // Navigation menu
    const navMenu = new Element('ul', {'class': 'nav-menu'});
    
    const modules = [
      { key: 'family-center', label: 'Family Center', icon: 'fa-users' },
      { key: 'reports', label: 'Reports', icon: 'fa-file-text' },
      { key: 'risk-assessment', label: 'Risk Assessment', icon: 'fa-heartbeat' },
      { key: 'data-management', label: 'Data Management', icon: 'fa-database' }
    ];
    
    modules.forEach(module => {
      const navItem = new Element('li', {'class': 'nav-item'});
      const navLink = new Element('a', {
        'href': '#',
        'class': 'nav-link',
        'data-module': module.key
      });
      
      navLink.insert(new Element('i', {'class': 'fa ' + module.icon}));
      navLink.insert(' ' + module.label);
      
      navLink.observe('click', (e) => {
        e.preventDefault();
        this.loadModule(module.key);
      });
      
      navItem.insert(navLink);
      navMenu.insert(navItem);
    });
    
    // Add Pedigree Editor launcher
    const pedigreeItem = new Element('li', {'class': 'nav-item'});
    const pedigreeButton = new Element('a', {
      'href': '#',
      'class': 'nav-link launch-button'
    });
    pedigreeButton.insert(new Element('i', {'class': 'fa fa-sitemap'}));
    pedigreeButton.insert(' Launch Pedigree Editor');
    pedigreeButton.observe('click', (e) => {
      e.preventDefault();
      this.launchPedigreeEditor();
    });
    pedigreeItem.insert(pedigreeButton);
    navMenu.insert(pedigreeItem);
    
    // User/settings section
    const userSection = new Element('div', {'class': 'nav-user-section'});
    userSection.insert(new Element('span', {'class': 'nav-user-info'})
      .insert('&copy; 2025 PedigreePro'));
    
    navigationBar.insert(titleSection);
    navigationBar.insert(navMenu);
    navigationBar.insert(userSection);
  }
  
  /**
   * Initialize all application modules
   */
  initializeModules() {
    console.log('Initializing modules...');
    
    // Initialize Report Module
    this.modules.reports = {
      name: 'Reports',
      instance: null,
      initialized: false,
      load: () => this.loadReportModule(),
      unload: () => this.unloadReportModule()
    };
    
    // Initialize Family Center Module
    this.modules['family-center'] = {
      name: 'Family Center',
      instance: null,
      initialized: false,
      load: () => this.loadFamilyCenterModule(),
      unload: () => this.unloadFamilyCenterModule()
    };
    
    // Initialize Risk Assessment Module
    this.modules['risk-assessment'] = {
      name: 'Risk Assessment',
      instance: null,
      initialized: false,
      load: () => this.loadRiskAssessmentModule(),
      unload: () => this.unloadRiskAssessmentModule()
    };
    
    // Initialize Data Management Module
    this.modules['data-management'] = {
      name: 'Data Management',
      instance: null,
      initialized: false,
      load: () => this.loadDataManagementModule(),
      unload: () => this.unloadDataManagementModule()
    };
    
    console.log('Modules initialized');
  }
  
  /**
   * Setup navigation event handling
   */
  setupNavigation() {
    // Add active state management
    this.updateActiveNavigation = (moduleKey) => {
      $$('.nav-link').each(link => link.removeClassName('active'));
      const activeLink = $$('.nav-link[data-module="' + moduleKey + '"]')[0];
      if (activeLink) {
        activeLink.addClassName('active');
      }
    };
  }
  
  /**
   * Load a specific module
   */
  loadModule(moduleKey) {
    console.log('Loading module:', moduleKey);
    
    // Unload current module if any
    if (this.currentModule && this.modules[this.currentModule]) {
      this.modules[this.currentModule].unload();
    }
    
    // Load new module
    if (this.modules[moduleKey]) {
      this.modules[moduleKey].load();
      this.currentModule = moduleKey;
      this.updateActiveNavigation(moduleKey);
      console.log('Module loaded:', moduleKey);
    } else {
      console.error('Module not found:', moduleKey);
    }
  }
  
  /**
   * Load Report Module
   */
  loadReportModule() {
    const moduleContainer = $('module-container');
    moduleContainer.update('');
    
    if (!this.modules.reports.initialized) {
      this.modules.reports.instance = new ReportModule({
        container: moduleContainer,
        backend: this.backend
      });
      this.modules.reports.initialized = true;
    } else {
      // Re-insert the module element into the cleared container
      moduleContainer.insert(this.modules.reports.instance.moduleElement);
    }
    
    this.modules.reports.instance.show();
    console.log('Report module loaded');
  }
  
  /**
   * Unload Report Module
   */
  unloadReportModule() {
    if (this.modules.reports.instance) {
      this.modules.reports.instance.hide();
    }
    console.log('Report module unloaded');
  }
  
  /**
   * Load Family Center Module
   */
  loadFamilyCenterModule() {
    const moduleContainer = $('module-container');
    moduleContainer.update('');
    
    if (!this.modules['family-center'].initialized) {
      this.modules['family-center'].instance = new FamilyDetailsModule({
        container: moduleContainer,
        backend: this.backend
      });
      this.modules['family-center'].initialized = true;
    } else {
      // Re-insert the module element into the cleared container
      moduleContainer.insert(this.modules['family-center'].instance.moduleElement);
    }
    
    this.modules['family-center'].instance.show();
    console.log('Family Center module loaded');
  }
  
  /**
   * Unload Family Center Module
   */
  unloadFamilyCenterModule() {
    if (this.modules['family-center'].instance) {
      this.modules['family-center'].instance.hide();
    }
    console.log('Family Center module unloaded');
  }
  
  /**
   * Load Risk Assessment Module
   */
  loadRiskAssessmentModule() {
    const moduleContainer = $('module-container');
    moduleContainer.update('');
    
    if (!this.modules['risk-assessment'].initialized) {
      this.modules['risk-assessment'].instance = new RiskAssessmentModule({
        container: moduleContainer,
        backend: this.backend
      });
      this.modules['risk-assessment'].initialized = true;
    } else {
      // Re-insert the module element into the cleared container
      moduleContainer.insert(this.modules['risk-assessment'].instance.moduleElement);
    }
    
    this.modules['risk-assessment'].instance.show();
    console.log('Risk Assessment module loaded');
  }
  
  /**
   * Unload Risk Assessment Module
   */
  unloadRiskAssessmentModule() {
    if (this.modules['risk-assessment'].instance) {
      this.modules['risk-assessment'].instance.hide();
    }
    console.log('Risk Assessment module unloaded');
  }
  
  /**
   * Load Data Management Module
   */
  loadDataManagementModule() {
    const moduleContainer = $('module-container');
    moduleContainer.update('');
    
    if (!this.modules['data-management'].initialized) {
      this.modules['data-management'].instance = new DataManagementModule({
        container: moduleContainer,
        backend: this.backend
      });
      
      // Get the HTML content and insert it
      const moduleContent = this.modules['data-management'].instance.getContent();
      moduleContainer.update(moduleContent);
      
      // Initialize the module
      this.modules['data-management'].instance.init();
      this.modules['data-management'].initialized = true;
    } else {
      // Re-insert the module content into the cleared container
      const moduleContent = this.modules['data-management'].instance.getContent();
      moduleContainer.update(moduleContent);
      // Re-initialize event listeners
      this.modules['data-management'].instance.setupEventListeners();
    }
    
    this.modules['data-management'].instance.show();
    console.log('Data Management module loaded');
  }
  
  /**
   * Unload Data Management Module
   */
  unloadDataManagementModule() {
    if (this.modules['data-management'].instance) {
      this.modules['data-management'].instance.hide();
    }
    console.log('Data Management module unloaded');
  }
  
  /**
   * Get current module
   */
  getCurrentModule() {
    return this.currentModule;
  }
  
  /**
   * Get module instance
   */
  getModuleInstance(moduleKey) {
    return this.modules[moduleKey] ? this.modules[moduleKey].instance : null;
  }
  
  /**
   * Launch external Pedigree Editor
   */
  launchPedigreeEditor() {
    console.log('Launching external Pedigree Editor...');
    
    // Use electron to launch the original app as a separate process
    if (window.electronAPI && window.electronAPI.launchPedigreeEditor) {
      window.electronAPI.launchPedigreeEditor();
    } else {
      // Fallback: open in new window
      const pedigreeWindow = window.open('/pedigree.html', 'PedigreeEditor', 
        'width=1200,height=800,menubar=no,toolbar=no,location=no,status=no,scrollbars=yes,resizable=yes'
      );
      
      if (!pedigreeWindow) {
        alert('Please allow popups to open the Pedigree Editor in a new window.');
      }
    }
  }
}

export default ApplicationShell;
