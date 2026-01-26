import i18n from 'pedigree/i18n';

/**
 * The UI Element for saving pedigrees with name input
 *
 * @class SavePedigreeDialog
 */

var SavePedigreeDialog = Class.create( {

  initialize: function() {
    this.mainDiv = new Element('div', {'class': 'save-pedigree-container'});
    this.createSaveForm();
    
    var closeShortcut = ['Esc'];
    this.dialog = new PedigreePro.widgets.ModalPopup(this.mainDiv, {close: {method : this.hide.bind(this), keys : closeShortcut}}, {
      extraClassName: 'save-pedigree-dialog', 
      title: i18n.t('menu.save') + ' ' + i18n.t('templates.title'), 
      displayCloseButton: true
    });
  },

  /**
   * Create the save form with name input and buttons
   */
  createSaveForm: function() {
    this.mainDiv.update();
    
    // Create form elements
    var form = new Element('div', {'class': 'save-form'});
    
    // Name input section
    var nameSection = new Element('div', {'class': 'form-section'});
    var nameLabel = new Element('label', {'for': 'pedigree-name'}).update(i18n.t('dialog.enterPedigreeName') + ':');
    this.nameInput = new Element('input', {
      'type': 'text', 
      'id': 'pedigree-name',
      'class': 'pedigree-name-input',
      'placeholder': i18n.t('dialog.enterPedigreeName'),
      'value': 'New Pedigree'
    });
    
    nameSection.insert(nameLabel);
    nameSection.insert(this.nameInput);
    form.insert(nameSection);
    
    // Buttons section
    var buttonsSection = new Element('div', {'class': 'form-buttons'});
    
    this.saveButton = new Element('button', {'class': 'save-btn primary'}).update(i18n.t('buttons.save'));
    this.cancelButton = new Element('button', {'class': 'cancel-btn'}).update(i18n.t('buttons.cancel'));
    
    buttonsSection.insert(this.saveButton);
    buttonsSection.insert(' ');
    buttonsSection.insert(this.cancelButton);
    form.insert(buttonsSection);
    
    this.mainDiv.insert(form);
    
    // Add event listeners
    var _this = this;
    this.saveButton.observe('click', function() {
      _this.performSave();
    });
    
    this.cancelButton.observe('click', function() {
      _this.hide();
    });
    
    // Allow Enter key to save
    this.nameInput.observe('keypress', function(event) {
      if (event.keyCode === 13) { // Enter key
        _this.performSave();
      }
    });
  },

  /**
   * Perform the actual save operation
   */
  performSave: function() {
    var pedigreeName = this.nameInput.value.trim();
    console.log('🔄 SavePedigreeDialog.performSave() called with name:', pedigreeName);
    
    if (!pedigreeName) {
      window.alert(i18n.t('dialog.error') + ': ' + i18n.t('dialog.enterPedigreeName'));
      this.nameInput.focus();
      return;
    }

    if (!window.pedigreeBackend || !window.pedigreeBackend.isAvailable()) {
      console.log('❌ pedigreeBackend not available');
      window.alert(i18n.t('dialog.error') + ': Database not available');
      return;
    }

    console.log('✅ pedigreeBackend is available, proceeding with save...');
    var _this = this;
    
    try {
      // Get the current pedigree data
      console.log('📊 Getting pedigree data from editor...');
      var pedigreeData = editor.getGraph().toJSON();
      console.log('📊 Pedigree data obtained:', pedigreeData);
      
      // Save to database
      console.log('💾 Calling pedigreeBackend.save...');
      window.pedigreeBackend.save(pedigreeData, { name: pedigreeName })
        .then(function(result) {
          console.log('💾 Save result:', result);
          if (result.success) {
            window.alert(i18n.t('messages.success') + ': ' + i18n.t('dialog.pedigreeSaved'));
            _this.hide();
          } else {
            window.alert(i18n.t('messages.error') + ': ' + result.error);
          }
        })
        .catch(function(error) {
          console.error('💾 Save error:', error);
          window.alert(i18n.t('messages.error') + ': ' + error.message);
        });
    } catch (error) {
      window.alert(i18n.t('messages.error') + ': ' + error.message);
    }
  },

  /**
   * Show the save dialog
   */
  show: function() {
    this.dialog.show();
    // Focus the name input and select all text
    setTimeout(() => {
      this.nameInput.focus();
      this.nameInput.select();
    }, 100);
  },

  /**
   * Hide the save dialog
   */
  hide: function() {
    this.dialog.closeDialog();
  },

  /**
   * Update language-dependent text
   */
  updateLanguage: function() {
    // Recreate the form with updated translations
    this.createSaveForm();
  }
});

export default SavePedigreeDialog;
