/** @module write write about individual based on parsed GEDCOM */
/** @author Coert Vonk <MY.NAME@gmail.com> */

var get = require('./get.js'),
    value = require('./value.js'),
    FQDate = require('./fqdate.js'),
    I18n = require('i18n-2');

const NL = "\n";

function _nameYearsOcc(i18n, gedcom, indi, refs) {

    let ret = get.byTemplate(i18n, gedcom, indi, refs, ' [NAME:full]');
    ret += get.lifeSpan(i18n, gedcom, indi, refs);
    ret += get.byTemplate(i18n, gedcom, indi, refs, ', [OCCU]| from [BIRT.PLAC]');
    return ret;
}

// prefer the date that doesn't start with 'BEF ', such as when only the baptized date is know, and the birth date is specified as 'BEF ' the baptized date
function _isPreferableOver(date1, date2) {

    if (date1) {
        const unfavPrefix = 'BEF ';
        if (date1.startsWith(unfavPrefix) && !date2.startsWith(unfavPrefix)) {
            return false;
        }
        return true;
    } else {
        return false;
    }
}

function _birthOrBaptDate(indi) {  // when only baptized is avail, the birth date is typically encoded as "BEF" the baptized date

    if (!indi) return '';
    const birth   = indi.BIRT && indi.BIRT.DATE && indi.BIRT.DATE.value;
    const baptism = indi.BAPM && indi.BAPM.DATE && indi.BAPM.DATE.value;
    if (_isPreferableOver(baptism, birth)) {
        return baptism;
    }
    return birth;
}

function _beforeOrAfter(i18n, ageDiff) {

    ageDiff = ageDiff.replace(' ' + i18n.__('old'), '');
    const firstDigit = ageDiff.length - ageDiff.replace(/^[^-0-9]+/, '').length;  // could have a prefix such as 'about' before the '-' sign
    const remainder = ageDiff.substring(firstDigit, ageDiff.length);
    let ret;
    if (remainder[0] == '-') {
        const pre = ageDiff.substring(0, firstDigit);
        ret = pre + remainder.slice(1) + ' ' + i18n.__('older');
    } else {
        ret = ageDiff + ' ' + i18n.__('younger');
    }
    return ret;
}

function _ageDiff(i18n, gedcom, sibling, refs, fnc) {

    let ret = '';
    if (sibling.BIRT || sibling.BAPM) {
        const birth   = sibling.BIRT && sibling.BIRT.DATE && sibling.BIRT.DATE.value;
        const baptism = sibling.BAPM && sibling.BAPM.DATE && sibling.BAPM.DATE.value;
        let ageDiff;
        if (_isPreferableOver(baptism, birth)) {
            ageDiff = get.byTemplate(i18n, gedcom, sibling, refs, '[BAPM.DATE:age]');  // calculate age and include references
        } else {
            ageDiff = get.byTemplate(i18n, gedcom, sibling, refs, '[BIRT.DATE:age]');
        }
        if (ageDiff) {
            ret = _beforeOrAfter(i18n, ageDiff);
        } else {
            if (_isPreferableOver(baptism, birth)) {
                ret += get.byTemplate(i18n, gedcom, sibling, refs, '[BAPM.DATE:world]', function (s) {
                    return ', ' + i18n.__('baptized') + ' ' + s;
                });                
            } else {
                ret +=  get.byTemplate(i18n, gedcom, sibling, refs, '[BIRT.DATE:world]', function (s) {
                    return ', ' + i18n.__('born') + ' ' +  + s;
                });
            }
        }
        if (ret && fnc) ret = fnc(ret);
    }
    return ret;
}

/**
 * These functions collect information about e.g. birth, death, parents, spouses or children.
 * Each piece of information starts with a separator such as ' ', or ', '.  If any information
 * is found, it is first passed to the function 'fnc', that may modify the return value.
 */
 
