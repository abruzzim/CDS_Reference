$(document).ready(CDF_Initialize);

FastClick.attach(document.body);

function CDF_Ready() {

    Emotive.Unsupported.defineWrapper($("#wrapper"));

    $("form").rememberState({
        clearOnSubmit: false,
        noticeDialog: $("<p/>").html("Do you want to restore your previously entered info? <br><br><br><a class='pointer' style='text-decoration:none'>Yes </a><br><br><br><p id='hideRemember' class='pointer'>No</p>").addClass("remember_state invertible"),
        noticeSelector: ".remember_state",
        objName: "patient_care_form"
    });

    $(".remember_state").addClass("invertible");

    // Initialize everything to Night Mode
    $(".invertible").addClass("night");

    // Handles the collapsible sections
    $(".expandable").click(function(event) {
        $(this).children().toggle();
        $(this).next().toggle();
    });

    // If they have a form in local storage prepare to hide/show accordingly
    if ($(".remember_state").is(":visible")){
        $("#hideRemember").click(function(event){
            $(".remember_state").hide();
        });

        $('.remember_state>a,.remember_state>p').click(function(event){
            $('form>li').show();
        });
    } else { // Otherwise just show the form
        $('form>li').show();
    }

    Emotive.Ui.Header.setRightButton("Print", printPDF);

    // Initialize all typeaheads and input fields
    initializeTypeaheads();
    initializeInputFields();
};

