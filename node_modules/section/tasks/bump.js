module.exports = function(grunt) {

  // Modified from https://github.com/vojtajina/grunt-bump
  grunt.registerTask('bump', 'Increment the version number.', function(versionType) {
    var pkg = grunt.config.get('pkg'),
        type = {
          patch: 2,
          minor: 1,
          major: 0
        },
        parts = pkg.version.split('.'),
        idx = type[versionType || 'patch'];

    parts[idx] = parseInt(parts[idx], 10) + 1;
    while(++idx < parts.length) {
      parts[idx] = 0;
    }

    pkg.version = parts.join('.');

    grunt.file.write('package.json', JSON.stringify(pkg, null, '  '));
    grunt.config.set('pkg', pkg);
    grunt.log.ok('Version bumped to ' + pkg.version);
  });

};
