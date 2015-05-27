/*global module:false*/
module.exports = function(grunt) {
	var globalConfig = {
		images: 'images',
		css: 'stylesheets',
		fonts: 'fonts',
		scripts: 'javascripts',
		bower_path: 'bower_components',
		target: 'target',
		tmp: 'tmp',
		src: '../src'
	};

  // Project configuration.
  grunt.initConfig({
		globalConfig: globalConfig,
    // Metadata.
    pkg: grunt.file.readJSON('package.json'),
    banner: '/*! <%= pkg.title || pkg.name %> - v<%= pkg.version %> - ' +
      '<%= grunt.template.today("yyyy-mm-dd") %>\n' +
      '<%= pkg.homepage ? "* " + pkg.homepage + "\\n" : "" %>' +
      '* Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>;' +
      ' Licensed <%= _.pluck(pkg.licenses, "type").join(", ") %> */\n',
    // Task configuration.
		mkdir: {
			all: {
				options: {
					create: ['target', 'tmp']
				}
			}
		},
		watch: {
			options: {
				livereload: true
			},
			scripts: {
				files: '<%= globalConfig.scripts %>/core.js',
				tasks: ['uglify', 'concat']
			},
			livereload: {
				options: {
					livereload: '<%= connect.options.livereload %>'
				},
				files: ['*.html']
			}
		},
		copy: {
			main: {
				files: [
					{ expand: true, flatten: true, src: '<%= globalConfig.src %>/html/index.html', dest: '<%= globalConfig.target %>/', filter: 'isFile' },
					{ expand: true, flatten: true, src: '<%= globalConfig.src %>/html/dashboard.html', dest: '<%= globalConfig.target %>/', filter: 'isFile' },
					{ expand: true, flatten: true, src: '<%= globalConfig.src %>/html/about.html', dest: '<%= globalConfig.target %>/', filter: 'isFile' },
				]
			}
		},
		uglify: {
			dist: {
				options: {
					mangle: false
				},
				files: {
					'<%= globalConfig.tmp %>/core.min.js': ['<%= globalConfig.src %>/js/core.js'],
					'<%= globalConfig.tmp %>/jquery.xml2json.min.js': ['<%= globalConfig.bower_path %>/jquery.xml2json/src/jquery.xml2json.js']
				}
			}
		},
		concat: {
			js: {
				src: [
					'<%= globalConfig.bower_path %>/jquery/dist/jquery.min.js',
					'<%= globalConfig.bower_path %>/jquery-ui/jquery-ui.min.js',
					'<%= globalConfig.bower_path %>/handlebars/handlebars.min.js',
					'<%= globalConfig.tmp %>/jquery.xml2json.min.js',
					'<%= globalConfig.bower_path %>/typeahead.js/dist/typeahead.bundle.min.js',
					'<%= globalConfig.tmp %>/core.min.js'
				],
				dest: '<%= globalConfig.target %>/build.js'
			},
			css: {
				src: [
					'<%= globalConfig.bower_path %>/jquery-ui/themes/smoothness/jquery-ui.min.css',
					'<%= globalConfig.src %>/css/core.css'
				],
				dest: '<%= globalConfig.target %>/build.css'
			}
		},
		connect: {
			options: {
				port: 9000,
				livereload: 35729,
				hostname: '*' // * = accessible from anywhere ; default: localhost
			},
			livereload: {
				options: {
					open: true,
					base: [''] // '.tmp',
				}
			}
		}
	});

  // These plugins provide necessary tasks.
	require('load-grunt-tasks')(grunt);

  // Default task.
  grunt.registerTask('default', ['copy', 'uglify', 'concat:js', 'concat:css']);
	grunt.registerTask('server', function (target) {
		if (target === '/') {
			return grunt.task.run(['default', 'connect:development:keepalive']);
		}

		grunt.task.run([
			'connect:livereload',
			'watch'
		]);
	});

};
