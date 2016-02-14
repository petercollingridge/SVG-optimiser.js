var SVG_optimise = {
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
            transform = [transform[1]];
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

    // Given an array of arrays of the type from by parsePath,
    // optimise the commands and return the reduced array
    // TODO: option to use relative or absolute paths
    optimisePath: function(path, options) {
        var pathLength = path.length;

        // If there's only one command (other than z), then there's no path
        if (pathLength < 2 || (pathLength === 2 && path[1] === 'z')) {
            return [];
        }

        var optimisedPath = [];
        var currentCommand = [];
        for (var i = 0; i < pathLength; i++) {
            var command = path[i];
            var commandType = command[0];

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
    }
};