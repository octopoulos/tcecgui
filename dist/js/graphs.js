/*
globals
_, $, Chart, Clamp, console, DEV, document, formatUnit, liveEngineEval1, liveEngineEval2, LS, Max, Min, plog,
prevPgnData, Round, showLivEng1, showLivEng2
*/
'use strict';

// you can modify these
let engine_colors = ['#efefef', '#000000', '#007bff', 'darkred', 'green', 'yellow', 'purple', 'orange'],
    engine_names = ['White', 'Black', 'Blueleela', '7Fish'];

let all_evals = [],
    // charts = {},
    // chart_data = {},
    evalChartData = {};

var evalChart;
var whiteEvalL = 0;
var blackEvalL = 0;
var timeChart;
var speedChart;
var nodesChart = null;
var depthChart;
var tbHitsChart;
var evalconstant = 10.0;

var evalLabels = [];
var labels = [];
var whiteEval = [];
var blackEval = [];
var liveEval1 = [];
var liveEval2 = [];
var whiteTime = [];
var blackTime = [];
var whiteSpeed = [];
var blackSpeed = [];
var whiteNodes = [];
var blackNodes = [];
var whiteDepth = [];
var blackDepth = [];
var whiteSelDepth = [];
var blackSelDepth = [];
var whiteTBHits = [];
var blackTBHits = [];
var blackPop = 1;
var whitePop = 1;

var blackStarted = 0;
var firstPly = 0;

/**
 * Create eval chart data, supports any number of engines
 */
function setEvalChartData()
{
    evalChartData = {
        labels: [],
        datasets: engine_names.map((name, id) => ({
            backgroundColor: engine_colors[id],
            borderColor: engine_colors[id],
            data: [],
            fill: false,
            label: name,
            lineTension: 0,
            spanGaps: true,
        })),
    };
}

var timeChartData = {
   labels: [],
   datasets: [{
      label: 'White Time',
      lineTension: 0,
      borderColor: '#EFEFEF',
      backgroundColor: '#EFEFEF',
      fill: false,
      data: []
   }, {
      label: 'Black Time',
      lineTension: 0,
      borderColor: '#000000',
      backgroundColor: '#000000',
      fill: false,
      data: []
   }]
};

var speedChartData = {
   labels: [],
   datasets: [{
      label: 'White Speeds',
      lineTension: 0,
      borderColor: '#EFEFEF',
      backgroundColor: '#EFEFEF',
      fill: false,
      data: [],
      yAxisID: 'y-axis-1',
   }, {
      label: 'Black Speed',
      lineTension: 0,
      borderColor: '#000000',
      backgroundColor: '#000000',
      fill: false,
      data: [],
      yAxisID: 'y-axis-2'
   }]
};

var depthChartData = {
   labels: [],
   datasets: [{
      label: 'White Depth',
      lineTension: 0,
      borderColor: '#EFEFEF',
      backgroundColor: '#EFEFEF',
      fill: false,
      data: []
   }, {
      label: 'Black Depth',
      lineTension: 0,
      borderColor: '#1a1a1a',
      backgroundColor: '#1a1a1a',
      borderDash: [10,5],
      fill: false,
      data: []
   }, {
      label: 'W. Sel Depth',
      lineTension: 0,
      borderColor: '#b1b1b1',
      backgroundColor: '#b1b1b1',
      fill: false,
      data: []
   }, {
      label: 'B. Sel Depth',
      lineTension: 0,
      borderColor: '#7e7e7e',
      backgroundColor: '#7e7e7e',
      borderDash: [10,5],
      fill: false,
      data: []
   }]
};

var tbHitsChartData = {
   labels: [],
   datasets: [{
      label: 'White TB Hits',
      lineTension: 0,
      borderColor: '#EFEFEF',
      backgroundColor: '#EFEFEF',
      fill: false,
      yAxisID: 'tb-y-axis-1',
      data: []
   }, {
      label: 'Black TB Hits',
      lineTension: 0,
      borderColor: '#000000',
      backgroundColor: '#000000',
      fill: false,
      yAxisID: 'tb-y-axis-2',
      data: []
   }]
};

