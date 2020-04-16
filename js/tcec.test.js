// tcec.test
//
/* globals
__dirname, expect, require, test
*/
'use strict';

let {create_module} = require('./create-module');

let IMPORT_PATH = __dirname.replace(/\\/g, '/'),
    OUTPUT_MODULE = `${IMPORT_PATH}/test/tcec+`;

create_module(IMPORT_PATH, [
    'common',
    'xboard',
    '../dist/js/tcec',
], OUTPUT_MODULE);

let {
        formatUnit, getShortEngineName, getScoreText,
    } = require(OUTPUT_MODULE);

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// formatUnit
[
    [7841319402, '7.8B'],
    [58335971.81109362, '58.3M'],
    [58335971, '58.3M'],
    ['58335971', '58.3M'],
    [318315, '318.3k'],
    [1259, '1.2k'],
    [725.019, '725'],
    [NaN, 'N/A'],
    [Infinity, 'InfinityB'],
].forEach(([nodes, answer], id) => {
    test(`formatUnit:${id}`, () => {
        expect(formatUnit(nodes)).toEqual(answer);
    });
});

// getShortEngineName
[
    ['LCZero v0.24-sv-t60-3010', 'LCZero'],
    ['Stockfish 20200407DC', 'Stockfish'],
    ['SuperBaronizer', 'Baron'],
].forEach(([text, answer], id) => {
    test(`getShortEngineName:${id}`, () => {
        expect(getShortEngineName(text)).toEqual(answer);
    });
});

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
