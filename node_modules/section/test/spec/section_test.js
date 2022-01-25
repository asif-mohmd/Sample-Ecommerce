'use strict';

var grunt = require('grunt');
var path = require('path');
var cheerio = require('cheerio');

exports.section = {
  structure: function(test) {
    test.expect(2);

    var actualMain = [];
    grunt.file.recurse('tmp/main', function(abs, root, subdir, file) {
      actualMain.push(path.join(subdir || '', file));
    });
    actualMain.sort();

    var actualBuild = [];
    grunt.file.recurse('tmp/build', function(abs, root, subdir, file) {
      actualBuild.push(path.join(subdir || '', file));
    });
    actualBuild.sort();

    var expected = [];
    grunt.file.recurse('test/expected', function(abs, root, subdir, file) {
      expected.push(path.join(subdir || '', file));
    });
    expected.sort();

    test.deepEqual(actualMain, expected, 'Expected different file structure for main task.');
    test.deepEqual(actualBuild, expected, 'Expected different file structure for build task.');

    test.done();
  },
  coverImage: function(test) {
    test.expect(2);

    var $ = cheerio.load(grunt.file.read('tmp/build/cover-image/with/index.html'));
    test.strictEqual($('main > figure').length, 1, 'Expected a cover image.');

    $ = cheerio.load(grunt.file.read('tmp/build/cover-image/without/index.html'));
    test.strictEqual($('main > figure').length, 0, 'Did not expect a cover image.');

    test.done();
  },
  pullQuote: function(test) {
    test.expect(4);

    var blockquotes = cheerio.load(grunt.file.read('tmp/build/markdown-document/index.html'))('main section:first-child > blockquote');

    test.ok(blockquotes.eq(0).hasClass('pullquote'), 'Expected first blockquote to be a pull quote.');
    test.ok(!blockquotes.eq(1).hasClass('pullquote'), 'Expected second blockquote not to be a pull quote.');
    test.ok(blockquotes.eq(2).hasClass('pullquote'), 'Expected third blockquote to be a pull quote.');
    test.ok(!blockquotes.eq(3).hasClass('pullquote'), 'Expected fourth blockquote not to be a pull quote.');

    test.done();
  }
};
