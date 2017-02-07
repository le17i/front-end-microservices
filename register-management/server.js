((amqp, mongoose) => {
    'use strict';

    // Open connection to amqp
    const open = amqp.connect('amqp://localhost');

    // Channels
    const queue = {
        create: 'register_component',
        get: 'get_component'
    };

    // Connect to DB
    mongoose.connect('mongodb://' + (process.env.MONGO_PORT_27017_TCP_ADDR || 'localhost') + ':27017/db');

    // Component model
    var Component = mongoose.model('Component', { name: String, description: String, route: String, deps: [] });

    open
        .then((conn) => conn.createChannel())
        .then((ch) => {
            ch.assertQueue(queue.create).then(
                (ok) => ch.consume(queue.create, (msg) => {
                    if(msg !== null) {
                        let reply = null;
                        let params = JSON.parse(msg.content.toString());
                        Component.find({route: params.route}, (err, data) => {
                            if(!err && data && data.length === 0) {
                                let newComponent = new Component(params);

                                newComponent.save((err, data) => {
                                    if(err) {
                                        reply = new Buffer(JSON.stringify({ error: err, status: 500 }));
                                    }
                                    else {
                                        reply = new Buffer(JSON.stringify({ data: data, status: 201 }));
                                    }

                                    ch.sendToQueue(msg.properties.replyTo, reply, { correlationId: msg.properties.correlationId });
                                    ch.ack(msg);
                                });
                            }
                        });
                    }
                })
            );

            ch.assertQueue(queue.get).then(
                (ok) => ch.consume(queue.get, (msg) => {
                    if(msg !== null) {
                        let params = JSON.parse(msg.content.toString());
                        Component.findOne({ route: params.route }, (err, data) => {
                            let reply = null;
                            if(err) {
                                reply = new Buffer(JSON.stringify({ error: err, status: 500 }));
                            }
                            else {
                                reply = new Buffer(JSON.stringify({ data: data, status: 200 }));
                            }

                            ch.sendToQueue(msg.properties.replyTo, reply, { correlationId: msg.properties.correlationId });
                            ch.ack(msg);
                        });
                    }
                })
            );
        })
        .catch(console.warn);
})(
  require('amqplib'),
  require('mongoose')
);
