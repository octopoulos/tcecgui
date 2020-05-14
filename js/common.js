// common.js
// @author octopoulo <polluxyz@gmail.com>
// @version 2020-05-11
//
// utility JS functions used in all the sites
// no state is being required
//
/*
globals
console, document, FormData, location, Node, Window, XMLHttpRequest
*/
'use strict';

// MATH FUNCTIONS
/////////////////

let Abs = Math.abs,
    Assign = Object.assign,
    Ceil = Math.ceil,
    Exp = Math.exp,
    Floor = Math.floor,
    Keys = Object.keys,
    Max = Math.max,
    Min = Math.min,
    Pow = Math.pow,
    Random = Math.random,
    Round = Math.round,
    Sign = Math.sign,
    Sqrt = Math.sqrt,
    Tanh = Math.tanh;

let NAMESPACE_SVG = 'http://www.w3.org/2000/svg';

// ELEMENTARY NODE FUNCTIONS
////////////////////////////
/**
 * Find 1 node
 * @param {string|Node} sel CSS selector or node
 * @param {Node=} parent parent node, document by default
 * @returns {Node} found node
 * @example
 * _('input')      // get the first <input> nodes
 * _('a', node)    // get the first link inside the node
 */
function _(sel, parent) {
    if (!sel) return;
    if (typeof(sel) == 'object')
        return sel;
    return (parent || document).querySelector(sel);
}

/**
 * Find multiple nodes
 * @param {string|Node[]} sel CSS selector OR list of nodes
 * @param {Node=} parent parent node, document by default
 * @returns {Node[]} found nodes
 * @example
 * A('input')       // get all the <input> nodes
 * A('a', node)     // get all the links inside the node
 */
function A(sel, parent) {
    if (!sel) return;
    if (typeof(sel) == 'object' && sel.length)
        return sel;
    return (parent || document).querySelectorAll(sel);
}

/**
 * Execute a function on multiple nodes
 * @param {string|Node[]} sel CSS selector OR list of nodes
 * @param {function} callback (node, index=, array=)
 * @param {Node=} parent
 * @example
 * E('input[type=text]', node => {LS(node)})     // print all the text <input> nodes
 */
function E(sel, callback, parent) {
    if (!sel) return;
    if (typeof(sel) == 'object' && sel.length)
        sel.forEach(callback);
    else
        A(sel, parent).forEach(callback);
}

/**
 * Get an element by ID
 * @param {string|Node} id
 * @param {Node=} parent parent node, document by default
 * @returns {Node=}
 */
function Id(id, parent) {
    if (!id) return;
    if (typeof(id) == 'object')
        return id;
    return (parent || document).getElementById(id);
}

// DERIVED NODE FUNCTIONS
/////////////////////////
/**
 * Change attributes
 * @param {string|Node} sel CSS selector or node
 * @param {string} attr attribute to change
 * @param {string|boolean=} value value to set
 * @param {Node=} parent
 * @example
 * Attrs('input', 'disabled', true)                 // disable all inputs
 * Attrs('input', 'disabled', false)                // enable all inputs
 * Attrs('input', 'disabled')                       // enable all inputs
 * Attrs('a', 'href', 'https://www.google.com')     // all links will link to google
 */
function Attrs(sel, attr, value, parent) {
    if (!sel) return;
    if (typeof(sel) == 'object') {
        if (typeof(value) == 'string')
            sel.setAttribute(attr, value);
        else if (value === true)
            sel.setAttribute(attr, attr);
        else
            sel.removeAttribute(attr);
        return;
    }
    //
    E(sel, node => {
        if (typeof(value) == 'string')
            node.setAttribute(attr, value);
        else if (value === true)
            node.setAttribute(attr, attr);
        else
            node.removeAttribute(attr);
    }, parent);
}

/**
 * Click event on nodes
 * @param {string|Node} sel CSS selector or node
 * @param {function} callback (event)
 * @param {Node=} parent
 * @example
 * C('img', function() {LS(this.src)})  // print the URL of the image being clicked
 */
function C(sel, callback, parent) {
    if (!sel) return;
    if (typeof(sel) == 'object') {
        sel.onclick = callback;
        return;
    }
    //
    E(sel, node => {
        node.onclick = callback;
    }, parent);
}

