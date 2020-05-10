// create-module.js
// @author octopoulo <polluxyz@gmail.com>
// @version 2020-04-13
//
// This module is useful for testing js files without them having any exports.
// Look at common.test.js for an example.
//
/*
globals
console, module, require
*/
'use strict';

let fs = require('fs'),
    XRegExp = require('xregexp');

/**
 * Create a combined js module with the exports for all functions
 * @param {string} path base path for all sources
 * @param {string[]} sources desired js to test + all its dependencies
 * @param {string} output path without .js for the combined output
 * @param {string=} extra_exports ex: global variables that we want exported
 */
function create_module(path, sources, output, extra_exports) {
    let all = '',
        filenames = sources.map(source => `${path}/${source}.js`),
        output_js = `${output}.js`;

    if (extra_exports)
        extra_exports = extra_exports.split(' ');

    // 1) check if the output exists and is more recent than every file
    if (fs.existsSync(output_js)) {
        let output_time = fs.statSync(output_js).mtime,
            times = filenames.filter(filename => fs.statSync(filename).mtime > output_time);

        // it's more recent, but maybe it must be updated still
        if (!times.length) {
            // check if the file contains all extra_exports
            let exports = '',
                js_file = fs.readFileSync(output_js, 'utf-8');
            XRegExp.forEach(js_file, /module.exports = {(.*?)}/gs, match => {   // jshint ignore:line
                exports += match[1];
            });

            if (extra_exports) {
                let misses = extra_exports.filter(name => !exports.includes(`${name}: ${name},`));
                if (!misses.length)
                    return;
                console.log(misses);
            }
        }
        else
            console.log(times);
    }

    // 2) read all files
    for (let filename of filenames) {
        let js_file = fs.readFileSync(filename, 'utf-8');
        all += js_file;
    }

    // 3) find all functions
    let funcs = [];
    XRegExp.forEach(all, /\nfunction (.*?)\(/g, match => {
        funcs.push(match[1]);
    });
    if (extra_exports)
        funcs = [...new Set([...funcs, ...extra_exports])];
    // console.log(funcs.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())));

    // 4) save the combined file + exports
    all += '///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////\n\n'
        + '// exports\n'
        + '/* globals module */\n'
        + '// <<\n'
        + 'module.exports = {\n'
        + funcs.map(func => (`    ${func}: ${func},\n`)).join('')
        + '};\n'
        + '// >>\n';

    fs.writeFileSync(output_js, all);
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

module.exports = {
    create_module: create_module,
};
