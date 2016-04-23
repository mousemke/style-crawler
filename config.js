/*
 * config options
 */
module.exports = {
    tags    : [
        'body',
        'header, #header, #hd, .header',
        'nav, #nav, .main_nav, .main--nav, .nav',
        'section',
        'content',
        'footer, #footer, .footer',
        'main, #main, [role=main], .main'
    ],
    props   : [
        'background-color',
        'background-image',     // these 2 should be able to overwrite bgcolor
        'background-repeat',    // these 2 should be able to overwrite bgcolor
        'box-shadow',
        'color',
        'font-family',
        'font-size',
        'font-weight',
        'line-height',
        'text-transform',
        'text-shadow'
    ]
};