/** @module values support functions for GEDCOM app */
/** @author Coert Vonk <MY.NAME@gmail.com> */

var FQDate = require('./fqdate.js');

function _age(i18n, aYear, aMonth, aDay, bYear, bMonth, bDay) {
    if (!aYear || !bYear) return '';  // need at least two years
    const end = new Date(aYear ? aYear : 0, aMonth ? aMonth - 1 : 0, aDay ? aDay : 1);
    const start = new Date(bYear ? bYear : 0, bMonth ? bMonth - 1 : 0, bDay ? bDay : 1);
    const days = Math.floor((end - start) / (1000 * 3600 * 24));
    const months = Math.floor(days * 12 / 365.25);
    const years = Math.floor(months / 12);
    if (Math.abs(days) < 60)  return Math.floor(days) + ' ' + i18n.__('days');
    if (Math.abs(months) < 24) return Math.floor(months) + ' ' + i18n.__('months');
    return years + ' ' + i18n.__('year');
}

let _birthday;

module.exports = {

    birthday: _birthday,

    date: function (i18n, obj, format) {
        if (obj && obj[0]) {
            const fqdate = new FQDate(obj[0].value);
            if (fqdate instanceof String) {
                return fqdate;
            }
            switch (format) {
                case 'year': {
                    if (fqdate.isValid) {
                        const year = fqdate.year(i18n);
                        if (year instanceof String) return i18n.__(fqdate.qualifier);  // e.g. 'stillborn', 'about 2012' or '1910-1912'
                        return year;  // an exact year is a Number
                    }
                    return 0;
                }
                case 'age': {
                    let birth = module.exports.birthday;
                    if (birth && birth.isValid && fqdate.isValid) {
                        if (fqdate.qualifier) return fqdate.qualifier;
                        if (birth.qualifier) return "Birth event shouldn't have qualifier (" + birth.qualifier + ").  Consider moving it to the death fact.";
                        let ageLo = _age(i18n, fqdate.yearLo, fqdate.monthLo, fqdate.dayLo, birth.yearHi, birth.monthHi, birth.dayHi);
                        let ageHi = _age(i18n, fqdate.yearHi, fqdate.monthHi, fqdate.dayHi, birth.yearLo, birth.monthLo, birth.dayLo);
                        if (ageLo == ageHi) {
                            return ageLo;
                        } else if (!ageHi.length) { 
                            return i18n.__('at least') + ' ' + ageLo;
                        } else if (!ageLo.length) {
                            return i18n.__('at most') + ' ' + ageHi;
                        } else {
                            return i18n.__('between') + ' ' + ageLo + ' ' + i18n.__('and') + ' ' + ageHi;
                        }
                    }
                break;
                }
                case 'original':
                    return obj[0].value;
                case 'gedcomx':
                case 'wtgedcomx':
                case 'us':
                default:
                    return fqdate.string(i18n, format);
            }
        }
        return '';
    },

    currentDate: function() {
        var today = new Date();
        return today.getDate + '-' + today.getMonth + '-' + today.getFullYear();
    },

    place: function (obj, format) {
        if (obj && obj[0]) {
            let place = obj[0].value;
            place = place.replace(" Op ", " op "); // FTM Place Authority incorrectly changes 'Bergen op Zoom' to 'Bergen Op Zoom', undo that here
            place = place.replace(/S-/g, "'s-"); // FTM Place Authority incorrectly changes 's Hertogenbosch to S-Hertogenbosch, undo that here
            switch (format) {
                case "full": return place;
                default: {
                    place = place.replace('Multnomah, Oregon', 'Oregon');
                    place = place.replace('Fairfield, Connecticut', 'Connecticut');
                    place = place.replace(', Bergen op Zoom', '');
                    place = place.replace(', Tholen', '');
                    let endings = ['Noord-Brabant, Netherlands', 'Zeeland, Netherlands', 'USA', 'Netherlands'];
                    for (let ending of endings) {
                        if (place.endsWith(', ' + ending)) {
                            return place.substring(0, place.length - ending.length - 2);
                        }
                    }
                    return place;
                }
            }
        }
    },

    sex: function (i18n, obj, format) {
        if (obj && obj[0]) {
            const sex = obj[0].value;
            const formats = [
                ['m/v', 'male', 'female', 'unknown'],
                ['zoondochter', 'son', 'daughter', 'child'],
                ['broerzus', 'brother', 'sister', 'sibling'],
                ['hijzij', 'he', 'she', 'he/she'],
                ['hemhaar', 'him', 'her', 'him/her'],
                ['gedcomx', 'Male', 'Female', 'Unknown' ]
            ];
            let idx;
            let found = false;
            for (idx in formats) {
                if (formats[idx][0] == format) {
                    found = true;
                    break;
                }
            }
            //idx %= formats.length;
            if (found) {
                switch (sex) {
                    case 'M': return i18n.__(formats[idx][1]);
                    case 'F': return i18n.__(formats[idx][2]);
                    default: return i18n.__(formats[idx][3]);
                }
            }
            return sex;
     }
    },

    name: function (obj, format) {
        if (obj) {
            let given, last, first, aka = "", akaLong = "";
            if (obj.length > 1) {
                [given, last] = obj[0].value.split('/');
                aka = obj[1].value;
                akaLong = ' "' + aka + '"';
                first = obj[1].value;
            } else {
                [given, last] = obj[0].value.split('/');
                first = given.split(' ')[0].trim();
            }
            given = given.trim();
            let givenParts = given.split(' ');
            let given1st = givenParts.shift();
            let middle = givenParts.join(' ');
            switch (format) {
                case "given": return given;
                case "given1st": return given1st;
                case "middle": return middle;
                case "last": return last;
                case "full": return given + akaLong + ' ' + last;
                case "aka": return aka;
                case "first": return first;
                default: return given + ' ' + last;
            }
        }
    },
}