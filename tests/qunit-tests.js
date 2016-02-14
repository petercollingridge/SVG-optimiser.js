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
