var gulp = require('gulp')
var sass = require('gulp-ruby-sass')
var cleanCSS = require('gulp-clean-css')
var livereload = require('gulp-livereload')
var htmlmin = require('gulp-htmlmin')
var autoprefixer = require('gulp-autoprefixer')

//SASS
gulp.task('sass', () => {
        sass('sass/*.sass')
        	.on('error', sass.logError)
            .pipe(autoprefixer({
                browsers: ['last 2 versions'],
                cascade: false
            }))
	        .pipe(cleanCSS())
	        .pipe(gulp.dest('public/assets/css'))
	        .pipe(livereload())                                   
})

gulp.task('watch', () => {
	livereload.listen()
	gulp.watch('./sass/*.sass', ['sass'])
    gulp.watch('./html/index.html', ['html'])
})

// minify html and append hash to URLs
gulp.task('html', () => {
    return gulp.src('./html/index.html')
        .pipe(htmlmin({
        	collapseWhitespace: true,
        	minifyJS: true,
        	removeComments: true
        }))
        .pipe(gulp.dest('./public'))
})