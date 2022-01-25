'use strict';

function urlEncode(string) {
  var encoded = '';
  for (var i = 0; i < string.length; i++)
    if (!(i % 4))
      encoded += '%' + string.charCodeAt(i).toString(16);
    else
      encoded += string.charAt(i);
  return encoded;
}

function htmlEncode(string) {
  var encoded = '';
  for (var i = 0; i < string.length; i++) {
    var c = string.charAt(i);
    if (!(i % 4) || c == '@' || c == '.' || c == ':')
      encoded += '&#' + string.charCodeAt(i) + ';';
    else
      encoded += string.charAt(i);
  }
  return encoded;
}

function mailToLink(email, name) {
  return '<a href="' + htmlEncode('mailto:' + urlEncode(email)) + '">' + htmlEncode(name || email) + '</a>';
}

module.exports = function(grunt) {

  var fs = require('fs'),
      path = require('path'),
      marked = require('marked'),
      hljs = require('highlight.js'),
      cheerio = require('cheerio'),

      _ = grunt.util._,
      extend = _.extend,
      file = grunt.file,
      readFile = file.read,
      writeFile = file.write,
      deleteFile = file.delete,
      copyFile = file.copy,
      info = grunt.log.writeln;

  var supportedLanguages = Object.keys(hljs.LANGUAGES);

  var is = function() {
    for(var i = 0, l = arguments.length; i < l; i++)
      if (arguments[i] == this.type) return true;
    return false;
  };

  grunt.registerMultiTask('section', 'Generate website from Markdown files.', function() {
    var options = this.options(),
        isBuild = options.isBuild = this.target == 'build',
        src = this.data.src,
        dest = this.data.dest;

    // Delete the output directory
    if (file.exists(dest)) {
      try {
        deleteFile(dest);
      } catch (e) {
        grunt.log.error();
        grunt.verbose.error(e);
        grunt.fail.warn('Failed to clean output directory.');
      }
    }

    var pageProto = {
      title: '',
      description: '',
      body: '',
      words: 0,
      date: 0,
      author: false,
      cover: false,
      is: is,
      mailToLink: mailToLink,
      dateFormat: grunt.template.date
    };
    var root = pageProto.root = Object.create(pageProto);
    var pages = pageProto.pages = [root];
    root.ancestors = [root];
    root.page = root;

    var template = readFile(options.layout);
    if (this.target == 'main')
      template = template.replace('</body>', '<script src="http://localhost:35729/livereload.js"></script></body>');

    try {
      var templateFn = _.template(template);
    }
    catch (e) {
      e.message = 'An error occurred while processing a template (' + e.message + ').';
      grunt.warn(e, grunt.fail.code.TEMPLATE_ERROR);
    }

    (function recurse(rootdir, site, subdir) {
      subdir && (subdir += '/') || (subdir = '');

      var abspath = path.join(rootdir, subdir),
          lastPage;

      site.children = [];
      site.hash = {};
      site.type = 'index';

      fs.readdirSync(abspath).sort().forEach(function(filename) {
        var filepath = path.join(abspath, filename),
            filestat = fs.statSync(filepath),
            ext = path.extname(filepath);

        // If this is a file with an unsupported extension just copy it as is.
        // Skip hidden files.
        if (filestat.isFile() && !~options.markdown_ext.indexOf(ext)) {
          if (filename.charAt(0) != '.') {
            copyFile(filepath, path.join(dest, site.path || '', filename));
          }
          return;
        }

        var page = Object.create(pageProto),
            name = page.name = _.slugify(path.basename(filepath, ext).replace(/^\d{4}-\d\d-\d\d-/, function(match) {
              page.date = new Date(match.slice(0, -1)).getTime();
              return '';
            }));

            page.path = (site.path || '') + name + '/';
            page.ext = ext;
            page.parent = site;
            page.ancestors = site.ancestors.slice(0);
            page.ancestors.push(page);
            page.page = page;

        if (name != 'index') {
          site.children.push(page);
          pages.push(page);
          site.hash[name] = page;
        }

        // Subdirectory
        if (filestat.isDirectory())
          recurse(rootdir, page, path.join(subdir || '', filename || ''));

        // Page
        else {
          var $ = cheerio.load(marked(readFile(filepath)), {ignoreWhitespace: true});

          // Remove align attribute from table cells which is invalid HTML5
          // and use a class instead.
          $('[align]').each(function() {
            var el = $(this);
            el.addClass(el.attr('align')).removeAttr('align');
          });

          $('h2, h3').each(function() {
            var el = $(this);
            el.attr('id', _.slugify(el.text()));
          });

          $(':root > blockquote').filter(function() {
            return this.children('p:only-child').length && !this.find('img').length;
          }).addClass('pullquote');

          var cover = $.root().children('p:first-child').find('img:only-child');

          var attrs = {
                title: $('h1').first().text(),
                description: $('h1+p').first().text(),
                words: $.root().text().split(/\s+/).length,
                src: filepath
              };

          if (cover.length) {
            cover.parent().remove();
            attrs.cover = {
              src: cover.attr('src'),
              alt: cover.attr('alt')
            };
          }

          $('h1').first().remove();

          attrs.body = $.html();

          // Index page
          if (name == 'index') {
            extend(site, attrs);
            site.dest = path.join(dest, site.path || '', options.index_html);
            site.rel = '/' + (site.path || '');
            site.url = options.url + site.rel;
          }

          // Normal page
          else {
            extend(page, attrs);
            page.dest = path.join(dest, page.path, options.index_html);
            page.type = page.date ? 'post' : 'page';
            page.rel = '/' + page.path;
            page.url = options.url + page.rel;

            if (lastPage) {
              page.prev = lastPage;
              lastPage.next = page;
            }
            lastPage = page;
          }
        }
      });
    })(src, pages[0]);

    pages.sort(function(a, b) {
      return b.date - a.date;
    }).forEach(function(page) {
      // Generate the html file
      if (page.dest) {
        var html = templateFn(extend({}, page, options));

        // Run html through cheerio to remove extra whitespace.
        var $ = cheerio.load(html, {ignoreWhitespace: true});

        // Add highlighting to code blocks. We are not doing it when parsing markdown because
        // cheerio is stripping whitespaces.
        $('pre > code').each(function() {
          var $el = $(this);
          var code = $el.text();
          var lang = ($el.attr('class') || '').replace('lang-', '');

          if (lang && ~supportedLanguages.indexOf(lang))
            $el.html(hljs.highlight(lang, code).value);

          else if(lang != 'text' && lang != 'plain')
            $el.html(hljs.highlightAuto(code).value);
        });

        writeFile(page.dest, $.html());
        info('Generated “' + page.dest + '”.');
      }
    });

    // Configure copy task.
    grunt.config.set('copy', {
      init: {
        expand: true,
        cwd: path.join(options.sectionBase, 'theme/assets'),
        src: '**/**',
        dest: dest
      },
      main: {
        expand: true,
        cwd: path.join(options.base,'assets'),
        src: '**/**',
        dest: dest
      }
    });

    // Configure less task.
    grunt.config.set('less', {
      main: {
        options: {
          yuicompress: isBuild
        },
        src: options.style,
        dest: path.join(dest, 'style.css')
      }
    });

    // Queue next tasks.
    grunt.task.run('copy', 'less');

  });
};
