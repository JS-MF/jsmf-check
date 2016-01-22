var JSMF = require('jsmf-core'); var Model = JSMF.Model; var Class = JSMF.Class; var Enum = JSMF.Enum;

var mma = new Model('Famillies');

var Family = Class.newInstance('Family', undefined, {lastName: String}, {
    father: {type: Member, cardinality: 1, opposite: 'familyFather', composite: true},
    mother: {type: Member, cardinality: 1, opposite: 'familyMother', composite: true},
    sons: {type: Member, cardinality: -1, opposite: 'familySon', composite: true},
    daughter: {type: Member, cardinality: -1, opposite: 'familyDaughter', composite: true}
});
var Member = Class.newInstance('Member');

Member.setAttribute('firstName', String);
Member.setReference('familyFather',Family,1, 'father');
Member.setReference('familyMother', Family,1, 'mother');
Member.setReference('familySon', Family,1, 'sons');
Member.setReference('familyDaughter', Family,1, 'daughters');

//console.log(Family.__references['father']);

mma.setModellingElements([Family,Member]);


module.exports = {

    mma : mma,

  //  mmb : mmb,

    Family: Family,

    Member: Member

};
