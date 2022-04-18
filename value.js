/** @module values support functions for GEDCOM app */
/** @author Coert Vonk <MY.NAME@gmail.com> */

class Birthday {
    constructor() {
        this._date = [];
    }
    set date(dateStr) {
        this._date[0] = module.exports.fullDateFromString(dateStr);            
    }
    get date() {
        const mostRecentIdx = this._date.length - 1;
        return this._date[mostRecentIdx];
/*        
        let fd = this._date[mostRecentIdx];
        if (!fd.qualifier) {  // only handle the simple date case, 2BD: expand to ABT, Between ..
            let fd0 = fd[0];
            if (fd0.year && fd0.month && fd0.day) {
                return new Date(fd0.year, fd0.month, fd0.day);
            }
        }
*/
    }
    push(dateStr) {
        this._date.push(module.exports.fullDateFromString(dateStr));            
    }
    pop(date) {
        return this._date.pop();
    }
}

const _monthAbrevs = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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

function _getXdigitNr(number, length) {
    return ("000" + number).slice(-length);
}

function _qDate2string(date, format) {
    let ret = '';
    const dayStr = date.day ? _getXdigitNr(date.day, 2) : '';    
    const yearStr = date.year ? _getXdigitNr(date.year, 4) : '';
    const monthStr = date.month ? _getXdigitNr(date.month, 2) : '';
    switch(format) {
        case 'iso': {
            if (date.year)  ret += yearStr;
            if (date.month) ret += '-' + monthStr;
            if (date.day)   ret += '-' + dayStr;
            break;
        }
        case 'world': {
            if (date.day)   ret += dayStr + '-';
            if (date.month) ret += monthStr + '-';
            if (date.year)  ret += yearStr;
            break;
        }
        case 'us':
        default: {
            if (date.day)   ret += dayStr + ' ';
            if (date.month) ret += _monthAbrevs[date.month - 1] + ' ';
            if (date.year)  ret += yearStr;
        }
    }
    return ret;
}