let _detailsOf = {

    birth: function(i18n, gedcom, indi, refs, fnc) {

        let ret = '';
        if (indi.BIRT) {
            ret += ', ';
            const birth   = indi.BIRT && indi.BIRT.DATE && indi.BIRT.DATE.value;
            const baptism = indi.BAPM && indi.BAPM.DATE && indi.BAPM.DATE.value;
            if (_isPreferableOver(baptism, birth)) {
                ret +=  get.byTemplate(i18n, gedcom, indi, refs, '[BAPM.DATE:us]', function (s) {
                    return i18n.__('baptized') + ' ' + s;
                });                
            } else {
                ret +=  get.byTemplate(i18n, gedcom, indi, refs, '[BIRT.DATE:us]', function (s) {
                    return i18n.__('born') + ' ' + s;
                });
            }
            if (ret && fnc) ret = fnc(ret);
        }
        return ret;
    },

    death: function(i18n, gedcom, indi, refs, long, fnc) {

        let ret = '';
        const death   = indi.DEAT && indi.DEAT.DATE && indi.DEAT.DATE.value;
        const burrial = indi.BURI && indi.BURI.DATE && indi.BURI.DATE.value;
        if (death || burrial) {
            const endEvent = _isPreferableOver(burrial, death)
                ? { type: 'is burried', date: burrial }
                : { type: 'died',       date: death };

            if (endEvent.date == 'stillborn') {
                ret += i18n.__(endEvent.date);
            } else {
                if ((indi.BIRT && indi.BIRT.DATE) || (indi.BAPM && indi.BAPM.DATE)) {
                    const saved = value.birthday;
                    {
                        value.birthday = new FQDate(_birthOrBaptDate(indi));
                        if (endEvent.type == 'died') {  // get the age *and* associated references
                            ret += get.byTemplate(i18n, gedcom, indi, refs, ' died [DEAT.DATE:age]');
                            if (long) ret += ', ' + get.byTemplate(i18n, gedcom, indi, refs, ' [DEAT.DATE:us]');
                        } else {
                            ret += get.byTemplate(i18n, gedcom, indi, refs, ' was buried [BURI.DATE:age]');
                            if (long) ret += ', ' + get.byTemplate(i18n, gedcom, indi, refs, ' [BURI.DATE:us]');
                        }
                    }
                    value.birthday = saved;
                } else {
                    if (endEvent.type == 'died') {  // get the date *and* associated references
                        ret += get.byTemplate(i18n, gedcom, indi, refs, ' died [DEAT.DATE:us]');
                    } else {
                        ret += get.byTemplate(i18n, gedcom, indi, refs, ' was buried [BURI.DATE:us]');
                    }
                }
                if (long) ret += get.byTemplate(i18n, gedcom, indi, refs, ' due to [DEAT.CAUS]');
                if (ret && fnc) ret = fnc(ret);
            }
        }
        return ret;
    },

    parents: function(i18n, gedcom, indi, refs, fnc) {

        let ret = '';
        let fams = get.byName(gedcom, indi, 'FAMC');
        for (let fam of fams) {  // for children that were latter assigned a father
            if (fam) {
                if (fam.HUSB || fam.WIFE) {
                    if (fam.HUSB) { ret += _nameYearsOcc(i18n, gedcom, get.byName(gedcom, fam, 'HUSB')[0], refs); }
                    if (fam.HUSB && fam.WIFE) { ret += ' ' + i18n.__('and'); }
                    if (fam.WIFE) { ret += _nameYearsOcc(i18n, gedcom, get.byName(gedcom, fam, 'WIFE')[0], refs); }
                }
            }
        }
        if (ret) {
            ret = get.byTemplate(i18n, gedcom, indi, refs, '. [SEX:HijZij]| is a [SEX:zoondochter] of') + ret;
            if (fnc) ret = fnc(ret);
        }
        return ret;
    },

    fact: function(i18n, gedcom, obj, refs, fnc) {

        let ret = get.byTemplate(i18n, gedcom, obj, refs, ' [DATE]');    
        if (obj.TYPE) ret += ' ' + i18n.__(obj.TYPE.value.toLowerCase());  // 2BD shoud use template to fill in the References
        ret += get.byTemplate(i18n, gedcom, obj, refs, ' in [PLAC]');
        if (obj.value) ret += ' ' + obj.value; 

        if (ret) {
            ret += refs.add(i18n, gedcom, obj && obj.SOUR);
            if (fnc) ret = fnc(ret);
        }
        return ret;
    },

    spouse: function(i18n, gedcom, spouse, refs, fam, fnc) {

        let ret = '';
        const saved = value.birthday;
        value.birthday = new FQDate(_birthOrBaptDate(spouse));
        {
            const marriage = fam.MARR;            
            ret += get.byTemplate(i18n, gedcom, spouse, refs, ' with [NAME:full]');
            ret += get.byTemplate(i18n, gedcom, marriage, refs, ' ([DATE:age])');
            ret += get.byTemplate(i18n, gedcom, spouse, refs, ' from [BIRT.PLAC]|, [OCCU]');
            ret += _detailsOf.parents(i18n, gedcom, spouse, refs);
            ret += _detailsOf.death(i18n, gedcom, spouse, refs, true, function(s) {
                const firstName = get.byTemplate(i18n, gedcom, spouse, refs, '[NAME:first]');
                return '. ' + firstName + s;
            });
        }
        if (ret && fnc) ret = fnc(ret);
        value.birthday = saved;
        return ret;
    },

    child: function(i18n, gedcom, child, refs, isSibling, prefix, fnc) {

        let ret = '';
        if (isSibling) {
            const name = get.byTemplate(i18n, gedcom, child, refs, ' [NAME:givenaka]');
            if (prefix == 'self') {
                ret += get.byTemplate(i18n, gedcom, child, refs, '[SEX:hijzijzelf]') + ', ' + name;
            } else {
                ret += get.byTemplate(i18n, gedcom, child, refs, (prefix ? i18n.__(prefix) : '') + '[SEX:broerzus]') + ', ' + name;
                ret += _ageDiff(i18n, gedcom, child, refs, function (s) { return ', ' + s; });
                ret += get.byTemplate(i18n, gedcom, child, refs, ', [OCCU]');
                ret += _detailsOf.death(i18n, gedcom, child, refs, false, function(s) {
                    return ',' + s;
                });
            }
        } else {
            ret += get.byTemplate(i18n, gedcom, child, refs, ' [SEX:zoondochter]| [NAME:givenaka]');

            const birth   = child.BIRT && child.BIRT.DATE && child.BIRT.DATE.value;
            const baptism = child.BAPM && child.BAPM.DATE && child.BAPM.DATE.value;        
            if (_isPreferableOver(baptism, birth)) {
                ret += get.byTemplate(i18n, gedcom, child, refs, '[BAPM.DATE:year]', function(s) {
                    return ', ' + i18n.__('baptized in') + ' ' + (Number(s) ? '' : i18n.__('in ')) + s;
                });    
            } else {
                ret += get.byTemplate(i18n, gedcom, child, refs, '[BIRT.DATE:year]', function(s) {
                    return ', ' + i18n.__('born in') + ' ' + (Number(s) ? '' : i18n.__('in ')) + s;
                });    
            }
            ret += get.byTemplate(i18n, gedcom, child, refs, '|, [OCCU]');
            ret += _detailsOf.death(i18n, gedcom, child, refs, false, function (s) { 
                return ',' +  s;
            });
            }
        if (ret && fnc) ret = fnc(ret);
        return ret;
    }
};

