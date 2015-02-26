$(document).ready(function() {

    FastClick.attach(document.body);

    // Full list of configuration options available here:
    // https://github.com/hakimel/reveal.js#configuration
    Reveal.initialize({
        progress: false,
        rollingLinks: false,
        center:false,
        transition:"none"
    });

    Reveal.removeEventListeners();

    // Hide the navigation arrows, header bar, and bottom corner timer to begin
    // as well as the do not miss header
    $(".showInProtocol").hide();
    $(".showInDoNotMiss").hide();

    // Initialize everything to Night Mode
    $(".invertible").addClass("night");

    setPseudoSlideHeight();

    CDF_Initialize();

    // Class on anchor tags that jumps to certain slides
    $(".slideJump").click(function(event) {
        var h = (parseInt(event.currentTarget.dataset.horizontal) || 0);
        var v = (parseInt(event.currentTarget.dataset.vertical) || 0);
        Reveal.slide(h,v);
    });

    // Handles the collapsible sections
    $(".expandable").click(function(event) {
        $(this).children().toggle();
        $(this).next().toggle();
    });

    // Jumps to top of slide column
    $(".backToTop").click(function(event) {
        var indices = Reveal.getIndices();
        if (indices.v > 0)
        {
            Reveal.slide(indices.h,0);
        }
    });

    $(window).resize(function(){
        setPseudoSlideHeight();
    });

});

