// game.js
// @author octopoulo <polluxyz@gmail.com>
// @version 2020-04-18
//
// included after: common, engine, global, 3d, xboard
/*
globals
_, A, add_timeout, Assign, BOARD_THEMES, C, change_setting, Class, clear_timeout, Events, FormatUnit, FromSeconds,
HTML, Keys, Lower, LS, Max, merge_settings, Min, Now, ON_OFF, Pad, Parent, PIECE_THEMES, Resource, resume_game, Round,
S, screen, set_3d_events, show_menu, show_modal, Style, Title, touch_handle, translate_node, Visible, window, XBoard, Y
*/
'use strict';

let _BLACK = 'black',
    _WHITE = 'white',
    BOARD_KEYS = 'blue brown chess24 dark dilena green leipzig metro red symbol uscf wikipedia'.split(' '),
    BOARDS = {
        board: {
            size: 48,
        },
        // pv1: {
        //     target: 'text',
        // },
        // pv2: {},
        // pva: {},
    },
    num_ply,
    PIECE_KEYS  = 'alpha chess24 dilena leipzig metro symbol uscf wikipedia'.split(' '),
    pgn_moves = [],
    prev_pgn,
    TABLES = {
        overview: 'TC|50|Draw|Win|TB|Result|Round|Opening|ECO|Event|Viewers'.split('|'),
    },
    time_delta = 0,
    turn = 0,               // 0:white to play, 1:black to play
    xboards = {},
    WHITE_BLACK = [_WHITE, _BLACK, 'live'];

// NODES
////////

/**
 * Create a table
 * @param {string[]} columns
 */
function create_table(columns) {
    let html =
        '<table><thead>'
        + columns.map((column, id) => {
                let items = column.split('|');
                return `<th ${id? '': 'class="rounded" '}data-x="${Lower(items[0])}" data-t="${items.slice(-1)[0]}"></th>`;
            }).join('')
        + '</thead><tbody></tbody>'
        + columns.map(column => (`<td data-x="${Lower(column.split('|')[0])}">&nbsp;</td>`)).join('')
        + '</table>';
    return html;
}

/**
 * Create all the tables
 */
function create_tables() {
    Keys(TABLES).forEach(name => {
        let table = TABLES[name],
            html = create_table(table);
        HTML(`#${name}`, html);
    });
    translate_node('body');

    // mouse/touch scroll
    Events('.scroller', '!touchstart touchmove touchend', () => {});
    Events('.scroller', 'mousedown mouseenter mouseleave mousemove mouseup touchstart touchmove touchend', e => {
        touch_handle(e);
    }, {passive: false});
}

// ACTIONS
//////////

/**
 * Create 4 boards
 */
function create_boards() {
    Keys(BOARDS).forEach(key => {
        let options = Assign({
            node: `#${key}`,
            notation: 15,
            size: 16,
            target: 'html',
        }, BOARDS[key]);

        let xboard = new XBoard(options);
        xboard.initialise();
        xboard.set_theme(BOARD_THEMES[Y.board_theme], PIECE_THEMES[Y.piece_theme]);
        xboards[key] = xboard;
    });
}

/**
 * Update the PGN
 * @param {boolean=} reset_time
 */
function download_pgn(reset_time)
{
    Resource(`live.json?no-cache${Now()}`, (code, data, xhr) => {
        if (code != 200)
            return;
        if (!reset_time)
        {
            let curr_time = new Date(xhr.getResponseHeader('date')),
                last_mod = new Date(xhr.getResponseHeader('last-modified'));
            time_delta = curr_time.getTime() - last_mod.getTime();
        }
        prev_pgn = null;
        data.gameChanged = 1;
        update_pgn(data);
    });
}

/**
 * Show a popup with the engine info
 * @param {string} scolor white, black
 * @param {Event} e
 */
function popup_engine_info(scolor, e) {
    if (!prev_pgn)
        return;

    let show,
        popup = _('#popup'),
        type = e.type;

    if (type == 'mouseleave')
        show = false;
    else if (scolor == 'popup')
        show = true;
    else {
        let title = Title(scolor),
            engine = prev_pgn.Headers[title].split(' '),
            options = prev_pgn[`${title}EngineOptions`],
            lines = options.map(option => [option.Name, option.Value]);

        // add engine + version
        lines.splice(0, 0, ['Engine', engine[0]], ['Version', engine.slice(1).join(' ')]);
        lines = lines.flat().map(item => `<div>${item}</div>`);

        HTML(popup, `<grid class="grid2">${lines.join('')}</grid>`);

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
        clear_timeout('popup-engine');
        Class(popup, 'popup-enable');
    }
    else
        add_timeout('popup-engine', () => {Class(popup, '-popup-enable');}, 500);
}

/**
 * Resize the window => resize some other elements
 */
function resize() {
    let height = Max(350, Round(Min(screen.availHeight, window.innerHeight) - 80));
    Style('#chat', `height:${height}px;width:100%`);

    // resize the boards
    let width = _('#board').clientWidth;
    xboards.board.resize(width);
}

/**
 * Show/hide info
 * @param {boolean} show
 */
function show_info(show) {
    S('#overlay', show);
    if (show)
        HTML('#popup-desc', HTML('#desc'));
    Class('#popup-info', 'popup-show popup-enable', show);
}

