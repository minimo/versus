/*
* gulpfile.js
*/

const BUILD_FILENAME = 'bundle.js'

const gulp = require('gulp');
const concat = require('gulp-concat');
const sourcemaps = require('gulp-sourcemaps');
const fcopy = require('filecopy');

// const rename = require("gulp-rename");
// const uglify = require('gulp-uglify-es').default;
// const browserify = require('browserify');
// const source = require('vinyl-source-stream');

gulp.task('default', ['build']);

gulp.task('build', ['concat', 'html', 'lib', 'css', 'asset']);

gulp.task("watch", function() {  
  var targets = [
    './src/js/**/*.js',
    './src/css/**/*.css',
    './src/index.html',
    './src/assets/**',
  ];
  gulp.watch(targets, ['concat', 'css', 'html', 'asset']);
});

// src/index.htmlを/wwwへコピー
gulp.task('html', function(done) {
  fcopy('./src/index.html', './_bundle/www/index.html');
  done();
});

// jsのビルド
gulp.task('concat', function() {
  gulp.src(['./src/js/**/*.js'])
    .pipe(sourcemaps.init())  // ソースマップを初期化
    .pipe(concat(BUILD_FILENAME))
    .pipe(sourcemaps.write()) // ソースマップの作成
    .pipe(gulp.dest('./_bundle/www/js'));
});

//browserifyテスト
gulp.task('browserify', function() {
  return browserify({
    entries: ['./src/js_browserify/bcrypt.js']
  })
    .bundle()
    .pipe(source('bcrypt.js'))
    .pipe(gulp.dest('./src/js'));
});

// 外部ライブラリを/libsから/_bundle/www/libsへコピー
gulp.task('lib', function(done) {
  fcopy('./src/libs/phina.js', './_bundle/www/libs/phina.js');
  done();
});

// アセットを/assetsから/_bundle/www/assetsへコピー
gulp.task('asset', function () {
  return gulp.src([
    './src/assets/**',
    ], { base: './src/assets' }
  )
  .pipe(gulp.dest('_bundle/www/assets'));
});

// cssを/cssから/_bundle/www/cssへコピー
gulp.task('css', function () {
  return gulp.src([
    './src/css/**/*.css',
    ], { base: './src/css' }
  )
  .pipe(gulp.dest('_bundle/www/css'));
});
