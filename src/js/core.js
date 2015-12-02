String.prototype.trunc =
		function( n, useWordBoundary ){
			var isTooLong = this.length > n,
					s_ = isTooLong ? this.substr(0,n-1) : this;
			s_ = (useWordBoundary && isTooLong) ? s_.substr(0,s_.lastIndexOf(' ')) : s_;
			return  isTooLong ? s_ + '&hellip;' : s_;
		};

if (console && console.log) {
	console.log("IFeedle - version 1.0");
}
var JSON = JSON || {};
// implement JSON.stringify serialization
JSON.stringify = JSON.stringify || function (obj) {
	var t = typeof (obj);
	if (t != "object" || obj === null) {
		// simple data type
		if (t == "string") obj = '"' + obj + '"';
		return String(obj);
	}
	else {
		// recurse array or object
		var n, v, json = [], arr = (obj && obj.constructor == Array);
		for (n in obj) {
			v = obj[n];
			t = typeof(v);
			if (t == "string") v = '"' + v + '"';
			else if (t == "object" && v !== null) v = JSON.stringify(v);
			json.push((arr ? "" : '"' + n + '":') + String(v));
		}
		return (arr ? "[" : "{") + String(json) + (arr ? "]" : "}");
	}
};
function initColumns() {
	$(".column").sortable({
		connectWith: ".column",
		receive: function (event, ui) {
			widgetMoved();
		},
		update: function (event, ui) {
			widgetMoved();
		}
	});

	$(".portlet").addClass("ui-widget ui-widget-content ui-helper-clearfix ui-corner-all")
		.find(".portlet-header")
		.addClass("ui-widget-header ui-corner-all")
		.prepend("<span class='ui-icon ui-icon-minusthick'></span>")
		.end()
		.find(".portlet-content");

	$(".portlet-header .ui-icon").click(function () {
		$(this).toggleClass("ui-icon-minusthick").toggleClass("ui-icon-plusthick");
		$(this).parents(".portlet:first").find(".portlet-content").toggle();
	});

	$(".column").disableSelection();
}
var widgetCounter = 0;

function makePortlet(url, col, row, highlight, content) {
	var portlet = highlight ? $("<div class='portlet'></div>") : $($($(".column")[col]).find(".portlet")[row]);
	portlet.data("url", url);
	var portletHeader = $("<div class='portlet-header'><div class='title'></div><div class='close' title='Remove this feed'>&#215;</div></div>");
	var portletContent = $("<div class='portlet-content" + (highlight ? " highlight" : "") + "'></div>");
	portletContent.append(content);
	portlet.append(portletHeader);
	portlet.append(portletContent);
	if (highlight) {
		$($(".column")[col]).hide().prepend(portlet).fadeIn('slow', function () {
			portletContent.removeClass("highlight", 2000);
		});
	}
	portlet.find(".close").on("click", function (e) {
		var idx = portlet.index();
		portlet.fadeOut();
		if (feeds[col].length == 1) {
			feeds[col] = [];
		} else {
			feeds[col].splice(idx, 1);
		}
		setUrl();
	});
	return portlet;
}

/**
 * Gets a thumbnail URL, looking up the json and xml entry of the feed item with different ways
 * @param jsonEntry
 * @param xmlEntry
 * @returns {*}
 */
function extractThumbnailUrlFromFeed(jsonEntry, xmlEntry) {
	if (jsonEntry.mediaGroups && jsonEntry.mediaGroups.length > 0) {
		for (var m = 0; m < jsonEntry.mediaGroups.length; m++) {
			var mediaGroup = jsonEntry.mediaGroups[m];
			if (mediaGroup.contents && mediaGroup.contents.length > 0) {
				for (var c = 0; c < mediaGroup.contents.length; c++) {
					var content = mediaGroup.contents[c];
					if (content.medium == 'image') {
						if (content.thumbnails && content.thumbnails.length > 0) {
							for (var t = 0; t < content.thumbnails.length; t++) {
								var thumbnail = content.thumbnails[t];
								var url = thumbnail.url;
								if (url) {
									return url;
								}
							}
						}
					}
				}
			}
		}
	}
	var thumbnail = xmlEntry.thumbnail;
	if (thumbnail) {
		if (thumbnail.url) {
			return thumbnail.url;
		} else if (thumbnail.length > 0) {
			for (var t = 0; t < thumbnail.length; t++) {
				if (thumbnail[t].url) {
					return thumbnail[t].url;
				}
			}
		}
	}
	var cnt = xmlEntry.content;
	if (cnt && cnt.url) {
		return cnt.url;
	}
	var enclosure = xmlEntry.enclosure;
	if (enclosure && enclosure.url) {
		return enclosure.url;
	}
	return null;
}

