// chess.js
// - modified for speed
// - temporary file, it will soon be removed once XBoard is improved
// - FRC support

/* inspired by:
 * @license
 * Copyright (c) 2016, Jeff Hlywa (jhlywa@gmail.com)
 * Released under the BSD license
 * https://github.com/jhlywa/chess.js/blob/master/LICENSE
 */
/*
globals
define, exports
*/
'use strict';

var Chess = function(fen) {
    let BISHOP = 3,
        BLACK = 1,
        COLOR = piece => piece >> 3,
        COLOR_TEXT = 'wb',
        COLORIZE = (color, type) => ((color == WHITE)? type: (type | 8)),
        DEFAULT_POSITION = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        EMPTY = -1,
        FILE = square => square & 15,
        KING = 6,
        KNIGHT = 2,
        PAWN = 1,
        //             012345678901234
        PIECE_LOWER = ' pnbrqk  pnbrqk',
        PIECE_NAMES = ' PNBRQK  pnbrqk',
        PIECE_UPPER = ' PNBRQK  PNBRQK',
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
        QUEEN = 5,
        RANK = square => square >> 4,
        ROOK = 4,
        TYPE = piece => piece % 8,
        WHITE = 0;

    let ATTACKS = [
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
        ],
        ATTACK_BITS = [0, 1, 2, 4, 8, 16, 32],
        PAWN_OFFSETS = [
            [-16, -32, -17, -15],
            [16, 32, 17, 15],
        ],
        PIECE_OFFSETS = [
            [],
            [],
            [-18, -33, -31, -14,  18, 33, 31,  14],
            [-17, -15,  17,  15],
            [-16,   1,  16,  -1],
            [-17, -16, -15,   1,  17, 16, 15,  -1],
            [-17, -16, -15,   1,  17, 16, 15,  -1],
        ],
        RAYS = [
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
        ];

    let BITS_NORMAL = 1,
        BITS_CAPTURE = 2,
        BITS_BIG_PAWN = 4,
        BITS_EP_CAPTURE = 8,
        BITS_PROMOTION = 16,
        BITS_KSIDE_CASTLE = 32,
        BITS_QSIDE_CASTLE = 64,
        BITS_CASTLE = 32 + 64,
        SQUARE_A8 = 0,
        SQUARE_H1 = 119,
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

    let board = new Array(128),
        castling = [0, 0],
        ep_square = EMPTY,
        half_moves = 0,
        history = [],
        kings = [EMPTY, EMPTY],
        move_number = 1,
        turn = WHITE;

    // if the user passes in a fen string, load it, else default to starting position
    load((fen == undefined)? DEFAULT_POSITION: fen);

    // CHESS
    ////////

    function addMove(moves, from, to, flags, rook=EMPTY) {
        // pawn promotion?
        if (TYPE(board[from]) == PAWN && [0, 7].includes(RANK(to))) {
            for (let piece of [QUEEN, ROOK, BISHOP, KNIGHT])
                moves.push(buildMove(from, to, flags, piece, EMPTY));
        }
        else
            moves.push(buildMove(from, to, flags, null, rook));
    }

    function algebraic(square) {
        return `${'abcdefgh'[FILE(square)]}${'87654321'[RANK(square)]}`;
    }

    /**
     * Check if a square is attacked by a color
     * @param {number} color attacking color
     * @param {number} square
     * @returns {boolean}
     */
    function attacked(color, square) {
        for (let i = SQUARE_A8; i <= SQUARE_H1; i ++) {
            // did we run off the end of the board
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
                if (piece_type == PAWN) {
                    if (difference > 0) {
                        if (piece_color == WHITE)
                            return true;
                    }
                    else if (piece_color == BLACK)
                        return true;
                    continue;
                }

                // if the piece is a knight or a king
                if (piece_type == KING || piece_type == KNIGHT)
                    return true;

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

    function buildMove(from, to, flags, promotion, rook) {
        let piece = board[from],
            move = {
                color: turn,
                flags: flags,
                from: from,
                piece: piece,
                to: to,
                type: TYPE(piece),
            };

        if (promotion) {
            move.flags |= BITS_PROMOTION;
            move.promotion = promotion;
        }
        if (rook != EMPTY)
            move.rook = rook;
        else if (board[to])
            move.captured = TYPE(board[to]);
        else if (flags & BITS_EP_CAPTURE)
            move.captured = PAWN;

        return move;
    }

    function clear() {
        board = new Array(128);
        castling = [0, 0];
        ep_square = EMPTY;
        half_moves = 0;
        history = [];
        kings = [EMPTY, EMPTY];
        move_number = 1;
        turn = WHITE;
    }

    /**
     * Create the FEN
     * @returns {string}
     */
    function createFen() {
        let empty = 0,
            fen = '';

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

            if ((i + 1) & 0x88) {
                if (empty > 0)
                    fen += empty;
                if (i != SQUARE_H1)
                    fen += '/';

                empty = 0;
                i += 8;
            }
        }

        let cflags = '';
        if (castling[WHITE] & BITS_KSIDE_CASTLE) cflags += 'K';
        if (castling[WHITE] & BITS_QSIDE_CASTLE) cflags += 'Q';
        if (castling[BLACK] & BITS_KSIDE_CASTLE) cflags += 'k';
        if (castling[BLACK] & BITS_QSIDE_CASTLE) cflags += 'q';

        // do we have an empty castling flag?
        cflags = cflags || '-';
        let epflags = (ep_square == EMPTY)? '-': algebraic(ep_square);

        return [fen, COLOR_TEXT[turn], cflags, epflags, half_moves, move_number].join(' ');
    }

    /**
     * Create the moves
     * @param {boolen} frc
     * @param {boolean} legal
     * @param {number} single_square
     * @returns {Object[]} moves
     */
    function createMoves({frc, legal, single_square}={}) {
        let first_sq = SQUARE_A8,
            last_sq = SQUARE_H1,
            moves = [],
            second_rank = [6, 1],
            us = turn,
            them = 1 - us;

        // are we generating moves for a single square?
        if (single_square != undefined) {
            first_sq = SQUARES[single_square] || single_square;
            last_sq = first_sq;
        }

        for (let i = first_sq; i <= last_sq; i ++) {
            // did we run off the end of the board
            if (i & 0x88) {
                i += 7;
                continue;
            }

            let piece = board[i];
            if (!piece || COLOR(piece) != us)
                continue;

            let piece_type = TYPE(piece);
            if (piece_type == PAWN) {
                // single square, non-capturing
                let square = i + PAWN_OFFSETS[us][0];
                if (!board[square]) {
                    addMove(moves, i, square, BITS_NORMAL);

                    // double square
                    square = i + PAWN_OFFSETS[us][1];
                    if (second_rank[us] == RANK(i) && !board[square])
                        addMove(moves, i, square, BITS_BIG_PAWN);
                }

                // pawn captures
                for (let j = 2; j < 4; j++) {
                    square = i + PAWN_OFFSETS[us][j];
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
                for (let j = 0; j < 8; j++) {
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

                        // break, if knight or king
                        if (piece_type == KING || piece_type == KNIGHT)
                            break;
                    }
                }
            }
        }

        // check for castling if:
        // a) we're generating all moves
        // b) we're doing single square move generation on the king's square
        let castling_from = kings[us];
        if (castling_from != EMPTY && (!single_square || last_sq == castling_from)) {
            // king-side castling
            if (castling[us] & BITS_KSIDE_CASTLE) {
                let castling_to, error, rook,
                    pos0 = RANK(castling_from) << 4;

                if (frc) {
                    let pos = pos0 + 7;
                    while (!error && pos != castling_from) {
                        let square = board[pos];
                        if (square) {
                            if (rook == undefined) {
                                if (TYPE(square) == ROOK && COLOR(square) == us)
                                    rook = pos;
                            }
                            else
                                error = pos;
                        }
                        else if (rook != undefined && attacked(them, pos))
                            error = pos;
                        pos --;
                    }

                    castling_to = pos0 + 6;
                }
                else if (FILE(castling_from) == 4) {
                    castling_to = castling_from + 2;
                    rook = pos0 + 7;

                    if (board[castling_from + 1]
                            || board[castling_to]
                            || attacked(them, castling_from + 1)
                            || attacked(them, castling_to))
                        error = -1;
                }
                else
                    error = -2;

                if (!error && !attacked(them, castling_from))
                    addMove(moves, castling_from, castling_to, BITS_KSIDE_CASTLE, rook);
            }

            // queen-side castling
            if (castling[us] & BITS_QSIDE_CASTLE) {
                let castling_to, error, rook,
                    pos0 = RANK(castling_from) << 4;

                if (frc) {
                    let error,
                        pos = pos0;
                    while (!error && pos != castling_from) {
                        let square = board[pos];
                        if (square) {
                            if (rook == undefined) {
                                if (TYPE(square) == ROOK && COLOR(square) == us)
                                    rook = pos;
                            }
                            else
                                error = pos;
                        }
                        else if (rook != undefined && attacked(them, pos))
                            error = pos;
                        pos ++;
                    }

                    castling_to = pos0 + 2;
                }
                else if (FILE(castling_from) == 4) {
                    castling_to = castling_from - 2;
                    rook = pos0;

                    if (board[castling_from - 1]
                            || board[castling_from - 2]
                            || board[castling_from - 3]
                            || attacked(them, castling_from - 1)
                            || attacked(them, castling_to))
                        error = -1;
                }
                else
                    error = -2;

                if (!error && !attacked(them, castling_from))
                    addMove(moves, castling_from, castling_to, BITS_QSIDE_CASTLE, rook);
            }
        }

        // return pseudo-legal moves
        if (!legal)
            return moves;

        // filter out illegal moves
        return moves.filter(move => {
            makeMove(move);
            let is_legal = !kingAttacked(us);
            undoMove();
            return is_legal;
        });
    }

    // this function is used to uniquely identify ambiguous moves
    function get_disambiguator(move, sloppy) {
        let ambiguities = 0,
            from = move.from,
            moves = createMoves({legal: !sloppy}),
            same_file = 0,
            same_rank = 0,
            to = move.to,
            type = move.type;

        for (let i = 0, len = moves.length; i < len; i ++) {
            let ambig_from = moves[i].from,
                ambig_to = moves[i].to,
                ambig_type = moves[i].type;

            // if a move of the same piece type ends on the same to square,
            // we'll need to add a disambiguator to the algebraic notation
            if (type == ambig_type && from != ambig_from && to == ambig_to) {
                ambiguities ++;

                if (RANK(from) == RANK(ambig_from))
                    same_rank ++;
                if (FILE(from) == FILE(ambig_from))
                    same_file ++;
            }
        }

        if (ambiguities > 0) {
            // if there exists a similar moving piece on the same rank and file as
            // the move in question, use the square as the disambiguator
            if (same_rank > 0 && same_file > 0)
                return algebraic(from);
            // if the moving piece rests on the same file, use the rank symbol as the disambiguator
            else if (same_file > 0)
                return algebraic(from)[1];
            // else use the file symbol
            else
                return algebraic(from)[0];
        }

        return '';
    }

    function kingAttacked(color) {
        return attacked(1 - color, kings[color]);
    }

    function load(fen) {
        if (!fen)
            return false;

        let tokens = fen.split(/\s+/),
            position = tokens[0],
            square = 0;

        clear();

        for (let i = 0; i < position.length; i ++) {
            let piece = position[i];

            if (piece == '/')
                square += 8;
            else if ('123456789'.includes(piece))
                square += parseInt(piece, 10);
            else {
                put(PIECES[piece], square);
                square ++;
            }
        }

        turn = (tokens[1] == 'w')? 0: 1;

        if (tokens[2].includes('K'))
            castling[0] |= BITS_KSIDE_CASTLE;
        if (tokens[2].includes('Q'))
            castling[0] |= BITS_QSIDE_CASTLE;
        if (tokens[2].includes('k'))
            castling[1] |= BITS_KSIDE_CASTLE;
        if (tokens[2].includes('q'))
            castling[1] |= BITS_QSIDE_CASTLE;

        ep_square = (tokens[3] == '-') ? EMPTY: SQUARES[tokens[3]];
        half_moves = parseInt(tokens[4], 10);
        move_number = parseInt(tokens[5], 10);
        return true;
    }

    /**
     * Make a move
     * @param {Object} move
     */
    function makeMove(move) {
        let us = turn,
            them = 1 - us;
        push(move);

        if (move.from != move.to) {
            board[move.to] = board[move.from];
            board[move.from] = null;
        }

        // if ep capture, remove the captured pawn
        if (move.flags & BITS_EP_CAPTURE)
            if (turn == BLACK)
                board[move.to - 16] = null;
            else
                board[move.to + 16] = null;

        // if pawn promotion, replace with new piece
        if (move.flags & BITS_PROMOTION)
            board[move.to] = COLORIZE(us, move.promotion);

        // if we moved the king
        if (TYPE(board[move.to]) == KING) {
            kings[COLOR(board[move.to])] = move.to;

            // if we castled, move the rook next to the king
            if (move.flags & BITS_CASTLE) {
                let castling_from = move.rook,
                    castling_to = (move.flags & BITS_KSIDE_CASTLE)? move.to - 1: move.to + 1;
                board[castling_to] = COLORIZE(us, ROOK);
                if (castling_from != castling_to && castling_from != move.to)
                    board[castling_from] = null;
            }

            // turn off castling
            castling[us] = '';
        }

        // turn off castling if we move a rook
        if (castling[us] && move.type == ROOK && RANK(move.from) == RANK(kings[us])) {
            if (move.from > kings[us])
                castling[us] &= ~BITS_KSIDE_CASTLE;
            else
                castling[us] &= ~BITS_QSIDE_CASTLE;
        }

        // turn off castling if we capture a rook
        if (castling[them] && move.captured == ROOK && RANK(move.to) == RANK(kings[them])) {
            if (move.to > kings[them])
                castling[them] &= ~BITS_KSIDE_CASTLE;
            else
                castling[them] &= ~BITS_QSIDE_CASTLE;
        }

        // if big pawn move, update the en passant square
        if (move.flags & BITS_BIG_PAWN) {
            if (turn == BLACK)
                ep_square = move.to - 16;
            else
                ep_square = move.to + 16;
        }
        else
            ep_square = EMPTY;

        // reset the 50 move counter if a pawn is moved or a piece is captured
        if (move.type == PAWN)
            half_moves = 0;
        else if (move.flags & (BITS_CAPTURE | BITS_EP_CAPTURE))
            half_moves = 0;
        else
            half_moves ++;

        if (turn == BLACK)
            move_number ++;
        turn = 1 - turn;
    }

    // convert a move from Standard Algebraic Notation (SAN) to 0x88 coordinates
    function move_from_san(move, moves, frc) {
        // strip off any move decorations: e.g Nf3+?!
        let from, matches, piece, promotion, to,
            clean_move = stripped_san(move);

        for (let i = 0, len = moves.length; i < len; i ++) {
            // try the strict parser first, then the sloppy parser if requested by the user
            if (clean_move == stripped_san(move_to_san(moves[i])))
                return moves[i];

            if (matches &&
                    (!piece || TYPE(piece) == moves[i].type) &&
                    SQUARES[from] == moves[i].from && SQUARES[to] == moves[i].to &&
                    (!promotion || TYPE(promotion) == moves[i].promotion)) {
                return moves[i];
            }
        }

        return null;
    }

    /* convert a move from 0x88 coordinates to Standard Algebraic Notation
     * (SAN)
     *
     * @param {boolean} sloppy Use the sloppy SAN generator to work around over
     * disambiguation bugs in Fritz and Chessbase.    See below:
     *
     * r1bqkbnr/ppp2ppp/2n5/1B1pP3/4P3/8/PPPP2PP/RNBQK1NR b KQkq - 2 4
     * 4. ... Nge7 is overly disambiguated because the knight on c6 is pinned
     * 4. ... Ne7 is technically the valid SAN
     */
    function move_to_san(move, sloppy) {
        let output = '';

        if (move.flags & BITS_KSIDE_CASTLE)
            output = 'O-O';
        else if (move.flags & BITS_QSIDE_CASTLE)
            output = 'O-O-O';
        else {
            let disambiguator = get_disambiguator(move, sloppy);

            if (move.type != PAWN)
                output += PIECE_UPPER[move.type] + disambiguator;

            if (move.flags & (BITS_CAPTURE | BITS_EP_CAPTURE)) {
                if (move.type == PAWN)
                    output += algebraic(move.from)[0];
                output += 'x';
            }

            output += algebraic(move.to);

            if (move.flags & BITS_PROMOTION)
                output += '=' + PIECE_UPPER[move.promotion];
        }

        return output;
    }

    function push(move) {
        history.push({
            move: move,
            kings: [...kings],
            turn: turn,
            castling: [...castling],
            ep_square: ep_square,
            half_moves: half_moves,
            move_number: move_number
        });
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
    }

    function reset() {
        load(DEFAULT_POSITION);
    }

    // parses all of the decorators out of a SAN string
    function stripped_san(move) {
        return move.replace(/=/, '').replace(/[+#]?[?!]*$/, '');
    }

    function undoMove() {
        let old = history.pop();
        if (old == null)
            return null;

        let move = old.move;
        kings = old.kings;
        turn = old.turn;
        castling = old.castling;
        ep_square = old.ep_square;
        half_moves = old.half_moves;
        move_number = old.move_number;

        let us = turn,
            them = 1 - turn;

        if (move.from != move.to) {
            board[move.from] = move.piece;
            board[move.to] = null;
        }

        if (move.flags & BITS_CAPTURE)
            board[move.to] = COLORIZE(them, move.captured);
        else if (move.flags & BITS_EP_CAPTURE) {
            let index;
            if (us == BLACK)
                index = move.to - 16;
            else
                index = move.to + 16;
            board[index] = COLORIZE(them, PAWN);
        }

        // undo castle
        if (move.flags & BITS_CASTLE) {
            let castling_from = (move.flags & BITS_KSIDE_CASTLE)? move.to - 1: move.to + 1;
            board[move.rook] = COLORIZE(us, ROOK);
            if (castling_from != move.from && castling_from != move.rook)
                board[castling_from] = null;
        }

        return move;
    }

    // API
    //////

    return {
        attacked: attacked,
        board: () => {
            return board;
        },
        checked: () => {
            return kingAttacked(turn);
        },
        clear: clear,
        fen: createFen,
        load: load,

        /**
         * Move
         * @param {string|Object} move ex: Nxb7, {from: 'h7', to: 'h8', promotion: 'q'}
         * @param {Object=} options
         */
        move: (move, options={}) => {
            let frc = options.frc,
                move_obj = null,
                moves = createMoves({frc: frc});

            if (typeof move == 'string')
                move_obj = move_from_san(move, moves, frc);
            else if (typeof move == 'object') {
                // convert the pretty move object to an ugly move object
                for (let move2 of moves) {
                    if (move.from == algebraic(move2.from)
                            && move.to == algebraic(move2.to)
                            && (!move2.promotion || TYPE(move.promotion) == move2.promotion)) {
                        move_obj = move2;
                        move_obj.san = move_to_san(move_obj);
                        break;
                    }
                }
            }

            // failed to find move
            if (!move_obj)
                return null;

            if (frc)
                move_obj.frc = frc;

            makeMove(move_obj);
            return move_obj;
        },

        moves: createMoves,
        PIECE_NAMES: PIECE_NAMES,
        PIECES: PIECES,
        put: put,
        reset: reset,
        SQUARES: SQUARES,
        undo: undoMove,
    };
};

// <<
if (typeof exports != 'undefined')
    exports.Chess = Chess;
// >>
