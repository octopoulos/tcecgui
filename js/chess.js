// chess.js
// @author octopoulo <polluxyz@gmail.com>
// @version 2020-09-16
// - fast javascript implementation, 20x faster than original
// - FRC support
/*
globals
Assign, DefaultInt, exports, Floor, From, global, Lower, LS, Max, Min, require, SetDefault, Undefined
*/
'use strict';

// <<
if (typeof global != 'undefined') {
    let req = require,
        {Assign, DefaultInt, Floor, From, Lower, LS, Max, Min, SetDefault, Undefined} = req('./common');
    Assign(global, {
        Assign: Assign,
        DefaultInt: DefaultInt,
        Floor: Floor,
        From: From,
        Lower: Lower,
        LS: LS,
        Max: Max,
        Min: Min,
        SetDefault: SetDefault,
        Undefined: Undefined,
    });
}
// >>

// specific
let F32 = array => new Float32Array(array),
    I8 = array => new Int8Array(array),
    I32 = array => new Int32Array(array),
    U8 = array => new Uint8Array(array);

// defines
let BISHOP = 3,
    BITS_NORMAL = 1,
    BITS_CAPTURE = 2,
    BITS_BIG_PAWN = 4,
    BITS_EP_CAPTURE = 8,
    BITS_PROMOTION = 16,
    BITS_KSIDE_CASTLE = 32,
    BITS_QSIDE_CASTLE = 64,
    BITS_CASTLE = 32 + 64,
    BLACK = 1,
    COLOR = piece => piece >> 3,
    COLOR_TEXT = 'wb',
    COLORIZE = (color, type) => (type + (color << 3)),
    DEFAULT_POSITION = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    EMPTY = -1,
    FILE = square => square & 15,
    KING = 6,
    KNIGHT = 2,
    PAWN = 1,
    PIECE_LOWER = ' pnbrqk  pnbrqk',
    PIECE_NAMES = ' PNBRQK  pnbrqk',
    PIECE_UPPER = ' PNBRQK  PNBRQK',
    QUEEN = 5,
    RANK = square => square >> 4,
    ROOK = 4,
    SQUARE_A8 = 0,
    SQUARE_H1 = 119,
    TYPE = piece => piece & 7,
    // UNICODES = '⭘♟♞♝♜♛♚⭘♙♘♗♖♕♔',
    WHITE = 0;

// tables
let PAWN_OFFSETS = [
        I8([-17, -16, -15]),
        I8([17, 16, 15]),
    ],
    // move ordering
    PIECE_CAPTURES = I32([
        0,
        20100,      // P
        20300,      // N
        20300,      // B
        20500,      // R
        20900,      // Q
        32800,      // K
        0,
        0,
        20100,      // p
        20300,      // n
        20300,      // b
        20500,      // r
        20900,      // q
        32800,      // k
        0,
    ]),
    // for move generation
    PIECE_DIRS = [
        [],
        [],
        [],
        I8([1, 4, 1, 4]),
        I8([2, 8, 2, 8]),
        I8([1, 2, 4, 8, 1, 2, 4, 8]),
        I8([1, 2, 4, 8, 1, 2, 4, 8]),
    ],
    PIECE_OFFSETS = [
        [],
        [],
        I8([-18, -33, -31, -14,  18, 33, 31, 14]),
        I8([-17, -15,  17,  15]),
        I8([-16,   1,  16,  -1]),
        I8([-17, -16, -15,   1,  17, 16, 15, -1]),
        I8([-17, -16, -15,   1,  17, 16, 15, -1]),
    ],
    // move ordering
    PIECE_ORDERS = I8([
        0,
        4,          // P
        1,          // N
        1,          // B
        2,          // R
        3,          // Q
        5,          // K
        0,
        0,
        4,          // p
        1,          // n
        1,          // b
        2,          // r
        3,          // q
        5,          // k
        0,
    ]),
    // material eval
    PIECE_SCORES = I32([
        0,
        100,        // P
        300,        // N
        300,        // B
        500,        // R
        900,        // Q
        12800,      // K
        0,
        0,
        100,        // p
        300,        // n
        300,        // b
        500,        // r
        900,        // q
        12800,      // k
        0,
    ]),
    PROMOTE_SCORES = I32([
        0,
        0,          // P
        200,        // N
        200,        // B
        400,        // R
        800,        // Q
        11800,      // K
        0,
        0,
        0,          // p
        200,        // n
        200,        // b
        400,        // r
        800,        // q
        11800,      // k
        0,
    ]);

let MOBILITY_SCORES = F32([
        0,
        1,          // P
        6,          // N
        3,          // B
        3,          // R
        0.3,        // Q
        0,          // K
        0,
        0,
        1,          // p
        6,          // n
        3,          // b
        3,          // r
        0.3,        // q
        0,          // k
        0,
    ]);

// extras
let EVAL_MODES = {
        'hce': 1 + 2,
        'mat': 1,
        'mob': 2,
        'nn': 1 + 2 + 8,
        'null': 0,
        'qui': 1 + 2 + 4,
    },
    // piece names for print
    PIECES = {
        b: 11,
        B: 3,
        k: 14,
        K: 6,
        n: 10,
        N: 2,
        p: 9,
        P: 1,
        q: 13,
        Q: 5,
        r: 12,
        R: 4,
    },
    SEARCH_MODES = {
        'ab': 2,
        'mm': 1,
        'rnd': 0,
    },
    SQUARES = {
        a8:   0, b8:   1, c8:   2, d8:   3, e8:   4, f8:   5, g8:   6, h8:   7,
        a7:  16, b7:  17, c7:  18, d7:  19, e7:  20, f7:  21, g7:  22, h7:  23,
        a6:  32, b6:  33, c6:  34, d6:  35, e6:  36, f6:  37, g6:  38, h6:  39,
        a5:  48, b5:  49, c5:  50, d5:  51, e5:  52, f5:  53, g5:  54, h5:  55,
        a4:  64, b4:  65, c4:  66, d4:  67, e4:  68, f4:  69, g4:  70, h4:  71,
        a3:  80, b3:  81, c3:  82, d3:  83, e3:  84, f3:  85, g3:  86, h3:  87,
        a2:  96, b2:  97, c2:  98, d2:  99, e2: 100, f2: 101, g2: 102, h2: 103,
        a1: 112, b1: 113, c1: 114, d1: 115, e1: 116, f1: 117, g1: 118, h1: 119
    };

