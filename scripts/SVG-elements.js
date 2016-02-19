/**********************************************************
    This file contains Objects uses to build a 
    representation of an SVG DOM.
***********************************************************/

// Generic SVG DOM element
var SVG_Element = function(element) {
    this.tag = element.nodeName;
    this.attributes = {};
    this.styles = {};
    this.children = [];
    this.text = "";

    // Add attributes to hash
    var i, attributes = element.attributes;
    if (element.attributes) {
        for (i = 0; i < attributes.length; i++){
            var attr = attributes.item(i);
            var attrName = attr.nodeName;
            this.attributes[attrName] = attr.value;
        }
    }

    for (i = 0; i < element.childNodes.length; i++) {
        var child = element.childNodes[i];
        if (child instanceof Text) {
            // Tag contains text
            if (child.data.replace(/^\s*/, "") !== "") {
                this.text = child.data;
            }
        } else {
            this.children.push(this.getChild(child));
        }
    }
};

SVG_Element.prototype.write = function(options, depth) {
    depth = depth || 0;
    var indent = (options.whitespace === 'remove') ? '' : new Array(depth + 1).join('  ');

    // Open tag
    var str = indent + '<' + this.tag;

    this.optimise(options);

    // If shape element lacks some dimension then don't draw it
    var essentialAttributes = SVG_optimise.essentialAttributes[this.tag];
    if (options.removeRedundantShapes && essentialAttributes) {
        for (var i = 0; i < essentialAttributes.length; i++) {
            if (!this.attributes[essentialAttributes[i]]) {
                return "";
            }
        }
    }

    // Write attributes
    for (var attr in this.attributes) {
        str += ' ' + attr + '="' + this.attributes[attr] + '"';
    }

    // Add child information
    var childString = "";
    for (var i = 0; i < this.children.length; i++) {
        childString += this.children[i].write(options, depth + 1);
    }

    if (this.text.length + childString.length > 0) {
        str += ">";
        if (this.text) { str += indent + "  " + this.text; }
        str += childString + indent + "</" + this.tag + ">";
    } else {
        str += "/>";
    }

    return str + options.newLine;
};

SVG_Element.prototype.optimise = function(options) {
    // Current empty - may be overwritten
};


var SVG_Path_Element = function(element) {
    SVG_Element.call(this, element);

    // Convert path d attribute to array of arrays
    if (this.attributes.d) {
        this.path = SVG_optimise.parsePath(this.attributes.d);
    }
};
SVG_Path_Element.prototype = Object.create(SVG_Element.prototype);

SVG_Element.prototype.optimise = function(options) {
    // Replace current d attributed with optimised version
    // TODO: don't replace by write elsewhere
    if (this.path) {
        var optimisedPath = SVG_optimise.optimisePath(this.path, options);
        this.attributes.d = SVG_optimise.getPathString(optimisedPath, options);
    }
};


// Create the child element of an given element with the correct Objects
SVG_Element.prototype.getChild = function(child) {
    if (child.nodeName === 'path') {
        return new SVG_Path_Element(child);
    } else {
        return new SVG_Element(child);
    }
};


// Base object containing the SVG elements
// Also where the optimisation options are stored
var SVG_Root = function(svgString) {
    var jQuerySVG = SVG_optimise.svgToJQueryObject(svgString);

    this.elements = SVG_Element.prototype.getChild(jQuerySVG);
    this.options = {
        whitespace: 'remove',
        positionDecimals: SVG_optimise.getRoundingFunction('decimal places', 1),
        removeRedundantShapes: true
    };
};

SVG_Root.prototype.write = function() {
    this.options.newLine = (this.options.whitespace === 'remove') ? "": "\n";

    return this.elements.write(this.options);
};

