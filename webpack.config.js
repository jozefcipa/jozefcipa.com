const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const path = require('path');

const resolve = dir => path.join(__dirname, dir);

module.exports = {
	mode: 'development',
	entry: {
		bundle: resolve('src/js/index.js'),
	},
	output: {
		path: resolve('public/'),
		filename: `js/[name].js?v=[hash:6]`,
		publicPath: 'http://jozefcipa-com.test:2000'
	},
	optimization: {
		splitChunks: {
			cacheGroups: {
				commons: {
					test: /[\\/]node_modules[\\/]/,
					name: 'vendor',
					chunks: 'all'
				},
				styles: {
					name: 'styles',
					test: /\.css$/,
					chunks: 'all',
					enforce: true
				}
			}
		}
	},
	module: {
		rules: [
			{
				test: /\.scss$/,
				use: [
					MiniCssExtractPlugin.loader,
					'css-loader', // translates CSS into CommonJS
					'sass-loader', // compiles Sass to CSS
				]
			},
			{
				test: /\.css$/,
				use: [
					'style-loader',
					'css-loader'
				]
			},
			// {
			// 	test: /^(?!.*\.{test,min}\.js$).*\.js$/,
			// 	exclude: /(node_modules)/,
			// 	use: {
			// 		loader: 'babel-loader'
			// 	}
			// }
		]
	},
	resolve: {
		modules: [
			'node_modules'
		],
		alias: {}
	},
	plugins: [
		// ensure that we get a production build of any dependencies
		// this is primarily for React, where this removes 179KB from the bundle
		new webpack.DefinePlugin({
			'process.env.NODE_ENV': '"development"'
		}),
		new HtmlWebpackPlugin(
			{
				inject: true,
				template: resolve('src/index.html'),
				filename: resolve('public/index.html'),
				minify: false
			}
		),
		new MiniCssExtractPlugin({
			filename: `css/styles.css?v=[hash:6]`
		})
	],
	devServer: {
		contentBase: resolve('public/'),
		compress: true,
		port: 2000,
		allowedHosts: [
			'jozefcipa-com.test'
		]
	}
};