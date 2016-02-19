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
            this.addChild(child);
        }
    }
};

SVG_Element.prototype.write = function(options, depth) {
    depth = depth || 0;
    var indent = (options.whitespace === 'remove') ? '' : new Array(depth + 1).join('  ');

    // Open tag
    var str = indent + '<' + this.tag;

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
    var optimisedPath = SVG_optimise.optimisePath(this.path, options);
    this.attributes.d = SVG_optimise.getPathString(optimisedPath, options);
};


// Create the child element of an given element with the correct Objects
SVG_Element.prototype.addChild = function(child) {
    if (child.nodeName === 'path') {
        this.children.push(new SVG_Path_Element(child));
    } else {
        this.children.push(new SVG_Element(child));
    }
};


// Base object containing the SVG elements
// Also where the optimisation options are stored
var SVG_Root = function(svgString) {
    var jQuerySVG = SVG_optimise.svgToJQueryObject(svgString);

    this.elements = new SVG_Element(jQuerySVG, null);
    this.options = {
        whitespace: 'remove',
        positionDecimals: SVG_optimise.getRoundingFunction('decimal places', 1)
    };
};

SVG_Root.prototype.write = function() {
    this.options.newLine = (this.options.whitespace === 'remove') ? "": "\n";

    return this.elements.write(this.options);
};

var testSVGString = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 10 10"><path class="black-line" transform="translate(-5, -15)" d="M10 20 L20 30 L30 20 z"/></svg>';
var testSVG = new SVG_Root(testSVGString);
console.log(testSVG.write());
