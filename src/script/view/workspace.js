import GraphicHelpers from 'pedigree/view/graphicHelpers';
import i18n from 'pedigree/i18n';
import LanguageSelector from 'pedigree/view/languageSelector';
import PedigreeSelector from 'pedigree/view/pedigreeSelector';
import SavePedigreeDialog from 'pedigree/view/savePedigreeDialog';
import Raphael from 'pedigree/raphael';

/**
 * Workspace contains the Raphael canvas, the zoom/pan controls and the menu bar
 * on the top. The class includes functions for managing the Raphael paper object and coordinate transformation methods
 * for taking pan and zoom levels into account.
 *
 * @class Workspace
 * @constructor
 */

var Workspace = Class.create({

  initialize: function(container) {
    var me = this;
    this.canvas = new Element('div', {'id' : 'canvas'});
    this.workArea = new Element('div', {'id' : 'work-area'}).update(this.canvas);
    
    // Use provided container or fall back to body for backward compatibility
    if (container) {
      container.update(this.workArea);
    } else {
      $('body').update(this.workArea);
    }
    
    var screenDimensions = document.viewport.getDimensions();
    this.generateTopMenu();
    this.width = screenDimensions.width;
    this.height = screenDimensions.height - this.canvas.cumulativeOffset().top - 4;
    this._paper = Raphael('canvas',this.width, this.height);
    this.viewBoxX = 0;
    this.viewBoxY = 0;
    this.zoomCoefficient = 1;

    this.background = this.getPaper().rect(0,0, this.width, this.height).attr({fill: 'blue', stroke: 'none', opacity: 0}).toBack();
    this.background.node.setAttribute('class', 'panning-background');

    this.workArea.insert(new Element('div', {'id': 'attribution'})
      .insert('&copy; 2025 PedigreePro.'));

    this.adjustSizeToScreen = this.adjustSizeToScreen.bind(this);
    Event.observe (window, 'resize', me.adjustSizeToScreen);
    this.generateViewControls();

    //Initialize pan by dragging
    var start = function() {
      if (editor.isAnyMenuVisible()) {
        return;
      }
      me.background.ox = me.background.attr('x');
      me.background.oy = me.background.attr('y');
      me.background.attr({cursor: 'move'});
    };
    var move = function(dx, dy) {
      var deltax = me.viewBoxX - dx/me.zoomCoefficient;
      var deltay = me.viewBoxY - dy/me.zoomCoefficient;

      me.getPaper().setViewBox(deltax, deltay, me.width/me.zoomCoefficient, me.height/me.zoomCoefficient);
      me.background.ox = deltax;
      me.background.oy = deltay;
      me.background.attr({x: deltax, y: deltay });
    };
    var end = function() {
      me.viewBoxX = me.background.ox;
      me.viewBoxY = me.background.oy;
      me.background.attr({cursor: 'default'});
    };
    me.background.drag(move, start, end);

    if (document.addEventListener) {
      // adapted from from raphaelZPD
      me.handleMouseWheel = function(evt) {
        if (evt.preventDefault) {
          evt.preventDefault();
        } else {
          evt.returnValue = false;
        }

        // disable while menu is active - too easy to scroll and get the active node out of sight, which is confusing
        if (editor.isAnyMenuVisible()) {
          return;
        }

        var delta;
        if (evt.wheelDelta) {
          delta = -evt.wheelDelta;
        } // Chrome/Safari
        else {
          delta = evt.detail;
        } // Mozilla

        if (delta > 0) {
          // Zoom out
          var newZoom = Math.max(me.zoomCoefficient - 0.25, 0.15);
          me.zoom(newZoom);
        } else {
          // Zoom in
          var newZoom = Math.min(me.zoomCoefficient + 0.25, 1.25);
          me.zoom(newZoom);
        }
      };

      if (navigator.userAgent.toLowerCase().indexOf('webkit') >= 0) {
        this.canvas.addEventListener('mousewheel', me.handleMouseWheel, false); // Chrome/Safari
      } else {
        this.canvas.addEventListener('DOMMouseScroll', me.handleMouseWheel, false); // Others
      }
    }
  },

  /**
     * Returns the Raphael paper object.
     *
     * @method getPaper
     * @return {Object} Raphael Paper element
     */
  getPaper: function() {
    return this._paper;
  },

  /**
     * Returns the div element containing everything except the top menu bar
     *
     * @method getWorkArea
     * @return {HTMLElement}
     */
  getWorkArea: function() {
    return this.workArea;
  },

  /**
     * Returns width of the work area
     *
     * @method getWidth
     * @return {Number}
     */
  getWidth: function() {
    return this.width;
  },

  /**
     * Returns height of the work area
     *
     * @method getHeight
     * @return {Number}
     */
  getHeight: function() {
    return this.height;
  },

  /**
     * Creates the menu on the top
     *
     * @method generateTopMenu
     */
  generateTopMenu: function() {
    var menu = new Element('div', {'id' : 'editor-menu'});

    menu.insert(new Element('a', {'class': 'title'})
        .update('PedigreePro'));

    this.getWorkArea().insert({before : menu});
    var submenus = [];

    if (editor.isUnsupportedBrowser()) {
      submenus = [{
        name : 'input',
        items: [
          { key : 'readonlymessage', labelKey: 'dialog.unsupportedBrowser', icon : 'exclamation-triangle'}
        ]
      }, {
        name : 'output',
        items: [
          { key : 'export',    labelKey: 'menu.export', icon : 'file-export'},
          { key : 'close',     labelKey: 'menu.close', icon : 'times'}
        ]
      }];
    } else {
      submenus = [{
        name : 'input',
        items: [
          { key : 'templates', labelKey: 'menu.templates', icon : 'copy'},
          { key : 'import',    labelKey: 'menu.import', icon : 'file-import'},
          { key : 'load',      labelKey: 'menu.load', icon : 'folder-open', callback: 'loadPedigree'},
          { key : 'save',      labelKey: 'menu.save', icon : 'save', callback: 'savePedigree'}
        ]
      }, {
        name : 'edit',
        items: [
          { key : 'undo',   labelKey: 'menu.undo', icon : 'undo'},
          { key : 'redo',   labelKey: 'menu.redo', icon : 'redo'}
        ]
      }, {
        name : 'reset',
        items: [
          { key : 'clear',  labelKey: 'menu.clear', icon : 'times-circle'}
        ]
      }, {
        name : 'output',
        items: [
          { key : 'export',    labelKey: 'menu.export', icon : 'file-export'},
          { key : 'close',     labelKey: 'menu.close', icon : 'times'}
        ]
      }];
    }

    var _this = this;
    var _createSubmenu = function(data) {
      var submenu = new Element('div', {'class' : data.name + '-actions action-group'});
      menu.insert(submenu);
      data.items.each(function (item) {
        submenu.insert(_createMenuItem(item));
      });
    };
    var _createMenuItem = function(data) {
      var label = data.labelKey ? i18n.t(data.labelKey) : data.label;
      var mi = new Element('span', {'id' : 'action-' + data.key, 'class' : 'menu-item ' + data.key}).insert(new Element('span', {'class' : 'fa fa-' + data.icon})).insert(' ').insert(label);
      if (data.callback && typeof(_this[data.callback]) == 'function') {
        mi.observe('click', function() {
          _this[data.callback]();
        });
      }
      return mi;
    };
    submenus.each(_createSubmenu);

    // Add language selector
    this.languageSelector = new LanguageSelector();
    var langSelectorElement = this.languageSelector.getMenuElement();
    
    // Create language action group and add it to menu
    var languageGroup = new Element('div', {'class': 'language-actions action-group'});
    languageGroup.insert(langSelectorElement);
    menu.insert(languageGroup);

    // Listen for language changes to update menu items
    document.observe('language:changed', this.updateMenuLabels.bind(this));
  },

  /**
   * Update menu labels when language changes
   */
  updateMenuLabels: function() {
    // Update menu item labels
    var menuItems = [
      { key: 'templates', labelKey: 'menu.templates' },
      { key: 'import', labelKey: 'menu.import' },
      { key: 'load', labelKey: 'menu.load' },
      { key: 'save', labelKey: 'menu.save' },
      { key: 'export', labelKey: 'menu.export' },
      { key: 'undo', labelKey: 'menu.undo' },
      { key: 'redo', labelKey: 'menu.redo' },
      { key: 'clear', labelKey: 'menu.clear' },
      { key: 'close', labelKey: 'menu.close' },
      { key: 'readonlymessage', labelKey: 'dialog.unsupportedBrowser' }
    ];

    menuItems.each(function(item) {
      var element = $('action-' + item.key);
      if (element) {
        var textNode = element.lastChild;
        if (textNode && textNode.nodeType === Node.TEXT_NODE) {
          textNode.nodeValue = ' ' + i18n.t(item.labelKey);
        }
      }
    });
  },

  /**
     * Adjusts the canvas viewbox to the given zoom coefficient
     *
     * @method zoom
     * @param {Number} zoomCoefficient The zooming ratio
     */
  zoom: function(zoomCoefficient) {
    if (zoomCoefficient < 0.15) {
      zoomCoefficient = 0.15;
    }
    if (zoomCoefficient > 0.15 && zoomCoefficient < 0.25) {
      zoomCoefficient = 0.25;
    }
    zoomCoefficient = Math.round(zoomCoefficient/0.05)/20;
    var newWidth  = this.width/zoomCoefficient;
    var newHeight = this.height/zoomCoefficient;
    this.viewBoxX = this.viewBoxX + (this.width/this.zoomCoefficient - newWidth)/2;
    this.viewBoxY = this.viewBoxY + (this.height/this.zoomCoefficient - newHeight)/2;
    this.getPaper().setViewBox(this.viewBoxX, this.viewBoxY, newWidth, newHeight);
    this.zoomCoefficient = zoomCoefficient;
    this.background.attr({x: this.viewBoxX, y: this.viewBoxY, width: newWidth, height: newHeight});
  },

  /**
     * Creates the controls for panning and zooming
     *
     * @method generateViewControls
     */
  generateViewControls : function() {
    var _this = this;
    this.__controls = new Element('div', {'class' : 'view-controls'});
    
    // Create new working pan controls
    this.createPanControls();
    
    // Create new working zoom controls  
    this.createZoomControls();
    
    // Insert all controls in the document
    this.getWorkArea().insert(this.__controls);
  },

  /**
   * Creates new working pan controls
   */
  createPanControls: function() {
    var _this = this;
    
    // Create pan control container
    this.__newPan = new Element('div', {
      'class': 'new-pan-controls',
      'style': 'position: absolute; top: 10px; left: 10px; z-index: 100002;'
    });
    
    // Create pan buttons with explicit styling
    var panButtons = {
      'up': { icon: '↑', x: 30, y: 0 },
      'left': { icon: '←', x: 0, y: 30 },
      'right': { icon: '→', x: 60, y: 30 },
      'down': { icon: '↓', x: 30, y: 60 },
      'home': { icon: '⌂', x: 30, y: 30 }
    };
    
    Object.keys(panButtons).forEach(function(direction) {
      var button = new Element('div', {
        'class': 'new-pan-button',
        'title': 'Pan ' + direction,
        'style': 'position: absolute; left: ' + panButtons[direction].x + 'px; top: ' + panButtons[direction].y + 'px; ' +
                 'width: 24px; height: 24px; background: rgba(255,255,255,0.9); border: 1px solid #ccc; ' +
                 'border-radius: 3px; text-align: center; line-height: 22px; cursor: pointer; ' +
                 'font-size: 14px; user-select: none; z-index: 100003;'
      });
      button.innerHTML = panButtons[direction].icon;
      
      // Add click handler
      button.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('New pan button clicked: ' + direction);
        
        if (direction === 'home') {
          _this.centerAroundNode(0);
        } else if (direction === 'up') {
          _this.panTo(_this.viewBoxX, _this.viewBoxY - 300);
        } else if (direction === 'down') {
          _this.panTo(_this.viewBoxX, _this.viewBoxY + 300);
        } else if (direction === 'left') {
          _this.panTo(_this.viewBoxX - 300, _this.viewBoxY);
        } else if (direction === 'right') {
          _this.panTo(_this.viewBoxX + 300, _this.viewBoxY);
        }
      });
      
      // Add hover effect
      button.addEventListener('mouseenter', function() {
        this.style.background = 'rgba(0,137,220,0.1)';
        this.style.borderColor = '#0089DC';
      });
      button.addEventListener('mouseleave', function() {
        this.style.background = 'rgba(255,255,255,0.9)';
        this.style.borderColor = '#ccc';
      });
      
      _this.__newPan.appendChild(button);
    });
    
    this.__controls.insert(this.__newPan);
  },

  /**
   * Creates new working zoom controls
   */
  createZoomControls: function() {
    var _this = this;
    
    // Create zoom control container - positioned below pan controls
    this.__newZoom = new Element('div', {
      'class': 'new-zoom-controls',
      'style': 'position: absolute; top: 110px; left: 10px; z-index: 100002;'
    });
    
    // Create zoom in button
    this.__newZoomIn = new Element('div', {
      'class': 'new-zoom-button',
      'title': 'Zoom In',
      'style': 'width: 30px; height: 30px; background: rgba(255,255,255,0.9); border: 1px solid #ccc; ' +
               'border-radius: 3px; text-align: center; line-height: 28px; cursor: pointer; ' +
               'font-size: 16px; font-weight: bold; margin-bottom: 5px; user-select: none; z-index: 100003;'
    });
    this.__newZoomIn.innerHTML = '+';
    
    // Create zoom out button
    this.__newZoomOut = new Element('div', {
      'class': 'new-zoom-button', 
      'title': 'Zoom Out',
      'style': 'width: 30px; height: 30px; background: rgba(255,255,255,0.9); border: 1px solid #ccc; ' +
               'border-radius: 3px; text-align: center; line-height: 28px; cursor: pointer; ' +
               'font-size: 16px; font-weight: bold; user-select: none; z-index: 100003;'
    });
    this.__newZoomOut.innerHTML = '−';
    
    // Add click handlers for zoom buttons
    this.__newZoomIn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      console.log('New zoom in clicked, current: ' + _this.zoomCoefficient);
      
      var newZoom = Math.min(_this.zoomCoefficient + 0.25, 1.25);
      _this.zoom(newZoom);
    });
    
    this.__newZoomOut.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      console.log('New zoom out clicked, current: ' + _this.zoomCoefficient);
      
      var newZoom = Math.max(_this.zoomCoefficient - 0.25, 0.15);
      _this.zoom(newZoom);
    });
    
    // Add hover effects for zoom buttons
    [this.__newZoomIn, this.__newZoomOut].forEach(function(button) {
      button.addEventListener('mouseenter', function() {
        this.style.background = 'rgba(0,137,220,0.1)';
        this.style.borderColor = '#0089DC';
      });
      button.addEventListener('mouseleave', function() {
        this.style.background = 'rgba(255,255,255,0.9)';
        this.style.borderColor = '#ccc';
      });
    });
    
    this.__newZoom.appendChild(this.__newZoomIn);
    this.__newZoom.appendChild(this.__newZoomOut);
    
    this.__controls.insert(this.__newZoom);
  },

  /* To work around a bug in Raphael or Raphaelzpd (?) which creates differently sized lines
     * @ different zoom levels given the same "stroke-width" in pixels this function computes
     * the pixel size to be used at this zoom level to create a line of the correct size.
     *
     * Returns the pixel value to be used in stoke-width
     */
  getSizeNormalizedToDefaultZoom: function(pixelSizeAtDefaultZoom) {
    return pixelSizeAtDefaultZoom;
  },

  /**
     * Returns the current zoom level (not normalized to any value, larger numbers mean deeper zoom-in)
     */
  getCurrentZoomLevel: function(pixelSizeAtDefaultZoom) {
    return this.zoomCoefficient;
  },

  /**
     * Converts the coordinates relative to the Raphael canvas to coordinates relative to the canvas div
     * and returns them
     *
     * @method canvasToDiv
     * @param {Number} canvasX The x coordinate relative to the Raphael canvas (ie with pan/zoom transformations)
     * @param {Number} canvasY The y coordinate relative to the Raphael canvas (ie with pan/zoom transformations)
     * @return {{x: number, y: number}} Object with coordinates
     */
  canvasToDiv: function(canvasX,canvasY) {
    return {
      x: this.zoomCoefficient * (canvasX - this.viewBoxX),
      y: this.zoomCoefficient * (canvasY - this.viewBoxY)
    };
  },

  /**
     * Converts the coordinates relative to the canvas div to coordinates relative to the Raphael canvas
     * by applying zoom/pan transformations and returns them.
     *
     * @method divToCanvas
     * @param {Number} divX The x coordinate relative to the canvas
     * @param {Number} divY The y coordinate relative to the canvas
     * @return {{x: number, y: number}} Object with coordinates
     */
  divToCanvas: function(divX,divY) {
    return {
      x: divX/this.zoomCoefficient + this.viewBoxX,
      y: divY/this.zoomCoefficient + this.viewBoxY
    };
  },

  /**
     * Converts the coordinates relative to the browser viewport to coordinates relative to the canvas div,
     * and returns them.
     *
     * @method viewportToDiv
     * @param {Number} absX The x coordinate relative to the viewport
     * @param {Number} absY The y coordinate relative to the viewport
     * @return {{x: number, y: number}} Object with coordinates
     */
  viewportToDiv : function (absX, absY) {
    return {
      x : + absX - this.canvas.cumulativeOffset().left,
      y : absY - this.canvas.cumulativeOffset().top
    };
  },

  /**
     * Animates a transformation of the viewbox to the given coordinate
     *
     * @method panTo
     * @param {Number} x The x coordinate relative to the Raphael canvas
     * @param {Number} y The y coordinate relative to the Raphael canvas
     */
  panTo: function(x, y, instant) {
    var me = this,
      oX = this.viewBoxX,
      oY = this.viewBoxY,
      xDisplacement = x - oX,
      yDisplacement = y - oY;

    if (editor.isUnsupportedBrowser()) {
      instant = true;
    }

    var numSeconds = instant ? 0 : .4;
    var frames     = instant ? 1 : 11;

    var xStep = xDisplacement/frames,
      yStep = yDisplacement/frames;

    if (xStep == 0 && yStep == 0) {
      return;
    }

    var progress = 0;

    (function draw() {
      setTimeout(function() {
        if(progress++ < frames) {
          me.viewBoxX += xStep;
          me.viewBoxY += yStep;
          me.getPaper().setViewBox(me.viewBoxX, me.viewBoxY, me.width/me.zoomCoefficient, me.height/me.zoomCoefficient);
          me.background.attr({x: me.viewBoxX, y: me.viewBoxY });
          draw();
        }
      }, 1000 * numSeconds / frames);
    })();
  },

  /**
     * Animates a transformation of the viewbox by the given delta in the X direction
     *
     * @method panTo
     * @param {Number} deltaX The move size
     */
  panByX: function(deltaX, instant) {
    this.panTo(this.viewBoxX + Math.floor(deltaX/this.zoomCoefficient), this.viewBoxY, instant);
  },

  /**
     * Adjusts the canvas size to the current viewport dimensions.
     *
     * @method adjustSizeToScreen
     */
  adjustSizeToScreen : function() {
    var screenDimensions = document.viewport.getDimensions();
    this.width = screenDimensions.width;
    this.height = screenDimensions.height - this.canvas.cumulativeOffset().top - 4;
    this.getPaper().setSize(this.width, this.height);
    this.getPaper().setViewBox(this.viewBoxX, this.viewBoxY, this.width/this.zoomCoefficient, this.height/this.zoomCoefficient);
    this.background && this.background.attr({'width': this.width, 'height': this.height});
    if (editor.getNodeMenu()) {
      editor.getNodeMenu().reposition();
    }
  },

  /**
     * Pans the canvas to put the node with the given id at the center.
     *
     * When (xCenterShift, yCenterShift) are given positions the node with the given shift relative
     * to the center instead of exact center of the screen
     *
     * @method centerAroundNode
     * @param {Number} nodeID The id of the node
     */
  centerAroundNode: function(nodeID, instant, xCenterShift, yCenterShift) {
    var node = editor.getNode(nodeID);
    if(node) {
      var x = node.getX(),
        y = node.getY();
      if (!xCenterShift) {
        xCenterShift = 0;
      }
      if (!yCenterShift) {
        yCenterShift = 0;
      }
      var xOffset = this.getWidth()/this.zoomCoefficient;
      var yOffset = this.getHeight()/this.zoomCoefficient;
      this.panTo(x - xOffset/2 - xCenterShift, y - yOffset/2 - yCenterShift, instant);
    }
  },

  /**
   * Save the current pedigree to the database
   */
  savePedigree: function() {
    if (!window.pedigreeBackend || !window.pedigreeBackend.isAvailable()) {
      window.alert(i18n.t('dialog.error') + ': Database not available');
      return;
    }

    // Show the save pedigree dialog
    var saveDialog = new SavePedigreeDialog();
    saveDialog.show();
  },

  /**
   * Load a pedigree from the database
   */
  loadPedigree: function() {
    if (!window.pedigreeBackend || !window.pedigreeBackend.isAvailable()) {
      window.alert(i18n.t('dialog.error') + ': Database not available');
      return;
    }

    // Show the pedigree selector dialog
    var pedigreeSelector = new PedigreeSelector();
    pedigreeSelector.show();
  }
});

export default Workspace;
