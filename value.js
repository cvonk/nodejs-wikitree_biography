/** @module values support functions for GEDCOM app */
/** @author Coert Vonk <coert vonk at gmail> */

class Birthday {
    constructor() {
        this._date = [];
    }
    set date(dateStr) {
        if (dateStr) {
            let d = module.exports.datesFromString(dateStr);
            if (d.designation.length == 0) {  // only handles the exact case for now
                this._date[0] = d.dates[0];
            }
        }
    }
    get date() {
        const mostRecentIdx = this._date.length - 1;
        return this._date[mostRecentIdx];
    }
    push(dateStr) {
        let d = module.exports.datesFromString(dateStr);
        if (d && d.designation && d.designation.length == 0) {  // only handles the exact case for now
            this._date.push(d.dates[0]);
        } else {
            this._date.push(this._date[0]); // only to ensure number of push and pop matches
        }
    }
    pop(date) {
        return this._date.pop();
    }
}

const _monthAbrevs = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function _monthAbbrev2Idx(monthAbbrev) {
    return _monthAbrevs.findIndex(function (el) { 
        return el.toUpperCase() == monthAbbrev.toUpperCase(); 
    })
}

function _string2date(string) {
    let parts = string.split(' ');
    if (parts.length == 1) {  // try '-'
        parts = string.split('-');
    }
    for (idx in parts) {  // replace month names with numbers
        const part = parts[idx];
        if (!Number(part)) {
            const nr = _monthAbbrev2Idx(part);
            if (nr >= 0) parts[idx] = nr + 1;
        } else {
            parts[idx] = Number(part);
        }
    }
    switch (parts.length) {
        case 1: return new Date(parts[0], 0, 1); // assume 1st of Jan
        case 2: return new Date(parts[1], parts[0] - 1, 1);  // assume 1st of the month
        case 3: return new Date(parts[2], parts[1] - 1, parts[0]);
    }
}

function _get2DigitNr(number) {
    return ("0" + number).slice(-2);
}

function _date2string(date, format) {
    switch (format) {
        case 'iso': 
            return date.getFullYear() + '-' + _get2DigitNr(Number(date.getMonth()) + 1) + '-' + _get2DigitNr(date.getDate());
        case 'world': 
            return _get2DigitNr(date.getDate()) + '-' + _get2DigitNr(Number(date.getMonth()) + 1) + '-' + date.getFullYear();
        case 'us':
        default: 
            return date.getDate() + ' ' + _monthAbrevs[date.getMonth()] + ' ' + date.getFullYear();
    }
}

module.exports = {

    birthday: new Birthday(),

    /**
     * Convert a GEDCOM date to Date(s)
     * 
     * @param {string}  gedcomDate String as used by GEDCOM (e.g 'ABT 05 DEC 2012' or 'BET 2013 AND 2014')
     * @returns {{string, []}}
     */
    datesFromString: function (gedcomDate) {
        if (gedcomDate) {
            let ret = {designation: '', dates: []};
            switch (gedcomDate.substr(0, 3)) {
                case 'ABT': ret.designation = '~'; break;
                case 'BEF': ret.designation = '<'; break;
                case 'AFT': ret.designation = '>'; break;
                case 'BET': ret.designation = '-'; break;
                default: if (ret.gedcomDate == 'STILLBORN') { ret.designation = i18n.__('stillborn'); return ret; }
            }
            if (ret.designation.length) { 
                gedcomDate = gedcomDate.slice(4);
            }
            let orgs = gedcomDate.split(/\s+(?:AND)\s+/);  // for 'BET date1 AND date2'
            for (org of orgs) {
                ret.dates.push(_string2date(org));
            }
            return ret;
        }
    },

    // 2BD gedcomx dates, 
    //   /+1887-03           before Mar 1887 
    //   +1976-07-11/        after Jun 11, 1976
    //   +1940/+1945         between 1940 and 1945
    date: function (obj, format) {
        let ret = '';
        if (obj && obj[0]) {
            const parsed = this.datesFromString(obj[0].value);
            if (parsed.dates.length == 0) {
                return parsed.designation; // e.g. stillborn
            }
            for (let idx in parsed.dates) {
                let date = parsed.dates[idx];
                if (date) {
                    if (Number(idx)) {
                        ret += '/';  // between two dates
                    }
                    switch (format) {
                        case 'year': {
                            ret += parsed.designation + date.getFullYear();
                            break;
                        }
                        case 'age': {
                            if (this.birthday.date) {
                                ret += parsed.designation;
                                const days = Math.floor((date - this.birthday.date) / (1000 * 60 * 60 * 24));
                                const months = Math.floor(days * 12 / 365.25);
                                const years = Math.floor(months / 12);
                                if (Math.abs(days) < 60) {
                                    ret += Math.floor(days) + i18n.__(' days');
                                } else if (Math.abs(months) < 24) {
                                    ret += Math.floor(months) + i18n.__(' months');
                                } else {
                                    ret += years + i18n.__(' years');
                                }
                            }
                            break;
                        }
                        case 'gedcomx': {
                            switch (ret.designation) {
                                case '~':
                                    ret += '+' + _date2string(date, 'iso');
                                    break;
                                case '<':
                                    ret += '/+' + _date2string(date, 'iso');
                                    break;
                                case '>':
                                    ret += '+' + _date2string(date, 'iso') + '/';
                                    break;
                                case '-':
                                    ret += '+' + _date2string(date, 'iso');
                                    ret.designation = '>'; // to get the closing /+date
                                    break;
                                default:
                                    ret += parsed.designation + _date2string(date, 'iso');
                            }
                            break;
                        }
                        case 'us': {
                            ret += parsed.designation + _date2string(date, 'us');
                            break;
                        }
                        default: {
                            let d = parsed.designation == '-' ? '' : parsed.designation;
                            ret += d + _date2string(date, 'world');
                        }
                    }
                }
            }
        }
        return ret;
    },

    currentDate: function() {
        var today = new Date();
        return _date2string(today);
    },

    place: function (obj, format) {
        if (obj && obj[0]) {
            let place = obj[0].value;
            place = place.replace(" Op ", " op "); // FTM Place Authority incorrectly changes 'Bergen op Zoom' to 'Bergen Op Zoom', undo that here
            switch (format) {
                case "full": return place;
                default:
                    place = place.replace('Multnomah, Oregon', 'Oregon');
                    place = place.replace('Fairfield, Connecticut', 'Connecticut');
                    place = place.replace(', Bergen op Zoom', '');
                    place = place.replace(', Tholen', '');
                    let endings = ['Noord-Brabant, Netherlands', 'Zeeland, Netherlands', 'USA', 'Netherlands'];
                    for (ending of endings) {
                        if (place.endsWith(', ' + ending)) {
                            return place.substring(0, place.length - ending.length - 2);
                        }
                    }
                    return place;
            }
        }
    },

    sex: function (obj, format) {
        if (obj && obj[0]) {
            const sex = obj[0].value;
            const formats = [
                ['m/v', 'male', 'female', 'unknown'],
                ['zoondochter', 'son', 'daughter', 'child'],
                ['broerzus', 'brother', 'sister', 'sibling'],
                ['hijzij', 'He', 'She', 'He/She'],
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
            switch (format) {
                case "given": return given;
                case "last": return last;
                case "full": return given + akaLong + ' ' + last;
                case "aka": return aka;
                case "first": return first;
                default: return given + ' ' + last;
            }
        }
    },
}