var nodesChartData = {
   labels: [],
   datasets: [{
      label: 'White Speeds',
      lineTension: 0,
      borderColor: '#EFEFEF',
      backgroundColor: '#EFEFEF',
      fill: false,
      data: [],
      yAxisID: 'y-axis-1',
   }, {
      label: 'Black Speed',
      lineTension: 0,
      borderColor: '#000000',
      backgroundColor: '#000000',
      fill: false,
      data: [],
      yAxisID: 'y-axis-2'
   }]
};

function drawEval()
{
   setEvalChartData();
   evalChart = Chart.Line($('#eval-graph'), {
      data: evalChartData,
      options: {
         responsive: true,
         bezierCurve: false,
         hoverMode: 'index',
         spanGaps: true,
         stacked: false,
         legend: {
            display: true,
            position: 'bottom',
            fontSize: 5,
            labels: {
               boxWidth: 1
            },
         },
         title: {
            display: false
         },
         tooltips: {
            callbacks: {
               label: (tooltipItem, data) => {
                    let index = tooltipItem.index;
                    return data.datasets
                        .filter(dataset => dataset.data[index])
                        .map((dataset, id) => [`${engine_names[id]} Eval: ${dataset.data[index].eval}`]);
               }
            }
         },
         scales: {
            yAxes: [{
               type: 'linear', // only linear but allow scale type registration. This allows extensions to exist solely for log scale for instance
               display: true,
               position: 'left',
               id: 'e-y-axis-1',
            }],
            xAxes: [{
               ticks: {
                  autoSkip: true,
                  maxTicksLimit: 25
               }
            }]
         }
      }
   });
}

// format axes scale
function formatScale(value) {
    if (value >= 1000000)
        value = `${Round(value / 100000) / 10}M`;
    else
        value = `${Round(value / 100) / 10}k`;
    return value;
}