/**
 * Add / remove classes
 * @param {string|Node} sel CSS selector or node
 * @param {string} class_ 'add +also_add -remove ^toggle'
 * @param {boolean=} [add=true] true for normal behavior (default), otherwise invert all - and +
 * @param {Node=} parent
 * @example
 * Class('img', 'dn')               // hide every image
 * Class('img', '-dn')              // restore every image
 * Class('img', '^dn')              // toggle every image
 * Class('img', '-dn +underline')   // multiple classes can be combined
 */
function Class(sel, class_, add=true, parent=null) {
    if (!sel) return;

    if (typeof(sel) == 'object') {
        let list = sel.classList;
        class_.split(' ').forEach(item => {
            let first = item.substr(0, 1),
                right = item.substr(1);
            if (first == '-') {
                if (add)
                    list.remove(right);
                else
                    list.add(right);
            }
            else if (first == '+') {
                if (add)
                    list.add(right);
                else
                    list.remove(right);
            }
            else if (first == '^')
                list.toggle(right);
            else if (add)
                list.add(item);
            else
                list.remove(item);
        });
        return;
    }
    //
    E(sel, node => {
        let list = node.classList;
        class_.split(' ').forEach(item => {
            let first = item.substr(0, 1),
                right = item.substr(1);
            if (first == '-') {
                if (add)
                    list.remove(right);
                else
                    list.add(right);
            }
            else if (first == '+') {
                if (add)
                    list.add(right);
                else
                    list.remove(right);
            }
            else if (first == '^')
                list.toggle(right);
            else if (add)
                list.add(item);
            else
                list.remove(item);
        });
    }, parent);
}

/**
 * Check if a list contains a pattern, using ^, $, *
 * @returns {boolean}
 * @example
 * Contain(['dn', 'mode'], 'mode')      // true, exact match
 * Contain(['dn', 'mode'], 'mod')       // false, exact match
 * Contain(['dn', 'mode'], '^mod')      // true, start
 * Contain(['dn', 'mode'], '*od')       // true, anywhere
 * Contain(['dn', 'mode'], '$de')       // true, end
 */
function Contain(list, pattern) {
    let first = pattern.substr(0, 1),
        length = pattern.length - 1,
        right = pattern.substr(1);

    // starts with
    if (first == '^') {
        for (let item of list)
            if (item.substr(0, length) == right)
                return true;
    // ends with
    } else if (first == '$') {
        for (let item of list)
            if (item.substr(-length) == right)
                return true;
    // includes
    } else if (first == '*') {
        for (let item of list)
            if (item.indexOf(right) >= 0)
                return true;
    }
    // exact match
    else if (list.contains)
        return list.contains(pattern);
    else
        return list.indexOf(pattern) >= 0;

    return false;
}

/**
 * Create a new node
 * + set its HTML
 * + set its attributes
 * @param {string} tag
 * @param {string=} html
 * @param {Object=} attrs
 * @returns {Node} created node
 * @example
 * node = CreateNode('li', '<span>new comment</span>')  // <li><span>new comment</span></li>
 */
function CreateNode(tag, html, attrs) {
    let node = document.createElement(tag);
    if (html)
        node.innerHTML = html;
    if (attrs)
        Keys(attrs).forEach(key => {
            node.setAttribute(key, attrs[key]);
        });
    return node;
}

/**
 * Create an SVG node
 * @param {string} type
 * @param {Object=} attrs
 */
function CreateSVG(type, attrs) {
    let node = document.createElementNS(NAMESPACE_SVG, type);
    if (attrs)
        Keys(attrs).forEach(key => {
            node.setAttributeNS(null, key, attrs[key]);
        });
    return node;
}

/**
 * Handle any events on nodes
 * + mouseenter => will use node.addEventListener('mouseenter', callback)
 * + !mouseenter => will use node.onmouseenter = callback
 * @param {string|Node} sel CSS selector or node
 * @param {string} events
 * @param {function} callback
 * @param {Object=} options
 * @param {Node=} parent
 * @example
 * Events(window, 'resize', e => {LS(e)});      // window.addEventListener('resize', function ...)
 * Events(window, '!resize', e => {LS(e)});     // window.onresize = function ...
 */
