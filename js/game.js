// game.js
// @author octopoulo <polluxyz@gmail.com>
// @version 2020-05-11
//
// Game specific code:
// - control the board, moves
// - create the tables
// - handle live updates
// - update stats
//
// included after: common, engine, global, 3d, xboard
/*
globals
_, A, Abs, add_timeout, Assign, Attrs, audiobox,
C, camera_look, camera_pos, cannot_click, Ceil, change_setting, CHART_NAMES, check_hash, Clamp, Class, clear_timeout,
controls, CopyClipboard, create_page_array, CreateNode, cube:true, DEFAULTS, DEV, device, document, ENGINE_COLORS,
Events, Exp, fill_combo, Floor, FormatUnit, FromSeconds, FromTimestamp, get_object, HasClass, Hide, HOST_ARCHIVE,
HTML, Id, Input, InsertNodes, invert_eval, Keys, KEYS,
listen_log, load_model, location, Lower, LS, Max, merge_settings, Min, Now, ON_OFF, Pad, Parent, play_sound, Pow,
push_state, QueryString, reset_charts, resize_3d, Resource, resume_game, Round,
S, save_option, save_storage, scene, ScrollDocument, set_3d_events, set_camera_control, set_camera_id, SetDefault,
Show, show_menu, show_modal, Sign, Split, SPRITE_OFFSETS, start_3d, STATE_KEYS, Style, TEXT, TIMEOUTS, Title, Toggle,
touch_handle, translate, translate_node, Undefined, update_live_chart, update_player_charts, update_svg, Upper,
virtual_init_3d_special:true, virtual_random_position:true, Visible, window, X_SETTINGS, XBoard, Y
*/
'use strict';

let ARROW_COLORS = ['#007bff', '#f08080'],
    BOARD_THEMES = {
        blue: ['#e0e0e0', '#87a6bc'],
        brown: ['#eaded0', '#927b6d'],
        chess24: ['#9e7863', '#633526'],
        custom: [],
        dark: ['#797877', '#585655'],
        dilena: ['#ffe5b6', '#b16228'],
        green: ['#f0e9db', '#7b9d86'],
        leipzig: ['#ffffff', '#e1e1e1'],
        metro: ['#ffffff', '#efefef'],
        red: ['#eaded0', '#b17278'],
        symbol: ['#ffffff', '#58ac8a'],
        uscf: ['#c3c6be', '#727fa2'],
        wikipedia: ['#ffce9e', '#d18b47'],
    },
    board_target,
    // vis: selector of the element to check visibility against, indicating that the board is visible or not
    BOARDS = {
        archive: {
            last: '*',
            main: true,
            vis: 'archive',
        },
        live: {
            count: 'end',
            last: '*',
            main: true,
            vis: 'live',
        },
        live0: {
            dual: 'live1',
            live_id: 0,
            pv_id: '#table-live0 .live-pv',
            tab: 'live',
            vis: 'table-kibitz',
        },
        live1: {
            dual: 'live0',
            live_id: 1,
            pv_id: '#table-live1 .live-pv',
            tab: 'live',
            vis: 'table-kibitz',
        },
        pv0: {
            dual: 'pv1',
            pv_id: '#player0 .live-pv',
            tab: 'pv',
            vis: 'table-pv',
        },
        pv1: {
            dual: 'pv0',
            pv_id: '#player1 .live-pv',
            tab: 'pv',
            vis: 'table-pv',
        },
        pva: {
            manual: true,
            size: 36,
            tab: 'pva',
            vis: 'table-pva',
        },
        three: {
            id: '#canvas',
            mode: '3d',
        },
        xfen: {
            hook: null,
            size: 24,
        }
    },
    CACHE_TIMEOUTS = {
        brak: 60,
        crash: 600,
        cross: 60,
        sched: 240,
        season: 1200,
        tour: 60,
        winner: 3600 * 24,
    },
    DEFAULT_ACTIVES = {
        archive: 'season',
        live: 'stand',
    },
    ENGINE_FEATURES = {
        AllieStein: 1,                  // & 1 => NN engine
        LCZero: 3,                      // & 2 => Leela variations
    },
    event_stats = {
        archive: {},
        live: {},
    },
    game_link,                          // current game link in the archive
    LIVE_TABLES = Split('#table-live0 #table-live1 #player0 #player1'),
    PAGINATION_PARENTS = ['quick', 'table'],
    PAGINATIONS = {
        h2h: 10,
        sched: 10,
    },
    pgns = {
        archive: {},
        live: {},
    },
    PIECE_SIZES = {
        _: 80,
        metro: 160,
    },
    // defaults: {ext: png, off: [0, 0], size: 80}
    PIECE_THEMES = {
        alpha: {},
        chess24: {},
        dilena: {
            off: [0, -15],
        },
        leipzig: {
            off: [5, 5],
        },
        metro: {
            off: [0, -4],
            size: 160,
        },
        symbol: {},
        uscf: {},
        wikipedia: {},
    },
    players = [{}, {}],                 // current 2 players
    queued_tables = new Set(),          // tables that cannot be created yet because of missing info
    QUEUES = ['h2h', 'stats'],
    RESULTS = {
        '0-1': -1,
        '1-0': 1,
        '1/2-1/2': 0.5,
    },
    ROUND_NAMES = {
        1: 'Final',
        2: 'SemiFinal',
        4: 'QuarterFinal',
    },
    SCORE_NAMES = {
        0: 'loss',
        0.5: 'draw',
        1: 'win',
        '=': 'draw',
    },
    table_data = {
        archive: {},
        live: {},
    },
    TABLES = {
        crash: 'gameno={Game}#|White|Black|Reason|decision=Final decision|action=Action taken|Result|Log',
        cross: 'Rank|Engine|Points',
        event: 'Round|Winner|Points|runner=Runner-up|# {Games}|Score',
        h2h: '{Game}#|White|white_ev=W.ev|black_ev=B.Ev|Black|Result|Moves|Duration|Opening|Termination|ECO|Final FEN',
        sched: '{Game}#|White|white_ev=W.ev|black_ev=B.ev|Black|Result|Moves|Duration|Opening|Termination|ECO|Final FEN|Start',
        season: 'Season|Download',
        stand: 'Rank|Engine|Games|Points|Crashes|{Wins} [W/B]|{Loss} [W/B]|SB|Elo|{Diff} [{Live}]',
        view: 'TC|Adj Rule|50|Draw|Win|TB|Result|Round|Opening|ECO|Event|Viewers',
        winner: 'name=S#|winner=Champion|runner=Runner-up|Score|Date',
    },
    TIMEOUT_queue = 100,                // check the queue after updating a table
    TIMEOUT_search = 100,               // filtering the table when input changes
    tour_info = {
        archive: {},
        live: {},
    },
    virtual_opened_table_special,
    xboards = {},
    WHITE_BLACK = ['white', 'black', 'live'],
    WB_TITLES = ['White', 'Black'];

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// HELPERS
//////////

/**
 * The function was posted by "ya" in the Leela Chess Zero Discord channel
 * https://discordapp.com/channels/425419482568196106/430695662108278784/618146099269730342
 * - made it more readable
 * @param {number} cp
 * @returns {number}
 */
function _leelaCpToQ(cp) {
    if (cp < 234.18)
        return 0.0033898305085 * cp
            - (8.76079436769e-38 * Pow(cp, 15)) / (3.618208073857e-34 * Pow(cp, 14) + 1.0)
            + (cp * (-3.4456396e-5 * cp + 0.007076010851)) / (cp * cp - 487.329812319 * cp + 59486.9337812);

    if (cp < 381.73)
        return (-17.03267913 * cp + 3342.55947265) / (cp * cp - 360.8419732 * cp + 32568.5395889)
            + 0.995103;

    return (35073.0 * cp) / (755200.0 + 35014.0 * cp)
        + ((0.4182050082072 * cp - 2942.6269998574) / (cp * cp - 128.710949474 * cp - 6632.9691544526)) * Exp(-Pow((cp - 400.0) / 7000.0, 3))
        - 5.727639074137869e-8;
}

/**
 * Convert eval to win %
 * @param {number} eval_
 * @returns {number}
 */
function _leelaEvalToWinPct(eval_) {
    let q = Sign(eval_) * _leelaCpToQ(Abs(eval_) * 100);
    return Round(100 * 100 * q) / 200;
}

/**
 * Calculate the probability to draw or win
 * - works for AA and NN engines
 * @param {string} short_engine short engine name
 * @param {number} eval_
 * @returns {string}
 */
function calculate_probability(short_engine, eval_)
{
    if (isNaN(eval_))
        return eval_;

    let white_win,
        feature = ENGINE_FEATURES[short_engine];

    // adjust the score
    if (feature & 1) {
        if (feature & 2)
            white_win = _leelaEvalToWinPct(eval_);
        else
            white_win = (Math.atan((eval_ * 100) / 290.680623072) / 3.096181612 + 0.5) * 100 - 50;
    }
    else
        white_win = (50 - (100 / (1 + Pow(10, eval_/ 4))));

    // final output
    let reverse = 0;
    if (eval_ < 0)
    {
        reverse = 1;
        white_win = -white_win;
    }
    let win = parseFloat(Max(0, white_win * 2)).toFixed(1),
        draw = parseFloat(100 - Max(win, 0)).toFixed(1);

    return !win? `${draw}% D`: `${win}% ${reverse? 'B': 'W'} | ${draw}% D`;
}

/**
 * Calculate White and Black points
 * @param {string} text
 * @returns {Object}
 */
function calculate_score(text) {
    let black = 0,
        white = 0;

    for (let i = 0, length = text.length; i < length; i ++) {
        let char = text[i];
        if (char == '0')
            black ++;
        else if (char == '1')
            white ++;
        else if (char == '=') {
            black += 0.5;
            white += 0.5;
        }
    }

    return {w: white, b: black};
}

/**
 * Create a link to a game
 * @param {string} section archive, live
 * @param {number} game
 * @param {string=} text if not set, then use game as the text
 * @param {boolean=} only_link returns the link directly, instead of the <a ... > HTML
 * @returns {string}
 */
