const path = require('path');

module.exports = {
  output: {
    path: path.join(__dirname, '/dist'),
    filename: 'index.bundle.js',
    publicPath: '/scasm/'
  },
  devServer: {
    contentBase: path.join(__dirname, 'src'),
    compress: true,
    port: 3000,
    watchContentBase: true,
    publicPath: '/public/',
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/i,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        },
      },
      {
        test: /\.css$/i,
        use: ["style-loader","css-loader"]
      }
    ],
  },
};