// game.test.js
// @author octopoulo <polluxyz@gmail.com>
// @version 2020-04-21
//
/*
globals
__dirname, expect, require, test
*/
'use strict';

let {create_module} = require('./create-module');

let IMPORT_PATH = __dirname.replace(/\\/g, '/'),
    OUTPUT_MODULE = `${IMPORT_PATH}/test/game+`;

create_module(IMPORT_PATH, [
    'common',
    'xboard',
    'game',
], OUTPUT_MODULE);

let {
        calculate_score, get_short_name,
    } = require(OUTPUT_MODULE);

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// calculate_score
[
    ['0', {w: 0, b: 1}],
    ['01', {w: 1, b: 1}],
    ['011===', {w: 3.5, b: 2.5}],
    ['011===11111', {w: 8.5, b: 2.5}],
].forEach(([text, answer], id) => {
    test(`calculate_score:${id}`, () => {
        expect(calculate_score(text)).toEqual(answer);
    });
});

// get_short_name
[
    ['LCZero v0.24-sv-t60-3010', 'LCZero'],
    ['Stockfish 20200407DC', 'Stockfish'],
    ['SuperBaronizer', 'Baron'],
].forEach(([text, answer], id) => {
    test(`get_short_name:${id}`, () => {
        expect(get_short_name(text)).toEqual(answer);
    });
});