function CDF_Ready() {

    Emotive.Data =
    {
        // Flag that prevents attempts to start an already started timer
        timerStarted: false,

        // Indicates night mode
        night: true,

        // Initial state: home
        state:'home',

        // Initially has event listeners turned off
        eventListeners:false,

        // Countdown timer starts at 15:00
        timerMin:15,
        timerSec:0,

        // Timer intervals and initial state
        timerState: 0,
        timerIntervals: [
            {"VS":true,"IVF":true,"Labs":true,"Abx":false,"Press":false,"HC":false,"PBRC":false},
            {"VS":true,"IVF":true,"Labs":false,"Abx":true,"Press":true,"HC":false,"PBRC":false},
            {"VS":true,"IVF":true,"Labs":false,"Abx":true,"Press":false,"HC":false,"PBRC":false},
            {"VS":true,"IVF":false,"Labs":false,"Abx":false,"Press":false,"HC":false,"PBRC":false},
            {"VS":true,"IVF":true,"Labs":false,"Abx":true,"Press":true,"HC":true,"PBRC":false},
            {"VS":true,"IVF":false,"Labs":false,"Abx":false,"Press":false,"HC":false,"PBRC":false},
            {"VS":true,"IVF":true,"Labs":false,"Abx":false,"Press":true,"HC":false,"PBRC":false},
            {"VS":true,"IVF":false,"Labs":false,"Abx":false,"Press":false,"HC":false,"PBRC":false},
            {"VS":true,"IVF":true,"Labs":true,"Abx":false,"Press":true,"HC":false,"PBRC":true}
        ],

        // Once timer starts this variable will hold that time
        startedAt:null
    };

    $("#resumeProtocol").click(function(event) {

        var localSettings = Emotive.App.Collections.getPersistedProperties();
        if ((!localSettings) || (!localSettings.startedAt))
        {
            Reveal.slide(1,0);
        }
        else
        {
            if (!localSettings.night)
            {
                toggleColors();
            }

            // Get the current time and the time the app started and take the difference
            var timeNow = new Date().getTime();
            var timeStarted = new Date(localSettings.startedAt).getTime();
            var secondsSinceStart = Math.floor((timeNow - timeStarted)/1000);

            // Calculate the number of seconds in one interval
            var secondsPerInterval = (Emotive.Data.timerMin * 60) + Emotive.Data.timerSec;

            // Calculate the number of intervals elapsed, reset the timerState and repaint the timer guides
            Emotive.Data.timerState = Math.floor(secondsSinceStart/secondsPerInterval);
            if (Emotive.Data.timerState != 0)
            {
                repaintTimerGuides();
            }
            var secondsLeft = secondsPerInterval - (secondsSinceStart - (Emotive.Data.timerState * secondsPerInterval));


            // Calculate minutes and seconds
            var minutes = Math.floor(secondsLeft/60);
            var seconds = secondsLeft - (minutes * 60);

            // Set the timers
            $('#countdown').countdown({until: '+' + minutes + 'm +' + seconds + 's',
                format: 'MS',
                compact:true,
                onExpiry:resetCountdown
            });
            $('#elapsed').countdown({since: new Date(localSettings.startedAt), compact:true, format: 'HMS',description:''});
            Emotive.Data.startedAt = localSettings.startedAt;

            Emotive.Data.timerStarted = true;

            Reveal.slide(localSettings.indices.h,localSettings.indices.v);
        }

    });

    $(window).unload(function() {

        var indices = Reveal.getIndices()
        if (!(indices.h === 0 && indices.v === 0))
        {
            var localSettings = {
                indices: indices,
                startedAt: Emotive.Data.startedAt,
                night: Emotive.Data.night
            };

            Emotive.App.Collections.setPersistedProperties(localSettings);
        }
    });

    // Event listener for page changes
    // Starts timer if it has not started yet
    // Hides and shows in-protocol-specific widgets
    Reveal.addEventListener( 'slidechanged', function( event ) {
        // event.previousSlide, event.currentSlide, event.indexh, event.indexv

        // Only show Do Not Miss header if we're on the do not miss page
        if (event.indexh != 1)
        {
            $(".showInDoNotMiss").hide();
        }
        else
        {
            $(".showInDoNotMiss").show();
        }


        if (!Emotive.Data.timerStarted && (event.indexh > 1))
        {
            Emotive.Data.startedAt = new Date();
            $('#elapsed').countdown({since: Emotive.Data.startedAt, compact:true, format: 'HMS',description:''});
            $('#countdown').countdown({until: '+' + Emotive.Data.timerMin + 'm +' + Emotive.Data.timerSec + 's',
                format: 'MS',
                compact:true,
                onExpiry:resetCountdown
            });
            Emotive.Data.timerStarted = true;

            // Tap to dismiss listener
            $(".tablePresent td:not(.inactive):not(.tiny)").click(function(){
                $(this).toggleClass("dismissed");
            });
        }

        if (event.indexh <= 1)
        {
            $(".showInProtocol").hide();
            if (Emotive.Data.eventListeners)
            {
                Reveal.removeEventListeners();
                Emotive.Data.eventListeners = false;
            }
        }
        else
        {
            $(".showInProtocol").show();
            if (!Emotive.Data.eventListeners)
            {
                Reveal.addEventListeners();
                Emotive.Data.eventListeners = true;
            }
        }
    });

    // Enable event listeners when "Do Not Miss" acknowledged
    $("#okBtn").click(function(event) {
        if (!Emotive.Data.eventListeners)
        {
            Reveal.addEventListeners();
            Emotive.Data.eventListeners = true;
        }
    });

    // Makes sure the selected button is active
    $(".header-table-btn").click(function(event) {
        var oldState = Emotive.Data.state;
        var newState = event.currentTarget.dataset.state;

        if (oldState == newState) return;

        var unpressed = "./assets/btn_" + oldState + ".png";
        var pressed = "./assets/btn_" + newState + "_on.png";

        $("[data-state=" + oldState + "]").attr("src",unpressed);
        $("[data-state=" + newState + "]").attr("src",pressed);

        $("." + oldState).hide();
        $("." + newState).show();

        if (newState != "home")
        {
            if (Emotive.Data.eventListeners)
            {
                Reveal.removeEventListeners();
                Emotive.Data.eventListeners = false;
            }
        }
        else
        {
            if (!Emotive.Data.eventListeners)
            {
                Reveal.addEventListeners();
                Emotive.Data.eventListeners = true;
            }
        }

        Emotive.Data.state = newState;
    });

    $(".vitalsModalLaunch").click(function(event) {
        $('#lookupModal').modal();
    });
}

