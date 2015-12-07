var should = require('should');
var ch = require('../index.js');
var _ = require('lodash');

function evenElts (xs) { return _.filter(xs, function (x) {return x % 2 === 0;}); };
function multipleOf(y) { return (function (x) {return x % y === 0;}); };
var evenElementsAreMultipleOf3 = ch.modelRule(evenElts, multipleOf(3));

describe ('Modelconstraints.check on array', function () {
    it ('always pass if no element matches the selection', function (done) {
        var cs = ch.ModelConstraints.newInstance();
        var r0 = ch.modelRule(function (x) { return [];}, function (y) { return false; });
        cs.addRule("never find a match", r0);
        cs.check([1,2,3,4]).should.be.true();
        cs.check(undefined).should.be.true();
        done();
    });
    it ('always pass if the predicate is always true', function (done) {
        var cs = ch.ModelConstraints.newInstance();
        var r0 = ch.modelRule(function (x) { return x;}, function (y) { return true; });
        cs.addRule("always pass find a match", r0);
        cs.check([1,2,3,4]).should.be.true();
        cs.check([]).should.be.true();
        cs.check(['abc', 'def', 'ghi']).should.be.true();
        done();
    });
    it ('pass if matching elements matches the predicate', function (done) {
        var cs = ch.ModelConstraints.newInstance();
        cs.addRule('evenElementsAreMultipleOf3', evenElementsAreMultipleOf3);
        cs.check([1,6,12]).should.be.true();
        done();
    });
    it ('returns the list of failing rules and elements', function (done) {
        var cs = ch.ModelConstraints.newInstance();
        cs.addRule('testRule', evenElementsAreMultipleOf3);
        cs.check([4, 8, 12]).should.have.length(2);
        cs.check([4, 8, 12]).should.containEql({'ruleName': 'testRule', 'elem': 4});
        cs.check([4, 8, 12]).should.containEql({'ruleName': 'testRule', 'elem': 8});
        done();
    });
    it ('pass if one matching elements matches the exisential predicate', function (done) {
        var cs = ch.ModelConstraints.newInstance();
        var oneElementIsMultipleOf3 = ch.modelRule(evenElts, multipleOf(3), ch.checkMode.exists);
        cs.addRule('oneElementIsMultipleOf3', oneElementIsMultipleOf3);
        cs.check([4,6]).should.be.true();
        done();
    });
});

describe('Transformation.check', function () {
    it('works on valid transformation', function (done) {
        var cs = ch.TransformationConstraints.newInstance();
        function multipleOf6 (xs) { return _.filter(xs, function (x) {return x % 6 === 0;}); };
        var filter6AndIncrement = ch.transformationRule(
            multipleOf6,
            function (x) {return x;},
            function (s,t) {return s+1 == t;});
        cs.addRule('filter6AndIncrement', filter6AndIncrement);
        cs.check([2,3,4,6],[7]).should.be.true();
        done();
    });
    it('returns invalid value', function (done) {
        var cs = ch.TransformationConstraints.newInstance();
        function multipleOf6 (xs) { return _.filter(xs, function (x) {return x % 6 === 0;}); };
        var filter6AndIncrement = ch.transformationRule(
            multipleOf6,
            function (x) {return x;},
            function (s,t) {return s+1 == t;});
        cs.addRule('filter6AndIncrement', filter6AndIncrement);
        cs.check([2,3,4,6],[7,8]).should.have.length(1);
        cs.check([2,3,4,6],[7,8]).should.containEql({'ruleName': 'filter6AndIncrement', 'source': 6, 'target': 8})
        done();
    });
});