function initializeCharts()
{
    timeChart = Chart.Line($('#time-graph'), {
      data: timeChartData,
      options: {
         backgroundColor:'rgb(10,10,10)',
         responsive: true,
         hoverMode: 'index',
         stacked: false,
         legend: {
            display: false
         },
         title: {
            display: false
         },
         scales: {
            yAxes: [{
               type: 'linear', // only linear but allow scale type registration. This allows extensions to exist solely for log scale for instance
               display: true,
               position: 'left',
               id: 't-y-axis-1',
            }],
            xAxes: [{
               ticks: {
                  autoSkip: true,
                  maxTicksLimit: 25
               }
            }]
         }
      }
   });

   var nodesChartIs = _("#nodes-graph");
   if (nodesChartIs)
   {
      nodesChart = Chart.Line($('#nodes-graph'), {
         data: nodesChartData,
         options: {
            responsive: true,
            hoverMode: 'index',
            stacked: false,
            legend: {
               display: false
            },
            title: {
               display: false
            },
            tooltips: {
                callbacks: {
                    label: function(tooltipItem, data) {
                        let nodes = formatUnit(data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index].nodes);
                        return ` (${nodes} nodes)`;
                    }
                }
            },
            scales: {
               yAxes: [{
                  type: 'linear', // only linear but allow scale type registration. This allows extensions to exist solely for log scale for instance
                  display: true,
                  position: 'left',
                  id: 'y-axis-1',
                  ticks: {
                     callback: formatUnit
                  }
               }, {
                  type: 'linear', // only linear but allow scale type registration. This allows extensions to exist solely for log scale for instance
                  display: true,
                  position: 'right',
                  id: 'y-axis-2',

                  // grid line settings
                  gridLines: {
                     drawOnChartArea: false, // only want the grid lines for one axis to show up
                  },
                  ticks: {
                     callback: formatUnit
                  }
               }],
               xAxes: [{
                  ticks: {
                     autoSkip: true,
                     maxTicksLimit: 25
                  }
               }]
            }
         }
      });
   }

   speedChart = Chart.Line($('#speed-graph'), {
      data: speedChartData,
      options: {
         responsive: true,
         hoverMode: 'index',
         stacked: false,
         legend: {
            display: false
         },
         title: {
            display: false
         },
         tooltips: {
            callbacks: {
               label: function(tooltipItem, data) {
                    let nodes = formatUnit(data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index].nodes),
                        speed = formatUnit(data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index].y);
                    return `${speed}nps (${nodes} nodes)`;
               }
            }
         },
         scales: {
            yAxes: [{
               type: 'linear', // only linear but allow scale type registration. This allows extensions to exist solely for log scale for instance
               display: true,
               position: 'left',
               id: 'y-axis-1',
                ticks: {
                    callback: formatScale,
                }
            }, {
               type: 'linear', // only linear but allow scale type registration. This allows extensions to exist solely for log scale for instance
               display: true,
               position: 'right',
               id: 'y-axis-2',

               // grid line settings
               gridLines: {
                  drawOnChartArea: false, // only want the grid lines for one axis to show up
               },
               ticks: {
                callback: formatScale,
            }
            }],
            xAxes: [{
               ticks: {
                  autoSkip: true,
                  maxTicksLimit: 25
               }
            }]
         }
      }
   });

   depthChart = Chart.Line($('#depth-graph'), {
      data: depthChartData,
      options: {
         responsive: true,
         hoverMode: 'index',
         stacked: false,
         legend: {
            display: true,
            position: 'bottom',
            fontSize: 5,
            labels: {
               boxWidth: 1
            },
         },
         title: {
            display: false
         },
         scales: {
            yAxes: [{
               type: 'linear', // only linear but allow scale type registration. This allows extensions to exist solely for log scale for instance
               display: true,
               position: 'left',
               id: 'd-y-axis-1',
            }],
            xAxes: [{
               ticks: {
                  autoSkip: true,
                  maxTicksLimit: 25
               }
            }]
         }
      }
   });

   tbHitsChart = Chart.Line($('#tbhits-graph'), {
      data: tbHitsChartData,
      options: {
         responsive: true,
         hoverMode: 'index',
         stacked: false,
         legend: {
            display: false
         },
         title: {
            display: false
         },
         scales: {
            yAxes: [{
               type: 'linear', // only linear but allow scale type registration. This allows extensions to exist solely for log scale for instance
               display: true,
               position: 'left',
               id: 'tb-y-axis-1',
               ticks: {
                  callback: formatScale,
               }
            }, {
               type: 'linear', // only linear but allow scale type registration. This allows extensions to exist solely for log scale for instance
               display: true,
               position: 'right',
               id: 'tb-y-axis-2',
               // grid line settings
               gridLines: {
                  drawOnChartArea: false, // only want the grid lines for one axis to show up
               },
               ticks: {
                  callback: formatScale,
               }
            }],
            xAxes: [{
               ticks: {
                  autoSkip: true,
                  maxTicksLimit: 25
               }
            }]
         }
      }
   });
}

function addDataLive(chart, data, black, contno)
{
    if (!whiteEvalL)
        return;

    if (chart.data.datasets[contno+1].data.length == 0)
    {
        if (DEV.graph & 1)
            LS("YYY: Chart not yet updated, so exiting");
        return;
    }

    data.y = getEval(data.eval);
    let length = Max(whiteEvalL, blackEvalL);

    if (length == 0)
    {
        if (DEV.graph & 1)
            LS("XXX: Chart not yet updated, so exiting");
        return;
    }

   if (black)
   {
      chart.data.datasets[contno+1].data[whiteEvalL - 1] = data;
   }
   else
   {
      chart.data.labels[length] = data.x;
      chart.data.datasets[contno+1].data[length] = data;
   }

   chart.update();
}

function addData(chart, data, black)
{
    data.y = getEval(data.eval);

    if (!whiteEvalL)
        return;

    let length = Max(whiteEvalL, blackEvalL);
    if (length == 0)
    {
        if (DEV.graph & 1)
            LS("XXX: Chart not yet updated, so exiting");
        return;
    }

    if (black)
    {
        chart.data.datasets[1].data[blackEvalL] = data;
        length = blackEvalL;
    }
    else
    {
        chart.data.labels[length] = data.x;
        chart.data.datasets[0].data[length] = data;
    }

   chart.update();
}

function removeData(chart, data, black)
{
   addData(chart, data, black);
}

