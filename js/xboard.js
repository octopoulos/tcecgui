// xboard.js
// @author octopoulo <polluxyz@gmail.com>
// @version 2020-04-16
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
_, A, add_timeout, Assign, C, Class, CopyClipboard, CreateNode, DEV, Events, Floor, Hide, HTML, InsertNodes, Keys, LS,
merge_settings, ON_OFF, S, Show, Split, Style, T, update_svg, Upper
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
    LETTER_COLUMNS = Assign({}, ...COLUMN_LETTERS.map((letter, id) => ({[letter]: id}))),
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
        this.history = options.history;
        this.hook = options.hook;
        this.id = options.id;
        this.images = {};
        this.moves = [];                                // moves history
        this.node = _(this.id);
        this.notation = options.notation || 6;
        this.pieces = [];
        this.rotate = options.rotate || 0;
        this.size = options.size || 16;
        this.smooth = options.smooth;
        this.target = options.target || 'html';
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
            let col = 0;
            for (let char of row.split('')) {
                // piece
                if (isNaN(char)) {
                    let piece,
                        coord =`${COLUMN_LETTERS[col]}${row_id}`;

                    // reuse pieces (with piece.node) when possible
                    if (id < num_piece)
                        piece = pieces[id];
                    else {
                        piece = {};
                        pieces.push(piece);
                    }
                    Assign(piece, {
                        char: char,
                        coord: coord,
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
        this.moves.push(move);
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
            rotate = this.rotate,
            size = this.size;

        // 1) draw empty board + notation
        if (dirty & 1) {
            let lines = [],
                notation = this.notation;

            for (let i=0; i<num_row; i++)
                for (let j=0; j<num_col; j++) {
                    let note_x = '',
                        note_y = '',
                        even = (i + j) % 2,
                        style = '';

                    if (notation) {
                        style = `;color:${colors[1 - even]}`;
                        if (notation & 2) {
                            if (i == num_row - 1)
                                note_x = `<div class="xnote" style="left:2.67em;top:1.17em">${Upper(COLUMN_LETTERS[rotate? 7 - j: j])}</div>`;
                        }
                        if (notation & 4) {
                            if (j == rotate * 7)
                                note_y = `<div class="xnote" style="left:${rotate? 2.7: 0.1}em;top:-1.15em">${rotate? i + 1: 8 - i}</div>`;
                        }
                    }

                    lines.push(`<div class="xsquare" style="background:${colors[even]}${style}">${note_x}${note_y}</div>`);
                }

            this.output(lines.join(''));
        }

        // 3) draw pieces
        if (dirty & 2) {
            if (DEV.board & 1)
                LS(`render_html: num_piece=${this.pieces.length}`);
            let nodes = [],
                xpieces = _('div.xpieces', this.node);

            Class(xpieces, 'smooth', this.smooth);

            // create pieces / adjust their position
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
                    node = CreateNode('div', `<img src="${image}">`, {class: 'xpiece'});
                    nodes.push(node);
                    piece.node = node;
                }

                S(node, !dead);
                if (!dead) {
                    let x = LETTER_COLUMNS[coord[0]],
                        y = 8 - coord[1];

                    if (rotate) {
                        x = 7 - x;
                        y = 7 - y;
                    }
                    Style(node, `transform:translate(${x * size}px,${y * size}px)`);
                }
            }

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
        let lines = [],
            notation = (this.id == 'console')? this.notation: 0,
            num_col = this.dims[0],
            rows = this.fen.split(' ')[0].split('/'),
            row_id = rows.length;

        // column notation
        let scolumn = COLUMN_LETTERS.slice(0, num_col).join(' ');
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
                        vector.push(((row_id + col) % 2)? ' ': '·');
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
            num_col = this.dims[0],
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
     * @param {Object} images {wB: ...}
     */
    set_theme(colors, images) {
        if (DEV.board & 1)
            LS('set_theme');
        this.colors = colors;
        this.images = images;
        this.dirty = 3;
        this.render();
    }
}