let NULL_MOVE = {
    capture: 0,
    flags: 0,
    from: 0,
    m: '',
    piece: 0,
    promote: 0,
    to: 0,
};

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// chess class
var Chess = function(fen_) {
    // PRIVATE
    //////////

    let avg_depth = 0,
        board = U8(128),
        castling = I32(4).fill(EMPTY),
        cur_ply = -1,
        ep_square = EMPTY,
        eval_mode = 1,                      // 0:null, &1:mat, &2:hc2, &4:qui, &8:nn
        fen = '',
        frc = false,
        half_moves = 0,
        idepth = 0,                         // positive depth = max_depth - depth
        interpose = U8(128),                // check path, can interpose a piece there
        kings = I32(2).fill(EMPTY),
        materials = I32(2),
        max_depth = 4,
        max_nodes = 1e9,
        max_quiesce = 5,
        max_time = 60,
        mobilities = U8(16),
        move_number = 1,
        nodes = 0,
        pins = U8(128),
        ply = -1,
        ply_states = [],
        search_mode = 0,                    // 1:minimax, 2:alpha-beta
        sel_depth = 0,
        turn = WHITE;

    /**
     * Add a single move
     */
    function addMove(moves, piece, from, to, flags, promote, value) {
        let capture = 0;
        if (!(flags & BITS_CASTLE)) {
            if (value)
                capture = TYPE(value);
            else if (flags & BITS_EP_CAPTURE)
                capture = PAWN;
        }
        moves.push({
            capture: capture,
            flags: flags,
            from: from,
            m: '',
            piece: piece,
            promote: promote,
            to: to,
        });

        if (!promote)
            mobilities[piece] ++;
    }

    /**
     * Add a pawn move + promote moves
     */
    function addPawnMove(moves, piece, from, to, flags, value) {
        let rank = RANK(to);
        if ((rank % 7) == 0) {
            for (let promote = QUEEN; promote >= KNIGHT; promote --)
                addMove(moves, piece, from, to, flags | BITS_PROMOTION, promote, value);
            mobilities[piece] ++;
        }
        else
            addMove(moves, piece, from, to, flags, 0, value);
    }

    /**
     * Add a ply state
     * @param {Object} move
     */
    function addState(move) {
        let state = SetDefault(ply_states, ply + 1, []);
        state[0] = castling.slice();
        state[1] = ep_square;
        state[2] = half_moves;
        state[3] = kings.slice();
        state[4] = move;
    }

    /**
     * Alpha beta tree search
     * @param {number} depth
     * @param {number} alpha
     * @param {number} beta
     * @returns {number}
     */
    function alphaBeta(depth, alpha, beta) {
        if (depth <= 0) {
            nodes ++;
            return (eval_mode & 4)? quiesce(max_quiesce, alpha, beta): evaluate();
        }

        // setup
        let best = -99999;

        idepth = max_depth + 1 - depth;
        if (idepth > avg_depth)
            avg_depth = idepth;

        // check all moves
        let moves = createMoves(frc, false),
            num_move = moves.length;

        // mat + stalemate
        if (!num_move) {
            if (kingAttacked(2))
                best = -51200 + idepth * 4000;
            else
                best = 0;
        }
        else {
            for (let move of moves) {
                moveRaw(move);
                let score = -alphaBeta(depth - 1, -beta, -alpha);
                undoMove();

                if (score >= beta)
                    return beta;
                if (score > best) {
                    best = score;
                    if (score > alpha)
                        alpha = score;
                }

                // checkmate found
                if (idepth >= 3 && score > 20000)
                    break;
            }
        }
        return best;
    }

    /**
     * Move ordering for alpha-beta
     * - captures
     * - castle
     * - nb/r/q/r/p
     */
    function compareMoves(a, b) {
        if (a.capture || b.capture)
            return (PIECE_CAPTURES[b.capture] - PIECE_CAPTURES[a.capture]) * 10 + PIECE_SCORES[a.piece] - PIECE_SCORES[b.piece];
        let castle = !!(b.flags & BITS_CASTLE) - !!(a.flags & BITS_CASTLE);
        if (castle)
            return castle;
        if (a.promote || b.promote)
            return b.promote - a.promote;
        let aorder = PIECE_ORDERS[a.piece],
            border = PIECE_ORDERS[b.piece];
        if (aorder == border) {
            // more advanced pawn => higher priority
            if (aorder == 4)
                return COLOR(a.piece)? (RANK(b.to) - RANK(a.to)): (RANK(a.to) - RANK(b.to));
            return 0;
        }
        return aorder - border;
    }

    /**
     * Uniquely identify ambiguous moves
     * https://github.com/jhlywa/chess.js
     * @param {Object} move
     * @param {Object[]} moves
     * @returns {string}
     */
    function disambiguate(move, moves) {
        let ambiguities = 0,
            from = move.from,
            same_file = 0,
            same_rank = 0,
            to = move.to,
            type = TYPE(move.piece);

        for (let move2 of moves) {
            let ambig_from = move2.from,
                ambig_to = move2.to;

            // if a move of the same piece type ends on the same to square,
            // we'll need to add a disambiguator to the algebraic notation
            if (type == TYPE(move2.piece) && from != ambig_from && to == ambig_to) {
                ambiguities ++;

                if (RANK(from) == RANK(ambig_from))
                    same_rank ++;
                if (FILE(from) == FILE(ambig_from))
                    same_file ++;
            }
        }

        if (!ambiguities)
            return "";

        let an = squareToAn(from, false);
        if (same_rank > 0 && same_file > 0)
            return an;
        else
            return an[(same_file > 0)? 1: 0];
    }

    /**
     * Mini max tree search
     * @param {number} depth
     * @returns {number}
     */
    function miniMax(depth) {
        if (depth <= 0) {
            nodes ++;
            return evaluate();
        }

        // setup
        let best = -99999;

        idepth = max_depth + 1 - depth;
        if (idepth > avg_depth)
            avg_depth = idepth;

        // check all moves
        let moves = createMoves(frc, false),
            num_move = moves.length;

        // mat + stalemate
        if (!num_move) {
            if (kingAttacked(2))
                best = -51200 + idepth * 4000;
            else
                best = 0;
        }
        else {
            for (let move of moves) {
                moveRaw(move);
                let score = -miniMax(depth - 1);
                undoMove();

                if (score > best)
                    best = score;

                // checkmate found
                if (idepth >= 3 && score > 20000)
                    break;
            }
        }
        return best;
    }

    /**
     * Get the move list
     * @returns {string}
     */
    function moveList() {
        let lines = [];
        for (let i = cur_ply; i <= ply; i ++) {
            let state = ply_states[i];
            lines.push(ucify(state[4]));
        }
        return lines.join(' ');
    }

    /**
     * Null search, used by perft
     * @param {number} depth
     */
    function nullSearch(depth) {
        if (depth <= 0) {
            nodes ++;
            return;
        }

        let moves = createMoves(frc, false);
        // speed-up
        if (depth <= 1) {
            nodes += moves.length;
            return;
        }
        for (let move of moves) {
            moveRaw(move);
            nullSearch(depth - 1);
            undoMove();
        }
    }

    /**
     * Quiescence search
     * https://www.chessprogramming.org/Quiescence_Search
     */
    function quiesce(depth, alpha, beta) {
        let stand = evaluate();
        if (depth <= 0)
            return stand;
        if (stand >= beta)
            return beta;
        if (stand > alpha)
            alpha = stand;

        idepth = max_quiesce + 1 - depth;
        if (idepth > sel_depth)
            sel_depth = idepth;

        let moves = createMoves(frc, true);
        for (let move of moves) {
            moveRaw(move);
            let score = -quiesce(depth - 1, -beta, -alpha);
            undoMove();

            if (score >= beta)
                return beta;
            if (score > alpha)
                alpha = score;
        }
        return alpha;
    }

    // PUBLIC
    /////////

    /**
     * Convert AN to square
     * - 'a' = 97
     * - '8' = 56
     * @param {string} an c2
     * @returns {number} 98
     */
    function anToSquare(an) {
        if (an.length < 2)
            return EMPTY;
        let file = an[0].charCodeAt(0) - 97,
            rank = 56 - an[1].charCodeAt(0);
        return file + (rank << 4);
    }

    /**
     * Check if a square is attacked by a color
     * @param {number} color attacking color
     * @param {number} square
     * @returns {boolean} true if the square is attacked
     */
    function attacked(color, square) {
        // knight
        let target = COLORIZE(color, KNIGHT);
        for (let offset of PIECE_OFFSETS[KNIGHT]) {
            let pos = square + offset;
            if (pos & 0x88)
                continue;
            if (board[pos] == target)
                return true;
        }

        // bishop + pawn + rook + queen
        let offsets = PIECE_OFFSETS[QUEEN];
        for (let j = 0; j < 8; j ++) {
            let offset = offsets[j],
                pos = square,
                target = BISHOP + (j & 1);

            for (let k = 0; ; k ++) {
                pos += offset;
                if (pos & 0x88)
                    break;

                let value = board[pos];
                if (!value)
                    continue;
                if (COLOR(value) != color)
                    break;

                let piece_type = TYPE(value);
                if (piece_type == QUEEN || piece_type == target)
                    return true;
                if (k == 0) {
                    if (piece_type == KING)
                        return true;
                    if (target == BISHOP && piece_type == PAWN) {
                        if (color == ((j < 4)? BLACK: WHITE))
                            return true;
                    }
                }
                break;
            }
        }

        return false;
    }

    /**
     * Remove decorators from the SAN
     * @param {string} san Bxe6+!!
     * @returns {string} clean san Bxe6
     */
    function cleanSan(san) {
        return san.replace(/=/, '').replace(/[+#]?[?!]*$/, '');
    }

    /**
     * Clear the board
     */
    function clear() {
        avg_depth = 0;
        board.fill(0);
        castling.fill(EMPTY);
        cur_ply = -1;
        ep_square = EMPTY;
        fen = "";
        half_moves = 0;
        idepth = 0;
        kings.fill(EMPTY);
        materials.fill(0);
        mobilities.fill(0);
        move_number = 1;
        nodes = 0;
        ply = -1;
        ply_states.length = 0;
        sel_depth = 0;
        turn = WHITE;
    }

    /**
     * Configure parameters
     * @param {boolean} frc_
     * @param {string} options
     * @param {number} depth
     */
    function configure(frc_, options, depth) {
        eval_mode = 1;
        frc = frc_;
        if (depth >= 0)
            max_depth = depth;
        max_nodes = 1e9;
        max_quiesce = 5;
        max_time = 0;
        search_mode = 0;

        // parse the line
        for (let option of options.split(' ')) {
            if (option.length < 3 || option[1] != '=')
                continue;
            let left = option[0],
                right = option.slice(2),
                value = right * 1;
            switch (left) {
            case 'd':
                if (value >= 0)
                    max_depth = value;
                else if (value < 0)
                    max_time = -value;
                break;
            case 'e': {
                    let eit = EVAL_MODES[right];
                    if (eit != undefined)
                        eval_mode = eit;
                }
                break;
            case 'n':
                max_nodes = value;
                break;
            case 'q':
                max_quiesce = value;
                break;
            case 's': {
                    let sit = SEARCH_MODES[right];
                    if (sit != undefined)
                        search_mode = sit;
                }
                break;
            case 't':
                max_time = value;
                break;
            }
        }
    }

    /**
     * Count the piece mobilities
     * @returns {number[]}
     */
    function countMobilities() {
        mobilities.fill(0);

        for (let i = SQUARE_A8; i <= SQUARE_H1; i ++) {
            // off board
            if (i & 0x88) {
                i += 7;
                continue;
            }

            let piece = board[i];
            if (!piece)
                continue;

            let piece_type = TYPE(piece),
                us = COLOR(piece),
                them = us ^ 1;

            if (piece_type == PAWN) {
                let offsets = PAWN_OFFSETS[us];

                // single square, non-capturing
                let square = i + offsets[1];
                if (!board[square]) {
                    mobilities[piece] ++;

                    // double square
                    square += offsets[1];
                    if (6 - us * 5 == RANK(i) && !board[square])
                        mobilities[piece] ++;
                }

                // pawn captures
                for (let j = 0; j < 3; j += 2) {
                    square = i + offsets[j];
                    if (square & 0x88)
                        continue;

                    if (board[square] && COLOR(board[square]) == them)
                        mobilities[piece] ++;
                    else if (square == ep_square)
                        mobilities[piece] ++;
                }
            }
            else {
                let offsets = PIECE_OFFSETS[piece_type];
                for (let j = 0; j < 8; j ++) {
                    let offset = offsets[j],
                        square = i;
                    if (!offset)
                        break;

                    while (true) {
                        square += offset;
                        if (square & 0x88)
                            break;

                        if (!board[square])
                            mobilities[piece] ++;
                        else {
                            if (COLOR(board[square]) == us)
                                break;
                            mobilities[piece] ++;
                            break;
                        }

                        // break if knight or king
                        if (piece_type == KING || piece_type == KNIGHT)
                            break;
                    }
                }
            }
        }
    }

    /**
     * Create the FEN
     * @returns {string} fen
     */
    function createFen() {
        let empty = 0;
        fen = "";

        for (let i = SQUARE_A8; i <= SQUARE_H1; i ++) {
            let piece = board[i];
            if (!piece)
                empty ++;
            else {
                if (empty > 0) {
                    fen += empty;
                    empty = 0;
                }
                fen += PIECE_NAMES[piece];
            }

            // off board
            if ((i + 1) & 0x88) {
                if (empty > 0)
                    fen += empty;
                if (i != SQUARE_H1)
                    fen += '/';

                empty = 0;
                i += 8;
            }
        }

        let castle = '';
        if (frc) {
            for (let square of castling)
                if (square != EMPTY) {
                    let file = FILE(square),
                        rank = RANK(square);
                    if (rank > 0)
                        castle += 'ABCDEFGHIJ'[file];
                    else
                        castle += 'abcdefghij'[file];
                }
        }
        else {
            if (castling[0] != EMPTY) castle += 'K';
            if (castling[1] != EMPTY) castle += 'Q';
            if (castling[2] != EMPTY) castle += 'k';
            if (castling[3] != EMPTY) castle += 'q';
        }

        // empty castling flag?
        castle = castle || '-';
        let epflags = (ep_square == EMPTY)? '-': squareToAn(ep_square, false);

        return [fen, COLOR_TEXT[turn], castle, epflags, half_moves, move_number].join(' ');
    }

    /**
     * Create a Fischer Random 960 FEN
     * http://www.russellcottrell.com/Chess/Chess960.htm
     * @param {number} index between 0 and 959
     * @returns {string}
     */
    function createFen960(index) {
        if (index < 0 || index >= 960)
            return '';

        let i, n1, n2, q,
            line = new Array(8).fill(' ');

        line[(index % 4) * 2 + 1] = 'B';
        index = Floor(index / 4);
        line[(index % 4) * 2] = 'B';
        index = Floor(index / 4);
        q = index % 6;
        index = Floor(index / 6);

        for (n1 = 0; n1 < 4; n1 ++) {
            n2 = index + Floor(((3 - n1) * (4 - n1)) / 2) - 5;
            if (n1 < n2 && n2 > 0 && n2 < 5)
                break;
        }

        // queen
        for (i = 0; i < 8; i ++)
            if (line[i] == ' ') {
                if (!q) {
                    line[i] = 'Q';
                    break;
                }
                q --;
            }

        // knights
        for (i = 0; i < 8; i ++)
            if (line[i] == ' ') {
                if (!n1 || !n2)
                    line[i] = 'N';
                n1 --;
                n2 --;
            }

        // rook - king - rook
        let rooks = '';
        i = 7;
        for (let type of "RKR")
            for (; i >= 0; i --) {
                if (line[i] == ' ') {
                    line[i] = type;
                    if (type == 'R')
                        rooks += 'ABCDEFGHIJ'[i];
                    break;
                }
            }

        line = line.join('');
        return `${Lower(line)}/pppppppp/8/8/8/8/PPPPPPPP/${line} w ${rooks}${Lower(rooks)} - 0 1`;
    }

    /**
     * Create the moves
     * @param {boolen} frc Fisher Random Chess
     * @param {boolean} only_capture
     * @returns {Object[]} moves
     */
    function createMoves(frc, only_capture) {
        let moves = [],
            second_rank = 6 - turn * 5,
            us = turn,
            us8 = us << 3,
            them = us ^ 1;

        for (let i = us8; i < us8 + 8; i ++)
            mobilities[i] = 0;

        // 1) find pinned pieces + check positions/paths
        // \: 1, |:2, /:4, _:8
        interpose.fill(0);
        pins.fill(0);

        let checks = 0,
            dirs = PIECE_DIRS[QUEEN],
            inter = 0,
            interpose_ep = EMPTY,
            king = kings[us],
            offsets = PIECE_OFFSETS[QUEEN];

        // 1.a) check knight
        let target = COLORIZE(them, KNIGHT);
        for (let offset of PIECE_OFFSETS[KNIGHT]) {
            let square = king + offset;
            if (square & 0x88)
                continue;
            if (board[square] == target) {
                checks ++;
                interpose[square] = 1;
                inter = 1;
            }
        }

        // 1.b) check 8 directions => pawn/bishop/rook/queen
        for (let j = 0; j < 8; j ++) {
            let offset = offsets[j],
                first = king + offset,
                pin = 0,                    // no need to be EMPTY because square 0 can never be pinned
                square = first,
                target = BISHOP + (j & 1);

            // a) 1 square away
            if (square & 0x88)
                continue;

            let value = board[square];
            if (value) {
                if (COLOR(value) == us) {
                    if (pin)
                        continue;
                    pin = square;
                }
                else {
                    let piece_type = TYPE(value);
                    if (piece_type == QUEEN || piece_type == target) {
                        interpose[square] = 1;
                        inter = 1;
                        checks ++;
                    }
                    else if (target == BISHOP && piece_type == PAWN) {
                        if ((j < 4 && them == BLACK) || (j >= 4 && them == WHITE)) {
                            interpose[square] = 1;
                            inter = 1;
                            if (ep_square) {
                                // not interpose[] because only pawns can take this square
                                // ex: 8/5p2/8/2k3P1/1P6/8/4K3/n7 b - b3 0 4
                                interpose_ep = ep_square;
                                inter ++;
                            }
                            checks ++;
                        }
                    }
                    continue;
                }
            }

            // b) 2+ squares away
            for (let k = 1; ; k ++) {
                square += offset;
                if (square & 0x88)
                    break;

                let value = board[square];
                if (!value)
                    continue;

                if (COLOR(value) == us) {
                    if (pin)
                        break;
                    pin = square;
                }
                else {
                    let piece_type = TYPE(value);
                    if (k == 1 && piece_type == KING)
                        pins[first] |= 16;
                    else if (piece_type == QUEEN || piece_type == target) {
                        if (pin)
                            pins[pin] |= dirs[j];
                        else {
                            if (!checks) {
                                for (let i = 0, square2 = square; i <= k; i ++, square2 -= offset)
                                    interpose[square2] = 1;
                                inter = k + 1;
                            }
                            checks ++;
                            pins[first] |= 16;
                        }
                    }
                    break;
                }
            }
        }
        // LS(`checks=${checks} : inter=${inter} : interpose=${From(interpose).map(x => squareToAn(x)).join(' ')}`);
        // LS(From(pins).map((pin, id) => [pin, id]).filter(pin => pin[0]).map(pin => `${squareToAn(pin[1])}:${pin[0]}`).join(' '));

        // 2) collect king moves
        let piece = board[king];
        for (let offset of PIECE_OFFSETS[KING]) {
            let square = king + offset;
            if (square & 0x88)
                continue;

            // already in check + moving towards bishop/rook/queen? (found while finding pins)
            if (pins[square] & 16)
                continue;

            let value = board[square];
            if (!value) {
                if (!only_capture) {
                    board[king] = 0;
                    if (!attacked(them, square))
                        addMove(moves, piece, king, square, BITS_NORMAL, 0, 0);
                    board[king] = piece;
                }
            }
            else if (COLOR(value) != us) {
                board[king] = 0;
                if (!attacked(them, square))
                    addMove(moves, piece, king, square, BITS_CAPTURE, 0, value);
                board[king] = piece;
            }
        }

        // 2+ checks => king must escape, other pieces cannot help
        if (checks > 1) {
            if (search_mode == 2)
                orderMoves(moves);
            return moves;
        }

        // 3) collect non king moves
        // - if king is attacked, then the piece must capture the attacker or interpose itself
        pins[king] |= 32;
        for (let i = SQUARE_A8; i <= SQUARE_H1; i ++) {
            // off board
            if (i & 0x88) {
                i += 7;
                continue;
            }

            let piece = board[i],
                pin = pins[i];
            if (!piece || (pin & 32) || COLOR(piece) != us)
                continue;
            pin &= 15;

            let piece_type = TYPE(piece);
            // pawn
            if (piece_type == PAWN) {
                let offsets = PAWN_OFFSETS[us];

                // single square, non-capturing
                if (!only_capture && !(pin & (1 + 4 + 8))) {
                    let square = i + offsets[1];
                    if (!board[square]) {
                        if (!inter || interpose[square])
                            addPawnMove(moves, piece, i, square, BITS_NORMAL, 0);

                        // double square
                        square += offsets[1];
                        if (second_rank == RANK(i) && !board[square])
                            if (!inter || interpose[square])
                                addMove(moves, piece, i, square, BITS_BIG_PAWN, 0, 0);
                    }
                }

                // pawn captures
                for (let j = 0; j < 3; j += 2) {
                    if (pin && !(pin & (1 << j)))
                        continue;
                    let square = i + offsets[j];
                    if (square & 0x88)
                        continue;
                    if (inter && interpose_ep != square && !interpose[square])
                        continue;
                    let value = board[square];

                    if (value && COLOR(value) == them)
                        addPawnMove(moves, piece, i, square, BITS_CAPTURE, value);
                    // en passant can be tricky:
                    // - 3k4/8/8/K1Pp3r/8/8/8/8 w - d6 0 2
                    // - b2k4/8/2P5/3p4/8/5K2/8/8 w - d6 0 2
                    else if (square == ep_square) {
                        let square2 = square + 16 - (us << 5);
                        board[square2] = 0;
                        board[square] = board[i];
                        board[i] = 0;
                        if (!attacked(them, king))
                            addPawnMove(moves, piece, i, square, BITS_EP_CAPTURE, value);
                        board[i] = board[square];
                        board[square] = 0;
                        board[square2] = COLORIZE(them, PAWN);
                    }
                }
            }
            // other pieces
            // TODO: separate by piece_type?
            else if (piece_type != KNIGHT || !pin) {
                let dirs = PIECE_DIRS[piece_type],
                    offsets = PIECE_OFFSETS[piece_type];
                for (let j = 0; j < 8; j ++) {
                    let offset = offsets[j],
                        square = i;
                    if (!offset)
                        break;
                    if (pin && !(pin & dirs[j]))
                        continue;

                    while (true) {
                        square += offset;
                        if (square & 0x88)
                            break;
                        let value = board[square];

                        if (!value) {
                            if (!only_capture && (!inter || interpose[square]))
                                addMove(moves, piece, i, square, BITS_NORMAL, 0, 0);
                        }
                        else {
                            if (COLOR(value) == us)
                                break;
                            if (!inter || interpose[square])
                                addMove(moves, piece, i, square, BITS_CAPTURE, 0, value);
                            break;
                        }

                        // break if knight or king
                        if (piece_type == KING || piece_type == KNIGHT)
                            break;
                    }
                }
            }
        }

        // 4) castling
        if (!inter && !only_capture) {
            let king = kings[us];
            if (king != EMPTY) {
                let pos0 = RANK(king) << 4;

                // q=0: king side, q=1: queen side
                for (let q = 0; q < 2; q ++) {
                    let rook = castling[(us << 1) + q];
                    if (rook == EMPTY)
                        continue;

                    let error = false,
                        flags = q? BITS_QSIDE_CASTLE: BITS_KSIDE_CASTLE,
                        king_to = pos0 + 6 - (q << 2),
                        rook_to = king_to - 1 + (q << 1),
                        max_king = Max(king, king_to),
                        min_king = Min(king, king_to),
                        max_path = Max(max_king, rook, rook_to),
                        min_path = Min(min_king, rook, rook_to);

                    // check that all squares are empty along the path
                    for (let j = min_path; j <= max_path; j ++)
                        if (j != king && j != rook && board[j]) {
                            error = true;
                            break;
                        }
                    if (error)
                        continue;

                    // check that the king is not attacked
                    for (let j = min_king; j <= max_king; j ++)
                        if (attacked(them, j)) {
                            error = true;
                            break;
                        }

                    // add castle + detect FRC even if not set
                    if (!error)
                        addMove(moves, COLORIZE(us, KING), king, (frc || FILE(king) != 4 || (FILE(rook) % 7))? rook: king_to, flags, 0, 0);
                }
            }
        }

        // move ordering for alpha-beta
        if (search_mode == 2)
            orderMoves(moves);
        return moves;
    }

    /**
     * Decorate the SAN with + or #
     * @param {Move} move
     * @returns {string}
     */
    function decorateMove(move) {
        let text = move.m,
            last = text.slice(-1);
        if (!'+#'.includes(last) && kingAttacked(turn)) {
            let moves = createMoves(frc, false);
            text += moves.length? '+': '#';
            move.m = text;
        }
        return text;
    }

    /**
     * Evaluate the current position
     * - eval_mode: 0:null, 1:mat, 2:hc2, &4:qui, 8:nn
     * @returns {number}
     */
    function evaluate() {
        if (half_moves >= 50)
            return 0;

        let score = 0;

        if (eval_mode & 1)
            score = materials[WHITE] - materials[BLACK];

        if (eval_mode & 2) {
            let count0 = 0,
                count1 = 0;
                // countMobilities();
            for (let i = 1; i < 7; i ++)
                count0 += mobilities[i] * MOBILITY_SCORES[i];
            for (let i = 9; i < 15; i ++)
                count1 += mobilities[i] * MOBILITY_SCORES[i];
            score += count0 - count1;
        }

        return score * (1 - (turn << 1));
    }

    /**
     * Check if the king is attacked
     * @param {number} color 0, 1 + special cases: 2, 3
     * @return {boolean} true if king is attacked
     */
    function kingAttacked(color) {
        if (color > 1)
            color = (color == 2)? turn: turn ^ 1;
        return attacked(color ^ 1, kings[color]);
    }

    /**
     * Load a FEN
     * @param {string} fen valid or invalid FEN
     * @returns {string} empty on error, and the FEN may be corrected
     */
    function load(fen_) {
        if (!fen_)
            return "";

        clear();
        fen = fen_;

        let tokens = fen_.split(/\s+/),
            position = tokens[0],
            square = 0;

        for (let value of position) {
            if (value == '/')
                square += 8;
            else if ('123456789'.includes(value))
                square += parseInt(value, 10);
            else {
                put(PIECES[value], square);
                square ++;
            }
        }

        turn = (tokens[1] == 'w')? 0: 1;
        ep_square = anToSquare(tokens[3]);
        half_moves = DefaultInt(tokens[4], 0);
        move_number = DefaultInt(tokens[5], 1);
        ply = move_number * 2 - 3 + turn;
        cur_ply = ply;

        let start = (!turn && move_number == 1);
        if (start)
            frc = false;

        // can detect FRC if castle is not empty
        if (tokens[2] != "-") {
            let error;
            for (let letter of tokens[2]) {
                let lower = Lower(letter),
                    final = (lower == 'k')? 'h': (lower == 'q')? 'a': lower,
                    color = (letter == lower)? 1: 0,
                    square = 'abcdefghij'.indexOf(final) + ((color? 0: 7) << 4),
                    index = color * 2 + ((square < kings[color])? 1: 0);

                castling[index] = square;
                if (start && TYPE(board[square]) != ROOK)
                    error = true;
                if (final == lower)
                    frc = true;
            }

            // fix corrupted FEN (only for the initial board)
            if (error) {
                let castle = "";
                for (let color = 0; color < 2; color ++) {
                    let file_letters = color? 'abcdefghij': 'ABCDEFGHIJ',
                        king = kings[color];

                    for (let i = king + 1; FILE(i) <= 7; i ++)
                        if (TYPE(board[i]) == ROOK) {
                            castling[color * 2] = i;
                            castle += file_letters[FILE(i)];
                            break;
                        }

                    for (let i = king - 1; FILE(i) >= 0; i --)
                        if (TYPE(board[i]) == ROOK) {
                            castling[color * 2 + 1] = i;
                            castle += file_letters[FILE(i)];
                            break;
                        }
                }
                tokens[2] = castle;
                fen = tokens.join(' ');
                frc = true;
            }
        }
        return fen;
    }

    /**
     * Try an object move
     * @param {Object} move {from: 23, to: 7, promote: 5}
     * @param {boolean} frc Fisher Random Chess
     * @param {boolean} decorate add + # decorators
     * @returns {Object}
     */
    function moveObject(move, frc, decorate) {
        let flags = 0,
            move_obj = {},
            moves = createMoves(frc, false);

        // FRC castle?
        if (frc && move.from == kings[turn]) {
            if (move.to == castling[turn * 2] || move.to == move.from + 2)
                flags = BITS_KSIDE_CASTLE;
            else if (move.to == castling[turn * 2 + 1] || move.to == move.from - 2)
                flags = BITS_QSIDE_CASTLE;
        }

        // find an existing match + add the SAN
        if (flags) {
            for (let move2 of moves)
                if (move2.flags & flags) {
                    move2.m = moveToSan(move2, moves);
                    move_obj = move2;
                    break;
                }
        }
        else
            for (let move2 of moves) {
                if (move.from == move2.from && move.to == move2.to
                        && (!move2.promote || TYPE(move.promote) == move2.promote)) {
                    move2.m = moveToSan(move2, moves);
                    move_obj = move2;
                    break;
                }
            }

        // no suitable move?
        if (move_obj.piece) {
            moveRaw(move_obj);
            if (decorate)
                decorateMove(move_obj);
        }
        return move_obj;
    }

    /**
     * Make a raw move, no verification is being performed
     * @param {Object} move
     */
    function moveRaw(move) {
        let us = turn,
            them = us ^ 1;

        // not smart to do it for every move
        addState(move);

        let capture = move.capture,
            flags = move.flags,
            is_castle = (flags & BITS_CASTLE),
            move_from = move.from,
            move_to = move.to,
            move_type = TYPE(move.piece);

        half_moves ++;
        ep_square = EMPTY;

        // moved king?
        if (move_type == KING) {
            if (is_castle) {
                let q = (flags & BITS_QSIDE_CASTLE)? 1: 0,
                    king = kings[us],
                    king_to = (RANK(king) << 4) + 6 - (q << 2),
                    rook = castling[(us << 1) + q];

                board[king] = 0;
                board[rook] = 0;
                board[king_to] = COLORIZE(us, KING);
                board[king_to - 1 + (q << 1)] = COLORIZE(us, ROOK);
                move_to = king_to;
            }

            kings[us] = move_to;
            castling[us << 1] = EMPTY;
            castling[(us << 1) + 1] = EMPTY;
        }

        if (!is_castle) {
            if (move_from != move_to) {
                board[move_to] = board[move_from];
                board[move_from] = 0;
            }

            // remove castling if we capture a rook
            if (capture) {
                materials[them] -= PIECE_SCORES[capture];
                if (capture == ROOK) {
                    if (move_to == castling[them << 1])
                        castling[them << 1] = EMPTY;
                    else if (move_to == castling[(them << 1) + 1])
                        castling[(them << 1) + 1] = EMPTY;
                }
                half_moves = 0;
            }

            // remove castling if we move a rook
            if (move_type == ROOK) {
                if (move_from == castling[us << 1])
                    castling[us << 1] = EMPTY;
                else if (move_from == castling[(us << 1) + 1])
                    castling[(us << 1) + 1] = EMPTY;
            }
            // pawn + update 50MR
            else if (move_type == PAWN) {
                // pawn moves 2 squares
                if (flags & BITS_BIG_PAWN)
                    ep_square = move_to + 16 - (turn << 5);
                else {
                    if (flags & BITS_EP_CAPTURE)
                        board[move_to + 16 - (turn << 5)] = 0;
                    if (flags & BITS_PROMOTION) {
                        board[move_to] = COLORIZE(us, move.promote);
                        materials[us] += PROMOTE_SCORES[move.promote];
                    }
                }
                half_moves = 0;
            }
        }

        ply ++;
        if (turn == BLACK)
            move_number ++;
        turn ^= 1;
    }

    /**
     * Try a string move
     * @param {string} text Nxb7, a8=Q
     * @param {boolean} frc Fisher Random Chess
     * @param {boolean} decorate add + # decorators
     * @param {boolean} sloppy allow sloppy parser
     * @returns {Object}
     */
    function moveSan(text, frc, decorate, sloppy) {
        let moves = createMoves(frc, false),
            move = sanToMove(text, moves, sloppy);
        if (move.piece) {
            moveRaw(move);
            if (decorate)
                decorateMove(move);
        }
        return move;
    }

    /**
     * Convert a move to SAN
     * https://github.com/jhlywa/chess.js
     * r1bqkbnr/ppp2ppp/2n5/1B1pP3/4P3/8/PPPP2PP/RNBQK1NR b KQkq - 2 4
     * 4. ... Nge7 is overly disambiguated because the knight on c6 is pinned
     * 4. ... Ne7 is technically the valid SAN
     * @param {Move} move
     * @param {Move[]} moves
     * @returns {string}
     */
    function moveToSan(move, moves) {
        if (move.flags & BITS_KSIDE_CASTLE)
            return "O-O";
        if (move.flags & BITS_QSIDE_CASTLE)
            return "O-O-O";

        let disambiguator = disambiguate(move, moves),
            move_type = TYPE(move.piece),
            output = '';

        if (move_type != PAWN)
            output += PIECE_UPPER[move_type] + disambiguator;

        if (move.flags & (BITS_CAPTURE | BITS_EP_CAPTURE)) {
            if (move_type == PAWN)
                output += squareToAn(move.from, false)[0];
            output += 'x';
        }

        output += squareToAn(move.to, false);

        if (move.flags & BITS_PROMOTION) {
            output += '=';
            output += PIECE_UPPER[move.promote];
        }
        return output;
    }

    /**
     * Try an UCI move
     * @param {string} text c2c4, a7a8a
     * @param {boolean} frc Fisher Random Chess
     * @param {boolean} decorate add + # decorators
     * @returns {Object}
     */
    function moveUci(text, frc, decorate) {
        let move = {
            from: anToSquare(text.substr(0, 2)),
            promote: PIECES[text[4]],
            to: anToSquare(text.substr(2, 2)),
        };
        return moveObject(move, frc, decorate);
    }

    /**
     * Parse a list of SAN moves + create FEN for each move
     * @param {string} text c2c4 a7a8a ...
     * @param {boolean} frc Fisher Random Chess
     * @param {boolean} sloppy allow sloppy parser
     * @returns {Object[]}
     */
    function multiSan(multi, frc, sloppy) {
        let result = [],
            texts = multi.split(' ');
        for (let text of texts) {
            if ('0123456789'.includes(text[0]))
                continue;

            let moves = createMoves(frc, false),
                move = sanToMove(text, moves, sloppy);
            if (!move.piece)
                break;
            moveRaw(move);
            move.fen = createFen();
            move.ply = ply;
            move.score = 0;
            result.push(move);
        }
        return result;
    }

    /**
     * Parse a list of UCI moves + create SAN + FEN for each move
     * @param {string} text c2c4 a7a8a ...
     * @param {boolean} frc Fisher Random Chess
     * @returns {Object[]}
     */
    function multiUci(multi, frc) {
        let result = [],
            texts = multi.split(' ');
        for (let text of texts) {
            if ('0123456789'.includes(text[0]))
                continue;

            let move = moveUci(text, frc, true);
            if (move.piece) {
                move.fen = createFen();
                move.ply = ply;
                move.score = 0;
                result.push(move);
            }
        }
        return result;
    }

    /**
     * Move ordering for alpha-beta
     * - captures
     * - castle
     * - nb/r/q/r/p
     * @param {Move[]} moves
     */
    function orderMoves(moves) {
        moves.sort(compareMoves);
    }

    /**
     * Get params
     */
    function params() {
        let result = [
            max_depth,          // 0
            eval_mode,          // 1
            max_nodes,          // 2
            search_mode,        // 3
            max_time,           // 4
        ];
        return result;
    }

    /**
     * Perform perft and divide
     * @param {string} fen
     * @param {number} depth
     * @returns {string}
     */
    function perft(fen, depth) {
        load(fen);
        let moves = createMoves(false, false),
            lines = [`1=${moves.length}`];

        for (let move of moves) {
            moveRaw(move);
            let prev = nodes;
            nullSearch(depth - 1);
            let delta = nodes - prev;
            lines.push(`${ucify(move)}:${delta}`);
            prev = nodes;
            undoMove();
        }

        if (depth > 1)
            lines.push(`${depth}=${nodes}`);
        return lines.sort().join(' ');
    }

    /**
     * Print the board
     * @param {boolean} console
     * @returns {string}
     */
    function print(console) {
        let text = '';
        for (let i = SQUARE_A8; i <= SQUARE_H1; i ++) {
            // off board
            if (i & 0x88) {
                i += 7;
                text += '\n';
                continue;
            }
            text += PIECE_NAMES[board[i]];
        }
        if (console)
            LS(text);
        return text;
    }

    /**
     * Put a piece on a square
     * @param {number} piece
     * @param {number} square
     */
    function put(piece, square) {
        board[square] = piece;
        if (TYPE(piece) == KING)
            kings[COLOR(piece)] = square;
        else
            materials[COLOR(piece)] += PIECE_SCORES[piece];
    }

    /**
     * Reset the board to the default position
     */
    function reset() {
        frc = false;
        load(DEFAULT_POSITION);
    }

    /**
     * Convert a move from Standard Algebraic Notation (SAN) to 0x88 coordinates
     * https://github.com/jhlywa/chess.js
     * @param {string} san Nf3, Nf3+?!
     * @param {Object[]} moves list of moves to match the san against
     * @param {boolean} sloppy allow sloppy parser
     * @returns {Object}
     */
    function sanToMove(san, moves, sloppy) {
        // 1) try exact matching
        let clean = cleanSan(san);
        for (let move of moves)
            if (clean == cleanSan(moveToSan(move, moves))) {
                move.m = san;
                return move;
            }

        // 2) try sloppy matching
        if (!sloppy)
            return NULL_MOVE;

        let from_file = -1,
            from_rank = -1,
            i = clean.length - 1,
            to = EMPTY,
            promote = 0,
            type = 0;

        if (i < 2)
            return NULL_MOVE;

        // analyse backwards
        if ('bnrqBNRQ'.includes(clean[i])) {
            promote = TYPE(PIECES[clean[i]]);
            i --;
        }
        // to
        if (!'12345678'.includes(clean[i]))
            return NULL_MOVE;
        i --;
        if (!'abcdefghij'.includes(clean[i]))
            return NULL_MOVE;
        to = 'abcdefghij'.indexOf(clean[i]) + ('87654321'.indexOf(clean[i + 1]) << 4);
        i --;
        //
        if (i >= 0 && clean[i] == 'x')
            i --;
        // from
        if (i >= 0 && '12345678'.includes(clean[i])) {
            from_rank = '87654321'.indexOf(clean[i]);
            i --;
        }
        if (i >= 0 && 'abcdefghij'.includes(clean[i])) {
            from_file = 'abcdefghij'.indexOf(clean[i]);
            i --;
        }
        // type
        type = TYPE(PIECES[clean[i]]);

        for (let move of moves) {
            if (to == move.to
                    && (!type || type == TYPE(move.piece))
                    && (from_file < 0 || from_file == FILE(move.from))
                    && (from_rank < 0 || from_rank == RANK(move.from))
                    && (!promote || promote == move.promote)) {
                move.m = moveToSan(move, moves);
                return move;
            }
        }
        return NULL_MOVE;
    }

    /**
     * Basic tree search with mask
     * https://www.chessprogramming.org/Principal_Variation_Search
     * @param {Move[]} moves
     * @param {string} mask moves to search, ex: 'b8c6 b8a6 g8h6'
     * @returns {Move[]} updated moves
     */
    function search(moves, mask) {
        avg_depth = 1;
        nodes = 0;
        sel_depth = 0;

        let empty = !mask,
            masked = [];

        for (let move of moves) {
            let uci = ucify(move);
            if (!empty && !mask.includes(uci))
                continue;

            let score = 0;

            if (max_depth > 0) {
                moveRaw(move);
                if (search_mode == 1)
                    score = -miniMax(max_depth - 1);
                else
                    score = -alphaBeta(max_depth - 1, -99999, 99999);
                undoMove();
            }

            move.score = score;
            masked.push(move);
        }
        return masked;
    }

    /**
     * Convert a square number to an algebraic notation
     * - 'a' = 97
     * - '8' = 56
     * @param {number} square 112
     * @param {boolean=} check check the boundaries
     * @returns {string} a1
     */
    function squareToAn(square, check) {
        let file = FILE(square),
            rank = RANK(square);
        if (check && (file < 0 || file > 7 || rank < 0 || rank > 7))
            return "";
        let text = '';
        text += String.fromCharCode(97 + file);
        text += String.fromCharCode(56 - rank);
        return text;
    }

    /**
     * Add UCI to a move
     * @param {Move} move
     * @returns {string}
     */
    function ucify(move) {
        if (!move)
            return '???';
        move.m = squareToAn(move.from, false) + squareToAn(move.to, false);
        if (move.promote)
            move.m += PIECE_LOWER[move.promote];
        return move.m;
    }

    /**
     * Undo a move
     */
    function undoMove() {
        if (ply < 0)
            return;

        let move,
            state = ply_states[ply];
        [castling, ep_square, half_moves, kings, move] = state;

        turn ^= 1;
        if (turn == BLACK)
            move_number --;
        ply --;

        let us = turn,
            them = turn ^ 1;

        // undo castle
        if (move.flags & BITS_CASTLE) {
            let q = (move.flags & BITS_QSIDE_CASTLE)? 1: 0,
                king = kings[us],
                king_to = (RANK(king) << 4) + 6 - (q << 2),
                rook = castling[(us << 1) + q];

            board[king_to] = 0;
            board[king_to - 1 + (q << 1)] = 0;
            board[king] = COLORIZE(us, KING);
            board[rook] = COLORIZE(us, ROOK);
        }
        else {
            if (move.from != move.to) {
                board[move.from] = move.piece;
                board[move.to] = 0;
            }

            if (move.flags & BITS_CAPTURE) {
                board[move.to] = COLORIZE(them, move.capture);
                materials[them] += PIECE_SCORES[move.capture];
            }
            else if (move.flags & BITS_EP_CAPTURE) {
                board[move.to + 16 - (us << 5)] = COLORIZE(them, PAWN);
                materials[them] += PIECE_SCORES[PAWN];
            }
            if (move.promote)
                materials[us] -= PROMOTE_SCORES[move.promote];
        }
    }

    // if the user passes in a fen string, load it, else default to starting position
    load(fen_ || DEFAULT_POSITION);

    // BINDING CODE
    ///////////////

    // CHESS BINDINGS
    return {
        //
        anToSquare: anToSquare,
        attacked: attacked,
        avgDepth: () => avg_depth,
        board: () => board,
        castling: () => castling,
        checked: color => kingAttacked(color),
        cleanSan: cleanSan,
        clear: clear,
        configure: configure,
        currentFen: () => fen,
        decorate: decorateMove,
        evaluate: evaluate,
        fen: createFen,
        fen960: createFen960,
        frc: () => frc,
        load: load,
        material: color => materials[color],
        mobilities: () => {countMobilities(); return mobilities;},
        moveObject: moveObject,
        moveRaw: moveRaw,
        moves: createMoves,
        moveSan: moveSan,
        moveToSan: moveToSan,
        moveUci: moveUci,
        multiSan: multiSan,
        multiUci: multiUci,
        nodes: () => nodes,
        order: orderMoves,
        params: params,
        perft: perft,
        piece: text => PIECES[text] || 0,
        print: print,
        put: put,
        reset: reset,
        sanToMove: sanToMove,
        search: search,
        selDepth: () => avg_depth + sel_depth,
        squareToAn: squareToAn,
        turn: () => turn,
        ucify: ucify,
        undo: undoMove,
        version: () => '20200916',
    };
};


// <<
if (typeof exports != 'undefined')
    Assign(exports, {
        Chess: Chess,
    });
// >>
