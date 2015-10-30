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

/*#########################################################
########################STANDARD VIEWS#######################*/
/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Recent Instagram Activity' });
});

/* GET trends page*/
router.get('/trends', function (req, res) {
	res.render('trends', {title: 'Recent Trends'});
});
/*#########################################################
########################TEST VIEWS#######################*/
/* GET trends test page*/
//This route is for showing what the graph would look like with normal data in the case that I am out of API calls.
//The data is a real sample taken on 10/28
router.get('/trendstest', function (req, res) {
	res.render('trendstest', {title: 'Recent Trends'});
});
/* GET test recent data (a data set collected on 10/28)*/
//this route is for test data for the recent activity in table so that you can still see it's functionality even if 
//I have used my max number of calls to Alchemy API for the day. Will be implemented 10/28 when I have more calls.
router.get('/recenttest', function (req, res) {
	res.render('recenttest', {title: 'Recent Trends'});
});
/*#########################################################
########################JSON ROUTES#######################*/


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
				
				newText = normalizeString(caption);

				alchemyapi.sentiment("text", newText, {}, function(response) {
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
			alchemyapi.sentiment("text", newCaption, {}, function(response) {
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

/*#########################################################
########################TEST JSON ROUTES###################*/

/* GET test recent data (a data set collected on 10/27)*/
router.get('/test_recent_json', function (req, res) {
	res.json([{"name":"Julian Damas","post":"#\nTuristime #\nCapitalone 😎😎✌💎💎","likeCount":21,"sentNum":"0","sentWord":"Could not analyze.","createdTime":"2015-10-29T23:31:02.000Z","pictureLink":"https://scontent.cdninstagram.com/hphotos-xfa1/l/t51.2885-15/s150x150/e35/12105200_968390869873426_655567135_n.jpg","username":"juliandamas","userId":"789643421"},{"name":"Anthony A. Lee","post":"Pain is temporary, what you are going through will pAss... Believe that #\nphiladephia #\nrealestate #\nforbes #\namericanexpress #\ncapitalone","likeCount":27,"sentNum":"-0.0772691","sentWord":"Neutral","createdTime":"2015-10-30T03:51:01.000Z","pictureLink":"https://scontent.cdninstagram.com/hphotos-xpf1/t51.2885-15/s150x150/e15/10808489_927760730632393_1821613092_n.jpg","username":"aleerealestate","userId":"237441965"},{"name":"joni case","post":"Turkey legs for dinner tonight! Thanks #\ncapitalone #\nfallfest","likeCount":0,"sentNum":"0.668421","sentWord":"Fairly Postive","createdTime":"2015-10-30T02:09:41.000Z","pictureLink":"https://scontent.cdninstagram.com/hphotos-xfa1/l/t51.2885-15/s150x150/e35/12106124_1020091148042326_1329283954_n.jpg","username":"jonilanae3","userId":"49719552"},{"name":"Ken Mariano","post":"We are all in! 👍 #\nIamAllIn #\nIamAPromoter #\nofficehits #\ncopssc #\ntownhall #\ngmsb #\nCapitalOne #\nchangebankingforgood #\nmissionpossible #\npartnership","likeCount":0,"sentNum":"0.262295","sentWord":"Slightly Postive","createdTime":"2015-10-30T03:58:44.000Z","pictureLink":"https://scontent.cdninstagram.com/hphotos-xfp1/t51.2885-15/s150x150/e35/1962936_1695156820718657_420307526_n.jpg","username":"kenndcmariano","userId":"241176191"},{"name":"Benjamin Chia Ming Liang","post":"Woot got my CapitalOne VENTURE ONE card looks pretty sick...what should I buy first?! #\ncapitalone #\nventure #\none #\nventureone #\nblue #\ntravel #\nlikeaboss #\nballin #\nexcellent #\ncreditscore #\nmaxout #\ncashmoney #\nnotreally #\ncreditcard #\nbruh #\njapan #\ntaiwan #\nvacation","likeCount":7,"sentNum":"0.1443","sentWord":"Slightly Postive","createdTime":"2015-10-30T00:14:24.000Z","pictureLink":"https://scontent.cdninstagram.com/hphotos-xaf1/t51.2885-15/s150x150/e35/12144226_1044306572280358_1471949730_n.jpg","username":"obeseninja","userId":"455750873"},{"name":"ليفربول العربي - reds4arab","post":"#\n‏ليفربول يعلن موعد مباراته امام #\nساوثهامبتون في ربع نهائي بطولة #\nكابيتال_ون يوم الاربعاء الموافق ٢ ديسمبر 2015 في تمام الساعة ١٠:٤٥ بتوقيت #\nمكة_المكرمة .. اللقاء سيقام على ملعب القديسين #\nساينت_ماري الخاص بساوثهامبتون\n\n#\nlfcfamily #\nLFC #\nLiverpoolFC #\nliverpool #\nSouthampton #\nSaints #\nSFC #\nStMary #\nCapitalOne #\nCapitalOneCup #\nDraw","likeCount":80,"sentNum":"0.260818","sentWord":"Slightly Postive","createdTime":"2015-10-29T21:43:25.000Z","pictureLink":"https://scontent.cdninstagram.com/hphotos-xaf1/t51.2885-15/s150x150/e35/12081214_764847833626894_151351471_n.jpg","username":"reds4arabs","userId":"1283195357"},{"name":"Back Again Mobile Massage","post":"Wearing our pink uniforms for a few more October work days. #\nwearpink #\nsupportcancerawareness #\nfightbreastcancer #\nworksitewellness #\ncorporatewellness #\nchairmassage #\nmobilemassage #\nmassage #\nmassagetherapy #\nlasvegas #\nsummerlin #\ncapitalone #\nbackagainmassage #\nNVserenitysisters","likeCount":5,"sentNum":"0.281408","sentWord":"Slightly Postive","createdTime":"2015-10-29T23:20:19.000Z","pictureLink":"https://scontent.cdninstagram.com/hphotos-xpf1/t51.2885-15/s150x150/e35/10632419_1490716191232004_971728414_n.jpg","username":"backagainmassage","userId":"2212063058"},{"name":"YES Prep Public Schools","post":"#\ntbt to last Thursday when Capital One volunteers assembled YES Prep Northside's new College Corner Tech Lab #\ncapitalone #\ngratitude","likeCount":67,"sentNum":"0.665271","sentWord":"Fairly Postive","createdTime":"2015-10-29T20:53:27.000Z","pictureLink":"https://scontent.cdninstagram.com/hphotos-xaf1/t51.2885-15/s150x150/e35/12080601_1693286837551981_774478099_n.jpg","username":"yespreppublicschools","userId":"434737333"},{"name":"","post":"Had a great night at the theatre last night. Just shame about the result. #\nMUFC #\nBoro #\nCapitalOne #\nCup #\nOldTrafford","likeCount":1,"sentNum":"-0.170008","sentWord":"Slightly Negative","createdTime":"2015-10-29T21:43:50.000Z","pictureLink":"https://scontent.cdninstagram.com/hphotos-xaf1/t51.2885-15/s150x150/e35/11378467_516517351858025_1715463803_n.jpg","username":"adamgrice91","userId":"198127906"},{"name":"linda chau","post":"Wow #\ncapitalone is on top of their games! #\nlove and I was feeling extra generous that day!","likeCount":6,"sentNum":"0.534402","sentWord":"Fairly Postive","createdTime":"2015-10-29T20:34:58.000Z","pictureLink":"https://scontent.cdninstagram.com/hphotos-xaf1/t51.2885-15/s150x150/e35/c214.0.651.651/12106068_862239030560671_553285834_n.jpg","username":"pikachauchau","userId":"315300167"},{"name":"Krysta Yates","post":"#\nHappyHalloween #\n80s #\ncostumedayatwork #\ncapitalone","likeCount":10,"sentNum":"0.807207","sentWord":"Very Postive","createdTime":"2015-10-29T20:12:23.000Z","pictureLink":"https://scontent.cdninstagram.com/hphotos-xfa1/t51.2885-15/s150x150/e15/12132860_1504489423183819_11248337_n.jpg","username":"yatesk17","userId":"1334903482"},{"name":"Alexa Sofia / Artistic Fashion","post":"Our ad is out!! It will be all over the Internet and I hope you have pleasure of seeing it! The ad is a quote from one of my biggest supporters @vana_cristina who has always been there supporting me, promoting me and best of all wearing our scarves!! Thank you @capitalonespark for this opportunity! #\nad #\ncapitalonespark #\ncapitalone #\nscarves #\nfashion","likeCount":18,"sentNum":"0.501917","sentWord":"Fairly Postive","createdTime":"2015-10-29T19:03:35.000Z","pictureLink":"https://scontent.cdninstagram.com/hphotos-xaf1/t51.2885-15/s150x150/e35/c0.34.686.686/12081219_431533687054746_834881543_n.jpg","username":"alexasofianyc","userId":"323313217"},{"name":"Kevin SinCity Examiner","post":">STAY AWAY FROM CHASE BANK – Chase Bank is lowering Credit Card Limits to $100 over current balances to force Over-Limit status and collect fees.\nTransfer your accounts to @CapitalOne or @Citibank now!\n@Chase #\nChase #\nChaseBank #\nCapitalOne #\nCitibank","likeCount":1,"sentNum":"0.288331","sentWord":"Slightly Postive","createdTime":"2015-10-29T18:29:36.000Z","pictureLink":"https://scontent.cdninstagram.com/hphotos-xfa1/t51.2885-15/s150x150/e35/c152.0.334.334/12093659_861219067289341_191614572_n.jpg","username":"sincityexaminer","userId":"40197099"},{"name":"It's not just football, is ALL","post":"Sick volley of Kevin De Bruyne👊💥🔥\n-\n🎵 Sander van Doorn, Martin Garrix and DVBBS - Gold Skies (ft. Aleesia)\n-\n📍Follow partners: @insideplays @orgasmic.fifa @football.soccer @soccerlife.tm @red.devils.goals @golazosite @turi_6464\n\nIGNORE ⬇️😓😩 #\nfootballisall #\nkevindebruyne #\ndebruyne #\nwolfsburg #\nrodriguez #\nbenaglio #\ndost #\nbendter #\nbundesliga #\nfootball #\nsoccer #\nfutbol #\ndraxler #\ngoal #\ngol #\ngolazo #\nnaldo #\ndante #\nucl #\nmanchestercity #\ncapitalone #\nmancity #\netihadstadium #\naguero #\nbony #\nbpl #\npremierleague #\neuropeleague #\ncrystalpalace #\nsterling","likeCount":103,"sentNum":"-0.268065","sentWord":"Slightly Negative","createdTime":"2015-10-29T17:33:59.000Z","pictureLink":"https://scontent.cdninstagram.com/hphotos-xaf1/t51.2885-15/s150x150/e15/12071233_756687761127303_1536708445_n.jpg","username":"football.is.all","userId":"1573310927"},{"name":"Stephanie Dallas Hightower","post":"Tom and Veken #\nvolunteering with #\ncapitalone at the #\nronaldmcdonaldhouse","likeCount":3,"sentNum":"0.361561","sentWord":"Slightly Postive","createdTime":"2015-10-29T16:28:16.000Z","pictureLink":"https://scontent.cdninstagram.com/hphotos-xfa1/t51.2885-15/s150x150/e35/12132944_1491107291192983_1180199485_n.jpg","username":"mrs.hightower","userId":"196560127"},{"name":"Kevin De Bruyne Fanpage","post":"#\nRepost @jsifm with @repostapp.\n・・・\nUnstoppable KDB! #\nCapitalOne #\nGreatWin","likeCount":141,"sentNum":"0.24934","sentWord":"Slightly Postive","createdTime":"2015-10-29T16:26:19.000Z","pictureLink":"https://scontent.cdninstagram.com/hphotos-xaf1/t51.2885-15/s150x150/e35/c154.0.772.772/12135342_863506210414281_1379816503_n.jpg","username":"debruynebrasil","userId":"1697301708"},{"name":"My travels!","post":"Our damage has been done! Saree #\nshopping spree. Thanks to my #\ncapitalone venture card, I racked up the bill for a couple of us conversion fee free. Lol. Yikes! #\nIndia #\nmumbai #\nbombay","likeCount":12,"sentNum":"0.0331661","sentWord":"Neutral","createdTime":"2015-10-29T17:24:36.000Z","pictureLink":"https://scontent.cdninstagram.com/hphotos-xaf1/t51.2885-15/s150x150/e35/12106171_1670196253193936_1763555923_n.jpg","username":"msptoanywhere","userId":"2223776919"},{"name":"SA Sport","post":".\n.\n#\nsasport_ .\n.\n.\n.\n.\nفيرمينو 🙈.\nFirmino 😍!\n.\n.\n.\n.\n#\nFirmino #\nLiverpool #\nLFC #\nLiverpoolFC #\nBrazil #\nBrasil #\nCapitalOne\n#\nفيرمينو #\nليفربول #\nالليفر #\nالريدز #\nالبرازيل #\nبرازيل #\nالسيلساو","likeCount":94,"sentNum":"0","sentWord":"Could not analyze.","createdTime":"2015-10-29T17:24:25.000Z","pictureLink":"https://scontent.cdninstagram.com/hphotos-xaf1/t51.2885-15/s150x150/e15/c152.0.335.335/12132919_618910354918297_1123429449_n.jpg","username":"sasport_","userId":"2159781378"},{"name":"Love Yourself First !!","post":"#\nz100jingleball #\ndecember #\nperformance #\ncapitalone #\nmadisonsquaregarden #\nrevival #\ngoodforyou #\nsameoldlove #\nmeandtherhythm #\nselenagomez #\nselenator","likeCount":11,"sentNum":"0.36888","sentWord":"Slightly Postive","createdTime":"2015-10-29T17:22:00.000Z","pictureLink":"https://scontent.cdninstagram.com/hphotos-xaf1/t51.2885-15/s150x150/e15/12132879_187365561601548_1039541500_n.jpg","username":"selenatorcanadian","userId":"2065860287"},{"name":"Sport Updates","post":"CAPITAL ONE CUPSETS! \nThe Capital One Cup this week was packed full of drama and many upsets too. On Tuesday, 3 of the 4 ties went to penalties with Everton beating Norwich, Hull getting the better of Leicester and Stoke knocking out Chelsea! In the other match there was a huge upset as Arsenal lost 3-0 to Sheffield Wednesday. The next day followed with Liverpool defeatingg Southampton 1-0 and Southampton beating managerless Aston Villa 2-1. Man City thrashed Crystal Palace 5-1 but Man United were knocked out. They lost against Middlesbrough on penalties which saw Rooney, Carrick and Young all miss. \nQuarter Final ties to be played on 1&2 December:\nManchester City  vs  Hull City\nMiddlesbrough  vs  Everton\nStoke City  vs  Sheffield Wednesday \nSouthampton  vs  Liverpool\n#\nCapitalOne #\nCapitalOneCup #\nEngland  #\nLeagueCup #\nupsets","likeCount":70,"sentNum":"-0.726247","sentWord":"Very Negative","createdTime":"2015-10-29T16:26:39.000Z","pictureLink":"https://scontent.cdninstagram.com/hphotos-xaf1/t51.2885-15/s150x150/e35/12081210_1647892472166142_2073528467_n.jpg","username":"globe_sports","userId":"1592012826"}]);
});

/* GET test data (a data set collected on 10/27)*/
router.get('/test_data_trend_json', function(req,res){
	res.json([{"createdTime":"2015-10-28T20:08:19.000Z","sentiment":"0.276805"},{"createdTime":"2015-10-28T20:24:15.000Z","sentiment":"0"},{"createdTime":"2015-10-28T20:29:07.000Z","sentiment":"0"},{"createdTime":"2015-10-28T20:06:17.000Z","sentiment":"0.276805"},{"createdTime":"2015-10-28T20:11:18.000Z","sentiment":"0"},{"createdTime":"2015-10-28T20:16:21.000Z","sentiment":"0.27139"},{"createdTime":"2015-10-28T20:35:42.000Z","sentiment":"0"},{"createdTime":"2015-10-28T20:21:49.000Z","sentiment":"-0.543787"},{"createdTime":"2015-10-28T20:27:14.000Z","sentiment":"0"},{"createdTime":"2015-10-28T20:58:10.000Z","sentiment":"0"},{"createdTime":"2015-10-28T21:03:26.000Z","sentiment":"0.276805"},{"createdTime":"2015-10-28T20:37:10.000Z","sentiment":"-0.684149"},{"createdTime":"2015-10-28T21:04:47.000Z","sentiment":"0.23214"},{"createdTime":"2015-10-28T20:41:16.000Z","sentiment":"0"},{"createdTime":"2015-10-28T20:49:28.000Z","sentiment":"0"},{"createdTime":"2015-10-28T21:26:07.000Z","sentiment":"0"},{"createdTime":"2015-10-28T20:55:40.000Z","sentiment":"0"},{"createdTime":"2015-10-28T21:06:58.000Z","sentiment":"0"},{"createdTime":"2015-10-28T21:42:15.000Z","sentiment":"0.589564"},{"createdTime":"2015-10-28T21:17:17.000Z","sentiment":"0"},{"createdTime":"2015-10-28T21:20:16.000Z","sentiment":"0"},{"createdTime":"2015-10-28T21:31:15.000Z","sentiment":"0"},{"createdTime":"2015-10-28T21:36:16.000Z","sentiment":"-0.718676"},{"createdTime":"2015-10-28T21:47:23.000Z","sentiment":"-0.476173"},{"createdTime":"2015-10-28T21:40:14.000Z","sentiment":"0"},{"createdTime":"2015-10-28T21:40:25.000Z","sentiment":"0"},{"createdTime":"2015-10-28T21:41:41.000Z","sentiment":"0.266085"},{"createdTime":"2015-10-28T21:53:58.000Z","sentiment":"0.333707"},{"createdTime":"2015-10-28T22:31:52.000Z","sentiment":"0.364445"},{"createdTime":"2015-10-28T22:02:13.000Z","sentiment":"0.0271021"},{"createdTime":"2015-10-28T22:10:20.000Z","sentiment":"0.326869"},{"createdTime":"2015-10-28T22:33:24.000Z","sentiment":"0"},{"createdTime":"2015-10-28T22:42:15.000Z","sentiment":"0"},{"createdTime":"2015-10-28T22:12:33.000Z","sentiment":"0"},{"createdTime":"2015-10-28T22:19:39.000Z","sentiment":"0"},{"createdTime":"2015-10-28T22:30:16.000Z","sentiment":"0"},{"createdTime":"2015-10-28T22:53:30.000Z","sentiment":"0"},{"createdTime":"2015-10-28T22:33:21.000Z","sentiment":"0"},{"createdTime":"2015-10-28T22:38:17.000Z","sentiment":"0"},{"createdTime":"2015-10-28T22:42:19.000Z","sentiment":"-0.461545"},{"createdTime":"2015-10-28T22:50:11.000Z","sentiment":"0"},{"createdTime":"2015-10-28T23:07:36.000Z","sentiment":"-0.502648"},{"createdTime":"2015-10-28T22:51:58.000Z","sentiment":"0"},{"createdTime":"2015-10-28T23:16:24.000Z","sentiment":"0.790552"},{"createdTime":"2015-10-28T23:21:26.000Z","sentiment":"0.219054"},{"createdTime":"2015-10-28T22:56:38.000Z","sentiment":"0.793445"},{"createdTime":"2015-10-28T23:23:01.000Z","sentiment":"-0.272786"},{"createdTime":"2015-10-28T22:57:03.000Z","sentiment":"0"},{"createdTime":"2015-10-28T23:19:55.000Z","sentiment":"0.295905"},{"createdTime":"2015-10-29T00:10:24.000Z","sentiment":"0.615556"},{"createdTime":"2015-10-28T23:30:26.000Z","sentiment":"0"},{"createdTime":"2015-10-28T23:47:41.000Z","sentiment":"-0.522394"},{"createdTime":"2015-10-29T00:12:56.000Z","sentiment":"0.209487"},{"createdTime":"2015-10-29T00:07:11.000Z","sentiment":"0.801236"},{"createdTime":"2015-10-29T00:09:04.000Z","sentiment":"0.895803"},{"createdTime":"2015-10-29T00:15:25.000Z","sentiment":"-0.293179"},{"createdTime":"2015-10-29T00:26:18.000Z","sentiment":"0.770772"},{"createdTime":"2015-10-29T01:10:43.000Z","sentiment":"0.812496"},{"createdTime":"2015-10-29T02:28:52.000Z","sentiment":"-0.530837"},{"createdTime":"2015-10-29T02:47:14.000Z","sentiment":"0"},{"createdTime":"2015-10-29T03:12:40.000Z","sentiment":"0"},{"createdTime":"2015-10-29T08:41:52.000Z","sentiment":"0.657324"},{"createdTime":"2015-10-29T08:46:21.000Z","sentiment":"0.461619"},{"createdTime":"2015-10-29T02:52:45.000Z","sentiment":"0.835299"},{"createdTime":"2015-10-29T07:18:45.000Z","sentiment":"0"},{"createdTime":"2015-10-29T08:16:09.000Z","sentiment":"0"},{"createdTime":"2015-10-29T10:58:19.000Z","sentiment":"0"},{"createdTime":"2015-10-29T11:20:13.000Z","sentiment":"0.231192"},{"createdTime":"2015-10-29T09:23:37.000Z","sentiment":"0.709661"},{"createdTime":"2015-10-29T09:42:52.000Z","sentiment":"0"},{"createdTime":"2015-10-29T11:32:02.000Z","sentiment":"0"},{"createdTime":"2015-10-29T12:16:15.000Z","sentiment":"-0.89006"},{"createdTime":"2015-10-29T10:01:13.000Z","sentiment":"0.727791"},{"createdTime":"2015-10-29T13:18:56.000Z","sentiment":"0"},{"createdTime":"2015-10-29T16:09:46.000Z","sentiment":"0.682515"},{"createdTime":"2015-10-29T11:38:33.000Z","sentiment":"0"},{"createdTime":"2015-10-29T16:12:46.000Z","sentiment":"0"},{"createdTime":"2015-10-29T13:11:57.000Z","sentiment":"-0.00538898"},{"createdTime":"2015-10-29T13:43:59.000Z","sentiment":"-0.0209617"},{"createdTime":"2015-10-29T14:41:34.000Z","sentiment":"0.296811"},{"createdTime":"2015-10-29T17:33:59.000Z","sentiment":"-0.197438"},{"createdTime":"2015-10-29T16:26:19.000Z","sentiment":"0.727791"},{"createdTime":"2015-10-29T16:26:39.000Z","sentiment":"-0.652786"},{"createdTime":"2015-10-29T18:29:36.000Z","sentiment":"0.319059"},{"createdTime":"2015-10-29T16:28:16.000Z","sentiment":"0.279127"},{"createdTime":"2015-10-29T17:22:00.000Z","sentiment":"0.609144"},{"createdTime":"2015-10-29T17:24:25.000Z","sentiment":"0"},{"createdTime":"2015-10-29T17:24:36.000Z","sentiment":"0.0220644"},{"createdTime":"2015-10-29T19:03:35.000Z","sentiment":"0.692079"},{"createdTime":"2015-10-29T20:12:23.000Z","sentiment":"0"},{"createdTime":"2015-10-29T20:34:58.000Z","sentiment":"0.71158"},{"createdTime":"2015-10-29T21:43:50.000Z","sentiment":"-0.191019"},{"createdTime":"2015-10-30T03:58:44.000Z","sentiment":"0.262295"},{"createdTime":"2015-10-29T20:53:27.000Z","sentiment":"0.56315"},{"createdTime":"2015-10-29T21:43:25.000Z","sentiment":"0"},{"createdTime":"2015-10-29T23:20:19.000Z","sentiment":"0.44558"},{"createdTime":"2015-10-29T23:31:02.000Z","sentiment":"0"},{"createdTime":"2015-10-30T03:51:01.000Z","sentiment":"-0.130818"},{"createdTime":"2015-10-30T02:09:41.000Z","sentiment":"0"},{"createdTime":"2015-10-30T00:14:24.000Z","sentiment":"0.0229108"}]);
});

//this function gets text ready to be put through the analyzer by getting rid of strange punctuation
//and hashtages. 
function normalizeString (text){
	newText = text.replace(/#/g, '\n');
	newText = text.replace(/([a-z])([A-Z])/g, '$1 $2');
	return newText;
}
module.exports = router;

