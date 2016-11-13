import {ISimpleTokenOrIToken, tokenName, getTokenConstructor} from "../../scan/tokens_public"
import {CstNode, CstChildrenDictionary} from "./cst_public"
import {gast} from "../grammar/gast_public"
import {isEmpty, drop, cloneArr, dropRight, last, cloneObj, forEach, has} from "../../utils/utils"
import IProduction = gast.IProduction
import GAstVisitor = gast.GAstVisitor
import NonTerminal = gast.NonTerminal
import Terminal = gast.Terminal
import {HashTable} from "../../lang/lang_extensions"


export function addTerminalToCst(node:CstNode, token:ISimpleTokenOrIToken, cstType:CST_SUBTYPE):void {
    let tokenClassName = tokenName(getTokenConstructor(token))
    if (cstType === CST_SUBTYPE.COLLECTION) {
        (node.childrenDictionary[tokenClassName] as Array<ISimpleTokenOrIToken>).push(token)
    }
    else {
        node.childrenDictionary[tokenClassName] = token
    }
}

export function addNoneTerminalToCst(node:CstNode, ruleName:string, ruleResult:any, cstType:CST_SUBTYPE):void {
    if (cstType === CST_SUBTYPE.COLLECTION) {
        (node.childrenDictionary[ruleName] as Array<CstNode>).push(ruleResult)
    }
    else {
        node.childrenDictionary[ruleName] = ruleResult
    }
}

export function buildChildrenDictionaryDefTopRules(topRules:gast.Rule[]):HashTable<HashTable<CST_SUBTYPE>> {
    let result = new HashTable<HashTable<CST_SUBTYPE>>()

    forEach(topRules, (currTopRule) => {
        let currRuleDictionaryDef = buildChildDictionaryDef(currTopRule.definition)
        result.put(currTopRule.name, currRuleDictionaryDef)
    })

    return result
}

export enum CST_SUBTYPE {NONE, COLLECTION, OPTIONAL}

export class ChildDictionaryDefInitVisitor extends GAstVisitor {

    public result:HashTable<CST_SUBTYPE>

    constructor() {
        super()
        this.result = new HashTable<CST_SUBTYPE>()
    }

    public visitNonTerminal(node:NonTerminal):any {
        let id = node.nonTerminalName
        this.result.put(id, CST_SUBTYPE.NONE)
    }

    public visitTerminal(node:Terminal):any {
        let id = tokenName(node.terminalType)
        this.result.put(id, CST_SUBTYPE.NONE)
    }
}

