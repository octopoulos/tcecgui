// startup.test.js
// @author octopoulo <polluxyz@gmail.com>
// @version 2020-06-20
//
/*
globals
__dirname, expect, require, test
*/
'use strict';

let {create_module} = require('./create-module');

let IMPORT_PATH = __dirname.replace(/\\/g, '/'),
    OUTPUT_MODULE = `${IMPORT_PATH}/test/startup+`;

create_module(IMPORT_PATH, [
    'common',
    'engine',
    'global',
    '3d',
    'game',
    'network',
    //
    'startup',
], OUTPUT_MODULE, 'Assign DEFAULTS Keys TYPES Y');

let {Assign, DEFAULTS, guess_types, import_settings, reset_settings, Keys, Y} = require(OUTPUT_MODULE);

guess_types(DEFAULTS);

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// import_settings
[
    [{}, true, {}],
    [{width: 100}, undefined, {width: 100}],
    [{height: '500px'}, undefined, {height: '500px', width: 100}],
].forEach(([data, reset, answer], id) => {
    test(`import_settings:${id}`, () => {
        import_settings(data, reset);
        Keys(answer).forEach(key => {
            expect(Y).toHaveProperty(key, answer[key]);
        });
    });
});

// reset_settings
[
    [{'language': 'fra', 'theme': 'dark'}, true, {language: '', theme: ''}],
].forEach(([data, reset, answer], id) => {
    test(`reset_settings:${id}`, () => {
        Assign(Y, data);
        reset_settings(data, reset);
        Keys(answer).forEach(key => {
            expect(Y).toHaveProperty(key, answer[key]);
        });
    });
});
