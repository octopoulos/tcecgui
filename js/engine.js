// engine.js
// @author octopoulo <polluxyz@gmail.com>
// @version 2020-04-13
//
// used as a base for all frameworks
// unlike common.js, states are required
// contains global vars but the script will be imported in a function => they become local
//
// included after: common
/*
globals
_, Abs, Assign, Attrs, clearTimeout, DefaultFloat, document, E, HTML, Keys, localStorage, LS, Min, navigator, Now,
Parent, QueryString, requestAnimationFrame, Resource, SetDefault, setTimeout, TEXT, Title, window
*/
'use strict';

let __PREFIX = '_',
    api = {},
    api_times = {},
    DEFAULTS = {
        lan: '',
        theme: '',
    },
    DEV = {},
    device = {},
    drag,
    drag_moved,
    drag_scroll = 3,
    drag_target,
    drag_type,
    ICONS = {},
    KEY_TIMES = {},
    KEYS = {},
    LANGUAGES = {},
    // only if they're different from the first 2 letters, ex: it:ita is not necessary
    LANGUAGES_23 = {
        es: 'spa',
        ja: 'jpn',
        pl: 'pol',
        sv: 'swe',
    },
    Lower = (text) => (text.toLowerCase()),
    scroll_target,
    THEMES = [''],
    TIMEOUT_translate = 3600 * 24,
    timers = {},
    TOUCH_ENDS = {mouseleave: 1, mouseup: 1, touchend: 1},
    touch_last = {x: 0, y: 0},
    TOUCH_MOVES = {mousemove: 1, touchmove: 2},
    touch_moves = [],
    touch_now,
    touch_scroll = {x: 0, y: 0},
    touch_speed = {x: 0, y: 0},
    touch_start,
    TOUCH_STARTS = {mousedown: 1, mouseenter: 1, touchstart: 2},
    translates = {},
    Upper = (text) => (text.toUpperCase()),
    // virtual functions, can be assigned
    virtual_rename_option,
    virtual_set_combo_special,
    X_SETTINGS = {},
    Y = {};                                             // params

// HELPERS
//////////

/**
 * Add a timeout
 * @param {string} name
 * @param {function} func function to be called after the timer
 * @param {number} timer milliseconds
 */
function add_timeout(name, func, timer) {
    clear_timeout(name);
    if (timer)
        timers[name] = setTimeout(func, timer);
    else
        func();
    if (DEV.frame & 2) {
        LS(`add_timeout: ${name} : ${timer}`);
        LS(timers);
    }
}

/**
 * Clear a timeout
 * @param {string} name
 */
function clear_timeout(name) {
    if (!timers[name])
        return;
    clearTimeout(timers[name]);
    delete timers[name];
    if (DEV.frame & 2)
        LS(`clear_timeout: ${name}`);
}

/**
 * Local Storage - get float
 * @param {string} name
 * @param {number} def
 * @returns {number}
 */
function get_float(name, def) {
    return DefaultFloat(get_string(name), def);
}

/**
 * Local Storage - get int
 * @param {string} name
 * @param {number} def also used if the value cannot be converted to an `int`
 * @returns {number}
 */
function get_int(name, def) {
    let value = parseInt(get_string(name));
    if (isNaN(value))
        value = def;
    return value;
}

/**
 * Local Storage - get an object
 * @param {string} name
 * @returns {Object}
 */
function get_object(name) {
    let text = get_string(name);
    if (!text)
        return text;
    try {
        return JSON.parse(text);
    }
    catch(error) {
        return undefined;
    }
}

/**
 * Local Storage - get string
 * @param {string} name
 * @param {string} def
 * @returns {string}
 */
function get_string(name, def) {
    let value = localStorage.getItem(`${__PREFIX}${name}`);
    return (value == 'undefined')? def: (value || def);
}

/**
 * Merge settings
 * @param {Object} x_settings
 */
function merge_settings(x_settings) {
    Keys(x_settings).forEach(name => {
        let exists = SetDefault(X_SETTINGS, name, {});
        Assign(exists, x_settings[name]);
        X_SETTINGS[name] = Assign({}, ...Keys(exists).sort().map(key => ({[key]: exists[key]})));
    });
    Keys(X_SETTINGS).forEach(name => {
        let settings = X_SETTINGS[name];
        Assign(DEFAULTS, Assign({}, ...Keys(settings).map(key => ({[key]: settings[key][1]}))));
    });
}

/**
 * Local Storage - remove a key
 * @param {string} name
 */
