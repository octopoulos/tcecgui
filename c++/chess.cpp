// chess.cpp
// @author octopoulo <polluxyz@gmail.com>
// @version 2020-09-22
// - wasm implementation, 2x faster than fast chess.js
// - FRC support
// - emcc --bind -o ../js/chess-wasm.js chess.cpp -s WASM=1 -Wall -s MODULARIZE=1 -O3 --closure 1

#include <emscripten/bind.h>
#include <emscripten/val.h>
#include <algorithm>
#include <iostream>
#include <map>
#include <regex>
#include <stdio.h>

using namespace emscripten;

// specific
#define DELETE(x) {if (x) delete x; x = nullptr;}
#define DELETE_ARRAY(x) {if (x) delete [] x; x = nullptr;}
#define Max(a, b) (((a) >= (b))? (a): (b))
#define Min(a, b) (((a) <= (b))? (a): (b))

// defines
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
#define COLORIZE(color, type) (type + (color << 3))
#define DEFAULT_POSITION "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
#define EMPTY 255
#define FILE(square) (square & 15)
#define FILE_ALGEBRAIC(square) ('a' + FILE(square))
#define KING 6
#define KNIGHT 2
#define PAWN 1
#define PIECE_LOWER " pnbrqk  pnbrqk"
#define PIECE_NAMES " PNBRQK  pnbrqk"
#define PIECE_UPPER " PNBRQK  PNBRQK"
#define QUEEN 5
#define RANK(square) (square >> 4)
#define RANK_ALGEBRAIC(square) ('8' - RANK(square))
#define ROOK 4
#define SQUARE_A8 0
#define SQUARE_H1 119
#define TYPE(piece) (piece & 7)
#define WHITE 0

constexpr uint8_t relativeRank(int color, int square) {
    return color? 7 - (square >> 4): (square >> 4);
}

