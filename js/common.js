// common.js
// @author octopoulo <polluxyz@gmail.com>
// @version 2021-02-15
//
// utility JS functions used in all the sites
// no state is being required
//
/*
globals
console, document, exports, FormData, global, location, navigator, Node, requestAnimationFrame, screen, window, XMLHttpRequest
*/
'use strict';

// SHORTCUTS
////////////

let Abs = Math.abs,
    Assign = Object.assign,
    Atan = Math.atan,
    Ceil = Math.ceil,
    Cos = Math.cos,
    // dummy object
    DUMMY_OBJECT = {
        addEventListener: () => 0,
        children: [],
        classList: {
            add: () => 0,
            contains: () => false,
            remove: () => 0,
            toggle: () => 0,
        },
        clientHeight: 0,
        dataset: {},
        getAttribute: () => undefined,
        getAttributeNS: () => undefined,
        getBoundingClientRect: () => ({bottom: 0, height: 0, left: 0, right: 0, top: 0, width: 0}),
        offsetHeight: 0,
        removeAttribute: () => 0,
        removeAttributeNS: () => 0,
        setAttribute: () => 0,
        setAttributeNS: () => 0,
        style: {
            getPropertyValue: () => 0,
            removeProperty: () => 0,
            setProperty: () => 0,
        },
        textContent: '',
        top: 0,
        value: '',
    },
    Exp = Math.exp,
    Floor = Math.floor,
    From = Array.from,
    IS_NODE = (typeof global != 'undefined')? global: null,
    IsArray = Array.isArray,
    IsFloat = value => (Number.isFinite(value) && !Number.isInteger(value)),
    IsFunction = value => (typeof(value) == 'function'),
    IsObject = value => (value != null && typeof(value) == 'object'),
    IsString = value => (typeof(value) == 'string'),
    Keys = Object.keys,
    Log = Math.log,
    Log10 = Math.log10,
    Lower = text => text.toLowerCase(),
    LS = console.log.bind(console),
    Max = Math.max,
    Min = Math.min,
    NAMESPACE_SVG = 'http://www.w3.org/2000/svg',
    PD = e => e.preventDefault(),
    PI = Math.PI,
    Pow = Math.pow,
    Random = Math.random,
    Round = Math.round,
    Sign = Math.sign,
    Sin = Math.sin,
    SP = e => e.stopPropagation(),
    Sqrt = Math.sqrt,
    Stringify = JSON.stringify.bind(JSON),
    Tanh = Math.tanh,
    Upper = text => text.toUpperCase();

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// ELEMENTARY NODE FUNCTIONS
////////////////////////////
/**
 * Find 1 node
 * @param {Node|string|Element|EventTarget} sel CSS selector or node
 * @param {Node=} parent parent node, document by default
 * @returns {Node} found node
 */
function _(sel, parent) {
    if (!sel) return null;
    if (IsObject(sel))
        return /** @type {Node} */(sel);
    return (parent || document).querySelector(/** @type {string} */(sel));
}

/**
 * Find multiple nodes
 * @param {string|Array<Node>} sel CSS selector OR list of nodes
 * @param {Node|Object=} parent parent node, document by default
 * @returns {!Array<Node>} found nodes
 */
function A(sel, parent) {
    if (!sel) return [];
    if (IsArray(sel))
        return /** @type {!Array<Node>} */(sel);
    return (parent || document).querySelectorAll(sel);
}

/**
 * Execute a function on multiple nodes
 * @param {string|Array<Node>} sel CSS selector OR list of nodes
 * @param {Function} callback (node, index=, array=)
 * @param {Node=} parent
 */
function E(sel, callback, parent) {
    if (!sel) return;
    if (IsArray(sel))
        sel.forEach(callback);
    else
        A(sel, parent).forEach(callback);
}

/**
 * Get an element by ID
 * @param {Node|string} id
 * @param {Node=} parent parent node, document by default
 * @returns {Node}
 */
function Id(id, parent) {
    if (!id) return null;
    if (IsObject(id))
        return /** @type {Node} */(id);
    if (IS_NODE)
        return (parent || document).querySelector(`#${id}`);
    return (parent || document).getElementById(id);
}

// DERIVED NODE FUNCTIONS
/////////////////////////
/**
 * Change attributes
 * @param {Node|string} sel CSS selector or node
 * @param {!Object} attrs attribute to change
 * @param {Node=} parent
 */