function remove_storage(name) {
    localStorage.removeItem(`${__PREFIX}${name}`);
}

/**
 * Save a Y value + to Local Storage
 * @param {string} name
 * @param {*} value value for the name
 */
function save_option(name, value) {
    Y[name] = value;
    save_storage(name, value);
}

/**
 * Local Storage - save a value
 * @param {string} name
 * @param {*} value value for the name
 */
function save_storage(name, value) {
    if (typeof(value) == 'object')
        value = JSON.stringify(value);
    localStorage.setItem(`${__PREFIX}${name}`, value);
}

// TRANSLATIONS
///////////////

/**
 * Resize text if it's too long
 * @param {string} text
 * @param {number} resize maximum size
 * @returns {string} the resized text
 */
function resize_text(text, resize)
{
    if (!text || resize < 1 || typeof(text) != 'string')
        return text;

    let len = text.length;
    if (Upper(text) == text)
        len *= 3/2;

    if (len > resize)
        text = `<span style="font-size:80%">${text}</span>`;
    return text;
}

/**
 * Set the text of a node and update its data-t
 * @param {string|Node} node CSS selector or node
 * @param {string} text
 */
function set_text(node, text) {
    Attrs(node, 'data-t', text);
    TEXT(node, translate_expression(text));
}

/**
 * Translate a text, return null if not found
 * @param {string} text
 * @returns {string|null} translated text
 */
function translate(text) {
    if (Y.lan == 'eng')
        return text.includes('{')? null: text;

    // mode
    if (!translates)
        return text;
    let result = translates[text];
    if (result)
        return result;

    let lower = Lower(text);
    if (lower == text)
        return null;

    result = translates[lower];
    if (!result)
        return null;

    // MODE
    if (text == Upper(text))
        return Upper(result);

    // Mode
    if (text[0] == Upper(text[0]))
        return Title(result);

    return null;
}

/**
 * Translate a text, defaults to itself
 * @param {string} text
 * @returns {string|null} translated text
 */
function translate_default(text) {
    return translate(text) || text;
}

/**
 * Translate an expression
 * @param {string} text
 * @returns {string} translated text
 */
function translate_expression(text) {
    if (!text)
        return '';

    // 1) try a direct translation
    let result = translate(text);
    if (result)
        return result;

    // 2) translate the {...} parts of the text
    // + return text if no translation found
    if (text.includes('{'))
        text = text.replace(/{(.*?)}/g, (_match, p1) => translate_default(p1));
    return text;
}

/**
 * Translate a node
 * - resolve all data-t, data-t2=target, data-tr=resize
 * @param {string|Node=} parent CSS selector or node
 */
function translate_node(parent) {
    E('[data-t]', node => {
        let tag = node.tagName,
            target = node.dataset.t2,
            text = node.dataset.t,
            translated = translate_expression(text);

        if (!target)
            if (tag == 'INPUT')
                target = 'value';
            else if (tag == 'IMG')
                target = 'title';

        if (target)
            node.setAttribute(target, translated);
        else {
            let resize = node.dataset.tr;
            if (resize)
                translated = resize_text(translated, parseInt(resize));
            TEXT(node, translated);
        }
    }, _(parent));
}

// NODES
////////

/**
 * Create a canvas for a texture
 * @param {number} width
 * @param {number=} height
 * @returns {Object}
 */
function create_canvas(width, height) {
    let canvas = document.createElement('canvas'),
        ctx = canvas.getContext('2d');

    canvas.width = width;
    canvas.height = height || width;
    return ctx;
}

/**
 * Fill a combo filter
 * @param {string} letter, ex: m=mode, v=view ... or a selector
 * @param {string[]} values list of values for the combo, default to [DEFAULTS[letter]]
 * @param {string=} select the value to be selected, default to Y[letter]
 * @param {Object=} dico used to name the values, ex: 01 => cheater
 * @param {boolean=} no_translate don't translate the options
 * @returns {string} the selected value
 */
