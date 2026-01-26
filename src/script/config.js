/**
 * PedigreePro Configuration Manager
 * Handles license server URL detection and configuration
 */

class ConfigManager {
  constructor() {
    this.config = {
      licenseServer: 'https://medicinagenomica.org/api', // Primary PHP license server
      fallbackServers: [
        'https://medicinagenomica.org/api', // Primary server
        'http://localhost:3001',              // Local development fallback
        'http://192.168.1.100:3001',         // Local Pi fallback
      ],
      timeout: 10000 // 10 seconds for remote server
    };
    
    this.loadStoredConfig();
  }

  loadStoredConfig() {
    try {
      const stored = localStorage.getItem('pedigree_server_config');
      if (stored) {
        const storedConfig = JSON.parse(stored);
        if (storedConfig.licenseServer) {
          this.config.licenseServer = storedConfig.licenseServer;
          console.log('📡 Using stored license server:', this.config.licenseServer);
        }
      }
    } catch (error) {
      console.warn('Error loading stored config:', error);
    }
  }

  saveConfig() {
    try {
      localStorage.setItem('pedigree_server_config', JSON.stringify({
        licenseServer: this.config.licenseServer,
        lastUpdated: new Date().toISOString()
      }));
    } catch (error) {
      console.warn('Error saving config:', error);
    }
  }

  async detectLicenseServer() {
    console.log('🔍 Auto-detecting license server...');
    
    // If we have a stored server, try it first
    if (this.config.licenseServer) {
      console.log('🧪 Testing stored server:', this.config.licenseServer);
      if (await this.testServer(this.config.licenseServer)) {
        console.log('✅ Stored server is working');
        return this.config.licenseServer;
      }
    }

    // Try each fallback server
    for (const server of this.config.fallbackServers) {
      console.log('🧪 Testing server:', server);
      if (await this.testServer(server)) {
        console.log('✅ Found working server:', server);
        this.config.licenseServer = server;
        this.saveConfig();
        return server;
      }
    }

    // If no server found, prompt user
    console.log('❌ No license server found automatically');
    return await this.promptForServer();
  }

  async testServer(url) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
      
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

  async promptForServer() {
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
        <h3>🔧 License Server Configuration</h3>
        <p>We couldn't automatically find your license server. Please configure it manually:</p>
        
        <div class="form-group">
          <label for="server-url">License Server URL:</label>
          <input type="text" id="server-url" placeholder="https://medicinagenomica.org/api" value="https://medicinagenomica.org/api">
          <small class="form-hint">
            The default server is https://medicinagenomica.org/api<br>
            Or enter a custom server URL
          </small>
        </div>

        <div class="server-examples">
          <h4>Server Options:</h4>
          <ul>
            <li><code>https://medicinagenomica.org/api</code> - Primary license server</li>
            <li><code>http://localhost:3001</code> - Local development server</li>
            <li><code>http://192.168.1.100:3001</code> - Local network server</li>
          </ul>
        </div>

        <div class="modal-buttons">
          <button class="btn-secondary" id="test-connection">Test Connection</button>
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

      this.showConnectionStatus(statusDiv, 'Testing connection...', 'loading');
      testBtn.disabled = true;

      const isWorking = await this.testServer(url);
      
      if (isWorking) {
        this.showConnectionStatus(statusDiv, '✅ Connection successful!', 'success');
        saveBtn.textContent = 'Save & Continue';
        saveBtn.disabled = false;
      } else {
        this.showConnectionStatus(statusDiv, '❌ Connection failed. Check the URL and try again.', 'error');
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
      this.showConnectionStatus(statusDiv, 'Verifying connection...', 'loading');
      const isWorking = await this.testServer(url);
      
      if (isWorking) {
        this.config.licenseServer = url;
        this.saveConfig();
        modal.remove();
        resolve(url);
      } else {
        this.showConnectionStatus(statusDiv, '❌ Connection failed. Please verify the URL.', 'error');
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

  // Get the current license server URL
  getLicenseServerUrl() {
    return this.config.licenseServer;
  }

  // Method to find your Raspberry Pi IP automatically (if on same network)
  async findRaspberryPi() {
    // This is a simplified version - in a real implementation, you might use:
    // 1. mDNS/Bonjour to find .local addresses
    // 2. Network scanning of common IP ranges
    // 3. UPnP discovery
    
    const commonRanges = [
      '192.168.1.',   // Most common home router range
      '192.168.0.',   // Alternative home range
      '10.0.0.',      // Some routers use this
      '172.16.0.'     // Corporate networks sometimes
    ];

    const promises = [];
    
    for (const range of commonRanges) {
      // Test first 20 IPs in each range (1-20, skipping router IPs like .1)
      for (let i = 100; i <= 120; i++) {
        const ip = `http://${range}${i}:3001`;
        promises.push(this.testServer(ip).then(working => ({ ip, working })));
      }
    }

    try {
      const results = await Promise.allSettled(promises);
      const workingServers = results
        .filter(result => result.status === 'fulfilled' && result.value.working)
        .map(result => result.value.ip);

      return workingServers;
    } catch (error) {
      console.warn('Error during network scan:', error);
      return [];
    }
  }
}

// Create global config instance
window.PedigreeConfig = new ConfigManager();