function Attrs(sel, attrs, parent) {
    if (!sel) return;
    if (IsObject(sel)) {
        Keys(attrs).forEach(key => {
            let value = attrs[key];
            if (value == undefined)
                sel.removeAttribute(key);
            else
                sel.setAttribute(key, value);
        });
        return;
    }
    //
    E(/** @type {string} */(sel), node => {
        Keys(attrs).forEach(key => {
            let value = attrs[key];
            if (value == undefined)
                node.removeAttribute(key);
            else
                node.setAttribute(key, value);
        });
    }, parent);
}

/**
 * Change attributes
 * @param {Node|string} sel
 * @param {!Object} attrs
 * @param {Node=} parent
 */
function AttrsNS(sel, attrs, parent) {
    if (!sel) return;
    if (IsObject(sel)) {
        Keys(attrs).forEach(key => {
            let value = attrs[key];
            if (value == undefined)
                sel.removeAttributeNS(null, key);
            else
                sel.setAttributeNS(null, key, value);
        });
        return;
    }
    //
    E(/** @type {string} */(sel), node => {
        Keys(attrs).forEach(key => {
            let value = attrs[key];
            if (value == undefined)
                node.removeAttributeNS(null, key);
            else
                node.setAttributeNS(null, key, value);
        });
    }, parent);
}

/**
 * Click event on nodes
 * @param {Node|string} sel CSS selector or node
 * @param {Function} callback (event)
 * @param {Node=} parent
 * @example
 * C('img', function() {LS(this.src)})  // print the URL of the image being clicked
 */
function C(sel, callback, parent) {
    if (!sel) return;
    if (IsObject(sel)) {
        sel.onclick = callback;
        return;
    }
    //
    E(/** @type {string} */(sel), node => {
        node.onclick = callback;
    }, parent);
}

/**
 * Add / remove classes
 * @param {Node|string} sel CSS selector or node
 * @param {string} class_ 'add +also_add -remove ^toggle'
 * @param {boolean|number=} add true for normal behavior (default), otherwise invert all - and +
 * @param {Node?} parent
 */
