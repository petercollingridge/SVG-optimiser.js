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
                // Style written as a separate attribute
                this.styles[attrName] = this.parseNumber(attr.value);
            } else if (this.tag === "path" && attrName === 'd') {
                this.pathCommands = this.parsePath(attr.value);
            } else {
                this.attributes[attrName] = this.parseNumber(attr.value);
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

// Parse digit string to digit, keeping any final units
SVG_Element.prototype.parseNumber = function(str) {
    // TODO: Maybe move regex somewhere else
    var reDigit = /^\s*([-+]?[\d\.]+)([eE][-+]?[\d\.]+)?\s*(%|em|ex|px|pt|pc|cm|mm|in)\s*$/;
    var digit = reDigit.exec(str);
    var n = parseFloat(digit ? digit[1] + (digit[2] || "") : str);

    if (isNaN(n)) {
        return [str];
    } else {
        return [n, digit ? digit[3] : ""];
    }
};

// Split a string from a path "d" attribute into a list of letters and values
SVG_Element.prototype.parsePath = function(dAttr) {
    var reCommands = /([ACHLMQSTVZ])([-\+\d\.\s,e]*)/gi
    var reDigits = /([-+]?[\d\.]+)([eE][-+]?[\d\.]+)?/g;
    var letters = [];
    var values = [];

    // Converts a string of digits to an array of floats
    var getDigits = function(digitString) {
        var digit, digits = [];

        if (digitString) {
            while (digit = reDigits.exec(digitString)) {
                digits.push(parseFloat(digit));
            }
        }
        return digits;
    };

    while (commands = reCommands.exec(dAttr)) {
        letters.push(commands[1]);
        values.push(getDigits(commands[2]));
    }

    return { letters: letters, values: values };
}

// Split a string from a style attribute into a hash of styles
// e.g. style="fill:#269276;opacity:1" => {fill: '#269276', opacity: '1'}
SVG_Element.prototype.parseStyle = function(styleString) {
    var styles = {};
    var styleArray = styleString.split(/\s*;\s*/);
    
    for (var i = 0; i < styleArray.length; i++) {
        var value = styleArray[i].split(/\s*:\s*/);
        
        if (value.length === 2) {
            styles[value[0]] = this.parseNumber(value[1]);
        }
    }
    
    return styles;
};

SVG_Element.prototype.parseTransform = function(transformString) {
    var reTransform = /([a-z]+)\s*\(([-\+\d\.\s,e]+)\)/gi;
    var transform, transforms = [];

    if (transformString) {
        while (transform = reTransform.exec(transformString)) {
            digits = transform[2].split(/\s*[,\s]+\s*/);
            transforms.push([transform[1], $.map(digits, parseFloat)])
        }
    }

    return transforms;
};

// Return an object mapping attribute: value
// Only return used attributes and optimised values
SVG_Element.prototype.getUsedAttributes = function(options) {
    var usedAttributes = {};
    var transformedAttributes = {};

    // If one attribute is a transformation then try to apply it
    // If successful, remove the transformation
    if (options.applyTransforms && this.attributes.transform) {
        var transforms = this.parseTransform(this.attributes.transform);

        for (var i = 0; i < transforms.length; i++) {
            newAttributes = this.applyTransformation(transforms[i], transformedAttributes);
            if (newAttributes) {
                transformedAttributes = newAttributes;
                transformedAttributes.transform = "";
            } else {
                // For now, if any transform fails, give up
                // TODO: fix this
                transformedAttributes = {};
                break;
            }
        }
    }

    for (var attr in this.attributes) {
        // Remove attributes whose namespace has been removed and links to namespace URIs
        if (attr.indexOf(':') !== -1) {
            var ns = attr.split(':');
            if (!options.namespaces[ns[0]] || (ns[0] === 'xmlns' && !options.namespaces[ns[1]])) {
                continue;
            }
        }
        
        var value = transformedAttributes[attr] === undefined ? this.attributes[attr] : transformedAttributes[attr];

        // Attributes shouldn't be empty and this removes applied transformations
        if (value === "") { continue; }

        // Remove position attributes equal to 0 (the default value)
        if (options.removeDefaultAttributes &&
            positionAttributes.indexOf(attr) !== -1 &&
            options.positionDecimals(value) == 0) {
            continue;
        }

        // TODO: only remove ids that are not referenced elsewhere
        if (options.removeIDs && attr === 'id') {
            continue;
        }

        // Process values

        // TODO: convert tags to lowercase so will work with 'viewbox'
        // TODO: also apply decimal places to transforms
        if (attr === 'viewBox' || attr === 'points') {
            var values = value.split(/[\s,]+/);
            value = $.map(values, options.positionDecimals).join(" ");
        } else if (this.tag === 'svg' && (attr === 'width' || attr === 'height')) {
            value = options.svgSizeDecimals(value);
        } else if (this.tag === 'path' && attr === 'd') {
            value = this.getPathString(options);
        } else if (positionAttributes.indexOf(attr) !== -1 ) {
            value = options.positionDecimals(value);
        }

        usedAttributes[attr] = value;
    }
    
    return usedAttributes;
};

// Return a list of strings in the form "style:value" for the styles that are to be used
// They are sorted alphabetically so the strings can be compared for sets of the same style
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
        var value = this.styles[style];

        if (value.length > 1) {
            // If we're multiplying positons by powers of 10, certain styles also need multiplying
            // TODO: will also have to change font sizes
            if (options.attributeNumTruncate[1] === 'order of magnitude' && style === 'stroke-width') {
                value = options.positionDecimals(value[0]) + value[1];
            } else {
                value = options.styleDecimals(value[0]) + value[1];
            }
        } else {
            value = value[0];
        }

        // Simplify colours, e.g. #ffffff -> #fff
        var repeated = value.match(/^#([0-9a-f])\1([0-9a-f])\2([0-9a-f])\3$/i);
        if (repeated) {
            value = '#' + repeated[1]  + repeated[2] + repeated[3];
        }

        if (ignoreFill && style.substr(0, 4) === 'fill') { continue; }
        if (ignoreStroke && style.substr(0, 6) === 'stroke') { continue; }
        if (options.removeDefaultStyles && value == defaultStyles[style]) { continue; }
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

    var usedAttributes = this.getUsedAttributes(options);

    // If shape element lacks some dimension then don't draw it
    if (options.removeRedundantShapes && essentialAttributes[this.tag]) {
        var attributes = essentialAttributes[this.tag];
        for (var i = 0; i < attributes.length; i++) {
            if (!usedAttributes[attributes[i]]) {
                return "";
            }
        }
    }

    for (var attr in usedAttributes) {
        str += ' ' + attr + '="' + usedAttributes[attr] + '"';
    }        

    // Write styles
    var usedStyles = this.getUsedStyles(options);
    if (usedStyles.length > 1) {
        // Write as all styles in a style attribute
        str += ' style="' + usedStyles.join(';') + '"';
    } else if (usedStyles.length === 1) {
        // Only one style, so just write that attribute
        var style = usedStyles[0].split(':');
        str += ' ' + style[0] + '="' + style[1] + '"';
    }

    // Don't write group if it has no attributes, but do write its children
    // Assume g element has no text (which it shouldn't)
    // TODO: if g contains styles could add styles to children (only if using CSS or there is 1 child)
    if (this.tag === 'g' && options.removeCleanGroups && !usedAttributes && !usedStyles) {
        var childString = "";
        for (var i = 0; i < this.children.length; i++) {
            childString += this.children[i].toString(options, depth + 1);
        }
        return childString;
    }

    // Get child information
    var childString = "";
    for (var i = 0; i < this.children.length; i++) {
        childString += this.children[i].toString(options, depth + 1);
    }

    if (this.text.length + childString.length > 0) {
        str += ">" + options.newLine;
        str += indent + "  " + this.text + options.newLine;
        str += childString;
        str += indent + "</" + this.tag + ">" + options.newLine;
    } else {
        // Don't write an empty element or a group with no children
        if ((options.removeEmptyElements && usedAttributes.length === 0) || this.tag === 'g') {
            return "";
        }
        str += "/>" + options.newLine;
    }

    return str;
};

// Create a string for the 'd' attribute of a path
SVG_Element.prototype.getPathString = function(options) {
    var coordString = "";

    if (this.pathCommands) {
        var letters = this.pathCommands.letters;
        var values = this.pathCommands.values;

        if (letters.length < 2 || (letters.length === 2 && letters[1] === 'z')) {
            return "";
        }

        var currentLetter;
        for (var i = 0; i < letters.length; i++) {
            coordString += (letters[i] === currentLetter) ? " " : letters[i];
            currentLetter = letters[i];
            
            if (values[i]) {
                for (var j = 0; j < values[i].length; j++) {
                    if (j > 0  && values[i][j] >= 0) coordString += " ";
                    coordString += options.positionDecimals(values[i][j]);
                }
            }
        }
    }

    return coordString;
};

// Works with numbers in the form [number, units]
// Might not be necessary to deal with units
SVG_Element.prototype.applyTransformation = function(transform, attributes) {
    var transformType = transform[0];
    var transformValues = transform[1];

    if (this.tag === 'rect') {
        var x = attributes.x || this.attributes.x;
        var y = attributes.y || this.attributes.y;

        if (transformType === 'translate') {
            attributes.x = [x[0] + (transformValues[0] || 0), x[1]];
            attributes.y = [y[0] + (transformValues[1] || 0), y[1]];
            return attributes;
        }
    }
    return false;
};

// A wrapper for SVG_Elements which store the options for optimisation
// Build from a jQuery object representing the SVG
var SVG_Object = function(jQuerySVG) {
    this.elements = new SVG_Element(jQuerySVG, null);

    // Set default options
    this.options = {
        whitespace: 'remove',
        removeIDs: false,
        removeDefaultAttributes: true,
        removeDefaultStyles: true,
        removeNonEssentialStyles: true,
        removeEmptyElements: true,
        removeRedundantShapes: true,
        removeCleanGroups: true,
        applyTransforms: true,
        attributeNumTruncate: [1, 'decimal place'],
        styleNumTruncate: [2, 'significant figure'],
        svgSizeTruncate: [0, 'decimal place'],
    };

    //this.options.attributeNumTruncate = [1, 'order of magnitude'];

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

    this.options.positionDecimals = this.getDecimalOptimiserFunction(this.options.attributeNumTruncate);
    this.options.styleDecimals = this.getDecimalOptimiserFunction(this.options.styleNumTruncate);
    this.options.svgSizeDecimals = this.getDecimalOptimiserFunction(this.options.svgSizeTruncate);

    return this.elements.toString(this.options);
};

// Return a function that given a number optimises it.
// type === 'decimal place': round to a number of decimal places
// type === 'significant figure': round to a number of significant figures (needs work)
// type === 'order of magnitude': multiply by a power of 10, then round
SVG_Object.prototype.getDecimalOptimiserFunction = function(parameters) {
    var level = parameters[0];
    var type = parameters[1];

    if (!isNaN(parseInt(level))) {
        var scale = Math.pow(10, level);
        var reDigit = /^\s*([-+]?[\d\.]+)([eE][-+]?[\d\.]+)?\s*(%|em|ex|px|pt|pc|cm|mm|in)\s*$/;

        var roundFunction;
        if (type === 'decimal place') {
            roundFunction = function(n) { return Math.round(n * scale) / scale; }
        } else if (type === 'significant figure') {
            roundFunction = function(n) {
                if (n == 0) { return 0; }
                var mag = Math.pow(10, level - Math.ceil(Math.log(n < 0 ? -n: n) / Math.LN10));
                return Math.round(n * mag) / mag;
            }
        } else if (type === 'order of magnitude') {
            roundFunction = function(n) { return Math.round(n * scale); }
        } else {
            roundFunction = function(n) { return n; }
        }

        return function(str) {
            // Parse digit string to digit, while keeping any final units
            var digit = reDigit.exec(str);
            var n = parseFloat(digit ? digit[1] + (digit[2] || "") : str);

            if (isNaN(n)) {
                return str;
            } else {
                return roundFunction(n) + (digit ? digit[3] : "");
            }
        };
    } else {
        // This shouldn't happen, but just in case, return an identity function
        return function(str) { return str; };
    }
};