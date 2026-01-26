/**
 * TabManager Class for PedigreePro
 * Manages browser-style tabs for modules
 */

console.log('🔧 TabManager module loading...');

class TabManager {
  constructor({ listEl, panelsEl, storageKey = null }) {
    // Add unique ID for debugging
    this.instanceId = Math.random().toString(36).substr(2, 9);
    console.log(`🆔 Creating TabManager instance: ${this.instanceId}`);
    
    this.listEl = listEl;
    this.panelsEl = panelsEl;
    this.storageKey = storageKey;
    this.tabs = new Map();
    this.activeId = null;
    this.tabHistory = []; // Track tab activation history for better navigation

    // Initialize event listeners
    this.initializeEventListeners();

    // Persist tabs on window unload
    window.addEventListener('beforeunload', () => this.persist());
  }

  /**
   * Initialize or reinitialize event listeners
   */
  initializeEventListeners() {
    // Remove any existing listeners first
    if (this.clickHandler) {
      this.listEl.removeEventListener('click', this.clickHandler, true);
    }

    // Create bound handler so we can remove it later
    this.clickHandler = (e) => {
      const tab = e.target.closest('.tab');
      if (!tab) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      if (e.target.closest('.tab-close')) {
        this.closeTab(tab.dataset.tabId);
      } else {
        this.activateTab(tab.dataset.tabId);
      }
    };

    // Bind event listeners with capture phase to ensure we get events before global handlers
    this.listEl.addEventListener('click', this.clickHandler, true); // Use capture phase to get events before global handlers
  }

  /**
   * Update DOM element references and reinitialize event listeners
   */
  updateDOMReferences(listEl, panelsEl) {
    console.log(`🔧 [${this.instanceId}] Updating DOM references...`);
    this.listEl = listEl;
    this.panelsEl = panelsEl;
    this.initializeEventListeners();
    console.log(`🔧 [${this.instanceId}] DOM references updated and event listeners reinitialized`);
  }

  /**
   * Open a new tab
   * @param {Object} config - Tab configuration
   * @param {string} config.id - Unique tab identifier
   * @param {string} config.title - Tab title
   * @param {Function} config.render - Function to render tab content
   */
  openTab({ id, title, content, render, isClosable = true, metadata = null }) {
    console.log(`🆔 [${this.instanceId}] Opening tab: ${id} (tabs Map size: ${this.tabs.size})`);
    
    // If tab exists, just activate it
    if (this.tabs.has(id)) {
      this.activateTab(id);
      return;
    }

    // Create tab
    const tab = document.createElement('div');
    tab.className = 'tab';
    tab.dataset.tabId = id;
    tab.innerHTML = `
      <span class="tab-title">${title}</span>
      ${isClosable ? '<button class="tab-close">×</button>' : ''}
    `;

    // Create panel
    const panel = document.createElement('div');
    panel.className = 'tab-panel';
    panel.id = `panel-${id}`;
    
    // Handle different content types
    if (typeof render === 'function') {
      render(panel);
    } else if (typeof content === 'string') {
      panel.innerHTML = content;
    } else if (content instanceof HTMLElement) {
      panel.appendChild(content);
    }

    this.listEl.appendChild(tab);
    this.panelsEl.appendChild(panel);

    // Store tab data with metadata for restoration
    this.tabs.set(id, { 
      id,
      title, 
      isClosable,
      metadata, // Store metadata for proper restoration
      tabEl: tab, 
      panelEl: panel 
    });

    console.log(`🆔 [${this.instanceId}] Tab stored. Map size now: ${this.tabs.size}`);
    console.log(`🆔 [${this.instanceId}] Map keys: ${Array.from(this.tabs.keys())}`);
    console.log(`🆔 [${this.instanceId}] Just stored tab data:`, this.tabs.get(id));

    this.activateTab(id);
  }

