(function(express, amqp) {
    'use strict';

    function consumeQueue(queueID, channel) {
        return channel.consume(
            queueID,
            (msg) => {
                if(msg !== null) {
                    let data = JSON.parse(msg.content.toString())
                    console.log(data);
                }
            },
            {
                noAck: true
            }
        );
    }

    function sendToQueue(queueID, replyID, params, channel) {
        return channel.sendToQueue(
            queueID,
            new Buffer(JSON.stringify(params)),
            {
                correlationId: generateUuid(),
                replyTo: replyID
            }
        );
    }

    function assertQueue(queueID, params, channel) {
        return channel.assertQueue(queueID).then((ok) => {
            consumeQueue(ok.queue, channel);
            sendToQueue(queueID, ok.queue, params, channel);
        });
    }

    function callService(queueID, params) {
        open
            .then((conn) => conn.createChannel())
            .then((ch) => assertQueue(queueID, params, ch))
            .catch(console.warn);
    }

    const componentRegister = {
        name: 'Toolbar',
        description: 'The toolbar component',
        route: 'http://localhost:5001',
        deps: [
            {
                name: 'Toolbar Style',
                description: '',
                uri: 'http://localhost:5001/style.css'
            }
        ]
    };

    const open = amqp.connect('amqp://localhost');
    const generateUuid = () => '${Math.random()}${Math.random()}${Math.random()}';

    let app = express();
    app.set('view engine', 'pug');
    app.use(express.static('./public'));

    app.get('/', function(req, res) {
        res.render('toolbar');
    });

    app.listen('5001', () => {
        console.log('Toolbar component running');
        callService('register_component', componentRegister);
    });
})(
    require('express'),
    require('amqplib')
);
