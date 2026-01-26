import i18n from 'pedigree/i18n';

/**
 * The UI Element for managing saved pedigrees (load, delete)
 *
 * @class PedigreeSelector
 */

var PedigreeSelector = Class.create( {

  initialize: function() {
    this.mainDiv = new Element('div', {'class': 'pedigree-selector-container'});
    this.mainDiv.update(i18n.t('messages.loading'));
    
    var closeShortcut = ['Esc'];
    this.dialog = new PedigreePro.widgets.ModalPopup(this.mainDiv, {close: {method : this.hide.bind(this), keys : closeShortcut}}, {
      extraClassName: 'pedigree-selector-chooser', 
      title: i18n.t('dialog.selectPedigreeToLoad'), 
      displayCloseButton: true
    });
    
    this.loadPedigreeList();
  },

  /**
   * Load and display the list of saved pedigrees
   */
  loadPedigreeList: function() {
    var _this = this;
    
    if (!window.pedigreeBackend || !window.pedigreeBackend.isAvailable()) {
      this.mainDiv.update('<div class="error-message">' + i18n.t('dialog.error') + ': Database not available</div>');
      return;
    }

    window.pedigreeBackend.listPedigrees()
      .then(function(pedigrees) {
        _this.displayPedigreeList(pedigrees);
      })
      .catch(function(error) {
        _this.mainDiv.update('<div class="error-message">' + i18n.t('messages.error') + ': ' + error.message + '</div>');
      });
  },

  /**
   * Display the list of pedigrees in the dialog
   */
  displayPedigreeList: function(pedigrees) {
    this.mainDiv.update();
    
    if (pedigrees.length === 0) {
      this.mainDiv.insert('<div class="no-pedigrees">' + i18n.t('dialog.noPedigreesFound') + '</div>');
      return;
    }

    var table = new Element('table', {'class': 'pedigree-list'});
    var header = new Element('thead');
    var headerRow = new Element('tr');
    headerRow.insert(new Element('th').update(i18n.t('labels.name')));
    headerRow.insert(new Element('th').update(i18n.t('labels.created')));
    headerRow.insert(new Element('th').update(i18n.t('labels.updated')));
    headerRow.insert(new Element('th').update(i18n.t('labels.actions')));
    header.insert(headerRow);
    table.insert(header);

    var tbody = new Element('tbody');
    var _this = this;

    pedigrees.each(function(pedigree) {
      var row = new Element('tr');
      
      row.insert(new Element('td').update(pedigree.name));
      row.insert(new Element('td').update(new Date(pedigree.created_at).toLocaleDateString()));
      row.insert(new Element('td').update(new Date(pedigree.updated_at).toLocaleDateString()));
      
      var actionsCell = new Element('td');
      
      var loadButton = new Element('button', {'class': 'load-btn'}).update(i18n.t('menu.load'));
      loadButton.observe('click', function() {
        _this.loadPedigree(pedigree.name);
      });
      
      var deleteButton = new Element('button', {'class': 'delete-btn'}).update(i18n.t('buttons.delete'));
      deleteButton.observe('click', function() {
        _this.deletePedigree(pedigree.name);
      });
      
      actionsCell.insert(loadButton);
      actionsCell.insert(' ');
      actionsCell.insert(deleteButton);
      row.insert(actionsCell);
      
      tbody.insert(row);
    });

    table.insert(tbody);
    this.mainDiv.insert(table);
  },

  /**
   * Load a specific pedigree
   */
  loadPedigree: function(pedigreeName) {
    var _this = this;
    
    // Confirm loading (will replace current pedigree)
    if (!window.confirm(i18n.t('dialog.confirmLoadPedigree') + ' "' + pedigreeName + '"? ' + i18n.t('dialog.currentPedigreeWillBeLost'))) {
      return;
    }

    window.pedigreeBackend.load({ name: pedigreeName })
      .then(function(pedigreeData) {
        if (pedigreeData) {
          // Clear current pedigree and load new one
          editor.getSaveLoadEngine().createGraphFromSerializedData(pedigreeData, false, true);
          window.alert(i18n.t('messages.success') + ': ' + i18n.t('dialog.pedigreeLoaded'));
          _this.hide();
        } else {
          window.alert(i18n.t('dialog.errorLoadingPedigree'));
        }
      })
      .catch(function(error) {
        window.alert(i18n.t('messages.error') + ': ' + error.message);
      });
  },

  /**
   * Delete a specific pedigree
   */
  deletePedigree: function(pedigreeName) {
    var _this = this;
    
    if (!window.confirm(i18n.t('dialog.confirmDelete') + ' "' + pedigreeName + '"?')) {
      return;
    }

    window.pedigreeBackend.deletePedigree(pedigreeName)
      .then(function(result) {
        if (result.success) {
          window.alert(i18n.t('messages.success') + ': Pedigree deleted');
          _this.loadPedigreeList(); // Refresh the list
        } else {
          window.alert(i18n.t('messages.error') + ': ' + result.error);
        }
      })
      .catch(function(error) {
        window.alert(i18n.t('messages.error') + ': ' + error.message);
      });
  },

  /**
   * Show the pedigree selector dialog
   */
  show: function() {
    this.dialog.show();
  },

  /**
   * Hide the pedigree selector dialog
   */
  hide: function() {
    this.dialog.closeDialog();
  }
});

export default PedigreeSelector;
