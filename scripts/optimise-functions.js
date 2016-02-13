var SVG_optimise = {
    // Take the value for the "d" attribute of a path and return an array of arrays
    // The first value in each sub-array is a letter refering to the type of path.
    // The other values are the numerical parameters for that path
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
    }
};

console.log(SVG_optimise.parsePath("M 270.15082,287.7259 C 275.16461,280.01462 281.37546,272.55352 289.55131,268.13521 C 299.42699,265.07059 309.33566,274.29614 309.8605,283.98778 C 312.05557,294.2993 300.09304,297.48274 292.27448,297.54928 C 281.67864,299.8587 272.51806,305.87794 263.64823,311.78348 C 255.12304,316.49246 245.06588,319.11201 238.24894,326.3488 C 231.95348,331.90474 225.09851,325.23928 229.08306,318.4931 C 232.55509,301.367 240.73269,285.3893 251.96037,272.06476 C 260.56945,259.30823 272.06848,248.66622 280.09597,235.53851 C 283.13341,231.37092 284.62352,224.4998 278.13284,224.47057 C 273.00556,216.03772 280.23289,209.7938 279.3532,197.91107 C 276.22736,189.50426 274.53198,183.38562 268.70683,178.80434 C 260.21687,169.7795 252.26797,166.79306 237.24626,159.16725 C 218.26467,155.4031 211.74964,154.26706 231.76887,163.38204 C 233.18419,172.3556 217.02149,165.11534 213.05423,171.08331 C 205.11218,174.66054 223.92868,172.66761 219.92099,178.73114 C 215.61855,177.65843 196.73394,191.8475 211.53082,186.78126 C 218.67969,189.14659 224.29481,194.91609 231.25932,197.89285 C 238.1055,200.68645 245.6366,202.06576 251.47445,206.97424 C 259.0014,212.6582 266.12563,218.89427 274.20199,223.80491 C 275.48884,224.80193 276.71285,225.88642 277.80296,227.09755"));