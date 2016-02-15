
QUnit.test("parseNumber", function(assert) {
	assert.deepEqual(SVG_optimise.parseNumber(""), "", "Empty string");
	assert.deepEqual(SVG_optimise.parseNumber("0"), { number: 0 }, "Zero");
	assert.deepEqual(SVG_optimise.parseNumber("0.000"), { number: 0 }, "Zero point Zero");
	assert.deepEqual(SVG_optimise.parseNumber("12"), { number: 12 }, "Integer");
	assert.deepEqual(SVG_optimise.parseNumber("1.0230"), { number: 1.023 }, "Decimal");
	assert.deepEqual(SVG_optimise.parseNumber("-1.0230"), { number: -1.023 }, "Negative");
	assert.deepEqual(SVG_optimise.parseNumber("+1.0230"), { number: 1.023 }, "Leading plus");
	assert.deepEqual(SVG_optimise.parseNumber("1.023e4"), { number: 10230 }, "Exponent");
	assert.deepEqual(SVG_optimise.parseNumber("1.023e+4"), { number: 10230 }, "Exponent with plus");
	assert.deepEqual(SVG_optimise.parseNumber("-10.2E-2"), { number: -0.102 }, "Negative exponent");
	assert.deepEqual(SVG_optimise.parseNumber("-1.2%"), { number: -1.2, units: '%' }, "Percent");
	assert.deepEqual(SVG_optimise.parseNumber("-1.23e3 px"), { number: -1230, units: 'px' }, "Pixels");
	assert.deepEqual(SVG_optimise.parseNumber("-1.23e3EM"), { number: -1230, units: 'EM' }, "Em");
	assert.deepEqual(SVG_optimise.parseNumber("1-2"), '1-2', "Subtract");
	assert.deepEqual(SVG_optimise.parseNumber("1e"), '1e', "Leading number");
	assert.deepEqual(SVG_optimise.parseNumber("word1"), 'word1', "Trailing number");
	assert.deepEqual(SVG_optimise.parseNumber("#2692e6"), '#2692e6', "Hex colour");
});

QUnit.test("parsePath", function(assert) {
	assert.deepEqual(SVG_optimise.parsePath(""), [], "Empty string");
	assert.deepEqual(SVG_optimise.parsePath("M 10 23 L 45 789"), [['M', 10, 23], ['L', 45, 789]], "Integers and spaces");
	assert.deepEqual(SVG_optimise.parsePath("M 10 23 a150,254 0 0 0 15,150"), [['M', 10, 23], ['a', 150, 254, 0, 0, 0, 15, 150]], "Multiple values");
	assert.deepEqual(SVG_optimise.parsePath("M 10 23 a 150 254 0 0 0 15,150z"), [['M', 10, 23], ['a', 150, 254, 0, 0, 0, 15, 150], ['z']], "Final z");
	assert.deepEqual(SVG_optimise.parsePath("m10,23L45,789"), [['m', 10, 23], ['L', 45, 789]], "Integers and no spaces");
	assert.deepEqual(SVG_optimise.parsePath("  M 10,23 l45 , 789   "), [['M', 10, 23], ['l', 45, 789]], "Integers and mixed spaces");
	assert.deepEqual(SVG_optimise.parsePath("M 10.0 23.2 L 45.0001 0.00"), [['M', 10, 23.2], ['L', 45.0001, 0]], "Decimals");
	assert.deepEqual(SVG_optimise.parsePath("M 10.0-23.2 L-45.1-0.00, -4 3"), [['M', 10, -23.2], ['L', -45.1, 0, -4, 3]], "Negatives");
	assert.deepEqual(SVG_optimise.parsePath("M 12.3 2.3e2 L-1e1 -7e-3"), [['M', 12.3, 230], ['L', -10, -0.007]], "Exponents");
});

QUnit.test("parseStyle", function(assert) {
	assert.deepEqual(SVG_optimise.parseStyle(""), {}, "Empty string");
	assert.deepEqual(SVG_optimise.parseStyle("fill"), {}, "String");
	assert.deepEqual(SVG_optimise.parseStyle("fill:"), {}, "Missing value");
	assert.deepEqual(SVG_optimise.parseStyle(":red"), {}, "Missing key");
	assert.deepEqual(SVG_optimise.parseStyle("fill:#269276"), { fill: '#269276' }, "Non-number");
	assert.deepEqual(SVG_optimise.parseStyle("fill:#269276;opacity:1"), { fill: '#269276', opacity: { number: 1 } }, "Two values");
	assert.deepEqual(SVG_optimise.parseStyle("fill: #269276; opacity :1;"), { fill: '#269276', opacity: { number: 1 } }, "Trailing semi-colon");
	assert.deepEqual(SVG_optimise.parseStyle("font-size: 12px ; opacity:0.9%"), { 'font-size': { number: 12, units: 'px' }, opacity: { number: 0.9, units: '%' }}, "With units");
});

