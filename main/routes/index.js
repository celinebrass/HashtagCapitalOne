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
				caption = caption.replace(/#/g, '#\n');
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
						//console.log(response.statusInfo);
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

/* GET trends page*/
router.get('/trends', function (req, res) {
	res.render('trends', {title: 'Recent Trends'});
});

/* GET test data (a data set collected on 10/27)*/
router.get('/test_data', function(req,res){
	res.json([{"createdTime":"2015-10-27T08:37:21.000Z","sentiment":"0"},{"createdTime":"2015-10-27T08:04:04.000Z","sentiment":"0.656764"},{"createdTime":"2015-10-27T00:52:29.000Z","sentiment":"0"},{"createdTime":"2015-10-27T02:27:10.000Z","sentiment":"0.593199"},{"createdTime":"2015-10-27T02:42:28.000Z","sentiment":"0"},{"createdTime":"2015-10-27T04:43:55.000Z","sentiment":"0"},{"createdTime":"2015-10-27T11:25:29.000Z","sentiment":"0"},{"createdTime":"2015-10-27T07:00:38.000Z","sentiment":"0"},{"createdTime":"2015-10-27T13:43:14.000Z","sentiment":"0"},{"createdTime":"2015-10-27T13:57:09.000Z","sentiment":"0"},{"createdTime":"2015-10-27T09:01:59.000Z","sentiment":"0"},{"createdTime":"2015-10-27T10:14:11.000Z","sentiment":"0"},{"createdTime":"2015-10-27T10:21:15.000Z","sentiment":"0"},{"createdTime":"2015-10-27T14:12:47.000Z","sentiment":"0"},{"createdTime":"2015-10-27T10:37:13.000Z","sentiment":"0.236251"},{"createdTime":"2015-10-27T11:22:46.000Z","sentiment":"-0.262027"},{"createdTime":"2015-10-27T14:22:21.000Z","sentiment":"0"},{"createdTime":"2015-10-27T15:01:09.000Z","sentiment":"0"},{"createdTime":"2015-10-27T14:43:47.000Z","sentiment":"0"},{"createdTime":"2015-10-27T15:06:57.000Z","sentiment":"0"},{"createdTime":"2015-10-27T15:36:36.000Z","sentiment":"0.330726"},{"createdTime":"2015-10-27T17:43:46.000Z","sentiment":"0.32713"},{"createdTime":"2015-10-27T17:19:07.000Z","sentiment":"0.308983"},{"createdTime":"2015-10-27T15:33:02.000Z","sentiment":"0"},{"createdTime":"2015-10-27T17:28:10.000Z","sentiment":"0.277676"},{"createdTime":"2015-10-27T19:07:56.000Z","sentiment":"0.237439"},{"createdTime":"2015-10-27T19:41:28.000Z","sentiment":"0"},{"createdTime":"2015-10-27T19:03:17.000Z","sentiment":"0"},{"createdTime":"2015-10-27T17:43:16.000Z","sentiment":"0"},{"createdTime":"2015-10-27T20:27:36.000Z","sentiment":"0"},{"createdTime":"2015-10-27T17:52:22.000Z","sentiment":"0"},{"createdTime":"2015-10-27T19:41:31.000Z","sentiment":"0"},{"createdTime":"2015-10-27T19:53:30.000Z","sentiment":"0"},{"createdTime":"2015-10-27T20:34:56.000Z","sentiment":"0"},{"createdTime":"2015-10-27T20:14:59.000Z","sentiment":"0"},{"createdTime":"2015-10-27T20:17:02.000Z","sentiment":"0"},{"createdTime":"2015-10-27T20:46:44.000Z","sentiment":"0"},{"createdTime":"2015-10-27T21:00:18.000Z","sentiment":"0"},{"createdTime":"2015-10-27T20:49:41.000Z","sentiment":"0"},{"createdTime":"2015-10-27T20:38:19.000Z","sentiment":"0"},{"createdTime":"2015-10-27T21:43:09.000Z","sentiment":"0"},{"createdTime":"2015-10-27T21:01:02.000Z","sentiment":"0"},{"createdTime":"2015-10-27T21:12:57.000Z","sentiment":"0.243863"},{"createdTime":"2015-10-27T21:12:05.000Z","sentiment":"0"},{"createdTime":"2015-10-27T21:16:00.000Z","sentiment":"0"},{"createdTime":"2015-10-27T21:47:21.000Z","sentiment":"0"},{"createdTime":"2015-10-27T21:52:52.000Z","sentiment":"0"},{"createdTime":"2015-10-27T21:30:35.000Z","sentiment":"0.386967"},{"createdTime":"2015-10-27T21:38:00.000Z","sentiment":"0"},{"createdTime":"2015-10-27T21:57:41.000Z","sentiment":"0.372895"},{"createdTime":"2015-10-27T22:02:16.000Z","sentiment":"-0.284108"},{"createdTime":"2015-10-27T22:09:31.000Z","sentiment":"0"},{"createdTime":"2015-10-27T22:47:54.000Z","sentiment":"0"},{"createdTime":"2015-10-27T21:57:05.000Z","sentiment":"-0.295072"},{"createdTime":"2015-10-27T21:59:37.000Z","sentiment":"0"},{"createdTime":"2015-10-27T22:29:50.000Z","sentiment":"0"},{"createdTime":"2015-10-27T22:25:44.000Z","sentiment":"0"},{"createdTime":"2015-10-27T22:17:00.000Z","sentiment":"0"},{"createdTime":"2015-10-27T22:30:33.000Z","sentiment":"0"},{"createdTime":"2015-10-27T22:18:02.000Z","sentiment":"0.255233"},{"createdTime":"2015-10-27T22:23:25.000Z","sentiment":"0"},{"createdTime":"2015-10-27T22:45:41.000Z","sentiment":"0"},{"createdTime":"2015-10-27T22:38:09.000Z","sentiment":"0"},{"createdTime":"2015-10-27T22:46:01.000Z","sentiment":"0"},{"createdTime":"2015-10-27T22:38:55.000Z","sentiment":"0"},{"createdTime":"2015-10-27T22:49:25.000Z","sentiment":"-0.601202"},{"createdTime":"2015-10-27T22:42:34.000Z","sentiment":"0"},{"createdTime":"2015-10-27T22:45:50.000Z","sentiment":"0"},{"createdTime":"2015-10-27T22:56:43.000Z","sentiment":"0.392463"},{"createdTime":"2015-10-27T23:04:48.000Z","sentiment":"-0.625285"},{"createdTime":"2015-10-27T22:50:10.000Z","sentiment":"0"},{"createdTime":"2015-10-27T22:54:27.000Z","sentiment":"0"},{"createdTime":"2015-10-27T23:28:42.000Z","sentiment":"0"},{"createdTime":"2015-10-27T23:28:50.000Z","sentiment":"0"},{"createdTime":"2015-10-27T23:27:24.000Z","sentiment":"0"},{"createdTime":"2015-10-27T23:17:28.000Z","sentiment":"0"},{"createdTime":"2015-10-27T23:20:33.000Z","sentiment":"0"},{"createdTime":"2015-10-27T23:31:14.000Z","sentiment":"0"},{"createdTime":"2015-10-27T23:23:38.000Z","sentiment":"0"},{"createdTime":"2015-10-27T23:31:34.000Z","sentiment":"0.235004"},{"createdTime":"2015-10-27T23:31:35.000Z","sentiment":"0.121869"},{"createdTime":"2015-10-28T00:17:16.000Z","sentiment":"-0.608328"},{"createdTime":"2015-10-28T00:31:30.000Z","sentiment":"0.200607"},{"createdTime":"2015-10-28T00:43:26.000Z","sentiment":"0"},{"createdTime":"2015-10-27T23:43:12.000Z","sentiment":"0.240907"},{"createdTime":"2015-10-27T23:33:16.000Z","sentiment":"0"},{"createdTime":"2015-10-27T23:58:42.000Z","sentiment":"0"},{"createdTime":"2015-10-28T00:02:52.000Z","sentiment":"0"},{"createdTime":"2015-10-28T00:04:31.000Z","sentiment":"0"},{"createdTime":"2015-10-28T00:06:45.000Z","sentiment":"0"},{"createdTime":"2015-10-28T01:16:25.000Z","sentiment":"-0.500883"},{"createdTime":"2015-10-28T02:18:57.000Z","sentiment":"-0.614868"},{"createdTime":"2015-10-28T01:05:38.000Z","sentiment":"0"},{"createdTime":"2015-10-28T01:56:05.000Z","sentiment":"0"},{"createdTime":"2015-10-28T00:57:47.000Z","sentiment":"0"},{"createdTime":"2015-10-28T04:07:25.000Z","sentiment":"0"},{"createdTime":"2015-10-28T02:51:18.000Z","sentiment":"0"},{"createdTime":"2015-10-28T04:42:13.000Z","sentiment":"0"},{"createdTime":"2015-10-28T04:25:52.000Z","sentiment":"0"},{"createdTime":"2015-10-28T03:46:03.000Z","sentiment":"0"}]);
});
/* GET trends test page*/
//This route is for showing what the graph would look like with normal data in the case that I am out of API calls.
//The data is a real sample taken on 10/27
router.get('/trendstest', function (req, res) {
	res.render('trendstest', {title: 'Recent Trends'});
});
/* GET test recent data (a data set collected on 10/27)*/
//this route is for test data for the recent activity in table so that you can still see it's functionality even if 
//I have used my max number of calls to Alchemy API for the day. Will be implemented 10/28 when I have more calls.
/*router.get('/recenttest', function (req, res) {
	res.render('recenttest', {title: 'Recent Trends'});
});*/

/* GET test recent data (a data set collected on 10/27)*/
router.get('/test_recent_data', function (req, res) {
	res.json([{"name":"","post":"Double trouble for Arsenal as Oxlade Chamberlain and Theo Walcott picked up injury against Sheffield Wednesday #arsenal #chamberlain15 #walcott14 #gunners #coyg #capitalone","likeCount":31,"sentNum":"0","sentWord":"Could not analyze.","createdTime":"2015-10-28T13:43:28.000Z","pictureLink":"https://scontent.cdninstagram.com/hphotos-xaf1/t51.2885-15/s150x150/e35/12063223_1691487301083762_1629404154_n.jpg","username":"footybruland","userId":"938866307"},{"name":"Vinotintos en el Exterior","post":"#ElPartizado Miércoles 3:30pm\n@amorebieta5 v Manchester United\nPartidazo de la #CapitalOne #LeagueCup","likeCount":17,"sentNum":"0","sentWord":"Could not analyze.","createdTime":"2015-10-28T13:54:05.000Z","pictureLink":"https://scontent.cdninstagram.com/hphotos-xfa1/t51.2885-15/s150x150/e35/12080474_898838560204292_566615350_n.jpg","username":"vinoenexterior","userId":"2158310580"},{"name":"Todd Ryan","post":"The Ipswich game last month in the cup, hopefully we can perform the same again tonight with another good performance #Manchester #united #OldTrafford #Ipswich #capitalone #cup #game #match #pitch #stands #players #Rooney #Pereira #Martial\r3 nil, not plain sailing but convincing enough","likeCount":10,"sentNum":"0","sentWord":"Could not analyze.","createdTime":"2015-10-28T12:06:52.000Z","pictureLink":"https://scontent.cdninstagram.com/hphotos-xaf1/t51.2885-15/s150x150/e15/12093508_1663113853966640_336598306_n.jpg","username":"toddy_ryan","userId":"322515938"},{"name":"Siddhant Sharma","post":"Matchday!! #capitalone #MUFC","likeCount":4,"sentNum":"0","sentWord":"Could not analyze.","createdTime":"2015-10-28T12:41:20.000Z","pictureLink":"https://scontent.cdninstagram.com/hphotos-xaf1/t51.2885-15/s150x150/e35/12106129_1638907649691045_1366943145_n.jpg","username":"calm_chorr","userId":"211118683"},{"name":"Foto Football Futebol Soccer","post":"@everton 🔵 #leonosman#osman#funesmori#mori#everton#evertonfc#efc#coyb#premierleague#epl#bpl#blues#instacool#instadaily#photooftheday#amazing#like4like#followme#soccer#football#futbol#futebol#picture#picoftheday#merseyside#evertonians#toffees#liverpool#capitalonecup#capitalone","likeCount":48,"sentNum":"0","sentWord":"Could not analyze.","createdTime":"2015-10-28T11:27:43.000Z","pictureLink":"https://scontent.cdninstagram.com/hphotos-xfa1/t51.2885-15/s150x150/e35/c0.42.846.846/12120341_534172280080659_78902376_n.jpg","username":"soccercvr","userId":"1647763911"},{"name":"","post":"Ahora le toca a Courtois #penalti#fallado#Hazard#capitalone#vs#Stokecity","likeCount":3,"sentNum":"0","sentWord":"Could not analyze.","createdTime":"2015-10-28T11:04:51.000Z","pictureLink":"https://scontent.cdninstagram.com/hphotos-xaf1/t51.2885-15/s150x150/e35/c50.0.220.220/12144072_1658120494472420_2032820008_n.jpg","username":"memes_trolleros","userId":"2254209990"},{"name":"Footballnadamas","post":"| ENGLAND |  El Chelsea es eliminado de la Capital One. Y Mourinho lo tiene cada vez mas complicado continuar en el banquillo del Chelsea\n#Chelsea #Mourinho #Mou #ChelseaFc #Hazard #DiegoCosta #Cr7 #Ronaldo #RealMadrid #Football #Futebol #Futbol #PremierLeague #CapitalOne #Adidas #Nike","likeCount":305,"sentNum":"0","sentWord":"Could not analyze.","createdTime":"2015-10-28T10:23:15.000Z","pictureLink":"https://scontent.cdninstagram.com/hphotos-xaf1/t51.2885-15/s150x150/e35/12145273_996354053758068_1870351575_n.jpg","username":"footballnadamas","userId":"1558548308"},{"name":"Tuggy","post":"\"Goals for the day...\" - well I am guessing that won't be Arsenal F.C., & Arsene Wenger?! #Arsenal #Sheffield #CapitalOne","likeCount":2,"sentNum":"0","sentWord":"Could not analyze.","createdTime":"2015-10-28T09:59:42.000Z","pictureLink":"https://scontent.cdninstagram.com/hphotos-xaf1/t51.2885-15/s150x150/e35/12104965_499079056933080_625852248_n.jpg","username":"huntsworth_wine","userId":"1756043635"},{"name":"","post":"Aston villa travel to Southampton tonight to face them in the capital one cup. Can they put their league defeats behind them and fight on to proceed through to the next stage of the capital one cup. #capitalone #capitalonecup #avfc #vtid #grealish #bpl #edit","likeCount":0,"sentNum":"0","sentWord":"Could not analyze.","createdTime":"2015-10-28T09:38:14.000Z","pictureLink":"https://scontent.cdninstagram.com/hphotos-xaf1/t51.2885-15/s150x150/e35/c1.0.1022.1022/12145326_1662771297339911_1866670833_n.jpg","username":"aston_villanews","userId":"2235926531"},{"name":"Weight loss","post":"Thank God for #capitalone credit card dispute options. I bought my husband a brand new cologne scent he wanted so much for his birthday but when we opened the box someone had scammed us. Inside was a tiny bottle of mouthwash with black tape all over it. I can't even imagine how I would be treated trying to return and explain this. How embarrassing and also now it's my husband's Birthday and he got this piece of junk. Gotta love shoplifters/thieves that do this crap and ruin your day. 😔😔😔 @sephora @jcpenney. Double check your purchases from #Sephora or #JCPenney before you leave the store, folks.","likeCount":19,"sentNum":"0","sentWord":"Could not analyze.","createdTime":"2015-10-28T12:43:13.000Z","pictureLink":"https://scontent.cdninstagram.com/hphotos-xfa1/t51.2885-15/s150x150/e35/12144044_1716100311942863_1202535269_n.jpg","username":"annsweightlossjourney","userId":"2052544275"},{"name":"A  A  N ◀٣٥٤▶","post":"I hope you will start tonight!  its time for youngsters to show their talent,  Never doubt it!  ComeOn @andreaspereira44!  #unitedvsboro #CapitalOne #mufc","likeCount":13,"sentNum":"0","sentWord":"Could not analyze.","createdTime":"2015-10-28T13:56:38.000Z","pictureLink":"https://scontent.cdninstagram.com/hphotos-xaf1/t51.2885-15/s150x150/e35/c66.0.241.241/12145135_1716104471958897_1292202955_n.jpg","username":"anstagram44","userId":"489003189"},{"name":"We Are City","post":"Would like to see Roberts have a run out tonight! The English messi!! Going to go for a 2-0 win today I think! (Depends on the squad!) arsenal and Chelsea already out.... Could/should be an easy cup! #mcfc#manchestercity#capitalone#patrickroberts #patrickrobertsofficial","likeCount":10,"sentNum":"0","sentWord":"Could not analyze.","createdTime":"2015-10-28T12:42:17.000Z","pictureLink":"https://scontent.cdninstagram.com/hphotos-xaf1/t51.2885-15/s150x150/e35/12132970_1152154018146492_1857764489_n.jpg","username":"wearecity9320","userId":"1908697625"},{"name":"abinyoga","post":"Come on United  #design #latepost #united #boro #capitalone","likeCount":9,"sentNum":"0","sentWord":"Could not analyze.","createdTime":"2015-10-28T06:20:53.000Z","pictureLink":"https://scontent.cdninstagram.com/hphotos-xaf1/t51.2885-15/s150x150/e35/12142455_1010636175623953_726016114_n.jpg","username":"abin.prayogo","userId":"1689096560"},{"name":"","post":"Dissapointing season to the defending champs. Congratulations Stoke City.  Chelsea 1- Stoke City 2 \n#penaltyshootout \n#capitalone #soccerislife #dissapointment #lfl #blues #chelsea #stokecity #fff","likeCount":4,"sentNum":"0","sentWord":"Could not analyze.","createdTime":"2015-10-28T05:41:49.000Z","pictureLink":"https://scontent.cdninstagram.com/hphotos-xaf1/t51.2885-15/s150x150/e35/c136.0.351.351/12141970_1476012202706985_2140774522_n.jpg","username":"sportlife_eu","userId":"2234965607"},{"name":"Felipe Kieling","post":"Things are not looking good for Mourinho.  #chelsea #Mourinho #Stoke #capitalone #out","likeCount":37,"sentNum":"0","sentWord":"Could not analyze.","createdTime":"2015-10-28T09:05:49.000Z","pictureLink":"https://scontent.cdninstagram.com/hphotos-xaf1/t51.2885-15/s150x150/e35/12145264_912953972116528_270205142_n.jpg","username":"felipekieling","userId":"219896034"},{"name":"Uefair persianliverpool Team","post":"#lfcvsbournemouth Liverpool Football Club can confirm Wednesday's Capital One Cup tie with AFC Bournemouth at Anfield will go ahead as planned. \nThe stadium was temporarily closed as a precautionary measure on Tuesday due to an incident, which has since been resolved.\n.\n.\nباشگاه در سایت رسمی خودش اعلام کرده که بازی امشب مقابل #بورنموث طبق برنامه ریزی قیلی انجام خواهد شد و #آنفیلد مجدد باز شده است.\nشایعاتی در مورد به تعویق افتادن بازی بر اثر حادثه ناپدید شدن یکی از بازدید کنندگان در آنفیلد شایع شده بود که با این اعلام رسمی اطلاع رسانی شد.\n.\nA #Police statement said: \"#Merseyside Police have confirmed a search of Anfield stadium has been completed following security concerns raised earlier. Officers and the #club are satisfied that there are no people unaccounted for inside the ground and that the stadium is secure.\"\n.\n.\n#پلیس مرسی ساید اعلام کرده است که عملیات جستجو در آنفیلد پس از بالا رفتن نگرانی ها در ساعتهای پایانی روز گذشته بصورت کامل انجام شده است. مأموران پلیس و باشگاه لیورپول بطور مشترک به این نتیجه رسیدند که هیچ شخص ناشناس و بدون مسؤلیتی در این محل نیست و این استادیوم در امنیت کامل است.\n.\n.\n#hpr67 #persianliverpool_news \n#Liverpoolfc #lfc #لیورپول #آنفیلد #جام_اتحادیه #Reds #Anfield #capitalone #theKop","likeCount":173,"sentNum":"0","sentWord":"Could not analyze.","createdTime":"2015-10-28T06:29:37.000Z","pictureLink":"https://scontent.cdninstagram.com/hphotos-xaf1/t51.2885-15/s150x150/e35/12132852_988298754562329_1544543899_n.jpg","username":"persianliverpool","userId":"1467873794"},{"name":"Uefair persianliverpool Team","post":"#RobertoFirmino \"He's a skilled player. I'd say a year ago for a few months for sure he was the best player in the #Bundesliga,\" #Klopp said.\n\"From the first day everyone could see he can become a very, very good player... when I heard #Liverpool took him, I thought 'good choice'.\n\"He needed time when he came in but... he's strong with the #ball, physically strong, fast in a good #football way, gets his body between opponent and ball.\n\"So he is an important player for us and I hope he can play tomorrow.\"\n\"He has quality and I think everyone recognises that.\"\n.\n.\n#کلوپ در مورد #فرمینو گفته است: او یک بازیکن با تکنیک است. من سال پیش گفته بودم که او برای چندین ماه بهترین بازیکن #بوندسلیگا بود.\nاز روز اول همه میتوانستند ببینند که او میتواند یک بازیکن خیلی خیلی خوب شود... زمانی که من شنیدم لیورپول او را گرفته با خودم گفتم تصمیم خوبی است.\nاو از وقتی که به اینجا آمده نیاز به زمان دارد اما... او در کار با توپ قوی است، از نظر فیزیکی قدرتمند است، بخوبی بدنش را بین حریف و توپ قرار میدهد و توپ را نگه میدارد و در انجام فوتبال سریع هم خوب است.\nبنابراین او یک بازیکن مهم برای ماست و  من امیدوارم که بتواند مقابل #بورنموث بازی کند.\nاو دارای کیفیت های بالایی است و همه این موضوع را فهمیده اند.\n.\n.\n@liverpoolfc\n@roberto_firmino\n#hpr67 #persianliverpool_news \n#Liverpoolfc #lfc #لیورپول #آنفیلد #جام_اتحادیه #Reds #Anfield #capitalone #theKop","likeCount":171,"sentNum":"0","sentWord":"Could not analyze.","createdTime":"2015-10-28T07:58:56.000Z","pictureLink":"https://scontent.cdninstagram.com/hphotos-xpf1/t51.2885-15/s150x150/e35/10005728_178794725795913_1850038946_n.jpg","username":"persianliverpool","userId":"1467873794"},{"name":"Ian Glover","post":"A good day for pottering around# Stokecityfc#capitalone#potters#specialone is feeling blue","likeCount":5,"sentNum":"0","sentWord":"Could not analyze.","createdTime":"2015-10-28T04:42:13.000Z","pictureLink":"https://scontent.cdninstagram.com/hphotos-xaf1/t51.2885-15/s150x150/e35/c0.20.677.677/12142201_1487624208233357_1590034825_n.jpg","username":"stokite","userId":"1432347408"},{"name":"Cassie Qandeel","post":"Heyo. #businessprofessional #work #americanmarketingassociation #curlyhair #smirk","likeCount":27,"sentNum":"0","sentWord":"Could not analyze.","createdTime":"2015-10-28T04:25:52.000Z","pictureLink":"https://scontent.cdninstagram.com/hphotos-xat1/t51.2885-15/s150x150/e35/10890756_171807656499070_1150550779_n.jpg","username":"cassieqandeel","userId":"1503623460"},{"name":"It's Off The Line","post":"#manchester #united #mufc #united #reddevils #capitalonecup tonight 🙌🏻⚽️❤️ #capital #capitalone #cup","likeCount":24,"sentNum":"0","sentWord":"Could not analyze.","createdTime":"2015-10-28T09:06:32.000Z","pictureLink":"https://scontent.cdninstagram.com/hphotos-xaf1/t51.2885-15/s150x150/e35/12093756_833531706765423_1343000157_n.jpg","username":"itsofftheline","userId":"1901518344"}]);
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

