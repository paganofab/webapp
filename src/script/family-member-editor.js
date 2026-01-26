/**
 * Family Member Editor
 * Handles editing and updating individual family member details
 */
class FamilyMemberEditor {
  constructor(familyId, memberId = null) {
    this.familyId = familyId;
    this.memberId = memberId;
    this.memberData = null;
    this.isEditing = memberId !== null;
    this.modalElement = null;
    
    this.initializeEditor();
  }

  /**
   * Get i18n instance or fallback
   */
  getI18n() {
    if (window.i18n && window.i18n.translations && Object.keys(window.i18n.translations).length > 0) {
      return window.i18n;
    }
    
    console.warn('i18n not ready or translations not loaded, using fallback');
    
    // Fallback i18n with family member editor translations
    return {
      t: (key, fallback = key) => {
        const fallbacks = {
          'familyMemberEditor.editMember': 'Edit Family Member',
          'familyMemberEditor.addMember': 'Add Family Member',
          'familyMemberEditor.cancel': 'Cancel',
          'familyMemberEditor.update': 'Update',
          'familyMemberEditor.add': 'Add',
          'familyMemberEditor.member': 'Member',
          'familyMemberEditor.basicInformation': 'Basic Information',
          'familyMemberEditor.firstName': 'First Name',
          'familyMemberEditor.lastName': 'Last Name',
          'familyMemberEditor.maidenName': 'Maiden Name',
          'familyMemberEditor.nickname': 'Nickname',
          'familyMemberEditor.gender': 'Gender',
          'familyMemberEditor.selectGender': 'Select Gender',
          'familyMemberEditor.male': 'Male',
          'familyMemberEditor.female': 'Female',
          'familyMemberEditor.other': 'Other',
          'familyMemberEditor.ethnicity': 'Ethnicity',
          'familyMemberEditor.isProband': 'Is Proband (Index Person)',
          'familyMemberEditor.birthDeathInformation': 'Birth and Death Information',
          'familyMemberEditor.birthDate': 'Birth Date',
          'familyMemberEditor.birthDateEstimated': 'Birth date is estimated',
          'familyMemberEditor.isAlive': 'Is alive',
          'familyMemberEditor.deathDate': 'Death Date',
          'familyMemberEditor.deathDateEstimated': 'Death date is estimated',
          'familyMemberEditor.familyInformation': 'Family Information',
          'familyMemberEditor.isAdopted': 'Is adopted',
          'familyMemberEditor.consanguineousRelationship': 'Consanguineous relationship',
          'familyMemberEditor.contactInformation': 'Contact Information',
          'familyMemberEditor.phone': 'Phone',
          'familyMemberEditor.email': 'Email',
          'familyMemberEditor.address': 'Address',
          'familyMemberEditor.professionalInformation': 'Professional Information',
          'familyMemberEditor.occupation': 'Occupation',
          'familyMemberEditor.educationLevel': 'Education Level',
          'familyMemberEditor.selectEducationLevel': 'Select Education Level',
          'familyMemberEditor.elementary': 'Elementary',
          'familyMemberEditor.highSchool': 'High School',
          'familyMemberEditor.college': 'College',
          'familyMemberEditor.graduate': 'Graduate',
          'familyMemberEditor.postgraduate': 'Postgraduate',
          'familyMemberEditor.physicalCharacteristics': 'Physical Characteristics',
          'familyMemberEditor.height': 'Height (cm)',
          'familyMemberEditor.weight': 'Weight (kg)',
          'familyMemberEditor.eyeColor': 'Eye Color',
          'familyMemberEditor.hairColor': 'Hair Color',
          'familyMemberEditor.skinColor': 'Skin Color',
          'familyMemberEditor.karyotype': 'Karyotype',
          'familyMemberEditor.notes': 'Notes',
          'familyMemberEditor.additionalNotes': 'Additional Notes',
          'familyMemberEditor.saving': 'Saving...',
          'familyMemberEditor.memberUpdatedSuccess': 'Member updated successfully!',
          'familyMemberEditor.memberAddedSuccess': 'Member added successfully!',
          'familyMemberEditor.updateMember': 'Update Member',
          'familyMemberEditor.addMember': 'Add Member',
          'familyMemberEditor.errorLoadingMember': 'Error loading member data: ',
          'familyMemberEditor.errorSavingMember': 'Error saving member: ',
          'familyMemberEditor.memberNotFound': 'Member not found',
          'familyMemberEditor.failedToSave': 'Failed to save member',
          'familyMemberEditor.fixErrors': 'Please fix the following errors:',
          'familyMemberEditor.firstNameRequired': 'First name is required',
          'familyMemberEditor.deathAfterBirth': 'Death date must be after birth date',
          'familyMemberEditor.validEmail': 'Please enter a valid email address',
          'familyMemberEditor.heightRange': 'Height must be between 0 and 300 cm',
          'familyMemberEditor.weightRange': 'Weight must be between 0 and 1000 kg'
        };
        const result = fallbacks[key] || fallback || key;
        if (result === key) {
          console.warn(`Missing translation for key: ${key}`);
        }
        return result;
      }
    };
  }

