/*
    Copyright (C) 2015  PencilBlue, LLC

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

module.exports = function S3MediaProviderModule(pb) {

    //pb dependencies
    var util          = pb.util;
    var PluginService = pb.PluginService;
    var Aws           = require('aws-sdk');

    /**
     * Media provider to upload files to S3
     * @class S3MediaProvider
     * @constructor
     * @implements MediaProvider
     */
    function S3MediaProvider() {

        /**
         *
         * @property pluginService
         * @type {PluginService}
         */
        this.pluginService = new PluginService();
    };

    /**
     * Retrieves an instance of the Amazon S3 client
     * @method getClient
     * @param {Function} cb A callback that provides parameters: The first an
     * error, if occurred.  The second is an S3 instance for interfacing with
     * Amazon S3.  The last parameter is the hash of the plugin settings.
     */
    S3MediaProvider.prototype.getClient = function(cb) {
        this.pluginService.getSettingsKV('s3-pencilblue', function(err, setts) {
            if (util.isError(err)) {
                return cb(err);
            }
            if(setts.useIAMRoles) {
                delete setts.accessKeyId;
                delete setts.secretAccessKey;
            }
            var client = new Aws.S3(setts);
            cb(null, client, setts);
        });
    };

    /**
     * Retrieves the item in S3 as a stream.
     * @method getStream
     * @param {String} mediaPath The path/key to the media.  Typically this is a
     * path such as: /media/2014/9/540a3ff0e30ddfb9e60000be-1409957872680.jpg
     * @param {Object} [options] Options for interacting with S3
     * @param {String} [options.bucket] The S3 bucket to interact with
     * @param {Function} cb A callback that provides two parameters: An Error, if
     * occurred and a ReadableStream that contains the media content.
     */
    S3MediaProvider.prototype.getStream = function(mediaPath, options, cb) {
        if (util.isFunction(options)) {
            cb    = options;
            options = {};
        }
        else if (!util.isObject(options)) {
            return cb(new Error('The options parameter must be an object'));
        }

        //get an s3 client instance
        this.getClient(function(err, s3, settings) {
            if (util.isError(err)) {
                return cb(err);
            }

            var params = {
                Bucket: options.bucket || pb.config.media.bucket || settings.bucket, /* required */
                Key: S3MediaProvider.mediaPathTransform(mediaPath), /* required */
    //            IfMatch: 'STRING_VALUE',
    //            IfModifiedSince: new Date || 'Wed Dec 31 1969 16:00:00 GMT-0800 (PST)' || 123456789,
    //            IfNoneMatch: 'STRING_VALUE',
    //            IfUnmodifiedSince: new Date || 'Wed Dec 31 1969 16:00:00 GMT-0800 (PST)' || 123456789,
    //            Range: 'STRING_VALUE',
    //            ResponseCacheControl: 'STRING_VALUE',
    //            ResponseContentDisposition: 'STRING_VALUE',
    //            ResponseContentEncoding: 'STRING_VALUE',
    //            ResponseContentLanguage: 'STRING_VALUE',
    //            ResponseContentType: 'STRING_VALUE',
    //            ResponseExpires: new Date || 'Wed Dec 31 1969 16:00:00 GMT-0800 (PST)' || 123456789,
    //            SSECustomerAlgorithm: 'STRING_VALUE',
    //            SSECustomerKey: 'STRING_VALUE',
    //            SSECustomerKeyMD5: 'STRING_VALUE',
    //            VersionId: 'STRING_VALUE'
            };
            cb(null, s3.getObject(params).createReadStream());
        });
    };

    /**
     * Retrieves the content from S3 as a String or Buffer.
     * @method get
     * @param {String} mediaPath The path/key to the media.  Typically this is a
     * path such as: /media/2014/9/540a3ff0e30ddfb9e60000be-1409957872680.jpg
     * @param {Object} [options] Options for interacting with S3
     * @param {String} [options.bucket] The S3 bucket to interact with
     * @param {Function} cb A callback that provides two parameters: An Error, if
     * occurred and an entity that contains the media content.
     */
    S3MediaProvider.prototype.get = function(mediaPath, options, cb) {
        if (util.isFunction(options)) {
            cb    = options;
            options = {};
        }
        else if (!util.isObject(options)) {
            return cb(new Error('The options parameter must be an object'));
        }

        //retrieve the client
        this.getClient(function(err, s3, settings) {
            if (util.isError(err)) {
                return cb(err);
            }

            //retrieve the media
            var params = {
                Bucket: options.bucket || pb.config.media.bucket || settings.bucket, /* required */
                Key: S3MediaProvider.mediaPathTransform(mediaPath), /* required */
    //            IfMatch: 'STRING_VALUE',
    //            IfModifiedSince: new Date || 'Wed Dec 31 1969 16:00:00 GMT-0800 (PST)' || 123456789,
    //            IfNoneMatch: 'STRING_VALUE',
    //            IfUnmodifiedSince: new Date || 'Wed Dec 31 1969 16:00:00 GMT-0800 (PST)' || 123456789,
    //            Range: 'STRING_VALUE',
    //            ResponseCacheControl: 'STRING_VALUE',
    //            ResponseContentDisposition: 'STRING_VALUE',
    //            ResponseContentEncoding: 'STRING_VALUE',
    //            ResponseContentLanguage: 'STRING_VALUE',
    //            ResponseContentType: 'STRING_VALUE',
    //            ResponseExpires: new Date || 'Wed Dec 31 1969 16:00:00 GMT-0800 (PST)' || 123456789,
    //            SSECustomerAlgorithm: 'STRING_VALUE',
    //            SSECustomerKey: 'STRING_VALUE',
    //            SSECustomerKeyMD5: 'STRING_VALUE',
    //            VersionId: 'STRING_VALUE'
            };
            s3.getObject(params, function(err, data) {
                if (util.isError(err)) {
                    return cb(err);
                }

                var body = data.Body;
                if (body instanceof Buffer || util.isString(body)) {
                    cb(null, body);
                }
                else {
                    //we assume (dangerously) that it is a stream

                    var file = '';
                    body.on('data', function(data) {
                        file += data;
                    })
                    .on('error', function(err) {
                        cb(err);
                    })
                    .on('end', function() {
                        cb(null, file);
                    });
                }
            });
        });
    };

    /**
     * Sets media content into an S3 bucket based on the specified media path and
     * options.  The stream provided must be a ReadableStream.
     * @method setStream
     * @param {ReadableStream} stream The content stream
     * @param {String} mediaPath The path/key to the media.  Typically this is a
     * path such as: /media/2014/9/540a3ff0e30ddfb9e60000be-1409957872680.jpg
     * @param {Object} [options] Options for interacting with S3
     * @param {String} [options.bucket] The S3 bucket to interact with
     * @param {Function} cb A callback that provides two parameters: An Error, if
     * occurred and the success of the operation.
     */
    S3MediaProvider.prototype.setStream = function(stream, mediaPath, options, cb) {
        this.set(stream, mediaPath, options || {}, cb);
    };

    /**
     * Sets media content into an S3 bucket based on the specified media path and
     * options.  The data must be in the form of a String or Buffer.
     * @method setStream
     * @param {String|Buffer|Stream} fileDataStrOrBuffOrStream The content to persist
     * @param {String} mediaPath The path/key to the media.  Typically this is a
     * path such as: /media/2014/9/540a3ff0e30ddfb9e60000be-1409957872680.jpg
     * @param {Object} [options] Options for interacting with S3
     * @param {String} [options.bucket] The S3 bucket to interact with
     * @param {Function} cb A callback that provides two parameters: An Error, if
     * occurred and the success of the operation.
     */
    S3MediaProvider.prototype.set = function(fileDataStrOrBuffOrStream, mediaPath, options, cb) {
        if (util.isFunction(options)) {
            cb      = options;
            options = {};
        }
        else if (!util.isObject(options)) {
            return cb(new Error('The options parameter must be an object'));
        }

        this.getClient(function(err, s3, settings) {
            if (util.isError(err)) {
                return cb(err);
            }
            var params = {
                Bucket: options.bucket || pb.config.media.bucket || settings.bucket, /* required */
                Key: S3MediaProvider.mediaPathTransform(mediaPath), /* required */
                Body: fileDataStrOrBuffOrStream,
                Metadata: {
                     references: "1"
                }
    //            ACL: 'private | public-read | public-read-write | authenticated-read | bucket-owner-read | bucket-owner-full-control',
    //            CacheControl: options.cache'STRING_VALUE',
    //            ContentDisposition: 'STRING_VALUE',
    //            ContentEncoding: 'STRING_VALUE',
    //            ContentLanguage: 'STRING_VALUE',
    //            ContentLength: 0,
    //            ContentMD5: 'STRING_VALUE',
    //            ContentType: 'STRING_VALUE',
    //            Expires: new Date || 'Wed Dec 31 1969 16:00:00 GMT-0800 (PST)' || 123456789,
    //            GrantFullControl: 'STRING_VALUE',
    //            GrantRead: 'STRING_VALUE',
    //            GrantReadACP: 'STRING_VALUE',
    //            GrantWriteACP: 'STRING_VALUE',
    //            Metadata: {
    //            someKey: 'STRING_VALUE',
    //            /* anotherKey: ... */
    //            },
    //            SSECustomerAlgorithm: 'STRING_VALUE',
    //            SSECustomerKey: 'STRING_VALUE',
    //            SSECustomerKeyMD5: 'STRING_VALUE',
    //            ServerSideEncryption: 'AES256',
    //            StorageClass: 'STANDARD | REDUCED_REDUNDANCY',
    //            WebsiteRedirectLocation: 'STRING_VALUE'
            };

            //place object in bucket
            s3.putObject(params, cb);
        });
    };

    /**
     * Part of the interface but isn't used anywhere yet.  This implementation
     * throw an error because it is not implemented.
     * @method createWriteStream
     * @param {String} mediaPath The path/key to the media.  Typically this is a
     * path such as: /media/2014/9/540a3ff0e30ddfb9e60000be-1409957872680.jpg
     * @param {Function} cb A callback that provides two parameters: An Error, if
     * occurred and a WriteableStream.
     */
    S3MediaProvider.prototype.createWriteStream = function(mediaPath, cb) {
        throw new Error('Not implemented!');
    };

    /**
     * Checks to see if the file actually exists in S3
     * @method exists
     * @param {String} mediaPath The path/key to the media.  Typically this is a
     * path such as: /media/2014/9/540a3ff0e30ddfb9e60000be-1409957872680.jpg
     * @param {Function} cb A callback that provides two parameters: An Error, if
     * occurred and a Boolean.
     */
    S3MediaProvider.prototype.exists = function(mediaPath, cb) {
        this.stat(mediaPath, function(err, stat) {
            cb(null, stat ? true : false);
        });
    };

    /**
     * Deletes a file out of S3
     * @method delete
     * @param {String} mediaPath The path/key to the media.  Typically this is a
     * path such as: /media/2014/9/540a3ff0e30ddfb9e60000be-1409957872680.jpg
     * @param {Object} [options] Options for interacting with S3
     * @param {String} [options.bucket] The S3 bucket to interact with
     * @param {Function} cb A callback that provides two parameters: An Error, if
     * occurred and the success of the operation.
     */
    S3MediaProvider.prototype.delete = function(mediaPath, options, cb) {
        if (util.isFunction(options)) {
            cb      = options;
            options = {};
        }
        else if (!util.isObject(options)) {
            return cb(new Error('The options parameter must be an object'));
        }

        //retrieve the client
        this.getClient(function(err, s3, settings) {
            if(util.isError(err)) {
                return cb(err);
            }

            var params = {
                Bucket: options.bucket || pb.config.media.bucket || settings.bucket, /* required */
                Key: S3MediaProvider.mediaPathTransform(mediaPath), /* required */
                //            MFA: 'STRING_VALUE',
                //            VersionId: 'STRING_VALUE'
            };

            //retrieve metadata

            s3.headObject(params, function(error, result) {
                if(util.isError(error) || !result) {
                    var err = error ? error : new Error('No results returned');
                    return cb(err);
                }

                var metadata = result.Metadata || {};
                var references = metadata.references;

                //if references is undefined, delete because it hasn't been given metadata so it is not referenced elsewhere
                if (!references || references === "1") {
                    s3.deleteObject(params, cb);
                } else {
                    adjustReferencesCount(s3, references, params, false, cb);
                }
            });
        });
    };

    /**
     * Increments references metadata in S3 to account for copied over media data
     * @method addReferences
     * @param {String} mediaPath The path/key to the media.  Typically this is a
     * path such as: /media/2014/9/540a3ff0e30ddfb9e60000be-1409957872680.jpg
     * @param {Function} cb A callback that provides two parameters: An Error, if
     * occurred and an entity that contains the media content.
     */
    S3MediaProvider.prototype.addReferences = function(mediaPath, cb) {
        //retrieve the client
        this.getClient(function(err, s3, settings) {
            if(util.isError(err)) {
                return cb(err);
            }

            var params = {
                Bucket: pb.config.media.bucket || settings.bucket, /* required */
                Key: S3MediaProvider.mediaPathTransform(mediaPath), /* required */
                //            MFA: 'STRING_VALUE',
                //            VersionId: 'STRING_VALUE'
            };

            //retrieve metadata
            s3.headObject(params, function(error, result) {
                if(util.isError(error) || !result) {
                    var err = error ? error : new Error('No results returned');
                    return cb(err);
                }

                var metadata = result.Metadata || {};
                var references = metadata.references;

                //if references is undefined, make references 1 because metadata hasn't been created yet so it only exists once
                if (!references) {
                    references = "1";
                }
                adjustReferencesCount(s3, references, params, true, cb);
            });
        });
    };

    function adjustReferencesCount(s3, references, params, shouldIncrement, cb) {
        references = parseInt(references);
        references = shouldIncrement ? (references + 1) : (references - 1);
        references += "";
        params.Metadata = {
            references: references
        };
        params.MetadataDirective = 'REPLACE';
        params.CopySource = encodeURI(params.Bucket + "/" + params.Key);
        s3.copyObject(params, cb);
    }

    /**
     * Retrieve the stats on the file
     * @method stat
     * @param {String} mediaPath The path/key to the media.  Typically this is a
     * path such as: /media/2014/9/540a3ff0e30ddfb9e60000be-1409957872680.jpg
     * @param {Function} cb A callback that provides two parameters: An Error, if
     * occurred and an object that contains the file stats
     */
    S3MediaProvider.prototype.stat = function(mediaPath, cb) {
        this.getClient(function(err, s3, settings) {
            if(util.isError(err)) {
                return cb(err);
            }

            var options = {
                Bucket: pb.config.media.bucket || settings.bucket, /* required */
                Key: S3MediaProvider.mediaPathTransform(mediaPath), /* required */
    //            IfMatch: 'STRING_VALUE',
    //            IfModifiedSince: new Date || 'Wed Dec 31 1969 16:00:00 GMT-0800 (PST)' || 123456789,
    //            IfNoneMatch: 'STRING_VALUE',
    //            IfUnmodifiedSince: new Date || 'Wed Dec 31 1969 16:00:00 GMT-0800 (PST)' || 123456789,
    //            Range: 'STRING_VALUE',
    //            SSECustomerAlgorithm: 'STRING_VALUE',
    //            SSECustomerKey: 'STRING_VALUE',
    //            SSECustomerKeyMD5: 'STRING_VALUE',
    //            VersionId: 'STRING_VALUE'
            };
            s3.headObject(options, cb);
        });
    };

    /**
     * S3 isn't a huge fan of "/" characters prefixing keys.
     * This function strips that out if it is the first character in the path.
     * @static
     * @method mediaPathTransform
     * @param {String} mediaPath
     * @return {String} The media path without any prefixing "/"
     */
    S3MediaProvider.mediaPathTransform = function(mediaPath) {
        if (util.isString(mediaPath) && mediaPath.indexOf('/') === 0) {
            mediaPath = mediaPath.substring(1);
        }
        return mediaPath;
    };

    //exports
    return S3MediaProvider;
};
