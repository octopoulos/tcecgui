// xboard.js
// @author octopoulo <polluxyz@gmail.com>
// @version 2020-05-02
//
// game board:
// - 4 rendering modes:
//      ~ 3d
//      - canvas
//      + html
//      + text
// - games:
//      + chess
//      - chess960
//      - go (future)
//
// included after: common, engine, global, 3d
/*
globals
_, A, Abs, add_timeout, Assign, C, Clamp, Class, clear_timeout, CopyClipboard, CreateNode, DEV, Events, Floor, Hide,
HTML, InsertNodes, Keys, Lower, LS, merge_settings, Now, ON_OFF, S, Show, Split, Style, T, timers, update_svg, Upper,
Y
*/
'use strict';

let COLUMN_LETTERS = 'abcdefghijklmnopqrst'.split(''),
    CONTROLS = {
        start: {
            class: 'mirror',
            icon: 'end',
        },
        prev: {
            class: 'mirror',
            icon: 'next',
        },
        play: {
            dual: 'pause',
        },
        next: '',
        end: '',
        rotate: 'Rotate board',
        copy: 'Copy FEN',
        cube: 'Change view',
    },
    FIGURES = 'bknpqrBKNPQR'.split(''),
    LETTER_COLUMNS = Assign({}, ...COLUMN_LETTERS.map((letter, id) => ({[letter]: id}))),
    SPRITE_OFFSETS = Assign({}, ...FIGURES.map((key, id) => ({[key]: id}))),
    // https://en.wikipedia.org/wiki/Forsyth%E2%80%93Edwards_Notation
    // KQkq is also supported instead of AHah
    START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w AHah - 0 1',
    TIMEOUT_CLICK = 200,
    TIMEOUT_REPEAT = 40,
    TIMEOUT_REPEAT_INITIAL = 500;

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// TYPES
////////

/**
 * Move
 * @typedef {Object} Move
 * @property {Object} adjudication
 * @property {boolean} book
 * @property {string} fen
 * @property {string} from
 * @property {Object} material
 * @property {Object} pv
 * @property {string} to
 */

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/** @class */
class XBoard {
    /**
     * Constructor
     * @param {Object} options options:
     * @example
     * - border         // frame size
     * - dims           // [num_col, num_row]
     * - hook           // events callback
     * - id             // output selector for HTML & text, can be 'console' too
     * - list           // show move list history
     * - mode         // 3d, canvas, html, text
     * - notation       // 1:top cols, 2:bottom cols, 4:left rows, 8:right nows
     * - pv_id          // extra output selector for PV list
     * - rotate         // board rotation
     * - size           // square size in px (resize will recalculate it)
     * - smooth         // smooth piece animation
     */

    constructor(options={}) {
        // options
        this.border = options.border || 2;
        this.dims = options.dims || [8, 8];
        this.hook = options.hook;
        this.id = options.id;
        this.list = options.list;
        this.mode = options.mode || 'html';
        this.notation = options.notation || 6;
        this.pv_id = options.pv_id;                     // extra container for PV list
        this.rotate = options.rotate || 0;
        this.size = options.size || 16;
        this.smooth = options.smooth;

        // initialisation
        this.colors = ['#eee', '#111'];
        this.coords = {};
        this.dirty = 3;                                 // &1: board, &2: notation, &4: pieces
        this.fen = START_FEN;                           // current fen
        this.grid = {};
        this.high_color = '';                           // highlight color
        this.high_delay = 1100;                         // if smooth + history => delay highlighting
        this.high_size = 0;                             // highlight size in .em
        this.hold = null;                               // mouse/touch hold target
        this.hold_time = 0;                             // last time the event was repeated
        this.move = null;                               // current move
        this.move2 = null;                              // previous move
        this.moves = [];                                // move list
        this.node = _(this.id);
        this.nodes = {};
        this.pieces = {};                               // b: [[found, row, col], ...]
        this.ply = 0;                                   // current ply
        this.pv_node = _(this.pv_id);
        this.theme = 'chess24';
        this.theme_ext = 'png';
        this.theme_size = 80;
        this.xmoves = null;
    }

