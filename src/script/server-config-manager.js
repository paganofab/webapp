/**
 * Server Configuration Window Manager
 * Handles opening the server configuration in a separate window
 */

class ServerConfigManager {
  static openConfigWindow() {
    // Check if we're in Electron
    if (window.electronAPI) {
      // Open in new Electron window (would need IPC handler)
      console.log('Opening server config in Electron window');
      // For now, open in external browser
      window.open('server-config.html', '_blank', 'width=600,height=700,resizable=yes,scrollbars=yes');
    } else {
      // Open in new browser window/tab
      window.open('server-config.html', '_blank', 'width=600,height=700,resizable=yes,scrollbars=yes');
    }
  }

  static addConfigMenuItem() {
    // Add a configuration menu item to the main app
    const menuContainer = document.querySelector('.menu-container, .header-menu, nav');
    if (menuContainer) {
      const configButton = document.createElement('button');
      configButton.className = 'menu-item config-btn';
      configButton.innerHTML = '⚙️ Server Config';
      configButton.title = 'Configure license server connection';
      configButton.addEventListener('click', () => {
        ServerConfigManager.openConfigWindow();
      });
      
      menuContainer.appendChild(configButton);
    }
  }

  static getCurrentServerStatus() {
    const config = localStorage.getItem('pedigree_server_config');
    if (config) {
      try {
        const parsed = JSON.parse(config);
        return {
          configured: true,
          server: parsed.licenseServer,
          lastUpdated: parsed.lastUpdated
        };
      } catch (error) {
        return { configured: false };
      }
    }
    return { configured: false };
  }

  static showQuickStatus() {
    const status = ServerConfigManager.getCurrentServerStatus();
    if (status.configured) {
      console.log('📡 License server configured:', status.server);
      return status.server;
    } else {
      console.log('⚠️ No license server configured');
      return null;
    }
  }
}

// Auto-add config menu item when page loads
document.addEventListener('DOMContentLoaded', () => {
  // Wait a bit for the main app to load
  setTimeout(() => {
    ServerConfigManager.addConfigMenuItem();
    ServerConfigManager.showQuickStatus();
  }, 1000);
});

// Export for global use
window.ServerConfigManager = ServerConfigManager;
