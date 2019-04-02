/** @module write write about individual based on parsed GEDCOM */
/** @author Coert Vonk <MY.NAME@gmail.com> */

var get = require('./get.js'),
    value = require('./value.js'),
    FQDate = require('./fqdate.js'),
    I18n = require('i18n-2'),
    util = require('./util.js');

const NL = "\n";

function _nameYearsOcc(i18n, gedcom, indi, refs) {
    util.assertTypes( arguments, ['object', 'object', 'object', 'object'] );

    let ret = get.byTemplate(i18n, gedcom, indi, refs, ' [NAME:full]');
    ret += get.lifeSpan(i18n, gedcom, indi, refs);
    ret += get.byTemplate(i18n, gedcom, indi, refs, ' [OCCU]| from [BIRT.PLAC]');
    return ret;
}

function _birthOrBaptDate(indi) {  // when only baptized is avail, the birth date is typically encoded as "BEF" the baptized date
    if (!indi) return '';

    const birth = indi.BIRT && indi.BIRT.DATE ? indi.BIRT.DATE.value : '';
    const baptized = indi.BAPM && indi.BAPM.DATE ? indi.BAPM.DATE.value : '';

    if (birth.length) {
        if (birth.startsWith('BEF') && !baptized.startsWith('BEF')) {
            return baptized;
        }
        return birth;
    } else {
        return baptized;
    }
}

/*
function _parentsFirstNames(i18n, gedcom, fam, refs) {
    util.assertTypes( arguments, ['object', 'object', 'object', 'object'] );

    let ret = '';
    if (fam.HUSB) ret += get.byTemplate(i18n, gedcom, fam, refs, ' [HUSB.NAME:first]');
    if (fam.HUSB && fam.WIFE) ret += ' ' + i18n.__('and/or');
    if (fam.WIFE) ret += get.byTemplate(i18n, gedcom, fam, refs, ' [WIFE.NAME:first]');
    return ret;
}
*/

function _ageDiff(i18n, gedcom, sibling, refs) {
    util.assertTypes( arguments, ['object', 'object', 'object', 'object'] );

    let ret = get.siblingBirthOrBaptAge(i18n, gedcom, sibling, refs);
    if (ret.length) {
        const firstDigit = ret.length - ret.replace(/^[^-0-9]+/, '').length;  // could have a prefix such as 'about' before the '-' sign
        const remainder = ret.substring(firstDigit, ret.length);
        if (remainder[0] == '-') {
            const pre = ret.substring(0, firstDigit);
            ret = ', ' + pre + remainder.slice(1) + ' ' + i18n.__('older');
        } else {
            ret = ', ' + ret + ' ' + i18n.__('younger');
        }
    } else {  // perhaps the indi has a birthday in a date range or so ..
        let birthDate = get.byTemplate(i18n, gedcom, sibling, refs, '[BIRT.DATE:world]');
        let baptizedDate = get.byTemplate(i18n, gedcom, sibling, refs, '[BAPM.DATE:world]');
        if (birthDate.length) {
            ret += ', ' + (birthDate == 'stillborn' ? i18n.__(birthDate) : i18n.__('born') + ' ' + birthDate);
        } else if(baptizedDate.length) {
            ret += ', ' + (birthDate == 'stillborn' ? i18n.__(birthDate) : i18n.__('baptized') + ' ' + birthDate);
        }
    }
    return ret;
}