function Events(sel, events, callback, options, parent) {
    if (!sel) return;

    let direct;
    if (events.slice(0, 1) == '!') {
        events = events.slice(1);
        direct = true;
    }
    else
        direct = false;

    if (typeof(sel) == 'object') {
        events.split(' ').forEach(event => {
            if (direct)
                sel[`on${event}`] = callback;
            else
                sel.addEventListener(event, callback, options);
        });
        return;
    }
    //
    E(sel, node => {
        events.split(' ').forEach(event => {
            if (direct)
                node[`on${event}`] = callback;
            else
                node.addEventListener(event, callback, options);
        });
    }, parent);
}

/**
 * Check if a node has a class
 * @param {string|Node} node CSS selector or node
 * @param {string} class_
 * @returns {boolean}
 */
function HasClass(node, class_) {
    if (typeof(node) == 'string')
        node = _(node);
    if (!node)
        return;

    return node.classList && node.classList.contains(class_);
}

/**
 * Hide nodes
 * + handle dn
 * @param {string|Node} sel CSS selector or node
 * @param {Node=} parent
 * @example
 * Hide('body')     // hide the body
 * Hide('a')        // hide all links
 */
function Hide(sel, parent) {
    if (!sel) return;
    if (typeof(sel) == 'object') {
        sel.classList.remove('dn');
        sel.style.display = 'none';
        return;
    }
    //
    E(sel, node => {
        node.classList.remove('dn');
        node.style.display = 'none';
    }, parent);
}

/**
 * Get / set HTML
 * @param {string|Node} sel CSS selector or node
 * @param {string=} html
 * @param {Node=} parent
 * @returns {string} html of the first matched node
 * @example
 * HTML(document.documentElement)       // get the HTML of the whole page
 * HTML('a')                            // get the HTML of the first link
 * HTML('a', '<strong>hello</strong>')  // replace the content of all links
 */
function HTML(sel, html, parent) {
    if (!sel) return;
    if (typeof(sel) == 'object') {
        if (html !== undefined)
            sel.innerHTML = html;
        return sel.innerHTML;
    }
    //
    let result;
    E(sel, node => {
        if (html !== undefined)
            node.innerHTML = html;
        // FUTURE: use ?? operator
        if (result == undefined)
            result = node.innerHTML;
    }, parent);
    return result;
}

/**
 * Compute the index of the node (how many siblings are before it)
 * @param {string|Node} node CSS selector or node
 * @returns {number} computed index
 * @example
 * <tr>
 *     <td id="first"></td>
 *     <td id="second"></td>
 * </tr>
 * Index('#first')      // 1
 * Index('#second')     // 2
 */
function Index(node) {
    if (typeof(node) == 'string')
        node = _(node);
    if (!node)
        return;

    let index = 0;
    while (node) {
        node = node.previousElementSibling;
        index ++;
    }
    return index;
}

/**
 * Input event on nodes
 * @param {string|Node} sel CSS selector or node
 * @param {function} callback (event)
 * @param {Node=} parent
 * @example
 * Input('input[sb-field=username]', e => {LS(e)})   // username is being modified
 */
function Input(sel, callback, parent) {
    if (!sel) return;
    if (typeof(sel) == 'object') {
        sel.oninput = callback;
        return;
    }
    //
    E(sel, node => {
        node.oninput = callback;
    }, parent);
}

/**
 * Insert nodes into a parent
 * @param {string|Node} parent
 * @param {Node[]} nodes
 * @param {boolean=} preprend should the nodes be preprended or appended?
 * @example
 * InsertNodes('#chat', nodes, true)    // preprend
 */
function InsertNodes(parent, nodes, preprend) {
    if (typeof(parent) == 'string')
        parent = _(parent);
    if (!parent)
        return;

    for (let node of nodes) {
        let child = parent.firstChild;
        if (child && preprend)
            parent.insertBefore(node, child);
        else
            parent.appendChild(node);
    }
}

/**
 * Find a parent node by tagName and class
 * @param {string|Node} node CSS selector or node
 * @param {string=} type
 * @param {string=} class_
 * @param {string=} attrs
 * @param {boolean=} be_self true => the parent can be the node itself
 * @returns {Node=} parent node or null or undefined
 * @example
 * Parent(node, 'div', '', 'id=ok')         // find a parent with tag <div> and whose ID='ok'
 * Parent(node, 'a|div', '', 'id=ok')       // find a parent with tag <a> or <div> and whose ID='ok'
 */
