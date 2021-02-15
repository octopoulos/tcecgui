// chart.js
// @version 2021-02-14
/*
globals
Abs, AnimationFrame, Assign, Ceil, Clamp, console, Cos,
define, document, Floor, IsArray, IsFunction, IsObject, IsString, Keys,
Log10, LS, Max, Merge, Min, module, PI, Pow, require, Round,
Sign, Sin, Sqrt, Undefined, window
*/
(function (global, factory) {
typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(function() {}()) :
typeof define === 'function' && define.amd ? define(['require'], function(require) { return factory(function() {}()); }) :
(global = global || self, global.Chart = factory());
}(this, (function () {
    'use strict';

function noop() {}

function createCommonjsModule(fn, module) {
    return module = { exports: {} }, fn(module, module.exports), module.exports;
}

function getCjsExportFromNamespace (n) {
    return n && n['default'] || n;
}

var conversions = createCommonjsModule(function (module) {
/* MIT license */

var convert = module.exports = {
    rgb: {channels: 3, labels: 'rgb'},
    hex: {channels: 1, labels: ['hex']},
};

// hide .channels and .labels properties
for (var model in convert) {
    if (convert.hasOwnProperty(model)) {
        var channels = convert[model].channels;
        var labels = convert[model].labels;
        delete convert[model].channels;
        delete convert[model].labels;
        Object.defineProperty(convert[model], 'channels', {value: channels});
        Object.defineProperty(convert[model], 'labels', {value: labels});
    }
}

convert.rgb.hex = function (args) {
    var integer = ((Round(args[0]) & 0xFF) << 16)
        + ((Round(args[1]) & 0xFF) << 8)
        + (Round(args[2]) & 0xFF);

    var string = integer.toString(16).toUpperCase();
    return '000000'.substring(string.length) + string;
};

convert.hex.rgb = function (args) {
    var match = args.toString(16).match(/[a-f0-9]{6}|[a-f0-9]{3}/i);
    if (!match) {
        return [0, 0, 0];
    }

    var colorString = match[0];

    if (match[0].length === 3) {
        colorString = colorString.split('').map(function (char) {
            return char + char;
        }).join('');
    }

    var integer = parseInt(colorString, 16);
    var r = (integer >> 16) & 0xFF;
    var g = (integer >> 8) & 0xFF;
    var b = integer & 0xFF;

    return [r, g, b];
};

});

/*
    this function routes a model to all other models.

    all functions that are routed have a property `.conversion` attached
    to the returned synthetic function. This property is an array
    of strings, each with the steps in between the 'from' and 'to'
    color models (inclusive).

    conversions that are not possible simply are not included.
*/

function buildGraph() {
    var graph = {};
    // https://jsperf.com/object-keys-vs-for-in-with-closure/3
    var models = Keys(conversions);

    for (var len = models.length, i = 0; i < len; i++) {
        graph[models[i]] = {
            // http://jsperf.com/1-vs-infinity
            // micro-opt, but this is simple.
            distance: -1,
            parent: null
        };
    }

    return graph;
}

// https://en.wikipedia.org/wiki/Breadth-first_search
function deriveBFS(fromModel) {
    var graph = buildGraph();
    var queue = [fromModel]; // unshift -> queue -> pop

    graph[fromModel].distance = 0;

    while (queue.length) {
        var current = queue.pop();
        var adjacents = Keys(conversions[current]);

        for (var len = adjacents.length, i = 0; i < len; i++) {
            var adjacent = adjacents[i];
            var node = graph[adjacent];

            if (node.distance === -1) {
                node.distance = graph[current].distance + 1;
                node.parent = current;
                queue.unshift(adjacent);
            }
        }
    }

    return graph;
}

function link(from, to) {
    return function (args) {
        return to(from(args));
    };
}

function wrapConversion(toModel, graph) {
    var path = [graph[toModel].parent, toModel];
    var fn = conversions[graph[toModel].parent][toModel];

    var cur = graph[toModel].parent;
    while (graph[cur].parent) {
        path.unshift(graph[cur].parent);
        fn = link(conversions[graph[cur].parent][cur], fn);
        cur = graph[cur].parent;
    }

    fn.conversion = path;
    return fn;
}

var route = function (fromModel) {
    var graph = deriveBFS(fromModel);
    var conversion = {};

    var models = Keys(graph);
    for (var len = models.length, i = 0; i < len; i++) {
        var toModel = models[i];
        var node = graph[toModel];

        if (node.parent === null) {
            // no possible conversion, or this node is the source model.
            continue;
        }

        conversion[toModel] = wrapConversion(toModel, graph);
    }

    return conversion;
};

var convert = {};

var models = Keys(conversions);

function wrapRaw(fn) {
    var wrappedFn = function (args) {
        if (args === undefined || args === null) {
            return args;
        }

        if (arguments.length > 1) {
            args = Array.prototype.slice.call(arguments);
        }

        return fn(args);
    };

    // preserve .conversion property if there is one
    if ('conversion' in fn) {
        wrappedFn.conversion = fn.conversion;
    }

    return wrappedFn;
}

function wrapRounded(fn) {
    var wrappedFn = function (args) {
        if (args === undefined || args === null) {
            return args;
        }

        if (arguments.length > 1) {
            args = Array.prototype.slice.call(arguments);
        }

        var result = fn(args);

        // we're assuming the result is an array here.
        // see notice in conversions.js; don't use box types
        // in conversion functions.
        if (IsObject(result)) {
            for (var len = result.length, i = 0; i < len; i++) {
                result[i] = Round(result[i]);
            }
        }

        return result;
    };

    // preserve .conversion property if there is one
    if ('conversion' in fn) {
        wrappedFn.conversion = fn.conversion;
    }

    return wrappedFn;
}

models.forEach(function (fromModel) {
    convert[fromModel] = {};

    Object.defineProperty(convert[fromModel], 'channels', {value: conversions[fromModel].channels});
    Object.defineProperty(convert[fromModel], 'labels', {value: conversions[fromModel].labels});

    var routes = route(fromModel);
    var routeModels = Keys(routes);

    routeModels.forEach(function (toModel) {
        var fn = routes[toModel];

        convert[fromModel][toModel] = wrapRounded(fn);
        convert[fromModel][toModel].raw = wrapRaw(fn);
    });
});

var colorConvert = convert;

var colorName$1 = {};

/* MIT license */


var colorString = {
    getRgba: getRgba,
    getRgb: getRgb,
    getAlpha: getAlpha,

    hexString: hexString,
    rgbString: rgbString,
    rgbaString: rgbaString,
};

function getRgba(string) {
    if (!string) {
        return;
    }
    var abbr =  /^#([a-fA-F0-9]{3,4})$/i,
        hex =  /^#([a-fA-F0-9]{6}([a-fA-F0-9]{2})?)$/i,
        rgba = /^rgba?\(\s*([+-]?\d+)\s*,\s*([+-]?\d+)\s*,\s*([+-]?\d+)\s*(?:,\s*([+-]?[\d\.]+)\s*)?\)$/i,
        per = /^rgba?\(\s*([+-]?[\d\.]+)\%\s*,\s*([+-]?[\d\.]+)\%\s*,\s*([+-]?[\d\.]+)\%\s*(?:,\s*([+-]?[\d\.]+)\s*)?\)$/i,
        keyword = /(\w+)/;

    var rgb = [0, 0, 0],
        a = 1,
        match = string.match(abbr),
        hexAlpha = "";
    if (match) {
        match = match[1];
        hexAlpha = match[3];
        for (let i = 0; i < rgb.length; i++) {
            rgb[i] = parseInt(match[i] + match[i], 16);
        }
        if (hexAlpha) {
            a = Round((parseInt(hexAlpha + hexAlpha, 16) / 255) * 100) / 100;
        }
    }
    else if ((match = string.match(hex))) {
        hexAlpha = match[2];
        match = match[1];
        for (let i = 0; i < rgb.length; i++) {
            rgb[i] = parseInt(match.slice(i * 2, i * 2 + 2), 16);
        }
        if (hexAlpha) {
            a = Round((parseInt(hexAlpha, 16) / 255) * 100) / 100;
        }
    }
    else if ((match = string.match(rgba))) {
        for (let i = 0; i < rgb.length; i++) {
            rgb[i] = parseInt(match[i + 1], 10);
        }
        a = parseFloat(match[4]);
    }
    else if ((match = string.match(per))) {
        for (let i = 0; i < rgb.length; i++) {
            rgb[i] = Round(parseFloat(match[i + 1]) * 2.55);
        }
        a = parseFloat(match[4]);
    }
    else if ((match = string.match(keyword))) {
        if (match[1] == "transparent") {
            return [0, 0, 0, 0];
        }
        rgb = colorName$1[match[1]];
        if (!rgb) {
            return;
        }
    }

    for (let i = 0; i < rgb.length; i++) {
        rgb[i] = Clamp(rgb[i], 0, 255);
    }
    if (!a && a != 0) {
        a = 1;
    }
    else {
        a = Clamp(a, 0, 1);
    }
    rgb[3] = a;
    return rgb;
}

function getRgb(string) {
    var rgba = getRgba(string);
    return rgba && rgba.slice(0, 3);
}

function getAlpha(string) {
    var vals = getRgba(string);
    if (vals) {
        return vals[3];
    }
}

// generators
function hexString(rgba, a) {
    a = (a !== undefined && rgba.length === 3) ? a : rgba[3];
    return "#" + hexDouble(rgba[0])
                + hexDouble(rgba[1])
                + hexDouble(rgba[2])
                + (
                    (a >= 0 && a < 1)
                    ? hexDouble(Round(a * 255))
                    : ""
                );
}

function rgbString(rgba, alpha) {
    if (alpha < 1 || (rgba[3] && rgba[3] < 1)) {
        return rgbaString(rgba, alpha);
    }
    return "rgb(" + rgba[0] + ", " + rgba[1] + ", " + rgba[2] + ")";
}

function rgbaString(rgba, alpha) {
    if (alpha === undefined) {
        alpha = (rgba[3] !== undefined ? rgba[3] : 1);
    }
    return "rgba(" + rgba[0] + ", " + rgba[1] + ", " + rgba[2]
            + ", " + alpha + ")";
}

function hexDouble(num) {
    var str = num.toString(16).toUpperCase();
    return (str.length < 2) ? "0" + str : str;
}


//create a list of reverse color names
var reverseNames = {};
for (var name in colorName$1) {
    reverseNames[colorName$1[name]] = name;
}

/* MIT license */



var Color = function (obj) {
    if (obj instanceof Color) {
        return obj;
    }
    if (!(this instanceof Color)) {
        return new Color(obj);
    }

    this.valid = false;
    this.values = {
        rgb: [0, 0, 0],
        alpha: 1
    };

    // parse Color() argument
    var vals;
    if (IsString(obj)) {
        vals = colorString.getRgba(obj);
        if (vals) {
            this.setValues('rgb', vals);
        }
    } else if (IsObject(obj)) {
        vals = obj;
        if (vals.r !== undefined || vals.red !== undefined) {
            this.setValues('rgb', vals);
        }
    }
};

Color.prototype = {
    rgb: function () {
        return this.setSpace('rgb', arguments);
    },
    alpha: function (val) {
        if (val === undefined) {
            return this.values.alpha;
        }
        this.setValues('alpha', val);
        return this;
    },
    red: function (val) {
        return this.setChannel('rgb', 0, val);
    },
    green: function (val) {
        return this.setChannel('rgb', 1, val);
    },
    blue: function (val) {
        return this.setChannel('rgb', 2, val);
    },
    hexString: function () {
        return colorString.hexString(this.values.rgb);
    },
    rgbString: function () {
        return colorString.rgbString(this.values.rgb, this.values.alpha);
    },
    rgbaString: function () {
        return colorString.rgbaString(this.values.rgb, this.values.alpha);
    },

    /**
     * Ported from sass implementation in C
     * https://github.com/sass/libsass/blob/0e6b4a2850092356aa3ece07c6b249f0221caced/functions.cpp#L209
     */
    mix: function (mixinColor, weight) {
        var color1 = this;
        var color2 = mixinColor;
        var p = weight === undefined ? 0.5 : weight;

        var w = 2 * p - 1;
        var a = color1.alpha() - color2.alpha();

        var w1 = (((w * a === -1) ? w : (w + a) / (1 + w * a)) + 1) / 2.0;
        var w2 = 1 - w1;

        return this
            .rgb(
                w1 * color1.red() + w2 * color2.red(),
                w1 * color1.green() + w2 * color2.green(),
                w1 * color1.blue() + w2 * color2.blue()
            )
            .alpha(color1.alpha() * p + color2.alpha() * (1 - p));
    },

    toJSON: function () {
        return this.rgb();
    },

    clone: function () {
        // NOTE(SB): using node-clone creates a dependency to Buffer when using browserify,
        // making the final build way to big to embed in Chart.js. So let's do it manually,
        // assuming that values to clone are 1 dimension arrays containing only numbers,
        // except 'alpha' which is a number.
        var result = new Color();
        var source = this.values;
        var target = result.values;
        var value, type;

        for (var prop in source) {
            if (source.hasOwnProperty(prop)) {
                value = source[prop];
                type = ({}).toString.call(value);
                if (type === '[object Array]') {
                    target[prop] = value.slice(0);
                } else if (type === '[object Number]') {
                    target[prop] = value;
                } else {
                    console.error('unexpected color value:', value);
                }
            }
        }

        return result;
    }
};

Color.prototype.spaces = {
    rgb: ['red', 'green', 'blue'],
};

Color.prototype.maxes = {
    rgb: [255, 255, 255],
};

Color.prototype.getValues = function (space) {
    var values = this.values;
    var vals = {};

    for (var i = 0; i < space.length; i++) {
        vals[space.charAt(i)] = values[space][i];
    }

    if (values.alpha !== 1) {
        vals.a = values.alpha;
    }

    // {r: 255, g: 255, b: 255, a: 0.4}
    return vals;
};

Color.prototype.setValues = function (space, vals) {
    var values = this.values;
    var spaces = this.spaces;
    var maxes = this.maxes;
    var alpha = 1;
    var i;

    this.valid = true;

    if (space === 'alpha') {
        alpha = vals;
    } else if (vals.length) {
        // [10, 10, 10]
        values[space] = vals.slice(0, space.length);
        alpha = vals[space.length];
    } else if (vals[space.charAt(0)] !== undefined) {
        // {r: 10, g: 10, b: 10}
        for (i = 0; i < space.length; i++) {
            values[space][i] = vals[space.charAt(i)];
        }

        alpha = vals.a;
    } else if (vals[spaces[space][0]] !== undefined) {
        // {red: 10, green: 10, blue: 10}
        var chans = spaces[space];

        for (i = 0; i < space.length; i++) {
            values[space][i] = vals[chans[i]];
        }

        alpha = vals.alpha;
    }

    values.alpha = Max(0, Min(1, (alpha === undefined ? values.alpha : alpha)));

    if (space === 'alpha') {
        return false;
    }

    var capped;

    // cap values of the space prior converting all values
    for (i = 0; i < space.length; i++) {
        capped = Max(0, Min(maxes[space][i], values[space][i]));
        values[space][i] = Round(capped);
    }

    // convert to all the other color spaces
    for (var sname in spaces) {
        if (sname !== space) {
            values[sname] = colorConvert[space][sname](values[space]);
        }
    }

    return true;
};

Color.prototype.setSpace = function (space, args) {
    var vals = args[0];

    if (vals === undefined) {
        // color.rgb()
        return this.getValues(space);
    }

    // color.rgb(10, 10, 10)
    if (typeof vals === 'number') {
        vals = Array.prototype.slice.call(args);
    }

    this.setValues(space, vals);
    return this;
};

Color.prototype.setChannel = function (space, index, val) {
    var svalues = this.values[space];
    if (val === undefined) {
        // color.red()
        return svalues[index];
    } else if (val === svalues[index]) {
        // color.red(color.red())
        return this;
    }

    // color.red(100)
    svalues[index] = val;
    this.setValues(space, svalues);

    return this;
};

if (typeof window !== 'undefined') {
    window.Color = Color;
}

var chartjsColor = Color;

/**
 * @namespace Chart.helpers
 */
var helpers = {
    /**
     * Returns a unique id, sequentially generated from a global variable.
     * @returns {number}
     * @function
     */
    uid: (function() {
        var id = 0;
        return function() {
            return id++;
        };
    }()),

    /**
     * Returns true if `value` is a finite number, else returns false
     * @param {*} value  - The value to test.
     * @returns {boolean}
     */
    isFinite: function(value) {
        return (typeof value === 'number' || value instanceof Number) && isFinite(value);
    },

    /**
     * Calls `fn` with the given `args` in the scope defined by `thisArg` and returns the
     * value returned by `fn`. If `fn` is not a function, this method returns undefined.
     * @param {Function} fn - The function to call.
     * @param {Array?=} args - The arguments with which `fn` should be called.
     * @param {Object} thisArg - The value of `this` provided for the call to `fn`.
     * @returns {*}
     */
    callback: function(fn, args, thisArg) {
        if (fn && typeof fn.call === 'function') {
            return fn.apply(thisArg, args);
        }
    },

    /**
     * Note(SB) for performance sake, this method should only be used when loopable type
     * is unknown or in none intensive code (not called often and small loopable). Else
     * it's preferable to use a regular for() loop and save extra function calls.
     * @param {Object|Array} loopable - The object or array to be iterated.
     * @param {Function} fn - The function to call for each item.
     * @param {Object} thisArg - The value of `this` provided for the call to `fn`.
     * @param {boolean} reverse - If true, iterates backward on the loopable.
     */
    each: function(loopable, fn, thisArg, reverse) {
        var i, len, keys;
        if (IsArray(loopable)) {
            len = loopable.length;
            if (reverse) {
                for (i = len - 1; i >= 0; i--) {
                    fn.call(thisArg, loopable[i], i);
                }
            } else {
                for (i = 0; i < len; i++) {
                    fn.call(thisArg, loopable[i], i);
                }
            }
        } else if (IsObject(loopable)) {
            keys = Keys(loopable);
            len = keys.length;
            for (i = 0; i < len; i++) {
                fn.call(thisArg, loopable[keys[i]], keys[i]);
            }
        }
    },

    /**
     * Returns true if the `a0` and `a1` arrays have the same content, else returns false.
     * @see https://stackoverflow.com/a/14853974
     * @param {Array} a0 - The array to compare
     * @param {Array} a1 - The array to compare
     * @returns {boolean}
     */
    arrayEquals: function(a0, a1) {
        var i, ilen, v0, v1;

        if (!a0 || !a1 || a0.length !== a1.length) {
            return false;
        }

        for (i = 0, ilen = a0.length; i < ilen; ++i) {
            v0 = a0[i];
            v1 = a1[i];

            if (v0 instanceof Array && v1 instanceof Array) {
                if (!helpers.arrayEquals(v0, v1)) {
                    return false;
                }
            } else if (v0 !== v1) {
                // NOTE: two different object instances will never be equal: {x:20} != {x:20}
                return false;
            }
        }

        return true;
    },

    /**
     * Returns a deep copy of `source` without keeping references on objects and arrays.
     * @param {*} source - The value to clone.
     * @returns {*}
     */
    clone: function(source) {
        if (IsArray(source)) {
            return source.map(helpers.clone);
        }

        if (IsObject(source)) {
            var target = {};
            var keys = Keys(source);
            var klen = keys.length;
            var k = 0;

            for (; k < klen; ++k) {
                target[keys[k]] = helpers.clone(source[keys[k]]);
            }

            return target;
        }

        return source;
    },

    /**
     * The default merger when Chart.helpers.merge is called without merger option.
     * Note(SB): also used by mergeConfig and mergeScaleConfig as fallback.
     * @private
     */
    _merger: function(key, target, source, options) {
        var tval = target[key];
        var sval = source[key];

        if (IsObject(tval) && IsObject(sval)) {
            helpers.merge(tval, sval, options);
        } else {
            target[key] = helpers.clone(sval);
        }
    },

    /**
     * Recursively deep copies `source` properties into `target` with the given `options`.
     * IMPORTANT: `target` is not cloned and will be updated with `source` properties.
     * @param {Object} target - The target object in which all sources are merged into.
     * @param {Object|Array<Object>} source - Object(s) to merge into `target`.
     * @param {Object} options - Merging options:
     * @param {Function} options.merger - The merge method (key, target, source, options)
     * @returns {Object} The `target` object.
     */
    merge: function(target, source, options) {
        var sources = IsArray(source) ? source : [source];
        var ilen = sources.length;
        var merge, i, keys, klen, k;

        if (!IsObject(target)) {
            return target;
        }

        options = options || {};
        merge = options.merger || helpers._merger;

        for (i = 0; i < ilen; ++i) {
            source = sources[i];
            if (!IsObject(source)) {
                continue;
            }

            keys = Keys(source);
            for (k = 0, klen = keys.length; k < klen; ++k) {
                merge(keys[k], target, source, options);
            }
        }

        return target;
    },

    /**
     * Basic javascript inheritance based on the model created in Backbone.js
     */
    inherits: function(extensions) {
        var me = this;
        var ChartElement = (extensions && extensions.hasOwnProperty('constructor')) ? extensions.constructor : function() {
            return me.apply(this, arguments);
        };

        var Surrogate = function() {
            this.constructor = ChartElement;
        };

        Surrogate.prototype = me.prototype;
        ChartElement.prototype = new Surrogate();
        ChartElement.extend = helpers.inherits;

        if (extensions) {
            Assign(ChartElement.prototype, extensions);
        }

        ChartElement.__super__ = me.prototype;
        return ChartElement;
    },
};

/**
 * Easing functions adapted from Robert Penner's easing equations.
 * @namespace Chart.helpers.easingEffects
 * @see http://www.robertpenner.com/easing/
 */
var effects = {
    'easeOutQuart': function(t) {
        return -((t = t - 1) * t * t * t - 1);
    },
};

var helpers_easing = {
    effects: effects
};

var RAD_PER_DEG = PI / 180;
var DOUBLE_PI = PI * 2;

/**
 * @namespace Chart.helpers.canvas
 */
var exports$1 = {
    /**
     * Clears the entire canvas associated to the given `chart`.
     * @param {Chart} chart - The chart for which to clear the canvas.
     */
    clear: function(chart) {
        chart.ctx.clearRect(0, 0, chart.width, chart.height);
    },

    drawPoint: function(ctx, style, radius, x, y, rotation) {
        var type;
        var rad = (rotation || 0) * RAD_PER_DEG;

        if (style && IsObject(style)) {
            type = style.toString();
            if (type === '[object HTMLImageElement]' || type === '[object HTMLCanvasElement]') {
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(rad);
                ctx.drawImage(style, -style.width / 2, -style.height / 2, style.width, style.height);
                ctx.restore();
                return;
            }
        }

        if (isNaN(radius) || radius <= 0) {
            return;
        }

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, DOUBLE_PI);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    },

    /**
     * Returns true if the point is inside the rectangle
     * @param {Object} point - The point to test
     * @param {Object} area - The rectangle
     * @returns {boolean}
     * @private
     */
    _isPointInArea: function(point, area) {
        var epsilon = 1e-6; // 1e-6 is margin in pixels for accumulated error.

        return point.x > area.left - epsilon && point.x < area.right + epsilon &&
            point.y > area.top - epsilon && point.y < area.bottom + epsilon;
    },

    clipArea: function(ctx, area) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(area.left, area.top, area.right - area.left, area.bottom - area.top);
        ctx.clip();
    },

    unclipArea: function(ctx) {
        ctx.restore();
    },

    lineTo: function(ctx, previous, target, flip) {
        var stepped = target.steppedLine;
        if (stepped) {
            if (stepped === 'middle') {
                var midpoint = (previous.x + target.x) / 2.0;
                ctx.lineTo(midpoint, flip ? target.y : previous.y);
                ctx.lineTo(midpoint, flip ? previous.y : target.y);
            } else if ((stepped === 'after' && !flip) || (stepped !== 'after' && flip)) {
                ctx.lineTo(previous.x, target.y);
            } else {
                ctx.lineTo(target.x, previous.y);
            }
            ctx.lineTo(target.x, target.y);
            return;
        }

        if (!target.tension) {
            ctx.lineTo(target.x, target.y);
            return;
        }

        ctx.bezierCurveTo(
            flip ? previous.controlPointPreviousX : previous.controlPointNextX,
            flip ? previous.controlPointPreviousY : previous.controlPointNextY,
            flip ? target.controlPointNextX : target.controlPointPreviousX,
            flip ? target.controlPointNextY : target.controlPointPreviousY,
            target.x,
            target.y);
    }
};

var helpers_canvas = exports$1;

var defaults = {};

// TODO(v3): remove 'global' from namespace.  all default are global and
// there's inconsistency around which options are under 'global'
Merge(defaults, {
    global: {
        defaultColor: 'rgba(0,0,0,0.1)',
        defaultFontColor: '#666',
        defaultFontFamily: "'Helvetica Neue', 'Helvetica', 'Arial', sans-serif",
        defaultFontSize: 12,
        defaultFontStyle: 'normal',
        defaultLineHeight: 1.2,
        showLines: true,
    },
});

var core_defaults = defaults;

/**
 * Converts the given font object into a CSS font string.
 * @param {Object} font - A font object.
 * @returns {string} The CSS font string. See https://developer.mozilla.org/en-US/docs/Web/CSS/font
 * @private
 */
function toFontString(font) {
    if (!font || font.size == null || font.family == null) {
        return null;
    }

    return (font.style ? font.style + ' ' : '')
        + (font.weight ? font.weight + ' ' : '')
        + font.size + 'px '
        + font.family;
}

/**
 * @alias Chart.helpers.options
 * @namespace
 */
var helpers_options = {
    /**
     * Converts the given line height `value` in pixels for a specific font `size`.
     * @param {number|string} value - The lineHeight to parse (eg. 1.6, '14px', '75%', '1.6em').
     * @param {number} size - The font size (in pixels) used to resolve relative `value`.
     * @returns {number} The effective line height in pixels (size * 1.2 if value is invalid).
     * @see https://developer.mozilla.org/en-US/docs/Web/CSS/line-height
     * @since 2.7.0
     */
    toLineHeight: function(value, size) {
        var matches = ('' + value).match(/^(normal|(\d+(?:\.\d+)?)(px|em|%)?)$/);
        if (!matches || matches[1] === 'normal') {
            return size * 1.2;
        }

        value = +matches[2];

        switch (matches[3]) {
        case 'px':
            return value;
        case '%':
            value /= 100;
            break;
        }

        return size * value;
    },

    /**
     * Converts the given value into a padding object with pre-computed width/height.
     * @param {number|Object} value - If a number, set the value to all TRBL component,
     *  else, if and object, use defined properties and sets undefined ones to 0.
     * @returns {Object} The padding values (top, right, bottom, left, width, height)
     * @since 2.7.0
     */
    toPadding: function(value) {
        var t, r, b, l;

        if (IsObject(value)) {
            t = +value.top || 0;
            r = +value.right || 0;
            b = +value.bottom || 0;
            l = +value.left || 0;
        } else {
            t = r = b = l = +value || 0;
        }

        return {
            top: t,
            right: r,
            bottom: b,
            left: l,
            height: t + b,
            width: l + r
        };
    },

    /**
     * Parses font options and returns the font object.
     * @param {Object} options - A object that contains font options to be parsed.
     * @returns {Object} The font object.
     * @todo Support font.* options and renamed to toFont().
     * @private
     */
    _parseFont: function(options) {
        var globalDefaults = core_defaults.global;
        var size = Undefined(options.fontSize, globalDefaults.defaultFontSize);
        var font = {
            family: Undefined(options.fontFamily, globalDefaults.defaultFontFamily),
            lineHeight: helpers.options.toLineHeight(Undefined(options.lineHeight, globalDefaults.defaultLineHeight), size),
            size: size,
            style: Undefined(options.fontStyle, globalDefaults.defaultFontStyle),
            weight: null,
            string: ''
        };

        font.string = toFontString(font);
        return font;
    },

    /**
     * Evaluates the given `inputs` sequentially and returns the first defined value.
     * @param {Array} inputs - An array of values, falling back to the last value.
     * @param {Object} context - If defined and the current value is a function, the value
     * is called with `context` as first argument and the result becomes the new input.
     * @param {number} index - If defined and the current value is an array, the value
     * at `index` become the new input.
     * @param {Object} info - object to return information about resolution in
     * @param {boolean} info.cacheable - Will be set to `false` if option is not cacheable.
     * @since 2.7.0
     */
    resolve: function(inputs, context, index, info) {
        var cacheable = true;
        var i, ilen, value;

        for (i = 0, ilen = inputs.length; i < ilen; ++i) {
            value = inputs[i];
            if (value === undefined) {
                continue;
            }
            if (context !== undefined && IsFunction(value)) {
                value = value(context);
                cacheable = false;
            }
            if (index !== undefined && IsArray(value)) {
                value = value[index];
                cacheable = false;
            }
            if (value !== undefined) {
                if (info && !cacheable) {
                    info.cacheable = false;
                }
                return value;
            }
        }
    }
};

/**
 * @alias Chart.helpers.math
 * @namespace
 */
var exports$2 = {
    /**
     * Returns an array of factors sorted from 1 to sqrt(value)
     * @private
     */
    _factorize: function(value) {
        var result = [];
        var sqrt = Sqrt(value);
        var i;

        for (i = 1; i < sqrt; i++) {
            if (value % i === 0) {
                result.push(i);
                result.push(value / i);
            }
        }
        if (sqrt === (sqrt | 0)) { // if value is a square number
            result.push(sqrt);
        }

        result.sort(function(a, b) {
            return a - b;
        }).pop();
        return result;
    },
};

var helpers_math = exports$2;
var easing = helpers_easing;
var canvas = helpers_canvas;
var options = helpers_options;
var math = helpers_math;
helpers.easing = easing;
helpers.canvas = canvas;
helpers.options = options;
helpers.math = math;

function interpolate(start, view, model, ease) {
    var keys = Keys(model);
    var i, ilen, key, actual, origin, target, type, c0, c1;

    for (i = 0, ilen = keys.length; i < ilen; ++i) {
        key = keys[i];

        target = model[key];

        // if a value is added to the model after pivot() has been called, the view
        // doesn't contain it, so let's initialize the view to the target value.
        if (!view.hasOwnProperty(key)) {
            view[key] = target;
        }

        actual = view[key];

        if (actual === target || key[0] === '_') {
            continue;
        }

        if (!start.hasOwnProperty(key)) {
            start[key] = actual;
        }

        origin = start[key];

        type = typeof target;

        if (type === typeof origin) {
            if (type == 'string') {
                c0 = chartjsColor(origin);
                if (c0.valid) {
                    c1 = chartjsColor(target);
                    if (c1.valid) {
                        view[key] = c1.mix(c0, ease).rgbString();
                        continue;
                    }
                }
            } else if (helpers.isFinite(origin) && helpers.isFinite(target)) {
                view[key] = origin + (target - origin) * ease;
                continue;
            }
        }

        view[key] = target;
    }
}

var Element = function(configuration) {
    Assign(this, configuration);
    this.initialize.apply(this, arguments);
};

Assign(Element.prototype, {
    _type: undefined,

    initialize: function() {
        this.hidden = false;
    },

    pivot: function() {
        var me = this;
        if (!me._view) {
            me._view = Assign({}, me._model);
        }
        me._start = {};
        return me;
    },

    transition: function(ease) {
        var me = this;
        var model = me._model;
        var start = me._start;
        var view = me._view;

        // No animation -> No Transition
        if (!model || ease === 1) {
            me._view = Assign({}, model);
            me._start = null;
            return me;
        }

        if (!view) {
            view = me._view = {};
        }

        if (!start) {
            start = me._start = {};
        }

        interpolate(start, view, model, ease);

        return me;
    },

    tooltipPosition: function() {
        return {
            x: this._model.x,
            y: this._model.y
        };
    },

    hasValue: function() {
        return helpers.isNumber(this._model.x) && helpers.isNumber(this._model.y);
    }
});

Element.extend = helpers.inherits;

var exports$3 = Element.extend({
    chart: null, // the animation associated chart instance
    currentStep: 0, // the current animation step
    numSteps: 60, // default number of steps
    easing: '', // the easing to use for this animation
    render: null, // render function used by the animation service

    onAnimationProgress: null, // user specified callback to fire on each step of the animation
    onAnimationComplete: null, // user specified callback to fire when the animation finishes
});

var core_animation = exports$3;

Merge(core_defaults, {
    global: {
        animation: {
            duration: 1000,
            easing: 'easeOutQuart',
            onProgress: noop,
            onComplete: noop,
        },
    },
});

var core_animations = {
    animations: [],
    request: null,

    /**
     * @param {Chart} chart - The chart to animate.
     * @param {Chart.Animation} animation - The animation that we will animate.
     * @param {number} duration - The animation duration in ms.
     * @param {boolean} lazy - if true, the chart is not marked as animating to enable more responsive interactions
     */
    addAnimation: function(chart, animation, duration, lazy) {
        var animations = this.animations;
        var i, ilen;

        animation.chart = chart;
        animation.startTime = Date.now();
        animation.duration = duration;

        if (!lazy)
            chart.animating = true;

        for (i = 0, ilen = animations.length; i < ilen; ++i) {
            if (animations[i].chart === chart) {
                animations[i] = animation;
                return;
            }
        }

        animations.push(animation);

        // If there are no animations queued, manually kickstart a digest, for lack of a better word
        if (animations.length === 1)
            this.requestAnimationFrame();
    },

    cancelAnimation: function(chart) {
        var index = helpers.findIndex(this.animations, function(animation) {
            return animation.chart === chart;
        });

        if (index !== -1) {
            this.animations.splice(index, 1);
            chart.animating = false;
        }
    },

    requestAnimationFrame: function() {
        var me = this;
        if (me.request === null) {
            // Skip animation frame requests until the active one is executed.
            // This can happen when processing mouse events, e.g. 'mousemove'
            // and 'mouseout' events will trigger multiple renders.
            me.request = AnimationFrame(() => {
                me.request = null;
                me.startDigest();
            });
        }
    },

    /**
     * @private
     */
    startDigest: function() {
        var me = this;

        me.advance();

        // Do we have more stuff to animate?
        if (me.animations.length > 0) {
            me.requestAnimationFrame();
        }
    },

    /**
     * @private
     */
    advance: function() {
        var animations = this.animations;
        var animation, chart, numSteps, nextStep;
        var i = 0;

        // 1 animation per chart, so we are looping charts here
        while (i < animations.length) {
            animation = animations[i];
            chart = animation.chart;
            numSteps = animation.numSteps;

            // Make sure that currentStep starts at 1
            // https://github.com/chartjs/Chart.js/issues/6104
            nextStep = Floor((Date.now() - animation.startTime) / animation.duration * numSteps) + 1;
            animation.currentStep = Min(nextStep, numSteps);

            helpers.callback(animation.render, [chart, animation], chart);
            helpers.callback(animation.onAnimationProgress, [animation], chart);

            if (animation.currentStep >= numSteps) {
                helpers.callback(animation.onAnimationComplete, [animation], chart);
                chart.animating = false;
                animations.splice(i, 1);
            } else {
                ++i;
            }
        }
    }
};

var resolve = helpers.options.resolve;

var arrayEvents = ['push', 'pop', 'shift', 'splice', 'unshift'];

/**
 * Hooks the array methods that add or remove values ('push', pop', 'shift', 'splice',
 * 'unshift') and notify the listener AFTER the array has been altered. Listeners are
 * called on the 'onData*' callbacks (e.g. onDataPush, etc.) with same arguments.
 */
function listenArrayEvents(array, listener) {
    if (array._chartjs) {
        array._chartjs.listeners.push(listener);
        return;
    }

    Object.defineProperty(array, '_chartjs', {
        configurable: true,
        enumerable: false,
        value: {
            listeners: [listener]
        }
    });

    arrayEvents.forEach(function(key) {
        var method = 'onData' + key.charAt(0).toUpperCase() + key.slice(1);
        var base = array[key];

        Object.defineProperty(array, key, {
            configurable: true,
            enumerable: false,
            value: function() {
                var args = Array.prototype.slice.call(arguments);
                var res = base.apply(this, args);

                helpers.each(array._chartjs.listeners, function(object) {
                    if (IsFunction(object[method]))
                        object[method].apply(object, args);
                });

                return res;
            }
        });
    });
}

/**
 * Removes the given array event listener and cleanup extra attached properties (such as
 * the _chartjs stub and overridden methods) if array doesn't have any more listeners.
 */
function unlistenArrayEvents(array, listener) {
    var stub = array._chartjs;
    if (!stub) {
        return;
    }

    var listeners = stub.listeners;
    var index = listeners.indexOf(listener);
    if (index !== -1) {
        listeners.splice(index, 1);
    }

    if (listeners.length > 0) {
        return;
    }

    arrayEvents.forEach(function(key) {
        delete array[key];
    });

    delete array._chartjs;
}

// Base class for all dataset controllers (line, bar, etc)
var DatasetController = function(chart, datasetIndex) {
    this.initialize(chart, datasetIndex);
};

Assign(DatasetController.prototype, {

    /**
     * Element type used to generate a meta dataset (e.g. Chart.element.Line).
     * @type {Chart.core.element}
     */
    datasetElementType: null,

    /**
     * Element type used to generate a meta data (e.g. Chart.element.Point).
     * @type {Chart.core.element}
     */
    dataElementType: null,

    /**
     * Dataset element option keys to be resolved in _resolveDatasetElementOptions.
     * A derived controller may override this to resolve controller-specific options.
     * The keys defined here are for backward compatibility for legend styles.
     * @private
     */
    _datasetElementOptions: [
        'backgroundColor',
        'borderCapStyle',
        'borderColor',
        'borderDash',
        'borderDashOffset',
        'borderJoinStyle',
        'borderWidth'
    ],

    /**
     * Data element option keys to be resolved in _resolveDataElementOptions.
     * A derived controller may override this to resolve controller-specific options.
     * The keys defined here are for backward compatibility for legend styles.
     * @private
     */
    _dataElementOptions: [
        'backgroundColor',
        'borderColor',
        'borderWidth',
        'pointStyle'
    ],

    initialize: function(chart, datasetIndex) {
        var me = this;
        me.chart = chart;
        me.index = datasetIndex;
        me.linkScales();
        me.addElements();
    },

    updateIndex: function(datasetIndex) {
        this.index = datasetIndex;
    },

    linkScales: function() {
        var me = this;
        var meta = me.getMeta();
        var chart = me.chart;
        var scales = chart.scales;
        var dataset = me.getDataset();
        var scalesOpts = chart.options.scales;

        if (meta.xAxisID === null || !(meta.xAxisID in scales) || dataset.xAxisID) {
            meta.xAxisID = dataset.xAxisID || scalesOpts.xAxes[0].id;
        }
        if (meta.yAxisID === null || !(meta.yAxisID in scales) || dataset.yAxisID) {
            meta.yAxisID = dataset.yAxisID || scalesOpts.yAxes[0].id;
        }
    },

    getDataset: function() {
        return this.chart.data.datasets[this.index];
    },

    getMeta: function() {
        return this.chart.getDatasetMeta(this.index);
    },

    getScaleForId: function(scaleID) {
        return this.chart.scales[scaleID];
    },

    /**
     * @private
     */
    _getValueScaleId: function() {
        return this.getMeta().yAxisID;
    },

    /**
     * @private
     */
    _getIndexScaleId: function() {
        return this.getMeta().xAxisID;
    },

    /**
     * @private
     */
    _getValueScale: function() {
        return this.getScaleForId(this._getValueScaleId());
    },

    /**
     * @private
     */
    _getIndexScale: function() {
        return this.getScaleForId(this._getIndexScaleId());
    },

    reset: function() {
        this._update(true);
    },

    /**
     * @private
     */
    destroy: function() {
        if (this._data) {
            unlistenArrayEvents(this._data, this);
        }
    },

    createMetaDataset: function() {
        var me = this;
        var type = me.datasetElementType;
        return type && new type({
            _chart: me.chart,
            _datasetIndex: me.index
        });
    },

    createMetaData: function(index) {
        var me = this;
        var type = me.dataElementType;
        return type && new type({
            _chart: me.chart,
            _datasetIndex: me.index,
            _index: index
        });
    },

    addElements: function() {
        var me = this;
        var meta = me.getMeta();
        var data = me.getDataset().data || [];
        var metaData = meta.data;
        var i, ilen;

        for (i = 0, ilen = data.length; i < ilen; ++i) {
            metaData[i] = metaData[i] || me.createMetaData(i);
        }

        meta.dataset = meta.dataset || me.createMetaDataset();
    },

    addElementAndReset: function(index) {
        var element = this.createMetaData(index);
        this.getMeta().data.splice(index, 0, element);
        this.updateElement(element, index, true);
    },

    buildOrUpdateElements: function() {
        var me = this;
        var dataset = me.getDataset();
        var data = dataset.data || (dataset.data = []);

        // In order to correctly handle data addition/deletion animation (an thus simulate
        // real-time charts), we need to monitor these data modifications and synchronize
        // the internal meta data accordingly.
        if (me._data !== data) {
            if (me._data) {
                // This case happens when the user replaced the data array instance.
                unlistenArrayEvents(me._data, me);
            }

            if (data && Object.isExtensible(data)) {
                listenArrayEvents(data, me);
            }
            me._data = data;
        }

        // Re-sync meta data in case the user replaced the data array or if we missed
        // any updates and so make sure that we handle number of datapoints changing.
        me.resyncElements();
    },

    /**
     * Returns the merged user-supplied and default dataset-level options
     * @private
     */
    _configure: function() {
        var me = this;
        me._config = Merge({}, me.getDataset(), 0);
        // me._config = helpers.merge({}, [
        //     me.chart.options.datasets.line,
        //     me.getDataset(),
        // ], {
        //     merger: function(key, target, source) {
        //         if (key !== '_meta' && key !== 'data') {
        //             helpers._merger(key, target, source);
        //         }
        //     }
        // });
    },

    _update: function(reset) {
        var me = this;
        me._configure();
        me._cachedDataOpts = null;
        me.update(reset);
    },

    update: noop,

    transition: function(easingValue) {
        var meta = this.getMeta();
        var elements = meta.data || [];
        var ilen = elements.length;
        var i = 0;

        for (; i < ilen; ++i) {
            elements[i].transition(easingValue);
        }

        if (meta.dataset) {
            meta.dataset.transition(easingValue);
        }
    },

    draw: function() {
        var meta = this.getMeta();
        var elements = meta.data || [];
        var ilen = elements.length;
        var i = 0;

        if (meta.dataset) {
            meta.dataset.draw();
        }

        for (; i < ilen; ++i) {
            elements[i].draw();
        }
    },

    /**
     * Returns a set of predefined style properties that should be used to represent the dataset
     * or the data if the index is specified
     * @param {number} index - data index
     * @returns {IStyleInterface} style object
     */
    getStyle: function(index) {
        var me = this;
        var meta = me.getMeta();
        var dataset = meta.dataset;
        var style;

        me._configure();
        if (dataset && index === undefined) {
            style = me._resolveDatasetElementOptions(dataset || {});
        } else {
            index = index || 0;
            style = me._resolveDataElementOptions(meta.data[index] || {}, index);
        }

        if (style.fill === false || style.fill === null) {
            style.backgroundColor = style.borderColor;
        }

        return style;
    },

    /**
     * @private
     */
    _resolveDatasetElementOptions: function(element, hover) {
        var me = this;
        var chart = me.chart;
        var datasetOpts = me._config;
        var custom = element.custom || {};
        var options = chart.options.elements[me.datasetElementType.prototype.line] || {};
        var elementOptions = me._datasetElementOptions;
        var values = {};
        var i, ilen, key, readKey;

        // Scriptable options
        var context = {
            chart: chart,
            dataset: me.getDataset(),
            datasetIndex: me.index,
            hover: hover
        };

        for (i = 0, ilen = elementOptions.length; i < ilen; ++i) {
            key = elementOptions[i];
            readKey = hover ? 'hover' + key.charAt(0).toUpperCase() + key.slice(1) : key;
            values[key] = resolve([
                custom[readKey],
                datasetOpts[readKey],
                options[readKey]
            ], context);
        }

        return values;
    },

    /**
     * @private
     */
    _resolveDataElementOptions: function(element, index) {
        var me = this;
        var custom = element && element.custom;
        var cached = me._cachedDataOpts;
        if (cached && !custom) {
            return cached;
        }
        var chart = me.chart;
        var datasetOpts = me._config;
        var options = chart.options.elements[me.dataElementType.prototype.line] || {};
        var elementOptions = me._dataElementOptions;
        var values = {};

        // Scriptable options
        var context = {
            chart: chart,
            dataIndex: index,
            dataset: me.getDataset(),
            datasetIndex: me.index
        };

        // `resolve` sets cacheable to `false` if any option is indexed or scripted
        var info = {cacheable: !custom};

        var keys, i, ilen, key;

        custom = custom || {};

        if (IsArray(elementOptions)) {
            for (i = 0, ilen = elementOptions.length; i < ilen; ++i) {
                key = elementOptions[i];
                values[key] = resolve([
                    custom[key],
                    datasetOpts[key],
                    options[key]
                ], context, index, info);
            }
        } else {
            keys = Keys(elementOptions);
            for (i = 0, ilen = keys.length; i < ilen; ++i) {
                key = keys[i];
                values[key] = resolve([
                    custom[key],
                    datasetOpts[elementOptions[key]],
                    datasetOpts[key],
                    options[key]
                ], context, index, info);
            }
        }

        if (info.cacheable) {
            me._cachedDataOpts = Object.freeze(values);
        }

        return values;
    },

    removeHoverStyle: function(element) {
        Merge(element._model, element.$previousStyle || {});
        delete element.$previousStyle;
    },

    setHoverStyle: function(element) {
        var dataset = this.chart.data.datasets[element._datasetIndex];
        var index = element._index;
        var custom = element.custom || {};
        var model = element._model;
        var getHoverColor = helpers.getHoverColor;

        element.$previousStyle = {
            backgroundColor: model.backgroundColor,
            borderColor: model.borderColor,
            borderWidth: model.borderWidth
        };

        model.backgroundColor = resolve([custom.hoverBackgroundColor, dataset.hoverBackgroundColor, getHoverColor(model.backgroundColor)], undefined, index);
        model.borderColor = resolve([custom.hoverBorderColor, dataset.hoverBorderColor, getHoverColor(model.borderColor)], undefined, index);
        model.borderWidth = resolve([custom.hoverBorderWidth, dataset.hoverBorderWidth, model.borderWidth], undefined, index);
    },

    /**
     * @private
     */
    _removeDatasetHoverStyle: function() {
        var element = this.getMeta().dataset;

        if (element) {
            this.removeHoverStyle(element);
        }
    },

    /**
     * @private
     */
    _setDatasetHoverStyle: function() {
        var element = this.getMeta().dataset;
        var prev = {};
        var i, ilen, key, keys, hoverOptions, model;

        if (!element) {
            return;
        }

        model = element._model;
        hoverOptions = this._resolveDatasetElementOptions(element, true);

        keys = Keys(hoverOptions);
        for (i = 0, ilen = keys.length; i < ilen; ++i) {
            key = keys[i];
            prev[key] = model[key];
            model[key] = hoverOptions[key];
        }

        element.$previousStyle = prev;
    },

    /**
     * @private
     */
    resyncElements: function() {
        var me = this;
        var meta = me.getMeta();
        var data = me.getDataset().data;
        var numMeta = meta.data.length;
        var numData = data.length;

        if (numData < numMeta) {
            meta.data.splice(numData, numMeta - numData);
        } else if (numData > numMeta) {
            me.insertElements(numMeta, numData - numMeta);
        }
    },

    /**
     * @private
     */
    insertElements: function(start, count) {
        for (var i = 0; i < count; ++i) {
            this.addElementAndReset(start + i);
        }
    },

    /**
     * @private
     */
    onDataPush: function() {
        var count = arguments.length;
        this.insertElements(this.getDataset().data.length - count, count);
    },

    /**
     * @private
     */
    onDataPop: function() {
        this.getMeta().data.pop();
    },

    /**
     * @private
     */
    onDataShift: function() {
        this.getMeta().data.shift();
    },

    /**
     * @private
     */
    onDataSplice: function(start, count) {
        this.getMeta().data.splice(start, count);
        this.insertElements(start, arguments.length - 2);
    },

    /**
     * @private
     */
    onDataUnshift: function() {
        this.insertElements(0, arguments.length);
    }
});

DatasetController.extend = helpers.inherits;

var core_datasetController = DatasetController;

Merge(core_defaults, {
    global: {
        elements: {
            arc: {
                backgroundColor: core_defaults.global.defaultColor,
                borderColor: '#fff',
                borderWidth: 2,
                borderAlign: 'center',
            },
        },
    },
});

var defaultColor = core_defaults.global.defaultColor;

Merge(core_defaults, {
    global: {
        elements: {
            line: {
                backgroundColor: defaultColor,
                borderCapStyle: 'butt',
                borderColor: defaultColor,
                borderDash: [],
                borderDashOffset: 0.0,
                borderJoinStyle: 'miter',
                borderWidth: 3,
                capBezierPoints: true,
                fill: true, // do we fill in the area between the line and its base axis
                tension: 0.4,
            },
        },
    },
});

var element_line = Element.extend({
    _type: 'line',

    draw: function() {
        var me = this;
        var vm = me._view;
        var ctx = me._chart.ctx;
        var spanGaps = vm.spanGaps;
        var points = me._children.slice(); // clone array
        var globalDefaults = core_defaults.global;
        var globalOptionLineElements = globalDefaults.elements.line;
        var lastDrawnIndex = -1;
        var closePath = me._loop;
        var index, previous, currentVM;

        if (!points.length) {
            return;
        }

        if (me._loop) {
            for (index = 0; index < points.length; ++index) {
                previous = helpers.previousItem(points, index);
                // If the line has an open path, shift the point array
                if (!points[index]._view.skip && previous._view.skip) {
                    points = points.slice(index).concat(points.slice(0, index));
                    closePath = spanGaps;
                    break;
                }
            }
            // If the line has a close path, add the first point again
            if (closePath) {
                points.push(points[0]);
            }
        }

        ctx.save();

        // Stroke Line Options
        ctx.lineCap = vm.borderCapStyle || globalOptionLineElements.borderCapStyle;

        // IE 9 and 10 do not support line dash
        if (ctx.setLineDash) {
            ctx.setLineDash(vm.borderDash || globalOptionLineElements.borderDash);
        }

        ctx.lineDashOffset = Undefined(vm.borderDashOffset, globalOptionLineElements.borderDashOffset);
        ctx.lineJoin = vm.borderJoinStyle || globalOptionLineElements.borderJoinStyle;
        ctx.lineWidth = Undefined(vm.borderWidth, globalOptionLineElements.borderWidth);
        ctx.strokeStyle = vm.borderColor || globalDefaults.defaultColor;

        // Stroke Line
        ctx.beginPath();

        // First point moves to it's starting position no matter what
        currentVM = points[0]._view;
        if (!currentVM.skip) {
            ctx.moveTo(currentVM.x, currentVM.y);
            lastDrawnIndex = 0;
        }

        for (index = 1; index < points.length; ++index) {
            currentVM = points[index]._view;
            previous = lastDrawnIndex === -1 ? helpers.previousItem(points, index) : points[lastDrawnIndex];

            if (!currentVM.skip) {
                if ((lastDrawnIndex !== (index - 1) && !spanGaps) || lastDrawnIndex === -1) {
                    // There was a gap and this is the first point after the gap
                    ctx.moveTo(currentVM.x, currentVM.y);
                } else {
                    // Line to next point
                    helpers.canvas.lineTo(ctx, previous._view, currentVM);
                }
                lastDrawnIndex = index;
            }
        }

        if (closePath) {
            ctx.closePath();
        }

        ctx.stroke();
        ctx.restore();
    }
});

var defaultColor$1 = core_defaults.global.defaultColor;

Merge(core_defaults, {
    global: {
        elements: {
            point: {
                radius: 3,
                pointStyle: 'circle',
                backgroundColor: defaultColor$1,
                borderColor: defaultColor$1,
                borderWidth: 1,
                // Hover
                hitRadius: 1,
                hoverRadius: 4,
                hoverBorderWidth: 1,
            },
        },
    },
});

function xRange(mouseX) {
    var vm = this._view;
    return vm ? (Abs(mouseX - vm.x) < vm.radius + vm.hitRadius) : false;
}

function yRange(mouseY) {
    var vm = this._view;
    return vm ? (Abs(mouseY - vm.y) < vm.radius + vm.hitRadius) : false;
}

var element_point = Element.extend({
    _type: 'point',

    inRange: function(mouseX, mouseY) {
        var vm = this._view;
        return vm ? ((Pow(mouseX - vm.x, 2) + Pow(mouseY - vm.y, 2)) < Pow(vm.hitRadius + vm.radius, 2)) : false;
    },

    inLabelRange: xRange,
    inXRange: xRange,
    inYRange: yRange,

    getCenterPoint: function() {
        var vm = this._view;
        return {
            x: vm.x,
            y: vm.y
        };
    },

    getArea: function() {
        return PI * Pow(this._view.radius, 2);
    },

    tooltipPosition: function() {
        var vm = this._view;
        return {
            x: vm.x,
            y: vm.y,
            padding: vm.radius + vm.borderWidth
        };
    },

    draw: function(chartArea) {
        var vm = this._view;
        var ctx = this._chart.ctx;
        var pointStyle = vm.pointStyle;
        var rotation = vm.rotation;
        var radius = vm.radius;
        var x = vm.x;
        var y = vm.y;
        var globalDefaults = core_defaults.global;
        var defaultColor = globalDefaults.defaultColor; // eslint-disable-line no-shadow

        if (vm.skip) {
            return;
        }

        // Clipping for Points.
        if (chartArea === undefined || helpers.canvas._isPointInArea(vm, chartArea)) {
            ctx.strokeStyle = vm.borderColor || defaultColor;
            ctx.lineWidth = Undefined(vm.borderWidth, globalDefaults.elements.point.borderWidth);
            ctx.fillStyle = vm.backgroundColor || defaultColor;
            helpers.canvas.drawPoint(ctx, pointStyle, radius, x, y, rotation);
        }
    }
});

var defaultColor$2 = core_defaults.global.defaultColor;

Merge(core_defaults, {
    global: {
        elements: {
            rectangle: {
                backgroundColor: defaultColor$2,
                borderColor: defaultColor$2,
                borderSkipped: 'bottom',
                borderWidth: 0,
            },
        },
    },
});

var elements = {};
var Line = element_line;
var Point = element_point;
elements.Line = Line;
elements.Point = Point;

Merge(core_defaults, {
    global: {
        datasets: {},
    },
});

var resolve$2 = helpers.options.resolve;
var isPointInArea = helpers.canvas._isPointInArea;

Merge(core_defaults, {
    line: {
        showLines: true,
        spanGaps: false,
        hover: {
            mode: 'label',
        },
        scales: {
            xAxes: [{
                type: 'category',
                id: 'x_axis_0',
            }],
            yAxes: [{
                type: 'custom',
                id: 'y_axis_0',
            }],
        },
    },
});

function scaleClip(scale, halfBorderWidth) {
    var tickOpts = scale && scale.options.ticks || {};
    var reverse = tickOpts.reverse;
    var min = tickOpts.min === undefined ? halfBorderWidth : 0;
    var max = tickOpts.max === undefined ? halfBorderWidth : 0;
    return {
        start: reverse ? max : min,
        end: reverse ? min : max
    };
}

function defaultClip(xScale, yScale, borderWidth) {
    var halfBorderWidth = borderWidth / 2;
    var x = scaleClip(xScale, halfBorderWidth);
    var y = scaleClip(yScale, halfBorderWidth);

    return {
        top: y.end,
        right: x.end,
        bottom: y.start,
        left: x.start
    };
}

function toClip(value) {
    var t, r, b, l;

    if (IsObject(value)) {
        t = value.top;
        r = value.right;
        b = value.bottom;
        l = value.left;
    } else {
        t = r = b = l = value;
    }

    return {
        top: t,
        right: r,
        bottom: b,
        left: l
    };
}


var controller_line = core_datasetController.extend({

    datasetElementType: elements.Line,

    dataElementType: elements.Point,

    /**
     * @private
     */
    _datasetElementOptions: [
        'backgroundColor',
        'borderCapStyle',
        'borderColor',
        'borderDash',
        'borderDashOffset',
        'borderJoinStyle',
        'borderWidth',
        'cubicInterpolationMode',
        'fill'
    ],

    /**
     * @private
     */
    _dataElementOptions: {
        backgroundColor: 'pointBackgroundColor',
        borderColor: 'pointBorderColor',
        borderWidth: 'pointBorderWidth',
        hitRadius: 'pointHitRadius',
        hoverBackgroundColor: 'pointHoverBackgroundColor',
        hoverBorderColor: 'pointHoverBorderColor',
        hoverBorderWidth: 'pointHoverBorderWidth',
        hoverRadius: 'pointHoverRadius',
        pointStyle: 'pointStyle',
        radius: 'pointRadius',
        rotation: 'pointRotation'
    },

    update: function(reset) {
        var me = this;
        var meta = me.getMeta();
        var line = meta.dataset;
        var points = meta.data || [];
        var options = me.chart.options;
        var config = me._config;
        var showLine = me._showLine = Undefined(config.showLine, options.showLines);
        var i, ilen;

        me._xScale = me.getScaleForId(meta.xAxisID);
        me._yScale = me.getScaleForId(meta.yAxisID);

        // Update Line
        if (showLine) {
            // Utility
            line._scale = me._yScale;
            line._datasetIndex = me.index;
            // Data
            line._children = points;
            // Model
            line._model = me._resolveDatasetElementOptions(line);

            line.pivot();
        }

        // Update Points
        for (i = 0, ilen = points.length; i < ilen; ++i) {
            me.updateElement(points[i], i, reset);
        }

        if (showLine && line._model.tension !== 0) {
            me.updateBezierControlPoints();
        }

        // Now pivot the point for animation
        for (i = 0, ilen = points.length; i < ilen; ++i) {
            points[i].pivot();
        }
    },

    updateElement: function(point, index, reset) {
        var me = this;
        var meta = me.getMeta();
        var custom = point.custom || {};
        var dataset = me.getDataset();
        var datasetIndex = me.index;
        var value = dataset.data[index];
        var xScale = me._xScale;
        var yScale = me._yScale;
        var lineModel = meta.dataset._model;
        var x, y;

        var options = me._resolveDataElementOptions(point, index);

        x = xScale.getPixelForValue(IsObject(value)? value : NaN, index, datasetIndex);
        y = reset ? yScale.getBasePixel() : me.calculatePointY(value, index, datasetIndex);

        // Utility
        point._xScale = xScale;
        point._yScale = yScale;
        point._options = options;
        point._datasetIndex = datasetIndex;
        point._index = index;

        // Desired view properties
        point._model = {
            x: x,
            y: y,
            skip: custom.skip || isNaN(x) || isNaN(y),
            // Appearance
            radius: options.radius,
            pointStyle: options.pointStyle,
            rotation: options.rotation,
            backgroundColor: options.backgroundColor,
            borderColor: options.borderColor,
            borderWidth: options.borderWidth,
            tension: Undefined(custom.tension, lineModel ? lineModel.tension : 0),
            steppedLine: lineModel ? lineModel.steppedLine : false,
            // Tooltip
            hitRadius: options.hitRadius
        };
    },

    /**
     * @private
     */
    _resolveDatasetElementOptions: function(element) {
        var me = this;
        var config = me._config;
        var custom = element.custom || {};
        var options = me.chart.options;
        var lineOptions = options.elements.line;
        var values = core_datasetController.prototype._resolveDatasetElementOptions.apply(me, arguments);

        // The default behavior of lines is to break at null values, according
        // to https://github.com/chartjs/Chart.js/issues/2435#issuecomment-216718158
        // This option gives lines the ability to span gaps
        values.spanGaps = Undefined(config.spanGaps, options.spanGaps);
        values.tension = Undefined(config.lineTension, lineOptions.tension);
        values.steppedLine = resolve$2([custom.steppedLine, config.steppedLine, lineOptions.stepped]);
        values.clip = toClip(Undefined(config.clip, defaultClip(me._xScale, me._yScale, values.borderWidth)));

        return values;
    },

    calculatePointY: function(value, index, datasetIndex) {
        var me = this;
        var yScale = me._yScale;
        return yScale.getPixelForValue(value);
    },

    updateBezierControlPoints: function() {
        var me = this;
        var chart = me.chart;
        var meta = me.getMeta();
        var lineModel = meta.dataset._model;
        var area = chart.chartArea;
        var points = meta.data || [];
        var i, ilen, model, controlPoints;

        // Only consider points that are drawn in case the spanGaps option is used
        if (lineModel.spanGaps) {
            points = points.filter(function(pt) {
                return !pt._model.skip;
            });
        }

        function capControlPoint(pt, min, max) {
            return Max(Min(pt, max), min);
        }

        for (i = 0, ilen = points.length; i < ilen; ++i) {
            model = points[i]._model;
            controlPoints = helpers.splineCurve(
                helpers.previousItem(points, i)._model,
                model,
                helpers.nextItem(points, i)._model,
                lineModel.tension
            );
            model.controlPointPreviousX = controlPoints.previous.x;
            model.controlPointPreviousY = controlPoints.previous.y;
            model.controlPointNextX = controlPoints.next.x;
            model.controlPointNextY = controlPoints.next.y;
        }

        if (chart.options.elements.line.capBezierPoints) {
            for (i = 0, ilen = points.length; i < ilen; ++i) {
                model = points[i]._model;
                if (isPointInArea(model, area)) {
                    if (i > 0 && isPointInArea(points[i - 1]._model, area)) {
                        model.controlPointPreviousX = capControlPoint(model.controlPointPreviousX, area.left, area.right);
                        model.controlPointPreviousY = capControlPoint(model.controlPointPreviousY, area.top, area.bottom);
                    }
                    if (i < points.length - 1 && isPointInArea(points[i + 1]._model, area)) {
                        model.controlPointNextX = capControlPoint(model.controlPointNextX, area.left, area.right);
                        model.controlPointNextY = capControlPoint(model.controlPointNextY, area.top, area.bottom);
                    }
                }
            }
        }
    },

    draw: function() {
        var me = this;
        var chart = me.chart;
        var meta = me.getMeta();
        var points = meta.data || [];
        var area = chart.chartArea;
        var canvas = chart.canvas;
        var i = 0;
        var ilen = points.length;
        var clip;

        if (me._showLine) {
            clip = meta.dataset._model.clip;

            helpers.canvas.clipArea(chart.ctx, {
                left: clip.left === false ? 0 : area.left - clip.left,
                right: clip.right === false ? canvas.width : area.right + clip.right,
                top: clip.top === false ? 0 : area.top - clip.top,
                bottom: clip.bottom === false ? canvas.height : area.bottom + clip.bottom
            });

            meta.dataset.draw();

            helpers.canvas.unclipArea(chart.ctx);
        }

        // Draw the points
        for (; i < ilen; ++i) {
            points[i].draw(area);
        }
    },

    /**
     * @protected
     */
    setHoverStyle: function(point) {
        var model = point._model;
        var options = point._options;
        var getHoverColor = helpers.getHoverColor;

        point.$previousStyle = {
            backgroundColor: model.backgroundColor,
            borderColor: model.borderColor,
            borderWidth: model.borderWidth,
            radius: model.radius
        };

        model.backgroundColor = Undefined(options.hoverBackgroundColor, getHoverColor(options.backgroundColor));
        model.borderColor = Undefined(options.hoverBorderColor, getHoverColor(options.borderColor));
        model.borderWidth = Undefined(options.hoverBorderWidth, options.borderWidth);
        model.radius = Undefined(options.hoverRadius, options.radius);
    },
});

// NOTE export a map in which the key represents the controller type, not
// the class, and so must be CamelCase in order to be correctly retrieved
// by the controller in core.controller.js (`controllers[meta.type]`).

var controllers = {
    line: controller_line,
};

/**
 * Helper function to get relative position for an event
 * @param {Event|IEvent} event - The event to get the position for
 * @param {Chart} chart - The chart
 * @returns {Object} the event position
 */
function getRelativePosition(e, chart) {
    if (e.native) {
        return {
            x: e.x,
            y: e.y
        };
    }

    return helpers.getRelativePosition(e, chart);
}

/**
 * Helper function to traverse all of the visible elements in the chart
 * @param {Chart} chart - the chart
 * @param {Function} handler - the callback to execute for each visible item
 */
function parseVisibleItems(chart, handler) {
    var metasets = chart._getSortedVisibleDatasetMetas();
    var metadata, i, j, ilen, jlen, element;

    for (i = 0, ilen = metasets.length; i < ilen; ++i) {
        metadata = metasets[i].data;
        for (j = 0, jlen = metadata.length; j < jlen; ++j) {
            element = metadata[j];
            let view = element._view;
            if (view && !view.skip) {
                handler(element);
            }
        }
    }
}

/**
 * Helper function to get the items that intersect the event position
 * @param {Array<ChartElement>} items - elements to filter
 * @param {Object} position - the point to be nearest to
 * @returns {Array<ChartElement>} the nearest items
 */
function getIntersectItems(chart, position) {
    var elements = [];

    parseVisibleItems(chart, function(element) {
        if (element.inRange(position.x, position.y)) {
            elements.push(element);
        }
    });

    return elements;
}

/**
 * Helper function to get the items nearest to the event position considering all visible items in teh chart
 * @param {Chart} chart - the chart to look at elements from
 * @param {object} position - the point to be nearest to
 * @param {boolean} intersect - if true, only consider items that intersect the position
 * @param {Function} distanceMetric - function to provide the distance between points
 * @returns {Array<ChartElement>} the nearest items
 */
function getNearestItems(chart, position, intersect, distanceMetric) {
    var minDistance = Number.POSITIVE_INFINITY;
    var nearestItems = [];

    parseVisibleItems(chart, function(element) {
        if (intersect && !element.inRange(position.x, position.y)) {
            return;
        }

        var center = element.getCenterPoint();
        var distance = distanceMetric(position, center);
        if (distance < minDistance) {
            nearestItems = [element];
            minDistance = distance;
        } else if (distance === minDistance) {
            // Can have multiple items at the same distance in which case we sort by size
            nearestItems.push(element);
        }
    });

    return nearestItems;
}

/**
 * Get a distance metric function for two points based on the
 * axis mode setting
 * @param {string} axis - the axis mode. x|y|xy
 */
function getDistanceMetricForAxis(axis) {
    var useX = axis.indexOf('x') !== -1;
    var useY = axis.indexOf('y') !== -1;

    return function(pt1, pt2) {
        var deltaX = useX ? Abs(pt1.x - pt2.x) : 0;
        var deltaY = useY ? Abs(pt1.y - pt2.y) : 0;
        return Sqrt(Pow(deltaX, 2) + Pow(deltaY, 2));
    };
}

function indexMode(chart, e, options) {
    var position = getRelativePosition(e, chart);
    // Default axis for index mode is 'x' to match old behaviour
    options.axis = options.axis || 'x';
    var distanceMetric = getDistanceMetricForAxis(options.axis);
    var items = options.intersect ? getIntersectItems(chart, position) : getNearestItems(chart, position, false, distanceMetric);
    var elements = [];

    if (!items.length) {
        return [];
    }

    chart._getSortedVisibleDatasetMetas().forEach(function(meta) {
        var element = meta.data[items[0]._index];

        // don't count items that are skipped (null data)
        if (element && element._view && !element._view.skip)
            elements.push(element);
    });

    return elements;
}

/**
 * @interface IInteractionOptions
 */
/**
 * If true, only consider items that intersect the point
 * @name IInterfaceOptions#boolean
 * @type Boolean
 */

/**
 * Contains interaction related functions
 * @namespace Chart.Interaction
 */
var core_interaction = {
    // Helper function for different modes
    modes: {
        single: function(chart, e) {
            var position = getRelativePosition(e, chart);
            var elements = [];

            parseVisibleItems(chart, function(element) {
                if (element.inRange(position.x, position.y)) {
                    elements.push(element);
                    return elements;
                }
            });

            return elements.slice(0, 1);
        },

        /**
         * Returns items at the same index. If the options.intersect parameter is true, we only return items if we intersect something
         * If the options.intersect mode is false, we find the nearest item and return the items at the same index as that item
         * @function Chart.Interaction.modes.index
         * @since v2.4.0
         * @param {Chart} chart - the chart we are returning items from
         * @param {Event} e - the event we are find things at
         * @param {IInteractionOptions} options - options to use during interaction
         * @returns {Array<ChartElement>} Array of elements that are under the point. If none are found, an empty array is returned
         */
        index: indexMode,

        /**
         * Returns items in the same dataset. If the options.intersect parameter is true, we only return items if we intersect something
         * If the options.intersect is false, we find the nearest item and return the items in that dataset
         * @function Chart.Interaction.modes.dataset
         * @param {Chart} chart - the chart we are returning items from
         * @param {Event} e - the event we are find things at
         * @param {IInteractionOptions} options - options to use during interaction
         * @returns {Array<ChartElement>} Array of elements that are under the point. If none are found, an empty array is returned
         */
        dataset: function(chart, e, options) {
            var position = getRelativePosition(e, chart);
            options.axis = options.axis || 'xy';
            var distanceMetric = getDistanceMetricForAxis(options.axis);
            var items = options.intersect ? getIntersectItems(chart, position) : getNearestItems(chart, position, false, distanceMetric);

            if (items.length > 0) {
                items = chart.getDatasetMeta(items[0]._datasetIndex).data;
            }

            return items;
        },

        /**
         * Point mode returns all elements that hit test based on the event position
         * of the event
         * @function Chart.Interaction.modes.intersect
         * @param {Chart} chart - the chart we are returning items from
         * @param {Event} e - the event we are find things at
         * @returns {Array<ChartElement>} Array of elements that are under the point. If none are found, an empty array is returned
         */
        point: function(chart, e) {
            var position = getRelativePosition(e, chart);
            return getIntersectItems(chart, position);
        },

        /**
         * nearest mode returns the element closest to the point
         * @function Chart.Interaction.modes.intersect
         * @param {Chart} chart - the chart we are returning items from
         * @param {Event} e - the event we are find things at
         * @param {IInteractionOptions} options - options to use
         * @returns {Array<ChartElement>} Array of elements that are under the point. If none are found, an empty array is returned
         */
        nearest: function(chart, e, options) {
            var position = getRelativePosition(e, chart);
            options.axis = options.axis || 'xy';
            var distanceMetric = getDistanceMetricForAxis(options.axis);
            return getNearestItems(chart, position, options.intersect, distanceMetric);
        },

        /**
         * x mode returns the elements that hit-test at the current x coordinate
         * @function Chart.Interaction.modes.x
         * @param {Chart} chart - the chart we are returning items from
         * @param {Event} e - the event we are find things at
         * @param {IInteractionOptions} options - options to use
         * @returns {Array<ChartElement>} Array of elements that are under the point. If none are found, an empty array is returned
         */
        x: function(chart, e, options) {
            var position = getRelativePosition(e, chart);
            var items = [];
            var intersectsItem = false;

            parseVisibleItems(chart, function(element) {
                if (element.inXRange(position.x)) {
                    items.push(element);
                }

                if (element.inRange(position.x, position.y)) {
                    intersectsItem = true;
                }
            });

            // If we want to trigger on an intersect and we don't have any items
            // that intersect the position, return nothing
            if (options.intersect && !intersectsItem) {
                items = [];
            }
            return items;
        },

        /**
         * y mode returns the elements that hit-test at the current y coordinate
         * @function Chart.Interaction.modes.y
         * @param {Chart} chart - the chart we are returning items from
         * @param {Event} e - the event we are find things at
         * @param {IInteractionOptions} options - options to use
         * @returns {Array<ChartElement>} Array of elements that are under the point. If none are found, an empty array is returned
         */
        y: function(chart, e, options) {
            var position = getRelativePosition(e, chart);
            var items = [];
            var intersectsItem = false;

            parseVisibleItems(chart, function(element) {
                if (element.inYRange(position.y)) {
                    items.push(element);
                }

                if (element.inRange(position.x, position.y)) {
                    intersectsItem = true;
                }
            });

            // If we want to trigger on an intersect and we don't have any items
            // that intersect the position, return nothing
            if (options.intersect && !intersectsItem) {
                items = [];
            }
            return items;
        }
    }
};

var extend = helpers.extend;

function filterByPosition(array, position) {
    return helpers.where(array, function(v) {
        return v.pos === position;
    });
}

function sortByWeight(array, reverse) {
    return array.sort(function(a, b) {
        var v0 = reverse ? b : a;
        var v1 = reverse ? a : b;
        return v0.weight === v1.weight ?
            v0.index - v1.index :
            v0.weight - v1.weight;
    });
}

function wrapBoxes(boxes) {
    var layoutBoxes = [];
    var i, ilen, box;

    for (i = 0, ilen = (boxes || []).length; i < ilen; ++i) {
        box = boxes[i];
        layoutBoxes.push({
            index: i,
            box: box,
            pos: box.position,
            horizontal: box.isHorizontal(),
            weight: box.weight
        });
    }
    return layoutBoxes;
}

function setLayoutDims(layouts, params) {
    var i, ilen, layout;
    for (i = 0, ilen = layouts.length; i < ilen; ++i) {
        layout = layouts[i];
        // store width used instead of chartArea.w in fitBoxes
        layout.width = layout.horizontal
            ? layout.box.fullWidth && params.availableWidth
            : params.vBoxMaxWidth;
        // store height used instead of chartArea.h in fitBoxes
        layout.height = layout.horizontal && params.hBoxMaxHeight;
    }
}

function buildLayoutBoxes(boxes) {
    var layoutBoxes = wrapBoxes(boxes);
    var left = sortByWeight(filterByPosition(layoutBoxes, 'left'), true);
    var right = sortByWeight(filterByPosition(layoutBoxes, 'right'));
    var top = sortByWeight(filterByPosition(layoutBoxes, 'top'), true);
    var bottom = sortByWeight(filterByPosition(layoutBoxes, 'bottom'));

    return {
        leftAndTop: left.concat(top),
        rightAndBottom: right.concat(bottom),
        chartArea: filterByPosition(layoutBoxes, 'chartArea'),
        vertical: left.concat(right),
        horizontal: top.concat(bottom)
    };
}

function getCombinedMax(maxPadding, chartArea, a, b) {
    return Max(maxPadding[a], chartArea[a]) + Max(maxPadding[b], chartArea[b]);
}

function updateDims(chartArea, params, layout) {
    var box = layout.box;
    var maxPadding = chartArea.maxPadding;
    var newWidth, newHeight;

    if (layout.size) {
        // this layout was already counted for, lets first reduce old size
        chartArea[layout.pos] -= layout.size;
    }
    layout.size = layout.horizontal ? box.height : box.width;
    chartArea[layout.pos] += layout.size;

    if (box.getPadding) {
        var boxPadding = box.getPadding();
        maxPadding.top = Max(maxPadding.top, boxPadding.top);
        maxPadding.left = Max(maxPadding.left, boxPadding.left);
        maxPadding.bottom = Max(maxPadding.bottom, boxPadding.bottom);
        maxPadding.right = Max(maxPadding.right, boxPadding.right);
    }

    newWidth = params.outerWidth - getCombinedMax(maxPadding, chartArea, 'left', 'right');
    newHeight = params.outerHeight - getCombinedMax(maxPadding, chartArea, 'top', 'bottom');

    if (newWidth !== chartArea.w || newHeight !== chartArea.h) {
        chartArea.w = newWidth;
        chartArea.h = newHeight;

        // return true if chart area changed in layout's direction
        return layout.horizontal ? newWidth !== chartArea.w : newHeight !== chartArea.h;
    }
}

function handleMaxPadding(chartArea) {
    var maxPadding = chartArea.maxPadding;

    function updatePos(pos) {
        var change = Max(maxPadding[pos] - chartArea[pos], 0);
        chartArea[pos] += change;
        return change;
    }
    chartArea.y += updatePos('top');
    chartArea.x += updatePos('left');
    updatePos('right');
    updatePos('bottom');
}

function getMargins(horizontal, chartArea) {
    var maxPadding = chartArea.maxPadding;

    function marginForPositions(positions) {
        var margin = {left: 0, top: 0, right: 0, bottom: 0};
        positions.forEach(function(pos) {
            margin[pos] = Max(chartArea[pos], maxPadding[pos]);
        });
        return margin;
    }

    return horizontal
        ? marginForPositions(['left', 'right'])
        : marginForPositions(['top', 'bottom']);
}

function fitBoxes(boxes, chartArea, params) {
    var refitBoxes = [];
    var refit, changed;

    for (let layout of boxes) {
        let box = layout.box;

        box.update(
            layout.width || chartArea.w,
            layout.height || chartArea.h,
            getMargins(layout.horizontal, chartArea)
        );
        if (updateDims(chartArea, params, layout)) {
            changed = true;
            if (refitBoxes.length) {
                // Dimensions changed and there were non full width boxes before this
                // -> we have to refit those
                refit = true;
            }
        }
        if (!box.fullWidth) { // fullWidth boxes don't need to be re-fitted in any case
            refitBoxes.push(layout);
        }
    }

    return refit ? fitBoxes(refitBoxes, chartArea, params) || changed : changed;
}

function placeBoxes(boxes, chartArea, params) {
    var userPadding = params.padding;
    var x = chartArea.x;
    var y = chartArea.y;
    var i, ilen, layout, box;

    for (i = 0, ilen = boxes.length; i < ilen; ++i) {
        layout = boxes[i];
        box = layout.box;
        if (layout.horizontal) {
            box.left = box.fullWidth ? userPadding.left : chartArea.left;
            box.right = box.fullWidth ? params.outerWidth - userPadding.right : chartArea.left + chartArea.w;
            box.top = y;
            box.bottom = y + box.height;
            box.width = box.right - box.left;
            y = box.bottom;
        } else {
            box.left = x;
            box.right = x + box.width;
            box.top = chartArea.top;
            box.bottom = chartArea.top + chartArea.h;
            box.height = box.bottom - box.top;
            x = box.right;
        }
    }

    chartArea.x = x;
    chartArea.y = y;
}

Merge(core_defaults, {
    global: {
        layout: {
            padding: {
                top: 0,
                right: 0,
                bottom: 0,
                left: 0,
            },
        },
    },
});

/**
 * @interface ILayoutItem
 * @prop {string} position - The position of the item in the chart layout. Possible values are
 * 'left', 'top', 'right', 'bottom', and 'chartArea'
 * @prop {number} weight - The weight used to sort the item. Higher weights are further away from the chart area
 * @prop {boolean} fullWidth - if true, and the item is horizontal, then push vertical boxes down
 * @prop {Function} isHorizontal - returns true if the layout item is horizontal (ie. top or bottom)
 * @prop {Function} update - Takes two parameters: width and height. Returns size of item
 * @prop {Function} getPadding -  Returns an object with padding on the edges
 * @prop {number} width - Width of item. Must be valid after update()
 * @prop {number} height - Height of item. Must be valid after update()
 * @prop {number} left - Left edge of the item. Set by layout system and cannot be used in update
 * @prop {number} top - Top edge of the item. Set by layout system and cannot be used in update
 * @prop {number} right - Right edge of the item. Set by layout system and cannot be used in update
 * @prop {number} bottom - Bottom edge of the item. Set by layout system and cannot be used in update
 */

// The layout service is very self explanatory.  It's responsible for the layout within a chart.
// Scales, Legends and Plugins all rely on the layout service and can easily register to be placed anywhere they need
// It is this service's responsibility of carrying out that layout.
var core_layouts = {
    defaults: {},

    /**
     * Register a box to a chart.
     * A box is simply a reference to an object that requires layout. eg. Scales, Legend, Title.
     * @param {Chart} chart - the chart to use
     * @param {ILayoutItem} item - the item to add to be layed out
     */
    addBox: function(chart, item) {
        if (!chart.boxes) {
            chart.boxes = [];
        }

        // initialize item with default values
        item.fullWidth = item.fullWidth || false;
        item.position = item.position || 'top';
        item.weight = item.weight || 0;
        item._layers = item._layers || function() {
            return [{
                z: 0,
                draw: function() {
                    item.draw.apply(item, arguments);
                }
            }];
        };

        chart.boxes.push(item);
    },

    /**
     * Remove a layoutItem from a chart
     * @param {Chart} chart - the chart to remove the box from
     * @param {ILayoutItem} layoutItem - the item to remove from the layout
     */
    removeBox: function(chart, layoutItem) {
        var index = chart.boxes ? chart.boxes.indexOf(layoutItem) : -1;
        if (index !== -1) {
            chart.boxes.splice(index, 1);
        }
    },

    /**
     * Sets (or updates) options on the given `item`.
     * @param {Chart} chart - the chart in which the item lives (or will be added to)
     * @param {ILayoutItem} item - the item to configure with the given options
     * @param {object} options - the new item options.
     */
    configure: function(chart, item, options) {
        var props = ['fullWidth', 'position', 'weight'];
        var ilen = props.length;
        var i = 0;
        var prop;

        for (; i < ilen; ++i) {
            prop = props[i];
            if (options.hasOwnProperty(prop)) {
                item[prop] = options[prop];
            }
        }
    },

    /**
     * Fits boxes of the given chart into the given size by having each box measure itself
     * then running a fitting algorithm
     * @param {Chart} chart - the chart
     * @param {number} width - the width to fit into
     * @param {number} height - the height to fit into
     */
    update: function(chart, width, height) {
        if (!chart) {
            return;
        }

        var layoutOptions = chart.options.layout || {};
        var padding = helpers.options.toPadding(layoutOptions.padding);

        var availableWidth = width - padding.width;
        var availableHeight = height - padding.height;
        var boxes = buildLayoutBoxes(chart.boxes);
        var verticalBoxes = boxes.vertical;
        var horizontalBoxes = boxes.horizontal;

        // Essentially we now have any number of boxes on each of the 4 sides.
        // Our canvas looks like the following.
        // The areas L1 and L2 are the left axes. R1 is the right axis, T1 is the top axis and
        // B1 is the bottom axis
        // There are also 4 quadrant-like locations (left to right instead of clockwise) reserved for chart overlays
        // These locations are single-box locations only, when trying to register a chartArea location that is already taken,
        // an error will be thrown.
        //
        // |----------------------------------------------------|
        // |                  T1 (Full Width)                   |
        // |----------------------------------------------------|
        // |    |    |                 T2                  |    |
        // |    |----|-------------------------------------|----|
        // |    |    | C1 |                           | C2 |    |
        // |    |    |----|                           |----|    |
        // |    |    |                                     |    |
        // | L1 | L2 |           ChartArea (C0)            | R1 |
        // |    |    |                                     |    |
        // |    |    |----|                           |----|    |
        // |    |    | C3 |                           | C4 |    |
        // |    |----|-------------------------------------|----|
        // |    |    |                 B1                  |    |
        // |----------------------------------------------------|
        // |                  B2 (Full Width)                   |
        // |----------------------------------------------------|
        //

        var params = Object.freeze({
            outerWidth: width,
            outerHeight: height,
            padding: padding,
            availableWidth: availableWidth,
            vBoxMaxWidth: availableWidth / 2 / verticalBoxes.length,
            hBoxMaxHeight: availableHeight / 2
        });
        var chartArea = Assign({
            maxPadding: Assign({}, padding),
            w: availableWidth,
            h: availableHeight,
            x: padding.left,
            y: padding.top
        }, padding);

        setLayoutDims(verticalBoxes.concat(horizontalBoxes), params);

        // First fit vertical boxes
        fitBoxes(verticalBoxes, chartArea, params);

        // Then fit horizontal boxes
        if (fitBoxes(horizontalBoxes, chartArea, params)) {
            // if the area changed, re-fit vertical boxes
            fitBoxes(verticalBoxes, chartArea, params);
        }

        handleMaxPadding(chartArea);

        // Finally place the boxes to correct coordinates
        placeBoxes(boxes.leftAndTop, chartArea, params);

        // Move to opposite side of chart
        chartArea.x += chartArea.w;
        chartArea.y += chartArea.h;

        placeBoxes(boxes.rightAndBottom, chartArea, params);

        chart.chartArea = {
            left: chartArea.left,
            top: chartArea.top,
            right: chartArea.left + chartArea.w,
            bottom: chartArea.top + chartArea.h
        };

        // Finally update boxes in chartArea (radial scale for example)
        helpers.each(boxes.chartArea, function(layout) {
            var box = layout.box;
            extend(box, chart.chartArea);
            box.update(chartArea.w, chartArea.h);
        });
    }
};

/**
 * Platform fallback implementation (minimal).
 * @see https://github.com/chartjs/Chart.js/pull/4591#issuecomment-319575939
 */

var platform_basic = {
    acquireContext: function(item) {
        if (item && item.canvas) {
            // Support for any object associated to a canvas (including a context2d)
            item = item.canvas;
        }

        return item && item.getContext('2d') || null;
    }
};

var platform_dom = "/*\n * DOM element rendering detection\n * https://davidwalsh.name/detect-node-insertion\n */\n@keyframes chartjs-render-animation {\n\tfrom { opacity: 0.99; }\n\tto { opacity: 1; }\n}\n\n.chartjs-render-monitor {\n\tanimation: chartjs-render-animation 0.001s;\n}\n\n/*\n * DOM element resizing detection\n * https://github.com/marcj/css-element-queries\n */\n.chartjs-size-monitor,\n.chartjs-size-monitor-expand,\n.chartjs-size-monitor-shrink {\n\tposition: absolute;\n\tdirection: ltr;\n\tleft: 0;\n\ttop: 0;\n\tright: 0;\n\tbottom: 0;\n\toverflow: hidden;\n\tpointer-events: none;\n\tvisibility: hidden;\n\tz-index: -1;\n}\n\n.chartjs-size-monitor-expand > div {\n\tposition: absolute;\n\twidth: 1000000px;\n\theight: 1000000px;\n\tleft: 0;\n\ttop: 0;\n}\n\n.chartjs-size-monitor-shrink > div {\n\tposition: absolute;\n\twidth: 200%;\n\theight: 200%;\n\tleft: 0;\n\ttop: 0;\n}\n";

var platform_dom$1 = /*#__PURE__*/Object.freeze({
// __proto__: null,
'default': platform_dom
});

var stylesheet = getCjsExportFromNamespace(platform_dom$1);

var EXPANDO_KEY = '$chartjs';
var CSS_PREFIX = 'chartjs-';
var CSS_SIZE_MONITOR = CSS_PREFIX + 'size-monitor';
var CSS_RENDER_MONITOR = CSS_PREFIX + 'render-monitor';
var CSS_RENDER_ANIMATION = CSS_PREFIX + 'render-animation';
var ANIMATION_START_EVENTS = ['animationstart', 'webkitAnimationStart'];

/**
 * DOM event types -> Chart.js event types.
 * Note: only events with different types are mapped.
 * @see https://developer.mozilla.org/en-US/docs/Web/Events
 */
var EVENT_TYPES = {
    touchstart: 'mousedown',
    touchmove: 'mousemove',
    touchend: 'mouseup',
    pointerenter: 'mouseenter',
    pointerdown: 'mousedown',
    pointermove: 'mousemove',
    pointerup: 'mouseup',
    pointerleave: 'mouseout',
    pointerout: 'mouseout'
};

/**
 * The "used" size is the final value of a dimension property after all calculations have
 * been performed. This method uses the computed style of `element` but returns undefined
 * if the computed style is not expressed in pixels. That can happen in some cases where
 * `element` has a size relative to its parent and this last one is not yet displayed,
 * for example because of `display: none` on a parent node.
 * @see https://developer.mozilla.org/en-US/docs/Web/CSS/used_value
 * @returns {number} Size in pixels or undefined if unknown.
 */
function readUsedSize(element, property) {
    var value = helpers.getStyle(element, property);
    var matches = value && value.match(/^(\d+)(\.\d+)?px$/);
    return matches ? Number(matches[1]) : undefined;
}

/**
 * Initializes the canvas style and render size without modifying the canvas display size,
 * since responsiveness is handled by the controller.resize() method. The config is used
 * to determine the aspect ratio to apply in case no explicit height has been specified.
 */
function initCanvas(canvas, config) {
    var style = canvas.style;

    // NOTE(SB) canvas.getAttribute('width') !== canvas.width: in the first case it
    // returns null or '' if no explicit value has been set to the canvas attribute.
    var renderHeight = canvas.getAttribute('height');
    var renderWidth = canvas.getAttribute('width');

    // Chart.js modifies some canvas values that we want to restore on destroy
    canvas[EXPANDO_KEY] = {
        initial: {
            height: renderHeight,
            width: renderWidth,
            style: {
                display: style.display,
                height: style.height,
                width: style.width
            }
        }
    };

    // Force canvas to display as block to avoid extra space caused by inline
    // elements, which would interfere with the responsive resize process.
    // https://github.com/chartjs/Chart.js/issues/2538
    style.display = style.display || 'block';
    let displayWidth;

    if (renderWidth === null || renderWidth === '') {
        displayWidth = readUsedSize(canvas, 'width');
        if (displayWidth !== undefined) {
            canvas.width = displayWidth;
        }
    }

    if (renderHeight === null || renderHeight === '') {
        if (canvas.style.height === '') {
            // If no explicit render height and style height, let's apply the aspect ratio,
            // which one can be specified by the user but also by charts as default option
            // (i.e. options.aspectRatio). If not specified, use canvas aspect ratio of 2.
            canvas.height = canvas.width / (config.options.aspectRatio || 2);
        } else {
            var displayHeight = readUsedSize(canvas, 'height');
            if (displayWidth !== undefined) {
                canvas.height = displayHeight;
            }
        }
    }

    return canvas;
}

/**
 * Detects support for options object argument in addEventListener.
 * https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener#Safely_detecting_option_support
 * @private
 */
var supportsEventListenerOptions = (function() {
    var supports = false;
    try {
        var options = Object.defineProperty({}, 'passive', {
            // eslint-disable-next-line getter-return
            get: function() {
                supports = true;
            }
        });
        window.addEventListener('e', null, options);
    } catch (e) {
        // continue regardless of error
    }
    return supports;
}());

// Default passive to true as expected by Chrome for 'touchstart' and 'touchend' events.
// https://github.com/chartjs/Chart.js/issues/4287
var eventListenerOptions = supportsEventListenerOptions ? {passive: true} : false;

function addListener(node, type, listener) {
    node.addEventListener(type, listener, eventListenerOptions);
}

function removeListener(node, type, listener) {
    node.removeEventListener(type, listener, eventListenerOptions);
}

function createEvent(type, chart, x, y, nativeEvent) {
    return {
        type: type,
        chart: chart,
        native: nativeEvent || null,
        x: x !== undefined ? x : null,
        y: y !== undefined ? y : null,
    };
}

function fromNativeEvent(event, chart) {
    var type = EVENT_TYPES[event.type] || event.type;
    var pos = helpers.getRelativePosition(event, chart);
    return createEvent(type, chart, pos.x, pos.y, event);
}

function throttled(fn, thisArg) {
    var ticking = false;
    var args = [];

    return function() {
        args = Array.prototype.slice.call(arguments);
        thisArg = thisArg || this;

        if (!ticking) {
            ticking = true;
            AnimationFrame(() => {
                ticking = false;
                fn.apply(thisArg, args);
            });
        }
    };
}

function createDiv(cls) {
    var el = document.createElement('div');
    el.className = cls || '';
    return el;
}

// Implementation based on https://github.com/marcj/css-element-queries
function createResizer(handler) {
    var maxSize = 1000000;

    // NOTE(SB) Don't use innerHTML because it could be considered unsafe.
    // https://github.com/chartjs/Chart.js/issues/5902
    var resizer = createDiv(CSS_SIZE_MONITOR);
    var expand = createDiv(CSS_SIZE_MONITOR + '-expand');
    var shrink = createDiv(CSS_SIZE_MONITOR + '-shrink');

    expand.appendChild(createDiv());
    shrink.appendChild(createDiv());

    resizer.appendChild(expand);
    resizer.appendChild(shrink);
    resizer._reset = function() {
        expand.scrollLeft = maxSize;
        expand.scrollTop = maxSize;
        shrink.scrollLeft = maxSize;
        shrink.scrollTop = maxSize;
    };

    var onScroll = function() {
        resizer._reset();
        handler();
    };

    addListener(expand, 'scroll', onScroll.bind(expand, 'expand'));
    addListener(shrink, 'scroll', onScroll.bind(shrink, 'shrink'));

    return resizer;
}

// https://davidwalsh.name/detect-node-insertion
function watchForRender(node, handler) {
    var expando = node[EXPANDO_KEY] || (node[EXPANDO_KEY] = {});
    var proxy = expando.renderProxy = function(e) {
        if (e.animationName === CSS_RENDER_ANIMATION) {
            handler();
        }
    };

    helpers.each(ANIMATION_START_EVENTS, function(type) {
        addListener(node, type, proxy);
    });

    // #4737: Chrome might skip the CSS animation when the CSS_RENDER_MONITOR class
    // is removed then added back immediately (same animation frame?). Accessing the
    // `offsetParent` property will force a reflow and re-evaluate the CSS animation.
    // https://gist.github.com/paulirish/5d52fb081b3570c81e3a#box-metrics
    // https://github.com/chartjs/Chart.js/issues/4737
    expando.reflow = !!node.offsetParent;

    node.classList.add(CSS_RENDER_MONITOR);
}

function unwatchForRender(node) {
    var expando = node[EXPANDO_KEY] || {};
    var proxy = expando.renderProxy;

    if (proxy) {
        helpers.each(ANIMATION_START_EVENTS, function(type) {
            removeListener(node, type, proxy);
        });

        delete expando.renderProxy;
    }

    node.classList.remove(CSS_RENDER_MONITOR);
}

function addResizeListener(node, listener, chart) {
    var expando = node[EXPANDO_KEY] || (node[EXPANDO_KEY] = {});

    // Let's keep track of this added resizer and thus avoid DOM query when removing it.
    var resizer = expando.resizer = createResizer(throttled(function() {
        if (expando.resizer) {
            var container = chart.options.maintainAspectRatio && node.parentNode;
            var w = container ? container.clientWidth : 0;
            listener(createEvent('resize', chart));
            if (container && container.clientWidth < w && chart.canvas) {
                // If the container size shrank during chart resize, let's assume
                // scrollbar appeared. So we resize again with the scrollbar visible -
                // effectively making chart smaller and the scrollbar hidden again.
                // Because we are inside `throttled`, and currently `ticking`, scroll
                // events are ignored during this whole 2 resize process.
                // If we assumed wrong and something else happened, we are resizing
                // twice in a frame (potential performance issue)
                listener(createEvent('resize', chart));
            }
        }
    }));

    // The resizer needs to be attached to the node parent, so we first need to be
    // sure that `node` is attached to the DOM before injecting the resizer element.
    watchForRender(node, function() {
        if (expando.resizer) {
            var container = node.parentNode;
            if (container && container !== resizer.parentNode) {
                container.insertBefore(resizer, container.firstChild);
            }

            // The container size might have changed, let's reset the resizer state.
            resizer._reset();
        }
    });
}

function removeResizeListener(node) {
    var expando = node[EXPANDO_KEY] || {};
    var resizer = expando.resizer;

    delete expando.resizer;
    unwatchForRender(node);

    if (resizer && resizer.parentNode) {
        resizer.parentNode.removeChild(resizer);
    }
}

/**
 * Injects CSS styles inline if the styles are not already present.
 * @param {HTMLDocument|ShadowRoot} rootNode - the node to contain the <style>.
 * @param {string} css - the CSS to be injected.
 */
function injectCSS(rootNode, css) {
    // https://stackoverflow.com/q/3922139
    var expando = rootNode[EXPANDO_KEY] || (rootNode[EXPANDO_KEY] = {});
    if (!expando.containsStyles) {
        expando.containsStyles = true;
        css = '/* Chart.js */\n' + css;
        var style = document.createElement('style');
        style.setAttribute('type', 'text/css');
        style.appendChild(document.createTextNode(css));
        rootNode.appendChild(style);
    }
}

var platform_dom$2 = {
    /**
     * When `true`, prevents the automatic injection of the stylesheet required to
     * correctly detect when the chart is added to the DOM and then resized. This
     * switch has been added to allow external stylesheet (`dist/Chart(.min)?.js`)
     * to be manually imported to make this library compatible with any CSP.
     * See https://github.com/chartjs/Chart.js/issues/5208
     */
    disableCSSInjection: false,

    /**
     * This property holds whether this platform is enabled for the current environment.
     * Currently used by platform.js to select the proper implementation.
     * @private
     */
    _enabled: typeof window !== 'undefined' && typeof document !== 'undefined',

    /**
     * Initializes resources that depend on platform options.
     * @param {HTMLCanvasElement} canvas - The Canvas element.
     * @private
     */
    _ensureLoaded: function(canvas) {
        if (!this.disableCSSInjection) {
            // If the canvas is in a shadow DOM, then the styles must also be inserted
            // into the same shadow DOM.
            // https://github.com/chartjs/Chart.js/issues/5763
            var root = canvas.getRootNode ? canvas.getRootNode() : document;
            var targetNode = root.host ? root : document.head;
            injectCSS(targetNode, stylesheet);
        }
    },

    acquireContext: function(item, config) {
        if (IsString(item)) {
            item = document.getElementById(item);
        } else if (item.length) {
            // Support for array based queries (such as jQuery)
            item = item[0];
        }

        if (item && item.canvas) {
            // Support for any object associated to a canvas (including a context2d)
            item = item.canvas;
        }

        // To prevent canvas fingerprinting, some add-ons undefine the getContext
        // method, for example: https://github.com/kkapsner/CanvasBlocker
        // https://github.com/chartjs/Chart.js/issues/2807
        var context = item && item.getContext && item.getContext('2d');

        // `instanceof HTMLCanvasElement/CanvasRenderingContext2D` fails when the item is
        // inside an iframe or when running in a protected environment. We could guess the
        // types from their toString() value but let's keep things flexible and assume it's
        // a sufficient condition if the item has a context2D which has item as `canvas`.
        // https://github.com/chartjs/Chart.js/issues/3887
        // https://github.com/chartjs/Chart.js/issues/4102
        // https://github.com/chartjs/Chart.js/issues/4152
        if (context && context.canvas === item) {
            // Load platform resources on first chart creation, to make it possible to
            // import the library before setting platform options.
            this._ensureLoaded(item);
            initCanvas(item, config);
            return context;
        }

        return null;
    },

    releaseContext: function(context) {
        var canvas = context.canvas;
        if (!canvas[EXPANDO_KEY]) {
            return;
        }

        var initial = canvas[EXPANDO_KEY].initial;
        ['height', 'width'].forEach(function(prop) {
            var value = initial[prop];
            if (value == null) {
                canvas.removeAttribute(prop);
            } else {
                canvas.setAttribute(prop, value);
            }
        });

        helpers.each(initial.style || {}, function(value, key) {
            canvas.style[key] = value;
        });

        // The canvas render size might have been changed (and thus the state stack discarded),
        // we can't use save() and restore() to restore the initial state. So make sure that at
        // least the canvas context is reset to the default state by setting the canvas width.
        // https://www.w3.org/TR/2011/WD-html5-20110525/the-canvas-element.html
        // eslint-disable-next-line no-self-assign
        canvas.width = canvas.width;

        delete canvas[EXPANDO_KEY];
    },

    addEventListener: function(chart, type, listener) {
        var canvas = chart.canvas;
        if (type === 'resize') {
            // Note: the resize event is not supported on all browsers.
            addResizeListener(canvas, listener, chart);
            return;
        }

        var expando = listener[EXPANDO_KEY] || (listener[EXPANDO_KEY] = {});
        var proxies = expando.proxies || (expando.proxies = {});
        var proxy = proxies[chart.id + '_' + type] = function(event) {
            listener(fromNativeEvent(event, chart));
        };

        addListener(canvas, type, proxy);
    },

    removeEventListener: function(chart, type, listener) {
        var canvas = chart.canvas;
        if (type === 'resize') {
            // Note: the resize event is not supported on all browsers.
            removeResizeListener(canvas);
            return;
        }

        var expando = listener[EXPANDO_KEY] || {};
        var proxies = expando.proxies || {};
        var proxy = proxies[chart.id + '_' + type];
        if (!proxy) {
            return;
        }

        removeListener(canvas, type, proxy);
    }
};

// @TODO Make possible to select another platform at build time.
var implementation = platform_dom$2._enabled ? platform_dom$2 : platform_basic;

/**
 * @namespace Chart.platform
 * @see https://chartjs.gitbooks.io/proposals/content/Platform.html
 * @since 2.4.0
 */
var platform = Assign({
    /**
     * @since 2.7.0
     */
    initialize: function() {},

    /**
     * Called at chart construction time, returns a context2d instance implementing
     * the [W3C Canvas 2D Context API standard]{@link https://www.w3.org/TR/2dcontext/}.
     * @param {*} item - The native item from which to acquire context (platform specific)
     * @param {object} options - The chart options
     * @returns {CanvasRenderingContext2D} context2d instance
     */
    acquireContext: function() {},

    /**
     * Called at chart destruction time, releases any resources associated to the context
     * previously returned by the acquireContext() method.
     * @param {CanvasRenderingContext2D} context - The context2d instance
     * @returns {boolean} true if the method succeeded, else false
     */
    releaseContext: function() {},

    /**
     * Registers the specified listener on the given chart.
     * @param {Chart} chart - Chart from which to listen for event
     * @param {string} type - The ({@link IEvent}) type to listen for
     * @param {Function} listener - Receives a notification (an object that implements
     * the {@link IEvent} interface) when an event of the specified type occurs.
     */
    addEventListener: function() {},

    /**
     * Removes the specified listener previously registered with addEventListener.
     * @param {Chart} chart - Chart from which to remove the listener
     * @param {string} type - The ({@link IEvent}) type to remove
     * @param {Function} listener - The listener function to remove from the event target.
     */
    removeEventListener: function() {}

}, implementation);

Merge(core_defaults, {
    global: {
        plugins: {},
    },
});

/**
 * The plugin service singleton
 * @namespace Chart.plugins
 * @since 2.1.0
 */
var core_plugins = {
    /**
     * Globally registered plugins.
     * @private
     */
    _plugins: [],

    /**
     * This identifier is used to invalidate the descriptors cache attached to each chart
     * when a global plugin is registered or unregistered. In this case, the cache ID is
     * incremented and descriptors are regenerated during following API calls.
     * @private
     */
    _cacheId: 0,

    /**
     * Registers the given plugin(s) if not already registered.
     * @param {Array<IPlugin>|IPlugin} plugins plugin instance(s).
     */
    register: function(plugins) {
        var p = this._plugins;
        ([]).concat(plugins).forEach(function(plugin) {
            if (p.indexOf(plugin) === -1) {
                p.push(plugin);
            }
        });

        this._cacheId++;
    },

    /**
     * Unregisters the given plugin(s) only if registered.
     * @param {Array<IPlugin>|IPlugin} plugins plugin instance(s).
     */
    unregister: function(plugins) {
        var p = this._plugins;
        ([]).concat(plugins).forEach(function(plugin) {
            var idx = p.indexOf(plugin);
            if (idx !== -1) {
                p.splice(idx, 1);
            }
        });

        this._cacheId++;
    },

    /**
     * Remove all registered plugins.
     * @since 2.1.5
     */
    clear: function() {
        this._plugins = [];
        this._cacheId++;
    },

    /**
     * Returns the number of registered plugins?
     * @returns {number}
     * @since 2.1.5
     */
    count: function() {
        return this._plugins.length;
    },

    /**
     * Returns all registered plugin instances.
     * @returns {Array<IPlugin>} array of plugin objects.
     * @since 2.1.5
     */
    getAll: function() {
        return this._plugins;
    },

    /**
     * Calls enabled plugins for `chart` on the specified hook and with the given args.
     * This method immediately returns as soon as a plugin explicitly returns false. The
     * returned value can be used, for instance, to interrupt the current action.
     * @param {Chart} chart - The chart instance for which plugins should be called.
     * @param {string} hook - The name of the plugin method to call (e.g. 'beforeUpdate').
     * @param {Array} [args] - Extra arguments to apply to the hook call.
     * @returns {boolean} false if any of the plugins return false, else returns true.
     */
    notify: function(chart, hook, args) {
        for (let descriptor of this.descriptors(chart)) {
            let plugin = descriptor.plugin,
                method = null;

            switch (hook) {
            case 'afterEvent':
                method = plugin.afterEvent;
                break;
            case 'beforeInit':
                method = plugin.beforeInit;
                break;
            case 'beforeUpdate':
                method = plugin.beforeUpdate;
                break;
            default:
                if (plugin[hook])
                    LS('unknown hook', hook);
            }

            if (IsFunction(method)) {
                let params = [chart].concat(args || []);
                params.push(descriptor.options);
                if (method.apply(plugin, params) === false) {
                    return false;
                }
            }
        }

        return true;
    },

    /**
     * Returns descriptors of enabled plugins for the given chart.
     * @returns {Array<Object>} { plugin, options }
     * @private
     */
    descriptors: function(chart) {
        var cache = chart.$plugins || (chart.$plugins = {});
        if (cache.id === this._cacheId) {
            return cache.descriptors;
        }

        var plugins = [];
        var descriptors = [];
        var config = (chart && chart.config) || {};
        var options = (config.options && config.options.plugins) || {};

        this._plugins.concat(config.plugins || []).forEach(function(plugin) {
            var idx = plugins.indexOf(plugin);
            if (idx !== -1) {
                return;
            }

            var id = plugin.id;
            var opts = options[id];
            if (opts === false) {
                return;
            }

            if (opts === true) {
                opts = helpers.clone(core_defaults.global.plugins[id]);
            }

            plugins.push(plugin);
            descriptors.push({
                plugin: plugin,
                options: opts || {}
            });
        });

        cache.descriptors = descriptors;
        cache.id = this._cacheId;
        return descriptors;
    },

    /**
     * Invalidates cache for the given chart: descriptors hold a reference on plugin option,
     * but in some cases, this reference can be changed by the user when updating options.
     * https://github.com/chartjs/Chart.js/issues/5111#issuecomment-355934167
     * @private
     */
    _invalidate: function(chart) {
        delete chart.$plugins;
    }
};

var core_scaleService = {
    // Scale registration object. Extensions can register new scale types (such as log or DB scales) and then
    // use the new chart options to grab the correct scale
    constructors: {},
    // Use a registration function so that we can move to an ES6 map when we no longer need to support
    // old browsers

    // Scale config defaults
    defaults: {},
    registerScaleType: function(type, scaleConstructor, scaleDefaults) {
        this.constructors[type] = scaleConstructor;
        this.defaults[type] = helpers.clone(scaleDefaults);
    },
    getScaleConstructor: function(type) {
        return this.constructors.hasOwnProperty(type) ? this.constructors[type] : undefined;
    },
    getScaleDefaults: function(type) {
        // Return the scale defaults merged with the global settings so that we always use the latest ones
        return this.defaults.hasOwnProperty(type)? helpers.merge({}, [core_defaults.scale, this.defaults[type]]) : {};
    },
    updateScaleDefaults: function(type, additions) {
        var me = this;
        if (me.defaults.hasOwnProperty(type)) {
            me.defaults[type] = Assign(me.defaults[type], additions);
        }
    },
    addScalesToLayout: function(chart) {
        // Adds each scale to the chart.boxes array to be sized accordingly
        helpers.each(chart.scales, function(scale) {
            // Set ILayoutItem parameters for backwards compatibility
            scale.fullWidth = scale.options.fullWidth;
            scale.position = scale.options.position;
            scale.weight = scale.options.weight;
            core_layouts.addBox(chart, scale);
        });
    }
};

Merge(core_defaults, {
    global: {
        tooltips: {
            enabled: true,
            custom: null,
            mode: 'nearest',
            position: 'average',
            intersect: true,
            backgroundColor: 'rgba(0,0,0,0.8)',
            titleFontStyle: 'bold',
            titleSpacing: 2,
            titleMarginBottom: 6,
            titleFontColor: '#fff',
            titleAlign: 'left',
            bodySpacing: 2,
            bodyFontColor: '#fff',
            bodyAlign: 'left',
            footerFontStyle: 'bold',
            footerSpacing: 2,
            footerMarginTop: 6,
            footerFontColor: '#fff',
            footerAlign: 'left',
            yPadding: 6,
            xPadding: 6,
            caretPadding: 2,
            caretSize: 5,
            cornerRadius: 6,
            multiKeyBackground: '#fff',
            displayColors: true,
            borderColor: 'rgba(0,0,0,0)',
            borderWidth: 0,
            callbacks: {
                // Args are: (tooltipItems, data)
                beforeTitle: noop,
                title: function(tooltipItems, data) {
                    var title = '';
                    var labels = data.labels;
                    var labelCount = labels ? labels.length : 0;

                    if (tooltipItems.length > 0) {
                        var item = tooltipItems[0];
                        if (item.label) {
                            title = item.label;
                        } else if (item.xLabel) {
                            title = item.xLabel;
                        } else if (labelCount > 0 && item.index < labelCount) {
                            title = labels[item.index];
                        }
                    }

                    return title;
                },
                afterTitle: noop,

                // Args are: (tooltipItems, data)
                beforeBody: noop,

                // Args are: (tooltipItem, data)
                beforeLabel: noop,
                label: function(tooltipItem, data) {
                    var label = data.datasets[tooltipItem.datasetIndex].label || '';

                    if (label) {
                        label += ': ';
                    }
                    if (tooltipItem.value != null) {
                        label += tooltipItem.value;
                    } else {
                        label += tooltipItem.yLabel;
                    }
                    return label;
                },
                labelColor: function(tooltipItem, chart) {
                    var meta = chart.getDatasetMeta(tooltipItem.datasetIndex);
                    var activeElement = meta.data[tooltipItem.index];
                    var view = activeElement._view;
                    return {
                        borderColor: view.borderColor,
                        backgroundColor: view.backgroundColor
                    };
                },
                labelTextColor: function() {
                    return this._options.bodyFontColor;
                },
                afterLabel: noop,

                // Args are: (tooltipItems, data)
                afterBody: noop,

                // Args are: (tooltipItems, data)
                beforeFooter: noop,
                footer: noop,
                afterFooter: noop,
            },
        },
    },
});

var positioners = {
    /**
     * Average mode places the tooltip at the average position of the elements shown
     * @function Chart.Tooltip.positioners.average
     * @param {Array<ChartElement>} elements the elements being displayed in the tooltip
     * @returns {Object} tooltip position
     */
    average: function(elements) {
        if (!elements.length) {
            return false;
        }

        var i, len;
        var x = 0;
        var y = 0;
        var count = 0;

        for (i = 0, len = elements.length; i < len; ++i) {
            var el = elements[i];
            if (el && el.hasValue()) {
                var pos = el.tooltipPosition();
                x += pos.x;
                y += pos.y;
                ++count;
            }
        }

        return {
            x: x / count,
            y: y / count
        };
    },

    /**
     * Gets the tooltip position nearest of the item nearest to the event position
     * @function Chart.Tooltip.positioners.nearest
     * @param {Array<ChartElement>} elements the tooltip elements
     * @param {Object} eventPosition the position of the event in canvas coordinates
     * @returns {Object} the tooltip position
     */
    nearest: function(elements, eventPosition) {
        var x = eventPosition.x;
        var y = eventPosition.y;
        var minDistance = Number.POSITIVE_INFINITY;
        var i, len, nearestElement;

        for (i = 0, len = elements.length; i < len; ++i) {
            var el = elements[i];
            if (el && el.hasValue()) {
                var center = el.getCenterPoint();
                var d = helpers.distanceBetweenPoints(eventPosition, center);

                if (d < minDistance) {
                    minDistance = d;
                    nearestElement = el;
                }
            }
        }

        if (nearestElement) {
            var tp = nearestElement.tooltipPosition();
            x = tp.x;
            y = tp.y;
        }

        return {
            x: x,
            y: y
        };
    }
};

// Helper to push or concat based on if the 2nd parameter is an array or not
function pushOrConcat(base, toPush) {
    if (toPush) {
        if (IsArray(toPush)) {
            // base = base.concat(toPush);
            Array.prototype.push.apply(base, toPush);
        } else {
            base.push(toPush);
        }
    }

    return base;
}

/**
 * Returns array of strings split by newline
 * @param {string} value - The value to split by newline.
 * @returns {Array<string>} value if newline present - Returned from String split() method
 * @function
 */
function splitNewlines(str) {
    if ((IsString(str) || str instanceof String) && str.indexOf('\n') > -1) {
        return str.split('\n');
    }
    return str;
}


/**
 * Private helper to create a tooltip item model
 * @param element - the chart element (point, arc, bar) to create the tooltip item for
 * @returns {Object} new tooltip item
 */
function createTooltipItem(element) {
    var xScale = element._xScale;
    var yScale = element._yScale || element._scale; // handle radar || polarArea charts
    var index = element._index;
    var datasetIndex = element._datasetIndex;
    var controller = element._chart.getDatasetMeta(datasetIndex).controller;
    var indexScale = controller._getIndexScale();
    var valueScale = controller._getValueScale();

    return {
        xLabel: xScale ? xScale.getLabelForIndex(index, datasetIndex) : '',
        yLabel: yScale ? yScale.getLabelForIndex(index, datasetIndex) : '',
        label: indexScale ? '' + indexScale.getLabelForIndex(index, datasetIndex) : '',
        value: valueScale ? '' + valueScale.getLabelForIndex(index, datasetIndex) : '',
        index: index,
        datasetIndex: datasetIndex,
        x: element._model.x,
        y: element._model.y
    };
}

/**
 * Helper to get the reset model for the tooltip
 * @param {Object} tooltipOpts the tooltip options
 */
function getBaseModel(tooltipOpts) {
    var globalDefaults = core_defaults.global;

    return {
        // Positioning
        xPadding: tooltipOpts.xPadding,
        yPadding: tooltipOpts.yPadding,
        xAlign: tooltipOpts.xAlign,
        yAlign: tooltipOpts.yAlign,

        // Drawing direction and text direction
        textDirection: tooltipOpts.textDirection,

        // Body
        bodyFontColor: tooltipOpts.bodyFontColor,
        _bodyFontFamily: Undefined(tooltipOpts.bodyFontFamily, globalDefaults.defaultFontFamily),
        _bodyFontStyle: Undefined(tooltipOpts.bodyFontStyle, globalDefaults.defaultFontStyle),
        _bodyAlign: tooltipOpts.bodyAlign,
        bodyFontSize: Undefined(tooltipOpts.bodyFontSize, globalDefaults.defaultFontSize),
        bodySpacing: tooltipOpts.bodySpacing,

        // Title
        titleFontColor: tooltipOpts.titleFontColor,
        _titleFontFamily: Undefined(tooltipOpts.titleFontFamily, globalDefaults.defaultFontFamily),
        _titleFontStyle: Undefined(tooltipOpts.titleFontStyle, globalDefaults.defaultFontStyle),
        titleFontSize: Undefined(tooltipOpts.titleFontSize, globalDefaults.defaultFontSize),
        _titleAlign: tooltipOpts.titleAlign,
        titleSpacing: tooltipOpts.titleSpacing,
        titleMarginBottom: tooltipOpts.titleMarginBottom,

        // Footer
        footerFontColor: tooltipOpts.footerFontColor,
        _footerFontFamily: Undefined(tooltipOpts.footerFontFamily, globalDefaults.defaultFontFamily),
        _footerFontStyle: Undefined(tooltipOpts.footerFontStyle, globalDefaults.defaultFontStyle),
        footerFontSize: Undefined(tooltipOpts.footerFontSize, globalDefaults.defaultFontSize),
        _footerAlign: tooltipOpts.footerAlign,
        footerSpacing: tooltipOpts.footerSpacing,
        footerMarginTop: tooltipOpts.footerMarginTop,

        // Appearance
        caretSize: tooltipOpts.caretSize,
        cornerRadius: tooltipOpts.cornerRadius,
        backgroundColor: tooltipOpts.backgroundColor,
        opacity: 0,
        legendColorBackground: tooltipOpts.multiKeyBackground,
        displayColors: tooltipOpts.displayColors,
        borderColor: tooltipOpts.borderColor,
        borderWidth: tooltipOpts.borderWidth
    };
}

/**
 * Get the size of the tooltip
 */
function getTooltipSize(tooltip, model) {
    var ctx = tooltip._chart.ctx;

    var height = model.yPadding * 2; // Tooltip Padding
    var width = 0;

    // Count of all lines in the body
    var body = model.body;
    var combinedBodyLength = body.reduce(function(count, bodyItem) {
        return count + bodyItem.before.length + bodyItem.lines.length + bodyItem.after.length;
    }, 0);
    combinedBodyLength += model.beforeBody.length + model.afterBody.length;

    var titleLineCount = model.title.length;
    var footerLineCount = model.footer.length;
    var titleFontSize = model.titleFontSize;
    var bodyFontSize = model.bodyFontSize;
    var footerFontSize = model.footerFontSize;

    height += titleLineCount * titleFontSize; // Title Lines
    height += titleLineCount ? (titleLineCount - 1) * model.titleSpacing : 0; // Title Line Spacing
    height += titleLineCount ? model.titleMarginBottom : 0; // Title's bottom Margin
    height += combinedBodyLength * bodyFontSize; // Body Lines
    height += combinedBodyLength ? (combinedBodyLength - 1) * model.bodySpacing : 0; // Body Line Spacing
    height += footerLineCount ? model.footerMarginTop : 0; // Footer Margin
    height += footerLineCount * (footerFontSize); // Footer Lines
    height += footerLineCount ? (footerLineCount - 1) * model.footerSpacing : 0; // Footer Line Spacing

    // Title width
    var widthPadding = 0;
    var maxLineWidth = function(line) {
        width = Max(width, ctx.measureText(line).width + widthPadding);
    };

    ctx.font = helpers.fontString(titleFontSize, model._titleFontStyle, model._titleFontFamily);
    helpers.each(model.title, maxLineWidth);

    // Body width
    ctx.font = helpers.fontString(bodyFontSize, model._bodyFontStyle, model._bodyFontFamily);
    helpers.each(model.beforeBody.concat(model.afterBody), maxLineWidth);

    // Body lines may include some extra width due to the color box
    widthPadding = model.displayColors ? (bodyFontSize + 2) : 0;
    helpers.each(body, function(bodyItem) {
        helpers.each(bodyItem.before, maxLineWidth);
        helpers.each(bodyItem.lines, maxLineWidth);
        helpers.each(bodyItem.after, maxLineWidth);
    });

    // Reset back to 0
    widthPadding = 0;

    // Footer width
    ctx.font = helpers.fontString(footerFontSize, model._footerFontStyle, model._footerFontFamily);
    helpers.each(model.footer, maxLineWidth);

    // Add padding
    width += 2 * model.xPadding;

    return {
        width: width,
        height: height
    };
}

/**
 * Helper to get the alignment of a tooltip given the size
 */
function determineAlignment(tooltip, size) {
    var model = tooltip._model;
    var chart = tooltip._chart;
    var chartArea = tooltip._chart.chartArea;
    var xAlign = 'center';
    var yAlign = 'center';

    if (model.y < size.height) {
        yAlign = 'top';
    } else if (model.y > (chart.height - size.height)) {
        yAlign = 'bottom';
    }

    var lf, rf; // functions to determine left, right alignment
    var olf, orf; // functions to determine if left/right alignment causes tooltip to go outside chart
    var yf; // function to get the y alignment if the tooltip goes outside of the left or right edges
    var midX = (chartArea.left + chartArea.right) / 2;
    var midY = (chartArea.top + chartArea.bottom) / 2;

    if (yAlign === 'center') {
        lf = function(x) {
            return x <= midX;
        };
        rf = function(x) {
            return x > midX;
        };
    } else {
        lf = function(x) {
            return x <= (size.width / 2);
        };
        rf = function(x) {
            return x >= (chart.width - (size.width / 2));
        };
    }

    olf = function(x) {
        return x + size.width + model.caretSize + model.caretPadding > chart.width;
    };
    orf = function(x) {
        return x - size.width - model.caretSize - model.caretPadding < 0;
    };
    yf = function(y) {
        return y <= midY ? 'top' : 'bottom';
    };

    if (lf(model.x)) {
        xAlign = 'left';

        // Is tooltip too wide and goes over the right side of the chart.?
        if (olf(model.x)) {
            xAlign = 'center';
            yAlign = yf(model.y);
        }
    } else if (rf(model.x)) {
        xAlign = 'right';

        // Is tooltip too wide and goes outside left edge of canvas?
        if (orf(model.x)) {
            xAlign = 'center';
            yAlign = yf(model.y);
        }
    }

    var opts = tooltip._options;
    return {
        xAlign: opts.xAlign ? opts.xAlign : xAlign,
        yAlign: opts.yAlign ? opts.yAlign : yAlign
    };
}

/**
 * Helper to get the location a tooltip needs to be placed at given the initial position (via the vm) and the size and alignment
 */
function getBackgroundPoint(vm, size, alignment, chart) {
    // Background Position
    var x = vm.x;
    var y = vm.y;

    var caretSize = vm.caretSize;
    var caretPadding = vm.caretPadding;
    var cornerRadius = vm.cornerRadius;
    var xAlign = alignment.xAlign;
    var yAlign = alignment.yAlign;
    var paddingAndSize = caretSize + caretPadding;
    var radiusAndPadding = cornerRadius + caretPadding;

    if (xAlign === 'right') {
        x -= size.width;
    } else if (xAlign === 'center') {
        x -= (size.width / 2);
        if (x + size.width > chart.width) {
            x = chart.width - size.width;
        }
        if (x < 0) {
            x = 0;
        }
    }

    if (yAlign === 'top') {
        y += paddingAndSize;
    } else if (yAlign === 'bottom') {
        y -= size.height + paddingAndSize;
    } else {
        y -= (size.height / 2);
    }

    if (yAlign === 'center') {
        if (xAlign === 'left') {
            x += paddingAndSize;
        } else if (xAlign === 'right') {
            x -= paddingAndSize;
        }
    } else if (xAlign === 'left') {
        x -= radiusAndPadding;
    } else if (xAlign === 'right') {
        x += radiusAndPadding;
    }

    return {
        x: x,
        y: y
    };
}

function getAlignedX(vm, align) {
    return align === 'center'
        ? vm.x + vm.width / 2
        : align === 'right'
            ? vm.x + vm.width - vm.xPadding
            : vm.x + vm.xPadding;
}

/**
 * Helper to build before and after body lines
 */
function getBeforeAfterBodyLines(callback) {
    return pushOrConcat([], splitNewlines(callback));
}

var exports$4 = Element.extend({
    initialize: function() {
        this._model = getBaseModel(this._options);
        this._lastActive = [];
    },

    // Get the title
    // Args are: (tooltipItem, data)
    getTitle: function() {
        var me = this;
        var opts = me._options;
        var callbacks = opts.callbacks;

        var beforeTitle = callbacks.beforeTitle.apply(me, arguments);
        var title = callbacks.title.apply(me, arguments);
        var afterTitle = callbacks.afterTitle.apply(me, arguments);

        var lines = [];
        lines = pushOrConcat(lines, splitNewlines(beforeTitle));
        lines = pushOrConcat(lines, splitNewlines(title));
        lines = pushOrConcat(lines, splitNewlines(afterTitle));

        return lines;
    },

    // Args are: (tooltipItem, data)
    getBeforeBody: function() {
        return getBeforeAfterBodyLines(this._options.callbacks.beforeBody.apply(this, arguments));
    },

    // Args are: (tooltipItem, data)
    getBody: function(tooltipItems, data) {
        var me = this;
        var callbacks = me._options.callbacks;
        var bodyItems = [];

        helpers.each(tooltipItems, function(tooltipItem) {
            var bodyItem = {
                before: [],
                lines: [],
                after: []
            };
            pushOrConcat(bodyItem.before, splitNewlines(callbacks.beforeLabel.call(me, tooltipItem, data)));
            pushOrConcat(bodyItem.lines, callbacks.label.call(me, tooltipItem, data));
            pushOrConcat(bodyItem.after, splitNewlines(callbacks.afterLabel.call(me, tooltipItem, data)));

            bodyItems.push(bodyItem);
        });

        return bodyItems;
    },

    // Args are: (tooltipItem, data)
    getAfterBody: function() {
        return getBeforeAfterBodyLines(this._options.callbacks.afterBody.apply(this, arguments));
    },

    // Get the footer and beforeFooter and afterFooter lines
    // Args are: (tooltipItem, data)
    getFooter: function() {
        var me = this;
        var callbacks = me._options.callbacks;

        var beforeFooter = callbacks.beforeFooter.apply(me, arguments);
        var footer = callbacks.footer.apply(me, arguments);
        var afterFooter = callbacks.afterFooter.apply(me, arguments);

        var lines = [];
        lines = pushOrConcat(lines, splitNewlines(beforeFooter));
        lines = pushOrConcat(lines, splitNewlines(footer));
        lines = pushOrConcat(lines, splitNewlines(afterFooter));

        return lines;
    },

    update: function(changed) {
        var me = this;
        var opts = me._options;

        // Need to regenerate the model because its faster than using extend and it is necessary due to the optimization in Chart.Element.transition
        // that does _view = _model if ease === 1. This causes the 2nd tooltip update to set properties in both the view and model at the same time
        // which breaks any animations.
        var existingModel = me._model;
        var model = me._model = getBaseModel(opts);
        var active = me._active;

        var data = me._data;

        // In the case where active.length === 0 we need to keep these at existing values for good animations
        var alignment = {
            xAlign: existingModel.xAlign,
            yAlign: existingModel.yAlign
        };
        var backgroundPoint = {
            x: existingModel.x,
            y: existingModel.y
        };
        var tooltipSize = {
            width: existingModel.width,
            height: existingModel.height
        };
        var tooltipPosition = {
            x: existingModel.caretX,
            y: existingModel.caretY
        };

        var i, len;

        if (active.length) {
            model.opacity = 1;

            var labelColors = [];
            var labelTextColors = [];
            tooltipPosition = positioners[opts.position].call(me, active, me._eventPosition);

            var tooltipItems = [];
            for (i = 0, len = active.length; i < len; ++i) {
                tooltipItems.push(createTooltipItem(active[i]));
            }

            // If the user provided a filter function, use it to modify the tooltip items
            if (opts.filter) {
                tooltipItems = tooltipItems.filter(function(a) {
                    return opts.filter(a, data);
                });
            }

            // If the user provided a sorting function, use it to modify the tooltip items
            if (opts.itemSort) {
                tooltipItems = tooltipItems.sort(function(a, b) {
                    return opts.itemSort(a, b, data);
                });
            }

            // Determine colors for boxes
            helpers.each(tooltipItems, function(tooltipItem) {
                labelColors.push(opts.callbacks.labelColor.call(me, tooltipItem, me._chart));
                labelTextColors.push(opts.callbacks.labelTextColor.call(me, tooltipItem, me._chart));
            });


            // Build the Text Lines
            model.title = me.getTitle(tooltipItems, data);
            model.beforeBody = me.getBeforeBody(tooltipItems, data);
            model.body = me.getBody(tooltipItems, data);
            model.afterBody = me.getAfterBody(tooltipItems, data);
            model.footer = me.getFooter(tooltipItems, data);

            // Initial positioning and colors
            model.x = tooltipPosition.x;
            model.y = tooltipPosition.y;
            model.caretPadding = opts.caretPadding;
            model.labelColors = labelColors;
            model.labelTextColors = labelTextColors;

            // data points
            model.dataPoints = tooltipItems;

            // We need to determine alignment of the tooltip
            tooltipSize = getTooltipSize(this, model);
            alignment = determineAlignment(this, tooltipSize);
            // Final Size and Position
            backgroundPoint = getBackgroundPoint(model, tooltipSize, alignment, me._chart);
        } else {
            model.opacity = 0;
        }

        model.xAlign = alignment.xAlign;
        model.yAlign = alignment.yAlign;
        model.x = backgroundPoint.x;
        model.y = backgroundPoint.y;
        model.width = tooltipSize.width;
        model.height = tooltipSize.height;

        // Point where the caret on the tooltip points to
        model.caretX = tooltipPosition.x;
        model.caretY = tooltipPosition.y;

        me._model = model;

        if (changed && opts.custom) {
            opts.custom.call(me, model);
        }

        return me;
    },

    drawCaret: function(tooltipPoint, size) {
        var ctx = this._chart.ctx;
        var vm = this._view;
        var caretPosition = this.getCaretPosition(tooltipPoint, size, vm);

        ctx.lineTo(caretPosition.x1, caretPosition.y1);
        ctx.lineTo(caretPosition.x2, caretPosition.y2);
        ctx.lineTo(caretPosition.x3, caretPosition.y3);
    },
    getCaretPosition: function(tooltipPoint, size, vm) {
        var x1, x2, x3, y1, y2, y3;
        var caretSize = vm.caretSize;
        var cornerRadius = vm.cornerRadius;
        var xAlign = vm.xAlign;
        var yAlign = vm.yAlign;
        var ptX = tooltipPoint.x;
        var ptY = tooltipPoint.y;
        var width = size.width;
        var height = size.height;

        if (yAlign === 'center') {
            y2 = ptY + (height / 2);

            if (xAlign === 'left') {
                x1 = ptX;
                x2 = x1 - caretSize;
                x3 = x1;

                y1 = y2 + caretSize;
                y3 = y2 - caretSize;
            } else {
                x1 = ptX + width;
                x2 = x1 + caretSize;
                x3 = x1;

                y1 = y2 - caretSize;
                y3 = y2 + caretSize;
            }
        } else {
            if (xAlign === 'left') {
                x2 = ptX + cornerRadius + (caretSize);
                x1 = x2 - caretSize;
                x3 = x2 + caretSize;
            } else if (xAlign === 'right') {
                x2 = ptX + width - cornerRadius - caretSize;
                x1 = x2 - caretSize;
                x3 = x2 + caretSize;
            } else {
                x2 = vm.caretX;
                x1 = x2 - caretSize;
                x3 = x2 + caretSize;
            }
            if (yAlign === 'top') {
                y1 = ptY;
                y2 = y1 - caretSize;
                y3 = y1;
            } else {
                y1 = ptY + height;
                y2 = y1 + caretSize;
                y3 = y1;
                // invert drawing order
                var tmp = x3;
                x3 = x1;
                x1 = tmp;
            }
        }
        return {x1: x1, x2: x2, x3: x3, y1: y1, y2: y2, y3: y3};
    },

    drawTitle: function(pt, vm, ctx) {
        var title = vm.title;
        var length = title.length;
        var titleFontSize, titleSpacing, i;

        if (length) {
            pt.x = getAlignedX(vm, vm._titleAlign);

            ctx.textAlign = vm._titleAlign;
            ctx.textBaseline = 'middle';

            titleFontSize = vm.titleFontSize;
            titleSpacing = vm.titleSpacing;

            ctx.fillStyle = vm.titleFontColor;
            ctx.font = helpers.fontString(titleFontSize, vm._titleFontStyle, vm._titleFontFamily);

            for (i = 0; i < length; ++i) {
                ctx.fillText(title[i], pt.x, pt.y + titleFontSize / 2);
                pt.y += titleFontSize + titleSpacing; // Line Height and spacing

                if (i + 1 === length) {
                    pt.y += vm.titleMarginBottom - titleSpacing; // If Last, add margin, remove spacing
                }
            }
        }
    },

    drawBody: function(pt, vm, ctx) {
        var bodyFontSize = vm.bodyFontSize;
        var bodySpacing = vm.bodySpacing;
        var bodyAlign = vm._bodyAlign;
        var body = vm.body;
        var drawColorBoxes = vm.displayColors;
        var xLinePadding = 0;
        var colorX = drawColorBoxes ? getAlignedX(vm, 'left') : 0;

        var fillLineOfText = function(line) {
            ctx.fillText(line, pt.x + xLinePadding, pt.y + bodyFontSize / 2);
            pt.y += bodyFontSize + bodySpacing;
        };

        var bodyItem, textColor, labelColors, lines, i, j, ilen, jlen;
        var bodyAlignForCalculation = bodyAlign;

        ctx.textAlign = bodyAlign;
        ctx.textBaseline = 'middle';
        ctx.font = helpers.fontString(bodyFontSize, vm._bodyFontStyle, vm._bodyFontFamily);

        pt.x = getAlignedX(vm, bodyAlignForCalculation);

        // Before body lines
        ctx.fillStyle = vm.bodyFontColor;
        helpers.each(vm.beforeBody, fillLineOfText);

        xLinePadding = drawColorBoxes && bodyAlignForCalculation !== 'right'
            ? bodyAlign === 'center' ? (bodyFontSize / 2 + 1) : (bodyFontSize + 2)
            : 0;

        // Draw body lines now
        for (i = 0, ilen = body.length; i < ilen; ++i) {
            bodyItem = body[i];
            textColor = vm.labelTextColors[i];
            labelColors = vm.labelColors[i];

            ctx.fillStyle = textColor;
            helpers.each(bodyItem.before, fillLineOfText);

            lines = bodyItem.lines;
            for (j = 0, jlen = lines.length; j < jlen; ++j) {
                // Draw Legend-like boxes if needed
                if (drawColorBoxes) {
                    // Fill a white rect so that colours merge nicely if the opacity is < 1
                    ctx.fillStyle = vm.legendColorBackground;
                    ctx.fillRect(colorX, pt.y, bodyFontSize, bodyFontSize);

                    // Border
                    ctx.lineWidth = 1;
                    ctx.strokeStyle = labelColors.borderColor;
                    ctx.strokeRect(colorX, pt.y, bodyFontSize, bodyFontSize);

                    // Inner square
                    ctx.fillStyle = labelColors.backgroundColor;
                    ctx.fillRect(colorX + 1, pt.y + 1, bodyFontSize - 2, bodyFontSize - 2);
                    ctx.fillStyle = textColor;
                }

                fillLineOfText(lines[j]);
            }

            helpers.each(bodyItem.after, fillLineOfText);
        }

        // Reset back to 0 for after body
        xLinePadding = 0;

        // After body lines
        helpers.each(vm.afterBody, fillLineOfText);
        pt.y -= bodySpacing; // Remove last body spacing
    },

    drawFooter: function(pt, vm, ctx) {
        var footer = vm.footer;
        var length = footer.length;
        var footerFontSize, i;

        if (length) {
            pt.x = getAlignedX(vm, vm._footerAlign);
            pt.y += vm.footerMarginTop;

            ctx.textAlign = vm._footerAlign;
            ctx.textBaseline = 'middle';

            footerFontSize = vm.footerFontSize;

            ctx.fillStyle = vm.footerFontColor;
            ctx.font = helpers.fontString(footerFontSize, vm._footerFontStyle, vm._footerFontFamily);

            for (i = 0; i < length; ++i) {
                ctx.fillText(footer[i], pt.x, pt.y + footerFontSize / 2);
                pt.y += footerFontSize + vm.footerSpacing;
            }
        }
    },

    drawBackground: function(pt, vm, ctx, tooltipSize) {
        ctx.fillStyle = vm.backgroundColor;
        ctx.strokeStyle = vm.borderColor;
        ctx.lineWidth = vm.borderWidth;
        var xAlign = vm.xAlign;
        var yAlign = vm.yAlign;
        var x = pt.x;
        var y = pt.y;
        var width = tooltipSize.width;
        var height = tooltipSize.height;
        var radius = vm.cornerRadius;

        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        if (yAlign === 'top') {
            this.drawCaret(pt, tooltipSize);
        }
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        if (yAlign === 'center' && xAlign === 'right') {
            this.drawCaret(pt, tooltipSize);
        }
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        if (yAlign === 'bottom') {
            this.drawCaret(pt, tooltipSize);
        }
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        if (yAlign === 'center' && xAlign === 'left') {
            this.drawCaret(pt, tooltipSize);
        }
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();

        ctx.fill();

        if (vm.borderWidth > 0) {
            ctx.stroke();
        }
    },

    draw: function() {
        var ctx = this._chart.ctx;
        var vm = this._view;

        if (vm.opacity === 0) {
            return;
        }

        var tooltipSize = {
            width: vm.width,
            height: vm.height
        };
        var pt = {
            x: vm.x,
            y: vm.y
        };

        // IE11/Edge does not like very small opacities, so snap to 0
        var opacity = Abs(vm.opacity < 1e-3) ? 0 : vm.opacity;

        // Truthy/falsey value for empty tooltip
        var hasTooltipContent = vm.title.length || vm.beforeBody.length || vm.body.length || vm.afterBody.length || vm.footer.length;

        if (this._options.enabled && hasTooltipContent) {
            ctx.save();
            ctx.globalAlpha = opacity;

            // Draw Background
            this.drawBackground(pt, vm, ctx, tooltipSize);

            // Draw Title, Body, and Footer
            pt.y += vm.yPadding;

            // Titles
            this.drawTitle(pt, vm, ctx);

            // Body
            this.drawBody(pt, vm, ctx);

            // Footer
            this.drawFooter(pt, vm, ctx);

            ctx.restore();
        }
    },

    /**
     * Handle an event
     * @private
     * @param {IEvent} event - The event to handle
     * @returns {boolean} true if the tooltip changed
     */
    handleEvent: function(e) {
        var me = this;
        var options = me._options;
        var changed = false;

        me._lastActive = me._lastActive || [];

        // Find Active Elements for tooltips
        if (e.type === 'mouseout') {
            me._active = [];
        } else {
            me._active = me._chart.getElementsAtEventForMode(e, options.mode, options);
            if (options.reverse) {
                me._active.reverse();
            }
        }

        // Remember Last Actives
        changed = !helpers.arrayEquals(me._active, me._lastActive);

        // Only handle target event on tooltip change
        if (changed) {
            me._lastActive = me._active;

            if (options.enabled || options.custom) {
                me._eventPosition = {
                    x: e.x,
                    y: e.y
                };

                me.update(true);
                me.pivot();
            }
        }

        return changed;
    }
});

/**
 * @namespace Chart.Tooltip.positioners
 */
var positioners_1 = positioners;

var core_tooltip = exports$4;
core_tooltip.positioners = positioners_1;

Merge(core_defaults, {
    global: {
        elements: {},
        events: [
            'mousemove',
            'mouseout',
            'click',
            'touchstart',
            'touchmove',
        ],
        hover: {
            onHover: null,
            mode: 'nearest',
            intersect: true,
            animationDuration: 400,
        },
        onClick: null,
        maintainAspectRatio: true,
        responsive: true,
        responsiveAnimationDuration: 0,
    },
});

/**
 * Recursively merge the given config objects representing the `scales` option
 * by incorporating scale defaults in `xAxes` and `yAxes` array items, then
 * returns a deep copy of the result, thus doesn't alter inputs.
 */
function mergeScaleConfig(/* config objects ... */) {
    return helpers.merge({}, [].slice.call(arguments), {
        merger: function(key, target, source, options) {
            if (key === 'xAxes' || key === 'yAxes') {
                var slen = source[key].length;
                var i, type, scale;

                if (!target[key]) {
                    target[key] = [];
                }

                for (i = 0; i < slen; ++i) {
                    scale = source[key][i];
                    type = Undefined(scale.type, key === 'xAxes' ? 'category' : 'custom');

                    if (i >= target[key].length) {
                        target[key].push({});
                    }

                    if (!target[key][i].type || (scale.type && scale.type !== target[key][i].type)) {
                        // new/untyped scale or type changed: let's apply the new defaults
                        // then merge source scale to correctly overwrite the defaults.
                        helpers.merge(target[key][i], [core_scaleService.getScaleDefaults(type), scale]);
                    } else {
                        // scales type are the same
                        Merge(target[key][i], scale);
                    }
                }
            } else {
                helpers._merger(key, target, source, options);
            }
        }
    });
}

/**
 * Recursively merge the given config objects as the root options by handling
 * default scale options for the `scales` and `scale` properties, then returns
 * a deep copy of the result, thus doesn't alter inputs.
 */
function mergeConfig(/* config objects ... */) {
    return helpers.merge({}, [].slice.call(arguments), {
        merger: function(key, target, source, options) {
            var tval = target[key] || {};
            var sval = source[key];

            if (key === 'scales') {
                // scale config merging is complex. Add our own function here for that
                target[key] = mergeScaleConfig(tval, sval);
            } else if (key === 'scale') {
                // used in polar area & radar charts since there is only one scale
                target[key] = helpers.merge(tval, [core_scaleService.getScaleDefaults(sval.type), sval]);
            } else {
                helpers._merger(key, target, source, options);
            }
        }
    });
}

function initConfig(config) {
    config = config || {};

    // Do NOT use mergeConfig for the data object because this method merges arrays
    // and so would change references to labels and datasets, preventing data updates.
    var data = config.data = config.data || {};
    data.datasets = data.datasets || [];
    data.labels = data.labels || [];

    config.options = config.options || {};
    Merge(config.options, core_defaults.line, 0);
    Merge(config.options, core_defaults.global, 0);

    return config;
}

function updateConfig(chart) {
    var newOptions = chart.options;

    helpers.each(chart.scales, function(scale) {
        core_layouts.removeBox(chart, scale);
    });

    // Merge(newOptions, core_defaults.global, 0);
    // Merge(newOptions, core_defaults.line, 0);

    newOptions = mergeConfig(
        core_defaults.global,
        core_defaults.line,
        newOptions);

    chart.options = chart.config.options = newOptions;
    chart.buildOrUpdateScales();

    // Tooltip
    chart.tooltip._options = newOptions.tooltips;
    chart.tooltip.initialize();
}

function positionIsHorizontal(position) {
    return position === 'top' || position === 'bottom';
}

function compare2Level(l1, l2) {
    return function(a, b) {
        return a[l1] === b[l1]
            ? a[l2] - b[l2]
            : a[l1] - b[l1];
    };
}

var Chart = function(item, config) {
    this.construct(item, config);
    return this;
};

Assign(Chart.prototype, /** @lends Chart */ {
    /**
     * @private
     */
    construct: function(item, config) {
        var me = this;

        config = initConfig(config);

        var context = platform.acquireContext(item, config);
        var canvas = context && context.canvas;
        var height = canvas && canvas.height;
        var width = canvas && canvas.width;

        me.id = helpers.uid();
        me.ctx = context;
        me.canvas = canvas;
        me.config = config;
        me.width = width;
        me.height = height;
        me.aspectRatio = height ? width / height : null;
        me.options = config.options;
        me._bufferedRender = false;
        me._layers = [];

        // Define alias to the config data: `chart.data === chart.config.data`
        me.data = me.config.data;

        if (!context || !canvas) {
            // The given item is not a compatible context2d element, let's return before finalizing
            // the chart initialization but after setting basic chart / controller properties that
            // can help to figure out that the chart is not valid (e.g chart.canvas !== null);
            // https://github.com/chartjs/Chart.js/issues/2807
            console.error("Failed to create chart: can't acquire context from the given item");
            return;
        }

        me.initialize();
        me.update();
    },

    /**
     * @private
     */
    initialize: function() {
        var me = this;

        // Before init plugin notification
        core_plugins.notify(me, 'beforeInit');

        helpers.retinaScale(me, me.options.devicePixelRatio);

        me.bindEvents();

        if (me.options.responsive) {
            // Initial resize before chart draws (must be silent to preserve initial animations).
            me.resize(true);
        }

        me.initToolTip();

        // After init plugin notification
        core_plugins.notify(me, 'afterInit');

        return me;
    },

    clear: function() {
        helpers.canvas.clear(this);
        return this;
    },

    stop: function() {
        // Stops any current animation loop occurring
        core_animations.cancelAnimation(this);
        return this;
    },

    resize: function(silent) {
        var me = this;
        var options = me.options;
        var canvas = me.canvas;
        var aspectRatio = (options.maintainAspectRatio && me.aspectRatio) || null;

        // the canvas render width and height will be casted to integers so make sure that
        // the canvas display style uses the same integer values to avoid blurring effect.

        // Set to 0 instead of canvas.size because the size defaults to 300x150 if the element is collapsed
        var newWidth = Max(0, Floor(helpers.getMaximumWidth(canvas)));
        var newHeight = Max(0, Floor(aspectRatio ? newWidth / aspectRatio : helpers.getMaximumHeight(canvas)));

        if (me.width === newWidth && me.height === newHeight) {
            return;
        }

        canvas.width = me.width = newWidth;
        canvas.height = me.height = newHeight;
        canvas.style.width = newWidth + 'px';
        canvas.style.height = newHeight + 'px';

        helpers.retinaScale(me, options.devicePixelRatio);

        if (!silent) {
            // Notify any plugins about the resize
            var newSize = {width: newWidth, height: newHeight};
            core_plugins.notify(me, 'resize', [newSize]);

            // Notify of resize
            if (options.onResize) {
                options.onResize(me, newSize);
            }

            me.stop();
            me.update({
                duration: options.responsiveAnimationDuration
            });
        }
    },

    /**
     * Builds a map of scale ID to scale object for future lookup.
     */
    buildOrUpdateScales: function() {
        var me = this;
        var options = me.options;
        var scales = me.scales || {};
        var items = [];
        var updated = Keys(scales).reduce(function(obj, id) {
            obj[id] = false;
            return obj;
        }, {});

        if (options.scales) {
            items = items.concat(
                (options.scales.xAxes || []).map(function(xAxisOptions) {
                    return {options: xAxisOptions, dtype: 'category', dposition: 'bottom'};
                }),
                (options.scales.yAxes || []).map(function(yAxisOptions) {
                    return {options: yAxisOptions, dtype: 'custom', dposition: 'left'};
                })
            );
        }

        helpers.each(items, function(item) {
            var scaleOptions = item.options;
            var id = scaleOptions.id;
            var scaleType = Undefined(scaleOptions.type, item.dtype);

            if (positionIsHorizontal(scaleOptions.position) !== positionIsHorizontal(item.dposition)) {
                scaleOptions.position = item.dposition;
            }

            updated[id] = true;
            var scale = null;
            if (id in scales && scales[id].type === scaleType) {
                scale = scales[id];
                scale.options = scaleOptions;
                scale.ctx = me.ctx;
                scale.chart = me;
            } else {
                var scaleClass = core_scaleService.getScaleConstructor(scaleType);
                if (!scaleClass) {
                    return;
                }
                scale = new scaleClass({
                    id: id,
                    type: scaleType,
                    options: scaleOptions,
                    ctx: me.ctx,
                    chart: me
                });
                scales[scale.id] = scale;
            }

            // TODO(SB): I think we should be able to remove this custom case (options.scale)
            // and consider it as a regular scale part of the "scales"" map only! This would
            // make the logic easier and remove some useless? custom code.
            if (item.isDefault) {
                me.scale = scale;
            }
        });
        // clear up discarded scales
        helpers.each(updated, function(hasUpdated, id) {
            if (!hasUpdated) {
                delete scales[id];
            }
        });

        me.scales = scales;

        core_scaleService.addScalesToLayout(this);
    },

    buildOrUpdateControllers: function() {
        var me = this;
        var newControllers = [];
        var datasets = me.data.datasets;
        var i, ilen;

        for (i = 0, ilen = datasets.length; i < ilen; i++) {
            var dataset = datasets[i];
            var meta = me.getDatasetMeta(i);

            meta.order = dataset.order || 0;
            meta.index = i;

            if (meta.controller) {
                meta.controller.updateIndex(i);
                meta.controller.linkScales();
            } else {
                var ControllerClass = controllers.line;
                meta.controller = new ControllerClass(me, i);
                newControllers.push(meta.controller);
            }
        }

        return newControllers;
    },

    /**
     * Reset the elements of all datasets
     * @private
     */
    resetElements: function() {
        var me = this;
        helpers.each(me.data.datasets, function(dataset, datasetIndex) {
            me.getDatasetMeta(datasetIndex).controller.reset();
        }, me);
    },

    /**
    * Resets the chart back to it's state before the initial animation
    */
    reset: function() {
        this.resetElements();
        this.tooltip.initialize();
    },

    update: function(config={}) {
        var me = this;
        var i, ilen;
        updateConfig(me);

        // plugins options references might have change, let's invalidate the cache
        // https://github.com/chartjs/Chart.js/issues/5111#issuecomment-355934167
        core_plugins._invalidate(me);

        if (core_plugins.notify(me, 'beforeUpdate') === false) {
            return;
        }

        // In case the entire data object changed
        me.tooltip._data = me.data;

        // Make sure dataset controllers are updated and new controllers are reset
        var newControllers = me.buildOrUpdateControllers();

        // Make sure all dataset controllers have correct meta data counts
        for (i = 0, ilen = me.data.datasets.length; i < ilen; i++) {
            me.getDatasetMeta(i).controller.buildOrUpdateElements();
        }

        me.updateLayout();

        // Can only reset the new controllers after the scales have been updated
        if (me.options.animation && me.options.animation.duration) {
            helpers.each(newControllers, function(controller) {
                controller.reset();
            });
        }

        me.updateDatasets();

        // Need to reset tooltip in case it is displayed with elements that are removed
        // after update.
        me.tooltip.initialize();

        // Last active contains items that were previously in the tooltip.
        // When we reset the tooltip, we need to clear it
        me.lastActive = [];

        // Do this before render so that any plugins that need final scale updates can use it
        core_plugins.notify(me, 'afterUpdate');

        me._layers.sort(compare2Level('z', '_idx'));

        if (me._bufferedRender) {
            me._bufferedRequest = {
                duration: config.duration,
                easing: config.easing,
                lazy: config.lazy
            };
        } else {
            me.render(config);
        }
    },

    /**
     * Updates the chart layout unless a plugin returns `false` to the `beforeLayout`
     * hook, in which case, plugins will not be called on `afterLayout`.
     * @private
     */
    updateLayout: function() {
        var me = this;

        if (core_plugins.notify(me, 'beforeLayout') === false) {
            return;
        }

        core_layouts.update(this, this.width, this.height);

        me._layers = [];
        for (let box of me.boxes || []) {
            // _configure is called twice, once in core.scale.update and once here.
            // Here the boxes are fully updated and at their final positions.
            if (box._configure) {
                box._configure();
            }
            me._layers.push.apply(me._layers, box._layers());
        }

        me._layers.forEach(function(item, index) {
            item._idx = index;
        });
    },

    /**
     * Updates all datasets unless a plugin returns `false` to the `beforeDatasetsUpdate`
     * hook, in which case, plugins will not be called on `afterDatasetsUpdate`.
     * @private
     */
    updateDatasets: function() {
        var me = this;

        if (core_plugins.notify(me, 'beforeDatasetsUpdate') === false) {
            return;
        }

        for (var i = 0, ilen = me.data.datasets.length; i < ilen; ++i) {
            me.updateDataset(i);
        }

        core_plugins.notify(me, 'afterDatasetsUpdate');
    },

    /**
     * Updates dataset at index unless a plugin returns `false` to the `beforeDatasetUpdate`
     * hook, in which case, plugins will not be called on `afterDatasetUpdate`.
     * @private
     */
    updateDataset: function(index) {
        var me = this;
        var meta = me.getDatasetMeta(index);
        var args = {
            meta: meta,
            index: index
        };

        if (core_plugins.notify(me, 'beforeDatasetUpdate', [args]) === false) {
            return;
        }

        meta.controller._update();

        core_plugins.notify(me, 'afterDatasetUpdate', [args]);
    },

    render: function(config={}) {
        var me = this;
        var animationOptions = me.options.animation;
        var duration = Undefined(config.duration, animationOptions && animationOptions.duration);
        var lazy = config.lazy;

        if (core_plugins.notify(me, 'beforeRender') === false) {
            return;
        }

        var onComplete = function(animation) {
            core_plugins.notify(me, 'afterRender');
            helpers.callback(animationOptions && animationOptions.onComplete, [animation], me);
        };

        if (animationOptions && duration) {
            var animation = new core_animation({
                numSteps: duration / 16.66, // 60 fps
                easing: config.easing || animationOptions.easing,

                render: function(chart, animationObject) {
                    var easingFunction = helpers.easing.effects[animationObject.easing];
                    var currentStep = animationObject.currentStep;
                    var stepDecimal = currentStep / animationObject.numSteps;

                    chart.draw(easingFunction(stepDecimal), stepDecimal, currentStep);
                },

                onAnimationProgress: animationOptions.onProgress,
                onAnimationComplete: onComplete
            });

            core_animations.addAnimation(me, animation, duration, lazy);
        } else {
            me.draw();

            // See https://github.com/chartjs/Chart.js/issues/3781
            onComplete(new core_animation({numSteps: 0, chart: me}));
        }

        return me;
    },

    draw: function(easingValue) {
        var me = this;
        var i, layers;

        me.clear();

        if (easingValue == null) {
            easingValue = 1;
        }

        me.transition(easingValue);

        if (me.width <= 0 || me.height <= 0) {
            return;
        }

        if (core_plugins.notify(me, 'beforeDraw', [easingValue]) === false) {
            return;
        }

        // Because of plugin hooks (before/afterDatasetsDraw), datasets can't
        // currently be part of layers. Instead, we draw
        // layers <= 0 before(default, backward compat), and the rest after
        layers = me._layers;
        for (i = 0; i < layers.length && layers[i].z <= 0; ++i) {
            layers[i].draw(me.chartArea);
        }

        me.drawDatasets(easingValue);

        // Rest of layers
        for (; i < layers.length; ++i) {
            layers[i].draw(me.chartArea);
        }

        me._drawTooltip(easingValue);

        core_plugins.notify(me, 'afterDraw', [easingValue]);
    },

    /**
     * @private
     */
    transition: function(easingValue) {
        var me = this;

        for (var i = 0, ilen = (me.data.datasets || []).length; i < ilen; ++i) {
            if (me.isDatasetVisible(i)) {
                me.getDatasetMeta(i).controller.transition(easingValue);
            }
        }

        me.tooltip.transition(easingValue);
    },

    /**
     * @private
     */
    _getSortedDatasetMetas: function(filterVisible) {
        var me = this;
        var datasets = me.data.datasets || [];
        var result = [];
        var i, ilen;

        for (i = 0, ilen = datasets.length; i < ilen; ++i) {
            if (!filterVisible || me.isDatasetVisible(i)) {
                result.push(me.getDatasetMeta(i));
            }
        }

        result.sort(compare2Level('order', 'index'));

        return result;
    },

    /**
     * @private
     */
    _getSortedVisibleDatasetMetas: function() {
        return this._getSortedDatasetMetas(true);
    },

    /**
     * Draws all datasets unless a plugin returns `false` to the `beforeDatasetsDraw`
     * hook, in which case, plugins will not be called on `afterDatasetsDraw`.
     * @private
     */
    drawDatasets: function(easingValue) {
        var me = this;
        var metasets, i;

        if (core_plugins.notify(me, 'beforeDatasetsDraw', [easingValue]) === false) {
            return;
        }

        metasets = me._getSortedVisibleDatasetMetas();
        for (i = metasets.length - 1; i >= 0; --i) {
            me.drawDataset(metasets[i], easingValue);
        }

        core_plugins.notify(me, 'afterDatasetsDraw', [easingValue]);
    },

    /**
     * Draws dataset at index unless a plugin returns `false` to the `beforeDatasetDraw`
     * hook, in which case, plugins will not be called on `afterDatasetDraw`.
     * @private
     */
    drawDataset: function(meta, easingValue) {
        var me = this;
        var args = {
            meta: meta,
            index: meta.index,
            easingValue: easingValue
        };

        if (core_plugins.notify(me, 'beforeDatasetDraw', [args]) === false) {
            return;
        }

        meta.controller.draw(easingValue);

        core_plugins.notify(me, 'afterDatasetDraw', [args]);
    },

    /**
     * Draws tooltip unless a plugin returns `false` to the `beforeTooltipDraw`
     * hook, in which case, plugins will not be called on `afterTooltipDraw`.
     * @private
     */
    _drawTooltip: function(easingValue) {
        var me = this;
        var tooltip = me.tooltip;
        var args = {
            tooltip: tooltip,
            easingValue: easingValue
        };

        if (core_plugins.notify(me, 'beforeTooltipDraw', [args]) === false) {
            return;
        }

        tooltip.draw();

        core_plugins.notify(me, 'afterTooltipDraw', [args]);
    },

    /**
     * Get the single element that was clicked on
     * @returns {Object} An object containing the dataset index and element index of the matching element. Also contains the rectangle that was draw
     */
    getElementAtEvent: function(e) {
        return core_interaction.modes.single(this, e);
    },

    getElementsAtEvent: function(e) {
        return core_interaction.modes.label(this, e, {intersect: true});
    },

    getElementsAtXAxis: function(e) {
        return core_interaction.modes.x_axis(this, e, {intersect: true});
    },

    getElementsAtEventForMode: function(e, mode, options) {
        var method = core_interaction.modes[mode];
        if (IsFunction(method))
            return method(this, e, options);

        return [];
    },

    getDatasetAtEvent: function(e) {
        return core_interaction.modes.dataset(this, e, {intersect: true});
    },

    getDatasetMeta: function(datasetIndex) {
        var me = this;
        var dataset = me.data.datasets[datasetIndex];
        if (!dataset._meta) {
            dataset._meta = {};
        }

        var meta = dataset._meta[me.id];
        if (!meta) {
            meta = dataset._meta[me.id] = {
                type: null,
                data: [],
                dataset: null,
                controller: null,
                hidden: null,			// See isDatasetVisible() comment
                xAxisID: null,
                yAxisID: null,
                order: dataset.order || 0,
                index: datasetIndex
            };
        }

        return meta;
    },

    getVisibleDatasetCount: function() {
        var count = 0;
        for (var i = 0, ilen = this.data.datasets.length; i < ilen; ++i) {
            if (this.isDatasetVisible(i)) {
                count++;
            }
        }
        return count;
    },

    isDatasetVisible: function(datasetIndex) {
        var meta = this.getDatasetMeta(datasetIndex);

        // meta.hidden is a per chart dataset hidden flag override with 3 states: if true or false,
        // the dataset.hidden value is ignored, else if null, the dataset hidden state is returned.
        return typeof meta.hidden === 'boolean' ? !meta.hidden : !this.data.datasets[datasetIndex].hidden;
    },

    generateLegend: function() {
        return this.options.legendCallback(this);
    },

    /**
     * @private
     */
    destroyDatasetMeta: function(datasetIndex) {
        var id = this.id;
        var dataset = this.data.datasets[datasetIndex];
        var meta = dataset._meta && dataset._meta[id];

        if (meta) {
            meta.controller.destroy();
            delete dataset._meta[id];
        }
    },

    destroy: function() {
        var me = this;
        var canvas = me.canvas;
        var i, ilen;

        me.stop();

        // dataset controllers need to cleanup associated data
        for (i = 0, ilen = me.data.datasets.length; i < ilen; ++i) {
            me.destroyDatasetMeta(i);
        }

        if (canvas) {
            me.unbindEvents();
            helpers.canvas.clear(me);
            platform.releaseContext(me.ctx);
            me.canvas = null;
            me.ctx = null;
        }

        core_plugins.notify(me, 'destroy');
    },

    toBase64Image: function() {
        return this.canvas.toDataURL.apply(this.canvas, arguments);
    },

    initToolTip: function() {
        var me = this;
        me.tooltip = new core_tooltip({
            _chart: me,
            _data: me.data,
            _options: me.options.tooltips
        }, me);
    },

    /**
     * @private
     */
    bindEvents: function() {
        var me = this;
        var listeners = me._listeners = {};
        var listener = function() {
            me.eventHandler.apply(me, arguments);
        };

        helpers.each(me.options.events, function(type) {
            platform.addEventListener(me, type, listener);
            listeners[type] = listener;
        });

        // Elements used to detect size change should not be injected for non responsive charts.
        // See https://github.com/chartjs/Chart.js/issues/2210
        if (me.options.responsive) {
            listener = function() {
                me.resize();
            };

            platform.addEventListener(me, 'resize', listener);
            listeners.resize = listener;
        }
    },

    /**
     * @private
     */
    unbindEvents: function() {
        var me = this;
        var listeners = me._listeners;
        if (!listeners) {
            return;
        }

        delete me._listeners;
        helpers.each(listeners, function(listener, type) {
            platform.removeEventListener(me, type, listener);
        });
    },

    updateHoverStyle: function(elements, mode, enabled) {
        var prefix = enabled ? 'set' : 'remove';
        var element, i, ilen;

        for (i = 0, ilen = elements.length; i < ilen; ++i) {
            element = elements[i];
            if (element) {
                this.getDatasetMeta(element._datasetIndex).controller[prefix + 'HoverStyle'](element);
            }
        }

        if (mode === 'dataset') {
            this.getDatasetMeta(elements[0]._datasetIndex).controller['_' + prefix + 'DatasetHoverStyle']();
        }
    },

    /**
     * @private
     */
    eventHandler: function(e) {
        var me = this;
        var tooltip = me.tooltip;

        if (core_plugins.notify(me, 'beforeEvent', [e]) === false) {
            return;
        }

        // Buffer any update calls so that renders do not occur
        me._bufferedRender = true;
        me._bufferedRequest = null;

        var changed = me.handleEvent(e);
        // for smooth tooltip animations issue #4989
        // the tooltip should be the source of change
        // Animation check workaround:
        // tooltip._start will be null when tooltip isn't animating
        if (tooltip) {
            changed = tooltip._start
                ? tooltip.handleEvent(e)
                : changed | tooltip.handleEvent(e);
        }

        core_plugins.notify(me, 'afterEvent', [e]);

        var bufferedRequest = me._bufferedRequest;
        if (bufferedRequest) {
            // If we have an update that was triggered, we need to do a normal render
            me.render(bufferedRequest);
        } else if (changed && !me.animating) {
            // If entering, leaving, or changing elements, animate the change via pivot
            me.stop();

            // We only need to render at this point. Updating will cause scales to be
            // recomputed generating flicker & using more memory than necessary.
            me.render({
                duration: me.options.hover.animationDuration,
                lazy: true
            });
        }

        me._bufferedRender = false;
        me._bufferedRequest = null;

        return me;
    },

    /**
     * Handle an event
     * @private
     * @param {IEvent} event the event to handle
     * @returns {boolean} true if the chart needs to re-render
     */
    handleEvent: function(e) {
        var me = this;
        var options = me.options || {};
        var hoverOptions = options.hover;
        var changed = false;

        me.lastActive = me.lastActive || [];

        // Find Active Elements for hover and tooltips
        if (e.type === 'mouseout') {
            me.active = [];
        } else {
            me.active = me.getElementsAtEventForMode(e, hoverOptions.mode, hoverOptions);
        }

        // Invoke onHover hook
        // Need to call with native event here to not break backwards compatibility
        helpers.callback(options.onHover || options.hover.onHover, [e.native, me.active], me);

        if (e.type === 'mouseup' || e.type === 'click') {
            if (options.onClick) {
                // Use e.native here for backwards compatibility
                options.onClick.call(me, e.native, me.active);
            }
        }

        // Remove styling for last active (even if it may still be active)
        if (me.lastActive.length) {
            me.updateHoverStyle(me.lastActive, hoverOptions.mode, false);
        }

        // Built in hover styling
        if (me.active.length && hoverOptions.mode) {
            me.updateHoverStyle(me.active, hoverOptions.mode, true);
        }

        changed = !helpers.arrayEquals(me.active, me.lastActive);

        // Remember Last Actives
        me.lastActive = me.active;

        return changed;
    }
});

var core_controller = Chart;

var core_helpers = function() {

    // -- Basic js utility methods

    helpers.where = function(collection, filterCallback) {
        if (IsArray(collection) && Array.prototype.filter) {
            return collection.filter(filterCallback);
        }
        var filtered = [];

        helpers.each(collection, function(item) {
            if (filterCallback(item)) {
                filtered.push(item);
            }
        });

        return filtered;
    };
    helpers.findIndex = Array.prototype.findIndex ?
        function(array, callback, scope) {
            return array.findIndex(callback, scope);
        } :
        function(array, callback, scope) {
            scope = scope === undefined ? array : scope;
            for (var i = 0, ilen = array.length; i < ilen; ++i) {
                if (callback.call(scope, array[i], i, array)) {
                    return i;
                }
            }
            return -1;
        };
    helpers.findNextWhere = function(arrayToSearch, filterCallback, startIndex) {
        // Default to start of the array
        if (startIndex == null) {
            startIndex = -1;
        }
        for (var i = startIndex + 1; i < arrayToSearch.length; i++) {
            var currentItem = arrayToSearch[i];
            if (filterCallback(currentItem)) {
                return currentItem;
            }
        }
    };
    helpers.findPreviousWhere = function(arrayToSearch, filterCallback, startIndex) {
        // Default to end of the array
        if (startIndex == null) {
            startIndex = arrayToSearch.length;
        }
        for (var i = startIndex - 1; i >= 0; i--) {
            var currentItem = arrayToSearch[i];
            if (filterCallback(currentItem)) {
                return currentItem;
            }
        }
    };

    // -- Math methods
    helpers.isNumber = function(n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
    };
    helpers.almostEquals = function(x, y, epsilon) {
        return Abs(x - y) < epsilon;
    };
    helpers.almostWhole = function(x, epsilon) {
        var rounded = Round(x);
        return ((rounded - epsilon) <= x) && ((rounded + epsilon) >= x);
    };
    helpers.toRadians = function(degrees) {
        return degrees * (PI / 180);
    };
    helpers.toDegrees = function(radians) {
        return radians * (180 / PI);
    };

    /**
     * Returns the number of decimal places
     * i.e. the number of digits after the decimal point, of the value of this Number.
     * @param {number} x - A number.
     * @returns {number} The number of decimal places.
     * @private
     */
    helpers._decimalPlaces = function(x) {
        if (!helpers.isFinite(x)) {
            return;
        }
        var e = 1;
        var p = 0;
        while (Round(x * e) / e !== x) {
            e *= 10;
            p++;
        }
        return p;
    };

    helpers.distanceBetweenPoints = function(pt1, pt2) {
        return Sqrt(Pow(pt2.x - pt1.x, 2) + Pow(pt2.y - pt1.y, 2));
    };

    /**
     * Returns the aligned pixel value to avoid anti-aliasing blur
     * @param {Chart} chart - The chart instance.
     * @param {number} pixel - A pixel value.
     * @param {number} width - The width of the element.
     * @returns {number} The aligned pixel value.
     * @private
     */
    helpers._alignPixel = function(chart, pixel, width) {
        var devicePixelRatio = chart.currentDevicePixelRatio;
        var halfWidth = width / 2;
        return Round((pixel - halfWidth) * devicePixelRatio) / devicePixelRatio + halfWidth;
    };

    helpers.splineCurve = function(firstPoint, middlePoint, afterPoint, t) {
        // Props to Rob Spencer at scaled innovation for his post on splining between points
        // http://scaledinnovation.com/analytics/splines/aboutSplines.html

        // This function must also respect "skipped" points

        var previous = firstPoint.skip ? middlePoint : firstPoint;
        var current = middlePoint;
        var next = afterPoint.skip ? middlePoint : afterPoint;

        var d01 = Sqrt(Pow(current.x - previous.x, 2) + Pow(current.y - previous.y, 2));
        var d12 = Sqrt(Pow(next.x - current.x, 2) + Pow(next.y - current.y, 2));

        var s01 = d01 / (d01 + d12);
        var s12 = d12 / (d01 + d12);

        // If all points are the same, s01 & s02 will be inf
        s01 = isNaN(s01) ? 0 : s01;
        s12 = isNaN(s12) ? 0 : s12;

        var fa = t * s01; // scaling factor for triangle Ta
        var fb = t * s12;

        return {
            previous: {
                x: current.x - fa * (next.x - previous.x),
                y: current.y - fa * (next.y - previous.y)
            },
            next: {
                x: current.x + fb * (next.x - previous.x),
                y: current.y + fb * (next.y - previous.y)
            }
        };
    };
    helpers.EPSILON = Number.EPSILON || 1e-14;
    helpers.nextItem = function(collection, index, loop) {
        if (loop) {
            return index >= collection.length - 1 ? collection[0] : collection[index + 1];
        }
        return index >= collection.length - 1 ? collection[collection.length - 1] : collection[index + 1];
    };
    helpers.previousItem = function(collection, index, loop) {
        if (loop) {
            return index <= 0 ? collection[collection.length - 1] : collection[index - 1];
        }
        return index <= 0 ? collection[0] : collection[index - 1];
    };
    // Implementation of the nice number algorithm used in determining where axis labels will go
    helpers.niceNum = function(range, round) {
        var exponent = Floor(Log10(range));
        var fraction = range / Pow(10, exponent);
        var niceFraction;

        if (round) {
            if (fraction < 1.5) {
                niceFraction = 1;
            } else if (fraction < 3) {
                niceFraction = 2;
            } else if (fraction < 7) {
                niceFraction = 5;
            } else {
                niceFraction = 10;
            }
        } else if (fraction <= 1.0) {
            niceFraction = 1;
        } else if (fraction <= 2) {
            niceFraction = 2;
        } else if (fraction <= 5) {
            niceFraction = 5;
        } else {
            niceFraction = 10;
        }

        return niceFraction * Pow(10, exponent);
    };

    // -- DOM methods
    helpers.getRelativePosition = function(evt, chart) {
        var mouseX, mouseY;
        var e = evt.originalEvent || evt;
        var canvas = evt.target || evt.srcElement;
        var boundingRect = canvas.getBoundingClientRect();

        var touches = e.touches;
        if (touches && touches.length > 0) {
            mouseX = touches[0].clientX;
            mouseY = touches[0].clientY;

        } else {
            mouseX = e.clientX;
            mouseY = e.clientY;
        }

        // Scale mouse coordinates into canvas coordinates
        // by following the pattern laid out by 'jerryj' in the comments of
        // https://www.html5canvastutorials.com/advanced/html5-canvas-mouse-coordinates/
        var paddingLeft = parseFloat(helpers.getStyle(canvas, 'padding-left'));
        var paddingTop = parseFloat(helpers.getStyle(canvas, 'padding-top'));
        var paddingRight = parseFloat(helpers.getStyle(canvas, 'padding-right'));
        var paddingBottom = parseFloat(helpers.getStyle(canvas, 'padding-bottom'));
        var width = boundingRect.right - boundingRect.left - paddingLeft - paddingRight;
        var height = boundingRect.bottom - boundingRect.top - paddingTop - paddingBottom;

        // We divide by the current device pixel ratio, because the canvas is scaled up by that amount in each direction. However
        // the backend model is in unscaled coordinates. Since we are going to deal with our model coordinates, we go back here
        mouseX = Round((mouseX - boundingRect.left - paddingLeft) / (width) * canvas.width / chart.currentDevicePixelRatio);
        mouseY = Round((mouseY - boundingRect.top - paddingTop) / (height) * canvas.height / chart.currentDevicePixelRatio);

        return {
            x: mouseX,
            y: mouseY
        };

    };

    // Private helper function to convert max-width/max-height values that may be percentages into a number
    function parseMaxStyle(styleValue, node, parentProperty) {
        var valueInPixels;
        if (IsString(styleValue)) {
            valueInPixels = parseInt(styleValue, 10);

            if (styleValue.indexOf('%') !== -1) {
                // percentage * size in dimension
                valueInPixels = valueInPixels / 100 * node.parentNode[parentProperty];
            }
        } else {
            valueInPixels = styleValue;
        }

        return valueInPixels;
    }

    /**
     * Returns if the given value contains an effective constraint.
     * @private
     */
    function isConstrainedValue(value) {
        return value !== undefined && value !== null && value !== 'none';
    }

    /**
     * Returns the max width or height of the given DOM node in a cross-browser compatible fashion
     * @param {HTMLElement} domNode - the node to check the constraint on
     * @param {string} maxStyle - the style that defines the maximum for the direction we are using ('max-width' / 'max-height')
     * @param {string} percentageProperty - property of parent to use when calculating width as a percentage
     * @see {@link https://www.nathanaeljones.com/blog/2013/reading-max-width-cross-browser}
     */
    function getConstraintDimension(domNode, maxStyle, percentageProperty) {
        var view = document.defaultView;
        var parentNode = helpers._getParentNode(domNode);
        var constrainedNode = view.getComputedStyle(domNode)[maxStyle];
        var constrainedContainer = view.getComputedStyle(parentNode)[maxStyle];
        var hasCNode = isConstrainedValue(constrainedNode);
        var hasCContainer = isConstrainedValue(constrainedContainer);
        var infinity = Number.POSITIVE_INFINITY;

        if (hasCNode || hasCContainer) {
            return Min(
                hasCNode ? parseMaxStyle(constrainedNode, domNode, percentageProperty) : infinity,
                hasCContainer ? parseMaxStyle(constrainedContainer, parentNode, percentageProperty) : infinity);
        }

        return 'none';
    }
    // returns Number or undefined if no constraint
    helpers.getConstraintWidth = function(domNode) {
        return getConstraintDimension(domNode, 'max-width', 'clientWidth');
    };
    // returns Number or undefined if no constraint
    helpers.getConstraintHeight = function(domNode) {
        return getConstraintDimension(domNode, 'max-height', 'clientHeight');
    };
    /**
     * @private
         */
    helpers._calculatePadding = function(container, padding, parentDimension) {
        padding = helpers.getStyle(container, padding);

        return padding.indexOf('%') > -1 ? parentDimension * parseInt(padding, 10) / 100 : parseInt(padding, 10);
    };
    /**
     * @private
     */
    helpers._getParentNode = function(domNode) {
        var parent = domNode.parentNode;
        if (parent && parent.toString() === '[object ShadowRoot]') {
            parent = parent.host;
        }
        return parent;
    };
    helpers.getMaximumWidth = function(domNode) {
        var container = helpers._getParentNode(domNode);
        if (!container) {
            return domNode.clientWidth;
        }

        var clientWidth = container.clientWidth;
        var paddingLeft = helpers._calculatePadding(container, 'padding-left', clientWidth);
        var paddingRight = helpers._calculatePadding(container, 'padding-right', clientWidth);

        var w = clientWidth - paddingLeft - paddingRight;
        var cw = helpers.getConstraintWidth(domNode);
        return isNaN(cw) ? w : Min(w, cw);
    };
    helpers.getMaximumHeight = function(domNode) {
        var container = helpers._getParentNode(domNode);
        if (!container) {
            return domNode.clientHeight;
        }

        var clientHeight = container.clientHeight;
        var paddingTop = helpers._calculatePadding(container, 'padding-top', clientHeight);
        var paddingBottom = helpers._calculatePadding(container, 'padding-bottom', clientHeight);

        var h = clientHeight - paddingTop - paddingBottom;
        var ch = helpers.getConstraintHeight(domNode);
        return isNaN(ch) ? h : Min(h, ch);
    };
    helpers.getStyle = function(el, property) {
        return el.currentStyle ?
            el.currentStyle[property] :
            document.defaultView.getComputedStyle(el, null).getPropertyValue(property);
    };
    helpers.retinaScale = function(chart, forceRatio) {
        var pixelRatio = chart.currentDevicePixelRatio = forceRatio || (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
        if (pixelRatio === 1) {
            return;
        }

        var canvas = chart.canvas;
        var height = chart.height;
        var width = chart.width;

        canvas.height = height * pixelRatio;
        canvas.width = width * pixelRatio;
        chart.ctx.scale(pixelRatio, pixelRatio);

        // If no style has been set on the canvas, the render size is used as display size,
        // making the chart visually bigger, so let's enforce it to the "correct" values.
        // See https://github.com/chartjs/Chart.js/issues/3575
        if (!canvas.style.height && !canvas.style.width) {
            canvas.style.height = height + 'px';
            canvas.style.width = width + 'px';
        }
    };
    // -- Canvas methods
    helpers.fontString = function(pixelSize, fontStyle, fontFamily) {
        return fontStyle + ' ' + pixelSize + 'px ' + fontFamily;
    };

    helpers.measureText = function(ctx, data, gc, longest, string) {
        var textWidth = data[string];
        if (!textWidth) {
            textWidth = data[string] = ctx.measureText(string).width;
            gc.push(string);
        }
        if (textWidth > longest) {
            longest = textWidth;
        }
        return longest;
    };

    helpers.color = !chartjsColor ?
        function(value) {
            console.error('Color.js not found!');
            return value;
        } :
        function(value) {
            /* global CanvasGradient */
            if (value instanceof CanvasGradient) {
                value = core_defaults.global.defaultColor;
            }

            return chartjsColor(value);
        };

    helpers.getHoverColor = function(colorValue) {
        return colorValue;
    };
};

/**
 * Namespace to hold static tick generation functions
 * @namespace Chart.Ticks
 */
var core_ticks = {
    formatters: {}
};

function valueAtIndexOrDefault(value, index, defaultValue) {
    return Undefined(IsArray(value) ? value[index] : value, defaultValue);
}

Merge(core_defaults, {
    scale: {
        display: true,
        position: 'left',
        offset: false,

        // grid line settings
        gridLines: {
            display: true,
            color: 'rgba(0,0,0,0.1)',
            lineWidth: 1,
            drawBorder: true,
            drawOnChartArea: true,
            drawTicks: true,
            tickMarkLength: 10,
            zeroLineWidth: 1,
            zeroLineColor: 'rgba(0,0,0,0.25)',
            zeroLineBorderDash: [],
            zeroLineBorderDashOffset: 0.0,
            offsetGridLines: false,
            borderDash: [],
            borderDashOffset: 0.0,
        },

        // scale label
        scaleLabel: {
            // display property
            display: false,

            // actual label
            labelString: '',

            // top/bottom padding
            padding: {
                top: 4,
                bottom: 4,
            },
        },

        // label settings
        ticks: {
            beginAtZero: false,
            minRotation: 0,
            maxRotation: 50,
            mirror: false,
            padding: 0,
            reverse: false,
            display: true,
            autoSkip: true,
            autoSkipPadding: 0,
            labelOffset: 0,
            minor: {},
        },
    },
});

/** Returns a new array containing numItems from arr */
function sample(arr, numItems) {
    var result = [];
    var increment = arr.length / numItems;
    var i = 0;
    var len = arr.length;

    for (; i < len; i += increment) {
        result.push(arr[Floor(i)]);
    }
    return result;
}

function getPixelForGridLine(scale, index, offsetGridLines) {
    var length = scale.getTicks().length;
    var validIndex = Min(index, length - 1);
    var lineValue = scale.getPixelForTick(validIndex);
    var start = scale._startPixel;
    var end = scale._endPixel;
    var epsilon = 1e-6; // 1e-6 is margin in pixels for accumulated error.
    var offset;

    if (offsetGridLines) {
        if (length === 1) {
            offset = Max(lineValue - start, end - lineValue);
        } else if (index === 0) {
            offset = (scale.getPixelForTick(1) - lineValue) / 2;
        } else {
            offset = (lineValue - scale.getPixelForTick(validIndex - 1)) / 2;
        }
        lineValue += validIndex < index ? offset : -offset;

        // Return undefined if the pixel is out of the range
        if (lineValue < start - epsilon || lineValue > end + epsilon) {
            return;
        }
    }
    return lineValue;
}

function garbageCollect(caches, length) {
    helpers.each(caches, function(cache) {
        var gc = cache.gc;
        var gcLen = gc.length / 2;
        var i;
        if (gcLen > length) {
            for (i = 0; i < gcLen; ++i) {
                delete cache.data[gc[i]];
            }
            gc.splice(0, gcLen);
        }
    });
}

/**
 * Returns {width, height, offset} objects for the first, last, widest, highest tick
 * labels where offset indicates the anchor point offset from the top in pixels.
 */
function computeLabelSizes(ctx, tickFonts, ticks, caches) {
    let length = ticks.length,
        offsets = [],
        heights = [],
        widths = [];

    // speed boost
    let tickFont = tickFonts.minor,
        fontString = tickFont.string,
        cache = caches[fontString] = caches[fontString] || {data: {}, gc: []},
        lineHeight = tickFont.lineHeight + 8;
    ctx.font = fontString;

    for (let i = 0; i < length; ++i) {
        let label = ticks[i].label,
            height = 0,
            width = 0;
        // Undefined labels and arrays should not be measured
        if (label != null && !IsArray(label)) {
            width = helpers.measureText(ctx, cache.data, cache.gc, width, label);
            height = lineHeight;
        }
        else if (IsArray(label)) {
            // if it is an array let's measure each element
            for (let j = 0, jlen = label.length; j < jlen; ++j) {
                let nestedLabel = label[j];
                // Undefined labels and arrays should not be measured
                if (nestedLabel != null && !IsArray(nestedLabel)) {
                    width = helpers.measureText(ctx, cache.data, cache.gc, width, nestedLabel);
                    height += lineHeight;
                }
            }
        }
        widths.push(width);
        heights.push(height);
        offsets.push(lineHeight / 2);
    }
    garbageCollect(caches, length);

    let widest = widths.indexOf(Max.apply(null, widths)),
        highest = heights.indexOf(Max.apply(null, heights));

    function valueAt(idx) {
        return {
            width: widths[idx] || 0,
            height: heights[idx] || 0,
            offset: offsets[idx] || 0
        };
    }

    return {
        first: valueAt(0),
        last: valueAt(length - 1),
        widest: valueAt(widest),
        highest: valueAt(highest)
    };
}

function getTickMarkLength(options) {
    return options.drawTicks ? options.tickMarkLength : 0;
}

function getScaleLabelHeight(options) {
    var font, padding;

    if (!options.display) {
        return 0;
    }

    font = helpers.options._parseFont(options);
    padding = helpers.options.toPadding(options.padding);

    return font.lineHeight + padding.height;
}

function parseFontOptions(options, nestedOpts) {
    return Assign(helpers.options._parseFont({
        fontFamily: Undefined(nestedOpts.fontFamily, options.fontFamily),
        fontSize: Undefined(nestedOpts.fontSize, options.fontSize),
        fontStyle: Undefined(nestedOpts.fontStyle, options.fontStyle),
        lineHeight: Undefined(nestedOpts.lineHeight, options.lineHeight)
    }), {
        color: helpers.options.resolve([nestedOpts.fontColor, options.fontColor, core_defaults.global.defaultFontColor])
    });
}

function parseTickFontOptions(options) {
    var minor = parseFontOptions(options, options.minor);
    return {minor: minor};
}

function nonSkipped(ticksToFilter) {
    var filtered = [];
    var item, index, len;
    for (index = 0, len = ticksToFilter.length; index < len; ++index) {
        item = ticksToFilter[index];
        if (typeof item._index !== 'undefined') {
            filtered.push(item);
        }
    }
    return filtered;
}

function getEvenSpacing(arr) {
    var len = arr.length;
    var i, diff;

    if (len < 2) {
        return false;
    }

    for (diff = arr[0], i = 1; i < len; ++i) {
        if (arr[i] - arr[i - 1] !== diff) {
            return false;
        }
    }
    return diff;
}

function skip(ticks, spacing) {
    let start = 0,
        end = ticks.length,
        prunes = new Set(),
        zero = 0;

    // 1) find zero
    for (let i = Max(start, 0); i < end; i ++) {
        let tick = ticks[i];
        if (tick.value == 0) {
            zero = i;
            break;
        }
    }

    spacing = Ceil(spacing);

    // 2) check below 0
    for (let i = 0, next = zero; next >= 0; i --) {
        let tick = ticks[next];
        if (tick)
            prunes.add(next);
        next = Round(zero + i * spacing);
    }

    // 3) check above 0
    for (let i = 1, next = zero; i < end; i ++) {
        next = Round(zero + i * spacing);
        let tick = ticks[next];
        if (tick)
            prunes.add(next);
    }

    // 3) result
    ticks.forEach((tick, i) => {
        if (prunes.has(i))
            tick._index = i;
        else
            tick.label = null;
    });
}

var Scale = Element.extend({
    /**
     * Get the padding needed for the scale
     * @method getPadding
     * @private
     * @returns {Padding} the necessary padding
     */
    getPadding: function() {
        var me = this;
        return {
            left: me.paddingLeft || 0,
            top: me.paddingTop || 0,
            right: me.paddingRight || 0,
            bottom: me.paddingBottom || 0
        };
    },

    /**
     * Returns the scale tick objects ({label})
     * @since 2.7
     */
    getTicks: function() {
        return this._ticks;
    },

    /**
    * @private
    */
    _getLabels: function() {
        var data = this.chart.data;
        return this.options.labels || (this.isHorizontal() ? data.xLabels : data.yLabels) || data.labels || [];
    },

    // These methods are ordered by lifecyle. Utilities then follow.
    // Any function defined here is inherited by all scale types.
    // Any function can be extended by the scale type

    beforeUpdate: function() {
        helpers.callback(this.options.beforeUpdate, [this]);
    },

    /**
     * @param {number} maxWidth - the max width in pixels
     * @param {number} maxHeight - the max height in pixels
     * @param {Object} margins - the space between the edge of the other scales and edge of the chart
     *   This space comes from two sources:
     *     - padding - space that's required to show the labels at the edges of the scale
     *     - thickness of scales or legends in another orientation
     */
    update: function(maxWidth, maxHeight, margins) {
        var me = this;
        var tickOpts = me.options.ticks;
        var sampleSize = tickOpts.sampleSize;
        var i, ilen, labels, ticks, samplingEnabled;

        // Update Lifecycle - Probably don't want to ever extend or overwrite this function ;)
        me.beforeUpdate();

        // Absorb the master measurements
        me.maxWidth = maxWidth;
        me.maxHeight = maxHeight;
        me.margins = Assign({
            left: 0,
            right: 0,
            top: 0,
            bottom: 0
        }, margins);

        me._ticks = null;
        me.ticks = null;
        me._labelSizes = null;
        me._maxLabelLines = 0;
        me.longestLabelWidth = 0;
        me.longestTextCache = me.longestTextCache || {};
        me._gridLineItems = null;
        me._labelItems = null;

        // Dimensions
        me.beforeSetDimensions();
        me.setDimensions();
        me.afterSetDimensions();

        // Data min/max
        me.beforeDataLimits();
        me.determineDataLimits();
        me.afterDataLimits();

        // Ticks - `this.ticks` is now DEPRECATED!
        // Internal ticks are now stored as objects in the PRIVATE `this._ticks` member
        // and must not be accessed directly from outside this class. `this.ticks` being
        // around for long time and not marked as private, we can't change its structure
        // without unexpected breaking changes. If you need to access the scale ticks,
        // use scale.getTicks() instead.

        me.beforeBuildTicks();

        // New implementations should return an array of objects but for BACKWARD COMPAT,
        // we still support no return (`this.ticks` internally set by calling this method).
        ticks = me.buildTicks() || [];

        // Allow modification of ticks in callback.
        ticks = me.afterBuildTicks(ticks) || ticks;

        // Ensure ticks contains ticks in new tick format
        if ((!ticks || !ticks.length) && me.ticks) {
            ticks = [];
            for (i = 0, ilen = me.ticks.length; i < ilen; ++i) {
                ticks.push({
                    value: me.ticks[i],
                });
            }
        }

        me._ticks = ticks;

        // Compute tick rotation and fit using a sampled subset of labels
        // We generally don't need to compute the size of every single label for determining scale size
        samplingEnabled = sampleSize < ticks.length;
        labels = me._convertTicksToLabels(samplingEnabled ? sample(ticks, sampleSize) : ticks);

        // _configure is called twice, once here, once from core.controller.updateLayout.
        // Here we haven't been positioned yet, but dimensions are correct.
        // Variables set in _configure are needed for calculateTickRotation, and
        // it's ok that coordinates are not correct there, only dimensions matter.
        me._configure();

        // Tick Rotation
        me.beforeCalculateTickRotation();
        me.calculateTickRotation();
        me.afterCalculateTickRotation();

        me.beforeFit();
        me.fit();
        me.afterFit();

        // Auto-skip
        me._ticksToDraw = tickOpts.display && (tickOpts.autoSkip || tickOpts.source === 'auto') ? me._autoSkip(ticks) : ticks;

        if (samplingEnabled) {
            // Generate labels using all non-skipped ticks
            labels = me._convertTicksToLabels(me._ticksToDraw);
        }

        me.ticks = labels;   // BACKWARD COMPATIBILITY

        // IMPORTANT: after this point, we consider that `this.ticks` will NEVER change!

        me.afterUpdate();

        // TODO(v3): remove minSize as a public property and return value from all layout boxes. It is unused
        // make maxWidth and maxHeight private
        return me.minSize;
    },

    /**
     * @private
     */
    _configure: function() {
        var me = this;
        var reversePixels = me.options.ticks.reverse;
        var startPixel, endPixel;

        if (me.isHorizontal()) {
            startPixel = me.left;
            endPixel = me.right;
        } else {
            startPixel = me.top;
            endPixel = me.bottom;
            // by default vertical scales are from bottom to top, so pixels are reversed
            reversePixels = !reversePixels;
        }
        me._startPixel = startPixel;
        me._endPixel = endPixel;
        me._reversePixels = reversePixels;
        me._length = endPixel - startPixel;
    },

    afterUpdate: function() {
        helpers.callback(this.options.afterUpdate, [this]);
    },

    //

    beforeSetDimensions: function() {
        helpers.callback(this.options.beforeSetDimensions, [this]);
    },
    setDimensions: function() {
        var me = this;
        // Set the unconstrained dimension before label rotation
        if (me.isHorizontal()) {
            // Reset position before calculating rotation
            me.width = me.maxWidth;
            me.left = 0;
            me.right = me.width;
        } else {
            me.height = me.maxHeight;

            // Reset position before calculating rotation
            me.top = 0;
            me.bottom = me.height;
        }

        // Reset padding
        me.paddingLeft = 0;
        me.paddingTop = 0;
        me.paddingRight = 0;
        me.paddingBottom = 0;
    },
    afterSetDimensions: function() {
        helpers.callback(this.options.afterSetDimensions, [this]);
    },

    // Data limits
    beforeDataLimits: function() {
        helpers.callback(this.options.beforeDataLimits, [this]);
    },
    determineDataLimits: noop,
    afterDataLimits: function() {
        helpers.callback(this.options.afterDataLimits, [this]);
    },

    //
    beforeBuildTicks: function() {
        helpers.callback(this.options.beforeBuildTicks, [this]);
    },
    buildTicks: noop,
    afterBuildTicks: function(ticks) {
        var me = this;
        // ticks is empty for old axis implementations here
        if (IsArray(ticks) && ticks.length) {
            return helpers.callback(me.options.afterBuildTicks, [me, ticks]);
        }
        // Support old implementations (that modified `this.ticks` directly in buildTicks)
        me.ticks = helpers.callback(me.options.afterBuildTicks, [me, me.ticks]) || me.ticks;
        return ticks;
    },

    beforeTickToLabelConversion: function() {
        helpers.callback(this.options.beforeTickToLabelConversion, [this]);
    },
    convertTicksToLabels: function() {
        var me = this;
        // Convert ticks to strings
        var tickOpts = me.options.ticks;
        me.ticks = me.ticks.map(tickOpts.userCallback || tickOpts.callback, this);
    },
    afterTickToLabelConversion: function() {
        helpers.callback(this.options.afterTickToLabelConversion, [this]);
    },

    //

    beforeCalculateTickRotation: function() {
        helpers.callback(this.options.beforeCalculateTickRotation, [this]);
    },
    calculateTickRotation: function() {
        var me = this;
        var options = me.options;
        var tickOpts = options.ticks;
        var numTicks = me.getTicks().length;
        var minRotation = tickOpts.minRotation || 0;
        var maxRotation = tickOpts.maxRotation;
        var labelRotation = minRotation;
        var labelSizes, maxLabelWidth, maxLabelHeight, maxWidth, tickWidth, maxHeight, maxLabelDiagonal;

        if (!me._isVisible() || !tickOpts.display || minRotation >= maxRotation || numTicks <= 1 || !me.isHorizontal()) {
            me.labelRotation = minRotation;
            return;
        }

        labelSizes = me._getLabelSizes();
        maxLabelWidth = labelSizes.widest.width;
        maxLabelHeight = labelSizes.highest.height - labelSizes.highest.offset;

        // Estimate the width of each grid based on the canvas width, the maximum
        // label width and the number of tick intervals
        maxWidth = Min(me.maxWidth, me.chart.width - maxLabelWidth);
        tickWidth = options.offset ? me.maxWidth / numTicks : maxWidth / (numTicks - 1);

        // Allow 3 pixels x2 padding either side for label readability
        if (maxLabelWidth + 6 > tickWidth) {
            tickWidth = maxWidth / (numTicks - (options.offset ? 0.5 : 1));
            maxHeight = me.maxHeight - getTickMarkLength(options.gridLines)
                - tickOpts.padding - getScaleLabelHeight(options.scaleLabel);
            maxLabelDiagonal = Sqrt(maxLabelWidth * maxLabelWidth + maxLabelHeight * maxLabelHeight);
            labelRotation = helpers.toDegrees(Min(
                Math.asin(Min((labelSizes.highest.height + 6) / tickWidth, 1)),
                Math.asin(Min(maxHeight / maxLabelDiagonal, 1)) - Math.asin(maxLabelHeight / maxLabelDiagonal)
            ));
            labelRotation = Max(minRotation, Min(maxRotation, labelRotation));
        }

        me.labelRotation = labelRotation;
    },
    afterCalculateTickRotation: function() {
        helpers.callback(this.options.afterCalculateTickRotation, [this]);
    },

    //

    beforeFit: function() {
        helpers.callback(this.options.beforeFit, [this]);
    },
    fit: function() {
        var me = this;
        // Reset
        var minSize = me.minSize = {
            width: 0,
            height: 0
        };

        var chart = me.chart;
        var opts = me.options;
        var tickOpts = opts.ticks;
        var scaleLabelOpts = opts.scaleLabel;
        var gridLineOpts = opts.gridLines;
        var display = me._isVisible();
        var isBottom = opts.position === 'bottom';
        var isHorizontal = me.isHorizontal();

        // Width
        if (isHorizontal) {
            minSize.width = me.maxWidth;
        } else if (display) {
            minSize.width = getTickMarkLength(gridLineOpts) + getScaleLabelHeight(scaleLabelOpts);
        }

        // height
        if (!isHorizontal) {
            minSize.height = me.maxHeight; // fill all the height
        } else if (display) {
            minSize.height = getTickMarkLength(gridLineOpts) + getScaleLabelHeight(scaleLabelOpts);
        }

        // Don't bother fitting the ticks if we are not showing the labels
        if (tickOpts.display && display) {
            var tickFonts = parseTickFontOptions(tickOpts);
            var labelSizes = me._getLabelSizes();
            var firstLabelSize = labelSizes.first;
            var lastLabelSize = labelSizes.last;
            var widestLabelSize = labelSizes.widest;
            var highestLabelSize = labelSizes.highest;
            var lineSpace = tickFonts.minor.lineHeight * 0.4;
            var tickPadding = tickOpts.padding;

            if (isHorizontal) {
                // A horizontal axis is more constrained by the height.
                var isRotated = me.labelRotation !== 0;
                var angleRadians = helpers.toRadians(me.labelRotation);
                var cosRotation = Cos(angleRadians);
                var sinRotation = Sin(angleRadians);

                var labelHeight = sinRotation * widestLabelSize.width
                    + cosRotation * (highestLabelSize.height - (isRotated ? highestLabelSize.offset : 0))
                    + (isRotated ? 0 : lineSpace); // padding

                minSize.height = Min(me.maxHeight, minSize.height + labelHeight + tickPadding);

                var offsetLeft = me.getPixelForTick(0) - me.left;
                var offsetRight = me.right - me.getPixelForTick(me.getTicks().length - 1);
                var paddingLeft, paddingRight;

                // Ensure that our ticks are always inside the canvas. When rotated, ticks are right aligned
                // which means that the right padding is dominated by the font height
                if (isRotated) {
                    paddingLeft = isBottom ?
                        cosRotation * firstLabelSize.width + sinRotation * firstLabelSize.offset :
                        sinRotation * (firstLabelSize.height - firstLabelSize.offset);
                    paddingRight = isBottom ?
                        sinRotation * (lastLabelSize.height - lastLabelSize.offset) :
                        cosRotation * lastLabelSize.width + sinRotation * lastLabelSize.offset;
                } else {
                    paddingLeft = firstLabelSize.width / 2;
                    paddingRight = lastLabelSize.width / 2;
                }

                // Adjust padding taking into account changes in offsets
                // and add 3 px to move away from canvas edges
                me.paddingLeft = Max((paddingLeft - offsetLeft) * me.width / (me.width - offsetLeft), 0) + 3;
                me.paddingRight = Max((paddingRight - offsetRight) * me.width / (me.width - offsetRight), 0) + 3;
            } else {
                // A vertical axis is more constrained by the width. Labels are the
                // dominant factor here, so get that length first and account for padding
                var labelWidth = tickOpts.mirror ? 0 :
                    // use lineSpace for consistency with horizontal axis
                    // tickPadding is not implemented for horizontal
                    widestLabelSize.width + tickPadding + lineSpace;

                minSize.width = Min(me.maxWidth, minSize.width + labelWidth);

                me.paddingTop = firstLabelSize.height / 2;
                me.paddingBottom = lastLabelSize.height / 2;
            }
        }

        me.handleMargins();

        if (isHorizontal) {
            me.width = me._length = chart.width - me.margins.left - me.margins.right;
            me.height = minSize.height;
        } else {
            me.width = minSize.width;
            me.height = me._length = chart.height - me.margins.top - me.margins.bottom;
        }
    },

    /**
     * Handle margins and padding interactions
     * @private
     */
    handleMargins: function() {
        var me = this;
        if (me.margins) {
            me.margins.left = Max(me.paddingLeft, me.margins.left);
            me.margins.top = Max(me.paddingTop, me.margins.top);
            me.margins.right = Max(me.paddingRight, me.margins.right);
            me.margins.bottom = Max(me.paddingBottom, me.margins.bottom);
        }
    },

    afterFit: function() {
        helpers.callback(this.options.afterFit, [this]);
    },

    // Shared Methods
    isHorizontal: function() {
        var pos = this.options.position;
        return pos === 'top' || pos === 'bottom';
    },
    isFullWidth: function() {
        return this.options.fullWidth;
    },

    // Get the correct value. NaN bad inputs, If the value type is object get the x or y based on whether we are horizontal or not
    getRightValue: function(rawValue) {
        // Null and undefined values first
        if (rawValue == null) {
            return NaN;
        }
        // isNaN(object) returns true, so make sure NaN is checking for a number; Discard Infinite values
        if ((typeof rawValue === 'number' || rawValue instanceof Number) && !isFinite(rawValue)) {
            return NaN;
        }

        // If it is in fact an object, dive in one more level
        if (rawValue) {
            if (this.isHorizontal()) {
                if (rawValue.x !== undefined) {
                    return this.getRightValue(rawValue.x);
                }
            } else if (rawValue.y !== undefined) {
                return this.getRightValue(rawValue.y);
            }
        }

        // Value is good, return it
        return rawValue;
    },

    _convertTicksToLabels: function(ticks) {
        var me = this;
        var labels, i, ilen;

        me.ticks = ticks.map(function(tick) {
            return tick.value;
        });

        me.beforeTickToLabelConversion();

        // New implementations should return the formatted tick labels but for BACKWARD
        // COMPAT, we still support no return (`this.ticks` internally changed by calling
        // this method and supposed to contain only string values).
        labels = me.convertTicksToLabels(ticks) || me.ticks;

        me.afterTickToLabelConversion();

        // BACKWARD COMPAT: synchronize `_ticks` with labels (so potentially `this.ticks`)
        for (i = 0, ilen = ticks.length; i < ilen; ++i) {
            ticks[i].label = labels[i];
        }

        return labels;
    },

    /**
     * @private
     */
    _getLabelSizes: function() {
        var me = this;
        var labelSizes = me._labelSizes;

        if (!labelSizes) {
            me._labelSizes = labelSizes = computeLabelSizes(me.ctx, parseTickFontOptions(me.options.ticks), me.getTicks(), me.longestTextCache);
            me.longestLabelWidth = labelSizes.widest.width;
        }

        return labelSizes;
    },

    /**
     * @private
     */
    _parseValue: function(value) {
        var start, end, min, max;

        if (IsArray(value)) {
            start = +this.getRightValue(value[0]);
            end = +this.getRightValue(value[1]);
            min = Min(start, end);
            max = Max(start, end);
        } else {
            value = +this.getRightValue(value);
            start = undefined;
            end = value;
            min = value;
            max = value;
        }

        return {
            min: min,
            max: max,
            start: start,
            end: end
        };
    },

    /**
    * @private
    */
    _getScaleLabel: function(rawValue) {
        var v = this._parseValue(rawValue);
        if (v.start !== undefined) {
            return '[' + v.start + ', ' + v.end + ']';
        }

        return +this.getRightValue(rawValue);
    },

    /**
     * Used to get the value to display in the tooltip for the data at the given index
     * @param index
     * @param datasetIndex
     */
    getLabelForIndex: noop,

    /**
     * Returns the location of the given data point. Value can either be an index or a numerical value
     * The coordinate (0, 0) is at the upper-left corner of the canvas
     * @param value
     * @param index
     * @param datasetIndex
     */
    getPixelForValue: noop,

    /**
     * Used to get the data value from a given pixel. This is the inverse of getPixelForValue
     * The coordinate (0, 0) is at the upper-left corner of the canvas
     * @param pixel
     */
    getValueForPixel: noop,

    /**
     * Returns the location of the tick at the given index
     * The coordinate (0, 0) is at the upper-left corner of the canvas
     */
    getPixelForTick: function(index) {
        var me = this;
        var offset = me.options.offset;
        var numTicks = me._ticks.length;
        var tickWidth = 1 / Max(numTicks - (offset ? 0 : 1), 1);

        return index < 0 || index > numTicks - 1
            ? null
            : me.getPixelForDecimal(index * tickWidth + (offset ? tickWidth / 2 : 0));
    },

    /**
     * Utility for getting the pixel location of a percentage of scale
     * The coordinate (0, 0) is at the upper-left corner of the canvas
     */
    getPixelForDecimal: function(decimal) {
        var me = this;

        if (me._reversePixels) {
            decimal = 1 - decimal;
        }

        return me._startPixel + decimal * me._length;
    },

    getDecimalForPixel: function(pixel) {
        var decimal = (pixel - this._startPixel) / this._length;
        return this._reversePixels ? 1 - decimal : decimal;
    },

    /**
     * Returns the pixel for the minimum chart value
     * The coordinate (0, 0) is at the upper-left corner of the canvas
     */
    getBasePixel: function() {
        return this.getPixelForValue(this.getBaseValue());
    },

    getBaseValue: function() {
        var me = this;
        var min = me.min;
        var max = me.max;

        return me.beginAtZero ? 0 :
            min < 0 && max < 0 ? max :
            min > 0 && max > 0 ? min :
            0;
    },

    /**
     * Returns a subset of ticks to be plotted to avoid overlapping labels.
     * @private
     */
    _autoSkip: function(ticks) {
        var me = this;
        var tickOpts = me.options.ticks;
        var axisLength = me._length;
        var ticksLimit = tickOpts.maxTicksLimit || axisLength / me._tickSize() + 1;
        let spacing = Max((ticks.length - 1) / ticksLimit, 1);
        skip(ticks, spacing);
        return nonSkipped(ticks);
    },

    /**
     * @private
     */
    _tickSize: function() {
        var me = this;
        var optionTicks = me.options.ticks;

        // Calculate space needed by label in axis direction.
        var rot = helpers.toRadians(me.labelRotation);
        var cos = Abs(Cos(rot));
        var sin = Abs(Sin(rot));

        var labelSizes = me._getLabelSizes();
        var padding = optionTicks.autoSkipPadding || 0;
        var w = labelSizes ? labelSizes.widest.width + padding : 0;
        var h = labelSizes ? labelSizes.highest.height + padding : 0;

        // Calculate space needed for 1 tick in axis direction.
        return me.isHorizontal()
            ? h * cos > w * sin ? w / cos : h / sin
            : h * sin < w * cos ? h / cos : w / sin;
    },

    /**
     * @private
     */
    _isVisible: function() {
        var me = this;
        var chart = me.chart;
        var display = me.options.display;
        var i, ilen, meta;

        if (display !== 'auto') {
            return !!display;
        }

        // When 'auto', the scale is visible if at least one associated dataset is visible.
        for (i = 0, ilen = chart.data.datasets.length; i < ilen; ++i) {
            if (chart.isDatasetVisible(i)) {
                meta = chart.getDatasetMeta(i);
                if (meta.xAxisID === me.id || meta.yAxisID === me.id) {
                    return true;
                }
            }
        }

        return false;
    },

    /**
     * @private
     */
    _computeGridLineItems: function(chartArea) {
        var me = this;
        var chart = me.chart;
        var options = me.options;
        var gridLines = options.gridLines;
        var position = options.position;
        var offsetGridLines = gridLines.offsetGridLines;
        var isHorizontal = me.isHorizontal();
        var ticks = me._ticksToDraw;
        var ticksLength = ticks.length + (offsetGridLines ? 1 : 0);

        var tl = getTickMarkLength(gridLines);
        var items = [];
        var axisWidth = gridLines.drawBorder ? valueAtIndexOrDefault(gridLines.lineWidth, 0, 0) : 0;
        var axisHalfWidth = axisWidth / 2;
        var alignPixel = helpers._alignPixel;
        var alignBorderValue = function(pixel) {
            return alignPixel(chart, pixel, axisWidth);
        };
        var borderValue, i, tick, lineValue, alignedLineValue;
        var tx1, ty1, tx2, ty2, x1, y1, x2, y2, lineWidth, lineColor, borderDash, borderDashOffset;

        if (position === 'top') {
            borderValue = alignBorderValue(me.bottom);
            ty1 = me.bottom - tl;
            ty2 = borderValue - axisHalfWidth;
            y1 = alignBorderValue(chartArea.top) + axisHalfWidth;
            y2 = chartArea.bottom;
        } else if (position === 'bottom') {
            borderValue = alignBorderValue(me.top);
            y1 = chartArea.top;
            y2 = alignBorderValue(chartArea.bottom) - axisHalfWidth;
            ty1 = borderValue + axisHalfWidth;
            ty2 = me.top + tl;
        } else if (position === 'left') {
            borderValue = alignBorderValue(me.right);
            tx1 = me.right - tl;
            tx2 = borderValue - axisHalfWidth;
            x1 = alignBorderValue(chartArea.left) + axisHalfWidth;
            x2 = chartArea.right;
        } else {
            borderValue = alignBorderValue(me.left);
            x1 = chartArea.left;
            x2 = alignBorderValue(chartArea.right) - axisHalfWidth;
            tx1 = borderValue + axisHalfWidth;
            tx2 = me.left + tl;
        }

        for (i = 0; i < ticksLength; ++i) {
            tick = ticks[i] || {};

            // autoskipper skipped this tick (#4635)
            if (tick.label == null && i < ticks.length) {
                continue;
            }

            if (tick.value == 0 || (isHorizontal && !i)) { // && options.offset === offsetGridLines) {
                // Draw the first index specially
                lineWidth = gridLines.zeroLineWidth;
                lineColor = gridLines.zeroLineColor;
                borderDash = gridLines.zeroLineBorderDash || [];
                borderDashOffset = gridLines.zeroLineBorderDashOffset || 0.0;
            }
            else {
                lineWidth = valueAtIndexOrDefault(gridLines.lineWidth, i, 1);
                lineColor = valueAtIndexOrDefault(gridLines.color, i, 'rgba(0,0,0,0.1)');
                borderDash = gridLines.borderDash || [];
                borderDashOffset = gridLines.borderDashOffset || 0.0;
            }

            lineValue = getPixelForGridLine(me, tick._index || i, offsetGridLines);

            // Skip if the pixel is out of the range
            if (lineValue === undefined)
                continue;

            alignedLineValue = alignPixel(chart, lineValue, lineWidth);

            if (isHorizontal) {
                tx1 = tx2 = x1 = x2 = alignedLineValue;
            } else {
                ty1 = ty2 = y1 = y2 = alignedLineValue;
            }

            items.push({
                tx1: tx1,
                ty1: ty1,
                tx2: tx2,
                ty2: ty2,
                x1: x1,
                y1: y1,
                x2: x2,
                y2: y2,
                width: lineWidth,
                color: lineColor,
                borderDash: borderDash,
                borderDashOffset: borderDashOffset,
            });
        }

        items.ticksLength = ticksLength;
        items.borderValue = borderValue;

        return items;
    },

    /**
     * @private
     */
    _computeLabelItems: function() {
        var me = this;
        var options = me.options;
        var optionTicks = options.ticks;
        var position = options.position;
        var isMirrored = optionTicks.mirror;
        var isHorizontal = me.isHorizontal();
        var ticks = me._ticksToDraw;
        var fonts = parseTickFontOptions(optionTicks);
        var tickPadding = optionTicks.padding;
        var tl = getTickMarkLength(options.gridLines);
        var rotation = -helpers.toRadians(me.labelRotation);
        var items = [];
        var i, ilen, tick, label, x, y, textAlign, pixel, font, lineHeight, lineCount, textOffset;

        if (position === 'top') {
            y = me.bottom - tl - tickPadding;
            textAlign = !rotation ? 'center' : 'left';
        } else if (position === 'bottom') {
            y = me.top + tl + tickPadding;
            textAlign = !rotation ? 'center' : 'right';
        } else if (position === 'left') {
            x = me.right - (isMirrored ? 0 : tl) - tickPadding;
            textAlign = isMirrored ? 'left' : 'right';
        } else {
            x = me.left + (isMirrored ? 0 : tl) + tickPadding;
            textAlign = isMirrored ? 'right' : 'left';
        }

        for (i = 0, ilen = ticks.length; i < ilen; ++i) {
            tick = ticks[i];
            label = tick.label;

            // autoskipper skipped this tick (#4635)
            if (label == null) {
                continue;
            }

            pixel = me.getPixelForTick(tick._index || i) + optionTicks.labelOffset;
            font = fonts.minor;
            lineHeight = font.lineHeight;
            lineCount = IsArray(label) ? label.length : 1;

            if (isHorizontal) {
                x = pixel;
                textOffset = position === 'top'
                    ? ((!rotation ? 0.5 : 1) - lineCount) * lineHeight
                    : (!rotation ? 0.5 : 0) * lineHeight;
            } else {
                y = pixel;
                textOffset = (1 - lineCount) * lineHeight / 2;
            }

            items.push({
                x: x,
                y: y,
                rotation: rotation,
                label: label,
                font: font,
                textOffset: textOffset,
                textAlign: textAlign
            });
        }

        return items;
    },

    /**
     * @private
     */
    _drawGrid: function(chartArea) {
        var me = this;
        var gridLines = me.options.gridLines;

        if (!gridLines.display) {
            return;
        }

        var ctx = me.ctx;
        var chart = me.chart;
        var alignPixel = helpers._alignPixel;
        var axisWidth = gridLines.drawBorder ? valueAtIndexOrDefault(gridLines.lineWidth, 0, 0) : 0;
        var items = me._gridLineItems || (me._gridLineItems = me._computeGridLineItems(chartArea));
        var width, color, i, ilen, item;

        for (i = 0, ilen = items.length; i < ilen; ++i) {
            item = items[i];
            width = item.width;
            color = item.color;

            if (width && color) {
                ctx.save();
                ctx.lineWidth = width;
                ctx.strokeStyle = color;
                if (ctx.setLineDash) {
                    ctx.setLineDash(item.borderDash);
                    ctx.lineDashOffset = item.borderDashOffset;
                }

                ctx.beginPath();

                if (gridLines.drawTicks) {
                    ctx.moveTo(item.tx1, item.ty1);
                    ctx.lineTo(item.tx2, item.ty2);
                }

                if (gridLines.drawOnChartArea) {
                    ctx.moveTo(item.x1, item.y1);
                    ctx.lineTo(item.x2, item.y2);
                }

                ctx.stroke();
                ctx.restore();
            }
        }

        if (axisWidth) {
            // Draw the line at the edge of the axis
            var firstLineWidth = axisWidth;
            var lastLineWidth = valueAtIndexOrDefault(gridLines.lineWidth, items.ticksLength - 1, 1);
            var borderValue = items.borderValue;
            var x1, x2, y1, y2;

            if (me.isHorizontal()) {
                x1 = alignPixel(chart, me.left, firstLineWidth) - firstLineWidth / 2;
                x2 = alignPixel(chart, me.right, lastLineWidth) + lastLineWidth / 2;
                y1 = y2 = borderValue;
            } else {
                y1 = alignPixel(chart, me.top, firstLineWidth) - firstLineWidth / 2;
                y2 = alignPixel(chart, me.bottom, lastLineWidth) + lastLineWidth / 2;
                x1 = x2 = borderValue;
            }

            ctx.lineWidth = axisWidth;
            ctx.strokeStyle = valueAtIndexOrDefault(gridLines.color, 0);
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }
    },

    /**
     * @private
     */
    _drawLabels: function() {
        var me = this;
        var optionTicks = me.options.ticks;

        if (!optionTicks.display) {
            return;
        }

        var ctx = me.ctx;
        var items = me._labelItems || (me._labelItems = me._computeLabelItems());
        var i, j, ilen, jlen, item, tickFont, label, y;

        for (i = 0, ilen = items.length; i < ilen; ++i) {
            item = items[i];
            tickFont = item.font;

            // Make sure we draw text in the correct color and font
            ctx.save();
            ctx.translate(item.x, item.y);
            ctx.rotate(item.rotation);
            ctx.font = tickFont.string;
            ctx.fillStyle = tickFont.color;
            ctx.textBaseline = 'middle';
            ctx.textAlign = item.textAlign;

            label = item.label;
            y = item.textOffset;
            if (IsArray(label)) {
                for (j = 0, jlen = label.length; j < jlen; ++j) {
                    // We just make sure the multiline element is a string here..
                    ctx.fillText('' + label[j], 0, y);
                    y += tickFont.lineHeight;
                }
            } else {
                ctx.fillText(label, 0, y);
            }
            ctx.restore();
        }
    },

    draw: function(chartArea) {
        var me = this;

        if (!me._isVisible()) {
            return;
        }

        me._drawGrid(chartArea);
        me._drawLabels();
    },

    /**
     * @private
     */
    _layers: function() {
        var me = this;
        var opts = me.options;
        var tz = opts.ticks && opts.ticks.z || 0;
        var gz = opts.gridLines && opts.gridLines.z || 0;

        if (!me._isVisible() || tz === gz || me.draw !== me._draw) {
            // backward compatibility: draw has been overridden by custom scale
            return [{
                z: tz,
                draw: function() {
                    me.draw.apply(me, arguments);
                }
            }];
        }

        return [{
            z: gz,
            draw: function() {
                me._drawGrid.apply(me, arguments);
            }
        }, {
            z: tz,
            draw: function() {
                me._drawLabels.apply(me, arguments);
            }
        }];
    },

    /**
     * @private
     */
    _getMatchingVisibleMetas: function(type) {
        var me = this;
        var isHorizontal = me.isHorizontal();
        return me.chart._getSortedVisibleDatasetMetas()
            .filter(function(meta) {
                return (!type || meta.type === type)
                    && (isHorizontal ? meta.xAxisID === me.id : meta.yAxisID === me.id);
            });
    }
});

Scale.prototype._draw = Scale.prototype.draw;

var core_scale = Scale;

var defaultConfig = {
    position: 'bottom'
};

var scale_category = core_scale.extend({
    determineDataLimits: function() {
        var me = this;
        var labels = me._getLabels();
        var ticksOpts = me.options.ticks;
        var min = ticksOpts.min;
        var max = ticksOpts.max;
        var minIndex = 0;
        var maxIndex = labels.length - 1;
        var findIndex;

        if (min !== undefined) {
            // user specified min value
            findIndex = labels.indexOf(min);
            if (findIndex >= 0) {
                minIndex = findIndex;
            }
        }

        if (max !== undefined) {
            // user specified max value
            findIndex = labels.indexOf(max);
            if (findIndex >= 0) {
                maxIndex = findIndex;
            }
        }

        me.minIndex = minIndex;
        me.maxIndex = maxIndex;
        me.min = labels[minIndex];
        me.max = labels[maxIndex];
    },

    buildTicks: function() {
        var me = this;
        var labels = me._getLabels();
        var minIndex = me.minIndex;
        var maxIndex = me.maxIndex;

        // If we are viewing some subset of labels, slice the original array
        me.ticks = (minIndex === 0 && maxIndex === labels.length - 1) ? labels : labels.slice(minIndex, maxIndex + 1);
    },

    getLabelForIndex: function(index, datasetIndex) {
        var me = this;
        var chart = me.chart;

        if (chart.getDatasetMeta(datasetIndex).controller._getValueScaleId() === me.id) {
            return me.getRightValue(chart.data.datasets[datasetIndex].data[index]);
        }

        return me._getLabels()[index];
    },

    _configure: function() {
        var me = this;
        var offset = me.options.offset;
        var ticks = me.ticks;

        core_scale.prototype._configure.call(me);

        if (!me.isHorizontal()) {
            // For backward compatibility, vertical category scale reverse is inverted.
            me._reversePixels = !me._reversePixels;
        }

        if (!ticks) {
            return;
        }

        me._startValue = me.minIndex - (offset ? 0.5 : 0);
        me._valueRange = Max(ticks.length - (offset ? 0 : 1), 1);
    },

    // Used to get data value locations.  Value can either be an index or a numerical value
    getPixelForValue: function(value, index, datasetIndex) {
        var me = this;
        var valueCategory, labels, idx;

        if (index != null && datasetIndex != null) {
            value = me.chart.data.datasets[datasetIndex].data[index];
        }

        // If value is a data object, then index is the index in the data array,
        // not the index of the scale. We need to change that.
        if (value != null) {
            valueCategory = me.isHorizontal() ? value.x : value.y;
        }
        if (valueCategory !== undefined || (value !== undefined && isNaN(index))) {
            labels = me._getLabels();
            value = Undefined(valueCategory, value);
            idx = labels.indexOf(value);
            index = idx !== -1 ? idx : index;
            if (isNaN(index)) {
                index = value;
            }
        }
        return me.getPixelForDecimal((index - me._startValue) / me._valueRange);
    },

    getPixelForTick: function(index) {
        var ticks = this.ticks;
        return index < 0 || index > ticks.length - 1
            ? null
            : this.getPixelForValue(ticks[index], index + this.minIndex);
    },

    getValueForPixel: function(pixel) {
        var me = this;
        var value = Round(me._startValue + me.getDecimalForPixel(pixel) * me._valueRange);
        return Min(Max(value, 0), me.ticks.length - 1);
    },

    getBasePixel: function() {
        return this.bottom;
    }
});

// INTERNAL: static default options, registered in src/index.js
var _defaults = defaultConfig;
scale_category._defaults = _defaults;

/**
 * Generate a set of linear ticks
 * @param generationOptions the options used to generate the ticks
 * @param dataRange the range of the data
 * @returns {Array<number>} array of tick values
 */
function generateTicks(generationOptions, dataRange) {
    var ticks = [];
    // To get a "nice" value for the tick spacing, we will use the appropriately named
    // "nice number" algorithm. See https://stackoverflow.com/questions/8506881/nice-label-algorithm-for-charts-with-minimum-ticks
    // for details.

    var MIN_SPACING = 1e-14;
    var stepSize = generationOptions.stepSize;
    var unit = stepSize || 1;
    var maxNumSpaces = generationOptions.maxTicks - 1;
    var min = generationOptions.min;
    var max = generationOptions.max;
    var precision = generationOptions.precision;
    var rmin = dataRange.min;
    var rmax = dataRange.max;
    var spacing = helpers.niceNum((rmax - rmin) / maxNumSpaces / unit) * unit;
    var factor, niceMin, niceMax, numSpaces;

    // Beyond MIN_SPACING floating point numbers being to lose precision
    // such that we can't do the math necessary to generate ticks
    if (spacing < MIN_SPACING && min == null && max == null) {
        return [rmin, rmax];
    }

    numSpaces = Ceil(rmax / spacing) - Floor(rmin / spacing);
    if (numSpaces > maxNumSpaces) {
        // If the calculated num of spaces exceeds maxNumSpaces, recalculate it
        spacing = helpers.niceNum(numSpaces * spacing / maxNumSpaces / unit) * unit;
    }

    if (stepSize || precision == null) {
        // If a precision is not specified, calculate factor based on spacing
        factor = Pow(10, helpers._decimalPlaces(spacing));
    } else {
        // If the user specified a precision, round to that number of decimal places
        factor = Pow(10, precision);
        spacing = Ceil(spacing * factor) / factor;
    }

    niceMin = Floor(rmin / spacing) * spacing;
    niceMax = Ceil(rmax / spacing) * spacing;

    // If min, max and stepSize is set and they make an evenly spaced scale use it.
    if (stepSize) {
        // If very close to our whole number, use it.
        if (min != null && helpers.almostWhole(min / spacing, spacing / 1000)) {
            niceMin = min;
        }
        if (max != null && helpers.almostWhole(max / spacing, spacing / 1000)) {
            niceMax = max;
        }
    }

    numSpaces = (niceMax - niceMin) / spacing;
    // If very close to our rounded value, use it.
    if (helpers.almostEquals(numSpaces, Round(numSpaces), spacing / 1000)) {
        numSpaces = Round(numSpaces);
    } else {
        numSpaces = Ceil(numSpaces);
    }

    niceMin = Round(niceMin * factor) / factor;
    niceMax = Round(niceMax * factor) / factor;
    ticks.push((min == null) ? niceMin : min);
    for (var j = 1; j < numSpaces; ++j) {
        ticks.push(Round((niceMin + j * spacing) * factor) / factor);
    }
    ticks.push((max == null) ? niceMax : max);

    return ticks;
}

var DEFAULT_MIN = 0;
var DEFAULT_MAX = 1;

function updateMinMax(scale, meta, data) {
    var ilen = data.length;
    var i, value;

    for (i = 0; i < ilen; ++i) {
        value = scale._parseValue(data[i]);
        if (isNaN(value.min) || isNaN(value.max) || meta.data[i].hidden) {
            continue;
        }

        scale.min = Min(scale.min, value.min);
        scale.max = Max(scale.max, value.max);
    }
}

/**
 * Generate a set of custom ticks
 * @param generationOptions the options used to generate the ticks
 * @param dataRange the range of the data
 * @returns {Array<number>} array of tick values
 */
function generateTicks$1(generationOptions, dataRange) {
    let [func, inv] = generationOptions.funcs,
        max = dataRange.max,
        min = dataRange.min,
        ticks = generateTicks(
            Assign({
                maxTicks: 100,
            }, generationOptions),
            {
                max: func(max >= 0? max * 1.0250: max * 0.9756),
                min: func(min >= 0? min * 0.9756: min * 1.0250),
            });

    return ticks.map(tick => {
        let first = inv(tick),
            // base = Log10(first),
            pow = first;

        // for (let i = 3; i >= 0; i --) {
        //     if (i >= tick)
        //         continue;
        //     let div = Pow(10, Floor(base - i)),
        //         pow2 = Round(pow / div) * div;
        //     if (Abs(pow2 / (first + pow2) - 0.5) > 0.005) {
        //         div = Pow(10, Floor(base - i)) / 2;
        //         pow2 = Round(pow / div) * div;
        //         if (Abs(pow2 / (first + pow2) - 0.5) <= 0.005) {
        //             // LS(`${i} : ${pow} : ${pow2} : ${Abs(pow2 / (first + pow2) - 0.5)}`);
        //             return pow2;
        //         }
        //         return pow;
        //     }
        //     pow = pow2;
        // }
        return pow;
    }); // .reverse();
}

var defaultConfig$2 = {
    position: 'left',
    ticks: {}
};

var scale_custom = core_scale.extend({
    determineDataLimits: function() {
        var me = this;
        var chart = me.chart;
        var datasets = chart.data.datasets;
        var metasets = me._getMatchingVisibleMetas();
        var ilen = metasets.length;
        var i, meta, data;

        // Calculate Range
        me.min = Number.POSITIVE_INFINITY;
        me.max = Number.NEGATIVE_INFINITY;

        for (i = 0; i < ilen; ++i) {
            meta = metasets[i];
            data = datasets[meta.index].data;
            updateMinMax(me, meta, data);
        }

        me.minValue = me.min;
        me.maxValue = me.max;

        if (!Number.isFinite(me.max))
            me.max = DEFAULT_MAX;
        if (!Number.isFinite(me.min))
            me.min = DEFAULT_MIN;

        // Common base implementation to handle ticks.min, ticks.max
        this.handleTickRangeOptions();
    },

    handleTickRangeOptions: function() {
        var me = this;
        var tickOpts = me.options.ticks;
        let [func, inv] = me.options.funcs;

        me.min = Undefined(tickOpts.min, me.min);
        me.max = Undefined(tickOpts.max, me.max);

        // If we are forcing it to begin at 0, but 0 will already be rendered on the chart,
        // do nothing since that would make the chart weird. If the user really wants a weird chart
        // axis, they can manually override it
        if (tickOpts.beginAtZero) {
            var minSign = Sign(me.min);
            var maxSign = Sign(me.max);

            if (minSign < 0 && maxSign < 0) {
                // move the top up to 0
                me.max = 0;
            } else if (minSign > 0 && maxSign > 0) {
                // move the bottom down to 0
                me.min = 0;
            }
        }

        if (me.min === me.max) {
            if (me.min !== 0 && me.min !== null) {
                me.min = inv(Floor(func(me.min)) - 1);
                me.max = inv(Floor(func(me.max)) + 1);
            } else {
                me.min = DEFAULT_MIN;
                me.max = DEFAULT_MAX;
            }
        }
        if (me.min === null) {
            me.min = inv(Floor(func(me.max)) - 1);
        }
        if (me.max === null) {
            me.max = me.min !== 0
                ? inv(Floor(func(me.min)) + 1)
                : DEFAULT_MAX;
        }
    },

    buildTicks: function() {
        var me = this;
        var tickOpts = me.options.ticks;
        var reverse = !me.isHorizontal();

        var generationOptions = {
            funcs: me.options.funcs,
            min: tickOpts.min,
            max: tickOpts.max,
        };
        var ticks = me.ticks = generateTicks$1(generationOptions, me);

        // At this point, we need to update our max and min given the tick values since we have expanded the
        // range of the scale
        me.max = Max(...ticks);
        me.min = Min(...ticks);

        if (tickOpts.reverse) {
            reverse = !reverse;
            me.start = me.max;
            me.end = me.min;
        } else {
            me.start = me.min;
            me.end = me.max;
        }
        if (reverse) {
            ticks.reverse();
        }
    },

    convertTicksToLabels: function() {
        var me = this;
        me.tickValues = me.ticks.slice();
        core_scale.prototype.convertTicksToLabels.call(me);
    },

    // Get the correct tooltip label
    getLabelForIndex: function(index, datasetIndex) {
        return this._getScaleLabel(this.chart.data.datasets[datasetIndex].data[index]);
    },

    getPixelForTick: function(index) {
        var ticks = this.tickValues;
        if (index < 0 || index > ticks.length - 1) {
            return null;
        }
        return this.getPixelForValue(ticks[index]);
    },

    _configure: function() {
        var me = this;
        var start = me.min;
        var offset = 0;

        core_scale.prototype._configure.call(me);

        let [func] = me.options.funcs;
        me._startValue = func(start);
        me._valueOffset = offset;
        me._valueRange = (func(me.max) - func(start)) / (1 - offset);
    },

    getPixelForValue: function(value) {
        if (value == undefined)
            return NaN;
        var me = this;
        var decimal = 0;

        value = +me.getRightValue(value);

        // if (value > me.min && value > 0) {
            let [func] = me.options.funcs;
            decimal = (func(value) - me._startValue) / me._valueRange + me._valueOffset;
        // }
        return me.getPixelForDecimal(decimal);
    },

    getValueForPixel: function(pixel) {
        var me = this;
        var decimal = me.getDecimalForPixel(pixel);
        let inv = me.options.funcs[1];
        return decimal === 0 && me.min === 0
            ? 0
            : inv(me._startValue + (decimal - me._valueOffset) * me._valueRange);
    }
});

// INTERNAL: static default options, registered in src/index.js
var _defaults$2 = defaultConfig$2;
scale_custom._defaults = _defaults$2;

var scales = {
    category: scale_category,
    custom: scale_custom,
};

Merge(core_defaults, {
    global: {
        legend: {
            display: true,
            position: 'top',
            align: 'center',
            fullWidth: true,
            reverse: false,
            weight: 1000,

            // a callback that will handle
            onClick: function(e, legendItem) {
                var index = legendItem.datasetIndex;
                var ci = this.chart;
                var meta = ci.getDatasetMeta(index);

                // See controller.isDatasetVisible comment
                meta.hidden = meta.hidden === null ? !ci.data.datasets[index].hidden : null;

                // We hid a dataset ... rerender the chart
                ci.update();
            },

            onHover: null,
            onLeave: null,

            labels: {
                boxWidth: 40,
                padding: 10,
                // Generates labels shown in the legend
                // Valid properties to return:
                // text : text to display
                // fillStyle : fill of coloured box
                // strokeStyle: stroke of coloured box
                // hidden : if this legend item refers to a hidden item
                // lineCap : cap style for line
                // lineDash
                // lineDashOffset :
                // lineJoin :
                // lineWidth :
                generateLabels: function(chart) {
                    var datasets = chart.data.datasets;
                    var options = chart.options.legend || {};
                    var usePointStyle = options.labels && options.labels.usePointStyle;

                    return chart._getSortedDatasetMetas().map(function(meta) {
                        var style = meta.controller.getStyle(usePointStyle ? 0 : undefined);

                        return {
                            text: datasets[meta.index].label,
                            fillStyle: style.backgroundColor,
                            hidden: !chart.isDatasetVisible(meta.index),
                            lineCap: style.borderCapStyle,
                            lineDash: style.borderDash,
                            lineDashOffset: style.borderDashOffset,
                            lineJoin: style.borderJoinStyle,
                            lineWidth: style.borderWidth,
                            strokeStyle: style.borderColor,
                            pointStyle: style.pointStyle,
                            rotation: style.rotation,

                            // Below is extra data used for toggling the datasets
                            datasetIndex: meta.index
                        };
                    }, this);
                }
            }
        },

        legendCallback: function(chart) {
            var list = document.createElement('ul');
            var datasets = chart.data.datasets;
            var i, ilen, listItem, listItemSpan;

            list.setAttribute('class', chart.id + '-legend');

            for (i = 0, ilen = datasets.length; i < ilen; i++) {
                listItem = list.appendChild(document.createElement('li'));
                listItemSpan = listItem.appendChild(document.createElement('span'));
                listItemSpan.style.backgroundColor = datasets[i].backgroundColor;
                if (datasets[i].label) {
                    listItem.appendChild(document.createTextNode(datasets[i].label));
                }
            }

            return list.outerHTML;
        },
    },
});

/**
 * Helper function to get the box width based on the usePointStyle option
 * @param {Object} labelopts - the label options on the legend
 * @param {number} fontSize - the label font size
 * @returns {number} width of the color box area
 */
function getBoxWidth(labelOpts, fontSize) {
    return labelOpts.usePointStyle && labelOpts.boxWidth > fontSize ?
        fontSize :
        labelOpts.boxWidth;
}

/**
 * IMPORTANT: this class is exposed publicly as Chart.Legend, backward compatibility required!
 */
var Legend = Element.extend({

    initialize: function(config) {
        var me = this;
        Assign(me, config);

        // Contains hit boxes for each dataset (in dataset order)
        me.legendHitBoxes = [];

        /**
             * @private
             */
        me._hoveredItem = null;
    },

    // These methods are ordered by lifecycle. Utilities then follow.
    // Any function defined here is inherited by all legend types.
    // Any function can be extended by the legend type

    beforeUpdate: noop,
    update: function(maxWidth, maxHeight, margins) {
        var me = this;

        // Update Lifecycle - Probably don't want to ever extend or overwrite this function ;)
        me.beforeUpdate();

        // Absorb the master measurements
        me.maxWidth = maxWidth;
        me.maxHeight = maxHeight;
        me.margins = margins;

        // Dimensions
        me.beforeSetDimensions();
        me.setDimensions();
        me.afterSetDimensions();
        // Labels
        me.beforeBuildLabels();
        me.buildLabels();
        me.afterBuildLabels();

        // Fit
        me.beforeFit();
        me.fit();
        me.afterFit();
        //
        me.afterUpdate();

        return me.minSize;
    },
    afterUpdate: noop,

    //

    beforeSetDimensions: noop,
    setDimensions: function() {
        var me = this;
        // Set the unconstrained dimension before label rotation
        if (me.isHorizontal()) {
            // Reset position before calculating rotation
            me.width = me.maxWidth;
            me.left = 0;
            me.right = me.width;
        } else {
            me.height = me.maxHeight;

            // Reset position before calculating rotation
            me.top = 0;
            me.bottom = me.height;
        }

        // Reset padding
        me.paddingLeft = 0;
        me.paddingTop = 0;
        me.paddingRight = 0;
        me.paddingBottom = 0;

        // Reset minSize
        me.minSize = {
            width: 0,
            height: 0
        };
    },
    afterSetDimensions: noop,

    //

    beforeBuildLabels: noop,
    buildLabels: function() {
        var me = this;
        var labelOpts = me.options.labels || {};
        var legendItems = helpers.callback(labelOpts.generateLabels, [me.chart], me) || [];

        if (labelOpts.filter) {
            legendItems = legendItems.filter(function(item) {
                return labelOpts.filter(item, me.chart.data);
            });
        }

        if (me.options.reverse) {
            legendItems.reverse();
        }

        me.legendItems = legendItems;
    },
    afterBuildLabels: noop,

    //

    beforeFit: noop,
    fit: function() {
        var me = this;
        var opts = me.options;
        var labelOpts = opts.labels;
        var display = opts.display;

        var ctx = me.ctx;

        var labelFont = helpers.options._parseFont(labelOpts);
        var fontSize = labelFont.size;

        // Reset hit boxes
        var hitboxes = me.legendHitBoxes = [];

        var minSize = me.minSize;
        var isHorizontal = me.isHorizontal();

        if (isHorizontal) {
            minSize.width = me.maxWidth; // fill all the width
            minSize.height = display ? 10 : 0;
        } else {
            minSize.width = display ? 10 : 0;
            minSize.height = me.maxHeight; // fill all the height
        }

        // Increase sizes here
        if (!display) {
            me.width = minSize.width = me.height = minSize.height = 0;
            return;
        }
        ctx.font = labelFont.string;

        if (isHorizontal) {
            // Labels

            // Width of each line of legend boxes. Labels wrap onto multiple lines when there are too many to fit on one
            var lineWidths = me.lineWidths = [0];
            var totalHeight = 0;

            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';

            helpers.each(me.legendItems, function(legendItem, i) {
                var boxWidth = getBoxWidth(labelOpts, fontSize);
                var width = boxWidth + (fontSize / 2) + ctx.measureText(legendItem.text).width;

                if (i === 0 || lineWidths[lineWidths.length - 1] + width + 2 * labelOpts.padding > minSize.width) {
                    totalHeight += fontSize + labelOpts.padding;
                    lineWidths[lineWidths.length - (i > 0 ? 0 : 1)] = 0;
                }

                // Store the hitbox width and height here. Final position will be updated in `draw`
                hitboxes[i] = {
                    left: 0,
                    top: 0,
                    width: width,
                    height: fontSize
                };

                lineWidths[lineWidths.length - 1] += width + labelOpts.padding;
            });

            minSize.height += totalHeight;

        } else {
            var vPadding = labelOpts.padding;
            var columnWidths = me.columnWidths = [];
            var columnHeights = me.columnHeights = [];
            var totalWidth = labelOpts.padding;
            var currentColWidth = 0;
            var currentColHeight = 0;

            helpers.each(me.legendItems, function(legendItem, i) {
                var boxWidth = getBoxWidth(labelOpts, fontSize);
                var itemWidth = boxWidth + (fontSize / 2) + ctx.measureText(legendItem.text).width;

                // If too tall, go to new column
                if (i > 0 && currentColHeight + fontSize + 2 * vPadding > minSize.height) {
                    totalWidth += currentColWidth + labelOpts.padding;
                    columnWidths.push(currentColWidth); // previous column width
                    columnHeights.push(currentColHeight);
                    currentColWidth = 0;
                    currentColHeight = 0;
                }

                // Get max width
                currentColWidth = Max(currentColWidth, itemWidth);
                currentColHeight += fontSize + vPadding;

                // Store the hitbox width and height here. Final position will be updated in `draw`
                hitboxes[i] = {
                    left: 0,
                    top: 0,
                    width: itemWidth,
                    height: fontSize
                };
            });

            totalWidth += currentColWidth;
            columnWidths.push(currentColWidth);
            columnHeights.push(currentColHeight);
            minSize.width += totalWidth;
        }

        me.width = minSize.width;
        me.height = minSize.height;
    },
    afterFit: noop,

    // Shared Methods
    isHorizontal: function() {
        return this.options.position === 'top' || this.options.position === 'bottom';
    },

    // Actually draw the legend on the canvas
    draw: function() {
        var me = this;
        var opts = me.options;
        var labelOpts = opts.labels;
        var globalDefaults = core_defaults.global;
        var defaultColor = globalDefaults.defaultColor;
        var lineDefault = globalDefaults.elements.line;
        var legendHeight = me.height;
        var columnHeights = me.columnHeights;
        var legendWidth = me.width;
        var lineWidths = me.lineWidths;

        if (!opts.display) {
            return;
        }

        var ctx = me.ctx;
        var fontColor = Undefined(labelOpts.fontColor, globalDefaults.defaultFontColor);
        var labelFont = helpers.options._parseFont(labelOpts);
        var fontSize = labelFont.size;
        var cursor;

        // Canvas setup
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 0.5;
        ctx.strokeStyle = fontColor; // for strikethrough effect
        ctx.fillStyle = fontColor; // render in correct colour
        ctx.font = labelFont.string;

        var boxWidth = getBoxWidth(labelOpts, fontSize);
        var hitboxes = me.legendHitBoxes;

        // current position
        var drawLegendBox = function(x, y, legendItem) {
            if (isNaN(boxWidth) || boxWidth <= 0) {
                return;
            }

            // Set the ctx for the box
            ctx.save();

            var lineWidth = Undefined(legendItem.lineWidth, lineDefault.borderWidth);
            ctx.fillStyle = Undefined(legendItem.fillStyle, defaultColor);
            ctx.lineCap = Undefined(legendItem.lineCap, lineDefault.borderCapStyle);
            ctx.lineDashOffset = Undefined(legendItem.lineDashOffset, lineDefault.borderDashOffset);
            ctx.lineJoin = Undefined(legendItem.lineJoin, lineDefault.borderJoinStyle);
            ctx.lineWidth = lineWidth;
            ctx.strokeStyle = Undefined(legendItem.strokeStyle, defaultColor);

            if (ctx.setLineDash) {
                // IE 9 and 10 do not support line dash
                ctx.setLineDash(Undefined(legendItem.lineDash, lineDefault.borderDash));
            }

            if (labelOpts && labelOpts.usePointStyle) {
                // Recalculate x and y for drawPoint() because its expecting
                // x and y to be center of figure (instead of top left)
                var radius = boxWidth * Math.SQRT2 / 2;
                var centerX = x + boxWidth / 2;
                var centerY = y + fontSize / 2;

                // Draw pointStyle as legend symbol
                helpers.canvas.drawPoint(ctx, legendItem.pointStyle, radius, centerX, centerY, legendItem.rotation);
            } else {
                // Draw box as legend symbol
                ctx.fillRect(x, y, boxWidth, fontSize);
                if (lineWidth !== 0) {
                    ctx.strokeRect(x, y, boxWidth, fontSize);
                }
            }

            ctx.restore();
        };

        var fillText = function(x, y, legendItem, textWidth) {
            var halfFontSize = fontSize / 2;
            var xLeft = x + boxWidth + halfFontSize;
            var yMiddle = y + halfFontSize;

            ctx.fillText(legendItem.text, xLeft, yMiddle);

            if (legendItem.hidden) {
                // Strikethrough the text if hidden
                ctx.beginPath();
                ctx.lineWidth = 2;
                ctx.moveTo(xLeft, yMiddle);
                ctx.lineTo(xLeft + textWidth, yMiddle);
                ctx.stroke();
            }
        };

        var alignmentOffset = function(dimension, blockSize) {
            switch (opts.align) {
            case 'start':
                return labelOpts.padding;
            case 'end':
                return dimension - blockSize;
            default: // center
                return (dimension - blockSize + labelOpts.padding) / 2;
            }
        };

        // Horizontal
        var isHorizontal = me.isHorizontal();
        if (isHorizontal) {
            cursor = {
                x: me.left + alignmentOffset(legendWidth, lineWidths[0]),
                y: me.top + labelOpts.padding,
                line: 0,
            };
        } else {
            cursor = {
                x: me.left + labelOpts.padding,
                y: me.top + alignmentOffset(legendHeight, columnHeights[0]),
                line: 0,
            };
        }

        var itemHeight = fontSize + labelOpts.padding;
        helpers.each(me.legendItems, function(legendItem, i) {
            var textWidth = ctx.measureText(legendItem.text).width;
            var width = boxWidth + (fontSize / 2) + textWidth;
            var x = cursor.x;
            var y = cursor.y;

            // Use (me.left + me.minSize.width) and (me.top + me.minSize.height)
            // instead of me.right and me.bottom because me.width and me.height
            // may have been changed since me.minSize was calculated
            if (isHorizontal) {
                if (i > 0 && x + width + labelOpts.padding > me.left + me.minSize.width) {
                    y = cursor.y += itemHeight;
                    cursor.line++;
                    x = cursor.x = me.left + alignmentOffset(legendWidth, lineWidths[cursor.line]);
                }
            } else if (i > 0 && y + itemHeight > me.top + me.minSize.height) {
                x = cursor.x = x + me.columnWidths[cursor.line] + labelOpts.padding;
                cursor.line++;
                y = cursor.y = me.top + alignmentOffset(legendHeight, columnHeights[cursor.line]);
            }

            drawLegendBox(x, y, legendItem);

            hitboxes[i].left = x;
            hitboxes[i].top = y;

            // Fill the actual label
            fillText(x, y, legendItem, textWidth);

            if (isHorizontal) {
                cursor.x += width + labelOpts.padding;
            } else {
                cursor.y += itemHeight;
            }
        });
    },

    /**
     * @private
     */
    _getLegendItemAt: function(x, y) {
        var me = this;
        var i, hitBox, lh;

        if (x >= me.left && x <= me.right && y >= me.top && y <= me.bottom) {
            // See if we are touching one of the dataset boxes
            lh = me.legendHitBoxes;
            for (i = 0; i < lh.length; ++i) {
                hitBox = lh[i];

                if (x >= hitBox.left && x <= hitBox.left + hitBox.width && y >= hitBox.top && y <= hitBox.top + hitBox.height) {
                    // Touching an element
                    return me.legendItems[i];
                }
            }
        }

        return null;
    },

    /**
     * Handle an event
     * @private
     * @param {IEvent} event - The event to handle
     */
    handleEvent: function(e) {
        var me = this;
        var opts = me.options;
        var type = e.type === 'mouseup' ? 'click' : e.type;
        var hoveredItem;

        if (type === 'mousemove') {
            if (!opts.onHover && !opts.onLeave) {
                return;
            }
        } else if (type === 'click') {
            if (!opts.onClick) {
                return;
            }
        } else {
            return;
        }

        // Chart event already has relative position in it
        hoveredItem = me._getLegendItemAt(e.x, e.y);

        if (type === 'click') {
            if (hoveredItem && opts.onClick) {
                // use e.native for backwards compatibility
                opts.onClick.call(me, e.native, hoveredItem);
            }
        } else {
            if (opts.onLeave && hoveredItem !== me._hoveredItem) {
                if (me._hoveredItem) {
                    opts.onLeave.call(me, e.native, me._hoveredItem);
                }
                me._hoveredItem = hoveredItem;
            }

            if (opts.onHover && hoveredItem) {
                // use e.native for backwards compatibility
                opts.onHover.call(me, e.native, hoveredItem);
            }
        }
    }
});

function createNewLegendAndAttach(chart, legendOpts) {
    var legend = new Legend({
        ctx: chart.ctx,
        options: legendOpts,
        chart: chart
    });

    core_layouts.configure(chart, legend, legendOpts);
    core_layouts.addBox(chart, legend);
    chart.legend = legend;
}

var plugin_legend = {
    id: 'legend',

    /**
     * Backward compatibility: since 2.1.5, the legend is registered as a plugin, making
     * Chart.Legend obsolete. To avoid a breaking change, we export the Legend as part of
     * the plugin, which one will be re-exposed in the chart.js file.
     * https://github.com/chartjs/Chart.js/pull/2640
     * @private
     */
    _element: Legend,

    beforeInit: function(chart) {
        var legendOpts = chart.options.legend;

        if (legendOpts) {
            createNewLegendAndAttach(chart, legendOpts);
        }
    },

    beforeUpdate: function(chart) {
        var legendOpts = chart.options.legend;
        var legend = chart.legend;

        if (legendOpts) {
            Merge(legendOpts, core_defaults.global.legend, 0);

            if (legend) {
                core_layouts.configure(chart, legend, legendOpts);
                legend.options = legendOpts;
            } else {
                createNewLegendAndAttach(chart, legendOpts);
            }
        } else if (legend) {
            core_layouts.removeBox(chart, legend);
            delete chart.legend;
        }
    },

    afterEvent: function(chart, e) {
        var legend = chart.legend;
        if (legend) {
            legend.handleEvent(e);
        }
    }
};

Merge(core_defaults, {
    global: {
        title: {
            display: false,
            fontStyle: 'bold',
            fullWidth: true,
            padding: 10,
            position: 'top',
            text: '',
            weight: 2000,        // by default greater than legend (1000) to be above
        },
    },
});

var plugins = {};
var legend = plugin_legend;
plugins.legend = legend;

/**
 * @namespace Chart
 */


core_controller.helpers = helpers;

// @todo dispatch these helpers into appropriated helpers/helpers.* file and write unit tests!
core_helpers();

Assign(core_controller, {
    Animation: core_animation,
    animationService: core_animations,
    controllers: controllers,
    DatasetController: core_datasetController,
    defaults: core_defaults,
    Element: Element,
    elements: elements,
    Interaction: core_interaction,
    layouts: core_layouts,
    platform: platform,
    plugins: core_plugins,
    Scale: core_scale,
    scaleService: core_scaleService,
    Ticks: core_ticks,
    Tooltip: core_tooltip,
});

// Register built-in scales

core_controller.helpers.each(scales, function(scale, type) {
    core_controller.scaleService.registerScaleType(type, scale, scale._defaults);
});

// Load to register built-in adapters (as side effects)


// Loading built-in plugins

for (var k in plugins) {
    if (plugins.hasOwnProperty(k)) {
        core_controller.plugins.register(plugins[k]);
    }
}

core_controller.platform.initialize();

var src = core_controller;
window.Chart = core_controller;
window.ChartDefaults = core_defaults;

return src;

})));
