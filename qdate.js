/** @module qdate qualified date class */
/** @author Coert Vonk <MY.NAME@gmail.com> */
/**
 * Interprets single GEDCOM dates such as 'Apr 2019', or 'ABT 12 Nov 2010'
 * Does not handle 'BET 2010 2011`, use fqdate.js for that.
 * */
const _monthAbrevs = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
function _monthAbbrev2Idx(monthAbbrev) {
    const monthABBREV = monthAbbrev.toUpperCase();
    return _monthAbrevs.findIndex(function (el) { 
        return el.toUpperCase() == monthABBREV; 
    });
}

function _getXdigitNr(number, length) {
    return ("0".repeat(length) + number).slice(-length);
}

class QDate {

    // e.g. 'Apr 2019' will return [year: 2019, month:4]
    // e.g. 'ABT 12 Nov 2010' will return [qualifier: '~', year: 2010, month: 11, day: 12];
    constructor(gedcomSingleDate) {

        if (!gedcomSingleDate) {
            return;
        }
        this.isValid = true;
        if (!(this instanceof QDate)) {  // protect against forgetting the new keyword when calling the constructor
            return new QDate(gedcomSingleDate);
        }
        switch (gedcomSingleDate.substr(0, 3)) {
            case 'ABT': this.qualifier = 'about'; break;
            case 'BEF': this.qualifier = 'before'; break;
            case 'AFT': this.qualifier = 'after'; break;
        }
        if (this.qualifier) { 
            gedcomSingleDate = gedcomSingleDate.slice(4);
        }
        let parts = gedcomSingleDate.split(' ');
        if (parts.length == 1) {  // try '-'
            parts = gedcomSingleDate.split('-');
        }
        for (let idx in parts) {  // replace month names with numbers
            const part = parts[idx];
            if (!Number(part)) {
                const nr = _monthAbbrev2Idx(part);
                if (nr >= 0) {
                    parts[idx] = nr + 1;
                }
            } else {
                parts[idx] = Number(part);
            }
        }
        switch (parts.length) {                                           
            case 3: this.day   = parts[parts.length - 3]; // fall through
            case 2: this.month = parts[parts.length - 2]; // fall through
            case 1: this.year  = parts[parts.length - 1];
        }
    }

    get dayHi() { if (!this.qualifier || this.qualifier != 'after') return this.day; return undefined; }
    get yearHi() { if (!this.qualifier || this.qualifier != 'after') return this.year; return undefined; }
    get monthHi() { if (!this.qualifier || this.qualifier != 'after') return this.month; return undefined; }
    get dayLo() { if (!this.qualifier || this.qualifier != 'before') return this.day; return undefined; }
    get yearLo() { if (!this.qualifier || this.qualifier != 'before') return this.year; return undefined; }
    get monthLo() { if (!this.qualifier || this.qualifier != 'before') return this.month; return undefined; }

    get dayString() { return this.day ? _getXdigitNr(this.day, 2) : ''; }
    get monthString() { return this.month ? _getXdigitNr(this.month, 2) : ''; }
    get yearString() { return this.year ? _getXdigitNr(this.year, 4) : ''; }
    qualifierString(i18n) { return this.qualifier ? i18n.__(this.qualifier) : '';}

    string(i18n, format) {
        let ret = '';
        switch(format) {
            case 'wtgedcomx': { // doesn't appear to understand qualifiers
                ret += '+';
                if (this.year)  ret += this.yearString;
                if (this.month) ret += '-' + this.monthString;
                if (this.day)   ret += '-' + this.dayString;
                break;
            }
            case 'gedcomx':
            case 'iso': {
                let post = '';
                switch(this.qualifier) {
                    case 'about': ret +='A'; break;
                    case 'before': ret += '/'; break;
                    case 'after': post = '/'; break;
                    default:;
                }
                ret += '+';
                if (this.year)  ret += this.yearString;
                if (this.month) ret += '-' + this.monthString;
                if (this.day)   ret += '-' + this.dayString;
                ret += post;
                break;
            }
            case 'world': {
                if (this.qualifier) ret += i18n.__(this.qualifier) + ' ';
                if (this.day)   ret += this.dayString + '-';
                if (this.month) ret += this.monthString + '-';
                if (this.year)  ret += this.yearString;
                break;
            }
            case 'us':
            default: {
                if (this.qualifier) ret += i18n.__(this.qualifier) + ' ';
                if (this.day)   ret += this.dayString + ' ';
                if (this.month) ret += _monthAbrevs[this.month - 1] + ' ';
                if (this.year)  ret += this.yearString;
            }
        }
        return ret;
    }

}

module.exports = QDate;