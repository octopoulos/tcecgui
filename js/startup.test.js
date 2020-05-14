// startup.test.js
// @author octopoulo <polluxyz@gmail.com>
// @version 2020-05-10
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
    'game',
    //
    'startup',
], OUTPUT_MODULE);

let {create_url_list} = require(OUTPUT_MODULE);

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// create_url_list
[
    [null, ''],
    [{}, '<vert class="fastart"></vert>'],
    [{a: 1}, '<vert class="fastart"><hr></vert>'],
].forEach(([dico, answer], id) => {
    test(`create_url_list:${id}`, () => {
        expect(create_url_list(dico)).toEqual(answer);
    });
});
