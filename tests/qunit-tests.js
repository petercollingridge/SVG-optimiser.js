
// optimiser-function.js unit tests

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
	assert.deepEqual(SVG_optimise.parseTransforms("translate(five)"), [], "No number");
	assert.deepEqual(SVG_optimise.parseTransforms("move(1)"), [], "Not a valid transform");
	assert.deepEqual(SVG_optimise.parseTransforms("SkEwX(2)"), [['skewX', 2]], "Not a valid transform");
	assert.deepEqual(SVG_optimise.parseTransforms("translate(3)"), [['translate', 3]], "Integer");
	assert.deepEqual(SVG_optimise.parseTransforms("  rotate ( 4  ) "), [['rotate', 4]], "Extra spaces");
	assert.deepEqual(SVG_optimise.parseTransforms("rotate(5 -8.5)"), [['rotate', 5, -8.5]], "Negative decimal separated by space");
	assert.deepEqual(SVG_optimise.parseTransforms("rotate(5,-8.5)"), [['rotate', 5, -8.5]], "Negative decimal separated by comma");
	assert.deepEqual(SVG_optimise.parseTransforms("matrix(0, 1.0 , -2.07 4E2    5e-3,-7.3e+2 )"), [['matrix', 0, 1, -2.07, 400, 0.005, -730]], "Matrix with mixed numbers and delimiters");
	assert.deepEqual(SVG_optimise.parseTransforms("SCALE(-0.005, 3.220) Translate(0),rotate( -9.2, 3e-2 7) "), [['scale', -0.005, 3.22], ['translate', 0], ['rotate', -9.2, 0.03, 7]], "Multiple transforms");
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

// Transformation tests
QUnit.test("transformShape.translate", function(assert) {
	var transformFunction = SVG_optimise.transformShape.translate;
	assert.deepEqual(transformFunction('rect', { x: 10, y: 20, width: 25, height: 16 }, []), { x: 10, y: 20 }, 'Null translate rect');
	assert.deepEqual(transformFunction('rect', { x: 10, y: 20, width: 25, height: 16 }, [12, 7]), { x: 22, y: 27 }, 'Translate rect in 2D');
	assert.deepEqual(transformFunction('rect', { x: 10, y: 20, width: 25, height: 16 }, [-2.2, 0.5]), { x: 7.8, y: 20.5 }, 'Translate rect in 2D with negative and decimal');
	assert.deepEqual(transformFunction('rect', { }, [12, 7]), { x: 12, y: 7 }, 'Translate rect with missing attributes');
	assert.deepEqual(transformFunction('circle', { cx: 10, cy: 20, r: 10 }, [-2.2, 0.5]), { cx: 7.8, cy: 20.5 }, 'Translate circle in 2D');
	assert.deepEqual(transformFunction('circle', { x: 10, cy: 20, r: 10 }, [-2.2, 0.5]), { cx: -2.2, cy: 20.5 }, 'Translate circle with cx replaced by x');
	assert.deepEqual(transformFunction('ellipse', { cx: 10, cy: 20, rx: 10, ry: 12 }, [-2.2, 0.5]), { cx: 7.8, cy: 20.5 }, 'Translate ellipse in 2D');
	assert.deepEqual(transformFunction('line', { x1: 10, y1: 20, x2: 110.5, y2: -120 }, [-2.2, 0.5]), { x1: 7.8, y1: 20.5, x2: 108.3, y2: -119.5 }, 'Translate line in 2D');
	assert.deepEqual(transformFunction('polyline', { points: [30, 70, 40, 80, 60, 80, 70, 70] }, [-2.2, 0.5]), { points: [27.8, 70.5, 37.8, 80.5, 57.8, 80.5, 67.8, 70.5] }, 'Translate polyline in 2D');
});

QUnit.test("transformPath.translate", function(assert) {
	var transformFunction = SVG_optimise.transformPath.translate;
	assert.deepEqual(transformFunction(
		[['M', 10, 20], ['L', 32.1, -4.3]], []),
		[['M', 10, 20], ['L', 32.1, -4.3]], "Null translate");
	assert.deepEqual(transformFunction(
		[['M', 10, 20], ['L', 32.1, -4.3]], [0, 0]),
		[['M', 10, 20], ['L', 32.1, -4.3]], "Translate by (0, 0)");
	assert.deepEqual(transformFunction(
		[['M', 10, 20], ['L', 32.1, -4.3]], [5.5]),
		[['M', 15.5, 20], ['L', 37.6, -4.3]], "Single value");
	assert.deepEqual(transformFunction(
		[['M', 10, 20], ['L', 32.1, -4.3]], [5, 8]),
		[['M', 15, 28], ['L', 37.1, 3.7]], "Absolute ML path");
	assert.deepEqual(transformFunction(
		[['m', 10, 20], ['l', 32.1, -4.3]], [5, 8]),
		[['m', 15, 28], ['l', 32.1, -4.3]], "Start with relative m");
	assert.deepEqual(transformFunction(
		[['m', 10, 20, 32.1, -4.3]], [5, 8]),
		[['m', 15, 28, 32.1, -4.3]], "Path using all relative ms");
	assert.deepEqual(transformFunction(
		[['M', 10, 20], ['H', 32.1], ['V', -40.0], ['z']], [5.4, -8]),
		[['M', 15.4, 12], ['H', 37.5], ['V', -48], ['z']], "VHz path");
	assert.deepEqual(transformFunction(
		[['M', 10, 20], ['L', 32.1, -4.3], ['l', 32.1, -40.0], ['z']], [5.4, -8]),
		[['M', 15.4, 12], ['L', 37.5, -12.3], ['l', 32.1, -40.0], ['z']], "Mixed absolute and relative paths");
	// TODO: add multipath
});

