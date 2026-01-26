/**
 * Internationalization utility class for managing multiple languages
 * 
 * @class I18n
 */

class I18n {
  constructor() {
    this.currentLanguage = 'pt-BR'; // Default language changed to Portuguese
    this.translations = {};
    this.initialized = false;
    this.availableLanguages = {
      'en': 'English',
      'es': 'Español',
      'fr': 'Français',
      'de': 'Deutsch',
      'it': 'Italiano',
      'pt-BR': 'Português (Brasil)'
    };
    
    // Load saved language preference but don't load translations yet
    this.loadSavedLanguage();
  }

  /**
   * Load all translation files
   */
  async loadAllTranslations() {
    console.log('🔄 Loading translation files...');
    
    for (const [langCode, langName] of Object.entries(this.availableLanguages)) {
      try {
        const response = await fetch(`src/assets/i18n/${langCode}.json`);
        if (response.ok) {
          this.translations[langCode] = await response.json();
          console.log(`✅ Loaded translations for ${langName} (${langCode})`);
        } else {
          console.warn(`⚠️ Failed to load translations for ${langName}: ${response.status}`);
          this.translations[langCode] = {}; // Empty fallback
        }
      } catch (error) {
        console.error(`❌ Error loading translations for ${langName}:`, error);
        this.translations[langCode] = {}; // Empty fallback
      }
    }
    
    console.log('🌍 All translations loaded');
  }

  /**
   * Load language preference from localStorage
   */
  loadSavedLanguage() {
    const saved = localStorage.getItem('pedigree-language');
    if (saved && this.availableLanguages[saved]) {
      this.currentLanguage = saved;
    }
  }

  /**
   * Save language preference to localStorage
   */
  saveLanguagePreference(language) {
    localStorage.setItem('pedigree-language', language);
  }

  /**
   * Set the current language and load its translations
   */
  setLanguage(language) {
    console.log(`🔍 setLanguage called with: ${language}`);
    console.log(`🔍 Available languages:`, this.availableLanguages);
    console.log(`🔍 Language exists check:`, this.availableLanguages[language]);
    
    if (!this.availableLanguages[language]) {
      console.warn(`Language ${language} is not supported`);
      return false;
    }

    this.currentLanguage = language;
    this.saveLanguagePreference(language);
    
    // Translations are already loaded statically, no need to load them
    console.log(`✅ Language changed to: ${language}`);

    // Fire custom event for language change
    document.dispatchEvent(new CustomEvent('language:changed', {
      detail: { language: language }
    }));
    return true;
  }

  /**
   * Get translation for a key with optional fallback
   */
  t(key, fallback = null) {
    const translations = this.translations[this.currentLanguage] || this.translations['pt-BR'] || {};
    const keys = key.split('.');
    let value = translations;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return fallback || key;
      }
    }
    
    return value || fallback || key;
  }

  /**
   * Translate with parameter interpolation
   * @param {string} key - Translation key
   * @param {string} fallback - Fallback text if translation not found
   * @param {Object} params - Parameters to interpolate
   */
  ti(key, fallback = null, params = {}) {
    let text = this.t(key, fallback);
    
    // Replace {{paramName}} with actual values
    if (params && typeof params === 'object') {
      Object.keys(params).forEach(paramKey => {
        const regex = new RegExp(`{{${paramKey}}}`, 'g');
        text = text.replace(regex, params[paramKey]);
      });
    }
    
    return text;
  }

  /**
   * Get current language
   */
  getCurrentLanguage() {
    return this.currentLanguage;
  }

  /**
   * Get available languages
   */
  getAvailableLanguages() {
    return this.availableLanguages;
  }

  /**
   * Initialize the i18n system
   */
  async initialize() {
    if (this.initialized) {
      console.log('🔧 i18n system already initialized');
      return;
    }
    
    console.log('🔧 Initializing i18n system...');
    await this.loadAllTranslations();
    this.initialized = true;
    console.log('✅ i18n system initialized with language:', this.currentLanguage);
    
    // Fire ready event to let other components know i18n is ready
    document.dispatchEvent(new CustomEvent('i18n:ready', {
      detail: { language: this.currentLanguage }
    }));
  }
}

// Create global instance
const i18n = new I18n();

export default i18n;
