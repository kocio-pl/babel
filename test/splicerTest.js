'use strict';

let assert = require('assert'),
    Promise = require('bluebird'),
    pathLib = require('path'),
    fs = Promise.promisifyAll(require('fs')),
    zlib = require('zlib'),
    babel = Promise.promisify(require('..')),
    uptile = require('tilelive-promise'),
    tileCodec = require('../lib/tileCodec'),
    PbfSplicer = require('../lib/PbfSplicer'),
    _ = require('underscore');

let fauxSource = function () {};
fauxSource.getAsync = o => Promise.resolve({type: o.type, tile: o.t, headers: o.h});

let fauxCore = {
    tilelive: {
        protocols: {}
    },
    loadSource: v => fauxSource,
};

babel.initKartotherian(fauxCore);


describe('Tag recombination', () => {
    function test(file, opts, expected) {
        const path = pathLib.resolve(__dirname, 'data', file + '.pbf');
        let pbfData = fs.readFileSync(path);

        return babel({
            protocol: opts.lng ? 'babel:' : 'json2tags:',
            query: {nameTag: 'name', languages: opts.lng, source: 'a'}
        }).then(
            bbl => {
                let headers = {xyz: 'abc'};
                if (opts.gzip) {
                    headers['Content-Encoding'] = 'gzip';
                    pbfData = zlib.gzipSync(pbfData);
                }
                let getParams = {type: opts.type, t: pbfData, h: headers};
                return bbl.getAsync(getParams);
            }
        ).then(result => {
            assert.deepStrictEqual(result.headers, {xyz: 'abc'});
            if (typeof expected === 'string') {
                // Binary compare with the stored file
                expected = fs.readFileSync(pathLib.resolve(__dirname, 'data', expected + '.pbf'));
                assert.deepStrictEqual(result.tile, expected);
            } else if (expected !== undefined) {
                // Object compare with the provided JSON
                const dec = tileCodec.decodeTile(result.tile);
                assert.deepStrictEqual(dec, expected);
            }
        });
    }


    const expected_02_multilingual = {
        "layers": [
            {
                "features": [
                    {
                        "type": 1,
                        "id": 5,
                        "tags": [0, 0, 1, 1, 2, 2, 3, 3, 4, 1, 5, 4, 6, 5, 7, 6, 8, 7, 9, 7],
                        "geometry": [9, 1599, 4288]
                    }
                ],
                "keys": [
                    "class",
                    "name",
                    "name_ar",
                    "name_bn",
                    "name_en",
                    "name_hi",
                    "name_ja",
                    "name_kn",
                    "name_ru",
                    "name_uk"
                ],
                "values": [
                    {"tag": 1, "value": "city"},
                    {"tag": 1, "value": "Vancouver"},
                    {"tag": 1, "value": "فانكوفر"},
                    {"tag": 1, "value": "বাংকূবর"},
                    {"tag": 1, "value": "वांकूवर"},
                    {"tag": 1, "value": "バンクーバー"},
                    {"tag": 1, "value": "ವಾಂಕೂವರ್"},
                    {"tag": 1, "value": "Ванкувер"}
                ],
                "version": 2,
                "name": "place",
                "extent": 4096
            }
        ]
    };

    it('json to tags', () => test('02-multilingual', {}, expected_02_multilingual));
    it('json to tags (gzip)', () => test('02-multilingual', {gzip: 1}, expected_02_multilingual));

    it('json to tags bin', () => test('02-multilingual', {}, '02-multilingual-alltags'));
    it('json to tags bin (gzip)', () => test('02-multilingual', {gzip: 1}, '02-multilingual-alltags'));

    const expected_pick_en = {
        "layers": [
            {
                "features": [
                    {
                        "type": 1,
                        "id": 5,
                        "tags": [0, 0, 1, 1],
                        "geometry": [9, 1599, 4288]
                    }
                ],
                "keys": [
                    "class",
                    "name"
                ],
                "values": [
                    {"tag": 1, "value": "city"},
                    {"tag": 1, "value": "Vancouver"}
                ],
                "version": 2,
                "name": "place",
                "extent": 4096
            }
        ]
    };
    it('pick en', () => test('02-multilingual-alltags', {lng: ['en']}, expected_pick_en));
    it('pick en (gzip)', () => test('02-multilingual-alltags', {lng: ['en'], gzip: 1}, expected_pick_en));

    it('pick ru', () => test('02-multilingual-alltags', {lng: ['ru']}, {
        "layers": [
            {
                "features": [
                    {
                        "type": 1,
                        "id": 5,
                        "tags": [0, 0, 1, 1],
                        "geometry": [9, 1599, 4288]
                    }
                ],
                "keys": [
                    "class",
                    "name"
                ],
                "values": [
                    {"tag": 1, "value": "city"},
                    {"tag": 1, "value": "Ванкувер"}
                ],
                "version": 2,
                "name": "place",
                "extent": 4096
            }
        ]
    }));

    it('pick using fallback', () => test('02-multilingual-alltags', {lng: ['es', 'fr', 'ru']}, {
        "layers": [
            {
                "features": [
                    {
                        "type": 1,
                        "id": 5,
                        "tags": [0, 0, 1, 1],
                        "geometry": [9, 1599, 4288]
                    }
                ],
                "keys": [
                    "class",
                    "name"
                ],
                "values": [
                    {"tag": 1, "value": "city"},
                    {"tag": 1, "value": "Ванкувер"}
                ],
                "version": 2,
                "name": "place",
                "extent": 4096
            }
        ]
    }));

    it('pick missing', () => test('02-multilingual-alltags', {lng: ['es', 'fr']}, {
        "layers": [
            {
                "features": [
                    {
                        "type": 1,
                        "id": 5,
                        "tags": [0, 0, 1, 1],
                        "geometry": [9, 1599, 4288]
                    }
                ],
                "keys": [
                    "class",
                    "name"
                ],
                "values": [
                    {"tag": 1, "value": "city"},
                    {"tag": 1, "value": "Vancouver"}
                ],
                "version": 2,
                "name": "place",
                "extent": 4096
            }
        ]
    }));

    it('getGrid', () => test('02-multilingual-alltags', {type:'grid'}));
});