// Whole element tests
var readWriteTests = {
	"Don't remove empty element": '<rect/>',
	"Don't optimise attributes": '<rect x="0" y="10.00" width=" 50 " height="100.0"/>',
	multipath: '<path d="M10 40A42 24 0 1 1 90 40C80 50 70 30 60 40S50 50 40 40 20 50 10 40M86 50Q74 40 62 50T38 50 14 50L30 90H45V80L55 80 55 90 70 90z"/>',
	'Test indentation': '<svg><circle cx="20" cy="20" r="10"/><line x1="10" y1="20" x2="30" y2="20"/></svg>',
	'Non-path elements': '<svg><rect x="20" y="4" width="60" height="10"/><circle cx="36" cy="36.5" r="10"/><ellipse cx="64" cy="36.5" rx="10" ry="15"/><line x1="48" y1="50" x2="55" y2="65"/><polygon points="20,14 5,50, 30,90, 70,90, 95,50, 80,14"/><polyline points="30,70 40,80 60,80 70,70"/></svg>'
};

// Tests with default options
QUnit.test("Read then write SVG string", function(assert) {
	var obj, str, test;
	for (test in readWriteTests) {
		str = readWriteTests[test];
		obj = new SVG_Root(str);
		assert.equal(obj.write(), str, test);
	}
});

// Read an SVG string, create a DOM element from it, then read that and write it as a string
QUnit.test("Test createSVGObject", function(assert) {
	for (var test in readWriteTests) {
		var str = readWriteTests[test];
		var obj1 = new SVG_Root(str);
		var obj2 = obj1.createSVGObject();
		var obj3 = new SVG_Root(obj2);
		assert.equal(obj3.write(), str, test);
	}
});

QUnit.test("Test optimisations options", function(assert) {
	var tests = {
		'Pretty indendation': {
			input: '<svg><circle cx="20" cy="20" r="10"/><line x1="10" y1="20" x2="30" y2="20"/></svg>',
			options: { whitespace: 'pretty' },
			output: '<svg>\n  <circle cx="20" cy="20" r="10"/>\n  <line x1="10" y1="20" x2="30" y2="20"/>\n</svg>'
		},
		'Remove empty elements': {
			input: '<rect/>',
			options: { removeRedundantShapes: true },
			output: ''
		},/*
		'Include empty elements': {
			input: '<rect/>',
			options: { removeRedundantShapes: false },
			output: '<rect/>'
		},*/
		'Remove empty group': {
			input: '<svg><g><circle cx="20" cy="20" r="10"/><line x1="10" y1="20" x2="30" y2="20"/></g></svg>',
			options: { removeCleanGroups: true },
			output: '<svg><circle cx="20" cy="20" r="10"/><line x1="10" y1="20" x2="30" y2="20"/></svg>'
		},
	};

	for (var test in tests) {
		var data = tests[test];
		obj = new SVG_Root(data.input);
		$.extend(obj.options, data.options);
		obj.optimise();
		assert.equal(obj.write(), data.output, test);
	}

});

QUnit.test("Translate shapes", function(assert) {
	var tests = [
		['Basic rect translate 1D', '<rect transform="translate(-2.2)" x="10" y="12" width="24" height="16"/>', '<rect x="7.8" y="12" width="24" height="16"/>'],
		['Basic rect translate 2D', '<rect transform="translate(-2.2, 0.5)" x="10" y="12" width="24" height="16"/>', '<rect x="7.8" y="12.5" width="24" height="16"/>']
	];

	for (var i = 0; i < tests.length; i++) {
		var obj = new SVG_Root(tests[i][1]);
		obj.optimise();
		assert.equal(obj.write(), tests[i][2], tests[i][0]);
	}
});

