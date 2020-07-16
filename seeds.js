/*
globals
require
*/
'use strict';

let {LS} = require('./js/common'),
    {calculate_seeds} = require('./js/game');

let engines_full = [
    "Stockfish",
    "LCZero",
    "AllieStein",
    "Stoofvlees",
    "Komodo",
    "Ethereal",
    "rofChade",
    "Fire",
    "Booot",
    "Defenchess",
    "Fritz",
    "Xiphos",
    "ScorpioNN",
    "Arasan",
    "RubiChess",
    "Pedone",
    "Winter",
    "Vajolet2",
    "Chiron",
    "Wasp",
    "ChessBrainVB",
    "Nemorino",
    "Demolito",
    "Gogobello",
    "Igel",
    "Minic",
    "iCE",
    "Marvin",
    "Topple",
    "Pirarucu",
    "Counter",
    "Asymptote",
];

let length = engines_full.length,
    seeds = calculate_seeds(length, 1),
    teams = seeds.map(seed => [seed, engines_full[seed - 1]]),
    pairs = new Array(length / 2).fill(0).map((_, id) => [teams[id * 2], teams[id * 2 + 1]]),
    patch = pairs.map(pair => [{name: pair[0][1], seed: pair[0][0]}, {name: pair[1][1], seed: pair[1][0]}]);

LS(seeds);
LS(teams);
LS(pairs);
LS(patch);

// if need to save the JSON:
if (0) {
    let json = JSON.stringify(patch, null, 4);
    LS(json);
}
