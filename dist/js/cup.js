'use strict';

var roundDate = [];
/* All times in GST, maintain proper formatting, if date is not decide just put 0 */
var roundDateMan = [
0, /* 1 */
0, /* 2 */
0, /* 3 */
0, /* 4 */
0, /* 5 */
0, /* 6 */
0, /* 7 */
0, /* 8 */
0, /* 9 */
0, /* 10 */
0, /* 11 */
0, /* 12 */
0, /* 13 */
0, /* 14 */
0, /* 15 */
0, /* 16 */
0, /* 17 */
0, /* 18 */
0, /* 19 */
0, /* 20 */
0, /* 15 */
0, /* 16 */
0, /* 17 */
0, /* 18 */
0, /* 19 */
0, /* 19 */
0, /* 27 */
0, /* 28 */
0, /* 29 */
0, /* 30 */
0, /* 30 */
0, /* 32 */
0, /* 30 */
0, /* 34 */
];

var startDateR1 = '17:00:00 on 2019.01.21';
var startDateR2 = 0;
var roundNo = 4;

var teamsx =
[
  [["Stockfish ", 1], ["Winter ", 16]],
  [["rofChade ", 8], ["Xiphos ", 9]],
  [["Komodo ", 4], ["Vajolet2 ", 13]],
  [["Stoofvlees ", 5], ["Arasan ", 12]],
  [["LCZero ", 2], ["Nemorino ", 15]],
  [["ScorpioNN ", 7], ["Defenchess ", 10]],
  [["AllieStein ", 3], ["Pedone ", 14]],
  [["Ethereal ", 6], ["RubiChess ", 11]],
];

var bigData = {
 teams : [
 ],
 results : [[ /* WINNER BRACKET */
 [[0,0], [0,0], [0,0], [0,0], [0,0], [0,0], [0,0], [0,0]],
 [[0,0], [0,0], [0,0], [0,0]],
 [[0,0], [0,0]],
 [[0,0],
  [0,0]]
 ]
 ]
};

var roundResults = [];

var dummyCross =
{
	"Event" : "",
	"Order" : [
		"Engine1",
		"Engine2"
	],
	"Table" : {
		"Engine1" : {
			"Abbreviation" : "E1",
			"Elo" : 0,
			"Games" : 0,
			"GamesAsBlack" : 0,
			"GamesAsWhite" : 0,
			"Neustadtl" : 0,
			"Performance" : 0,
			"Rank" : 1,
			"Rating" : 0,
			"Results" : {
				"Engine2" : {
					"Scores" : [],
					"Text" : ""
				}
			},
			"Score" : 0,
			"Strikes" : 0,
			"WinsAsBlack" : 0,
			"WinsAsWhite" : 0
		},
		"Engine2" : {
			"Abbreviation" : "E2",
			"Elo" : 0,
			"Games" : 0,
			"GamesAsBlack" : 0,
			"GamesAsWhite" : 0,
			"Neustadtl" : 0,
			"Performance" : 0,
			"Rank" : 2,
			"Rating" : 0,
			"Results" : {
				"Engine1" : {
					"Scores" : [],
					"Text" : ""
				}
			},
			"Score" : 0,
			"Strikes" : 0,
			"WinsAsBlack" : 0,
			"WinsAsWhite" : 0
		}
	}
};

var gamesEachMatch = [];
var columnsEvent = [
     {
       field: 'match',
       title: 'Round',
       width: '4%',
       sortable: true,
     },
     {
       field: 'Winner',
       title: 'Winner'
     },
     {
       field: 'Points',
       title: 'Points'
     },
     {
       field: 'Runner',
       title: 'Runnerup'
     },
     {
       field: 'Games',
       title: '# Games'
     },
     {
       field: 'Score',
       title: 'Score',
       formatter: 'formatterEvent',
       cellStyle: 'cellformatterEvent',
     }
   ];