function Parent(node, type, class_, attrs, be_self) {
    if (typeof(node) == 'string')
        node = _(node);
    if (!node)
        return;

    let aitems = attrs? attrs.split(' '): [],
        citems = class_? class_.split(' '): [],
        parent = node,
        types = type? type.split('|'): null;

    for (let depth = 0; ; depth ++) {
        if (depth || !be_self) {
            parent = parent.parentNode;
            if (!parent || !parent.tagName)
                return null;
        }
        let ok = true;

        // 1) tag
        if (types && !types.includes(parent.tagName.toLowerCase()))
            continue;

        // 2) match all attrs
        for (let item of aitems) {
            let [key, value] = item.split('='),
                attr = parent.getAttribute(key);
            if ((!attr && !parent.hasOwnProperty(key)) || (value && attr != value)) {
                ok = false;
                break;
            }
        }
        if (!ok)
            continue;

        // 3) match all classes, ex: 'visible -shown'
        let list = parent.classList;
        for (let item of citems) {
            let a = item.substr(0, 1),
                b = item.substr(1);
            if (a == '-') {
                if (Contain(list, b)) {
                    ok = false;
                    break;
                }
            } else if (a == '+') {
                if (!Contain(list, b)) {
                    ok = false;
                    break;
                }
            } else if (!Contain(list, item)) {
                ok = false;
                break;
            }
        }
        if (ok)
            return parent;
    }
}

/**
 * Change properties
 * @param {string|Node} sel CSS selector or node
 * @param {string} prop property to change
 * @param {string|boolean=} value value to set
 * @param {Node=} parent
 * @example
 * Prop('input', 'checked', true)       // check the button
 */
function Prop(sel, prop, value, parent) {
    if (!sel) return;
    if (typeof(sel) == 'object') {
        sel[prop] = value;
        return;
    }
    //
    E(sel, node => {
        node[prop] = value;
    }, parent);
}

/**
 * Show / hide nodes
 * + handle dn
 * @param {string|Node} sel CSS selector or node
 * @param {boolean=} show true to show the node
 * @param {Node=} parent
 * @param {string=} [mode=''] value to use for node.display, by default '' but could be block
 * @example
 * S('a')                       // hide all links
 * S('a', true)                 // show all links
 * S('a', true, null, 'block')  // show all links with display=block
 * S('a', true, null, 'none')   // hide all links
 */
function S(sel, show, parent, mode='') {
    if (!sel) return;
    if (typeof(sel) == 'object') {
        sel.classList.remove('dn');
        sel.style.display = show? mode: 'none';
        return;
    }
    //
    E(sel, node => {
        node.classList.remove('dn');
        node.style.display = show? mode: 'none';
    }, parent);
}

/**
 * Scroll the document to the top
 * @param {string|number=} top if undefined then returns the scrollTop value
 * @returns {number}
 */
function ScrollDocument(top) {
    let scroll = document.scrollingElement;
    if (top != undefined) {
        // top can be a selector too
        if (isNaN(top)) {
            top = _(top);
            if (!top)
                return;
            top = top.offsetTop;
        }
        scroll.scrollTop = top;
    }
    return scroll.scrollTop;
}

/**
 * Show nodes
 * + handle dn
 * @param {string|Node} sel CSS selector or node
 * @param {Node=} parent
 * @param {string=} [mode=''] value to use for node.display, by default '' but could be block
 * @example
 * Show('body')     // show the body
 * Show('a')        // show all links
 */
function Show(sel, parent, mode='') {
    if (!sel) return;
    if (typeof(sel) == 'object') {
        sel.classList.remove('dn');
        sel.style.display = mode;
        return;
    }
    //
    E(sel, node => {
        node.classList.remove('dn');
        node.style.display = mode;
    }, parent);
}

/**
 * Change the style of nodes
 * @param {string|Node} sel CSS selector or node
 * @param {string} style
 * @param {boolean=} [add=true] true to set/add the style, otherwise remove it
 * @param {Node=} parent
 * @example
 * Style(document.documentElement, 'opacity:0.1')   // make the page almost transparent
 * Style('a', 'opacity:0.5')                        // set the opacity of all links
 * Style('a', 'opacity', false)                     // remove the opacity from all links
 */
