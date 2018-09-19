const webpack = require('webpack');
const merge = require('webpack-merge');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const webpackDefault = require('./webpack.config.js');
const path = require('path');

const resolve = dir => path.join(__dirname, dir);
const ASSETS_VERSION = require('./package.json').version;

module.exports = merge(webpackDefault, {
	mode: 'production',
	output: {
		filename: `js/[name].min.js?v=${ASSETS_VERSION}`,
		publicPath: 'https://jozefcipa.com'
	},
	optimization: {

		minimizer: [
			new UglifyJsPlugin({
				cache: true,
				parallel: true,
				sourceMap: false
			}),
			new OptimizeCSSAssetsPlugin({})
		]
	},
	plugins: [
		// ensure that we get a production build of any dependencies
		// this is primarily for React, where this removes 179KB from the bundle
		new webpack.DefinePlugin({
			'process.env.NODE_ENV': '"production"'
		}),
		new HtmlWebpackPlugin(
			{
				inject: true,
				template: resolve('src/index.html'),
				filename: resolve('public/index.html'),
				minify: {
					removeAttributeQuotes: true,
					collapseWhitespace: true,
					html5: true,
					minifyCSS: true,
					minifyJS: true,
					removeComments: true,
					removeEmptyAttributes: true
				},
			}
		),
		new MiniCssExtractPlugin({
			filename: `css/styles.css?v=${ASSETS_VERSION}`
		})
	]
});