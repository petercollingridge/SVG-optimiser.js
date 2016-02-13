QUnit.test("parsePath", function(assert) {
  assert.deepEqual(SVG_optimise.parsePath("M 10 23 L 45 789"), [['M', 10, 23], ['L', 45, 789]], "Integers and spaces");
  assert.deepEqual(SVG_optimise.parsePath("M 10 23 a150,254 0 0 0 15,150"), [['M', 10, 23], ['a', 150, 254, 0, 0, 0, 15, 150]], "Multiple values");
  assert.deepEqual(SVG_optimise.parsePath("M 10 23 a 150 254 0 0 0 15,150z"), [['M', 10, 23], ['a', 150, 254, 0, 0, 0, 15, 150], ['z']], "Final z");
  assert.deepEqual(SVG_optimise.parsePath("m10,23L45,789"), [['m', 10, 23], ['L', 45, 789]], "Integers and no spaces");
  assert.deepEqual(SVG_optimise.parsePath("  M 10,23 l45 , 789   "), [['M', 10, 23], ['l', 45, 789]], "Integers and mixed spaces");
  assert.deepEqual(SVG_optimise.parsePath("M 10.0 23.2 L 45.0001 0.00"), [['M', 10, 23.2], ['L', 45.0001, 0]], "Decimals");
  assert.deepEqual(SVG_optimise.parsePath("M 10.0-23.2 L-45.1-0.00, -4 3"), [['M', 10, -23.2], ['L', -45.1, 0, -4, 3]], "Negatives");
  assert.deepEqual(SVG_optimise.parsePath("M 12.3 2.3e2 L-1e1 -7e-3"), [['M', 12.3, 230], ['L', -10, -0.007]], "Exponents");
});
