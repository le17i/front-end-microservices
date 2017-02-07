(function(express, bodyParser, mongoose, request, pug) {
    'use strict';

    // Connect to DB
    mongoose.connect('mongodb://' + (process.env.MONGO_PORT_27017_TCP_ADDR || 'localhost') + ':27017/db');

    let app = express();

    let Route = mongoose.model('Route', { route: String, components: [] });
    var Component = mongoose.model('Component', { name: String, description: String, route: String, deps: [] });

    function getComponents(uri, promises) {
        promises.push(new Promise((resolve, reject) => {
            request(uri, function (error, response, body) {
                if(error) {
                    reject(error);
                }
                if(!error && response.statusCode === 200) {
                    let content = '';
                    if(uri.endsWith('.css')) {
                        content = '<style>' + body + '</style>';
                    }
                    else if(uri.endsWith('.js')) {
                        content = '<script>' + body + '</script>';
                    }
                    else  {
                        content = body;
                    }
                    resolve(content);
                }
            });
        }));
    }

    app.get('/:route', function(req, res) {
        return Route.findOne({ route: req.params.route }, function(err, data) {
            if(err) return res.json(err);
            if(data) {
                let ids = [];
                let URIs = [];

                data.components.map((c) => ids.push({ _id: c }));
                Component.find({ '$or': ids }, (errComponents, components) => {
                    if(errComponents) return res.json(errComponents);

                    components.map((component) => {
                        URIs.push(component.route);
                        component.deps.map((d) => URIs.push(d.uri));
                    });

                    let promises = [];

                    URIs.map((uri) => getComponents(uri, promises));
                    Promise.all(promises).then((content) => {
                        let html = content.join('');
                        return res.send(html);
                    });
                });
            } else {
                res.status(404).json({message: 'Not Found', status: 404});
            }
        });
    });

    app.listen(5000, () => {
        Route.findOne({route: 'main'}, (err, data) => {
            if(!err && data && data.length === 0) {
                let route = new Route({route: 'main', components: ['5899b5441b3f5e1eec2650fc']});
                route.save();
            }
        });
    });
})
(
    require('express'),
    require('body-parser'),
    require('mongoose'),
    require('request'),
    require('pug')
);
