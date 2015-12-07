var _ = require('lodash');

function ModelConstraints() {
    this.rules = {}
}

ModelConstraints.newInstance = function () {
    var o = new ModelConstraints();
    return o;
}

ModelConstraints.prototype.check = function check(model) {
    return _.reduce(this.rules, function (result, r, k) {
            if (_.has(r, 'mode') && r.mode == 'exists') {
                return checkModelExistsRule(k, r, model, result);
            } else {
                return checkModelForallRule(k, r, model, result);
            }
        },
        true);
}

ModelConstraints.prototype.addRule = function (name, rule) {
    this.rules[name] = rule;
}

function checkModelExistsRule(name, rule, model, acc) {
    if (_.has(rule, 'selector') && _.has(rule, 'predicate')) {
        var selected = rule.selector(model);
        if (!(_.any(selected, function (x) {return rule.predicate(x)}))) {
            acc.push[{'ruleName': name, 'elem': selected}];
        }
        return acc;
    } else {
        console.log("invalid rule");
    }
}

function checkModelForallRule(name, rule, model, acc) {
    if (_.has(rule, 'selector') && _.has(rule, 'predicate')) {
        return _.reduce(rule.selector(model), function (result, x) {
                if (!rule.predicate(x)) {
                    var violation = {'ruleName': name, 'elem': x};
                    if (result instanceof Array) {
                        result.push(violation);
                    } else {
                        result = [violation];
                    }
                }
                return result;
            },
            acc);
    } else {
        console.log("invalid rule");
    }
}

function modelRule (selector, predicate, mode) {
    return {
        'selector': selector,
        'predicate': predicate,
        'mode': mode === undefined ? 'forall' : mode
    };
}


function TransformationConstraints() {
    this.rules = {}
}

TransformationConstraints.newInstance = function () {
    var o = new TransformationConstraints();
    return o;
}

TransformationConstraints.prototype.check = function check(source, target) {
    return _.reduce(this.rules, function (result, r, k) {
            return checkTransformationRule(k, r, source, target, result);
        },
        true);
}

TransformationConstraints.prototype.addRule = function (name, rule) {
    this.rules[name] = rule;
}

function checkTransformationRule(name, rule, source, target, acc) {
    if (_.has(rule, 'sourceSelector')
        && _.has(rule, 'targetSelector')
        && _.has(rule, 'predicate')) {
        return _.reduce(rule.sourceSelector(source), function (res, x) {
                return  _.reduce(rule.targetSelector(target), function (result, y) {
                    if (!rule.predicate(x, y)) {
                        var violation = {'ruleName': name, 'source': x, 'target': y};
                        if (result instanceof Array) {
                            result.push(violation);
                        } else {
                            result = [violation];
                        }
                    }
                    return result;
                },
                res);
            },
            acc);
    } else {
        console.log("invalid rule");
    }
}

function transformationRule (sourceSelector, targetSelector, predicate, mode) {
    return {
        'sourceSelector': sourceSelector,
        'targetSelector': targetSelector,
        'predicate': predicate,
        'mode': mode === undefined ? 'forall' : mode
    };
}

var checkMode = {
    'forall': 'forall',
    'exists': 'exists'
}

module.exports = {
    'ModelConstraints': ModelConstraints,
    'modelRule': modelRule,
    'TransformationConstraints': TransformationConstraints,
    'transformationRule': transformationRule,
    'checkMode': checkMode
}