  /**
   * Get translation
   */
  t(key, fallback = key, variables = {}) {
    return this.getI18n().t(key, fallback, variables);
  }

  /**
   * Initialize the editor
   */
  async initializeEditor() {
    if (this.isEditing) {
      await this.loadMemberData();
    }
    this.createModal();
    this.show();
  }

  /**
   * Load existing member data for editing
   */
  async loadMemberData() {
    try {
      const result = await window.electronAPI.invoke('family-center-get-family-member', this.memberId);
      if (result) {
        this.memberData = result;
      } else {
        throw new Error(this.t('familyMemberEditor.memberNotFound'));
      }
    } catch (error) {
      console.error('Error loading member data:', error);
      alert(this.t('familyMemberEditor.errorLoadingMember') + error.message);
    }
  }

  /**
   * Create the modal dialog
   */
  createModal() {
    const modalContainer = document.getElementById('modal-container') || this.createModalContainer();
    
    const title = this.isEditing ? this.t('familyMemberEditor.editMember') : this.t('familyMemberEditor.addMember');
    
    this.modalElement = document.createElement('div');
    this.modalElement.className = 'modal-backdrop';
    this.modalElement.innerHTML = `
      <div class="modal family-member-modal">
        <div class="modal-header">
          <h3 class="modal-title">${title}</h3>
          <button class="modal-close" type="button">×</button>
        </div>
        <div class="modal-body">
          ${this.renderForm()}
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-action="cancel">${this.t('familyMemberEditor.cancel')}</button>
          <button type="button" class="btn btn-primary" data-action="save">
            ${this.isEditing ? this.t('familyMemberEditor.update') : this.t('familyMemberEditor.add')} ${this.t('familyMemberEditor.member')}
          </button>
        </div>
      </div>
    `;

    modalContainer.appendChild(this.modalElement);
    this.setupEventListeners();
  }

  /**
   * Create modal container if it doesn't exist
   */
  createModalContainer() {
    let container = document.getElementById('modal-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'modal-container';
      document.body.appendChild(container);
    }
    return container;
  }