let _list = {

    children: function(i18n, gedcom, indi, refs, fam, p, fnc) {  // 'p' contains additional parameters

        let ret = '';
        let childIds = get.byName(gedcom, fam, 'CHIL');
        if (childIds && childIds[0]) {
            let listOfChildren = [];
            for (let childId of childIds) {
                if (!p.areSiblings || childId.id != indi.id) { //exclude self
                    const child = get.byId(gedcom, childId.id);
                    const fqdate = new FQDate(_birthOrBaptDate(indi));
                    const date = fqdate.year ? fqdate.string('iso') : '';
                    //const date = get.byTemplate(i18n, gedcom, child, refs,  '[BIRT.DATE:iso]');  // year - month - day, so it's sortable
                    if (!p.beforeDate || date < p.beforeDate) {
                        const text = _detailsOf.child(i18n, gedcom, child, refs, p.areSiblings, p.prefix);
                        listOfChildren.push({date: date, text: text});
                    }
                }
            }
            listOfChildren.sort(function(a, b) {
                if (a.date < b.date) return -1;
                if (a.date > b.date) return 1;
                return 0;
            });
            for (let child of listOfChildren) {
                ret += '.' + NL + '* ' + child.text;
            }
            if (ret && fnc) ret = fnc(ret);
        }
        return ret;
    },

    stepChildren: function(i18n, gedcom, indi, refs, parent, p, fnc) {  // 'p' contains additional parameters

        let ret = '';
        // find other relations of father/mother
        if (parent.FAMS.length > 1) {  // if he/she had more than 1 relationship
            for (let otherRelation of parent.FAMS) {
                if (otherRelation.id != p.naturalFamId) {
                    
                    // find the spouse in that other relation
                    const otherSpouse = get.spouse(i18n, gedcom, otherRelation, parent);
                    if (otherSpouse) {
                        if (otherSpouse.FAMS[0]) {
                            for (let oo of otherSpouse.FAMS) {
                                if (oo.id != otherRelation.id) {
                                    oo = get.resolveIndirects(gedcom, oo);
                                    ret += _list.children(i18n, gedcom, indi, refs, oo, {areSiblings: true, prefix: 'step'});
                                }
                            }
                        }
                    }
                }
            }
            if (ret && fnc) ret = fnc(ret);
        }
        return ret;
    },

    marriages: function(i18n, gedcom, refs, fam, fnc) {        

        let ret = '';
        const tags = {'MARR': 'married', 'DIV': 'divorced', 'ANUL': 'annulment'};
        for (let tag in tags) {
            let objs = get.byName(gedcom, fam, tag);
            if (objs.length) {
                for (let obj of objs) {
                    ret += get.byTemplate(i18n, gedcom, obj, refs, ', ' + tags[tag] + ' [DATE]', function (s) {
                        return get.byTemplate(i18n, gedcom, obj, refs, ' ([DATE:age])') + s;
                    });
                }
            }
            if (tag == 'MARR' && !ret) ret += ' ' + i18n.__('is in a relation');
        }
        if (ret && fnc) ret = fnc(ret);
        return ret;
    }
};

