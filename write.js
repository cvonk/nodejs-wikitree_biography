/** @module write write about individual based on parsed GEDCOM */
/** @author Coert Vonk <MY.NAME@gmail.com> */

var get = require('./get.js'),
    value = require('./value.js'),
    FQDate = require('./fqdate.js'),
    I18n = require('i18n-2');

const NL = "\n";

function _getNameYearsOcc(i18n, gedcom, indi, refs) {
    let ret = '';
    if (i18n && gedcom && indi) {
        ret += get.byTemplate(i18n, gedcom, indi, refs, ' [NAME:full]');
        ret += get.lifeSpan(i18n, gedcom, indi, refs);
        ret += get.byTemplate(i18n, gedcom, indi, refs, ' [OCCU]| from [BIRT.PLAC]');
    }
    return ret;
}

function _getParentsFirstNames(i18n, gedcom, fam, refs) {
    let ret = '';
    if (fam.HUSB) {
        ret += get.byTemplate(i18n, gedcom, fam, refs, ' [HUSB.NAME:first]');
    }
    if (fam.HUSB && fam.WIFE) {
        ret += ' ' + i18n.__('and/or');
    }
    if (fam.WIFE) {
        ret += get.byTemplate(i18n, gedcom, fam, refs, ' [WIFE.NAME:first]');
    }
    return ret;
}

function _aboutSibling(i18n, gedcom, sibling, refs, prefix) {
    let yrs = '';
    let ret = '* '; 
    if (prefix != 'self') {
        let yrsYounger = get.byTemplate(i18n, gedcom, sibling, refs, '[BIRT.DATE:age]');
        if (yrsYounger.length) {
            if (yrsYounger[1] == '-') {  // has a ~, <, > in front of the minus
                yrs += yrsYounger[0];
                yrsYounger = yrsYounger.slice(1);
            }
            yrs += ', ';
            if (yrsYounger.startsWith('-')) {
                yrs += yrsYounger.slice(1) +  ' ' + i18n.__('older')
            } else {
                yrs += yrsYounger + ' ' + i18n.__('younger');
            }
        }
        ret += get.byTemplate(i18n, gedcom, sibling, refs, '[SEX:broerzus], ');
    } else {
        ret += get.byTemplate(i18n, gedcom, sibling, refs, '[SEX:hijzij] zelf, ').toLowerCase();
    }
    ret += get.byTemplate(i18n, gedcom, sibling, refs, ' [NAME:given]| "[NAME:aka]"') + yrs;
    if (prefix != 'self') {
        ret += get.byTemplate(i18n, gedcom, sibling, refs, ', [OCCU]');
        if (sibling.BIRT && sibling.BIRT.DATE) {
            const saved = value.birthday;
            {
                value.birthday = new FQDate(sibling.BIRT.DATE.value);
                const deathAge = get.byTemplate(i18n, gedcom, sibling, refs, '[DEAT.DATE:age]');
                value.birthday = saved;
                if (deathAge.length) {
                    ret += ', ';
                    if (deathAge == 'stillborn') { ret += i18n.__(deathAge); } 
                    else { ret += i18n.__('died at age') + ' ' + deathAge; }
                }
            }
        }
    }
    return ret;
}

function _aboutAddress(i18n, gedcom, obj, refs) {
    let ret = get.byTemplate(i18n, gedcom, obj, refs, '[DATE],');
    if (obj.TYPE) {
        switch (obj.TYPE.value) {
            case 'Arrival': ret += ' ' + i18n.__('arrival'); break;
            case 'Departure': ret += ' ' + i18n.__('departure'); break;
            default: ret += obj.TYPE.value;
        }
    }
    ret += get.byTemplate(i18n, gedcom, obj, refs, ' in [PLAC]');
    if (obj.value) {
        ret += ', ' + obj.value;
    }
    return ret;
}

function _aboutSpouse(i18n, gedcom, spouse, refs, mar) {
    let ret = '';
    if (i18n && gedcom && spouse) {
        const saved = value.birthday;
        value.birthday = new FQDate(spouse.BIRT && spouse.BIRT.DATE ? spouse.BIRT.DATE.value : undefined);
        {
            ret += get.byTemplate(i18n, gedcom, spouse, refs, ' with [NAME:full]');
            ret += get.byTemplate(i18n, gedcom, mar, refs, ' ([DATE:age])');
            ret += get.byTemplate(i18n, gedcom, spouse, refs, ' from [BIRT.PLAC]|, [OCCU]|.');
            ret += about.parents(i18n, gedcom, spouse);
            let death = get.byTemplate(i18n, gedcom, spouse, refs, '[NAME:first]| died on [DEAT]| ([DEAT.DATE:age])| due to [DEAT.CAUS]|.');
            if (death.length) {
                //ret += ' ' + NL;
                ret += get.byTemplate(i18n, gedcom, spouse, refs, '[NAME:first]|') + death;
            }
        }
        value.birthday = saved;
    }
    return ret;
}