module.exports = {

    birthday: new Birthday(),

    /**
     * Convert a GEDCOM date to Date(s)
     * 
     * @param {string}  gedcomDate String as used by GEDCOM (e.g 'ABT 05 DEC 2012' or 'BET 2013 AND 2014')
     */
    fullDateFromString: function (gedcomDate) {
        if (gedcomDate) {
            let ret = [];
            let strings = gedcomDate.split(/\s+(?:AND)\s+/);  // for 'BET date1 AND date2'
            for (string of strings) {
                ret.push(this.string2qDate(string));
            }
            return ret;
        }
    },

/*
    OBSOLETEdateFromString: function (gedcomDate) {
        let qualDate = module.exports.qualDateFromString(gedcomDate);
        return qualDate.qualifier + _qDate2string(qualDate);
    },
*/

    // 2BD gedcomx dates, 
    //   /+1887-03           before Mar 1887 
    //   +1976-07-11/        after Jun 11, 1976
    //   +1940/+1945         between 1940 and 1945
    date: function (obj, format) {
        let ret = '';
        if (obj && obj[0]) {
            const fd = module.exports.fullDateFromString(obj[0].value);
            if (!fd[0].year) {
                return fd[0].qualifier;  // e.g. stillborn
            }
            for (let idx in fd) {
                const qdate = fd[idx];
                switch (format) {
                    case 'year': {
                        ret += qdate.qualifier + qdate.year;
                        break;
                    }
                    case 'age': {
                        let birth = this.birthday.qdate
                        if (birth) {
                            const days = (qdate.days - birth.days) + (qdate.month - birth.months)*12 +(qdate.years - birth.years)*365.25; // close enough for now
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
                        switch (qdate.qualifier) {
                            // WikiTree doesn't seem to understand the https://github.com/FamilySearch/gedcomx/blob/master/specifications/date-format-specification.md#3-4-approximate-date
                            /*
                            case '~': ret += 'A+' + _qDate2string(qdate, 'iso'); break;
                            case '<': ret += '/+' + _qDate2string(qdate, 'iso'); break;
                            case '>': ret += '+' + _qDate2string(qdate, 'iso') + '/'; break;
                            */
                           case '~':
                           case '<':
                           case '>': ret += '+' + _qDate2string(qdate, 'iso'); break;
                           case '-': ret += '+' + _qDate2string(qdate, 'iso') + '/'; break;
                            default:
                                ret += qdate.qualifier + '+' + _qDate2string(qdate, 'iso');
                        }
                        break;
                    }
                    case 'us': {
                        ret += qdate.qualifier + _qDate2string(qdate, 'us');
                        break;
                    }
                    default: {
                        let d = qdate.qualifier == '-' ? '' : qdate.qualifier;
                        ret += d + _qDate2string(qdate, 'world');
                    }
                break;
                }
                case 'original':
                    return obj[0].value;
                case 'gedcomx':
                case 'wtgedcomx':
                case 'us':
                default:
                    return module.exports.localizeDateStr(i18n, fqdate.string(format));
            }
        }
        return '';
    },

    // e.g. 'Apr 2019' will return [year: 2019, month:4]
    // e.g. 'ABT 12 Nov 2010' will return [qualifier: '~', year: 2010, month: 11, day: 12];
    string2qDate: function(gedcomDate) {
        if (gedcomDate == 'STILLBORN') { 
            return {qualifier: i18n.__('stillborn')}
        }
        let ret = {qualifier: ''};
        switch (gedcomDate.substr(0, 3)) {
            case 'ABT': ret.qualifier = '~'; break;
            case 'BEF': ret.qualifier = '<'; break;
            case 'AFT': ret.qualifier = '>'; break;
            case 'BET': ret.qualifier = '-'; break;
        }
        if (ret.qualifier.length) { 
            gedcomDate = gedcomDate.slice(4);
        }
        let parts = gedcomDate.split(' ');
        if (parts.length == 1) {  // try '-'
            parts = gedcomDate.split('-');
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
            case 3: ret['day']   = parts[parts.length - 3]; // fall through
            case 2: ret['month'] = parts[parts.length - 2]; // fall through
            case 1: ret['year']  = parts[parts.length - 1];
        }
        return ret;
    },

    currentDate: function() {
        var today = new Date();
        return _qDate2string(today);
    },

    place: function (obj, format) {
        if (obj && obj[0]) {
            let place = obj[0].value;
            place = place.replace(" Op ", " op "); // FTM Place Authority incorrectly changes 'Bergen op Zoom' to 'Bergen Op Zoom', undo that here
            place = place.replace(/^S-/g, "'s-"); // FTM Place Authority incorrectly changes 's Hertogenbosch to S-Hertogenbosch, undo that here
            switch (format) {
                case "full": return place;
                default: {
                    place = place.replace('Multnomah, Oregon', 'Oregon');
                    place = place.replace('Fairfield, Connecticut', 'Connecticut');
                    place = place.replace(', Bergen op Zoom', '');
                    place = place.replace(', Tholen', '');
                    for (let ending in placeAbbrevs) {
                        if (place.endsWith(ending)) {
                            return place.replace(ending, placeAbbrevs[ending]);
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
                ['hijzij', 'her', 'she', 'he/she'],
                ['hijzijzelf', 'himself', 'herself', 'self'],
                ['HijZij', 'He', 'She', 'He/She'],
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
                case "givenaka": return given + akaLong;
                case "middle": return middle;
                case "last": return last;
                case "full": return given + akaLong + ' ' + last;
                case "givenlast": return given + ' ' + last;
                case "last,given": return last + ', ' + given;
                case "aka": return aka;
                case "first": return first;
                default: return given + ' ' + last;
            }
        }
    },

    localizeDateStr: function(i18n, str) {
        function _hasLetters(str) {
            return str.toUpperCase() != str.toLowerCase();
        }

        if (str) {
            //console.log('|' + str + '|');
            let parts = str.split(/( ?[^a-zA-Z ]+ ?)/);
            for (let ii in parts) {
                const part = parts[ii];
                if (_hasLetters(part)) {  // translate the phrases that contain letters
                    //console.log('>' + part + '<');
                    parts[ii] = i18n.__(part);
                }
            }
            return parts.join('');
        }
        return '';
    }    
}