function getLiveEval(key, moveNumber, isBlack, contno)
{
    // CHECK THIS
    let engineEval = (contno == 1)? liveEngineEval1: liveEngineEval2,
        evalObject = engineEval.find(ev => ev.ply == key);

    if (typeof(evalObject) == 'object') {
        let evall = evalObject.eval;
        if (isBlack)
            evall *= -1;

        evalObject.eval = getEval(evall);
        return {
            x: moveNumber,
            y: evalObject.eval,
            eval: evall,
        };
    }

    return {x: moveNumber, y: null, eval: null};
}

/**
 * Reset a chart
 * @param {Object} chart
 */
function reset_chart(chart) {
    if (!chart)
        return;

    let data = chart.data;
    data.labels.length = 0;
    for (let dataset of data.datasets)
        dataset.length = 0;

    chart.update();
}

/**
 * Reset all charts
 */
function clearChartData()
{
    blackDepth = [];
    blackEval = [];
    blackNodes = [];
    blackSelDepth = [];
    blackSpeed = [];
    blackTBHits = [];
    blackTime = [];
    evalLabels = [];
    labels = [];
    liveEval1 = [];
    liveEval2 = [];
    whiteDepth = [];
    whiteEval = [];
    whiteNodes = [];
    whiteSelDepth = [];
    whiteSpeed = [];
    whiteTBHits = [];
    whiteTime = [];

    reset_chart(evalChart);
    reset_chart(timeChart);
    reset_chart(speedChart);
    reset_chart(nodesChart);
    reset_chart(depthChart);
    reset_chart(tbHitsChart);

    firstPly = 0;
}

/**
 * Normalise an eval
 * @param {number} eval_
 * @returns {number}
 */
function getEval(eval_)
{
    if (!isNaN(eval_))
        return Clamp(eval_, -evalconstant, evalconstant);

    if (eval_ && eval_.substring(0,1) == '-')
        eval_ = -evalconstant;
    else if (eval_ != undefined)
        eval_ = evalconstant;
    else
        eval_ = 0;

    return eval_;
}

function arrayPush(chart, number, datax, index, movenum)
{
   if (chart)
   {
      chart.data.labels[index] = movenum;
      chart.data.datasets[number].data[index] = datax;
   }
}

// TODO: merge with Eval1
function updateChartDataLiveEval2()
{
   if (!showLivEng2)
      return;

    let needtoUpdate = 0,
        startEval = whiteEvalL;

    if (!startEval)
        return;

    if (prevPgnData.Moves[0].didliveEval2 == undefined)
        prevPgnData.Moves[0].didliveEval2 = 0;

    let endVal = Min(startEval - 2, prevPgnData.Moves[0].didliveEval2);
    prevPgnData.Moves[0].didliveEval2 = 0;

    for (let ctr = startEval; ctr >= endVal; ctr --)
    {
        let dataToUse = evalChart.data.datasets[0].data[ctr],
            key = 0,
            isBlack = 0;

        if (dataToUse)
            key = dataToUse.ply;

        // LS("RRR: Doing for ctrl:" + ctr + " ,startEval:" + startEval);

        if (evalChart.data.datasets[1].data[ctr] != undefined)
        {
            dataToUse = evalChart.data.datasets[1].data[ctr];
            key = dataToUse.ply;
            isBlack = 1;
        }

        if (dataToUse != undefined)
        {
            needtoUpdate = 1;
            let moveNumber = dataToUse.x,
                evalObject = getLiveEval(key, moveNumber, isBlack, 2);
            /*LS("RRR: cont2 Doing for ctrl:" + ctr + ", key:" + key + " ,startEval:" + startEval + ", evalObject:" + evalObject.y + " ,isblack:" + isBlack);*/
            if (!prevPgnData.Moves[0].didliveEval2)
            {
                prevPgnData.Moves[0].didliveEval2 = ctr;
                /*LS("RRR:X setting cont2 Doing for ctrl:" + ctr + ", key:" + key + " ,startEval:" + startEval + ", evalObject:" + evalObject.y + " ,isblack:" + isBlack);*/
            }
            if (evalObject.y == null)
                prevPgnData.Moves[0].didliveEval2 = ctr;
            else
                evalChart.data.datasets[3].data[ctr] = evalObject;
        }
    }

    if (needtoUpdate)
        evalChart.update();
}

