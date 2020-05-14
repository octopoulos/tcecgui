// global.js
// @author octopoulo <polluxyz@gmail.com>
// @version 2020-04-13
//
// global variables/functions shared across multiple js files
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
        graph: 1 * 1000,
        tables: 3 * 1000,
        three: 1 * 1000,                // 3d scene
        twitch: 5 * 1000,
        users: 5 * 1000,
    };

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Extract the ply from a FEN
 * - first move: ply=0 (white has just moved, it's black's turn now)
 * @param {string} fen
 * @returns {number}
 */
function extract_fen_ply(fen) {
    if (!fen)
        return;
    let items = fen.split(' ');
    return (items[5] - 1) * 2 - (items[1] == 'w') * 1;
}

/**
 * Parse DEV
 */
function parse_dev() {
    let names = {
            a: 'ad',                    // disable ads (for development)
            b: 'board',
            c: 'chart',
            d: 'debug',
            e: 'eval',                  // live eval
            f: 'fen',                   // sanity check: FEN vs ply
            g: 'graph',
            i: 'input',                 // gamepad input
            j: 'json',                  // static json files
            l: 'load',
            n: 'new',                   // new game debugging
            p: 'pv',
            s: 'socket',                // socket messages
            T: 'translate',             // gather translations
            u: 'ui',                    // UI events
            x: 'xboard',
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

    if (DEV.debug)
        LS(DEV);
}