function _getDeath(i18n, gedcom, indi, refs, long) {
    let ret = '';
    if (i18n && gedcom && indi && indi.DEAT) {
        if (indi.BIRT && indi.BIRT.DATE) {
            const saved = value.birthday;
            value.birthday = new FQDate(indi.BIRT.DATE.value);
            {
                if (long) {
                    ret += get.byTemplate(i18n, gedcom, indi, refs, '[NAME:first]| died on [DEAT]| ([DEAT.DATE:age])| due to [DEAT.CAUS]|');
                } else {
                    ret += get.byTemplate(i18n, gedcom, indi, refs, ', dies at age [DEAT.DATE:age]');
                }
            }
            value.birthday = saved;
        } else {
            ret += get.byTemplate(i18n, gedcom, indi, refs, ', died on [DEAT.DATE]');
        }
    }
    return ret;
}

function _aboutChild(i18n, gedcom, child, refs) {
    let ret = ''
    if (i18n && gedcom && child) {
        ret += get.byTemplate(i18n, gedcom, child, refs, ' [SEX:zoondochter]| [NAME:given]|, born in [BIRT.DATE:year]|, [OCCU]');

        ret += _getDeath(i18n, gedcom, child, false);
    }
    return ret;
}

function _aboutOld(i18n, gedcom, indi, refs) {
    let ret = '';
    if (i18n && gedcom && indi) {
        ret += _getDeath(i18n, gedcom, indi, refs, true) + '.' + NL;
    }
    return ret;
}

