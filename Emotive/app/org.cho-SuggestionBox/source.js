"use strict";
//
//
//	This is standard jQuery idiom; it gets called after the DOM tree has been created
//
$(document).ready(CDF_Initialize);

function CDF_Ready()
{
    //
    //  Declare whether or not this application would benefit from data caching
    //
    Emotive.App.Collections.allowCaching(false);

    // List of all categories and an object mapping their values to their display names
    Emotive.Data.allCategories = ['bugs','enhancements','featureRequest','performance','userExperience','generalFeedback','other'];
    Emotive.Data.categoryToDisplayName = {'bugs':'Bugs','enhancements':'Enhancements','featureRequest':'Feature Request',
        'performance':'Performance','userExperience':'User Experience','generalFeedback':'General Feedback','other':'Other'};

    // Last category selected
    Emotive.Data.category = 'generalFeedback';

    // Source of last suggestion
    Emotive.Data.suggestionSource = null;

    // Hash table and array containing most recently created suggestions
    Emotive.Data.mostRecentHash = {};
    Emotive.Data.mostRecentArray = [];
    Emotive.Data.mostRecentBlock = {};

    // Hash table and array containing most starred suggestions
    Emotive.Data.mostStarredHash = {};
    Emotive.Data.mostStarredArray = [];
    Emotive.Data.mostStarredBlock = {};
    Emotive.Data.numStarsUpdated = false;

    // Hash table and array containing search results
    Emotive.Data.searchedForHash = {};
    Emotive.Data.searchedForArray = [];
    Emotive.Data.searchedForBlock = {};

    // suggestion data object
    Emotive.Data.suggestion = {};

    // User data object
    Emotive.Data.user = {};

    // Pagination Requests to get back 25 suggestions for various criteria
    Emotive.Data.mostRecentSelect = new PaginationRequestObject({op:'SELECT', targetType:'Suggestion'}, 'createdAt', false, "Emotive.Data.mostRecentArray","Emotive.Data.mostRecentHash",{loadingType:"additive", blockSize: 25});
    Emotive.Data.mostStarredSelect = {};
    Emotive.Data.searchedForSelect = {};

    // Data structures to store information about the different categories and their number of suggestions
    Emotive.Data.categoryInfo = [];
    Emotive.Data.categoryInfoHash = {};

    // Boolean to know if the category of the suggestion changed
    Emotive.Data.categoryChanged = false;

    // Array of queries to be sent initially
    var requestedQueries = new Array();

    // Getting back the counts of the suggestions on a per-category basis
    for (var i=0; i<Emotive.Data.allCategories.length; i++)
    {
        var category = Emotive.Data.allCategories[i];
        requestedQueries.push(new QueryRequestObject(Emotive.Query.createCount("Suggestion",{category:category})));
    }

    requestedQueries.push(new DeclareDataValueObject("Emotive.Data.suggestion", "Suggestion"));

    //
    //  We must have our own CdmUser object in order to get our 'real' username; eventually this will be supplied by
    //  the MMC.
    //
    requestedQueries.push(new QueryRequestObject({op:"SELECT", targetType:"CdmUser",where:{username: {$cdm: "$currentUser" }}}, "Emotive.Data.user", null, {"targetIsSingleObject":true}));

    requestedQueries.push(Emotive.Data.mostRecentSelect);


    //
    //  Initialize the Framework; this will activate the Element-to-Data bindings and run the requested
    //  queries (for data and metadata). This is data we need before the first page can be displayed.
    //
    Emotive.Service.submit(requestedQueries, onRequestDataReady);

    //
    // Declare an event handler to fire before the #Loading page is about to be shown.
    //
    $('#Loading').bind('pagebeforeshow', function(event)
        {
            Emotive.Ui.Header.setTitle("Loading...");
        }
    );


    //
    // Declare an event handler to fire before the #MainPage page is about to be shown.
    //
    $('#MainPage').bind('pagebeforeshow', function(event)
        {
            rebuildMainPage();
            Emotive.Data.category = 'generalFeedback';
            Emotive.Ui.Header.setTitle("Suggestion Box");
            Emotive.Ui.Header.setBackButton(null);
            Emotive.Ui.Header.setRightButton("New", newSuggestion);
        }
    );

    //
    // Declare an event handler to fire before the #MostStarredSuggestions page is about to be shown.
    //
    $('#MostStarredSuggestions').bind('pagebeforeshow', function(event)
        {
            rebuildMostStarredPage();
            Emotive.Ui.Header.setTitle(Emotive.Data.categoryToDisplayName[Emotive.Data.category]);
            Emotive.Ui.Header.setBackButton("#MainPage");
            Emotive.Ui.Header.setRightButton("New", newSuggestion);
        }
    );

    //
    // Declare an event handler to fire before the #NewSuggestion page is about to be shown.
    //
    $('#NewSuggestion').bind('pagebeforeshow', function(event)
        {
            $("#newSuggestionImage").hide();
            $(".newImageButton").hide();
            $("#newAddImage").show();
            Emotive.Ui.Header.setTitle("New Suggestion")
            Emotive.Ui.Header.setRightButton(null);
        }
    );

    //
    // Declare an event handler to fire before the #SuggestionDetail page is about to be shown.
    //
    $('#SuggestionDetail').bind('pagebeforeshow', function(event)
        {
            // Only show the image associated with the suggestion if it exists
            $("#suggestionDetailImage").hide();
            if ((Emotive.Data.suggestion.image != "") && (Emotive.Data.suggestion.image != undefined) &&
                (Emotive.Data.suggestion.image != null))
            {
                // Change the image URL from http:// to https:// if necessary
                Emotive.Data.suggestion.image = modifyURL(Emotive.Data.suggestion.image);

                $("#suggestionDetailImage")[0].src = Emotive.Data.suggestion.image;
                $("#suggestionDetailImage").show();
            }
            Emotive.Ui.Header.setTitle("Details");
            Emotive.Ui.Header.setBackButton(backFromSuggestionDetail);
            // Only show the edit button if this user created the suggestion
            if (Emotive.Data.suggestion.createdBy == Emotive.Data.user.username)
            {
                Emotive.Ui.Header.setRightButton("Edit",editSuggestion);
            }
            else
            {
                Emotive.Ui.Header.setRightButton(null);
            }
        }
    );

    //
    // Declare an event handler to fire before the #EditSuggestion page is about to be shown.
    //
    $('#EditSuggestion').bind('pagebeforeshow', function(event)
        {
            // Hide add/change image button as well as image preview
            $("#editSuggestionImage").hide();
            $(".imageButton").hide();
            if ((Emotive.Data.suggestion.image != "") && (Emotive.Data.suggestion.image != undefined) &&
                (Emotive.Data.suggestion.image != null))
            {
                // Change the image URL from http:// to https:// if necessary
                Emotive.Data.suggestion.image = modifyURL(Emotive.Data.suggestion.image);

                // If the image exists, show it and show the change Image button
                $("#editSuggestionImage")[0].src = Emotive.Data.suggestion.image;
                $("#editSuggestionImage").show();

                $("#changeImage").show();
            }
            else
            {
                // Otherwise, show the add image button
                $("#addImage").show();
            }

            Emotive.Ui.Header.setTitle("Edit Suggestion")
            Emotive.Ui.Header.setBackButton(backFromEditSuggestion);
            Emotive.Ui.Header.setRightButton(null);
        }
    );

    //
    //  This listens for scrolling events; if we find we are resting at the bottom we first
    //  find out if we are on a page that can use further loading. If we are, then we will try to load
    //  the next block, if there is one.
    //
    $(window).scroll(function()
    {
        if ($(window).scrollTop() + $(window).height() == $(document).height())
        {
            var suggestionContext = getSuggestionContext();

            if (suggestionContext == 'recent')
            {
                nextPage('recent');
            }
            else if (suggestionContext == 'starred')
            {
                nextPage('starred');
            }
            else if (suggestionContext == 'searched')
            {
                nextPage('searched');
            }
        }
    });
}

