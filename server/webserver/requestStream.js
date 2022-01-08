const zlib = require('zlib');

module.exports.getHttpBodyStream = getHttpBodyStream;

// Mostly taken from the co-body lib
function getHttpBodyStream(stream) {
  if (!stream) {
    throw new TypeError('argument stream is required')
  }

  var encoding = (stream.headers && stream.headers['content-encoding']) || 'identity';

  switch (encoding) {
  case 'gzip':
  case 'deflate':
    break
  case 'identity':
    return stream
  default:
    var err = new Error('Unsupported Content-Encoding: ' + encoding)
    err.status = 415
    throw err
  }

  // no not pass-through encoding
  delete options.encoding

  return stream.pipe(zlib.Unzip(options))
}
