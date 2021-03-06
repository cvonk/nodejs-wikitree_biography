/**
 * @abstract Client page part of a project that imports GEDCOM, generates biography that can be pasted in corresponding WikiTree profile
 * @license GPL
 * @author Coert Vonk <MY.NAME@gmail.com>
 * @url https://github.com/cvonk/nodejs-wikitree_biography
 */

/**
 * various support functions
 */

 function _putGedcomId2WtUsername(gedcomId, wtUsername) {
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("POST", '/putGedcomId2WtUsername', true);
    xmlhttp.setRequestHeader("Content-Type", "application/x-www-form-urlencoded;charset=UTF-8");
    xmlhttp.send("gedcomId=" + gedcomId + '&wtUsername=' + wtUsername);
}

function _getcomIdFromDataList(listId, inputId) {
    const list = document.getElementById(listId);
    const input = document.getElementById(inputId);
    for (let individual of list.childNodes) {
        if (individual.innerText === input.value) {
            return individual.id;
        }
    }
    _pulseBackgrond(input, 'green');
}

function _selectNextInDataList(listId, inputId, step) {
    const input = document.getElementById(inputId);
    const list = document.getElementById(listId);
    const childNodes = list.childNodes;
    for (let idx in childNodes) {
        let individual = childNodes[idx];
        //console.log(individual.innerText.length, individual.innerText, input.value.length, input.value)
        if (individual.innerText === input.value) {
            input.value = childNodes[(Number(idx)+step) % childNodes.length].value;
            return;
        }
    }
}

function _nextIndividual(listId, inputId, step) {
    _selectNextInDataList(listId, inputId, step);
    _getIndividualDetails(listId, inputId);
}

function _copyToClipboard(srcId) {
    let textarea = document.getElementById(srcId);
    textarea.select();
    document.execCommand("copy");
}

/*
function _enterListener(func) {
    function _enterPressed(event) {
        let key = event.which || event.keyCode;
        return key === 13;
    }
    return function(event) {
        if (_enterPressed(event)){
            func();
        }
    };
}
*/

function _simpleDate(v) {  // search form only seems to handle the simple case
    if (v) {
        switch (v.substr(0, 3)) {  
            case 'BET': v = v.split(/\s+(?:AND)\s+/)[0];  // only take first date; fall through to next
            case 'ABT': 
            case 'BEF': 
            case 'AFT': v = v.slice(4);
        }
        return v;
    }
}

/**
 * Prepare for Step 1: the page was loaded, now pull a list of individuals from the NodeJS server
 */
function _getIndividualsList(listId) {
    var xmlhttp = new XMLHttpRequest();
    const list = document.getElementById(listId);
    list.innerHTML = "<p>Loading ...</p>";
    xmlhttp.open("GET", "getIndividualsList", true);
    xmlhttp.onreadystatechange = function () {
        if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {

            /**
             * The NodeJS server supplied the list, now use it to populate the data list.
             * Once the user selects a name, continue at _getIndividualDetails()
             */
            list.setAttribute('tv', 'on');
            list.innerHTML = xmlhttp.responseText;    
        }
    }
    xmlhttp.send(null);
}

/**
 * Prepare for Step 2: a name was selected, now pull his/her details. Then use these to find a match on WikiTree
 */