//
//This gets called when the MetaData and Query requests have completed; we have all our data
//and we are ready to start.
//
function onRequestDataReady(requestArray)
{
    // Create empty array of starredSuggestions if user has none
    if (Emotive.Data.user.starredSuggestions == undefined)
    {
        Emotive.Data.user.starredSuggestions = [];
    }

    //
    // Here we are constructing an array consisting of objects for each category with the fields
    // name, count, and displayName
    var request,category, name, count, displayName, obj;
    for (var i=0;i<7;i++)
    {
        request = requestArray[i];
        if (request && request.jsonObject && request.jsonObject.where && request.jsonObject.where.category)
        {
            category = request.jsonObject.where.category
            name = request.jsonObject.where.category;
            count = request.resultCount;
            displayName = Emotive.Data.categoryToDisplayName[category];
            obj = {name:name,count:count,displayName:displayName};
            Emotive.Data.categoryInfo.push(obj);
            Emotive.Data.categoryInfoHash[category] = obj
        }
    }

    // Retrieve tabSettings from local storage, if it exists
    var tabSettings = Emotive.App.Collections.getPersistedProperties();

    // If it doesn't exist, create default one and persist
    if (!tabSettings)
    {
        tabSettings = {'mainPageTab':'whatsHot'};
        Emotive.App.Collections.setPersistedProperties(tabSettings);
    }

    // Set proper tab and then change the page
    switchTab(tabSettings.mainPageTab);
    Emotive.App.changePage("#MainPage");
}