let _about = {

    init: function(indi) {

        const locales = { 'Netherlands': 'nl', 'USA': 'en', 'UK': 'en', 'Germany': 'de', 'Belgium': 'nl'}; // add locales here
        let locale = 'en';
        let birth    = indi.BIRT && indi.BIRT.PLAC ? indi.BIRT.PLAC.value : undefined;
        let baptized = indi.BAPM && indi.BAPM.PLAC ? indi.BAPM.PLAC.value : undefined;
        let death    = indi.DEAT && indi.DEAT.PLAC ? indi.DEAT.PLAC.value : undefined;
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

        let ret = get.byTemplate(i18n, gedcom, indi, refs, '[NAME:full]');
        ret += _detailsOf.birth(i18n, gedcom, indi, refs);
        ret += _detailsOf.parents(i18n, gedcom, indi, refs);
        if (indi.FAMC) {
            const fams = get.byName(gedcom, indi, 'FAMC');
            for (let fam of fams) {  // children that were latter assigned a father, are part to 2 families
                ret += _list.children(i18n, gedcom, indi, refs, fam, {areSiblings: true}, function (s) {
                    return '.' + NL + NL + i18n.__('Siblings') + s;
                });
                const parentTitles = {'HUSB': 'mother', 'WIFE': 'father'};
                for (let tag in parentTitles) {
                    if (fam[tag]) {
                        const parent = get.resolveIndirects(gedcom, fam[tag]);
                        const naturalFam = get.naturalFamily(indi, fams);
                        ret += _list.stepChildren(i18n, gedcom, indi, refs, parent, {areSiblings: true, naturalFamId: naturalFam.id }, function (s) {
                            return '.' + NL + NL + i18n.__('From step' + parentTitles[tag] + '\'s side') + s });
                    }    
                }
            }
        }
        return ret;
    },

    thePerson: function (i18n, gedcom, indi, refs) {
        
        let ret = get.byTemplate(i18n, gedcom, indi, refs, ' worked as [OCCU]');
        if (ret) {
            ret = get.byTemplate(i18n, gedcom, indi, refs, '[SEX:HijZij]') + ret;        
        }
        const tags = {'ADDR': 'address', 
            'EVEN': 'event',
            'ADOP': 'adoption',
            'ARVL': 'arrival',
            'CENS': 'census',
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
                    if (!ret) {
                        ret = get.byTemplate(i18n, gedcom, indi, refs, 'Facts about [SEX:hemhaar]');
                    }
                    ret += '.' + NL + "* " + i18n.__(label.toLowerCase()) + ": ";
                    ret += _detailsOf.fact(i18n, gedcom, fact, refs);
                }
            }
        }
        if (ret) {
            ret = '.' + NL + NL + "=== " + get.byTemplate(i18n, gedcom, indi, refs, '[NAME:first]') + " ===" + NL + NL + ret;
        }
        return ret;
    },

    relation: function (i18n, gedcom, indi, fam, spouse, refs) {

        let ret = '';
        if (spouse) {
            ret += NL + get.byTemplate(i18n, gedcom, indi, refs, '[NAME:first]');
            ret += _list.marriages(i18n, gedcom, refs, fam);  // will have at least 'in a relation' text
            ret += _detailsOf.spouse(i18n, gedcom, spouse, refs, fam);
        }       
        if (fam.CHIL) {
            ret += '.' + NL + NL + get.byTemplate(i18n, gedcom, indi, refs, 'Children of [NAME:first]');
            ret += get.byTemplate(i18n, gedcom, spouse, refs, ' and [NAME:first]');
            ret += _list.children(i18n, gedcom, indi, refs, fam, {});
        }
        if (spouse.FAMS.length > 1) {
            const spouseFams = get.resolveIndirects(spouse.FAMS);
            if (spouseFams && spouseFams[0]) {
                for (let ff of spouseFams) {
                    if (ff.id != fam.id) {
                        const thisRelationDate = (fam.MARR && fam.DATE) ? (new FQDate(fam.MARR.DATE).string('iso')) : undefined;
                        ret += _list.children(i18n, gedcom, spouse, refs, ff, {beforeDate: thisRelationDate}, function(s) {
                            const earlierOther = thisRelationDate ? 'Earlier' : 'Other';
                            return '.' + NL + NL + get.byTemplate(i18n, gedcom, spouse, refs, earlierOther + ' children of [NAME:first]') + s;
                        });
                    }
                }
            }
        }
        return ret;
    },

    relationships: function (i18n, gedcom, indi, refs) {

        let ret = '';
        if (indi.FAMS) {
            const fams = get.byName(gedcom, indi, 'FAMS');
            for (let fam of fams) {
                const spouse = get.spouse(i18n, gedcom, fam, indi);
                const spouseName = spouse ? get.byTemplate(i18n, gedcom, spouse, refs, '[NAME:first]') : i18n.__('unknown partner');
                const text = spouse ? _about.relation(i18n, gedcom, indi, fam, spouse, refs) : '';
                ret += '.' + NL + NL +  "=== " + i18n.__('Relationship with') + ' ' + spouseName + " ===" + NL + text;
            }
        }
        return ret;
    },

    oldDay: function (i18n, gedcom, indi, refs) {

        let ret = _detailsOf.death(i18n, gedcom, indi, refs, true);
        if (ret) {
            ret = get.byTemplate(i18n, gedcom, indi, refs, '[NAME:first]') + ' ' + ret;
            return '.' + NL + NL + "=== " + i18n.__('The old day') + " ===" + NL + NL + ret ;
        }
        return ret;
    }
}

