"use strict";
var should = require('should');
var ch = require('../index.js');
var _ = require('lodash');

function evenElts (xs) { return _.filter(xs, function (x) {return x % 2 === 0;}); };
function multipleOf(y) { return (function (x) {return x % y === 0;}); };


describe ('1 selection forall-check on arrays', function () {
    it ('always pass if no element matches the selection', function (done) {
        var cs = new ch.Checker();
        cs.rules['no match'] = ch.Rule.define(
          ch.all(function (x) { return [];}),
          function (y) { return false; }
        );
        cs.run([1,2,3,4]).succeed.should.be.true();
        cs.run(undefined).succeed.should.be.true();
        done();
    });
    it ('always pass if the predicate is always true', function (done) {
        var cs = new ch.Checker();
        cs.rules['always pass find a match'] = ch.Rule.define(
            ch.all(_.identity),
            function (y) { return true; }
        );
        cs.run([1,2,3,4]).succeed.should.be.true();
        cs.run([]).succeed.should.be.true();
        cs.run(['abc', 'def', 'ghi']).succeed.should.be.true();
        done();
    });
    it ('pass if matching elements matches the predicate', function (done) {
        var cs = new ch.Checker();
        cs.rules['evenElementsAreMultipleOf3'] = ch.Rule.define(
          ch.all(evenElts),
          multipleOf(3)
        );
        cs.run([1,6,12]).succeed.should.be.true();
        done();
    });
    it ('returns the list of failing rules and elements', function (done) {
        var cs = new ch.Checker();
        cs.rules.testRule = ch.Rule.define(
            ch.all(evenElts),
            multipleOf(3)
        );
        var test = cs.run([4, 8, 12]);
        test.succeed.should.be.false();
        test.errors.should.have.length(2);
        test.errors[0].should.have.property('name').with.equal('testRule');
        test.errors[1].should.have.property('name').with.equal('testRule');
        _.map(test.errors, 'path').should.containDeep([[4],[8]]);
        done();
    });
});

describe ('1 selection exists-check on arrays', function () {
    it ('pass if one matching elements matches the exisential predicate', function (done) {
        var cs = new ch.Checker();
        cs.rules.oneElementIsMultipleOf3 = ch.Rule.define(
          ch.any(evenElts),
          multipleOf(3)
        );
        cs.run([4,6]).succeed.should.be.true();
        done();
    });
});

describe ('1 selection raw-check on arrays', function () {
    it ('checks global rules', function(done) {
        var cs = new ch.Checker();
        cs.rules['4even'] = ch.Rule.define(
          ch.raw(evenElts),
          function (xs) {return xs.length === 4}
        );
        cs.run([4,5,6,7,8,9,10]).succeed.should.be.true();
        done();
    });
});
describe ('InnerReference', function () {
    it ('map values depending on the context', function(done) {
        var cs = new ch.Checker();
        cs.rules['4even'] = ch.Rule.define(
          ch.all(function(x) {return x.foo;}),
          ch.any(new ch.ContextualReference(function () {
            return this[0].filter(function(x) {return x % 2 === 0;});
          })),
          function (x,m) {return x.length === m}
        );
        cs.run({foo: [[2,3,4,6], [3,2]]}).succeed.should.be.true();
        done();
    });
});


describe('Transformation.check', function () {
    it('works on valid transformation', function (done) {
        var cs = new ch.Checker();
        function multipleOf6 (xs) { return _.filter(xs, function (x) {return x % 6 === 0;}); };
        cs.rules.filter6AndIncrement = ch.Rule.define(
            ch.all(function(x) {return multipleOf6(x.in);}),
            ch.any(function(x) {return x.out;}),
            function (s,t) {return s+1 == t;}
        );
        cs.run({in: [2,3,4,6], out: [7]}).succeed.should.be.true();
        done();
    });
    it('returns invalid value', function (done) {
        var cs = new ch.Checker();
        function multipleOf6 (xs) { return _.filter(xs, function (x) {return x % 6 === 0;}); };
        cs.rules.filter6AndIncrement = ch.Rule.define(
            ch.all(function(x) {return multipleOf6(x.in);}),
            ch.all(function(x) {return x.out;}),
            function (s,t) {return s+1 == t;}
        );
        var test = cs.run({in: [2,3,4,6], out: [7,8]})
        test.succeed.should.be.false();
        test.errors.should.have.length(1);
        test.errors.should.containEql({name: 'filter6AndIncrement', path: [6, 8]});
        done();
    });
    it('works with global rules', function (done) {
        var cs = new ch.Checker();
        cs.rules.filterEven = ch.Rule.define(
            ch.raw(function(x) {return evenElts(x.in)}),
            ch.raw(function(x) {return evenElts(x.out)}),
            function (s,t) {return s.length == t.length;});
        cs.run({in: [2,3,4,6], out: [6,8,10]}).succeed.should.be.true();
        done();
    });
    it('works with existential rules', function (done) {
        var cs = new ch.Checker();
        cs.rules.succ = ch.Rule.define(
            ch.all(function(x) {return x.in}),
            ch.any(function(x) {return x.out}),
            function (s,t) {return s+1 === t;});
        cs.run({in: [2,3,4,5], out: [3,4,5,6]}).succeed.should.be.true();
        done();
    });
});
