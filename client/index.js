/**
 * @abstract Client page part of a project that imports GEDCOM, generates biography that can be pasted in corresponding WikiTree profile
 * @license GPL
 * @author Coert Vonk <my.name@gmail.com>
 * @url https://github.com/cvonk/nodejs-wikitree_biography
 */

/**
 * various support functions
 */

 function _pushGedcomToWtUsername(gedcomId, wtUsername) {
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("POST", '/gedcomId-wtUsername', true);
    xmlhttp.onreadystatechange = function () {
        if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
            //console.log('gedcomId =', gedcomId, 'wtUsername =', wtUsername);
        }
    }
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
}

function _selectNextInDataList(listId, inputId, step) {
    const input = document.getElementById(inputId);
    const list = document.getElementById(listId);
    const childNodes = list.childNodes;
    for (let idx in childNodes) {
        let individual = childNodes[idx];
        if (individual.innerText === input.value) {
            input.value = childNodes[(Number(idx)+step) % childNodes.length].value;
            return;
        }
    }
}

function _nextIndividual(listId, inputId, step) {
    _selectNextInDataList(listId, inputId, step);
    _pullIndividualDetails(listId, inputId);
}

function _copyToClipboard(srcId) {
    let textarea = document.getElementById(srcId);
    textarea.select();
    document.execCommand("copy");
}

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

/**
 * Prepare for Step 1: the page was loaded, now pull a list of individuals from the NodeJS server
 */
function _pullIndividualsList(listId) {
    var xmlhttp = new XMLHttpRequest();
    const list = document.getElementById(listId);
    list.innerHTML = "<p>Loading ...</p>";
    xmlhttp.open("GET", "individuals", true);
    xmlhttp.onreadystatechange = function () {
        if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {

            /**
             * The NodeJS server supplied the list, now use it to populate the data list.
             * Once the user selects a name, continue at _pullIndividualDetails()
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
function _pullIndividualDetails(listId, inputId) {

    let gedcomId = _getcomIdFromDataList(listId, inputId);
    if (!gedcomId) {
        return;
    }
    const xmlhttp = new XMLHttpRequest();
    xmlhttp.open("POST", "individual", true);
    xmlhttp.onreadystatechange = function () {
        if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {

            /**
             * The NodeJS server supplied the details, now use these to populate the (hidden) 
             * search form.
             */
            const resp = JSON.parse(xmlhttp.responseText);
            if (resp.status == 'success') {
                document.getElementById("step2").setAttribute('tv', 'on');
                document.getElementById("step3").setAttribute('tv', 'off');
                const person = resp.person;
                const ids = {  // the WikiTree search form doesn't support all the fields at once
                    wpFirst: person.name && person.name.given,
                    wpLast: person.name && person.name.last,
                    wpBirthDate: person.birth && person.birth.date,
                    //birth_location, person.birth && person.birth.place,
                    wpDeathDate: person.death && person.death.date,
                    //death_location, person.death && person.death.place,
                    //father_first_name: person.father && person.father.name && person.father.name.given,
                    //father_last_name: person.father && person.father.name && person.father.name.last,
                    //mother_first_name: person.mother && person.mother.name && person.mother.name.given,
                    //mother_last_name: person.mother && person.mother.name && person.mother.name.last
                }
                const searchForm = document.getElementById('searchForm');
                searchForm.reset();    
                for (let id in ids) {
                    document.getElementById(id).value = ids[id] ? ids[id] : '';
                }
                if (person.gender) {
                    let gender = person.gender;
                    if (gender == 'M' || gender == 'F') document.getElementById('gender_' + gender).checked = true;
                }
                // store some details in the 'mergeForm' used in Step 3  
                document.getElementById('gedcomId').value = resp.gedcomId;
                document.getElementById('wtUsername').value = resp.wtUsername ? resp.wtUsername : '';
                document.getElementById('biography').value = resp.biography;
                document.getElementById('postData').value = JSON.stringify(resp.gedcomx);  // details as GEDCOMX data              
                searchForm.submit();

                /**
                 * The user finds the matching WikiTree Username, and enters it on the on the 'mergeForm'.
                 * When that mergeForm is completed, processing continues at _reqWtMergeForm()
                 */
            }
        }

    }
    xmlhttp.setRequestHeader("Content-Type", "application/x-www-form-urlencoded;charset=UTF-8");
    xmlhttp.send("gedcomId=" + gedcomId);
}

/**
 * Prepare for Step 3: A WikiTree Username was entered, now use that along with the details we stored as
 * GEDCOMX data we stored in _pullIndividualDetails() populate a merge form on WikiTree.  The user then
 * verifies the fields and copies over, enriches the bio, previews it, and commits the changes.
 */
function _reqWtMergeForm(evt) {  // called when mergeForm is completed

    const mergeForm = document.getElementById('mergeForm');  // or use evt
    const wtUsername = mergeForm.wtUsername.value;
    if (!wtUsername.length) {
        evt.preventDefault();  // prevent submit
        alert("WikiTree Profile Name missing");
        return;
    }
    document.getElementById("step3").setAttribute('tv', 'on');
    const gedcomId = document.getElementById('gedcomId').value;
    _pushGedcomToWtUsername(gedcomId, wtUsername);
    
    mergeForm.action = 'https://www.wikitree.com/wiki/Special:MergeEdit';
    mergeForm.submit();
}

$(document).ready(function () {

    const _individualsInputId = "individuals";
    const _individualsListId = "individualsList";

    document.getElementById("step1").setAttribute('tv', 'on');
    document.getElementById("step2").setAttribute('tv', 'off');
    document.getElementById("step3").setAttribute('tv', 'off');

    // button and input listeners
    document.getElementById('individuals').addEventListener('input', function (_e) { _pullIndividualDetails(_individualsListId, _individualsInputId) });
    document.getElementById('individualsNext').addEventListener('click', function (_e) { _nextIndividual(_individualsListId, _individualsInputId, 1) });
    document.getElementById('individualsPrev').addEventListener('click', function (_e) { _nextIndividual(_individualsListId, _individualsInputId, -1) });
    document.getElementById('individualsSearch').addEventListener('click', function (_e) { _pullIndividualDetails(_individualsListId, _individualsInputId) });
    document.getElementById('mergeForm').addEventListener('submit', function (e) {_reqWtMergeForm(e) });
    document.getElementById('mergeForm').addEventListener('keypress', function (e) { _enterListener(_reqWtMergeForm(e))});
    document.getElementById('copyBtn').addEventListener('click', function (_e) { _copyToClipboard('biography')} );

    // perpare for Step 1 by populating the individuals list
    _pullIndividualsList(_individualsListId);
})