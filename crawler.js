/**
 * ## Style crawler
 *
 * pulls the important css and site colors into json
 *
 * @author  Mouse Braun         <mouse@knoblau.ch>
 */
const Nightmare     = require( 'nightmare' );
const getColors     = require( 'get-image-colors' );
const fs            = require( 'fs' );
const config        = require( './config' );


/**
 * ## buildTagSafe
 *
 * returns a filename safe version of the passed tag
 *
 * @param {String} tag original tag
 *
 * @return _String_ modified tag
 */
var buildTagSafe = function( tag )
{
    return tag.split( ',' )[0].replace( ' ', '-' );
};


/**
 * ## buildUrlFileName
 *
 * normalizes the passed url for use as a directory name
 *
 * @param {String} url actual url
 *
 * @return _String_ normalized url
 */
var buildUrlFileName = function( url )
{
    url = url.replace( /https?:\/\//, '' ).replace( /\//g, '-' );

    var urlLength = url.length;

    if ( url[ urlLength - 1 ] === '-' )
    {
        url = url.slice( 0, urlLength - 1 );
    }

    return url;
};


/**
 * ## createDirectory
 *
 * build directory if it doesnt exist
 *
 * @param {String} screenshotDir directory to check
 *
 * @return _Void_
 */
var createDirectory = function( screenshotDir )
{
    if ( !fs.existsSync( './data' ) )
    {
        fs.mkdirSync( './data' );
    }

    if ( !fs.existsSync( screenshotDir ) )
    {
        fs.mkdirSync( screenshotDir );
    }
};


/**
 * ## getBoundingRectangle
 *
 * gets the position and size of an element
 *
 * @param {String} tag css selector
 *
 * @return _Object_ coords of the element
 */
var getBoundingRectangle = function( tag )
{
    /**
     * ## checkVisible
     *
     * isVisible is injected into the page, but due to the UMD nature of
     * true-visibility, we have to do stupid things if the page is using requirejs
     *
     * @param {DOMElement} el element to check
     *
     * @return _Boolean_ visible or not
     */
    var checkVisible = function( el )
    {
        if ( typeof define === 'function' && define.amd )
        {
            return new Promise( function( resolve, reject )
            {
                requirejs( [ 'true-visibility' ], function( isVisible )
                {
                    resolve( isVisible( el ) );
                } );
            } );
        }
        else
        {
           return isVisible( el );
        }
    };


    var els = document.querySelectorAll( tag );

    var el, elIsVisible;

    for ( var i = 0, lenI = els.length; i < lenI; i++ )
    {
        el = els[ i ];
        elIsVisible = checkVisible( el );

        el = elIsVisible ? el : null;

        if ( el )
        {
            break;
        }
    }


    if ( el )
    {
        var rect    = el.getBoundingClientRect();
        var style   = getComputedStyle( el );

        var paddedWidth = rect.width +
                            parseInt( style[ 'padding-left' ] ) +
                            parseInt( style[ 'padding-right' ] );
        var paddedHeight = rect.height +
                            parseInt( style[ 'padding-top' ] ) +
                            parseInt( style[ 'padding-bottom' ] );


        return {
            x       : Math.floor( rect.left ),
            y       : Math.floor( rect.top ),
            width   : Math.floor( paddedWidth ),
            height  : Math.floor( paddedHeight )
        };
    }

    return null;
};


/**
 * ## getScreenshot
 *
 * recursively moves through the tags to get screenshots of all desired elements
 *
 * @param {Number} count recursive count towards length
 * @param {Object} _nightmare nightmare instance
 * @param {Object} _resolve promise resolution
 *
 * @return _Void_
 */
var getScreenshot = function( count, _nightmare, _resolve )
{
    var tag     = config.tags[ count ];
    var tagSafe = buildTagSafe( tag );

    _nightmare.evaluate( getBoundingRectangle, tag )
        .then( rect =>
        {
            if ( rect )
            {
                console.log( tag, rect );
                var path = screenshotDir + '/' + tagSafe + '.png';

                return _nightmare.scrollTo( rect.y, rect.x )
                                .screenshot( path, rect );
            }
        } )
        .then( function()
        {
            if ( count === config.tags.length - 1 )
            {
                _resolve( _nightmare.end() );
            }
            else
            {
                getScreenshot( count + 1, _nightmare, _resolve );
            }
        } );
};


/**
 * ## init
 *
 * the nightmare begins
 *
 * @return _Void_
 */
var init = function()
{
    console.log( 'Started. This can take a while...' );

    createDirectory( screenshotDir );
    promiseScreenshots();

    var nightmare = Nightmare();
    nightmare.goto( url )
        .evaluate( scrapeStyles, config )
        .end()
        .then( writeStyleJSON );
};


/**
 * ## promiseAllRelevantColors
 *
 * sets a promise.all for analyzing each screenshot
 *
 * @return _Void_
 */
var promiseAllRelevantColors = function()
{
    Promise.all( config.tags.map( promiseRelevantColors ) ).then( function( res )
    {
        res = res.filter( filterArray );
        writeRelavantColorsJSON( res );
    },
    error => console.log( 'Error: ', error.message ) );
};


/**
 * ## promiseRelevantColors
 *
 * analyzes a screenshot and extracts the important colors
 *
 * @param {String} tag selector
 *
 * @return _Promise_ the nightmare must end eventually
 */
var promiseRelevantColors = function( tag )
{
    return new Promise( function( resolve, reject )
    {
        var tagSafe = buildTagSafe( tag );
        var path    = screenshotDir + '/' + tagSafe + '.png';

        fs.stat( path, function( err, stats )
        {
            if ( !err && stats && stats.size > 0 )
            {
                getColors( path, ( err, _colors ) =>
                {
                    if ( _colors )
                    {
                        resolve( {
                            tag     : tagSafe,
                            colors  : _colors
                        } );
                    }
                } );
            }
            else if ( stats && stats.size === 0 )
            {
                console.log( path + ' removed due to 0 size' );
                fs.unlink( path );
                resolve( null );
            }
            else
            {
                resolve( null );
            }
        } );
    } );
};


/**
 * ## promiseScreenshots
 *
 * promises to return screenshots of all the tags
 *
 * @return _Void_
 */
var promiseScreenshots = function()
{
    new Promise( function( resolve, reject )
    {
        var nightmare = new Nightmare();

        nightmare.goto( url )
            .evaluate( function()
            {
                var rect = document.body.getBoundingClientRect();
                return {
                    width : rect.width,
                    height : rect.height
                };
            } )
            .then( function( bodyRect )
            {
                nightmare.viewport( parseInt( bodyRect.width ),
                                    parseInt( bodyRect.height ) + 22 )
                    .wait( 1000 )
                    .inject( 'js', './node_modules/true-visibility/dist/true-visibility.min.js' )
                    .then( () => getScreenshot( 0, nightmare, resolve ) );
            } );

    } ).then( function()
    {
        console.log( 'Analyzing screenshots...' );

        promiseAllRelevantColors();
    },
    error => console.log( 'Error: ', error.message ) );
};


/**
 * ## scrapeStyles
 *
 * for each desired tag, gets the desired css props, throws them all in an
 * object and returns them
 *
 * @param {Object} config tags and props
 *
 * @return _Object_ retrieved styles
 */
var scrapeStyles = function( config )
{
    var style   = {};

    config.tags.forEach( function( tag )
    {
        var _style  = {};
        var _tag    = document.querySelector( tag )

        if ( _tag )
        {
            _tag = getComputedStyle( _tag );

            config.props.forEach( function( _p )
            {
                _style[ _p ] = _tag[ _p ];
            } );

            style[ tag ] = _style;
        }
    } );

    return style;
};


/**
 * ## writeJson
 *
 * writes an object to a file as JSON
 *
 * @param {Object} obj object to stringify and write
 * @param {String} filename file to write to
 * @param {String} message success message
 *
 * @return _Void_
 */
var writeJson = function( obj, filename, message )
{
    fs.writeFile( screenshotDir + '/' + filename + '.json', JSON.stringify( obj ), function( err )
    {
        if ( err )
        {
            console.log( err );
        }
        else
        {
            console.log( message );
        }
    } );
};


/**
 * ## writeRelavantColorsJSON
 *
 * preps the colors object for write
 *
 * @param {Object} colors css retrieved from the url
 *
 * @return _Void_
 */
var writeRelavantColorsJSON = function( colors )
{
    var _colors = {};
    colors.forEach( function( _color )
    {
        _colors[ _color.tag ] = _color.colors.map( _c => _c.rgb() );
    } );

    writeJson( _colors, 'colors', 'screenshot colors retrieved' );
};


/**
 * ## writeStyleJSON
 *
 * preps the styles object for write
 *
 * @param {Object} style css retrieved from the url
 *
 * @return _Void_
 */
var writeStyleJSON = function( style )
{
    var tagStyle;
    for ( var tag in style )
    {
        tagStyle = style[ tag ];

        if ( tagStyle[ 'background-color' ] === 'rgba(0, 0, 0, 0)' &&
            tagStyle[ 'background-image' ] !== 'none' )
        {
            console.log( tag + ' - bgimage candidate' );
            /*
                'background-color' === getColor( 'background-image' )
            */
        }
    }

    writeJson( style, 'css', 'css retrieved' );
};


/*
 * first argument passed becomes url
 */
const url           = process.argv[ 2 ];
const urlFileName   = buildUrlFileName( url );
const screenshotDir = './data/' + urlFileName;
const filterArray   = function( e ){ return !!e; };

init();