/**
 * Load the page and get some json elements from it, using the Yahoo jql API.
 * Try to look for the thumbnail among og:image, apple-touch-icon link, etc.
 *
 * @param pageUrl the URL of the feed item to scrap.
 * @param success a success function function(thumbnailUrl). Called only if a thumbnail is actually found.
 */
function extractThumbnailUrlFromPage(pageUrl, success) {
	$.ajax({
		dataType: "json",
		url: "//query.yahooapis.com/v1/public/yql?"
		+ "q=SELECT%20*%20FROM%20html%20WHERE%20url=%27"
		+ encodeURIComponent(pageUrl)
		+ "%27%20AND%20xpath=%27descendant-or-self::meta|descendant-or-self::link%27"
		+ "&format=json&callback=?",
		success: function(data) {
			if (data && data.query && data.query.results) {
				var metas = data.query.results.meta;
				var links = data.query.results.link;
				var res, resUrl;
				res = $.grep(metas, function (meta, key) {
					return meta.hasOwnProperty("property") && meta.property === "og:image"
				});
				if(res && res.length > 0) {
					resUrl = res[0].content;
				} else {
					res = $.grep(links, function (link, key) {
						return link.hasOwnProperty("rel") && link.rel === "apple-touch-icon"
					});
					if(res && res.length > 0) {
						resUrl = res[0].href;
					}
				}
				if (resUrl) {
					success(resUrl);
				}
			}
		}
	});
}

function setThumbnailUrl(img, thumbnailUrl) {
	img.bind("load", function() {
		img.closest(".imgLiquid").imgLiquid();
	});
	img.attr("src", thumbnailUrl);
}

function loadFeed(result, url, col, row, highlight) {
//        if (!result.error) {
	var content = $("<table class='feed'></table>");
	if (!result.error) {
		for (var i = 0; i < result.items.length; i++) {
			var item = result.items[i];
			var link = (item.alternate && item.alternate.length > 0) ? item.alternate[0].href : null;
			var title = item.title;
			var summary = item.summary.content;
			summary = (new DOMParser).parseFromString(summary, "text/html").documentElement.textContent;
			summary = summary.trunc(200, true);
			var line = $("<tr><td><a target='_blank' href='"+link+"' class='image imgLiquid'><img/></a></td><td><a class=\"feed-link\" target=\"_blank\" href=\"" + link + "\">" + title + "</a><br>" + summary + "</td></tr>")
			content.append(line);
			var thumbnailUrl = item.visual ? item.visual.url : null;
			if (thumbnailUrl == null) {
				(function(capturedLine) {
					extractThumbnailUrlFromPage(link, function (resUrl) {
						var img = capturedLine.find(".image img");
						setThumbnailUrl(img, resUrl);
					});
				})(line);
			} else {
				setThumbnailUrl(line.find(".image img"), thumbnailUrl);
			}
		}
	} else {
		if (url.substring(url.length - 3) != "rss") {
			setFeed((url.substring(url.length - 1) == "/") ? (url + "rss") : (url + "/rss"), col, row, highlight);
			return;
		} else {
			content.append($("<div class='error'>Error while loading URL: '" + url + "'</div>"));
		}
	}
	var portlet = makePortlet(url, col, row, highlight, content);
	var portletHeader = portlet.find(".portlet-header");
	if (!result.error) {
		var feedLink = (result.alternate && result.alternate.length > 0) ? result.alternate[0].href : "";
		portletHeader.find(".title").html("<a target='_blank' href='" + feedLink + "'>" + result.title + "</a>");
	} else {
		portletHeader.find(".title").text("Error");
	}
}