let _detailsOf = {

    birth: function(i18n, gedcom, indi, refs) {
        util.assertTypes( arguments, ['object', 'object', 'object', 'object'] );

        const birth = get.byTemplate(i18n, gedcom, indi, refs, '[BIRT.DATE:year]');
        const baptized = get.byTemplate(i18n, gedcom, indi, refs, '[BAPM.DATE:year]');
        let ret = get.byTemplate(i18n, gedcom, indi, refs, '[NAME:full]');
        if (birth) {
            ret += get.byTemplate(i18n, gedcom, indi, refs, ' born [BIRT:us]');
        }
        if (birth && baptized) ret += ' ' + i18n.__('and');
        if (baptized) {
            ret += get.byTemplate(i18n, gedcom, indi, refs, ' baptized [BAPM:world]');
        }
        return ret;
    },

    death: function(i18n, gedcom, indi, refs, long) {
        util.assertTypes( arguments, ['object', 'object', 'object', 'object', 'boolean'] );

        let ret = '';
        if (indi.DEAT) {
            if (indi.BIRT && indi.BIRT.DATE) {
                const saved = value.birthday;
                {
                    value.birthday = new FQDate(_birthOrBaptDate(indi));
                    let deathAge = get.byTemplate(i18n, gedcom, indi, refs, '[DEAT.DATE:age]');  // gets the age, or the date when there is 'about' or some other qualifier
                    if (deathAge.length) {
                        if (long) {
                            ret += get.byTemplate(i18n, gedcom, indi, refs, '[NAME:first]| died on [DEAT:us]');
                            ret += ', ' + (deathAge == 'stillborn' ? i18n.__(deathAge) : i18n.__('at age') + ' ' + deathAge);
                            ret += get.byTemplate(i18n, gedcom, indi, refs, ' due to [DEAT.CAUS]|');
                        } else {
                            ret += ', ' + (deathAge == 'stillborn' ? i18n.__(deathAge) : i18n.__('died at age') + ' ' + deathAge);
                        }
                    }
                }
                value.birthday = saved;
            } else {
                const deathDate = get.byTemplate(i18n, gedcom, indi, refs, '[DEAT.DATE:world]');
                if (deathDate.length) {
                    ret += ', ' + (deathDate == 'stillborn' ? i18n.__(deathDate) : i18n.__('died on') + ' ' + deathDate);
                }
            }
        }
        return ret;
    },

    parent: function(i18n, gedcom, indi, refs) {
        util.assertTypes( arguments, ['object', 'object', 'object', 'object'] );

        let ret = '';
        let fams = get.byName(gedcom, indi, 'FAMC');
        if (fams[0]) {
            for (let fam of fams) {  // for children that were latter assigned a father
                if (fam) {
                    if (fam.HUSB || fam.WIFE) {
                        if (fam.HUSB) { ret += _nameYearsOcc(i18n, gedcom, get.byName(gedcom, fam, 'HUSB')[0], refs); }
                        if (fam.HUSB && fam.WIFE) { ret += ' ' + i18n.__('and'); }
                        if (fam.WIFE) { ret += _nameYearsOcc(i18n, gedcom, get.byName(gedcom, fam, 'WIFE')[0], refs); }
                    }
                }
            }
            if (ret.length) {
                ret = get.byTemplate(i18n, gedcom, indi, refs, ' [SEX:HijZij]| is a [SEX:zoondochter] of') + ret + '.';
            }
        }
        return ret;
    },

    fact: function(i18n, gedcom, obj, refs) {
        util.assertTypes( arguments, ['object', 'object', 'object', 'object'] );

        let ret = get.byTemplate(i18n, gedcom, obj, refs, ' [DATE]');    
        if (obj.TYPE) ret += ' ' + i18n.__(obj.TYPE.value.toLowerCase());
        ret += get.byTemplate(i18n, gedcom, obj, refs, ' in [PLAC]');
        if (obj.value) ret += ' ' + obj.value;
        return ret;
    },

    spouse: function(i18n, gedcom, spouse, refs) {
        util.assertTypes( arguments, ['object', 'object', 'object', 'object'] ); // 'mar' is optional

        let ret = '';
        const saved = value.birthday;
        value.birthday = new FQDate(_birthOrBaptDate(spouse));
        {
            ret += get.byTemplate(i18n, gedcom, spouse, refs, ' with [NAME:full]');
            //ret += get.byTemplate(i18n, gedcom, mar, refs, ' ([DATE:age])');
            ret += get.byTemplate(i18n, gedcom, spouse, refs, ' from [BIRT.PLAC]|, [OCCU]') + '. ';
            ret += _detailsOf.parent(i18n, gedcom, spouse, refs) + ' ';
            ret += _detailsOf.death(i18n, gedcom, spouse, refs, true);
            ret += '.';
        }
        value.birthday = saved;
        return ret;
    },

    old: function(i18n, gedcom, indi, refs) {
        util.assertTypes( arguments, ['object', 'object', 'object', 'object'] );

        let ret = _detailsOf.death(i18n, gedcom, indi, refs, true);
        //if (ret.length) {
        //    return get.byTemplate(i18n, gedcom, indi, refs, '[NAME:first]') + ret;
        //}
        return ret;
    },

    sibling: function(i18n, gedcom, sibling, refs, prefix) {
        util.assertTypes( arguments, ['object', 'object', 'object', 'object', 'string'] );

        let ret = '';
        const name = get.byTemplate(i18n, gedcom, sibling, refs, ' [NAME:givenaka]"');
        if (prefix == 'self') {
            ret += get.byTemplate(i18n, gedcom, sibling, refs, '[SEX:hemhaar]self') + ', ' + name;
        } else {
            ret += get.byTemplate(i18n, gedcom, sibling, refs, '[SEX:broerzus]') + ', ' + name;
            ret += _ageDiff(i18n, gedcom, sibling, refs);
            ret += get.byTemplate(i18n, gedcom, sibling, refs, ', [OCCU]');
            ret += _detailsOf.death(i18n, gedcom, sibling, refs, false);
        }
        return ret;
    },

    child: function(i18n, gedcom, child, refs) {
        util.assertTypes( arguments, ['object', 'object', 'object', 'object'] );

        let ret = get.byTemplate(i18n, gedcom, child, refs, ' [SEX:zoondochter]| [NAME:givenaka]|');
        let bornYear = get.byTemplate(i18n, gedcom, child, refs, '[BIRT.DATE:year]');
        if (bornYear.length) {
            ret += ', ' + i18n.__('born') + (typeof bornYear == 'string' ? ' ' : ' in ') + bornYear;
        }
        ret += get.byTemplate(i18n, gedcom, child, refs, '|, [OCCU]');
        ret += _detailsOf.death(i18n, gedcom, child, refs, false);
        return ret;
    }
};