function toggleColors()
{
    $(".invertible").toggleClass("night day");
    if (Emotive.Data.night)
    {
        $(".arrow").attr("src","./assets/downarrow_blk.png")
        $(".sunMoon").attr("src","./assets/btn_day.png")
        $(".info").attr("src","./assets/icon_info_light.png")
        $(".warning").attr("src","./assets/icon_warning_light.png")
        Emotive.Data.night = false;
    }
    else
    {
        $(".arrow").attr("src","./assets/downarrow.png")
        $(".sunMoon").attr("src","./assets/btn_night.png")
        $(".info").attr("src","./assets/icon_info_dark.png")
        $(".warning").attr("src","./assets/icon_warning_dark.png")
        Emotive.Data.night = true;
    }
}

function setPseudoSlideHeight()
{
    var barHeight = $($(".headerBar")[0]).height();

    $(".pseudoSlide").height($(document).height() - barHeight);

}


function resetCountdown()
{
    $("#countdown").countdown('option',{until: '+' + Emotive.Data.timerMin + 'm +' + Emotive.Data.timerSec + 's',
        format: 'MS',
        compact:true,
        onExpiry:resetCountdown
    });

    Emotive.Data.timerState++;
    repaintTimerGuides();
}

function repaintTimerGuides()
{
    var numIntervals = Emotive.Data.timerIntervals.length;
    var pastObject = Emotive.Data.timerIntervals[(Emotive.Data.timerState - 1)%numIntervals];
    var presentObject =  Emotive.Data.timerIntervals[(Emotive.Data.timerState)%numIntervals];
    var futureObject = Emotive.Data.timerIntervals[(Emotive.Data.timerState + 1)%numIntervals];
    var selector;

    $(".filler").parent().remove();

    for (var measurement in pastObject)
    {
        selector = "#" + measurement + "Past";

        if (pastObject[measurement])
        {
            $(selector).removeClass("inactive");
            $(selector).show();
        }
        else
        {
            $(selector).addClass("inactive");
            $(selector).hide();
        }
    }

    var active = $(".tablePast td").length - $(".tablePast td.inactive").length;
    if (active < 6)
    {
        while (active < 6)
        {
            $(".tablePast .tiny").parent().before('<tr><td class="mini inactive filler">&nbsp;</td></tr>');
            active++;
        }
    }

    for (var measurement in presentObject)
    {
        selector = "#" + measurement + "Present";

        if (presentObject[measurement])
        {
            $(selector).removeClass("inactive");
            $(selector).show();
        }
        else
        {
            $(selector).addClass("inactive");
            $(selector).hide();
        }
    }

    active = $(".tablePresent td").length - $(".tablePresent td.inactive").length;
    if (active < 6)
    {
        while (active < 6)
        {
            $(".tablePresent .tiny").parent().before('<tr><td class="mini inactive filler">&nbsp;</td></tr>');
            active++;
        }
    }

    for (var measurement in futureObject)
    {
        selector = "#" + measurement + "Future";

        if (futureObject[measurement])
        {
            $(selector).removeClass("inactive");
            $(selector).show();
        }
        else
        {
            $(selector).addClass("inactive");
            $(selector).hide();
        }
    }

    active = $(".tableFuture td").length - $(".tableFuture td.inactive").length;
    if (active < 6)
    {
        while (active < 6)
        {
            $(".tableFuture .tiny").parent().before('<tr><td class="mini inactive filler">&nbsp;</td></tr>');
            active++;
        }
    }

    // Reset dismiss task settings
    $(".tablePresent td:not(.inactive):not(.tiny)").unbind('click');
    $(".tablePresent td:not(.tiny)").removeClass("dismissed");
    $(".tablePresent td:not(.inactive):not(.tiny)").click(function(){
        $(this).toggleClass("dismissed");
    });


}