// global.js
// @author octopoulo <polluxyz@gmail.com>
// @version 2021-01-25
//
// global variables/functions shared across multiple js files
//
// included after: common, engine
/*
globals
Abs, Assign, Atan, Clamp, DEFAULTS, Exp, exports, Floor, FormatUnit, global, Hide, HTML, Id, IsDigit, Keys,
LS, Max, Min, Pad, Pow, require, Round, save_default, save_option, show_popup, Split, Undefined, Y
*/
'use strict';

// <<
if (typeof global != 'undefined') {
    ['common', 'engine'].forEach(key => {
        Object.assign(global, require(`./${key}.js`));
    });
}
// >>

// modify those values in config.js
let HOST_ARCHIVE,
    SF_COEFF_AS = [-8.24404295, 64.23892342, -95.73056462, 153.86478679],
    SF_COEFF_BS = [-3.37154371, 28.44489198, -56.67657741,  72.05858751],
    SF_PAWN_VALUE = 2.06,
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
    VERSION = '20210125c',
    virtual_close_popups,
    xboards = {};

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Convert centipawn to score % for AS
 * @see https://github.com/manyoso/allie/blob/be656ec3042e0422c8275d6362ca4f69b2e43f0d/lib/node.cpp#L39
 * @param {number} cp
 * @returns {number}
 */
function allie_cp_to_score(cp) {
    if (Abs(cp) > 1000)
        return (cp + (cp > 0 ? 127407 : -127407)) / 153007;
    return Atan(cp / 111) / 1.74;
}

/**
 * Update move values but skips empty strings like fen='' and pv=''
 * @param {Move} move
 * @param {Object} dico
 */
function assign_move(move, dico) {
    Assign(move, ...Keys(dico).filter(key => {
        let value = dico[key];
        if (value == '' || (key == 'ply' && value < -1))
            return false;
        return true;
    }).map(key => ({[key]: dico[key]})));
}

/**
 * Calculate the probability to draw or win
 * - works for AA and NN engines
 * @param {string} short_engine short engine name
 * @param {number} eval_
 * @param {number} ply
 * @returns {number} q %
 */
function calculate_feature_q(feature, eval_, ply) {
    let white_win;

    if (feature & 1) {
        let cp = eval_ * 100;
        if (feature & 2)
            white_win = leela_cp_to_score(cp);
        else if (feature & 4)
            white_win = allie_cp_to_score(cp);
        else if (feature & 8)
            white_win = stoof_cp_to_score(cp);
        else
            white_win = (Atan((eval_ * 100) / 290.680623072) / 3.096181612 + 0.5) * 2 - 1;

        // this is the HALF white win %
        white_win *= 50;
    }
    else if (ply >= 0) {
        let wdl = stockfish_wdl(eval_ * 100, ply);
        white_win = (wdl[0] - wdl[2]) / 20;
    }
    else
        white_win = (50 - (100 / (1 + Pow(10, eval_/ 4))));

    return white_win;
}

/**
 * Close all popups
 */
function close_popups() {
    show_popup();
    if (virtual_close_popups)
        virtual_close_popups('popup-fen', 'fen', {type: 'mouseleave'});

    // empty the content to prevent controls for still interacting with the popup (ex: SELECT)
    HTML(Id('modal'), '');
    Hide(Id('overlay'));
}

/**
 * Fix old move format from Season 1
 * @param {Move} move
 */
