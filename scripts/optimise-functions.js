var SVG_optimise = {
    // Map element type to attribute that is required in order to show up
    essentialAttributes: {
        'path': ['d'],
        'polygon': ['points'],
        'polyline': ['points'],
        'rect': ['width', 'height'],
        'circle': ['r'],
        'ellipse': ['r'],
    },

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

    // Apply transform to elements, rect, circle, ellipse, line
    transformShape: {
        translate: function(tag, attributes, parameters) {
            var dx = parameters[0] || 0;
            var dy = parameters[1] || 0;
            var newAttributes = {};

            if (tag === 'rect') {
                newAttributes.x = (attributes.x || 0) + dx;
                newAttributes.y = (attributes.y || 0) + dy;
            } else if (tag === 'circle' || tag === 'ellipse') {
                newAttributes.cx = (attributes.cx || 0) + dx;
                newAttributes.cy = (attributes.cy || 0) + dy;
            } else if (tag === 'line') {
                newAttributes.x1 = (attributes.x1 || 0) + dx;
                newAttributes.x2 = (attributes.x2 || 0) + dx;
                newAttributes.y1 = (attributes.y1 || 0) + dy;
                newAttributes.y2 = (attributes.y2 || 0) + dy;
            } else if (tag === 'polyline' || tag === 'polygon') {
                var points = attributes.points || [];
                newAttributes.points = [];
                for (var i = 0; i < points.length; i++) {
                    newAttributes.points[i] = (points[i] || 0) + dx;
                    i++;
                    newAttributes.points[i] = (points[i] || 0) + dy;
                }
            } else {
                console.warn("Element " + tag + " could not be translated");
            }

            return newAttributes;
        },
    },

    transformPath: {
        translate: function(pathCommands, parameters) {
            var dx = parameters[0] || 0;
            var dy = parameters[1] || 0;

            // TODO: move these elsewhere
            var simpleTranslations = 'MLQTCS';
            var nullTranslations = 'mlhvqtcsZz';

            var translatedPath = [];
            var command, commandLetter, translatedCommand, i, j;

            for (i = 0; i < pathCommands.length; i++) {
                command = pathCommands[i];
                commandLetter = command[0];
                translatedCommand = command.slice();

                // For simple commands, just add (dx, dy) to each pair of values
                if (simpleTranslations.indexOf(commandLetter) > -1) {
                    for (j = 1; j < command.length;) {
                        translatedCommand[j++] += dx;
                        translatedCommand[j++] += dy;
                    }
                } else if (commandLetter === 'H') {
                    // Should only ever be one command if we have optimised
                    for (j = 1; j < command.length; j++) {
                        translatedCommand[j] += dx;
                    }
                } else if (commandLetter === 'V') {
                    // Should only ever be one command if we have optimised
                    for (j = 1; j < command.length; j++) {
                        translatedCommand[j] += dy;
                    }
                } else if (commandLetter === 'A') {
                    for (j = 1; j < command.length; j += 7) {
                        translatedCommand[j + 5] += dx;
                        translatedCommand[j + 6] += dy;
                    }
                } else if (i === 0 && commandLetter === 'm') {
                    // Paths starting with a relative m should be treated as an absolute M
                    translatedCommand[1] += dx;
                    translatedCommand[2] += dy;
                } else if (nullTranslations.indexOf(commandLetter) === -1){
                    console.warn("Unexpected letter in path: " + commandLetter);
                }

                translatedPath.push(translatedCommand);
            }

            return translatedPath;
        },
        scale: function(pathCommands, parameters) {
            var dx = parameters[0] || 0;
            var dy = parameters[1] || 0;

            // TODO: move these elsewhere
            var simpleScales = 'mlqtcsz';

            var scaledPath = [];
            var command, commandLetter, scaledCommand, i, j;

            for (i = 0; i < pathCommands.length; i++) {
                command = pathCommands[i];
                commandLetter = command[0].toLowerCase();
                scaledCommand = command.slice();

                // For simple commands, just add (dx, dy) to each pair of values
                if (simpleScales.indexOf(commandLetter) > -1) {
                    for (j = 1; j < command.length;) {
                        scaledCommand[j++] *= dx;
                        scaledCommand[j++] *= dy;
                    }
                } else if (commandLetter === 'h') {
                    // Should only ever be one command if we have optimised
                    for (j = 1; j < command.length; j++) {
                        scaledCommand[j] *= dx;
                    }
                } else if (commandLetter === 'v') {
                    // Should only ever be one command if we have optimised
                    for (j = 1; j < command.length; j++) {
                        scaledCommand[j] *= dy;
                    }
                } else if (commandLetter === 'a') {
                    // TODO: Check this works
                    for (j = 1; j < command.length; j += 7) {
                        if (dx > 0) {
                            scaledCommand[j] *= dx;
                        } else {
                            scaledCommand[j] *= -dx;
                            // Flip sweep flag
                            scaledCommand[j + 4] = 1 - scaledCommand[j + 4];
                        }
                        if (dy > 0) {
                            scaledCommand[j + 1] *= dy;
                        } else {
                            // Flip sweep flag
                            scaledCommand[j + 1] *= -dy;
                            scaledCommand[j + 4] = 1 - scaledCommand[j + 4];
                        }
                        scaledCommand[j + 5] *= dx;
                        scaledCommand[j + 6] *= dy;
                    }
                } else {
                    console.warn("Unexpected letter in path: " + command[0]);
                }

                scaledPath.push(scaledCommand);
            }

            return scaledPath;
        }
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
            var lowerCaseLetter = commandType.toLowerCase();    // For easier checking

            // Test whether paths contain only MmZz commands so we can remove them
            // Don't remove paths of the form Mx1 y1 x2 y2, since these draw a line
            if (onlyMoveCommands) {
                if (lowerCaseLetter !== 'z') {
                    if (lowerCaseLetter !== 'm') {
                        onlyMoveCommands = false;
                    } else {
                        onlyMoveCommands = command.length < 5;
                    }
                }
            }

            if (commandType !== currentCommand[0]) {
                currentCommand = command.slice();
                optimisedPath.push(currentCommand);
            } else if (lowerCaseLetter === 'm') {
                // With multiple m commands, replace old comand with the new one.
                // TODO: Need to take into account if commands are relative
                currentCommand = command.slice();
                optimisedPath[optimisedPath.length - 1] = currentCommand;
            } else {
                // Combine path commands when they are the same (and not M or m)
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