function create_game_link(section, game, text, only_link) {
    let link = '#' + QueryString({query: `x=archive&${tour_info[section].link}&game=${game}`, string: true});
    if (only_link)
        return link;
    return `<a class="game" href="${link}">${text || game}</a>`;
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
        text = parseFloat(float).toFixed(2);

    if (!process || small_decimal == 'never')
        return text;

    let items = text.split('.');
    if (items.length < 2)
        return text;

    if (float < 10 && small_decimal != 'always')
        return text;
    if (float < 100 && small_decimal == '>= 100')
        return text;

    return `<i>${items[0]}.</i><i class="smaller">${items[1]}</i>`;
}

/**
 * Format seconds to hh:mm:ss + handle days
 * @param {number} seconds
 * @returns {string}
 */
function format_hhmmss(seconds) {
    let days = Floor(seconds / 86400);
    seconds = seconds % 86400;
    let text = FromSeconds(seconds).slice(0, -1).map(item => Pad(item)).join(':');
    if (days)
        text = `${days}d, ${text}`;
    return text;
}

/**
 * Format a value to %
 * @param {number} value
 * @returns {string}
 */
function format_percent(value) {
    return `${Round(value * 10000) / 100}%`;
}

/**
 * Get the active tab name
 * + translate shortcuts
 * @param {string} parent
 * @returns {[string, string, Node]} name, original, node
 */
function get_active_tab(parent) {
    let active = _(`#${parent}-tabs .active`);
    if (!active)
        return [];

    let name = active.dataset.x,
        translated = name;
    if (name.slice(0, 8) == 'shortcut')
        translated = Y[name];

    return [translated, name, active];
}

/**
 * Get the short name of an engine
 * @param {string} engine Stockfish 20200407DC
 * @returns {string} Stockfish
 */
function get_short_name(engine)
{
    if (!engine)
        return '';
    return engine.includes('Baron')? 'Baron': Split(engine)[0];
}

// BOARD
////////

/**
 * Set the target board and make all sub boards point to that board
 */
function assign_boards() {
    board_target = xboards[Y.x];

    Keys(xboards).forEach(key => {
        let board = BOARDS[key],
            xboard = xboards[key];

        xboard.real = board_target;
        if (board.dual)
            xboard.dual = xboards[board.dual];
    });
}

/**
 * Create 9 boards
 * - should be done at startup since we want to see the boards ASAP
 */
function create_boards() {
    // 1) create all boards
    let keys = Keys(BOARDS);

    keys.forEach(key => {
        let options = Assign({
                border: 2,
                hook: handle_board_events,
                id: `#${key}`,
                list: true,
                name: key,
                mode: 'html',
                size: 24,
            }, BOARDS[key]),
            xboard = new XBoard(options);

        xboard.initialise();
        // make sure not to render => false
        xboard.resize(options.size * 8 + options.border * 2, false);
        xboards[key] = xboard;
    });

    // 2) set pointers: real board + duals
    assign_boards();

    // 3) update themes: this will render the boards too
    update_board_theme(3);

    // 4) pva colors
    let lines = ENGINE_COLORS.map((color, id) => {
        return `<div class="color${id? '': ' active'}" data-id="${id < 2? 'pv': 'live'}${id % 2}" style="background:${color}"></div>`;
    });
    HTML('#colors', lines.join(''));

    C('.color', function() {
        let board = xboards[this.dataset.id];
        xboards.pva.set_fen(board.fen, true);
        Class('.color', '-active');
        Class(this, 'active');
    });
}

/**
 * Reset sub boards
 * @param {number} mode &1:mark board invalid, &2:reset the board completely
 */
function reset_sub_boards(mode) {
    Keys(xboards).forEach(key => {
        let board = xboards[key];
        if (!board.main) {
            if (mode & 1)
                board.valid = false;
            if (mode & 2)
                board.reset();
        }
    });
}
/**
 * Update the boards' theme
 * @param {number} mode update mode:
 * - &1: board
 * - &2: pv (all other boards)
 * - &4: just re-render all but don't update settings
 */
function update_board_theme(mode) {
    Keys(xboards).forEach(key => {
        // 1) skip?
        let board = xboards[key],
            is_main = board.main;
        if (is_main) {
            if (!(mode & 5))
                return;
        }
        else if (!(mode & 6))
            return;

        // 2) update board
        if (mode & 3) {
            let suffix = is_main? '': '_pv',
                board_theme = Y[`board_theme${suffix}`],
                colors = (board_theme == 'custom')? [Y[`custom_white${suffix}`], Y[`custom_black${suffix}`]]: BOARD_THEMES[board_theme],
                piece_theme = Y[`piece_theme${suffix}`],
                theme = Assign({ext: 'png', name: piece_theme, off: [0, 0], size: 80}, PIECE_THEMES[piece_theme]);

            Assign(board, {
                colors: colors,
                dirty: 3,
                high_color: Y[`highlight_color${suffix}`],
                high_size: Y[`highlight_size${suffix}`],
                notation: Y[`notation${suffix}`]? 6: 0,
                smooth: Y[`animate${suffix}`],
                theme: theme,
            });
        }

        board.hold_smooth();
        board.render(7);
    });

    update_engine_pieces();
}

/**
 * Update engine pieces using the main board theme
 */
function update_engine_pieces() {
    let [piece_size, style] = xboards.live.get_piece_background(20);

    for (let i = 0; i < 2; i ++) {
        let node = Id(`king${i}`),
            offset = -SPRITE_OFFSETS[['K', 'k'][i]] * piece_size;
        Style('div', `${style};background-position-x:${offset}px`, true, node);
        Style(node, `transform:scale(${20 / piece_size})`);
    }
}

// TABLES
/////////

/**
 * Analyse the crosstable data
 * - create table-stand + table-cross
 * @param {string} section archive, live
 * @param {Object} data
 */
function analyse_crosstable(section, data) {
    if (!data)
        return;
    SetDefault(table_data, section, {}).crossx = data;

    let cross_rows = [],
        dicos = data.Table,
        orders = data.Order,
        abbrevs = orders.map(name => dicos[name].Abbreviation),
        stand_rows = [];

    // 1) analyse all data => create rows for both tables
    for (let name of orders) {
        let dico = dicos[name],
            elo = dico.Rating,
            new_elo = Round(elo + (dico.Elo || 0)),
            results = dico.Results;

        // cross
        let cross_row = {
            abbrev: Lower(dico.Abbreviation),
            engine: name,
            points: dico.Score,
            rank: dico.Rank,
        };
        abbrevs.forEach((abbrev, id) => {
            let games = results[orders[id]];
            if (games) {
                cross_row[abbrev] = games.Scores.map(game => {
                    let score = game.Result;
                    return ` <a data-g="${game.Game}" class="${SCORE_NAMES[score]}">${(score > 0 && score < 1)? '½': score}</a>`;
                }).join('').slice(1);
            }
        });
        cross_rows.push(cross_row);

        // stand
        let loss_b = Undefined(dico.LossAsBlack, dico.LossesAsBlack),
            loss_w = Undefined(dico.LossAsWhite, dico.LossesAsWhite);

        stand_rows.push({
            crashes: dico.Strikes,
            diff: `${new_elo - elo} [${new_elo}]`,
            elo: elo,
            engine: name,
            games: dico.Games,
            loss: `${loss_w + loss_b} [${loss_w}/${loss_b}]`,
            points: dico.Score,
            rank: dico.Rank,
            sb: dico.Neustadtl,
            wins: `${dico.WinsAsWhite + dico.WinsAsBlack} [${dico.WinsAsWhite}/${dico.WinsAsBlack}]`,
        });
    }

    update_table(section, 'stand', stand_rows);

    // 2) table-cross: might need to update the columns too
    let node = Id('table-cross'),
        new_columns = [...Split(TABLES.cross), ...abbrevs],
        scolumns = Array.from(A('th', node)).map(node => node.textContent).join('|'),
        snew_columns = new_columns.join('|');

    if (scolumns != snew_columns && Y.x == section) {
        // make the extra columns the same size
        let extras = new_columns.slice(3),
            width = `${Floor(71 / (extras.length + 0.001))}%`,
            widths = [...['4%', '18%', '7%'], ...extras.map(() => width)],
            head = create_table_columns(new_columns, widths);
        HTML('thead', head, node);
        translate_node(node);
    }

    update_table(section, 'cross', cross_rows);
}

/**
 * Calculate H2H
 * - filter the rows
 * - calculate the scores
 * @param {Object[]} rows
 * @returns {Object[]} filtered rows
 */
function calculate_h2h(rows) {
    let names = {[players[0].name]: 1, [players[1].name]: 1},
        new_rows = rows.filter(row => names[row.white] && names[row.black]);

    // calculate h2h scores
    for (let row of new_rows) {
        let result = RESULTS[row.result];
        if (result) {
            if (result == 1)
                names[row.white] += 1;
            else if (result == -1)
                names[row.black] += 1;
            else {
                names[row.black] += 0.5;
                names[row.white] += 0.5;
            }
        }
    }

    // update players + UI info
    for (let player of players)
        player.score = (names[player.name] - 1).toFixed(1);
    update_scores();

    return new_rows;
}

/**
 * Change the page from quick/table
 * @param {string} parent quick, table
 * @param {string} value +1, -1, 0, 1, 2, ...
 */
function change_page(parent, value) {
    let [active, output] = get_active_tab(parent);
    if (DEV.ui)
        LS(`change_page: ${parent} : ${value} ~ ${active}`);

    let page,
        page_key = `page_${parent}`,
        section = Y.x,
        data_x = SetDefault(table_data[section], active, {data: []}),
        num_row = data_x[`rows_${parent}`],
        num_page = Ceil(num_row / Y.rows_per_page);

    if ('+-'.includes(value[0]))
        page = (data_x[page_key] || 0) + parseInt(value);
    else
        page = value * 1;

    if (page < 0)
        page += num_page;
    else if (page >= num_page)
        page -= num_page;

    // refresh the table
    data_x[page_key] = page;
    update_table(section, active, null, parent, {output: output});
}

/**
 * Create pagination if required
 * @returns {number} number of pages (negative if virtual)
 */
