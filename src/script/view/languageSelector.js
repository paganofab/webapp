import i18n from 'pedigree/i18n';

/**
 * Language Selector component for switching between available languages
 * 
 * @class LanguageSelector
 */
var LanguageSelector = Class.create({
  
  initialize: function() {
    this.isVisible = false;
    this.menuElement = null;
    this.currentLanguage = i18n.getCurrentLanguage();
    
    // Listen for language changes
    document.observe('language:changed', this.onLanguageChanged.bind(this));
  },

  /**
   * Create the language selector menu element
   */
  createMenu: function() {
    if (this.menuElement) {
      return this.menuElement;
    }

    // Create main container
    this.menuElement = new Element('div', {
      'class': 'language-selector',
      'id': 'language-selector'
    });

    // Create trigger button
    this.triggerButton = new Element('span', {
      'class': 'menu-item language-trigger',
      'id': 'action-language',
      'title': i18n.t('menu.language')
    });
    
    this.triggerButton.insert(new Element('span', {'class': 'fa fa-globe'}));
    this.triggerButton.insert(' ');
    this.triggerButton.insert(i18n.t('menu.language'));
    this.triggerButton.insert(' ');
    this.triggerButton.insert(new Element('span', {'class': 'current-lang'}).update(this.currentLanguage.toUpperCase()));

    // Create dropdown menu
    this.dropdown = new Element('div', {
      'class': 'language-dropdown',
      'style': 'display: none;'
    });

    // Add language options
    const languages = i18n.getAvailableLanguages();
    Object.keys(languages).forEach(langCode => {
      const option = new Element('div', {
        'class': 'language-option',
        'data-lang': langCode
      });
      
      if (langCode === this.currentLanguage) {
        option.addClassName('active');
      }
      
      option.update(languages[langCode]);
      option.observe('click', this.onLanguageOptionClick.bind(this, langCode));
      
      this.dropdown.insert(option);
    });

    this.menuElement.insert(this.triggerButton);
    this.menuElement.insert(this.dropdown);

    // Add click handlers
    this.triggerButton.observe('click', this.toggleDropdown.bind(this));
    
    // Close dropdown when clicking outside
    document.observe('click', this.onDocumentClick.bind(this));

    return this.menuElement;
  },

  /**
   * Toggle dropdown visibility
   */
  toggleDropdown: function(event) {
    if (event) {
      event.stop();
    }
    
    if (this.isVisible) {
      this.hideDropdown();
    } else {
      this.showDropdown();
    }
  },

  /**
   * Show dropdown menu
   */
  showDropdown: function() {
    if (this.dropdown) {
      this.dropdown.style.display = 'block';
      this.isVisible = true;
      this.triggerButton.addClassName('active');
    }
  },

  /**
   * Hide dropdown menu
   */
  hideDropdown: function() {
    if (this.dropdown) {
      this.dropdown.style.display = 'none';
      this.isVisible = false;
      this.triggerButton.removeClassName('active');
    }
  },

  /**
   * Handle language option click
   */
  onLanguageOptionClick: function(langCode, event) {
    if (event) {
      event.stop();
    }
    
    if (langCode !== this.currentLanguage) {
      this.setLanguage(langCode);
    }
    
    this.hideDropdown();
  },

  /**
   * Set the current language
   */
  setLanguage(langCode) {
    const success = i18n.setLanguage(langCode);
    
    if (success) {
      this.currentLanguage = langCode;
      this.updateUI();
    }
  },

  /**
   * Update UI after language change
   */
  updateUI: function() {
    // Update current language display
    if (this.triggerButton) {
      const currentLangSpan = this.triggerButton.down('.current-lang');
      if (currentLangSpan) {
        currentLangSpan.update(this.currentLanguage.toUpperCase());
      }
    }

    // Update active option
    if (this.dropdown) {
      this.dropdown.select('.language-option').forEach(option => {
        option.removeClassName('active');
        if (option.getAttribute('data-lang') === this.currentLanguage) {
          option.addClassName('active');
        }
      });
    }
  },

  /**
   * Handle document click to close dropdown
   */
  onDocumentClick: function(event) {
    if (this.isVisible && this.menuElement && !this.menuElement.contains(event.target)) {
      this.hideDropdown();
    }
  },

  /**
   * Handle language changed event
   */
  onLanguageChanged: function(event) {
    if (event.memo && event.memo.language) {
      this.currentLanguage = event.memo.language;
      this.updateUI();
    }
  },

  /**
   * Get the menu element
   */
  getMenuElement: function() {
    return this.createMenu();
  },

  /**
   * Destroy the language selector
   */
  destroy: function() {
    if (this.menuElement && this.menuElement.parentNode) {
      this.menuElement.remove();
    }
    this.menuElement = null;
    this.triggerButton = null;
    this.dropdown = null;
  }
});

export default LanguageSelector;