function Style(sel, style, add=true, parent=null) {
    if (!sel) return;

    if (typeof(sel) == 'object') {
        let list = sel.style;
        style.split(/\s*;+\s*/).forEach(item => {
            let split,
                first = item.substr(0, 1),
                right = item.substr(1);
            if (first == '-') {
                split = right.split(':');
                if (add)
                    list.removeProperty(split[0]);
                else
                    list.setProperty(split[0], split[1]);
            } else if (first == '+') {
                split = right.split(':');
                if (add)
                    list.setProperty(split[0], split[1]);
                else
                    list.removeProperty(split[0]);
            } else if (first == '^') {
                split = right.split(':');
                if (list.getPropertyValue(split[0]))
                    list.removeProperty(split[0]);
                else
                    list.setProperty(split[0], split[1]);
            } else {
                split = item.split(':');
                if (add)
                    list.setProperty(split[0], split[1]);
                else
                    list.removeProperty(split[0]);
            }
        });
        return;
    }
    //
    E(sel, node => {
        let list = node.style;
        style.split(/\s*;+\s*/).forEach(item => {
            let split,
                first = item.substr(0, 1),
                right = item.substr(1);
            if (first == '-') {
                split = right.split(':');
                if (add)
                    list.removeProperty(split[0]);
                else
                    list.setProperty(split[0], split[1]);
            } else if (first == '+') {
                split = right.split(':');
                if (add)
                    list.setProperty(split[0], split[1]);
                else
                    list.removeProperty(split[0]);
            } else if (first == '^') {
                split = right.split(':');
                if (list.getPropertyValue(split[0]))
                    list.removeProperty(split[0]);
                else
                    list.setProperty(split[0], split[1]);
            } else {
                split = item.split(':');
                if (add)
                    list.setProperty(split[0], split[1]);
                else
                    list.removeProperty(split[0]);
            }
        });
    }, parent);
}

/**
 * Submit event on nodes
 * @param {string|Node} sel CSS selector or node
 * @param {function} callback
 * @param {Node=} parent
 * @example
 * Submit('body', () => {return false})    // prevent any Submit
 */
function Submit(sel, callback, parent) {
    if (!sel) return;
    if (typeof(sel) == 'object') {
        sel.onsubmit = callback;
        return;
    }
    //
    E(sel, node => {
        node.onsubmit = callback;
    }, parent);
}

/**
 * Get / set the textContent of nodes
 * @param {string|Node} sel CSS selector or node
 * @param {string=} text
 * @param {Node=} parent
 * @returns {string}
 * @example
 * TEXT('title')                    // get the title of the page
 * TEXT(document.documentElement)   // get the text of the whole page
 * TEXT('a', 'hello')               // replace the content of all links
 */
function TEXT(sel, text, parent) {
    if (!sel) return;
    if (typeof(sel) == 'object') {
        if (text !== undefined)
            sel.innerHTML = text;
        return sel.textContent.trim();
    }
    //
    let result;
    E(sel, node => {
        if (text !== undefined)
            node.innerHTML = text;
        // FUTURE: use ?? operator
        if (result === undefined)
            result = node.textContent.trim();
    }, parent);
    return result;
}

/**
 * Toggle nodes
 * + handle dn
 * @param {string|Node} sel CSS selector or node
 * @param {Node=} parent
 * @example
 * Toggle('a')      // toggle all links
 */
function Toggle(sel, parent) {
    if (!sel) return;
    if (typeof(sel) == 'object') {
        S(sel, !Visible(sel));
        return;
    }
    //
    E(sel, node => {
        S(node, !Visible(node));
    }, parent);
}

/**
 * Quick check if all nodes are visible
 * @param {string|Node} sel CSS selector or node
 * @param {Node=} parent
 * @returns {boolean} true if ALL nodes are visible
 * @example
 * Visible('body')  // true
 * Visible('.dn')   // false
 */
function Visible(sel, parent) {
    if (!sel) return;
    if (typeof(sel) == 'object') {
        if (sel.classList.contains('dn'))
            return false;
        return sel.style.display != 'none' && sel.style.visibility != 'hidden';
    }
    //
    let nodes = A(sel, parent);
    if (!nodes.length)
        return false;
    for (let node of nodes) {
        if (node.classList.contains('dn'))
            return false;
        if (node.style.display == 'none' || node.style.visibility == 'hidden')
            return false;
    }
    return true;
}

// NON-NODE FUNCTIONS
/////////////////////
/**
 * Choose a random element in an array
 * @param {*[]} array
 * @param {number} length
 * @example
 * Choice([1, 2, 10])
 */
function Choice(array, length) {
    return array[Floor(Random() * (length || array.length))];
}

