var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.set('port', (process.env.PORT || 3000));

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
});
io.on('connection', function(socket) {
	var socket_user = null;
    socket.on('chat message', function(msg, user) {
        io.emit('chat message', msg, user);
    });
    socket.on('join', function(user) {
    	socket_user = user;
    	io.emit('gained-user', user);
    });
    socket.on('disconnect', function() {
    	if (socket_user != null) {
    		io.emit('lost-user', socket_user)
    	}
    });
});
http.listen(app.get('port'), function() {
	console.log('Node app is running on port', app.get('port'));
});