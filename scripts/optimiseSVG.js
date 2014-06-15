// Split a string from a style attribute into a hash of styles
// e.g. style="fill:#269276;opacity:1" => {fill: '#269276', opacity: '1'}

var parseStyle = function(styleString) {
    var styles = {};
    var styleArray = styleString.split(/\s*;\s*/);
    
    for (var i = 0; i < styleArray.length; i++) {
        var value = styleArray[i].split(/\s*:\s*/);
        
        if (value.length === 2) {
            styles[value[0]] = value[1];
        }
    }
    
    return styles;
}

// Node in an SVG document
// Contains all the options for optimising how the SVG is written

var SVG_Element = function(element, parents) {
    this.tag = element.nodeName;
    this.attributes = {};
    this.styles = {};
    this.parents = parents;
    this.text = "";

    // Add attributes to hash
    // Style attributes have a separate hash
    if (element.attributes) {
        for (var i = 0; i < element.attributes.length; i++){
            var attr = element.attributes.item(i);

            if (attr.nodeName === 'style') {
                this.styles = parseStyle(attr.nodeValue);
            } else {
                // Should add attributes like 'fill' to style hash
                this.attributes[attr.nodeName] = attr.nodeValue;
            }
        }
        this.id = this.attributes.id;
    }

    // Add children
    this.children = [];

    for (var i = 0; i < element.childNodes.length; i++) {
        var child = element.childNodes[i];
        if (child instanceof Text) {
            // Tag contains text
            if (child.data.replace(/^\s*/, "") !== "") {
                this.text = child.data;
            }
        } else {
            this.children.push(new SVG_Element(child, this));
        }
    }
};

// Return an array of attributes that have not been removed
SVG_Element.prototype.getUsedAttributes = function(options) {
    var usedAttributes = [];
    
    for (var attr in this.attributes) {
        // Remove attributes whose namespace has been removed and links to namespace URIs
        if (attr.indexOf(':') !== -1) {
            var ns = attr.split(':');
            if (!options.namespaces[ns[0]] || (ns[0] === 'xmlns' && !options.namespaces[ns[1]])) {
                continue;
            }
        }
        
        // TODO: only remove ids that are not referenced elsewhere
        if (options.removeIDs && attr === 'id') {
            continue;
        }

        usedAttributes.push(attr);
    }
    
    return usedAttributes;
};

// Return a list of strings in the form "style:value" for the styles that are to be used
SVG_Element.prototype.getUsedStyles = function(removeDefaultStyles) {
    if (!this.styles) { return []; }

    var usedStyles = [];
    var ignoreFill = (this.styles['fill'] === 'none' || this.styles['fill-opacity'] === '0');
    var ignoreStroke = (this.styles['stroke'] === 'none' || this.styles['stroke-opacity'] === '0' || this.styles['stroke-width'] === '0');

    for (var style in this.styles) {
        if (ignoreFill && style.substr(0, 4) === 'fill') { continue; }
        if (ignoreStroke && style.substr(0, 6) === 'stroke') { continue; }
        if (removeDefaultStyles && this.styles[style] === defaultStyles[style]) { continue; }

        usedStyles.push(style + ":" + this.styles[style]);
    }
    
    if (ignoreFill) { usedStyles.push('fill:none'); }
    
    return usedStyles.sort();
};

// Return a string representing the SVG element 
SVG_Element.prototype.toString = function(options, depth) {
    // Remove namespace information
    if (this.tag.indexOf(':') !== -1) {
        var ns = this.tag.split(':')[0];
        if (!options.namespaces[ns]) {
            return "";
        }
    }

    var depth = depth || 0;
    var indent = (options.whitespace === 'remove') ? '' : new Array(depth + 1).join('  ');

    var str = indent + '<' + this.tag;

    // Write attributes
    var usedAttributes = this.getUsedAttributes(options);
    for (var i = 0; i < usedAttributes.length; i++) {
        var attr = usedAttributes[i];
        str += ' ' + attr + '="';
        str += this.attributes[attr];
        str += '"';
    }

    // Write styles
    var styleString = this.getUsedStyles(options.removeDefaultStyles).join(';');
    if (styleString) {
        str += ' style="' + styleString + '"';
    }

    // Write child information
    var childString = "";
    for (var i = 0; i < this.children.length; i++) {
        childString += this.children[i].toString(options, depth + 1);
    }

    if (this.text.length + childString.length > 0) {
        str += ">" + options.newLine;
        if (this.text) {
            str += indent + "  " + this.text + options.newLine;
        }
        if (childString) {
            str += childString;
        }
        str += indent + "</" + this.tag + ">" + options.newLine;
    } else {
        if (options.removeEmptyElements && usedAttributes.length === 0) {
            return "";
        }
        str += "/>" + options.newLine;
    }

    return str;
};

// A wrapper for SVG_Elements which store the options for optimisation
// Build from a jQuery object representing the SVG
var SVG_Object = function(jQuerySVG) {
    this.elements = new SVG_Element(jQuerySVG, null);

    // Set default options
    this.options = {
        whitespace: 'remove',
        removeIDs: false,
        removeDefaultStyles: true,
        removeEmptyElements: true
    };

    // Namespaces are attributes of the SVG element, prefaced with 'xmlns:'
    // Create a hash mapping namespaces to false, except for the SVG namespace
    this.findNamespaces = function() {
        var namespaces = {};

        for (attr in this.elements.attributes) {
            if (attr.slice(0,6) === 'xmlns:') {
                var ns = attr.split(':')[1];
                namespaces[ns] = (ns === 'svg');
            }
        }

        return namespaces;
    };
    this.options.namespaces = this.findNamespaces();
};

SVG_Object.prototype.toString = function() {
    this.options.newLine = (this.options.whitespace === 'remove') ? "": "\n";

    return this.elements.toString(this.options);
};