let about = {

    init: function(gedcom, indi) {
        let locale = 'en';
        if (gedcom && indi) {
            const locales = { 'Netherlands': 'nl', 'USA': 'en', 'UK': 'en', 'Germany': 'de'}; // add locales here
            let birth = indi.BIRT && indi.BIRT.PLAC ? indi.BIRT.PLAC.value : undefined;
            let baptized = indi.BAPT && indi.BAPT.PLAC ? indi.BAPT.PLAC.value : undefined;
            let death = indi.DEAT && indi.DEAT.PLAC ? indi.DEAT.PLAC.value : undefined;
            for (let key in locales) {
                if (birth && birth.endsWith(key) || baptized && baptized.endsWith(key) || death && death.endsWith(key)) {
                    locale = locales[key];
                    break;
                }
            }
            if (indi.BIRT && indi.BIRT.DATE) {
                value.birthday = new FQDate(indi.BIRT.DATE.value);  // for calculating ages later
            }
        }
        let i18n = new I18n({ locales: [locale] });
        //i18n.locales = [locale];  // try it here, param above didn't work, later we set the locale based on where the person is born
        //i18n.locale = locale;
        //i18n.defaultLocale = locale;
        return i18n;
},

    parents: function (i18n, gedcom, indi, refs) {
        if (i18n && gedcom && indi) {
            let ret = '';
            let fams = get.byName(gedcom, indi, 'FAMC');
            if (fams[0]) {
                ret += get.byTemplate(i18n, gedcom, indi, refs, ' [SEX:hijzij]| is a [SEX:zoondochter] of');
                for (let fam of fams) {  // for children that were latter assigned a father
                    if (fam) {
                        if (fam.HUSB || fam.WIFE) {
                            if (fam.HUSB) { ret += _getNameYearsOcc(i18n, gedcom, get.byName(gedcom, fam, 'HUSB')[0], refs); }
                            if (fam.HUSB && fam.WIFE) { ret += ' ' + i18n.__('and'); }
                            if (fam.WIFE) { ret += _getNameYearsOcc(i18n, gedcom, get.byName(gedcom, fam, 'WIFE')[0], refs); }
                        }
                        ret += '.' + NL;
                    }
                }
            }
            return ret;
        }       
    },

    introduction: function (i18n, gedcom, indi, refs) {
        let ret = "";
        if (i18n && gedcom && indi) {

            const birth = get.byTemplate(i18n, gedcom, indi, refs, '[BIRT.DATE:year]');
            const baptized = get.byTemplate(i18n, gedcom, indi, refs, '[BAPT.DATE:year]');
            ret += get.byTemplate(i18n, gedcom, indi, refs, '[NAME:full]');
            if (birth) {
                ret += get.byTemplate(i18n, gedcom, indi, refs, ' born on [BIRT]');
            }
            if (birth && baptized) ret += " and"
            if (baptized) {
                ret += get.byTemplate(i18n, gedcom, indi, refs, ' baptized on [BAPT]');
            }
            ret += '.';
            ret += this.parents(i18n, gedcom, indi);
            if (indi.FAMC) {
                let fams = get.byName(gedcom, indi, 'FAMC');
                for (let fam of fams) {  // for children that were latter assigned a father
                    if (fam.HUSB || fam.WIFE) {
                        ret +=  ' ' + i18n.__('Children of') + _getParentsFirstNames(i18n, gedcom, fam, refs) + ':' + NL;                        
                    }
                    let siblings = get.byName(gedcom, fam, 'CHIL');
                    let prefix = i18n.__('half');
                    if (siblings) {
                        for (let sibling of siblings) {
                            if (sibling.id == indi.id) {
                                prefix = '';
                            }
                        }
                    }
                    if (siblings) {
                        for (let sibling of siblings) {
                            ret += _aboutSibling(i18n, gedcom, sibling, refs, sibling.id == indi.id ? 'self' : prefix) + '.' + NL;
                        }
                    }
                }
            }
            //ret += ' ' + NL;
        }
        return ret;
    },

    childhood: function (i18n, gedcom, indi, refs) {
        if (i18n && gedcom && indi) {
            let ret = ""
            if (indi.OCCU) {
                ret += get.byTemplate(i18n, gedcom, indi, refs, '[NAME:first]| worked as [OCCU]') + '.' + NL;
            }    
            if (indi.ADDR || indi.EVEN) {
                ret += ' ' + NL + "'''" + i18n.__('Childhood') + "'''" + NL + ' ' + NL;
                ret += get.byTemplate(i18n, gedcom, indi, refs, '[SEX:hijzij] lived at:') + NL;
                for (let src of ['ADDR', 'EVEN']) {
                    if (indi[src]) {
                        let objs = get.byName(gedcom, indi, src);
                        for (let obj of objs) {
                            ret += '* ' + _aboutAddress(i18n, gedcom, obj, refs) + '.' + NL;
                        }
                    }
                }
            }
            return ret;
        }
    },

    relationships: function (i18n, gedcom, indi, refs) {
        let ret = "";
        if (i18n && gedcom && indi && indi.FAMS) {
            ret += ' ' + NL +  "'''" + i18n.__('Relationships') + "'''" + NL;
            let fams = get.byName(gedcom, indi, 'FAMS');
            for (let fam of fams) {
                ret += ' ' + NL;
                ret += get.byTemplate(i18n, gedcom, indi, refs, '[NAME:first]');
                
                let mars = get.byName(gedcom, fam, 'MARR');  // some people are married at 2 different churches
                if (mars[0]) {
                    for (let mar of mars) {
                        ret += get.byTemplate(i18n, gedcom, mar, refs, ' ([DATE:age])|, married on [DATE]');
                    }
                }
                let spouse = get.spouse(i18n, gedcom, fam, indi);
                ret += _aboutSpouse(i18n, gedcom, spouse, refs, mars[0]);
                if (fam.CHIL) {
                    ret += ' ';
                    ret += get.byTemplate(i18n, gedcom, indi, refs, 'Children of [NAME:first]');
                    ret += get.byTemplate(i18n, gedcom, spouse, refs, ' and [NAME:first]:') + NL;
                    let childIds = get.byName(gedcom, fam, 'CHIL');
                    for (let childId of childIds) {
                        if (childId.id != indi.id) { //exclude self
                            let child = get.byId(gedcom, childId.id);
                            ret += '* ' + _aboutChild(i18n, gedcom, child, refs) + '.' + NL;
                        }
                    }
                } else {
                    ret += NL;
                }
            }
        }
        return ret;
    },

    oldday: function (i18n, gedcom, indi, refs) {
        let ret = '';
        if (i18n && gedcom && indi && indi.DEAT) {
            ret += ' ' +  NL + "'''" + i18n.__('The old day') + "'''" + NL + ' ' + NL;
            ret += _aboutOld(i18n, gedcom, indi, refs);
        }
        return ret;
    }
}

let References = class {
    constructor () {
        this.alreadyReferenced = [];
    }
    add(i18n, gedcom, sours) {
        let ret = "";
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
                    ret += get.sourceTitle(i18n, gedcom, sour.id) + '<BR />' + NL;
                    if (sour.PAGE) {
                        if (sour._LINK) {
                            ret += "'[" + sour._LINK.value + ' ' + sour.PAGE.value + "]'";
                        } else {
                            ret += "''" + sour.PAGE.value + "'";
                        }
                    }
                    if (sour.QUAY) ret += ', quality ' + sour.QUAY.value + '/4';
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

    biography: function (gedcom, indi_) {  // indi_ optional, defaults to all

        let refs = new References();
        let indis = indi_ ? [indi_] : get.byName(gedcom, gedcom, 'INDI');

        for (let indi of indis) {            
            if (!indi_) console.log(indi.id);
            const i18n = about.init(gedcom, indi);
            let ret = "== Biography ==" + NL;
            ret += about.introduction(i18n, gedcom, indi, refs);
            ret += about.childhood(i18n, gedcom, indi, refs);
            ret += about.relationships(i18n, gedcom, indi, refs);
            ret += about.oldday(i18n, gedcom, indi, refs);
            ret += NL + '== Sources ==\n<references />';
            if (indi_) {
                return ret;
            } else {
                console.log(ret);
            }
        }
    }
};

