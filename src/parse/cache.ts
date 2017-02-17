/**
 * module used to cache static information about parsers,
 */

import {IParserDefinitionError} from "./parser_public"
import {HashTable} from "../lang/lang_extensions"
import {gast} from "./grammar/gast_public"
import {IFirstAfterRepetition} from "./grammar/interpreter"
import {filter, forEach, values} from "./../utils/utils"
import {TokenConstructor} from "../scan/lexer_public"
import {CST_SUBTYPE} from "./cst/cst"

export let CLASS_TO_DEFINITION_ERRORS = new HashTable<IParserDefinitionError[]>()

export let CLASS_TO_SELF_ANALYSIS_DONE = new HashTable<boolean>()

export let CLASS_TO_GRAMMAR_PRODUCTIONS = new HashTable<HashTable<gast.Rule>>()

export function getProductionsForClass(className:string):HashTable<gast.Rule> {
    return getFromNestedHashTable(className, CLASS_TO_GRAMMAR_PRODUCTIONS)
}

export let CLASS_TO_RESYNC_FOLLOW_SETS = new HashTable<HashTable<Function[]>>()

export function getResyncFollowsForClass(className:string):HashTable<TokenConstructor[]> {
    return getFromNestedHashTable(className, CLASS_TO_RESYNC_FOLLOW_SETS)
}

export function setResyncFollowsForClass(className:string, followSet:HashTable<Function[]>):void {
    CLASS_TO_RESYNC_FOLLOW_SETS.put(className, followSet)
}

export let CLASS_TO_LOOKAHEAD_FUNCS = new HashTable<HashTable<Function>>()

export function getLookaheadFuncsForClass(className:string):HashTable<Function> {
    return getFromNestedHashTable(className, CLASS_TO_LOOKAHEAD_FUNCS)
}

export let CLASS_TO_FIRST_AFTER_REPETITION = new HashTable<HashTable<IFirstAfterRepetition>>()

export function getFirstAfterRepForClass(className:string):HashTable<IFirstAfterRepetition> {
    return getFromNestedHashTable(className, CLASS_TO_FIRST_AFTER_REPETITION)
}

export let CLASS_TO_PRODUCTION_OVERRIDEN = new HashTable<HashTable<boolean>>()

export function getProductionOverriddenForClass(className:string):HashTable<boolean> {
    return getFromNestedHashTable(className, CLASS_TO_PRODUCTION_OVERRIDEN)
}

export const CLASS_TO_IS_COLLECTION_PER_RULE = new HashTable<HashTable<HashTable<boolean>>>()

export function getIsCollectionPerRuleForClass(className:string):HashTable<HashTable<CST_SUBTYPE>> {
    return getFromNestedHashTable(className, CLASS_TO_IS_COLLECTION_PER_RULE)
}

// TODO reflective test to verify this has not changed, for example (OPTION6 added)
export const MAX_OCCURRENCE_INDEX = 5

function getFromNestedHashTable(className:string, hashTable:HashTable<any>) {
    let result = hashTable.get(className)
    if (result === undefined) {
        hashTable.put(className, new HashTable<any>())
        result = hashTable.get(className)
    }
    return result
}

export function clearCache():void {
    let hasTables = filter(values(module.exports), (currHashTable) => currHashTable instanceof HashTable)
    forEach(hasTables, (currHashTable) => currHashTable.clear())
}