function updateChartDataLiveEval1()
{
   if (!showLivEng1)
      return;

    let needtoUpdate = 0,
        startEval = whiteEvalL;

    if (!whiteEvalL)
        return;

    if (prevPgnData.Moves[0].didliveEval1 == undefined)
        prevPgnData.Moves[0].didliveEval1 = 0;

    let endVal = Min(startEval - 2, prevPgnData.Moves[0].didliveEval1);
    prevPgnData.Moves[0].didliveEval1 = 0;

    for (let ctr = startEval; ctr >= endVal; ctr --)
    {
        let dataToUse = evalChart.data.datasets[0].data[ctr],
            isBlack = 0,
            key = 0;

        if (dataToUse)
            key = dataToUse.ply;

        /*LS("RRR: Doing for ctrl:" + ctr + " ,startEval:" + startEval);*/

        if (evalChart.data.datasets[1].data[ctr] != undefined)
        {
            dataToUse = evalChart.data.datasets[1].data[ctr];
            key = dataToUse.ply;
            isBlack = 1;
        }

        if (dataToUse != undefined)
        {
            needtoUpdate = 1;
            let moveNumber = dataToUse.x,
                evalObject = getLiveEval(key, moveNumber, isBlack, 1);
            /*LS("RRR: cont1 Doing for ctrl:" + ctr + ", key:" + key + " ,startEval:" + startEval + ", evalObject:" + evalObject.y + " ,isblack:" + isBlack);*/
            if (!prevPgnData.Moves[0].didliveEval1)
                prevPgnData.Moves[0].didliveEval1 = ctr;

            if (evalObject.y == null)
                prevPgnData.Moves[0].didliveEval1 = ctr;
            else
                evalChart.data.datasets[2].data[ctr] = evalObject;
        }
    }

    if (needtoUpdate)
        evalChart.update();
}

function updateChartDataLive(contno)
{
   if (contno == 1)
      updateChartDataLiveEval1();
   else
      updateChartDataLiveEval2();
}

