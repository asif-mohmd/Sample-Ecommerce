var path = require('path');

module.exports = function( grunt ) {

  // Aliases
  var file = grunt.file,
      isFile = file.isFile,
      readJSON = file.readJSON,
      readYAML = file.readYAML,
      _ = grunt.util._,
      find = _.find;

  function readAny(filepath) {
    if (path.extname(filepath) == '.json')
      return readJSON(filepath);
    return readYAML(filepath);
  }

  var layout = find(['layout.jst', __dirname + '/theme/layout.jst'], isFile),
      style = find(['style.less', 'syle.css', __dirname + '/theme/style.less'], isFile);

  var pkg = readJSON(__dirname + '/package.json');

  var defaultConfig = {
    base: grunt.option('base') || '',
    sectionBase: __dirname,
    content: 'content/',
    output: grunt.option('output') || 'output/',
    temp: grunt.option('temp') || 'temp',
    layout: layout,
    style: style,
    index_html: 'index.html',
    highlight: true,
    pkg: pkg,
    markdown_ext: ['.md', '.markdown', '.mdown', '.mkdn', '.mkd', '.mdwn', '.text'],
    url: grunt.option('url') || '',
    host: 'localhost',
    port: grunt.option('port') || 8000,
    rss_count: 10,
    ga_uid: '',
    git: {}
  };

  // Read section config file
  var possibleConfigFiles = ['section.json', 'section.yaml', 'section.yml'];
  var userConfigPath = grunt.option('config') || find(possibleConfigFiles, isFile),
      userConfig = userConfigPath && readAny(userConfigPath) || {};

  var options = _.extend(defaultConfig, userConfig);

  var buildTasks = ['section:build', 'htmlmin', 'time'];

  var tasksConfig = {
    section: {
      options: options,
      main: {
        src: options.content,
        dest: options.temp
      },
      build: {
        src: options.content,
        dest: options.output
      }
    },

    // HTML minification
    htmlmin: {
      main: {
        options: {
          removeComments: true,
          removeCommentsFromCDATA: true,
          removeCDATASectionsFromCDATA: true,
          collapseWhitespace: false,
          collapseBooleanAttributes: true,
          removeAttributeQuotes: true,
          removeRedundantAttributes: true,
          removeEmptyAttributes: true,
          removeOptionalTags: true
        },
        expand: true,
        cwd: options.output,
        src: '**/**.html',
        dest: options.output
      }
    }
  };

  if (options.git.url) {
    tasksConfig.git_deploy = {
      main: {
        options: {
          url: options.git.url
        },
        src: options.output
      }
    };
    buildTasks.push('git_deploy');
  }

  tasksConfig.connect = {
    main: {
      options: {
        base: options.temp,
        hostname: options.host,
        port: options.port
      }
    }
  };

  tasksConfig.watch = {
    options: {
      livereload: true
    },
    main: {
      files: [options.content + '**/**', 'assets/**/**', style, layout].concat(possibleConfigFiles),
      tasks: ['section:main']
    }
  };

  tasksConfig.notify = {
    success: {
      options: {
        title: 'Success!',
        message: 'Your website was generated successfully.'
      }
    }
  };

  grunt.initConfig(tasksConfig);

  buildTasks.push('notify:success');

  // Distribution build task.
  grunt.registerTask('build', 'Generates a production-ready version of your site.', buildTasks);

  // Default task.
  grunt.registerTask('default', 'Generates and serves a development version of your site that is automatically regenerated when files change.', [
    'section:main',
    'notify:success',
    'connect',
    'watch'
  ]);
};
