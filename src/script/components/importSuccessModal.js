/**
 * Import Success Modal - Shows after successful webform import
 * Provides option to open pedigree editor for the new family
 */

class ImportSuccessModal {
  constructor() {
    this.modal = null;
    this.familyData = null;
  }

  /**
   * Show the import success modal
   */
  show(importResult) {
    this.familyData = importResult;
    this.createModal();
    this.modal.show();
  }

  /**
   * Create the modal DOM structure
   */
  createModal() {
    const modalContent = `
      <div class="import-success-modal">
        <div class="success-header">
          <i class="fa fa-check-circle success-icon"></i>
          <h2>Etapa 1 / 2 Concluída!</h2>
        </div>
        
        <div class="import-details">
          <div class="detail-item">
            <strong>Nome da Família:</strong> ${this.familyData.familyName}
          </div>
          <div class="detail-item">
            <strong>ID da Família:</strong> ${this.familyData.familyId}
          </div>
          <div class="detail-item">
            <strong>Pedigree ID:</strong> ${this.familyData.pedigreeId}
          </div>
          <div class="detail-item">
            <strong>Paciente:</strong> ${this.familyData.patientName || 'Unknown'}
          </div>
        </div>

        <div class="modal-actions">
          <button class="btn btn-primary" onclick="importSuccessModal.openPedigreeEditor()">
            <i class="fa fa-sitemap"></i> Abrir Editor de Pedigree para Finalizar Importação.
          </button>
        </div>
      </div>
    `;

    // Create modal container
    const modalDiv = document.createElement('div');
    modalDiv.className = 'modal-overlay import-success-overlay';
    modalDiv.innerHTML = `
      <div class="modal-container import-success-container">
        <div class="modal-content">
          ${modalContent}
        </div>
      </div>
    `;

    document.body.appendChild(modalDiv);
    this.modal = modalDiv;

    // Add event listeners
    modalDiv.addEventListener('click', (e) => {
      if (e.target === modalDiv) {
        this.close();
      }
    });
  }

  /**
   * Open pedigree editor for this family
   */
  async openPedigreeEditor() {
    console.log('🎯 Opening pedigree editor for family:', this.familyData.familyId);
    
    try {
      // Use the existing launchPedigreeEditor function with pedigree name
      // This will automatically load the pedigree instead of showing template selection
      if (window.electronAPI && window.electronAPI.launchPedigreeEditor) {
        console.log('🚀 Launching pedigree editor with pedigree name:', this.familyData.familyName);
        
        // Launch the editor with family data as URL parameters for webform import
        const result = await window.electronAPI.launchPedigreeEditor(
          this.familyData.familyName, 
          null, // no template
          {
            familyId: this.familyData.familyId,
            pedigreeId: this.familyData.pedigreeId,
            familyName: this.familyData.familyName,
            isWebformImport: true
          }
        );
        
        console.log('✅ Pedigree editor launched:', result);
        
        // Close this modal after opening editor
        this.close();
        
      } else {
        throw new Error('Pedigree editor API not available');
      }
      
    } catch (error) {
      console.error('❌ Error opening pedigree editor:', error);
      alert('Error opening pedigree editor: ' + error.message);
    }
  }

  /**
   * Close the modal
   */
  close() {
    if (this.modal) {
      this.modal.remove();
      this.modal = null;
    }
  }
}

// Global instance
window.importSuccessModal = new ImportSuccessModal();

// CSS Styles for the modal
const styles = `
<style>
.import-success-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10000;
}

.import-success-container {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  max-width: 500px;
  width: 90%;
  max-height: 90%;
  overflow: auto;
}

.import-success-modal {
  padding: 30px;
}

.success-header {
  text-align: center;
  margin-bottom: 25px;
}

.success-icon {
  font-size: 48px;
  color: #28a745;
  margin-bottom: 15px;
}

.success-header h2 {
  margin: 0;
  color: #2c3e50;
  font-size: 24px;
}

.import-details {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 6px;
  margin-bottom: 25px;
}

.detail-item {
  margin-bottom: 10px;
  font-size: 14px;
  color: #495057;
}

.detail-item:last-child {
  margin-bottom: 0;
}

.detail-item strong {
  color: #2c3e50;
  display: inline-block;
  width: 120px;
}

.modal-actions {
  display: flex;
  justify-content: center;
  gap: 10px;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background-color 0.2s ease;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #5a6268;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-primary:hover {
  background: #0056b3;
}

.btn i {
  margin-right: 5px;
}
</style>
`;

// Inject styles
document.head.insertAdjacentHTML('beforeend', styles);