    /**
     * Add a new move
     * - faster than using set_fen, as it won't have to recompute everything
     * @param {Move} move
     */
    add_move(move) {
        this.animate(move, true);
    }

    /**
     * Add new moves
     * - handle PGN format from TCEC
     * - can handle 2 pv lists
     * @param {Move[]|string} moves
     * @param {number} start starting ply for those moves
     */
    add_moves(moves, start) {
        let num_new = moves.length,
            num_move = this.moves.length,
            parent_lasts = [this.xmoves, this.pv_node]
                .filter(parent => parent)
                .map(parent => {
                    let last = _('.last', parent);
                    if (!last) {
                        last = CreateNode('i', '*', {class: 'last'});
                        parent.appendChild(last);
                    }
                    return [parent, last];
                });

        // special case: just append a text, ex: 1-0
        if (!Array.isArray(moves)) {
            for (let [parent, last] of parent_lasts) {
                let node = CreateNode('i', moves);
                parent.insertBefore(node, last);
            }
            return;
        }

        // proper moves
        for (let i = 0; i < num_new; i ++) {
            let move = moves[i],
                ply = start + i;

            this.moves[ply] = move;
            // TODO: remove this ... sometimes we need to add missing nodes
            if (ply < num_move)
                continue;

            if (ply % 2 == 0) {
                for (let [parent, last] of parent_lasts) {
                    let node = CreateNode('i', `${1 + ply / 2}. `, {class: 'turn'});
                    parent.insertBefore(node, last);
                }
            }
            if (move.m) {
                for (let [parent, last] of parent_lasts) {
                    let node = CreateNode('a', `${move.m} `, {class: (move.book? 'book': 'real'), 'data-i': ply});
                    parent.insertBefore(node, last);
                }
            }
        }

        // update the cursor
        if (this.ply >= num_move - 1)
            this.set_ply(this.moves.length - 1, true);
    }

    /**
     * Analyse the FEN and extract piece coordinates from it
     * - ideally do this only when starting a new game
     */
    analyse_fen() {
        // 1) create the grid + count the pieces
        let chars = [],
            counts = {},
            grid = {},
            lines = this.fen.split(' ')[0].split('/'),
            pieces = this.pieces,
            row = lines.length - 1;

        for (let line of lines) {
            let col = 0;
            for (let char of line.split('')) {
                // piece
                if (isNaN(char)) {
                    grid[`${row}${col}`] = char;
                    chars.push([char, row, col]);
                    let count = (counts[char] || 0) + 1,
                        items = pieces[char];

                    counts[char] = count;
                    if (count > items.length)
                        items.push([0, -1, -1]);
                    col ++;
                }
                // void
                else {
                    for (let j = 0; j < parseInt(char); j ++) {
                        grid[`${row}${col}`] = '';
                        col ++;
                    }
                }
            }
            row --;
        }

        // 2) match chars and pieces
        Keys(pieces).forEach(key => {
            for (let piece of pieces[key])
                piece[0] = 0;
        });

        // perfect matches
        for (let char of chars) {
            for (let item of pieces[char[0]]) {
                if (!item[0] && char[1] == item[1] && char[2] == item[2]) {
                    item[0] = 1;
                    char[0] = '';
                    break;
                }
            }
        }

        // imperfect matches
        for (let [char, row, col] of chars) {
            if (!char)
                continue;

            let win,
                best = 9999,
                items = pieces[char];
            for (let item of items) {
                if (item[0])
                    continue;
                let diff = Abs(row - item[1]) + Abs(col - item[2]);
                if (diff < best) {
                    best = diff;
                    win = item;
                }
            }
            win[0] = 1;
            win[1] = row;
            win[2] = col;
        }

        // move non found pieces off the board
        let [num_row, num_col] = this.dims;
        Keys(pieces).forEach(key => {
            for (let piece of pieces[key])
                if (!piece[0]) {
                    piece[1] = -num_row;
                    piece[2] = num_col * 2;
                }
        });

        this.grid = grid;
    }

