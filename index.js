'use strict'

const _ = require('lodash')

/** @constructor
 * Initialize a rule checker
 */
function Checker() {
    this.helpers = {}
    this.rules = {}
}

/** Add a rule to the checker
 * @param {String} name - The name of the rule (used as a key by the checker: two rules can't have the same name)
 * @param {Selection[]} selections - An array of selections used for to check that rule.
 * @param {Function} test - The function that shold be evaluated to true for this rul to pass.
 */
Checker.prototype.addRule = function(name, selections, test) {
    this.rules[name] = new Rule(selections, test)
}

/** @consructor Create a rule.
 * @param {Selection[]} selections - An array of selections used for to check that rule.
 * @param {Function} test - The function that shold be evaluated to true for this rul to pass.
 */
function Rule(selections, check) {
    this.selections = selections
    this.check = check
}

/** An alternative to the rul constructor: takes the selections as the first parameters and the evaluation function as the last one
 *
 *  ie.: `Rule.define(arg1, arg2, ..., argn) = new Rule([arg1,...argn-1], argn)`
 * */
Rule.define = function() {
    var args = Array.prototype.slice.call(arguments)
    var check = args.pop()
    return new Rule(args, check)
}

/** @constructor The result of a rule evaluation
 * @param {Object[]} errors - The errors encontered during the rule validation
 * @member {boolean} succeed - Claims if the rule is valid or not (it succeed if it has no error).
 */
function RuleResult(errors) {
    this.errors = errors
    this.succeed = _.isEmpty(errors)
}

/** Create a success RuleResult (without error) */
RuleResult.success = new RuleResult([])
/** Create a single error RuleResult
 * @param e - The error.
 */
RuleResult.error = (e => new RuleResult([e]))

function mergeRuleResults(r0, r1) {
    return new RuleResult(r0.errors.concat(r1.errors))
}


function Reference(name) {
    this.ref = name
}

function Selection(type, f) {
    this.type = type
    this.content = f
    this.resolved = !(f instanceof Reference || f instanceof Function)
}

/** Create a "for all quantified" selection */
Selection.forall = Selection.all = function(f) {
    return new Selection(Selection.all, f)
}

/** Create an "exists quantified" selection */
Selection.exists = Selection.any = function(f) {
    return new Selection(Selection.any, f)
}

/** Create a selection that will be passed as-is, to the test function */
Selection.raw = function(f) {
    return new Selection(Selection.raw, f)
}

function resolved(selection, content) {
    return new Selection(selection.type, content)
}

function resolveSelection(selection, input, selections) {
    if (selection.resolved) {
      return selection
    } else if (selection.content instanceof Reference) {
        const newContent = selections[selection.content.ref]
        return resolved(selection, newContent)
    } else if (selection.content instanceof Function) {
        const newContent = selection.content(input)
        return resolved(selection, newContent)
    } else {
        throw new Error(`invalid selection: ${selection}`)
    }
}

/** Run the checker on the provided input.
 *
 * It launch each rules on the input and gather the results.
 *
 * @param input - The input to validate
 */
Checker.prototype.run = function(input) {
    const selections = _.mapValues(this.selections, s => s(input))
    return _(this.rules)
      .map((r, name) => {
            const result = r.run(input, selections)
            result.errors = _.map(result.errors, path => {return {name, path}})
            return result})
      .reduce(mergeRuleResults, RuleResult.success)
}

Checker.prototype.runOnTransformation = function(input, output) {
    return this.run({in: input, out: output})
}


/** Run a single rule
 * @param input - The input on which the rule is runned
 * @param references - A key-value map, used to resolve references
 */
Rule.prototype.run = function(input, selections) {
    selections = selections === undefined ? {} : selections
    const resolvedSelections = _(this.selections)
      .map(s => resolveSelection(s, input, selections))
      .reverse()
      .value()
    return check([], _.curry(this.check), resolvedSelections)
}

function check(path, f, selections) {
    const e = selections.pop()
    if (e == undefined) { return f ? RuleResult.success : RuleResult.error(path) }
    switch (e.type) {
        case Selection.any:
          path.push(e.content)
          const test = _.some(e.content, x => check([], f(x), selections.slice()).succeed)
          return test ? RuleResult.success : RuleResult.error(path)
        case Selection.all:
          return _.reduce(e.content,
              (res, x) => {
                  const currentPath = path.slice()
                  currentPath.push(x)
                  const stack = selections.slice()
                  return mergeRuleResults(res, check(currentPath, f(x), stack))
              },
              RuleResult.success)
        case Selection.raw:
          path.push(e.content)
          return check(path, f(e.content), selections)
        default:
          throw new Error(`Invalid selection type: ${e.type}`)
    }
}

function composeCheckers() {
    const checkers = Array.prototype.slice.call(arguments)
    const res = new Checker()
    res.rules = _(checkers).map('rules').reduce((x,y) => Object.assign(x,y))
    res.helpers = _(checkers).map('helpers').reduce((x,y) => Object.assign(x,y))
    return res
}

function onInput(f) { return (x => f(x.in)) }

function onOutput(f) { return (x => f(x.out)) }

module.exports = {
  Checker,
  composeCheckers,
  Rule,
  all: Selection.all,
  any: Selection.any,
  raw: Selection.raw,
  onInput,
  onOutput,
  Reference
}
