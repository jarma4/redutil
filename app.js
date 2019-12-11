const request = require('request');
const readline = require('readline');

// load in environment variables
require('dotenv').config();

const rl = readline.createInterface({
   input: process.stdin,
   output: process.stdout
});
rl.setPrompt('> ');
rl.prompt();

// first get oauth token
sendRequest('POST', 'https://www.reddit.com/api/v1/access_token', null)
.then(body => {
   var token = JSON.parse(body).access_token;

   // got token, now make call to API
   sendRequest('GET', 'https://oauth.reddit.com/api/v1/me/friends', token)
   .then(body => {
      console.log(`Found ${JSON.parse(body).data.children.length} friends ...`);

      rl.question('Do you want to prune friends? [y/n] ', (answer) => {
         if(answer == 'y') {
            // go through friends
            JSON.parse(body).data.children.forEach(friend => {
               var msecinday = 1000*60*60*24;
               sendRequest('GET', `https://oauth.reddit.com/user/${friend.name}/submitted/?sort=new&limit=5`, token)
               .then(submissions => {
                  let results = JSON.parse(submissions);
                  if ('error' in results || results.data.children.length === 0 || ((Date.now() - 1000*results.data.children[0].data.created_utc)/msecinday > 365 && !results.data.children[0].data.pinned)) {
                     sendRequest('DELETE', 'https://oauth.reddit.com/api/v1/me/friends/'+friend.name, token)
                     .then(()=>{
                        if ('error' in results)
                           console.log(`--- ${friend.name} no page at all, unfriending`);
                        else if (results.data.children.length === 0)
                           console.log(`=== ${friend.name} has no submissions, unfriending`);
                        else
                           console.log(`*** ${friend.name} over year since posting, unfriending`);
                        })
                     .catch(()=>{
                        console.log("Error unfriending");
                     });
                  }
               });
            });
         } else {
            rl.prompt();
            console.log('Ok, wont');
         }
         rl.close();
      });
   })
   .catch(err => {
      console.log(`Problem getting friends: ${err}`);
   });
})
.catch(err => {
   console.log(`Error getting token: ${err}`);
});

function sendRequest(method, url, tok){
   return new Promise((resolve, reject)=>{
      request({
         method: method,
         url: url,
         headers: {
            Authorization: (tok == null)?'Basic ' + new Buffer.from(process.env.CLIENTID + ':' + process.env.CLIENTSEC).toString('base64'):'bearer ' + tok,
            'User-Agent': 'redprune'
         },
         form: {  // only used when getting token
            grant_type: 'password',
            username: process.env.REDU,
            password: process.env.REDP
         }
      },
      function(err, httpResponse, body){
         if(err){
            reject(err);
         } else {
            resolve(body);
         }
      });
   });
}
// function getPage (target) {
//    return new Promise(function (resolve, reject) {
//       var jar = request.jar();
//       jar.setCookie(request.cookie('reddit_session=8456970%2C2016-05-09T20%3A17%3A19%2C2bd16354ce136bb67dfe84612418ed5d2439299a'), target);
//       request({
//       	'url':target,
//       	'jar': jar
//       	}, function (err, response, body) {
//             if (err) {
//                reject(err);
//             } else if(response.statusCode === 200) {
//                resolve(body);
//             }
//       });
//    });
// }

// getPage('https://www.reddit.com/prefs/friends/').then(function(body){
//    var beforeDate = new Date(new Date() - 1000*60*60*24*400);
//    var $ = cheerio.load(body);
//    $('.user').each(function(i){
//       var friend = $(this).find('a').text(),
//          posts = $(this).text().split('(');
//       if (posts[1].replace(')','') < 1000)
//          console.log(friend+' has '+posts[1].replace(')','')+' posts');
//       getPage('https://www.reddit.com/user/' + friend + '/submitted').then(function(body){
//          var $$ = cheerio.load(body);
//          var lastSubmit = new Date($$('.tagline > time').first().attr('datetime'));
//          if ( lastSubmit < beforeDate)
//             console.log(friend+' --- '+lastSubmit);
//       });
//    });
//    console.log('Total friends=' + $('.user').length);
// });