function fill_combo(letter, values, select, dico, no_translate)
{
    if (values == null)
        values = [DEFAULTS[letter]];
    if (select == null)
        select = Y[letter];

    let found = 'all',
        group = false,
        lines = [];

    if (dico === undefined)
        dico = {};

    for (let value_ of values) {
        let selected,
            items = value_.split('='),
            text = items.slice(-1)[0],
            value = Lower(items.slice(-2)[0]);

        if (value.slice(0, 2) == '* ') {
            if (group) lines.push('</optgroup>');
            group = true;
            lines.push(`<optgroup data-t="${text.slice(2)}" data-t2="label">`);
            continue;
        }

        if (select == value.split('|')[0]) {
            selected = ' selected="selected"';
            found = value;
        }
        else
            selected = '';

        // 'name of event|extra|info' => 'name of event'
        text = text.split('|')[0];
        // rename using dico or custom function
        if (items.length < 2) {
            text = dico[text] || text;
            if (virtual_rename_option)
                text = virtual_rename_option(value, text);
        }

        // parent:child => {parent}: {child}
        let splits = text.split(':');
        if (splits.length > 1)
            text = `{${splits[0]}}: {${splits[1]}}`;

        if (no_translate)
            lines.push(`<option value="${value}"${selected}>${text}</option>`);
        else
            lines.push(`<option value="${value}"${selected} data-t="${text}"></option>`);
    }
    if (group)
        lines.push('</optgroup>');

    // set the HTML: 1 letter => #co+letter, otherwise letter is a selector
    if (letter) {
        let sel = letter_selector(letter);
        HTML(sel, lines.join(''));
        translate_node(sel);
    }
    return found.split('|')[0];
}

/**
 * Fill the languages
 * @param {string|Node} sel CSS selector or node
 */
function fill_languages(sel) {
    fill_combo(sel, Keys(LANGUAGES), Y.lan || 'eng', LANGUAGES);
}

/**
 * Get the selector for a single letter
 * + letter is a selector if it has more than 1 letter
 * @param {string} letter
 * @returns {string} CSS selector
 */
function letter_selector(letter) {
    if (letter.length == 1)
        letter = `#co${letter}`;
    return letter;
}

/**
 * Set a combo value
 * @param {string} letter combo letter: g, m, t, c, f + special cases: n, o, s
 * @param {string} value
 * @param {boolean|string=} [save=true] save in memory, if string: use this for saving, ex: #classes => class
 */
function set_combo_value(letter, value, save=true) {
    // n, o, s special cases
    if (virtual_set_combo_special && !virtual_set_combo_special(letter, value)) {
        let combo = _(letter_selector(letter)),
            index = 0;
        if (!combo)
            return;

        for (let option of combo.options) {
            if (option.value.split('|')[0] == value) {
                combo.selectedIndex = index;
                break;
            }
            index ++;
        }
    }

    // save in memory
    if (save) {
        if (typeof(save) == 'string')
            letter = save;

        if (Y[letter] !== value) {
            Y[letter] = value;
            // filter changed => go back to page 1
            Y.skip = 0;
        }
        save_storage(letter, value);
    }
}

/**
 * Resolve the SVG
 * @param {Node=} parent
 */
function update_svg(parent) {
    E('i[data-svg]', node => {
        let name = node.dataset.svg,
            image = ICONS[name.split(' ')[0]];
        if (image) {
            image = `<svg class="svg ${name}" xmlns="http://www.w3.org/2000/svg" ${image}</svg>`;
            HTML(node, image);
            delete node.dataset.svg;
        }
    }, parent);
}

/**
 * Update the theme
 * @param {function=} callback
 * @param {number} version CSS version, use Now() to force reload
 */
function update_theme(callback, version=15) {
    let parent = _('#extra-style');
    if (!parent)
        return;
    let child = parent.firstChild,
        theme = Y.theme;

    // default theme
    if (theme == THEMES[0]) {
        if (child) {
            child.setAttribute('href2', child.href);
            child.removeAttribute('href');
        }
    }
    else {
        if (!child) {
            child = document.createElement('link');
            child.rel = 'stylesheet';
            parent.appendChild(child);
        }
        child.href = `css/theme-${theme}.css?v=${version}`;
        child.removeAttribute('href2');
    }

    // post-process
    update_svg();
    if (callback)
        callback();
}

// BROWSER
//////////

/**
 * Check the query hash/string
 */
function check_hash() {
    let string = QueryString(false, '', '', {}, 'hash');
    Assign(Y, ...Keys(string).map(key => ({[key]: (string[key] == 'undefined')? undefined: string[key]})));
    sanitise_data();
}

/**
 * Detect the device
 */
function detect_device() {
    let agent = navigator.userAgent || navigator.vendor || window.opera,
        mobile = false,
        os = '?';

    if (/windows phone/i.test(agent))
        os = 'windows';
    else if (/android/i.test(agent))
        os = 'android';
    else if (/iPad|iPhone|iPod/.test(agent) && !window.MSStream)
        os = 'ios';

    if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|ipad|iris|kindle|Android|Silk|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(agent))
        mobile = true;

    device.os = os;
    device.mobile = mobile;
}

