var SVG_optimise = {
    // Parse digit string to digit, keeping any final units
    // e.g. "3.4 ex" -> [3.4, 'ex']
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
    */
    parsePath: function(dAttr) {
        var reCommands = /([ACHLMQSTVZ])([-\+\d\.\s,e]*)/gi;
        var reDigits = /([-+]?[\d\.]+)([eE][-+]?[\d\.]+)?/g;
        var path = [];

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
    }
};