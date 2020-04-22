// game.js
// @author octopoulo <polluxyz@gmail.com>
// @version 2020-04-18
//
// included after: common, engine, global, 3d, xboard
/*
globals
_, A, Abs, add_timeout, Assign, Attrs, BOARD_THEMES, C, change_setting, Class, clear_timeout, CreateNode, DEFAULTS,
DEV, Events, Exp, FormatUnit, FromSeconds, Hide, HTML, InsertNodes, Keys,
Lower, LS, Max, merge_settings, Min, Now, ON_OFF, Pad, Parent, PIECE_THEMES, Pow, Resource, resume_game, Round,
S, save_option, screen, set_3d_events, Show, show_menu, show_modal, Sign, Split, Style, Title, touch_handle,
translate_node, update_theme, Upper, Visible, window, XBoard, Y
*/
'use strict';

let _BLACK = 'black',
    _WHITE = 'white',
    BOARD_KEYS = Split('blue brown chess24 dark dilena green leipzig metro red symbol uscf wikipedia'),
    board_target = 'board',
    BOARDS = {
        board: {
            piece_class: 'smooth',
            size: 48,
        },
        // pv0: {
        //     target: 'text',
        // },
        // pv1: {},
        // pva: {},
    },
    ENGINE_FEATURES = {
        AllieStein: 1,                  // & 1 => NN engine
        LCZero: 3,                      // & 2 => Leela variations
    },
    LIVE_TABLES = Split('#table-live0 #table-live1 #player0 #player1'),
    num_ply,
    PIECE_KEYS  = Split('alpha chess24 dilena leipzig metro symbol uscf wikipedia'),
    pgn_moves = [],
    prev_pgn,
    TABLES = {
        crash: 'gameno=G#|White|Black|Reason|decision=Final decision|action=Action taken|Result|Log',
        cross: 'Rank|name=Engine|Points|1|2',
        game: 'gameno=G#|PGN|White|Black|Moves|Result',
        h2h: 'h2hrank=Game#|White|white_ev=W.ev|black_ev=B.Ev|Black|Result|Moves|Duration|Opening|Termination|ECO|Final Fen',
        sched: 'game=Game#|White|white_ev=Ev|Black|black_ev=Ev|Result|Moves|Duration|Opening|Termination|ECO|Final Fen|Start',
        stand: 'Rank|name=Engine|Games|Points|Crashes|Wins [W/B]|Loss [W/B]|SB|Elo|elo_diff=Diff [Live]',
        stats: 'Start time|End time|total_time=Duration|Avg Moves|Avg Time|White wins|Black wins|Draw Rate|Crashes|Min Moves|Max Moves|Min Time|Max Time',
        view: 'time_control=TC|moves_to50r=50|moves_to_draw=Draw|moves_to_resign_or_win=Win|piecesleft=TB|Result|Round|Opening|ECO|Event|Viewers',
        winner: 'name=S#|winner=Champion|runner=Runner-up|Score|Date',
    },
    time_delta = 0,
    turn = 0,               // 0:white to play, 1:black to play
    TWITCH_CHANNEL = 'https://player.twitch.tv/?channel=TCEC_Chess_TV',
    TWITCH_CHAT = 'https://www.twitch.tv/embed/TCEC_Chess_TV/chat',
    xboards = {},
    WHITE_BLACK = [_WHITE, _BLACK, 'live'],
    WB_TITLES = ['White', 'Black'];

// HELPERS
//////////

/**
 * The function was posted by "ya" in the Leela Chess Zero Discord channel
 * https://discordapp.com/channels/425419482568196106/430695662108278784/618146099269730342
 * @param {number} cp
 * @returns {number}
 */
function _leelaCpToQ(cp) {
    return cp < 234.18?
        0.0033898305085 * cp -
            (8.76079436769e-38 * Pow(cp, 15)) /
                (3.618208073857e-34 * Pow(cp, 14) + 1.0) +
            (cp * (-3.4456396e-5 * cp + 0.007076010851)) /
                (cp * cp - 487.329812319 * cp + 59486.9337812)
        : cp < 381.73?
            (-17.03267913 * cp + 3342.55947265) /
                (cp * cp - 360.8419732 * cp + 32568.5395889) + 0.995103
        : (35073.0 * cp) / (755200.0 + 35014.0 * cp) +
        ((0.4182050082072 * cp - 2942.6269998574) /
           (cp * cp - 128.710949474 * cp - 6632.9691544526)) *
           Exp(-Pow((cp - 400.0) / 7000.0, 3)) - 5.727639074137869e-8;
}

/**
 * Convert eval to win %
 * @param {number} eval_
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

    for (let i=0, length=text.length; i<length; i++) {
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
 * Get the short name of an engine
 * @param {string} engine Stockfish 20200407DC
 * @returns {string} Stockfish
 */