  /**
   * Render the form
   */
  renderForm() {
    const data = this.memberData || {};
    
    return `
      <form class="family-member-form">
        <!-- Basic Information -->
        <div class="form-section">
          <h4>${this.t('familyMemberEditor.basicInformation')}</h4>
          <div class="form-row">
            <div class="form-group">
              <label for="first_name">${this.t('familyMemberEditor.firstName')} *</label>
              <input type="text" id="first_name" name="first_name" 
                     value="${this.escapeHtml(data.first_name || '')}" required>
            </div>
            <div class="form-group">
              <label for="last_name">${this.t('familyMemberEditor.lastName')}</label>
              <input type="text" id="last_name" name="last_name" 
                     value="${this.escapeHtml(data.last_name || '')}">
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="maiden_name">${this.t('familyMemberEditor.maidenName')}</label>
              <input type="text" id="maiden_name" name="maiden_name" 
                     value="${this.escapeHtml(data.maiden_name || '')}">
            </div>
            <div class="form-group">
              <label for="nickname">${this.t('familyMemberEditor.nickname')}</label>
              <input type="text" id="nickname" name="nickname" 
                     value="${this.escapeHtml(data.nickname || '')}">
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="gender">${this.t('familyMemberEditor.gender')}</label>
              <select id="gender" name="gender">
                <option value="">${this.t('familyMemberEditor.selectGender')}</option>
                <option value="male" ${data.gender === 'male' ? 'selected' : ''}>${this.t('familyMemberEditor.male')}</option>
                <option value="female" ${data.gender === 'female' ? 'selected' : ''}>${this.t('familyMemberEditor.female')}</option>
                <option value="other" ${data.gender === 'other' ? 'selected' : ''}>${this.t('familyMemberEditor.other')}</option>
              </select>
            </div>
            <div class="form-group">
              <label for="ethnicity">${this.t('familyMemberEditor.ethnicity')}</label>
              <input type="text" id="ethnicity" name="ethnicity" 
                     value="${this.escapeHtml(data.ethnicity || '')}">
            </div>
          </div>

          <div class="form-row">
            <div class="form-group checkbox-group">
              <label>
                <input type="checkbox" name="is_proband" ${data.is_proband ? 'checked' : ''}>
                ${this.t('familyMemberEditor.isProband')}
              </label>
            </div>
          </div>
        </div>

        <!-- Birth and Death Information -->
        <div class="form-section">
          <h4>${this.t('familyMemberEditor.birthDeathInformation')}</h4>
          <div class="form-row">
            <div class="form-group">
              <label for="birth_date">${this.t('familyMemberEditor.birthDate')}</label>
              <input type="date" id="birth_date" name="birth_date" 
                     value="${data.birth_date || ''}">
            </div>
            <div class="form-group checkbox-group">
              <label>
                <input type="checkbox" name="birth_date_estimated" ${data.birth_date_estimated ? 'checked' : ''}>
                ${this.t('familyMemberEditor.birthDateEstimated')}
              </label>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group checkbox-group">
              <label>
                <input type="checkbox" name="is_alive" ${data.is_alive !== false ? 'checked' : ''}>
                ${this.t('familyMemberEditor.isAlive')}
              </label>
            </div>
          </div>

          <div class="form-row death-info" style="display: ${data.is_alive === false ? 'flex' : 'none'};">
            <div class="form-group">
              <label for="death_date">${this.t('familyMemberEditor.deathDate')}</label>
              <input type="date" id="death_date" name="death_date" 
                     value="${data.death_date || ''}">
            </div>
            <div class="form-group checkbox-group">
              <label>
                <input type="checkbox" name="death_date_estimated" ${data.death_date_estimated ? 'checked' : ''}>
                ${this.t('familyMemberEditor.deathDateEstimated')}
              </label>
            </div>
          </div>
        </div>

        <!-- Family Information -->
        <div class="form-section">
          <h4>${this.t('familyMemberEditor.familyInformation')}</h4>
          <div class="form-row">
            <div class="form-group checkbox-group">
              <label>
                <input type="checkbox" name="is_adopted" ${data.is_adopted ? 'checked' : ''}>
                ${this.t('familyMemberEditor.isAdopted')}
              </label>
            </div>
            <div class="form-group checkbox-group">
              <label>
                <input type="checkbox" name="is_consanguineous" ${data.is_consanguineous ? 'checked' : ''}>
                ${this.t('familyMemberEditor.consanguineousRelationship')}
              </label>
            </div>
          </div>
        </div>

        <!-- Contact Information -->
        <div class="form-section">
          <h4>${this.t('familyMemberEditor.contactInformation')}</h4>
          <div class="form-row">
            <div class="form-group">
              <label for="phone">${this.t('familyMemberEditor.phone')}</label>
              <input type="tel" id="phone" name="phone" 
                     value="${this.escapeHtml(data.phone || '')}">
            </div>
            <div class="form-group">
              <label for="email">${this.t('familyMemberEditor.email')}</label>
              <input type="email" id="email" name="email" 
                     value="${this.escapeHtml(data.email || '')}">
            </div>
          </div>

          <div class="form-group">
            <label for="address">${this.t('familyMemberEditor.address')}</label>
            <textarea id="address" name="address" rows="3">${this.escapeHtml(data.address || '')}</textarea>
          </div>
        </div>

        <!-- Professional Information -->
        <div class="form-section">
          <h4>${this.t('familyMemberEditor.professionalInformation')}</h4>
          <div class="form-row">
            <div class="form-group">
              <label for="occupation">${this.t('familyMemberEditor.occupation')}</label>
              <input type="text" id="occupation" name="occupation" 
                     value="${this.escapeHtml(data.occupation || '')}">
            </div>
            <div class="form-group">
              <label for="education_level">${this.t('familyMemberEditor.educationLevel')}</label>
              <select id="education_level" name="education_level">
                <option value="">${this.t('familyMemberEditor.selectEducationLevel')}</option>
                <option value="elementary" ${data.education_level === 'elementary' ? 'selected' : ''}>${this.t('familyMemberEditor.elementary')}</option>
                <option value="high_school" ${data.education_level === 'high_school' ? 'selected' : ''}>${this.t('familyMemberEditor.highSchool')}</option>
                <option value="college" ${data.education_level === 'college' ? 'selected' : ''}>${this.t('familyMemberEditor.college')}</option>
                <option value="graduate" ${data.education_level === 'graduate' ? 'selected' : ''}>${this.t('familyMemberEditor.graduate')}</option>
                <option value="postgraduate" ${data.education_level === 'postgraduate' ? 'selected' : ''}>${this.t('familyMemberEditor.postgraduate')}</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Physical Characteristics -->
        <div class="form-section">
          <h4>${this.t('familyMemberEditor.physicalCharacteristics')}</h4>
          <div class="form-row">
            <div class="form-group">
              <label for="height">${this.t('familyMemberEditor.height')}</label>
              <input type="number" id="height" name="height" step="0.1" 
                     value="${data.height || ''}">
            </div>
            <div class="form-group">
              <label for="weight">${this.t('familyMemberEditor.weight')}</label>
              <input type="number" id="weight" name="weight" step="0.1" 
                     value="${data.weight || ''}">
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="eye_color">${this.t('familyMemberEditor.eyeColor')}</label>
              <input type="text" id="eye_color" name="eye_color" 
                     value="${this.escapeHtml(data.eye_color || '')}">
            </div>
            <div class="form-group">
              <label for="hair_color">${this.t('familyMemberEditor.hairColor')}</label>
              <input type="text" id="hair_color" name="hair_color" 
                     value="${this.escapeHtml(data.hair_color || '')}">
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="skin_color">${this.t('familyMemberEditor.skinColor')}</label>
              <input type="text" id="skin_color" name="skin_color" 
                     value="${this.escapeHtml(data.skin_color || '')}">
            </div>
            <div class="form-group">
              <label for="karyotype">${this.t('familyMemberEditor.karyotype')}</label>
              <input type="text" id="karyotype" name="karyotype" 
                     value="${this.escapeHtml(data.karyotype || '')}">
            </div>
          </div>
        </div>

        <!-- Notes -->
        <div class="form-section">
          <h4>${this.t('familyMemberEditor.notes')}</h4>
          <div class="form-group">
            <label for="notes">${this.t('familyMemberEditor.additionalNotes')}</label>
            <textarea id="notes" name="notes" rows="4">${this.escapeHtml(data.notes || '')}</textarea>
          </div>
        </div>
      </form>
    `;
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    const modal = this.modalElement.querySelector('.modal');
    const closeBtn = this.modalElement.querySelector('.modal-close');
    const cancelBtn = this.modalElement.querySelector('[data-action="cancel"]');
    const saveBtn = this.modalElement.querySelector('[data-action="save"]');
    const isAliveCheckbox = this.modalElement.querySelector('[name="is_alive"]');
    const deathInfo = this.modalElement.querySelector('.death-info');

    // Close modal events
    closeBtn.addEventListener('click', () => this.close());
    cancelBtn.addEventListener('click', () => this.close());
    
    // Click outside modal to close
    this.modalElement.addEventListener('click', (e) => {
      if (e.target === this.modalElement) {
        this.close();
      }
    });

    // Prevent modal from closing when clicking inside
    modal.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    // Save button
    saveBtn.addEventListener('click', () => this.saveMember());

    // Toggle death information based on is_alive checkbox
    isAliveCheckbox.addEventListener('change', (e) => {
      deathInfo.style.display = e.target.checked ? 'none' : 'flex';
    });

    // Form validation
    const form = this.modalElement.querySelector('.family-member-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveMember();
    });