/**
 * Clamp a number between min and max
 * Notes:
 * - null acts as 0, so 1 > null and -1 < null
 * - comparisons with undefined return false
 * @param {number} number
 * @param {number} min
 * @param {number} max
 * @param {number=} min_set number becomes that value when lower than min
 * @returns {number} clamped number
 */
function Clamp(number, min, max, min_set) {
    return (number < min)? (Number.isFinite(min_set)? min_set: min): (number > max? max: number);
}

/**
 * Copy text to the clipboard
 * - ideally should be called from an event callback
 * @param {string} text
 */
function CopyClipboard(text) {
    let node = CreateNode('textarea', null, {readonly: ''});
    node.value = text;
    Style(node, `left:-9999px;position:absolute`);
    document.body.appendChild(node);
    node.select();
    document.execCommand('copy');
    document.body.removeChild(node);
}

/**
 * Get the date, offset by a number of days
 * @param {number} offset day offset
 * @returns {string} date in YYYYMMDD format
 * @example
 * DateOffset(0)       // 20191212
 * DateOffset(1)       // 20191213
 * DateOffset(-1)      // 20191211
 */
function DateOffset(offset) {
    let date = new Date();
    date.setUTCDate(date.getUTCDate() + offset);
    return date.toISOString().slice(0, 10).replace(/-/g, '');
}

/**
 * Default float conversion
 * @param {string|number} value
 * @param {number} def default value when the value is not a valid number
 * @returns {number}
 */
function DefaultFloat(value, def) {
    if (Number.isFinite(value))
        return value;
    value = parseFloat(value);
    return isNaN(value)? def: value;
}

/**
 * Download a JSON object
 * @param {Object} object
 * @param {string} name output filename
 * @param {boolean=} is_raw save raw object instead of converting it to JSON
 */
function DownloadObject(object, name, is_raw) {
    let text = is_raw? object: `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(object))}`,
        node = document.createElement('a');
    node.setAttribute('href', text);
    node.setAttribute('download', name);
     // required for firefox
    document.body.appendChild(node);
    node.click();
    node.remove();
}

/**
 * Format a vector or float ...
 * @param {Object} vector
 * @param {string=} sep
 * @param {number=} align
 * @returns {string}
 * @example
 * Format([-1, 1, Math.PI])                 // -1.000 : 1.000 : 3.142
 * Format(Math.PI)                          // 3.142
 * Format({x: 1, y: 9, z: 2, w: -0.0004})   // 1.000 : 9.000 : 2.000 : 0.000
 */
function Format(vector, sep=', ', align=null) {
    // null, undefined
    if (vector == null)
        return vector;
    // [1, 2, 3]
    if (Array.isArray(vector))
        return vector.map(value => Format(Array.isArray(value)? value[0]: value, sep, align)).join(sep);
    // Set()
    else if (vector instanceof Set)
        return vector.size;
    // dict or quaternion, vector3, ...
    else if (vector instanceof Object) {
        let items = [];
        Keys(vector).forEach(key => {
            let value = vector[key];
            if (Number.isFinite(value))
                items.push(FormatFloat(value, align));
        });
        return items.join(sep);
    }
    // float, int, text ...
    else
        return FormatFloat(vector, align);
}

/**
 * Format a float
 * @param {number} text
 * @param {number=} align
 * @returns {string}
 */
function FormatFloat(text, align) {
    if (Number.isFinite(text) && !Number.isInteger(text))
        text = text.toFixed(3);
    if (text === '-0.000' || text === '0.000')
        text = '0';

    if (align) {
        text = `${text}`;
        if (text.length < align)
            text = ('        ' + text).slice(-align);
    }
    return text;
}

/**
 * Format a number:
 * - B: billion, M: million, K: thousand
 * - NaN => n/a
 * @param {number} number
 * @param {string=} def default value used when number is not a number
 * @returns {number}
 */
function FormatUnit(number, def)
{
    if (isNaN(number)) {
        if (def !== undefined)
            return def;

        // isNaN will return true for 'hello', but Number.isNaN won't
        if (Number.isNaN(number))
            number = 'N/A';
        else
            number = `${number}`;
    }
    else if (number == Infinity)
        return `${number}`;
    else if (number >= 1e9)
        number = `${Floor(number / 1e8) / 10}B`;
    else if (number >= 1e6)
        number = `${Floor(number / 1e5) / 10}M`;
    else if (number > 1000)
        number = `${Floor(number / 100) / 10}k`;
    else
        number = `${Floor(number)}`;

    return number;
}