let _list = {

    siblings: function(i18n, gedcom, indi, refs, siblings, prefix) {
        util.assertTypes( arguments, ['object', 'object', 'object', 'object', 'array', 'string'] );

        let listOfChildren = [];
        for (let sibling of siblings) {
            const date = get.byTemplate(i18n, gedcom, sibling, refs, '[BIRT.DATE:iso]');  // year - month - day, so it's sortable
            const text = _detailsOf.sibling(i18n, gedcom, sibling, refs, sibling.id == indi.id ? 'self' : prefix);
            listOfChildren.push({date: date, text: text});
        }
        listOfChildren.sort(function(a, b) {
            if (a.date < b.date) return -1;
            if (a.date > b.date) return 1;
            return 0;
        });
        let ret = '';
        for (let child of listOfChildren) {
            ret += NL + '* ' + child.text + '.';
        }
        return ret;
    },

    children: function(i18n, gedcom, indi, refs, fam) {
        util.assertTypes( arguments, ['object', 'object', 'object', 'object', 'object']);

        let listOfChildren = [];
        let childIds = get.byName(gedcom, fam, 'CHIL');
        for (let childId of childIds) {
            if (childId.id != indi.id) { //exclude self
                const child = get.byId(gedcom, childId.id);
                const date = get.byTemplate(i18n, gedcom, child, refs,  '[BIRT.DATE:iso]');  // year - month - day, so it's sortable
                const text = _detailsOf.child(i18n, gedcom, child, refs);
                listOfChildren.push({date: date, text: text});
            }
        }
        listOfChildren.sort(function(a, b) {
            if (a.date < b.date) return -1;
            if (a.date > b.date) return 1;
            return 0;
        });
        let ret = '';
        for (let child of listOfChildren) {
            ret += NL + '* ' + child.text + '.';
        }
        return ret;
    },

    marriages: function(i18n, gedcom, refs, fam) {        
        util.assertTypes( arguments, ['object', 'object', 'object', 'object']);

        let ret = '';
        let mars = get.byName(gedcom, fam, 'MARR');  // some people are married at 2 different churches
        if (mars.length) {
            for (let mar of mars) {
                ret += get.byTemplate(i18n, gedcom, mar, refs, ' ([DATE:age])|, married [DATE]');
            }
        }
        if (!ret.length) ret += ' ' + i18n.__('is in a relation');
        return ret;
    },

    divorces: function(i18n, gedcom, refs, fam) {        
        util.assertTypes( arguments, ['object', 'object', 'object', 'object']);

        let ret = '';
        const tags = {'DIV': 'divorce', 'ANUL': 'annulment'};
        for (let tag in tags) {
            let objs = get.byName(gedcom, fam, tag);
            if (objs.length) {
                for (let obj of objs) {
                    ret += get.byTemplate(i18n, gedcom, obj, refs, ', ' + tags[tag] + ' [DATE]');
                }
            }
        }
        return ret;
    }
};

