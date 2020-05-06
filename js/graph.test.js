// graph.test.js
// @author octopoulo <polluxyz@gmail.com>
// @version 2020-04-18
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

let {clamp_eval} = require(OUTPUT_MODULE);

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// clamp_eval
[
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
].forEach(([eval_, answer], id) => {
    test(`clamp_eval:${id}`, () => {
        expect(clamp_eval(eval_)).toEqual(answer);
    });
});