// Convert Data to printer-friendly format and print (or save if debugging)
function printPDF()
{
    if (Emotive.Device.isOffline()){
        alert("You are currently in offline mode. You will not be able to print " +
            "this form until you have returned online.");
        return;
    } else {

        var obj = $("form").serializeObject();

        var radioTable = {};

        $.each($("input[type='radio']"),function(index,element){radioTable[element.name]=1});

        for (property in radioTable)
        {
            if (obj[property] == undefined)
            {
                obj[property] = "";
            }
        }

        var doc = new jsPDF();

        // Setting maximums and initializing line y-coordinate
        var maxWidthOfLine = 170; // units unknown
        var maxHeight = 280; // in mm
        var currHeight = 20; // in mm

        function newPage()
        {
            doc.addPage();
            currHeight = 20;
        }

        // Text adding functionality
        // Takes into account running into the bottom of the page
        // Adds space at the end of the line
        function addText(str) {

            var strArr = doc.splitTextToSize(str, maxWidthOfLine);

            if ((currHeight + (strArr.length * 5)) > maxHeight)
            {
                newPage();
            }

            doc.text(20, currHeight, strArr);
            currHeight += ((strArr.length * 5) + 5);
        }

        // Creates a comma-separated list of the array
        function handleCheckboxes(initStr,arr)
        {
            if (arr)
            {
                if (typeof arr === "string")
                {
                    initStr += arr;
                    return initStr;
                }

                for (var i=0;i<arr.length;i++)
                {
                    initStr += arr[i];

                    if ((arr.length - i) != 1)
                    {
                        initStr += ", "
                    }
                }

            }

            return initStr;
        }

        function oneLineNewPageCheck()
        {
            if ((currHeight + 5) >= maxHeight)
            {
                newPage();
                currHeight = 20;
            }
        }

        // Page Header
        doc.setFontSize(16);
        addText("Patient Care Form");

        // Section Header
        doc.setFontSize(14)
        addText("Patient Information");

        // Default font size
        doc.setFontSize(12);

        // Submission time
        if (obj.submissionDateTime != "")
        {
            var submissionDateTime = new Date(obj.submissionDateTime).toUTCString();
            submissionDateTime = submissionDateTime.substring(0, submissionDateTime.length-4);
            addText("Date & Time: " + submissionDateTime);
        }
        else
        {
            addText("Date & Time:");
        }

        addText("Patient Name: " + obj.patientName);

        addText("Diagnosis: " + ((obj.diagnosis=="Other")?obj.otherDiagnosis:obj.diagnosis));

        addText("Referring Hospital: " + obj.referringHospital);

        addText("PMD: " + obj.pmd);

        if (obj.dob != "")
        {
            var d1 = new Date(obj.dob);
            var d2 = new Date(d1.getUTCFullYear(),d1.getUTCMonth(),d1.getUTCDate());

            addText("Date of Birth: " + d2.toLocaleDateString());
        }
        else
        {
            addText("Date of Birth:");
        }

        if (obj.age != "")
        {
            addText("Age: " + obj.age + " " + obj.ageUnit);
        }
        else
        {
            addText("Age:");
        }

        addText("Gender: " + obj.gender);

        if (obj.estWeight != "")
        {
            addText("Estimated Weight: " + obj.estWeight + " kg");
        }
        else
        {
            addText("Estimated Weight:");
        }

        if (obj.estHeight != "")
        {
            addText("Estimated Height: " + obj.estHeight + " cm");
        }
        else
        {
            addText("Estimated Height:");
        }

        var allergiesString = handleCheckboxes("Allergies: ",obj.allergy);

        if (obj.otherAllergies != "")
        {
            if (obj.allergy)
            {
                allergiesString += (", " + obj.otherAllergies);
            }
            else
            {
                allergiesString += ("" + obj.otherAllergies);
            }

        }
        addText(allergiesString);

        var isolationPrecautionsString = handleCheckboxes("Isolation Precautions: ", obj.isolationPrecautions);
        addText(isolationPrecautionsString);

        addText("Language: " + obj.language);

        addText("Medical History: " + obj.medicalHistory);

        newPage();

        // Section Header
        doc.setFontSize(14)
        addText("Present Status");

        // Default font size
        doc.setFontSize(12);

        addText("Temp: " + obj.tempValue + " degrees Celsius");

        addText("O2 Sats: " + obj.o2Sats);

        addText("BP: " + obj.bp1 + " / " + obj.bp2);

        addText("MAP: " + obj.map);

        addText("HR: " + obj.hr);

        addText("RR: " + obj.rr);

        doc.setFontType("bold");

        addText("CRT");

        doc.setFontType("normal");

        addText("Central: " + obj.perfusionCRT_central);

        addText("Peripheral: " + obj.perfusionCRT_peripheral);

        doc.setFontType("bold");

        addText("Pulses");

        doc.setFontType("normal");

        addText("Central: " + obj.perfusionPulse_central);

        addText("Peripheral: " + obj.perfusionPulse_peripheral);

        var skinString = handleCheckboxes("Skin: ", obj.skin);

        addText(skinString);

        if (!((obj.pupilRightNum == "") && (obj.pupilRightSpeed == "")))
        {
            addText("Pupil (right): " + obj.pupilRightNum + ", " + obj.pupilRightSpeed);
        }
        else
        {
            addText("Pupil (right):");
        }

        if (!((obj.pupilLeftNum == "") && (obj.pupilLeftSpeed == "")))
        {
            addText("Pupil (left): " + obj.pupilLeftNum + ", " + obj.pupilLeftSpeed);
        }
        else
        {
            addText("Pupil (left):");
        }

        addText("GCS: " + obj.gcs);

        var colorString = handleCheckboxes("Color: ", obj.color);

        addText(colorString);

        var locString = handleCheckboxes("Loc: ",obj.loc);

        addText(locString);

        oneLineNewPageCheck();

        doc.text(60,currHeight,"Tone");
        doc.text(100,currHeight,"Posture/Strength")
        currHeight += 10;

        oneLineNewPageCheck();

        doc.text(20,currHeight,"RA");
        doc.text(60,currHeight,obj.tone_RA_1);
        doc.text(100,currHeight,obj.tone_RA_2);
        currHeight +=10;

        oneLineNewPageCheck();

        doc.text(20,currHeight,"LA");
        doc.text(60,currHeight,obj.tone_LA_1);
        doc.text(100,currHeight,obj.tone_LA_2);
        currHeight +=10;

        oneLineNewPageCheck();

        doc.text(20,currHeight,"RL");
        doc.text(60,currHeight,obj.tone_RL_1);
        doc.text(100,currHeight,obj.tone_RL_2);
        currHeight +=10;

        oneLineNewPageCheck();

        doc.text(20,currHeight,"LL");
        doc.text(60,currHeight,obj.tone_LL_1);
        doc.text(100,currHeight,obj.tone_LL_2);
        currHeight +=10;

        addText("Pain FACES: " + obj.pain_face);

        doc.setFontType("bold")

        newPage();

        addText("FLACC Pain Scale");

        doc.setFontType("normal");

        addText("Face: " + obj.flacc_face);
        addText("Legs: " + obj.flacc_legs);
        addText("Activity: " + obj.flacc_activity);
        addText("Cry: " + obj.flacc_cry);
        addText("Consolability: " + obj.flacc_consolability);

        addText("Urine Output: " + obj.urineOutput);

        addText("Emesis: " + obj.emesis);
        addText("NG: " + obj.ng);

        var oralIntakeString = handleCheckboxes("Oral Intake: ",obj.oralIntake)

        if (obj.otherOralIntake != "")
        {
            if (obj.oralIntake)
            {
                oralIntakeString += (", " + obj.otherOralIntake);
            }
            else
            {
                oralIntakeString += ("" + obj.otherOralIntake);
            }
        }

        addText(oralIntakeString);

        newPage();

        // Section Header
        doc.setFontSize(14);
        addText("Present Therapy");
        doc.setFontSize(12);

        doc.text(20,currHeight,"ETT Size:");
        doc.text(60,currHeight,obj.ettSize);

        if (obj.ettSize == "Uncuffed")
        {
            doc.text(100,currHeight,obj.uncuffedETTSize);
        }
        else if (obj.ettSize == "Cuffed")
        {
            doc.text(100,currHeight,obj.cuffedETTSize);
        }
        currHeight +=10;

        oneLineNewPageCheck();

        doc.text(20,currHeight,"ETT Position:");
        doc.text(60,currHeight,obj.ettPos);
        currHeight +=10;

        addText((obj.insertionDepthAtLib != "")?("Insertion depth at lip: " + obj.insertionDepthAtLib + " cm"):("Insertion depth at lip:"));

        addText((obj.numIntubationAttempts != "")?("# of Intubation attempts at sending facility: " + obj.numIntubationAttempts):("# of Intubation attempts at sending facility:"));

        doc.setFontType("bold");

        addText("ETT Cuff Pressure Data");

        doc.setFontType("normal");

        addText((obj.ECPD_sendingFacility != "")?("At sending facility: " + obj.ECPD_sendingFacility + " cm H2O"):("At sending facility:"));

        addText((obj.ECPD_at1500Ft != "")?("At 1500 ft: " + obj.ECPD_at1500Ft + " cm H2O"):("At 1500 ft:"));

        addText((obj.ECPD_atMaxElevation != "")?("At maximum elevation: " + obj.ECPD_atMaxElevation + " cm H2O"):("At maximum elevation:"));

        addText((obj.ECPD_maxElevation != "")?("Maximum elevation: " + obj.ECPD_maxElevation + " ft"):("Maximum elevation:"));

        addText((obj.ECPD_inCHRCO != "")?("In CHRCO ICU/ED: " + obj.ECPD_inCHRCO + " cm H2O"):("In CHRCO ICU/ED:"));

        doc.setFontType("bold");

        addText("Vent Settings");

        doc.setFontType("normal");

        addText("Mode: " + obj.ventSettings_mode);

        addText((obj.ventSettings_rate != "")?("Rate: " + obj.ventSettings_rate + " bpm"):("Rate:"));

        addText((obj.ventSettings_tv != "")?("TV: " + obj.ventSettings_tv + " ml"):("TV:"));

        addText((obj.ventSettings_peep != "")?("PEEP: " + obj.ventSettings_peep + " cm H2O"):("PEEP:"));

        addText((obj.ventSettings_pip != "")?("PIP: " + obj.ventSettings_pip + " cm H2O"):("PIP:"));

        addText((obj.ventSettings_itime != "")?("I time: " + obj.ventSettings_itime + " sec"):("I Time:"));

        addText("Other: " + obj.ventSettings_other);

        addText("IV Solution: " + obj.ivSolution);

        addText((obj.ivfRate != "")?("IVF Rate: " + obj.ivfRate + " ml/hr"):("IVF Rate:"));

        if (obj.piv == "on")
        {
            addText("PIV: Yes, " + obj.numPIV);
        }
        else
        {
            addText("PIV: No");
        }

        if (obj.io == "on")
        {
            addText("IO: Yes, " + obj.numIO);
        }
        else
        {
            addText("IO: No");
        }

        if (obj.arterialLine == "on")
        {
            addText("Arterial Line: Yes");
        }
        else
        {
            addText("Arterial Line: No");
        }

        if (obj.centralLine == "on")
        {
            addText("Central Line: Yes");
        }
        else
        {
            addText("Central Line: No");
        }

        addText("Medication Therapy: " + obj.medicationTherapy);

        addText("Abnormal Lab Results: " + obj.abnormalLabResults);

        addText("Radiology Results: " + obj.radiologyResults);

        addText("Treatment Plan: " + obj.treatmentPlan);

        addText("Social Issues: " + obj.socialIssues);

    //    doc.save("Test.pdf");

        var documentInBase64 = Base64.encode(doc.output());

        MMC.printing.print(documentInBase64, function() {},  function(info) { alert("An error occurred while trying to print the form. Please try again."); });
    }
}


