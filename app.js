//// server stuff ////

var http = require('http');
var fs = require('fs');
var io = require('socket.io');

var mysql = require('mysql');
var db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'auctions',
  port: '8889'
});

db.connect();

var server = http.createServer(function (request, response)
{
 //set path of index page
 if(request.url == "/index.html")
 {
    file_path = "index.html"
    //load needed pages and static files
    fs.readFile(file_path, function(error, data)
    {
       response.writeHead(200, {"Content-Type": "text/html"});  
       response.write(data);
       response.end();
    });
  }
  else if(request.url == "/style.css")
  {
      file_path = "style.css"
      //load needed pages and static files
      fs.readFile(file_path, function(error, data)
      {
        response.write(data);
        response.end();
      })
  }
 else 
 {
    response.writeHead(500, {"Content-Type": "text/html"});
    response.write('File not found!!');
    response.end();
 }  
}); 
////// end of server stuff /////

////// database stuff //////
get_auctions = function(err, result, fields) {
  if(err) throw err;
  auctions = [];
  for (i in result) {
    auctions.push(result[i]);
  }
}
db.query( 'SELECT * FROM auctions', get_auctions);

get_new_auction = function(err, result, fields) {
  if(err) throw err;
  console.log(result);
  socket.emit('get_new_auction', result);
}


///// end of database stuff /////

///// start of auction stuff /////
function Auction(item_name, item_description, bid_amt) {
  this.name = item_name;
  this.description = item_description;
  this.price = bid_amt;
  this.winner = 'be the first to bid';
}

//// socket stuff //////
//have socket io listen to server
var sockets = io.listen(server);
//listening to connection event
sockets.on('connection', function (socket){
 //listening to send message event

 socket.on('get_auctions', function (message){
  socket.emit('give_auctions', auctions);
  // console.log('auctions given')
  // console.log(message);
 });

 socket.on('add_new', function (auction){
  var query_insert = db.query("INSERT INTO auctions(name, description, winner, price, created_at, updated_at)"+
            "VALUES (?, ?, 'Be the first to bid', ?, NOW(), NOW())", [auction.name, auction.description, auction.price], function(err,result){});
  db.query("SELECT * FROM auctions ORDER BY id DESC LIMIT 1", get_new_auction);

  socket.on('show_new_auction', function (new_auction){
    console.log(new_auction);
    socket.emit('give_auctions', auctions);
    socket.broadcast.emit('give_auctions', auctions ); // gives newly added auction to everyone
  })
  
 });

socket.on('bid', function (auction){
  var id = auction.auction_id;
  // console.log(auctions);
  get_auction = function(err, result, fields) {
  if(err) throw err;
  // console.log(result);
  socket.emit('get_auction', result);
  }

  update_auction = function(err, result, fields) {
  if(err) throw err;
  }

  db.query("SELECT * FROM auctions WHERE id = ?", [id], get_auction);

  socket.on('update', function (current_auction){
    console.log("Current_auction!!!!!", current_auction);
    console.log("new_bid !!!!!! ", auction);

    if(auction.bidder_price < current_auction.current_auction_price)
    {
      var message = "Your bid is too low";
      socket.emit('error_message', message)
    }
    else if(auction.bidder_name === '')
    {
      var message = "Name cannot be blank";
      socket.emit('error_message', message);
    }
    else 
    {
      db.query('UPDATE auctions SET winner = ?, price = ?, updated_at = NOW() WHERE id = ?', [auction.bidder_name, auction.bidder_price, id], update_auction);
      current_auction.current_auction_price = auction.bidder_price;
      current_auction.current_auction_winner = auction.bidder_name;

      socket.emit('update_info', current_auction);
      socket.broadcast.emit('update_info', current_auction);
    }
    })
 });

  // var my_auction = get_matching_auction(id);
  // console.log(my_auction);
});

server.listen(8080);
console.log('Server running in localhost port 8080')