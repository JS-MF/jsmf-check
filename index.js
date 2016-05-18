/* eslint es6 */
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
    return new RuleResult(mergeErrors(r0.errors, r1.errors))
}

function mergeErrors(e0, e1) {
  if (e0 instanceof Array) {
    return e0.concat(e1)
  } else if (e0 instanceof Object) {
    return Object.assign.apply(undefined, [e0,e1])
  }
}

function ContextualReference(f) {
    this.selector = f
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
    const selections = _.mapValues(this.helpers, s => s(input))
    const result = _(this.rules)
      .map((r, name) => {
         const result = r.run(input, selections)
         if (!_.isEmpty(result.errors)) {
            const errors = result.errors
            result.errors = {}
            result.errors[name] = errors
         }
         return result
      }).reduce(mergeRuleResults, RuleResult.success)
    if (!_.isEmpty(result.errors)) { result.errors = Object.assign.apply(undefined, result.errors) }
    return result
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
    const resolvedSelections =
      _.map(this.selections, s => resolveSelection(s, input, selections))
    return check(this.check, resolvedSelections, [], [])
}

function check(f, selections, context, path) {
    let e = selections.shift()
    if (e == undefined) { return f.apply(undefined, context) ? RuleResult.success : RuleResult.error(path) }
    if (e.content instanceof ContextualReference) {
        selections = selections.slice()
        e = {type: e.type, content: e.content.selector.call(context)}
    }
    switch (e.type) {
        case Selection.any:
          path.push(e.content)
          const test = _.some(e.content, x => {
            const ctx = context.slice()
            ctx.push(x)
            return check(f, selections.slice(), ctx, []).succeed
          })
          return test ? RuleResult.success : RuleResult.error(path)
        case Selection.all:
          return _.reduce(e.content,
              (res, x) => {
                  const ctx = context.slice()
                  ctx.push(x)
                  const currentPath = path.slice()
                  currentPath.push(x)
                  const stack = selections.slice()
                  return mergeRuleResults(res, check(f, stack, ctx, currentPath))
              },
              RuleResult.success)
        case Selection.raw:
          context.push(e.content)
          path.push(e.content)
          return check(f, selections, context, path)
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
  Reference: function(x) {return new Reference(x)},
  ContextualReference: function(x) {return new ContextualReference(x)},
}