function check_pagination(parent) {
    // check if the active tab can be paginated
    let [name] = get_active_tab(parent);
    if (!PAGINATIONS[name])
        return 0;

    if (DEV.ui)
        LS(`check_pagination: ${parent}/${name}`);

    // check if there's enough data
    let section = Y.x,
        data_x = table_data[section][name];
    if (!data_x)
        return 0;

    let num_row = data_x[`rows_${parent}`] || 0,
        num_page = Ceil(num_row / Y.rows_per_page),
        page = Clamp(data_x[`page_${parent}`], 0, num_page - 1),
        total = data_x.data.length;

    if (num_page < 2)
        return -Ceil(total / Y.rows_per_page);

    // many rows => enable pagination
    // - only create the HTML if it doesn't already exist
    let node = Id(`${parent}-pagin`),
        pages = A('.page', node);

    if (pages.length != num_page + 2) {
        let lines = ['<a class="page page-prev" data-p="-1">&lt;</a>'];
        if (parent != 'quick') {
            let array = create_page_array(num_page, page, 2);
            for (let id = 0; id < num_page; id ++) {
                if (array[id] == 2)
                    lines.push(`<a class="page${page == id? ' active': ''}" data-p="${id}">${id + 1}</a>`);
                else if (array[id])
                    lines.push('<a class="page2">...</a>');
            }
        }

        lines.push('<a class="page page-next" data-p="+1">&gt;</a>');
        HTML('.pages', lines.join(''), node);
        HTML('.row-filter', num_row, node);
        HTML('.row-total', total, node);
    }

    return num_page;
}

/**
 * Check pagination for the currently active tables
 */
function check_paginations() {
    for (let parent of PAGINATION_PARENTS) {
        let num_page = check_pagination(parent);
        S(`#${parent}-pagin`, num_page > 1);
        S(`#${parent}-search`, Abs(num_page) > 1);
    }
}

/**
 * Check if some queued tables can be created
 */
function check_queued_tables() {
    clear_timeout('queue');
    let removes = [];

    for (let queued of queued_tables) {
        if (DEV.ui)
            LS(`queued: ${queued}`);

        let [section, parent, table] = queued.split('/');
        if (!QUEUES.includes(table))
            continue;

        let data_x = table_data[section].sched;
        if (!data_x)
            continue;

        let data = data_x.data;
        if (table == 'h2h') {
            let new_rows = calculate_h2h(data);
            update_table(section, table, new_rows, parent);
            check_paginations();
        }
        else
            calculate_event_stats(section, data);
        removes.push(queued);
    }

    for (let remove of removes)
        queued_tables.delete(remove);
}

/**
 * Create a field for a table value
 * @param {string} text
 * @returns {string[]} field, value
 */