function updateChartData()
{
    setEvalChartData();

    var plyNum = 0;

    if (DEV.graph & 1)
        LS(`GRAPH: updateChartData : whiteEvalL=${whiteEvalL}`);

    if (prevPgnData.Moves)
    {
        if (DEV.graph & 1)
            LS(`GRAPH: prevPgnData.Moves.length=${prevPgnData.Moves.length} : whiteEvalL=${whiteEvalL} : evalChart.data.labels.length=${evalChart.data.labels.length}`);
        if (prevPgnData.Moves[0].completed == undefined || evalChart.data.labels.length == 0)
        {
            clearChartData();
            prevPgnData.Moves[0].completed = 0;
            prevPgnData.Moves[0].arrayStartW = 0;
            prevPgnData.Moves[0].arrayStartB = 0;
        }
    }
    else
    {
        clearChartData();
        return;
    }

    let needtoUpdate = 0,
        arrayCtrW = prevPgnData.Moves[0].arrayStartW,
        arrayCtrB = prevPgnData.Moves[0].arrayStartB;

    if (0 && (arrayCtrW - 2) > 0)
    {
        arrayCtrW -= 2;
        arrayCtrB -= 2;
        prevPgnData.Moves[0].completed -= 4;
        if (DEV.graph & 1)
            LS(`GRAPH: prevPgnData.Moves.length=$prevPgnData.Moves.length} : whiteEvalL=${whiteEvalL} : evalChart.data.labels.length=${evalChart.data.labels.length}`);
    }

    whiteEvalL = 0;
    blackEvalL = 0;

    for (let moveCtr = prevPgnData.Moves[0].completed; moveCtr < prevPgnData.Moves.length ; moveCtr++)
    {
        let key = moveCtr,
            move = prevPgnData.Moves[moveCtr];

        if (move.book)
        {
            prevPgnData.Moves[moveCtr].done = 1;
            continue;
        }

        let moveNumber = Round(moveCtr / 2) + 1;

        if (moveCtr % 2 != 0) {
            plyNum = moveCtr + 1;
            moveNumber--;
        }
        else
            plyNum = moveCtr + 1;

        if (plyNum < prevPgnData.Moves[0].completed)
            continue;

        if (!move.book) {
            needtoUpdate = 1;
            prevPgnData.Moves[0].completed = moveCtr + 1;
            let ydepth = move.d;

            move.cwv = getEval(move.wv);

            let evall =
            {
                'x': moveNumber,
                'y': move.cwv,
                'ply': plyNum,
                'eval': move.wv
            },
            time =
            {
                'x': moveNumber,
                'y': Round(move.mt / 1000),
                'ply': plyNum
            },
            speed =
            {
                'x': moveNumber,
                'y': move.s,
                'nodes': move.n,
                'ply': plyNum
            },
            depth =
            {
                'x': moveNumber,
                'y': ydepth,
                'ply': plyNum
            },
            seldepth =
            {
                'x': moveNumber,
                'y': move.sd,
                'ply': plyNum
            },
            tbHits =
            {
                'x': moveNumber,
                'y': move.tb,
                'ply': plyNum
            },
            nodes =
            {
                'x': moveNumber,
                'y': move.n,
                'nodes': move.n,
                'ply': plyNum
            };

            if (!firstPly)
            {
                firstPly = plyNum;
                if (firstPly % 2 == 0)
                {
                    blackStarted = 1;
                    evalChart.data.labels[arrayCtrW] = moveNumber;
                    arrayCtrW ++;
                }
            }

            if (DEV.graph & 1)
                LS(`LLL: doing for key=${key} : prevPgnData.Moves[0].arrayStartW=${prevPgnData.Moves[0].arrayStartW}`
                    + ` : prevPgnData.Moves[0].arrayStartB=${prevPgnData.Moves[0].arrayStartB} : blackStarted=${blackStarted}`);

            if (key % 2 == 0) {
                evalChart.data.labels[arrayCtrW] = moveNumber;
                evalChart.data.datasets[0].data[arrayCtrW] = evall;
                arrayPush(nodesChart, 0, nodes, arrayCtrW, moveNumber);
                arrayPush(timeChart, 0, time, arrayCtrW, moveNumber);
                arrayPush(speedChart, 0, speed, arrayCtrW, moveNumber);
                arrayPush(depthChart, 0, depth, arrayCtrW, moveNumber);
                arrayPush(depthChart, 2, seldepth, arrayCtrW, moveNumber);
                arrayPush(tbHitsChart, 0, tbHits, arrayCtrW, moveNumber);
                arrayCtrW ++;
                prevPgnData.Moves[0].arrayStartW = arrayCtrW;
            }
            else
            {
                evalChart.data.datasets[1].data[arrayCtrB] = evall;
                arrayPush(nodesChart, 1, nodes, arrayCtrB, moveNumber);
                arrayPush(timeChart, 1, time, arrayCtrB, moveNumber);
                arrayPush(speedChart, 1, speed, arrayCtrB, moveNumber);
                arrayPush(depthChart, 1, depth, arrayCtrB, moveNumber);
                arrayPush(depthChart, 3, seldepth, arrayCtrB, moveNumber);
                arrayPush(tbHitsChart, 1, tbHits, arrayCtrB, moveNumber);
                arrayCtrB ++;
                prevPgnData.Moves[0].arrayStartB = arrayCtrB;
            }
        }
    }

    evalChart.update();

    if (arrayCtrW)
        whiteEvalL = arrayCtrW;
    if (arrayCtrB)
        blackEvalL = arrayCtrB;

    timeChart.update();
    speedChart.update();
    if (nodesChart)
        nodesChart.update();

    depthChart.update();
    tbHitsChart.update();

    if (DEV.graph & 1)
        LS(`GRAPH: ~updateChartData : needtoUpdate=${needtoUpdate} : arrayCtrW=${arrayCtrW} : arrayCtrB=${arrayCtrB}`
            + `prevPgnData.Moves[0].completed=${prevPgnData.Moves[0].completed} : evalChart.data.labels.length=${evalChart.data.labels.length}`);
}

/**
 * Startup graphs
 */
function startup_graphs() {
    setEvalChartData();
    drawEval();
    initializeCharts();
}