let References = class {
    constructor () {
        this.alreadyReferenced = [];
    }
    add(i18n, gedcom, sours) {

        let ret = '';
        if (sours) {
            if (!(sours instanceof Array)) {
                sours = [sours];
            }
            let refsAlreadyShown = [];
            for (let sour of sours) {
                const shortId = sour.id.replace(/^@|@$/g, '')
                
                if (refsAlreadyShown.indexOf(shortId) >= 0) {  // don't need to show twice for a single fact
                    continue;
                }
                refsAlreadyShown.push(shortId);

                const existingRefId = this.alreadyReferenced.find(function(el) {
                    return el == shortId;
                });
                if (existingRefId) {
                    ret += ' <ref name="' + existingRefId + '" />';  // re-use an old reference
                } else {
                    this.alreadyReferenced.push(shortId);
                    ret += ' <ref name="' + shortId + '">';
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

        let refs = new References();
        let indis = indi_ ? [indi_] : get.byName(gedcom, gedcom, 'INDI');

        for (let indi of indis) {            
            if (!indi_) console.log(indi.id);
            const i18n = _about.init(indi);
            let ret = '== ' + i18n.__('Biography') + ' ==' + NL;
            ret += _about.introduction(i18n, gedcom, indi, refs);
            ret += _about.thePerson(i18n, gedcom, indi, refs);
            ret += _about.relationships(i18n, gedcom, indi, refs);
            ret += _about.oldDay(i18n, gedcom, indi, refs) + '.';
            ret += NL + '== ' + i18n.__('Sources') + ' ==\n<references />';
            if (indi_) {
                return ret;
            } else {
                console.log(ret);
            }
        }
    }
};