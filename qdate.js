/** @module qdate qualified date class */
/** @author Coert Vonk <MY.NAME@gmail.com> */
/**
 * Interprets single GEDCOM dates such as 'Apr 2019', or 'ABT 12 Nov 2010'
 * Does not handle 'BET 2010 2011`, use fqdate.js for that.
 * */
const _monthAbrevs = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
function _monthName2Nr(name) {
    const upper = name.toUpperCase();
    return _monthAbrevs.findIndex(function (el) { 
        return el.toUpperCase() == upper; 
    }) + 1;
}

function _xDigits(number, length) {
    if (number.length >= length) return number;
    return ("0".repeat(length-1) + number).slice(-length);
}

module.exports = class QDate {

    // e.g. 'Apr 2019' will return [year: 2019, month:4]
    // e.g. 'ABT 12 Nov 2010' will return [qualifier: '~', year: 2010, month: 11, day: 12];
    constructor(gedcomSglDate) {
        if (gedcomSglDate) {
            this.isValid = true;
            if (!(this instanceof QDate)) {  // protect against forgetting the 'new' keyword
                return new QDate(gedcomSglDate);
            }
            switch (gedcomSglDate.substr(0, 3)) {
                case 'ABT': this.qualifier = 'about'; break;
                case 'BEF': this.qualifier = 'before'; break;
                case 'AFT': this.qualifier = 'after'; break;
            }
            if (this.qualifier) { 
                gedcomSglDate = gedcomSglDate.slice(4);
            }
            let parts = gedcomSglDate.split(' ');  // try ' ' first
            if (parts.length == 1) {  // if that dindn't work, try '-'
                parts = gedcomSglDate.split('-');
            }
            for (let idx in parts) {  // replace month names with numbers
                const part = parts[idx];
                if (!Number(part)) {
                    const nr = _monthName2Nr(part);
                    if (nr > 0) {
                        parts[idx] = nr;
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
    }

    get dayHi()   { if (!this.qualifier || this.qualifier != 'after')  return this.day;   return undefined; }
    get yearHi()  { if (!this.qualifier || this.qualifier != 'after')  return this.year;  return undefined; }
    get monthHi() { if (!this.qualifier || this.qualifier != 'after')  return this.month; return undefined; }
    get dayLo()   { if (!this.qualifier || this.qualifier != 'before') return this.day;   return undefined; }
    get yearLo()  { if (!this.qualifier || this.qualifier != 'before') return this.year;  return undefined; }
    get monthLo() { if (!this.qualifier || this.qualifier != 'before') return this.month; return undefined; }

    get dayString()   { return this.day   ? _xDigits(this.day, 2)   : ''; }
    get yearString()  { return this.year  ? _xDigits(this.year, 4)  : ''; }
    get monthString() { return this.month ? _xDigits(this.month, 2) : ''; }
    get qualifierString() { return this.qualifier ? this.qualifier : '';}

    string(format) {
        let ret = '';
        switch(format) {
            case 'wtgedcomx': {  // doesn't appear to understand qualifiers
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
                    case 'about':  ret +='A'; break;
                    case 'before': ret += '/'; break;
                    case 'after':  post = '/'; break;
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
                if (this.qualifier) ret += this.qualifier + ' ';
                if (this.day)   ret += this.dayString + '-';
                if (this.month) ret += this.monthString + '-';
                if (this.year)  ret += this.yearString;
                break;
            }
            case 'us':
            default: {
                if (this.qualifier) ret += this.qualifier + ' ';
                if (this.day)   ret += this.dayString + ' ';
                if (this.month) ret += _monthAbrevs[this.month - 1] + ' ';
                if (this.year)  ret += this.yearString;
            }
        }
        return ret;
    }
}