function setFeed(url, col, row, highlight) {
	if (url == 'https://mail.google.com') {
		var portlet = makePortlet(url, col, row, highlight);
		portlet.find(".portlet-header").find(".title").text("GMail");
		var signinUrl = "http://localhost:8081/oauth2/google/auth?clientRedirectURI=" + encodeURIComponent(window.location.href);
		portlet.find(".portlet-content").html("<a href='" + signinUrl + "'>Sign in</a>");
//        window.location = "http://localhost:8081/oauth2/google/auth?clientRedirectURI=" + encodeURIComponent(window.location.href);
//        url = "http://localhost:8081/gmail?userName=amelki156&password=XXXXX";
//        $.get(url, function(feedStr) {
//            alert(feedStr);
//            var parsed = new DOMParser().parseFromString(feedStr, "text/xml");
//            var result = {};
//            result.title = parsed.getElementsByTagName("title")[0];
//            result.entries = [];
//            loadFeed(result, url, col, start);
//        });
	} else if (url == 'ifeedle://welcome') {
		var content = $("<p>IFeedle, dead simple dashboards for your feeds</p>");
		var portlet = makePortlet(url, col, row, highlight, content);
		portlet.find(".portlet-header").find(".title").text("Welcome to IFeedle!");
	} else {
		if (url.substring(0, 4) != "http") {
			url = "http://" + url;
		}
		var streamId = "feed/" + url;
		var feedlyUrl = "http://cloud.feedly.com/v3/streams/contents?count=3&streamId="+encodeURIComponent(streamId);
		tryGetThroughProxy(feedlyUrl, function(res){
			loadFeed(res, url, col, row, highlight);
		}, function(error) {
			var result = { error: true };
			loadFeed(result, url, col, row, highlight);
		}, 3);
	}
}

function tryGetThroughProxy(url, success, error, maxAttempts) {
	$.ajax({
		// use a proxy to avoid CORS issues while calling the feedly API
		url: "https://jsonp.afeld.me/",
		async: true,
		data: {
			url: url
		},
		success: success,
		error: function(err) {
			if (maxAttempts > 0) {
				console.log("Retrying call through proxy: " + url);
				tryGetThroughProxy(url, success, error, maxAttempts - 1);
			} else {
				error(err);
			}
		}
	});
}

jQuery.extend({
	getQueryParameters : function(str) {
		return (str || document.location.search).replace(/(^\?)/,'').split("&").map(function(n){return n = n.split("="),this[n[0]] = n[1],this}.bind({}))[0];
	}
});
function getURLParameter(name) {
	return $.getQueryParameters()[name];
}

function onPageLoad() {
	var feedsParam = getURLParameter("feeds");
	var version = getURLParameter("v") || 1;
	if (feedsParam) {
		if (version > 1) {
			feedsParam = LZString.decompressFromEncodedURIComponent(feedsParam);
		}
		feeds = $.parseJSON(feedsParam);
	} else {
		initDefault();
	}
	initDashboard();
}


function addFeed(urls) {
	urls = urls.split(" ");
	for (var i = 0; i < urls.length; i++) {
		var url = urls[i].trim();
		setFeed(url, 0, 0, true);
		feeds[0].splice(0, 0, url);
	}
	$(".feed-link").on("click", function(e) {
		ga('send', 'event', 'feed-link', $(e.target).attr("href"), 'user-action');
	});
	setUrl();
	$("#feedUrl").typeahead("val", "");
	$("#feedUrl").focus();
}
var feeds = {};

function initDefault() {
//    feeds = [
//        [ "http://www.arretsurimages.net/rss/tous-les-contenus.rss", "http://www.rue89.com/homepage/feed" ],
//        [ "http://www.lemonde.fr/rss/sequence/0,2-3208,1-0,0.xml", "http://www.liberation.fr/interactif/rss/actualites/index.FR.php" ],
//        [ "http://www.mediapart.fr/articles/feed", "http://feedproxy.google.com/TechCrunch" ],
//    ];
	feeds = [
//		["ifeedle://welcome", "mashable.com", "http://feeds.bbci.co.uk/news/world/rss.xml"],
		["mashable.com", "http://feeds.bbci.co.uk/news/world/rss.xml"],
		["http://feeds.feedburner.com/cnet/NnTv", "http://rss.news.yahoo.com/rss/mostemailed"],
		["http://rss.cnn.com/rss/edition.rss", "http://feedproxy.google.com/TechCrunch"]
	];
	setUrl();
}

function setUrl() {
	var json = JSON.stringify(feeds);
	var compressed = LZString.compressToEncodedURIComponent(json);
	window.history.pushState("state", "title", window.location.pathname + "?v=2&feeds=" + compressed);
}

function makeUrl(feeds) {
	return "dashboard.html?feeds=" + encodeURIComponent(JSON.stringify(feeds));
}

function widgetMoved() {
	feeds = [];
	$(".column").each(function () {
		var urls = [];
		$(this).find(".portlet").each(function () {
			urls[urls.length] = $(this).data("url");
		});
		feeds[feeds.length] = urls;
	});
	setUrl();
}