export function buildChildDictionaryDef(initialDef:IProduction[]):HashTable<CST_SUBTYPE> {

    let initVisitor = new ChildDictionaryDefInitVisitor()
    let wrapperRule = new gast.Rule("wrapper", initialDef)
    wrapperRule.accept(initVisitor)

    let result = initVisitor.result

    let possiblePaths = []
    possiblePaths.push({def: initialDef, inIteration: [], inOption: [], currResult: {}})

    let currDef:IProduction[]
    let currInIteration
    let currInOption
    let currResult

    function addSingleItemToResult(itemName) {
        if (!has(currResult, itemName)) {
            currResult[itemName] = 0
        }
        currResult[itemName] += 1

        let occurrencesFound = currResult[itemName]
        if (occurrencesFound > 1 || last(currInIteration)) {
            result.put(itemName, CST_SUBTYPE.COLLECTION)
        }
        else if (last(currInOption)) {
            result.put(itemName, CST_SUBTYPE.OPTIONAL)
        }

        let nextPath = {
            def:         drop(currDef),
            inIteration: currInIteration,
            inOption:    currInOption,
            currResult:  cloneObj(currResult)
        }
        possiblePaths.push(nextPath)
    }

    while (!isEmpty(possiblePaths)) {
        let currPath = possiblePaths.pop()

        currDef = currPath.def
        currInIteration = currPath.inIteration
        currInOption = currPath.inOption
        currResult = currPath.currResult

        // For Example: an empty path could exist in a valid grammar in the case of an EMPTY_ALT
        if (isEmpty(currDef)) {
            continue
        }

        const EXIT_ITERATION:any = "EXIT_ITERATION"
        const EXIT_OPTION:any = "EXIT_OPTION"

        let prod = currDef[0]
        if (prod === EXIT_ITERATION) {
            let nextPath = {
                def:         drop(currDef),
                inIteration: dropRight(currInIteration),
                inOption:    currInOption,
                currResult:  cloneObj(currResult)
            }
            possiblePaths.push(nextPath)
        }
        else if (prod === EXIT_OPTION) {
            let nextPath = {
                def:         drop(currDef),
                inIteration: currInIteration,
                inOption:    dropRight(currInOption),
                currResult:  cloneObj(currResult)
            }
            possiblePaths.push(nextPath)
        }
        else if (prod instanceof gast.Terminal) {
            let terminalName = tokenName(prod.terminalType)
            addSingleItemToResult(terminalName)
        }
        else if (prod instanceof gast.NonTerminal) {
            let nonTerminalName = prod.nonTerminalName
            addSingleItemToResult(nonTerminalName)
        }
        else if (prod instanceof gast.Option) {
            let newInOption = cloneArr(currInIteration)
            newInOption.push(true)

            let nextPathWith = {
                def:         prod.definition.concat([EXIT_OPTION], drop(currDef)),
                inIteration: currInIteration,
                inOption:    newInOption,
                currResult:  cloneObj(currResult)
            }
            possiblePaths.push(nextPathWith)
        }

        else if (prod instanceof gast.RepetitionMandatory || prod instanceof gast.Repetition) {
            let nextDef = prod.definition.concat([EXIT_ITERATION], drop(currDef))
            let newInIteration = cloneArr(currInIteration)
            newInIteration.push(true)
            let nextPath = {
                def:         nextDef,
                inIteration: newInIteration,
                inOption:    currInOption,
                currResult:  cloneObj(currResult)
            }
            possiblePaths.push(nextPath)
        }
        else if (prod instanceof gast.RepetitionMandatoryWithSeparator || prod instanceof gast.RepetitionWithSeparator) {
            let separatorGast = new gast.Terminal(prod.separator)
            let secondIteration:any = new gast.Repetition([<any>separatorGast].concat(prod.definition), prod.occurrenceInParent)
            // Hack: X (, X)* --> (, X) because it is identical in terms of identifying "isCollection?"
            let nextDef = [secondIteration].concat([EXIT_ITERATION], drop(currDef))
            let newInIteration = cloneArr(currInIteration)
            newInIteration.push(true)
            let nextPath = {
                def:         nextDef,
                inIteration: newInIteration,
                inOption:    currInOption,
                currResult:  cloneObj(currResult)
            }
            possiblePaths.push(nextPath)
        }
        else if (prod instanceof gast.Alternation) {
            // IGNORE ABOVE ELSE
            let hasMoreThanOneAlt = prod.definition.length > 1
            // the order of alternatives is meaningful, FILO (Last path will be traversed first).
            for (let i = prod.definition.length - 1; i >= 0; i--) {

                let currAlt:any = prod.definition[i]
                let newInOption
                let newDef
                if (hasMoreThanOneAlt) {
                    newInOption = cloneArr(currInIteration)
                    newInOption.push(true)
                    newDef = currAlt.definition.concat([EXIT_OPTION], drop(currDef))
                }
                else {
                    newInOption = cloneArr(currInIteration)
                    newDef = currAlt.definition.concat(drop(currDef))
                }

                let currAltPath = {
                    def:         newDef,
                    inIteration: currInIteration,
                    inOption:    newInOption,
                    currResult:  cloneObj(currResult)
                }
                possiblePaths.push(currAltPath)
            }
        }
        else {
            throw Error("non exhaustive match")
        }
    }
    return result
}

export function initChildrenDictionary(dictionaryDef:HashTable<CST_SUBTYPE>):CstChildrenDictionary {
    let childrenDictionary = {}

    // TODO: use regular for loop here for perforance
    forEach(dictionaryDef.keys(), (key) => {
        let value = dictionaryDef.get(key)
        if (value === CST_SUBTYPE.COLLECTION) {
            childrenDictionary[key] = []
        }
        else if (value === CST_SUBTYPE.OPTIONAL) {
            childrenDictionary[key] = undefined
        }
    })
    return childrenDictionary
}
