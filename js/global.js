// global.js
// @author octopoulo <polluxyz@gmail.com>
// @version 2020-04-13
//
// global variables shared across multiple js files
//
// included after: common, engine
/*
globals
DEV:true, LS, Y
*/
'use strict';

/**
 * Parse DEV
 */
function parse_dev() {
    let names = {
            d: 'debug',
            i: 'input',                 // gamepad input
        },
        text = Y.dev || '';

    DEV = {};
    for (let i=0, length=text.length; i<length; i++) {
        let letter = text[i];
        if (letter == 'Z')
            DEV = {};
        else {
            let name = names[letter];
            if (name)
                DEV[name] = 1;
        }
    }

    if (DEV.debug & 1)
        LS(DEV);
}
