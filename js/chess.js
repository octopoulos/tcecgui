// chess.js
// @author octopoulo <polluxyz@gmail.com>
// @version 2020-12-29
// - fast javascript implementation, 30000x faster
// - FRC support
/*
globals
Abs, Assign, DefaultInt, exports, Floor, From, global, Lower, LS, Max, Min, require, SetDefault, Undefined
*/
'use strict';

// <<
if (typeof global != 'undefined') {
    let req = require,
        {Abs, Assign, DefaultInt, Floor, From, Lower, LS, Max, Min, SetDefault, Undefined} = req('./common.js');
    Assign(global, {
        Abs: Abs,
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
    U8 = array => new Uint8Array(array),
    U32 = array => new Uint32Array(array);

// defines
let BISHOP = 3,
    BITS_CASTLE = 1,
    BITS_EN_PASSANT = 2,
    BLACK = 1,
    BOUND_EXACT = 0,
    BOUND_LOWER = 1,
    BOUND_UPPER = 2,
    COLOR = piece => piece >> 3,
    COLOR_TEXT = 'wb',
    COLORIZE = (color, type) => (type + (color << 3)),
    DEFAULT_POSITION = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    EMPTY = 255,
    Filer = square => square & 15,
    KING = 6,
    KNIGHT = 2,
    MAX_DEPTH = 64,
    MoveCapture = move => (move >> 10) & 7,
    MoveFlag = move => (move >> 13) & 3,
    MoveFrom = move => (move >> 15) & 127,
    moveOrder = move => (move & 1023),
    MovePromote = move => (move >> 22) & 7,
    MoveTo = move => (move >> 25) & 127,
    NONE = 0,
    PAWN = 1,
    PIECE_LOWER = ' pnbrqk  pnbrqk',
    PIECE_NAMES = ' PNBRQK  pnbrqk',
    PIECE_UPPER = ' PNBRQK  PNBRQK',
    QUEEN = 5,
    Rank = square => square >> 4,
    RELATIVE_RANK = (color, square) => (color? 7 - (square >> 4): (square >> 4)),
    ROOK = 4,
    SCORE_INFINITY = 31001,
    SCORE_MATE = 31000,
    SCORE_MATING = 30001,
    SCORE_NONE = 31002,
    SQUARE_A8 = 0,
    SQUARE_H1 = 119,
    TT_SIZE = 65536,
    TYPE = piece => piece & 7,
    WHITE = 0;

// tables
let MOBILITY_LIMITS = I8([
        0,
        8,          // P
        32,         // N
        24,         // B
        24,         // R
        24,         // Q
        1,          // K
        0,
        0,
        8,          // p
        32,         // n
        24,         // b
        24,         // r
        24,         // q
        1,          // k
        0,
    ]),
    MOBILITY_SCORES = I8([
        0,
        2,          // P
        4,          // N
        3,          // B
        3,          // R
        2,          // Q
        1,          // K
        0,
        0,
        2,          // p
        4,          // n
        3,          // b
        3,          // r
        2,          // q
        1,          // k
        0,
    ]),
    PAWN_OFFSETS = [
        I8([-17, -16, -15]),
        I8([17, 16, 15]),
    ],
    // attacks + defenses
    // those values could be optimized automatically
    PIECE_ATTACKS = [
        //  .   P   N   B   R   Q   K   .   .   p   n   b   r   q   k   .
        [],
        I8([0,  7, 15, 10,  2,  1,  0,  0,  0,  1,  1,  1,  1,  1,  5,  0]),    // P
        I8([0,  5,  9,  9,  8,  8,  0,  0,  0,  5,  2,  9,  5,  5,  5,  0]),    // N
        I8([0,  5,  9,  9,  8,  8,  0,  0,  0,  5,  9,  2,  5,  5,  5,  0]),    // B
        I8([0, 10,  4,  4, 18, 14,  0,  0,  0,  5,  5,  5,  2,  5,  5,  0]),    // R
        I8([0,  5,  5,  5, 14,  1,  0,  0,  0,  5,  5,  5,  5,  2,  5,  0]),    // Q
        I8([0,  5,  9,  9,  9,  9,  0,  0,  0, 10,  5,  5,  5,  0,  0,  0]),    // K
        [],
        [],
        I8([0,  1,  1,  1,  1,  1,  5,  0,  0,  7, 15, 10,  2,  1,  0,  0]),    // p
        I8([0,  5,  2,  9,  5,  5,  5,  0,  0,  5,  9,  9,  8,  8,  0,  0]),    // n
        I8([0,  5,  9,  2,  5,  5,  5,  0,  0,  5,  9,  9,  8,  8,  0,  0]),    // b
        I8([0,  5,  5,  5,  2,  5,  5,  0,  0,  5, 10,  4, 18, 14,  0,  0]),    // r
        I8([0,  5,  5,  5,  5,  2,  5,  0,  0,  5,  5,  5, 14,  1,  0,  0]),    // q
        I8([0, 10,  5,  5,  5,  0,  0,  0,  0,  5,  9,  9,  9,  9,  9,  0]),    // k
        [],
    ],
    // move ordering
    PIECE_CAPTURES = I32([
        0,
        80,         // P
        200,        // N
        200,        // B
        360,        // R
        720,        // Q
        640,        // K
        0,
        0,
        80,         // p
        200,        // n
        200,        // b
        360,        // r
        720,        // q
        640,        // k
        0,
    ]),
    // for move generation
    PIECE_OFFSETS = [
        [],
        [],
        I8([-18, -33, -31, -14, 18, 33, 31, 14]),
        I8([-17, -15,  17,  15]),
        I8([-16,   1,  16,  -1]),
        I8([-17, -16, -15,   1, 17, 16, 15, -1]),
        I8([-17, -16, -15,   1, 17, 16, 15, -1]),
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
        160,        // P
        720,        // N
        750,        // B
        1200,       // R
        2500,       // Q
        5000,       // K
        0,
        0,
        160,        // p
        720,        // n
        750,        // b
        1200,       // r
        2500,       // q
        5000,       // k
        0,
    ]),
    PROMOTE_SCORES = I32([
        0,
        0,          // P
        600,        // N
        590,        // B
        1040,       // R
        2340,       // Q
        0,          // K
        0,
        0,
        0,          // p
        600,        // n
        590,        // b
        1040,       // r
        2340,       // q
        0,          // k
        0,
    ]);

// extras
let EVAL_MODES = {
        att: 1 + 2 + 4,
        hce: 1 + 2,
        mat: 1,
        mob: 2,
        nn: 1 + 2 + 4 + 32,
        null: 0,
        sq: 1 + 2 + 4 + 8,
    },
    // piece names for print
    PIECES = {
        P: 1,
        N: 2,
        B: 3,
        R: 4,
        Q: 5,
        K: 6,
        p: 9,
        n: 10,
        b: 11,
        r: 12,
        q: 13,
        k: 14,
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

// piece-square for move ordering
let PIECE_SQUARES = [
    // white
    [
        0,
        // pawn
        I32([
             0,  0,  0,  0,  0,  0,  0,  0, 0, 0, 0, 0, 0, 0, 0, 0,
            50, 50, 50, 50, 50, 50, 50, 50, 0, 0, 0, 0, 0, 0, 0, 0,
            25, 25, 25, 25, 25, 25, 25, 25, 0, 0, 0, 0, 0, 0, 0, 0,
            12, 12, 12, 12, 12, 12, 12, 12, 0, 0, 0, 0, 0, 0, 0, 0,
             0,  0, 15, 20, 20, 15,  0,  0, 0, 0, 0, 0, 0, 0, 0, 0,
            10, 20, 10, 15, 15,  0, 20, 10, 0, 0, 0, 0, 0, 0, 0, 0,
            25, 25, 25,  0,  0, 25, 25, 25, 0, 0, 0, 0, 0, 0, 0, 0,
             0,  0,  0,  0,  0,  0,  0,  0, 0, 0, 0, 0, 0, 0, 0, 0,
        ]),
        // knight
        I32([
             0, 20, 25, 25, 25, 25, 20,  0, 0, 0, 0, 0, 0, 0, 0, 0,
            20, 25, 40, 60, 60, 40, 25, 20, 0, 0, 0, 0, 0, 0, 0, 0,
            20, 25, 35, 45, 45, 35, 25, 20, 0, 0, 0, 0, 0, 0, 0, 0,
            20, 25, 32, 40, 40, 32, 25, 20, 0, 0, 0, 0, 0, 0, 0, 0,
            20, 25, 30, 30, 30, 30, 25, 20, 0, 0, 0, 0, 0, 0, 0, 0,
            20, 25, 40, 30, 30, 40, 25, 20, 0, 0, 0, 0, 0, 0, 0, 0,
            20, 25, 28, 28, 28, 25, 25, 20, 0, 0, 0, 0, 0, 0, 0, 0,
             0, 20, 20, 20, 20, 20, 20,  0, 0, 0, 0, 0, 0, 0, 0, 0,
        ]),
        // bishop
        I32([
            0,  0,  0,  0,  0,  0,  0,  0, 0, 0, 0, 0, 0, 0, 0, 0,
            0,  0,  0,  0,  0,  0,  0,  0, 0, 0, 0, 0, 0, 0, 0, 0,
            0,  0,  0,  0,  0,  0,  0,  0, 0, 0, 0, 0, 0, 0, 0, 0,
            0,  0,  0,  0,  0,  0,  0,  0, 0, 0, 0, 0, 0, 0, 0, 0,
            0,  0,  0,  0,  0,  0,  0,  0, 0, 0, 0, 0, 0, 0, 0, 0,
            0,  0,  0,  0,  0,  0,  0,  0, 0, 0, 0, 0, 0, 0, 0, 0,
            0,  0,  0,  0,  0,  0,  0,  0, 0, 0, 0, 0, 0, 0, 0, 0,
            0,  0,  0,  0,  0,  0,  0,  0, 0, 0, 0, 0, 0, 0, 0, 0,
        ]),
        // rook
        I32([
             0,  0,  0,  0,  0,  0,  0,  0, 0, 0, 0, 0, 0, 0, 0, 0,
            20, 20, 20, 20, 20, 20, 20, 20, 0, 0, 0, 0, 0, 0, 0, 0,
             0,  0,  0,  0,  0,  0,  0,  0, 0, 0, 0, 0, 0, 0, 0, 0,
             0,  0,  0,  0,  0,  0,  0,  0, 0, 0, 0, 0, 0, 0, 0, 0,
             0,  0,  0,  0,  0,  0,  0,  0, 0, 0, 0, 0, 0, 0, 0, 0,
             0,  0,  0,  0,  0,  0,  0,  0, 0, 0, 0, 0, 0, 0, 0, 0,
             0,  0,  0,  0,  0,  0,  0,  0, 0, 0, 0, 0, 0, 0, 0, 0,
             0,  0,  0,  0,  0,  0,  0,  0, 0, 0, 0, 0, 0, 0, 0, 0,
        ]),
        // queen
        I32([
            0,  0,  0,  0,  0,  0,  0,  0, 0, 0, 0, 0, 0, 0, 0, 0,
            0,  0,  0,  0,  0,  0,  0,  0, 0, 0, 0, 0, 0, 0, 0, 0,
            0,  0,  0,  0,  0,  0,  0,  0, 0, 0, 0, 0, 0, 0, 0, 0,
            0,  0,  0,  0,  0,  0,  0,  0, 0, 0, 0, 0, 0, 0, 0, 0,
            0,  0,  0,  0,  0,  0,  0,  0, 0, 0, 0, 0, 0, 0, 0, 0,
            0,  0,  0,  0,  0,  0,  0,  0, 0, 0, 0, 0, 0, 0, 0, 0,
            0,  0,  0,  0,  0,  0,  0,  0, 0, 0, 0, 0, 0, 0, 0, 0,
            0,  0,  0,  0,  0,  0,  0,  0, 0, 0, 0, 0, 0, 0, 0, 0,
        ]),
        // king
        I32([
            20, 30,  0,  0,  0,  0, 30, 20, 0, 0, 0, 0, 0, 0, 0, 0,
             0,  0,  0,  0,  0,  0,  0,  0, 0, 0, 0, 0, 0, 0, 0, 0,
             0,  0,  0,  0,  0,  0,  0,  0, 0, 0, 0, 0, 0, 0, 0, 0,
             0,  0,  0,  0,  0,  0,  0,  0, 0, 0, 0, 0, 0, 0, 0, 0,
             0,  0,  0,  0,  0,  0,  0,  0, 0, 0, 0, 0, 0, 0, 0, 0,
             0,  0,  0,  0,  0,  0,  0,  0, 0, 0, 0, 0, 0, 0, 0, 0,
             0,  0,  0,  0,  0,  0,  0,  0, 0, 0, 0, 0, 0, 0, 0, 0,
            20, 30,  0,  0,  0,  0, 30, 20, 0, 0, 0, 0, 0, 0, 0, 0,
        ]),
        0,
    ],
    // black
    [
        0,
        I32(128),
        I32(128),
        I32(128),
        I32(128),
        I32(128),
        I32(128),
        0,
    ],
];

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * MoveText
 * @typedef {Object} MoveText
 * @property {number} capture
 * @property {string} fen
 * @property {number} flag
 * @property {number} from
 * @property {string} m
 * @property {number} ply
 * @property {number} promote
 * @property {string} pv
 * @property {number} score
 * @property {number} to
 */

// null object
let NULL_OBJ = {
    capture: 0,
    fen: '',
    flag: 0,
    from: 0,
    m: '',
    ply: -2,
    promote: 0,
    pv: '',
    score: 0,
    to: 0,
};

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * 32bit pseudo random generator
 * https://en.wikipedia.org/wiki/Xorshift
 * @param {number=} state
 * @returns {number}
 */
function xorshift32(state) {
    let seed = state || xorshift32.state;
    seed ^= seed << 13;
    seed ^= seed >> 17;
    seed ^= seed << 5;
    xorshift32.state = seed;
    return seed;
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// chess class
var Chess = function(fen_) {
    // PRIVATE
    //////////

    let attacks = U8(16),
        avg_depth = 0,
        board = U8(128),
        board_hash = 0,
        castling = U8(4).fill(EMPTY),
        debug = 0,
        defenses = U8(16),
        ep_square = EMPTY,
        eval_mode = 1,                      // 0:null, &1:mat, &2:hc2, &4:qui, &8:nn
        fen = '',
        fen_ply = -1,
        first_moves = [],                   // top level moves
        first_objs = [],
        frc = false,
        half_moves = 0,
        hash_mode = 0,
        is_search = false,
        kings = U8(2).fill(EMPTY),
        materials = I32(2),
        max_depth = 4,
        max_extend = 0,
        max_nodes = 1e9,
        max_quiesce = 0,
        max_time = 60,
        mobilities = U8(16),
        move_id = 0,
        move_number = 1,
        nodes = 0,
        order_mode = 1,
        pawns = U8(8).fill(EMPTY),
        pieces = [U8(16).fill(EMPTY), U8(16).fill(EMPTY)],
        ply = 0,
        ply_states = Array(128).fill(0).map(_ => [0, 0, 0, 0, 0]),
        positions = I32(2),
        pv_mode = 1,
        prev_pv = [],
        scan_all = false,
        search_mode = 0,                    // 1:minimax, 2:alpha-beta
        sel_depth = 0,
        table = U32(3 * TT_SIZE),           // 12 bytes: hash=4, score=2, bound=1, depth=1, move=4
        trace = '',
        tt_adds = 0,
        tt_hits = 0,
        turn = WHITE,
        zobrist = Array(15).fill(0).map(_ => U32(128)),
        zobrist_ready = false,
        zobrist_side;

    /**
     * Add a single move
     */
    function addMove(moves, piece, from, to, flag, promote, value) {
        let capture = (flag & BITS_EN_PASSANT)? PAWN: (flag & BITS_CASTLE? NONE: TYPE(value)),
            score = (capture | promote)? Max(PIECE_CAPTURES[capture], PIECE_CAPTURES[promote]) - (PIECE_CAPTURES[piece] >> 3) + 50: 0,
            squares = PIECE_SQUARES[COLOR(piece)][TYPE(piece)];

        let move =
            100 + squares[to] - squares[from] + (flag & BITS_CASTLE) * 30 + score
            + (capture << 10)
            + (flag << 13)
            + ((from & 127) << 15)
            + (promote << 22)
            + ((to & 127) << 25);
        moves.push(move >>> 0);

        if (!promote) {
            // TODO:
            // empty => give bonus for controlling the square, especially if near the other king (or in the center)
            mobilities[piece] ++;
        }
    }

    /**
     * Add a pawn move + promote moves
     */
    function addPawnMove(moves, piece, from, to, flag, value, only_capture) {
        let rank = Rank(to);
        if (rank == 0 || rank == 7) {
            if (only_capture)
                addMove(moves, piece, from, to, flag, QUEEN, value);
            else
                for (let promote = QUEEN; promote >= KNIGHT; promote --)
                    addMove(moves, piece, from, to, flag, promote, value);
            mobilities[piece] ++;
        }
        else
            addMove(moves, piece, from, to, flag, 0, value);
    }

    /**
     * Add a ply state
     * @param {Object} move
     */
    function addState(move) {
        let state = ply_states[ply & 127];
        state[0] = board_hash;
        state[1] = castling.slice();
        state[2] = ep_square;
        state[3] = half_moves;
        state[4] = move;
    }

    /**
     * Add a top level move
     * @param {Move} move
     * @param {number} score
     * @param {number[]} pv
     */
    function addTopMove(move, score, pv) {
        let uci = ucifyMove(move),
            pv_string = uci;
        if (pv)
            for (let item of pv) {
                pv_string += " ";
                pv_string += ucifyMove(item);
            }

        let obj = unpackMove(move);
        obj.m = uci;
        obj.pv = pv_string;
        obj.score = score;
        obj.score2 = score;
        first_objs.push(obj);

        if (debug & 2)
            LS(`${score} : ${pv_string}`);
    }

    /**
     * Alpha beta tree search
     * http://web.archive.org/web/20040427015506/http://brucemo.com/compchess/programming/pvs.htm
     * r1bk1bnr/3npppp/p1p3q1/1N6/8/1P2P3/1B1QBPPP/R3K2R w HA - 2 16
     * 2q1kr1r/R2bppb1/NQ3n2/3p1p1p/2pP3P/4P1P1/K5RN/5B2 w - - 7 52
     * n1QBq1k1/5p1p/5KP1/p7/8/8/8/8 w - 0 1
     * 8/2b1k3/8/5B2/8/5K2/1R6/8 b - - 0 108
     * 2k2r1r/2p5/p1n2q2/3p4/2PPpPb1/P3P2p/1P1Q4/1K1R1R2 w - - 1 32 (d2b4??)
     * @param {number} alpha
     * @param {number} beta
     * @param {number} depth
     * @param {number} max_depth
     * @param {number[]} pv
     * @returns {number}
     */
    function alphaBeta(alpha, beta, depth, max_depth, pv) {
        // extend depth if in check
        if (max_depth < max_extend && kingAttacked(turn))
            max_depth ++;

        // transposition
        let hit = [0],
            is_pv = (alpha != beta - 1),
            entry = findEntry(board_hash, hit),
            idepth = max_depth - depth;

        if (depth > 0 && hit[0] && entry[3] >= idepth) {
            nodes ++;
            tt_hits ++;

            let score = entry[1],
                bound = entry[2];
            if (bound & BOUND_EXACT)
                return score;
            if ((bound & BOUND_UPPER) && score <= alpha)
                return alpha;
            if ((bound & BOUND_LOWER) && score >= beta)
                return beta;
        }

        if (idepth <= 0) {
            pv.length = 0;
            let score;
            if (!max_quiesce) {
                nodes ++;
                score = evaluate();
            }
            else
                score = quiesce(alpha, beta, max_quiesce);

            updateEntry(entry[5], board_hash, score, BOUND_EXACT, idepth, 0);
            move_id ++;
            return score;
        }

        let alpha0 = alpha,
            best = -SCORE_INFINITY,
            best_move = 0,
            line = [],
            moves = createMoves(false),
            num_valid = 0;

        // top level
        if (depth == 0)
            moves = first_moves;
        else {
            nodes ++;
            if (ply >= avg_depth)
                avg_depth = ply + 1;
        }

        // check all moves
        for (let move of moves) {
            if (!makeMove(move))
                continue;
            num_valid ++;

            let score;
            // pv search
            if (alpha > alpha0 && pv_mode) {
                score = -alphaBeta(-alpha - 1, -alpha, depth + 1, max_depth, line);
                if (score > alpha && score < beta)
                    score = -alphaBeta(-beta, -alpha, depth + 1, max_depth, line);
            }
            else
                score = -alphaBeta(-beta, -alpha, depth + 1, max_depth, line);
            undoMove();

            // top level
            if (depth == 0 && scan_all) {
                addTopMove(move, score, line);
                if (score > best)
                    best = score;
                continue;
            }

            // bound check
            if (!hash_mode && score >= beta)
                return beta;
            if (score > best) {
                best = score;
                best_move = move;

                // update pv
                if ((score > alpha && is_pv) || (!ply && num_valid == 0)) {
                    pv.length = line.length + 1;
                    pv[0] = move;
                    for (let i = 0; i < line.length; i ++)
                        pv[i + 1] = line[i];
                }

                if (score > alpha) {
                    alpha = score;
                    if (depth == 0)
                        addTopMove(move, score, line);

                    if (hash_mode && score >= beta)
                        break;
                }
            }

            // checkmate found
            if (ply > 3 && score >= SCORE_MATING)
                break;
        }

        // mate + stalemate
        if (!num_valid)
            return kingAttacked(turn)? -SCORE_MATE + ply: 0;

        let bound = (best >= beta)? BOUND_LOWER: ((alpha != alpha0)? BOUND_EXACT: BOUND_UPPER);
        updateEntry(entry[5], board_hash, best, bound, idepth, best_move);
        return best;
    }

    /**
     * Move ordering for alpha-beta
     * - captures
     * - castle
     * - nb/r/q/r/p
     * @param {number} a
     * @param {number} b
     * @returns {number} -1 if a should be before b
     */
    function compareMoves(a, b) {
        return (b & 1023) - (a & 1023);
    }

    /**
     * Uniquely identify ambiguous moves
     * @param {number} move
     * @param {number[]} moves
     * @returns {string}
     */
    function disambiguate(move, moves) {
        let ambiguities = 0,
            from = MoveFrom(move),
            to = MoveTo(move),
            same_file = 0,
            same_rank = 0,
            type = board[from];

        for (let move2 of moves) {
            let ambig_from = MoveFrom(move2),
                ambig_to = MoveTo(move2);

            // if a move of the same piece type ends on the same to square,
            // we'll need to add a disambiguator to the algebraic notation
            if (type == board[ambig_from] && from != ambig_from && to == ambig_to) {
                ambiguities ++;

                if (Rank(from) == Rank(ambig_from))
                    same_rank ++;
                if (Filer(from) == Filer(ambig_from))
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
     * Find an entry in the transposition table
     * @param {number} hash
     * @param {[number]} hit true if the hash matches
     * @returns {number[] | null} hash, score, bound, depth, move, index
     */
    function findEntry(hash, hit) {
        if (!hash_mode)
            return [];

        hash >>>= 0;
        let index = (hash % TT_SIZE) * 3,
            middle = table[index + 1],
            tt_hash = table[index];
        hit[0] = (tt_hash == hash);
        return [tt_hash, middle >> 16, (middle & 0xff00) >> 8, middle & 0xff, table[index + 2], index];
    }

    /**
     * Initialise piece squares
     */
    function initSquares() {
        for (let piece = PAWN; piece <= KING; piece ++) {
            let bsquares = PIECE_SQUARES[1][piece],
                wsquares = PIECE_SQUARES[0][piece];
            for (let i = SQUARE_A8; i <= SQUARE_H1; i ++)
                bsquares[((7 - Rank(i)) << 4) + Filer(i)] = wsquares[i];
        }
    }

    /**
     * Mini max tree search
     * @param {number} depth
     * @param {number} max_depth
     * @param {number[]} pv
     * @returns {number}
     */
    function miniMax(depth, max_depth, pv) {
        // transposition
        let hit = [0],
            entry = findEntry(board_hash, hit),
            idepth = max_depth - depth;
        if (depth > 0 && hit[0] && entry[3] >= idepth) {
            nodes ++;
            tt_hits ++;
            return entry[1];
        }

        if (idepth <= 0) {
            nodes ++;
            pv.length = 0;
            return evaluate();
        }

        let best = -SCORE_INFINITY,
            best_move = 0,
            line = [],
            moves = createMoves(false),
            num_valid = 0;

        // top level
        if (depth == 0)
            moves = first_moves;
        else {
            nodes ++;
            if (ply >= avg_depth)
                avg_depth = ply + 1;
        }

        // check all moves
        for (let move of moves) {
            if (!makeMove(move))
                continue;
            num_valid ++;

            let score = -miniMax(depth + 1, max_depth, line);
            undoMove();

            // top level
            if (depth == 0)
                addTopMove(move, score, line);

            if (score > best) {
                best = score;
                best_move = move;

                // update pv
                pv.length = line.length + 1;
                pv[0] = move;
                for (let i = 0; i < line.length; i ++)
                    pv[i + 1] = line[i];
            }

            // checkmate found
            if (ply > 3 && score >= SCORE_MATING)
                break;
        }

        // mate + stalemate
        if (!num_valid)
            return kingAttacked(turn)? -SCORE_MATE + ply: 0;

        updateEntry(entry[5], board_hash, best, BOUND_EXACT, idepth, best_move);
        return best;
    }

    /**
     * Get the move list
     * @returns {string}
     */
    function moveList() {
        let lines = [];
        for (let i = 0; i <= ply; i ++) {
            let state = ply_states[i & 127];
            lines.push(state? ucifyMove(state[3]): '???');
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

        let moves = createMoves(false);
        for (let move of moves) {
            if (!makeMove(move))
                continue;
            nullSearch(depth - 1);
            undoMove();
        }
    }

    /**
     * Quiescence search
     * https://www.chessprogramming.org/Quiescence_Search
     * r1k2r1b/1p2pq1p/p2p1np1/2n2p2/P1Q1P3/2N3P1/1PPB1P1P/RK1NR3 w fa - 3 16
     * @param {number} alpha
     * @param {number} beta
     * @param {number} depth_left
     */
    function quiesce(alpha, beta, depth_left) {
        let delta = PIECE_SCORES[QUEEN];

        nodes ++;
        let score = evaluate();
        if (depth_left <= 0)
            return score;
        if (score >= beta)
            return beta;
        if (score + delta < alpha)
            return alpha;
        if (score > alpha)
            alpha = score;

        let best = score,
            futility = best + PIECE_SCORES[PAWN];

        if (ply >= sel_depth)
            sel_depth = ply + 1;

        let moves = createMoves(true);
        for (let move of moves) {
            if (futility + PIECE_SCORES[MoveCapture(move)] <= alpha
                    && (TYPE(board[MoveFrom(move)]) != PAWN || RELATIVE_RANK(turn, MoveTo(move)) <= 5))
                continue;

            if (!makeMove(move))
                continue;
            let score = -quiesce(-beta, -alpha, depth_left - 1);
            undoMove();

            if (score > best) {
                best = score;
                if (score > alpha) {
                    alpha = score;
                    if (score >= beta)
                        break;
                }
            }
        }

        return best;
    }

    /**
     * Update an entry
     * @param {number} entry table index
     * @param {Hash} hash
     * @param {number} score
     * @param {number} bound
     * @param {number} depth
     * @param {Move} move
     */
    function updateEntry(entry, hash, score, bound, depth, move) {
        if (!hash_mode)
            return;

        hash >>>= 0;
        if (hash == table[entry] && depth < (table[entry + 1] & 0xff) && bound != BOUND_EXACT)
            return;
        table[entry + 0] = hash;
        table[entry + 1] = (score << 16) + (bound << 8) + depth;
        table[entry + 2] = move;
        tt_adds ++;
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
        attacks.fill(0);
        avg_depth = 0;
        board.fill(0);
        board_hash = 0;
        castling.fill(EMPTY);
        defenses.fill(0);
        ep_square = EMPTY;
        fen = "";
        fen_ply = -1;
        half_moves = 0;
        is_search = false;
        kings.fill(EMPTY);
        materials.fill(0);
        mobilities.fill(0);
        move_id = 0;
        move_number = 1;
        nodes = 0;
        pawns.fill(EMPTY);
        pieces[0].fill(0);
        pieces[1].fill(0);
        positions.fill(EMPTY);
        ply = 0;
        ply_states[0].fill(0);
        sel_depth = 0;
        turn = WHITE;
    }

    /**
     * Configure parameters
     * @param {boolean} frc_
     * @param {string} options
     * @param {number} depth this overrides max_depth if > 0
     */
    function configure(frc_, options, depth) {
        debug = 0;
        eval_mode = 1;
        frc = frc_;
        hash_mode = 0;
        max_depth = 4;
        max_extend = 0;
        max_nodes = 1e9;
        max_quiesce = 0;
        max_time = 0;
        order_mode = 1;
        pv_mode = 1;
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
                max_depth = value;
                break;
            case 'D':
                debug = value;
                break;
            case 'e': {
                    let eit = EVAL_MODES[right];
                    if (eit != undefined)
                        eval_mode = eit;
                }
                break;
            case 'h':
                hash_mode = value;
                break;
            case 'n':
                max_nodes = value;
                break;
            case 'o':
                order_mode = value;
                break;
            case 'p':
                pv_mode = value;
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
            case 'x':
                max_extend = value;
                break;
            }
        }

        if (depth > 0)
            max_depth = depth;
        max_extend = Max(max_extend, max_depth);
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
                    let file = Filer(square),
                        rank = Rank(square);
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

        line[(index & 3) * 2 + 1] = 'B';
        index = Floor(index / 4);
        line[(index & 3) * 2] = 'B';
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
        let castle = '';
        i = 7;
        for (let type of "RKR")
            for (; i >= 0; i --) {
                if (line[i] == ' ') {
                    line[i] = type;
                    if (type == 'R')
                        castle += 'ABCDEFGHIJ'[i];
                    break;
                }
            }

        line = line.join('');
        return `${Lower(line)}/pppppppp/8/8/8/8/PPPPPPPP/${line} w ${castle}${Lower(castle)} - 0 1`;
    }

    /**
     * Create the moves
     * @param {boolean} only_capture
     * @returns {number[]} moves
     */
    function createMoves(only_capture) {
        let moves = [],
            second_rank = 6 - turn * 5,
            us = turn,
            us8 = us << 3,
            them = us ^ 1;

        for (let i = us8; i < us8 + 8; i ++) {
            attacks[i] = 0;
            defenses[i] = 0;
            mobilities[i] = 0;
        }

        // 1) collect all moves
        for (let i = SQUARE_A8; i <= SQUARE_H1; i ++) {
            // off board
            if (i & 0x88) {
                i += 7;
                continue;
            }

            let piece = board[i];
            if (!piece || COLOR(piece) != us)
                continue;

            let piece_type = TYPE(piece);
            // pawn
            if (piece_type == PAWN) {
                let offsets = PAWN_OFFSETS[us],
                    piece_attacks = PIECE_ATTACKS[piece];

                // single square, non-capturing
                let square = i + offsets[1];
                if (!only_capture) {
                    if (!board[square]) {
                        addPawnMove(moves, piece, i, square, 0, 0, false);

                        // double square
                        square += offsets[1];
                        if (second_rank == Rank(i) && !board[square])
                            addMove(moves, piece, i, square, 0, 0, 0);
                    }
                }
                // else if (Rank(square) % 7 == 0)
                //     addMove(moves, piece, i, square, 0, QUEEN, 0);

                // pawn captures
                for (let j of [0, 2]) {
                    let square = i + offsets[j];
                    if (square & 0x88)
                        continue;
                    let value = board[square];

                    if (value) {
                        if (COLOR(value) == them) {
                            addPawnMove(moves, piece, i, square, 0, value, only_capture);
                            attacks[piece] += piece_attacks[value];
                        }
                        else
                            defenses[piece] += piece_attacks[value];
                    }
                    // en passant
                    else if (square == ep_square)
                        addPawnMove(moves, piece, i, square, BITS_EN_PASSANT, value, false);
                }
            }
            // other pieces
            // TODO: separate by piece_type?
            else {
                let offsets = PIECE_OFFSETS[piece_type],
                    piece_attacks = PIECE_ATTACKS[piece];
                for (let j = 0; j < 8; j ++) {
                    let offset = offsets[j],
                        square = i;
                    if (!offset)
                        break;

                    while (true) {
                        square += offset;
                        if (square & 0x88)
                            break;
                        let value = board[square];

                        if (!value) {
                            if (!only_capture)
                                addMove(moves, piece, i, square, 0, 0, 0);
                        }
                        else {
                            if (COLOR(value) == us)
                                defenses[piece] += piece_attacks[value];
                            else {
                                addMove(moves, piece, i, square, 0, 0, value);
                                attacks[piece] += piece_attacks[value];
                            }
                            break;
                        }

                        // break if knight or king
                        if (piece_type == KING || piece_type == KNIGHT)
                            break;
                    }
                }
            }
        }

        // 2) castling
        if (!only_capture) {
            let king = kings[us],
                pos0 = Rank(king) << 4;

            // q=0: king side, q=1: queen side
            for (let q = 0; q < 2; q ++) {
                let rook = castling[(us << 1) + q];
                if (rook == EMPTY)
                    continue;

                let error = false,
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

                // add castle, always in FRC format
                if (!error)
                    addMove(moves, COLORIZE(us, KING), king, rook, BITS_CASTLE, 0, 0);
            }
        }

        // move ordering for alpha-beta
        if (order_mode && is_search)
            orderMoves(moves);
        return moves;
    }

    /**
     * Decorate the SAN with + or #
     * @param {string} san
     * @returns {string}
     */
    function decorateSan(san) {
        let last = san.slice(-1);
        if (!'+#'.includes(last) && kingAttacked(turn)) {
            let moves = legalMoves();
            san += moves.length? '+': '#';
        }
        return san;
    }

    /**
     * Evaluate the current position
     * - eval_mode: 0:null, 1:mat, 2:hc2, &4:qui, 8:nn
     * - 8/5q2/8/3K4/8/8/8/7k w - - 0 1 KQ vs K
     * - 8/5r2/8/3K4/8/8/8/7k w - - 0 1 KR vs K
     * - 8/5n2/8/3K4/8/8/b7/7k w - - 0 1  KNB vs K
     * @returns {number}
     */
    function evaluate() {
        if (half_moves >= 100)
            return 0;
        let score = 0;

        if (eval_mode & 1) {
            score += materials[WHITE] - materials[BLACK];
            // KRR vs KR => KR should not exchange the rook
            let ratio = materials[WHITE] * 1.0 / (materials[WHITE] + materials[BLACK]) - 0.5;
            score += (ratio * 2048 + 0.5) >> 0;
        }

        // mobility
        if (eval_mode & 2) {
            if (!materials[WHITE]) {
                let king = kings[WHITE],
                    king2 = kings[BLACK];
                score -= (Abs(Filer(king) * 2 - 7) + Abs(Rank(king) * 2 - 7)) * 15;
                score += (Abs(Filer(king) - Filer(king2)) + Abs(Rank(king) - Rank(king2))) * 10;
                score += mobilities[6] * 15;
            }
            else
                for (let i = 1; i < 7; i ++)
                    score += Min(mobilities[i] * MOBILITY_SCORES[i], MOBILITY_LIMITS[i]) * 2;

            if (!materials[BLACK]) {
                let king = kings[BLACK],
                    king2 = kings[WHITE];
                score -= (Abs(Filer(king) * 2 - 7) + Abs(Rank(king) * 2 - 7)) * 15;
                score += (Abs(Filer(king) - Filer(king2)) + Abs(Rank(king) - Rank(king2))) * 10;
                score += mobilities[6] * 15;
            }
            else
                for (let i = 9; i < 15; i ++)
                    score -= Min(mobilities[i] * MOBILITY_SCORES[i], MOBILITY_LIMITS[i]) * 2;
        }

        // attacks + defenses
        if (eval_mode & 4) {
            for (let i = 1; i < 7; i ++)
                score += attacks[i] + defenses[i];
            for (let i = 9; i < 15; i ++)
                score -= attacks[i] + defenses[i];
        }

        // squares
        if (eval_mode & 8)
            score += positions[WHITE] - positions[BLACK];

        return score * (1 - (turn << 1));
    }

    /**
     * Evaluate every piece position, done when starting a search
     */
    function evaluatePositions() {
        attacks.fill(0);
        defenses.fill(0);
        materials.fill(0);
        mobilities.fill(0);
        positions.fill(0);

        for (let i = SQUARE_A8; i <= SQUARE_H1; i ++) {
            let piece = board[i];
            if (!piece)
                continue;
            let color = COLOR(piece);
            materials[color] += PIECE_SCORES[piece];
            positions[color] += PIECE_SQUARES[color][TYPE(piece)][i];
        }
    }

    /**
     * Hash the current board
     */
    function hashBoard() {
        if (!zobrist_ready)
            init_zobrist();

        // 1) board
        board_hash = 0;
        for (let square = SQUARE_A8; square <= SQUARE_H1; square ++) {
            if (square & 0x88) {
                square += 7;
                continue;
            }
            let piece = board[square];
            if (piece)
                board_hash ^= zobrist[piece][square];
        }

        // 2) en passant
        hashEnPassant();

        // 3) castle
        for (let id = 0; id < 4; id ++)
            if (castling[id] != EMPTY)
                board_hash ^= zobrist[0][id];

        // 4) side
        if (turn)
            board_hash ^= zobrist_side;
    }

    /**
     * Hash a castle square
     * @param {number} id 2 * color + 0/1 => 0, 1, 2, 3
     */
    function hashCastle(id) {
        if (castling[id] != EMPTY) {
            castling[id] = EMPTY;
            board_hash ^= zobrist[0][id];
        }
    }

    /**
     * Hash the en-passant square
     */
    function hashEnPassant() {
        if (ep_square != EMPTY)
            board_hash ^= zobrist[0][ep_square];
    }

    /**
     * Modify the board hash
     * https://en.wikipedia.org/wiki/Zobrist_hashing
     * @param {number} square
     * @param {number} piece
     */
    function hashSquare(square, piece) {
        board_hash ^= zobrist[piece][square];
    }

    /**
     * Initialise the zobrist table
     */
    function init_zobrist() {
        let collision = 0,
            seed = 1070372;

        xorshift32(seed);
        zobrist_side = xorshift32();
        let seens = new Set();

        for (let i = SQUARE_A8; i <= SQUARE_H1; i ++) {
            if (i & 0x88) {
                i += 7;
                continue;
            }
            for (let j = 0; j <= 14; j ++) {
                if (j && !PIECE_ORDERS[j])
                    continue;
                let x = xorshift32();
                if (seens.has(x)) {
                    collision ++;
                    LS(`collision: ${seed} : ${i}/${j} : ${x}`);
                    break;
                }
                zobrist[j][i] = x;
                seens.add(x);
            }
        }

        if (collision)
            LS(`init_zobrist: ${collision} collisions`);
        zobrist_ready = true;
    }

    /**
     * Check if the king is attacked
     * @param {number} color 0, 1 + special cases: 2=same turn, 3=other turn
     * @return {boolean} true if king is attacked
     */
    function kingAttacked(color) {
        if (color > 1)
            color = (color == 2)? turn: turn ^ 1;
        return attacked(color ^ 1, kings[color]);
    }

    /**
     * Get a list of all legal moves
     */
    function legalMoves() {
        let moves = createMoves(false);
        return moves.filter(move => {
            if (!makeMove(move))
                return false;
            undoMove();
            return true;
        });
    }

    /**
     * Load a FEN
     * @param {string} fen valid or invalid FEN
     * @param {boolean} must_hash hash the board?
     * @returns {string} empty on error, and the FEN may be corrected
     */
    function load(fen_, must_hash) {
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
        fen_ply = (move_number << 1) - 3 + turn;
        ply = 0;

        let start = (!turn && !half_moves && move_number == 1 && tokens[2].length == 4);
        if (start)
            frc = (fen_.substr(0, 8) != "rnbqkbnr");

        // can detect FRC if castle is not empty
        if (tokens[2] != "-") {
            let error;
            for (let letter of tokens[2]) {
                let lower = Lower(letter),
                    final = (lower == 'k')? 'h': (lower == 'q')? 'a': lower,
                    color = (letter == lower)? 1: 0,
                    square = 'abcdefghij'.indexOf(final) + ((color? 0: 7) << 4),
                    index = (color << 1) + ((square < kings[color])? 1: 0);

                castling[index] = square;
                if (start && TYPE(board[square]) != ROOK)
                    error = true;
                if (final == lower)
                    frc = true;
                else if (frc && start)
                    error = true;
            }

            // fix corrupted FEN (only for the initial board)
            if (error) {
                let castle = "";
                for (let color = 0; color < 2; color ++) {
                    let file_letters = color? 'abcdefghij': 'ABCDEFGHIJ',
                        king = kings[color];

                    for (let i = king + 1; Filer(i) <= 7; i ++)
                        if (TYPE(board[i]) == ROOK) {
                            castling[color << 1] = i;
                            castle += file_letters[Filer(i)];
                            break;
                        }

                    for (let i = king - 1; Filer(i) >= 0; i --)
                        if (TYPE(board[i]) == ROOK) {
                            castling[(color << 1) + 1] = i;
                            castle += file_letters[Filer(i)];
                            break;
                        }
                }
                tokens[2] = castle;
                fen = tokens.join(' ');
                frc = true;
            }
        }

        if (must_hash)
            hashBoard();
        else
            board_hash = 0;
        return fen;
    }

    /**
     * Make a raw move, no verification is being performed
     * @param {Object} move
     * @returns {boolean} false if the move is not legal
     */
    function makeMove(move) {
        // null move?
        let move_from = MoveFrom(move),
            move_to = MoveTo(move);
        if (move_from == move_to) {
            // addState(move);
            // ply ++;
            // turn ^= 1;
            return false;
        }

        let us = turn,
            them = us ^ 1;

        let capture = MoveCapture(move),
            flag = MoveFlag(move),
            is_castle = (flag & BITS_CASTLE),
            passant = (flag & BITS_EN_PASSANT)? move_to + 16 - (turn << 5): EMPTY,
            piece_from = board[move_from],
            piece_to = board[move_to],
            piece_type = TYPE(piece_from),
            promote = MovePromote(move),
            squares = PIECE_SQUARES[us];

        if (promote)
            promote = COLORIZE(us, promote);

        // 1) check if move is legal
        // castle is always legal because the checks were made in makeMove
        if (!is_castle) {
            // quick makeMove
            if (piece_type == KING)
                kings[us] = move_to;
            board[move_from] = 0;
            board[move_to] = promote? promote: piece_from;
            if (passant)
                board[passant] = 0;

            if (kingAttacked(us)) {
                // quick undoMove
                if (piece_type == KING)
                    kings[us] = move_from;
                board[move_from] = piece_from;
                board[move_to] = piece_to;
                if (passant)
                    board[passant] = COLORIZE(them, PAWN);
                return false;
            }
        }

        // 2) move is legal => do all other stuff
        addState(move);

        half_moves ++;
        hashEnPassant();
        ep_square = EMPTY;

        // castle?
        if (is_castle) {
            let q = (move_to < move_from)? 1: 0,
                king = kings[us],
                king_piece = COLORIZE(us, KING),
                king_to = (Rank(king) << 4) + 6 - (q << 2),
                rook = castling[(us << 1) + q],
                rook_piece = COLORIZE(us, ROOK),
                rook_to = king_to - 1 + (q << 1);

            hashSquare(king, king_piece);
            hashSquare(rook, rook_piece);
            hashSquare(king_to, king_piece);
            hashSquare(rook_to, rook_piece);
            board[king] = 0;
            board[rook] = 0;
            board[king_to] = king_piece;
            board[rook_to] = rook_piece;

            kings[us] = king_to;
            hashCastle(us << 1);
            hashCastle((us << 1) + 1);

            // score
            positions[us]
                += squares[KING][king_to] - squares[KING][king]
                + squares[ROOK][rook_to] - squares[ROOK][rook]
                + 30;
        }
        else {
            hashSquare(move_from, piece_from);
            hashSquare(move_to, piece_to);
            hashSquare(move_to, promote? promote: piece_from);

            // remove castling if we capture a rook
            if (capture) {
                materials[them] -= PIECE_SCORES[capture];
                if (capture == ROOK) {
                    if (move_to == castling[them << 1])
                        hashCastle(them << 1);
                    else if (move_to == castling[(them << 1) + 1])
                        hashCastle((them << 1) + 1);
                }
                half_moves = 0;
            }

            // remove castling if we move a king/rook
            if (piece_type == KING) {
                hashCastle(us << 1);
                hashCastle((us << 1) + 1);
            }
            else if (piece_type == ROOK) {
                if (move_from == castling[us << 1])
                    hashCastle(us << 1);
                else if (move_from == castling[(us << 1) + 1])
                    hashCastle((us << 1) + 1);
            }
            // pawn + update 50MR
            else if (piece_type == PAWN) {
                if (passant != EMPTY)
                    hashEnPassant();
                else if (promote)
                    materials[us] += PROMOTE_SCORES[promote];
                // pawn moves 2 squares
                else if (Abs(Rank(move_to) - Rank(move_from)) == 2)
                    ep_square = move_to + 16 - (turn << 5);
                half_moves = 0;
            }

            // score
            let psquares = squares[piece_type];
            positions[us] += psquares[piece_to] - psquares[piece_from];
        }

        ply ++;
        if (turn == BLACK)
            move_number ++;
        turn ^= 1;
        board_hash ^= zobrist_side;
        return true;
    }

    /**
     * Try an object move
     * @param {Object} obj {from: 23, to: 7, promote: 5}
     * @param {boolean} decorate add + # decorators
     * @returns {Object}
     */
    function moveObject(obj, decorate) {
        let flag = 0,
            move = 0,
            move_from = obj.from,
            move_to = obj.to,
            moves = legalMoves(),
            san = '';

        // castle
        if (move_from == kings[turn]) {
            let piece = board[move_to];

            // regular notation => change .to to rook position
            if (!piece) {
                if (Abs(Filer(move_from) - Filer(move_to)) == 2) {
                    if (move_to > move_from)
                        move_to ++;
                    else
                        move_to -= 2;
                }
            }
            // frc notation
            else if (piece == COLORIZE(turn, ROOK))
                flag = BITS_CASTLE;
        }

        // find an existing match + add the SAN
        if (flag) {
            for (let move2 of moves)
                if ((MoveFlag(move2) & flag) && move_to == MoveTo(move2)) {
                    move = move2;
                    san = moveToSan(move, moves);
                    break;
                }
        }
        else
            for (let move2 of moves) {
                if (move_from != MoveFrom(move2) || move_to != MoveTo(move2))
                    continue;
                let promote = MovePromote(move2);
                if (promote && obj.promote != promote)
                    continue;

                move = move2;
                san = moveToSan(move, moves);
                break;
            }

        // no suitable move?
        if (move && makeMove(move)) {
            obj = unpackMove(move);
            obj.m = decorate? decorateSan(san): san;
            obj.ply = fen_ply + ply;
        }
        return Assign({}, NULL_OBJ, obj);
    }

    /**
     * Try a SAN move
     * @param {string} text Nxb7, a8=Q
     * @param {boolean} decorate add + # decorators
     * @param {boolean} sloppy allow sloppy parser
     * @returns {Object}
     */
    function moveSan(text, decorate, sloppy) {
        let moves = legalMoves(),
            obj = sanToObject(text, moves, sloppy);
        if (obj.from != obj.to) {
            makeMove(packObject(obj));
            if (decorate)
                obj.m = decorateSan(obj.m);
        }
        return obj;
    }

    /**
     * Convert a move to SAN
     * r1bqkbnr/ppp2ppp/2n5/1B1pP3/4P3/8/PPPP2PP/RNBQK1NR b KQkq - 2 4
     * 4. ... Nge7 is overly disambiguated because the knight on c6 is pinned
     * 4. ... Ne7 is technically the valid SAN
     * @param {number} move
     * @param {number[]} moves
     * @returns {string}
     */
    function moveToSan(move, moves) {
        let move_flag = MoveFlag(move),
            move_from = MoveFrom(move),
            move_to = MoveTo(move);

        if (move_flag & BITS_CASTLE)
            return (move_to > move_from)? "O-O": "O-O-O";

        let disambiguator = disambiguate(move, moves),
            move_type = TYPE(board[move_from]),
            output = '';

        if (move_type != PAWN)
            output += PIECE_UPPER[move_type] + disambiguator;

        if (MoveCapture(move) || (move_flag & BITS_EN_PASSANT)) {
            if (move_type == PAWN)
                output += squareToAn(move_from, false)[0];
            output += 'x';
        }

        output += squareToAn(move_to, false);

        let promote = MovePromote(move);
        if (promote) {
            output += '=';
            output += PIECE_UPPER[promote];
        }
        return output;
    }

    /**
     * Try an UCI move
     * @param {string} text c2c4, a7a8a
     * @param {boolean} decorate add + # decorators
     * @returns {Object}
     */
    function moveUci(text, decorate) {
        let obj = {
            from: anToSquare(text.substr(0, 2)),
            promote: text[4]? TYPE(PIECES[text[4]]): 0,
            to: anToSquare(text.substr(2, 2)),
        };
        return moveObject(obj, decorate);
    }

    /**
     * Parse a list of SAN moves + create FEN for each move
     * @param {string} text c2c4 a7a8a ...
     * @param {boolean} sloppy allow sloppy parser
     * @returns {Object[]}
     */
    function multiSan(multi, sloppy) {
        let result = [],
            texts = multi.split(' ');
        for (let text of texts) {
            if ('0123456789'.includes(text[0]))
                continue;

            let moves = legalMoves(),
                obj = sanToObject(text, moves, sloppy);
            if (obj.from == obj.to)
                break;
            makeMove(packObject(obj));
            obj.fen = createFen();
            obj.ply = fen_ply + ply;
            obj.score = 0;
            result.push(obj);
        }
        return result;
    }

    /**
     * Parse a list of UCI moves + create SAN + FEN for each move
     * @param {string} text c2c4 a7a8a ...
     * @returns {Object[]}
     */
    function multiUci(multi) {
        let result = [],
            texts = multi.split(' ');
        for (let text of texts) {
            if ('0123456789'.includes(text[0]))
                continue;

            let obj = moveUci(text, true);
            if (obj.from == obj.to || !obj.m)
                break;

            obj.fen = createFen();
            obj.ply = fen_ply + ply;
            obj.score = 0;
            result.push(obj);
        }
        return result;
    }

    /**
     * Move ordering for alpha-beta
     * - captures
     * - castle
     * - nb/r/q/r/p
     * @param {number[]} moves
     */
    function orderMoves(moves) {
        // use previous PV to reorder the first move
        if (!move_id && (order_mode & 2) && prev_pv.length > ply) {
            let first = prev_pv[ply],
                from = anToSquare(first.substr(0, 2)),
                to = anToSquare(first.substr(2, 2)),
                promote = first[4]? TYPE(PIECES[first[4]]): 0;

            let id = 0;
            for (let move of moves) {
                if (MoveFrom(move) == from && MoveTo(move) == to && MovePromote(move) == promote)
                    moves[id] += 1023 - (move & 1023);
                id ++;
            }
        }

        moves.sort(compareMoves);
    }

    /**
     * Pack a move object to a move
     * - 0-9 : order
     * - 10-12 : capture
     * - 13-14 : flag
     * - 15-21 : from
     * - 22-24 : promote
     * - 25-31 : to
     * @param {MoveText} obj
     */
    function packObject(obj) {
        let value = 0
            + (obj.capture << 10)
            + (obj.flag << 13)
            + ((obj.from & 127) << 15)
            + (obj.promote << 22)
            + ((obj.to & 127) << 25);
        return value >>> 0;
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
            max_quiesce,        // 5
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
        if (fen)
            load(fen, false);
        let moves = legalMoves(),
            lines = [`1=${moves.length}`];

        for (let move of moves) {
            makeMove(move);
            let prev = nodes;
            nullSearch(depth - 1);
            let delta = nodes - prev;
            lines.push(`${ucifyMove(move)}:${delta}`);
            prev = nodes;
            undoMove();
        }

        if (depth > 1)
            lines.push(`${depth}=${nodes}`);
        return lines.sort().join(' ');
    }

    /**
     * Process the move + pv strings
     * @param {string} move_string list of numbers
     * @param {string} pv_string previous pv
     * @param {boolean} scan_all_
     */
    function prepareSearch(move_string, pv_string, scan_all_) {
        first_moves = move_string? move_string.split(' ').map(item => item >>> 0): [];
        prev_pv = pv_string? pv_string.split(' '): [];

        avg_depth = 1;
        first_objs.length = 0;
        is_search = true;
        move_id = 0;
        nodes = 0;
        scan_all = scan_all_;
        sel_depth = 0;
        tt_adds = 0;
        tt_hits = 0;
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
        load(DEFAULT_POSITION, false);
    }

    /**
     * Convert a move from Standard Algebraic Notation (SAN) to 0x88 coordinates
     * @param {string} san Nf3, Nf3+?!
     * @param {number[]} moves list of moves to match the san against
     * @param {boolean} sloppy allow sloppy parser
     * @returns {Object}
     */
    function sanToObject(san, moves, sloppy) {
        // 1) try exact matching
        let clean = cleanSan(san);
        for (let move of moves)
            if (clean == cleanSan(moveToSan(move, moves))) {
                let obj = unpackMove(move);
                obj.m = san;
                obj.ply = fen_ply + ply + 1;
                return Assign({}, NULL_OBJ, obj);
            }

        // 2) try sloppy matching
        if (!sloppy)
            return NULL_OBJ;

        let from_file = EMPTY,
            from_rank = EMPTY,
            promote = 0,
            to = EMPTY,
            type = 0;

        let i = clean.length - 1;
        if (i < 2)
            return NULL_OBJ;

        // analyse backwards
        if ('bnrqBNRQ'.includes(clean[i])) {
            promote = TYPE(PIECES[clean[i]]);
            i --;
        }
        // to
        if (!'12345678'.includes(clean[i]))
            return NULL_OBJ;
        i --;
        if (!'abcdefghij'.includes(clean[i]))
            return NULL_OBJ;
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
            let move_from = MoveFrom(move),
                move_to = MoveTo(move);

            if (to == move_to
                    && (!type || type == TYPE(board[move_from]))
                    && (from_file == EMPTY || from_file == Filer(move_from))
                    && (from_rank == EMPTY || from_rank == Rank(move_from))
                    && (!promote || promote == MovePromote(move))) {
                let obj = unpackMove(move);
                obj.m = moveToSan(move, moves);
                obj.ply = fen_ply + ply + 1;
                return Assign({}, NULL_OBJ, obj);
            }
        }
        return NULL_OBJ;
    }

    /**
     * Main tree search
     * https://www.chessprogramming.org/Principal_Variation_Search
     * @param {string} move_string list of numbers
     * @param {string} pv_string previous pv
     * @param {boolean} scan_all_
     * @returns {MoveText[]} updated moves
     */
    function search(move_string, pv_string, scan_all_) {
        // 1) prepare search
        prepareSearch(move_string, pv_string, scan_all_);
        hashBoard();
        evaluatePositions();

        // 2) search
        let pv = [];
        if (search_mode == 1)
            miniMax(0, max_depth, pv);
        else
            alphaBeta(-SCORE_INFINITY, SCORE_INFINITY, 0, max_depth, pv);

        // 3) add unseen moves with a None score
        if (!scan_all) {
            let seens = Assign({}, ...first_objs.map(obj => ({[obj.m]: 1})));
            for (let move of first_moves) {
                let uci = ucifyMove(move);
                if (!seens[uci])
                    addTopMove(move, -SCORE_NONE, []);
            }
        }

        is_search = false;
        return first_objs;
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
        let file = Filer(square),
            rank = Rank(square);
        if (check && (file < 0 || file > 7 || rank < 0 || rank > 7))
            return "";
        let text = '';
        text += String.fromCharCode(97 + file);
        text += String.fromCharCode(56 - rank);
        return text;
    }

    /**
     * Get the UCI of a move number
     * @param {number} move
     * @returns {string}
     */
    function ucifyMove(move) {
        let promote = MovePromote(move),
            uci = squareToAn(MoveFrom(move), false) + squareToAn(MoveTo(move), false);
        if (promote)
            uci += PIECE_LOWER[promote];
        return uci;
    }

    /**
     * Get the UCI of a move object
     * @param {MoveText} obj
     * @returns {string}
     */
    function ucifyObject(obj) {
        if (!obj)
            return '???';
        let uci = squareToAn(obj.from, false) + squareToAn(obj.to, false);
        if (obj.promote)
            uci += PIECE_LOWER[obj.promote];
        return uci;
    }

    /**
     * Undo a move
     * @returns {boolean}
     */
    function undoMove() {
        if (ply <= 0)
            return false;
        ply --;

        let move,
            state = ply_states[ply & 127];
        [
            board_hash,
            castling,
            ep_square,
            half_moves,
            move,
        ] = state;

        turn ^= 1;
        if (turn == BLACK)
            move_number --;

        let move_capture = MoveCapture(move),
            move_flag = MoveFlag(move),
            move_from = MoveFrom(move),
            move_to = MoveTo(move),
            promote = MovePromote(move),
            squares = PIECE_SQUARES[turn],
            us = turn,
            them = turn ^ 1;

        if (move_from == move_to) {
            // null move
            return true;
        }

        // undo castle
        if (move_flag & BITS_CASTLE) {
            let q = (move_to < move_from)? 1: 0,
                king = move_from,
                king_piece = COLORIZE(us, KING),
                king_to = (Rank(king) << 4) + 6 - (q << 2),
                rook_piece = COLORIZE(us, ROOK),
                rook_to = king_to - 1 + (q << 1);

            board[king_to] = 0;
            board[rook_to] = 0;
            board[king] = king_piece;
            board[move_to] = rook_piece;
            kings[us] = king;

            // score
            positions[us]
                += squares[KING][king] - squares[KING][king_to]
                + squares[ROOK][move_to] - squares[ROOK][rook_to]
                - 30;
        }
        else {
            let piece = board[move_to];
            if (promote) {
                piece = COLORIZE(us, PAWN);
                materials[us] -= PROMOTE_SCORES[promote];
            }
            board[move_to] = 0;
            board[move_from] = piece;

            let piece_type = TYPE(piece);
            if (piece_type == KING)
                kings[us] = move_from;

            if (move_flag & BITS_EN_PASSANT) {
                let capture = COLORIZE(them, PAWN),
                    target = move_to + 16 - (us << 5);
                board[target] = capture;
                materials[them] += PIECE_SCORES[PAWN];
            }
            else if (move_capture) {
                let capture = COLORIZE(them, move_capture);
                board[move_to] = capture;
                materials[them] += PIECE_SCORES[move_capture];
            }

            // score
            let psquares = squares[piece_type];
            positions[turn] += psquares[move_from] - psquares[move_to];
        }

        return true;
    }

    /**
     * Unpack a move to an object
     * - 0-9 : order
     * - 10-12 : capture
     * - 13-14 : flag
     * - 15-21 : from
     * - 22-24 : promote
     * - 25-31 : to
     * @param {number} move
     * @returns {MoveText}
     */
    function unpackMove(move) {
        return {
            capture: MoveCapture(move),
            fen: '',
            flag: MoveFlag(move),
            from: MoveFrom(move),
            m: '',
            ply: -2,
            promote: MovePromote(move),
            pv: '',
            score: move & 1023,
            to: MoveTo(move),
        };
    }

    // if the user passes in a fen string, load it, else default to starting position
    load(fen_ || DEFAULT_POSITION, false);
    initSquares();

    // BINDING CODE
    ///////////////

    // CHESS BINDINGS
    return {
        //
        anToSquare: anToSquare,
        attacked: attacked,
        attacks: () => attacks,
        avgDepth: () => max_depth,
        board: () => board,
        boardHash: () => board_hash,
        castling: () => castling,
        checked: color => kingAttacked(color),
        cleanSan: cleanSan,
        clear: clear,
        configure: configure,
        currentFen: () => fen,
        decorateSan: decorateSan,
        defenses: () => defenses,
        evaluate: evaluate,
        fen: createFen,
        fen960: createFen960,
        frc: () => frc,
        hashBoard: hashBoard,
        hashStats: () => [tt_adds, tt_hits],
        load: load,
        makeMove: makeMove,
        material: color => materials[color],
        mobilities: () => mobilities,
        moveObject: moveObject,
        moves: legalMoves,
        moveSan: moveSan,
        moveToSan: moveToSan,
        moveUci: moveUci,
        multiSan: multiSan,
        multiUci: multiUci,
        nodes: () => nodes,
        order: orderMoves,
        packObject: packObject,
        params: params,
        perft: perft,
        piece: text => PIECES[text] || 0,
        print: print,
        prepare: prepareSearch,
        put: put,
        reset: reset,
        sanToObject: sanToObject,
        search: search,
        selDepth: () => Max(avg_depth, sel_depth),
        squareToAn: squareToAn,
        trace: () => trace,
        turn: () => turn,
        ucifyMove: ucifyMove,
        ucifyObject: ucifyObject,
        undo: undoMove,
        unpackMove: unpackMove,
        version: () => '20201102',
    };
};

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// <<
if (typeof exports != 'undefined')
    Assign(exports, {
        Chess: Chess,
        EMPTY: EMPTY,
        SQUARES: SQUARES,
    });
// >>
