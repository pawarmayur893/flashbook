/* global CKEDITOR */
/*
 * This module defines a number of utility functions that are generally useful
 * when developing MHE widgets. It uses the Loose Augmentation module pattern
 * from http://www.adequatelygood.com/JavaScript-Module-Pattern-In-Depth.html.
 */
var mhe = (function (my) {

  /*
   * extractImageAssetURLs()
   *
   * The MHE Optimized EPUB build parses config file contents for image references,
   * but only matches fields where the image reference URL is alone in the field.
   * Since most of our image references are embedded in CKEditor fields as <img>
   * tags, the parser for the MHE Optimized EPUB build doesn't find them and so
   * the corresponding images aren't included in the MHE Optimized EPUB build.
   * To address this, we parse the config file ourselves and specifically target
   * <img> tags within strings and extract their src URLs into a separate array
   * which contains all image references from within the config file JSON.
   * To deploy the fix in a new widget, make sure the code is included and add
   * a line like:
   *    widgetConfigJson.__assets__ = extractImageAssetURLs(widgetConfigJson);
   * before sending the config file to Inkling's configuration:file method.
   * Or simply call mhe.updateConfigFile() below, which handles all the details.
   *
   * The optional second argument, iOptMatch, is intended to be used to specify
   * a partial path, such as '../../widget_data/images', to be used to identify
   * raw image asset references that should be included in the array of asset
   * references in addition to the CKEditor image asset references. This is
   * used by the mhe.updateParams() function which can be used to register
   * assets used by widgets that use <param>s rather than a configFile.
   */
  my.extractImageAssetURLs = function(/**String*/ iContent,
                                      /**Array of String*/ iOptMatch) /**Array of String*/ {

    var imgAssetURLs = [];
  
    // utility function which extracts src URLs from <img> tags and
    // adds them to the imgAssetURLs variable.
    function processStringValue(iString) {
      // cf. http://www.sitepoint.com/jquery-basic-regex-selector-examples/
          // <a> tag with embedded <img> tag which captures
          // $1: the <a> tag's href value
          // $2: the entire <img> tag
          // $3: the <img> tag's src value
      var aTagsImgRegex = /<a .*?href=["'](.*?)["'].*?>\s*?(<img .*?src=["'](.*?)["'].*?\/?>)\s*?<\/a>/ig,
          // <img> tag with src attribute
          imgTagsRegex = /<img .*?src=["'](.*?)["'].*?\/?>/ig,
          srcAttrRegex = /src=["'](.*?)["']/i,
          dataUriRegex = /^data:/i,
          isDataUri,
          // identify <img> tags
          imgTags = iString.match(imgTagsRegex),
          i, imgTagCount = imgTags ? imgTags.length : 0,
          result, imgTagResults, imgUrl;
        
        // Match raw image asset references by partial path
        if(iOptMatch && iOptMatch.length) {
          for(i = 0; i < iOptMatch.length; ++i) {
            if(iString.indexOf(iOptMatch[i]) >= 0) {
              imgAssetURLs.push(iString);
              return;
            }
          }
        }
        
        // remove extraneous <a> tags around <img> tags
        function replaceWithEmbeddedImgTag(iMatch, aTagHref, imgTag, imgTagSrc) {
          // <a> tag's href must be same as <img> tag's src for us to replace
          return aTagHref === imgTagSrc ? imgTag : iMatch;
        }
        result = iString.replace(aTagsImgRegex, replaceWithEmbeddedImgTag);
        
        // extract URLs from <img> tags
        for(i = 0; i < imgTagCount; ++i) {
          // extract src URL from <img> tags
          imgTagResults = srcAttrRegex.exec(imgTags[i]);
          imgUrl = imgTagResults && imgTagResults[1];
          // we don't want data URIs
          isDataUri = dataUriRegex.test(imgUrl);
          if(imgUrl && (imgAssetURLs.indexOf(imgUrl) < 0) && !isDataUri) {
            imgAssetURLs.push(imgUrl);
          }
        }
        
        // Only return the result if we changed it
        return result !== iString ? result : undefined;
    }

    /*
     * Recursive function for parsing the config file contents.
     * Returns an array of <img> URL references
     * Will also correct certain "bugs" in the config object, e.g.
     * - remove unnecessary <a> tags around <img> tags
     * Arguments follow Array.forEach callback conventions for convenience
     */
    function parseForImageAssets(/**Object|String*/ iValue,
                                 /**String|Number*/ iKey, /**Object*/ iObject) {
      var i, itemCount,
          processedValue;
      switch(typeof iValue) {
    
        // recurse into objects and arrays
        case 'object':
          if(Array.isArray(iValue)) { // IE9+, Safari 5+, Firefox 4+, Chrome
            itemCount = iValue.length;
            for(i = 0; i < itemCount; ++i) {
              parseForImageAssets(iValue[i], i, iValue);
            }
          }
          else if(iValue) { // typeof null === 'object'
            for(var p in iValue) {
              parseForImageAssets(iValue[p], p, iValue);
            }
          }
          break;

        // process strings, eg. to extract <img> URL references from strings
        case 'string':
          processedValue = processStringValue(iValue);
          // if a string is returned, replace the original string
          // with the processed string result
          if(iObject && iKey && processedValue) {
            iObject[iKey] = processedValue;
          }
          break;
      }
    }
  
    parseForImageAssets(iContent);
    return imgAssetURLs;
  };
  
  /*
   * updateConfigFile()
   *
   * Sends the configuration JSON on to Habitat for saving,
   * after first extracting image assets and formatting them
   * for the MHE Optimized EPUB build. Widgets should call
   * this function rather than saving the configuration JSON
   * themselves so that any last adjustments to the JSON can
   * be made in a central location.
   */
  my.updateConfigFile = function(/**Object*/ iConfigJSON) {
    var configJSON = iConfigJSON || {},
        assets = my.extractImageAssetURLs(configJSON),
        assetCount = assets && assets.length;
    
    // only add __assets__ property if there are assets to add
    if (assetCount) {
      // put image URLs where MHE Optimized EPUB build can find them
      configJSON.__assets__ = assets;
    // there aren't assets now, but there used to be -- so update field
    } else if (configJSON.__assets__) {
      configJSON.__assets__ = [];
    }
    
    if (window.parent) {
      // Send config JSON to parent (Habitat) for saving
      window.parent.postMessage({
          'type': 'configuration',
          'method': 'file',
          'payload': configJSON
      }, '*');
    }
  };

  /*
   * updateParams()
   *
   * Sends the configuration JSON on to Habitat for saving,
   * after first extracting image assets and formatting them
   * for the MHE Optimized EPUB build. Widgets should call
   * this function rather than saving the configuration JSON
   * themselves so that any last adjustments to the JSON can
   * be made in a central location.
   */
  my.updateParams = function(/**Object*/ iParamsJSON) {
    var paramsJSON = iParamsJSON || {},
        configJSON = {},
        // extract CKEditor image assets as well as raw image assets
        assets = my.extractImageAssetURLs(paramsJSON, [
                                            '../../widget_data/images',
                                            '../../../img']),
        assetCount = assets && assets.length;
    
    // only add __assets__ property if there are assets to add
    if (assetCount) {
      // put image URLs where MHE Optimized EPUB build can find them
      configJSON.__assets__ = assets;
    // there aren't assets now, but there used to be -- so update field
    } else if (configJSON.__assets__) {
      configJSON.__assets__ = [];
    }
    
    if (window.parent) {
      // Send params JSON to parent (Habitat) for saving
      window.parent.postMessage({
          'type': 'configuration',
          'method': 'set',
          'payload': paramsJSON
      }, '*');
    }
    
    if (window.parent && configJSON.__assets__) {
      // Send config JSON to parent (Habitat) for saving
      window.parent.postMessage({
          'type': 'configuration',
          'method': 'file',
          'payload': configJSON
      }, '*');
    }
  };

  my.replaceNamedEntities = function(/**String*/ iString) {
    var entityTable = {
        'quot' : 34, 
        'amp' : 38, 
        'apos' : 39, 
        'lt' : 60, 
        'gt' : 62, 
        'nbsp' : 160, 
        'iexcl' : 161, 
        'cent' : 162, 
        'pound' : 163, 
        'curren' : 164, 
        'yen' : 165, 
        'brvbar' : 166, 
        'sect' : 167, 
        'uml' : 168, 
        'copy' : 169, 
        'ordf' : 170, 
        'laquo' : 171, 
        'not' : 172, 
        'shy' : 173, 
        'reg' : 174, 
        'macr' : 175, 
        'deg' : 176, 
        'plusmn' : 177, 
        'sup2' : 178, 
        'sup3' : 179, 
        'acute' : 180, 
        'micro' : 181, 
        'para' : 182, 
        'middot' : 183, 
        'cedil' : 184, 
        'sup1' : 185, 
        'ordm' : 186, 
        'raquo' : 187, 
        'frac14' : 188, 
        'frac12' : 189, 
        'frac34' : 190, 
        'iquest' : 191, 
        'Agrave' : 192, 
        'Aacute' : 193, 
        'Acirc' : 194, 
        'Atilde' : 195, 
        'Auml' : 196, 
        'Aring' : 197, 
        'AElig' : 198, 
        'Ccedil' : 199, 
        'Egrave' : 200, 
        'Eacute' : 201, 
        'Ecirc' : 202, 
        'Euml' : 203, 
        'Igrave' : 204, 
        'Iacute' : 205, 
        'Icirc' : 206, 
        'Iuml' : 207, 
        'ETH' : 208, 
        'Ntilde' : 209, 
        'Ograve' : 210, 
        'Oacute' : 211, 
        'Ocirc' : 212, 
        'Otilde' : 213, 
        'Ouml' : 214, 
        'times' : 215, 
        'Oslash' : 216, 
        'Ugrave' : 217, 
        'Uacute' : 218, 
        'Ucirc' : 219, 
        'Uuml' : 220, 
        'Yacute' : 221, 
        'THORN' : 222, 
        'szlig' : 223, 
        'agrave' : 224, 
        'aacute' : 225, 
        'acirc' : 226, 
        'atilde' : 227, 
        'auml' : 228, 
        'aring' : 229, 
        'aelig' : 230, 
        'ccedil' : 231, 
        'egrave' : 232, 
        'eacute' : 233, 
        'ecirc' : 234, 
        'euml' : 235, 
        'igrave' : 236, 
        'iacute' : 237, 
        'icirc' : 238, 
        'iuml' : 239, 
        'eth' : 240, 
        'ntilde' : 241, 
        'ograve' : 242, 
        'oacute' : 243, 
        'ocirc' : 244, 
        'otilde' : 245, 
        'ouml' : 246, 
        'divide' : 247, 
        'oslash' : 248, 
        'ugrave' : 249, 
        'uacute' : 250, 
        'ucirc' : 251, 
        'uuml' : 252, 
        'yacute' : 253, 
        'thorn' : 254, 
        'yuml' : 255, 
        'fnof' : 402, 
        'Alpha' : 913, 
        'Beta' : 914, 
        'Gamma' : 915, 
        'Delta' : 916, 
        'Epsilon' : 917, 
        'Zeta' : 918, 
        'Eta' : 919, 
        'Theta' : 920, 
        'Iota' : 921, 
        'Kappa' : 922, 
        'Lambda' : 923, 
        'Mu' : 924, 
        'Nu' : 925, 
        'Xi' : 926, 
        'Omicron' : 927, 
        'Pi' : 928, 
        'Rho' : 929, 
        'Sigma' : 931, 
        'Tau' : 932, 
        'Upsilon' : 933, 
        'Phi' : 934, 
        'Chi' : 935, 
        'Psi' : 936, 
        'Omega' : 937, 
        'alpha' : 945, 
        'beta' : 946, 
        'gamma' : 947, 
        'delta' : 948, 
        'epsilon' : 949, 
        'zeta' : 950, 
        'eta' : 951, 
        'theta' : 952, 
        'iota' : 953, 
        'kappa' : 954, 
        'lambda' : 955, 
        'mu' : 956, 
        'nu' : 957, 
        'xi' : 958, 
        'omicron' : 959, 
        'pi' : 960, 
        'rho' : 961, 
        'sigmaf' : 962, 
        'sigma' : 963, 
        'tau' : 964, 
        'upsilon' : 965, 
        'phi' : 966, 
        'chi' : 967, 
        'psi' : 968, 
        'omega' : 969, 
        'thetasym' : 977, 
        'upsih' : 978, 
        'piv' : 982, 
        'bull' : 8226, 
        'hellip' : 8230, 
        'prime' : 8242, 
        'Prime' : 8243, 
        'oline' : 8254, 
        'frasl' : 8260, 
        'weierp' : 8472, 
        'image' : 8465, 
        'real' : 8476, 
        'trade' : 8482, 
        'alefsym' : 8501, 
        'larr' : 8592, 
        'uarr' : 8593, 
        'rarr' : 8594, 
        'darr' : 8595, 
        'harr' : 8596, 
        'crarr' : 8629, 
        'lArr' : 8656, 
        'uArr' : 8657, 
        'rArr' : 8658, 
        'dArr' : 8659, 
        'hArr' : 8660, 
        'forall' : 8704, 
        'part' : 8706, 
        'exist' : 8707, 
        'empty' : 8709, 
        'nabla' : 8711, 
        'isin' : 8712, 
        'notin' : 8713, 
        'ni' : 8715, 
        'prod' : 8719, 
        'sum' : 8721, 
        'minus' : 8722, 
        'lowast' : 8727, 
        'radic' : 8730, 
        'prop' : 8733, 
        'infin' : 8734, 
        'ang' : 8736, 
        'and' : 8743, 
        'or' : 8744, 
        'cap' : 8745, 
        'cup' : 8746, 
        'int' : 8747, 
        'there4' : 8756, 
        'sim' : 8764, 
        'cong' : 8773, 
        'asymp' : 8776, 
        'ne' : 8800, 
        'equiv' : 8801, 
        'le' : 8804, 
        'ge' : 8805, 
        'sub' : 8834, 
        'sup' : 8835, 
        'nsub' : 8836, 
        'sube' : 8838, 
        'supe' : 8839, 
        'oplus' : 8853, 
        'otimes' : 8855, 
        'perp' : 8869, 
        'sdot' : 8901, 
        'lceil' : 8968, 
        'rceil' : 8969, 
        'lfloor' : 8970, 
        'rfloor' : 8971, 
        'lang' : 9001, 
        'rang' : 9002, 
        'loz' : 9674, 
        'spades' : 9824, 
        'clubs' : 9827, 
        'hearts' : 9829, 
        'diams' : 9830, 
        'OElig' : 338, 
        'oelig' : 339, 
        'Scaron' : 352, 
        'scaron' : 353, 
        'Yuml' : 376, 
        'circ' : 710, 
        'tilde' : 732, 
        'ensp' : 8194, 
        'emsp' : 8195, 
        'thinsp' : 8201, 
        'zwnj' : 8204, 
        'zwj' : 8205, 
        'lrm' : 8206, 
        'rlm' : 8207, 
        'ndash' : 8211, 
        'mdash' : 8212, 
        'lsquo' : 8216, 
        'rsquo' : 8217, 
        'sbquo' : 8218, 
        'ldquo' : 8220, 
        'rdquo' : 8221, 
        'bdquo' : 8222, 
        'dagger' : 8224, 
        'Dagger' : 8225, 
        'permil' : 8240, 
        'lsaquo' : 8249, 
        'rsaquo' : 8250, 
        'euro' : 8364
    };
    var cleanText = iString.replace(/&[^#][^;]+;/g, function(thisMatch) {
        var namedEntity = thisMatch.substring(1, thisMatch.length - 1);
        if (entityTable[namedEntity]) {
          return '&#' + entityTable[namedEntity] + ';';
        }
        else {
          return '&#xFFFD;';
        }
    });
    return cleanText;
  };

  /*
   * getConfigFile()
   *
   * Gets the config file for a widget, processes it and returns it as a
   * JSON object.
   */
  my.getConfigFile = function(/**String*/ iConfigFileUrl, successCallback, errorCallback) {
    $.ajax({
      url: iConfigFileUrl,
      dataType: 'text',
      cache: false,
      dataFilter: function(iData, iType) {
        var configFileContents = iData;
        configFileContents = mhe.replaceNamedEntities(configFileContents);
        return JSON.parse(configFileContents);
      },
      success: function(iConfigFileContents) {
        successCallback(iConfigFileContents);
      },
      error: function(iErr1, iErr2, iErr3) {
        if (errorCallback) {
          errorCallback(iErr1, iErr2, iErr3);
        }
      }
    });
  };

  my.customizeCKEImageDialog = function() {
    var dialogName, dialogDefinition, uploadTab, elements;
    if (CKEDITOR) {
      CKEDITOR.on('dialogDefinition', function(e) {
        dialogName = e.data.name;
        dialogDefinition = e.data.definition;
        if (dialogName === 'image') {
          uploadTab = dialogDefinition.getContents('Upload');
          elements = [
            {
              type: 'html',
              id: 'uploadImageButton',
              html: "<div><input type='file' id='fileUploader' class='uploadFile btn btn-primary' accept='image/*'></input></div><div><div class='btn btn-primary disabled' id='sendFile'>Send to Server</div><div class='uploadProgress'></div></div>"
            }
          ];
          uploadTab.hidden = false;
          uploadTab.elements = elements;
        } else {
          return;
        }
      });
    } else {
      return;
    }
  };

  my.ckeditorWirisServer = '//wirisckeditor-prod.mheducation.com/';

  /*
  After initializing a CKEditor instance with content containing MathML, the
  WIRIS plug-in turns it into an image and a CKEditor change event is
  triggered. If we accept data from getData() at this point, it will contain
  images, not MathML, and MathJax won't be able to render it. So, we replace the
  <img> with the data from its data-mathml attribute.
  */
  my.replaceWirisImageWithMathML = function(iCkeditorData) {
    var processedData = iCkeditorData.replace(/<img .*?data-mathml="([^"]+)".*?>/ig, function(match, p1) {
      var thisMathML = p1.replace(/«/g, "<");
      thisMathML = thisMathML.replace(/»/g, ">");
      thisMathML = thisMathML.replace(/¨/g, '"');
      return thisMathML;
    });
    return processedData;
  };

  my.wirisDataReady = function(iCkeditorData) {
    var dataIsBad = false;
    dataIsBad = /<img .*?data-mathml="[^"]+".*?>/i.test(iCkeditorData);
    return !dataIsBad;
  };

  my.ckeditorInstallHandlers = function(iConfig) {
    var data, el;
    if (iConfig.changeCallback) {
      $.each(CKEDITOR.instances, function(editorName, editor) { 
        editor.on("change", function(event) {
          data = event.sender.getData();
          if (mhe.wirisDataReady(data)) {
            el = editor.element.$;
            iConfig.changeCallback(event, el, data, iConfig.clientContext);
          }
        });
      });
    }
  };

  my.linkToWIRISPlugins = function(iContextPath) {
      /*
      var mheWirisContextPath = CKEDITOR.config.wiriscontextpath;
      $.each(CKEDITOR.instances, function(iName, editor) {
          if (editor.config.wiriscontextpath) mheWirisContextPath = editor.config.wiriscontextpath;
      });
      */
      var $wirisLink = $('<script/>');
      $wirisLink.attr('src', iContextPath + 'integration/WIRISplugins.js?viewer=image');
      $wirisLink.attr('type', 'text/javascript');
      $('head').append($wirisLink);
  };


  my.configureCKEditor = function(iConfig) {
    function toolbarButtonExists(iButton) {
      return CKEDITOR && CKEDITOR.config && CKEDITOR.config.toolbar && (JSON.stringify(CKEDITOR.config.toolbar).indexOf(iButton) >= 0);
    }
    function pluginExists(iPlugin) {
      var allPlugins = CKEDITOR.config.plugins;
      if (CKEDITOR.config.extraPlugins) {
        allPlugins += ',' + CKEDITOR.config.extraPlugins;
      }
      return allPlugins.indexOf(iPlugin) >= 0;
    }
    function wirisScriptTagExists() {
      return $('script[src*="WIRISplugins.js"]').length > 0;
    }

    var ckConfig = $.extend(true, {}, iConfig.ckeditorConfig);
    var options = $.extend(true, {}, iConfig.options);


    // Apply the default MHE configuration globally
    CKEDITOR.config.plugins = 'about,basicstyles,blockquote,button,clipboard,colorbutton,dialog,dialogui,div,enterkey,entities,fakeobjects,find,floatingspace,floatpanel,font,horizontalrule,image,indent,indentlist,justify,lineutils,link,list,listblock,mathjax,panel,panelbutton,removeformat,richcombo,selectall,smiley,specialchar,table,toolbar,undo,widget,wysiwygarea';
    CKEDITOR.config.toolbar = [
         ['FontSize'],['Bold','Italic','Underline'],['TextColor','BGColor'],['Mathjax']
    ];
    CKEDITOR.config.enterMode = CKEDITOR.ENTER_P;
    CKEDITOR.config.entities_processNumerical = 'force'; // Converts from '&nbsp;' into '&#160;'
    CKEDITOR.config.font_defaultLabel = 'Proxima Nova';
    CKEDITOR.config.fontSize_defaultLabel = '16';
    CKEDITOR.config.mathJaxLib = '\/\/cdn.mathjax.org\/mathjax\/latest\/MathJax.js?config=TeX-AMS-MML_HTMLorMML';
    CKEDITOR.config.wiriscontextpath = "https://wirisckeditor-prod.mheducation.com/";
    CKEDITOR.config.allowedContent = true;
    CKEDITOR.config.font_names = [
                                    /*"Arial/Arial, Helvetica, sans-serif",
                                    "Courier New/Courier New, Courier, monospace",
                                    "Georgia/Georgia, serif",
                                    "Lucida Sans Unicode/Lucida Sans Unicode, Lucida Grande, sans-serif",*/
                                    "Proxima Nova/ProximaNova, sans-serif" /*,
                                    "Tahoma/Tahoma, Geneva, sans-serif",
                                    "Times New Roman/Times New Roman, Times, serif",
                                    "Trebuchet MS/Trebuchet MS, Helvetica, sans-serif",
                                    "Verdana/Verdana, Geneva, sans-serif"*/
                                  ].join(';');
    /*
    Don't include the title attribute on the editor instance (because it's not useful 
    and looks kind of weird: "Rich Text Editor, editor1")
    */
    CKEDITOR.config.title = false;


    if (options.wiris) {
      // add ckeditor_wiris_formulaEditor to toolbar
      if (!toolbarButtonExists('ckeditor_wiris_formulaEditor')) {
        /*
        If the client provides a toolbar, it's going to override the default
        toolbar. If the client doesn't provide a toolbar, set ckConfig.toolbar =
        to CKEDITOR.config.toolbar and add the wiris button to it. This
        that the client doesn't get a toolbar with only button on it -- the
        wiris editor button.
        */
        if (typeof ckConfig.toolbar === 'undefined') {
          ckConfig.toolbar = CKEDITOR.config.toolbar.slice();
        }
        ckConfig.toolbar.push(['ckeditor_wiris_formulaEditor']);
      }
      // add ckeditor_wiris to extraPlugins
      if (!pluginExists('ckeditor_wiris')) {
        if (typeof ckConfig.extraPlugins !== 'undefined' && ckConfig.extraPlugins.length > 0) {
          ckConfig.extraPlugins += ',' + 'ckeditor_wiris';
        }
        else {
          ckConfig.extraPlugins = 'ckeditor_wiris';
        }
      }
      // add <script> link WIRISplugins.js -- (test to make sure that there's one or use global variable)
      if (!wirisScriptTagExists()) {
        mhe.linkToWIRISPlugins(ckConfig.wiriscontextpath || CKEDITOR.config.wiriscontextpath);
      }
    }
    if (options.editorSelector) {
      // Configure an editor instance using a provided config and string that can work as a jQuery selector
      $(options.editorSelector).ckeditor(ckConfig);
    } else {
      // No element or selector provided, so merge the provided config into the global config
      $.extend(true, CKEDITOR.config, ckConfig);
    }
  };

  my.caliper = function(iEvent) {
    /*
    Expect an action but not necessarily a time
    Click into entry field:
      Event: Assessment Item Viewed
    Begin Character Entry:
      Event: Assessment Item Started
    Submit Button Click:
      Event: Assessment Item Completed
    Open Sample Answer: 
      Event: Assessment Item Review
    Close Sample Answer & Clear Button: We might need to add to extensions area, we should discuss priority and data reporting requirement.
    */
    var action = iEvent.action;
    var time = iEvent.time || (new Date()).toISOString();
    var message = {
      "@context": "http://purl.imsglobal.org/ctx/caliper/v1/Context",
      "@type": "http://purl.imsglobal.org/caliper/v1/AssessmentItemEvent",
      "action": "http://purl.imsglobal.org/vocab/caliper/v1/action#" + action,
      "eventTime": time
    };
    var answer = iEvent.answer;
    if (answer) {
      message.generated = {values: [answer]};
    }

    _sendPlayerEvent("widget-caliper-event", message);

    // patterned after Inkling analytics api
    /*
    window.parent.postMessage({
      "type": "analytics",
      "method": "assessment",
      "payload": {
        "caliper": message
      }
    }, "*");
    */

    /*
    Support Inkling's message API for communication to other widgets
    */
    window.parent.postMessage({
        type: 'message',
        method: 'publish',
        payload: {
            topic: 'analytics',
            message: message
        }
    }, "*");
  };

  my.linkToDefaultCSS = 'https://nickam992.github.io/themes/theme1.css';

  my.linkToThemeCSS = function(iUrl) {
    var url = iUrl || mhe.linkToDefaultCSS;
    var courseThemeLink;
    if ($('link[data-course-css="courseCssTheme"]').length === 0) {
      courseThemeLink = $('<link/>');
      $(courseThemeLink).attr({
          'data-course-css': 'courseCssTheme',
          'href': url,
          'rel': 'stylesheet'
      });
      $('head').append(courseThemeLink);
    }
    else {
      courseThemeLink = $('link[data-course-css="courseCssTheme"]');
      $(courseThemeLink).attr('href', url);
    }
  };

  my.mheWirisToolbars = [
      {
          name: 'default',
          label: 'Complete',
          content: ''
      },
      {
          name: 'basic',
          label: 'Simplified',
          content: '<toolbar ref="general"><removeTab ref="arrows" /><removeTab ref="greek" /><removeTab ref="matrices" /><removeTab ref="scriptsAndLayout" /><removeTab ref="bracketsAndAccents" /><removeTab ref="bigOps" /><removeTab ref="calculus" /><removeTab ref="quizzes" /><removeTab ref="chemistry" /><removeTab ref="PARCC" /><removeTab ref="contextual" /><tab ref="general"><removeItem ref="&#8709;"/><removeItem ref="&#8734;"/><removeItem ref="numberPi"/><removeItem ref="&#8712;"/><removeItem ref="&#8834;"/><removeItem ref="&#8746;"/><removeItem ref="&#8745;"/></tab><tab ref="symbols"><removeItem ref="&#8712;"/><removeItem ref="&#8834;"/><removeItem ref="&#8746;"/><removeItem ref="&#8745;"/></tab></toolbar>'
      }/*,
      {
          name: 'gradesKTo2',
          label: 'K-2',
          content: '<toolbar><tab name="gradesKTo2"><section layout="horizontal" rows="1"><item ref="+" /><item ref="-" /><item ref="=" /><item ref=">" /><item ref="<" /><item ref="3RowsStackWithLineAndPlusSign" /><item ref="3RowsStackWithLineAndMinusSign" /><item ref="over" /></section></tab></toolbar>'
      },
      {
          name: 'grades3To5',
          label: '3-5',
          content: '<toolbar><tab name="grades3To5" rows="2"><section layout="vertical" rows="3"><item ref="+" /><item ref="3RowsStackWithLineAndPlusSign" /><item ref="rightArrowAccent" /></section><section layout="vertical" rows="4"><item ref="-" /><item ref="3RowsStackWithLineAndMinusSign" /><item ref="encloseTop" /></section><section layout="vertical" rows="4"><item ref="&#215;" /><item ref="3RowsStackWithLineAndMultiplicationSign" /><item ref="&#8741;" /></section><section layout="vertical" rows="4"><item ref="&#247;" /><item ref="longDivision" /><item ref="&#8869;" /></section><section layout="vertical" rows="4"><item ref="=" /><item ref="longDivisionWithRemainder" /><item ref="&#8736;" /></section><section layout="vertical" rows="3"><item ref=">" /><item ref="upDiagonalStrike" /><item ref="&#176;" /></section><section layout="vertical" rows="4"><item ref="<" /><item ref="stackline" /></section><section layout="vertical" rows="1"><item ref="over" /></section><section layout="vertical" rows="1"><item ref="fraction" /></section><section layout="vertical" rows="1"><item ref="superscript" /></section></tab></toolbar>'
      },
      {
          name: 'grades6To8',
          label: '6-8',
          content: '<toolbar><tab name="Algebra and Operations"><section layout="horizontal" rows="3"><item ref="+" /><item ref="-" /><item ref="dotAsTimes" /><item ref="&#215;" /><item ref="/" /><item ref="&#247;" /><item ref="&#177;" /><item ref="&#8734;" /><item ref="&#8709;" /></section><section layout="vertical" rows="3"><item ref="<" /><item ref="&#8804;" /><item ref="=" /><item ref=">" /><item ref="&#8805;" /><item ref="&#8800;" /><item ref="&#8776;" /></section><section layout="horizontal" rows="2"><item ref="parenthesis" /><item ref="squareBracket" /><item ref="verticalBar" /><item ref="curlyBracket" /></section><section layout="horizontal" rows="3"><item ref="fraction" /><item ref="longDivision" /><item ref="nRoot" /><item ref="squareRoot" /><item ref="encloseTop" /></section><section layout="horizontal" rows="1"><item ref="superscript" /><item ref="subscript" /><item ref="subsuperscript" /></section></tab><tab name="Geometry"><section layout="vertical" rows="4"><item ref="&#8764;" /><item ref="&#8736;" /><item ref="&#8741;" /><item ref="numberPi" /><item ref="notCongruent" /><item ref="&#176;" /><item ref="&#8869;" /><item ref="&apos;" /><item ref="aposApos" /></section><section layout="vertical" rows="3"><item ref="&#9651;" /><item ref="&#9649;" /><item ref="&#9633;" /><item ref="&#8857;" /></section><section layout="horizontal" rows="2"><item ref="encloseTop" /><item ref="rightArrowAccent" /><item ref="rightLeftArrowAccent" /><item ref="upParenthesis" /><item ref="upDiagonalStrike" /></section></tab></toolbar>'
      },
      {
          name: 'grades9To12A',
          label: '9-12 A',
          content: '<toolbar><tab name="Algebra and Operations"><section layout="horizontal" rows="3"><item ref="+" /><item ref="-" /><item ref="dotAsTimes" /><item ref="fraction" /><item ref="&#177;" /><item ref="&#8709;" /><item ref="&apos;" /><item ref="aposApos" /><item ref="&#8734;" /></section><section layout="horizontal" rows="3"><item ref="<" /><item ref=">" /><item ref="=" /><item ref="&#8804;" /><item ref="&#8805;" /><item ref="&#8776;" /><item ref="numberPi" /><item ref="&#176;" /></section><section layout="horizontal" rows="3"><item ref="parenthesis" /><item ref="squareBracket" /><item ref="verticalBar" /><item ref="curlyBracket" /></section><section layout="horizontal" rows="3"><item ref="squareRoot" /><item ref="nRoot" /><item ref="lCurlyColumn" /><item ref="longDivision" /></section><section layout="horizontal" rows="2"><item ref="superscript" /><item ref="subscript" /><item ref="subsuperscript" /><item ref="over" /></section></tab><tab name="Geometry"><section layout="horizontal" rows="3"><item ref="notCongruent" /><item ref="&#8764;" /><item ref="&#8736;" /><item ref="&#176;" /><item ref="&#8741;" /><item ref="&#8869;" /></section><section layout="horizontal" rows="3"><item ref="&#8743;" /><item ref="&#8744;" /><item ref="&#8594;" /><item ref="&#8592;" /><item ref="&#8596;" /></section><section layout="horizontal" rows="3"><item ref="&#9651;" /><item ref="&#9633;" /><item ref="&#8857;" /><item ref="&#9649;" /></section><section layout="vertical" rows="3"><item ref="encloseTop" /><item ref="rightLeftArrowAccent" /><item ref="vectorAccent" /><item ref="rightArrowAccent" /><item ref="upParenthesis" /><item ref="upDiagonalStrike" /><item ref="angleBrackets" /></section></tab></toolbar>'
      },
      {
          name: 'grades9To12B',
          label: '9-12 B',
          content: '<toolbar><tab name="Algebra and Operations"><section layout="horizontal" rows="3"><item ref="+" /><item ref="-" /><item ref="dotAsTimes" /><item ref="fraction" /><item ref="&#177;" /><item ref="&#8709;" /><item ref="&apos;" /><item ref="aposApos" /><item ref="&#8734;" /></section><section layout="horizontal" rows="3"><item ref="<" /><item ref=">" /><item ref="=" /><item ref="&#8804;" /><item ref="&#8805;" /><item ref="&#8776;" /><item ref="numberPi" /><item ref="&#176;" /></section><section layout="horizontal" rows="3"><item ref="parenthesis" /><item ref="squareBracket" /><item ref="verticalBar" /><item ref="curlyBracket" /></section><section layout="horizontal" rows="3"><item ref="squareRoot" /><item ref="nRoot" /><item ref="lCurlyColumn" /><item ref="longDivision" /></section><section layout="horizontal" rows="2"><item ref="superscript" /><item ref="subscript" /><item ref="subsuperscript" /><item ref="over" /></section></tab><tab name="Geometry"><section layout="horizontal" rows="3"><item ref="notCongruent" /><item ref="&#8764;" /><item ref="&#8736;" /><item ref="&#176;" /><item ref="&#8741;" /><item ref="&#8869;" /></section><section layout="horizontal" rows="3"><item ref="&#8743;" /><item ref="&#8744;" /><item ref="&#8594;" /><item ref="&#8592;" /><item ref="&#8596;" /></section><section layout="horizontal" rows="3"><item ref="&#9651;" /><item ref="&#9633;" /><item ref="&#8857;" /><item ref="&#9649;" /></section><section layout="vertical" rows="3"><item ref="encloseTop" /><item ref="rightLeftArrowAccent" /><item ref="vectorAccent" /><item ref="rightArrowAccent" /><item ref="upParenthesis" /><item ref="upDiagonalStrike" /><item ref="angleBrackets" /></section></tab><tab ref="matrices"></tab><tab ref="greek"></tab></toolbar>'
      }
      */
  ];


  // Parse initial parameters from query string.
  my.initialParams = {};
  window.location.search.replace(/([^?=&]+)(=([^&]*))?/g, function($0, $1, $2, $3){
    my.initialParams[$1] = decodeURIComponent($3);
  });

  function _listenForMessage(type, method, callback) {
    function onMessage(evt) {
      if (!evt || !evt.data || !evt.data.type) return;
      if (evt.data.type === type && evt.data.method === method){
        callback(evt.data.payload || evt.data.data);
      }
    }
    window.addEventListener('message', onMessage);
    return onMessage;
  };

  function _removeListener(listener) {
    window.removeEventListener('message', listener);
  }

  function _sendMessage(type, method, data){
    window.parent.postMessage({
      type: type,
      method: method,
      // Different API's use either 'data' or 'payload' here.
      // cf DLE-Player-Application/app/scripts/shared/postMessage.factory.js:sendInklingMessage
      data: data,
      payload: data
    }, '*');
  }

  function _sendPlayerEvent(actionType, event) {
    // message to mhe player api
    window.parent.postMessage({
      action: actionType,
      properties: {
        event: event
      }
    }, "*");
  }

  function _listenForPlayerMessage(type, callback) {
    function receiveMessage(event) {
      if (!event || !event.data) return;
      var message = event.data,
          receivedType = message.action || message.type;
      if (receivedType === type) callback(message);
    }

    window.addEventListener('message', receiveMessage);
  };

  my.setSize = function(sizes){
    _sendMessage('size', 'set', sizes);
  };

  my.onResize = function(callback) {
    function onResize(){
      callback($(window).width(), $(window).height());
    }
    $(window).resize(onResize);
    onResize(); // ensure at least one onResize
  };

  my.saveData = function (data) {
    _sendMessage('data', 'save', data);
  };

  my.onDataRestore = function(callback) {
    _listenForMessage('data', 'restore', callback);
  };

  function _makeError(message) {
    return {
      type: 'widgetError',
      message: message
    };
  }

  // This is for tracking asset uploads.
  var nextId = 1;

  function _uploadAsset(assetType, file, onComplete, onProgress) {
    if (!onComplete) throw _makeError("uploadAsset: onComplete is required");
    var id = nextId++;
    var listener = _listenForMessage('asset', assetType, function(payload) {
      if(!payload || payload.id !== id) return;
      if (payload.progress === 1) {
        onComplete(payload.path);
        _removeListener(listener);
      }
      else {
        // partially complete
        if (onProgress) onProgress(payload.progress);
      }
    });
    _sendMessage('asset', assetType,
                 {
                   data: file,
                   id: id,
                   progress: true
                 });
  };

  my.uploadImage = function(file, onComplete, onProgress) {
    _uploadAsset('image', file, onComplete, onProgress);
  };

  my.addLinkToThemeCss = function() {
    my.linkToThemeCSS(my.linkToDefaultCSS);
    _listenForPlayerMessage('widget-display-context',
                            function(message) {
                              my.linkToThemeCSS(message.properties.themeCssFile);
                            });
  };

  my.onWidgetReady = function(callback) {
    // These events are currently caught by vivarium only.
    function canAccessParentVars() {
      try {
        var iframe = window.frameElement,
            winParent = window.parent,
            $doc = $(winParent.document);
        return !!$doc;
      }
      catch(e) {
        return false;
      }
    }
    function signalIframeLoading() {
      var iframe = window.frameElement,
          winParent = window.parent,
          $doc = $(winParent.document);
      $doc.ready(function() {
        var parent$ = winParent.jQuery;
        if(parent$) {
          parent$(iframe).trigger('iframeloading');
          $(function() {
            callback();
            // Don't send this until after we've set up our event listeners.
            parent$(iframe).trigger('iframeready');
          });
        }
        else {
          $(callback);
        }
      });
    }
    if (canAccessParentVars()) { // We're in vivarium.
      signalIframeLoading();
    }
    else {
      $(callback);
    }
  };

  return my;
}(mhe || {}));