  /**
   * Activate a tab
   * @param {string} id - Tab identifier
   */
  activateTab(id) {
    if (!this.tabs.has(id)) {
      console.warn(`Tab ${id} does not exist`);
      return;
    }
    
    // Add current tab to history before switching (if there is one)
    if (this.activeId && this.activeId !== id) {
      // Remove from history if it was there, then add to end
      this.tabHistory = this.tabHistory.filter(tabId => tabId !== this.activeId);
      this.tabHistory.push(this.activeId);
    }
    
    this.activeId = id;

    // Update all tabs
    this.tabs.forEach(({ tabEl, panelEl }, tabId) => {
      const isActive = (tabId === id);
      
      // Update tab button
      tabEl.setAttribute('aria-selected', isActive ? 'true' : 'false');
      tabEl.tabIndex = isActive ? 0 : -1;
      
      // Update panel
      panelEl.classList.toggle('active', isActive);
    });

    // Scroll tab into view if needed
    this.scrollTabIntoView(id);
    
    console.log(`✅ Activated tab: ${id}`);
  }

  /**
   * Close a tab
   * @param {string} id - Tab identifier
   */
  closeTab(id) {
    const tab = this.tabs.get(id);
    if (!tab) {
      console.warn(`Tab ${id} does not exist`);
      return;
    }

    // Check if tab is closable
    if (tab.isClosable === false) {
      console.log(`Tab ${id} is not closable`);
      return;
    }

    // Remove DOM elements
    tab.tabEl.remove();
    tab.panelEl.remove();
    
    // Remove from tabs map
    this.tabs.delete(id);
    
    // Remove from history
    this.tabHistory = this.tabHistory.filter(tabId => tabId !== id);

    // If this was the active tab, activate another one
    if (this.activeId === id) {
      let nextActiveTab = null;
      
      // First try to activate the most recent tab from history
      while (this.tabHistory.length > 0 && !nextActiveTab) {
        const historyId = this.tabHistory.pop();
        if (this.tabs.has(historyId)) {
          nextActiveTab = historyId;
        }
      }
      
      // If no history or history tab doesn't exist, use the last remaining tab
      if (!nextActiveTab) {
        const remaining = Array.from(this.tabs.values());
        if (remaining.length > 0) {
          nextActiveTab = remaining[remaining.length - 1].id;
        }
      }
      
      if (nextActiveTab) {
        this.activateTab(nextActiveTab);
      } else {
        this.activeId = null;
      }
    }

    this.persist();
    
    console.log(`❌ Closed tab: ${tab.title} (${id})`);
  }

  /**
   * Update tab title
   * @param {string} id - Tab identifier
   * @param {string} newTitle - New title
   */
  updateTabTitle(id, newTitle) {
    const tab = this.tabs.get(id);
    if (!tab) return;

    tab.title = newTitle;
    const titleEl = tab.tabEl.querySelector('.tab-title');
    if (titleEl) {
      titleEl.textContent = newTitle;
      titleEl.title = newTitle;
    }

    this.persist();
  }

  /**
   * Get active tab ID
   * @returns {string|null} Active tab ID
   */
  getActiveTabId() {
    return this.activeId;
  }

  /**
   * Get all tab IDs
   * @returns {Array<string>} Array of tab IDs
   */
  getTabIds() {
    return Array.from(this.tabs.keys());
  }

  /**
   * Check if tab exists
   * @param {string} id - Tab identifier
   * @returns {boolean} True if tab exists
   */
  hasTab(id) {
    return this.tabs.has(id);
  }

  /**
   * Close all tabs
   */
  closeAllTabs() {
    const tabIds = Array.from(this.tabs.keys());
    tabIds.forEach(id => this.closeTab(id));
  }

  /**
   * Scroll tab into view
   * @param {string} id - Tab identifier
   */
  scrollTabIntoView(id) {
    const tab = this.tabs.get(id);
    if (!tab) return;

    const tabEl = tab.tabEl;
    const scrollContainer = this.listEl.parentElement;
    
    if (scrollContainer) {
      const tabRect = tabEl.getBoundingClientRect();
      const containerRect = scrollContainer.getBoundingClientRect();
      
      if (tabRect.left < containerRect.left) {
        scrollContainer.scrollLeft -= (containerRect.left - tabRect.left + 20);
      } else if (tabRect.right > containerRect.right) {
        scrollContainer.scrollLeft += (tabRect.right - containerRect.right + 20);
      }
    }
  }