function fix_move_format(move) {
    if (move._fixed || move.book)
        return;

    // fix eval
    if (move.wv == undefined)
        move.wv = move.ev;

    // fix move time
    if (isNaN(move.mt) && move.mt)
        move.mt = parse_time(move.mt) * 1000;

    // fix time left
    if (isNaN(move.tl) && move.tl)
        move.tl = parse_time(move.tl) * 1000;

    // fix speed
    if (isNaN(move.s) && move.s) {
        let items = move.s.split(' ');
        if (items.length >= 2)
            move.s = parseFloat(items[0]) * ({k: 1000, M: 1e6}[items[1][0]] || 1);
    }

    // fix nodes
    // note: it's an approximation, not reliable at low values => skipped there
    if (move.n == undefined && move.mt >= 2000)
        move.n = Floor(move.s / move.mt * 1000 + 0.5);

    // fix too fast speed: > 10Bnps
    if (move.s > 1e10) {
        move.n = '-';
        move.s = '-';
    }
    else if (move.n) {
        // fix missing speed
        if (!move.s)
            move.s = (move.mt >= 2000)? Floor(move.n / move.mt * 1000): '-';
        // fix insta-moves speed
        else if (move.mt && move.mt < 2000) {
            let speed = move.n / (move.mt + 500) * 1000;
            if (move.s > speed * 3)
                move.s = '-';
        }
    }

    move._fixed = 1;
}

/**
 * Format the eval to make the 2 decimals smaller if the eval is high
 * @param {number} value
 * @param {boolean=} process can make decimals smaller
 * @returns {number}
 */
function format_eval(value, process) {
    let float = parseFloat(value);
    if (isNaN(float))
        return value;

    let small_decimal = Y.small_decimal,
        text = float.toFixed(2);

    if (!process || !small_decimal)
        return text;

    let items = text.split('.');

    if (small_decimal != 1) {
        let abs = Abs(float);
        if (abs < 10 && small_decimal == 10)
            return text;
        if (abs < 100 && small_decimal == 100)
            return text;
    }
    return `<i>${items[0]}.</i><i class="smaller">${items[1]}</i>`;
}

/**
 * Utility for FormatUnit
 * @param {number} number
 * @param {string=} def default value used when number is not a number
 * @param {boolean=} keep_decimal keep 1 decimal even if it's .0
 * @returns {string}
 */
function format_unit(number, def, keep_decimal) {
    return FormatUnit(number, def, keep_decimal, Y.SI_units);
}

/**
 * Get the ply from the FEN
 * @param {string} fen
 * @returns {number}
 */
function get_fen_ply(fen) {
    if (!fen)
        return -2;
    let items = fen.split(' '),
        ply = ((items[5] || 1) - 1) * 2 - (items[1] == 'w') * 1;
    return isNaN(ply)? -1: ply;
}

/**
 * Get the move ply, either directly or by looking at the FEN
 * - also update move.ply
 * @param {Move} move
 * @returns {number} ply -2 on error, -1 on the initial position, otherwise >= 0
 */
function get_move_ply(move) {
    if (!move)
        return -2;
    if (move.ply != undefined && move.ply >= -1)
        return move.ply;
    if (!move.fen)
        return -2;

    let ply = get_fen_ply(move.fen);
    if (ply >= -1) {
        move.ply = ply;
        return ply;
    }
    return -2;
}

/**
 * Convert centipawn to score % for Leela 2019+
 * @see https://github.com/LeelaChessZero/lc0/pull/1193/files
 * @param {number} cp
 * @returns {number}
 */