let _about = {

    init: function(indi) {
        util.assertTypes( arguments, ['object'] );

        const locales = { 'Netherlands': 'nl', 'USA': 'en', 'UK': 'en', 'Germany': 'de', 'Belgium': 'nl'}; // add locales here
        let birth = indi.BIRT && indi.BIRT.PLAC ? indi.BIRT.PLAC.value : undefined;
        let baptized = indi.BAPM && indi.BAPM.PLAC ? indi.BAPM.PLAC.value : undefined;
        let death = indi.DEAT && indi.DEAT.PLAC ? indi.DEAT.PLAC.value : undefined;
        let locale = 'en';
        for (let key in locales) {
            if (birth && birth.endsWith(key) || baptized && baptized.endsWith(key) || death && death.endsWith(key)) {
                locale = locales[key];
                break;
            }
        }
        value.birthday = new FQDate(_birthOrBaptDate(indi));  // for calculating ages later
        let i18n = new I18n({ locales: [locale] });
        return i18n;
    },

    introduction: function (i18n, gedcom, indi, refs) {
        util.assertTypes( arguments, ['object', 'object', 'object', 'object'] );

        let ret = _detailsOf.birth(i18n, gedcom, indi, refs) + '.';
        ret += _detailsOf.parent(i18n, gedcom, indi, refs);
        if (indi.FAMC) {
            let fams = get.byName(gedcom, indi, 'FAMC');
            ret += NL + NL + i18n.__('Siblings') + ':';
            for (let fam of fams) {  // for children that were latter assigned a father
                let siblings = get.byName(gedcom, fam, 'CHIL');
                let prefix = i18n.__('half');
                if (siblings) {
                    for (let sibling of siblings) {
                        if (sibling.id == indi.id) prefix = '';
                    }
                    ret += _list.siblings(i18n, gedcom, indi, refs, siblings, prefix);
                }
            }
        }
        return ret;
    },

    thePerson: function (i18n, gedcom, indi, refs) {
        util.assertTypes( arguments, ['object', 'object', 'object', 'object'] );

        let ret = ""
        if (indi.OCCU) {
            ret += get.byTemplate(i18n, gedcom, indi, refs, NL + '[SEX:HijZij]| worked as [OCCU].');
        }    
        //ret += get.byTemplate(i18n, gedcom, indi, refs, 'Other facts about [SEX:hemhaar]:') + NL;
        const tags = {'ADDR': 'address', 
            'EVEN': 'event',
            'ADOP': 'adoption',
            'ARVL': 'arrival',
            'DPRT': 'departure',
            'DESC': 'physical description',
            'EDUC': 'education',
            'EMIG': 'emigration',
            'ENGA': 'engagement',
            'GRAD': 'graduation',
            'IMML': 'immigration',
            'LOAN': 'loan',
            'NATU': 'naturalization',
            //'NOTE': 'additional info',
            'RELI': 'religion'};
        for (let key in tags) {
            if (indi[key]) {
                const facts = get.byName(gedcom, indi, key);
                for (let fact of facts) {
                    const label = (key == 'EVEN' && fact.TYPE) ? fact.TYPE.value : tags[key];
                    ret += NL + "* ''" + i18n.__(label.toLowerCase()) + "'',";
                    ret += _detailsOf.fact(i18n, gedcom, fact, refs) + '.';
                }
            }
        }
        if (ret.length) return NL + ' ' + NL + "'''" + get.byTemplate(i18n, gedcom, indi, refs, '[NAME:first]') + "'''" + NL + ret;
        return ret;
    },

    relationships: function (i18n, gedcom, indi, refs) {
        util.assertTypes( arguments, ['object', 'object', 'object', 'object'] );

        let ret = ''
        if (indi.FAMS) {
            const fams = get.byName(gedcom, indi, 'FAMS');
            for (let fam of fams) {
                let spouse = get.spouse(i18n, gedcom, fam, indi);
                let spouseName = get.byTemplate(i18n, gedcom, spouse, refs, '[NAME:first]');
                if (!spouseName.length) spouseName = i18n.__('unknown partner');

                let text = '';
                if (spouse) {
                    let partnerText = _list.marriages(i18n, gedcom, refs, fam) + _list.divorces(i18n, gedcom, refs, fam);
                    partnerText += _detailsOf.spouse(i18n, gedcom, spouse, refs);
                    if (partnerText.length)  {
                        text += NL + get.byTemplate(i18n, gedcom, indi, refs, '[NAME:first]') + partnerText;
                    }
                }       
                if (fam.CHIL) {
                    text += NL + ' ' + NL;
                    text += get.byTemplate(i18n, gedcom, indi, refs, 'Children of [NAME:first]');
                    text += get.byTemplate(i18n, gedcom, spouse, refs, ' and [NAME:first]:') + NL;
                    text += _list.children(i18n, gedcom, indi, refs, fam);
                }
                if (text.length) {
                    ret += NL + ' ' + NL +  "'''" + i18n.__('Relationship with') + ' ' + spouseName + "'''" + NL + text;
                }
            }
        }
        return ret;
    },

    oldDay: function (i18n, gedcom, indi, refs) {
        util.assertTypes( arguments, ['object', 'object', 'object', 'object'] );

        let ret = '';
        if (indi.DEAT) {
            ret += _detailsOf.old(i18n, gedcom, indi, refs);
            if (ret.length) return NL + ' ' +  NL + "'''" + i18n.__('The old day') + "'''" + NL + NL + ret + '.';
        }
        return ret;
    }
}

