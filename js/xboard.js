// xboard.js
// @author octopoulo <polluxyz@gmail.com>
// @version 2020-05-02
//
// game board:
// - 4 rendering targets:
//      - 3d
//      - canvas
//      + html
//      + text
// - games:
//      ~ chess
//      - chess960
//      - go (future)
//
// included after: common, engine, global, 3d
/*
globals
_, A, Abs, add_timeout, Assign, C, Class, CopyClipboard, CreateNode, DEV, Events, Floor, Hide, HTML, InsertNodes, Keys,
Lower, LS, merge_settings, ON_OFF, S, Show, Split, Style, T, update_svg, Upper
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
        play: '',
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
    START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w AHah - 0 1';

class XBoard {
    /**
     * Constructor
     * @param {Object} options options:
     * @example
     * - border         // frame size
     * - colors         // [light, dark] squares
     * - dims           // [num_col, num_row]
     * - history        // show history?
     * - hook           // events callback
     * - id             // output selector for HTML & text, can be 'console' too
     * - notation       // 1:top cols, 2:bottom cols, 4:left rows, 8:right nows
     * - rotate         // board rotation
     * - size           // square size in px (resize will recalculate it)
     * - smooth         // smooth piece animation
     * - target         // 3d, canvas, html, text
     */

    constructor(options={}) {
        this.border = options.border || 2;
        this.colors = ['#eee', '#111'];
        this.coords = {};
        this.dims = options.dims || [8, 8];
        this.dirty = 3;                                 // &1: board, &2: notation, &4: pieces
        this.fen = START_FEN;
        this.grid = {};
        this.high_color = '';                           // highlight color
        this.high_size = 0;                             // highlight size in .em
        this.history = options.history;
        this.hook = options.hook;
        this.id = options.id;
        this.move = null;                               // current move
        this.move2 = null;                              // previous move
        this.moves = [];                                // moves history
        this.node = _(this.id);
        this.nodes = {};
        this.notation = options.notation || 6;
        this.pieces = {};                               // b: [[found, row, col], ...]
        this.rotate = options.rotate || 0;
        this.size = options.size || 16;
        this.smooth = options.smooth;
        this.target = options.target || 'html';
        this.theme = 'chess24';
        this.theme_ext = 'png';
        this.theme_size = 80;
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
                    for (let j=0; j<parseInt(char); j++) {
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
     * @param {Object=} move
     */
    animate(move) {
        if (!move)
            return;
        let target = `animate_${this.target}`;
        if (this[target])
            this[target](move);
    }

    /**
     * Animate a move in 3D
     * @param {Object} move
     */
    animate_3d(move) {
        LS(`${move.from}${move.to}`);
    }

    /**
     * Animate a move on the canvas
     * @param {Object} move
     */
    animate_canvas(move) {
        LS(`${move.from}${move.to}`);
    }

    /**
     * Animate a move in the DOM
     * @param {Object} move
     */
    animate_html(move) {
        LS(`${move.from}${move.to}`);
        let color = this.high_color,
            node_from = this.nodes[move.from],
            node_to = this.nodes[move.to],
            prev = this.move2,
            size = this.high_size,
            high_style = `box-shadow: inset 0 0 ${size}em ${size}em ${color}`;

        if (prev) {
            Style(prev.node_from, 'box-shadow: none');
            Style(prev.node_to, 'box-shadow: none');
        }

        Style(node_from, high_style);
        Style(node_to, high_style);

        // remember the move + nodes
        move.node_from = node_from;
        move.node_to = node_to;
        this.move2 = move;
    }

    /**
     * Animate a move in text
     * @param {Object} move
     */
    animate_text(move) {
        LS(`${move.from}${move.to}`);
    }

    /**
     * Listen to clicking events
     * @param {function} callback
     */
    handle_hook(callback) {
        let that = this;

        // controls
        C('[data-x]', function() {
            let name = this.dataset.x;
            switch (name) {
            case 'copy':
                CopyClipboard(that.fen);
                Class(this, 'copied');
                add_timeout('fen', () => {Class(this, '-copied');}, 1000);
                break;
            case 'rotate':
                let smooth = that.smooth;
                that.smooth = false;
                that.rotate = (that.rotate + 1) % 2;
                that.dirty |= 3;
                that.render();
                that.smooth = smooth;
                break;
            default:
                callback(that, 'control', name);
            }
        }, this.node);

        // moving a piece by click
        C('.xmoves', e => {
            callback(that, 'move', e);
        });
        // TODO: remove, must replace with mouse/touch events
        Events('.xpiece', 'dragenter dragover dragexit dragleave drop', e => {
            callback(that, e.type, e);
        });
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
                icon = value.icon || name,
                title = value.title || '';

            if (class_)
                class_ = ` ${class_}`;
            if (typeof(value) == 'string')
                title = value;
            if (title)
                title = ` title="${title}"`;
            return `<vert class="control fcenter${class_}" data-x="${name}"><i data-svg="${icon}"${title}></i></vert>`;
        }).join('');

        HTML(this.node, [
            '<div class="xframe"></div>',
            '<grid class="xgrid"></grid>',
            '<div class="xpieces"></div>',
            `<hori class="xcontrol">${controls}</hori>`,
            `<div class="xmoves${this.history? '': ' dn'}"></div>`,
        ].join(''));

        // initialise the pieces to zero
        this.pieces = Assign({}, ...FIGURES.map(key => ({[key]: []})));

        this.analyse_fen();
        this.resize();
        update_svg();

        if (this.hook)
            this.handle_hook(this.hook);

        // TODO: remove
        Events(this.node, 'dragover', e => {
            e.preventDefault();
        });
    }

    /**
     * Add a new move
     * - faster than using set_fen, as it won't have to recompute everything
     * @param {Object} move
     */
    new_move(move) {
        this.move = move;
        // this.moves.push(move);
        this.animate(move);
    }

    /**
     * Output HTML or text to an element or the console
     * @param {string} text
     */
    output(text) {
        if (this.id == 'console')
            LS(text);
        else
            HTML('.xgrid', text, this.node);
    }

    /**
     * Render to the current target
     */
    render() {
        if (DEV.board & 1)
            LS(`render: ${this.dirty}`);
        let target = `render_${this.target}`;
        if (this[target]) {
            this[target]();
            this.animate(this.move);
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
                xpieces = _('div.xpieces', this.node);

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

                    if (found)
                        Style(node, `${transform} translate(${col * piece_size}px,${(7 - row) * piece_size}px);opacity:1`);
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
        this.dirty |= 2;
        this.render();
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
        if (render) {
            this.dirty |= 2;
            this.render();
        }
    }

    /**
     * Set the theme
     * @param {string[]} colors [light, dark]
     * @param {Object} theme
     * @param {string} theme_ext extension for the theme images
     * @param {number} theme_size square dimension in px
     * @param {string} high_color
     * @param {number} high_size
     */
    set_theme(colors, theme, theme_ext, theme_size, high_color, high_size) {
        if (DEV.board & 1)
            LS('set_theme');
        this.colors = colors;
        this.theme = theme;
        this.theme_ext = theme_ext;
        this.theme_size = theme_size;
        this.high_color = high_color;
        this.high_size = high_size;

        this.dirty = 3;
        this.render();
    }
}
