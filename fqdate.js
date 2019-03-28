/** @module fqdate fully qualified date class */
/** @author Coert Vonk <my name at gmail> */
/**
 * Interprets single and double GEDCOM dates such as 'Apr 2019', 'ABT 12 Nov 2010' and 'BET 2010 2011`
 * */

var QDate = require('./qdate.js');

class FQDate {

    constructor(gedcomDate) {    

        if (gedcomDate == 'STILLBORN') { 
            this.qualifier = 'stillborn';
            return;
        }
        this.qdates = [];
        if (gedcomDate) {
            let singleDates = [gedcomDate];
            if (gedcomDate.substr(0, 3) == 'BET') {
                let valid = true;
                singleDates = gedcomDate.slice(4).split(/\s+(?:AND)\s+/);  // for 'BET date1 AND date2'
                for (let singleDate of singleDates) {
                    const qdate = new QDate(singleDate);
                    valid = valid && qdate.isValid;
                    this.qdates.push(qdate);
                }
                this.isValid = valid;
                if (valid) this.isValid = true;
            } else {
                let qdate = new QDate(gedcomDate);
                this.isValid = qdate.isValid;
                this.qdates.push(qdate);
            }
        }
    }

    string(format) {
        if (this.qualifier) {
            return global.i18n.__(this.qualifier);
        }
        if (this.qdates.length == 1) {
            return this.qdates[0].string(format);
        }
        let pre = '', inbetween = '';
        switch (format) {
            case 'iso': inbetween = '/'; break;
            case 'world': 
            case 'us':
            default: pre = global.i18n.__('between') + ' '; inbetween = ' ' + global.i18n.__('and') + ' ';
        }
        return pre + this.qdates[0].string(format) + inbetween + this.qdates[1].string(format);
    }

    get year() {
        if (this.qualifier) {
            return global.i18n.__(this.qualifier);
        }
        if (this.qdates.length == 1) {
            return this.qdates[0].year;
        }
        return this.qdates[0].year + '-' + this.qdates[1].year;
    }

    get isRange() { return this.qdates.length > 1; }

    get dayLo()   { return this.qdates[0].dayLo; }
    get yearLo()  { return this.qdates[0].yearLo; }
    get monthLo() { return this.qdates[0].monthLo; }
    get dayHi()   { return this.qdates[this.isRange ? 1 : 0].dayHi; }
    get yearHi()  { return this.qdates[this.isRange ? 1 : 0].yearHi; }
    get monthHi() { return this.qdates[this.isRange ? 1 : 0].monthHi; }
}

module.exports = FQDate;