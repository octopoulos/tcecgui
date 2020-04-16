// xboard.js
// @author octopoulo <polluxyz@gmail.com>
// @version 2020-04-16
//
// game board:
// - 4 rendering targets:
//      - 3d
//      - canvas
//      - html
//      + text
// - games:
//      - chess
//      - chess960
//      - go (future)
//
// included after: common, engine, global, 3d
/*
globals
DEV, HTML, LS, T
*/
'use strict';

let COLUMNS = 'abcdefghijklmnopqrst'.split(''),
    // https://en.wikipedia.org/wiki/Forsyth%E2%80%93Edwards_Notation
    // KQkq is also supported instead of AHah
    START_POSITION = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w AHah - 0 1';

class XBoard {
    /**
     * Constructor
     * @param {Object} options
     */
    constructor(options={}) {
        LS('Board');
        LS(options);

        this.dims = options.dims || [8, 8];
        this.element = options.element;                 // output for HTML & text ('console' accepted too)
        this.fen = START_POSITION;
        this.notation = options.notation || 0;          // 1:top cols, 2:bottom cols, 4:left rows, 8:right nows
        this.target = options.target || 'html';
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
        LS('render_html');
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
            let vector = [];

            if (notation & 4)
                vector.push(`${row_id}`);

            for (let char of row.split('')) {
                // piece
                if (isNaN(char)) {
                    vector.push(char);
                }
                // void
                else {
                    for (let i=0; i<parseInt(char); i++)
                        vector.push('.');
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
        let element = this.element,
            text = lines.join('\n');
        if (element == 'console')
            LS(text);
        else if (element)
            HTML(element, text);

        return text;
    }

    /**
     * Set a new FEN
     * @param {string} fen
     * @param {boolean=} render
     */
    set_fen(fen, render) {
        this.fen = fen;
        if (render)
            this.render();
    }
}
