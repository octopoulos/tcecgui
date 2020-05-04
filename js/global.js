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

// modify those values in config.js
let HOST = 'https://tcec-chess.com',
    HOST_ARCHIVE = `${HOST}/archive/json`,
    LINKS = {},
    TIMEOUTS = {
        adblock: 15 * 1000,
        banner: 30 * 1000,
        google_ad: -1,                  // disabled
        tables: 3 * 1000,
        three: 1 * 1000,                // 3d scene
        twitch: 5 * 1000,
        users: 5 * 1000,
    };

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Parse DEV
 */
function parse_dev() {
    let names = {
            b: 'board',
            c: 'chart',
            d: 'debug',
            e: 'eval',                  // live eval
            g: 'graph',
            i: 'input',                 // gamepad input
            j: 'json',                  // static json files
            l: 'load',
            p: 'pv',
            s: 'socket',                // socket messages
            u: 'ui',                    // UI events
            y: 'ply',
        },
        text = Y.dev || '';

    DEV = {};
    for (let i = 0, length = text.length; i < length; i ++) {
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