//
// Rebuild each of the three components of the main page
//
function rebuildMainPage()
{
    rebuildWhatsHotList();
    rebuildMostRecentList();
    // Search page is okay as is. Will be rebuilt when a search is run
}

// Rebuild What's Hot Category List
function rebuildWhatsHotList()
{
    // Sort by highest number of suggestions
    Emotive.Js.Arrays.sortObjectsByNumber(Emotive.Data.categoryInfo, 'count', false);
    $("#whatsHotList").empty();
    var source = $("#mostStarredCategoriesTemplate").html();
    var template = Handlebars.compile(source);
    $("#whatsHotList").html(template(Emotive.Data));
    FW.refreshListview("#whatsHotList");
}

// Rebuild Most Recent List
function rebuildMostRecentList()
{
    $("#justAddedList").empty();
    var source = $("#mostRecentSuggestionsTemplate").html();
    var template = Handlebars.compile(source);
    $("#justAddedList").html(template(Emotive.Data));
    FW.refreshListview("#justAddedList");
}

// Rebuild the search tab
function rebuildSearchPage()
{
    $("#browseList").empty();
    var source = $("#searchedForSuggestionsTemplate").html();
    var template = Handlebars.compile(source);
    $("#browseList").html(template(Emotive.Data));
    FW.refreshListview("#browseList");
}

// Called when "New" button is pressed on the main page. Creates a new Suggestion object and navigates to the
// NewSuggestion Page
function newSuggestion()
{
    var suggestion = createNewSuggestion();

    Emotive.Data.set("Emotive.Data.suggestion",suggestion);

    var currentPageId = $('.ui-page-active').attr('id');
    Emotive.Ui.Header.setBackButton("#"+currentPageId);
    Emotive.App.changePage("#NewSuggestion");
}

// Create a new suggestion object to be populated on the NewSuggestion page
function createNewSuggestion()
{
    var suggestion = new Object();
    suggestion.category = Emotive.Data.category;
    suggestion.app = "";
    suggestion.title = "";
    suggestion.body = "";

    return suggestion;
}

// Called when user wants to attach the image to their Suggestion
function addImage()
{
    var imageName = "suggestionImage" + new Date().getTime();
    var path = "/SuggestionImages/" + imageName;
    var url = Emotive.Service.getEndpoint() + "/resource" + path;
    Emotive.Data.url = url;

    Emotive.Device.Camera.photograph(onImageSuccess, onImageFailure,
        {destinationType: Emotive.Device.Camera.DestinationType.POST_TO_SERVER, maxResolution:640, server:Emotive.Data.url});
}