    /**
     * Animate / render a move
     * - high_delay = 0 => always show the highlight in smooth/history
     * -            < 0    never  ------------------------------------
     * -            > 0    will   ------------------------------------
     * @param {Move=} move
     * @param {boolean} animate
     */
    animate(move, animate) {
        if (!move)
            return;
        let func = `animate_${this.mode}`;
        if (this[func]) {
            let delay = this.high_delay;
            this[func](move, animate || !delay);
            if (!animate && delay > 0)
                add_timeout(`animate_${this.id}`, () => {this[func](move, true);}, delay);
        }
    }

    /**
     * Animate a move in 3D
     * @param {Move} move
     * @param {boolean} animate
     */
    animate_3d(move, animate) {
        if (!T)
            return;
        LS(`${move.from}${move.to}`);
    }

    /**
     * Animate a move on the canvas
     * @param {Move} move
     * @param {boolean} animate
     */
    animate_canvas(move, animate) {
        LS(`${move.from}${move.to}`);
    }

    /**
     * Animate a move in the DOM
     * @param {Move} move
     * @param {boolean} animate false => remove highlights
     */
    animate_html(move, animate) {
        let prev = this.move2;
        if (prev) {
            Style(prev.node_from, 'box-shadow: none');
            Style(prev.node_to, 'box-shadow: none');
        }
        if (!animate)
            return;

        // LS(`${move.from}${move.to}`);
        let color = this.high_color,
            node_from = this.nodes[move.from],
            node_to = this.nodes[move.to],
            size = this.high_size,
            high_style = `box-shadow: inset 0 0 ${size}em ${size}em ${color}`;

        Style(node_from, high_style);
        Style(node_to, high_style);

        // remember the move + nodes
        move.node_from = node_from;
        move.node_to = node_to;
        this.move2 = move;
    }

    /**
     * Animate a move in text
     * @param {Move} move
     * @param {boolean} animate
     */
    animate_text(move, animate) {
        LS(`${move.from}${move.to}`);
    }

    /**
     * Listen to clicking events
     * @param {function} callback
     */
    event_hook(callback) {
        let that = this;

        C(this.node, () => {
            callback(that, 'activate');
        });

        // disable right click
        Events('[data-x]', 'contextmenu', e => {
            e.preventDefault();
        }, {}, this.node);

        // controls
        C('[data-x]', function() {
            let name = this.dataset.x;
            switch (name) {
            case 'copy':
                CopyClipboard(that.fen);
                Class(this, 'copied');
                add_timeout('fen', () => {Class(this, '-copied');}, 1000);
                break;
            case 'end':
                that.go_end();
                break;
            case 'next':
            case 'prev':
                that.hold_button(name, -1);
                break;
            case 'play':
                that.play();
                break;
            case 'rotate':
                let smooth = that.smooth;
                that.smooth = false;
                that.rotate = (that.rotate + 1) % 2;
                that.render(3);
                that.smooth = smooth;
                break;
            case 'start':
                that.go_start();
                break;
            default:
                callback(that, 'control', name);
            }

            if (name != 'play')
                that.play(true);
        }, this.node);

        // holding mouse/touch on prev/next => keep moving
        Events('[data-x]', 'mousedown mouseleave mousemove mouseup touchend touchmove touchstart', function(e) {
            let name = this.dataset.x,
                type = e.type;

            if (['mousedown', 'touchstart'].includes(type)) {
                if (!['next', 'prev'].includes(name))
                    return;
                that.hold = name;
                that.hold_button(name, 0);
            }
            else {
                if (!that.hold)
                    return;

                if (['mousemove', 'touchmove'].includes(type)) {
                    if (name != that.hold)
                        that.hold = null;
                }
                else
                    that.hold = null;

                if (!that.hold) {
                    clear_timeout(`click_next`);
                    clear_timeout(`click_prev`);
                }
            }
        }, {}, this.node);

        // moving a piece by click
        C(this.xmoves, e => {
            callback(that, 'move', e);
        });
        C('.xsquares', e => {
            callback(that, 'square', e);
        }, this.node);
        C('.xpieces', e => {
            callback(that, 'piece', e);
        }, this.node);
    }

