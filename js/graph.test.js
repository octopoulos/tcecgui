// graph.test.js
// @author octopoulo <polluxyz@gmail.com>
// @version 2020-05-11
//
/*
globals
__dirname, expect, require, test,
*/
'use strict';

let {create_module} = require('./create-module');

let IMPORT_PATH = __dirname.replace(/\\/g, '/'),
    OUTPUT_MODULE = `${IMPORT_PATH}/test/graph+`;

create_module(IMPORT_PATH, [
    'common',
    'graph',
], OUTPUT_MODULE);

let {clamp_eval, invert_eval} = require(OUTPUT_MODULE);

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// clamp_eval
[
    ['', 0],
    [NaN, 10],
    [Infinity, 10],
    [-5.2, -5.2],
    [-19, -10],
    [3.14, 3.14],
    [10.05, 10],
    ['3.14', 3.14],
    ['-3.14', -3.14],
    ['-something', -10],
    ['something', 10],
    ['M#33', 10],
    ['-M#33', -10],
    ['#18', 10],
    ['#-18', -10],
].forEach(([eval_, answer], id) => {
    test(`clamp_eval:${id}`, () => {
        expect(clamp_eval(eval_)).toEqual(answer);
    });
});

// invert_eval
[
    ['', -0],
    [NaN, NaN],
    [Infinity, -Infinity],
    [-5.2, 5.2],
    [-19, 19],
    ['3.14', -3.14],
    ['-3.14', 3.14],
    ['-something', 'something'],
    ['something', '-something'],
    ['M#33', '-M#33'],
    ['-M#33', 'M#33'],
].forEach(([eval_, answer], id) => {
    test(`invert_eval:${id}`, () => {
        expect(invert_eval(eval_)).toEqual(answer);
    });
});
