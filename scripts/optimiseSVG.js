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
            var attrName = attr.nodeName;

            if (attrName === 'style') {
                this.styles = this.parseStyle(attr.value);
            } else if (defaultStyles[attrName] !== undefined) {
                this.styles[attrName] = attr.value;
            } else {
                this.attributes[attrName] = attr.value;
            }
        }
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

// Given a string a function for rounding decimals,
// return the string with all the digits rounded
SVG_Element.prototype.setDecimalsInString = function(str, func) {
    if (!str) { return ""; }
    
    // Split string into array of digits and non-digits
    var reDigits = /\s*([-+]?[\d\.]+)([eE][-+]?[\d\.]+)?\s*/g;
    var nonDigits = [];
    var digits = [];
    var n2, n1 = 0;

    while (digit = reDigits.exec(str)){
        n2 = digit.index;
        nonDigits.push(str.slice(n1, n2));
        digits.push(parseFloat(digit));
        n1 = n2 + digit[0].length;
    }
    nonDigits.push(str.slice(n1));

    var s = nonDigits[0];
    for (var i = 0; i < digits.length; i++) {
        s += func(digits[i]);
        var nonDigit = nonDigits[i + 1];

        // Add a separating space unless this is the last value
        if (i !== digits.length - 1 && nonDigit === "") {
            nonDigit = " ";
        }
        s += nonDigit;
    }
    return s;
}

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

// Split a string from a style attribute into a hash of styles
// e.g. style="fill:#269276;opacity:1" => {fill: '#269276', opacity: '1'}
SVG_Element.prototype.parseStyle = function(styleString) {
    var styles = {};
    var styleArray = styleString.split(/\s*;\s*/);
    
    for (var i = 0; i < styleArray.length; i++) {
        var value = styleArray[i].split(/\s*:\s*/);
        
        if (value.length === 2) {
            styles[value[0]] = value[1];
        }
    }
    
    return styles;
};

// Return a list of strings in the form "style:value" for the styles that are to be used
SVG_Element.prototype.getUsedStyles = function(options) {
    if (!this.styles) { return []; }

    var usedStyles = [];
    var ignoreFill = (this.styles['fill'] === 'none' || this.styles['fill-opacity'] === '0');
    var ignoreStroke = (this.styles['stroke'] === 'none' || this.styles['stroke-opacity'] === '0' || this.styles['stroke-width'] === '0');

    if ((ignoreFill && ignoreStroke) || this.styles['visibility'] === 'hidden'|| this.styles['opacity'] === 0) {
        // Don't show
        // Seems this would only be likely for animations or some weird styling with groups
    }

    for (var style in this.styles) {
        if (ignoreFill && style.substr(0, 4) === 'fill') { continue; }
        if (ignoreStroke && style.substr(0, 6) === 'stroke') { continue; }
        if (options.removeDefaultStyles && this.styles[style] === defaultStyles[style]) { continue; }
        if (options.nonEssentialStyles[style]) { continue; }

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

        // Need to deal with path d attributes separately
        var values = this.attributes[attr].split(/[\s,]+/);
        values = $.map(values, options.attrDecimals);
        str += values.join(" ") + '"';
    }

    // Write styles
    var styleString = this.getUsedStyles(options).join(';');
    if (styleString) {
        str += ' style="' + styleString + '"';
    }

    // Don't write group if it has no attributes, but do write its children
    // Assume g element has no text (which it shouldn't)
    // TODO: if g contains styles could add styles to children (only if using CSS)
    if (this.tag === 'g' && options.removeCleanGroups && usedAttributes.length === 0 && styleString === "") {
        var childString = "";
        for (var i = 0; i < this.children.length; i++) {
            childString += this.children[i].toString(options, depth + 1);
        }
        return childString;
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
        removeEmptyElements: true,
        removeCleanGroups: true,
        attributeDecimalPlaces: 1,
    };

    this.options.nonEssentialStyles = nonEssentialStyles;

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
    this.options.attrDecimals = this.getDecimalPlaceFunction(this.options.attributeDecimalPlaces);

    return this.elements.toString(this.options);
};

// Return a function that given a number returns a rounded version to n decimal places
SVG_Object.prototype.getDecimalPlaceFunction = function(decimalPlaces) {
    if (!isNaN(parseInt(decimalPlaces))) {
        var scale = Math.pow(10, decimalPlaces);

        return function(str) {
            if (isNaN(parseFloat(str))) {
                return str;
            } else {
                return "" + Math.round(parseFloat(str) * scale) / scale;
            }
        };
    } else {
        return function(str) { return str; };
    }
};