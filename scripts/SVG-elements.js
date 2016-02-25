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

    // TODO: may need to replace this with actual namespace
    this.namespaceURI = 'http://www.w3.org/2000/svg';

    // Add attributes to hash
    var i, attributes = element.attributes;
    if (element.attributes) {
        for (i = 0; i < attributes.length; i++){
            var attr = attributes.item(i);
            var attrName = attr.nodeName;
            this.attributes[attrName] = attr.value;
        }
    }

    // Parse attributes
    if (this.attributes.transform) {
        this.addTransform(this.attributes.transform);
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

// TODO: make sure this works with multiple transforms
SVG_Element.prototype.addTransform = function(transform) {
    this.transform = SVG_optimise.parseTransforms(transform);
    // TODO: Only doing this so it shows up when we write the object
    // Need to fix so that we can do this without calling optimise
    this.attributes.transform = transform;
};

SVG_Element.prototype.write = function(options, depth) {
    depth = depth || 0;
    var indent = (options.whitespace === 'remove') ? '' : new Array(depth + 1).join('  ');

    // Open tag
    var str = indent + '<' + this.tag;

    this.optimise(options);

    // If shape element lacks some dimension then don't draw it
    // TODO: move this into the optimise function
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
    if (this.transform) {
        this.applyTransformation(this.attributes, options);
    }

    for (var i = 0; i < this.children.length; i++) {
        this.children[i].optimise(options);
    }
};

SVG_Element.prototype.applyTransformation = function(coordinates, options) {
    for (var i = 0; i < this.transform.length; i++) {
        var transform = this.transform[i];
        var transformFunction = this[transform[0]];

        if (transformFunction) {
            coordinates = transformFunction(coordinates, transform.slice(1));
            // Remove transformation from the attribute hash
            // TOOD: Check there are no other transformations in the attribute
            delete this.attributes.transform;
        }
    }

    return coordinates;
};

SVG_Element.prototype.createSVGObject = function() {
    var element = document.createElementNS(this.namespaceURI, this.tag);

    for (var attr in this.attributes) {
        element.setAttribute(attr, this.attributes[attr]);
    }

    if (this.text) {
        var textNode = document.createTextNode(this.text);
        element.appendChild(textNode);
    }

    for (var i = 0; i < this.children.length; i++) {
        element.appendChild(this.children[i].createSVGObject());
    }

    return element;
};


// Path element
// https://www.w3.org/TR/SVG/paths.html
var SVG_Path_Element = function(element) {
    SVG_Element.call(this, element);

    // Convert path d attribute to array of arrays
    if (this.attributes.d) {
        this.path = SVG_optimise.parsePath(this.attributes.d);
    }
};
SVG_Path_Element.prototype = Object.create(SVG_Element.prototype);

SVG_Path_Element.prototype.optimise = function(options) {
    // Replace current d attributed with optimised version
    if (this.path) {
        var optimisedPath = this.path;

        if (this.transform) {
            optimisedPath = this.applyTransformation(optimisedPath, options);
        }

        optimisedPath = SVG_optimise.optimisePath(optimisedPath, options);
        // TODO: don't replace attribute but write a new one instead
        this.attributes.d = SVG_optimise.getPathString(optimisedPath, options);
    }

    for (var i = 0; i < this.children.length; i++) {
        this.children[i].optimise(options);
    }
};

SVG_Path_Element.prototype.translate = function(coordinates, parameters) {
    return SVG_optimise.transformPath.translate(coordinates, parameters);
};

SVG_Path_Element.prototype.scale = function(coordinates, parameters) {
    return SVG_optimise.transformPath.scale(coordinates, parameters);
};

// Rect element
// https://www.w3.org/TR/SVG/shapes.html#RectElement
var SVG_Rect_Element = function(element) {
    SVG_Element.call(this, element);

    this.attributes.x = parseFloat(this.attributes.x || 0);
    this.attributes.y = parseFloat(this.attributes.y || 0);
    this.attributes.width = parseFloat(this.attributes.width || 0);
    this.attributes.height = parseFloat(this.attributes.height || 0);
};
SVG_Rect_Element.prototype = Object.create(SVG_Element.prototype);

SVG_Rect_Element.prototype.translate = function(coordinates, parameters) {
    var attributes = SVG_optimise.transformShape.translate('rect', coordinates, parameters);
    // TODO: Move this the the translate function when we decide how to update attributes
    $.extend(coordinates, attributes);
    return coordinates;
};

// Create the child element of an given element with the correct Objects
SVG_Element.prototype.getChild = function(child) {
    if (child.nodeName === 'path') {
        return new SVG_Path_Element(child);
    } else if (child.nodeName === 'rect') {
        return new SVG_Rect_Element(child);
    } else {
        return new SVG_Element(child);
    }
};


// Base object containing the SVG elements
// Also where the optimisation options are stored
var SVG_Root = function(svgString) {
    var jQuerySVG = svgString;

    // If passed a string, convert to JQuery object other assume we already have a JQuery object
    if (typeof svgString === 'string') {
       jQuerySVG = SVG_optimise.svgToJQueryObject(svgString);
    }

    this.elements = SVG_Element.prototype.getChild(jQuerySVG);
    this.options = {
        whitespace: 'remove',
        positionDecimals: SVG_optimise.getRoundingFunction('decimal places', 1),
        removeRedundantShapes: true
    };
};

SVG_Root.prototype.optimise = function() {
    return this.elements.optimise(this.options);
};

// Return a string representing an SVG
SVG_Root.prototype.write = function() {
    this.options.newLine = (this.options.whitespace === 'remove') ? "": "\n";
    return this.elements.write(this.options);
};

// Return an SVG objec that can be inserted into the DOM
SVG_Root.prototype.createSVGObject = function() {
    return  this.elements.createSVGObject();
};