/**
 * Extract the hours, minutes, seconds and 1/100th of seconds from a time in seconds
 * @param {number} time
 * @returns {number[]} hours, mins, secs, cs
 */
function FromSeconds(time) {
    let secs = Floor(time),
        // !!important not to do (time - secs) * 100
        cs = Pad(Floor(time * 100 - secs * 100)),
        mins = Floor(secs / 60),
        hours = Floor(secs / 3600);

    secs -= mins * 60;
    mins -= hours * 60;
    return [hours, mins, secs, cs];
}

/**
 * Convert stamp to date
 * @param {number} stamp timestamp in seconds
 * @returns {string[]} [date, time] string
 */
function FromTimestamp(stamp) {
    if (!stamp)
        return '???';
    let date = new Date(stamp * 1000),
        day = `${Pad(date.getFullYear())}-${Pad((date.getMonth() + 1))}-${Pad(date.getDate())}`,
        time = `${Pad(date.getHours())}:${Pad(date.getMinutes())}:${Pad(date.getSeconds())}`;
    return [day, time];
}

/**
 * Hash a text
 * @param {string} text
 * @returns {number} hash
 */
function HashText(text) {
    let hash = 0;
    for (let i = 0, length = text.length; i < length; i ++) {
        let char = text.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
    }
    return (hash + 2147483647) + 1;
}

/**
 * Check if an email is invalid
 * @param {string} email
 * @returns {boolean}
 * @example
 * InvalidEmail('hello@mail.com')   // false
 * InvalidEmail('hello@mail')       // true
 * InvalidEmail('hello')            // true
 */
function InvalidEmail(email) {
    return !/^\w[\w.-]+@\w[\w-]+(\.\w+)+$/.test(email);
}

/**
 * Check if phone is invalid
 * @param {string} phone
 * @returns {boolean}
 * @example
 * InvalidPhone('911')              // true
 * InvalidPhone('+32 460-885 567')  // false
 * InvalidPhone('380(632345599')    // true
 * InvalidPhone('380(63)2345599')   // false
 */
function InvalidPhone(phone) {
    return !/^[+]?([ -]?\d+|\(\d+\)){5,}$/.test(phone);
}

/**
 * Load a library
 * @param {string} url
 * @param {function=} callback
 * @param {Object=} extra
 * @example
 * LoadLibrary('./script/3d.js')
 */
function LoadLibrary(url, callback, extra) {
    let node = CreateNode('script', null, Assign({src: url}, extra || {}));
    document.body.appendChild(node);
    if (callback)
        node.onload = callback;
}

/**
 * Alias for console.log
 * @param {*=} text
 * @example
 * LS()             // print an empty line
 * LS('hello')      // print 'hello'
 */
function LS(text='') {
    console.log(text);
}

/**
 * Get the timestamp in seconds
 * @params {boolean=} as_float get seconds as float instead of int
 * @returns {number} seconds
 * @example
 * Now(true)    // 1573706158.324 = sec
 * Now()        // 1573706158 = sec
 * Date.now()   // 1573706158324 = ms
 */
function Now(as_float) {
    let seconds = Date.now() / 1000;
    return as_float? seconds: Floor(seconds);
}

/**
 * Left pad with zeroes or something else
 * @param {string|number} value
 * @param {number=} size
 * @param {string=} pad
 */
function Pad(value, size=2, pad='00') {
    return (pad + value).slice(-size);
}

/**
 * URL get query string, ordered + keep/discard/replace some elements
 * @param {Object=} discard list of keys to discard
 * @param {Object=} keep list of keys to keep
 * @param {string=} query use this url instead of location[key]
 * @param {Object=} replaces add or replace items
 * @param {string=} key hash, search
 * @param {boolean=} string true to have a sorted string, otherwise get a sorted object
 * @returns {string|Object} result object or string
 */
