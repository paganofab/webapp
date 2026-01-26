import i18n from '../i18n';

/**
 * BaseModule provides common functionality for all application modules
 * Each specific module should extend this base class
 */
class BaseModule {
  
  constructor(options = {}) {
    this.options = options;
    this.container = options.container;
    this.backend = options.backend;
    this.moduleId = options.moduleId || 'base-module';
    this.isVisible = false;
    this.initialized = false;
  }
  
  /**
   * Initialize the module
   */
  initialize() {
    if (this.initialized) return;
    
    this.createModuleContainer();
    this.createModuleHeader();
    this.createModuleContent();
    this.setupEventHandlers();
    
    this.initialized = true;
    console.log(this.moduleId + ' initialized');
  }
  
  /**
   * Create the main module container
   */
  createModuleContainer() {
    this.moduleElement = new Element('div', {
      'id': this.moduleId,
      'class': 'app-module'
    });
    
    if (this.container) {
      this.container.insert(this.moduleElement);
    }
  }
  
  /**
   * Create module header with title and actions
   */
  createModuleHeader() {
    this.headerElement = new Element('div', {
      'class': 'module-header'
    });
    
    // Module title
    this.titleElement = new Element('h1', {
      'class': 'module-title'
    });
    this.titleElement.update(this.getModuleTitle());
    
    // Module actions
    this.actionsElement = new Element('div', {
      'class': 'module-actions'
    });
    
    this.headerElement.insert(this.titleElement);
    this.headerElement.insert(this.actionsElement);
    this.moduleElement.insert(this.headerElement);
  }
  
  /**
   * Create main module content area
   */
  createModuleContent() {
    this.contentElement = new Element('div', {
      'class': 'module-content'
    });
    
    this.moduleElement.insert(this.contentElement);
  }
  
  /**
   * Setup event handlers (override in subclasses)
   */
  setupEventHandlers() {
    // Override in subclasses
  }
  
  /**
   * Show the module
   */
  show() {
    if (!this.initialized) {
      this.initialize();
    }
    
    if (this.moduleElement) {
      this.moduleElement.show();
      this.isVisible = true;
      this.onShow();
    }
  }
  
  /**
   * Hide the module
   */
  hide() {
    if (this.moduleElement) {
      this.moduleElement.hide();
      this.isVisible = false;
      this.onHide();
    }
  }
  
  /**
   * Called when module is shown (override in subclasses)
   */
  onShow() {
    // Override in subclasses
  }
  
  /**
   * Called when module is hidden (override in subclasses)
   */
  onHide() {
    // Override in subclasses
  }
  
  /**
   * Get module title (override in subclasses)
   */
  getModuleTitle() {
    return 'Base Module';
  }
  
  /**
   * Add action button to module header
   */
  addHeaderAction(label, icon, callback) {
    const actionButton = new Element('button', {
      'class': 'btn btn-primary module-action-btn'
    });
    
    if (icon) {
      actionButton.insert(new Element('i', {'class': 'fa ' + icon}));
      actionButton.insert(' ');
    }
    actionButton.insert(label);
    
    if (callback && typeof callback === 'function') {
      actionButton.observe('click', callback.bind(this));
    }
    
    this.actionsElement.insert(actionButton);
    return actionButton;
  }
  
  /**
   * Show loading state
   */
  showLoading(message = 'Loading...') {
    if (this.contentElement) {
      this.contentElement.update('');
      const loadingDiv = new Element('div', {
        'class': 'module-loading'
      });
      loadingDiv.insert(new Element('span', {'class': 'loading-spinner'}).update('⏳'));
      loadingDiv.insert(' ' + message);
      this.contentElement.insert(loadingDiv);
    }
  }
  
  /**
   * Show error message
   */
  showError(message) {
    if (this.contentElement) {
      const errorDiv = new Element('div', {
        'class': 'module-error alert alert-danger'
      });
      errorDiv.insert(new Element('span', {'class': 'error-icon'}).update('⚠️'));
      errorDiv.insert(' ' + message);
      this.contentElement.insert(errorDiv);
    }
  }
  
  /**
   * Clear content
   */
  clearContent() {
    if (this.contentElement) {
      this.contentElement.update('');
    }
  }
  
  /**
   * Check if backend is available
   */
  isBackendAvailable() {
    return this.backend && this.backend.isAvailable();
  }
  
  /**
   * Destroy the module
   */
  destroy() {
    if (this.moduleElement) {
      this.moduleElement.remove();
    }
    this.initialized = false;
    this.isVisible = false;
  }
}

export default BaseModule;