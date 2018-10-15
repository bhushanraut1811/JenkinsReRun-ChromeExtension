/**
 * Created by bhushan.raut on 2/18/2017.
 */
var jobUrl;
var branch;
var tags;
var mode;
var device;
var language;
var turnOff;
var params = "";
var buildWithParams = "/parambuild/?";
var newBuild = "/build?delay=0sec";
var reportsUrl = "/cucumber-html-reports/feature-overview.html";
var newBuildUrl;
var failedTags = "";
var listOfIds = [];
var newTabFlag = false;
var paramsAfterTags = "";
var isValidUrl = true;
var isNoFailures = false;

editRerunBuild = function (url) {
    jobUrl = url.linkUrl;
    prepareBuildUrl();
    fetchJobBuildData(jobUrl + "api/json", false, false);
    //use flag to check proper parsing done
    if (isValidUrl) {
        chrome.tabs.update({url: newBuildUrl + buildWithParams + params});
    }
};

reRunBuild = function (url) {
    //auto rerun the build
    jobUrl = url.linkUrl;
    prepareBuildUrl();
    fetchJobBuildData(jobUrl + "api/json", false, false);

    //use flag to check proper parsing done
    if (isValidUrl) {
        chrome.tabs.update({url: newBuildUrl + buildWithParams + params});
        //use build  with params and click using chrome tab execute
        //if else to properly set parameters based on choice parameters available
        setTimeout(function () {
            chrome.tabs.executeScript({
                code: "var buildButton=document.getElementById('yui-gen1-button'); buildButton.click();"
            });
        }, 1500);
    }
};


editRerunBuildFailures = function (url) {
    jobUrl = url.linkUrl;
    prepareBuildUrl();
    fetchJobBuildData(jobUrl + "api/json", true, true);
};

reRunBuildFailures = function (url) {
    jobUrl = url.linkUrl;
    prepareBuildUrl();
    fetchJobBuildData(jobUrl + "api/json", true, false);
};

chrome.contextMenus.create({
    title: "Rerun",
    contexts: ["link"],
    onclick: reRunBuild,
    'documentUrlPatterns': [
        'http://172.18.8.108:8080/job/*',
        'http://localhost:8080/job/*'
    ]
});
//http://stackoverflow.com/questions/15997266/how-to-allow-an-extension-for-two-domains-only
chrome.contextMenus.create({
    title: "Edit and Rerun",
    contexts: ["link"],
    onclick: editRerunBuild,
    'documentUrlPatterns': [
        'http://172.18.8.108:8080/job/*',
        'http://localhost:8080/job/*'
    ]
});

chrome.contextMenus.create({
    title: "Rerun failures",
    contexts: ["link"],
    onclick: reRunBuildFailures,
    'documentUrlPatterns': [
        'http://172.18.8.108:8080/job/*',
        'http://localhost:8080/job/*'
    ]
});

chrome.contextMenus.create({
    title: "Edit and Rerun failures",
    contexts: ["link"],
    onclick: editRerunBuildFailures,
    'documentUrlPatterns': [
        'http://172.18.8.108:8080/job/*',
        'http://localhost:8080/job/*'
    ]
});

function prepareBuildUrl() {
    //prepare URL
    var splitArray = jobUrl.split("/");
    newBuildUrl = splitArray[0] + '//' + splitArray[1] + '/' + splitArray[2] + '/' + splitArray[3] + '/' + splitArray[4];
}

