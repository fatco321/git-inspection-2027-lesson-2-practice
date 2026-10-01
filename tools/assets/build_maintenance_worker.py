"""Create a distinct CC0 maintenance worker from the project's Quaternius source."""
from pathlib import Path
import json,base64,struct,hashlib,copy
root=Path(__file__).resolve().parents[2];folder=root/'public/models/quaternius';source=folder/'worker.gltf';j=json.loads(source.read_text())
def color(hex):
 v=[int(hex[i:i+2],16)/255 for i in (0,2,4)]
 return [c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4 for c in v]+[1]
palette={'Worker_Vest':'477eaa','LightBrown':'284e72','Brown':'29455e','Brown2':'20364c','Moustache':'45413e','Eyebrows':'393633','Worker_Yellow':'d9dcaa'}
for m in j['materials']:
 if m['name']in palette:m['pbrMetallicRoughness']['baseColorFactor']=color(palette[m['name']])
 m['pbrMetallicRoughness']['roughnessFactor']=.85
helmet=copy.deepcopy(j['materials'][1]);helmet['name']='Maintenance_Helmet';helmet['pbrMetallicRoughness']['baseColorFactor']=color('e4e5da');j['materials'].append(helmet)
for node in j['nodes']:
 if node.get('name')=='Worker_Head':
  for prim in j['meshes'][node['mesh']]['primitives']:
   if prim['material']==1:prim['material']=len(j['materials'])-1
# Tool pouches use the existing Body joint, so they follow both walk and work animations.
raw=bytearray(base64.b64decode(j['buffers'][0]['uri'].split(',')[1]));body=next(i for i,n in enumerate(j['nodes'])if n.get('name')=='Body');joint=j['skins'][0]['joints'].index(body)
verts=[];normals=[];indices=[]
def box(cx,cy,cz,w,h,d):
 for normal,corners in [((0,0,1),[(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]),((0,0,-1),[(1,-1,-1),(-1,-1,-1),(-1,1,-1),(1,1,-1)]),((1,0,0),[(1,-1,1),(1,-1,-1),(1,1,-1),(1,1,1)]),((-1,0,0),[(-1,-1,-1),(-1,-1,1),(-1,1,1),(-1,1,-1)]),((0,1,0),[(-1,1,1),(1,1,1),(1,1,-1),(-1,1,-1)]),((0,-1,0),[(-1,-1,-1),(1,-1,-1),(1,-1,1),(-1,-1,1)])]:
  start=len(verts);verts.extend([(cx+x*w/2,cy+y*h/2,cz+z*d/2)for x,y,z in corners]);normals.extend([normal]*4);indices.extend([start,start+1,start+2,start,start+2,start+3])
box(-.18,1.02,.16,.14,.17,.09);box(.18,1.02,.16,.14,.17,.09)
def accessor(values,fmt,kind,component,bounds=False):
 while len(raw)%4:raw.append(0)
 offset=len(raw)
 for v in values:raw.extend(struct.pack('<'+fmt,*(v if isinstance(v,tuple)else (v,))))
 view=len(j['bufferViews']);j['bufferViews'].append({'buffer':0,'byteOffset':offset,'byteLength':len(raw)-offset})
 a={'bufferView':view,'componentType':component,'count':len(values),'type':kind}
 if bounds:a.update(min=[min(v[k]for v in values)for k in range(3)],max=[max(v[k]for v in values)for k in range(3)])
 j['accessors'].append(a);return len(j['accessors'])-1
attrs={'POSITION':accessor(verts,'fff','VEC3',5126,True),'NORMAL':accessor(normals,'fff','VEC3',5126),'JOINTS_0':accessor([(joint,0,0,0)]*len(verts),'HHHH','VEC4',5123),'WEIGHTS_0':accessor([(1.,0.,0.,0.)]*len(verts),'ffff','VEC4',5126)}
pouch={'name':'Maintenance_Pouches','pbrMetallicRoughness':{'baseColorFactor':color('896747'),'metallicFactor':0,'roughnessFactor':.9}};j['materials'].append(pouch)
mesh=len(j['meshes']);j['meshes'].append({'name':'Maintenance_Toolbelt','primitives':[{'attributes':attrs,'indices':accessor(indices,'H','SCALAR',5123),'material':len(j['materials'])-1}]})
original=next(i for i,n in enumerate(j['nodes'])if n.get('name')=='Worker_Body');parent=next(n for n in j['nodes']if original in n.get('children',[]));parent['children'].append(len(j['nodes']));j['nodes'].append({'name':'Maintenance_Toolbelt','mesh':mesh,'skin':0})
j['buffers'][0]={'byteLength':len(raw),'uri':'data:application/octet-stream;base64,'+base64.b64encode(raw).decode()}
out=folder/'maintenance-worker.gltf';out.write_text(json.dumps(j,separators=(',',':')))
(folder/'maintenance-worker.SOURCE.json').write_text(json.dumps({'source':'https://quaternius.com/packs/ultimatemodularcharacters.html','license':'CC0-1.0','attributionRequired':False,'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'sha256':hashlib.sha256(out.read_bytes()).hexdigest(),'modifications':'Blue workwear, white helmet, dark facial hair and skinned tool pouches; original skeleton and animations retained.','generator':'tools/assets/build_maintenance_worker.py'},indent=2))
