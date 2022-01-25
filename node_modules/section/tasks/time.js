module.exports = function(grunt) {

  var now = +new Date();
  grunt.registerTask('time', 'Print sucess status with elapsed time', function() {
    grunt.log.ok('Build successful. Done in ' + ((+new Date() - now) / 1000) + 's');
  });

};