// Success callback for camera photograph function
function onImageSuccess()
{
    var create;
    if ($('.ui-page-active').attr('id') == 'NewSuggestion')
    {
        create = true;
    }
    else if (($('.ui-page-active').attr('id') == 'EditSuggestion'))
    {
        create = false;
    }
    else
    {
        return;
    }

    if (create)
    {
        // If the capture was successful, set the src parameter of our image
        // tag and then show it. Also, set the image parameter of our suggestion
        $("#newSuggestionImage")[0].src = Emotive.Data.url;
        $("#newSuggestionImage").show();

        $(".newImageButton").hide();
        $("#newChangeImage").show();
        Emotive.Data.suggestion.image = Emotive.Data.url;
    }
    else
    {
        $("#editSuggestionImage")[0].src = Emotive.Data.url;
        $("#editSuggestionImage").show();

        $(".imageButton").hide();
        $("#changeImage").show();
        Emotive.Data.suggestion.image = Emotive.Data.url;
    }

}

// Failure callback for camera photograph function
function onImageFailure(type,errorMessage)
{
    if (type != STATUS_CANCELED)
    {
        Emotive.Ui.Dialog.alert("There was a problem uploading your photo. Please try again.");
    }
}

// Called when "Edit" button is selected on a suggestion detail page
// Stores current category (incase the counts need to be updated), and changes to edit page
function editSuggestion()
{
    Emotive.Js.Objects.clone(Emotive.Data.suggestion);
    Emotive.App.changePage("#EditSuggestion");
}

// Called when 'Submit Suggestion' button is pressed on the new or edit suggestion page
function saveSuggestion()
{
    Emotive.Data.categoryChanged = false;
    // Based on which page you are on, decide if we are creating or editing a suggestion
    var create;
    if ($('.ui-page-active').attr('id') == 'NewSuggestion')
    {
        create = true;
    }
    else if (($('.ui-page-active').attr('id') == 'EditSuggestion'))
    {
        create = false;

        // If no values changed, do nothing.
        Emotive.Js.Objects.compareClones(Emotive.Data.suggestion);
        if (!Emotive.Data.suggestion.ISMODIFIED)
        {
            Emotive.Ui.Dialog.alert("No changes have been made.")
            return;
        }
    }
    else
    {
        return;
    }

    // Data validation
    if (Emotive.Data.suggestion.title == "")
    {
        Emotive.Ui.Dialog.alert("Please provide a title for your suggestion.");
        return;
    }
    else if (Emotive.Data.suggestion.body == "")
    {
        Emotive.Ui.Dialog.alert("Please provide a description for your suggestion.");
        return;
    }
    else if (Emotive.Data.suggestion.app == "")
    {
        Emotive.Ui.Dialog.alert("Please specify which app your suggestion is about.");
        return;
    }
    // Begin creating the object to be inserted
    else
    {
        var values = {};

        // If we are creating, assign all values (including some defaults)
        if (create)
        {
            if (Emotive.Data.suggestion.image)
            {
                values.image = Emotive.Data.suggestion.image;
            }
            values.title = Emotive.Data.suggestion.title;
            values.category = Emotive.Data.suggestion.category;
            values.app = Emotive.Data.suggestion.app;
            values.body = Emotive.Data.suggestion.body;
            values.open = true;
            values.stars = 0;
            values.status = 'proposed';
        }
        else
        {
            // If we are updating, only assign the values that changed
            var changes = Emotive.Js.Objects.analyzeCloneChanges(Emotive.Data.suggestion);

            if (changes)
            {
                for (var prop in changes)
                {
                    if (prop)
                    {
                        values[prop] = changes[prop]['to'];
                    }
                }
            }
        }


        // Either create an insert or an update, depending on what page you are on
        if (create)
        {
            var insertQuery = Emotive.Query.createInsert("Suggestion",values);
        }
        else
        {
            var updateQuery = Emotive.Query.createUpdate("Suggestion",Emotive.Data.suggestion.id,values);
        }

        var onSuccessfulInsert = function(requestArray)
        {
            if (requestArray[0].restResponse.status != 'ERROR')
            {
                // If the insert is successful, retrieve it and then add the new suggestion to the existing data structures
                Emotive.Service.submit(
                    [new QueryRequestObject(Emotive.Query.createSelect('Suggestion',{id:requestArray[0].restResponse.objectId}))],function(requestArray){
                        if (requestArray[0].restResponse.status != 'ERROR')
                        {
                            // Edit the most recent and category info data structures to reflect new data
                            var newSuggestion = requestArray[0].results[0];
                            Emotive.Data.mostRecentArray.splice(0,0,newSuggestion);
                            Emotive.Data.mostRecentHash[newSuggestion.id] = newSuggestion;
                            rebuildMostRecentList();
                            Emotive.Data.categoryInfoHash[Emotive.Data.suggestion.category].count++;
                            rebuildWhatsHotList();
                            Emotive.App.changePage("#MainPage");
                        }
                        else
                        {
                            handleRESTErrors(requestArray[0].restResponse,"Error selecting the newly created suggestion.");
                        }

                    });
            }
            else
            {
                handleRESTErrors(requestArray[0].restResponse,"Error creating a new suggestion.");
            }
        }

        var onSuccessfulUpdate = function(requestArray)
        {
            if (requestArray[0].restResponse.status != 'ERROR')
            {
                if (changes.category)
                {
                    Emotive.Data.categoryChanged = true;
                    Emotive.Data.categoryInfoHash[changes.category['from']].count--;
                    Emotive.Data.categoryInfoHash[changes.category['to']].count++;
                }
                rebuildWhatsHotList();

                // If the recently edited object was found by some means other than the "Most Recent" list,
                // and it also happens to be on the most recent list, we need to update it's entry in the corresponding
                // data structures
                if (Emotive.Data.suggestionSource != 'recent')
                {
                    var obj = Emotive.Data.mostRecentHash[Emotive.Data.suggestion.id];
                    if (obj)
                    {
                        var index = Emotive.Data.mostRecentArray.indexOf(obj);
                        if (index != -1)
                        {
                            Emotive.Data.mostRecentArray[index] = Emotive.Data.suggestion;
                        }
                        Emotive.Data.mostRecentHash[Emotive.Data.suggestion.id] = Emotive.Data.suggestion;
                        rebuildMostRecentList();
                    }
                }
                Emotive.Data.set("Emotive.Data.suggestion",Emotive.Data.suggestion);
                Emotive.App.changePage("#SuggestionDetail");
            }
            else
            {
                handleRESTErrors(requestArray[0].restResponse,"Error creating a new suggestion.");
            }
        }

        if (create)
        {
            // Issue insert query
            Emotive.Service.submit([new NonQueryRequestObject(insertQuery)],onSuccessfulInsert);
        }
        else
        {
            // Issue update query
            Emotive.Service.submit([new NonQueryRequestObject(updateQuery)],onSuccessfulUpdate);
        }
    }
}

