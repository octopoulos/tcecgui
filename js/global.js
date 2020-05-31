// global.js
// @author octopoulo <polluxyz@gmail.com>
// @version 2020-05-27
//
// global variables/functions shared across multiple js files
//
// included after: common, engine
/*
globals
DEV:true, IsArray, Keys, LS, Pad, Round, save_option, Undefined, X_SETTINGS, Y
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
    },
    VERSION = '20200530';

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Get the move ply, either directly or by looking at the FEN
 * - also update move.ply
 * @param {Move} move
 * @returns {number} ply -2 on error, -1 on the initial position, otherwise >= 0
 */
function get_move_ply(move) {
    if (!move)
        return -2;
    if (move.ply != undefined)
        return move.ply;
    if (!move.fen)
        return -2;

    let items = move.fen.split(' '),
        ply = (items[5] - 1) * 2 - (items[1] == 'w') * 1;
    if (ply >= -1) {
        move.ply = ply;
        return ply;
    }
    return -2;
}

/**
 * Mix 2 hex colors
 * @param {string} color1 #ffff00, ffff00
 * @param {string} color2 #0000ff
 * @param {number} mix how much of color2 to use, 0..1
 * @returns {string} #808080
 */
function mix_hex_colors(color1, color2, mix) {
    if (mix <= 0)
        return color1;
    else if (mix >= 1)
        return color2;

    let off1 = (color1[0] == '#')? 1: 0,
        off2 = (color2[0] == '#')? 1: 0;

    return '#' + [0, 2, 4].map(i => {
        let color =
              parseInt(color1.slice(off1 + i, off1 + i + 2), 16) * (1 - mix)
            + parseInt(color2.slice(off2 + i, off2 + i + 2), 16) * mix;
        return Pad(Round(color).toString(16));
    }).join('');
}

/**
 * Parse DEV
 */
function parse_dev() {
    let names = {
            a: 'arrow',
            A: 'ad',                    // disable ads (for development)
            b: 'board',
            c: 'chart',
            C: 'cup',                   // force loading bracket.json
            d: 'debug',
            D: 'div',
            e: 'eval',                  // live eval
            f: 'fen',                   // sanity check: FEN vs ply
            g: 'graph',
            i: 'input',                 // gamepad input
            j: 'json',                  // static json files
            l: 'load',
            m: 'mobil',
            o: 'open',
            n: 'new',                   // new game debugging
            p: 'pv',
            q: 'queue',
            s: 'socket',                // socket messages
            S: 'no_socket',
            T: 'translate',             // gather translations
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

    if (DEV.debug)
        LS(DEV);
}

/**
 * Reset some settings if the version is too old
 */
function reset_old_settings() {
    let version = Undefined(Y.version, '');
    if (version == VERSION)
        return;

    if (!version) {
        let updates = ['audio'];
        for (let update of updates) {
            LS(`reset ${update} settings ...`);
            let settings = X_SETTINGS[update];

            Keys(settings).forEach(key => {
                let value = settings[key];
                if (IsArray(value))
                    save_option(key, value[1]);
            });
        }
    }

    if (version < '20200530') {
        LS(`version: ${version} => ${VERSION}`);
        save_option('archive_scroll', 1);
        save_option('wheel_adjust', 63);
    }
    save_option('version', VERSION);
}

/**
 * Split a PV string into ply + array of strings
 * @param {string} text
 * @returns {[number, string[]]}
 */
function split_move_string(text) {
    if (!text)
        return [-2, []];

    let items = text.replace(/[.]{2,}/, ' ... ').split(' '),
        ply = (parseInt(items[0]) - 1) * 2 + (items[1] == '...'? 1: 0);
    return [ply, items];
}
