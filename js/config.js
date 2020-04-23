// game.js
// @author octopoulo <polluxyz@gmail.com>
// @version 2020-04-23
//
// included after: common, engine, global, 3d, xboard, game, network
/*
globals
Assign, ENGINE_FEATURES, LIVE_ENGINES:true, TWITCH_CHANNEL:true, TWITCH_CHAT:true
*/
'use strict';

/**
 * Override settings here
 * - features on top are the ones that are changed the most frequently
 */
function startup_config() {
    LIVE_ENGINES = ['4x V100 6Men TB', '16TH 7Men TB'];

    // add new NN engines here, by default: AllieStein & LCZero
    // - & 1 => NN engine
    // - & 2 => Leela variations
    Assign(ENGINE_FEATURES, {
        LCZeroCPU: 3,
    });

    TWITCH_CHANNEL = 'https://player.twitch.tv/?channel=TCEC_Chess_TV';
    TWITCH_CHAT = 'https://www.twitch.tv/embed/TCEC_Chess_TV/chat';
}