/**
 * Update the PGN
 * - white played => lastMoveLoaded=109
 * @param {Object} pgn
 */
function update_pgn(pgn) {
    window.pgn = pgn;

    let headers = pgn.Headers,
        moves = pgn.Moves,
        num_move = moves.length,
        start = pgn.lastMoveLoaded || 0;

    // 1) overview
    if (pgn.Users)
        HTML('#overview td[data-x="viewers"]', pgn.Users);
    if (headers) {
        'ECO|Event|Opening|Result|Round'.split('|').forEach(key => {
            HTML(`#overview td[data-x="${Lower(key)}"]`, headers[key]);
        });

        let items = headers.TimeControl.split('+');
        HTML('#overview td[data-x="tc"]', `${items[0]/60}'+${items[1]}"`);
    }

    if (!num_move)
        return;

    let move = moves[num_move - 1],
        last_ply = pgn.numMovesToSend + start;

    xboards.board.set_fen(move.fen, true);
    // xboards.pv1.set_fen(fen, true);
    LS(`${start} + ${num_move} = ${start + num_move}. ${(start + num_move) % 2} ${move.m}`);
    LS(`${(last_ply) / 2}`);

    if (!last_ply || last_ply < num_ply)
        pgn_moves.length = 0;
    for (let i=0; i<num_move; i++)
        pgn_moves[start + i] = moves[i];

    // if only 1 move was played => white just played (who=0), and black plays next (turn=1)
    num_ply = pgn_moves.length;
    turn = num_ply % 2;
    let who = 1 - turn;

    LS(`num_move=${num_move} : num_ply=${num_ply} : last_ply=${last_ply} => turn=${turn}`);
    prev_pgn = pgn;

    // 2) engines
    for (let i=num_move - 1; i>=0 && i>=num_move - 2; i--) {
        let move = moves[i],
            is_book = move.book,
            stats = {
                depth: is_book? '-': `${move.d}/${move.sd}`,
                eval: is_book? 'book': move.wv,
                left: FromSeconds(move.tl / 1000).slice(0, -1).map(item => Pad(item)).join(':'),
                node: is_book? '-': FormatUnit(move.n),
                score: '',
                speed: is_book? '-': `${FormatUnit(move.s)}bps`,
                tb: is_book? '-': move.tb,
                time: FromSeconds(move.mt / 1000).slice(1, -1).map(item => Pad(item)).join(':'),
            };
        Keys(stats).forEach(key => {
            HTML(`#${key}${who}`, stats[key]);
        });
        who = 1 - who;
    }
}

// INPUT / OUTPUT
/////////////////

/**
 * Same as action_key_no_input, but when the key is up
 * @param {number} code hardware keycode
 */
function action_keyup_no_input(code) {
}

/**
 * Handle keys, even when an input is active
 * @param {number} code hardware keycode
 */
function action_key(code) {
    switch(code) {
    // escape
    case 27:
        show_info(false);
        break;
    }
}

/**
 * Handle a keyup
 * @param {number} code
 */
function game_action_keyup(code) {
    LS(code);
}

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
            parent = Visible('#modal')? _('#modal'): _('#modal2'),
            items = Array.from(A('.item', parent)).filter(item => Visible(item)),
            length = items.length,
            index = (items.findIndex(item => item.classList.contains('selected')) + length) % length,
            node = items[index],
            tag = node.tagName,
            is_grid = node.parentNode.classList.contains('grid');

        switch (code) {
        // escape, e
        case 27:
        case 69:
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
    else {
        switch (code) {
        // enter, space
        case 13:
        case 32:
            break;
        // escape
        case 27:
            show_menu();
            break;
        }
    }
}

// EVENTS
/////////

/**
 * Game events
 */
function set_game_events() {
    set_3d_events();

    // popups
    Events('#info0, #info1', 'click mouseenter mousemove mouseleave', function(e) {
        popup_engine_info(WHITE_BLACK[this.id.slice(-1)], e);
    });
    C('.popup-close', function() {
        show_info(false);
        let parent = Parent(this, 'div|vert', 'popup');
        if (parent)
            Class(parent, '-popup-enable -popup-show');
    });
    C('#info', () => {
        show_info(true);
    });
    C('#overlay', () => {
        show_info(false);
    });
}

// STARTUP
//////////

/**
 * Call this after the structures have been initialised
 */
function start_game() {
    create_tables();
}

/**
 * Initialise structures with game specific data
 */
function startup_game() {
    merge_settings({
        board: {
            arrows: [ON_OFF, 1],
            board_middle: [ON_OFF, 0],
            board_theme: [BOARD_KEYS, 'chess24'],
            highlight: [['off', 'thin', 'standard', 'big'], 'standard'],
            notation: [ON_OFF, 1],
            piece_theme: [PIECE_KEYS, 'chess24'],
        },
        board_pv: {
            highlight_pv: [['off', 'thin', 'standard', 'big'], 'standard'],
            live_pv: [ON_OFF, 1],
            notation_pv: [ON_OFF, 1],
            ply_diff: [['first', 'diverging', 'last'], 'first'],
        },
        extra: {
            cross_crash: [ON_OFF, 0],
            live_log: [[5, 10, 'all'], 10],
        },
        twitch: {
            twitch_back_mode: [ON_OFF, 1],
            twitch_video: [ON_OFF, 1],
        },
    });
}