    /**
     * Hold mouse button or touch => repeat the action
     * @param {string} name
     * @param {number} step -1 for no repeat
     */
    hold_button(name, step) {
        let now = Now(true);

        // need this to prevent mouse up from doing another click
        if (step >= 0 || now > this.hold_time + TIMEOUT_CLICK) {
            switch (name) {
            case 'next':
            case 'play':
                if (!this.go_next())
                    step = -1;
                break;
            case 'prev':
                if (!this.go_prev())
                    step = -1;
                break;
            }
        }

        if (step < 0) {
            if (name == 'play')
                this.play(true);
            return;
        }

        this.hold_time = now;

        let timeout = (name == 'play')? Y.play_every: (step? TIMEOUT_REPEAT: TIMEOUT_REPEAT_INITIAL);
        add_timeout(`click_${name}`, () => {this.hold_button(name, step + 1);}, timeout);
    }

    /**
     * Initialise the board
     * - must be run before doing anything with it
     */
    initialise() {
        // create elements
        let controls = Keys(CONTROLS).map(name => {
            let value = CONTROLS[name] || {},
                class_ = value.class || '',
                dual = value.dual,
                icon = value.icon || name,
                title = value.title || '';

            if (class_)
                class_ = ` ${class_}`;
            if (typeof(value) == 'string')
                title = value;
            if (title)
                title = ` title="${title}"`;

            // handle dual elements: play/pause
            let attr = ` data-x="${name}"`,
                svg = `<i data-svg="${icon}"${title}></i>`;
            if (dual) {
                svg = `<vert${attr}>${svg}</vert>`
                    + `<vert class="dn" data-x="${dual}"><i data-svg="${dual}"></i></vert>`;
                attr = '';
            }

            return `<vert class="control fcenter${class_}"${attr}>${svg}</vert>`;
        }).join('');

        HTML(this.node, [
            '<div>',
                '<div class="xframe"></div>',
                '<grid class="xsquares"></grid>',
                '<div class="xpieces"></div>',
                `<hori class="xcontrol">${controls}</hori>`,
            '</div>',
            `<div class="xmoves${this.list? '': ' dn'}"></div>`,
        ].join(''));

        this.xmoves = _('.xmoves', this.node);

        // initialise the pieces to zero
        this.pieces = Assign({}, ...FIGURES.map(key => ({[key]: []})));

        this.analyse_fen();
        this.resize();
        update_svg();

        if (this.hook)
            this.event_hook(this.hook);
    }

    /**
     * Navigation: end
     * @returns {boolean}
     */
    go_end() {
        return this.set_ply(this.moves.length - 1);
    }

    /**
     * Navigation: next
     * @returns {boolean}
     */
    go_next() {
        let num_move = this.moves.length,
            ply = this.ply + 1;
        while (ply < num_move - 1 && !this.moves[ply])
            ply ++;
        return this.set_ply(ply);
    }

    /**
     * Navigation: prev
     * @returns {boolean}
     */
    go_prev() {
        let ply = this.ply - 1;
        while (ply > 0 && !this.moves[ply])
            ply --;
        return this.set_ply(ply);
    }

    /**
     * Navigation: start
     * @returns {boolean}
     */
    go_start() {
        let num_move = this.moves.length,
            ply = 0;
        while (ply < num_move - 1 && !this.moves[ply])
            ply ++;
        return this.set_ply(ply);
    }

    /**
     * Output HTML or text to an element or the console
     * @param {string} text
     */
    output(text) {
        if (this.id == 'console')
            LS(text);
        else
            HTML('.xsquares', text, this.node);
    }

