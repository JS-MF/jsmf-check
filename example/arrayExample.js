var cst = require('../index.js');
var _ = require('lodash');

var cs = cst.Constraints.newInstance();

function evenElts (xs) { return _.filter(xs, function (x) {return x % 2 === 0;}); };

function multipleOf(y) { return (function (x) {return x % y === 0;}); };

var evenElementsAreMultipleOf3 = cst.rule(evenElts, multipleOf(3));

cs.addRule('evenElementsAreMultipleOf3', evenElementsAreMultipleOf3);

console.log(cs.check([1,3,7]));
console.log(cs.check([1,6,12]));
console.log(cs.check([4]));
