// graphs.test.js
// @author octopoulo <polluxyz@gmail.com>
// @version 2020-04-18
//
/* globals
__dirname, expect, require, test,
*/
'use strict';

let {create_module} = require('./create-module');

let IMPORT_PATH = __dirname.replace(/\\/g, '/'),
    OUTPUT_MODULE = `${IMPORT_PATH}/test/graphs+`;

create_module(IMPORT_PATH, [
    'common',
    '../dist/js/graphs',
], OUTPUT_MODULE);

let {getEval} = require(OUTPUT_MODULE);

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// getEval
[
    [NaN, 10],
    [Infinity, 10],
    [-5.2, -5.2],
    [-19, -10],
    [3.14, 3.14],
    [10.05, 10],
    ['3.14', '3.14'],
    ['-3.14', '-3.14'],
    ['-something', -10],
    ['something', 10],
].forEach(([eval_, answer], id) => {
    test(`getEval:${id}`, () => {
        expect(getEval(eval_)).toEqual(answer);
    });
});
