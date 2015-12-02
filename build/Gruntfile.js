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
					create: ['target', 'target/js', 'target/css', 'target/images', 'tmp']
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
					{ expand: true, flatten: true, src: '<%= globalConfig.src %>/*.html', dest: '<%= globalConfig.target %>/', filter: 'isFile' },
					// Overwrite include.html with its distrib version (minified and merged js and css)
					{ expand: true, flatten: true, src: '<%= globalConfig.src %>/distrib/include.html', dest: '<%= globalConfig.target %>/', filter: 'isFile' },
					{ expand: true, flatten: true, src: '<%= globalConfig.src %>/css/github.css', dest: '<%= globalConfig.target %>/css', filter: 'isFile' },
					{ expand: true, flatten: true, src: '<%= globalConfig.src %>/images/*.png', dest: '<%= globalConfig.target %>/images', filter: 'isFile' },
					{ expand: true, flatten: true, src: '<%= globalConfig.bower_path %>/jquery-ui/themes/smoothness/images/*.png', dest: '<%= globalConfig.target %>/images', filter: 'isFile' },
					{ expand: true, flatten: true, src: '<%= globalConfig.bower_path %>/jquery-ui/themes/smoothness/images/*.gif', dest: '<%= globalConfig.target %>/images', filter: 'isFile' },
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
		cssmin: {
			options: {
				shorthandCompacting: false,
				roundingPrecision: -1
			},
			target: {
				files: {
					'<%= globalConfig.target %>/css/build.css': [
//						'<%= globalConfig.bower_path %>/jquery-ui/themes/smoothness/jquery-ui.min.css',
						'<%= globalConfig.src %>/css/core.css'
					]
				}
			}
		},
		concat: {
			dist: {
				src: [
					'<%= globalConfig.bower_path %>/jquery/dist/jquery.min.js',
					'<%= globalConfig.bower_path %>/jquery-ui/jquery-ui.min.js',
					'<%= globalConfig.bower_path %>/handlebars/handlebars.min.js',
					'<%= globalConfig.tmp %>/jquery.xml2json.min.js',
					'<%= globalConfig.bower_path %>/typeahead.js/dist/typeahead.bundle.min.js',
					'<%= globalConfig.bower_path %>/imgLiquid/js/imgLiquid-min.js',
					'<%= globalConfig.bower_path %>/lz-string/libs/lz-string.min.js',
					'<%= globalConfig.bower_path %>/aws-sdk-js/dist/aws-sdk.min.js',
					'<%= globalConfig.bower_path %>/amazon-cognito-js/dist/amazon-cognito.min.js',
					'<%= globalConfig.tmp %>/core.min.js'
				],
				dest: '<%= globalConfig.target %>/js/build.js'
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
		},
		aws_s3: {
			release: {
				options: {
					accessKeyId: process.env.AWS_ACCESS_KEY_ID,
					secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
					bucket: 'ifeedle.com',
					region: 'us-east-1',
					sslEnabled: false
				},
				files: [
					{
						expand: true,
						dest: '.',
						cwd: '<%= globalConfig.target %>/',
						src: ['**'],
						action: 'upload',
						differential: true
					}
				]
			}
		}
	});

  // These plugins provide necessary tasks.
	require('load-grunt-tasks')(grunt);

  // Default task.
  grunt.registerTask('build', ['copy', 'uglify', 'concat', 'cssmin']);
  grunt.registerTask('default', ['build']);
  grunt.registerTask('deploy', ['aws_s3']);
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
