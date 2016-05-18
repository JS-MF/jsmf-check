'use strict'
const should = require('should')
const ch = require('../index.js')
const _ = require('lodash')

function evenElts (xs) { return _.filter(xs, x => x % 2 === 0) }
function multipleOf(y) { return (x => x % y === 0) }


describe ('1 selection forall-check on arrays', function () {
    it ('always pass if no element matches the selection', function (done) {
        const cs = new ch.Checker()
        cs.rules['no match'] = ch.Rule.define(
          ch.all(x => []),
          y => false
        )
        cs.run([1,2,3,4]).succeed.should.be.true()
        cs.run(undefined).succeed.should.be.true()
        done();
    })
    it ('always pass if the predicate is always true', function (done) {
        const cs = new ch.Checker()
        cs.rules['always pass find a match'] = ch.Rule.define(
            ch.all(_.identity),
            y => true
        );
        cs.run([1,2,3,4]).succeed.should.be.true()
        cs.run([]).succeed.should.be.true()
        cs.run(['abc', 'def', 'ghi']).succeed.should.be.true()
        done()
    })
    it ('pass if matching elements matches the predicate', function (done) {
        const cs = new ch.Checker()
        cs.rules['evenElementsAreMultipleOf3'] = ch.Rule.define(
          ch.all(evenElts),
          multipleOf(3)
        )
        cs.run([1,6,12]).succeed.should.be.true()
        done()
    })
    it ('returns the list of failing rules and elements', function (done) {
        const cs = new ch.Checker()
        cs.rules.testRule = ch.Rule.define(
            ch.all(evenElts),
            multipleOf(3)
        );
        const test = cs.run([4, 8, 12])
        test.succeed.should.be.false();
        _.values(test.errors).should.have.length(1)
        should.exist(test.errors.testRule)
        test.errors.testRule.should.have.length(2)
        test.errors.testRule.should.containDeep([[4],[8]])
        done()
    });
});

describe ('1 selection exists-check on arrays', function () {
    it ('pass if one matching elements matches the exisential predicate', function (done) {
        const cs = new ch.Checker()
        cs.rules.oneElementIsMultipleOf3 = ch.Rule.define(
          ch.any(evenElts),
          multipleOf(3)
        )
        cs.run([4,6]).succeed.should.be.true()
        done()
    })
})

describe ('1 selection raw-check on arrays', function () {
    it ('checks global rules', function(done) {
        const cs = new ch.Checker()
        cs.rules['4even'] = ch.Rule.define(
          ch.raw(evenElts),
          xs => xs.length === 4
        )
        cs.run([4,5,6,7,8,9,10]).succeed.should.be.true()
        done()
    })
})
describe ('InnerReference', function () {
    it ('map values depending on the context', function(done) {
        const cs = new ch.Checker()
        cs.rules['evenSizeInTheList'] = ch.Rule.define(
          ch.all(x => x.foo),
          ch.any(new ch.ContextualReference(function () {
            return this[0].filter(x => x % 2 === 0)
          })),
          (x,m) => x.length === m
        );
        cs.run({foo: [[2,3,4,6], [3,2]]}).succeed.should.be.true();
        done();
    })
})


describe('Transformation.check', function () {
    it('works on valid transformation', function (done) {
        const cs = new ch.Checker()
        function multipleOf6 (xs) { return _.filter(xs, x => x % 6 === 0) }
        cs.rules.filter6AndIncrement = ch.Rule.define(
            ch.all(x => multipleOf6(x.in)),
            ch.any(x => x.out),
            (s,t) => s+1 == t
        );
        cs.run({in: [2,3,4,6], out: [7]}).succeed.should.be.true();
        done();
    })
    it('returns invalid value', function (done) {
        const cs = new ch.Checker();
        function multipleOf6 (xs) { return _.filter(xs, x => x % 6 === 0) }
        cs.rules.filter6AndIncrement = ch.Rule.define(
            ch.all(x => multipleOf6(x.in)),
            ch.all(x => x.out),
            (s,t) => s+1 == t
        )
        const test = cs.run({in: [2,3,4,6], out: [7,8]})
        test.succeed.should.be.false();
        should.exist(test.errors.filter6AndIncrement)
        test.errors.filter6AndIncrement.should.have.length(1)
        test.errors.filter6AndIncrement.should.containEql([6, 8])
        done()
    })
    it('works with global rules', function (done) {
        const cs = new ch.Checker()
        cs.rules.filterEven = ch.Rule.define(
            ch.raw(x => evenElts(x.in)),
            ch.raw(x => evenElts(x.out)),
            (s,t) => s.length == t.length
        )
        cs.run({in: [2,3,4,6], out: [6,8,10]}).succeed.should.be.true()
        done()
    })
    it('works with existential rules', function (done) {
        const cs = new ch.Checker()
        cs.rules.succ = ch.Rule.define(
            ch.all(x => x.in),
            ch.any(x => x.out),
            (s,t) => s+1 === t
        )
        cs.run({in: [2,3,4,5], out: [3,4,5,6]}).succeed.should.be.true()
        done()
    })
})