function get_short_name(engine)
{
    return engine.includes('Baron')? 'Baron': Split(engine)[0];
}

// TABLES
/////////

/**
 * Analyse the crosstable data
 * @param {Object} data
 */
function analyse_crosstable(data) {
    LS('analyse_crosstable:');
    LS(data);

    
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

    return [lower.replace(/[_() ./#-]+/g, '_').replace(/_+$/, ''), text];
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
                + '<i data-x="name"></i> <i data-x="eval"></i> [<i data-x="score"></i>]'
            + '</div>';

    if (is_live)
        html +=
            '<div class="live-more">'
                + '[D: <i data-x="depth"></i> | TB: <i data-x="tb"></i> | Sp: <i data-x="speed"></i> | N: <i data-x="node"></i>]'
            + '</div>';

    html +=
            '<div class="live-pv"></div>'
        + '</vert>';
    HTML(node, html);
}

/**
 * Create a table
 * @param {string[]} columns
 * @param {boolean=} add_empty add an empty row (good for table-view)
 */
function create_table(columns, add_empty) {
    let html =
        '<table><thead>'
        + columns.map((column, id) => {
                let [field, value] = create_field_value(column);
                return `<th ${id? '': 'class="rounded" '}data-x="${field}" data-t="${value}"></th>`;
            }).join('')
        + '</thead><tbody>'
        + (add_empty? columns.map(column => `<td data-x="${create_field_value(column)[0]}">&nbsp;</td>`).join(''): '')
        + '</tbody></table>';

    return html;
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
 * Download static JSON for a table
 * @param {string} url url
 * @param {string=} name table name
 * @param {function=} callback
 */
function download_table(url, name, callback) {
    Resource(url, (code, data) => {
        if (code != 200)
            return;

        if (DEV.json & 1) {
            LS(`${url}:`);
            LS(data);
        }
        if (name)
            update_table(name, data, true);
        if (callback)
            callback(data);
    });
}

/**
 * Download static JSON files at startup
 */
function download_tables() {
    download_pgn();

    // evals
    download_table(`data.json?no-cache${Now()}`, null, data => {
        update_live_eval(data, 0);
    });
    download_table(`data1.json?no-cache${Now()}`, null, data => {
        update_live_eval(data, 1);
    });
    download_table('liveeval.json');
    download_table('liveeval1.json');

    // tables
    download_table('crosstable.json', null, analyse_crosstable);
    download_table('enginerating.json');
    download_table('tournament.json');
    download_table('schedule.json', 'sched');
}

/**
 * Update a table by adding rows
 * @param {string} name
 * @param {Object[]} data
 * @param {boolean=} reset clear the table before updating it
 */
function update_table(name, rows, reset) {
    let last,
        table = _(`#table-${name}`),
        body = _('tbody', table),
        columns = Array.from(A('th', table)).map(node => node.dataset.x),
        nodes = [];
    if (reset)
        HTML(body, '');

    for (let row of rows) {
        row = Assign({}, ...Keys(row).map(key => ({[create_field_value(key)[0]]: row[key]})));

        if (name == 'sched')
            LS(row);
        let vector = columns.map(key => {
            let value = row[key];
            if (value == undefined)
                value = '';

            // special cases
            let class_ = '';

            switch (key) {
            case 'black':
                if (row.result == '0-1')
                    class_ = 'win';
                else if (row.result == '1-0')
                    class_ = 'lose';
                break;
            case 'game':
                if (row.moves)
                    value = `<a class="game">${value}</a>`;
                break;
            case 'white':
                if (row.result == '1-0')
                    class_ = 'win';
                else if (row.result == '0-1')
                    class_ = 'lose';
                break;
            default:
                if (typeof(value) == 'string') {
                    if (value.slice(0, 4) == 'http')
                        value = `<a href="${value}" class="url">${value}</a>`;
                }
            }

            if (class_)
                value = `<i class="${class_}">${value}</i>`;

            return `<td>${value}</td>`;
        });

        // special cases
        if (name == 'sched') {
            if (!last && nodes.length && !row.moves) {
                nodes[nodes.length - 1].classList.add('last');
                last = true;
            }
        }

        let node = CreateNode('tr', vector.join(''));
        nodes.push(node);
    }

    InsertNodes(body, nodes);
}

// PGN
//////

/**
 * Create a PV list
 * @param {Object[]} moves
 * @returns {string} html
 */
function create_pv_list(moves) {
    let lines = [],
        num_move = moves.length;

    moves.forEach((move, id) => {
        if (id % 2 == 0)
            lines.push(` <i class="turn">${1 + id / 2}.</i>`);

        if (!move || !move.m) {
            lines.push(` <a style="color:red">???</a>`);
            return;
        }

        let class_ = (id == num_move - 1)? 'seen': (move.book? 'book': 'real');
        lines.push(` <a class="${class_}" data-i="${id}">${move.m}</a>`);
    });

    return lines.join('');
}

/**
 * Download the PGN
 * @param {boolean=} reset_time
 */
function download_pgn(reset_time) {
    Resource(`live.json?no-cache${Now()}`, (code, data, xhr) => {
        if (code != 200)
            return;
        if (!reset_time) {
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
        HTML('#table-view td[data-x="viewers"]', pgn.Users);
    if (headers) {
        Split('ECO|Event|Opening|Result|Round').forEach(key => {
            HTML(`#table-view td[data-x="${Lower(key)}"]`, headers[key]);
        });

        let items = headers.TimeControl.split('+');
        HTML('#table-view td[data-x="time_control"]', `${items[0]/60}'+${items[1]}"`);
    }

    if (!num_move)
        return;

    let move = moves[num_move - 1],
        last_ply = pgn.numMovesToSend + start;

    xboards.board.set_fen(move.fen, true);
    // xboards.pv1.set_fen(fen, true);
    if (DEV.ply & 1) {
        LS(`${start} + ${num_move} = ${start + num_move}. ${(start + num_move) % 2} ${move.m}`);
        LS(`${(last_ply) / 2}`);
    }

    if (!last_ply || last_ply < num_ply)
        pgn_moves.length = 0;
    for (let i=0; i<num_move; i++)
        pgn_moves[start + i] = moves[i];

    // if only 1 move was played => white just played (who=0), and black plays next (turn=1)
    num_ply = pgn_moves.length;
    turn = num_ply % 2;
    let players = [],
        who = 1 - turn;

    if (DEV.ply & 1)
        LS(`num_move=${num_move} : num_ply=${num_ply} : last_ply=${last_ply} => turn=${turn}`);
    prev_pgn = pgn;

    // 2) engines
    WB_TITLES.forEach((title, id) => {
        let name = headers[title],
            node = _(`#player${id}`),
            short = get_short_name(name),
            src = `image/engine/${short}.jpg`;

        players.push([short, node]);

        HTML(`#engine${id}`, name);
        HTML(`[data-x="name"]`, short, node);
        HTML(`#score${id}`, headers[`${title}Elo`]);

        let image = _(`#logo${id}`);
        if (image.src != src) {
            image.setAttribute('alt', name);
            image.src = src;
        }
    });

    for (let i=num_move - 1; i>=0 && i>=num_move - 2; i--) {
        let move = moves[i],
            is_book = move.book,
            eval_ = is_book? 'book': move.wv,
            stats = {
                depth: is_book? '-': `${move.d}/${move.sd}`,
                eval: eval_,
                left: FromSeconds(move.tl / 1000).slice(0, -1).map(item => Pad(item)).join(':'),
                node: is_book? '-': FormatUnit(move.n),
                speed: is_book? '-': `${FormatUnit(move.s)}bps`,
                tb: is_book? '-': FormatUnit(move.tb),
                time: FromSeconds(move.mt / 1000).slice(1, -1).map(item => Pad(item)).join(':'),
            };

        Keys(stats).forEach(key => {
            HTML(`#${key}${who}`, stats[key]);
        });

        let node = players[who][1];
        HTML(`[data-x="eval"]`, is_book? '': move.wv, node);
        HTML(`[data-x="score"]`, is_book? 'book': calculate_probability(players[who][0], eval_), node);
        HTML('.live-pv', move.pv? move.pv.San: '', node);
        who = 1 - who;
    }

    // material
    let material = move.material,
        materials = [[], []];
    'qrbnp'.split('').forEach(key => {
        let value = material[key];
        if (value) {
            let id = (value > 0)? 0: 1,
                color = id? 'b': 'w';
            for (let i=0; i<Abs(value); i++)
                materials[id].push(`<div><img src="theme/wikipedia/${color}${Upper(key)}.svg"></div>`);
        }
    });

    for (let id=0; id<2; id++) {
        let node = _(`#material${id}`),
            html = HTML(node),
            material = materials[id].join('');
        if (html != material)
            HTML(node, material);
    }

    // 3) pv
    let html = create_pv_list(pgn_moves);
    HTML('.xmoves', html, xboards.board.node);

    // chart
    // prevPgnData = prev_pgn;
    // updateChartData();
}

// ACTIONS
//////////

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
            engine = Split(prev_pgn.Headers[title]),
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

// LIVE DATA
////////////

/**
 * Set the number of viewers
 * @param {number} count
 */
function set_viewers(count) {
    HTML('#table-view td[data-x="viewers"]', count);
}

/**
 * Update data from one of the Live engines
 * @param {Object} data
 * @param {number} id 0, 1
 */
function update_live_eval(data, id) {
    let eval_ = data.eval,
        short = get_short_name(data.engine),
        node = _(`#table-live${id}`);

    if (DEV.socket & 1) {
        LS(`update_live_eval: ${id} / ${short}`);
        LS(data);
    }

    let dico = {
        depth: data.depth,
        eval: eval_,
        name: short,
        node: FormatUnit(data.nodes),
        score: calculate_probability(short, eval_),
        speed: data.speed,
        tb: FormatUnit(data.tbhits),
    };
    Keys(dico).forEach(key => {
        HTML(`[data-x="${key}"]`, dico[key], node);
    });
    HTML('.live-pv', data.pv, node);
    // HTML(`div[data-x="live${id}"]`, short);

    // chart
    // updateChartDataLive(id);
}

/**
 * Update data from a Player
 * @param {Object} data
 */
function update_player_eval(data) {
    let eval_ = data.eval,
        id = data.color,
        node = _(`#player${id}`),
        short = get_short_name(data.engine);

    if (DEV.socket & 1) {
        LS(`update_player_eval: ${id} / ${short}:`);
        LS(data);
    }

    // 1) update the live part on the left
    let dico = {
        eval: eval_,
        name: short,
        score: calculate_probability(short, eval_),
    };
    Keys(dico).forEach(key => {
        HTML(`[data-x="${key}"]`, dico[key], node);
    });
    HTML('.live-pv', data.pv, node);

    // 2) update the engine info in the center
    let stats = {
        depth: data.depth,
        engine: data.engine,
        eval: eval_,
        logo: short,
        node: FormatUnit(data.nodes),
        speed: data.speed,
        tb: FormatUnit(data.tbhits),
    };
    Keys(stats).forEach(key => {
        HTML(`#${key}${id}`, stats[key]);
    });

    // chart
    // updateChartDataLive(id);
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

// SETTINGS
///////////

/**
 * Update the theme
 * @param {string=} theme
 */
function change_theme(theme) {
    if (theme != undefined)
        save_option('theme', theme);

    S('#theme0', Y.theme);
    S('#theme1', !Y.theme);
    update_theme();
}

/**
 * Enable/disable twitch video + chat
 * @param {number=} dark
 */
function update_twitch(dark) {
    if (dark != undefined)
        save_option('twitch_dark', dark);

    dark = Y.twitch_dark;
    Attrs('#chat', 'src', TWITCH_CHAT + (dark? '?darkpopout': ''));
    S('#twitch0', dark);
    S('#twitch1', !dark);

    if (Y.twitch_video)
        Attrs('#twitch-vid', 'src', TWITCH_CHANNEL);
    S('#twitch-vid', Y.twitch_video);
}

// EVENTS
/////////

/**
 * Handle xboard events
 * @param {XBoard} board
 * @param {string} type
 * @param {*} value
 */
function handle_board_events(board, type, value) {
    LS(`hook: ${board.name} : ${type} : ${value}`);
    if (type == 'click') {
        switch (value) {
        case 'cube':
            board.target = (board.target == 'html')? 'text': 'html';
            board.dirty = 3;
            board.resize();
            break;
        }
    }
}

/**
 * Special handling after user clicked on a tab
 * @param {Node} node table node
 * @param {string} name
 */
function handle_open_table(node, name) {
    LS(`handle_open_table: ${name}`);

    switch (name) {
    case 'crash':
        download_table('crash.json', 'crash');
        break;
    case 'info':
        HTML(node, HTML('#desc'));
        break;
    case 'winner':
        download_table('winners.json', 'winner');
        break;
    }
}

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

    // tabs
    C('div.tab', function() {
        let parent = Parent(this, 'horis', 'tabs'),
            active = _('div.active', parent),
            key = this.dataset.x,
            node = _(`#table-${key}`);

        Class(active, '-active');
        Class(this, 'active');
        Hide(`#table-${active.dataset.x}`);
        Show(node);

        handle_open_table(node, key);
    });

    // theme
    C('#theme0, #theme1', function() {
        change_theme((this.id.slice(-1) == '1')? 'dark': '');
    });
    C('#twitch0, #twitch1', function() {
        update_twitch((this.id.slice(-1) == '1')? 1: 0);
    });
}

// STARTUP
//////////

/**
 * Create 4 boards
 * - should be done at startup since we want to see the boards ASAP
 */
function create_boards() {
    Keys(BOARDS).forEach(key => {
        let options = Assign({
            hook: handle_board_events,
            history: true,
            node: `#${key}`,
            notation: 6 * 0,
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
 * Call this after the structures have been initialised
 */
function start_game() {
    create_boards();
    create_tables();
    update_twitch();
}

/**
 * Initialise structures with game specific data
 */
function startup_game() {
    //
    Assign(DEFAULTS, {
        live_engine1: 1,
        live_engine2: 1,
    });
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
            twitch_dark: [ON_OFF, 1],
            twitch_video: [ON_OFF, 1],
        },
    });
}
