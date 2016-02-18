var SVG_optimise = {
    svgToJQueryObject: function(svgString) {
        // Replace any leading whitespace which will mess up XML parsing
        svgString =  svgString.replace(/^[\s\n]*/, "");

        // Parse SVG as XML
        var svgDoc = $.parseXML(svgString);
        return $(svgDoc).children()[0];
    },

    // Parse digit string to digit, keeping any final units
    // e.g. "str" -> 'str'
    // e.g. "3.4" -> { number: 3.4 }
    // e.g. "3.4 px" -> { number: 3.4, units: 'px' }
    parseNumber: function(str) {
        // TODO: Maybe move regex somewhere else
        var reDigit = /^\s*([-+]?[\d\.]+)(e[-+]?[\d\.]+)?\s*(%|em|ex|px|pt|pc|cm|mm|in)?\s*$/i;
        var digits = reDigit.exec(str);

        if (digits === null) { return str; }

        var num = { number: parseFloat(digits[1] + (digits[2] || "")) };
        if (digits[3]) { num.units = digits[3]; }

        return num;
    },

    /**
    * Parse the value for the "d" attribute of a path, returning an array of arrays.
    * The first value in each sub-array is a letter refering to the type of line segment.
    * The other values are the numerical parameters for that segment.
    * e.g "M10,20 L23,45" -> [['M', 10, 20], ['L', 23, 45]]
    * TODO: ensure commands have correct number of parameters
    */
    parsePath: function(dAttr) {
        var reCommands = /([ACHLMQSTVZ])([-\+\d\.\s,e]*)/gi;
        var reDigits = /([-+]?[\d\.]+)([eE][-+]?[\d\.]+)?/g;
        var commands, path = [];

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
            var letter = commands[1];
            var digits = getDigits(commands[2]);
            path.push([letter].concat(digits));
        }

        return path;
    },

    // Split a string from a style attribute into a object of styles
    // e.g. style="fill:#269276;opacity:1" => {fill: '#269276', opacity: '1'}
    parseStyle: function(styleString) {
        var styles = {};
        var styleArray = styleString.split(/\s*;\s*/);
        var reColonSplit = /\s*:\s*/;
        
        for (var i = 0; i < styleArray.length; i++) {
            var value = styleArray[i].split(reColonSplit);
            
            if (value.length === 2 && value[0] !== "" && value[1] !== "") {
                styles[value[0]] = this.parseNumber(value[1]);
            }
        }
        
        return styles;
    },

    // Convert transform attribute into an array of [transformation, digits]
    parseTransforms: function(transformString) {
        var reTransform = /([a-z]+)\s*\(([-\+\d\.\s,e]+)\)/gi;
        var digit, transform, transforms = [];

        while (transform = reTransform.exec(transformString)) {
            digits = transform[2].split(/\s*[,\s]+\s*/);
            transform = [transform[1].toLowerCase()];

            for (var i = 0; i < digits.length; i++) {
                digit = parseFloat(digits[i]);
                if (!isNaN(digit)) {
                    transform.push(digit);
                }
            }
            transforms.push(transform);
        }

        return transforms;
    },

    // Return a function that given a number optimises it.
    // type === 'decimal places': round to a number of decimal places
    // type === 'significant figure': round to a number of significant figures (needs work)
    getRoundingFunction: function(type, level) {
        var roundingFunction;
        level = parseInt(level, 10);

        if (!isNaN(level)) {
            var scale = Math.pow(10, level);

            if (type === 'decimal places') {
                roundingFunction = function(n) { return Math.round(n * scale) / scale; };
            } else if (type === 'significant figures') {
                roundingFunction = function(n) {
                    if (n === 0) { return 0; }
                    var mag = Math.pow(10, level - Math.ceil(Math.log(n < 0 ? -n: n) / Math.LN10));
                    return Math.round(n * mag) / mag;
                };
            } else {
                console.warn("No such rounding function, " + type);
                roundingFunction = function(n) { return n; };
            }

            return function(n) {
                if (isNaN(n)) {
                    return n;
                } else {
                    return roundingFunction(n);
                }
            };

        } else {
            // If level not properly defined, return identity function
            return function(str) { return str; };
        }
    },

    translatePath: function(pathCommands, dx, dy) {
        dx = dx || 0;
        dy = dy || 0;

        // TODO: move these elsewhere
        var simpleTranslations = 'MLQTCS';
        var nullTranslations = 'mlhvqtcsZz';

        var translatedPath = [];
        var command, commandLetter, translatedCommand, i, j;

        for (i = 0; i < pathCommands.length; i++) {
            command = pathCommands[i];
            commandLetter = command[0];
            translatedCommand = [commandLetter];

            // For simple commands, just add (dx, dy) to each pair of values
            if (simpleTranslations.indexOf(commandLetter) > -1) {
                for (j = 1; j < command.length;) {
                    translatedCommand.push(command[j++] + dx);
                    translatedCommand.push(command[j++] + dy);
                }
            } else if (commandLetter === 'H') {
                for (j = 1; j < command.length; j++) {
                    translatedCommand.push(command[j] + dx);
                }
            } else if (commandLetter === 'V') {
                for (j = 1; j < command.length; j++) {
                    translatedCommand.push(command[j] + dy);
                }
            } else if (commandLetter === 'A') {
                for (j = 1; j < command.length; j += 7) {
                    translatedCommand.push(command[j + 5] + dx);
                    translatedCommand.push(command[j + 6] + dy);
                }
            } else if (nullTranslations.indexOf(commandLetter) > -1) {
                // Commands unaffected by translation, so add a copy of the whole thing
                translatedPath.push(command.slice());
                continue;
            } else {
                console.warn("Unexpected letter in path: " + commandLetter);
            }

            translatedPath.push(translatedCommand);
        }

        return translatedPath;
    },

    // Given an array of arrays of the type from by parsePath,
    // optimise the commands and return the reduced array
    // TODO: option to use relative or absolute paths
    optimisePath: function(path, options) {
        var pathLength = path.length;

        // If there's only one command (other than z), then there's no path
        if (pathLength < 2 || (pathLength === 2 && path[1] === 'z')) {
            return [];
        }

        // If a path only consists of m commands (and z) we remove it
        var onlyMoveCommands = true;

        var optimisedPath = [];
        var currentCommand = [];

        for (var i = 0; i < pathLength; i++) {
            var command = path[i];
            var commandType = command[0];
            if (onlyMoveCommands) { onlyMoveCommands = 'mMzZ'.indexOf(commandType) !== -1; }

            if (commandType !== currentCommand[0]) {
                currentCommand = command.slice();
                optimisedPath.push(currentCommand);
            } else {
                // Combine paths commands when they are the same
                Array.prototype.push.apply(currentCommand, command.slice(1));
            }

            // Relative horizontal and vertical commands can be added together
            if ((commandType === 'h' || commandType === 'v')) {
                while (currentCommand.length > 2) {
                    currentCommand[1] += currentCommand.pop();
                }
            }
        }

        // Paths that are only move command can be ignored
        if (onlyMoveCommands) { return []; }

        return optimisedPath;
    },

    // Given an array of arrays of the type from by parsePath,
    // return a string for that path's `d` attribute
    getPathString: function(path, options) {
        var pathString = "";

        for (var i = 0; i < path.length; i++) {
            var command = path[i];
            if (command.length) {
                pathString += command[0];
                
                for (var j = 1; j < command.length; j++) {
                    var n = command[j];
                    var d = options.positionDecimals(n);
                    // Add a space if this is no the first digit and if the digit positive
                    pathString += (j > 1 && (n > 0 || d == '0')) ? " " + d : d;
                }
            }
        }

        return pathString;
    },

};


// Node in an SVG document
var SVG_Element = function(element, parent) {
    this.tag = element.nodeName;
    this.attributes = {};
    this.styles = {};
    this.parent = parent;
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

    // Parse path d attrbute to an array of arrays
    if (this.tag === 'path' && this.attributes.d) {
        this.path = SVG_optimise.parsePath(this.attributes.d);
    }

    // Add children
    for (i = 0; i < element.childNodes.length; i++) {
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

SVG_Element.prototype.write = function(options, depth) {
    depth = depth || 0;
    var indent = (options.whitespace === 'remove') ? '' : new Array(depth + 1).join('  ');

    // Open tag
    var str = indent + '<' + this.tag;

    // Write attributes and count how many have been used
    for (var attr in this.attributes) {
        var attributeValue = this.attributes[attr];
        if (this.path && attr === 'd') {
            var optimisedPath = SVG_optimise.optimisePath(this.path, options);
            attributeValue = SVG_optimise.getPathString(optimisedPath, options);
        }

        str += ' ' + attr + '="' + attributeValue + '"';
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