/**
 * Guess the browser language
 */
function guess_browser_language() {
    let indices = Assign({}, ...Keys(LANGUAGES).map(lan => ({[lan.slice(0, 2)]: lan}))),
        languages = [...[navigator.language], ...navigator.languages];
    Assign(indices, LANGUAGES_23);
    for (let lan of languages) {
        lan = lan.split('-')[0];
        let index = indices[lan];
        if (index) {
            Y.lan = index;
            break;
        }
    }
}

/**
 * Check if the browser is in full screen mode
 */
function is_fullscreen() {
    return document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement;
}

/**
 * Load default settings
 */
function load_defaults() {
    Keys(DEFAULTS).forEach(key => {
        let value,
            def = DEFAULTS[key];
        if (Number.isInteger(def))
            value = get_int(key, def);
        else if (Number.isFinite(def))
            value = get_float(key, def);
        else if (typeof(def) == 'object')
            value = get_object(key);
        else
            value = get_string(key, def);
        Y[key] = value;
    });

    // use browser language
    if (!Y.lan)
        guess_browser_language();
}

/**
 * Make sure there is no garbage data
 */
function sanitise_data() {
    // convert string to number
    Keys(DEFAULTS).forEach(key => {
        let def = DEFAULTS[key],
            value = Y[key];
        if (Number.isInteger(def) && !Number.isInteger(value))
            Y[key] = parseInt(value) || def;
        else if (Number.isFinite(def) && !Number.isFinite(value))
            Y[key] = parseFloat(value) || def;
    });
}

/**
 * Change mouse cursor
 * @param {string} cursor
 */
function set_cursor(cursor='') {
    if (!device.mobile)
        document.body.style.cursor = cursor;
}

/**
 * Toggle full screen mode
 * @param {function} callback
 */
function toggle_fullscreen(callback) {
    let full = is_fullscreen();
    if (is_fullscreen()) {
        let exit = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen;
        if (exit)
            exit.call(document);
    }
    else {
        let body = document.body,
            enter = body.requestFullscreen || body.webkitRequestFullScreen || body.mozRequestFullScreen;
        if (enter)
            enter.call(body);
    }

    if (callback)
        callback(full);
}

// TOUCH
////////

/**
 * Add a touch move
 * @param {Object} change
 * @param {number} stamp
 * @param {number=} ratio_x
 * @param {number=} ratio_y
 * @returns {number[]} deltas
 */
function add_move(change, stamp, ratio_x=1, ratio_y=1) {
    if (!drag)
        return [0, 0];
    let dx = (change.x - drag[0].x) * ratio_x,
        dy = (change.y - drag[0].y) * ratio_y;
    touch_moves.push([dx, dy, (stamp - drag[1])]);
    return [dx, dy];
}

/**
 * Get the changed touches + stamp
 * @param {Event} e
 * @returns {*[]} [changed_touches, stamp]
 */
function get_changed_touches(e) {
    let touches = e.changedTouches || e.touches;
    if (touches)
        touches = [...touches].map(touch => ({x: touch.clientX, y: touch.clientY}));
    else
        touches = [{x: e.clientX, y: e.clientY}];
    return [touches, e.timeStamp];
}

/**
 * Render the inertial scrolling
 */
function render_scroll() {
    let now = Now(true),
        delta = Min(33, (now - touch_now) * 1000),
        ratio = (drag_type == 'mouse')? 0.93: 0.96;

    touch_scroll.x -= touch_speed.x * delta;
    touch_scroll.y -= touch_speed.y * delta;
    set_scroll();

    if (Abs(touch_speed.x) > 0.01 || Abs(touch_speed.y) > 0.01) {
        touch_speed.x *= ratio;
        touch_speed.y *= ratio;
        requestAnimationFrame(render_scroll);
    }
    touch_now = now;
}

/**
 * Set the scroll
 */
function set_scroll() {
    // horizontal
    let node = drag_target || scroll_target;
    if (!node)
        return;
    if (drag_scroll & 1) {
        node.scrollLeft = touch_scroll.x;
        touch_scroll.x = node.scrollLeft;
    }

    // vertical
    if (drag_scroll & 2) {
        let scroll = document.scrollingElement;
        scroll.scrollTop = touch_scroll.y;
        touch_scroll.y = document.scrollingElement.scrollTop;
    }
}

/**
 * Stop dragging
 */
