// Splash Screen and License Management

class SplashManager {
  constructor() {
    this.licenseServer = null; // Will be auto-detected
    this.currentLicense = null;
    this.machineId = this.generateMachineId();
    
    // Initialize asynchronously
    this.initializeAsync();
  }
  
  async initializeAsync() {
    // Initialize i18n system first and wait for it
    await this.initializeI18n();
    
    // Now initialize the rest
    this.init();
  }

  // Initialize i18n system
  async initializeI18n() {
    // Wait for i18n to be marked as ready from the HTML script
    if (!window.i18nReady) {
      console.log('⏳ Waiting for i18n to be ready...');
      await new Promise(resolve => {
        document.addEventListener('i18n:splash-ready', resolve, { once: true });
      });
      console.log('✅ i18n ready signal received');
    }
    
    if (window.i18n) {
      this.i18n = window.i18n;
      console.log('🌍 i18n system available in splash');
      
      // Apply translations to HTML elements immediately
      this.applyTranslations();
      
      // Listen for language changes
      window.addEventListener('languageChanged', () => {
        this.applyTranslations();
        console.log('🌍 Splash screen translations updated for language change');
      });
      
      // Also listen for the i18n ready event as a backup
      document.addEventListener('i18n:ready', () => {
        console.log('🌍 i18n ready event received, applying translations');
        this.applyTranslations();
      });
    } else {
      // Fallback i18n for splash screen
      this.i18n = {
        t: (key, fallback = key) => {
          const fallbacks = {
            'splash.connecting': 'Connecting...',
            'splash.licenseChecking': 'Checking license...',
            'splash.loading': 'Loading application...',
            'splash.title': 'PedigreePro',
            'splash.subtitle': 'Professional Pedigree Management',
            'splash.configureServer': 'Configure Server',
            'splash.testConnection': 'Test Connection',
            'splash.connectionSuccess': 'Connection successful',
            'splash.connectionFailed': 'Connection failed',
            'splash.serverConfig': 'License Server Configuration',
            'splash.serverAddress': 'License Server URL',
            'splash.enterLicenseDescription': 'Please enter a license key',
            'splash.licenseInvalid': 'Invalid license key',
            'splash.validatingLicense': 'Validating license...',
            'splash.freePlan': 'Free Plan',
            'splash.proPlan': 'Professional Plan',
            'splash.enterprisePlan': 'Enterprise Plan',
            'splash.unlimitedFamilies': 'Unlimited families',
            'splash.upToFamilies': 'Up to',
            'splash.families': 'families',
            'splash.expires': 'Expires',
            'splash.initializingApp': 'Initializing application...',
            'splash.loadingConfig': 'Loading configuration...',
            'splash.preparingInterface': 'Preparing interface...',
            'splash.ready': 'Ready!',
            'errors.fillAllFields': 'Please fill in all fields',
            'errors.passwordMismatch': 'Passwords do not match', 
            'errors.passwordLength': 'Password must be at least 8 characters long',
            'errors.registrationFailed': 'Registration failed. Please check your internet connection.',
            'errors.signInFailed': 'Sign in failed. Please check your internet connection.',
            'errors.invalidCredentials': 'Please enter your email and password'
          };
          return fallbacks[key] || fallback || key;
        }
      };
    }
  }

  // Apply translations to HTML elements with data-i18n attributes
  applyTranslations() {
    console.log('🌍 Applying translations to splash screen elements...');
    
    // Update text content for elements with data-i18n
    const textElements = document.querySelectorAll('[data-i18n]');
    console.log(`📝 Found ${textElements.length} elements with data-i18n attributes`);
    
    textElements.forEach(element => {
      const key = element.getAttribute('data-i18n');
      const translation = this.i18n.t(key);
      if (translation !== key) { // Only update if translation exists
        console.log(`  ✅ Translating "${key}" → "${translation}"`);
        element.textContent = translation;
      } else {
        console.log(`  ⚠️ No translation found for "${key}"`);
      }
    });

    // Update placeholders for input elements with data-i18n-placeholder
    const placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');
    
    placeholderElements.forEach(element => {
      const key = element.getAttribute('data-i18n-placeholder');
      const translation = this.i18n.t(key);
      if (translation !== key) { // Only update if translation exists
        console.log(`  ✅ Translating placeholder "${key}" → "${translation}"`);
        element.placeholder = translation;
      } else {
      }
    });
    
  }