function Class(sel, class_, add=true, parent=null) {
    if (!sel) return;

    if (IsObject(sel)) {
        let list = sel.classList;
        class_.split(' ').forEach(item => {
            if (!item)
                return;

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
    E(/** @type {string} */(sel), node => {
        let list = node.classList;
        class_.split(' ').forEach(item => {
            if (!item)
                return;

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
 * @param {!Array<string>} list
 * @param {string} pattern
 * @returns {boolean}
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
 * @param {string?=} html
 * @param {Object=} attrs
 * @param {Array<Node>=} children
 * @returns {Node} created node
 */
function CreateNode(tag, html, attrs, children) {
    let node = document.createElement(tag);
    if (html)
        node.innerHTML = html;
    if (attrs)
        Keys(attrs).forEach(key => {
            node.setAttribute(key, attrs[key]);
        });

    if (children)
        for (let child of children)
            node.appendChild(child);

    return node;
}

/**
 * Create an SVG node
 * @param {string} type
 * @param {Object=} attrs
 * @param {Array<Node>=} children
 * @returns {Node} created node
 */
function CreateSVG(type, attrs, children) {
    let node = document.createElementNS(NAMESPACE_SVG, type);
    if (attrs)
        Keys(attrs).forEach(key => {
            node.setAttributeNS(null, key, attrs[key]);
        });

    if (children)
        for (let child of children)
            node.appendChild(child);

    return node;
}

/**
 * Handle any events on nodes
 * + mouseenter => will use node.addEventListener('mouseenter', callback)
 * + !mouseenter => will use node.onmouseenter = callback
 * @param {Node|string|Window} sel CSS selector or node
 * @param {string} events
 * @param {Function} callback
 * @param {!AddEventListenerOptions|boolean=} options
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

    if (IsObject(sel)) {
        events.split(' ').forEach(event => {
            if (direct)
                sel[`on${event}`] = callback;
            else
                sel.addEventListener(event, callback, options);
        });
        return;
    }
    //
    E(/** @type {string} */(sel), node => {
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
 * @param {Node|string} node CSS selector or node
 * @param {string} class_ can be multiple classes separated by spaces
 * @returns {boolean}
 */
function HasClass(node, class_) {
    if (IsString(node))
        node = _(node);
    if (!node)
        return false;

    return node.classList && node.classList.contains(class_);
}

/**
 * Check if a node has all classes
 * @param {Node|string} node CSS selector or node
 * @param {string} classes can be multiple classes separated by spaces, with +/- and ^$* patterns
 * @returns {boolean}
 */
function HasClasses(node, classes) {
    if (IsString(node))
        node = _(node);
    if (!node)
        return false;

    let list = node.classList;
    if (!list)
        return false;

    // match all classes, ex: 'visible -shown'
    for (let item of classes.split(' ')) {
        let a = item.substr(0, 1),
            b = item.substr(1);
        if (a == '-') {
            if (Contain(list, b))
                return false;
        }
        else if (a == '+') {
            if (!Contain(list, b))
                return false;
        }
        else if (!item.split('|').some(key => Contain(list, key)))
            return false;
    }

    return true;
}

/**
 * Hide nodes
 * + handle dn
 * @param {Node|string} sel CSS selector or node
 * @param {Node=} parent
 */
function Hide(sel, parent) {
    if (!sel) return;
    if (IsObject(sel)) {
        sel.classList.remove('dn');
        sel.style.display = 'none';
        return;
    }
    //
    E(/** @type {string} */(sel), node => {
        node.classList.remove('dn');
        node.style.display = 'none';
    }, parent);
}

/**
 * Get / set HTML
 * @param {Node|string} sel CSS selector or node
 * @param {string|number=} html
 * @param {Node=} parent
 * @returns {string} html of the first matched node
 */
function HTML(sel, html, parent) {
    if (!sel) return '';
    if (IsObject(sel)) {
        if (html !== undefined) {
            html += '';
            if (html != sel.innerHTML)
                sel.innerHTML = html;
            return html;
        }
        return sel.innerHTML;
    }
    //
    if (html === undefined) {
        let node = _(sel, parent);
        return node? node.innerHTML: '';
    }
    html += '';
    let result;
    E(/** @type {string} */(sel), node => {
        if (html != node.innerHTML)
            node.innerHTML = html;
        if (result === undefined)
            result = html;
    }, parent);
    return result || '';
}

/**
 * Compute the index of the node (how many siblings are before it)
 * @param {Node|string} node CSS selector or node
 * @returns {number} computed index
 * @example
 * <tr>
 *     <td id="first"></td>
 *     <td id="second"></td>
 * </tr>
 * Index(Id('first'))       // 1
 * Index(Id('second'))      // 2
 */
function Index(node) {
    if (IsString(node))
        node = _(node);
    if (!node)
        return -1;

    let index = 0;
    while (node) {
        node = node.previousElementSibling;
        index ++;
    }
    return index;
}

/**
 * Input event on nodes
 * @param {Node|string} sel CSS selector or node
 * @param {Function} callback (event)
 * @param {Node=} parent
 * @example
 * Input('input[sb-field=username]', e => {LS(e)})   // username is being modified
 */
function Input(sel, callback, parent) {
    if (!sel) return;
    if (IsObject(sel)) {
        sel.oninput = callback;
        return;
    }
    //
    E(/** @type {string} */(sel), node => {
        node.oninput = callback;
    }, parent);
}

/**
 * Insert nodes into a parent
 * @param {Node|string} parent
 * @param {!Array<Node>} nodes
 * @param {boolean=} preprend should the nodes be preprended or appended?
 * @example
 * InsertNodes(#chat', nodes, true)     // preprend
 */
function InsertNodes(parent, nodes, preprend) {
    if (IsString(parent))
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
 * @param {Node|string|EventTarget} node CSS selector or node
 * @param {Object} obj
 * @param {string=} obj.attrs
 * @param {string=} obj.class_ 'live-pv|xmoves'
 * @param {boolean=} obj.self true => the parent can be the node itself
 * @param {string=} obj.tag 'a div'
 * @returns {Node} parent node or null or undefined
 * @example
 * Parent(node, {attrs: 'id=ok', tag: 'div')        // find a parent with tag <div> and whose ID='ok'
 * Parent(node, {attrs: 'id=ok', tag: 'a div')      // find a parent with tag <a> or <div> and whose ID='ok'
 */
function Parent(node, {tag, class_, attrs, self}={}) {
    if (IsString(node))
        node = _(node);
    if (!node)
        return null;

    let aitems = attrs? attrs.split(' '): [],
        citems = class_? class_.split(' '): [],
        parent = /** @type {Node} */(node),
        tags = tag? tag.split(' '): null;

    for (let depth = 0; ; depth ++) {
        if (depth || !self || parent.nodeType != 1) {
            parent = parent.parentNode;
            if (!parent || !parent.tagName)
                return null;
        }
        let ok = true;

        // 1) tag
        if (tags && !tags.includes(Lower(parent.tagName)))
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
            }
            else if (a == '+') {
                if (!Contain(list, b)) {
                    ok = false;
                    break;
                }
            }
            else if (!item.split('|').some(key => Contain(list, key))) {
                ok = false;
                break;
            }
        }
        if (ok)
            break;
    }

    return parent;
}

/**
 * Change properties
 * @param {Node|string} sel CSS selector or node
 * @param {string} prop property to change
 * @param {string|boolean=} value value to set
 * @param {Node=} parent
 * @example
 * Prop('input', 'checked', true)       // check the button
 */
function Prop(sel, prop, value, parent) {
    if (!sel) return;
    if (IsObject(sel)) {
        sel[prop] = value;
        return;
    }
    //
    E(/** @type {string} */(sel), node => {
        node[prop] = value;
    }, parent);
}

/**
 * Show / hide nodes
 * + handle dn
 * @param {Node|string} sel CSS selector or node
 * @param {*=} show true to show the node
 * @param {Node=} parent
 * @param {string=} mode to use for node.display, by default '' but could be block
 * @example
 * S('a')                       // hide all links
 * S('a', true)                 // show all links
 * S('a', true, null, 'block')  // show all links with display=block
 * S('a', true, null, 'none')   // hide all links
 */
function S(sel, show, parent, mode='') {
    if (!sel) return;
    if (IsObject(sel)) {
        sel.classList.remove('dn');
        sel.style.display = show? mode: 'none';
        return;
    }
    //
    E(/** @type {string} */(sel), node => {
        node.classList.remove('dn');
        node.style.display = show? mode: 'none';
    }, parent);
}

/**
 * Safe _
 * @param {Node|string} sel CSS selector or node
 * @param {Node=} parent parent node, document by default
 * @returns {Node|Object} found node or {}
 */
function Safe(sel, parent) {
    return _(sel, parent) || Assign({}, DUMMY_OBJECT);
}

/**
 * Safe Id
 * @param {Node|string} sel CSS selector or node
 * @param {Node=} parent parent node, document by default
 * @returns {Node|Object} found node or {}
 */
function SafeId(sel, parent) {
    return Id(sel, parent) || Assign({}, DUMMY_OBJECT);
}

/**
 * Scroll the document to the top
 * @param {Node|string|number=} top if undefined then returns the scrollTop value
 * @param {boolean=} smooth
 * @param {number=} offset
 * @returns {number|undefined}
 */
function ScrollDocument(top, smooth, offset=0) {
    let scroll = document.scrollingElement;
    if (top != undefined) {
        // top can be a selector too
        if (isNaN(top)) {
            top = _(/** @type {Node|string} */(top));
            if (!top)
                return;
            let value = 0;
            while (top) {
                value += top.offsetTop;
                top = top.offsetParent;
            }
            top = value;
        }
        if (smooth) {
            window.scrollTo({top: Max(0, top + offset), behavior: 'smooth'});
            return top;
        }
        scroll.scrollTop = top;
    }
    return scroll.scrollTop;
}

/**
 * Show nodes
 * + handle dn
 * @param {Node|string} sel CSS selector or node
 * @param {Node=} parent
 * @param {string=} mode to use for node.display, by default '' but could be block
 */
function Show(sel, parent, mode='') {
    if (!sel) return;
    if (IsObject(sel)) {
        sel.classList.remove('dn');
        sel.style.display = mode;
        return;
    }
    //
    E(/** @type {string} */(sel), node => {
        node.classList.remove('dn');
        node.style.display = mode;
    }, parent);
}

/**
 * Change the style of nodes
 * @param {Node|string} sel CSS selector or node
 * @param {string} style
 * @param {boolean=} add to set/add the style, otherwise remove it
 * @param {Node=} parent
 * @example
 * Style(document.documentElement, 'opacity:0.1')   // make the page almost transparent
 * Style('a', 'opacity:0.5')                        // set the opacity of all links
 * Style('a', 'opacity', false)                     // remove the opacity from all links
 */
function Style(sel, style, add=true, parent=null) {
    if (!sel) return;

    if (IsObject(sel)) {
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
    E(/** @type {string} */(sel), node => {
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
 * @param {Node|string} sel CSS selector or node
 * @param {Function} callback
 * @param {Node=} parent
 * @example
 * Submit('body', () => {return false})    // prevent any Submit
 */
function Submit(sel, callback, parent) {
    if (!sel) return;
    if (IsObject(sel)) {
        sel.onsubmit = callback;
        return;
    }
    //
    E(/** @type {string} */(sel), node => {
        node.onsubmit = callback;
    }, parent);
}

/**
 * Get / set the textContent of nodes
 * @param {Node|string} sel CSS selector or node
 * @param {string|number=} text
 * @param {Node=} parent
 * @returns {string}
 */
function TEXT(sel, text, parent) {
    if (!sel) return '';
    if (IsObject(sel)) {
        if (text !== undefined) {
            text += '';
            if (!sel.childElementCount) {
                let child = sel.firstChild;
                if (!child)
                    sel.appendChild(document.createTextNode(text));
                else if (child.nodeType == 3)
                    child.nodeValue = text;
                else if (sel.innerHTML != text)
                    sel.textContent = text;
            }
            else if (sel.innerHTML != text)
                 sel.textContent = text;
            return text;
        }
        return sel.textContent.trim();
    }
    //
    if (text === undefined) {
        let node = _(sel, parent);
        return node? node.textContent.trim(): '';
    }
    text += '';
    let result;
    E(/** @type {string} */(sel), node => {
        if (!node.childElementCount) {
            let child = node.firstChild;
            if (!child)
                node.appendChild(document.createTextNode(text));
            else if (child.nodeType == 3)
                child.nodeValue = text;
            else if (node.innerHTML != text)
                node.textContent = text;
        }
        else if (node.innerHTML != text)
            node.textContent = text;
        if (result === undefined)
            result = text;
    }, parent);
    return result || '';
}

/**
 * Get / set TEXT/HTML of nodes
 * @param {Node|string} sel CSS selector or node
 * @param {string|number=} text
 * @param {Node=} parent
 * @returns {string}
 */
function TextHTML(sel, text, parent) {
    if (!sel) return '';
    if (IsObject(sel)) {
        if (text !== undefined) {
            text += '';
            if (!sel.childElementCount && !text.includes('<')) {
                let child = sel.firstChild;
                if (!child)
                    sel.appendChild(document.createTextNode(text));
                else if (child.nodeType == 3)
                    child.nodeValue = text;
                else if (sel.innerHTML != text)
                    sel.textContent = text;
                return text;
            }
            else if (sel.innerHTML != text)
                sel.innerHTML = text;
            return text;
        }
        return sel.textContent.trim();
    }
    //
    if (text === undefined) {
        let node = _(sel, parent);
        return node? node.textContent.trim(): '';
    }
    text += '';
    let is_html = (text.includes('<')),
        result;
    E(/** @type {string} */(sel), node => {
        if (!is_html && !node.childElementCount) {
            let child = node.firstChild;
            if (!child)
                node.appendChild(document.createTextNode(text));
            else if (child.nodeType == 3)
                child.nodeValue = text;
            else if (node.innerHTML != text)
                node.textContent = text;
        }
        else if (node.innerHTML != text)
            node.innerHTML = text;
        if (result === undefined)
            result = text;
    }, parent);
    return result || '';
}

/**
 * Toggle nodes
 * + handle dn
 * @param {Node|string} sel CSS selector or node
 * @param {Node=} parent
 * @example
 * Toggle('a')      // toggle all links
 */
function Toggle(sel, parent) {
    if (!sel) return;
    if (IsObject(sel)) {
        S(sel, !Visible(sel));
        return;
    }
    //
    E(/** @type {string} */(sel), node => {
        S(node, !Visible(node));
    }, parent);
}

/**
 * Quick check if all nodes are visible
 * @param {Node|string} sel CSS selector or node
 * @param {Node=} parent
 * @returns {boolean?} true if ALL nodes are visible
 */
function Visible(sel, parent) {
    if (!sel) return null;
    if (IsObject(sel)) {
        if (sel.classList.contains('dn'))
            return false;
        return sel.style.display != 'none' && sel.style.visibility != 'hidden';
    }
    //
    let nodes = A(/** @type {string} */(sel), parent);
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
 * Utility for requestAnimationFrame
 * @param {Function} callback
 * @param {boolean=} direct
 * @returns {number|*}
 */
function AnimationFrame(callback, direct) {
    return direct? callback(): requestAnimationFrame(() => callback());
}

/**
 * Convert an WASM vector to JS vector
 * @param {Object|Array<*>} vector
 * @returns {!Array<*>}
 */
function ArrayJS(vector) {
    if (vector.size)
        vector = Array(vector.size()).fill(0).map((_, id) => vector.get(id));
    return /** @type {!Array<*>} */(vector);
}

/**
 * Choose a random element in an array
 * @param {!Array<*>} array
 * @param {number} length
 * @returns {*}
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
    return (number < min)?
        (Number.isFinite(/** @type {number} */(min_set))? /** @type {number} */(min_set): min)
    : (number > max? max: number);
}

/**
 * Remove all properties of an object
 * @param {!Object} dico
 * @returns {Object}
 */
function Clear(dico) {
    Keys(dico).forEach(key => {
        delete dico[key];
    });
    return dico;
}

/**
 * Copy text to the clipboard
 * - must be called from an event callback
 * @param {string} text
 * @param {Function=} callback
 */
function CopyClipboard(text, callback) {
    if (navigator.clipboard)
        navigator.clipboard.writeText(text).then(() => {
            if (callback)
                callback();
        });
    // support for old browsers
    else {
        let node = CreateNode('input');
        node.value = text;
        Style(node, `left:-9999px;position:absolute`);
        document.body.appendChild(node);
        node.select();
        if (document.execCommand)
            document.execCommand('copy');
        document.body.removeChild(node);
        if (callback)
            callback();
    }
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
    if (Number.isFinite(/** @type {number} */(value)))
        return /** @type {number} */(value);
    value = parseFloat(value);
    return isNaN(value)? def: value;
}

/**
 * Default int conversion
 * @param {string|number} value
 * @param {number|string|boolean} def default value when the value is not a valid number
 * @returns {number|string|boolean}
 */
function DefaultInt(value, def) {
    if (Number.isInteger(/** @type {number} */(value)))
        return /** @type {number} */(value);
    value = parseInt(value, 10);
    return isNaN(value)? def: value;
}

/**
 * Download a JSON object
 * @param {Object|string} object
 * @param {string} name output filename
 * @param {number=} mode 0:JSON, 1:binary, 2:text
 * @param {string=} space JSON space for pretty output
 */
function DownloadObject(object, name, mode, space) {
    let text,
        node = document.createElement('a');

    if (mode == 1)
        text = object;
    else {
        let json, type_;
        if (mode == 2) {
            if (!IsString(object))
                return;
            json = object;
            type_ = 'plain';
        }
        else {
            json = Stringify(object, null, space);
            type_ = 'json';
        }
        // add a newline to formatted JSON
        if (space && json.slice(-1) != '\n')
            json += '\n';
        text = `data:text/${type_};charset=utf-8,${encodeURIComponent(/** @type {string} */(json))}`;
    }

    node.setAttribute('href', /** @type {string} */(text));
    node.setAttribute('download', name);
     // required for firefox
    document.body.appendChild(node);
    node.click();
    node.remove();
}

/**
 * Format a vector or float ...
 * @param {*} vector
 * @param {string=} sep
 * @param {number=} align
 * @returns {string?}
 */
function Format(vector, sep=', ', align=undefined) {
    // null, undefined
    if (vector == null)
        return null;
    // [1, 2, 3]
    if (IsArray(vector))
        return vector.map(value => Format(IsArray(value)? value[0]: value, sep, align)).join(sep);
    // Set()
    else if (vector instanceof Set)
        return vector.size + '';
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
    return FormatFloat(/** @type {number|string} */(vector), align);
}

/**
 * Format a float
 * @param {number|string} text
 * @param {number=} align
 * @returns {string}
 */
function FormatFloat(text, align) {
    if (IsFloat(text))
        text = /** @type {number} */(text).toFixed(3);
    if (text === '-0.000' || text === '0.000')
        text = '0';

    if (align) {
        text = `${text}`;
        if (text.length < align)
            text = ('        ' + text).slice(-align);
    }
    return text + '';
}

/**
 * Format a number:
 * - B: billion, M: million, K: thousand
 * - NaN => n/a
 * @param {number|string} number
 * @param {string=} def default value used when number is not a number
 * @param {boolean=} keep_decimal keep 1 decimal even if it's .0
 * @param {boolean=} is_si use SI units
 * @returns {string}
 */
function FormatUnit(number, def, keep_decimal, is_si=true) {
    let unit = '';

    if (isNaN(number)) {
        if (def !== undefined)
            return def;

        // isNaN will return true for 'hello', but Number.isNaN won't
        if (Number.isNaN(/** @type {number} */(number)))
            number = 'N/A';
        else
            number = `${number}`;
    }
    else if (number == Infinity)
        return `${number}`;
    else {
        if (number >= 1e9) {
            number /= 1e8;
            unit = is_si? 'G': 'B';
        }
        else if (number >= 1e6) {
            number /= 1e5;
            unit = 'M';
        }
        else if (number > 1000) {
            number /= 100;
            unit = 'k';
        }
        else
            number *= 10;

        number = Floor(number) / 10;
        if (keep_decimal)
            number = number.toFixed(1);
    }

    return `${number}${unit}`;
}

/**
 * Extract the hours, minutes, seconds and 1/100th of seconds from a time in seconds
 * @param {number} time
 * @returns {!Array<number>} hours, mins, secs, cs
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
 * @param {number=} stamp timestamp in seconds
 * @returns {!Array<string>} [date, time] string
 */
function FromTimestamp(stamp) {
    if (!stamp)
        stamp = Now();
    let date = new Date(stamp * 1000),
        day = `${date.getFullYear()}-${Pad((date.getMonth() + 1))}-${Pad(date.getDate())}`,
        time = `${Pad(date.getHours())}:${Pad(date.getMinutes())}:${Pad(date.getSeconds())}`;
    return [day, time];
}

/**
 * Gaussian random between 0 and 1
 * @returns {number}
 */
function GaussianRandom() {
    let rand = -1;
    while (rand < 0 || rand > 1) {
        rand = Sqrt(-2 * Math.log(1 - Random())) * Math.cos(2 * PI * Random());
        rand = rand / 10 + 0.5;
    }
    return rand;
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
 * Convert a HEX color to RGB(A)
 * @param {string} color
 * @param {boolean=} get_string
 * @param {number=} alpha
 * @returns {string|Array<number>}
 */
function Hex2RGB(color, get_string, alpha) {
    let off = (color[0] == '#')? 1: 0,
        rgb = [0, 2, 4].map(i => parseInt(color.slice(off + i, off + i + 2), 16));

    if (!get_string)
        return rgb;

    return (alpha == undefined)? `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`: `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
}

/**
 * Check if an email is invalid
 * @param {string} email
 * @returns {boolean}
 */
function InvalidEmail(email) {
    return !/^\w[\w.-]+@\w[\w-]+(\.\w+)+$/.test(email);
}

/**
 * Check if phone is invalid
 * @param {string} phone
 * @returns {boolean}
 */
function InvalidPhone(phone) {
    return !/^[+]?([ -]?\d+|\(\d+\)){5,}$/.test(phone);
}

/**
 * Check if a character is a digit
 * @param {string} char
 * @returns {boolean}
 */
function IsDigit(char) {
    return (char !== '' && '0123456789'.includes(char));
}

/**
 * Load a library
 * @param {string} url
 * @param {Function=} callback
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
 * Merge 2 objects recursively
 * @param {!Object} dico
 * @param {!Object} extras
 * @param {number=} flag &1:replace existing values, &2:remove a key with "undefined", &4:copy object
 * @returns {!Object}
 */
function Merge(dico, extras, flag=1) {
    Keys(extras).forEach(key => {
        let extra = extras[key];
        if (extra == undefined) {
            if (flag & 2)
                delete dico[key];
        }
        else if (IsObject(extra)) {
            let source = dico[key];
            if (IsObject(source))
                Merge(source, extra, flag);
            else if ((flag & 1) || dico[key] == undefined)
                dico[key] = (flag & 4)? {...extra}: extra;
        }
        else if ((flag & 1) || dico[key] == undefined)
            dico[key] = extra;
    });
    return dico;
}

/**
 * Get the timestamp in seconds
 * @param {boolean=} as_float get seconds as float instead of int
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
 * @returns {string}
 */
function Pad(value, size=2, pad='00') {
    return (pad + value).slice(-size);
}

/**
 * Try to parse JSON data
 * @param {string} text
 * @param {*=} def
 * @returns {*}
 */
function ParseJSON(text, def) {
    let json;
    try {
        json = JSON.parse(text);
    }
    catch (e) {
        json = def;
    }
    return json;
}

/**
 * URL get query string, ordered + keep/discard/replace some elements
 * @param {Object} obj
 * @param {Object=} obj.discard list of keys to discard
 * @param {Object=} obj.keep list of keys to keep
 * @param {string=} obj.query use this url instead of location[key]
 * @param {Object=} obj.replaces add or replace items
 * @param {string=} obj.key hash, search
 * @param {boolean=} obj.string true to have a sorted string, otherwise get a sorted object
 * @returns {string|Object} result object or string
 */
function QueryString({discard, keep, key='search', replace, query, string}={}) {
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

    // {language: 'eng', section: '1'}
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
 * @param {Function} callback (status, text, xhr)
 * @param {Object} obj
 * @param {*=} obj.content
 * @param {string=} obj.form add the content to a new FormData
 * @param {Object=} obj.headers
 * @param {string=} obj.method GET, POST
 * @param {string=} obj.type arraybuffer, blob, document, json, text
 * @example
 * // get the context of the file
 * Resource('./fragment.frag', (status, text) => {LS(text)}, {type: 'text'})
 * // api call
 * Resource('api/user_login', (status, result) => {
 *     LS(result)}, Stringify({user: 'David'}
 * ), {method: 'POST'})
 */
function Resource(url, callback, {content=null, form, headers={}, method='GET', type='json'}={}) {
    let xhr = new XMLHttpRequest();
    if (type)
        xhr.responseType = type;
    xhr.onreadystatechange = () => {
        if (xhr.readyState != 4)
            return;
        callback(xhr.status, xhr.response, xhr);
    };
    xhr.open(method, url, true);

    // headers
    headers = Assign({'content-type': 'application/json'}, headers);
    Keys(headers).forEach(key => {
        xhr.setRequestHeader(key, headers[key]);
    });

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
 * @param {!Object} dico
 * @param {string} key
 * @param {*} def
 * @returns {*} dico[key]
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
 * @returns {!Array<string>}
 */
function Split(text, char) {
    if (!text)
        return [];
    if (char != undefined)
        return text.split(char);
    let splits = text.split('|');
    return (splits.length > 1)? splits: text.split(' ');
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
    return Upper(text.slice(0, 1)) + text.slice(1);
}

/**
 * This can be replaced by the ?? operator in the future
 * @param {?} value
 * @param {?} def
 * @returns {?}
 */
function Undefined(value, def) {
    return (value === undefined || Number.isNaN(value))? def: value;
}

/**
 * Get the visible height
 * - screen.height might be 0 on node.js
 * @returns {number}
 */
function VisibleHeight() {
    let screen_height = screen.height,
        window_height = window.innerHeight;
    return screen_height? Min(screen_height, window_height): window_height;
}

/**
 * Get the visible width
 * - screen.width might be 0 on node.js
 * @returns {number}
 */
function VisibleWidth() {
    let screen_width = screen.width,
        window_width = window.innerWidth;
    return screen_width? Min(screen_width, window_width): window_width;
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// <<
if (typeof exports != 'undefined') {
    Object.assign(exports, {
        _: _,
        A: A,
        Abs: Abs,
        AnimationFrame: AnimationFrame,
        ArrayJS: ArrayJS,
        Assign: Assign,
        Atan: Atan,
        Attrs: Attrs,
        AttrsNS: AttrsNS,
        C: C,
        Clamp: Clamp,
        Class: Class,
        Clear: Clear,
        Contain: Contain,
        CopyClipboard: CopyClipboard,
        CreateNode: CreateNode,
        CreateSVG: CreateSVG,
        DefaultFloat: DefaultFloat,
        DefaultInt: DefaultInt,
        E: E,
        Events: Events,
        Exp: Exp,
        Floor: Floor,
        Format: Format,
        FormatFloat: FormatFloat,
        FormatUnit: FormatUnit,
        From: From,
        FromSeconds: FromSeconds,
        FromTimestamp: FromTimestamp,
        HashText: HashText,
        Hex2RGB: Hex2RGB,
        Hide: Hide,
        HTML: HTML,
        Id: Id,
        Index: Index,
        InsertNodes: InsertNodes,
        InvalidEmail: InvalidEmail,
        InvalidPhone: InvalidPhone,
        IS_NODE: IS_NODE,
        IsArray: IsArray,
        IsDigit: IsDigit,
        IsFloat: IsFloat,
        IsFunction: IsFunction,
        IsObject: IsObject,
        IsString: IsString,
        Keys: Keys,
        Log: Log,
        Lower: Lower,
        LS: LS,
        Max: Max,
        Merge: Merge,
        Min: Min,
        NAMESPACE_SVG: NAMESPACE_SVG,
        Now: Now,
        Pad: Pad,
        Parent: Parent,
        ParseJSON: ParseJSON,
        PI: PI,
        Pow: Pow,
        Prop: Prop,
        QueryString: QueryString,
        RandomInt: RandomInt,
        Round: Round,
        S: S,
        Safe: Safe,
        SafeId: SafeId,
        SetDefault: SetDefault,
        Show: Show,
        Sign: Sign,
        Split: Split,
        Stringify: Stringify,
        Style: Style,
        TEXT: TEXT,
        TextHTML: TextHTML,
        Title: Title,
        Toggle: Toggle,
        Undefined: Undefined,
        Upper: Upper,
        Visible: Visible,
        VisibleHeight: VisibleHeight,
        VisibleWidth: VisibleWidth,
    });
}
// >>
