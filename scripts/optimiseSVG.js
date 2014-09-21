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
                $.extend(this.styles, this.parseStyle(attr.value));
            } else if (defaultStyles[attrName] !== undefined || nonEssentialStyles[attrName] !== undefined) {
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

// Not used
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

    // Ignore other fill or stroke attributes if value is none or it is transparent
    var ignoreFill = (this.styles['fill'] === 'none' || options.styleDecimals(this.styles['fill-opacity']) == 0);
    var ignoreStroke = (this.styles['stroke'] === 'none' || options.styleDecimals(this.styles['stroke-opacity']) == 0 || options.styleDecimals(this.styles['stroke-width']) == 0);

    if ((ignoreFill && ignoreStroke) || this.styles['visibility'] === 'hidden'|| options.styleDecimals(this.styles['opacity']) == 0) {
        // TODO: don't show this element
        // Seems this would only be likely for animations or some weird styling with groups
    }

    for (var style in this.styles) {
        var value = options.styleDecimals(this.styles[style]);

        // Simplify colours, e.g. #ffffff -> #fff
        var repeated = value.match(/^#([0-9a-f])\1([0-9a-f])\2([0-9a-f])\3$/i);
        if (repeated) {
            value = '#' + repeated[1]  + repeated[2] + repeated[3];
        }

        if (ignoreFill && style.substr(0, 4) === 'fill') { continue; }
        if (ignoreStroke && style.substr(0, 6) === 'stroke') { continue; }
        if (options.removeDefaultStyles && value === defaultStyles[style]) { continue; }
        if (options.removeNonEssentialStyles && options.nonEssentialStyles[style]) { continue; }

        usedStyles.push(style + ":" + value);
    }
    
    if (ignoreFill) { usedStyles.push('fill:none'); }
    
    return usedStyles.sort();
};

// Return a string representing the SVG element
// All the optimisation is done here, so none of the original information is lost
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

        // TODO: convert tags to lowercase so will work with 'viewbox'
        // TODO: also apply decimal places to transforms
        // TODO: add polygons and polylines
        if (attr === 'viewBox' || (this.tag === 'path' && attr === 'd')) {
            var values = this.attributes[attr].split(/[\s,]+/);
            values = $.map(values, options.attrDecimals);
            str += values.join(" ") + '"';
        } else {
            if (attr !== 'version') {
                str += options.attrDecimals(this.attributes[attr]) + '"';
            } else {
                str += this.attributes[attr] + '"';
            }
        }
    }

    // Write styles
    var usedStyles = this.getUsedStyles(options);
    if (usedStyles.length > 1) {
        str += ' style="' + usedStyles.join(';') + '"';
    } else if (usedStyles.length === 1) {
        var style = usedStyles[0].split(':');
        str += ' ' + style[0] + '="' + style[1] + '"';
    }

    // Don't write group if it has no attributes, but do write its children
    // Assume g element has no text (which it shouldn't)
    // TODO: if g contains styles could add styles to children (only if using CSS)
    if (this.tag === 'g' && options.removeCleanGroups && !usedAttributes && !usedStyles) {
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
        removeNonEssentialStyles: true,
        removeEmptyElements: true,
        removeCleanGroups: true,
        attributeDecimalPlaces: 1,
        styleDecimalPlaces: 2,
    };

    this.options.nonEssentialStyles = nonEssentialStyles;
    this.options.namespaces = this.findNamespaces();
};

// Namespaces are attributes of the SVG element, prefaced with 'xmlns:'
// Create a hash mapping namespaces to false, except for the SVG namespace
SVG_Object.prototype.findNamespaces = function() {
        var namespaces = {};

        for (attr in this.elements.attributes) {
            if (attr.slice(0,6) === 'xmlns:') {
                var ns = attr.split(':')[1];
                namespaces[ns] = (ns === 'svg');
            }
        }

        return namespaces;
};

SVG_Object.prototype.toString = function() {
    this.options.newLine = (this.options.whitespace === 'remove') ? "": "\n";
    this.options.attrDecimals = this.getDecimalPlaceFunction(this.options.attributeDecimalPlaces);
    this.options.styleDecimals = this.getDecimalPlaceFunction(this.options.styleDecimalPlaces);

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