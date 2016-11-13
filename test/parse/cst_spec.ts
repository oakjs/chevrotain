import {Token, extendToken, extendLazyToken, extendSimpleLazyToken} from "../../src/scan/tokens_public"
import {Parser} from "../../src/parse/parser_public"
import {exceptions} from "../../src/parse/exceptions_public"
import {clearCache} from "../../src/parse/cache_public"
import {tokenInstanceofMatcher, tokenStructuredMatcher} from "../../src/scan/tokens"
import {createRegularToken, createSimpleToken, createLazyToken} from "../utils/matchers"
import MismatchedTokenException = exceptions.MismatchedTokenException
import NoViableAltException = exceptions.NoViableAltException
import EarlyExitException = exceptions.EarlyExitException

function defineCstSpecs(contextName, extendToken, createToken, tokenMatcher) {

    context("CST " + contextName, () => {

        let A = extendToken("A")
        let B = extendToken("B")
        let C = extendToken("C")

        const ALL_TOKENS = [A, B, C]

        it("Can output a CST for a flat structure", () => {
            class CstTerminalParser extends Parser {

                constructor(input:Token[] = []) {
                    super(input, ALL_TOKENS, {outputCst: true});
                    (<any>Parser).performSelfAnalysis(this)
                }

                public testRule = this.RULE("testRule", () => {
                    this.CONSUME(A)
                    this.CONSUME(B)
                    this.SUBRULE(this.bamba)
                })

                public bamba = this.RULE("bamba", () => {
                    this.CONSUME(C)
                })
            }

            let input = [createToken(A), createToken(B), createToken(C)]
            let parser = new CstTerminalParser(input)
            let cst = parser.testRule()
            expect(cst.name).to.equal("testRule")
            expect(cst.childrenDictionary).to.have.keys("A", "B", "bamba")
            expect(tokenMatcher(cst.childrenDictionary.A, A)).to.be.true
            expect(tokenMatcher(cst.childrenDictionary.B, B)).to.be.true
            expect(cst.childrenDictionary.bamba.name).to.equal("bamba")
            expect(tokenMatcher(cst.childrenDictionary.bamba.childrenDictionary.C, C)).to.be.true
        })

        it("Can output a CST for a Terminal - alternations", () => {
            class CstTerminalAlternationParser extends Parser {

                constructor(input:Token[] = []) {
                    super(input, ALL_TOKENS, {outputCst: true});
                    (<any>Parser).performSelfAnalysis(this)
                }

                public testRule = this.RULE("testRule", () => {
                    this.OR([
                        {
                            ALT: () => {
                                this.CONSUME(A)
                            }
                        },
                        {
                            ALT: () => {
                                this.CONSUME(B)
                                this.SUBRULE(this.bamba)
                            }
                        }
                    ])
                })

                public bamba = this.RULE("bamba", () => {
                    this.CONSUME(C)
                })
            }

            let input = [createToken(A)]
            let parser = new CstTerminalAlternationParser(input)
            let cst = parser.testRule()
            expect(cst.name).to.equal("testRule")
            expect(cst.childrenDictionary).to.have.keys("A", "B", "bamba")
            expect(tokenMatcher(cst.childrenDictionary.A, A)).to.be.true
            expect(cst.childrenDictionary.bamba).to.be.undefined
        })

        it("Can output a CST for a Terminal - alternations - single", () => {
            class CstTerminalAlternationSingleAltParser extends Parser {

                constructor(input:Token[] = []) {
                    super(input, ALL_TOKENS, {outputCst: true});
                    (<any>Parser).performSelfAnalysis(this)
                }

                public testRule = this.RULE("testRule", () => {
                    this.OR([
                        {
                            ALT: () => {
                                this.CONSUME(A)
                                this.CONSUME(B)
                            }
                        }
                    ])
                })


            }

            let input = [createToken(A), createToken(B)]
            let parser = new CstTerminalAlternationSingleAltParser(input)
            let cst = parser.testRule()
            expect(cst.name).to.equal("testRule")
            expect(cst.childrenDictionary).to.have.keys("A", "B")
            expect(tokenMatcher(cst.childrenDictionary.A, A)).to.be.true
            expect(tokenMatcher(cst.childrenDictionary.B, B)).to.be.true
        })

        it("Can output a CST for a Terminal with multiple occurrences", () => {
            class CstMultiTerminalParser extends Parser {

                constructor(input:Token[] = []) {
                    super(input, ALL_TOKENS, {outputCst: true});
                    (<any>Parser).performSelfAnalysis(this)
                }

                public testRule = this.RULE("testRule", () => {
                    this.CONSUME(A)
                    this.CONSUME(B)
                    this.CONSUME2(A)
                })
            }

            let input = [createToken(A), createToken(B), createToken(A)]
            let parser = new CstMultiTerminalParser(input)
            let cst = parser.testRule()
            expect(cst.name).to.equal("testRule")
            expect(cst.childrenDictionary).to.have.keys("A", "B")
            expect(cst.childrenDictionary.A).to.have.length(2)
            expect(tokenMatcher(cst.childrenDictionary.A[0], A)).to.be.true
            expect(tokenMatcher(cst.childrenDictionary.A[1], A)).to.be.true
            expect(tokenMatcher(cst.childrenDictionary.B, B)).to.be.true
        })

        it("Can output a CST for a Terminal with multiple occurrences - iteration", () => {
            class CstMultiTerminalWithManyParser extends Parser {

                constructor(input:Token[] = []) {
                    super(input, ALL_TOKENS, {outputCst: true});
                    (<any>Parser).performSelfAnalysis(this)
                }

                public testRule = this.RULE("testRule", () => {
                    this.MANY(() => {
                        this.CONSUME(A)
                        this.SUBRULE(this.bamba)
                    })
                    this.CONSUME(B)
                })

                public bamba = this.RULE("bamba", () => {
                    this.CONSUME(C)
                })
            }

            let input = [createToken(A), createToken(C), createToken(A), createToken(C), createToken(A), createToken(C), createToken(B)]
            let parser = new CstMultiTerminalWithManyParser(input)
            let cst = parser.testRule()
            expect(cst.name).to.equal("testRule")
            expect(cst.childrenDictionary).to.have.keys("A", "B", "bamba")
            expect(cst.childrenDictionary.A).to.have.length(3)
            expect(tokenMatcher(cst.childrenDictionary.A[0], A)).to.be.true
            expect(tokenMatcher(cst.childrenDictionary.A[1], A)).to.be.true
            expect(tokenMatcher(cst.childrenDictionary.A[2], A)).to.be.true
            expect(tokenMatcher(cst.childrenDictionary.B, B)).to.be.true
            expect(cst.childrenDictionary.bamba).to.have.length(3)
            expect(tokenMatcher(cst.childrenDictionary.bamba[0].childrenDictionary.C, C)).to.be.true
            expect(tokenMatcher(cst.childrenDictionary.bamba[1].childrenDictionary.C, C)).to.be.true
            expect(tokenMatcher(cst.childrenDictionary.bamba[2].childrenDictionary.C, C)).to.be.true
        })

        context("Can output a CST for an optional terminal", () => {
            class CstOptionalTerminalParser extends Parser {

                constructor(input:Token[] = []) {
                    super(input, ALL_TOKENS, {outputCst: true});
                    (<any>Parser).performSelfAnalysis(this)
                }

                public ruleWithOptional = this.RULE("ruleWithOptional", () => {
                    this.OPTION(() => {
                        this.CONSUME(A)
                        this.SUBRULE(this.bamba)
                    })
                    this.CONSUME(B)
                })

                public bamba = this.RULE("bamba", () => {
                    this.CONSUME(C)
                })
            }

            it("path taken", () => {
                let input = [createToken(A), createToken(C), createToken(B)]
                let parser = new CstOptionalTerminalParser(input)
                let cst = parser.ruleWithOptional()
                expect(cst.name).to.equal("ruleWithOptional")
                expect(cst.childrenDictionary).to.have.keys("A", "B", "bamba")
                expect(tokenMatcher(cst.childrenDictionary.A, A)).to.be.true
                expect(cst.childrenDictionary.bamba.name).to.equal("bamba")
                expect(tokenMatcher(cst.childrenDictionary.bamba.childrenDictionary.C, C)).to.be.true
                expect(tokenMatcher(cst.childrenDictionary.B, B)).to.be.true
            })

            it("path NOT taken", () => {
                let input = [createToken(B)]
                let parser = new CstOptionalTerminalParser(input)
                let cst = parser.ruleWithOptional()
                expect(cst.name).to.equal("ruleWithOptional")
                expect(cst.childrenDictionary).to.have.keys("A", "B", "bamba")
                expect(cst.childrenDictionary.A).to.be.undefined
                expect(cst.childrenDictionary.bamba).to.be.undefined
                expect(tokenMatcher(cst.childrenDictionary.B, B)).to.be.true
            })
        })

        it("Can output a CST for a Terminal with multiple occurrences - iteration mandatory", () => {
            class CstMultiTerminalWithAtLeastOneParser extends Parser {

                constructor(input:Token[] = []) {
                    super(input, ALL_TOKENS, {outputCst: true});
                    (<any>Parser).performSelfAnalysis(this)
                }

                public testRule = this.RULE("testRule", () => {
                    this.AT_LEAST_ONE(() => {
                        this.CONSUME(A)
                    })
                    this.CONSUME(B)
                })
            }

            let input = [createToken(A), createToken(A), createToken(A), createToken(B)]
            let parser = new CstMultiTerminalWithAtLeastOneParser(input)
            let cst = parser.testRule()
            expect(cst.name).to.equal("testRule")
            expect(cst.childrenDictionary).to.have.keys("A", "B")
            expect(cst.childrenDictionary.A).to.have.length(3)
            expect(tokenMatcher(cst.childrenDictionary.A[0], A)).to.be.true
            expect(tokenMatcher(cst.childrenDictionary.A[1], A)).to.be.true
            expect(tokenMatcher(cst.childrenDictionary.A[2], A)).to.be.true
            expect(tokenMatcher(cst.childrenDictionary.B, B)).to.be.true
        })

        it("Can output a CST for a Terminal with multiple occurrences - iteration SEP", () => {
            class CstMultiTerminalWithManySepParser extends Parser {

                constructor(input:Token[] = []) {
                    super(input, ALL_TOKENS, {outputCst: true});
                    (<any>Parser).performSelfAnalysis(this)
                }

                public testRule = this.RULE("testRule", () => {
                    this.MANY_SEP({
                        SEP: C, DEF: () => {
                            this.CONSUME(A)
                        }
                    })
                    this.CONSUME(B)
                })
            }

            let input = [createToken(A), createToken(C), createToken(A), createToken(B)]
            let parser = new CstMultiTerminalWithManySepParser(input)
            let cst = parser.testRule()
            expect(cst.name).to.equal("testRule")
            expect(cst.childrenDictionary).to.have.keys("A", "B", "C")
            expect(cst.childrenDictionary.A).to.have.length(2)
            expect(tokenMatcher(cst.childrenDictionary.A[0], A)).to.be.true
            expect(tokenMatcher(cst.childrenDictionary.A[1], A)).to.be.true
            expect(tokenMatcher(cst.childrenDictionary.B, B)).to.be.true

            expect(cst.childrenDictionary.C).to.have.length(1)
            expect(tokenMatcher(cst.childrenDictionary.C[0], C)).to.be.true
        })

        it("Can output a CST for a Terminal with multiple occurrences - iteration SEP mandatory", () => {
            class CstMultiTerminalWithAtLeastOneSepParser extends Parser {

                constructor(input:Token[] = []) {
                    super(input, ALL_TOKENS, {outputCst: true});
                    (<any>Parser).performSelfAnalysis(this)
                }

                public testRule = this.RULE("testRule", () => {
                    this.AT_LEAST_ONE_SEP({
                        SEP: C, DEF: () => {
                            this.CONSUME(A)
                        }
                    })
                    this.CONSUME(B)
                })
            }

            let input = [createToken(A), createToken(C), createToken(A), createToken(B)]
            let parser = new CstMultiTerminalWithAtLeastOneSepParser(input)
            let cst = parser.testRule()
            expect(cst.name).to.equal("testRule")
            expect(cst.childrenDictionary).to.have.keys("A", "B", "C")
            expect(cst.childrenDictionary.A).to.have.length(2)
            expect(tokenMatcher(cst.childrenDictionary.A[0], A)).to.be.true
            expect(tokenMatcher(cst.childrenDictionary.A[1], A)).to.be.true
            expect(tokenMatcher(cst.childrenDictionary.B, B)).to.be.true

            expect(cst.childrenDictionary.C).to.have.length(1)
            expect(tokenMatcher(cst.childrenDictionary.C[0], C)).to.be.true
        })

        after(() => {
            clearCache()
        })
    })
}

defineCstSpecs("Regular Tokens Mode", extendToken, createRegularToken, tokenInstanceofMatcher)
defineCstSpecs("Lazy Tokens Mode", extendLazyToken, createLazyToken, tokenInstanceofMatcher)
defineCstSpecs("Simple Lazy Tokens Mode", extendSimpleLazyToken, createSimpleToken, tokenStructuredMatcher)