function initializeTypeaheads()
{
    $("#languageTypeahead").typeahead({source:["English","Spanish","French","Mandarin","Cantonese"]});
    $("#referringHospitalTypeahead").typeahead({source:['ST ROSE HOSPITAL  HAYWARD', 'SUTTER DELTA MEDICAL CENTER',
        'DOCTORS HOSPITAL - SAN PABLO', 'EDEN MEDICAL CENTER', 'CONTRA COSTA REGIONAL MEDICAL CENTER', 'NORTH BAY MEDICAL CENTER',
        'SUTTER SOLANO MEDICAL CENTER', 'JOHN MUIR MEDICAL CENTER - CONCORD CAMPUS', 'ALTA BATES SUMMIT MEDICAL CENTER - MAIN CAMPUS',
        'ST JOSEPHS MEDICAL CENTER - STOCKTON', 'JOHN MUIR MEDICAL CENTER', 'HIGHLAND ALAMEDA COUNTY MEDICAL CENTER', 'DOCTORS HOSPITAL - MANTECA',
        'SAN JOAQUIN GENERAL HOSPITAL', 'SUTTER TRACY COMMUNITY HOSPITAL', 'SANTA ROSA MEMORIAL HOSPITAL', 'ALAMEDA HOSPITAL',
        'WASHINGTON HOSPITAL OF FREMONT', 'SAN RAMON MEDICAL CENTER', 'QUEEN OF THE VALLEY HOSPITAL', 'SAN LEANDRO HOSPITAL',
        'ST HELENA HOSPITAL - CLEARLAKE', 'KAISER - RICHMOND', 'VACA VALLEY HOSPITAL', 'VALLEY CARE MEDICAL CENTER',
        'UKIAH VALLEY MEDICAL CENTER', 'SONORA REGIONAL HOSPITAL', 'DAMERON HOSPITAL', 'DAVID GRANT MEDICAL CENTER',
        'SUTTER COAST HOSPITAL', 'DOCTORS HOSPITAL - MODESTO', 'SUTTER LAKESIDE HOSPITAL', 'MEMORIAL HOSPITAL - MODESTO',
        'PETALUMA VALLEY HOSPITAL', 'LODI MEMORIAL HOSPITAL', 'SONOMA VALLEY HOSPITAL', 'ST JOSEPH HOSPITAL  - EUREKA',
        'KAISER - ANTIOCH', 'KAISER - VALLEJO', 'KAISER - OAKLAND', 'RENOWN REGIONAL MEDICAL CENTER', 'MARIN GENERAL HOSPITAL',
        'KAISER - HAYWARD', 'MENDOCINO COAST DISTRICT HOSPITAL', 'HOWARD MEMORIAL HOSPITAL', 'ST HELENA HOSPITAL',
        'SUTTER SANTA ROSA', 'KAISER - FREMONT', 'KAISER - SANTA ROSA', 'ALTA BATES SUMMIT MEDICAL CENTER - SUMMIT CAMPUS',
        'SUMMIT MEDICAL CENTER - OAKLAND', 'NOVATO COMMUNITY HOSPITAL', 'MERCY REDDING', 'EMANUEL MEDICAL CENTER',
        'ST MARYS REGIONAL MEDICAL CENTER - RENO', 'KAISER - MANTECA', 'PALM DRIVE HOSPITAL', 'REDWOOD MEMORIAL HOSPITAL',
        'GOOD SAMARITAN HOSPITAL - SAN JOSE', 'HEALDSBURG DISTRICT HOSPITAL', 'KAISER - SAN RAFAEL', 'MERCY MEDICAL CENTER - MERCED',
        'SUTTER MEMORIAL HOSPITAL', 'ALTA BATES SUMMIT MEDICAL CENTER - HERRICK CAMPUS', 'FEATHER RIVER HOSPITAL', 'ENLOE MEDICAL CENTER',
        'MARK TWAIN HOSPITAL', 'JOHN C. FREMONT HEALTH CARE', 'UC DAVIS MEDICAL CENTER', 'OAK VALLEY DISTRICT HOSPITAL', 'SUNRISE HOSPITAL',
        'LOS BANOS MEMORIAL HOSPITAL', 'MERCY SAN JUAN HOSPITAL', 'METHODIST HOSPITAL - SACRAMENTO', 'SAN FRANCISCO GENERAL HOSPITAL',
        'UCSF BENIOFF CHILDRENS HOSPITAL', 'REGIONAL MEDICAL CENTER OF SAN JOSE', 'OCONNOR HOSPITAL', 'SHASTA REGIONAL MEDICAL CENTER',
        'FAIRCHILD MEDICAL CENTER', 'ST ELIZABETH COMMUNITY HOSPITAL', 'TRACY FAMILY PRACTICE', 'CASTRO VALLEY PEDIATRICS',
        'VALLEYCARE URGENT CARE - DUBLIN', 'OROVILLE HOSPITAL', 'COLUSA REGIONAL MEDICAL CENTER', 'KAISER - WALNUT CREEK',
        'COMMUNITY REGIONAL MEDICAL CENTER', 'BAKERSFIELD MEMORIAL HOSPITAL', 'ADVENTIST MEDICAL CENTER - HANFORD',
        "CHILDREN'S HOSPITAL OF CENTRAL CALIFORNIA", 'MAMMOTH HOSPITAL', 'COMMUNITY HOSPITAL - MONTEREY', 'PLUMAS DISTRICT HOSPITAL',
        'KAISER - SACRAMENTO SOUTH', 'MERCY GENERAL HOSPITAL', 'HAZEL HAWKINS MEMORIAL HOSPITAL', "CHILDREN'S HOSPITAL - SAN DIEGO/RADY CHILDRENS",
        'UCSF SAN FRANCISCO MEDICAL CENTER', 'UCSF SAN FRANCISCO MT ZION CAMPUS', 'PENINSULA HOSPITAL', 'TWIN CITIES COMMUNITY HOSPITAL',
        'SIERRA VISTA REGIONAL MEDICAL CNTR', 'SAN MATEO COUNTY GENERAL', 'SETON MEDICAL CENTER - DALY CITY', 'KAISER - SANTA CLARA',
        "LUCILE PACKARD CHILDREN'S", 'TRINITY HOSPITAL - WEAVERVILLE', 'RIDEOUT MEMORIAL HOSPITAL', 'WASHINGTON HOSPITAL CENTER']});
}

function initializeInputFields()
{
    var d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());

    var dateStr = d.toISOString();

    var formattedDateStr = dateStr.substring(0,dateStr.length-8);

    $("input[name='submissionDateTime']").val(formattedDateStr);

    $("input[value='Years']").attr('checked',true);


}

$.fn.serializeObject = function()
{
    var o = {};
    var a = this.serializeArray();
    $.each(a, function() {
        if (o[this.name] !== undefined) {
            if (!o[this.name].push) {
                o[this.name] = [o[this.name]];
            }
            o[this.name].push(this.value || '');
        } else {
            o[this.name] = this.value || '';
        }
    });
    return o;
};