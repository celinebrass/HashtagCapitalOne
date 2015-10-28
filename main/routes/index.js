var express = require('express');
var router = express.Router();
var async = require('async');

//configure the instagram API
var ig = require('instagram-node').instagram();
ig.use({ client_id: '5359dff26274474d8131dff1e15d2abc',
         client_secret: 'ef149b4c9cb1404fb518d61bacaff04c' });
//configure Alchemy API (used for sentiment analysis)
var AlchemyAPI = require('../alchemyapi');
var alchemyapi = new AlchemyAPI();

var path = require("path");


/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Recent Instagram Activity' });
});

/* GET home page json (20 most recent posts) */
router.get('/recent_json', function (req, res){
	async.waterfall([
		//find the most recent 20 posts
		function (done) {
			ig.tag_media_recent('capitalone', [null, null], function(err, medias, pagination, remaining, limit) {
				done(err, medias);
			});
		},
		//for each one, find the sentiment using alchemy 
		function (medias, done){
			var postArray = [];
			async.forEach(medias, function (post, end){
				var postJson = {'name': "", 
								'post' : "", 
								'likeCount'  : " ",
								'sentNum'    : "0",
								'sentWord'   : " ", 
								'createdTime': " ", 
								'pictureLink': " ", 
								'username'   : " ",
								'userId'	 : " "};
				var caption = post.caption.text;
				caption = caption.replace("\n", " ");
				//get all versions of "capital one" in the same format
				Sent_text = normalizeString(caption);

				alchemyapi.sentiment_targeted("text", newText, "CAPITALONE", {}, function(response) {
					postJson.name = post.user.full_name;
					postJson.username = post.user.username;
					postJson.post = caption;
					postJson.pictureLink = post.images.thumbnail.url;
					postJson.createdTime = new Date(post.created_time * 1000)
					postJson.likeCount = post.likes.count;
					postJson.userId =  post.user.id;
					if (response.status == 'OK'){
						if (response.docSentiment.score!=undefined){
							postJson.sentNum = response.docSentiment.score;
							if (response.docSentiment.score < -.7){
								postJson.sentWord = "Very Negative" 
							}
							else if (response.docSentiment.score < -.4){
								postJson.sentWord = "Fairly Negative"
							}
							else if (response.docSentiment.score < -.1){
								postJson.sentWord = "Slightly Negative"
							}
							else if (response.docSentiment.score < .1){
								postJson.sentWord = "Neutral"
							}
							else if (response.docSentiment.score < .4){
								postJson.sentWord = "Slightly Postive"
							}
							else if (response.docSentiment.score < .7){
								postJson.sentWord = "Fairly Postive"
							}
							else {
								postJson.sentWord = "Very Postive"
							}
						}
						else if (response.docSentiment.type == 'neutral'){
							postJson.sentWord = "Neutral";
						}
						else {
							postJson.sentWord = "Could not analyze."
						}
					}
					else {
						postJson.sentWord = "Could not analyze."
					}
					postArray.push(postJson);
					end();

				});

			}, function (err){
				res.json(postArray);
			});
		}

	]);
});