QUnit.test("parseTransforms", function(assert) {
	assert.deepEqual(SVG_optimise.parseTransforms(""), [], "Empty string");
	assert.deepEqual(SVG_optimise.parseTransforms("translate(5)"), [['translate', 5]], "Integer");
	assert.deepEqual(SVG_optimise.parseTransforms("  rotate ( 5  ) "), [['rotate', 5]], "Integer with spaces");
	assert.deepEqual(SVG_optimise.parseTransforms("matrix(0, 1.0 , -2.07 4e2    5e-3,-7.3e+2 )"), [['matrix', 0, 1, -2.07, 400, 0.005, -730]], "Matrix with mixed numbers and delimiters");
	assert.deepEqual(SVG_optimise.parseTransforms("SCALE(-0.005, 3.220)"), [['SCALE', -0.005, 3.22]], "Translate two decimals");
	assert.deepEqual(SVG_optimise.parseTransforms("SCALE(-0.005, 3.220) Translate(0),rotate( -9.2, 3e-2 7) "), [['SCALE', -0.005, 3.22], ['Translate', 0], ['rotate', -9.2, 0.03, 7]], "Multiple transforms");
});


QUnit.test("optimisePath", function(assert) {
	var options = {};

	assert.deepEqual(SVG_optimise.optimisePath([], options), [], "Empty array");
	assert.deepEqual(SVG_optimise.optimisePath([[]], options), [], "Array with empty array");
	assert.deepEqual(SVG_optimise.optimisePath([['M', 5, 10], ['M', 12, -5.5], ['z']], options), [], "Remove empty path");
	assert.deepEqual(SVG_optimise.optimisePath([['M', 5, 10], ['L', 12, 21]], options), [['M', 5, 10], ['L', 12, 21]], "Two commands");
	assert.deepEqual(SVG_optimise.optimisePath([['M', 5, 10], ['L', 12, 21], ['z']], options), [['M', 5, 10], ['L', 12, 21], ['z']], "Include z command");
	assert.deepEqual(SVG_optimise.optimisePath([['M', 5, 10], ['L', 12, 21], ['L', 18, 12]], options), [['M', 5, 10], ['L', 12, 21, 18, 12]], "Combine repeated commands");
	assert.deepEqual(SVG_optimise.optimisePath([['M', 5, 10], ['v', 12, -5.5]], options), [['M', 5, 10], ['v', 6.5]], "Combine vertical command");
	assert.deepEqual(SVG_optimise.optimisePath([['M', 5, 10], ['h', 12, -5.5], ['h', 13]], options), [['M', 5, 10], ['h', 19.5]], "Combine repeated horizontal command");
});

QUnit.test("getPathString", function(assert) {
	var options = {
		positionDecimals: function(n) { return n; }
	};

	assert.equal(SVG_optimise.getPathString([], options), "", "Empty array");
	assert.equal(SVG_optimise.getPathString([[]], options), "", "Array with empty array");
	assert.equal(SVG_optimise.getPathString([['M', 5, 10], ['L', 12, 21]], options), "M5 10L12 21", "Two commands");
	assert.equal(SVG_optimise.getPathString([['M', 5, 10], ['a', 150, 254, 0, 0, 0, 15, 150]], options), "M5 10a150 254 0 0 0 15 150", "Arc command");
	assert.equal(SVG_optimise.getPathString([['M', 5, 10], ['L', 12, 21], ['z']], options), "M5 10L12 21z", "Include z command");
	assert.equal(SVG_optimise.getPathString([['M', -5, 10], ['L', 12, -21]], options), "M-5 10L12-21", "Commands with negatives");
});

QUnit.test("getRoundingFunction", function(assert) {
	var roundingFunction;

	roundingFunction = SVG_optimise.getRoundingFunction('decimal places', 0);
	assert.equal(roundingFunction("5"), "5", "Zero decimal places: Not a number");
	assert.equal(roundingFunction(5), 5, "Zero decimal places: Integer");
	assert.equal(roundingFunction(5.0), 5, "Zero decimal places: Decimal with zero");
	assert.equal(roundingFunction(5.09), 5, "Zero decimal places: Decimal");
	assert.equal(roundingFunction(5.4), 5, "Zero decimal places: Round down");
	assert.equal(roundingFunction(5.6), 6, "Zero decimal places: Round up");
	assert.equal(roundingFunction(-5.4), -5, "Zero decimal places: Negative round down");
	assert.equal(roundingFunction(-5.6), -6, "Zero decimal places: Positive round up");

	roundingFunction = SVG_optimise.getRoundingFunction('decimal places', 2);
	assert.equal(roundingFunction("5"), "5", "Zero decimal places: Not a number");
	assert.equal(roundingFunction(5), 5, "Zero decimal places: Integer");
	assert.equal(roundingFunction(5.0), 5, "Zero decimal places: Decimal with zero");
	assert.equal(roundingFunction(5.09), 5.09, "Zero decimal places: Decimal");
	assert.equal(roundingFunction(5.004), 5, "Zero decimal places: Round down");
	assert.equal(roundingFunction(5.006), 5.01, "Zero decimal places: Round up");
	assert.equal(roundingFunction(-5.004), -5, "Zero decimal places: Negative round down");
	assert.equal(roundingFunction(-5.006), -5.01, "Zero decimal places: Positive round up");
	assert.equal(roundingFunction(5.095), 5.1, "Zero decimal places: Round twice");
	assert.equal(roundingFunction(5.995), 6, "Zero decimal places: Round three times");
});
