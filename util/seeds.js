// seeds.js
// @author octopoulo <polluxyz@gmail.com>
// @version 2021-05-24
/*
globals
require
*/
'use strict';

let {LS} = require('../js/common.js'),
    {calculate_seeds} = require('../js/game.js');

let engines_full = [
    'Stockfish',
    'LCZero',
    'KomodoDragon',
    'AllieStein',
    'Stoofvlees',
    'ScorpioNN',
    'Ethereal',
    'Rofchade',
    'Igel',
    'Slowchess',
    'RubiChess',
    'Xiphos',
    'Nemorino',
    'Defenchess',
    'Vajolet2',
    'Pedone',
    'Winter',
    'Fritz',
    'Arasan',
    'Seer',
    'Minic',
    'Wasp',
    'Tucano',
    'Combusken',
    'Weiss',
    'Topple',
    'Pirarucu',
    'Marvin',
    'Booot',
    'Halogen',
    'ClassicalAra',
    'Koivisto',
    'Monolith',
    'ChessFighter',
    'Mr_Bob',
    'Cheng',
    'Stash',
    'Nirvana',
    'Amoeba',
    'Drofa',
    'Bagatur',
    'Cheese',
    'Berserk',
    'tomitankChess',
    'Invictus',
    'Francesca',
];
// engines_full = Array(46).fill(0).map((key, id) => `${id + 1}`);

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
