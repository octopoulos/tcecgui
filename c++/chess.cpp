// chess.cpp
// @author octopoulo <polluxyz@gmail.com>
// @version 2020-07-17
// - wasm implementation, 3x faster than original, and 1.5x faster than fast chess.js
// - FRC support
// - emcc --bind -o chess.js chess.cpp -s WASM=1 -Wall -s MODULARIZE=1 -O3 --closure 1

#include <emscripten/bind.h>
#include <emscripten/val.h>
#include <iostream>
#include <map>
#include <stdio.h>

using namespace emscripten;

#define DELETE(x) {if (x) delete x; x = nullptr;}
#define DELETE_ARRAY(x) {if (x) delete [] x; x = nullptr;}

// chess
#define BISHOP 3
#define BITS_BIG_PAWN 4
#define BITS_CAPTURE 2
#define BITS_CASTLE 96
#define BITS_EP_CAPTURE 8
#define BITS_KSIDE_CASTLE 32
#define BITS_NORMAL 1
#define BITS_PROMOTION 16
#define BITS_QSIDE_CASTLE 64
#define BLACK 1
#define COLOR(piece) (piece >> 3)
#define COLOR_TEXT(color) ((color == 0)? 'w': 'b')
#define COLORIZE(color, type) ((color == 0)? type: (type | 8))
#define DEFAULT_POSITION "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
#define EMPTY -1
#define FILE(square) (square & 15)
#define FILE_ALGEBRAIC(square) ('a' + FILE(square))
#define KING 6
#define KNIGHT 2
#define PAWN 1
#define QUEEN 5
#define RANK(square) (square >> 4)
#define RANK_ALGEBRAIC(square) ('8' - RANK(square))
#define ROOK 4
#define SQUARE_A8 0
#define SQUARE_H1 119
//                             11111
//                   012345678901234
#define PIECE_LOWER " pnbrqk  pnbrqk"
#define PIECE_NAMES " PNBRQK  pnbrqk"
#define PIECE_UPPER " PNBRQK  PNBRQK"
#define TYPE(piece) (piece % 8)
#define WHITE 0

int ATTACKS[] = {
       20, 0, 0, 0, 0, 0, 0,24, 0, 0, 0, 0, 0, 0,20, 0,
        0,20, 0, 0, 0, 0, 0,24, 0, 0, 0, 0, 0,20, 0, 0,
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
    },
    ATTACK_BITS[] = {0, 1, 2, 4, 8, 16, 32},
    PAWN_OFFSETS[2][4] = {
        {-16, -32, -17, -15},
        {16, 32, 17, 15},
    },
    PIECE_OFFSETS[7][8] = {
        {  0,   0,   0,   0,  0,  0,  0,  0},
        {  0,   0,   0,   0,  0,  0,  0,  0},
        {-18, -33, -31, -14, 18, 33, 31, 14},
        {-17, -15,  17,  15,  0,  0,  0,  0},
        {-16,   1,  16,  -1,  0,  0,  0,  0},
        {-17, -16, -15,   1, 17, 16, 15, -1},
        {-17, -16, -15,   1, 17, 16, 15, -1},
    },
    RAYS[] = {
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
    };

std::map<char, uint8_t> PIECES = {
    {'P', 1},
    {'N', 2},
    {'B', 3},
    {'R', 4},
    {'Q', 5},
    {'K', 6},
    {'p', 9},
    {'n', 10},
    {'b', 11},
    {'r', 12},
    {'q', 13},
    {'k', 14},
};

struct Move {
    uint8_t capture;
    std::string fen;
    uint8_t flags;
    int     from;
    uint8_t piece;
    int     ply;
    uint8_t promote;
    int     rook;
    std::string san;
    int     to;

    Move() {
        capture = 0;
        flags = 0;
        from = EMPTY;
        piece = 0;
        ply = -1;
        promote = 0;
        rook = EMPTY;
        to = EMPTY;
    }
};

struct History {
    int     castling[4];
    int     ep_square;
    int     half_moves;
    int     kings[2];
    Move    move;
    int     move_number;
    uint8_t turn;
};

class Chess {
    // PRIVATE
    //////////

private:
    uint8_t *board;
    int     castling[4];
    int     ep_square;
    std::string fen;
    bool    frc;
    int     half_moves;
    std::vector<History> histories;
    int     kings[2];
    int     move_number;
    uint8_t turn;

