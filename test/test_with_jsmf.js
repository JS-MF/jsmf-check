"use strict";
var JSMF  = require('jsmf-core');
var nav   = require('jsmf-magellan');
var check = require('../index.js');
var _ = require('lodash');
var should = require('should');

var Class = JSMF.Class;
var Model = JSMF.Model;

var FSM = new Model('FSM');
var State = Class.newInstance('State');
State.setAttribute('name', String);
var StartState = Class.newInstance('StartState');
StartState.setSuperType(State);
var EndState = Class.newInstance('EndState');
EndState.setSuperType(State);

var Transition = Class.newInstance('Transition');
Transition.setAttribute('name', String);
Transition.setReference('next', State, 1);
State.setReference('transition', Transition, -1);

FSM.setModellingElements([StartState, State, EndState, Transition]);

var sample = new Model('sample');

var s0 = StartState.newInstance({name: 'start'});
var s1 = StartState.newInstance({name: 'test1'});
var s2 = StartState.newInstance({name: 'test2'});
var s3 = EndState.newInstance({name: 'finish'});

var t0 = Transition.newInstance({name: 'launchTest'});
t0.setNext(s1);
var t10 = Transition.newInstance({name: 'test1Succeeds'});
t10.setNext(s2);
var t11 = Transition.newInstance({name: 'test1Fails'});
t11.setNext(s0);
var t20 = Transition.newInstance({name: 'test2Succeeds'});
t20.setNext(s3);
var t21 = Transition.newInstance({name: 'test2Fails'});
t21.setNext(s0);

s0.setTransition(t0);
s1.setTransition([t10, t11]);
s2.setTransition([t20, t21]);

sample.setReferenceModel(FSM);
sample.setModellingElements([s0, s1, s2, s3, t0, t10, t11, t20, t21]);

function states (model) {
    return nav.allInstancesFromModel(State, model);
}

describe ('jsmf with check', function () {
    it ('allows to check that some elements validate a given property', function (done) {
        function reachEnd (e) {
            return !(_.isEmpty(nav.crawl({predicate: nav.hasClass(EndState)}, e)));
        }
        var cs = new check.Checker();
        cs.rules["end can be reach"] = new check.Rule(
            check.Selection.All(states),
            reachEnd
        );
        cs.run(sample).succeed.should.be.true();
        done();
    });
    it ('provides a detailed list of failing elements', function (done) {
        function reachS0 (e) {
            return !(_.isEmpty(nav.crawl({predicate: function (x) { return x == s0; }}, e)));
        }
        var cs = new check.Checker();
        cs.rules.reachS0 = new check.Rule(
            check.Selection.All(states),
            reachS0
        );
        var test = cs.run(sample);
        test.succeed.should.be.false();
        test.errors.should.have.length(1);
        test.errors.should.have.containEql({name: 'reachS0', 'path': [s3]});
        done();
    });
});
