const assert=require('assert'),{normalize,geometry,insert,swap,remove}=require('../extension/wheel-config.js');
const folders=Array.from({length:40},(_,i)=>({id:String(i+1)})),d=normalize({},folders);assert.deepEqual(d.layers.map(l=>l.count),[6,16]);
let c=insert(d,0,3,{folder:'30'});assert.equal(c.layers[0].count,7);assert.equal(geometry(c,800,600).rings[0].count,7);assert.equal(d.layers[0].count,6);
c=remove(remove(c,0,3),0,0);assert.deepEqual(c.layers[0].slots,['2','3','4','5','6']);
c=insert(d,0,6,{from:[0,0]});assert.deepEqual(c.layers[0].slots,['2','3','4','5','6','1']);c=insert(d,1,0,{from:[0,0]});assert.deepEqual(c.layers.map(l=>l.count),[5,17]);
c=normalize({version:3,layers:[{slots:['1']}]});c=remove(c,0,0);assert.equal(c.layers[0].count,0);assert.equal(insert(c,0,0,{folder:'2'}).layers[0].count,1);
assert.deepEqual(normalize({layers:[{count:3,slots:['','2','3','4']}]}).layers[0].slots,['2','3']);assert.equal(normalize({pinned:['9'],autoDefault:false}).autoDefault,false);
const full=normalize({version:3,layers:[{slots:Array.from({length:64},(_,i)=>String(i+1))}]});assert.throws(()=>insert(full,0,0,{folder:'99'}));assert.equal(full.layers[0].count,64);
console.log('PASS: dynamic count, reorder, move, empty ring, migration and atomic limit');

const positionFixture=normalize({version:3,layers:[{slots:['1','2','3','4','5','6'],rotation:0},{slots:['7','8'],rotation:15}]});
const exchanged=swap(positionFixture,0,1,0,5);
assert.deepStrictEqual(exchanged.layers[0].slots,['1','6','3','4','5','2']);
assert.deepStrictEqual(swap(exchanged,0,1,1,0).layers.map(l=>l.slots),[['1','7','3','4','5','2'],['6','8']]);
assert.deepStrictEqual(exchanged.layers.map(l=>[l.count,l.rotation]),[[6,0],[2,15]]);
assert.equal(positionFixture.layers[0].slots[1],'2');