// tables
int MOBILITY_LIMITS[] = {
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
    },
    MOBILITY_SCORES[] = {
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
    },
    PAWN_OFFSETS[2][3] = {
        {-17, -16, -15},
        {17, 16, 15},
    },
    // attacks + defenses
    // those values could be optimized automatically
    PIECE_ATTACKS[16][16] = {
        //  .   P   N   B   R   Q   K   .   .   p   n   b   r   q   k   .
        {0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0},
        {0,  7, 15, 10,  2,  1,  0,  0,  0,  1,  1,  1,  1,  1,  5,  0},    // P
        {0,  5,  9,  9,  8,  8,  0,  0,  0,  5,  2,  9,  5,  5,  5,  0},    // N
        {0,  5,  9,  9,  8,  8,  0,  0,  0,  5,  9,  2,  5,  5,  5,  0},    // B
        {0, 10,  4,  4, 18, 14,  0,  0,  0,  5,  5,  5,  2,  5,  5,  0},    // R
        {0,  5,  5,  5, 14,  1,  0,  0,  0,  5,  5,  5,  5,  2,  5,  0},    // Q
        {0,  5,  9,  9,  9,  9,  0,  0,  0, 10,  5,  5,  5,  0,  0,  0},    // K
        {0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0},
        {0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0},
        {0,  1,  1,  1,  1,  1,  5,  0,  0,  7, 15, 10,  2,  1,  0,  0},    // p
        {0,  5,  2,  9,  5,  5,  5,  0,  0,  5,  9,  9,  8,  8,  0,  0},    // n
        {0,  5,  9,  2,  5,  5,  5,  0,  0,  5,  9,  9,  8,  8,  0,  0},    // b
        {0,  5,  5,  5,  2,  5,  5,  0,  0,  5, 10,  4, 18, 14,  0,  0},    // r
        {0,  5,  5,  5,  5,  2,  5,  0,  0,  5,  5,  5, 14,  1,  0,  0},    // q
        {0, 10,  5,  5,  5,  0,  0,  0,  0,  5,  9,  9,  9,  9,  9,  0},    // k
        {0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0},
    },
    // move ordering
    PIECE_CAPTURES[] = {
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
    },
    // for move generation
    PIECE_DIRS[7][8] = {
        {0, 0, 0, 0, 0, 0, 0, 0},
        {0, 0, 0, 0, 0, 0, 0, 0},
        {0, 0, 0, 0, 0, 0, 0, 0},
        {1, 4, 1, 4, 0, 0, 0, 0},
        {2, 8, 2, 8, 0, 0, 0, 0},
        {1, 2, 4, 8, 1, 2, 4, 8},
        {1, 2, 4, 8, 1, 2, 4, 8},
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
    // move ordering
    PIECE_ORDERS[] = {
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
    },
    // material eval
    PIECE_SCORES[] = {
        0,
        150,        // P
        780,        // N
        820,        // B
        1300,       // R
        2600,       // Q
        12800,      // K
        0,
        0,
        150,        // p
        780,        // n
        820,        // b
        1300,       // r
        2600,       // q
        12800,      // k
        0,
    },
    PROMOTE_SCORES[] = {
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
    };

// extras
std::map<std::string, int> EVAL_MODES = {
    {"att", 1 + 2 + 4},
    {"hce", 1 + 2},
    {"mat", 1},
    {"mob", 2},
    {"nn", 1 + 2 + 32},
    {"null", 0},
};
// piece names for print
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
std::map<std::string, int> SEARCH_MODES = {
    {"ab", 2},
    {"mm", 1},
    {"rnd", 0},
};

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

struct Move {
    uint8_t capture;
    uint8_t flags;
    uint8_t from;
    std::string m;          // san
    uint8_t piece;
    uint8_t promote;
    uint8_t to;
};

struct MoveText: Move {
    std::string fen;
    int     ply;
    int     score;

    MoveText(): Move() {}
    MoveText(const Move &move) {
        memcpy(this, &move, sizeof(Move));
        ply = 0;
        score = 0;
    }
};

struct State {
    uint8_t castling[4];
    uint8_t ep_square;
    uint8_t half_moves;
    Move    move;
};

Move NULL_MOVE = {0, 0, 0, "", 0, 0, 0};

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// chess class
class Chess {
private:
    // PRIVATE
    //////////

    uint8_t attacks[16];
    int     avg_depth;
    uint8_t bishops[8];
    uint8_t board[128];
    uint8_t castling[4];
    uint8_t defenses[16];
    int     ep_square;
    int     eval_mode;                      // 0:null, &1:mat, &2:hc2, &4:qui, &8:nn
    std::string fen;
    int     fen_ply;
    bool    frc;
    uint8_t half_moves;
    int     interpose[128];                 // check path, can interpose a piece there
    uint8_t kings[4];
    uint8_t knights[8];
    int     materials[2];
    int     max_depth;
    int     max_extend;
    int     max_nodes;
    int     max_quiesce;
    int     max_time;
    uint8_t mobilities[16];
    int     move_number;
    int     nodes;
    uint8_t pawns[8];
    uint8_t pins[128];
    int     ply;
    State   ply_states[128];
    uint8_t rooks[8];
    uint8_t queens[8];
    int     search_mode;                    // 1:minimax, 2:alpha-beta
    int     sel_depth;
    int     turn;

    /**
     * Add a single move
     */
    void addMove(std::vector<Move> &moves, uint8_t piece, uint8_t from, uint8_t to, uint8_t flags, uint8_t promote, uint8_t value) {
        uint8_t capture = 0;
        if (!(flags & BITS_CASTLE)) {
            if (value)
                capture = TYPE(value);
            else if (flags & BITS_EP_CAPTURE)
                capture = PAWN;
        }
        moves.push_back({
            capture,
            flags,
            from,
            "",
            piece,
            promote,
            to,
        });

        if (!promote) {
            // TODO:
            // empty => give bonus for controlling the square, especially if near the other king (or in the center)
            mobilities[piece] ++;
        }
    }

    /**
     * Add a pawn move + promote moves
     */
    void addPawnMove(std::vector<Move> &moves, uint8_t piece, uint8_t from, uint8_t to, uint8_t flags, uint8_t value) {
        auto rank = RANK(to);
        if ((rank % 7) == 0) {
            for (uint8_t promote = QUEEN; promote >= KNIGHT; promote --)
                addMove(moves, piece, from, to, flags | BITS_PROMOTION, promote, value);
            mobilities[piece] ++;
        }
        else
            addMove(moves, piece, from, to, flags, 0, value);
    }

    /**
     * Add a ply state
     */
    void addState(Move &move) {
        auto &state = ply_states[ply % 128];
        memcpy(state.castling, castling, sizeof(castling));
        state.ep_square = ep_square;
        state.half_moves = half_moves;
        memcpy(&state.move, &move, sizeof(Move));
    }

    /**
     * Alpha beta tree search
     */
    int alphaBeta(int alpha, int beta, int depth, int max_depth) {
        // extend depth if in check
        if ((max_nodes & 1) && max_depth < max_extend && kingAttacked(turn))
            max_depth ++;

        if (depth >= max_depth) {
            if (!max_quiesce) {
                nodes ++;
                return evaluate();
            }
            return quiesce(alpha, beta, max_quiesce);
        }

        // statistics
        nodes ++;
        if (ply >= avg_depth)
            avg_depth = ply + 1;

        // check all moves
        int best = -99999;
        auto moves = createMoves(false);

        // mat + stalemate
        if (!moves.size()) {
            if (kingAttacked(2))
                best = std::min(-51000 + ply * 1000, -21000);
            else
                best = 0;
        }
        else {
            for (auto &move : moves) {
                moveRaw(move);
                auto score = -alphaBeta(-beta, -alpha, depth + 1, max_depth);
                undoMove();

                if (score >= beta)
                    return beta;
                if (score > best) {
                    best = score;
                    if (score > alpha)
                        alpha = score;
                }

                // checkmate found
                if (ply > 3 && score > 20000)
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
    static bool compareMoves(const Move &a, const Move &b) {
        if (a.capture || b.capture)
            return (PIECE_CAPTURES[b.capture] - PIECE_CAPTURES[a.capture]) * 10 + PIECE_SCORES[a.piece] - PIECE_SCORES[b.piece] < 0;
        auto castle = !!(b.flags & BITS_CASTLE) - !!(a.flags & BITS_CASTLE);
        if (castle)
            return castle < 0;
        if (a.promote || b.promote)
            return b.promote < a.promote;
        auto aorder = PIECE_ORDERS[a.piece],
            border = PIECE_ORDERS[b.piece];
        if (aorder == border) {
            // more advanced pawn => higher priority
            if (aorder == 4)
                return COLOR(a.piece)? (RANK(b.to) < RANK(a.to)): (RANK(a.to) < RANK(b.to));
            return 0;
        }
        return aorder < border;
    }

    /**
     * Uniquely identify ambiguous moves
     */
    std::string disambiguate(Move &move, std::vector<Move> &moves) {
        uint8_t ambiguities = 0,
            from = move.from,
            same_file = 0,
            same_rank = 0,
            to = move.to,
            type = TYPE(move.piece);

        for (auto &move2 : moves) {
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

        auto an = squareToAn(from, false);
        if (same_rank > 0 && same_file > 0)
            return an;
        else
            return an.substr((same_file > 0)? 1: 0, 1);
    }

    /**
     * Mini max tree search
     */
    int miniMax(int depth, int max_depth) {
        if (depth >= max_depth) {
            nodes ++;
            return evaluate();
        }

        // statistics
        nodes ++;
        if (ply >= avg_depth)
            avg_depth = ply + 1;

        // check all moves
        int best = -99999;
        auto moves = createMoves(false);

        // mate + stalemate
        if (!moves.size()) {
            if (kingAttacked(2))
                best = -51000 + ply * 1000;
            else
                best = 0;
        }
        else {
            for (auto &move : moves) {
                moveRaw(move);
                auto score = -miniMax(depth + 1, max_depth);
                undoMove();

                if (score > best)
                    best = score;

                // checkmate found
                if (ply > 3 && score > 20000)
                    break;
            }
        }
        return best;
    }

    /**
     * Get the move list
     */
    std::string moveList() {
        std::string text;
        for (auto i = 0 ; i <= ply; i ++) {
            auto state = ply_states[i % 128];
            if (text.size())
                text += " ";
            text += ucify(state.move);
        }
        return text;
    }

    /**
     * Null search, used by perft
     */
    void nullSearch(int depth) {
        if (depth <= 0) {
            nodes ++;
            return;
        }

        auto moves = createMoves(false);
        // speed-up
        if (depth <= 1) {
            nodes += moves.size();
            return;
        }
        for (auto &move : moves) {
            moveRaw(move);
            nullSearch(depth - 1);
            undoMove();
        }
    }

    /**
     * Quiescence search
     * https://www.chessprogramming.org/Quiescence_Search
     */
    int quiesce(int alpha, int beta, int depth_left) {
        auto delta = PIECE_SCORES[QUEEN];
        nodes ++;
        auto score = evaluate();
        if (depth_left <= 0)
            return score;
        if (score >= beta)
            return beta;
        if (score + delta < alpha)
            return alpha;
        if (score > alpha)
            alpha = score;

        auto best = score,
            futility = best + PIECE_SCORES[PAWN];

        if (ply >= sel_depth)
            sel_depth = ply + 1;

        auto moves = createMoves(true);
        for (auto &move : moves) {
            if (futility + PIECE_SCORES[move.capture] <= alpha
                    && (TYPE(move.piece) != PAWN || relativeRank(turn, move.to) <= 5))
                continue;

            moveRaw(move);
            auto score = -quiesce(-beta, -alpha, depth_left - 1);
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

public:
    // PUBLIC
    /////////

    Chess() {
        configure(false, "", 4);
        clear();
        load(DEFAULT_POSITION);
    }
    ~Chess() {
    }

    /**
     * Convert AN to square
     * - 'a' = 97
     * - '8' = 56
     * @param an c2
     * @return 98
     */
    uint8_t anToSquare(std::string an) {
        if (an.size() < 2)
            return EMPTY;
        uint8_t file = an[0] - 'a',
            rank = '8' - an[1];
        return file + (rank << 4);
    }

    /**
     * Check if a square is attacked by a color
     * @param color attacking color
     * @param square .
     * @return true if the square is attacked
     */
    bool attacked(int color, uint8_t square) {
        // knight
        auto target = COLORIZE(color, KNIGHT);
        for (auto offset : PIECE_OFFSETS[KNIGHT]) {
            auto pos = square + offset;
            if (pos & 0x88)
                continue;
            if (board[pos] == target)
                return true;
        }

        // bishop + pawn + rook + queen
        auto offsets = PIECE_OFFSETS[QUEEN];
        for (int j = 0; j < 8; j ++) {
            auto offset = offsets[j];
            uint8_t pos = square,
                target = BISHOP + (j & 1);

            for (auto k = 0; ; k ++) {
                pos += offset;
                if (pos & 0x88)
                    break;

                auto value = board[pos];
                if (!value)
                    continue;
                if (COLOR(value) != color)
                    break;

                auto piece_type = TYPE(value);
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
        memset(attacks, 0, sizeof(attacks));
        avg_depth = 0;
        memset(bishops, EMPTY, sizeof(bishops));
        memset(board, 0, sizeof(board));
        memset(castling, EMPTY, sizeof(castling));
        memset(defenses, 0, sizeof(defenses));
        ep_square = EMPTY;
        fen = "";
        fen_ply = -1;
        half_moves = 0;
        memset(kings, EMPTY, sizeof(kings));
        memset(knights, 0, sizeof(knights));
        memset(materials, 0, sizeof(materials));
        memset(mobilities, 0, sizeof(mobilities));
        move_number = 1;
        nodes = 0;
        memset(pawns, EMPTY, sizeof(pawns));
        ply = 0;
        memset(ply_states, 0, sizeof(ply_states));
        memset(rooks, EMPTY, sizeof(rooks));
        memset(queens, EMPTY, sizeof(queens));
        sel_depth = 0;
        turn = WHITE;
    }

    /**
     * Configure parameters
     * @param frc_
     * @param options
     * @param depth this overrides max_depth if > 0
     */
    void configure(bool frc_, std::string options, int depth) {
        eval_mode = 1;
        frc = frc_;
        max_depth = 4;
        max_extend = 20;
        max_nodes = 1e9;
        max_quiesce = 0;
        max_time = 0;
        search_mode = 0;

        // parse the line
        std::regex re("\\s+");
        std::sregex_token_iterator it(options.begin(), options.end(), re, -1);
        std::sregex_token_iterator reg_end;
        for (; it != reg_end; it ++) {
            auto option = it->str();
            if (option.size() < 3 || option.at(1) != '=')
                continue;
            auto left = option.at(0);
            auto right = option.substr(2);
            auto value = std::atoi(right.c_str());
            switch (left) {
            case 'd':
                max_depth = value;
                break;
            case 'e': {
                    auto eit = EVAL_MODES.find(right);
                    if (eit != EVAL_MODES.end())
                        eval_mode = eit->second;
                }
                break;
            case 'n':
                max_nodes = value;
                break;
            case 'q':
                max_quiesce = value;
                break;
            case 's': {
                    auto sit = SEARCH_MODES.find(right);
                    if (sit != SEARCH_MODES.end())
                        search_mode = sit->second;
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
        max_extend = std::max(max_extend, max_depth);
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
                    auto file = FILE(square),
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
     * Create a Fischer Random 960 FEN
     * http://www.russellcottrell.com/Chess/Chess960.htm
     * @param index between 0 and 959
     */
    std::string createFen960(int index) {
        if (index < 0 || index >= 960)
            return "";

        int i, n1, n2, q;
        std::string line = "        ";

        line[(index & 3) * 2 + 1] = 'B';
        index /= 4;
        line[(index & 3) * 2] = 'B';
        index /= 4;
        q = index % 6;
        index /= 6;

        for (n1 = 0; n1 < 4; n1 ++) {
            n2 = index + ((3 - n1) * (4 - n1)) / 2 - 5;
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
        std::string castle, castle2;
        i = 7;
        for (auto type : "RKR")
            for (; i >= 0; i --) {
                if (line[i] == ' ') {
                    line[i] = type;
                    if (type == 'R') {
                        castle += 'A' + i;
                        castle2 += 'a' + i;
                    }
                    break;
                }
            }

        std::string result;
        for (auto letter : line)
            result += letter + 'a' - 'A';

        result = result + "/pppppppp/8/8/8/8/PPPPPPPP/" + line + " w " + castle + castle2 + " - 0 1";
        return result;
    }

    /**
     * Create the moves
     * @param only_capture
     * @return moves
     */
    std::vector<Move> createMoves(bool only_capture) {
        std::vector<Move> moves;
        auto second_rank = 6 - turn * 5,
            us = turn,
            us8 = us << 3,
            them = us ^ 1;

        for (auto i = us8; i < us8 + 8; i ++) {
            attacks[i] = 0;
            defenses[i] = 0;
            mobilities[i] = 0;
        }

        // 1) find pinned pieces + check positions/paths
        // \: 1, |:2, /:4, _:8
        memset(interpose, 0, sizeof(interpose));
        memset(pins, 0, sizeof(pins));

        auto checks = 0;
        auto dirs = PIECE_DIRS[QUEEN];
        uint8_t inter = 0,
            interpose_ep = EMPTY,
            king = kings[us];
        auto offsets = PIECE_OFFSETS[QUEEN];

        // 1.a) check knight
        auto target = COLORIZE(them, KNIGHT);
        for (auto offset : PIECE_OFFSETS[KNIGHT]) {
            auto square = king + offset;
            if (square & 0x88)
                continue;
            if (board[square] == target) {
                checks ++;
                interpose[square] = 1;
                inter = 1;
            }
        }

        // 1.b) check 8 directions => pawn/bishop/rook/queen
        for (auto j = 0; j < 8; j ++) {
            auto offset = offsets[j],
                first = king + offset,
                pin = 0,                    // no need to be EMPTY because square 0 can never be pinned
                square = first,
                target = BISHOP + (j & 1);

            // a) 1 square away
            if (square & 0x88)
                continue;

            auto value = board[square];
            if (value) {
                if (COLOR(value) == us) {
                    if (pin)
                        continue;
                    pin = square;
                }
                else {
                    auto piece_type = TYPE(value);
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
            for (auto k = 1; ; k ++) {
                square += offset;
                if (square & 0x88)
                    break;

                auto value = board[square];
                if (!value)
                    continue;

                if (COLOR(value) == us) {
                    if (pin)
                        break;
                    pin = square;
                }
                else {
                    auto piece_type = TYPE(value);
                    if (k == 1 && piece_type == KING)
                        pins[first] |= 16;
                    else if (piece_type == QUEEN || piece_type == target) {
                        if (pin)
                            pins[pin] |= dirs[j];
                        else {
                            if (!checks) {
                                for (auto i = 0, square2 = square; i <= k; i ++, square2 -= offset)
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
        if (checks)
            only_capture = false;

        // 2) collect king moves
        auto piece = board[king];
        auto piece_attacks = PIECE_ATTACKS[piece];
        for (auto offset : PIECE_OFFSETS[KING]) {
            auto square = king + offset;
            if (square & 0x88)
                continue;

            // already in check + moving towards bishop/rook/queen? (found while finding pins)
            if (pins[square] & 16)
                continue;

            auto value = board[square];
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
                if (!attacked(them, square)) {
                    addMove(moves, piece, king, square, BITS_CAPTURE, 0, value);
                    attacks[piece] += piece_attacks[value];
                }
                board[king] = piece;
            }
            else
                defenses[piece] += piece_attacks[value];
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
        // TODO: don't check all the squares here
        for (auto i = SQUARE_A8; i <= SQUARE_H1; i ++) {
            // off board
            if (i & 0x88) {
                i += 7;
                continue;
            }

            auto piece = board[i];
            if (!piece || COLOR(piece) != us)
                continue;

            auto pin = pins[i];
            if (pin & 32)
                continue;
            pin &= 15;

            auto piece_type = TYPE(piece);
            // pawn
            if (piece_type == PAWN) {
                auto offsets = PAWN_OFFSETS[us],
                    piece_attacks = PIECE_ATTACKS[piece];

                // single square, non-capturing
                if (!only_capture && !(pin & (1 + 4 + 8))) {
                    auto square = i + offsets[1];
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
                for (auto j : {0, 2}) {
                    if (pin && !(pin & (1 << j)))
                        continue;
                    auto square = i + offsets[j];
                    if (square & 0x88)
                        continue;
                    if (inter && interpose_ep != square && !interpose[square])
                        continue;
                    auto value = board[square];

                    if (value) {
                        if (COLOR(value) == them) {
                            addPawnMove(moves, piece, i, square, BITS_CAPTURE, value);
                            attacks[piece] += piece_attacks[value];
                        }
                        else
                            defenses[piece] += piece_attacks[value];
                    }
                    // en passant can be tricky:
                    // - 3k4/8/8/K1Pp3r/8/8/8/8 w - d6 0 2
                    // - b2k4/8/2P5/3p4/8/5K2/8/8 w - d6 0 2
                    else if (square == ep_square) {
                        auto square2 = square + 16 - (us << 5);
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
                auto dirs = PIECE_DIRS[piece_type],
                    offsets = PIECE_OFFSETS[piece_type],
                    piece_attacks = PIECE_ATTACKS[piece];
                for (auto j = 0; j < 8; j ++) {
                    auto offset = offsets[j],
                        square = i;
                    if (!offset)
                        break;
                    if (pin && !(pin & dirs[j]))
                        continue;

                    while (true) {
                        square += offset;
                        if (square & 0x88)
                            break;
                        auto value = board[square];

                        if (!value) {
                            if (!only_capture && (!inter || interpose[square]))
                                addMove(moves, piece, i, square, BITS_NORMAL, 0, 0);
                        }
                        else {
                            if (!inter || interpose[square]) {
                                if (COLOR(value) == us)
                                    defenses[piece] += piece_attacks[value];
                                else {
                                    addMove(moves, piece, i, square, BITS_CAPTURE, 0, value);
                                    attacks[piece] += piece_attacks[value];
                                }
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

        // 4) castling
        if (!inter && !only_capture) {
            auto pos0 = RANK(king) << 4;

            // q=0: king side, q=1: queen side
            for (auto q = 0; q < 2; q ++) {
                auto rook = castling[(us << 1) + q];
                if (rook == EMPTY)
                    continue;

                auto error = false;
                int flags = q? BITS_QSIDE_CASTLE: BITS_KSIDE_CASTLE,
                    king_to = pos0 + 6 - (q << 2),
                    rook_to = king_to - 1 + (q << 1),
                    max_king = Max(king, king_to),
                    min_king = Min(king, king_to),
                    max_path = Max(max_king, Max(rook, rook_to)),
                    min_path = Min(min_king, Min(rook, rook_to));

                // check that all squares are empty along the path
                for (auto j = min_path; j <= max_path; j ++)
                    if (j != king && j != rook && board[j]) {
                        error = true;
                        break;
                    }
                if (error)
                    continue;

                // check that the king is not attacked
                for (auto j = min_king; j <= max_king; j ++)
                    if (attacked(them, j)) {
                        error = true;
                        break;
                    }

                // add castle, always in FRC format
                if (!error)
                    addMove(moves, COLORIZE(us, KING), king, rook, flags, 0, 0);
            }
        }

        // move ordering for alpha-beta
        if (search_mode == 2)
            orderMoves(moves);
        return moves;
    }

    /**
     * Decorate the SAN with + or #
     */
    std::string decorateMove(Move &move) {
        auto text = move.m;
        char last = text[text.size() - 1];
        if (last != '+' && last != '#' && kingAttacked(turn)) {
            auto moves = createMoves(false);
            text += moves.size()? '+': '#';
            move.m = text;
        }
        return text;
    }

    /**
     * Evaluate the current position
     * - eval_mode: 0:null, 1:mat, 2:hc2, &4:qui, 8:nn
     * - 8/5q2/8/3K4/8/8/8/7k w - - 0 1 KQ vs K
     * - 8/5r2/8/3K4/8/8/8/7k w - - 0 1 KR vs K
     * - 8/5n2/8/3K4/8/8/b7/7k w - - 0 1  KNB vs K
     */
    int evaluate() {
        if (half_moves >= 100)
            return 0;
        int score = 0;

        if (eval_mode & 1)
            score += materials[WHITE] - materials[BLACK];

        // mobility
        if (eval_mode & 2) {
            if (!materials[WHITE]) {
                auto king = kings[WHITE],
                    king2 = kings[BLACK];
                score -= (abs(FILE(king) * 2 - 7) + abs(RANK(king) * 2 - 7)) * 15;
                score += (abs(FILE(king) - FILE(king2)) + abs(RANK(king) - RANK(king2))) * 10;
                score += mobilities[6] * 15;
            }
            else
                for (auto i = 1; i < 7; i ++)
                    score += Min(mobilities[i] * MOBILITY_SCORES[i], MOBILITY_LIMITS[i]);

            if (!materials[BLACK]) {
                auto king = kings[BLACK],
                    king2 = kings[WHITE];
                score -= (abs(FILE(king) * 2 - 7) + abs(RANK(king) * 2 - 7)) * 15;
                score += (abs(FILE(king) - FILE(king2)) + abs(RANK(king) - RANK(king2))) * 10;
                score += mobilities[6] * 15;
            }
            else
                for (auto i = 9; i < 15; i ++)
                    score -= Min(mobilities[i] * MOBILITY_SCORES[i], MOBILITY_LIMITS[i]);
        }

        // attacks + defenses
        if (eval_mode & 4) {
            for (auto i = 1; i < 7; i ++)
                score += attacks[i] + defenses[i];
            for (auto i = 9; i < 15; i ++)
                score -= attacks[i] + defenses[i];
        }

        return score * (1 - (turn << 1));
    }

    /**
     * Check if the king is attacked
     * @param color 0, 1 + special cases: 2, 3
     * @return true if king is attacked
     */
    bool kingAttacked(int color) {
        if (color > 1)
            color = (color == 2)? turn: turn ^ 1;
        return attacked(color ^ 1, kings[color]);
    }

    /**
     * Load a FEN
     * @param fen valid or invalid FEN
     * @return empty on error, and the FEN may be corrected
     */
    std::string load(std::string fen_) {
        if (fen_.empty())
            return "";

        clear();
        fen = fen_;

        int half = 0,
            move = 0,
            step = 0,
            step2 = 0,
            step3 = 0,
            square = 0;
        std::string castle, ep;

        for (auto i = 0; i < fen.size(); i ++) {
            auto value = fen[i];
            if (value == ' ') {
                step ++;
                if (step == 2)
                    step2 = i;
                else if (step == 3)
                    step3 = i;
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

        ep_square = (ep == "-")? EMPTY: anToSquare(ep);
        half_moves = half;
        move_number = Max(move, 1);
        fen_ply = (move_number << 1) - 3 + turn;
        ply = 0;

        auto start = (!turn && move_number == 1);
        if (start)
            frc = false;

        // can detect FRC if castle is not empty
        if (castle != "-") {
            auto error = false;
            for (auto letter : castle) {
                auto lower = (letter < 'a')? letter + 'a' - 'A': letter,
                    final = (lower == 'k')? 'h': (lower == 'q')? 'a': lower,
                    color = (letter == lower)? 1: 0,
                    square = final - 'a' + ((color? 0: 7) << 4),
                    index = color * 2 + ((square < kings[color])? 1: 0);

                castling[index] = square;
                if (start && TYPE(board[square]) != ROOK)
                    error = true;
                if (final == lower)
                    frc = true;
            }

            // fix corrupted FEN (only for the initial board)
            if (error) {
                castle = "";
                for (auto color = 0; color < 2; color ++) {
                    char file_letter = color? 'a': 'A';
                    auto king = kings[color];

                    for (int i = king + 1; FILE(i) <= 7; i ++)
                        if (TYPE(board[i]) == ROOK) {
                            castling[color * 2] = i;
                            castle += file_letter + FILE(i);
                            break;
                        }

                    for (int i = king - 1; FILE(i) >= 0; i --)
                        if (TYPE(board[i]) == ROOK) {
                            castling[color * 2 + 1] = i;
                            castle += file_letter + FILE(i);
                            break;
                        }
                }
                fen = fen.substr(0, step2) + " " + castle + fen.substr(step3);
                frc = true;
            }
        }
        return fen;
    }

    /**
     * Try an object move
     * @param move {from: 23, to: 7, promote: 5}
     * @param decorate add + # decorators
     */
    Move moveObject(Move &move, bool decorate) {
        uint8_t flags = 0;
        Move move_obj;
        auto moves = createMoves(false);

        // castle
        if (move.from == kings[turn]) {
            auto piece = board[move.to];

            // regular notation => change .to to rook position
            if (!piece) {
                if (std::abs(FILE(move.from) - FILE(move.to)) == 2) {
                    if (move.to > move.from)
                        move.to ++;
                    else
                        move.to -= 2;
                }
            }
            // frc notation
            else if (piece == COLORIZE(turn, ROOK)) {
                if (FILE(move.to) > FILE(move.from))
                    flags = BITS_KSIDE_CASTLE;
                else
                    flags = BITS_QSIDE_CASTLE;
            }
        }

        // find an existing match + add the SAN
        if (flags) {
            for (auto &move2 : moves)
                if (move2.flags & flags) {
                    move2.m = moveToSan(move2, moves);
                    move_obj = move2;
                    break;
                }
        }
        else
            for (auto &move2 : moves) {
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
     */
    void moveRaw(Move &move) {
        auto us = turn,
            them = us ^ 1;

        // not smart to do it for every move
        addState(move);

        uint8_t capture = move.capture,
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
                uint8_t q = (flags & BITS_QSIDE_CASTLE)? 1: 0,
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
     * Try a SAN move
     * @param text Nxb7, a8=Q
     * @param decorate add + # decorators
     * @param sloppy allow sloppy parser
     */
    Move moveSan(std::string text, bool decorate, bool sloppy) {
        auto moves = createMoves(false);
        Move move = sanToMove(text, moves, sloppy);
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
     * @param move
     * @param moves
     */
    std::string moveToSan(Move &move, std::vector<Move> &moves) {
        if (move.flags & BITS_KSIDE_CASTLE)
            return "O-O";
        if (move.flags & BITS_QSIDE_CASTLE)
            return "O-O-O";

        std::string disambiguator = disambiguate(move, moves);
        auto move_type = TYPE(move.piece);
        std::string output;

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
     * @param decorate add + # decorators
     */
    Move moveUci(std::string text, bool decorate) {
        Move move = {
            0,
            0,
            anToSquare(text.substr(0, 2)),
            "",
            0,
            PIECES[text[4]],
            anToSquare(text.substr(2, 2)),
        };
        return moveObject(move, decorate);
    }

    /**
     * Parse a list of SAN moves + create FEN for each move
     * @param text c2c4 a7a8a ...
     * @param sloppy allow sloppy parser
     */
    std::vector<MoveText> multiSan(std::string multi, bool sloppy) {
        std::vector<MoveText> result;
        int prev = 0,
            size = multi.size();
        for (int i = 0; i <= size; i ++) {
            if (i < size && multi[i] != ' ')
                continue;

            if (multi[prev] >= 'A') {
                auto text = multi.substr(prev, i - prev);
                auto moves = createMoves(false);
                Move move = sanToMove(text, moves, sloppy);
                if (!move.piece)
                    break;
                moveRaw(move);
                MoveText move_obj = move;
                move_obj.fen = createFen();
                move_obj.ply = fen_ply + ply;
                move_obj.score = 0;
                result.emplace_back(move_obj);
            }
            prev = i + 1;
        }
        return result;
    }

    /**
     * Parse a list of UCI moves + create SAN + FEN for each move
     * @param text c2c4 a7a8a ...
     */
    std::vector<MoveText> multiUci(std::string multi) {
        std::vector<MoveText> result;
        int prev = 0,
            size = multi.size();
        for (int i = 0; i <= size; i ++) {
            if (i < size && multi[i] != ' ')
                continue;

            if (multi[prev] >= 'A') {
                auto text = multi.substr(prev, i - prev);
                auto move = moveUci(text, true);
                if (move.piece) {
                    MoveText move_obj = move;
                    move_obj.fen = createFen();
                    move_obj.ply = fen_ply + ply;
                    move_obj.score = 0;
                    result.emplace_back(move_obj);
                }
            }
            prev = i + 1;
        }
        return result;
    }

    /**
     * Move ordering for alpha-beta
     * - captures
     * - castle
     * - nb/r/q/r/p
     */
    void orderMoves(std::vector<Move> &moves) {
        std::stable_sort(moves.begin(), moves.end(), compareMoves);
    }

    /**
     * Get params
     */
    std::vector<int> params() {
        std::vector<int> result = {
            max_depth,          // 0
            eval_mode,          // 1
            max_nodes,          // 2
            search_mode,        // 3
            max_time,           // 4
            max_quiesce,        // 5
        };
        return result;
    }

    /**
     * Perform perft and divide
     * @param {string} fen
     * @param {number} depth
     * @returns {string}
     */
    std::string perft(std::string fen, int depth) {
        if (fen.size())
            load(fen);
        auto moves = createMoves(false);
        std::vector<std::string> lines;
        lines.push_back(std::to_string(1) + "=" +std::to_string(moves.size()));

        for (auto &move : moves) {
            moveRaw(move);
            auto prev = nodes;
            nullSearch(depth - 1);
            auto delta = nodes - prev;
            lines.push_back(ucify(move) + ":" + std::to_string(delta));
            prev = nodes;
            undoMove();
        }

        if (depth > 1)
            lines.push_back(std::to_string(depth) + "=" + std::to_string(nodes));
        std::sort(lines.begin(), lines.end());

        std::string result;
        for (auto &line : lines) {
            if (result.size())
                result += " ";
            result += line;
        }
        return result;
    }

    /**
     * Print the board
     */
    std::string print(bool console) {
        std::string text;
        for (auto i = SQUARE_A8; i <= SQUARE_H1; i ++) {
            // off board
            if (i & 0x88) {
                i += 7;
                text += '\n';
                continue;
            }
            text += PIECE_NAMES[board[i]];
        }
        if (console)
            std::cout << text;
        return text;
    }

    /**
     * Put a piece on a square
     */
    void put(uint8_t piece, int square) {
        board[square] = piece;
        if (TYPE(piece) == KING)
            kings[COLOR(piece)] = square;
        else
            materials[COLOR(piece)] += PIECE_SCORES[piece];
    }

    /**
     * Reset the board to the default position
     */
    void reset() {
        frc = false;
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
        for (auto &move : moves)
            if (clean == cleanSan(moveToSan(move, moves))) {
                move.m = san;
                return move;
            }

        // 2) try sloppy matching
        if (!sloppy)
            return NULL_MOVE;

        uint8_t from_file = EMPTY,
            from_rank = EMPTY,
            promote = 0,
            to = EMPTY,
            type = 0;

        auto i = clean.size() - 1;
        if (i < 2)
            return NULL_MOVE;

        // analyse backwards
        if (strchr("bnrqBNRQ", clean[i])) {
            promote = TYPE(PIECES[clean[i]]);
            i --;
        }
        // to
        if (clean[i] < '1' || clean[i] > '8')
            return NULL_MOVE;
        i --;
        if (clean[i] < 'a' || clean[i] > 'j')
            return NULL_MOVE;
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

        for (auto &move : moves) {
            if (to == move.to
                    && (!type || type == TYPE(move.piece))
                    && (from_file == EMPTY || from_file == FILE(move.from))
                    && (from_rank == EMPTY || from_rank == RANK(move.from))
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
     * @param moves
     * @param mask moves to search, ex: 'b8c6 b8a6 g8h6'
     * @return updated moves
     */
    std::vector<MoveText> search(std::vector<Move> &moves, std::string mask) {
        nodes = 0;
        sel_depth = 0;

        auto average = 0,
            count = 0;
        auto empty = !mask.size();
        std::vector<MoveText> masked;

        for (auto &move : moves) {
            auto uci = ucify(move);
            if (!empty && mask.find(uci) == std::string::npos)
                continue;

            int score = 0;
            avg_depth = 1;

            if (max_depth > 0) {
                moveRaw(move);
                if (search_mode == 1)
                    score = -miniMax(1, max_depth);
                else
                    score = -alphaBeta(-99999, 99999, 1, max_depth);
                undoMove();
            }

            MoveText move_obj = move;
            move_obj.score = score;
            masked.emplace_back(move_obj);

            average += avg_depth;
            count ++;
        }

        avg_depth = count? average / count: 0;
        return masked;
    }

    /**
     * Convert a square number to an algebraic notation
     * - 'a' = 97
     * - '8' = 56
     * @param square 112
     * @param check check the boundaries
     * @return a1
     */
    std::string squareToAn(int square, bool check) {
        auto file = FILE(square),
            rank = RANK(square);
        if (check && (file < 0 || file > 7 || rank < 0 || rank > 7))
            return "";
        std::string text;
        text += ('a' + file);
        text += ('8' - rank);
        return text;
    }

    /**
     * Add UCI to a move
     * @param {Move} move
     * @returns {string}
     */
    std::string ucify(Move &move) {
        move.m = squareToAn(move.from, false) + squareToAn(move.to, false);
        if (move.promote)
            move.m += PIECE_LOWER[move.promote];
        return move.m;
    }

    /**
     * Undo a move
     */
    void undoMove() {
        if (ply <= 0)
            return;
        ply --;

        auto &state = ply_states[ply % 128];
        memcpy(castling, state.castling, sizeof(castling));
        ep_square = state.ep_square;
        half_moves = state.half_moves;
        Move &move = state.move;

        turn ^= 1;
        if (turn == BLACK)
            move_number --;

        auto us = turn,
            them = turn ^ 1;
        std::cout << us;

        // undo castle
        if (move.flags & BITS_CASTLE) {
            uint8_t q = (move.flags & BITS_QSIDE_CASTLE)? 1: 0,
                king = move.from,
                king_to = (RANK(king) << 4) + 6 - (q << 2);

            board[king_to] = 0;
            board[king_to - 1 + (q << 1)] = 0;
            board[king] = COLORIZE(us, KING);
            board[move.to] = COLORIZE(us, ROOK);
            kings[us] = king;
        }
        else {
            if (move.from != move.to) {
                board[move.from] = move.piece;
                board[move.to] = 0;
                if (TYPE(move.piece) == KING)
                    kings[us] = move.from;
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

    // EMSCRIPTEN INTERFACES
    ////////////////////////

    val em_attacks() {
        return val(typed_memory_view(16, attacks));
    }

    int em_avgDepth() {
        return avg_depth;
    }

    val em_board() {
        return val(typed_memory_view(128, board));
    }

    val em_castling() {
        return val(typed_memory_view(4, castling));
    }

    bool em_checked(int color) {
        return kingAttacked(color);
    }

    val em_defenses() {
        return val(typed_memory_view(16, defenses));
    }

    std::string em_fen() {
        return fen;
    }

    bool em_frc() {
        return frc;
    }

    int em_material(int color) {
        return materials[color];
    }

    val em_mobilities() {
        return val(typed_memory_view(16, mobilities));
    }

    int em_nodes() {
        return nodes;
    }

    uint8_t em_piece(std::string text) {
        if (text.size() != 1)
            return 0;
        auto it = PIECES.find(text.at(0));
        return (it != PIECES.end())? it->second: 0;
    }

    int em_selDepth() {
        return std::max(avg_depth, sel_depth);
    }

    int em_turn() {
        return turn;
    }

    std::string em_version() {
        return "20200918";
    }
};

// BINDING CODE
///////////////

EMSCRIPTEN_BINDINGS(chess) {
    // MOVE BINDINGS
    value_object<Move>("Move")
        .field("capture", &Move::capture)
        .field("flags", &Move::flags)
        .field("from", &Move::from)
        .field("m", &MoveText::m)
        .field("piece", &Move::piece)
        .field("promote", &Move::promote)
        .field("to", &Move::to)
        ;

    value_object<MoveText>("MoveText")
        .field("capture", &MoveText::capture)
        .field("flags", &MoveText::flags)
        .field("from", &MoveText::from)
        .field("m", &MoveText::m)
        .field("piece", &MoveText::piece)
        .field("promote", &MoveText::promote)
        .field("to", &MoveText::to)
        //
        .field("fen", &MoveText::fen)
        .field("ply", &MoveText::ply)
        .field("score", &MoveText::score)
        ;

    // CHESS BINDINGS
    class_<Chess>("Chess")
        .constructor()
        //
        .function("anToSquare", &Chess::anToSquare)
        .function("attacked", &Chess::attacked)
        .function("attacks", &Chess::em_attacks)
        .function("avgDepth", &Chess::em_avgDepth)
        .function("board", &Chess::em_board)
        .function("castling", &Chess::em_castling)
        .function("checked", &Chess::em_checked)
        .function("cleanSan", &Chess::cleanSan)
        .function("clear", &Chess::clear)
        .function("configure", &Chess::configure)
        .function("currentFen", &Chess::em_fen)
        .function("decorate", &Chess::decorateMove)
        .function("defenses", &Chess::em_defenses)
        .function("evaluate", &Chess::evaluate)
        .function("fen", &Chess::createFen)
        .function("fen960", &Chess::createFen960)
        .function("frc", &Chess::em_frc)
        .function("load", &Chess::load)
        .function("material", &Chess::em_material)
        .function("mobilities", &Chess::em_mobilities)
        .function("moveObject", &Chess::moveObject)
        .function("moveRaw", &Chess::moveRaw)
        .function("moves", &Chess::createMoves)
        .function("moveSan", &Chess::moveSan)
        .function("moveToSan", &Chess::moveToSan)
        .function("moveUci", &Chess::moveUci)
        .function("multiSan", &Chess::multiSan)
        .function("multiUci", &Chess::multiUci)
        .function("nodes", &Chess::em_nodes)
        .function("order", &Chess::orderMoves)
        .function("params", &Chess::params)
        .function("perft", &Chess::perft)
        .function("piece", &Chess::em_piece)
        .function("print", &Chess::print)
        .function("put", &Chess::put)
        .function("reset", &Chess::reset)
        .function("sanToMove", &Chess::sanToMove)
        .function("search", &Chess::search)
        .function("selDepth", &Chess::em_selDepth)
        .function("squareToAn", &Chess::squareToAn)
        .function("turn", &Chess::em_turn)
        .function("ucify", &Chess::ucify)
        .function("undo", &Chess::undoMove)
        .function("version", &Chess::em_version)
        ;

    register_vector<int>("vector<int>");
    register_vector<Move>("vector<Move>");
    register_vector<MoveText>("vector<MoveText>");
}