  async init() {
    console.log('🚀 SplashManager initializing...');
    
    // Start with splash screen
    this.showSplash();
    this.setupEventListeners();
    
    // Auto-detect license server during startup
    try {
      await this.detectLicenseServer();
      console.log('✅ License server detection completed');
    } catch (error) {
      console.error('💥 Error in detectLicenseServer:', error);
    }
    
    // Only proceed with startup if we have a server
    if (this.licenseServer) {
      console.log('🎯 Proceeding with startup using server:', this.licenseServer);
      this.performStartup();
    } else {
      console.log('⏳ Waiting for manual server configuration...');
      // performStartup will be called after manual configuration
    }
  }

  async detectLicenseServer() {
    console.log('🔍 Detecting license server...');
    
    try {
      // Ensure config manager is available
      if (!window.PedigreeConfig) {
        console.warn('⚠️ PedigreeConfig not available, using fallback detection');
        await this.fallbackServerDetection();
        return;
      }

      // Use the global config manager to detect server
      this.licenseServer = await window.PedigreeConfig.detectLicenseServer();
      console.log('📡 Using license server:', this.licenseServer);
      
      if (!this.licenseServer) {
        console.log('❌ No server detected, showing manual configuration');
        await this.showManualServerConfig();
      }
      
    } catch (error) {
      console.error('❌ Failed to detect license server:', error);
      // Show manual configuration instead of just an error
      await this.showManualServerConfig();
    }
  }

  async fallbackServerDetection() {
    console.log('🔍 Using fallback server detection...');
    
    const commonServers = [
      'http://localhost:3001',
      'http://127.0.0.1:3001',
      'http://192.168.1.100:3001',
      'http://192.168.0.100:3001',
      'http://10.0.0.100:3001'
    ];

    for (const server of commonServers) {
      console.log('🧪 Testing server:', server);
      if (await this.testServer(server)) {
        console.log('✅ Found working server:', server);
        this.licenseServer = server;
        return;
      }
    }

    console.log('❌ No server found in fallback detection');
    await this.showManualServerConfig();
  }

