_context.invoke('Nittro.Extras.CheckList', function(DOM, Arrays) {

    var CheckList = _context.extend('Nittro.Object', function (options) {
        this._ = {
            options: Arrays.mergeTree({}, CheckList.defaults, options),
            scrolling: false
        };

        if (typeof this._.options.container === 'string') {
            this._.options.container = DOM.getById(this._.options.container);
        }

        if (typeof this._.options.scroll === 'string') {
            this._.options.scroll = {
                container: this._.options.scroll
            };
        } else if (this._.options.scroll === true) {
            this._.options.scroll = {
                container: null
            };
        }

        if (this._.options.scroll) {
            if (!this._.options.scroll.speed) {
                this._.options.scroll.speed = 3;
            }

            if (!this._.options.scroll.zoneSize) {
                this._.options.scroll.zoneSize = 0.1;
            }
        }

        this._handleMouseDown = this._handleMouseDown.bind(this);
        this._handleClick = this._handleClick.bind(this);
        DOM.addListener(this._.options.container, 'mousedown', this._handleMouseDown);
        DOM.addListener(this._.options.container, 'click', this._handleClick);

    }, {
        STATIC: {
            defaults: {
                container: null,    // ID or DOM element
                items: null,        // null = input[type="checkbox"], string = class name
                target: null,       // null = evt.target.control || evt.target, otherwise provide callback which gets passed evt.target
                boundary: 'parent', // null = self, "parent" = parent element, other string = tag.class selector for DOM.closest
                horizontal: false,
                scroll: true
            }
        },

        destroy: function () {
            DOM.removeListener(this._.options.container, 'mousedown', this._handleMouseDown);
            DOM.removeListener(this._.options.container, 'click', this._handleClick);
        },

        _handleClick: function(evt) {
            var target = this._getTarget(evt.target),
                items = this._getItems();

            if (items.indexOf(target) !== -1 && !(evt.screenX === 0 && evt.screenY === 0)) {
                // "click" with screenX == screenY == 0 is triggered by space press and we want to allow that
                evt.preventDefault();
            }
        },

        _handleMouseDown: function (mdevt) {
            var target = this._getTarget(mdevt.target),
                items = this._getItems(),
                start = target ? items.indexOf(target) : -1;

            if (start === -1) {
                return;
            }

            mdevt.preventDefault();

            this.trigger('start', { target: target });

            var originalStates = items.map(this._getItemState.bind(this)),
                states,
                state = !originalStates[start],
                pos = this._.options.horizontal ? mdevt.clientX : mdevt.clientY;

            this._setItemState(target, state);

            states = originalStates.slice();
            states[start] = state;

            var handleMove = this._getMoveHandler(items, originalStates, states, start, state, pos);

            var end = function (muevt) {
                var endTgt;

                if (muevt) {
                    muevt.preventDefault();
                    endTgt = this._getTarget(muevt.target);
                }

                DOM.removeListener(document, 'mousemove', handleMove);
                DOM.removeListener(document, 'mouseup', end);
                this._.scrolling = false;

                if (endTgt === target || states.some(function(s, i) { return i !== start && s !== originalStates[i]; })) {
                    this.trigger('change');

                } else {
                    this._setItemState(target, !state);

                }

                this.trigger('end');

                if (endTgt && typeof endTgt.focus === 'function') {
                    endTgt.focus();
                }
            }.bind(this);

            DOM.addListener(document, 'mousemove', handleMove);
            DOM.addListener(document, 'mouseup', end);

        },

        _getMoveHandler: function(items, originalStates, states, start, state, prev) {
            var scroll = this._getScrollInfo(),
                boundaryElems = this._getBoundaryElements(items),
                boundaries = this._getBoundaries(boundaryElems, start, scroll.window.offset),
                horiz = this._.options.horizontal,
                pos, offs, coffs,
                n = items.length;

            if (scroll.container && scroll.container.offset > 0) {
                boundaries = boundaries.map(function(b) {
                    return b + scroll.container.offset;
                });
            }

            var check = function(offs) {
                coffs = scroll.container ? scroll.container.offset : 0;

                for (var i = 0; i < n; i++) {
                    if (i !== start && originalStates[i] !== state) {
                        if (i < start && offs < boundaries[i] - coffs || i > start && offs > boundaries[i] - coffs) {
                            if (states[i] !== state) {
                                this._setItemState(items[i], state);
                                states[i] = state;

                            }
                        } else if (states[i] !== !state) {
                            this._setItemState(items[i], !state);
                            states[i] = !state;

                        }
                    }
                }
            }.bind(this);

            return function (evt) {
                evt.preventDefault();

                pos = horiz ? evt.clientX : evt.clientY;
                offs = scroll.window.offset + pos;
                check(offs);

                if (!this._.scrolling) {
                    if (pos < prev && (pos < scroll.window.prevThreshold || scroll.container && offs < scroll.container.prevThreshold)) {
                        this._startScrolling(scroll, -1, pos, check);
                    } else if (pos > prev && (pos > scroll.window.nextThreshold || scroll.container && offs > scroll.container.nextThreshold)) {
                        this._startScrolling(scroll, 1, pos, check);
                    }
                } else if (this._.scrolling.direction === -1 ? (pos > prev) : (pos < prev)) {
                    this._.scrolling = false;
                } else {
                    this._.scrolling.lastMousePosition = pos;
                }

                prev = pos;

            }.bind(this);
        },

        _getTarget: function (target) {
            if (this._.options.target) {
                return this._.options.target.call(null, target);
            } else {
                return target.control || target;
            }
        },

        _setItemState: function (item, state) {
            item.checked = state;
        },

        _getItemState: function (item) {
            return item.checked;
        },

        _getItems: function () {
            if (this._.options.items === null) {
                return Arrays.createFrom(this._.options.container.getElementsByTagName('input'))
                    .filter(function(elem) { return elem.type === 'checkbox'; });

            } else {
                return DOM.getByClassName(this._.options.items, this._.options.container);

            }
        },

        _getBoundaryElements: function (items) {
            if (!this._.options.boundary) {
                return items;
            } else if (this._.options.boundary === 'parent') {
                return items.map(function(elem) { return elem.parentNode; });
            } else {
                var sel = this._.options.boundary.split(/\./);
                return DOM.closest(items, sel[0], sel[1]);
            }
        },

        _getBoundaries: function (elements, start, offset) {
            if (this._.options.horizontal) {
                return elements.map(function (elem, i) {
                    var rect = elem.getBoundingClientRect();
                    return i < start ? offset + rect.right : (i > start ? offset + rect.left : null);
                });
            } else {
                return elements.map(function (elem, i) {
                    var rect = elem.getBoundingClientRect();
                    return i < start ? offset + rect.bottom : (i > start ? offset + rect.top : null);
                });
            }
        },

        _startScrolling: function (info, dir, pos, check) {
            this._.scrolling = {
                direction: dir,
                lastMousePosition: pos
            };

            function canScroll(target, dir) {
                return dir < 0 ? target.offset > 0 : (target.offset < target.max);
            }

            if (!canScroll(info.window, dir) && (!info.container || !canScroll(info.container, dir))) {
                return;
            }

            var doScroll = function() {
                if (info.container && canScroll(info.container, dir)) {
                    info.container.scrollBy(dir * this._.options.scroll.speed);

                } else if (canScroll(info.window, dir)) {
                    info.window.scrollBy(dir * this._.options.scroll.speed);

                } else {
                    return;
                }

                if (this._.scrolling) {
                    check(this._.scrolling.lastMousePosition + info.window.offset);
                    window.requestAnimationFrame(doScroll);
                }
            }.bind(this);

            window.requestAnimationFrame(doScroll);

        },

        _getScrollInfo: function () {
            var container = this._getScrollContainerInfo(),
                body = document.body || {},
                html = document.documentElement || {},
                win = {},
                size, zone;

            if (this._.options.horizontal) {
                size = Math.max(body.scrollWidth, body.offsetWidth, html.clientWidth, html.scrollWidth, html.offsetWidth);
                zone = this._getScrollZoneSize(window.innerWidth);
                win.max = Math.max(0, size - window.innerWidth);
                win.offset = window.pageXOffset;
                win.offsetCross = window.pageYOffset;
                win.prevThreshold = zone;
                win.nextThreshold = window.innerWidth - zone;

                win.scrollBy = function(v) {
                    win.offset = Math.max(0, Math.min(win.max, win.offset + v));
                    window.scrollTo(win.offset, win.offsetCross);
                };
            } else {
                size = Math.max(body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight);
                zone = this._getScrollZoneSize(window.innerHeight);
                win.max = Math.max(0, size - window.innerHeight);
                win.offset = window.pageYOffset;
                win.offsetCross = window.pageXOffset;
                win.prevThreshold = zone;
                win.nextThreshold = window.innerHeight - zone;

                win.scrollBy = function (v) {
                    win.offset = Math.max(0, Math.min(win.max, win.offset + v));
                    window.scrollTo(win.offsetCross, win.offset);
                };
            }

            if (container) {
                zone = this._getScrollZoneSize(container.size);
                container.prevThreshold = win.offset + container.position + zone;
                container.nextThreshold = win.offset + container.position + container.size - zone;

                container.scrollBy = function (v) {
                    container.offset = Math.max(0, Math.min(container.max, container.offset + v));
                    container.element[container.prop] = container.offset;
                };
            }

            return {
                window: win,
                container: container
            };
        },

        _getScrollZoneSize: function (size) {
            return this._.options.scroll.zoneSize < 1 ? this._.options.scroll.zoneSize * size : this._.options.scroll.zoneSize;
        },

        _getScrollContainerInfo: function () {
            var elem, sel, overflow,
                props = this._.options.horizontal
                    ? {scrollProp: 'scrollLeft', scrollSize: 'scrollWidth', clientSize: 'clientWidth', offsetSize: 'offsetWidth', overflow: 'overflowX', position: 'left'}
                    : {scrollProp: 'scrollTop', scrollSize: 'scrollHeight', clientSize: 'clientHeight', offsetSize: 'offsetHeight', overflow: 'overflowY', position: 'top'},
                scrollable = {scroll: 1, auto: 1};

            function isScrollable(elem, overflow) {
                return elem[props.scrollSize] > elem[props.clientSize] && overflow in scrollable;
            }

            function createInfo(elem) {
                var rect = elem.getBoundingClientRect();

                return {
                    element: elem,
                    offset: elem[props.scrollProp],
                    prop: props.scrollProp,
                    max: elem[props.scrollSize] - elem[props.clientSize],
                    size: elem[props.offsetSize],
                    position: rect[props.position]
                };
            }

            if (typeof this._.options.scroll.container === 'string') {
                sel = this._.options.scroll.container.split(/\./);
                elem = DOM.closest(this._.options.container, sel[0], sel[1]);
                overflow = DOM.getStyle(elem, 'overflow', false);
                return isScrollable(elem, overflow) ? createInfo(elem) : null;

            } else if (this._.options.scroll.container) {
                elem = this._.options.scroll.container;
                overflow = DOM.getStyle(elem, 'overflow', false);
                return isScrollable(elem, overflow) ? createInfo(elem) : null;

            } else {
                elem = this._.options.container;

                do {
                    overflow = DOM.getStyle(elem, 'overflow', false);

                    if (isScrollable(elem, overflow)) {
                        return createInfo(elem);
                    }

                    elem = elem.parentNode;
                } while (elem && elem !== document.body);
            }

            return null;
        }
    });

    _context.register(CheckList, 'CheckList');

}, {
    DOM: 'Utils.DOM',
    Arrays: 'Utils.Arrays'
});