QUnit.test("Translate paths", function(assert) {
	var paths = {
		absolute: "M10 40A42 24 0 1 1 90 40 C80,50 70,30 60,40 S50,50, 40,40 20,50, 10,40 M86 50Q74 40 62 50 T38 50 14 50 L30 90H45V80 L55,80 55,90 70,90z",
		relative: "m10 40a42 24 0 1 1 80 0c-10 10 -20 -10 -30 0s-10 10 -20 0 -20 10 -30 0m76 10q-12 -10 -24 0t-24 0 -24 0l16 40h15v-10l10 0 0 10 15 0z",
		'just m commands': "m5 12 10 -10 10 10 z"
	};

	var translations = {
		'translate(0)': {
			transform: "translate(0)",
			absolute: "M10 40A42 24 0 1 1 90 40C80 50 70 30 60 40S50 50 40 40 20 50 10 40M86 50Q74 40 62 50T38 50 14 50L30 90H45V80L55 80 55 90 70 90z",
			relative: "m10 40a42 24 0 1 1 80 0c-10 10-20-10-30 0s-10 10-20 0-20 10-30 0m76 10q-12-10-24 0t-24 0-24 0l16 40h15v-10l10 0 0 10 15 0z",
			'just m commands': "m5 12 10-10 10 10z"
		},
		'translate(0, 0)': {
			transform: "translate(0, 0)",
			absolute: "M10 40A42 24 0 1 1 90 40C80 50 70 30 60 40S50 50 40 40 20 50 10 40M86 50Q74 40 62 50T38 50 14 50L30 90H45V80L55 80 55 90 70 90z",
			relative: "m10 40a42 24 0 1 1 80 0c-10 10-20-10-30 0s-10 10-20 0-20 10-30 0m76 10q-12-10-24 0t-24 0-24 0l16 40h15v-10l10 0 0 10 15 0z",
			'just m commands': "m5 12 10-10 10 10z"
		},
		'translate(4.5)': {
			transform: "translate(4.5)",
			absolute: "M14.5 40A42 24 0 1 1 94.5 40C84.5 50 74.5 30 64.5 40S54.5 50 44.5 40 24.5 50 14.5 40M90.5 50Q78.5 40 66.5 50T42.5 50 18.5 50L34.5 90H49.5V80L59.5 80 59.5 90 74.5 90z",
			relative: "m14.5 40a42 24 0 1 1 80 0c-10 10-20-10-30 0s-10 10-20 0-20 10-30 0m76 10q-12-10-24 0t-24 0-24 0l16 40h15v-10l10 0 0 10 15 0z",
			'just m commands': "m9.5 12 10-10 10 10z"
		},
		'translate(4.5, -0.7)': {
			transform: "translate(4.5, -0.7)",
			absolute: "M14.5 39.3A42 24 0 1 1 94.5 39.3C84.5 49.3 74.5 29.3 64.5 39.3S54.5 49.3 44.5 39.3 24.5 49.3 14.5 39.3M90.5 49.3Q78.5 39.3 66.5 49.3T42.5 49.3 18.5 49.3L34.5 89.3H49.5V79.3L59.5 79.3 59.5 89.3 74.5 89.3z",
			relative: "m14.5 39.3a42 24 0 1 1 80 0c-10 10-20-10-30 0s-10 10-20 0-20 10-30 0m76 10q-12-10-24 0t-24 0-24 0l16 40h15v-10l10 0 0 10 15 0z",
			'just m commands': "m9.5 11.3 10-10 10 10z"
		},
	};

	for (var translate in translations) {
		var data = translations[translate];

		for (var pathType in paths) {
			var testPath = '<path transform="' + data.transform +'" d="' + paths[pathType] + '"/>';
			var expectedPath = '<path d="' + data[pathType] + '"/>';
			var obj = new SVG_Root(testPath);
			obj.optimise();
			assert.equal(obj.write(), expectedPath, translate + ' transform ' + pathType);
		}
	}
});

QUnit.test("Optimise path elements", function(assert) {
	var tests = [
		// Paths to remove
		['Remove empty path', '<path/>', ''],
		['Remove path with one M command', '<path d="M10 20"/>', ''],
		['Remove path with Mz command', '<path d="M10 20z"/>', ''],
		['Remove path with just M commands', '<path d="M10 20 M 30 40"/>', ''],

		// Paths to remove exception
		["Don't remove paths with M commands and multiple parameters", '<path d="M10 20 30 40 10 40z"/>', '<path d="M10 20 30 40 10 40z"/>'],

		// Work with paths that use every command
		["Handle multipath",
		'<path d="M10 40 A42 24 0 1 1 90 40 C80,50 70,30 60,40 S50,50, 40,40 20,50, 10,40 M86  50 Q74 40 62 50T38 50 14 50 L30 90 H45 V80 L55,80 55,90 70,90z"/>',
		'<path d="M10 40A42 24 0 1 1 90 40C80 50 70 30 60 40S50 50 40 40 20 50 10 40M86 50Q74 40 62 50T38 50 14 50L30 90H45V80L55 80 55 90 70 90z"/>'],

		// Repeated commands
		["Ignore M command followed by a second M command", '<path d="M0 0 M 5 5 M10 20 30 40 10 40z"/>', '<path d="M10 20 30 40 10 40z"/>'],
		['Remove repeated command', '<path d="M10 20 L20 30 L30 20 z"/>', '<path d="M10 20L20 30 30 20z"/>'],
	];

	for (var i = 0; i < tests.length; i++) {
		var obj = new SVG_Root(tests[i][1]);
		obj.optimise();
		assert.equal(obj.write(), tests[i][2], tests[i][0]);
	}
});