  async testServer(url) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch(`${url}/health`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        return data.status === 'ok';
      }
      return false;
    } catch (error) {
      // Timeout, network error, or other issues
      return false;
    }
  }

  async showManualServerConfig() {
    console.log('🔧 Showing manual server configuration...');
    
    return new Promise((resolve) => {
      const modal = this.createServerConfigModal(resolve);
      document.body.appendChild(modal);
    });
  }

  createServerConfigModal(resolve) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay server-config-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <h3>🔧 ${this.i18n.t('splash.serverConfig')}</h3>
        <p>We couldn't automatically find your license server. Please configure it manually:</p>
        
        <div class="form-group">
          <label for="server-url">${this.i18n.t('splash.serverAddress')}:</label>
          <input type="text" id="server-url" placeholder="http://localhost:3001" value="http://localhost:3001">
          <small class="form-hint">
            Enter the IP address of your license server followed by :3001<br>
            Example: http://localhost:3001 or http://192.168.1.100:3001
          </small>
        </div>

        <div class="server-examples">
          <h4>Common Examples:</h4>
          <ul>
            <li><code>http://localhost:3001</code> - Local development</li>
            <li><code>http://192.168.1.100:3001</code> - Home network</li>
            <li><code>http://10.0.0.100:3001</code> - Office network</li>
          </ul>
        </div>

        <div class="modal-buttons">
          <button class="btn-secondary" id="test-connection">${this.i18n.t('splash.testConnection')}</button>
          <button class="btn-primary" id="save-server">Save & Continue</button>
        </div>

        <div id="connection-status" class="connection-status hidden"></div>
      </div>
    `;

    // Add event listeners
    const serverInput = modal.querySelector('#server-url');
    const testBtn = modal.querySelector('#test-connection');
    const saveBtn = modal.querySelector('#save-server');
    const statusDiv = modal.querySelector('#connection-status');

    testBtn.addEventListener('click', async () => {
      const url = serverInput.value.trim();
      if (!url) {
        this.showConnectionStatus(statusDiv, 'Please enter a server URL', 'error');
        return;
      }

      this.showConnectionStatus(statusDiv, this.i18n.t('splash.connecting'), 'loading');
      testBtn.disabled = true;

      const isWorking = await this.testServer(url);
      
      if (isWorking) {
        this.showConnectionStatus(statusDiv, this.i18n.t('splash.connectionSuccess'), 'success');
        saveBtn.textContent = 'Save & Continue';
        saveBtn.disabled = false;
      } else {
        this.showConnectionStatus(statusDiv, this.i18n.t('splash.connectionFailed'), 'error');
      }
      
      testBtn.disabled = false;
    });

    saveBtn.addEventListener('click', async () => {
      const url = serverInput.value.trim();
      if (!url) {
        this.showConnectionStatus(statusDiv, 'Please enter a server URL', 'error');
        return;
      }

      // Test one more time before saving
      this.showConnectionStatus(statusDiv, this.i18n.t('splash.connecting'), 'loading');
      const isWorking = await this.testServer(url);
      
      if (isWorking) {
        this.licenseServer = url;
        
        // Save to localStorage for future use
        try {
          localStorage.setItem('pedigree_server_config', JSON.stringify({
            licenseServer: url,
            lastUpdated: new Date().toISOString()
          }));
        } catch (error) {
          console.warn('Could not save server config:', error);
        }
        
        modal.remove();
        console.log('✅ Server configured, continuing with startup');
        resolve(url);
        
        // Continue with the startup process now that we have a server
        this.performStartup();
      } else {
        this.showConnectionStatus(statusDiv, '❌ Connection failed. Please verify the URL and that the server is running.', 'error');
      }
    });

    // Allow Enter key to test connection
    serverInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        testBtn.click();
      }
    });

    return modal;
  }

  showConnectionStatus(statusDiv, message, type) {
    statusDiv.className = `connection-status ${type}`;
    statusDiv.textContent = message;
    statusDiv.classList.remove('hidden');
  }

  setupEventListeners() {
    // License validation
    document.getElementById('validate-license-btn').addEventListener('click', () => {
      this.validateLicense();
    });

    // Registration flow
    document.getElementById('register-new-btn').addEventListener('click', () => {
      this.showRegistration();
    });

    document.getElementById('have-account-btn').addEventListener('click', () => {
      this.showLogin();
    });

    document.getElementById('create-account-btn').addEventListener('click', () => {
      this.createAccount();
    });

    document.getElementById('signin-btn').addEventListener('click', () => {
      this.signIn();
    });

    // Navigation
    document.getElementById('back-to-license-btn').addEventListener('click', () => {
      this.showLicenseInput();
    });

    document.getElementById('back-to-license-from-login-btn').addEventListener('click', () => {
      this.showLicenseInput();
    });

    document.getElementById('create-account-from-login-btn').addEventListener('click', () => {
      this.showRegistration();
    });

    // Continue to app
    document.getElementById('continue-to-app-btn').addEventListener('click', () => {
      this.launchMainApp();
    });

    // Tier selection
    document.querySelectorAll('.tier-option').forEach(option => {
      option.addEventListener('click', () => {
        document.querySelectorAll('.tier-option').forEach(o => o.classList.remove('selected'));
        option.classList.add('selected');
      });
    });

    // Enter key handling
    document.getElementById('license-key-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.validateLicense();
    });
  }

  generateMachineId() {
    // Create a unique machine ID based on available system info
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Machine fingerprint', 2, 2);
    
    const fingerprint = canvas.toDataURL() + 
                       navigator.userAgent + 
                       navigator.language + 
                       screen.width + 'x' + screen.height;
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(16);
  }

  async performStartup() {
    console.log('🎬 Starting application startup sequence...');
    
    // Simulate loading steps
    const steps = [
      { text: this.i18n.t('splash.initializingApp'), progress: 20 },
      { text: this.i18n.t('splash.loadingConfig'), progress: 40 },
      { text: this.i18n.t('splash.licenseChecking'), progress: 60 },
      { text: this.i18n.t('splash.preparingInterface'), progress: 80 },
      { text: this.i18n.t('splash.ready'), progress: 100 }
    ];

    for (let i = 0; i < steps.length; i++) {
      console.log(`📊 Progress: ${steps[i].text} (${steps[i].progress}%)`);
      await this.delay(300);
      this.updateProgress(steps[i].text, steps[i].progress);
    }

    // await this.delay(100);

    console.log('🔍 Checking for existing license...');
    // Check for existing license
    const storedLicense = localStorage.getItem('pedigree_license');
    console.log('💾 Stored license data:', storedLicense ? 'Found' : 'None');
    
    if (storedLicense) {
      try {
        const licenseData = JSON.parse(storedLicense);
        console.log('📋 License data parsed:', licenseData);
        console.log('🧪 Validating stored license...');
        
        const isValid = await this.validateStoredLicense(licenseData.license_key);
        console.log('✅ License validation result:', isValid);
        
        if (isValid) {
          console.log('🎉 Valid license found, showing status');
          this.showLicenseStatus(licenseData);
          return;
        } else {
          console.log('❌ Stored license is invalid, clearing it');
          localStorage.removeItem('pedigree_license');
        }
      } catch (error) {
        console.error('💥 Error processing stored license:', error);
        localStorage.removeItem('pedigree_license');
      }
    }

    // No valid license found, show license screen
    console.log('📝 No valid license found, showing license input screen');
    this.showLicenseScreen();
  }

  updateProgress(text, progress) {
    // Apply translations if needed before updating text
    if (this.i18n && typeof text === 'string' && text.includes('.')) {
      // If the text looks like a translation key, translate it
      const translated = this.i18n.t(text);
      if (translated !== text) {
        text = translated;
      }
    }
    
    document.querySelector('.loading-text').textContent = text;
    document.getElementById('progress-fill').style.width = progress + '%';
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  showSplash() {
    document.getElementById('splash-screen').classList.add('active');
    
    // Apply translations as soon as splash is shown (in case of timing issues)
    setTimeout(() => {
      if (this.i18n) {
        console.log('🌍 Applying translations on splash show (safety net)');
        this.applyTranslations();
      }
    }, 100);
  }

  hideSplash() {
    console.log('🫥 Hiding splash screen...');
    const splashScreen = document.getElementById('splash-screen');
    if (splashScreen) {
      splashScreen.classList.remove('active');
      console.log('✅ Splash screen hidden');
    } else {
      console.error('❌ Splash screen element not found!');
    }
  }

  showLicenseScreen() {
    console.log('🎭 Transitioning to license screen...');
    console.log('🔍 Checking elements:');
    console.log('  - splash-screen:', document.getElementById('splash-screen') ? 'Found' : 'Missing');
    console.log('  - license-screen:', document.getElementById('license-screen') ? 'Found' : 'Missing');
    console.log('  - license-input-section:', document.getElementById('license-input-section') ? 'Found' : 'Missing');
    
    this.hideSplash();
    setTimeout(() => {
      console.log('🎬 Showing license screen after delay...');
      const licenseScreen = document.getElementById('license-screen');
      if (licenseScreen) {
        licenseScreen.classList.add('active');
        console.log('✅ License screen activated');
        this.showLicenseInput();
      } else {
        console.error('❌ License screen element not found!');
      }
    }, 500);
  }

  showLicenseInput() {
    console.log('📝 Showing license input section...');
    this.hideAllSections();
    this.showLoading(false); // Hide any loading spinner
    this.hideError(); // Hide any error messages
    
    const licenseInputSection = document.getElementById('license-input-section');
    if (licenseInputSection) {
      licenseInputSection.classList.remove('hidden');
      console.log('✅ License input section shown');
    } else {
      console.error('❌ License input section not found!');
    }
  }

  showRegistration() {
    this.hideAllSections();
    document.getElementById('registration-section').classList.remove('hidden');
  }

  showLogin() {
    this.hideAllSections();
    document.getElementById('login-section').classList.remove('hidden');
  }

  showLicenseStatus(licenseData) {
    this.hideAllSections();
    
    const tierName = licenseData.tier === 'free' ? this.i18n.t('splash.freePlan') : 
                     licenseData.tier === 'pro' ? this.i18n.t('splash.proPlan') : this.i18n.t('splash.enterprisePlan');
    
    document.getElementById('license-tier').textContent = tierName;
    
    if (licenseData.max_families === -1) {
      document.getElementById('license-details').textContent = this.i18n.t('splash.unlimitedFamilies');
    } else {
      // We'll need to get the actual count from the main app
      document.getElementById('license-details').textContent = `${this.i18n.t('splash.upToFamilies')} ${licenseData.max_families} ${this.i18n.t('splash.families')}`;
    }

    if (licenseData.expires_at) {
      const expiryDate = new Date(licenseData.expires_at);
      document.getElementById('license-expires').textContent = `${this.i18n.t('splash.expires')}: ${expiryDate.toLocaleDateString()}`;
    }

    if (licenseData.tier === 'free') {
      document.getElementById('upgrade-license-btn').classList.remove('hidden');
    }

    document.getElementById('license-status').classList.remove('hidden');
    
    // Auto-launch after showing status briefly
    setTimeout(() => {
      this.launchMainApp();
    }, 2000);
  }

  hideAllSections() {
    console.log('🙈 Hiding all license sections...');
    const sections = document.querySelectorAll('.license-section');
    console.log(`📋 Found ${sections.length} license sections`);
    sections.forEach((section, index) => {
      console.log(`  - Section ${index + 1}:`, section.id || section.className);
      section.classList.add('hidden');
    });
    this.hideError();
  }

  showError(message) {
    document.getElementById('error-text').textContent = message;
    document.getElementById('license-error').classList.remove('hidden');
  }

  hideError() {
    document.getElementById('license-error').classList.add('hidden');
  }

  showLoading(show = true) {
    console.log(`⏳ ${show ? 'Showing' : 'Hiding'} loading spinner...`);
    const loadingElement = document.getElementById('license-loading');
    if (loadingElement) {
      if (show) {
        loadingElement.classList.remove('hidden');
        console.log('✅ Loading spinner shown');
      } else {
        loadingElement.classList.add('hidden');
        console.log('✅ Loading spinner hidden');
      }
    } else {
      console.error('❌ Loading element not found!');
    }
  }

  async validateLicense() {
    const licenseKey = document.getElementById('license-key-input').value.trim();
    
      if (!licenseKey) {
        this.showError(this.i18n.t('splash.enterLicenseDescription'));
        return;
      }    this.showLoading(true);
    this.hideError();

    try {
      const response = await fetch(`${this.licenseServer}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          license_key: licenseKey,
          machine_id: this.machineId
        })
      });

      const data = await response.json();

      if (data.valid) {
        // Store license data
        const licenseData = {
          license_key: licenseKey,
          tier: data.tier,
          max_families: data.max_families,
          expires_at: data.expires_at,
          features: data.features,
          email: data.email
        };

        localStorage.setItem('pedigree_license', JSON.stringify(licenseData));
        this.currentLicense = licenseData;

        this.showLicenseStatus(licenseData);
      } else {
        this.showError(data.error || this.i18n.t('splash.licenseInvalid'));
      }
    } catch (error) {
      console.error('License validation error:', error);
      this.showError('Unable to validate license. Please check your internet connection.');
    } finally {
      this.showLoading(false);
    }
  }

  async validateStoredLicense(licenseKey) {
    console.log('🔐 Validating stored license key:', licenseKey);
    console.log('📡 Using server:', this.licenseServer);
    console.log('🖥️ Machine ID:', this.machineId);
    
    try {
      const requestBody = {
        license_key: licenseKey,
        machine_id: this.machineId
      };
      
      console.log('📤 Sending validation request:', requestBody);
      
      const response = await fetch(`${this.licenseServer}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      console.log('📥 Server response status:', response.status);
      
      if (!response.ok) {
        console.error('❌ Server returned non-OK status:', response.status, response.statusText);
        return false;
      }

      const data = await response.json();
      console.log('📋 Server response data:', data);
      
      return data.valid;
    } catch (error) {
      console.error('💥 Stored license validation error:', error);
      return false;
    }
  }

  async createAccount() {
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;
    const selectedTier = document.querySelector('.tier-option.selected').dataset.tier;

    // Validation
    if (!email || !password || !confirmPassword) {
      this.showError(this.i18n.t('errors.fillAllFields'));
      return;
    }

    if (password !== confirmPassword) {
      this.showError(this.i18n.t('errors.passwordMismatch'));
      return;
    }

    if (password.length < 8) {
      this.showError(this.i18n.t('errors.passwordLength'));
      return;
    }

    this.showLoading(true);
    this.hideError();

    try {
      const response = await fetch(`${this.licenseServer}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          password: password,
          tier: selectedTier
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Store license data
        const licenseData = {
          license_key: data.license_key,
          tier: data.tier,
          max_families: data.max_families,
          expires_at: data.expires_at,
          email: email
        };

        localStorage.setItem('pedigree_license', JSON.stringify(licenseData));
        this.currentLicense = licenseData;

        this.showLicenseStatus(licenseData);
      } else {
        this.showError(data.error || this.i18n.t('errors.registrationFailed'));
      }
    } catch (error) {
      console.error('Registration error:', error);
      this.showError(this.i18n.t('errors.registrationFailed'));
    } finally {
      this.showLoading(false);
    }
  }

  async signIn() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
      this.showError(this.i18n.t('errors.invalidCredentials'));
      return;
    }

    this.showLoading(true);
    this.hideError();

    try {
      const response = await fetch(`${this.licenseServer}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          password: password
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Store license data
        const licenseData = {
          license_key: data.license_key,
          tier: data.tier,
          max_families: data.max_families,
          expires_at: data.expires_at,
          email: email,
          token: data.token
        };

        localStorage.setItem('pedigree_license', JSON.stringify(licenseData));
        this.currentLicense = licenseData;

        this.showLicenseStatus(licenseData);
      } else {
        this.showError(data.error || this.i18n.t('errors.signInFailed'));
      }
    } catch (error) {
      console.error('Sign in error:', error);
      this.showError(this.i18n.t('errors.signInFailed'));
    } finally {
      this.showLoading(false);
    }
  }

  launchMainApp() {
    // Hide license screen and launch main app
    document.getElementById('license-screen').style.opacity = '0';
    
    setTimeout(async () => {
      // Check if running in Electron
      if (window.electronAPI) {
        // Use Electron API to navigate to main app
        await window.electronAPI.loadMainApp();
      } else {
        // For web version, redirect to main page
        window.location.href = 'index.html';
      }
    }, 500);
  }

  // Method to be called from main app to check license limits
  static async checkFamilyLimit(currentCount) {
    const licenseData = JSON.parse(localStorage.getItem('pedigree_license') || '{}');
    
    if (!licenseData.license_key) {
      return { canAdd: false, reason: 'No valid license' };
    }

    if (licenseData.max_families === -1) {
      return { canAdd: true };
    }

    if (currentCount >= licenseData.max_families) {
      return { 
        canAdd: false, 
        reason: `You have reached the limit of ${licenseData.max_families} families for your ${licenseData.tier} plan.`,
        tier: licenseData.tier 
      };
    }

    return { canAdd: true };
  }

  // Method to get current license info
  static getCurrentLicense() {
    return JSON.parse(localStorage.getItem('pedigree_license') || '{}');
  }
}

// Initialize splash manager when page loads
document.addEventListener('DOMContentLoaded', () => {
  console.log('🎬 DOM loaded, creating SplashManager...');
  try {
    const splashManager = new SplashManager();
    console.log('✅ SplashManager created successfully');
    window.splashManager = splashManager; // For debugging
  } catch (error) {
    console.error('💥 Error creating SplashManager:', error);
  }
});

// Also try immediate initialization if DOM is already loaded
if (document.readyState === 'loading') {
  console.log('📄 Document still loading, waiting for DOMContentLoaded...');
} else {
  console.log('📄 Document already loaded, initializing immediately...');
  try {
    const splashManager = new SplashManager();
    window.splashManager = splashManager; // For debugging
  } catch (error) {
    console.error('💥 Error in immediate initialization:', error);
  }
}

// Export for use in main app
window.SplashManager = SplashManager;