function signinCallback(authResult) {
	if (authResult['status']['signed_in']) {
		gapi.client.load('plus','v1', function(){
			var request = gapi.client.plus.people.get({
				'userId': 'me'
			});
			request.execute(function(resp) {
				if (!resp.error) {
					$('#profile').text(resp.displayName);
					$('#profile').show();
					console.log('Retrieved profile for:' + resp.displayName);
				} else {
					console.log(resp.error.message);
				}
			});
/*
			gapi.client.plus.people.get({ 'userId': 'me' }).execute(function(resp) {
				console.log('Retrieved profile for:' + resp.displayName);
			});
*/
		});
		// Update the app to reflect a signed in user
		// Hide the sign-in button now that the user is authorized, for example:
		$('#signin').hide();
		$('#signout').show();
		// Add the Google access token to the Cognito credentials login map.
		AWS.config.credentials = new AWS.CognitoIdentityCredentials({
			IdentityPoolId: 'us-east-1:44d16b88-677e-464d-abdd-eeac08a5c755',
			Logins: {
				'accounts.google.com': authResult['id_token']
			}
		});
		// Obtain AWS credentials
		AWS.config.credentials.get(function(){
			syncManager = new AWS.CognitoSyncManager();
		});
	} else {
		$('#signin').show();
		$('#signout').hide();
		$('#profile').text("");
		// Update the app to reflect a signed out user
		// Possible error values:
		//   "user_signed_out" - User is signed-out
		//   "access_denied" - User denied access to your app
		//   "immediate_failed" - Could not automatically log in the user
		console.log('Sign-in state: ' + authResult['error']);
	}
}

function initDashboard() {
//// set the default config object
//	var creds = new AWS.CognitoIdentityCredentials({
//		IdentityPoolId: 'us-east-1:44d16b88-677e-464d-abdd-eeac08a5c755'
//	});
//	AWS.config.credentials = creds;
	$("#signin").on('click', function() {
		gapi.auth.signIn();
	});
	$("#signout").on('click', function() {
		gapi.auth.signOut();
	});

	$("#feedUrl").typeahead({
		minLength: 3,
		hint: false,
		highlight: true
	}, {
		name : "feeds",
		display: "url",
		source : function(query, syncResults, asyncResults) {
			// Use the feedly API instead of the Google one to find feeds, because results are much better and richer
			tryGetThroughProxy("http://cloud.feedly.com/v3/search/feeds?query="+encodeURIComponent(query), function(res){
				var data = [];
				for (var i = 0; i < res.results.length; i++) {
					data[data.length] = {
						title: res.results[i].title,
						url: res.results[i].feedId.substring("feed/".length),
						iconUrl: res.results[i].iconUrl
					}
				}
				asyncResults(data);
			}, function(error) {
				// Do nothing
			}, 3);
		},
		limit: 10,
		templates : {
			suggestion: Handlebars.compile('<div><div class="icon"><img src="{{iconUrl}}"></div><div class="title">{{title}}</div><div class="url">{{url}}</div></div>')
		}
	});

	var columnsCount = feeds.length;
	if (columnsCount < 1) {
		columnsCount = 3;
	}
	$(".columns").empty();
	var c, f, columnFeeds;
	// create empty portlets
	for (c = 0; c < columnsCount; c++) {
		var column = $("<div class='column'></div>");
		$(".columns").append(column);
		columnFeeds = feeds[c];
		for (f in columnFeeds) {
			column.append($("<div class='portlet'></div>"));
		}
	}
	// fill portlets with feeds (asynchronous)
	for (c = 0; c < columnsCount; c++) {
		columnFeeds = feeds[c];
		for (f in columnFeeds) {
			var feedStr = columnFeeds[f];
			setFeed(feedStr, c, f);
		}
	}
	$(".feed-link").on("click", function(e) {
		ga('send', 'event', 'feed-link', $(e.target).attr("href"), 'user-action');
	});
	initColumns();
	$("#addFeed").on("click", function (e) {
		ga('send', 'event', 'add-feed', $("#feedUrl").val(), 'user-action');
		addFeed($("#feedUrl").val());
	});
	$("#feedUrl").on("keypress", function (e) {
		ga('send', 'event', 'search-feed', $("#feedUrl").val(), 'user-action');
		var keycode = (e.keyCode ? e.keyCode : e.which);
		if (keycode == '13') {
			ga('send', 'event', 'add-feed', $("#feedUrl").val(), 'user-action');
			addFeed($("#feedUrl").val());
			e.preventDefault();
			e.stopImmediatePropagation();
		}
	});
	$("#feedUrl").focus();
}
