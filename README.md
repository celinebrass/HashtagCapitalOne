# HashtagCapitalOne

Used Instagram API, Alchemy API for sentiment analysis, and D3 to display data
Here is a link to the deployed app: http://hashtagcapitalone.elasticbeanstalk.com/

My solution: 

Part 1: Query recent posts using Instagram's "tag_media_recent" function on their API.  This returns the posts and their like count (as well as a plethora of other fun facts).  I create an array of JSON objects with the relevant data and host the array at the '/recent_json' route. A jquery table on the home page displays all of this data in a nice way.

Part 2.  (This happens upon clicking a post in the RecentActivity Table)  I perform a user query using the instagam APi and construct a json object, hosted at the '/user_json' route.   This object is used to populate a table within the existing jQuery table with the user's info.

Part 3. I use IBM's Alchemy API for sentiment analysis.  This is able to perform targeted sentiment analysis and is built for social media (i.e. smaller bodies of text).  The one major downside of using this API is its speed--there is a few second delay on rendering the table and graphs because of all the API calls.  This data is rendered in the same jQuery table as part 1.  

Part 4.  I query for the last 100 posts on capital one using the next function on the original query (which returns 20 results), then normalize the text for each post and run it through the analyzer.  I render a json array of data at '/data_trend_json'.  This data is used to construct a d3 plot of the data and then calculate and plot the line of best fit for the data. The slope of this line can be used to determine whether or not Capital One is trending positively or negatively.

Sentiment Analysis:  The Alchemy API offers both standard sentiment analysis and targeted sentiment analysis.  Standard sentiment analysis analyzes the post's text as a whole and assigns it a value between -1 and 1 depending on the general attitude of the entire post where as targeted sentiment analysis analyzes its attitude towards a specific phrase.  In both cases, there are posts that "trick" the algorithm.  The post "I hate my old credit card company--they are all a bunch of idiots. #ChaseBankSucks #switchtocapitalone #capitalone"  would register as negative with standard sentiment analysis because of the language of the post, even though it is positive towards Capital One.  However, targeted sentiment analysis gets tricked by posts like "Having an awesome  time at the Capital One Cup! Go Team! #CapitalOne" Even though, in this case, Capital One (the company) is not even relevant to the post--just an event they sponsor. Furthermore, because of the nature of instagram posts, an overwhelming number of them simply evaluate to neutral when performing targeted sentiment analysis, purely because most posts tagging capital one are not a direct commentary on the company's performance, rather a commentary on something that relates to the company (a user just got a new credit card and went on a shopping spree, they are promoting a concert sponsored by Capital One, etc.)  For these reasons, after testing both within my app, I chose to use standard sentiment analysis as it seemed to result in fewer "apparent errors" in the data.  If later on, I would prefer to use targeted analysis, i would simply have to change lines 71 and 174 to: 

alchemyapi.sentiment_targeted("text", newCaption, "CAPITALONE" {}, function(response) {

and reinstate the normalize function (saved on a previous version in my git) that turns all variations of the string "Capital One" (i.e. capitalone, CapitalOne, capital one...) to CAPITALONE before they are run through the API. 

Notes:  In my development, I used nodeJs, bootstrap, jade, and jQuery. I included a bootswatch theme so the entire app is very uniform in appearance.  Alchemy API limits free users to 1000 API calls per day, so, in the event that all of the sentiment evaluates to 0, it means I have exceeded my call limit for the day.  In case this happens,  I included a "test trends" and "test recent" page that gets hardcoded JSON rather than plotting all 0's so you can see what the page normally looks like.  The JSON array was created using my scripts on October 29th, so it behaves exactly like the real json data would.  Besides the limit on calls with my free API token, the only other downside of Alchemy API is that it causes the pages to take a few seconds to load.  Ideally, there would not be such lag. However, its usefulness in analyzing sentiment outweighed this. 

Both Instagram and Alchemy necessitated the use of the Async library.  I chose to use Async waterfall methods where functions depended on each others' results and Async forEach function when I could concurrently iterate over a collection.  

Here is the link to the repo with all of my code.  The queries can be found in index.js, the D3 html code in the views folder with the jade files, and the jQuery code in the public/javascripts/recentActivity.js file. https://github.com/celinebrass/HashtagCapitalOne

If you would prefer to run the app locally (assuming you have nodejs installed), clone the git repo, then, from within the "main" directory, run 

$npm install 

$npm start 

Please note: this app runs on node v 0.10.30.  Though this is specified in package.json, if you already have a later version of node installed, you may need to use an earlier version (I have not attempted to use it on a newer version).  If you do not have node installed, start by installing v 0.10.30.