function create_field_value(text) {
    let items = text.split('=');
    if (items.length > 1)
        return [items[0], items.slice(1).join('=')];

    // startTime => start_time
    let lower = Lower(text.replace(/([a-z])([A-Z])/g, (_match, p1, p2) => `${p1}_${p2}`)),
        pos = lower.indexOf(' [');
    if (pos > 0)
        lower = lower.slice(0, pos);

    return [lower.replace(/[{}]/g, '').replace(/[_() ./#-]+/g, '_').replace(/^_+|_+$/, ''), text];
}

/**
 * Create a Live table
 * - we don't want to recreate the table each time, that's why this creation will give a boost
 * @param {Node|string} node node or selector
 * @param {boolean} is_live live => has more info
 */
function create_live_table(node, is_live) {
    let html =
        '<vert class="live fastart">'
            + '<div class="live-basic">'
                + '<i class="engine" data-x="name"></i> <i data-x="eval"></i> <i class="live-score">[<i data-x="score"></i>]</i>'
            + '</div>';

    if (is_live)
        html +=
            '<div class="live-more">'
                + '[D: <i data-x="depth"></i> | TB: <i data-x="tb"></i> | Sp: <i data-x="speed"></i> | N: <i data-x="node"></i>]'
            + '</div>';

    html +=
            '<horis class="live-pv"></horis>'
        + '</vert>';
    HTML(node, html);
}

/**
 * Create a table
 * @param {string[]} columns
 * @param {boolean=} add_empty add an empty row (good for table-view)
 * @returns {string}
 */
function create_table(columns, add_empty) {
    let lines = [
        '<table><thead>',
            create_table_columns(columns),
        '</thead><tbody>',
            (add_empty? columns.map(column => `<td data-x="${create_field_value(column)[0]}">&nbsp;</td>`).join(''): ''),
        '</tbody></table>',
    ];
    return lines.join('');
}

/**
 * Create <th> columns to be used in a table
 * - used by create_table
 * - used when generating the dynamic Crosstable
 * @param {string[]} columns
 * @param {number[]=} widths optional width for each column
 * @returns {string}
 */
function create_table_columns(columns, widths) {
    return columns.map((column, id) => {
        let [field, value] = create_field_value(column),
            style = widths? ` style="width:${widths[id]}"`: '';
        return `<th${style} ${id? '': 'class="rounded" '}data-x="${field}" data-t="${value}"></th>`;
    }).join('');
}

/**
 * Create all the tables
 */
function create_tables() {
    // 1) normal tables
    Keys(TABLES).forEach(name => {
        let table = TABLES[name],
            html = create_table(Split(table), name == 'view');
        HTML(`#table-${name}`, html);
    });
    translate_node('body');

    // 2) live tables
    for (let node of LIVE_TABLES)
        create_live_table(node, node.includes('live'));

    // 3) mouse/touch scroll
    Events('.scroller', '!touchstart touchmove touchend', () => {});
    Events('.scroller', 'mousedown mouseenter mouseleave mousemove mouseup touchstart touchmove touchend', e => {
        touch_handle(e);
    }, {passive: false});
}

/**
 * Download live data when the graph is ready
 */
function download_live() {
    let section = 'live';
    if (section != Y.x)
        return;

    // evals
    download_table(section, `data.json?no-cache${Now()}`, null, data => {
        update_live_eval(section, data, 0);
    });
    download_table(section, `data1.json?no-cache${Now()}`, null, data => {
        update_live_eval(section, data, 1);
    });

    // live engines
    download_table(section, 'liveeval.json', null, data => {
        update_live_eval(section, data, 0);
    });
    download_table(section, 'liveeval1.json', null, data => {
        update_live_eval(section, data, 1);
    });
}

/**
 * Download static JSON for a table
 * + cache support = can load the data from localStorage if it was recent
 * @param {string} section archive, live
 * @param {string} url url
 * @param {string=} name table name
 * @param {function=} callback
 * @param {boolean=} add_delta calculate time delta, and add it to the data
 * @param {boolean=} no_cache force to skip the cache
 * @param {boolean=} only_cache only load data if it's cached
 * @param {boolean=} show open the table after wards
 */
function download_table(section, url, name, callback, {add_delta, no_cache, only_cache, show}={}) {
    function _done(data, cached) {
        if (DEV.json) {
            LS(`${url}:`);
            LS(data);
        }

        // if cached and table was already filled => skip
        let skip;
        if (cached) {
            let nodes = A(`#table-${name} tr`);
            skip = (nodes.length > 1);
        }

        // fill the table
        if (!skip) {
            if (callback)
                callback(data);
            else if (name) {
                update_table(section, name, data);
                if (show && section == Y.x)
                    open_table(name);
            }
        }
    }

    let key,
        timeout = CACHE_TIMEOUTS[name];

    if (!no_cache && timeout) {
        // save cache separately for Live and Archive
        key = `table_${name}_${section}`;
        let cache = get_object(key);
        if (cache && (only_cache || Now() < cache.time + timeout)) {
            if (DEV.json)
                LS(`cache found: ${key} : ${Now() - cache.time} < ${timeout}`);
            _done(cache.data, true);
            return;
        }
        else if (DEV.json)
            LS(`no cache: ${key}`);
    }

    if (only_cache)
        return;

    // get the data
    Resource(url, (code, data, xhr) => {
        if (code != 200)
            return;

        let now = Now(true);
        if (data && add_delta) {
            let last_mod = new Date(xhr.getResponseHeader('last-modified'));
            data.delta = now - last_mod.getTime();
        }

        if (key) {
            save_storage(key, {data: data, time: Floor(now)});
            if (DEV.json)
                LS(`cache saved: ${key}`);
        }
        _done(data, false);
    });
}

/**
 * Download static JSON files at startup
 * @param {boolean=} only_cache
 */
function download_tables(only_cache) {
    if (!only_cache)
        download_gamelist();

    let section = 'live';
    // if (section != Y.x)
    //     return;

    if (!only_cache) {
        download_pgn(section, 'live.json');
        download_live();
    }

    let dico = {only_cache: only_cache};
    download_table(section, 'crosstable.json', 'cross', data => {
        analyse_crosstable(section, data);
    }, dico);
    download_table(section, 'schedule.json', 'sched', null, dico);
    download_table(section, 'tournament.json', 'tour', data => {
        analyse_tournament(section, data);
    }, dico);
}

/**
 * Filter table rows based on text matching
 * - only works if the table is active + paginated
 * @param {string} parent
 * @param {string} text
 */
function filter_table_rows(parent, text) {
    let [active, output] = get_active_tab(parent),
        section = Y.x,
        data_x = table_data[section][active];

    if (data_x) {
        data_x[`filter_${parent}`] = text;
        update_table(section, active, null, parent, {output: output});
    }
}

/**
 * Show tables depending on the event type
 * @param {string} type
 */
function show_tables(type) {
    let is_cup = (type == 'cup'),
        parent = Id('tables'),
        target = is_cup? 'brak': 'stand';
    S('[data-x="brak"], [data-x="event"]', is_cup, parent);
    S('[data-x="cross"], [data-x="h2h"], [data-x="stand"]', !is_cup, parent);

    Class('div.tab', '-active', true, parent);
    Class(`[data-x="${target}"]`, 'active', true, parent);
    Hide('div.scroller', parent);
    Show(`#table-${target}`);
}

/**
 * Update a table by adding rows
 * - handles all the tables
 * @param {string} section archive, live
 * @param {string} name h2h, sched, stand, ...
 * @param {Object[]} rows if null then uses the cached table_data
 * @param {string=} parent chart, engine, quick, table
 * @param {string=} output output the result to another name
 * @param {boolean=} reset clear the table before adding data to it (so far always the case)
 */
function update_table(section, name, rows, parent='table', {output, reset=true}={}) {
    // 1) resolve shortcut
    let is_shortcut,
        source = name;
    if (name.slice(0, 8) == 'shortcut') {
        name = Y[name];
        is_shortcut = true;
    }

    // 2) update table data
    let data_x = SetDefault(table_data[section], name, {data: []}),
        data = data_x.data,
        is_sched = (name == 'sched'),
        page_key = `page_${parent}`,
        table = Id(`table-${output || source}`),
        body = _('tbody', table);

    // reset or append?
    // - except if rows is null
    if (reset) {
        HTML(body, '');
        if (rows) {
            data.length = 0;
            for (let pagin of PAGINATION_PARENTS) {
                data_x[`page_${pagin}`] = -1;
                data_x[`rows_${pagin}`] = -1;
            }
        }
    }

    if (rows) {
        if (!Array.isArray(rows))
            return;

        // translate row keys + calculate _id and _text
        rows.forEach((row, row_id) => {
            let lines = [];
            row = Assign({_id: row_id}, ...Keys(row).map(key => {
                let value = row[key];
                if (value)
                    lines.push(value + '');
                return {[create_field_value(key)[0]]: value};
            }));
            row._text = Lower(lines.join(' '));
            data.push(row);
        });

        // special case
        if (is_sched)
            calculate_estimates(section, data);
    }

    // 3) handle pagination + filtering
    let paginated,
        active_row = -1;

    if (PAGINATIONS[name]) {
        let [active] = get_active_tab(parent),
            page = data_x[page_key],
            row_page = Y.rows_per_page,
            total = data.length;

        if (active == name) {
            let filter = data_x[`filter_${parent}`];
            if (filter) {
                let words = Lower(filter).split(' ');
                data = data.filter(item => words.every(word => item._text.includes(word)));
            }

            let node = Id(`${parent}-pagin`),
                num_row = data.length,
                num_page = Ceil(num_row / row_page);

            // find the active row + update initial page
            if (section == 'archive')
                active_row = Y.game - 1;
            else
                for (let row of data) {
                    if (!row.moves) {
                        active_row = row._id;
                        break;
                    }
                }

            if (active_row >= 0)
                data_x.row = active_row;
            if (page < 0)
                page = (active_row >= 0)? Floor(active_row / row_page): 0;
            page = Min(page, num_page - 1);

            HTML('.row-filter', num_row, node);
            HTML('.row-total', total, node);
            Class('.active', '-active', true, node);
            Class(`[data-p="${page}"]`, 'active', true, node);

            data_x[`rows_${parent}`] = num_row;
        }

        let start = page * row_page;
        data = data.slice(start, start + row_page);
        paginated = true;
        data_x[page_key] = page;
    }

    // 4) process all rows => render the HTML
    let columns = Array.from(A('th', table)).map(node => node.dataset.x),
        is_cross = (name == 'cross'),
        is_game = (name == 'game'),
        is_winner = (name == 'winner'),
        nodes = [];

    for (let row of data) {
        let row_id = row._id;

        let vector = columns.map(key => {
            let class_ = '',
                td_class = '',
                value = row[key];

            if (value == undefined) {
                if (is_cross) {
                    if (row.abbrev == key)
                        td_class = 'void';
                    value = '';
                }
                else
                    value = '-';
            }

            // special cases
            switch (key) {
            case 'black':
                if (row.result == '0-1')
                    class_ = 'win';
                else if (row.result == '1-0')
                    class_ = 'loss';
                break;
            case 'download':
            case 'pgn':
                value = `<a href="${HOST_ARCHIVE}/${value}"><i data-svg="download"></i></a>`;
                break;
            case 'engine':
            case 'runner':
            case 'winner':
                if (!is_winner) {
                    td_class = 'tal';
                    value = `<hori><img class="left-image" src="image/engine/${get_short_name(value)}.jpg"><div>${value}</div></hori>`;
                }
                break;
            case 'final_fen':
                td_class = 'fen';
                break;
            case 'game':
                value = row_id + 1;
                if (row.moves)
                    value = create_game_link(section, value);
                break;
            case 'name':
                if (row.link) {
                    let query = QueryString({query: row.link.split('?').slice(-1)[0], replace: {x: 'archive'}, string: true});
                    value = `<a class="loss" href="#${query}">${value}</a>`;
                }
                break;
            case 'score':
                if (is_winner)
                    value = value.replace(/-/g, '<br>- ').replace('Abandonded', '-');
                else {
                    let numbers = Split(row.gamesno || '', ',');
                    value = value.split('').map((item, id) => {
                        return ` <a class="${SCORE_NAMES[item]}" title="${numbers[id] || 0}">${item.replace('=', '½')}</a>`;
                    }).join('');
                }
                break;
            case 'season':
                td_class = 'mono';
                let items = value.split(' '),
                    name = (items.length > 1)? `{${items[0]}} ${items[1]}`: value,
                    lines = [`<a class="season"><i data-t="${name}"></i> <i data-svg="down"></i></a>`];
                if (row.sub) {
                    lines.push('<grid class="dn">');
                    let subs = row.sub.sort((a, b) => (b.dno + '').localeCompare(a.dno + ''));
                    for (let sub of subs)
                        lines.push(
                            `<a class="sub" data-u="${sub.url}">${sub.menu}</a>`
                            + `<a href="${HOST_ARCHIVE}/${sub.abb}.pgn.zip"><i data-svg="download"></i></a>`
                        );
                    lines.push('</grid>');
                }
                value = lines.join('');
                break;
            case 'white':
                if (row.result == '1-0')
                    class_ = 'win';
                else if (row.result == '0-1')
                    class_ = 'loss';
                break;
            default:
                if (typeof(value) == 'string') {
                    if (is_cross && !td_class & key.length == 2)
                        td_class = 'mono';
                    else if (value.slice(0, 4) == 'http')
                        value = `<a href="${value}" class="url">${value}</a>`;
                }
            }

            if (class_)
                value = `<i class="${class_}">${value}</i>`;
            if (td_class)
                td_class = ` class="${td_class}"`;

            return `<td${td_class}>${value}</td>`;
        });

        // create a new row node
        let dico = null;
        if (is_game || is_sched || name == 'h2h')
            dico = {
                class: `pointer${row_id == active_row? ' active': ''}`,
                'data-g': row_id + 1,
            };

        let node = CreateNode('tr', vector.join(''), dico);
        nodes.push(node);
    }

    InsertNodes(body, nodes);
    update_svg(table);
    translate_node(table);

    // 5) add events
    if (name == 'season')
        set_season_events();

    // open game
    C('[data-g]', function() {
        if (cannot_click())
            return;

        if (this.tagName == 'TR') {
            Class('tr.active', '-active', true, table);
            Class(this, 'active');
        }
        let game = this.dataset.g * 1;
        if (section == 'archive') {
            save_option('game', game);
            open_game();
        }
        else
            location.hash = create_game_link(section, game, '', true);
    }, table);

    // fen preview
    Events('td.fen', 'click mouseenter mousemove mouseleave', function(e) {
        if (e.type == 'click')
            CopyClipboard(TEXT(this));
        popup_custom('popup-fen', 'fen', e);
    });

    // 6) update shortcuts
    if (parent != 'quick') {
        let html = HTML(table);
        for (let id = 1; id <= 2 ; id ++) {
            // shortcut matches this table?
            let key = `shortcut_${id}`;
            if (name != Y[key])
                continue;

            let node = Id(`table-${key}`);
            if (paginated && data_x.page_quick >= 0)
                update_table(section, name, null, 'quick', {output: key});
            else {
                HTML(node, html);
                data_x.page_quick = data_x[page_key];
            }
        }
    }

    // 7) create another table?
    if (!is_shortcut && is_sched) {
        for (let queue of QUEUES)
            queued_tables.add(`${section}/${parent}/${queue}`);
        if (players[0].name)
            add_timeout('queue', check_queued_tables, TIMEOUT_queue);
    }
}

// ARCHIVE
//////////

/**
 * Handle the seasons file
 * @param {Object} data
 */
function analyse_seasons(data) {
    let seasons = (data || {}).Seasons,
        section = 'archive';
    if (!seasons)
        return;

    let rows = Keys(seasons).reverse().map(key => Assign({season: isNaN(key)? key: `Season ${key}`}, seasons[key]));
    update_table(section, 'season', rows);

    let link = `season=${Y.season}&div=${Y.div}`,
        node = _(`[data-u="${link}"]`);
    if (node) {
        let parent = Parent(node, 'grid');
        if (parent) {
            Class(node, 'active');
            Class(node.nextElementSibling, 'active');
            expand_season(parent.previousElementSibling, true);
            tour_info[section].link = link;
            open_event();
        }
    }
}

/**
 * Download the game list, necessary for the archive and for the game links in Live
 */
function download_gamelist() {
    download_table('archive', 'gamelist.json', 'season', analyse_seasons);
}

/**
 * Expand / collapse a season
 * @param {Node} node
 * @param {boolean=} show if not defined, then toggle
 */
function expand_season(node, show) {
    let next = node.nextElementSibling;
    if (show == undefined)
        Toggle(next);
    else
        S(next, show);
    Style('svg.down', `transform:${Visible(next)? 'rotate(-90deg)': 'none'}`, true, node);
}

/**
 * Open an event
 * - show the event games
 * - open various tables
 */
function open_event() {
    let section = 'archive',
        data_x = table_data[section].season;
    if (!data_x)
        return;

    let found,
        data = data_x.data,
        info = tour_info[section],
        link = `season=${Y.season}&div=${Y.div}`;

    Keys(data).forEach(key => {
        let subs = data[key].sub;
        Keys(subs).forEach(sub_key => {
            let sub = subs[sub_key];
            if (sub.url == link) {
                found = sub.abb;
                info.cup = data[key].cup;
                return;
            }
        });
        if (found)
            return;
    });

    Assign(info, {
        link: link,
        url: found,
    });
    if (!found)
        return;

    let dico = {no_cache: true},
        prefix = `${HOST_ARCHIVE}/${found}`;

    download_table(section, `${prefix}_crash.xjson`, 'crash', null, dico);
    download_table(section, `${prefix}_Crosstable.cjson`, 'cross', data => {
        analyse_crosstable(section, data);
    }, dico);
    download_table(section, `${prefix}_Enginerating.egjson`, null, null, dico);
    download_table(section, `${prefix}_Schedule.sjson`, 'sched', null, Assign({show: true}, dico));

    open_game();
}

/**
 * Open an archived game
 */
function open_game() {
    let info = tour_info.archive,
        event = info.url;
    if (!event)
        return;

    if (Y.season && Y.div && Y.game) {
        push_state();
        check_hash();
    }
    download_pgn('archive', `${HOST_ARCHIVE}/${event}_${Y.game}.pgjson`);
}

/**
 * Set table-season events
 */
function set_season_events() {
    let table = Id('table-season');

    // expand/collapse
    C('.season', function() {
        if (cannot_click())
            return;
        expand_season(this);
    }, table);

    // open games
    C('a[data-u]', function() {
        if (cannot_click())
            return;

        // 'season=18&div=l3'
        let dico = QueryString({query: this.dataset.u});
        Keys(dico).forEach(key => {
            save_option(key, dico[key]);
        });
        save_option('game', 1);

        open_event();
        Class('a.active', '-active', true, table);
        Class(this, 'active');
        Class(this.nextElementSibling, 'active');
    }, table);
}

// BRACKETS / TOURNAMENT
////////////////////////

/**
 * Handle tournament data
 * @param {string} section archive, live
 * @param {Object} data
 */
function analyse_tournament(section, data) {
    Assign(tour_info[section], data);
    if (tour_info[section].cup)
        download_table(section, 'bracket.json', 'brak', data => {
            create_cup(section, data);
        });
}

/**
 * Calculate the seeds
 * - assume the final will be 1-2 then work backwards
 * - support non power of 2 => 0 will be the 'skip' seed
 * @param {number} num_team
 * @returns {number[]}
 */
function calculate_seeds(num_team) {
    let number = 2,
        nexts = [1, 2];

    while (number < num_team) {
        number *= 2;
        let seeds = [];
        for (let i = 0; i < number; i ++) {
            let value = (i % 2)? (number + 1 - seeds[i - 1]): nexts[Floor(i / 2)];
            seeds[i] = (value <= num_team)? value: 0;
        }
        nexts = seeds;
    }

    return nexts;
}

/**
 * Calculate tournament stats
 * - called after sched data is available, so, from queued tables
 * - called after calculate_estimates
 * @param {string} section archive, live
 * @param {Object[]=} rows
 */
function calculate_event_stats(section, rows) {
    if (!rows) {
        let data_x = table_data[section].sched;
        if (!data_x)
            return;
        rows = data_x.data;
    }

    let crashes = 0,
        end = '',
        games = 0,
        max_moves = [-1, 0],
        max_time = [-1, 0],
        min_moves = [Infinity, 0],
        min_time = [Infinity, 0],
        moves = 0,
        results = {
            '0-1': 0,
            '1-0': 0,
            '1/2-1/2': 0,
        },
        seconds = 0,
        start = rows.length? rows[0].start: '';

    for (let row of rows) {
        let game = row._id + 1,
            move = row.moves,
            time = row.duration;
        if (!move)
            continue;

        // 01:04:50 => seconds
        let [hour, min, sec] = time.split(':');
        time = hour * 3600 + min * 60 + sec * 1;

        games ++;
        moves += move;
        results[row.result] = (results[row.result] || 0) + 1;
        seconds += time;

        if (max_moves[0] < move)
            max_moves = [move, game];
        if (min_moves[0] > move)
            min_moves = [move, game];

        if (max_time[0] < time)
            max_time = [time, game];
        if (min_time[0] > time)
            min_time = [time, game];

        end = row.start;
    }

    let stats = event_stats[section],
        [date, time] = FromTimestamp(stats._end);

    Assign(stats, {
        start_time: start,
        end_time: `${time} on 20${date.replace(/-/g, '.')}`,
        duration: format_hhmmss(stats._duration),
        avg_moves: Round(moves / games),
        avg_time: format_hhmmss(seconds / games),
        white_wins: `${results['1-0']} [${format_percent(results['1-0'] / games)}]`,
        black_wins: `${results['0-1']} [${format_percent(results['0-1'] / games)}]`,
        draw_rate: format_percent(results['1/2-1/2'] / games),
        crashes: crashes,
        games: games,
        min_moves: `${min_moves[0]} [${create_game_link(section, min_moves[1])}]`,
        max_moves: `${max_moves[0]} [${create_game_link(section, max_moves[1])}]`,
        min_time: `${format_hhmmss(min_time[0])} [${create_game_link(section, min_time[1])}]`,
        max_time: `${format_hhmmss(max_time[0])} [${create_game_link(section, max_time[1])}]`,
    });

    // create the table
    let lines = Keys(stats)
        .filter(key => (key[0] != '_'))
        .map(key => {
            let title = Title(key.replace(/_/g, ' '));
            return `<vert class="stats faround"><div class="stats-title" data-t="${title}"></div><div>${stats[key]}</div></vert>`;
        });

    let node = Id('table-stats');
    HTML(node, lines.join(''));
    translate_node(node);
}

/**
 * Calculate the estimated times
 * - called when new schedule data is available
 * @param {string} section
 * @param {Object[]} rows
 */
function calculate_estimates(section, rows) {
    let end = '',
        games = 0,
        seconds = 0;

    for (let row of rows) {
        let start = row.start,
            time = row.duration;
        if (!start)
            continue;

        if (time) {
            // 01:04:50 => seconds
            let [hour, min, sec] = time.split(':');
            time = hour * 3600 + min * 60 + sec * 1;
            games ++;
            seconds += time;
        }
        end = start;
    }

    // 18:18:54 on 2020.05.06
    // => '2020.05.06 18:18:54': can be parsed by javascript correctly
    let items = end.split(' on '),
        last = Date.parse(`${items[1]} ${items[0]}`) / 1000,
        average = seconds / games,
        offset = average;

    // set the estimates
    // TODO: handle timezone (not needed if times are UTC ...)
    for (let row of rows) {
        if (row.start)
            continue;

        let [date, time] = FromTimestamp(last + offset);
        row.start = `Estd: ${time} on 20${date.replace(/-/g, '.')}`;
        offset += average;
    }

    // update some stats
    items = rows[0].start.split(' on ');
    let start = Date.parse(`${items[1]} ${items[0]}`) / 1000;

    Assign(event_stats[section], {
        _duration: last + offset - start,
        _end: last + offset,
        _start: start,
    });
}

/**
 * Create the brackets
 * @param {string} section archive, live
 * @param {Object} data
 */
function create_bracket(section, data) {
    if (section != Y.x)
        return;

    // 1)
    window.event = data;
    let game = 1,
        lines = ['<hori class="fastart noselect">'],
        teams = data.teams,
        num_team = teams.length,
        number = num_team,
        round_results = data.results[0] || [],
        round = 0,
        seeds = calculate_seeds(num_team * 2);

    // assign seeds
    teams.forEach((team, id) => {
        team[0].seed = seeds[id * 2];
        team[1].seed = seeds[id * 2 + 1];
    });

    // 2) create each round
    while (number >= 1) {
        let name = ROUND_NAMES[number] || `Round of ${number * 2}`,
            nexts = [],
            number2 = (number == 1)? 2: number,
            results = round_results[round] || [];

        lines.push(
            '<vert class="rounds fstart h100">'
            + `<div class="round" data-t="${name}"></div>`
            + `<vert class="${number == 1? 'fcenter final': 'faround'} h100">`
        );
        for (let i = 0; i < number2; i ++) {
            let names = [0, 0],
                result = results[i] || [],
                scores = [0, 0],
                team = teams[i];

            if (team)
                team.forEach((item, id) => {
                    let class_ = '',
                        short = get_short_name(item.name);

                    if (result[0] != result[1])
                        class_ = (item.winner && result[id] > result[1 - id])? ' win': ' loss';

                    names[id] = [
                        class_,
                        `<hori title="${item.name}"><img class="match-logo" src="image/engine/${short}.jpg"><div>#${item.seed} ${short}</div></hori>`,
                    ];
                    scores[id] = [
                        class_,
                        result[id],
                    ];

                    // propagate the winner to the next round
                    if (class_ == ' win')
                        SetDefault(nexts, Floor(i / 2), [{}, {}])[i % 2] = item;
                    // match for 3rd place
                    else if (class_ == ' loss' && number == 2)
                        SetDefault(nexts, 1, [{}, {}])[i % 2] = item;
                });

            lines.push(
                '<vert class="match fastart">'
                    // final has 3rd place game too
                    + `<div class="match-title">#${game + (number == 1? 1 - i * 2: 0)}</div>`
                    + '<grid class="match-grid">'
            );

            for (let id = 0; id < 2; id ++) {
                let [name_class, name] = names[id] || [],
                    [score_class, score] = scores[id] || [];

                if (!name) {
                    name = 'TBD';
                    score = '--';
                    name_class = ' none';
                    score_class = ' none';
                }
                else
                    name_class += ' fastart';

                lines.push(
                    `<vert class="name${name_class} fcenter">${name}</vert>`
                    + `<vert class="score${score_class} fcenter">${score}</vert>`
                );
            }

            lines.push(
                    '</grid>'
                + '</vert>'
            );
            game ++;
        }
        lines.push(
                '</vert>'
            + '</vert>'
        );

        number /= 2;
        round ++;
        teams = nexts;
    }

    // 3) result
    lines.push('</hori>');
    let node = Id('table-brak');
    HTML(node, lines.join(''));
    translate_node(node);

    // necessary to correctly size each round
    Style(node.firstChild, `height:${node.clientHeight}px`);
}

/**
 * Create a cup
 * @param {string} section archive, live
 * @param {Object} data
 */
function create_cup(section, data) {
    show_tables('cup');

    let event = data.EventTable;
    if (event) {
        let rows = Keys(event).map(key => {
            return Assign({round: key.split(' ').slice(-1)}, event[key]);
        });
        update_table(section, 'event', rows);
    }

    create_bracket(data);
}

// PGN
//////

/**
 * Check the adjudication
 * @param {Object} dico
 * @param {number} total_moves
 * @returns {Object} 50, draw, win
 */
function check_adjudication(dico, total_moves) {
    if (!dico)
        return {};
    let _50 = dico.FiftyMoves,
        abs_draw = Abs(dico.Draw),
        abs_win = Abs(dico.ResignOrWin);

    return {
        50: (_50 < 51)? _50: '-',
        draw: (abs_draw <= 10 && total_moves > 58)? `${Max(abs_draw, 69 - total_moves)}p`: '-',
        win: (abs_win < 11)? abs_win: '-',
    };
}

/**
 * Download live evals for the current even + a given round
 * @param {number} round
 */
function download_live_evals(round) {
    if (!round)
        return;

    let section = 'archive',
        event = tour_info[section].url;
    if (!event)
        return;

    let prefix = `${HOST_ARCHIVE}/${Lower(event)}_liveeval`;
    download_table(section, `${prefix}_${round}.json`, null, data => {
        update_live_eval(section, data, 0);
    });
    download_table(section, `${prefix}1_${round}.json`, null, data => {
        update_live_eval(section, data, 1);
    });
}

/**
 * Download the PGN
 * @param {string} section archive, live
 * @param {string} url
 */
function download_pgn(section, url) {
    Resource(`${url}?no-cache${Now()}`, (code, data, xhr) => {
        if (code != 200)
            return;

        if (data) {
            let last_mod = new Date(xhr.getResponseHeader('last-modified'));
            data.elapsed = Now(true) - last_mod.getTime() / 1000;
            data.gameChanged = 1;

            // FUTURE: use ?? operator
            if (section == 'archive' && data.Headers)
                download_live_evals(data.Headers.Round);
        }

        pgns[section] = null;
        update_pgn(section, data);

        if (section == 'archive')
            ScrollDocument('#table-view');
    });
}

/**
 * Resize game elements
 */
function resize_game() {
    // resize the boards
    for (let [parent, key] of [['left', 'archive'], ['left', 'live']]) {
        let width = Id(parent).clientWidth,
            board = xboards[key];
        if (board) {
            board.hold_smooth();
            board.resize(width);
        }
    }

    resize_3d();
}

/**
 * Update material info
 * @param {Move} move
 */
function update_materials(move) {
    let material = move.material,
        materials = [[], []];
    if (!material)
        return;

    let size = 28,
        [piece_size, style] = xboards.live.get_piece_background(size),
        scale = size / piece_size;

    'qrbnp'.split('').forEach(key => {
        let value = material[key];
        if (value) {
            let id = (value > 0)? 0: 1;
            for (let i = 0; i < Abs(value); i ++) {
                let offset = -SPRITE_OFFSETS[id? key: Upper(key)] * piece_size;
                materials[id].push(
                    `<div style="height:${size}px;width:${size}px;transform:scale(${scale})">`
                        + `<div style="${style};background-position-x:${offset}px"></div>`
                    + '</div>'
                );
            }
        }
    });

    for (let id = 0; id < 2; id ++) {
        let node = Id(`material${id}`),
            html = HTML(node),
            material = materials[id].join('');
        if (html != material)
            HTML(node, material);
    }
}

/**
 * Update engine info from a move
 * @param {number} ply
 * @param {Move} move
 * @param {boolean=} fresh is it the latest move?
 */
function update_move_info(ply, move, fresh) {
    let is_book = move.book,
        eval_ = is_book? 'book': move.wv,
        id = ply % 2,
        num_ply = xboards[Y.x].moves.length,
        stats = {
            depth: is_book? '-': `${Undefined(move.d, '-')}/${Undefined(move.sd, '-')}`,
            eval: format_eval(eval_, true),
            node: is_book? '-': FormatUnit(move.n, '-'),
            speed: is_book? '-': `${FormatUnit(move.s, '0')}nps`,
            tb: is_book? '-': FormatUnit(move.tb, '-'),
        };

    Keys(stats).forEach(key => {
        HTML(`#${key}${id}`, stats[key]);
    });

    if (fresh || Y.x == 'archive')
        Assign(players[id], {
            elapsed: 0,
            eval: eval_,
            left: move.tl * 1,
            time: move.mt * 1,
        });

    // past move?
    if (ply < num_ply - 1)
        update_clock(id, move);
    else {
        update_clock(0);
        update_clock(1);
    }
}

/**
 * Update PV info from a player move
 * - move contains pv.Moves with fen info for each move, so we can use this
 * @param {string} section archive, live
 * @param {number} ply
 * @param {Move} move
 */
function update_move_pv(section, ply, move) {
    if (!move)
        return;

    let is_book = move.book,
        eval_ = is_book? 'book': move.wv,
        id = ply % 2,
        board = xboards[`pv${id}`],
        main = xboards[section],
        node = Id(`player${id}`);

    HTML(`[data-x="eval"]`, is_book? '': format_eval(move.wv), node);
    HTML(`[data-x="score"]`, is_book? 'book': calculate_probability(players[id].short, eval_), node);

    // PV should jump directly to a new position, no transition
    board.reset();
    board.hold_smooth();

    if (move.pv)
        board.add_moves(move.pv.Moves, ply, main.ply + 1);
    else {
        // no pv available =>
        // - delete it if the move is in the past (ex: "book")
        // - keep it if this is the latest move, as we don't want to see PV disappearing
        // TODO: try to readjust the existing PV to match the current move
        if (ply < main.moves.length - 1) {
            board.moves[ply] = move;
            board.set_ply(ply);
        }
    }
}

/**
 * Update basic overview info, before adding the moves
 * @param {string} section
 * @param {Object} headers
 */
function update_overview_basic(section, headers) {
    if (!headers)
        return;
    if (section != Y.x)
        return;

    let overview = Id('table-view');

    // 1) overview
    Split('ECO|Event|Opening|Result|Round|TimeControl').forEach(key => {
        let value = Undefined(headers[key], '');

        // TCEC Season 17 => S17
        if (key == 'Event')
            value = value.replace('TCEC Season ', 'S');
        else if (key == 'TimeControl') {
            let items = value.split('+');
            key = 'tc';
            value = `${items[0]/60}'+${items[1]}"`;
            players[0].tc = items[0] * 1;
            players[1].tc = items[0] * 1;
        }
        HTML(`td[data-x="${Lower(key)}"]`, value, overview);
    });

    // 2) engines
    WB_TITLES.forEach((title, id) => {
        let name = headers[title],
            node = Id(`player${id}`),
            player = players[id],
            short = get_short_name(name),
            src = `image/engine/${short}.jpg`;

        Assign(player, {
            elo: headers[`${title}Elo`],
            name: name,
            short: short,
        });

        HTML(`#engine${id}`, name);
        HTML(`[data-x="name"]`, short, node);

        let image = Id(`logo${id}`);
        if (image.src != src) {
            image.setAttribute('alt', name);
            image.src = src;
        }
    });
    update_scores();

    // 3) title
    let subtitle = (section == 'live')? 'Live Computer Chess Broadcast': 'Archived Game';
    document.title = `${players[0].name} vs ${players[1].name} - TCEC - ${subtitle}`;
}

/**
 * Update overview info, after adding the moves
 * @param {string} section
 * @param {Object} headers
 * @param {Move[]} moves
 * @param {number} start moves offset
 * @param {boolean=} is_new have we received new moves (from update_pgn)?
 */
function update_overview_moves(section, headers, moves, start, is_new) {
    if (!headers)
        return;

    let finished,
        overview = Id('table-view'),
        is_live = (section == 'live'),
        main = xboards[section],
        num_move = moves.length,
        num_ply = main.moves.length,
        move = moves[num_move - 1];

    // 1) clock
    // num_ply % 2 tells us who plays next
    if (is_live) {
        let who = num_ply % 2;
        start_clock(who, finished);

        // time control could be different for white and black
        let tc = headers[`${WB_TITLES[who]}TimeControl`];
        if (tc) {
            let items = tc.split('+');
            HTML(`td[data-x="tc"]`, `${items[0]/60}'+${items[1]}"`, overview);
            players[who].tc = items[0] * 1;
        }
    }

    if (section != Y.x)
        return;

    // 2) update the current chart only (except if graph_all is ON)
    update_player_charts(null, moves, start);
    if (is_live && is_new && Y.move_sound)
        play_sound(audiobox, 'move', {ext: 'mp3', interrupt: true});

    // 3) check adjudication
    let tb = Lower(move.fen.split(' ')[0]).split('').filter(item => 'bnprqk'.includes(item)).length - 6;
    if (tb <= 1)
        tb = `<a href="https://syzygy-tables.info/?fen=${move.fen.replace(/ /g, '_')}" target="_blank">${tb}</a>`;
    HTML('td[data-x="tb"]', tb, overview);

    let result = check_adjudication(move.adjudication, num_ply);
    finished = headers.TerminationDetails;
    result.adj_rule = finished;
    Keys(result).forEach(key => {
        HTML(`td[data-x="${key}"]`, result[key], overview);
    });

    S('[data-x="adj_rule"]', finished, overview);
    S('[data-x="50"], [data-x="draw"], [data-x="win"]', !finished, overview);
    if (finished) {
        let result = headers.Result;
        if (is_live && is_new && Y.crowd_sound)
            play_sound(audiobox, (result == '1/2-1/2')? 'draw': 'win');
        if (DEV.new)
            LS(`finished: result=${result} : is_live=${is_live} : is_new=${is_new}`);
        main.set_last(result);
    }
    else
        main.set_last(main.last);

    // 4) materials
    for (let i = num_move - 1; i>=0 && i >= num_move - 2; i --) {
        let move = moves[i];
        update_move_info(start + i, move, true);
        update_move_pv(section, start + i, move);
    }
    update_materials(move);
}

/**
 * Update the PGN
 * - white played => lastMoveLoaded=109
 * @param {string} section archive, live
 * @param {Object} pgn
 */
function update_pgn(section, pgn) {
    if (!xboards[section])
        return;

    // 1) section check
    pgns[section] = pgn;
    window.pgns = pgns;

    let headers = pgn.Headers,
        is_same = (section == Y.x),
        moves = pgn.Moves,
        new_game = pgn.gameChanged,
        num_move = moves.length,
        overview = Id('table-view'),
        start = pgn.lastMoveLoaded || 0;

    // 2) update overview
    if (pgn.Users)
        HTML('td[data-x="viewers"]', pgn.Users, overview);
    if (is_same)
        update_overview_basic(section, headers);

    // TODO: what's the utility of this?
    if (new_game) {
        if (DEV.new)
            LS(`new pgn: ${headers.Round}`);
        pgn.gameChanged = 0;
    }

    // 3) check for a new game
    // TODO: bug at this point
    let main = xboards[section],
        num_ply = main.moves.length;

    if (main.round != headers.Round) {
        if (DEV.new) {
            LS(`new game: ${main.round} => ${headers.Round} : num_ply=${num_ply} : num_move=${num_move}`);
            LS(pgn);
        }
        main.reset();
        if (is_same) {
            reset_sub_boards(3);
            reset_charts();
        }
        main.round = headers.Round;
        new_game = true;
    }

    if (!num_move)
        return;

    // 4) add the moves
    main.add_moves(moves, start);
    if (is_same)
        update_overview_moves(section, headers, moves, start, true, true);

    // got player info => can do h2h
    check_queued_tables();

    if (new_game)
        for (let player of players)
            Assign(player, {
                elapsed: 0,
                left: player.tc,
            });
}

/**
 * Update players' score in the UI
 */
function update_scores() {
    players.forEach((player, id) => {
        HTML(`#score${id}`, `${Undefined(player.score, '-')} (${Undefined(player.elo, '-')})`);
    });
}

// LIVE ACTION / DATA
/////////////////////

/**
 * Clock countdown
 * @param {number} id
 */
function clock_tick(id) {
    let now = Now(true),
        player = players[id],
        elapsed = (now - player.start) * 1000,
        left = player.left - elapsed,
        // try to synchronise it with the left time
        timeout = Floor(left) % 1000 - 1;

    if (isNaN(timeout))
        return;

    if (timeout < 50)
        timeout += 100;

    player.elapsed = elapsed;
    update_clock(id);
    add_timeout(`clock${id}`, () => {clock_tick(id, now);}, timeout);
}

/**
 * Set the number of viewers
 * @param {number} count
 */
function set_viewers(count) {
    HTML('#table-view td[data-x="viewers"]', count);
}

/**
 * Start the clock for one player, and stop it for the other
 * @param {number} id
 * @param {boolean=} finished if true, then both clocks are stopped
 */
function start_clock(id, finished) {
    if (Y.x != 'live')
        return;

    S(`#cog${id}`, !finished);
    Hide(`#cog${1 - id}`);

    stop_clock([0, 1]);

    if (!finished) {
        Assign(players[id], {
            elapsed: 0.000001,
            start: Now(true),
        });
        clock_tick(id);
    }
}

/**
 * Stop the clock(s)
 * @param {number[]} ids
 */
function stop_clock(ids) {
    for (let id of ids)
        clear_timeout(`clock${id}`);
}

/**
 * Update data from one of the Live engines
 * - data contains a PV string, but no FEN info => this fen will be computed only when needed
 * @param {string} section archive, live
 * @param {Object} data
 * @param {number} id 0, 1
 * @param {boolean=} force update with this data.pv even if there's more recent text + forces invert_black
 */
function update_live_eval(section, data, id, force) {
    if (section != Y.x || !data)
        return;

    let board = xboards[`live${id}`],
        main = xboards[section],
        moves = data.moves;
    // moves => maybe old data?
    if (moves) {
        if (data.round != main.round) {
            LS(`maybe old data => SKIP: ${data.round} vs ${main.round}`);
            return;
        }
        // ply seems be offset by 1
        for (let move of moves)
            board.evals[move.ply - 1] = move;
        data = moves[moves.length - 1];
    }

    let cur_ply = main.ply,
        eval_ = data.eval,
        short = get_short_name(data.engine),
        node = Id(`table-live${id}`);

    // live engine is not desired?
    if (!Y[`live_engine_${id + 1}`]) {
        HTML('.live-pv', `<i>${translate('off')}</i>`, node);
        return;
    }

    if (short)
        HTML(`[data-x="name"]`, short, node);

    // invert eval for black?
    if ((moves || force) && data.ply % 2 == 0)
        eval_ = invert_eval(eval_);

    let dico = {
        depth: data.depth,
        eval: format_eval(eval_),
        node: FormatUnit(data.nodes),
        score: calculate_probability(short, eval_),
        speed: data.speed,
        tb: FormatUnit(data.tbhits),
    };
    Keys(dico).forEach(key => {
        HTML(`[data-x="${key}"]`, Undefined(dico[key], '-'), node);
    });

    if (force)
        board.text = '';
    board.add_moves_string(data.pv, cur_ply, cur_ply + 1);

    // CHECK THIS
    if (DEV.eval) {
        LS(`live_eval${id} : eval=${eval_} : ply=${data.ply} :`);
        LS(data);
    }
    update_live_chart(moves || [data], id + 2, !!moves || force);
}

/**
 * Update data from a Player
 * - data contains a PV string, but no FEN info => this fen will be computed only when needed
 * @param {string} section archive, live
 * @param {Object} data
 */
function update_player_eval(section, data) {
    if (!Y.live_pv)
        return;
    if (section != Y.x)
        return;

    let eval_ = data.eval,
        id = data.color,
        // board = xboards[`pv${id}`],
        node = Id(`player${id}`),
        short = get_short_name(data.engine);

    // 1) update the live part on the left
    let dico = {
        eval: format_eval(eval_),
        name: short,
        score: calculate_probability(short, eval_),
    };
    Keys(dico).forEach(key => {
        HTML(`[data-x="${key}"]`, dico[key], node);
    });

    let board = xboards[`pv${id}`],
        num_ply = xboards[section].moves.length;
    board.add_moves_string(data.pv, num_ply - id, num_ply);

    // 2) update the engine info in the center
    let stats = {
        depth: data.depth,
        engine: data.engine,
        eval: format_eval(eval_, true),
        logo: short,
        node: FormatUnit(data.nodes),
        speed: data.speed,
        tb: FormatUnit(data.tbhits),
    };
    Keys(stats).forEach(key => {
        HTML(`#${key}${id}`, stats[key]);
    });

    if (!data.ply)
        data.ply = data.plynum;

    // CHECK THIS
    if (DEV.eval) {
        LS(`play_eval${id} : eval=${eval_} : ply=${data.ply}`);
        LS(data);
    }
    update_live_chart([data], id);
}

/**
 * Update the left + time UI info
 * @param {number} id
 * @param {Move} move move from the past
 */
function update_clock(id, move) {
    let elapsed, left, time,
        player = players[id];

    if (move) {
        elapsed = 0;
        left = move.tl;
        time = move.mt / 1000;
    }
    else {
        // looking at the past => don't update anything
        let board = xboards[Y.x];
        if (board && board.ply < board.moves.length - 1)
            return;

        elapsed = player.elapsed;
        left = player.left;
        time = Round((elapsed > 0? elapsed: player.time) / 1000);
    }

    left = isNaN(left)? '-': FromSeconds(Round((left - elapsed) / 1000)).slice(0, -1).map(item => Pad(item)).join(':');
    time = isNaN(time)? '-': FromSeconds(time).slice(1, -1).map(item => Pad(item)).join(':');

    HTML(`#left${id}`, left);
    HTML(`#time${id}`, time);
}

// INPUT / OUTPUT
/////////////////

/**
 * Handle keys, when input is not active
 * @param {number} code hardware keycode
 * @param {Object=} active active input element, if any
 */
function action_key_no_input(code, active) {
}

/**
 * Handle keys, when input is not active
 * @param {number} code hardware keycode
 */
function game_action_key(code) {
    if (Visible('#overlay')) {
        let changes = 0,
            parent = Visible('#modal')? Id('modal'): Id('modal2'),
            items = Array.from(A('.item', parent)).filter(item => Visible(item)),
            length = items.length,
            index = (items.findIndex(item => HasClass(item, 'selected')) + length) % length,
            node = items[index],
            tag = node.tagName,
            is_grid = HasClass(node.parentNode, 'grid');

        switch (code) {
        // escape, e
        // case 27:
        case 69:
            LS(`game_action_key: ${code}`);
            if (Visible('#modal2'))
                show_modal(true);
            else
                resume_game();
            break;
        // enter, space, x
        case 13:
        case 32:
        case 83:
            node.click();
            break;
        // left
        case 37:
            if (tag == 'DIV' && is_grid) {
                node = node.nextElementSibling;
                tag = node.tagName;
            }
            if (tag == 'SELECT') {
                node.selectedIndex = (node.selectedIndex - 1 + node.options.length) % node.options.length;
                changes ++;
            }
            else if (tag == 'INPUT') {
                let min = parseInt(node.min);
                if (isNaN(min) || node.value > min) {
                    node.value --;
                    changes ++;
                }
            }
            break;
        // up
        case 38:
            index = (index - 1 + length) % length;
            break;
        // right
        case 39:
            if (tag == 'DIV' && is_grid) {
                node = node.nextElementSibling;
                tag = node.tagName;
            }
            if (tag == 'SELECT') {
                node.selectedIndex = (node.selectedIndex + 1) % node.options.length;
                changes ++;
            }
            else if (tag == 'INPUT') {
                let max = parseInt(node.max);
                if (isNaN(max) || node.value < max) {
                    node.value ++;
                    changes ++;
                }
            }
            break;
        // down
        case 40:
            index = (index + 1) % length;
            break;
        }

        // changed a setting?
        if (changes && node.name)
            change_setting(node.name, node.value);

        // moved?
        Class('.selected', '-selected', true, parent);
        Class(items[index], 'selected');
    }
    else if (!KEYS[code]) {
        switch (code) {
        // left
        case 37:
            clear_timeout('click_play');
            board_target.hold = 'prev';
            board_target.hold_button('prev', 0);
            break;
        // right
        case 39:
            clear_timeout('click_play');
            board_target.hold = 'next';
            board_target.hold_button('next', 0);
            break;
        }
    }
}

/**
 * Handle a keyup
 * @param {number} code
 */
function game_action_keyup(code) {
    switch (code) {
    // left
    case 37:
        clear_timeout('click_prev');
        break;
    // right
    case 39:
        clear_timeout('click_next');
        break;
    }
}

// 3D SCENE
///////////

/**
 * Initialise the 3D engine
 */
function init_3d_special() {
    load_model('pieces', 'export/pieces-draco.glb', object => {
        cube = object;
        scene.add(cube);
    });
}

/**
 * Random position for looking at the chessboard
 */
function random_position() {
    return {x: -1.34, y: -1.98, z: 0.97};
}

// EVENTS
/////////

/**
 * Hash was changed => check if we should load a game
 */
function changed_hash() {
    let keys = ['season', 'div', 'game'],
        missing = 0,
        string = keys.map(key => {
            let value = Y[key];
            if (value == undefined)
                missing ++;
            return `${key}=${value}`;
        }).join('&');

    if (missing || game_link == string)
        return;

    // new game link detected => try to load it
    if (DEV.load)
        LS(`changed_hash: ${game_link} => ${string} : ${missing}`);
    game_link = string;
    open_event();
}

/**
 * The section was changed archive <-> live
 */
function changed_section() {
    let section = Y.x;
    assign_boards();

    // click on the active tab, ex: schedule, stats
    // - if doesn't exist, then active the default tab
    let active = get_active_tab('table')[2];
    if (active && Visible(active))
        open_table(active);
    else
        open_table(DEFAULT_ACTIVES[section]);

    // update PGN
    let pgn = pgns[section],
        headers = pgn.Headers,
        main = xboards[section];
    if (!main)
        return;

    // reset some stuff
    reset_sub_boards(3);
    reset_charts();

    // update overview
    update_overview_basic(section, headers);
    update_overview_moves(section, headers, xboards[section].moves, 0);
}

/**
 * Handle xboard events
 * @param {XBoard} board
 * @param {string} type
 * @param {Event|string} value
 */
function handle_board_events(board, type, value) {
    let section = Y.x;

    switch (type) {
    case 'activate':
        board_target = board;
        break;
    // controls: play, next, ...
    case 'control':
        board_target = board;
        if (value == 'cube') {
            board.mode = (board.mode == 'html')? 'text': 'html';
            board.render(3);
        }
        break;
    // move list => ply selected
    case 'move':
        board_target = board;
        if (value != undefined && !Visible(board.vis))
            open_table(board.tab);
        break;
    // PV list was updated => next move is sent
    // - if move is null, then hide the arrow
    case 'next':
        let id = board.live_id;
        if (id != undefined) {
            if (DEV.ply) {
                LS(`next: ${id}`);
                LS(value);
            }
            xboards[section].arrow(id, value, ARROW_COLORS[id]);
        }
        break;
    // ply was set
    case 'ply':
        if (board.name == section) {
            // update main board stats
            let cur_ply = board.ply;
            update_move_info(cur_ply, value);

            // show PV's
            // - important to reset the boards to prevent wrong compare_duals
            reset_sub_boards(1);
            update_move_pv(section, cur_ply - 1, board.moves[cur_ply - 1]);
            update_move_pv(section, cur_ply, value);

            // show live engines
            update_live_eval(section, xboards.live0.evals[cur_ply], 0, true);
            update_live_eval(section, xboards.live1.evals[cur_ply], 1, true);

            update_materials(value);
        }
        break;
    }
}

/**
 * Select a tab and open the corresponding table
 * @param {string|Node} sel tab name or node
 * @param {boolean=} hide_table hide the corresponding table (but PV is shared!)
 */
function open_table(sel, hide_table=true) {
    if (typeof(sel) == 'string')
        sel = _(`.tab[data-x="${sel}"]`);
    if (!sel)
        return;

    let parent = Parent(sel, 'horis', 'tabs'),
        active = _('.active', parent),
        key = sel.dataset.x,
        node = Id(`table-${key}`);

    if (active) {
        Class(active, '-active');
        // only hide if the table has the same parent
        if (hide_table)
            Hide(`#table-${active.dataset.x}`);
    }
    Class(sel, 'active');
    Show(node);

    opened_table(node, key, sel);
}

/**
 * Special handling after user clicked on a tab
 * @param {Node} node table node
 * @param {string} name
 * @param {Node} tab
 */
function opened_table(node, name, tab) {
    // 1) save the tab
    let parent = Parent(tab).id,
        is_chart = (parent == 'chart-tabs'),
        section = Y.x;
    if (DEV.ui)
        LS(`opened_table: ${parent}/${name}`);

    Y.tabs[parent] = name;
    save_option('tabs', Y.tabs);

    // 2) special cases
    if (is_chart && CHART_NAMES[name] && xboards[section])
        update_player_charts(name, xboards[section].moves, 0);

    switch (name) {
    case 'crash':
        download_table(section, 'crash.json', name);
        break;
    case 'cross':
        analyse_crosstable(section, table_data[section].crossx);
        break;
    case 'info':
        HTML(node, HTML('#desc'));
        break;
    case 'log':
        fill_combo('#log', X_SETTINGS.live.live_log[0]);
        listen_log();
        break;
    // change order + switch to default tab
    case 'pv':
        Style('#table-pv', `order:${is_chart? 3: 1}`);
        if (is_chart)
            open_table('engine', false);
        else {
            let [active] = get_active_tab('chart');
            if (active == 'pv')
                open_table('eval', false);
        }
        break;
    case 'pva':
        let board = board_target;
        if (!['pv0', 'pv1', 'live0', 'live1'].includes(board.name))
            board = xboards.pv0;
        Class('.color', '-active');
        Class(`.color[data-id="${board.name}"]`, 'active');
        xboards.pva.set_fen(board.fen, true);
        break;
    case 'season':
        download_gamelist();
        break;
    case 'stats':
        calculate_event_stats(section);
        break;
    case 'winner':
        download_table(section, 'winners.json', name);
        break;
    default:
        update_table(section, name);
    }

    check_paginations();

    if (virtual_opened_table_special)
        virtual_opened_table_special(node, name, tab);
}

/**
 * Show a popup with the engine info
 * @param {string} id popup id
 * @param {string} name timeout name
 * @param {Event} e
 * @param {string} scolor white, black
 */
function popup_custom(id, name, e, scolor) {
    let show,
        popup = Id(id),
        type = e.type;

    if (type == 'mouseleave')
        show = false;
    else if (scolor == 'popup')
        show = true;
    else {
        if (name == 'engine') {
            let pgn = pgns[Y.x],
                headers = pgn.Headers;
            if (!headers)
                return;

            let title = Title(scolor),
                engine = Split(headers[title]),
                options = pgn[`${title}EngineOptions`],
                lines = options.map(option => [option.Name, option.Value]);

            // add engine + version
            lines.splice(0, 0, ['Engine', engine[0]], ['Version', engine.slice(1).join(' ')]);
            lines = lines.flat().map(item => `<div>${item}</div>`);

            HTML(popup, `<grid class="grid2">${lines.join('')}</grid>`);
        }
        else if (name == 'fen') {
            let fen = TEXT(e.target);
            xboards.xfen.hold_smooth();
            if (!xboards.xfen.set_fen(fen, true))
                return;
        }

        // place the popup in a visible area on the screen
        let x = e.clientX + 10,
            y = e.clientY + 10,
            x2 = 0,
            y2 = 0;
        if (x >= window.innerWidth / 2) {
            x -= 20;
            x2 = -100;
        }
        if (y >= window.innerHeight / 2) {
            y -= 20;
            y2 = -100;
        }

        Style(popup, `transform:translate(${x}px,${y}px) translate(${x2}%, ${y2}%)`);
        show = true;
    }

    Class(popup, 'popup-show', show);
    // trick to be able to put the mouse on the popup and copy text
    if (show) {
        clear_timeout(`popup-${name}`);
        Class(popup, 'popup-enable');
        Show(popup);
    }
    else
        add_timeout(`popup-${name}`, () => {Class(popup, '-popup-enable');}, 500);
}

/**
 * Game events
 */
function set_game_events() {
    set_3d_events();

    // engine popup
    Events('#info0, #info1, #popup', 'click mouseenter mousemove mouseleave', function(e) {
        popup_custom('popup', 'engine', e, WHITE_BLACK[this.id.slice(-1)] || this.id);
    });

    // tabs
    C('div.tab', function() {
        open_table(this);
    });
    // search
    Input('input.search', function() {
        add_timeout('search', () => {
            let parent = this.parentNode.id.split('-')[0];
            filter_table_rows(parent, this.value);
        }, TIMEOUT_search);
    });

    C('#log', function() {
        save_option('live_log', this.value);
        listen_log();
    });
}

// STARTUP
//////////

/**
 * Call this after the structures have been initialised
 */
function start_game() {
    create_tables();
    create_boards();
    show_tables('league');
}

/**
 * Initialise structures with game specific data
 */
function startup_game() {
    //
    Assign(DEFAULTS, {
        div: '',
        game: 0,
        order: 'left|center|right',         // main panes order
        season: '',
        stream: 0,
        tabs: {},                           // opened tabs
        three: 0,                           // 3d scene
        twitch_chat: 1,
        twitch_dark: 0,
        twitch_video: device.mobile? 0: 1,
        x: 'live',
    });
    Assign(STATE_KEYS, {
        archive: ['x', 'season', 'div', 'game'],
        live: ['x'],
    });

    merge_settings({
        // separator
        _1: {},
        board: {
            animate: [ON_OFF, 1],
            arrow_opacity: [{max: 1, min: 0, step: 0.01, type: 'number'}, 0.7],
            arrow_width: [{max: 5, min: 0, step: 0.01, type: 'number'}, 1.7],
            board_theme: [Keys(BOARD_THEMES), 'chess24'],
            custom_black: [{type: 'color'}, '#000000'],
            custom_white: [{type: 'color'}, '#ffffff'],
            highlight_color: [{type: 'color'}, '#ffff00'],
            // 1100 looks good too
            highlight_delay: [{max: 1500, min: -100, step: 100, type: 'number'}, 0],
            highlight_size: [{max: 0.4, min: 0, step: 0.001, type: 'number'}, 0.055],
            notation: [ON_OFF, 1],
            piece_theme: [Keys(PIECE_THEMES), 'chess24'],
        },
        board_pv: {
            animate_pv: [ON_OFF, 1],
            board_theme_pv: [Keys(BOARD_THEMES), 'uscf'],
            custom_black_pv: [{type: 'color'}, '#000000'],
            custom_white_pv: [{type: 'color'}, '#ffffff'],
            highlight_color_pv: [{type: 'color'}, '#ffff00'],
            highlight_size_pv: [{max: 0.4, min: 0, step: 0.001, type: 'number'}, 0.088],
            notation_pv: [ON_OFF, 1],
            piece_theme_pv: [Keys(PIECE_THEMES), 'chess24'],
            show_delay: [{max: 2000, min: 0, step: 10, type: 'number'}, 100],
            show_ply: [['first', 'diverging'], 'diverging'],
        },
        live: {
            live_engine_1: [ON_OFF, 1],
            live_engine_2: [ON_OFF, 1],
            live_log: [[0, 5, 10, 'all'], 0],
            live_pv: [ON_OFF, 1],
        },
        // separator
        _2: {},
        // backup: {
        //     load_settings: [],
        //     save_settings: [],
        // },
        control: {
            play_every: [{max: 5000, min: 100, step: 100, type: 'number'}, 1200],
        },
        extra: {
            rows_per_page: [[10, 20, 50, 100], 10],
            small_decimal: [['always', 'never', '>= 10', '>= 100'], 'on'],
        },
        graph: {},
        panel: {},
    });

    virtual_init_3d_special = init_3d_special;
    virtual_random_position = random_position;
}