// Called when a suggestion is selected to be viewed
function showSuggestionDetail(suggestionId)
{
    // Figures whether this suggestion is being accessed via the recent, starred, or search view
    var suggestionContext = getSuggestionContext();
    Emotive.Data.suggestionSource = suggestionContext;

    // Set the Emotive.Data.suggestion variable
    switch (suggestionContext)
    {
        case 'recent':
        {
            Emotive.Data.set("Emotive.Data.suggestion",Emotive.Data.mostRecentHash[suggestionId]);
            break;
        }
        case 'starred':
        {
            Emotive.Data.set("Emotive.Data.suggestion",Emotive.Data.mostStarredHash[suggestionId]);
            break;
        }
        case 'searched':
        {
            Emotive.Data.set("Emotive.Data.suggestion",Emotive.Data.searchedForHash[suggestionId]);
            break;
        }
    }

    // Show appropriate button (star or unstar)
    $(".starButton").hide();
    if (Emotive.Data.user.starredSuggestions.indexOf(suggestionId) != -1)
    {
        $("#unstar").show();
    }
    else
    {
        $("#star").show();
    }

    Emotive.App.changePage("#SuggestionDetail");
}

// Helper function for viewing the details of a suggestion
// Uses category string to grab the display version
BindingObject.defineFunction( "prepareSuggestionForDisplay",["Emotive.Data.suggestion"]);
function prepareSuggestionForDisplay(trackerObject)
{
    if (Emotive.Data.suggestion && Emotive.Data.suggestion.category)
    {
        var displayName = Emotive.Data.categoryToDisplayName[Emotive.Data.suggestion.category];
        DM.set("Emotive.Data.suggestion.displayName", displayName, trackerObject);
    }
}

