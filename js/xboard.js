// xboard.js
// @author octopoulo <polluxyz@gmail.com>
// @version 2020-04-16
//
// game board:
// - 4 rendering targets:
//      - 3d
//      - canvas
//      ~ html
//      + text
// - games:
//      ~ chess
//      - chess960
//      - go (future)
//
// included after: common, engine, global, 3d
/*
globals
_, A, Assign, Class, CreateNode, DEV, Floor, HTML, InsertNodes, LS, merge_settings, ON_OFF, S, Style, T, Upper
*/
'use strict';

let COLUMNS = 'abcdefghijklmnopqrst'.split(''),
    // https://en.wikipedia.org/wiki/Forsyth%E2%80%93Edwards_Notation
    // KQkq is also supported instead of AHah
    START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w AHah - 0 1';

class XBoard {
    /**
     * Constructor
     * @param {Object} options
     */
    constructor(options={}) {
        this.border = options.border | 2;               // frame size
        this.colors = ['#eee', '#111'];                 // light, dark squares
        this.coords = {};
        this.dims = options.dims || [8, 8];             // num_col, num_row
        this.dirty = 7;                                 // &1: board, &2: notation, &4: pieces
        this.fen = START_FEN;
        this.history = [];
        this.images = {};
        this.node = _(options.node);                    // output for HTML & text ('console' accepted too)
        this.notation = options.notation || 0;          // 1:top cols, 2:bottom cols, 4:left rows, 8:right nows
        this.pieces = [];
        this.target = options.target || 'html';
        this.size = options.size || 16;
    }

    /**
     * Analyse the FEN and extract piece coordinates from it
     * - ideally do this only when starting a new game
     */
    analyse_fen() {
        let coords = {},
            id = 0,
            pieces = this.pieces,
            num_piece = pieces.length,
            rows = this.fen.split(' ')[0].split('/'),
            row_id = rows.length;

        // parse all cells
        for (let row of rows) {
            let col = 1;
            for (let char of row.split('')) {
                // piece
                if (isNaN(char)) {
                    let piece,
                        coord =`${col}${row_id}`;

                    // reuse pieces (with piece.node) when possible
                    if (id < num_piece)
                        piece = pieces[id];
                    else {
                        piece = {};
                        pieces.push(piece);
                    }
                    Assign(piece, {
                        char: char,
                        coord: [col, row_id],
                        flag: 0,                        // &1: dead
                    });

                    coords[coord] = piece;
                    id ++;
                    col ++;
                }
                // void
                else
                    col += parseInt(char);
            }
            row_id --;
        }

        // hide every other piece
        if (DEV.board & 1)
            LS(`analyse_fen: id=${id} : num_piece=${num_piece}`);
        for (; id<num_piece; id++)
            pieces[id].flag = 1;

        this.coords = coords;
    }

    /**
     * Initialise the board
     * - must be run before doing anything with it
     */
    initialise() {
        // create elements
        HTML(this.node, '<div class="xframe"></div><div class="xgrid"></div><pieces></pieces>');

        this.analyse_fen();
        this.resize();
    }

    /**
     * Add a new move
     * - faster than using set_fen, as it won't have to recompute everything
     * @param {Object} move
     */
    new_move(move) {

    }

    /**
     * Output HTML or text to an element or the console
     * @param {string} text
     */
    output(text) {
        let node = this.node;
        if (!node)
            LS(text);
        else if (node)
            HTML(_('div.xgrid', node), text);
    }

    /**
     * Render to the current target
     */
    render() {
        if (DEV.board & 1)
            LS(`render: ${this.dirty}`);
        let target = `render_${this.target}`;
        if (this[target])
            this[target]();
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
            [num_col, num_row] = this.dims,
            size = this.size;

        // 1) draw empty board
        if (dirty & 1) {
            let lines = [];
            for (let i=0; i<num_row; i++)
                for (let j=0; j<num_col; j++)
                    lines.push(`<div class="xsquare" style="background:${colors[(i + j) % 2]}"></div>`);

            let style = '';
            if (num_col != 8)
                style = `grid-template-columns: repeat(${num_col}, 1fr)`;

            this.output(lines.join('\n'));
        }

        // 2) draw notation
        if (dirty & 2) {
        // if (notation & 1)
        //     lines.push(`  ${scolumn}`);

        }

        // 3) draw pieces
        if (dirty & 4) {
            if (DEV.board & 1)
                LS(`render_html: num_piece=${this.pieces.length}`);
            let nodes = [];

            for (let piece of this.pieces) {
                let char = piece.char,
                    dead = (piece.flag & 1),
                    coord = piece.coord,
                    node = piece.node,
                    upper = Upper(char),
                    image = this.images[(char == upper)? `w${upper}`: `b${upper}`];

                if (node)
                    node.firstElementChild.src = image;
                else {
                    node = CreateNode('div', `<img src="${image}">`);
                    nodes.push(node);
                    Class(node, 'xpiece');
                    piece.node = node;
                }

                S(node, !dead);
                if (!dead)
                    Style(node, `transform:translate(${(coord[0] - 1) * size}px,${(8 - coord[1]) * size}px)`);
            }

            if (DEV.board & 1)
                LS(_('pieces', this.node));
            InsertNodes(_('pieces', this.node), nodes);
        }

        this.dirty = 0;
    }

    /**
     * 2d text rendering
     */
    render_text() {
        let lines = [],
            notation = this.notation,
            rows = this.fen.split(' ')[0].split('/'),
            row_id = rows.length;

        // column notation
        let scolumn = COLUMNS.slice(0, this.dims[0]).join(' ');
        if (notation & 1)
            lines.push(`  ${scolumn}`);

        // parse all cells
        for (let row of rows) {
            let col = 1,
                vector = [];

            if (notation & 4)
                vector.push(`${row_id}`);

            for (let char of row.split('')) {
                // piece
                if (isNaN(char)) {
                    vector.push(char);
                    col ++;
                }
                // void
                else {
                    for (let i=0; i<parseInt(char); i++) {
                        vector.push(((row_id + col) % 2)? ' ': '.');
                        col ++;
                    }
                }
            }

            if (notation & 8)
                vector.push(`${row_id}`);

            lines.push(vector.join(' '));
            row_id --;
        }

        if (notation & 2)
            lines.push(`  ${scolumn}`);

        // output result
        let text = lines.join('\n');
        this.output(`<pre>${text}</pre>`);
        return text;
    }

    /**
     * Resize the board to a desired width
     * @param {number} width
     */
    resize(width) {
        let border = this.border,
            size = Floor((width - border * 2) * 2 / this.dims[0]) / 2,
            frame_size = size * this.dims[0] + border * 2;

        Style(this.node, `font-size:${size}px`);
        Style('div.xframe', `height:${frame_size}px;left:-${border}px;top:-${border}px;width:${frame_size}px`, true, this.node);

        this.size = size;
        this.dirty |= 4;
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
            this.dirty |= 4;
            this.render();
        }
    }

    /**
     * Set the theme
     * @param {string[]} colors [light, dark]
     * @param {Object} images {wB: ...}
     */
    set_theme(colors, images) {
        if (DEV.board & 1)
            LS('set_theme');
        this.colors = colors;
        this.images = images;
        this.dirty = 5;
        this.render();
    }
}
