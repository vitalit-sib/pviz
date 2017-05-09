/*! sib-pviz - v0.1.11 - 2017-05-08 */
/**
	* pViz
	* Copyright (c) 2013, Genentech Inc.
	* All rights reserved.
	* Authors: Alexandre Masselot, Kiran Mukhyala, Bioinformatics & Computational Biology, Genentech
	Redistribution and use in source and binary forms are permitted
	provided that the above copyright notice and this paragraph are	
	duplicated in all such forms and that any documentation,
	advertising materials, and other materials related to such
	distribution and use acknowledge that the software was developed
	by the Bioinformatics and Computational Biology Department, Genentech Inc.  The name of
	Genentech may not be used to endorse or promote products derived
	from this software without specific prior written permission.
	THIS SOFTWARE IS PROVIDED ``AS IS'' AND WITHOUT ANY EXPRESS OR
	IMPLIED WARRANTIES, INCLUDING, WITHOUT LIMITATION, THE IMPLIED
	WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE.
*/

define(
    /**
     @exports SeqEntry
     @author Alexandre Masselot
     @author Kiran Mukhyala
     @copyright 2013,  Bioinformatics & Computational Biology Department, Genentech Inc.
     */
    'pviz/models/SeqEntry',['underscore', 'backbone'], function (_, Backbone) {
        /**
         * A SeqEntry object holds the sequence and the list of PositionedFeature
         * @constructor
         * @augments Backbone.Model
         *
         * @param {Map} options
         * @param {String} options.sequence is the layer to be shown. Default is true
         * @param {Array} options.features an array of object (will be mapped into PositionedFeature)
         */
        var SeqEntry = Backbone.Model.extend(
            /**
             * @lends module:SeqEntry~SeqEntry.prototype
             */
            {
                defaults: {

                },
                initialize: function () {
                    this.set('features', []);
                },
                /**
                 *
                 * @return {integer} sequence length
                 */
                length: function () {
                    var seq = this.get('sequence');
                    return (seq === undefined) ? 0 : seq.length
                },
                /**
                 * Add san array or a single feature to the seq entry. A 'change' event will be triggered by default. The Backbone view will be binded to such changes
                 * @param {Array|Object} feats
                 * @param {Map} options
                 * @param {boolean} options.triggerChange defines is a 'change' event is to be fired (default is true)
                 * @return {SeqEntry}
                 */
                addFeatures: function (feats, options) {
                    var self = this;
                    options = options || {};

                    var triggerChange = options.triggerChange || (options.triggerChange === undefined);

                    if (_.isArray(feats)) {
                        _.each(feats, function (ft) {
                            ft.start = parseInt(ft.start);
                            ft.end = parseInt(ft.end);
                            self.get('features').push(ft);
                        })
                        if (triggerChange)
                            self.trigger('change');
                        return self;
                    }
                    self.get('features').push(feats);
                    if (triggerChange)
                        self.trigger('change');
                    return self;
                },
                /**
                 * Removes an array or a single feature from the seq entry. A 'change' event will be triggered by default. The Backbone view will be binded to such changes
                 * @param {Array|Object} feats
                 * @param {Map} options
                 * @param {boolean} options.triggerChange defines is a 'change' event is to be fired (default is true)
                 * @return {SeqEntry}
                 */
                removeFeatures: function (feats, options) {
                    var self = this;
                    options = options || {};

                    var triggerChange = options.triggerChange || (options.triggerChange === undefined);

					var featureArray = self.get('features');
                    if (_.isArray(feats)) {
                        _.each(feats, function (ft) {
							var index = featureArray.indexOf(ft);
							if (index !== -1) {
								featureArray.splice(index, 1);
							}
                        })
                        if (triggerChange)
                            self.trigger('change');
                        return self;
                    }
					var index = featureArray.indexOf(feats);
					if (index !== -1) {
						featureArray.splice(index, 1);
					}
                    if (triggerChange)
                        self.trigger('change');
                    return self;
                },
                /**
                 * Removes all the features (and fire a 'change' event
                 * @return {SeqEntry}
                 */
                clear: function () {
                    this.get('features').length = 0
                    this.trigger('change');
                    return this;

                }
            });
        return SeqEntry;
    });


define(
    /**
     @exports PositionedFeature
     @author Alexandre Masselot
     @author Kiran Mukhyala
     @copyright 2013,  Bioinformatics & Computational Biology Department, Genentech Inc.
     */
    'pviz/models/PositionedFeature',['underscore'], function (_) {
        /**
         * @class PositionedFeature, corresponding to the basic component to be displayed. There is no limit among the feature member. However, a few a given by default
         * @constructor
         * @param {Map} options
         * @param {int} options.start [compulsory] the starting position, (first one is 0)
         * @param {int} options.end  [compulsory] the ending position
         * @param {String} options.type [compulsory] will be used to define how to draw the feature
         * @param {String} options.category [compulsory] all the feature below the same category are regrouped together
         * @param {String} options.groupSet  a super category
         * @param {String} options.text  a description to be displayed by default
         *
         */
        var PositionedFeature = function (options) {
            var self = this;
            _.each(['start', 'end', 'type', 'category', 'description', 'displayTrack', 'text', 'groupSet'], function (name) {
                self[name] = options[name]
            })
        }

        return PositionedFeature;
    });

define(
    /**
     @exports DASReader
     @author Alexandre Masselot
     @author Kiran Mukhyala
     @copyright 2013,  Bioinformatics & Computational Biology Department, Genentech Inc.
     */
    'pviz/services/DASReader',['underscore', 'pviz/models/SeqEntry', 'pviz/models/PositionedFeature'],

    function (_, SeqEntry, PositionedFeature) {
        /**
         * A service that goes and grab information from a DAS service, builds SeqEntry and add positioned annotations
         @constructor
         @param {String} url to get the info (default is  http://www.ebi.ac.uk/das-srv/uniprot/das/uniprot)
         @param {Map} options
         @param {Map} options.xmlMapper a map of string (field names) to function to transform the loaded DAS entry (see examples)
         */

        var DASReader = function (url, options) {
            var self = this;
            options = options || {}
            self.urlRoot = url || 'http://www.ebi.ac.uk/das-srv/uniprot/das/uniprot'
            self.xmlMapper = options.xmlMapper || {}
        }
        /**
         * build a new SeqEntry, with sequence, from an id
         *
         * @param {String}
         *          id
         * @param {Map} options can have several fields
         * @param {boolean} options.getFeatures once the sequence is loaded, we load the features
         * @param {function} options.success: a function to be executed upon success of loading seq, with the newly created seqEntry as argument
         */
        DASReader.prototype.buildSeqEntry = function (id, options) {
            var self = this;
            var url = self.urlRoot + '/sequence?segment=' + id;

            if (options === undefined) {
                options = {}
            }

            $.get(url, function (xml) {
                var seqEntry = self.xml2seqEntry(xml);

                if (options.getFeatures) {
                    delete options.getFeatures;
                    self.addFeatures(seqEntry, options)
                    return;
                    // no need to call success, it should be done at the end
                    // of getFeatures
                }

                if (options.success !== undefined) {
                    options.success(seqEntry);
                }
            })
        }
        /**
         * from a DAS xml (the /sequence one), it builds up a SeqEntry
         * @param {String} xmlStr xml string
         */
        DASReader.prototype.xml2seqEntry = function (xmlStr, options) {
            options = options || {};

            var xml = $(xmlStr);
            var el = xml.find('SEQUENCE:first');
            return new SeqEntry({
                id: el.attr('id'),
                description: el.attr('label'),
                sequence: el.text().trim()
            });
        };

        /**
         * from a DAS xml (the /features one), adds positional features to a seq entry
         * @param {SeqEntry} seqEntry
         * @param {String} xmlStr xml string
         * @param {Map} options
         * @param {String} options.groupSet to group the feature in the meta category
         * @param {Map} options.skipCategory a map string -> boolean to indicate whether a given category is to be skipped
         */
        DASReader.prototype.xml2features = function (seqEntry, xmlStr, options) {
            var self = this;
            options = options || {};

            var xml = $(xmlStr);
            var el = xml.find('SEQUENCE')[0];
            var features = _.chain(xml.find('FEATURE')).filter(function (node) {
                return $(node).find('START').length == 1
            }).map(function (n) {
                var node = $(n);
                var f = new PositionedFeature({
                    start: parseInt(node.find('START:first').text()) - 1,
                    end: parseInt(node.find('END:first').text()) - 1,
                    type: node.find('TYPE:first').text(),
                    category: node.find('TYPE:first').attr('category'),
                    description: node.find('NOTE:first').text()
                });
                if (options.groupSet) {
                    f.groupSet = options.groupSet;
                }
                _.each(self.xmlMapper, function (fct, field) {
                    f[field] = fct(f[field], f, node)
                })
                return f;
            }).filter(function (ft) {
                if (options.skipCategory && options.skipCategory[ft.category])
                    return false
                return true;
            }).value();
            // each(function(node){console.log(node)});
            seqEntry.addFeatures(features);
        };

        /**
         * make a call to the DAS server to add features to the passed SeqEntry
         * @param {SeqEntry} seqEntry
         * @param {Map} options
         * @param {function} options.success callback function once the feature have been added
         */
        DASReader.prototype.addFeatures = function (seqEntry, options) {
            var self = this;
            options = options || {}

            var url = self.urlRoot + '/features?segment=' + seqEntry.get('id');
            $.get(url, function (xml) {
                self.xml2features(seqEntry, xml, options)
                if (options.success !== undefined) {
                    options.success(seqEntry);

                }
            });
        }

        return DASReader
    });

define(
    /**
     @exports FastaReader
     @author Alexandre Masselot
     @author Kiran Mukhyala
     @copyright 2013,  Bioinformatics & Computational Biology Department, Genentech Inc.
     */

    'pviz/services/FastaReader',['underscore', 'pviz/models/SeqEntry', 'pviz/models/PositionedFeature'], function (_, SeqEntry, PositionedFeature) {
        /**
         * A service to read a fast file, enhanced with  PSI/PEFF annotation
         @constructor
         */

        var FastaReader = function () {
        }

        /**
         * builds a SeqEntry based on a string content
         * @param {String} content
         * @return {SeqEntry}
         */
        FastaReader.prototype.buildSeqEntry = function (content) {
            var self = this;

            var hs = self.headerAndSequence(content);
            var seq = hs[1];
            var header = self.peffHeader2map(hs[0])
            var se = new SeqEntry({
                id: header[0],
                sequence: seq
            })
            if (header[1] == undefined) {
                return se;
            }
            if (header[1].Pname) {
                se.set('description', header[1].Pname)
            }
            self.parseFeatures(se, header[1])
            return se;
        }
        /**
         * parse textual features and add them into the SeqEntry
         * @private
         * @param seqEntry
         * @param feats
         */
        FastaReader.prototype.parseFeatures = function (seqEntry, feats) {
            var self = this;
            if (feats == undefined) {
                return;
            }

            var keepOnly = {
                Processed: 'processed',
                Variant: 'variants',
                ModRes: 'amino acid modifications',
                ModResPsi: 'amino acid modifications',
            }

            _.chain(feats).each(function (ftList, cat) {
                if (!keepOnly[cat])
                    return;

                var posFeatures = _.map(ftList, function (ftTxt) {
                    var arr = ftTxt.split('|')
                    if (arr.length == 2) {
                        arr.unshift(arr[0])
                    }
                    return new PositionedFeature({
                        start: arr[0] - 1,
                        end: arr[1] - 1,
                        category: keepOnly[cat],
                        type: cat,
                        name: arr[2],
                        text: arr[2]
                    })
                })
                seqEntry.addFeatures(posFeatures);
            })
        }
        /***
         * split  a fasta text into header and sequence.
         *  headeing '>' is removed on sequence
         * sequence spaces are cleaned out
         * @param {Text} text
         * @return an array of [header, sequence]
         */
        FastaReader.prototype.headerAndSequence = function (text) {
            var self = this;

            var arr = text.split(/\n/);
            var header = arr.shift();
            header = header.replace(/^>/, '').trim();

            var seq = arr.join('');
            seq = seq.replace(/\s+/g, '');

            return [header, seq];
        }
        /**
         * parse the header line, with peff fashion
         * returns an array [id, featMap]
         * check tests to see how it works...
         * if the value of a field is of '(...)' then an array is returned with the parenthesis content
         * @private
         * @param {String} line
         */
        FastaReader.prototype.peffHeader2map = function (line) {
            var self = this;

            line = line.trim();
            var re = new RegExp("(.*)\\s\\\\(\\w+)=(.*)")
            var reTokens = /\(([^\)]*)\)/g
            var feats = {}
            while (m = re.exec(line)) {
                var key = m[2]
                var val = m[3].trim()
                line = m[1]
                if (val[0] == '(' && val[val.length - 1] == ')') {
                    var a = []
                    while (m = reTokens.exec(val)) {
                        a.push(m[1])
                    }
                    feats[key] = a
                } else {
                    feats[key] = val
                }

            }
            return [line.trim(), feats]

        }

        return FastaReader;
    })
;
define(
    /**
     @exports FeatureManager
     @author Alexandre Masselot
     @author Kiran Mukhyala
     @copyright 2013,  Bioinformatics & Computational Biology Department, Genentech Inc.
     */
    'pviz/services/FeatureManager',['underscore'], function (_) {
        /**
         * Distribute features under one category across different track so they do not overlap
         * requiring this module will indeed return a singleton
         @constructor
         */
        var FeatureManager = function () {
        }
        /**
         * Sort the feature by starting positions
         * @private
         * @param {Array[]}
         */
        FeatureManager.prototype.sortFeatures = function (features, options) {
            var self = this;

            if (options === undefined) {
                options = {}
            }
            return _.sortBy(features, function (a) {
                return a.start;
            });
        }

        /**
         * Do two features overlap?
         * @private
         * @param {Object} fta
         * @param {Object} ftb
         */
        FeatureManager.prototype.featuresIntersect = function (fta, ftb) {
            return !((fta.end < ftb.start) || (ftb.end < fta.start))
            // /(fta.start >= ftb.start && fta.start <= ftb.end) || (fta.end >= ftb.start && fta.end <= ftb.end)
        };

        /**
         * get the overlapping features for the fnum^th one
         * Only works on sorted features
         * @param {int} fNum
         * @param {Array} features array of PositionedFeature
         * @private
         */
        FeatureManager.prototype._getOverlaps = function (fNum, features) {
            var self = this;
            var feat = features[fNum];

            return _.filter(features.slice(0, fNum), function (ft) {
                //we check that we can have several time the same feature???
                return (!_.isEqual(feat, ft)) && (self.featuresIntersect(feat, ft));
            });

        }
        /**
         *  Distribute the features among tracks by adding a displayTrack attribute to each feature
         *
         * @param {Array} features and array of features. We add a displayTrack attribute to each element.
         * @return the number of tracks
         */
        FeatureManager.prototype.assignTracks = function (features, options) {
            var sortedFeats = this.sortFeatures(features, options);

            var nbTracks = 0;
            var lastPosPerTrack = []
            _.chain(sortedFeats).each(function (ft) {
                var ftStart = ft.start;
                for (itrack = 0; itrack < lastPosPerTrack.length && lastPosPerTrack[itrack] >= ftStart; itrack++) {
                }
                lastPosPerTrack[itrack] = ft.end
                ft.displayTrack = itrack
            })
            return lastPosPerTrack.length
        }
        /*
         * singleton contructor
         */
        return new FeatureManager()
    });

/**
 * these icons definitions are taken from Raphael http://raphaeljs.com/icons/icons.js
 * there are protected by an MIT license http://raphaeljs.com/icons/
 * Thanks Dmitry

 * Copyright (c) 2013, Genentech Inc.
 * Authors: Alexandre Masselot, Kiran Mukhyala, Bioinformatics & Computational Biology
 */
define('pviz/services/IconFactory',[], function() {
  var IconFactory = function() {

  }

  IconFactory.prototype.append = function(container, name, height) {
    var g = container.append('g').attr('class', 'icon');
    g.append('rect').attr('width', 32).attr('height', 32).style('opacity', 0);
    var p = g.append('path').attr('d', iconPaths[name]);
    if (height !== undefined) {
      var f = (1.0 * height / 32)
      g.attr('transform', 'scale(' + f + ', ' + f + ')')
    }
    return p;
  }
  var iconPaths = {
    "?" : "M16,1.466C7.973,1.466,1.466,7.973,1.466,16c0,8.027,6.507,14.534,14.534,14.534c8.027,0,14.534-6.507,14.534-14.534C30.534,7.973,24.027,1.466,16,1.466z M17.328,24.371h-2.707v-2.596h2.707V24.371zM17.328,19.003v0.858h-2.707v-1.057c0-3.19,3.63-3.696,3.63-5.963c0-1.034-0.924-1.826-2.134-1.826c-1.254,0-2.354,0.924-2.354,0.924l-1.541-1.915c0,0,1.519-1.584,4.137-1.584c2.487,0,4.796,1.54,4.796,4.136C21.156,16.208,17.328,16.627,17.328,19.003z",
    i : "M16,1.466C7.973,1.466,1.466,7.973,1.466,16c0,8.027,6.507,14.534,14.534,14.534c8.027,0,14.534-6.507,14.534-14.534C30.534,7.973,24.027,1.466,16,1.466z M14.757,8h2.42v2.574h-2.42V8z M18.762,23.622H16.1c-1.034,0-1.475-0.44-1.475-1.496v-6.865c0-0.33-0.176-0.484-0.484-0.484h-0.88V12.4h2.662c1.035,0,1.474,0.462,1.474,1.496v6.887c0,0.309,0.176,0.484,0.484,0.484h0.88V23.622z",
    $ : "M16,1.466C7.973,1.466,1.466,7.973,1.466,16c0,8.027,6.507,14.534,14.534,14.534c8.027,0,14.534-6.507,14.534-14.534C30.534,7.973,24.027,1.466,16,1.466z M17.255,23.88v2.047h-1.958v-2.024c-3.213-0.44-4.621-3.08-4.621-3.08l2.002-1.673c0,0,1.276,2.223,3.586,2.223c1.276,0,2.244-0.683,2.244-1.849c0-2.729-7.349-2.398-7.349-7.459c0-2.2,1.738-3.785,4.137-4.159V5.859h1.958v2.046c1.672,0.22,3.652,1.1,3.652,2.993v1.452h-2.596v-0.704c0-0.726-0.925-1.21-1.959-1.21c-1.32,0-2.288,0.66-2.288,1.584c0,2.794,7.349,2.112,7.349,7.415C21.413,21.614,19.785,23.506,17.255,23.88z",
    arrowleftalt : "M16,30.534c8.027,0,14.534-6.507,14.534-14.534c0-8.027-6.507-14.534-14.534-14.534C7.973,1.466,1.466,7.973,1.466,16C1.466,24.027,7.973,30.534,16,30.534zM18.335,6.276l3.536,3.538l-6.187,6.187l6.187,6.187l-3.536,3.537l-9.723-9.724L18.335,6.276z",
    arrowalt : "M16,1.466C7.973,1.466,1.466,7.973,1.466,16c0,8.027,6.507,14.534,14.534,14.534c8.027,0,14.534-6.507,14.534-14.534C30.534,7.973,24.027,1.466,16,1.466zM13.665,25.725l-3.536-3.539l6.187-6.187l-6.187-6.187l3.536-3.536l9.724,9.723L13.665,25.725z",
    "!" : "M26.711,14.086L16.914,4.29c-0.778-0.778-2.051-0.778-2.829,0L4.29,14.086c-0.778,0.778-0.778,2.05,0,2.829l9.796,9.796c0.778,0.777,2.051,0.777,2.829,0l9.797-9.797C27.488,16.136,27.488,14.864,26.711,14.086zM14.702,8.981c0.22-0.238,0.501-0.357,0.844-0.357s0.624,0.118,0.844,0.353c0.221,0.235,0.33,0.531,0.33,0.885c0,0.306-0.101,1.333-0.303,3.082c-0.201,1.749-0.379,3.439-0.531,5.072H15.17c-0.135-1.633-0.301-3.323-0.5-5.072c-0.198-1.749-0.298-2.776-0.298-3.082C14.372,9.513,14.482,9.22,14.702,8.981zM16.431,21.799c-0.247,0.241-0.542,0.362-0.885,0.362s-0.638-0.121-0.885-0.362c-0.248-0.241-0.372-0.533-0.372-0.876s0.124-0.638,0.372-0.885c0.247-0.248,0.542-0.372,0.885-0.372s0.638,0.124,0.885,0.372c0.248,0.247,0.372,0.542,0.372,0.885S16.679,21.558,16.431,21.799z",
    "?2" : "M26.711,14.086L16.914,4.29c-0.778-0.778-2.051-0.778-2.829,0L4.29,14.086c-0.778,0.778-0.778,2.05,0,2.829l9.796,9.796c0.778,0.777,2.051,0.777,2.829,0l9.797-9.797C27.488,16.136,27.488,14.864,26.711,14.086zM16.431,21.799c-0.248,0.241-0.543,0.362-0.885,0.362c-0.343,0-0.638-0.121-0.886-0.362c-0.247-0.241-0.371-0.533-0.371-0.876s0.124-0.638,0.371-0.885c0.248-0.248,0.543-0.372,0.886-0.372c0.342,0,0.637,0.124,0.885,0.372c0.248,0.247,0.371,0.542,0.371,0.885S16.679,21.558,16.431,21.799zM18.911,15.198c-0.721,0.716-1.712,1.147-2.972,1.294v2.027h-0.844v-3.476c0.386-0.03,0.768-0.093,1.146-0.188c0.38-0.095,0.719-0.25,1.019-0.464c0.312-0.227,0.555-0.5,0.729-0.822c0.174-0.322,0.261-0.77,0.261-1.346c0-0.918-0.194-1.623-0.582-2.113c-0.389-0.49-0.956-0.735-1.701-0.735c-0.281,0-0.527,0.042-0.738,0.124s-0.366,0.16-0.464,0.234c0.031,0.146,0.072,0.357,0.124,0.633c0.052,0.275,0.078,0.486,0.078,0.633c0,0.226-0.098,0.433-0.294,0.619c-0.195,0.187-0.479,0.28-0.853,0.28c-0.33,0-0.565-0.113-0.706-0.339s-0.211-0.489-0.211-0.789c0-0.244,0.067-0.484,0.201-0.72c0.135-0.235,0.346-0.463,0.633-0.684c0.245-0.195,0.577-0.364,0.995-0.504c0.419-0.141,0.854-0.211,1.308-0.211c0.647,0,1.223,0.103,1.724,0.308c0.502,0.205,0.914,0.479,1.238,0.822c0.337,0.355,0.586,0.755,0.748,1.198c0.162,0.444,0.243,0.926,0.243,1.446C19.994,13.558,19.633,14.482,18.911,15.198z",
    stopsign : "M20.833,2.625H10.167l-7.542,7.542v10.666l7.542,7.542h10.666l7.542-7.542V10.167L20.833,2.625zM23.76,17.145c-0.461,0.432-0.496-0.021-1.151,0.385c-0.655,0.404-1.067,0.844-1.067,0.844l-0.578,0.564c0,0-1.199,1.422-1.59,1.717c-0.392,0.291-0.572,0.166-0.572,0.166c-0.133,0.23-0.641,0.656-1.193,1.025c-0.549,0.371-0.99,1.354-0.99,1.354l-0.208,1.465c0,0-1.597,0.021-3.096-0.293c-1.499-0.314-2.699-0.982-2.699-0.982l0.655-1.451c0,0-0.58-2.225-0.636-3.926c-0.056-1.703,0.572-2.958,0.481-3.37c-0.09-0.412-0.438-1.109-0.523-1.569c-0.083-0.46-0.307-2.036-0.327-2.238c-0.021-0.202-0.28-2.232,0.614-2.204c0.891,0.027,0.648,1.388,0.725,2.246c0.077,0.857,1.13,3.249,1.297,3.123c0.167-0.125-0.056-2.398,0.006-2.838c0.063-0.439,0.182-2.315,0.293-2.747c0.112-0.433,0.105-1.778,0.935-1.66c0.83,0.118,0.606,1.332,0.488,1.813c-0.118,0.48,0.021,1.597,0.07,2.302c0.048,0.704,0.112,2.356,0.112,2.356l0.404-0.042c0,0,0.913-5,0.976-5.439c0.062-0.439,0.182-1.618,0.858-1.472c1.117,0.242,0.516,1.967,0.516,1.967l-0.486,5.509c0,0,0.166,0.224,0.492,0.021c0.33-0.202,1.312-3.25,1.459-3.927c0.146-0.676,0.084-2.678,1.145-2.428c1.059,0.252,0.453,2.755,0.124,4.353c-0.327,1.597-1.03,3.39-1.03,3.39l-0.433,1.631l0.376,0.852l0.412-0.092l0.898-0.717c0,0,0,0,0.614-0.461c0.613-0.46,1.764-0.495,2.044-0.355C23.453,16.154,24.221,16.713,23.76,17.145z",
    temp : "M17.5,19.508V8.626h-3.999v10.881c-1.404,0.727-2.375,2.178-2.375,3.869c0,2.416,1.959,4.375,4.375,4.375s4.375-1.959,4.375-4.375C19.876,21.686,18.905,20.234,17.5,19.508zM20.5,5.249c0-2.757-2.244-5-5.001-5s-4.998,2.244-4.998,5v12.726c-1.497,1.373-2.376,3.314-2.376,5.4c0,4.066,3.31,7.377,7.376,7.377s7.374-3.311,7.374-7.377c0-2.086-0.878-4.029-2.375-5.402V5.249zM20.875,23.377c0,2.963-2.41,5.373-5.375,5.373c-2.962,0-5.373-2.41-5.373-5.373c0-1.795,0.896-3.443,2.376-4.438V5.251c0-1.654,1.343-3,2.997-3s3,1.345,3,3v13.688C19.979,19.934,20.875,21.582,20.875,23.377zM22.084,8.626l4.5,2.598V6.029L22.084,8.626z",
    thunder : "M25.371,7.306c-0.092-3.924-3.301-7.077-7.248-7.079c-2.638,0.001-4.942,1.412-6.208,3.517c-0.595-0.327-1.28-0.517-2.01-0.517C7.626,3.229,5.772,5.033,5.689,7.293c-2.393,0.786-4.125,3.025-4.127,5.686c0,3.312,2.687,6,6,6v-0.002h5.271l-2.166,3.398l1.977-0.411L10,30.875l9.138-10.102L17,21l2.167-2.023h4.269c3.312,0,6-2.688,6-6C29.434,10.34,27.732,8.11,25.371,7.306zM23.436,16.979H7.561c-2.209-0.006-3.997-1.792-4.001-4.001c-0.002-1.982,1.45-3.618,3.35-3.931c0.265-0.043,0.502-0.191,0.657-0.414C7.722,8.41,7.779,8.136,7.73,7.87C7.702,7.722,7.685,7.582,7.685,7.446C7.689,6.221,8.68,5.23,9.905,5.228c0.647,0,1.217,0.278,1.633,0.731c0.233,0.257,0.587,0.375,0.927,0.309c0.342-0.066,0.626-0.307,0.748-0.63c0.749-1.992,2.662-3.412,4.911-3.41c2.899,0.004,5.244,2.35,5.251,5.249c0,0.161-0.009,0.326-0.027,0.497c-0.049,0.517,0.305,0.984,0.815,1.079c1.86,0.344,3.274,1.966,3.271,3.923C27.43,15.186,25.645,16.973,23.436,16.979z",
    snow : "M25.372,6.912c-0.093-3.925-3.302-7.078-7.248-7.08c-2.638,0.002-4.942,1.412-6.208,3.518c-0.595-0.327-1.28-0.518-2.01-0.518C7.627,2.834,5.773,4.639,5.69,6.898c-2.393,0.786-4.125,3.025-4.127,5.686c0,3.312,2.687,6,6,6v-0.002h15.875c3.312,0,6-2.688,6-6C29.434,9.944,27.732,7.715,25.372,6.912zM23.436,16.584H7.562c-2.209-0.006-3.997-1.793-4.001-4c-0.002-1.983,1.45-3.619,3.35-3.933c0.265-0.043,0.502-0.19,0.657-0.414C7.723,8.015,7.78,7.74,7.731,7.475C7.703,7.326,7.686,7.187,7.686,7.051c0.004-1.225,0.995-2.217,2.22-2.219c0.647,0,1.217,0.278,1.633,0.731c0.233,0.257,0.587,0.375,0.927,0.31c0.342-0.066,0.626-0.308,0.748-0.631c0.749-1.992,2.662-3.412,4.911-3.41c2.898,0.004,5.244,2.351,5.251,5.25c0,0.16-0.009,0.325-0.026,0.496c-0.05,0.518,0.305,0.984,0.814,1.079c1.859,0.345,3.273,1.966,3.271,3.923C27.43,14.791,25.645,16.578,23.436,16.584zM16.667,24.09l1.119-1.119c0.389-0.391,0.389-1.025,0-1.416c-0.392-0.391-1.025-0.391-1.415,0l-1.119,1.119l-1.119-1.119c-0.391-0.391-1.025-0.391-1.415,0c-0.391,0.391-0.391,1.025,0,1.416l1.118,1.117l-1.12,1.121c-0.389,0.393-0.389,1.021,0,1.414c0.195,0.188,0.451,0.293,0.707,0.293c0.256,0,0.512-0.104,0.708-0.293l1.12-1.119l1.12,1.119c0.195,0.188,0.451,0.293,0.708,0.293c0.256,0,0.512-0.104,0.707-0.293c0.391-0.396,0.391-1.021,0-1.414L16.667,24.09zM25.119,21.817c-0.393-0.392-1.025-0.392-1.415,0l-1.12,1.121l-1.12-1.121c-0.391-0.392-1.022-0.392-1.414,0c-0.39,0.392-0.39,1.022,0,1.416l1.119,1.119l-1.119,1.119c-0.39,0.391-0.39,1.022,0,1.413c0.195,0.195,0.451,0.294,0.707,0.294c0.257,0,0.513-0.099,0.707-0.294l1.12-1.118l1.12,1.118c0.194,0.195,0.45,0.294,0.707,0.294c0.256,0,0.513-0.099,0.708-0.294c0.389-0.391,0.389-1.022,0-1.413l-1.12-1.119l1.12-1.119C25.507,22.842,25.507,22.209,25.119,21.817zM9.334,23.953l1.119-1.119c0.389-0.394,0.389-1.021,0-1.414c-0.391-0.394-1.025-0.394-1.415,0l-1.119,1.119l-1.12-1.121c-0.391-0.39-1.023-0.39-1.415,0c-0.391,0.396-0.391,1.024,0,1.418l1.119,1.117l-1.12,1.118c-0.391,0.394-0.391,1.025,0,1.414c0.196,0.195,0.452,0.293,0.708,0.293c0.256,0,0.511-0.098,0.707-0.293l1.12-1.119l1.121,1.121c0.195,0.195,0.451,0.293,0.707,0.293s0.513-0.098,0.708-0.293c0.389-0.391,0.389-1.022,0-1.416L9.334,23.953z",
    hail : "M25.372,6.912c-0.093-3.925-3.302-7.078-7.248-7.08c-2.638,0.002-4.942,1.412-6.208,3.518c-0.595-0.327-1.28-0.518-2.01-0.518C7.627,2.834,5.773,4.639,5.69,6.898c-2.393,0.786-4.125,3.025-4.127,5.686c0,3.312,2.687,6,6,6v-0.002h15.875c3.312,0,6-2.688,6-6C29.434,9.944,27.732,7.715,25.372,6.912zM23.436,16.584H7.562c-2.209-0.006-3.997-1.793-4.001-4c-0.002-1.983,1.45-3.619,3.35-3.933c0.265-0.043,0.502-0.19,0.657-0.414C7.723,8.015,7.78,7.74,7.731,7.475C7.703,7.326,7.686,7.187,7.686,7.051c0.004-1.225,0.995-2.217,2.22-2.219c0.647,0,1.217,0.278,1.633,0.731c0.233,0.257,0.587,0.375,0.927,0.31c0.342-0.066,0.626-0.308,0.748-0.631c0.749-1.992,2.662-3.412,4.911-3.41c2.898,0.004,5.244,2.351,5.251,5.25c0,0.16-0.009,0.325-0.026,0.496c-0.05,0.518,0.305,0.984,0.814,1.079c1.859,0.345,3.273,1.966,3.271,3.923C27.43,14.791,25.645,16.578,23.436,16.584zM11.503,23.709c-0.784-0.002-1.418-0.636-1.418-1.416c0-0.785,0.634-1.416,1.418-1.418c0.78,0.002,1.413,0.633,1.416,1.418C12.917,23.073,12.284,23.707,11.503,23.709zM19.002,23.709c-0.783-0.002-1.418-0.636-1.418-1.416c0-0.785,0.635-1.416,1.418-1.418c0.779,0.002,1.414,0.633,1.414,1.418C20.417,23.073,19.784,23.707,19.002,23.709zM7.503,28.771c-0.783-0.002-1.417-0.637-1.417-1.418s0.634-1.414,1.417-1.416c0.78,0.002,1.415,0.635,1.415,1.416C8.917,28.135,8.284,28.77,7.503,28.771zM15.001,28.771c-0.782-0.002-1.417-0.637-1.417-1.418s0.634-1.414,1.417-1.416c0.78,0.002,1.413,0.635,1.415,1.416C16.415,28.135,15.784,28.77,15.001,28.771zM22.5,28.771c-0.782-0.002-1.416-0.634-1.416-1.416c0-0.785,0.634-1.418,1.416-1.42c0.781,0.002,1.414,0.635,1.418,1.42C23.915,28.138,23.282,28.77,22.5,28.771z",
    rain : "M25.371,7.306c-0.092-3.924-3.301-7.077-7.248-7.079c-2.638,0.001-4.942,1.412-6.208,3.517c-0.595-0.327-1.28-0.517-2.01-0.517C7.626,3.229,5.772,5.033,5.689,7.293c-2.393,0.786-4.125,3.025-4.127,5.686c0,3.312,2.687,6,6,6v-0.002h15.874c3.312,0,6-2.688,6-6C29.434,10.34,27.732,8.11,25.371,7.306zM23.436,16.979H7.561c-2.209-0.006-3.997-1.792-4.001-4.001c-0.002-1.982,1.45-3.618,3.35-3.931c0.265-0.043,0.502-0.191,0.657-0.414C7.722,8.41,7.779,8.136,7.73,7.87C7.702,7.722,7.685,7.582,7.685,7.446C7.689,6.221,8.68,5.23,9.905,5.228c0.647,0,1.217,0.278,1.633,0.731c0.233,0.257,0.587,0.375,0.927,0.309c0.342-0.066,0.626-0.307,0.748-0.63c0.749-1.992,2.662-3.412,4.911-3.41c2.899,0.004,5.244,2.35,5.251,5.249c0,0.161-0.009,0.326-0.027,0.497c-0.049,0.517,0.305,0.984,0.815,1.079c1.86,0.344,3.274,1.966,3.271,3.923C27.43,15.186,25.645,16.973,23.436,16.979zM9.029,26.682c0-1.115,0.021-5.425,0.021-5.432c0.002-0.409-0.247-0.779-0.628-0.932c-0.38-0.152-0.815-0.059-1.099,0.24c-0.006,0.008-1.037,1.098-2.081,2.342c-0.523,0.627-1.048,1.287-1.463,1.896c-0.399,0.648-0.753,1.066-0.811,1.885C2.971,28.355,4.324,29.711,6,29.714C7.672,29.71,9.029,28.354,9.029,26.682zM4.971,26.727c0.091-0.349,1.081-1.719,1.993-2.764c0.025-0.029,0.051-0.061,0.076-0.089c-0.005,1.124-0.01,2.294-0.01,2.808c0,0.567-0.461,1.028-1.029,1.03C5.447,27.71,4.997,27.273,4.971,26.727zM16.425,26.682c0-1.115,0.021-5.424,0.021-5.43c0.002-0.41-0.247-0.779-0.628-0.934c-0.381-0.152-0.814-0.058-1.1,0.242c-0.006,0.008-1.035,1.094-2.08,2.342c-0.522,0.623-1.047,1.285-1.463,1.894c-0.399,0.649-0.753,1.068-0.809,1.888c0,1.672,1.354,3.028,3.029,3.028C15.068,29.711,16.425,28.354,16.425,26.682zM12.365,26.729c0.092-0.349,1.081-1.72,1.993-2.765c0.025-0.03,0.05-0.06,0.075-0.089c-0.005,1.123-0.011,2.294-0.011,2.807c-0.002,0.568-0.461,1.027-1.028,1.029C12.84,27.709,12.392,27.273,12.365,26.729zM23.271,20.317c-0.38-0.153-0.816-0.06-1.099,0.24c-0.009,0.008-1.037,1.097-2.08,2.342c-0.523,0.625-1.049,1.285-1.462,1.896c-0.402,0.649-0.754,1.067-0.812,1.886c0,1.672,1.354,3.029,3.03,3.029c1.673,0,3.027-1.357,3.027-3.029c0-1.115,0.022-5.425,0.022-5.431C23.9,20.84,23.651,20.47,23.271,20.317zM21.879,26.681c-0.004,0.568-0.463,1.027-1.031,1.029c-0.553-0.002-1.002-0.438-1.028-0.982c0.092-0.349,1.081-1.72,1.993-2.765c0.025-0.028,0.05-0.059,0.074-0.088C21.883,24.998,21.879,26.167,21.879,26.681z",
    cloudy : "M14.378,6.781c0.41,0.988,1.938,0.346,1.524-0.648C15.708,5.667,15.515,5.2,15.32,4.734c-0.289-0.695-0.875-3.233-2.042-2.747c-1.03,0.433-0.128,1.846,0.142,2.494C13.739,5.248,14.059,6.015,14.378,6.781M20.8,7.223c1.094,0.453,1.538-1.551,1.813-2.216c0.281-0.677,1.478-2.565,0.357-3.029c-1.092-0.453-1.537,1.548-1.813,2.216C20.876,4.872,19.68,6.757,20.8,7.223M18.137,6.692c1.183,0,0.829-2.019,0.829-2.742c0-0.732,0.383-2.935-0.829-2.935c-1.183,0-0.828,2.019-0.828,2.742C17.309,4.49,16.926,6.692,18.137,6.692M23.058,8.729c0.852,0.85,2.142-0.972,2.659-1.49c0.512-0.513,2.187-1.687,1.352-2.524c-0.834-0.836-2.013,0.843-2.522,1.353C24.028,6.585,22.198,7.874,23.058,8.729M24.565,10.986c0.448,1.091,2.183-0.01,2.849-0.286c0.676-0.28,2.858-0.771,2.394-1.89c-0.455-1.091-2.181,0.008-2.849,0.285C26.281,9.377,24.102,9.866,24.565,10.986M12.036,8.742c0.752,0.75,1.932-0.415,1.17-1.173c-0.253-0.347-0.646-0.645-0.949-0.946c-0.541-0.539-2.162-2.799-3.068-1.889c-0.79,0.791,0.586,1.755,1.083,2.25C10.859,7.57,11.447,8.156,12.036,8.742M29.365,17.397c-0.768-0.317-1.534-0.635-2.302-0.952c-0.646-0.268-2.07-1.169-2.495-0.135c-0.481,1.168,2.054,1.747,2.751,2.035c0.455,0.188,0.911,0.377,1.367,0.565C29.7,19.331,30.379,17.816,29.365,17.397M29.942,12.817c-0.83,0-1.66,0-2.49,0c-0.701,0-2.357-0.288-2.355,0.83c0,1.262,2.567,0.827,3.319,0.827c0.493,0,0.986,0,1.479-0.001C30.99,14.473,31.043,12.815,29.942,12.817M24.234,18.568c-0.673-0.673-1.773,0.189-1.281,1.007c-0.295-0.264-0.614-0.499-0.961-0.69c3.894-2.866,3.328-9.006-1.021-11.107c-2.024-0.978-4.481-0.828-6.368,0.394c-0.871,0.564-1.603,1.336-2.119,2.236c-0.262,0.456-0.468,0.943-0.612,1.449c-0.074,0.258-0.131,0.521-0.172,0.786c-0.083,0.534-0.109,0.553-0.553,0.871c-0.182-0.957-1.64-0.675-2.326-0.674c-0.815,0.001-1.963-0.217-2.752,0.046c-0.867,0.289-0.652,1.615,0.263,1.613c0.324,0.052,0.701-0.001,1.028-0.001c0.904-0.001,1.809-0.002,2.713-0.003c-0.308,0.352-0.496,0.969-0.94,0.77c-0.467-0.209-0.978-0.319-1.49-0.319c-0.951,0-1.877,0.375-2.561,1.036c-0.681,0.658-1.088,1.569-1.123,2.516c-0.944,0.31-1.791,0.891-2.421,1.658c-2.756,3.354-0.265,8.554,4.058,8.554v-0.002c3.597,0,7.194,0,10.792,0c1.341,0,2.843,0.167,4.168-0.113c3.652-0.772,5.361-5.21,3.133-8.229c0.548,0.547,1.096,1.094,1.644,1.641c0.183,0.183,0.364,0.424,0.575,0.574c0.552,0.552,1.524,0.066,1.403-0.713c-0.097-0.622-1.042-1.267-1.448-1.673C25.319,19.652,24.776,19.11,24.234,18.568M18.137,8.787c4.559,0.009,6.576,5.979,2.912,8.734c-0.637-3.505-4.161-5.824-7.629-5.03C13.943,10.367,15.852,8.792,18.137,8.787M22.895,24.08c-0.633,3.346-4.149,2.879-6.68,2.879c-3.017,0-6.033,0-9.049,0c-0.767,0-1.62,0.084-2.373-0.095c-2.274-0.538-3.416-3.242-2.172-5.235c0.678-1.087,1.568-1.19,2.626-1.67c0.604-0.273,0.456-0.807,0.456-1.331c0.002-0.597,0.284-1.169,0.756-1.533c0.787-0.608,1.943-0.497,2.611,0.234c1.098,1.205,1.96-1.346,2.507-1.893c2.025-2.025,5.475-1.708,7.068,0.684c0.344,0.516,0.581,1.102,0.693,1.712c0.097,0.529-0.115,1.341,0.188,1.796c0.291,0.47,0.943,0.463,1.397,0.68c0.508,0.23,0.963,0.591,1.304,1.034C22.834,22.125,23.064,23.107,22.895,24.08M6.906,9.917c0.881,0.364,1.763,0.727,2.644,1.091c0.353,0.146,0.707,0.292,1.06,0.437c0.997,0.412,1.637-1.119,0.642-1.526C10.47,9.441,9.456,9.177,8.609,8.828c-0.354-0.146-0.707-0.292-1.06-0.437C6.554,7.98,5.912,9.505,6.906,9.917",
    sun : "M15.502,7.504c-4.35,0-7.873,3.523-7.873,7.873c0,4.347,3.523,7.872,7.873,7.872c4.346,0,7.871-3.525,7.871-7.872C23.374,11.027,19.85,7.504,15.502,7.504zM15.502,21.25c-3.244-0.008-5.866-2.63-5.874-5.872c0.007-3.243,2.63-5.866,5.874-5.874c3.242,0.008,5.864,2.631,5.871,5.874C21.366,18.62,18.744,21.242,15.502,21.25zM15.502,6.977c0.553,0,1-0.448,1-1.001V1.125c-0.002-0.553-0.448-1-1-1c-0.553,0-1.001,0.449-1,1.002v4.85C14.502,6.528,14.949,6.977,15.502,6.977zM18.715,7.615c0.125,0.053,0.255,0.076,0.382,0.077c0.394,0,0.765-0.233,0.925-0.618l1.856-4.483c0.21-0.511-0.031-1.095-0.541-1.306c-0.511-0.211-1.096,0.031-1.308,0.541L18.174,6.31C17.963,6.82,18.205,7.405,18.715,7.615zM21.44,9.436c0.195,0.194,0.451,0.293,0.707,0.293s0.512-0.098,0.707-0.293l3.43-3.433c0.391-0.39,0.39-1.023,0-1.415c-0.392-0.39-1.025-0.39-1.415,0.002L21.44,8.021C21.049,8.412,21.049,9.045,21.44,9.436zM23.263,12.16c0.158,0.385,0.531,0.617,0.923,0.617c0.127,0,0.257-0.025,0.383-0.078l4.48-1.857c0.511-0.211,0.753-0.797,0.541-1.307s-0.796-0.752-1.307-0.54l-4.481,1.857C23.292,11.064,23.051,11.65,23.263,12.16zM29.752,14.371l-4.851,0.001c-0.552,0-1,0.448-0.998,1.001c0,0.553,0.447,0.999,0.998,0.999l4.852-0.002c0.553,0,0.999-0.449,0.999-1C30.752,14.817,30.304,14.369,29.752,14.371zM29.054,19.899l-4.482-1.854c-0.512-0.212-1.097,0.03-1.307,0.541c-0.211,0.511,0.031,1.096,0.541,1.308l4.482,1.854c0.126,0.051,0.256,0.075,0.383,0.075c0.393,0,0.765-0.232,0.925-0.617C29.806,20.695,29.563,20.109,29.054,19.899zM22.86,21.312c-0.391-0.391-1.023-0.391-1.414,0.001c-0.391,0.39-0.39,1.022,0,1.413l3.434,3.429c0.195,0.195,0.45,0.293,0.706,0.293s0.513-0.098,0.708-0.293c0.391-0.392,0.389-1.025,0-1.415L22.86,21.312zM20.029,23.675c-0.211-0.511-0.796-0.752-1.307-0.541c-0.51,0.212-0.752,0.797-0.54,1.308l1.86,4.48c0.159,0.385,0.531,0.617,0.925,0.617c0.128,0,0.258-0.024,0.383-0.076c0.511-0.211,0.752-0.797,0.54-1.309L20.029,23.675zM15.512,23.778c-0.553,0-1,0.448-1,1l0.004,4.851c0,0.553,0.449,0.999,1,0.999c0.553,0,1-0.448,0.998-1l-0.003-4.852C16.511,24.226,16.062,23.777,15.512,23.778zM12.296,23.142c-0.51-0.21-1.094,0.031-1.306,0.543l-1.852,4.483c-0.21,0.511,0.033,1.096,0.543,1.307c0.125,0.052,0.254,0.076,0.382,0.076c0.392,0,0.765-0.234,0.924-0.619l1.853-4.485C13.051,23.937,12.807,23.353,12.296,23.142zM9.57,21.325c-0.392-0.391-1.025-0.389-1.415,0.002L4.729,24.76c-0.391,0.392-0.389,1.023,0.002,1.415c0.195,0.194,0.45,0.292,0.706,0.292c0.257,0,0.513-0.098,0.708-0.293l3.427-3.434C9.961,22.349,9.961,21.716,9.57,21.325zM7.746,18.604c-0.213-0.509-0.797-0.751-1.307-0.54L1.96,19.925c-0.511,0.212-0.752,0.798-0.54,1.308c0.16,0.385,0.531,0.616,0.924,0.616c0.127,0,0.258-0.024,0.383-0.076l4.479-1.861C7.715,19.698,7.957,19.113,7.746,18.604zM7.1,15.392c0-0.553-0.447-0.999-1-0.999l-4.851,0.006c-0.553,0-1.001,0.448-0.999,1.001c0.001,0.551,0.449,1,1,0.998l4.852-0.006C6.654,16.392,7.102,15.942,7.1,15.392zM1.944,10.869l4.485,1.85c0.125,0.053,0.254,0.076,0.381,0.076c0.393,0,0.766-0.232,0.925-0.618c0.212-0.511-0.032-1.097-0.544-1.306L2.708,9.021c-0.511-0.21-1.095,0.032-1.306,0.542C1.19,10.074,1.435,10.657,1.944,10.869zM8.137,9.451c0.195,0.193,0.449,0.291,0.705,0.291s0.513-0.098,0.709-0.295c0.391-0.389,0.389-1.023-0.004-1.414L6.113,4.609C5.723,4.219,5.088,4.221,4.699,4.612c-0.391,0.39-0.389,1.024,0.002,1.414L8.137,9.451zM10.964,7.084c0.16,0.384,0.532,0.615,0.923,0.615c0.128,0,0.258-0.025,0.384-0.077c0.51-0.212,0.753-0.798,0.54-1.307l-1.864-4.479c-0.212-0.51-0.798-0.751-1.308-0.539C9.129,1.51,8.888,2.096,9.1,2.605L10.964,7.084z",
    undo : "M12.981,9.073V6.817l-12.106,6.99l12.106,6.99v-2.422c3.285-0.002,9.052,0.28,9.052,2.269c0,2.78-6.023,4.263-6.023,4.263v2.132c0,0,13.53,0.463,13.53-9.823C29.54,9.134,17.952,8.831,12.981,9.073z",
    detour : "M29.342,15.5l-7.556-4.363v2.614H18.75c-1.441-0.004-2.423,1.002-2.875,1.784c-0.735,1.222-1.056,2.561-1.441,3.522c-0.135,0.361-0.278,0.655-0.376,0.817c-1.626,0-0.998,0-2.768,0c-0.213-0.398-0.571-1.557-0.923-2.692c-0.237-0.676-0.5-1.381-1.013-2.071C8.878,14.43,7.89,13.726,6.75,13.75H2.812v3.499c0,0,0.358,0,1.031,0h2.741c0.008,0.013,0.018,0.028,0.029,0.046c0.291,0.401,0.634,1.663,1.031,2.888c0.218,0.623,0.455,1.262,0.92,1.897c0.417,0.614,1.319,1.293,2.383,1.293H11c2.25,0,1.249,0,3.374,0c0.696,0.01,1.371-0.286,1.809-0.657c1.439-1.338,1.608-2.886,2.13-4.127c0.218-0.608,0.453-1.115,0.605-1.314c0.006-0.01,0.012-0.018,0.018-0.025h2.85v2.614L29.342,15.5zM10.173,14.539c0.568,0.76,0.874,1.559,1.137,2.311c0.04,0.128,0.082,0.264,0.125,0.399h2.58c0.246-0.697,0.553-1.479,1.005-2.228c0.252-0.438,0.621-0.887,1.08-1.272H9.43C9.735,14.003,9.99,14.277,10.173,14.539z",
    merge : "M29.342,15.5l-7.556-4.363v2.613h-1.411c-0.788-0.01-1.331-0.241-2.019-0.743c-1.021-0.745-2.094-2.181-3.551-3.568C13.367,8.06,11.291,6.73,8.5,6.749H2.812v3.5H8.5c2.231,0.012,3.441,1.185,5.07,2.934c0.697,0.753,1.428,1.58,2.324,2.323c-1.396,1.165-2.412,2.516-3.484,3.501c-1.183,1.081-2.202,1.723-3.912,1.741H2.813v3.5h5.716c3.752,0.001,6.035-2.319,7.619-4.066c0.817-0.895,1.537-1.691,2.209-2.191c0.686-0.502,1.23-0.732,2.017-0.742h1.412v2.614L29.342,15.5z",
    split : "M21.786,20.698c-1.792-0.237-2.912-1.331-4.358-2.886c-0.697-0.751-1.428-1.577-2.324-2.319c1.396-1.165,2.411-2.519,3.483-3.503c1.01-0.92,1.901-1.519,3.199-1.688v2.574l7.556-4.363L21.786,4.15v2.652c-3.34,0.266-5.45,2.378-6.934,4.013c-0.819,0.896-1.537,1.692-2.212,2.192c-0.685,0.501-1.227,0.731-2.013,0.742c-0.001,0-0.002,0-0.003,0H2.812v3.5h0.001v0.001c0,0,0.046-0.001,0.136-0.001h7.677c0.786,0.011,1.33,0.241,2.017,0.743c1.021,0.743,2.095,2.181,3.552,3.568c1.312,1.258,3.162,2.46,5.592,2.649v2.664l7.556-4.36l-7.556-4.361V20.698z",
    fork : "M13.741,10.249h8.045v2.627l7.556-4.363l-7.556-4.363v2.598H9.826C11.369,7.612,12.616,8.922,13.741,10.249zM21.786,20.654c-0.618-0.195-1.407-0.703-2.291-1.587c-1.79-1.756-3.712-4.675-5.731-7.227c-2.049-2.486-4.159-4.972-7.451-5.091h-3.5v3.5h3.5c0.656-0.027,1.683,0.486,2.879,1.683c1.788,1.753,3.712,4.674,5.731,7.226c1.921,2.331,3.907,4.639,6.863,5.016v2.702l7.556-4.362l-7.556-4.362V20.654z",
    fork_alt : "M21.786,12.873l7.556-4.361l-7.556-4.362v2.701c-2.929,0.374-4.905,2.64-6.809,4.952c0.545,0.703,1.08,1.418,1.604,2.127c0.192,0.26,0.383,0.514,0.573,0.77c0.802-1.043,1.584-1.999,2.341-2.74c0.884-0.885,1.673-1.393,2.291-1.588V12.873zM17.661,17.006c-1.893-2.371-3.815-5.354-6.009-7.537c-1.461-1.428-3.155-2.664-5.34-2.693h-3.5v3.5h3.5c0.971-0.119,2.845,1.333,4.712,3.771c1.895,2.371,3.815,5.354,6.011,7.537c1.326,1.297,2.847,2.426,4.751,2.645v2.646l7.556-4.363l-7.556-4.362v2.535C20.746,20.346,19.205,19.022,17.661,17.006z",
    exchange : "M21.786,12.876l7.556-4.363l-7.556-4.363v2.598H2.813v3.5h18.973V12.876zM10.368,18.124l-7.556,4.362l7.556,4.362V24.25h18.974v-3.501H10.368V18.124z",
    shuffle : "M21.786,20.654c-0.618-0.195-1.407-0.703-2.291-1.587c-0.757-0.742-1.539-1.698-2.34-2.741c-0.191,0.256-0.382,0.51-0.574,0.77c-0.524,0.709-1.059,1.424-1.604,2.127c1.904,2.31,3.88,4.578,6.809,4.952v2.701l7.556-4.362l-7.556-4.362V20.654zM9.192,11.933c0.756,0.741,1.538,1.697,2.339,2.739c0.195-0.262,0.39-0.521,0.587-0.788c0.52-0.703,1.051-1.412,1.592-2.11c-2.032-2.463-4.133-4.907-7.396-5.025h-3.5v3.5h3.5C6.969,10.223,7.996,10.735,9.192,11.933zM21.786,10.341v2.535l7.556-4.363l-7.556-4.363v2.647c-1.904,0.219-3.425,1.348-4.751,2.644c-2.196,2.183-4.116,5.167-6.011,7.538c-1.867,2.438-3.741,3.888-4.712,3.771h-3.5v3.5h3.5c2.185-0.029,3.879-1.266,5.34-2.693c2.194-2.184,4.116-5.167,6.009-7.538C19.205,12.003,20.746,10.679,21.786,10.341z",
    refresh : "M24.083,15.5c-0.009,4.739-3.844,8.574-8.583,8.583c-4.741-0.009-8.577-3.844-8.585-8.583c0.008-4.741,3.844-8.577,8.585-8.585c1.913,0,3.665,0.629,5.09,1.686l-1.782,1.783l8.429,2.256l-2.26-8.427l-1.89,1.89c-2.072-1.677-4.717-2.688-7.587-2.688C8.826,3.418,3.418,8.826,3.416,15.5C3.418,22.175,8.826,27.583,15.5,27.583S27.583,22.175,27.583,15.5H24.083z",
    ccw : "M24.249,15.499c-0.009,4.832-3.918,8.741-8.75,8.75c-2.515,0-4.768-1.064-6.365-2.763l2.068-1.442l-7.901-3.703l0.744,8.694l2.193-1.529c2.244,2.594,5.562,4.242,9.26,4.242c6.767,0,12.249-5.482,12.249-12.249H24.249zM15.499,6.75c2.516,0,4.769,1.065,6.367,2.764l-2.068,1.443l7.901,3.701l-0.746-8.693l-2.192,1.529c-2.245-2.594-5.562-4.245-9.262-4.245C8.734,3.25,3.25,8.734,3.249,15.499H6.75C6.758,10.668,10.668,6.758,15.499,6.75z",
    acw : "M19.275,3.849l1.695,8.56l1.875-1.642c2.311,3.59,1.72,8.415-1.584,11.317c-2.24,1.96-5.186,2.57-7.875,1.908l-0.84,3.396c3.75,0.931,7.891,0.066,11.02-2.672c4.768-4.173,5.521-11.219,1.94-16.279l2.028-1.775L19.275,3.849zM8.154,20.232c-2.312-3.589-1.721-8.416,1.582-11.317c2.239-1.959,5.186-2.572,7.875-1.909l0.842-3.398c-3.752-0.93-7.893-0.067-11.022,2.672c-4.765,4.174-5.519,11.223-1.939,16.283l-2.026,1.772l8.26,2.812l-1.693-8.559L8.154,20.232z",
    contract : "M25.083,18.895l-8.428-2.259l2.258,8.428l1.838-1.837l7.053,7.053l2.476-2.476l-7.053-7.053L25.083,18.895zM5.542,11.731l8.428,2.258l-2.258-8.428L9.874,7.398L3.196,0.72L0.72,3.196l6.678,6.678L5.542,11.731zM7.589,20.935l-6.87,6.869l2.476,2.476l6.869-6.869l1.858,1.857l2.258-8.428l-8.428,2.258L7.589,20.935zM23.412,10.064l6.867-6.87l-2.476-2.476l-6.868,6.869l-1.856-1.856l-2.258,8.428l8.428-2.259L23.412,10.064z",
    expand : "M25.545,23.328,17.918,15.623,25.534,8.007,27.391,9.864,29.649,1.436,21.222,3.694,23.058,5.53,15.455,13.134,7.942,5.543,9.809,3.696,1.393,1.394,3.608,9.833,5.456,8.005,12.98,15.608,5.465,23.123,3.609,21.268,1.351,29.695,9.779,27.438,7.941,25.6,15.443,18.098,23.057,25.791,21.19,27.638,29.606,29.939,27.393,21.5z",
    stop : "M5.5,5.5h20v20h-20z",
    end : "M21.167,5.5,21.167,13.681,6.684,5.318,6.684,25.682,21.167,17.318,21.167,25.5,25.5,25.5,25.5,5.5z",
    start : "M24.316,5.318,9.833,13.682,9.833,5.5,5.5,5.5,5.5,25.5,9.833,25.5,9.833,17.318,24.316,25.682z",
    ff : "M25.5,15.5,15.2,9.552,15.2,15.153,5.5,9.552,5.5,21.447,15.2,15.847,15.2,21.447z",
    rw : "M5.5,15.499,15.8,21.447,15.8,15.846,25.5,21.447,25.5,9.552,15.8,15.152,15.8,9.552z",
    play : "M6.684,25.682L24.316,15.5L6.684,5.318V25.682z",
    arrowright : "M11.166,23.963L22.359,17.5c1.43-0.824,1.43-2.175,0-3L11.166,8.037c-1.429-0.826-2.598-0.15-2.598,1.5v12.926C8.568,24.113,9.737,24.789,11.166,23.963z",
    arrowleft : "M20.834,8.037L9.641,14.5c-1.43,0.824-1.43,2.175,0,3l11.193,6.463c1.429,0.826,2.598,0.15,2.598-1.5V9.537C23.432,7.887,22.263,7.211,20.834,8.037z",
    arrowup : "M23.963,20.834L17.5,9.64c-0.825-1.429-2.175-1.429-3,0L8.037,20.834c-0.825,1.429-0.15,2.598,1.5,2.598h12.926C24.113,23.432,24.788,22.263,23.963,20.834z",
    arrowdown : "M8.037,11.166L14.5,22.359c0.825,1.43,2.175,1.43,3,0l6.463-11.194c0.826-1.429,0.15-2.598-1.5-2.598H9.537C7.886,8.568,7.211,9.737,8.037,11.166z",
    arrowleft2 : "M21.871,9.814 15.684,16.001 21.871,22.188 18.335,25.725 8.612,16.001 18.335,6.276z",
    arrowright2 : "M10.129,22.186 16.316,15.999 10.129,9.812 13.665,6.276 23.389,15.999 13.665,25.725z",
    smile2 : "M16,1.466C7.973,1.466,1.466,7.973,1.466,16c0,8.027,6.507,14.534,14.534,14.534c8.027,0,14.534-6.507,14.534-14.534C30.534,7.973,24.027,1.466,16,1.466zM16,29.534C8.539,29.534,2.466,23.462,2.466,16C2.466,8.539,8.539,2.466,16,2.466c7.462,0,13.535,6.072,13.535,13.533C29.534,23.462,23.462,29.534,16,29.534zM11.104,14c0.932,0,1.688-1.483,1.688-3.312s-0.755-3.312-1.688-3.312s-1.688,1.483-1.688,3.312S10.172,14,11.104,14zM20.729,14c0.934,0,1.688-1.483,1.688-3.312s-0.756-3.312-1.688-3.312c-0.932,0-1.688,1.483-1.688,3.312S19.798,14,20.729,14zM8.143,21.189C10.458,24.243,13.148,26,16.021,26c2.969,0,5.745-1.868,8.11-5.109c-2.515,1.754-5.292,2.734-8.215,2.734C13.164,23.625,10.54,22.756,8.143,21.189z",
    smile : "M16,1.466C7.973,1.466,1.466,7.973,1.466,16c0,8.027,6.507,14.534,14.534,14.534c8.027,0,14.534-6.507,14.534-14.534C30.534,7.973,24.027,1.466,16,1.466zM20.729,7.375c0.934,0,1.688,1.483,1.688,3.312S21.661,14,20.729,14c-0.932,0-1.688-1.483-1.688-3.312S19.798,7.375,20.729,7.375zM11.104,7.375c0.932,0,1.688,1.483,1.688,3.312S12.037,14,11.104,14s-1.688-1.483-1.688-3.312S10.172,7.375,11.104,7.375zM16.021,26c-2.873,0-5.563-1.757-7.879-4.811c2.397,1.564,5.021,2.436,7.774,2.436c2.923,0,5.701-0.98,8.215-2.734C21.766,24.132,18.99,26,16.021,26z",
    alarm : "M8.179,20.115c-0.478,0.277-0.642,0.889-0.365,1.366c0.275,0.479,0.889,0.642,1.365,0.366c0.479-0.275,0.643-0.888,0.367-1.367C9.27,20.004,8.658,19.84,8.179,20.115zM9.18,12.239c-0.479-0.276-1.09-0.112-1.366,0.366s-0.111,1.09,0.365,1.366c0.479,0.276,1.09,0.113,1.367-0.366C9.821,13.126,9.657,12.516,9.18,12.239zM8.625,17.043c-0.001-0.552-0.448-0.999-1.001-1c-0.553,0-1,0.448-1,1c0,0.553,0.449,1,1,1C8.176,18.043,8.624,17.596,8.625,17.043zM16.312,3.957V3.031h1c0.275,0,0.5-0.225,0.5-0.5v-0.5c0-0.275-0.225-0.5-0.5-0.5h-3.625c-0.275,0-0.5,0.225-0.5,0.5v0.5c0,0.275,0.225,0.5,0.5,0.5h1v0.926C7.819,4.381,2.376,10.068,2.374,17.042C2.376,24.291,8.251,30.166,15.5,30.169c7.249-0.003,13.124-5.878,13.125-13.127C28.624,10.067,23.181,4.38,16.312,3.957zM15.5,27.166C9.909,27.157,5.385,22.633,5.375,17.042C5.385,11.451,9.909,6.927,15.5,6.917c5.59,0.01,10.115,4.535,10.124,10.125C25.615,22.633,21.091,27.157,15.5,27.166zM12.062,22.998c-0.478-0.275-1.089-0.111-1.366,0.367c-0.275,0.479-0.111,1.09,0.366,1.365c0.478,0.277,1.091,0.111,1.365-0.365C12.704,23.887,12.54,23.275,12.062,22.998zM12.062,11.088c0.479-0.276,0.642-0.888,0.366-1.366c-0.276-0.478-0.888-0.642-1.366-0.366s-0.642,0.888-0.366,1.366C10.973,11.2,11.584,11.364,12.062,11.088zM22.822,13.971c0.478-0.275,0.643-0.888,0.366-1.366c-0.275-0.478-0.89-0.642-1.366-0.366c-0.479,0.278-0.642,0.89-0.366,1.367C21.732,14.083,22.344,14.247,22.822,13.971zM15.501,23.92c-0.552,0-1,0.447-1,1c0,0.552,0.448,1,1,1s1-0.448,1-1C16.501,24.367,16.053,23.92,15.501,23.92zM19.938,9.355c-0.477-0.276-1.091-0.111-1.365,0.366c-0.275,0.48-0.111,1.091,0.366,1.367s1.089,0.112,1.366-0.366C20.581,10.245,20.418,9.632,19.938,9.355zM23.378,16.042c-0.554,0.002-1.001,0.45-1.001,1c0.001,0.552,0.448,1,1.001,1c0.551,0,1-0.447,1-1C24.378,16.492,23.929,16.042,23.378,16.042zM22.823,20.115c-0.48-0.275-1.092-0.111-1.367,0.365c-0.275,0.479-0.112,1.091,0.367,1.367c0.477,0.275,1.089,0.112,1.365-0.366C23.464,21.004,23.3,20.391,22.823,20.115zM15.501,8.167c-0.552,0-1,0.448-1,1l-0.466,7.343l-3.004,1.96c-0.478,0.277-0.642,0.889-0.365,1.366c0.275,0.479,0.889,0.642,1.365,0.366l3.305-1.676c0.055,0.006,0.109,0.017,0.166,0.017c0.828,0,1.5-0.672,1.5-1.5l-0.5-7.876C16.501,8.614,16.053,8.167,15.501,8.167zM18.939,22.998c-0.479,0.276-0.643,0.888-0.366,1.367c0.275,0.477,0.888,0.642,1.366,0.365c0.478-0.276,0.642-0.889,0.366-1.365C20.028,22.886,19.417,22.723,18.939,22.998zM11.197,3.593c-0.836-1.04-2.103-1.718-3.541-1.718c-2.52,0-4.562,2.042-4.562,4.562c0,0.957,0.297,1.843,0.8,2.576C5.649,6.484,8.206,4.553,11.197,3.593zM27.106,9.014c0.503-0.733,0.8-1.619,0.8-2.576c0-2.52-2.043-4.562-4.562-4.562c-1.438,0-2.704,0.678-3.541,1.717C22.794,4.553,25.351,6.484,27.106,9.014z",
    clock : "M15.5,2.374C8.251,2.375,2.376,8.251,2.374,15.5C2.376,22.748,8.251,28.623,15.5,28.627c7.249-0.004,13.124-5.879,13.125-13.127C28.624,8.251,22.749,2.375,15.5,2.374zM15.5,25.623C9.909,25.615,5.385,21.09,5.375,15.5C5.385,9.909,9.909,5.384,15.5,5.374c5.59,0.01,10.115,4.535,10.124,10.125C25.615,21.09,21.091,25.615,15.5,25.623zM8.625,15.5c-0.001-0.552-0.448-0.999-1.001-1c-0.553,0-1,0.448-1,1c0,0.553,0.449,1,1,1C8.176,16.5,8.624,16.053,8.625,15.5zM8.179,18.572c-0.478,0.277-0.642,0.889-0.365,1.367c0.275,0.479,0.889,0.641,1.365,0.365c0.479-0.275,0.643-0.887,0.367-1.367C9.27,18.461,8.658,18.297,8.179,18.572zM9.18,10.696c-0.479-0.276-1.09-0.112-1.366,0.366s-0.111,1.09,0.365,1.366c0.479,0.276,1.09,0.113,1.367-0.366C9.821,11.584,9.657,10.973,9.18,10.696zM22.822,12.428c0.478-0.275,0.643-0.888,0.366-1.366c-0.275-0.478-0.89-0.642-1.366-0.366c-0.479,0.278-0.642,0.89-0.366,1.367C21.732,12.54,22.344,12.705,22.822,12.428zM12.062,21.455c-0.478-0.275-1.089-0.111-1.366,0.367c-0.275,0.479-0.111,1.09,0.366,1.365c0.478,0.277,1.091,0.111,1.365-0.365C12.704,22.344,12.54,21.732,12.062,21.455zM12.062,9.545c0.479-0.276,0.642-0.888,0.366-1.366c-0.276-0.478-0.888-0.642-1.366-0.366s-0.642,0.888-0.366,1.366C10.973,9.658,11.584,9.822,12.062,9.545zM22.823,18.572c-0.48-0.275-1.092-0.111-1.367,0.365c-0.275,0.479-0.112,1.092,0.367,1.367c0.477,0.275,1.089,0.113,1.365-0.365C23.464,19.461,23.3,18.848,22.823,18.572zM19.938,7.813c-0.477-0.276-1.091-0.111-1.365,0.366c-0.275,0.48-0.111,1.091,0.366,1.367s1.089,0.112,1.366-0.366C20.581,8.702,20.418,8.089,19.938,7.813zM23.378,14.5c-0.554,0.002-1.001,0.45-1.001,1c0.001,0.552,0.448,1,1.001,1c0.551,0,1-0.447,1-1C24.378,14.949,23.929,14.5,23.378,14.5zM15.501,6.624c-0.552,0-1,0.448-1,1l-0.466,7.343l-3.004,1.96c-0.478,0.277-0.642,0.889-0.365,1.365c0.275,0.479,0.889,0.643,1.365,0.367l3.305-1.676C15.39,16.99,15.444,17,15.501,17c0.828,0,1.5-0.671,1.5-1.5l-0.5-7.876C16.501,7.072,16.053,6.624,15.501,6.624zM15.501,22.377c-0.552,0-1,0.447-1,1s0.448,1,1,1s1-0.447,1-1S16.053,22.377,15.501,22.377zM18.939,21.455c-0.479,0.277-0.643,0.889-0.366,1.367c0.275,0.477,0.888,0.643,1.366,0.365c0.478-0.275,0.642-0.889,0.366-1.365C20.028,21.344,19.417,21.18,18.939,21.455z",
    stopwatch : "M27.216,18.533c0-3.636-1.655-6.883-4.253-9.032l0.733-0.998l0.482,0.354c0.198,0.146,0.481,0.104,0.628-0.097l0.442-0.604c0.146-0.198,0.103-0.482-0.097-0.628l-2.052-1.506c-0.199-0.146-0.481-0.103-0.628,0.097L22.03,6.724c-0.146,0.199-0.104,0.482,0.096,0.628l0.483,0.354l-0.736,1.003c-1.28-0.834-2.734-1.419-4.296-1.699c0.847-0.635,1.402-1.638,1.403-2.778h-0.002c0-1.922-1.557-3.48-3.479-3.48c-1.925,0-3.48,1.559-3.48,3.48c0,1.141,0.556,2.144,1.401,2.778c-1.549,0.277-2.99,0.857-4.265,1.68L8.424,7.684l0.484-0.353c0.198-0.145,0.245-0.428,0.098-0.628l-0.44-0.604C8.42,5.899,8.136,5.855,7.937,6.001L5.881,7.5c-0.2,0.146-0.243,0.428-0.099,0.628l0.442,0.604c0.145,0.2,0.428,0.244,0.627,0.099l0.483-0.354l0.729,0.999c-2.615,2.149-4.282,5.407-4.282,9.057c0,6.471,5.245,11.716,11.718,11.716c6.47,0,11.716-5.243,11.718-11.716H27.216zM12.918,4.231c0.002-1.425,1.155-2.58,2.582-2.582c1.426,0.002,2.579,1.157,2.581,2.582c-0.002,1.192-0.812,2.184-1.908,2.482v-1.77h0.6c0.246,0,0.449-0.203,0.449-0.449V3.746c0-0.247-0.203-0.449-0.449-0.449h-2.545c-0.247,0-0.449,0.202-0.449,0.449v0.749c0,0.246,0.202,0.449,0.449,0.449h0.599v1.77C13.729,6.415,12.919,5.424,12.918,4.231zM15.5,27.554c-4.983-0.008-9.015-4.038-9.022-9.021c0.008-4.982,4.039-9.013,9.022-9.022c4.981,0.01,9.013,4.04,9.021,9.022C24.513,23.514,20.481,27.546,15.5,27.554zM15.5,12.138c0.476,0,0.861-0.385,0.861-0.86s-0.386-0.861-0.861-0.861s-0.861,0.386-0.861,0.861S15.024,12.138,15.5,12.138zM15.5,24.927c-0.476,0-0.861,0.386-0.861,0.861s0.386,0.861,0.861,0.861s0.861-0.386,0.861-0.861S15.976,24.927,15.5,24.927zM12.618,11.818c-0.237-0.412-0.764-0.553-1.176-0.315c-0.412,0.238-0.554,0.765-0.315,1.177l2.867,6.722c0.481,0.831,1.543,1.116,2.375,0.637c0.829-0.479,1.114-1.543,0.635-2.374L12.618,11.818zM18.698,24.07c-0.412,0.237-0.555,0.765-0.316,1.176c0.237,0.412,0.764,0.554,1.176,0.315c0.413-0.238,0.553-0.765,0.316-1.176C19.635,23.974,19.108,23.832,18.698,24.07zM8.787,15.65c0.412,0.238,0.938,0.097,1.176-0.315c0.237-0.413,0.097-0.938-0.314-1.176c-0.412-0.239-0.938-0.098-1.177,0.313C8.234,14.886,8.375,15.412,8.787,15.65zM22.215,21.413c-0.412-0.236-0.938-0.096-1.176,0.316c-0.238,0.412-0.099,0.938,0.314,1.176c0.41,0.238,0.937,0.098,1.176-0.314C22.768,22.178,22.625,21.652,22.215,21.413zM9.107,18.531c-0.002-0.476-0.387-0.86-0.861-0.86c-0.477,0-0.862,0.385-0.862,0.86c0.001,0.476,0.386,0.86,0.861,0.861C8.722,19.393,9.106,19.008,9.107,18.531zM21.896,18.531c0,0.477,0.384,0.862,0.859,0.86c0.476,0.002,0.862-0.382,0.862-0.859s-0.387-0.86-0.862-0.862C22.279,17.671,21.896,18.056,21.896,18.531zM8.787,21.413c-0.412,0.238-0.554,0.765-0.316,1.176c0.239,0.412,0.765,0.553,1.177,0.316c0.413-0.239,0.553-0.765,0.315-1.178C9.725,21.317,9.198,21.176,8.787,21.413zM21.352,14.157c-0.411,0.238-0.551,0.764-0.312,1.176c0.237,0.413,0.764,0.555,1.174,0.315c0.412-0.236,0.555-0.762,0.316-1.176C22.29,14.06,21.766,13.921,21.352,14.157zM12.304,24.067c-0.413-0.235-0.939-0.096-1.176,0.315c-0.238,0.413-0.098,0.939,0.312,1.178c0.413,0.236,0.939,0.096,1.178-0.315C12.857,24.832,12.715,24.308,12.304,24.067zM18.698,12.992c0.41,0.238,0.938,0.099,1.174-0.313c0.238-0.411,0.1-0.938-0.314-1.177c-0.414-0.238-0.937-0.097-1.177,0.315C18.144,12.229,18.286,12.755,18.698,12.992z",
    history : "M10.666,18.292c0.275,0.479,0.889,0.644,1.365,0.367l3.305-1.677C15.39,16.99,15.444,17,15.501,17c0.828,0,1.5-0.671,1.5-1.5l-0.5-7.876c0-0.552-0.448-1-1-1c-0.552,0-1,0.448-1,1l-0.466,7.343l-3.004,1.96C10.553,17.204,10.389,17.816,10.666,18.292zM12.062,9.545c0.479-0.276,0.642-0.888,0.366-1.366c-0.276-0.478-0.888-0.642-1.366-0.366s-0.642,0.888-0.366,1.366C10.973,9.658,11.584,9.822,12.062,9.545zM8.179,18.572c-0.478,0.277-0.642,0.889-0.365,1.367c0.275,0.479,0.889,0.641,1.365,0.365c0.479-0.275,0.643-0.888,0.367-1.367C9.27,18.461,8.658,18.297,8.179,18.572zM9.18,10.696c-0.479-0.276-1.09-0.112-1.366,0.366s-0.111,1.09,0.365,1.366c0.479,0.276,1.09,0.113,1.367-0.366C9.821,11.584,9.657,10.973,9.18,10.696zM6.624,15.5c0,0.553,0.449,1,1,1c0.552,0,1-0.447,1.001-1c-0.001-0.552-0.448-0.999-1.001-1C7.071,14.5,6.624,14.948,6.624,15.5zM14.501,23.377c0,0.553,0.448,1,1,1c0.552,0,1-0.447,1-1s-0.448-1-1-1C14.949,22.377,14.501,22.824,14.501,23.377zM10.696,21.822c-0.275,0.479-0.111,1.09,0.366,1.365c0.478,0.276,1.091,0.11,1.365-0.365c0.277-0.479,0.113-1.09-0.365-1.367C11.584,21.18,10.973,21.344,10.696,21.822zM21.822,10.696c-0.479,0.278-0.643,0.89-0.366,1.367s0.888,0.642,1.366,0.365c0.478-0.275,0.643-0.888,0.365-1.366C22.913,10.584,22.298,10.42,21.822,10.696zM21.456,18.938c-0.274,0.479-0.112,1.092,0.367,1.367c0.477,0.274,1.089,0.112,1.364-0.365c0.276-0.479,0.112-1.092-0.364-1.367C22.343,18.297,21.73,18.461,21.456,18.938zM24.378,15.5c0-0.551-0.448-1-1-1c-0.554,0.002-1.001,0.45-1.001,1c0.001,0.552,0.448,1,1.001,1C23.93,16.5,24.378,16.053,24.378,15.5zM18.573,22.822c0.274,0.477,0.888,0.643,1.366,0.365c0.478-0.275,0.642-0.89,0.365-1.365c-0.277-0.479-0.888-0.643-1.365-0.367C18.46,21.732,18.296,22.344,18.573,22.822zM18.939,9.546c0.477,0.276,1.088,0.112,1.365-0.366c0.276-0.478,0.113-1.091-0.367-1.367c-0.477-0.276-1.09-0.111-1.364,0.366C18.298,8.659,18.462,9.27,18.939,9.546zM28.703,14.364C28.074,7.072,21.654,1.67,14.364,2.295c-3.254,0.281-6.118,1.726-8.25,3.877L4.341,4.681l-1.309,7.364l7.031-2.548L8.427,8.12c1.627-1.567,3.767-2.621,6.194-2.833c5.64-0.477,10.595,3.694,11.089,9.335c0.477,5.64-3.693,10.595-9.333,11.09c-5.643,0.476-10.599-3.694-11.092-9.333c-0.102-1.204,0.019-2.373,0.31-3.478l-3.27,1.186c-0.089,0.832-0.106,1.684-0.031,2.55c0.629,7.29,7.048,12.691,14.341,12.066C23.926,28.074,29.328,21.655,28.703,14.364z",
    future : "M17.001,15.5l-0.5-7.876c0-0.552-0.448-1-1-1c-0.552,0-1,0.448-1,1l-0.466,7.343l-3.004,1.96c-0.478,0.277-0.642,0.89-0.365,1.365c0.275,0.479,0.889,0.644,1.365,0.367l3.305-1.677C15.39,16.99,15.444,17,15.501,17C16.329,17,17.001,16.329,17.001,15.5zM18.939,21.455c-0.479,0.277-0.644,0.889-0.366,1.367c0.274,0.477,0.888,0.643,1.366,0.365c0.478-0.275,0.642-0.89,0.365-1.365C20.027,21.344,19.417,21.18,18.939,21.455zM19.938,7.813c-0.477-0.276-1.09-0.111-1.364,0.366c-0.275,0.48-0.111,1.091,0.366,1.367c0.477,0.276,1.088,0.112,1.365-0.366C20.581,8.702,20.418,8.089,19.938,7.813zM21.823,20.305c0.477,0.274,1.089,0.112,1.364-0.365c0.276-0.479,0.112-1.092-0.364-1.367c-0.48-0.275-1.093-0.111-1.367,0.365C21.182,19.416,21.344,20.029,21.823,20.305zM22.822,12.428c0.478-0.275,0.643-0.888,0.365-1.366c-0.274-0.478-0.89-0.642-1.365-0.366c-0.479,0.278-0.643,0.89-0.366,1.367S22.344,12.705,22.822,12.428zM24.378,15.5c0-0.551-0.448-1-1-1c-0.554,0.002-1.001,0.45-1.001,1c0.001,0.552,0.448,1,1.001,1C23.93,16.5,24.378,16.053,24.378,15.5zM9.546,12.062c0.275-0.478,0.111-1.089-0.366-1.366c-0.479-0.276-1.09-0.112-1.366,0.366s-0.111,1.09,0.365,1.366C8.658,12.704,9.269,12.541,9.546,12.062zM6.624,15.5c0,0.553,0.449,1,1,1c0.552,0,1-0.447,1.001-1c-0.001-0.552-0.448-0.999-1.001-1C7.071,14.5,6.624,14.948,6.624,15.5zM9.179,20.305c0.479-0.275,0.643-0.888,0.367-1.367c-0.276-0.477-0.888-0.641-1.367-0.365c-0.478,0.277-0.642,0.889-0.365,1.367C8.089,20.418,8.703,20.58,9.179,20.305zM12.062,9.545c0.479-0.276,0.642-0.888,0.366-1.366c-0.276-0.478-0.888-0.642-1.366-0.366s-0.642,0.888-0.366,1.366C10.973,9.658,11.584,9.822,12.062,9.545zM14.501,23.377c0,0.553,0.448,1,1,1c0.552,0,1-0.447,1-1s-0.448-1-1-1C14.949,22.377,14.501,22.824,14.501,23.377zM10.696,21.822c-0.275,0.479-0.111,1.09,0.366,1.365c0.478,0.276,1.091,0.11,1.365-0.365c0.277-0.479,0.113-1.09-0.365-1.367C11.584,21.18,10.973,21.344,10.696,21.822zM28.674,14.087l-3.27-1.186c0.291,1.105,0.41,2.274,0.309,3.478c-0.492,5.639-5.449,9.809-11.091,9.333c-5.639-0.495-9.809-5.45-9.333-11.09c0.494-5.641,5.449-9.812,11.089-9.335c2.428,0.212,4.567,1.266,6.194,2.833l-1.637,1.377l7.031,2.548l-1.309-7.364l-1.771,1.492c-2.133-2.151-4.996-3.597-8.25-3.877C9.346,1.67,2.926,7.072,2.297,14.364c-0.625,7.291,4.777,13.71,12.066,14.339c7.293,0.625,13.713-4.776,14.342-12.066C28.779,15.771,28.762,14.919,28.674,14.087z",
    globeAlt2 : "M16,1.466C7.973,1.466,1.466,7.973,1.466,16c0,8.027,6.507,14.534,14.534,14.534c8.027,0,14.534-6.507,14.534-14.534C30.534,7.973,24.027,1.466,16,1.466zM8.251,7.48c0.122,0.055,0.255,0.104,0.28,0.137C8.57,7.668,8.621,7.823,8.557,7.861C8.492,7.9,8.39,7.887,8.376,7.771c-0.013-0.115-0.026-0.128-0.18-0.18c-0.022-0.007-0.035-0.01-0.051-0.015C8.18,7.544,8.216,7.512,8.251,7.48zM7.733,7.974c0.031,0.087,0.113,0.125,0,0.17C7.673,8.168,7.611,8.172,7.559,8.165C7.617,8.102,7.672,8.035,7.733,7.974zM16,27.533C9.639,27.533,4.466,22.36,4.466,16c0-0.085,0.011-0.168,0.013-0.254c0.004-0.003,0.008-0.006,0.012-0.009c0.129-0.102,0.283-0.359,0.334-0.45c0.052-0.089,0.181-0.154,0.116-0.256c-0.059-0.096-0.292-0.23-0.407-0.261c0.01-0.099,0.032-0.195,0.045-0.294c0.063,0.077,0.137,0.17,0.208,0.194c0.115,0.038,0.501,0.052,0.566,0.052c0.063,0,0.334,0.014,0.386-0.064c0.051-0.077,0.09-0.077,0.154-0.077c0.064,0,0.18,0.231,0.271,0.257c0.089,0.026,0.257,0.013,0.244,0.181c-0.012,0.166,0.077,0.309,0.167,0.321c0.09,0.013,0.296-0.194,0.296-0.194s0,0.322-0.012,0.438C6.846,15.698,7,16.124,7,16.124s0.193,0.397,0.244,0.488c0.052,0.09,0.27,0.36,0.27,0.476c0,0.117,0.026,0.297,0.104,0.297s0.155-0.206,0.244-0.335c0.091-0.128,0.117-0.31,0.155-0.438c0.039-0.129,0.039-0.36,0.039-0.45c0-0.091,0.076-0.168,0.257-0.245c0.181-0.077,0.309-0.296,0.463-0.412c0.155-0.116,0.142-0.309,0.452-0.309c0.308,0,0.282,0,0.36-0.078c0.077-0.077,0.154-0.128,0.192,0.013c0.039,0.142,0.257,0.347,0.296,0.399c0.039,0.052,0.116,0.193,0.104,0.348c-0.013,0.153,0.012,0.334,0.077,0.334c0.064,0,0.193-0.219,0.193-0.219s0.283-0.192,0.27,0.014c-0.014,0.205,0.025,0.425,0.025,0.552c0,0.13,0.232,0.438,0.232,0.362c0-0.079,0.103-0.296,0.103-0.413c0-0.114,0.064-0.063,0.231,0.051c0.167,0.116,0.283,0.349,0.283,0.349s0.168,0.154,0.193,0.219c0.026,0.064,0.206-0.025,0.244-0.104c0.039-0.076,0.065-0.115,0.167-0.141c0.104-0.026,0.231-0.026,0.271-0.168c0.039-0.142,0.154-0.308,0-0.502c-0.154-0.193-0.232-0.321-0.347-0.412c-0.117-0.09-0.206-0.322-0.206-0.322s0.244-0.218,0.321-0.296c0.079-0.077,0.193-0.025,0.207,0.064c0.013,0.091-0.115,0.168-0.141,0.361c-0.026,0.192,0.154,0.257,0.206,0.192c0.051-0.065,0.18-0.219,0.18-0.257c0-0.039-0.089-0.026-0.102-0.167c-0.013-0.142,0.166-0.245,0.23-0.207c0.066,0.039,0.477-0.051,0.67-0.154s0.308-0.322,0.425-0.412c0.116-0.089,0.515-0.386,0.489-0.527c-0.026-0.142,0.012-0.334-0.09-0.515c-0.103-0.18-0.232-0.295-0.283-0.373c-0.051-0.077,0.219-0.09,0.347-0.206c0.129-0.116,0-0.219-0.064-0.206c-0.064,0.013-0.232,0.052-0.296,0.039c-0.064-0.013-0.103-0.077-0.206-0.155c-0.102-0.077,0.026-0.192,0.091-0.179c0.064,0.013,0.23-0.129,0.308-0.193c0.077-0.064,0.193-0.115,0.154-0.051c-0.038,0.064-0.128,0.296-0.026,0.309c0.104,0.013,0.348-0.193,0.388-0.18c0.038,0.013,0.102,0.18,0.064,0.257c-0.039,0.077-0.039,0.206,0.013,0.193c0.051-0.013,0.154-0.129,0.18-0.09c0.027,0.039,0.154,0.116,0.09,0.257c-0.063,0.142-0.193,0.193-0.039,0.284c0.154,0.089,0.206,0.012,0.322-0.052c0.115-0.064,0.193-0.347,0.128-0.438c-0.064-0.09-0.218-0.27-0.218-0.334c0-0.064,0.257-0.064,0.257-0.167s0.09-0.18,0.18-0.219c0.091-0.039,0.206-0.206,0.244-0.154c0.039,0.052,0.271,0.116,0.334,0.039c0.064-0.077,0.4-0.36,0.605-0.515c0.206-0.154,0.283-0.334,0.336-0.515c0.051-0.18,0.128-0.296,0.102-0.437v0c0.077,0.18,0.09,0.309,0.077,0.45c-0.013,0.142,0,0.438,0.026,0.476c0.025,0.039,0.129,0.128,0.192,0.103c0.064-0.025-0.025-0.283-0.025-0.334c0-0.052,0.09-0.129,0.142-0.142c0.052-0.013,0-0.231-0.065-0.322c-0.063-0.09-0.154-0.142-0.102-0.154c0.051-0.013,0.115-0.116,0.077-0.142c-0.039-0.025-0.014-0.116-0.103-0.09c-0.065,0.019-0.241-0.015-0.235,0.095c-0.037-0.11-0.116-0.183-0.216-0.172c-0.116,0.013-0.181,0.077-0.296,0.077s-0.025-0.18-0.077-0.18c-0.051,0-0.168,0.167-0.231,0.077c-0.064-0.09,0.18-0.206,0.373-0.27c0.192-0.064,0.514-0.438,0.644-0.451c0.128-0.013,0.45,0.026,0.733,0.013c0.283-0.013,0.373-0.129,0.463-0.064s0.283,0.142,0.399,0.129c0.116-0.014,0.064,0,0.244-0.129c0.18-0.129,0.348-0.193,0.438-0.296c0.09-0.103,0.335-0.18,0.348-0.077c0.014,0.103-0.026,0.206,0.077,0.206s0.258-0.103,0.386-0.154c0.129-0.051,0.231-0.116,0.231-0.116s-0.527,0.36-0.655,0.438c-0.129,0.077-0.438,0.129-0.567,0.283c-0.128,0.155-0.205,0.206-0.192,0.374c0.014,0.167,0.231,0.386,0.128,0.54c-0.103,0.154-0.141,0.373-0.141,0.373s0.154-0.219,0.373-0.36s0.348-0.334,0.425-0.412s0.309-0.091,0.309-0.181s0.064-0.206,0.104-0.309c0.038-0.103-0.077-0.078,0-0.206c0.076-0.129,0.064-0.232,0.45-0.232s0.257,0.026,0.566,0.013c0.309-0.013,0.424-0.167,0.72-0.245c0.296-0.077,0.527-0.128,0.618-0.089c0.09,0.038,0.232,0.012,0.141-0.078c-0.089-0.09-0.295-0.219-0.193-0.245c0.104-0.026,0.207-0.039,0.246-0.142c0.039-0.103-0.142-0.283-0.039-0.386c0.104-0.103-0.077-0.231-0.207-0.257c-0.128-0.025-0.63,0.026-0.731-0.025c-0.104-0.052-0.271-0.116-0.322-0.078c-0.052,0.039-0.168,0.245-0.168,0.245s-0.09,0.025-0.168-0.09c-0.076-0.116-0.5-0.103-0.629-0.103s-0.271,0.025-0.413,0.039c-0.141,0.013-0.219,0.052-0.322-0.039c-0.102-0.09-0.243-0.129-0.296-0.167c-0.051-0.039-0.334-0.039-0.553-0.012c-0.218,0.025-0.438,0.025-0.438,0.025s-0.104-0.039-0.257-0.129c-0.154-0.09-0.309-0.154-0.361-0.154c-0.051,0-0.449,0.064-0.539,0c-0.091-0.064-0.181-0.103-0.245-0.103s-0.115-0.103-0.038-0.103s0.437-0.103,0.437-0.103s-0.103-0.142-0.231-0.142c-0.128,0-0.359-0.064-0.424-0.064s-0.014,0.064-0.142,0.039c-0.13-0.026-0.258-0.078-0.335-0.026c-0.076,0.051-0.258,0.128-0.064,0.18c0.193,0.052,0.373,0,0.425,0.078c0.052,0.077,0,0.115,0,0.167s-0.103,0.193-0.167,0.219c-0.064,0.025-0.143-0.039-0.27,0.025c-0.129,0.064-0.451,0.013-0.49,0.052c-0.038,0.039-0.115-0.103-0.18-0.077c-0.064,0.025-0.232,0.193-0.322,0.18c-0.089-0.013-0.206-0.103-0.206-0.206s-0.038-0.232-0.077-0.258c-0.038-0.025-0.322-0.039-0.425-0.025c-0.103,0.013-0.424,0.038-0.477,0.09c-0.052,0.052-0.193,0.09-0.283,0.09s-0.167-0.09-0.36-0.116c-0.192-0.026-0.617-0.039-0.669-0.026s-0.218-0.025-0.155-0.077c0.065-0.051,0.257-0.219,0.143-0.295c-0.117-0.078-0.375-0.078-0.489-0.09c-0.117-0.013-0.232-0.039-0.413-0.013c-0.181,0.026-0.219,0.116-0.296,0.039c-0.077-0.077,0.193,0.039-0.077-0.077c-0.27-0.116-0.399-0.103-0.477-0.064c-0.077,0.039,0.013,0.025-0.192,0.103c-0.206,0.078-0.322,0.116-0.374,0.129c-0.051,0.012-0.372-0.065-0.411-0.091c-0.038-0.025-0.181,0.013-0.309,0.064S9.895,7.025,9.767,7C9.638,6.973,9.432,6.973,9.303,7.025C9.174,7.076,9.084,7.076,8.956,7.166c-0.13,0.09-0.373,0.142-0.373,0.142S8.522,7.305,8.448,7.301C10.474,5.541,13.111,4.466,16,4.466c6.361,0,11.534,5.173,11.534,11.534S22.36,27.533,16,27.533zM14.888,19.92c0,0,0.207-0.026,0.207-0.117c0-0.089-0.207-0.205-0.282-0.102c-0.078,0.102-0.219,0.205-0.207,0.296C14.625,20.138,14.888,19.92,14.888,19.92zM14.875,17.023c-0.181,0.233-0.167,0.182-0.296,0.128c-0.128-0.05-0.334,0.116-0.296,0.182c0.039,0.064,0.322-0.014,0.386,0.102c0.065,0.116,0.065,0.129,0.193,0.104c0.128-0.026,0.257-0.205,0.219-0.295C15.043,17.151,14.875,17.023,14.875,17.023zM14.837,18.245c-0.051,0-0.412,0.064-0.451,0.079c-0.039,0.013-0.27-0.025-0.27-0.025c-0.09,0.089-0.026,0.179,0.116,0.166s0.438-0.052,0.502-0.052C14.799,18.413,14.888,18.245,14.837,18.245zM14.284,14.668c-0.19,0.03-0.308,0.438-0.155,0.425C14.284,15.081,14.451,14.643,14.284,14.668zM14.734,16.959c-0.052-0.064-0.181-0.271-0.323-0.219c-0.042,0.017-0.153,0.245-0.012,0.245C14.541,16.985,14.786,17.023,14.734,16.959zM14.85,16.805c0.232-0.013,0.167-0.245-0.013-0.257C14.786,16.544,14.618,16.818,14.85,16.805zM17.591,18.928c-0.193-0.039-0.244-0.102-0.45-0.205c-0.207-0.103-0.67-0.103-0.682-0.039c-0.014,0.064,0,0-0.155-0.05c-0.153-0.054-0.271,0-0.309-0.091c-0.038-0.091-0.128-0.117-0.244-0.002c-0.097,0.097-0.142,0.104,0.078,0.143c0.218,0.039,0.283,0.039,0.192,0.141c-0.09,0.104-0.154,0.233-0.077,0.244c0.077,0.015,0.309-0.05,0.334,0c0.026,0.054-0.051,0.064,0.207,0.105c0.258,0.037,0.309,0.128,0.359,0.178c0.051,0.052,0.206,0.22,0.104,0.22c-0.104,0-0.219,0.128-0.142,0.143c0.077,0.013,0.309-0.039,0.321,0c0.014,0.037,0.143,0.283,0.271,0.271c0.129-0.013,0.206-0.244,0.27-0.31c0.065-0.064,0.322-0.104,0.349,0.012c0.026,0.116,0.104,0.233,0.257,0.311c0.154,0.076,0.335,0.154,0.348,0.089c0.013-0.064-0.077-0.309-0.181-0.346c-0.103-0.041-0.282-0.259-0.282-0.348c0-0.091-0.155-0.117-0.232-0.182C17.849,19.147,17.784,18.967,17.591,18.928zM8.042,17.023c-0.084,0.037-0.155,0.476,0,0.527c0.154,0.052,0.244-0.205,0.193-0.271C8.183,17.218,8.158,16.973,8.042,17.023zM15.429,18.117c-0.118-0.05-0.335,0.424-0.181,0.463C15.403,18.62,15.518,18.156,15.429,18.117zM15.687,13.703c0.077,0,0.18-0.051,0.18-0.193c0-0.142,0.18,0,0.27-0.013s0.141-0.103,0.18-0.206c0.005-0.013,0.008-0.021,0.009-0.027c-0.003,0.024-0.001,0.093,0.095,0.117c0.154,0.038,0.205-0.064,0.205-0.103s0.283-0.103,0.336-0.142c0.051-0.038,0.258-0.103,0.27-0.154c0.013-0.051,0-0.348,0.064-0.373c0.064-0.026,0.154-0.026,0.052-0.206c-0.104-0.181-0.104-0.348-0.232-0.271c-0.095,0.057-0.038,0.284-0.115,0.438s-0.142,0.296-0.193,0.296s-0.321,0.103-0.399,0.18c-0.076,0.077-0.45-0.064-0.501,0c-0.052,0.064-0.154,0.141-0.219,0.193c-0.065,0.051-0.245,0.013-0.207,0.167C15.518,13.562,15.609,13.703,15.687,13.703zM17.449,12.056c0.18-0.013,0.348-0.064,0.348-0.064s0.271,0.013,0.232-0.116c-0.04-0.128-0.322-0.141-0.375-0.128c-0.051,0.013-0.142-0.142-0.244-0.116c-0.096,0.023-0.128,0.155-0.128,0.193c0,0.039-0.36,0.115-0.245,0.219C17.153,12.146,17.27,12.069,17.449,12.056zM13.91,19.058c0.104,0.064,0.296-0.219,0.349-0.13c0.051,0.091-0.013,0.13,0.076,0.246c0.091,0.114,0.258,0.102,0.258,0.102s-0.013-0.309-0.155-0.387c-0.142-0.077-0.232-0.166-0.064-0.141c0.167,0.026,0.257-0.039,0.219-0.114c-0.039-0.078-0.283-0.039-0.361-0.026s-0.193-0.052-0.193-0.052c-0.077,0.024-0.063,0.089-0.09,0.219C13.923,18.902,13.807,18.992,13.91,19.058zM20.924,21.618c-0.231-0.052-0.077,0.039,0,0.154c0.077,0.116,0.232,0.176,0.258,0.05C21.193,21.759,21.155,21.67,20.924,21.618zM21.915,24.744c-0.077,0.064,0,0.091-0.219,0.22c-0.22,0.13-0.49,0.271-0.541,0.386c-0.052,0.116,0.051,0.181,0.258,0.192c0.206,0.013,0.154,0.053,0.296-0.103s0.271-0.244,0.438-0.373c0.168-0.128,0.168-0.322,0.168-0.322s-0.181-0.178-0.193-0.141C22.1,24.665,21.992,24.681,21.915,24.744zM18.504,21.618c0.014-0.116-0.219-0.116-0.334-0.207c-0.116-0.089-0.128-0.359-0.193-0.515c-0.064-0.153-0.192-0.257-0.322-0.397c-0.128-0.143-0.192-0.465-0.23-0.438c-0.039,0.025-0.154,0.399-0.064,0.515c0.09,0.116-0.039,0.348-0.103,0.503c-0.065,0.153-0.22-0.026-0.349-0.104c-0.129-0.078-0.308-0.128-0.398-0.219c-0.09-0.091,0.155-0.335,0.091-0.426c-0.065-0.09-0.412-0.013-0.45-0.013c-0.039,0-0.116-0.128-0.194-0.128c-0.077,0-0.064,0.258-0.064,0.258s-0.078-0.091-0.193-0.207c-0.117-0.115,0.012,0.077-0.103,0.193c-0.117,0.117-0.079,0.078-0.129,0.206c-0.051,0.129-0.167,0.077-0.283-0.052c-0.116-0.128-0.179-0.037-0.258,0c-0.077,0.039-0.141,0.259-0.18,0.309c-0.039,0.052-0.309,0.117-0.374,0.182c-0.064,0.062-0.09,0.27-0.09,0.322c0,0.05-0.271,0.023-0.361,0.089c-0.09,0.064-0.23,0.025-0.321,0.025c-0.09,0-0.399,0.244-0.502,0.308c-0.103,0.066-0.103,0.298-0.051,0.362c0.051,0.063,0.154,0.219,0.09,0.244c-0.064,0.026-0.104,0.206,0.051,0.359c0.154,0.155,0.103,0.194,0.115,0.271c0.014,0.077,0.078,0.104,0.181,0.232c0.102,0.128-0.181,0.231-0.219,0.31c-0.039,0.076,0.091,0.192,0.167,0.257c0.077,0.063,0.271,0.026,0.386-0.013c0.117-0.039,0.245-0.143,0.321-0.155c0.079-0.013,0.438-0.026,0.438-0.026s0.129-0.192,0.219-0.296c0.089-0.102,0.372-0.013,0.372-0.013s0.117-0.076,0.426-0.141c0.309-0.065,0.179,0.064,0.296,0.104c0.115,0.037,0.27,0.062,0.359,0.128c0.09,0.064,0,0.218-0.012,0.283c-0.014,0.064,0.219,0.038,0.23-0.026c0.014-0.064,0.077-0.128,0.207-0.205c0.128-0.078,0.025,0.114,0.076,0.231c0.052,0.116,0.129-0.157,0.129-0.026c0,0.039,0.039,0.078,0.051,0.116c0.014,0.039,0.181,0.052,0.181,0.18c0,0.13,0,0.207,0.039,0.231c0.038,0.026,0.244,0,0.335,0.155c0.089,0.154,0.154,0.013,0.205-0.052c0.052-0.064,0.231,0.026,0.283,0.078c0.052,0.05,0.193-0.104,0.387-0.155c0.192-0.051,0.167-0.039,0.219-0.115c0.051-0.078,0.09-0.283,0.205-0.438c0.115-0.153,0.271-0.424,0.271-0.631c0-0.206-0.014-0.682-0.155-0.899C18.761,21.953,18.492,21.733,18.504,21.618zM18.029,24.77c-0.065-0.013-0.207-0.062-0.207-0.062c-0.142,0.141,0.142,0.141,0.104,0.283c-0.039,0.141,0.193,0.089,0.257,0.064c0.063-0.027,0.22-0.323,0.193-0.399C18.351,24.577,18.093,24.783,18.029,24.77zM22.803,24.178c-0.052,0-0.077,0.064-0.192,0c-0.117-0.063-0.091-0.037-0.168-0.167c-0.077-0.127-0.091-0.296-0.219-0.23c-0.051,0.025,0,0.168,0.051,0.218c0.053,0.052,0.077,0.231,0.064,0.283c-0.012,0.052-0.231,0.116-0.129,0.18c0.104,0.064,0.297,0,0.271,0.078c-0.025,0.077-0.129,0.179-0.013,0.205c0.115,0.025,0.154-0.089,0.207-0.178c0.051-0.093,0.089-0.169,0.179-0.221C22.944,24.294,22.854,24.178,22.803,24.178zM22.815,21.18c0.168,0.064,0.464-0.231,0.347-0.27C23.047,20.871,22.815,21.18,22.815,21.18zM13.923,19.906c-0.029,0.115,0.193,0.167,0.206,0.039C14.141,19.816,13.949,19.803,13.923,19.906zM14.27,16.47c-0.064,0.065-0.257,0.193-0.283,0.31c-0.025,0.115,0.309-0.182,0.399-0.296c0.091-0.117,0.27-0.052,0.308-0.117c0.04-0.063,0.04-0.063,0.04-0.063s-0.142-0.025-0.257-0.063c-0.117-0.039-0.258,0.102-0.193-0.104c0.064-0.206,0.257-0.167,0.219-0.322c-0.039-0.154-0.168-0.193-0.207-0.193c-0.09,0,0.013,0.141-0.116,0.231c-0.128,0.09-0.271,0.128-0.193,0.283C14.064,16.29,14.334,16.405,14.27,16.47zM13.254,19.751c0.013-0.076-0.142-0.192-0.206-0.192c-0.065,0-0.386-0.077-0.386-0.077c-0.058,0.023-0.135,0.045-0.158,0.077c-0.007-0.011-0.022-0.024-0.049-0.039c-0.142-0.075-0.309,0-0.361-0.102c-0.05-0.104-0.127-0.104-0.179-0.039c-0.094,0.117,0.025,0.206,0.063,0.231c0.038,0.024,0.181,0.052,0.309,0.039c0.08-0.008,0.181-0.027,0.21-0.059c0.004,0.014,0.016,0.027,0.035,0.044c0.103,0.092,0.167,0.13,0.321,0.116C13.009,19.74,13.241,19.829,13.254,19.751zM12.881,18.992c0.065,0,0.193,0,0.283,0.026c0.09,0.025,0.386,0.05,0.373-0.064c-0.013-0.115-0.038-0.297,0.089-0.411c0.13-0.117,0.257-0.18,0.193-0.348c-0.063-0.167-0.193-0.271-0.103-0.349c0.09-0.076,0.192-0.102,0.192-0.166c0-0.065-0.217,0.18-0.244-0.246c-0.005-0.091-0.206,0.025-0.219,0.116c-0.012,0.091,0.142,0.167-0.103,0.167c-0.245,0-0.257,0.194-0.309,0.232c-0.052,0.039-0.103,0.051-0.207,0.076c-0.102,0.026-0.127,0.13-0.153,0.194c-0.025,0.063-0.206-0.116-0.257-0.064c-0.051,0.052-0.013,0.296,0.077,0.501C12.585,18.863,12.816,18.992,12.881,18.992zM11.979,18.928c0.065-0.077,0.038-0.192-0.063-0.18c-0.103,0.013-0.193-0.168-0.36-0.283c-0.168-0.114-0.296-0.194-0.451-0.36c-0.154-0.167-0.347-0.271-0.45-0.359c-0.104-0.091-0.257-0.13-0.322-0.116c-0.159,0.032,0.231,0.309,0.271,0.346c0.039,0.041,0.387,0.335,0.387,0.478s0.231,0.476,0.296,0.527c0.064,0.052,0.385,0.244,0.437,0.348c0.052,0.103,0.167,0.13,0.167-0.013C11.89,19.174,11.916,19.006,11.979,18.928zM11.002,17.474c0.064,0.232,0.193,0.464,0.244,0.555c0.052,0.089,0.271,0.217,0.348,0.281c0.077,0.064,0.192-0.024,0.143-0.102c-0.052-0.078-0.155-0.192-0.167-0.283c-0.013-0.091-0.078-0.233-0.181-0.387c-0.102-0.153-0.192-0.192-0.257-0.295c-0.064-0.104-0.296-0.297-0.296-0.297c-0.102,0.013-0.102,0.205-0.051,0.271C10.834,17.28,10.938,17.243,11.002,17.474z",
    globeAlt : "M16,1.466C7.973,1.466,1.466,7.973,1.466,16c0,8.027,6.507,14.534,14.534,14.534c8.027,0,14.534-6.507,14.534-14.534C30.534,7.973,24.027,1.466,16,1.466zM27.436,17.39c0.001,0.002,0.004,0.002,0.005,0.004c-0.022,0.187-0.054,0.37-0.085,0.554c-0.015-0.012-0.034-0.025-0.047-0.036c-0.103-0.09-0.254-0.128-0.318-0.115c-0.157,0.032,0.229,0.305,0.267,0.342c0.009,0.009,0.031,0.03,0.062,0.058c-1.029,5.312-5.709,9.338-11.319,9.338c-4.123,0-7.736-2.18-9.776-5.441c0.123-0.016,0.24-0.016,0.28-0.076c0.051-0.077,0.102-0.241,0.178-0.331c0.077-0.089,0.165-0.229,0.127-0.292c-0.039-0.064,0.101-0.344,0.088-0.419c-0.013-0.076-0.127-0.256,0.064-0.407s0.394-0.382,0.407-0.444c0.012-0.063,0.166-0.331,0.152-0.458c-0.012-0.127-0.152-0.28-0.24-0.318c-0.09-0.037-0.28-0.05-0.356-0.151c-0.077-0.103-0.292-0.203-0.368-0.178c-0.076,0.025-0.204,0.05-0.305-0.015c-0.102-0.062-0.267-0.139-0.33-0.189c-0.065-0.05-0.229-0.088-0.305-0.088c-0.077,0-0.065-0.052-0.178,0.101c-0.114,0.153,0,0.204-0.204,0.177c-0.204-0.023,0.025-0.036,0.141-0.189c0.113-0.152-0.013-0.242-0.141-0.203c-0.126,0.038-0.038,0.115-0.241,0.153c-0.203,0.036-0.203-0.09-0.076-0.115s0.355-0.139,0.355-0.19c0-0.051-0.025-0.191-0.127-0.191s-0.077-0.126-0.229-0.291c-0.092-0.101-0.196-0.164-0.299-0.204c-0.09-0.579-0.15-1.167-0.15-1.771c0-2.844,1.039-5.446,2.751-7.458c0.024-0.02,0.048-0.034,0.069-0.036c0.084-0.009,0.31-0.025,0.51-0.059c0.202-0.034,0.418-0.161,0.489-0.153c0.069,0.008,0.241,0.008,0.186-0.042C8.417,8.2,8.339,8.082,8.223,8.082S8.215,7.896,8.246,7.896c0.03,0,0.186,0.025,0.178,0.11C8.417,8.091,8.471,8.2,8.625,8.167c0.156-0.034,0.132-0.162,0.102-0.195C8.695,7.938,8.672,7.853,8.642,7.794c-0.031-0.06-0.023-0.136,0.14-0.153C8.944,7.625,9.168,7.708,9.16,7.573s0-0.28,0.046-0.356C9.253,7.142,9.354,7.09,9.299,7.065C9.246,7.04,9.176,7.099,9.121,6.972c-0.054-0.127,0.047-0.22,0.108-0.271c0.02-0.015,0.067-0.06,0.124-0.112C11.234,5.257,13.524,4.466,16,4.466c3.213,0,6.122,1.323,8.214,3.45c-0.008,0.022-0.01,0.052-0.031,0.056c-0.077,0.013-0.166,0.063-0.179-0.051c-0.013-0.114-0.013-0.331-0.102-0.203c-0.089,0.127-0.127,0.127-0.127,0.191c0,0.063,0.076,0.127,0.051,0.241C23.8,8.264,23.8,8.341,23.84,8.341c0.036,0,0.126-0.115,0.239-0.141c0.116-0.025,0.319-0.088,0.332,0.026c0.013,0.115,0.139,0.152,0.013,0.203c-0.128,0.051-0.267,0.026-0.293-0.051c-0.025-0.077-0.114-0.077-0.203-0.013c-0.088,0.063-0.279,0.292-0.279,0.292s-0.306,0.139-0.343,0.114c-0.04-0.025,0.101-0.165,0.203-0.228c0.102-0.064,0.178-0.204,0.14-0.242c-0.038-0.038-0.088-0.279-0.063-0.343c0.025-0.063,0.139-0.152,0.013-0.216c-0.127-0.063-0.217-0.14-0.318-0.178s-0.216,0.152-0.305,0.204c-0.089,0.051-0.076,0.114-0.191,0.127c-0.114,0.013-0.189,0.165,0,0.254c0.191,0.089,0.255,0.152,0.204,0.204c-0.051,0.051-0.267-0.025-0.267-0.025s-0.165-0.076-0.268-0.076c-0.101,0-0.229-0.063-0.33-0.076c-0.102-0.013-0.306-0.013-0.355,0.038c-0.051,0.051-0.179,0.203-0.28,0.152c-0.101-0.051-0.101-0.102-0.241-0.051c-0.14,0.051-0.279-0.038-0.355,0.038c-0.077,0.076-0.013,0.076-0.255,0c-0.241-0.076-0.189,0.051-0.419,0.089s-0.368-0.038-0.432,0.038c-0.064,0.077-0.153,0.217-0.19,0.127c-0.038-0.088,0.126-0.241,0.062-0.292c-0.062-0.051-0.33-0.025-0.367,0.013c-0.039,0.038-0.014,0.178,0.011,0.229c0.026,0.05,0.064,0.254-0.011,0.216c-0.077-0.038-0.064-0.166-0.141-0.152c-0.076,0.013-0.165,0.051-0.203,0.077c-0.038,0.025-0.191,0.025-0.229,0.076c-0.037,0.051,0.014,0.191-0.051,0.203c-0.063,0.013-0.114,0.064-0.254-0.025c-0.14-0.089-0.14-0.038-0.178-0.012c-0.038,0.025-0.216,0.127-0.229,0.012c-0.013-0.114,0.025-0.152-0.089-0.229c-0.115-0.076-0.026-0.076,0.127-0.025c0.152,0.05,0.343,0.075,0.622-0.013c0.28-0.089,0.395-0.127,0.28-0.178c-0.115-0.05-0.229-0.101-0.406-0.127c-0.179-0.025-0.42-0.025-0.7-0.127c-0.279-0.102-0.343-0.14-0.457-0.165c-0.115-0.026-0.813-0.14-1.132-0.089c-0.317,0.051-1.193,0.28-1.245,0.318s-0.128,0.19-0.292,0.318c-0.165,0.127-0.47,0.419-0.712,0.47c-0.241,0.051-0.521,0.254-0.521,0.305c0,0.051,0.101,0.242,0.076,0.28c-0.025,0.038,0.05,0.229,0.191,0.28c0.139,0.05,0.381,0.038,0.393-0.039c0.014-0.076,0.204-0.241,0.217-0.127c0.013,0.115,0.14,0.292,0.114,0.368c-0.025,0.077,0,0.153,0.09,0.14c0.088-0.012,0.559-0.114,0.559-0.114s0.153-0.064,0.127-0.166c-0.026-0.101,0.166-0.241,0.203-0.279c0.038-0.038,0.178-0.191,0.014-0.241c-0.167-0.051-0.293-0.064-0.115-0.216s0.292,0,0.521-0.229c0.229-0.229-0.051-0.292,0.191-0.305c0.241-0.013,0.496-0.025,0.444,0.051c-0.05,0.076-0.342,0.242-0.508,0.318c-0.166,0.077-0.14,0.216-0.076,0.292c0.063,0.076,0.09,0.254,0.204,0.229c0.113-0.025,0.254-0.114,0.38-0.101c0.128,0.012,0.383-0.013,0.42-0.013c0.039,0,0.216,0.178,0.114,0.203c-0.101,0.025-0.229,0.013-0.445,0.025c-0.215,0.013-0.456,0.013-0.456,0.051c0,0.039,0.292,0.127,0.19,0.191c-0.102,0.063-0.203-0.013-0.331-0.026c-0.127-0.012-0.203,0.166-0.241,0.267c-0.039,0.102,0.063,0.28-0.127,0.216c-0.191-0.063-0.331-0.063-0.381-0.038c-0.051,0.025-0.203,0.076-0.331,0.114c-0.126,0.038-0.076-0.063-0.242-0.063c-0.164,0-0.164,0-0.164,0l-0.103,0.013c0,0-0.101-0.063-0.114-0.165c-0.013-0.102,0.05-0.216-0.013-0.241c-0.064-0.026-0.292,0.012-0.33,0.088c-0.038,0.076-0.077,0.216-0.026,0.28c0.052,0.063,0.204,0.19,0.064,0.152c-0.14-0.038-0.317-0.051-0.419,0.026c-0.101,0.076-0.279,0.241-0.279,0.241s-0.318,0.025-0.318,0.102c0,0.077,0,0.178-0.114,0.191c-0.115,0.013-0.268,0.05-0.42,0.076c-0.153,0.025-0.139,0.088-0.317,0.102s-0.204,0.089-0.038,0.114c0.165,0.025,0.418,0.127,0.431,0.241c0.014,0.114-0.013,0.242-0.076,0.356c-0.043,0.079-0.305,0.026-0.458,0.026c-0.152,0-0.456-0.051-0.584,0c-0.127,0.051-0.102,0.305-0.064,0.419c0.039,0.114-0.012,0.178-0.063,0.216c-0.051,0.038-0.065,0.152,0,0.204c0.063,0.051,0.114,0.165,0.166,0.178c0.051,0.013,0.215-0.038,0.279,0.025c0.064,0.064,0.127,0.216,0.165,0.178c0.039-0.038,0.089-0.203,0.153-0.166c0.064,0.039,0.216-0.012,0.331-0.025s0.177-0.14,0.292-0.204c0.114-0.063,0.05-0.063,0.013-0.14c-0.038-0.076,0.114-0.165,0.204-0.254c0.088-0.089,0.253-0.013,0.292-0.115c0.038-0.102,0.051-0.279,0.151-0.267c0.103,0.013,0.243,0.076,0.331,0.076c0.089,0,0.279-0.14,0.332-0.165c0.05-0.025,0.241-0.013,0.267,0.102c0.025,0.114,0.241,0.254,0.292,0.279c0.051,0.025,0.381,0.127,0.433,0.165c0.05,0.038,0.126,0.153,0.152,0.254c0.025,0.102,0.114,0.102,0.128,0.013c0.012-0.089-0.065-0.254,0.025-0.242c0.088,0.013,0.191-0.026,0.191-0.026s-0.243-0.165-0.331-0.203c-0.088-0.038-0.255-0.114-0.331-0.241c-0.076-0.127-0.267-0.153-0.254-0.279c0.013-0.127,0.191-0.051,0.292,0.051c0.102,0.102,0.356,0.241,0.445,0.33c0.088,0.089,0.229,0.127,0.267,0.242c0.039,0.114,0.152,0.241,0.19,0.292c0.038,0.051,0.165,0.331,0.204,0.394c0.038,0.063,0.165-0.012,0.229-0.063c0.063-0.051,0.179-0.076,0.191-0.178c0.013-0.102-0.153-0.178-0.203-0.216c-0.051-0.038,0.127-0.076,0.191-0.127c0.063-0.05,0.177-0.14,0.228-0.063c0.051,0.077,0.026,0.381,0.051,0.432c0.025,0.051,0.279,0.127,0.331,0.191c0.05,0.063,0.267,0.089,0.304,0.051c0.039-0.038,0.242,0.026,0.294,0.038c0.049,0.013,0.202-0.025,0.304-0.05c0.103-0.025,0.204-0.102,0.191,0.063c-0.013,0.165-0.051,0.419-0.179,0.546c-0.127,0.127-0.076,0.191-0.202,0.191c-0.06,0-0.113,0-0.156,0.021c-0.041-0.065-0.098-0.117-0.175-0.097c-0.152,0.038-0.344,0.038-0.47,0.19c-0.128,0.153-0.178,0.165-0.204,0.114c-0.025-0.051,0.369-0.267,0.317-0.331c-0.05-0.063-0.355-0.038-0.521-0.038c-0.166,0-0.305-0.102-0.433-0.127c-0.126-0.025-0.292,0.127-0.418,0.254c-0.128,0.127-0.216,0.038-0.331,0.038c-0.115,0-0.331-0.165-0.331-0.165s-0.216-0.089-0.305-0.089c-0.088,0-0.267-0.165-0.318-0.165c-0.05,0-0.19-0.115-0.088-0.166c0.101-0.05,0.202,0.051,0.101-0.229c-0.101-0.279-0.33-0.216-0.419-0.178c-0.088,0.039-0.724,0.025-0.775,0.025c-0.051,0-0.419,0.127-0.533,0.178c-0.116,0.051-0.318,0.115-0.369,0.14c-0.051,0.025-0.318-0.051-0.433,0.013c-0.151,0.084-0.291,0.216-0.33,0.216c-0.038,0-0.153,0.089-0.229,0.28c-0.077,0.19,0.013,0.355-0.128,0.419c-0.139,0.063-0.394,0.204-0.495,0.305c-0.102,0.101-0.229,0.458-0.355,0.623c-0.127,0.165,0,0.317,0.025,0.419c0.025,0.101,0.114,0.292-0.025,0.471c-0.14,0.178-0.127,0.266-0.191,0.279c-0.063,0.013,0.063,0.063,0.088,0.19c0.025,0.128-0.114,0.255,0.128,0.369c0.241,0.113,0.355,0.217,0.418,0.367c0.064,0.153,0.382,0.407,0.382,0.407s0.229,0.205,0.344,0.293c0.114,0.089,0.152,0.038,0.177-0.05c0.025-0.09,0.178-0.104,0.355-0.104c0.178,0,0.305,0.04,0.483,0.014c0.178-0.025,0.356-0.141,0.42-0.166c0.063-0.025,0.279-0.164,0.443-0.063c0.166,0.103,0.141,0.241,0.23,0.332c0.088,0.088,0.24,0.037,0.355-0.051c0.114-0.09,0.064-0.052,0.203,0.025c0.14,0.075,0.204,0.151,0.077,0.267c-0.128,0.113-0.051,0.293-0.128,0.47c-0.076,0.178-0.063,0.203,0.077,0.278c0.14,0.076,0.394,0.548,0.47,0.638c0.077,0.088-0.025,0.342,0.064,0.495c0.089,0.151,0.178,0.254,0.077,0.331c-0.103,0.075-0.28,0.216-0.292,0.47s0.051,0.431,0.102,0.521s0.177,0.331,0.241,0.419c0.064,0.089,0.14,0.305,0.152,0.445c0.013,0.14-0.024,0.306,0.039,0.381c0.064,0.076,0.102,0.191,0.216,0.292c0.115,0.103,0.152,0.318,0.152,0.318s0.039,0.089,0.051,0.229c0.012,0.14,0.025,0.228,0.152,0.292c0.126,0.063,0.215,0.076,0.28,0.013c0.063-0.063,0.381-0.077,0.546-0.063c0.165,0.013,0.355-0.075,0.521-0.19s0.407-0.419,0.496-0.508c0.089-0.09,0.292-0.255,0.268-0.356c-0.025-0.101-0.077-0.203,0.024-0.254c0.102-0.052,0.344-0.152,0.356-0.229c0.013-0.077-0.09-0.395-0.115-0.457c-0.024-0.064,0.064-0.18,0.165-0.306c0.103-0.128,0.421-0.216,0.471-0.267c0.051-0.053,0.191-0.267,0.217-0.433c0.024-0.167-0.051-0.369,0-0.457c0.05-0.09,0.013-0.165-0.103-0.268c-0.114-0.102-0.089-0.407-0.127-0.457c-0.037-0.051-0.013-0.319,0.063-0.345c0.076-0.023,0.242-0.279,0.344-0.393c0.102-0.114,0.394-0.47,0.534-0.496c0.139-0.025,0.355-0.229,0.368-0.343c0.013-0.115,0.38-0.547,0.394-0.635c0.013-0.09,0.166-0.42,0.102-0.497c-0.062-0.076-0.559,0.115-0.622,0.141c-0.064,0.025-0.241,0.127-0.446,0.113c-0.202-0.013-0.114-0.177-0.127-0.254c-0.012-0.076-0.228-0.368-0.279-0.381c-0.051-0.012-0.203-0.166-0.267-0.317c-0.063-0.153-0.152-0.343-0.254-0.458c-0.102-0.114-0.165-0.38-0.268-0.559c-0.101-0.178-0.189-0.407-0.279-0.572c-0.021-0.041-0.045-0.079-0.067-0.117c0.118-0.029,0.289-0.082,0.31-0.009c0.024,0.088,0.165,0.279,0.19,0.419s0.165,0.089,0.178,0.216c0.014,0.128,0.14,0.433,0.19,0.47c0.052,0.038,0.28,0.242,0.318,0.318c0.038,0.076,0.089,0.178,0.127,0.369c0.038,0.19,0.076,0.444,0.179,0.482c0.102,0.038,0.444-0.064,0.508-0.102s0.482-0.242,0.635-0.255c0.153-0.012,0.179-0.115,0.368-0.152c0.191-0.038,0.331-0.177,0.458-0.28c0.127-0.101,0.28-0.355,0.33-0.444c0.052-0.088,0.179-0.152,0.115-0.253c-0.063-0.103-0.331-0.254-0.433-0.268c-0.102-0.012-0.089-0.178-0.152-0.178s-0.051,0.088-0.178,0.153c-0.127,0.063-0.255,0.19-0.344,0.165s0.026-0.089-0.113-0.203s-0.192-0.14-0.192-0.228c0-0.089-0.278-0.255-0.304-0.382c-0.026-0.127,0.19-0.305,0.254-0.19c0.063,0.114,0.115,0.292,0.279,0.368c0.165,0.076,0.318,0.204,0.395,0.229c0.076,0.025,0.267-0.14,0.33-0.114c0.063,0.024,0.191,0.253,0.306,0.292c0.113,0.038,0.495,0.051,0.559,0.051s0.33,0.013,0.381-0.063c0.051-0.076,0.089-0.076,0.153-0.076c0.062,0,0.177,0.229,0.267,0.254c0.089,0.025,0.254,0.013,0.241,0.179c-0.012,0.164,0.076,0.305,0.165,0.317c0.09,0.012,0.293-0.191,0.293-0.191s0,0.318-0.012,0.433c-0.014,0.113,0.139,0.534,0.139,0.534s0.19,0.393,0.241,0.482s0.267,0.355,0.267,0.47c0,0.115,0.025,0.293,0.103,0.293c0.076,0,0.152-0.203,0.24-0.331c0.091-0.126,0.116-0.305,0.153-0.432c0.038-0.127,0.038-0.356,0.038-0.444c0-0.09,0.075-0.166,0.255-0.242c0.178-0.076,0.304-0.292,0.456-0.407c0.153-0.115,0.141-0.305,0.446-0.305c0.305,0,0.278,0,0.355-0.077c0.076-0.076,0.151-0.127,0.19,0.013c0.038,0.14,0.254,0.343,0.292,0.394c0.038,0.052,0.114,0.191,0.103,0.344c-0.013,0.152,0.012,0.33,0.075,0.33s0.191-0.216,0.191-0.216s0.279-0.189,0.267,0.013c-0.014,0.203,0.025,0.419,0.025,0.545c0,0.053,0.042,0.135,0.088,0.21c-0.005,0.059-0.004,0.119-0.009,0.178C27.388,17.153,27.387,17.327,27.436,17.39zM20.382,12.064c0.076,0.05,0.102,0.127,0.152,0.203c0.052,0.076,0.14,0.05,0.203,0.114c0.063,0.064-0.178,0.14-0.075,0.216c0.101,0.077,0.151,0.381,0.165,0.458c0.013,0.076-0.279,0.114-0.369,0.102c-0.089-0.013-0.354-0.102-0.445-0.127c-0.089-0.026-0.139-0.343-0.025-0.331c0.116,0.013,0.141-0.025,0.267-0.139c0.128-0.115-0.189-0.166-0.278-0.191c-0.089-0.025-0.268-0.305-0.331-0.394c-0.062-0.089-0.014-0.228,0.141-0.331c0.076-0.051,0.279,0.063,0.381,0c0.101-0.063,0.203-0.14,0.241-0.165c0.039-0.025,0.293,0.038,0.33,0.114c0.039,0.076,0.191,0.191,0.141,0.229c-0.052,0.038-0.281,0.076-0.356,0c-0.075-0.077-0.255,0.012-0.268,0.152C20.242,12.115,20.307,12.013,20.382,12.064zM16.875,12.28c-0.077-0.025,0.025-0.178,0.102-0.229c0.075-0.051,0.164-0.178,0.241-0.305c0.076-0.127,0.178-0.14,0.241-0.127c0.063,0.013,0.203,0.241,0.241,0.318c0.038,0.076,0.165-0.026,0.217-0.051c0.05-0.025,0.127-0.102,0.14-0.165s0.127-0.102,0.254-0.102s0.013,0.102-0.076,0.127c-0.09,0.025-0.038,0.077,0.113,0.127c0.153,0.051,0.293,0.191,0.459,0.279c0.165,0.089,0.19,0.267,0.088,0.292c-0.101,0.025-0.406,0.051-0.521,0.038c-0.114-0.013-0.254-0.127-0.419-0.153c-0.165-0.025-0.369-0.013-0.433,0.077s-0.292,0.05-0.395,0.05c-0.102,0-0.228,0.127-0.253,0.077C16.875,12.534,16.951,12.306,16.875,12.28zM17.307,9.458c0.063-0.178,0.419,0.038,0.355,0.127C17.599,9.675,17.264,9.579,17.307,9.458zM17.802,18.584c0.063,0.102-0.14,0.431-0.254,0.407c-0.113-0.027-0.076-0.318-0.038-0.382C17.548,18.545,17.769,18.529,17.802,18.584zM13.189,12.674c0.025-0.051-0.039-0.153-0.127-0.013C13.032,12.71,13.164,12.725,13.189,12.674zM20.813,8.035c0.141,0.076,0.339,0.107,0.433,0.013c0.076-0.076,0.013-0.204-0.05-0.216c-0.064-0.013-0.104-0.115,0.062-0.203c0.165-0.089,0.343-0.204,0.534-0.229c0.19-0.025,0.622-0.038,0.774,0c0.152,0.039,0.382-0.166,0.445-0.254s-0.203-0.152-0.279-0.051c-0.077,0.102-0.444,0.076-0.521,0.051c-0.076-0.025-0.686,0.102-0.812,0.102c-0.128,0-0.179,0.152-0.356,0.229c-0.179,0.076-0.42,0.191-0.509,0.229c-0.088,0.038-0.177,0.19-0.101,0.216C20.509,7.947,20.674,7.959,20.813,8.035zM14.142,12.674c0.064-0.089-0.051-0.217-0.114-0.217c-0.12,0-0.178,0.191-0.103,0.254C14.002,12.776,14.078,12.763,14.142,12.674zM14.714,13.017c0.064,0.025,0.114,0.102,0.165,0.114c0.052,0.013,0.217,0,0.167-0.127s-0.167-0.127-0.204-0.127c-0.038,0-0.203-0.038-0.267,0C14.528,12.905,14.65,12.992,14.714,13.017zM11.308,10.958c0.101,0.013,0.217-0.063,0.305-0.101c0.088-0.038,0.216-0.114,0.216-0.229c0-0.114-0.025-0.216-0.077-0.267c-0.051-0.051-0.14-0.064-0.216-0.051c-0.115,0.02-0.127,0.14-0.203,0.14c-0.076,0-0.165,0.025-0.14,0.114s0.077,0.152,0,0.19C11.117,10.793,11.205,10.946,11.308,10.958zM11.931,10.412c0.127,0.051,0.394,0.102,0.292,0.153c-0.102,0.051-0.28,0.19-0.305,0.267s0.216,0.153,0.216,0.153s-0.077,0.089-0.013,0.114c0.063,0.025,0.102-0.089,0.203-0.089c0.101,0,0.304,0.063,0.406,0.063c0.103,0,0.267-0.14,0.254-0.229c-0.013-0.089-0.14-0.229-0.254-0.28c-0.113-0.051-0.241-0.28-0.317-0.331c-0.076-0.051,0.076-0.178-0.013-0.267c-0.09-0.089-0.153-0.076-0.255-0.14c-0.102-0.063-0.191,0.013-0.254,0.089c-0.063,0.076-0.14-0.013-0.217,0.012c-0.102,0.035-0.063,0.166-0.012,0.229C11.714,10.221,11.804,10.361,11.931,10.412zM24.729,17.198c-0.083,0.037-0.153,0.47,0,0.521c0.152,0.052,0.241-0.202,0.191-0.267C24.868,17.39,24.843,17.147,24.729,17.198zM20.114,20.464c-0.159-0.045-0.177,0.166-0.304,0.306c-0.128,0.141-0.267,0.254-0.317,0.241c-0.052-0.013-0.331,0.089-0.242,0.279c0.089,0.191,0.076,0.382-0.013,0.472c-0.089,0.088,0.076,0.342,0.052,0.482c-0.026,0.139,0.037,0.229,0.215,0.229s0.242-0.064,0.318-0.229c0.076-0.166,0.088-0.331,0.164-0.47c0.077-0.141,0.141-0.434,0.179-0.51c0.038-0.075,0.114-0.316,0.102-0.457C20.254,20.669,20.204,20.489,20.114,20.464zM10.391,8.802c-0.069-0.06-0.229-0.102-0.306-0.11c-0.076-0.008-0.152,0.06-0.321,0.06c-0.168,0-0.279,0.067-0.347,0C9.349,8.684,9.068,8.65,9.042,8.692C9.008,8.749,8.941,8.751,9.008,8.87c0.069,0.118,0.12,0.186,0.179,0.178s0.262-0.017,0.288,0.051C9.5,9.167,9.569,9.226,9.712,9.184c0.145-0.042,0.263-0.068,0.296-0.119c0.033-0.051,0.263-0.059,0.263-0.059S10.458,8.861,10.391,8.802z",
    globe : "M16,1.466C7.973,1.466,1.466,7.973,1.466,16c0,8.027,6.507,14.534,14.534,14.534c8.027,0,14.534-6.507,14.534-14.534C30.534,7.973,24.027,1.466,16,1.466zM19.158,23.269c-0.079,0.064-0.183,0.13-0.105,0.207c0.078,0.078-0.09,0.131-0.09,0.17s0.104,0.246,0.052,0.336c-0.052,0.092-0.091,0.223-0.13,0.301c-0.039,0.077-0.131,0.155-0.104,0.272c0.025,0.116-0.104,0.077-0.104,0.194c0,0.116,0.116,0.065,0.09,0.208c-0.025,0.144-0.09,0.183-0.09,0.285c0,0.104,0.064,0.247,0.064,0.286s-0.064,0.17-0.155,0.272c-0.092,0.104-0.155,0.17-0.144,0.233c0.014,0.065,0.104,0.144,0.091,0.184c-0.013,0.037-0.129,0.168-0.116,0.259c0.014,0.09,0.129,0.053,0.155,0.116c0.026,0.065-0.155,0.118-0.078,0.183c0.078,0.064,0.183,0.051,0.156,0.208c-0.019,0.112,0.064,0.163,0.126,0.198c-0.891,0.221-1.818,0.352-2.777,0.352C9.639,27.533,4.466,22.36,4.466,16c0-2.073,0.557-4.015,1.518-5.697c0.079-0.042,0.137-0.069,0.171-0.062c0.065,0.013,0.079,0.104,0.183,0.13c0.104,0.026,0.195-0.078,0.26-0.117c0.064-0.039,0.116-0.195,0.051-0.182c-0.065,0.013-0.234,0-0.234,0s0.183-0.104,0.183-0.169s0.025-0.169,0.129-0.208C6.83,9.655,6.83,9.681,6.765,9.837C6.7,9.993,6.896,9.928,6.973,9.863s0.13-0.013,0.272-0.104c0.143-0.091,0.143-0.143,0.221-0.143c0.078,0,0.221,0.143,0.299,0.091c0.077-0.052,0.299,0.065,0.429,0.065c0.129,0,0.545,0.169,0.624,0.169c0.078,0,0.312,0.09,0.325,0.259c0.013,0.169,0.09,0.156,0.168,0.156s0.26,0.065,0.26,0.13c0,0.065-0.052,0.325,0.078,0.39c0.129,0.064,0.247,0.169,0.299,0.143c0.052-0.026,0-0.233-0.064-0.26c-0.065-0.026-0.027-0.117-0.052-0.169c-0.026-0.051,0.078-0.051,0.117,0.039c0.039,0.091,0.143,0.26,0.208,0.26c0.064,0,0.208,0.156,0.168,0.247c-0.039,0.091,0.039,0.221,0.156,0.221c0.116,0,0.26,0.182,0.312,0.195c0.052,0.013,0.117,0.078,0.117,0.117c0,0.04,0.065,0.26,0.065,0.351c0,0.09-0.04,0.454-0.053,0.597s0.104,0.39,0.234,0.52c0.129,0.13,0.246,0.377,0.324,0.429c0.079,0.052,0.13,0.195,0.247,0.182c0.117-0.013,0.195,0.078,0.299,0.26c0.104,0.182,0.208,0.48,0.286,0.506c0.078,0.026,0.208,0.117,0.142,0.182c-0.064,0.064-0.168,0.208-0.051,0.208c0.117,0,0.156-0.065,0.247,0.053c0.09,0.116,0.208,0.181,0.194,0.26c-0.013,0.077,0.104,0.103,0.156,0.116c0.052,0.013,0.169,0.247,0.286,0.143c0.117-0.104-0.155-0.259-0.234-0.326c-0.078-0.064,0-0.207-0.182-0.35c-0.182-0.143-0.156-0.247-0.286-0.351c-0.13-0.104-0.233-0.195-0.104-0.286c0.13-0.091,0.143,0.091,0.195,0.208c0.052,0.116,0.324,0.351,0.441,0.454c0.117,0.104,0.326,0.468,0.39,0.468s0.247,0.208,0.247,0.208s0.103,0.168,0.064,0.22c-0.039,0.052,0.053,0.247,0.144,0.299c0.09,0.052,0.455,0.22,0.507,0.247c0.052,0.027,0.155,0.221,0.299,0.221c0.142,0,0.247,0.014,0.286,0.053c0.039,0.038,0.155,0.194,0.234,0.104c0.078-0.092,0.09-0.131,0.208-0.131c0.117,0,0.168,0.091,0.233,0.156c0.065,0.065,0.247,0.235,0.338,0.222c0.091-0.013,0.208,0.104,0.273,0.064s0.169,0.025,0.22,0.052c0.054,0.026,0.234,0.118,0.222,0.272c-0.013,0.157,0.103,0.195,0.182,0.234c0.078,0.039,0.182,0.13,0.248,0.195c0.064,0.063,0.206,0.077,0.246,0.116c0.039,0.039,0.065,0.117,0.182,0.052c0.116-0.064,0.092-0.181,0.092-0.181s0.129-0.026,0.194,0.026c0.064,0.05,0.104,0.22,0.144,0.246c0.038,0.026,0.115,0.221,0.063,0.362c-0.051,0.145-0.038,0.286-0.091,0.286c-0.052,0-0.116,0.17-0.195,0.209c-0.076,0.039-0.285,0.221-0.272,0.286c0.013,0.063,0.131,0.258,0.104,0.35c-0.025,0.091-0.194,0.195-0.154,0.338c0.038,0.144,0.312,0.183,0.323,0.312c0.014,0.131,0.209,0.417,0.235,0.546c0.025,0.13,0.246,0.272,0.246,0.453c0,0.184,0.312,0.3,0.377,0.312c0.063,0.013,0.182,0.131,0.272,0.17s0.169,0.116,0.233,0.221s0.053,0.261,0.053,0.299c0,0.039-0.039,0.44-0.078,0.674C19.145,23.021,19.235,23.203,19.158,23.269zM10.766,11.188c0.039,0.013,0.117,0.091,0.156,0.091c0.04,0,0.234,0.156,0.286,0.208c0.053,0.052,0.053,0.195-0.013,0.208s-0.104-0.143-0.117-0.208c-0.013-0.065-0.143-0.065-0.208-0.104C10.805,11.344,10.66,11.152,10.766,11.188zM27.51,16.41c-0.144,0.182-0.13,0.272-0.195,0.286c-0.064,0.013,0.065,0.065,0.09,0.194c0.022,0.112-0.065,0.224,0.063,0.327c-0.486,4.619-3.71,8.434-8.016,9.787c-0.007-0.011-0.019-0.025-0.021-0.034c-0.027-0.078-0.027-0.233,0.064-0.285c0.091-0.053,0.312-0.233,0.363-0.272c0.052-0.04,0.13-0.221,0.091-0.247c-0.038-0.026-0.232,0-0.26-0.039c-0.026-0.039-0.026-0.092,0.104-0.182c0.13-0.091,0.195-0.222,0.247-0.26c0.052-0.039,0.155-0.117,0.195-0.209c0.038-0.09-0.041-0.039-0.118-0.039s-0.117-0.142-0.117-0.207s0.195,0.026,0.339,0.052c0.143,0.024,0.077-0.065,0.064-0.142c-0.013-0.078,0.026-0.209,0.105-0.17c0.076,0.039,0.479-0.013,0.531-0.026c0.052-0.013,0.194-0.246,0.246-0.312c0.053-0.065,0.064-0.129,0-0.168c-0.065-0.04-0.143-0.184-0.168-0.221c-0.026-0.041-0.039-0.274-0.013-0.34c0.025-0.063,0,0.377,0.181,0.43c0.183,0.052,0.286,0.078,0.455-0.078c0.169-0.155,0.298-0.26,0.312-0.363c0.013-0.104,0.052-0.209,0.117-0.246c0.065-0.039,0.104,0.103,0.182-0.065c0.078-0.17,0.156-0.157,0.234-0.299c0.077-0.144-0.13-0.325,0.024-0.43c0.157-0.103,0.43-0.233,0.43-0.233s0.078-0.039,0.234-0.078c0.155-0.038,0.324-0.014,0.376-0.09c0.052-0.079,0.104-0.247,0.182-0.338c0.079-0.092,0.169-0.234,0.13-0.299c-0.039-0.065,0.104-0.352,0.091-0.429c-0.013-0.078-0.13-0.261,0.065-0.416s0.402-0.391,0.416-0.454c0.012-0.065,0.169-0.338,0.154-0.469c-0.012-0.129-0.154-0.285-0.245-0.325c-0.092-0.037-0.286-0.05-0.364-0.154s-0.299-0.208-0.377-0.182c-0.077,0.026-0.208,0.051-0.312-0.015c-0.104-0.063-0.272-0.143-0.337-0.194c-0.066-0.051-0.234-0.09-0.312-0.09s-0.065-0.053-0.182,0.103c-0.117,0.157,0,0.209-0.208,0.182c-0.209-0.024,0.025-0.038,0.144-0.194c0.115-0.155-0.014-0.247-0.144-0.207c-0.13,0.039-0.039,0.117-0.247,0.156c-0.207,0.038-0.207-0.092-0.077-0.117c0.13-0.026,0.363-0.143,0.363-0.194c0-0.053-0.026-0.196-0.13-0.196s-0.078-0.129-0.233-0.297c-0.156-0.17-0.351-0.274-0.508-0.249c-0.154,0.026-0.272,0.065-0.35-0.076c-0.078-0.144-0.169-0.17-0.222-0.247c-0.051-0.078-0.182,0-0.221-0.039s-0.039-0.039-0.039-0.039s-0.169,0.039-0.077-0.078c0.09-0.117,0.129-0.338,0.09-0.325c-0.038,0.013-0.104,0.196-0.168,0.183c-0.064-0.013-0.014-0.04-0.144-0.117c-0.13-0.078-0.337-0.013-0.337,0.052c0,0.065-0.065,0.117-0.065,0.117s-0.039-0.038-0.078-0.117c-0.039-0.078-0.221-0.091-0.312-0.013c-0.09,0.078-0.142-0.196-0.207-0.196s-0.194,0.065-0.26,0.184c-0.064,0.116-0.038,0.285-0.092,0.272c-0.05-0.013-0.063-0.233-0.05-0.312c0.012-0.079,0.155-0.208,0.05-0.234c-0.103-0.026-0.259,0.13-0.323,0.143c-0.065,0.013-0.195,0.104-0.273,0.209c-0.077,0.103-0.116,0.168-0.195,0.207c-0.077,0.039-0.193,0-0.167-0.039c0.025-0.039-0.222-0.181-0.261-0.13c-0.04,0.052-0.155,0.091-0.272,0.144c-0.117,0.052-0.222-0.065-0.247-0.117s-0.079-0.064-0.091-0.234c-0.013-0.168,0.027-0.351,0.065-0.454c0.038-0.104-0.195-0.312-0.286-0.3c-0.091,0.015-0.182,0.105-0.272,0.091c-0.092-0.012-0.052-0.038-0.195-0.038c-0.143,0-0.026-0.025,0-0.143c0.025-0.116-0.052-0.273,0.092-0.377c0.142-0.104,0.091-0.351,0-0.363c-0.092-0.014-0.261,0.039-0.377,0.026c-0.116-0.014-0.208,0.091-0.169,0.207c0.039,0.117-0.065,0.195-0.104,0.183c-0.039-0.013-0.09-0.078-0.234,0.026c-0.142,0.103-0.194,0.064-0.337-0.052c-0.143-0.118-0.299-0.234-0.325-0.416c-0.026-0.182-0.04-0.364,0.013-0.468c0.051-0.104,0.051-0.285-0.026-0.312c-0.078-0.025,0.09-0.155,0.181-0.181c0.092-0.026,0.234-0.143,0.26-0.195c0.026-0.052,0.156-0.04,0.298-0.04c0.143,0,0.169,0,0.312,0.078c0.143,0.078,0.169-0.039,0.169-0.078c0-0.039,0.052-0.117,0.208-0.104c0.156,0.013,0.376-0.052,0.416-0.013s0.116,0.195,0.194,0.143c0.079-0.051,0.104-0.143,0.131,0.014c0.025,0.155,0.09,0.39,0.208,0.429c0.116,0.039,0.052,0.194,0.168,0.207c0.115,0.013,0.17-0.246,0.131-0.337c-0.04-0.09-0.118-0.363-0.183-0.428c-0.064-0.065-0.064-0.234,0.064-0.286c0.13-0.052,0.442-0.312,0.532-0.389c0.092-0.079,0.338-0.144,0.261-0.248c-0.078-0.104-0.104-0.168-0.104-0.247s0.078-0.052,0.117,0s0.194-0.078,0.155-0.143c-0.038-0.064-0.026-0.155,0.065-0.143c0.091,0.013,0.116-0.065,0.078-0.117c-0.039-0.052,0.091-0.117,0.182-0.091c0.092,0.026,0.325-0.013,0.364-0.065c0.038-0.052-0.078-0.104-0.078-0.208c0-0.104,0.155-0.195,0.247-0.208c0.091-0.013,0.207,0,0.221-0.039c0.012-0.039,0.143-0.143,0.155-0.052c0.014,0.091,0,0.247,0.104,0.247c0.104,0,0.232-0.117,0.272-0.129c0.038-0.013,0.286-0.065,0.338-0.078c0.052-0.013,0.363-0.039,0.325-0.13c-0.039-0.09-0.078-0.181-0.118-0.22c-0.039-0.039-0.077,0.013-0.13,0.078c-0.051,0.065-0.143,0.065-0.168,0.013c-0.026-0.051,0.012-0.207-0.078-0.156c-0.092,0.052-0.104,0.104-0.157,0.078c-0.052-0.026-0.103-0.117-0.103-0.117s0.129-0.064,0.038-0.182c-0.09-0.117-0.221-0.091-0.35-0.025c-0.13,0.064-0.118,0.051-0.273,0.09s-0.234,0.078-0.234,0.078s0.209-0.129,0.299-0.208c0.091-0.078,0.209-0.117,0.286-0.195c0.078-0.078,0.285,0.039,0.285,0.039s0.105-0.104,0.105-0.039s-0.027,0.234,0.051,0.234c0.079,0,0.299-0.104,0.21-0.131c-0.093-0.026,0.129,0,0.219-0.065c0.092-0.065,0.194-0.065,0.247-0.09c0.052-0.026,0.092-0.143,0.182-0.143c0.092,0,0.13,0.117,0,0.195s-0.143,0.273-0.208,0.325c-0.064,0.052-0.026,0.117,0.078,0.104c0.104-0.013,0.194,0.013,0.286-0.013s0.143,0.026,0.168,0.065c0.026,0.039,0.104-0.039,0.104-0.039s0.169-0.039,0.221,0.026c0.053,0.064,0.092-0.039,0.053-0.104c-0.039-0.064-0.092-0.129-0.13-0.208c-0.039-0.078-0.091-0.104-0.194-0.078c-0.104,0.026-0.13-0.026-0.195-0.064c-0.065-0.04-0.118,0.052-0.065-0.04c0.053-0.09,0.078-0.117,0.117-0.195c0.039-0.078,0.209-0.221,0.039-0.259c-0.169-0.04-0.222-0.065-0.247-0.143c-0.026-0.078-0.221-0.221-0.272-0.221c-0.053,0-0.233,0-0.247-0.065c-0.013-0.065-0.143-0.208-0.208-0.273c-0.064-0.065-0.312-0.351-0.351-0.377c-0.039-0.026-0.091-0.013-0.208,0.143c-0.116,0.157-0.22,0.183-0.312,0.144c-0.091-0.039-0.104-0.026-0.193-0.13c-0.093-0.104,0.09-0.117,0.051-0.182c-0.04-0.064-0.247-0.091-0.377-0.104c-0.13-0.013-0.221-0.156-0.416-0.169c-0.194-0.013-0.428,0.026-0.493,0.026c-0.064,0-0.064,0.091-0.09,0.234c-0.027,0.143,0.09,0.182-0.027,0.208c-0.116,0.026-0.169,0.039-0.052,0.091c0.117,0.052,0.273,0.26,0.273,0.26s0,0.117-0.092,0.182c-0.09,0.065-0.182,0.13-0.233,0.053c-0.053-0.079-0.195-0.065-0.155,0.013c0.038,0.078,0.116,0.117,0.116,0.195c0,0.077,0.117,0.272,0.039,0.337c-0.078,0.065-0.168,0.014-0.233,0.026s-0.131-0.104-0.078-0.13c0.051-0.026-0.014-0.221-0.014-0.221s-0.155,0.221-0.143,0.104c0.014-0.117-0.064-0.13-0.064-0.221c0-0.091-0.079-0.13-0.194-0.104c-0.118,0.026-0.26-0.04-0.482-0.079c-0.22-0.039-0.311-0.064-0.493-0.156c-0.182-0.091-0.247-0.026-0.338-0.013c-0.091,0.013-0.052-0.182-0.169-0.207c-0.116-0.027-0.181,0.025-0.207-0.144c-0.026-0.168,0.039-0.208,0.324-0.39c0.286-0.182,0.247-0.26,0.468-0.286c0.22-0.026,0.325,0.026,0.325-0.039s0.052-0.325,0.052-0.195S16.95,9.109,16.832,9.2c-0.116,0.091-0.052,0.104,0.04,0.104c0.091,0,0.259-0.091,0.259-0.091s0.208-0.091,0.26-0.013c0.053,0.078,0.053,0.156,0.144,0.156s0.285-0.104,0.116-0.195c-0.168-0.091-0.272-0.078-0.376-0.182s-0.078-0.065-0.195-0.039c-0.116,0.026-0.116-0.039-0.156-0.039s-0.104,0.026-0.13-0.026c-0.025-0.052,0.014-0.065,0.145-0.065c0.129,0,0.285,0.039,0.285,0.039s0.155-0.052,0.194-0.065c0.039-0.013,0.247-0.039,0.208-0.155c-0.04-0.117-0.169-0.117-0.208-0.156s0.078-0.09,0.143-0.117c0.065-0.026,0.247,0,0.247,0s0.117,0.013,0.117-0.039S17.897,8.2,17.976,8.239s0,0.156,0.117,0.13c0.116-0.026,0.143,0,0.207,0.039c0.065,0.039-0.013,0.195-0.077,0.221c-0.065,0.025-0.169,0.077-0.026,0.09c0.144,0.014,0.246,0.014,0.246,0.014s0.092-0.091,0.131-0.169c0.038-0.078,0.104-0.026,0.155,0c0.052,0.025,0.247,0.065,0.065,0.117c-0.183,0.052-0.221,0.117-0.26,0.182c-0.038,0.065-0.053,0.104-0.221,0.065c-0.17-0.039-0.26-0.026-0.299,0.039c-0.039,0.064-0.013,0.273,0.053,0.247c0.063-0.026,0.129-0.026,0.207-0.052c0.078-0.026,0.39,0.026,0.467,0.013c0.078-0.013,0.209,0.13,0.248,0.104c0.039-0.026,0.117,0.052,0.194,0.104c0.078,0.052,0.052-0.117,0.194-0.013c0.144,0.104,0.065,0.104,0.144,0.104c0.076,0,0.246,0.013,0.246,0.013s0.014-0.129,0.144-0.104c0.13,0.026,0.245,0.169,0.232,0.064c-0.012-0.103,0.013-0.181-0.09-0.259c-0.104-0.078-0.272-0.13-0.299-0.169c-0.026-0.039-0.052-0.091-0.013-0.117c0.039-0.025,0.221,0.013,0.324,0.079c0.104,0.065,0.195,0.13,0.273,0.078c0.077-0.052,0.17-0.078,0.208-0.117c0.038-0.04,0.13-0.156,0.13-0.156s-0.391-0.051-0.441-0.117c-0.053-0.065-0.235-0.156-0.287-0.156s-0.194,0.091-0.246-0.039s-0.052-0.286-0.105-0.299c-0.05-0.013-0.597-0.091-0.674-0.13c-0.078-0.039-0.39-0.13-0.507-0.195s-0.286-0.156-0.389-0.156c-0.104,0-0.533,0.052-0.611,0.039c-0.078-0.013-0.312,0.026-0.403,0.039c-0.091,0.013,0.117,0.182-0.077,0.221c-0.195,0.039-0.169,0.065-0.13-0.13c0.038-0.195-0.131-0.247-0.299-0.169c-0.169,0.078-0.442,0.13-0.377,0.221c0.065,0.091-0.012,0.157,0.117,0.247c0.13,0.091,0.183,0.117,0.35,0.104c0.17-0.013,0.339,0.025,0.339,0.025s0,0.157-0.064,0.182c-0.065,0.026-0.169,0.026-0.196,0.104c-0.025,0.078-0.155,0.117-0.155,0.078s0.065-0.169-0.026-0.234c-0.09-0.065-0.117-0.078-0.221-0.013c-0.104,0.065-0.116,0.091-0.169-0.013C16.053,8.291,15.897,8.2,15.897,8.2s-0.104-0.129-0.182-0.194c-0.077-0.065-0.22-0.052-0.234,0.013c-0.013,0.064,0.026,0.129,0.078,0.247c0.052,0.117,0.104,0.337,0.013,0.351c-0.091,0.013-0.104,0.026-0.195,0.052c-0.091,0.026-0.13-0.039-0.13-0.143s-0.04-0.195-0.013-0.234c0.026-0.039-0.104,0.027-0.234,0c-0.13-0.025-0.233,0.052-0.104,0.092c0.13,0.039,0.157,0.194,0.039,0.233c-0.117,0.039-0.559,0-0.702,0s-0.35,0.039-0.39-0.039c-0.039-0.078,0.118-0.129,0.208-0.129c0.091,0,0.363,0.012,0.467-0.13c0.104-0.143-0.13-0.169-0.233-0.169c-0.104,0-0.183-0.039-0.299-0.155c-0.118-0.117,0.078-0.195,0.052-0.247c-0.026-0.052-0.156-0.014-0.272-0.014c-0.117,0-0.299-0.09-0.299,0.014c0,0.104,0.143,0.402,0.052,0.337c-0.091-0.064-0.078-0.156-0.143-0.234c-0.065-0.078-0.168-0.065-0.299-0.052c-0.129,0.013-0.35,0.052-0.415,0.039c-0.064-0.013-0.013-0.013-0.156-0.078c-0.142-0.065-0.208-0.052-0.312-0.117C12.091,7.576,12.182,7.551,12,7.538c-0.181-0.013-0.168,0.09-0.35,0.065c-0.182-0.026-0.234,0.013-0.416,0c-0.182-0.013-0.272-0.026-0.299,0.065c-0.025,0.091-0.078,0.247-0.156,0.247c-0.077,0-0.169,0.091,0.078,0.104c0.247,0.013,0.105,0.129,0.325,0.117c0.221-0.013,0.416-0.013,0.468-0.117c0.052-0.104,0.091-0.104,0.117-0.065c0.025,0.039,0.22,0.272,0.22,0.272s0.131,0.104,0.183,0.13c0.051,0.026-0.052,0.143-0.156,0.078c-0.104-0.065-0.299-0.051-0.377-0.116c-0.078-0.065-0.429-0.065-0.52-0.052c-0.09,0.013-0.247-0.039-0.299-0.039c-0.051,0-0.221,0.13-0.221,0.13S10.532,8.252,10.494,8.2c-0.039-0.052-0.104,0.052-0.156,0.065c-0.052,0.013-0.208-0.104-0.364-0.052C9.818,8.265,9.87,8.317,9.649,8.304s-0.272-0.052-0.35-0.039C9.22,8.278,9.22,8.278,9.22,8.278S9.233,8.33,9.143,8.382C9.052,8.434,8.986,8.499,8.921,8.421C8.857,8.343,8.818,8.343,8.779,8.33c-0.04-0.013-0.118-0.078-0.286-0.04C8.324,8.33,8.064,8.239,8.013,8.239c-0.04,0-0.313-0.015-0.491-0.033c2.109-2.292,5.124-3.74,8.478-3.74c2.128,0,4.117,0.589,5.83,1.598c-0.117,0.072-0.319,0.06-0.388,0.023c-0.078-0.043-0.158-0.078-0.475-0.061c-0.317,0.018-0.665,0.122-0.595,0.226c0.072,0.104-0.142,0.165-0.197,0.113c-0.055-0.052-0.309,0.06-0.293,0.165c0.016,0.104-0.039,0.225-0.175,0.199c-0.134-0.027-0.229,0.06-0.237,0.146c-0.007,0.087-0.309,0.147-0.332,0.147c-0.024,0-0.412-0.008-0.27,0.095c0.097,0.069,0.15,0.027,0.27,0.052c0.119,0.026,0.214,0.217,0.277,0.243c0.062,0.026,0.15,0,0.189-0.052c0.04-0.052,0.095-0.234,0.095-0.234s0,0.173,0.097,0.208c0.095,0.035,0.331-0.026,0.395-0.017c0.064,0.008,0.437,0.061,0.538,0.112c0.104,0.052,0.356,0.087,0.428,0.199c0.071,0.113,0.08,0.503,0.119,0.546c0.04,0.043,0.174-0.139,0.205-0.182c0.031-0.044,0.198-0.018,0.254,0.042c0.056,0.061,0.182,0.208,0.175,0.269C21.9,8.365,21.877,8.459,21.83,8.425c-0.048-0.034-0.127-0.025-0.096-0.095c0.032-0.069,0.048-0.217-0.015-0.217c-0.064,0-0.119,0-0.119,0s-0.12-0.035-0.199,0.095s-0.015,0.26,0.04,0.26s0.184,0,0.184,0.034c0,0.035-0.136,0.139-0.128,0.2c0.009,0.061,0.11,0.268,0.144,0.312c0.031,0.043,0.197,0.086,0.244,0.096c0.049,0.008-0.111,0.017-0.07,0.077c0.04,0.061,0.102,0.208,0.189,0.243c0.087,0.035,0.333,0.19,0.363,0.26c0.032,0.069,0.222-0.052,0.262-0.061c0.04-0.008,0.032,0.182,0.143,0.191c0.11,0.008,0.15-0.018,0.245-0.096s0.072-0.182,0.079-0.26c0.009-0.078,0-0.138,0.104-0.113c0.104,0.026,0.158-0.018,0.15-0.104c-0.008-0.087-0.095-0.191,0.07-0.217c0.167-0.026,0.254-0.138,0.357-0.138c0.103,0,0.389,0.043,0.419,0c0.032-0.043,0.167-0.243,0.254-0.251c0.067-0.007,0.224-0.021,0.385-0.042c1.582,1.885,2.561,4.284,2.673,6.905c-0.118,0.159-0.012,0.305,0.021,0.408c0.001,0.03,0.005,0.058,0.005,0.088c0,0.136-0.016,0.269-0.021,0.404C27.512,16.406,27.512,16.408,27.51,16.41zM17.794,12.084c-0.064,0.013-0.169-0.052-0.169-0.143s-0.091,0.169-0.04,0.247c0.053,0.078-0.104,0.169-0.155,0.169s-0.091-0.116-0.078-0.233c0.014-0.117-0.077-0.221-0.221-0.208c-0.143,0.014-0.208,0.13-0.259,0.169c-0.053,0.039-0.053,0.259-0.04,0.312s0.013,0.235-0.116,0.221c-0.118-0.013-0.092-0.233-0.079-0.312c0.014-0.078-0.039-0.273,0.014-0.376c0.053-0.104,0.207-0.143,0.312-0.156s0.324,0.065,0.363,0.052c0.04-0.014,0.222-0.014,0.312,0C17.729,11.837,17.858,12.071,17.794,12.084zM18.027,12.123c0.04,0.026,0.311-0.039,0.364,0.026c0.051,0.065-0.054,0.078-0.183,0.13c-0.129,0.052-0.169,0.039-0.221,0.104s-0.221,0.09-0.299,0.168c-0.078,0.079-0.217,0.125-0.246,0.065c-0.04-0.078,0.013-0.039,0.025-0.078c0.013-0.039,0.245-0.129,0.245-0.129S17.988,12.097,18.027,12.123zM16.988,11.668c-0.038,0.013-0.182-0.026-0.3-0.026c-0.116,0-0.091-0.078-0.143-0.064c-0.051,0.013-0.168,0.039-0.247,0.078c-0.078,0.039-0.208,0.03-0.208-0.04c0-0.104,0.052-0.078,0.221-0.143c0.169-0.065,0.352-0.247,0.429-0.169c0.078,0.078,0.221,0.169,0.312,0.182C17.144,11.5,17.026,11.655,16.988,11.668zM15.659,7.637c-0.079,0.026-0.347,0.139-0.321,0.199c0.01,0.023,0.078,0.069,0.19,0.052c0.113-0.018,0.276-0.035,0.355-0.043c0.078-0.009,0.095-0.139,0.009-0.147C15.805,7.689,15.736,7.611,15.659,7.637zM14.698,7.741c-0.061,0.026-0.243-0.043-0.338,0.018c-0.061,0.038-0.026,0.164,0.07,0.172c0.095,0.009,0.259-0.06,0.276-0.008c0.018,0.052,0.078,0.286,0.234,0.208c0.156-0.078,0.147-0.147,0.19-0.156c0.043-0.009-0.008-0.199-0.078-0.243C14.983,7.689,14.758,7.715,14.698,7.741zM14.385,7.005c0.017,0.044-0.008,0.078,0.113,0.095c0.121,0.018,0.173,0.035,0.243,0.035c0.069,0,0.042-0.113-0.018-0.19c-0.061-0.078-0.043-0.069-0.199-0.113c-0.156-0.043-0.312-0.043-0.416-0.035c-0.104,0.009-0.217-0.017-0.243,0.104c-0.013,0.062,0.07,0.112,0.174,0.112S14.368,6.962,14.385,7.005zM14.611,7.481c0.043,0.095,0.043,0.051,0.165,0.061C14.896,7.551,14.991,7.421,15,7.378c0.009-0.044-0.061-0.13-0.225-0.113c-0.165,0.017-0.667-0.026-0.736,0.034c-0.066,0.058,0,0.233-0.026,0.251c-0.026,0.017,0.009,0.095,0.077,0.078c0.069-0.017,0.104-0.182,0.157-0.182C14.299,7.447,14.568,7.386,14.611,7.481zM12.982,7.126c0.052,0.043,0.183,0.008,0.173-0.035c-0.008-0.043,0.053-0.217-0.051-0.225C13,6.858,12.854,6.962,12.697,7.014c-0.101,0.033-0.078,0.13-0.009,0.13S12.931,7.083,12.982,7.126zM13.72,7.282c-0.087,0.043-0.114,0.069-0.191,0.052c-0.078-0.017-0.078-0.156-0.217-0.13c-0.138,0.026-0.164,0.104-0.207,0.139s-0.139,0.061-0.173,0.043c-0.034-0.017-0.234-0.129-0.234-0.129s-0.416-0.018-0.433-0.07c-0.017-0.052-0.086-0.138-0.277-0.121s-0.52,0.13-0.572,0.13c-0.052,0,0.062,0.104-0.009,0.104c-0.069,0-0.155-0.008-0.181,0.069c-0.018,0.053,0.078,0.052,0.189,0.052c0.112,0,0.295,0,0.347-0.026c0.052-0.026,0.312-0.087,0.303-0.009c-0.009,0.079,0.104,0.199,0.164,0.182c0.061-0.017,0.183-0.13,0.243-0.086c0.061,0.043,0.07,0.146,0.13,0.173c0.061,0.025,0.226,0.025,0.304,0c0.077-0.027,0.294-0.027,0.389-0.009c0.095,0.018,0.373,0.069,0.399,0.018c0.026-0.053,0.104-0.061,0.112-0.113s0.051-0.216,0.051-0.216S13.806,7.239,13.72,7.282zM18.105,16.239c-0.119,0.021-0.091,0.252,0.052,0.21C18.3,16.407,18.223,16.217,18.105,16.239zM19.235,15.929c-0.104-0.026-0.221,0-0.299,0.013c-0.078,0.013-0.299,0.208-0.299,0.208s0.143,0.026,0.233,0.026c0.092,0,0.144,0.051,0.221,0.09c0.078,0.04,0.221-0.052,0.272-0.052c0.053,0,0.118,0.156,0.131-0.013C19.508,16.032,19.339,15.955,19.235,15.929zM15.616,7.507c-0.043-0.104-0.259-0.139-0.304-0.035C15.274,7.563,15.659,7.611,15.616,7.507zM18.093,15.292c0.143-0.026,0.064-0.144-0.053-0.13C17.922,15.175,17.949,15.318,18.093,15.292zM19.82,16.095c-0.119,0.022-0.092,0.253,0.051,0.211C20.015,16.264,19.937,16.074,19.82,16.095zM18.247,15.708c-0.09,0.013-0.285-0.09-0.389-0.182c-0.104-0.091-0.299-0.091-0.377-0.091c-0.077,0-0.39,0.091-0.39,0.091c-0.013,0.13,0.117,0.091,0.273,0.091s0.429-0.026,0.479,0.039c0.053,0.064,0.286,0.168,0.352,0.221c0.064,0.052,0.272,0.065,0.285,0.013S18.338,15.695,18.247,15.708zM16.698,7.412c-0.13-0.009-0.295-0.009-0.399,0c-0.104,0.008-0.182-0.069-0.26-0.113c-0.077-0.043-0.251-0.182-0.354-0.199c-0.104-0.017-0.086-0.017-0.303-0.069c-0.11-0.027-0.294-0.061-0.294-0.086c0-0.026-0.052,0.121,0.043,0.165c0.095,0.043,0.251,0.121,0.363,0.164c0.114,0.043,0.329,0.052,0.399,0.139c0.069,0.086,0.303,0.156,0.303,0.156l0.277,0.026c0,0,0.191-0.043,0.39-0.026c0.199,0.017,0.493,0.043,0.659,0.035c0.163-0.008,0.189-0.061,0.208-0.095c0.016-0.035-0.304-0.104-0.383-0.095C17.271,7.42,16.827,7.42,16.698,7.412zM17.182,9.404c-0.034,0.039,0.157,0.095,0.191,0.043C17.407,9.396,17.271,9.309,17.182,9.404zM17.764,9.585c0.086-0.035,0.043-0.139-0.079-0.104C17.547,9.521,17.676,9.62,17.764,9.585z",
    warning : "M29.225,23.567l-3.778-6.542c-1.139-1.972-3.002-5.2-4.141-7.172l-3.778-6.542c-1.14-1.973-3.003-1.973-4.142,0L9.609,9.853c-1.139,1.972-3.003,5.201-4.142,7.172L1.69,23.567c-1.139,1.974-0.207,3.587,2.071,3.587h23.391C29.432,27.154,30.363,25.541,29.225,23.567zM16.536,24.58h-2.241v-2.151h2.241V24.58zM16.428,20.844h-2.023l-0.201-9.204h2.407L16.428,20.844z",
    code : "M8.982,7.107L0.322,15.77l8.661,8.662l3.15-3.15L6.621,15.77l5.511-5.511L8.982,7.107zM21.657,7.107l-3.148,3.151l5.511,5.511l-5.511,5.511l3.148,3.15l8.662-8.662L21.657,7.107z",
    pensil : "M25.31,2.872l-3.384-2.127c-0.854-0.536-1.979-0.278-2.517,0.576l-1.334,2.123l6.474,4.066l1.335-2.122C26.42,4.533,26.164,3.407,25.31,2.872zM6.555,21.786l6.474,4.066L23.581,9.054l-6.477-4.067L6.555,21.786zM5.566,26.952l-0.143,3.819l3.379-1.787l3.14-1.658l-6.246-3.925L5.566,26.952z",
    pen : "M13.587,12.074c-0.049-0.074-0.11-0.147-0.188-0.202c-0.333-0.243-0.803-0.169-1.047,0.166c-0.244,0.336-0.167,0.805,0.167,1.048c0.303,0.22,0.708,0.167,0.966-0.091l-7.086,9.768l-2.203,7.997l6.917-4.577L26.865,4.468l-4.716-3.42l-1.52,2.096c-0.087-0.349-0.281-0.676-0.596-0.907c-0.73-0.529-1.751-0.369-2.28,0.363C14.721,6.782,16.402,7.896,13.587,12.074zM10.118,25.148L6.56,27.503l1.133-4.117L10.118,25.148zM14.309,11.861c2.183-3.225,1.975-4.099,3.843-6.962c0.309,0.212,0.664,0.287,1.012,0.269L14.309,11.861z",
    plus : "M25.979,12.896 19.312,12.896 19.312,6.229 12.647,6.229 12.647,12.896 5.979,12.896 5.979,19.562 12.647,19.562 12.647,26.229 19.312,26.229 19.312,19.562 25.979,19.562z",
    minus : "M25.979,12.896,5.979,12.896,5.979,19.562,25.979,19.562z",
    tshirt : "M20.1,4.039c-0.681,1.677-2.32,2.862-4.24,2.862c-1.921,0-3.56-1.185-4.24-2.862L1.238,8.442l2.921,6.884l3.208-1.361V28h17.099V14.015l3.093,1.312l2.922-6.884L20.1,4.039z",
    sticker : "M15.5,1.999c-1.042,0-1.916,0.377-2.57,1.088L2.895,13.138C2.302,13.784,1.999,14.58,1.999,15.5C1.999,22.943,8.057,29,15.5,29S29,22.943,29,15.5S22.943,1.999,15.5,1.999zM15.5,28C8.596,28,3,22.404,3,15.5c0-3.452,5.239-2.737,7.501-4.999C12.762,8.239,12.048,3,15.5,3C22.404,3,28,8.597,28,15.5S22.404,28,15.5,28z",
    page2 : "M23.024,5.673c-1.744-1.694-3.625-3.051-5.168-3.236c-0.084-0.012-0.171-0.019-0.263-0.021H7.438c-0.162,0-0.322,0.063-0.436,0.18C6.889,2.71,6.822,2.87,6.822,3.033v25.75c0,0.162,0.063,0.317,0.18,0.435c0.117,0.116,0.271,0.179,0.436,0.179h18.364c0.162,0,0.317-0.062,0.434-0.179c0.117-0.117,0.182-0.272,0.182-0.435V11.648C26.382,9.659,24.824,7.49,23.024,5.673zM22.157,6.545c0.805,0.786,1.529,1.676,2.069,2.534c-0.468-0.185-0.959-0.322-1.42-0.431c-1.015-0.228-2.008-0.32-2.625-0.357c0.003-0.133,0.004-0.283,0.004-0.446c0-0.869-0.055-2.108-0.356-3.2c-0.003-0.01-0.005-0.02-0.009-0.03C20.584,5.119,21.416,5.788,22.157,6.545zM25.184,28.164H8.052V3.646h9.542v0.002c0.416-0.025,0.775,0.386,1.05,1.326c0.25,0.895,0.313,2.062,0.312,2.871c0.002,0.593-0.027,0.991-0.027,0.991l-0.049,0.652l0.656,0.007c0.003,0,1.516,0.018,3,0.355c1.426,0.308,2.541,0.922,2.645,1.617c0.004,0.062,0.005,0.124,0.004,0.182V28.164z",
    page : "M23.024,5.673c-1.744-1.694-3.625-3.051-5.168-3.236c-0.084-0.012-0.171-0.019-0.263-0.021H7.438c-0.162,0-0.322,0.063-0.436,0.18C6.889,2.71,6.822,2.87,6.822,3.033v25.75c0,0.162,0.063,0.317,0.18,0.435c0.117,0.116,0.271,0.179,0.436,0.179h18.364c0.162,0,0.317-0.062,0.434-0.179c0.117-0.117,0.182-0.272,0.182-0.435V11.648C26.382,9.659,24.824,7.49,23.024,5.673zM25.184,28.164H8.052V3.646h9.542v0.002c0.416-0.025,0.775,0.386,1.05,1.326c0.25,0.895,0.313,2.062,0.312,2.871c0.002,0.593-0.027,0.991-0.027,0.991l-0.049,0.652l0.656,0.007c0.003,0,1.516,0.018,3,0.355c1.426,0.308,2.541,0.922,2.645,1.617c0.004,0.062,0.005,0.124,0.004,0.182V28.164z",
    landscape1 : "M19.883,5.71H2.746c-0.163,0-0.319,0.071-0.435,0.188c-0.118,0.117-0.18,0.272-0.18,0.435v18.364c0,0.164,0.063,0.318,0.18,0.436c0.123,0.117,0.287,0.18,0.435,0.18h25.75c0.164,0,0.324-0.066,0.438-0.18c0.118-0.114,0.182-0.273,0.182-0.436V14.551c-0.002-0.102-0.01-0.188-0.021-0.271c-0.186-1.543-1.543-3.424-3.236-5.168C24.039,7.31,21.869,5.753,19.883,5.71zM26.914,12.314c-0.008-0.005-0.019-0.007-0.029-0.01c-1.092-0.293-2.33-0.355-3.199-0.355c-0.162,0-0.312,0.002-0.445,0.004c-0.037-0.604-0.129-1.604-0.356-2.625c-0.11-0.461-0.246-0.94-0.433-1.42c0.857,0.541,1.748,1.264,2.535,2.068C25.74,10.718,26.41,11.551,26.914,12.314zM3.365,6.947h16.517c0.058,0,0.12,0,0.183,0.004c0.694,0.105,1.307,1.221,1.616,2.646c0.335,1.484,0.354,2.997,0.354,3l0.007,0.656l0.651-0.051c0,0,0.398-0.027,0.99-0.025c0.809,0,1.977,0.062,2.871,0.312c0.939,0.275,1.352,0.635,1.326,1.051h0.002v9.542H3.365V6.951V6.947z",
    landscape2 : "M19.883,5.71H2.746c-0.163,0-0.319,0.071-0.435,0.188c-0.118,0.117-0.18,0.272-0.18,0.435v18.364c0,0.164,0.063,0.318,0.18,0.436c0.123,0.117,0.287,0.18,0.435,0.18h25.75c0.164,0,0.324-0.066,0.438-0.18c0.118-0.114,0.182-0.273,0.182-0.436V14.551c-0.002-0.102-0.01-0.188-0.021-0.271c-0.186-1.543-1.543-3.424-3.236-5.168C24.039,7.31,21.869,5.753,19.883,5.71zM3.365,6.947h16.517c0.058,0,0.12,0,0.183,0.004c0.694,0.105,1.307,1.221,1.616,2.646c0.335,1.484,0.354,2.997,0.354,3l0.007,0.656l0.651-0.051c0,0,0.398-0.027,0.99-0.025c0.809,0,1.977,0.062,2.871,0.312c0.939,0.275,1.352,0.635,1.326,1.051h0.002v9.542H3.365V6.951V6.947z",
    plugin : "M26.33,15.836l-3.893-1.545l3.136-7.9c0.28-0.705-0.064-1.505-0.771-1.785c-0.707-0.28-1.506,0.065-1.785,0.771l-3.136,7.9l-4.88-1.937l3.135-7.9c0.281-0.706-0.064-1.506-0.77-1.786c-0.706-0.279-1.506,0.065-1.785,0.771l-3.136,7.9L8.554,8.781l-1.614,4.066l2.15,0.854l-2.537,6.391c-0.61,1.54,0.143,3.283,1.683,3.895l1.626,0.646L8.985,26.84c-0.407,1.025,0.095,2.188,1.122,2.596l0.93,0.369c1.026,0.408,2.188-0.095,2.596-1.121l0.877-2.207l1.858,0.737c1.54,0.611,3.284-0.142,3.896-1.682l2.535-6.391l1.918,0.761L26.33,15.836z",
    bookmark : "M17.396,1.841L6.076,25.986l7.341-4.566l1.186,8.564l11.32-24.146L17.396,1.841zM19.131,9.234c-0.562-0.264-0.805-0.933-0.541-1.495c0.265-0.562,0.934-0.805,1.496-0.541s0.805,0.934,0.541,1.496S19.694,9.498,19.131,9.234z",
    hammer : "M7.831,29.354c0.685,0.353,1.62,1.178,2.344,0.876c0.475-0.195,0.753-1.301,1.048-1.883c2.221-4.376,4.635-9.353,6.392-13.611c0-0.19,0.101-0.337-0.049-0.595c0.983-1.6,1.65-3.358,2.724-5.138c0.34-0.566,0.686-1.351,1.163-1.577l0.881-0.368c1.12-0.288,1.938-0.278,2.719,0.473c0.396,0.383,0.578,1.015,0.961,1.395c0.259,0.26,1.246,0.899,1.613,0.8c0.285-0.077,0.52-0.364,0.72-0.728l0.696-1.286c0.195-0.366,0.306-0.718,0.215-0.999c-0.117-0.362-1.192-0.84-1.552-0.915c-0.528-0.113-1.154,0.081-1.692-0.041c-1.057-0.243-1.513-0.922-1.883-2.02c-2.608-1.533-6.119-2.53-10.207-1.244c-1.109,0.349-2.172,0.614-2.901,1.323c-0.146,0.412,0.143,0.494,0.446,0.489c-0.237,0.216-0.62,0.341-0.399,0.848c2.495-1.146,7.34-1.542,7.669,0.804c0.072,0.522-0.395,1.241-0.682,1.835c-0.905,1.874-2.011,3.394-2.813,5.091c-0.298,0.017-0.366,0.18-0.525,0.287c-2.604,3.8-5.451,8.541-7.9,12.794c-0.326,0.566-1.098,1.402-1.002,1.906C5.961,28.641,7.146,29,7.831,29.354z",
    users : "M21.053,20.8c-1.132-0.453-1.584-1.698-1.584-1.698s-0.51,0.282-0.51-0.51s0.51,0.51,1.02-2.548c0,0,1.414-0.397,1.132-3.68h-0.34c0,0,0.849-3.51,0-4.699c-0.85-1.189-1.189-1.981-3.058-2.548s-1.188-0.454-2.547-0.396c-1.359,0.057-2.492,0.792-2.492,1.188c0,0-0.849,0.057-1.188,0.397c-0.34,0.34-0.906,1.924-0.906,2.321s0.283,3.058,0.566,3.624l-0.337,0.113c-0.283,3.283,1.132,3.68,1.132,3.68c0.509,3.058,1.019,1.756,1.019,2.548s-0.51,0.51-0.51,0.51s-0.452,1.245-1.584,1.698c-1.132,0.452-7.416,2.886-7.927,3.396c-0.511,0.511-0.453,2.888-0.453,2.888h26.947c0,0,0.059-2.377-0.452-2.888C28.469,23.686,22.185,21.252,21.053,20.8zM8.583,20.628c-0.099-0.18-0.148-0.31-0.148-0.31s-0.432,0.239-0.432-0.432s0.432,0.432,0.864-2.159c0,0,1.199-0.336,0.959-3.119H9.538c0,0,0.143-0.591,0.237-1.334c-0.004-0.308,0.006-0.636,0.037-0.996l0.038-0.426c-0.021-0.492-0.107-0.939-0.312-1.226C8.818,9.619,8.53,8.947,6.947,8.467c-1.583-0.48-1.008-0.385-2.159-0.336C3.636,8.179,2.676,8.802,2.676,9.139c0,0-0.72,0.048-1.008,0.336c-0.271,0.271-0.705,1.462-0.757,1.885v0.281c0.047,0.653,0.258,2.449,0.469,2.872l-0.286,0.096c-0.239,2.783,0.959,3.119,0.959,3.119c0.432,2.591,0.864,1.488,0.864,2.159s-0.432,0.432-0.432,0.432s-0.383,1.057-1.343,1.439c-0.061,0.024-0.139,0.056-0.232,0.092v5.234h0.575c-0.029-1.278,0.077-2.927,0.746-3.594C2.587,23.135,3.754,22.551,8.583,20.628zM30.913,11.572c-0.04-0.378-0.127-0.715-0.292-0.946c-0.719-1.008-1.008-1.679-2.59-2.159c-1.584-0.48-1.008-0.385-2.16-0.336C24.72,8.179,23.76,8.802,23.76,9.139c0,0-0.719,0.048-1.008,0.336c-0.271,0.272-0.709,1.472-0.758,1.891h0.033l0.08,0.913c0.02,0.231,0.022,0.436,0.027,0.645c0.09,0.666,0.21,1.35,0.33,1.589l-0.286,0.096c-0.239,2.783,0.96,3.119,0.96,3.119c0.432,2.591,0.863,1.488,0.863,2.159s-0.432,0.432-0.432,0.432s-0.053,0.142-0.163,0.338c4.77,1.9,5.927,2.48,6.279,2.834c0.67,0.667,0.775,2.315,0.746,3.594h0.48v-5.306c-0.016-0.006-0.038-0.015-0.052-0.021c-0.959-0.383-1.343-1.439-1.343-1.439s-0.433,0.239-0.433-0.432s0.433,0.432,0.864-2.159c0,0,0.804-0.229,0.963-1.841v-1.227c-0.001-0.018-0.001-0.033-0.003-0.051h-0.289c0,0,0.215-0.89,0.292-1.861V11.572z",
    user : "M20.771,12.364c0,0,0.849-3.51,0-4.699c-0.85-1.189-1.189-1.981-3.058-2.548s-1.188-0.454-2.547-0.396c-1.359,0.057-2.492,0.792-2.492,1.188c0,0-0.849,0.057-1.188,0.397c-0.34,0.34-0.906,1.924-0.906,2.321s0.283,3.058,0.566,3.624l-0.337,0.113c-0.283,3.283,1.132,3.68,1.132,3.68c0.509,3.058,1.019,1.756,1.019,2.548s-0.51,0.51-0.51,0.51s-0.452,1.245-1.584,1.698c-1.132,0.452-7.416,2.886-7.927,3.396c-0.511,0.511-0.453,2.888-0.453,2.888h26.947c0,0,0.059-2.377-0.452-2.888c-0.512-0.511-6.796-2.944-7.928-3.396c-1.132-0.453-1.584-1.698-1.584-1.698s-0.51,0.282-0.51-0.51s0.51,0.51,1.02-2.548c0,0,1.414-0.397,1.132-3.68H20.771z",
    customer : "M28.523,23.813c-0.518-0.51-6.795-2.938-7.934-3.396c-1.132-0.451-1.584-1.697-1.584-1.697s-0.51,0.282-0.51-0.51c0-0.793,0.51,0.51,1.021-2.548c0,0,1.414-0.397,1.133-3.68l-0.338,0.001c0,0,0.85-3.511,0-4.699c-0.854-1.188-1.188-1.981-3.062-2.548c-1.869-0.567-1.188-0.454-2.547-0.396c-1.359,0.057-2.492,0.793-2.492,1.188c0,0-0.849,0.057-1.188,0.397c-0.34,0.34-0.906,1.924-0.906,2.32s0.283,3.059,0.566,3.624l-0.337,0.112c-0.283,3.283,1.132,3.681,1.132,3.681c0.509,3.058,1.019,1.755,1.019,2.548c0,0.792-0.51,0.51-0.51,0.51s-0.452,1.246-1.584,1.697c-1.132,0.453-7.416,2.887-7.927,3.396c-0.511,0.521-0.453,2.896-0.453,2.896h12.036l0.878-3.459l-0.781-0.781l1.344-1.344l1.344,1.344l-0.781,0.781l0.879,3.459h12.035C28.977,26.709,29.039,24.332,28.523,23.813z",
    employee : "M28.523,23.813c-0.518-0.51-6.795-2.938-7.934-3.396c-1.132-0.451-1.584-1.697-1.584-1.697s-0.51,0.282-0.51-0.51c0-0.793,0.51,0.51,1.021-2.548c0,0,1.414-0.397,1.133-3.68l-0.338,0.001c0,0,0.85-3.511,0-4.699c-0.854-1.188-1.188-1.981-3.062-2.548c-1.869-0.567-1.188-0.454-2.547-0.396c-1.359,0.057-2.492,0.793-2.492,1.188c0,0-0.849,0.057-1.188,0.397c-0.34,0.34-0.906,1.924-0.906,2.32s0.283,3.059,0.566,3.624l-0.337,0.112c-0.283,3.283,1.132,3.681,1.132,3.681c0.509,3.058,1.019,1.755,1.019,2.548c0,0.792-0.51,0.51-0.51,0.51s-0.452,1.246-1.584,1.697c-1.132,0.453-7.416,2.887-7.927,3.396c-0.511,0.521-0.453,2.896-0.453,2.896h26.954C28.977,26.709,29.039,24.332,28.523,23.813zM22.188,26.062h-4.562v-1.25h4.562V26.062z",
    anonymous : "M28.523,23.813c-0.518-0.51-6.795-2.938-7.934-3.396c-1.132-0.451-1.584-1.697-1.584-1.697s-0.51,0.282-0.51-0.51c0-0.793,0.51,0.51,1.021-2.548c0,0,1.414-0.397,1.133-3.68l-0.338,0.001c0,0,0.85-3.511,0-4.699c-0.854-1.188-1.188-1.981-3.062-2.548c-1.869-0.567-1.188-0.454-2.547-0.396c-1.359,0.057-2.492,0.793-2.492,1.188c0,0-0.849,0.057-1.188,0.397c-0.34,0.34-0.906,1.924-0.906,2.32s0.283,3.059,0.566,3.624l-0.337,0.112c-0.283,3.283,1.132,3.681,1.132,3.681c0.509,3.058,1.019,1.755,1.019,2.548c0,0.792-0.51,0.51-0.51,0.51s-0.452,1.246-1.584,1.697c-1.132,0.453-7.416,2.887-7.927,3.396c-0.511,0.521-0.453,2.896-0.453,2.896h26.954C28.977,26.709,29.039,24.332,28.523,23.813zM16.618,13.693c-0.398-0.251-0.783-1.211-0.783-1.64c0-0.133,0-0.236,0-0.236c-0.105-0.106-0.574-0.096-0.67,0c0,0,0,0.104,0,0.236c0,0.429-0.385,1.389-0.783,1.64c-0.399,0.251-1.611,0.237-2.084-0.236c-0.473-0.473-0.524-1.663-0.643-1.78c-0.118-0.119-0.185-0.185-0.185-0.185l0.029-0.414c0,0,0.842-0.207,1.699-0.207s1.803,0.502,1.803,0.502c0.231-0.074,0.784-0.083,0.996,0c0,0,0.945-0.502,1.803-0.502s1.699,0.207,1.699,0.207l0.029,0.414c0,0-0.066,0.066-0.185,0.185c-0.118,0.118-0.169,1.308-0.643,1.78C18.229,13.93,17.018,13.944,16.618,13.693z",
    skull : "M25.947,11.14c0-5.174-3.979-9.406-10.613-9.406c-6.633,0-10.282,4.232-10.282,9.406c0,5.174,1.459,4.511,1.459,7.43c0,1.095-1.061,0.564-1.061,2.919c0,2.587,3.615,2.223,4.677,3.283c1.061,1.062,0.961,3.019,0.961,3.019s0.199,0.796,0.564,0.563c0,0,0.232,0.564,0.498,0.232c0,0,0.265,0.563,0.531,0.1c0,0,0.265,0.631,0.696,0.166c0,0,0.431,0.63,0.929,0.133c0,0,0.564,0.53,1.194,0.133c0.63,0.397,1.194-0.133,1.194-0.133c0.497,0.497,0.929-0.133,0.929-0.133c0.432,0.465,0.695-0.166,0.695-0.166c0.268,0.464,0.531-0.1,0.531-0.1c0.266,0.332,0.498-0.232,0.498-0.232c0.365,0.232,0.564-0.563,0.564-0.563s-0.1-1.957,0.961-3.019c1.062-1.061,4.676-0.696,4.676-3.283c0-2.354-1.061-1.824-1.061-2.919C24.488,15.651,25.947,16.314,25.947,11.14zM10.333,20.992c-1.783,0.285-2.59-0.215-2.785-1.492c-0.508-3.328,2.555-3.866,4.079-3.683c0.731,0.088,1.99,0.862,1.99,1.825C13.617,20.229,11.992,20.727,10.333,20.992zM16.461,25.303c-0.331,0-0.862-0.431-0.895-1.227c-0.033,0.796-0.63,1.227-0.961,1.227c-0.332,0-0.83-0.331-0.863-1.127c-0.033-0.796,1.028-4.013,1.792-4.013c0.762,0,1.824,3.217,1.791,4.013S16.794,25.303,16.461,25.303zM23.361,19.5c-0.195,1.277-1.004,1.777-2.787,1.492c-1.658-0.266-3.283-0.763-3.283-3.35c0-0.963,1.258-1.737,1.99-1.825C20.805,15.634,23.869,16.172,23.361,19.5z",
    mail : "M28.516,7.167H3.482l12.517,7.108L28.516,7.167zM16.74,17.303C16.51,17.434,16.255,17.5,16,17.5s-0.51-0.066-0.741-0.197L2.5,10.06v14.773h27V10.06L16.74,17.303z",
    picture : "M2.5,4.833v22.334h27V4.833H2.5zM25.25,25.25H6.75V6.75h18.5V25.25zM11.25,14c1.426,0,2.583-1.157,2.583-2.583c0-1.427-1.157-2.583-2.583-2.583c-1.427,0-2.583,1.157-2.583,2.583C8.667,12.843,9.823,14,11.25,14zM24.251,16.25l-4.917-4.917l-6.917,6.917L10.5,16.333l-2.752,2.752v5.165h16.503V16.25z",
    bubble : "M16,5.333c-7.732,0-14,4.701-14,10.5c0,1.982,0.741,3.833,2.016,5.414L2,25.667l5.613-1.441c2.339,1.317,5.237,2.107,8.387,2.107c7.732,0,14-4.701,14-10.5C30,10.034,23.732,5.333,16,5.333z",
    codetalk : "M16,4.938c-7.732,0-14,4.701-14,10.5c0,1.981,0.741,3.833,2.016,5.414L2,25.272l5.613-1.44c2.339,1.316,5.237,2.106,8.387,2.106c7.732,0,14-4.701,14-10.5S23.732,4.938,16,4.938zM13.704,19.47l-2.338,2.336l-6.43-6.431l6.429-6.432l2.339,2.341l-4.091,4.091L13.704,19.47zM20.775,21.803l-2.337-2.339l4.092-4.09l-4.092-4.092l2.337-2.339l6.43,6.426L20.775,21.803z",
    talkq : "M16,4.938c-7.732,0-14,4.701-14,10.5c0,1.981,0.741,3.833,2.016,5.414L2,25.272l5.613-1.44c2.339,1.316,5.237,2.106,8.387,2.106c7.732,0,14-4.701,14-10.5S23.732,4.938,16,4.938zM16.868,21.375h-1.969v-1.889h1.969V21.375zM16.772,18.094h-1.777l-0.176-8.083h2.113L16.772,18.094z",
    talke : "M16,4.938c-7.732,0-14,4.701-14,10.5c0,1.981,0.741,3.833,2.016,5.414L2,25.272l5.613-1.44c2.339,1.316,5.237,2.106,8.387,2.106c7.732,0,14-4.701,14-10.5S23.732,4.938,16,4.938zM16.982,21.375h-1.969v-1.889h1.969V21.375zM16.982,17.469v0.625h-1.969v-0.769c0-2.321,2.641-2.689,2.641-4.337c0-0.752-0.672-1.329-1.553-1.329c-0.912,0-1.713,0.672-1.713,0.672l-1.12-1.393c0,0,1.104-1.153,3.009-1.153c1.81,0,3.49,1.121,3.49,3.009C19.768,15.437,16.982,15.741,16.982,17.469z",
    home : "M27.812,16l-3.062-3.062V5.625h-2.625v4.688L16,4.188L4.188,16L7,15.933v11.942h17.875V16H27.812zM16,26.167h-5.833v-7H16V26.167zM21.667,23.167h-3.833v-4.042h3.833V23.167z",
    lock : "M24.875,15.334v-4.876c0-4.894-3.981-8.875-8.875-8.875s-8.875,3.981-8.875,8.875v4.876H5.042v15.083h21.916V15.334H24.875zM10.625,10.458c0-2.964,2.411-5.375,5.375-5.375s5.375,2.411,5.375,5.375v4.876h-10.75V10.458zM18.272,26.956h-4.545l1.222-3.667c-0.782-0.389-1.324-1.188-1.324-2.119c0-1.312,1.063-2.375,2.375-2.375s2.375,1.062,2.375,2.375c0,0.932-0.542,1.73-1.324,2.119L18.272,26.956z",
    unlock : "M24.875,15.334v-4.876c0-4.894-3.981-8.875-8.875-8.875s-8.875,3.981-8.875,8.875v0.375h3.5v-0.375c0-2.964,2.411-5.375,5.375-5.375s5.375,2.411,5.375,5.375v4.876H5.042v15.083h21.916V15.334H24.875zM18.272,26.956h-4.545l1.222-3.667c-0.782-0.389-1.324-1.188-1.324-2.119c0-1.312,1.063-2.375,2.375-2.375s2.375,1.062,2.375,2.375c0,0.932-0.542,1.73-1.324,2.119L18.272,26.956z",
    clip : "M23.898,6.135c-1.571-1.125-3.758-0.764-4.884,0.808l-8.832,12.331c-0.804,1.122-0.546,2.684,0.577,3.488c1.123,0.803,2.684,0.545,3.488-0.578l6.236-8.706l-0.813-0.583l-6.235,8.707h0c-0.483,0.672-1.42,0.828-2.092,0.347c-0.673-0.481-0.827-1.419-0.345-2.093h0l8.831-12.33l0.001-0.001l-0.002-0.001c0.803-1.119,2.369-1.378,3.489-0.576c1.12,0.803,1.379,2.369,0.577,3.489v-0.001l-9.68,13.516l0.001,0.001c-1.124,1.569-3.316,1.931-4.885,0.808c-1.569-1.125-1.93-3.315-0.807-4.885l7.035-9.822l-0.813-0.582l-7.035,9.822c-1.447,2.02-0.982,4.83,1.039,6.277c2.021,1.448,4.831,0.982,6.278-1.037l9.68-13.516C25.83,9.447,25.47,7.261,23.898,6.135z",
    star : "M16,22.375L7.116,28.83l3.396-10.438l-8.883-6.458l10.979,0.002L16.002,1.5l3.391,10.434h10.981l-8.886,6.457l3.396,10.439L16,22.375L16,22.375z",
    staroff : "M16,22.375L7.116,28.83l3.396-10.438l-8.883-6.458l10.979,0.002L16.002,1.5l3.391,10.434h10.981l-8.886,6.457l3.396,10.439L16,22.375L16,22.375zM22.979,26.209l-2.664-8.205l6.979-5.062h-8.627L16,4.729l-2.666,8.206H4.708l6.979,5.07l-2.666,8.203L16,21.146L22.979,26.209L22.979,26.209z",
    star2 : "M14.615,4.928c0.487-0.986,1.284-0.986,1.771,0l2.249,4.554c0.486,0.986,1.775,1.923,2.864,2.081l5.024,0.73c1.089,0.158,1.335,0.916,0.547,1.684l-3.636,3.544c-0.788,0.769-1.28,2.283-1.095,3.368l0.859,5.004c0.186,1.085-0.459,1.553-1.433,1.041l-4.495-2.363c-0.974-0.512-2.567-0.512-3.541,0l-4.495,2.363c-0.974,0.512-1.618,0.044-1.432-1.041l0.858-5.004c0.186-1.085-0.307-2.6-1.094-3.368L3.93,13.977c-0.788-0.768-0.542-1.525,0.547-1.684l5.026-0.73c1.088-0.158,2.377-1.095,2.864-2.081L14.615,4.928z",
    star2off : "M26.522,12.293l-5.024-0.73c-1.089-0.158-2.378-1.095-2.864-2.081l-2.249-4.554c-0.487-0.986-1.284-0.986-1.771,0l-2.247,4.554c-0.487,0.986-1.776,1.923-2.864,2.081l-5.026,0.73c-1.088,0.158-1.334,0.916-0.547,1.684l3.637,3.544c0.788,0.769,1.28,2.283,1.094,3.368l-0.858,5.004c-0.186,1.085,0.458,1.553,1.432,1.041l4.495-2.363c0.974-0.512,2.566-0.512,3.541,0l4.495,2.363c0.974,0.512,1.618,0.044,1.433-1.041l-0.859-5.004c-0.186-1.085,0.307-2.6,1.095-3.368l3.636-3.544C27.857,13.209,27.611,12.452,26.522,12.293zM22.037,16.089c-1.266,1.232-1.966,3.394-1.67,5.137l0.514,2.984l-2.679-1.409c-0.757-0.396-1.715-0.612-2.702-0.612s-1.945,0.216-2.7,0.61l-2.679,1.409l0.511-2.982c0.297-1.743-0.404-3.905-1.671-5.137l-2.166-2.112l2.995-0.435c1.754-0.255,3.592-1.591,4.373-3.175L15.5,7.652l1.342,2.716c0.781,1.583,2.617,2.92,4.369,3.173l2.992,0.435L22.037,16.089z",
    star3 : "M22.441,28.181c-0.419,0-0.835-0.132-1.189-0.392l-5.751-4.247L9.75,27.789c-0.354,0.26-0.771,0.392-1.189,0.392c-0.412,0-0.824-0.128-1.175-0.384c-0.707-0.511-1-1.422-0.723-2.25l2.26-6.783l-5.815-4.158c-0.71-0.509-1.009-1.416-0.74-2.246c0.268-0.826,1.037-1.382,1.904-1.382c0.004,0,0.01,0,0.014,0l7.15,0.056l2.157-6.816c0.262-0.831,1.035-1.397,1.906-1.397s1.645,0.566,1.906,1.397l2.155,6.816l7.15-0.056c0.004,0,0.01,0,0.015,0c0.867,0,1.636,0.556,1.903,1.382c0.271,0.831-0.028,1.737-0.739,2.246l-5.815,4.158l2.263,6.783c0.276,0.826-0.017,1.737-0.721,2.25C23.268,28.053,22.854,28.181,22.441,28.181L22.441,28.181z",
    star3off : "M28.631,12.359c-0.268-0.826-1.036-1.382-1.903-1.382h-0.015l-7.15,0.056l-2.155-6.816c-0.262-0.831-1.035-1.397-1.906-1.397s-1.645,0.566-1.906,1.397l-2.157,6.816l-7.15-0.056H4.273c-0.868,0-1.636,0.556-1.904,1.382c-0.27,0.831,0.029,1.737,0.74,2.246l5.815,4.158l-2.26,6.783c-0.276,0.828,0.017,1.739,0.723,2.25c0.351,0.256,0.763,0.384,1.175,0.384c0.418,0,0.834-0.132,1.189-0.392l5.751-4.247l5.751,4.247c0.354,0.26,0.771,0.392,1.189,0.392c0.412,0,0.826-0.128,1.177-0.384c0.704-0.513,0.997-1.424,0.721-2.25l-2.263-6.783l5.815-4.158C28.603,14.097,28.901,13.19,28.631,12.359zM19.712,17.996l2.729,8.184l-6.94-5.125L8.56,26.18l2.729-8.184l-7.019-5.018l8.627,0.066L15.5,4.82l2.603,8.225l8.627-0.066L19.712,17.996z",
    chat : "M15.985,5.972c-7.563,0-13.695,4.077-13.695,9.106c0,2.877,2.013,5.44,5.147,7.108c-0.446,1.479-1.336,3.117-3.056,4.566c0,0,4.015-0.266,6.851-3.143c0.163,0.04,0.332,0.07,0.497,0.107c-0.155-0.462-0.246-0.943-0.246-1.443c0-3.393,3.776-6.05,8.599-6.05c3.464,0,6.379,1.376,7.751,3.406c1.168-1.34,1.847-2.892,1.847-4.552C29.68,10.049,23.548,5.972,15.985,5.972zM27.68,22.274c0-2.79-3.401-5.053-7.599-5.053c-4.196,0-7.599,2.263-7.599,5.053c0,2.791,3.403,5.053,7.599,5.053c0.929,0,1.814-0.116,2.637-0.319c1.573,1.597,3.801,1.744,3.801,1.744c-0.954-0.804-1.447-1.713-1.695-2.534C26.562,25.293,27.68,23.871,27.68,22.274z",
    quote : "M14.505,5.873c-3.937,2.52-5.904,5.556-5.904,9.108c0,1.104,0.192,1.656,0.576,1.656l0.396-0.107c0.312-0.12,0.563-0.18,0.756-0.18c1.128,0,2.07,0.411,2.826,1.229c0.756,0.82,1.134,1.832,1.134,3.037c0,1.157-0.408,2.14-1.224,2.947c-0.816,0.807-1.801,1.211-2.952,1.211c-1.608,0-2.935-0.661-3.979-1.984c-1.044-1.321-1.565-2.98-1.565-4.977c0-2.259,0.443-4.327,1.332-6.203c0.888-1.875,2.243-3.57,4.067-5.085c1.824-1.514,2.988-2.272,3.492-2.272c0.336,0,0.612,0.162,0.828,0.486c0.216,0.324,0.324,0.606,0.324,0.846L14.505,5.873zM27.465,5.873c-3.937,2.52-5.904,5.556-5.904,9.108c0,1.104,0.192,1.656,0.576,1.656l0.396-0.107c0.312-0.12,0.563-0.18,0.756-0.18c1.104,0,2.04,0.411,2.808,1.229c0.769,0.82,1.152,1.832,1.152,3.037c0,1.157-0.408,2.14-1.224,2.947c-0.816,0.807-1.801,1.211-2.952,1.211c-1.608,0-2.935-0.661-3.979-1.984c-1.044-1.321-1.565-2.98-1.565-4.977c0-2.284,0.449-4.369,1.35-6.256c0.9-1.887,2.256-3.577,4.068-5.067c1.812-1.49,2.97-2.236,3.474-2.236c0.336,0,0.612,0.162,0.828,0.486c0.216,0.324,0.324,0.606,0.324,0.846L27.465,5.873z",
    gear : "M26.974,16.514l3.765-1.991c-0.074-0.738-0.217-1.454-0.396-2.157l-4.182-0.579c-0.362-0.872-0.84-1.681-1.402-2.423l1.594-3.921c-0.524-0.511-1.09-0.977-1.686-1.406l-3.551,2.229c-0.833-0.438-1.73-0.77-2.672-0.984l-1.283-3.976c-0.364-0.027-0.728-0.056-1.099-0.056s-0.734,0.028-1.099,0.056l-1.271,3.941c-0.967,0.207-1.884,0.543-2.738,0.986L7.458,4.037C6.863,4.466,6.297,4.932,5.773,5.443l1.55,3.812c-0.604,0.775-1.11,1.629-1.49,2.55l-4.05,0.56c-0.178,0.703-0.322,1.418-0.395,2.157l3.635,1.923c0.041,1.013,0.209,1.994,0.506,2.918l-2.742,3.032c0.319,0.661,0.674,1.303,1.085,1.905l4.037-0.867c0.662,0.72,1.416,1.351,2.248,1.873l-0.153,4.131c0.663,0.299,1.352,0.549,2.062,0.749l2.554-3.283C15.073,26.961,15.532,27,16,27c0.507,0,1.003-0.046,1.491-0.113l2.567,3.301c0.711-0.2,1.399-0.45,2.062-0.749l-0.156-4.205c0.793-0.513,1.512-1.127,2.146-1.821l4.142,0.889c0.411-0.602,0.766-1.243,1.085-1.905l-2.831-3.131C26.778,18.391,26.93,17.467,26.974,16.514zM20.717,21.297l-1.785,1.162l-1.098-1.687c-0.571,0.22-1.186,0.353-1.834,0.353c-2.831,0-5.125-2.295-5.125-5.125c0-2.831,2.294-5.125,5.125-5.125c2.83,0,5.125,2.294,5.125,5.125c0,1.414-0.573,2.693-1.499,3.621L20.717,21.297z",
    smallgear : "M31.229,17.736c0.064-0.571,0.104-1.148,0.104-1.736s-0.04-1.166-0.104-1.737l-4.377-1.557c-0.218-0.716-0.504-1.401-0.851-2.05l1.993-4.192c-0.725-0.91-1.549-1.734-2.458-2.459l-4.193,1.994c-0.647-0.347-1.334-0.632-2.049-0.849l-1.558-4.378C17.165,0.708,16.588,0.667,16,0.667s-1.166,0.041-1.737,0.105L12.707,5.15c-0.716,0.217-1.401,0.502-2.05,0.849L6.464,4.005C5.554,4.73,4.73,5.554,4.005,6.464l1.994,4.192c-0.347,0.648-0.632,1.334-0.849,2.05l-4.378,1.557C0.708,14.834,0.667,15.412,0.667,16s0.041,1.165,0.105,1.736l4.378,1.558c0.217,0.715,0.502,1.401,0.849,2.049l-1.994,4.193c0.725,0.909,1.549,1.733,2.459,2.458l4.192-1.993c0.648,0.347,1.334,0.633,2.05,0.851l1.557,4.377c0.571,0.064,1.148,0.104,1.737,0.104c0.588,0,1.165-0.04,1.736-0.104l1.558-4.377c0.715-0.218,1.399-0.504,2.049-0.851l4.193,1.993c0.909-0.725,1.733-1.549,2.458-2.458l-1.993-4.193c0.347-0.647,0.633-1.334,0.851-2.049L31.229,17.736zM16,20.871c-2.69,0-4.872-2.182-4.872-4.871c0-2.69,2.182-4.872,4.872-4.872c2.689,0,4.871,2.182,4.871,4.872C20.871,18.689,18.689,20.871,16,20.871z",
    wrench : "M26.834,14.693c1.816-2.088,2.181-4.938,1.193-7.334l-3.646,4.252l-3.594-0.699L19.596,7.45l3.637-4.242c-2.502-0.63-5.258,0.13-7.066,2.21c-1.907,2.193-2.219,5.229-1.039,7.693L5.624,24.04c-1.011,1.162-0.888,2.924,0.274,3.935c1.162,1.01,2.924,0.888,3.935-0.274l9.493-10.918C21.939,17.625,24.918,16.896,26.834,14.693z",
    wrench2 : "M24.946,9.721l-2.872-0.768l-0.771-2.874l3.188-3.231c-1.992-0.653-4.268-0.192-5.848,1.391c-1.668,1.668-2.095,4.111-1.279,6.172l-3.476,3.478l-3.478,3.478c-2.062-0.816-4.504-0.391-6.173,1.277c-1.583,1.581-2.043,3.856-1.39,5.849l3.231-3.188l2.874,0.77l0.769,2.872l-3.239,3.197c1.998,0.665,4.288,0.207,5.876-1.384c1.678-1.678,2.1-4.133,1.271-6.202l3.463-3.464l3.464-3.463c2.069,0.828,4.523,0.406,6.202-1.272c1.592-1.589,2.049-3.878,1.384-5.876L24.946,9.721z",
    wrench3 : "M27.839,6.775l-3.197,3.239L21.77,9.246l-0.771-2.874l3.188-3.231c-1.992-0.653-4.268-0.192-5.848,1.391c-1.668,1.668-2.095,4.111-1.279,6.172L7.42,20.344c-0.204-0.032-0.408-0.062-0.621-0.062c-2.173,0-3.933,1.759-3.933,3.933c0,2.173,1.76,3.933,3.933,3.933c2.171,0,3.931-1.76,3.933-3.933c0-0.24-0.03-0.473-0.071-0.7l9.592-9.59c2.069,0.828,4.523,0.406,6.202-1.272C28.047,11.062,28.504,8.772,27.839,6.775zM6.799,25.146c-0.517,0-0.933-0.418-0.935-0.933c0.002-0.515,0.418-0.933,0.935-0.933c0.514,0,0.932,0.418,0.932,0.933S7.313,25.146,6.799,25.146z",
    // wrench4: "M8.829,27.945c0,0,8.189-12.872,9.627-14.736c0.93-1.205,2.377-1.88,3.473-2.24c0.5,0.876,0.973,1.704,0.973,1.704c1.246-3.411,3.513-4.619,2.484-6.36l-3.322,1.962L20.408,5.47c0,0-0.185-0.643,0.228-0.885c0.41-0.243,2.809-1.561,2.809-1.561s-1.733-1.531-4.828,0.296c-2.031,1.2-0.297,4.687-2.43,8.034S5.678,25.468,5.678,25.468c-0.4,0.621-0.445,1.439-0.045,2.117c0.566,0.957,1.8,1.276,2.758,0.711C8.557,28.197,8.703,28.079,8.829,27.945zM19.613,11.615c-0.403,0.238-0.929,0.102-1.167-0.301l-0.562-0.95c-0.237-0.403-0.104-0.929,0.3-1.167l1.434-0.847c0.403-0.238,0.93-0.103,1.168,0.3l0.561,0.95c0.238,0.403,0.104,0.93-0.301,1.168L19.613,11.615zM6.119,27.308c-0.419-0.71-0.184-1.625,0.526-2.043c0.71-0.42,1.625-0.186,2.044,0.525c0.419,0.709,0.184,1.624-0.527,2.044C7.453,28.253,6.538,28.018,6.119,27.308z",
    screwdriver : "M19.387,14.373c2.119-2.619,5.322-6.77,5.149-7.75c-0.128-0.729-0.882-1.547-1.763-2.171c-0.883-0.625-1.916-1.044-2.645-0.915c-0.98,0.173-3.786,4.603-5.521,7.49c-0.208,0.344,0.328,1.177,0.156,1.468c-0.172,0.292-1.052,0.042-1.18,0.261c-0.263,0.451-0.417,0.722-0.417,0.722s-0.553,0.823,1.163,2.163l-5.233,7.473c-0.267,0.381-1.456,0.459-1.456,0.459l-1.184,3.312l0.859,0.602l2.708-2.246c0,0-0.334-1.143-0.068-1.523l5.242-7.489c1.719,1,2.377,0.336,2.377,0.336s0.201-0.238,0.536-0.639c0.161-0.194-0.374-0.936-0.159-1.197C18.169,14.467,19.133,14.685,19.387,14.373z",
    hammerandscrewdriver : "M28.537,9.859c-0.473-0.259-1.127-0.252-1.609-0.523c-0.943-0.534-1.186-1.316-1.226-2.475c-2.059-2.215-5.138-4.176-9.424-4.114c-1.162,0.017-2.256-0.035-3.158,0.435c-0.258,0.354-0.004,0.516,0.288,0.599c-0.29,0.138-0.692,0.147-0.626,0.697c2.72-0.383,7.475,0.624,7.116,2.966c-0.08,0.521-0.735,1.076-1.179,1.563c-1.263,1.382-2.599,2.45-3.761,3.667l0.336,0.336c0.742-0.521,1.446-0.785,2.104-0.785c0.707,0,1.121,0.297,1.276,0.433c0.575-0.618,1.166-1.244,1.839-1.853c0.488-0.444,1.047-1.099,1.566-1.178l0.949-0.101c1.156,0.047,1.937,0.29,2.471,1.232c0.27,0.481,0.262,1.139,0.521,1.613c0.175,0.324,0.937,1.218,1.316,1.228c0.294,0.009,0.603-0.199,0.899-0.49l1.033-1.034c0.291-0.294,0.501-0.6,0.492-0.896C29.754,10.801,28.861,10.035,28.537,9.859zM13.021,15.353l-0.741-0.741c-3.139,2.643-6.52,5.738-9.531,8.589c-0.473,0.443-1.452,1.021-1.506,1.539c-0.083,0.781,0.95,1.465,1.506,2c0.556,0.533,1.212,1.602,1.994,1.51c0.509-0.043,1.095-1.029,1.544-1.502c2.255-2.374,4.664-4.976,6.883-7.509c-0.312-0.371-0.498-0.596-0.498-0.596C12.535,18.451,11.779,17.272,13.021,15.353zM20.64,15.643c-0.366-0.318-1.466,0.143-1.777-0.122c-0.311-0.266,0.171-1.259-0.061-1.455c-0.482-0.406-0.77-0.646-0.77-0.646s-0.862-0.829-2.812,0.928L7.44,6.569C7.045,6.173,7.203,4.746,7.203,4.746L3.517,2.646L2.623,3.541l2.1,3.686c0,0,1.428-0.158,1.824,0.237l7.792,7.793c-1.548,1.831-0.895,2.752-0.895,2.752s0.238,0.288,0.646,0.771c0.196,0.23,1.188-0.249,1.455,0.061c0.264,0.312-0.196,1.41,0.12,1.777c2.666,3.064,6.926,7.736,8.125,7.736c0.892,0,2.021-0.724,2.948-1.64c0.925-0.917,1.639-2.055,1.639-2.947C28.377,22.567,23.704,18.309,20.64,15.643z",
    magic : "M23.043,4.649l-0.404-2.312l-1.59,1.727l-2.323-0.33l1.151,2.045l-1.032,2.108l2.302-0.463l1.686,1.633l0.271-2.332l2.074-1.099L23.043,4.649zM26.217,18.198l-0.182-1.25l-0.882,0.905l-1.245-0.214l0.588,1.118l-0.588,1.118l1.245-0.214l0.882,0.905l0.182-1.25l1.133-0.56L26.217,18.198zM4.92,7.672L5.868,7.3l0.844,0.569L6.65,6.853l0.802-0.627L6.467,5.97L6.118,5.013L5.571,5.872L4.553,5.908l0.647,0.786L4.92,7.672zM10.439,10.505l1.021-1.096l1.481,0.219l-0.727-1.31l0.667-1.341l-1.47,0.287l-1.069-1.048L10.16,7.703L8.832,8.396l1.358,0.632L10.439,10.505zM17.234,12.721c-0.588-0.368-1.172-0.618-1.692-0.729c-0.492-0.089-1.039-0.149-1.425,0.374L2.562,30.788h6.68l9.669-15.416c0.303-0.576,0.012-1.041-0.283-1.447C18.303,13.508,17.822,13.09,17.234,12.721zM13.613,21.936c-0.254-0.396-0.74-0.857-1.373-1.254c-0.632-0.396-1.258-0.634-1.726-0.69l4.421-7.052c0.064-0.013,0.262-0.021,0.543,0.066c0.346,0.092,0.785,0.285,1.225,0.562c0.504,0.313,0.908,0.677,1.133,0.97c0.113,0.145,0.178,0.271,0.195,0.335c0.002,0.006,0.004,0.011,0.004,0.015L13.613,21.936z",
    download : "M16,1.466C7.973,1.466,1.466,7.973,1.466,16c0,8.027,6.507,14.534,14.534,14.534c8.027,0,14.534-6.507,14.534-14.534C30.534,7.973,24.027,1.466,16,1.466zM16,28.792c-1.549,0-2.806-1.256-2.806-2.806s1.256-2.806,2.806-2.806c1.55,0,2.806,1.256,2.806,2.806S17.55,28.792,16,28.792zM16,21.087l-7.858-6.562h3.469V5.747h8.779v8.778h3.468L16,21.087z",
    view : "M16,8.286C8.454,8.286,2.5,16,2.5,16s5.954,7.715,13.5,7.715c5.771,0,13.5-7.715,13.5-7.715S21.771,8.286,16,8.286zM16,20.807c-2.649,0-4.807-2.157-4.807-4.807s2.158-4.807,4.807-4.807s4.807,2.158,4.807,4.807S18.649,20.807,16,20.807zM16,13.194c-1.549,0-2.806,1.256-2.806,2.806c0,1.55,1.256,2.806,2.806,2.806c1.55,0,2.806-1.256,2.806-2.806C18.806,14.451,17.55,13.194,16,13.194z",
    noview : "M11.478,17.568c-0.172-0.494-0.285-1.017-0.285-1.568c0-2.65,2.158-4.807,4.807-4.807c0.552,0,1.074,0.113,1.568,0.285l2.283-2.283C18.541,8.647,17.227,8.286,16,8.286C8.454,8.286,2.5,16,2.5,16s2.167,2.791,5.53,5.017L11.478,17.568zM23.518,11.185l-3.056,3.056c0.217,0.546,0.345,1.138,0.345,1.76c0,2.648-2.158,4.807-4.807,4.807c-0.622,0-1.213-0.128-1.76-0.345l-2.469,2.47c1.327,0.479,2.745,0.783,4.229,0.783c5.771,0,13.5-7.715,13.5-7.715S26.859,13.374,23.518,11.185zM25.542,4.917L4.855,25.604L6.27,27.02L26.956,6.332L25.542,4.917z",
    cloud : "M24.345,13.904c0.019-0.195,0.03-0.392,0.03-0.591c0-3.452-2.798-6.25-6.25-6.25c-2.679,0-4.958,1.689-5.847,4.059c-0.589-0.646-1.429-1.059-2.372-1.059c-1.778,0-3.219,1.441-3.219,3.219c0,0.21,0.023,0.415,0.062,0.613c-2.372,0.391-4.187,2.436-4.187,4.918c0,2.762,2.239,5,5,5h15.875c2.762,0,5-2.238,5-5C28.438,16.362,26.672,14.332,24.345,13.904z",
    cloud2 : "M7.562,24.812c-3.313,0-6-2.687-6-6l0,0c0.002-2.659,1.734-4.899,4.127-5.684l0,0c0.083-2.26,1.937-4.064,4.216-4.066l0,0c0.73,0,1.415,0.19,2.01,0.517l0,0c1.266-2.105,3.57-3.516,6.208-3.517l0,0c3.947,0.002,7.157,3.155,7.248,7.079l0,0c2.362,0.804,4.062,3.034,4.064,5.671l0,0c0,3.313-2.687,6-6,6l0,0H7.562L7.562,24.812zM24.163,14.887c-0.511-0.095-0.864-0.562-0.815-1.079l0,0c0.017-0.171,0.027-0.336,0.027-0.497l0,0c-0.007-2.899-2.352-5.245-5.251-5.249l0,0c-2.249-0.002-4.162,1.418-4.911,3.41l0,0c-0.122,0.323-0.406,0.564-0.748,0.63l0,0c-0.34,0.066-0.694-0.052-0.927-0.309l0,0c-0.416-0.453-0.986-0.731-1.633-0.731l0,0c-1.225,0.002-2.216,0.993-2.22,2.218l0,0c0,0.136,0.017,0.276,0.045,0.424l0,0c0.049,0.266-0.008,0.54-0.163,0.762l0,0c-0.155,0.223-0.392,0.371-0.657,0.414l0,0c-1.9,0.313-3.352,1.949-3.35,3.931l0,0c0.004,2.209,1.792,3.995,4.001,4.001l0,0h15.874c2.209-0.006,3.994-1.792,3.999-4.001l0,0C27.438,16.854,26.024,15.231,24.163,14.887L24.163,14.887",
    cloudDown : "M24.345,13.904c0.019-0.195,0.03-0.392,0.03-0.591c0-3.452-2.798-6.25-6.25-6.25c-2.679,0-4.958,1.689-5.847,4.059c-0.589-0.646-1.429-1.059-2.372-1.059c-1.778,0-3.219,1.441-3.219,3.219c0,0.21,0.023,0.415,0.062,0.613c-2.372,0.391-4.187,2.436-4.187,4.918c0,2.762,2.239,5,5,5h3.404l-0.707-0.707c-0.377-0.377-0.585-0.879-0.585-1.413c0-0.533,0.208-1.035,0.585-1.412l0.556-0.557c0.4-0.399,0.937-0.628,1.471-0.628c0.027,0,0.054,0,0.08,0.002v-0.472c0-1.104,0.898-2.002,2-2.002h3.266c1.103,0,2,0.898,2,2.002v0.472c0.027-0.002,0.054-0.002,0.081-0.002c0.533,0,1.07,0.229,1.47,0.63l0.557,0.552c0.78,0.781,0.78,2.05,0,2.828l-0.706,0.707h2.403c2.762,0,5-2.238,5-5C28.438,16.362,26.672,14.332,24.345,13.904z M21.033,20.986l-0.556-0.555c-0.39-0.389-0.964-0.45-1.276-0.137c-0.312,0.312-0.568,0.118-0.568-0.432v-1.238c0-0.55-0.451-1-1-1h-3.265c-0.55,0-1,0.45-1,1v1.238c0,0.55-0.256,0.744-0.569,0.432c-0.312-0.313-0.887-0.252-1.276,0.137l-0.556,0.555c-0.39,0.389-0.39,1.024-0.001,1.413l4.328,4.331c0.194,0.194,0.451,0.291,0.707,0.291s0.512-0.097,0.707-0.291l4.327-4.331C21.424,22.011,21.423,21.375,21.033,20.986z",
    cloudUp : "M24.345,13.904c0.019-0.195,0.03-0.392,0.03-0.591c0-3.452-2.798-6.25-6.25-6.25c-2.679,0-4.958,1.689-5.847,4.059c-0.589-0.646-1.429-1.059-2.372-1.059c-1.778,0-3.219,1.441-3.219,3.219c0,0.21,0.023,0.415,0.062,0.613c-2.372,0.391-4.187,2.436-4.187,4.918c0,2.762,2.239,5,5,5h2.312c-0.126-0.266-0.2-0.556-0.2-0.859c0-0.535,0.208-1.04,0.587-1.415l4.325-4.329c0.375-0.377,0.877-0.585,1.413-0.585c0.54,0,1.042,0.21,1.417,0.587l4.323,4.329c0.377,0.373,0.585,0.878,0.585,1.413c0,0.304-0.073,0.594-0.2,0.859h1.312c2.762,0,5-2.238,5-5C28.438,16.362,26.672,14.332,24.345,13.904z M16.706,17.916c-0.193-0.195-0.45-0.291-0.706-0.291s-0.512,0.096-0.707,0.291l-4.327,4.33c-0.39,0.389-0.389,1.025,0.001,1.414l0.556,0.555c0.39,0.389,0.964,0.449,1.276,0.137s0.568-0.119,0.568,0.432v1.238c0,0.549,0.451,1,1,1h3.265c0.551,0,1-0.451,1-1v-1.238c0-0.551,0.256-0.744,0.569-0.432c0.312,0.312,0.887,0.252,1.276-0.137l0.556-0.555c0.39-0.389,0.39-1.025,0.001-1.414L16.706,17.916z",
    location : "M16,3.5c-4.142,0-7.5,3.358-7.5,7.5c0,4.143,7.5,18.121,7.5,18.121S23.5,15.143,23.5,11C23.5,6.858,20.143,3.5,16,3.5z M16,14.584c-1.979,0-3.584-1.604-3.584-3.584S14.021,7.416,16,7.416S19.584,9.021,19.584,11S17.979,14.584,16,14.584z",
    loaction2 : "M15.834,29.084 15.834,16.166 2.917,16.166 29.083,2.917z",
    volume0 : "M4.998,12.127v7.896h4.495l6.729,5.526l0.004-18.948l-6.73,5.526H4.998z",
    volume1 : "M4.998,12.127v7.896h4.495l6.729,5.526l0.004-18.948l-6.73,5.526H4.998z M18.806,11.219c-0.393-0.389-1.024-0.389-1.415,0.002c-0.39,0.391-0.39,1.024,0.002,1.416v-0.002c0.863,0.864,1.395,2.049,1.395,3.366c0,1.316-0.531,2.497-1.393,3.361c-0.394,0.389-0.394,1.022-0.002,1.415c0.195,0.195,0.451,0.293,0.707,0.293c0.257,0,0.513-0.098,0.708-0.293c1.222-1.22,1.98-2.915,1.979-4.776C20.788,14.136,20.027,12.439,18.806,11.219z",
    volume2 : "M4.998,12.127v7.896h4.495l6.729,5.526l0.004-18.948l-6.73,5.526H4.998z M18.806,11.219c-0.393-0.389-1.024-0.389-1.415,0.002c-0.39,0.391-0.39,1.024,0.002,1.416v-0.002c0.863,0.864,1.395,2.049,1.395,3.366c0,1.316-0.531,2.497-1.393,3.361c-0.394,0.389-0.394,1.022-0.002,1.415c0.195,0.195,0.451,0.293,0.707,0.293c0.257,0,0.513-0.098,0.708-0.293c1.222-1.22,1.98-2.915,1.979-4.776C20.788,14.136,20.027,12.439,18.806,11.219z M21.101,8.925c-0.393-0.391-1.024-0.391-1.413,0c-0.392,0.391-0.392,1.025,0,1.414c1.45,1.451,2.344,3.447,2.344,5.661c0,2.212-0.894,4.207-2.342,5.659c-0.392,0.39-0.392,1.023,0,1.414c0.195,0.195,0.451,0.293,0.708,0.293c0.256,0,0.512-0.098,0.707-0.293c1.808-1.809,2.929-4.315,2.927-7.073C24.033,13.24,22.912,10.732,21.101,8.925z",
    volume3 : "M4.998,12.127v7.896h4.495l6.729,5.526l0.004-18.948l-6.73,5.526H4.998z M18.806,11.219c-0.393-0.389-1.024-0.389-1.415,0.002c-0.39,0.391-0.39,1.024,0.002,1.416v-0.002c0.863,0.864,1.395,2.049,1.395,3.366c0,1.316-0.531,2.497-1.393,3.361c-0.394,0.389-0.394,1.022-0.002,1.415c0.195,0.195,0.451,0.293,0.707,0.293c0.257,0,0.513-0.098,0.708-0.293c1.222-1.22,1.98-2.915,1.979-4.776C20.788,14.136,20.027,12.439,18.806,11.219z M21.101,8.925c-0.393-0.391-1.024-0.391-1.413,0c-0.392,0.391-0.392,1.025,0,1.414c1.45,1.451,2.344,3.447,2.344,5.661c0,2.212-0.894,4.207-2.342,5.659c-0.392,0.39-0.392,1.023,0,1.414c0.195,0.195,0.451,0.293,0.708,0.293c0.256,0,0.512-0.098,0.707-0.293c1.808-1.809,2.929-4.315,2.927-7.073C24.033,13.24,22.912,10.732,21.101,8.925z M23.28,6.746c-0.393-0.391-1.025-0.389-1.414,0.002c-0.391,0.389-0.391,1.023,0.002,1.413h-0.002c2.009,2.009,3.248,4.773,3.248,7.839c0,3.063-1.239,5.828-3.246,7.838c-0.391,0.39-0.391,1.023,0.002,1.415c0.194,0.194,0.45,0.291,0.706,0.291s0.513-0.098,0.708-0.293c2.363-2.366,3.831-5.643,3.829-9.251C27.115,12.389,25.647,9.111,23.28,6.746z",
    bell : "M24.264,20.958c-2.484-4.226-2.168-13.199-6.143-15.486c0.254-0.395,0.404-0.861,0.404-1.366c0-1.396-1.129-2.526-2.526-2.526c-1.396,0-2.527,1.131-2.527,2.526c0,0.505,0.151,0.973,0.406,1.367C9.905,7.76,10.221,16.732,7.736,20.958C5.585,21.523,4.25,22.311,4.25,23.18v1.125c0,1.604,3.877,2.938,9.077,3.283c-0.003,0.048-0.015,0.096-0.015,0.145c0,1.483,1.203,2.688,2.688,2.688c1.484,0,2.688-1.203,2.688-2.688c0-0.049-0.012-0.097-0.015-0.145c5.199-0.349,9.077-1.688,9.077-3.283V23.18C27.75,22.311,26.415,21.523,24.264,20.958zM14.472,4.105c0.002-0.843,0.685-1.525,1.527-1.527c0.843,0.002,1.526,0.685,1.528,1.527c-0.002,0.372-0.144,0.708-0.361,0.974c-0.359-0.096-0.745-0.15-1.166-0.15s-0.807,0.055-1.167,0.15C14.612,4.814,14.473,4.478,14.472,4.105z",
    mute : "M21.328,8.956c-0.605-1.545-1.4-2.809-2.572-3.484c0.254-0.395,0.404-0.861,0.404-1.366c0-1.396-1.129-2.526-2.526-2.526c-1.396,0-2.526,1.131-2.526,2.526c0,0.505,0.15,0.973,0.405,1.367C10.54,7.76,10.856,16.732,8.371,20.958c-2.151,0.565-3.486,1.353-3.486,2.222v1.125c0,0.271,0.117,0.525,0.322,0.774L21.328,8.956zM16.635,2.578c0.844,0.002,1.525,0.685,1.527,1.527c0,0.372-0.139,0.708-0.36,0.974c-0.358-0.096-0.745-0.15-1.165-0.15c-0.422,0-0.808,0.055-1.167,0.15c-0.221-0.265-0.359-0.602-0.36-0.974C15.109,3.263,15.792,2.58,16.635,2.578zM24.898,20.958c-1.125-1.914-1.678-4.802-2.312-7.602L9.065,26.878c1.395,0.338,3.061,0.587,4.896,0.71c-0.003,0.048-0.015,0.096-0.015,0.145c0,1.483,1.203,2.688,2.688,2.688c1.485,0,2.688-1.203,2.688-2.688c0-0.049-0.012-0.097-0.016-0.145c5.188-0.349,9.062-1.688,9.062-3.283V23.18C28.385,22.311,27.05,21.523,24.898,20.958zM26.677,5.021L3.615,28.083l1.415,1.416L28.091,6.436L26.677,5.021z",
    key : "M18.386,16.009l0.009-0.006l-0.58-0.912c1.654-2.226,1.876-5.319,0.3-7.8c-2.043-3.213-6.303-4.161-9.516-2.118c-3.212,2.042-4.163,6.302-2.12,9.517c1.528,2.402,4.3,3.537,6.944,3.102l0.424,0.669l0.206,0.045l0.779-0.447l-0.305,1.377l2.483,0.552l-0.296,1.325l1.903,0.424l-0.68,3.06l1.406,0.313l-0.424,1.906l4.135,0.918l0.758-3.392L18.386,16.009z M10.996,8.944c-0.685,0.436-1.593,0.233-2.029-0.452C8.532,7.807,8.733,6.898,9.418,6.463s1.594-0.233,2.028,0.452C11.883,7.6,11.68,8.509,10.996,8.944z",
    ruler : "M6.63,21.796l-5.122,5.121h25.743V1.175L6.63,21.796zM18.702,10.48c0.186-0.183,0.48-0.183,0.664,0l1.16,1.159c0.184,0.183,0.186,0.48,0.002,0.663c-0.092,0.091-0.213,0.137-0.332,0.137c-0.121,0-0.24-0.046-0.33-0.137l-1.164-1.159C18.519,10.96,18.519,10.664,18.702,10.48zM17.101,12.084c0.184-0.183,0.48-0.183,0.662,0l2.156,2.154c0.184,0.183,0.184,0.48,0.002,0.661c-0.092,0.092-0.213,0.139-0.334,0.139s-0.24-0.046-0.33-0.137l-2.156-2.154C16.917,12.564,16.917,12.267,17.101,12.084zM15.497,13.685c0.184-0.183,0.48-0.183,0.664,0l1.16,1.161c0.184,0.183,0.182,0.48-0.002,0.663c-0.092,0.092-0.211,0.138-0.33,0.138c-0.121,0-0.24-0.046-0.332-0.138l-1.16-1.16C15.314,14.166,15.314,13.868,15.497,13.685zM13.896,15.288c0.184-0.183,0.48-0.181,0.664,0.002l1.158,1.159c0.183,0.184,0.183,0.48,0,0.663c-0.092,0.092-0.212,0.138-0.332,0.138c-0.119,0-0.24-0.046-0.332-0.138l-1.158-1.161C13.713,15.767,13.713,15.471,13.896,15.288zM12.293,16.892c0.183-0.184,0.479-0.184,0.663,0l2.154,2.153c0.184,0.184,0.184,0.481,0,0.665c-0.092,0.092-0.211,0.138-0.33,0.138c-0.121,0-0.242-0.046-0.334-0.138l-2.153-2.155C12.11,17.371,12.11,17.075,12.293,16.892zM10.302,24.515c-0.091,0.093-0.212,0.139-0.332,0.139c-0.119,0-0.238-0.045-0.33-0.137l-2.154-2.153c-0.184-0.183-0.184-0.479,0-0.663s0.479-0.184,0.662,0l2.154,2.153C10.485,24.036,10.485,24.332,10.302,24.515zM10.912,21.918c-0.093,0.093-0.214,0.139-0.333,0.139c-0.12,0-0.24-0.045-0.33-0.137l-1.162-1.161c-0.184-0.183-0.184-0.479,0-0.66c0.184-0.185,0.48-0.187,0.664-0.003l1.161,1.162C11.095,21.438,11.095,21.735,10.912,21.918zM12.513,20.316c-0.092,0.092-0.211,0.138-0.332,0.138c-0.119,0-0.239-0.046-0.331-0.138l-1.159-1.16c-0.184-0.184-0.184-0.48,0-0.664s0.48-0.182,0.663,0.002l1.159,1.161C12.696,19.838,12.696,20.135,12.513,20.316zM22.25,21.917h-8.67l8.67-8.67V21.917zM22.13,10.7c-0.09,0.092-0.211,0.138-0.33,0.138c-0.121,0-0.242-0.046-0.334-0.138l-1.16-1.159c-0.184-0.183-0.184-0.479,0-0.663c0.182-0.183,0.479-0.183,0.662,0l1.16,1.159C22.312,10.221,22.313,10.517,22.13,10.7zM24.726,10.092c-0.092,0.092-0.213,0.137-0.332,0.137s-0.24-0.045-0.33-0.137l-2.154-2.154c-0.184-0.183-0.184-0.481,0-0.664s0.482-0.181,0.664,0.002l2.154,2.154C24.911,9.613,24.909,9.91,24.726,10.092z",
    power : "M25.542,8.354c-1.47-1.766-2.896-2.617-3.025-2.695c-0.954-0.565-2.181-0.241-2.739,0.724c-0.556,0.961-0.24,2.194,0.705,2.763c0,0,0.001,0,0.002,0.001c0.001,0,0.002,0.001,0.003,0.002c0.001,0,0.003,0.001,0.004,0.001c0.102,0.062,1.124,0.729,2.08,1.925c1.003,1.261,1.933,3.017,1.937,5.438c-0.001,2.519-1.005,4.783-2.64,6.438c-1.637,1.652-3.877,2.668-6.368,2.669c-2.491-0.001-4.731-1.017-6.369-2.669c-1.635-1.654-2.639-3.919-2.64-6.438c0.005-2.499,0.995-4.292,2.035-5.558c0.517-0.625,1.043-1.098,1.425-1.401c0.191-0.152,0.346-0.263,0.445-0.329c0.049-0.034,0.085-0.058,0.104-0.069c0.005-0.004,0.009-0.006,0.012-0.008s0.004-0.002,0.004-0.002l0,0c0.946-0.567,1.262-1.802,0.705-2.763c-0.559-0.965-1.785-1.288-2.739-0.724c-0.128,0.079-1.555,0.93-3.024,2.696c-1.462,1.751-2.974,4.511-2.97,8.157C2.49,23.775,8.315,29.664,15.5,29.667c7.186-0.003,13.01-5.892,13.012-13.155C28.516,12.864,27.005,10.105,25.542,8.354zM15.5,17.523c1.105,0,2.002-0.907,2.002-2.023h-0.001V3.357c0-1.118-0.896-2.024-2.001-2.024s-2.002,0.906-2.002,2.024V15.5C13.498,16.616,14.395,17.523,15.5,17.523z",
    flag : "M9.5,3v10c8,0,8,4,16,4V7C17.5,7,17.5,3,9.5,3z M6.5,29h2V3h-2V29z",
    "flag-alt" : "M19.562,10.75C21.74,8.572,25.5,7,25.5,7c-8,0-8-4-16-4v10c8,0,8,4,16,4C25.5,17,21.75,14,19.562,10.75zM6.5,29h2V3h-2V29z",
    tag : "M14.263,2.826H7.904L2.702,8.028v6.359L18.405,30.09l11.561-11.562L14.263,2.826zM6.495,8.859c-0.619-0.619-0.619-1.622,0-2.24C7.114,6,8.117,6,8.736,6.619c0.62,0.62,0.619,1.621,0,2.241C8.117,9.479,7.114,9.479,6.495,8.859z",
    search : "M29.772,26.433l-7.126-7.126c0.96-1.583,1.523-3.435,1.524-5.421C24.169,8.093,19.478,3.401,13.688,3.399C7.897,3.401,3.204,8.093,3.204,13.885c0,5.789,4.693,10.481,10.484,10.481c1.987,0,3.839-0.563,5.422-1.523l7.128,7.127L29.772,26.433zM7.203,13.885c0.006-3.582,2.903-6.478,6.484-6.486c3.579,0.008,6.478,2.904,6.484,6.486c-0.007,3.58-2.905,6.476-6.484,6.484C10.106,20.361,7.209,17.465,7.203,13.885z",
    zoomout : "M22.646,19.307c0.96-1.583,1.523-3.435,1.524-5.421C24.169,8.093,19.478,3.401,13.688,3.399C7.897,3.401,3.204,8.093,3.204,13.885c0,5.789,4.693,10.481,10.484,10.481c1.987,0,3.839-0.563,5.422-1.523l7.128,7.127l3.535-3.537L22.646,19.307zM13.688,20.369c-3.582-0.008-6.478-2.904-6.484-6.484c0.006-3.582,2.903-6.478,6.484-6.486c3.579,0.008,6.478,2.904,6.484,6.486C20.165,17.465,17.267,20.361,13.688,20.369zM8.854,11.884v4.001l9.665-0.001v-3.999L8.854,11.884z",
    zoomin : "M22.646,19.307c0.96-1.583,1.523-3.435,1.524-5.421C24.169,8.093,19.478,3.401,13.688,3.399C7.897,3.401,3.204,8.093,3.204,13.885c0,5.789,4.693,10.481,10.484,10.481c1.987,0,3.839-0.563,5.422-1.523l7.128,7.127l3.535-3.537L22.646,19.307zM13.688,20.369c-3.582-0.008-6.478-2.904-6.484-6.484c0.006-3.582,2.903-6.478,6.484-6.486c3.579,0.008,6.478,2.904,6.484,6.486C20.165,17.465,17.267,20.361,13.688,20.369zM15.687,9.051h-4v2.833H8.854v4.001h2.833v2.833h4v-2.834h2.832v-3.999h-2.833V9.051z",
    cross : "M24.778,21.419 19.276,15.917 24.777,10.415 21.949,7.585 16.447,13.087 10.945,7.585 8.117,10.415 13.618,15.917 8.116,21.419 10.946,24.248 16.447,18.746 21.948,24.248z",
    check : "M2.379,14.729 5.208,11.899 12.958,19.648 25.877,6.733 28.707,9.561 12.958,25.308z",
    settings : "M16.015,12.03c-2.156,0-3.903,1.747-3.903,3.903c0,2.155,1.747,3.903,3.903,3.903c0.494,0,0.962-0.102,1.397-0.27l0.836,1.285l1.359-0.885l-0.831-1.276c0.705-0.706,1.142-1.681,1.142-2.757C19.918,13.777,18.171,12.03,16.015,12.03zM16,1.466C7.973,1.466,1.466,7.973,1.466,16c0,8.027,6.507,14.534,14.534,14.534c8.027,0,14.534-6.507,14.534-14.534C30.534,7.973,24.027,1.466,16,1.466zM26.174,20.809c-0.241,0.504-0.513,0.99-0.826,1.45L22.19,21.58c-0.481,0.526-1.029,0.994-1.634,1.385l0.119,3.202c-0.507,0.23-1.028,0.421-1.569,0.57l-1.955-2.514c-0.372,0.051-0.75,0.086-1.136,0.086c-0.356,0-0.706-0.029-1.051-0.074l-1.945,2.5c-0.541-0.151-1.065-0.342-1.57-0.569l0.117-3.146c-0.634-0.398-1.208-0.88-1.712-1.427L6.78,22.251c-0.313-0.456-0.583-0.944-0.826-1.448l2.088-2.309c-0.226-0.703-0.354-1.451-0.385-2.223l-2.768-1.464c0.055-0.563,0.165-1.107,0.301-1.643l3.084-0.427c0.29-0.702,0.675-1.352,1.135-1.942L8.227,7.894c0.399-0.389,0.83-0.744,1.283-1.07l2.663,1.672c0.65-0.337,1.349-0.593,2.085-0.75l0.968-3.001c0.278-0.021,0.555-0.042,0.837-0.042c0.282,0,0.56,0.022,0.837,0.042l0.976,3.028c0.72,0.163,1.401,0.416,2.036,0.75l2.704-1.697c0.455,0.326,0.887,0.681,1.285,1.07l-1.216,2.986c0.428,0.564,0.793,1.181,1.068,1.845l3.185,0.441c0.135,0.535,0.247,1.081,0.302,1.643l-2.867,1.516c-0.034,0.726-0.15,1.43-0.355,2.1L26.174,20.809z",
    settingsalt : "M16,1.466C7.973,1.466,1.466,7.973,1.466,16c0,8.027,6.507,14.534,14.534,14.534c8.027,0,14.534-6.507,14.534-14.534C30.534,7.973,24.027,1.466,16,1.466zM24.386,14.968c-1.451,1.669-3.706,2.221-5.685,1.586l-7.188,8.266c-0.766,0.88-2.099,0.97-2.979,0.205s-0.973-2.099-0.208-2.979l7.198-8.275c-0.893-1.865-0.657-4.164,0.787-5.824c1.367-1.575,3.453-2.151,5.348-1.674l-2.754,3.212l0.901,2.621l2.722,0.529l2.761-3.22C26.037,11.229,25.762,13.387,24.386,14.968z",
    feed : "M4.135,16.762c3.078,0,5.972,1.205,8.146,3.391c2.179,2.187,3.377,5.101,3.377,8.202h4.745c0-9.008-7.299-16.335-16.269-16.335V16.762zM4.141,8.354c10.973,0,19.898,8.975,19.898,20.006h4.743c0-13.646-11.054-24.749-24.642-24.749V8.354zM10.701,25.045c0,1.815-1.471,3.287-3.285,3.287s-3.285-1.472-3.285-3.287c0-1.813,1.471-3.285,3.285-3.285S10.701,23.231,10.701,25.045z",
    bug : "M28.589,10.903l-5.828,1.612c-0.534-1.419-1.338-2.649-2.311-3.628l3.082-5.44c0.271-0.48,0.104-1.092-0.38-1.365c-0.479-0.271-1.09-0.102-1.36,0.377l-2.924,5.162c-0.604-0.383-1.24-0.689-1.9-0.896c-0.416-1.437-1.652-2.411-3.058-2.562c-0.001-0.004-0.002-0.008-0.003-0.012c-0.061-0.242-0.093-0.46-0.098-0.65c-0.005-0.189,0.012-0.351,0.046-0.479c0.037-0.13,0.079-0.235,0.125-0.317c0.146-0.26,0.34-0.43,0.577-0.509c0.023,0.281,0.142,0.482,0.352,0.601c0.155,0.088,0.336,0.115,0.546,0.086c0.211-0.031,0.376-0.152,0.496-0.363c0.105-0.186,0.127-0.389,0.064-0.607c-0.064-0.219-0.203-0.388-0.414-0.507c-0.154-0.087-0.314-0.131-0.482-0.129c-0.167,0.001-0.327,0.034-0.481,0.097c-0.153,0.063-0.296,0.16-0.429,0.289c-0.132,0.129-0.241,0.271-0.33,0.426c-0.132,0.234-0.216,0.496-0.25,0.783c-0.033,0.286-0.037,0.565-0.009,0.84c0.017,0.16,0.061,0.301,0.094,0.449c-0.375-0.021-0.758,0.002-1.14,0.108c-0.482,0.133-0.913,0.36-1.28,0.653c-0.052-0.172-0.098-0.344-0.18-0.518c-0.116-0.249-0.263-0.486-0.438-0.716c-0.178-0.229-0.384-0.41-0.618-0.543C9.904,3.059,9.737,2.994,9.557,2.951c-0.18-0.043-0.352-0.052-0.516-0.027s-0.318,0.08-0.463,0.164C8.432,3.172,8.318,3.293,8.23,3.445C8.111,3.656,8.08,3.873,8.136,4.092c0.058,0.221,0.181,0.384,0.367,0.49c0.21,0.119,0.415,0.138,0.611,0.056C9.31,4.556,9.451,4.439,9.539,4.283c0.119-0.21,0.118-0.443-0.007-0.695c0.244-0.055,0.497-0.008,0.757,0.141c0.081,0.045,0.171,0.115,0.27,0.208c0.097,0.092,0.193,0.222,0.286,0.388c0.094,0.166,0.179,0.368,0.251,0.608c0.013,0.044,0.023,0.098,0.035,0.146c-0.911,0.828-1.357,2.088-1.098,3.357c-0.582,0.584-1.072,1.27-1.457,2.035l-5.16-2.926c-0.48-0.271-1.092-0.102-1.364,0.377C1.781,8.404,1.95,9.016,2.43,9.289l5.441,3.082c-0.331,1.34-0.387,2.807-0.117,4.297l-5.828,1.613c-0.534,0.147-0.846,0.699-0.698,1.231c0.147,0.53,0.697,0.843,1.231,0.694l5.879-1.627c0.503,1.057,1.363,2.28,2.371,3.443l-3.194,5.639c-0.272,0.481-0.104,1.092,0.378,1.363c0.239,0.137,0.512,0.162,0.758,0.094c0.248-0.068,0.469-0.229,0.604-0.471l2.895-5.109c2.7,2.594,5.684,4.123,5.778,1.053c1.598,2.56,3.451-0.338,4.502-3.976l5.203,2.947c0.24,0.138,0.514,0.162,0.762,0.094c0.246-0.067,0.467-0.229,0.603-0.471c0.272-0.479,0.104-1.091-0.377-1.362l-5.701-3.229c0.291-1.505,0.422-2.983,0.319-4.138l5.886-1.627c0.53-0.147,0.847-0.697,0.696-1.229C29.673,11.068,29.121,10.756,28.589,10.903z",
    link : "M16.45,18.085l-2.47,2.471c0.054,1.023-0.297,2.062-1.078,2.846c-1.465,1.459-3.837,1.459-5.302-0.002c-1.461-1.465-1.46-3.836-0.001-5.301c0.783-0.781,1.824-1.131,2.847-1.078l2.469-2.469c-2.463-1.057-5.425-0.586-7.438,1.426c-2.634,2.637-2.636,6.907,0,9.545c2.638,2.637,6.909,2.635,9.545,0l0.001,0.002C17.033,23.511,17.506,20.548,16.45,18.085zM14.552,12.915l2.467-2.469c-0.053-1.023,0.297-2.062,1.078-2.848C19.564,6.139,21.934,6.137,23.4,7.6c1.462,1.465,1.462,3.837,0,5.301c-0.783,0.783-1.822,1.132-2.846,1.079l-2.469,2.468c2.463,1.057,5.424,0.584,7.438-1.424c2.634-2.639,2.633-6.91,0-9.546c-2.639-2.636-6.91-2.637-9.545-0.001C13.967,7.489,13.495,10.451,14.552,12.915zM18.152,10.727l-7.424,7.426c-0.585,0.584-0.587,1.535,0,2.121c0.585,0.584,1.536,0.584,2.121-0.002l7.425-7.424c0.584-0.586,0.584-1.535,0-2.121C19.687,10.141,18.736,10.142,18.152,10.727z",
    calendar : "M22,4.582h-2v3.335h2V4.582zM25.416,5.748H23v3.17h-4v-3.17h-6v3.168H9.002V5.748H6.583v21.555h18.833V5.748zM24.418,26.303H7.584V13.988h16.833V26.303zM12,4.582h-2v3.335h2V4.582zM19.428,23.962h1.568v-7.788h-1.277c0,0.067-0.021,0.172-0.061,0.312c-0.066,0.232-0.168,0.419-0.299,0.559c-0.193,0.204-0.443,0.34-0.75,0.408c-0.193,0.043-0.531,0.075-1.014,0.097v1.042h1.832V23.962zM13.673,22.909c-0.489,0-0.827-0.188-1.013-0.564c-0.101-0.203-0.15-0.461-0.15-0.773h-1.504c0.025,0.62,0.15,1.121,0.376,1.504c0.429,0.721,1.194,1.08,2.296,1.08c0.895,0,1.569-0.25,2.026-0.749c0.455-0.5,0.684-1.079,0.684-1.737c0-0.627-0.195-1.121-0.586-1.482c-0.261-0.24-0.461-0.36-0.602-0.36c0.187-0.071,0.365-0.206,0.537-0.403c0.272-0.314,0.408-0.701,0.408-1.16c0-0.647-0.228-1.164-0.684-1.549c-0.456-0.386-1.056-0.578-1.8-0.578c-0.4,0-0.738,0.049-1.014,0.146c-0.276,0.097-0.514,0.236-0.714,0.419c-0.269,0.258-0.465,0.539-0.591,0.843c-0.117,0.348-0.184,0.715-0.198,1.102h1.429c-0.007-0.384,0.074-0.689,0.244-0.919c0.169-0.229,0.435-0.344,0.795-0.344c0.314,0,0.559,0.094,0.731,0.279c0.174,0.187,0.26,0.428,0.26,0.726c0,0.458-0.169,0.763-0.508,0.913c-0.196,0.09-0.543,0.138-1.039,0.145v1.096c0.507,0,0.878,0.049,1.114,0.146c0.414,0.172,0.621,0.514,0.621,1.026c0,0.387-0.112,0.683-0.335,0.889C14.234,22.807,13.973,22.909,13.673,22.909z",
    calendar2 : "M22,4.582h-2v3.335h2V4.582zM12,4.582h-2v3.335h2V4.582zM25.416,5.748H23v3.17h-4v-3.17h-6v3.168H9.002V5.748H6.583v21.555h18.833V5.748zM11.033,26.303H7.584v-3.44h3.449V26.303zM11.033,21.862H7.584v-3.434h3.449V21.862zM11.033,17.429H7.584v-3.441h3.449V17.429zM15.501,26.303h-3.468v-3.44h3.468V26.303zM15.501,21.862h-3.468v-3.434h3.468V21.862zM15.501,17.429h-3.468v-3.441h3.468V17.429zM19.97,26.303h-3.469v-3.44h3.469V26.303zM19.97,21.862h-3.469v-3.434h3.469V21.862zM19.97,17.429h-3.469v-3.441h3.469V17.429zM24.418,26.303H20.97v-3.44h3.448V26.303zM24.418,21.862H20.97v-3.434h3.448V21.862zM24.418,17.429H20.97v-3.441h3.448V17.429z",
    picker : "M22.221,10.853c-0.111-0.414-0.261-0.412,0.221-1.539l1.66-3.519c0.021-0.051,0.2-0.412,0.192-0.946c0.015-0.529-0.313-1.289-1.119-1.642c-1.172-0.555-1.17-0.557-2.344-1.107c-0.784-0.396-1.581-0.171-1.979,0.179c-0.42,0.333-0.584,0.7-0.609,0.75L16.58,6.545c-0.564,1.084-0.655,0.97-1.048,1.147c-0.469,0.129-1.244,0.558-1.785,1.815c-1.108,2.346-1.108,2.346-1.108,2.346l-0.276,0.586l1.17,0.553l-3.599,7.623c-0.38,0.828-0.166,1.436-0.166,2.032c0.01,0.627-0.077,1.509-0.876,3.21l-0.276,0.586l3.517,1.661l0.276-0.585c0.808-1.699,1.431-2.326,1.922-2.717c0.46-0.381,1.066-0.6,1.465-1.42l3.599-7.618l1.172,0.554l0.279-0.589c0,0,0,0,1.105-2.345C22.578,12.166,22.419,11.301,22.221,10.853zM14.623,22.83c-0.156,0.353-0.413,0.439-1.091,0.955c-0.577,0.448-1.264,1.172-2.009,2.6l-1.191-0.562c0.628-1.48,0.75-2.474,0.73-3.203c-0.031-0.851-0.128-1.104,0.045-1.449l3.599-7.621l3.517,1.662L14.623,22.83z",
    no : "M16,3.667C9.189,3.667,3.667,9.188,3.667,16S9.189,28.333,16,28.333c6.812,0,12.333-5.521,12.333-12.333S22.812,3.667,16,3.667zM16,6.667c1.851,0,3.572,0.548,5.024,1.48L8.147,21.024c-0.933-1.452-1.48-3.174-1.48-5.024C6.667,10.854,10.854,6.667,16,6.667zM16,25.333c-1.85,0-3.572-0.548-5.024-1.48l12.876-12.877c0.933,1.452,1.48,3.174,1.48,5.024C25.333,21.146,21.146,25.333,16,25.333z",
    commandline : "M2.021,9.748L2.021,9.748V9.746V9.748zM2.022,9.746l5.771,5.773l-5.772,5.771l2.122,2.123l7.894-7.895L4.143,7.623L2.022,9.746zM12.248,23.269h14.419V20.27H12.248V23.269zM16.583,17.019h10.084V14.02H16.583V17.019zM12.248,7.769v3.001h14.419V7.769H12.248z",
    photo : "M24.25,10.25H20.5v-1.5h-9.375v1.5h-3.75c-1.104,0-2,0.896-2,2v10.375c0,1.104,0.896,2,2,2H24.25c1.104,0,2-0.896,2-2V12.25C26.25,11.146,25.354,10.25,24.25,10.25zM15.812,23.499c-3.342,0-6.06-2.719-6.06-6.061c0-3.342,2.718-6.062,6.06-6.062s6.062,2.72,6.062,6.062C21.874,20.78,19.153,23.499,15.812,23.499zM15.812,13.375c-2.244,0-4.062,1.819-4.062,4.062c0,2.244,1.819,4.062,4.062,4.062c2.244,0,4.062-1.818,4.062-4.062C19.875,15.194,18.057,13.375,15.812,13.375z",
    printer : "M24.569,12.125h-2.12c-0.207-1.34-1.247-2.759-2.444-3.967c-1.277-1.24-2.654-2.234-3.784-2.37c-0.062-0.008-0.124-0.014-0.198-0.015H8.594c-0.119,0-0.235,0.047-0.319,0.132c-0.083,0.083-0.132,0.2-0.132,0.32v5.9H6.069c-1.104,0-2,0.896-2,2V23h4.074v2.079c0,0.118,0.046,0.23,0.132,0.318c0.086,0.085,0.199,0.131,0.319,0.131h13.445c0.118,0,0.232-0.046,0.318-0.131s0.138-0.199,0.138-0.318V23h4.074v-8.875C26.569,13.021,25.674,12.125,24.569,12.125zM21.589,24.626H9.043V21.5h12.546V24.626zM21.589,13.921c0-0.03,0-0.063-0.003-0.096c-0.015-0.068-0.062-0.135-0.124-0.2H9.043v-6.95h6.987v0.001c0.305-0.019,0.567,0.282,0.769,0.971c0.183,0.655,0.229,1.509,0.229,2.102c0.001,0.433-0.019,0.725-0.019,0.725l-0.037,0.478l0.48,0.005c0.002,0,1.109,0.014,2.196,0.26c1.044,0.226,1.86,0.675,1.938,1.184c0.003,0.045,0.003,0.091,0.003,0.133V13.921z",
    "export" : "M24.086,20.904c-1.805,3.113-5.163,5.212-9.023,5.219c-5.766-0.01-10.427-4.672-10.438-10.435C4.636,9.922,9.297,5.261,15.063,5.25c3.859,0.007,7.216,2.105,9.022,5.218l3.962,2.284l0.143,0.082C26.879,6.784,21.504,2.25,15.063,2.248C7.64,2.25,1.625,8.265,1.624,15.688c0.002,7.42,6.017,13.435,13.439,13.437c6.442-0.002,11.819-4.538,13.127-10.589l-0.141,0.081L24.086,20.904zM28.4,15.688l-7.15-4.129v2.297H10.275v3.661H21.25v2.297L28.4,15.688z",
    "import" : "M15.067,2.25c-5.979,0-11.035,3.91-12.778,9.309h3.213c1.602-3.705,5.271-6.301,9.565-6.309c5.764,0.01,10.428,4.674,10.437,10.437c-0.009,5.764-4.673,10.428-10.437,10.438c-4.294-0.007-7.964-2.605-9.566-6.311H2.289c1.744,5.399,6.799,9.31,12.779,9.312c7.419-0.002,13.437-6.016,13.438-13.438C28.504,8.265,22.486,2.252,15.067,2.25zM10.918,19.813l7.15-4.126l-7.15-4.129v2.297H-0.057v3.661h10.975V19.813z",
    run : "M17.41,20.395l-0.778-2.723c0.228-0.2,0.442-0.414,0.644-0.643l2.721,0.778c0.287-0.418,0.534-0.862,0.755-1.323l-2.025-1.96c0.097-0.288,0.181-0.581,0.241-0.883l2.729-0.684c0.02-0.252,0.039-0.505,0.039-0.763s-0.02-0.51-0.039-0.762l-2.729-0.684c-0.061-0.302-0.145-0.595-0.241-0.883l2.026-1.96c-0.222-0.46-0.469-0.905-0.756-1.323l-2.721,0.777c-0.201-0.228-0.416-0.442-0.644-0.643l0.778-2.722c-0.418-0.286-0.863-0.534-1.324-0.755l-1.96,2.026c-0.287-0.097-0.581-0.18-0.883-0.241l-0.683-2.73c-0.253-0.019-0.505-0.039-0.763-0.039s-0.51,0.02-0.762,0.039l-0.684,2.73c-0.302,0.061-0.595,0.144-0.883,0.241l-1.96-2.026C7.048,3.463,6.604,3.71,6.186,3.997l0.778,2.722C6.736,6.919,6.521,7.134,6.321,7.361L3.599,6.583C3.312,7.001,3.065,7.446,2.844,7.907l2.026,1.96c-0.096,0.288-0.18,0.581-0.241,0.883l-2.73,0.684c-0.019,0.252-0.039,0.505-0.039,0.762s0.02,0.51,0.039,0.763l2.73,0.684c0.061,0.302,0.145,0.595,0.241,0.883l-2.026,1.96c0.221,0.46,0.468,0.905,0.755,1.323l2.722-0.778c0.2,0.229,0.415,0.442,0.643,0.643l-0.778,2.723c0.418,0.286,0.863,0.533,1.323,0.755l1.96-2.026c0.288,0.097,0.581,0.181,0.883,0.241l0.684,2.729c0.252,0.02,0.505,0.039,0.763,0.039s0.51-0.02,0.763-0.039l0.683-2.729c0.302-0.061,0.596-0.145,0.883-0.241l1.96,2.026C16.547,20.928,16.992,20.681,17.41,20.395zM11.798,15.594c-1.877,0-3.399-1.522-3.399-3.399s1.522-3.398,3.399-3.398s3.398,1.521,3.398,3.398S13.675,15.594,11.798,15.594zM27.29,22.699c0.019-0.547-0.06-1.104-0.23-1.654l1.244-1.773c-0.188-0.35-0.4-0.682-0.641-0.984l-2.122,0.445c-0.428-0.364-0.915-0.648-1.436-0.851l-0.611-2.079c-0.386-0.068-0.777-0.105-1.173-0.106l-0.974,1.936c-0.279,0.054-0.558,0.128-0.832,0.233c-0.257,0.098-0.497,0.22-0.727,0.353L17.782,17.4c-0.297,0.262-0.568,0.545-0.813,0.852l0.907,1.968c-0.259,0.495-0.437,1.028-0.519,1.585l-1.891,1.06c0.019,0.388,0.076,0.776,0.164,1.165l2.104,0.519c0.231,0.524,0.541,0.993,0.916,1.393l-0.352,2.138c0.32,0.23,0.66,0.428,1.013,0.6l1.715-1.32c0.536,0.141,1.097,0.195,1.662,0.15l1.452,1.607c0.2-0.057,0.399-0.118,0.596-0.193c0.175-0.066,0.34-0.144,0.505-0.223l0.037-2.165c0.455-0.339,0.843-0.747,1.152-1.206l2.161-0.134c0.152-0.359,0.279-0.732,0.368-1.115L27.29,22.699zM23.127,24.706c-1.201,0.458-2.545-0.144-3.004-1.345s0.143-2.546,1.344-3.005c1.201-0.458,2.547,0.144,3.006,1.345C24.931,22.902,24.328,24.247,23.127,24.706z",
    magnet : "M20.812,19.5h5.002v-6.867c-0.028-1.706-0.61-3.807-2.172-5.841c-1.539-2.014-4.315-3.72-7.939-3.687C12.076,3.073,9.3,4.779,7.762,6.792C6.2,8.826,5.617,10.928,5.588,12.634V19.5h5v-6.866c-0.027-0.377,0.303-1.789,1.099-2.748c0.819-0.979,1.848-1.747,4.014-1.778c2.165,0.032,3.195,0.799,4.013,1.778c0.798,0.959,1.126,2.372,1.099,2.748V19.5L20.812,19.5zM25.814,25.579c0,0,0-2.354,0-5.079h-5.002c0,2.727,0,5.08,0,5.08l5.004-0.001H25.814zM5.588,25.58h5c0,0,0-2.354,0-5.08h-5C5.588,23.227,5.588,25.58,5.588,25.58z",
    nomagnet : "M10.59,17.857v-5.225c-0.027-0.376,0.303-1.789,1.099-2.748c0.819-0.979,1.849-1.748,4.014-1.778c1.704,0.026,2.699,0.508,3.447,1.189l3.539-3.539c-1.616-1.526-4.01-2.679-6.986-2.652C12.077,3.073,9.3,4.779,7.762,6.793C6.2,8.826,5.617,10.928,5.59,12.634V19.5h3.357L10.59,17.857zM5.59,20.5v2.357L7.947,20.5H5.59zM20.812,13.29v6.21h5.002v-6.866c-0.021-1.064-0.252-2.283-0.803-3.542L20.812,13.29zM25.339,4.522L4.652,25.209l1.415,1.416L26.753,5.937L25.339,4.522zM20.812,25.58h5.002c0,0,0-2.354,0-5.08h-5.002C20.812,23.227,20.812,25.58,20.812,25.58zM10.59,25.58c0,0,0-0.827,0-2.064L8.525,25.58H10.59z",
    reflecth : "M15.57,20.273h0.854v-1.705H15.57V20.273zM15.57,23.686h0.854V21.98H15.57V23.686zM15.57,27.096h0.854v-1.705H15.57V27.096zM15.57,29.689h0.854V28.8H15.57V29.689zM15.57,16.865h0.854V15.16H15.57V16.865zM15.57,3.225h0.854V1.52H15.57V3.225zM15.57,6.635h0.854V4.93H15.57V6.635zM15.57,10.045h0.854V8.34H15.57V10.045zM15.57,13.455h0.854V11.75H15.57V13.455zM18.41,3.327V25.46h12.015L18.41,3.327zM19.264,6.68l9.729,17.93h-9.729V6.68zM13.535,25.46V3.327L1.521,25.46H13.535z",
    reflectv : "M20.643,16.008v-0.854h-1.705v0.854H20.643zM24.053,16.008v-0.854h-1.705v0.854H24.053zM27.463,16.008v-0.854h-1.705v0.854H27.463zM30.059,16.008v-0.854h-0.891v0.854H30.059zM17.232,16.008v-0.854h-1.709v0.854H17.232zM3.593,16.008v-0.854H1.888v0.854H3.593zM7.003,16.008v-0.854H5.298v0.854H7.003zM10.414,16.008v-0.854H8.709v0.854H10.414zM13.824,16.008v-0.854h-1.705v0.854H13.824zM3.694,13.167h22.134V1.152L3.694,13.167zM7.048,12.314l17.929-9.729v9.729H7.048zM25.828,18.042H3.694l22.134,12.015V18.042z",
    resize2 : "M1.999,2.332v26.499H28.5V2.332H1.999zM26.499,26.832H4V12.5h8.167V4.332h14.332V26.832zM15.631,17.649l5.468,5.469l-1.208,1.206l5.482,1.469l-1.47-5.481l-1.195,1.195l-5.467-5.466l1.209-1.208l-5.482-1.469l1.468,5.48L15.631,17.649z",
    rotate : "M15.5,5.27c1.914,0,3.666,0.629,5.089,1.686l-1.781,1.783l8.428,2.256l-2.26-8.427l-1.889,1.89C21.016,2.781,18.371,1.77,15.5,1.77C8.827,1.773,3.418,7.181,3.417,13.855c0.001,4.063,2.012,7.647,5.084,9.838v-4.887c-0.993-1.4-1.583-3.105-1.585-4.952C6.923,9.114,10.759,5.278,15.5,5.27zM9.5,29.23h12V12.355h-12V29.23z",
    connect : "M25.06,13.719c-0.944-5.172-5.461-9.094-10.903-9.094v4c3.917,0.006,7.085,3.176,7.094,7.094c-0.009,3.917-3.177,7.085-7.094,7.093v4.002c5.442-0.004,9.959-3.926,10.903-9.096h4.69v-3.999H25.06zM20.375,15.719c0-3.435-2.784-6.219-6.219-6.219c-2.733,0-5.05,1.766-5.884,4.218H1.438v4.001h6.834c0.833,2.452,3.15,4.219,5.884,4.219C17.591,21.938,20.375,19.153,20.375,15.719z",
    disconnect : "M9.219,9.5c-2.733,0-5.05,1.766-5.884,4.218H1.438v4.001h1.897c0.833,2.452,3.15,4.219,5.884,4.219c3.435,0,6.219-2.784,6.219-6.219S12.653,9.5,9.219,9.5zM27.685,13.719c-0.944-5.172-5.461-9.094-10.903-9.094v4c3.917,0.006,7.085,3.176,7.094,7.094c-0.009,3.917-3.177,7.085-7.094,7.093v4.002c5.442-0.004,9.959-3.926,10.903-9.096h2.065v-3.999H27.685z",
    folder : "M28.625,26.75h-26.5V8.375h1.124c1.751,0,0.748-3.125,3-3.125c3.215,0,1.912,0,5.126,0c2.251,0,1.251,3.125,3.001,3.125h14.25V26.75z",
    man : "M21.021,16.349c-0.611-1.104-1.359-1.998-2.109-2.623c-0.875,0.641-1.941,1.031-3.103,1.031c-1.164,0-2.231-0.391-3.105-1.031c-0.75,0.625-1.498,1.519-2.111,2.623c-1.422,2.563-1.578,5.192-0.35,5.874c0.55,0.307,1.127,0.078,1.723-0.496c-0.105,0.582-0.166,1.213-0.166,1.873c0,2.932,1.139,5.307,2.543,5.307c0.846,0,1.265-0.865,1.466-2.189c0.201,1.324,0.62,2.189,1.463,2.189c1.406,0,2.545-2.375,2.545-5.307c0-0.66-0.061-1.291-0.168-1.873c0.598,0.574,1.174,0.803,1.725,0.496C22.602,21.541,22.443,18.912,21.021,16.349zM15.808,13.757c2.362,0,4.278-1.916,4.278-4.279s-1.916-4.279-4.278-4.279c-2.363,0-4.28,1.916-4.28,4.279S13.445,13.757,15.808,13.757z",
    woman : "M21.022,16.349c-0.611-1.104-1.359-1.998-2.109-2.623c-0.875,0.641-1.941,1.031-3.104,1.031c-1.164,0-2.231-0.391-3.105-1.031c-0.75,0.625-1.498,1.519-2.111,2.623c-1.422,2.563-1.579,5.192-0.351,5.874c0.55,0.307,1.127,0.078,1.723-0.496c-0.105,0.582-0.167,1.213-0.167,1.873c0,2.932,1.139,5.307,2.543,5.307c0.846,0,1.265-0.865,1.466-2.189c0.201,1.324,0.62,2.189,1.464,2.189c1.406,0,2.545-2.375,2.545-5.307c0-0.66-0.061-1.291-0.168-1.873c0.598,0.574,1.174,0.803,1.725,0.496C22.603,21.541,22.444,18.912,21.022,16.349zM15.808,13.757c2.363,0,4.279-1.916,4.279-4.279s-1.916-4.279-4.279-4.279c-2.363,0-4.28,1.916-4.28,4.279S13.445,13.757,15.808,13.757zM18.731,4.974c1.235,0.455,0.492-0.725,0.492-1.531s0.762-1.792-0.492-1.391c-1.316,0.422-2.383,0.654-2.383,1.461S17.415,4.489,18.731,4.974zM15.816,4.4c0.782,0,0.345-0.396,0.345-0.884c0-0.488,0.438-0.883-0.345-0.883s-0.374,0.396-0.374,0.883C15.442,4.005,15.034,4.4,15.816,4.4zM12.884,4.974c1.316-0.484,2.383-0.654,2.383-1.461S14.2,2.474,12.884,2.052c-1.254-0.402-0.492,0.584-0.492,1.391S11.648,5.428,12.884,4.974z",
    speaker : "M12.558,15.254c2.362,0,4.277-1.916,4.277-4.279s-1.916-4.279-4.277-4.279c-2.363,0-4.28,1.916-4.28,4.279S10.194,15.254,12.558,15.254zM15.662,15.224c-0.875,0.641-1.941,1.031-3.103,1.031c-1.164,0-2.231-0.391-3.105-1.031c-0.75,0.625-1.498,1.519-2.111,2.623c-1.422,2.563-1.578,5.192-0.35,5.874c0.55,0.312,1.127,0.078,1.723-0.496c-0.105,0.582-0.166,1.213-0.166,1.873c0,2.938,1.139,5.312,2.543,5.312c0.846,0,1.265-0.865,1.466-2.188c0.201,1.311,0.62,2.188,1.462,2.188c1.396,0,2.544-2.375,2.544-5.312c0-0.66-0.062-1.291-0.167-1.873c0.598,0.574,1.174,0.812,1.725,0.496c1.228-0.682,1.069-3.311-0.353-5.874C17.159,16.742,16.412,15.849,15.662,15.224zM19.821,3.711l-1.414,1.414c1.499,1.499,2.428,3.569,2.428,5.851c0,2.283-0.929,4.353-2.428,5.853l1.413,1.412c1.861-1.86,3.015-4.43,3.015-7.265C22.835,8.142,21.683,5.572,19.821,3.711zM16.288,14.707l1.413,1.414c1.318-1.318,2.135-3.138,2.135-5.145c0-2.007-0.816-3.827-2.134-5.145l-1.414,1.414c0.956,0.956,1.547,2.275,1.547,3.731S17.243,13.751,16.288,14.707zM21.941,1.59l-1.413,1.414c2.042,2.042,3.307,4.862,3.307,7.971c0,3.11-1.265,5.93-3.308,7.972l1.413,1.414c2.405-2.404,3.895-5.725,3.895-9.386C25.835,7.315,24.346,3.995,21.941,1.59z",
    people : "M21.066,20.667c1.227-0.682,1.068-3.311-0.354-5.874c-0.611-1.104-1.359-1.998-2.109-2.623c-0.875,0.641-1.941,1.031-3.102,1.031c-1.164,0-2.231-0.391-3.104-1.031c-0.75,0.625-1.498,1.519-2.111,2.623c-1.422,2.563-1.578,5.192-0.35,5.874c0.549,0.312,1.127,0.078,1.723-0.496c-0.105,0.582-0.166,1.213-0.166,1.873c0,2.938,1.139,5.312,2.543,5.312c0.846,0,1.265-0.865,1.466-2.188c0.2,1.314,0.62,2.188,1.461,2.188c1.396,0,2.545-2.375,2.545-5.312c0-0.66-0.062-1.291-0.168-1.873C19.939,20.745,20.516,20.983,21.066,20.667zM15.5,12.201c2.361,0,4.277-1.916,4.277-4.279S17.861,3.644,15.5,3.644c-2.363,0-4.28,1.916-4.28,4.279S13.137,12.201,15.5,12.201zM24.094,14.914c1.938,0,3.512-1.573,3.512-3.513c0-1.939-1.573-3.513-3.512-3.513c-1.94,0-3.513,1.573-3.513,3.513C20.581,13.341,22.153,14.914,24.094,14.914zM28.374,17.043c-0.502-0.907-1.116-1.641-1.732-2.154c-0.718,0.526-1.594,0.846-2.546,0.846c-0.756,0-1.459-0.207-2.076-0.55c0.496,1.093,0.803,2.2,0.861,3.19c0.093,1.516-0.381,2.641-1.329,3.165c-0.204,0.117-0.426,0.183-0.653,0.224c-0.056,0.392-0.095,0.801-0.095,1.231c0,2.412,0.935,4.361,2.088,4.361c0.694,0,1.039-0.71,1.204-1.796c0.163,1.079,0.508,1.796,1.199,1.796c1.146,0,2.09-1.95,2.09-4.361c0-0.542-0.052-1.06-0.139-1.538c0.492,0.472,0.966,0.667,1.418,0.407C29.671,21.305,29.541,19.146,28.374,17.043zM6.906,14.914c1.939,0,3.512-1.573,3.512-3.513c0-1.939-1.573-3.513-3.512-3.513c-1.94,0-3.514,1.573-3.514,3.513C3.392,13.341,4.966,14.914,6.906,14.914zM9.441,21.536c-1.593-0.885-1.739-3.524-0.457-6.354c-0.619,0.346-1.322,0.553-2.078,0.553c-0.956,0-1.832-0.321-2.549-0.846c-0.616,0.513-1.229,1.247-1.733,2.154c-1.167,2.104-1.295,4.262-0.287,4.821c0.451,0.257,0.925,0.064,1.414-0.407c-0.086,0.479-0.136,0.996-0.136,1.538c0,2.412,0.935,4.361,2.088,4.361c0.694,0,1.039-0.71,1.204-1.796c0.165,1.079,0.509,1.796,1.201,1.796c1.146,0,2.089-1.95,2.089-4.361c0-0.432-0.04-0.841-0.097-1.233C9.874,21.721,9.651,21.656,9.441,21.536z",
    parent : "M14.423,12.17c-0.875,0.641-1.941,1.031-3.102,1.031c-1.164,0-2.231-0.391-3.104-1.031c-0.75,0.625-1.498,1.519-2.111,2.623c-1.422,2.563-1.578,5.192-0.35,5.874c0.549,0.312,1.127,0.078,1.723-0.496c-0.105,0.582-0.166,1.213-0.166,1.873c0,2.938,1.139,5.312,2.543,5.312c0.846,0,1.265-0.865,1.466-2.188c0.2,1.314,0.62,2.188,1.461,2.188c1.396,0,2.545-2.375,2.545-5.312c0-0.66-0.062-1.291-0.168-1.873c0.6,0.574,1.176,0.812,1.726,0.496c1.227-0.682,1.068-3.311-0.354-5.874C15.921,13.689,15.173,12.795,14.423,12.17zM11.32,12.201c2.361,0,4.277-1.916,4.277-4.279s-1.916-4.279-4.277-4.279c-2.363,0-4.28,1.916-4.28,4.279S8.957,12.201,11.32,12.201zM21.987,17.671c1.508,0,2.732-1.225,2.732-2.735c0-1.51-1.225-2.735-2.732-2.735c-1.511,0-2.736,1.225-2.736,2.735C19.251,16.446,20.477,17.671,21.987,17.671zM25.318,19.327c-0.391-0.705-0.869-1.277-1.349-1.677c-0.56,0.41-1.24,0.659-1.982,0.659c-0.744,0-1.426-0.25-1.983-0.659c-0.479,0.399-0.958,0.972-1.35,1.677c-0.909,1.638-1.009,3.318-0.224,3.754c0.351,0.2,0.721,0.05,1.101-0.317c-0.067,0.372-0.105,0.775-0.105,1.197c0,1.878,0.728,3.396,1.625,3.396c0.54,0,0.808-0.553,0.937-1.398c0.128,0.841,0.396,1.398,0.934,1.398c0.893,0,1.627-1.518,1.627-3.396c0-0.422-0.04-0.825-0.107-1.197c0.383,0.367,0.752,0.52,1.104,0.317C26.328,22.646,26.227,20.965,25.318,19.327z",
    notebook : "M24.875,1.375H8c-1.033,0-1.874,0.787-1.979,1.792h1.604c1.102,0,2,0.898,2,2c0,1.102-0.898,2-2,2H6v0.999h1.625c1.104,0,2.002,0.898,2.002,2.002c0,1.104-0.898,2.001-2.002,2.001H6v0.997h1.625c1.102,0,2,0.898,2,2c0,1.104-0.898,2.004-2,2.004H6v0.994h1.625c1.102,0,2,0.898,2,2.002s-0.898,2.002-2,2.002H6v0.997h1.624c1.104,0,2.002,0.897,2.002,2.001c0,1.104-0.898,2.002-2.002,2.002H6.004C6.027,28.252,6.91,29.125,8,29.125h16.875c1.104,0,2-0.896,2-2V3.375C26.875,2.271,25.979,1.375,24.875,1.375zM25.25,8.375c0,0.552-0.447,1-1,1H14c-0.553,0-1-0.448-1-1V4c0-0.552,0.447-1,1-1h10.25c0.553,0,1,0.448,1,1V8.375zM8.625,25.166c0-0.554-0.449-1.001-1-1.001h-3.25c-0.552,0-1,0.447-1,1.001c0,0.552,0.449,1,1,1h3.25C8.176,26.166,8.625,25.718,8.625,25.166zM4.375,6.166h3.251c0.551,0,0.999-0.448,0.999-0.999c0-0.555-0.448-1-0.999-1H4.375c-0.553,0-1,0.445-1,1C3.374,5.718,3.822,6.166,4.375,6.166zM4.375,11.167h3.25c0.553,0,1-0.448,1-1s-0.448-1-1-1h-3.25c-0.553,0-1,0.448-1,1S3.822,11.167,4.375,11.167zM4.375,16.167h3.25c0.551,0,1-0.448,1-1.001s-0.448-0.999-1-0.999h-3.25c-0.553,0-1.001,0.446-1.001,0.999S3.822,16.167,4.375,16.167zM3.375,20.165c0,0.553,0.446,1.002,1,1.002h3.25c0.551,0,1-0.449,1-1.002c0-0.552-0.448-1-1-1h-3.25C3.821,19.165,3.375,19.613,3.375,20.165z",
    diagram : "M6.812,17.202l7.396-3.665v-2.164h-0.834c-0.414,0-0.808-0.084-1.167-0.237v1.159l-7.396,3.667v2.912h2V17.202zM26.561,18.875v-2.913l-7.396-3.666v-1.158c-0.358,0.152-0.753,0.236-1.166,0.236h-0.832l-0.001,2.164l7.396,3.666v1.672H26.561zM16.688,18.875v-7.501h-2v7.501H16.688zM27.875,19.875H23.25c-1.104,0-2,0.896-2,2V26.5c0,1.104,0.896,2,2,2h4.625c1.104,0,2-0.896,2-2v-4.625C29.875,20.771,28.979,19.875,27.875,19.875zM8.125,19.875H3.5c-1.104,0-2,0.896-2,2V26.5c0,1.104,0.896,2,2,2h4.625c1.104,0,2-0.896,2-2v-4.625C10.125,20.771,9.229,19.875,8.125,19.875zM13.375,10.375H18c1.104,0,2-0.896,2-2V3.75c0-1.104-0.896-2-2-2h-4.625c-1.104,0-2,0.896-2,2v4.625C11.375,9.479,12.271,10.375,13.375,10.375zM18,19.875h-4.625c-1.104,0-2,0.896-2,2V26.5c0,1.104,0.896,2,2,2H18c1.104,0,2-0.896,2-2v-4.625C20,20.771,19.104,19.875,18,19.875z",
    barchart : "M21.25,8.375V28h6.5V8.375H21.25zM12.25,28h6.5V4.125h-6.5V28zM3.25,28h6.5V12.625h-6.5V28z",
    piechart : "M15.583,15.917l1.648-10.779C16.692,5.056,16.145,5,15.583,5C9.554,5,4.666,9.888,4.666,15.917c0,6.029,4.888,10.917,10.917,10.917S26.5,21.946,26.5,15.917c0-0.256-0.021-0.507-0.038-0.759L15.583,15.917zM19.437,3.127l-1.648,10.779l10.879-0.759C28.313,8.026,24.436,3.886,19.437,3.127z",
    linechart : "M3.625,25.062c-0.539-0.115-0.885-0.646-0.77-1.187l0,0L6.51,6.584l2.267,9.259l1.923-5.188l3.581,3.741l3.883-13.103l2.934,11.734l1.96-1.509l5.271,11.74c0.226,0.504,0,1.095-0.505,1.321l0,0c-0.505,0.227-1.096,0-1.322-0.504l0,0l-4.23-9.428l-2.374,1.826l-1.896-7.596l-2.783,9.393l-3.754-3.924L8.386,22.66l-1.731-7.083l-1.843,8.711c-0.101,0.472-0.515,0.794-0.979,0.794l0,0C3.765,25.083,3.695,25.076,3.625,25.062L3.625,25.062z",
    apps : "M24.359,18.424l-2.326,1.215c0.708,1.174,1.384,2.281,1.844,3.033l2.043-1.066C25.538,20.822,24.966,19.652,24.359,18.424zM19.143,14.688c0.445,0.84,1.342,2.367,2.274,3.926l2.414-1.261c-0.872-1.769-1.72-3.458-2.087-4.122c-0.896-1.621-1.982-3.108-3.454-5.417c-1.673-2.625-3.462-5.492-4.052-4.947c-1.194,0.384,1.237,4.094,1.876,5.715C16.73,10.147,17.991,12.512,19.143,14.688zM26.457,22.673l-1.961,1.022l1.982,4.598c0,0,0.811,0.684,1.92,0.213c1.104-0.469,0.81-1.706,0.81-1.706L26.457,22.673zM24.35,15.711c0.168,0.339,2.924,5.93,2.924,5.93h1.983v-5.93H24.35zM18.34,15.704h-4.726l-3.424,5.935h11.66C21.559,21.159,18.771,16.479,18.34,15.704zM3.231,21.613l3.437-5.902H2.083v5.93h1.133L3.231,21.613zM15.048,10.145c0-0.93-0.754-1.685-1.685-1.685c-0.661,0-1.231,0.381-1.507,0.936l2.976,1.572C14.97,10.725,15.048,10.444,15.048,10.145zM14.343,12.06l-3.188-1.684L9.62,13.012l3.197,1.689L14.343,12.06zM3.192,26.886l-0.384,1.108v0.299l0.298-0.128l0.725-0.896l2.997-2.354l-3.137-1.651L3.192,26.886zM9.02,14.044l-4.757,8.17l3.23,1.706l4.728-8.186L9.02,14.044z",
    locked : "M26.711,14.085L16.914,4.29c-0.778-0.778-2.051-0.778-2.829,0L4.29,14.086c-0.778,0.778-0.778,2.05,0,2.829l9.796,9.796c0.778,0.777,2.051,0.777,2.829,0l9.797-9.797C27.488,16.136,27.488,14.863,26.711,14.085zM8.218,16.424c-0.4-0.153-0.687-0.533-0.687-0.987s0.287-0.834,0.687-0.987V16.424zM8.969,16.424v-1.974c0.4,0.152,0.687,0.533,0.687,0.987S9.369,16.272,8.969,16.424zM13.5,19.188l1.203-3.609c-0.689-0.306-1.172-0.994-1.172-1.797c0-1.087,0.881-1.969,1.969-1.969c1.087,0,1.969,0.881,1.969,1.969c0,0.803-0.482,1.491-1.172,1.797l1.203,3.609H13.5zM22.03,16.549c-0.399-0.152-0.687-0.533-0.687-0.986s0.287-0.834,0.687-0.987V16.549zM22.781,16.549v-1.973c0.4,0.152,0.688,0.533,0.688,0.987S23.182,16.397,22.781,16.549z",
    ppt : "M16.604,1.914c0-0.575-0.466-1.041-1.041-1.041s-1.041,0.466-1.041,1.041v1.04h2.082V1.914zM16.604,22.717h-2.082v3.207c0,0.574-4.225,4.031-4.225,4.031l2.468-0.003l2.807-2.673l3.013,2.693l2.272-0.039l-4.254-4.011V22.717L16.604,22.717zM28.566,7.113c0.86,0,1.56-0.698,1.56-1.56c0-0.861-0.698-1.56-1.56-1.56H2.561c-0.861,0-1.56,0.699-1.56,1.56c0,0.862,0.699,1.56,1.56,1.56h1.583v12.505l-0.932-0.022c-0.861,0-1.213,0.467-1.213,1.04c0,0.576,0.352,1.041,1.213,1.041h24.597c0.86,0,1.299-0.465,1.299-1.041c0-1.094-1.299-1.04-1.299-1.04l-0.804,0.109V7.113H28.566zM11.435,17.516c-3.771,0-4.194-4.191-4.194-4.191c0-4.096,4.162-4.161,4.162-4.161v4.161h4.193C15.596,17.516,11.435,17.516,11.435,17.516zM18.716,13.388h-1.071v-1.073h1.071V13.388zM18.716,10.267h-1.071V9.194h1.071V10.267zM23.314,13.388H20.26c-0.296,0-0.535-0.24-0.535-0.536c0-0.297,0.239-0.537,0.535-0.537h3.057c0.297,0,0.535,0.24,0.535,0.537C23.852,13.147,23.611,13.388,23.314,13.388zM23.314,10.267H20.26c-0.296,0-0.535-0.239-0.535-0.535c0-0.297,0.239-0.537,0.535-0.537h3.057c0.297,0,0.535,0.24,0.535,0.537C23.852,10.027,23.611,10.267,23.314,10.267z",
    lab : "M22.121,24.438l-3.362-7.847c-0.329-0.769-0.599-2.081-0.599-2.917s0.513-1.521,1.14-1.521s1.141-0.513,1.141-1.14s-0.685-1.14-1.521-1.14h-6.84c-0.836,0-1.52,0.513-1.52,1.14s0.513,1.14,1.14,1.14s1.14,0.685,1.14,1.521s-0.269,2.148-0.599,2.917l-3.362,7.847C8.55,25.206,8.28,26.177,8.28,26.595s0.342,1.103,0.76,1.521s1.444,0.76,2.28,0.76h8.359c0.836,0,1.862-0.342,2.28-0.76s0.76-1.103,0.76-1.521S22.45,25.206,22.121,24.438zM16.582,7.625c0,0.599,0.484,1.083,1.083,1.083s1.083-0.484,1.083-1.083s-0.484-1.084-1.083-1.084S16.582,7.026,16.582,7.625zM13.667,7.792c0.276,0,0.5-0.224,0.5-0.5s-0.224-0.5-0.5-0.5s-0.5,0.224-0.5,0.5S13.391,7.792,13.667,7.792zM15.584,5.292c0.874,0,1.583-0.709,1.583-1.583c0-0.875-0.709-1.584-1.583-1.584C14.709,2.125,14,2.834,14,3.709C14,4.583,14.709,5.292,15.584,5.292z",
    umbrella : "M14.784,26.991c0,1.238-1.329,1.696-1.835,1.696c-0.504,0-1.536-0.413-1.65-1.812c0-0.354-0.288-0.642-0.644-0.642c-0.354,0-0.641,0.287-0.641,0.642c0.045,1.056,0.756,3.052,2.935,3.052c2.432,0,3.166-1.882,3.166-3.144v-8.176l-1.328-0.024C14.787,18.584,14.784,25.889,14.784,26.991zM15.584,9.804c-6.807,0-11.084,4.859-11.587,8.326c0.636-0.913,1.694-1.51,2.89-1.51c1.197,0,2.22,0.582,2.855,1.495c0.638-0.904,1.69-1.495,2.88-1.495c1.2,0,2.26,0.6,2.896,1.517c0.635-0.917,1.83-1.517,3.03-1.517c1.19,0,2.241,0.591,2.879,1.495c0.636-0.913,1.659-1.495,2.855-1.495c1.197,0,2.254,0.597,2.89,1.51C26.669,14.663,22.393,9.804,15.584,9.804zM14.733,7.125v2.081h1.323V7.125c0-0.365-0.296-0.661-0.661-0.661C15.029,6.464,14.733,6.76,14.733,7.125z",
    dry : "M14.784,26.991c0,1.238-1.329,1.696-1.835,1.696c-0.504,0-1.536-0.413-1.65-1.812c0-0.354-0.288-0.642-0.644-0.642c-0.354,0-0.641,0.287-0.641,0.642c0.045,1.056,0.756,3.052,2.935,3.052c2.432,0,3.166-1.882,3.166-3.144v-8.176l-1.328-0.024C14.787,18.584,14.784,25.889,14.784,26.991zM15.584,9.804c-6.807,0-11.084,4.859-11.587,8.326c0.636-0.913,1.694-1.51,2.89-1.51c1.197,0,2.22,0.582,2.855,1.495c0.638-0.904,1.69-1.495,2.88-1.495c1.2,0,2.26,0.6,2.896,1.517c0.635-0.917,1.83-1.517,3.03-1.517c1.19,0,2.241,0.591,2.879,1.495c0.636-0.913,1.659-1.495,2.855-1.495c1.197,0,2.254,0.597,2.89,1.51C26.669,14.663,22.393,9.804,15.584,9.804zM14.733,7.125v2.081h1.323V7.125c0-0.365-0.296-0.661-0.661-0.661C15.029,6.464,14.733,6.76,14.733,7.125zM7.562,6.015c0.54,0.312,1.229,0.128,1.54-0.412c0.109-0.189,0.157-0.398,0.15-0.602L9.251,3.09L7.59,4.047c-0.178,0.095-0.333,0.24-0.441,0.428C6.837,5.015,7.022,5.703,7.562,6.015zM5.572,11.717c0.109-0.19,0.158-0.398,0.151-0.602L5.721,9.203l-1.66,0.957c-0.178,0.096-0.333,0.241-0.441,0.429c-0.311,0.539-0.127,1.229,0.413,1.539C4.571,12.44,5.26,12.256,5.572,11.717zM10.523,9.355c0.539,0.312,1.229,0.126,1.541-0.412c0.109-0.189,0.156-0.398,0.15-0.603L12.214,6.43l-1.662,0.956c-0.177,0.097-0.332,0.241-0.441,0.43C9.799,8.354,9.984,9.044,10.523,9.355zM15.251,3.998c0.539,0.312,1.229,0.126,1.54-0.412c0.11-0.19,0.157-0.398,0.15-0.603L16.94,1.072l-1.661,0.956c-0.178,0.097-0.332,0.242-0.441,0.43C14.526,2.998,14.711,3.687,15.251,3.998zM19.348,8.914c0.539,0.312,1.228,0.128,1.541-0.412c0.109-0.189,0.156-0.398,0.149-0.602h-0.001V5.988l-1.661,0.957c-0.178,0.096-0.332,0.241-0.441,0.429C18.623,7.914,18.809,8.603,19.348,8.914zM23.633,5.196c0.54,0.312,1.23,0.126,1.542-0.413c0.109-0.189,0.156-0.398,0.149-0.602h-0.001V2.27l-1.662,0.957c-0.177,0.096-0.331,0.24-0.44,0.43C22.909,4.195,23.094,4.885,23.633,5.196zM27.528,8.51l-1.659,0.956c-0.18,0.097-0.334,0.242-0.443,0.43c-0.312,0.539-0.127,1.229,0.413,1.54c0.539,0.312,1.229,0.127,1.541-0.412c0.109-0.19,0.158-0.398,0.151-0.603L27.528,8.51z",
    ipad : "M25.221,1.417H6.11c-0.865,0-1.566,0.702-1.566,1.566v25.313c0,0.865,0.701,1.565,1.566,1.565h19.111c0.865,0,1.565-0.7,1.565-1.565V2.984C26.787,2.119,26.087,1.417,25.221,1.417zM15.666,29.299c-0.346,0-0.626-0.279-0.626-0.625s0.281-0.627,0.626-0.627c0.346,0,0.627,0.281,0.627,0.627S16.012,29.299,15.666,29.299zM24.376,26.855c0,0.174-0.142,0.312-0.313,0.312H7.27c-0.173,0-0.313-0.142-0.313-0.312V4.3c0-0.173,0.14-0.313,0.313-0.313h16.792c0.172,0,0.312,0.14,0.312,0.313L24.376,26.855L24.376,26.855z",
    iphone : "M20.755,1H10.62C9.484,1,8.562,1.921,8.562,3.058v24.385c0,1.136,0.921,2.058,2.058,2.058h10.135c1.136,0,2.058-0.922,2.058-2.058V3.058C22.812,1.921,21.891,1,20.755,1zM14.659,3.264h2.057c0.101,0,0.183,0.081,0.183,0.18c0,0.1-0.082,0.18-0.183,0.18h-2.057c-0.1,0-0.181-0.081-0.181-0.18C14.478,3.344,14.559,3.264,14.659,3.264zM13.225,3.058c0.199,0,0.359,0.162,0.359,0.36c0,0.198-0.161,0.36-0.359,0.36c-0.2,0-0.36-0.161-0.36-0.36S13.025,3.058,13.225,3.058zM15.688,28.473c-0.796,0-1.44-0.646-1.44-1.438c0-0.799,0.645-1.439,1.44-1.439s1.44,0.646,1.44,1.439S16.483,28.473,15.688,28.473zM22.041,24.355c0,0.17-0.139,0.309-0.309,0.309H9.642c-0.17,0-0.308-0.139-0.308-0.309V6.042c0-0.17,0.138-0.309,0.308-0.309h12.09c0.17,0,0.309,0.138,0.309,0.309V24.355z",
    jigsaw : "M3.739,13.619c0,0,3.516-4.669,5.592-3.642c2.077,1.027-0.414,2.795,1.598,3.719c2.011,0.924,5.048-0.229,4.376-2.899c-0.672-2.67-1.866-0.776-2.798-2.208c-0.934-1.432,4.586-4.59,4.586-4.59s3.361,6.651,4.316,4.911c1.157-2.105,3.193-4.265,5.305-1.025c0,0,1.814,2.412,0.246,3.434s-2.917,0.443-3.506,1.553c-0.586,1.112,3.784,4.093,3.784,4.093s-2.987,4.81-4.926,3.548c-1.939-1.262,0.356-3.364-2.599-3.989c-1.288-0.23-3.438,0.538-3.818,2.34c-0.13,2.709,1.604,2.016,2.797,3.475c1.191,1.457-4.484,4.522-4.484,4.522s-1.584-3.923-3.811-4.657c-2.227-0.735-0.893,2.135-2.917,2.531c-2.024,0.396-4.816-2.399-3.46-4.789c1.358-2.391,3.275-0.044,3.441-1.951C7.629,16.087,3.739,13.619,3.739,13.619z",
    lamp : "M15.5,2.833c-3.866,0-7,3.134-7,7c0,3.859,3.945,4.937,4.223,9.499h5.553c0.278-4.562,4.224-5.639,4.224-9.499C22.5,5.968,19.366,2.833,15.5,2.833zM15.5,28.166c1.894,0,2.483-1.027,2.667-1.666h-5.334C13.017,27.139,13.606,28.166,15.5,28.166zM12.75,25.498h5.5v-5.164h-5.5V25.498z",
    lamp_alt : "M12.75,25.498h5.5v-5.164h-5.5V25.498zM15.5,28.166c1.894,0,2.483-1.027,2.667-1.666h-5.334C13.017,27.139,13.606,28.166,15.5,28.166zM15.5,2.833c-3.866,0-7,3.134-7,7c0,3.859,3.945,4.937,4.223,9.499h1.271c-0.009-0.025-0.024-0.049-0.029-0.078L11.965,8.256c-0.043-0.245,0.099-0.485,0.335-0.563c0.237-0.078,0.494,0.026,0.605,0.25l0.553,1.106l0.553-1.106c0.084-0.17,0.257-0.277,0.446-0.277c0.189,0,0.362,0.107,0.446,0.277l0.553,1.106l0.553-1.106c0.084-0.17,0.257-0.277,0.448-0.277c0.189,0,0.36,0.107,0.446,0.277l0.554,1.106l0.553-1.106c0.111-0.224,0.368-0.329,0.604-0.25s0.377,0.318,0.333,0.563l-1.999,10.998c-0.005,0.029-0.02,0.053-0.029,0.078h1.356c0.278-4.562,4.224-5.639,4.224-9.499C22.5,5.968,19.366,2.833,15.5,2.833zM17.458,10.666c-0.191,0-0.364-0.107-0.446-0.275l-0.554-1.106l-0.553,1.106c-0.086,0.168-0.257,0.275-0.446,0.275c-0.191,0-0.364-0.107-0.449-0.275l-0.553-1.106l-0.553,1.106c-0.084,0.168-0.257,0.275-0.446,0.275c-0.012,0-0.025,0-0.037-0.001l1.454,8.001h1.167l1.454-8.001C17.482,10.666,17.47,10.666,17.458,10.666z",
    video : "M27.188,4.875v1.094h-4.5V4.875H8.062v1.094h-4.5V4.875h-1v21.25h1v-1.094h4.5v1.094h14.625v-1.094h4.5v1.094h1.25V4.875H27.188zM8.062,23.719h-4.5v-3.125h4.5V23.719zM8.062,19.281h-4.5v-3.125h4.5V19.281zM8.062,14.844h-4.5v-3.125h4.5V14.844zM8.062,10.406h-4.5V7.281h4.5V10.406zM11.247,20.59V9.754l9.382,5.418L11.247,20.59zM27.188,23.719h-4.5v-3.125h4.5V23.719zM27.188,19.281h-4.5v-3.125h4.5V19.281zM27.188,14.844h-4.5v-3.125h4.5V14.844zM27.188,10.406h-4.5V7.281h4.5V10.406z",
    palm : "M14.296,27.885v-2.013c0,0-0.402-1.408-1.073-2.013c-0.671-0.604-1.274-1.274-1.409-1.61c0,0-0.268,0.135-0.737-0.335s-1.812-2.616-1.812-2.616l-0.671-0.872c0,0-0.47-0.671-1.275-1.342c-0.805-0.672-0.938-0.067-1.476-0.738s0.604-1.275,1.006-1.409c0.403-0.134,1.946,0.134,2.684,0.872c0.738,0.738,0.738,0.738,0.738,0.738l1.073,1.141l0.537,0.201l0.671-1.073l-0.269-2.281c0,0-0.604-2.55-0.737-4.764c-0.135-2.214-0.47-5.703,1.006-5.837s1.007,2.55,1.073,3.489c0.067,0.938,0.806,5.232,1.208,5.568c0.402,0.335,0.671,0.066,0.671,0.066l0.402-7.514c0,0-0.479-2.438,1.073-2.549c0.939-0.067,0.872,1.543,0.872,2.147c0,0.604,0.269,7.514,0.269,7.514l0.537,0.135c0,0,0.402-2.214,0.604-3.153s0.604-2.416,0.537-3.087c-0.067-0.671-0.135-2.348,1.006-2.348s0.872,1.812,0.939,2.415s-0.134,3.153-0.134,3.757c0,0.604-0.738,3.623-0.537,3.824s2.08-2.817,2.349-3.958c0.268-1.141,0.201-3.02,1.408-2.885c1.208,0.134,0.47,2.817,0.402,3.086c-0.066,0.269-0.671,2.349-0.872,2.952s-0.805,1.476-1.006,2.013s0.402,2.349,0,4.629c-0.402,2.281-1.61,5.166-1.61,5.166l0.604,2.08c0,0-1.744,0.671-3.824,0.805C16.443,28.221,14.296,27.885,14.296,27.885z",
    fave : "M24.132,7.971c-2.203-2.205-5.916-2.098-8.25,0.235L15.5,8.588l-0.382-0.382c-2.334-2.333-6.047-2.44-8.25-0.235c-2.204,2.203-2.098,5.916,0.235,8.249l8.396,8.396l8.396-8.396C26.229,13.887,26.336,10.174,24.132,7.971z",
    help : "M4.834,4.834L4.833,4.833c-5.889,5.892-5.89,15.443,0.001,21.334s15.44,5.888,21.33-0.002c5.891-5.891,5.893-15.44,0.002-21.33C20.275-1.056,10.725-1.056,4.834,4.834zM25.459,5.542c0.833,0.836,1.523,1.757,2.104,2.726l-4.08,4.08c-0.418-1.062-1.053-2.06-1.912-2.918c-0.859-0.859-1.857-1.494-2.92-1.913l4.08-4.08C23.7,4.018,24.622,4.709,25.459,5.542zM10.139,20.862c-2.958-2.968-2.959-7.758-0.001-10.725c2.966-2.957,7.756-2.957,10.725,0c2.954,2.965,2.955,7.757-0.001,10.724C17.896,23.819,13.104,23.817,10.139,20.862zM5.542,25.459c-0.833-0.837-1.524-1.759-2.105-2.728l4.081-4.081c0.418,1.063,1.055,2.06,1.914,2.919c0.858,0.859,1.855,1.494,2.917,1.913l-4.081,4.081C7.299,26.982,6.379,26.292,5.542,25.459zM8.268,3.435l4.082,4.082C11.288,7.935,10.29,8.571,9.43,9.43c-0.858,0.859-1.494,1.855-1.912,2.918L3.436,8.267c0.58-0.969,1.271-1.89,2.105-2.727C6.377,4.707,7.299,4.016,8.268,3.435zM22.732,27.563l-4.082-4.082c1.062-0.418,2.061-1.053,2.919-1.912c0.859-0.859,1.495-1.857,1.913-2.92l4.082,4.082c-0.58,0.969-1.271,1.891-2.105,2.728C24.623,26.292,23.701,26.983,22.732,27.563z",
    crop : "M24.303,21.707V8.275l4.48-4.421l-2.021-2.048l-4.126,4.07H8.761V2.083H5.882v3.793H1.8v2.877h4.083v15.832h15.542v4.609h2.878v-4.609H29.2v-2.878H24.303zM19.72,8.753L8.761,19.565V8.753H19.72zM10.688,21.706l10.735-10.591l0.001,10.592L10.688,21.706z",
    biohazard : "M26.154,13.988c-0.96-0.554-1.982-0.892-3.019-1.032c0.396-0.966,0.616-2.023,0.616-3.131c0-4.399-3.438-8.001-7.772-8.264c3.245,0.258,5.803,2.979,5.803,6.292c0,3.373-2.653,6.123-5.983,6.294v1.292c0.908,0.144,1.605,0.934,1.605,1.883c0,0.232-0.043,0.454-0.118,0.66l1.181,0.683c1.826-2.758,5.509-3.658,8.41-1.981c2.896,1.672,3.965,5.299,2.506,8.254C31.386,21.038,29.992,16.204,26.154,13.988zM4.122,16.587c2.92-1.686,6.628-0.764,8.442,2.034l1.141-0.657c-0.072-0.2-0.109-0.417-0.109-0.642c0-0.909,0.638-1.67,1.489-1.859v-1.319c-3.3-0.202-5.92-2.94-5.92-6.292c0-3.297,2.532-6.007,5.757-6.286c-4.312,0.285-7.729,3.875-7.729,8.258c0,1.078,0.206,2.106,0.581,3.05c-1.004,0.147-1.999,0.481-2.931,1.02c-3.812,2.201-5.209,6.985-3.264,10.87C0.174,21.823,1.251,18.244,4.122,16.587zM11.15,11.452c0.114,0.139,0.235,0.271,0.362,0.398c0.126,0.126,0.259,0.247,0.397,0.361c0.102,0.084,0.211,0.16,0.318,0.236c0.93-0.611,2.045-0.969,3.244-0.969c1.201,0,2.312,0.357,3.242,0.969c0.107-0.077,0.217-0.152,0.318-0.236c0.139-0.114,0.271-0.235,0.397-0.361c0.127-0.127,0.248-0.259,0.362-0.398c0.113-0.138,0.222-0.283,0.323-0.431c-1.307-0.956-2.908-1.528-4.643-1.528c-0.042,0-0.083-0.001-0.124,0c-0.019,0-0.04-0.001-0.06,0c-1.666,0.038-3.201,0.605-4.462,1.528C10.929,11.17,11.037,11.314,11.15,11.452zM9.269,16.787c-0.168-0.062-0.338-0.117-0.512-0.164c-0.173-0.047-0.348-0.083-0.525-0.113c-0.177-0.03-0.355-0.053-0.535-0.065c-0.175,1.609,0.13,3.282,0.998,4.786c0.868,1.503,2.164,2.606,3.645,3.259c0.079-0.162,0.15-0.328,0.212-0.496c0.063-0.169,0.118-0.338,0.164-0.512c0.047-0.173,0.087-0.349,0.115-0.525c0.022-0.13,0.034-0.262,0.046-0.394c-0.993-0.5-1.86-1.286-2.461-2.325c-0.6-1.04-0.847-2.182-0.783-3.294C9.512,16.889,9.392,16.833,9.269,16.787zM18.122,22.657c0.014,0.132,0.024,0.263,0.046,0.394c0.03,0.177,0.067,0.352,0.113,0.524c0.047,0.174,0.102,0.346,0.165,0.514c0.062,0.169,0.132,0.333,0.212,0.495c1.48-0.653,2.777-1.755,3.644-3.257c0.868-1.504,1.176-3.179,1.001-4.788c-0.18,0.013-0.358,0.035-0.535,0.065c-0.177,0.029-0.353,0.067-0.525,0.113s-0.345,0.101-0.513,0.163c-0.124,0.047-0.241,0.105-0.362,0.16c0.063,1.11-0.183,2.253-0.784,3.292C19.984,21.373,19.116,22.157,18.122,22.657zM20.569,27.611c-2.92-1.687-3.977-5.358-2.46-8.329l-1.192-0.689c-0.349,0.389-0.854,0.634-1.417,0.634c-0.571,0-1.086-0.254-1.436-0.653l-1.146,0.666c1.475,2.96,0.414,6.598-2.488,8.272c-2.888,1.668-6.552,0.791-8.386-1.935c2.38,3.667,7.249,4.87,11.079,2.658c0.929-0.535,1.711-1.227,2.339-2.018c0.64,0.832,1.45,1.554,2.416,2.112c3.835,2.213,8.709,1.006,11.086-2.671C27.132,28.396,23.463,29.282,20.569,27.611z",
    wheelchair : "M20.373,19.85c0,4.079-3.318,7.397-7.398,7.397c-4.079,0-7.398-3.318-7.398-7.397c0-2.466,1.213-4.652,3.073-5.997l-0.251-2.21c-2.875,1.609-4.825,4.684-4.825,8.207c0,5.184,4.217,9.4,9.401,9.4c4.395,0,8.093-3.031,9.117-7.111L20.37,19.73C20.37,19.771,20.373,19.81,20.373,19.85zM11.768,6.534c1.321,0,2.392-1.071,2.392-2.392c0-1.321-1.071-2.392-2.392-2.392c-1.321,0-2.392,1.071-2.392,2.392C9.375,5.463,10.446,6.534,11.768,6.534zM27.188,22.677l-5.367-7.505c-0.28-0.393-0.749-0.579-1.226-0.538c-0.035-0.003-0.071-0.006-0.106-0.006h-6.132l-0.152-1.335h4.557c0.53,0,0.96-0.429,0.96-0.959c0-0.53-0.43-0.959-0.96-0.959h-4.776l-0.25-2.192c-0.146-1.282-1.303-2.203-2.585-2.057C9.869,7.271,8.948,8.428,9.094,9.71l0.705,6.19c0.136,1.197,1.154,2.078,2.332,2.071c0.004,0,0.007,0.001,0.012,0.001h8.023l4.603,6.436c0.439,0.615,1.338,0.727,2.007,0.248C27.442,24.178,27.628,23.292,27.188,22.677z",
    mic : "M15.5,21.125c2.682,0,4.875-2.25,4.875-5V5.875c0-2.75-2.193-5-4.875-5s-4.875,2.25-4.875,5v10.25C10.625,18.875,12.818,21.125,15.5,21.125zM21.376,11v5.125c0,3.308-2.636,6-5.876,6s-5.875-2.691-5.875-6V11H6.626v5.125c0,4.443,3.194,8.132,7.372,8.861v2.139h-3.372v3h9.749v-3h-3.376v-2.139c4.181-0.727,7.375-4.418,7.375-8.861V11H21.376z",
    micmute : "M10.121,18.529c-0.317-0.736-0.496-1.549-0.496-2.404V11H6.626v5.125c0,1.693,0.466,3.275,1.272,4.627L10.121,18.529zM20.375,8.276V5.875c0-2.75-2.193-5-4.875-5s-4.875,2.25-4.875,5v10.25c0,0.568,0.113,1.105,0.285,1.615L20.375,8.276zM21.376,12.931v3.195c0,3.308-2.636,6-5.876,6c-0.958,0-1.861-0.24-2.661-0.657l-2.179,2.179c0.995,0.659,2.123,1.128,3.338,1.34v2.139h-3.372v3h9.749v-3h-3.376v-2.139c4.181-0.727,7.375-4.418,7.375-8.861V11h-1.068L21.376,12.931zM20.375,16.125v-2.194l-6.788,6.788c0.588,0.26,1.234,0.405,1.913,0.405C18.182,21.125,20.375,18.875,20.375,16.125zM25.542,4.522L4.855,25.209l1.415,1.416L26.956,5.937L25.542,4.522z",
    imac : "M28.936,2.099H2.046c-0.506,0-0.919,0.414-0.919,0.92v21.097c0,0.506,0.413,0.919,0.919,0.919h17.062v-0.003h9.828c0.506,0,0.92-0.413,0.92-0.921V3.019C29.854,2.513,29.439,2.099,28.936,2.099zM28.562,20.062c0,0.412-0.338,0.75-0.75,0.75H3.062c-0.413,0-0.75-0.338-0.75-0.75v-16c0-0.413,0.337-0.75,0.75-0.75h24.75c0.412,0,0.75,0.337,0.75,0.75V20.062zM20.518,28.4c-0.033-0.035-0.062-0.055-0.068-0.062l-0.01-0.004l-0.008-0.004c0,0-0.046-0.021-0.119-0.062c-0.108-0.056-0.283-0.144-0.445-0.237c-0.162-0.097-0.32-0.199-0.393-0.271c-0.008-0.014-0.035-0.079-0.058-0.17c-0.083-0.32-0.161-0.95-0.22-1.539h-7.5c-0.023,0.23-0.048,0.467-0.076,0.691c-0.035,0.272-0.073,0.524-0.113,0.716c-0.02,0.096-0.039,0.175-0.059,0.23c-0.009,0.025-0.018,0.05-0.024,0.062c-0.003,0.006-0.005,0.01-0.007,0.013c-0.094,0.096-0.34,0.246-0.553,0.36c-0.107,0.062-0.209,0.11-0.283,0.146c-0.074,0.037-0.119,0.062-0.119,0.062l-0.007,0.004l-0.008,0.004c-0.01,0.009-0.038,0.022-0.07,0.062c-0.031,0.037-0.067,0.103-0.067,0.185c0.002,0.002-0.004,0.037-0.006,0.088c0,0.043,0.007,0.118,0.068,0.185c0.061,0.062,0.143,0.08,0.217,0.08h9.716c0.073,0,0.153-0.021,0.215-0.08c0.062-0.063,0.068-0.142,0.068-0.185c-0.001-0.051-0.008-0.086-0.007-0.088C20.583,28.503,20.548,28.439,20.518,28.4z",
    pc : "M29.249,3.14h-9.188l-0.459,0.459v18.225l0.33,2.389H19.57v0.245h-0.307v-0.306h-0.611v0.244h-0.311v-0.367h-0.486v0.307h-1.104l-2.022-0.367v-0.92h0.858l0.302-1.47h2.728c0.188,0,0.339-0.152,0.339-0.339V7.828c0-0.187-0.149-0.338-0.339-0.338H1.591c-0.187,0-0.339,0.152-0.339,0.338V21.24c0,0.187,0.152,0.339,0.339,0.339h3.016l0.199,1.47h1.409l-3.4,3.4L2.11,27.951c0,0,2.941,1.102,6.678,1.102c3.737,0,9.679-0.857,10.476-0.857s4.84,0,4.84,0v-1.225l-0.137-1.068h1.744c-0.2,0.106-0.322,0.244-0.322,0.396v0.979c0,0.341,0.604,0.613,1.352,0.613c0.742,0,1.348-0.272,1.348-0.613v-0.979c0-0.339-0.604-0.611-1.348-0.611c-0.188,0-0.364,0.019-0.525,0.049v-0.17h-2.29l-0.055-0.432h5.382L29.249,3.14L29.249,3.14zM2.478,20.17V8.714h15.07V20.17H2.478z",
    cube : "M15.5,3.029l-10.8,6.235L4.7,21.735L15.5,27.971l10.8-6.235V9.265L15.5,3.029zM24.988,10.599L16,15.789v10.378c0,0.275-0.225,0.5-0.5,0.5s-0.5-0.225-0.5-0.5V15.786l-8.987-5.188c-0.239-0.138-0.321-0.444-0.183-0.683c0.138-0.238,0.444-0.321,0.683-0.183l8.988,5.189l8.988-5.189c0.238-0.138,0.545-0.055,0.684,0.184C25.309,10.155,25.227,10.461,24.988,10.599z",
    fullcube : "M15.5,3.029l-10.8,6.235L4.7,21.735L15.5,27.971l10.8-6.235V9.265L15.5,3.029zM15.5,7.029l6.327,3.652L15.5,14.334l-6.326-3.652L15.5,7.029zM24.988,10.599L16,15.789v10.378c0,0.275-0.225,0.5-0.5,0.5s-0.5-0.225-0.5-0.5V15.786l-8.987-5.188c-0.239-0.138-0.321-0.444-0.183-0.683c0.138-0.238,0.444-0.321,0.683-0.183l8.988,5.189l8.988-5.189c0.238-0.138,0.545-0.055,0.684,0.184C25.309,10.155,25.227,10.461,24.988,10.599z",
    font : "M22.255,19.327l-1.017,0.131c-0.609,0.081-1.067,0.208-1.375,0.382c-0.521,0.293-0.779,0.76-0.779,1.398c0,0.484,0.178,0.867,0.532,1.146c0.354,0.28,0.774,0.421,1.262,0.421c0.593,0,1.164-0.138,1.72-0.412c0.938-0.453,1.4-1.188,1.4-2.229v-1.354c-0.205,0.131-0.469,0.229-0.792,0.328C22.883,19.229,22.564,19.29,22.255,19.327zM8.036,18.273h4.309l-2.113-6.063L8.036,18.273zM28.167,7.75H3.168c-0.552,0-1,0.448-1,1v16.583c0,0.553,0.448,1,1,1h24.999c0.554,0,1-0.447,1-1V8.75C29.167,8.198,28.721,7.75,28.167,7.75zM14.305,23.896l-1.433-4.109H7.488L6,23.896H4.094L9.262,10.17h2.099l4.981,13.727H14.305L14.305,23.896zM26.792,23.943c-0.263,0.074-0.461,0.121-0.599,0.141c-0.137,0.02-0.323,0.027-0.562,0.027c-0.579,0-0.999-0.204-1.261-0.615c-0.138-0.219-0.231-0.525-0.29-0.926c-0.344,0.449-0.834,0.839-1.477,1.169c-0.646,0.329-1.354,0.493-2.121,0.493c-0.928,0-1.688-0.28-2.273-0.844c-0.589-0.562-0.884-1.271-0.884-2.113c0-0.928,0.29-1.646,0.868-2.155c0.578-0.511,1.34-0.824,2.279-0.942l2.682-0.336c0.388-0.05,0.646-0.211,0.775-0.484c0.063-0.146,0.104-0.354,0.104-0.646c0-0.575-0.203-0.993-0.604-1.252c-0.408-0.26-0.99-0.389-1.748-0.389c-0.877,0-1.5,0.238-1.865,0.713c-0.205,0.263-0.34,0.654-0.399,1.174H17.85c0.031-1.237,0.438-2.097,1.199-2.582c0.77-0.484,1.659-0.726,2.674-0.726c1.176,0,2.131,0.225,2.864,0.673c0.729,0.448,1.093,1.146,1.093,2.093v5.766c0,0.176,0.035,0.313,0.106,0.422c0.071,0.104,0.223,0.156,0.452,0.156c0.076,0,0.16-0.005,0.254-0.015c0.093-0.011,0.191-0.021,0.299-0.041L26.792,23.943L26.792,23.943z",
    trash : "M20.826,5.75l0.396,1.188c1.54,0.575,2.589,1.44,2.589,2.626c0,2.405-4.308,3.498-8.312,3.498c-4.003,0-8.311-1.093-8.311-3.498c0-1.272,1.21-2.174,2.938-2.746l0.388-1.165c-2.443,0.648-4.327,1.876-4.327,3.91v2.264c0,1.224,0.685,2.155,1.759,2.845l0.396,9.265c0,1.381,3.274,2.5,7.312,2.5c4.038,0,7.313-1.119,7.313-2.5l0.405-9.493c0.885-0.664,1.438-1.521,1.438-2.617V9.562C24.812,7.625,23.101,6.42,20.826,5.75zM11.093,24.127c-0.476-0.286-1.022-0.846-1.166-1.237c-1.007-2.76-0.73-4.921-0.529-7.509c0.747,0.28,1.58,0.491,2.45,0.642c-0.216,2.658-0.43,4.923,0.003,7.828C11.916,24.278,11.567,24.411,11.093,24.127zM17.219,24.329c-0.019,0.445-0.691,0.856-1.517,0.856c-0.828,0-1.498-0.413-1.517-0.858c-0.126-2.996-0.032-5.322,0.068-8.039c0.418,0.022,0.835,0.037,1.246,0.037c0.543,0,1.097-0.02,1.651-0.059C17.251,18.994,17.346,21.325,17.219,24.329zM21.476,22.892c-0.143,0.392-0.69,0.95-1.165,1.235c-0.474,0.284-0.817,0.151-0.754-0.276c0.437-2.93,0.214-5.209-0.005-7.897c0.881-0.174,1.708-0.417,2.44-0.731C22.194,17.883,22.503,20.076,21.476,22.892zM11.338,9.512c0.525,0.173,1.092-0.109,1.268-0.633h-0.002l0.771-2.316h4.56l0.771,2.316c0.14,0.419,0.53,0.685,0.949,0.685c0.104,0,0.211-0.017,0.316-0.052c0.524-0.175,0.808-0.742,0.633-1.265l-1.002-3.001c-0.136-0.407-0.518-0.683-0.945-0.683h-6.002c-0.428,0-0.812,0.275-0.948,0.683l-1,2.999C10.532,8.77,10.815,9.337,11.338,9.512z",
    newwindow : "M5.896,5.333V21.25h23.417V5.333H5.896zM26.312,18.25H8.896V8.334h17.417V18.25L26.312,18.25zM4.896,9.542H1.687v15.917h23.417V22.25H4.896V9.542z",
    dockright : "M3.083,7.333v16.334h24.833V7.333H3.083z M19.333,20.668H6.083V10.332h13.25V20.668z",
    dockleft : "M3.084,7.333v16.334h24.832V7.333H3.084z M11.667,10.332h13.251v10.336H11.667V10.332z",
    dockbottom : "M3.083,7.333v16.334h24.833V7.333H3.083zM24.915,16.833H6.083v-6.501h18.833L24.915,16.833L24.915,16.833z",
    docktop : "M27.916,23.667V7.333H3.083v16.334H27.916zM24.915,20.668H6.083v-6.501h18.833L24.915,20.668L24.915,20.668z",
    pallete : "M15.653,7.25c-3.417,0-8.577,0.983-8.577,3.282c0,1.91,2.704,3.229,1.691,3.889c-1.02,0.666-2.684-1.848-4.048-1.848c-1.653,0-2.815,1.434-2.815,2.926c0,4.558,6.326,8.25,13.749,8.25c7.424,0,13.443-3.692,13.443-8.25C29.096,10.944,23.077,7.25,15.653,7.25zM10.308,13.521c0-0.645,0.887-1.166,1.98-1.166c1.093,0,1.979,0.521,1.979,1.166c0,0.644-0.886,1.166-1.979,1.166C11.195,14.687,10.308,14.164,10.308,13.521zM14.289,22.299c-1.058,0-1.914-0.68-1.914-1.518s0.856-1.518,1.914-1.518c1.057,0,1.914,0.68,1.914,1.518S15.346,22.299,14.289,22.299zM19.611,21.771c-1.057,0-1.913-0.681-1.913-1.519c0-0.84,0.856-1.521,1.913-1.521c1.059,0,1.914,0.681,1.914,1.521C21.525,21.092,20.67,21.771,19.611,21.771zM20.075,10.66c0-0.838,0.856-1.518,1.914-1.518s1.913,0.68,1.913,1.518c0,0.839-0.855,1.518-1.913,1.518C20.934,12.178,20.075,11.499,20.075,10.66zM24.275,19.482c-1.057,0-1.914-0.681-1.914-1.519s0.857-1.518,1.914-1.518c1.059,0,1.914,0.68,1.914,1.518S25.334,19.482,24.275,19.482zM25.286,15.475c-1.058,0-1.914-0.68-1.914-1.519c0-0.838,0.856-1.518,1.914-1.518c1.057,0,1.913,0.68,1.913,1.518C27.199,14.795,26.343,15.475,25.286,15.475z",
    cart : "M29.02,11.754L8.416,9.473L7.16,4.716C7.071,4.389,6.772,4.158,6.433,4.158H3.341C3.114,3.866,2.775,3.667,2.377,3.667c-0.686,0-1.242,0.556-1.242,1.242c0,0.686,0.556,1.242,1.242,1.242c0.399,0,0.738-0.201,0.965-0.493h2.512l5.23,19.8c-0.548,0.589-0.891,1.373-0.891,2.242c0,1.821,1.473,3.293,3.293,3.293c1.82,0,3.294-1.472,3.297-3.293c0-0.257-0.036-0.504-0.093-0.743h5.533c-0.056,0.239-0.092,0.486-0.092,0.743c0,1.821,1.475,3.293,3.295,3.293s3.295-1.472,3.295-3.293c0-1.82-1.473-3.295-3.295-3.297c-0.951,0.001-1.801,0.409-2.402,1.053h-7.136c-0.601-0.644-1.451-1.052-2.402-1.053c-0.379,0-0.738,0.078-1.077,0.196l-0.181-0.685H26.81c1.157-0.027,2.138-0.83,2.391-1.959l1.574-7.799c0.028-0.145,0.041-0.282,0.039-0.414C30.823,12.733,30.051,11.86,29.02,11.754zM25.428,27.994c-0.163,0-0.295-0.132-0.297-0.295c0.002-0.165,0.134-0.297,0.297-0.297s0.295,0.132,0.297,0.297C25.723,27.862,25.591,27.994,25.428,27.994zM27.208,20.499l0.948-0.948l-0.318,1.578L27.208,20.499zM12.755,11.463l1.036,1.036l-1.292,1.292l-1.292-1.292l1.087-1.087L12.755,11.463zM17.253,11.961l0.538,0.538l-1.292,1.292l-1.292-1.292l0.688-0.688L17.253,11.961zM9.631,14.075l0.868-0.868l1.292,1.292l-1.292,1.292l-0.564-0.564L9.631,14.075zM9.335,12.956l-0.328-1.24L9.792,12.5L9.335,12.956zM21.791,16.499l-1.292,1.292l-1.292-1.292l1.292-1.292L21.791,16.499zM21.207,14.5l1.292-1.292l1.292,1.292l-1.292,1.292L21.207,14.5zM18.5,15.791l-1.293-1.292l1.292-1.292l1.292,1.292L18.5,15.791zM17.791,16.499L16.5,17.791l-1.292-1.292l1.292-1.292L17.791,16.499zM14.499,15.791l-1.292-1.292l1.292-1.292l1.292,1.292L14.499,15.791zM13.791,16.499l-1.292,1.291l-1.292-1.291l1.292-1.292L13.791,16.499zM10.499,17.207l1.292,1.292l-0.785,0.784l-0.54-2.044L10.499,17.207zM11.302,20.404l1.197-1.197l1.292,1.292L12.5,21.791l-1.131-1.13L11.302,20.404zM13.208,18.499l1.291-1.292l1.292,1.292L14.5,19.791L13.208,18.499zM16.5,19.207l1.292,1.292L16.5,21.79l-1.292-1.291L16.5,19.207zM17.208,18.499l1.292-1.292l1.291,1.292L18.5,19.79L17.208,18.499zM20.499,19.207l1.292,1.292L20.5,21.79l-1.292-1.292L20.499,19.207zM21.207,18.499l1.292-1.292l1.292,1.292l-1.292,1.292L21.207,18.499zM23.207,16.499l1.292-1.292l1.292,1.292l-1.292,1.292L23.207,16.499zM25.207,14.499l1.292-1.292L27.79,14.5l-1.291,1.292L25.207,14.499zM24.499,13.792l-1.156-1.156l2.082,0.23L24.499,13.792zM21.791,12.5l-1.292,1.292L19.207,12.5l0.29-0.29l2.253,0.25L21.791,12.5zM14.5,11.791l-0.152-0.152l0.273,0.03L14.5,11.791zM10.5,11.792l-0.65-0.65l1.171,0.129L10.5,11.792zM14.5,21.207l1.205,1.205h-2.409L14.5,21.207zM18.499,21.207l1.206,1.206h-2.412L18.499,21.207zM22.499,21.207l1.208,1.207l-2.414-0.001L22.499,21.207zM23.207,20.499l1.292-1.292l1.292,1.292l-1.292,1.292L23.207,20.499zM25.207,18.499l1.292-1.291l1.291,1.291l-1.291,1.292L25.207,18.499zM28.499,17.791l-1.291-1.292l1.291-1.291l0.444,0.444l-0.429,2.124L28.499,17.791zM29.001,13.289l-0.502,0.502l-0.658-0.658l1.016,0.112C28.911,13.253,28.956,13.271,29.001,13.289zM13.487,27.994c-0.161,0-0.295-0.132-0.295-0.295c0-0.165,0.134-0.297,0.295-0.297c0.163,0,0.296,0.132,0.296,0.297C13.783,27.862,13.651,27.994,13.487,27.994zM26.81,22.414h-1.517l1.207-1.207l0.93,0.93C27.243,22.306,27.007,22.428,26.81,22.414z",
    glasses : "M14.075,9.531c0,0-2.705-1.438-5.158-1.438c-2.453,0-4.862,0.593-4.862,0.593L3.971,9.869c0,0,0.19,0.19,0.528,0.53c0.338,0.336,0.486,3.741,1.838,5.094c1.353,1.354,4.82,1.396,5.963,0.676c1.14-0.718,2.241-3.466,2.241-4.693c0-0.38,0-0.676,0-0.676c0.274-0.275,1.615-0.303,1.917,0c0,0,0,0.296,0,0.676c0,1.227,1.101,3.975,2.241,4.693c1.144,0.72,4.611,0.678,5.963-0.676c1.355-1.353,1.501-4.757,1.839-5.094c0.338-0.34,0.528-0.53,0.528-0.53l-0.084-1.183c0,0-2.408-0.593-4.862-0.593c-2.453,0-5.158,1.438-5.158,1.438C16.319,9.292,14.737,9.32,14.075,9.531z",
    "package" : "M17.078,22.004l-1.758-4.129l-2.007,4.752l-7.519-3.289l0.174,3.905l9.437,4.374l10.909-5.365l-0.149-4.989L17.078,22.004zM29.454,6.619L18.521,3.383l-3.006,2.671l-3.091-2.359L1.546,8.199l3.795,3.048l-3.433,5.302l10.879,4.757l2.53-5.998l2.257,5.308l11.393-5.942l-3.105-4.709L29.454,6.619zM15.277,14.579l-9.059-3.83l9.275-4.101l9.608,3.255L15.277,14.579z",
    book : "M25.754,4.626c-0.233-0.161-0.536-0.198-0.802-0.097L12.16,9.409c-0.557,0.213-1.253,0.316-1.968,0.316c-0.997,0.002-2.029-0.202-2.747-0.48C7.188,9.148,6.972,9.04,6.821,8.943c0.056-0.024,0.12-0.05,0.193-0.075L18.648,4.43l1.733,0.654V3.172c0-0.284-0.14-0.554-0.374-0.714c-0.233-0.161-0.538-0.198-0.802-0.097L6.414,7.241c-0.395,0.142-0.732,0.312-1.02,0.564C5.111,8.049,4.868,8.45,4.872,8.896c0,0.012,0.004,0.031,0.004,0.031v17.186c0,0.008-0.003,0.015-0.003,0.021c0,0.006,0.003,0.01,0.003,0.016v0.017h0.002c0.028,0.601,0.371,0.983,0.699,1.255c1.034,0.803,2.769,1.252,4.614,1.274c0.874,0,1.761-0.116,2.583-0.427l12.796-4.881c0.337-0.128,0.558-0.448,0.558-0.809V5.341C26.128,5.057,25.988,4.787,25.754,4.626zM5.672,11.736c0.035,0.086,0.064,0.176,0.069,0.273l0.004,0.054c0.016,0.264,0.13,0.406,0.363,0.611c0.783,0.626,2.382,1.08,4.083,1.093c0.669,0,1.326-0.083,1.931-0.264v1.791c-0.647,0.143-1.301,0.206-1.942,0.206c-1.674-0.026-3.266-0.353-4.509-1.053V11.736zM10.181,24.588c-1.674-0.028-3.266-0.354-4.508-1.055v-2.712c0.035,0.086,0.065,0.176,0.07,0.275l0.002,0.053c0.018,0.267,0.13,0.408,0.364,0.613c0.783,0.625,2.381,1.079,4.083,1.091c0.67,0,1.327-0.082,1.932-0.262v1.789C11.476,24.525,10.821,24.588,10.181,24.588z",
    books : "M26.679,7.858c-0.176-0.138-0.404-0.17-0.606-0.083l-9.66,4.183c-0.42,0.183-0.946,0.271-1.486,0.271c-0.753,0.002-1.532-0.173-2.075-0.412c-0.194-0.083-0.356-0.176-0.471-0.259c0.042-0.021,0.09-0.042,0.146-0.064l8.786-3.804l1.31,0.561V6.612c0-0.244-0.106-0.475-0.283-0.612c-0.176-0.138-0.406-0.17-0.605-0.083l-9.66,4.183c-0.298,0.121-0.554,0.268-0.771,0.483c-0.213,0.208-0.397,0.552-0.394,0.934c0,0.01,0.003,0.027,0.003,0.027v14.73c0,0.006-0.002,0.012-0.002,0.019c0,0.005,0.002,0.007,0.002,0.012v0.015h0.002c0.021,0.515,0.28,0.843,0.528,1.075c0.781,0.688,2.091,1.073,3.484,1.093c0.66,0,1.33-0.1,1.951-0.366l9.662-4.184c0.255-0.109,0.422-0.383,0.422-0.692V8.471C26.961,8.227,26.855,7.996,26.679,7.858zM20.553,5.058c-0.017-0.221-0.108-0.429-0.271-0.556c-0.176-0.138-0.404-0.17-0.606-0.083l-9.66,4.183C9.596,8.784,9.069,8.873,8.53,8.873C7.777,8.874,6.998,8.699,6.455,8.46C6.262,8.378,6.099,8.285,5.984,8.202C6.026,8.181,6.075,8.16,6.13,8.138l8.787-3.804l1.309,0.561V3.256c0-0.244-0.106-0.475-0.283-0.612c-0.176-0.138-0.407-0.17-0.606-0.083l-9.66,4.183C5.379,6.864,5.124,7.011,4.907,7.227C4.693,7.435,4.51,7.779,4.513,8.161c0,0.011,0.003,0.027,0.003,0.027v14.73c0,0.006-0.001,0.013-0.001,0.019c0,0.005,0.001,0.007,0.001,0.012v0.016h0.002c0.021,0.515,0.28,0.843,0.528,1.075c0.781,0.688,2.091,1.072,3.485,1.092c0.376,0,0.754-0.045,1.126-0.122V11.544c-0.01-0.7,0.27-1.372,0.762-1.856c0.319-0.315,0.708-0.564,1.19-0.756L20.553,5.058z",
    icons : "M4.083,14H14V4.083H4.083V14zM17,4.083V14h9.917V4.083H17zM17,26.917h9.917v-9.918H17V26.917zM4.083,26.917H14v-9.918H4.083V26.917z",
    list : "M4.082,4.083v2.999h22.835V4.083H4.082zM4.082,20.306h22.835v-2.999H4.082V20.306zM4.082,13.694h22.835v-2.999H4.082V13.694zM4.082,26.917h22.835v-2.999H4.082V26.917z",
    db : "M15.499,23.438c-3.846,0-7.708-0.987-9.534-3.117c-0.054,0.236-0.09,0.48-0.09,0.737v3.877c0,3.435,4.988,4.998,9.625,4.998s9.625-1.563,9.625-4.998v-3.877c0-0.258-0.036-0.501-0.09-0.737C23.209,22.451,19.347,23.438,15.499,23.438zM15.499,15.943c-3.846,0-7.708-0.987-9.533-3.117c-0.054,0.236-0.091,0.479-0.091,0.736v3.877c0,3.435,4.988,4.998,9.625,4.998s9.625-1.563,9.625-4.998v-3.877c0-0.257-0.036-0.501-0.09-0.737C23.209,14.956,19.347,15.943,15.499,15.943zM15.5,1.066c-4.637,0-9.625,1.565-9.625,5.001v3.876c0,3.435,4.988,4.998,9.625,4.998s9.625-1.563,9.625-4.998V6.067C25.125,2.632,20.137,1.066,15.5,1.066zM15.5,9.066c-4.211,0-7.625-1.343-7.625-3c0-1.656,3.414-3,7.625-3s7.625,1.344,7.625,3C23.125,7.724,19.711,9.066,15.5,9.066z",
    paper : "M28.916,8.009L15.953,1.888c-0.251-0.119-0.548-0.115-0.798,0.008c-0.25,0.125-0.433,0.357-0.491,0.629c-0.002,0.01-1.04,4.83-2.578,9.636c-0.526,1.646-1.114,3.274-1.728,4.704l1.665,0.786c2-4.643,3.584-11.052,4.181-13.614l11.264,5.316c-0.346,1.513-1.233,5.223-2.42,8.927c-0.767,2.399-1.665,4.797-2.585,6.532c-0.889,1.79-1.958,2.669-2.197,2.552c-1.419,0.03-2.418-1.262-3.09-2.918c-0.32-0.803-0.53-1.63-0.657-2.246c-0.127-0.618-0.166-1.006-0.168-1.006c-0.034-0.317-0.232-0.597-0.52-0.731l-12.962-6.12c-0.301-0.142-0.654-0.11-0.925,0.081c-0.27,0.193-0.416,0.518-0.38,0.847c0.008,0.045,0.195,1.848,0.947,3.736c0.521,1.321,1.406,2.818,2.845,3.575l12.956,6.131l0.006-0.013c0.562,0.295,1.201,0.487,1.947,0.496c1.797-0.117,2.777-1.668,3.818-3.525c3-5.69,5.32-16.602,5.338-16.642C29.512,8.615,29.302,8.19,28.916,8.009z",
    takeoff : "M10.27,19.267c0,0,9.375-1.981,16.074-8.681c0,0,1.395-1.339-1.338-1.339c-2.305,0-5.6,2.438-5.6,2.438l-9.137-1.42l-1.769,1.769l4.983,2.411l-3.001,2.035l-2.571-1.285L6.09,16.052C6.09,16.052,8.02,18.062,10.27,19.267zM3.251,23.106v1.998h24.498v-1.998H3.251z",
    landing : "M23.322,19.491c0,0,1.903,0.342,0.299-1.869c-1.353-1.866-5.261-3.104-5.261-3.104l-4.213-8.229l-2.47-0.394l0.973,5.449L9.241,10.11L8.772,7.273L7.008,6.302c0,0-0.496,2.742-0.149,5.271C6.859,11.573,13.965,17.999,23.322,19.491zM3.251,23.106v1.998h24.498v-1.998H3.251zM14,17.94c0,0.414,0.336,0.75,0.75,0.75s0.75-0.336,0.75-0.75s-0.336-0.75-0.75-0.75S14,17.526,14,17.94z",
    plane : "M19.671,8.11l-2.777,2.777l-3.837-0.861c0.362-0.505,0.916-1.683,0.464-2.135c-0.518-0.517-1.979,0.278-2.305,0.604l-0.913,0.913L7.614,8.804l-2.021,2.021l2.232,1.061l-0.082,0.082l1.701,1.701l0.688-0.687l3.164,1.504L9.571,18.21H6.413l-1.137,1.138l3.6,0.948l1.83,1.83l0.947,3.598l1.137-1.137V21.43l3.725-3.725l1.504,3.164l-0.687,0.687l1.702,1.701l0.081-0.081l1.062,2.231l2.02-2.02l-0.604-2.689l0.912-0.912c0.326-0.326,1.121-1.789,0.604-2.306c-0.452-0.452-1.63,0.101-2.135,0.464l-0.861-3.838l2.777-2.777c0.947-0.947,3.599-4.862,2.62-5.839C24.533,4.512,20.618,7.163,19.671,8.11z",
    phone : "M22.065,18.53c-0.467-0.29-1.167-0.21-1.556,0.179l-3.093,3.092c-0.389,0.389-1.025,0.389-1.414,0L9.05,14.848c-0.389-0.389-0.389-1.025,0-1.414l2.913-2.912c0.389-0.389,0.447-1.075,0.131-1.524L6.792,1.485C6.476,1.036,5.863,0.948,5.433,1.29c0,0-4.134,3.281-4.134,6.295c0,12.335,10,22.334,22.334,22.334c3.015,0,5.948-5.533,5.948-5.533c0.258-0.486,0.087-1.122-0.38-1.412L22.065,18.53z",
    hangup : "M28.563,10.494c-7.35-7.349-19.265-7.348-26.612,0.001c-1.796,1.796-0.247,6.84-0.247,6.84c0.135,0.443,0.616,0.72,1.067,0.614l6.898-1.604c0.451-0.105,0.82-0.57,0.82-1.033l0.001-3.685c0-0.463,0.379-0.842,0.842-0.842h8.285c0.464,0,0.843,0.379,0.843,0.842l-0.001,3.471c0.001,0.462,0.375,0.907,0.83,0.986l7.635,1.316c0.456,0.08,0.873-0.232,0.926-0.692C29.851,16.708,30.359,12.29,28.563,10.494zM17.264,14.072h-3.501v4.39h-2.625l4.363,7.556l4.363-7.556h-2.6V14.072z",
    music : "M12.751,8.042v6.041v9.862c-0.677-0.45-1.636-0.736-2.708-0.736c-2.048,0-3.708,1.025-3.708,2.292c0,1.265,1.66,2.291,3.708,2.291s3.708-1.026,3.708-2.291V13.786l10.915-3.24v9.565c-0.678-0.45-1.635-0.736-2.708-0.736c-2.048,0-3.708,1.025-3.708,2.292c0,1.265,1.66,2.291,3.708,2.291s3.708-1.026,3.708-2.291V10.249V4.208L12.751,8.042z",
    roadmap : "M23.188,3.735c0-0.975-0.789-1.766-1.766-1.766s-1.766,0.791-1.766,1.766s1.766,4.267,1.766,4.267S23.188,4.71,23.188,3.735zM20.578,3.734c0-0.466,0.378-0.843,0.844-0.843c0.467,0,0.844,0.377,0.844,0.844c0,0.466-0.377,0.843-0.844,0.843C20.956,4.578,20.578,4.201,20.578,3.734zM25.281,18.496c-0.562,0-1.098,0.046-1.592,0.122L11.1,13.976c0.199-0.181,0.312-0.38,0.312-0.59c0-0.108-0.033-0.213-0.088-0.315l8.41-2.239c0.459,0.137,1.023,0.221,1.646,0.221c1.521,0,2.75-0.485,2.75-1.083c0-0.599-1.229-1.083-2.75-1.083s-2.75,0.485-2.75,1.083c0,0.069,0.021,0.137,0.054,0.202L9.896,12.2c-0.633-0.188-1.411-0.303-2.265-0.303c-2.088,0-3.781,0.667-3.781,1.49c0,0.823,1.693,1.489,3.781,1.489c0.573,0,1.11-0.054,1.597-0.144l11.99,4.866c-0.19,0.192-0.306,0.401-0.306,0.623c0,0.188,0.096,0.363,0.236,0.532L8.695,25.415c-0.158-0.005-0.316-0.011-0.477-0.011c-3.241,0-5.87,1.037-5.87,2.312c0,1.276,2.629,2.312,5.87,2.312c3.241,0,5.87-1.034,5.87-2.312c0-0.22-0.083-0.432-0.229-0.633l10.265-5.214c0.37,0.04,0.753,0.066,1.155,0.066c2.414,0,4.371-0.771,4.371-1.723C29.65,19.268,27.693,18.496,25.281,18.496z",
    brush : "M8.125,29.178l1.311-1.5l1.315,1.5l1.311-1.5l1.311,1.5l1.315-1.5l1.311,1.5l1.312-1.5l1.314,1.5l1.312-1.5l1.312,1.5l1.314-1.5l1.312,1.5v-8.521H8.125V29.178zM23.375,17.156c-0.354,0-5.833-0.166-5.833-2.917s0.75-8.834,0.75-8.834S18.542,2.822,16,2.822s-2.292,2.583-2.292,2.583s0.75,6.083,0.75,8.834s-5.479,2.917-5.833,2.917c-0.5,0-0.5,1.166-0.5,1.166v1.271h15.75v-1.271C23.875,18.322,23.875,17.156,23.375,17.156zM16,8.031c-0.621,0-1.125-2.191-1.125-2.812S15.379,4.094,16,4.094s1.125,0.504,1.125,1.125S16.621,8.031,16,8.031z",
    bucket : "M21.589,6.787c-0.25-0.152-0.504-0.301-0.76-0.445c-3.832-2.154-8.234-3.309-9.469-1.319c-1.225,2.103,2.314,5.798,6.293,8.222c0.082,0.051,0.167,0.098,0.25,0.146c5.463-0.402,9.887,0.204,9.989,1.402c0.009,0.105-0.026,0.211-0.083,0.318c0.018-0.025,0.041-0.045,0.057-0.07C29.146,12.943,25.585,9.222,21.589,6.787zM10.337,7.166l-0.722,1.52c-4.339,2.747-6.542,6.193-5.484,8.625c0.19,0.438,0.482,0.812,0.846,1.137l0.456-0.959c-0.156-0.178-0.292-0.365-0.384-0.577c-0.732-1.682,0.766-4.188,3.707-6.417l-3.323,6.994c1.492,1.689,5.748,1.748,10.276,0.154c-0.037-0.354,0.032-0.722,0.232-1.049c0.485-0.796,1.523-1.048,2.319-0.563c0.795,0.486,1.048,1.522,0.562,2.319c-0.484,0.795-1.523,1.047-2.319,0.562c-0.154-0.094-0.281-0.213-0.394-0.344c-4.354,1.559-8.372,1.643-10.553,0.314c-0.214-0.131-0.403-0.279-0.58-0.436l-0.124,0.26c-1.088,1.785,1.883,4.916,5.23,6.957c3.347,2.039,7.493,3.246,8.552,1.502l7.77-10.204c-2.48,0.384-6.154-0.963-9.272-2.864C14.014,12.197,11.131,9.546,10.337,7.166z",
    terminal : "M3.25,6.469v19.062h25.5V6.469H3.25zM10.345,11.513l-4.331,1.926V12.44l3.124-1.288v-0.018L6.014,9.848v-1l4.331,1.927V11.513zM16.041,14.601h-5.05v-0.882h5.05V14.601z",
    edit : "M27.87,7.863L23.024,4.82l-7.889,12.566l4.842,3.04L27.87,7.863zM14.395,21.25l-0.107,2.855l2.527-1.337l2.349-1.24l-4.672-2.936L14.395,21.25zM29.163,3.239l-2.532-1.591c-0.638-0.401-1.479-0.208-1.882,0.43l-0.998,1.588l4.842,3.042l0.999-1.586C29.992,4.481,29.802,3.639,29.163,3.239zM25.198,27.062c0,0.275-0.225,0.5-0.5,0.5h-19c-0.276,0-0.5-0.225-0.5-0.5v-19c0-0.276,0.224-0.5,0.5-0.5h13.244l1.884-3H5.698c-1.93,0-3.5,1.57-3.5,3.5v19c0,1.93,1.57,3.5,3.5,3.5h19c1.93,0,3.5-1.57,3.5-3.5V11.097l-3,4.776V27.062z",
    paint : "M25.541,5.772V2.208H3.292v8.083h22.249v-3.52c1.211,0.113,2.167,1.174,2.167,2.478v1.375c0,1.398-1.164,2.784-2.541,3.025l-7.882,1.381c-1.857,0.326-3.369,2.125-3.369,4.011v0.385c-0.742,0.366-1.292,1.507-1.292,2.865v4.5c0,1.65,0.807,3,1.792,3s1.792-1.35,1.792-3v-4.5c0-1.358-0.55-2.499-1.292-2.865v-0.385c0-1.398,1.164-2.784,2.541-3.025l7.882-1.381c1.857-0.326,3.369-2.125,3.369-4.01V9.25C28.708,7.394,27.304,5.886,25.541,5.772z",
    car : "M28.59,10.781h-2.242c-0.129,0-0.244,0.053-0.333,0.133c-0.716-1.143-1.457-2.058-2.032-2.633c-2-2-14-2-16,0C7.41,8.854,6.674,9.763,5.961,10.898c-0.086-0.069-0.19-0.117-0.309-0.117H3.41c-0.275,0-0.5,0.225-0.5,0.5v1.008c0,0.275,0.221,0.542,0.491,0.594l1.359,0.259c-1.174,2.619-1.866,5.877-0.778,9.14v1.938c0,0.553,0.14,1,0.313,1h2.562c0.173,0,0.313-0.447,0.313-1v-1.584c2.298,0.219,5.551,0.459,8.812,0.459c3.232,0,6.521-0.235,8.814-0.453v1.578c0,0.553,0.141,1,0.312,1h2.562c0.172,0,0.312-0.447,0.312-1l-0.002-1.938c1.087-3.261,0.397-6.516-0.775-9.134l1.392-0.265c0.271-0.052,0.491-0.318,0.491-0.594v-1.008C29.09,11.006,28.865,10.781,28.59,10.781zM7.107,18.906c-1.001,0-1.812-0.812-1.812-1.812s0.812-1.812,1.812-1.812s1.812,0.812,1.812,1.812S8.108,18.906,7.107,18.906zM5.583,13.716c0.96-2.197,2.296-3.917,3.106-4.728c0.585-0.585,3.34-1.207,7.293-1.207c3.953,0,6.708,0.622,7.293,1.207c0.811,0.811,2.146,2.53,3.106,4.728c-2.133,0.236-6.286-0.31-10.399-0.31S7.716,13.952,5.583,13.716zM24.857,18.906c-1.001,0-1.812-0.812-1.812-1.812s0.812-1.812,1.812-1.812s1.812,0.812,1.812,1.812S25.858,18.906,24.857,18.906z",
    taxi : "M28.59,10.781h-2.242c-0.129,0-0.244,0.053-0.333,0.133c-0.716-1.143-1.457-2.058-2.032-2.633c-0.575-0.575-1.979-0.984-3.732-1.229V5.03c-1.541-0.198-3.099-0.249-4.268-0.249c-1.16,0-2.703,0.05-4.233,0.245v2.022C9.98,7.292,8.562,7.702,7.982,8.281C7.41,8.854,6.674,9.763,5.961,10.898c-0.086-0.069-0.19-0.117-0.309-0.117H3.41c-0.275,0-0.5,0.225-0.5,0.5v1.008c0,0.275,0.221,0.542,0.491,0.594l1.359,0.259c-1.174,2.619-1.866,5.877-0.778,9.14v1.938c0,0.553,0.14,1,0.313,1h2.562c0.173,0,0.313-0.447,0.313-1v-1.584c2.298,0.219,5.551,0.459,8.812,0.459c3.232,0,6.521-0.235,8.814-0.453v1.578c0,0.553,0.141,1,0.312,1h2.562c0.172,0,0.312-0.447,0.312-1l-0.002-1.938c1.087-3.261,0.397-6.516-0.775-9.134l1.392-0.265c0.271-0.052,0.491-0.318,0.491-0.594v-1.008C29.09,11.006,28.865,10.781,28.59,10.781zM7.107,18.906c-1.001,0-1.812-0.812-1.812-1.812s0.812-1.812,1.812-1.812s1.812,0.812,1.812,1.812S8.108,18.906,7.107,18.906zM5.583,13.716c0.96-2.197,2.296-3.917,3.106-4.728c0.585-0.585,3.34-1.207,7.293-1.207c3.953,0,6.708,0.622,7.293,1.207c0.811,0.811,2.146,2.53,3.106,4.728c-2.133,0.236-6.286-0.31-10.399-0.31S7.716,13.952,5.583,13.716zM24.857,18.906c-1.001,0-1.812-0.812-1.812-1.812s0.812-1.812,1.812-1.812s1.812,0.812,1.812,1.812S25.858,18.906,24.857,18.906z",
    bus : "M30.171,7.314c-0.025-0.274-0.215-0.498-0.421-0.498s-0.375-0.169-0.375-0.375s-0.222-0.337-0.493-0.292L27.41,6.399C27.114,4.607,26.67,3.486,26,2.816c-2-2-18-2-20,0C5.331,3.486,4.886,4.607,4.589,6.399L3.118,6.15C2.847,6.104,2.625,6.235,2.625,6.441S2.456,6.816,2.25,6.816S1.854,7.041,1.829,7.314l-0.47,5.066c-0.025,0.274,0.179,0.498,0.454,0.498h1.062c0.275,0,0.521-0.224,0.546-0.498l0.393-4.232c0.025-0.274,0.268-0.46,0.54-0.415l0.054,0.009C4.007,11.396,4,29.684,4,29.684c0,0.553,0.14,1,0.313,1h2.562c0.173,0,0.313-0.447,0.313-1v-1.893c4.643,0.698,12.982,0.698,17.625,0v1.889c0,0.553,0.141,1,0.312,1h2.562c0.172,0,0.312-0.447,0.312-1c0,0-0.007-18.283-0.407-21.937l0.054-0.009c0.271-0.046,0.514,0.141,0.539,0.415l0.394,4.232c0.025,0.274,0.271,0.498,0.546,0.498h1.062c0.275,0,0.479-0.224,0.454-0.498L30.171,7.314zM7.125,23.371c-1.001,0-1.812-0.812-1.812-1.812s0.812-1.812,1.812-1.812s1.812,0.812,1.812,1.812S8.126,23.371,7.125,23.371zM5.042,15.977C5.143,8.542,5.491,4.739,6.707,3.523C7.194,3.037,10.484,2.316,16,2.316c5.516,0,8.806,0.72,9.293,1.207c1.217,1.216,1.564,5.02,1.665,12.455c-1.175,0.473-4.904,1.025-10.958,1.025C9.951,17.004,6.222,16.452,5.042,15.977zM23.062,21.559c0-1.001,0.812-1.812,1.812-1.812s1.812,0.812,1.812,1.812s-0.812,1.812-1.812,1.812S23.062,22.56,23.062,21.559z",
    train : "M25.781,21.382c0.69-0.691,0.607-4.311,0.607-4.311c0-2.21-0.663-10.334-1.602-12.103c-0.94-1.768-6.19-3.26-8.787-3.26s-7.847,1.492-8.786,3.26c-0.939,1.769-1.603,9.893-1.603,12.103c0,0-0.083,3.619,0.607,4.311c0.455,0.455,2.205,1.581,3.663,2.423l-3.744,6.486h2.31l0.673-1.166h13.759l0.673,1.166h2.311l-3.744-6.486C23.576,22.963,25.326,21.837,25.781,21.382zM23.819,16.795c-0.473,0-0.856-0.384-0.856-0.856s0.384-0.856,0.856-0.856c0.474,0,0.856,0.384,0.856,0.856S24.293,16.795,23.819,16.795zM20.421,6.959h3.768c0.326,1.565,0.616,3.98,0.807,6.134h-4.574V6.959zM14.417,3.125h3.166v1.333h-3.166V3.125zM7.812,6.959h3.768v6.134H7.005C7.195,10.939,7.485,8.524,7.812,6.959zM8.181,16.795c-0.474,0-0.856-0.384-0.856-0.856s0.383-0.856,0.856-0.856c0.473,0,0.856,0.384,0.856,0.856S8.653,16.795,8.181,16.795zM9.341,15.938c0-0.473,0.384-0.856,0.856-0.856c0.474,0,0.856,0.384,0.856,0.856s-0.383,0.856-0.856,0.856C9.725,16.795,9.341,16.411,9.341,15.938zM10.275,27.125l0.99-1.715h9.469l0.99,1.715H10.275zM20.946,15.938c0-0.473,0.383-0.856,0.856-0.856c0.473,0,0.856,0.384,0.856,0.856s-0.384,0.856-0.856,0.856C21.329,16.795,20.946,16.411,20.946,15.938z",
    scissors : "M11.108,10.271c1.083-1.876,0.159-4.443-2.059-5.725C8.231,4.074,7.326,3.825,6.433,3.825c-1.461,0-2.721,0.673-3.373,1.801C2.515,6.57,2.452,7.703,2.884,8.814C3.287,9.85,4.081,10.751,5.12,11.35c0.817,0.473,1.722,0.723,2.616,0.723c0.673,0,1.301-0.149,1.849-0.414c0.669,0.387,1.566,0.904,2.4,1.386c1.583,0.914,0.561,3.861,5.919,6.955c5.357,3.094,11.496,1.535,11.496,1.535L10.75,10.767C10.882,10.611,11.005,10.449,11.108,10.271zM9.375,9.271c-0.506,0.878-2.033,1.055-3.255,0.347C5.474,9.245,4.986,8.702,4.749,8.09C4.541,7.555,4.556,7.035,4.792,6.626c0.293-0.509,0.892-0.801,1.64-0.801c0.543,0,1.102,0.157,1.616,0.454C9.291,6.996,9.898,8.366,9.375,9.271zM17.246,15.792c0,0.483-0.392,0.875-0.875,0.875c-0.037,0-0.068-0.017-0.104-0.021l0.667-1.511C17.121,15.296,17.246,15.526,17.246,15.792zM16.371,14.917c0.037,0,0.068,0.017,0.104,0.021l-0.666,1.51c-0.188-0.16-0.312-0.39-0.312-0.656C15.496,15.309,15.887,14.917,16.371,14.917zM29.4,10.467c0,0-6.139-1.559-11.496,1.535c-0.537,0.311-0.995,0.618-1.415,0.924l4.326,2.497L29.4,10.467zM13.171,17.097c-0.352,0.851-0.575,1.508-1.187,1.859c-0.833,0.481-1.73,0.999-2.399,1.386c-0.549-0.265-1.176-0.414-1.85-0.414c-0.894,0-1.798,0.249-2.616,0.721c-2.218,1.282-3.143,3.851-2.06,5.726c0.651,1.127,1.912,1.801,3.373,1.801c0.894,0,1.799-0.25,2.616-0.722c1.04-0.601,1.833-1.501,2.236-2.536c0.432-1.112,0.368-2.245-0.178-3.189c-0.103-0.178-0.226-0.34-0.356-0.494l3.982-2.3C14.044,18.295,13.546,17.676,13.171,17.097zM9.42,24.192c-0.238,0.612-0.725,1.155-1.371,1.528c-1.221,0.706-2.75,0.532-3.257-0.347C4.27,24.47,4.878,23.099,6.12,22.381c0.514-0.297,1.072-0.453,1.615-0.453c0.749,0,1.346,0.291,1.64,0.8C9.612,23.138,9.628,23.657,9.42,24.192z",
    coffee : "M7.845,9.983l2.034,17.353c0,0.977,2.741,1.769,6.121,1.769c3.381,0,6.121-0.792,6.121-1.769l2.377-17.485c-2.455,1.023-6.812,1.133-8.498,1.133C14.39,10.984,10.345,10.883,7.845,9.983zM24.13,5.752l-0.376-1.678c0-0.651-3.472-1.179-7.754-1.179S8.246,3.424,8.246,4.075L7.871,5.752C7.156,6.036,6.75,6.36,6.75,6.705v1.284c0,1.102,4.142,1.995,9.25,1.995s9.25-0.894,9.25-1.995V6.705C25.25,6.36,24.844,6.036,24.13,5.752z",
    filter : "M26.834,6.958c0-2.094-4.852-3.791-10.834-3.791c-5.983,0-10.833,1.697-10.833,3.791c0,0.429,0.213,0.84,0.588,1.224l8.662,15.002v4.899c0,0.414,0.709,0.75,1.583,0.75c0.875,0,1.584-0.336,1.584-0.75v-4.816l8.715-15.093h-0.045C26.625,7.792,26.834,7.384,26.834,6.958zM16,9.75c-6.363,0-9.833-1.845-9.833-2.792S9.637,4.167,16,4.167c6.363,0,9.834,1.844,9.834,2.791S22.363,9.75,16,9.75z",
    "low-battery" : "M27.271,13.501h-1.104v-1.417c0-0.553-0.447-1-1-1H5.25c-0.552,0-1,0.447-1,1v7.832c0,0.553,0.448,1,1,1h19.917c0.553,0,1-0.447,1-1v-1.417h1.104c0.265,0,0.479-0.447,0.479-1v-2.998C27.75,13.948,27.536,13.501,27.271,13.501zM24.167,18.916H6.25v-5.832h17.917V18.916zM9.167,14.084H7.25v3.832h1.917V14.084z",
    "full-battery" : "M27.271,13.501h-1.104v-1.417c0-0.553-0.447-1-1-1H5.25c-0.552,0-1,0.447-1,1v7.832c0,0.553,0.448,1,1,1h19.917c0.553,0,1-0.447,1-1v-1.417h1.104c0.265,0,0.479-0.447,0.479-1v-2.998C27.75,13.948,27.536,13.501,27.271,13.501zM24.167,18.916H6.25v-5.832h17.917V18.916zM23.167,14.084H7.25v3.832h15.917V14.084z",
    charging : "M27.271,13.501h-1.104v-1.417c0-0.553-0.447-1-1-1H5.25c-0.552,0-1,0.447-1,1v7.832c0,0.553,0.448,1,1,1h19.917c0.553,0,1-0.447,1-1v-1.417h1.104c0.265,0,0.479-0.447,0.479-1v-2.998C27.75,13.948,27.536,13.501,27.271,13.501zM18.525,16.842l-6.733,3.366l3.366-3.366l-1.683-1.684l6.733-3.366l-3.366,3.366L18.525,16.842z",
    ticket : "M20.338,6.713c-1.002-0.468-1.434-1.658-0.967-2.658L16.578,2.75L6.21,24.948l2.793,1.305c0.468-1.001,1.658-1.434,2.659-0.966s1.434,1.657,0.966,2.658l2.793,1.305L25.789,7.052l-2.793-1.305C22.529,6.748,21.338,7.181,20.338,6.713z",
    checkbox : "M26,27.5H6c-0.829,0-1.5-0.672-1.5-1.5V6c0-0.829,0.671-1.5,1.5-1.5h20c0.828,0,1.5,0.671,1.5,1.5v20C27.5,26.828,26.828,27.5,26,27.5zM7.5,24.5h17v-17h-17V24.5z",
    checked : "M29.548,3.043c-1.081-0.859-2.651-0.679-3.513,0.401L16,16.066l-3.508-4.414c-0.859-1.081-2.431-1.26-3.513-0.401c-1.081,0.859-1.261,2.432-0.401,3.513l5.465,6.875c0.474,0.598,1.195,0.944,1.957,0.944c0.762,0,1.482-0.349,1.957-0.944L29.949,6.556C30.809,5.475,30.629,3.902,29.548,3.043zM24.5,24.5h-17v-17h12.756l2.385-3H6C5.171,4.5,4.5,5.171,4.5,6v20c0,0.828,0.671,1.5,1.5,1.5h20c0.828,0,1.5-0.672,1.5-1.5V12.851l-3,3.773V24.5z",
    inbox : "M24,5H8L4,19v8h24v-8L24,5zM27,26H5v-7h8.75c0,1.242,1.007,2.25,2.25,2.25c1.242,0,2.25-1.008,2.25-2.25H27V26z",
    crown : "M16,8.087c1.007,0,1.826-0.819,1.826-1.826c0-1.007-0.819-1.826-1.826-1.826s-1.826,0.819-1.826,1.826C14.174,7.268,14.993,8.087,16,8.087zM16,5.043c0.673,0,1.218,0.545,1.218,1.217S16.673,7.479,16,7.479s-1.217-0.545-1.217-1.218S15.327,5.043,16,5.043zM4.923,13.292c0.812,2.612,1.132,6.646,1.257,9.412c0.027-0.001,0.053-0.009,0.081-0.009h19.479c0.027,0,0.054,0.008,0.081,0.009c0.124-2.766,0.444-6.8,1.256-9.412c-0.449-0.229-0.813-0.591-1.05-1.038c-2.401,2.048-5.157,6.18-5.157,6.18s-3.026-6.058-4.305-9.812C16.383,8.667,16.196,8.696,16,8.696s-0.383-0.029-0.565-0.073c-1.278,3.754-4.305,9.812-4.305,9.812s-2.756-4.132-5.157-6.18C5.738,12.701,5.373,13.063,4.923,13.292zM5.652,11.13c0-1.007-0.819-1.826-1.826-1.826S2,10.124,2,11.13s0.819,1.826,1.826,1.826S5.652,12.137,5.652,11.13zM3.826,12.348c-0.673,0-1.217-0.545-1.217-1.217s0.544-1.217,1.217-1.217s1.217,0.545,1.217,1.217S4.499,12.348,3.826,12.348zM25.739,23.913H6.261c-1.009,0-1.826,0.818-1.826,1.826s0.817,1.826,1.826,1.826h19.479c1.008,0,1.826-0.818,1.826-1.826S26.747,23.913,25.739,23.913zM28.174,9.304c-1.007,0-1.826,0.819-1.826,1.826s0.819,1.826,1.826,1.826S30,12.137,30,11.13S29.181,9.304,28.174,9.304zM28.174,12.348c-0.673,0-1.218-0.545-1.218-1.217s0.545-1.217,1.218-1.217s1.218,0.545,1.218,1.217S28.847,12.348,28.174,12.348z",
    green : "M24.485,2c0,8-18,4-18,20c0,6,2,8,2,8h2c0,0-3-2-3-8c0-4,9-8,9-8s-7.981,4.328-7.981,8.436C21.239,24.431,28.288,9.606,24.485,2z",
    bolt : "M22.727,18.242L4.792,27.208l8.966-8.966l-4.483-4.484l17.933-8.966l-8.966,8.966L22.727,18.242z",
    // logos
    slideshare : "M28.952,12.795c-0.956,1.062-5.073,2.409-5.604,2.409h-4.513c-0.749,0-1.877,0.147-2.408,0.484c0.061,0.054,0.122,0.108,0.181,0.163c0.408,0.379,1.362,0.913,2.206,0.913c0.397,0,0.723-0.115,1-0.354c1.178-1.007,1.79-1.125,2.145-1.125c0.421,0,0.783,0.193,0.996,0.531c0.4,0.626,0.106,1.445-0.194,2.087c-0.718,1.524-3.058,3.171-5.595,3.171c-0.002,0-0.002,0-0.004,0c-0.354,0-0.701-0.033-1.033-0.099v3.251c0,0.742,1.033,2.533,4.167,2.533s3.955-3.701,3.955-4.338v-4.512c2.23-1.169,4.512-1.805,5.604-3.895C30.882,12.05,29.907,11.733,28.952,12.795zM21.942,17.521c0.796-1.699-0.053-1.699-1.54-0.425s-3.665,0.105-4.408-0.585c-0.743-0.689-1.486-1.22-2.814-1.167c-1.328,0.053-4.46-0.161-6.267-0.585c-1.805-0.425-4.895-3-5.15-2.335c-0.266,0.69,0.211,1.168,1.168,2.335c0.955,1.169,5.075,2.778,5.075,2.778s0,3.453,0,4.886c0,1.435,2.973,3.61,4.512,3.61s2.708-1.062,2.708-1.806v-4.512C17.775,21.045,21.146,19.221,21.942,17.521zM20.342,13.73c1.744,0,3.159-1.414,3.159-3.158c0-1.745-1.415-3.159-3.159-3.159s-3.158,1.414-3.158,3.159C17.184,12.316,18.598,13.73,20.342,13.73zM12.019,13.73c1.744,0,3.158-1.414,3.158-3.158c0-1.745-1.414-3.159-3.158-3.159c-1.745,0-3.159,1.414-3.159,3.159C8.86,12.316,10.273,13.73,12.019,13.73z",
    twitter : "M23.295,22.567h-7.213c-2.125,0-4.103-2.215-4.103-4.736v-1.829h11.232c1.817,0,3.291-1.469,3.291-3.281c0-1.813-1.474-3.282-3.291-3.282H11.979V6.198c0-1.835-1.375-3.323-3.192-3.323c-1.816,0-3.29,1.488-3.29,3.323v11.633c0,6.23,4.685,11.274,10.476,11.274h7.211c1.818,0,3.318-1.463,3.318-3.298S25.112,22.567,23.295,22.567z",
    twitterbird : "M26.492,9.493c-0.771,0.343-1.602,0.574-2.473,0.678c0.89-0.533,1.562-1.376,1.893-2.382c-0.832,0.493-1.753,0.852-2.734,1.044c-0.785-0.837-1.902-1.359-3.142-1.359c-2.377,0-4.306,1.928-4.306,4.306c0,0.337,0.039,0.666,0.112,0.979c-3.578-0.18-6.75-1.894-8.874-4.499c-0.371,0.636-0.583,1.375-0.583,2.165c0,1.494,0.76,2.812,1.915,3.583c-0.706-0.022-1.37-0.216-1.95-0.538c0,0.018,0,0.036,0,0.053c0,2.086,1.484,3.829,3.454,4.222c-0.361,0.099-0.741,0.147-1.134,0.147c-0.278,0-0.547-0.023-0.81-0.076c0.548,1.711,2.138,2.955,4.022,2.99c-1.474,1.146-3.33,1.842-5.347,1.842c-0.348,0-0.69-0.021-1.027-0.062c1.905,1.225,4.168,1.938,6.6,1.938c7.919,0,12.248-6.562,12.248-12.25c0-0.187-0.002-0.372-0.01-0.557C25.186,11.115,25.915,10.356,26.492,9.493",
    skype : "M28.777,18.438c0.209-0.948,0.318-1.934,0.318-2.944c0-7.578-6.144-13.722-13.724-13.722c-0.799,0-1.584,0.069-2.346,0.2C11.801,1.199,10.35,0.75,8.793,0.75c-4.395,0-7.958,3.562-7.958,7.958c0,1.47,0.399,2.845,1.094,4.024c-0.183,0.893-0.277,1.814-0.277,2.76c0,7.58,6.144,13.723,13.722,13.723c0.859,0,1.699-0.078,2.515-0.23c1.119,0.604,2.399,0.945,3.762,0.945c4.395,0,7.957-3.562,7.957-7.959C29.605,20.701,29.309,19.502,28.777,18.438zM22.412,22.051c-0.635,0.898-1.573,1.609-2.789,2.115c-1.203,0.5-2.646,0.754-4.287,0.754c-1.971,0-3.624-0.346-4.914-1.031C9.5,23.391,8.74,22.717,8.163,21.885c-0.583-0.842-0.879-1.676-0.879-2.479c0-0.503,0.192-0.939,0.573-1.296c0.375-0.354,0.857-0.532,1.432-0.532c0.471,0,0.878,0.141,1.209,0.422c0.315,0.269,0.586,0.662,0.805,1.174c0.242,0.558,0.508,1.027,0.788,1.397c0.269,0.355,0.656,0.656,1.151,0.89c0.497,0.235,1.168,0.354,1.992,0.354c1.135,0,2.064-0.241,2.764-0.721c0.684-0.465,1.016-1.025,1.016-1.711c0-0.543-0.173-0.969-0.529-1.303c-0.373-0.348-0.865-0.621-1.465-0.807c-0.623-0.195-1.47-0.404-2.518-0.623c-1.424-0.306-2.634-0.668-3.596-1.076c-0.984-0.419-1.777-1-2.357-1.727c-0.59-0.736-0.889-1.662-0.889-2.75c0-1.036,0.314-1.971,0.933-2.776c0.613-0.8,1.51-1.423,2.663-1.849c1.139-0.422,2.494-0.635,4.027-0.635c1.225,0,2.303,0.141,3.201,0.421c0.904,0.282,1.668,0.662,2.267,1.13c0.604,0.472,1.054,0.977,1.335,1.5c0.284,0.529,0.43,1.057,0.43,1.565c0,0.49-0.189,0.937-0.563,1.324c-0.375,0.391-0.851,0.589-1.408,0.589c-0.509,0-0.905-0.124-1.183-0.369c-0.258-0.227-0.523-0.58-0.819-1.09c-0.342-0.65-0.756-1.162-1.229-1.523c-0.463-0.351-1.232-0.529-2.292-0.529c-0.984,0-1.784,0.197-2.379,0.588c-0.572,0.375-0.85,0.805-0.85,1.314c0,0.312,0.09,0.574,0.273,0.799c0.195,0.238,0.471,0.447,0.818,0.621c0.36,0.182,0.732,0.326,1.104,0.429c0.382,0.106,1.021,0.263,1.899,0.466c1.11,0.238,2.131,0.506,3.034,0.793c0.913,0.293,1.703,0.654,2.348,1.072c0.656,0.429,1.178,0.979,1.547,1.635c0.369,0.658,0.558,1.471,0.558,2.416C23.371,20.119,23.049,21.148,22.412,22.051z",
    windows : "M20.023,17.484c-1.732-0.205-3.022-0.908-4.212-1.701l0,0l-0.559,0.279l-2.578,8.924l0,0c1.217,0.805,2.905,1.707,4.682,1.914c2.686,0.312,5.56-0.744,6.391-1.195l2.617-9.061l-0.559-0.279C25.805,16.365,23.193,17.857,20.023,17.484zM14.424,14.825c-1.267-0.87-2.578-1.652-4.375-1.816c-0.318-0.029-0.627-0.042-0.925-0.042c-3.011,0-4.948,1.347-4.948,1.347l-2.565,8.877l0,0l0.526,0.281c0.981-0.476,2.78-1.145,5.09-0.984c1.665,0.113,2.92,0.781,4.117,1.531l0.507-0.26l0,0L14.424,14.825zM10.201,12.094c1.664,0.114,2.921,0.78,4.117,1.533l0.509-0.26l0,0L17.4,4.431c-1.27-0.87-2.579-1.653-4.377-1.816c-0.318-0.029-0.626-0.042-0.924-0.042C9.088,2.573,7.15,3.92,7.15,3.92l-2.566,8.878L5.11,13.08C6.092,12.604,7.891,11.936,10.201,12.094zM28.779,5.971L28.779,5.971c0,0.001-2.609,1.492-5.779,1.119c-1.734-0.204-3.023-0.907-4.213-1.701L18.227,5.67l-2.576,8.923l0,0c1.215,0.803,2.906,1.709,4.68,1.915c2.687,0.312,5.558-0.745,6.392-1.197l2.615-9.059L28.779,5.971z",
    apple : "M24.32,10.85c-1.743,1.233-2.615,2.719-2.615,4.455c0,2.079,1.078,3.673,3.232,4.786c-0.578,1.677-1.416,3.134-2.514,4.375c-1.097,1.241-2.098,1.862-3.004,1.862c-0.427,0-1.009-0.143-1.748-0.423l-0.354-0.138c-0.725-0.281-1.363-0.423-1.92-0.423c-0.525,0-1.1,0.11-1.725,0.331l-0.445,0.16l-0.56,0.229c-0.441,0.176-0.888,0.264-1.337,0.264c-1.059,0-2.228-0.872-3.507-2.616c-1.843-2.498-2.764-5.221-2.764-8.167c0-2.095,0.574-3.781,1.725-5.061c1.149-1.279,2.673-1.92,4.568-1.92c0.709,0,1.371,0.13,1.988,0.389l0.423,0.172l0.445,0.183c0.396,0.167,0.716,0.251,0.959,0.251c0.312,0,0.659-0.072,1.04-0.217l0.582-0.229l0.435-0.16c0.693-0.251,1.459-0.377,2.297-0.377C21.512,8.576,23.109,9.334,24.32,10.85zM19.615,3.287c0.021,0.267,0.033,0.473,0.033,0.617c0,1.317-0.479,2.473-1.438,3.467s-2.075,1.49-3.347,1.49c-0.038-0.297-0.058-0.51-0.058-0.639c0-1.12,0.445-2.171,1.337-3.153c0.891-0.982,1.922-1.558,3.096-1.725C19.32,3.329,19.447,3.311,19.615,3.287z",
    linux : "M11.791,25.229c1.027-0.104,1.162-1.191,0.68-1.666c-0.398-0.392-2.598-2.022-3.171-2.664C9.033,20.6,8.673,20.454,8.52,20.12c-0.352-0.771-0.598-1.869-0.151-2.658c0.081-0.144,0.133-0.078,0.071,0.22c-0.351,1.684,0.746,3.059,0.986,2.354c0.167-0.487,0.013-1.358,0.102-2.051c0.158-1.226,1.273-3.577,1.763-3.712c-0.755-1.398,0.886-2.494,0.866-3.723c-0.014-0.798,0.701,0.982,1.419,1.359c0.802,0.422,1.684-0.794,2.936-1.41c0.354-0.176,0.809-0.376,0.776-0.524c-0.146-0.718-1.644,0.886-2.979,0.939c-0.61,0.024-0.837-0.12-1.072-0.347c-0.712-0.689,0.073-0.115,1.132-0.307c0.471-0.085,0.629-0.163,1.128-0.365c0.5-0.201,1.069-0.5,1.636-0.654c0.395-0.106,0.361-0.402,0.208-0.491c-0.088-0.051-0.219-0.046-0.321,0.133c-0.244,0.419-1.383,0.661-1.74,0.771c-0.457,0.14-0.962,0.271-1.634,0.243c-1.021-0.042-0.782-0.509-1.513-0.928c-0.213-0.122-0.156-0.444,0.129-0.729c0.148-0.148,0.557-0.232,0.76-0.572c0.028-0.047,0.289-0.32,0.494-0.461c0.07-0.049,0.076-1.295-0.562-1.32c-0.543-0.021-0.697,0.398-0.675,0.818c0.022,0.419,0.245,0.765,0.393,0.764c0.285-0.004,0.019,0.311-0.138,0.361c-0.237,0.078-0.562-0.934-0.525-1.418c0.039-0.506,0.303-1.4,0.942-1.383c0.576,0.016,0.993,0.737,0.973,1.983c-0.003,0.211,0.935-0.101,1.247,0.229c0.224,0.236-0.767-2.207,1.438-2.375c0.582,0.111,1.14,0.305,1.371,1.641c-0.086,0.139,0.146,1.07-0.215,1.182c-0.438,0.135-0.707-0.02-0.453-0.438c0.172-0.418,0.004-1.483-0.882-1.42c-0.887,0.064-0.769,1.637-0.526,1.668c0.243,0.031,0.854,0.465,1.282,0.549c1.401,0.271,0.371,1.075,0.555,2.048c0.205,1.099,0.929,0.809,1.578,3.717c0.137,0.177,0.676,0.345,1.199,2.579c0.473,2.011-0.195,3.473,0.938,3.353c0.256-0.026,0.629-0.1,0.792-0.668c0.425-1.489-0.213-3.263-0.855-4.46c-0.375-0.698-0.729-1.174-0.916-1.337c0.738,0.436,1.683,1.829,1.898,2.862c0.286,1.358,0.49,1.934,0.059,3.37c0.25,0.125,0.871,0.39,0.871,0.685c-0.647-0.53-2.629-0.625-2.68,0.646c-0.338,0.008-0.594,0.034-0.811,0.293c-0.797,0.944-0.059,2.842-0.139,3.859c-0.07,0.896-0.318,1.783-0.46,2.683c-0.474-0.019-0.428-0.364-0.274-0.852c0.135-0.431,0.351-0.968,0.365-1.484c0.012-0.467-0.039-0.759-0.156-0.831c-0.118-0.072-0.303,0.074-0.559,0.485c-0.543,0.875-1.722,1.261-2.821,1.397c-1.099,0.138-2.123,0.028-2.664-0.578c-0.186-0.207-0.492,0.058-0.529,0.111c-0.049,0.074,0.18,0.219,0.352,0.533c0.251,0.461,0.49,1.159-0.105,1.479C12.83,26.314,12.316,26.221,11.791,25.229L11.791,25.229zM11.398,25.188c0.395,0.621,1.783,3.232-0.652,3.571c-0.814,0.114-2.125-0.474-3.396-0.784c-1.142-0.279-2.301-0.444-2.949-0.627c-0.391-0.108-0.554-0.25-0.588-0.414c-0.091-0.434,0.474-1.041,0.503-1.555c0.028-0.514-0.188-0.779-0.364-1.199c-0.177-0.42-0.224-0.734-0.081-0.914c0.109-0.141,0.334-0.199,0.698-0.164c0.462,0.047,1.02-0.049,1.319-0.23c0.505-0.309,0.742-0.939,0.516-1.699c0,0.744-0.244,1.025-0.855,1.366c-0.577,0.319-1.467,0.062-1.875,0.416c-0.492,0.427,0.175,1.528,0.12,2.338c-0.042,0.622-0.69,1.322-0.401,1.946c0.291,0.627,1.648,0.695,3.064,0.99c2.012,0.422,3.184,1.153,4.113,1.188c1.356,0.05,1.564-1.342,3.693-1.36c0.621-0.033,1.229-0.052,1.835-0.06c0.688-0.009,1.375-0.003,2.079,0.014c1.417,0.034,0.931,0.773,1.851,1.246c0.774,0.397,2.17,0.241,2.504-0.077c0.451-0.431,1.662-1.467,2.592-1.935c1.156-0.583,3.876-1.588,1.902-2.812c-0.461-0.285-1.547-0.588-1.639-2.676c-0.412,0.366-0.365,2.312,0.784,2.697c1.283,0.431,2.085,1.152-0.301,1.969c-1.58,0.54-1.849,0.706-3.099,1.747c-1.267,1.054-3.145,0.636-2.815-1.582c0.171-1.155,0.269-2.11-0.019-3.114c-0.142-0.49-0.211-1.119-0.114-1.562c0.187-0.858,0.651-1.117,1.106-0.293c0.285,0.519,0.385,1.122,1.408,1.171c1.607,0.077,1.926-1.553,2.439-1.627c0.343-0.05,0.686-1.02,0.425-2.589c-0.28-1.681-1.269-4.332-2.536-5.677c-1.053-1.118-1.717-2.098-2.135-3.497c-0.352-1.175-0.547-2.318-0.475-3.412c0.094-1.417-0.691-3.389-1.943-4.316c-0.782-0.581-2.011-0.893-3.122-0.88c-0.623,0.007-1.21,0.099-1.661,0.343c-1.855,1.008-2.113,2.445-2.086,4.088c0.025,1.543,0.078,3.303,0.254,4.977c-0.208,0.77-1.288,2.227-1.979,3.114C8.59,14.233,8.121,16.01,7.52,17.561c-0.321,0.828-0.862,1.2-0.908,2.265C6.6,20.122,6.61,20.891,6.894,20.672C7.98,19.829,9.343,21.95,11.398,25.188L11.398,25.188zM17.044,2.953c-0.06,0.176-0.3,0.321-0.146,0.443c0.152,0.123,0.24-0.171,0.549-0.281c0.08-0.028,0.449,0.012,0.519-0.164c0.03-0.077-0.19-0.164-0.321-0.291c-0.133-0.125-0.262-0.236-0.386-0.229C16.938,2.451,17.096,2.798,17.044,2.953L17.044,2.953zM18.934,9.35c0.115-0.121,0.174,0.207,0.483,0.402c0.244,0.154,0.481,0.04,0.545,0.354c0.044,0.225-0.097,0.467-0.284,0.436C19.35,10.486,18.596,9.705,18.934,9.35L18.934,9.35zM13.832,7.375c-0.508-0.037-0.543,0.33-0.375,0.324C13.629,7.693,13.523,7.408,13.832,7.375L13.832,7.375zM12.96,6.436c0.06-0.013,0.146,0.09,0.119,0.233c-0.037,0.199-0.021,0.324,0.117,0.325c0.022,0,0.048-0.005,0.056-0.057c0.066-0.396-0.14-0.688-0.225-0.711C12.834,6.178,12.857,6.458,12.96,6.436L12.96,6.436zM16.663,6.268c0.129,0.039,0.253,0.262,0.28,0.504c0.002,0.021,0.168-0.035,0.17-0.088c0.011-0.389-0.321-0.571-0.408-0.562C16.506,6.139,16.562,6.238,16.663,6.268L16.663,6.268zM14.765,7.423c0.463-0.214,0.625,0.118,0.465,0.171C15.066,7.648,15.065,7.345,14.765,7.423L14.765,7.423zM9.178,15.304c-0.219-0.026,0.063-0.19,0.184-0.397c0.131-0.227,0.105-0.511,0.244-0.469s0.061,0.2-0.033,0.461C9.491,15.121,9.258,15.313,9.178,15.304L9.178,15.304z",
    nodejs : "M4.783,4.458L2.59,3.196C2.553,3.174,2.511,3.163,2.469,3.161H2.447C2.405,3.163,2.363,3.174,2.326,3.196L0.133,4.458C0.051,4.505,0,4.593,0,4.688l0.005,3.398c0,0.047,0.024,0.092,0.066,0.114c0.041,0.024,0.091,0.024,0.132,0l1.303-0.746c0.083-0.049,0.132-0.136,0.132-0.229V5.637c0-0.095,0.05-0.183,0.132-0.229l0.555-0.32c0.041-0.023,0.086-0.035,0.132-0.035c0.045,0,0.092,0.012,0.132,0.035l0.555,0.32c0.082,0.047,0.133,0.135,0.133,0.229v1.588c0,0.094,0.051,0.182,0.132,0.229l1.303,0.746c0.041,0.024,0.092,0.024,0.132,0c0.041-0.022,0.066-0.067,0.066-0.114l0.004-3.398C4.915,4.593,4.865,4.505,4.783,4.458zM17.93,0.745l-1.305-0.729c-0.042-0.023-0.091-0.022-0.132,0.001c-0.041,0.024-0.065,0.067-0.065,0.114v3.365c0,0.033-0.018,0.064-0.046,0.081s-0.064,0.017-0.093,0l-0.549-0.316c-0.082-0.047-0.183-0.047-0.265,0l-2.193,1.266c-0.082,0.047-0.133,0.135-0.133,0.229V7.29c0,0.095,0.051,0.182,0.132,0.229l2.194,1.267c0.082,0.048,0.183,0.048,0.265,0l2.194-1.267c0.082-0.048,0.133-0.135,0.133-0.229V0.977C18.066,0.88,18.014,0.792,17.93,0.745zM16.421,6.458c0,0.023-0.013,0.045-0.033,0.057l-0.753,0.435c-0.021,0.012-0.045,0.012-0.066,0l-0.753-0.435c-0.021-0.012-0.033-0.034-0.033-0.057v-0.87c0-0.023,0.013-0.045,0.033-0.058l0.753-0.435c0.021-0.012,0.045-0.012,0.066,0l0.753,0.435c0.021,0.012,0.033,0.034,0.033,0.058V6.458zM24.473,4.493l-2.18-1.266c-0.082-0.047-0.183-0.048-0.265,0l-2.193,1.266c-0.082,0.047-0.132,0.135-0.132,0.229v2.532c0,0.096,0.051,0.184,0.133,0.23l2.18,1.242c0.08,0.045,0.179,0.046,0.26,0.001l1.318-0.732c0.042-0.023,0.067-0.067,0.068-0.115c0-0.048-0.025-0.092-0.066-0.116l-2.207-1.266c-0.041-0.023-0.066-0.067-0.066-0.115V5.59c0-0.047,0.025-0.091,0.065-0.115l0.688-0.396c0.041-0.024,0.091-0.024,0.132,0l0.688,0.396c0.041,0.023,0.066,0.067,0.066,0.115v0.625c0,0.047,0.025,0.091,0.066,0.114c0.041,0.024,0.092,0.024,0.132,0l1.314-0.764c0.081-0.047,0.132-0.135,0.132-0.229V4.722C24.605,4.628,24.555,4.541,24.473,4.493zM11.363,4.48L9.169,3.214c-0.082-0.047-0.183-0.047-0.265,0L6.711,4.48C6.629,4.527,6.579,4.615,6.579,4.709v2.534c0,0.095,0.051,0.182,0.133,0.229l2.193,1.267c0.082,0.048,0.183,0.048,0.265,0l2.193-1.267c0.082-0.048,0.132-0.135,0.132-0.229V4.709C11.495,4.615,11.445,4.527,11.363,4.48zM31.019,4.382L28.95,3.187c-0.13-0.074-0.304-0.074-0.435,0l-2.068,1.195c-0.135,0.077-0.218,0.222-0.218,0.377v2.386c0,0.156,0.083,0.301,0.218,0.378l0.542,0.312c0.263,0.13,0.356,0.13,0.477,0.13c0.389,0,0.612-0.236,0.612-0.646V4.962c0-0.033-0.027-0.06-0.06-0.06h-0.263c-0.033,0-0.061,0.026-0.061,0.06v2.356c0,0.182-0.188,0.363-0.495,0.209l-0.566-0.326c-0.021-0.012-0.033-0.033-0.033-0.057V4.759c0-0.023,0.013-0.045,0.033-0.057l2.067-1.193c0.019-0.011,0.044-0.011,0.063,0l2.067,1.193c0.02,0.012,0.032,0.034,0.032,0.057v2.386c0,0.023-0.013,0.046-0.032,0.057l-2.068,1.193c-0.018,0.012-0.045,0.012-0.063,0l-0.53-0.314c-0.017-0.01-0.036-0.013-0.052-0.004c-0.146,0.083-0.175,0.094-0.312,0.143c-0.034,0.012-0.084,0.031,0.019,0.09l0.691,0.408c0.065,0.038,0.141,0.059,0.217,0.059s0.151-0.021,0.218-0.059l2.068-1.194c0.134-0.078,0.217-0.222,0.217-0.378V4.759C31.235,4.604,31.152,4.459,31.019,4.382zM29.371,6.768c-0.548,0-0.668-0.138-0.708-0.41c-0.005-0.029-0.029-0.051-0.06-0.051h-0.268c-0.033,0-0.06,0.026-0.06,0.06c0,0.349,0.189,0.765,1.095,0.765c0.655,0,1.031-0.259,1.031-0.709c0-0.447-0.302-0.566-0.938-0.65c-0.643-0.085-0.708-0.128-0.708-0.279c0-0.125,0.056-0.29,0.531-0.29c0.425,0,0.581,0.091,0.646,0.378c0.006,0.027,0.03,0.047,0.059,0.047h0.269c0.017,0,0.032-0.007,0.044-0.019c0.011-0.013,0.017-0.029,0.016-0.046c-0.042-0.493-0.37-0.723-1.032-0.723c-0.59,0-0.941,0.249-0.941,0.666c0,0.453,0.35,0.578,0.916,0.634c0.677,0.066,0.729,0.166,0.729,0.298C29.992,6.669,29.807,6.768,29.371,6.768zM22.128,5.446l-0.42,0.243c-0.016,0.009-0.025,0.026-0.025,0.044v0.486c0,0.019,0.01,0.035,0.025,0.044l0.42,0.243c0.016,0.009,0.035,0.009,0.052,0l0.421-0.243c0.016-0.009,0.025-0.025,0.025-0.044V5.733c0-0.018-0.01-0.035-0.025-0.044L22.18,5.446C22.163,5.438,22.144,5.438,22.128,5.446z",
    jquery : "M10.322,23.041C4.579,18.723,2.777,11.07,5.494,4.583c-0.254,0.291-0.502,0.59-0.739,0.904c-5.177,6.887-4.008,16.505,2.613,21.482c6.62,4.979,16.184,3.432,21.362-3.455c0.237-0.314,0.454-0.635,0.663-0.959C23.915,26.963,16.064,27.357,10.322,23.041zM13.662,18.598c4.765,3.582,11.604,2.564,15.567-2.198c-3.609,2.641-9.09,2.475-13.361-0.736S9.916,7.231,11.451,3.03C7.976,8.161,8.897,15.015,13.662,18.598zM18.642,11.976c3.254,2.447,8.146,1.438,10.967-2.242c-2.604,1.921-6.341,1.955-9.157-0.164c-2.819-2.118-3.826-5.718-2.701-8.754C14.998,4.549,15.387,9.528,18.642,11.976z",
    sencha : "M18.265,22.734c1.365,0.662,2.309,2.062,2.309,3.682c0,1.566-0.881,2.928-2.176,3.615l1.922-0.98c3.16-1.58,5.332-4.846,5.332-8.617c0-3.719-2.109-6.945-5.195-8.547l-6.272-3.144c-1.366-0.662-2.308-2.062-2.308-3.682c0-1.567,0.881-2.928,2.175-3.614L12.13,2.428c-3.161,1.578-5.332,4.843-5.332,8.616c0,3.718,2.108,6.944,5.195,8.546L18.265,22.734z",
    vim : "M25.012,10.44l4.571-4.645c0.11-0.113,0.173-0.264,0.173-0.423V3.134c0-0.159-0.064-0.314-0.177-0.427l-0.604-0.602c-0.111-0.112-0.261-0.176-0.42-0.177l-9.646-0.086C18.71,1.84,18.523,1.935,18.41,2.099L17.807,2.96c-0.033,0.047-0.059,0.099-0.076,0.154l-2.144-2.156l0,0l-1.646,1.666l-0.447-0.497c-0.112-0.125-0.27-0.197-0.438-0.199L3.324,1.756c-0.163-0.003-0.322,0.06-0.437,0.176L2.284,2.535C2.171,2.647,2.107,2.803,2.107,2.962v2.325c0,0.164,0.066,0.32,0.183,0.434l0.657,0.635C3.056,6.461,3.2,6.521,3.352,6.525l0.285,0.007l0.007,6.512l-2.527,2.557l2.533,2.533l0.008,8.084c0,0.159,0.065,0.314,0.177,0.427l0.861,0.861c0.112,0.111,0.268,0.176,0.427,0.176h2.67c0.161,0,0.317-0.064,0.43-0.181l2.378-2.417l4.9,4.9l14.47-14.558L25.012,10.44zM9.747,24.232l-2.208,2.242H5.372l-0.509-0.509L4.856,19.34l-0.008-7.515L4.842,5.943c0-0.328-0.261-0.594-0.588-0.603L3.617,5.326L3.313,5.031v-1.82l0.245-0.245l9.215,0.163l0.319,0.354l0.126,0.141v1.419l-0.352,0.362H12.26c-0.331,0-0.6,0.266-0.603,0.597l-0.076,7.203c-0.002,0.244,0.141,0.463,0.365,0.56c0.224,0.096,0.482,0.049,0.657-0.12l7.495-7.235c0.174-0.171,0.23-0.432,0.139-0.66c-0.09-0.228-0.312-0.377-0.56-0.377h-0.479l-0.296-0.379V3.496l0.312-0.445l9.083,0.081l0.252,0.252v1.743l-4.388,4.458L9.747,24.232z",
    inkscape : "M20.402,17.626c0.84-0.772,2.468-0.381,5.979-1.853c1.716-0.72,1.572-1.265,1.566-1.928c-0.001-0.014,0-0.027,0-0.041h-0.005c-0.012-0.667-0.291-1.332-0.846-1.845L17.049,2.684c-0.566-0.522-1.304-0.782-2.042-0.782V1.898c-0.738,0-1.475,0.261-2.04,0.783l-10.05,9.276c-0.554,0.512-0.832,1.176-0.843,1.844H2.07c0,0,0.003,0.011,0.004,0.011c0,0.012-0.004,0.024-0.004,0.034h0.017c0.193,0.676,5.164,1.536,5.718,2.049c0.838,0.774-3.211,1.339-2.374,2.114c0.838,0.773,5.062,1.496,5.898,2.271c0.838,0.771-1.711,1.596-0.874,2.366c0.837,0.773,3.651-0.191,3.142,1.822c1.13,1.045,3.49,0.547,5.071-0.498c0.837-0.771-1.607-0.703-0.77-1.477c0.836-0.774,2.949-0.777,4.73-2.627C21.913,18.838,19.566,18.398,20.402,17.626zM10.973,16.868l-0.42-0.504c1.497,0.358,3.162,0.827,4.498,0.837l0.058,0.554C13.964,17.646,11.544,17.137,10.973,16.868zM18.161,8.58l-1.396-0.74L14.53,9.594l-1.067-3.192l-1.177,2.545L8.998,9.25l0.036-1.352c0-0.324,1.895-2.596,3.05-3.136l2.112-1.401c0.312-0.186,0.53-0.261,0.727-0.257c0.327,0.011,0.593,0.239,1.112,0.55l4.748,3.25c0.357,0.215,0.619,0.522,0.626,0.898l-2.813-1.254L18.161,8.58zM26.434,19.594c-0.313-0.07-1.688-0.691-2.035,0.165c0.968,0.981,2.645,2.181,3.316,1.482C28.391,20.543,27.102,19.745,26.434,19.594zM4.663,21.566c-0.315,0.074-1.842,0.115-1.719,1.021c1.351,0.451,3.438,0.792,3.684-0.113C6.873,21.566,5.33,21.414,4.663,21.566zM17.877,26.396c-0.232,0.209-1.53,0.953-0.929,1.681c1.413-0.236,3.403-0.914,3.12-1.812C19.786,25.369,18.37,25.953,17.877,26.396z",
    aumade : "M14.513,24.52c-0.131-0.217-0.14-0.481-0.022-0.711l1.987-3.844l0,0c0.186-0.357,0.625-0.497,0.981-0.312c0.357,0.188,0.498,0.625,0.312,0.982l-1.801,3.48l2.228,3.699h12.269l-14.8-25.631L6.433,18.178c0.434,0.242,0.909,0.479,1.391,0.654c0.571,0.211,1.148,0.342,1.658,0.342c0.276,0,0.579-0.078,0.916-0.238c0.337-0.158,0.7-0.396,1.073-0.688c0.749-0.582,1.527-1.354,2.334-2.021c0.539-0.442,1.091-0.844,1.706-1.099c0.352-0.145,0.729-0.239,1.128-0.239c0.622,0,1.174,0.214,1.622,0.5c0.449,0.287,0.813,0.646,1.11,0.995c0.59,0.697,0.902,1.359,0.924,1.394l0,0c0.18,0.361,0.021,0.801-0.341,0.977c-0.356,0.176-0.798,0.021-0.978-0.34c0-0.002-0.002-0.004-0.004-0.007c-0.002-0.011-0.008-0.021-0.018-0.034c-0.018-0.033-0.043-0.082-0.078-0.146c-0.07-0.125-0.179-0.305-0.312-0.496c-0.271-0.391-0.668-0.845-1.092-1.104c-0.281-0.178-0.561-0.272-0.844-0.272c-0.216,0-0.479,0.069-0.788,0.229c-0.309,0.153-0.653,0.396-1.016,0.688c-0.727,0.584-1.511,1.362-2.351,2.033c-0.562,0.445-1.15,0.853-1.809,1.103c-0.375,0.143-0.776,0.229-1.195,0.229c-0.749,0-1.48-0.181-2.164-0.433c-0.58-0.219-1.125-0.482-1.613-0.764L0.86,27.816h15.63L14.513,24.52zM18.214,22.242c0.222-0.557,0.537-1.217,0.963-1.848c0.427-0.627,0.957-1.232,1.646-1.646c0.379-0.229,0.812-0.391,1.282-0.438l-0.604-0.934l0,0c-0.22-0.339-0.123-0.789,0.215-1.009c0.341-0.219,0.789-0.123,1.013,0.216l1.545,2.391c0.184,0.274,0.147,0.646-0.075,0.893c-0.228,0.247-0.591,0.305-0.886,0.145c-0.354-0.191-0.646-0.258-0.901-0.258c-0.291,0-0.562,0.084-0.845,0.25c-0.277,0.164-0.562,0.414-0.813,0.719c-0.519,0.607-0.937,1.422-1.185,2.055c-0.111,0.285-0.387,0.466-0.678,0.466c-0.092,0-0.183-0.021-0.271-0.056C18.249,23.039,18.064,22.615,18.214,22.242z",
    firefox : "M28.4,22.469c0.479-0.964,0.851-1.991,1.095-3.066c0.953-3.661,0.666-6.854,0.666-6.854l-0.327,2.104c0,0-0.469-3.896-1.044-5.353c-0.881-2.231-1.273-2.214-1.274-2.21c0.542,1.379,0.494,2.169,0.483,2.288c-0.01-0.016-0.019-0.032-0.027-0.047c-0.131-0.324-0.797-1.819-2.225-2.878c-2.502-2.481-5.943-4.014-9.745-4.015c-4.056,0-7.705,1.745-10.238,4.525C5.444,6.5,5.183,5.938,5.159,5.317c0,0-0.002,0.002-0.006,0.005c0-0.011-0.003-0.021-0.003-0.031c0,0-1.61,1.247-1.436,4.612c-0.299,0.574-0.56,1.172-0.777,1.791c-0.375,0.817-0.75,2.004-1.059,3.746c0,0,0.133-0.422,0.399-0.988c-0.064,0.482-0.103,0.971-0.116,1.467c-0.09,0.845-0.118,1.865-0.039,3.088c0,0,0.032-0.406,0.136-1.021c0.834,6.854,6.667,12.165,13.743,12.165l0,0c1.86,0,3.636-0.37,5.256-1.036C24.938,27.771,27.116,25.196,28.4,22.469zM16.002,3.356c2.446,0,4.73,0.68,6.68,1.86c-2.274-0.528-3.433-0.261-3.423-0.248c0.013,0.015,3.384,0.589,3.981,1.411c0,0-1.431,0-2.856,0.41c-0.065,0.019,5.242,0.663,6.327,5.966c0,0-0.582-1.213-1.301-1.42c0.473,1.439,0.351,4.17-0.1,5.528c-0.058,0.174-0.118-0.755-1.004-1.155c0.284,2.037-0.018,5.268-1.432,6.158c-0.109,0.07,0.887-3.189,0.201-1.93c-4.093,6.276-8.959,2.539-10.934,1.208c1.585,0.388,3.267,0.108,4.242-0.559c0.982-0.672,1.564-1.162,2.087-1.047c0.522,0.117,0.87-0.407,0.464-0.872c-0.405-0.466-1.392-1.105-2.725-0.757c-0.94,0.247-2.107,1.287-3.886,0.233c-1.518-0.899-1.507-1.63-1.507-2.095c0-0.366,0.257-0.88,0.734-1.028c0.58,0.062,1.044,0.214,1.537,0.466c0.005-0.135,0.006-0.315-0.001-0.519c0.039-0.077,0.015-0.311-0.047-0.596c-0.036-0.287-0.097-0.582-0.19-0.851c0.01-0.002,0.017-0.007,0.021-0.021c0.076-0.344,2.147-1.544,2.299-1.659c0.153-0.114,0.55-0.378,0.506-1.183c-0.015-0.265-0.058-0.294-2.232-0.286c-0.917,0.003-1.425-0.894-1.589-1.245c0.222-1.231,0.863-2.11,1.919-2.704c0.02-0.011,0.015-0.021-0.008-0.027c0.219-0.127-2.524-0.006-3.76,1.604C9.674,8.045,9.219,7.95,8.71,7.95c-0.638,0-1.139,0.07-1.603,0.187c-0.05,0.013-0.122,0.011-0.208-0.001C6.769,8.04,6.575,7.88,6.365,7.672c0.161-0.18,0.324-0.356,0.495-0.526C9.201,4.804,12.43,3.357,16.002,3.356z",
    ie : "M27.998,2.266c-2.12-1.91-6.925,0.382-9.575,1.93c-0.76-0.12-1.557-0.185-2.388-0.185c-3.349,0-6.052,0.985-8.106,2.843c-2.336,2.139-3.631,4.94-3.631,8.177c0,0.028,0.001,0.056,0.001,0.084c3.287-5.15,8.342-7.79,9.682-8.487c0.212-0.099,0.338,0.155,0.141,0.253c-0.015,0.042-0.015,0,0,0c-2.254,1.35-6.434,5.259-9.146,10.886l-0.003-0.007c-1.717,3.547-3.167,8.529-0.267,10.358c2.197,1.382,6.13-0.248,9.295-2.318c0.764,0.108,1.567,0.165,2.415,0.165c5.84,0,9.937-3.223,11.399-7.924l-8.022-0.014c-0.337,1.661-1.464,2.548-3.223,2.548c-2.21,0-3.729-1.211-3.828-4.012l15.228-0.014c0.028-0.578-0.042-0.985-0.042-1.436c0-5.251-3.143-9.355-8.255-10.663c2.081-1.294,5.974-3.209,7.848-1.681c1.407,1.14,0.633,3.533,0.295,4.518c-0.056,0.254,0.24,0.296,0.296,0.057C28.814,5.573,29.026,3.194,27.998,2.266zM13.272,25.676c-2.469,1.475-5.873,2.539-7.539,1.289c-1.243-0.935-0.696-3.468,0.398-5.938c0.664,0.992,1.495,1.886,2.473,2.63C9.926,24.651,11.479,25.324,13.272,25.676zM12.714,13.046c0.042-2.435,1.787-3.49,3.617-3.49c1.928,0,3.49,1.112,3.49,3.49H12.714z",
    ie9 : "M27.751,17.887c0.054-0.434,0.081-0.876,0.081-1.324c0-1.744-0.413-3.393-1.146-4.854c1.133-2.885,1.155-5.369-0.201-6.777c-1.756-1.822-5.391-1.406-9.433,0.721c-0.069-0.001-0.138-0.003-0.206-0.003c-6.069,0-10.988,4.888-10.988,10.917c0,0.183,0.005,0.354,0.014,0.529c-2.688,4.071-3.491,7.967-1.688,9.838c1.557,1.613,4.691,1.344,8.2-0.392c1.363,0.604,2.873,0.938,4.462,0.938c4.793,0,8.867-3.049,10.369-7.299H21.26c-0.814,1.483-2.438,2.504-4.307,2.504c-2.688,0-4.867-2.104-4.867-4.688c0-0.036,0.002-0.071,0.003-0.106h15.662V17.887zM26.337,6.099c0.903,0.937,0.806,2.684-0.087,4.818c-1.27-2.083-3.221-3.71-5.546-4.576C23.244,5.217,25.324,5.047,26.337,6.099zM16.917,10.372c2.522,0,4.585,1.991,4.748,4.509h-9.496C12.333,12.363,14.396,10.372,16.917,10.372zM5.687,26.501c-1.103-1.146-0.712-3.502,0.799-6.298c0.907,2.546,2.736,4.658,5.09,5.938C8.92,27.368,6.733,27.587,5.687,26.501z",
    opera : "M15.954,2.046c-7.489,0-12.872,5.432-12.872,13.581c0,7.25,5.234,13.835,12.873,13.835c7.712,0,12.974-6.583,12.974-13.835C28.929,7.413,23.375,2.046,15.954,2.046zM15.952,26.548L15.952,26.548c-2.289,0-3.49-1.611-4.121-3.796c-0.284-1.037-0.458-2.185-0.563-3.341c-0.114-1.374-0.129-2.773-0.129-4.028c0-0.993,0.018-1.979,0.074-2.926c0.124-1.728,0.386-3.431,0.89-4.833c0.694-1.718,1.871-2.822,3.849-2.822c2.5,0,3.763,1.782,4.385,4.322c0.429,1.894,0.56,4.124,0.56,6.274c0,2.299-0.103,5.153-0.763,7.442C19.473,24.979,18.242,26.548,15.952,26.548z",
    chrome : "M15.318,7.677c0.071-0.029,0.148-0.046,0.229-0.046h11.949c-2.533-3.915-6.938-6.506-11.949-6.506c-5.017,0-9.428,2.598-11.959,6.522l4.291,7.431C8.018,11.041,11.274,7.796,15.318,7.677zM28.196,8.84h-8.579c2.165,1.357,3.605,3.763,3.605,6.506c0,1.321-0.334,2.564-0.921,3.649c-0.012,0.071-0.035,0.142-0.073,0.209l-5.973,10.347c7.526-0.368,13.514-6.587,13.514-14.205C29.77,13.002,29.201,10.791,28.196,8.84zM15.547,23.022c-2.761,0-5.181-1.458-6.533-3.646c-0.058-0.046-0.109-0.103-0.149-0.171L2.89,8.855c-1,1.946-1.565,4.153-1.565,6.492c0,7.624,5.999,13.846,13.534,14.205l4.287-7.425C18.073,22.698,16.848,23.022,15.547,23.022zM9.08,15.347c0,1.788,0.723,3.401,1.894,4.573c1.172,1.172,2.785,1.895,4.573,1.895c1.788,0,3.401-0.723,4.573-1.895s1.895-2.785,1.895-4.573c0-1.788-0.723-3.4-1.895-4.573c-1.172-1.171-2.785-1.894-4.573-1.894c-1.788,0-3.401,0.723-4.573,1.894C9.803,11.946,9.081,13.559,9.08,15.347z",
    safari : "M16.154,5.135c-0.504,0-1,0.031-1.488,0.089l-0.036-0.18c-0.021-0.104-0.06-0.198-0.112-0.283c0.381-0.308,0.625-0.778,0.625-1.306c0-0.927-0.751-1.678-1.678-1.678s-1.678,0.751-1.678,1.678c0,0.745,0.485,1.376,1.157,1.595c-0.021,0.105-0.021,0.216,0,0.328l0.033,0.167C7.645,6.95,3.712,11.804,3.712,17.578c0,6.871,5.571,12.441,12.442,12.441c6.871,0,12.441-5.57,12.441-12.441C28.596,10.706,23.025,5.135,16.154,5.135zM16.369,8.1c4.455,0,8.183,3.116,9.123,7.287l-0.576,0.234c-0.148-0.681-0.755-1.191-1.48-1.191c-0.837,0-1.516,0.679-1.516,1.516c0,0.075,0.008,0.148,0.018,0.221l-2.771-0.028c-0.054-0.115-0.114-0.226-0.182-0.333l3.399-5.11l0.055-0.083l-4.766,4.059c-0.352-0.157-0.74-0.248-1.148-0.256l0.086-0.018l-1.177-2.585c0.64-0.177,1.111-0.763,1.111-1.459c0-0.837-0.678-1.515-1.516-1.515c-0.075,0-0.147,0.007-0.219,0.018l0.058-0.634C15.357,8.141,15.858,8.1,16.369,8.1zM12.146,3.455c0-0.727,0.591-1.318,1.318-1.318c0.727,0,1.318,0.591,1.318,1.318c0,0.425-0.203,0.802-0.516,1.043c-0.183-0.123-0.413-0.176-0.647-0.13c-0.226,0.045-0.413,0.174-0.535,0.349C12.542,4.553,12.146,4.049,12.146,3.455zM7.017,17.452c0-4.443,3.098-8.163,7.252-9.116l0.297,0.573c-0.61,0.196-1.051,0.768-1.051,1.442c0,0.837,0.678,1.516,1.515,1.516c0.068,0,0.135-0.006,0.2-0.015l-0.058,2.845l0.052-0.011c-0.442,0.204-0.824,0.513-1.116,0.895l0.093-0.147l-1.574-0.603l1.172,1.239l0.026-0.042c-0.19,0.371-0.306,0.788-0.324,1.229l-0.003-0.016l-2.623,1.209c-0.199-0.604-0.767-1.041-1.438-1.041c-0.837,0-1.516,0.678-1.516,1.516c0,0.064,0.005,0.128,0.013,0.191l-0.783-0.076C7.063,18.524,7.017,17.994,7.017,17.452zM16.369,26.805c-4.429,0-8.138-3.078-9.106-7.211l0.691-0.353c0.146,0.686,0.753,1.2,1.482,1.2c0.837,0,1.515-0.679,1.515-1.516c0-0.105-0.011-0.207-0.031-0.307l2.858,0.03c0.045,0.095,0.096,0.187,0.15,0.276l-3.45,5.277l0.227-0.195l4.529-3.92c0.336,0.153,0.705,0.248,1.094,0.266l-0.019,0.004l1.226,2.627c-0.655,0.166-1.142,0.76-1.142,1.468c0,0.837,0.678,1.515,1.516,1.515c0.076,0,0.151-0.007,0.225-0.018l0.004,0.688C17.566,26.746,16.975,26.805,16.369,26.805zM18.662,26.521l-0.389-0.6c0.661-0.164,1.152-0.759,1.152-1.47c0-0.837-0.68-1.516-1.516-1.516c-0.066,0-0.13,0.005-0.193,0.014v-2.86l-0.025,0.004c0.409-0.185,0.77-0.459,1.055-0.798l1.516,0.659l-1.104-1.304c0.158-0.335,0.256-0.704,0.278-1.095l2.552-1.164c0.19,0.618,0.766,1.068,1.447,1.068c0.838,0,1.516-0.679,1.516-1.516c0-0.069-0.006-0.137-0.016-0.204l0.65,0.12c0.089,0.517,0.136,1.049,0.136,1.591C25.722,21.826,22.719,25.499,18.662,26.521z",
    linkedin : "M27.25,3.125h-22c-1.104,0-2,0.896-2,2v22c0,1.104,0.896,2,2,2h22c1.104,0,2-0.896,2-2v-22C29.25,4.021,28.354,3.125,27.25,3.125zM11.219,26.781h-4v-14h4V26.781zM9.219,11.281c-1.383,0-2.5-1.119-2.5-2.5s1.117-2.5,2.5-2.5s2.5,1.119,2.5,2.5S10.602,11.281,9.219,11.281zM25.219,26.781h-4v-8.5c0-0.4-0.403-1.055-0.687-1.213c-0.375-0.211-1.261-0.229-1.665-0.034l-1.648,0.793v8.954h-4v-14h4v0.614c1.583-0.723,3.78-0.652,5.27,0.184c1.582,0.886,2.73,2.864,2.73,4.702V26.781z",
    flickr : "M21.77,8.895c-2.379,0-4.479,1.174-5.77,2.969c-1.289-1.795-3.39-2.969-5.77-2.969c-3.924,0-7.105,3.181-7.105,7.105c0,3.924,3.181,7.105,7.105,7.105c2.379,0,4.48-1.175,5.77-2.97c1.29,1.795,3.391,2.97,5.77,2.97c3.925,0,7.105-3.182,7.105-7.105C28.875,12.075,25.694,8.895,21.77,8.895zM21.769,21.822c-3.211,0-5.821-2.61-5.821-5.821c0-3.213,2.61-5.824,5.821-5.824c3.213,0,5.824,2.611,5.824,5.824C27.593,19.212,24.981,21.822,21.769,21.822z",
    github : "M28.436,15.099c-1.201-0.202-2.451-0.335-3.466-0.371l-0.179-0.006c0.041-0.09,0.072-0.151,0.082-0.16c0.022-0.018,0.04-0.094,0.042-0.168c0-0.041,0.018-0.174,0.046-0.35c0.275,0.01,0.64,0.018,1.038,0.021c1.537,0.012,3.145,0.136,4.248,0.331c0.657,0.116,0.874,0.112,0.389-0.006c-0.491-0.119-1.947-0.294-3.107-0.37c-0.779-0.053-1.896-0.073-2.554-0.062c0.019-0.114,0.041-0.241,0.064-0.371c0.093-0.503,0.124-1.009,0.126-2.016c0.002-1.562-0.082-1.992-0.591-3.025c-0.207-0.422-0.441-0.78-0.724-1.104c0.247-0.729,0.241-1.858-0.015-2.848c-0.211-0.812-0.285-0.864-1.021-0.708C22.19,4.019,21.69,4.2,21.049,4.523c-0.303,0.153-0.721,0.391-1.024,0.578c-0.79-0.278-1.607-0.462-2.479-0.561c-0.884-0.1-3.051-0.044-3.82,0.098c-0.752,0.139-1.429,0.309-2.042,0.511c-0.306-0.189-0.75-0.444-1.067-0.604C9.973,4.221,9.473,4.041,8.847,3.908c-0.734-0.157-0.81-0.104-1.02,0.708c-0.26,1.003-0.262,2.151-0.005,2.878C7.852,7.577,7.87,7.636,7.877,7.682c-1.042,1.312-1.382,2.78-1.156,4.829c0.059,0.534,0.15,1.024,0.277,1.473c-0.665-0.004-1.611,0.02-2.294,0.064c-1.162,0.077-2.618,0.25-3.109,0.369c-0.484,0.118-0.269,0.122,0.389,0.007c1.103-0.194,2.712-0.32,4.248-0.331c0.29-0.001,0.561-0.007,0.794-0.013c0.07,0.237,0.15,0.463,0.241,0.678L7.26,14.759c-1.015,0.035-2.264,0.168-3.465,0.37c-0.901,0.151-2.231,0.453-2.386,0.54c-0.163,0.091-0.03,0.071,0.668-0.106c1.273-0.322,2.928-0.569,4.978-0.741l0.229-0.02c0.44,1.022,1.118,1.802,2.076,2.41c0.586,0.373,1.525,0.756,1.998,0.816c0.13,0.016,0.508,0.094,0.84,0.172c0.333,0.078,0.984,0.195,1.446,0.262h0.011c-0.009,0.006-0.017,0.01-0.025,0.016c-0.56,0.291-0.924,0.744-1.169,1.457c-0.11,0.033-0.247,0.078-0.395,0.129c-0.529,0.18-0.735,0.217-1.271,0.221c-0.556,0.004-0.688-0.02-1.02-0.176c-0.483-0.225-0.933-0.639-1.233-1.133c-0.501-0.826-1.367-1.41-2.089-1.41c-0.617,0-0.734,0.25-0.288,0.615c0.672,0.549,1.174,1.109,1.38,1.537c0.116,0.24,0.294,0.611,0.397,0.824c0.109,0.227,0.342,0.535,0.564,0.748c0.522,0.498,1.026,0.736,1.778,0.848c0.504,0.074,0.628,0.074,1.223-0.002c0.287-0.035,0.529-0.076,0.746-0.127c0,0.244,0,0.525,0,0.855c0,1.766-0.021,2.334-0.091,2.5c-0.132,0.316-0.428,0.641-0.716,0.787c-0.287,0.146-0.376,0.307-0.255,0.455c0.067,0.08,0.196,0.094,0.629,0.066c0.822-0.051,1.403-0.355,1.699-0.891c0.095-0.172,0.117-0.518,0.147-2.318c0.032-1.953,0.046-2.141,0.173-2.42c0.077-0.166,0.188-0.346,0.25-0.395c0.104-0.086,0.111,0.084,0.111,2.42c-0.001,2.578-0.027,2.889-0.285,3.385c-0.058,0.113-0.168,0.26-0.245,0.33c-0.135,0.123-0.192,0.438-0.098,0.533c0.155,0.154,0.932-0.088,1.356-0.422c0.722-0.572,0.808-1.045,0.814-4.461l0.003-2.004l0.219,0.021l0.219,0.02l0.036,2.621c0.041,2.951,0.047,2.994,0.549,3.564c0.285,0.322,0.572,0.5,1.039,0.639c0.625,0.188,0.813-0.102,0.393-0.605c-0.457-0.547-0.479-0.756-0.454-3.994c0.017-2.076,0.017-2.076,0.151-1.955c0.282,0.256,0.336,0.676,0.336,2.623c0,2.418,0.069,2.648,0.923,3.07c0.399,0.195,0.511,0.219,1.022,0.221c0.544,0.002,0.577-0.006,0.597-0.148c0.017-0.115-0.05-0.193-0.304-0.348c-0.333-0.205-0.564-0.467-0.709-0.797c-0.055-0.127-0.092-0.959-0.117-2.672c-0.036-2.393-0.044-2.502-0.193-2.877c-0.201-0.504-0.508-0.902-0.897-1.166c-0.101-0.066-0.202-0.121-0.333-0.162c0.161-0.016,0.317-0.033,0.468-0.055c1.572-0.209,2.403-0.383,3.07-0.641c1.411-0.543,2.365-1.445,2.882-2.724c0.046-0.114,0.092-0.222,0.131-0.309l0.398,0.033c2.051,0.173,3.706,0.42,4.979,0.743c0.698,0.177,0.831,0.198,0.668,0.105C30.666,15.551,29.336,15.25,28.436,15.099zM22.422,15.068c-0.233,0.512-0.883,1.17-1.408,1.428c-0.518,0.256-1.33,0.451-2.25,0.544c-0.629,0.064-4.137,0.083-4.716,0.026c-1.917-0.188-2.991-0.557-3.783-1.296c-0.75-0.702-1.1-1.655-1.039-2.828c0.039-0.734,0.216-1.195,0.679-1.755c0.421-0.51,0.864-0.825,1.386-0.985c0.437-0.134,1.778-0.146,3.581-0.03c0.797,0.051,1.456,0.051,2.252,0c1.886-0.119,3.145-0.106,3.61,0.038c0.731,0.226,1.397,0.834,1.797,1.644c0.18,0.362,0.215,0.516,0.241,1.075C22.808,13.699,22.675,14.517,22.422,15.068zM12.912,11.762c-1.073-0.188-1.686,1.649-0.863,2.587c0.391,0.445,0.738,0.518,1.172,0.248c0.402-0.251,0.62-0.72,0.62-1.328C13.841,12.458,13.472,11.862,12.912,11.762zM19.425,11.872c-1.073-0.188-1.687,1.647-0.864,2.586c0.392,0.445,0.738,0.519,1.173,0.247c0.401-0.25,0.62-0.72,0.62-1.328C20.354,12.569,19.985,11.971,19.425,11.872zM16.539,15.484c-0.023,0.074-0.135,0.184-0.248,0.243c-0.286,0.147-0.492,0.096-0.794-0.179c-0.187-0.169-0.272-0.258-0.329-0.081c-0.053,0.164,0.28,0.493,0.537,0.594c0.236,0.094,0.405,0.097,0.661-0.01c0.254-0.106,0.476-0.391,0.476-0.576C16.842,15.303,16.595,15.311,16.539,15.484zM16.222,14.909c0.163-0.144,0.2-0.44,0.044-0.597s-0.473-0.133-0.597,0.043c-0.144,0.206-0.067,0.363,0.036,0.53C15.865,15.009,16.08,15.034,16.222,14.909z",
    githubalt : "M23.356,17.485c-0.004,0.007-0.007,0.013-0.01,0.021l0.162,0.005c0.107,0.004,0.218,0.01,0.33,0.016c-0.046-0.004-0.09-0.009-0.136-0.013L23.356,17.485zM15.5,1.249C7.629,1.25,1.25,7.629,1.249,15.5C1.25,23.371,7.629,29.75,15.5,29.751c7.871-0.001,14.25-6.38,14.251-14.251C29.75,7.629,23.371,1.25,15.5,1.249zM3.771,17.093c0.849-0.092,1.833-0.148,2.791-0.156c0.262,0,0.507-0.006,0.717-0.012c0.063,0.213,0.136,0.419,0.219,0.613H7.492c-0.918,0.031-2.047,0.152-3.134,0.335c-0.138,0.023-0.288,0.051-0.441,0.08C3.857,17.67,3.81,17.383,3.771,17.093zM12.196,22.224c-0.1,0.028-0.224,0.07-0.357,0.117c-0.479,0.169-0.665,0.206-1.15,0.206c-0.502,0.015-0.621-0.019-0.921-0.17C9.33,22.171,8.923,21.8,8.651,21.353c-0.453-0.746-1.236-1.275-1.889-1.275c-0.559,0-0.664,0.227-0.261,0.557c0.608,0.496,1.062,0.998,1.248,1.385c0.105,0.215,0.266,0.546,0.358,0.744c0.099,0.206,0.311,0.474,0.511,0.676c0.472,0.441,0.928,0.659,1.608,0.772c0.455,0.06,0.567,0.06,1.105-0.004c0.26-0.03,0.479-0.067,0.675-0.118v0.771c0,1.049-0.008,1.628-0.031,1.945c-1.852-0.576-3.507-1.595-4.848-2.934c-1.576-1.578-2.706-3.592-3.195-5.848c0.952-0.176,2.073-0.32,3.373-0.43l0.208-0.018c0.398,0.925,1.011,1.631,1.876,2.179c0.53,0.337,1.38,0.685,1.808,0.733c0.118,0.02,0.46,0.09,0.76,0.16c0.302,0.066,0.89,0.172,1.309,0.236h0.009c-0.007,0.018-0.014,0.02-0.022,0.02C12.747,21.169,12.418,21.579,12.196,22.224zM13.732,27.207c-0.168-0.025-0.335-0.056-0.5-0.087c0.024-0.286,0.038-0.785,0.054-1.723c0.028-1.767,0.041-1.94,0.156-2.189c0.069-0.15,0.17-0.32,0.226-0.357c0.095-0.078,0.101,0.076,0.101,2.188C13.769,26.143,13.763,26.786,13.732,27.207zM15.5,27.339c-0.148,0-0.296-0.006-0.443-0.012c0.086-0.562,0.104-1.428,0.106-2.871l0.003-1.82l0.197,0.019l0.199,0.02l0.032,2.365c0.017,1.21,0.027,1.878,0.075,2.296C15.613,27.335,15.558,27.339,15.5,27.339zM17.006,27.24c-0.039-0.485-0.037-1.243-0.027-2.553c0.019-1.866,0.019-1.866,0.131-1.769c0.246,0.246,0.305,0.623,0.305,2.373c0,0.928,0.011,1.497,0.082,1.876C17.334,27.196,17.17,27.22,17.006,27.24zM27.089,17.927c-0.155-0.029-0.307-0.057-0.446-0.08c-0.96-0.162-1.953-0.275-2.804-0.32c1.25,0.108,2.327,0.248,3.246,0.418c-0.479,2.289-1.618,4.33-3.214,5.928c-1.402,1.4-3.15,2.448-5.106,3.008c-0.034-0.335-0.058-1.048-0.066-2.212c-0.03-2.167-0.039-2.263-0.17-2.602c-0.181-0.458-0.47-0.811-0.811-1.055c-0.094-0.057-0.181-0.103-0.301-0.14c0.145-0.02,0.282-0.021,0.427-0.057c1.418-0.188,2.168-0.357,2.772-0.584c1.263-0.492,2.129-1.301,2.606-2.468c0.044-0.103,0.088-0.2,0.123-0.279l0.011,0.001c0.032-0.07,0.057-0.118,0.064-0.125c0.02-0.017,0.036-0.085,0.038-0.151c0-0.037,0.017-0.157,0.041-0.317c0.249,0.01,0.58,0.018,0.938,0.02c0.959,0.008,1.945,0.064,2.794,0.156C27.194,17.356,27.148,17.644,27.089,17.927zM25.823,16.87c-0.697-0.049-1.715-0.064-2.311-0.057c0.02-0.103,0.037-0.218,0.059-0.336c0.083-0.454,0.111-0.912,0.113-1.823c0.002-1.413-0.074-1.801-0.534-2.735c-0.188-0.381-0.399-0.705-0.655-0.998c0.225-0.659,0.207-1.68-0.02-2.575c-0.19-0.734-0.258-0.781-0.924-0.64c-0.563,0.12-1.016,0.283-1.598,0.576c-0.274,0.138-0.652,0.354-0.923,0.522c-0.715-0.251-1.451-0.419-2.242-0.508c-0.799-0.092-2.759-0.04-3.454,0.089c-0.681,0.126-1.293,0.28-1.848,0.462c-0.276-0.171-0.678-0.4-0.964-0.547C9.944,8.008,9.491,7.846,8.925,7.727c-0.664-0.144-0.732-0.095-0.922,0.64c-0.235,0.907-0.237,1.945-0.004,2.603c0.026,0.075,0.043,0.129,0.05,0.17c-0.942,1.187-1.25,2.515-1.046,4.367c0.053,0.482,0.136,0.926,0.251,1.333c-0.602-0.004-1.457,0.018-2.074,0.057c-0.454,0.031-0.957,0.076-1.418,0.129c-0.063-0.5-0.101-1.008-0.101-1.524c0-3.273,1.323-6.225,3.468-8.372c2.146-2.144,5.099-3.467,8.371-3.467c3.273,0,6.226,1.323,8.371,3.467c2.145,2.147,3.468,5.099,3.468,8.372c0,0.508-0.036,1.008-0.098,1.499C26.78,16.946,26.276,16.899,25.823,16.87z",
    raphael : "M27.777,18.941c0.584-0.881,0.896-1.914,0.896-2.998c0-1.457-0.567-2.826-1.598-3.854l-6.91-6.911l-0.003,0.002c-0.985-0.988-2.35-1.6-3.851-1.6c-1.502,0-2.864,0.612-3.85,1.6H12.46l-6.911,6.911c-1.031,1.029-1.598,2.398-1.598,3.854c0,1.457,0.567,2.826,1.598,3.854l6.231,6.229c0.25,0.281,0.512,0.544,0.789,0.785c1.016,0.961,2.338,1.49,3.743,1.49c1.456,0,2.825-0.565,3.854-1.598l6.723-6.725c0.021-0.019,0.034-0.032,0.051-0.051l0.14-0.138c0.26-0.26,0.487-0.54,0.688-0.838c0.004-0.008,0.01-0.015,0.014-0.021L27.777,18.941zM26.658,15.946c0,0.678-0.197,1.326-0.561,1.879c-0.222,0.298-0.447,0.559-0.684,0.784L25.4,18.625c-1.105,1.052-2.354,1.35-3.414,1.35c-0.584,0-1.109-0.09-1.523-0.195c-2.422-0.608-5.056-2.692-6.261-5.732c0.649,0.274,1.362,0.426,2.11,0.426c2.811,0,5.129-2.141,5.415-4.877l3.924,3.925C26.301,14.167,26.658,15.029,26.658,15.946zM16.312,5.6c1.89,0,3.426,1.538,3.426,3.427c0,1.89-1.536,3.427-3.426,3.427c-1.889,0-3.426-1.537-3.426-3.427C12.886,7.138,14.423,5.6,16.312,5.6zM6.974,18.375c-0.649-0.648-1.007-1.512-1.007-2.429c0-0.917,0.357-1.78,1.007-2.428l2.655-2.656c-0.693,2.359-0.991,4.842-0.831,7.221c0.057,0.854,0.175,1.677,0.345,2.46L6.974,18.375zM11.514,11.592c0.583,4.562,4.195,9.066,8.455,10.143c0.693,0.179,1.375,0.265,2.033,0.265c0.01,0,0.02,0,0.027,0l-3.289,3.289c-0.648,0.646-1.512,1.006-2.428,1.006c-0.638,0-1.248-0.177-1.779-0.5l0.001-0.002c-0.209-0.142-0.408-0.295-0.603-0.461c-0.015-0.019-0.031-0.026-0.046-0.043l-0.665-0.664c-1.367-1.567-2.227-3.903-2.412-6.671C10.669,15.856,10.921,13.673,11.514,11.592",
    graphael : "M28.833,15.709c0-1.477-0.574-2.862-1.617-3.904l-7.002-7.001l-0.003,0.002c-1.027-1.03-2.445-1.62-3.9-1.62c-1.455,0-2.871,0.59-3.9,1.621l-0.002-0.002l-7,7C4.376,12.836,3.79,14.25,3.79,15.709s0.586,2.873,1.619,3.902l6.312,6.312c0.253,0.285,0.519,0.556,0.8,0.8c1.049,0.989,2.463,1.534,3.908,1.51c1.417-0.021,2.783-0.604,3.785-1.604l6.812-6.812c0.021-0.021,0.035-0.029,0.062-0.062l0.143-0.146c0.271-0.271,0.484-0.562,0.725-0.86l-0.012-0.002C28.516,17.85,28.833,16.805,28.833,15.709zM18.77,25.17c-1.121,1.119-2.917,1.336-4.271,0.514l0.002-0.002c-0.213-0.145-0.414-0.303-0.61-0.471c-0.016-0.016-7.04-7.041-7.04-7.041c-1.34-1.34-1.342-3.584,0-4.92l7-6.998c1.121-1.121,2.908-1.338,4.259-0.512v0.002c0.213,0.141,0.414,0.299,0.604,0.467c0.021,0.016,7.053,7.043,7.053,7.043c0.396,0.388,0.655,0.852,0.818,1.348l-2.607,0.006c-0.537-3.754-3.769-6.641-7.667-6.641c-4.277,0-7.744,3.468-7.745,7.746c0.001,4.277,3.468,7.744,7.745,7.744c3.917,0,7.156-2.91,7.668-6.688l2.638-0.021c-0.16,0.521-0.441,1.02-0.849,1.412L18.77,25.17zM16.312,16.789c0.002,0,0.002,0,0.004,0l5.476-0.02c-0.5,2.562-2.76,4.518-5.48,4.521c-3.084-0.004-5.578-2.5-5.584-5.582c0.006-3.084,2.5-5.58,5.584-5.584c2.708,0.004,4.959,1.929,5.472,4.484l-5.476,0.018c-0.596,0.002-1.078,0.488-1.076,1.084C15.233,16.308,15.715,16.789,16.312,16.789z",
    svg : "M31.274,15.989c0-2.473-2.005-4.478-4.478-4.478l0,0c0.81-0.811,1.312-1.93,1.312-3.167c0-2.474-2.005-4.479-4.479-4.479c-1.236,0-2.356,0.501-3.167,1.312c0-2.473-2.005-4.478-4.478-4.478c-2.474,0-4.479,2.005-4.479,4.478c-0.811-0.81-1.93-1.312-3.167-1.312c-2.474,0-4.479,2.005-4.479,4.479c0,1.236,0.501,2.356,1.312,3.166c-2.474,0-4.479,2.005-4.479,4.479c0,2.474,2.005,4.479,4.479,4.479c-0.811,0.81-1.312,1.93-1.312,3.167c0,2.473,2.005,4.478,4.479,4.478c1.236,0,2.356-0.501,3.167-1.312c0,2.473,2.005,4.479,4.479,4.479c2.473,0,4.478-2.006,4.478-4.479l0,0c0.811,0.811,1.931,1.312,3.167,1.312c2.474,0,4.478-2.005,4.478-4.478c0-1.237-0.501-2.357-1.312-3.168c0.001,0,0.001,0,0.001,0C29.27,20.467,31.274,18.463,31.274,15.989zM23.583,21.211c0.016,0,0.031-0.001,0.047-0.001c1.339,0,2.424,1.085,2.424,2.425c0,1.338-1.085,2.424-2.424,2.424s-2.424-1.086-2.424-2.424c0-0.017,0.001-0.031,0.001-0.047l-3.541-3.542v5.009c0.457,0.44,0.743,1.06,0.743,1.746c0,1.339-1.086,2.424-2.424,2.424c-1.339,0-2.425-1.085-2.425-2.424c0-0.687,0.286-1.306,0.743-1.746v-5.009l-3.541,3.542c0,0.016,0.001,0.031,0.001,0.047c0,1.338-1.085,2.424-2.424,2.424s-2.424-1.086-2.424-2.424c0-1.34,1.085-2.425,2.424-2.425c0.015,0,0.031,0.001,0.046,0.001l3.542-3.541H6.919c-0.44,0.458-1.06,0.743-1.746,0.743c-1.339,0-2.424-1.085-2.424-2.424s1.085-2.424,2.424-2.424c0.686,0,1.305,0.285,1.746,0.744h5.008l-3.542-3.542c-0.015,0-0.031,0.001-0.046,0.001c-1.339,0-2.424-1.085-2.424-2.424S7.001,5.92,8.34,5.92s2.424,1.085,2.424,2.424c0,0.015-0.001,0.031-0.001,0.046l3.541,3.542V6.924c-0.457-0.441-0.743-1.06-0.743-1.746c0-1.339,1.086-2.425,2.425-2.425c1.338,0,2.424,1.085,2.424,2.425c0,0.686-0.286,1.305-0.743,1.746v5.008l3.541-3.542c0-0.015-0.001-0.031-0.001-0.046c0-1.339,1.085-2.424,2.424-2.424s2.424,1.085,2.424,2.424c0,1.339-1.085,2.424-2.424,2.424c-0.016,0-0.031-0.001-0.047-0.001l-3.541,3.542h5.008c0.441-0.458,1.061-0.744,1.747-0.744c1.338,0,2.423,1.085,2.423,2.424s-1.085,2.424-2.423,2.424c-0.687,0-1.306-0.285-1.747-0.743h-5.008L23.583,21.211z",
    usb : "M15.5,1.667L13.745,4.74h1.252v15.709L11.8,17.391c-0.205-0.26-0.351-0.601-0.358-0.952c0-1.417-0.001-2.258-0.001-2.568c0.592-0.21,1.02-0.774,1.02-1.444c0-0.849-0.682-1.538-1.521-1.538c-0.84,0-1.521,0.689-1.521,1.538c0,0.67,0.427,1.234,1.019,1.444l-0.001,2.539c0,0.688,0.373,1.409,0.812,1.868c-0.013-0.013-0.027-0.025,0,0c0.011,0.01,3.392,3.245,3.392,3.245c0.205,0.26,0.35,0.6,0.357,0.951v1.776c-1.161,0.236-2.036,1.272-2.036,2.517c0,1.418,1.137,2.566,2.539,2.566c1.403,0,2.54-1.148,2.54-2.566c0-1.244-0.875-2.28-2.038-2.517v-1.746c0-0.005,0-0.009,0-0.014v-3.861c0.008-0.35,0.152-0.689,0.358-0.949c0,0,3.38-3.234,3.392-3.245c0.027-0.026,0.012-0.013,0,0c0.438-0.459,0.811-1.181,0.811-1.869V10.12h1.02V7.046h-3.041v3.075h1.018c0,0-0.002,0.644-0.002,2.476c-0.008,0.351-0.152,0.692-0.357,0.952l-3.198,3.06V4.74h1.254L15.5,1.667z",
    ethernet : "M22.5,8.5v3.168l3.832,3.832L22.5,19.332V22.5l7-7L22.5,8.5zM8.5,22.5v-3.168L4.667,15.5L8.5,11.668V8.5l-7,7L8.5,22.5zM15.5,14.101c-0.928,0-1.68,0.751-1.68,1.68c0,0.927,0.752,1.681,1.68,1.681c0.927,0,1.68-0.754,1.68-1.681C17.18,14.852,16.427,14.101,15.5,14.101zM10.46,14.101c-0.928,0-1.68,0.751-1.68,1.68c0,0.927,0.752,1.681,1.68,1.681s1.68-0.754,1.68-1.681C12.14,14.852,11.388,14.101,10.46,14.101zM20.541,14.101c-0.928,0-1.682,0.751-1.682,1.68c0,0.927,0.754,1.681,1.682,1.681s1.68-0.754,1.68-1.681C22.221,14.852,21.469,14.101,20.541,14.101z",
    js : "M1,1v30h30V1H1zM17.326,24.398c0,2.92-1.712,4.248-4.209,4.248c-2.255,0-3.564-1.168-4.229-2.576l0,0l0,0l0,0l2.296-1.391c0.443,0.777,0.846,1.442,1.812,1.442c0.926,0,1.511-0.354,1.511-1.771V14.77h2.819V24.398zM23.992,28.646c-2.618,0-4.311-1.248-5.135-2.879l2.295-1.328c0.604,0.979,1.39,1.711,2.779,1.711c1.168,0,1.904-0.584,1.904-1.396c0-0.966-0.766-1.311-2.054-1.865L23.08,22.58c-2.034-0.865-3.383-1.953-3.383-4.249c0-2.114,1.604-3.726,4.128-3.726c1.792,0,3.081,0.625,4.008,2.254l-2.19,1.406c-0.479-0.861-1.006-1.209-1.812-1.209c-0.825,0-1.353,0.521-1.353,1.209c0,0.852,0.521,1.188,1.729,1.711l0.704,0.309c2.396,1.021,3.746,2.07,3.746,4.43C28.664,27.259,26.671,28.646,23.992,28.646z",
    dribbble : "M16,1.667C8.084,1.667,1.667,8.084,1.667,16S8.084,30.333,16,30.333S30.333,23.916,30.333,16S23.916,1.667,16,1.667zM25.534,8.232c1.7,2.084,2.731,4.732,2.767,7.618c-3.232-0.656-6.14-0.783-8.777-0.38c-0.362-0.825-0.738-1.631-1.125-2.412C22.43,11.542,24.497,9.781,25.534,8.232zM23.955,6.624c-0.877,1.658-3.191,3.232-6.564,4.476c-1.533-2.86-3.115-5.299-4.388-7.033c0.96-0.241,1.964-0.37,2.997-0.37C19.031,3.696,21.809,4.8,23.955,6.624zM10.846,4.831c1.09,1.441,2.751,3.91,4.415,6.967c-3.687,1.073-8.032,1.677-11.282,1.585C4.806,9.581,7.395,6.431,10.846,4.831zM3.696,16c0-0.147,0.006-0.293,0.011-0.439c0.312,0.013,0.632,0.019,0.96,0.019c3.464,0,7.754-0.646,11.484-1.765c0.048-0.015,0.093-0.029,0.14-0.044c0.354,0.704,0.697,1.431,1.033,2.175c-0.516,0.146-1.022,0.314-1.518,0.507c-3.547,1.375-6.512,3.895-9.031,7.678C4.861,21.96,3.696,19.114,3.696,16zM8.388,25.656c2.31-3.574,5.002-5.924,8.209-7.167c0.516-0.2,1.049-0.369,1.594-0.513c1.205,2.996,2.166,6.205,2.559,9.373c-1.462,0.613-3.066,0.953-4.749,0.953C13.128,28.305,10.484,27.312,8.388,25.656zM22.802,26.246c-0.446-2.939-1.321-5.895-2.413-8.686c2.316-0.279,4.881-0.117,7.742,0.485C27.557,21.46,25.574,24.398,22.802,26.246z",
    "500px" : "M24.902,13.033c-2.57,0-4.65,2.998-4.65,2.998s-2.141-2.998-4.772-2.998c-2.63,0-3.793,2.691-3.793,2.691s-1.04-2.141-3.365-2.141c-2.095,0-2.351,0.842-2.381,1.009l0.424-2.783h5.077v-2.08H4.529l-1.392,6.865l2.432,0.049c0,0,0.917-1.346,1.896-1.346s1.958,0.917,1.958,2.264c0,1.348-1.04,2.555-2.019,2.555s-1.958-1.023-1.958-1.76H3v0.308c0,2.08,1.835,3.608,4.344,3.608c2.508,0,4.343-1.896,4.343-2.691c0,0,0.795,2.691,3.916,2.691c3.122,0,4.588-2.691,4.588-2.691s2.142,2.691,4.711,2.691c2.568,0,4.099-2.143,4.099-4.771C29,14.868,27.104,13.033,24.902,13.033zM15.511,19.578c-1.285,0-1.958-1.284-1.958-1.957s0.428-1.958,1.896-1.958c1.469,0,2.998,1.958,2.998,1.958S16.795,19.578,15.511,19.578zM24.779,19.578c-1.285,0-2.938-1.957-2.938-1.957s1.531-1.958,2.998-1.958c1.47,0,1.896,1.285,1.896,1.958S26.064,19.578,24.779,19.578z",
    instagram : "M16,9.904c-3.366,0-6.096,2.729-6.096,6.096c0,3.366,2.729,6.096,6.096,6.096s6.096-2.729,6.096-6.096S19.366,9.904,16,9.904zM16,20.48c-2.475,0-4.48-2.006-4.48-4.48c0-2.474,2.006-4.48,4.48-4.48c2.475,0,4.48,2.006,4.48,4.48C20.48,18.475,18.475,20.48,16,20.48zM24.576,2.321H7.423c-2.848,0-5.156,2.309-5.156,5.157v17.043c0,2.849,2.309,5.155,5.156,5.155h17.153c2.849,0,5.156-2.309,5.156-5.155V7.479C29.732,4.63,27.425,2.321,24.576,2.321zM22.236,5.394c0-0.605,0.49-1.097,1.097-1.097h3.219c0.605,0,1.097,0.491,1.097,1.097v3.219c0,0.605-0.489,1.097-1.097,1.097h-3.219c-0.604,0-1.097-0.491-1.097-1.097V5.394zM28.637,24.521c0,2.237-1.82,4.06-4.061,4.06H7.423c-2.238,0-4.06-1.82-4.06-4.06V10.879H4.19c0.102-0.5,0.544-0.877,1.075-0.877h3.438c0.53,0,0.974,0.377,1.074,0.877h1.498c1.242-1.146,2.9-1.847,4.724-1.847s3.481,0.701,4.724,1.847h7.912v13.643H28.637L28.637,24.521z",
    android : "M6.13,11.126c-0.894,0-1.624,0.731-1.624,1.624v6.496c0,0.895,0.73,1.624,1.624,1.624c0.893,0,1.624-0.729,1.624-1.624V12.75C7.754,11.856,7.023,11.126,6.13,11.126zM19.516,4.96l1.32-2.035c0.074-0.113,0.042-0.264-0.07-0.338c-0.113-0.074-0.266-0.041-0.34,0.072l-1.367,2.106c-0.93-0.36-1.966-0.561-3.059-0.561c-1.094,0-2.13,0.201-3.058,0.561l-1.368-2.106c-0.073-0.113-0.225-0.145-0.338-0.072c-0.113,0.074-0.145,0.225-0.072,0.338l1.321,2.035c-2.186,1.009-3.674,2.928-3.717,5.138h14.464C23.189,7.888,21.702,5.969,19.516,4.96zM12.898,8.062c-0.459,0-0.832-0.373-0.832-0.832s0.373-0.832,0.832-0.832c0.46,0,0.832,0.373,0.832,0.832S13.358,8.062,12.898,8.062zM19.102,8.062c-0.459,0-0.832-0.373-0.832-0.832s0.373-0.832,0.832-0.832s0.832,0.373,0.832,0.832S19.561,8.062,19.102,8.062zM25.87,11.126c-0.894,0-1.624,0.731-1.624,1.624v6.496c0,0.895,0.73,1.624,1.624,1.624s1.624-0.729,1.624-1.624V12.75C27.494,11.856,26.764,11.126,25.87,11.126zM8.756,22.904c0,0.723,0.591,1.312,1.314,1.312h1.363v3.61c0,0.896,0.731,1.624,1.625,1.624c0.893,0,1.624-0.729,1.624-1.624v-3.611h2.636v3.61c0,0.896,0.729,1.624,1.625,1.624c0.894,0,1.623-0.729,1.623-1.624v-3.61h1.363c0.723,0,1.312-0.591,1.312-1.312V11.07H8.756V22.904z",
    iOS : "M4.065,21.797h2.236v-8.784H4.065V21.797zM5.184,9.352c-0.739,0-1.245,0.523-1.245,1.208c0,0.667,0.487,1.19,1.227,1.19c0.775,0,1.263-0.523,1.263-1.19C6.41,9.875,5.941,9.352,5.184,9.352zM13.915,9.442c-3.427,0-5.771,2.633-5.771,6.367c0,3.571,2.164,6.186,5.591,6.186c3.355,0,5.826-2.326,5.826-6.402C19.561,12.13,17.468,9.442,13.915,9.442zM13.86,20.21c-2.128,0-3.373-1.966-3.373-4.437c0-2.507,1.172-4.545,3.373-4.545c2.218,0,3.354,2.164,3.354,4.455C17.215,18.227,16.007,20.21,13.86,20.21zM25.695,14.727c-1.622-0.631-2.326-1.064-2.326-2.002c0-0.703,0.613-1.461,2.021-1.461c1.137,0,1.979,0.343,2.416,0.577l0.541-1.785c-0.643-0.325-1.604-0.613-2.933-0.613c-2.633,0-4.293,1.515-4.293,3.499c0,1.75,1.278,2.813,3.282,3.535c1.552,0.559,2.162,1.1,2.162,2.02c0,0.992-0.797,1.659-2.227,1.659c-1.137,0-2.219-0.36-2.938-0.775l-0.484,1.84c0.668,0.396,2.002,0.758,3.28,0.758c3.14,0,4.616-1.688,4.616-3.644C28.835,16.585,27.807,15.521,25.695,14.727z",
    hp : "M29.936,14.968c-0.178-2.385-0.967-4.726-2.301-6.714c-1.307-1.954-3.107-3.585-5.203-4.657c-1.617-0.853-3.414-1.353-5.229-1.514c-0.412-0.087-0.824,0.006-1.238,0.009c-0.981,2.81-2,5.606-2.989,8.413c0.72,0.013,1.439-0.011,2.158,0.011c0.525,0.021,1.076,0.241,1.366,0.701c0.333,0.519,0.312,1.185,0.104,1.748c-0.978,2.751-1.958,5.5-2.938,8.253c-0.863,0.013-1.727-0.001-2.59,0.007c-0.121-0.002-0.245,0.012-0.36-0.033c1.096-3.021,2.167-6.06,3.249-9.083c-0.516-0.008-1.031,0.003-1.546-0.006c-0.08,0.165-0.136,0.339-0.195,0.513C11.23,15.41,10.227,18.204,9.237,21c-0.047,0.066-0.035,0.229-0.147,0.229c-0.822,0.004-1.645-0.004-2.467,0.002c-0.148-0.002-0.299,0.021-0.443-0.021c2.255-6.256,4.46-12.532,6.716-18.789c-4.407,0.943-8.2,4.242-9.838,8.431c-0.672,1.659-0.965,3.45-1.002,5.233c0.046,0.854,0.106,1.715,0.273,2.562c0.53,2.812,1.964,5.438,4.028,7.408c1.713,1.655,3.863,2.854,6.17,3.452c2.247-6.276,4.479-12.562,6.717-18.851c0.021-0.045,0.064-0.137,0.09-0.183c1.381,0.014,2.766,0.002,4.146,0.006c0.453,0.008,0.918-0.042,1.354,0.095c0.506,0.137,0.979,0.502,1.141,1.018c0.109,0.407,0.029,0.841-0.105,1.229c-0.887,2.574-1.812,5.125-2.729,7.695c-0.229,0.67-0.904,1.09-1.599,1.107c-1.076,0.021-2.147-0.012-3.229,0.014c-0.983,2.762-1.962,5.521-2.945,8.272c0.256,0.104,0.528,0.021,0.794,0.036c0.399,0.027,0.802-0.043,1.198-0.065c2.625-0.239,5.173-1.26,7.242-2.885c1.664-1.304,3.024-2.979,3.953-4.875c0.812-1.64,1.269-3.438,1.396-5.244C29.889,16.234,29.906,15.599,29.936,14.968zM20.422,20.031c0.916-2.659,1.889-5.297,2.818-7.951c-0.398-0.008-0.799,0.002-1.197-0.005c-0.115,0.017-0.268-0.042-0.354,0.055c-0.943,2.636-1.879,5.276-2.822,7.912C19.385,20.045,19.906,20.066,20.422,20.031z",
    gplus : "M9.208,22.73c-0.292-0.396-0.552-0.795-0.779-1.23c-0.267-0.423-0.399-0.934-0.399-1.527c0-0.354,0.05-0.654,0.152-0.893c0.089-0.251,0.171-0.482,0.248-0.693c-0.459,0.053-0.893,0.078-1.3,0.078c-1.927-0.023-3.444-0.568-4.55-1.636v7.21c0.989-0.453,2.013-0.771,3.073-0.955C7.078,22.874,8.264,22.756,9.208,22.73zM10.311,23.872c-0.257-0.026-0.56-0.039-0.908-0.039c-0.207-0.026-0.734,0-1.584,0.079c-0.837,0.117-1.693,0.309-2.568,0.57c-0.206,0.08-0.496,0.197-0.869,0.354c-0.374,0.171-0.753,0.414-1.139,0.729c-0.247,0.229-0.468,0.479-0.664,0.771v1.104c0,1.026,0.838,1.865,1.869,1.865h10.188c0-0.021,0.002-0.051,0.002-0.068c0-1.021-0.335-1.922-1.004-2.688C12.924,25.812,11.817,24.925,10.311,23.872zM6.751,16.594c0.656,0.514,1.404,0.771,2.247,0.771c1.065-0.039,1.952-0.422,2.662-1.146c0.342-0.514,0.562-1.041,0.66-1.581c0.059-0.54,0.088-0.995,0.088-1.364c0-1.594-0.408-3.202-1.224-4.822c-0.382-0.777-0.886-1.41-1.51-1.897C9.037,6.094,8.304,5.85,7.476,5.824C6.38,5.848,5.468,6.289,4.742,7.146C4.129,8.042,3.837,9.043,3.863,10.15c0,1.463,0.428,2.985,1.284,4.566C5.562,15.453,6.097,16.079,6.751,16.594zM27.553,2.707H4.447c-1.031,0-1.869,0.838-1.869,1.869v2.507c0.118-0.125,0.24-0.25,0.367-0.372c1.15-0.947,2.345-1.565,3.584-1.855c1.227-0.25,2.376-0.375,3.45-0.375h8.087l-2.5,1.458h-2.494c0.254,0.158,0.54,0.388,0.857,0.69c0.304,0.315,0.603,0.703,0.895,1.164c0.279,0.434,0.527,0.946,0.743,1.538c0.177,0.592,0.267,1.282,0.267,2.071c-0.024,1.447-0.343,2.604-0.958,3.472c-0.302,0.421-0.621,0.809-0.958,1.164c-0.374,0.354-0.771,0.718-1.193,1.085c-0.241,0.25-0.464,0.533-0.669,0.848c-0.241,0.329-0.361,0.711-0.361,1.146c0,0.421,0.124,0.769,0.371,1.046c0.21,0.264,0.414,0.493,0.612,0.688l1.372,1.125c0.853,0.688,1.6,1.467,2.243,2.31c0.604,0.854,0.921,1.972,0.943,3.354c0,0.562-0.071,1.106-0.223,1.646H27.54c1.03,0,1.869-0.838,1.869-1.87V4.576C29.422,3.545,28.584,2.707,27.553,2.707zM29.023,10.953h-4.244v4.244h-2.057v-4.244H18.48V8.897h4.242V4.654h2.057v4.243h4.244V10.953z",
    facebook : "M25.566,2.433H6.433c-2.2,0-4,1.8-4,4v19.135c0,2.199,1.8,4,4,4h19.135c2.199,0,4-1.801,4-4V6.433C29.566,4.232,27.768,2.433,25.566,2.433zM25.309,16.916h-3.218v11.65h-4.819v-11.65h-2.409V12.9h2.409v-2.411c0-3.275,1.359-5.224,5.229-5.224h3.218v4.016h-2.011c-1.504,0-1.604,0.562-1.604,1.608L22.091,12.9h3.644L25.309,16.916z",
    fitocracy : "M16,10.001c1.93,0,3.5-1.57,3.5-3.5C19.5,4.57,17.93,3,16,3c-1.93,0-3.5,1.57-3.5,3.501C12.5,8.431,14.07,10.001,16,10.001zM23.884,7.772c0,0-2.067-1.923-2.521-0.05c-0.59,2.442-2.745,4.279-5.363,4.279s-4.774-1.837-5.364-4.279c-0.452-1.873-2.52,0.05-2.52,0.05c-2.569,2.213-4.199,5.486-4.199,9.145C3.917,23.59,9.326,29,16,29s12.083-5.41,12.083-12.083C28.083,13.259,26.453,9.986,23.884,7.772zM14.96,16.274l0.807-1.635l0.807,1.635l1.805,0.263l-1.306,1.271l0.309,1.797l-1.614-0.854l-1.614,0.854l0.309-1.797l-1.306-1.271L14.96,16.274zM7.838,21.912c-0.896-1.457-1.421-3.164-1.421-4.995c0-1.832,0.525-3.538,1.42-4.995c1.909,0.862,3.247,2.765,3.247,4.995C11.084,19.146,9.746,21.05,7.838,21.912zM16,26.5c-1.832,0-3.538-0.525-4.995-1.421c0.862-1.908,2.765-3.246,4.995-3.246c2.23,0,4.133,1.338,4.995,3.246C19.538,25.975,17.832,26.5,16,26.5zM24.162,21.912c-1.908-0.862-3.246-2.766-3.246-4.995c0-2.23,1.338-4.133,3.247-4.995c0.896,1.457,1.42,3.164,1.42,4.995S25.059,20.455,24.162,21.912z",
    opensource : "M15.5,1.125c-8.222,0-14.911,6.689-14.911,14.911c0,6.262,3.88,11.634,9.362,13.839l3.639-9.076c-1.888-0.758-3.222-2.604-3.222-4.763c0-2.834,2.297-5.132,5.131-5.132s5.131,2.298,5.131,5.132c0,2.157-1.334,4.005-3.222,4.763l3.64,9.076c5.479-2.206,9.361-7.578,9.361-13.839C30.41,7.814,23.721,1.125,15.5,1.125z"
  };

  return new IconFactory;
})
;

define(/**
     @exports TypeDisplayer
     @author Alexandre Masselot
     @author Kiran Mukhyala
     @copyright 2013,  Bioinformatics & Computational Biology Department, Genentech Inc.
     */

    'pviz/views/TypedDisplayer',[], function () {
        /**
         * Features are by default displayed by rectangles with text.
         * However, it is possible to defined more complex information depending on the type.
         * We define here a few default displayers for some types.
         *
         * It is possible of course to extend these displayers in a custom file
         *
         * @class SeqEntryViewport map the sequence scale domain to the dom element
         * @constructor
         */
        var TypeDisplayer = {
            init: function (featureDisplayer) {
                featureDisplayer.setCustomHandler('default', {
                    appender: featureDisplayer.getDefaultAppender(),
                    positioner: featureDisplayer.getDefaultPositioner()
                })
                featureDisplayer.setCustomHandler('helix', {
                    appender: function (viewport, svgGroup, features, type) {
                        var sel = svgGroup.selectAll("g.feature.data." + type).data(features).enter().append("g").attr("class", "feature data " + type);
                        sel.append("rect").attr('class', 'feature tooltip-bg').attr('y',-5);
                        sel.append("path").attr('d', 'M0,0').attr('class', type)
                        return svgGroup.selectAll("g.feature.data." + type);
                    },
                    positioner: function (viewport, d3selection) {
                        var oneOffAdjust = viewport.oneOffFix ? -1 : 0;
                        d3selection.attr('transform', function (ft) {
                            return 'translate(' + viewport.scales.x(ft.start + oneOffAdjust - 0.45) + ',' + viewport.scales.y(0.5 + ft.displayTrack) + ')';
                        });
                        var ftWidth = function (ft) {
                            return viewport.scales.x(ft.end + oneOffAdjust + 0.9) - viewport.scales.x(ft.start + oneOffAdjust + 0.1)
                        }
                        d3selection.selectAll("path.helix").attr('d', function (ft) {
                            //width in pixels
                            var w = viewport.scales.x(ft.end + oneOffAdjust + 0.9) - viewport.scales.x(ft.start + oneOffAdjust + 0.1);
                            //number of waves, should not be larger than 20 px
                            var n = Math.max(1, Math.round(w / 20));
                            // half period
                            var hwStep = w / n / 2;
                            var d = _.times(n, function (i) {
                                return "q" + (hwStep / 2) + ",-10," + hwStep + ",0," + (hwStep / 2) + ",10," + hwStep + ",0"
                            }).join(" ")
                            return "M0,0 " + d
                        })
                        d3selection.selectAll("rect.feature.tooltip-bg").attr('width', ftWidth).attr('height', 10);
                        return d3selection
                    }
                })

                featureDisplayer.setCustomHandler('beta_strand', {
                    appender: function (viewport, svgGroup, features, type) {
                        var sel = svgGroup.selectAll("g.feature.data." + type).data(features).enter().append("g").attr("class", "feature data " + type);
                        sel.append("line").attr('class', type);
                        sel.append("path").attr('class', type).attr('d', "M0,0l-10,-5l0,10l10,-5");

                        return svgGroup.selectAll("g.feature.data." + type);
                    },
                    positioner: function (viewport, d3selection) {
                        var oneOffAdjust = viewport.oneOffFix ? -1 : 0;
                        d3selection.attr('transform', function (ft) {
                            return 'translate(' + viewport.scales.x(ft.start + oneOffAdjust - 0.45) + ',' + viewport.scales.y(0.5 + ft.displayTrack) + ')';
                        });
                        var ftWidth = function (ft) {
                            return viewport.scales.x(ft.end + oneOffAdjust + 0.9) - viewport.scales.x(ft.start + oneOffAdjust + 0.1)
                        }
                        d3selection.selectAll("line.beta_strand").attr('x1', 0).attr('y1', 0).attr('x2', function (ft) {
                            return ftWidth(ft) - 4
                        }).attr('y2', 0)
                        d3selection.selectAll("path.beta_strand").attr('transform', function (ft) {
                            return 'translate(' + ftWidth(ft) + ',0)'
                        });

                        return d3selection
                    }
                })

                featureDisplayer.setCustomHandler('turn', {
                    appender: function (viewport, svgGroup, features, type) {
                        var sel = svgGroup.selectAll("g.feature.data." + type).data(features).enter().append("g").attr("class", "feature data " + type);
                        sel.append("path").attr('class', type).attr('d', "M0,0");
                        return svgGroup.selectAll("g.feature.data." + type);
                    },
                    positioner: function (viewport, d3selection) {
                        var oneOffAdjust = viewport.oneOffFix ? -1 : 0;
                        d3selection.attr('transform', function (ft) {
                            return 'translate(' + viewport.scales.x(ft.start + oneOffAdjust - 0.45) + ',' + viewport.scales.y(0.5 + ft.displayTrack) + ')';
                        });

                        d3selection.selectAll("path.turn").attr('d', function (ft) {
                            var w = viewport.scales.x(ft.end + oneOffAdjust + 0.9) - viewport.scales.x(ft.start + oneOffAdjust + 0.1);
                            return 'M0,3 l' + (w - 10) + ',0 q10,-3,0,-6 l-' + (w - 10) + ',0'
                        })

                        return d3selection
                    }
                });
                featureDisplayer.setCustomHandler('circle', {
                    appender: function (viewport, svgGroup, features, type) {
                        var sel = svgGroup.selectAll("g.feature.data." + type).data(features).enter().append("g").attr("class", "feature data " + type);
                        var g = sel.append("g");
                        g.append('circle');
                        g.append('text').text(function (ft) {
                            return ft.text;
                        })
                        return sel;
                    },
                    positioner: function (viewport, d3selection) {
                        var oneOffAdjust = viewport.oneOffFix ? -1 : 0;
                        d3selection.attr('transform', function (ft) {
                            return 'translate(' + viewport.scales.x(ft.start + oneOffAdjust) + ',' + viewport.scales.y((0.5 + ft.displayTrack) * featureDisplayer.heightFactor(ft.category)) + ')';
                        });
                        d3selection.selectAll("circle").attr('r', function (ft) {
                            return ft.radius
                        });

                        return d3selection
                    }
                });
            }
        };
        return TypeDisplayer;

    });

define(
    /**
     @exports GGPLot2Adapter
     @author Alexandre Masselot
     @author Kiran Mukhyala
     @copyright 2013,  Bioinformatics & Computational Biology Department, Genentech Inc.
     */
    'pviz/utils/GGplot2Adapter',[], function () {
        /**
         *
         *  Propose a series of wrapper for shape, colors to make it ggplot2 friendly
         *  This is a very restrictive set of ported features, but enough to make the pViz plot compatible
         *
         * This product includes color specifications and designs developed by Cynthia Brewer (http://colorbrewer.org/).
         * and copy/paste the javascript implementation by mike Bostock http://bl.ocks.org/mbostock/5577023
         * @return an Object
         */
        return {
            /**
             * list of shapes, bounded by [-0.5,0.5]x[-0.5,0.5]
              */
            shapePaths: {
                1: 'M-0.5,-0.5l1,0l0,1l-1,0l0,-1l1,0',
                square: 'M-0.5,-0.5l1,0l0,1l-1,0l0,-1l1,0',
                2: 'M-0.5,0 A0.5,0.5,0,0,0,0.5,0 A0.5,0.5,0,1,0,-0.5,0',
                3: 'M0,-0.5 L0.5,0.23 L-0.5,0.23 L0,-0.5 L0.5,0.23',
                3: 'M0,-0.5 L0,0.5 M-0.5,0 L0.5,0',
                4: 'M-0.35,-0.35 L0.35,0.35 M-0.35,0.35 L0.35,-0.35',
                5: 'M-0.5,0 L0,-0.5 L0.5,0 L0,0.5 L-0.5,0 L0,-0.5',
                6: 'M0,0.5 L0.5,-0.23 L-0.5,-0.23 L0,0.5 L0.5,-0.23',
                7: 'M0,-0.5 L0,0.5 M-0.5,0 L0.5,0 M-0.35,-0.35 L0.35,0.35 M-0.35,0.35 L0.35,-0.35'

            },
            /**
             * colorbrewer palettes
             */
            discrete_palettes: {
                YlGn: {
                    3: ["#f7fcb9", "#addd8e", "#31a354"],
                    4: ["#ffffcc", "#c2e699", "#78c679", "#238443"],
                    5: ["#ffffcc", "#c2e699", "#78c679", "#31a354", "#006837"],
                    6: ["#ffffcc", "#d9f0a3", "#addd8e", "#78c679", "#31a354", "#006837"],
                    7: ["#ffffcc", "#d9f0a3", "#addd8e", "#78c679", "#41ab5d", "#238443", "#005a32"],
                    8: ["#ffffe5", "#f7fcb9", "#d9f0a3", "#addd8e", "#78c679", "#41ab5d", "#238443", "#005a32"],
                    9: ["#ffffe5", "#f7fcb9", "#d9f0a3", "#addd8e", "#78c679", "#41ab5d", "#238443", "#006837", "#004529"]
                },
                YlGnBu: {
                    3: ["#edf8b1", "#7fcdbb", "#2c7fb8"],
                    4: ["#ffffcc", "#a1dab4", "#41b6c4", "#225ea8"],
                    5: ["#ffffcc", "#a1dab4", "#41b6c4", "#2c7fb8", "#253494"],
                    6: ["#ffffcc", "#c7e9b4", "#7fcdbb", "#41b6c4", "#2c7fb8", "#253494"],
                    7: ["#ffffcc", "#c7e9b4", "#7fcdbb", "#41b6c4", "#1d91c0", "#225ea8", "#0c2c84"],
                    8: ["#ffffd9", "#edf8b1", "#c7e9b4", "#7fcdbb", "#41b6c4", "#1d91c0", "#225ea8", "#0c2c84"],
                    9: ["#ffffd9", "#edf8b1", "#c7e9b4", "#7fcdbb", "#41b6c4", "#1d91c0", "#225ea8", "#253494", "#081d58"]
                },
                GnBu: {
                    3: ["#e0f3db", "#a8ddb5", "#43a2ca"],
                    4: ["#f0f9e8", "#bae4bc", "#7bccc4", "#2b8cbe"],
                    5: ["#f0f9e8", "#bae4bc", "#7bccc4", "#43a2ca", "#0868ac"],
                    6: ["#f0f9e8", "#ccebc5", "#a8ddb5", "#7bccc4", "#43a2ca", "#0868ac"],
                    7: ["#f0f9e8", "#ccebc5", "#a8ddb5", "#7bccc4", "#4eb3d3", "#2b8cbe", "#08589e"],
                    8: ["#f7fcf0", "#e0f3db", "#ccebc5", "#a8ddb5", "#7bccc4", "#4eb3d3", "#2b8cbe", "#08589e"],
                    9: ["#f7fcf0", "#e0f3db", "#ccebc5", "#a8ddb5", "#7bccc4", "#4eb3d3", "#2b8cbe", "#0868ac", "#084081"]
                },
                BuGn: {
                    3: ["#e5f5f9", "#99d8c9", "#2ca25f"],
                    4: ["#edf8fb", "#b2e2e2", "#66c2a4", "#238b45"],
                    5: ["#edf8fb", "#b2e2e2", "#66c2a4", "#2ca25f", "#006d2c"],
                    6: ["#edf8fb", "#ccece6", "#99d8c9", "#66c2a4", "#2ca25f", "#006d2c"],
                    7: ["#edf8fb", "#ccece6", "#99d8c9", "#66c2a4", "#41ae76", "#238b45", "#005824"],
                    8: ["#f7fcfd", "#e5f5f9", "#ccece6", "#99d8c9", "#66c2a4", "#41ae76", "#238b45", "#005824"],
                    9: ["#f7fcfd", "#e5f5f9", "#ccece6", "#99d8c9", "#66c2a4", "#41ae76", "#238b45", "#006d2c", "#00441b"]
                },
                PuBuGn: {
                    3: ["#ece2f0", "#a6bddb", "#1c9099"],
                    4: ["#f6eff7", "#bdc9e1", "#67a9cf", "#02818a"],
                    5: ["#f6eff7", "#bdc9e1", "#67a9cf", "#1c9099", "#016c59"],
                    6: ["#f6eff7", "#d0d1e6", "#a6bddb", "#67a9cf", "#1c9099", "#016c59"],
                    7: ["#f6eff7", "#d0d1e6", "#a6bddb", "#67a9cf", "#3690c0", "#02818a", "#016450"],
                    8: ["#fff7fb", "#ece2f0", "#d0d1e6", "#a6bddb", "#67a9cf", "#3690c0", "#02818a", "#016450"],
                    9: ["#fff7fb", "#ece2f0", "#d0d1e6", "#a6bddb", "#67a9cf", "#3690c0", "#02818a", "#016c59", "#014636"]
                },
                PuBu: {
                    3: ["#ece7f2", "#a6bddb", "#2b8cbe"],
                    4: ["#f1eef6", "#bdc9e1", "#74a9cf", "#0570b0"],
                    5: ["#f1eef6", "#bdc9e1", "#74a9cf", "#2b8cbe", "#045a8d"],
                    6: ["#f1eef6", "#d0d1e6", "#a6bddb", "#74a9cf", "#2b8cbe", "#045a8d"],
                    7: ["#f1eef6", "#d0d1e6", "#a6bddb", "#74a9cf", "#3690c0", "#0570b0", "#034e7b"],
                    8: ["#fff7fb", "#ece7f2", "#d0d1e6", "#a6bddb", "#74a9cf", "#3690c0", "#0570b0", "#034e7b"],
                    9: ["#fff7fb", "#ece7f2", "#d0d1e6", "#a6bddb", "#74a9cf", "#3690c0", "#0570b0", "#045a8d", "#023858"]
                },
                BuPu: {
                    3: ["#e0ecf4", "#9ebcda", "#8856a7"],
                    4: ["#edf8fb", "#b3cde3", "#8c96c6", "#88419d"],
                    5: ["#edf8fb", "#b3cde3", "#8c96c6", "#8856a7", "#810f7c"],
                    6: ["#edf8fb", "#bfd3e6", "#9ebcda", "#8c96c6", "#8856a7", "#810f7c"],
                    7: ["#edf8fb", "#bfd3e6", "#9ebcda", "#8c96c6", "#8c6bb1", "#88419d", "#6e016b"],
                    8: ["#f7fcfd", "#e0ecf4", "#bfd3e6", "#9ebcda", "#8c96c6", "#8c6bb1", "#88419d", "#6e016b"],
                    9: ["#f7fcfd", "#e0ecf4", "#bfd3e6", "#9ebcda", "#8c96c6", "#8c6bb1", "#88419d", "#810f7c", "#4d004b"]
                },
                RdPu: {
                    3: ["#fde0dd", "#fa9fb5", "#c51b8a"],
                    4: ["#feebe2", "#fbb4b9", "#f768a1", "#ae017e"],
                    5: ["#feebe2", "#fbb4b9", "#f768a1", "#c51b8a", "#7a0177"],
                    6: ["#feebe2", "#fcc5c0", "#fa9fb5", "#f768a1", "#c51b8a", "#7a0177"],
                    7: ["#feebe2", "#fcc5c0", "#fa9fb5", "#f768a1", "#dd3497", "#ae017e", "#7a0177"],
                    8: ["#fff7f3", "#fde0dd", "#fcc5c0", "#fa9fb5", "#f768a1", "#dd3497", "#ae017e", "#7a0177"],
                    9: ["#fff7f3", "#fde0dd", "#fcc5c0", "#fa9fb5", "#f768a1", "#dd3497", "#ae017e", "#7a0177", "#49006a"]
                },
                PuRd: {
                    3: ["#e7e1ef", "#c994c7", "#dd1c77"],
                    4: ["#f1eef6", "#d7b5d8", "#df65b0", "#ce1256"],
                    5: ["#f1eef6", "#d7b5d8", "#df65b0", "#dd1c77", "#980043"],
                    6: ["#f1eef6", "#d4b9da", "#c994c7", "#df65b0", "#dd1c77", "#980043"],
                    7: ["#f1eef6", "#d4b9da", "#c994c7", "#df65b0", "#e7298a", "#ce1256", "#91003f"],
                    8: ["#f7f4f9", "#e7e1ef", "#d4b9da", "#c994c7", "#df65b0", "#e7298a", "#ce1256", "#91003f"],
                    9: ["#f7f4f9", "#e7e1ef", "#d4b9da", "#c994c7", "#df65b0", "#e7298a", "#ce1256", "#980043", "#67001f"]
                },
                OrRd: {
                    3: ["#fee8c8", "#fdbb84", "#e34a33"],
                    4: ["#fef0d9", "#fdcc8a", "#fc8d59", "#d7301f"],
                    5: ["#fef0d9", "#fdcc8a", "#fc8d59", "#e34a33", "#b30000"],
                    6: ["#fef0d9", "#fdd49e", "#fdbb84", "#fc8d59", "#e34a33", "#b30000"],
                    7: ["#fef0d9", "#fdd49e", "#fdbb84", "#fc8d59", "#ef6548", "#d7301f", "#990000"],
                    8: ["#fff7ec", "#fee8c8", "#fdd49e", "#fdbb84", "#fc8d59", "#ef6548", "#d7301f", "#990000"],
                    9: ["#fff7ec", "#fee8c8", "#fdd49e", "#fdbb84", "#fc8d59", "#ef6548", "#d7301f", "#b30000", "#7f0000"]
                },
                YlOrRd: {
                    3: ["#ffeda0", "#feb24c", "#f03b20"],
                    4: ["#ffffb2", "#fecc5c", "#fd8d3c", "#e31a1c"],
                    5: ["#ffffb2", "#fecc5c", "#fd8d3c", "#f03b20", "#bd0026"],
                    6: ["#ffffb2", "#fed976", "#feb24c", "#fd8d3c", "#f03b20", "#bd0026"],
                    7: ["#ffffb2", "#fed976", "#feb24c", "#fd8d3c", "#fc4e2a", "#e31a1c", "#b10026"],
                    8: ["#ffffcc", "#ffeda0", "#fed976", "#feb24c", "#fd8d3c", "#fc4e2a", "#e31a1c", "#b10026"],
                    9: ["#ffffcc", "#ffeda0", "#fed976", "#feb24c", "#fd8d3c", "#fc4e2a", "#e31a1c", "#bd0026", "#800026"]
                },
                YlOrBr: {
                    3: ["#fff7bc", "#fec44f", "#d95f0e"],
                    4: ["#ffffd4", "#fed98e", "#fe9929", "#cc4c02"],
                    5: ["#ffffd4", "#fed98e", "#fe9929", "#d95f0e", "#993404"],
                    6: ["#ffffd4", "#fee391", "#fec44f", "#fe9929", "#d95f0e", "#993404"],
                    7: ["#ffffd4", "#fee391", "#fec44f", "#fe9929", "#ec7014", "#cc4c02", "#8c2d04"],
                    8: ["#ffffe5", "#fff7bc", "#fee391", "#fec44f", "#fe9929", "#ec7014", "#cc4c02", "#8c2d04"],
                    9: ["#ffffe5", "#fff7bc", "#fee391", "#fec44f", "#fe9929", "#ec7014", "#cc4c02", "#993404", "#662506"]
                },
                Purples: {
                    3: ["#efedf5", "#bcbddc", "#756bb1"],
                    4: ["#f2f0f7", "#cbc9e2", "#9e9ac8", "#6a51a3"],
                    5: ["#f2f0f7", "#cbc9e2", "#9e9ac8", "#756bb1", "#54278f"],
                    6: ["#f2f0f7", "#dadaeb", "#bcbddc", "#9e9ac8", "#756bb1", "#54278f"],
                    7: ["#f2f0f7", "#dadaeb", "#bcbddc", "#9e9ac8", "#807dba", "#6a51a3", "#4a1486"],
                    8: ["#fcfbfd", "#efedf5", "#dadaeb", "#bcbddc", "#9e9ac8", "#807dba", "#6a51a3", "#4a1486"],
                    9: ["#fcfbfd", "#efedf5", "#dadaeb", "#bcbddc", "#9e9ac8", "#807dba", "#6a51a3", "#54278f", "#3f007d"]
                },
                Blues: {
                    3: ["#deebf7", "#9ecae1", "#3182bd"],
                    4: ["#eff3ff", "#bdd7e7", "#6baed6", "#2171b5"],
                    5: ["#eff3ff", "#bdd7e7", "#6baed6", "#3182bd", "#08519c"],
                    6: ["#eff3ff", "#c6dbef", "#9ecae1", "#6baed6", "#3182bd", "#08519c"],
                    7: ["#eff3ff", "#c6dbef", "#9ecae1", "#6baed6", "#4292c6", "#2171b5", "#084594"],
                    8: ["#f7fbff", "#deebf7", "#c6dbef", "#9ecae1", "#6baed6", "#4292c6", "#2171b5", "#084594"],
                    9: ["#f7fbff", "#deebf7", "#c6dbef", "#9ecae1", "#6baed6", "#4292c6", "#2171b5", "#08519c", "#08306b"]
                },
                Greens: {
                    3: ["#e5f5e0", "#a1d99b", "#31a354"],
                    4: ["#edf8e9", "#bae4b3", "#74c476", "#238b45"],
                    5: ["#edf8e9", "#bae4b3", "#74c476", "#31a354", "#006d2c"],
                    6: ["#edf8e9", "#c7e9c0", "#a1d99b", "#74c476", "#31a354", "#006d2c"],
                    7: ["#edf8e9", "#c7e9c0", "#a1d99b", "#74c476", "#41ab5d", "#238b45", "#005a32"],
                    8: ["#f7fcf5", "#e5f5e0", "#c7e9c0", "#a1d99b", "#74c476", "#41ab5d", "#238b45", "#005a32"],
                    9: ["#f7fcf5", "#e5f5e0", "#c7e9c0", "#a1d99b", "#74c476", "#41ab5d", "#238b45", "#006d2c", "#00441b"]
                },
                Oranges: {
                    3: ["#fee6ce", "#fdae6b", "#e6550d"],
                    4: ["#feedde", "#fdbe85", "#fd8d3c", "#d94701"],
                    5: ["#feedde", "#fdbe85", "#fd8d3c", "#e6550d", "#a63603"],
                    6: ["#feedde", "#fdd0a2", "#fdae6b", "#fd8d3c", "#e6550d", "#a63603"],
                    7: ["#feedde", "#fdd0a2", "#fdae6b", "#fd8d3c", "#f16913", "#d94801", "#8c2d04"],
                    8: ["#fff5eb", "#fee6ce", "#fdd0a2", "#fdae6b", "#fd8d3c", "#f16913", "#d94801", "#8c2d04"],
                    9: ["#fff5eb", "#fee6ce", "#fdd0a2", "#fdae6b", "#fd8d3c", "#f16913", "#d94801", "#a63603", "#7f2704"]
                },
                Reds: {
                    3: ["#fee0d2", "#fc9272", "#de2d26"],
                    4: ["#fee5d9", "#fcae91", "#fb6a4a", "#cb181d"],
                    5: ["#fee5d9", "#fcae91", "#fb6a4a", "#de2d26", "#a50f15"],
                    6: ["#fee5d9", "#fcbba1", "#fc9272", "#fb6a4a", "#de2d26", "#a50f15"],
                    7: ["#fee5d9", "#fcbba1", "#fc9272", "#fb6a4a", "#ef3b2c", "#cb181d", "#99000d"],
                    8: ["#fff5f0", "#fee0d2", "#fcbba1", "#fc9272", "#fb6a4a", "#ef3b2c", "#cb181d", "#99000d"],
                    9: ["#fff5f0", "#fee0d2", "#fcbba1", "#fc9272", "#fb6a4a", "#ef3b2c", "#cb181d", "#a50f15", "#67000d"]
                },
                Greys: {
                    3: ["#f0f0f0", "#bdbdbd", "#636363"],
                    4: ["#f7f7f7", "#cccccc", "#969696", "#525252"],
                    5: ["#f7f7f7", "#cccccc", "#969696", "#636363", "#252525"],
                    6: ["#f7f7f7", "#d9d9d9", "#bdbdbd", "#969696", "#636363", "#252525"],
                    7: ["#f7f7f7", "#d9d9d9", "#bdbdbd", "#969696", "#737373", "#525252", "#252525"],
                    8: ["#ffffff", "#f0f0f0", "#d9d9d9", "#bdbdbd", "#969696", "#737373", "#525252", "#252525"],
                    9: ["#ffffff", "#f0f0f0", "#d9d9d9", "#bdbdbd", "#969696", "#737373", "#525252", "#252525", "#000000"]
                },
                PuOr: {
                    3: ["#f1a340", "#f7f7f7", "#998ec3"],
                    4: ["#e66101", "#fdb863", "#b2abd2", "#5e3c99"],
                    5: ["#e66101", "#fdb863", "#f7f7f7", "#b2abd2", "#5e3c99"],
                    6: ["#b35806", "#f1a340", "#fee0b6", "#d8daeb", "#998ec3", "#542788"],
                    7: ["#b35806", "#f1a340", "#fee0b6", "#f7f7f7", "#d8daeb", "#998ec3", "#542788"],
                    8: ["#b35806", "#e08214", "#fdb863", "#fee0b6", "#d8daeb", "#b2abd2", "#8073ac", "#542788"],
                    9: ["#b35806", "#e08214", "#fdb863", "#fee0b6", "#f7f7f7", "#d8daeb", "#b2abd2", "#8073ac", "#542788"],
                    10: ["#7f3b08", "#b35806", "#e08214", "#fdb863", "#fee0b6", "#d8daeb", "#b2abd2", "#8073ac", "#542788", "#2d004b"],
                    11: ["#7f3b08", "#b35806", "#e08214", "#fdb863", "#fee0b6", "#f7f7f7", "#d8daeb", "#b2abd2", "#8073ac", "#542788", "#2d004b"]
                },
                BrBG: {
                    3: ["#d8b365", "#f5f5f5", "#5ab4ac"],
                    4: ["#a6611a", "#dfc27d", "#80cdc1", "#018571"],
                    5: ["#a6611a", "#dfc27d", "#f5f5f5", "#80cdc1", "#018571"],
                    6: ["#8c510a", "#d8b365", "#f6e8c3", "#c7eae5", "#5ab4ac", "#01665e"],
                    7: ["#8c510a", "#d8b365", "#f6e8c3", "#f5f5f5", "#c7eae5", "#5ab4ac", "#01665e"],
                    8: ["#8c510a", "#bf812d", "#dfc27d", "#f6e8c3", "#c7eae5", "#80cdc1", "#35978f", "#01665e"],
                    9: ["#8c510a", "#bf812d", "#dfc27d", "#f6e8c3", "#f5f5f5", "#c7eae5", "#80cdc1", "#35978f", "#01665e"],
                    10: ["#543005", "#8c510a", "#bf812d", "#dfc27d", "#f6e8c3", "#c7eae5", "#80cdc1", "#35978f", "#01665e", "#003c30"],
                    11: ["#543005", "#8c510a", "#bf812d", "#dfc27d", "#f6e8c3", "#f5f5f5", "#c7eae5", "#80cdc1", "#35978f", "#01665e", "#003c30"]
                },
                PRGn: {
                    3: ["#af8dc3", "#f7f7f7", "#7fbf7b"],
                    4: ["#7b3294", "#c2a5cf", "#a6dba0", "#008837"],
                    5: ["#7b3294", "#c2a5cf", "#f7f7f7", "#a6dba0", "#008837"],
                    6: ["#762a83", "#af8dc3", "#e7d4e8", "#d9f0d3", "#7fbf7b", "#1b7837"],
                    7: ["#762a83", "#af8dc3", "#e7d4e8", "#f7f7f7", "#d9f0d3", "#7fbf7b", "#1b7837"],
                    8: ["#762a83", "#9970ab", "#c2a5cf", "#e7d4e8", "#d9f0d3", "#a6dba0", "#5aae61", "#1b7837"],
                    9: ["#762a83", "#9970ab", "#c2a5cf", "#e7d4e8", "#f7f7f7", "#d9f0d3", "#a6dba0", "#5aae61", "#1b7837"],
                    10: ["#40004b", "#762a83", "#9970ab", "#c2a5cf", "#e7d4e8", "#d9f0d3", "#a6dba0", "#5aae61", "#1b7837", "#00441b"],
                    11: ["#40004b", "#762a83", "#9970ab", "#c2a5cf", "#e7d4e8", "#f7f7f7", "#d9f0d3", "#a6dba0", "#5aae61", "#1b7837", "#00441b"]
                },
                PiYG: {
                    3: ["#e9a3c9", "#f7f7f7", "#a1d76a"],
                    4: ["#d01c8b", "#f1b6da", "#b8e186", "#4dac26"],
                    5: ["#d01c8b", "#f1b6da", "#f7f7f7", "#b8e186", "#4dac26"],
                    6: ["#c51b7d", "#e9a3c9", "#fde0ef", "#e6f5d0", "#a1d76a", "#4d9221"],
                    7: ["#c51b7d", "#e9a3c9", "#fde0ef", "#f7f7f7", "#e6f5d0", "#a1d76a", "#4d9221"],
                    8: ["#c51b7d", "#de77ae", "#f1b6da", "#fde0ef", "#e6f5d0", "#b8e186", "#7fbc41", "#4d9221"],
                    9: ["#c51b7d", "#de77ae", "#f1b6da", "#fde0ef", "#f7f7f7", "#e6f5d0", "#b8e186", "#7fbc41", "#4d9221"],
                    10: ["#8e0152", "#c51b7d", "#de77ae", "#f1b6da", "#fde0ef", "#e6f5d0", "#b8e186", "#7fbc41", "#4d9221", "#276419"],
                    11: ["#8e0152", "#c51b7d", "#de77ae", "#f1b6da", "#fde0ef", "#f7f7f7", "#e6f5d0", "#b8e186", "#7fbc41", "#4d9221", "#276419"]
                },
                RdBu: {
                    3: ["#ef8a62", "#f7f7f7", "#67a9cf"],
                    4: ["#ca0020", "#f4a582", "#92c5de", "#0571b0"],
                    5: ["#ca0020", "#f4a582", "#f7f7f7", "#92c5de", "#0571b0"],
                    6: ["#b2182b", "#ef8a62", "#fddbc7", "#d1e5f0", "#67a9cf", "#2166ac"],
                    7: ["#b2182b", "#ef8a62", "#fddbc7", "#f7f7f7", "#d1e5f0", "#67a9cf", "#2166ac"],
                    8: ["#b2182b", "#d6604d", "#f4a582", "#fddbc7", "#d1e5f0", "#92c5de", "#4393c3", "#2166ac"],
                    9: ["#b2182b", "#d6604d", "#f4a582", "#fddbc7", "#f7f7f7", "#d1e5f0", "#92c5de", "#4393c3", "#2166ac"],
                    10: ["#67001f", "#b2182b", "#d6604d", "#f4a582", "#fddbc7", "#d1e5f0", "#92c5de", "#4393c3", "#2166ac", "#053061"],
                    11: ["#67001f", "#b2182b", "#d6604d", "#f4a582", "#fddbc7", "#f7f7f7", "#d1e5f0", "#92c5de", "#4393c3", "#2166ac", "#053061"]
                },
                RdGy: {
                    3: ["#ef8a62", "#ffffff", "#999999"],
                    4: ["#ca0020", "#f4a582", "#bababa", "#404040"],
                    5: ["#ca0020", "#f4a582", "#ffffff", "#bababa", "#404040"],
                    6: ["#b2182b", "#ef8a62", "#fddbc7", "#e0e0e0", "#999999", "#4d4d4d"],
                    7: ["#b2182b", "#ef8a62", "#fddbc7", "#ffffff", "#e0e0e0", "#999999", "#4d4d4d"],
                    8: ["#b2182b", "#d6604d", "#f4a582", "#fddbc7", "#e0e0e0", "#bababa", "#878787", "#4d4d4d"],
                    9: ["#b2182b", "#d6604d", "#f4a582", "#fddbc7", "#ffffff", "#e0e0e0", "#bababa", "#878787", "#4d4d4d"],
                    10: ["#67001f", "#b2182b", "#d6604d", "#f4a582", "#fddbc7", "#e0e0e0", "#bababa", "#878787", "#4d4d4d", "#1a1a1a"],
                    11: ["#67001f", "#b2182b", "#d6604d", "#f4a582", "#fddbc7", "#ffffff", "#e0e0e0", "#bababa", "#878787", "#4d4d4d", "#1a1a1a"]
                },
                RdYlBu: {
                    3: ["#fc8d59", "#ffffbf", "#91bfdb"],
                    4: ["#d7191c", "#fdae61", "#abd9e9", "#2c7bb6"],
                    5: ["#d7191c", "#fdae61", "#ffffbf", "#abd9e9", "#2c7bb6"],
                    6: ["#d73027", "#fc8d59", "#fee090", "#e0f3f8", "#91bfdb", "#4575b4"],
                    7: ["#d73027", "#fc8d59", "#fee090", "#ffffbf", "#e0f3f8", "#91bfdb", "#4575b4"],
                    8: ["#d73027", "#f46d43", "#fdae61", "#fee090", "#e0f3f8", "#abd9e9", "#74add1", "#4575b4"],
                    9: ["#d73027", "#f46d43", "#fdae61", "#fee090", "#ffffbf", "#e0f3f8", "#abd9e9", "#74add1", "#4575b4"],
                    10: ["#a50026", "#d73027", "#f46d43", "#fdae61", "#fee090", "#e0f3f8", "#abd9e9", "#74add1", "#4575b4", "#313695"],
                    11: ["#a50026", "#d73027", "#f46d43", "#fdae61", "#fee090", "#ffffbf", "#e0f3f8", "#abd9e9", "#74add1", "#4575b4", "#313695"]
                },
                Spectral: {
                    3: ["#fc8d59", "#ffffbf", "#99d594"],
                    4: ["#d7191c", "#fdae61", "#abdda4", "#2b83ba"],
                    5: ["#d7191c", "#fdae61", "#ffffbf", "#abdda4", "#2b83ba"],
                    6: ["#d53e4f", "#fc8d59", "#fee08b", "#e6f598", "#99d594", "#3288bd"],
                    7: ["#d53e4f", "#fc8d59", "#fee08b", "#ffffbf", "#e6f598", "#99d594", "#3288bd"],
                    8: ["#d53e4f", "#f46d43", "#fdae61", "#fee08b", "#e6f598", "#abdda4", "#66c2a5", "#3288bd"],
                    9: ["#d53e4f", "#f46d43", "#fdae61", "#fee08b", "#ffffbf", "#e6f598", "#abdda4", "#66c2a5", "#3288bd"],
                    10: ["#9e0142", "#d53e4f", "#f46d43", "#fdae61", "#fee08b", "#e6f598", "#abdda4", "#66c2a5", "#3288bd", "#5e4fa2"],
                    11: ["#9e0142", "#d53e4f", "#f46d43", "#fdae61", "#fee08b", "#ffffbf", "#e6f598", "#abdda4", "#66c2a5", "#3288bd", "#5e4fa2"]
                },
                RdYlGn: {
                    3: ["#fc8d59", "#ffffbf", "#91cf60"],
                    4: ["#d7191c", "#fdae61", "#a6d96a", "#1a9641"],
                    5: ["#d7191c", "#fdae61", "#ffffbf", "#a6d96a", "#1a9641"],
                    6: ["#d73027", "#fc8d59", "#fee08b", "#d9ef8b", "#91cf60", "#1a9850"],
                    7: ["#d73027", "#fc8d59", "#fee08b", "#ffffbf", "#d9ef8b", "#91cf60", "#1a9850"],
                    8: ["#d73027", "#f46d43", "#fdae61", "#fee08b", "#d9ef8b", "#a6d96a", "#66bd63", "#1a9850"],
                    9: ["#d73027", "#f46d43", "#fdae61", "#fee08b", "#ffffbf", "#d9ef8b", "#a6d96a", "#66bd63", "#1a9850"],
                    10: ["#a50026", "#d73027", "#f46d43", "#fdae61", "#fee08b", "#d9ef8b", "#a6d96a", "#66bd63", "#1a9850", "#006837"],
                    11: ["#a50026", "#d73027", "#f46d43", "#fdae61", "#fee08b", "#ffffbf", "#d9ef8b", "#a6d96a", "#66bd63", "#1a9850", "#006837"]
                },
                Accent: {
                    3: ["#7fc97f", "#beaed4", "#fdc086"],
                    4: ["#7fc97f", "#beaed4", "#fdc086", "#ffff99"],
                    5: ["#7fc97f", "#beaed4", "#fdc086", "#ffff99", "#386cb0"],
                    6: ["#7fc97f", "#beaed4", "#fdc086", "#ffff99", "#386cb0", "#f0027f"],
                    7: ["#7fc97f", "#beaed4", "#fdc086", "#ffff99", "#386cb0", "#f0027f", "#bf5b17"],
                    8: ["#7fc97f", "#beaed4", "#fdc086", "#ffff99", "#386cb0", "#f0027f", "#bf5b17", "#666666"]
                },
                Dark2: {
                    3: ["#1b9e77", "#d95f02", "#7570b3"],
                    4: ["#1b9e77", "#d95f02", "#7570b3", "#e7298a"],
                    5: ["#1b9e77", "#d95f02", "#7570b3", "#e7298a", "#66a61e"],
                    6: ["#1b9e77", "#d95f02", "#7570b3", "#e7298a", "#66a61e", "#e6ab02"],
                    7: ["#1b9e77", "#d95f02", "#7570b3", "#e7298a", "#66a61e", "#e6ab02", "#a6761d"],
                    8: ["#1b9e77", "#d95f02", "#7570b3", "#e7298a", "#66a61e", "#e6ab02", "#a6761d", "#666666"]
                },
                Paired: {
                    3: ["#a6cee3", "#1f78b4", "#b2df8a"],
                    4: ["#a6cee3", "#1f78b4", "#b2df8a", "#33a02c"],
                    5: ["#a6cee3", "#1f78b4", "#b2df8a", "#33a02c", "#fb9a99"],
                    6: ["#a6cee3", "#1f78b4", "#b2df8a", "#33a02c", "#fb9a99", "#e31a1c"],
                    7: ["#a6cee3", "#1f78b4", "#b2df8a", "#33a02c", "#fb9a99", "#e31a1c", "#fdbf6f"],
                    8: ["#a6cee3", "#1f78b4", "#b2df8a", "#33a02c", "#fb9a99", "#e31a1c", "#fdbf6f", "#ff7f00"],
                    9: ["#a6cee3", "#1f78b4", "#b2df8a", "#33a02c", "#fb9a99", "#e31a1c", "#fdbf6f", "#ff7f00", "#cab2d6"],
                    10: ["#a6cee3", "#1f78b4", "#b2df8a", "#33a02c", "#fb9a99", "#e31a1c", "#fdbf6f", "#ff7f00", "#cab2d6", "#6a3d9a"],
                    11: ["#a6cee3", "#1f78b4", "#b2df8a", "#33a02c", "#fb9a99", "#e31a1c", "#fdbf6f", "#ff7f00", "#cab2d6", "#6a3d9a", "#ffff99"],
                    12: ["#a6cee3", "#1f78b4", "#b2df8a", "#33a02c", "#fb9a99", "#e31a1c", "#fdbf6f", "#ff7f00", "#cab2d6", "#6a3d9a", "#ffff99", "#b15928"]
                },
                Pastel1: {
                    3: ["#fbb4ae", "#b3cde3", "#ccebc5"],
                    4: ["#fbb4ae", "#b3cde3", "#ccebc5", "#decbe4"],
                    5: ["#fbb4ae", "#b3cde3", "#ccebc5", "#decbe4", "#fed9a6"],
                    6: ["#fbb4ae", "#b3cde3", "#ccebc5", "#decbe4", "#fed9a6", "#ffffcc"],
                    7: ["#fbb4ae", "#b3cde3", "#ccebc5", "#decbe4", "#fed9a6", "#ffffcc", "#e5d8bd"],
                    8: ["#fbb4ae", "#b3cde3", "#ccebc5", "#decbe4", "#fed9a6", "#ffffcc", "#e5d8bd", "#fddaec"],
                    9: ["#fbb4ae", "#b3cde3", "#ccebc5", "#decbe4", "#fed9a6", "#ffffcc", "#e5d8bd", "#fddaec", "#f2f2f2"]
                },
                Pastel2: {
                    3: ["#b3e2cd", "#fdcdac", "#cbd5e8"],
                    4: ["#b3e2cd", "#fdcdac", "#cbd5e8", "#f4cae4"],
                    5: ["#b3e2cd", "#fdcdac", "#cbd5e8", "#f4cae4", "#e6f5c9"],
                    6: ["#b3e2cd", "#fdcdac", "#cbd5e8", "#f4cae4", "#e6f5c9", "#fff2ae"],
                    7: ["#b3e2cd", "#fdcdac", "#cbd5e8", "#f4cae4", "#e6f5c9", "#fff2ae", "#f1e2cc"],
                    8: ["#b3e2cd", "#fdcdac", "#cbd5e8", "#f4cae4", "#e6f5c9", "#fff2ae", "#f1e2cc", "#cccccc"]
                },
                Set1: {
                    3: ["#e41a1c", "#377eb8", "#4daf4a"],
                    4: ["#e41a1c", "#377eb8", "#4daf4a", "#984ea3"],
                    5: ["#e41a1c", "#377eb8", "#4daf4a", "#984ea3", "#ff7f00"],
                    6: ["#e41a1c", "#377eb8", "#4daf4a", "#984ea3", "#ff7f00", "#ffff33"],
                    7: ["#e41a1c", "#377eb8", "#4daf4a", "#984ea3", "#ff7f00", "#ffff33", "#a65628"],
                    8: ["#e41a1c", "#377eb8", "#4daf4a", "#984ea3", "#ff7f00", "#ffff33", "#a65628", "#f781bf"],
                    9: ["#e41a1c", "#377eb8", "#4daf4a", "#984ea3", "#ff7f00", "#ffff33", "#a65628", "#f781bf", "#999999"]
                },
                Set2: {
                    3: ["#66c2a5", "#fc8d62", "#8da0cb"],
                    4: ["#66c2a5", "#fc8d62", "#8da0cb", "#e78ac3"],
                    5: ["#66c2a5", "#fc8d62", "#8da0cb", "#e78ac3", "#a6d854"],
                    6: ["#66c2a5", "#fc8d62", "#8da0cb", "#e78ac3", "#a6d854", "#ffd92f"],
                    7: ["#66c2a5", "#fc8d62", "#8da0cb", "#e78ac3", "#a6d854", "#ffd92f", "#e5c494"],
                    8: ["#66c2a5", "#fc8d62", "#8da0cb", "#e78ac3", "#a6d854", "#ffd92f", "#e5c494", "#b3b3b3"]
                },
                Set3: {
                    3: ["#8dd3c7", "#ffffb3", "#bebada"],
                    4: ["#8dd3c7", "#ffffb3", "#bebada", "#fb8072"],
                    5: ["#8dd3c7", "#ffffb3", "#bebada", "#fb8072", "#80b1d3"],
                    6: ["#8dd3c7", "#ffffb3", "#bebada", "#fb8072", "#80b1d3", "#fdb462"],
                    7: ["#8dd3c7", "#ffffb3", "#bebada", "#fb8072", "#80b1d3", "#fdb462", "#b3de69"],
                    8: ["#8dd3c7", "#ffffb3", "#bebada", "#fb8072", "#80b1d3", "#fdb462", "#b3de69", "#fccde5"],
                    9: ["#8dd3c7", "#ffffb3", "#bebada", "#fb8072", "#80b1d3", "#fdb462", "#b3de69", "#fccde5", "#d9d9d9"],
                    10: ["#8dd3c7", "#ffffb3", "#bebada", "#fb8072", "#80b1d3", "#fdb462", "#b3de69", "#fccde5", "#d9d9d9", "#bc80bd"],
                    11: ["#8dd3c7", "#ffffb3", "#bebada", "#fb8072", "#80b1d3", "#fdb462", "#b3de69", "#fccde5", "#d9d9d9", "#bc80bd", "#ccebc5"],
                    12: ["#8dd3c7", "#ffffb3", "#bebada", "#fb8072", "#80b1d3", "#fdb462", "#b3de69", "#fccde5", "#d9d9d9", "#bc80bd", "#ccebc5", "#ffed6f"]
                }
            }
        }

    });
define(
    /**
     @exports FeatureDisplayer
     @author Alexandre Masselot
     @author Kiran Mukhyala
     @author Roman Mylonas
     @copyright 2013,  Bioinformatics & Computational Biology Department, Genentech Inc.
     */

    'pviz/views/FeatureDisplayer',['jquery', 'underscore', 'backbone', 'd3', './TypedDisplayer', '../utils/GGplot2Adapter'], function ($, _, Backbone, d3, typedDisplayer, ggplot2Adapter) {

        /**
         * Display array of features passed as d3selection. It will apply custom or default handler both for creation or positioning based on the PositionFeature type.
         * It will also register the mouse events.
         * A singleton is returned by this define clause.
         *
         * @constructor
         */
        var FeatureDisplayer = function () {
            var self = this;

            self.positioners = {};
            self.appenders = {};
            self.categoryPlots = {};

            self.mouseoverCallBacks = {};
            self.mouseoutCallBacks = {};
            self.clickCallBacks = {};
            self.mousemovementCallBack;

            typedDisplayer.init(self);
            self.trackHeightPerCategoryType = {};
            self.strikeoutCategory = {}

        }
        /**
         * that's the way to register other manner of displaying info than a mere rectangle
         * @param {String} type
         * @param {Map} mFct
         * @param {function} mFct.appender how to crete a new d3 element based on the feature
         * @param {function} mFct.positioner how to position the feature
         * @param {function} mFct.mouseoverCallback mouseover behavior
         * @param {function} mFct.mouseoutCallback
         * @param {function} mFct.clickCallback
         *
         */
        FeatureDisplayer.prototype.setCustomHandler = function (type, mFct) {
            var self = this;
            if (_.isArray(type)) {
                _.each(type, function (t) {
                    self.setCustomHandler(t, mFct)
                })
                return self;
            }
            self.appenders[type] = mFct.appender
            self.positioners[type] = mFct.positioner

            self.addMouseoverCallback(type, mFct.mouseoverCallback)
            self.addMouseoutCallback(type, mFct.mouseoutCallback)
            self.addClickCallback(type, mFct.clickCallback)

            return self
        }

        /**
         * Instead of setCustomHandler, mousevent handler can be added directly
         * @param {String} type  the feature type
         * @param {Function} fct callback function
         * @return {FeatureDisplayer}
         */
        FeatureDisplayer.prototype.addMouseoverCallback = function (type, fct) {
            var self = this;

            if (fct) {
                if (_.isArray(type)) {
                    _.each(type, function (n) {
                        self.addMouseoverCallback(n, fct)
                    })
                    return self;
                }
            }
            self.mouseoverCallBacks[type] = fct;
            return self;
        }
        /**
         * mouseout callback
         * @param {String} type
         * @param {Function} fct
         * @return {FeatureDisplayer}
         */
        FeatureDisplayer.prototype.addMouseoutCallback = function (type, fct) {
            var self = this;

            if (fct) {
                if (_.isArray(type)) {
                    _.each(type, function (n) {
                        self.addMouseoutCallback(n, fct)
                    })
                    return self;
                }
            }
            self.mouseoutCallBacks[type] = fct;
            return self;
        }

        /**
         * click callback
         * @param {String} type
         * @param {Function} fct
         * @return {FeatureDisplayer}
         */
        FeatureDisplayer.prototype.addClickCallback = function (type, fct) {
            var self = this;

            if (fct) {
                if (_.isArray(type)) {
                    _.each(type, function (n) {
                        self.addClickCallback(n, fct)
                    })
                    return self;
                }
            }
            self.clickCallBacks[type] = fct;
            return self;
        }
        /**
         * mousemovement callback
         * @param {String} type
         * @param {Function} fct
         * @return {Array}
         */
        FeatureDisplayer.prototype.setMousemovementCallback = function (fct) {
            var self = this;

            self.mousemovementCallBack = fct;

            return self;
        }


        /**
         * Append a list of features into the svg element. This will call the default or the custom handlers.
         * This function is called by the SeqEntryAnnotInteractiveView
         * @param viewport
         * @param svgGroup
         * @param features
         * @return {*}
         */
        FeatureDisplayer.prototype.append = function (viewport, svgGroup, features) {
            var self = this;

            //add horizontal line if needed for thecategory

            var curCat = _.chain(features).pluck('category').uniq().value()[0];
            if (self.strikeoutCategory[curCat]) {
                var maxTrack = _.chain(features).pluck('displayTrack').max().value();
                var g = svgGroup.append('g').attr('class', 'strikeout');
                var hFactor = self.heightFactor(curCat);

                for (var i = 0; i <= maxTrack; i++) {
                    var y = viewport.scales.y((i + 0.5)) * hFactor;
                    g.append('line').attr('x1', -100).attr('x2', 10000).attr('y1', y).attr('y2', y);
                }
            }

            //append the feature
            _.chain(features).groupBy(function (ft) {
                return ft.type;
            }).each(function (ftGroup, type) {
                var sel = (self.appenders[type] || defaultAppender)(viewport, svgGroup, ftGroup, type)
                self.position(viewport, sel, ftGroup);
            });

            //register call back event handlers
            var allSel = svgGroup.selectAll(".feature.data")
            allSel.on('mouseover', function (ft) {
                self.callMouseoverCallBacks(ft, this);
            });
            allSel.on('mouseout', function (ft) {
                self.callMouseoutCallBacks(ft, this);
            });
            allSel.on('click', function (ft) {
                self.callClickCallBacks(ft, this);
            });
            _.each(self.clickCallBacks, function (cb, type) {
                svgGroup.selectAll(".feature.data."+type).style('cursor', 'pointer');
            });

            // set the mousemovement callback
            Backbone.on("mousemovement", function(coordinates){
                self.callMousemovementCallBack(coordinates, this);
            });

            return allSel
        };

        /**
         * fire the call back (if any is linked to this feature type)
         * @param {PositionFeature} ft feature
         * @param {D3Element} el
         */
        FeatureDisplayer.prototype.callMouseoverCallBacks = function (ft, el) {
            var self = this;
            if (self.mouseoverCallBacks[ft.type] !== undefined) {
                self.mouseoverCallBacks[ft.type](ft, el);
            }
        };

        /**
         * fire the call back (if any is linked to this feature type)
         * @param {PositionFeature} ft feature
         * @param {D3Element} el
         */
        FeatureDisplayer.prototype.callMouseoutCallBacks = function (ft, el) {
            var self = this;
            if (self.mouseoutCallBacks[ft.type] !== undefined) {
                self.mouseoutCallBacks[ft.type](ft, el);
            }
        };
        /**
         * fire the call back (if any is linked to this feature type)
         * @param {PositionFeature} ft feature
         * @param {D3Element} el
         */
        FeatureDisplayer.prototype.callClickCallBacks = function (ft, el) {
            var self = this;
            if (self.clickCallBacks[ft.type] !== undefined) {
                self.clickCallBacks[ft.type](ft, el)
            }
        }
        /**
         * fire the call back (if any is linked to this feature type)
         * @param {PositionFeature} ft feature
         * @param {Array} el
         */
        FeatureDisplayer.prototype.callMousemovementCallBack = function (coordinates, el) {
            var self = this;
            if (self.mousemovementCallBack!== undefined) {
                self.mousemovementCallBack(coordinates, el);
            }
        };
        /**
         * @private
         * @param viewport
         * @param svgGroup
         * @param features
         * @param type
         * @return {*}
         */
        var defaultAppender = function (viewport, svgGroup, features, type) {
            var sel = svgGroup.selectAll("rect.feature.data." + type).data(features).enter().append("g").attr("class", "feature data " + type);
            sel.append("rect").attr('class', 'feature');
            sel.append("rect").attr('class', 'feature-block-end').attr('fill', 'url(#grad_endFTBlock)');

            sel.append("text").attr('y', viewport.scales.y(0.5)).attr('x', 2);

            return sel
        }

        FeatureDisplayer.prototype.getDefaultAppender = function () {
            return defaultAppender;
        }
        FeatureDisplayer.prototype.position = function (viewport, sel) {
            var self = this;

            var ftIsNotPloted = _.filter(sel.data(), function (e) {
                return self.categoryPlots[e.category] === undefined;
            });

            _.chain(ftIsNotPloted).map(function (s) {
                return s.type;
            }).unique().each(function (type) {
                (self.positioners[type] || defaultPositioner)(viewport, sel.filter(function (ft) {
                    return ft.type == type
                }))
            });

            var selPlot = sel.filter(function (ft) {
                return self.categoryPlots[ft.category] !== undefined
            });//
            self.categoryPlotPosition(viewport, selPlot)
            return sel;
        }
        /**
         * return the height factory associated with
         * @return Number
         */
        FeatureDisplayer.prototype.heightFactor = function (o) {
            if (o instanceof Object) {
                return this.heightFactor(o.type || o.name)
            }
            return this.trackHeightPerCategoryType[o] || 1
        }
        /**
         * You can register a catgory to have a strikeout line.
         * The strikeout is at the category level, because all the type below this category are concerned.
         * This feature was add for better visibility in situations where features are sparsed
         * Some people love it...
         *
         * @param {String} category
         */

        FeatureDisplayer.prototype.setStrikeoutCategory = function (category) {
            this.strikeoutCategory[category] = true;
        };

        /**
         * Refresh position, font size ... at init or after zooming
         *
         * @private
         * @param {Object}  viewport
         * @param {Object} d3selection
         */
        // FeatureDisplayer.prototype.position = function(viewport, d3selection) {
        var defaultPositioner = function (viewport, d3selection) {
            var oneOffAdjust = viewport.oneOffFix ? -1 : 0;
            var hFactor = singleton.heightFactor(d3selection['_groups'][0][0].__data__.category);
            // var yscale=singleton.trackHeightFactorPerCategory[]

            d3selection.attr('transform', function (ft) {
                return 'translate(' + viewport.scales.x(ft.start + oneOffAdjust - 0.45) + ',' + hFactor * viewport.scales.y(0.12 + ft.displayTrack) + ')';
            });
            var ftWidth = function (ft) {
                return viewport.scales.x(ft.end + oneOffAdjust + 0.9) - viewport.scales.x(ft.start + oneOffAdjust + 0.1)
            }
            d3selection.selectAll("rect.feature").attr('width', ftWidth).attr('height', hFactor * viewport.scales.y(0.76));
            d3selection.selectAll("rect.feature-block-end").attr('width', 10).attr('x', function (ft) {
                return ftWidth(ft) - 10;
            }).style('display', function (ft) {
                return (ftWidth(ft) > 20) ? null : 'none';
            }).attr('height', viewport.scales.y(hFactor * 0.76));

            var fontSize = 9 * hFactor;
            // self.fontSizeLine();
            var selText = d3selection.selectAll("text");
            selText.text(function (ft) {
                var text = (ft.text !== undefined) ? ft.text : ft.type;
                var w = viewport.scales.x(ft.end + oneOffAdjust + 0.9) - viewport.scales.x(ft.start + oneOffAdjust);
                if (w <= 5 || text.length == 0) {
                    return '';
                }
                var nchar = Math.floor(w / fontSize * 1.6);
                if (nchar >= text.length)
                    return text;
                if (nchar <= 2)
                    return '';
                return text.substr(0, nchar);
            }).style('font-size', fontSize);
            return d3selection
        }
        FeatureDisplayer.prototype.getDefaultPositioner = function () {
            return defaultPositioner;
        }

        /**
         * Within a category, it is possible to display plot type feature (size, height ...)
         * See the test.
         *
         * @param cat: category name
         * @param opts: the plot definitions
         */
        FeatureDisplayer.prototype.setCategoryPlot = function (cat, opts) {
            var _this = this;
            //define default values
            var plot = _.extend({
                height: 100,
                ylim: [-1, 1],
                shape: 1,
                scale: 'linear',
                y: 0,
                shape: 1,
                size: 10,
                fillPalette: 'Paired:12',
                fill: 1,
                colorPalette: 'Paired:12',
                color: 1,
                lwd: 1,
                opacity: 0.7
            }, opts);

            plot._y = d3.scale[plot.scale]().domain(plot.ylim).range([plot.height, 0]);

            var afCol = plot.fillPalette.split(':');
            var fPalette = ggplot2Adapter.discrete_palettes[afCol[0]][afCol[1]];
            plot._fill = _.isFunction(plot.fill) ? (function (ft) {
                var v = plot.fill(ft);
                if (_.isNumber(v) && v > fPalette.length) {
                    return '#444';
                }
                return _.isNumber(v) ? fPalette[v - 1] : v;
            }) : (_.isNumber(plot.fill) ? fPalette[plot.fill - 1] : plot.fill);

            var acCol = plot.colorPalette.split(':');
            var cPalette = ggplot2Adapter.discrete_palettes[acCol[0]][acCol[1]];
            plot._color = _.isFunction(plot.color) ? (function (ft) {
                var v = plot.color(ft);
                if (_.isNumber(v) && v > cPalette.length) {
                    return '#111';
                }
                return _.isNumber(v) ? cPalette[v - 1] : v;
            }) : (_.isNumber(plot.color) ? cPalette[plot.color - 1] : plot.color);

            plot._shape = _.isFunction(plot.shape) ? (function (ft) {
                return ggplot2Adapter.shapePaths[plot.shape(ft)];
            }) : ggplot2Adapter.shapePaths[plot.shape];

            plot._lwd = _.isFunction(plot.lwd) ? (function (ft) {
                return plot.lwd(ft) + 'px';
            }) : plot.lwd + 'px';


            _this.categoryPlots[cat] = plot;

        };

        /**
         * Tells is a given category is to be considered as a 'plot' one
         * @private
         * @param category
         */
        FeatureDisplayer.prototype.isCategoryPlot = function (category) {
            var _this = this;
            return _this.categoryPlots[category] !== undefined;
        };

        FeatureDisplayer.prototype.getCategoryPlot = function (cat) {
            return this.categoryPlots[cat];
        };

        /**
         * @private
         * @param category
         * @param viewport
         * @param svgGroup
         * @param features
         */
        FeatureDisplayer.prototype.categoryPlotAppend = function (category, viewport, svgGroup, features) {
            var _this = this;

            var plot = _this.categoryPlots[category];
            var g = svgGroup.append('g').attr('class', 'plot');
            var sel = svgGroup.selectAll("g._plot-point").data(features).enter().append("g").attr('class', 'feature data _plot-point').attr('category', category);


            sel.style('opacity', plot.opacity);
            var path = sel.append('path').attr('d', plot._shape).style('fill', plot._fill).style('stroke', plot._color).style('stroke-width', plot._lwd).attr('vector-effect', 'non-scaling-stroke');


            _.isFunction(plot.size) ? (function (ft) {
                return ggplot2Adapter.shapePaths[plot.shape](ft);
            }) : ggplot2Adapter.shapePaths[plot.shape];

            _this.categoryPlotPosition(viewport, sel);
            return sel;
        };

        /**
         * @private
         * @param cat
         * @param d3selection
         */
        FeatureDisplayer.prototype.categoryPlotPosition = function (viewport, d3selection) {
            var _this = this;

            d3selection.attr('transform', function (ft) {
                var plot = _this.categoryPlots[ft.category];

                var fty = plot.y;
                var y = _.isFunction(fty) ? fty(ft) : fty;

                ftsize = plot.size;
                var s = _.isFunction(ftsize) ? ftsize(ft) : ftsize;
                return 'translate(' + (viewport.scales.x(ft.pos)) + ',' + plot._y(y) + '),scale(' + s + ')';

            });

        };

        var singleton = new FeatureDisplayer();
        return singleton;
    });

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
    'pviz/views/SeqEntryViewport',['jquery', 'underscore', 'backbone', 'd3'], function ($, _, Backbone, d3) {
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


define(
    /**
     @exports FeatureLayer
     @author Alexandre Masselot
     @author Kiran Mukhyala
     @copyright 2013,  Bioinformatics & Computational Biology Department, Genentech Inc.
     */
    'pviz/models/FeatureLayer',['underscore', 'backbone'], function (_, bb) {

        /**
         * FeatureLayer regroups all the PositionedFeature of a same type
         * @constructor
         * @augments Backbone.Model
         *
         * @param {Map} options
         * @param {String} options.type is only compulsory member
         * @param {boolean} options.visible is the layer to be shown. Default is true
         */
        var FeatureLayer = bb.Model.extend(
            /**
             * @lends module:FeatureLayer~FeatureLayer.prototype
             */
            {
                defaults: {
                    visible: true
                },
                initialize: function (options) {
                },
                /**
                 * The object type, based on the type or name attribute
                 *
                 * @return {String} the type key
                 */
                type: function () {
                    return this.get('type') || this.get('name');
                }
            });
        return FeatureLayer;
    });

define(
    /**
     @exports FeatureLayerView
     @author Alexandre Masselot
     @author Kiran Mukhyala
     @copyright 2013,  Bioinformatics & Computational Biology Department, Genentech Inc.
     */

    'pviz/views/FeatureLayerView',['underscore', 'backbone', 'pviz/services/IconFactory', './FeatureDisplayer'], function (_, bb, iconFactory, featureDisplayer) {
        /**
         * @class  FeatureLayerView handles the view of one feature layer
         * @constructor
         * @param {Map} options
         * @param {String} options.clipper a reference to a svg clip-path
         * @param {d3Element} options.container
         * @param {SeqEntryViewport} options.viewport
         * @param {String} options.layerMenu defines the layerMenu behavior (default is 'sticky', can be 'minimize')
         * @augments Backbone.View
         */
        var FeatureLayerView = bb.View.extend(/** @lends module:FeatureLayerView~FeatureLayerView.prototype */{
            initialize: function (options) {
                var self = this;

                options = options || {}
                self.options = options;

                self.clipper = self.options.clipper;

                _.each(['container', 'viewport'], function (n) {
                    self[n] = self.options[n];
                    delete self.options[n];
                })
                self.options.layerMenu = self.options.layerMenu || 'sticky';


                self.build(options);
            },
            /**
             * build the layer at once
             * @return {FeatureLayerView}
             */
            build: function () {
                var self = this;

                var g = self.container.insert("g").attr("id", self.model.get('id') || self.model.get('.name')).attr('class', 'layer');

                if (self.options.cssClass) {
                    g.classed(self.options.cssClass, true)
                }
                ;
                self.g = g;
                self.gFeatures = g.append('g').attr('clip-path', 'url(' + self.clipper + ')');

                if (self.options.layerMenu && self.options.layerMenu !== 'off') {
                    self.p_build_menu(self.options.layerMenu === 'minimize');
                    if (self.options.categorySeparator && self.gMenu) {
                        self.gMenu
                            .append('g')
                            .attr('class', 'category-separator')
                            .append('line')
                            .attr('x1', self.viewport.scales.x(0))
                            .attr('x2', self.viewport.scales.x(self.viewport.length))
                            .attr('y1', 0)
                            .attr('y2', 0)
                            .attr('class', 'category-separator-line ' + self.options.groupSetName + ' ' + self.options.cssClass);
                    }
                }
                return self;
            },
            /**
             * Builds the layer menu (if any)
             * @private
             * @param isMinimizable
             * @return {FeatureLayerView}
             */
            p_build_menu: function (isMinimizable) {
                var self = this;

                if (self.model.get('name') === 'sequence')
                    return;

                if (isMinimizable) {
                    self.g.append("rect").attr('class', 'layer-background').attr('height', self.viewport.scales.y(self.height()) + 2).attr('width', self.viewport.dim.width)
                }
                var menuWidth = 50;
                self.gMenu = self.g.append("g").attr('class', 'layer-menu').attr('transform', 'translate(0, -13)');

                if (isMinimizable) {
                    rect = self.gMenu.append('rect').attr('height', 25).attr('class', 'layer-background layer-menu-background').attr('rx', 5).attr('ry', 5);
                }
                var t = self.gMenu.append('text').attr('class', 'layer-category').text(self.model.get('name')).attr('y', 2).attr('x', 7);
                var w = t.node().getComputedTextLength();

                if (isMinimizable)
                    rect.attr('width', w + 50);

                self.gMenuButtons = self.gMenu.append("g").attr('class', 'buttons').attr('transform', 'translate(' + (w + 15) + ', -2)');

                if (isMinimizable) {
                    var ic = iconFactory.append(self.gMenuButtons, 'noview', 20);
                    ic.on('mousedown', function () {
                        self.model.set('visible', false);
                    });
                    self.hideMenu();

                    self.g.on('mouseover', function () {
                        self.showMenu()
                    });
                    self.g.on('mouseout', function () {
                        self.hideMenu()
                    });
                }

                return self;
            },
            /**
             * private
             * @return {FeatureLayerView}
             */
            hideMenu: function () {
                this.gMenu.style('display', 'none');
                return this;
            },
            /**
             * private
             * @return {FeatureLayerView}
             */
            showMenu: function () {
                this.gMenu.style('display', null);
                return this;
            },
            /**
             * Get the height of this FeatureLayer
             * @return {Number}
             */
            height: function () {
                var _this = this;
                if (_this.model.get('isPlot')) {
                    return featureDisplayer.getCategoryPlot(this.model.get('category')).height;
                }

                return this.model.get('nbTracks') * featureDisplayer.heightFactor(this.model.attributes);

            }

        });

        return FeatureLayerView;
    });

define(
    /**
     @exports FeatureLayerCollection
     @author Alexandre Masselot
     @author Kiran Mukhyala
     @copyright 2013,  Bioinformatics & Computational Biology Department, Genentech Inc.
     */
    'pviz/collections/FeatureLayerCollection',['backbone', '../models/FeatureLayer'], function (bb, FeatureLayer) {
        /**
         * a collection of FeatureLayer, follows backbone collection mechanisms
         * @constructor
         * @augments Backbone.Collection
         */
        var FeatureLayerCollection = bb.Collection.extend(
            /**
             * @lends module:FeatureLayerCollection~FeatureLayerCollection.prototype
             */
            {
                model: FeatureLayer

            });
        return FeatureLayerCollection;
    });
define(
    /**
     @exports HiddenLayersView
     @author Alexandre Masselot
     @author Kiran Mukhyala
     @copyright 2013,  Bioinformatics & Computational Biology Department, Genentech Inc.
     */
    'pviz/views/HiddenLayersView',['underscore', 'backbone', 'd3', 'pviz/collections/FeatureLayerCollection', 'pviz/services/IconFactory'], function (_, bb, d3, FeatureLayerCollection, iconFactory) {
        /**
         * HiddenLayersView the minimized FeatureLayer.
         * @constructor
         * @param {Map} options
         * @param {d3Element} options.container
         * @augments Backbone.View
         */
        var HiddenLayersView = bb.View.extend(/** @lends module:HiddenLayersView~HiddenLayersView.prototype */{
            initialize: function (options) {
                var self = this;
                self.options = options;

                self.model = new FeatureLayerCollection(options.layers);
                self.model.bind('change', function () {
                    self.render()
                });

                self.container = options.container;

                var g = self.container.append('g').attr('class', 'hidden-layers');
                self.g = g

                var gbuts = g.selectAll('g.one-hidden-layer').data(self.model.models).enter().append('g').attr('class', 'one-hidden-layer').style('display', 'none');

                //function of layer hidden...

                gbuts.append('rect').attr('class', 'button').attr('height', 20).attr('rx', 5).attr('ry', 5);
                gbuts.append('text').text(function (layer) {
                    return layer.get('name')
                }).attr('y', 11).attr('x', 4);

                var gih = gbuts.append('g').attr('class', 'icon-holder');
                gih.each(function () {
                    iconFactory.append(d3.select(this), 'view', 20)
                });
                gbuts.on('mousedown', function (l) {
                    l.set('visible', true);
                })

                self.gbuts = gbuts;
                self.render();
            },

            /**
             * rendering: we push on x the blocks if the button is to be displayed
             */
            render: function () {
                var self = this;
                var xPlus = 33;

                self.gbuts.style('display', function (l) {
                    return l.get('visible') ? 'none' : null;
                });

                var allLength = [];
                self.gbuts.selectAll('text').each(function (d, i) {
                    allLength.push(d3.select(this).node().getComputedTextLength() + xPlus);
                });

                var j = 0
                self.gbuts.selectAll('rect.button').attr('width', function (l) {
                    return allLength[j++] - 4;
                });

                j = 0
                self.gbuts.selectAll('g.icon-holder').attr('transform', function (l) {
                    return 'translate(' + (allLength[j++] - 27) + ',0)';
                })
                var tot = 0;
                self.gbuts.attr('transform', function (l, i) {
                    var r = 'translate(' + tot + ',0)';
                    if (!l.get('visible')) {
                        tot += allLength[i];
                    }
                    return r
                })
            },
            /**
             *
             * @return {number}
             */
            height: function () {
                return 1;
            }
        });
        return HiddenLayersView;
    });


define('text!pviz_templates/details-pane.html',[],function () { return '<div class="details-pane">\n    <div class="" style="width:100%">\n        <div class="nav" style="display:none">\n            <ul class="nav nav-tabs">\n                <li class="pull-right">\n                    <label class="checkbox">\n                        <input type="checkbox" id="raise-active" checked=checked/>\n                        show active pane </label>\n                </li>\n            </ul>\n        </div>\n    </div>\n    <div class="tab-content">\n\n    </div>\n</div>\n';});

define(
    /**
     @exports DetailsPane
     @author Alexandre Masselot
     @author Kiran Mukhyala
     @copyright 2013,  Bioinformatics & Computational Biology Department, Genentech Inc.
     */

    'pviz/views/DetailsPane',['underscore', 'jquery', 'backbone', 'bootstrap', 'text!pviz_templates/details-pane.html'], function (_, $, bb, undefined, tmpl) {
        /**
         * @class DetailsPane is a multi tab container to eventually display details from the highlighted features. It is synchronized with the sequence viewer
         * @constructor
         * @augments Backbone.View
         */
        var DetailsPane = bb.View.extend(
            /**
             * @lends module:DetailsPane~DetailsPane.prototype
             */{
                initialize: function (options) {
                    var self = this;
                    self.options = options;

                    var el = $(self.el);
                    el.empty();
                    el.append($(tmpl));

                    self.containers = {
                        menu: el.find('ul'),
                        tabs: el.find('div.tab-content'),
                        divRaiseActive: el.find('div.nav')
                    }

                    self.templates = {
                        menuItem: '<li><a href="#<%=id%>" data-toggle="tab"><%=name%></a></li>',
                        contents: '<div class="tab-pane" id="<%=id%>"></div>'
                    }

                    self.tabs = {};
                },
                render: function () {
                    var self = this;

                    return self;
                },
                /**
                 * return a jquery element for the tab pointed bby the given name
                 * if no tab exist, a tab + menu are created
                 * the obect return is a map with 'menuItem' and 'contents' elements
                 * @param {String} name
                 */
                getTab: function (name) {
                    var self = this;
                    var tid = self.name2id(name);
                    if (self.tabs[tid] === undefined) {
                        var emi = $(_.template(self.templates.menuItem, {
                            name: name,
                            id: tid
                        }))
                        emi.find('a').click(function (e) {
                            e.preventDefault();
                            $(this).tab('show');
                        })
                        var ec = $(_.template(self.templates.contents, {
                            name: name,
                            id: tid
                        }))

                        self.containers.menu.append(emi);
                        self.containers.tabs.append(ec);

                        self.tabs[tid] = {
                            menuItem: emi,
                            contents: ec
                        };
                        if (_.size(self.tabs) >= 2) {
                            self.containers.divRaiseActive.show();
                        }
                    }
                    return self.tabs[tid];
                },
                /**
                 * raise a tab (make it visible)
                 * @param {element} tab
                 */
                raiseTab: function (tab) {
                    var self = this;
                    tab.menuItem.find('a').tab('show')
                },
                /**
                 * raise the tab if the "raise-active" checkbox is set
                 */
                focusOnTab: function (tab) {
                    var self = this;
                    if (tab.menuItem.hasClass('active')) {
                        return
                    }
                    if ($(self.el).find('input#raise-active').is(':checked')) {
                        self.raiseTab(tab)
                        return
                    }

                    tab.menuItem.animate({
                        opacity: 0.1
                    }, 100, function () {
                        tab.menuItem.animate({
                            opacity: 1.0
                        }, 100)
                    })
                },

                /**
                 * trim, lowercase and convert non character symbols to dash
                 * @private
                 * @param {String} name
                 */
                name2id: function (name) {
                    return name.trim().toLowerCase().replace(/\W+/g, '-');
                }
            });
        return DetailsPane;
    });


define('text!pviz_templates/seq-entry-annot-interactive.html',[],function () { return '<div class=\'seq-entry-annot-interactive\'>\n    <div id=\'feature-viewer\'>\n        \n    </div>\n    <div id=\'details-viewer\'>\n        \n    </div>\n    \n</div>\n';});

define(
    /**
     @exports SeqEntryAnnotInteractiveView
     @author Alexandre Masselot
     @author Kiran Mukhyala
     @copyright 2013,  Bioinformatics & Computational Biology Department, Genentech Inc.
     */

    'pviz/views/SeqEntryAnnotInteractiveView',['jquery', 'underscore', 'backbone', 'd3', 'pviz/services/FeatureManager', './FeatureDisplayer', './SeqEntryViewport', 'pviz/models/FeatureLayer', './FeatureLayerView', './HiddenLayersView', './DetailsPane', 'text!pviz_templates/seq-entry-annot-interactive.html'],
    function ($, _, Backbone, d3, featureManager, featureDisplayer, SeqEntryViewport, FeatureLayer, FeatureLayerView, HiddenLayersView, DetailsPane, tmpl) {
        /**
         * @class SeqEntryAnnotInteractiveView is the main interactive viewer for one SeqEntry
         * @constructor
         * @param {Map} options
         * @param {Number} options.marginLeft inner margin (default=20)
         * @param {Number} options.marginRight (default=20)
         * @param {Number} options.marginTop (default=25)
         * @param {Number} options.paddingCategory padding between categories (default=0)
         * @param {Number} options.paddingGroupSet padding between groupSet and first category (default=0)
         * @param {Function} options.xChangeCallback callback called whenever the x refence is changed (zooming)
         * @param {Function} options.selectCallback callback called whenever a selection is made. Returns all selected features (requires mode = 'select')
         * @param {Function} options.collapseCallback callback called whenever a group set is collapsed/expanded (requires options.collapsible = true)
         * @param {Boolean} options.noPositionBubble
         * @param {Boolean} options.hideAxis hide the position axis (default=false)
         * @param {Boolean} options.hideSequence hide the sequence (defaut=false)
         * @param {Boolean} options.collapsible collapsible groupSets (default=false)
         * @param {Boolean} options.oneOffFix correct one off problem (default=false)
         * @param {Array} options.categoryOrder an array of String specifying the order in which should appear the categories (unspecified one will appear alpha numerically sorted)
         * @param {String} options.layerMenu specify what type of menu is to be set on each category FeatureLayerView (default=sticky)
         * @augments Backbone.View
         */
        var SeqEntryAnnotInteractiveView = Backbone.View.extend(/** @lends module:SeqEntryAnnotInteractiveView~SeqEntryAnnotInteractiveView.prototype */{

            initialize: function (options) {
                var self = this;
                self.options = options;
                self.margins = {
                    left: options.marginLeft || 20,
                    right: options.marginRight || 20,
                    top: options.marginTop || 25
                };
                self.layers = [];
                self.layerViews = [];
                self.hide = {};

                self.paddingCategory = options.paddingCategory || 0;
                self.paddingGroupSet = options.paddingGroupSet || 0;

                self.bubbleSequenceNb = 4;
                self.clipperId = 'clipper_' + Math.round(100000 * Math.random());
                if (self.options.collapsible) {
                    self.collapserSize = 15;
                    var collapserHalfWidth = self.collapserSize / 2.0;
                    var collapserHalfHeight = ((Math.sqrt(3.0) / 2.0) * self.collapserSize) / 2.0;
                    self.collapseTriangle =
                        ''  + (-collapserHalfWidth) + ',' + (-collapserHalfHeight) +
                        ' ' + (0) + ',' + (collapserHalfHeight) +
                        ' ' + (collapserHalfWidth) + ',' + (-collapserHalfHeight);
                    self.collapseCallback = options.collapseCallback;
                }

                $(self.el).empty();
                var el = $(tmpl);
                $(self.el).append(el)

                self.components = {
                    features: el.find('#feature-viewer'),
                    details: el.find('#details-viewer')
                }

                self.svg = d3.select(self.components.features[0]).append("svg").attr("width", '100%').attr("height", '100%').attr('class', 'pviz');
                self.p_setup_defs();

                var rectBg = self.svg.insert("rect").attr("class", 'background').attr('width', '100%').attr('height', '100%');
                self.groupSetBackgroundGroup = self.svg.append('g').attr('class','groupSetBackgroundGroup');

                var xChangeCallbacks = [];
                if (options.xChangeCallback) {
                    xChangeCallbacks.push(options.xChangeCallback);
                }

                /*
                 * add the callback to set the aabubble position and text (if needed)
                 */
                if (!options.noPositionBubble) {
                    xChangeCallbacks.push(function (i0, i1) {
                        var gbubbles = self.svg.selectAll('g.axis-bubble');
                        if (self.viewport.scales.font > 10) {
                            gbubbles.style('display', 'none');
                            self.svg.select('line.sequence-bg').style('display', 'none');
                            return
                        }
                        self.svg.select('line.sequence-bg').style('display', null);

                        var imid = (i0 + i1) / 2;
                        var xscales = self.viewport.scales.x;
                        if (imid < xscales.domain()[0] || imid > xscales.domain()[1]) {
                            gbubbles.style('display', 'none');
                            return;
                        }
                        gbubbles.style('display', null);
                        if (self.gPosBubble) {
                            self.gPosBubble.selectAll('text').text(Math.round(imid + 1));
                        }

                        if (self.gAABubble) {
                            var ic0 = Math.round(imid) - self.bubbleSequenceNb;
                            var ic1 = Math.round(imid) + self.bubbleSequenceNb;
                            var subseq = self.model.get('sequence').substring(ic0, ic1 + 1);

                            var ts = self.gAABubble.selectAll('text.subseq').data(subseq.split(''));
                            ts.exit().remove();
                            ts.enter().append("text").attr('class', 'subseq');
                            ts.text(function (d) {
                                return d;
                            }).attr('x', function (t, i) {
                                var d = Math.abs(i - 4);
                                return (i - self.bubbleSequenceNb) * 10 / (1 + d * 0.1)
                            }).style('font-size', function (t, i) {
                                var d = Math.abs(i - 4);
                                return '' + (120 * (0.2 + 0.2 * (4 - d))) + '%';
                            }).attr('y', -3);
                        }

                        //                  gbubble.selectAll('text.subseq').data(subseq.split(''));
                        gbubbles.attr('transform', 'translate(' + xscales(imid) + ',10)');
                    });

                }
                self.viewport = new SeqEntryViewport({
                    el: self.components.features,
                    svg: self.svg,
                    length: self.model.length(),
                    margins: self.margins,
                    selectCallback: self.options.selectCallback,
                    changeCallback: function (vp) {
                        self.p_positionText(vp, self.svg.selectAll('text.data'));
                        featureDisplayer.position(vp, self.svg.selectAll('g.data'));

                        if (!options.hideAxis)
                            self.updateAxis();
                        // self.p_positionText(vp, self.svg.selectAll('text.data').transition()).duration(1);
                        // featureDisplayer.position(vp, self.svg.selectAll('g.data').transition()).duration(1);
                    },
                    xChangeCallback: xChangeCallbacks,
                    oneOffFix: options.oneOffFix
                });

                self.drawContainer = self.svg.append('g');
                //.attr('transform', 'translate(' + self.margins.left + ',' + self.margins.top + ')');
                self.axisContainer = self.drawContainer.append('g').attr('class', 'axis')
                //var yshiftScale = options.hideAxis ? 0 : 20;

                self.layerContainer = self.drawContainer.append('g').attr('class', 'layers');

                self.detailsPane = new DetailsPane({
                    el: self.components.details
                })

                self.update()
                if (!options.hideAxis)
                    self.updateAxis();

                self.listenTo(self.model, 'change', self.update)
                window.addEventListener('resize', function() {
                    self.resize();
                });

            },
            /**
             * called for window resize: recompute dimensions and refresh the whole view
             */
            resize: function () {
                var self = this;
                // compute new x scale
                var saveXScale = self.viewport.scales.x;
                self.viewport.scales = undefined;
                self.viewport.computeDim();
                self.viewport.setMode(self.viewport.mode);
                self.viewport.scales.x.domain(saveXScale.domain());
                // redraw
                self.viewport.change();
                if (!self.options.hideAxis) {
                    self.updateAxis();
                }
                var xRight = ($(self.el).width() || $(document).width()) - self.margins.right;
                self.clipPath.attr('d', 'M' + (self.margins.left - 15) + ',-100L' + (xRight + 15) + ',-100L' + (xRight + 15) + ',20000L' + (self.margins.left - 15) + ',20000');
                // restore bubble positions
                var gbubbles = self.svg.selectAll('g.axis-bubble');
                gbubbles.each(function(d,i) {
                    var gbubble = d3.select(this);
                    var transform = gbubble.attr('transform');
                    if (transform) {
                        var xTranslate = transform.substring('translate('.length,transform.indexOf(','));
                        var newX = self.viewport.scales.x(saveXScale.invert(parseInt(xTranslate)));
                        gbubble.attr('transform','translate(' + newX + ',10)');
                    }
                });
                // resize brush
                self.viewport.resizeBrush();
                // fix separator lines
                d3.selectAll('.category-separator-line')
                    .attr('x2', self.viewport.scales.x(self.viewport.length));
            },
            /**
             * @private
             */
            updateAxis: function () {
                var self = this;

                var vpXScale = self.viewport.scales.x;
                var scale = d3.scaleLinear().domain([vpXScale.domain()[0] + 1, vpXScale.domain()[1] + 1]).range(vpXScale.range());
                var xAxis = d3.axisBottom(scale).tickSize(6, 5, 5).tickFormat(function (p) {
                    return (p == 0) ? '' : p
                }).ticks(4);
                self.axisContainer.call(xAxis);
                self.gPosBubble = self.axisContainer.append('g').attr('class', 'axis-bubble').style('display', 'none');
                self.gPosBubble.append('rect').attr('x', -30).attr('y', -4).attr('width', 60).attr('height', 17)
                self.gPosBubble.append('text').attr('class', 'pos').attr('y', 6);

            },
            /**
             * refresh the whole view
             */
            update: function () {
                var self = this;
                self.layerContainer.selectAll('g').remove()
                self.svg.select('g.groupset-title').remove()

                self.layers = [];
                self.layerViews = [];
                if (!self.options.hideSequence) {
                    self.p_setup_layer_sequence();
                }

                self.p_setup_layer_features();
                self.p_setup_hidden_layers_container();
                self.p_setup_groupset_titles();
                self.render();

                _.each(self.layers, function (layer) {
                    layer.on('change', function () {
                        self.render();
                    })
                });
            },
            /**
             * render: show the visible layers and pile them up.
             */
            render: function () {
                var self = this;

                var totTracks = 0;
                var totHeight = 0;

                var previousGroupSet = undefined;
                var lastGroupSetY = 0;
                var lastGroupSet;
                var paddingGroupSetAdded = true;
                _.chain(self.layerViews).filter(function (layerViews) {
                    return true;
                }).each(function (view) {
                    if (view.model.get('visible')) {
                        var currentGroupSet = view.model.get('groupSet');
                        if (currentGroupSet != previousGroupSet) {
                            var cgsId = (currentGroupSet || '').replace(/\W/g, '_');
                            var groupSetY = self.viewport.scales.y(totTracks);
                            if (lastGroupSet) {
                                lastGroupSet.attr('height',groupSetY - lastGroupSetY);
                            }
                            totTracks += 2
                            previousGroupSet = currentGroupSet;
                            var yshiftScale = self.options.hideAxis ? -20 : 0;
                            self.gGroupSets.select('text#groupset-title-' + cgsId).attr('y', self.viewport.scales.y(totTracks) + totHeight + yshiftScale)
                            if (self.options.collapsible) {
                                self.gGroupSets.select('polygon#groupset-collapser-' + cgsId).attr('transform', function(d,i) { return 'translate(12, ' + (self.viewport.scales.y(totTracks) + totHeight + yshiftScale - self.collapserSize / 2) + ') rotate(' + (self.groupSetStatuses[d].open ? '0' : '-90') + ')'; })
                            }
                            lastGroupSet = self.groupSetBackgroundGroup.select('g>rect.groupset-background' + (cgsId === '' ? '' : '.A'+cgsId)).attr('y', groupSetY);
                            lastGroupSetY = groupSetY;
                            paddingGroupSetAdded = false;
                        }
                        if (!self.groupSetStatuses || !self.groupSetStatuses[currentGroupSet] || self.groupSetStatuses[currentGroupSet].open) {
                            if (!paddingGroupSetAdded && self.paddingGroupSet) {
                                totTracks += self.paddingGroupSet;
                                paddingGroupSetAdded = true;
                        }
                        var yshift = self.viewport.scales.y(totTracks + 1)
                        view.g.attr("transform", 'translate(' + 0 + ',' + yshift + ")");
                        if (view.model.get('isPlot')) {
                            totHeight += view.height();
                            totTracks += 1 + self.paddingCategory;
                        } else {
                            totTracks += view.height() + 1 + self.paddingCategory;
                        }
                        view.g.style('display', null);
                        }
                        else {
                            view.g.style('display', 'none');
                        }

                    } else {
                        view.g.style('display', 'none');
                    }
                });
                var groupSetY = self.viewport.scales.y(totTracks);
                if (lastGroupSet) {
                    lastGroupSet.attr('height',groupSetY - lastGroupSetY);
                }
                self.hiddenLayers.g.attr("transform", "translate(0," + (self.viewport.scales.y(totTracks + 1) + totHeight + 20) + ")");

                var heightAdd = 0;
                if (!self.options.hideAxis) {
                    heightAdd += 30;
                    self.axisY = self.viewport.scales.y(totTracks) + heightAdd + totHeight;
                    self.axisContainer.attr('transform', 'translate(0, ' + self.axisY + ')');
                }
                if (!self.options.hideSequene) {
                    heightAdd += 25;
                }

                // adapt the height of the svg and the brush area
                var svgTotHeight = self.viewport.scales.y(totTracks) + totHeight + heightAdd;
//                self.viewport.svg.attr('height', svgTotHeight);
                self.svg.attr("height", svgTotHeight);
                self.viewport.initBrush();
            },
            /**
             * define gradients to be used.
             * This should certainly lie elsewhere...
             * @private
             */
            p_setup_defs: function () {
                var self = this;
                var defs = self.svg.append('defs');

                var gr = defs.append('svg:linearGradient').attr('id', 'grad_endFTBlock').attr('x1', 0).attr('y1', 0).attr('x2', '100%').attr('y2', 0);
                gr.append('stop').attr('offset', '0%').style('stop-color', '#fff').style('stop-opacity', 0);
                gr.append('stop').attr('offset', '100%').style('stop-color', '#fff').style('stop-opacity', 0.3);

                var xRight = ($(self.el).width() || $(document).width()) - self.margins.right;
                self.clipPath = defs.append('clipPath').attr('id', self.clipperId).append('path').attr('d', 'M' + (self.margins.left - 15) + ',-100L' + (xRight + 15) + ',-100L' + (xRight + 15) + ',20000L' + (self.margins.left - 15) + ',20000');
            },
            /**
             * build the Sequence layer
             * @private
             */
            p_setup_layer_sequence: function () {
                var self = this;

                var layer = new FeatureLayer({
                    name: 'sequence',
                    nbTracks: 2
                })
                self.layers.push(layer)
                var view = new FeatureLayerView({
                    model: layer,
                    container: self.layerContainer,
                    viewport: self.viewport,
                    cssClass: 'sequence',
                    noMenu: true,
                    margins: self.margins,
                    clipper: '#' + self.clipperId
                })
                self.layerViews.push(view)

                view.gFeatures.append('line').attr('x1', -100).attr('x2', 2000).attr('class', 'sequence-bg').attr('y1', 7).attr('y2', 7);
                var sel = view.gFeatures.selectAll("text").data(self.model.get('sequence').split('')).enter().append("text").attr('class', 'sequence data').text(function (d) {
                    return d;
                });

                self.p_positionText(self.viewport, sel);
                self.gAABubble = view.g.append('g').attr('class', 'axis-bubble').style('display', 'none');
                self.gAABubble.append('rect').attr('x', -30).attr('y', -12).attr('width', 61).attr('height', 16)
                self.gAABubble.append('text').attr('class', 'subseq').attr('y', 2);
            },
            /**
             * group features by category, and build a layer for each of them
             * @private
             */
            p_setup_layer_features: function () {
                var self = this;

                var groupedFeatures = _.groupBy(self.model.get('features'), function (ft) {
                    var gcid = (ft.groupSet ? (ft.groupSet + '/') : ' /') + ft.category;
                    ft._groupCatId = gcid;
                    return gcid;

                });

                //it is possible to pass the category Order, thus sort on it at first
                var buildOrder=function(orderName){
                    var order;
                    if (self.options[orderName] !== undefined) {
                        order = {};
                        _.each(self.options[orderName], function (n, i) {
                            order[n] = i + 1;
                        });
                        return order;
                    }
                    return undefined;
                };
                var categoryOrder = buildOrder('categoryOrder');
                var groupSetOrder = buildOrder('groupSetOrder');
                

                var saveGroupSet = '';
                _.chain(groupedFeatures)
                    .sortBy(function (group) {
                        if (categoryOrder !== undefined) {
                            return 1000000 * (categoryOrder[group[0].category] || 100);
                        }

                        if(groupSetOrder){
                            return 1000000 * (groupSetOrder[group[0].groupSet] || 100);

                        }
                        if (!group[0].groupSet) {
                            return -99999;
                        }

                        return group[0].groupSet;
                    })
                    .each(function (group, groupConcatName) {
                        var nbTracks, isPlot;
                        if (featureDisplayer.isCategoryPlot(group[0].category)) {
                            nbTracks = 1;
                            isPlot = true;
                        } else {
                            nbTracks = featureManager.assignTracks(group);
                        }
                        var groupName = group[0].category;
                        var groupType = group[0].categoryType || groupName;
                        var groupSet = group[0].groupSet;
                        var cssClass = groupName.replace(/\s+/g, '_')

                        var layer = new FeatureLayer({
                            name: (group[0].categoryName === undefined) ? groupName : group[0].categoryName,
                            type: groupType,
                            category: groupName,
                            groupSet: groupSet,
                            id: 'features-' + cssClass,
                            nbTracks: nbTracks,
                            isPlot: isPlot
                        });
                        self.layers.push(layer)

                        var layerView = new FeatureLayerView({
                            model: layer,
                            container: self.layerContainer,
                            viewport: self.viewport,
                            cssClass: cssClass,
                            layerMenu: self.options.layerMenu,
                            margins: self.margins,
                            clipper: '#' + self.clipperId,
                            groupSetName: groupSet? groupSet.replace(/\s+/g, '_').replace(/[\/\(\)]/g, '_') : '',
                            categorySeparator: saveGroupSet === groupSet
                        });
                        self.layerViews.push(layerView);

                        var sel;
                        if (isPlot) {
                            sel = featureDisplayer.categoryPlotAppend(groupName, self.viewport, layerView.gFeatures, group).classed(cssClass, true);
                        } else {
                            sel = featureDisplayer.append(self.viewport, layerView.gFeatures, group).classed(cssClass, true);

                        }
                        //add tolltip based on description field
                        sel.append('title').text(function (ft) {
                            return ft.description;
                        });
                        saveGroupSet = groupSet;
                    });

            },
            /**
             * @private
             */
            p_setup_hidden_layers_container: function () {
                var self = this;

                self.hiddenLayers = new HiddenLayersView({

                    container: self.svg,
                    layers: self.layers,
                    nbTracks: 1
                });
                // /self.layers.push(layer)

            },
            /**
             * @private
             * @return {SeqEntryAnnotInteractiveView}
             */
            p_setup_groupset_titles: function () {
                var self = this;
                var groupSetNames = _.chain(self.model.get('features')).map(function (ft) {
                    return ft.groupSet
                }).unique().filter(function (t) {
                    return t
                }).value();

                self.gGroupSets = self.svg.append('g').attr('class', 'groupset-title');
                self.groupSetBackgroundGroup.selectAll('rect').data(groupSetNames).enter().append('rect')
                    .attr('x',0)
                    .attr('y',0)
                    .attr('width', '100%')
                    .attr('height',0)
                    .attr('class', function (x) {
                        return 'groupset-background ' + 'A' + (x || '').replace(/\W/g, '_');
                    })
                ;
                self.gGroupSets.selectAll('text').data(groupSetNames).enter().append('text').text(function (x) {
                    return x;
                }).attr('x', (self.options.collapsible ? 27 : 7)).attr('y', 10).attr('id', function (x) {
                    return 'groupset-title-' + (x || '').replace(/\W/g, '_');
                })
                if (self.options.collapsible) {
					var oldGroupSetStatuses = self.groupSetStatuses || {};
                    self.groupSetStatuses = [];
                    _.each(groupSetNames, function (d) {
						var isOpen = oldGroupSetStatuses[d] === undefined ? true : oldGroupSetStatuses[d].open;
                	    self.groupSetStatuses[d] = {name:d,open:isOpen};
                    });
                    self.collapseIcon = self.gGroupSets
                        .selectAll('polygon')
                        .data(groupSetNames)
                        .enter()
                        .append('polygon')
                        .attr('class','collapse_expand')
                        .attr('points', self.collapseTriangle)
                        .attr('id', function (d,i) {
                            return 'groupset-collapser-' + (d || '').replace(/\W/g, '_');
                        })
                        .style('cursor','pointer')
                        .on('mousedown', function(d,i) { self.toggleGroupsetCollapse(d); })
                    ;
                };

                return self;
            },
            /**
             * collapse / expand groupset with passed groupsetName, as if the triangle was clicked
             * @param {String} groupsetName
             */
            toggleGroupsetCollapse: function (groupsetName) {
                var self = this;
                if (self.options.collapsible && self.groupSetStatuses[groupsetName]) {
                    self.groupSetStatuses[groupsetName].open = !self.groupSetStatuses[groupsetName].open;
                    self.render();
                    self.viewport.resizeBrush();
                    if (self.collapseCallback) {
                        if (_.isArray(self.collapseCallback)) {
                            _.each(self.collapseCallback, function (f) {
                            if (!f) {
                                    return;
                                }
                                f();
                            })
                        }
                        else {
                            self.collapseCallback();
                        }
                    }
                }
            },
            /**
             * position sequence text.
             * @param {Object} viewport
             * @param {Object} sel
             * @private
             */
            p_positionText: function (viewport, sel) {
                var self = this;
                sel.attr('x', function (d, i) {
                    return viewport.scales.x(i);
                }).attr('y', viewport.scales.y(1) - 7).style('font-size', '' + viewport.scales.font + 'px').style('letter-spacing', '' + (viewport.scales.x(2) - viewport.scales.x(1) - viewport.scales.font) + 'px')
                return sel
            } 
            
        });

        return SeqEntryAnnotInteractiveView;
    })
;
define(/**
     @exports SeqEntryFastaView
     @author Alexandre Masselot
     @author Kiran Mukhyala
     @copyright 2013,  Bioinformatics & Computational Biology Department, Genentech Inc.
     */
    'pviz/views/SeqEntryFastaView',['jquery', 'underscore', 'backbone'], function ($, _, Backbone) {
        /**
         * @class SeqEntryFastaView is a simple text fasta viewer (60 character per line and a space every 10)
         * @constructor
         * @augments Backbone.View
         */
        var SeqEntryFastaView = Backbone.View.extend(/** @lends module:SeqEntryFastaView~SeqEntryFastaView.prototype */{
            initialize: function (options) {
                var self = this;
                self.options = options;

            },
            render: function () {
                var self = this;
                $(self.el).empty();
                var seq = self.model.get('sequence');
                var seq60 = '';
                for (i = 0; i < seq.length; i += 10) {
                    seq60 += seq.substring(i, i + 10)
                    if ((i + 10) % 60 == 0) {
                        seq60 += "\n";
                    } else {
                        seq60 += " ";
                    }

                }

                $(self.el).append("<pre>>" + self.model.get('id') + "\n" + seq60 + "</pre>")
            }
        });
        return SeqEntryFastaView;
    });
define(
    /**
     @exports OneLiner
     @author Alexandre Masselot
     @author Kiran Mukhyala
     @copyright 2013,  Bioinformatics & Computational Biology Department, Genentech Inc.
     */

    'pviz/views/OneLiner',['jquery', 'underscore', 'backbone', 'd3', 'text!pviz_templates/seq-entry-annot-interactive.html'], function ($, _, bb, d3, tmpl) {
        /**
         * @class OneLiner view are PositionedFeatures displayed on a non interactive super simplified icon-like view
         * @constructor
         * @param {Map} options
         * @param {Array} options.categories [optional] a limited list of categories to be plot. Each of them will be on a different line on the view
         * @augments Backbone.View
         */
        var OneLiner = bb.View.extend(/** @lends module:OneLiner~OneLiner.prototype */{
            initialize: function (options) {
                var self = this;
                self.options = options;

                self.height = 16;

                self.svg = d3.select(self.el).append("svg").attr("width", '100%').attr('height', self.height).attr('class', 'pviz one-liner');
                self.svg.append('line').attr('x1', 0).attr('x2', '100%').attr('y1', self.height / 2).attr('y2', self.height / 2);

                self.update();
                self.listenTo(self.model, 'change', function () {
                    self.update();
                    self.render();
                });

            },
            /**
             * @private
             * @return {categories}
             */
            categories: function () {
                return this.options.categories;
            },
            /**
             * @private
             * @return a d3.scale
             */
            xscale: function () {
                var self = this;
                return d3.scaleLinear().domain([0, self.model.length()]).range([0, $(self.el).width()])
            },
            /**
             * @private
             */
            update: function () {
                var self = this;
                self.svg.selectAll("rect").remove();

                var features = self.model.get('features');

                var cat2line = {}
                _.each(self.categories(), function (c, i) {
                    cat2line[c] = i
                })
                self.cat2line = cat2line;
                var features = _.filter(features, function (ft) {
                    return (self.categories() === undefined) || (cat2line[ft.category] !== undefined)
                })

                self.rectangles = self.svg.selectAll('rect').data(features).enter();

                self.rectangles.append('rect').attr('height', (self.categories() ? (self.height / self.categories().length) : self.height))
            },
            /**
             * build the actual widget in its specified container (el)
             */
            render: function () {
                var self = this;
                var x = self.xscale()
                self.svg.selectAll('rect').attr('x', function (ft) {
                    return x(ft.start)
                }).attr('width', function (ft) {
                    return x(ft.end - ft.start + 1)
                }).attr('y', function (ft) {
                    if (self.categories()) {
                        return self.cat2line[ft.category] * self.height / self.categories().length
                    } else {
                        return 0
                    }
                }).attr('class', function (ft) {
                    if (self.categories() === undefined)
                        return '';
                    return 'subline-' + self.cat2line[ft.category]
                });
            }
        });
        return OneLiner;

    });

/*
 * Copyright (c) 2013, Genentech Inc.
 * Authors: Alexandre Masselot, Kiran Mukhyala, Bioinformatics & Computational Biology
 */
var classPaths = ['pviz/models/SeqEntry', 'pviz/services/DASReader', 'pviz/services/FastaReader', 'pviz/services/FeatureManager', 'pviz/services/IconFactory', 'pviz/views/SeqEntryAnnotInteractiveView', 'pviz/views/SeqEntryFastaView', 'pviz/views/FeatureDisplayer', 'pviz/views/OneLiner']
define('PVizExport',['pviz/models/SeqEntry', 'pviz/services/DASReader', 'pviz/services/FastaReader', 'pviz/services/FeatureManager', 'pviz/services/IconFactory', 'pviz/views/SeqEntryAnnotInteractiveView', 'pviz/views/SeqEntryFastaView', 'pviz/views/FeatureDisplayer', 'pviz/views/OneLiner'], function(SeqEntry, DASReader, FastaReader, FeatureManager, IconFactory, SeqEntryAnnotInteractiveView, SeqEntryFastaView, FeatureDisplayer, OneLiner) {
  var args = arguments;
  var exp = {}
  for (i in classPaths) {
    var simpleName = classPaths[i].replace(/.*\//, '');
    exp[simpleName] = args[i];
  }
  return exp;
})
;

define('pviz', ['PVizExport'], function(pve){
	return pve;
});