    // Auto-capitalize names
    const nameFields = ['first_name', 'last_name', 'maiden_name', 'nickname'];
    nameFields.forEach(fieldName => {
      const field = this.modalElement.querySelector(`[name="${fieldName}"]`);
      if (field) {
        field.addEventListener('input', (e) => {
          const words = e.target.value.split(' ');
          const capitalized = words.map(word => 
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
          );
          e.target.value = capitalized.join(' ');
        });
      }
    });
  }

  /**
   * Collect form data
   */
  collectFormData() {
    const form = this.modalElement.querySelector('.family-member-form');
    const formData = new FormData(form);
    
    const data = {};
    
    // Text fields
    const textFields = [
      'first_name', 'last_name', 'maiden_name', 'nickname', 'gender', 'ethnicity',
      'birth_date', 'death_date', 'phone', 'email', 'address', 'occupation', 
      'education_level', 'eye_color', 'hair_color', 'skin_color', 'karyotype', 'notes'
    ];
    
    textFields.forEach(field => {
      const value = formData.get(field);
      data[field] = value && value.trim() !== '' ? value.trim() : null;
    });

    // Numeric fields
    const numericFields = ['height', 'weight'];
    numericFields.forEach(field => {
      const value = formData.get(field);
      data[field] = value && value.trim() !== '' ? parseFloat(value) : null;
    });

    // Boolean fields
    const booleanFields = [
      'is_proband', 'birth_date_estimated', 'is_alive', 
      'death_date_estimated', 'is_adopted', 'is_consanguineous'
    ];
    
    booleanFields.forEach(field => {
      data[field] = formData.has(field) ? 1 : 0;
    });

    // Special handling for is_alive
    if (!data.is_alive) {
      data.is_alive = 0;
    }

    return data;
  }

  /**
   * Validate form data
   */
  validateFormData(data) {
    const errors = [];

    if (!data.first_name || data.first_name.trim() === '') {
      errors.push(this.t('familyMemberEditor.firstNameRequired'));
    }

    if (data.birth_date && data.death_date) {
      const birthDate = new Date(data.birth_date);
      const deathDate = new Date(data.death_date);
      if (deathDate <= birthDate) {
        errors.push(this.t('familyMemberEditor.deathAfterBirth'));
      }
    }

    if (data.email && data.email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        errors.push(this.t('familyMemberEditor.validEmail'));
      }
    }

    if (data.height && (data.height < 0 || data.height > 300)) {
      errors.push(this.t('familyMemberEditor.heightRange'));
    }

    if (data.weight && (data.weight < 0 || data.weight > 1000)) {
      errors.push(this.t('familyMemberEditor.weightRange'));
    }

    return errors;
  }

  /**
   * Save member data
   */
  async saveMember() {
    try {
      const data = this.collectFormData();
      const errors = this.validateFormData(data);

      if (errors.length > 0) {
        alert(this.t('familyMemberEditor.fixErrors') + '\n\n' + errors.join('\n'));
        return;
      }

      const saveBtn = this.modalElement.querySelector('[data-action="save"]');
      saveBtn.disabled = true;
      saveBtn.textContent = this.t('familyMemberEditor.saving');

      let result;
      if (this.isEditing) {
        result = await window.electronAPI.invoke('family-center-update-family-member', this.memberId, data);
      } else {
        result = await window.electronAPI.invoke('family-center-add-family-member', this.familyId, data);
      }

      if (result) {
        this.showSuccessMessage(this.isEditing ? this.t('familyMemberEditor.memberUpdatedSuccess') : this.t('familyMemberEditor.memberAddedSuccess'));
        
        // Trigger refresh event
        document.dispatchEvent(new CustomEvent('family-member-updated', {
          detail: { familyId: this.familyId, member: result }
        }));

        this.close();
      } else {
        throw new Error(this.t('familyMemberEditor.failedToSave'));
      }

    } catch (error) {
      console.error('Error saving member:', error);
      alert(this.t('familyMemberEditor.errorSavingMember') + error.message);
      
      const saveBtn = this.modalElement.querySelector('[data-action="save"]');
      saveBtn.disabled = false;
      saveBtn.textContent = this.isEditing ? this.t('familyMemberEditor.updateMember') : this.t('familyMemberEditor.addMember');
    }
  }

  /**
   * Show success message
   */
  showSuccessMessage(message) {
    // Create a temporary success message
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #4CAF50;
      color: white;
      padding: 12px 20px;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      font-weight: 500;
    `;
    successDiv.textContent = message;
    
    document.body.appendChild(successDiv);
    
    setTimeout(() => {
      if (successDiv.parentNode) {
        successDiv.parentNode.removeChild(successDiv);
      }
    }, 3000);
  }

  /**
   * Show the modal
   */
  show() {
    const container = document.getElementById('modal-container');
    if (container) {
      container.style.display = 'block';
    }
  }

  /**
   * Close the modal
   */
  close() {
    if (this.modalElement && this.modalElement.parentNode) {
      this.modalElement.parentNode.removeChild(this.modalElement);
    }
    
    const container = document.getElementById('modal-container');
    if (container && container.children.length === 0) {
      container.style.display = 'none';
    }
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Make FamilyMemberEditor available globally (no ES6 export for regular script tags)
window.FamilyMemberEditor = FamilyMemberEditor;