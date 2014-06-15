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

var SVG_Element = function(element, parents, root) {
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
            this.children.push(new SVG_Element(child, this, root));
        }
    }
};

SVG_Element.prototype.toString = function() {
	var str = '<' + this.tag;

    // Write attributes
    for (var attr in this.attributes) {
        str += ' ' + attr + '="';
        str += this.attributes[attr];
        str += '"';
    }

    // Write styles
    var styleString = "";
    for (var style in this.styles) {
        styleString += style + ':' + this.styles[style] + ';';
    }

    if (styleString) {
    	str += ' style="' + styleString + '"';
    }

    // Write child information
    var childString = "";
    for (var i = 0; i < this.children.length; i++) {
    	childString += this.children[i].toString();
    }

    if (this.text.length + childString.length > 0) {
        str += ">\n";
        str += this.text + childString;
        str += '</' + this.tag + '>\n';
    } else {
    	str += "/>\n";
    }

    return str;
};

// A wrapper for SVG_Elements which store the options for optimisation
// Build from a jQuery object representing the SVG
var SVG_Object = function(jQuerySVG) {
	this.elements = new SVG_Element(jQuerySVG, null, this);
    this.options = {};
};

SVG_Object.prototype.toString = function() {
	return this.elements.toString();
};