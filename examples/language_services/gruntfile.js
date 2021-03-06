module.exports = function(grunt) {

    var pkg = grunt.file.readJSON('package.json')

    //noinspection UnnecessaryLabelJS
    grunt.initConfig({
        pkg: pkg,

        run: {
            options: {
                failOnError: true
            },

            ts_compile: {
                exec: 'tsc'
            },
        },
        mocha_istanbul: {
            pudu: {
                src:     'bin/test/pudu',
                options: {
                    mask:           '**/*spec.js',
                    coverageFolder: 'bin/coverage'
                }
            },

            jes: {
                src:     'bin/test/examples/json',
                options: {
                    mask:           '**/*spec.js',
                    coverageFolder: 'bin/coverage'
                }
            }
        },

        tslint: {
            options: {
                configuration: grunt.file.readJSON("tslint.json")
            },

            files: {
                src: ['src/pudu/**/*.ts', 'src/examples/**/*.ts', 'test/pudu/**/*.ts', 'test/examples/**/*.ts']
            }
        },

        ts: {
            options: {
                bin:  "ES5",
                fast: "never"

            },

            all: {
                src:     ['src/**/*.ts', 'test/**/*.ts', 'typings/**/*.d.ts'],
                outDir:  'bin/',
                options: {
                    module:         "commonjs",
                    declaration:    false,
                    removeComments: false,
                    sourceMap:      true
                }
            }
        },

        clean: {
            all: ["bin"]
        }
    })

    require('load-grunt-tasks')(grunt);

    grunt.registerTask('build', [
        'clean:all',
        'tslint',
        'run:ts_compile'
    ])

    grunt.registerTask('test', [
            'build',
            'mocha_istanbul:pudu',
            'mocha_istanbul:jes'
        ]
    )
}