// Changes tabs and hides/shows appropriate divs for the given tab
function switchTab(id)
{
    $("[data-role='navbar'] a").removeClass("ui-btn-active ui-state-persist");
    var tabSettings = {'mainPageTab':id};
    Emotive.App.Collections.setPersistedProperties(tabSettings);
    var divId = "#" + id + "Div";
    var tabId = "#" + id + "Tab";
    $(".tabDiv").hide();
    $(divId).show();
    $(tabId).addClass('ui-btn-active ui-state-persist');
}

// Callback when user selects the back button on the suggestionDetail page
function backFromSuggestionDetail()
{
    if ((Emotive.Data.suggestionSource == 'starred') && !Emotive.Data.categoryChanged)
    {
        showCategory(Emotive.Data.category, false);
    }
    else
    {
        Emotive.Data.categoryChanged = false;
        Emotive.App.changePage("#MainPage");
    }
}

// Callback when user selects the back button on the editSuggestion page
function backFromEditSuggestion()
{
    Emotive.Js.Objects.rollbackClone(Emotive.Data.suggestion);
    Emotive.Data.set("Emotive.Data.suggestion", Emotive.Data.suggestion);
    Emotive.App.changePage("#SuggestionDetail");
}

// Shows a list of suggestions for the given category
function showCategory(categoryName, forward)
{
    // If the user recently starred or unstarred a suggestion, and the count of the stars
    // would be out of sync, then a redraw would be necessary
    // Also need to check if this is being accessed via the back button or not
    if (Emotive.Data.numStarsUpdated == false && !forward)
    {
        Emotive.App.changePage("#MostStarredSuggestions");
    }
    else
    {
        // If there aren't any suggestions yet under the category, do not change pages
        if (Emotive.Data.categoryInfoHash[categoryName] && (Emotive.Data.categoryInfoHash[categoryName].count == 0))
        {
            FW.alert("There are currently no suggestions in the " + Emotive.Data.categoryToDisplayName[categoryName] +
                " category.");
        }
        else
        {
            Emotive.Data.category = categoryName;

            Emotive.Data.mostStarredHash = {};
            Emotive.Data.mostStarredArray = [];

            // Create pagination request
            Emotive.Data.mostStarredSelect = new PaginationRequestObject({op:'SELECT', targetType:'Suggestion',
                    where:{category:categoryName}},'stars', false, "Emotive.Data.mostStarredArray",
                    "Emotive.Data.mostStarredHash",{loadingType:"additive", blockSize: 25});

            var serverCallback = function(requestArray)
            {
                if (requestArray[0].restResponse.status != 'ERROR')
                {
                    Emotive.Data.numStarsUpdated = false;
                    Emotive.App.changePage("#MostStarredSuggestions");
                }
                else
                {
                    handleRESTErrors(requestArray[0].restResponse,
                        "Error retrieving suggestions for the category: " + Emotive.Data.categoryToDisplayName[Emotive.Data.category]);
                }
            }

            Emotive.Service.submit([Emotive.Data.mostStarredSelect],serverCallback);
        }
    }
}

//  Rebuilds the list of the most starred suggestions by category
function rebuildMostStarredPage()
{
    $("#mostStarredList").empty();
    var source = $("#mostStarredSuggestionsTemplate").html();
    var template = Handlebars.compile(source);
    $("#mostStarredList").html(template(Emotive.Data));
    FW.refreshListview("#mostStarredList");
}