  /**
   * Persist current tab state to storage
   */
  persist() {
    console.log(`🆔 [${this.instanceId}] persist() called`);
    
    if (!this.storageKey) {
      console.log('⚠️ No storage key provided, skipping persistence');
      return;
    }
    
    try {
      console.log(`💾 [${this.instanceId}] TabManager state before persist:`);
      console.log('💾 - activeId:', this.activeId);
      console.log('💾 - tabHistory:', this.tabHistory);
      console.log('💾 - tabs Map size:', this.tabs.size);
      console.log('💾 - tabs Map keys:', Array.from(this.tabs.keys()));
      
      // Create tabs array manually to avoid potential Map corruption with DOM elements
      const tabsArray = [];
      for (const [id, tabData] of this.tabs) {
        // Only persist non-DOM data
        tabsArray.push({
          id,
          title: tabData.title,
          isClosable: tabData.isClosable,
          metadata: tabData.metadata
        });
      }
      
      console.log('💾 - extracted tabs data:', tabsArray);
      
      const state = {
        activeId: this.activeId,
        tabHistory: this.tabHistory,
        tabs: tabsArray
      };
      
      console.log('💾 Persisting tabs with storage key:', this.storageKey);
      console.log('💾 State to persist:', state);
      sessionStorage.setItem(this.storageKey, JSON.stringify(state));
      console.log(`💾 Successfully persisted ${state.tabs.length} tabs with metadata`);
    } catch (error) {
      console.error('❌ Failed to persist tab state:', error);
    }
  }

  /**
   * Restore tab state from storage
   */
  restore() {
    if (!this.storageKey) {
      console.log('⚠️ No storage key provided, skipping restoration');
      return false;
    }
    
    try {
      console.log('🔄 Attempting to restore with storage key:', this.storageKey);
      const raw = sessionStorage.getItem(this.storageKey);
      console.log('🔄 Raw storage data:', raw);
      
      if (!raw) {
        console.log('No stored tab state found');
        return false;
      }
      
      const { activeId, tabHistory, tabs } = JSON.parse(raw);
      console.log('🔄 Parsed storage data:', { activeId, tabHistory, tabs });
      
      if (!tabs || tabs.length === 0) {
        console.log('No tabs to restore');
        return false;
      }
      
      // Clear existing tabs but preserve DOM structure
      this.tabs.clear();
      this.listEl.innerHTML = '';
      this.panelsEl.innerHTML = '';
      this.activeId = null;
      this.tabHistory = tabHistory || [];
      
      console.log(`🔄 Restoring ${tabs.length} tabs...`);
      
      // Emit restoration event so parent can handle tab recreation
      console.log('🔄 Dispatching tabs-restore-requested event...');
      const event = new CustomEvent('tabs-restore-requested', {
        detail: { tabs, activeId },
        bubbles: true
      });
      console.log('🔄 Event created:', event);
      console.log('🔄 Dispatching to listEl:', this.listEl);
      this.listEl.dispatchEvent(event);
      console.log('🔄 Event dispatched successfully');
      
      return true;
    } catch (error) {
      console.error('❌ Failed to restore tab state:', error);
      return false;
    }
  }

  /**
   * Complete restoration by activating the correct tab
   * Called after tabs have been recreated via events
   */
  completeRestoration(activeId) {
    if (activeId && this.tabs.has(activeId)) {
      this.activateTab(activeId);
    } else if (this.tabs.size > 0) {
      // Fallback to first tab if stored active tab doesn't exist
      const firstTabId = Array.from(this.tabs.keys())[0];
      this.activateTab(firstTabId);
    }
    console.log(`✅ Restoration completed, activated tab: ${this.activeId}`);
  }

  /**
   * Escape HTML to prevent XSS
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

console.log('🔧 TabManager class defined');

// Export for ES6 modules
export default TabManager;

// Also make available globally for legacy components
if (typeof window !== 'undefined') {
  window.TabManager = TabManager;
  console.log('🔧 TabManager added to window globally from tab-manager.js');
}

console.log('🔧 TabManager module loaded completely');
