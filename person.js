/* eslint-disable no-console */
/** @module person write/read key facts about gedcom individuals */
/** @author Coert Vonk <coert vonk at gmail> */

var get = require('./get.js'),
    value = require('./value.js'),
    fs = require("fs");

function _writePerson(gedcom, indi, recursions) {

    const name = indi.NAME instanceof Array ? indi.NAME : [indi.NAME];
    let person = {
        gedcomId: indi.id,
        name: {
            given: name ? value.name(name, 'given') : 'unknown',
            last: name ? value.name(name, 'last') : 'unknown'
        },
        gender: indi.SEX ? indi.SEX : 'Unknown'
    };

    let events = { birth: 'BIRT', death: 'DEAT'};
    for (let eventKey in events) {
        const eventVal = events[eventKey];
        const event = indi[eventVal] instanceof Array ? indi[eventVal][0] : indi[eventVal];
        if (event) {
            const facts = { date: 'DATE', place: 'PLAC'};
            for (let factKey in facts) {
                const factVal = facts[factKey];
                if (event[factVal]) {
                    const fact = event[factVal] instanceof Array ? event[factVal] : [event[factVal]];
                    const v = fact[0].value;
                    if (v) {
                        if (!person[eventKey]) person[eventKey] = {};
                        person[eventKey][factKey] = v;
                    }
                }
            }
        }
    }
    if (recursions) {
        const famc = get.byName(gedcom, indi, 'FAMC')[0];
        if (famc) {
            const tags = { father: 'HUSB', mother: 'WIFE'};
            for (let tag in tags) {
                let parent = get.byName(gedcom, famc, tags[tag])[0];
                if (parent) {
                    person[tag] = _writePerson(gedcom, parent, recursions-1);
                }
            }
            const siblings = get.byName(gedcom, famc, 'CHIL');
            if (siblings) {
                for (let sibling of siblings) {
                    if (indi.id != sibling.id) {
                        if (!person['siblings']) person['siblings'] = [];
                        person['siblings'].push(_writePerson(gedcom, sibling, recursions-1));    
                    }
                }
            }
        }
    }
    return person;
}

/*
function _compare(person1, person2) {
    let matches = 0;
    for (let fact in person1) {
        if (person2[fact]) {
            let dbg = typeof person1[fact];
            if (typeof person1[fact] == 'string') {
                matches += person1[fact].toUpperCase() == person2[fact].toUpperCase();
            } else {
                matches += _compare(person1[fact], person2[fact]);
            }
        }
    }
    return matches;
}
*/

module.exports = {

/*
    match: function (personToFind) {
        let matches = 0;
        for (let person of personsIn) {
            let matches = _compare(personToFind, person);
            console.log(person.gedcomId, matches);
        }
    },
*/

    get: function (gedcom, indi) {
        let persons = [];
        let indis = indi ? [indi] : get.byName(gedcom, gedcom, 'INDI');
        for (let indi of indis) {
            persons.push(_writePerson(gedcom, indi, 1));
        }
        return persons;
    },

    write: function(persons, fname) {  // next run, this read back using 'require' at top of app.js
        fs.writeFile(fname, 'module.exports = ' + JSON.stringify(persons, null, 2), (err) => {
            if (err) {
                throw err;
            }
        });
    },

    setWtUsername: function (persons, gedcomId, wtUsername) {

        for (let person of persons) {
            if (person.gedcomId == gedcomId) {
                if (wtUsername) {
                    person.wtUsername = wtUsername;
                } else {
                    delete person.wtUsername;
                }
                return;
            }
        }
        console.log("failed to set wtUsername(" + wtUsername + ') for gedcomId(' + gedcomId + ')');
    },

    getWtUsername: function(persons, gedcomId) {
        for (let person of persons) {
            if (person.gedcomId == gedcomId) {
                return person.wtUsername;
            }
        }
    },
}