    /**
     * Play button was pushed
     * @param {boolean=} stop
     */
    play(stop) {
        if (stop || timers.click_play) {
            clear_timeout('click_play');
            stop = true;
        }
        else
            this.hold_button('play', 0);

        S('[data-x="pause"]', !stop, this.node);
        S('[data-x="play"]', stop, this.node);
    }

    /**
     * Render to the current target
     * @param {number=} dirty
     */
    render(dirty) {
        if (dirty != undefined)
            this.dirty |= dirty;

        if (DEV.board & 1)
            LS(`render: ${this.dirty}`);
        let func = `render_${this.mode}`;
        if (this[func]) {
            this[func]();
            this.animate(this.move, this.smooth);
        }
    }

    /**
     * 3d rendering
     */
    render_3d() {
        LS('render_3d');
        if (!T)
            return;
    }

    /**
     * 2d canvas rendering
     */
    render_canvas() {
        LS('render_canvas');
    }

    /**
     * 2d HTML rendering
     */
    render_html() {
        let colors = this.colors,
            dirty = this.dirty,
            [num_row, num_col] = this.dims,
            rotate = this.rotate,
            size = this.size;

        // 1) draw empty board + notation
        if (dirty & 1) {
            let lines = [],
                notation = this.notation;

            for (let i = 0; i < num_row; i ++) {
                let row_name = rotate? i + 1: 8 - i;

                for (let j = 0; j < num_col; j ++) {
                    let col_name = COLUMN_LETTERS[rotate? 7 - j: j],
                        even = (i + j) % 2,
                        note_x = '',
                        note_y = '',
                        style = '';

                    if (notation) {
                        style = `;color:${colors[1 - even]}`;
                        if (notation & 2) {
                            if (i == num_row - 1)
                                note_x = `<div class="xnote" style="left:2.67em;top:1.17em">${Upper(col_name)}</div>`;
                        }
                        if (notation & 4) {
                            if (j == rotate * 7)
                                note_y = `<div class="xnote" style="left:${rotate? 2.7: 0.1}em;top:-1.15em">${row_name}</div>`;
                        }
                    }

                    lines.push(`<div class="xsquare" data-q="${col_name}${row_name}" style="background:${colors[even]}${style}">${note_x}${note_y}</div>`);
                }
            }

            this.output(lines.join(''));

            // remember all the nodes for quick access
            this.nodes = Assign({}, ...Array.from(A('.xsquare', this.node)).map(node => ({[node.dataset.q]: node})));
            this.move2 = null;
        }

        // 3) draw pieces
        if (dirty & 2) {
            if (DEV.board & 1)
                LS(`render_html: num_piece=${this.pieces.length}`);

            let image = `theme/${this.theme}.${this.theme_ext}`,
                nodes = [],
                piece_size = this.theme_size,
                diff = (piece_size - size) / 2,
                style = `background-image:url(${image});height:${piece_size}px;width:${piece_size}px`,
                transform = `transform:scale(${size / piece_size}) translate(-${diff}px,-${diff}px)`,
                xpieces = _('.xpieces', this.node);

            Class(xpieces, 'smooth', this.smooth);

            // create pieces / adjust their position
            Keys(this.pieces).forEach(char => {
                let items = this.pieces[char],
                    offset = -SPRITE_OFFSETS[char] * piece_size;

                for (let item of items) {
                    let [found, row, col, node] = item;

                    if (!node) {
                        let html = `<div style="${style};background-position-x:${offset}px"></div>`;
                        node = CreateNode('div', html, {class: 'xpiece'});
                        nodes.push(node);
                        item[3] = node;
                    }
                    if (rotate)
                        col = 7 - col;
                    else
                        row = 7 - row;

                    if (found)
                        Style(node, `${transform} translate(${col * piece_size}px,${row * piece_size}px);opacity:1`);
                    else
                        Style(node, 'opacity:0');
                }
            });

            if (DEV.board & 1)
                LS(xpieces);

            // insert pieces
            InsertNodes(xpieces, nodes);
        }

        this.dirty = 0;
        Show('.xframe, .xpieces', this.node);
    }

