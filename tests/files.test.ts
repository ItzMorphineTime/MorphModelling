import test from 'node:test';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {Box3,Vector3} from 'three';
import {exportModel,importFiles} from '../lib/morph/files';
import {starterProject,matrix,vec} from '../lib/morph/model';

// Browser adapters only: actual application exporters and importers run unmodified.
class BlobReader {
 result: ArrayBuffer|string|null=null;
 onloadend: (()=>void)|null=null;
 readAsArrayBuffer(blob:Blob){void blob.arrayBuffer().then(value=>{this.result=value;this.onloadend?.();});}
 readAsDataURL(blob:Blob){void blob.arrayBuffer().then(value=>{this.result=`data:${blob.type};base64,${Buffer.from(value).toString('base64')}`;this.onloadend?.();});}
}
test('GLB, embedded glTF and STL exports can be imported with geometry preserved',async t=>{
 const blobs=new Map<string,Blob>();let captured:Blob|null=null;
 t.mock.method(URL,'createObjectURL',(blob:Blob)=>{const key='blob:qa-'+blobs.size;blobs.set(key,blob);return key;});
 t.mock.method(URL,'revokeObjectURL',()=>{});
 const oldDocument=Object.getOwnPropertyDescriptor(globalThis,'document'),oldReader=Object.getOwnPropertyDescriptor(globalThis,'FileReader'),oldProgress=Object.getOwnPropertyDescriptor(globalThis,'ProgressEvent');
 Object.defineProperty(globalThis,'document',{configurable:true,value:{body:{appendChild(){}},createElement(){return{style:{},href:'',download:'',click(){captured=blobs.get(this.href)??null;},remove(){}};}}});
 Object.defineProperty(globalThis,'FileReader',{configurable:true,value:BlobReader});
 Object.defineProperty(globalThis,'ProgressEvent',{configurable:true,value:class extends Event{lengthComputable=false;loaded=0;total=0;}});
 t.mock.timers.enable({apis:['setTimeout']});
 const restore=(key:string,value:PropertyDescriptor|undefined)=>{if(value)Object.defineProperty(globalThis,key,value);else Reflect.deleteProperty(globalThis,key);};
 try{
  const project=starterProject(),originalBounds=new Box3().setFromPoints(project.objects.flatMap(o=>o.mesh.vertices.map(v=>vec(v).applyMatrix4(matrix(o)))));
  for(const format of ['glb','gltf','stl']){
   captured=null;await exportModel(project,format);assert.ok(captured,'download contains a blob');const blob=captured as Blob;
   assert.ok(blob.size>100);if(format==='glb'){const bytes=await blob.arrayBuffer();assert.equal(new DataView(bytes).getUint32(0,true),0x46546c67);if(process.env.MORPH_QA_FIXTURE)await writeFile(process.env.MORPH_QA_FIXTURE,Buffer.from(bytes));}
   const result=await importFiles([new File([blob],'roundtrip.'+format)]);assert.ok(result.objects?.length);
   const bounds=new Box3().setFromPoints(result.objects.flatMap(o=>o.mesh.vertices.map(v=>vec(v).applyMatrix4(matrix(o)))));
   assert.ok(bounds.min.distanceTo(originalBounds.min)<1e-5,format+' minimum bounds');assert.ok(bounds.max.distanceTo(originalBounds.max)<1e-5,format+' maximum bounds');
   if(format!=='stl'){assert.equal(result.objects.length,3);result.objects.forEach((o,i)=>{assert.equal(o.material.color,project.objects[i].material.color);assert.ok(Math.abs(o.material.metalness-project.objects[i].material.metalness)<1e-6);assert.ok(o.mesh.uvs.length>0);});}
  }
 }finally{t.mock.timers.tick(30000);restore('document',oldDocument);restore('FileReader',oldReader);restore('ProgressEvent',oldProgress);}
});