let References = class {
    constructor () {
        this.alreadyReferenced = [];
    }
    add(i18n, gedcom, sours) {
        util.assertTypes( arguments, ['object', 'object'] );
        let ret = '';
        if (sours) {
            if (!(sours instanceof Array)) {
                sours = [sours];
            }
            for (let sour of sours) {
                const shortId = sour.id.replace(/^@|@$/g, '')
                let existingRefId = this.alreadyReferenced.find(function(el) {
                    return el == shortId;
                });
                if (existingRefId) {
                    ret += '<ref name="' + existingRefId + '" />';
                } else {
                    this.alreadyReferenced.push(shortId);
                    ret += '<ref name="' + shortId + '">';
                    ret += get.sourceTitle(i18n, gedcom, sour.id);
                    if (sour.PAGE) {
                        if (sour._LINK) {
                            ret += "'[" + sour._LINK.value + ' ' + sour.PAGE.value + "]'";
                        } else {
                            ret += "''" + sour.PAGE.value + "'";
                        }
                    }
                    if (sour.QUAY) ret += ', ' + i18n.__('reliability') + ' ' + sour.QUAY.value + '/4';
                    if (sour.NOTE) ret += ' (' + sour.NOTE.value + ')';
                    if (sour.DATA && sour.DATA.TEXT) ret += '.' + NL + sour.DATA.TEXT.value;
                    ret += '</ref>';
                }
            }
        }
        return ret;
    }
}

module.exports = {

    biography: function (gedcom, indi_) {
        util.assertTypes( arguments, ['object'] );  // 'indi_' is optional, defaults to all individuals (used for SQA)

        let refs = new References();
        let indis = indi_ ? [indi_] : get.byName(gedcom, gedcom, 'INDI');

        for (let indi of indis) {            
            if (!indi_) console.log(indi.id);
            const i18n = _about.init(indi);
            let ret = '== ' + i18n.__('Biography') + ' ==' + NL;
            ret += _about.introduction(i18n, gedcom, indi, refs);
            ret += _about.thePerson(i18n, gedcom, indi, refs);
            ret += _about.relationships(i18n, gedcom, indi, refs);
            ret += _about.oldDay(i18n, gedcom, indi, refs);
            ret += NL + '== ' + i18n.__('Sources') + ' ==\n<references />';
            if (indi_) {
                return ret;
            } else {
                console.log(ret);
            }
        }
    }
};