    /**
     * 2d text rendering
     */
    render_text() {
        let grid = this.grid,
            lines = [],
            notation = (this.id == 'console')? this.notation: 0,
            [num_row, num_col] = this.dims;

        // column notation
        let scolumn = COLUMN_LETTERS.slice(0, num_col).join(' ');
        if (notation & 1)
            lines.push(`  ${scolumn}`);

        // parse all cells
        for (let i = num_row - 1; i >= 0; i --) {
            let vector = [];

            if (notation & 4)
                vector.push(`${i + 1}`);

            for (let j = 0; j < num_col; j ++) {
                let char = grid[`${i}${j}`];
                if (!char)
                    char = ((i + j) % 2)? ' ': '.';
                vector.push(char);
            }

            if (notation & 8)
                vector.push(`${i + 1}`);

            lines.push(vector.join(' '));
        }

        if (notation & 2)
            lines.push(`  ${scolumn}`);

        // output result
        let font_size = (notation & 12)? 0.91 * num_col / (num_col + 1): 0.91,
            text = lines.join('\n');
        this.output(`<pre style="font-size:${font_size}em">${text}</pre>`);

        Hide('.xframe, .xpieces', this.node);
        return text;
    }

    /**
     * Reset the moves
     */
    reset() {
        this.moves.length = 0;
        this.ply = 0;
        HTML(this.xmoves, '');
    }

    /**
     * Resize the board to a desired width
     * @param {number=} width
     */
    resize(width) {
        if (!width)
            width = this.node.clientWidth;

        let border = this.border,
            num_col = this.dims[1],
            size = Floor((width - border * 2) * 2 / num_col) / 2,
            frame_size = size * num_col + border * 2;

        Style(this.node, `font-size:${size}px`);
        Style('div.xframe', `height:${frame_size}px;left:-${border}px;top:-${border}px;width:${frame_size}px`, true, this.node);

        this.size = size;
        this.render(2);
    }

    /**
     * Set a new FEN
     * @param {string} fen
     * @param {boolean=} render
     */
    set_fen(fen, render) {
        if (DEV.board & 1)
            LS(`set_fen: ${fen}`);
        if (fen == null)
            fen = START_FEN;

        this.fen = fen;
        this.analyse_fen();
        if (render)
            this.render(2);
    }

    /**
     * Set the ply + update the FEN
     * @param {number} ply
     * @param {boolean=} animate
     * @returns {boolean}
     */
    set_ply(ply, animate) {
        if (DEV.ply & 1)
            LS(`set_ply: ${ply} : ${animate}`);

        // boundary check
        ply = Clamp(ply, 0, this.moves.length - 1);
        if (this.ply == ply)
            return false;
        this.ply = ply;

        // update the FEN
        // TODO: if delta = 1 => should add_move instead => faster
        let move = this.moves[ply];
        if (!move)
            return false;
        this.set_fen(move.fen, true);

        if (this.hook)
            this.hook(this, 'ply', move);

        this.update_cursor(ply);
        if (animate == undefined && (!this.smooth || ply == this.moves.length - 1))
            animate = true;
        this.animate(move, animate);
        return true;
    }

    /**
     * Update the cursor
     * @param {number} ply
     */
    update_cursor(ply) {
        for (let parent of [this.xmoves, this.pv_node]) {
            if (!parent)
                continue;

            let node = _(`[data-i="${ply}"]`, parent);
            Class('.seen', '-seen', true, parent);
            Class(node, 'seen');

            // minimum scroll to make the cursor visible
            let y,
                cursor_h = node.offsetHeight,
                cursor_y = node.offsetTop,
                parent_h = parent.clientHeight,
                parent_y = parent.scrollTop;

            if (cursor_y < parent_y)
                y = cursor_y;
            else if (cursor_y + cursor_h > parent_y + parent_h)
                y = cursor_y + cursor_h - parent_h;

            if (y != undefined)
                parent.scrollTop = y;
        }
    }
}