/* GET home page user table json */
router.get('/user_json/:id', function (req, res){
	var userId = req.params.id;
	var userJson = {"pictureLink": " ",
					"bio"		 : " ",
					"followsCount": 0,
					"followsByCount" : 0,
					"postCount"  : 0};
	var userArray = [];
	ig.user(userId, function(err, userObj, remaining, limit) {
		if (err) res.json('[]');
		var bioString = userObj.bio.replace("\n", " ");
		userJson.pictureLink = userObj.profile_picture;
		userJson.bio = bioString;
		userJson.followsCount = userObj.counts.follows;
		userJson.followedByCount = userObj.counts.followed_by;
		userJson.postCount = userObj.counts.media;
		var str = JSON.stringify(userJson, null, 4);
		userArray.push(userJson);

		res.json(userArray);
	});
});
/* GET trend page json (100 most recent posts) */
router.get('/data_trend_json', function (req, res){
	var postArray = [];
	async.waterfall([ function (done) {
		var posts = function(err, medias, pagination, remaining, limit) {
			if (err) throw err;
			medias.forEach(function (post){
				postArray.push(post);
			})
			if (pagination.next && postArray.length<100) {
				pagination.next(posts);
				var str = JSON.stringify(postArray[postArray.length - 1], null, 2);
			}
			else {done(err, postArray)}
		};
		ig.tag_media_recent('capitalone', posts); 
	}, function (postArray, done){
		var sentimentJson = []
		async.forEach(postArray, function (post, callback){
			var caption = post.caption.text.replace("\n", " ");
			var newCaption = normalizeString(caption);
			var postJson = {'createdTime':"",
							'sentiment' : "0"};
			alchemyapi.sentiment_targeted("text", newCaption, "CAPITALONE", {}, function(response) {
				postJson.createdTime = new Date(post.created_time * 1000)
				if (response.status == 'OK'){
					if (response.docSentiment.score!=undefined){
						postJson.sentiment = response.docSentiment.score;
					}
				}
				sentimentJson.push(postJson);
				callback();

			});
		},function (err){ res.json(sentimentJson.reverse());}); 
	}]);
});
/* GET test data (a data set collected on 10/27)*/
router.get('/test_data', function(req,res){
	res.json([{"createdTime":"2015-10-27T08:37:21.000Z","sentiment":"0"},{"createdTime":"2015-10-27T08:04:04.000Z","sentiment":"0.656764"},{"createdTime":"2015-10-27T00:52:29.000Z","sentiment":"0"},{"createdTime":"2015-10-27T02:27:10.000Z","sentiment":"0.593199"},{"createdTime":"2015-10-27T02:42:28.000Z","sentiment":"0"},{"createdTime":"2015-10-27T04:43:55.000Z","sentiment":"0"},{"createdTime":"2015-10-27T11:25:29.000Z","sentiment":"0"},{"createdTime":"2015-10-27T07:00:38.000Z","sentiment":"0"},{"createdTime":"2015-10-27T13:43:14.000Z","sentiment":"0"},{"createdTime":"2015-10-27T13:57:09.000Z","sentiment":"0"},{"createdTime":"2015-10-27T09:01:59.000Z","sentiment":"0"},{"createdTime":"2015-10-27T10:14:11.000Z","sentiment":"0"},{"createdTime":"2015-10-27T10:21:15.000Z","sentiment":"0"},{"createdTime":"2015-10-27T14:12:47.000Z","sentiment":"0"},{"createdTime":"2015-10-27T10:37:13.000Z","sentiment":"0.236251"},{"createdTime":"2015-10-27T11:22:46.000Z","sentiment":"-0.262027"},{"createdTime":"2015-10-27T14:22:21.000Z","sentiment":"0"},{"createdTime":"2015-10-27T15:01:09.000Z","sentiment":"0"},{"createdTime":"2015-10-27T14:43:47.000Z","sentiment":"0"},{"createdTime":"2015-10-27T15:06:57.000Z","sentiment":"0"},{"createdTime":"2015-10-27T15:36:36.000Z","sentiment":"0.330726"},{"createdTime":"2015-10-27T17:43:46.000Z","sentiment":"0.32713"},{"createdTime":"2015-10-27T17:19:07.000Z","sentiment":"0.308983"},{"createdTime":"2015-10-27T15:33:02.000Z","sentiment":"0"},{"createdTime":"2015-10-27T17:28:10.000Z","sentiment":"0.277676"},{"createdTime":"2015-10-27T19:07:56.000Z","sentiment":"0.237439"},{"createdTime":"2015-10-27T19:41:28.000Z","sentiment":"0"},{"createdTime":"2015-10-27T19:03:17.000Z","sentiment":"0"},{"createdTime":"2015-10-27T17:43:16.000Z","sentiment":"0"},{"createdTime":"2015-10-27T20:27:36.000Z","sentiment":"0"},{"createdTime":"2015-10-27T17:52:22.000Z","sentiment":"0"},{"createdTime":"2015-10-27T19:41:31.000Z","sentiment":"0"},{"createdTime":"2015-10-27T19:53:30.000Z","sentiment":"0"},{"createdTime":"2015-10-27T20:34:56.000Z","sentiment":"0"},{"createdTime":"2015-10-27T20:14:59.000Z","sentiment":"0"},{"createdTime":"2015-10-27T20:17:02.000Z","sentiment":"0"},{"createdTime":"2015-10-27T20:46:44.000Z","sentiment":"0"},{"createdTime":"2015-10-27T21:00:18.000Z","sentiment":"0"},{"createdTime":"2015-10-27T20:49:41.000Z","sentiment":"0"},{"createdTime":"2015-10-27T20:38:19.000Z","sentiment":"0"},{"createdTime":"2015-10-27T21:43:09.000Z","sentiment":"0"},{"createdTime":"2015-10-27T21:01:02.000Z","sentiment":"0"},{"createdTime":"2015-10-27T21:12:57.000Z","sentiment":"0.243863"},{"createdTime":"2015-10-27T21:12:05.000Z","sentiment":"0"},{"createdTime":"2015-10-27T21:16:00.000Z","sentiment":"0"},{"createdTime":"2015-10-27T21:47:21.000Z","sentiment":"0"},{"createdTime":"2015-10-27T21:52:52.000Z","sentiment":"0"},{"createdTime":"2015-10-27T21:30:35.000Z","sentiment":"0.386967"},{"createdTime":"2015-10-27T21:38:00.000Z","sentiment":"0"},{"createdTime":"2015-10-27T21:57:41.000Z","sentiment":"0.372895"},{"createdTime":"2015-10-27T22:02:16.000Z","sentiment":"-0.284108"},{"createdTime":"2015-10-27T22:09:31.000Z","sentiment":"0"},{"createdTime":"2015-10-27T22:47:54.000Z","sentiment":"0"},{"createdTime":"2015-10-27T21:57:05.000Z","sentiment":"-0.295072"},{"createdTime":"2015-10-27T21:59:37.000Z","sentiment":"0"},{"createdTime":"2015-10-27T22:29:50.000Z","sentiment":"0"},{"createdTime":"2015-10-27T22:25:44.000Z","sentiment":"0"},{"createdTime":"2015-10-27T22:17:00.000Z","sentiment":"0"},{"createdTime":"2015-10-27T22:30:33.000Z","sentiment":"0"},{"createdTime":"2015-10-27T22:18:02.000Z","sentiment":"0.255233"},{"createdTime":"2015-10-27T22:23:25.000Z","sentiment":"0"},{"createdTime":"2015-10-27T22:45:41.000Z","sentiment":"0"},{"createdTime":"2015-10-27T22:38:09.000Z","sentiment":"0"},{"createdTime":"2015-10-27T22:46:01.000Z","sentiment":"0"},{"createdTime":"2015-10-27T22:38:55.000Z","sentiment":"0"},{"createdTime":"2015-10-27T22:49:25.000Z","sentiment":"-0.601202"},{"createdTime":"2015-10-27T22:42:34.000Z","sentiment":"0"},{"createdTime":"2015-10-27T22:45:50.000Z","sentiment":"0"},{"createdTime":"2015-10-27T22:56:43.000Z","sentiment":"0.392463"},{"createdTime":"2015-10-27T23:04:48.000Z","sentiment":"-0.625285"},{"createdTime":"2015-10-27T22:50:10.000Z","sentiment":"0"},{"createdTime":"2015-10-27T22:54:27.000Z","sentiment":"0"},{"createdTime":"2015-10-27T23:28:42.000Z","sentiment":"0"},{"createdTime":"2015-10-27T23:28:50.000Z","sentiment":"0"},{"createdTime":"2015-10-27T23:27:24.000Z","sentiment":"0"},{"createdTime":"2015-10-27T23:17:28.000Z","sentiment":"0"},{"createdTime":"2015-10-27T23:20:33.000Z","sentiment":"0"},{"createdTime":"2015-10-27T23:31:14.000Z","sentiment":"0"},{"createdTime":"2015-10-27T23:23:38.000Z","sentiment":"0"},{"createdTime":"2015-10-27T23:31:34.000Z","sentiment":"0.235004"},{"createdTime":"2015-10-27T23:31:35.000Z","sentiment":"0.121869"},{"createdTime":"2015-10-28T00:17:16.000Z","sentiment":"-0.608328"},{"createdTime":"2015-10-28T00:31:30.000Z","sentiment":"0.200607"},{"createdTime":"2015-10-28T00:43:26.000Z","sentiment":"0"},{"createdTime":"2015-10-27T23:43:12.000Z","sentiment":"0.240907"},{"createdTime":"2015-10-27T23:33:16.000Z","sentiment":"0"},{"createdTime":"2015-10-27T23:58:42.000Z","sentiment":"0"},{"createdTime":"2015-10-28T00:02:52.000Z","sentiment":"0"},{"createdTime":"2015-10-28T00:04:31.000Z","sentiment":"0"},{"createdTime":"2015-10-28T00:06:45.000Z","sentiment":"0"},{"createdTime":"2015-10-28T01:16:25.000Z","sentiment":"-0.500883"},{"createdTime":"2015-10-28T02:18:57.000Z","sentiment":"-0.614868"},{"createdTime":"2015-10-28T01:05:38.000Z","sentiment":"0"},{"createdTime":"2015-10-28T01:56:05.000Z","sentiment":"0"},{"createdTime":"2015-10-28T00:57:47.000Z","sentiment":"0"},{"createdTime":"2015-10-28T04:07:25.000Z","sentiment":"0"},{"createdTime":"2015-10-28T02:51:18.000Z","sentiment":"0"},{"createdTime":"2015-10-28T04:42:13.000Z","sentiment":"0"},{"createdTime":"2015-10-28T04:25:52.000Z","sentiment":"0"},{"createdTime":"2015-10-28T03:46:03.000Z","sentiment":"0"}]);
});
/* GET trends page*/
router.get('/trends', function (req, res) {
	res.render('trends', {title: 'Recent Trends'});
});
/* GET trends test page*/
//This route is for showing what the graph would look like with normal data in the case that I am out of API calls.
//The data is a real sample taken on 10/27
router.get('/trendstest', function (req, res) {
	res.render('trendstest', {title: 'Recent Trends'});
});
//this function gets text ready to be put through the analyzer by getting rid of strange punctuation
//and hashtages. 
function normalizeString (text){
	newText = text.replace(/#/g, "");
	newText = newText.replace(/capitalone/gi, " CAPITALONE ");
	newText = newText.replace(/capital one/gi, " CAPITALONE ");
	newText = newText.replace(/capitolone/gi, " CAPITALONE ");
	newText = newText.replace(/capital one/gi, " CAPITALONE ");
	return newText;

}
module.exports = router;

