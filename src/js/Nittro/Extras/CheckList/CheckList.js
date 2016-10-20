_context.invoke('Nittro.Extras.CheckList', function(DOM, Arrays) {

    var CheckList = _context.extend('Nittro.Object', function (options) {
        this._ = {
            options: Arrays.mergeTree({}, CheckList.defaults, options)
        };

        if (typeof this._.options.container === 'string') {
            this._.options.container = DOM.getById(this._.options.container);
        }

        DOM.addListener(this._.options.container, 'mousedown', this._handleMouseDown.bind(this));

    }, {
        STATIC: {
            defaults: {
                container: null,    // ID or DOM element
                items: null,        // null = input[type="checkbox"], string = class name
                boundary: 'parent', // null = self, "parent" = parent element, other string = tag.class selector for DOM.closest
                horizontal: false
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

            var boundaryElems = this._getBoundaryElements(items),
                boundaries = this._getBoundaries(boundaryElems, start),
                originalStates = items.map(this._getItemState.bind(this)),
                state = !this._getItemState(target);

            this._setItemState(target, state);

            var handleMove = this._getMoveHandler(items, boundaries, originalStates, start, state);

            var end = function (evt) {
                evt && evt.preventDefault();

                DOM.removeListener(document, 'mousemove', handleMove);
                DOM.removeListener(document, 'mouseup', end);
                this._setItemState(target, originalStates[start]);
                this.trigger('stop');

            }.bind(this);

            DOM.addListener(document, 'mousemove', handleMove);
            DOM.addListener(document, 'mouseup', end);

        },

        _getMoveHandler: function(items, boundaries, originalStates, start, state) {
            var horiz = this._.options.horizontal,
                states = originalStates.slice(),
                pos,
                n = items.length,
                changed = false;

            return function (evt) {
                evt.preventDefault();

                pos = horiz ? evt.clientX : evt.clientY;

                for (var i = 0; i < n; i++) {
                    if (i !== start && originalStates[i] !== state) {
                        if (i < start && pos < boundaries[i] || i > start && pos > boundaries[i]) {
                            if (states[i] !== state) {
                                this._setItemState(items[i], state);
                                states[i] = state;

                                if (!changed) {
                                    changed = true;
                                    originalStates[start] = state;
                                }
                            }
                        } else {
                            if (states[i] !== !state) {
                                this._setItemState(items[i], !state);
                                states[i] = !state;

                            }
                        }
                    }
                }
            }.bind(this);
        },

        _getTarget: function (target) {
            return target;
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

        _getBoundaries: function (elements, start) {
            if (this._.options.horizontal) {
                return elements.map(function (elem, i) {
                    var rect = elem.getBoundingClientRect();
                    return i < start ? rect.right : (i > start ? rect.left : null);
                });
            } else {
                return elements.map(function (elem, i) {
                    var rect = elem.getBoundingClientRect();
                    return i < start ? rect.bottom : (i > start ? rect.top : null);
                });
            }
        }
    });

    _context.register(CheckList, 'CheckList');

}, {
    DOM: 'Utils.DOM',
    Arrays: 'Utils.Arrays'
});
