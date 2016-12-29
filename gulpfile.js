var gulp = require('gulp');
var sass = require('gulp-ruby-sass');
var notify = require('gulp-notify');
var cleanCSS = require('gulp-clean-css');
var livereload = require('gulp-livereload');

//SASS
gulp.task('build:sass', () => {
        sass('sass/*.sass')
        	.on('error', sass.logError)
	        .pipe(cleanCSS())
			.pipe(notify({
				message: "SASS compiled."
			}))
	        .pipe(gulp.dest('assets/css'))
	        .pipe(livereload());                                   
});

gulp.task('watch:sass', () => {
	livereload.listen();

	gulp.watch('./sass/*.sass', ['build:sass']);
});