function leela_cp_to_score(cp) {
    return Atan(cp / 90) / 1.5637541897;
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
 * Get the seconds from a time text
 * @param {string} text
 * @returns {number}
 */
function parse_time(time) {
    if (!time)
        return 0;
    let [hour, min, sec] = time.split(':');
    return hour * 3600 + min * 60 + sec * 1;
}

/**
 * Reset default settings matching the pattern
 * @param {RegExp} pattern
 */
function reset_defaults(pattern) {
    Keys(DEFAULTS).forEach(key => {
        if (pattern.test(key))
            save_option(key, DEFAULTS[key]);
    });
}

/**
 * Reset some settings if the version is too old
 */
function reset_old_settings() {
    let version = Undefined(Y.version, '');
    if (version == VERSION) {
        save_option('version', VERSION);
        return;
    }

    let keys = [];
    if (version < '20200930')
        keys.push('game_wasm');
    if (version < '20201003b')
        keys.push('game_threads');
    if (version < '20210109') {
        Keys(DEFAULTS).filter(key => key.slice(0, 6) == 'sound_').map(key => {
            keys.push(key);
        });
        keys.push('boom_volume');
    }
    if (version < '20210109e')
        keys.push('boom_threshold');

    let changes = [];
    for (let key of keys)
        for (let item of key.split(' '))
            if (Y[item] != DEFAULTS[item]) {
                changes.push(item);
                save_default(item);
            }

    LS(`version: ${version} => ${VERSION} : ${changes}`);
    save_option('version', VERSION);
    Y.new_version = version;
}

/**
 * Split a PV string into ply + array of strings
 * - formula: (move - 1) * 2 = ply
 * @param {string} text
 * @param {boolean=} no_number remove the numbers
 * @param {number=} def_ply default ply
 * @returns {[number, string[]]}
 */
function split_move_string(text, no_number, def_ply) {
    if (!text)
        return [-2, []];

    let items = text.replace(/[.]{2,}/, ' ... ').split(' '),
        ply = (parseInt(items[0]) - 1) * 2 + (items[1] == '...'? 1: 0);

    if (no_number)
        items = items.filter(item => !IsDigit(item[0]) && item != '...');
    return [isNaN(ply)? def_ply: ply, items];
}

/**
 * Function from ply and centipawns to vector of outcome ‰ for Stockfish
 * @see https://github.com/official-stockfish/Stockfish/pull/2778
 * @param {number} cp
 * @param {number} ply
 * @returns {number[]} w,d,l
 */
function stockfish_wdl(cp, ply) {
    let win = stockfish_win_rate_model(cp, ply),
        loss = stockfish_win_rate_model(-cp, ply),
        draw = Max(0, 1000 - win - loss);

    return [win, draw, loss];
}

/**
 * Function from ply and centipawns to win percentage for Stockfish
 * Serves as a helper function for sf_wdl_statistics.
 * A near 1:1 port of Joost VandeVondele's Stockfish WDL statistics
 * @see https://github.com/official-stockfish/Stockfish/pull/2778
 * @param {number} cp
 * @param {number} ply
 * @returns {number}
 */
function stockfish_win_rate_model(cp, ply) {
    let as = SF_COEFF_AS,
        bs = SF_COEFF_BS,
        m = Min(240, ply) / 64,
        a = (((as[0] * m + as[1]) * m + as[2]) * m) + as[3],
        b = (((bs[0] * m + bs[1]) * m + bs[2]) * m) + bs[3],
        v = cp * SF_PAWN_VALUE,
        x = Clamp(v / SF_PAWN_VALUE, -1000, 1000);

    return Floor(0.5 + 1000 / (1 + Exp((a - x) / b)));
}

/**
 * Convert centipawn to score % for Stoofvlees II
 * @param {number} cp
 * @returns {number}
 */
function stoof_cp_to_score(cp) {
    return Atan(cp / 194) / 1.55564;
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// <<
if (typeof exports != 'undefined') {
    Assign(exports, {
        allie_cp_to_score: allie_cp_to_score,
        assign_move: assign_move,
        calculate_feature_q: calculate_feature_q,
        fix_move_format: fix_move_format,
        format_eval: format_eval,
        format_unit: format_unit,
        get_fen_ply: get_fen_ply,
        get_move_ply: get_move_ply,
        leela_cp_to_score: leela_cp_to_score,
        mix_hex_colors: mix_hex_colors,
        reset_defaults: reset_defaults,
        reset_old_settings: reset_old_settings,
        split_move_string: split_move_string,
        stockfish_wdl: stockfish_wdl,
        stockfish_win_rate_model: stockfish_win_rate_model,
        stoof_cp_to_score: stoof_cp_to_score,
        VERSION: VERSION,
        xboards: xboards,
    });
}
// >>
