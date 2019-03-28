/* eslint-disable no-console */
/** @module person write/read key facts about gedcom individuals */
/** @author Coert Vonk <coert vonk at gmail> */

var get = require('./get.js'),
    //value = require('./value.js'),
    fs = require("fs");

function _writePerson(gedcom, indi, recursions) {

    let person = {
        gedcomId: indi.id,
        name: {
            given: get.byTemplate(gedcom, indi, undefined, '[NAME:given]'),
            last: get.byTemplate(gedcom, indi, undefined, '[NAME:last]')
        },
        gender: get.byTemplate(gedcom, indi, undefined, '[SEX]')
    };

    let tags = { birth: 'BIRT', death: 'DEAT'};
    for (let tag in tags) {
        const tags2 = { date: 'DATE:us', place: 'PLAC:full'};
        for (let tag2 in tags2) {
            let v = get.byTemplate(gedcom, indi, undefined, '[' + tags[tag] + '.' + tags2[tag2] + ']');
            if (v) {
                if (!person[tag]) person[tag] = {};
                person[tag][tag2] = v;
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
                person.wtUsername = wtUsername;
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