    /**
     * Add a move to the history
     */
    void addHistory(Move &move) {
        History history;
        memcpy(&history.castling, &castling, sizeof(castling));
        history.ep_square = ep_square;
        history.half_moves = half_moves;
        memcpy(&history.kings, &kings, sizeof(kings));
        memcpy(&history.move, &move, sizeof(Move));
        history.move_number = move_number;
        histories.push_back(history);
    }

    /**
     * Add a move + promote moves
     */
    void addMove(std::vector<Move> &moves, int from, int to, uint8_t flags, int rook) {
        // pawn promotion?
        int rank = RANK(to);
        if (TYPE(board[from]) == PAWN && (rank == 0 || rank == 7)) {
            for (uint8_t piece = QUEEN; piece >= KNIGHT; piece --)
                addSingleMove(moves, from, to, flags | BITS_PROMOTION, piece, EMPTY);
        }
        else
            addSingleMove(moves, from, to, flags, 0, rook);
    }

    /**
     * Add a single move
     */
    void addSingleMove(std::vector<Move> &moves, int from, int to, uint8_t flags, uint8_t promote, int rook) {
        uint8_t piece = board[from];
        Move move;
        move.flags = flags;
        move.from = from;
        move.piece = piece;
        move.ply = move_number * 2 + turn - 2;
        move.to = to;

        if (promote)
            move.promote = promote;
        if (rook != EMPTY)
            move.rook = rook;
        else if (board[to])
            move.capture = TYPE(board[to]);
        else if (flags & BITS_EP_CAPTURE)
            move.capture = PAWN;

        moves.push_back(move);
    }

