// tcec.test
//
/* globals
__dirname, expect, require, test,
*/
'use strict';

let {create_module} = require('./create-module');

let IMPORT_PATH = __dirname.replace(/\\/g, '/'),
    OUTPUT_MODULE = `${IMPORT_PATH}/test/tcec+`;

create_module(IMPORT_PATH, [
    'common',
    'tcec',
], OUTPUT_MODULE);

let {
        getScoreText,
    } = require(OUTPUT_MODULE);

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// getScoreText
[
    ['0', {w: 0, b: 1}],
    ['01', {w: 1, b: 1}],
    ['011===', {w: 3.5, b: 2.5}],
    ['011===11111', {w: 8.5, b: 2.5}],
].forEach(([text, answer], id) => {
    test(`getScoreText:${id}`, () => {
        expect(getScoreText(text)).toEqual(answer);
    });
});