function _getIndividualDetails(listId, inputId) {

    let gedcomId = _getcomIdFromDataList(listId, inputId);
    if (!gedcomId) {
        return;
    }
    const xmlhttp = new XMLHttpRequest();
    xmlhttp.open("POST", "getIndividualDetails", true);
    xmlhttp.onreadystatechange = function () {
        if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {

            /**
             * The NodeJS server supplied the details, now use these to populate the (hidden) 
             * search form.
             */
            const resp = JSON.parse(xmlhttp.responseText);
            if (resp.status == 'success') {
                document.getElementById("step2-detail").setAttribute('tv', 'on');
                document.getElementById("step3-detail").setAttribute('tv', 'off');
                const person = resp.person;

                const ids = {  // the WikiTree search form doesn't support all the fields at once
                    wpFirst: person.name && person.name.given,
                    wpLast: person.name && person.name.last,
                    wpBirthDate: person.birth && _simpleDate(person.birth.date),
                    //birth_location, person.birth && _simpleDate(person.birth.place),
                    wpDeathDate: person.death && person.death.date,
                    //death_location, person.death && person.death.place,
                    //father_first_name: person.father && person.father.name && person.father.name.given,
                    //father_last_name: person.father && person.father.name && person.father.name.last,
                    //mother_first_name: person.mother && person.mother.name && person.mother.name.given,
                    //mother_last_name: person.mother && person.mother.name && person.mother.name.last
                }
                const searchPersonForm = document.getElementById('searchPersonForm');
                searchPersonForm.reset();    
                for (let id in ids) {
                    document.getElementById(id).value = ids[id] ? ids[id] : '';
                }
                if (person.gender) {
                    let gender = person.gender;
                    if (gender == 'M' || gender == 'F') document.getElementById('gender_' + gender).checked = true;
                }
                // store some details in the 'mergeEditForm' used in Step 3  
                document.getElementById('gedcomId').value = resp.gedcomId;
                document.getElementById('wtUsername').value = resp.wtUsername ? resp.wtUsername : '';
                document.getElementById('biography').value = resp.biography;
                document.getElementById('postData').value = JSON.stringify(resp.gedcomx);  // details as GEDCOMX data       
                searchPersonForm.action = 'https://www.wikitree.com/wiki/Special:SearchPerson';
                searchPersonForm.submit();

                /**
                 * The user finds the matching WikiTree Username, and enters it on the on the 'mergeEditForm'.
                 * When that mergeEditForm is completed, processing continues at _reqMergeEditForm()
                 */
            }
        }

    }
    xmlhttp.setRequestHeader("Content-Type", "application/x-www-form-urlencoded;charset=UTF-8");
    xmlhttp.send("gedcomId=" + gedcomId);
}

function _pulseBackgrond(input, color) {
    input.setAttribute('pulse', 'none');
    setTimeout(function () {
      input.setAttribute('pulse', color);       
    }, 10);        
}

/**
 * Prepare for Step 3: A WikiTree Username was entered, now use that along with the details we stored as
 * GEDCOMX data we stored in _getIndividualDetails() populate a merge form on WikiTree.  The user then
 * verifies the fields and copies over, enriches the bio, previews it, and commits the changes.
 */
function _reqMergeEditForm(evt) {  // called when mergeEditForm is completed

    const mergeEditForm = document.getElementById('mergeEditForm');  // or use evt
    const wtUsernameInput = mergeEditForm.wtUsername;
    const wtUsername =wtUsernameInput.value.trim();
    const gedcomId = document.getElementById('gedcomId').value;
    if (!wtUsername) {
        evt.preventDefault();  // prevent submit
        _pulseBackgrond(wtUsernameInput, 'green');
        _putGedcomId2WtUsername(gedcomId, wtUsername);  // remove from server as well
        return;
    }
    if (wtUsername.search('-') == -1) {
        evt.preventDefault();  // prevent submit
        _pulseBackgrond(wtUsernameInput, 'red');
        alert("The WikiTree profile name should contain a '-' character\nThe name can be found in the list of search results, just before where it says \"managed by\".");
        return;
    }
    _putGedcomId2WtUsername(gedcomId, wtUsername);  // store the gedcomId - wtUsername mapping on our server
    document.getElementById("step3-detail").setAttribute('tv', 'on');
    
    mergeEditForm.action = 'https://www.wikitree.com/wiki/Special:MergeEdit';
    mergeEditForm.submit();
}

document.addEventListener("DOMContentLoaded", function () {

    const _individualsInputId = "individuals";
    const _individualsListId = "individualsList";

    document.getElementById("step1-detail").setAttribute('tv', 'on');
    document.getElementById("step2-detail").setAttribute('tv', 'off');
    document.getElementById("step3-detail").setAttribute('tv', 'off');

    // button and input listeners
    document.getElementById('individuals').addEventListener('input', function () { _getIndividualDetails(_individualsListId, _individualsInputId) });
    document.getElementById('individualsNext').addEventListener('click', function () { _nextIndividual(_individualsListId, _individualsInputId, 1) });
    document.getElementById('individualsPrev').addEventListener('click', function () { _nextIndividual(_individualsListId, _individualsInputId, -1) });
    document.getElementById('individualsSearch').addEventListener('click', function () { _getIndividualDetails(_individualsListId, _individualsInputId) });
    document.getElementById('mergeEditForm').addEventListener('submit', function (e) {_reqMergeEditForm(e) });
    //document.getElementById('mergeEditForm').addEventListener('keypress', function (e) { _enterListener(_reqMergeEditForm(e))});
    document.getElementById('bioCopyBtn').addEventListener('click', function () { _copyToClipboard('biography')} );

    // perpare for Step 1 by populating the individuals list
    _getIndividualsList(_individualsListId);
})