/** @module get retrieve selected GEDCOM records */
/** @author Coert Vonk <MY.NAME@gmail.com> */

var value = require('./value.js');
const NL = "\n";

function _id2typeName(id) {
    if (id) {
        const types = ["FAM", "INDI", "SOUR", "REPO"];
        for (let type of types) {
            if (type[0] == id[1]) {
                return type;
            }
        }
    }
    throw "Unsupported id format (" + id + ")";
}

function _resolveIndirects(gedcom, obj) {
    if (gedcom && obj) {
        let lastId = undefined;  // to stop self-reference loop
        // can't just go by Object.keys(obj).length == 1, 'cause occational there are additional fields (such as  _FREL or _MREL in CHIL)
        while (obj.id != lastId) {
            lastId = obj.id;
            obj = module.exports.byId(gedcom, obj.id);
        }
        return obj;
    }
}

function _fieldValue(i18n, gedcom, obj, refs, fields) {
    let ret = "";
    if (obj && fields) {
        const field = fields.split('.').slice(-1)[0];  // last entry separated by '.'
        const [type, format] = field.split(':');
        if (obj) {
            switch (type) {
                case 'NAME': ret += value.name(obj, format); break;
                case 'SEX': ret += value.sex(i18n, obj, format); break;
                case 'BIRT':
                case 'BAPT':
                case 'DEAT':
                case 'MARR': ret += module.exports.byTemplate(i18n, gedcom, obj[0], refs, '[DATE:' + format + ']| in [PLAC]'); break;
                case 'PLAC': ret += value.place(obj, format); break;
                case 'DATE': ret += value.date(i18n, obj, format); break;
                default: if (obj[0]) ret += obj[0].value;
            }
        }
        if (refs && ret.length) {
            ret += refs.add(i18n, gedcom, obj[0] && obj[0].SOUR);
        }
    }
    return ret;
}

function _trimmedI18n(i18n, s) {
    if (s) {
        const middleStart = s.length - s.replace(/^[^\w]+/, '').length;
        let middleEnd = s.replace(/[^\w]+$/, '').length;
        if (middleEnd <= middleStart) middleEnd = middleStart;  // in case theer are no letters
        const pre = s.substring(0, middleStart);
        let middle = s.substring(middleStart, middleEnd);
        const post = s.substring(middleEnd, s.length);
        //console.log(s + '|' + pre + '|' + middle + '|' + post + '|');
        if (middle.length) {
            middle = i18n.__(middle);
        }
        return pre + middle + post;
    }
    return s;
}

module.exports = {

    /**
     * Returns the object from parsed GEDCOM file 'e' that matches the identifier 'id'.  For
     * example, for id '@F1@' it will return the element of the array e.FAM where 
     * e.FAM[].id == id.
     * 
     * @param {Object} e   parsed GEDCOM file
     * @param {String} id  identifier, for example '@F1@'
     * @returns {Object}   the requested object, or undefined if not found
     */
    byId: function (gedcom, id) {
        if (gedcom && id) {
            const typeName = _id2typeName(id);
            for (let element of gedcom[typeName]) {
                if (element.id == id) {
                    return element;
                }
            }
        } else {
            throw "parameter missing"
        }
    },

    /**
     * Returns the child object of 'obj' specified by 'fields'.
     * 
     * @param {Object} e         parsed GEDCOM file
     * @param {Object} obj       object within the parsed GEDCOM file
     * @param {String} selector  dot-separated field names, such as 'FAMS.WIFE.NAME'
     * @returns {Object}         the requested object, or undefined if not found
     */
    byName: function(gedcom, obj, selector) {
        if (gedcom && obj && selector) {
            var fields = selector.split('.');
            let field = fields.shift(); // take first el from array
            field = field.split(':')[0]; // remove :format
            obj = _resolveIndirects(gedcom, obj);
            if (fields.length == 0) {
                obj = obj[field];
                if (!(obj instanceof Array)) {
                    obj = [obj];
                }
                for (let idx in obj) {
                    obj[idx] = _resolveIndirects(gedcom, obj[idx]);
                }
                return obj;
            }
            if (!obj[field]) {
                //throw 'selector (' + selector + ') fails at field (' + field + ')';
                return;
            }
            if (obj[field].length > 1) {
                throw 'selector (' + selector + ') diverges at field (' + field + ')';
            }
            return this.byName(gedcom, obj[field], fields.join('.')); // recursive call
        }
    },

    /**
     * Returns the spouse for individual 'indi' who is the other spouse in family 'fams'
     * 
     * @param {Object} e     parsed GEDCOM file
     * @param {Object} fams  object containing GEDCOM FAM record
     * @param {Object} indi  object of the individual whose spouse we're looking for
     * @returns {Object}     the requested object, or undefined if not found
     */
    spouse: function(i18n, gedcom, fams, indi) {
        if (i18n, gedcom && fams && indi) {
            const husbIds = this.byName(gedcom, fams, 'HUSB');
            const wifeIds = this.byName(gedcom, fams, 'WIFE');
            if (husbIds && husbIds[0] && wifeIds && wifeIds[0]) {
                if (husbIds[0].id == indi.id) {
                    return this.byId(gedcom, wifeIds[0].id);
                }
                return this.byId(gedcom, husbIds[0].id);
            }
        }
    },

    byTemplate: function (i18n, gedcom, obj, refs, templatesStr) {
        let ret = "";
        if (obj && templatesStr) {
            const templates = templatesStr.split('|');
            for (let template of templates) {
                let pre, fieldName, post;
                [pre, fieldName, post] = template.split(/\[|\]/);
                if (fieldName) {
                    const oo = module.exports.byName(gedcom, obj, fieldName);
                    if (oo && oo[0]) {
                        const text = _fieldValue(i18n, gedcom, oo, refs, fieldName);
                        if (text.length) {
                            ret += _trimmedI18n(i18n, pre) + text + _trimmedI18n(i18n, post);
                            //ret += value.localizeDateStr(i18n, pre) + text + value.localizeDateStr(i18n, post);
                        }
                    }
                } else {
                    ret += pre;
                }
            }
        }
        return ret;
    },

    sourceTitle: function(i18n, gedcom, id) {
        let ret = '';
        if (id) {
            let s = module.exports.byId(gedcom, id);
            if (s && s.TITL) {
                ret += s.TITL.value;
                if (s.REPO) {
                    let r = module.exports.byId(gedcom, s.REPO.id);
                    if (r && r.NAME) {
                        ret += ' ' + i18n.__('accessed via') + ' ' + r.NAME.value + '.';
                    }
                }
                ret += NL;
            }
        }
        return ret;
    },

    lifeSpan: function(i18n, gedcom, indi, refs) {
        let ret = '';
        if (gedcom && indi) {
            let birth = module.exports.byTemplate(i18n, gedcom, indi, refs, '[BIRT.DATE:year]');
            if (!birth.length) birth = module.exports.byTemplate(i18n, gedcom, indi, refs, '[BAPT.DATE:year]');
            const death = module.exports.byTemplate(i18n, gedcom, indi, refs, '[DEAT.DATE:year]');
            if (birth.length || death.length) {
                ret += ' (';
                if (birth.length) ret += birth;
                ret += '-';
                if (death.length) ret += death;
                ret += ')';
            }
        }
        return ret;
    }
}