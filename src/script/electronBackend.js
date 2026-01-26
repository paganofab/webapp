/**
 * Electron Database Backend for Open Pedigree
 * Provides save/load functionality using SQLite database
 */

class ElectronBackend {
  constructor() {
    this.isElectron = typeof window !== 'undefined' && window.electronAPI;
    this.currentPedigreeName = 'default_pedigree';
  }

  /**
   * Check if running in Electron environment
   */
  isAvailable() {
    return this.isElectron;
  }

  /**
   * Save pedigree data to database
   */
  async save(data, options = {}) {
    if (!this.isElectron) {
      throw new Error('Electron backend not available');
    }

    try {
      const pedigreeName = options.name || this.currentPedigreeName;
      console.log('🔄 ElectronBackend.save() called with:', { pedigreeName, dataType: typeof data });
      
      // Serialize data to ensure it can be cloned safely
      let serializedData;
      if (typeof data === 'string') {
        serializedData = data;
      } else {
        serializedData = JSON.stringify(data);
      }
      
      console.log('📤 Calling window.electronAPI.savePedigree...');
      const result = await window.electronAPI.savePedigree(pedigreeName, serializedData);
      
      console.log('📥 Received result from savePedigree:', result);
      if (result.success) {
        console.log('✅ Pedigree saved successfully:', pedigreeName);
        return { success: true, id: result.id };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error saving pedigree:', error);
      throw error;
    }
  }

  /**
   * Load pedigree data from database
   */
  async load(options = {}) {
    if (!this.isElectron) {
      throw new Error('Electron backend not available');
    }

    try {
      const pedigreeName = options.name || this.currentPedigreeName;
      const result = await window.electronAPI.loadPedigree(pedigreeName);
      
      if (result.success) {
        console.log('Pedigree loaded successfully:', pedigreeName);
        return result.data;
      } else {
        // Return empty data if pedigree doesn't exist
        console.log('No existing pedigree found, returning empty data');
        return null;
      }
    } catch (error) {
      console.error('Error loading pedigree:', error);
      throw error;
    }
  }

  /**
   * List all saved pedigrees
   */
  async listPedigrees() {
    if (!this.isElectron) {
      throw new Error('Electron backend not available');
    }

    try {
      const result = await window.electronAPI.listPedigrees();
      
      if (result.success) {
        return result.pedigrees;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error listing pedigrees:', error);
      throw error;
    }
  }

  /**
   * Delete a pedigree
   */
  async deletePedigree(name) {
    if (!this.isElectron) {
      throw new Error('Electron backend not available');
    }

    try {
      const result = await window.electronAPI.deletePedigree(name);
      
      if (result.success) {
        return result.deleted;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error deleting pedigree:', error);
      throw error;
    }
  }

  /**
   * Export pedigree to file
   */
  async exportToFile(name, format, data) {
    if (!this.isElectron) {
      throw new Error('Electron backend not available');
    }

    try {
      const result = await window.electronAPI.exportPedigree(name, format, data);
      
      if (result.success) {
        return result.path;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error exporting pedigree:', error);
      throw error;
    }
  }

  /**
   * Import pedigree from file
   */
  async importFromFile() {
    if (!this.isElectron) {
      throw new Error('Electron backend not available');
    }

    try {
      const result = await window.electronAPI.importPedigree();
      
      if (result.success) {
        return {
          data: result.data,
          filename: result.filename,
          extension: result.extension
        };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error importing pedigree:', error);
      throw error;
    }
  }

  /**
   * Set current pedigree name
   */
  setPedigreeName(name) {
    this.currentPedigreeName = name;
  }

  /**
   * Get current pedigree name
   */
  getPedigreeName() {
    return this.currentPedigreeName;
  }
}

export default ElectronBackend;
