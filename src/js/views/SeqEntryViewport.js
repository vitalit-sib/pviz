/*
 * Copyright (c) 2013, Genentech Inc.
 * Authors: Alexandre Masselot, Kiran Mukhyala, Bioinformatics & Computational Biology
 */
define(
    /**
     @exports SeqEntryViewport
     @author Alexandre Masselot
     @author Kiran Mukhyala
     @copyright 2013,  Bioinformatics & Computational Biology Department, Genentech Inc.
     */
    ['jquery', 'underscore', 'backbone', 'd3'], function ($, _, Backbone, d3) {
        /**
         *
         * @class SeqEntryViewport map the sequence scale domain to the dom element
         * @constructor
         */

        var SeqEntryViewport = function (options) {
            var self = this;
            self.options = options;

            self.margins = _.extend({
                left: 0,
                right: 0,
                top: 0,
                bottom: 0
            })
            self.yShift = (options && options.yShift)

            for (n in options) {
                self[n] = options[n];
            }
            ;
            self.dim = {};
            self.computeDim();
            self.xBar = self.svg.insert('line').attr('class', 'x-bar').attr('x1', -1).attr('x2', -1).attr('y1', self.yShift).attr('y2', '100%');
            self.bgRect = self.svg.insert('rect').attr('width', '100%').attr('height', '100%').style('fill-opacity', '0').style('cursor', 'col-resize');

            self.rectLeft = self.svg.append('rect').attr('class', 'brush left').attr('x', 0).attr('y', self.yShift).attr('height', '100%').style('display', 'none')
            self.rectRight = self.svg.append('rect').attr('class', 'brush right').attr('x', 0).attr('y', self.yShift).attr('height', '100%').attr('width', '100%').style('display', 'none')
            self.selectBrush = self.svg.append('g').attr('class','select');

            self.svg.on('mousemove', function () {

                // trigger the mouse coordinates to make them accesseable to others
                var coordinates = d3.mouse(self.el[0]);
                var x = coordinates[0];
                var y = coordinates[1];
                Backbone.trigger("mousemovement", coordinates);

                self.setXBar(self.scales.x.invert(x))
                _.each(options.xChangeCallback, function (f) {
                    if (!f) {
                        return;
                    }
                    f(self.scales.x.invert(x - 0.5), self.scales.x.invert(x + 0.5));
                });
            });

            self.svg.on('mouseout', function () {
                self.xBar.style('display', 'none');
            }).on('mouseover', function () {
                self.xBar.style('display', null);
            })

            self.initBrush();
            self.setMode('zoom');
        }

        /**
         * @private
         * @param self
         */
        SeqEntryViewport.prototype.initBrush = function() {
            var self = this;
            self.brush = d3.brushX();
            self.selectBrush.call(self.brush);

            self.brush.on("end", brushMode);

            self.brush.on('brush', function () {
                var selRange = d3.brushSelection(self.selectBrush.node());
                if(selRange){
                    self.setRect(selRange);
                }
            })

            function brushMode() {
                if (self.mode === 'zoom') {
                    if(self.clearBrush){
                        self.clearBrush = false;
                    }else{
                        brushZoom();
                    }
                }
                if (self.mode === 'select') {
                    console.log('Sorry, but the select mode was disabled on version 2.0');
                }
            }

            function brushZoom() {
                self.rectClear()
                var pixBounds = d3.brushSelection(self.selectBrush.node());
        
                if(pixBounds){
                    var bounds = pixBounds.map(self.scales.x.invert);

                    if (bounds[0] < 0) {
                        bounds[0] = 0;
                    }
                    if (bounds[1] > self.length - 1) {
                        bounds[1] = self.length - 1;
                    } else {
                        self.scales.x.domain([Math.floor(bounds[0]), Math.ceil(bounds[1])]);
                    }
                }else{
                    self.scales.x.domain([0, self.length - 1]);
                }

                self.change();
                self.setXBar(self.scales.x.invert(d3.mouse(self.el[0])[0]));

                self.clearBrush = true;
                self.brush.move(self.selectBrush, null);
            }

        };

        /**
         * called for window resize
         * @private
         */
        SeqEntryViewport.prototype.resizeBrush = function () {
            var self = this;

            if (self.mode === 'select') {
                d3.brushX(d3.scale.identity().domain([0,self.svg.node().getBoundingClientRect().right]));
                d3.brushY(d3.scale.identity().domain([0,self.svg.node().getBoundingClientRect().bottom]));
            }
        };
        /**
         * setMode: sets the action taken when the user performs a click-drag on the plot
         * @param {String} mode either: 'zoom', or 'select'. Default is 'zoom'
         */
        SeqEntryViewport.prototype.setMode = function (mode) {
            var self = this;
            self.mode = mode;
            if (mode === 'zoom') {
                self.bgRect.style('pointer-events',null);
                self.bgRect.style('cursor', 'col-resize')
            }
            else if (mode === 'select') {
                console.log('Sorry, but the select mode was disabled on version 2.0');
            }
            else {
                self.bgRect.style('pointer-events','none');
                self.bgRect.style('cursor', 'pointer');
            }
        };

        /**
         * @private
         * @param x
         */
        SeqEntryViewport.prototype.setXBar = function (x) {
            var self = this;
            var i = self.scales.x(x)
            self.xBar.attr('x1', i).attr('x2', i)

        };
        /**
         * @private
         * @param i
         */
        SeqEntryViewport.prototype.rectClear = function (i) {
            var self = this;
            self.rectLeft.style('display', 'none')
            self.rectRight.style('display', 'none')
        };
        /**
         * @private
         * @param xs
         */
        SeqEntryViewport.prototype.setRect = function (xs) {
            var self = this;
            self.rectLeft.attr('width', (xs[0])).style('display', null)
            self.rectRight.attr('x', (xs[1])).style('display', null)

        };
        /**
         * @private
         */
        SeqEntryViewport.prototype.change = function () {
            var self = this;

            var domain = self.scales.x.domain();
            if (domain[0] < 1)
                domain[0] = 0;
            if (domain[1] > self.length)
                domain[1] = self.length

            if (domain[1] - domain[0] < 4) {
                var d = 2 - (domain[1] - domain[0]) / 2;
                domain[0] -= d;
                domain[1] += d;
            }

            self.scales.pxPerUnit = self.dim.width / (2 + self.length );
            self.scales.font = Math.min(0.9 * self.dim.width / (domain[1] - domain[0]), 20);

            self.changeCallback(self);

        };
        /**
         * set svg dimension, pixel per unit (1 unit = 1 AA)
         * and adapt x/y scales not to be stretched
         * @private
         */
        SeqEntryViewport.prototype.computeDim = function () {
            var self = this;

            var w = $(self.el).width();
            if (w > 0) {
                self.dim.width = w;
            } else {
                w = $(document).width();
                self.dim.width = w;
            }
            var h = $(self.el).height();
            if (w > 0) {
                self.dim.height = h;
            } else {
                w = $(document).height();
                self.dim.height = h;
            }
            self.dim.innerWidth = self.dim.width - self.margins.left - self.margins.right;
            self.computeScaling()
        };
        /**
         * @private
         * @param options
         */
        SeqEntryViewport.prototype.computeScaling = function (options) {
            var self = this;

            if (options == undefined) {
                options = {};
            }
            var xMin = options.xMin || 0;
            var xMax = options.xMax || (self.length - 1);
            var lineHeight = 15;

            if (self.scales == undefined)
                self.scales = {};
            if (self.scales.x == undefined) {
                self.scales.x = d3.scaleLinear().domain([xMin, xMax]).range([self.margins.left, self.dim.width - self.margins.right])
            } else {
                self.scales.x.domain([xMin, xMax]);
            }
            self.scales.y = d3.scaleLinear().domain([0, 100]).range([0, lineHeight * 100]);
            self.scales.pxPerUnit = self.dim.width / (2 + self.length );
            self.scales.font = Math.min(0.9 * self.dim.width / (xMax - xMin), 20);
        };

        /**
         * reset: zoom out to the initial value (full x-axis) and clear selected features.
         */
        SeqEntryViewport.prototype.reset = function () {
            var self = this;
            self.brush.extent([0,0]);
            self.scales.x.domain([0, self.length - 1]);
            self.change();
            self.setXBar(0);
            self.selectFeatures();
        };

        return SeqEntryViewport;

    });
