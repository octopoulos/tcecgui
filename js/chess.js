// chess.js
// @author octopoulo <polluxyz@gmail.com>
// @version 2020-07-21
// - fast javascript implementation, 20x faster than original
// - FRC support
/*
globals
Assign, exports, Floor, global, Lower, Max, Min, require
*/
'use strict';

// <<
if (typeof global != 'undefined') {
    let req = require,
        {Assign, Floor, Lower, Max, Min} = req('./common');
    Assign(global, {
        Assign: Assign,
        Floor: Floor,
        Lower: Lower,
        Max: Max,
        Min: Min,
    });
}
// >>

var Chess = function(fen_) {
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
        COLORIZE = (color, type) => ((color == WHITE)? type: (type | 8)),
        DEFAULT_POSITION = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        EMPTY = -1,
        FILE = square => square & 15,
        I8 = array => new Int8Array(array),
        I32 = array => new Int32Array(array),
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

    // https://github.com/jhlywa/chess.js
    // tables
    let ATTACKS = I8([
           20, 0, 0, 0, 0, 0, 0,24, 0, 0, 0, 0, 0, 0,20, 0,
            0, 20, 0, 0, 0, 0, 0,24, 0, 0, 0, 0, 0,20, 0, 0,
            0, 0,20, 0, 0, 0, 0,24, 0, 0, 0, 0,20, 0, 0, 0,
            0, 0, 0,20, 0, 0, 0,24, 0, 0, 0,20, 0, 0, 0, 0,
            0, 0, 0, 0,20, 0, 0,24, 0, 0,20, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0,20, 2,24, 2,20, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 2,53,56,53, 2, 0, 0, 0, 0, 0, 0,
            24,24,24,24,24,24,56, 0,56,24,24,24,24,24,24, 0,
            0, 0, 0, 0, 0, 2,53,56,53, 2, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0,20, 2,24, 2,20, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0,20, 0, 0,24, 0, 0,20, 0, 0, 0, 0, 0,
            0, 0, 0,20, 0, 0, 0,24, 0, 0, 0,20, 0, 0, 0, 0,
            0, 0,20, 0, 0, 0, 0,24, 0, 0, 0, 0,20, 0, 0, 0,
            0,20, 0, 0, 0, 0, 0,24, 0, 0, 0, 0, 0,20, 0, 0,
           20, 0, 0, 0, 0, 0, 0,24, 0, 0, 0, 0, 0, 0,20,
        ]),
        ATTACK_BITS = I8([0, 1, 2, 4, 8, 16, 32]),
        PAWN_OFFSETS = [
            I8([-16, -32, -17, -15]),
            I8([16, 32, 17, 15]),
        ],
        PIECE_OFFSETS = [
            [],
            [],
            I8([-18, -33, -31, -14,  18, 33, 31,  14]),
            I8([-17, -15,  17,  15]),
            I8([-16,   1,  16,  -1]),
            I8([-17, -16, -15,   1,  17, 16, 15,  -1]),
            I8([-17, -16, -15,   1,  17, 16, 15,  -1]),
        ],
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
        ]),
        // https://github.com/jhlywa/chess.js
        RAYS = I8([
           17,  0,  0,  0,  0,  0,  0, 16,  0,  0,  0,  0,  0,  0, 15, 0,
            0, 17,  0,  0,  0,  0,  0, 16,  0,  0,  0,  0,  0, 15,  0, 0,
            0,  0, 17,  0,  0,  0,  0, 16,  0,  0,  0,  0, 15,  0,  0, 0,
            0,  0,  0, 17,  0,  0,  0, 16,  0,  0,  0, 15,  0,  0,  0, 0,
            0,  0,  0,  0, 17,  0,  0, 16,  0,  0, 15,  0,  0,  0,  0, 0,
            0,  0,  0,  0,  0, 17,  0, 16,  0, 15,  0,  0,  0,  0,  0, 0,
            0,  0,  0,  0,  0,  0, 17, 16, 15,  0,  0,  0,  0,  0,  0, 0,
            1,  1,  1,  1,  1,  1,  1,  0, -1, -1,  -1,-1, -1, -1, -1, 0,
            0,  0,  0,  0,  0,  0,-15,-16,-17,  0,  0,  0,  0,  0,  0, 0,
            0,  0,  0,  0,  0,-15,  0,-16,  0,-17,  0,  0,  0,  0,  0, 0,
            0,  0,  0,  0,-15,  0,  0,-16,  0,  0,-17,  0,  0,  0,  0, 0,
            0,  0,  0,-15,  0,  0,  0,-16,  0,  0,  0,-17,  0,  0,  0, 0,
            0,  0,-15,  0,  0,  0,  0,-16,  0,  0,  0,  0,-17,  0,  0, 0,
            0,-15,  0,  0,  0,  0,  0,-16,  0,  0,  0,  0,  0,-17,  0, 0,
          -15,  0,  0,  0,  0,  0,  0,-16,  0,  0,  0,  0,  0,  0,-17,
        ]);

    // extras
    let PIECES = {
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
        // https://github.com/jhlywa/chess.js
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

    // PRIVATE
    //////////

    let board = new Uint8Array(128),
        castling = [EMPTY, EMPTY, EMPTY, EMPTY],
        ep_square = EMPTY,
        fen = '',
        frc = false,
        half_moves = 0,
        histories = [],
        kings = [EMPTY, EMPTY],
        materials = [0, 0],
        max_depth = 4,
        max_extend = 0,
        max_nodes = 1e8,
        move_number = 1,
        nodes = 0,
        sel_depth = 0,
        turn = WHITE;

    // if the user passes in a fen string, load it, else default to starting position
    load(fen_ || DEFAULT_POSITION);

    /**
     * Add a move to the history
     * @param {Object} move
     */
    function addHistory(move) {
        histories.push({
            castling: [...castling],
            ep_square: ep_square,
            half_moves: half_moves,
            kings: [...kings],
            materials: [...materials],
            move: move,
            move_number: move_number,
        });
    }

    /**
     * Add a move + promote moves
     */
    function addMove(moves, from, to, flags) {
        // pawn promotion?
        let rank = RANK(to);
        if (TYPE(board[from]) == PAWN && (rank % 7) == 0) {
            for (let piece of [QUEEN, ROOK, BISHOP, KNIGHT])
                addSingleMove(moves, from, to, flags | BITS_PROMOTION, piece);
        }
        else
            addSingleMove(moves, from, to, flags, 0);
    }

    /**
     * Add a single move
     */
    function addSingleMove(moves, from, to, flags, promote) {
        let piece = board[from],
            move = {
                capture: 0,
                depth: 0,
                fen: '',
                flags: flags,
                from: from,
                m: '',
                piece: piece,
                ply: move_number * 2 + turn - 2,
                promote: 0,
                score: 0,
                to: to,
            };

        if (!(flags & BITS_CASTLE)) {
            if (promote)
                move.promote = promote;
            if (board[to])
                move.capture = TYPE(board[to]);
            else if (flags & BITS_EP_CAPTURE)
                move.capture = PAWN;
        }
        moves.push(move);
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

    // PUBLIC
    /////////

    /**
     * Convert AN to square
     * @param {string} an c2
     * @returns {number} 98
     */
    function anToSquare(an) {
        let square = SQUARES[an];
        return (square == undefined)? EMPTY: square;
    }
    /**
     * Check if a square is attacked by a color
     * @param {number} color attacking color
     * @param {number} square
     * @returns {boolean} true if the square is attacked
     */
    function attacked(color, square) {
        for (let i = SQUARE_A8; i <= SQUARE_H1; i ++) {
            // off board
            if (i & 0x88) {
                i += 7;
                continue;
            }

            // if empty square or wrong color
            let piece = board[i];
            if (!piece)
                continue;

            let piece_color = COLOR(piece);
            if (piece_color != color)
                continue;

            let difference = i - square,
                index = difference + 119,
                piece_type = TYPE(piece);

            if (ATTACKS[index] & ATTACK_BITS[piece_type]) {
                // pawn
                if (piece_type == PAWN) {
                    if (difference > 0) {
                        if (piece_color == WHITE)
                            return true;
                    }
                    else if (piece_color == BLACK)
                        return true;
                    continue;
                }

                // knight + king
                if (piece_type == KING || piece_type == KNIGHT)
                    return true;

                // others => cannot be blocked
                let blocked,
                    offset = RAYS[index],
                    j = i + offset;

                while (j != square) {
                    if (board[j]) {
                        blocked = true;
                        break;
                    }
                    j += offset;
                }
                if (!blocked)
                    return true;
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
        board = new Uint8Array(128);
        castling.fill(EMPTY);
        ep_square = EMPTY;
        fen = "";
        half_moves = 0;
        histories.length = 0;
        kings[0] = EMPTY;
        kings[1] = EMPTY;
        materials[0] = 0;
        materials[1] = 0;
        move_number = 1;
        nodes = 0;
        sel_depth = 0;
        turn = WHITE;
    }

    /**
     * Configure some parameters
     */
    function configure(frc_, max_depth_, max_extend_, max_nodes_) {
        frc = frc_;
        max_depth = max_depth_;
        max_extend = max_extend_;
        max_nodes = max_nodes_;
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
     * @param {boolean} legal only consider legal moves
     * @param {number} single_square calculate moves from a specific square
     * @returns {Object[]} moves
     */
    function createMoves(frc, legal, single_square) {
        let is_single = (single_square != EMPTY),
            first_sq = is_single? single_square: SQUARE_A8,
            last_sq = is_single? single_square: SQUARE_H1,
            moves = [],
            second_rank = [6, 1],
            us = turn,
            them = us ^ 1;

        for (let i = first_sq; i <= last_sq; i ++) {
            // off board
            if (i & 0x88) {
                i += 7;
                continue;
            }

            let piece = board[i];
            if (!piece || COLOR(piece) != us)
                continue;

            let piece_type = TYPE(piece);
            if (piece_type == PAWN) {
                let offsets = PAWN_OFFSETS[us];

                // single square, non-capturing
                let square = i + offsets[0];
                if (!board[square]) {
                    addMove(moves, i, square, BITS_NORMAL);

                    // double square
                    square = i + offsets[1];
                    if (second_rank[us] == RANK(i) && !board[square])
                        addMove(moves, i, square, BITS_BIG_PAWN);
                }

                // pawn captures
                for (let j = 2; j < 4; j ++) {
                    square = i + offsets[j];
                    if (square & 0x88)
                        continue;

                    if (board[square] && COLOR(board[square]) == them)
                        addMove(moves, i, square, BITS_CAPTURE);
                    else if (square == ep_square)
                        addMove(moves, i, ep_square, BITS_EP_CAPTURE);
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
                            addMove(moves, i, square, BITS_NORMAL);
                        else {
                            if (COLOR(board[square]) == us)
                                break;
                            addMove(moves, i, square, BITS_CAPTURE);
                            break;
                        }

                        // break if knight or king
                        if (piece_type == KING || piece_type == KNIGHT)
                            break;
                    }
                }
            }
        }

        // castling
        let king = kings[us];
        if (king != EMPTY && (!is_single || single_square == king)) {
            let pos0 = RANK(king) << 4;

            // q=0: king side, q=1: queen side
            for (let q = 0; q < 2; q ++) {
                let rook = castling[us * 2 + q];
                if (rook == EMPTY)
                    continue;

                let error = false,
                    flags = q? BITS_QSIDE_CASTLE: BITS_KSIDE_CASTLE,
                    king_to = pos0 + (q? 2: 6),
                    rook_to = king_to + (q? 1: -1),
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
                    addMove(moves, king, (frc || FILE(king) != 4 || FILE(rook) % 7)? rook: king_to, flags);
            }
        }

        // return pseudo-legal moves
        if (!legal)
            return moves;

        // filter out illegal moves
        return moves.filter(move => {
            moveRaw(move, false);
            let is_legal = !kingAttacked(us);
            undoMove();
            return is_legal;
        });
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
        half_moves = parseInt(tokens[4], 10);
        move_number = parseInt(tokens[5], 10);

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
            moves = createMoves(frc, true, EMPTY);     // move.from);

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
        if (move_obj.piece)
            moveRaw(move_obj, decorate);
        return move_obj;
    }

    /**
     * Make a raw move, no verification is being performed
     * https://github.com/jhlywa/chess.js
     * @param {Object} move
     * @param {boolean} decorate add + # decorators
     */
    function moveRaw(move, decorate) {
        let us = turn,
            them = us ^ 1;

        // not smart to do it for every move
        addHistory(move);

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
                    king_to = (RANK(king) << 4) + (q? 2: 6),
                    rook = castling[us * 2 + q];

                board[king] = 0;
                board[rook] = 0;
                board[king_to] = COLORIZE(us, KING);
                board[king_to + (q? 1: -1)] = COLORIZE(us, ROOK);
                move_to = king_to;
            }

            kings[us] = move_to;
            castling[us * 2] = EMPTY;
            castling[us * 2 + 1] = EMPTY;
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
                    if (move_to == castling[them * 2])
                        castling[them * 2] = EMPTY;
                    else if (move_to == castling[them * 2 + 1])
                        castling[them * 2 + 1] = EMPTY;
                }
            }

            // remove castling if we move a rook
            if (move_type == ROOK) {
                if (move_from == castling[us * 2])
                    castling[us * 2] = EMPTY;
                else if (move_from == castling[us * 2 + 1])
                    castling[us * 2 + 1] = EMPTY;
            }
            // pawn + update 50MR
            else if (move_type == PAWN) {
                // pawn moves 2 squares
                if (flags & BITS_BIG_PAWN)
                    ep_square = move_to + (turn == BLACK? -16: 16);
                else {
                    if (flags & BITS_EP_CAPTURE)
                        board[move_to + (turn == BLACK? -16: 16)] = 0;
                    if (flags & BITS_PROMOTION) {
                        board[move_to] = COLORIZE(us, move.promote);
                        materials[us] += PROMOTE_SCORES[move.promote];
                    }
                }
                half_moves = 0;
            }
            else if (flags & BITS_CAPTURE)
                half_moves = 0;
        }

        if (turn == BLACK)
            move_number ++;
        turn ^= 1;

        // decorate the SAN with + or #
        if (decorate) {
            let last = move.m.slice(-1);
            if (!'+#'.includes(last) && kingAttacked(turn)) {
                let moves = createMoves(frc, true, EMPTY);
                move.m += moves.length? '+': '#';
            }
        }
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
        let moves = createMoves(frc, true, EMPTY),
            move = sanToMove(text, moves, sloppy);
        if (move.piece)
            moveRaw(move, decorate);
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
        let move = {};
        move.from = anToSquare(text.substr(0, 2));
        move.promote = PIECES[text[4]];
        move.to = anToSquare(text.substr(2, 2));
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

            let moves = createMoves(frc, true, EMPTY),
                move = sanToMove(text, moves, sloppy);
            if (!move.piece)
                break;
            moveRaw(move, false);
            move.fen = createFen();
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
                result.push(move);
            }
        }
        return result;
    }

    /**
     * Print the board
     * @returns {string}
     */
    function print() {
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
        let null_move = {};
        if (!sloppy)
            return null_move;

        let from_file = -1,
            from_rank = -1,
            i = clean.length - 1,
            to = EMPTY,
            promote = 0,
            type = 0;

        if (i < 2)
            return null_move;

        // analyse backwards
        if ('bnrqBNRQ'.includes(clean[i])) {
            promote = TYPE(PIECES[clean[i]]);
            i --;
        }
        // to
        if (!'12345678'.includes(clean[i]))
            return null_move;
        i --;
        if (!'abcdefghij'.includes(clean[i]))
            return null_move;
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
        return null_move;
    }

    /**
     * Basic tree search with mask
     * @param {Move[]} moves
     * @param {string} mask moves to search, ex: 01100
     * @returns {Move[]} updated moves
     */
    function search(moves, mask) {
        nodes = 0;
        sel_depth = 0;

        let result = [0, 0];
        if (!mask) {
            searchMoves(moves, 1, result);
            return moves;
        }

        let masked = moves.filter((_, i) => !mask || mask[i] != '0');
        searchMoves(masked, 1, result);
        return masked;
    }

    /**
     * Basic tree search
     * @param {Move[]} moves
     * @param {number} depth
     * @param {[number, number]} result
     */
    function searchMoves(moves, depth, result) {
        let best = -99999,
            best_depth = depth,
            length = moves.length,
            look_deeper = (depth < max_depth && nodes < max_nodes),
            temp = [0, 0],
            valid = 0;

        nodes += length;
        if (depth > sel_depth)
            sel_depth = depth;

        for (let move of moves) {
            if (half_moves >= 50) {
                move.score = 0;
                break;
            }

            move.depth = depth;
            moveRaw(move, false);

            // invalid move?
            if (kingAttacked(3))
                move.score = -99900;
            else {
                move.score = materials[turn ^ 1] - materials[turn];
                valid ++;

                // look deeper
                if (look_deeper || (depth < max_extend && move.capture)) {
                    let moves2 = createMoves(frc, false, -1);
                    searchMoves(moves2, depth + 1, temp);

                    // stalemate? good if we're losing, otherwise BAD!
                    if (temp[0] < -80000)
                        move.score = 0;
                    else
                        move.score -= temp[0];
                    move.depth = temp[1];
                }
            }

            undoMove();
            if (depth >= 3 && move.score > 20000)
                break;
        }

        // checkmate?
        if (!valid && kingAttacked(2)) {
            best = -51200 + depth * 4000;
            best_depth = depth;
        }
        else {
            for (let move of moves) {
                move.score += valid * 2;
                if (best < move.score) {
                    best = move.score;
                    best_depth = move.depth;
                }
            }
        }

        result[0] = best;
        result[1] = best_depth;
    }

    /**
     * Convert a square number to an algebraic notation
     * @param {number} square 112
     * @param {boolean=} check check the boundaries
     * @returns {string} a1
     */
    function squareToAn(square, check) {
        let file = FILE(square),
            rank = RANK(square);
        if (check && (file < 0 || file > 7 || rank < 0 || rank > 7))
            return "";
        return `${'abcdefghij'[file] || '?'}${'87654321'[rank] || '?'}`;
    }

    /**
     * Add UCI to a move
     * @param {Move} move
     * @returns {string}
     */
    function ucify(move) {
        move.m = squareToAn(move.from, false) + squareToAn(move.to, false);
        if (move.promote)
            move.m += PIECE_LOWER[move.promote];
        return move.m;
    }

    /**
     * Undo a move
     */
    function undoMove() {
        if (!histories.length)
            return;
        let old = histories.pop();

        let move = old.move;
        castling = old.castling;
        ep_square = old.ep_square;
        half_moves = old.half_moves;
        kings = old.kings;
        materials = old.materials;
        move_number = old.move_number;
        turn ^= 1;

        let us = turn,
            them = turn ^ 1;

        // undo castle
        if (move.flags & BITS_CASTLE) {
                let q = (move.flags & BITS_QSIDE_CASTLE)? 1: 0,
                    king = kings[us],
                    king_to = (RANK(king) << 4) + (q? 2: 6),
                    rook = castling[us * 2 + q];

                board[king_to] = 0;
                board[king_to + (q? 1: -1)] = 0;
                board[king] = COLORIZE(us, KING);
                board[rook] = COLORIZE(us, ROOK);
        }
        else {
            if (move.from != move.to) {
                board[move.from] = move.piece;
                board[move.to] = 0;
            }

            if (move.flags & BITS_CAPTURE)
                board[move.to] = COLORIZE(them, move.capture);
            else if (move.flags & BITS_EP_CAPTURE) {
                let index = move.to + (us == BLACK? -16: 16);
                board[index] = COLORIZE(them, PAWN);
            }
        }
    }

    // BINDING CODE
    ///////////////

    // CHESS BINDINGS
    return {
        //
        anToSquare: anToSquare,
        attacked: attacked,
        board: () => board,
        castling: () => castling,
        checked: color => kingAttacked(color),
        cleanSan: cleanSan,
        clear: clear,
        configure: configure,
        currentFen: () => fen,
        fen: createFen,
        fen960: createFen960,
        frc: () => frc,
        load: load,
        material: color => materials[color],
        moveObject: moveObject,
        moveRaw: moveRaw,
        moveSan: moveSan,
        moveToSan: moveToSan,
        moveUci: moveUci,
        moves: createMoves,
        multiSan: multiSan,
        multiUci: multiUci,
        nodes: () => nodes,
        piece: text => PIECES[text] || 0,
        print: print,
        put: put,
        reset: reset,
        sanToMove: sanToMove,
        search: search,
        selDepth: () => sel_depth,
        squareToAn: squareToAn,
        turn: () => turn,
        ucify: ucify,
        undo: undoMove,
    };
};


// <<
if (typeof exports != 'undefined')
    Assign(exports, {
        Chess: Chess,
    });
// >>
