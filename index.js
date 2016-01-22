"use strict";

var _ = require('lodash');

function Checker() {
    this.selections = {};
    this.rules = {};
}

function Rule() {
    var args = Array.prototype.slice.call(arguments);
    this.check = args.pop();
    this.selections = args;
}

function RuleResult(errors) {
    this.errors = errors;
    this.succeed = _.isEmpty(errors);
}

RuleResult.success = new RuleResult([]);
RuleResult.error = function(e) {return new RuleResult([e]);}

function mergeRuleResults(r0, r1) {
    return new RuleResult(r0.errors.concat(r1.errors));
}


function Reference(name) {
    this.ref = name;
}

function Selection(type, f) {
    this.type = type;
    this.content = f;
    this.resolved = !(f instanceof Reference || f instanceof Function);
}

Selection.All = function(f) {
    return new Selection(Selection.All, f);
}

Selection.Any = function(f) {
    return new Selection(Selection.Any, f);
}

Selection.Raw = function(f) {
    return new Selection(Selection.Raw, f);
}

function resolved(selection, content) {
    return new Selection(selection.type, content);
}

function resolveSelection(selection, input, selections) {
    if (selection.resolved) {
      return selection;
    } else if (selection.content instanceof Reference) {
        var newContent = selections[selection.content.ref];
        var res = resolved(selection, newContent);
        return res;
    } else if (selection.content instanceof Function) {
        var newContent = selection.content(input);
        var res = resolved(selection, newContent);
        return res;
    } else {
        throw "invalid selection: " + selection;
    }
}

Checker.prototype.run = function(input) {
    var selections = _.mapValues(this.selections, function (s) { return s(input); });
    return _.reduce(
        _.map(this.rules, function(r, name) {
            var result = r.run(input, selections);
            result.errors = _.map(result.errors, function(x) { return {name: name, path: x} })
            return result;
        }),
        mergeRuleResults,
        RuleResult.success
    );
}

Rule.prototype.run = function(input, selections) {
    selections = selections === undefined ? {} : selections;
    var resolvedSelections = _.map(
        this.selections,
        function(s) { return resolveSelection(s, input, selections);}
    );
    return check([], _.curry(this.check), resolvedSelections.reverse());
}

function check(path, f, selections) {
    var e = selections.pop();
    if (e == undefined) {
        if (f) { return RuleResult.success; } else { return RuleResult.error(path); }
    } else if (e.type === Selection.Any) {
        path.push(e.content);
        var test = _.any(
            e.content,
            function(x) {
                var stack = selections.slice();
                return check([], f(x), stack).succeed;
            });
        if (test) {
            return RuleResult.success;
        } else {
            return RuleResult.error(path);
        }
    } else if (e.type === Selection.All) {
        return _.reduce(
            e.content,
            function(res, x) {
                var currentPath = path.slice()
                currentPath.push(x);
                var stack = selections.slice();
                return mergeRuleResults(res, check(currentPath, f(x), stack));
            },
            RuleResult.success
        );
    } else if (e.type === Selection.Raw) {
        path.push(e.content);
        return check(path, f(e.content), selections);
    } else {
        throw "Invalid selection type: " + e.type;
    }
}

module.exports = {
  Checker: Checker,
  Rule: Rule,
  Selection: Selection,
  Reference: Reference
}
