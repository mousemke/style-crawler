style-crawler 0.1.3
======================

grabs screenshots and css to produce a json file of the main styles of a website


Installation
------------

`npm i` should work, but currently there's an issue (that admittedly i just havnt gotten to look at) about injecting a file into the nighmare instance.  it's a relative path, but demands that style-crawler be the master module, so for now i suggest you skip `npm i` and instead:

```
    git clone git@github.com:mousemke/style-crawler.git
    cd style-crawler
    npm i
```


Usage
-----

```
    node crawler.js [website url]
```


This project adheres to the [Contributor Covenant](http://contributor-covenant.org/). By participating, you are expected to honor this code.

[style-crawler - Code of Conduct](https://github.com/mousemke/true-visibility/blob/master/CODE_OF_CONDUCT.md)

Need to report something? [mouse@knoblau.ch](mailto:mouse@knoblau.ch)


Changes
-------

+ 0.1.3
    + trying to reolve inject issues; suggest git clone over npm i for now

+ 0.1.1
    + such refactor!

+ 0.1.0
    + fixed package.json
    + added readme
