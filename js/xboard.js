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
Class, CreateNode, DEV, HTML, InsertNodes, LS, merge_settings, ON_OFF, Style, T
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
        this.colors = ['#9e7863', '#633526'];           // light, dark squares
        this.coords = {};
        this.dims = options.dims || [8, 8];             // num_col, num_row
        this.dirty = 7;                                 // &1: board, &2: notation, &4: pieces
        this.element = options.element;                 // output for HTML & text ('console' accepted too)
        this.fen = START_FEN;
        this.notation = options.notation || 0;          // 1:top cols, 2:bottom cols, 4:left rows, 8:right nows
        this.pieces = [];
        this.target = options.target || 'html';
        this.size = options.size || 16;

        this.analyse_fen();
        this.resize();
    }

    /**
     * Analyse the FEN and extract piece coordinates from it
     * - ideally do this only when starting a new game
     */
    analyse_fen() {
        let coords = {},
            pieces = this.pieces,
            rows = this.fen.split(' ')[0].split('/'),
            row_id = rows.length;

        pieces.length = 0;

        // parse all cells
        for (let row of rows) {
            let col = 1;
            for (let char of row.split('')) {
                // piece
                if (isNaN(char)) {
                    let coord =`${col}${row_id}`,
                        piece = {
                            char: char,
                            coord: [col, row_id],
                        };

                    pieces.push(piece);
                    coords[coord] = piece;
                    col ++;
                }
                // void
                else
                    col += parseInt(char);
            }

            row_id --;
        }

        this.coords = coords;
    }

    /**
     * Output HTML or text to an element or the console
     * @param {string} text
     */
    output(text) {
        let element = this.element;
        if (element == 'console')
            LS(text);
        else if (element)
            HTML(element, text);
    }

    /**
     * Render to the current target
     */
    render() {
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

        // column notation
        let columns = COLUMNS.slice(0, num_row),
            scolumn = columns.join(' ');

        // 1) draw empty board
        if (dirty & 1) {
            let lines = [];
            for (let i=0; i<num_row; i++) {
                for (let j=0; j<num_col; j++)
                    lines.push(`<div class="xsquare" style="background:${colors[(i + j) % 2]}"></div>`);
            }

            let style = '';
            if (num_col != 8)
                style = `grid-template-columns: repeat(${num_col}, 1fr)`;

            let html = `<div class="xgrid"${style}>${lines.join('\n')}</div>`;
            this.output(html);
        }

        // 2) draw notation
        if (dirty & 2) {
        // if (notation & 1)
        //     lines.push(`  ${scolumn}`);

        }

        // 3) draw pieces
        if (dirty & 4) {
            let nodes = [];

            for (let piece of this.pieces) {
                let char = piece.char,
                    coord = piece.coord,
                    node = piece.node;
                if (!node) {
                    let upper = char.toUpperCase();
                    char = (char == upper)? `w${upper}`: `b${upper}`;
                    node = CreateNode('div', `<img src="img/chesspieces/wikipedia/${char}.png">`);
                    nodes.push(node);

                    Class(node, 'xpiece');
                    piece.node = node;
                }

                Style(node, `transform:translate(${(coord[0] - 1) * size}px,${(8 - coord[1]) * size}px)`);
            }

            InsertNodes(this.element, nodes);
        }

        this.drawn = 7;
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

    // resize the board
    resize() {
        Style(this.element, `font-size:${this.size}px`);
    }

    /**
     * Set a new FEN
     * @param {string} fen
     * @param {boolean=} render
     */
    set_fen(fen, render) {
        if (fen == null)
            fen = START_FEN;
        this.fen = fen;
        this.analyse_fen();
        if (render)
            this.render();
    }
}