// Called when a user stars or unstars a suggestion
function toggleSuggestionStar(action)
{
    // Prepare parameters to send to server operation
    var params = {};
    var name;
    params.suggestionId = Emotive.Data.suggestion.id;

    // Name and starCount parameter of server operation depends on the action
    switch (action)
    {
        case 'star':
        {
            name = 'addSuggestion';
            params.newStarCount = Emotive.Data.suggestion.stars + 1;
            break;
        }
        case 'unstar':
        {
            name = 'removeSuggestion';
            params.newStarCount = Emotive.Data.suggestion.stars - 1;
            break;
        }
    }

    var query = Emotive.Query.createInvoke('CdmUser',name,params);

    var serverCallback = function(requestArray)
    {
        if (requestArray[0].restResponse.status != 'ERROR')
        {
            if (action == 'star')
            {
                // Change button and add suggestionId to user's list of starredSuggestions
                $("#star").hide();
                $("#unstar").show();
                Emotive.Data.user.starredSuggestions.push(Emotive.Data.suggestion.id);
            }
            else
            {
                // Change button and remove suggestionId from user's list of starredSuggestions
                $("#unstar").hide();
                $("#star").show();
                var index = Emotive.Data.user.starredSuggestions.indexOf(Emotive.Data.suggestion.id)
                if (index != -1)
                {
                    Emotive.Data.user.starredSuggestions.splice(index,1);
                }
            }

            // Change the amount of stars for the suggestion
            Emotive.Data.suggestion.stars = params.newStarCount;

            // Trigger any redrawing necessary
            switch (Emotive.Data.suggestionSource)
            {
                case ('recent'):
                {
                    break;
                }
                case ('searched'):
                {
                    break;
                }
                case ('starred'):
                {
                    Emotive.Data.numStarsUpdated = true;
                }
            }
        }
        else
        {
            handleRESTErrors(requestArray[0].restResponse,"There was an error " + action + "ring this suggestion.");
        }
    }

    Emotive.Service.submit([new NonQueryRequestObject(query)],serverCallback);
}

// Queries for suggestions that match the search input
// and then draws the results
function searchForSuggestion()
{
    // Grab search input and get rid of all the whitespace
    var searchText = $("#searchText").val();
    var searchText = Emotive.Js.Strings.trimRight(Emotive.Js.Strings.trimLeft(searchText));
    var searchParams = searchText.split(/\W+/);

    // If user did not input anything
    if ((searchParams.length == 1) && (searchParams[0]==""))
    {
        Emotive.Ui.Dialog.alert("Please enter text before searching for a suggestion.")
        $("#searchText").val('');
        return;
    }
    else
    {
        var where = {};
        where.$or = [];

        for (var i=0;i<searchParams.length;i++)
        {
            where.$or.push({title:{$regex:searchParams[i]+".*",options:'i'}});
            where.$or.push({body:{$regex:searchParams[i]+".*",options:'i'}});
        }

        var select = Emotive.Query.createSelect("Suggestion",where,null,null);

        var serverCallback = function(requestArray)
        {
            if (requestArray[0].restResponse.status != 'ERROR')
            {
                rebuildSearchPage();
            }
            else
            {
                handleRESTErrors(requestArray[0].restResponse,"Error searching for suggestions");
            }
        }

        Emotive.Data.searchedForHash = {};
        Emotive.Data.searchedForArray = [];

        Emotive.Data.searchedForSelect = new PaginationRequestObject(select,'createdAt',false, "Emotive.Data.searchedForArray",
            "Emotive.Data.searchedForHash",{loadingType:"additive", blockSize: 25});
        Emotive.Service.submit([Emotive.Data.searchedForSelect],serverCallback);
    }
}

// Helper function to return a string representation of how
// long it's been since the creation of the suggestion
Handlebars.registerHelper('timeSince', function(createdAt) {
    var now = new Date().getTime();
    var secSince = (now - createdAt)/1000;
    var minSince = secSince/60;
    var hSince = minSince/60;
    var dSince = hSince/24;

    if (secSince < 60)
    {
        return "Just now";
    }
    else if (minSince < 60)
    {
        var min = Math.round(minSince);
        if (min == 1)
        {
            return "1 min ago";
        }
        else
        {
            return min + " mins ago"
        }
    }
    else if (hSince < 24)
    {
        var hour = Math.round(hSince);
        if (hour == 1)
        {
            return "1 hr ago";
        }
        else
        {
            return hour + " hrs ago"
        }
    }
    else if (dSince < 31)
    {
        var day = Math.round(dSince);
        if (day == 1)
        {
            return "1 day ago";
        }
        else
        {
            return day + " days ago"
        }
    }
    else
    {
        return "> 1 month ago";
    }
});