function fetchJobBuildData(jobUrl, isFailures, isEditFailures) {
    params = "";
    isValidUrl = true;
    var xhttp = new XMLHttpRequest();
    xhttp.open("GET", jobUrl, false);
    xhttp.setRequestHeader("Content-type", "application/json");
    xhttp.send();

    if (xhttp.readyState === 4) {   //if complete
        if (xhttp.status === 200) {
            try {
                var response = JSON.parse(xhttp.responseText);
                //check for valid json page else alert with not support pop up message
                /*  if (response.actions[0].parameters[0]) {
                 alert("Not supported here!")
                 } else {*/
                var actions = response.actions[0];
                var parameters = actions.parameters;

                if (parameters[0] !== undefined) {
                    branch = parameters[0].value;
                    params += "branch=" + branch;
                }

                if (parameters[1] !== undefined) {
                    tags = parameters[1].value;
                    var allTags = tags.split("\n");
                    var tagList = "";
                    for (var i = 0; i < allTags.length; i++) {
                        tagList += allTags[i] + "%0A";
                    }
                    params += "&tags=" + tagList;
                    //fetch failure status from report and update tags
                }
                if (parameters[2] !== undefined) {
                    mode = parameters[2].value;
                    params += "&mode=" + mode;
                    paramsAfterTags += "&mode=" + mode;

                }
                if (parameters[3] !== undefined) {
                    device = parameters[3].value;
                    params += "&device=" + device;
                    paramsAfterTags += "&device=" + device;
                }
                if (parameters[4] !== undefined) {
                    language = parameters[4].value;
                    params += "&language=" + language;
                    paramsAfterTags += "&language=" + language;
                }
                // for tablet on/off
                if (parameters[5] !== undefined) {
                    turnOff = parameters[5].value;
                    params += "&turnOff=" + turnOff;
                    paramsAfterTags += "&turnOff=" + turnOff;
                }

                //params = "branch=" + branch + "&tags=" + tags + "&mode=" + mode + "&device=" + device + "&language=" + language;
                //if failures then do async work there and all flow
                if (isFailures) {
                    params = "";
                    fetchFailedTestIds(isEditFailures);
                }
            } catch (err) {
                isValidUrl = false;
                alert("Operation not supported!");
            }
        } else {
            isValidUrl = false;
            alert("Operation not supported!!");
        }
    }
}

function fetchFailedTestIds(isEditFailures) {

    function parseFailedIds(htmlDoc) {
        failedTags = "";
        listOfIds = [];
        var doc = new DOMParser().parseFromString(htmlDoc.toString(), "text/html");
        var tab1 = doc.getElementById('tablesorter');
        var elements = tab1.getElementsByTagName('tr');

        for (var index = 2; index < elements.length - 1; ++index) {
            var testId = elements[index].getElementsByTagName('td');
            var duration = testId[11].getElementsByClassName("duration");
            var status = testId[12].firstChild.wholeText;
            //var testHref = testId[12].firstChild.wholeText;
            if (status === "Failed") {
                var testHref = testId[0].firstChild;
                var testName = testHref.firstChild.wholeText;
                listOfIds.push(testName.split(":")[0]);
            }
            if (duration.wholeText === "000ms") {
                var testHref_1 = testId[0].firstChild;
                var testName_1 = testHref_1.firstChild.wholeText;
                listOfIds.push(testName.split(":")[0]);
            }
        }

        if (!(listOfIds.length > 0)) {
            //check this
            isNoFailures = true;
            alert("No failures in the build");
            return false;
        }
        //removes duplicates
        var uniqueIds = listOfIds.filter(function (elem, pos) {
            return listOfIds.indexOf(elem) == pos;
        });

        //test last blank line
        for (var i = 0; i < uniqueIds.length; i++) {
            failedTags = failedTags + uniqueIds[i] + "%0A";
        }
        console.log(failedTags);
    }

    function createParams() {
        params = "branch=" + branch + "&tags=" + failedTags + paramsAfterTags;
    }

    function createBuildForRerun() {
        //recreate params over here
        createParams();
        //open the the link
        console.log("Opening Build!");
        if (!isNoFailures) {
            chrome.tabs.update({url: newBuildUrl + buildWithParams + params});
            console.log("Done");

            if (!isEditFailures) {
                setTimeout(function () {
                    chrome.tabs.executeScript({
                        code: "var buildButton=document.getElementById('yui-gen1-button'); buildButton.click();"
                    });
                }, 1000);
            }
        }
    }

    function getReport(url, resolve, reject) {
        // Return a new promise.
        return new Promise(function (resolve, reject) {
            // Do the usual XHR stuff
            var req = new XMLHttpRequest();
            req.open('GET', url);

            req.onload = function () {
                // This is called even on 404 etc
                // so check the status
                if (req.status == 200) {
                    // Resolve the promise with the response text
                    getSuccessData(req.response);
                }
                else {
                    getErrorData(Error(req.statusText));
                }
            };

            // Handle network errors
            req.onerror = function () {
                getErrorData(Error("Network Error"));
            };

            // Make the request
            req.send();
        });
    }

    getSuccessData = function (data) {
        console.log(data);
        parseFailedIds(data);
        //apply check for no failures in build ....if else
        createBuildForRerun();
    };

    getErrorData = function (data) {
        alert("Not Supported. Error!");
        console.log(data);
    };
    isNoFailures = false;
    getReport(jobUrl + reportsUrl, getSuccessData, getErrorData);

}


