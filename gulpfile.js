const gulp = require('gulp');
const ts = require('gulp-typescript');
const tsProject = ts.createProject('tsconfig.json');

const spawn = require('child_process').spawn;
const killer = node => node ? node.kill() : null;

const config = {
    init: ['dist/index.js'],
    watch: ['src/**/*.ts']
};

let node;

gulp.task('run', () => {
    killer(node);
    node = spawn('node', config.init, { stdio: 'inherit' });
    node.on('close', code => {
        if (code === 8) {
            gulp.log('Error detected, waiting for changes...');
        }
    });
});
 
gulp.task('compile', () => {
    return gulp.src(config.watch)
        .pipe(tsProject())
        .pipe(gulp.dest('dist'));
});
 
gulp.task('watch', () => {
    gulp.watch(config.watch, gulp.series('compile', 'serve'));
});

gulp.task('serve', gulp.parallel('watch', 'run'));

gulp.task('default', gulp.series('compile', 'serve'));