// Helper function to display a proper string of how many stars a suggestion has
Handlebars.registerHelper('starString', function(stars) {
    if (stars == 1)
    {
        return "1 star";
    }
    else
    {
        return stars + " stars";
    }
});

// Function called when scroll triggers the next block of results
function nextPage(tab)
{
    switch(tab)
    {
        case 'recent':
        {
            Emotive.Data.mostRecentSelect.loadNextBlock(afterBlockLoadedCallback);
            break;
        }
        case 'starred':
        {
            Emotive.Data.mostStarredSelect.loadNextBlock(afterBlockLoadedCallback);
            break;
        }
        case 'searched':
        {
            if (Emotive.Data.searchedForSelect.loadNextBlock != undefined)
            {
                Emotive.Data.searchedForSelect.loadNextBlock(afterBlockLoadedCallback);
            }
            break;
        }
    }
}

// Callback for when new block of results comes in from server
function afterBlockLoadedCallback(rowsAddedStartingAtIndex,totalRowCount)
{
    var suggestionContext = getSuggestionContext();
    switch (suggestionContext)
    {
        case 'recent':
        {
            Emotive.Data.mostRecentBlock = Emotive.Data.mostRecentArray.slice(rowsAddedStartingAtIndex,totalRowCount);

            var source = $("#mostRecentSuggestionsAdditionalTemplate").html();
            var template = Handlebars.compile(source);
            $("#justAddedList").append(template(Emotive.Data));
            FW.refreshListview("#justAddedList");
            break;
        }
        case 'starred':
        {
            Emotive.Data.mostStarredBlock = Emotive.Data.mostStarredArray.slice(rowsAddedStartingAtIndex,totalRowCount);

            var source = $("#mostStarredSuggestionsAdditionalTemplate").html();
            var template = Handlebars.compile(source);
            $("#mostStarredList").append(template(Emotive.Data));
            FW.refreshListview("#mostStarredList");
            break;
        }
        case 'searched':
        {
            Emotive.Data.searchedForBlock = Emotive.Data.searchedForArray.slice(rowsAddedStartingAtIndex,totalRowCount);

            var source = $("#searchedForSuggestionsAdditionalTemplate").html();
            var template = Handlebars.compile(source);
            $("#browseList").append(template(Emotive.Data));
            FW.refreshListview("#browseList");
            break;
        }

    }
}

// Figures whether a suggestion is being accessed via the recent, starred, or search view
function getSuggestionContext()
{
    if(($('.ui-page-active').attr('id') == 'MainPage') && ($("#justAddedTab").hasClass('ui-btn-active')))
    {
        return 'recent';
    }
    else if(($('.ui-page-active').attr('id') == 'MostStarredSuggestions'))
    {
        return 'starred';
    }
    else if(($('.ui-page-active').attr('id') == 'MainPage') && ($("#browseTab").hasClass('ui-btn-active')))
    {
        return 'searched';
    }
}

// Generic function to generate an alert with the REST errors,
// or if there are none specified, a provided one.
function handleRESTErrors(response, defaultMessage)
{
    if (response.errors && (response.errors.length > 0))
    {
        var errString = "";
        var err;
        for (var i = 0; i < response.errors.length; i++)
        {
            err = response.errors[i];
            errString += err.errorMessage + "\n";
        }
        Emotive.Ui.Dialog.alert(errString);
    }
    else
    {
        Emotive.Ui.Dialog.alert(defaultMessage);
    }
    return;
}

// Modifies a URL that begins with http:// to begin with https://
// if the context it is being accessed from is an https:// address
function modifyURL(url)
{
    var endpoint = Emotive.Service.getEndpoint();

    if ((endpoint.search(/^https:\/\//i) >= 0) && (url.search(/^http:\/\//i) >=0))
    {
        url = url.replace(/^http:\/\//i, 'https://');
    }

    return url;
}

/*
 * Copyright 2011-2013 Emotive Communications Inc. All rights reserved.
 */
