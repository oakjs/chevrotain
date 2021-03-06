/**
 * This example demonstrate implementing a lexer for a language using python like indentation.
 * This is achieved by using custom Token patterns which allow running user defined logic
 * to match tokens.
 *
 * The logic is simple:
 * - Indentation tokens (Indent, outdent) can only be created for whitespace on the beginning of a line.
 * - Change in the "level" of the indentation will create either Indent(increase) or Outdent(decrease).
 * - Same indentation level will be parsed as "regular" whitespace and be ignored.
 * - The previous Ident levels will be saved in a stack.
 *
 * For additional details on custom token patterns, see the docs:
 * https://github.com/SAP/chevrotain/blob/master/docs/custom_token_patterns.md
 */

"use strict"
const chevrotain = require("chevrotain")
const createToken = chevrotain.createToken
const Lexer = chevrotain.Lexer
const getStartOffset = chevrotain.getStartOffset
const _ = require("lodash")

const whiteSpaceRegExp = /^ +/

// State required for matching the indentations
let indentStack = [0]
let lastTextMatched

/**
 * This custom Token matcher uses Lexer context ("matchedTokens" and "groups" arguments)
 * combined with state via closure ("indentStack" and "lastTextMatched") to match indentation.
 *
 * @param {string} text - remaining text to lex, sent by the Chevrotain lexer.
 * @param {ISimpleTokenOrIToken[]} matchedTokens - Tokens lexed so far, sent by the Chevrotain Lexer.
 * @param {object} groups - Token groups already lexed, sent by the Chevrotain Lexer.
 * @param {string} type - determines if this function matches Indent or Outdent tokens.
 * @returns {*}
 */
function matchIndentBase(text, matchedTokens, groups, type) {
    const noTokensMatchedYet = _.isEmpty(matchedTokens)
    const newLines = groups.nl
    const noNewLinesMatchedYet = _.isEmpty(newLines)
    const isFirstLine = noTokensMatchedYet && noNewLinesMatchedYet
    const isStartOfLine =
        // only newlines matched so far
        (noTokensMatchedYet && !noNewLinesMatchedYet) ||
        // Both newlines and other Tokens have been matched AND the last matched Token is a newline
        (!noTokensMatchedYet && !noNewLinesMatchedYet && getStartOffset(_.last(newLines)) > getStartOffset(_.last(matchedTokens)))

    // indentation can only be matched at the start of a line.
    if (isFirstLine || isStartOfLine) {
        let match
        let currIndentLevel = undefined
        let isZeroIndent = text.length > 0 && text[0] !== " "
        if (isZeroIndent) {
            // Matching zero spaces Outdent would not consume any chars, thus it would cause an infinite loop.
            // This check prevents matching a sequence of zero spaces outdents.
            if (lastTextMatched !== text) {
                currIndentLevel = 0
                match = [""]
                lastTextMatched = text
            }
        }
        // possible non-empty indentation
        else {
            match = whiteSpaceRegExp.exec(text)
            if (match !== null) {
                currIndentLevel = match[0].length
            }
        }

        if (currIndentLevel !== undefined) {
            let lastIndentLevel = _.last(indentStack)
            if (currIndentLevel > lastIndentLevel && type === "indent") {
                indentStack.push(currIndentLevel)
                return match
            }
            else if (currIndentLevel < lastIndentLevel && type === "outdent") {
                //if we need more than one outdent token, add all but the last one
                if(indentStack.length > 2){
                  const image = "";
                  const offset = chevrotain.getEndOffset(_.last(matchedTokens)) + 1
                  const line = chevrotain.getEndLine(_.last(matchedTokens))
                  const column = chevrotain.getEndColumn(_.last(matchedTokens)) + 1
                  while(indentStack.length > 2 &&
                    //stop before the last Outdent
                    indentStack[indentStack.length - 2] > currIndentLevel){
                    indentStack.pop()
                    matchedTokens.push(new Outdent(image, offset, line, column))
                  }
                }
                indentStack.pop()
                return match
            }
            else {
                // same indent, this should be lexed as simple whitespace and ignored
                return null
            }
        }
        else {
            // indentation cannot be matched without at least one space character.
            return null
        }
    }
    else {
        // indentation cannot be matched under other circumstances
        return null
    }
}

// customize matchIndentBase to create separate functions of Indent and Outdent.
let matchIndent = _.partialRight(matchIndentBase, "indent")
let matchOutdent = _.partialRight(matchIndentBase, "outdent")

let If = createToken({name: "If", pattern: /if/})
let Else = createToken({name: "Else", pattern: /else/})
let Print = createToken({name: "Print", pattern: /print/})
let IntegerLiteral = createToken({name: "IntegerLiteral", pattern: /\d+/})
let Colon = createToken({name: "Colon", pattern: /:/})
let LParen = createToken({name: "LParen", pattern: /\(/})
let RParen = createToken({name: "RParen", pattern: /\)/})
let Spaces = createToken({name: "Spaces", pattern: / +/, group: Lexer.SKIPPED})

// newlines are not skipped, by setting their group to "nl" they are saved in the lexer result
// and thus we can check before creating an indentation token that the last token matched was a newline.
let Newline = createToken({name: "Newline", pattern: /\n\r|\n|\r/, group: "nl"})

// define the indentation tokens using custom token patterns
let Indent = createToken({name: "Indent", pattern: matchIndent})
let Outdent = createToken({name: "Outdent", pattern: matchOutdent})

let customPatternLexer = new Lexer(
    [
        Newline,
        // indentation tokens must appear before Spaces, otherwise all indentation will always be consumed as spaces.
        // Outdent must appear before Indent for handling zero spaces outdents.
        Outdent,
        Indent,

        Spaces,
        If,
        Else,
        Print,
        IntegerLiteral,
        Colon,
        LParen,
        RParen
    ])

module.exports = {

    // for testing purposes
    Newline:        IntegerLiteral,
    Indent:         Indent,
    Outdent:        Outdent,
    Spaces:         Spaces,
    If:             If,
    Else:           Else,
    Print:          Print,
    IntegerLiteral: IntegerLiteral,
    Colon:          Colon,
    LParen:         LParen,
    RParen:         RParen,

    tokenize: function(text) {

        // have to reset the indent stack between processing of different text inputs
        indentStack = [0]
        lastTextMatched = undefined

        let lexResult = customPatternLexer.tokenize(text)

        const lastToken = _.last(lexResult.tokens);
        const lastOffset = chevrotain.getEndOffset(lastToken);
        const lastLine = chevrotain.getEndLine(lastToken);
        const lastColumn = chevrotain.getEndColumn(lastToken);

        //add remaining Outdents
        while (indentStack.length > 1) {
            lexResult.tokens.push(new Outdent("", lastOffset, lastLine, lastColumn))
            indentStack.pop();
        }

        if (lexResult.errors.length > 0) {
            throw new Error("sad sad panda lexing errors detected")
        }
        return lexResult
    }
}