function QueryString({discard, keep, key='search', replace, query, string}={})
{
    let dico = {},
        items = query? query.split('&'): (key? location[key].slice(1).split('&'): []),
        vector = [];

    for (let item of items) {
        let parts = item.split('=');
        if (parts.length == 2) {
            if ((!keep || keep[parts[0]]) && (!discard || !discard[parts[0]])) {
                let value = decodeURIComponent(parts[1].replace(/\+/g," "));
                dico[parts[0]] = (value == 'undefined')? undefined: value;
            }
        }
    }
    if (replace)
        Assign(dico, replace);

    // language=eng&section=1
    if (string) {
        Keys(dico).forEach(key => {
            if (dico[key] !== undefined)
                vector.push(`${key}=${encodeURIComponent(dico[key])}`);
        });
        vector.sort();
        return vector.join('&');
    }

    // {'language': 'eng', 'section': '1'}
    Keys(dico).forEach(key => {
        vector.push([key, dico[key]]);
    });
    vector.sort();
    return Assign({}, ...vector.map(([key, value]) => ({[key]: value})));
}

/**
 * Random from [low to high[
 * @param {number=} high
 * @param {number=} low
 * @returns {number}
 */
function RandomFloat(high=1, low=0) {
    return low + Random() * (high - low);
}

/**
 * Random from [low to high[
 * @param {number=} high
 * @param {number=} low
 * @returns {number}
 */
function RandomInt(high=1, low=0) {
    return low + Floor(Random() * (high - low));
}

/**
 * Random from -range/2, range/2
 * @param {number} range
 * @returns {number}
 */
function RandomSpread(range) {
    return range * (Random() - 0.5);
}

/**
 * Load a resource
 * @param {string} url
 * @param {function} callback (status, text, xhr)
 * @param {*=} content
 * @param {string=} form add the content to a new FormData
 * @param {string=} method GET, POST
 * @param {string=} type arraybuffer, blob, document, json, text
 * @example
 * // get the context of the file
 * Resource('./fragment.frag', (status, text) => {LS(text)}, {type: 'text'})
 * // api call
 * Resource('api/user_login', (status, result) => {
 *     LS(result)}, JSON.stringify({user: 'David'}
 * ), {method: 'POST'})
 */
function Resource(url, callback, {content=null, form, method='GET', type='json'}={}) {
    let xhr = new XMLHttpRequest();
    if (type)
        xhr.responseType = type;
    xhr.onreadystatechange = () => {
        if (xhr.readyState != 4)
            return;
        callback(xhr.status, xhr.response, xhr);
    };
    xhr.open(method, url, true);
    xhr.setRequestHeader('content-type', 'application/json;charset=UTF-8');
    if (form) {
        let form_data = new FormData();
        form_data.append(form, content);
        xhr.send(form_data);
    }
    else
        xhr.send(content);
}

/**
 * Same as Python's set_default
 * @param {Object} dico
 * @param {string} key
 * @param {*} def
 * @returns {*} dico[key]
 * @example
 * dico = {}
 * SetDefault(dico, 'count', []).push(1)    // dico = {count: [1]}
 */
function SetDefault(dico, key, def) {
    let child = dico[key];
    if (child === undefined) {
        dico[key] = def;
        child = dico[key];
    }
    return child;
}

/**
 * Smart split, tries with | and if not found, then with ' '
 * @param {string} text
 * @param {string=} char
 * @returns {string[]}
 */
function Split(text, char) {
    if (char != undefined)
        return text.split(char);
    let splits = text.split('|');
    return (splits.length > 1)? splits: text.split(' ');
}

/**
 * Stringify an Object, better than JSON.stringify
 * @param {Object} object
 * @param {number=} [depth=0]
 * @param {number=} [max_depth=2]
 * @returns {string} stringified object
 */
function Stringify(object, depth=0, max_depth=2) {
    if (depth > max_depth)
        return 'Object';

    let obj = {};
    for (let key in object) {
        let value = object[key];
        if (value instanceof Node)
            value = {id: value.id};
        else if (value instanceof Window)
            value = 'Window';
        else if (value instanceof Object)
            value = Stringify(value, depth + 1, max_depth);

        obj[key] = value;
    }

    return depth? obj: JSON.stringify(obj);
}

/**
 * Title a string:
 * - make the first letter uppercase and keep the rest as it is
 * - works on numbers too
 * @param {string|number} text
 * @returns {string}
 */
function Title(text) {
    text += '';
    return text.slice(0, 1).toUpperCase() + text.slice(1);
}

/**
 * This can be replaced by the ?? operator in the future
 * @param {*} value
 * @param {*} def
 * @returns {*}
 */
function Undefined(value, def) {
    return (value !== undefined)? value: def;
}