function stop_drag() {
    drag = null;
    drag_moved = false;
    drag_scroll = 3;
    drag_target = null;
}

/**
 * Handle a touch/mouse event
 * @param {Event} e
 * @returns {Object[]}
 */
function touch_event(e) {
    let [changes, stamp] = get_changed_touches(e),
        change = changes[0],
        error = -1,
        length = changes.length;

    // multiple inputs => keep the one closer to the previous input
    if (length > 1) {
        if (drag) {
            let best_x, best_y;
            for (let touch of changes) {
                let dx = (touch.x - touch_last.x),
                    dy = (touch.y - touch_last.y),
                    delta = dx * dx + dy * dy;

                if (error < 0 || delta < error) {
                    error = delta;
                    best_x = touch.x;
                    best_y = touch.y;
                }
            }
            if (error >= 0)
                change = {x: best_x, y: best_y};
        }
        else {
            let total = [0, 0];
            for (let touch of changes) {
                total[0] += touch.x;
                total[1] += touch.y;
            }
            change = {x: total[0] / length, y: total[1] / length};
        }
    }
    else if (drag) {
        let dx = (change.x - touch_last.x),
            dy = (change.y - touch_last.y);
        error = dx * dx + dy * dy;
    }

    return [change, stamp, error];
}

/**
 * Handle a touch event
 * @param {Event} e
 */
function touch_handle(e) {
    let buttons = e.buttons,
        [change, stamp, error] = touch_event(e),
        type = e.type,
        type5 = type.slice(0, 5);

    if (error > 150 * 150)
        return;

    if (TOUCH_STARTS[type]) {
        let old_target = drag_target;
        stop_drag();
        if (type5 == 'mouse' && buttons != 1)
            return;
        // input => skip
        if (['INPUT', 'SELECT'].includes(e.target.tagName))
            return;
        // can only acquire a new target with a click
        if (type == 'mouseenter' && !old_target)
            return;

        clear_timeout('touch_end');
        drag = [change, stamp];
        drag_target = Parent(e.target, 'div', 'scroller', null, true);
        drag_type = type5;
        touch_last = change;
        touch_moves = [];
        touch_now = Now(true);
        touch_scroll = {
            x: drag_target.scrollLeft,
            y: document.scrollingElement.scrollTop,
        };
        touch_speed = {x: 0, y: 0};
        touch_start = touch_now;
    }
    else if (TOUCH_MOVES[type]) {
        if (!drag)
            return;
        // reset needed when we move the mouse outside the window, then come back
        if (type == 'mousemove' && !buttons) {
            stop_drag();
            return;
        }

        drag_moved = true;
        let [dx, dy] = add_move(change, stamp);
        touch_last = change;
        touch_scroll.x -= dx;
        touch_scroll.y -= dy;
        set_scroll();
        drag = [change, stamp];

        if (e.cancelable || type5 != 'touch')
            e.preventDefault();
    }
    else if (TOUCH_ENDS[type]) {
        if (!drag || !drag_moved)
            return;
        add_move(change, stamp);

        // inertia during the last 100ms
        let sumx = 0,
            sumy = 0,
            time = 0;
        for (let [dx, dy, ms] of touch_moves.reverse()) {
            sumx += dx;
            sumy += dy;
            time += ms;
            if (time >= 100)
                break;
        }

        touch_now = Now(true);
        let absx = Abs(sumx),
            absy = Abs(sumy),
            elapsed = touch_now - touch_start;

        // some movement => scroll
        if (absx > 1 || absy > 1) {
            scroll_target = drag_target;
            touch_speed = {x: sumx / time, y: sumy / time};
            requestAnimationFrame(render_scroll);
        }
        // big movement or average duration => prevent click
        if (type != 'mouseleave') {
            drag = null;
            if (absx > 2 || absy > 2 || (elapsed > 0.3 && elapsed < 1))
                add_timeout('touch_end', stop_drag, 10);
            else
                stop_drag();
        }
    }

    e.stopPropagation();
}

// API
//////

/**
 * Get translations
 */
function api_translate_get() {
    // 1) cached?
    if (Y.lan == 'eng' || (translates._lan == Y.lan && Now() < (api_times.translate || 0) + TIMEOUT_translate)) {
        translate_node('body');
        return;
    }

    // 2) call the API
    Resource(`translate/${Y.lan}.json`, (code, data) => {
        if (code != 200)
            return;
        translates = data;
        api_times.translate = Now(true);
        save_storage('trans', translates);
        save_storage('times', api_times);
        translate_node('body');
    });
}