    /**
     * Uniquely identify ambiguous moves
     */
    std::string getDisambiguator(Move &move, bool sloppy) {
        int ambiguities = 0,
            from = move.from,
            same_file = 0,
            same_rank = 0,
            to = move.to;
        auto moves = createMoves(false, !sloppy, EMPTY);
        uint8_t type = TYPE(move.piece);

        for (auto move2 : moves) {
            int ambig_from = move2.from,
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

        // if there exists a similar moving piece on the same rank and file as
        // the move in question, use the square as the disambiguator
        if (same_rank > 0 && same_file > 0)
            return squareToAn(from, false);
        // if the moving piece rests on the same file, use the rank symbol as the disambiguator
        else if (same_file > 0)
            return squareToAn(from, false).substr(1, 1);
        // else use the file symbol
        else
            return squareToAn(from, false).substr(0, 1);
    }

    /**
     * Make a move
     */
    void makeMove(Move &move) {
        uint8_t us = turn,
            them = us ^ 1;
        addHistory(move);

        if (move.from != move.to) {
            board[move.to] = board[move.from];
            board[move.from] = 0;
        }

        // if ep capture, remove the capture pawn
        if (move.flags & BITS_EP_CAPTURE)
            board[move.to + (turn == BLACK? -16: 16)] = 0;

        // if pawn promote, replace with new piece
        if (move.flags & BITS_PROMOTION)
            board[move.to] = COLORIZE(us, move.promote);

        // if we moved the king
        if (TYPE(board[move.to]) == KING) {
            kings[COLOR(board[move.to])] = move.to;

            // if we castled, move the rook next to the king
            if (move.flags & BITS_CASTLE) {
                int castling_from = move.rook,
                    castling_to = (move.flags & BITS_KSIDE_CASTLE)? move.to - 1: move.to + 1;
                board[castling_to] = COLORIZE(us, ROOK);
                if (castling_from != castling_to && castling_from != move.to)
                    board[castling_from] = 0;
            }

            // turn off castling
            castling[us * 2] = EMPTY;
            castling[us * 2 + 1] = EMPTY;
        }

        uint8_t move_type = TYPE(move.piece);

        // remove castling if we move a rook
        if (move_type == ROOK) {
            if (move.from == castling[us * 2])
                castling[us * 2] = EMPTY;
            else if (move.from == castling[us * 2 + 1])
                castling[us * 2 + 1] = EMPTY;
        }

        // remove castling if we capture a rook
        if (move.capture == ROOK) {
            if (move.to == castling[them * 2])
                castling[them * 2] = EMPTY;
            else if (move.to == castling[them * 2 + 1])
                castling[them * 2 + 1] = EMPTY;
        }

        // if big pawn move, update the en passant square
        if (move.flags & BITS_BIG_PAWN)
            ep_square = move.to + (turn == BLACK? -16: 16);
        else
            ep_square = EMPTY;

        // reset the 50 move counter if a pawn is moved or a piece is capture
        if (move_type == PAWN)
            half_moves = 0;
        else if (move.flags & (BITS_CAPTURE | BITS_EP_CAPTURE))
            half_moves = 0;
        else
            half_moves ++;

        if (turn == BLACK)
            move_number ++;
        turn ^= 1;
    }

    // PUBLIC
    /////////

public:
    Chess() {
        board = new uint8_t[128];

        clear();
        load(DEFAULT_POSITION);
    }

    ~Chess() {
        DELETE_ARRAY(board);
    }

    /**
     * Convert AN to square
     * @param an c2
     * @return 98
     */
    int anToSquare(std::string an) {
        int file = an[0] - 'a',
            rank = '8' - an[1];
        return file + (rank << 4);
    }

    /**
     * Check if a square is attacked by a color
     * @param color attacking color
     * @param square .
     * @return true if the square is attacked
     */
    bool attacked(uint8_t color, int square) {
        for (int i = SQUARE_A8; i <= SQUARE_H1; i ++) {
            // off board
            if (i & 0x88) {
                i += 7;
                continue;
            }

            // if empty square or wrong color
            auto piece = board[i];
            if (!piece)
                continue;

            uint8_t piece_color = COLOR(piece);
            if (piece_color != color)
                continue;

            int difference = i - square,
                index = difference + 119;
            uint8_t piece_type = TYPE(piece);

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
                bool blocked = false;
                int offset = RAYS[index],
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
     * @param san Bxe6+!!
     * @return clean san Bxe6
     */
    std::string cleanSan(std::string san) {
        int i = san.size() - 1;
        for (; i >= 0 && strchr("+#?!", san[i]); i --)
            san.erase(i, 1);
        for (; i >= 0; i --)
            if (san[i] == '=') {
                san.erase(i, 1);
                break;
            }

        return san;
    }

    /**
     * Clear the board
     */
    void clear() {
        memset(board, 0, 128 * sizeof(uint8_t));
        memset(castling, EMPTY, 4 * sizeof(int));
        ep_square = EMPTY;
        fen = "";
        frc = false;
        half_moves = 0;
        histories.clear();
        kings[0] = EMPTY;
        kings[1] = EMPTY;
        move_number = 1;
        turn = WHITE;
    }

    /**
     * Create the FEN
     * @return fen
     */
    std::string createFen() {
        int empty = 0;
        fen = "";

        for (int i = SQUARE_A8; i <= SQUARE_H1; i ++) {
            auto piece = board[i];
            if (!piece)
                empty ++;
            else {
                if (empty > 0) {
                    fen += ('0' + empty);
                    empty = 0;
                }
                fen += PIECE_NAMES[piece];
            }

            // off board
            if ((i + 1) & 0x88) {
                if (empty > 0)
                    fen += ('0' + empty);
                if (i != SQUARE_H1)
                    fen += '/';

                empty = 0;
                i += 8;
            }
        }

        std::string castle;
        if (frc) {
            for (auto square : castling)
                if (square != EMPTY) {
                    int file = FILE(square),
                        rank = RANK(square);
                    if (rank > 0)
                        castle += (file + 'A');
                    else
                        castle += (file + 'a');
                }
        }
        else {
            if (castling[0] != EMPTY) castle += 'K';
            if (castling[1] != EMPTY) castle += 'Q';
            if (castling[2] != EMPTY) castle += 'k';
            if (castling[3] != EMPTY) castle += 'q';
        }

        // empty castling flag?
        if (castle.empty())
            castle = "-";

        std::string epflags;
        if (ep_square == EMPTY)
            epflags += "-";
        else {
            epflags += FILE_ALGEBRAIC(ep_square);
            epflags += RANK_ALGEBRAIC(ep_square);
        }

        fen = fen + " " + COLOR_TEXT(turn) + " " + castle + " " + epflags + " " + std::to_string(half_moves) + " " + std::to_string(move_number);
        return fen;
    }

    /**
     * Create the moves
     * @param frc Fisher Random Chess
     * @param legal only consider legal moves
     * @param single_square calculate moves from a specific square
     * @return moves
     */
    std::vector<Move> createMoves(bool frc, bool legal, int single_square) {
        bool is_single = (single_square != EMPTY);
        int first_sq = is_single? single_square: SQUARE_A8,
            last_sq = is_single? single_square: SQUARE_H1;
        std::vector<Move> moves;
        int second_rank[] = {6, 1};
        uint8_t us = turn,
            them = 1 - us;

        for (int i = first_sq; i <= last_sq; i ++) {
            // off board
            if (i & 0x88) {
                i += 7;
                continue;
            }

            auto piece = board[i];
            if (!piece || COLOR(piece) != us)
                continue;

            auto piece_type = TYPE(piece);
            if (piece_type == PAWN) {
                int *offsets = PAWN_OFFSETS[us];

                // single square, non-capturing
                int square = i + offsets[0];
                if (!board[square]) {
                    addMove(moves, i, square, BITS_NORMAL, EMPTY);

                    // double square
                    square = i + offsets[1];
                    if (second_rank[us] == RANK(i) && !board[square])
                        addMove(moves, i, square, BITS_BIG_PAWN, EMPTY);
                }

                // pawn captures
                for (int j = 2; j < 4; j ++) {
                    square = i + offsets[j];
                    if (square & 0x88)
                        continue;

                    if (board[square] && COLOR(board[square]) == them)
                        addMove(moves, i, square, BITS_CAPTURE, EMPTY);
                    else if (square == ep_square)
                        addMove(moves, i, ep_square, BITS_EP_CAPTURE, EMPTY);
                }
            }
            else {
                int *offsets = PIECE_OFFSETS[piece_type];
                for (int j = 0; j < 8; j++) {
                    int offset = offsets[j],
                        square = i;
                    if (!offset)
                        break;

                    while (true) {
                        square += offset;
                        if (square & 0x88)
                            break;

                        if (!board[square])
                            addMove(moves, i, square, BITS_NORMAL, EMPTY);
                        else {
                            if (COLOR(board[square]) == us)
                                break;
                            addMove(moves, i, square, BITS_CAPTURE, EMPTY);
                            break;
                        }

                        // break if knight or king
                        if (piece_type == KING || piece_type == KNIGHT)
                            break;
                    }
                }
            }
        }

        // check for castling if:
        // a) we're generating all moves
        // b) we're doing single square move generation on the king's square
        int castling_from = kings[us];
        if (castling_from != EMPTY && (!is_single || single_square == castling_from)) {
            // king-side castling
            if (castling[us * 2] != EMPTY) {
                auto error = false;
                int castling_to,
                    pos0 = RANK(castling_from) << 4,
                    rook = EMPTY;

                if (frc) {
                    castling_to = pos0 + 6;
                    int pos = pos0 + 7;
                    while (!error && pos != castling_from) {
                        auto square = board[pos];
                        if (square) {
                            if (rook == EMPTY) {
                                if (TYPE(square) == ROOK && COLOR(square) == us)
                                    rook = pos;
                            }
                            else
                                error = true;
                        }
                        else if (rook != EMPTY && pos <= castling_to && attacked(them, pos))
                            error = true;
                        pos --;
                    }
                }
                else if (FILE(castling_from) == 4) {
                    castling_to = castling_from + 2;
                    rook = pos0 + 7;

                    if (board[castling_from + 1]
                            || board[castling_to]
                            || attacked(them, castling_from + 1)
                            || attacked(them, castling_to))
                        error = true;
                }
                else
                    error = true;

                if (!error && !attacked(them, castling_from))
                    addMove(moves, castling_from, castling_to, BITS_KSIDE_CASTLE, rook);
            }

            // queen-side castling
            if (castling[us * 2 + 1] != EMPTY) {
                auto error = false;
                int castling_to,
                    pos0 = RANK(castling_from) << 4,
                    rook = EMPTY;

                if (frc) {
                    castling_to = pos0 + 2;
                    int pos = pos0;
                    while (!error && pos != castling_from) {
                        auto square = board[pos];
                        if (square) {
                            if (rook == EMPTY) {
                                if (TYPE(square) == ROOK && COLOR(square) == us)
                                    rook = pos;
                            }
                            else
                                error = true;
                        }
                        else if (rook != EMPTY && pos >= castling_to && attacked(them, pos))
                            error = true;
                        pos ++;
                    }
                }
                else if (FILE(castling_from) == 4) {
                    castling_to = castling_from - 2;
                    rook = pos0;

                    if (board[castling_from - 1]
                            || board[castling_from - 2]
                            || board[castling_from - 3]
                            || attacked(them, castling_from - 1)
                            || attacked(them, castling_to))
                        error = true;
                }
                else
                    error = true;

                if (!error && !attacked(them, castling_from))
                    addMove(moves, castling_from, castling_to, BITS_QSIDE_CASTLE, rook);
            }
        }

        // return pseudo-legal moves
        if (!legal)
            return moves;

        // filter out illegal moves
        std::vector<Move> legal_moves;
        for (auto move : moves) {
            makeMove(move);
            if (!kingAttacked(us))
                legal_moves.push_back(move);
            undoMove();
        }
        return legal_moves;
    }

    /**
     * Check if the king is attacked
     * @param color 0, 1
     * @return true if king is attacked
     */
    bool kingAttacked(uint8_t color) {
        return attacked(color ^ 1, kings[color]);
    }

    /**
     * Load a FEN
     * @param fen valid or invalid FEN
     * @return true if the FEN was successfully loaded
     */
    bool load(std::string fen_) {
        if (fen_.empty())
            return false;

        clear();
        fen = fen_;

        int half = 0,
            move = 0,
            step = 0,
            square = 0;
        std::string castle, ep;

        for (auto value : fen) {
            if (value == ' ') {
                step ++;
                continue;
            }

            switch (step) {
            // pieces
            case 0:
                if (value == '/')
                    square += 8;
                else if (value >= '1' && value <= '9')
                    square += value - '0';
                else {
                    put(PIECES[value], square);
                    square ++;
                }
                break;
            // turn
            case 1:
                turn = (value == 'w')? 0: 1;
                break;
            // castle
            case 2:
                castle += value;
                break;
            // en passant
            case 3:
                ep += value;
                break;
            // 50 moves rule
            case 4:
                half = (half * 10) + value - '0';
                break;
            // move #
            case 5:
                move = (move * 10) + value - '0';
                break;
            }
        }

        // can detect FRC if castle is not empty
        if (castle != "-") {
            for (auto letter : castle) {
                auto lower = (letter < 'a')? letter + 'a' - 'A': letter,
                    final = (lower == 'k')? 'h': (lower == 'q')? 'a': lower,
                    color = (letter == lower)? 1: 0,
                    square = final - 'a' + ((color? 0: 7) << 4),
                    index = color * 2 + ((square < kings[color])? 1: 0);

                castling[index] = square;
                if (final == lower)
                    frc = true;
            }
        }

        ep_square = (ep == "-")? EMPTY: anToSquare(ep);
        half_moves = half;
        move_number = move;
        return true;
    }

    /**
     * Try an object move
     * @param move {from: 23, to: 7, promote: 5}
     * @param frc Fisher Random Chess
     */

    Move moveObject(Move &move, bool frc) {
        Move move_obj;
        auto moves = createMoves(frc, false, move.from);

        // find an existing match + add the SAN
        for (auto move2 : moves) {
            if (move.from == move2.from && move.to == move2.to
                    && (!move2.promote || TYPE(move.promote) == move2.promote)) {
                move2.san = moveToSan(move2, false);
                move_obj = move2;
                break;
            }
        }

        // no suitable move?
        if (move_obj.piece)
            makeMove(move_obj);
        return move_obj;
    }

    /**
     * Try a SAN move
     * @param text Nxb7, a8=Q
     * @param frc Fisher Random Chess
     * @param sloppy allow sloppy parser
     */
    Move moveSan(std::string text, bool frc, bool sloppy) {
        auto moves = createMoves(frc, false, EMPTY);
        Move move = sanToMove(text, moves, sloppy);
        if (move.piece)
            makeMove(move);
        return move;
    }

    /**
     * Convert a move to SAN
     * https://github.com/jhlywa/chess.js
     * r1bqkbnr/ppp2ppp/2n5/1B1pP3/4P3/8/PPPP2PP/RNBQK1NR b KQkq - 2 4
     * 4. ... Nge7 is overly disambiguated because the knight on c6 is pinned
     * 4. ... Ne7 is technically the valid SAN
     * @param move
     * @param sloppy allow sloppy parser
     */
    std::string moveToSan(Move &move, bool sloppy) {
        if (move.flags & BITS_KSIDE_CASTLE)
            return "O-O";
        if (move.flags & BITS_QSIDE_CASTLE)
            return "O-O-O";

        std::string disambiguator = getDisambiguator(move, sloppy),
            output;
        auto move_type = TYPE(move.piece);

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
     * @param text c2c4, a7a8a
     * @param frc Fisher Random Chess
     */
    Move moveUci(std::string text, bool frc) {
        Move move;
        move.from = anToSquare(text.substr(0, 2));
        move.promote = PIECES[text[4]];
        move.to = anToSquare(text.substr(2, 2));
        return moveObject(move, frc);
    }

    /**
     * Parse a list of SAN moves + create FEN for each move
     * @param text c2c4 a7a8a ...
     * @param frc Fisher Random Chess
     */
    std::vector<Move> multiSan(std::string multi, bool frc, bool sloppy) {
        std::vector<Move> result;
        int prev = 0,
            size = multi.size();
        for (int i = 0; i <= size; i ++) {
            if (i < size && multi[i] != ' ')
                continue;

            if (multi[prev] >= 'A') {
                auto text = multi.substr(prev, i - prev);
                auto moves = createMoves(frc, false, EMPTY);
                Move move = sanToMove(text, moves, sloppy);
                if (!move.piece)
                    break;
                makeMove(move);
                move.fen = createFen();
                result.push_back(move);
            }
            prev = i + 1;
        }
        return result;
    }

    /**
     * Parse a list of UCI moves + create SAN + FEN for each move
     * @param text c2c4 a7a8a ...
     * @param frc Fisher Random Chess
     */
    std::vector<Move> multiUci(std::string multi, bool frc) {
        std::vector<Move> result;
        int prev = 0,
            size = multi.size();
        for (int i = 0; i <= size; i ++) {
            if (i < size && multi[i] != ' ')
                continue;

            if (multi[prev] >= 'A') {
                auto text = multi.substr(prev, i - prev);
                auto move = moveUci(text, frc);
                if (move.piece) {
                    move.fen = createFen();
                    result.push_back(move);
                }
            }
            prev = i + 1;
        }
        return result;
    }

    /**
     * Print the board
     */
    std::string print() {
        std::string text;
        for (auto value : fen) {
            if (value == ' ')
                break;

            if (value == '/')
                text += '\n';
            else if (value >= '1' && value <= '9') {
                for (int i = 0; i < value - '0'; i ++)
                    text += ' ';
            }
            else
                text += value;
        }
        return text;
    }

    /**
     * Put a piece on a square
     */
    void put(uint8_t piece, int square) {
        board[square] = piece;
        if (TYPE(piece) == KING)
            kings[COLOR(piece)] = square;
    }

    /**
     * Reset the board to the default position
     */
    void reset() {
        load(DEFAULT_POSITION);
    }

    /**
     * Convert a move from Standard Algebraic Notation (SAN) to 0x88 coordinates
     * @param san Nf3, Nf3+?!
     * @param moves list of moves to match the san against
     * @param sloppy allow sloppy parser
     */
    Move sanToMove(std::string san, std::vector<Move> &moves, bool sloppy) {
        // 1) try exact matching
        auto clean = cleanSan(san);
        for (auto move : moves)
            if (clean == cleanSan(moveToSan(move, false))) {
                move.san = san;
                return move;
            }

        // 2) try sloppy matching
        Move null_move;
        if (!sloppy)
            return null_move;

        int from_file = -1,
            from_rank = -1,
            i = clean.size() - 1,
            to = EMPTY;
        uint8_t promote = 0,
            type = 0;

        if (i < 2)
            return null_move;

        // analyse backwards
        if (strchr("bnrqBNRQ", clean[i])) {
            promote = TYPE(PIECES[clean[i]]);
            i --;
        }
        // to
        if (clean[i] < '1' || clean[i] > '8')
            return null_move;
        i --;
        if (clean[i] < 'a' || clean[i] > 'j')
            return null_move;
        to = clean[i] - 'a' + (('8' - clean[i + 1]) << 4);
        i --;
        //
        if (i >= 0 && clean[i] == 'x')
            i --;
        // from
        if (i >= 0 && clean[i] >= '1' && clean[i] <= '8') {
            from_rank = '8' - clean[i];
            i --;
        }
        if (i >= 0 && clean[i] >= 'a' && clean[i] <= 'j') {
            from_file = clean[i] - 'a';
            i --;
        }
        // type
        type = TYPE(PIECES[clean[i]]);

        for (auto move : moves) {
            if (to == move.to
                    && (!type || type == TYPE(move.piece))
                    && (from_file < 0 || from_file == FILE(move.from))
                    && (from_rank < 0 || from_rank == RANK(move.from))
                    && (!promote || promote == move.promote)) {
                move.san = moveToSan(move, false);
                return move;
            }
        }
        return null_move;
    }

    /**
     * Convert a square number to an algebraic notation
     * @param square 112
     * @param check check the boundaries
     * @return a1
     */
    std::string squareToAn(int square, bool check) {
        int file = FILE(square),
            rank = RANK(square);
        if (check && (file < 0 || file > 7 || rank < 0 || rank > 7))
            return "";
        std::string text;
        text += ('a' + file);
        text += ('8' - rank);
        return text;
    }

    /**
     * Undo a move
     */
    void undoMove() {
        if (histories.empty())
            return;
        History &old = histories.back();

        Move &move = old.move;
        memcpy(castling, &old.castling, sizeof(castling));
        ep_square = old.ep_square;
        half_moves = old.half_moves;
        memcpy(&kings, &old.kings, sizeof(kings));
        move_number = old.move_number;
        turn ^= 1;

        uint8_t us = turn,
            them = turn ^ 1;

        if (move.from != move.to) {
            board[move.from] = move.piece;
            board[move.to] = 0;
        }

        if (move.flags & BITS_CAPTURE)
            board[move.to] = COLORIZE(them, move.capture);
        else if (move.flags & BITS_EP_CAPTURE) {
            auto index = (us == BLACK)? move.to - 16: move.to + 16;
            board[index] = COLORIZE(them, PAWN);
        }

        // undo castle
        if (move.flags & BITS_CASTLE) {
            auto castling_from = (move.flags & BITS_KSIDE_CASTLE)? move.to - 1: move.to + 1;
            board[move.rook] = COLORIZE(us, ROOK);
            if (castling_from != move.from && castling_from != move.rook)
                board[castling_from] = 0;
        }

        histories.pop_back();
    }

    // EMSCRIPTEN INTERFACES
    ////////////////////////

    val em_board() {
        return val(typed_memory_view(128, board));
    }

    val em_castling() {
        return val(typed_memory_view(4, castling));
    }

    bool em_checked() {
        return kingAttacked(turn);
    }

    std::string em_fen() {
        return fen;
    }

    uint8_t em_piece(std::string text) {
        if (text.size() != 1)
            return 0;
        auto it = PIECES.find(text.at(0));
        return (it != PIECES.end())? it->second: 0;
    }
};

// BINDING CODE
///////////////

EMSCRIPTEN_BINDINGS(chess) {
    value_object<Move>("Move")
        .field("capture", &Move::capture)
        .field("fen", &Move::fen)
        .field("flags", &Move::flags)
        .field("from", &Move::from)
        .field("piece", &Move::piece)
        .field("ply", &Move::ply)
        .field("promote", &Move::promote)
        .field("rook", &Move::rook)
        .field("san", &Move::san)
        .field("to", &Move::to)
        ;

    class_<Chess>("Chess")
        .constructor()
        .function("anToSquare", &Chess::anToSquare)
        .function("attacked", &Chess::attacked)
        .function("board", &Chess::em_board)
        .function("castling", &Chess::em_castling)
        .function("checked", &Chess::em_checked)
        .function("cleanSan", &Chess::cleanSan)
        .function("clear", &Chess::clear)
        .function("currentFen", &Chess::em_fen)
        .function("fen", &Chess::createFen)
        .function("load", &Chess::load)
        .function("moveObject", &Chess::moveObject)
        .function("moveSan", &Chess::moveSan)
        .function("moveToSan", &Chess::moveToSan)
        .function("moveUci", &Chess::moveUci)
        .function("moves", &Chess::createMoves)
        .function("multiSan", &Chess::multiSan)
        .function("multiUci", &Chess::multiUci)
        .function("piece", &Chess::em_piece)
        .function("print", &Chess::print)
        .function("put", &Chess::put)
        .function("reset", &Chess::reset)
        .function("sanToMove", &Chess::sanToMove)
        .function("squareToAn", &Chess::squareToAn)
        .function("undo", &Chess::undoMove)
        ;

    register_vector<int>("vector<int>");
    register_vector<Move>("vector<Move>");
}
